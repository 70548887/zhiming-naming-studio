import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import initSqlJs, {type Database} from 'sql.js';
import {Store} from '../../src/main/store';
import {StudioService} from '../../src/main/service';
import {createCustomerDatabase} from '../../src/main/customer-database-connection';
import {encodeCustomerBackup} from '../../src/main/customer-backup-envelope';
import {readCustomerRevisionSequence} from '../../src/main/customer-revision-sequence';
import type {BirthProfile, NamingPreferences, NamingSession} from '../../src/shared/types';

export const flowRoot=path.resolve('.');
export const flowData=path.join(flowRoot,'data');
export const flowWasm=createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm');
export const syntheticKey='M781_SYNTHETIC_LOCALHOST_KEY';
const temporaryRoot=fs.realpathSync.native(os.tmpdir());
const prefix='naming-m781-reviewed-flow-';
const ownedDirectories=new Set<string>();
const openContexts=new Set<FlowContext>();

export interface FlowContext {directory:string;store:Store;service:StudioService;}
export type Mutable<T>=T extends object ? {-readonly [K in keyof T]:Mutable<T[K]>} : T;
export const clone=<T>(value:T):Mutable<T>=>structuredClone(value) as Mutable<T>;

export function flowProfile(id:string):BirthProfile {
  return {id:'m781-'+id,customerName:'M781虚构家庭',surname:'林',surnamePinyin:'lín',fatherName:'',motherName:'',gender:'中性',calendar:'solar',birthDate:'2026-10-17',leapMonth:false,birthTime:'09:30',timeUnknown:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'M781仅测试资料',timeBasis:'civil',renMethod:'none',monthAuthorityMethod:'no-fixed-day/1.0.0',seasonalMethod:'no-monthly/1.0.0'};
}

export function flowPreferences(name:string,overrides:Partial<NamingPreferences>={}):NamingPreferences {
  const characters=[...name];
  return {length:characters.length as 1|2,generationChar:characters[0],requiredChars:characters.slice(1).join(''),forbiddenChars:'',elderTaboo:'',style:'自然',meanings:'',industry:'',priority:'balanced',preferredElements:[],zodiacRules:false,numerology:false,avoidParentNames:true,yueReading:false,yueHomophones:'none',imageryReading:false,wordPronunciationReference:false,elementAssessment:false,...overrides};
}

export function ownedFlowDirectory(label:string):string {
  if(!/^[a-z0-9-]+$/.test(label))throw Error('Unknown M781 fixture directory label');
  const directory=fs.realpathSync.native(fs.mkdtempSync(path.join(temporaryRoot,prefix+label+'-')));
  ownedDirectories.add(directory);
  return directory;
}

function assertOwned(directory:string):void {
  if(!ownedDirectories.has(directory)||path.dirname(directory)!==temporaryRoot||!path.basename(directory).startsWith(prefix))throw Error('Unsafe M781 directory identity');
  const stat=fs.lstatSync(directory);
  if(!stat.isDirectory()||stat.isSymbolicLink()||fs.realpathSync.native(directory)!==directory)throw Error('Unsafe M781 directory boundary');
}

export async function openFlowStore(label:string,directory=ownedFlowDirectory(label)):Promise<FlowContext> {
  assertOwned(directory);
  const store=new Store(directory,flowData,flowWasm);
  try {
    await store.init();
    const service=new StudioService(store,{read:()=>syntheticKey,write:()=>{}},false);
    const context={directory,store,service};openContexts.add(context);return context;
  } catch(error) {
    try{store.db?.close();}catch{/* An init rejection can already have closed the native connection. */}
    throw error;
  }
}

export async function closeFlowStore(context:FlowContext):Promise<void> {
  if(!openContexts.delete(context))return;
  try{await context.service.closeCmnReadingWorker();}finally{context.store.db.close();}
}

export async function disposeFlowFixtures():Promise<void> {
  const errors:unknown[]=[];
  for(const context of [...openContexts])try{await closeFlowStore(context);}catch(error){errors.push(error);}
  for(const directory of [...ownedDirectories]) {
    try {assertOwned(directory);fs.rmSync(directory,{recursive:true,force:false});ownedDirectories.delete(directory);}
    catch(error){errors.push(error);}
  }
  if(errors.length)throw new AggregateError(errors,'M781 owned fixture cleanup failed');
}

export const customerFile=(context:FlowContext)=>path.join(context.directory,'customers.sqlite');
export const diskBytes=(context:FlowContext)=>fs.readFileSync(customerFile(context));
export const rawSession=(context:FlowContext,id:string):NamingSession=>JSON.parse(String(context.store.db.exec('SELECT json FROM sessions WHERE id=?',[id])[0].values[0][0]));

