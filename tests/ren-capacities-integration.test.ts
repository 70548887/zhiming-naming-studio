import {afterEach,beforeAll,describe,expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import initSqlJs from 'sql.js';
import published from './fixtures/ren-session-1.0.25.json';
import {Store,validSession} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {analyzeProfile,BAZI_REN_ACTION_RULE_VERSION,BAZI_REN_CAPACITY_RULE_VERSION} from '../src/domain/engine';
import {REN_ACTION_METHOD,REN_CAPACITY_METHOD,REN_METHOD,LEGACY_REN_METHOD} from '../src/shared/ren-method';
import {normalizePreferences} from '../src/shared/workflow';
import {sessionReferencedSourceIds} from '../src/shared/session-sources';
import {REN_CAPACITIES_SOURCE_ID} from '../src/domain/ren-capacities';
import {loadRenCapacitiesSources} from '../src/main/ren-capacities-data';
import {loadRenActionsSources} from '../src/main/ren-actions-data';
import {loadRenNecessarySources} from '../src/main/ren-necessary-data';
import {loadDitianRenSources} from '../src/main/ditian-ren-data';
import type {BirthProfile,NamingSession} from '../src/shared/types';

const wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm'),directories:string[]=[],stores:Store[]=[];
const preferences=normalizePreferences({requiredChars:'安宁',zodiacRules:false});
const profile:BirthProfile={id:'ren-capacities-storage',customerName:'木局能力真实存储边界',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2012-03-15',birthTime:'14:00:00',timeUnknown:false,leapMonth:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'隔离真实出生输入，原书没有宣称这些新盘的公历日期',timeBasis:'civil',renMethod:REN_CAPACITY_METHOD};
const plain=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
const digest=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const capacity=(s:NamingSession)=>s.analysis.renCommentary!.capacityAnalysis!;
const disk=(s:Store)=>readFileSync(join(s.userDir,'customers.sqlite'));
const current=(s:Store,id:string)=>s.rows<NamingSession>('sessions').find(v=>v.id===id)!;
let SQL:Awaited<ReturnType<typeof initSqlJs>>;
beforeAll(async()=>{SQL=await initSqlJs({locateFile:()=>wasm});});
async function open(directory?:string){const dir=directory??mkdtempSync(join(tmpdir(),'ren-capacity-integration-'));if(!directory)directories.push(dir);const store=await new Store(dir,resolve('data'),wasm).init();stores.push(store);return{dir,store,service:new StudioService(store,{read:()=>'',write:()=>{}},false)};}
async function setup(p:BirthProfile=profile){const result=await open(),generated=(await result.service.generate(p,preferences)).session;return{...result,session:current(result.store,generated.id)};}
function close(s:Store){const index=stores.indexOf(s);if(index>=0)stores.splice(index,1);s.db.close();}
function change(database:initSqlJs.Database,table:'sessions'|'revisions',id:string|number,edit:(s:NamingSession)=>void){const row=database.exec(`SELECT json FROM ${table} WHERE id=?`,[id])[0]?.values[0]?.[0];if(typeof row!=='string')throw Error('Actual persisted row missing');const value=JSON.parse(row)as NamingSession;edit(value);database.run(`UPDATE ${table} SET json=? WHERE id=?`,[JSON.stringify(value),id]);}
function alteredBytes(bytes:Uint8Array,table:'sessions'|'revisions',id:string|number,edit:(s:NamingSession)=>void){const database=new SQL.Database(bytes);try{change(database,table,id,edit);return database.export();}finally{database.close();}}
function external(dir:string,table:'sessions'|'revisions',id:string|number,edit:(s:NamingSession)=>void){const file=join(dir,'customers.sqlite');writeFileSync(file,alteredBytes(readFileSync(file),table,id,edit));}
afterEach(()=>{for(const s of stores.splice(0))s.db.close();for(const dir of directories.splice(0)){if(!resolve(dir).startsWith(resolve(tmpdir())+'\\ren-capacity-integration-')&&!resolve(dir).startsWith(resolve(tmpdir())+'/ren-capacity-integration-'))throw Error('Unsafe isolated fixture cleanup');rmSync(dir,{recursive:true,force:true});}});

describe('actual real-date service generation and immutable Ren1.3 source snapshots',{ timeout: 15_000 }, ()=>{
  it.each([
    {birthDate:'2012-03-15',birthTime:'14:00:00',pillars:['壬辰','癸卯','乙亥','癸未'],chen:'year:branch:辰',targets:['month:branch:卯','day:branch:亥','hour:branch:未']},
    {birthDate:'2003-04-01',birthTime:'22:00:00',pillars:['癸未','乙卯','甲辰','乙亥'],chen:'day:branch:辰',targets:['year:branch:未','month:branch:卯','hour:branch:亥']}
  ])('persists both genuine positive abilities and their precise target on $birthDate',async example=>{
    const {session}=await setup({...profile,birthDate:example.birthDate,birthTime:example.birthTime});
    expect(session.analysis.bazi.pillars.map(p=>p.gan+p.zhi)).toEqual(example.pillars);expect(session.analysis.bazi.version).toBe(BAZI_REN_CAPACITY_RULE_VERSION);
    expect(validSession(session)).toBe(true);expect(capacity(session).checks.map(c=>[c.kind,c.state,c.capability])).toEqual([['wood-group-strength','met','met'],['chen-wood-support-capacity','met','met']]);
    expect(capacity(session).checks[1]).toMatchObject({sourceNodeIds:[example.chen],targetNodeIds:example.targets,netEffect:'unknown'});
    expect(capacity(session)).toMatchObject({effectiveRootSupport:'unknown',netEffect:'unknown',formationDecision:'not-evaluated'});
    const ren=session.analysis.renCommentary!,frozen=analyzeProfile({...session.profile,renMethod:REN_ACTION_METHOD}).renCommentary!;
    expect(ren.actionAnalysis).toEqual(frozen.actionAnalysis);expect(ren.structureGraph).toEqual(frozen.structureGraph);expect(ren.necessaryConditions).toEqual(frozen.necessaryConditions);
    expect(ren.actionAnalysis!.rootLinks.every(link=>link.effectiveSupport==='unknown')).toBe(true);
    expect(ren.structureGraph.nodes.some(n=>n.layer==='hidden'&&n.symbol==='丁')).toBe(true);expect(ren.structureGraph.nodes.some(n=>n.layer==='hidden'&&n.symbol==='戊')).toBe(true);
    const renSources=session.sourceSnapshot!.sources.filter(s=>s.id.startsWith('bazi-ditian-ren-'));
    expect(renSources).toEqual([...loadDitianRenSources(resolve('data')),...loadRenNecessarySources(resolve('data')),...loadRenActionsSources(resolve('data')),...loadRenCapacitiesSources(resolve('data'))]);
    expect(session.sourceSnapshot!.sources.filter(s=>s.id===REN_CAPACITIES_SOURCE_ID)).toHaveLength(1);expect(sessionReferencedSourceIds(session)).toContain(REN_CAPACITIES_SOURCE_ID);
  });
  it.each([
    {name:'unknown hour',extra:{timeUnknown:true,birthTime:''},state:'unknown'},
    {name:'unknown apparent-solar day',extra:{timeUnknown:true,birthTime:'',timeBasis:'apparent-solar' as const,birthLongitude:0},state:'unknown'},
    {name:'outside visible wood-water range',extra:{birthDate:'2000-03-18'},state:'not-met'},
    {name:'outside exact wood-group branches',extra:{birthTime:'16:00:00'},state:'not-met'}
  ])('keeps $name unknown as a capability rather than universally negative',async example=>{
    const {session}=await setup({...profile,...example.extra});expect(validSession(session)).toBe(true);
    expect(capacity(session).checks.every(c=>c.state===example.state&&c.capability==='unknown'&&c.netEffect==='unknown')).toBe(true);
    expect(capacity(session).proof.results['capacity:wood-group-strength'].state).toBe('unknown');
    expect(session.sourceSnapshot!.sources.filter(s=>s.id===REN_CAPACITIES_SOURCE_ID)).toEqual(loadRenCapacitiesSources(resolve('data')));
    if(example.extra.timeUnknown){expect(session.analysis.qimen.available).toBe(false);expect(capacity(session).input.complete).toBe(false);expect(session.analysis.renCommentary!.structureGraph.nodes.some(n=>n.position==='hour')).toBe(false);}
    if(example.name==='unknown apparent-solar day'){expect(capacity(session).input.dayStem).toBeNull();expect(capacity(session).input.pillars.filter(p=>!p.known).map(p=>p.position)).toEqual(['day','hour']);}
  });
  it('records the capacity source only for the explicit1.3 method',async()=>{
    const {service}=await open();
    for(const [i,method]of [REN_CAPACITY_METHOD,REN_ACTION_METHOD,REN_METHOD,LEGACY_REN_METHOD,'none' as const].entries()){
      const session=(await service.generate({...profile,id:'ren-capacity-source-selection-'+i,renMethod:method},preferences)).session;
      expect(session.sourceSnapshot!.sources.some(s=>s.id===REN_CAPACITIES_SOURCE_ID)).toBe(method===REN_CAPACITY_METHOD);
      expect(session.analysis.renCommentary?.capacityAnalysis!==undefined).toBe(method===REN_CAPACITY_METHOD);
    }
  },15000);
  it('preserves both abilities and the frozen nested1.2 through review/history and independent-store backup restore',async()=>{
    const {store,service,session}=await setup(),analysis=structuredClone(session.analysis),sources=structuredClone(session.sourceSnapshot),submitted=structuredClone(session);
    submitted.reviewNote='只审阅文案，不改局部能力或根气判据';capacity(submitted).checks[1].sourceNodeIds=['forged-review-input'];submitted.analysis.renCommentary!.actionAnalysis!.rootLinks[0].hiddenNodeId='forged-nested-review-input';
    const reviewed=service.saveSession(submitted);expect(reviewed.analysis).toEqual(analysis);expect(reviewed.sourceSnapshot).toEqual(sources);expect(reviewed.reviewRevision).toBeGreaterThan(session.reviewRevision!);expect(reviewed.reviewToken).not.toBe(session.reviewToken);
    const revision=service.listHistory(session.id)[0];expect(revision.session.analysis).toEqual(analysis);expect(revision.session.sourceSnapshot).toEqual(sources);
    const restored=service.restoreHistory(session.id,revision.id,reviewed.reviewRevision,reviewed.reviewToken);expect(restored.analysis).toEqual(analysis);expect(restored.sourceSnapshot).toEqual(sources);
    const destination=await open();destination.store.restore(store.backupBytes());expect(current(destination.store,session.id).analysis).toEqual(analysis);expect(current(destination.store,session.id).sourceSnapshot).toEqual(sources);expect(destination.service.listHistory(session.id).every(v=>digest(v.session.analysis)===digest(analysis))).toBe(true);
  });
});

describe('six real installed1.0.25 rows stay frozen without any1.3 source backfill',{ timeout: 15_000 }, ()=>{
  it('retains actual installed capture provenance, not a re-generated old expected result',()=>{
    expect(published.provenance.records).toHaveLength(6);expect(published.provenance.appVersion).toBe('1.0.25');expect(published.provenance.sourceInstallerSha256).toBe('66ab5c6d1d04c21983420269f70b37bf5fff836bd3278dddd6848aebddbd3a56');expect(published.provenance.sourceDatabaseSha256).toBe('0e67f367ccd7dc7d67e4f8f9cceb85dab3b9859464d951066eee4011fac240f5');expect(published.provenance.sourceDatabaseSha256AfterRead).toBe(published.provenance.sourceDatabaseSha256);
    for(const record of published.provenance.records){const session=published.sessions[record.key as keyof typeof published.sessions];expect(digest(session)).toBe(record.sessionJsonSha256);expect(digest(session.analysis)).toBe(record.analysisJsonSha256);}
  });
  it.each(published.provenance.records)('keeps complete $key through actual save/review/history/backup',async record=>{
    const old=structuredClone(published.sessions[record.key as keyof typeof published.sessions])as unknown as NamingSession,{store,service}=await open();
    expect(plain(analyzeProfile(old.profile))).toEqual(old.analysis);expect(old.analysis.renCommentary?.capacityAnalysis).toBeUndefined();expect(old.sourceSnapshot!.sources.some(s=>s.id===REN_CAPACITIES_SOURCE_ID)).toBe(false);
    store.saveProfile(old.profile);const saved=store.saveSession(old),reviewed=service.saveSession({...saved,reviewNote:'保留125原版本完整分析'}),revision=service.listHistory(saved.id)[0];
    for(const row of [saved,reviewed,revision.session]){expect(row.analysis).toEqual(old.analysis);expect(row.candidates).toEqual(old.candidates);expect(row.preferences).toEqual(old.preferences);expect(row.sourceSnapshot).toEqual(old.sourceSnapshot);}
    const recovered=service.restoreHistory(saved.id,revision.id,reviewed.reviewRevision,reviewed.reviewToken);expect(recovered.analysis).toEqual(old.analysis);expect(recovered.sourceSnapshot).toEqual(old.sourceSnapshot);
    const destination=await open();destination.store.restore(store.backupBytes());expect(current(destination.store,saved.id).analysis).toEqual(old.analysis);expect(current(destination.store,saved.id).sourceSnapshot).toEqual(old.sourceSnapshot);
  });
});

const corruptions:Array<{name:string;edit:(s:NamingSession)=>void}>=[
  {name:'capacity payload omitted',edit:s=>{delete s.analysis.renCommentary!.capacityAnalysis;}},
  {name:'positive capability altered',edit:s=>{capacity(s).checks[1].capability='unknown';}},
  {name:'adopted proof state altered',edit:s=>{capacity(s).checks[0].state='not-met';}},
  {name:'proof dependency deleted',edit:s=>{capacity(s).proof.nodes.find(n=>n.id==='capacity:chen-wood-support-capacity')!.premises.pop();}},
  {name:'proof result altered',edit:s=>{capacity(s).proof.results['capacity:chen-wood-support-capacity'].state='unknown';}},
  {name:'source node redirected',edit:s=>{capacity(s).checks[1].sourceNodeIds=['month:branch:卯'];}},
  {name:'target node redirected',edit:s=>{capacity(s).checks[1].targetNodeIds=['year:branch:辰'];}},
  {name:'source quote altered',edit:s=>{capacity(s).sourceReferences[0].quote='全盘从强已经成立';}},
  {name:'capacity source omitted',edit:s=>{s.sourceSnapshot!.sources=s.sourceSnapshot!.sources.filter(v=>v.id!==REN_CAPACITIES_SOURCE_ID);}},
  {name:'capacity source identity altered',edit:s=>{s.sourceSnapshot!.sources.find(v=>v.id===REN_CAPACITIES_SOURCE_ID)!.sha256='0'.repeat(64);}},
  {name:'Bazi version downgraded',edit:s=>{s.analysis.bazi.version=BAZI_REN_ACTION_RULE_VERSION;}},
  {name:'method version downgraded',edit:s=>{s.profile.renMethod=REN_ACTION_METHOD;}},
  {name:'inherited1.2 root redirected',edit:s=>{s.analysis.renCommentary!.actionAnalysis!.rootLinks[0].hiddenNodeId='forged-capacity-root';}},
  {name:'entire source manifest deleted',edit:s=>{delete s.sourceSnapshot;}},
  {name:'all source records deleted',edit:s=>{s.sourceSnapshot!.sources=[];}},
  {name:'capacity, sources and method deleted together',edit:s=>{delete s.sourceSnapshot;delete s.profile.renMethod;delete s.analysis.renCommentary;}},
  {name:'fully recalculated1.2 downgrade with all manifests deleted',edit:s=>{s.profile.renMethod=REN_ACTION_METHOD;s.analysis=analyzeProfile(s.profile);delete s.sourceSnapshot;}}
];
const manifestIdentityFailures=new Set(['entire source manifest deleted','all source records deleted','capacity, sources and method deleted together','fully recalculated1.2 downgrade with all manifests deleted']);
const historySourceIdentityFailures=new Set([...manifestIdentityFailures,'capacity source omitted','capacity source identity altered']);
async function rejectsAtInitWithoutChangingBytes(dir:string,damaged:Buffer,message:RegExp){
  const rejected=new Store(dir,resolve('data'),wasm);
  try{await expect(rejected.init()).rejects.toThrow(message);}finally{rejected.db?.close();}
  expect(readFileSync(join(dir,'customers.sqlite')).equals(damaged)).toBe(true);
}
describe('Ren1.3 immutable save/import and actual SQLite current/history rejection',{ timeout: 15_000 }, ()=>{
  it.each(corruptions)('rejects $name at direct save and backup import without changing intact disk bytes',async row=>{
    const {store,session}=await setup(),before=disk(store),bad=structuredClone(session);row.edit(bad);expect(()=>store.saveSession(bad)).toThrow();expect(disk(store).equals(before)).toBe(true);
    expect(()=>store.restore(alteredBytes(store.backupBytes(),'sessions',session.id,row.edit))).toThrow();expect(disk(store).equals(before)).toBe(true);expect(current(store,session.id)).toEqual(session);
  });
  it.each(corruptions.filter(row=>!manifestIdentityFailures.has(row.name)))('rejects external current $name after actual close/reopen and preserves damaged bytes',async row=>{
    const {dir,store,session}=await setup();close(store);external(dir,'sessions',session.id,row.edit);const damaged=readFileSync(join(dir,'customers.sqlite')),opened=await open(dir);
    expect(()=>opened.service.bootstrap()).toThrow();expect(()=>opened.store.rows('sessions')).toThrow();expect(()=>opened.store.backupBytes()).toThrow();expect(disk(opened.store).equals(damaged)).toBe(true);
  });
  it.each(corruptions.filter(row=>manifestIdentityFailures.has(row.name)))('rejects external current $name at the init identity gate and preserves damaged bytes',async row=>{
    const {dir,store,session}=await setup();close(store);external(dir,'sessions',session.id,row.edit);const damaged=readFileSync(join(dir,'customers.sqlite'));
    await rejectsAtInitWithoutChangingBytes(dir,damaged,/命名规则版本、生成字库或固定来源不一致/);
  });
  it.each(corruptions.filter(row=>!historySourceIdentityFailures.has(row.name)))('rejects external history $name while current stays valid and disk bytes stay intact',async row=>{
    const {dir,store,service,session}=await setup();service.saveSession({...structuredClone(session),reviewNote:'产生真实历史用于边界测试'});const revision=service.listHistory(session.id)[0],backup=store.backupBytes(),before=disk(store);
    expect(()=>store.restore(alteredBytes(backup,'revisions',Number(revision.id),row.edit))).toThrow();expect(disk(store).equals(before)).toBe(true);
    close(store);external(dir,'revisions',Number(revision.id),row.edit);const damaged=readFileSync(join(dir,'customers.sqlite')),opened=await open(dir);
    expect(opened.service.bootstrap().sessions.some(v=>v.id===session.id)).toBe(true);expect(()=>opened.service.listHistory(session.id)).toThrow();expect(()=>opened.store.backupBytes()).toThrow();expect(disk(opened.store).equals(damaged)).toBe(true);
  });
  it.each(corruptions.filter(row=>historySourceIdentityFailures.has(row.name)))('rejects external history $name at the init identity gate with the valid current SQL unchanged',async row=>{
    const {dir,store,service,session}=await setup(),reviewed=service.saveSession({...structuredClone(session),reviewNote:'产生真实历史用于边界测试'}),revision=service.listHistory(session.id)[0],backup=store.backupBytes(),before=disk(store);
    expect(()=>store.restore(alteredBytes(backup,'revisions',Number(revision.id),row.edit))).toThrow();expect(disk(store).equals(before)).toBe(true);
    close(store);external(dir,'revisions',Number(revision.id),row.edit);const damaged=readFileSync(join(dir,'customers.sqlite')),database=new SQL.Database(damaged);
    try{expect(JSON.parse(String(database.exec('SELECT json FROM sessions WHERE id=?',[session.id])[0].values[0][0]))).toEqual(reviewed);}finally{database.close();}
    await rejectsAtInitWithoutChangingBytes(dir,damaged,manifestIdentityFailures.has(row.name)?/命名规则版本、生成字库或固定来源不一致/:/命名规则历史关联不一致/);
  });
  it('does not allow an unknown-hour saved capability to be promoted to a proven ability',async()=>{
    const {store,session}=await setup({...profile,timeUnknown:true,birthTime:''}),before=disk(store),edit=(s:NamingSession)=>{capacity(s).checks.forEach(c=>{c.state='met';c.capability='met';});};
    const bad=structuredClone(session);edit(bad);expect(()=>store.saveSession(bad)).toThrow();expect(()=>store.restore(alteredBytes(store.backupBytes(),'sessions',session.id,edit))).toThrow();expect(disk(store).equals(before)).toBe(true);
  });
  it.each(['none-current','ren12-known-current']as const)('rejects a new source graft on genuine old $key at the real read boundary',async key=>{
    const {dir,store}=await open(),old=structuredClone(published.sessions[key])as unknown as NamingSession;store.saveProfile(old.profile);store.saveSession(old);close(store);external(dir,'sessions',old.id,s=>{s.sourceSnapshot!.sources.push(...loadRenCapacitiesSources(resolve('data')));});const damaged=readFileSync(join(dir,'customers.sqlite')),opened=await open(dir);
    expect(()=>opened.service.bootstrap()).toThrow();expect(disk(opened.store).equals(damaged)).toBe(true);
  });
});
