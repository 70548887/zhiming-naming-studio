import {afterEach,beforeAll,describe,expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import initSqlJs from 'sql.js';
import published from './fixtures/ren-session-1.0.24.json';
import {Store,validSession} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {analyzeProfile} from '../src/domain/engine';
import {REN_ACTION_METHOD,REN_METHOD,LEGACY_REN_METHOD} from '../src/shared/ren-method';
import {normalizePreferences} from '../src/shared/workflow';
import {sessionReferencedSourceIds} from '../src/shared/session-sources';
import {REN_ACTIONS_SOURCE_ID} from '../src/domain/ren-actions';
import {loadRenActionsSources} from '../src/main/ren-actions-data';
import type {BirthProfile,NamingSession} from '../src/shared/types';
import type {RenActionAnalysis} from '../src/shared/ren-actions-types';

const NECESSARY_SOURCE='bazi-ditian-ren-necessary-2600158',BASE_SOURCE='bazi-ditian-ren-2600158';
const wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm'),directories:string[]=[],stores:Store[]=[];
const preferences=normalizePreferences({requiredChars:'安宁',zodiacRules:false});
const profile:BirthProfile={...published.sessions.v10.profile,id:'ren-actions-real',customerName:'任注动作真实存储验收',renMethod:REN_ACTION_METHOD} as BirthProfile;
let SQL:Awaited<ReturnType<typeof initSqlJs>>;
beforeAll(async()=>{SQL=await initSqlJs({locateFile:()=>wasm});});
const canonical=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const actions=(session:NamingSession):RenActionAnalysis=>session.analysis.renCommentary!.actionAnalysis!;
const bytes=(store:Store)=>readFileSync(join(store.userDir,'customers.sqlite'));
const current=(store:Store,id:string)=>store.rows<NamingSession>('sessions').find(session=>session.id===id)!;
async function open(directory?:string){const dir=directory??mkdtempSync(join(tmpdir(),'ren-actions-integration-'));if(!directory)directories.push(dir);const store=await new Store(dir,resolve('data'),wasm).init();stores.push(store);return {dir,store,service:new StudioService(store,{read:()=>'',write:()=>{}},false)};}
async function setup(input:BirthProfile=profile){const opened=await open(),generated=(await opened.service.generate(input,preferences)).session;return {...opened,session:current(opened.store,generated.id)};}
function close(store:Store){const index=stores.indexOf(store);if(index>=0)stores.splice(index,1);store.db.close();}
function editDatabase(database:initSqlJs.Database,table:'sessions'|'revisions',id:string|number,edit:(session:NamingSession)=>void){const row=database.exec(`SELECT json FROM ${table} WHERE id=?`,[id])[0]?.values[0]?.[0];if(typeof row!=='string')throw new Error('Expected actual stored row');const session=JSON.parse(row) as NamingSession;edit(session);database.run(`UPDATE ${table} SET json=? WHERE id=?`,[JSON.stringify(session),id]);}
function externallyEdit(directory:string,table:'sessions'|'revisions',id:string|number,edit:(session:NamingSession)=>void){const file=join(directory,'customers.sqlite'),database=new SQL.Database(readFileSync(file));try{editDatabase(database,table,id,edit);writeFileSync(file,database.export());}finally{database.close();}}
afterEach(()=>{for(const store of stores.splice(0))store.db.close();for(const directory of directories.splice(0))rmSync(directory,{recursive:true,force:true});});

describe('actual published1.0.24 snapshots remain complete and do not receive Ren1.2 fields or sources',{ timeout: 15_000 }, ()=>{
 it('freezes real installed SQLite rows and their complete analysis hashes rather than generating old expectations with the new calculator',()=>{
  expect(published.provenance.appVersion).toBe('1.0.24');expect(published.provenance.sourceRuntimeStatus).toBe('passed');
  expect(published.provenance.sourceInstallerSha256).toBe('6db7b61444cef06e07293d57ec85ed886bf76a8e050d0665077fce1ef42bfa07');
  expect(published.provenance.sourceDatabaseSha256).toBe('9b1e475234328c837378d6f9838f450f121da3a67314424e1cd4d9c6f3c14561');
  for(const record of published.provenance.records){const session=published.sessions[record.key as keyof typeof published.sessions];expect(digest(session)).toBe(record.sessionJsonSha256);expect(digest(session.analysis)).toBe(record.analysisJsonSha256);}
 });
 it.each(Object.keys(published.sessions) as Array<keyof typeof published.sessions>)('keeps every prior analysis field, source and candidate through review/history/backup: %s',async key=>{
  const {store,service}=await open(),old=structuredClone(published.sessions[key]) as NamingSession;
  expect(canonical(analyzeProfile(old.profile))).toEqual(old.analysis);expect(old.analysis.renCommentary?.actionAnalysis).toBeUndefined();
  expect(old.sourceSnapshot!.sources.some(source=>source.id===REN_ACTIONS_SOURCE_ID)).toBe(false);expect(validSession(old)).toBe(true);
  store.saveProfile(old.profile);const saved=store.saveSession(old),reviewed=service.saveSession({...saved,reviewNote:'保留真实124旧取法，未回填新动作'}),revision=service.listHistory(saved.id)[0];
  for(const session of [saved,reviewed,revision.session]){expect(session.analysis).toEqual(old.analysis);expect(session.candidates).toEqual(old.candidates);expect(session.sourceSnapshot).toEqual(old.sourceSnapshot);expect(session.preferences).toEqual(old.preferences);}
  const restored=service.restoreHistory(reviewed.id,revision.id,reviewed.reviewRevision,reviewed.reviewToken);expect(restored.analysis).toEqual(old.analysis);
  const target=await open();target.store.restore(store.backupBytes());expect(current(target.store,old.id).analysis).toEqual(old.analysis);expect(current(target.store,old.id).sourceSnapshot).toEqual(old.sourceSnapshot);
 });
});

describe('Ren1.2 real generation and source-bound saved action prerequisites',{ timeout: 15_000 }, ()=>{
 it('preserves real calendar pillars and source-defined root members without claiming effective force or formation',async()=>{
  // Independent calendar anchor: after2024立春,甲年寅月丙寅;2024-02-10甲辰日,甲日巳时己巳.
  // These literal expectations are not obtained from the new action calculator or a supplied synthetic four-pillar chart.
  const {session}=await setup({...profile,id:'ren-actions-calendar',birthDate:'2024-02-10',birthTime:'09:30:00',timeUnknown:false,timeBasis:'civil',birthLongitude:undefined});
  expect(session.analysis.bazi.pillars.map(pillar=>pillar.gan+pillar.zhi)).toEqual(['甲辰','丙寅','甲辰','己巳']);
  expect(session.analysis.bazi.version).toContain('/1.12.0;');expect(session.analysis.renCommentary!.version).toBe(REN_ACTION_METHOD);expect(validSession(session)).toBe(true);
  const result=actions(session),root=result.rootLinks.find(link=>link.stemNodeId==='day:exposed:甲'&&link.branchNodeId==='month:branch:寅'&&link.hiddenStem==='甲');
  expect(root).toMatchObject({element:'木',branch:'寅',samePillar:false,category:'growth-lu-wang',categoryAuthority:'ren-explicit-element-vocabulary',effectiveSupport:'unknown',originalNodesRetained:true});
  expect(root!.sourceClauseIds).toContain('root-growth-vocabulary');expect(result.sourceReferences.find(reference=>reference.id==='root-growth-vocabulary')?.quote).toContain('寅');
  expect(result.checks.length).toBeGreaterThan(0);expect(result.checks.every(check=>check.effectiveAction==='unknown'&&check.formationDecision==='not-evaluated')).toBe(true);
  expect(result.formationDecision).toBe('not-evaluated');expect(result.strengthDecision).toBe('not-evaluated');
  expect(session.sourceSnapshot!.sources.filter(source=>source.id===REN_ACTIONS_SOURCE_ID)).toEqual(loadRenActionsSources(resolve('data')));expect(sessionReferencedSourceIds(session)).toContain(REN_ACTIONS_SOURCE_ID);
 });
 it('includes the full action source only for1.2, while1.1 retains necessary clauses and1.0/none receive neither extension',async()=>{
  const {service}=await open();
  for(const [index,method]of [REN_ACTION_METHOD,REN_METHOD,LEGACY_REN_METHOD,'none' as const].entries()){
   const session=(await service.generate({...profile,id:'ren-action-source-'+index,renMethod:method},preferences)).session,sourceIds=session.sourceSnapshot!.sources.map(source=>source.id);
   expect(sourceIds.includes(REN_ACTIONS_SOURCE_ID)).toBe(method===REN_ACTION_METHOD);expect(sourceIds.includes(NECESSARY_SOURCE)).toBe(method===REN_ACTION_METHOD||method===REN_METHOD);expect(sourceIds.includes(BASE_SOURCE)).toBe(method!=='none');
   expect(session.analysis.renCommentary?.actionAnalysis!==undefined).toBe(method===REN_ACTION_METHOD);
   if(method!==REN_ACTION_METHOD)expect(sessionReferencedSourceIds(session)).not.toContain(REN_ACTIONS_SOURCE_ID);
  }
 },15000);
 it('preserves action scope, graph/root links and complete source through real optimistic review/history/separate-store backup',async()=>{
  const {store,service,session}=await setup(),original=structuredClone(session.analysis),source=structuredClone(session.sourceSnapshot);
  expect(actions(session).rootLinks.length).toBeGreaterThan(0);
  const supplied=structuredClone(session);supplied.reviewNote='仅记录源条件，met并非有效作用或成格';actions(supplied).rootLinks[0].hiddenNodeId='forged-editable-input';
  const reviewed=service.saveSession(supplied);expect(reviewed.analysis).toEqual(original);expect(reviewed.sourceSnapshot).toEqual(source);expect(reviewed.reviewRevision).toBeGreaterThan(session.reviewRevision!);expect(reviewed.reviewToken).not.toBe(session.reviewToken);
  const revision=service.listHistory(session.id)[0];expect(revision.session.analysis).toEqual(original);
  const restored=service.restoreHistory(session.id,revision.id,reviewed.reviewRevision,reviewed.reviewToken);expect(restored.analysis).toEqual(original);
  const destination=await open();destination.store.restore(store.backupBytes());expect(current(destination.store,session.id).analysis).toEqual(original);expect(current(destination.store,session.id).sourceSnapshot).toEqual(source);
 });
 it('keeps unknown hour and uncertain solar day prerequisites unknown without synthesizing extra nodes or roots',async()=>{
  const {service}=await open();
  for(const [key,extra]of [['hour',{timeUnknown:true,birthTime:'',timeBasis:'civil' as const}],['day',{timeUnknown:true,birthTime:'',timeBasis:'apparent-solar' as const,birthLongitude:87.6168}]]as const){
   const session=(await service.generate({...profile,...extra,id:'ren-action-unknown-'+key,birthDate:'2024-02-10'},preferences)).session,result=actions(session),nodes=session.analysis.renCommentary!.structureGraph.nodes;
   expect(session.analysis.qimen.available).toBe(false);expect(result.input.complete).toBe(false);expect(nodes.some(node=>node.position==='hour')).toBe(false);expect(result.rootLinks.some(link=>link.rootPosition==='hour'||link.stemPosition==='hour')).toBe(false);expect(result.checks.some(check=>check.status==='unknown')).toBe(true);
   if(key==='day'){expect(result.input.dayStem).toBeNull();expect(nodes.some(node=>node.position==='day')).toBe(false);expect(result.rootLinks.some(link=>link.rootPosition==='day'||link.stemPosition==='day')).toBe(false);}
   expect(result.checks.every(check=>check.effectiveAction==='unknown')).toBe(true);expect(result.formationDecision).toBe('not-evaluated');
  }
 });
});

const corruptions:Array<{name:string;edit:(session:NamingSession)=>void}>=[
 {name:'action payload deleted',edit:session=>{delete session.analysis.renCommentary!.actionAnalysis;}},
 {name:'action state promoted',edit:session=>{const check=actions(session).checks[0];check.status=check.status==='met'?'contradicted':'met';}},
 {name:'check node orphaned',edit:session=>{actions(session).checks[0].nodeIds.push('forged-node');}},
 {name:'root hidden node orphaned',edit:session=>{actions(session).rootLinks[0].hiddenNodeId='forged-hidden';}},
 {name:'root category replaced',edit:session=>{const root=actions(session).rootLinks[0];root.samePillar=!root.samePillar;}},
 {name:'root threat edge grafted',edit:session=>{actions(session).rootLinks[0].threatEdgeIds.push('forged-threat');}},
 {name:'source clause quote forged',edit:session=>{actions(session).sourceReferences[0].quote='伪造根气充分条件';}},
 {name:'action input pillar replaced',edit:session=>{actions(session).input.pillars[0].ganzhi='甲子';}},
 {name:'original graph node relabelled',edit:session=>{session.analysis.renCommentary!.structureGraph.nodes[0].symbol='伪';}},
 {name:'birth pillar altered',edit:session=>{session.analysis.bazi.pillars[0].gan='癸';}},
 {name:'saved chart altered',edit:session=>{session.analysis.qimen.palaces[0].earth='伪';}},
 {name:'action source omitted',edit:session=>{session.sourceSnapshot!.sources=session.sourceSnapshot!.sources.filter(source=>source.id!==REN_ACTIONS_SOURCE_ID);}},
 {name:'action source identity forged',edit:session=>{session.sourceSnapshot!.sources.find(source=>source.id===REN_ACTIONS_SOURCE_ID)!.commit='forged';}},
 {name:'Bazi1.12 downgraded with actions retained',edit:session=>{session.analysis.bazi.version='civil-midnight-fuyi-candidate/1.11.0;lunar-typescript/1.8.6';}},
 {name:'old1.1 method and analysis retain forbidden action source',edit:session=>{session.profile.renMethod=REN_METHOD;session.analysis=analyzeProfile(session.profile);}}
];
describe('Ren1.2 save/import and actual SQLite current/history read integrity',{ timeout: 15_000 }, ()=>{
 it.each(corruptions)('rejects $name at direct immutable save and backup import without changing good bytes',async corruption=>{
  const {store,session}=await setup(),before=bytes(store),bad=structuredClone(session);corruption.edit(bad);expect(()=>store.saveSession(bad)).toThrow();expect(bytes(store).equals(before)).toBe(true);
  const database=new SQL.Database(store.backupBytes());try{editDatabase(database,'sessions',session.id,corruption.edit);expect(()=>store.restore(database.export())).toThrow();}finally{database.close();}
  expect(bytes(store).equals(before)).toBe(true);expect(current(store,session.id)).toEqual(session);
 });
 it.each(corruptions.filter(row=>['action state promoted','root hidden node orphaned','action source omitted','birth pillar altered','saved chart altered'].includes(row.name)))('refuses externally edited current $name after close/reopen without disk mutation',async corruption=>{
  const {dir,store,session}=await setup();close(store);externallyEdit(dir,'sessions',session.id,corruption.edit);const changed=readFileSync(join(dir,'customers.sqlite')),reopened=await open(dir);
  expect(()=>reopened.service.bootstrap()).toThrow();expect(()=>reopened.store.rows('sessions')).toThrow();expect(bytes(reopened.store).equals(changed)).toBe(true);
 });
 it('rejects a forged historical action root while preserving the intact current session and damaged disk bytes',async()=>{
  const {dir,store,service,session}=await setup();service.saveSession({...structuredClone(session),reviewNote:'真实历史动作根气记录'});const revision=service.listHistory(session.id)[0];close(store);
  externallyEdit(dir,'revisions',Number(revision.id),value=>{actions(value).rootLinks[0].hiddenNodeId='forged-revision-root';});const changed=readFileSync(join(dir,'customers.sqlite')),reopened=await open(dir);
  expect(reopened.service.bootstrap().sessions.some(value=>value.id===session.id)).toBe(true);expect(()=>reopened.service.listHistory(session.id)).toThrow();expect(()=>reopened.store.backupBytes()).toThrow();expect(bytes(reopened.store).equals(changed)).toBe(true);
 });
 it('rejects action source grafts on real old none and1.1 rows at actual reload boundaries',async()=>{
  for(const key of ['none','v11']as const){const {dir,store}=await open(),old=structuredClone(published.sessions[key]) as NamingSession;store.saveProfile(old.profile);store.saveSession(old);close(store);
   externallyEdit(dir,'sessions',old.id,value=>{value.sourceSnapshot!.sources.push(...loadRenActionsSources(resolve('data')));});const changed=readFileSync(join(dir,'customers.sqlite')),reopened=await open(dir);
   expect(()=>reopened.service.bootstrap()).toThrow();expect(bytes(reopened.store).equals(changed)).toBe(true);
  }
 });
});
