import fs from 'node:fs';
import path from 'node:path';
import * as nodeBuffer from 'node:buffer';
import * as nodeCrypto from 'node:crypto';
import * as nodeModule from 'node:module';
import * as nodeDecoder from 'node:string_decoder';
import * as nodeUtil from 'node:util';
import * as nodeVm from 'node:vm';
import * as nodeZlib from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {canonicalPlainJson} from '../shared/plain-json';
import {snapshotApplicationJson} from './project-application-v132-r2-json';
import {parseSnapshotJsonStrict} from './snapshot-json-spans';
import {CANDIDATE2_NAMING_SELECTION} from '../shared/candidate2-naming-consumer-v1';
import type {Candidate2NamingGeneration,Candidate2NamingReplayContext,Candidate2NamingSelection,Candidate2NamingVerification} from '../shared/candidate2-naming-consumer-v1';
import type {BirthProfile,NamingPreferences,SourceRecord} from '../shared/types';
import {loadBaziSources} from './bazi-data';
import {loadQimenSources} from './qimen-data';
import {loadMonthAuthoritySources} from './month-authority-data';
import {loadMonthlySeasonalSources} from './monthly-seasonal-data';
import {loadSeasonalConditionSources} from './seasonal-condition-data';
import {loadCongWealthSources} from './cong-wealth-data';
import {loadCongShaSources} from './cong-sha-data';
import {loadFollowingRestrictionsSources} from './following-restrictions-data';
import {loadSolarTimeSources} from './solar-time-data';

