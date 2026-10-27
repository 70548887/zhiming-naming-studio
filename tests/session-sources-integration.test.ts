import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import initSqlJs from 'sql.js';
import { StudioService } from '../src/main/service';
import { Store, validSession } from '../src/main/store';
import { reportHTML } from '../src/main/report';
import{calculateBaziV3}from'../src/domain/bazi-v3';
import{calculateQimenProfileV2}from'../src/domain/qimen-v2';
import {OFFICIAL_NAME_POPULARITY_SOURCE_ID} from '../src/shared/official-name-popularity';
import {ALL_NAMING_RULE_SOURCE_IDS,NAMING_RULE_SOURCE_ID} from '../src/shared/naming-rules';
import { LEGACY_SESSION_SOURCES_NOTICE, sessionReferencedSourceIds, sessionSourceStatus, validSessionSources } from '../src/shared/session-sources';
import type { BirthProfile, NamingPreferences, NamingSession, SourceRecord } from '../src/shared/types';

const wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm');
const directories:string[]=[],stores:Store[]=[];
const readingOnlySourceIds=['classics-ditian-2600158-fixed','classics-qiongtong-2294674-fixed'];
const profile:BirthProfile={id:'historical-source-customer',customerName:'来源隔离回归',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'09:30',leapMonth:false,timeUnknown:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:''};
const preferences:NamingPreferences={length:2,generationChar:'',requiredChars:'和乐',forbiddenChars:'',elderTaboo:'',style:'诗经',meanings:'和悦喜乐',industry:'',priority:'classic',preferredElements:[],zodiacRules:false,numerology:true};

async function open(){
  const directory=mkdtempSync(join(tmpdir(),'naming-session-sources-'));directories.push(directory);
  const store=await new Store(directory,resolve('data'),wasm).init();stores.push(store);
  const service=new StudioService(store,{read:()=>'',write:()=>{}},false);
  return {store,service};
}

async function updatedKnowledgePack(store:Store,revision:number):Promise<Uint8Array>{
  const SQL=await initSqlJs({locateFile:()=>wasm}),db=new SQL.Database();
  try {
    const dataset=structuredClone(store.dataset),source=dataset.sources.find(record=>record.id==='shijing')!;
    source.url=`https://example.test/shijing-revision-${revision}`;source.commit=`custom-shijing-revision-${revision}`;source.sha256=String(revision).repeat(64);
    for(const table of ['characters','citations','knowledge','sources'] as const){
      db.run(`CREATE TABLE ${table}(json TEXT NOT NULL)`);
      const insert=db.prepare(`INSERT INTO ${table}(json) VALUES (?)`);
      for(const value of dataset[table]) insert.run([JSON.stringify(value)]);
      insert.free();
    }
    return db.export();
  } finally { db.close(); }
}

async function changedBackup(bytes:Uint8Array,sessionId:string,edit:(session:any)=>void,target:'current'|'revision'='current'):Promise<Uint8Array>{
  const SQL=await initSqlJs({locateFile:()=>wasm}),db=new SQL.Database(bytes);
  try {
    if(target==='current'){
      const row=db.exec('SELECT json FROM sessions WHERE id=?',[sessionId])[0]?.values[0];
      if(!row) throw new Error('Missing fixture session');
      const session=JSON.parse(String(row[0]));edit(session);db.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(session),sessionId]);
    }else{
      const row=db.exec('SELECT id,json FROM revisions WHERE session_id=? ORDER BY id DESC LIMIT 1',[sessionId])[0]?.values[0];
      if(!row) throw new Error('Missing fixture revision');
      const session=JSON.parse(String(row[1]));edit(session);db.run('UPDATE revisions SET json=? WHERE id=?',[JSON.stringify(session),Number(row[0])]);
    }
    return db.export();
  } finally { db.close(); }
}

const current=(store:Store,id:string)=>store.rows<NamingSession>('sessions').find(session=>session.id===id)!;
const registered=(session:NamingSession,id:string):SourceRecord=>session.sourceSnapshot!.sources.find(source=>source.id===id)!;

afterEach(()=>{
  for(const store of stores.splice(0)) store.db.close();
  for(const directory of directories.splice(0)) rmSync(directory,{recursive:true,force:true});
});

