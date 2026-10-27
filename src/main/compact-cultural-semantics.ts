import type {Database,SqlValue} from 'sql.js';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {isAbsolute,join} from 'node:path';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {ownCulturalJson,culturalCanonicalJson} from '../domain/qimen-cultural-comparison-canonical';
import {compareQimenCultural} from '../domain/qimen-cultural-comparison';
import {prepareCulturalOfflineReplayV1} from './qimen-cultural-offline-v1';
import type {CulturalOfflineReplayAPI} from '../shared/qimen-cultural-offline-v1';
import type {CulturalHead,CulturalRevision,CulturalRevisionResult} from '../shared/cultural-storage-v3';
import type {CulturalEvidenceCapsule} from '../shared/cultural-source-chunks';
import type {NamingSession} from '../shared/types';
import {createCulturalEvidenceCodec,readCulturalEvidenceCapsule,readCulturalSourceChunkBlob} from './cultural-source-chunks';
import {decodeCulturalRevisionLeaf} from './cultural-revision-codec';
import {verifyCulturalSemanticBindings} from './cultural-semantic-verifier';
import {decodeCulturalWriteIdentity,culturalComparisonId} from './cultural-write-identity';
import {decodeSnapshotBlobText,SNAPSHOT_CODEC,SNAPSHOT_LEAF_MAX_BYTES,snapshotSha,type SnapshotBlob} from './snapshot-blob-codec';
import {parseSnapshotJsonStrict} from './snapshot-json-spans';

const bad=():never=>{throw new Error('文化存储完整语义、来源或历史关联校验失败。');};
const hash=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const str=(v:unknown,max=8192):v is string=>typeof v==='string'&&v.length>0&&v.length<=max;
const integer=(v:unknown,min=1):v is number=>Number.isSafeInteger(v)&&Number(v)>=min;
const stamp=(v:unknown):v is string=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const same=(a:unknown,b:unknown):boolean=>culturalCanonicalJson(a)===culturalCanonicalJson(b);
const digest=(v:string)=>createHash('sha256').update(v,'utf8').digest('hex');
const MAX_ITEMS=50000,MAX_LEAVES=100000,MAX_UNIQUE=2*1024**3,MAX_LOGICAL=8*1024**3;
let preparation:Promise<void>|undefined;
let replay:CulturalOfflineReplayAPI|undefined,verify:CulturalOfflineReplayAPI['verify']|undefined;
interface CulturalSourceReplayScope {active:boolean;replays:Map<string,string>;}
let activeSourceReplayScope:CulturalSourceReplayScope|undefined;
declare const sourceReplayOperationBrand:unique symbol;
export interface CompactCulturalSourceReplayOperation {readonly [sourceReplayOperationBrand]:true;}
const sourceReplayScopes=new WeakMap<CompactCulturalSourceReplayOperation,CulturalSourceReplayScope>();
const sourceReplayScopeGet=Function.prototype.call.bind(WeakMap.prototype.get) as (map:typeof sourceReplayScopes,key:CompactCulturalSourceReplayOperation)=>CulturalSourceReplayScope|undefined;
const sourceReplayScopeSet=Function.prototype.call.bind(WeakMap.prototype.set) as (map:typeof sourceReplayScopes,key:CompactCulturalSourceReplayOperation,value:CulturalSourceReplayScope)=>unknown;
const sourceReplayScopeDelete=Function.prototype.call.bind(WeakMap.prototype.delete) as (map:typeof sourceReplayScopes,key:CompactCulturalSourceReplayOperation)=>unknown;
const SourceReplayMap=Map;
const sourceReplayGet=Function.prototype.call.bind(Map.prototype.get) as (map:Map<string,string>,key:string)=>string|undefined;
const sourceReplaySet=Function.prototype.call.bind(Map.prototype.set) as (map:Map<string,string>,key:string,value:string)=>unknown;
const sourceReplayClear=Function.prototype.call.bind(Map.prototype.clear) as (map:Map<string,string>)=>void;
/** Reuse only fixed-source authentication during one synchronous public restore
 * operation. A prepare and its later commit always receive different scopes. */
