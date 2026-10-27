import type {Element} from './types';
import type {Candidate2AdoptedNamingSessionV2} from './candidate2-generation-adoption-v2';

export interface Candidate2ReviewChanges {
 reviewNote:string;
 preferredElements:Element[];
 candidates:Array<{id:string;meaning:string;reason:string;traditionalReason:string;reviewNote:string;favorite:boolean}>;
}

export interface Candidate2ReviewSavedResult {
 schema:'candidate2-review-saved/1';
 status:'saved';
 session:Candidate2AdoptedNamingSessionV2;
 traditionalStatus:'unknown';
}

export interface Candidate2ReviewAPI {
 reviewCandidate2(sessionId:string,changes:Candidate2ReviewChanges,expectedRevision:number,expectedToken:string):Promise<Candidate2ReviewSavedResult>;
}
