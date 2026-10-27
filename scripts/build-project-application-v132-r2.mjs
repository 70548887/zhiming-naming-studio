import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomBytes} from 'node:crypto';
import {builtinModules} from 'node:module';
import {build,version as esbuildVersion} from 'esbuild';
import {verifyRootFeedbackV132R2BuildSources} from './build-root-feedback-v132-r2.mjs';

const ENTRY='src/main/project-application-v132-r2.ts';
const ASSETS='assets/project-naming-application/1.3.2-candidate.2';
const PINS='src/main/project-application-v132-r2-pins.json';
const POLICY='naming-element-application/1.3.2-candidate.2';
const PUBLICATION='project-naming-application/1.3.2-candidate.2';
const SOURCE_ID='project-naming-application-v132-candidate.2';
const DEFINE='__PROJECT_APPLICATION_V132_R2_BUILD_IDENTITY__';
const ENGINE_DEFINE='__ROOT_FEEDBACK_V132_R2_BUILD_IDENTITY__';
const BUILD_INPUTS=Object.freeze([
 'scripts/build-project-application-v132-r2.mjs',
 'scripts/build-project-application-v132-r2.d.mts',
 'scripts/build-root-feedback-v132-r2.mjs',
 'scripts/build-root-feedback-v132-r2.d.mts',
 'src/main/bazi-root-feedback-v132-r2-pins.json',
 'src/domain/bazi-mainchain/project-v132/rules/source-lock-1.3.2.json',
 'assets/bazi-root-feedback/1.3.2-r2/resource-manifest.json',
 'assets/bazi-root-feedback/1.3.2-r2/licenses/CC-BY-SA-4.0.txt',
 'assets/bazi-root-feedback/1.3.2-r2/licenses/lunar-typescript-LICENSE.txt',
]);
const OPTIONS=Object.freeze({entryPoints:Object.freeze([ENTRY]),bundle:true,platform:'node',target:'node22',format:'cjs',preserveSymlinks:true,tsconfig:'tsconfig.json',charset:'utf8',legalComments:'inline',minify:false,treeShaking:true,sourcemap:false,packages:'bundle',mainFields:Object.freeze(['module','main']),conditions:Object.freeze(['node'])});
const lexical=(a,b)=>a<b?-1:a>b?1:0;
const canonical=value=>JSON.stringify(value&&typeof value==='object'?Array.isArray(value)?value.map(item=>JSON.parse(canonical(item))):Object.fromEntries(Object.keys(value).sort(lexical).map(key=>[key,JSON.parse(canonical(value[key]))])):value);
const sha256=value=>createHash('sha256').update(value).digest('hex');
const same=(a,b)=>canonical(a)===canonical(b);
const safe=value=>typeof value==='string'&&value.length>0&&!value.includes('\\')&&!value.includes(':')&&!value.startsWith('/')&&value.split('/').every(part=>part!==''&&part!=='.'&&part!=='..');
const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const fail=message=>{throw Error('PROJECT_APPLICATION_V132_R2_SOURCE_MISMATCH: '+message);};
const inside=(base,file)=>{const relative=path.relative(base,file);return relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);};
const spec=()=>({esbuildVersion,options:OPTIONS});
const environment=()=>({node:process.versions.node,icu:process.versions.icu??null,tz:process.versions.tz??null,unicode:process.versions.unicode??null,platform:process.platform,arch:process.arch});
function exact(value,keys,label){
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value))||Reflect.ownKeys(value).length!==keys.length||keys.some(key=>!Object.hasOwn(value,key)))return fail(label+' fields differ from the fixed schema');
 for(const key of Reflect.ownKeys(value)){const d=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||!keys.includes(key)||!d||!Object.hasOwn(d,'value')||!d.enumerable)return fail(label+' is not plain enumerable data');}
}
function rootPath(root){const actual=fs.realpathSync(path.resolve(root));if(!fs.statSync(actual).isDirectory())return fail('source root is not a directory');return actual;}
function vendorRoot(root,relative){
 if(!relative.startsWith('node_modules/'))return fs.realpathSync(root);
 const parts=relative.split('/'),count=parts[1]?.startsWith('@')?4:3;
 if(parts.length<count)return fail('incomplete vendor source path: '+relative);
 return fs.realpathSync(path.join(root,...parts.slice(0,count-1)));
}
function readSource(root,relative){
 if(!safe(relative))return fail('unsafe source path');
 const file=fs.realpathSync(path.join(root,...relative.split('/'))),base=vendorRoot(root,relative);
 if(!inside(base,file)||!fs.statSync(file).isFile())return fail('source escapes its declared root: '+relative);
 return fs.readFileSync(file);
}
function readAsset(root,relative){
 if(!safe(relative))return fail('unsafe publication resource path');
 const base=fs.realpathSync(path.join(root,ASSETS)),file=fs.realpathSync(path.join(base,...relative.split('/')));
 if(!inside(base,file)||!fs.statSync(file).isFile())return fail('resource escapes its publication: '+relative);
 return fs.readFileSync(file);
}
function sourceRow(root,sourcePath,role){const bytes=readSource(root,sourcePath);return{sourcePath,resourcePath:'execution-source/'+sourcePath,bytes:bytes.length,sha256:sha256(bytes),role};}
function resolverCandidates(executionInputs){
 const directories=new Set(['']);
 for(const file of executionInputs){let directory=path.posix.dirname(file);while(directory!=='.'){directories.add(directory);directory=path.posix.dirname(directory);}}
 return [...new Set([...directories].flatMap(directory=>['package.json','tsconfig.json','jsconfig.json'].map(name=>directory?directory+'/'+name:name)).concat(['.pnp.cjs','.pnp.data.json']))].sort(lexical);
}
function resolutionState(root,executionInputs){
 const files=[],resolutionGuards=[];
 for(const sourcePath of resolverCandidates(executionInputs)){
  const exists=fs.existsSync(path.join(root,...sourcePath.split('/')));
  if(sourcePath.startsWith('.pnp.')&&exists)return fail('unsupported resolver metadata: '+sourcePath);
  if(exists)files.push(sourceRow(root,sourcePath,'resolution'));
  else resolutionGuards.push({path:sourcePath,expected:'absent'});
 }
 for(const sourcePath of executionInputs.filter(file=>file.startsWith('node_modules/'))){
  const parts=sourcePath.split('/'),packagePath=parts.slice(0,parts[1]?.startsWith('@')?3:2).join('/');
  for(const name of ['LICENSE','LICENSE.txt','LICENCE','LICENCE.txt']){const candidate=packagePath+'/'+name;if(fs.existsSync(path.join(root,...candidate.split('/')))&&!files.some(file=>file.sourcePath===candidate))files.push(sourceRow(root,candidate,'resolution'));}
 }
 return{files:files.sort((a,b)=>lexical(a.sourcePath,b.sourcePath)),resolutionGuards};
}
function assertEngine(root,expected){const engine=verifyRootFeedbackV132R2BuildSources(root);if(expected&&!same(engine,expected))return fail('frozen r2 engine build identity changed');return engine;}
function identity(engine,fullClosureSha256='0'.repeat(64),manifestSha256='0'.repeat(64)){
 return{schema:'project-application-build/1',policyId:POLICY,publicationId:PUBLICATION,fullClosureSha256,manifestSha256,esbuildVersion,engine};
}
async function compile(root,builtIdentity,expected){
 const loaded=new Map(),expectedMap=expected?new Map(expected.files.map(file=>[file.sourcePath,file])):null;
 const plugin={name:'fixed-project-application-r2-closure',setup(builder){builder.onLoad({filter:/.*/,namespace:'file'},args=>{
  const sourcePath=path.relative(root,args.path).replaceAll('\\','/');
  if(!safe(sourcePath)||sourcePath===PINS||sourcePath.startsWith(ASSETS+'/'))return fail('compiler input is outside the non-circular application closure: '+sourcePath);
  const bytes=readSource(root,sourcePath),record={sourcePath,resourcePath:'execution-source/'+sourcePath,bytes:bytes.length,sha256:sha256(bytes),role:'execution'};
  if(expectedMap){const pin=expectedMap.get(sourcePath);if(!pin||pin.role!=='execution'||!expected.executionInputs.includes(sourcePath)||!same(pin,record))return fail('compiler input is unpinned or differs: '+sourcePath);}
  loaded.set(sourcePath,{record,bytes});
  const ext=path.extname(args.path),loader=ext==='.json'?'json':ext==='.ts'?'ts':ext==='.tsx'?'tsx':['.js','.mjs','.cjs'].includes(ext)?'js':null;
  if(!loader)return fail('unsupported compiler input type: '+sourcePath);
  return{contents:bytes.toString('utf8'),loader,resolveDir:path.dirname(args.path)};
 });}};
 const defines={[DEFINE]:JSON.stringify(builtIdentity),[ENGINE_DEFINE]:JSON.stringify(builtIdentity.engine)};
 const result=await build({...OPTIONS,absWorkingDir:root,outfile:path.join(root,'.local/m786/unpublished-project-application-r2.cjs'),write:false,metafile:true,logLevel:'silent',plugins:[plugin],define:defines});
 const realInputs=[],virtualInputs=[];
 for(const input of Object.keys(result.metafile.inputs).sort(lexical)){
  if(input.startsWith('<')){const key=Object.keys(defines).find(name=>input==='<define:'+name+'>');if(!key)return fail('unexpected compiler virtual input: '+input);virtualInputs.push({file:input,bytes:Buffer.byteLength(defines[key]),sha256:sha256(defines[key])});continue;}
  const sourcePath=input.replaceAll('\\','/'),actual=loaded.get(sourcePath);if(!actual)return fail('compiler input bypassed fixed source reader: '+sourcePath);realInputs.push(actual.record);
 }
 if(virtualInputs.length!==2||realInputs.length!==loaded.size)return fail('compiler fixed input or injected identity membership differs');
 const executionInputs=realInputs.map(file=>file.sourcePath).sort(lexical);
 if([ENTRY,'src/main/project-application-v132-policy.ts','src/main/project-application-v132-r2-saved.ts','src/main/project-application-v132-r2-resources.ts','src/main/project-application-v132-r2-common.ts','src/main/project-application-v132-r2-json.ts','src/shared/project-application-v132-r2.ts','data/project-application-v132-r2-policy.json'].some(file=>!executionInputs.includes(file)))return fail('candidate.2 adapter, reused inspection policy, saved verifier, resource loader and local JSON helper must all be actual compiler inputs');
 const externalRuntimeModules=[...new Set(Object.values(result.metafile.outputs).flatMap(output=>output.imports.filter(item=>item.external).map(item=>item.path)))].sort(lexical);
 if(externalRuntimeModules.some(name=>!builtinModules.includes(name)&&!builtinModules.includes(name.replace(/^node:/,''))))return fail('unfixed external runtime dependency: '+externalRuntimeModules.join(','));
 if(expected&&(!same(executionInputs,expected.executionInputs)||!same(externalRuntimeModules,expected.externalRuntimeModules)))return fail('actual compiler inputs or external modules differ from frozen closure');
 return{result,realInputs,virtualInputs,externalRuntimeModules};
}
function validateClosure(root,closure){
 exact(closure,['schema','build','files','executionInputs','externalRuntimeModules','resolutionGuards'],'execution closure');
 if(closure.schema!=='project-application-execution-closure/1'||!same(closure.build,spec())||!Array.isArray(closure.files)||!Array.isArray(closure.executionInputs)||!Array.isArray(closure.externalRuntimeModules)||!Array.isArray(closure.resolutionGuards))return fail('closure version, compiler or arrays differ');
 const seen=new Set();
 for(const file of closure.files){
  exact(file,['sourcePath','resourcePath','bytes','sha256','role'],'closure source');
  if(!safe(file.sourcePath)||file.sourcePath===PINS||file.sourcePath.startsWith(ASSETS+'/')||file.resourcePath!=='execution-source/'+file.sourcePath||seen.has(file.sourcePath)||!Number.isSafeInteger(file.bytes)||file.bytes<0||!hash(file.sha256)||!['execution','resolution','build'].includes(file.role))return fail('invalid or circular closure source');
  seen.add(file.sourcePath);const bytes=readSource(root,file.sourcePath);if(bytes.length!==file.bytes||sha256(bytes)!==file.sha256)return fail('actual application dependency differs from frozen closure: '+file.sourcePath);
 }
 if(!same(closure.executionInputs,closure.files.filter(file=>file.role==='execution').map(file=>file.sourcePath).sort(lexical))||new Set(closure.executionInputs).size!==closure.executionInputs.length)return fail('execution input set is incomplete or duplicated');
 if(!same(closure.files.filter(file=>file.role==='build').map(file=>file.sourcePath).sort(lexical),[...BUILD_INPUTS].sort(lexical)))return fail('builder or inherited r2 build dependency closure differs');
 const resolution=resolutionState(root,closure.executionInputs);
 if(!same(resolution.files,closure.files.filter(file=>file.role==='resolution'))||!same(resolution.resolutionGuards,closure.resolutionGuards))return fail('resolver metadata or absence guards changed');
 if(new Set(closure.externalRuntimeModules).size!==closure.externalRuntimeModules.length||closure.externalRuntimeModules.some(name=>typeof name!=='string'||!builtinModules.includes(name)&&!builtinModules.includes(name.replace(/^node:/,''))))return fail('closure contains an unfixed external runtime module');
}

