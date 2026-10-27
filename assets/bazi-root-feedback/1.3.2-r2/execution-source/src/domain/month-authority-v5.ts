/** Frozen Bazi1.5 evidence before pattern support/contradiction facts. */
import { Solar } from 'lunar-typescript';
import tableData from '../../data/month-authority-table.json';
import { normalizeMonthAuthorityMethod } from '../shared/month-authority-method';
import type {
  BaziEvidenceRule,BaziEvidenceSource,BaziMonthAuthority,BaziMonthAuthorityCandidate,
  BaziMonthAuthoritySegment,MonthAuthorityMethod,MonthAuthorityReference,MonthAuthorityTableMonth
} from '../shared/types';

export const MONTH_AUTHORITY_TABLE_VERSION='sanming-first-paragraph/1.0.0';
const SOURCE_ID='bazi-month-authority-sanming-v1';
export interface MonthAuthorityContext {
  timezone:string;timeUnknown:boolean;ambiguous:boolean;method?:MonthAuthorityMethod;
  /** Closed actual-instant ranges, resolved from the civil input before this module is called. */
  ranges:{startEpoch:number;endEpoch:number}[];
}
const source:BaziEvidenceSource={id:SOURCE_ID,name:'《三命通会》卷二人元司事首段转录参考',url:'https://github.com/mikkokotila/Sanming-Tongshui',revision:'eb3cacbf4b41a4fe8fc3c0e77e0d12b5bd17c079',locator:'source/juan-02.md:#論人元司事:first-prose-paragraph',note:'公开古文的电子转录参考；首段与后列《玉井》表有异读，醉醒子又反对定日限。本软件只定位所选转录表，不裁定唯一司权。'};
const rule:BaziEvidenceRule={id:'bazi-month-authority',version:'1.1.0',name:'十二节实际区间与可选首段分日表定位',sourceIds:['bazi-evidence-lunar186',SOURCE_ID],conditions:[
  '默认不按固定日限定位；只有明确选择首段转录参考才输出软件表段候选。',
  '从前一十二节的实际交节秒起，以实际86400秒为一日；各段采用半开区间[fromDay,toDay)，新段包含边界秒。',
  '相邻十二节实际月长不足30日时按下一节裁切；超过30日的时段标为超出表范围，不续用末段、不缩放归一。',
  '未知出生时刻合并全日可能表段并保留不确定；已知重复民用时刻按既有第一次政策定位，同时标注歧义。',
  '原文术语逐字保留；艮土、坤土、巳土、已土等不强制改成某天干。首段、玉井异表与醉醒子反定日限意见并列展示。',
  '这是特定转录表的软件定位，不证明唯一司令、格局、喜用神或姓名吉凶；不改变扶抑计算与姓名排序。'
]};

/** Raw source tables are read as a fixed publication, never as an automatically corrected school standard. */
export function monthAuthorityReference():MonthAuthorityReference {
  const data=tableData as unknown as {version:string;months:MonthAuthorityTableMonth[];readings?:{id:string;title:string;quote:string;sourceLocator:string;note:string}[];limitations?:string[];verification?:{note?:string}};
  if(data.version!==MONTH_AUTHORITY_TABLE_VERSION||data.months.length!==12)throw new Error('月令转录参考版本或月份不完整。');
  return {version:MONTH_AUTHORITY_TABLE_VERSION,sourceId:SOURCE_ID,title:'《三命通会》人元司事首段：分日转录参考',months:structuredClone(data.months),
    alternativeViews:(data.readings||[]).map(reading=>({title:reading.title,sourceQuote:reading.quote,sourceLocator:reading.sourceLocator,note:reading.note})),
    limitations:[...(data.limitations||[]),...(data.verification?.note?[data.verification.note]:[]),'首段仅是本次选定的转录读法，后列玉井异表与反定日限意见不能略去。','术语、天数及边界从原件转录；软件采用实际经过24小时的操作口径，不宣称古文唯一要求此算法。','所选表全为30日；实际节月裁切后可能不足30日，超过30日的尾段不作延续或归一化。']};
}
export function monthAuthorityRules():{sources:BaziEvidenceSource[];rules:BaziEvidenceRule[]} {
  return {sources:[{...source}],rules:[{...rule,sourceIds:[...rule.sourceIds],conditions:[...rule.conditions]}]};
}
const solarAt=(epoch:number):Solar=>{
  const date=new Date(epoch+8*3600000);
  return Solar.fromYmdHms(date.getUTCFullYear(),date.getUTCMonth()+1,date.getUTCDate(),date.getUTCHours(),date.getUTCMinutes(),date.getUTCSeconds());
};
const solarEpoch=(solar:Solar)=>Date.UTC(solar.getYear(),solar.getMonth()-1,solar.getDay(),solar.getHour()-8,solar.getMinute(),solar.getSecond());
const at=(epoch:number)=>new Date(epoch).toISOString();
const dayMs=86400000;

