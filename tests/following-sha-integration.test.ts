import{afterEach,beforeAll,describe,expect,it}from'vitest';
import{mkdtempSync,readFileSync,rmSync}from'node:fs';
import{tmpdir}from'node:os';
import{join,resolve}from'node:path';
import initSqlJs from'sql.js';
import{Store,validSession}from'../src/main/store';
import{StudioService}from'../src/main/service';
import{calculateBaziV6,BAZI_V6_RULE_VERSION}from'../src/domain/bazi-v6';
import{calculateQimenProfileV3}from'../src/domain/engine-v7';
import{normalizePreferences}from'../src/shared/workflow';
import{CONG_SHA_SOURCE_ID,loadCongShaSources}from'../src/main/cong-sha-data';
import{baziSnapshotStatus}from'../src/main/bazi-snapshot';
import type{BirthProfile,NamingSession}from'../src/shared/types';

const profile:BirthProfile={id:'sha-storage-real',customerName:'从杀依赖隔离验收',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-12-09',birthTime:'13:30:00',timeUnknown:false,leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:''};
const wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm'),directories:string[]=[],stores:Store[]=[];
let SQL:Awaited<ReturnType<typeof initSqlJs>>;
beforeAll(async()=>{SQL=await initSqlJs({locateFile:()=>wasm});});
async function open(){const directory=mkdtempSync(join(tmpdir(),'sha-dependent-storage-'));directories.push(directory);const store=await new Store(directory,resolve('data'),wasm).init();stores.push(store);return{store,service:new StudioService(store,{read:()=>'',write:()=>{}},false)};}
async function setup(){const{store,service}=await open(),session=(await service.generate(profile,normalizePreferences({zodiacRules:false}))).session;return{store,service,session};}
const current=(store:Store,id:string)=>store.rows<NamingSession>('sessions').find(session=>session.id===id)!;
const bytes=(store:Store)=>readFileSync(join(store.userDir,'customers.sqlite'));
const shaCheck=(session:NamingSession)=>session.analysis.bazi.evidence!.patternEvidence!.checks.find(check=>check.id==='ding-zi-monthly-cong-sha')!;
function changedBackup(archive:Uint8Array,session:NamingSession,edit:(session:NamingSession)=>void){const test=new SQL.Database(archive),value=structuredClone(session);try{edit(value);test.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(value),value.id]);return test.export();}finally{test.close();}}
const tamperCases:{name:string;edit:(session:NamingSession)=>void}[]=[
 {name:'new source metadata',edit:value=>{value.sourceSnapshot!.sources.find(source=>source.id===CONG_SHA_SOURCE_ID)!.commit='forged-fixed-version';}},
 {name:'new source omitted',edit:value=>{value.sourceSnapshot!.sources=value.sourceSnapshot!.sources.filter(source=>source.id!==CONG_SHA_SOURCE_ID);}},
 {name:'route false rejection',edit:value=>{shaCheck(value).status='contradicted';}},
 {name:'branch false rejection',edit:value=>{shaCheck(value).decisionBranches![0].status='rejected';}},
 {name:'dependency premise removed',edit:value=>{shaCheck(value).decisionBranches![0].premiseCriterionIds=[];}},
 {name:'dependency reference forged',edit:value=>{shaCheck(value).decisionBranches![0].premiseCriterionIds=['unprovided-fact'];}},
 {name:'signal promoted to conclusion',edit:value=>{shaCheck(value).criteria.find(criterion=>criterion.decisionUse==='rejection-signal')!.contributesToVerdict=true;}},
 {name:'original source clause forged',edit:value=>{shaCheck(value).sourceQuote='有甲即可断非从杀';}}
];
afterEach(()=>{for(const store of stores.splice(0))store.db.close();for(const directory of directories.splice(0))rmSync(directory,{recursive:true,force:true});});

