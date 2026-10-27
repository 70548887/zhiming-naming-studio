import {isDeepStrictEqual} from 'node:util';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import type {NamingSession,NameCandidate} from '../shared/types';
import {MODERN_PRACTICAL_VERSION,validModernRecord,assertModernPlainData} from '../shared/modern-practical-evidence';
import type {ModernPracticalEvidenceRecord} from '../shared/modern-practical-evidence';
import {captureValidatedModernSession,buildModernPracticalEvidence} from './modern-practical-core';

// Main-only capabilities are created from server-derived records, never request bodies.
const authorizations=new WeakMap<NamingSession,{candidateIds:string[];kind:'record'|'clear'|'history';records:Map<string,unknown>}>();
export const MODERN_SESSION_RECORD_BUDGET=1500000;
/** Preserve the old2MB review budget for original fields; separate report bytes must not eat it. */
export function modernRecordBytes(session:Pick<NamingSession,'candidates'>){return session.candidates.reduce((sum,candidate)=>sum+(Object.hasOwn(candidate,'modernPracticalEvidence')?JSON.stringify(candidate.modernPracticalEvidence).length:0),0);}
export function originalReviewBytes(session:NamingSession){return JSON.stringify({...session,candidates:session.candidates.map(candidate=>{const copy={...candidate};delete copy.modernPracticalEvidence;return copy;})}).length;}
function stable(value:unknown):string{assertModernPlainData(value);const visit=(v:any):string=>Array.isArray(v)?'['+v.map(visit).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+visit(v[k])).join(',')+'}':JSON.stringify(v);return visit(value);}
const hash=(value:unknown)=>createHash('sha256').update(stable(value)).digest('hex');
function captureIdentity(session:NamingSession,candidate:NameCandidate){return {sessionId:session.id,candidateId:candidate.id,reviewRevision:session.reviewRevision??0,reviewToken:session.reviewToken??null,dataVersion:session.dataVersion,datasetSha256:session.factVerification?.datasetSha256??'',characterSha256:hash(candidate.characters),sourceSnapshotSha256:hash(session.sourceSnapshot??null)};}
export function verifyModernMethodResource(dataDir:string){
 let bytes:Buffer;try{bytes=readFileSync(join(dataDir,'modern-method-references.json'));}catch{throw new Error('现代说明方法资料缺失，未写入；请检查应用资料是否完整。');}
 if(createHash('sha256').update(bytes).digest('hex')!==EXPECTED_METHOD_SHA256)throw new Error('现代说明方法资料与固定版本不一致，未写入。');
}
const EXPECTED_METHOD_SHA256='d9659d48d0857426180ece79f6958b753729cf991d375ce8e2e340d1063ff6c7';
export function createModernRecord(session:NamingSession,candidateId:string):ModernPracticalEvidenceRecord {
 const input=captureValidatedModernSession(session,candidateId),evidence=buildModernPracticalEvidence(input);
 if(evidence.status!=='recorded-evidence')throw new Error('该历史方案缺少已核原知识包，不能生成现代事实说明。');
 const candidate=session.candidates.find(c=>c.id===candidateId)!;
 return {version:MODERN_PRACTICAL_VERSION,recordState:'recorded',recordedAt:new Date().toISOString(),basis:{meaning:candidate.meaning},capture:captureIdentity(session,candidate),evidence};
}
export function verifySessionModernRecords(session:NamingSession,dataDir:string,witnesses:()=>NamingSession[]){
 if(modernRecordBytes(session)>MODERN_SESSION_RECORD_BUDGET)throw new Error('本方案现代说明记录已达容量上限；未覆盖或删除历史记录。');
 let savedWitnesses:NamingSession[]|undefined;
 for(const candidate of session.candidates){
  const descriptor=Object.getOwnPropertyDescriptor(candidate,'modernPracticalEvidence');if(!descriptor)continue;
  if(!('value'in descriptor)||!validModernRecord(descriptor.value))throw new Error('现代说明保存结构无效，原记录保留。');
  const record=descriptor.value;
  if(record.version!==MODERN_PRACTICAL_VERSION)continue; // opaque future version is retained, never rendered/adopted.
  verifyModernMethodResource(dataDir);
  const known=record as ModernPracticalEvidenceRecord,original=structuredClone(session),originalCandidate=original.candidates.find(row=>row.id===candidate.id)!;
  const identity=captureIdentity(session,candidate),{reviewRevision:_r,reviewToken:_t,...immutable}=identity;
  const {reviewRevision:capturedRevision,reviewToken:capturedToken,...capturedImmutable}=known.capture;
  if(!isDeepStrictEqual(immutable,capturedImmutable)||capturedRevision>(session.reviewRevision??0))throw new Error('现代说明捕获的方案、候选、修订或字条/来源身份不一致。');
  originalCandidate.meaning=known.basis.meaning;delete originalCandidate.modernPracticalEvidence;
  const expected=buildModernPracticalEvidence(captureValidatedModernSession(original,candidate.id));
  if(!isDeepStrictEqual(known.evidence,expected))throw new Error('现代说明与保存时的字条、原包、方法或输入不一致；过期不等于伪造，原数据保留。');
  savedWitnesses??=witnesses();
  const matched=savedWitnesses.some(witness=>{
   if(witness.id!==known.capture.sessionId||witness.dataVersion!==session.dataVersion||(witness.reviewRevision??0)!==capturedRevision||(witness.reviewToken??null)!==capturedToken)return false;
   const selected=witness.candidates?.find(row=>row.id===candidate.id);if(!selected||selected.meaning!==known.basis.meaning)return false;
   // The witness comes from the same stored session/history, not a request body.
   // Replay against the currently verified original package, not a witness flag.
   const replay=structuredClone(witness);replay.factVerification=structuredClone(session.factVerification);
   try{return isDeepStrictEqual(buildModernPracticalEvidence(captureValidatedModernSession(replay,candidate.id)),known.evidence);}catch{return false;}
  });
  if(!matched)throw new Error('现代说明捕获的修订凭据或原寓意在该方案保存历史中不存在。');
  // A witness improves tamper detection, not cryptographic authorship. A fully
  // self-consistent offline rewrite of unsigned JSON/history cannot be proven original.
 }
}
function value(candidate:NameCandidate){return Object.getOwnPropertyDescriptor(candidate,'modernPracticalEvidence');}
export function assertUnchangedModernRecord(next:NameCandidate,previous:NameCandidate){
 const a=value(next),b=value(previous);
 if(a&&!('value'in a)||b&&!('value'in b))throw new Error('现代说明不接受访问器。');
 if(!!a!==!!b||a&&b&&!isDeepStrictEqual(a.value,b.value))throw new Error('现代说明只能使用专用生成或清除动作，普通审阅不得嫁接、修改或删除。');
}
export function authorizeModernMutation(session:NamingSession,candidateId:string,kind:'record'|'clear'){
 if(!session.candidates.some(c=>c.id===candidateId))throw new Error('现代说明候选不存在。');
 authorizations.set(session,{candidateIds:[candidateId],kind,records:new Map([[candidateId,structuredClone(session.candidates.find(c=>c.id===candidateId)!.modernPracticalEvidence??null)]])});
}
export function authorizeModernHistory(session:NamingSession,revision:NamingSession){
 if(session.id!==revision.id||session.profileId!==revision.profileId)throw new Error('现代说明历史归属不一致。');
 for(const candidate of session.candidates){const source=revision.candidates.find(c=>c.id===candidate.id);if(!source)throw new Error('现代说明历史候选不一致。');assertUnchangedModernRecord(candidate,source);}
 authorizations.set(session,{candidateIds:session.candidates.map(c=>c.id),kind:'history',records:new Map(session.candidates.map(c=>[c.id,structuredClone(c.modernPracticalEvidence??null)]))});
}
export function transferModernAuthorization(from:NamingSession,to:NamingSession){
 const token=authorizations.get(from);if(!token)return;
 // Transfer is the narrow hand-off from an authorized main-process object to
 // its exact detached clone. It cannot authorize a different draft or replace
 // an independent operation already associated with the destination object.
 if(from===to)throw new Error('现代说明授权转移需要独立复制的保存对象。');
 if(authorizations.has(to))throw new Error('现代说明目标对象已有独立授权，不能覆盖。');
 if(!isDeepStrictEqual(from,to))throw new Error('现代说明授权只能转移至内容完全一致的复制对象。');
 authorizations.delete(from);authorizations.set(to,token);
}
export function assertModernTransition(previous:NamingSession|undefined,next:NamingSession){
 const token=authorizations.get(next);authorizations.delete(next);
 if(!previous){if(next.candidates.some(c=>value(c)))throw new Error('现代说明必须对已经保存的候选显式生成，不能从客户端附带。');return;}
 for(const candidate of next.candidates){
  const old=previous.candidates.find(c=>c.id===candidate.id);if(!old)throw new Error('现代说明候选归属无效。');
  if(token?.candidateIds.includes(candidate.id)){
   if(!isDeepStrictEqual(candidate.modernPracticalEvidence??null,token.records.get(candidate.id)))throw new Error('现代说明专用事务授权后的记录被替换，未保存。');
   if(token.kind==='clear'&&value(candidate))throw new Error('现代说明清除结果无效。');
   if(token.kind==='record'&&(!candidate.modernPracticalEvidence||candidate.modernPracticalEvidence.version!==MODERN_PRACTICAL_VERSION))throw new Error('现代说明生成结果无效。');
   if(token.kind==='record'){
    const captured=candidate.modernPracticalEvidence as ModernPracticalEvidenceRecord;
    if(captured.capture.reviewRevision!==(previous.reviewRevision??0)||captured.capture.reviewToken!==(previous.reviewToken??null)||captured.basis.meaning!==old.meaning)throw new Error('现代说明没有捕获锁内当前修订及原寓意，未保存。');
   }
  }else assertUnchangedModernRecord(candidate,old);
 }
}
export function assertModernInput(session:unknown){
 if(!session||typeof session!=='object')return;
 const descriptor=Object.getOwnPropertyDescriptor(session,'candidates');if(descriptor&&!('value'in descriptor))throw new Error('候选字段不接受访问器。');
 if(!Array.isArray(descriptor?.value))return;
 for(const candidate of descriptor.value){if(!candidate||typeof candidate!=='object')continue;const record=Object.getOwnPropertyDescriptor(candidate,'modernPracticalEvidence');if(!record)continue;if(!('value'in record))throw new Error('现代说明不接受访问器。');assertModernPlainData(record.value);}
}
