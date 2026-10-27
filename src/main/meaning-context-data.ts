import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import compiledData from '../../data/meaning-context-next.json';
import compiledLock from '../../data/meaning-context-next-source-lock.json';
import compiledManifest from '../../data/meaning-context-next-manifest.json';
import currentData from '../../data/meaning-context-v1-1.json';
import currentLock from '../../data/meaning-context-v1-1-source-lock.json';
import currentManifest from '../../data/meaning-context-v1-1-manifest.json';
import {createMeaningContextLookup} from '../domain/meaning-context-next.mjs';
import type {MeaningContextPublication} from '../domain/meaning-context-next.mjs';
import type {SourceRecord} from '../shared/types';
import {assertMeaningContextJson} from '../shared/meaning-context-review';

export const MEANING_CONTEXT_PINS=Object.freeze({version:'meaning-context-review/1.0.0' as const,productionApproved:false as const,
 manifestSha256:'f5c7664b661229f39919f8b10afe482b3aab65836e1fcc6a674d86296e870371',
 dataSha256:'3dc77f55dca1516ae3cb4231a022a58aca1874189da6ea99c101c6931b7a1877',
 lockSha256:'cdc25bbb48fe24d84413e71ead37a07fe633ba8758c991c6b481924c7838eb72',
 aggregateSha256:'0bd01932fe21ee44fda65cdd766ae838e24b73b1bff2e86768be7a5dfcf8aa2b',
 packSha256:'1875aa49dcfaeca0f266a3be7578e4d4b2a9b2c9c1f59fd79699a3e26d5d6b8b',activeVersion:'1875aa49dcfa'});
