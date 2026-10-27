import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {renNecessaryRules,REN_NECESSARY_VERSION,REN_NECESSARY_SOURCE_ID,REN_COMMENTARY_VERSION,type RenNecessaryRule} from '../domain/ditian-ren';
import {normalizeRenMethod,REN_METHOD,REN_ACTION_METHOD,REN_CAPACITY_METHOD,REN_DIRECTION_METHOD,REN_JOINT_BATTLE_METHOD} from '../shared/ren-method';
import {validSessionSourceSnapshot} from '../shared/session-sources';
import type {NamingSession,SourceRecord} from '../shared/types';

export {REN_NECESSARY_SOURCE_ID};
const LOCK_SHA256='fe44c12900437b6a3a4e7731b29ea4b7eafd5c21929534ce232e9d2e52b463a1';
const ORIGINAL_SHA256='1d1a3d61c1b9a26618b41b8ead857a6b966992fdf2adabdc607a0c6cb4c8f04d';
const EXPECTED_FILES=['data/raw/CC-BY-SA-4.0.txt','data/raw/ren-necessary-NOTICE.md','data/raw/ren-necessary-excerpts.json','data/ren-necessary-rules.json'];
const digest=(value:Buffer|string)=>createHash('sha256').update(value).digest('hex');
type LockedSource=SourceRecord&{fileHashes:Record<string,string>};

/** Validate the exact independent addon without rewriting the published1.0 source table. */
export function loadRenNecessaryData(directory:string):{rules:RenNecessaryRule[];sources:SourceRecord[]} {
  const bytes=readFileSync(join(directory,'ren-necessary-source-lock.json'));
  if(digest(bytes)!==LOCK_SHA256)throw new Error('任注必要条件来源登记校验失败。');
  const lock=JSON.parse(bytes.toString('utf8')) as {version:string;hashConvention:string;sources:LockedSource[]};
  if(lock.version!==REN_NECESSARY_VERSION||lock.hashConvention!=='sha256(JSON.stringify(fileHashes)); sorted relative path keys'||!Array.isArray(lock.sources)||lock.sources.length!==1||lock.sources[0].id!==REN_NECESSARY_SOURCE_ID)throw new Error('任注必要条件来源版本不完整。');
  const source=lock.sources[0],actual:Record<string,string>={};
  if(!Array.isArray(source.files)||!isDeepStrictEqual([...source.files].sort(),EXPECTED_FILES)||!source.fileHashes||!isDeepStrictEqual(Object.keys(source.fileHashes).sort(),EXPECTED_FILES))throw new Error('任注必要条件原件登记不完整。');
  for(const file of [...source.files].sort()){
    if(!file.startsWith('data/')||file.split('/').some(part=>part==='..'||part==='.')||!/^[a-f0-9]{64}$/.test(source.fileHashes[file]??''))throw new Error('任注必要条件原件定位无效。');
    actual[file]=digest(readFileSync(join(directory,file.slice(5))));
    if(actual[file]!==source.fileHashes[file])throw new Error('任注必要条件规则、原句或许可校验失败。');
  }
  if(digest(JSON.stringify(actual))!==source.sha256)throw new Error('任注必要条件来源汇总校验失败。');
  const table=JSON.parse(readFileSync(join(directory,'ren-necessary-rules.json'),'utf8')) as {version:string;profileId:string;sourceId:string;source:{revision:number;fullWikitextSha256:string};rules:RenNecessaryRule[]};
  const excerpts=JSON.parse(readFileSync(join(directory,'raw/ren-necessary-excerpts.json'),'utf8')) as {version:string;source:unknown;excerpts:{quote:string;locator:string}[]};
  const rules=renNecessaryRules();
  if(table.version!==REN_NECESSARY_VERSION||table.profileId!==REN_COMMENTARY_VERSION||table.sourceId!==REN_NECESSARY_SOURCE_ID||table.source.revision!==2600158||table.source.fullWikitextSha256!==ORIGINAL_SHA256||!isDeepStrictEqual(table.rules,rules)||excerpts.version!==table.version||!isDeepStrictEqual(excerpts.source,table.source)||excerpts.excerpts.length!==1)throw new Error('任注必要条件规则或原文身份不一致。');
  const original=excerpts.excerpts[0];
  if(rules.some(rule=>rule.sourceQuote!==original.quote||rule.sourceLocator!==original.locator)||!original.quote.includes('必要局中有财')||!original.quote.includes('必要食伤在提纲'))throw new Error('任注必要条件必须保留同版完整原句。');
  const{id,name,url,commit,license,files,sha256,note}=source;
  return{rules:structuredClone(rules),sources:[{id,name,url,commit,license,files:[...files],sha256,note}]};
}
export function loadRenNecessarySources(directory:string):SourceRecord[]{return loadRenNecessaryData(directory).sources;}

/** Only the explicitly selected1.1 profile may carry this additive fixed publication. */
export function verifyRenNecessaryProvenance(session:NamingSession,sources:SourceRecord[]):void {
  const method=normalizeRenMethod(session.profile.renMethod),result=session.analysis.renCommentary;
  const recorded=session.sourceSnapshot?.sources.filter(source=>source.id===REN_NECESSARY_SOURCE_ID)??[];
  const newResult=result?.version===REN_COMMENTARY_VERSION||result?.necessaryConditions!==undefined;
  if(method!==REN_METHOD&&method!==REN_ACTION_METHOD&&method!==REN_CAPACITY_METHOD&&method!==REN_DIRECTION_METHOD&&method!==REN_JOINT_BATTLE_METHOD){if(newResult||recorded.length)throw new Error('任注必要条件来源不得附着旧版或未启用方案。');return;}
  if(!result||result.version!==method||result.profileId!==result.version||result.necessaryConditions?.sourceId!==REN_NECESSARY_SOURCE_ID)throw new Error('任注方案必须保留原必要条件结果及其固定来源。');
  if(!session.sourceSnapshot||!validSessionSourceSnapshot(session.sourceSnapshot,session.dataVersion))throw new Error('任注必要条件方案缺少完整生成时来源清单。');
  if(sources.length!==1||recorded.length!==1||!isDeepStrictEqual(recorded[0],sources[0]))throw new Error('任注必要条件生成时来源与固定原文版本不一致。');
}
