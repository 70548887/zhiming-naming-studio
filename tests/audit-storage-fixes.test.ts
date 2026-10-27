import { afterEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import initSqlJs from 'sql.js';
import { Store, defaults } from '../src/main/store';
import { StudioService } from '../src/main/service';
import { createSessionSourceSnapshot } from '../src/shared/session-sources';
import {OFFICIAL_NAME_POPULARITY_SOURCE_ID} from '../src/shared/official-name-popularity';
import {ALL_NAMING_RULE_SOURCE_IDS,NAMING_RULE_V6_VERSION,NAMING_RULE_V6_SOURCE_ID} from '../src/shared/naming-rules';
import { analyzeProfile } from '../src/domain/engine';
import { generateLocal as generateLocalV6 } from '../src/domain/naming-v6';
import { loadNumerologyData } from '../src/main/numerology-data';
import { loadQimenSources } from '../src/main/qimen-data';
import type { BirthProfile, NamingPreferences, NamingSession } from '../src/shared/types';

const wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm');
const dirs:string[]=[],stores:Store[]=[];
const profile:BirthProfile={id:'audit-storage-customer',customerName:'存储回归',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2026-10-17',birthTime:'09:30',leapMonth:false,timeUnknown:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:''};
const preferences:NamingPreferences={length:2,generationChar:'',requiredChars:'',forbiddenChars:'',elderTaboo:'',style:'清朗',meanings:'平安',industry:'',priority:'balanced',preferredElements:[],zodiacRules:false,numerology:false};
async function open(){const dir=mkdtempSync(join(tmpdir(),'naming-audit-storage-'));dirs.push(dir);const store=await new Store(dir,resolve('data'),wasm).init();stores.push(store);return store;}
// Storage behavior uses an explicit frozen6 sample; current7 generation is exercised via StudioService elsewhere.
function sample(store:Store,p=profile):NamingSession {const analysis=analyzeProfile(p),sources=new StudioService(store,{read:()=>'',write:()=>{}},false).bootstrap().sources.filter(source=>(!(ALL_NAMING_RULE_SOURCE_IDS as readonly string[]).includes(source.id)||source.id===NAMING_RULE_V6_SOURCE_ID)&&![OFFICIAL_NAME_POPULARITY_SOURCE_ID,'bazi-ditian-ren-2600158','bazi-ditian-ren-necessary-2600158','project-name-imagery-outer-palaces-v1','name-imagery-arc-palace-elements','rime-cantonese-jyutping','bazi-ditian-ren-actions-2600158','bazi-ditian-ren-capacities-2600158','bazi-ditian-ren-directions-2600158','bazi-ditian-ren-joint-battle-2600158','yue-homophones-wiktionary-fixed','yue-homophones-rime-fixed','yue-homophones-wiktionary-extended-fixed','yue-homophones-rime-extended-fixed'].includes(source.id));expect(sources.filter(source=>source.id===NAMING_RULE_V6_SOURCE_ID)).toHaveLength(1);return {id:'audit-storage-session',profileId:p.id,createdAt:new Date().toISOString(),profile:structuredClone(p),preferences:structuredClone(preferences),analysis,candidates:generateLocalV6(p,preferences,analysis,store.dataset.characters,store.dataset.citations,23).candidates,reviewNote:'',originalFavorable:[...analysis.bazi.favorable],dataVersion:store.dataset.version,namingRules:{version:NAMING_RULE_V6_VERSION,dataVersion:store.dataset.version,sourceId:NAMING_RULE_V6_SOURCE_ID},sourceSnapshot:createSessionSourceSnapshot(store.dataset.version,sources)};}
async function pack(store:Store,mutate:(data:any)=>void){const SQL=await initSqlJs({locateFile:()=>wasm}),db=new SQL.Database(),data=structuredClone(store.dataset);try{mutate(data);db.run('BEGIN');for(const table of ['characters','citations','knowledge','sources'] as const){db.run(`CREATE TABLE ${table}(json TEXT NOT NULL)`);const insert=db.prepare(`INSERT INTO ${table}(json) VALUES (?)`);for(const value of data[table])insert.run([JSON.stringify(value)]);insert.free();}db.run('COMMIT');return db.export();}finally{db.close();}}
afterEach(()=>{vi.restoreAllMocks();for(const store of stores.splice(0))store.db.close();for(const dir of dirs.splice(0))rmSync(dir,{recursive:true,force:true});});

describe('complete storage invariants and recoverable backups', { timeout: 15_000 },()=>{
  it('allows an empty valid archive and validates all public put entry points',async()=>{
    const store=await open();store.restore(store.backupBytes());expect(store.rows('profiles')).toEqual([]);
    const before=readFileSync(join(store.userDir,'customers.sqlite'));
    expect(()=>store.put('profiles','another-id',profile)).toThrow('编号');
    expect(()=>store.saveProfile({...profile,birthDate:'2026-02-30'})).toThrow('客户');
    expect(()=>store.put('settings','secondary',defaults)).toThrow('设置');
    expect(()=>store.put('settings','main',{...defaults,useAi:'true'})).toThrow('设置');
    expect(readFileSync(join(store.userDir,'customers.sqlite')).equals(before)).toBe(true);
  });
  it('rejects duplicate candidate IDs, object review notes and orphan sessions without changing disk or revisions',async()=>{
    const store=await open(),session=sample(store);expect(()=>store.saveSession(session)).toThrow('客户不存在');
    store.saveProfile(profile);store.saveSession(session);const before=store.backupBytes();
    for(const alter of [(s:any)=>{s.candidates[1].id=s.candidates[0].id;},(s:any)=>{s.reviewNote={text:'not a string'};},(s:any)=>{s.candidates[0].reviewNote={};}]){const bad=structuredClone(session);alter(bad);expect(()=>store.saveSession(bad)).toThrow('字段');expect(Buffer.from(store.backupBytes()).equals(Buffer.from(before))).toBe(true);expect(store.listRevisions(session.id)).toEqual([]);}
    expect(()=>store.put('sessions','wrong-id',session)).toThrow('编号');
  });
  it('round trips review history and rejects invalid previous snapshots instead of archiving them',async()=>{
    const store=await open(),session=sample(store);store.saveProfile(profile);store.saveSession(session);
    store.saveSession({...session,reviewNote:'人工总审阅'});const reviewed=store.rows<NamingSession>('sessions')[0];
    const historical=structuredClone(store.listRevisions(session.id)[0].session);historical.reviewRevision=reviewed.reviewRevision;historical.reviewToken=reviewed.reviewToken;
    store.saveSession(historical);const archive=store.backupBytes();store.restore(archive);
    expect(store.rows<NamingSession>('sessions')[0].reviewNote).toBe('');expect(store.listRevisions(session.id)).toHaveLength(2);expect(store.listRevisions(session.id)[0].session.reviewNote).toBe(reviewed.reviewNote);
    const disk=readFileSync(join(store.userDir,'customers.sqlite')),bad={...session,reviewNote:{}};
    store.db.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(bad),session.id]);
    expect(()=>store.saveSession({...session,reviewNote:'attempt'})).toThrow('已有方案快照无效');expect(store.listRevisions(session.id)).toHaveLength(2);
    expect(()=>store.backupBytes()).toThrow('备份已取消');expect(store.rows<any>('sessions')[0].reviewNote).toEqual({});expect(readFileSync(join(store.userDir,'customers.sqlite')).equals(disk)).toBe(true);
  });
  it('refuses invalid current profiles and orphaned revision records during backup without deleting either',async()=>{
    const store=await open(),session=sample(store);store.saveProfile(profile);store.saveSession(session);const good=store.backupBytes();
    store.db.run('UPDATE profiles SET json=? WHERE id=?',[JSON.stringify({...profile,fatherName:42}),profile.id]);expect(()=>store.backupBytes()).toThrow('无效资料');expect(store.rows<any>('profiles')[0].fatherName).toBe(42);
    store.restore(good);store.db.run('INSERT INTO revisions(session_id,created_at,json) VALUES (?,?,?)',['missing-session',new Date().toISOString(),JSON.stringify(session)]);
    expect(()=>store.backupBytes()).toThrow('历史快照');expect(store.db.exec('SELECT COUNT(*) FROM revisions')[0].values[0][0]).toBe(1);
  });
});

