import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {inflateRawSync} from 'node:zlib';
import initSqlJs,{type Database} from 'sql.js';
import {ensureCandidate2NamingDependency} from '../../scripts/build-candidate2-naming-dependency-v1.mjs';
import {canonicalPlainJson} from '../../src/shared/plain-json';
import {parseSnapshotJsonStrict} from '../../src/main/snapshot-json-spans';

// Relocation for explicit environment runs; fixed byte/hash/source gates below
// remain unchanged. A path is never source or execution authority.
const EVIDENCE_ROOT=process.env.CANDIDATE2_ACCEPTANCE_M873_DIR??'D:/Codex-NamingStudio-Evidence/m873-core-session-contract';
const RUN_ROOT=path.join(EVIDENCE_ROOT,'runs','run-3');
const CONSUMER_BYTES=3036131;
const CONSUMER_SHA='e01a47e90ccb1bdb7576a01bb8a3d5ca1a7939e49550b1a3dee9e451acd8d639';
const MANIFEST_SHA='d3c555f7d3f6ced6d334d5efd52a8222ecb3f662e99fa20baa1ffc05e1ad057e';
const APPLICATION_BYTES=2002922;
const APPLICATION_SHA='906b191c88ce2e6f0335c674727c39bcae14edf2968d2c1c5cdffcb04079b47a';
const LEAF_MAX=8*1024**2,CHUNK_MAX=5*1024**2;
const PREFIX='m921-generation-fixture-';
const temporary=fs.realpathSync.native(os.tmpdir());
const require=createRequire(import.meta.url);
const ownedRoots=new Set<string>();
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const validHash=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/u.test(value);
function need(condition:unknown,message:string):asserts condition{if(!condition)throw Error('M921_FIXTURE_INVALID: '+message);}
const safeRelative=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&!value.includes('\\')&&!value.includes(':')&&!value.startsWith('/')&&!/[\u0000-\u001f]/u.test(value)&&value.split('/').every(part=>part!==''&&part!=='.'&&part!=='..');
function inside(base:string,file:string):boolean {
 const relative=path.relative(base,file);return relative!==''&&relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);
}
function exact(value:unknown,keys:readonly string[],label:string):asserts value is Record<string,unknown> {
 need(!!value&&typeof value==='object'&&!Array.isArray(value),label+' must be an object');
 const actual=Reflect.ownKeys(value);
 need(actual.length===keys.length&&keys.every(key=>Object.hasOwn(value,key)),label+' exact fields differ');
 for(const key of actual){const descriptor=Object.getOwnPropertyDescriptor(value,key);need(typeof key==='string'&&keys.includes(key)&&!!descriptor&&Object.hasOwn(descriptor,'value')&&descriptor.enumerable,label+' must contain own enumerable data');}
}
function physicalFile(filename:string):Buffer {
 const absolute=path.resolve(filename),info=fs.lstatSync(absolute);
 need(info.isFile()&&!info.isSymbolicLink()&&fs.realpathSync.native(absolute)===absolute,'source must be one physical file: '+absolute);
 return fs.readFileSync(absolute);
}
function assertOwned(root:string):void {
 const absolute=path.resolve(root),info=fs.lstatSync(absolute);
 need(ownedRoots.has(absolute)&&path.dirname(absolute)===temporary&&path.basename(absolute).startsWith(PREFIX),'unknown owned temporary root');
 need(info.isDirectory()&&!info.isSymbolicLink()&&fs.realpathSync.native(absolute)===absolute,'owned temporary root is not physical');
}
function inspectTree(root:string,directory=root):void {
 const info=fs.lstatSync(directory);
 need(info.isDirectory()&&!info.isSymbolicLink()&&fs.realpathSync.native(directory)===directory,'linked fixture directory');
 for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
  const file=path.join(directory,entry.name),stat=fs.lstatSync(file);
  need(inside(root,file)&&!stat.isSymbolicLink()&&fs.realpathSync.native(file)===file,'linked or escaped fixture entry');
  if(stat.isDirectory())inspectTree(root,file);else need(stat.isFile()&&stat.nlink===1,'nonphysical or hard-linked fixture file');
 }
}
function closeOwned(root:string):void {
 if(!ownedRoots.has(root))return;
 assertOwned(root);inspectTree(root);
 fs.rmSync(root,{recursive:true,force:false});ownedRoots.delete(root);
}
function writeOwned(root:string,relative:string,bytes:Uint8Array):void {
 assertOwned(root);need(safeRelative(relative),'unsafe owned destination path');
 const target=path.resolve(root,...relative.split('/'));need(inside(root,target),'owned destination escaped root');
 let directory=root;
 for(const segment of path.relative(root,path.dirname(target)).split(path.sep).filter(Boolean)){
  directory=path.join(directory,segment);
  if(!fs.existsSync(directory))fs.mkdirSync(directory);
  const info=fs.lstatSync(directory);need(info.isDirectory()&&!info.isSymbolicLink()&&fs.realpathSync.native(directory)===directory,'unsafe owned destination ancestor');
 }
 need(!fs.existsSync(target),'fixture destination already exists: '+relative);
 fs.writeFileSync(target,bytes,{flag:'wx'});
 const actual=physicalFile(target);need(actual.length===bytes.length&&sha(actual)===sha(bytes),'fixture write readback differs: '+relative);
}
function copyTree(root:string,source:string,relative:string):void {
 const absolute=path.resolve(source),info=fs.lstatSync(absolute);
 need(info.isDirectory()&&!info.isSymbolicLink()&&fs.realpathSync.native(absolute)===absolute,'source tree must be physical: '+absolute);
 for(const entry of fs.readdirSync(absolute,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
  const file=path.join(absolute,entry.name),destination=relative+'/'+entry.name,stat=fs.lstatSync(file);
  need(!stat.isSymbolicLink(),'linked source entry: '+file);
  if(stat.isDirectory())copyTree(root,file,destination);else{need(stat.isFile(),'unsupported source entry: '+file);writeOwned(root,destination,physicalFile(file));}
 }
}
function parseStrict(bytes:Uint8Array,maxBytes=LEAF_MAX):unknown {
 const raw=Buffer.from(bytes);need(raw.length>0&&raw.length<=maxBytes,'JSON byte budget exceeded');
 const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw);
 need(Buffer.from(text,'utf8').equals(raw),'noncanonical UTF-8 bytes');
 return parseSnapshotJsonStrict(text,maxBytes);
}