export function withCompactCulturalSourceReplayOperation<T>(body:(operation:CompactCulturalSourceReplayOperation)=>T):T{
 if(activeSourceReplayScope||typeof body!=='function'||types.isProxy(body))return bad();
 const operation=Object.freeze(Object.create(null)) as CompactCulturalSourceReplayOperation;
 const scope:CulturalSourceReplayScope={active:true,replays:new SourceReplayMap()};sourceReplayScopeSet(sourceReplayScopes,operation,scope);activeSourceReplayScope=scope;
 try{
  const result=body(operation);
  if(result!==null&&(typeof result==='object'||typeof result==='function')){
   let current:object|null=result as object,depth=0;
   while(current){
    if(depth++>70||types.isProxy(current))return bad();
    const then=Object.getOwnPropertyDescriptor(current,'then');
    if(then){if(!Object.hasOwn(then,'value')||typeof then.value==='function')return bad();break;}
    current=Object.getPrototypeOf(current) as object|null;
   }
  }
  return result;
 }finally{scope.active=false;try{sourceReplayClear(scope.replays);}finally{sourceReplayScopeDelete(sourceReplayScopes,operation);activeSourceReplayScope=undefined;}}
}
/** Prepare trusted installed code once. The runtime uses a process-owned OS
 * temp root, never the first customer's directory or a caller-supplied replay.
 * scratchRoot is accepted only as the fixed Store ABI configuration descriptor.
 */
