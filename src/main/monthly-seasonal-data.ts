import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import type { MonthlySeasonalPredicate, NamingSession, SourceRecord } from '../shared/types';
import { validSessionSourceSnapshot } from '../shared/session-sources';

export const MONTHLY_SEASONAL_SOURCE_ID='bazi-monthly-qiongtong-2294674';
export const MONTHLY_SEASONAL_TABLE_VERSION='qiongtong-2294674-initial/1.0.0';
const MANIFEST_SHA256='370c78f396a86df0e07cc4cc50f95b4afaad2ecb61399a359001a68c9b424290';
const digest=(value:Buffer|string)=>createHash('sha256').update(value).digest('hex');
export interface MonthlySeasonalSourceUse {stem:string;role:'first'|'support'|'parallel'|'unranked';sequence:number;quote:string;}
export interface MonthlySeasonalSourceSpan {start:number;end:number;unit:'unicode-codepoint';interval:'[start,end)';}
export interface MonthlySeasonalSourceCondition {id:string;sourceQuote:string;sourceLocator:string;sourceSpan:MonthlySeasonalSourceSpan;predicate?:MonthlySeasonalPredicate;proposedUses:MonthlySeasonalSourceUse[];note:string;}
export interface MonthlySeasonalSourceEntry {
 id:string;title:string;dayStem:string;monthBranch:string;sourceId:string;sourceQuote:string;sourceLocator:string;sourceSpan:MonthlySeasonalSourceSpan;
 initialUses:MonthlySeasonalSourceUse[];conditions:MonthlySeasonalSourceCondition[];reviewStatus:'initial'|'needs-review';coverageStatus:'initial'|'needs-review';sourceScope:string;missing:string[];
}
export interface MonthlySeasonalSourceTable {
 version:string;sourceId:string;title:string;source:{title:string;pageId:number;revisionId:number;revisionTimestamp:string;url:string;permalink:string;contributorHistory:string;rawSha256:string;rawCharacters:number;license:string;scanCollation:false;sourceVersionType:string;};
 license:string;coverage:{indexedCases:number;initialCases:number;needsReviewCases:number;independentMonthlyParagraphs:false;note:string;};entries:MonthlySeasonalSourceEntry[];limitations:string[];
}
interface LockedSource extends SourceRecord {fileHashes:Record<string,string>;}

/** A separately versioned source package; earlier factual and monthly-authority packages remain immutable. */
export function loadMonthlySeasonalData(dataDirectory:string):{table:MonthlySeasonalSourceTable;sources:SourceRecord[]} {
 const raw=readFileSync(join(dataDirectory,'monthly-seasonal-source-lock.json'));
 if(digest(raw)!==MANIFEST_SHA256)throw new Error('逐月初始取用来源登记校验失败，请恢复原始规则资料。');
 const lock=JSON.parse(raw.toString('utf8')) as {version:string;sources:LockedSource[]};
 if(lock.version!==MONTHLY_SEASONAL_TABLE_VERSION||lock.sources.length!==1||lock.sources[0].id!==MONTHLY_SEASONAL_SOURCE_ID)throw new Error('逐月初始取用来源版本不完整。');
 const source=lock.sources[0],actual:Record<string,string>={};
 if(Object.keys(source.fileHashes).length!==source.files.length)throw new Error('逐月初始取用原件校验记录缺失。');
 for(const file of [...source.files].sort()){
  if(!file.startsWith('data/')||file.split('/').some(part=>part==='..'||part==='.')||!/^[a-f0-9]{64}$/.test(source.fileHashes[file]??''))throw new Error('逐月初始取用原件定位无效。');
  actual[file]=digest(readFileSync(join(dataDirectory,file.slice('data/'.length))));
  if(actual[file]!==source.fileHashes[file])throw new Error('逐月初始取用原文、结构表或许可校验失败。');
 }
 if(digest(JSON.stringify(actual))!==source.sha256)throw new Error('逐月初始取用来源汇总校验失败。');
 const table=JSON.parse(readFileSync(join(dataDirectory,'monthly-seasonal-table.json'),'utf8')) as MonthlySeasonalSourceTable;
 if(table.version!==MONTHLY_SEASONAL_TABLE_VERSION||table.sourceId!==MONTHLY_SEASONAL_SOURCE_ID||table.entries.length!==120||new Set(table.entries.map(entry=>entry.id)).size!==120||table.source.scanCollation!==false)throw new Error('逐月初始取用条目或校勘范围不完整。');
 const {id,name,url,commit,license,files,sha256,note}=source;
 return {table,sources:[{id,name,url,commit,license,files:[...files],sha256,note}]};
}
export function loadMonthlySeasonalSources(dataDirectory:string):SourceRecord[]{return loadMonthlySeasonalData(dataDirectory).sources;}

/** Same-ID metadata in an imported backup cannot replace this fixed transcription; old records stay old. */
export function verifyMonthlySeasonalProvenance(session:NamingSession,shippedSources:SourceRecord[]):void {
 const evidence=session.analysis.bazi.evidence;
 if(!evidence?.sources.some(source=>source.id===MONTHLY_SEASONAL_SOURCE_ID)||session.sourceSnapshot===undefined)return;
 if(!validSessionSourceSnapshot(session.sourceSnapshot,session.dataVersion))throw new Error('逐月初始取用生成时来源清单无效。');
 const expected=shippedSources.filter(source=>source.id===MONTHLY_SEASONAL_SOURCE_ID),recorded=session.sourceSnapshot.sources.filter(source=>source.id===MONTHLY_SEASONAL_SOURCE_ID);
 if(expected.length!==1||recorded.length!==1||!isDeepStrictEqual(expected[0],recorded[0]))throw new Error('逐月初始取用生成时来源与固定转录资料不一致。');
}
