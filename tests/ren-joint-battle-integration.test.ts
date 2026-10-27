import {afterEach,beforeAll,describe,expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import initSqlJs from 'sql.js';
import {Store,validSession} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {analyzeProfile,BAZI_REN_DIRECTION_RULE_VERSION,BAZI_REN_JOINT_BATTLE_RULE_VERSION} from '../src/domain/engine';
import {analyzeProfile as analyze14} from '../src/domain/engine-v14';
import {calculateRenCommentary,validRenCommentaryAnalysis} from '../src/domain/ditian-ren';
import {REN_DIRECTION_METHOD,REN_JOINT_BATTLE_METHOD} from '../src/shared/ren-method';
import {loadRenJointBattleSources,REN_JOINT_BATTLE_SOURCE_ID} from '../src/main/ren-joint-battle-data';
import {normalizePreferences} from '../src/shared/workflow';
import {sessionReferencedSourceIds} from '../src/shared/session-sources';
import goldens from './fixtures/ren-joint-battle-source-goldens.json';
import published from './fixtures/ren-session-1.4-saved.json';
import type {BirthProfile,NamingSession} from '../src/shared/types';

const wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm'),dirs:string[]=[],stores:Store[]=[];
const preferences=normalizePreferences({length:1,requiredChars:'文',numerology:false,zodiacRules:false});
const plain=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
const sha=(value:Uint8Array|string)=>createHash('sha256').update(value).digest('hex');
const profile=(index=0):BirthProfile=>({...goldens.realCases[index].profile,renMethod:REN_JOINT_BATTLE_METHOD} as BirthProfile);
const joint=(session:NamingSession)=>session.analysis.renCommentary!.jointBattleAnalysis!;
const disk=(store:Store)=>readFileSync(join(store.userDir,'customers.sqlite'));
let SQL:Awaited<ReturnType<typeof initSqlJs>>;
beforeAll(async()=>{SQL=await initSqlJs({locateFile:()=>wasm});});
async function open(directory?:string){const dir=directory??mkdtempSync(join(tmpdir(),'ren15-integration-'));if(directory===undefined)dirs.push(dir);const store=await new Store(dir,resolve('data'),wasm).init();stores.push(store);return{dir,store,service:new StudioService(store,{read:()=>'',write:()=>{}},false)};}
async function setup(input=profile()){const opened=await open(),session=(await opened.service.generate(input,preferences)).session;return{...opened,session};}
const current=(store:Store,id:string)=>store.rows<NamingSession>('sessions').find(session=>session.id===id)!;
function changed(bytes:Uint8Array,table:'sessions'|'revisions',id:string,edit:(session:NamingSession)=>void){const db=new SQL.Database(new Uint8Array(bytes));try{const json=db.exec(`SELECT json FROM ${table} WHERE id=?`,[id])[0].values[0][0],value=JSON.parse(String(json));edit(value);db.run(`UPDATE ${table} SET json=? WHERE id=?`,[JSON.stringify(value),id]);return db.export();}finally{db.close();}}
afterEach(()=>{for(const store of stores.splice(0))store.db.close();for(const dir of dirs.splice(0))rmSync(dir,{recursive:true,force:true});});

describe('explicit1.5 service, saved proofs and frozen1.4 inheritance',{ timeout: 15_000 }, ()=>{
 it('freezes exact published1.4 modules with only the engine import redirect',()=>{
  expect(sha(readFileSync(resolve('src/domain/ditian-ren-v14.ts')))).toBe('2b7256d64b9156277a953ec26d92dae2c9964141c8a3fdcf1185addffb7199b1');
  expect(sha(readFileSync(resolve('src/domain/engine-v14.ts')))).toBe('7f8b77222bd4581182fb2ea16ff04b7ed846052c098187adda1d07fed8985b20');
 });
 it.each(goldens.realCases.map((row,index)=>({row,index})))('persists real same-pillar $row.id without modifying inherited conclusions',async({row,index})=>{
  const p=profile(index),{session}=await setup(p),base=analyze14({...p,renMethod:REN_DIRECTION_METHOD}),ren=session.analysis.renCommentary!;
  expect(session.analysis.bazi.version).toBe(BAZI_REN_JOINT_BATTLE_RULE_VERSION);expect(validSession(session)).toBe(true);expect(joint(session).state).toBe(row.expected.state);
  expect(joint(session).checks[0]).toMatchObject({target:row.expected.target,attacker:row.expected.attacker,controlEdgeId:row.expected.controlEdgeId,clashEdgeId:row.expected.clashEdgeId,meetingEdgeId:row.expected.meetingEdgeId,meetingClashIntersectionNodeIds:row.expected.intersection,samePillarTargetRootLinkIds:row.expected.samePillarTargetRootLinkIds});
  expect({...session.analysis.bazi,version:BAZI_REN_DIRECTION_RULE_VERSION}).toEqual(base.bazi);expect(session.analysis.qimen).toEqual(base.qimen);
  const inherited=plain(ren);delete inherited.jointBattleAnalysis;inherited.version=REN_DIRECTION_METHOD as typeof inherited.version;inherited.profileId=REN_DIRECTION_METHOD as typeof inherited.profileId;inherited.input.baziVersion=BAZI_REN_DIRECTION_RULE_VERSION;inherited.sourceRules=inherited.sourceRules.filter(source=>source.sourceId!==REN_JOINT_BATTLE_SOURCE_ID);expect(inherited).toEqual(base.renCommentary);
  expect(ren.structureGraph.edges.every(edge=>edge.effectiveAction==='unknown')).toBe(true);expect(ren.actionAnalysis!.rootLinks.every(root=>root.effectiveSupport==='unknown')).toBe(true);expect(joint(session)).toMatchObject({branchClashNetEffect:'unknown',effectiveRootSupport:'unknown',clashRescueResolved:'unknown',formationDecision:'not-evaluated',usefulGodDecision:'not-evaluated'});
  expect(session.sourceSnapshot!.sources.filter(source=>source.id===REN_JOINT_BATTLE_SOURCE_ID)).toEqual(loadRenJointBattleSources(resolve('data')));expect(sessionReferencedSourceIds(session)).toContain(REN_JOINT_BATTLE_SOURCE_ID);
 });
 it('retains all candidate scores and base analysis under explicit14,15 and none',async()=>{
  const{service}=await open(),sessions:NamingSession[]=[];for(const method of ['none',REN_DIRECTION_METHOD,REN_JOINT_BATTLE_METHOD] as const)sessions.push((await service.generate({...profile(),id:'ren15-scores-'+method,renMethod:method},preferences)).session);
  const candidates=(s:NamingSession)=>s.candidates.map(({givenName,evaluation,meaning,reason,warnings,characters,citations})=>({givenName,evaluation,meaning,reason,warnings,characters,citations}));for(const s of sessions.slice(1))expect(candidates(s)).toEqual(candidates(sessions[0]));
  for(const s of sessions.slice(0,2)){expect(s.analysis.renCommentary?.jointBattleAnalysis).toBeUndefined();expect(s.sourceSnapshot!.sources.some(source=>source.id===REN_JOINT_BATTLE_SOURCE_ID)).toBe(false);}
 });
 it('does not supply an unknown hour, infer a quieting verdict, or permit version grafts',async()=>{
  const p={...profile(),birthTime:'',timeUnknown:true,birthLongitude:undefined},a=analyzeProfile(p);expect(a.renCommentary!.jointBattleAnalysis).toBeDefined();expect(a.renCommentary!.structureGraph.nodes.some(node=>node.position==='hour')).toBe(false);expect(a.renCommentary!.jointBattleAnalysis!.state).toBe('unknown');
  expect(()=>calculateRenCommentary(p,{...a.bazi,version:BAZI_REN_DIRECTION_RULE_VERSION})).toThrow();expect(validRenCommentaryAnalysis(a.renCommentary,{...p,renMethod:REN_DIRECTION_METHOD},a.bazi)).toBe(false);
 });
 it('keeps derived proofs immutable through review, revision replay and separate-store restore',async()=>{
  const{store,service,session}=await setup(),draft=structuredClone(session);joint(draft).state='unknown';joint(draft).retainedNodeIds=[];draft.reviewNote='只修改人工审阅';const saved=service.saveSession(draft);expect(saved.analysis).toEqual(session.analysis);
  const revision=service.listHistory(saved.id)[0];expect(revision.session.analysis).toEqual(session.analysis);const restored=service.restoreHistory(saved.id,revision.id,saved.reviewRevision,saved.reviewToken);expect(restored.analysis).toEqual(session.analysis);expect(restored.sourceSnapshot).toEqual(session.sourceSnapshot);
  const destination=await open();destination.store.restore(store.backupBytes());expect(current(destination.store,saved.id).analysis).toEqual(session.analysis);expect(destination.service.listHistory(saved.id).every(row=>JSON.stringify(row.session.analysis)===JSON.stringify(session.analysis))).toBe(true);
 },15000);
 it.each(published.records.filter(row=>row.table==='sessions'))('retains authentic published14 $key current/history without the new source or result',async row=>{
  const old=structuredClone(row.session) as unknown as NamingSession;expect(published.provenance.databaseSha256).toBe('446ab29e072824758442323ab47ee8d16726f956a1d9796b4f750d825bb01136');expect(analyzeProfile(old.profile)).toEqual(old.analysis);expect(old.analysis.renCommentary!.jointBattleAnalysis).toBeUndefined();
  const{store,service}=await open();store.saveProfile(old.profile);const saved=store.saveSession(old);
  const actualHistory=published.records.find(record=>record.key===row.key&&record.table==='revisions')!;expect(actualHistory).toBeDefined();expect(analyzeProfile(actualHistory.session.profile as BirthProfile)).toEqual(actualHistory.session.analysis);
  store.db.run('INSERT INTO revisions(session_id,created_at,json) VALUES(?,?,?)',[saved.id,('createdAt' in actualHistory?actualHistory.createdAt:'') as string,JSON.stringify(actualHistory.session)]);store.flush();expect(service.listHistory(saved.id)[0].session).toEqual(actualHistory.session);
  const reviewed=service.saveSession({...saved,reviewNote:'保留发布14'}),revision=service.listHistory(saved.id)[0];for(const value of [saved,reviewed,revision.session]){expect(value.analysis).toEqual(old.analysis);expect(value.candidates).toEqual(old.candidates);expect(value.sourceSnapshot).toEqual(old.sourceSnapshot);expect(value.sourceSnapshot!.sources.some(source=>source.id===REN_JOINT_BATTLE_SOURCE_ID)).toBe(false);}
  const destination=await open();destination.store.restore(store.backupBytes());expect(current(destination.store,saved.id).analysis).toEqual(old.analysis);
 });
});

const corruptions:Array<{name:string;edit:(session:NamingSession)=>void}>=[
 {name:'joint layer omitted',edit:s=>{delete s.analysis.renCommentary!.jointBattleAnalysis;}},
 {name:'joint wrongly quiet',edit:s=>{joint(s).state='not-applicable';}},
 {name:'inherited wood premise rewritten',edit:s=>{joint(s).inheritedDirection.capability='unknown';}},
 {name:'same pillar attacker replaced',edit:s=>{joint(s).checks[0].attacker.branchNodeId='year:branch:卯';}},
 {name:'same meeting intersection omitted',edit:s=>{joint(s).checks[0].meetingClashIntersectionNodeIds=[];}},
 {name:'project bridge hidden',edit:s=>{joint(s).projectBridges=[];}},
 {name:'effective root invented',edit:s=>{(joint(s) as unknown as {effectiveRootSupport:string}).effectiveRootSupport='met';}},
 {name:'original graph deleted',edit:s=>{s.analysis.renCommentary!.structureGraph.nodes.pop();}},
 {name:'dedicated source erased',edit:s=>{s.sourceSnapshot!.sources=s.sourceSnapshot!.sources.filter(source=>source.id!==REN_JOINT_BATTLE_SOURCE_ID);}},
 {name:'dedicated source forged',edit:s=>{s.sourceSnapshot!.sources.find(source=>source.id===REN_JOINT_BATTLE_SOURCE_ID)!.sha256='0'.repeat(64);}},
 {name:'Bazi downgraded',edit:s=>{s.analysis.bazi.version=BAZI_REN_DIRECTION_RULE_VERSION;}},
 {name:'method downgraded',edit:s=>{s.profile.renMethod=REN_DIRECTION_METHOD;}},
];
describe('new joint provenance rejects tampering atomically',{ timeout: 15_000 }, ()=>{
 it.each(corruptions)('rejects $name on direct save and restore',async({edit})=>{
  const{store,session}=await setup(),before=disk(store),bad=structuredClone(session);edit(bad);expect(()=>store.saveSession(bad)).toThrow();expect(disk(store).equals(before)).toBe(true);expect(()=>store.restore(changed(before,'sessions',session.id,edit))).toThrow();expect(disk(store).equals(before)).toBe(true);expect(current(store,session.id)).toEqual(plain(session));
 });
 it.each(['sessions','revisions'] as const)('rejects corrupted actual %s reads and backup without rewriting bytes',async table=>{
  const{dir,store,service,session}=await setup();service.saveSession({...session,reviewNote:'真实联合动气保存历史'});const revision=service.listHistory(session.id)[0],id=table==='sessions'?session.id:revision.id,corrupted=changed(disk(store),table,id,s=>{joint(s).checks[0].clashEdgeId='wrong-target';});
  store.db.close();stores.splice(stores.indexOf(store),1);writeFileSync(join(dir,'customers.sqlite'),corrupted);
  // Reopen the externally changed SQL so backup rejection proves invalid content, rather than a stale writer hash.
  const reopened=await open(dir),before=disk(reopened.store);expect(before.equals(Buffer.from(corrupted))).toBe(true);
  if(table==='sessions')expect(()=>reopened.service.bootstrap()).toThrow('任注方案读取校验失败');else{expect(reopened.service.bootstrap().sessions.some(value=>value.id===session.id)).toBe(true);expect(()=>reopened.service.listHistory(session.id)).toThrow('任注方案读取校验失败');}
  expect(()=>reopened.store.backupBytes()).toThrow('备份已取消');expect(disk(reopened.store).equals(before)).toBe(true);
 // These serial IPC-equivalent storage paths took6.0–6.3s under the two-worker full run;
 // genuine close/reopen adds IO. Keep a local bounded deadline without changing global timeouts.
 },15000);
 it('reserves the dedicated joint source against knowledge packages',async()=>{
  const{store}=await open(),before=store.currentPackBytes(),db=new SQL.Database(before);let forged:Uint8Array;try{const source=loadRenJointBattleSources(resolve('data'))[0];db.run('INSERT INTO sources(id,json) VALUES(?,?)',[source.id,JSON.stringify(source)]);forged=db.export();}finally{db.close();}expect(()=>store.installPack(forged)).toThrow(/规则来源编号/);expect(store.currentPackBytes()).toEqual(before);
 });
 it('rejects the new source graft on an authentic14 record',async()=>{
  const old=structuredClone(published.records[0].session) as unknown as NamingSession,{store}=await open();store.saveProfile(old.profile);store.saveSession(old);const before=disk(store);old.sourceSnapshot!.sources.push(...loadRenJointBattleSources(resolve('data')));expect(()=>store.saveSession(old)).toThrow();expect(disk(store).equals(before)).toBe(true);
 });
});
