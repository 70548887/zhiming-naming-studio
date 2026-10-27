import {afterEach,describe,it,expect} from 'vitest';
import {mkdtempSync,readFileSync,rmSync,cpSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import initSqlJs from 'sql.js';
import fixture from './fixtures/numerology-session-1.0.22.json';
import {loadNumerologyData,verifyNumerologyProvenance} from '../src/main/numerology-data';
import {analyzeNumerology} from '../src/domain/numerology';
import {Store} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {reportHTML} from '../src/main/report';
import type {NamingSession} from '../src/shared/types';
const wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm'),dirs:string[]=[],stores:Store[]=[];
const resources=loadNumerologyData(resolve('data'));
const original=()=>structuredClone(fixture.session) as NamingSession;
async function open(){const dir=mkdtempSync(join(tmpdir(),'kangxi-history-'));dirs.push(dir);const store=await new Store(dir,resolve('data'),wasm).init();stores.push(store);return{store,service:new StudioService(store,{read:()=>'',write:()=>{}},false)};}
afterEach(()=>{for(const store of stores.splice(0))store.db.close();for(const dir of dirs.splice(0))rmSync(dir,{recursive:true,force:true});});

describe('published Kangxi v1 history survives the779-character v2 upgrade', { timeout: 15_000 },()=>{
 it('preserves every numerical field and report across real old-session save/history/backup restore',async()=>{
  const{store,service}=await open(),old=original(),numeric=structuredClone(old.candidates.map(c=>c.numerology));
  store.saveProfile(old.profile);const saved=store.saveSession(old);
  expect(saved.candidates.map(c=>c.numerology)).toEqual(numeric);expect(saved.candidates.some(c=>c.numerology!.grids.some(g=>g.interpretation))).toBe(true);
  const before=reportHTML(saved,service.bootstrap().settings),reviewed=service.saveSession({...saved,reviewNote:'保留原字形与数理解释'});
  expect(service.listHistory(reviewed.id)[0].session.candidates.map(c=>c.numerology)).toEqual(numeric);
  const destination=await open();destination.store.restore(store.backupBytes());const restored=destination.store.rows<NamingSession>('sessions')[0];
  expect(restored.candidates.map(c=>c.numerology)).toEqual(numeric);expect(restored.candidates.some(c=>c.numerology!.warnings.some(w=>w.includes('历史数理资料版本未在当前安装包')))).toBe(false);
  expect(reportHTML({...restored,reviewNote:saved.reviewNote},destination.service.bootstrap().settings)).toBe(before);
 });
 it('retains a genuinely missing old glyph while the new data can compute its sourced strokes',()=>{
  const old=resources.historicalStrokes!.find(data=>data.version==='kangxi-radical-candidates-2026.10.18-v1')!;
  const numeric=analyzeNumerology('林','厚',old,resources.rules),snapshot=structuredClone(numeric);
  expect(numeric.strokes[1].status).toBe('missing');verifyNumerologyProvenance(numeric,resources);expect(numeric).toEqual(snapshot);
  const current=analyzeNumerology('林','厚',resources.strokes,resources.rules);
  expect(current.strokes[1].status).toBe('selected');expect(current.strokes[1].options[0]).toMatchObject({glyph:'厚',count:9,sourceId:'breezy-kangxi-radicals'});expect(current.status).toBe('complete');
 });
 it('rejects modified old selected records and interpretations against the frozen source',()=>{
  const candidate=original().candidates.find(c=>c.numerology?.grids.some(g=>g.interpretation))!,a=structuredClone(candidate.numerology!),b=structuredClone(a);
  a.strokes[0].options[0].sourceLocator='forged';expect(()=>verifyNumerologyProvenance(a,resources)).toThrow('记录');
  b.grids[0].interpretation!.keyword='伪造';expect(()=>verifyNumerologyProvenance(b,resources)).toThrow('分类');
 });
 it('rejects a missing or altered historical archive without accepting it as unverified legacy',()=>{
  const dir=mkdtempSync(join(tmpdir(),'kangxi-archive-check-'));dirs.push(dir);
  for(const file of ['numerology-strokes.json','numerology-source-lock.json','numerology-rules.json','numerology-rules-lock.json'])cpSync(resolve('data',file),join(dir,file));
  expect(()=>loadNumerologyData(dir)).toThrow('历史笔画资料缺失');cpSync(resolve('data/numerology-history'),join(dir,'numerology-history'),{recursive:true});
  expect(loadNumerologyData(dir).historicalStrokes).toHaveLength(1);
  const target=join(dir,'numerology-history/kangxi-20261018-v1/numerology-strokes.json');writeFileSync(target,readFileSync(target,'utf8')+' ');expect(()=>loadNumerologyData(dir)).toThrow('历史笔画资料校验失败');
 });
 it('rejects forged original numerical content in a backup without changing the current database',async()=>{
  const{store}=await open(),old=original();store.saveProfile(old.profile);const saved=store.saveSession(old),before=readFileSync(join(store.userDir,'customers.sqlite'));
  const SQL=await initSqlJs({locateFile:()=>wasm}),database=new SQL.Database(store.backupBytes());
  try{const bad=structuredClone(saved);bad.candidates[0].numerology!.strokes[0].options[0].note='forged frozen note';database.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(bad),bad.id]);expect(()=>store.restore(database.export())).toThrow();}finally{database.close();}
  expect(readFileSync(join(store.userDir,'customers.sqlite')).equals(before)).toBe(true);
 });
});