/** Capture is review material only; it neither creates pins nor grants application admission. */
export async function captureProjectApplicationV132R2Closure(root){
 root=rootPath(root);const engine=assertEngine(root),compiled=await compile(root,identity(engine)),executionInputs=compiled.realInputs.map(file=>file.sourcePath).sort(lexical),resolution=resolutionState(root,executionInputs);
 const records=new Map(compiled.realInputs.map(file=>[file.sourcePath,file]));
 for(const file of resolution.files){if(records.has(file.sourcePath))return fail('resolver metadata is also an executable input: '+file.sourcePath);records.set(file.sourcePath,file);}
 for(const sourcePath of BUILD_INPUTS){if(records.has(sourcePath))return fail('builder dependency unexpectedly became an executable input: '+sourcePath);records.set(sourcePath,sourceRow(root,sourcePath,'build'));}
 const closure={schema:'project-application-execution-closure/1',build:spec(),files:[...records.values()].sort((a,b)=>lexical(a.sourcePath,b.sourcePath)),executionInputs,externalRuntimeModules:compiled.externalRuntimeModules,resolutionGuards:resolution.resolutionGuards};
 assertEngine(root,engine);validateClosure(root,closure);return closure;
}
const fileKind=relative=>/(^|\/)(LICENSE|LICENCE)(\.|$)|\/licenses\//i.test(relative)?'license':relative.includes('source-lock')?'source-lock':relative==='execution-source/data/project-application-v132-r2-policy.json'?'rule':'runtime-source';
function atomicNewFile(filename,bytes){
 const temporary=filename+'.tmp-'+randomBytes(8).toString('hex');fs.mkdirSync(path.dirname(filename),{recursive:true});
 try{fs.writeFileSync(temporary,bytes,{flag:'wx'});if(fs.existsSync(filename))return fail('refusing to overwrite publication output: '+filename);fs.linkSync(temporary,filename);}finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
}
function checkedOutput(root,filename,closure){
 const absolute=path.resolve(filename);let ancestor=path.dirname(absolute),suffix=path.basename(absolute);
 while(!fs.existsSync(ancestor)){suffix=path.join(path.basename(ancestor),suffix);const parent=path.dirname(ancestor);if(parent===ancestor)return fail('output has no existing parent');ancestor=parent;}
 const actual=path.join(fs.realpathSync(ancestor),suffix),relative=path.relative(root,actual).replaceAll('\\','/');
 if(fs.existsSync(absolute)&&fs.lstatSync(absolute).isSymbolicLink())return fail('output must not replace a symlink');
 if(inside(root,actual)&&(relative==='assets'||relative.startsWith('assets/')||relative===PINS||closure.files.some(file=>file.sourcePath===relative)))return fail('output would overwrite frozen source or publication: '+relative);
 return actual;
}

