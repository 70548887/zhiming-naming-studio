import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {copyFileSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import initSqlJs from 'sql.js';
import {Store,validSession} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {createSessionSourceSnapshot} from '../src/shared/session-sources';
import {lookupOfficialGivenName,OFFICIAL_NAME_POPULARITY_SOURCE_ID} from '../src/shared/official-name-popularity';
import type {BirthProfile,NamingPreferences,NamingSession} from '../src/shared/types';

const data=resolve('data'),wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm'),fixture=resolve('tests/fixtures/naming-session-1.0.32.sqlite'),directories:string[]=[],stores:Store[]=[];
let directory:string,store:Store,service:StudioService;
async function open(legacy=false){const dir=mkdtempSync(join(tmpdir(),'official-popularity-store-'));directories.push(dir);if(legacy)copyFileSync(fixture,join(dir,'customers.sqlite'));const store=await new Store(dir,data,wasm).init();stores.push(store);return {dir,store,service:new StudioService(store,{read:()=>'',write:()=>{}})};}
beforeAll(async()=>{const opened=await open(true);directory=opened.dir;store=opened.store;service=opened.service;},15000);
afterAll(()=>{for(const store of stores)try{store.db.close();}catch{}for(const dir of directories)rmSync(dir,{recursive:true,force:true});});

describe('historical popularity is independent of saved customers, scores and mutable knowledge packs',{ timeout: 15_000 }, ()=>{
 it('registers the source only in current bootstrap and returns detached read-only catalog values',()=>{
  const boot=service.bootstrap();expect(boot.sources.filter(source=>source.id===OFFICIAL_NAME_POPULARITY_SOURCE_ID)).toHaveLength(1);expect(boot).not.toHaveProperty('officialNamePopularity');
  expect(boot.sessions).toHaveLength(7);expect(boot.sessions.every(session=>session.sourceSnapshot?.sources.every(source=>source.id!==OFFICIAL_NAME_POPULARITY_SOURCE_ID))).toBe(true);
  const first=service.getOfficialNamePopularity();first.tables[0].rows[0].reportedPeople=0;first.source.name='changed';expect(service.getOfficialNamePopularity().tables[0].rows[0].reportedPeople).toBe(22958);expect(service.getOfficialNamePopularity().source.name).not.toBe('changed');
  expect(()=>service.getOfficialNamePopularity({})).toThrow('不接受查询参数');
 });
 it('keeps actual delivered1.0.32 current/history JSON, scores, source snapshots and disk bytes unchanged through lookups',()=>{
  const file=join(directory,'customers.sqlite'),before=readFileSync(file),sessions=store.rows<NamingSession>('sessions'),histories=sessions.flatMap(session=>service.listHistory(session.id)),saved=JSON.stringify({sessions,histories}),backup=store.backupBytes();expect(histories).toHaveLength(4);
  const catalog=service.getOfficialNamePopularity();for(const givenName of ['沐宸','沐辰','若汐','知远','王沐宸'])lookupOfficialGivenName(catalog,{datasetId:catalog.datasetId,dataVersion:catalog.dataVersion,givenName});
  expect(readFileSync(file).equals(before)).toBe(true);expect(Buffer.from(store.backupBytes()).equals(Buffer.from(backup))).toBe(true);expect(JSON.stringify({sessions:store.rows<NamingSession>('sessions'),histories:sessions.flatMap(session=>service.listHistory(session.id))})).toBe(saved);
 },15000);
 it('generates identical analysis/scores and source snapshots before and after reference lookups',async()=>{
  const {service:svc}=await open(),profile:BirthProfile={id:'official-isolation',customerName:'统计隔离测试',surname:'李',surnamePinyin:'lǐ',gender:'中性',calendar:'solar',birthDate:'2023-02-15',birthTime:'22:00',timeUnknown:false,leapMonth:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'',fatherName:'李知远',motherName:'陈安宁'},preferences:NamingPreferences={length:1,generationChar:'',requiredChars:'文',forbiddenChars:'',elderTaboo:'',style:'清朗自然',meanings:'平安',industry:'',priority:'balanced',preferredElements:[],zodiacRules:false,numerology:false,avoidParentNames:true};
  const first=(await svc.generate(profile,preferences)).session,catalog=svc.getOfficialNamePopularity();lookupOfficialGivenName(catalog,{datasetId:catalog.datasetId,dataVersion:catalog.dataVersion,givenName:'沐宸'});const second=(await svc.generate({...profile,id:'official-isolation-after-reference'},preferences)).session;
  expect(first.candidates.map(candidate=>candidate.fullName)).toEqual(['李文']);expect(second.analysis).toEqual(first.analysis);expect(second.candidates.map(candidate=>candidate.evaluation)).toEqual(first.candidates.map(candidate=>candidate.evaluation));expect(second.sourceSnapshot).toEqual(first.sourceSnapshot);expect(second.sourceSnapshot?.sources.some(source=>source.id===OFFICIAL_NAME_POPULARITY_SOURCE_ID)).toBe(false);
 },15000);
 it('rejects knowledge-pack impersonation while allowing ordinary pack changes without replacing the catalog',async()=>{
  const {dir,store:isolated,service:svc}=await open(),SQL=await initSqlJs({locateFile:()=>wasm}),bytes=readFileSync(resolve('data/knowledge-v5.sqlite')),before=readFileSync(join(dir,'customers.sqlite')),catalog=svc.getOfficialNamePopularity();
  const bad=new SQL.Database(new Uint8Array(bytes));try{const row=bad.exec('SELECT rowid,json FROM sources')[0].values[0],source=JSON.parse(String(row[1]));source.id=OFFICIAL_NAME_POPULARITY_SOURCE_ID;bad.run('UPDATE sources SET json=? WHERE rowid=?',[JSON.stringify(source),row[0]]);expect(()=>isolated.installPack(bad.export())).toThrow('编号保留');}finally{bad.close();}
  expect(readFileSync(join(dir,'customers.sqlite')).equals(before)).toBe(true);isolated.installPack(new Uint8Array(bytes));const afterInstall=readFileSync(join(dir,'customers.sqlite'));expect(svc.getOfficialNamePopularity()).toEqual(catalog);expect(readFileSync(join(dir,'customers.sqlite')).equals(afterInstall)).toBe(true);isolated.rollback();expect(svc.getOfficialNamePopularity()).toEqual(catalog);
 },15000);
 it('rejects a reference-source graft at save/restore boundaries without changing the original customer database',async()=>{
  const file=join(directory,'customers.sqlite'),before=readFileSync(file),session=structuredClone(store.rows<NamingSession>('sessions')[0]),source=service.getOfficialNamePopularity().source;
  session.sourceSnapshot=createSessionSourceSnapshot(session.dataVersion,[...session.sourceSnapshot!.sources,source]);expect(validSession(session)).toBe(false);expect(()=>service.saveSession(session)).toThrow();expect(readFileSync(file).equals(before)).toBe(true);
  const SQL=await initSqlJs({locateFile:()=>wasm}),bad=new SQL.Database(new Uint8Array(before));try{bad.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(session),session.id]);expect(()=>store.restore(bad.export())).toThrow();}finally{bad.close();}expect(readFileSync(file).equals(before)).toBe(true);
 });
 it('rejects a coherent current/history SQL graft on reading, preserving the poisoned disk bytes for recovery',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'official-popularity-store-'));directories.push(dir);const SQL=await initSqlJs({locateFile:()=>wasm}),db=new SQL.Database(new Uint8Array(readFileSync(fixture))),source=service.getOfficialNamePopularity().source;
  for(const table of ['sessions','revisions'])for(const row of db.exec('SELECT rowid,json FROM '+table)[0]?.values??[]){const session=JSON.parse(String(row[1]));session.sourceSnapshot=createSessionSourceSnapshot(session.dataVersion,[...session.sourceSnapshot.sources,source]);db.run('UPDATE '+table+' SET json=? WHERE rowid=?',[JSON.stringify(session),row[0]]);}
  const poisoned=db.export();db.close();const file=join(dir,'customers.sqlite');writeFileSync(file,poisoned);const loaded=await new Store(dir,data,wasm).init();stores.push(loaded);expect(()=>loaded.rows('sessions')).toThrow('仅供独立只读参考');const id=loaded.db.exec('SELECT id FROM sessions LIMIT 1')[0].values[0][0];expect(()=>loaded.listRevisions(String(id))).toThrow('仅供独立只读参考');expect(readFileSync(file).equals(Buffer.from(poisoned))).toBe(true);
 },15000);
});
