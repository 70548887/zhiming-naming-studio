import type {Candidate2AdoptedNamingSessionV2} from './candidate2-generation-adoption-v2';

export interface Candidate2HistoryRestoreSavedResult {
 schema:'candidate2-history-restore-saved/1';
 status:'saved';
 session:Candidate2AdoptedNamingSessionV2;
 traditionalStatus:'unknown';
}

export interface Candidate2HistoryRestoreAPI {
 restoreCandidate2History(sessionId:string,revisionId:string,expectedRevision:number,expectedToken:string):Promise<Candidate2HistoryRestoreSavedResult>;
}
