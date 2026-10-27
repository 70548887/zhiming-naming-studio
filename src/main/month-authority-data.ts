import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import type { Element, NamingSession, SourceRecord } from '../shared/types';
import { validSessionSourceSnapshot } from '../shared/session-sources';

export const MONTH_AUTHORITY_SOURCE_ID='bazi-month-authority-sanming-v1';
export const MONTH_AUTHORITY_TABLE_VERSION='sanming-first-paragraph/1.0.0';
const MANIFEST_SHA256='c01a9345e2b773b4c231c041af525456f2110638f850cc0768b194efdde603d8';
const digest=(bytes:Buffer|string)=>createHash('sha256').update(bytes).digest('hex');

export interface MonthAuthorityTableSegment {sourceTerm:string;days:number;fromDay:number;toDay:number;element:Element;normalizedStem?:string;}
export interface MonthAuthorityTableRow {monthBranch:string;sourceQuote:string;sourceLocator:string;segments:MonthAuthorityTableSegment[];}
export interface MonthAuthorityReading {id:string;title:string;status:'comparison-only';quote:string;sourceLocator:string;note:string;}
export interface MonthAuthorityTable {
 version:string;sourceId:string;title:string;
 source:{repository:string;commit:string;upstreamPath:string;edition:string;section:string;permalink:string;contributorHistory:string};
 license:{historicalText:string;transcription:string;structuredMapping:string;notice:string;fullLicense:string};
 verification:{scanCollation:false;status:string;note:string};
 policy:{id:string;daySeconds:number;interval:string;tableDays:number;sourceTerms:string;actualMonth:string;shortMonth:string;longMonth:string;unknownTime:string};
 months:MonthAuthorityTableRow[];readings:MonthAuthorityReading[];limitations:string[];
}
interface LockedSource extends SourceRecord {fileHashes:Record<string,string>;}

/** Independent profile: adding this source never rewrites the already-published 1.0.10 fact-source lock. */
export function loadMonthAuthorityData(dataDirectory:string):{table:MonthAuthorityTable;sources:SourceRecord[]} {
 const bytes=readFileSync(join(dataDirectory,'month-authority-source-lock.json'));
 if(digest(bytes)!==MANIFEST_SHA256)throw new Error('月令分日来源登记校验失败，请恢复原始规则资料。');
 const lock=JSON.parse(bytes.toString('utf8')) as {version:string;sources:LockedSource[]};
 if(lock.version!==MONTH_AUTHORITY_TABLE_VERSION||!Array.isArray(lock.sources)||lock.sources.length!==1||lock.sources[0].id!==MONTH_AUTHORITY_SOURCE_ID)throw new Error('月令分日来源版本或来源编号不完整。');
 const source=lock.sources[0],actual:Record<string,string>={};
 if(!source.fileHashes||Object.keys(source.fileHashes).length!==source.files.length)throw new Error('月令分日原件校验记录不完整。');
 for(const file of [...source.files].sort()){
  if(!file.startsWith('data/')||file.split('/').some(part=>part==='..'||part==='.')||!/^[a-f0-9]{64}$/.test(source.fileHashes[file]??''))throw new Error('月令分日原件定位无效。');
  actual[file]=digest(readFileSync(join(dataDirectory,file.slice('data/'.length))));
  if(actual[file]!==source.fileHashes[file])throw new Error('月令分日原文、结构表或许可校验失败，请恢复原始规则资料。');
 }
 if(digest(JSON.stringify(actual))!==source.sha256)throw new Error('月令分日来源汇总校验失败。');
 const table=JSON.parse(readFileSync(join(dataDirectory,'month-authority-table.json'),'utf8')) as MonthAuthorityTable;
 if(table.version!==MONTH_AUTHORITY_TABLE_VERSION||table.sourceId!==MONTH_AUTHORITY_SOURCE_ID||table.months.length!==12||table.months.reduce((sum,month)=>sum+month.segments.length,0)!==32
   ||table.months.some(month=>month.segments.at(-1)?.toDay!==30)||table.verification.scanCollation!==false)throw new Error('月令分日首段表结构或校勘范围无效。');
 const {id,name,url,commit,license,files,sha256,note}=source;
 return {table,sources:[{id,name,url,commit,license,files:[...files],sha256,note}]};
}

export function loadMonthAuthoritySources(dataDirectory:string):SourceRecord[]{return loadMonthAuthorityData(dataDirectory).sources;}

/** A historical custom knowledge pack cannot impersonate the fixed monthly rule source under the same ID. */
export function verifyMonthAuthorityProvenance(session:NamingSession,shippedSources:SourceRecord[]):void {
 const evidence=session.analysis.bazi.evidence;
 if(!evidence?.sources.some(source=>source.id===MONTH_AUTHORITY_SOURCE_ID)||session.sourceSnapshot===undefined)return;
 if(!validSessionSourceSnapshot(session.sourceSnapshot,session.dataVersion))throw new Error('月令分日生成时来源清单无效。');
 const expected=shippedSources.filter(source=>source.id===MONTH_AUTHORITY_SOURCE_ID),recorded=session.sourceSnapshot.sources.filter(source=>source.id===MONTH_AUTHORITY_SOURCE_ID);
 if(expected.length!==1||recorded.length!==1||!isDeepStrictEqual(expected[0],recorded[0]))throw new Error('月令分日生成时来源与固定转录资料不一致。');
}
