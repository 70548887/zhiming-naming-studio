import {afterEach,describe,expect,it} from 'vitest';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import initSqlJs from 'sql.js';
import {Store} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {reportHTML} from '../src/main/report';
import {normalizePreferences} from '../src/shared/workflow';
import {calculateBaziV4} from '../src/domain/bazi-v4';
import {calculateQimenProfileV3} from '../src/domain/engine-v7';
import type {BirthProfile,NamingSession} from '../src/shared/types';
const wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm'),stores:Store[]=[],dirs:string[]=[];
const profile:BirthProfile={id:'supplement-history',customerName:'条件补充联验',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-09-08',birthTime:'12:00',leapMonth:false,timeUnknown:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:'',seasonalMethod:'qiongtong-2294674-initial/1.0.0'};
async function setup(){const dir=mkdtempSync(join(tmpdir(),'seasonal-supplement-115-'));dirs.push(dir);const store=await new Store(dir,resolve('data'),wasm).init();stores.push(store);return {store,service:new StudioService(store,{read:()=>'',write:()=>{}},false)};}
async function edit(bytes:Uint8Array,id:string,fn:(session:NamingSession)=>void){const SQL=await initSqlJs({locateFile:()=>wasm}),db=new SQL.Database(bytes);try{const row=db.exec('SELECT json FROM sessions WHERE id=?',[id])[0].values[0];const session=JSON.parse(String(row[0]));fn(session);db.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(session),id]);return db.export();}finally{db.close();}}
afterEach(()=>{stores.splice(0).forEach(s=>s.db.close());dirs.splice(0).forEach(d=>rmSync(d,{recursive:true,force:true}));});
describe('seasonal supplemental facts remain scoped across persistence and delivery',{ timeout: 15_000 }, ()=>{
 it('keeps the original unimplemented branch while saving time prerequisites and their fixed source through review/history/backup',async()=>{
  const{store,service}=await setup(),s=(await service.generate(profile,normalizePreferences({requiredChars:'和乐',zodiacRules:false}))).session;
  const sup=s.analysis.bazi.evidence!.seasonalConditions!;expect(sup.checks).toHaveLength(2);expect(sup.checks.map(c=>c.status)).toEqual(['met','not-met']);expect(s.analysis.bazi.evidence!.monthlySeasonal!.cases[0].conditionBranches[0].result).toBe('not-implemented');
  const source=s.sourceSnapshot!.sources.find(x=>x.id==='bazi-monthly-qiongtong-2294674-conditions');expect(source).toBeDefined();
  const saved=service.saveSession({...s,reviewNote:'仅时间前提'}),old=service.listHistory(s.id)[0];service.restoreHistory(s.id,old.id,saved.reviewRevision,saved.reviewToken);
  const second=await setup();second.store.restore(store.backupBytes());const restored=second.store.rows<NamingSession>('sessions')[0];expect(restored.analysis.bazi.evidence!.seasonalConditions).toEqual(sup);
  const html=reportHTML(restored,second.service.bootstrap().settings);expect(html).toContain('仅时间前提成立，原条件仍待复核');expect(html).toContain(source!.commit);expect(html).toContain(source!.sha256);
 });
 it('retains both sides of a real unknown-time autumn equinox date and never supplies a unique original prescription',async()=>{
  const{service}=await setup(),s=(await service.generate({...profile,birthDate:'2025-09-23',birthTime:'',timeUnknown:true},normalizePreferences({requiredChars:'和乐',zodiacRules:false}))).session;
  const checks=s.analysis.bazi.evidence!.seasonalConditions!.checks;expect(checks).toHaveLength(2);expect(checks.every(c=>c.status==='uncertain'&&c.observations.length===2&&c.doesNotResolveOriginalBranch)).toBe(true);
  expect(s.analysis.bazi.evidence!.monthlySeasonal!.proposedElements).toEqual([]);expect(reportHTML(s,service.bootstrap().settings)).toContain('区间有多种可能');
 });
 it('rejects altered fixed metadata, fabricated time statuses, removed observations or deleted current supplement without changing current bytes',async()=>{
  const{store,service}=await setup(),s=(await service.generate(profile,normalizePreferences({requiredChars:'和乐',zodiacRules:false}))).session,good=store.backupBytes(),disk=readFileSync(join(store.userDir,'customers.sqlite'));
  for(const mutate of [(v:NamingSession)=>{v.sourceSnapshot!.sources.find(source=>source.id==='bazi-monthly-qiongtong-2294674-conditions')!.url='https://example.test/forged';},(v:NamingSession)=>{v.analysis.bazi.evidence!.seasonalConditions!.checks[0].status='not-met';},(v:NamingSession)=>{v.analysis.bazi.evidence!.seasonalConditions!.checks[0].observations=[];},(v:NamingSession)=>{delete v.analysis.bazi.evidence!.seasonalConditions;}]){
   expect(()=>store.restore(new Uint8Array())).toThrow();const bad=await edit(good,s.id,mutate);expect(()=>store.restore(bad)).toThrow('字段不完整');expect(readFileSync(join(store.userDir,'customers.sqlite')).equals(disk)).toBe(true);
  }
 });
 it('preserves a frozen 1.4 record without adding new evidence or today\'s source registration',async()=>{
  const{store,service}=await setup(),s=(await service.generate(profile,normalizePreferences({requiredChars:'和乐',zodiacRules:false}))).session;
  const legacy=await edit(store.backupBytes(),s.id,value=>{value.analysis.bazi=calculateBaziV4(value.profile);value.analysis.qimen=calculateQimenProfileV3(value.profile);value.originalFavorable=[...value.analysis.bazi.favorable];value.sourceSnapshot!.sources=value.sourceSnapshot!.sources.filter(source=>source.id!=='bazi-monthly-qiongtong-2294674-conditions');});
  store.restore(legacy);const restored=store.rows<NamingSession>('sessions')[0];expect(restored.analysis.bazi.evidence!.seasonalConditions).toBeUndefined();expect(restored.sourceSnapshot!.sources.some(source=>source.id==='bazi-monthly-qiongtong-2294674-conditions')).toBe(false);expect(reportHTML(restored,service.bootstrap().settings)).toContain('不补入当前规则');
 });
});
