import {digestSourceBytes} from './source-byte-digest.mjs';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual as equal} from 'node:util';
import expectedTable from '../../data/naming-editorial-v6.json';
import publication from '../../data/naming-editorial-dictionary-v6-source-lock.json';
import {validateNamingEditorialV6Inputs,V6_INPUT_HASHES} from '../../scripts/naming-editorial-v6-validation.mjs';
import {loadFixedMoeRows} from '../../scripts/fixed-moe-index.mjs';
import type {NamingSession,SourceRecord} from '../shared/types';

export const NAMING_EDITORIAL_V6_SOURCE_ID='naming-editorial-dictionary-v6-fixed';
export const NAMING_EDITORIAL_V6_VERSION='naming-editorial-6.0.0';
export const NAMING_EDITORIAL_V6_DATA_VERSION='2026.10.20.2';
const TABLE_SHA='35de5f749f438e849543e5fde6e405b89ba01cba20597e82e7c4f518dd4363ab',LOCK_SHA='06331d11a1c757a0245891fae357c7952db597d07c3c770d4052277c0bfac8da';
const digest=(value:string|Uint8Array)=>Buffer.isBuffer(value)?digestSourceBytes(value):createHash('sha256').update(value).digest('hex');
function requireFact(condition:unknown,message:string):asserts condition{if(!condition)throw new Error('命名字典6.0资料校验失败：'+message);}
const object=(value:unknown):value is Record<string,any>=>!!value&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
const sameKeys=(value:object,keys:string[])=>equal(Object.keys(value).sort(),[...keys].sort());
const normalize=(source:any):SourceRecord=>{const {id,name,url,commit,license,files,sha256,note}=source;return {id,name,url,commit,license,files:[...files],sha256,note};};
function frozen<T>(value:T):T{if(value&&typeof value==='object'){for(const child of Object.values(value))frozen(child);Object.freeze(value);}return value;}
export type NamingEditorialV6Table=typeof expectedTable;

export function validateNamingEditorialV6Table(table:any,inputs:{baseDataset:any;nextDataset:any;base5:any;base4:any;corrections:any;semanticReview:any;rawMoe:any[]}):void{
 requireFact(object(table)&&object(table.newDataset)&&table.newDataset.file==='data/dataset-v6.json'&&table.newDataset.sqliteFile==='data/knowledge-v6.sqlite'&&table.newDataset.version===NAMING_EDITORIAL_V6_DATA_VERSION&&/^[a-f0-9]{64}$/.test(table.newDataset.sha256)&&/^[a-f0-9]{64}$/.test(table.newDataset.sqliteSha256),'新知识包文件或完整摘要不符');
 validateNamingEditorialV6Inputs({table,...inputs});
}

export function loadNamingEditorialV6Data(directory:string):{table:NamingEditorialV6Table;sources:SourceRecord[]}{
 const load=(file:string)=>readFileSync(join(directory,file)),lockBytes=load('naming-editorial-dictionary-v6-source-lock.json'),tableBytes=load('naming-editorial-v6.json');
 requireFact(digest(lockBytes)===LOCK_SHA&&digest(tableBytes)===TABLE_SHA,'固定原件摘要不一致');
 const lock=JSON.parse(lockBytes.toString('utf8')),table=JSON.parse(tableBytes.toString('utf8'));
 requireFact(lock.version===NAMING_EDITORIAL_V6_VERSION&&Array.isArray(lock.sources)&&lock.sources.length===1&&lock.sources[0].id===NAMING_EDITORIAL_V6_SOURCE_ID,'独立来源身份不符');
 const source=lock.sources[0],actual:Record<string,string>={},bytes=new Map<string,Buffer>();
 requireFact(Array.isArray(source.files)&&object(source.fileHashes)&&sameKeys(source.fileHashes,source.files)&&equal(source.files,[...source.files].sort())&&new Set(source.files).size===source.files.length,'固定原件清单不完整或重复');
 for(const file of source.files){
  requireFact(typeof file==='string'&&file.startsWith('data/')&&!file.includes('\\')&&!file.split('/').some((part:string)=>!part||part==='.'||part==='..'),'来源路径无效');
  const content=load(file.slice(5));bytes.set(file,content);actual[file]=digest(content);requireFact(actual[file]===source.fileHashes[file],'来源原件摘要不一致：'+file);
 }
 requireFact(digest(JSON.stringify(actual))===source.sha256&&equal(lock,publication),'来源汇总摘要或出版元信息不符');
 for(const [file,expected]of Object.entries(V6_INPUT_HASHES))requireFact(actual[file]===expected,'已交付基件或逐用途审阅身份不符：'+file);
 requireFact(actual[table.newDataset.file]===table.newDataset.sha256&&actual[table.newDataset.sqliteFile]===table.newDataset.sqliteSha256,'新知识包实际摘要不符');
 const parsed=(file:string)=>JSON.parse(bytes.get(file)!.toString('utf8'));
 validateNamingEditorialV6Table(table,{baseDataset:parsed('data/dataset-v5.json'),nextDataset:parsed('data/dataset-v6.json'),base5:parsed('data/naming-editorial-v5.json'),base4:parsed('data/naming-editorial-v4.json'),corrections:parsed('data/raw/naming-editorial-v6-character-overrides.json'),semanticReview:parsed('data/raw/naming-editorial-v6-semantic-review.json'),rawMoe:loadFixedMoeRows(bytes.get('data/raw/moe-revised.json.gz')!)});
 return {table:frozen(table),sources:[normalize(source)]};
}
export function loadNamingEditorialV6Sources(directory:string):SourceRecord[]{return loadNamingEditorialV6Data(directory).sources;}

