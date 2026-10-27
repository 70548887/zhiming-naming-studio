import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildRootFeedbackV132R2,verifyRootFeedbackV132R2BuildSources} from './build-root-feedback-v132-r2.mjs';

const EXPECTED_BYTES=2233517;
const EXPECTED_SHA256='d01d2b51e10b48c3de361ab27de451dcb91670b71197a559f6fb8182215193fb';
const fail=message=>{throw Error('ROOT_FEEDBACK_V132_PREVIEW_BUILD_UNAVAILABLE: '+message);};
const unsafe=message=>fail('unsafe output path: '+message);
function existingOutputEntry(file){
  try{return fs.lstatSync(file);}catch(error){if(error.code==='ENOENT')return undefined;return unsafe('cannot inspect '+file);}
}
function physicalOutput(root){
  // The allowed dist boundary is anchored to the physical project root,
  // never to realpath(dist-electron), which could itself point at assets.
  try{root=fs.realpathSync.native(path.resolve(root));if(!fs.statSync(root).isDirectory())return unsafe('project root is not a directory');}catch{return unsafe('physical project root is unavailable');}
  let directory=root;
  for(const segment of ['dist-electron','bazi-root-feedback','1.3.2-r2']){
    directory=path.join(directory,segment);const stat=existingOutputEntry(directory);
    if(stat&&(stat.isSymbolicLink()||!stat.isDirectory()||path.relative(directory,fs.realpathSync.native(directory))!==''))return unsafe('linked or non-directory output segment: '+directory);
  }
  const file=path.join(directory,'root-feedback.cjs');
  for(const suffix of ['', '.tmp', '.receipt.json', '.receipt.json.tmp']){
    const target=file+suffix,stat=existingOutputEntry(target);
    if(stat&&(stat.isSymbolicLink()||!stat.isFile()||stat.nlink!==1||path.relative(target,fs.realpathSync.native(target))!==''))return unsafe('linked or non-regular output file: '+target);
  }
  return{root,file};
}
export const rootFeedbackV132PreviewOutput=root=>physicalOutput(root).file;

function checkOutput(root,identity){
  const file=rootFeedbackV132PreviewOutput(root),bytes=fs.readFileSync(file),receipt=JSON.parse(fs.readFileSync(file+'.receipt.json','utf8'));
  if(bytes.length!==EXPECTED_BYTES||createHash('sha256').update(bytes).digest('hex')!==EXPECTED_SHA256)return fail('generated bundle differs from the independently admitted bytes');
  if(receipt.schema!=='bazi-root-feedback-build-receipt/2'||JSON.stringify(receipt.identity)!==JSON.stringify(identity)||receipt.output?.file!=='root-feedback.cjs'||receipt.output.bytes!==EXPECTED_BYTES||receipt.output.sha256!==EXPECTED_SHA256)return fail('generated receipt does not match the fixed official output');
  return receipt;
}

/** Build-time only. It has no selectable output path and never writes assets. */
export async function buildRootFeedbackV132Preview(root=process.cwd()){
  const output=physicalOutput(root);root=output.root;
  const receipt=await buildRootFeedbackV132R2({root,outfile:output.file});
  return checkOutput(root,receipt.identity);
}

/** Dev-only explicit-request hook. Importing it or starting a server does no build. */
export function createLazyRootFeedbackV132PreviewBuild(root){
  root=path.resolve(root);let pending;
  return async()=>{
    if(!pending)pending=(async()=>{
      const output=physicalOutput(root);
      // An existing artifact never hides drift in the dev source publication.
      const identity=verifyRootFeedbackV132R2BuildSources(output.root),file=output.file;
      if(!fs.existsSync(file)||!fs.existsSync(file+'.receipt.json'))return buildRootFeedbackV132Preview(output.root);
      return checkOutput(output.root,identity);
    })().finally(()=>{pending=undefined;});
    return pending;
  };
}
