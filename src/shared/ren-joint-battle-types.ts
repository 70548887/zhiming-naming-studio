import type {RenSourceReference} from './types';

export type RenJointBattleState='not-fully-quiet'|'not-applicable'|'unknown';
export interface RenJointBattlePattern {id:string;targetGanzhi:string;attackerGanzhi:string;sourceClauseIds:string[];}
export interface RenJointBattleNodePair {position:string;ganzhi:string;stemNodeId:string;branchNodeId:string;}
export interface RenJointBattleDirectionUse {
 methodVersion:'ditian-ren-commentary-2600158/1.4.0';
 sourceId:'bazi-ditian-ren-directions-2600158';
 checkId:string;dependencyId:string;capability:'met'|'unknown'|'conflict';
 state:'met'|'not-met'|'unknown'|'conflict';proofResult:'met'|'not-met'|'unknown'|'conflict';
 sourceNodeIds:string[];targetNodeIds:string[];validatedWholeInheritedAnalysis:true;
}
export interface RenJointBattleCheck {
 id:string;patternId:string;name:string;state:RenJointBattleState;
 scope:'selected-original-chart-joint-stem-and-branch-conflict';
 target:RenJointBattleNodePair;attacker:RenJointBattleNodePair;
 controlEdgeId:string;clashEdgeId:string;meetingEdgeId:string|null;
 meetingNodeIds:string[];meetingClashIntersectionNodeIds:string[];
 inheritedDirection:RenJointBattleDirectionUse;
 samePillarTargetRootLinkIds:string[];relatedCarrierRootLinkIds:string[];
 sourceClauseIds:string[];projectBridgeIds:string[];
 sourceConsequence:string;evidence:string[];missing:string[];
 /** Joint movement is not an effective attack or a damage verdict. */
 branchClashNetEffect:'unknown';rootNetEffect:'unknown';effectiveAttackSide:'unknown';
 otherRescueMechanisms:'unknown';
}
export interface RenJointBattleAnalysis {
 version:'1.0.0';profileId:'ren-source-wood-direction-joint-battle/1.0.0';sourceId:'bazi-ditian-ren-joint-battle-2600158';
 authority:'ren-commentary-with-explicit-project-bridges';
 state:RenJointBattleState;
 stateScope:'some-selected-joint-in-the-adopted-domain';
 input:{baseMethodVersion:'ditian-ren-commentary-2600158/1.4.0';baseBaziVersion:string;complete:boolean;dayStem:string|null;pillars:{position:string;known:boolean;ganzhi?:string}[]};
 inheritedDirection:RenJointBattleDirectionUse;checks:RenJointBattleCheck[];
 sourceReferences:RenSourceReference[];projectBridges:{id:string;name:string;statement:string;authority:'project-adoption'}[];
 originalNodesRetained:true;retainedNodeIds:string[];retainedRootLinkIds:string[];
 branchClashNetEffect:'unknown';effectiveRootSupport:'unknown';effectiveAttackSide:'unknown';
 clashRescueResolved:'unknown';resourceProtectionResolved:'unknown';
 strengthDecision:'not-evaluated';formationDecision:'not-evaluated';usefulGodDecision:'not-evaluated';
 limitations:string[];
}
