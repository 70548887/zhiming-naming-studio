import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual,types} from 'node:util';
import type {BirthProfile,MonthlySeasonalPredicate} from '../shared/types';
import type {QiongtongClauseReference} from '../shared/qiongtong-clause-reference';
import {QIONGTONG_CLAUSE_PREVIEW_SCHEMA,type QiongtongClauseReferencePreview} from '../shared/qiongtong-clause-reference-preview';
import {validMonthAuthorityMethod} from '../shared/month-authority-method';
import {validSeasonalMethod} from '../shared/seasonal-method';
import {validRenMethod} from '../shared/ren-method';
import {validateBirthTimeInput} from '../shared/birth-time-basis';
import {readQiongtongClausePreviewProfile} from './qiongtong-preview-input';
import {buildQiongtongJiaPreview} from './qiongtong-jia-preview';
import {analyzeFreshQiongtongClauseReferences} from './qiongtong-clause-reference';
import {loadMonthlySeasonalData,MONTHLY_SEASONAL_SOURCE_ID} from './monthly-seasonal-data';
import {loadBaziSources} from './bazi-data';

const CONDITIONS_FILE='data/qiongtong-clause-conditions-v1.json' as const;
const CONDITIONS_SHA256='9df67435c2b63126d6bae24bcbb1d156ad4e362e07ecafbfd2bb430050fb8b41';
const CONDITIONS_SCHEMA='qiongtong-literal-conditions/1.0.0' as const;
const RAW_FILE='raw/classics-qiongtong-2294674.wiki';
const RAW_SHA256='8ba17242f116583de2e10172e006f5ce5f74b23ccfc0bd24b886be135e9f20bd';
const REVISION='wikisource-revision/2294674' as const;
const SCHOOL='qiongtong-wikisource-2294674' as const;
const RULE_IDS=['qiong-甲-亥-geng-ding-wu-transparent','qiong-甲-丑-geng-transparent-ding-hidden','qiong-乙-子-no-bing-anywhere'];
const digest=(value:Buffer)=>createHash('sha256').update(value).digest('hex');
type Span=QiongtongClauseReference['rules'][number]['source']['quoteSpan'];
interface CatalogRule {
  id:string;entry:string;dayStem:string;monthBranch:string;existingConditionId:string;
  quote:string;locator:string;quoteSpan:Span;contextQuote:string;contextSpan:Span;
  predicate:MonthlySeasonalPredicate;
  textReferenceUses:{stem:string;role:string;sequence:number;quote:string}[];
}
interface Catalog {
  version:string;school:string;sourceId:string;revision:string;rawSha256:string;
  scanCollation:boolean;rules:CatalogRule[];
}

/** Copies descriptors before inspecting fields; no Store, parent-reading resolver or mutation. */
function profileForPreview(input:BirthProfile):BirthProfile {
  const profile=readQiongtongClausePreviewProfile(input);
  if(!profile||typeof profile!=='object'||typeof profile.surname!=='string'||!/^[\p{Script=Han}]{1,4}$/u.test(profile.surname.trim()))throw new Error('请输入1–4个汉字的姓氏。');
  for(const key of ['id','customerName','surnamePinyin','birthDate','birthTime','birthPlace','timezone','notes'] as const){if(typeof profile[key]!=='string'||profile[key].length>(key==='notes'?10000:300))throw new Error('条文预览资料字段不合法或过长。');}
  if(!['男','女','中性'].includes(profile.gender)||!['solar','lunar'].includes(profile.calendar)||typeof profile.timeUnknown!=='boolean'||typeof profile.leapMonth!=='boolean')throw new Error('条文预览历法、性别或时间标记无效。');
  for(const key of ['fatherName','motherName'] as const){const value=profile[key];if(value!==undefined&&(typeof value!=='string'||[...value].length>40))throw new Error('条文预览父母姓名须为40字符以内文本。');}
  if(!validMonthAuthorityMethod(profile.monthAuthorityMethod)||!validSeasonalMethod(profile.seasonalMethod)||!validRenMethod(profile.renMethod))throw new Error('条文预览参考方法无效。');
  validateBirthTimeInput(profile);
  return readQiongtongClausePreviewProfile(profile);
}
function checkedBytes(file:string,sha256:string,length:number,label:string):Buffer {
  const bytes=readFileSync(file);
  if(types.isProxy(bytes)||!Buffer.isBuffer(bytes)||bytes.length!==length||digest(bytes)!==sha256)throw new Error(label+'固定原件摘要或字节数不一致。');
  return bytes;
}
function spanMatches(points:readonly string[],span:Span,quote:string):boolean {
  return !!span&&span.unit==='unicode-codepoint'&&span.interval==='[start,end)'&&Number.isSafeInteger(span.start)&&Number.isSafeInteger(span.end)&&span.start>=0&&span.end>span.start&&span.end<=points.length&&points.slice(span.start,span.end).join('')===quote;
}

