import {afterEach,describe,expect,it} from 'vitest';
import * as fs from 'node:fs';
import {join,parse} from 'node:path';
import initSqlJs from 'sql.js';
import {ENV_KEYS,STARTUP_EVENTS,SQL_SHA,PROVENANCE_SHA,fixture,oldScopeBlocks,productPaths,runEntry,sha,tree} from './helpers/naming-v7-entry-harness';
import type {Fixture,EntryRun} from './helpers/naming-v7-entry-harness';

// These tests execute actual main.ts statement order in a VM. Only imported app
// dependencies are sentinels; preflight/fs/path/hash/Windows attributes are real.
// No Electron process, renderer, screenshot, PDF, live Store or AI is executed.
const cases:Fixture[]=[];
const make=(label:string)=>{const value=fixture(label);cases.push(value);return value;};
afterEach(()=>{for(const value of cases.splice(0).reverse())value.cleanup();});
function invalid(result:EntryRun,before:string[],value:Fixture,reason?:RegExp){
 expect(result.uncaught).toEqual([]);
 expect(result.stderr.length).toBeGreaterThan(0);
 if(reason)expect(result.stderr).toMatch(reason);
 expect(result.exits).toContain(1);
 expect(result.exits.every(code=>code!==0)).toBe(true);
 expect(result.events.filter(item=>(STARTUP_EVENTS as readonly string[]).includes(item.name))).toEqual([]);
 expect(result.events.some(item=>item.name==='app.quit'||item.name==='smoke-ready'||item.name==='smokeNamingV7')).toBe(false);
 expect(result.attemptedWrites).toEqual([]);expect(result.writes).toEqual([]);
 expect(tree(value.root)).toEqual(before);
}
const names=(result:EntryRun)=>result.events.map(item=>item.name);

