import type { MonthFollowingRestriction } from './types';

export const restrictionStatusLabel = (status:MonthFollowingRestriction['status']):string => ({
  applies:'本固定版本原句不取',
  pending:'日主或月份待定 · 暂不裁决',
  'not-applicable':'未命中本条月份限制'
}[status]);
export const restrictionPatternLabel = (patterns:MonthFollowingRestriction['patterns']):string => patterns.map(pattern=>pattern==='cong-cai'?'从财':'从杀').join('、');
