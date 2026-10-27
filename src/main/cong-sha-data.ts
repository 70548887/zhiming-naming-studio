import{createHash}from'node:crypto';import{readFileSync}from'node:fs';import{join}from'node:path';import{isDeepStrictEqual}from'node:util';
import type{NamingSession,SourceRecord}from'../shared/types';import{validSessionSourceSnapshot}from'../shared/session-sources';
export const CONG_SHA_SOURCE_ID='bazi-cong-sha-qiongtong-2294674';
export const CONG_SHA_DATA_VERSION='qiongtong-2294674-monthly-cong-sha/1.0.0';
const LOCK_SHA256='3788916bc73d5336a40aaebdd09a7231233c0ee22e8d3eff1e631f59c72581f2';
const hash=(value:Buffer|string)=>createHash('sha256').update(value).digest('hex');
interface LockedSource extends SourceRecord{fileHashes:Record<string,string>;}
export interface CongShaData{version:string;sourceId:string;title:string;source:Record<string,unknown>;rules:any[];contract:Record<string,string>;limitations:string[];}
export function loadCongShaData(directory:string):{table:CongShaData;sources:SourceRecord[]}{
 const raw=readFileSync(join(directory,'cong-sha-source-lock.json'));if(hash(raw)!==LOCK_SHA256)throw new Error('月别从杀来源登记校验失败。');
 const lock=JSON.parse(raw.toString('utf8'))as{version:string;sources:LockedSource[]};if(lock.version!==CONG_SHA_DATA_VERSION||lock.sources.length!==1||lock.sources[0].id!==CONG_SHA_SOURCE_ID)throw new Error('月别从杀来源版本不完整。');
 const source=lock.sources[0],actual:Record<string,string>={};if(source.files.length!==Object.keys(source.fileHashes).length)throw new Error('月别从杀原件登记不完整。');
 for(const file of[...source.files].sort()){
  if(!file.startsWith('data/')||file.split('/').some(part=>part==='..'||part==='.')||!/^[a-f0-9]{64}$/.test(source.fileHashes[file]??''))throw new Error('月别从杀原件定位无效。');
  actual[file]=hash(readFileSync(join(directory,file.slice(5))));if(actual[file]!==source.fileHashes[file])throw new Error('月别从杀原文、规则或许可校验失败。');
 }
 if(hash(JSON.stringify(actual))!==source.sha256)throw new Error('月别从杀来源汇总校验失败。');
 const table=JSON.parse(readFileSync(join(directory,'cong-sha-rules.json'),'utf8'))as CongShaData;
 if(table.version!==CONG_SHA_DATA_VERSION||table.sourceId!==CONG_SHA_SOURCE_ID||table.rules.length!==5||new Set(table.rules.map(rule=>rule.id)).size!==5)throw new Error('月别从杀规则范围不一致。');
 for(const rule of table.rules){
  if(!Array.isArray(rule.criteria)||!Array.isArray(rule.rejectionBranches))throw new Error('月别从杀条件或依赖分支缺失。');
  const ids=new Set(rule.criteria.map((criterion:any)=>criterion.id));if(ids.size!==rule.criteria.length)throw new Error('月别从杀条件编号重复。');
  for(const branch of rule.rejectionBranches){if(!Array.isArray(branch.premiseCriterionIds)||!branch.premiseCriterionIds.length||!Array.isArray(branch.signalCriterionIds)||!branch.signalCriterionIds.length||[...branch.premiseCriterionIds,...branch.signalCriterionIds].some(id=>!ids.has(id)))throw new Error('月别从杀反向分支引用了不存在的条件，不能忽略依赖。');}
 }
 const{id,name,url,commit,license,files,sha256,note}=source;return{table,sources:[{id,name,url,commit,license,files:[...files],sha256,note}]};
}
export function loadCongShaSources(directory:string):SourceRecord[]{return loadCongShaData(directory).sources;}
export function verifyCongShaProvenance(session:NamingSession,sources:SourceRecord[]):void{
 if(!session.analysis.bazi.evidence?.sources.some(source=>source.id===CONG_SHA_SOURCE_ID)||session.sourceSnapshot===undefined)return;
 if(!validSessionSourceSnapshot(session.sourceSnapshot,session.dataVersion))throw new Error('月别从杀生成时来源清单无效。');
 const expected=sources.filter(source=>source.id===CONG_SHA_SOURCE_ID),recorded=session.sourceSnapshot.sources.filter(source=>source.id===CONG_SHA_SOURCE_ID);
 if(expected.length!==1||recorded.length!==1||!isDeepStrictEqual(expected[0],recorded[0]))throw new Error('月别从杀生成时来源与同版固定原文不一致。');
}
