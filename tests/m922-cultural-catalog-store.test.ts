import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {existsSync,lstatSync,mkdirSync,mkdtempSync,readFileSync,readdirSync,realpathSync,renameSync,rmSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {basename,dirname,join,relative,resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
import initSqlJs from 'sql.js';
import {createCompactCustomerDatabase} from '../src/main/compact-customer-store';
import {Store} from '../src/main/store';
import {StudioService} from '../src/main/service';
import type {BirthProfile} from '../src/shared/types';
import type {CulturalComparisonCatalogMetadata,CulturalComparisonCatalogPage,CulturalComparisonCatalogRequest} from '../src/shared/cultural-comparison-catalog';
import type {CulturalProviderOptions,CulturalProviderPreview,CulturalProviderPreviewRequest,CulturalProviderReply} from '../src/shared/qimen-cultural-provider-v1';
import type {CommitCulturalWriteRequest,CulturalSaveResult,PreparedCulturalWrite} from '../src/shared/cultural-storage-v3';

const workspace=realpathSync.native(resolve('.'));
const dataDir=join(workspace,'data'),wasm=createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm');
const evidenceRoot=join(workspace,'.local','m922-store-tests'),fixturePrefix='m922-real-catalog-';
const owned=new Set<string>(),contexts:Context[]=[],observations:Record<string,unknown>[]=[];
const publicCalls:Array<{layer:'Store'|'StudioService';method:string;directory:string;arity:number;startedAt:string;milliseconds:number;status:string;error?:string}>=[];
const ownerA:BirthProfile={id:'m922-catalog-owner-a',customerName:'M922真实文化目录甲',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2026-10-17',birthTime:'09:30',timeUnknown:false,leapMonth:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'M922合成目录测试资料'};
const ownerB:BirthProfile={...ownerA,id:'m922-catalog-owner-b',customerName:'M922真实文化目录乙'};
type Saved=Exclude<CulturalSaveResult,{status:'conflict'}>;
type Context={store:Store;service:StudioService;directory:string;closed:boolean};
type Available=Extract<CulturalComparisonCatalogPage,{status:'available'}>;
let context:Context,guard:Context,foreign:Context,workflowStarted=0;
const created:Saved[]=[];

function checkedDirectory(directory:string){
  let current=resolve(directory);
  for(;;){
    const stat=lstatSync(current);
    if(stat.isSymbolicLink()||!stat.isDirectory()||realpathSync.native(current)!==current)throw Error('Unsafe M922 directory identity: '+current);
    const parent=dirname(current);if(parent===current)return directory;current=parent;
  }
}
function ensureEvidenceRoot(){
  checkedDirectory(workspace);
  for(const directory of [join(workspace,'.local'),evidenceRoot]){if(!existsSync(directory))mkdirSync(directory);checkedDirectory(directory);}
}
function directory(){
  ensureEvidenceRoot();const value=realpathSync.native(mkdtempSync(join(evidenceRoot,fixturePrefix)));
  checkedDirectory(value);owned.add(value);return value;
}
function timed<T>(layer:'Store'|'StudioService',method:string,value:Context,args:readonly unknown[],action:()=>T):T{
  const started=performance.now(),startedAt=new Date().toISOString();
  const record=(status:string,error?:unknown)=>publicCalls.push({layer,method,directory:value.directory,arity:args.length,startedAt,milliseconds:Math.round(performance.now()-started),status,...(error===undefined?{}:{error:String(error)})});
  try{
    const result=action();
    if(result instanceof Promise)return result.then(reply=>{record('returned');return reply;},error=>{record('rejected',error);throw error;}) as T;
    record('returned');return result;
  }catch(error){record('threw',error);throw error;}
}
async function open(existing?:string):Promise<Context>{
  const userDir=existing??directory();if(!owned.has(userDir))throw Error('M922 may reopen only its own fixture');
  checkedDirectory(userDir);
  const value:Context={store:new Store(userDir,dataDir,wasm),service:undefined as unknown as StudioService,directory:userDir,closed:false};contexts.push(value);
  await timed('Store','init',value,[],()=>value.store.init());
  const actual=new StudioService(value.store,{read:()=>'',write:()=>{}},false),wrapped=new Map<PropertyKey,unknown>();
  // Observation only. Original methods receive their original real Service
  // receiver and arguments; no provider, sources, Store or DTO is substituted.
  value.service=new Proxy(actual,{get(target,key){
    const original=Reflect.get(target,key,target);if(typeof original!=='function')return original;
    if(!wrapped.has(key))wrapped.set(key,(...args:unknown[])=>timed('StudioService',String(key),value,args,()=>Reflect.apply(original,target,args)));
    return wrapped.get(key);
  }});
  return value;
}
async function close(value:Context){
  if(value.closed)return;
  try{if(value.service)await value.service.closeCmnReadingWorker();}
  finally{try{value.store.db?.close();}catch(error){if(!/closed/i.test(String(error)))throw error;}value.closed=true;}
}
function assertOwnedTree(directory:string){
  checkedDirectory(directory);
  for(const row of readdirSync(directory,{withFileTypes:true})){
    const file=join(directory,row.name),stat=lstatSync(file);
    if(stat.isSymbolicLink()||realpathSync.native(file)!==file)throw Error('Unsafe M922 fixture child: '+file);
    if(stat.isDirectory())assertOwnedTree(file);
  }
}
function disk(value=context){return readFileSync(join(value.directory,'customers.sqlite'));}
function available(page:CulturalComparisonCatalogPage):Available{
  expect(page.status).toBe('available');if(page.status!=='available')throw Error('Expected a supported M922 catalogue, got '+page.status);return page;
}
function storeCatalog(value:Context,ownerProfileId:string,request?:CulturalComparisonCatalogRequest){
  const args=request===undefined?[ownerProfileId]:[ownerProfileId,request];
  return timed('Store','listCulturalComparisons',value,args,()=>request===undefined?value.store.listCulturalComparisons(ownerProfileId):value.store.listCulturalComparisons(ownerProfileId,request));
}
function boundary(value:Context,layer:'Store'|'StudioService',args:unknown[]){
  const receiver=layer==='Store'?value.store:value.service;
  const invoke=()=>Reflect.apply(receiver.listCulturalComparisons,receiver,args);
  return layer==='Store'?timed('Store','listCulturalComparisons',value,args,invoke):invoke();
}
function expectUnchanged(value:Context,before:Buffer){
  expect(disk(value).equals(before)).toBe(true);
  expect(existsSync(join(value.directory,'customers.write-lock'))).toBe(false);
}
function ok<T>(reply:CulturalProviderReply<T>):T{
  if(reply.kind!=='ok')throw Error(`Real service provider rejected ${reply.reason}: ${reply.message}`);return reply.value;
}
function selections(options:readonly CulturalProviderOptions[]):CulturalProviderPreviewRequest{
  // Draft polyphonic rows have no implicit selection. This test explicitly
  // chooses the first actual provider option rather than inventing an ID,
  // a reading, or a label; 和 still has no admitted element label.
  return {candidateTokens:options.map(row=>row.candidateToken),selections:options.flatMap(candidate=>candidate.positions.flatMap(row=>{
    const evidenceId=row.defaultEvidenceId??row.options[0]?.evidenceId;
    return evidenceId?[{candidateToken:candidate.candidateToken,position:row.position,evidenceId}]:[];
  }))};
}
async function draftPreview(value:Context,key:string):Promise<CulturalProviderPreview>{
  const anchor=ok(await value.service.prepareCulturalBirthAnchor({kind:'profile',profileId:ownerA.id}));
  expect(anchor.anchor).toMatchObject({ownerProfileId:ownerA.id,sourceSessionId:null,available:true});
  const options: CulturalProviderOptions[]=[];
  for(const [index,givenName] of ['安宁','安和'].entries())options.push(ok(await value.service.getCulturalCharacterOptions(anchor.handle,{kind:'draft',draftId:key+'-'+index,givenName})));
  const preview=ok(await value.service.previewCulturalComparison(anchor.handle,selections(options)));
  expect(preview.snapshot.candidates.map(row=>row.givenName)).toEqual(['安宁','安和']);
  expect(preview.snapshot.candidates.some(candidate=>candidate.rows.some(row=>row.char==='和'&&row.status==='unknown-label'))).toBe(true);
  expect(preview.snapshot.summary.completeSharedPalaces).toBeNull();
  return preview;
}
function commitRequest(ticket:PreparedCulturalWrite):CommitCulturalWriteRequest{
  return {ticket:ticket.ticket,ownerProfileId:ticket.ownerProfileId,idempotencyKey:ticket.idempotencyKey,expectedRequestSha:ticket.requestSha,databaseGeneration:ticket.databaseGeneration};
}
async function createComparison(key:string){
  const beforePreview=disk(),preview=await draftPreview(context,key);expectUnchanged(context,beforePreview);
  const ticket=context.service.prepareCulturalWrite({previewToken:preview.previewHandle,ownerProfileId:ownerA.id,target:{mode:'create'},idempotencyKey:key,expectedSnapshotDigest:preview.snapshot.snapshotDigest,note:'M922 private note '+key});
  expectUnchanged(context,beforePreview);
  const result=context.service.commitCulturalWrite(commitRequest(ticket));
  expect(result.status).toBe('committed');if(result.status==='conflict')throw Error('Unexpected real cultural write conflict: '+result.reason);
  expect(result.currentHead).toMatchObject({profileId:ownerA.id,sourceSessionId:null,currentRevision:1});
  created.push(result);
  observations.push({case:key,status:'verified',comparisonId:result.currentHead.id,provider:'actual raw-profile provider',givenNames:['安宁','安和'],unknownLabel:'和',committedRevision:result.committed.revision});
}
function metadata(saved:Saved):CulturalComparisonCatalogMetadata{
  return {comparisonId:saved.currentHead.id,ownerProfileId:ownerA.id,sourceSessionId:null,currentRevision:saved.currentHead.currentRevision,createdAt:saved.currentHead.createdAt,factsAuthenticated:false,sourceAuthority:'not-authenticated-facts'};
}
function expectedMetadata(){return created.map(metadata).sort((a,b)=>a.comparisonId<b.comparisonId?1:a.comparisonId>b.comparisonId?-1:0);}
function assertPage(page:CulturalComparisonCatalogPage,ownerProfileId=ownerA.id,limit=25){
  expect(page).toMatchObject({schema:'cultural-comparison-catalog/1',ownerProfileId,storageVersion:'customer-compact/3',limit,order:'comparison-id-desc',factsAuthenticated:false,sourceAuthority:'not-authenticated-facts'});
  for(const row of page.items){
    expect(Object.keys(row).sort()).toEqual(['comparisonId','ownerProfileId','sourceSessionId','currentRevision','createdAt','factsAuthenticated','sourceAuthority'].sort());
    expect(row.factsAuthenticated).toBe(false);expect(row.sourceAuthority).toBe('not-authenticated-facts');
  }
}
function replaceOwn(target:object,key:PropertyKey,value:unknown){
  const original=Object.getOwnPropertyDescriptor(target,key);
  Object.defineProperty(target,key,{value,writable:true,configurable:true});
  return()=>{if(original)Object.defineProperty(target,key,original);else if(!Reflect.deleteProperty(target,key))throw Error('M922 failed to restore own descriptor '+String(key));};
}

beforeAll(async()=>{
  workflowStarted=performance.now();context=await open();
  context.service.saveProfile(ownerA);context.service.saveProfile(ownerB);
},30000);

afterAll(async()=>{
  const failures:unknown[]=[];
  for(const value of contexts)try{await close(value);}catch(error){failures.push(error);}
  for(const value of owned){
    try{
      if(dirname(value)!==evidenceRoot||!basename(value).startsWith(fixturePrefix)||relative(evidenceRoot,value).startsWith('..'))throw Error('Unsafe M922 cleanup scope: '+value);
      assertOwnedTree(value);rmSync(value,{recursive:true,force:false});owned.delete(value);
    }catch(error){failures.push(error);}
  }
  ensureEvidenceRoot();const target=join(evidenceRoot,'real-catalog-observations.json'),temporary=target+'.tmp';
  writeFileSync(temporary,JSON.stringify({suite:'m922-cultural-catalog-store',fixture:'actual Store / StudioService / profile provider; two real source-backed heads; no source or DTO mocks',generatedNamingSessions:0,committedComparisons:created.length,wholeWorkflowMilliseconds:Math.round(performance.now()-workflowStarted),publicCalls,observations,cleanupFailures:failures.map(String),performanceAcceptance:'not-accepted; functional split cases are not a total120s or15s SLA'},null,2)+'\n');renameSync(temporary,target);
  if(failures.length)throw new AggregateError(failures,'M922 actual Store cleanup failed');
},30000);

// Source-backed persistence and cold initialization can replay complete
// retained source evidence. Each case has a functional120s bound, not an SLA.
describe('M922 real Store cultural comparison catalogue',{timeout:120000},()=>{
  it('reports /1 and /2 unsupported without migration or writes, then supports an explicitly migrated empty /3',async()=>{
    expect(context.service.getCulturalStorageCapabilities().version).toBe('customer-compact/2');
    const before=disk(),page=context.service.listCulturalComparisons(ownerA.id);
    expect(page).toEqual({schema:'cultural-comparison-catalog/1',status:'unsupported',reason:'cultural-tables-unavailable',ownerProfileId:ownerA.id,storageVersion:'customer-compact/2',limit:25,order:'comparison-id-desc',factsAuthenticated:false,sourceAuthority:'not-authenticated-facts',items:[]});
    expect(storeCatalog(context,ownerA.id)).toEqual(page);expectUnchanged(context,before);
    const SQL=await initSqlJs({locateFile:()=>wasm}),oldDirectory=directory(),older=createCompactCustomerDatabase(SQL,'customer-compact/1');
    try{
      const storedOwner=context.store.rows<BirthProfile>('profiles').find(row=>row.id===ownerA.id);if(!storedOwner)throw Error('Actual saved owner required');
      older.run('INSERT INTO profiles(id,json) VALUES(?,?)',[ownerA.id,JSON.stringify(storedOwner)]);
      writeFileSync(join(oldDirectory,'customers.sqlite'),older.export());
    }finally{older.close();}
    const legacy=await open(oldDirectory),legacyBytes=disk(legacy);
    expect(legacy.service.listCulturalComparisons(ownerA.id)).toMatchObject({status:'unsupported',storageVersion:'customer-compact/1',reason:'cultural-tables-unavailable',items:[]});
    expectUnchanged(legacy,legacyBytes);await close(legacy);
    expect(context.service.getCulturalStorageCapabilities().version).toBe('customer-compact/2');
    expect(context.service.migrateCulturalStorage().version).toBe('customer-compact/3');
    const migrated=disk(),empty=available(context.service.listCulturalComparisons(ownerA.id));assertPage(empty);expect(empty.items).toEqual([]);expect(empty.nextCursor).toBeUndefined();expectUnchanged(context,migrated);
    observations.push({case:'unsupported-explicit-migration',status:'verified',before:'customer-compact/2',unsupportedReadWrites:0,after:'customer-compact/3',emptyCatalog:true});
  });

  it('commits the first genuine two-name raw-profile comparison with the unknown 和 label',async()=>{
    await createComparison('m922-real-first');expect(created).toHaveLength(1);
  });

  it('commits a second distinct genuine head for bounded pagination without a naming-session fixture',async()=>{
    await createComparison('m922-real-second');expect(created).toHaveLength(2);expect(new Set(created.map(row=>row.currentHead.id)).size).toBe(2);
    const rows=context.store.db.exec('SELECT COUNT(*) FROM cultural_comparisons WHERE profile_id=?',[ownerA.id])[0]?.values[0]?.[0];
    expect(rows).toBe(2);expect(context.store.db.exec('SELECT COUNT(*) FROM cultural_comparison_revisions')[0]?.values[0]?.[0]).toBe(2);
    expect(context.store.db.exec('SELECT COUNT(*) FROM snapshot_blobs')[0]?.values[0]?.[0]).toBeGreaterThan(2);
  });

  it('cold-reopens a nonempty catalogue before a genuine authenticated comparison read and history read',async()=>{
    const original=context;await close(original);context=await open(original.directory);
    const before=disk(),page=available(context.service.listCulturalComparisons(ownerA.id));assertPage(page);
    expect(Object.keys(page).sort()).toEqual(['schema','status','ownerProfileId','storageVersion','limit','order','factsAuthenticated','sourceAuthority','items'].sort());
    expect(page.items).toEqual(expectedMetadata());expect(page.nextCursor).toBeUndefined();
    expect(storeCatalog(context,ownerA.id)).toEqual(page);
    const selected=page.items[0],saved=context.service.readCulturalComparison(selected.comparisonId);
    expect(saved.head).toMatchObject({id:selected.comparisonId,profileId:ownerA.id,currentRevision:selected.currentRevision,sourceSessionId:null});
    expect(saved.result.noteAuthority).toBe('human-note-only');expect(saved.result.note).toMatch(/^M922 private note /);
    expect(saved.result.snapshot.candidates.map(row=>row.givenName)).toEqual(['安宁','安和']);
    expect(saved.result.snapshot.candidates.some(candidate=>candidate.rows.some(row=>row.char==='和'&&row.status==='unknown-label'))).toBe(true);
    const history=context.service.listCulturalRevisions(selected.comparisonId);expect(history).toHaveLength(1);expect(history[0]).toEqual(saved.revision);
    expectUnchanged(context,before);
    observations.push({case:'cold-nonempty-discovery-read-history',status:'verified',catalogRows:page.items.length,metadataFactsAuthenticated:false,authenticatedRead:true,historyRows:history.length,sourceSessionId:null});
  });

  it('reads metadata without dispatching full-read methods, returns detached DTOs, and isolates another real owner',()=>{
    const before=disk(),deny=()=>{throw Error('M922 catalogue dispatched a full result/history read');};
    const restoreRead=replaceOwn(context.store,'readCulturalComparison',deny),restoreHistory=replaceOwn(context.store,'listCulturalRevisions',deny);
    try{
      const page=available(context.service.listCulturalComparisons(ownerA.id));assertPage(page);expect(page.items).toEqual(expectedMetadata());
      const serialized=JSON.stringify(page);
      for(const forbidden of ['M922 private note','human-note-only','previewHandle','snapshotDigest','capsuleDigest','actualBlobsById','materialDescriptor','reviewToken','sourceReferences'])expect(serialized).not.toContain(forbidden);
      const first=page.items[0] as {comparisonId:string};expect(Reflect.set(first,'comparisonId','caller-mutated')).toBe(false);
      expect(available(storeCatalog(context,ownerA.id)).items).toEqual(expectedMetadata());
      const other=available(context.service.listCulturalComparisons(ownerB.id));assertPage(other,ownerB.id);expect(other.items).toEqual([]);expect(other.nextCursor).toBeUndefined();
    }finally{restoreHistory();restoreRead();}
    expectUnchanged(context,before);
    observations.push({case:'metadata-projection-owner-isolation',status:'verified',fullReadDispatches:0,callerMutationDetached:true,ownerBStored:true,ownerBRows:0,notesAndMaterialsAbsent:true});
  });

  it('walks comparison-id-desc pages exactly once with minimum/default/maximum limits and owner/query cursor binding',()=>{
    const before=disk(),first=available(context.service.listCulturalComparisons(ownerA.id,{limit:1}));assertPage(first,ownerA.id,1);
    expect(first.items).toEqual(expectedMetadata().slice(0,1));expect(first.nextCursor).toMatch(/^[A-Za-z0-9_-]+$/);
    if(!first.nextCursor)throw Error('Two real heads must issue a continuation cursor');
    expect(Object.keys(first).sort()).toEqual(['schema','status','ownerProfileId','storageVersion','limit','order','factsAuthenticated','sourceAuthority','items','nextCursor'].sort());
    const last=available(storeCatalog(context,ownerA.id,{limit:1,cursor:first.nextCursor}));assertPage(last,ownerA.id,1);expect(last.items).toEqual(expectedMetadata().slice(1));expect(last.nextCursor).toBeUndefined();
    const visited=[...first.items,...last.items].map(row=>row.comparisonId);expect(visited).toEqual(expectedMetadata().map(row=>row.comparisonId));expect(new Set(visited).size).toBe(2);
    const maximum=available(context.service.listCulturalComparisons(ownerA.id,{limit:50}));assertPage(maximum,ownerA.id,50);expect(maximum.items).toEqual(expectedMetadata());expect(maximum.nextCursor).toBeUndefined();
    expect(context.service.listCulturalComparisons(ownerB.id,{limit:1,cursor:first.nextCursor})).toMatchObject({status:'cursor-expired',reason:'owner-changed',ownerProfileId:ownerB.id,items:[]});
    expect(context.service.listCulturalComparisons(ownerA.id,{limit:2,cursor:first.nextCursor})).toMatchObject({status:'cursor-expired',reason:'query-changed',items:[]});
    expectUnchanged(context,before);
    observations.push({case:'real-head-keyset-pagination',status:'verified',limits:[1,25,50],comparisonIds:visited,ownerChanged:'cursor-expired',limitChanged:'cursor-expired'});
  });

  it('rejects malformed owners, exact-shape/arity violations and malformed or oversize cursors without writes',()=>{
    const before=disk(),invalidOwners:unknown[]=[undefined,null,0,{},[],'','  ',' '+ownerA.id,ownerA.id+' ',ownerA.id+'\u0000','x'.repeat(301)];
    const invalidRequests:unknown[]=[null,[],false,{limit:0},{limit:51},{limit:-1},{limit:1.5},{limit:NaN},{limit:Infinity},{limit:'1'},{limit:1,offset:1},{ownerProfileId:ownerB.id},{snapshot:{}},{material:{}},{factsAuthenticated:true},{cursor:''},{cursor:'*'},{cursor:'='},{cursor:'a'},{cursor:Buffer.from('{}').toString('base64url')},{cursor:'a'.repeat(2049)}];
    for(const layer of ['Store','StudioService'] as const){
      for(const owner of invalidOwners)expect(()=>boundary(context,layer,[owner])).toThrow();
      for(const request of invalidRequests)expect(()=>boundary(context,layer,[ownerA.id,request])).toThrow();
      for(const args of [[],[ownerA.id,{},null]])expect(()=>boundary(context,layer,args)).toThrow();
      for(const owner of ['m922-owner-not-found',"m922-' OR 1=1 --"]){expect(()=>boundary(context,layer,[owner])).toThrow(/CULTURAL_CATALOG_OWNER_NOT_FOUND/);}
      let getterCalls=0;const accessor={get limit(){getterCalls++;return 1;}};
      expect(()=>boundary(context,layer,[ownerA.id,accessor])).toThrow();expect(getterCalls).toBe(0);
      const symbolExtra={limit:1,[Symbol('caller-authority')]:true};expect(()=>boundary(context,layer,[ownerA.id,symbolExtra])).toThrow();
    }
    expectUnchanged(context,before);
    observations.push({case:'invalid-boundaries',status:'verified',layers:['Store','StudioService'],invalidOwners:invalidOwners.length,invalidRequests:invalidRequests.length,literalSqlInjectionOwner:'not-found',accessorInvocations:0,diskUnchanged:true});
  });

  it('expires cursors after an actual profile write and after an actual close/reopen epoch',async()=>{
    const first=available(context.service.listCulturalComparisons(ownerA.id,{limit:1}));if(!first.nextCursor)throw Error('Expected continuation before a real write');
    context.service.saveProfile({...ownerA,notes:'M922 actual profile edit expires catalogue cursors'});
    const afterWrite=disk(),expired=context.service.listCulturalComparisons(ownerA.id,{limit:1,cursor:first.nextCursor});
    expect(expired).toMatchObject({status:'cursor-expired',reason:'database-changed',items:[]});expectUnchanged(context,afterWrite);
    const fresh=available(context.service.listCulturalComparisons(ownerA.id,{limit:1}));if(!fresh.nextCursor)throw Error('Expected continuation before reopen');
    const previous=context;await close(previous);context=await open(previous.directory);const afterReopen=disk();
    expect(storeCatalog(context,ownerA.id,{limit:1,cursor:fresh.nextCursor})).toMatchObject({status:'cursor-expired',reason:'database-changed',items:[]});
    expect(available(context.service.listCulturalComparisons(ownerA.id)).items).toEqual(expectedMetadata());expectUnchanged(context,afterReopen);
    observations.push({case:'actual-write-reopen-expiry',status:'verified',profileWrite:'database-changed',coldReopen:'database-changed',comparisonCount:created.length});
  });

  it('rejects own-instance SQL method substitutions, a foreign real database and a changed managed directory',async()=>{
    guard=await open();guard.service.saveProfile(ownerA);guard.service.migrateCulturalStorage();
    foreign=await open();foreign.service.saveProfile(ownerA);foreign.service.migrateCulturalStorage();
    const before=disk(guard),database=guard.store.db;
    for(const key of ['exec','prepare'] as const){
      const native=database[key];let calls=0;
      const restore=replaceOwn(database,key,(...args:unknown[])=>{calls++;return Reflect.apply(native,database,args);});
      try{expect(()=>storeCatalog(guard,ownerA.id)).toThrow();expect(calls).toBe(0);}
      finally{restore();}
      expect(available(storeCatalog(guard,ownerA.id)).items).toEqual([]);expectUnchanged(guard,before);
    }
    const restoreDatabase=replaceOwn(guard.store,'db',foreign.store.db);
    try{expect(()=>storeCatalog(guard,ownerA.id)).toThrow();}finally{restoreDatabase();}
    const restoreDirectory=replaceOwn(guard.store,'userDir',foreign.directory);
    try{expect(()=>guard.service.listCulturalComparisons(ownerA.id)).toThrow();}finally{restoreDirectory();}
    expect(available(storeCatalog(guard,ownerA.id)).items).toEqual([]);expectUnchanged(guard,before);
    observations.push({case:'native-database-managed-directory-boundaries',status:'verified',ownExecRejected:true,ownPrepareRejected:true,untrustedMethodInvocations:0,foreignRealDatabaseRejected:true,managedDirectoryChangeRejected:true});
  });

  it('rejects disabled foreign keys and changed schema without writing the managed customer database',()=>{
    const before=disk(guard),database=guard.store.db;
    database.run('PRAGMA foreign_keys=OFF');
    try{expect(()=>guard.service.listCulturalComparisons(ownerA.id)).toThrow();}finally{database.run('PRAGMA foreign_keys=ON');}
    expect(available(storeCatalog(guard,ownerA.id)).items).toEqual([]);expectUnchanged(guard,before);
    const definition=database.exec("SELECT sql FROM sqlite_master WHERE type='index' AND name='cultural_comparisons_profile'")[0]?.values[0]?.[0];
    if(typeof definition!=='string')throw Error('Actual cultural owner index is required');
    database.run('DROP INDEX cultural_comparisons_profile');
    try{expect(()=>guard.service.listCulturalComparisons(ownerA.id)).toThrow();}finally{database.run(definition);}
    expect(available(storeCatalog(guard,ownerA.id)).items).toEqual([]);expectUnchanged(guard,before);
    observations.push({case:'live-fk-schema-boundaries',status:'verified',foreignKeysOffRejected:true,missingOwnerIndexRejected:true,diskUnchanged:true});
  });

  it('rejects a stale actual Store after a second actual Store commits a profile edit',async()=>{
    const writer=await open(guard.directory);writer.service.saveProfile({...ownerA,notes:'M922 actual external writer edit'});
    const afterWrite=disk(guard);
    expect(()=>guard.service.listCulturalComparisons(ownerA.id)).toThrow(/另一个窗口或进程更新/);expectUnchanged(guard,afterWrite);
    await close(writer);await close(guard);
    observations.push({case:'actual-external-write-freshness',status:'verified',writer:'second actual Store',staleReadRejected:true,diskUnchangedAfterRefusal:true});
  });
});
