import {canonicalPlainJson} from '../shared/plain-json';
import {validReviewRevision,validReviewToken} from '../shared/review-version';
import type {Element,NameCandidate} from '../shared/types';
import type {Candidate2ReviewChanges,Candidate2ReviewSavedResult} from '../shared/candidate2-review-api';
import type {Candidate2AdoptedNamingSessionV2} from '../shared/candidate2-generation-adoption-v2';
import {correlateCandidate2SavedResult} from './candidate2-generation-correlation';

export type Candidate2ReviewCandidateDraft=Candidate2ReviewChanges['candidates'][number];
export type Candidate2ReviewDraft=Candidate2ReviewChanges;
export interface Candidate2ReviewBase {session:Candidate2AdoptedNamingSessionV2;signature:string;draft:Candidate2ReviewDraft;}
/** Renderer-only response correlation. Neither this DTO nor its shape proves a
 * native Store write, source authenticity, or permission to review a record. */
export type Candidate2ReviewBoundaryResult=Candidate2ReviewSavedResult;

const manualDraftWarning='人工喜用选择已修改，此批候选保留生成时的用字依据；重新生成可应用新选择。';
const editable=['meaning','reason','traditionalReason','reviewNote','favorite'] as const;
const candidateDraftKeys=['id',...editable];
const sessionKeys=['id','profileId','createdAt','profile','preferences','analysis','candidates','reviewNote','originalFavorable','dataVersion','sourceSnapshot','namingRules','reviewRevision','reviewToken','candidate2Naming'];
const attachmentKeys=['schema','sessionBinding','request','generation','sourceCapsule','sourceWitnessDigest','sourceSnapshotDigest','attachmentDigest'];
const generationKeys=['schema','status','consumerVersion','profile','preferences','selection','baseAnalysis','application','dataIdentity','domainProjection','seed','excludeNames','candidates','messages','digest'];
function fail():never {throw Error('candidate.2 审阅输入或原方案边界不符；未采用返回内容。');}
function record(value:unknown):asserts value is Record<string,unknown> {if(!value||typeof value!=='object'||Array.isArray(value))fail();}
function exact(value:unknown,required:readonly string[],optional:readonly string[]=[]):asserts value is Record<string,unknown> {
 record(value);const keys=Object.keys(value);
 if(!required.every(key=>Object.hasOwn(value,key))||keys.some(key=>!required.includes(key)&&!optional.includes(key)))fail();
}
function freeze<T>(value:T):T {if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
function capture<T>(raw:unknown):T {
 // Inspect descriptors before reading data or invoking any serialization hooks.
 const json=canonicalPlainJson(raw);if(json.length>16*1024*1024)fail();
 return JSON.parse(json) as T;
}
const same=(left:unknown,right:unknown)=>canonicalPlainJson(left)===canonicalPlainJson(right);
function text(value:unknown):asserts value is string {if(typeof value!=='string'||value.length>100000)fail();}
function identifier(value:unknown):asserts value is string {if(typeof value!=='string'||!value.length||value.length>8192)fail();}
function elements(value:unknown):asserts value is Element[] {
 if(!Array.isArray(value)||value.length>5||new Set(value).size!==value.length||value.some(item=>!['木','火','土','金','水'].includes(item)))fail();
}
function candidateDraft(value:unknown):asserts value is Candidate2ReviewCandidateDraft {
 exact(value,candidateDraftKeys);identifier(value.id);
 for(const key of editable){if(key==='favorite'){if(typeof value[key]!=='boolean')fail();}else text(value[key]);}
}
function draftOf(session:Candidate2AdoptedNamingSessionV2):Candidate2ReviewDraft {
 return{reviewNote:session.reviewNote,preferredElements:[...session.preferences.preferredElements],candidates:session.candidates.map(candidate=>({id:candidate.id,meaning:candidate.meaning,reason:candidate.reason,traditionalReason:candidate.traditionalReason,reviewNote:candidate.reviewNote,favorite:candidate.favorite}))};
}
function immutableCandidate(candidate:NameCandidate):Record<string,unknown> {
 const result:Record<string,unknown>={...candidate};for(const key of [...editable,'warnings'])delete result[key];return result;
}
function warnings(session:Candidate2AdoptedNamingSessionV2,index:number):string[] {
 const original=session.candidate2Naming.generation.candidates[index].warnings;
 return session.preferences.preferredElements.length?[...original,manualDraftWarning]:[...original];
}
function assertSession(session:Candidate2AdoptedNamingSessionV2){
 exact(session,sessionKeys,['factVerification']);
 if(typeof session.id!=='string'||!/^c2s_[a-f0-9]{32}$/.test(session.id)||typeof session.reviewRevision!=='number'||!validReviewRevision(session.reviewRevision)||typeof session.reviewToken!=='string'||!validReviewToken(session.reviewToken))fail();
 exact(session.candidate2Naming,attachmentKeys);const attachment=session.candidate2Naming,generation=attachment.generation;
 exact(attachment.sessionBinding,['sessionId','profileId','createdAt']);exact(attachment.request,['schema','profile','preferences','selection']);exact(generation,generationKeys);
 if(!same(attachment.sessionBinding,{sessionId:session.id,profileId:session.profileId,createdAt:session.createdAt}))fail();
 if(!Array.isArray(session.candidates)||!Array.isArray(generation.candidates)||session.candidates.length!==generation.candidates.length)fail();
 text(session.reviewNote);elements(session.preferences?.preferredElements);
 if(!same({...session.preferences,preferredElements:generation.preferences?.preferredElements},generation.preferences))fail();
 const ids=new Set<string>();
 for(const [index,candidate] of session.candidates.entries()){
  const draft={id:candidate.id,...Object.fromEntries(editable.map(key=>[key,candidate[key]]))};candidateDraft(draft);
  if(ids.has(candidate.id)||!same(immutableCandidate(candidate),immutableCandidate(generation.candidates[index]))||!same(candidate.warnings,warnings(session,index)))fail();ids.add(candidate.id);
 }
 // Validate all immutable generation/session facts with the existing renderer
 // shape/correlation gate. This temporary validation projection restores only
 // native-allowed review fields; the projection is never returned as a session.
 const generationView={...session,reviewNote:'',preferences:{...session.preferences,preferredElements:generation.preferences.preferredElements},candidates:session.candidates.map((candidate,index)=>({...candidate,...Object.fromEntries(editable.map(key=>[key,generation.candidates[index][key]])),warnings:generation.candidates[index].warnings}))};
 const checked=correlateCandidate2SavedResult({schema:'candidate2-generate-saved/1',status:'saved',session:generationView,messages:generation.messages,traditionalStatus:'unknown'},{profile:attachment.request.profile,preferences:attachment.request.preferences});
 if(!checked)fail();
}

export function captureCandidate2ReviewBase(raw:unknown):Candidate2ReviewBase {
 const session=capture<Candidate2AdoptedNamingSessionV2>(raw);assertSession(session);
 return freeze({session,signature:canonicalPlainJson(session),draft:draftOf(session)});
}
export function captureCandidate2ReviewDraft(base:Candidate2ReviewBase,raw:unknown):Candidate2ReviewDraft {
 const draft=capture<Candidate2ReviewDraft>(raw);exact(draft,['reviewNote','preferredElements','candidates']);text(draft.reviewNote);elements(draft.preferredElements);
 if(!Array.isArray(draft.candidates)||draft.candidates.length!==base.session.candidates.length)fail();
 draft.candidates.forEach((candidate,index)=>{candidateDraft(candidate);if(candidate.id!==base.session.candidates[index].id)fail();});
 return freeze(draft);
}
function withoutCas(session:Candidate2AdoptedNamingSessionV2){const {reviewRevision:ignoredRevision,reviewToken:ignoredToken,...data}=session;void ignoredRevision;void ignoredToken;return data;}
export function correlateCandidate2ReviewResult(raw:unknown,base:Candidate2ReviewBase,draft:Candidate2ReviewDraft):Candidate2ReviewBoundaryResult|undefined {
 try{
  const result=capture<Candidate2ReviewBoundaryResult>(raw);exact(result,['schema','status','session','traditionalStatus']);
  if(result.schema!=='candidate2-review-saved/1'||result.status!=='saved'||result.traditionalStatus!=='unknown')return;
  if(base.signature!==canonicalPlainJson(base.session))return;
  const capturedDraft=captureCandidate2ReviewDraft(base,draft),returned=captureCandidate2ReviewBase(result.session).session;
  const expected=capture<Candidate2AdoptedNamingSessionV2>(base.session);
  expected.reviewNote=capturedDraft.reviewNote;expected.preferences.preferredElements=[...capturedDraft.preferredElements];
  expected.candidates=expected.candidates.map((candidate,index)=>({...candidate,...capturedDraft.candidates[index],warnings:warnings(expected,index)}));
  if(same(expected,base.session)){
   if(!same(returned,base.session))return;
  }else{
   if(base.session.reviewRevision>=Number.MAX_SAFE_INTEGER-1||returned.reviewRevision!==base.session.reviewRevision+1||returned.reviewToken===base.session.reviewToken||!same(withoutCas(returned),withoutCas(expected)))return;
  }
  // Return only the actual owned reply, never the local expected comparison.
  return freeze(result);
 }catch{return;}
}
