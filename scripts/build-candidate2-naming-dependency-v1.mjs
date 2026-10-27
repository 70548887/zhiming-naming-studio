import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {fileURLToPath} from 'node:url';
import {version as esbuildVersion} from 'esbuild';
import {buildProjectApplicationV132R2,verifyProjectApplicationV132R2BuildSources} from './build-project-application-v132-r2.mjs';

const OUTPUT_SHA256='906b191c88ce2e6f0335c674727c39bcae14edf2968d2c1c5cdffcb04079b47a';
const OUTPUT_DIRECTORY=['project-naming-application','1.3.2-candidate.2'];
const OUTPUT_FILE='application.cjs';
const APPLICATION_PUBLICATION='assets/project-naming-application/1.3.2-candidate.2';
const ENGINE_PUBLICATION='assets/bazi-root-feedback/1.3.2-r2';
const APPLICATION_PINS='src/main/project-application-v132-r2-pins.json';
const ENGINE_PINS='src/main/bazi-root-feedback-v132-r2-pins.json';
const SCRATCH_DIRECTORY=['.local','m845-fixed-candidate2-inputs'];
const BLOCKED_ROOT_SEGMENTS=new Set(['assets','src','data','scripts','node_modules','core-dependencies','.git']);
const FIXED_IDENTITY=Object.freeze({
 schema:'project-application-build/1',policyId:'naming-element-application/1.3.2-candidate.2',
 publicationId:'project-naming-application/1.3.2-candidate.2',
 fullClosureSha256:'eef63f5cb901ca69d5d87f181d89e14e7239068a7e628ac6b0c741878968f640',
 manifestSha256:'9a10191da1f63eac6e5efce79677748f430f3dc92ed2789df81529c507f79442',
 esbuildVersion:'0.25.12',
 engine:Object.freeze({schema:'bazi-root-feedback-build/2',methodId:'project-bazi-mainchain-145/1.3.2',
  publicationId:'bazi-root-feedback/1.3.2;preview-publication-r2',
  fullClosureSha256:'9f3fa8d4cfc8f190934268597cffb25be19cbf2723b4b827ec74228f2c7596f8',
  manifestSha256:'3d9b15e6f9963f385411a70eabcbb3ab940629bc285bea65a8ebee92c3f6c71a',esbuildVersion:'0.25.12'}),
});
const pendingByRoot=new Map();
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=value=>JSON.stringify(value&&typeof value==='object'?Array.isArray(value)?value.map(item=>JSON.parse(canonical(item))):Object.fromEntries(Object.keys(value).sort().map(key=>[key,JSON.parse(canonical(value[key]))])):value);
const same=(left,right)=>canonical(left)===canonical(right);
const fail=(code,message,cause)=>{throw new Error('CANDIDATE2_NAMING_DEPENDENCY_'+code+': '+message,cause===undefined?undefined:{cause});};
const keyOf=value=>process.platform==='win32'?value.toLowerCase():value;
const inside=(root,filename)=>{const relative=path.relative(root,filename);return relative!==''&&relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);};
const safeRelative=value=>typeof value==='string'&&value.length>0&&!value.includes('\\')&&!value.includes(':')&&!value.startsWith('/')&&value.split('/').every(part=>part!==''&&part!=='.'&&part!=='..');
function exact(value,keys,label){
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value))||Reflect.ownKeys(value).length!==keys.length||keys.some(key=>!Object.hasOwn(value,key)))return fail('SOURCES_INVALID',label+' fields differ from the fixed schema');
}
function stat(filename){
 try{return fs.lstatSync(filename);}catch(error){if(error?.code==='ENOENT')return null;return fail('PATH_INVALID','cannot inspect '+filename,error);}
}
function physicalDirectory(filename,info=stat(filename)){
 if(!info||info.isSymbolicLink()||!info.isDirectory())return fail('PATH_INVALID','directory must exist physically without a symlink or junction: '+filename);
 if(path.relative(filename,fs.realpathSync(filename))!=='')return fail('PATH_INVALID','directory resolves to a different physical path: '+filename);
}
/** Inspect every existing ancestor, including ancestors above the workspace. */
function inspectDirectoryChain(filename,allowMissing=false){
 const absolute=path.resolve(filename),prefix=path.parse(absolute).root;
 let current=prefix,missing=false;
 physicalDirectory(current);
 for(const segment of absolute.slice(prefix.length).split(path.sep).filter(Boolean)){
  current=path.join(current,segment);const info=stat(current);
  if(!info){if(!allowMissing)return fail('PATH_INVALID','missing physical directory: '+current);missing=true;continue;}
  if(missing)return fail('PATH_INVALID','output ancestor appeared below a missing path: '+current);
  physicalDirectory(current,info);
 }
 return absolute;
}
function optionsValue(options){
 if(!options||typeof options!=='object'||types.isProxy(options)||Array.isArray(options)||![Object.prototype,null].includes(Object.getPrototypeOf(options)))return fail('INPUT_INVALID','plain root/outDir options required');
 const keys=Reflect.ownKeys(options),copy={};
 for(const key of keys){const descriptor=Object.getOwnPropertyDescriptor(options,key);if(typeof key!=='string'||!['root','outDir'].includes(key)||!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)return fail('INPUT_INVALID','only enumerable root/outDir data fields are accepted');copy[key]=descriptor.value;}
 if(typeof copy.root!=='string'||!path.isAbsolute(copy.root)||copy.outDir!==undefined&&(typeof copy.outDir!=='string'||!copy.outDir))return fail('INPUT_INVALID','an absolute root and optional output directory are required');
 const root=inspectDirectoryChain(copy.root),outDir=path.resolve(root,copy.outDir??'dist-electron');
 if(!inside(root,outDir))return fail('PATH_INVALID','output directory must stay strictly inside the physical workspace');
 const relative=path.relative(root,outDir),segments=relative.split(path.sep);
 if(segments.some(segment=>BLOCKED_ROOT_SEGMENTS.has(segment.toLowerCase())))return fail('PATH_INVALID','output directory overlaps a source, asset, vendor or dependency namespace');
 inspectDirectoryChain(outDir,true);
 const directory=path.join(outDir,...OUTPUT_DIRECTORY),bundlePath=path.join(directory,OUTPUT_FILE),receiptPath=bundlePath+'.receipt.json';
 const scratchParent=path.join(root,...SCRATCH_DIRECTORY);
 if(keyOf(directory)===keyOf(scratchParent)||inside(scratchParent,directory))return fail('PATH_INVALID','output directory overlaps the private fixed-input workspace');
 inspectDirectoryChain(directory,true);
 return{root,outDir,directory,bundlePath,receiptPath};
}
function assertOutputFile(filename){
 const info=stat(filename);
 if(!info)return null;
 if(info.isSymbolicLink()||!info.isFile()||info.nlink!==1||path.relative(filename,fs.realpathSync(filename))!=='')return fail('PATH_INVALID','output must be one physical regular file without links: '+filename);
 return info;
}
function inspectPaths(paths){
 inspectDirectoryChain(paths.root);inspectDirectoryChain(paths.directory,true);
 const bundle=assertOutputFile(paths.bundlePath),receipt=assertOutputFile(paths.receiptPath);
 if(!!bundle!==!!receipt)return fail('PAIR_INCOMPLETE','bundle and receipt must both exist or both be absent; existing files were preserved');
 return !!bundle;
}
function makeDirectories(paths){
 let current=paths.root;
 for(const segment of path.relative(paths.root,paths.directory).split(path.sep)){
  current=path.join(current,segment);let info=stat(current);
  if(!info){try{fs.mkdirSync(current);}catch(error){if(error?.code!=='EEXIST')return fail('PATH_INVALID','cannot create physical output directory: '+current,error);}info=stat(current);}
  physicalDirectory(current,info);
 }
 inspectDirectoryChain(paths.directory);
}
function readPhysicalFile(base,relative){
 if(!safeRelative(relative))return fail('SOURCES_INVALID','unsafe fixed resource path');
 const filename=path.join(base,...relative.split('/'));inspectDirectoryChain(path.dirname(filename));
 const info=stat(filename);if(!info||info.isSymbolicLink()||!info.isFile())return fail('SOURCES_INVALID','fixed resource is not a physical regular file: '+relative);
 const actual=fs.realpathSync(filename);if(!inside(base,actual)||path.relative(filename,actual)!=='')return fail('SOURCES_INVALID','fixed resource escaped its physical publication: '+relative);
 return fs.readFileSync(actual);
}
function readPublication(root,relative,manifestSha256){
 const directory=path.join(root,...relative.split('/'));inspectDirectoryChain(directory);
 const manifestBytes=readPhysicalFile(directory,'resource-manifest.json');
 if(digest(manifestBytes)!==manifestSha256)return fail('SOURCES_INVALID','fixed publication manifest differs: '+relative);
 const manifest=JSON.parse(manifestBytes.toString('utf8'));
 if(!Array.isArray(manifest.files)||!Array.isArray(manifest.closure?.files)||!Array.isArray(manifest.closure?.executionInputs))return fail('SOURCES_INVALID','fixed publication closure is incomplete: '+relative);
 const originals=new Map([['resource-manifest.json',manifestBytes]]);
 for(const row of manifest.files){
  exact(row,['path','bytes','sha256','kind'],'fixed resource');
  if(!safeRelative(row.path)||originals.has(row.path)||!Number.isSafeInteger(row.bytes)||row.bytes<0||typeof row.sha256!=='string'||!/^[a-f0-9]{64}$/.test(row.sha256))return fail('SOURCES_INVALID','invalid fixed resource row: '+relative);
  const bytes=readPhysicalFile(directory,row.path);
  if(bytes.length!==row.bytes||digest(bytes)!==row.sha256)return fail('SOURCES_INVALID','published fixed resource bytes differ: '+relative+'/'+row.path);
  originals.set(row.path,bytes);
 }
 return{relative,manifest,originals};
}
function captureFixedInputs(root){
 if(esbuildVersion!==FIXED_IDENTITY.esbuildVersion)return fail('SOURCES_INVALID','official compiler version differs from the fixed candidate.2 toolchain');
 const application=readPublication(root,APPLICATION_PUBLICATION,FIXED_IDENTITY.manifestSha256),engine=readPublication(root,ENGINE_PUBLICATION,FIXED_IDENTITY.engine.manifestSha256);
 const app=application.manifest,core=engine.manifest;
 if(app.schema!=='project-application-resource-manifest/1'||app.policyId!==FIXED_IDENTITY.policyId||app.publicationId!==FIXED_IDENTITY.publicationId||app.fullClosureSha256!==FIXED_IDENTITY.fullClosureSha256||digest(canonical(app.closure))!==FIXED_IDENTITY.fullClosureSha256||!same(app.engine,FIXED_IDENTITY.engine))return fail('IDENTITY_INVALID','fixed application publication identity differs');
 if(core.schema!=='bazi-root-feedback-resource-manifest/3'||core.methodId!==FIXED_IDENTITY.engine.methodId||core.publicationId!==FIXED_IDENTITY.engine.publicationId||core.applicationPolicyVersion!=='naming-element-preview/1.3.2'||core.fullClosureSha256!==FIXED_IDENTITY.engine.fullClosureSha256||digest(canonical(core.closure))!==FIXED_IDENTITY.engine.fullClosureSha256)return fail('IDENTITY_INVALID','fixed r2 publication identity differs');
 const inputs=new Map(),foldedPaths=new Map();
 const add=(relative,bytes)=>{
  if(!safeRelative(relative))return fail('SOURCES_INVALID','unsafe private input source path');
  const folded=keyOf(relative),previous=foldedPaths.get(folded);
  if(previous&&previous!==relative)return fail('SOURCES_INVALID','case-aliased private input paths conflict: '+relative);
  foldedPaths.set(folded,relative);const before=inputs.get(relative);
  if(before&&!before.equals(bytes))return fail('SOURCES_INVALID','two fixed publications disagree on the same private source path: '+relative);
  if(!before)inputs.set(relative,Buffer.from(bytes));
 };
 for(const publication of [application,engine]){
  for(const [relative,bytes]of publication.originals)add(publication.relative+'/'+relative,bytes);
  for(const row of publication.manifest.closure.files){
   exact(row,['sourcePath','resourcePath','bytes','sha256','role'],'fixed closure source');
   const bytes=publication.originals.get(row.resourcePath);
   if(!safeRelative(row.sourcePath)||!safeRelative(row.resourcePath)||!bytes||bytes.length!==row.bytes||digest(bytes)!==row.sha256)return fail('SOURCES_INVALID','fixed source mapping differs: '+row.sourcePath);
   add(row.sourcePath,bytes);
  }
 }
 const pinBytes=readPhysicalFile(root,APPLICATION_PINS),pins=JSON.parse(pinBytes.toString('utf8'));
 exact(pins,['schema','policyId','publicationId','fullClosureSha256','manifestSha256','engine','closure'],'candidate.2 pins');
 if(pins.schema!=='project-application-build-pins/1'||pins.policyId!==FIXED_IDENTITY.policyId||pins.publicationId!==FIXED_IDENTITY.publicationId||pins.fullClosureSha256!==FIXED_IDENTITY.fullClosureSha256||pins.manifestSha256!==FIXED_IDENTITY.manifestSha256||!same(pins.engine,FIXED_IDENTITY.engine)||!same(pins.closure,app.closure))return fail('IDENTITY_INVALID','candidate.2 pins do not match the fixed publication');
 add(APPLICATION_PINS,pinBytes);
 const corePinsBytes=inputs.get(ENGINE_PINS);if(!corePinsBytes)return fail('SOURCES_INVALID','r2 pins are absent from the fixed application publication');
 const corePins=JSON.parse(corePinsBytes.toString('utf8'));exact(corePins,['schema','publicationId','fullClosureSha256','manifestSha256','closure'],'frozen r2 pins');
 if(corePins.schema!=='bazi-root-feedback-build-pins/2'||corePins.publicationId!==FIXED_IDENTITY.engine.publicationId||corePins.fullClosureSha256!==FIXED_IDENTITY.engine.fullClosureSha256||corePins.manifestSha256!==FIXED_IDENTITY.engine.manifestSha256||!same(corePins.closure,core.closure))return fail('IDENTITY_INVALID','published r2 pins do not match their fixed publication');
 // These are the actual imported official modules, not host package or engine
 // inputs. Both must equal their independently frozen application build rows.
 for(const name of ['build-project-application-v132-r2.mjs','build-root-feedback-v132-r2.mjs']){
  const relative='scripts/'+name,pinned=inputs.get(relative),filename=fileURLToPath(new URL('./'+name,import.meta.url));
  const actual=readPhysicalFile(path.dirname(filename),path.basename(filename));
  if(!pinned||!actual.equals(pinned))return fail('SOURCES_INVALID','loaded official builder module differs from its fixed build source: '+name);
 }
 return inputs;
}
function createScratch(paths,inputs){
 const parent=path.join(paths.root,...SCRATCH_DIRECTORY);makeDirectories({root:paths.root,directory:parent});
 const directory=fs.mkdtempSync(path.join(parent,'case-owned-'));inspectDirectoryChain(directory);
 const owned={root:paths.root,parent,directory};
 try{
  for(const [relative,bytes]of inputs){
   const filename=path.join(directory,...relative.split('/'));
   if(!inside(directory,filename))return fail('PATH_INVALID','private fixed source escaped owned scratch');
   makeDirectories({root:directory,directory:path.dirname(filename)});
   if(stat(filename))return fail('PATH_INVALID','private fixed source path already exists: '+relative);
   fs.writeFileSync(filename,bytes,{flag:'wx'});
  }
  inspectDirectoryChain(directory);return owned;
 }catch(error){try{cleanupScratch(owned);}catch(cleanup){error.message+=' [private scratch cleanup failed: '+cleanup.message+']';}throw error;}
}
function cleanupScratch(owned){
 const root=path.resolve(owned.root),parent=path.resolve(owned.parent),directory=path.resolve(owned.directory);
 if(parent!==path.join(root,...SCRATCH_DIRECTORY)||path.dirname(directory)!==parent||!path.basename(directory).startsWith('case-owned-')||!inside(root,directory))return fail('PATH_INVALID','refusing cleanup outside this invocation owned scratch');
 inspectDirectoryChain(parent);if(!stat(directory))return;inspectDirectoryChain(directory);
 const inspectTree=base=>{for(const name of fs.readdirSync(base)){const filename=path.join(base,name),info=stat(filename);if(!info||info.isSymbolicLink())return fail('PATH_INVALID','linked private scratch entry prevents cleanup');if(info.isDirectory()){physicalDirectory(filename,info);inspectTree(filename);}else if(!info.isFile()||!inside(directory,fs.realpathSync(filename)))return fail('PATH_INVALID','nonphysical private scratch entry prevents cleanup');}};
 inspectTree(directory);
 // Only this checked absolute case-owned directory is removed. This is path
 // validation, not exclusion of a concurrent privileged filesystem writer.
 fs.rmSync(directory,{recursive:true,force:false});
}
function verifySources(root){
 let identity;
 try{identity=verifyProjectApplicationV132R2BuildSources(root);}catch(error){return fail('SOURCES_INVALID','official frozen candidate.2 source verification failed',error);}
 if(!same(identity,FIXED_IDENTITY))return fail('IDENTITY_INVALID','official source identity differs from the admitted dependency identity');
 return identity;
}
const RECEIPT_KEYS=['schema','identity','compiledExecutionSources','virtualInputs','externalRuntimeModules','resolutionMetadata','buildSources','runtimeEnvironment','output','metafile'];
function receiptFields(value,keys,label){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||keys.some(key=>!Object.hasOwn(value,key)))return fail('RECEIPT_INVALID',label+' fields differ from the complete official schema; files were preserved');
}
function receiptSame(left,right){try{return same(left,right);}catch{return false;}}
function verifyReceiptEnvironment(value){
 receiptFields(value,['node','icu','tz','unicode','platform','arch'],'runtime environment');
 const version=value=>typeof value==='string'&&value.length<=128&&/^\d+(?:\.\d+)*(?:[-+][0-9A-Za-z.-]+)?$/.test(value);
 const nullableVersion=value=>value===null||version(value);
 if(typeof value.node!=='string'||value.node.length>128||!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(value.node)||!nullableVersion(value.icu)||!nullableVersion(value.unicode)||!(value.tz===null||typeof value.tz==='string'&&/^\d{4}[a-z](?:[-+][0-9A-Za-z.-]+)?$/.test(value.tz))||!['aix','android','cygwin','darwin','freebsd','haiku','linux','netbsd','openbsd','sunos','win32'].includes(value.platform)||!['arm','arm64','ia32','loong64','mips','mipsel','ppc','ppc64','riscv64','s390','s390x','x64'].includes(value.arch))return fail('RECEIPT_INVALID','recorded runtime environment has invalid field types or version/platform/architecture values');
 // Historical environment metadata is structurally checked, not attested or
 // pinned to this host. It grants no source, build or runtime authority.
}
function verifyOutputPair(paths,identity,expectedReceipt){
 if(!inspectPaths(paths))return fail('PAIR_INCOMPLETE','official builder did not leave both bundle and receipt; no two-file transaction is claimed');
 const bundle=fs.readFileSync(paths.bundlePath),receiptBytes=fs.readFileSync(paths.receiptPath);
 if(digest(bundle)!==OUTPUT_SHA256)return fail('OUTPUT_MISMATCH','physical application.cjs differs from the fixed candidate.2 output; files were preserved');
 if(receiptBytes.length===0||receiptBytes.length>32*1024*1024)return fail('RECEIPT_INVALID','receipt is empty or exceeds the fixed deployment budget');
 let receipt;try{receipt=JSON.parse(receiptBytes.toString('utf8'));}catch(error){return fail('RECEIPT_INVALID','receipt is not JSON',error);}
 receiptFields(receipt,RECEIPT_KEYS,'official receipt');verifyReceiptEnvironment(receipt.runtimeEnvironment);
 if(receipt.schema!=='project-application-build-receipt/1'||!receiptSame(receipt.identity,identity)||!receiptSame(receipt.identity,FIXED_IDENTITY)||!receiptSame(receipt.output,{file:OUTPUT_FILE,bytes:bundle.length,sha256:OUTPUT_SHA256}))return fail('RECEIPT_INVALID','receipt identity or physical output digest/byte count differs from the fixed official build');
 if(expectedReceipt)for(const key of RECEIPT_KEYS.filter(key=>key!=='runtimeEnvironment')){
  if(!receiptSame(receipt[key],expectedReceipt[key]))return fail('RECEIPT_INVALID','official receipt '+key+' differs from the actual fixed-source reference compilation; files were preserved');
 }
 inspectPaths(paths);
 return{output:Object.freeze({file:OUTPUT_FILE,bytes:bundle.length,sha256:OUTPUT_SHA256}),receiptSha256:digest(receiptBytes)};
}
async function ensure(paths){
 const present=inspectPaths(paths),inputs=captureFixedInputs(paths.root),owned=createScratch(paths,inputs);let failure;
 try{
  const identity=verifySources(owned.directory);let expectedReceipt;
  if(!present){
   makeDirectories(paths);if(inspectPaths(paths))return fail('OUTPUT_RACE','an output pair appeared before the official cold build');
   try{expectedReceipt=await buildProjectApplicationV132R2({root:owned.directory,outfile:paths.bundlePath});}catch(error){return fail('BUILD_FAILED','official build failed; bundle and receipt are separate writes and any remaining files were preserved',error);}
  }else{
   verifyOutputPair(paths,identity);
   // Recompile only into this invocation's owned scratch. The official fixed
   // compiler supplies every source/DEFINE/resolver/build/metafile evidence
   // field for exact comparison; the host pair is never repaired or rewritten.
   try{expectedReceipt=await buildProjectApplicationV132R2({root:owned.directory,outfile:path.join(owned.directory,'.m860-receipt-reference',OUTPUT_FILE)});}catch(error){return fail('BUILD_FAILED','official private receipt reference compilation failed; existing output files were preserved',error);}
  }
  const verified=verifyOutputPair(paths,identity,expectedReceipt),after=verifySources(owned.directory);
  if(!same(after,identity))return fail('IDENTITY_INVALID','fixed private source identity changed while the output pair was checked');
  return Object.freeze({schema:'candidate2-naming-dependency/1',status:present?'verified-existing':'built',root:paths.root,outDir:paths.outDir,bundlePath:paths.bundlePath,receiptPath:paths.receiptPath,identity:FIXED_IDENTITY,...verified,inputOrigin:'fixed-publication-private-root',hostPackageRead:false,hostEngineRead:false,hostCoreVendorRead:false,compilerOrigin:'host-esbuild-fixed-version-0.25.12',pairPublication:'sequential-files-verified-after-write',filesystemBoundary:'physical-path-checks; no concurrent privileged-writer exclusion'});
 }catch(error){failure=error;throw error;}finally{try{cleanupScratch(owned);}catch(error){if(failure)failure.message+=' [private scratch cleanup failed: '+error.message+']';else throw error;}}
}

