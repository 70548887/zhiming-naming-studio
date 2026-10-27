/** Fixed carrier graph only; no roots, paths, generation, or rule selection. */
export interface ControlBudgetNode {id:string;capacity:number;}
export interface ControlBudgetEdge {
  id:string;source:string;target:string;coefficient:number;pathFactor?:number;
}
export interface ControlBudgetInterval {lower:number;upper:number;}
export interface ControlBudgetFixedCoefficient extends ControlBudgetEdge {disabled:boolean;}
export interface ControlBudgetEdgeLoss extends ControlBudgetFixedCoefficient {
  proposal:number;proposalLowerBound:number;proposalUpperBound:number;
  loss:number;lossLowerBound:number;lossUpperBound:number;targetScale:number;
}
export interface ControlBudgetIssue {code:string;message:string;nodeId?:string;edgeId?:string;}
export interface ControlBudgetCertificate {
  version:'control-budget/1.0.0';
  epsilon:1e-9;maxIterations:64;controlFraction:0.25;maxLossFraction:0.8;
  nodes:ControlBudgetNode[];
  /** Includes disabled edges, with their original coefficient and path metadata. */
  fixedCoefficients:ControlBudgetFixedCoefficient[];
  /** Sorted unique original attacker IDs; disabled edges remain represented. */
  sourceIds:string[];
  disabledEdgeIds:string[];
  /** Frozen original matrix, before disabling any edge. */
  columnSums:Record<string,number>;
  columnSumUpperBounds:Record<string,number>;
  iterations:number;
  lastL1Delta:number|null;
  lastL1DeltaUpperBound:number|null;
  /** Exact-arithmetic q=.25 diagnostic; not the complete floating-point bound. */
  theoreticalIterationErrorBound:number|null;
  contractionUpperBound:number|null;
  /** L1 upper bound on rounding in the final numerical operator evaluation. */
  roundoffBound:number|null;
  iterationErrorBound:number|null;
  roundoffErrorBound:number|null;
  /** Complete L1 bound: q*deltaUpper/(1-q) + roundoffBound/(1-q), outward rounded. */
  errorBound:number|null;
  /** Outward residual of F(returned x)-returned x, including evaluation rounding. */
  residualL1UpperBound:number|null;
  issues:ControlBudgetIssue[];
}
export interface ClosedControlBudgetSettlement extends ControlBudgetCertificate {
  status:'closed';failureReason:null;
  lastL1Delta:number;lastL1DeltaUpperBound:number;theoreticalIterationErrorBound:number;
  contractionUpperBound:number;roundoffBound:number;iterationErrorBound:number;
  roundoffErrorBound:number;errorBound:number;residualL1UpperBound:number;
  remaining:Record<string,number>;
  remainingBounds:Record<string,ControlBudgetInterval>;
  /** Re-evaluated from the returned x, rather than the previous iterate. */
  totalLossByNode:Record<string,number>;
  totalLossBoundsByNode:Record<string,ControlBudgetInterval>;
  lossByEdge:ControlBudgetEdgeLoss[];
}
export interface UnclosedControlBudgetSettlement extends ControlBudgetCertificate {
  status:'unclosed';
  failureReason:'invalid-graph'|'non-finite'|'not-converged'|'uncertified-roundoff';
  /** A failed solve must not supply substitute remaining budgets to consumers. */
  remaining:null;remainingBounds:null;totalLossByNode:null;totalLossBoundsByNode:null;
  lossByEdge:[];
}
export type ControlBudgetSettlement=ClosedControlBudgetSettlement|UnclosedControlBudgetSettlement;
