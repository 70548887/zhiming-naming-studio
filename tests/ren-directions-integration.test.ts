import {afterEach,beforeAll,describe,expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename,dirname,join,resolve} from 'node:path';
import initSqlJs from 'sql.js';
import published from './fixtures/ren-session-1.3-saved.json';
import {Store,validSession} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {BAZI_REN_CAPACITY_RULE_VERSION,BAZI_REN_DIRECTION_RULE_VERSION} from '../src/domain/engine';
import {REN_ACTION_METHOD,REN_CAPACITY_METHOD,REN_DIRECTION_METHOD} from '../src/shared/ren-method';
import {loadRenDirectionsSources,REN_DIRECTIONS_SOURCE_ID} from '../src/main/ren-directions-data';
import {normalizePreferences} from '../src/shared/workflow';
import {sessionReferencedSourceIds} from '../src/shared/session-sources';
import type {Analysis,BirthProfile,NamingSession} from '../src/shared/types';
import type {RenDirectionKind} from '../src/shared/ren-directions-types';

const wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm'),directories:string[]=[],stores:Store[]=[];
const preferences=normalizePreferences({length:2,requiredChars:'安宁',zodiacRules:false});
const profile:BirthProfile={id:'ren14-storage',customerName:'任注木火方局部旺势实际存储测试',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2023-02-15',birthTime:'22:00:00',timeUnknown:false,leapMonth:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'人工软件验收输入，不冒充原书公历生日',timeBasis:'civil',renMethod:REN_DIRECTION_METHOD};
const plain=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const direction=(session:NamingSession)=>session.analysis.renCommentary!.directionAnalysis!;
const check=(session:NamingSession,kind:RenDirectionKind='wood-direction-strength')=>direction(session).checks.find(item=>item.kind===kind)!;
const disk=(store:Store)=>readFileSync(join(store.userDir,'customers.sqlite'));
const current=(store:Store,id:string)=>store.rows<NamingSession>('sessions').find(session=>session.id===id)!;
let SQL:Awaited<ReturnType<typeof initSqlJs>>;
beforeAll(async()=>{SQL=await initSqlJs({locateFile:()=>wasm});});
async function open(directory?:string){const dir=directory??mkdtempSync(join(tmpdir(),'ren-direction-integration-'));if(!directory)directories.push(dir);const store=await new Store(dir,resolve('data'),wasm).init();stores.push(store);return{dir,store,service:new StudioService(store,{read:()=>'',write:()=>{}},false)};}
async function setup(input:BirthProfile=profile){const opened=await open(),generated=(await opened.service.generate(input,preferences)).session;expect(generated.candidates.length).toBeGreaterThan(0);return{...opened,session:current(opened.store,generated.id)};}
function close(store:Store){const index=stores.indexOf(store);if(index>=0)stores.splice(index,1);store.db.close();}
function editDatabase(database:initSqlJs.Database,table:'sessions'|'revisions',id:string|number,edit:(session:NamingSession)=>void){const json=database.exec(`SELECT json FROM ${table} WHERE id=?`,[id])[0]?.values[0]?.[0];if(typeof json!=='string')throw new Error('Actual persisted row missing');const session=JSON.parse(json) as NamingSession;edit(session);database.run(`UPDATE ${table} SET json=? WHERE id=?`,[JSON.stringify(session),id]);}
function altered(bytes:Uint8Array,table:'sessions'|'revisions',id:string|number,edit:(session:NamingSession)=>void){const database=new SQL.Database(bytes);try{editDatabase(database,table,id,edit);return database.export();}finally{database.close();}}
function external(dir:string,table:'sessions'|'revisions',id:string|number,edit:(session:NamingSession)=>void){const file=join(dir,'customers.sqlite');writeFileSync(file,altered(readFileSync(file),table,id,edit));}
afterEach(()=>{for(const store of stores.splice(0))store.db.close();for(const dir of directories.splice(0)){if(dirname(resolve(dir))!==resolve(tmpdir())||!basename(dir).startsWith('ren-direction-integration-'))throw new Error('Unsafe isolated fixture cleanup');rmSync(dir,{recursive:true,force:true});}});

// Valid civil dates and four-pillar fields independently checked before the new evaluator existed;
// these are new software inputs, not Gregorian dates assigned to the author's undated examples.
const positives=[
 {id:'wood',birthDate:'2023-02-15',birthTime:'22:00:00',pillars:['癸卯','甲寅','甲辰','乙亥'],kind:'wood-direction-strength' as const,sourceNodes:['year:branch:卯','month:branch:寅','day:branch:辰'],dayNode:'day:exposed:甲'},
 {id:'fire-bing',birthDate:'1977-06-18',birthTime:'14:00:00',pillars:['丁巳','丙午','丙午','乙未'],kind:'fire-direction-strength' as const,sourceNodes:['year:branch:巳','month:branch:午','day:branch:午','hour:branch:未'],dayNode:'day:exposed:丙'},
 {id:'fire-ding',birthDate:'1977-06-19',birthTime:'12:00:00',pillars:['丁巳','丙午','丁未','丙午'],kind:'fire-direction-strength' as const,sourceNodes:['year:branch:巳','month:branch:午','day:branch:未','hour:branch:午'],dayNode:'day:exposed:丁'},
];
describe('real service1.4 directional local strength and exact source snapshots',{ timeout: 15_000 }, ()=>{
 it.each(positives)('persists $id local sufficient proof without a net-effect or formation verdict',async item=>{
  const {session}=await setup({...profile,id:'ren14-'+item.id,birthDate:item.birthDate,birthTime:item.birthTime});expect(session.analysis.bazi.pillars.map(pillar=>pillar.gan+pillar.zhi)).toEqual(item.pillars);expect(session.analysis.bazi.version).toBe(BAZI_REN_DIRECTION_RULE_VERSION);expect(validSession(session)).toBe(true);
  expect(check(session,item.kind)).toMatchObject({state:'met',capability:'met',sourceNodeIds:item.sourceNodes,targetNodeIds:[item.dayNode],netEffect:'unknown',ruleMode:'sufficient-only'});expect(direction(session)).toMatchObject({netEffect:'unknown',effectiveRootSupport:'unknown',strengthDecision:'not-evaluated',formationDecision:'not-evaluated',usefulGodDecision:'not-evaluated'});
  const ren=session.analysis.renCommentary!;expect(direction(session).retainedNodeIds).toEqual(ren.structureGraph.nodes.map(node=>node.id));expect(direction(session).retainedRootLinkIds).toEqual(ren.actionAnalysis!.rootLinks.map(root=>root.id));expect(ren.actionAnalysis!.rootLinks.every(root=>root.effectiveSupport==='unknown')).toBe(true);
  expect(session.sourceSnapshot!.sources.filter(source=>source.id===REN_DIRECTIONS_SOURCE_ID)).toEqual(loadRenDirectionsSources(resolve('data')));expect(sessionReferencedSourceIds(session)).toContain(REN_DIRECTIONS_SOURCE_ID);
  if(item.id.startsWith('fire')){expect(check(session,item.kind).sourceNodeIds.filter(id=>id.endsWith(':午'))).toHaveLength(2);expect(ren.structureGraph.nodes.some(node=>node.layer==='hidden'&&node.symbol==='庚')).toBe(true);expect(ren.structureGraph.nodes.some(node=>node.layer==='hidden'&&node.symbol==='己')).toBe(true);}
 });
 it('proves known wood triad despite unknown hour, with no artificial hour or hidden-hour node',async()=>{
  const {session}=await setup({...profile,timeUnknown:true,birthTime:''});expect(check(session)).toMatchObject({state:'met',capability:'met'});expect(direction(session).input.complete).toBe(false);expect(direction(session).input.dayStem).toBe('甲');expect(session.analysis.qimen.available).toBe(false);
  const fact=check(session).facts.find(item=>item.id==='input-completeness')!;expect(fact).toMatchObject({state:'unknown',contributesToProof:false});expect(direction(session).proof.nodes.find(node=>node.id===check(session).dependencyId)!.premises.some(id=>id.includes('input-completeness'))).toBe(false);expect(session.analysis.renCommentary!.structureGraph.nodes.some(node=>node.position==='hour')).toBe(false);expect(direction(session).retainedNodeIds.some(id=>id.startsWith('hour:'))).toBe(false);
 });
 it('keeps true-solar uncertain day unresolved and never substitutes a noon day or hour',async()=>{
  const {session}=await setup({...profile,timeUnknown:true,birthTime:'',timeBasis:'apparent-solar',birthLongitude:0});expect(direction(session).input.dayStem).toBeNull();expect(direction(session).checks.every(item=>item.state==='unknown'&&item.capability==='unknown')).toBe(true);expect(session.analysis.renCommentary!.structureGraph.nodes.some(node=>node.position==='day'||node.position==='hour')).toBe(false);expect(session.analysis.bazi.favorable).toEqual([]);expect(session.analysis.qimen.available).toBe(false);
 });
 it.each([{id:'missing-member',date:'2023-02-16',pillars:['癸卯','甲寅','乙巳','丁亥']},{id:'different-day-element',date:'2023-02-27',pillars:['癸卯','甲寅','丙辰','己亥']}])('retains $id as a failed sufficient path rather than globally not旺',async item=>{
  const {session}=await setup({...profile,birthDate:item.date});expect(session.analysis.bazi.pillars.map(pillar=>pillar.gan+pillar.zhi)).toEqual(item.pillars);expect(check(session)).toMatchObject({state:'not-met',capability:'unknown',netEffect:'unknown'});expect(direction(session).strengthDecision).toBe('not-evaluated');expect(direction(session).proof.results[check(session).dependencyId].state).toBe('unknown');
 });
 it.each([{date:'2023-02-15',time:'20:00:00',kind:'wood-direction-strength' as const,pair:['day:branch:辰','hour:branch:戌']},{date:'1977-06-19',time:'22:00:00',kind:'fire-direction-strength' as const,pair:['year:branch:巳','hour:branch:亥']}])('keeps actual fourth-branch clash on $date $time without cancelling source local strength',async item=>{
  const {session}=await setup({...profile,birthDate:item.date,birthTime:item.time});expect(check(session,item.kind)).toMatchObject({state:'met',capability:'met',netEffect:'unknown'});const graph=session.analysis.renCommentary!.structureGraph;expect(item.pair.every(id=>graph.nodes.some(node=>node.id===id))).toBe(true);expect(graph.edges.some(edge=>edge.kind==='branch-clash'&&item.pair.every(id=>edge.from.concat(edge.to).includes(id)))).toBe(true);expect(graph.edges.every(edge=>edge.effectiveAction==='unknown')).toBe(true);expect(direction(session).retainedNodeIds).toEqual(graph.nodes.map(node=>node.id));
 });
 it('changes only explicit1.4 metadata/source/layer while preserving inherited1.3 and all scores',async()=>{
  const {service}=await open(),sessions:NamingSession[]=[];for(const [index,renMethod]of ['none',REN_CAPACITY_METHOD,REN_DIRECTION_METHOD].entries())sessions.push((await service.generate({...profile,id:'ren14-invariance-'+index,renMethod:renMethod as BirthProfile['renMethod']},preferences)).session);
  const base=(analysis:Analysis)=>{const value=plain(analysis);delete value.renCommentary;value.bazi.version='comparison-only';return value;},candidates=(session:NamingSession)=>session.candidates.map(candidate=>({givenName:candidate.givenName,evaluation:candidate.evaluation,characters:candidate.characters,citations:candidate.citations,meaning:candidate.meaning,reason:candidate.reason,warnings:candidate.warnings}));
  for(const value of sessions.slice(1)){expect(base(value.analysis)).toEqual(base(sessions[0].analysis));expect(candidates(value)).toEqual(candidates(sessions[0]));}
  const inherited=plain(sessions[2].analysis.renCommentary!);delete inherited.directionAnalysis;inherited.version=REN_CAPACITY_METHOD as typeof inherited.version;inherited.profileId=REN_CAPACITY_METHOD as typeof inherited.profileId;inherited.input.baziVersion=BAZI_REN_CAPACITY_RULE_VERSION;inherited.sourceRules=inherited.sourceRules.filter(source=>source.sourceId!==REN_DIRECTIONS_SOURCE_ID);expect(inherited).toEqual(sessions[1].analysis.renCommentary);
  expect(sessions[0].sourceSnapshot!.sources.some(source=>source.id===REN_DIRECTIONS_SOURCE_ID)).toBe(false);expect(sessions[1].sourceSnapshot!.sources.some(source=>source.id===REN_DIRECTIONS_SOURCE_ID)).toBe(false);
 });
 // This case validates full snapshots across two stores, history replay and backup import.
 // Keep its deadline bounded separately from lighter cases under concurrent desktop/full-suite load.
 it('keeps saved analysis immutable through review/history and separate-store backup restoration',async()=>{
  const {store,service,session}=await setup(),analysis=structuredClone(session.analysis),sources=structuredClone(session.sourceSnapshot),draft=structuredClone(session);draft.reviewNote='仅人工审阅，不编辑派生原典结论';check(draft).capability='unknown';direction(draft).retainedNodeIds=[];
  const saved=service.saveSession(draft);expect(saved.analysis).toEqual(analysis);expect(saved.sourceSnapshot).toEqual(sources);const revision=service.listHistory(saved.id)[0];expect(revision.session.analysis).toEqual(analysis);const restored=service.restoreHistory(saved.id,revision.id,saved.reviewRevision,saved.reviewToken);expect(restored.analysis).toEqual(analysis);expect(restored.sourceSnapshot).toEqual(sources);
  const destination=await open();destination.store.restore(store.backupBytes());expect(current(destination.store,saved.id).analysis).toEqual(analysis);expect(current(destination.store,saved.id).sourceSnapshot).toEqual(sources);expect(destination.service.listHistory(saved.id).every(row=>digest(row.session.analysis)===digest(analysis))).toBe(true);
 },15_000);
});

describe('actual published1.3 states remain byte-equivalent in persisted facts',{ timeout: 15_000 }, ()=>{
 it.each(published.records)('preserves complete $key in save/review/history/cross-store restore without new source backfill',async record=>{
  expect(published.provenance.capturedFromRelease).toBe('1.0.26');expect(published.provenance.sha256Before).toBe(published.provenance.sha256After);expect(published.provenance.published127Asar.sha256).toBe('42a3cdeead5821082558850b5938c92c532a5cf08e2f482796fd5a814ce58158');
  const old=structuredClone(record.session) as unknown as NamingSession;expect(digest(old)).toBe(record.sessionJsonSha256);expect(old.analysis.renCommentary!.directionAnalysis).toBeUndefined();expect(old.sourceSnapshot!.sources.some(source=>source.id===REN_DIRECTIONS_SOURCE_ID)).toBe(false);
  const {store,service}=await open();store.saveProfile(old.profile);const saved=store.saveSession(old),reviewed=service.saveSession({...saved,reviewNote:'保留真实发布1.3全部事实'}),revision=service.listHistory(saved.id)[0];for(const value of [saved,reviewed,revision.session]){expect(value.analysis).toEqual(old.analysis);expect(value.candidates).toEqual(old.candidates);expect(value.preferences).toEqual(old.preferences);expect(value.sourceSnapshot).toEqual(old.sourceSnapshot);}
  const restored=service.restoreHistory(saved.id,revision.id,reviewed.reviewRevision,reviewed.reviewToken);expect(restored.analysis).toEqual(old.analysis);const destination=await open();destination.store.restore(store.backupBytes());expect(current(destination.store,saved.id).analysis).toEqual(old.analysis);expect(current(destination.store,saved.id).sourceSnapshot).toEqual(old.sourceSnapshot);
 });
});

const corruptions:Array<{name:string;edit:(session:NamingSession)=>void}>=[
 {name:'direction result omitted',edit:session=>{delete session.analysis.renCommentary!.directionAnalysis;}},
 {name:'positive local capability altered',edit:session=>{check(session).capability='unknown';}},
 {name:'positive proof path altered',edit:session=>{check(session).state='not-met';}},
 {name:'source premise altered',edit:session=>{check(session).facts.find(fact=>fact.id==='complete-direction')!.state='unknown';}},
 {name:'completeness promoted to source premise',edit:session=>{check(session).facts.find(fact=>fact.id==='input-completeness')!.contributesToProof=true;}},
 {name:'sufficient dependency deleted',edit:session=>{direction(session).proof.nodes.find(node=>node.id===check(session).dependencyId)!.premises.pop();}},
 {name:'proof verdict changed',edit:session=>{direction(session).proof.results[check(session).dependencyId].state='unknown';}},
 {name:'source node redirected',edit:session=>{check(session).sourceNodeIds=['hour:branch:亥'];}},
 {name:'target node redirected',edit:session=>{check(session).targetNodeIds=['year:exposed:癸'];}},
 {name:'retained original node omitted',edit:session=>{direction(session).retainedNodeIds.pop();}},
 {name:'retained root link omitted',edit:session=>{direction(session).retainedRootLinkIds.pop();}},
 {name:'hidden original node deleted',edit:session=>{const graph=session.analysis.renCommentary!.structureGraph;graph.nodes=graph.nodes.filter(node=>node.id!==graph.nodes.find(item=>item.layer==='hidden')!.id);}},
 {name:'original quote overwritten',edit:session=>{direction(session).sourceReferences[0].quote='完整判格已经通过';}},
 {name:'unproved effective roots invented',edit:session=>{(direction(session) as unknown as {effectiveRootSupport:string}).effectiveRootSupport='met';}},
 {name:'direction input day changed',edit:session=>{direction(session).input.dayStem='乙';}},
 {name:'dedicated source omitted',edit:session=>{session.sourceSnapshot!.sources=session.sourceSnapshot!.sources.filter(source=>source.id!==REN_DIRECTIONS_SOURCE_ID);}},
 {name:'dedicated source metadata forged',edit:session=>{session.sourceSnapshot!.sources.find(source=>source.id===REN_DIRECTIONS_SOURCE_ID)!.sha256='0'.repeat(64);}},
 {name:'Bazi version downgraded',edit:session=>{session.analysis.bazi.version=BAZI_REN_CAPACITY_RULE_VERSION;}},
 {name:'selected method downgraded',edit:session=>{session.profile.renMethod=REN_CAPACITY_METHOD;}},
 {name:'complete source snapshot stripped',edit:session=>{delete session.sourceSnapshot;}},
];
describe('Ren1.4 save/import/actual SQL current and history tamper rejection',{ timeout: 15_000 }, ()=>{
 it.each(corruptions)('rejects $name on save/import without changing good bytes',async corruption=>{
  const {store,session}=await setup(),before=disk(store),bad=structuredClone(session);corruption.edit(bad);expect(()=>store.saveSession(bad)).toThrow();expect(disk(store).equals(before)).toBe(true);expect(()=>store.restore(altered(store.backupBytes(),'sessions',session.id,corruption.edit))).toThrow();expect(disk(store).equals(before)).toBe(true);expect(current(store,session.id)).toEqual(plain(session));
 });
 it.each(corruptions)('rejects $name on actual currentSQL read without rewriting damaged bytes',async corruption=>{
  const {dir,store,session}=await setup();close(store);external(dir,'sessions',session.id,corruption.edit);const changed=disk({userDir:dir} as Store);
  if(corruption.name==='complete source snapshot stripped'){
   // An explicit current naming identity requires its source manifest already during startup.
   await expect(open(dir)).rejects.toThrow('命名规则版本');expect(readFileSync(join(dir,'customers.sqlite')).equals(changed)).toBe(true);return;
  }
  const reopened=await open(dir);expect(()=>reopened.service.bootstrap()).toThrow();expect(disk(reopened.store).equals(changed)).toBe(true);
 });
 it.each(corruptions)('rejects $name in actual historySQL, keeping current readable only when generation identity agrees',async corruption=>{
  const {dir,store,service,session}=await setup();service.saveSession({...session,reviewNote:'保存真实局部正判历史'});const revision=service.listHistory(session.id)[0];close(store);external(dir,'revisions',Number(revision.id),corruption.edit);const changed=disk({userDir:dir} as Store);
  if(['dedicated source omitted','dedicated source metadata forged','complete source snapshot stripped'].includes(corruption.name)){
   // A mismatched generation identity must fail at init; derived graph edits retain the later read boundary.
   await expect(open(dir)).rejects.toThrow('命名规则');expect(readFileSync(join(dir,'customers.sqlite')).equals(changed)).toBe(true);return;
  }
  const reopened=await open(dir);expect(reopened.service.bootstrap().sessions.some(value=>value.id===session.id)).toBe(true);expect(()=>reopened.service.listHistory(session.id)).toThrow();expect(()=>reopened.store.backupBytes()).toThrow();expect(disk(reopened.store).equals(changed)).toBe(true);
 },15000);
 it.each(['sessions','revisions'] as const)('rejects a new-source graft into authentic1.3 %s without upgrading it',async table=>{
  const old=structuredClone(published.records.find(record=>record.table==='sessions')!.session) as unknown as NamingSession,{dir,store,service}=await open();store.saveProfile(old.profile);let saved=store.saveSession(old);saved=service.saveSession({...saved,reviewNote:'旧1.3不补新来源'});const revision=service.listHistory(saved.id)[0],graft=(value:NamingSession)=>{value.sourceSnapshot!.sources.push(...loadRenDirectionsSources(resolve('data')));};
  const before=disk(store),bad=structuredClone(saved);graft(bad);expect(()=>store.saveSession(bad)).toThrow();expect(disk(store).equals(before)).toBe(true);expect(()=>store.restore(altered(store.backupBytes(),table,table==='sessions'?saved.id:Number(revision.id),graft))).toThrow();expect(disk(store).equals(before)).toBe(true);
  close(store);external(dir,table,table==='sessions'?saved.id:Number(revision.id),graft);const changed=disk({userDir:dir} as Store),reopened=await open(dir);if(table==='sessions')expect(()=>reopened.service.bootstrap()).toThrow();else{expect(()=>reopened.service.listHistory(saved.id)).toThrow();expect(()=>reopened.store.backupBytes()).toThrow();}expect(disk(reopened.store).equals(changed)).toBe(true);
 });
 it.each([REN_ACTION_METHOD,REN_CAPACITY_METHOD,'none'] as const)('does not attach directional fields or its dedicated source to %s',async method=>{
  const {session}=await setup({...profile,renMethod:method});expect(session.analysis.renCommentary?.directionAnalysis).toBeUndefined();expect(session.sourceSnapshot!.sources.some(source=>source.id===REN_DIRECTIONS_SOURCE_ID)).toBe(false);expect(sessionReferencedSourceIds(session)).not.toContain(REN_DIRECTIONS_SOURCE_ID);
 });
});
