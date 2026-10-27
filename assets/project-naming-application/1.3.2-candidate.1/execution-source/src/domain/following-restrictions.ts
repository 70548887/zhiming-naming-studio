import table from '../../data/following-restrictions-rules.json';
import type {BaziAnalysis,MonthFollowingRestriction,MonthFollowingRestrictions} from '../shared/types';

export const FOLLOWING_RESTRICTIONS_VERSION='qiongtong-2294674-monthly-following-restrictions/1.0.0' as const;
export const FOLLOWING_RESTRICTIONS_PROFILE='qiongtong-2294674-fixed-month-restrictions' as const;
export const FOLLOWING_RESTRICTIONS_SOURCE_ID='bazi-following-restrictions-qiongtong-2294674';
export interface FollowingRestrictionRule {
  id:string;name:string;patterns:('cong-cai'|'cong-sha')[];dayStems:string[];monthBranches:string[];
  scope:'fixed-source-clause-only';sourceId:string;sourceHeading:string;sourceQuote:string;sourceLocator:string;
  sourceSpan:{start:number;end:number;unit:'unicode-codepoint';interval:'[start,end)'};note:string;
}
/** This profile uses only explicit monthly exclusions; no strength or formation threshold. */
export function followingRestrictionRules():FollowingRestrictionRule[] {
  if(table.version!==FOLLOWING_RESTRICTIONS_VERSION||table.profile!==FOLLOWING_RESTRICTIONS_PROFILE||table.sourceId!==FOLLOWING_RESTRICTIONS_SOURCE_ID||table.rules.length!==2)throw new Error('从格月份限制规则版本不完整。');
  return structuredClone(table.rules) as FollowingRestrictionRule[];
}
export interface FollowingRestrictionContext {possibleMonthBranches?:string[];}
export function calculateMonthFollowingRestrictions(bazi:Pick<BaziAnalysis,'pillars'>,context:FollowingRestrictionContext={}):MonthFollowingRestrictions {
  const day=bazi.pillars.find(pillar=>pillar.label==='日柱')?.gan;
  const month=bazi.pillars.find(pillar=>pillar.label==='月柱')?.zhi;
  if(day&&!/^[甲乙丙丁戊己庚辛壬癸]$/.test(day)||month&&!/^[子丑寅卯辰巳午未申酉戌亥]$/.test(month))throw new Error('月份限制需要有效且已确定的日干、月支。');
  const possible=[...new Set(context.possibleMonthBranches??[])];
  if(possible.some(branch=>!/^[子丑寅卯辰巳午未申酉戌亥]$/.test(branch)))throw new Error('月份限制的可能月支无效。');
  const monthBranches=month?[month]:possible;
  const checks:MonthFollowingRestriction[]=followingRestrictionRules().map(rule=>{
    const missing:string[]=[];let status:MonthFollowingRestriction['status']='pending',explanation='日干或月支尚未确定，本条月份限制待审。';
    if(!day){missing.push('日主未定；不使用代表时刻或任选可能日期补日干。');if(!month)missing.push('月柱交节待定，不从可能月份中任选一项。');}
    else if(!rule.dayStems.includes(day)){status='not-applicable';explanation=`已确定日干${day}不在本条${rule.dayStems.join('、')}日范围；本条不适用，不表示其他从格已成立。`;}
    else if(!month){missing.push('月柱交节待定；可能月份只供说明，不作确定月柱。');}
    else if(!rule.monthBranches.includes(month)){status='not-applicable';explanation=`已确定${day}日${month}月不在本条${rule.dayStems.join('、')}日${rule.monthBranches.join('、')}月范围；不反推从格成立。`;}
    else {status='applies';explanation=`已确定${day}日${month}月符合本固定版本原句不取${rule.patterns.map(pattern=>pattern==='cong-cai'?'从财':'从杀').join('、')}的月份限制；不推广为其他流派结论。`;}
    return {id:rule.id,name:rule.name,patterns:[...rule.patterns],status,scope:rule.scope,sourceId:rule.sourceId,sourceQuote:rule.sourceQuote,sourceLocator:rule.sourceLocator,sourceHeading:rule.sourceHeading,targetDayStems:[...rule.dayStems],targetMonthBranches:[...rule.monthBranches],...(day?{dayStem:day}:{}),monthBranches:[...monthBranches],explanation,missing};
  });
  return {version:FOLLOWING_RESTRICTIONS_VERSION,profile:FOLLOWING_RESTRICTIONS_PROFILE,sourceId:FOLLOWING_RESTRICTIONS_SOURCE_ID,checks,limitations:[
    '只记录固定修订2294674的明确月份限制，不代表所有流派不取，也不作完整真从、假从或喜用裁决。',
    '原句从化字样按原文保留；本字段仅约束从财、从杀，未评估化气或合化。',
    '不适用只表示未命中本条限制，不是从格成立证据；其他从财、从杀必要条件和未核项保持原状。',
    '未知时刻但日干和月支确定时仍可核本条；日主或月柱待定时不补代表日干或月份。',
    '未采用原文财富、人格、家属、疾病或运势断语；固定电子转录尚未独立校勘影印页。'
  ]};
}