/** Build-only deployment seam. It never accepts a caller bundle path, changes
 * frozen publications, or grants runtime/saved replay admission. Every invocation
 * restores the two fixed publication originals into a private owned source root;
 * host package, engine and vendor bytes never supply the core source identity.
 * A warm pair is checked against a private official reference compilation of
 * those fixed inputs, including its complete receipt; it is never repaired.
 * The official builder writes two files sequentially; this helper claims only
 * the verified state observed after those writes, not an atomic pair commit.
 */
export function ensureCandidate2NamingDependency(options){
 let paths;try{if(arguments.length!==1)return Promise.reject(new Error('CANDIDATE2_NAMING_DEPENDENCY_INPUT_INVALID: one options object required'));paths=optionsValue(options);}catch(error){return Promise.reject(error);}
 const rootKey=keyOf(paths.root),destination=keyOf(paths.directory),previous=pendingByRoot.get(rootKey);
 if(previous?.destination===destination)return previous.promise;
 const promise=(async()=>{if(previous)try{await previous.promise;}catch{/* A later request may retry after the earlier failure; its own pair is rechecked. */}return ensure(paths);})();
 pendingByRoot.set(rootKey,{destination,promise});
 const clear=()=>{if(pendingByRoot.get(rootKey)?.promise===promise)pendingByRoot.delete(rootKey);};
 promise.then(clear,clear);return promise;
}
