import type {Analysis,BirthProfile,Element,SourceRecord} from './types';
import type {RootFeedbackV132ResourceIdentity} from './bazi-root-feedback-v132-r2-facade';
import type {RootFeedbackV132BuildIdentity} from '../main/bazi-root-feedback-v132-r2-engine';

export const PROJECT_APPLICATION_V132_POLICY='naming-element-application/1.3.2-candidate.2' as const;
export const PROJECT_APPLICATION_V132_PUBLICATION='project-naming-application/1.3.2-candidate.2' as const;
export const PROJECT_APPLICATION_V132_NAMING_INPUT='project-naming-input/1.0.0' as const;
export interface ProjectApplicationBuildIdentity {
 schema:'project-application-build/1';policyId:typeof PROJECT_APPLICATION_V132_POLICY;
 publicationId:typeof PROJECT_APPLICATION_V132_PUBLICATION;
 fullClosureSha256:string;manifestSha256:string;esbuildVersion:string;engine:RootFeedbackV132BuildIdentity;
}
export interface ProjectApplicationIdentity extends ProjectApplicationBuildIdentity {
 runtimeEnvironment:{node:string;icu:string|null;tz:string|null;unicode:string|null};
}
export interface ProjectApplicationTuple {
 methodId:'project-bazi-mainchain-145/1.3.2';entryPolicy:'month-branch-only';
 enginePublicationId:'bazi-root-feedback/1.3.2;preview-publication-r2';engineFullClosureSha256:string;engineManifestSha256:string;
 policyId:typeof PROJECT_APPLICATION_V132_POLICY;policyPublicationId:typeof PROJECT_APPLICATION_V132_PUBLICATION;
 applicationFullClosureSha256:string;applicationManifestSha256:string;namingInputVersion:typeof PROJECT_APPLICATION_V132_NAMING_INPUT;
}
export interface ProjectApplicationOptions {enabled?:boolean;entryPolicy?:'month-branch-only';}
export interface ProjectApplicationReason {code:string;message:string;}
export interface ProjectApplicationElements {primary:Element[];secondary:Element[];avoid:Element[];applied:Element[];}
export interface ProjectApplicationReplay {
 schema:'project-application-replay/1';profile:BirthProfile;baseAnalysis:Analysis;entryPolicy:'month-branch-only';
}
export interface ProjectApplicationCertificate {
 schema:'project-application-certificate/1';tuple:ProjectApplicationTuple;profileId:string;
 engineIdentity:RootFeedbackV132ResourceIdentity;applicationIdentity:ProjectApplicationIdentity;
 replay:ProjectApplicationReplay;rootDigest:string;preparationDigest:string;
 numerical:{iterations:number;errorBound:number;residualL1UpperBound:number;certificateDigest:string};
 selectedRegimeId:string;branch:string;effectiveElements:ProjectApplicationElements;
 sources:SourceRecord[];traditionalStatus:'unknown';limitations:string[];digest:string;
}
export type ProjectApplicationResolution=
 |{schema:'project-application-resolution/1';status:'disabled'|'pending'|'blocked';reasons:ProjectApplicationReason[];traditionalStatus:'unknown'}
 |{schema:'project-application-resolution/1';status:'applicable';reasons:[];traditionalStatus:'unknown';certificate:ProjectApplicationCertificate};
export interface SavedProjectApplicationV132 {
 schema:'project-naming-use/2';tuple:ProjectApplicationTuple;replay:ProjectApplicationReplay;
 certificate:ProjectApplicationCertificate;
 application:{status:'applied';policyId:typeof PROJECT_APPLICATION_V132_POLICY;elements:ProjectApplicationElements};digest:string;
}
/** Public JSON is diagnostic data. Only the owning adapter can issue a trusted naming input. */
export interface ProjectApplicationNamingInput {
 schema:typeof PROJECT_APPLICATION_V132_NAMING_INPUT;origin:'generation'|'saved-replay';
 tuple:ProjectApplicationTuple;profileId:string;certificateDigest:string;elements:ProjectApplicationElements;
}
