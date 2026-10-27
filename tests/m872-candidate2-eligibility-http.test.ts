import {afterAll,beforeAll,describe,expect,it,vi} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createServer,type Server} from 'node:http';
import initSqlJs from 'sql.js';
import {studioDevPlugin} from '../scripts/dev-plugin';
import {ensureCandidate2NamingDependency} from '../scripts/build-candidate2-naming-dependency-v1.mjs';
import {Store} from '../src/main/store';
import * as realDomain from '../src/domain/candidate2-naming-consumer-v1';
import * as realFinalizer from '../src/main/naming-meaning-review';
import {CANDIDATE2_NAMING_SELECTION} from '../src/shared/candidate2-naming-consumer-v1';
import {canonicalPlainJson} from '../src/shared/plain-json';
import {normalizePreferences} from '../src/shared/workflow';
import {createCmnPreviewProject,cmnBuildFileSnapshot} from './helpers/cmn-preview-project';
import {previewSourceSnapshot} from './helpers/root-feedback-preview-byte-snapshot';
import fixture from './fixtures/project-naming-use-m153.json';
import type {BirthProfile} from '../src/shared/types';

const sourceRoot=path.resolve('.'),temporary=fs.realpathSync.native(os.tmpdir());
const scratch=fs.realpathSync.native(fs.mkdtempSync(path.join(temporary,'m872-candidate2-http-')));
const method='checkCandidate2NamingEligibility';
const profile=structuredClone(fixture.positive.profile) as BirthProfile;
const preferences=normalizePreferences({length:1,requiredChars:'沐',zodiacRules:false,numerology:false});
const selection=CANDIDATE2_NAMING_SELECTION;
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
const hash=(value:Uint8Array)=>createHash('sha256').update(value).digest('hex');
const digest=(value:unknown)=>createHash('sha256').update(canonicalPlainJson(value)).digest('hex');
type HttpContext={server:Server;address:string;store:Store;userDir:string;closed:boolean;pending:Set<Promise<Response>>;closing?:Promise<void>};
let project:ReturnType<typeof createCmnPreviewProject>;
let main:HttpContext;
const observeStoreInit=()=>vi.spyOn(Store.prototype,'init');
const observeDomain=()=>vi.spyOn(realDomain,'generateCandidate2DomainV1');
const observeFinalizer=()=>vi.spyOn(realFinalizer,'finalizeNamingCandidateForRuleVersion');
let initSpy:ReturnType<typeof observeStoreInit>;
let domainSpy:ReturnType<typeof observeDomain>;
let finalizerSpy:ReturnType<typeof observeFinalizer>;
let sourceBaseline:ReturnType<typeof previewSourceSnapshot>;
const contexts:HttpContext[]=[];
const observations:unknown[]=[];

