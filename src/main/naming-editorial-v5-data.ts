import {digestSourceBytes} from './source-byte-digest.mjs';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual as equal} from 'node:util';
import expectedTable from '../../data/naming-editorial-v5.json';
import publication from '../../data/naming-editorial-names-v5-source-lock.json';
import {validateNamingEditorialV5Inputs,V5_INPUT_HASHES} from '../../scripts/naming-editorial-v5-validation.mjs';
import {loadFixedMoeRows} from '../../scripts/fixed-moe-index.mjs';
import type {NamingSession,SourceRecord} from '../shared/types';

export const NAMING_EDITORIAL_V5_SOURCE_ID='naming-editorial-names-v5-fixed';
export const NAMING_EDITORIAL_V5_VERSION='naming-editorial-5.0.0';
export const NAMING_EDITORIAL_V5_DATA_VERSION='2026.10.20.1';
const TABLE_SHA='bb8d3d255b42a6b67932988e13ceb2d7a7a1c6ef8fbbcc65312b9a50b5519da8',LOCK_SHA='e277c927f24f059e9be1fede52be6be327fb287c27276663711b5834d10d4981';
const digest=(value:string|Uint8Array)=>Buffer.isBuffer(value)?digestSourceBytes(value):createHash('sha256').update(value).digest('hex');
function requireFact(condition:unknown,message:string):asserts condition{if(!condition)throw new Error('命名出处5.0资料校验失败：'+message);}
const object=(value:unknown):value is Record<string,any>=>!!value&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
const sameKeys=(value:object,keys:string[])=>equal(Object.keys(value).sort(),[...keys].sort());
const normalize=(source:any):SourceRecord=>{const {id,name,url,commit,license,files,sha256,note}=source;return {id,name,url,commit,license,files:[...files],sha256,note};};
function frozen<T>(value:T):T{if(value&&typeof value==='object'){for(const child of Object.values(value))frozen(child);Object.freeze(value);}return value;}
export type NamingEditorialV5Table=typeof expectedTable;

/** Raw dictionary rows and fixed full source contexts are separate inputs from the generated table. */
export function validateNamingEditorialV5Table(table:any,inputs:{baseDataset:any;nextDataset:any;base4:any;review:any;corrections:any;rawMoe:any[];rawPoems:any[]}):void{
 requireFact(object(table)&&object(table.newDataset)&&table.newDataset.file==='data/dataset-v5.json'&&table.newDataset.sqliteFile==='data/knowledge-v5.sqlite'&&table.newDataset.version===NAMING_EDITORIAL_V5_DATA_VERSION&&/^[a-f0-9]{64}$/.test(table.newDataset.sha256)&&/^[a-f0-9]{64}$/.test(table.newDataset.sqliteSha256),'新知识包完整摘要或文件身份不符');
 validateNamingEditorialV5Inputs({table,...inputs});
}