export async function prepareCompactCulturalSemanticsV1(configuration:{scratchRoot:string}):Promise<void>{
 const config=ownCulturalJson<{scratchRoot:string}>(configuration);
 if(arguments.length!==1||!config||Object.keys(config).join('|')!=='scratchRoot'||!str(config.scratchRoot)||!isAbsolute(config.scratchRoot))return bad();
 if(!preparation)preparation=(async()=>{
  const runtimeRoot=mkdtempSync(join(tmpdir(),'naming-compact-cultural-'));
  const actual=await prepareCulturalOfflineReplayV1({scratchRoot:runtimeRoot});
  const slot=Object.getOwnPropertyDescriptor(actual,'verify');
  if(!slot||!Object.hasOwn(slot,'value')||typeof slot.value!=='function')return bad();
  replay=actual;verify=slot.value as CulturalOfflineReplayAPI['verify'];
 })();
 await preparation;
}
function* rows(db:Database,sql:string,args:SqlValue[]=[]):Generator<SqlValue[]>{const statement=db.prepare(sql);try{statement.bind(args);while(statement.step())yield statement.get();}finally{statement.free();}}
function one(db:Database,sql:string,args:SqlValue[]=[]):SqlValue[]|undefined{const statement=db.prepare(sql);try{statement.bind(args);return statement.step()?statement.get():undefined;}finally{statement.free();}}
function present(db:Database):boolean{return !!one(db,'SELECT 1 FROM cultural_comparisons LIMIT 1')||!!one(db,'SELECT 1 FROM cultural_comparison_revisions LIMIT 1')||!!one(db,'SELECT 1 FROM cultural_write_receipts LIMIT 1');}
function head(row:SqlValue[]):CulturalHead{
 const [id,profileId,sourceSessionId,currentRevision,reviewToken,createdAt]=row;
 if(typeof id!=='string'||!/^qc_[a-f0-9]{64}$/.test(id)||!str(profileId,300)||sourceSessionId!==null&&!str(sourceSessionId,1000)||!integer(currentRevision)||!str(reviewToken,1000)||!stamp(createdAt))return bad();
 return{id,profileId,sourceSessionId:sourceSessionId as string|null,currentRevision,reviewToken,createdAt};
}
function revision(row:SqlValue[]):CulturalRevision{
 const [comparisonId,number,profileId,parentRevision,operation,restoredFromRevision,capsuleSha,capsuleBytes,resultSha,resultBytes,createdAt]=row;
 if(typeof comparisonId!=='string'||!/^qc_[a-f0-9]{64}$/.test(comparisonId)||!integer(number)||!str(profileId,300)||!hash(capsuleSha)||!hash(resultSha)||!integer(capsuleBytes)||capsuleBytes>SNAPSHOT_LEAF_MAX_BYTES||!integer(resultBytes)||resultBytes>SNAPSHOT_LEAF_MAX_BYTES||!stamp(createdAt))return bad();
 if(number===1?(parentRevision!==null||operation!=='create'):(parentRevision!==number-1||!['revise','restore-revision'].includes(String(operation))))return bad();
 if(operation==='restore-revision'?(!integer(restoredFromRevision)||restoredFromRevision>=number):restoredFromRevision!==null)return bad();
 return{comparisonId,revision:number,profileId,parentRevision:parentRevision as number|null,operation:operation as CulturalRevision['operation'],restoredFromRevision:restoredFromRevision as number|null,capsule:{sha:capsuleSha,rawBytes:capsuleBytes,codec:SNAPSHOT_CODEC,role:'evidence'},result:{sha:resultSha,rawBytes:resultBytes,codec:SNAPSHOT_CODEC,role:'revision-result'},createdAt};
}
const HEAD_SQL='SELECT id,profile_id,source_session_id,current_revision,review_token,created_at FROM cultural_comparisons';
const REVISION_SQL='SELECT comparison_id,revision,profile_id,parent_revision,operation,restored_from_revision,capsule_sha,capsule_bytes,result_sha,result_bytes,created_at FROM cultural_comparison_revisions';
function generation(session:NamingSession):unknown{
 const p=session.profile;
 const birth={id:p.id,surname:p.surname,surnamePinyin:p.surnamePinyin,gender:p.gender,calendar:p.calendar,birthDate:p.birthDate,leapMonth:p.leapMonth,birthTime:p.birthTime,timeUnknown:p.timeUnknown,birthPlace:p.birthPlace,timezone:p.timezone,timeBasis:p.timeBasis??'civil',birthLongitude:p.birthLongitude??null,monthAuthorityMethod:p.monthAuthorityMethod??null,seasonalMethod:p.seasonalMethod??null,renMethod:p.renMethod??null};
 return{id:session.id,profileId:session.profileId,createdAt:session.createdAt,dataVersion:session.dataVersion,namingRules:session.namingRules??null,sourceSnapshot:session.sourceSnapshot??null,profile:birth,analysis:session.analysis,candidates:session.candidates.map(c=>({id:c.id,givenName:c.givenName,fullName:c.fullName,pinyin:c.pinyin,characters:c.characters,citations:c.citations,imageReading:c.imageReading??null}))};
}
export interface CompactCulturalScanOptions {signal?:AbortSignal;maxElapsedMs?:number;startedAt?:number;sourceReplayOperation?:CompactCulturalSourceReplayOperation;}
export interface CompactCulturalScanResult {revisionCount:number;logicalBytes:number;}
interface VerifiedComparison {head:CulturalHead;revisions:CulturalRevision[];}
interface ReadCapture {head:CulturalHead;revision:CulturalRevision;result:CulturalRevisionResult;capsule:CulturalEvidenceCapsule;}
/** Always scan actual SQL rows. No successful SQL validation verdict is cached and
 * no external validator, replay object, source lookup or expected-anchor DTO is
 * accepted. The caller has already checked exact physical /3 schema and FKs.
 */
