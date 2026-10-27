import type {Element,RenSourceReference} from './types';
import type {RenCapacityDependency,RenCapacityState} from './ren-capacities-types';

export type RenDirectionKind='wood-direction-strength'|'fire-direction-strength';
/** A source premise and a project restriction are never presented as interchangeable necessities. */
export type RenDirectionFactKind='input-fact'|'source-premise'|'source-qualification'|'project-restriction';
export interface RenDirectionFact {
 id:string;kind:RenDirectionFactKind;label:string;state:RenCapacityState;
 nodeIds:string[];sourceClauseIds:string[];basis:string;evidence:string[];
 contributesToProof:boolean;
}
export interface RenDirectionCheck {
 id:string;kind:RenDirectionKind;name:string;element:Extract<Element,'木'|'火'>;
 /** This is the state of one declared sufficient proof path, not a universal necessary test. */
 state:RenCapacityState;capability:'met'|'unknown'|'conflict';ruleMode:'sufficient-only';
 sourceNodeIds:string[];targetNodeIds:string[];sourceClauseIds:string[];
 scope:string;sourceGeneral:string;productRestrictions:string[];
 facts:RenDirectionFact[];dependencyId:string;sourceConsequence:string;
 evidence:string[];missing:string[];netEffect:'unknown';
}
export interface RenDirectionAnalysis {
 version:'1.0.0';profileId:'ren-source-direction-capacities/1.0.0';sourceId:'bazi-ditian-ren-directions-2600158';
 authority:'source-sufficient-local-direction-strength';
 input:{baseVersion:'ditian-ren-commentary-2600158/1.3.0';complete:boolean;dayStem:string|null;pillars:{position:string;known:boolean;ganzhi?:string}[]};
 checks:RenDirectionCheck[];
 proof:{nodes:RenCapacityDependency[];results:Record<string,{state:RenCapacityState;cycleDetected:boolean}>};
 sourceReferences:RenSourceReference[];originalNodesRetained:true;retainedNodeIds:string[];retainedRootLinkIds:string[];
 netEffect:'unknown';effectiveRootSupport:'unknown';strengthDecision:'not-evaluated';
 formationDecision:'not-evaluated';usefulGodDecision:'not-evaluated';limitations:string[];
}
