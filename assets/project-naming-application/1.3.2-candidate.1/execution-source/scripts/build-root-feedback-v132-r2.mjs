import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {builtinModules} from 'node:module';
import {fileURLToPath} from 'node:url';
import {build,version as esbuildVersion} from 'esbuild';

export const ROOT_FEEDBACK_V132_R2_ENTRY='src/main/bazi-root-feedback-v132-r2-bundle.ts';
const ASSETS='assets/bazi-root-feedback/1.3.2-r2',PINS='src/main/bazi-root-feedback-v132-r2-pins.json';
const DEFINE='__ROOT_FEEDBACK_V132_R2_BUILD_IDENTITY__';
const VIRTUAL='<define:'+DEFINE+'>';
export const rootFeedbackV132R2Options=Object.freeze({entryPoints:Object.freeze([ROOT_FEEDBACK_V132_R2_ENTRY]),bundle:true,platform:'node',target:'node22',format:'cjs',preserveSymlinks:true,tsconfig:'tsconfig.json',charset:'utf8',legalComments:'inline',minify:false,treeShaking:true,sourcemap:false,packages:'bundle',mainFields:Object.freeze(['module','main']),conditions:Object.freeze(['node'])});
export const rootFeedbackV132R2Metadata=Object.freeze(['package.json','tsconfig.json','node_modules/lunar-typescript/package.json','node_modules/lunar-typescript/LICENSE','src/domain/bazi-mainchain/project-v132/rules/source-lock-1.3.2.json']);
export const canonical=value=>JSON.stringify(value&&typeof value==='object'?Array.isArray(value)?value.map(item=>JSON.parse(canonical(item))):Object.fromEntries(Object.keys(value).sort().map(key=>[key,JSON.parse(canonical(value[key]))])):value);
export const sha256=value=>createHash('sha256').update(value).digest('hex');
const safe=value=>typeof value==='string'&&value.length>0&&!value.includes('\\')&&!value.includes(':')&&!value.startsWith('/')&&value.split('/').every(part=>part!==''&&part!=='.'&&part!=='..');
const fail=message=>{throw Error('ROOT_FEEDBACK_V132_R2_SOURCE_MISMATCH: '+message);};
const inside=(base,file)=>{const relative=path.relative(base,file);return relative!== '..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);};
export function readRootFeedbackV132R2Source(root,relative){
 if(!safe(relative))return fail('unsafe fixed source path');
 const filename=path.resolve(root,...relative.split('/')),actual=fs.realpathSync(filename),base=relative.startsWith('node_modules/lunar-typescript/')?fs.realpathSync(path.join(root,'node_modules/lunar-typescript')):fs.realpathSync(root);
 if(!inside(base,actual)||!fs.statSync(actual).isFile()||relative.startsWith('node_modules/')&&!relative.startsWith('node_modules/lunar-typescript/'))return fail('source escapes its declared owned/vendor root: '+relative);
 return fs.readFileSync(actual);
}
function readAsset(root,relative){if(!safe(relative))return fail('unsafe resource path');const base=fs.realpathSync(path.join(root,ASSETS)),actual=fs.realpathSync(path.join(base,...relative.split('/')));if(!inside(base,actual)||!fs.statSync(actual).isFile())return fail('resource escapes fixed publication');return fs.readFileSync(actual);}
const buildSpec=()=>({esbuildVersion,options:rootFeedbackV132R2Options});
const environment=()=>({node:process.versions.node,icu:process.versions.icu??null,tz:process.versions.tz??null,unicode:process.versions.unicode??null,platform:process.platform,arch:process.arch});
function resolutionGuards(executionInputs){
 const directories=new Set(['']);
 for(const file of executionInputs){let directory=path.posix.dirname(file);while(directory!=='.'){directories.add(directory);directory=path.posix.dirname(directory);}}
 const candidates=[...directories].flatMap(directory=>['package.json','tsconfig.json','jsconfig.json'].map(name=>directory?directory+'/'+name:name)).concat(['.pnp.cjs','.pnp.data.json']);
 return [...new Set(candidates)].filter(file=>!rootFeedbackV132R2Metadata.includes(file)).sort().map(file=>({path:file,expected:'absent'}));
}
function verifyResolutionGuards(root,guards){for(const guard of guards)if(!safe(guard.path)||guard.expected!=='absent'||fs.existsSync(path.join(root,...guard.path.split('/'))))return fail('unexpected resolver metadata: '+guard.path);}
async function compile(root,identity,expected){
 const loaded=new Map(),expectedMap=expected?new Map(expected.files.map(file=>[file.sourcePath,file])):null;
 const plugin={name:'fixed-full-facade-closure',setup(builder){builder.onLoad({filter:/.*/,namespace:'file'},args=>{
  const sourcePath=path.relative(root,args.path).replaceAll('\\','/');
  if(!safe(sourcePath))return fail('compiler input is outside the declared root: '+sourcePath);
  const bytes=readRootFeedbackV132R2Source(root,sourcePath),record={sourcePath,resourcePath:'execution-source/'+sourcePath,bytes:bytes.length,sha256:sha256(bytes),role:'execution'};
  if(expectedMap){const pin=expectedMap.get(sourcePath);if(!pin||pin.role!=='execution'||!expected.executionInputs.includes(sourcePath)||pin.bytes!==record.bytes||pin.sha256!==record.sha256)return fail('compiler input is unpinned or differs: '+sourcePath);}
  loaded.set(sourcePath,{record,bytes});
  const extension=path.extname(args.path),loader=extension==='.json'?'json':extension==='.ts'?'ts':extension==='.tsx'?'tsx':['.js','.mjs','.cjs'].includes(extension)?'js':null;
  if(!loader)return fail('unknown compiler input type: '+sourcePath);
  return{contents:bytes.toString('utf8'),loader,resolveDir:path.dirname(args.path)};
 });}};
 const injected=JSON.stringify(identity);
 const result=await build({...rootFeedbackV132R2Options,absWorkingDir:root,outfile:path.join(root,'.local/m742-r2/unpublished.cjs'),write:false,metafile:true,logLevel:'silent',plugins:[plugin],define:{[DEFINE]:injected}});
 const realInputs=[],virtualInputs=[];
 for(const file of Object.keys(result.metafile.inputs).sort()){
  if(file.startsWith('<')){if(file!==VIRTUAL)return fail('unexpected compiler virtual input: '+file);virtualInputs.push({file,bytes:Buffer.byteLength(injected),sha256:sha256(injected)});continue;}
  const sourcePath=file.replaceAll('\\','/'),actual=loaded.get(sourcePath);if(!actual)return fail('compiler input was not served by the fixed source reader: '+sourcePath);realInputs.push(actual.record);
 }
 if(virtualInputs.length!==1||realInputs.length!==loaded.size)return fail('compiler input membership differs from loaded fixed bytes');
 const externalRuntimeModules=[...new Set(Object.values(result.metafile.outputs).flatMap(output=>output.imports.filter(item=>item.external).map(item=>item.path)))].sort();
 if(externalRuntimeModules.some(name=>!builtinModules.includes(name)&&!builtinModules.includes(name.replace(/^node:/,''))))return fail('unfixed external runtime dependency: '+externalRuntimeModules.join(','));
 if(expected&&(canonical(realInputs.map(file=>file.sourcePath).sort())!==canonical(expected.executionInputs)||canonical(externalRuntimeModules)!==canonical(expected.externalRuntimeModules)))return fail('actual compiler inputs or external modules differ from the full fixed closure');
 return{result,loaded,realInputs,virtualInputs,externalRuntimeModules};
}
/** Capture candidate bytes for a new reviewed publication. This never grants build admission or edits fixed pins. */
export async function captureRootFeedbackV132R2Closure(root){
 root=path.resolve(root);const placeholder={schema:'bazi-root-feedback-build/2',methodId:'project-bazi-mainchain-145/1.3.2',publicationId:'bazi-root-feedback/1.3.2;preview-publication-r2',fullClosureSha256:'0'.repeat(64),manifestSha256:'0'.repeat(64),esbuildVersion};
 const compiled=await compile(root,placeholder),records=new Map(compiled.realInputs.map(file=>[file.sourcePath,file]));
 for(const sourcePath of rootFeedbackV132R2Metadata){const bytes=readRootFeedbackV132R2Source(root,sourcePath);records.set(sourcePath,{sourcePath,resourcePath:'execution-source/'+sourcePath,bytes:bytes.length,sha256:sha256(bytes),role:'resolution'});}
 const executionInputs=compiled.realInputs.map(file=>file.sourcePath).sort(),guards=resolutionGuards(executionInputs);verifyResolutionGuards(root,guards);
 return{schema:'bazi-root-feedback-execution-closure/1',build:buildSpec(),files:[...records.values()].sort((a,b)=>a.sourcePath.localeCompare(b.sourcePath)),executionInputs,externalRuntimeModules:compiled.externalRuntimeModules,resolutionGuards:guards};
}
/** Full source, data, resolver metadata, vendor and publication gate; no current-byte regeneration is permitted. */
export function verifyRootFeedbackV132R2BuildSources(root){
 root=path.resolve(root);const pins=JSON.parse(readRootFeedbackV132R2Source(root,PINS)),manifestBytes=readAsset(root,'resource-manifest.json'),manifest=JSON.parse(manifestBytes);
 if(pins.schema!=='bazi-root-feedback-build-pins/2'||sha256(manifestBytes)!==pins.manifestSha256||manifest.schema!=='bazi-root-feedback-resource-manifest/3'||manifest.methodId!=='project-bazi-mainchain-145/1.3.2'||manifest.publicationId!==pins.publicationId||canonical(manifest.closure)!==canonical(pins.closure)||sha256(canonical(pins.closure))!==pins.fullClosureSha256||manifest.fullClosureSha256!==pins.fullClosureSha256||canonical(pins.closure.build)!==canonical(buildSpec()))return fail('fixed manifest, full execution closure or build tool/options differ');
 if(canonical(pins.closure.files.filter(file=>file.role==='resolution').map(file=>file.sourcePath).sort())!==canonical([...rootFeedbackV132R2Metadata].sort()))return fail('resolver metadata closure differs');
 if(canonical(pins.closure.resolutionGuards)!==canonical(resolutionGuards(pins.closure.executionInputs)))return fail('resolver metadata absence closure differs');verifyResolutionGuards(root,pins.closure.resolutionGuards);
 const seen=new Set();
 for(const file of pins.closure.files){
  if(seen.has(file.sourcePath)||file.resourcePath!=='execution-source/'+file.sourcePath)return fail('full closure is duplicated or remapped');seen.add(file.sourcePath);
  const actual=readRootFeedbackV132R2Source(root,file.sourcePath),published=readAsset(root,file.resourcePath);
  if(actual.length!==file.bytes||sha256(actual)!==file.sha256||!actual.equals(published))return fail('actual facade dependency differs from the fixed publication: '+file.sourcePath);
  const resource=manifest.files.filter(row=>row.path===file.resourcePath);if(resource.length!==1||resource[0].sha256!==file.sha256||resource[0].bytes!==file.bytes)return fail('closure resource pin differs: '+file.sourcePath);
 }
 if(pins.closure.executionInputs.some(file=>!seen.has(file))||pins.closure.executionInputs.length!==pins.closure.files.filter(file=>file.role==='execution').length)return fail('execution input closure is incomplete');
 for(const resource of manifest.files){const bytes=readAsset(root,resource.path);if(bytes.length!==resource.bytes||sha256(bytes)!==resource.sha256)return fail('publication bytes differ: '+resource.path);}
 return Object.freeze({schema:'bazi-root-feedback-build/2',methodId:'project-bazi-mainchain-145/1.3.2',publicationId:pins.publicationId,fullClosureSha256:pins.fullClosureSha256,manifestSha256:pins.manifestSha256,esbuildVersion});
}
export async function buildRootFeedbackV132R2({root=process.cwd(),outfile}){
 root=path.resolve(root);outfile=path.resolve(outfile);const identity=verifyRootFeedbackV132R2BuildSources(root),pins=JSON.parse(readRootFeedbackV132R2Source(root,PINS));
 const compiled=await compile(root,identity,pins.closure);
 if(canonical(verifyRootFeedbackV132R2BuildSources(root))!==canonical(identity))return fail('source or resolver metadata changed during compilation');
 const output=compiled.result.outputFiles[0].contents;
 const receipt={schema:'bazi-root-feedback-build-receipt/2',identity,compiledExecutionSources:compiled.realInputs,virtualInputs:compiled.virtualInputs,externalRuntimeModules:compiled.externalRuntimeModules,resolutionMetadata:pins.closure.files.filter(file=>file.role==='resolution'),runtimeEnvironment:environment(),output:{file:path.basename(outfile),bytes:output.length,sha256:sha256(output)},metafile:compiled.result.metafile};
 fs.mkdirSync(path.dirname(outfile),{recursive:true});fs.writeFileSync(outfile+'.tmp',output);fs.renameSync(outfile+'.tmp',outfile);fs.writeFileSync(outfile+'.receipt.json.tmp',JSON.stringify(receipt,null,2)+'\n');fs.renameSync(outfile+'.receipt.json.tmp',outfile+'.receipt.json');return receipt;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(!process.argv[2])throw Error('Usage: node scripts/build-root-feedback-v132-r2.mjs <outfile>');
 const receipt=await buildRootFeedbackV132R2({outfile:process.argv[2]});console.log(JSON.stringify({identity:receipt.identity,inputCount:receipt.compiledExecutionSources.length,resolutionMetadata:receipt.resolutionMetadata.length,externalRuntimeModules:receipt.externalRuntimeModules,output:receipt.output}));
}
