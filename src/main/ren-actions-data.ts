import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {REN_ACTIONS_PROFILE,REN_ACTIONS_SOURCE_ID,REN_ACTIONS_VERSION,renActionsRules} from '../domain/ren-actions';
import {validSessionSourceSnapshot} from '../shared/session-sources';
import type {NamingSession,SourceRecord} from '../shared/types';

export {REN_ACTIONS_SOURCE_ID,REN_ACTIONS_VERSION};
const LOCK_SHA256='4ca534d772d32accee374adf41ed420262a9c050055884ccfe692a94186db4ad';
const ORIGINAL_SHA256='1d1a3d61c1b9a26618b41b8ead857a6b966992fdf2adabdc607a0c6cb4c8f04d';
const FILES=['data/raw/CC-BY-SA-4.0.txt','data/raw/ren-actions-NOTICE.md','data/raw/ren-actions-excerpts.json','data/ren-actions-rules.json'];
const METHOD='ditian-ren-commentary-2600158/1.2.0';
const CAPACITY_METHOD='ditian-ren-commentary-2600158/1.3.0';
const digest=(value:Buffer|string)=>createHash('sha256').update(value).digest('hex');
type LockedSource=SourceRecord&{fileHashes:Record<string,string>};
interface ExcerptContext {id:string;section:string;start:number;end:number;quote:string;layer:string;heading:string;}
/** Own locked publication, complete selected general paragraphs, short clauses and original codepoint positions are validated together. */
export function loadRenActionsData(directory:string):{rules:ReturnType<typeof renActionsRules>;sources:SourceRecord[]}{
  const bytes=readFileSync(join(directory,'ren-actions-source-lock.json'));
  if(digest(bytes)!==LOCK_SHA256)throw new Error('任注条件动作来源登记校验失败。');
  const lock=JSON.parse(bytes.toString('utf8'))as{version:string;profileId:string;hashConvention:string;sources:LockedSource[]};
  if(lock.version!==REN_ACTIONS_VERSION||lock.profileId!==REN_ACTIONS_PROFILE||lock.hashConvention!=='sha256(JSON.stringify(fileHashes)); sorted relative path keys'||!Array.isArray(lock.sources)||lock.sources.length!==1)throw new Error('任注条件动作来源版本不完整。');
  const source=lock.sources[0];
  if(source.id!==REN_ACTIONS_SOURCE_ID||source.commit!=='wikisource-oldid/2600158;source-conditional-actions/1.0.0'||source.license!=='CC-BY-SA-4.0'||!Array.isArray(source.files)||!isDeepStrictEqual([...source.files].sort(),FILES)||!source.fileHashes||!isDeepStrictEqual(Object.keys(source.fileHashes).sort(),FILES))throw new Error('任注条件动作原件登记不完整。');
  const actual:Record<string,string>={};for(const file of [...source.files].sort()){
    if(!file.startsWith('data/')||file.split('/').some(part=>part==='..'||part==='.')||!/^[a-f0-9]{64}$/.test(source.fileHashes[file]??''))throw new Error('任注条件动作原件路径无效。');
    actual[file]=digest(readFileSync(join(directory,file.slice(5))));if(actual[file]!==source.fileHashes[file])throw new Error('任注条件动作规则、上下文、原句或许可校验失败。');
  }
  if(digest(JSON.stringify(actual))!==source.sha256)throw new Error('任注条件动作来源汇总校验失败。');
  const table=JSON.parse(readFileSync(join(directory,'ren-actions-rules.json'),'utf8'))as ReturnType<typeof renActionsRules>;
  const excerpts=JSON.parse(readFileSync(join(directory,'raw/ren-actions-excerpts.json'),'utf8'))as{version:string;source:Record<string,unknown>;contexts:ExcerptContext[]};
  if(!isDeepStrictEqual(table,renActionsRules())||table.source.revision!==2600158||table.source.fullWikitextSha256!==ORIGINAL_SHA256||table.source.fullWikitextCodepoints!==143701||excerpts.version!==REN_ACTIONS_VERSION||!isDeepStrictEqual(excerpts.source,table.source)||!Array.isArray(excerpts.contexts)||excerpts.contexts.length!==7||new Set(excerpts.contexts.map(x=>x.id)).size!==7)throw new Error('任注条件动作固定原文身份不一致。');
  for(const context of excerpts.contexts){if(!context.id||context.layer!=='ren-commentary'||!Number.isSafeInteger(context.start)||!Number.isSafeInteger(context.end)||context.start<0||context.end>143701||context.end-context.start!==[...context.quote].length||!context.quote.includes('任氏曰')||context.heading!=='通神论 '+context.section)throw new Error('任注条件动作所选完整评注段落范围无效。');}
  for(const clause of table.clauses){const span=clause.sourceSpan,context=excerpts.contexts.find(x=>x.id===clause.contextId);if(!context||span.unit!=='unicode-codepoint'||span.interval!=='[start,end)'||span.start<context.start||span.end>context.end||span.end-span.start!==[...clause.quote].length||[...context.quote].slice(span.start-context.start,span.end-context.start).join('')!==clause.quote||clause.locator!==`oldid=2600158;codepoint[${span.start},${span.end})`||clause.section!==context.heading||clause.sourceId!==REN_ACTIONS_SOURCE_ID)throw new Error('任注条件动作短句与完整评注上下文码点不一致。');}
  const{id,name,url,commit,license,files,sha256,note}=source;
  return{rules:structuredClone(table),sources:[{id,name,url,commit,license,files:[...files],sha256,note}]};
}
export function loadRenActionsSources(directory:string):SourceRecord[]{return loadRenActionsData(directory).sources;}
export function verifyRenActionsProvenance(session:NamingSession,sources:SourceRecord[]):void{
  const result=session.analysis.renCommentary as NamingSession['analysis']['renCommentary']&{actionAnalysis?:{version?:string;sourceId?:string;profileId?:string}};
  const recorded=session.sourceSnapshot?.sources.filter(source=>source.id===REN_ACTIONS_SOURCE_ID)??[],selected=session.profile.renMethod===METHOD||session.profile.renMethod===CAPACITY_METHOD||session.profile.renMethod==='ditian-ren-commentary-2600158/1.4.0'||session.profile.renMethod==='ditian-ren-commentary-2600158/1.5.0';
  if(!selected){if(result?.actionAnalysis!==undefined||recorded.length||result?.version===METHOD)throw new Error('任注条件动作结果或来源不得附着旧版或未启用方案。');return;}
  if(!result||result.version!==session.profile.renMethod||result.profileId!==session.profile.renMethod||result.actionAnalysis?.version!==REN_ACTIONS_VERSION||result.actionAnalysis?.profileId!==REN_ACTIONS_PROFILE||result.actionAnalysis?.sourceId!==REN_ACTIONS_SOURCE_ID||!session.sourceSnapshot||!validSessionSourceSnapshot(session.sourceSnapshot,session.dataVersion))throw new Error('任注1.2方案必须保留条件动作结果与完整来源。');
  if(sources.length!==1||recorded.length!==1||!isDeepStrictEqual(sources[0],recorded[0]))throw new Error('任注条件动作生成时来源与固定原文不一致。');
}
