import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import fixedRules from '../../data/ren-directions-rules.json';
import {validSessionSourceSnapshot} from '../shared/session-sources';
import type {NamingSession,SourceRecord} from '../shared/types';

export const REN_DIRECTIONS_SOURCE_ID='bazi-ditian-ren-directions-2600158';
export const REN_DIRECTIONS_VERSION='1.0.0';
export const REN_DIRECTIONS_PROFILE='ren-source-direction-capacities/1.0.0';
export const REN_DIRECTIONS_METHOD='ditian-ren-commentary-2600158/1.4.0';
export const REN_DIRECTIONS_LOCK_SHA256='bed3390ab9664536f3537d9aa8b791ea0d656b435c34e7ee8f39a9fe1d4adad6';
const ORIGINAL_SHA256='1d1a3d61c1b9a26618b41b8ead857a6b966992fdf2adabdc607a0c6cb4c8f04d';
const FILES=['data/raw/CC-BY-SA-4.0.txt','data/raw/ren-directions-NOTICE.md','data/raw/ren-directions-excerpts.json','data/ren-directions-rules.json'];
const digest=(value:Buffer|string)=>createHash('sha256').update(value).digest('hex');
type LockedSource=SourceRecord&{fileHashes:Record<string,string>};
interface ExcerptContext {id:string;section:string;start:number;end:number;quote:string;sha256:string;layer:string;heading:string;}
export type RenDirectionsRuleTable=typeof fixedRules;

