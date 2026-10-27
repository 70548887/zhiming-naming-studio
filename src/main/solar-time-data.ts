import {createHash}from'node:crypto';import{readFileSync}from'node:fs';import{join}from'node:path';import{isDeepStrictEqual}from'node:util';
import type{NamingSession,SourceRecord}from'../shared/types';
import{APPARENT_SOLAR_SOURCE_ID,APPARENT_SOLAR_VERSION}from'../shared/apparent-solar';
import{validSessionSourceSnapshot}from'../shared/session-sources';
export const SOLAR_TIME_SOURCE_ID=APPARENT_SOLAR_SOURCE_ID;
const LOCK_SHA256='09c7946574ce37f0b2ee5204f76e61167a8001614157c2238b2e80658f383481';
const hash=(value:Buffer|string)=>createHash('sha256').update(value).digest('hex');
type LockedSource=SourceRecord&{fileHashes:Record<string,string>};
export function loadSolarTimeSources(directory:string):SourceRecord[]{
 const raw=readFileSync(join(directory,'solar-time-source-lock.json'));
 if(hash(raw)!==LOCK_SHA256)throw new Error('真太阳时来源登记校验失败。');
 const lock=JSON.parse(raw.toString('utf8'))as{version:string;sources:LockedSource[]};
 if(lock.version!==APPARENT_SOLAR_VERSION||!Array.isArray(lock.sources)||lock.sources.length!==1||lock.sources[0].id!==SOLAR_TIME_SOURCE_ID)throw new Error('真太阳时来源版本不完整。');
 const source=lock.sources[0],actual:Record<string,string>={};
 if(!Array.isArray(source.files)||new Set(source.files).size!==source.files.length||source.files.length!==Object.keys(source.fileHashes).length)throw new Error('真太阳时原件登记不完整。');
 for(const file of[...source.files].sort()){
  if(!file.startsWith('data/')||file.split('/').some(part=>part==='..'||part==='.')||!/^[a-f0-9]{64}$/.test(source.fileHashes[file]??''))throw new Error('真太阳时原件定位无效。');
  actual[file]=hash(readFileSync(join(directory,file.slice(5))));
  if(actual[file]!==source.fileHashes[file])throw new Error('真太阳时公式原件、例证或许可校验失败。');
 }
 if(hash(JSON.stringify(actual))!==source.sha256)throw new Error('真太阳时来源汇总校验失败。');
 const{id,name,url,commit,license,files,sha256,note}=source;return[{id,name,url,commit,license,files:[...files],sha256,note}];
}
export function verifySolarTimeProvenance(session:NamingSession,sources:SourceRecord[]):void{
 const used=session.analysis.bazi.timeBasis?.sourceId===SOLAR_TIME_SOURCE_ID;
 const recorded=session.sourceSnapshot?.sources.filter(source=>source.id===SOLAR_TIME_SOURCE_ID)??[];
 if(!used&&!recorded.length)return;
 if(!session.sourceSnapshot||!validSessionSourceSnapshot(session.sourceSnapshot,session.dataVersion))throw new Error('真太阳时方案缺少完整生成时来源清单。');
 if(sources.length!==1||recorded.length!==1||!isDeepStrictEqual(sources[0],recorded[0]))throw new Error('真太阳时生成时来源与固定公式版本不一致。');
}