function assertOwnedRoot(directory:string,prefix:string){
 const actual=path.resolve(directory),info=fs.lstatSync(actual);
 if(path.dirname(actual)!==temporary||!path.basename(actual).startsWith(prefix)||info.isSymbolicLink()||!info.isDirectory()||fs.realpathSync.native(actual)!==actual)throw Error('M872 unsafe owned absolute temporary root');
 return actual;
}
function bundleFile(){return path.join(project.root,'dist-electron/project-naming-application/1.3.2-candidate.2/application.cjs');}
function post(context:HttpContext,name:string,args:unknown[]){
 const pending=(async()=>{
  const response=await fetch(context.address+'/__studio_api/'+name,{method:'POST',headers:{'Content-Type':'application/json','X-Studio-Local-Request':'1','Connection':'close'},body:JSON.stringify(args)});
  // Keep teardown behind the complete actual HTTP response, including its
  // body, rather than only the arrival of response headers.
  await response.clone().arrayBuffer();return response;
 })();
 context.pending.add(pending);
 void pending.then(()=>context.pending.delete(pending),()=>context.pending.delete(pending));
 return pending;
}
function sourceInventory(){return previewSourceSnapshot(project.root);}
function customerState(context:HttpContext){
 const disk=fs.readFileSync(path.join(context.userDir,'customers.sqlite'));
 const tableNames=(context.store.db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")[0]?.values??[]).map(row=>String(row[0]));
 const tables=tableNames.map(name=>({name,result:context.store.db.exec('SELECT * FROM "'+name.replaceAll('"','""')+'"')}));
 const sql=JSON.stringify(tables,(_key,value)=>value instanceof Uint8Array?{bytes:Array.from(value)}:value);
 return{disk,sql,datasetVersion:context.store.dataset.version,userVersion:context.store.db.exec('PRAGMA user_version'),schemaVersion:context.store.db.exec('PRAGMA schema_version')};
}
function assertNoNaming(){expect(domainSpy).not.toHaveBeenCalled();expect(finalizerSpy).not.toHaveBeenCalled();}
function assertDiagnostic(value:any){
 expect(value).toMatchObject({schema:'candidate2-naming-eligibility/1',generationAuthority:false,candidateAvailability:'not-evaluated',traditionalStatus:'unknown'});
 expect(value).not.toHaveProperty('certificate');expect(value).not.toHaveProperty('namingInput');expect(value).not.toHaveProperty('candidates');
 for(const reason of value.reasons){expect(typeof reason.code).toBe('string');expect(reason.message).toMatch(/[\u3400-\u9fff]/u);}
}
async function checkedPost(context:HttpContext,label:string,args:unknown[],status=200){
 const customers=customerState(context),sources=sourceInventory(),build=cmnBuildFileSnapshot(project.root);
 const response=await post(context,method,args),value=await response.json();
 expect(response.status,label).toBe(status);
 expect(customerState(context),label+' customer SQLite/versions/history preservation').toEqual(customers);
 expect(sourceInventory(),label+' source/publication/data input preservation').toEqual(sources);
 expect(cmnBuildFileSnapshot(project.root),label+' HTTP must not build dependency artifacts').toEqual(build);
 assertNoNaming();
 observations.push({label,httpStatus:response.status,status:value.status??'http-error',reasonCodes:value.reasons?.map((reason:any)=>reason.code)??[],binding:value.binding??null,customerDatabaseSha256:hash(customers.disk),allCustomerTablesPreserved:true,sourceInputCount:sources.length,sourceInputsPreserved:true,buildArtifactsPreserved:true,domainCalls:domainSpy.mock.calls.length,finalizerCalls:finalizerSpy.mock.calls.length});
 return value;
}
async function startHttp(label:string):Promise<HttpContext>{
 const userDir=path.join(scratch,label);vi.stubEnv('NAMING_STUDIO_PREVIEW_DATA',userDir);
 let middleware:Function|undefined;
 const server=createServer((req,res)=>void middleware!(req,res,()=>{res.statusCode=404;res.end();}));
 const context:HttpContext={server,address:'',store:undefined as unknown as Store,userDir,closed:false,pending:new Set()};contexts.push(context);
 const plugin=studioDevPlugin();
 await(plugin.configureServer as Function)({config:{root:project.root},httpServer:server,middlewares:{use(handler:Function){middleware=handler;}}});
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 context.address='http://127.0.0.1:'+(server.address() as {port:number}).port;
 const callsBefore=initSpy.mock.calls.length,response=await post(context,'bootstrap',[]);
 expect(response.status).toBe(200);await response.json();
 expect(initSpy.mock.calls.length).toBe(callsBefore+1);
 context.store=initSpy.mock.contexts[callsBefore] as Store;
 expect(context.store).toBeInstanceOf(Store);expect(context.store.userDir).toBe(userDir);
 expect(fs.existsSync(path.join(userDir,'customers.sqlite'))).toBe(true);
 // Initialization is complete here. All later HTTP invariants use this real
 // initialized Store, never the creation write as a false read-only failure.
 return context;
}
async function closeHttp(context:HttpContext){
 if(context.closing)return context.closing;
 context.closing=(async()=>{
  await Promise.allSettled([...context.pending]);
  if(context.server.listening)await new Promise<void>((resolve,reject)=>{
   context.server.close(error=>error?reject(error):resolve());
   context.server.closeIdleConnections();
  });
  await new Promise(resolve=>setImmediate(resolve));
  context.store?.db?.close();context.closed=true;
 })();
 return context.closing;
}

beforeAll(async()=>{
 project=createCmnPreviewProject();assertOwnedRoot(project.root,'cmn-preview-project-');assertOwnedRoot(scratch,'m872-candidate2-http-');
 for(const relative of ['assets/bazi-root-feedback/1.3.2-r2','assets/project-naming-application/1.3.2-candidate.2']){
  fs.mkdirSync(path.dirname(path.join(project.root,relative)),{recursive:true});
  fs.cpSync(path.join(sourceRoot,relative),path.join(project.root,relative),{recursive:true});
 }
 const pin='src/main/project-application-v132-r2-pins.json';fs.mkdirSync(path.dirname(path.join(project.root,pin)),{recursive:true});fs.copyFileSync(path.join(sourceRoot,pin),path.join(project.root,pin));
 const deployed=await ensureCandidate2NamingDependency({root:project.root});
 expect(deployed.status).toBe('built');expect(deployed.output).toEqual({file:'application.cjs',bytes:2002922,sha256:'906b191c88ce2e6f0335c674727c39bcae14edf2968d2c1c5cdffcb04079b47a'});
 // These are call-through observers. No generator, finalizer, Store, Service
 // or runtime implementation is replaced with a test implementation.
 initSpy=observeStoreInit();
 domainSpy=observeDomain();
 finalizerSpy=observeFinalizer();
 main=await startHttp('main-user');sourceBaseline=sourceInventory();assertNoNaming();
 observations.push({label:'explicit owned test deployment',status:deployed.status,output:deployed.output,productionAdmission:false,serviceInitializationComplete:true});
},60000);

afterAll(async()=>{
 try{
  await Promise.allSettled(contexts.flatMap(context=>[...context.pending]));
  if(sourceBaseline)expect(sourceInventory()).toEqual(sourceBaseline);
  if(typeof domainSpy!=='undefined'&&typeof finalizerSpy!=='undefined')assertNoNaming();
  const directory=process.env.M872_EVIDENCE_DIR;
  if(directory){const target=path.join(path.resolve(directory),'m872-candidate2-http-summary.json');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target+'.tmp',JSON.stringify({observations,noGenerateSaveOrScoring:true,domainCalls:domainSpy?.mock.calls.length??0,finalizerCalls:finalizerSpy?.mock.calls.length??0},null,2)+'\n');fs.renameSync(target+'.tmp',target);}
 }finally{
  for(const context of contexts)await closeHttp(context);
  initSpy?.mockRestore();domainSpy?.mockRestore();finalizerSpy?.mockRestore();vi.unstubAllEnvs();
  if(project){assertOwnedRoot(project.root,'cmn-preview-project-');project.close();}
  assertOwnedRoot(scratch,'m872-candidate2-http-');fs.rmSync(scratch,{recursive:true,force:true});
 }
},60000);

