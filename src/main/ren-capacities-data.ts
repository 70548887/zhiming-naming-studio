import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {REN_CAPACITIES_PROFILE,REN_CAPACITIES_SOURCE_ID,REN_CAPACITIES_VERSION,renCapacityRules} from '../domain/ren-capacities';
import {validSessionSourceSnapshot} from '../shared/session-sources';
import type {NamingSession,SourceRecord} from '../shared/types';

export {REN_CAPACITIES_SOURCE_ID,REN_CAPACITIES_VERSION};
const LOCK_SHA256='77b3f5ba7ba89e6d697f4c22dc554e831499aae689be58a40465b6cf94f3cd15';
const ORIGINAL_SHA256='1d1a3d61c1b9a26618b41b8ead857a6b966992fdf2adabdc607a0c6cb4c8f04d';
const FILES=['data/raw/CC-BY-SA-4.0.txt','data/raw/ren-capacities-NOTICE.md','data/raw/ren-capacities-excerpts.json','data/ren-capacities-rules.json'];
const METHOD='ditian-ren-commentary-2600158/1.3.0';
const digest=(value:Buffer|string)=>createHash('sha256').update(value).digest('hex');
type LockedSource=SourceRecord&{fileHashes:Record<string,string>};
interface ExcerptContext {id:string;section:string;start:number;end:number;quote:string;sha256:string;layer:string;heading:string;}

/** This independently locked publication proves local capacity only, never a complete net-effect model. */
export function loadRenCapacitiesData(directory:string):{rules:ReturnType<typeof renCapacityRules>;sources:SourceRecord[]}{
  const bytes=readFileSync(join(directory,'ren-capacities-source-lock.json'));
  if(digest(bytes)!==LOCK_SHA256)throw new Error('任注局部能力来源登记校验失败。');
  const lock=JSON.parse(bytes.toString('utf8'))as{version:string;profileId:string;hashConvention:string;sources:LockedSource[]};
  if(lock.version!==REN_CAPACITIES_VERSION||lock.profileId!==REN_CAPACITIES_PROFILE||lock.hashConvention!=='sha256(JSON.stringify(fileHashes)); sorted relative path keys'||!Array.isArray(lock.sources)||lock.sources.length!==1)throw new Error('任注局部能力来源版本不完整。');
  const source=lock.sources[0];
  if(source.id!==REN_CAPACITIES_SOURCE_ID||source.commit!=='wikisource-oldid/2600158;source-wood-capacities/1.0.0'||source.license!=='CC-BY-SA-4.0'||!Array.isArray(source.files)||!isDeepStrictEqual([...source.files].sort(),FILES)||!source.fileHashes||!isDeepStrictEqual(Object.keys(source.fileHashes).sort(),FILES))throw new Error('任注局部能力原件登记不完整。');
  const actual:Record<string,string>={};
  for(const file of [...source.files].sort()){
    if(!file.startsWith('data/')||file.split('/').some(part=>part==='..'||part==='.')||!/^[a-f0-9]{64}$/.test(source.fileHashes[file]??''))throw new Error('任注局部能力原件路径无效。');
    actual[file]=digest(readFileSync(join(directory,file.slice(5))));
    if(actual[file]!==source.fileHashes[file])throw new Error('任注局部能力规则、上下文、原句或许可校验失败。');
  }
  if(digest(JSON.stringify(actual))!==source.sha256)throw new Error('任注局部能力来源汇总校验失败。');
  const table=JSON.parse(readFileSync(join(directory,'ren-capacities-rules.json'),'utf8'))as ReturnType<typeof renCapacityRules>;
  const excerpts=JSON.parse(readFileSync(join(directory,'raw/ren-capacities-excerpts.json'),'utf8'))as{version:string;source:Record<string,unknown>;contexts:ExcerptContext[]};
  if(!isDeepStrictEqual(table,renCapacityRules())||table.methodVersion!==METHOD||table.source.revision!==2600158||table.source.fullWikitextSha256!==ORIGINAL_SHA256||table.source.fullWikitextCodepoints!==143701||excerpts.version!==REN_CAPACITIES_VERSION||!isDeepStrictEqual(excerpts.source,table.source)||!Array.isArray(excerpts.contexts)||excerpts.contexts.length!==3||new Set(excerpts.contexts.map(x=>x.id)).size!==3||table.clauses.length!==7||new Set(table.clauses.map(x=>x.id)).size!==7)throw new Error('任注局部能力固定原文身份不一致。');
  for(const context of excerpts.contexts){
    if(!context.id||context.layer!=='ren-commentary'||!Number.isSafeInteger(context.start)||!Number.isSafeInteger(context.end)||context.start<0||context.end>143701||context.end-context.start!==[...context.quote].length||!context.quote.startsWith('{{annotate|任氏曰：')||!context.quote.endsWith('}}')||context.heading!=='通神论 '+context.section||digest(context.quote)!==context.sha256)throw new Error('任注局部能力所选完整评注段落范围无效。');
  }
  for(const clause of table.clauses){
    const span=clause.sourceSpan,context=excerpts.contexts.find(x=>x.id===clause.contextId);
    if(!context||span.unit!=='unicode-codepoint'||span.interval!=='[start,end)'||!Number.isSafeInteger(span.start)||!Number.isSafeInteger(span.end)||span.start<context.start||span.end>context.end||span.end-span.start!==[...clause.quote].length||[...context.quote].slice(span.start-context.start,span.end-context.start).join('')!==clause.quote||clause.locator!==`oldid=2600158;codepoint[${span.start},${span.end})`||clause.section!==context.heading||clause.sourceId!==REN_CAPACITIES_SOURCE_ID||!clause.scope||!clause.layer.startsWith('ren-commentary;'))throw new Error('任注局部能力短句与完整评注上下文码点不一致。');
  }
  const{id,name,url,commit,license,files,sha256,note}=source;
  return{rules:structuredClone(table),sources:[{id,name,url,commit,license,files:[...files],sha256,note}]};
}
export function loadRenCapacitiesSources(directory:string):SourceRecord[]{return loadRenCapacitiesData(directory).sources;}
export function verifyRenCapacitiesProvenance(session:NamingSession,sources:SourceRecord[]):void{
  const result=session.analysis.renCommentary as NamingSession['analysis']['renCommentary']&{capacityAnalysis?:{version?:string;sourceId?:string;profileId?:string}};
  const recorded=session.sourceSnapshot?.sources.filter(source=>source.id===REN_CAPACITIES_SOURCE_ID)??[],selected=session.profile.renMethod===METHOD||session.profile.renMethod==='ditian-ren-commentary-2600158/1.4.0'||session.profile.renMethod==='ditian-ren-commentary-2600158/1.5.0';
  if(!selected){if(result?.capacityAnalysis!==undefined||recorded.length||result?.version===METHOD)throw new Error('任注局部能力结果或来源不得附着旧版或未启用方案。');return;}
  if(!result||result.version!==session.profile.renMethod||result.profileId!==session.profile.renMethod||result.capacityAnalysis?.version!==REN_CAPACITIES_VERSION||result.capacityAnalysis?.profileId!==REN_CAPACITIES_PROFILE||result.capacityAnalysis?.sourceId!==REN_CAPACITIES_SOURCE_ID||!session.sourceSnapshot||!validSessionSourceSnapshot(session.sourceSnapshot,session.dataVersion))throw new Error('任注局部能力方案必须保留原能力结果与完整来源。');
  if(sources.length!==1||recorded.length!==1||!isDeepStrictEqual(sources[0],recorded[0]))throw new Error('任注局部能力生成时来源与固定原文不一致。');
}