export interface Candidate2GenerationResourcesConfiguration {
 applicationBundlePath:string;assetDir:string;dataDir:string;consumerPublicationDir:string;
}
export interface Candidate2GenerationRawAsset {
 id:string;scope:'data'|'application-assets'|'application-runtime'|'consumer-execution'|'build-receipt';path:string;bytes:Buffer;
}
export const CANDIDATE2_GENERATION_CONSUMER_EXECUTION_V1=Object.freeze({
 publicationId:'candidate2-session-consumer-execution/1' as const,
 manifestSha256:'d3c555f7d3f6ced6d334d5efd52a8222ecb3f662e99fa20baa1ffc05e1ad057e',
 fullClosureSha256:'d3c555f7d3f6ced6d334d5efd52a8222ecb3f662e99fa20baa1ffc05e1ad057e',
 bundleSha256:'e01a47e90ccb1bdb7576a01bb8a3d5ca1a7939e49550b1a3dee9e451acd8d639',bundleBytes:3036131,
});
const APPLICATION_SHA='906b191c88ce2e6f0335c674727c39bcae14edf2968d2c1c5cdffcb04079b47a';
const APPLICATION_BYTES=2002922;
// Complete canonical metafile of the official M866 receipt actually consumed
// by the frozen M873 run-3 probe. This is a fixed reference, not a new build.
const APPLICATION_METAFILE_SHA='889468f0fe2f1dfdc6c21668217a8e667a302992d735c1d4e654a4a35e3bf3f1';
const BUILTINS=Object.freeze(['node:buffer','node:crypto','node:fs','node:module','node:path','node:string_decoder','node:util','node:vm','node:zlib']);
const APPLICATION_IDENTITY=Object.freeze({
 schema:'project-application-build/1',policyId:'naming-element-application/1.3.2-candidate.2',publicationId:'project-naming-application/1.3.2-candidate.2',
 fullClosureSha256:'eef63f5cb901ca69d5d87f181d89e14e7239068a7e628ac6b0c741878968f640',manifestSha256:'9a10191da1f63eac6e5efce79677748f430f3dc92ed2789df81529c507f79442',esbuildVersion:'0.25.12',
 engine:Object.freeze({schema:'bazi-root-feedback-build/2',methodId:'project-bazi-mainchain-145/1.3.2',publicationId:'bazi-root-feedback/1.3.2;preview-publication-r2',fullClosureSha256:'9f3fa8d4cfc8f190934268597cffb25be19cbf2723b4b827ec74228f2c7596f8',manifestSha256:'3d9b15e6f9963f385411a70eabcbb3ab940629bc285bea65a8ebee92c3f6c71a',esbuildVersion:'0.25.12'}),
});
const BASE_METADATA=Object.freeze([
 'bazi-evidence-source-lock.json','qimen-markers-source-lock.json','qimen-patterns-source-lock.json','qimen-stem-tombs-source-lock.json',
 'month-authority-source-lock.json','month-authority-table.json','monthly-seasonal-source-lock.json','monthly-seasonal-table.json',
 'seasonal-condition-source-lock.json','monthly-seasonal-conditions.json','cong-wealth-source-lock.json','cong-wealth-rules.json',
 'cong-sha-source-lock.json','cong-sha-rules.json','following-restrictions-source-lock.json','following-restrictions-rules.json','raw/following-restrictions-qiongtong-excerpts.json',
]);
const LIMITATIONS=Object.freeze([
 'M921 wrapper and additional base-source loader execution closure await independent source review; no release or Store admission is asserted.',
 'Application receipt non-environment content is fixed by publication-derived arrays and the M873-consumed M866 metafile reference; recorded build environment is structurally checked, not historically attested.',
 'Filesystem checks and pre/post byte rereads do not exclude a concurrent privileged filesystem writer.',
 'This factory uses internal seed 17 and an empty exclusion list; Store history, SQL authority and persistence are not connected.',
]);
interface SourceInput {path:string;bytes:number;sha256:string;}
interface ExecutionManifest {schema:string;esbuildVersion:string;options:Record<string,unknown>;externalRuntimeModules:string[];inputs:SourceInput[];}
interface ClosureRow {sourcePath:string;resourcePath:string;bytes:number;sha256:string;role:string;}
interface Publication {
 schema:string;methodId?:string;policyId?:string;publicationId:string;fullClosureSha256:string;engine?:unknown;
 closure:{files:ClosureRow[];executionInputs:string[];externalRuntimeModules:string[];[key:string]:unknown};
 files:{path:string;bytes:number;sha256:string;kind:string}[];sources:SourceRecord[];
}
interface RecordedRead {physical:string;scope:Candidate2GenerationRawAsset['scope'];path:string;bytes:Buffer;}
interface FrozenConsumer {
 generate(request:{profile:BirthProfile;preferences:NamingPreferences;selection:Candidate2NamingSelection;seed:number;excludeNames:string[]}):Candidate2NamingGeneration|{status:'disabled'};
 createSaved(live:Candidate2NamingGeneration):Candidate2NamingGeneration;
 verifySaved(saved:unknown,context:Candidate2NamingReplayContext):Candidate2NamingVerification;
}
const sha=(value:Uint8Array|string)=>nodeCrypto.createHash('sha256').update(value).digest('hex');
const same=(a:unknown,b:unknown)=>canonicalPlainJson(a)===canonicalPlainJson(b);
const fail=(message:string):never=>{throw Error('CANDIDATE2_GENERATION_RESOURCES_INVALID: '+message);};
const own=<T>(value:T):T=>snapshotApplicationJson(value) as T;
const safe=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&!value.includes('\\')&&!value.includes(':')&&!value.startsWith('/')&&!/[\u0000-\u001f]/.test(value)&&value.split('/').every(part=>part!==''&&part!=='.'&&part!=='..');
const key=(value:string)=>process.platform==='win32'?value.toLowerCase():value;
const within=(base:string,filename:string)=>{const r=path.relative(base,filename);return r!==''&&r!=='..'&&!r.startsWith('..'+path.sep)&&!path.isAbsolute(r);};
function exact(value:unknown,keys:readonly string[],label:string):asserts value is Record<string,unknown> {
 if(!value||typeof value!=='object'||Array.isArray(value)||Reflect.ownKeys(value).length!==keys.length||keys.some(k=>!Object.hasOwn(value,k)))return fail(label+' exact fields differ');
}
function physicalDirectory(directory:string):void {
 const absolute=path.resolve(directory),prefix=path.parse(absolute).root;let current=prefix;
 for(const segment of ['',...absolute.slice(prefix.length).split(path.sep).filter(Boolean)]){
  if(segment)current=path.join(current,segment);
  const stat=fs.lstatSync(current);
  if(stat.isSymbolicLink()||!stat.isDirectory()||path.relative(current,fs.realpathSync(current))!=='')return fail('directory alias or nonphysical path: '+current);
 }
}
function physicalFile(filename:string):string {
 physicalDirectory(path.dirname(filename));const stat=fs.lstatSync(filename);
 if(stat.isSymbolicLink()||!stat.isFile()||path.relative(filename,fs.realpathSync(filename))!=='')return fail('file alias or nonphysical path: '+filename);
 return filename;
}
function json(bytes:Buffer,max=16*1024*1024):unknown {
 if(bytes.length>max||bytes.subarray(0,3).equals(Buffer.from([0xef,0xbb,0xbf])))return fail('JSON exceeds byte budget or contains a BOM');
 const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 return parseSnapshotJsonStrict(text,max);
}
function sourceRecord(value:SourceRecord):SourceRecord {
 const {id,name,url,commit,license,files,sha256,note}=value;
 if([id,name,url,commit,license,sha256,note].some(v=>typeof v!=='string')||!Array.isArray(files)||files.some(v=>typeof v!=='string'))return fail('source record is incomplete');
 return own({id,name,url,commit,license,files:[...files],sha256,note});
}

