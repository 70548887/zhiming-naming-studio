import type {RenSourceReference} from './types';

export type RenCapacityState='met'|'not-met'|'unknown'|'conflict';
/** A failed sufficient proof is never a negative claim about every possible capability. */
export type RenCapacityConclusion='met'|'unknown'|'conflict';
export interface RenCapacityFact {
  id:string;label:string;state:RenCapacityState;nodeIds:string[];evidence:string[];
}
export interface RenCapacityDependency {
  id:string;observed?:RenCapacityState;premises:string[];inhibitors:string[];
  mode:'sufficient-only';
}
export interface RenCapacityCheck {
  id:string;kind:'wood-group-strength'|'chen-wood-support-capacity';name:string;
  /** State of this adopted sufficient proof path, distinct from its directional conclusion. */
  state:RenCapacityState;capability:RenCapacityConclusion;ruleMode:'sufficient-only';
  sourceNodeIds:string[];targetNodeIds:string[];sourceClauseIds:string[];
  scope:string;sourceGeneral:string;productRestrictions:string[];
  facts:RenCapacityFact[];dependencyId:string;sourceConsequence:string;
  evidence:string[];missing:string[];netEffect:'unknown';
}
export interface RenCapacityAnalysis {
  version:'1.0.0';profileId:'ren-source-wood-capacities/1.0.0';sourceId:'bazi-ditian-ren-capacities-2600158';
  authority:'source-sufficient-local-capacities';
  input:{baseVersion:string;complete:boolean;dayStem:string|null;pillars:{position:string;known:boolean;ganzhi?:string}[]};
  checks:RenCapacityCheck[];
  proof:{nodes:RenCapacityDependency[];results:Record<string,{state:RenCapacityState;cycleDetected:boolean}>};
  sourceReferences:RenSourceReference[];originalNodesRetained:true;
  netEffect:'unknown';effectiveRootSupport:'unknown';
  strengthDecision:'not-evaluated';formationDecision:'not-evaluated';limitations:string[];
}
