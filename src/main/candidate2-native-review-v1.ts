import {snapshotApplicationJson} from './project-application-v132-r2-json';
import {exactAdoption} from './candidate2-generation-adoption-codec-v2';
import {inspectCandidate2SessionBytes,manualDraftWarning} from './candidate2-session-contract-v1';
import type {Candidate2AdoptedNamingSessionV2} from '../shared/candidate2-generation-adoption-v2';

/** A review patch carries no original facts, proof, owner, paths or generation. */
export function applyCandidate2NativeReviewV1(previous:Candidate2AdoptedNamingSessionV2,raw:unknown):Candidate2AdoptedNamingSessionV2 {
 const patch=snapshotApplicationJson(raw) as Record<string,unknown>;
 exactAdoption(patch,['reviewNote','preferredElements','candidates']);
 if(typeof patch.reviewNote!=='string'||patch.reviewNote.length>100000||!Array.isArray(patch.preferredElements)||patch.preferredElements.length>5||patch.preferredElements.some(value=>!['木','火','土','金','水'].includes(value))||new Set(patch.preferredElements).size!==patch.preferredElements.length||!Array.isArray(patch.candidates)||patch.candidates.length!==previous.candidates.length)throw Error('CANDIDATE2_REVIEW_INVALID: exact bounded review fields required');
 // The strict copier returns deeply frozen evidence. A mutable review draft is
 // separate from that owned original; only this explicit whitelist is applied.
 const next=structuredClone(snapshotApplicationJson(previous)) as Candidate2AdoptedNamingSessionV2;
 next.reviewNote=patch.reviewNote;next.preferences.preferredElements=[...patch.preferredElements] as typeof next.preferences.preferredElements;
 for(let index=0;index<next.candidates.length;index++){
  const change=patch.candidates[index] as Record<string,unknown>,candidate=next.candidates[index];
  exactAdoption(change,['id','meaning','reason','traditionalReason','reviewNote','favorite']);
  if(change.id!==candidate.id||typeof change.favorite!=='boolean'||['meaning','reason','traditionalReason','reviewNote'].some(key=>typeof change[key]!=='string'||(change[key] as string).length>100000))throw Error('CANDIDATE2_REVIEW_INVALID: review order, identity or text differs');
  candidate.meaning=change.meaning as string;candidate.reason=change.reason as string;candidate.traditionalReason=change.traditionalReason as string;candidate.reviewNote=change.reviewNote as string;candidate.favorite=change.favorite;
  const original=next.candidate2Naming.generation.candidates[index];
  candidate.warnings=next.preferences.preferredElements.length?[...original.warnings,manualDraftWarning]:[...original.warnings];
 }
 inspectCandidate2SessionBytes(Buffer.from(JSON.stringify(next)));
 return next;
}
