import {afterEach,describe,expect,it} from 'vitest';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import initSqlJs from 'sql.js';
import {Store} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {reportHTML} from '../src/main/report';
import {normalizePreferences} from '../src/shared/workflow';
import type {BirthProfile,NamingSession} from '../src/shared/types';
const stores:Store[]=[],dirs:string[]=[],wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm');
const p:BirthProfile={id:'qimen-tomb-integrated',customerName:'独立墓支表',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2026-10-17',birthTime:'09:30',leapMonth:false,timeUnknown:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:''};
async function open(){const dir=mkdtempSync(join(tmpdir(),'qimen-tombs-114-'));dirs.push(dir);const store=await new Store(dir,resolve('data'),wasm).init();stores.push(store);return{store,service:new StudioService(store,{read:()=>'',write:()=>{}},false)};}
async function edit(bytes:Uint8Array,id:string,mutation:(s:NamingSession)=>void){const SQL=await initSqlJs({locateFile:()=>wasm}),db=new SQL.Database(bytes);try{const row=db.exec('SELECT json FROM sessions WHERE id=?',[id])[0].values[0],s=JSON.parse(String(row[0]));mutation(s);db.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(s),id]);return db.export();}finally{db.close();}}
afterEach(()=>{stores.splice(0).forEach(s=>s.db.close());dirs.splice(0).forEach(d=>rmSync(d,{recursive:true,force:true}));});
describe('independent stem tomb provenance survives review, history and backups',{ timeout: 15_000 }, ()=>{
 it('retains separate findings, original three-Qi and the exact source through review and restore',async()=>{
  const{store,service}=await open(),s=(await service.generate(p,normalizePreferences({requiredChars:'安宁',zodiacRules:false}))).session;
  expect(s.analysis.qimen.stemTombs?.checks).toHaveLength(10);expect(s.analysis.qimen.patterns?.checks).toHaveLength(7);expect(s.sourceSnapshot?.sources.some(source=>source.id==='qimen-go-stem-tombs')).toBe(true);
  const saved=service.saveSession({...s,reviewNote:'分表复核'}),old=service.listHistory(s.id)[0];service.restoreHistory(s.id,old.id,saved.reviewRevision,saved.reviewToken);
  const second=await open();second.store.restore(store.backupBytes());const result=second.store.rows<NamingSession>('sessions')[0];
  expect(result.analysis.qimen.stemTombs).toEqual(s.analysis.qimen.stemTombs);expect(result.analysis.qimen.patterns).toEqual(s.analysis.qimen.patterns);
  const html=reportHTML(result,second.service.bootstrap().settings);expect(html).toContain('独立十干墓支表参考');expect(html).toContain('既有三奇规则乙入坤二');expect(html).toContain('qimen-go-stem-tombs');
 });
 it('rejects omitted/altered new provenance and check data without changing stored customer bytes',async()=>{
  const{store,service}=await open(),s=(await service.generate(p,normalizePreferences({requiredChars:'安宁',zodiacRules:false}))).session,good=store.backupBytes(),disk=readFileSync(join(store.userDir,'customers.sqlite'));
  for(const change of [(v:NamingSession)=>{v.sourceSnapshot!.sources=v.sourceSnapshot!.sources.filter(source=>source.id!=='qimen-go-stem-tombs');},(v:NamingSession)=>{v.sourceSnapshot!.sources.find(source=>source.id==='qimen-go-stem-tombs')!.commit='wrong';},(v:NamingSession)=>{v.analysis.qimen.stemTombs!.checks[1].targetPalace=2;},(v:NamingSession)=>{delete v.analysis.qimen.stemTombs;}]){
   const bad=await edit(good,s.id,change);expect(()=>store.restore(bad)).toThrow('字段不完整');expect(readFileSync(join(store.userDir,'customers.sqlite')).equals(disk)).toBe(true);
  }
 });
});