describe('knowledge pack identity and source integrity', { timeout: 15_000 },()=>{
  it('rejects duplicate and blank source, citation and knowledge IDs before replacing an installed pack',async()=>{
    const store=await open();const installed=await pack(store,()=>{});store.installPack(installed);const path=join(store.userDir,'knowledge.sqlite'),before=readFileSync(path),version=store.dataset.version;
    for(const table of ['sources','citations','knowledge'])for(const blank of [false,true]){const bad=await pack(store,data=>{if(blank)data[table][0].id='   ';else data[table].push({...data[table][0],name:'冲突来源',url:'https://example.invalid/conflicting'});});expect(()=>store.installPack(bad),`${table}/${blank}`).toThrow('ID必须非空且唯一');expect(readFileSync(path).equals(before)).toBe(true);expect(store.dataset.version).toBe(version);}
  });
  it('checks character reading sources along with ordinary character, citation and knowledge references',async()=>{
    const store=await open();const bad=await pack(store,data=>{data.characters[0].readings=[{pinyin:'ān',tone:1,word:'安',meanings:['平安'],sourceId:'missing-source'}];});expect(()=>store.installPack(bad)).toThrow('无效来源');expect(existsSync(join(store.userDir,'knowledge.sqlite'))).toBe(false);
    const correct=await pack(store,data=>{const character=data.characters[0];character.readings=[{pinyin:character.pinyin,tone:character.tone,word:character.char,meanings:[character.meaning],sourceId:character.sourceId}];});expect(store.readPack(correct).characters[0].readings).toHaveLength(1);
  });
  it.each(['qimen-go-markers','breezy-kangxi-radicals'])('rejects independently published rule source ID %s even with identical metadata',async(sourceId)=>{
    const store=await open(),installed=await pack(store,()=>{});store.installPack(installed);
    const path=join(store.userDir,'knowledge.sqlite'),beforePack=readFileSync(path),beforeCustomers=readFileSync(join(store.userDir,'customers.sqlite')),version=store.dataset.version;
    const fixed=[...loadQimenSources(resolve('data')),...loadNumerologyData(resolve('data')).strokes.sources],source=fixed.find(s=>s.id===sourceId);expect(source).toBeDefined();
    const bad=await pack(store,data=>{data.sources.push(structuredClone(source));data.knowledge[0].sourceId=sourceId;});
    expect(()=>store.installPack(bad)).toThrow('规则来源编号保留');expect(readFileSync(path).equals(beforePack)).toBe(true);expect(readFileSync(join(store.userDir,'customers.sqlite')).equals(beforeCustomers)).toBe(true);expect(store.dataset.version).toBe(version);
  });
});

