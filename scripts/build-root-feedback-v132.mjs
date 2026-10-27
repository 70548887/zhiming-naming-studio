import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const sha256=value=>createHash('sha256').update(value).digest('hex');
const canonical=value=>JSON.stringify(value&&typeof value==='object'?Array.isArray(value)?value.map(item=>JSON.parse(canonical(item))):Object.fromEntries(Object.keys(value).sort().map(key=>[key,JSON.parse(canonical(value[key]))])):value);
const safe=value=>typeof value==='string'&&value.length>0&&!value.includes('\\')&&!value.includes(':')&&!value.startsWith('/')&&value.split('/').every(part=>part!==''&&part!=='.'&&part!=='..');
const fail=message=>{throw Error('ROOT_FEEDBACK_V132_SOURCE_MISMATCH: '+message);};
function read(root,relative){if(!safe(relative))return fail('unsafe source/resource path');const target=fs.realpathSync(path.join(root,...relative.split('/'))),rel=path.relative(fs.realpathSync(root),target);if(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel)||!fs.statSync(target).isFile())return fail('source/resource escapes its fixed root');return fs.readFileSync(target);}
/** Independent build gate. Call before injecting the returned identity into an application bundle. */
export function verifyRootFeedbackV132BuildSources(root){
 root=path.resolve(root);
 const pins=JSON.parse(read(root,'src/main/bazi-root-feedback-v132-pins.json'));
 const base=path.join(root,'assets/bazi-root-feedback/1.3.2'),manifestBytes=read(base,'resource-manifest.json');
 if(sha256(manifestBytes)!==pins.manifestSha256)return fail('manifest pin differs');
 const manifest=JSON.parse(manifestBytes);
 if(manifest.schema!=='bazi-root-feedback-resource-manifest/2'||manifest.methodId!=='project-bazi-mainchain-145/1.3.2'||manifest.publicationId!==pins.publicationId||manifest.implementationSha256!==pins.implementationSha256||canonical(manifest.executionSources)!==canonical(pins.executionSources)||sha256(canonical(pins.executionSources))!==pins.implementationSha256)return fail('fixed version, publication or implementation map differs');
 if(!Array.isArray(pins.executionSources)||pins.executionSources.length<10)return fail('implementation closure is incomplete');
 const seen=new Set();
 for(const source of pins.executionSources){
  if(seen.has(source.sourcePath)||source.resourcePath!=='runtime-source/'+source.sourcePath)return fail('implementation map is duplicated or remapped');seen.add(source.sourcePath);
  const actual=read(root,source.sourcePath),published=read(base,source.resourcePath);
  if(actual.length!==source.bytes||sha256(actual)!==source.sha256||!actual.equals(published))return fail('executed source differs from its published runtime-source: '+source.sourcePath);
  const resource=manifest.files.filter(file=>file.path===source.resourcePath);
  if(resource.length!==1||resource[0].kind!=='runtime-source'||resource[0].sha256!==source.sha256||resource[0].bytes!==source.bytes)return fail('implementation resource pin differs: '+source.sourcePath);
 }
 for(const file of manifest.files){const bytes=read(base,file.path);if(bytes.length!==file.bytes||sha256(bytes)!==file.sha256)return fail('publication resource differs: '+file.path);}
 const lock=JSON.parse(read(root,'src/domain/bazi-mainchain/project-v132/rules/source-lock-1.3.2.json'));
 const mapped=pins.executionSources.find(source=>source.sourcePath==='src/domain/bazi-mainchain/project-v132/root-feedback.ts');
 if(lock.methodId!=='project-bazi-mainchain-145/1.3.2'||lock.rootCoordinator.mappedSourceSha256!==mapped?.sha256)return fail('source-lock coordinator differs');
 return Object.freeze({schema:'bazi-root-feedback-build/1',methodId:'project-bazi-mainchain-145/1.3.2',implementationSha256:pins.implementationSha256,manifestSha256:pins.manifestSha256});
}
/** Builds a portable preview candidate and a reviewable complete esbuild input receipt. */
export async function buildRootFeedbackV132({root=process.cwd(),outfile}){
 root=path.resolve(root);outfile=path.resolve(outfile);
 const identity=verifyRootFeedbackV132BuildSources(root);
 const pins=JSON.parse(read(root,'src/main/bazi-root-feedback-v132-pins.json'));
 const pinnedSources=new Map(pins.executionSources.map(source=>[path.resolve(root,source.sourcePath),source]));
 const loadedSources=[];
 const sourcePlugin={name:'fixed-root-feedback-v132',setup(builder){builder.onLoad({filter:/\.(ts|json)$/},args=>{
  const expected=pinnedSources.get(path.resolve(args.path));if(!expected)return;
  const bytes=fs.readFileSync(args.path);if(bytes.length!==expected.bytes||sha256(bytes)!==expected.sha256)return fail('compiler input differs from its execution pin: '+expected.sourcePath);
  loadedSources.push({file:expected.sourcePath,bytes:bytes.length,sha256:sha256(bytes)});
  return{contents:bytes.toString('utf8'),loader:args.path.endsWith('.json')?'json':'ts',resolveDir:path.dirname(args.path)};
 });}};
 const result=await build({absWorkingDir:root,entryPoints:['src/main/bazi-root-feedback-v132-bundle.ts'],outfile,bundle:true,platform:'node',target:'node22',format:'cjs',metafile:true,external:['electron','sql.js'],define:{__ROOT_FEEDBACK_V132_BUILD_IDENTITY__:JSON.stringify(identity)},plugins:[sourcePlugin]});
 // Recheck after compilation so a changed source cannot be certified by a stale precheck.
 if(canonical(verifyRootFeedbackV132BuildSources(root))!==canonical(identity))return fail('implementation changed during compilation');
 const inputs=Object.keys(result.metafile.inputs).sort().map(file=>{const bytes=file==='<define:__ROOT_FEEDBACK_V132_BUILD_IDENTITY__>'?Buffer.from(JSON.stringify(identity)):fs.readFileSync(path.resolve(root,file));return{file:file.replaceAll('\\','/'),kind:file.startsWith('<define:')?'compiled-identity':'file',bytes:bytes.length,sha256:sha256(bytes)};});
 const receipt={schema:'bazi-root-feedback-build-receipt/1',identity,compiledExecutionSources:loadedSources.sort((a,b)=>a.file.localeCompare(b.file)),inputs,inputClosureSha256:sha256(canonical(inputs)),output:{file:path.basename(outfile),bytes:fs.statSync(outfile).size,sha256:sha256(fs.readFileSync(outfile))},metafile:result.metafile};
 fs.writeFileSync(outfile+'.receipt.json.tmp',JSON.stringify(receipt,null,2)+'\n');fs.renameSync(outfile+'.receipt.json.tmp',outfile+'.receipt.json');
 return receipt;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const outfile=process.argv[2];if(!outfile)throw Error('Usage: node scripts/build-root-feedback-v132.mjs <outfile>');
 const receipt=await buildRootFeedbackV132({outfile});console.log(JSON.stringify({identity:receipt.identity,inputCount:receipt.inputs.length,inputClosureSha256:receipt.inputClosureSha256,output:receipt.output}));
}
