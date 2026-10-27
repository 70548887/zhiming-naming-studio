import {afterEach,describe,expect,it} from 'vitest';
import {copyFileSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import initSqlJs from 'sql.js';
import {Store} from '../src/main/store';
import fixture from './fixtures/naming-session-1.0.31.json';
import legacy from './fixtures/naming-session-1.0.30.json';
import type {NamingSession} from '../src/shared/types';

const wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm'),source=resolve('tests/fixtures/naming-session-1.0.31.sqlite'),original=readFileSync(source),hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const directories:string[]=[],stores:Store[]=[];
const linked=fixture.rows.find(row=>fixture.histories.some(history=>history.sessionId===row.id))!,other=fixture.rows.find(row=>row.id!==linked.id)!,sourceId='naming-editorial-readings-v4-fixed';
type Change='current-pair'|'history-pair'|'current-source'|'history-source'|'current-package'|'history-package';
async function modified(change:Change){const SQL=await initSqlJs({locateFile:()=>wasm}),db=new SQL.Database(new Uint8Array(original));try{const historical=change.startsWith('history'),row=db.exec(historical?'SELECT id,json FROM revisions WHERE session_id=?':'SELECT id,json FROM sessions WHERE id=?',[linked.id])[0].values[0],value=JSON.parse(String(row[1]));
 if(change.endsWith('pair')){delete value.namingRules;value.sourceSnapshot.sources=value.sourceSnapshot.sources.filter((source:any)=>source.id!==sourceId);}
 if(change.endsWith('source'))value.sourceSnapshot.sources.push({id:'history-extra-source',name:'额外来源',url:'local:test',commit:'local',license:'CC0-1.0',files:[],sha256:'extra-source',note:'不得追补到同一批历史'});
 if(change.endsWith('package')){const replacement=structuredClone(other.session);Object.assign(value,replacement,{id:linked.id,profileId:linked.session.profileId,profile:{...replacement.profile,id:linked.session.profileId}});}
 db.run('UPDATE '+(historical?'revisions':'sessions')+' SET json=? WHERE id=?',[JSON.stringify(value),row[0]]);return db.export();}finally{db.close();}}
async function open(bytes:Uint8Array=original){const directory=mkdtempSync(join(tmpdir(),'naming-history-identity-'));directories.push(directory);writeFileSync(join(directory,'customers.sqlite'),bytes);const store=await new Store(directory,resolve('data'),wasm).init();stores.push(store);return{store,directory};}
afterEach(()=>{for(const store of stores.splice(0))store.db.close();for(const directory of directories.splice(0))rmSync(directory,{recursive:true,force:true});});

describe('known naming-generation identity across all saved revisions', { timeout: 15_000 },()=>{
 it('reads the actual delivered4.0 SQL unchanged, with every current and history identity retained',async()=>{
  expect(hash(original)).toBe('c8b7226d770cf22a5548913584e83b42a87a4ee3f33e834af86adb1198cc68aa');expect(fixture.provenance.sourceAsarSha256).toBe('53acb597b09df3c94aca178e76c6f3d206a4e2a66aeadd6392ade5daafe0a86f');const{store,directory}=await open();expect(store.rows<NamingSession>('sessions')).toEqual(fixture.rows.map(row=>row.session));expect(store.listRevisions(linked.id)).toEqual(fixture.histories.map(({sqlJsonSha256,...row})=>row));expect(readFileSync(join(directory,'customers.sqlite')).equals(original)).toBe(true);
 });
 it.each(['current-pair','history-pair','current-source','history-source','current-package','history-package']as const)('rejects %s on restore atomically instead of accepting independently valid but conflicting records',async change=>{
  const{store,directory}=await open(),before=readFileSync(join(directory,'customers.sqlite')),tokens=store.rows<NamingSession>('sessions').map(session=>session.reviewToken),archives=store.db.exec('SELECT sha256,version FROM knowledge_archives');const bytes=await modified(change);expect(()=>store.restore(bytes)).toThrow('字段不完整或结构不合法');expect(readFileSync(join(directory,'customers.sqlite')).equals(before)).toBe(true);expect(store.rows<NamingSession>('sessions').map(session=>session.reviewToken)).toEqual(tokens);expect(store.db.exec('SELECT sha256,version FROM knowledge_archives')).toEqual(archives);
 });
 it.each(['current-pair','history-pair']as const)('rejects %s during init without rewriting the original customer file',async change=>{
  const bytes=await modified(change),directory=mkdtempSync(join(tmpdir(),'naming-history-init-'));directories.push(directory);const file=join(directory,'customers.sqlite');writeFileSync(file,bytes);await expect(new Store(directory,resolve('data'),wasm).init()).rejects.toThrow('命名规则历史关联');expect(readFileSync(file).equals(Buffer.from(bytes))).toBe(true);
 });
 it('blocks current/history reads, backups and persistence after in-memory paired erasure without deleting records',async()=>{
  const{store,directory}=await open(),current=structuredClone(linked.session)as NamingSession;delete current.namingRules;current.sourceSnapshot!.sources=current.sourceSnapshot!.sources.filter(source=>source.id!==sourceId);store.db.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(current),linked.id]);const beforeMemory=store.db.export(),beforeDisk=readFileSync(join(directory,'customers.sqlite'));
  expect(()=>store.rows('sessions')).toThrow('命名规则历史关联');expect(()=>store.listRevisions(linked.id)).toThrow('命名规则历史关联');expect(()=>store.backupBytes()).toThrow('备份已取消');expect(()=>store.flush()).toThrow('命名规则历史关联');const profile=store.rows<any>('profiles')[0];expect(()=>store.saveProfile({...profile,notes:'must roll back'})).toThrow('命名规则历史关联');expect(Buffer.from(store.db.export()).equals(Buffer.from(beforeMemory))).toBe(true);expect(readFileSync(join(directory,'customers.sqlite')).equals(beforeDisk)).toBe(true);expect(store.db.exec('SELECT COUNT(*) FROM revisions')[0].values[0][0]).toBe(1);
 });
 it('keeps truly unversioned current/history records unversioned and leaves legacy source history unchanged',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'naming-history-legacy-'));directories.push(directory);copyFileSync(resolve('tests/fixtures/naming-session-1.0.30.sqlite'),join(directory,'customers.sqlite'));const store=await new Store(directory,resolve('data'),wasm).init();stores.push(store);const before=readFileSync(join(directory,'customers.sqlite'));expect(store.rows<NamingSession>('sessions')[0]).toEqual(legacy.rows[0].session);expect(store.listRevisions(legacy.rows[0].id).every(row=>!Object.hasOwn(row.session,'namingRules'))).toBe(true);expect(readFileSync(join(directory,'customers.sqlite')).equals(before)).toBe(true);
 });
});
