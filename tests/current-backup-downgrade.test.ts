import{afterEach,beforeAll,describe,expect,it}from'vitest';
import{mkdtempSync,readFileSync,rmSync}from'node:fs';import{tmpdir}from'node:os';import{join,resolve}from'node:path';import initSqlJs from'sql.js';
import{Store,validSession}from'../src/main/store';import{StudioService}from'../src/main/service';import{normalizePreferences}from'../src/shared/workflow';
import{calculateLegacyBazi,LEGACY_BAZI_RULE_VERSION}from'../src/domain/bazi-legacy';
import{calculateBaziV1,BAZI_V1_RULE_VERSION}from'../src/domain/bazi-v1';import{calculateBaziV2,BAZI_V2_RULE_VERSION}from'../src/domain/bazi-v2';
import{calculateBaziV3,BAZI_V3_RULE_VERSION}from'../src/domain/bazi-v3';import{calculateBaziV4,BAZI_V4_RULE_VERSION}from'../src/domain/bazi-v4';
import{calculateBaziV5,BAZI_V5_RULE_VERSION}from'../src/domain/bazi-v5';import{calculateBaziV6,BAZI_V6_RULE_VERSION}from'../src/domain/bazi-v6';
import{calculateQimenProfileV2,QIMEN_V2_RULE_VERSION}from'../src/domain/qimen-v2';import{analyzeProfile,BAZI_RULE_VERSION,QIMEN_RULE_VERSION}from'../src/domain/engine';
import{calculateBaziV7,calculateQimenProfileV3,QIMEN_V3_RULE_VERSION}from'../src/domain/engine-v7';
import{calculateBaziV8}from'../src/domain/engine-v8';
import{validQimenSnapshot}from'../src/main/qimen-snapshot';import{qimenAuxiliaryPalaceMarks}from'../src/domain/qimen-markers';
import publishedLegacy from'./fixtures/qimen-published-legacy-examples.json';
import{requiresSessionSourceManifest}from'../src/main/saved-analysis-policy';
import type{BirthProfile,NamingSession,QimenChart,BaziAnalysis}from'../src/shared/types';
const profile:BirthProfile={id:'downgrade-regression',customerName:'当前版本不可降级',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-12-09',birthTime:'13:30:00',timeUnknown:false,leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:''};
const wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm'),dirs:string[]=[],stores:Store[]=[];let SQL:Awaited<ReturnType<typeof initSqlJs>>;
beforeAll(async()=>{SQL=await initSqlJs({locateFile:()=>wasm});});afterEach(()=>{for(const store of stores.splice(0))store.db.close();for(const dir of dirs.splice(0))rmSync(dir,{recursive:true,force:true});});
async function setup(){const dir=mkdtempSync(join(tmpdir(),'studio-no-downgrade-'));dirs.push(dir);const store=await new Store(dir,resolve('data'),wasm).init();stores.push(store);const service=new StudioService(store,{read:()=>'',write:()=>{}},false),session=(await service.generate(profile,normalizePreferences({zodiacRules:false}))).session;return{store,service,session};}
const disk=(store:Store)=>readFileSync(join(store.userDir,'customers.sqlite'));
function backupChange(archive:Uint8Array,session:NamingSession,edit:(value:NamingSession)=>void,table:'sessions'|'revisions'='sessions'){const database=new SQL.Database(new Uint8Array(archive));try{const value=structuredClone(session);edit(value);database.run(`UPDATE ${table} SET json=?`,[JSON.stringify(value)]);return database.export();}finally{database.close();}}
function oldQimen(version:string,p=profile):QimenChart{const result=calculateQimenProfileV2(p);result.version=version;if(version!==QIMEN_V2_RULE_VERSION){delete result.patterns;if(version.endsWith('/1.0.0'))delete result.auxiliary;result.palaces.forEach(palace=>{palace.marks=[...(palace.number===5?['中五寄坤，天禽随天芮']:[]),...qimenAuxiliaryPalaceMarks(result.auxiliary,palace.number)];});}return result;}
const oldVersions=['zhuanpan-chaibu-futou-kun2/1.0.0','zhuanpan-chaibu-futou-kun2/1.1.0',QIMEN_V2_RULE_VERSION];
const wrongQimen=(value:NamingSession,available:boolean)=>{const q=oldQimen('zhuanpan-chaibu-futou-kun2/1.0.0',value.profile);if(available){q.ju=q.ju===9?1:9;q.solarTerm='冬至';q.palaces[0].heaven='乙';}else{q.available=false;q.palaces=[];q.ju=0;q.dun='';q.yuan='';q.solarTerm='';q.xun='';q.chiefStar='';q.chiefDoor='';q.reason='伪称旧版未排盘';}value.analysis.qimen=q;};

describe('modern session metadata and version downgrade rejection at every persisted boundary', { timeout: 15_000 },()=>{
 it('rejects removal of a current manifest from direct save and backup restore with unchanged live bytes',async()=>{
  const{store,session}=await setup(),archive=store.backupBytes(),before=disk(store),missing=structuredClone(session);delete missing.sourceSnapshot;
  expect(validSession(missing)).toBe(false);expect(()=>store.saveSession(missing)).toThrow();expect(disk(store).equals(before)).toBe(true);
  expect(()=>store.restore(backupChange(archive,session,value=>{delete value.sourceSnapshot;}))).toThrow('结构不合法');expect(disk(store).equals(before)).toBe(true);
 });
 it.each([true,false])('rejects a wrong legacy-labelled chart on a current Bazi session (available:%s)',async(available)=>{
  const{store,session}=await setup(),archive=store.backupBytes(),before=disk(store),forged=structuredClone(session);wrongQimen(forged,available);
  expect(validSession(forged)).toBe(false);expect(()=>store.saveSession(forged)).toThrow();expect(disk(store).equals(before)).toBe(true);
  expect(()=>store.restore(backupChange(archive,session,value=>wrongQimen(value,available)))).toThrow('结构不合法');expect(disk(store).equals(before)).toBe(true);
 });
 it.each(['manifest','qimen']as const)('rejects a forged %s inside a revision during backup validation',async(mode)=>{
  const{store,service,session}=await setup();service.saveSession({...structuredClone(session),reviewNote:'历史复核'});const archive=store.backupBytes(),before=disk(store),original=service.listHistory(session.id)[0].session;
  const bad=backupChange(archive,original,value=>{if(mode==='manifest')delete value.sourceSnapshot;else wrongQimen(value,true);},'revisions');
  expect(()=>store.restore(bad)).toThrow('结构不合法');expect(disk(store).equals(before)).toBe(true);expect(service.listHistory(session.id)).toHaveLength(1);
 });
 it.each(['sessions','revisions']as const)('refuses exporting an in-memory damaged %s row rather than producing a newly invalid backup',async(table)=>{
  const{store,service,session}=await setup();service.saveSession({...structuredClone(session),reviewNote:'保留历史'});const before=disk(store);
  const damaged=table==='sessions'?store.rows<NamingSession>('sessions')[0]:service.listHistory(session.id)[0].session;delete damaged.sourceSnapshot;
  store.db.run(`UPDATE ${table} SET json=?`,[JSON.stringify(damaged)]);
  expect(()=>store.backupBytes()).toThrow('备份已取消');expect(disk(store).equals(before)).toBe(true);
 });
});

describe('published Bazi/Qimen relationships and independently verifiable old plate bases', { timeout: 15_000 },()=>{
 it('verifies complete actual published1.0/1.1/1.2 installation snapshots without altering their original reasons or warnings',()=>{
  for(const fixture of publishedLegacy.cases){const p=fixture.profile as BirthProfile,analysis=fixture.analysis as unknown as{bazi:BaziAnalysis;qimen:QimenChart},copy=structuredClone(analysis);
   expect(validQimenSnapshot(analysis.qimen,analysis.bazi,p),fixture.sourceArtifact).toBe(true);expect(analysis).toEqual(copy);
   if(analysis.qimen.version.endsWith('/1.0.0')){expect(analysis.qimen.auxiliary).toBeUndefined();expect(analysis.qimen.patterns).toBeUndefined();}
   if(analysis.qimen.version.endsWith('/1.1.0')){expect(analysis.qimen.auxiliary).toBeDefined();expect(analysis.qimen.patterns).toBeUndefined();}
  }
 });
 it('accepts every published pair but rejects unsupported cross-generation labels',()=>{
  const current=analyzeProfile(profile),versions:{bazi:BaziAnalysis;allowed:string[]}[]=[
   {bazi:calculateLegacyBazi(profile),allowed:oldVersions},
   {bazi:calculateBaziV1(profile),allowed:[QIMEN_V2_RULE_VERSION]},
   {bazi:calculateBaziV2(profile),allowed:[QIMEN_V2_RULE_VERSION]},
   {bazi:calculateBaziV3(profile),allowed:[QIMEN_V2_RULE_VERSION]},
   {bazi:calculateBaziV4(profile),allowed:[QIMEN_V2_RULE_VERSION,QIMEN_V3_RULE_VERSION]},
   {bazi:calculateBaziV5(profile),allowed:[QIMEN_V3_RULE_VERSION]},
   {bazi:calculateBaziV6(profile),allowed:[QIMEN_V3_RULE_VERSION]},
   {bazi:calculateBaziV7(profile),allowed:[QIMEN_V3_RULE_VERSION]},
   {bazi:calculateBaziV8(profile),allowed:[QIMEN_RULE_VERSION]},
   {bazi:current.bazi,allowed:[QIMEN_RULE_VERSION]}
  ];
  for(const row of versions)for(const version of [...oldVersions,QIMEN_V3_RULE_VERSION,QIMEN_RULE_VERSION]){const q=version===QIMEN_RULE_VERSION?current.qimen:version===QIMEN_V3_RULE_VERSION?calculateQimenProfileV3(profile):oldQimen(version);expect(validQimenSnapshot(q,row.bazi,profile),row.bazi.version+' + '+version).toBe(row.allowed.includes(version));}
  for(const row of versions)expect(requiresSessionSourceManifest(row.bazi.version)).toBe(![LEGACY_BAZI_RULE_VERSION,BAZI_V1_RULE_VERSION,BAZI_V2_RULE_VERSION,BAZI_V3_RULE_VERSION].includes(row.bazi.version));
 });
 it.each(oldVersions)('requires the frozen main plate and known/unknown availability for genuine %s charts',version=>{
  const bazi=calculateLegacyBazi(profile),q=oldQimen(version);expect(validQimenSnapshot(q,bazi,profile)).toBe(true);
  for(const mutate of [(value:QimenChart)=>{value.ju=value.ju===9?1:9;},(value:QimenChart)=>{value.solarTerm='冬至';},(value:QimenChart)=>{value.palaces[0].heaven='乙';}]){const forged=structuredClone(q);mutate(forged);expect(validQimenSnapshot(forged,bazi,profile)).toBe(false);}
  const hidden={...q,available:false,palaces:[],ju:0};expect(validQimenSnapshot(hidden,bazi,profile)).toBe(false);
  const unknown={...profile,timeUnknown:true,birthTime:''};expect(validQimenSnapshot(oldQimen(version,unknown),calculateLegacyBazi(unknown),unknown)).toBe(true);
  const falseEmpty=oldQimen(version,unknown);falseEmpty.ju=9;falseEmpty.solarTerm='冬至';expect(validQimenSnapshot(falseEmpty,calculateLegacyBazi(unknown),unknown)).toBe(false);
 });
 it('keeps a current unknown-hour chart empty rather than allowing decorative false calculation values',()=>{
  const input={...profile,timeUnknown:true,birthTime:''},analysis=analyzeProfile(input);expect(validQimenSnapshot(analysis.qimen,analysis.bazi,input)).toBe(true);
  const forged=structuredClone(analysis.qimen);forged.ju=9;forged.solarTerm='冬至';expect(validQimenSnapshot(forged,analysis.bazi,input)).toBe(false);
 });
 it('preserves a genuine earlier evidence profile with no manifest without filling present-day source history',async()=>{
  const{store,service,session}=await setup(),legacy=structuredClone(session);legacy.id+='-legacy';legacy.analysis.bazi=calculateBaziV2(legacy.profile);legacy.analysis.qimen=oldQimen(QIMEN_V2_RULE_VERSION);legacy.originalFavorable=[...legacy.analysis.bazi.favorable];delete legacy.sourceSnapshot;delete legacy.namingRules;for(const candidate of legacy.candidates)delete candidate.namingMeaningReview;delete legacy.reviewRevision;delete legacy.reviewToken;
  expect(validSession(legacy)).toBe(true);const saved=store.saveSession(legacy);const reviewed=service.saveSession({...saved,reviewNote:'原历史继续审阅'});expect(reviewed.sourceSnapshot).toBeUndefined();expect(reviewed).not.toHaveProperty('sourceSnapshot');
  store.restore(store.backupBytes());const restored=store.rows<NamingSession>('sessions').find(value=>value.id===saved.id)!;expect(restored.sourceSnapshot).toBeUndefined();expect(restored).not.toHaveProperty('namingRules');expect(restored.analysis).toEqual(legacy.analysis);
 });
});