function scan(db:Database,options:CompactCulturalScanOptions={},requested?:{id:string;revision?:number}):{stats:CompactCulturalScanResult;capture?:ReadCapture;listing?:CulturalRevision[]}{
 const sourceReplayOperation=options.sourceReplayOperation,sourceReplayScope=sourceReplayOperation===undefined?undefined:sourceReplayScopeGet(sourceReplayScopes,sourceReplayOperation);
 if(sourceReplayOperation!==undefined&&!sourceReplayScope)return bad();
 const started=options.startedAt??performance.now(),limit=options.maxElapsedMs??60000;
 if(!Number.isFinite(started)||!integer(limit)||limit>60000)return bad();
 const budget=()=>{if(sourceReplayScope&&(!sourceReplayScope.active||activeSourceReplayScope!==sourceReplayScope||sourceReplayScopeGet(sourceReplayScopes,sourceReplayOperation!)!==sourceReplayScope))return bad();if(options.signal?.aborted||performance.now()-started>limit)throw new Error('文化存储扫描已取消或超过60秒预算。');};budget();
 let logical=0,count=0,uniqueRaw=0;const leaves=new Map<string,number>();
 const charge=(bytes:number)=>{logical+=bytes;if(!integer(logical,0)||logical>MAX_LOGICAL)return bad();budget();};
 function leaf(sha:string,expected?:number):SnapshotBlob{
  budget();const value=one(db,'SELECT sha,raw_bytes,codec,payload FROM snapshot_blobs WHERE sha=?',[sha]);
  if(!value||value[0]!==sha||!hash(value[0])||!integer(value[1])||value[1]>SNAPSHOT_LEAF_MAX_BYTES||value[2]!==SNAPSHOT_CODEC||!types.isUint8Array(value[3])||expected!==undefined&&value[1]!==expected)return bad();
  const prior=leaves.get(sha);if(prior===undefined){leaves.set(sha,value[1]);uniqueRaw+=value[1];if(leaves.size>MAX_LEAVES||uniqueRaw>MAX_UNIQUE)return bad();}else if(prior!==value[1])return bad();
  return{sha,rawBytes:value[1],codec:SNAPSHOT_CODEC,payload:new Uint8Array(value[3] as Uint8Array)};
 }
 const codec=createCulturalEvidenceCodec(db),referencedCapsules=new Set<string>(),referencedResults=new Set<string>();
 const capsulesByDigest=new Map<string,{sha:string;rawBytes:number}>();
 // A restored revision can retain the exact same capsule and snapshot. Only
 // its fixed-source replay may be reused within this scan or one synchronous
 // restore operation; SQL leaves, payloads, semantic bindings and owner/session
 // checks still execute for every pair in every scan.
 const sourceReplays=sourceReplayScope?.replays??new SourceReplayMap<string,string>();
 const needsRuntime=()=>{if(!replay||!verify)return bad();const d=Object.getOwnPropertyDescriptor(replay,'verify');if(!d||!Object.hasOwn(d,'value')||d.value!==verify)return bad();};
 function offline(capsule:CulturalEvidenceCapsule,result:CulturalRevisionResult|undefined):void{
  needsRuntime();budget();
  const reconstructed=codec.decodeEvidenceFromSql(capsuleSql(capsule).sha,capsuleSql(capsule).rawBytes);
  const chunks=new Map<string,SnapshotBlob>();
  for(const asset of capsule.assets)for(const ref of asset.chunks){charge(ref.blob.rawBytes);if(!chunks.has(ref.blob.sha))chunks.set(ref.blob.sha,leaf(ref.blob.sha,ref.blob.rawBytes));}
  let snapshot=result?.snapshot;
  if(result){
   const semantic=verifyCulturalSemanticBindings({capsule,revision:result,sourceChunks:chunks});
   if(semantic.ownerProfileId!==result.profileId||semantic.sourceSessionId!==result.sourceSessionId||semantic.capsuleDigest!==capsule.capsuleDigest||semantic.materialDigest!==capsule.materialDigest)return bad();
  }else{
   const json=capsule.materialDescriptor.jsons.find(j=>j.id==='prepared-comparison');if(!json)return bad();
   const base=ownCulturalJson(parseSnapshotJsonStrict(json.exactUtf8Json));
   const derived=compareQimenCultural({...base as object,evidenceCapsuleDigest:capsule.materialDigest} as never);if(derived.kind!=='result')return bad();snapshot=derived.snapshot;
  }
  const actualSources=[...reconstructed.actualBlobsById].map(([id,bytes])=>[id,bytes.byteLength,snapshotSha(bytes)] as const).sort(([a],[b])=>a<b?-1:a>b?1:0);
  const material=capsule.materialDescriptor,sql=capsuleSql(capsule),replayKey=[sql.sha,sql.rawBytes,capsule.capsuleDigest,snapshot!.snapshotDigest,digest(culturalCanonicalJson(actualSources))].join(':');
  const snapshotJson=culturalCanonicalJson(snapshot),priorReplay=sourceReplayGet(sourceReplays,replayKey);
  if(priorReplay!==undefined&&priorReplay!==snapshotJson)return bad();
  if(priorReplay===undefined){
   const reply=verify!.call(replay,{material,blobs:[...reconstructed.actualBlobsById].map(([id,bytes])=>({id,bytes})),expectedSnapshot:snapshot!,expectedOwner:{profileId:material.ownerProfileId,sourceSessionId:material.sourceSessionId}});
   if(reply.kind!=='verified-replay'||reply.ownerProfileId!==material.ownerProfileId||reply.sourceSessionId!==material.sourceSessionId||reply.sourceRevision!==material.sourceRevision||reply.materialDigest!==capsule.materialDigest||reply.snapshotDigest!==snapshot!.snapshotDigest||reply.sourceDigest!==snapshot!.anchor.identity.sourceDigest||!same(reply.snapshot,snapshot))return bad();
  }budget();
  if(!one(db,'SELECT id FROM profiles WHERE id=?',[material.ownerProfileId]))return bad();
  if(material.sourceSessionId!==null){
   const current=one(db,'SELECT json FROM sessions WHERE id=?',[material.sourceSessionId]);if(!current||typeof current[0]!=='string')return bad();
   const currentSession=ownCulturalJson<NamingSession>(parseSnapshotJsonStrict(current[0]));
   const original=material.jsons.find(j=>j.id==='original-session');if(!original)return bad();
   const old=ownCulturalJson<NamingSession>(parseSnapshotJsonStrict(original.exactUtf8Json));
   if(currentSession.profileId!==material.ownerProfileId||currentSession.id!==material.sourceSessionId||!same(generation(currentSession),generation(old)))return bad();
  }
  if(priorReplay===undefined)sourceReplaySet(sourceReplays,replayKey,snapshotJson);
 }
 function capsuleSql(capsule:CulturalEvidenceCapsule):{sha:string;rawBytes:number}{const value=capsulesByDigest.get(capsule.capsuleDigest);if(!value)return bad();return value;}
 function decodeCapsule(sha:string,bytes:number):CulturalEvidenceCapsule{
  charge(bytes);const value=readCulturalEvidenceCapsule(parseSnapshotJsonStrict(decodeSnapshotBlobText(leaf(sha,bytes)),SNAPSHOT_LEAF_MAX_BYTES));
  const old=capsulesByDigest.get(value.capsuleDigest);if(old&&(old.sha!==sha||old.rawBytes!==bytes))return bad();capsulesByDigest.set(value.capsuleDigest,{sha,rawBytes:bytes});return value;
 }
 function pair(r:CulturalRevision):{result:CulturalRevisionResult;capsule:CulturalEvidenceCapsule}{
  budget();const capsule=decodeCapsule(r.capsule.sha,r.capsule.rawBytes);charge(r.result.rawBytes);const result=decodeCulturalRevisionLeaf(leaf(r.result.sha,r.result.rawBytes));
  if(result.comparisonId!==r.comparisonId||result.revision!==r.revision||result.profileId!==r.profileId||result.createdAt!==r.createdAt||result.operation!==r.operation||result.restoredFromRevision!==r.restoredFromRevision)return bad();
  offline(capsule,result);referencedCapsules.add(r.capsule.sha);referencedResults.add(r.result.sha);budget();return{result,capsule};
 }
 let capture:ReadCapture|undefined,listing:CulturalRevision[]|undefined;
 const heads=new Map<string,VerifiedComparison>();
 for(const row of rows(db,HEAD_SQL+' ORDER BY id')){budget();const h=head(row);if(heads.size>=MAX_ITEMS||heads.has(h.id)||!one(db,'SELECT id FROM profiles WHERE id=?',[h.profileId]))return bad();if(h.sourceSessionId!==null&&one(db,'SELECT profile_id FROM session_records WHERE id=?',[h.sourceSessionId])?.[0]!==h.profileId)return bad();heads.set(h.id,{head:h,revisions:[]});}
 const receiptsExpected=new Map<string,{head:CulturalHead;revision:CulturalRevision;sourceRevision:string;snapshotDigest:string;capsuleDigest:string;noteSha:string;anchor:unknown}>();
 for(const row of rows(db,REVISION_SQL+' ORDER BY comparison_id,revision')){
  if(++count>MAX_ITEMS)return bad();budget();const r=revision(row),group=heads.get(r.comparisonId);if(!group||r.profileId!==group.head.profileId||r.revision!==group.revisions.length+1)return bad();
  const {result,capsule}=pair(r);if(result.sourceSessionId!==group.head.sourceSessionId)return bad();
  const key=r.comparisonId+':'+r.revision,anchor=result.snapshot.anchor;
  // A new live preview gets a new handle/source revision after each commit;
  // the verified birth/chart identity must remain the same across revisions.
  const first=receiptsExpected.get(r.comparisonId+':1');if(first&&!same((first.anchor as typeof anchor).identity,anchor.identity))return bad();
  if(r.revision===1&&group.head.createdAt!==r.createdAt)return bad();
  if(r.operation==='restore-revision'){
   const target=group.revisions[r.restoredFromRevision!-1];if(!target)return bad();
   const restored=decodeCulturalRevisionLeaf(leaf(target.result.sha,target.result.rawBytes));
   if(target.capsule.sha!==r.capsule.sha||!same(restored.snapshot,result.snapshot)||restored.note!==result.note)return bad();
  }
  group.revisions.push(r);receiptsExpected.set(key,{head:group.head,revision:r,sourceRevision:capsule.materialDescriptor.sourceRevision,snapshotDigest:result.snapshot.snapshotDigest,capsuleDigest:capsule.capsuleDigest,noteSha:digest(result.note),anchor});
  if(requested?.id===r.comparisonId&&(requested.revision??group.head.currentRevision)===r.revision)capture={head:group.head,revision:r,result,capsule};
 }
 for(const group of heads.values()){if(!group.revisions.length||group.head.currentRevision!==group.revisions.length)return bad();if(requested?.id===group.head.id)listing=group.revisions;}
 const received=new Set<string>();let receiptCount=0;
 for(const row of rows(db,'SELECT profile_id,idempotency_key,request_json,request_sha,comparison_id,result_revision,created_at FROM cultural_write_receipts ORDER BY profile_id,idempotency_key')){
  budget();if(++receiptCount>MAX_ITEMS)return bad();const [owner,key,json,requestSha,id,rev,created]=row;
  if(!str(owner,300)||!str(key,1000)||typeof json!=='string'||!hash(requestSha)||!str(id)||!integer(rev)||!stamp(created))return bad();
  const expected=receiptsExpected.get(id+':'+rev);if(!expected||received.has(id+':'+rev))return bad();const request=decodeCulturalWriteIdentity(json,requestSha),r=expected.revision;
  if(created!==r.createdAt||owner!==r.profileId||request.profileId!==owner||request.comparisonId!==id||request.operation!==r.operation||request.sourceSessionId!==expected.head.sourceSessionId||request.sourceRevision!==expected.sourceRevision||request.capsuleSha!==r.capsule.sha||request.snapshotDigest!==expected.snapshotDigest||request.noteSha256!==expected.noteSha||request.restoredFromRevision!==r.restoredFromRevision||request.expectedRevision!==(r.revision===1?null:r.revision-1))return bad();
  if(r.revision===1&&culturalComparisonId(owner,key)!==id)return bad();received.add(id+':'+rev);
 }
 if(received.size!==receiptsExpected.size)return bad();
 // Preserve and authenticate orphan typed leaves too. Orphans are never GC'd,
 // ignored because no head points at them, or treated as source-authorized JSON.
 for(const row of rows(db,'SELECT sha,raw_bytes FROM snapshot_blobs ORDER BY sha')){
  budget();if(!hash(row[0])||!integer(row[1]))return bad();const blob=leaf(row[0],row[1]);const value=parseSnapshotJsonStrict(decodeSnapshotBlobText(blob),SNAPSHOT_LEAF_MAX_BYTES) as {schema?:unknown};
  if(value&&typeof value==='object'&&!Array.isArray(value)&&typeof value.schema==='string'){
   if(value.schema==='qimen-cultural-evidence/1.1.0'){
    const capsule=readCulturalEvidenceCapsule(value);const old=capsulesByDigest.get(capsule.capsuleDigest);if(old&&(old.sha!==blob.sha||old.rawBytes!==blob.rawBytes))return bad();capsulesByDigest.set(capsule.capsuleDigest,{sha:blob.sha,rawBytes:blob.rawBytes});
   }else if(value.schema==='qimen-cultural-source-chunk/1.0.0')readCulturalSourceChunkBlob(blob);
   else if(value.schema.startsWith('qimen-cultural-evidence/')||value.schema.startsWith('qimen-cultural-source-chunk/'))return bad();
  }
 }
 for(const item of capsulesByDigest.values())if(!referencedCapsules.has(item.sha)){const c=decodeCapsule(item.sha,item.rawBytes);offline(c,undefined);}
 for(const row of rows(db,'SELECT sha,raw_bytes FROM snapshot_blobs ORDER BY sha')){
  budget();if(!hash(row[0])||!integer(row[1])||referencedResults.has(row[0]))continue;
  const blob=leaf(row[0],row[1]),value=parseSnapshotJsonStrict(decodeSnapshotBlobText(blob),SNAPSHOT_LEAF_MAX_BYTES) as {schema?:unknown};
  if(value&&typeof value==='object'&&!Array.isArray(value)&&typeof value.schema==='string'&&value.schema.startsWith('qimen-cultural-revision/')){
   const result=decodeCulturalRevisionLeaf(blob),link=capsulesByDigest.get(result.capsuleDigest);if(!link)return bad();const c=decodeCapsule(link.sha,link.rawBytes);charge(blob.rawBytes);offline(c,result);
  }
 }
 budget();return{stats:{revisionCount:count,logicalBytes:logical},capture,listing};
}
export function assertCompactCulturalSemanticsV1(db:Database,options:CompactCulturalScanOptions={}):CompactCulturalScanResult{return scan(db,options).stats;}
export function readCompactCulturalComparisonV1(db:Database,id:string,number?:number):ReadCapture{
 if(!str(id)||number!==undefined&&!integer(number))return bad();const result=scan(db,{}, {id,revision:number}).capture;if(!result)throw new Error('未找到指定文化比较修订。');return ownCulturalJson<ReadCapture>(result);
}
export function listCompactCulturalRevisionsV1(db:Database,id:string):CulturalRevision[]{
 if(!str(id))return bad();const result=scan(db,{}, {id}).listing;if(!result)throw new Error('未找到文化比较。');return ownCulturalJson<CulturalRevision[]>([...result].reverse());
}
/** Copy after old sessions/history/blob objects are installed. Delayed cyclic
 * owner/head revision FKs remain active and commit as one complete transaction. */