describe('A04 generation-time source provenance across application storage',{ timeout: 15_000 }, ()=>{
  it('captures the generation registry and resolves every embedded citation, character and rule source',async()=>{
    const {store,service}=await open(),session=(await service.generate(profile,preferences)).session;
    expect(session.candidates.some(candidate=>candidate.citations.some(citation=>citation.id==='shijing-161-3'))).toBe(true);
    expect(session.sourceSnapshot?.dataVersion).toBe(session.dataVersion);expect(validSession(session)).toBe(true);expect(validSessionSources(session)).toBe(true);
    const snapshotIds=new Set(session.sourceSnapshot!.sources.map(source=>source.id));
    expect(snapshotIds.size).toBe(session.sourceSnapshot!.sources.length);
    for(const id of sessionReferencedSourceIds(session)) expect(snapshotIds.has(id),id).toBe(true);
    const bootstrapSources=service.bootstrap().sources;
    expect(bootstrapSources.some(source=>source.id===OFFICIAL_NAME_POPULARITY_SOURCE_ID)).toBe(true);expect(snapshotIds.has(OFFICIAL_NAME_POPULARITY_SOURCE_ID)).toBe(false);
    expect(bootstrapSources.filter(source=>readingOnlySourceIds.includes(source.id))).toHaveLength(2);
    for(const id of readingOnlySourceIds){
      expect(bootstrapSources.find(source=>source.id===id),id).toMatchObject({id,license:'CC-BY-SA-4.0'});
      expect(snapshotIds.has(id),id+' is available for reading, not used by generation').toBe(false);
      expect(sessionReferencedSourceIds(session),id+' must not become a naming citation').not.toContain(id);
    }
    for(const source of service.bootstrap().sources){
      if([...readingOnlySourceIds,OFFICIAL_NAME_POPULARITY_SOURCE_ID,'solar-time-noaa-julian-century','bazi-ditian-ren-2600158','bazi-ditian-ren-necessary-2600158','project-name-imagery-outer-palaces-v1','name-imagery-arc-palace-elements','rime-cantonese-jyutping','bazi-ditian-ren-actions-2600158','bazi-ditian-ren-capacities-2600158','bazi-ditian-ren-directions-2600158','bazi-ditian-ren-joint-battle-2600158',...ALL_NAMING_RULE_SOURCE_IDS.filter(id=>id!==NAMING_RULE_SOURCE_ID),'yue-homophones-wiktionary-fixed','yue-homophones-rime-fixed','yue-homophones-wiktionary-extended-fixed','yue-homophones-rime-extended-fixed'].includes(source.id))continue;
      const saved=session.sourceSnapshot!.sources.find(record=>record.id===source.id);
      expect(saved,source.id).toBeDefined();expect(saved).toMatchObject({url:source.url,commit:source.commit,sha256:source.sha256,files:source.files});
    }
    expect(snapshotIds.has(NAMING_RULE_SOURCE_ID)).toBe(true);for(const id of ALL_NAMING_RULE_SOURCE_IDS.filter(id=>id!==NAMING_RULE_SOURCE_ID))expect(snapshotIds.has(id)).toBe(false);
    expect(snapshotIds.has('naming-editorial-names-v5-fixed')).toBe(false);
    expect(snapshotIds.has('naming-editorial-readings-v4-fixed')).toBe(false);
    expect(snapshotIds.has('bazi-ditian-ren-joint-battle-2600158')).toBe(false);
    expect(snapshotIds.has('solar-time-noaa-julian-century')).toBe(false);
    const selected=(await service.generate({...profile,id:'selected-solar-source',timeBasis:'apparent-solar',birthLongitude:121.47},preferences)).session;
    expect(selected.analysis.bazi.timeBasis?.sourceId).toBe('solar-time-noaa-julian-century');
    for(const id of readingOnlySourceIds)expect(selected.sourceSnapshot!.sources.some(source=>source.id===id),id+' remains outside the solar-time generation registry').toBe(false);
    for(const source of service.bootstrap().sources.filter(source=>![...readingOnlySourceIds,OFFICIAL_NAME_POPULARITY_SOURCE_ID,'bazi-ditian-ren-2600158','bazi-ditian-ren-necessary-2600158','project-name-imagery-outer-palaces-v1','name-imagery-arc-palace-elements','rime-cantonese-jyutping','bazi-ditian-ren-actions-2600158','bazi-ditian-ren-capacities-2600158','bazi-ditian-ren-directions-2600158','bazi-ditian-ren-joint-battle-2600158',...ALL_NAMING_RULE_SOURCE_IDS.filter(id=>id!==NAMING_RULE_SOURCE_ID),'yue-homophones-wiktionary-fixed','yue-homophones-rime-fixed','yue-homophones-wiktionary-extended-fixed','yue-homophones-rime-extended-fixed'].includes(source.id)))expect(selected.sourceSnapshot!.sources.find(record=>record.id===source.id),source.id).toMatchObject({url:source.url,commit:source.commit,sha256:source.sha256,files:source.files});
    const held=registered(session,'shijing');held.url='https://example.test/changed-client-copy';
    expect(registered(current(store,session.id),'shijing').url).not.toBe(held.url);
  });

  it('retains original source URLs, commits and hashes through two knowledge updates, backup and restore',async()=>{
    const {store,service}=await open(),session=(await service.generate(profile,preferences)).session;
    const original=structuredClone(session.sourceSnapshot),beforeReport=reportHTML(session,service.bootstrap().settings),beforeSource=registered(session,'shijing');
    for(const revision of [1,2]){
      const pack=await updatedKnowledgePack(store,revision);expect(store.readPack(pack).sources.find(source=>source.id==='shijing')?.commit).toBe(`custom-shijing-revision-${revision}`);
      store.installPack(pack);
      expect(service.bootstrap().sources.find(source=>source.id==='shijing')?.url).toBe(`https://example.test/shijing-revision-${revision}`);
      const historical=current(store,session.id);expect(historical.sourceSnapshot).toEqual(original);expect(historical.dataVersion).toBe(session.dataVersion);
      const html=reportHTML(historical,service.bootstrap().settings);expect(html).toBe(beforeReport);expect(html).toContain(beforeSource.url);expect(html).toContain(beforeSource.commit);expect(html).toContain(beforeSource.sha256);
      expect(html).not.toContain(`https://example.test/shijing-revision-${revision}`);
    }
    const backup=store.backupBytes();store.restore(backup);const restored=current(store,session.id);
    expect(restored.sourceSnapshot).toEqual(original);expect(reportHTML(restored,service.bootstrap().settings)).toBe(beforeReport);
    expect(service.bootstrap().sources.find(source=>source.id==='shijing')?.commit).toBe('custom-shijing-revision-2');
  });

  it('discards submitted manifest changes, preserves original sources in history and rejects direct store replacement',async()=>{
    const {store,service}=await open(),session=(await service.generate(profile,preferences)).session,manifest=structuredClone(session.sourceSnapshot);
    const submitted=structuredClone(session);registered(submitted,'shijing').url='https://example.test/forged-client';submitted.reviewNote='应保存的审阅';
    const saved=service.saveSession(submitted);expect(saved.reviewNote).toBe('应保存的审阅');expect(saved.sourceSnapshot).toEqual(manifest);
    const history=service.listHistory(session.id);expect(history).toHaveLength(1);expect(history[0].session.sourceSnapshot).toEqual(manifest);
    const restored=service.restoreHistory(session.id,history[0].id,saved.reviewRevision,saved.reviewToken);
    expect(restored.reviewNote).toBe('');expect(restored.sourceSnapshot).toEqual(manifest);
    const disk=readFileSync(join(store.userDir,'customers.sqlite'));
    for(const mutate of [(s:NamingSession)=>{registered(s,'shijing').commit='forged-direct';},(s:NamingSession)=>{delete s.sourceSnapshot;}]){
      const direct=structuredClone(current(store,session.id));mutate(direct);
      expect(()=>store.saveSession(direct)).toThrow('生成时来源快照');expect(readFileSync(join(store.userDir,'customers.sqlite')).equals(disk)).toBe(true);
    }
    expect(service.listHistory(session.id).every(revision=>JSON.stringify(revision.session.sourceSnapshot)===JSON.stringify(manifest))).toBe(true);
  });

  it('retains the same source manifest when confirming numerology with the current review version and token',async()=>{
    const {store,service}=await open(),session=(await service.generate(profile,preferences)).session,candidate=session.candidates[0];
    const numeric=candidate.numerology!;expect(numeric.strokes.every(stroke=>stroke.options.length>0)).toBe(true);
    const selections=Object.fromEntries(numeric.strokes.map(stroke=>[String(stroke.position),stroke.options[0].id]));
    const confirmed=service.updateNumerology(session.id,candidate.id,selections,session.reviewRevision,session.reviewToken);
    expect(confirmed.candidates.find(item=>item.id===candidate.id)?.numerology?.status).toBe('complete');expect(confirmed.sourceSnapshot).toEqual(session.sourceSnapshot);
    expect(validSessionSources(confirmed)).toBe(true);expect(current(store,session.id).sourceSnapshot).toEqual(session.sourceSnapshot);
  });

  it('rejects changed manifest versions, mismatched data versions and missing references in current or historical backup rows',async()=>{
    const {store,service}=await open(),session=(await service.generate(profile,preferences)).session;
    const reviewed=service.saveSession({...session,reviewNote:'为历史恢复准备一版'}),backup=store.backupBytes(),disk=readFileSync(join(store.userDir,'customers.sqlite'));
    const changes:((s:any)=>void)[]=[
      s=>{s.sourceSnapshot.version='session-sources/unknown';},
      s=>{s.sourceSnapshot.dataVersion='another-knowledge-pack';},
      s=>{s.sourceSnapshot.sources=s.sourceSnapshot.sources.filter((source:SourceRecord)=>source.id!=='shijing');},
      s=>{s.sourceSnapshot.sources[1].id=s.sourceSnapshot.sources[0].id;},
    ];
    for(const target of ['current','revision'] as const)for(const change of changes){
      const bad=await changedBackup(backup,session.id,change,target);
      expect(()=>store.restore(bad),target).toThrow('字段不完整或结构不合法');expect(readFileSync(join(store.userDir,'customers.sqlite')).equals(disk)).toBe(true);
      expect(current(store,session.id).sourceSnapshot).toEqual(reviewed.sourceSnapshot);
    }
  });

  it('keeps a legacy absent manifest explicitly missing through save, history, data updates and restore',async()=>{
    const {store,service}=await open(),created=(await service.generate(profile,preferences)).session;
    const legacyBackup=await changedBackup(store.backupBytes(),created.id,s=>{s.analysis.bazi=calculateBaziV3(s.profile);s.analysis.qimen=calculateQimenProfileV2(s.profile);s.originalFavorable=[...s.analysis.bazi.favorable];delete s.namingRules;delete s.sourceSnapshot;for(const candidate of s.candidates)delete candidate.namingMeaningReview;});store.restore(legacyBackup);
    let legacy=current(store,created.id);expect(legacy).not.toHaveProperty('namingRules');expect(legacy.sourceSnapshot).toBeUndefined();expect(sessionSourceStatus(legacy).status).toBe('missing');
    const attemptedBackfill=structuredClone(legacy);attemptedBackfill.sourceSnapshot=structuredClone(created.sourceSnapshot);attemptedBackfill.reviewNote='旧方案审阅';
    legacy=service.saveSession(attemptedBackfill);expect(legacy.sourceSnapshot).toBeUndefined();expect(legacy).not.toHaveProperty('sourceSnapshot');
    const history=service.listHistory(legacy.id);expect(history[0].session.sourceSnapshot).toBeUndefined();
    store.installPack(await updatedKnowledgePack(store,2));
    const restoredHistory=service.restoreHistory(legacy.id,history[0].id,legacy.reviewRevision,legacy.reviewToken);expect(restoredHistory.sourceSnapshot).toBeUndefined();
    store.restore(store.backupBytes());legacy=current(store,created.id);expect(legacy.sourceSnapshot).toBeUndefined();
    const html=reportHTML(legacy,service.bootstrap().settings);expect(html).toContain(LEGACY_SESSION_SOURCES_NOTICE);expect(html).not.toContain('https://example.test/shijing-revision-2');
    expect(service.bootstrap().sources.find(source=>source.id==='shijing')?.commit).toBe('custom-shijing-revision-2');
  });
});