/** Rejected calls must leave both persisted bytes and the actual SQL CAS fields intact. */
export function captureWriteBoundary(context:FlowContext) {
  return {
    bytes:diskBytes(context),
    revisions:context.store.db.exec('SELECT id,session_id,created_at,json FROM revisions ORDER BY id')[0]?.values??[],
    cas:(context.store.db.exec('SELECT id,json FROM sessions ORDER BY id')[0]?.values??[]).map(([id,json])=>{
      const session=JSON.parse(String(json)) as NamingSession;
      return {id,reviewRevision:session.reviewRevision,reviewToken:session.reviewToken};
    }),
    profiles:(context.store.db.exec('SELECT id FROM profiles ORDER BY id')[0]?.values??[]).map(([id])=>({id,token:context.store.profileWriteToken(String(id))})),
  };
}

/** Only logical rows from the owned real Store are copied. No compact UDF or
 * validation guard is disabled, and the production archive bytes stay exact. */
export async function rawFlowDatabase(context:FlowContext,sessionIds?:readonly string[]):Promise<Database> {
  const SQL=await initSqlJs({locateFile:()=>flowWasm}),db=createCustomerDatabase(SQL);
  db.run('CREATE TABLE profiles(id TEXT PRIMARY KEY,json TEXT NOT NULL);CREATE TABLE sessions(id TEXT PRIMARY KEY,json TEXT NOT NULL);CREATE TABLE settings(id TEXT PRIMARY KEY,json TEXT NOT NULL);CREATE TABLE revisions(id INTEGER PRIMARY KEY AUTOINCREMENT,session_id TEXT,created_at TEXT,json TEXT);CREATE TABLE profile_versions(id TEXT PRIMARY KEY,token TEXT NOT NULL);CREATE TABLE knowledge_archives(sha256 TEXT PRIMARY KEY,version TEXT UNIQUE NOT NULL,pack BLOB NOT NULL)');
  const copies=[['profiles',['id','json']],['sessions',['id','json']],['settings',['id','json']],['revisions',['id','session_id','created_at','json']],['profile_versions',['id','token']],['knowledge_archives',['sha256','version','pack']]] as const;
  try {
    for(const [table,columns] of copies)for(const row of context.store.db.exec('SELECT '+columns.join(',')+' FROM '+table)[0]?.values??[]) {
      if(sessionIds&&(table==='sessions'&&!sessionIds.includes(String(row[0]))||table==='revisions'&&!sessionIds.includes(String(row[1]))))continue;
      db.run('INSERT INTO '+table+'('+columns.join(',')+') VALUES('+columns.map(()=>'?').join(',')+')',row);
    }
    const sequence=readCustomerRevisionSequence(context.store.db);
    db.run("DELETE FROM sqlite_sequence WHERE name='revisions'");
    db.run("INSERT INTO sqlite_sequence(name,seq) VALUES('revisions',?)",[sequence]);
    return db;
  } catch(error){db.close();throw error;}
}

export async function alteredFlowBackup(context:FlowContext,alter:(db:Database)=>void,sessionIds?:readonly string[]):Promise<Uint8Array> {
  const db=await rawFlowDatabase(context,sessionIds);
  try {alter(db);return encodeCustomerBackup(db.export());}finally{db.close();}
}

export function alterJsonRow(db:Database,table:'sessions'|'revisions',id:string,mutate:(session:Mutable<NamingSession>)=>void):void {
  const row=db.exec('SELECT json FROM '+table+' WHERE id=?',[id])[0]?.values[0];
  if(!row)throw Error('M781 corruption fixture row missing');
  const session=JSON.parse(String(row[0])) as Mutable<NamingSession>;mutate(session);
  db.run('UPDATE '+table+' SET json=? WHERE id=?',[JSON.stringify(session),id]);
}

const evidence:Array<{case:string;verified:Record<string,unknown>}> = [];
const timings:Array<{operation:string;status:'returned'|'threw';milliseconds:number}> = [];
export function flowEvidence(caseName:string,verified:Record<string,unknown>):void {evidence.push({case:caseName,verified});writeFlowEvidence();}
export async function flowTimed<T>(operation:string,run:()=>T|Promise<T>):Promise<T> {
  const start=performance.now();let status:'returned'|'threw'='threw';
  try {const result=await run();status='returned';return result;}
  finally {timings.push({operation,status,milliseconds:Math.round(performance.now()-start)});writeFlowEvidence();}
}
export function writeFlowEvidence():void {
  const directory=path.resolve('.local/m781-flow-tests');fs.mkdirSync(directory,{recursive:true});
  const target=path.join(directory,'actual-runtime.json'),temporary=target+'.tmp';
  const bytes=JSON.stringify({suite:'tests/reviewed-naming-data-flow.test.ts',generatedAt:new Date().toISOString(),recordedObservations:evidence.length,cases:evidence,timings,notes:['Test verdicts and timeout status come from the matching Vitest JSON report; observations alone do not mean a test passed.','Real Store, StudioService, NSBK and local HTTP only.','No claim about UI, Electron packaging or PDF export.']},null,2)+'\n';
  fs.writeFileSync(temporary,bytes,'utf8');fs.renameSync(temporary,target);
}
export const bytesSha256=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