export function loadNamingEditorialV5Data(directory:string):{table:NamingEditorialV5Table;sources:SourceRecord[]}{
 const load=(file:string)=>readFileSync(join(directory,file));
 const lockBytes=load('naming-editorial-names-v5-source-lock.json'),tableBytes=load('naming-editorial-v5.json');
 requireFact(digest(lockBytes)===LOCK_SHA&&digest(tableBytes)===TABLE_SHA,'固定原件摘要不一致');
 const lock=JSON.parse(lockBytes.toString('utf8')),table=JSON.parse(tableBytes.toString('utf8'));
 requireFact(lock.version===NAMING_EDITORIAL_V5_VERSION&&Array.isArray(lock.sources)&&lock.sources.length===1&&lock.sources[0].id===NAMING_EDITORIAL_V5_SOURCE_ID,'独立来源身份不一致');
 const source=lock.sources[0],actual:Record<string,string>={},bytes=new Map<string,Buffer>();
 requireFact(Array.isArray(source.files)&&object(source.fileHashes)&&sameKeys(source.fileHashes,source.files)&&equal(source.files,[...source.files].sort())&&new Set(source.files).size===source.files.length,'固定原件清单不完整或重复');
 for(const file of source.files){
  requireFact(typeof file==='string'&&file.startsWith('data/')&&!file.includes('\\')&&!file.split('/').some((part:string)=>!part||part==='.'||part==='..'),'来源路径无效');
  const content=load(file.slice(5));bytes.set(file,content);actual[file]=digest(content);requireFact(actual[file]===source.fileHashes[file],'来源原件摘要不一致：'+file);
 }
 requireFact(digest(JSON.stringify(actual))===source.sha256&&equal(lock,publication),'来源汇总摘要或出版元信息不符');
 for(const [file,expected]of Object.entries(V5_INPUT_HASHES))requireFact(actual[file]===expected,'旧基件或人工审阅证据身份不符：'+file);
 requireFact(actual[table.newDataset.file]===table.newDataset.sha256&&actual[table.newDataset.sqliteFile]===table.newDataset.sqliteSha256,'新知识包实际摘要不符');
 const parsed=(file:string)=>JSON.parse(bytes.get(file)!.toString('utf8'));
 validateNamingEditorialV5Table(table,{baseDataset:parsed('data/dataset.json'),nextDataset:parsed('data/dataset-v5.json'),base4:parsed('data/naming-editorial-v4.json'),review:parsed('data/raw/naming-editorial-v5-name-review.json'),corrections:parsed('data/raw/naming-editorial-v5-character-overrides.json'),rawMoe:loadFixedMoeRows(bytes.get('data/raw/moe-revised.json.gz')!),rawPoems:parsed('data/raw/shijing.json')});
 return {table:frozen(table),sources:[normalize(source)]};
}
export function loadNamingEditorialV5Sources(directory:string):SourceRecord[]{return loadNamingEditorialV5Data(directory).sources;}

const property=(value:object,key:string):unknown=>{const descriptor=Object.getOwnPropertyDescriptor(value,key);if(descriptor&&!Object.hasOwn(descriptor,'value'))throw new Error('命名出处5.0字段不得是访问器。');return descriptor?.value;};
export function verifyNamingEditorialV5Provenance(session:NamingSession,sources:SourceRecord[]=publication.sources.map(normalize)):void{
 const value=session as NamingSession&{namingRules?:unknown};requireFact(object(value),'方案对象无效');
 const descriptor=Object.getOwnPropertyDescriptor(value,'namingRules');
 if(descriptor&&(!Object.hasOwn(descriptor,'value')||descriptor.value===undefined))throw new Error('命名规则标记必须是明确的保存值，不得为空字段或访问器。');
 const snapshot=property(value,'sourceSnapshot'),allSources=object(snapshot)?property(snapshot,'sources'):undefined;
 const sourceRows=Array.isArray(allSources)?allSources:[];
 const recorded=sourceRows.filter(source=>object(source)&&property(source,'id')===NAMING_EDITORIAL_V5_SOURCE_ID);
 const marker=descriptor?.value;
 if(!descriptor){if(recorded.length)throw new Error('旧方案不得混入命名出处5.0专用来源。');return;}
 if(!object(marker)||!sameKeys(marker,['version','dataVersion','sourceId'])||typeof property(marker,'dataVersion')!=='string'||property(marker,'dataVersion')!==property(value,'dataVersion'))throw new Error('命名出处版本或字库标记不一致。');
 if(property(marker,'version')==='naming-editorial-4.0.0'&&property(marker,'sourceId')==='naming-editorial-readings-v4-fixed'){if(recorded.length)throw new Error('4.0方案不得混入5.0专用来源。');return;}
 if(property(marker,'version')!==NAMING_EDITORIAL_V5_VERSION||property(marker,'sourceId')!==NAMING_EDITORIAL_V5_SOURCE_ID)throw new Error('命名出处5.0方法或来源标记不符。');
 if(sourceRows.some(source=>object(source)&&property(source,'id')==='naming-editorial-readings-v4-fixed'))throw new Error('5.0方案不能同时宣称采用4.0专用来源。');
 const expected=sources.filter(source=>source.id===NAMING_EDITORIAL_V5_SOURCE_ID);
 if(expected.length!==1||recorded.length!==1||!equal(recorded[0],expected[0])||!equal(expected[0],normalize(publication.sources[0])))throw new Error('命名出处5.0的固定来源缺失、重复或元信息不一致。');
}
