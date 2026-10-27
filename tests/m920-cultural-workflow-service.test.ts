import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {existsSync,lstatSync,mkdirSync,mkdtempSync,readFileSync,readdirSync,realpathSync,renameSync,rmSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {basename,dirname,join,resolve} from 'node:path';
import {Store} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {normalizePreferences} from '../src/shared/workflow';
import {performance} from 'node:perf_hooks';
import type {BirthProfile,NamingSession} from '../src/shared/types';
import type {CulturalAnchorRequest,CulturalProviderAnchor,CulturalProviderOptions,CulturalProviderPreview,CulturalProviderPreviewRequest,CulturalProviderReply} from '../src/shared/qimen-cultural-provider-v1';
import type {CommitCulturalWriteRequest,CulturalSaveRequest,CulturalSaveResult,PreparedCulturalWrite} from '../src/shared/cultural-storage-v3';

const workspace=realpathSync.native(resolve('.'));
const dataDir=join(workspace,'data'),wasm=createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm');
const evidenceRoot=join(workspace,'.local','m920-service-tests'),fixturePrefix='m920-real-store-';
const owned=new Map<string,string>(),contexts:Context[]=[],observations:Record<string,unknown>[]=[];
const publicCalls:Array<{method:string;directory:string;arity:number;startedAt:string;milliseconds:number;status:string;error?:string}>=[];
let workflowStarted=0;
const profile:BirthProfile={id:'m920-service-family',customerName:'M920真实服务文化流程',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2026-10-17',birthTime:'09:30',timeUnknown:false,leapMonth:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'合成测试资料'};
const unknownProfile:BirthProfile={...profile,id:'m920-service-unknown-hour',customerName:'M920未知时辰',birthTime:'',timeUnknown:true};
const otherProfile:BirthProfile={...profile,id:'m920-service-other-owner',customerName:'M920另一归属'};
type Context={store:Store;service:StudioService;directory:string;closed:boolean};
type Saved=Exclude<CulturalSaveResult,{status:'conflict'}>;
let context:Context,session:NamingSession,created:Saved,initialTicket:PreparedCulturalWrite,initialRequest:CulturalSaveRequest;
let baselineNamingRows:ReturnType<typeof namingRows>,firstRead:ReturnType<StudioService['readCulturalComparison']>;

function hash(bytes:Uint8Array){return createHash('sha256').update(bytes).digest('hex');}
function checkedDirectory(directory:string){
  let current=resolve(directory);
  for(;;){
    const stat=lstatSync(current);
    if(stat.isSymbolicLink()||!stat.isDirectory()||realpathSync.native(current)!==current)throw Error('Unsafe M920 directory identity: '+current);
    const parent=dirname(current);if(parent===current)return directory;current=parent;
  }
}
function ensureEvidenceRoot(){
  checkedDirectory(workspace);
  for(const directory of [join(workspace,'.local'),evidenceRoot]){if(!existsSync(directory))mkdirSync(directory);checkedDirectory(directory);}
}
function directory(){
  ensureEvidenceRoot();const value=realpathSync.native(mkdtempSync(join(evidenceRoot,fixturePrefix)));
  checkedDirectory(value);owned.set(value,evidenceRoot);return value;
}
async function open():Promise<Context>{
  const userDir=directory(),store=new Store(userDir,dataDir,wasm);
  const value={store,service:undefined as unknown as StudioService,directory:userDir,closed:false};contexts.push(value);
  await store.init();const actualService=new StudioService(store,{read:()=>'',write:()=>{}},false);
  const wrapped=new Map<PropertyKey,unknown>();
  // Observation only: every method executes on the real Service receiver with
  // its original args. No provider, Store, source, DTO or result is substituted.
  value.service=new Proxy(actualService,{get(target,key){
    const original=Reflect.get(target,key,target);if(typeof original!=='function')return original;
    if(!wrapped.has(key))wrapped.set(key,(...args:unknown[])=>{
      const started=performance.now(),startedAt=new Date().toISOString();
      const record=(status:string,error?:unknown)=>{publicCalls.push({method:String(key),directory:userDir,arity:args.length,startedAt,milliseconds:Math.round(performance.now()-started),status,...(error===undefined?{}:{error:String(error)})});};
      try{const result=Reflect.apply(original,target,args);if(result instanceof Promise)return result.then(reply=>{record('returned');return reply;},error=>{record('rejected',error);throw error;});record('returned');return result;}
      catch(error){record('threw',error);throw error;}
    });
    return wrapped.get(key);
  }});return value;
}
async function close(value:Context){
  if(value.closed)return;
  try{if(value.service){
    const provider=await value.store.culturalProvider();
    const preparing=value.service.prepareCulturalBirthAnchor({kind:'profile',profileId:profile.id});
    const cannotRevive=expect(preparing).rejects.toThrow('已关闭');
    await value.service.closeCmnReadingWorker();
    await cannotRevive;
    expect(await provider.prepareBirthAnchor({kind:'profile',profileId:profile.id})).toMatchObject({kind:'unavailable',reason:'closed'});
    await expect(value.service.prepareCulturalBirthAnchor({kind:'profile',profileId:profile.id})).rejects.toThrow('已关闭');
    expect(()=>value.service.getCulturalStorageCapabilities()).toThrow('已关闭');
    observations.push({case:'service-lifecycle-close',directory:value.directory,ownedProviderClosed:true,serviceCannotReopenProvider:true,asyncPrepareCannotRevive:true});
  }}
  finally{try{value.store.db?.close();}catch(error){if(!/closed/i.test(String(error)))throw error;}value.closed=true;}
}
function assertOwnedTree(directory:string){
  checkedDirectory(directory);
  for(const row of readdirSync(directory,{withFileTypes:true})){
    const file=join(directory,row.name),stat=lstatSync(file);
    if(stat.isSymbolicLink()||realpathSync.native(file)!==file)throw Error('Unsafe M920 fixture child: '+file);
    if(stat.isDirectory())assertOwnedTree(file);
  }
}
function disk(value=context){return readFileSync(join(value.directory,'customers.sqlite'));}
function counts(value=context){
  return ['cultural_comparisons','cultural_comparison_revisions','cultural_write_receipts'].map(table=>value.store.db.exec('SELECT COUNT(*) FROM '+table)[0]?.values[0]?.[0]);
}
function namingRows(value=context){
  return {profiles:value.store.db.exec('SELECT id,json FROM profiles ORDER BY rowid')[0]?.values??[],sessions:value.store.db.exec('SELECT id,json FROM sessions ORDER BY rowid')[0]?.values??[],revisions:value.store.db.exec('SELECT id,session_id,created_at,json FROM revisions ORDER BY id')[0]?.values??[]};
}
function ok<T>(reply:CulturalProviderReply<T>):T{
  if(reply.kind!=='ok')throw Error(`Real service provider rejected ${reply.reason}: ${reply.message}`);return reply.value;
}
function committed(reply:CulturalSaveResult):Saved{
  expect(reply.status).not.toBe('conflict');if(reply.status==='conflict')throw Error('Unexpected cultural conflict: '+reply.reason);return reply;
}
function selected(options:readonly CulturalProviderOptions[]):CulturalProviderPreviewRequest{
  return {candidateTokens:options.map(row=>row.candidateToken),selections:options.flatMap(candidate=>candidate.positions.flatMap(row=>row.defaultEvidenceId===null?[]:[{candidateToken:candidate.candidateToken,position:row.position,evidenceId:row.defaultEvidenceId}]))};
}
async function draftPreview(value:Context,profileId:string):Promise<{anchor:CulturalProviderAnchor;request:CulturalProviderPreviewRequest;preview:CulturalProviderPreview}>{
  const anchor=ok(await value.service.prepareCulturalBirthAnchor({kind:'profile',profileId}));
  const options=await Promise.all(['安宁','沐清'].map(async(givenName,index)=>ok(await value.service.getCulturalCharacterOptions(anchor.handle,{kind:'draft',draftId:'m920-draft-'+index,givenName}))));
  const request=selected(options),preview=ok(await value.service.previewCulturalComparison(anchor.handle,request));
  return {anchor,request,preview};
}
async function savedPreview(value=context){
  const request:CulturalAnchorRequest={kind:'session',sessionId:session.id,expectedReviewToken:session.reviewToken!};
  const anchor=ok(await value.service.prepareCulturalBirthAnchor(request));
  const selectedCandidates=session.candidates.filter(candidate=>['安宁','安和'].includes(candidate.givenName));expect(selectedCandidates).toHaveLength(2);
  const options=await Promise.all(selectedCandidates.map(async candidate=>ok(await value.service.getCulturalCharacterOptions(anchor.handle,{kind:'saved',candidateId:candidate.id}))));
  const previewRequest=selected(options),preview=ok(await value.service.previewCulturalComparison(anchor.handle,previewRequest));
  expect(preview.snapshot.anchor.sourceSessionId).toBe(session.id);
  expect(preview.snapshot.candidateOrder).toEqual(selectedCandidates.map(candidate=>candidate.id));
  return {anchor,request:previewRequest,preview};
}
function createRequest(preview:CulturalProviderPreview,key:string,ownerProfileId=profile.id):CulturalSaveRequest{
  return {previewToken:preview.previewHandle,ownerProfileId,target:{mode:'create'},idempotencyKey:key,expectedSnapshotDigest:preview.snapshot.snapshotDigest,note:'M920真实服务保存'};
}
function commitRequest(ticket:PreparedCulturalWrite):CommitCulturalWriteRequest{
  return {ticket:ticket.ticket,ownerProfileId:ticket.ownerProfileId,idempotencyKey:ticket.idempotencyKey,expectedRequestSha:ticket.requestSha,databaseGeneration:ticket.databaseGeneration};
}
function unchanged(value:Context,before:Buffer,priorCounts:unknown[]){
  expect(disk(value).equals(before)).toBe(true);expect(counts(value)).toEqual(priorCounts);
  expect(existsSync(join(value.directory,'customers.write-lock'))).toBe(false);
}
function rejectedWithoutWrite(action:()=>unknown,value=context){
  const before=disk(value),priorCounts=counts(value);expect(action).toThrow();unchanged(value,before,priorCounts);
}
function boundary(method:keyof StudioService,args:unknown[]){
  return Reflect.apply(context.service[method] as (...args:unknown[])=>unknown,context.service,args);
}

beforeAll(async()=>{
  workflowStarted=performance.now();
  context=await open();context.service.saveProfile(profile);context.service.saveProfile(unknownProfile);context.service.saveProfile(otherProfile);
  // This is the sole NamingSession fixture producer. Its original chart,
  // candidate records, archived sources and review token remain authoritative.
  const forbiddenChars=context.store.dataset.characters.filter(row=>!['安','宁','和'].includes(row.char)).map(row=>row.char).join('');
  session=(await context.service.generate(profile,normalizePreferences({generationChar:'安',forbiddenChars,zodiacRules:false,numerology:false,imageryReading:false}))).session;
  expect(session.candidates.length).toBeGreaterThanOrEqual(2);
  expect(session.candidates.some(candidate=>candidate.givenName==='安和')).toBe(true);
  expect(session.candidates.some(candidate=>candidate.givenName==='安宁')).toBe(true);
  session=context.service.saveSession({...session,reviewNote:'M920真实生成后的审阅'});
},120000);

afterAll(async()=>{
  const failures:unknown[]=[];
  for(const value of contexts)try{await close(value);}catch(error){failures.push(error);}
  for(const [value,parent] of owned){
    try{
      if(dirname(value)!==parent||parent!==evidenceRoot||!basename(value).startsWith(fixturePrefix))throw Error('Unowned M920 cleanup target');
      assertOwnedTree(value);rmSync(value,{recursive:true,force:false});owned.delete(value);
    }catch(error){failures.push(error);}
  }
  ensureEvidenceRoot();const target=join(evidenceRoot,'real-service-observations.json'),temporary=target+'.tmp';
  writeFileSync(temporary,JSON.stringify({suite:'m920-cultural-workflow-service',provider:'actual Store.culturalProvider; no provider/source/DTO mocks',generatedNamingSessions:session?1:0,generatedCandidates:session?.candidates.map(candidate=>candidate.givenName)??[],wholeWorkflowMilliseconds:Math.round(performance.now()-workflowStarted),publicCalls,observations,cleanupFailures:failures.map(String),performanceAcceptance:'not-accepted; split case verdicts are functional observations, not a total120s or15s SLA'},null,2)+'\n');renameSync(temporary,target);
  if(failures.length)throw new AggregateError(failures,'M920 actual Store cleanup failed');
},30000);

describe('M920 StudioService real Store cultural workflow',{timeout:120000},()=>{
  it('previews two raw-profile drafts read-only and migrates only through the explicit cultural action',async()=>{
    const {service}=context;
    expect(service.getCulturalStorageCapabilities()).toMatchObject({version:'customer-compact/2',hasCulturalTables:false});
    expect(service.migrateCustomerStorage().version).toBe('customer-compact/2');
    const before=disk(),migration=service.previewCulturalStorageMigration();baselineNamingRows=namingRows();
    expect(migration).toMatchObject({from:'customer-compact/2',to:'customer-compact/3',writes:0});
    const draft=await draftPreview(context,profile.id);
    expect(draft.preview.snapshot.anchor).toMatchObject({ownerProfileId:profile.id,sourceSessionId:null,available:true});
    expect(draft.preview.snapshot.candidates.map(candidate=>candidate.givenName)).toEqual(['安宁','沐清']);
    expect(disk().equals(before)).toBe(true);
    expect(()=>service.prepareCulturalWrite(createRequest(draft.preview,'m920-before-explicit-migration'))).toThrow();
    expect(disk().equals(before)).toBe(true);
    expect(service.migrateCulturalStorage().version).toBe('customer-compact/3');
    expect(service.getCulturalStorageCapabilities()).toMatchObject({version:'customer-compact/3',hasCulturalTables:true});
    expect(namingRows()).toEqual(baselineNamingRows);expect(counts()).toEqual([0,0,0]);
    observations.push({case:'actual-profile-migration',status:'verified',defaultMigration:'customer-compact/2',explicitMigration:'customer-compact/3',rawProfilePreview:true,draftCandidates:2,culturalCounts:counts()});
  });

  it('creates and reads a real saved-session comparison and resolves the exact idempotent retry',async()=>{
    const {service,store}=context;
    const live=await savedPreview(),actualProvider=await store.culturalProvider();
    expect(live.preview.snapshot.candidates).toHaveLength(2);
    expect(live.preview.snapshot.candidates.some(candidate=>candidate.rows.some(row=>row.char==='和'&&row.status==='unknown-label'))).toBe(true);
    expect(live.preview.snapshot.summary.completeSharedPalaces).toBeNull();
    // A token issued by the Service resolves in this exact Store's provider.
    expect(ok(actualProvider.verifyOwnedPreview(live.preview.previewHandle))).toMatchObject({ownerProfileId:profile.id,sourceSessionId:session.id,snapshotDigest:live.preview.snapshot.snapshotDigest});
    initialRequest=createRequest(live.preview,'m920-service-create');
    const beforePrepare=disk();initialTicket=service.prepareCulturalWrite(initialRequest);
    expect(disk().equals(beforePrepare)).toBe(true);expect(counts()).toEqual([0,0,0]);
    created=committed(service.commitCulturalWrite(commitRequest(initialTicket)));
    expect(created).toMatchObject({status:'committed',currentHead:{profileId:profile.id,sourceSessionId:session.id,currentRevision:1}});
    firstRead=service.readCulturalComparison(created.currentHead.id);
    expect(firstRead.result.snapshot).toEqual(live.preview.snapshot);
    expect(Object.keys(firstRead).sort()).toEqual(['head','result','revision']);
    for(const field of ['capsule','material','blobs','actualBlobsById','replay','provider','previewHandle'])expect(firstRead).not.toHaveProperty(field);
    expect(firstRead.result.noteAuthority).toBe('human-note-only');expect(counts()).toEqual([1,1,1]);
    const retryBefore=disk(),retry=committed(service.commitCulturalWrite(commitRequest(initialTicket)));
    expect(retry.status).toBe('already-committed');expect(retry.committed).toEqual(created.committed);unchanged(context,retryBefore,[1,1,1]);
    observations.push({case:'actual-session-create-read-retry',status:'verified',savedSessionId:session.id,comparisonId:created.currentHead.id,savedCandidates:session.candidates.length,readProjection:['head','result','revision'],idempotentRetry:true,culturalCounts:counts()});
  });

  it('revises with the current CAS, preserves history and restores the exact first comparison snapshot',async()=>{
    const {service}=context,revisedPreview=await savedPreview(),head=firstRead.head;
    const revisedRequest:CulturalSaveRequest={...createRequest(revisedPreview.preview,'m920-service-revise'),target:{mode:'revise',comparisonId:head.id,expectedRevision:head.currentRevision,expectedReviewToken:head.reviewToken},note:'M920真实修订'};
    const revised=committed(service.commitCulturalWrite(commitRequest(service.prepareCulturalWrite(revisedRequest))));
    expect(revised.currentHead.currentRevision).toBe(2);expect(revised.currentHead.reviewToken).not.toBe(head.reviewToken);
    expect(service.readCulturalComparison(head.id,1).result).toEqual(firstRead.result);
    expect(service.listCulturalRevisions(head.id).map(row=>row.revision)).toEqual([2,1]);
    const restored=committed(service.restoreCulturalRevision(head.id,1,2,revised.currentHead.reviewToken,'m920-service-restore'));
    expect(restored.currentHead.currentRevision).toBe(3);expect(restored.committed).toMatchObject({operation:'restore-revision',restoredFromRevision:1,parentRevision:2});
    expect(service.readCulturalComparison(head.id).result.snapshot).toEqual(firstRead.result.snapshot);
    expect(service.listCulturalRevisions(head.id).map(row=>row.revision)).toEqual([3,2,1]);
    expect(counts()).toEqual([1,3,3]);expect(namingRows()).toEqual(baselineNamingRows);
    observations.push({case:'actual-session-revision-restore',status:'verified',savedSessionId:session.id,comparisonId:head.id,revisions:[3,2,1],culturalCounts:counts(),diskSha256:hash(disk())});
  });

  it('preserves unknown time and rejects cross-owner and foreign Store preview tokens atomically',async()=>{
    const {service}=context,beforeUnknown=disk(),priorCounts=counts(),unknown=await draftPreview(context,unknownProfile.id);
    expect(unknown.anchor.anchor).toMatchObject({ownerProfileId:unknownProfile.id,available:false});
    expect(unknown.preview.snapshot).toMatchObject({status:'unknown-chart',summary:{state:'not-evaluated',completeSharedPalaces:null}});
    expect(unknown.preview.snapshot.chartWideObservations).toEqual([]);
    expect(unknown.preview.snapshot.candidates.some(candidate=>candidate.knownPalaces.length>0)).toBe(true);
    unchanged(context,beforeUnknown,priorCounts);
    rejectedWithoutWrite(()=>service.prepareCulturalWrite(createRequest(unknown.preview,'m920-owner-mismatch',otherProfile.id)));

    const foreign=await open();foreign.service.saveProfile(profile);foreign.service.migrateCulturalStorage();
    const foreignLive=await draftPreview(foreign,profile.id),foreignDisk=disk(foreign);
    rejectedWithoutWrite(()=>service.prepareCulturalWrite(createRequest(foreignLive.preview,'m920-foreign-store-token')));
    expect(disk(foreign).equals(foreignDisk)).toBe(true);await close(foreign);
    observations.push({case:'actual-unknown-owner-and-store-boundaries',status:'verified',unknownTimeStatus:unknown.preview.snapshot.status,crossOwnerRejected:true,foreignStoreTokenRejected:true,culturalCounts:counts()});
  });

  it('rejects source handles, review tokens and birth digests after actual session and profile writes',async()=>{
    const {service}=context;
    const stale=await draftPreview(context,profile.id),oldReviewToken=session.reviewToken!;
    session=service.saveSession({...session,reviewNote:'M920更新真实方案审阅版本'});
    const afterSessionWrite=disk(),afterSessionCounts=counts();
    expect(await service.prepareCulturalBirthAnchor({kind:'session',sessionId:session.id,expectedReviewToken:oldReviewToken})).toMatchObject({kind:'unavailable',reason:'stale-source'});
    expect(await service.getCulturalCharacterOptions(stale.anchor.handle,{kind:'draft',draftId:'stale',givenName:'安宁'})).toMatchObject({kind:'unavailable',reason:'stale-source'});
    expect(await service.previewCulturalComparison(stale.anchor.handle,stale.request)).toMatchObject({kind:'unavailable',reason:'stale-source'});
    rejectedWithoutWrite(()=>service.prepareCulturalWrite(createRequest(stale.preview,'m920-stale-source-token')));
    unchanged(context,afterSessionWrite,afterSessionCounts);

    const previousBirth=ok(await service.prepareCulturalBirthAnchor({kind:'profile',profileId:profile.id}));
    service.saveProfile({...profile,notes:'真实档案已更新，旧出生输入摘要失效'});
    const afterProfileWrite=disk();
    expect(await service.prepareCulturalBirthAnchor({kind:'profile',profileId:profile.id,expectedBirthInputDigest:previousBirth.anchor.identity.birthInputDigest})).toMatchObject({kind:'unavailable',reason:'stale-source'});
    unchanged(context,afterProfileWrite,afterSessionCounts);
    observations.push({case:'actual-stale-source-boundaries',status:'verified',staleSessionTokenRejected:true,staleAnchorRejected:true,staleBirthDigestRejected:true,culturalCounts:counts()});
  });

  it('rejects caller snapshot/material authority and every extra or missing service argument without a database write',async()=>{
    const {service}=context,live=await savedPreview(),request=createRequest(live.preview,'m920-invalid-authority'),before=disk(),priorCounts=counts();
    const actualMaterial=ok((await context.store.culturalProvider()).readMaterial(live.preview.previewHandle));
    const callerMaterial={schema:actualMaterial.schema,ownerProfileId:actualMaterial.ownerProfileId,storage:actualMaterial.storage,jsons:[],blobs:[],verified:true};
    expect(await service.prepareCulturalBirthAnchor({kind:'session',sessionId:session.id,expectedReviewToken:session.reviewToken!,snapshot:live.preview.snapshot} as never)).toMatchObject({kind:'unavailable',reason:'invalid-input'});
    expect(await service.getCulturalCharacterOptions(live.anchor.handle,{kind:'saved',candidateId:session.candidates[0].id,material:callerMaterial} as never)).toMatchObject({kind:'unavailable',reason:'invalid-input'});
    expect(await service.previewCulturalComparison(live.anchor.handle,{...live.request,snapshot:live.preview.snapshot} as never)).toMatchObject({kind:'unavailable',reason:'invalid-input'});
    for(const extra of [{snapshot:live.preview.snapshot},{material:callerMaterial},{capsule:{verified:true}}])expect(()=>service.prepareCulturalWrite({...request,...extra} as never)).toThrow();
    expect(()=>service.prepareCulturalWrite({...request,previewToken:'caller-created-token'})).toThrow();
    expect(()=>service.commitCulturalWrite({...commitRequest(initialTicket),material:callerMaterial} as never)).toThrow();

    const invalidCalls:{method:keyof StudioService;args:unknown[]}[]=[
      {method:'getCulturalStorageCapabilities',args:[null]},
      {method:'prepareCulturalBirthAnchor',args:[]},{method:'prepareCulturalBirthAnchor',args:[{kind:'profile',profileId:profile.id},null]},
      {method:'getCulturalCharacterOptions',args:[live.anchor.handle]},{method:'getCulturalCharacterOptions',args:[live.anchor.handle,{kind:'saved',candidateId:session.candidates[0].id},null]},
      {method:'previewCulturalComparison',args:[live.anchor.handle]},{method:'previewCulturalComparison',args:[live.anchor.handle,live.request,null]},
      {method:'prepareCulturalWrite',args:[]},{method:'prepareCulturalWrite',args:[request,null]},
      {method:'commitCulturalWrite',args:[]},{method:'commitCulturalWrite',args:[commitRequest(initialTicket),null]},
      {method:'readCulturalComparison',args:[]},{method:'readCulturalComparison',args:[created.currentHead.id,1,null]},
      {method:'listCulturalRevisions',args:[]},{method:'listCulturalRevisions',args:[created.currentHead.id,null]},
      {method:'restoreCulturalRevision',args:[created.currentHead.id,1,3,created.currentHead.reviewToken]},{method:'restoreCulturalRevision',args:[created.currentHead.id,1,3,created.currentHead.reviewToken,'m920-extra-arity',null]},
      {method:'previewCulturalStorageMigration',args:[null]},{method:'migrateCulturalStorage',args:[null]},
      {method:'migrateCustomerStorage',args:['customer-compact/3']}
    ];
    for(const call of invalidCalls)await expect(Promise.resolve().then(()=>boundary(call.method,call.args)),`${String(call.method)} arity=${call.args.length}`).rejects.toThrow();
    unchanged(context,before,priorCounts);
    observations.push({case:'caller-authority-and-arity',status:'verified',extraSnapshotRejected:true,extraMaterialRejected:true,unknownTokenRejected:true,invalidArityCalls:invalidCalls.length,diskUnchanged:true,culturalCounts:counts()});
  });
});
