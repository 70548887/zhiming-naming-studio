import{calculateFollowingPatternEvidence,type FollowingPatternContext}from'./following-patterns';
import{calculateFollowingShaChecks,followingShaRules}from'./following-sha';
import type{BaziAnalysis,FollowingPatternEvidence}from'../shared/types';

export const PATTERN_EVIDENCE_VERSION='qiongtong-monthly-pattern-evidence/1.1.0';
/** Wealth clause results remain verbatim; only the formerly unimplemented killing placeholder is replaced. */
export function calculatePatternEvidence(bazi:BaziAnalysis,context:FollowingPatternContext):FollowingPatternEvidence{
 const wealth=calculateFollowingPatternEvidence(bazi,context),sha=calculateFollowingShaChecks(bazi,context);
 return{version:PATTERN_EVIDENCE_VERSION,profile:'qiongtong-wealth-and-dependent-sha-clauses',rules:[...wealth.rules,...followingShaRules().rules],checks:[...wealth.checks.filter(check=>check.pattern!=='cong-sha'),...sha],limitations:[
  ...wealth.limitations.filter(value=>!value.includes('从杀、从儿、从旺')),
  '从财四条逐项结果保留原口径；新增从杀五路径只补明确字面支持、反向信号及依赖前提，未实现水多、旺度、一派或制化效果。',
  '反向信号有观测不等于拒绝条件已齐；前提未核或未知时不得上升为本句整体反证。',
  '从儿、从旺及所有格局的完整成立、真假从和最终用神取舍仍未实现。'
 ]};
}
