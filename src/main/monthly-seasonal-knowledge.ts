import type {KnowledgeEntry,MonthlySeasonalUse} from '../shared/types';
import {classicDisplay} from '../shared/classic-display';

export const MONTHLY_SEASONAL_KNOWLEDGE_PREFIX='fixed-tiaohou-2294674:';
export const MONTHLY_SEASONAL_KNOWLEDGE_CATEGORY='逐月调候原文';
interface Entry {
 dayStem:string;monthBranch:string;sourceId?:string;sourceQuote:string;sourceLocator:string;
 reviewStatus:'initial'|'needs-review';initialUses:Pick<MonthlySeasonalUse,'stem'|'role'|'sequence'|'quote'>[];
 missing:string[];conditions:{sourceQuote:string;sourceLocator:string;note?:string}[];
}
/** Fixed rule knowledge is independently versioned and cannot be replaced by a knowledge-pack update. */
export function monthlySeasonalKnowledge(entries:Entry[]):KnowledgeEntry[]{
 const role={first:'初始先用',support:'辅助参考',parallel:'并列参考',unranked:'原文未排序'};
 return entries.map(entry=>({
  id:MONTHLY_SEASONAL_KNOWLEDGE_PREFIX+entry.dayStem+entry.monthBranch,
  category:MONTHLY_SEASONAL_KNOWLEDGE_CATEGORY,
  title:`《穷通宝鉴》${entry.dayStem}日干 · ${entry.monthBranch}月（固定电子版）`,
  sourceId:entry.sourceId||'bazi-monthly-qiongtong-2294674',
  text:[`修订2294674 · ${entry.reviewStatus==='needs-review'?'原文合段或初用待复核':'初始取用参考'}，不等于完整调候或唯一喜用。`,
    ...(entry.initialUses.length?[entry.initialUses.map(use=>`${role[use.role]} ${use.stem}：${classicDisplay(use.quote)}`).join('\n')]:['未提出独立初始取用，不用其他摘要补齐。']),
    '所选原文（去除排版标记）：\n'+classicDisplay(entry.sourceQuote),
    '原文定位：'+entry.sourceLocator,
    ...entry.conditions.map(condition=>`条件原文：${classicDisplay(condition.sourceQuote)}\n定位：${condition.sourceLocator}${condition.note?'\n'+condition.note:''}`),
    ...entry.missing,
    '固定电子转录未独立校勘影印页；条件不全时保留人工复核，不改变现有姓名排序。'
   ].join('\n\n')
 }));
}
