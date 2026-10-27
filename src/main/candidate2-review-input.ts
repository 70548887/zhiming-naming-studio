import {snapshotApplicationJson} from './project-application-v132-r2-json';
import {validReviewRevision,validReviewToken} from '../shared/review-version';
import type {Candidate2ReviewChanges} from '../shared/candidate2-review-api';

export interface Candidate2ReviewInput {
 sessionId:string;changes:Candidate2ReviewChanges;expectedRevision:number;expectedToken:string;
}
const texts=['meaning','reason','traditionalReason','reviewNote'] as const;
function fail(detail:string):never {
 throw Object.assign(new Error('CANDIDATE2_REVIEW_INPUT_INVALID: '+detail),{code:'CANDIDATE2_REVIEW_INPUT_INVALID'});
}
function exact(value:unknown,keys:readonly string[]):asserts value is Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||keys.some(key=>!Object.hasOwn(value,key)))fail('exact review fields required');
}

/** Raw review intent only. The native Store alone binds candidate identity,
 * order, count, CAS and persistence to its current authenticated session. */
export function captureCandidate2ReviewInput(sessionId:unknown,changes:unknown,expectedRevision:unknown,expectedToken:unknown):Candidate2ReviewInput {
 if(arguments.length!==4)fail('exactly session id, changes, revision and token required');
 const request=snapshotApplicationJson({sessionId,changes,expectedRevision,expectedToken}) as Record<string,unknown>;
 if(typeof request.sessionId!=='string'||!/^c2s_[a-f0-9]{32}$/.test(request.sessionId))fail('native C2 session id required');
 if(typeof request.expectedRevision!=='number'||!validReviewRevision(request.expectedRevision))fail('explicit safe review revision required');
 if(typeof request.expectedToken!=='string'||!validReviewToken(request.expectedToken))fail('explicit review token required');
 const patch=request.changes;exact(patch,['reviewNote','preferredElements','candidates']);
 if(typeof patch.reviewNote!=='string'||patch.reviewNote.length>100000)fail('bounded review note required');
 if(!Array.isArray(patch.preferredElements)||patch.preferredElements.length>5||patch.preferredElements.some(element=>!['木','火','土','金','水'].includes(element))||new Set(patch.preferredElements).size!==patch.preferredElements.length)fail('unique manual draft elements required');
 // Bounds are the existing M873 session-contract limits, not newly invented
 // capacity or permission. Native code must still compare every ID and slot.
 if(!Array.isArray(patch.candidates)||patch.candidates.length<1||patch.candidates.length>100)fail('bounded complete candidate review list required');
 for(const candidate of patch.candidates){
  exact(candidate,['id',...texts,'favorite']);
  if(typeof candidate.id!=='string'||candidate.id.length===0||candidate.id.length>8192||typeof candidate.favorite!=='boolean'||texts.some(key=>typeof candidate[key]!=='string'||(candidate[key] as string).length>100000))fail('bounded candidate review values required');
 }
 return request as unknown as Candidate2ReviewInput;
}