/** One-time candidate publication only. Existing candidate/r2 publications and pins are never resealed. */
export async function publishProjectApplicationV132R2({root=process.cwd()}={}){
 root=rootPath(root);const target=path.join(root,ASSETS),pinFile=path.join(root,PINS);
 if(fs.existsSync(target)||fs.existsSync(pinFile))return fail('candidate publication or pins already exist; publish requires a new version');
 const engine=assertEngine(root),closure=await captureProjectApplicationV132R2Closure(root),fullClosureSha256=sha256(canonical(closure));
 assertEngine(root,engine);validateClosure(root,closure);
 const publication={schema:'project-application-publication/1',policyId:POLICY,publicationId:PUBLICATION,sourceId:SOURCE_ID,fullClosureSha256,engine,closure,admission:{scope:'independent-candidate-application-and-saved-replay',productionDefault:false,traditionalConclusion:'unknown'}};
 const publicationBytes=Buffer.from(JSON.stringify(publication,null,2)+'\n'),files=closure.files.map(file=>({path:file.resourcePath,bytes:file.bytes,sha256:file.sha256,kind:fileKind(file.resourcePath)}));
 files.push({path:'publication.json',bytes:publicationBytes.length,sha256:sha256(publicationBytes),kind:'publication'});files.sort((a,b)=>lexical(a.path,b.path));
 const sources=[{id:SOURCE_ID,name:'Project naming application 1.3.2 candidate.2 fixed policy and adapter publication',url:'project://project-naming-application/1.3.2-candidate.2',commit:fullClosureSha256,license:'Project proposal; preserved MIT and CC-BY-SA-4.0 dependency licenses included',files:files.map(file=>file.path),sha256:sha256(publicationBytes),note:'Independent candidate policy/adapter/saved-verifier and complete compiler closure; frozen r2 engine identity is a separately verified dependency. Project application does not certify a classical traditional conclusion.'}];
 const manifest={schema:'project-application-resource-manifest/1',policyId:POLICY,publicationId:PUBLICATION,fullClosureSha256,engine,closure,files,sources},manifestBytes=Buffer.from(JSON.stringify(manifest,null,2)+'\n'),manifestSha256=sha256(manifestBytes);
 const pins={schema:'project-application-build-pins/1',policyId:POLICY,publicationId:PUBLICATION,fullClosureSha256,manifestSha256,engine,closure};
 const parent=path.dirname(target);fs.mkdirSync(parent,{recursive:true});const staging=fs.mkdtempSync(path.join(parent,'.1.3.2-candidate.2-publish-'));let moved=false;
 try{
  for(const file of closure.files){const bytes=readSource(root,file.sourcePath);if(bytes.length!==file.bytes||sha256(bytes)!==file.sha256)return fail('source changed while publishing: '+file.sourcePath);const destination=path.join(staging,...file.resourcePath.split('/'));fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,bytes,{flag:'wx'});}
  fs.writeFileSync(path.join(staging,'publication.json'),publicationBytes,{flag:'wx'});fs.writeFileSync(path.join(staging,'resource-manifest.json'),manifestBytes,{flag:'wx'});
  assertEngine(root,engine);validateClosure(root,closure);if(fs.existsSync(target)||fs.existsSync(pinFile))return fail('publication outputs appeared during candidate capture');
  fs.renameSync(staging,target);moved=true;atomicNewFile(pinFile,JSON.stringify(pins,null,2)+'\n');
 }finally{if(!moved&&fs.existsSync(staging)){if(!inside(parent,fs.realpathSync(staging)))return fail('refusing cleanup outside owned publication staging');fs.rmSync(staging,{recursive:true,force:true});}}
 return{schema:'project-application-publication-receipt/1',identity:identity(engine,fullClosureSha256,manifestSha256),publicationPath:target,pinsPath:pinFile,executionInputCount:closure.executionInputs.length,closureFileCount:closure.files.length};
}

