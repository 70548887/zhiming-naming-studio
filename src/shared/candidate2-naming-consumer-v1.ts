import type {Analysis,BirthProfile,Element,NameCandidate,NamingPreferences,SourceRecord} from './types';
import type {SavedProjectApplicationV132} from './project-application-v132-r2';
export const CANDIDATE2_NAMING_CONSUMER_VERSION='candidate2-naming-consumer/1.0.0' as const;
export const CANDIDATE2_NAMING_SELECTION=Object.freeze({enabled:true,methodId:'project-bazi-mainchain-145/1.3.2',policyId:'naming-element-application/1.3.2-candidate.2',publicationId:'project-naming-application/1.3.2-candidate.2',entryPolicy:'month-branch-only'} as const);
export type Candidate2NamingSelection=typeof CANDIDATE2_NAMING_SELECTION;
export interface Candidate2NamingRequest {
 profile:BirthProfile;preferences:NamingPreferences;
 selection?:Candidate2NamingSelection|{enabled:false};seed?:number;excludeNames?:string[];
}
export interface Candidate2DomainProjection {
 schema:'candidate2-domain-element-projection/1';source:'candidate.2-authorized-elements';
 originalPreferencesDigest:string;effectivePreferencesDigest:string;applied:Element[];
 userManualElements:[];baseAnalysisUnchanged:true;
 domainEntry:'generateLocalForRuleVersionWithContext';namingRulesVersion:'naming-editorial-7.1.0';
 limitation:'private numeric input projection; not user manual intent or old project tuple; avoid is not a hard filter';
}
export interface Candidate2NamingDataIdentity {
 schema:'candidate2-naming-data/1';packSha256:string;packBytes:number;datasetSha256:string;
 activeVersion:string;metadataVersion:string;namingRulesVersion:'naming-editorial-7.1.0';
 semanticSha256:string;reviewIdentity:unknown;sources:SourceRecord[];
}
export interface Candidate2NamingGeneration {
 schema:'candidate2-naming-generation/1';status:'generated';consumerVersion:typeof CANDIDATE2_NAMING_CONSUMER_VERSION;
 profile:BirthProfile;preferences:NamingPreferences;selection:Candidate2NamingSelection;
 baseAnalysis:Analysis;application:SavedProjectApplicationV132;dataIdentity:Candidate2NamingDataIdentity;
 domainProjection:Candidate2DomainProjection;seed:number;excludeNames:string[];
 candidates:NameCandidate[];messages:string[];digest:string;
}
export type Candidate2NamingFlowResult=Candidate2NamingGeneration|{schema:'candidate2-naming-generation/1';status:'disabled';consumerVersion:typeof CANDIDATE2_NAMING_CONSUMER_VERSION};
export interface Candidate2NamingReplayContext {profile:BirthProfile;preferences:NamingPreferences;selection:Candidate2NamingSelection;}
export interface Candidate2NamingVerification {
 schema:'candidate2-naming-verification/1';status:'verified-saved';consumerVersion:typeof CANDIDATE2_NAMING_CONSUMER_VERSION;
 generationAuthority:false;replayOrigin:'saved-replay';profileId:string;candidateCount:number;recordDigest:string;
}
