import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import initSqlJs from 'sql.js';
import { calculateBaziV1 } from '../src/domain/bazi-v1';
import{calculateQimenProfileV2}from'../src/domain/qimen-v2';
import { baziSnapshotStatus } from '../src/main/bazi-snapshot';
import { loadBaziSources } from '../src/main/bazi-data';
import { loadMonthAuthoritySources, MONTH_AUTHORITY_SOURCE_ID } from '../src/main/month-authority-data';
import { reportHTML } from '../src/main/report';
import { StudioService } from '../src/main/service';
import { Store, validSession } from '../src/main/store';
import { normalizePreferences } from '../src/shared/workflow';
import { validSessionSourceSnapshot } from '../src/shared/session-sources';
import type { BirthProfile, MonthAuthorityMethod, NamingSession, SourceRecord } from '../src/shared/types';

const wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm'),directories:string[]=[],stores:Store[]=[];
const profile:BirthProfile={id:'month-provenance-customer',customerName:'月令来源隔离验证',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'09:30',timeUnknown:false,leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:''};
const fixedSources=[...loadBaziSources(resolve('data')),...loadMonthAuthoritySources(resolve('data'))];
const fields:{name:string;edit:(source:SourceRecord)=>void}[]=[
 {name:'id',edit:source=>{source.id+='-forged';}},
 {name:'name',edit:source=>{source.name='伪装为同一规则的新名称';}},
 {name:'url',edit:source=>{source.url='https://example.test/forged-rule';}},
 {name:'commit',edit:source=>{source.commit='invented-revision';}},
 {name:'license',edit:source=>{source.license='invented-license';}},
 {name:'files',edit:source=>{source.files=['data/forged-rule.json'];}},
 {name:'sha256',edit:source=>{source.sha256='f'.repeat(64);}},
 {name:'note',edit:source=>{source.note='伪造来源解释';}},
];
async function open(){
 const directory=mkdtempSync(join(tmpdir(),'month-authority-provenance-'));directories.push(directory);
 const store=await new Store(directory,resolve('data'),wasm).init();stores.push(store);
 return {store,service:new StudioService(store,{read:()=>'',write:()=>{}},false)};
}
const current=(store:Store,id:string)=>store.rows<NamingSession>('sessions').find(item=>item.id===id)!;
afterEach(()=>{for(const store of stores.splice(0))store.db.close();for(const directory of directories.splice(0))rmSync(directory,{recursive:true,force:true});});

