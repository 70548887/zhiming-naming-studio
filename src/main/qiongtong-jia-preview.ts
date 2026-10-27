import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual,types} from 'node:util';
import type {Analysis,BirthProfile} from '../shared/types';
import type {QiongtongClauseReferencePreview,JiaChapterSourceVerification} from '../shared/qiongtong-clause-reference-preview';
import type {JiaLiteralReferenceV11,JiaSourceSpan} from '../domain/traditional/qiongtong-jia-v11-types';
import {evaluateQiongtongJiaConditionsV11,type SafeChartInput140} from '../domain/traditional/qiongtong-jia-conditions-v11';
import {loadMonthlySeasonalData,MONTHLY_SEASONAL_SOURCE_ID} from './monthly-seasonal-data';

const VERSION='qiongtong-jia-literal-conditions/1.1.0' as const;
const SCHOOL='qiongtong-wikisource-2294674' as const;
const REVISION='wikisource-revision/2294674' as const;
const RAW_SHA256='8ba17242f116583de2e10172e006f5ce5f74b23ccfc0bd24b886be135e9f20bd';
const MANIFEST_SHA256='d7884469968ccbb06676e27984c4d1aa7c147292166a12fd4a1c2c671f3aceaa';
const CHAPTER_SHA256='7d45c15e1e17a4cdb6fd46f0d469ef1802bf374c063a22fe057741e3aa257a6a';
const CHAPTER_SPAN={start:1292,end:5220,unit:'unicode-codepoint',interval:'[start,end)'} as const;
const DIRECTORY='qiongtong-jia-v11';
const INPUTS=[['catalog.json','catalog'],['rule-input.ts','rule-input'],['types-input.ts','types-input'],['ATTRIBUTION.md','attribution'],['CC-BY-SA-4.0.txt','license']] as const;
const IDS=['jia-yin-gui-hidden-bing-exposed','jia-chen-geng-ren-exposed','jia-si-gui-ding-geng-exposed','jia-you-bing-geng-exposed'];
const MONTHS=['寅','辰','巳','酉'];
const POSITIONS=['年柱','月柱','日柱','时柱'] as const;
const digest=(value:Buffer|string)=>createHash('sha256').update(value).digest('hex');
interface ManagedInput {file:string;role:string;sha256:string;bytes:number;}
interface ManagedManifest {
  schema:string;version:string;school:string;revision:string;rawSha256:string;
  chapterSpan:JiaSourceSpan;chapterSha256:string;inputs:ManagedInput[];
  originalM588ManifestSha256:string;m599ReviewSha256:string;
}
interface Executable {
  id:string;dayStem:string;monthBranch:string;label:string;
  source:{sourceId:string;revision:string;rawSha256:string;quote:string;locator:string;quoteSpan:JiaSourceSpan;contextSpan:JiaSourceSpan;contextSha256:string;scanCollation:boolean};
  decisionLevel:string;actionEvaluation:string;usefulGodDecision:string;
}
interface Catalog {
  schema:string;version:string;school:string;
  source:{id:string;revision:string;rawSha256:string;chapterSpan:JiaSourceSpan;chapterCodepoints:number;license:string;scanCollation:boolean};
  executable:Executable[];monthCoverage:JiaLiteralReferenceV11['coverage']['months'];
}
function checkedBytes(file:string,sha256:string,length:number):Buffer {
  const value=readFileSync(file);
  if(types.isProxy(value)||!Buffer.isBuffer(value)||value.length!==length||digest(value)!==sha256)throw new Error('甲日条文受管资料原件摘要或字节数不一致。');
  return value;
}
function rawSlice(points:readonly string[],span:JiaSourceSpan):string {
  if(!span||span.unit!=='unicode-codepoint'||span.interval!=='[start,end)'||!Number.isSafeInteger(span.start)||!Number.isSafeInteger(span.end)||span.start<0||span.end<=span.start||span.end>points.length)throw new Error('甲日条文原文代码点范围无效。');
  return points.slice(span.start,span.end).join('');
}
function rawFromFreshAnalysis(profile:BirthProfile,analysis:Analysis):SafeChartInput140 {
  const rows=analysis.bazi.pillars;
  if(profile.timeUnknown&&rows.some(row=>row.label==='时柱'))throw new Error('甲日预览拒绝未知时刻被补出的时柱。');
  return {pillars:rows.map(row=>({position:row.label,gan:row.gan,zhi:row.zhi})) as SafeChartInput140['pillars'],unknownPositions:POSITIONS.filter(position=>!rows.some(row=>row.label===position))};
}

