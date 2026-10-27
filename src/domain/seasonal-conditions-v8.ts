import {Solar} from 'lunar-typescript';
import supplement from '../../data/monthly-seasonal-conditions.json';
import {evaluateMonthlySeasonalPredicate,type MonthlySeasonalFacts} from './monthly-seasonal-v8';
import type {BaziAnalysis,BaziEvidenceRule,BaziEvidenceSource,MonthlySeasonalAnalysis,MonthlySeasonalPredicate,SeasonalConditionEvidence,SeasonalConditionObservation} from '../shared/types';

export const SEASONAL_CONDITION_VERSION='qiongtong-2294674-conditions/1.0.0';
const SOURCE_ID='bazi-monthly-qiongtong-2294674-conditions';
const SOURCE:BaziEvidenceSource={id:SOURCE_ID,name:'《穷通宝鉴》固定修订：限定条件事实补充',url:'https://zh.wikisource.org/w/index.php?title=穷通宝鉴&oldid=2294674',revision:'wikisource-revision/2294674',locator:'固定修订2294674逐条原句：乙酉、癸辰节气前提及明示透藏条件，详见本项原句定位',note:'仅补充明示事实；时间前提符合不表示原句整体条件或用神成立，旧逐月条件状态不被覆盖。'};
const RULE:BaziEvidenceRule={id:'bazi-seasonal-condition-supplement',version:'1.0.0',name:'逐月条件的限定事实补充',sourceIds:[SOURCE_ID,'bazi-evidence-lunar186'],conditions:[
 '独立于原逐月条目，原有15条条件的状态与初始取用不被本补充改写。',
 '节气前提只核白露→秋分、秋分→寒露、清明→谷雨、谷雨→立夏的实际半开时间区间；不把半月当15日或赋予旺弱阈值。',
 '时刻未知时对整日实际区间按节气瞬间切分，若跨界保留前提结果集合，不作唯一断定；重复民用时刻仍采用第一次。',
 'partial-prerequisite即使时间满足，也不代表桂蕊、桂花、火势或原句其他前提已满足；未核因素逐条保留。',
 'full-fact-predicate仅表示本条明确透、藏或有无事实核查完整，不继承原文富贵、人格、运势或最终取用结论。'
]};
export interface SeasonalSupplementRule{
 id:string;caseId:string;dayStem:string;monthBranch:string;originalConditionId?:string;sourceId:string;sourceQuote:string;sourceLocator:string;
 kind:'calendar-prerequisite'|'fact';scope:'partial-prerequisite'|'full-fact-predicate';
 calendar?:{fromTerm:string;toTerm:string;range:'[from,to)'};predicate?:MonthlySeasonalPredicate;unresolved:string[];proposedUses:unknown[];doesNotResolveOriginalBranch:boolean;
}
export interface SeasonalSupplementContext{
 ranges:{startEpoch:number;endEpoch:number}[];timeUnknown:boolean;ambiguous:boolean;monthly:MonthlySeasonalAnalysis;facts:MonthlySeasonalFacts;
}
export function seasonalConditionRules():{sources:BaziEvidenceSource[];rules:BaziEvidenceRule[]}{return {sources:[{...SOURCE}],rules:[{...RULE,sourceIds:[...RULE.sourceIds],conditions:[...RULE.conditions]}]};}
export function seasonalSupplementRules():SeasonalSupplementRule[]{
 const data=supplement as unknown as {version:string;rules:SeasonalSupplementRule[]};
 if(data.version!==SEASONAL_CONDITION_VERSION||!Array.isArray(data.rules))throw new Error('逐月条件补充资料版本无效。');return structuredClone(data.rules);
}
const solarAt=(epoch:number):Solar=>{const date=new Date(epoch+8*3600000);return Solar.fromYmdHms(date.getUTCFullYear(),date.getUTCMonth()+1,date.getUTCDate(),date.getUTCHours(),date.getUTCMinutes(),date.getUTCSeconds());};
const solarEpoch=(value:Solar)=>Date.UTC(value.getYear(),value.getMonth()-1,value.getDay(),value.getHour()-8,value.getMinute(),value.getSecond());
const at=(epoch:number)=>new Date(epoch).toISOString();

