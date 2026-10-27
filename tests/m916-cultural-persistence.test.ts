import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {existsSync,mkdtempSync,readFileSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import initSqlJs,{type Database,type SqlJsStatic} from 'sql.js';
import {Store} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {bindCompactCustomerDatabase} from '../src/main/compact-customer-store';
import {decodeCustomerBackup,encodeCustomerBackup} from '../src/main/customer-backup-envelope';
import {readCustomerRevisionSequence} from '../src/main/customer-revision-sequence';
import {createCulturalEvidenceCodec,encodeCulturalEvidence} from '../src/main/cultural-source-chunks';
import {decodeCulturalRevisionLeaf,encodeCulturalRevisionLeaf} from '../src/main/cultural-revision-codec';
import {canonicalCulturalWriteIdentity} from '../src/main/cultural-write-identity';
import {verifyCulturalSemanticBindings} from '../src/main/cultural-semantic-verifier';
import {compareQimenCultural} from '../src/domain/qimen-cultural-comparison';
import {culturalCanonicalDigest} from '../src/domain/qimen-cultural-comparison-canonical';
import {normalizePreferences} from '../src/shared/workflow';
import type {BirthProfile,NamingSession} from '../src/shared/types';
import type {CulturalProviderAPI,CulturalProviderMaterial,CulturalProviderPreview,CulturalProviderReply} from '../src/shared/qimen-cultural-provider-v1';
import type {PreparedCulturalCharacter,PreparedCulturalComparisonInput} from '../src/shared/qimen-cultural-comparison';
import type {CulturalRevisionResult,CulturalSaveRequest,CulturalSaveResult,CulturalWriteIdentity,PreparedCulturalWrite} from '../src/shared/cultural-storage-v3';
import type {SnapshotBlob} from '../src/main/snapshot-blob-codec';

const dataDir=resolve('data'),wasm=createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm');
const hash=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const profile:BirthProfile={id:'m916-real-family',customerName:'M916文化存档真实闭环',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2026-10-17',birthTime:'09:30',timeUnknown:false,leapMonth:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'合成隔离测试资料，非真实家庭'};
const otherProfile={...profile,id:'m916-other-owner',customerName:'另一隔离档案'};
const directories:string[]=[],stores:Store[]=[],services:StudioService[]=[],providers:CulturalProviderAPI[]=[];
let store:Store,service:StudioService,SQL:SqlJsStatic,session:NamingSession;
let baseline:ReturnType<typeof oldRows>,beforeMigration:Buffer,initialFiles:string[],migrationPreimage:string;
let createRequest:CulturalSaveRequest,createTicket:PreparedCulturalWrite,createPreview:CulturalProviderPreview,createBytes:Buffer,createBytesSha:string;
let created:Extract<CulturalSaveResult,{status:'committed'|'already-committed'}>,revised:typeof created,restoredRevision:typeof created;
let originalResult:CulturalRevisionResult,backup:Uint8Array,restoredStore:Store;

function ownedDirectory(label:string){const directory=mkdtempSync(join(tmpdir(),'m916-'+label+'-'));directories.push(directory);return directory;}
async function open(directory=ownedDirectory('store')){const value=await new Store(directory,dataDir,wasm).init();stores.push(value);return value;}
function disk(value=store){return readFileSync(join(value.userDir,'customers.sqlite'));}
function oldRows(value:Store){return{profiles:value.db.exec('SELECT id,json FROM profiles ORDER BY rowid')[0]?.values??[],sessions:value.db.exec('SELECT id,json FROM sessions ORDER BY rowid')[0]?.values??[],history:value.db.exec('SELECT id,session_id,created_at,json FROM revisions ORDER BY id')[0]?.values??[],sequence:readCustomerRevisionSequence(value.db)};}
function cultureCounts(value:Store){return['cultural_comparisons','cultural_comparison_revisions','cultural_write_receipts'].map(table=>value.db.exec('SELECT COUNT(*) FROM '+table)[0]?.values[0]?.[0]);}
function providerOk<T>(reply:CulturalProviderReply<T>):T{if(reply.kind!=='ok')throw Error(`Real provider rejected ${reply.reason}: ${reply.message}`);return reply.value;}
function committed(value:CulturalSaveResult){expect(value.status).not.toBe('conflict');if(value.status==='conflict')throw Error(`Unexpected culture write conflict: ${value.reason}`);return value;}
function commitPrepared(value:Store,ticket:PreparedCulturalWrite){return value.commitCulturalWrite({ticket:ticket.ticket,ownerProfileId:ticket.ownerProfileId,idempotencyKey:ticket.idempotencyKey,expectedRequestSha:ticket.requestSha,databaseGeneration:ticket.databaseGeneration});}
function atomicRefusal(value:Store,action:()=>unknown,expectedReason?:string){
  const before=disk(value),counts=cultureCounts(value);let caught:unknown,result:unknown;
  try{result=action();}catch(error){caught=error;}
  if(caught!==undefined)expect(caught).toBeInstanceOf(Error);
  else{expect(result).toMatchObject({status:'conflict'});if(expectedReason)expect(result).toMatchObject({reason:expectedReason});}
  expect(disk(value).equals(before)).toBe(true);expect(cultureCounts(value)).toEqual(counts);expect(existsSync(join(value.userDir,'customers.write-lock'))).toBe(false);
}
async function freshPreview(count=2):Promise<CulturalProviderPreview>{
  const provider=await store.culturalProvider();if(!providers.includes(provider))providers.push(provider);
  const anchor=providerOk(await provider.prepareBirthAnchor({kind:'session',sessionId:session.id,expectedReviewToken:session.reviewToken!}));
  const options=session.candidates.slice(0,count).map(candidate=>providerOk(provider.queryCharacterOptions(anchor.handle,{kind:'saved',candidateId:candidate.id})));
  return providerOk(provider.preview(anchor.handle,{candidateTokens:options.map(row=>row.candidateToken),selections:options.flatMap(candidate=>candidate.positions.flatMap(row=>row.defaultEvidenceId===null?[]:[{candidateToken:candidate.candidateToken,position:row.position,evidenceId:row.defaultEvidenceId}]))}));
}
function assertClosure(value:Store,comparisonId:string,revision?:number){
  const saved=value.readCulturalComparison(comparisonId,revision),codec=createCulturalEvidenceCodec(value.db),evidence=codec.decodeEvidenceFromSql(saved.revision.capsule.sha,saved.revision.capsule.rawBytes);
  expect(evidence.capsule).toEqual(saved.capsule);expect(evidence.materialDigest).toBe(saved.result.snapshot.evidenceCapsuleDigest);expect(evidence.capsule.capsuleDigest).toBe(saved.result.capsuleDigest);
  expect(evidence.capsule.assets.length).toBeGreaterThan(0);let chunks=0;
  for(const asset of evidence.capsule.assets){const bytes=evidence.actualBlobsById.get(asset.id);expect(bytes).toBeDefined();expect(bytes!.byteLength).toBe(asset.byteLength);expect(hash(bytes!)).toBe(asset.sha256);chunks+=asset.chunks.length;}
  expect(chunks).toBeGreaterThan(0);return saved;
}
function isolatedFaultDatabase(bytes:Uint8Array){const value=new SQL.Database(new Uint8Array(bytes));bindCompactCustomerDatabase(value);return value;}
function insertImmutableBlob(database:Database,blob:SnapshotBlob){
  const prior=database.exec('SELECT raw_bytes,codec,payload FROM snapshot_blobs WHERE sha=?',[blob.sha])[0]?.values[0];
  if(prior){expect(prior[0]).toBe(blob.rawBytes);expect(prior[1]).toBe(blob.codec);if(!(prior[2] instanceof Uint8Array))throw Error('Actual retained SQL blob payload is required');expect(Buffer.from(prior[2]).equals(Buffer.from(blob.payload))).toBe(true);return;}
  database.run('INSERT INTO snapshot_blobs(sha,raw_bytes,codec,payload) VALUES(?,?,?,?)',[blob.sha,blob.rawBytes,blob.codec,blob.payload]);
}
function replaceMaterialJson(material:{jsons:CulturalProviderMaterial['jsons'][number][]},id:string,value:unknown){const index=material.jsons.findIndex(row=>row.id===id);if(index<0)throw Error('Actual material JSON is required: '+id);const raw=JSON.stringify(value);material.jsons[index]={...material.jsons[index],exactUtf8Json:raw,sha256:hash(raw)};}

beforeAll(async()=>{
  SQL=await initSqlJs({locateFile:()=>wasm});store=await open();service=new StudioService(store,{read:()=>'',write:()=>{}},false);services.push(service);
  session=(await service.generate(profile,normalizePreferences({generationChar:'安',zodiacRules:false,imageryReading:false}))).session;expect(session.candidates.length).toBeGreaterThanOrEqual(4);
  session=service.saveSession({...session,reviewNote:'真实命名审阅历史一'});session=service.saveSession({...session,reviewNote:'真实命名审阅历史二'});
  service.saveProfile(otherProfile);expect(store.readVerifiedSession(session.id)).toEqual(session);expect(store.listRevisions(session.id).length).toBeGreaterThanOrEqual(2);
  baseline=oldRows(store);beforeMigration=disk();initialFiles=readdirSync(store.userDir);
},30000);
afterAll(async()=>{
  for(const provider of providers)provider.close();
  try{for(const value of services)await value.closeCmnReadingWorker();}finally{try{for(const value of stores)try{value.db.close();}catch(error){if(!/closed/i.test(String(error)))throw error;}}finally{for(const directory of directories)rmSync(directory,{recursive:true,force:true});}}
},15000);

// End-to-end correctness includes complete source replay and immutable customer
// persistence. This120s limit is not the separate15s performance acceptance.
describe('M916 real provider to nonempty cultural persistence and complete customer backup lifecycle',{timeout:120000},()=>{
  it('requires explicit migration and preserves the exact old JSON, naming history sequence and actual original preimage',()=>{
    expect(store.culturalStorageCapabilities().version).toBe('customer-compact/2');
    const preview=store.previewCulturalStorageMigration();expect(preview).toMatchObject({from:'customer-compact/2',to:'customer-compact/3',writes:0});expect(preview.counts.culturalHeads).toBe(0);expect(disk().equals(beforeMigration)).toBe(true);
    store.migrateCustomerStorage('customer-compact/3');expect(store.culturalStorageCapabilities()).toMatchObject({version:'customer-compact/3',hasCulturalTables:true});expect(oldRows(store)).toEqual(baseline);
    const files=readdirSync(store.userDir).filter(name=>!initialFiles.includes(name)&&name.startsWith('customers.before-compact-')&&name.endsWith('.sqlite'));expect(files).toHaveLength(1);migrationPreimage=join(store.userDir,files[0]);expect(readFileSync(migrationPreimage).equals(beforeMigration)).toBe(true);
  });

  it('prepares read-only and commits one genuine provider preview with a nonempty chunk, revision and receipt graph',async()=>{
    const provider=await store.culturalProvider();expect(await store.culturalProvider()).toBe(provider);
    createPreview=await freshPreview(2);createRequest={previewToken:createPreview.previewHandle,ownerProfileId:profile.id,target:{mode:'create'},idempotencyKey:'m916-create-stable-key',expectedSnapshotDigest:createPreview.snapshot.snapshotDigest,note:'真实两名文化比较，独立于姓名评分'};
    const before=disk();createTicket=store.prepareCulturalWrite(createRequest);expect(disk().equals(before)).toBe(true);expect(cultureCounts(store)).toEqual([0,0,0]);
    created=committed(commitPrepared(store,createTicket));expect(created.status).toBe('committed');expect(created.currentHead.currentRevision).toBe(1);expect(created.currentHead.profileId).toBe(profile.id);expect(cultureCounts(store)).toEqual([1,1,1]);
    const saved=assertClosure(store,created.currentHead.id);originalResult=saved.result;expect(saved.result.snapshot).toEqual(createPreview.snapshot);expect(saved.result.note).toBe(createRequest.note);expect(saved.result.noteAuthority).toBe('human-note-only');expect(oldRows(store)).toEqual(baseline);createBytes=disk();createBytesSha=hash(createBytes);
  });

  it('retries the exact committed intent despite stale provider freshness without writing another revision',()=>{
    const before=disk(),retry=store.prepareCulturalWrite(createRequest),again=committed(commitPrepared(store,retry));
    expect(again.status).toBe('already-committed');expect(again.committed).toEqual(created.committed);expect(again.requestSha).toBe(created.requestSha);expect(disk().equals(before)).toBe(true);expect(cultureCounts(store)).toEqual([1,1,1]);
    const receipt=store.getCulturalWriteReceipt(profile.id,createRequest.idempotencyKey,created.requestSha);expect(receipt?.receipt.requestSha).toBe(created.requestSha);expect(receipt?.committed).toEqual(created.committed);
  });

  it('reopens a fresh Store, authenticates all retained source chunks, and resolves the same idempotent intent without original preview memory',async()=>{
    const fresh=await open(store.userDir),saved=assertClosure(fresh,created.currentHead.id);expect(saved.result).toEqual(originalResult);expect(fresh.listCulturalRevisions(created.currentHead.id)).toEqual([created.committed]);
    const before=disk(fresh),direct=committed(commitPrepared(fresh,createTicket));expect(direct.status).toBe('already-committed');expect(direct.committed).toEqual(created.committed);expect(disk(fresh).equals(before)).toBe(true);
    const ticket=fresh.prepareCulturalWrite(createRequest),retry=committed(commitPrepared(fresh,ticket));expect(retry.status).toBe('already-committed');expect(disk(fresh).equals(before)).toBe(true);expect(oldRows(fresh)).toEqual(baseline);
  });

  it('rejects cross-owner requests, fake tickets and same-key different intent atomically',async()=>{
    const live=await freshPreview(2);
    atomicRefusal(store,()=>store.prepareCulturalWrite({...createRequest,previewToken:live.previewHandle,expectedSnapshotDigest:live.snapshot.snapshotDigest,ownerProfileId:otherProfile.id,idempotencyKey:'m916-cross-owner'}));
    atomicRefusal(store,()=>store.prepareCulturalWrite({...createRequest,note:'Same key with a different stable intent'}),'idempotency-conflict');
    atomicRefusal(store,()=>store.commitCulturalWrite({ticket:'caller-created-ticket',ownerProfileId:profile.id,idempotencyKey:'fake-ticket',expectedRequestSha:'a'.repeat(64),databaseGeneration:createTicket.databaseGeneration}));
    atomicRefusal(store,()=>store.prepareCulturalWrite({...createRequest,idempotencyKey:'extra-authority',capsule:{verified:true}} as never));
  });

  it('revises with the current head CAS while retaining the exact first result and rotating its review token',async()=>{
    const preview=await freshPreview(4),head=store.readCulturalComparison(created.currentHead.id).head;
    const request:CulturalSaveRequest={previewToken:preview.previewHandle,ownerProfileId:profile.id,target:{mode:'revise',comparisonId:head.id,expectedRevision:head.currentRevision,expectedReviewToken:head.reviewToken},idempotencyKey:'m916-revise-four',expectedSnapshotDigest:preview.snapshot.snapshotDigest,note:'真实四名比较修订'};
    revised=committed(commitPrepared(store,store.prepareCulturalWrite(request)));expect(revised.currentHead.currentRevision).toBe(2);expect(revised.currentHead.reviewToken).not.toBe(head.reviewToken);expect(revised.committed.parentRevision).toBe(1);
    expect(assertClosure(store,head.id).result.snapshot).toEqual(preview.snapshot);expect(store.readCulturalComparison(head.id,1).result).toEqual(originalResult);expect(store.listCulturalRevisions(head.id).map(row=>row.revision)).toEqual([2,1]);
    expect(oldRows(store)).toEqual(baseline);expect(cultureCounts(store)).toEqual([1,2,2]);
  });

  it('rejects stale comparison CAS and source-changed prepared tickets without any failed-operation disk write',async()=>{
    const preview=await freshPreview(2);
    const stale:CulturalSaveRequest={previewToken:preview.previewHandle,ownerProfileId:profile.id,target:{mode:'revise',comparisonId:created.currentHead.id,expectedRevision:1,expectedReviewToken:created.currentHead.reviewToken},idempotencyKey:'m916-stale-cas',expectedSnapshotDigest:preview.snapshot.snapshotDigest,note:'must not overwrite revision2'};
    atomicRefusal(store,()=>{const ticket=store.prepareCulturalWrite(stale);return commitPrepared(store,ticket);},'revision-conflict');
    const head=store.readCulturalComparison(created.currentHead.id).head,ticket=store.prepareCulturalWrite({...stale,idempotencyKey:'m916-source-changed',target:{mode:'revise',comparisonId:head.id,expectedRevision:head.currentRevision,expectedReviewToken:head.reviewToken}});
    service.saveProfile({...session.profile,notes:'A legitimate later writer change invalidates the already prepared ticket'});
    atomicRefusal(store,()=>commitPrepared(store,ticket),'source-changed');expect(store.readCulturalComparison(head.id).head.currentRevision).toBe(2);expect(readCustomerRevisionSequence(store.db)).toBe(baseline.sequence);
  });

  it('rejects a fully re-sealed stored forgery beyond byte integrity while leaving the restore target unchanged',async()=>{
    expect(hash(createBytes)).toBe(createBytesSha);
    const database=isolatedFaultDatabase(createBytes);let forged:Uint8Array;
    try{
      const evidence=createCulturalEvidenceCodec(database).decodeEvidenceFromSql(created.committed.capsule.sha,created.committed.capsule.rawBytes),material=structuredClone(evidence.materialDescriptor) as Omit<CulturalProviderMaterial,'jsons'>&{jsons:CulturalProviderMaterial['jsons'][number][]};
      const preparedRow=material.jsons.find(row=>row.id==='prepared-comparison');if(!preparedRow)throw Error('Actual prepared comparison required');const prepared=JSON.parse(preparedRow.exactUtf8Json) as Omit<PreparedCulturalComparisonInput,'evidenceCapsuleDigest'>;
      prepared.candidates[0].rows[0].dictionarySense='CALLER_RESEALED_SENSE';replaceMaterialJson(material,'prepared-comparison',prepared);
      const occurrence=material.jsons.find(row=>row.id.startsWith('occurrences:'));if(!occurrence)throw Error('Actual occurrence material required');const rows=JSON.parse(occurrence.exactUtf8Json) as PreparedCulturalCharacter[];rows[0].dictionarySense='CALLER_RESEALED_SENSE';replaceMaterialJson(material,occurrence.id,rows);
      const encoded=encodeCulturalEvidence(material,evidence.actualBlobsById),compared=compareQimenCultural({...prepared,evidenceCapsuleDigest:encoded.capsule.materialDigest});expect(compared.kind).toBe('result');if(compared.kind!=='result')throw Error('Resealed negative must be structurally self-consistent');
      const result:CulturalRevisionResult={...originalResult,capsuleDigest:encoded.capsule.capsuleDigest,snapshot:compared.snapshot},resultBlob=encodeCulturalRevisionLeaf(result);expect(decodeCulturalRevisionLeaf(resultBlob)).toEqual(result);
      expect(verifyCulturalSemanticBindings({capsule:encoded.capsule,revision:result,sourceChunks:encoded.sourceChunks}).verified).toBe(true);
      for(const blob of [...encoded.sourceChunks,encoded.capsuleBlob,resultBlob])insertImmutableBlob(database,blob);
      const triggers=database.exec("SELECT name,sql FROM sqlite_master WHERE type='trigger' AND name IN ('cultural_revision_no_update','cultural_receipt_no_update')")[0]?.values??[];expect(triggers).toHaveLength(2);for(const [name]of triggers)database.run('DROP TRIGGER '+String(name));
      database.run('UPDATE cultural_comparison_revisions SET capsule_sha=?,capsule_bytes=?,result_sha=?,result_bytes=? WHERE comparison_id=? AND revision=1',[encoded.capsuleBlob.sha,encoded.capsuleBlob.rawBytes,resultBlob.sha,resultBlob.rawBytes,created.currentHead.id]);
      const old=database.exec('SELECT request_json FROM cultural_write_receipts WHERE profile_id=? AND idempotency_key=?',[profile.id,createRequest.idempotencyKey])[0]?.values[0]?.[0];if(typeof old!=='string')throw Error('Actual immutable intent receipt is required');
      const request=canonicalCulturalWriteIdentity({...JSON.parse(old) as CulturalWriteIdentity,capsuleSha:encoded.capsuleBlob.sha,snapshotDigest:result.snapshot.snapshotDigest});
      database.run('UPDATE cultural_write_receipts SET request_json=?,request_sha=? WHERE profile_id=? AND idempotency_key=?',[request.json,request.sha256,profile.id,createRequest.idempotencyKey]);
      for(const [,sql]of triggers){if(typeof sql!=='string')throw Error('Original trigger SQL missing');database.run(sql);}expect(database.exec('PRAGMA foreign_key_check')).toEqual([]);forged=database.export();
    }finally{database.close();expect(hash(createBytes)).toBe(createBytesSha);}
    const target=await open(),before=disk(target);expect(()=>target.prepareCustomerRestore(encodeCustomerBackup(forged))).toThrow();expect(disk(target).equals(before)).toBe(true);
  });

  it('appends restore-revision as new immutable history rather than replacing either saved result',()=>{
    const head=store.readCulturalComparison(created.currentHead.id).head;
    restoredRevision=committed(store.restoreCulturalRevision(head.id,1,head.currentRevision,head.reviewToken,'m916-restore-revision1'));
    expect(restoredRevision.currentHead.currentRevision).toBe(3);expect(restoredRevision.committed.operation).toBe('restore-revision');expect(restoredRevision.committed.restoredFromRevision).toBe(1);
    const restored=assertClosure(store,head.id);expect(restored.result.snapshot).toEqual(originalResult.snapshot);expect(restored.result.note).toBe(originalResult.note);expect(store.readCulturalComparison(head.id,1).result).toEqual(originalResult);
    expect(store.listCulturalRevisions(head.id).map(row=>row.revision)).toEqual([3,2,1]);expect(cultureCounts(store)).toEqual([1,3,3]);expect(readCustomerRevisionSequence(store.db)).toBe(baseline.sequence);
  });

  it('exports an actual NSBK backup containing every nonempty cultural revision and complete source-chunk closure',()=>{
    const before=disk();backup=store.backupBytes();expect(Buffer.from(backup.subarray(0,8)).toString()).toBe('NSBK0001');const decoded=decodeCustomerBackup(backup);expect(decoded.format).toBe('compact-sqlite');expect(disk().equals(before)).toBe(true);
    const database=isolatedFaultDatabase(decoded.sqlite);try{expect(database.exec('SELECT version FROM compact_meta')[0]?.values[0]?.[0]).toBe('customer-compact/3');expect(database.exec('SELECT COUNT(*) FROM cultural_comparison_revisions')[0]?.values[0]?.[0]).toBe(3);expect(readCustomerRevisionSequence(database)).toBe(baseline.sequence);}finally{database.close();}
    expect(readFileSync(migrationPreimage).equals(beforeMigration)).toBe(true);
  });

  it('restores the complete backup into a different real Store and preserves its immutable actual preimage',async()=>{
    restoredStore=await open();restoredStore.saveProfile({...profile,id:'m916-restore-target-original',notes:'This complete target database must survive in its immutable preimage'});const before=disk(restoredStore);
    const plan=restoredStore.prepareCustomerRestore(backup);expect(disk(restoredStore).equals(before)).toBe(true);expect(plan).toMatchObject({inputVersion:'customer-compact/3',targetVersion:'customer-compact/3',implicitMerge:false,inputHistoryDropped:false});expect(plan.inputCounts.culturalRevisions).toBe(3);
    const result=restoredStore.commitCustomerRestore(plan.planId,plan.currentDiskHash);expect(result.status).toMatch(/^committed/);expect(readFileSync(result.preimagePath).equals(before)).toBe(true);expect(restoredStore.culturalStorageCapabilities().version).toBe('customer-compact/3');
    expect(assertClosure(restoredStore,created.currentHead.id).result.snapshot).toEqual(originalResult.snapshot);expect(restoredStore.listCulturalRevisions(created.currentHead.id).map(row=>row.revision)).toEqual([3,2,1]);expect(readCustomerRevisionSequence(restoredStore.db)).toBe(baseline.sequence);
    expect(oldRows(restoredStore).history).toEqual(baseline.history);expect(store.readCulturalComparison(created.currentHead.id,1).result).toEqual(originalResult);
  });

  it('reopens the restored Store and keeps the restored source graph without the original provider instance',async()=>{
    for(const provider of providers)provider.close();const fresh=await open(restoredStore.userDir),saved=assertClosure(fresh,created.currentHead.id);expect(saved.result.snapshot).toEqual(originalResult.snapshot);expect(cultureCounts(fresh)).toEqual([1,3,3]);
    const current=fresh.readVerifiedSession(session.id)!;expect({...current,reviewToken:session.reviewToken}).toEqual(session);expect(oldRows(fresh).history).toEqual(baseline.history);
  });

  it('rejects a missing actual referenced source chunk on read, backup and restore without overwriting either target',async()=>{
    expect(hash(createBytes)).toBe(createBytesSha);
    const directory=ownedDirectory('missing-chunk');writeFileSync(join(directory,'customers.sqlite'),createBytes);const faulty=await open(directory),saved=faulty.readCulturalComparison(created.currentHead.id),chunk=saved.capsule.assets[0]?.chunks[0]?.blob;
    if(!chunk)throw Error('A genuine nonempty source chunk reference is required');const before=disk(faulty);faulty.db.run('DELETE FROM snapshot_blobs WHERE sha=?',[chunk.sha]);
    expect(()=>faulty.readCulturalComparison(created.currentHead.id)).toThrow();expect(()=>faulty.backupBytes()).toThrow();expect(disk(faulty).equals(before)).toBe(true);
    const malformed=encodeCustomerBackup(faulty.db.export()),target=await open(),targetBefore=disk(target);expect(()=>target.prepareCustomerRestore(malformed)).toThrow();expect(disk(target).equals(targetBefore)).toBe(true);expect(readFileSync(migrationPreimage).equals(beforeMigration)).toBe(true);
    expect(hash(createBytes)).toBe(createBytesSha);
  });
});
