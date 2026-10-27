import{afterEach,beforeAll,describe,expect,it}from'vitest';
import{mkdtempSync,readFileSync,rmSync}from'node:fs';
import{tmpdir}from'node:os';import{join,resolve}from'node:path';import initSqlJs from'sql.js';
import{Store,validSession}from'../src/main/store';import{StudioService}from'../src/main/service';
import{analyzeProfileV7}from'../src/domain/engine-v7';import{expectedAnalysis}from'../src/main/expected-analysis';
import{normalizePreferences}from'../src/shared/workflow';import{SOLAR_TIME_SOURCE_ID}from'../src/main/solar-time-data';
import type{BirthProfile,NamingSession}from'../src/shared/types';
const wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm'),stores:Store[]=[],directories:string[]=[];
const p:BirthProfile={id:'solar-storage',customerName:'太阳钟面验收',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'00:30:00',timeUnknown:false,leapMonth:false,birthPlace:'乌鲁木齐',timezone:'Asia/Shanghai',notes:'',timeBasis:'apparent-solar',birthLongitude:87.6168,seasonalMethod:'qiongtong-2294674-initial/1.0.0'};
let SQL:Awaited<ReturnType<typeof initSqlJs>>;beforeAll(async()=>{SQL=await initSqlJs({locateFile:()=>wasm});});
async function open(){const dir=mkdtempSync(join(tmpdir(),'solar-time-storage-'));directories.push(dir);const store=await new Store(dir,resolve('data'),wasm).init();stores.push(store);return {store,service:new StudioService(store,{read:()=>'',write:()=>{}},false)};}
const preferences=normalizePreferences({requiredChars:'安宁',zodiacRules:false});
afterEach(()=>{for(const store of stores.splice(0))store.db.close();for(const dir of directories.splice(0))rmSync(dir,{force:true,recursive:true});});
const bytes=(store:Store)=>readFileSync(join(store.userDir,'customers.sqlite'));
const saved=(store:Store,id:string)=>store.rows<NamingSession>('sessions').find(item=>item.id===id)!;
const malformed=(archive:Uint8Array,session:NamingSession,change:(value:NamingSession)=>void)=>{const db=new SQL.Database(archive),value=structuredClone(session);try{change(value);db.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(value),value.id]);return db.export();}finally{db.close();}};

