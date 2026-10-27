import {snapshotApplicationJson} from './project-application-v132-r2-json';
import {validReviewRevision,validReviewToken} from '../shared/review-version';

export interface Candidate2HistoryRestoreInput {
 sessionId:string;revisionId:string;expectedRevision:number;expectedToken:string;
}
function invalid(detail:string):never {
 throw Object.assign(new Error('CANDIDATE2_HISTORY_INPUT_INVALID: '+detail),{code:'CANDIDATE2_HISTORY_INPUT_INVALID'});
}

/** References and explicit current CAS only. This owned shape authenticates no
 * historical row; the native writer must select and bind it when restoring. */
export function captureCandidate2HistoryRestoreInput(sessionId:unknown,revisionId:unknown,expectedRevision:unknown,expectedToken:unknown):Candidate2HistoryRestoreInput {
 if(arguments.length!==4)invalid('exactly session id, revision id, revision and token required');
 const request=snapshotApplicationJson({sessionId,revisionId,expectedRevision,expectedToken}) as Record<string,unknown>;
 if(typeof request.sessionId!=='string'||!/^c2s_[a-f0-9]{32}$/.test(request.sessionId))invalid('native C2 session id required');
 if(typeof request.revisionId!=='string'||request.revisionId.length>16||! /^[1-9][0-9]*$/.test(request.revisionId)||!Number.isSafeInteger(Number(request.revisionId))||String(Number(request.revisionId))!==request.revisionId)invalid('canonical positive native revision id required');
 if(typeof request.expectedRevision!=='number'||!validReviewRevision(request.expectedRevision))invalid('explicit safe current review revision required');
 if(typeof request.expectedToken!=='string'||!validReviewToken(request.expectedToken))invalid('explicit current review token required');
 return request as unknown as Candidate2HistoryRestoreInput;
}
