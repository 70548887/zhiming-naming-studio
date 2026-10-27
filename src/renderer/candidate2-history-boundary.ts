import {canonicalPlainJson} from '../shared/plain-json';
import type {NamingSession,NameCandidate,SessionRevision} from '../shared/types';
import type {Candidate2HistoryRestoreSavedResult} from '../shared/candidate2-history-restore-api';
import {captureCandidate2ReviewBase,type Candidate2ReviewBase} from './candidate2-review-boundary';

const fail=():never=>{throw Error('历史记录不完整，或不属于当前方案的原始依据；当前资料与草稿保留。');};
const same=(left:unknown,right:unknown)=>canonicalPlainJson(left)===canonicalPlainJson(right);
const immutable=['id','profileId','createdAt','profile','analysis','originalFavorable','dataVersion','sourceSnapshot','namingRules','candidate2Naming'] as const;
function freeze<T>(value:T):T{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
function own<T>(raw:unknown):T{const text=canonicalPlainJson(raw);if(text.length>16*1024*1024)fail();return JSON.parse(text) as T;}
function exact(raw:unknown,keys:readonly string[]):asserts raw is Record<string,unknown>{if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).length!==keys.length||keys.some(key=>!Object.hasOwn(raw,key)))fail();}
function candidateFacts(candidate:NameCandidate){const {meaning,reason,traditionalReason,reviewNote,favorite,warnings,...facts}=candidate;void meaning;void reason;void traditionalReason;void reviewNote;void favorite;void warnings;return facts;}
function preferences(session:NamingSession){const {preferredElements,...rest}=session.preferences;void preferredElements;return rest;}
function sameFacts(current:Candidate2ReviewBase,historical:Candidate2ReviewBase){
 const a=current.session,b=historical.session;
 return immutable.every(key=>same(a[key],b[key]))&&same(preferences(a),preferences(b))&&a.candidates.length===b.candidates.length&&a.candidates.every((candidate,index)=>same(candidateFacts(candidate),candidateFacts(b.candidates[index])));
}
/** The existing history API returns native decimal row IDs. The renderer never
 * replaces that reference with an index, UUID, snapshot or numeric coercion. */
export function validCandidate2HistoryId(value:unknown):value is string{return typeof value==='string'&&value.length<=16&&/^[1-9][0-9]*$/.test(value)&&Number.isSafeInteger(Number(value))&&String(Number(value))===value;}

/** Per-record owned copies retain the existing session budget; combining the
 * complete array into one copier would reduce the usable per-session capacity.
 * This is renderer correlation only, never native historical-row authority. */
export function captureCandidate2HistoryRows(raw:unknown,current:Candidate2ReviewBase):SessionRevision[]{
 if(!Array.isArray(raw)||Object.getPrototypeOf(raw)!==Array.prototype)fail();
 const keys=Reflect.ownKeys(raw as unknown[]);if(keys.length!==(raw as unknown[]).length+1||keys.some(key=>typeof key!=='string'||key!=='length'&&!/^(0|[1-9]\d*)$/.test(key)))fail();
 const rows:SessionRevision[]=[],seen=new Set<string>();
 for(let index=0;index<(raw as unknown[]).length;index++){
  const slot=Object.getOwnPropertyDescriptor(raw,String(index));if(!slot||!slot.enumerable||!Object.hasOwn(slot,'value'))fail();
  const row=own<SessionRevision>((slot as PropertyDescriptor).value);exact(row,['id','sessionId','createdAt','session']);
  if(!validCandidate2HistoryId(row.id)||seen.has(row.id)||row.sessionId!==current.session.id||typeof row.createdAt!=='string'||!Number.isFinite(Date.parse(row.createdAt)))fail();
  const historical=captureCandidate2ReviewBase(row.session);if(!sameFacts(current,historical))fail();
  rows.push({id:row.id,sessionId:row.sessionId,createdAt:row.createdAt,session:historical.session});seen.add(row.id);
 }
 return freeze(rows);
}
function withoutReview(session:Candidate2ReviewBase['session']){
 const {reviewRevision,reviewToken,reviewNote,candidates,...rest}=session;void reviewRevision;void reviewToken;void reviewNote;
 return{...rest,preferences:preferences(session),candidates:candidates.map(candidateFacts)};
}
/** A saved reply may contain the selected row as authenticated at writer time,
 * which is not a renderer snapshot CAS. Only the actual native reply is owned
 * and returned; immutable current facts and original candidate order must hold. */
export function correlateCandidate2HistoryRestoreResult(raw:unknown,current:Candidate2ReviewBase):Candidate2ReviewBase|undefined{
 try{
  const result=own<Candidate2HistoryRestoreSavedResult>(raw);exact(result,['schema','status','session','traditionalStatus']);
  if(result.schema!=='candidate2-history-restore-saved/1'||result.status!=='saved'||result.traditionalStatus!=='unknown')return;
  const returned=captureCandidate2ReviewBase(result.session),a=current.session,b=returned.session;
  if(!same(withoutReview(a),withoutReview(b)))return;
  if(same(a,b))return returned;
  if(a.reviewRevision>=Number.MAX_SAFE_INTEGER-1||b.reviewRevision!==a.reviewRevision+1||b.reviewToken===a.reviewToken)return;
  return returned;
 }catch{return;}
}
