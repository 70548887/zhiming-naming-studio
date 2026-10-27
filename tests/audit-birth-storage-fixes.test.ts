import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import initSqlJs from 'sql.js';
import { Store, validSession } from '../src/main/store';
import { StudioService } from '../src/main/service';
import { analyzeProfile, BAZI_RULE_VERSION } from '../src/domain/engine';
import {calculateLegacyBazi,LEGACY_BAZI_RULE_VERSION}from'../src/domain/bazi-legacy';
import {calculateQimenProfileV2}from'../src/domain/qimen-v2';
import type { BirthProfile, Element, NamingPreferences, NamingSession } from '../src/shared/types';

const wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm');
const profile:BirthProfile={id:'audit-birth-storage',customerName:'出生资料存储回归',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'09:30',timeUnknown:false,leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:''};
const preferences:NamingPreferences={length:2,generationChar:'',requiredChars:'',forbiddenChars:'',elderTaboo:'',style:'清朗自然',meanings:'平安',industry:'',priority:'balanced',preferredElements:[],zodiacRules:false,numerology:false};
let SQL:Awaited<ReturnType<typeof initSqlJs>>,directory:string,store:Store,service:StudioService;

beforeAll(async()=>{SQL=await initSqlJs({locateFile:()=>wasm});});
beforeEach(async()=>{
  directory=mkdtempSync(join(tmpdir(),'naming-birth-storage-fixes-'));
  store=await new Store(directory,resolve('data'),wasm).init();
  service=new StudioService(store,{read:()=>'',write:()=>{}});
});
afterEach(()=>{store?.db.close();if(directory)rmSync(directory,{recursive:true,force:true});});

function alteredSessionArchive(bytes:Uint8Array,session:NamingSession,edit:(session:NamingSession)=>void):Uint8Array {
  const database=new SQL.Database(bytes),altered=structuredClone(session);
  try{edit(altered);database.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(altered),session.id]);return database.export();}
  finally{database.close();}
}
function differentElements(value:Element[]):Element[]{return value.join('、')==='金'?['水']:['金'];}
function disk(){return readFileSync(join(directory,'customers.sqlite'));}