/** Local source premise only: effective competition, root support and formation remain separate. */
export function loadRenDirectionsData(directory:string):{rules:RenDirectionsRuleTable;sources:SourceRecord[]}{
  const bytes=readFileSync(join(directory,'ren-directions-source-lock.json'));
  if(digest(bytes)!==REN_DIRECTIONS_LOCK_SHA256)throw new Error('任注方旺来源登记校验失败。');
  const lock=JSON.parse(bytes.toString('utf8'))as{version:string;profileId:string;hashConvention:string;sources:LockedSource[]};
  if(lock.version!==REN_DIRECTIONS_VERSION||lock.profileId!==REN_DIRECTIONS_PROFILE||lock.hashConvention!=='sha256(JSON.stringify(fileHashes)); sorted relative path keys'||!Array.isArray(lock.sources)||lock.sources.length!==1)throw new Error('任注方旺来源版本不完整。');
  const source=lock.sources[0];
  if(source.id!==REN_DIRECTIONS_SOURCE_ID||source.commit!=='wikisource-oldid/2600158;source-direction-capacities/1.0.0'||source.license!=='CC-BY-SA-4.0'||!Array.isArray(source.files)||!isDeepStrictEqual([...source.files].sort(),FILES)||!source.fileHashes||!isDeepStrictEqual(Object.keys(source.fileHashes).sort(),FILES))throw new Error('任注方旺原件登记不完整。');
  const actual:Record<string,string>={};
  for(const file of [...source.files].sort()){
    if(!file.startsWith('data/')||file.split('/').some(part=>part==='..'||part==='.')||!/^[a-f0-9]{64}$/.test(source.fileHashes[file]??''))throw new Error('任注方旺原件路径无效。');
    actual[file]=digest(readFileSync(join(directory,file.slice(5))));
    if(actual[file]!==source.fileHashes[file])throw new Error('任注方旺规则、上下文、原句或许可校验失败。');
  }
  if(digest(JSON.stringify(actual))!==source.sha256)throw new Error('任注方旺来源汇总校验失败。');
  const table=JSON.parse(readFileSync(join(directory,'ren-directions-rules.json'),'utf8'))as RenDirectionsRuleTable;
  const excerpts=JSON.parse(readFileSync(join(directory,'raw/ren-directions-excerpts.json'),'utf8'))as{version:string;source:Record<string,unknown>;contexts:ExcerptContext[]};
  if(!isDeepStrictEqual(table,fixedRules)||table.version!==REN_DIRECTIONS_VERSION||table.profileId!==REN_DIRECTIONS_PROFILE||table.methodVersion!==REN_DIRECTIONS_METHOD||table.sourceId!==REN_DIRECTIONS_SOURCE_ID||table.source.revision!==2600158||table.source.fullWikitextSha256!==ORIGINAL_SHA256||table.source.fullWikitextCodepoints!==143701||excerpts.version!==REN_DIRECTIONS_VERSION||!isDeepStrictEqual(excerpts.source,table.source)||!Array.isArray(excerpts.contexts)||excerpts.contexts.length!==5||new Set(excerpts.contexts.map(context=>context.id)).size!==5||table.clauses.length!==13||new Set(table.clauses.map(clause=>clause.id)).size!==13)throw new Error('任注方旺固定原文身份不一致。');
  for(const context of excerpts.contexts){
    if(!context.id||context.layer!=='ren-commentary'||!Number.isSafeInteger(context.start)||!Number.isSafeInteger(context.end)||context.start<0||context.end>143701||context.end-context.start!==[...context.quote].length||!context.quote.startsWith('{{annotate|任氏曰：')||!context.quote.endsWith('}}')||context.heading!=='通神论 '+context.section||digest(context.quote)!==context.sha256)throw new Error('任注方旺完整任氏评注范围无效。');
  }
  for(const clause of table.clauses){
    const span=clause.sourceSpan,context=excerpts.contexts.find(value=>value.id===clause.contextId);
    if(!context||span.unit!=='unicode-codepoint'||span.interval!=='[start,end)'||!Number.isSafeInteger(span.start)||!Number.isSafeInteger(span.end)||span.start<context.start||span.end>context.end||span.end-span.start!==[...clause.quote].length||[...context.quote].slice(span.start-context.start,span.end-context.start).join('')!==clause.quote||clause.locator!==`oldid=2600158;codepoint[${span.start},${span.end})`||clause.section!==context.heading||clause.sourceId!==REN_DIRECTIONS_SOURCE_ID||!clause.scope||clause.layer!=='ren-commentary;source-sufficient-direction-capacity')throw new Error('任注方旺原句与完整评注码点不一致。');
  }
  const contracts=table.adoption.contracts;
  if(contracts.length!==2||new Set(contracts.map(value=>value.kind)).size!==2||contracts.some(value=>!isDeepStrictEqual(value.premises.filter(premise=>premise.requiredForProof).map(premise=>premise.id),['complete-direction','same-element-day-stem'])||value.premises.find(premise=>premise.id==='input-completeness')?.requiredForProof!==false))throw new Error('任注方旺原句条件与输入完整元数据不得混同。');
  const{id,name,url,commit,license,files,sha256,note}=source;
  return{rules:structuredClone(table),sources:[{id,name,url,commit,license,files:[...files],sha256,note}]};
}
export function loadRenDirectionsSources(directory:string):SourceRecord[]{return loadRenDirectionsData(directory).sources;}
export function verifyRenDirectionsProvenance(session:NamingSession,sources:SourceRecord[]):void{
  const result=session.analysis.renCommentary as unknown as {version?:string;profileId?:string;directionAnalysis?:{version?:string;sourceId?:string;profileId?:string}}|undefined;
  const recorded=session.sourceSnapshot?.sources.filter(source=>source.id===REN_DIRECTIONS_SOURCE_ID)??[],selected=String(session.profile.renMethod)===REN_DIRECTIONS_METHOD||session.profile.renMethod==='ditian-ren-commentary-2600158/1.5.0';
  if(!selected){if(result&&Object.hasOwn(result,'directionAnalysis')||recorded.length||result?.version===REN_DIRECTIONS_METHOD)throw new Error('任注方旺结果或来源不得附着旧版或未启用方案。');return;}
  if(!result||result.version!==session.profile.renMethod||result.profileId!==session.profile.renMethod||result.directionAnalysis?.version!==REN_DIRECTIONS_VERSION||result.directionAnalysis?.profileId!==REN_DIRECTIONS_PROFILE||result.directionAnalysis?.sourceId!==REN_DIRECTIONS_SOURCE_ID||!session.sourceSnapshot||!validSessionSourceSnapshot(session.sourceSnapshot,session.dataVersion))throw new Error('任注1.4方案必须保留方旺结果与完整来源。');
  if(sources.length!==1||recorded.length!==1||!isDeepStrictEqual(sources[0],recorded[0]))throw new Error('任注方旺生成时来源与固定原文不一致。');
}
