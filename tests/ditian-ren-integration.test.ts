import {afterEach,beforeAll,describe,it,expect} from 'vitest';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import initSqlJs from 'sql.js';
import {Store,validSession} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {analyzeProfile} from '../src/domain/engine';
import {normalizePreferences,namingInputKey,isSessionCurrent} from '../src/shared/workflow';
import {sessionReferencedSourceIds} from '../src/shared/session-sources';
import {DITIAN_REN_SOURCE_ID,loadDitianRenSources} from '../src/main/ditian-ren-data';
import {REN_METHOD,normalizeRenMethod} from '../src/shared/ren-method';
import {formDraftKey,validateBirthDraft} from '../src/renderer/ui-state';
import {ditianRenReport} from '../src/main/ditian-ren-report';
import type {BirthProfile,NamingSession} from '../src/shared/types';
const profile:BirthProfile={id:'ren-independent-storage',customerName:'独立任注隔离验收',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'1914-11-25',birthTime:'13:30:00',timeUnknown:false,leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:'',renMethod:REN_METHOD};
const preferences=normalizePreferences({requiredChars:'安宁',zodiacRules:false});
const wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm'),directories:string[]=[],stores:Store[]=[];
let SQL:Awaited<ReturnType<typeof initSqlJs>>;
beforeAll(async()=>{SQL=await initSqlJs({locateFile:()=>wasm});});
async function open(){const directory=mkdtempSync(join(tmpdir(),'ditian-ren-storage-'));directories.push(directory);const store=await new Store(directory,resolve('data'),wasm).init();stores.push(store);return{store,service:new StudioService(store,{read:()=>'',write:()=>{}},false)};}
async function setup(input=profile){const{store,service}=await open();return{store,service,session:(await service.generate(input,preferences)).session};}
const bytes=(store:Store)=>readFileSync(join(store.userDir,'customers.sqlite'));
const find=(store:Store,id:string)=>store.rows<NamingSession>('sessions').find(session=>session.id===id)!;
afterEach(()=>{for(const store of stores.splice(0))store.db.close();for(const dir of directories.splice(0))rmSync(dir,{recursive:true,force:true});});

