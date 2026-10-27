import {isDeepStrictEqual} from 'node:util';
import {snapshotApplicationJson} from './project-application-v132-r2-json';
import {captureCandidate2ReviewInput} from './candidate2-review-input';
import type {Candidate2AdoptedNamingSessionV2} from '../shared/candidate2-generation-adoption-v2';
import type {Candidate2ReviewChanges} from '../shared/candidate2-review-api';

function reject():never {throw Error('CANDIDATE2_HISTORY_IDENTITY_INVALID: current and selected native history must retain the same immutable C2 facts');}
const immutable=['id','profileId','createdAt','profile','analysis','originalFavorable','dataVersion','sourceSnapshot','namingRules','candidate2Naming'] as const;
function candidateFacts(candidate:Candidate2AdoptedNamingSessionV2['candidates'][number]){
 const {meaning:_meaning,reason:_reason,traditionalReason:_traditionalReason,reviewNote:_note,favorite:_favorite,warnings:_warnings,...facts}=candidate;
 return facts;
}

/** Pure whitelist projection, never stored-origin authority. Store invokes it
 * only after authenticating both exact native rows in its own writer scope. */
export function projectCandidate2HistoryReview(current:Candidate2AdoptedNamingSessionV2,historical:Candidate2AdoptedNamingSessionV2):Candidate2ReviewChanges {
 // Preserve the existing per-session copier budget. Combining two legitimate
 // records into one tree would accidentally halve their usable text capacity.
 const a=snapshotApplicationJson(current) as Candidate2AdoptedNamingSessionV2;
 const b=snapshotApplicationJson(historical) as Candidate2AdoptedNamingSessionV2;
 if(!a||!b||a.candidate2Naming?.schema!=='candidate2-naming-session/1'||b.candidate2Naming?.schema!=='candidate2-naming-session/1'||immutable.some(key=>!isDeepStrictEqual(a[key],b[key])))reject();
 const {preferredElements:_currentManual,...currentPreferences}=a.preferences;
 const {preferredElements:_historicalManual,...historicalPreferences}=b.preferences;
 if(!isDeepStrictEqual(currentPreferences,historicalPreferences)||!Array.isArray(a.candidates)||!Array.isArray(b.candidates)||a.candidates.length!==b.candidates.length||a.candidates.some((candidate,index)=>candidate.id!==b.candidates[index].id||!isDeepStrictEqual(candidateFacts(candidate),candidateFacts(b.candidates[index]))))reject();
 const patch={reviewNote:b.reviewNote,preferredElements:[...b.preferences.preferredElements],candidates:b.candidates.map(candidate=>({id:candidate.id,meaning:candidate.meaning,reason:candidate.reason,traditionalReason:candidate.traditionalReason,reviewNote:candidate.reviewNote,favorite:candidate.favorite}))};
 // The normal review raw boundary retains the existing whitelist and budgets.
 // Current CAS is validated again by the native operation before applying it.
 return captureCandidate2ReviewInput(a.id,patch,a.reviewRevision,a.reviewToken).changes;
}
