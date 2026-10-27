import {afterEach,describe,expect,it} from 'vitest';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import initSqlJs from 'sql.js';
import {Store} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {DataPackPreviewManager} from '../src/main/data-maintenance';
import {normalizePreferences} from '../src/shared/workflow';
import type {BirthProfile} from '../src/shared/types';

const dirs:string[]=[],stores:Store[]=[],wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm');
async function open(){const directory=mkdtempSync(join(tmpdir(),'maintenance-114-'));dirs.push(directory);const store=await new Store(directory,resolve('data'),wasm).init();stores.push(store);return store;}
async function changedPack(store:Store,label:string){const SQL=await initSqlJs({locateFile:()=>wasm}),db=new SQL.Database(store.currentPackBytes());try{
 const row=db.exec('SELECT rowid,json FROM sources')[0].values[0],source=JSON.parse(String(row[1]));source.commit=label;db.run('UPDATE sources SET json=? WHERE rowid=?',[JSON.stringify(source),row[0]]);
 const citation=db.exec('SELECT rowid,json FROM citations')[0].values[0],entry=JSON.parse(String(citation[1]));entry.text+=' '+label;db.run('UPDATE citations SET json=? WHERE rowid=?',[JSON.stringify(entry),citation[0]]);
 return db.export();
}finally{db.close();}}
afterEach(()=>{for(const store of stores.splice(0))store.db.close();for(const dir of dirs.splice(0))rmSync(dir,{recursive:true,force:true});});

describe('reviewable knowledge maintenance without changing saved customer history', { timeout: 15_000 },()=>{
 it('previews exact record changes without writing and applies the retained bytes only once',async()=>{
  const store=await open(),bytes=await changedPack(store,'preview-one'),manager=new DataPackPreviewManager(store),disk=readFileSync(join(store.userDir,'customers.sqlite'));
  const before=store.maintenanceStatus(),preview=manager.prepare(bytes);
  expect(preview.changes.sources).toEqual({added:0,removed:0,changed:1,unchanged:before.active.counts.sources-1});
  expect(preview.changes.citations.changed).toBe(1);expect(preview.sourceChanges).toHaveLength(1);expect(preview.incoming.sha256.startsWith(preview.incoming.version)).toBe(true);
  expect(store.dataset.version).toBe(before.active.version);expect(readFileSync(join(store.userDir,'customers.sqlite')).equals(disk)).toBe(true);
  bytes.fill(0);expect(manager.apply(preview.id)).toContain('更新');expect(store.dataset.version).toBe(preview.incoming.version);expect(()=>manager.apply(preview.id)).toThrow('失效');
  expect(store.maintenanceStatus().rollback?.sha256).toBe(before.active.sha256);
 });
 it('handles cancel, expiry, replaced preview and stale base without writing',async()=>{
  const store=await open(),bytes=await changedPack(store,'cancel'),before=store.currentPackBytes();let now=1000;const manager=new DataPackPreviewManager(store,()=>now);
  const cancelled=manager.prepare(bytes);manager.discard(cancelled.id);expect(()=>manager.apply(cancelled.id)).toThrow('失效');
  const expired=manager.prepare(bytes);now+=15*60000;expect(()=>manager.apply(expired.id)).toThrow('15分钟');
  const old=manager.prepare(bytes),next=manager.prepare(bytes);expect(()=>manager.apply(old.id)).toThrow('失效');manager.discard(next.id);
  expect(Buffer.from(store.currentPackBytes()).equals(Buffer.from(before))).toBe(true);
  const stale=manager.prepare(bytes);store.installPack(await changedPack(store,'intervening'));const latest=store.dataset.version;
  expect(()=>manager.apply(stale.id)).toThrow('已变化');expect(store.dataset.version).toBe(latest);
 });
 it('previews rollback and preserves customer facts and original-package archives through import and rollback',async()=>{
  const store=await open(),service=new StudioService(store,{read:()=>'',write:()=>{}},false);
  const profile:BirthProfile={id:'maintenance-family',customerName:'维护回归',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'09:30',leapMonth:false,timeUnknown:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:''};
  const session=(await service.generate(profile,normalizePreferences({requiredChars:'和乐',zodiacRules:false}))).session;
  const before=service.bootstrap(),manager=new DataPackPreviewManager(store),preview=manager.prepare(await changedPack(store,'imported'));manager.apply(preview.id);
  const after=service.bootstrap();expect(after.sessions).toEqual(before.sessions);expect(after.maintenance?.archives.count).toBe(1);
  const rollback=manager.prepareRollback();expect(rollback.operation).toBe('rollback');expect(rollback.incoming.sha256).toBe(before.maintenance?.active.sha256);expect(manager.apply(rollback.id)).toContain('回退');
  expect(service.bootstrap().sessions[0].candidates).toEqual(session.candidates);expect(service.bootstrap().maintenance?.active.sha256).toBe(before.maintenance?.active.sha256);
 });
 it('rejects bad files, exposes invalid rollback state, and does not erase a useful rollback with an identical import',async()=>{
  const store=await open(),manager=new DataPackPreviewManager(store);expect(()=>manager.prepare(new Uint8Array([1,2,3]))).toThrow();expect(()=>manager.prepareRollback()).toThrow('尚无');
  store.installPack(await changedPack(store,'first'));const previous=store.previousPackBytes()!;store.installPack(store.currentPackBytes());expect(Buffer.from(store.previousPackBytes()!).equals(Buffer.from(previous))).toBe(true);
  writeFileSync(join(store.userDir,'knowledge.previous.sqlite'),new Uint8Array([1,2]));expect(store.maintenanceStatus().rollbackError).toBeTruthy();expect(store.maintenanceStatus().active.version).toBe(store.dataset.version);
 });
 it('detects external changes to the active pack before preview or apply',async()=>{
  const store=await open(),manager=new DataPackPreviewManager(store),bytes=await changedPack(store,'valid'),pending=manager.prepare(bytes);
  writeFileSync(join(store.userDir,'knowledge.sqlite'),bytes);expect(()=>manager.apply(pending.id)).toThrow('其他进程修改');
 });
});
