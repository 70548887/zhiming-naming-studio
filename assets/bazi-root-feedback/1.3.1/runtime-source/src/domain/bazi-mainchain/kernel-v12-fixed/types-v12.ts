import type {ChartCase140,ChartResult140,MethodResult140} from '../../../shared/bazi-mainchain-method-types';
import type {CarrierFlowSettlement} from './settled-flows';
import type {ControlBudgetSettlement} from './control-budget-types';
import type {ResourceProtection} from './resource-protection';
import type {NumericInterval} from './numeric-interval';
export interface NumericReview144 {
 status:'separated-from-thresholds'|'pending-prerequisite';supportShare:NumericInterval;
 strengthCandidates:('weak'|'balanced'|'strong')[];
 affectedPredicates:{id:string;interval:NumericInterval;threshold:number;comparisonTolerance:number;adjacentJudgments:string[]}[];
}
export interface SettledChartResult144 extends Omit<ChartResult140,'rescue'|'calculationTrace'|'seasonal'> {
 status:'settled';controlSettlement:ControlBudgetSettlement;resourceProtection:ResourceProtection[];
 resourceProtectionCoverage:{status:'complete-fixed-graph'|'pending-input'|'no-eligible-path';missing:string[]};
 numericReview:NumericReview144;
 branchCandidates:import('./branch-intervals').IntervalBranchCandidate[];
 seasonal:Omit<ChartResult140['seasonal'],'status'>&{status:ChartResult140['seasonal']['status']|'pending-prerequisite';
  statusCandidates:ChartResult140['seasonal']['status'][];numericMissing:string[]};
 rescue:{status:'candidate-topology'|'not-required'|'not-closed';carrierIds:string[];reasons:string[]};
 calculationTrace:ChartResult140['calculationTrace']&{intervals:CarrierFlowSettlement['bounds'];numericReview:NumericReview144;
  capacityBasis:{carrierId:string;rootEvidence:'pre-control-seed';effectiveSeedRootIds:string[];seedResourceAmount:number;rootFactor:number;capacity:number}[];
  posteriorRoots:ChartResult140['calculationTrace']['roots'];rootFeedback:'not-applied'};
}
export interface PendingChartResult144 {
 caseId:string;methodId:string;status:'pending-control-settlement';hypothetical:boolean;
 coverage:'complete'|'known-three-pillars';entryPolicy:'month-branch-only'|'month-stem-proposal';
 originalPillars:ChartCase140['pillars'];controlSettlement:ControlBudgetSettlement;
 uses:[];summary:string[];missing:string[];limitations:string[];
}
export type ChartResult144=SettledChartResult144|PendingChartResult144;
export interface MethodResult144 extends Omit<MethodResult140,'schema'|'results'|'status'> {
 schema:'bazi-method-result/1.2';results:ChartResult144[];
 status:MethodResult140['status']|'pending-control-settlement';
}
