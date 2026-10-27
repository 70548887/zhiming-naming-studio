import { createHash }from'node:crypto';import{readFileSync}from'node:fs';import{join}from'node:path';import{isDeepStrictEqual}from'node:util';
import type{MonthlySeasonalPredicate,NamingSession,SourceRecord}from'../shared/types';
import{validSessionSourceSnapshot}from'../shared/session-sources';
export const SEASONAL_CONDITION_SOURCE_ID='bazi-monthly-qiongtong-2294674-conditions';
export const SEASONAL_CONDITION_DATA_VERSION='qiongtong-2294674-conditions/1.0.0';
const SOURCE_LOCK_SHA256='0810183cdddc2ac86cef2f9da0e00a54fed3e52cb95316b7b832ef14de01337e';
const sha=(bytes:Buffer|string)=>createHash('sha256').update(bytes).digest('hex');
export interface SeasonalSupplementRule {
 id:string;caseId:string;dayStem:string;monthBranch:string;originalConditionId?:string;sourceId:string;sourceQuote:string;sourceLocator:string;
 sourceSpan:{start:number;end:number;unit:'unicode-codepoint';interval:'[start,end)'};
 kind:'calendar-prerequisite'|'fact';scope:'partial-prerequisite'|'full-fact-predicate';
 calendar?:{fromTerm:string;toTerm:string;range:'[from,to)'};predicate?:MonthlySeasonalPredicate;
 unresolved:string[];proposedUses:[];doesNotResolveOriginalBranch:true;
}
export interface SeasonalConditionData {version:string;sourceId:string;title:string;source:Record<string,unknown>;rules:SeasonalSupplementRule[];contract:Record<string,string>;deferredOriginalConditions:string[];limitations:string[];}
interface LockedSource extends SourceRecord{fileHashes:Record<string,string>;}
export function loadSeasonalConditionData(dataDirectory:string):{table:SeasonalConditionData;sources:SourceRecord[]}{
 const raw=readFileSync(join(dataDirectory,'seasonal-condition-source-lock.json'));if(sha(raw)!==SOURCE_LOCK_SHA256)throw new Error('逐月条件补充来源登记校验失败。');
 const lock=JSON.parse(raw.toString('utf8'))as{version:string;sources:LockedSource[]};
 if(lock.version!==SEASONAL_CONDITION_DATA_VERSION||lock.sources.length!==1||lock.sources[0].id!==SEASONAL_CONDITION_SOURCE_ID)throw new Error('逐月条件补充来源版本不完整。');
 const source=lock.sources[0],actual:Record<string,string>={};if(source.files.length!==Object.keys(source.fileHashes).length)throw new Error('逐月条件补充文件登记不完整。');
 for(const file of [...source.files].sort()){
  if(!file.startsWith('data/')||file.split('/').some(part=>part==='..'||part==='.')||!/^[a-f0-9]{64}$/.test(source.fileHashes[file]??''))throw new Error('逐月条件补充原件定位无效。');
  actual[file]=sha(readFileSync(join(dataDirectory,file.slice(5))));if(actual[file]!==source.fileHashes[file])throw new Error('逐月条件补充原文、映射或许可校验失败。');
 }
 if(sha(JSON.stringify(actual))!==source.sha256)throw new Error('逐月条件补充来源汇总校验失败。');
 const table=JSON.parse(readFileSync(join(dataDirectory,'monthly-seasonal-conditions.json'),'utf8'))as SeasonalConditionData;
 if(table.version!==SEASONAL_CONDITION_DATA_VERSION||table.sourceId!==SEASONAL_CONDITION_SOURCE_ID||table.rules.length!==7||new Set(table.rules.map(rule=>rule.id)).size!==7||table.rules.some(rule=>rule.proposedUses.length!==0||rule.doesNotResolveOriginalBranch!==true))throw new Error('逐月条件补充规则范围不一致。');
 const{id,name,url,commit,license,files,sha256,note}=source;return {table,sources:[{id,name,url,commit,license,files:[...files],sha256,note}]};
}
export function loadSeasonalConditionSources(dataDirectory:string):SourceRecord[]{return loadSeasonalConditionData(dataDirectory).sources;}
export function verifySeasonalConditionProvenance(session:NamingSession,sources:SourceRecord[]):void{
 if(!session.analysis.bazi.evidence?.sources.some(source=>source.id===SEASONAL_CONDITION_SOURCE_ID)||session.sourceSnapshot===undefined)return;
 if(!validSessionSourceSnapshot(session.sourceSnapshot,session.dataVersion))throw new Error('逐月条件补充生成时来源清单无效。');
 const expected=sources.filter(source=>source.id===SEASONAL_CONDITION_SOURCE_ID),recorded=session.sourceSnapshot.sources.filter(source=>source.id===SEASONAL_CONDITION_SOURCE_ID);
 if(expected.length!==1||recorded.length!==1||!isDeepStrictEqual(expected[0],recorded[0]))throw new Error('逐月条件补充生成时来源与固定原文映射不一致。');
}
