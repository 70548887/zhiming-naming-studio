import type {Element140,Branch140,UseItem140,Relation140,Trace140} from './bazi-mainchain-method-types';
export const ROOT_FEEDBACK_PREVIEW_VERSION='bazi-root-feedback-preview/1.3.2' as const;
export type RootRegimeResolution='unique-consistent-regime'|'multiple-consistent-regimes'|'no-consistent-regime'|'pending-regime-resolution';
export interface RootFeedbackOpinion {
 regimeId:string;methodId:string;hypothetical:boolean;strength:'weak'|'balanced'|'strong';branch:Branch140;
 primary:Element140[];secondary:Element140[];avoid:Element140[];
 uses:UseItem140[];alternatives:{id:string;condition:string;uses:UseItem140[]}[];
 summary:string[];pending:string[];
}
export type RootFeedbackTraditionalStatus='unknown'|'insufficient-source'|'not-applicable';
export type RootFeedbackProjectStatus='observed'|'closed'|'projected-only'|'partial-known-only'|'unknown-chart'|'unknown'|'pending'|'not-evaluated';
type PreparationReadonly<T>=T extends object?{readonly[K in keyof T]:PreparationReadonly<T[K]>}:T;
/** Captured before callbacks; relation statuses and source trace do not depend on consumers. */
export type RootFeedbackPreparationEvidence=PreparationReadonly<{
 scope:'complete-known-pillars'|'known-pillars-only';
 relations:Relation140[];trace:Trace140[];ruleIds:string[];sourceIds:string[];pending:string[];
}>;
export interface RootFeedbackCertificateSummary {
 status:'closed'|'unclosed'|'unavailable';
 failureReason:'invalid-graph'|'non-finite'|'not-converged'|'uncertified-roundoff'|null;
 epsilon:number|null;maxIterations:number|null;controlFraction:number|null;maxLossFraction:number|null;
 iterations:number|null;lastL1Delta:number|null;lastL1DeltaUpperBound:number|null;
 contractionUpperBound:number|null;errorBound:number|null;residualL1UpperBound:number|null;
 columnSums:Record<string,number>;disabledEdgeIds:string[];issues:string[];
}
export interface RootFeedbackExplanationStep {
 id:string;
 truthLayer:'chart-fact'|'project-rule'|'numeric-certificate'|'traditional-boundary'|'project-opinion';
 traditionalStatus:RootFeedbackTraditionalStatus;
 projectStatus:RootFeedbackProjectStatus;
 ruleIds:string[];sourceIds:string[];assumptions:string[];unknownReason:string[];
 numericCertificates?:RootFeedbackCertificateSummary[];
}
export interface RootFeedbackExplanationChain {
 schema:'bazi-root-feedback-explanation/1.0.0';
 traditionalStatus:'unknown'|'insufficient-source';
 projectStatus:'projected-only'|'partial-known-only'|'unknown-chart'|'unknown';
 steps:RootFeedbackExplanationStep[];
 residualGaps:string[];
}
export interface RootFeedbackPreviewDTO {
 schema:typeof ROOT_FEEDBACK_PREVIEW_VERSION;methodId:'project-bazi-mainchain-145/1.3.2';
 profileId:string;hypothetical:boolean;scope:'complete-known-pillars'|'known-pillars-only';resolution:RootRegimeResolution;
 entryPolicy:'month-branch-only'|'month-stem-proposal';
 facts:{id:string;originalElement:Element140;workingElement:Element140;conversion:string|null;hiddenOrder:number|null;originalSupportIds:string[]}[];
 variables:{id:string;element:Element140;carrierIds:string[];fallbackFactor:number}[];
 regimes:{id:string;consistency:'consistent'|'inconsistent'|'possible';
  assumptions:{element:Element140;rooted:boolean;carrierIds:string[]}[];
  capacities:{id:string;capacity:number;rootFactor:number}[];
  roots:{element:Element140;value:'true'|'false'|'unknown';witnessIds:string[];reasons:string[];
   candidates:{id:string;lower:number|null;upper:number|null;qualification:string}[]}[];
  opinion:RootFeedbackOpinion|null;
  certificate:RootFeedbackCertificateSummary;
  pending:string[];
 }[];
 consistentIds:string[];possibleIds:string[];
 commonOpinion:{status:'all-retained-regimes'|'known-opinions-only'|'unavailable';primary:Element140[];favorable:Element140[];knownOpinionIntersection?:Element140[]};
 conflicts:{element:Element140;favorableIn:string[];avoidIn:string[]}[];
 pending:string[];limitations:string[];
 preparation:RootFeedbackPreparationEvidence;
 explanationChain:RootFeedbackExplanationChain;
 /** Detailed immutable numerical/versioned evidence; it is not a score. */
 detail:unknown;
}
