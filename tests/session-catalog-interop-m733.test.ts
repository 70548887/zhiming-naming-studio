import {afterAll,beforeAll,describe,expect,it,vi} from 'vitest';
import initSqlJs from 'sql.js';
import {resolve} from 'node:path';
import {querySessionCatalog} from '../src/main/session-catalog-query';
import {createSessionCatalogController,validCatalogPage} from '../src/renderer/session-catalog-state';
import {DEFAULT_SESSION_FILTERS} from '../src/shared/session-catalog';
import {catalogSession} from './fixtures/catalog-session';
import type {SessionCatalogRequest} from '../src/shared/session-pagination';

let db:Awaited<ReturnType<typeof initSqlJs>>['Database']['prototype'];
beforeAll(async()=>{
  const SQL=await initSqlJs({locateFile:()=>resolve('node_modules/sql.js/dist/sql-wasm.wasm')});db=new SQL.Database();
  db.run('CREATE TABLE profiles(id TEXT PRIMARY KEY,json TEXT NOT NULL);CREATE TABLE sessions(id TEXT PRIMARY KEY,json TEXT NOT NULL);CREATE TABLE settings(id TEXT PRIMARY KEY,json TEXT NOT NULL)');
  const first=catalogSession();db.run('INSERT INTO profiles VALUES(?,?)',[first.profileId,JSON.stringify(first.profile)]);
  // Directory fixtures only: no claim that these synthetic candidate facts were verified.
  for(let i=0;i<28;i++){const row=catalogSession('interop-'+String(i).padStart(2,'0'));db.run('INSERT INTO sessions VALUES(?,?)',[row.id,JSON.stringify(row)]);}
});
afterAll(()=>db?.close());

describe('real metadata page to renderer contract',()=>{
  it('accepts Electron-cloned and HTTP-serialized terminal pages',()=>{
    const page=querySessionCatalog(db,{limit:100});
    expect(Object.hasOwn(page,'nextCursor')).toBe(false);
    expect(validCatalogPage(structuredClone(page))).toBe(true);
    expect(validCatalogPage(JSON.parse(JSON.stringify(page)))).toBe(true);
  });
  it('seeds the same page size as bootstrap, then walks the remaining rows without full detail reads',async()=>{
    const api={listSessionCatalog:async(input?:SessionCatalogRequest)=>querySessionCatalog(db,input),readSessionDetail:vi.fn(async()=>null)};
    const controller=createSessionCatalogController({getApi:()=>api});controller.activate();
    try{
      controller.seed(querySessionCatalog(db,{limit:25}));const first=controller.getSnapshot().page!;
      expect(first.items).toHaveLength(25);await controller.next();const last=controller.getSnapshot().page!;
      expect(last.items).toHaveLength(3);expect(new Set([...first.items,...last.items].map(row=>row.id)).size).toBe(28);
      expect(last.nextCursor).toBeUndefined();expect(api.readSessionDetail).not.toHaveBeenCalled();
    }finally{controller.dispose();}
  });
  it('recovers an expired cursor by retrying from the first page while preserving filters',async()=>{
    const api={listSessionCatalog:async(input?:SessionCatalogRequest)=>querySessionCatalog(db,input),readSessionDetail:vi.fn(async()=>null)};
    const controller=createSessionCatalogController({getApi:()=>api});controller.activate();
    try{
      await controller.refresh();const inserted=catalogSession('interop-new');db.run('INSERT INTO sessions VALUES(?,?)',[inserted.id,JSON.stringify(inserted)]);
      await controller.next();expect(controller.getSnapshot()).toMatchObject({phase:'error',page:undefined});
      await controller.retry();expect(controller.getSnapshot()).toMatchObject({phase:'ready',pageNumber:1,filters:DEFAULT_SESSION_FILTERS});
      expect(controller.getSnapshot().page?.total).toBe(29);
    }finally{controller.dispose();db.run('DELETE FROM sessions WHERE id=?',['interop-new']);}
  });
  it('rejects inherited fields, accessors and proxies before reading getters or scanning the database',()=>{
    let reads=0;const getter=Object.defineProperty({},'limit',{enumerable:true,get(){reads++;return 1;}});
    const inherited=Object.create({limit:1});
    const proxy=new Proxy({},{get(){reads++;throw Error('must-not-read');},ownKeys(){reads++;throw Error('must-not-enumerate');}});
    const malformedFilters=Object.assign(Object.create(DEFAULT_SESSION_FILTERS),{a:'',b:'',c:'',d:'',e:'',f:'',g:''});
    const prepare=vi.spyOn(db,'prepare');
    try{
      for(const input of [getter,inherited,proxy,{filters:malformedFilters},{filters:{...DEFAULT_SESSION_FILTERS,query:'x'.repeat(1001)}}])expect(()=>querySessionCatalog(db,input as SessionCatalogRequest)).toThrow();
      expect(reads).toBe(0);expect(prepare).not.toHaveBeenCalled();
    }finally{prepare.mockRestore();}
  });
  it('rejects malformed and differently filtered cursors before issuing SQL',()=>{
    const cursor=querySessionCatalog(db,{limit:1}).nextCursor!,prepare=vi.spyOn(db,'prepare');
    try{
      expect(()=>querySessionCatalog(db,{cursor:'a'})).toThrow('游标');
      expect(()=>querySessionCatalog(db,{cursor,filters:{...DEFAULT_SESSION_FILTERS,query:'different'}})).toThrow('筛选条件');
      expect(prepare).not.toHaveBeenCalled();
    }finally{prepare.mockRestore();}
  });
});
