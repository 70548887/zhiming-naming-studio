import type {RenDirectionCheck,RenDirectionFact,RenDirectionFactKind} from './ren-directions-types';

export function renDirectionConclusionLabel(check:Pick<RenDirectionCheck,'capability'>):string {
  return check.capability==='met'?'原句支持本方局部旺势':check.capability==='conflict'?'证据冲突，继续待核':'本条尚未证明局部旺势';
}
export function renDirectionConsequenceLead(check:Pick<RenDirectionCheck,'capability'>):string {
  return check.capability==='met'?'本条已证明的原句结论':'原句前提齐备时才可采用的结论';
}
export function renDirectionFactStateLabel(fact:Pick<RenDirectionFact,'kind'|'contributesToProof'|'state'>):string {
  if(fact.kind==='input-fact'&&!fact.contributesToProof)return {met:'四柱已定','not-met':'输入条件不符',unknown:'存在未定柱',conflict:'输入记录冲突'}[fact.state];
  return {met:'该项前提符合','not-met':'该项前提不符',unknown:'该项前提待核',conflict:'该项依据冲突'}[fact.state];
}
export const renDirectionFactKindLabel:Record<RenDirectionFactKind,string>={
  'input-fact':'已定输入事实','source-premise':'原句充分条件','source-qualification':'原文范围说明','project-restriction':'项目约定'
};
