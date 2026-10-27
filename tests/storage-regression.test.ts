import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import initSqlJs from 'sql.js';
import { assertCompactCustomerSchema, bindCompactCustomerDatabase } from '../src/main/compact-customer-store';
import { decodeCustomerBackup, encodeCustomerBackup } from '../src/main/customer-backup-envelope';
import { encodeSnapshot } from '../src/main/snapshot-blob-codec';
import { Store, defaults } from '../src/main/store';
import { StudioService } from '../src/main/service';
import { createSessionSourceSnapshot } from '../src/shared/session-sources';
import {OFFICIAL_NAME_POPULARITY_SOURCE_ID} from '../src/shared/official-name-popularity';
import {ALL_NAMING_RULE_SOURCE_IDS,NAMING_RULE_V6_VERSION,NAMING_RULE_V6_SOURCE_ID} from '../src/shared/naming-rules';
import { analyzeProfile } from '../src/domain/engine';
import { generateLocal as generateLocalV6 } from '../src/domain/naming-v6';
import type { BirthProfile, NamingPreferences, NamingSession } from '../src/shared/types';

const dirs:string[]=[],stores:Store[]=[];
const wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm');
const p:BirthProfile={id:'p1',customerName:'测试',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2026-10-17',leapMonth:false,birthTime:'09:30',timeUnknown:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:''};
const pref:NamingPreferences={length:2,generationChar:'',requiredChars:'',forbiddenChars:'',elderTaboo:'',style:'清朗自然',meanings:'平安',industry:'',priority:'balanced',preferredElements:[],zodiacRules:false,numerology:false};
async function open(dir?:string){if(!dir){dir=mkdtempSync(join(tmpdir(),'naming-storage-'));dirs.push(dir);}const store=await new Store(dir,resolve('data'),wasm).init();stores.push(store);return store;}
function tamperBackup(SQL:Awaited<ReturnType<typeof initSqlJs>>,bytes:Uint8Array,mutate:(db:import('sql.js').Database)=>void){
  const decoded=decodeCustomerBackup(bytes);expect(decoded.format).toBe('compact-sqlite');const db=new SQL.Database(decoded.sqlite);bindCompactCustomerDatabase(db);
  try{mutate(db);assertCompactCustomerSchema(db);const sqlite=db.export(),archive=encodeCustomerBackup(sqlite);expect(Buffer.from(decodeCustomerBackup(archive).sqlite)).toEqual(Buffer.from(sqlite));return archive;}finally{db.close();}
}
// Inject damaged rows into a disposable backup, then restore the exact production schema and FK setting before validation.
function tamperRevision(db:import('sql.js').Database,column:'json'|'session_id',value:string){
  const id=db.exec('SELECT id FROM revision_records LIMIT 1')[0].values[0][0],trigger=String(db.exec("SELECT sql FROM sqlite_master WHERE name='revision_records_identity_update'")[0].values[0][0]);
  db.run('PRAGMA foreign_keys=OFF');db.run('DROP TRIGGER revision_records_identity_update');
  try{
    if(column==='json'){const {root,blobs}=encodeSnapshot(value);for(const blob of blobs)db.run('INSERT OR IGNORE INTO snapshot_blobs VALUES(?,?,?,?)',[blob.sha,blob.rawBytes,blob.codec,blob.payload]);db.run('INSERT OR IGNORE INTO snapshot_roots VALUES(?,?,?,?,?,?)',[root.sha,root.rawBytes,root.manifestBytes,root.manifestSha,root.codec,root.payload]);db.run('UPDATE revision_records SET snapshot_sha=? WHERE id=?',[root.sha,id]);}
    else db.run('UPDATE revision_records SET session_id=? WHERE id=?',[value,id]);
  }finally{db.run(trigger);db.run('PRAGMA foreign_keys=ON');}
  expect(db.exec('PRAGMA foreign_keys')[0].values[0][0]).toBe(1);assertCompactCustomerSchema(db);expect(db.exec(`SELECT ${column} FROM revisions WHERE id=?`,[id])[0].values[0][0]).toBe(value);
}
// Storage behavior uses an explicit frozen6 sample; current7 generation is exercised via StudioService elsewhere.
function sample(store:Store):NamingSession{const analysis=analyzeProfile(p),sources=new StudioService(store,{read:()=>'',write:()=>{}},false).bootstrap().sources.filter(source=>(!(ALL_NAMING_RULE_SOURCE_IDS as readonly string[]).includes(source.id)||source.id===NAMING_RULE_V6_SOURCE_ID)&&![OFFICIAL_NAME_POPULARITY_SOURCE_ID,'bazi-ditian-ren-2600158','bazi-ditian-ren-necessary-2600158','project-name-imagery-outer-palaces-v1','name-imagery-arc-palace-elements','rime-cantonese-jyutping','bazi-ditian-ren-actions-2600158','bazi-ditian-ren-capacities-2600158','bazi-ditian-ren-directions-2600158','bazi-ditian-ren-joint-battle-2600158','yue-homophones-wiktionary-fixed','yue-homophones-rime-fixed','yue-homophones-wiktionary-extended-fixed','yue-homophones-rime-extended-fixed'].includes(source.id));expect(sources.filter(source=>source.id===NAMING_RULE_V6_SOURCE_ID)).toHaveLength(1);return {id:'s1',profileId:p.id,createdAt:new Date().toISOString(),profile:p,preferences:pref,analysis,candidates:generateLocalV6(p,pref,analysis,store.dataset.characters,store.dataset.citations,13).candidates,reviewNote:'',originalFavorable:[...analysis.bazi.favorable],dataVersion:store.dataset.version,namingRules:{version:NAMING_RULE_V6_VERSION,dataVersion:store.dataset.version,sourceId:NAMING_RULE_V6_SOURCE_ID},sourceSnapshot:createSessionSourceSnapshot(store.dataset.version,sources)};}
afterEach(()=>{for(const s of stores.splice(0)){try{s.db.close();}catch{}}for(const dir of dirs.splice(0))rmSync(dir,{recursive:true,force:true});});
describe('customer storage concurrency and validated restoration', { timeout: 15_000 },()=>{
  it('a second reader does not rewrite bytes; a stale writer cannot erase the first writer',async()=>{
    const a=await open(),before=readFileSync(join(a.userDir,'customers.sqlite'));const b=await open(a.userDir);
    expect(readFileSync(join(a.userDir,'customers.sqlite')).equals(before)).toBe(true);
    a.saveProfile(p);expect(()=>b.saveProfile({...p,id:'p2'})).toThrow('另一个窗口或进程更新');expect(b.rows('profiles')).toEqual([]);
    const reopened=await open(a.userDir);expect(reopened.rows<BirthProfile>('profiles').map(x=>x.id)).toEqual(['p1']);
    expect(()=>b.flush()).toThrow('本次写入已取消');expect(()=>b.backupBytes()).toThrow('本次写入已取消');
  });
  it('refuses a live write lock and recovers one left by a dead process',async()=>{
    const s=await open(),lock=join(s.userDir,'customers.write-lock');writeFileSync(lock,String(process.pid));
    expect(()=>s.saveProfile(p)).toThrow('正在保存');expect(s.rows('profiles')).toEqual([]);
    writeFileSync(lock,'2147483647');s.saveProfile(p);expect(s.rows('profiles')).toHaveLength(1);
  });
  it('restores all revisions into a clean schema while keeping this machine AI endpoint and secret metadata',async()=>{
    const s=await open();s.saveProfile(p);let session=sample(s);s.saveSession(session);session=structuredClone(session);session.candidates[0].meaning='人工审阅';s.saveSession(session);
    s.put('settings','main',{...defaults,studioName:'备份品牌',apiBaseUrl:'https://remote-backup.example/v1',model:'backup',useAi:true,hasApiKey:false});const archive=s.backupBytes();
    s.put('settings','main',{...defaults,studioName:'本地品牌',apiBaseUrl:'https://local.example/v1',model:'local',timeoutMs:55000,useAi:false,hasApiKey:true});s.restore(archive);
    expect(s.settings()).toMatchObject({studioName:'备份品牌',apiBaseUrl:'https://local.example/v1',model:'local',timeoutMs:55000,useAi:false,hasApiKey:true});
    expect(s.listRevisions('s1')).toHaveLength(1);expect(s.listRevisions('s1')[0].session.candidates[0].meaning).not.toBe('人工审阅');
    s.saveProfile({...p,customerName:'恢复后仍可保存'});expect((await open(s.userDir)).rows<BirthProfile>('profiles')[0].customerName).toBe('恢复后仍可保存');
  });
  it('rejects a SQLite archive without primary keys, preserving current bytes and records',async()=>{
    const s=await open();s.saveProfile(p);const SQL=await initSqlJs({locateFile:()=>wasm}),bad=new SQL.Database();
    bad.run('CREATE TABLE profiles(id TEXT,json TEXT NOT NULL);CREATE TABLE sessions(id TEXT,json TEXT NOT NULL);CREATE TABLE settings(id TEXT,json TEXT NOT NULL)');bad.run('INSERT INTO profiles VALUES (?,?)',[p.id,JSON.stringify(p)]);
    const before=s.backupBytes();expect(()=>s.restore(bad.export())).toThrow('结构不合法');bad.close();expect(Buffer.from(s.backupBytes()).equals(Buffer.from(before))).toBe(true);expect(s.rows<BirthProfile>('profiles')[0].id).toBe(p.id);
  });
  it.each([
    {domain:'preferences.length',mutate:(x:any)=>{x.preferences.length=4;}},
    {domain:'preferences.preferredElements',mutate:(x:any)=>{x.preferences.preferredElements=['风'];}},
    {domain:'profile.namingPreferences',mutate:(x:any)=>{x.profile.namingPreferences={};}},
    {domain:'analysis.bazi.elements',mutate:(x:any)=>{x.analysis.bazi.elements.木='many';}},
    {domain:'analysis.bazi.pillars.hidden',mutate:(x:any)=>{x.analysis.bazi.pillars[0].hidden=3;}},
    {domain:'analysis.qimen.palaces.marks',mutate:(x:any)=>{x.analysis.qimen.palaces[0].marks=3;}},
    {domain:'candidates.characters.meaning',mutate:(x:any)=>{x.candidates[0].characters[0].meaning=null;}},
    {domain:'candidates.citations',mutate:(x:any)=>{x.candidates[0].citations=[{id:'fake'}];}},
    {domain:'candidates.evaluation.sound',mutate:(x:any)=>{x.candidates[0].evaluation.sound='excellent';}},
    {domain:'candidates.favorite',mutate:(x:any)=>{x.candidates[0].favorite='yes';}}
  ])('validates nested backup $domain rather than accepting shallow object shapes',async({mutate})=>{
    const s=await open();s.saveProfile(p);const original=sample(s);s.saveSession(original);const good=s.backupBytes();const SQL=await initSqlJs({locateFile:()=>wasm});
    const invalid=structuredClone(original);mutate(invalid);const archive=tamperBackup(SQL,good,db=>{db.run('UPDATE sessions SET json=?',[JSON.stringify(invalid)]);expect(JSON.parse(String(db.exec('SELECT json FROM sessions')[0].values[0][0]))).toEqual(invalid);});expect(()=>s.restore(archive)).toThrow('字段不完整');expect(Buffer.from(s.backupBytes()).equals(Buffer.from(good))).toBe(true);
  });
  it('rejects invalid and orphaned revision snapshots instead of dropping or importing them',async()=>{
    const s=await open();s.saveProfile(p);const original=sample(s);s.saveSession(original);s.saveSession({...original,reviewNote:'v2'});const good=s.backupBytes();const SQL=await initSqlJs({locateFile:()=>wasm});
    for(const [column,value] of [['json','{}'],['session_id','another-customer']] as const){const archive=tamperBackup(SQL,good,db=>tamperRevision(db,column,value));expect(()=>s.restore(archive)).toThrow('字段不完整');expect(Buffer.from(s.backupBytes()).equals(Buffer.from(good))).toBe(true);}
  });
});
