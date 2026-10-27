import {afterEach,beforeAll,describe,expect,it,vi} from 'vitest';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import initSqlJs from 'sql.js';
import {Store} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {evaluateName as evaluateFrozenV6} from '../src/domain/naming-v6';
import {normalizePreferences} from '../src/shared/workflow';
import {NAMING_RULE_V6_VERSION,NAMING_RULE_V7_VERSION,NAMING_RULE_V7_SOURCE_ID} from '../src/shared/naming-rules';
import {reportHTML} from '../src/main/report';
import type {BirthProfile,NamingSession} from '../src/shared/types';

// This suite pins the original 7.0 Service/Store publication, independently of the app default.
vi.mock('../src/shared/naming-rules',async importOriginal=>{
 const rules=await importOriginal<typeof import('../src/shared/naming-rules')>();
 return{...rules,CURRENT_NAMING_RULE_VERSION:rules.NAMING_RULE_V7_VERSION,NAMING_RULE_SOURCE_ID:rules.NAMING_RULE_V7_SOURCE_ID};
});

// No personal stage/runner files: the override only selects a complete runtime data directory.
const dataDir=resolve(process.env.NAMING_TEST_DATA_DIR||'data'),wasm=createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm');
const publication=JSON.parse(readFileSync(join(dataDir,'naming-editorial-meanings-v7-source-lock.json'),'utf8'));
const table=JSON.parse(readFileSync(join(dataDir,'naming-editorial-v7.json'),'utf8'));
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const profile:BirthProfile={id:'naming7-main-customer',customerName:'命名7主接线隔离测试',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'09:30',leapMonth:false,timeUnknown:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:''};
const preferences=()=>normalizePreferences({length:1,requiredChars:'昂',numerology:false,zodiacRules:false});
const directories:string[]=[],stores:Store[]=[];
let SQL:Awaited<ReturnType<typeof initSqlJs>>;
beforeAll(async()=>{SQL=await initSqlJs({locateFile:()=>wasm});},15000);
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();for(const store of stores.splice(0))store.db.close();for(const directory of directories.splice(0))rmSync(directory,{recursive:true,force:true});});

async function open(key=''){
 const directory=mkdtempSync(join(tmpdir(),'naming7-main-integration-'));directories.push(directory);
 const store=await new Store(directory,dataDir,wasm).init();stores.push(store);
 return {directory,store,service:new StudioService(store,{read:()=>key,write:()=>{}},false)};
}
async function generated(){const context=await open();return {...context,session:(await context.service.generate(profile,preferences())).session};}
const disk=(store:Store)=>readFileSync(join(store.userDir,'customers.sqlite'));
const current=(store:Store,id:string)=>store.rows<NamingSession>('sessions').find(session=>session.id===id)!;
function changeSourceNote(bytes:Uint8Array):Uint8Array{
 const db=new SQL.Database(bytes);
 try{const row=db.exec('SELECT rowid,json FROM sources')[0].values[0],source=JSON.parse(String(row[1]));source.note+=' independent naming7 custom-package test';db.run('UPDATE sources SET json=? WHERE rowid=?',[JSON.stringify(source),row[0]]);return db.export();}finally{db.close();}
}
function corruptBackup(bytes:Uint8Array,target:'sessions'|'revisions',mutate:(session:NamingSession)=>void):Uint8Array{
 const db=new SQL.Database(bytes);
 try{const row=db.exec(`SELECT id,json FROM ${target}`)[0].values[0],session=JSON.parse(String(row[1])) as NamingSession;mutate(session);db.run(`UPDATE ${target} SET json=? WHERE id=?`,[JSON.stringify(session),row[0]]);return db.export();}finally{db.close();}
}

