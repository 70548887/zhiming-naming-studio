/** Genuine Store fixture only. No operation/capsule/authority is constructed.
 * Each test module receives a fresh native temporary copy of the source data. */
import fs from 'node:fs';
import {createRequire,syncBuiltinESMExports} from 'node:module';
import {resolve,join,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID,webcrypto} from 'node:crypto';
import {afterAll} from 'vitest';
import {actualFile,createOwnedCorpus,type OwnedCorpus} from './m458-owned-corpus';
import {Store} from '../../src/main/store';
import {StudioService} from '../../src/main/service';
import {decodeCustomerBackup} from '../../src/main/customer-backup-envelope';
import {normalizePreferences} from '../../src/shared/workflow';
import {NAMING_RULE_V71_VERSION} from '../../src/shared/naming-rules';
import {saveIndependentV7} from './m458-v7-seed';
import {hasProjectNamingUseFootprint} from '../../src/main/verify-project-naming-use';
import {hasMeaningContextReview} from '../../src/main/meaning-context-review';
import type {BirthProfile,NamingSession,SessionRevision} from '../../src/shared/types';

const call=Function.prototype.call,apply=Function.prototype.apply,bind=Function.prototype.bind;
const invoke=bind.call(call,apply) as unknown as (fn:Function,receiver:unknown,args:unknown[])=>unknown;
const originalFs={
  read:fs.readFileSync,write:fs.writeFileSync,rename:fs.renameSync,
  unlink:fs.unlinkSync,copy:fs.copyFileSync,
};
let corpus:OwnedCorpus|undefined,preparing=false,fixtureFailed=false,activeCases=0;
const sourceDirectory=()=>process.env.M458_TEST_DATA_DIR?requiredAbsolute('M458_TEST_DATA_DIR'):fileURLToPath(new URL('../../data',import.meta.url));
const wasmPath=()=>actualFile(process.env.M458_SQL_WASM?requiredAbsolute('M458_SQL_WASM'):createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm'));
function ownedCorpus():OwnedCorpus {
  return corpus??=createOwnedCorpus(sourceDirectory(),process.env.M458_TEST_OWNED_ROOT?requiredAbsolute('M458_TEST_OWNED_ROOT'):undefined);
}
interface FixtureTaskResult {result?:{state?:string};tasks?:FixtureTaskResult[];}
function failedSuite(task:FixtureTaskResult):boolean {
  return task.result?.state==='fail'||!!task.tasks?.some(failedSuite);
}
afterAll(({},suite)=>{
  if(!corpus)return;
  if(preparing||activeCases||fixtureFailed||failedSuite(suite)){console.error('M458_PARTIAL_OR_FAILED_FIXTURE_RETAINED',corpus.root);return;}
  corpus.close();
});
let seedBytes:Buffer|undefined,seedCurrent:NamingSession|undefined,seedLegacy:NamingSession|undefined,seedHistory:SessionRevision[]|undefined;
export function requiredAbsolute(name:string):string {
  const value=process.env[name];
  if(!value||!isAbsolute(value))throw new Error(name+' must be an absolute path');
  return resolve(value);
}
export function ownedRoot():string {
  return ownedCorpus().root;
}
export function dataDir():string {
  return ownedCorpus().dataDir;
}
export function ownedFile(file:string):string {
  return ownedCorpus().file(file);
}
export function sourceFile(name:string):string {return ownedFile(join(dataDir(),name));}
export function bytes(file:string):Buffer {return Buffer.from(invoke(originalFs.read,fs,[ownedFile(file)]) as Buffer);}
export function replaceOwned(file:string,value:Uint8Array):void {
  const target=ownedFile(file),temporary=ownedFile(target+'.m458-'+randomUUID()+'.tmp');
  try{invoke(originalFs.write,fs,[temporary,value]);invoke(originalFs.rename,fs,[temporary,target]);}
  finally{if(fs.existsSync(temporary))invoke(originalFs.unlink,fs,[temporary]);}
}
export function deleteOwned(file:string):void {invoke(originalFs.unlink,fs,[ownedFile(file)]);}
export function differentBytes(original:Buffer):Buffer {
  if(!original.length)throw new Error('M458 source fixture is empty');
  const changed=Buffer.from(original);changed[changed.length-1]^=1;return changed;
}
export function captured<T>(read:()=>T):{value?:T;error?:unknown} {
  try{return{value:read()};}catch(error){return{error};}
}
function pathValue(value:unknown):string|undefined {
  if(typeof value==='string')return resolve(value);
  if(value instanceof URL)return value.protocol==='file:'?resolve(fileURLToPath(value)):undefined;
  return undefined;
}
export interface FsObservation {
  beforeRead?:(file:string,occurrence:number)=>void;
  afterRead?:(file:string,value:unknown,occurrence:number)=>void;
  afterCopy?:(from:string,to:string)=>void;
  afterRename?:(from:string,to:string)=>void;
  afterUnlink?:(file:string)=>void;
}
export function withNativeFs<T>(hooks:FsObservation,body:()=>T):T {
  const saved=new Map<string,PropertyDescriptor>(),counts=new Map<string,number>();
  const install=(name:string,replacement:Function)=>{
    const descriptor=Object.getOwnPropertyDescriptor(fs,name);
    if(!descriptor||!('value'in descriptor))throw new Error('M458 needs an own data FS slot '+name);
    saved.set(name,descriptor);Object.defineProperty(fs,name,{...descriptor,value:replacement});
  };
  try{
    if(hooks.beforeRead||hooks.afterRead)install('readFileSync',function(this:unknown,...args:unknown[]){
      const file=pathValue(args[0]),occurrence=file?(counts.get(file)??0)+1:0;
      if(file){counts.set(file,occurrence);hooks.beforeRead?.(file,occurrence);}
      const value=invoke(saved.get('readFileSync')!.value as Function,this,args);
      if(file)hooks.afterRead?.(file,value,occurrence);
      return value;
    });
    if(hooks.afterCopy)install('copyFileSync',function(this:unknown,...args:unknown[]){
      const result=invoke(saved.get('copyFileSync')!.value as Function,this,args),from=pathValue(args[0]),to=pathValue(args[1]);
      if(from&&to)hooks.afterCopy?.(from,to);return result;
    });
    if(hooks.afterRename)install('renameSync',function(this:unknown,...args:unknown[]){
      const result=invoke(saved.get('renameSync')!.value as Function,this,args),from=pathValue(args[0]),to=pathValue(args[1]);
      if(from&&to)hooks.afterRename?.(from,to);return result;
    });
    if(hooks.afterUnlink)install('unlinkSync',function(this:unknown,...args:unknown[]){
      const result=invoke(saved.get('unlinkSync')!.value as Function,this,args),file=pathValue(args[0]);
      if(file)hooks.afterUnlink?.(file);return result;
    });
    syncBuiltinESMExports();
    return body();
  }finally{
    for(const [name,descriptor]of saved)Object.defineProperty(fs,name,descriptor);
    syncBuiltinESMExports();
  }
}
export function traceReads<T>(body:()=>T):{value:T;paths:string[]} {
  const paths:string[]=[];
  const value=withNativeFs({afterRead:file=>{paths.push(file);}},body);
  return{value,paths};
}
/** Warm ordinary package caches only; every call remains a new public operation.
 * The two observed traces must stabilize; their ordinals prove no private phase. */
export function stableTraceReads<T>(body:()=>T):{value:T;paths:string[]} {
  body();
  const first=traceReads(body),second=traceReads(body);
  if(first.paths.length!==second.paths.length)throw new Error('M458 source trace did not stabilize after ordinary API warmup');
  for(let index=0;index<first.paths.length;index++)if(first.paths[index].toLowerCase()!==second.paths[index].toLowerCase())throw new Error('M458 source trace order did not stabilize after ordinary API warmup');
  return second;
}
export function readsOf(paths:string[],file:string):number {
  const target=resolve(file).toLowerCase();return paths.filter(path=>path.toLowerCase()===target).length;
}
export interface GenuineFixture {store:Store;service:StudioService;userDir:string;current:NamingSession;legacy:NamingSession;history:SessionRevision[];}
async function close(store:Store,service:StudioService):Promise<void> {
  try{await service.closeCmnReadingWorker();}finally{store.db.close();}
}
async function create():Promise<{store:Store;service:StudioService;userDir:string}> {
  const userDir=fs.mkdtempSync(join(ownedRoot(),'store-')),wasm=wasmPath();
  const store=new Store(userDir,dataDir(),wasm);
  try{await store.init();return{store,service:new StudioService(store,{read:()=>'',write:()=>{}},false),userDir};}
  catch(error){try{store.db?.close();}catch{}throw error;}
}
export async function prepareGenuineSeed():Promise<void> {
  preparing=true;
  try{await prepareSeed();}catch(error){fixtureFailed=true;throw error;}finally{preparing=false;}
}
async function prepareSeed():Promise<void> {
  if(globalThis.crypto!==webcrypto)throw new Error('M458 requires the root ordinary platform crypto binding');
  const context=await create();
  try{
    context.store.put('settings','main',{...context.store.settings(),useAi:false});
    const profile:BirthProfile={
      id:randomUUID(),customerName:'M458 真实operation边界',surname:'林',surnamePinyin:'lín',
      fatherName:'',motherName:'',gender:'中性',calendar:'solar',birthDate:'2026-10-17',leapMonth:false,
      birthTime:'09:30',timeUnknown:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'',
      renMethod:'none',timeBasis:'civil',monthAuthorityMethod:'no-fixed-day/1.0.0',seasonalMethod:'no-monthly/1.0.0',
    };
    const preferences=normalizePreferences({length:2,requiredChars:'安宁',preferredElements:['水'],numerology:false,zodiacRules:false});
    const generated=(await context.service.generate(profile,preferences)).session;
    const current=context.store.readVerifiedSession(generated.id);
    if(!current||current.namingRules?.version!==NAMING_RULE_V71_VERSION||!current.candidates.length||!['verified-builtin','verified-archive'].includes(current.factVerification?.status??''))throw new Error('M458 seed must be an actual current-version generated and SQL-verified row');
    const independent=saveIndependentV7(context.store,current.profile);
    const reviewed=context.service.saveSession({...structuredClone(independent),reviewNote:'M458 seed reviewed V7'});
    const legacy=context.store.readVerifiedSession(reviewed.id);
    if(!legacy)throw new Error('M458 reviewed V7 row is missing');
    for(const value of [current,legacy])if(hasProjectNamingUseFootprint(value)||hasMeaningContextReview(value)||value.candidates.some(candidate=>Object.hasOwn(candidate,'modernPracticalEvidence')))throw new Error('M458 base fixture must not acquire project, modern or meaning-context authority');
    const history=context.store.listRevisions(legacy.id);
    if(history.length!==1||history[0].session.namingRules?.version!=='naming-editorial-7.0.0')throw new Error('M458 seed needs exactly one genuine V7 review history');
    if(context.store.listRevisions(current.id).length!==0)throw new Error('M458 V71 seed must remain without a review history');
    seedCurrent=structuredClone(current);seedHistory=structuredClone(history);seedLegacy=structuredClone(legacy);
    seedBytes=Buffer.from(context.store.backupBytes());
  }finally{
    await close(context.store,context.service);
    // Only file teardown knows whether Vitest timed out while genuine setup
    // completed. Retain its actual SQL bytes until that outcome is known.
  }
}
export async function withFixture<T>(body:(fixture:GenuineFixture)=>T|Promise<T>):Promise<T> {
  if(!seedBytes||!seedCurrent||!seedLegacy||!seedHistory)throw new Error('M458 genuine seed has not been prepared');
  const userDir=fs.mkdtempSync(join(ownedRoot(),'case-'));
  invoke(originalFs.write,fs,[join(userDir,'customers.sqlite'),decodeCustomerBackup(seedBytes).sqlite]);
  const store=new Store(userDir,dataDir(),wasmPath());
  let service:StudioService|undefined,complete=false;
  activeCases++;
  try{
    await store.init();service=new StudioService(store,{read:()=>'',write:()=>{}},false);
    const result=await body({store,service,userDir,current:structuredClone(seedCurrent),legacy:structuredClone(seedLegacy),history:structuredClone(seedHistory)});
    complete=true;return result;
  }catch(error){fixtureFailed=true;throw error;
  }finally{
    try{try{if(service)await service.closeCmnReadingWorker();}finally{store.db?.close();}}
    catch(error){fixtureFailed=true;throw error;}finally{activeCases--;}
    // Failed owned DBs remain for the root's evidence; successful cases clean only their exact directory.
    if(complete)fs.rmSync(userDir,{recursive:true,force:true});
  }
}
export function genuineSeedBytes():Buffer {
  if(!seedBytes)throw new Error('M458 genuine seed unavailable');return Buffer.from(seedBytes);
}
