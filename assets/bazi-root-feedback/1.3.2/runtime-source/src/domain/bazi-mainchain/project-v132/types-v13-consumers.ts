import type {ChartCase140,ChartResult140,MethodResult140} from '../../../shared/bazi-mainchain-method-types';
import type {CarrierFlowSettlement} from './settled-flows';
import type {ControlBudgetSettlement} from '../kernel-v12-fixed/control-budget-types';
import type {ResourceProtection} from '../kernel-v12-fixed/resource-protection';
import type {NumericInterval} from '../kernel-v12-fixed/numeric-interval';
export interface NumericReview145 {
 status:'separated-from-thresholds'|'pending-prerequisite';supportShare:NumericInterval;
 strengthCandidates:('weak'|'balanced'|'strong')[];
 affectedPredicates:{id:string;interval:NumericInterval;threshold:number;comparisonTolerance:number;adjacentJudgments:string[]}[];
}
export interface SettledChartResult145 extends Omit<ChartResult140,'rescue'|'calculationTrace'|'seasonal'> {
 status:'settled';controlSettlement:ControlBudgetSettlement;resourceProtection:ResourceProtection[];
 resourceProtectionCoverage:{status:'complete-fixed-graph'|'pending-input'|'no-eligible-path';missing:string[]};
 numericReview:NumericReview145;
 branchCandidates:import('../kernel-v12-fixed/branch-intervals').IntervalBranchCandidate[];
 seasonal:Omit<ChartResult140['seasonal'],'status'>&{status:ChartResult140['seasonal']['status']|'pending-prerequisite';
  statusCandidates:ChartResult140['seasonal']['status'][];numericMissing:string[]};
 rescue:{status:'candidate-topology'|'not-required'|'not-closed';carrierIds:string[];reasons:string[]};
 calculationTrace:ChartResult140['calculationTrace']&{intervals:CarrierFlowSettlement['bounds'];numericReview:NumericReview145;
  capacityBasis:{carrierId:string;rootEvidence:'regime-assumption';effectiveSeedRootIds:string[];seedResourceAmount:number;rootFactor:number;capacity:number}[];
  posteriorRoots:ChartResult140['calculationTrace']['roots'];rootFeedback:'root-regime'};
}
export interface PendingChartResult145 {
 caseId:string;methodId:string;status:'pending-control-settlement';hypothetical:boolean;
 coverage:'complete'|'known-three-pillars';entryPolicy:'month-branch-only'|'month-stem-proposal';
 originalPillars:ChartCase140['pillars'];controlSettlement:ControlBudgetSettlement;
 uses:[];summary:string[];missing:string[];limitations:string[];
}
export type ChartResult145=SettledChartResult145|PendingChartResult145;
export interface MethodResult145 extends Omit<MethodResult140,'schema'|'results'|'status'> {
 schema:'bazi-method-result/1.2';results:ChartResult145[];
 status:MethodResult140['status']|'pending-control-settlement';
}