/** A new source gate inside the existing preview; no saved data, caller paths or adoption. */
export function buildQiongtongJiaPreview(profile:BirthProfile,analysis:Analysis,dataDirectory:string):Required<Pick<QiongtongClauseReferencePreview,'jiaChapter'|'jiaSourceVerification'>> {
  const monthly=loadMonthlySeasonalData(dataDirectory);
  if(monthly.table.sourceId!==MONTHLY_SEASONAL_SOURCE_ID||monthly.table.source.revisionId!==2294674||monthly.table.source.rawSha256!==RAW_SHA256)throw new Error('甲日条文月别原包身份不一致。');
  const manifestBytes=checkedBytes(join(dataDirectory,DIRECTORY,'manifest.json'),MANIFEST_SHA256,1581),manifest=JSON.parse(manifestBytes.toString('utf8')) as ManagedManifest;
  if(manifest.schema!=='qiongtong-jia-managed-inputs/1.0.0'||manifest.version!==VERSION||manifest.school!==SCHOOL||manifest.revision!==REVISION||manifest.rawSha256!==RAW_SHA256||manifest.chapterSha256!==CHAPTER_SHA256||!isDeepStrictEqual(manifest.chapterSpan,CHAPTER_SPAN)||manifest.originalM588ManifestSha256!=='a70876ac60dc8bbebec4a1ddb7526435f12d4805f6190cb3cd0291646908f13d'||manifest.m599ReviewSha256!=='637380e050c06d4a8d32c3f4a864fcf9cf05c5663483d97b22a94e8129d057a1'||!Array.isArray(manifest.inputs)||manifest.inputs.length!==INPUTS.length)throw new Error('甲日条文受管输入清单版本或来源不一致。');
  const managedInputs:JiaChapterSourceVerification['managedInputs'][number][]=[{file:'data/'+DIRECTORY+'/manifest.json',sha256:MANIFEST_SHA256,bytes:manifestBytes.length}];
  let catalogBytes:Buffer|undefined;
  for(let index=0;index<INPUTS.length;index++){
    const [file,role]=INPUTS[index];
    const entry=manifest.inputs[index];
    if(entry.file!==file||entry.role!==role||!/^[a-f0-9]{64}$/.test(entry.sha256)||!Number.isSafeInteger(entry.bytes)||entry.bytes<1)throw new Error('甲日条文受管原件定位或角色不一致。');
    const bytes=checkedBytes(join(dataDirectory,DIRECTORY,file),entry.sha256,entry.bytes);
    managedInputs.push({file:'data/'+DIRECTORY+'/'+file,sha256:entry.sha256,bytes:entry.bytes});
    if(role==='catalog')catalogBytes=bytes;
  }
  if(!catalogBytes)throw new Error('甲日条文结构目录缺失。');
  const catalog=JSON.parse(catalogBytes.toString('utf8')) as Catalog;
  if(catalog.schema!=='qiongtong-jia-branch-catalog/1.1.0'||catalog.version!==VERSION||catalog.school!==SCHOOL||catalog.source.id!==MONTHLY_SEASONAL_SOURCE_ID||catalog.source.revision!==REVISION||catalog.source.rawSha256!==RAW_SHA256||catalog.source.scanCollation!==false||catalog.source.license!=='CC-BY-SA-4.0'||catalog.source.chapterCodepoints!==3928||!isDeepStrictEqual(catalog.source.chapterSpan,CHAPTER_SPAN)||catalog.executable.length!==4||!isDeepStrictEqual(catalog.executable.map(rule=>rule.id),IDS)||!isDeepStrictEqual(catalog.executable.map(rule=>rule.monthBranch),MONTHS)||catalog.executable.some(rule=>rule.dayStem!=='甲'))throw new Error('甲日四条目录、月支或原文身份不一致。');
  const raw=checkedBytes(join(dataDirectory,'raw/classics-qiongtong-2294674.wiki'),RAW_SHA256,99998),text=raw.toString('utf8'),points=[...text];
  if(!Buffer.from(text,'utf8').equals(raw)||points.length!==36746||digest(rawSlice(points,CHAPTER_SPAN))!==CHAPTER_SHA256)throw new Error('甲日原文编码或完整甲章身份不一致。');
  for(const rule of catalog.executable){
    const source=rule.source;
    if(source.sourceId!==MONTHLY_SEASONAL_SOURCE_ID||source.revision!==REVISION||source.rawSha256!==RAW_SHA256||source.scanCollation!==false||rawSlice(points,source.quoteSpan)!==source.quote||digest(rawSlice(points,source.contextSpan))!==source.contextSha256||rule.decisionLevel!=='selected-literal-subclause-only'||rule.actionEvaluation!=='not-evaluated'||rule.usefulGodDecision!=='not-evaluated')throw new Error('甲日四条原句、上下文或判断范围与原文不一致。');
  }
  const declaration=rawFromFreshAnalysis(profile,analysis),jiaChapter=evaluateQiongtongJiaConditionsV11(declaration);
  const expectedInput={complete:declaration.unknownPositions?.length===0,dayStem:declaration.pillars.find(row=>row.position==='日柱')?.gan??null,monthBranch:declaration.pillars.find(row=>row.position==='月柱')?.zhi??null,unknownPositions:declaration.unknownPositions??[]};
  if(jiaChapter.schema!==VERSION||jiaChapter.school!==SCHOOL||jiaChapter.namingImpact!=='none'||!isDeepStrictEqual(jiaChapter.input,expectedInput)||!isDeepStrictEqual(jiaChapter.source,{id:MONTHLY_SEASONAL_SOURCE_ID,revision:REVISION,rawSha256:RAW_SHA256,chapterSpan:CHAPTER_SPAN,scanCollation:false})||jiaChapter.checks.length!==4||jiaChapter.coverage.firstBatchOnly!==true||jiaChapter.coverage.fullChapterDecisionImplemented!==false||jiaChapter.coverage.newlyExecutablePredicates!==4||!isDeepStrictEqual(jiaChapter.coverage.months,catalog.monthCoverage))throw new Error('甲日新分析与本次已核来源或缺失柱声明不一致。');
  const rules:JiaChapterSourceVerification['rules'][number][]=[];
  catalog.executable.forEach((rule,index)=>{
    const check=jiaChapter.checks[index],source={quote:rule.source.quote,locator:rule.source.locator,quoteSpan:structuredClone(rule.source.quoteSpan),contextSpan:structuredClone(rule.source.contextSpan),contextSha256:rule.source.contextSha256};
    if(check.id!==rule.id||check.label!==rule.label||!isDeepStrictEqual(check.source,source)||check.decisionLevel!=='selected-literal-subclause-only'||check.wholeSourceBranchDecision!=='not-evaluated'||check.actionEvaluation!=='not-evaluated'||check.usefulGodDecision!=='not-evaluated')throw new Error('甲日新分析原句或字面判断边界不一致。');
    rules.push({id:rule.id,...source});
  });
  return {jiaChapter,jiaSourceVerification:{schema:'qiongtong-jia-source-verification/1.0.0',status:'verified-fixed-resources',sourceId:MONTHLY_SEASONAL_SOURCE_ID,revision:REVISION,rawSha256:RAW_SHA256,scanCollation:false,monthlySources:monthly.sources,catalog:{file:'data/'+DIRECTORY+'/catalog.json',version:VERSION,sha256:manifest.inputs[0].sha256,bytes:manifest.inputs[0].bytes},managedInputs,chapter:{span:structuredClone(CHAPTER_SPAN),sha256:CHAPTER_SHA256},rules}};
}
