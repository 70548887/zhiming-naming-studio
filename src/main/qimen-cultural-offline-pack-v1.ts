import initSqlJs,{type SqlJsStatic} from 'sql.js';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {ownCulturalJson,culturalCanonicalJson} from '../domain/qimen-cultural-comparison-canonical';
import {parseSnapshotJsonStrict} from './snapshot-json-spans';
import {validSessionSourceRecord,validSessionSourceSnapshot} from '../shared/session-sources';
import {selectedMeaningBelongsToReading} from '../shared/character-reading';
import {selectedReferenceOnlyReading,validReadingReferenceMetadata} from '../shared/character-reading-reference';
import type {CharacterEntry,NamingSession,SourceRecord} from '../shared/types';
const bad=():never=>{throw Error('OFFLINE_INTEGRITY');};
const same=(a:unknown,b:unknown)=>culturalCanonicalJson(a)===culturalCanonicalJson(b);
/** build-data.mjs emits exactly this two-column grammar. Accept its ASCII
 * spacing/case only, not comments, defaults, CHECK, generated/virtual clauses,
 * quoted identifiers, extra constraints or executable archived expressions. */
function simpleTableDDL(table:string,value:unknown):boolean{
 if(typeof value!=='string'||!/^[\t\r\n\f\x20-\x7e]+$/.test(value))return false;
 const normalized=value.replace(/[ \t\r\n\f]+/g,' ').trim().replace(/ *([(),]) */g,'$1').toUpperCase();
 return normalized==='CREATE TABLE '+table.toUpperCase()+'(ID TEXT PRIMARY KEY,JSON TEXT NOT NULL)';
}
export interface CulturalOfflinePackV1 {characters:readonly CharacterEntry[];sources:readonly SourceRecord[];}
const installedWasmPath=createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm');
let preparedRuntime:SqlJsStatic|undefined;
let runtimePreparation:Promise<void>|undefined;
/** Prepare installed code exactly once, before any synchronous material read.
 * No material, external runtime or caller lookup callback enters this step. */
export async function prepareCulturalOfflinePackRuntimeV1():Promise<void>{
 if(arguments.length!==0)throw Error('OFFLINE_PACK_RUNTIME_INVALID');
 if(!runtimePreparation){
  runtimePreparation=Promise.resolve().then(()=>initSqlJs({locateFile:()=>installedWasmPath})).then(runtime=>{preparedRuntime=runtime;},()=>{throw Error('OFFLINE_PACK_RUNTIME_UNAVAILABLE');});
 }
 await runtimePreparation;
}
export function validOfflineCharacterV1(c:CharacterEntry):boolean{
 if(!c||typeof c!=='object'||!['char','pinyin','meaning','traditional','elementBasis','warning','sourceId'].every(k=>typeof c[k as keyof CharacterEntry]==='string')||[...c.char].length!==1||!c.pinyin.trim()||!c.meaning.trim()||!Number.isInteger(c.tone)||c.tone<0||c.tone>5||!Array.isArray(c.elements)||c.elements.some(e=>!['木','火','土','金','水'].includes(e))||!Array.isArray(c.tags)||c.tags.some(t=>typeof t!=='string')||(c.strokes!==null&&(!Number.isInteger(c.strokes)||c.strokes<=0)))return false;
 if(!c.readings?.length)return true;
 if(!Array.isArray(c.readings)||c.readings.some(r=>!r||!validReadingReferenceMetadata(r))||selectedReferenceOnlyReading(c))return false;
 return c.readings.some(r=>r.referenceOnly!==true&&r.pinyin===c.pinyin&&r.tone===c.tone&&r.sourceId===c.sourceId&&selectedMeaningBelongsToReading(c.meaning,r.meanings));
}
/** Authenticate the actual supplied SQLite archive as data. No archived SQL,
 * trigger, view, extension or code is executed. Only fixed read-only queries of
 * an exact simple-table schema are allowed. No current knowledge pack fallback.
 */
