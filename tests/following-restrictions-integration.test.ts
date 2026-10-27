import {afterEach,beforeAll,describe,it,expect} from 'vitest';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import initSqlJs from 'sql.js';
import {Store,validSession} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {analyzeProfileV8} from '../src/domain/engine-v8';
import {normalizePreferences} from '../src/shared/workflow';
import {sessionReferencedSourceIds} from '../src/shared/session-sources';
import {FOLLOWING_RESTRICTIONS_SOURCE_ID,loadFollowingRestrictionsSources} from '../src/main/following-restrictions-data';
import {followingRestrictionsReport} from '../src/main/following-restrictions-report';
import {classicDisplay} from '../src/shared/classic-display';
import type {BirthProfile,NamingSession} from '../src/shared/types';
const profile:BirthProfile={id:'following-restrictions-storage',customerName:'月份限制隔离验收',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'09:30:00',timeUnknown:false,leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:''};
const wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm'),directories:string[]=[],stores:Store[]=[];
let SQL:Awaited<ReturnType<typeof initSqlJs>>;
beforeAll(async()=>{SQL=await initSqlJs({locateFile:()=>wasm});});
async function open(){const directory=mkdtempSync(join(tmpdir(),'following-restrictions-121-'));directories.push(directory);const store=await new Store(directory,resolve('data'),wasm).init();stores.push(store);return{store,service:new StudioService(store,{read:()=>'',write:()=>{}},false)};}
async function setup(input=profile){const{store,service}=await open();return{store,service,session:(await service.generate(input,normalizePreferences({requiredChars:'知微',zodiacRules:false}))).session};}
const bytes=(store:Store)=>readFileSync(join(store.userDir,'customers.sqlite'));
const find=(store:Store,id:string)=>store.rows<NamingSession>('sessions').find(session=>session.id===id)!;
afterEach(()=>{for(const store of stores.splice(0))store.db.close();for(const dir of directories.splice(0))rmSync(dir,{recursive:true,force:true});});

describe('month restrictions through actual SQLite save/history/backup',{ timeout: 15_000 }, ()=>{
 it('captures its fixed source and preserves the clause through review, history and cross-store restoration',async()=>{
  const{store,service,session}=await setup(),original=structuredClone(session.analysis.bazi.monthFollowingRestrictions!);
  expect(original.checks[0].status).toBe('applies');expect(validSession(session)).toBe(true);
  expect(session.sourceSnapshot!.sources.filter(source=>source.id===FOLLOWING_RESTRICTIONS_SOURCE_ID)).toEqual(loadFollowingRestrictionsSources(resolve('data')));
  expect(sessionReferencedSourceIds(session)).toContain(FOLLOWING_RESTRICTIONS_SOURCE_ID);
  const saved=service.saveSession({...structuredClone(session),reviewNote:'按固定月份条文复核'});
  const history=service.listHistory(saved.id)[0];expect(history.session.analysis.bazi.monthFollowingRestrictions).toEqual(original);
  const restored=service.restoreHistory(saved.id,history.id,saved.reviewRevision,saved.reviewToken);
  expect(restored.analysis.bazi.monthFollowingRestrictions).toEqual(original);expect(restored.reviewNote).toBe('');
  const destination=await open();destination.store.restore(store.backupBytes());
  const imported=find(destination.store,saved.id);expect(imported.analysis.bazi.monthFollowingRestrictions).toEqual(original);
  expect(followingRestrictionsReport(imported.analysis.bazi.monthFollowingRestrictions)).toContain(classicDisplay(original.checks[0].sourceQuote));
 });
 it('stores missing-day restrictions and provenance without inventing evidence or a noon day master',async()=>{
  const{store,session}=await setup({...profile,birthTime:'',timeUnknown:true,timeBasis:'apparent-solar',birthLongitude:87.6168});
  expect(session.analysis.bazi.evidence).toBeUndefined();expect(session.analysis.bazi.monthFollowingRestrictions!.checks.every(check=>check.status==='pending')).toBe(true);
  expect(sessionReferencedSourceIds(session)).toContain(FOLLOWING_RESTRICTIONS_SOURCE_ID);
  const destination=await open();destination.store.restore(store.backupBytes());expect(find(destination.store,session.id).analysis).toEqual(session.analysis);
 });
 const tamperCases:{name:string;edit:(s:NamingSession)=>void}[]=[
  {name:'entire field deletion',edit:s=>{delete s.analysis.bazi.monthFollowingRestrictions;}},
  {name:'false applicability',edit:s=>{s.analysis.bazi.monthFollowingRestrictions!.checks[0].status='not-applicable';}},
  {name:'quote forgery',edit:s=>{s.analysis.bazi.monthFollowingRestrictions!.checks[0].sourceQuote='任意判词';}},
  {name:'source omitted',edit:s=>{s.sourceSnapshot!.sources=s.sourceSnapshot!.sources.filter(source=>source.id!==FOLLOWING_RESTRICTIONS_SOURCE_ID);}},
  {name:'source metadata forgery',edit:s=>{s.sourceSnapshot!.sources.find(source=>source.id===FOLLOWING_RESTRICTIONS_SOURCE_ID)!.commit='forged';}},
  {name:'version downgrading with field deletion',edit:s=>{s.analysis.bazi.version='civil-midnight-fuyi-candidate/1.8.0;lunar-typescript/1.8.6';delete s.analysis.bazi.monthFollowingRestrictions;}},
 ];
 it.each(tamperCases)('rejects $name without changing the database',async test=>{
  const{store,session}=await setup(),before=bytes(store),archive=new SQL.Database(store.backupBytes());
  try{const value=structuredClone(session);test.edit(value);archive.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(value),session.id]);expect(()=>store.restore(archive.export())).toThrow();}
  finally{archive.close();}
  expect(bytes(store).equals(before)).toBe(true);expect(find(store,session.id)).toEqual(session);
 });
 it('freezes original1.8 results across new reviews and restoration without backfilling the new source',async()=>{
  const{store,service,session}=await setup(),legacy=structuredClone(session);
  legacy.id='frozen-original-1.8';legacy.analysis=analyzeProfileV8(legacy.profile);legacy.originalFavorable=[...legacy.analysis.bazi.favorable];
  legacy.sourceSnapshot!.sources=legacy.sourceSnapshot!.sources.filter(source=>source.id!==FOLLOWING_RESTRICTIONS_SOURCE_ID);delete legacy.reviewRevision;delete legacy.reviewToken;
  const saved=store.saveSession(legacy),reviewed=service.saveSession({...saved,reviewNote:'按原版本留存'});
  store.restore(store.backupBytes());const restored=find(store,reviewed.id);
  expect(restored.analysis).toEqual(legacy.analysis);expect(restored.analysis.bazi.monthFollowingRestrictions).toBeUndefined();
  expect(restored.sourceSnapshot!.sources.some(source=>source.id===FOLLOWING_RESTRICTIONS_SOURCE_ID)).toBe(false);
  expect(followingRestrictionsReport(restored.analysis.bazi.monthFollowingRestrictions)).toBe('');
 });
});
