import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import initSqlJs from 'sql.js';
import { calculateBaziV2 } from '../src/domain/bazi-v2';
import{calculateQimenProfileV2}from'../src/domain/qimen-v2';
import { baziSnapshotStatus } from '../src/main/bazi-snapshot';
import { loadBaziSources } from '../src/main/bazi-data';
import { loadMonthAuthoritySources } from '../src/main/month-authority-data';
import { loadMonthlySeasonalSources, MONTHLY_SEASONAL_SOURCE_ID } from '../src/main/monthly-seasonal-data';
import { MONTHLY_SEASONAL_KNOWLEDGE_PREFIX } from '../src/main/monthly-seasonal-knowledge';
import { reportHTML } from '../src/main/report';
import { StudioService } from '../src/main/service';
import { Store, validSession } from '../src/main/store';
import { normalizePreferences } from '../src/shared/workflow';
import { validSessionSourceSnapshot } from '../src/shared/session-sources';
import type { BirthProfile, NamingSession, SeasonalMethod, SourceRecord } from '../src/shared/types';

const wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm'),directories:string[]=[],stores:Store[]=[];
const profile:BirthProfile={id:'seasonal-provenance-customer',customerName:'逐月来源隔离验证',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'09:30',timeUnknown:false,leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:''};
const oldSources=[...loadBaziSources(resolve('data')),...loadMonthAuthoritySources(resolve('data'))],newSource=loadMonthlySeasonalSources(resolve('data'))[0];
const fields:{name:string;edit:(source:SourceRecord)=>void}[]=[
 {name:'id',edit:source=>{source.id+='-forged';}},
 {name:'name',edit:source=>{source.name='伪造的同名规则来源';}},
 {name:'url',edit:source=>{source.url='https://example.test/forged-seasonal';}},
 {name:'commit',edit:source=>{source.commit='invented-revision';}},
 {name:'license',edit:source=>{source.license='invented-license';}},
 {name:'files',edit:source=>{source.files=['data/forged-seasonal.json'];}},
 {name:'sha256',edit:source=>{source.sha256='f'.repeat(64);}},
 {name:'note',edit:source=>{source.note='伪造的条件解释';}},
];
async function open(){const directory=mkdtempSync(join(tmpdir(),'monthly-seasonal-provenance-'));directories.push(directory);const store=await new Store(directory,resolve('data'),wasm).init();stores.push(store);return {store,service:new StudioService(store,{read:()=>'',write:()=>{}},false)};}
const current=(store:Store,id:string)=>store.rows<NamingSession>('sessions').find(item=>item.id===id)!;
async function alteredBackup(bytes:Uint8Array,session:NamingSession):Promise<Uint8Array>{const SQL=await initSqlJs({locateFile:()=>wasm}),db=new SQL.Database(bytes);try{db.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(session),session.id]);return db.export();}finally{db.close();}}
async function pack(store:Store,mutate:(data:Store['dataset'])=>void):Promise<Uint8Array>{
 const SQL=await initSqlJs({locateFile:()=>wasm}),db=new SQL.Database(),dataset=structuredClone(store.dataset);mutate(dataset);
 try{for(const table of ['characters','citations','knowledge','sources']as const){db.run(`CREATE TABLE ${table}(json TEXT NOT NULL)`);const insert=db.prepare(`INSERT INTO ${table}(json) VALUES (?)`);for(const value of dataset[table])insert.run([JSON.stringify(value)]);insert.free();}return db.export();}finally{db.close();}
}
afterEach(()=>{for(const store of stores.splice(0))store.db.close();for(const directory of directories.splice(0))rmSync(directory,{recursive:true,force:true});});

