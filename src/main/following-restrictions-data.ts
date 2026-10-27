import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {FOLLOWING_RESTRICTIONS_VERSION,FOLLOWING_RESTRICTIONS_PROFILE,FOLLOWING_RESTRICTIONS_SOURCE_ID as SOURCE_ID,followingRestrictionRules,type FollowingRestrictionRule} from '../domain/following-restrictions';
import {validSessionSourceSnapshot} from '../shared/session-sources';
import type {NamingSession,SourceRecord} from '../shared/types';

export const FOLLOWING_RESTRICTIONS_SOURCE_ID=SOURCE_ID;
const LOCK_SHA256='76be2f952f95ebb8f25a1c8b9a63d00a33c21cf7bd291bd3975a9ef3877ab3cf';
const sha=(value:Buffer|string)=>createHash('sha256').update(value).digest('hex');
type LockedSource=SourceRecord&{fileHashes:Record<string,string>};
export function loadFollowingRestrictionsData(directory:string):{rules:FollowingRestrictionRule[];sources:SourceRecord[]} {
  const raw=readFileSync(join(directory,'following-restrictions-source-lock.json'));
  if(sha(raw)!==LOCK_SHA256)throw new Error('从格月份限制来源登记校验失败。');
  const lock=JSON.parse(raw.toString('utf8')) as {version:string;sources:LockedSource[]};
  if(lock.version!==FOLLOWING_RESTRICTIONS_VERSION||!Array.isArray(lock.sources)||lock.sources.length!==1||lock.sources[0].id!==SOURCE_ID)throw new Error('从格月份限制来源版本不完整。');
  const source=lock.sources[0],hashes:Record<string,string>={};
  if(!Array.isArray(source.files)||source.files.length!==4||new Set(source.files).size!==source.files.length||!source.fileHashes||source.files.length!==Object.keys(source.fileHashes).length)throw new Error('从格月份限制原件登记不完整。');
  for(const file of [...source.files].sort()){
    if(!file.startsWith('data/')||file.split('/').some(part=>part==='.'||part==='..')||!/^[a-f0-9]{64}$/.test(source.fileHashes[file]??''))throw new Error('从格月份限制原件定位无效。');
    hashes[file]=sha(readFileSync(join(directory,file.slice(5))));if(hashes[file]!==source.fileHashes[file])throw new Error('从格月份限制规则、原文或许可校验失败。');
  }
  if(sha(JSON.stringify(hashes))!==source.sha256)throw new Error('从格月份限制来源汇总校验失败。');
  const data=JSON.parse(readFileSync(join(directory,'following-restrictions-rules.json'),'utf8')) as {version:string;profile:string;sourceId:string;rules:FollowingRestrictionRule[]};
  const excerpts=JSON.parse(readFileSync(join(directory,'raw/following-restrictions-qiongtong-excerpts.json'),'utf8')) as {version:string;excerpts:{id:string;sourceQuote:string;sourceLocator:string}[];contexts:{sourceQuote:string}[]};
  const rules=followingRestrictionRules();
  if(data.version!==FOLLOWING_RESTRICTIONS_VERSION||data.profile!==FOLLOWING_RESTRICTIONS_PROFILE||data.sourceId!==SOURCE_ID||!isDeepStrictEqual(data.rules,rules)||new Set(rules.map(rule=>rule.id)).size!==2||excerpts.version!==data.version||excerpts.excerpts.length!==2||excerpts.contexts.length!==2||rules.some(rule=>excerpts.excerpts.filter(excerpt=>excerpt.id===rule.id&&excerpt.sourceQuote===rule.sourceQuote&&excerpt.sourceLocator===rule.sourceLocator).length!==1))throw new Error('从格月份限制规则与固定原文不一致。');
  const{id,name,url,commit,license,files,sha256,note}=source;
  return {rules:structuredClone(rules),sources:[{id,name,url,commit,license,files:[...files],sha256,note}]};
}
export function loadFollowingRestrictionsSources(directory:string):SourceRecord[]{return loadFollowingRestrictionsData(directory).sources;}
export function verifyFollowingRestrictionsProvenance(session:NamingSession,sources:SourceRecord[]):void {
  const used=session.analysis.bazi.monthFollowingRestrictions?.sourceId===SOURCE_ID;
  const recorded=session.sourceSnapshot?.sources.filter(source=>source.id===SOURCE_ID)??[];
  if(!used&&!recorded.length)return;
  if(!session.sourceSnapshot||!validSessionSourceSnapshot(session.sourceSnapshot,session.dataVersion))throw new Error('从格月份限制缺少完整生成时来源清单。');
  if(sources.length!==1||recorded.length!==1||!isDeepStrictEqual(recorded[0],sources[0]))throw new Error('从格月份限制生成时来源与固定原文版本不一致。');
}
