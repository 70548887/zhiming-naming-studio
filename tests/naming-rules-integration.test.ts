import {afterEach,describe,expect,it} from 'vitest';
import {copyFileSync,mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import initSqlJs from 'sql.js';
import {Store,validSession} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {reportHTML} from '../src/main/report';
import {CURRENT_NAMING_RULE_VERSION,NAMING_RULE_SOURCE_ID,NAMING_RULE_V6_VERSION,resolveSessionNamingRulesVersion} from '../src/shared/naming-rules';
import oldFixture from './fixtures/naming-session-1.0.30.json';
import {normalizePreferences} from '../src/shared/workflow';
import type {BirthProfile,CharacterEntry,NamingSession} from '../src/shared/types';

const wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm'),directories:string[]=[],stores:Store[]=[];
const profile:BirthProfile={id:'naming-rules-integration',customerName:'命名版本隔离',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'09:30',timeUnknown:false,leapMonth:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'测试'};
const hash=(value:Uint8Array)=>createHash('sha256').update(value).digest('hex');
async function open(originalSql=false){const directory=mkdtempSync(join(tmpdir(),'naming-rules-v4-'));directories.push(directory);if(originalSql)copyFileSync(resolve('tests/fixtures/naming-session-1.0.30.sqlite'),join(directory,'customers.sqlite'));const store=await new Store(directory,resolve('data'),wasm).init();stores.push(store);return{store,service:new StudioService(store,{read:()=>'',write:()=>{}}),directory};}
async function backupEdit(bytes:Uint8Array,id:string,edit:(session:any)=>void,revision=false){const SQL=await initSqlJs({locateFile:()=>wasm}),db=new SQL.Database(new Uint8Array(bytes));try{const table=revision?'revisions':'sessions',row=db.exec(revision?'SELECT id,json FROM revisions WHERE session_id=? ORDER BY id DESC LIMIT 1':'SELECT id,json FROM sessions WHERE id=?',[id])[0].values[0],session=JSON.parse(String(row[1]));edit(session);db.run('UPDATE '+table+' SET json=? WHERE id=?',[JSON.stringify(session),row[0]]);return db.export();}finally{db.close();}}
afterEach(()=>{for(const store of stores.splice(0))store.db.close();for(const directory of directories.splice(0))rmSync(directory,{recursive:true,force:true});});

describe('generation-time naming-rule identity and untouched delivered legacy sessions',{ timeout: 15_000 }, ()=>{
 it('preserves actual1.30 current/history candidate facts, explanations, scores and original source registry',async()=>{
  const originalBytes=readFileSync(resolve('tests/fixtures/naming-session-1.0.30.sqlite'));expect(hash(originalBytes)).toBe(oldFixture.provenance.sourceDatabaseSha256);expect(hash(originalBytes)).toBe('a0a9227a1f1487b41daa36a799c3aafd83fc9612676d72bd4738d31420d3cad9');expect(oldFixture.provenance.sourceAsarSha256).toBe('d06d98f0407b2f1220421165efea98d44767a07b457870279a7a0d719524a833');expect(hash(readFileSync(resolve('src/domain/naming-v3.ts')))).toBe('ff660c84ec8926c7b88c13bfb520dd14b2fb382a100a5fd2b1f7c3c960f5f40d');expect(hash(readFileSync(resolve('data/naming-editorial.json')))).toBe('97c3162238c9493174544580a338fb0852d2784fbeac712fbd8e234f99945195');
  const {store,service,directory}=await open(true),before=readFileSync(join(directory,'customers.sqlite')),session=store.rows<NamingSession>('sessions')[0];expect(session).toEqual(oldFixture.rows[0].session);expect(service.listHistory(session.id)).toEqual(oldFixture.histories.map(({sqlJsonSha256,...row})=>row));expect(resolveSessionNamingRulesVersion(session)).toBe(null);expect(readFileSync(join(directory,'customers.sqlite')).equals(before)).toBe(true);
  const reviewed=service.saveSession({...session,reviewNote:'版本更新后的人工审阅'});expect(reviewed.candidates).toEqual(session.candidates);expect(reviewed.sourceSnapshot).toEqual(session.sourceSnapshot);expect(reviewed).not.toHaveProperty('namingRules');expect(reviewed.candidates[0].citations).toHaveLength(0);
  const html=reportHTML(reviewed,store.settings());expect(html).toContain(session.candidates[0].originalMeaning);expect(html).not.toContain(NAMING_RULE_SOURCE_ID);
  const other=await open();other.store.restore(store.backupBytes());const restored=other.store.rows<NamingSession>('sessions')[0];expect(restored.candidates).toEqual(session.candidates);expect(restored.analysis).toEqual(session.analysis);expect(restored.sourceSnapshot).toEqual(session.sourceSnapshot);expect(restored).not.toHaveProperty('namingRules');expect(other.service.listHistory(restored.id).every(row=>!Object.hasOwn(row.session,'namingRules'))).toBe(true);
 // Actual legacy SQL, full history, report and separate-store restore took6.36s with cold source6 validation.
 },15000);
 it('records the current rule and saved meaning snapshots from actual Service generation through review and history',async()=>{
  const {store,service}=await open(),session=(await service.generate(profile,normalizePreferences({requiredChars:'乐安',numerology:false,zodiacRules:false}))).session;expect(session.namingRules).toEqual({version:CURRENT_NAMING_RULE_VERSION,dataVersion:session.dataVersion,sourceId:NAMING_RULE_SOURCE_ID});expect(resolveSessionNamingRulesVersion(session)).toBe(CURRENT_NAMING_RULE_VERSION);expect(session.candidates.every(candidate=>candidate.namingMeaningReview?.version===CURRENT_NAMING_RULE_VERSION&&candidate.namingMeaningReview?.givenName===candidate.givenName)).toBe(true);expect(session.sourceSnapshot!.sources.filter(source=>source.id===NAMING_RULE_SOURCE_ID)).toHaveLength(1);
  const saved=service.saveSession({...session,reviewNote:'保留本次命名规则'});expect(saved.namingRules).toEqual(session.namingRules);const old=service.listHistory(saved.id)[0];expect(old.session.namingRules).toEqual(session.namingRules);
  for(const value of [undefined,null,{...session.namingRules,version:'naming-editorial-3.0.0'},{...session.namingRules,dataVersion:'wrong'}]){const draft:any={...saved,namingRules:value};expect(()=>service.saveSession(draft)).toThrow('版本不得');}
  const removed={...saved};delete removed.namingRules;expect(()=>service.saveSession(removed)).toThrow('版本不得');expect(store.rows<NamingSession>('sessions')[0].namingRules).toEqual(session.namingRules);
 });
 it('atomically rejects partial, altered or forged rule versions/sources in current and historical backups',async()=>{
  const {store,service,directory}=await open(),generated=(await service.generate(profile,normalizePreferences({requiredChars:'乐安',numerology:false,zodiacRules:false}))).session,session=service.saveSession({...generated,reviewNote:'建立真实历史'}),backup=store.backupBytes(),before=readFileSync(join(directory,'customers.sqlite'));
  const edits=[(value:any)=>{delete value.namingRules;},(value:any)=>{value.namingRules=null;},(value:any)=>{value.namingRules.version='naming-editorial-99.0.0';},(value:any)=>{value.namingRules.dataVersion='wrong';},(value:any)=>{value.sourceSnapshot.sources=value.sourceSnapshot.sources.filter((source:any)=>source.id!==NAMING_RULE_SOURCE_ID);},(value:any)=>{value.sourceSnapshot.sources.find((source:any)=>source.id===NAMING_RULE_SOURCE_ID).sha256='f'.repeat(64);}];
  for(const revision of [false,true])for(const edit of edits){const changed=await backupEdit(backup,session.id,edit,revision);expect(()=>store.restore(changed)).toThrow();expect(readFileSync(join(directory,'customers.sqlite')).equals(before)).toBe(true);}
 });
 it('validates own version data without executing accessors or inferring a legacy version',()=>{
  const legacy=structuredClone(oldFixture.rows[0].session)as NamingSession;expect(resolveSessionNamingRulesVersion(legacy)).toBe(null);expect(validSession(legacy)).toBe(true);let reads=0;Object.defineProperty(legacy,'namingRules',{enumerable:true,get(){reads++;return undefined;}});expect(()=>resolveSessionNamingRulesVersion(legacy)).toThrow('访问器');expect(validSession(legacy)).toBe(false);expect(reads).toBe(0);
 });
 it('keeps a legitimate nondefault dictionary reading when a custom package changes乐 to yuè, without borrowing the old meaning',async()=>{
  const {store,service}=await open(),SQL=await initSqlJs({locateFile:()=>wasm}),db=new SQL.Database(new Uint8Array(readFileSync(resolve('data/knowledge.sqlite'))));let pack:Uint8Array;
  try{const row=db.exec('SELECT id,json FROM characters WHERE id=?',['乐'])[0].values[0],entry=JSON.parse(String(row[1]))as CharacterEntry,reading=entry.readings!.find(reading=>reading.pinyin==='yuè')!;entry.pinyin=reading.pinyin;entry.tone=reading.tone;entry.meaning=reading.meanings[0];entry.sourceId=reading.sourceId;db.run('UPDATE characters SET json=? WHERE id=?',[JSON.stringify(entry),row[0]]);pack=db.export();}finally{db.close();}
  store.installPack(pack!);const session=(await service.generate(profile,normalizePreferences({requiredChars:'乐安',generationChar:'乐',numerology:false,zodiacRules:false}))).session,candidate=session.candidates[0];expect(session.namingRules?.version).toBe(NAMING_RULE_V6_VERSION);expect(candidate).not.toHaveProperty('namingMeaningReview');expect(session.namingRules?.dataVersion).toBe(hash(pack!).slice(0,12));expect(candidate.pinyin).toContain('yuè');expect(candidate.meaning).toContain('有規律而和諧動人的聲音。');expect(candidate.meaning).not.toContain('常怀喜悦');expect(candidate.warnings.join(' ')).not.toContain('本方案采用 lè');expect(candidate.characters[0].warning).toBe(store.dataset.characters.find(entry=>entry.char==='乐')!.warning);expect(candidate.citations).toEqual([]);expect(candidate.reason).not.toContain('组合列入本产品自编的自然表达参考词表');expect(candidate.characters[0].readings!.find(reading=>reading.pinyin==='yuè')!.meanings[0]).toBe('有規律而和諧動人的聲音。');
 });
 it('reserves the new naming-rule source identity from imported data packages',async()=>{
  const {store}=await open(),SQL=await initSqlJs({locateFile:()=>wasm}),db=new SQL.Database(new Uint8Array(readFileSync(resolve('data/knowledge.sqlite'))));try{const row=db.exec('SELECT rowid,json FROM sources')[0].values[0],source=JSON.parse(String(row[1]));source.id=NAMING_RULE_SOURCE_ID;db.run('UPDATE sources SET json=? WHERE rowid=?',[JSON.stringify(source),row[0]]);expect(()=>store.installPack(db.export())).toThrow('编号保留');}finally{db.close();}
 });
});