describe('monthly and factual fixed-source guards across backup and knowledge import',{ timeout: 15_000 }, ()=>{
 it.each(['no-fixed-day/1.0.0','sanming-first-paragraph/1.0.0'] satisfies MonthAuthorityMethod[])('rejects each changed field of all four fixed source records for %s',async(method)=>{
  const {store,service}=await open(),session=(await service.generate({...profile,monthAuthorityMethod:method},normalizePreferences({requiredChars:'安宁',zodiacRules:false}))).session;
  expect(session.analysis.bazi.evidence?.version).toBe('bazi-evidence-profile/1.7.0');expect(session.analysis.bazi.evidence?.sources.some(source=>source.id===MONTH_AUTHORITY_SOURCE_ID)).toBe(true);
  expect(validSession(session)).toBe(true);const originalEvidence=structuredClone(session.analysis.bazi.evidence),backup=store.backupBytes(),disk=readFileSync(join(store.userDir,'customers.sqlite'));
  const SQL=await initSqlJs({locateFile:()=>wasm});
  for(const fixed of fixedSources)for(const field of fields){
   const altered=structuredClone(session),source=altered.sourceSnapshot!.sources.find(source=>source.id===fixed.id)!;field.edit(source);
   expect(validSessionSourceSnapshot(altered.sourceSnapshot,altered.dataVersion)).toBe(true);
   expect(altered.analysis.bazi.evidence).toEqual(originalEvidence);
   if(field.name!=='id')expect(validSession(altered),`${fixed.id}/${field.name} must be structurally valid before provenance check`).toBe(true);
   const db=new SQL.Database(backup);let invalid:Uint8Array;
   try{db.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(altered),session.id]);invalid=db.export();}finally{db.close();}
   expect(()=>store.restore(invalid!),`${fixed.id}/${field.name}`).toThrow('备份字段不完整或结构不合法');
   expect(readFileSync(join(store.userDir,'customers.sqlite')).equals(disk)).toBe(true);expect(current(store,session.id).sourceSnapshot).toEqual(session.sourceSnapshot);
  }
 },20000);

 it('rejects a knowledge pack occupying the monthly fixed-source ID before replacing current knowledge or customers',async()=>{
  const {store,service}=await open();await service.generate(profile,normalizePreferences({zodiacRules:false}));
  const SQL=await initSqlJs({locateFile:()=>wasm}),db=new SQL.Database(),dataset=structuredClone(store.dataset);
  const existing=dataset.sources.find(source=>source.id==='shijing')!;existing.id=MONTH_AUTHORITY_SOURCE_ID;
  for(const citation of dataset.citations)if(citation.sourceId==='shijing')citation.sourceId=MONTH_AUTHORITY_SOURCE_ID;
  for(const knowledge of dataset.knowledge)if(knowledge.sourceId==='shijing')knowledge.sourceId=MONTH_AUTHORITY_SOURCE_ID;
  let pack:Uint8Array;
  try{
   for(const table of ['characters','citations','knowledge','sources'] as const){db.run(`CREATE TABLE ${table}(json TEXT NOT NULL)`);const insert=db.prepare(`INSERT INTO ${table}(json) VALUES (?)`);for(const value of dataset[table])insert.run([JSON.stringify(value)]);insert.free();}
   pack=db.export();
  }finally{db.close();}
  const beforeVersion=store.dataset.version,beforeCustomers=readFileSync(join(store.userDir,'customers.sqlite'));
  expect(()=>store.installPack(pack!)).toThrow('规则来源编号保留');expect(store.dataset.version).toBe(beforeVersion);expect(readFileSync(join(store.userDir,'customers.sqlite')).equals(beforeCustomers)).toBe(true);
  expect(service.bootstrap().sources.filter(source=>source.id===MONTH_AUTHORITY_SOURCE_ID)).toEqual(loadMonthAuthoritySources(resolve('data')));
 });

 it('preserves the frozen1.1 analysis and its original three-source manifest when a new app has the fourth source',async()=>{
  const {store,service}=await open(),created=(await service.generate(profile,normalizePreferences({requiredChars:'安宁',zodiacRules:false}))).session;
  const legacy=structuredClone(created);legacy.id+='-frozen-1.1';delete legacy.profile.monthAuthorityMethod;
  legacy.analysis.bazi=calculateBaziV1(legacy.profile);legacy.analysis.qimen=calculateQimenProfileV2(legacy.profile);legacy.originalFavorable=[...legacy.analysis.bazi.favorable];
  legacy.sourceSnapshot!.sources=legacy.sourceSnapshot!.sources.filter(source=>source.id!==MONTH_AUTHORITY_SOURCE_ID);
  expect(legacy.analysis.bazi.evidence?.version).toBe('bazi-evidence-profile/1.0.0');expect(baziSnapshotStatus(legacy.analysis.bazi,legacy.profile)).toBe('verified-legacy');expect(validSession(legacy)).toBe(true);
  const saved=store.saveSession(legacy),manifest=structuredClone(saved.sourceSnapshot),bazi=structuredClone(saved.analysis.bazi),html=reportHTML(saved,service.bootstrap().settings);
  expect(saved.sourceSnapshot!.sources.filter(source=>source.id.startsWith('bazi-evidence-'))).toHaveLength(3);expect(saved.sourceSnapshot!.sources.some(source=>source.id===MONTH_AUTHORITY_SOURCE_ID)).toBe(false);
  expect(service.bootstrap().sources.some(source=>source.id===MONTH_AUTHORITY_SOURCE_ID)).toBe(true);
  const reviewed=service.saveSession({...saved,reviewNote:'旧方案保持原资料'});expect(reviewed.sourceSnapshot).toEqual(manifest);
  const history=service.listHistory(saved.id),restoredHistory=service.restoreHistory(saved.id,history[0].id,reviewed.reviewRevision,reviewed.reviewToken);
  expect(restoredHistory.sourceSnapshot).toEqual(manifest);expect(restoredHistory.analysis.bazi).toEqual(bazi);
  store.restore(store.backupBytes());const restored=current(store,saved.id);
  expect(restored.sourceSnapshot).toEqual(manifest);expect(restored.analysis.bazi).toEqual(bazi);expect(reportHTML(restored,service.bootstrap().settings)).toBe(html);
  expect(restored.sourceSnapshot!.sources.some(source=>source.id===MONTH_AUTHORITY_SOURCE_ID)).toBe(false);expect(service.bootstrap().sources.some(source=>source.id===MONTH_AUTHORITY_SOURCE_ID)).toBe(true);
 });
});
