import type {Element,RenSourceReference} from './types';

export type RenActionState='met'|'contradicted'|'unknown'|'conflict';
export interface RenActionPredicate {
  id:string;label:string;state:RenActionState;nodeIds:string[];evidence:string[];
}
export interface RenActionSourceClause extends RenSourceReference {
  sourceSpan:{start:number;end:number;unit:'unicode-codepoint';interval:'[start,end)'};
  contextId:string;scope:string;
}
export interface RenRootLink {
  id:string;stemNodeId:string;hiddenNodeId:string;branchNodeId:string;stem:string;hiddenStem:string;branch:string;
  stemPosition:'year'|'month'|'day'|'hour';rootPosition:'year'|'month'|'day'|'hour';element:Element;
  samePillar:boolean;hiddenOrder:number;
  category:'growth-lu-wang'|'store'|'residue'|'selected-same-element';
  categoryAuthority:'ren-explicit-element-vocabulary'|'selected-hidden-vocabulary-only';
  sourceClauseIds:string[];threatNodeIds:string[];threatEdgeIds:string[];
  effectiveSupport:'unknown';originalNodesRetained:true;evidence:string[];
}
export interface RenActionCheck {
  id:string;kind:'root-prerequisite'|'cover-carrier'|'wood-triad-clash'|'lifecycle-proof-guard'|'root-damage'|'resource-damage'|'resource-rescue';
  name:string;status:RenActionState;scope:string;nodeIds:string[];edgeIds:string[];
  predicates:RenActionPredicate[];sourceClauseIds:string[];
  sourceConsequence:string;evidence:string[];missing:string[];
  effectiveAction:'unknown';formationDecision:'not-evaluated';
}
export interface RenActionAnalysis {
  version:'1.0.0';profileId:'ren-source-conditional-actions/1.0.0';sourceId:'bazi-ditian-ren-actions-2600158';
  authority:'source-conditional-structural-prerequisites';
  input:{baseVersion:string;complete:boolean;dayStem:string|null;pillars:{position:string;known:boolean;ganzhi?:string}[]};
  rootLinks:RenRootLink[];checks:RenActionCheck[];sourceReferences:RenSourceReference[];
  formationDecision:'not-evaluated';strengthDecision:'not-evaluated';limitations:string[];
}