/** The selected four windows are within one Gregorian year; table points come from the fixed calendrical dependency. */
export function seasonalTermWindow(epoch:number,fromTerm:string,toTerm:string):{fromEpoch:number;toEpoch:number}{
 const lunar=solarAt(epoch).getLunar(),table=lunar.getJieQiTable(),year=solarAt(epoch).getYear();
 const from=table[fromTerm],to=table[toTerm];
 if(!from||!to||from.getYear()!==year||to.getYear()!==year)throw new Error('节气前提需要同年且明确提供的节气端点。');
 const fromEpoch=solarEpoch(from),toEpoch=solarEpoch(to);if(fromEpoch>=toEpoch)throw new Error('节气前提区间顺序无效。');return {fromEpoch,toEpoch};
}
function calendarObservations(ranges:SeasonalSupplementContext['ranges'],calendar:NonNullable<SeasonalSupplementRule['calendar']>):SeasonalConditionObservation[]{
 if(calendar.range!=='[from,to)')throw new Error('节气前提区间必须为半开区间。');
 return ranges.flatMap(range=>{
  const {fromEpoch,toEpoch}=seasonalTermWindow(range.startEpoch,calendar.fromTerm,calendar.toTerm);
  const cuts=[range.startEpoch,...[fromEpoch,toEpoch].filter(value=>value>range.startEpoch&&value<=range.endEpoch),range.endEpoch+1000].sort((a,b)=>a-b);
  return cuts.slice(0,-1).map((start,index)=>({startAt:at(start),endAt:at(cuts[index+1]-1000),result:start>=fromEpoch&&start<toEpoch?'met' as const:'not-met' as const,fromTermAt:at(fromEpoch),toTermAt:at(toEpoch),evidence:[`只核${calendar.fromTerm}≤实际瞬间<${calendar.toTerm}；窗口${at(fromEpoch)}至${at(toEpoch)}（右端不含）。`]}));
 });
}
export function calculateSeasonalConditionEvidence(bazi:BaziAnalysis,context:SeasonalSupplementContext):SeasonalConditionEvidence{
 if(!context.ranges.length||context.ranges.some(range=>!Number.isSafeInteger(range.startEpoch)||!Number.isSafeInteger(range.endEpoch)||range.startEpoch%1000||range.endEpoch%1000||range.startEpoch>range.endEpoch||range.endEpoch-range.startEpoch>3*86400000))throw new Error('条件补充需要有界的实际整秒区间。');
 const warnings=['本补充不改写原逐月条件、初始取用或系统喜用；不参与姓名排名。','只核所列事实，部分前提满足不等于原句完整适用或用神成立。',...(context.ambiguous?['重复民用时刻仅核第一次实际瞬间，第二次未计算。']:[])];
 if(context.monthly.status==='not-selected')return {version:SEASONAL_CONDITION_VERSION,profile:'qiongtong-2294674-conditions',status:'not-selected',rules:seasonalConditionRules().rules,checks:[],warnings};
 const dayMaster=bazi.pillars.find(p=>p.label==='日柱')!.gan,monthBranches=context.monthly.monthBranches;
 const applicable=seasonalSupplementRules().filter(rule=>rule.dayStem===dayMaster&&monthBranches.includes(rule.monthBranch));
 const checks=applicable.map(rule=>{
  let observations:SeasonalConditionObservation[]=[],predicateDescription='',status:'met'|'not-met'|'uncertain'|'not-evaluated'='not-evaluated';
  let missing=[...rule.unresolved];
  if(rule.kind==='calendar-prerequisite'&&rule.calendar){
   observations=calendarObservations(context.ranges,rule.calendar);predicateDescription=`仅时间前提：${rule.calendar.fromTerm}≤实际瞬间<${rule.calendar.toTerm}`;
   const outcomes=new Set(observations.map(item=>item.result));status=outcomes.size>1?'uncertain':outcomes.has('met')?'met':'not-met';
   missing.push('已核的只是时间前提，不改变原条件尚未实现的状态。');
  }else if(rule.kind==='fact'&&rule.predicate){
   const checked=evaluateMonthlySeasonalPredicate(rule.predicate,context.facts);predicateDescription='仅核原句明示的透、藏或有无事实';status=checked.result==='unknown'?'uncertain':checked.result;
   observations=context.ranges.map(range=>({startAt:at(range.startEpoch),endAt:at(range.endEpoch),result:checked.result,evidence:checked.evidence}));missing.push(...checked.missing);
  }else missing.push('本条未提供可执行的明确谓词，未自动解释。');
  return {id:rule.id,caseId:rule.caseId,...(rule.originalConditionId?{conditionId:rule.originalConditionId}:{}),dayMaster:rule.dayStem,monthBranch:rule.monthBranch,sourceId:rule.sourceId,sourceQuote:rule.sourceQuote,sourceLocator:rule.sourceLocator,scope:rule.scope,status,predicateDescription,observations,missing,doesNotResolveOriginalBranch:rule.doesNotResolveOriginalBranch};
 });
 return {version:SEASONAL_CONDITION_VERSION,profile:'qiongtong-2294674-conditions',status:bazi.pillars.some(p=>p.label==='月柱')?'available':'pending',rules:seasonalConditionRules().rules,checks,warnings:[...warnings,...(!bazi.pillars.some(p=>p.label==='月柱')?['出生日期交节，月份待定；仅列可能月份条件前提，不给唯一结论。']:[])]};
}