/** Only frozen sources are accepted here; verification never captures or regenerates pins. */
export function verifyProjectApplicationV132R2BuildSources(root){
 root=rootPath(root);const engine=assertEngine(root),pins=JSON.parse(readSource(root,PINS)),manifestBytes=readAsset(root,'resource-manifest.json'),manifest=JSON.parse(manifestBytes);
 exact(pins,['schema','policyId','publicationId','fullClosureSha256','manifestSha256','engine','closure'],'build pins');exact(manifest,['schema','policyId','publicationId','fullClosureSha256','engine','closure','files','sources'],'resource manifest');
 if(pins.schema!=='project-application-build-pins/1'||manifest.schema!=='project-application-resource-manifest/1'||pins.policyId!==POLICY||manifest.policyId!==POLICY||pins.publicationId!==PUBLICATION||manifest.publicationId!==PUBLICATION||!hash(pins.fullClosureSha256)||!hash(pins.manifestSha256)||sha256(manifestBytes)!==pins.manifestSha256||sha256(canonical(pins.closure))!==pins.fullClosureSha256||manifest.fullClosureSha256!==pins.fullClosureSha256||!same(pins.engine,engine)||!same(manifest.engine,engine)||!same(manifest.closure,pins.closure))return fail('candidate manifest, engine dependency or complete closure identity differs');
 validateClosure(root,pins.closure);
 if(!Array.isArray(manifest.files)||!Array.isArray(manifest.sources)||manifest.sources.length!==1)return fail('candidate resource/source closure is incomplete');
 const seen=new Set();
 for(const file of manifest.files){exact(file,['path','bytes','sha256','kind'],'resource entry');if(!safe(file.path)||seen.has(file.path)||!Number.isSafeInteger(file.bytes)||file.bytes<0||!hash(file.sha256)||!['rule','source-lock','runtime-source','license','notice','publication'].includes(file.kind))return fail('invalid candidate resource entry');seen.add(file.path);const bytes=readAsset(root,file.path);if(bytes.length!==file.bytes||sha256(bytes)!==file.sha256)return fail('published application resource differs: '+file.path);}
 for(const file of pins.closure.files){const actual=readSource(root,file.sourcePath),published=readAsset(root,file.resourcePath),resource=manifest.files.filter(row=>row.path===file.resourcePath);if(!actual.equals(published)||resource.length!==1||resource[0].bytes!==file.bytes||resource[0].sha256!==file.sha256||resource[0].kind!==fileKind(file.resourcePath))return fail('actual/published complete dependency differs: '+file.sourcePath);}
 if(manifest.files.length!==pins.closure.files.length+1)return fail('resource membership differs from complete closure plus publication');
 const publicationBytes=readAsset(root,'publication.json'),publication=JSON.parse(publicationBytes);exact(publication,['schema','policyId','publicationId','sourceId','fullClosureSha256','engine','closure','admission'],'policy publication');
 if(publication.schema!=='project-application-publication/1'||publication.policyId!==POLICY||publication.publicationId!==PUBLICATION||publication.sourceId!==SOURCE_ID||publication.fullClosureSha256!==pins.fullClosureSha256||!same(publication.engine,engine)||!same(publication.closure,pins.closure)||!same(publication.admission,{scope:'independent-candidate-application-and-saved-replay',productionDefault:false,traditionalConclusion:'unknown'}))return fail('policy publication scope or identity differs');
 const source=manifest.sources[0];exact(source,['id','name','url','commit','license','files','sha256','note'],'candidate SourceRecord');
 if(source.id!==SOURCE_ID||source.commit!==pins.fullClosureSha256||source.sha256!==sha256(publicationBytes)||['name','url','license','note'].some(key=>typeof source[key]!=='string'||!source[key])||!same(source.files,manifest.files.map(file=>file.path))||!manifest.files.some(file=>file.path==='publication.json'&&file.kind==='publication'&&file.sha256===source.sha256))return fail('candidate SourceRecord does not identify its own policy publication');
 assertEngine(root,engine);return Object.freeze(identity(engine,pins.fullClosureSha256,pins.manifestSha256));
}

