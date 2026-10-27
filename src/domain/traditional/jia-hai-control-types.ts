import type {BirthProfile,Analysis} from '../../shared/types';
import type {ChartCase140,Carrier140} from '../../shared/bazi-mainchain-method-types';
import type {RootFeedbackResult,RootFeedbackRegime,RootFeedbackResolution} from '../bazi-mainchain/project-v13/root-feedback-types';
import type {CarrierFlowSettlement} from '../bazi-mainchain/project-v13/settled-flows';
import type {NumericInterval} from '../bazi-mainchain/kernel-v12-fixed/numeric-interval';
import type {ControlBudgetSettlement} from '../bazi-mainchain/kernel-v12-fixed/control-budget-types';
import type {compareRootFeedbackIntervention145} from '../bazi-mainchain/project-v13';

/** Selector names verified carriers; it never accepts raw edge strings. */
export interface JiaHaiCarrierSelector {readonly controllerId:string;readonly attackerId:string;readonly hiddenCarrierId:string;}
export interface JiaHaiControlOptions {readonly enabled?:boolean;readonly selector?:JiaHaiCarrierSelector;}
export interface ProjectionCarrier {
 readonly id:string;readonly stem:string;readonly kind:Carrier140['kind'];readonly position:Carrier140['position'];readonly branch:string|null;
 readonly originalElement:string;readonly workingElement:string;
}
export interface JiaHaiPathCandidate {
 readonly selector:JiaHaiCarrierSelector;
 readonly canonicalEdgeId:string;readonly attackerToHiddenEdgeId:string;
 readonly controller:ProjectionCarrier;readonly attacker:ProjectionCarrier;readonly hiddenCarrier:ProjectionCarrier;
 readonly graphIdentity:string;
}
export type JiaHaiLegacyComparison=ReturnType<typeof compareRootFeedbackIntervention145>;
export interface JiaHaiPairedRegime {
 readonly regimeId:string;
 readonly retainedOnEitherSide:boolean;
 readonly fullConsistency:string;readonly withoutConsistency:string;
 readonly rootAssumptions:RootFeedbackRegime['rootAssumptions'];
 readonly capacities:RootFeedbackRegime['capacities'];
 readonly rootsEnabled:RootFeedbackRegime['rootIntervals'];readonly rootsDisabled:RootFeedbackRegime['rootIntervals'];
 readonly invariants:{readonly valid:boolean;readonly issues:readonly string[];readonly graphDigestEnabled:string|null;readonly graphDigestDisabled:string|null;readonly unchangedOtherEdgeCount:number;};
 readonly convergenceEnabled:ControlBudgetSettlement|null;readonly convergenceDisabled:ControlBudgetSettlement|null;
 readonly deltas:{
   readonly renRemainingReduction:NumericInterval;readonly renFinalPowerReduction:NumericInterval;
   readonly selectedHiddenCarrierPowerChange:NumericInterval;readonly selectedHiddenTotalLossReduction:NumericInterval;
   readonly jiaDayPowerChange:NumericInterval;readonly gengNamedCarrierPowerChange:NumericInterval;readonly dingNamedCarrierPowerChange:NumericInterval;
 }|null;
}
export interface JiaHaiControlProjection {
 readonly schema:'jia-hai-wu-ren-project-intervention/1.0.0';
 readonly applicability:'applicable'|'not-applicable'|'unknown';
 readonly traditional:{readonly status:'traditional-unknown'|'not-applicable';readonly dependencies:readonly {id:string;status:'unknown';}[];readonly usefulGodDecision:'not-evaluated';readonly namingImpact:'none';};
 readonly birth:{readonly profile:Pick<BirthProfile,'id'|'birthDate'|'birthTime'|'timeUnknown'|'timezone'>;readonly baziVersion:string;readonly timeBasis:Analysis['bazi']['timeBasis']|null;readonly knownPillars:Analysis['bazi']['pillars'];readonly chart:ChartCase140|null;readonly originalAnalysisDigest:string;};
 readonly literal:{readonly exposedWu:'present'|'not-seen'|'unknown';readonly note:string;};
 readonly project:{
   readonly enabled:boolean;readonly status:'disabled'|'not-applicable'|'calendar-unknown'|'pending-incomplete-graph'|'no-eligible-path'|'ambiguous-selector'|'selector-rejected'|'projected-only'|'projection-unknown';
   readonly methodId:string;readonly parameterVersion:string;
   readonly parameters:unknown;readonly modelPins:readonly {path:string;byteSha256:string;jsonValueSha256:string;methodId:string;}[];
   readonly discovery:RootFeedbackResult<CarrierFlowSettlement>|null;
   readonly candidates:readonly JiaHaiPathCandidate[];readonly selected:JiaHaiPathCandidate|null;
   readonly legacyComparison:JiaHaiLegacyComparison|null;
   readonly comparisonResolution:'two-unique-regime-comparison'|'conditional-or-unresolved'|'not-run';
   readonly pairedRegimes:readonly JiaHaiPairedRegime[];
   readonly selectedLegacyCertificates:JiaHaiLegacyComparison['conditionalCertificates'];
   readonly stopReasons:readonly string[];
   readonly controls:'same-regime-capacity-and-original-control-denominator';
   readonly generation:'unchanged-existing-rule-recomputed-from-each-solution';
   readonly scoreMutation:false;
 };
 readonly source:{readonly sourceId:'bazi-monthly-qiongtong-2294674';readonly revision:string;readonly rawSha256:string;readonly quote:string;readonly quoteSpan:{start:number;end:number;unit:string;interval:string;};readonly note:string;};
}