describe('actual generated solar sessions remain restorable with their original clock inputs and source', { timeout: 15_000 },()=>{
 it('preserves known, unknown two-day, zero-pillar and short-DST certain-day analyses through history and backup restore',async()=>{
  const{store,service}=await open(),rows: NamingSession[]=[];
  for(const [index,extra]of[{}, {timeUnknown:true,birthTime:''}, {birthDate:'2024-02-04',timeUnknown:true,birthTime:''},{birthDate:'2024-03-10',timeUnknown:true,birthTime:'',timezone:'America/New_York',birthLongitude:-72.4}].entries()){
   const profile={...p,...extra,id:p.id+'-'+index},session=(await service.generate(profile,preferences)).session;rows.push(session);
   expect(validSession(session)).toBe(true);expect(session.sourceSnapshot!.sources.filter(source=>source.id===SOLAR_TIME_SOURCE_ID)).toHaveLength(1);
   const trace=structuredClone(session.analysis.bazi.timeBasis),analysis=structuredClone(session.analysis),sources=structuredClone(session.sourceSnapshot);
   const reviewed=service.saveSession({...structuredClone(session),reviewNote:'人工审阅：日时按太阳钟面，节气按实际瞬间'}),revision=service.listHistory(session.id)[0];
   expect(revision.session.analysis).toEqual(analysis);service.restoreHistory(session.id,revision.id,reviewed.reviewRevision,reviewed.reviewToken);
   expect(saved(store,session.id).analysis.bazi.timeBasis).toEqual(trace);expect(saved(store,session.id).sourceSnapshot).toEqual(sources);
  }
  expect(rows[0].analysis.bazi.pillars.map(p=>p.gan+p.zhi)).toEqual(['甲辰','丙寅','癸卯','癸亥']);
  expect(rows[1].analysis.bazi.timeBasis!.dayCandidates).toHaveLength(2);expect(rows[1].analysis.bazi.evidence).toBeUndefined();expect(rows[2].analysis.bazi.pillars).toEqual([]);
  expect(rows[3].analysis.bazi.timeBasis!.dayStatus).toBe('determined');expect(rows[3].analysis.bazi.evidence).toBeDefined();
  const destination=await open();destination.store.restore(store.backupBytes());
  for(const row of rows){expect(saved(destination.store,row.id).analysis).toEqual(row.analysis);expect(saved(destination.store,row.id).sourceSnapshot).toEqual(row.sourceSnapshot);}
 },15000);
 it('rejects forged solar profiles, clock traces and downgraded labels without changing saved database or history',async()=>{
  const{store,service}=await open(),session=(await service.generate(p,preferences)).session,good=store.backupBytes(),before=bytes(store),history=service.listHistory(session.id);
  const changes:((value:NamingSession)=>void)[]=[s=>{s.profile.birthLongitude=88;},s=>{s.profile.timezone='Asia/Tokyo';},s=>{s.profile.timeBasis='civil';},s=>{delete s.analysis.bazi.timeBasis;},s=>{s.analysis.bazi.timeBasis!.points[0].equationOfTimeMinutes+=1;},s=>{s.analysis.bazi.timeBasis!.points[0].clockDateTime='2024-02-10 00:30:00';},s=>{s.sourceSnapshot!.sources=s.sourceSnapshot!.sources.filter(source=>source.id!==SOLAR_TIME_SOURCE_ID);},s=>{s.sourceSnapshot!.sources.find(source=>source.id===SOLAR_TIME_SOURCE_ID)!.commit='forged';},s=>{s.analysis=analyzeProfileV7({...s.profile,timeBasis:'civil'});s.originalFavorable=[...s.analysis.bazi.favorable];}];
  for(const change of changes){expect(()=>store.restore(malformed(good,session,change))).toThrow();expect(bytes(store).equals(before)).toBe(true);expect(service.listHistory(session.id)).toEqual(history);expect(saved(store,session.id)).toEqual(session);}
 });
 it('keeps older complete civil analyses free of new traces or NOAA source backfill',async()=>{
  const{store,service}=await open(),civil={...p,timeBasis:'civil' as const},generated=(await service.generate(civil,preferences)).session;
  expect(generated.sourceSnapshot!.sources.some(source=>source.id===SOLAR_TIME_SOURCE_ID)).toBe(false);
  const legacy=structuredClone(generated);legacy.id='old-civil-1.7';legacy.analysis=analyzeProfileV7(civil);legacy.originalFavorable=[...legacy.analysis.bazi.favorable];delete legacy.reviewRevision;delete legacy.reviewToken;
  const value=store.saveSession(legacy);expect(value.analysis.bazi.timeBasis).toBeUndefined();expect(value.sourceSnapshot!.sources.some(source=>source.id===SOLAR_TIME_SOURCE_ID)).toBe(false);
  const reviewed=service.saveSession({...value,reviewNote:'历史方案保持原排盘版本'});expect(reviewed.analysis).toEqual(legacy.analysis);
  const destination=await open();destination.store.restore(store.backupBytes());expect(saved(destination.store,legacy.id).analysis).toEqual(legacy.analysis);
 });
 it('refuses invalid time basis or longitude through service inputs and through accessor cache inputs',async()=>{
  const{service}=await open();for(const extra of [{timeBasis:'injected'},{birthLongitude:'87'},{birthLongitude:181},{birthLongitude:undefined}])expect(()=>service.saveProfile({...p,...extra}as BirthProfile)).toThrow();
  const accessor={...p};Object.defineProperty(accessor,'birthLongitude',{get:()=>87.6168});expect(()=>expectedAnalysis(accessor)).toThrow('访问器');
  const method={...p};Object.defineProperty(method,'timeBasis',{get:()=> 'apparent-solar'});expect(()=>expectedAnalysis(method)).toThrow('访问器');
 });
});