export async function buildProjectApplicationV132R2({root=process.cwd(),outfile}){
 root=rootPath(root);if(typeof outfile!=='string'||!outfile)return fail('an explicit output file is required');outfile=path.resolve(outfile);
 const builtIdentity=verifyProjectApplicationV132R2BuildSources(root),pins=JSON.parse(readSource(root,PINS));outfile=checkedOutput(root,outfile,pins.closure);checkedOutput(root,outfile+'.receipt.json',pins.closure);
 const compiled=await compile(root,builtIdentity,pins.closure);
 if(!same(verifyProjectApplicationV132R2BuildSources(root),builtIdentity))return fail('source, engine dependency or resolver metadata changed during compilation');
 const output=compiled.result.outputFiles[0].contents,receipt={schema:'project-application-build-receipt/1',identity:builtIdentity,compiledExecutionSources:compiled.realInputs,virtualInputs:compiled.virtualInputs,externalRuntimeModules:compiled.externalRuntimeModules,resolutionMetadata:pins.closure.files.filter(file=>file.role==='resolution'),buildSources:pins.closure.files.filter(file=>file.role==='build'),runtimeEnvironment:environment(),output:{file:path.basename(outfile),bytes:output.length,sha256:sha256(output)},metafile:compiled.result.metafile};
 fs.mkdirSync(path.dirname(outfile),{recursive:true});const suffix='.tmp-'+randomBytes(8).toString('hex'),temporary=outfile+suffix,receiptFile=outfile+'.receipt.json',temporaryReceipt=receiptFile+suffix;
 try{fs.writeFileSync(temporary,output,{flag:'wx'});fs.writeFileSync(temporaryReceipt,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});fs.renameSync(temporary,outfile);fs.renameSync(temporaryReceipt,receiptFile);}finally{for(const file of [temporary,temporaryReceipt])if(fs.existsSync(file))fs.unlinkSync(file);}
 return receipt;
}