interface BlobRef {role:'candidate2-source-capsule'|'candidate2-source-chunk';sha:string;rawBytes:number;codec:'deflate-raw/1';}
interface ChunkRef {ordinal:number;offset:number;byteLength:number;chunkSha256:string;blob:BlobRef;}
interface SourceAsset {id:string;scope:string;path:string;mediaType:string;byteLength:number;sha256:string;chunks:ChunkRef[];}
interface ConsumerManifest {schema:string;esbuildVersion:string;options:unknown;externalRuntimeModules:string[];inputs:{path:string;bytes:number;sha256:string}[];}
function assertReference(value:unknown,role:BlobRef['role']):asserts value is BlobRef {
 exact(value,['role','sha','rawBytes','codec'],'blob reference');
 need(value.role===role&&validHash(value.sha)&&Number.isSafeInteger(value.rawBytes)&&Number(value.rawBytes)>0&&Number(value.rawBytes)<=LEAF_MAX&&value.codec==='deflate-raw/1','invalid typed blob reference');
}
function readLeaf(database:Database,ref:BlobRef):{bytes:Buffer;value:unknown} {
 assertReference(ref,ref.role);
 const rows=database.exec('SELECT sha,raw_bytes,codec,payload FROM snapshot_blobs WHERE sha=?',[ref.sha]);
 need(rows.length===1&&rows[0].values.length===1&&rows[0].values[0].length===4,'expected exactly one native SQL leaf row');
 const [id,rawBytes,codec,payload]=rows[0].values[0];
 need(id===ref.sha&&rawBytes===ref.rawBytes&&codec===ref.codec&&payload instanceof Uint8Array,'native SQL leaf fields differ from typed reference');
 const inflated=inflateRawSync(Buffer.from(payload),{maxOutputLength:ref.rawBytes,info:true}) as unknown as {buffer:Buffer;engine:{bytesWritten:number}};
 need(inflated.engine.bytesWritten===payload.length,'deflate stream has unused or trailing compressed bytes');
 need(inflated.buffer.length===ref.rawBytes&&sha(inflated.buffer)===ref.sha,'inflated SQL leaf length/hash differs');
 return{bytes:inflated.buffer,value:parseStrict(inflated.buffer)};
}
function decodeAsset(database:Database,asset:SourceAsset,capsuleSha:string):Buffer {
 exact(asset,['id','scope','path','mediaType','byteLength','sha256','chunks'],'source asset');
 need(safeRelative(asset.path)&&validHash(asset.sha256)&&Number.isSafeInteger(asset.byteLength)&&asset.byteLength>=0&&asset.byteLength<=128*1024**2&&Array.isArray(asset.chunks)&&asset.chunks.length===Math.ceil(asset.byteLength/CHUNK_MAX),'source asset identity/length differs');
 const parts:Buffer[]=[];
 for(const [index,ref]of asset.chunks.entries()){
  exact(ref,['ordinal','offset','byteLength','chunkSha256','blob'],'asset chunk reference');
  need(ref.ordinal===index&&ref.offset===index*CHUNK_MAX&&ref.byteLength===Math.min(CHUNK_MAX,asset.byteLength-ref.offset)&&validHash(ref.chunkSha256),'chunk range/ordinal differs');
  assertReference(ref.blob,'candidate2-source-chunk');need(ref.blob.sha!==capsuleSha,'capsule chunk backreference');
  const decoded=readLeaf(database,ref.blob),chunk=decoded.value;
  exact(chunk,['schema','encoding','byteLength','sha256','data'],'source chunk');
  need(chunk.schema==='candidate2-naming-source-chunk/1'&&chunk.encoding==='base64'&&chunk.byteLength===ref.byteLength&&chunk.sha256===ref.chunkSha256&&typeof chunk.data==='string','source chunk type/identity differs');
  need(canonicalPlainJson(chunk)===decoded.bytes.toString('utf8'),'source chunk JSON is not canonical');
  const bytes=Buffer.from(chunk.data,'base64');
  need(bytes.length===ref.byteLength&&bytes.length<=CHUNK_MAX&&bytes.toString('base64')===chunk.data&&sha(bytes)===ref.chunkSha256,'source chunk base64/hash differs');
  parts.push(bytes);
 }
 const result=Buffer.concat(parts);need(result.length===asset.byteLength&&sha(result)===asset.sha256,'whole archived source identity differs');return result;
}

