import {afterEach,describe,expect,it,vi}from'vitest';
import {mkdtempSync,readFileSync,rmSync,writeFileSync,existsSync,renameSync}from'node:fs';
import{tmpdir}from'node:os';import{join,resolve}from'node:path';import initSqlJs from'sql.js';
import{Store}from'../src/main/store';import{DataPackPreviewManager}from'../src/main/data-maintenance';

vi.mock('node:fs',async importOriginal=>{const actual=await importOriginal<typeof import('node:fs')>();return {...actual,renameSync:vi.fn(actual.renameSync)};});
const dirs:string[]=[],stores:Store[]=[],wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm');
async function setup(){const directory=mkdtempSync(join(tmpdir(),'maintenance-failure-114-'));dirs.push(directory);const store=await new Store(directory,resolve('data'),wasm).init();stores.push(store);return store;}
async function changed(store:Store,label:string){const SQL=await initSqlJs({locateFile:()=>wasm}),db=new SQL.Database(store.currentPackBytes());try{const row=db.exec('SELECT rowid,json FROM sources')[0].values[0],source=JSON.parse(String(row[1]));source.note+=' '+label;db.run('UPDATE sources SET json=? WHERE rowid=?',[JSON.stringify(source),row[0]]);return db.export();}finally{db.close();}}
afterEach(()=>{vi.mocked(renameSync).mockReset();for(const store of stores.splice(0))store.db.close();for(const directory of dirs.splice(0))rmSync(directory,{recursive:true,force:true});});

describe('knowledge maintenance write failure and retained-preview recovery', { timeout: 15_000 },()=>{
 it('restores both actual knowledge files and memory after current-pack replacement fails, then allows the same preview to retry',async()=>{
  const store=await setup();store.installPack(await changed(store,'installed-one'));store.installPack(await changed(store,'installed-two'));
  const active=store.currentPackBytes(),prior=store.previousPackBytes()!,customer=readFileSync(join(store.userDir,'customers.sqlite')),version=store.dataset.version;
  const manager=new DataPackPreviewManager(store),preview=manager.prepare(await changed(store,'incoming-three'));
  const actual=await vi.importActual<typeof import('node:fs')>('node:fs');let failed=false;
  vi.mocked(renameSync).mockImplementation((from,to)=>{if(String(to)===join(store.userDir,'knowledge.sqlite')&&!failed){failed=true;throw new Error('injected-current-rename-failure');}actual.renameSync(from,to);});
  expect(()=>manager.apply(preview.id)).toThrow('injected-current-rename-failure');
  expect(Buffer.from(store.currentPackBytes()).equals(Buffer.from(active))).toBe(true);expect(Buffer.from(store.previousPackBytes()!).equals(Buffer.from(prior))).toBe(true);expect(readFileSync(join(store.userDir,'customers.sqlite')).equals(customer)).toBe(true);expect(store.dataset.version).toBe(version);
  expect(manager.apply(preview.id)).toContain('更新');expect(store.dataset.version).toBe(preview.incoming.version);expect(()=>manager.apply(preview.id)).toThrow('失效');
 });
 it('removes the newly created rollback if the first custom pack write fails, keeping builtin state and customer archive unchanged',async()=>{
  const store=await setup(),active=store.currentPackBytes(),customer=readFileSync(join(store.userDir,'customers.sqlite')),manager=new DataPackPreviewManager(store),preview=manager.prepare(await changed(store,'first-failing'));
  const actual=await vi.importActual<typeof import('node:fs')>('node:fs');
  vi.mocked(renameSync).mockImplementation((from,to)=>{if(String(to)===join(store.userDir,'knowledge.sqlite'))throw new Error('injected-first-rename-failure');actual.renameSync(from,to);});
  expect(()=>manager.apply(preview.id)).toThrow('injected-first-rename-failure');expect(store.previousPackBytes()).toBeUndefined();expect(existsSync(join(store.userDir,'knowledge.sqlite'))).toBe(false);expect(Buffer.from(store.currentPackBytes()).equals(Buffer.from(active))).toBe(true);expect(readFileSync(join(store.userDir,'customers.sqlite')).equals(customer)).toBe(true);
 });
 it('keeps both packs and the preview when a live customer writer lock prevents installation',async()=>{
  const store=await setup(),manager=new DataPackPreviewManager(store),preview=manager.prepare(await changed(store,'lock-blocked')),active=store.currentPackBytes();writeFileSync(join(store.userDir,'customers.write-lock'),String(process.pid));
  expect(()=>manager.apply(preview.id)).toThrow('另一个进程');expect(Buffer.from(store.currentPackBytes()).equals(Buffer.from(active))).toBe(true);expect(store.previousPackBytes()).toBeUndefined();
  rmSync(join(store.userDir,'customers.write-lock'));expect(manager.apply(preview.id)).toContain('更新');
 });
});
