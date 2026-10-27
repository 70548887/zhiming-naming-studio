import type {RenCapacityCheck,RenCapacityState} from './ren-capacities-types';

export const renCapacityProofLabel:Record<RenCapacityState,string>={met:'本证明条件齐备','not-met':'不在本证明子域',unknown:'本证明仍缺条件',conflict:'证明依据冲突'};
export function renCapacityConclusionLabel(check:RenCapacityCheck):string{
  if(check.capability==='conflict')return '本条局部能力存在冲突';
  if(check.capability==='unknown')return '本条局部能力尚待核';
  return check.kind==='wood-group-strength'?'本条木局旺势获原句支持':'辰对本木局的生助能力获原句支持';
}
