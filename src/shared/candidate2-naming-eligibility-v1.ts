import type {BirthProfile,NamingPreferences,Element,SourceRecord} from './types';
import type {Candidate2NamingSelection,Candidate2NamingDataIdentity} from './candidate2-naming-consumer-v1';
import type {ProjectApplicationTuple} from './project-application-v132-r2';

export const CANDIDATE2_ELIGIBILITY_VERSION='candidate2-naming-eligibility/1.0.0' as const;
export interface Candidate2EligibilityReason {code:string;message:string;}
export interface Candidate2EligibilityRequest {
 profile:BirthProfile;preferences:NamingPreferences;selection:Candidate2NamingSelection|{enabled:false}|null;selectionWasProvided:boolean;
}
/** A diagnostic response only. It is never a token, certificate or live
 * generation capability. The generation request contains original inputs only.
 */
export interface Candidate2NamingEligibility {
 schema:'candidate2-naming-eligibility/1';checkerVersion:typeof CANDIDATE2_ELIGIBILITY_VERSION;
 consumerVersion:'candidate2-naming-consumer/1.0.0';status:'eligible'|'blocked'|'disabled'|'unavailable';
 reasons:Candidate2EligibilityReason[];
 binding:{request:Candidate2EligibilityRequest|null;requestDigest:string|null;normalizedInputDigest:string|null;resourceDigest:string|null};
 versions:{methodId:'project-bazi-mainchain-145/1.3.2';policyId:'naming-element-application/1.3.2-candidate.2';publicationId:'project-naming-application/1.3.2-candidate.2';entryPolicy:'month-branch-only';namingRulesVersion:'naming-editorial-7.1.0'};
 application:{tuple:ProjectApplicationTuple;branch:string;elements:{primary:Element[];secondary:Element[];avoid:Element[];applied:Element[]};numerical:{iterations:number;errorBound:number;residualL1UpperBound:number};sources:SourceRecord[]}|null;
 dataIdentity:Candidate2NamingDataIdentity|null;
 generationAuthority:false;candidateAvailability:'not-evaluated';traditionalStatus:'unknown';notice:string;
}

/** Public read-only diagnostics; original inputs are sent again for any future generation. */
export interface Candidate2NamingEligibilityApi {
 checkCandidate2NamingEligibility(profile:BirthProfile,preferences:NamingPreferences,selection?:Candidate2NamingSelection|{enabled:false}):Promise<Candidate2NamingEligibility>;
}
