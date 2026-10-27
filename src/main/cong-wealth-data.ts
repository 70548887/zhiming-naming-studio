import{createHash}from'node:crypto';import{readFileSync}from'node:fs';import{join}from'node:path';import{isDeepStrictEqual}from'node:util';
import type{NamingSession,SourceRecord}from'../shared/types';import{validSessionSourceSnapshot}from'../shared/session-sources';
export const CONG_WEALTH_SOURCE_ID='bazi-cong-wealth-qiongtong-2294674';
export const CONG_WEALTH_DATA_VERSION='qiongtong-2294674-monthly-cong-wealth/1.0.0';
const LOCK_SHA256='8ba224dfecaac8f40866ce5703310bb43f9bf35c7f2a3467c4ee18406c675fb7';
const hash=(input:Buffer|string)=>createHash('sha256').update(input).digest('hex');
interface LockedSource extends SourceRecord{fileHashes:Record<string,string>;}
export interface CongWealthData{version:string;sourceId:string;title:string;rules:any[];source:Record<string,unknown>;contract:Record<string,string>;limitations:string[];}
export function loadCongWealthData(dataDirectory:string):{table:CongWealthData;sources:SourceRecord[]}{
 const bytes=readFileSync(join(dataDirectory,'cong-wealth-source-lock.json'));if(hash(bytes)!==LOCK_SHA256)throw new Error('月别从财来源登记校验失败。');
 const lock=JSON.parse(bytes.toString('utf8'))as{version:string;sources:LockedSource[]};if(lock.version!==CONG_WEALTH_DATA_VERSION||lock.sources.length!==1||lock.sources[0].id!==CONG_WEALTH_SOURCE_ID)throw new Error('月别从财来源版本不完整。');
 const source=lock.sources[0],actual:Record<string,string>={};if(source.files.length!==Object.keys(source.fileHashes).length)throw new Error('月别从财原件登记不完整。');
 for(const file of[...source.files].sort()){if(!file.startsWith('data/')||file.split('/').some(part=>part==='..'||part==='.')||!/^[a-f0-9]{64}$/.test(source.fileHashes[file]??''))throw new Error('月别从财原件定位无效。');actual[file]=hash(readFileSync(join(dataDirectory,file.slice(5))));if(actual[file]!==source.fileHashes[file])throw new Error('月别从财原文、规则或许可校验失败。');}
 if(hash(JSON.stringify(actual))!==source.sha256)throw new Error('月别从财来源汇总校验失败。');
 const table=JSON.parse(readFileSync(join(dataDirectory,'cong-wealth-rules.json'),'utf8'))as CongWealthData;if(table.version!==CONG_WEALTH_DATA_VERSION||table.sourceId!==CONG_WEALTH_SOURCE_ID||table.rules.length!==4||new Set(table.rules.map(rule=>rule.id)).size!==4)throw new Error('月别从财规则范围不一致。');
 const{id,name,url,commit,license,files,sha256,note}=source;return{table,sources:[{id,name,url,commit,license,files:[...files],sha256,note}]};
}
export function loadCongWealthSources(directory:string):SourceRecord[]{return loadCongWealthData(directory).sources;}
export function verifyCongWealthProvenance(session:NamingSession,sources:SourceRecord[]):void{
 if(!session.analysis.bazi.evidence?.sources.some(source=>source.id===CONG_WEALTH_SOURCE_ID)||session.sourceSnapshot===undefined)return;
 if(!validSessionSourceSnapshot(session.sourceSnapshot,session.dataVersion))throw new Error('月别从财生成时来源清单无效。');
 const expected=sources.filter(source=>source.id===CONG_WEALTH_SOURCE_ID),actual=session.sourceSnapshot.sources.filter(source=>source.id===CONG_WEALTH_SOURCE_ID);
 if(expected.length!==1||actual.length!==1||!isDeepStrictEqual(expected[0],actual[0]))throw new Error('月别从财生成时来源与固定同版原文不一致。');
}
