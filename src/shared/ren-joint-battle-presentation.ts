import type {RenJointBattleAnalysis,RenJointBattleCheck,RenJointBattleState} from './ren-joint-battle-types';
import type {RenStructureNode} from './types';
import {renNodeText} from './ren-presentation';

export const renJointBattleStateLabel:Record<RenJointBattleState,string>={
 'not-fully-quiet':'所指方会未使该组合完全静息',
 'not-applicable':'不在本条采用范围',
 unknown:'资料或前提待核',
};
export const REN_JOINT_SCOPE_TEXT='本项只检查同一两柱的干克、支冲与已证明的木方会气。结论针对所列双层组合，不据此判断哪一边仍在起作用、单支是否解冲、根是否受损或名字吉凶。';
export const REN_JOINT_RETAINED_TEXT='单支冲的净作用、有效根气、其他救应、完整旺衰、成格与喜用仍待核；本项不改变姓名评分。';
export function renJointBattleConsequence(check:RenJointBattleCheck):string{
 return check.state==='not-fully-quiet'?'本次限定判断：'+check.sourceConsequence:'前提齐备且符合本条范围时，才可采用以下后果；当前未作此判断：'+check.sourceConsequence;
}
export function renJointBattleEvidence(value:string,check:RenJointBattleCheck,nodes:RenStructureNode[]):string{
 const known=new Map(nodes.map(node=>[node.id,node]));
 const pair=(ids:string[])=>ids.map(id=>{const node=known.get(id);return node?renNodeText(node):'字位待核';}).join(' → ');
 let result=value.replaceAll(check.controlEdgeId,'（'+pair([check.attacker.stemNodeId,check.target.stemNodeId])+'）').replaceAll(check.clashEdgeId,'（'+pair([check.attacker.branchNodeId,check.target.branchNodeId])+'）');
 for(const [key,label]of Object.entries({year:'年',month:'月',day:'日',hour:'时'}))result=result.replaceAll(key+'柱',label+'柱');
 return result;
}
export function renJointBattleSummary(analysis:RenJointBattleAnalysis):string{
 return analysis.state==='not-fully-quiet'?'所选范围中至少一组符合本条限定判断；不把它扩大为全盘结论。':analysis.state==='unknown'?'当前资料或继承证明尚未齐备，不能把未知当作已经静息或已经受损。':'本条所需的组合或采用前提未命中；不据此否定其他冲克、会合或解救。';
}