describe('birth analysis snapshots in real customer backup restoration', { timeout: 15_000 },()=>{
  it('rejects plausible-shaped altered Bazi and original-favorable snapshots without changing archive bytes',async()=>{
    const generated=(await service.generate(profile,preferences)).session;
    const current=store.rows<NamingSession>('sessions').find(session=>session.id===generated.id)!;
    expect(current.analysis.bazi.version).toBe(BAZI_RULE_VERSION);
    expect(validSession(current)).toBe(true);
    const archive=store.backupBytes(),before=disk();
    const edits:{name:string;apply:(session:NamingSession)=>void}[]=[
      {name:'五行数量999',apply:session=>{session.analysis.bazi.elements.木=999;}},
      {name:'同时篡改系统喜用与原始喜用',apply:session=>{const fake=differentElements(session.analysis.bazi.favorable);session.analysis.bazi.favorable=fake;session.originalFavorable=[...fake];}},
      {name:'只篡改年干',apply:session=>{const year=session.analysis.bazi.pillars.find(pillar=>pillar.label==='年柱')!;year.gan=year.gan==='甲'?'乙':'甲';}},
      {name:'只篡改规则依据',apply:session=>{session.analysis.bazi.reasons=['伪造的八字分析依据'];}},
      {name:'未支持的算法版本',apply:session=>{session.analysis.bazi.version='civil-midnight-fuyi-candidate/0.9.0;lunar-typescript/1.8.6';}},
      {name:'只篡改原始喜用',apply:session=>{session.originalFavorable=differentElements(session.originalFavorable);}}
    ];
    for(const edit of edits){
      const malformed=alteredSessionArchive(archive,current,edit.apply);
      expect(()=>store.restore(malformed),edit.name).toThrow('结构不合法');
      expect(disk().equals(before),edit.name).toBe(true);
      expect(store.rows<NamingSession>('sessions').find(session=>session.id===current.id),edit.name).toEqual(current);
      expect(store.rows<BirthProfile>('profiles')[0].birthDate,edit.name).toBe(profile.birthDate);
    }
  });

  it('rejects a profile-only DST-gap archive using the same civil-time rule as normal saves',()=>{
    const savedProfile=service.saveProfile(profile);
    const gap={...profile,birthDate:'2024-03-10',birthTime:'02:30',timezone:'America/New_York'};
    expect(()=>service.saveProfile(gap)).toThrow('不存在');
    expect(()=>store.saveProfile(gap)).toThrow('客户字段');
    const archive=store.backupBytes(),before=disk(),database=new SQL.Database(archive);
    let malformed:Uint8Array;
    try{database.run('UPDATE profiles SET json=? WHERE id=?',[JSON.stringify(gap),profile.id]);malformed=database.export();}
    finally{database.close();}
    expect(()=>store.restore(malformed)).toThrow('结构不合法');
    expect(disk().equals(before)).toBe(true);
    expect(store.rows<BirthProfile>('profiles')[0]).toEqual(savedProfile);
    expect(store.rows('sessions')).toEqual([]);
  });

  it('restores a published legacy snapshot without source or review metadata and then saves from the fresh current row',async()=>{
    const generated=(await service.generate(profile,preferences)).session;
    const archive=store.backupBytes();
    const legacy=alteredSessionArchive(archive,generated,session=>{
      const historical=session as unknown as Record<string,unknown>;
      // This deliberately predates both source manifests and naming-rule version records.
      delete historical.sourceSnapshot;delete historical.namingRules;delete historical.reviewRevision;delete historical.reviewToken;for(const candidate of session.candidates)delete candidate.namingMeaningReview;
      session.analysis.bazi=calculateLegacyBazi(session.profile);session.analysis.qimen=calculateQimenProfileV2(session.profile);session.originalFavorable=[...session.analysis.bazi.favorable];
    });
    store.restore(legacy);
    // Restore replaces review tokens: future mutations must use this current row, never generated above.
    const restored=store.rows<NamingSession>('sessions').find(session=>session.id===generated.id)!;
    expect(restored.sourceSnapshot).toBeUndefined();
    expect(restored).not.toHaveProperty('namingRules');
    expect(restored.analysis.bazi).toEqual(calculateLegacyBazi(restored.profile));
    expect(restored.analysis.bazi.version).toBe(LEGACY_BAZI_RULE_VERSION);
    expect(validSession(restored)).toBe(true);
    const reviewed=service.saveSession({...restored,reviewNote:'旧版方案恢复后仍可审阅'});
    expect(reviewed.reviewNote).toBe('旧版方案恢复后仍可审阅');expect(reviewed).not.toHaveProperty('sourceSnapshot');
    expect(store.backupBytes().byteLength).toBeGreaterThan(0);
  });

  it.each([
    {label:'ordinary-unknown',overrides:{timeUnknown:true,birthTime:''}},
    {label:'cross-Li-Chun-unknown',overrides:{birthDate:'2024-02-04',timeUnknown:true,birthTime:''}},
    {label:'before-precise-Li-Chun',overrides:{birthDate:'2024-02-04',birthTime:'16:26:30'}},
    {label:'after-precise-Li-Chun',overrides:{birthDate:'2024-02-04',birthTime:'16:27:30'}},
    {label:'DST-fold-first-occurrence',overrides:{birthDate:'2024-11-03',birthTime:'01:30',timezone:'America/New_York'}}
  ] satisfies {label:string;overrides:Partial<BirthProfile>}[])('round trips $label without changing the supported Bazi interpretation',async({overrides})=>{
    const input={...profile,...overrides},generated=(await service.generate(input,preferences)).session;
    const expected=analyzeProfile(input).bazi;
    store.restore(store.backupBytes());
    const restored=store.rows<NamingSession>('sessions').find(session=>session.id===generated.id)!;
    expect(restored.analysis.bazi).toEqual(expected);
    expect(validSession(restored)).toBe(true);
    if(input.timeUnknown)expect(restored.analysis.bazi.pillars.some(pillar=>pillar.label==='时柱')).toBe(false);
    if(input.timeUnknown&&input.birthDate==='2024-02-04'){
      expect(restored.analysis.bazi.pillars.map(pillar=>pillar.label)).toEqual(['日柱']);
      expect(restored.originalFavorable).toEqual([]);
    }
    const manual=service.saveSession({...restored,preferences:{...restored.preferences,preferredElements:['水']},reviewNote:'人工意见与系统原始八字分开保留'});
    expect(manual.preferences.preferredElements).toEqual(['水']);
    expect(manual.analysis.bazi).toEqual(expected);
    expect(manual.originalFavorable).toEqual(expected.favorable);
    const nextArchive=store.backupBytes();
    expect(()=>store.restore(nextArchive)).not.toThrow();
  });
});