describe('M872 real HTTP candidate.2 eligibility Service wiring',{timeout:30000},()=>{
 it('serves the true M153 positive through the allowlist and lazy host without generating or writing SQL',async()=>{
  const raw=clone({profile,preferences,selection});
  const value=await checkedPost(main,'real positive',[profile,preferences,selection]);assertDiagnostic(value);
  expect(value.status).toBe('eligible');expect(value.application.elements.primary).toEqual(['土']);expect(value.application.elements.secondary).toEqual(['金']);
  expect(value.dataIdentity.namingRulesVersion).toBe('naming-editorial-7.1.0');
  expect(value.dataIdentity.activeVersion).toBe(main.store.dataset.version);
  expect(value.dataIdentity.packSha256).toBe(hash(main.store.currentPackBytes()));
  expect(value.binding.request).toEqual({...raw,selectionWasProvided:true});expect(value.binding.requestDigest).toBe(digest(value.binding.request));
  expect({profile,preferences,selection}).toEqual(raw);
 });

 it.each([
  {label:'real 2022-02-14 blocked',profile:{...profile,id:'m872-blocked-0214',birthDate:'2022-02-14',birthTime:'11:30'},reason:'consumer-pending'},
  {label:'unknown hour retains original recorded text',profile:{...profile,id:'m872-unknown',timeUnknown:true},reason:'unknown-birth-time'},
 ])('returns typed blocked for $label and preserves the raw request',async({label,profile:birth,reason})=>{
  const value=await checkedPost(main,label,[birth,preferences,selection]);assertDiagnostic(value);
  expect(value.status).toBe('blocked');expect(value.reasons.length).toBeGreaterThan(0);expect(value.application).toBeNull();
  expect(value.reasons.map((item:any)=>item.code)).toContain(reason);
  expect(value.binding.request.profile).toEqual(birth);expect(value.binding.requestDigest).toBe(digest(value.binding.request));
 });

 it('distinguishes omitted selection from explicit null in the owned raw binding',async()=>{
  const omitted=await checkedPost(main,'selection omitted',[profile,preferences]);assertDiagnostic(omitted);
  expect(omitted.status).toBe('disabled');expect(omitted.binding.request).toEqual({profile,preferences,selection:null,selectionWasProvided:false});
  const explicit=await checkedPost(main,'selection explicit null',[profile,preferences,null]);assertDiagnostic(explicit);
  expect(explicit.status).toBe('blocked');expect(explicit.binding.request).toEqual({profile,preferences,selection:null,selectionWasProvided:true});
  expect(explicit.binding.requestDigest).not.toBe(omitted.binding.requestDigest);
  const off=await checkedPost(main,'selection explicit off',[profile,preferences,{enabled:false}]);assertDiagnostic(off);
  expect(off.status).toBe('disabled');expect(off.binding.request).toEqual({profile,preferences,selection:{enabled:false},selectionWasProvided:true});
  expect(off.binding.requestDigest).not.toBe(omitted.binding.requestDigest);
 });

 it('binds whitespace and unknown fields before validation without returning a normalized replacement',async()=>{
  const whitespace={...profile,id:'',surname:' 林 ',fatherName:' 林泽 ',motherName:' 陈宁 ',birthPlace:''};
  const value=await checkedPost(main,'raw blank identity and whitespace',[whitespace,preferences,selection]);assertDiagnostic(value);
  expect(value.binding.request.profile).toEqual(whitespace);expect(value.binding.request.profile.id).toBe('');
  expect(value.binding.request.profile.surname).toBe(' 林 ');expect(value.binding.requestDigest).toBe(digest(value.binding.request));
  expect(value.status).toBe('blocked');
  const unknown={...profile,m872Unknown:{mustRemain:'raw'}};
  const rejected=await checkedPost(main,'raw unknown profile field',[unknown,preferences,selection]);assertDiagnostic(rejected);
  expect(rejected.status).toBe('blocked');expect(rejected.binding.request.profile).toEqual(unknown);
  expect(rejected.binding.requestDigest).toBe(digest(rejected.binding.request));
 });

 it('rejects a fourth caller runtime argument at HTTP 400 instead of accepting an authority DTO',async()=>{
  const value=await checkedPost(main,'forbidden fourth runtime',[profile,preferences,selection,{runtime:{claimed:true},applicationBundlePath:'caller.cjs'}],400);
  expect(typeof value.error).toBe('string');expect(value.error.length).toBeGreaterThan(0);
 });

 it('keeps default off disabled when CJS is absent and never auto-builds on the selected unavailable path',async()=>{
  const bundle=bundleFile(),receipt=bundle+'.receipt.json',held=path.join(scratch,'held-application.cjs'),heldReceipt=held+'.receipt.json';
  const bundleBytes=fs.readFileSync(bundle),receiptBytes=fs.readFileSync(receipt);
  let missing:HttpContext|undefined,bundleHeld=false,receiptHeld=false;
  try{
   fs.renameSync(bundle,held);bundleHeld=true;fs.renameSync(receipt,heldReceipt);receiptHeld=true;
   const warmed=await checkedPost(main,'already warm Service CJS missing',[profile,preferences,selection]);assertDiagnostic(warmed);
   expect(warmed.status).toBe('unavailable');expect(warmed.application).toBeNull();
   // A fresh real Service is intentional: the earlier positive host already
   // owns its runtime instance. This checks missing-file lazy initialization.
   missing=await startHttp('missing-runtime-user');
   const off=await checkedPost(missing,'missing CJS default off',[profile,preferences]);assertDiagnostic(off);expect(off.status).toBe('disabled');
   expect(fs.existsSync(bundle)).toBe(false);expect(fs.existsSync(receipt)).toBe(false);
   const unavailable=await checkedPost(missing,'missing CJS explicit selection',[profile,preferences,selection]);assertDiagnostic(unavailable);
   expect(unavailable.status).toBe('unavailable');expect(unavailable.application).toBeNull();expect(unavailable.reasons.length).toBeGreaterThan(0);
   expect(fs.existsSync(bundle)).toBe(false);expect(fs.existsSync(receipt)).toBe(false);
  }finally{
   try{if(missing)await closeHttp(missing);}finally{
    try{if(bundleHeld)fs.renameSync(held,bundle);}finally{if(receiptHeld)fs.renameSync(heldReceipt,receipt);}
   }
  }
  expect(fs.readFileSync(bundle)).toEqual(bundleBytes);expect(fs.readFileSync(receipt)).toEqual(receiptBytes);
 });

 it('reauthenticates declared resource bytes after successful HTTP eligibility and reports unavailable',async()=>{
  const publication=path.join(project.root,'assets/project-naming-application/1.3.2-candidate.2');
  const manifest=JSON.parse(fs.readFileSync(path.join(publication,'resource-manifest.json'),'utf8')) as {files:{path:string;kind:string}[]};
  const row=manifest.files.find(item=>item.kind==='runtime-source');if(!row)throw Error('M872 fixed declared runtime source missing');
  const file=path.join(publication,...row.path.split('/')),original=fs.readFileSync(file),changed=Buffer.from(original);changed[0]^=1;
  try{
   fs.writeFileSync(file,changed);const value=await checkedPost(main,'warm resource byte mismatch',[profile,preferences,selection]);assertDiagnostic(value);
   expect(value.status).toBe('unavailable');expect(value.application).toBeNull();expect(value.dataIdentity).toBeNull();
   expect(fs.readFileSync(file)).toEqual(changed);
  }finally{fs.writeFileSync(file,original);}
  const restored=await checkedPost(main,'resource restored',[profile,preferences,selection]);expect(restored.status).toBe('eligible');
 });

 it('checks the real installed active pack version rather than silently using builtin 7.1 data',async()=>{
  const original=main.store.currentPackBytes();
  const SQL=await initSqlJs({locateFile:()=>path.join(project.root,'node_modules/sql.js/dist/sql-wasm.wasm')});
  const database=new SQL.Database(new Uint8Array(original));let changed:Uint8Array;
  try{database.run('PRAGMA user_version=872');changed=database.export();}finally{database.close();}
  expect(hash(changed!)).not.toBe(hash(original));
  main.store.installPack(changed!);
  try{
   const version=hash(changed!).slice(0,12);expect(main.store.dataset.version).toBe(version);
   const value=await checkedPost(main,'actual active pack override hash/version',[profile,preferences,selection]);assertDiagnostic(value);
   expect(value.status).toBe('unavailable');expect(value.application).toBeNull();expect(value.dataIdentity).toBeNull();
   expect(value.reasons.map((item:any)=>item.code)).toContain('active-naming-data-unavailable');
   expect(main.store.dataset.version).toBe(version);expect(hash(main.store.currentPackBytes())).toBe(hash(changed!));
  }finally{main.store.installPack(original);}
  const restored=await checkedPost(main,'active fixed pack restored',[profile,preferences,selection]);expect(restored.status).toBe('eligible');
 });

 it('reports a physical override that disagrees with the loaded active pack as unavailable',async()=>{
  const file=path.join(main.userDir,'knowledge.sqlite'),existed=fs.existsSync(file),previous=existed?fs.readFileSync(file):undefined;
  const physical=Buffer.from(main.store.currentPackBytes());physical[0]^=1;
  try{
   fs.writeFileSync(file,physical);
   const value=await checkedPost(main,'disk override differs from loaded pack',[profile,preferences,selection]);assertDiagnostic(value);
   expect(value.status).toBe('unavailable');expect(value.application).toBeNull();expect(value.dataIdentity).toBeNull();
   expect(fs.readFileSync(file)).toEqual(physical);
  }finally{if(previous)fs.writeFileSync(file,previous);else if(!existed)fs.unlinkSync(file);}
  expect((await checkedPost(main,'physical override restored',[profile,preferences,selection])).status).toBe('eligible');
 });
});