describe('real customer storage preserves dependent following-killing facts without a false verdict',{ timeout: 15_000 }, ()=>{
 it('generates an observed hour-only signal but keeps both branch and route pending; unknown time cannot prove its absence',async()=>{
  const{store,service,session}=await setup();expect(session.analysis.bazi.pillars.map(pillar=>pillar.gan+pillar.zhi)).toEqual(['甲辰','丙子','丁未','丁未']);
  const known=shaCheck(session),signal=known.criteria.find(criterion=>criterion.id==='ding-zi-extra-ding-exposed')!;
  expect(signal).toMatchObject({result:'met',decisionUse:'rejection-signal',contributesToVerdict:false});expect(signal.qualificationMissing!.length).toBeGreaterThan(0);
  expect(known.status).toBe('pending');expect(known.opposedBy).toEqual([]);expect(known.decisionBranches![0]).toMatchObject({status:'pending',doesNotResolveClause:true});
  expect(session.sourceSnapshot!.sources.filter(source=>source.id===CONG_SHA_SOURCE_ID)).toEqual(loadCongShaSources(resolve('data')));
  expect(validSession(session)).toBe(true);
  const unknown=(await service.generate({...profile,id:profile.id+'-unknown',timeUnknown:true,birthTime:''},normalizePreferences({zodiacRules:false}))).session;
  expect(unknown.analysis.bazi.pillars.some(pillar=>pillar.label==='时柱')).toBe(false);
  expect(shaCheck(unknown).criteria.find(criterion=>criterion.id===signal.id)).toMatchObject({result:'unknown',contributesToVerdict:false});
  expect(shaCheck(unknown).status).toBe('pending');expect(shaCheck(unknown).opposedBy).toEqual([]);
  expect(current(store,session.id).analysis.bazi.evidence!.patternEvidence).toEqual(session.analysis.bazi.evidence!.patternEvidence);
 },15000);

 it('keeps fixed source, wealth results and dependent checks through review save, history restore and separate-store backup import',async()=>{
  const{store,service,session}=await setup(),original=structuredClone(session.analysis.bazi.evidence!.patternEvidence),source=structuredClone(session.sourceSnapshot);
  const draft=structuredClone(session);draft.reviewNote='反向信号仅列事实，拒绝前提未齐';draft.candidates[0].reviewNote='名字审阅独立保留';draft.preferences.preferredElements=['金'];
  const saved=service.saveSession(draft);expect(saved.analysis.bazi.evidence!.patternEvidence).toEqual(original);expect(saved.sourceSnapshot).toEqual(source);
  const revision=service.listHistory(saved.id)[0];expect(revision.session.analysis.bazi.evidence!.patternEvidence).toEqual(original);
  const restored=service.restoreHistory(saved.id,revision.id,saved.reviewRevision,saved.reviewToken);expect(restored.reviewNote).toBe('');expect(restored.analysis.bazi.evidence!.patternEvidence).toEqual(original);expect(restored.sourceSnapshot).toEqual(source);
  const destination=await open();destination.store.restore(store.backupBytes());const imported=current(destination.store,session.id);
  expect(imported.analysis.bazi.evidence!.patternEvidence).toEqual(original);expect(imported.sourceSnapshot).toEqual(source);expect(shaCheck(imported).status).toBe('pending');
  expect(imported.analysis.bazi.evidence!.patternEvidence!.checks.filter(check=>check.pattern==='cong-cai')).toEqual(calculateBaziV6(session.profile).evidence!.patternEvidence!.checks.filter(check=>check.pattern==='cong-cai'));
  const fresh=current(destination.store,session.id);fresh.reviewNote='恢复后继续审阅';expect(destination.service.saveSession(fresh).reviewNote).toBe('恢复后继续审阅');
 });

 it.each(tamperCases)('rejects $name tampering without changing disk or review history',async(test)=>{
  const{store,session}=await setup(),archive=store.backupBytes(),before=bytes(store),history=store.listRevisions(session.id);
  const malformed=changedBackup(archive,session,test.edit);expect(()=>store.restore(malformed),test.name).toThrow('结构不合法');expect(bytes(store).equals(before),test.name).toBe(true);expect(current(store,session.id),test.name).toEqual(session);expect(store.listRevisions(session.id),test.name).toEqual(history);
 });

 it('rejects a forged dependent branch inside a revision without dropping the archive history',async()=>{
  const{store,service,session}=await setup();service.saveSession({...structuredClone(session),reviewNote:'创建历史'});
  const before=bytes(store),database=new SQL.Database(new Uint8Array(before));
  try{const revision=service.listHistory(session.id)[0],value=structuredClone(revision.session);shaCheck(value).decisionBranches![0].doesNotResolveClause=false;database.run('UPDATE revisions SET json=? WHERE id=?',[JSON.stringify(value),Number(revision.id)]);expect(()=>store.restore(database.export())).toThrow('结构不合法');}
  finally{database.close();}
  expect(bytes(store).equals(before)).toBe(true);expect(service.listHistory(session.id)).toHaveLength(1);
 });

 it('retains frozen1.6 without adding new killing clauses or source identities across saves and backup restoration',async()=>{
  const{store,service,session}=await setup(),legacy=structuredClone(session);
  legacy.id='frozen-wealth-only-1.6';legacy.analysis.bazi=calculateBaziV6(legacy.profile);legacy.analysis.qimen=calculateQimenProfileV3(legacy.profile);legacy.originalFavorable=[...legacy.analysis.bazi.favorable];
  legacy.sourceSnapshot!.sources=legacy.sourceSnapshot!.sources.filter(source=>source.id!==CONG_SHA_SOURCE_ID);delete legacy.reviewRevision;delete legacy.reviewToken;
  expect(baziSnapshotStatus(legacy.analysis.bazi,legacy.profile)).toBe('verified-legacy');expect(legacy.analysis.bazi.version).toBe(BAZI_V6_RULE_VERSION);
  const saved=store.saveSession(legacy);expect(saved.analysis.bazi.evidence!.patternEvidence!.checks.filter(check=>check.pattern==='cong-sha')).toEqual([expect.objectContaining({status:'not-evaluated',id:'cong-sha-not-operationalized'})]);
  expect(saved.analysis.bazi.evidence!.sources.some(source=>source.id===CONG_SHA_SOURCE_ID)).toBe(false);expect(saved.sourceSnapshot!.sources.some(source=>source.id===CONG_SHA_SOURCE_ID)).toBe(false);
  const reviewed=service.saveSession({...saved,reviewNote:'旧版按原始记录审阅'});expect(reviewed.analysis.bazi).toEqual(legacy.analysis.bazi);
  store.restore(store.backupBytes());const imported=current(store,saved.id);expect(imported.analysis.bazi).toEqual(legacy.analysis.bazi);expect(imported.sourceSnapshot!.sources.some(source=>source.id===CONG_SHA_SOURCE_ID)).toBe(false);
  expect(imported.analysis.bazi.evidence!.patternEvidence!.checks.filter(check=>check.pattern==='cong-cai')).toEqual(session.analysis.bazi.evidence!.patternEvidence!.checks.filter(check=>check.pattern==='cong-cai'));
 });
});
