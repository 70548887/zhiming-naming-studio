import type {RootFeedbackPreviewDTO} from './bazi-root-feedback-v132';
import type {Analysis,BirthProfile,SourceRecord} from './types';
import type {RootFeedbackResourceFile} from './bazi-root-feedback-application';
export const ROOT_FEEDBACK_V132_FACADE_SCHEMA='bazi-root-feedback-facade/1.3.2' as const;
export const ROOT_FEEDBACK_V132_POLICY='naming-element-preview/1.3.2' as const;
export interface RootFeedbackV132ResourceIdentity {
 schema:'bazi-root-feedback-resource-identity/2';methodId:'project-bazi-mainchain-145/1.3.2';
 applicationPolicyVersion:typeof ROOT_FEEDBACK_V132_POLICY;publicationId:string;manifestSha256:string;
 implementationSha256:string;kernel:{methodId:string;sourceRevision:string};files:RootFeedbackResourceFile[];
}
export interface RootFeedbackV132FacadeDTO {
 schema:typeof ROOT_FEEDBACK_V132_FACADE_SCHEMA;methodId:'project-bazi-mainchain-145/1.3.2';
 profileId:string;entryPolicy:'month-branch-only'|'month-stem-proposal';status:RootFeedbackPreviewDTO['resolution'];
 baseAnalysis:Analysis;resourceIdentity:RootFeedbackV132ResourceIdentity;sources:SourceRecord[];
 branches:{id:string;kind:'recorded-instant'|'unknown-hour-interval';hypothetical:boolean;root:RootFeedbackPreviewDTO}[];
 applicationGate:{status:'blocked';reasons:{code:'version-not-admitted-for-application';message:string}[]};
 calendar:{partitionComplete:boolean;warnings:string[]};
}
/** Explicit preview selection does not extend the production naming/saved tuple. */
export type RootFeedbackVersionSelection={methodId:'project-bazi-mainchain-145/1.3.1'|'project-bazi-mainchain-145/1.3.2';purpose:'preview'|'saved-replay';};
export type RootFeedbackV132Profile=BirthProfile;