describe('naming-v7 actual main early-entry guard',()=>{
 it('rejects missing/foreign scope, every required value, and EXIT=0 before every startup dependency even when process.exit returns',async()=>{
  for(const key of ENV_KEYS){const value=make('missing-'+key.toLowerCase());delete value.env[key];const before=tree(value.root);invalid(await runEntry({env:value.env}),before,value,key==='NAMING_STUDIO_SMOKE_SCOPE'?/scope必须/:/必须同时指定/);}
  for(const [key,entry] of [['NAMING_STUDIO_SMOKE_EXIT','0'],['NAMING_STUDIO_SMOKE_SCOPE','naming-v6'],['NAMING_STUDIO_SMOKE_SCOPE','naming-v77']] as const){const value=make('wrong-'+entry);value.env[key]=entry;const before=tree(value.root);invalid(await runEntry({env:value.env}),before,value,key==='NAMING_STUDIO_SMOKE_EXIT'?/EXIT必须严格/:/scope必须/);}
 },60000);

 it('fails closed for root, case alias, nesting, nonfresh directories, existing empty SQLite, junction leaves/ancestors and overlapping inputs',async()=>{
  const SQL=await initSqlJs({locateFile:()=>join(process.cwd(),'node_modules/sql.js/dist/sql-wasm.wasm')});const db=new SQL.Database();
  db.run('CREATE TABLE profiles(id TEXT); CREATE TABLE sessions(id TEXT); CREATE TABLE revisions(id TEXT)');const emptySql=db.export();db.close();
  const variants:Array<[string,(value:Fixture)=>void]>=[
   ['user-root',v=>{v.env.NAMING_STUDIO_USER_DATA=parse(v.root).root;}],
   ['output-root',v=>{v.env.NAMING_STUDIO_SMOKE=parse(v.root).root;}],
   ['same',v=>{v.env.NAMING_STUDIO_USER_DATA=v.out;}],
   ['case-alias',v=>{v.env.NAMING_STUDIO_USER_DATA=v.out.toUpperCase();}],
   ['user-in-out',v=>{v.env.NAMING_STUDIO_USER_DATA=join(v.out,'child');fs.mkdirSync(v.env.NAMING_STUDIO_USER_DATA);}],
   ['out-in-user',v=>{v.env.NAMING_STUDIO_SMOKE=join(v.user,'child');fs.mkdirSync(v.env.NAMING_STUDIO_SMOKE);}],
   ['missing-user',v=>{v.env.NAMING_STUDIO_USER_DATA=join(v.root,'not-prebuilt');}],
   ['missing-out',v=>{v.env.NAMING_STUDIO_SMOKE=join(v.root,'not-prebuilt');}],
   ['relative-user',v=>{v.env.NAMING_STUDIO_USER_DATA='relative-user';}],
   ['relative-out',v=>{v.env.NAMING_STUDIO_SMOKE='relative-out';}],
   ['customers-marker',v=>{fs.writeFileSync(join(v.user,'customers.sqlite'),'customer marker');}],
   ['customers-empty-sqlite',v=>{fs.writeFileSync(join(v.user,'customers.sqlite'),emptySql);}],
   ['user-marker',v=>{fs.writeFileSync(join(v.user,'marker.txt'),'existing');}],
   ['out-marker',v=>{fs.writeFileSync(join(v.out,'marker.txt'),'existing');}],
   ['sql-in-user',v=>{const file=join(v.user,'legacy.sqlite');fs.copyFileSync(v.sql,file);v.env.NAMING_STUDIO_V7_LEGACY_SQL=file;}],
   ['sql-in-out',v=>{const file=join(v.out,'legacy.sqlite');fs.copyFileSync(v.sql,file);v.env.NAMING_STUDIO_V7_LEGACY_SQL=file;}],
   ['provenance-in-user',v=>{const file=join(v.user,'legacy.json');fs.copyFileSync(v.provenance,file);v.env.NAMING_STUDIO_V7_LEGACY_PROVENANCE=file;}],
   ['provenance-in-out',v=>{const file=join(v.out,'legacy.json');fs.copyFileSync(v.provenance,file);v.env.NAMING_STUDIO_V7_LEGACY_PROVENANCE=file;}],
   ['junction-leaf',v=>{const link=join(v.root,'user-link');fs.symlinkSync(v.out,link,'junction');v.env.NAMING_STUDIO_USER_DATA=link;}],
   ['junction-ancestor',v=>{const real=join(v.root,'actual-parent'),link=join(v.root,'alias-parent');fs.mkdirSync(real);fs.mkdirSync(join(real,'user'));fs.symlinkSync(real,link,'junction');v.env.NAMING_STUDIO_USER_DATA=join(link,'user');}],
  ];
  for(const [label,mutate] of variants){const value=make(label);mutate(value);const before=tree(value.root);
   const reason=/root/.test(label)?/根目录/:/^(same|case-alias|user-in-out|out-in-user)$/.test(label)?/相同或双向嵌套/:/missing/.test(label)?/ENOENT/:/relative/.test(label)?/本机驱动器绝对路径/:/customers|user-marker/.test(label)?/USER_DATA必须.*全新空目录/:label==='out-marker'?/输出必须.*空目录/:/in-user|in-out/.test(label)?/旧输入不得位于/:/junction/.test(label)?/符号链接\/junction|重解析点/:/拒绝/;
   invalid(await runEntry({env:value.env}),before,value,reason);
  }
 },120000);

 it('rejects missing/corrupted pinned legacy inputs before app startup and preserves source bytes',async()=>{
  expect(sha(fs.readFileSync('tests/fixtures/naming-session-1.0.34.sqlite'))).toBe(SQL_SHA);
  expect(sha(fs.readFileSync('tests/fixtures/naming-session-1.0.34-provenance.json'))).toBe(PROVENANCE_SHA);
  for(const kind of ['missing-sql','zero-sql','same-size-wrong-sql','broken-provenance','same-input'] as const){
   const value=make(kind);
   if(kind==='missing-sql')value.env.NAMING_STUDIO_V7_LEGACY_SQL=join(value.root,'missing.sqlite');
   if(kind==='zero-sql'){const file=join(value.root,'zero.sqlite');fs.writeFileSync(file,'');value.env.NAMING_STUDIO_V7_LEGACY_SQL=file;}
   if(kind==='same-size-wrong-sql'){const file=join(value.root,'changed.sqlite'),bytes=fs.readFileSync(value.sql);bytes[bytes.length-1]^=1;fs.writeFileSync(file,bytes);value.env.NAMING_STUDIO_V7_LEGACY_SQL=file;}
   if(kind==='broken-provenance'){const file=join(value.root,'broken.json');fs.writeFileSync(file,'{broken');value.env.NAMING_STUDIO_V7_LEGACY_PROVENANCE=file;}
   if(kind==='same-input')value.env.NAMING_STUDIO_V7_LEGACY_PROVENANCE=value.sql;
   const before=tree(value.root);invalid(await runEntry({env:value.env}),before,value,kind==='missing-sql'?/ENOENT/:kind==='zero-sql'?/旧输入大小不符/:kind==='same-input'?/同一文件或硬链接/:/旧输入原件摘要不符/);
  }
  expect(sha(fs.readFileSync('tests/fixtures/naming-session-1.0.34.sqlite'))).toBe(SQL_SHA);
  expect(sha(fs.readFileSync('tests/fixtures/naming-session-1.0.34-provenance.json'))).toBe(PROVENANCE_SHA);
 },60000);

 it('completes real preflight before app paths/Store and passes its exact frozen ticket as argument eight; result and ready precede quit',async()=>{
  const value=make('valid');const result=await runEntry({env:value.env});
  expect(result.uncaught).toEqual([]);expect(result.stderr).toBe('');expect(result.exits).toEqual([]);
  expect(Object.isFrozen(result.context)).toBe(true);
  expect(result.smokeArgs).toHaveLength(8);expect(result.smokeArgs?.[7]).toBe(result.context);
  expect(result.context).toMatchObject({kind:'naming-v7-preflight/r3',out:value.out,userData:value.user,legacySha256:SQL_SHA,provenanceSha256:PROVENANCE_SHA,exit:'1'});
  const events=names(result),passed=events.indexOf('preflight.passed');expect(passed).toBeGreaterThanOrEqual(0);
  expect(events.indexOf('windows.attributes')).toBeGreaterThanOrEqual(0);expect(events.indexOf('windows.attributes')).toBeLessThan(passed);
  for(const name of STARTUP_EVENTS){expect(events.indexOf(name)).toBeGreaterThan(passed);expect(events.filter(event=>event===name)).toHaveLength(1);}
  const file=join(value.out,'naming-v7-smoke-result.json');expect(fs.existsSync(file)).toBe(true);
  const write=events.lastIndexOf('native.writer.success'),ready=events.indexOf('smoke-ready'),quit=events.indexOf('app.quit');
  expect(write).toBeGreaterThan(events.indexOf('smokeNamingV7'));expect(ready).toBeGreaterThan(write);expect(quit).toBeGreaterThan(ready);
  expect(fs.readdirSync(value.out)).toEqual(['naming-v7-smoke-result.json']);expect(fs.readdirSync(value.user)).toEqual([]);
 },30000);

 it('never marks ready or quits on smoke/result-write failure and exits1; validated error artifacts remain inside checked OUT',async()=>{
  for(const kind of ['smoke','write'] as const){
   const value=make('failure-'+kind);const result=await runEntry({env:value.env,smokeThrow:kind==='smoke',writeFailure:kind==='write'});
   expect(result.uncaught).toEqual([]);expect(result.exits).toContain(1);
   expect(names(result)).toContain('preflight.passed');expect(names(result)).toContain('smokeNamingV7');
   expect(names(result)).toContain('app.exit');
   expect(names(result)).not.toContain('smoke-ready');expect(names(result)).not.toContain('app.quit');
   expect(fs.existsSync(join(value.out,'naming-v7-smoke-result.json'))).toBe(false);
   expect(result.writes.every(file=>file.startsWith(value.out+parse(value.out).root.slice(-1)))).toBe(true);
   expect(fs.readdirSync(value.user)).toEqual([]);
  }
  for(const kind of ['env-changed','out-junction','artifact-input-hardlink'] as const){
   const value=make('post-ticket-'+kind);const alternate=join(value.root,'alternate');fs.mkdirSync(alternate);
   const result=await runEntry({env:value.env,afterPreflight:env=>{
    if(kind==='env-changed')env.NAMING_STUDIO_SMOKE_EXIT='0';
    if(kind==='out-junction'){fs.rmdirSync(value.out);fs.symlinkSync(alternate,value.out,'junction');}
    if(kind==='artifact-input-hardlink')fs.linkSync(value.sql,join(value.out,'smoke-error.txt'));
   },smokeThrow:kind==='artifact-input-hardlink'});
   expect(result.uncaught).toEqual([]);expect(names(result)).toContain('preflight.passed');expect(result.exits).toContain(1);
   expect(names(result)).not.toContain('smoke-ready');expect(names(result)).not.toContain('app.quit');
   expect(result.writes).toEqual([]);expect(result.attemptedWrites).toEqual([]);expect(fs.readdirSync(alternate)).toEqual([]);
   expect(sha(fs.readFileSync(value.sql))).toBe(SQL_SHA);
  }
 },30000);

 it('direct output mismatch rejects read-only; old seven branches retain their exact statements and route without v7 preflight',async()=>{
  const value=make('out-mismatch'),before=tree(value.root),mismatch=await runEntry({env:value.env,onlyPreflight:true,directOut:value.user});
  expect(mismatch.uncaught.join(' ')).toContain('输出参数与SMOKE不一致');expect(mismatch.writes).toEqual([]);expect(tree(value.root)).toEqual(before);
  const expected={
   'naming-v6':'3250026544cbf8424c8547fcfec422ed7ba6a5843049952bb78b446bc3b21aef',
   'naming-v5':'07b54d2b370298826d654e3fb40d758c240ef3150be51cd8ceed86b30f922ca0',
   'naming-readings':'d3557f2d63640c98d3cbdf94037e36115ea9d7a93eda81459d5b53e2437b63ca',
   'classics':'0401b7edde9544ee9cce5a49eaf526c71c4520644091a1e3f61cae88c51ae34b',
   'ren-directions':'788f06f769d7e2e402d5fb230a9869a1b89c12100655547a15a784c6e819d0b8',
   'yue-coverage':'3a523cd0e1f7147b7c46068e9106b05074fb243f523d2c6d7cd4f3b7022906f1',
   'ren-capacities':'69a5a6d3655ba63e4e6eed82a3059e5dc3767bfc2df21e207baabf47d2d1e75b',
  };
  const blocks=oldScopeBlocks(fs.readFileSync(productPaths().main,'utf8'));
  for(const [scope,digest] of Object.entries(expected)){
   expect(sha(blocks[scope])).toBe(digest);
   const old=make('old-'+scope);old.env.NAMING_STUDIO_SMOKE_SCOPE=scope;delete old.env.NAMING_STUDIO_V7_LEGACY_SQL;delete old.env.NAMING_STUDIO_V7_LEGACY_PROVENANCE;
   const result=await runEntry({env:old.env});expect(result.uncaught).toEqual([]);expect(names(result)).not.toContain('preflight.begin');expect(names(result)).not.toContain('smokeNamingV7');expect(names(result)).toContain('smoke-ready');expect(names(result)).toContain('app.quit');
  }
 },30000);
});
