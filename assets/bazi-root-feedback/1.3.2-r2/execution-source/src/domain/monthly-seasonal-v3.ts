/** Frozen publication1.3 and prior civil-time policy. Do not repair old recorded results in place. */
import tableData from '../../data/monthly-seasonal-table-v1.json';
import { normalizeSeasonalMethod } from '../shared/seasonal-method';
import type {
  BaziAnalysis,BaziEvidenceRule,BaziEvidenceSource,BaziHiddenStemFact,BaziMonthAuthority,BaziStemFact,
  Element,MonthlySeasonalAnalysis,MonthlySeasonalCase,MonthlySeasonalCondition,MonthlySeasonalPredicate,
  MonthlySeasonalStemFact,MonthlySeasonalUse,SeasonalMethod
} from '../shared/types';

export const MONTHLY_SEASONAL_VERSION='monthly-seasonal-evidence/1.0.0';
export const MONTHLY_SEASONAL_TABLE_VERSION='qiongtong-2294674-initial/1.0.0';
const SOURCE_ID='bazi-monthly-qiongtong-2294674';
const STEMS=[...'甲乙丙丁戊己庚辛壬癸'];
const STEM_ELEMENT:Record<string,Element>={甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
const SOURCE:BaziEvidenceSource={id:SOURCE_ID,name:'《穷通宝鉴》固定电子修订逐月初始取用参考',url:'https://zh.wikisource.org/w/index.php?title=穷通宝鉴&oldid=2294674',revision:'wikisource-revision/2294674',locator:'维基文库固定修订2294674：十干逐月段落；详见本次条目定位',note:'固定电子转录，尚非影印页独立校勘；按原段保留初始取用与条件，不把提到的天干全部当推荐，不以此断唯一喜用神。'};
const RULE:BaziEvidenceRule={id:'bazi-monthly-seasonal-initial',version:'1.0.0',name:'固定版逐月初始取用与限定事实条件核对',sourceIds:[SOURCE_ID,'bazi-evidence-lunar186'],conditions:[
  '默认不启用逐月参考；明确选择固定版方法后，按已确定日干和十二节月支读取本版条目。',
  '初始取用只采用逐条人工整理的原句角色与顺序；原文泛滥、忌、病等提干不自动成为推荐。',
  '条件只核对明确整理的明干、藏支、有无与all/any/not组合；未声明作用范围或涉及多寡旺弱、从格合化时保留尚未实现。',
  '缺失柱时，已见的存在可肯定；未见不能证明不存在。日干自身是否计入明干条件由每条明确指定。',
  '月柱交节待定时只并列原文参考且整体待定，不产生可采用的元素集合；未知时刻不补时柱。',
  '这仅是原文初始取用和已知事实核对；特殊格局、用神取舍、先后转用与运势仍需人工，不影响既有扶抑与姓名排序。'
]};
interface SourceUse {stem:string;role:MonthlySeasonalUse['role'];sequence:number;quote:string;}
export interface MonthlySeasonalSourceEntry {
  dayStem:string;monthBranch:string;sourceId?:string;sourceQuote:string;sourceLocator:string;
  initialUses:SourceUse[];reviewStatus:'initial'|'needs-review';missing:string[];
  conditions:{id:string;sourceQuote:string;sourceLocator:string;predicate?:MonthlySeasonalPredicate;proposedUses?:SourceUse[];note?:string;missing?:string[]}[];
}
export interface MonthlySeasonalFacts {
  dayMaster:string;stems:Pick<BaziStemFact,'pillar'|'stem'>[];hiddenStems:Pick<BaziHiddenStemFact,'pillar'|'branch'|'stem'>[];complete:boolean;
}
export interface MonthlySeasonalContext {
  method?:SeasonalMethod;timeUnknown:boolean;ambiguous:boolean;monthAuthority:BaziMonthAuthority;
  stems:BaziStemFact[];hiddenStems:BaziHiddenStemFact[];
}
export function monthlySeasonalRules():{sources:BaziEvidenceSource[];rules:BaziEvidenceRule[]} {
  return {sources:[{...SOURCE}],rules:[{...RULE,sourceIds:[...RULE.sourceIds],conditions:[...RULE.conditions]}]};
}
function sourceEntries():MonthlySeasonalSourceEntry[] {
  const data=tableData as unknown as {version:string;entries:MonthlySeasonalSourceEntry[]};
  if(data.version!==MONTHLY_SEASONAL_TABLE_VERSION||!Array.isArray(data.entries)||data.entries.length!==120)throw new Error('逐月取用参考版本或120条目不完整。');
  return data.entries;
}
export function monthlySeasonalEntries():MonthlySeasonalSourceEntry[] {
  return structuredClone(sourceEntries());
}
const uses=(input:SourceUse[]):MonthlySeasonalUse[]=>input.map(use=>{
  if(!STEM_ELEMENT[use.stem]||!['first','support','parallel','unranked'].includes(use.role)||!Number.isSafeInteger(use.sequence)||typeof use.quote!=='string')throw new Error('逐月初始取用条目无效。');
  return {...use,element:STEM_ELEMENT[use.stem]};
});
export function monthlySeasonalStemFact(stem:string,facts:MonthlySeasonalFacts):MonthlySeasonalStemFact {
  const exposedPositions=facts.stems.filter(fact=>fact.pillar!=='日柱'&&fact.stem===stem).map(fact=>fact.pillar);
  const hiddenPositions=facts.hiddenStems.filter(fact=>fact.stem===stem).map(fact=>fact.pillar+fact.branch);
  return {stem,exposedPositions,hiddenPositions,dayMasterSame:facts.dayMaster===stem,absence:facts.complete?'not-seen':'unknown'};
}
export interface MonthlyPredicateResult {result:'met'|'not-met'|'unknown';evidence:string[];missing:string[];}
/** Three-valued, scope-explicit fact checking; no strength or majority thresholds are inferred. */
export function evaluateMonthlySeasonalPredicate(predicate:MonthlySeasonalPredicate,facts:MonthlySeasonalFacts,depth=0):MonthlyPredicateResult {
  if(!predicate||typeof predicate!=='object'||depth>12)throw new Error('逐月参考条件结构无效。');
  if(predicate.kind==='stem'){
    if(!STEM_ELEMENT[predicate.stem]||!['exposed','hidden','any'].includes(predicate.scope)||typeof predicate.includeDayMaster!=='boolean'||typeof predicate.present!=='boolean')throw new Error('逐月参考干支条件无效。');
    const exposed=facts.stems.filter(fact=>fact.stem===predicate.stem&&(predicate.includeDayMaster||fact.pillar!=='日柱')).map(fact=>fact.pillar+fact.stem);
    const hidden=facts.hiddenStems.filter(fact=>fact.stem===predicate.stem).map(fact=>fact.pillar+fact.branch+'藏'+fact.stem);
    const hits=predicate.scope==='exposed'?exposed:predicate.scope==='hidden'?hidden:[...exposed,...hidden];
    const knownPresent=hits.length>0,presentResult:MonthlyPredicateResult['result']=knownPresent?'met':facts.complete?'not-met':'unknown';
    const result=predicate.present?presentResult:presentResult==='met'?'not-met':presentResult==='not-met'?'met':'unknown';
    return {result,evidence:[`${predicate.scope==='exposed'?'明干':predicate.scope==='hidden'?'藏干':'明干或藏干'}检查${predicate.stem}：${hits.join('、')||'已知柱未见'}；${predicate.includeDayMaster?'计入':'不计入'}日干自身的明干位置。`],missing:result==='unknown'?['柱位不完整，未见不能证明没有。']:[]};
  }
  if(predicate.kind==='not'){
    const child=evaluateMonthlySeasonalPredicate(predicate.item,facts,depth+1);
    return {...child,result:child.result==='met'?'not-met':child.result==='not-met'?'met':'unknown'};
  }
  if(predicate.kind!=='all'&&predicate.kind!=='any'||!Array.isArray(predicate.items)||!predicate.items.length||predicate.items.length>20)throw new Error('逐月参考组合条件无效。');
  const items=predicate.items.map(item=>evaluateMonthlySeasonalPredicate(item,facts,depth+1));
  const result=predicate.kind==='all'?items.some(item=>item.result==='not-met')?'not-met':items.some(item=>item.result==='unknown')?'unknown':'met':items.some(item=>item.result==='met')?'met':items.some(item=>item.result==='unknown')?'unknown':'not-met';
  return {result,evidence:items.flatMap(item=>item.evidence),missing:[...new Set(items.flatMap(item=>item.missing))]};
}
function caseFor(entry:MonthlySeasonalSourceEntry,facts:MonthlySeasonalFacts):MonthlySeasonalCase {
  const initialUses=uses(entry.initialUses),conditionBranches:MonthlySeasonalCondition[]=entry.conditions.map(condition=>{
    const checked=condition.predicate?evaluateMonthlySeasonalPredicate(condition.predicate,facts):undefined;
    return {id:condition.id,sourceQuote:condition.sourceQuote,sourceLocator:condition.sourceLocator,...(condition.predicate?{predicate:structuredClone(condition.predicate)}:{}),result:checked?.result??'not-implemented',proposedUses:uses(condition.proposedUses||[]),observedEvidence:checked?.evidence||[],missing:[...(condition.missing||[]),...(condition.note?[condition.note]:[]),...(checked?.missing||[]),...(!checked?['本条没有可验证的明确事实谓词，未自动解释原文旺弱、多寡或特殊格局。']:[])]};
  });
  const mentioned=new Set([...initialUses.map(use=>use.stem),...conditionBranches.flatMap(condition=>condition.proposedUses.map(use=>use.stem)),...STEMS.filter(stem=>[entry.sourceQuote,...entry.conditions.map(condition=>condition.sourceQuote)].some(quote=>quote.includes(stem)))]);
  return {dayMaster:entry.dayStem,monthBranch:entry.monthBranch,sourceId:entry.sourceId||SOURCE_ID,sourceQuote:entry.sourceQuote,sourceLocator:entry.sourceLocator,reviewStatus:entry.reviewStatus,initialUses,conditionBranches,stemFacts:[...mentioned].map(stem=>monthlySeasonalStemFact(stem,facts)),unresolved:[...entry.missing,...(entry.reviewStatus==='needs-review'?['该条原文合段、缺专节或初始取用不明确，保留人工审阅，不由现代摘要补齐。']:[])]};
}

export function calculateMonthlySeasonal(bazi:BaziAnalysis,context:MonthlySeasonalContext):MonthlySeasonalAnalysis {
  const method=normalizeSeasonalMethod(context.method),dayMaster=bazi.pillars.find(pillar=>pillar.label==='日柱')?.gan;
  if(!dayMaster||!STEM_ELEMENT[dayMaster])throw new Error('逐月参考需要已确定日干。');
  const limitations=['逐月初始参考与旧季节意象、扶抑意见分别记录，不合并为唯一喜用神，也不改变姓名筛选和排序。','原文仍有转用、强弱、格局及先后条件；事实条件核对不是完整调候裁决。','固定电子修订未进行影印页独立校勘；传统文化判断不代表科学证实的命运或人格效果。',...(context.timeUnknown?['出生时刻未知，没有时柱；未见的透干或藏干不能断定不存在。']:[]),...(context.ambiguous?['重复民用时刻只采用第一次实际瞬间，第二次未计算。']:[])];
  if(method==='no-monthly/1.0.0')return {version:MONTHLY_SEASONAL_VERSION,methodId:method,status:'not-selected',ruleId:RULE.id,dayMaster,monthBranches:[],cases:[],proposedElements:[],requiresManualReview:true,limitations};
  const month=bazi.pillars.find(pillar=>pillar.label==='月柱');
  const monthBranches=month?[month.zhi]:[...new Set(context.monthAuthority.segments.map(segment=>segment.monthBranch))];
  const facts:MonthlySeasonalFacts={dayMaster,stems:context.stems,hiddenStems:context.hiddenStems,complete:bazi.pillars.length===4&&!context.timeUnknown};
  const entries=sourceEntries();
  const cases=monthBranches.map(monthBranch=>{
    const entry=entries.find(entry=>entry.dayStem===dayMaster&&entry.monthBranch===monthBranch);
    if(!entry)throw new Error('逐月参考缺少当前日干与月支条目。');return caseFor(entry,facts);
  });
  const pending=!month||cases.some(item=>item.reviewStatus==='needs-review'||!item.initialUses.length);
  const reviewed=cases.length===1&&!context.timeUnknown&&!context.ambiguous&&cases[0].conditionBranches.length>0&&cases[0].conditionBranches.every(condition=>condition.result==='met'||condition.result==='not-met');
  const status:MonthlySeasonalAnalysis['status']=pending?'pending':reviewed?'conditions-reviewed':'initial-reference';
  return {version:MONTHLY_SEASONAL_VERSION,methodId:method,status,ruleId:RULE.id,dayMaster,monthBranches,cases,
    proposedElements:pending?[]:[...new Set(cases.flatMap(item=>item.initialUses.map(use=>use.element)))],requiresManualReview:true,limitations:[...limitations,...(!month?['月柱交节待定：并列可能月份原文，暂不提出可采用的逐月元素。']:[])]};
}
