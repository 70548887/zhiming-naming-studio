import {readFileSync} from 'node:fs';import {join} from 'node:path';import {createHash} from 'node:crypto';import {isDeepStrictEqual as equal} from 'node:util';
import expectedTable from '../../data/naming-editorial-v4.json';
import publication from '../../data/naming-editorial-readings-source-lock.json';
import type {NamingSession,SourceRecord} from '../shared/types';

export const NAMING_EDITORIAL_V4_SOURCE_ID='naming-editorial-readings-v4-fixed';
export const NAMING_EDITORIAL_V4_VERSION='naming-editorial-4.0.0';
const TABLE_SHA='d24898eb63438d7b24262668eb3b36770f211fade015b28eeb361700a58ca6ce',BASELINE_SHA='3cb4dde1150ef79076e9ea230272db532d08737fb4fb2e61b95bb707bc9f97fe',LEGACY_SHA='97c3162238c9493174544580a338fb0852d2784fbeac712fbd8e234f99945195',LOCK_SHA='33d1cac2da2ec2dc6705ecbaa160900f20e6c71ec10c52d065a0b631199f6d43';
const digest=(value:string|Uint8Array)=>createHash('sha256').update(value).digest('hex');
function requireFact(value:unknown,message:string):asserts value{if(!value)throw new Error('命名读音约束资料校验失败：'+message);}
const object=(value:unknown):value is Record<string,any>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const sameKeys=(value:object,keys:string[])=>equal(Object.keys(value).sort(),[...keys].sort());
const normalize=(source:any):SourceRecord=>{const {id,name,url,commit,license,files,sha256,note}=source;return {id,name,url,commit,license,files:[...files],sha256,note};};
function frozen<T>(value:T):T{if(value&&typeof value==='object'){for(const child of Object.values(value))frozen(child);Object.freeze(value);}return value;}
export type NamingEditorialV4Table=typeof expectedTable;

/** Independent inventories and exact old strings come from the immutable published1.0.30 capture, not from the new table. */
export function validateNamingEditorialV4Table(table:any,baseline:any,legacy:any):void{
 requireFact(object(table)&&table.version===NAMING_EDITORIAL_V4_VERSION&&object(baseline)&&baseline.version==='naming-editorial-defaults-baseline/1.0.0','版本不符');
 requireFact(baseline.anchor.releaseVersion==='1.0.30'&&baseline.anchor.asarSha256==='d06d98f0407b2f1220421165efea98d44767a07b457870279a7a0d719524a833'&&baseline.anchor.installerSha256==='a5adacf0e03b414668089332cd3ea9178ac2b3b440694ce46d432fc4ff1467df'&&baseline.anchor.editorialSha256===LEGACY_SHA,'发布基线身份不符');
 requireFact(equal(table.base,{version:'naming-editorial-3.0.0',sha256:LEGACY_SHA,sourceId:'editorial-rules'})&&legacy.version==='naming-editorial-3.0.0','原资料版本不符');
 requireFact(object(table.characterReadings)&&Object.keys(table.characterReadings).length===779&&equal(table.characterReadings,baseline.characterReadings),'779条原默认读音身份不一致');
 for(const [char,value]of Object.entries(baseline.characterReadings)as [string,any][]){requireFact([...char].length===1&&object(value)&&typeof value.pinyin==='string'&&value.pinyin.length>0&&Number.isInteger(value.tone)&&value.tone>=0&&value.tone<=5&&typeof value.sourceId==='string'&&typeof value.dictionaryWord==='string'&&value.dictionaryWord.length>0,'默认读音记录不完整');}
 const pending:string[]=[],bindings=(name:string)=>[...name].map(char=>{const value=baseline.characterReadings[char];if(!value&&!pending.includes(char))pending.push(char);return {char,...(value??{})};}),status=(name:string)=>[...name].every(char=>baseline.characterReadings[char])?'bound-default-reading':'pending-missing-character';
 requireFact(object(table.characters)&&sameKeys(table.characters,Object.keys(legacy.characters))&&Object.keys(table.characters).length===27,'27条原编辑释义清单不一致');
 for(const [char,original]of Object.entries(legacy.characters)as [string,any][]){const value=table.characters[char],{readings,status:state,...old}=value;requireFact(equal(old,original)&&equal(readings,bindings(char))&&state===status(char),'原编辑释义或适用读音变化：'+char);}
 requireFact(object(table.defaultSenseMap)&&sameKeys(table.defaultSenseMap,Object.keys(baseline.defaultSenseMap))&&Object.keys(table.defaultSenseMap).length===254,'原254条项目意象清单不一致');
 for(const [char,meaning]of Object.entries(baseline.defaultSenseMap))requireFact(equal(table.defaultSenseMap[char],{meaning,readings:bindings(char),status:status(char)}),'项目意象或读音不符：'+char);
 requireFact(object(table.combinations)&&sameKeys(table.combinations,Object.keys(legacy.combinations))&&Object.keys(table.combinations).length===31,'31条原组合清单不一致');
 for(const [name,meaning]of Object.entries(legacy.combinations))requireFact(equal(table.combinations[name],{meaning,readings:bindings(name),status:status(name)}),'组合原文或逐字读音不符：'+name);
 requireFact(Array.isArray(table.naturalPairs)&&table.naturalPairs.length===376&&Array.isArray(baseline.naturalPairs)&&new Set(baseline.naturalPairs).size===376,'自然表达清单不完整或重复');
 for(const [index,name]of baseline.naturalPairs.entries())requireFact(equal(table.naturalPairs[index],{name,readings:bindings(name),status:status(name),...(status(name)==='bound-default-reading'?{}:{missingCharacters:[...name].filter(char=>!baseline.characterReadings[char])})}),'自然表达逐字读音不符：'+name);
 requireFact(equal(table.citations,legacy.citations)&&table.citations.length===40&&table.citations.flatMap((row:any)=>row.names).length===44&&equal(table.variantGroups,legacy.variantGroups),'原40出处或异体关系被改写');
 requireFact(equal(table.projectTags,baseline.projectTags)&&table.projectTags.length===5&&new Set(table.projectTags).size===5,'原项目标签清单不一致');
 requireFact(equal(table.pending,pending.map(char=>({char,reason:'not-present-in-published130-dictionary'})))&&pending.length===39,'缺字不得补造默认读音或自动批准');
 requireFact(Array.isArray(baseline.dictionarySenseEvidence)&&baseline.dictionarySenseEvidence.length===12,'既有字典引句证据不完整');
 for(const evidence of baseline.dictionarySenseEvidence){const value=baseline.characterReadings[evidence.char],old=legacy.characters[evidence.char];requireFact(value&&old&&old.dictionarySense===evidence.quotedSense&&value.pinyin===evidence.pinyin&&value.tone===evidence.tone&&value.sourceId===evidence.sourceId&&value.dictionaryWord===evidence.dictionaryWord,'原字典引句与实际默认读音身份不符');}
}

