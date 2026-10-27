import {snapshotApplicationJson} from './project-application-v132-r2-json';
import {assertReviewRevision,validReviewRevision,validReviewToken} from '../shared/review-version';
import type {Candidate2ReportDocument,Candidate2ReportReference} from '../shared/candidate2-report-api';
import type {NamingSession,StudioSettings} from '../shared/types';
import {sessionReportFilename} from '../shared/session-catalog';
import {reportHTML} from './report';

function invalid(detail:string):never{throw Object.assign(new Error('CANDIDATE2_REPORT_INPUT_INVALID: '+detail),{code:'CANDIDATE2_REPORT_INPUT_INVALID'});}
export function captureCandidate2ReportInput(id:unknown,expectedReviewRevision:unknown,expectedReviewToken:unknown):Candidate2ReportReference{
 if(arguments.length!==3)invalid('exactly id, explicit review revision and token required');
 const request=snapshotApplicationJson({id,expectedReviewRevision,expectedReviewToken}) as Record<string,unknown>;
 if(typeof request.id!=='string'||!/^c2s_[a-f0-9]{32}$/.test(request.id))invalid('native current C2 id required');
 if(typeof request.expectedReviewRevision!=='number'||!validReviewRevision(request.expectedReviewRevision))invalid('explicit safe review revision required');
 if(typeof request.expectedReviewToken!=='string'||!validReviewToken(request.expectedReviewToken))invalid('explicit review token required');
 return request as unknown as Candidate2ReportReference;
}

/** Internal presentation step. The caller MUST be the native Store current
 * read operation, which seals the canonical row/source after this returns.
 * Shape/CAS checks here alone do not confer native/source authority. */
export function renderCandidate2ReportSource(session:NamingSession|undefined,settings:StudioSettings,request:Candidate2ReportReference):Omit<Candidate2ReportDocument,'source'|'writes'>{
 if(!session||session.id!==request.id)throw Object.assign(new Error('CANDIDATE2_REPORT_NOT_FOUND: current saved C2 record required'),{code:'CANDIDATE2_REPORT_NOT_FOUND'});
 const attachment=(session as NamingSession&{candidate2Naming?:{schema?:string}}).candidate2Naming;
 if(attachment?.schema!=='candidate2-naming-session/1'||!/^c2s_[a-f0-9]{32}$/.test(session.id))throw new Error('CANDIDATE2_REPORT_SOURCE_INVALID: verified candidate.2 record required');
 assertReviewRevision(session,request.expectedReviewRevision,request.expectedReviewToken);
 // No ordinary save/review/history operation, and no client-controlled HTML.
 const html=reportHTML(session,settings);
 return{schema:'candidate2-report-document/1',status:'ready',sessionId:session.id,reviewRevision:request.expectedReviewRevision,reviewToken:request.expectedReviewToken,filename:sessionReportFilename(session),html,traditionalStatus:'unknown'};
}