export const meaningContextSha=(value:string|Uint8Array)=>createHash('sha256').update(value).digest('hex');
function fact(condition:unknown,message:string):asserts condition{if(!condition)throw new Error('完整词义参考资料校验失败：'+message);}
const source=compiledLock.sources[0];
export const MEANING_CONTEXT_SOURCE:SourceRecord=freeze({id:source.id,name:source.name,url:source.url,commit:source.commit,license:source.license,files:[...source.files],sha256:source.sha256,note:source.note});
function freeze<T>(value:T):T{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
/** Immutable fixed-version validator; report rendering authenticates saved data, never replaces it with a live lookup. */
export const FIXED_MEANING_CONTEXT=freeze(structuredClone(compiledData as unknown as MeaningContextPublication));

/** These legacy exports deliberately remain 1.0. Historical imports never rebind to current data. */
export const MEANING_CONTEXT_SOURCE_IDS=Object.freeze(['project-meaning-context-next-137','project-meaning-context-next-138-v1-1'] as const);
export const CURRENT_MEANING_CONTEXT_PINS=Object.freeze({...MEANING_CONTEXT_PINS,dataVersion:'meaning-context-data/1.1.0' as const,
 manifestSha256:'c5ac43e96b59beafaf54bce6a504ef9d97c0b59afd0687eaa7daa64ad9378ac9',dataSha256:'424e8b6ca9a920c8b707ac267db9609bee900a5389b3659256b4c71ad71b378d',
 lockSha256:'473b1fb377bfeeb07c3cea800450e2ec88532b1678c9c590dcad650d8e3dd964',aggregateSha256:'448a4a3132e0689ba5c0ffc114f439fbf0c6550e7c72a8d563080100be9aa6d2'});
export interface MeaningContextPins {version:'meaning-context-review/1.0.0';productionApproved:false;manifestSha256:string;dataSha256:string;lockSha256:string;aggregateSha256:string;packSha256:string;activeVersion:string;}
export interface MeaningContextDefinition {
 dataVersion:'meaning-context-data/1.0.0'|'meaning-context-data/1.1.0';
 publication:MeaningContextPublication;source:SourceRecord;pins:MeaningContextPins;
 lookup:ReturnType<typeof createMeaningContextLookup>;
}
const normalizedSource=(s:SourceRecord)=>freeze({id:s.id,name:s.name,url:s.url,commit:s.commit,license:s.license,files:[...s.files],sha256:s.sha256,note:s.note});
const legacy:MeaningContextDefinition=freeze({dataVersion:'meaning-context-data/1.0.0',publication:FIXED_MEANING_CONTEXT,source:MEANING_CONTEXT_SOURCE,pins:MEANING_CONTEXT_PINS,lookup:createMeaningContextLookup(FIXED_MEANING_CONTEXT)});
const currentPublication=freeze(structuredClone(currentData as unknown as MeaningContextPublication));
const current:MeaningContextDefinition=freeze({dataVersion:'meaning-context-data/1.1.0',publication:currentPublication,source:normalizedSource(currentLock.sources[0]),pins:CURRENT_MEANING_CONTEXT_PINS,lookup:createMeaningContextLookup(currentPublication)});
const definitions=Object.freeze([legacy,current]);
const sourceIdentity=(d:MeaningContextDefinition)=>({sourceId:d.source.id,sourceSha256:d.pins.aggregateSha256,dataSha256:d.pins.dataSha256,sourceLockSha256:d.pins.lockSha256,dataManifestSha256:d.pins.manifestSha256});
/** Exact allowlist; no runtime registration, fallback, or nearest-version matching. */
export function meaningContextDefinitionForSaved(identity:unknown):MeaningContextDefinition|undefined{
 assertMeaningContextJson(identity);return definitions.find(d=>isDeepStrictEqual(sourceIdentity(d),identity));
}
export interface MeaningContextData extends MeaningContextDefinition {versions:readonly MeaningContextDefinition[];}
const authenticated=new WeakSet<object>();
export function assertMeaningContextData(data:MeaningContextData):void{fact(authenticated.has(data),'资料未通过完整原件认证');}
export function loadMeaningContextData(directory:string,sourceId:typeof MEANING_CONTEXT_SOURCE_IDS[number]='project-meaning-context-next-138-v1-1'):MeaningContextData {
 const selected=definitions.find(d=>d.source.id===sourceId);fact(selected,'未知资料版本');
 const load=(name:string)=>readFileSync(join(directory,name));
 for(const definition of definitions){
  const isLegacy=definition===legacy,stem=isLegacy?'meaning-context-next':'meaning-context-v1-1',pins=definition.pins;
  const dataBytes=load(stem+'.json'),lockBytes=load(stem+'-source-lock.json'),manifestBytes=load(stem+'-manifest.json');
  fact(meaningContextSha(dataBytes)===pins.dataSha256&&meaningContextSha(lockBytes)===pins.lockSha256&&meaningContextSha(manifestBytes)===pins.manifestSha256,'数据、来源锁或审核manifest原件摘要不符：'+definition.dataVersion);
  const table=JSON.parse(dataBytes.toString('utf8')),lock=JSON.parse(lockBytes.toString('utf8')),manifest=JSON.parse(manifestBytes.toString('utf8'));
  assertMeaningContextJson(table);assertMeaningContextJson(lock);assertMeaningContextJson(manifest);
  fact(isDeepStrictEqual(table,isLegacy?compiledData:currentData)&&isDeepStrictEqual(lock,isLegacy?compiledLock:currentLock)&&isDeepStrictEqual(manifest,isLegacy?compiledManifest:currentManifest),'编译资料与对应固定版本不一致');
  const src=lock.sources?.[0],count=isLegacy?10:15;fact(lock.schema==='meaning-context-source-lock/1'&&lock.sources.length===1&&src.id===definition.source.id&&src.sha256===pins.aggregateSha256,'来源身份不符');
  fact(Array.isArray(src.files)&&src.files.length===count&&isDeepStrictEqual(src.files,[...src.files].sort())&&new Set(src.files).size===count&&isDeepStrictEqual(Object.keys(src.fileHashes).sort(),src.files),'来源原件清单不完整或重复');
  const hashes:Record<string,string>={};for(const path of src.files){fact(typeof path==='string'&&path.startsWith('data/')&&!path.includes('\\')&&!path.split('/').some((part:string)=>!part||part==='.'||part==='..'),'来源路径不合法');hashes[path]=meaningContextSha(load(path.slice(5)));fact(hashes[path]===src.fileHashes[path],'来源原件摘要不符：'+path);}
  fact(meaningContextSha(JSON.stringify(hashes))===pins.aggregateSha256,'来源汇总摘要不符');
  const publicationHashes:Record<string,string>={...hashes,['data/'+stem+'-source-lock.json']:meaningContextSha(lockBytes)};
  for(const entry of manifest.files.filter((row:{logicalTarget:string})=>row.logicalTarget.startsWith('data/'))){fact(publicationHashes[entry.logicalTarget]===entry.sha256,'manifest数据文件身份不符：'+entry.logicalTarget);}
  fact(table.schema==='conditional-meaning-context-increment/1'&&table.cases.length===(isLegacy?20:40)&&table.base.knowledgePackSha256===pins.packSha256&&table.base.activeVersion===pins.activeVersion,'整词覆盖或固定包身份不符');
 }
 const result=Object.freeze({...selected,versions:definitions});authenticated.add(result);return result;
}