export function authenticateCulturalOfflinePackV1(pack:Uint8Array,session:NamingSession):CulturalOfflinePackV1{
 const SQL=preparedRuntime;if(!SQL)throw Error('OFFLINE_PACK_RUNTIME_NOT_PREPARED');
 const digest=createHash('sha256').update(pack).digest('hex');
 if(session.dataVersion!==digest.slice(0,12)||pack.byteLength>150*1024*1024||!validSessionSourceSnapshot(session.sourceSnapshot,session.dataVersion))return bad();
 const db=new SQL.Database(pack);
 try{
  // Inspect all inert schema text before integrity_check. A fixed simple TEXT
  // primary key produces one named autoindex; no sqlite_* blanket exclusion
  // may hide explicit/virtual/trigger objects or archived expressions.
  const schema=db.exec('SELECT type,name,tbl_name,sql FROM sqlite_master')[0]?.values??[];
  const tables=['characters','citations','knowledge','sources','metadata'];
  if(schema.length!==tables.length*2)return bad();
  const names=new Set<string>();
  for(const row of schema){
   const [type,name,table,sql]=row;
   if(typeof name!=='string'||typeof table!=='string'||!tables.includes(table)||names.has(name))return bad();names.add(name);
   if(type==='table'){
    if(name!==table||!simpleTableDDL(table,sql))return bad();
   }else if(type!=='index'||name!=='sqlite_autoindex_'+table+'_1'||sql!==null)return bad();
  }
  if(tables.some(table=>!names.has(table)||!names.has('sqlite_autoindex_'+table+'_1')))return bad();
  for(const table of tables){
   const columns=db.exec('PRAGMA table_xinfo('+table+')')[0]?.values??[];
   if(columns.length!==2||columns[0][1]!=='id'||String(columns[0][2]).toUpperCase()!=='TEXT'||Number(columns[0][5])!==1||Number(columns[0][6])!==0||columns[1][1]!=='json'||String(columns[1][2]).toUpperCase()!=='TEXT'||Number(columns[1][3])!==1||Number(columns[1][6])!==0)return bad();
  }
  if(db.exec('PRAGMA integrity_check')[0]?.values[0]?.[0]!=='ok')return bad();
  let logicalBytes=0;
  const read=<T>(table:string):T[]=>{
   const rows=db.exec('SELECT id,json FROM '+table)[0]?.values??[];if(rows.length>200000)return bad();const ids=new Set<string>();
   return rows.map(([id,raw])=>{if(typeof id!=='string'||!id||ids.has(id)||typeof raw!=='string')return bad();ids.add(id);logicalBytes+=Buffer.byteLength(raw,'utf8');if(logicalBytes>200*1024*1024)return bad();const parsed=ownCulturalJson<T>(parseSnapshotJsonStrict(raw));if(table!=='metadata'&&((parsed as {id?:string;char?:string}).id??(parsed as {char?:string}).char)!==id)return bad();return parsed;});
  };
  const characters=read<CharacterEntry>('characters'),sources=read<SourceRecord>('sources'),citations=read<{id:string;sourceId:string}>('citations'),knowledge=read<{id:string;sourceId:string}>('knowledge');read('metadata');
  if(characters.length<500||characters.some(c=>!validOfflineCharacterV1(c))||sources.length===0||sources.some(s=>!validSessionSourceRecord(s))||citations.length===0||knowledge.length===0)return bad();
  const sourceIds=new Set(sources.map(s=>s.id));if(sourceIds.size!==sources.length||characters.some(c=>!sourceIds.has(c.sourceId)||c.readings?.some(r=>!sourceIds.has(r.sourceId)))||[...citations,...knowledge].some(r=>!sourceIds.has(r.sourceId)))return bad();
  for(const source of sources){const recorded=session.sourceSnapshot!.sources.find(s=>s.id===source.id);if(!recorded||!same(source,recorded))return bad();}
  return Object.freeze({characters:Object.freeze(characters),sources:Object.freeze(sources)});
 }finally{db.close();}
}
export function bindCulturalOfflineCharacterV1(value:CharacterEntry,pack:CulturalOfflinePackV1):void{
 if(!validOfflineCharacterV1(value))return bad();const original=pack.characters.find(c=>c.char===value.char);if(!original)return bad();
 const immutable=(c:CharacterEntry)=>{const {pinyin,tone,meaning,...rest}=c;return rest;};
 if(!same(immutable(original),immutable(value)))return bad();
 if(same(original,value))return;
 // Legitimate saved alternative reading/meaning must be an original archive
 // reading; no new glyph/source/element/tag/reading definitions can be inserted.
 if(!original.readings?.some(r=>!r.referenceOnly&&r.pinyin===value.pinyin&&r.tone===value.tone&&r.sourceId===value.sourceId&&selectedMeaningBelongsToReading(value.meaning,r.meanings)))return bad();
}