describe('monthly seasonal fixed-source boundary in real storage workflows',{ timeout: 15_000 }, ()=>{
 it.each(['no-monthly/1.0.0','qiongtong-2294674-initial/1.0.0'] satisfies SeasonalMethod[])('rejects all eight new-source fields in a backup for %s without changing customer bytes',async(method)=>{
  const {store,service}=await open(),session=(await service.generate({...profile,seasonalMethod:method},normalizePreferences({requiredChars:'安宁',zodiacRules:false}))).session;
  expect(session.analysis.bazi.evidence?.version).toBe('bazi-evidence-profile/1.7.0');expect(session.analysis.bazi.evidence?.sources.some(source=>source.id===MONTHLY_SEASONAL_SOURCE_ID)).toBe(true);
  const backup=store.backupBytes(),disk=readFileSync(join(store.userDir,'customers.sqlite')),evidence=structuredClone(session.analysis.bazi.evidence);
  for(const field of fields){
   const changed=structuredClone(session);field.edit(changed.sourceSnapshot!.sources.find(source=>source.id===newSource.id)!);
   expect(validSessionSourceSnapshot(changed.sourceSnapshot,changed.dataVersion)).toBe(true);expect(changed.analysis.bazi.evidence).toEqual(evidence);
   if(field.name!=='id')expect(validSession(changed),field.name).toBe(true);
   const invalid=await alteredBackup(backup,changed);expect(()=>store.restore(invalid),field.name).toThrow('备份字段不完整或结构不合法');expect(readFileSync(join(store.userDir,'customers.sqlite')).equals(disk)).toBe(true);
   expect(current(store,session.id).sourceSnapshot).toEqual(session.sourceSnapshot);
  }
 },20000);

 it('retains strict provenance for the previous four fixed sources under current evidence1.2',async()=>{
  const {store,service}=await open(),session=(await service.generate({...profile,seasonalMethod:'qiongtong-2294674-initial/1.0.0'},normalizePreferences({requiredChars:'安宁',zodiacRules:false}))).session;
  const backup=store.backupBytes(),disk=readFileSync(join(store.userDir,'customers.sqlite'));
  for(const fixed of oldSources){const changed=structuredClone(session);changed.sourceSnapshot!.sources.find(source=>source.id===fixed.id)!.commit='forged-original-rule';expect(validSession(changed)).toBe(true);const invalid=await alteredBackup(backup,changed);expect(()=>store.restore(invalid),fixed.id).toThrow('备份字段不完整或结构不合法');expect(readFileSync(join(store.userDir,'customers.sqlite')).equals(disk)).toBe(true);}
 },20000);

 it('rejects custom knowledge occupation of the source identity and fixed knowledge prefix',async()=>{
  const {store,service}=await open();await service.generate(profile,normalizePreferences({zodiacRules:false}));
  const installed=await pack(store,()=>{});store.installPack(installed);const customerBytes=readFileSync(join(store.userDir,'customers.sqlite')),knowledgeBytes=readFileSync(join(store.userDir,'knowledge.sqlite')),version=store.dataset.version;
  const occupiedSource=await pack(store,dataset=>{dataset.sources.push(structuredClone(newSource));});
  expect(()=>store.installPack(occupiedSource)).toThrow('规则来源编号保留');
  const occupiedKnowledge=await pack(store,dataset=>{dataset.knowledge[0].id=MONTHLY_SEASONAL_KNOWLEDGE_PREFIX+'甲寅';});
  expect(()=>store.installPack(occupiedKnowledge)).toThrow('逐月调候固定知识编号保留');
  expect(store.dataset.version).toBe(version);expect(readFileSync(join(store.userDir,'customers.sqlite')).equals(customerBytes)).toBe(true);expect(readFileSync(join(store.userDir,'knowledge.sqlite')).equals(knowledgeBytes)).toBe(true);
  expect(service.bootstrap().sources.filter(source=>source.id===MONTHLY_SEASONAL_SOURCE_ID)).toEqual([newSource]);
 },20000);

 it('preserves a frozen1.2 four-source record through review, history and backup while bootstrap has the new source',async()=>{
  const {store,service}=await open(),created=(await service.generate({...profile,monthAuthorityMethod:'sanming-first-paragraph/1.0.0'},normalizePreferences({requiredChars:'安宁',zodiacRules:false}))).session;
  const old=structuredClone(created);old.id+='-frozen-1.2';delete old.profile.seasonalMethod;old.analysis.bazi=calculateBaziV2(old.profile);old.analysis.qimen=calculateQimenProfileV2(old.profile);old.originalFavorable=[...old.analysis.bazi.favorable];old.sourceSnapshot!.sources=old.sourceSnapshot!.sources.filter(source=>source.id!==MONTHLY_SEASONAL_SOURCE_ID);
  expect(old.analysis.bazi.evidence?.version).toBe('bazi-evidence-profile/1.1.0');expect(baziSnapshotStatus(old.analysis.bazi,old.profile)).toBe('verified-legacy');expect(validSession(old)).toBe(true);
  const saved=store.saveSession(old),snapshot=structuredClone(saved.sourceSnapshot),bazi=structuredClone(saved.analysis.bazi),html=reportHTML(saved,service.bootstrap().settings);
  expect(oldSources.every(source=>snapshot!.sources.some(record=>record.id===source.id))).toBe(true);expect(snapshot!.sources.filter(source=>source.id.startsWith('bazi-evidence-')||source.id==='bazi-month-authority-sanming-v1')).toHaveLength(4);
  expect(snapshot!.sources.some(source=>source.id===MONTHLY_SEASONAL_SOURCE_ID)).toBe(false);expect(service.bootstrap().sources.some(source=>source.id===MONTHLY_SEASONAL_SOURCE_ID)).toBe(true);
  const reviewed=service.saveSession({...saved,reviewNote:'原版本继续审阅'});expect(reviewed.sourceSnapshot).toEqual(snapshot);const revisions=service.listHistory(saved.id);expect(revisions[0].session.sourceSnapshot).toEqual(snapshot);
  const historyRestored=service.restoreHistory(saved.id,revisions[0].id,reviewed.reviewRevision,reviewed.reviewToken);expect(historyRestored.sourceSnapshot).toEqual(snapshot);expect(historyRestored.analysis.bazi).toEqual(bazi);
  store.restore(store.backupBytes());const restored=current(store,saved.id);expect(restored.sourceSnapshot).toEqual(snapshot);expect(restored.analysis.bazi).toEqual(bazi);expect(reportHTML(restored,service.bootstrap().settings)).toBe(html);expect(restored.sourceSnapshot!.sources.some(source=>source.id===MONTHLY_SEASONAL_SOURCE_ID)).toBe(false);
 });
});