describe('naming7 main-process package, immutable snapshot and saved report boundaries',{ timeout: 15_000 }, ()=>{
 it('generates7 only from the actual fixed full package and records its dedicated source',async()=>{
  const {store,session}=await generated(),actual=sha(store.currentPackBytes()),candidate=session.candidates[0];
  expect(actual).toBe(table.base.knowledgePackSha256);expect(store.dataset.version).toBe(actual.slice(0,12));
  expect(session.namingRules).toEqual({version:NAMING_RULE_V7_VERSION,dataVersion:actual.slice(0,12),sourceId:NAMING_RULE_V7_SOURCE_ID});
  expect(session.sourceSnapshot!.sources.filter(source=>source.id===NAMING_RULE_V7_SOURCE_ID)).toHaveLength(1);
  expect(candidate.namingMeaningReview).toMatchObject({version:NAMING_RULE_V7_VERSION,sourceId:NAMING_RULE_V7_SOURCE_ID,sourceSha256:publication.sources[0].sha256,packSha256:actual,activeVersion:actual.slice(0,12),givenName:'昂',recordState:'recorded',automaticSemanticCreditAllowed:false});
  expect(candidate.namingMeaningReview!.rows[0]).toMatchObject({position:1,char:'昂',applicability:{status:'applicable'},review:{displayOnlyReview:true,automaticSemanticCreditAllowed:false}});
  expect(current(store,session.id).candidates[0].namingMeaningReview).toEqual(candidate.namingMeaningReview);
 },15000);

 it('uses6 for actual changed package bytes and preserves that generated6 record after returning to7',async()=>{
  const {store,service}=await open(),fixed=store.currentPackBytes(),custom=changeSourceNote(fixed);store.installPack(custom);
  const pref=normalizePreferences({length:1,requiredChars:'秋',numerology:false,zodiacRules:false});
  const session=(await service.generate(profile,pref)).session,candidate=session.candidates[0];
  expect(sha(custom)).not.toBe(table.base.knowledgePackSha256);expect(session.dataVersion).toBe(sha(custom).slice(0,12));expect(session.namingRules!.version).toBe(NAMING_RULE_V6_VERSION);
  expect(Object.hasOwn(candidate,'namingMeaningReview')).toBe(false);
  const frozen=evaluateFrozenV6('秋',session.profile,session.preferences,session.analysis,store.dataset.characters,store.dataset.citations)!;
  expect(candidate.evaluation).toEqual(frozen.evaluation);expect(candidate.originalMeaning).toBe(frozen.originalMeaning);expect(candidate.characters).toEqual(frozen.characters);
  const retained=structuredClone(candidate),sourceSnapshot=structuredClone(session.sourceSnapshot),rules=structuredClone(session.namingRules);
  store.installPack(fixed);const saved=service.saveSession({...session,reviewNote:'保留真实custom6生成记录'});
  expect(saved.namingRules).toEqual(rules);expect(saved.sourceSnapshot).toEqual(sourceSnapshot);expect(saved.candidates[0]).toEqual(retained);
  const destination=await open();destination.store.restore(store.backupBytes());const restored=current(destination.store,session.id);
  expect(restored.namingRules).toEqual(rules);expect(restored.candidates[0]).toEqual(retained);expect(Object.hasOwn(restored.candidates[0],'namingMeaningReview')).toBe(false);
  const graft=structuredClone(restored);graft.candidates[0].namingMeaningReview={version:NAMING_RULE_V7_VERSION} as never;
  const before=disk(destination.store);expect(()=>destination.store.saveSession(graft)).toThrow();expect(disk(destination.store)).toEqual(before);
 // This is a real generated custom6 record, not a claimed old installation fixture.
 },20000);

 it('checks canonical7 snapshots on Store writes, current/history reads and atomic backup restore',async()=>{
  const {store,service,session}=await generated(),original=structuredClone(session.candidates[0].namingMeaningReview),initial=disk(store);
  const bad=structuredClone(session);bad.candidates[0].namingMeaningReview!.sourceSha256='0'.repeat(64);
  expect(()=>store.saveSession(bad)).toThrow();expect(disk(store)).toEqual(initial);
  const saved=service.saveSession({...session,reviewNote:'形成真实历史版本'}),revision=service.listHistory(saved.id)[0];
  expect(revision.session.candidates[0].namingMeaningReview).toEqual(original);
  const restoredHistory=service.restoreHistory(saved.id,revision.id,saved.reviewRevision,saved.reviewToken);
  expect(restoredHistory.candidates[0].namingMeaningReview).toEqual(original);
  const good=store.backupBytes(),before=disk(store);
  for(const target of ['sessions','revisions'] as const){
   const corrupt=corruptBackup(good,target,value=>{delete value.candidates[0].namingMeaningReview;});
   expect(()=>store.restore(corrupt),target).toThrow();expect(disk(store),target).toEqual(before);
   const row=store.db.exec(`SELECT id,json FROM ${target}`)[0].values[0],raw=String(row[1]),value=JSON.parse(raw) as NamingSession;
   value.candidates[0].namingMeaningReview!.rows=[];
   try{store.db.run(`UPDATE ${target} SET json=? WHERE id=?`,[JSON.stringify(value),row[0]]);expect(()=>target==='sessions'?store.rows('sessions'):store.listRevisions(saved.id),target).toThrow();expect(()=>store.backupBytes(),target).toThrow();expect(disk(store),target).toEqual(before);}finally{store.db.run(`UPDATE ${target} SET json=? WHERE id=?`,[raw,row[0]]);}
  }
  const destination=await open();destination.store.restore(good);expect(current(destination.store,saved.id).candidates[0].namingMeaningReview).toEqual(original);
 },60000);

 it('rejects manual deletion and top-level or nested snapshot getters before executing them',async()=>{
  const {store,service,session}=await generated(),before=disk(store),missing=structuredClone(session);delete missing.candidates[0].namingMeaningReview;
  expect(()=>service.saveSession(missing)).toThrow();expect(disk(store)).toEqual(before);
  for(const nested of [false,true]){
   const changed=structuredClone(session);let calls=0;
   if(nested){const review=changed.candidates[0].namingMeaningReview!.rows[0].review!;Object.defineProperty(review,'scope',{enumerable:true,get(){calls++;return '不得被读取';}});}
   else Object.defineProperty(changed.candidates[0],'namingMeaningReview',{enumerable:true,get(){calls++;return session.candidates[0].namingMeaningReview;}});
   expect(()=>service.saveSession(changed)).toThrow();expect(calls).toBe(0);expect(disk(store)).toEqual(before);
  }
 },15000);

 it('uses the actual AI module with an in-process Response and the same trusted Service context',async()=>{
  const {store,service}=await open('local-response-key'),rule=table.nameRules.find((row:{name:string})=>row.name==='琼莹');expect(rule).toBeDefined();
  const requests:Record<string,any>[]=[];
  vi.stubGlobal('fetch',vi.fn(async(_url:unknown,options?:RequestInit)=>{requests.push(JSON.parse(String(options?.body)));return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({candidates:[{givenName:'琼莹',citationIds:[rule.citation.id],themeIds:[]}]})}}]}),{status:200,headers:{'Content-Type':'application/json'}});}));
  service.saveAiSettings({...service.bootstrap().settings,useAi:true,apiBaseUrl:'http://127.0.0.1:13777/v1',model:'in-process-response-only',timeoutMs:5000},'local-response-key');
  const session=(await service.generate(profile,normalizePreferences({length:2,requiredChars:'琼莹',style:'诗经',numerology:false,zodiacRules:false}))).session;
  const candidate=session.candidates.find(row=>row.origin==='ai'&&row.givenName==='琼莹');expect(candidate).toBeDefined();expect(requests).toHaveLength(1);
  const input=JSON.parse(requests[0].messages.find((message:{role:string})=>message.role==='user').content);
  expect(input.citations.some((citation:{id:string})=>citation.id===rule.citation.id)).toBe(true);
  expect(session.namingRules!.version).toBe(NAMING_RULE_V7_VERSION);expect(candidate!.citations).toEqual([rule.citation]);
  expect(candidate!.namingMeaningReview).toMatchObject({packSha256:sha(store.currentPackBytes()),activeVersion:store.dataset.version,sourceSha256:publication.sources[0].sha256,givenName:'琼莹'});
  expect(current(store,session.id).candidates.find(row=>row.id===candidate!.id)!.namingMeaningReview).toEqual(candidate!.namingMeaningReview);
 },20000);

 it('escapes the saved review fields without replacing them through a new lookup',async()=>{
  const {store,session}=await generated(),saved=structuredClone(current(store,session.id)),snapshot=saved.candidates[0].namingMeaningReview!;
  const row=snapshot.rows[0];row.automaticMeaning!.meaning=row.review!.namingMeaning='<saved-meaning>';row.review!.reason='<saved-reason>';row.automaticMeaning!.binding.dictionarySense=row.review!.binding!.dictionarySense='<saved-dictionary>';
  const html=reportHTML(saved,store.settings());
  for(const sentinel of ['saved-meaning','saved-reason','saved-dictionary']){expect(html).toContain('&lt;'+sentinel+'&gt;');expect(html).not.toContain('<'+sentinel+'>');}
 },15000);
});