/** Every invocation re-reads resources; a previous preview never authorizes this one. */
export function buildQiongtongClauseReferencePreview(input:BirthProfile,dataDirectory:string):QiongtongClauseReferencePreview {
  const profile=profileForPreview(input);
  const monthly=loadMonthlySeasonalData(dataDirectory),baziSources=loadBaziSources(dataDirectory);
  const lunar=baziSources.find(source=>source.id==='bazi-evidence-lunar186');
  if(!lunar||monthly.table.sourceId!==MONTHLY_SEASONAL_SOURCE_ID||monthly.table.source.revisionId!==2294674||monthly.table.source.rawSha256!==RAW_SHA256)throw new Error('字面条件预览的固定流派来源不完整。');
  const raw=checkedBytes(join(dataDirectory,RAW_FILE),RAW_SHA256,99998,'字面条件全文');
  const text=raw.toString('utf8'),points=[...text];
  if(!Buffer.from(text,'utf8').equals(raw)||points.length!==36746)throw new Error('字面条件全文编码或代码点数量不一致。');
  const conditionBytes=checkedBytes(join(dataDirectory,CONDITIONS_FILE.slice(5)),CONDITIONS_SHA256,5499,'字面条件表');
  const catalog=JSON.parse(conditionBytes.toString('utf8')) as Catalog;
  if(catalog.version!==CONDITIONS_SCHEMA||catalog.school!==SCHOOL||catalog.sourceId!==MONTHLY_SEASONAL_SOURCE_ID||catalog.revision!==REVISION||catalog.rawSha256!==RAW_SHA256||catalog.scanCollation!==false||!Array.isArray(catalog.rules)||catalog.rules.length!==3||!isDeepStrictEqual(catalog.rules.map(rule=>rule.id),RULE_IDS))throw new Error('字面条件表的固定版本、流派或规则集合不一致。');
  for(const rule of catalog.rules){
    const entries=monthly.table.entries.filter(entry=>entry.id===rule.entry),entry=entries[0];
    const clauses=entry?.conditions.filter(condition=>condition.id===rule.existingConditionId)??[],clause=clauses[0];
    if(entries.length!==1||clauses.length!==1||entry.dayStem!==rule.dayStem||entry.monthBranch!==rule.monthBranch||entry.sourceId!==catalog.sourceId||entry.sourceQuote!==rule.contextQuote||!isDeepStrictEqual(entry.sourceSpan,rule.contextSpan)||clause.sourceQuote!==rule.quote||clause.sourceLocator!==rule.locator||!isDeepStrictEqual(clause.sourceSpan,rule.quoteSpan)||!isDeepStrictEqual(clause.predicate,rule.predicate)||!isDeepStrictEqual(entry.initialUses,rule.textReferenceUses))throw new Error('字面条件与完整月别结构表的规则、字句或定位不一致。');
    // These are independent recorded spans. The context does not enclose the clause.
    if(!spanMatches(points,rule.quoteSpan,rule.quote)||!spanMatches(points,rule.contextSpan,rule.contextQuote))throw new Error('字面条件原句或上下文代码点定位不一致。');
  }
  const fresh=analyzeFreshQiongtongClauseReferences(profile),reference=fresh.reference;
  if(reference.schema!=='qiongtong-literal-conditions/1.0.1'||reference.school!==SCHOOL||reference.namingImpact!=='none'||reference.rules.length!==catalog.rules.length)throw new Error('字面条件新分析的版本或范围与固定原件不一致。');
  const verifiedRules:QiongtongClauseReferencePreview['sourceVerification']['rules'][number][]=[];
  catalog.rules.forEach((rule,index)=>{
    const actual=reference.rules[index];
    const source:typeof actual.source={id:MONTHLY_SEASONAL_SOURCE_ID,revision:REVISION,rawSha256:RAW_SHA256,quote:rule.quote,locator:rule.locator,quoteSpan:structuredClone(rule.quoteSpan),contextQuote:rule.contextQuote,contextSpan:structuredClone(rule.contextSpan),scanCollation:false};
    const texts=rule.textReferenceUses.map(use=>({stem:use.stem,role:use.role,quote:use.quote,status:'recorded-text' as const}));
    if(actual.id!==rule.id||actual.existingConditionId!==rule.existingConditionId||!isDeepStrictEqual(actual.source,source)||!isDeepStrictEqual(actual.textReferences,texts)||actual.actionEvaluation!=='not-evaluated'||actual.usefulGodDecision!=='not-evaluated')throw new Error('字面条件新分析与本次核验的原句、上下文或取用边界不一致。');
    verifiedRules.push({ruleId:rule.id,existingConditionId:rule.existingConditionId,entryId:rule.entry,source});
  });
  const jia=buildQiongtongJiaPreview(profile,fresh.analysis,dataDirectory);
  if(!isDeepStrictEqual(jia.jiaChapter.input,reference.input))throw new Error('甲日和原三条参考的四柱适用声明不一致。');
  return {schema:QIONGTONG_CLAUSE_PREVIEW_SCHEMA,profileId:profile.id,analysis:fresh.analysis,reference,sourceVerification:{status:'verified-fixed-resources',school:SCHOOL,revision:REVISION,label:'《穷通宝鉴》固定电子修订2294674 · 三条字面条件参考',scanCollation:false,sources:[...monthly.sources,lunar],conditions:{file:CONDITIONS_FILE,schema:CONDITIONS_SCHEMA,sha256:CONDITIONS_SHA256},rules:verifiedRules},...jia};
}
