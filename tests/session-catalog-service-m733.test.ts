import {afterAll,beforeAll,describe,expect,it,vi} from 'vitest';
import {mkdtempSync,readFileSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {Store} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {compactDecodeCounters} from '../src/main/compact-customer-store';
import {normalizePreferences} from '../src/shared/workflow';
import type {NamingSession} from '../src/shared/types';
import initSqlJs from 'sql.js';
import {validCatalogPage} from '../src/renderer/session-catalog-state';

let directory:string,store:Store,service:StudioService,saved:NamingSession;
beforeAll(async()=>{
  directory=mkdtempSync(join(tmpdir(),'naming-session-catalog-service-'));
  store=await new Store(directory,resolve('data'),resolve('node_modules/sql.js/dist/sql-wasm.wasm')).init();
  service=new StudioService(store,{read:()=>'',write:()=>{}},false);
  saved=(await service.generate({id:'m733-service-profile',customerName:'分页家长',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'09:30',timeUnknown:false,leapMonth:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:''},normalizePreferences({length:1,requiredChars:'安',zodiacRules:false,numerology:false}))).session;
},60000);
afterAll(async()=>{await service?.closeCmnReadingWorker();store?.db.close();if(directory)rmSync(directory,{recursive:true,force:true});});

describe('actual Service catalog and verified detail boundary',()=>{
  it('bootstraps metadata without reading full sessions or decoding immutable leaves',()=>{
    const before=readFileSync(join(directory,'customers.sqlite')),decodes=compactDecodeCounters(store.db),rows=vi.spyOn(store,'rows');
    try{
      const boot=service.bootstrap();
      expect(boot.sessions).toEqual([]);
      expect(boot.sessionCatalog.total).toBe(1);
      // Electron structured clone retains own undefined properties, unlike JSON HTTP.
      expect(validCatalogPage(boot.sessionCatalog)).toBe(true);
      expect(validCatalogPage(JSON.parse(JSON.stringify(boot.sessionCatalog)))).toBe(true);
      expect(boot.sessionCatalog.items[0]).toMatchObject({id:saved.id,profileId:saved.profileId,candidateFactsVerified:false});
      expect(boot.sessionCatalog.items[0]).not.toHaveProperty('analysis');
      expect(boot.sessionCatalog.items[0]).not.toHaveProperty('candidates');
      expect(rows.mock.calls.some(call=>call[0]==='sessions')).toBe(false);
      expect(compactDecodeCounters(store.db)).toEqual(decodes);
      expect(readFileSync(join(directory,'customers.sqlite'))).toEqual(before);
    }finally{rows.mockRestore();}
  });
  it('loads a complete session only through the existing verified reader',()=>{
    const reader=vi.spyOn(store,'readVerifiedSession');
    try{
      const detail=service.readSessionDetail(saved.id);
      expect(reader).toHaveBeenCalledExactlyOnceWith(saved.id);
      expect(detail?.candidates.map(row=>row.fullName)).toEqual(saved.candidates.map(row=>row.fullName));
      expect(detail?.analysis).toEqual(saved.analysis);
      expect(service.readSessionDetail('does-not-exist')).toBeNull();
    }finally{reader.mockRestore();}
  });
  it('does not reinterpret a failed verifier as an empty or usable detail',()=>{
    const reader=vi.spyOn(store,'readVerifiedSession').mockImplementation(()=>{throw new Error('fixture-verification-failed');});
    try{expect(()=>service.readSessionDetail(saved.id)).toThrow('fixture-verification-failed');}finally{reader.mockRestore();}
  });
  it('rejects invalid detail and surplus migration arguments before touching data',()=>{
    const before=readFileSync(join(directory,'customers.sqlite'));
    const detail=service.readSessionDetail as unknown as (...args:unknown[])=>unknown;
    expect(()=>detail.call(service)).toThrow('方案编号');
    expect(()=>detail.call(service,' ',saved.id)).toThrow('方案编号');
    expect(()=>service.listSessionCatalog({limit:0})).toThrow();
    expect(()=>(service.migrateCustomerStorage as unknown as (...args:unknown[])=>unknown).call(service,'extra')).toThrow('额外参数');
    expect(service.migrateCustomerStorage().migrationRequired).toBe(false);
    expect(readFileSync(join(directory,'customers.sqlite'))).toEqual(before);
  });
  it('exposes explicit raw migration and preserves the original database before restoring saves',async()=>{
    const rawDir=mkdtempSync(join(tmpdir(),'naming-catalog-migration-'));
    let legacy:Store|undefined,legacyService:StudioService|undefined;
    try{
      const wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm'),SQL=await initSqlJs({locateFile:()=>wasm}),raw=new SQL.Database();
      try{
        raw.run('CREATE TABLE profiles(id TEXT PRIMARY KEY,json TEXT NOT NULL);CREATE TABLE sessions(id TEXT PRIMARY KEY,json TEXT NOT NULL);CREATE TABLE settings(id TEXT PRIMARY KEY,json TEXT NOT NULL);CREATE TABLE revisions(id INTEGER PRIMARY KEY AUTOINCREMENT,session_id TEXT,created_at TEXT,json TEXT);CREATE TABLE profile_versions(id TEXT PRIMARY KEY,token TEXT NOT NULL);CREATE TABLE knowledge_archives(sha256 TEXT PRIMARY KEY,version TEXT UNIQUE NOT NULL,pack BLOB NOT NULL)');
        writeFileSync(join(rawDir,'customers.sqlite'),raw.export());
      }finally{raw.close();}
      const before=readFileSync(join(rawDir,'customers.sqlite'));
      legacy=await new Store(rawDir,resolve('data'),wasm).init();
      legacyService=new StudioService(legacy,{read:()=>'',write:()=>{}},false);
      expect(legacyService.bootstrap().storageState).toMatchObject({version:'raw-sqlite',migrationRequired:true});
      expect(()=>legacyService!.saveBrand({studioName:'迁移后工作室',contact:'',logoDataUrl:''})).toThrow('只读');
      expect(readFileSync(join(rawDir,'customers.sqlite'))).toEqual(before);
      expect(legacyService.migrateCustomerStorage()).toMatchObject({migrationRequired:false});
      const prior=readdirSync(rawDir).find(file=>/^customers\.before-compact-[a-f0-9]+\.sqlite$/.test(file));
      expect(prior).toBeTruthy();expect(readFileSync(join(rawDir,prior!))).toEqual(before);
      expect(legacyService.saveBrand({studioName:'迁移后工作室',contact:'',logoDataUrl:''}).studioName).toBe('迁移后工作室');
    }finally{await legacyService?.closeCmnReadingWorker();legacy?.db.close();rmSync(rawDir,{recursive:true,force:true});}
  },30000);
});