export interface M921GenerationFixture {
 root:string;applicationBundlePath:string;assetDir:string;dataDir:string;consumerPublicationDir:string;
 close():void;
}

/** Call explicitly from a test beforeAll. The fixed installed application is
 * deployed by the real helper; archived SQL contains source bytes only and is
 * never a location from which this fixture imports or executes code. */
export async function createM921GenerationFixture(sourceRoot=process.cwd()):Promise<M921GenerationFixture> {
 const source=fs.realpathSync.native(path.resolve(sourceRoot));
 const root=fs.realpathSync.native(fs.mkdtempSync(path.join(temporary,PREFIX)));ownedRoots.add(root);
 try{
  copyTree(root,path.join(source,'data'),'data');
  for(const publication of ['assets/bazi-root-feedback/1.3.2-r2','assets/project-naming-application/1.3.2-candidate.2'])copyTree(root,path.join(source,...publication.split('/')),publication);
  const pins='src/main/project-application-v132-r2-pins.json';writeOwned(root,pins,physicalFile(path.join(source,pins)));
  const deployment=await ensureCandidate2NamingDependency({root});
  need(deployment.output.bytes===APPLICATION_BYTES&&deployment.output.sha256===APPLICATION_SHA,'official application deployment differs from fixed 906 artifact');
  const deployed=physicalFile(deployment.bundlePath);need(deployed.length===APPLICATION_BYTES&&sha(deployed)===APPLICATION_SHA,'deployed application bytes differ');

  const manifestBytes=physicalFile(path.join(RUN_ROOT,'consumer-execution-manifest.json'));
  need(sha(manifestBytes)===MANIFEST_SHA,'fixed original consumer manifest differs');
  const manifest=parseStrict(manifestBytes) as ConsumerManifest;
  exact(manifest,['schema','esbuildVersion','options','externalRuntimeModules','inputs'],'consumer manifest');
  need(manifest.schema==='candidate2-consumer-execution-manifest/1'&&manifest.esbuildVersion==='0.25.12'&&Array.isArray(manifest.inputs)&&manifest.inputs.length===57,'fixed consumer manifest source set differs');
  need(sha(canonicalPlainJson(manifest))===MANIFEST_SHA,'fixed consumer manifest closure differs');
  const consumerBytes=physicalFile(path.join(EVIDENCE_ROOT,'compiled-r2','consumer.cjs'));
  need(consumerBytes.length===CONSUMER_BYTES&&sha(consumerBytes)===CONSUMER_SHA,'fixed compiled-r2 consumer bundle differs');

  const session=parseStrict(physicalFile(path.join(RUN_ROOT,'persisted-envelope.json')),16*1024**2) as {candidate2Naming:{sourceCapsule:BlobRef;sourceWitnessDigest:string}};
  const capsuleRef=session.candidate2Naming.sourceCapsule;assertReference(capsuleRef,'candidate2-source-capsule');
  const SQL=await initSqlJs({locateFile:()=>require.resolve('sql.js/dist/sql-wasm.wasm')});
  const database=new SQL.Database(physicalFile(path.join(RUN_ROOT,'source-blobs-managed.sqlite')));
  try{
   const decoded=readLeaf(database,capsuleRef),capsule=decoded.value;
   exact(capsule,['schema','replayPublicationId','consumerVersion','applicationTuple','applicationRuntime','consumerExecution','runtimeEnvironment','dataIdentity','sourceRecords','assets','witnessDigest'],'source capsule');
   need(capsule.schema==='candidate2-naming-source-capsule/1'&&capsule.replayPublicationId==='candidate2-session-replay/1'&&capsule.consumerVersion==='candidate2-naming-consumer/1.0.0','fixed SQL capsule type differs');
   const {witnessDigest,...body}=capsule;need(validHash(witnessDigest)&&sha(canonicalPlainJson(body))===witnessDigest&&witnessDigest===session.candidate2Naming.sourceWitnessDigest,'SQL capsule witness digest differs');
   const execution=capsule.consumerExecution;
   exact(execution,['publicationId','manifestSha256','fullClosureSha256','bundleSha256','bundleBytes'],'consumer execution identity');
   need(execution.publicationId==='candidate2-session-consumer-execution/1'&&execution.manifestSha256===MANIFEST_SHA&&execution.fullClosureSha256===MANIFEST_SHA&&execution.bundleSha256===CONSUMER_SHA&&execution.bundleBytes===CONSUMER_BYTES,'SQL capsule fixed consumer identity differs');
   need(Array.isArray(capsule.assets),'SQL capsule assets are missing');
   const assets=capsule.assets as SourceAsset[],byPath=new Map<string,SourceAsset>();
   for(const asset of assets){
    need(asset&&safeRelative(asset.path)&&typeof asset.scope==='string','SQL asset path differs');
    const key=(asset.scope+':'+asset.path).toLowerCase();need(!byPath.has(key),'SQL capsule asset path alias');byPath.set(key,asset);
   }
   const inputPaths=new Set<string>();
   for(const input of manifest.inputs){
    exact(input,['path','bytes','sha256'],'manifest source input');
    need(safeRelative(input.path)&&validHash(input.sha256)&&Number.isSafeInteger(input.bytes)&&input.bytes>=0&&!inputPaths.has(input.path.toLowerCase()),'manifest input path/hash/length differs');inputPaths.add(input.path.toLowerCase());
    const asset=byPath.get(('consumer-execution:'+input.path).toLowerCase());
    need(asset&&asset.scope==='consumer-execution'&&asset.path===input.path&&asset.byteLength===input.bytes&&asset.sha256===input.sha256,'manifest input is not bound to one archived source asset');
    const bytes=decodeAsset(database,asset,capsuleRef.sha);need(bytes.length===input.bytes&&sha(bytes)===input.sha256,'archived manifest source bytes differ');
    writeOwned(root,'consumer-publication/sources/'+input.path,bytes);
   }
  }finally{database.close();}
  // These two installed files are copied from measured M873 originals only;
  // SQL's archived consumer.cjs is never materialized as executable runtime.
  writeOwned(root,'consumer-publication/consumer.cjs',consumerBytes);
  writeOwned(root,'consumer-publication/consumer-execution-manifest.json',manifestBytes);
  inspectTree(root);
  return Object.freeze({root,applicationBundlePath:deployment.bundlePath,assetDir:path.join(root,'assets'),dataDir:path.join(root,'data'),consumerPublicationDir:path.join(root,'consumer-publication'),close:()=>closeOwned(root)});
 }catch(error){try{closeOwned(root);}catch(cleanup){throw new AggregateError([error,cleanup],'M921 fixture setup and owned cleanup failed');}throw error;}
}