/** Main-owned physical paths only. The executed code is always the installed
 * fixed e01 consumer and 906 application, never a caller callback or SQL script.
 */
export function createCandidate2GenerationResourcesV1(configuration:Candidate2GenerationResourcesConfiguration) {
 if(arguments.length!==1)return fail('factory accepts exactly one configuration');
 const raw=own(configuration);exact(raw,['applicationBundlePath','assetDir','dataDir','consumerPublicationDir'],'configuration');
 for(const name of ['applicationBundlePath','assetDir','dataDir','consumerPublicationDir'] as const)if(typeof raw[name]!=='string'||!path.isAbsolute(raw[name]))return fail(name+' must be an absolute physical path');
 const config={applicationBundlePath:path.resolve(raw.applicationBundlePath),assetDir:path.resolve(raw.assetDir),dataDir:path.resolve(raw.dataDir),consumerPublicationDir:path.resolve(raw.consumerPublicationDir)};
 for(const directory of [config.assetDir,config.dataDir,config.consumerPublicationDir])physicalDirectory(directory);
 const directories=[config.assetDir,config.dataDir,config.consumerPublicationDir];
 for(let i=0;i<directories.length;i++)for(let j=i+1;j<directories.length;j++)if(key(directories[i])===key(directories[j])||within(directories[i],directories[j])||within(directories[j],directories[i]))return fail('resource namespaces overlap');
 if(directories.some(d=>within(d,config.applicationBundlePath)))return fail('application CJS must have a separate installed namespace');
 const consumerPath=path.join(config.consumerPublicationDir,'consumer.cjs'),manifestPath=path.join(config.consumerPublicationDir,'consumer-execution-manifest.json'),receiptPath=config.applicationBundlePath+'.receipt.json';
 const reads=new Map<string,RecordedRead>();let busy=false;
 function classify(filename:string):{scope:RecordedRead['scope'];path:string} {
  if(key(filename)===key(config.applicationBundlePath))return{scope:'application-runtime',path:'application.cjs'};
  if(key(filename)===key(receiptPath))return{scope:'build-receipt',path:'application.cjs.receipt.json'};
  if(key(filename)===key(consumerPath))return{scope:'consumer-execution',path:'consumer.cjs'};
  if(key(filename)===key(manifestPath))return{scope:'build-receipt',path:'consumer-execution-manifest.json'};
  for(const [base,scope]of [[config.dataDir,'data'],[config.assetDir,'application-assets']] as const)if(within(base,filename))return{scope,path:path.relative(base,filename).replaceAll('\\','/')};
  const sources=path.join(config.consumerPublicationDir,'sources');if(within(sources,filename))return{scope:'consumer-execution',path:path.relative(sources,filename).replaceAll('\\','/')};
  return fail('read escaped the fixed configured resource namespaces: '+filename);
 }
 function checkedPath(value:unknown,allowDirectory=false):string {
  const text=typeof value==='string'?value:value instanceof URL&&value.protocol==='file:'?fileURLToPath(value):null;
  if(text===null||!path.isAbsolute(text))return fail('fixed runtime read must name an absolute physical path');
  const filename=path.resolve(text);
  if(!directories.some(base=>key(base)===key(filename))&&key(path.join(config.consumerPublicationDir,'sources'))!==key(filename))classify(filename);
  physicalDirectory(path.dirname(filename));const stat=fs.lstatSync(filename);
  if(stat.isSymbolicLink()||!(stat.isFile()||allowDirectory&&stat.isDirectory())||path.relative(filename,fs.realpathSync(filename))!=='')return fail('fixed runtime requested a linked or invalid file');
  return filename;
 }
 function read(filename:string):Buffer {
  const physical=physicalFile(path.resolve(filename)),logical=classify(physical);
  if(!safe(logical.path))return fail('invalid logical archive path');
  const bytes=fs.readFileSync(physical),before=reads.get(key(physical));
  if(before&&(!before.bytes.equals(bytes)||before.scope!==logical.scope||before.path!==logical.path))return fail('resource changed during this factory lifetime: '+logical.path);
  if(!before)reads.set(key(physical),{physical,...logical,bytes:Buffer.from(bytes)});
  return Buffer.from(bytes);
 }
 function rereadAll():void {
  for(const row of reads.values())if(!fs.readFileSync(physicalFile(row.physical)).equals(row.bytes))return fail('recorded physical input changed: '+row.scope+'/'+row.path);
 }
 function consumerPublication():ExecutionManifest {
  const bytes=read(manifestPath);
  if(bytes.length!==8059||sha(bytes)!==CANDIDATE2_GENERATION_CONSUMER_EXECUTION_V1.manifestSha256)return fail('consumer execution manifest is not the fixed 57-input original');
  const manifest=json(bytes) as ExecutionManifest;exact(manifest,['schema','esbuildVersion','options','externalRuntimeModules','inputs'],'consumer manifest');
  if(manifest.schema!=='candidate2-consumer-execution-manifest/1'||manifest.esbuildVersion!=='0.25.12'||sha(canonicalPlainJson(manifest))!==CANDIDATE2_GENERATION_CONSUMER_EXECUTION_V1.fullClosureSha256||!same(manifest.options,{platform:'node',format:'cjs',target:'node22',charset:'utf8'})||!same(manifest.externalRuntimeModules,BUILTINS)||!Array.isArray(manifest.inputs)||manifest.inputs.length!==57)return fail('consumer manifest identity or fixed execution set differs');
  const seen=new Set<string>();
  for(const input of manifest.inputs){exact(input,['path','bytes','sha256'],'consumer source');if(!safe(input.path)||seen.has(key(input.path)))return fail('consumer source path is missing or aliased');seen.add(key(input.path));const actual=read(path.join(config.consumerPublicationDir,'sources',...input.path.split('/')));if(actual.length!==input.bytes||sha(actual)!==input.sha256)return fail('consumer source differs: '+input.path);}
  const bundle=read(consumerPath);if(bundle.length!==CANDIDATE2_GENERATION_CONSUMER_EXECUTION_V1.bundleBytes||sha(bundle)!==CANDIDATE2_GENERATION_CONSUMER_EXECUTION_V1.bundleSha256)return fail('installed consumer CJS differs from fixed e01 bytes');
  return manifest;
 }
 function publication(relative:string,expectedSha:string):Publication {
  if(!safe(relative))return fail('invalid fixed publication path');
  const base=path.join(config.assetDir,...relative.split('/')),bytes=read(path.join(base,'resource-manifest.json'));
  if(sha(bytes)!==expectedSha)return fail('fixed application publication manifest differs: '+relative);
  const manifest=json(bytes) as Publication;
  if(!Array.isArray(manifest.files)||!Array.isArray(manifest.closure?.files))return fail('application publication closure missing');
  const seen=new Set<string>();
  for(const file of manifest.files){if(!safe(file.path)||seen.has(key(file.path)))return fail('publication path alias');seen.add(key(file.path));const actual=read(path.join(base,...file.path.split('/')));if(actual.length!==file.bytes||sha(actual)!==file.sha256)return fail('publication resource differs: '+relative+'/'+file.path);}
  return manifest;
 }
 function validateEnvironment(value:unknown):void {
  exact(value,['node','icu','tz','unicode','platform','arch'],'receipt runtime environment');
  const version=(v:unknown)=>typeof v==='string'&&v.length<=128&&/^\d+(?:\.\d+)*(?:[-+][0-9A-Za-z.-]+)?$/.test(v);
  if(typeof value.node!=='string'||value.node.length>128||!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(value.node)||!['icu','unicode'].every(k=>value[k]===null||version(value[k]))||!(value.tz===null||typeof value.tz==='string'&&/^\d{4}[a-z](?:[-+][0-9A-Za-z.-]+)?$/.test(value.tz))||typeof value.platform!=='string'||!['aix','android','cygwin','darwin','freebsd','haiku','linux','netbsd','openbsd','sunos','win32'].includes(value.platform)||typeof value.arch!=='string'||!['arm','arm64','ia32','loong64','mips','mipsel','ppc','ppc64','riscv64','s390','s390x','x64'].includes(value.arch))return fail('receipt environment fields are invalid');
 }
 function validateFixedReceiptContent(bytes:Buffer,manifest:Publication):void {
  const receipt=json(bytes,32*1024*1024) as Record<string,unknown>;
  exact(receipt,['schema','identity','compiledExecutionSources','virtualInputs','externalRuntimeModules','resolutionMetadata','buildSources','runtimeEnvironment','output','metafile'],'application receipt');
  const virtual=([['__PROJECT_APPLICATION_V132_R2_BUILD_IDENTITY__',APPLICATION_IDENTITY],['__ROOT_FEEDBACK_V132_R2_BUILD_IDENTITY__',APPLICATION_IDENTITY.engine]] as const).map(([name,value])=>{const text=JSON.stringify(value);return{file:'<define:'+name+'>',bytes:Buffer.byteLength(text),sha256:sha(text)};});
  if(receipt.schema!=='project-application-build-receipt/1'||!same(receipt.identity,APPLICATION_IDENTITY)||!same(receipt.output,{file:'application.cjs',bytes:APPLICATION_BYTES,sha256:APPLICATION_SHA})||!same(receipt.compiledExecutionSources,manifest.closure.files.filter(row=>row.role==='execution'))||!same(receipt.virtualInputs,virtual)||!same(receipt.externalRuntimeModules,manifest.closure.externalRuntimeModules)||!same(receipt.resolutionMetadata,manifest.closure.files.filter(row=>row.role==='resolution'))||!same(receipt.buildSources,manifest.closure.files.filter(row=>row.role==='build'))||sha(canonicalPlainJson(receipt.metafile))!==APPLICATION_METAFILE_SHA)return fail('complete fixed application receipt content differs');
  validateEnvironment(receipt.runtimeEnvironment);
 }
 function applicationPublicationAndReceipt():void {
  const manifest=publication('project-naming-application/1.3.2-candidate.2',APPLICATION_IDENTITY.manifestSha256),engine=publication('bazi-root-feedback/1.3.2-r2',APPLICATION_IDENTITY.engine.manifestSha256);
  if(manifest.schema!=='project-application-resource-manifest/1'||manifest.policyId!==APPLICATION_IDENTITY.policyId||manifest.publicationId!==APPLICATION_IDENTITY.publicationId||manifest.fullClosureSha256!==APPLICATION_IDENTITY.fullClosureSha256||sha(canonicalPlainJson(manifest.closure))!==APPLICATION_IDENTITY.fullClosureSha256||!same(manifest.engine,APPLICATION_IDENTITY.engine)||engine.fullClosureSha256!==APPLICATION_IDENTITY.engine.fullClosureSha256||sha(canonicalPlainJson(engine.closure))!==APPLICATION_IDENTITY.engine.fullClosureSha256)return fail('fixed publication tuple differs');
  const bundle=read(config.applicationBundlePath);if(bundle.length!==APPLICATION_BYTES||sha(bundle)!==APPLICATION_SHA)return fail('installed application CJS differs from fixed 906 bytes');
  validateFixedReceiptContent(read(receiptPath),manifest);
 }
 function preflight():void {consumerPublication();applicationPublicationAndReceipt();rereadAll();}
 function archiveData(relative:string):Buffer {if(!safe(relative))return fail('unsafe base data source path');return read(path.join(config.dataDir,...relative.split('/')));}
 function archiveSourceFiles(sources:readonly SourceRecord[]):void {
  for(const source of sources)for(const file of source.files)if(file.startsWith('data/'))archiveData(file.slice(5));
 }
 function archiveMetadata(relative:string):void {
  const bytes=archiveData(relative);if(!relative.endsWith('source-lock.json'))return;
  const lock=json(bytes) as {sources?:Array<{files?:string[];fileHashes?:Record<string,string>}>};
  for(const source of lock.sources??[])for(const file of source.files??[]){if(!file.startsWith('data/')||!safe(file.slice(5)))return fail('base source-lock contains an unsafe source');const actual=archiveData(file.slice(5));if(!source.fileHashes||sha(actual)!==source.fileHashes[file])return fail('base source-lock original differs: '+file);}
 }
 function snapshotSources(generation:Candidate2NamingGeneration):SourceRecord[] {
  for(const relative of BASE_METADATA)archiveMetadata(relative);
  const baseSources=[...loadBaziSources(config.dataDir),...loadQimenSources(config.dataDir),...loadMonthAuthoritySources(config.dataDir),...loadMonthlySeasonalSources(config.dataDir),...loadSeasonalConditionSources(config.dataDir),...loadCongWealthSources(config.dataDir),...loadCongShaSources(config.dataDir),...loadFollowingRestrictionsSources(config.dataDir)];
  if(generation.baseAnalysis.bazi.timeBasis?.sourceId){archiveMetadata('solar-time-source-lock.json');baseSources.push(...loadSolarTimeSources(config.dataDir));}
  const all=[...generation.dataIdentity.sources,...generation.application.certificate.sources,...baseSources].map(sourceRecord);
  // Dataset source records also describe upstream raw corpora that this fixed
  // runtime never opens. Preserve those records as provenance; archive actual
  // consumer reads and the certified base-loader files, not unused corpora.
  archiveSourceFiles(baseSources);
  const merged=new Map<string,SourceRecord>();
  for(const source of all){const before=merged.get(source.id);if(before&&!same(before,source))return fail('one source ID has conflicting complete records: '+source.id);if(!before)merged.set(source.id,source);}
  merged.delete('naming-editorial-meanings-v7-fixed');
  return own([...merged.values()]);
 }
 // Only read/stat operations exercised by the hash-pinned consumer are exposed.
 // No global fs or module object is changed; the nested 906 loader receives this
 // same private read function through its node:module.createRequire seam.
 const privateRealpath=((filename:unknown)=>checkedPath(filename,true)) as typeof fs.realpathSync;
 Object.defineProperty(privateRealpath,'native',{value:privateRealpath});
 const privateFs=Object.freeze({
  readFileSync:function(filename:unknown,options?:unknown){
   if(arguments.length<1||arguments.length>2)return fail('readFileSync arity');
   const bytes=read(checkedPath(filename));
   const encoding=typeof options==='string'?options:options&&typeof options==='object'?Object.getOwnPropertyDescriptor(options,'encoding')?.value:undefined;
   if(encoding===undefined||encoding===null||encoding==='buffer')return bytes;
   if(typeof encoding!=='string'||!Buffer.isEncoding(encoding))return fail('fixed runtime requested an unsupported encoding');
   return bytes.toString(encoding as BufferEncoding);
  },
  lstatSync:(filename:unknown)=>fs.lstatSync(checkedPath(filename,true)),statSync:(filename:unknown)=>fs.statSync(checkedPath(filename,true)),realpathSync:privateRealpath,
 });
 const nativeBuiltins:Record<string,unknown>={'node:buffer':nodeBuffer,'node:crypto':nodeCrypto,'node:path':path,'node:string_decoder':nodeDecoder,'node:util':nodeUtil,'node:vm':nodeVm,'node:zlib':nodeZlib};
 function fixedRequire(id:string):unknown {
  if(!BUILTINS.includes(id))return fail('fixed consumer attempted an undeclared runtime module: '+id);
  if(id==='node:fs')return privateFs;
  if(id==='node:module')return Object.freeze({isBuiltin:nodeModule.isBuiltin,createRequire:(filename:unknown)=>{const actual=typeof filename==='string'?path.resolve(filename):filename instanceof URL?fileURLToPath(filename):null;if(actual===null||![config.applicationBundlePath,consumerPath].some(p=>key(p)===key(actual)))return fail('nested require requested an unowned module filename');return fixedRequire;}});
  return nativeBuiltins[id];
 }
 preflight();
 const module={exports:{} as unknown};
 const wrapper=new nodeVm.Script('(function(module,exports,require,__filename,__dirname){\n'+read(consumerPath).toString('utf8')+'\n})',{filename:consumerPath}).runInThisContext() as (module:unknown,exports:unknown,require:(id:string)=>unknown,filename:string,directory:string)=>void;
 wrapper(module,module.exports,fixedRequire,consumerPath,config.consumerPublicationDir);
 const api=module.exports as {createCandidate2NamingConsumer?:(configuration:{applicationBundlePath:string;assetDir:string;dataDir:string;namingRulesVersion:'naming-editorial-7.1.0'})=>FrozenConsumer};
 if(!api||typeof api.createCandidate2NamingConsumer!=='function')return fail('fixed consumer export is missing');
 const consumer=api.createCandidate2NamingConsumer({applicationBundlePath:config.applicationBundlePath,assetDir:config.assetDir,dataDir:config.dataDir,namingRulesVersion:'naming-editorial-7.1.0'});
 rereadAll();
 function operation<T>(action:()=>T):T {
  if(busy)return fail('reentrant resource operation');busy=true;let primary:unknown;
  try{preflight();return action();}catch(error){primary=error;throw error;}finally{try{consumerPublication();applicationPublicationAndReceipt();rereadAll();}catch(error){if(primary instanceof Error)primary.message+=' [post-read verification: '+String(error)+']';else throw error;}finally{busy=false;}}
 }
 function assets():Candidate2GenerationRawAsset[] {
  const rows=[...reads.values()].sort((a,b)=>a.scope<b.scope?-1:a.scope>b.scope?1:a.path<b.path?-1:a.path>b.path?1:0);
  const seen=new Set<string>();
  return Object.freeze(rows.map(row=>{const identity=row.scope+':'+row.path;if(seen.has(identity))return fail('logical asset alias');seen.add(identity);return Object.freeze({id:identity,scope:row.scope,path:row.path,bytes:Buffer.from(row.bytes)});})) as unknown as Candidate2GenerationRawAsset[];
 }
 return Object.freeze({
  generate(profile:BirthProfile,preferences:NamingPreferences,selection:Candidate2NamingSelection) {
   if(arguments.length!==3)return fail('generate accepts exactly profile, preferences and selection');
   const request=own({profile,preferences,selection});if(!same(request.selection,CANDIDATE2_NAMING_SELECTION))return fail('generate requires the exact candidate.2 selection');
   return operation(()=>{
    const live=consumer.generate({...request,seed:17,excludeNames:[]});
    if(live.status!=='generated')return fail('fixed consumer did not return a generated result');
    const generation=own(consumer.createSaved(live)),sources=snapshotSources(generation),snapshotAssets=assets();
    return Object.freeze({generation,assets:snapshotAssets,snapshotAssets,snapshotSources:sources,consumerExecution:CANDIDATE2_GENERATION_CONSUMER_EXECUTION_V1,limitations:LIMITATIONS});
   });
  },
  verifySaved(saved:unknown,context:Candidate2NamingReplayContext):{verification:Candidate2NamingVerification;snapshotSources:SourceRecord[]} {
   if(arguments.length!==2)return fail('verifySaved accepts exactly saved and real replay context');
   const captured=own({saved,context});exact(captured.context,['profile','preferences','selection'],'saved replay context');
   return operation(()=>{const verification=own(consumer.verifySaved(captured.saved,captured.context)),sources=snapshotSources(captured.saved as Candidate2NamingGeneration);return Object.freeze({verification,snapshotSources:sources});});
  },
  verifyArchivedApplicationReceipt(bytes:Buffer):void {
   if(arguments.length!==1||nodeUtil.types.isProxy(bytes)||!Buffer.isBuffer(bytes))return fail('archived receipt accepts exactly one Buffer');
   // Native typed-array access copies the byte view without consulting caller
   // accessors, iterators, constructors or toJSON hooks.
   const byteLength=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype),'byteLength')!.get!.call(bytes) as number;
   if(byteLength>32*1024*1024)return fail('archived receipt exceeds byte budget');
   const captured=Buffer.alloc(byteLength);Uint8Array.prototype.set.call(captured,bytes);
   return operation(()=>{const manifest=publication('project-naming-application/1.3.2-candidate.2',APPLICATION_IDENTITY.manifestSha256);validateFixedReceiptContent(captured,manifest);});
  },
 });
}