describe('atomic generation and customer write guards', { timeout: 15_000 },()=>{
  it('persists profile and generated session once and rolls back both on an actual SQLite write failure',async()=>{
    const store=await open(),session=sample(store),persist=vi.spyOn(store as any,'persist');
    store.commitGeneratedProfileAndSession(profile,session,store.profileWriteToken(profile.id));expect(persist).toHaveBeenCalledTimes(1);expect(store.rows('profiles')).toHaveLength(1);expect(store.rows('sessions')).toHaveLength(1);
    store.db.run("CREATE TRIGGER reject_session_update BEFORE UPDATE ON sessions BEGIN SELECT RAISE(FAIL,'injected session failure'); END");
    const disk=readFileSync(join(store.userDir,'customers.sqlite')),token=store.profileWriteToken(profile.id),changed={...profile,customerName:'should roll back'},edited={...session,profile:changed,reviewNote:'should not archive'};
    expect(()=>store.commitGeneratedProfileAndSession(changed,edited,token)).toThrow('injected session failure');expect(store.rows<BirthProfile>('profiles')[0].customerName).toBe(profile.customerName);expect(store.rows<NamingSession>('sessions')[0].reviewNote).toBe('');expect(store.listRevisions(session.id)).toEqual([]);expect(store.profileWriteToken(profile.id)).toBe(token);expect(readFileSync(join(store.userDir,'customers.sqlite')).equals(disk)).toBe(true);
  });
  it('does not create a profile when inserting its session fails',async()=>{
    const store=await open(),session=sample(store),token=store.profileWriteToken(profile.id),disk=readFileSync(join(store.userDir,'customers.sqlite'));
    store.db.run("CREATE TRIGGER reject_new_session BEFORE INSERT ON sessions BEGIN SELECT RAISE(FAIL,'injected insert failure'); END");
    expect(()=>store.commitGeneratedProfileAndSession(profile,session,token)).toThrow('injected insert failure');expect(store.rows('profiles')).toEqual([]);expect(store.rows('sessions')).toEqual([]);expect(store.profileWriteToken(profile.id)).toBe(token);expect(readFileSync(join(store.userDir,'customers.sqlite')).equals(disk)).toBe(true);
  });
  it('invalidates pending writes on edits, deletion, and deletion of an unsaved profile ID',async()=>{
    for(const originallySaved of [false,true]){const store=await open();if(originallySaved)store.saveProfile(profile);let token=store.profileWriteToken(profile.id);store.deleteProfile(profile.id);expect(store.profileWriteToken(profile.id)).not.toBe(token);expect(()=>store.commitGeneratedProfileAndSession(profile,sample(store),token)).toThrow('生成期间客户已被修改');expect(store.rows('profiles')).toEqual([]);
      token=store.profileWriteToken(profile.id);store.saveProfile({...profile,notes:'newer edit'});expect(()=>store.commitGeneratedProfileAndSession(profile,sample(store),token)).toThrow('生成期间客户已被修改');expect(store.rows<BirthProfile>('profiles')[0].notes).toBe('newer edit');expect(store.rows('sessions')).toEqual([]);}
  });
  it('invalidates pending writes after restoring identical customer content and rejects mismatched generated snapshots',async()=>{
    const store=await open();store.saveProfile(profile);const token=store.profileWriteToken(profile.id),archive=store.backupBytes();store.restore(archive);expect(()=>store.commitGeneratedProfileAndSession(profile,sample(store),token)).toThrow('生成期间客户已被修改');
    expect(()=>store.commitGeneratedProfileAndSession({...profile,notes:'different'},sample(store))).toThrow('快照不一致');expect(store.rows('sessions')).toEqual([]);
  });
});
