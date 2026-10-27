import {afterEach,describe,expect,it} from 'vitest';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import initSqlJs from 'sql.js';
import {Store} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {reportHTML} from '../src/main/report';
import {calculateBaziV5} from '../src/domain/bazi-v5';
import {calculateQimenProfileV3} from '../src/domain/engine-v7';
import {normalizePreferences} from '../src/shared/workflow';
import type {BirthProfile,NamingSession} from '../src/shared/types';
const dirs:string[]=[],stores:Store[]=[],wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm');
const profile:BirthProfile={id:'from-wealth-workflow',customerName:'月别条件回归',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2029-06-24',birthTime:'03:30:00',timeUnknown:false,leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:''};
async function open(){const directory=mkdtempSync(join(tmpdir(),'following-integration-116-'));dirs.push(directory);const store=await new Store(directory,resolve('data'),wasm).init();stores.push(store);return {store,service:new StudioService(store,{read:()=>'',write:()=>{}},false)};}
async function changed(bytes:Uint8Array,id:string,mutate:(s:NamingSession)=>void){const SQL=await initSqlJs({locateFile:()=>wasm}),db=new SQL.Database(bytes);try{const s=JSON.parse(String(db.exec('SELECT json FROM sessions WHERE id=?',[id])[0].values[0][0]));mutate(s);db.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(s),id]);return db.export();}finally{db.close();}}
afterEach(()=>{stores.splice(0).forEach(s=>s.db.close());dirs.splice(0).forEach(d=>rmSync(d,{recursive:true,force:true}));});
describe('month-specific following facts remain scoped in stored workflows',{ timeout: 15_000 }, ()=>{
 it('preserves a literal-clause candidate with its unresolved scope through review, history and backup',async()=>{
  const{store,service}=await open(),s=(await service.generate(profile,normalizePreferences({requiredChars:'安宁',zodiacRules:false}))).session;
  const check=s.analysis.bazi.evidence!.patternEvidence!.checks.find(c=>c.applicability==='applicable')!;expect(check.status).toBe('candidate');expect(check.candidateBasis).toBe('literal-clause-only');expect(check.missing.length).toBeGreaterThan(0);expect(s.analysis.bazi.evidence!.patternCandidates[0].status).toBe('not-evaluated');
  const source=s.sourceSnapshot!.sources.find(x=>x.id==='bazi-cong-wealth-qiongtong-2294674');expect(source).toBeDefined();const originalFavorable=[...s.analysis.bazi.favorable];
  const saved=service.saveSession({...s,reviewNote:'仅按本条软件字面条件复核'}),revision=service.listHistory(s.id)[0];service.restoreHistory(s.id,revision.id,saved.reviewRevision,saved.reviewToken);
  const other=await open();other.store.restore(store.backupBytes());const restored=other.store.rows<NamingSession>('sessions')[0];expect(restored.analysis.bazi.evidence!.patternEvidence).toEqual(s.analysis.bazi.evidence!.patternEvidence);expect(restored.analysis.bazi.favorable).toEqual(originalFavorable);
  const html=reportHTML(restored,other.service.bootstrap().settings);expect(html).toContain('字面条件候选 · 供人工复核');expect(html).toContain('不是已成真从');expect(html).toContain(source!.commit);expect(html).toContain(source!.sha256);
 });
 it('keeps unknown-time necessary absence pending and identifies a known extra exposed stem only within its own clause',async()=>{
  const{service}=await open(),unknown=service.analyze({...profile,timeUnknown:true,birthTime:''}).bazi.evidence!.patternEvidence!;
  const pending=unknown.checks.find(c=>c.applicability==='applicable')!;expect(pending.status).toBe('pending');expect(pending.criteria.some(c=>c.result==='unknown')).toBe(true);
  const contra=service.analyze({...profile,birthDate:'2020-03-08',birthTime:'01:30'}).bazi.evidence!.patternEvidence!.checks.find(c=>c.applicability==='applicable')!;expect(contra.status).toBe('contradicted');expect(contra.opposedBy.length).toBeGreaterThan(0);expect(contra.name).toContain('庚');
 });
 it('rejects altered source metadata, fabricated status/criterion evidence and deletion while retaining exact current bytes',async()=>{
  const{store,service}=await open(),s=(await service.generate(profile,normalizePreferences({requiredChars:'安宁',zodiacRules:false}))).session,backup=store.backupBytes(),disk=readFileSync(join(store.userDir,'customers.sqlite'));
  for(const mutate of [(v:NamingSession)=>{v.sourceSnapshot!.sources.find(source=>source.id==='bazi-cong-wealth-qiongtong-2294674')!.commit='forged';},(v:NamingSession)=>{v.analysis.bazi.evidence!.patternEvidence!.checks.find(c=>c.applicability==='applicable')!.status='contradicted';},(v:NamingSession)=>{v.analysis.bazi.evidence!.patternEvidence!.checks.find(c=>c.applicability==='applicable')!.criteria[0].result='not-met';},(v:NamingSession)=>{delete v.analysis.bazi.evidence!.patternEvidence;}]){
   const bad=await changed(backup,s.id,mutate);expect(()=>store.restore(bad)).toThrow('字段不完整');expect(readFileSync(join(store.userDir,'customers.sqlite')).equals(disk)).toBe(true);
  }
 });
 it('retains frozen1.5 without adding new fields or source metadata during restore and export',async()=>{
  const{store,service}=await open(),s=(await service.generate(profile,normalizePreferences({requiredChars:'安宁',zodiacRules:false}))).session;
  const old=await changed(store.backupBytes(),s.id,value=>{value.analysis.bazi=calculateBaziV5(value.profile);value.analysis.qimen=calculateQimenProfileV3(value.profile);value.originalFavorable=[...value.analysis.bazi.favorable];value.sourceSnapshot!.sources=value.sourceSnapshot!.sources.filter(source=>source.id!=='bazi-cong-wealth-qiongtong-2294674');});store.restore(old);
  const restored=store.rows<NamingSession>('sessions')[0];expect(restored.analysis.bazi.evidence!.patternEvidence).toBeUndefined();expect(restored.sourceSnapshot!.sources.some(source=>source.id==='bazi-cong-wealth-qiongtong-2294674')).toBe(false);expect(reportHTML(restored,service.bootstrap().settings)).toContain('不补入当前规则');
 });
});
