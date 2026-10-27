import type {BirthProfile,BirthTimeAnalysis,Element} from './types';
import type {ChartCase140,UseItem140} from './bazi-mainchain-method-types';

export const ROOT_FEEDBACK_APPLICATION_SCHEMA='bazi-root-feedback-application-certificate/1.0.0' as const;
export const ROOT_FEEDBACK_METHOD_ID='project-bazi-mainchain-145/1.3.1' as const;
export const ROOT_FEEDBACK_APPLICATION_POLICY='naming-element-application/1.0.0' as const;
export const ROOT_FEEDBACK_ENGINE_PROVENANCE='fixed-validated-calendar-facts/1' as const;
export type RootFeedbackEntryPolicy='month-branch-only'|'month-stem-proposal';
export interface RootFeedbackResourceFile {path:string;bytes:number;sha256:string;kind:'rule'|'source-lock'|'runtime-source'|'license'|'notice'|'publication';}
export interface RootFeedbackResourceIdentity {
 schema:'bazi-root-feedback-resource-identity/1';methodId:typeof ROOT_FEEDBACK_METHOD_ID;applicationPolicyVersion:typeof ROOT_FEEDBACK_APPLICATION_POLICY;
 publicationId:string;manifestSha256:string;sourceRevision:string;kernel:{methodId:string;sourceRevision:string};files:RootFeedbackResourceFile[];
}
export type RootFeedbackApplicationReasonCode='birth-input-unresolved'|'hypothetical-birth-case'|'multiple-regimes'|'no-consistent-regime'|'root-prerequisite-pending'|'control-unsettled'|'consumer-missing-or-failed'|'mainchain-conditional'|'numeric-threshold-pending'|'missing-primary-use'|'contradictory-uses';
export interface RootFeedbackApplicationReason {code:RootFeedbackApplicationReasonCode;message:string;}
export interface RootFeedbackEffectiveElements {primary:Element[];secondary:Element[];avoid:Element[];applied:Element[];}
export interface RootFeedbackNumericInterval {lower:number;upper:number;}
export interface RootFeedbackNumericReview {
 status:'separated-from-thresholds'|'pending-prerequisite';supportShare:RootFeedbackNumericInterval;strengthCandidates:('weak'|'balanced'|'strong')[];
 affectedPredicates:{id:string;interval:RootFeedbackNumericInterval;threshold:number;comparisonTolerance:number;adjacentJudgments:string[]}[];
}
export interface RootFeedbackNativeFact {
 carrierId:string;position:'year'|'month'|'day'|'hour';stem:string;branch?:string;originalElement:Element;workingElement:Element;seed:number;hiddenOrder:number|null;conversion?:string;supportedOriginalCarrierIds:string[];
}
export interface RootFeedbackVariable {id:string;element:Element;carrierIds:string[];resourceElement:Element;resourceSeed:number;fallbackFactor:0.35|0.7;}
export interface RootFeedbackAssumption {variableId:string;element:Element;carrierIds:string[];rooted:boolean;}
export interface RootFeedbackCapacity {carrierId:string;seed:number;rootFactor:number;capacity:number;}
export interface RootFeedbackRootInterval {
 variableId:string;element:Element;assumedRooted:boolean;value:'true'|'false'|'unknown';candidateSetComplete:boolean;
 candidateIntervals:{carrierId:string;basis:'native-root'|'transformed-support';qualification:'accepted'|'pending-prerequisite';relationId?:string;originalElement:Element;workingElement:Element;power:number|null;interval:RootFeedbackNumericInterval|null;value:'true'|'false'|'unknown';reasons:string[]}[];
 witnessCarrierIds:string[];reasons:string[];
}
export interface RootFeedbackControlSummary {
 status:'closed';version:'control-budget/1.0.0';iterations:number;epsilon:number;maxIterations:number;controlFraction:number;maxLossFraction:number;
 lastL1Delta:number;lastL1DeltaUpperBound:number;theoreticalIterationErrorBound:number;contractionUpperBound:number;roundoffBound:number;iterationErrorBound:number;roundoffErrorBound:number;errorBound:number;residualL1UpperBound:number;
 coefficientValidation:{status:'accepted-by-pinned-kernel';kernelMethodId:string;graphDigest:string;certificateDigest:string;nodeCount:number;edgeCount:number;disabledEdgeIds:string[]};
}
export interface RootFeedbackApplicationCertificate {
 schema:typeof ROOT_FEEDBACK_APPLICATION_SCHEMA;methodId:typeof ROOT_FEEDBACK_METHOD_ID;applicationPolicyVersion:typeof ROOT_FEEDBACK_APPLICATION_POLICY;entryPolicy:RootFeedbackEntryPolicy;profileId:string;
 birthFacts:{calendar:BirthProfile['calendar'];birthDate:string;leapMonth:boolean;birthTime:string;timeUnknown:false;timezone:string;timeBasis:NonNullable<BirthProfile['timeBasis']>;birthLongitude:number|null;actualInterval:{startUtc:string;endUtc:string};pillars:ChartCase140['pillars'];timeAnalysis:BirthTimeAnalysis};
 calendarIdentity:{baziVersion:string;timeBasisVersion:string;timeBasisMethod:string;timeBasisSourceId:string|null;birthFactsBindingDigest:string};resourceIdentity:RootFeedbackResourceIdentity;
 rootSummary:{scope:'complete-known-pillars'|'known-pillars-only';resolution:'unique-consistent-regime'|'multiple-consistent-regimes'|'no-consistent-regime'|'pending-regime-resolution';regimes:{id:string;consistency:'consistent'|'inconsistent'|'possible'}[];consistentIds:string[];possibleIds:string[];selectedRegimeId:string;facts:RootFeedbackNativeFact[];variables:RootFeedbackVariable[];rootAssumptions:RootFeedbackAssumption[];capacities:RootFeedbackCapacity[];rootIntervals:RootFeedbackRootInterval[];pending:string[]};
 controlSummary:RootFeedbackControlSummary;
 mainchainOpinion:{status:'settled';coverage:'complete';hypothetical:false;methodId:typeof ROOT_FEEDBACK_METHOD_ID;entryPolicy:RootFeedbackEntryPolicy;decisionStatus:'resolved-by-project-rules';numericReview:RootFeedbackNumericReview;strength:string;branch:string;uses:UseItem140[];missing:string[];alternativeUses:[]};
 auxiliary:{conflicts:{element:Element;favorableIn:string[];avoidIn:string[]}[];seasonal:{status:string;statusCandidates:string[];projectElements:Element[];numericMissing:string[];reasons:string[];sourceReferenceDigest:string};limitations:string[];separateFromEffective:true};
 effectiveElements:RootFeedbackEffectiveElements;engineResultDigest:string;digest:string;
}
export interface RootFeedbackBlockedApplicationGate {status:'blocked';reasons:RootFeedbackApplicationReason[];caseId:string|null;regimeId:string|null;}
export interface RootFeedbackAppliedApplicationGate {status:'applicable';reasons:[];caseId:string;regimeId:string;effectiveElements:RootFeedbackEffectiveElements;certificate:RootFeedbackApplicationCertificate;}
export type RootFeedbackApplicationGate=RootFeedbackBlockedApplicationGate|RootFeedbackAppliedApplicationGate;