export function loadNamingEditorialV4Data(directory:string):{table:NamingEditorialV4Table;sources:SourceRecord[]}{
 const load=(file:string)=>readFileSync(join(directory,file));const lockBytes=load('naming-editorial-readings-source-lock.json'),tableBytes=load('naming-editorial-v4.json'),baselineBytes=load('naming-editorial-v4-baseline.json'),legacyBytes=load('naming-editorial.json');
 requireFact(digest(lockBytes)===LOCK_SHA&&digest(tableBytes)===TABLE_SHA&&digest(baselineBytes)===BASELINE_SHA&&digest(legacyBytes)===LEGACY_SHA,'固定原件摘要不一致');const lock=JSON.parse(lockBytes.toString('utf8')),table=JSON.parse(tableBytes.toString('utf8')),baseline=JSON.parse(baselineBytes.toString('utf8')),legacy=JSON.parse(legacyBytes.toString('utf8'));
 requireFact(lock.version===NAMING_EDITORIAL_V4_VERSION&&Array.isArray(lock.sources)&&lock.sources.length===1&&lock.sources[0].id===NAMING_EDITORIAL_V4_SOURCE_ID,'独立来源身份不一致');
 const source=lock.sources[0],actual:Record<string,string>={};requireFact(Array.isArray(source.files)&&object(source.fileHashes)&&sameKeys(source.fileHashes,source.files)&&equal(source.files,[...source.files].sort()),'原件清单不完整');
 for(const file of source.files){requireFact(typeof file==='string'&&file.startsWith('data/')&&!file.includes('\\')&&!file.split('/').some((part:string)=>!part||part==='.'||part==='..'),'原件路径无效');actual[file]=digest(load(file.slice(5)));requireFact(actual[file]===source.fileHashes[file],'来源原件或说明摘要不符');}
 requireFact(digest(JSON.stringify(actual))===source.sha256,'来源汇总摘要不符');validateNamingEditorialV4Table(table,baseline,legacy);return {table:frozen(table),sources:[normalize(source)]};
}
export function loadNamingEditorialV4Sources(directory:string):SourceRecord[]{return loadNamingEditorialV4Data(directory).sources;}
export function verifyNamingEditorialV4Provenance(session:NamingSession,sources:SourceRecord[]=publication.sources.map(normalize)):void{
 const value=session as NamingSession&{namingRules?:unknown},descriptor=Object.getOwnPropertyDescriptor(value,'namingRules');
 if(descriptor&&(!Object.hasOwn(descriptor,'value')||descriptor.value===undefined))throw new Error('命名读音约束标记必须是明确的保存值，不得为空字段或访问器。');
 const recorded=value.sourceSnapshot?.sources.filter(source=>source.id===NAMING_EDITORIAL_V4_SOURCE_ID)??[],marker=descriptor?.value;
 if(!descriptor){if(recorded.length)throw new Error('未选择命名读音约束4.0的旧方案不得混入其来源。');return;}
 if(!object(marker)||!sameKeys(marker,['version','dataVersion','sourceId'])||marker.version!==NAMING_EDITORIAL_V4_VERSION||marker.sourceId!==NAMING_EDITORIAL_V4_SOURCE_ID||typeof marker.dataVersion!=='string'||marker.dataVersion!==session.dataVersion)throw new Error('命名读音约束方法、知识包版本或来源标记不一致。');
 const expected=sources.filter(source=>source.id===NAMING_EDITORIAL_V4_SOURCE_ID);if(expected.length!==1||recorded.length!==1||!equal(recorded[0],expected[0])||!equal(expected[0],normalize(publication.sources[0])))throw new Error('命名读音约束4.0的固定来源缺失、重复或元信息不一致。');
}