describe('independent Ren profile storage and source binding',{ timeout: 15_000 }, ()=>{
 it('generates a real birth-date chart matching the exact source example without changing prior Bazi/Qimen or naming preferences',async()=>{
  const{service,session}=await setup(),ren=session.analysis.renCommentary!;
  expect(session.analysis.bazi.pillars.map(p=>p.gan+p.zhi)).toEqual(['甲寅','乙亥','乙卯','癸未']);
  expect(ren.sourceCaseMatches.some(item=>item.caseId==='strong-wood-yes')).toBe(true);expect(ren.formationDecision).toBe('source-case-only');
  const plain=analyzeProfile({...profile,renMethod:'none'});expect({...session.analysis.bazi,version:plain.bazi.version}).toEqual(plain.bazi);expect(session.analysis.qimen).toEqual(plain.qimen);
  expect(session.analysis.bazi.version).toContain('/1.11.0;');expect(plain.bazi.version).toContain('/1.9.0;');
  expect(session.sourceSnapshot!.sources.filter(source=>source.id===DITIAN_REN_SOURCE_ID)).toEqual(loadDitianRenSources(resolve('data')));
  expect(sessionReferencedSourceIds(session)).toContain(DITIAN_REN_SOURCE_ID);expect(validSession(session)).toBe(true);
  expect(service.bootstrap().sources.some(source=>source.id===DITIAN_REN_SOURCE_ID)).toBe(true);
 });
 it('keeps source labels, graph dependencies, historical reviews and reports through separate-store restore',async()=>{
  const{store,service,session}=await setup(),original=structuredClone(session.analysis.renCommentary);
  const saved=service.saveSession({...structuredClone(session),reviewNote:'任注解释独立留存'}),history=service.listHistory(saved.id)[0];
  expect(history.session.analysis.renCommentary).toEqual(original);
  const restored=service.restoreHistory(saved.id,history.id,saved.reviewRevision,saved.reviewToken);expect(restored.analysis.renCommentary).toEqual(original);
  const destination=await open();destination.store.restore(store.backupBytes());const imported=find(destination.store,saved.id);
  expect(imported.analysis).toEqual(session.analysis);expect(imported.sourceSnapshot).toEqual(session.sourceSnapshot);
  const html=ditianRenReport(imported.analysis.renCommentary);expect(html).toContain('原作者');expect(html).toContain('strong-wood-yes');expect(html).toContain('有效作用：未裁决');
 });
 it('keeps unknown solar day and hour unknown rather than matching a representative noon example',async()=>{
  const{store,session}=await setup({...profile,birthDate:'2024-02-10',timeUnknown:true,birthTime:'',timeBasis:'apparent-solar',birthLongitude:87.6168});
  const ren=session.analysis.renCommentary!;expect(session.analysis.bazi.evidence).toBeUndefined();expect(ren.input.dayStem).toBeUndefined();expect(ren.input.complete).toBe(false);
  expect(ren.sourceCaseMatches).toEqual([]);expect(ren.formationDecision).toBe('unresolved');expect(ren.observations.some(item=>item.state==='unknown')).toBe(true);
  const destination=await open();destination.store.restore(store.backupBytes());expect(find(destination.store,session.id).analysis.renCommentary).toEqual(ren);
 });
 it('leaves unselected old1.9 sessions without the optional profile and without backfilled sources',async()=>{
  const{store,service,session}=await setup({...profile,renMethod:undefined});
  expect(session.analysis.renCommentary).toBeUndefined();expect(session.sourceSnapshot!.sources.some(source=>source.id===DITIAN_REN_SOURCE_ID)).toBe(false);
  const saved=service.saveSession({...session,reviewNote:'保留原方案'});store.restore(store.backupBytes());
  expect(find(store,saved.id).analysis.renCommentary).toBeUndefined();expect(ditianRenReport()).toBe('');
 });
 const tamperCases:{name:string;edit:(session:NamingSession)=>void}[]=[
  {name:'profile payload deleted',edit:s=>{delete s.analysis.renCommentary;}},
  {name:'profile result and selection both removed but modern version retained',edit:s=>{delete s.analysis.renCommentary;delete s.profile.renMethod;}},
  {name:'downgraded Bazi label with Ren payload',edit:s=>{s.analysis.bazi.version='civil-midnight-fuyi-candidate/1.9.0;lunar-typescript/1.8.6';}},
  {name:'retained Ren source after removing independent result and selection',edit:s=>{delete s.analysis.renCommentary;delete s.profile.renMethod;s.analysis.bazi.version='civil-midnight-fuyi-candidate/1.9.0;lunar-typescript/1.8.6';}},
  {name:'profile selection deleted but result retained',edit:s=>{delete s.profile.renMethod;}},
  {name:'source manifest removed',edit:s=>{delete s.sourceSnapshot;}},
  {name:'fixed source entry omitted',edit:s=>{s.sourceSnapshot!.sources=s.sourceSnapshot!.sources.filter(source=>source.id!==DITIAN_REN_SOURCE_ID);}},
  {name:'fixed source identity forged',edit:s=>{s.sourceSnapshot!.sources.find(source=>source.id===DITIAN_REN_SOURCE_ID)!.commit='forged';}},
  {name:'author case relabelled',edit:s=>{s.analysis.renCommentary!.sourceCaseMatches[0].authorAssertion='全部从格成立';}},
  {name:'unresolved dependency removed',edit:s=>{s.analysis.renCommentary!.structureGraph.edges[0].dependencies=[];}},
  {name:'effective action promoted',edit:s=>{(s.analysis.renCommentary!.structureGraph.edges[0] as any).effectiveAction='effective';}},
  {name:'unresolved conditions erased',edit:s=>{s.analysis.renCommentary!.unresolvedConditions=[];}},
 ];
 it.each(tamperCases)('rejects $name without changing current SQLite bytes',async test=>{
  const{store,session}=await setup(),before=bytes(store),archive=new SQL.Database(store.backupBytes());
  try{const value=structuredClone(session);test.edit(value);archive.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(value),value.id]);expect(()=>store.restore(archive.export())).toThrow();}
  finally{archive.close();}
  expect(bytes(store).equals(before)).toBe(true);expect(find(store,session.id)).toEqual(session);
 });
});

describe('Ren method input and stale draft boundaries',()=>{
 it('treats absent selection as none and changing profile selection invalidates the saved result',()=>{
  const absent={...profile,renMethod:undefined},none={...profile,renMethod:'none' as const};
  expect(normalizeRenMethod(undefined)).toBe('none');expect(namingInputKey(absent,preferences)).toBe(namingInputKey(none,preferences));expect(formDraftKey(absent,preferences)).toBe(formDraftKey(none,preferences));
  expect(namingInputKey(profile,preferences)).not.toBe(namingInputKey(none,preferences));
  expect(isSessionCurrent(none,preferences,{profile,profileId:profile.id,preferences} as NamingSession)).toBe(false);
  expect(validateBirthDraft({...profile,renMethod:'forged' as any}).renMethod).toContain('无效');expect(()=>normalizeRenMethod('forged')).toThrow();
 });
});