export function copyCompactCulturalRowsV1(source:Database,target:Database,options:CompactCulturalScanOptions={}):void{
 const sourceVersion=one(source,'SELECT version FROM compact_meta')?.[0],targetVersion=one(target,'SELECT version FROM compact_meta')?.[0];
 if(sourceVersion!=='customer-compact/3')return;
 if(targetVersion!=='customer-compact/3')return bad();assertCompactCulturalSemanticsV1(source,options);
 for(const table of ['cultural_comparisons','cultural_comparison_revisions','cultural_write_receipts'])if(one(target,'SELECT 1 FROM '+table+' LIMIT 1'))return bad();
 target.run('BEGIN');try{
  for(const row of rows(source,HEAD_SQL+' ORDER BY rowid'))target.run('INSERT INTO cultural_comparisons VALUES(?,?,?,?,?,?)',row);
  for(const row of rows(source,REVISION_SQL+' ORDER BY comparison_id,revision'))target.run('INSERT INTO cultural_comparison_revisions VALUES(?,?,?,?,?,?,?,?,?,?,?)',row);
  for(const row of rows(source,'SELECT profile_id,idempotency_key,request_json,request_sha,comparison_id,result_revision,created_at FROM cultural_write_receipts ORDER BY rowid'))target.run('INSERT INTO cultural_write_receipts VALUES(?,?,?,?,?,?,?)',row);
  assertCompactCulturalSemanticsV1(target,options);target.run('COMMIT');
 }catch(error){target.run('ROLLBACK');throw error;}
}