const property=(value:object,key:string):unknown=>{const descriptor=Object.getOwnPropertyDescriptor(value,key);if(descriptor&&!Object.hasOwn(descriptor,'value'))throw new Error('命名字典6.0字段不得是访问器。');return descriptor?.value;};
function requirePlainData(value:unknown):void{
 if(value===null||['string','number','boolean'].includes(typeof value))return;
 requireFact(Array.isArray(value)||object(value),'来源必须是纯JSON资料');
 for(const key of Reflect.ownKeys(value as object)){requireFact(typeof key==='string','来源不得包含符号字段');const descriptor=Object.getOwnPropertyDescriptor(value,key)!;requireFact(Object.hasOwn(descriptor,'value'),'来源字段不得是访问器');requirePlainData(descriptor.value);}
}
export function verifyNamingEditorialV6Provenance(session:NamingSession,sources:SourceRecord[]=publication.sources.map(normalize)):void{
 requireFact(object(session),'方案对象无效');
 const descriptor=Object.getOwnPropertyDescriptor(session,'namingRules');
 if(descriptor&&(!Object.hasOwn(descriptor,'value')||descriptor.value===undefined))throw new Error('命名规则标记必须是明确的保存值，不得为空字段或访问器。');
 const snapshot=property(session,'sourceSnapshot'),allSources=object(snapshot)?property(snapshot,'sources'):undefined,rows=Array.isArray(allSources)?allSources:[];
 const recorded=rows.filter(row=>object(row)&&property(row,'id')===NAMING_EDITORIAL_V6_SOURCE_ID);
 for(const row of recorded)requirePlainData(row);
 if(!descriptor){if(recorded.length)throw new Error('旧方案不得混入命名字典6.0专用来源。');return;}
 const marker=descriptor.value;requirePlainData(marker);
 if(!object(marker)||!sameKeys(marker,['version','dataVersion','sourceId'])||typeof property(marker,'dataVersion')!=='string'||!String(property(marker,'dataVersion')).trim()||property(marker,'dataVersion')!==property(session,'dataVersion'))throw new Error('命名字典版本或字库标记不一致。');
 const version=property(marker,'version'),sourceId=property(marker,'sourceId');
 if((version==='naming-editorial-4.0.0'&&sourceId==='naming-editorial-readings-v4-fixed')||(version==='naming-editorial-5.0.0'&&sourceId==='naming-editorial-names-v5-fixed')){if(recorded.length)throw new Error('4.0/5.0方案不得混入6.0专用来源。');return;}
 if(version!==NAMING_EDITORIAL_V6_VERSION||sourceId!==NAMING_EDITORIAL_V6_SOURCE_ID)throw new Error('命名字典6.0方法或来源标记不符。');
 if(rows.some(row=>object(row)&&['naming-editorial-readings-v4-fixed','naming-editorial-names-v5-fixed'].includes(String(property(row,'id')))))throw new Error('6.0方案不能同时宣称采用4.0/5.0专用来源。');
 const expected=sources.filter(row=>row.id===NAMING_EDITORIAL_V6_SOURCE_ID);
 for(const row of expected)requirePlainData(row);
 if(expected.length!==1||recorded.length!==1||!equal(recorded[0],expected[0])||!equal(expected[0],normalize(publication.sources[0])))throw new Error('命名字典6.0固定来源缺失、重复或元信息不一致。');
}
