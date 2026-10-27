import {afterEach,beforeAll,describe,it,expect} from 'vitest';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import initSqlJs from 'sql.js';
import oldFixture from './fixtures/ren-session-1.0.22.json';
import {Store,validSession} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {analyzeProfile} from '../src/domain/engine';
import {REN_METHOD,LEGACY_REN_METHOD} from '../src/shared/ren-method';
import {normalizePreferences} from '../src/shared/workflow';
import {REN_NECESSARY_SOURCE_ID,loadRenNecessarySources} from '../src/main/ren-necessary-data';
import {sessionReferencedSourceIds} from '../src/shared/session-sources';
import type {BirthProfile,NamingSession} from '../src/shared/types';
const base:BirthProfile={...oldFixture.session.profile,id:'necessary-integration',renMethod:REN_METHOD,birthDate:'2020-01-04',birthTime:'00:30:00'} as BirthProfile;
const pref=normalizePreferences({requiredChars:'安宁',zodiacRules:false}),wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm');
const dirs:string[]=[],stores:Store[]=[];let SQL:Awaited<ReturnType<typeof initSqlJs>>;
beforeAll(async()=>{SQL=await initSqlJs({locateFile:()=>wasm});});
async function open(){const dir=mkdtempSync(join(tmpdir(),'ren-necessary-store-'));dirs.push(dir);const store=await new Store(dir,resolve('data'),wasm).init();stores.push(store);return{store,service:new StudioService(store,{read:()=>'',write:()=>{}},false)};}
async function setup(p=base){const{store,service}=await open();return{store,service,session:(await service.generate(p,pref)).session};}
const find=(store:Store,id:string)=>store.rows<NamingSession>('sessions').find(s=>s.id===id)!;
afterEach(()=>{for(const store of stores.splice(0))store.db.close();for(const dir of dirs.splice(0))rmSync(dir,{recursive:true,force:true});});

describe('Ren1.1 real necessary-condition decisions and unchanged1.0 history',{ timeout: 15_000 }, ()=>{
 it('saves a complete no-wealth contradiction and keeps its scope/source through review/history/backup',async()=>{
  const{store,service,session}=await setup(),conditions=session.analysis.renCommentary!.necessaryConditions!;
  expect(session.analysis.bazi.version).toContain('/1.11.0;');expect(conditions.checks[0].status).toBe('contradicted');expect(conditions.checks[1].status).toBe('not-excluded');expect(validSession(session)).toBe(true);
  expect(sessionReferencedSourceIds(session)).toContain(REN_NECESSARY_SOURCE_ID);expect(session.sourceSnapshot!.sources.filter(source=>source.id===REN_NECESSARY_SOURCE_ID)).toEqual(loadRenNecessarySources(resolve('data')));
  const saved=service.saveSession({...session,reviewNote:'只反证本条缺财必要字面前提'}),revision=service.listHistory(saved.id)[0];
  expect(revision.session.analysis.renCommentary!.necessaryConditions).toEqual(conditions);
  const restored=service.restoreHistory(saved.id,revision.id,saved.reviewRevision,saved.reviewToken);expect(restored.analysis.renCommentary!.necessaryConditions).toEqual(conditions);
  const destination=await open();destination.store.restore(store.backupBytes());expect(find(destination.store,session.id).analysis).toEqual(session.analysis);
 },15000);
 it('records actual no-output, positive hidden wealth and unknown-day inputs separately',async()=>{
  const{service}=await open();
  const absent=(await service.generate({...base,id:'output-absent',birthDate:'2020-03-13',birthTime:'06:30:00'},pref)).session;
  expect(absent.analysis.renCommentary!.necessaryConditions!.checks[1].status).toBe('contradicted');
  const positive=(await service.generate({...base,id:'child-source-positive',birthDate:'1902-11-24',birthTime:'07:30:00'},pref)).session;
  expect(positive.analysis.renCommentary!.sourceCaseMatches.some(c=>c.caseId==='child-xin-winter-1')).toBe(true);expect(positive.analysis.renCommentary!.necessaryConditions!.checks.every(c=>c.status==='not-excluded')).toBe(true);
  const unknown=(await service.generate({...base,id:'necessary-unknown',birthDate:'2024-02-10',timeUnknown:true,birthTime:'',timeBasis:'apparent-solar',birthLongitude:87.6168},pref)).session;
  expect(unknown.analysis.renCommentary!.necessaryConditions!.checks.every(c=>c.status==='unknown')).toBe(true);expect(unknown.analysis.renCommentary!.sourceCaseMatches).toEqual([]);
 });
 it('retains the original published1.0 analysis byte-for-byte without new fields or source when reviewed and restored',async()=>{
  const{store,service}=await open(),old=structuredClone(oldFixture.session) as NamingSession;
  store.saveProfile(old.profile);const saved=store.saveSession(old);expect(saved.profile.renMethod).toBe(LEGACY_REN_METHOD);expect(saved.analysis).toEqual(old.analysis);
  expect(saved.analysis.renCommentary!.necessaryConditions).toBeUndefined();expect(saved.sourceSnapshot!.sources.some(s=>s.id===REN_NECESSARY_SOURCE_ID)).toBe(false);
  const reviewed=service.saveSession({...saved,reviewNote:'按原1.0取法留存'});store.restore(store.backupBytes());expect(find(store,reviewed.id).analysis).toEqual(old.analysis);
  const current=analyzeProfile({...old.profile,renMethod:REN_METHOD});expect(current.renCommentary!.necessaryConditions).toBeDefined();expect(current.bazi.version).toContain('/1.11.0;');
 });
 const changes:{name:string;edit:(s:NamingSession)=>void}[]=[
  {name:'conditions deletion',edit:s=>{delete s.analysis.renCommentary!.necessaryConditions;}},
  {name:'false not-excluded',edit:s=>{s.analysis.renCommentary!.necessaryConditions!.checks[0].status='not-excluded';}},
  {name:'quote replacement',edit:s=>{s.analysis.renCommentary!.necessaryConditions!.checks[0].sourceQuote='无来源判词';}},
  {name:'necessary source omission',edit:s=>{s.sourceSnapshot!.sources=s.sourceSnapshot!.sources.filter(source=>source.id!==REN_NECESSARY_SOURCE_ID);}},
  {name:'old method graft with new source',edit:s=>{s.profile.renMethod=LEGACY_REN_METHOD;s.analysis=analyzeProfile(s.profile);}},
  {name:'version downgrade with current conditions',edit:s=>{s.analysis.bazi.version='civil-midnight-fuyi-candidate/1.10.0;lunar-typescript/1.8.6';}},
 ];
 it.each(changes)('rejects $name without changing saved bytes',async change=>{
  const{store,session}=await setup(),before=readFileSync(join(store.userDir,'customers.sqlite')),db=new SQL.Database(store.backupBytes());
  try{const bad=structuredClone(session);change.edit(bad);db.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(bad),bad.id]);expect(()=>store.restore(db.export())).toThrow();}finally{db.close();}
  expect(readFileSync(join(store.userDir,'customers.sqlite')).equals(before)).toBe(true);expect(find(store,session.id)).toEqual(session);
 });
});