/** Inclusive elapsed-second range against half-open source rows and a half-open actual Jie month. */
export function locateMonthAuthorityRows(monthBranch:string,elapsedStartSeconds:number,elapsedEndSeconds:number,actualMonthSeconds:number):{candidates:BaziMonthAuthorityCandidate[];unlocated:{fromSeconds:number;toSeconds:number}[]} {
  if(!Number.isSafeInteger(elapsedStartSeconds)||!Number.isSafeInteger(elapsedEndSeconds)||elapsedEndSeconds<elapsedStartSeconds||!Number.isSafeInteger(actualMonthSeconds)||actualMonthSeconds<=0)throw new Error('分日表范围参数无效。');
  const month=monthAuthorityReference().months.find(item=>item.monthBranch===monthBranch);
  if(!month)throw new Error('所选转录表缺少当前月支。');
  const start=Math.max(0,elapsedStartSeconds),end=Math.min(elapsedEndSeconds,actualMonthSeconds-1),candidates:BaziMonthAuthorityCandidate[]=[];
  if(start>end)return {candidates,unlocated:[]};
  for(const segment of month.segments){
    const from=segment.fromDay*86400,to=Math.min(segment.toDay*86400,actualMonthSeconds);
    if(start>=to||end<from)continue;
    candidates.push({sourceTerm:segment.sourceTerm,...(segment.normalizedStem?{normalizedStem:segment.normalizedStem}:{}),monthBranch,element:segment.element,fromDay:segment.fromDay,toDay:segment.toDay,sourceId:SOURCE_ID,sourceLocator:month.sourceLocator});
  }
  return {candidates,unlocated:end>=30*86400?[{fromSeconds:Math.max(start,30*86400),toSeconds:end}]:[]};
}

function validateContext(context:MonthAuthorityContext):void {
  if(!context.ranges.length||context.ranges.length>4||context.ranges.some(range=>!Number.isSafeInteger(range.startEpoch)||!Number.isSafeInteger(range.endEpoch)||range.startEpoch%1000!==0||range.endEpoch%1000!==0||range.startEpoch>range.endEpoch||range.endEpoch-range.startEpoch>3*dayMs))throw new Error('月令定位需要有效且有界的整秒出生瞬间区间。');
}

export function calculateMonthAuthority(context:MonthAuthorityContext):BaziMonthAuthority {
  validateContext(context);
  const method=normalizeMonthAuthorityMethod(context.method),reference=monthAuthorityReference(),fixed=method===MONTH_AUTHORITY_TABLE_VERSION;
  const segments:BaziMonthAuthoritySegment[]=[];
  for(const range of context.ranges){
    let start=range.startEpoch;
    while(start<=range.endEpoch){
      const lunar=solarAt(start).getLunar(),previous=lunar.getPrevJie(false),next=lunar.getNextJie(false);
      const previousEpoch=solarEpoch(previous.getSolar()),nextEpoch=solarEpoch(next.getSolar());
      if(nextEpoch<=start)throw new Error('十二节区间未能向前推进。');
      const end=Math.min(range.endEpoch,nextEpoch-1000),monthBranch=lunar.getMonthZhiExact();
      const located=fixed?locateMonthAuthorityRows(monthBranch,(start-previousEpoch)/1000,(end-previousEpoch)/1000,(nextEpoch-previousEpoch)/1000):{candidates:[],unlocated:[]};
      const candidates=located.candidates;
      const unlocated=located.unlocated.map(range=>({fromAt:at(previousEpoch+range.fromSeconds*1000),toAt:at(previousEpoch+range.toSeconds*1000),reason:'超出30日表范围未定位；不延续末段或归一化。'}));
      segments.push({monthBranch,previousJie:previous.getName(),previousJieAt:at(previousEpoch),nextJieAt:at(nextEpoch),startAt:at(start),endAt:at(end),elapsedStartDays:(start-previousEpoch)/dayMs,elapsedEndDays:(end-previousEpoch)/dayMs,candidates,
        status:!fixed?'not-evaluated':unlocated.length?'out-of-table':candidates.length>1?'multiple':'located',...(unlocated.length?{unlocated}:{} )});
      start=nextEpoch;
    }
  }
  const candidates=[...new Map(segments.flatMap(segment=>segment.candidates).map(candidate=>[JSON.stringify(candidate),candidate])).values()];
  const hasUnlocated=segments.some(segment=>segment.unlocated?.length);
  const uncertain=context.timeUnknown||context.ambiguous||segments.length>1||candidates.length>1||hasUnlocated;
  const status: BaziMonthAuthority['status']=!fixed?'not-evaluated':candidates.length===0?'not-evaluated':uncertain?'uncertain':'determined';
  return {status,ruleId:rule.id,methodId:method,method:fixed?'首段转录参考的软件定位；非唯一司权':'未按分日限定司权；保留十二节区间与多读法原表',reference,candidates,segments,
    evidence:['区间端点为UTC实际瞬间，精确到秒；交节秒归入新节，旧段截止交节前一秒。','表段按前一节后实际经过秒数÷86400定位；采用[fromDay,toDay)半开边界，不按民用日期零点切日。',fixed?'已明确选择《三命通会》人元司事首段转录参考，仅列软件命中的表段。':'默认未按固定日限定位；原表及不同读法供查阅，不代替人工选择。','原文土项保留原术语，不强制推断天干；所选表不参与扶抑或姓名排序。'],
    missing:[...(!fixed?['当前未选择固定分日定位方法。']:[]),...(hasUnlocated?['实际出生区间含超出30日表范围的时段，该部分未定位。']:[]),...(context.timeUnknown?['出生时刻未知：所列为全日可能候选集合，即使只有一项也保留不确定。']:[]),...(context.ambiguous?['该民用时刻重复，本次仅按第一次实际瞬间定位，第二次未计算，须复核。']:[]),'此表定位不构成唯一司令、从格、合化或用神裁决。']};
}
