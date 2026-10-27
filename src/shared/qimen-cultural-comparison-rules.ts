import type {Element} from './types';
import type {OuterPalace} from './qimen-cultural-comparison';

/** Project comparison convention only; this table grants no character/source admission. */
export const CULTURAL_OUTER_PALACES=Object.freeze([1,2,3,4,6,7,8,9] as const);
export const CULTURAL_ELEMENT_PALACES:Readonly<Record<Element,readonly OuterPalace[]>>=Object.freeze({
 木:Object.freeze([3,4] as const),火:Object.freeze([9] as const),土:Object.freeze([2,8] as const),金:Object.freeze([6,7] as const),水:Object.freeze([1] as const),
});
/** M829 implementation budgets, newly fixed here; M806 specified bounded data
 * but did not prescribe these numeric limits. Nodes count values/containers;
 * text code units count both object keys and string values.
 */
export const CULTURAL_JSON_LIMITS=Object.freeze({maxDepth:64,maxNodes:500_000,maxTextCodeUnits:16_777_216,maxArrayLength:100_000});
export const CULTURAL_COMPARISON_LIMITATIONS=Object.freeze([
 '这是项目自订文化比较，不是传统姓名落宫或姓名吉凶验算。',
 '字典事实、项目标签、逐义物象、宫位表与原盘观察各有来源；本比较层不授予来源或标签准入。',
 '姓氏只作姓名背景，中宫5不纳入给名集合；不搬移中宫，不从笔画、偏旁、AI或缺项推补元素。',
 '共同为全体交集；其余为本名减共同；独有为本名减其他所有名字的并集。位置不同不表示优劣或冲突。',
 '未知字位只列已知子集，未知出生盘只保留静态对照；空交集不证明确定没有共同位置或名字通过。',
 '原盘结构不是名字造成或解除的作用；不同规则依据不合并成真假、好坏或四害解除结论。',
 '天盘干保留原宫heaven整段原文（含寄干文字），不拆字或据此推断新的主干、寄干结构。',
 '输入须由主进程固定来源适配器先认证；本结果不是存储、备份、UI或报告流程已接通的证明。',
]);
