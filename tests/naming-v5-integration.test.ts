import {afterEach,describe,expect,it} from 'vitest';
import {copyFileSync,mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import initSqlJs from 'sql.js';
import {Store} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {evaluateNameForRuleVersion} from '../src/domain/naming';
import {normalizePreferences} from '../src/shared/workflow';
import {ALL_NAMING_RULE_SOURCE_IDS,CURRENT_NAMING_RULE_VERSION,NAMING_RULE_V4_SOURCE_ID,NAMING_RULE_V4_VERSION,NAMING_RULE_V5_SOURCE_ID,NAMING_RULE_SOURCE_ID,NAMING_RULE_V6_VERSION,NAMING_RULE_V6_SOURCE_ID,resolveSessionNamingRulesVersion} from '../src/shared/naming-rules';
import fixture from './fixtures/naming-session-1.0.31.json';
import rules from '../data/naming-editorial-v5.json';
import currentRules from '../data/naming-editorial-v6.json';
import type {BirthProfile,NamingSession} from '../src/shared/types';

const wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm'),dirs:string[]=[],stores:Store[]=[];
const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const profile:BirthProfile={id:'name5-integration',customerName:'5.0隔离',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'09:30',leapMonth:false,timeUnknown:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:''};
async function open(old=false){const dir=mkdtempSync(join(tmpdir(),'name5-integration-'));dirs.push(dir);if(old)copyFileSync(resolve('tests/fixtures/naming-session-1.0.31.sqlite'),join(dir,'customers.sqlite'));const store=await new Store(dir,resolve('data'),wasm).init();stores.push(store);return{store,service:new StudioService(store,{read:()=>'',write:()=>{}}),dir};}
afterEach(()=>{for(const store of stores.splice(0))store.db.close();for(const dir of dirs.splice(0))rmSync(dir,{recursive:true,force:true});});

describe('current generation with retained5 name rules and immutable4 history',{ timeout: 15_000 }, ()=>{
 it('loads and exports the actual new default package while recording only the selected current source in generated sessions',async()=>{
  const{store,service}=await open();expect(hash(store.currentPackBytes())).toBe(currentRules.newDataset.sqliteSha256);expect(store.dataset.version).toBe(currentRules.newDataset.sqliteSha256.slice(0,12));expect(ALL_NAMING_RULE_SOURCE_IDS.every(id=>service.bootstrap().sources.some(source=>source.id===id))).toBe(true);const session=(await service.generate(profile,normalizePreferences({requiredChars:'扬善',generationChar:'扬',numerology:false,zodiacRules:false}))).session;
  expect(session.namingRules).toEqual({version:CURRENT_NAMING_RULE_VERSION,dataVersion:store.dataset.version,sourceId:NAMING_RULE_SOURCE_ID});expect(session.sourceSnapshot!.sources.filter(source=>(ALL_NAMING_RULE_SOURCE_IDS as readonly string[]).includes(source.id)).map(source=>source.id)).toEqual([NAMING_RULE_SOURCE_ID]);expect(session.candidates[0].citations).toEqual([rules.nameRules.find(rule=>rule.name==='扬善')!.citation]);
 });
 it('uses frozen6 fallback for an explicitly installed older package without borrowing corrected志/家 source meanings',async()=>{
  const{store,service}=await open(),old=readFileSync(resolve('data/knowledge.sqlite'));store.installPack(old);expect(hash(store.currentPackBytes())).toBe(hash(old));for(const name of ['遂志','家宜']){const session=(await service.generate({...profile,id:profile.id+name},normalizePreferences({requiredChars:name,generationChar:[...name][0],numerology:false,zodiacRules:false}))).session;expect(session.namingRules?.version).toBe(NAMING_RULE_V6_VERSION);expect(session.namingRules?.sourceId).toBe(NAMING_RULE_V6_SOURCE_ID);expect(session.candidates.every(candidate=>!Object.hasOwn(candidate,'namingMeaningReview'))).toBe(true);expect(session.namingRules?.dataVersion).toBe(hash(old).slice(0,12));expect(session.candidates).toHaveLength(1);expect(session.candidates[0].citations).toEqual([]);expect(session.candidates[0].meaning).not.toContain(rules.nameRules.find(rule=>rule.name===name)!.meaning);}
 });
 it('retains actual4 current/history rows and does not migrate their version or derived builtin identity to5',async()=>{
  const{store,service,dir}=await open(true),before=readFileSync(join(dir,'customers.sqlite'));expect(store.rows<NamingSession>('sessions')).toEqual(fixture.rows.map(row=>row.session));for(const row of fixture.rows)expect(resolveSessionNamingRulesVersion(row.session as NamingSession)).toBe(NAMING_RULE_V4_VERSION);expect(readFileSync(join(dir,'customers.sqlite')).equals(before)).toBe(true);const selected=store.rows<NamingSession>('sessions')[0],saved=service.saveSession({...selected,reviewNote:'按原4.0保留'});expect(saved.namingRules).toEqual(selected.namingRules);expect(saved.sourceSnapshot).toEqual(selected.sourceSnapshot);expect(saved.candidates).toEqual(selected.candidates);expect(saved.sourceSnapshot!.sources.some(source=>source.id===NAMING_RULE_V5_SOURCE_ID)).toBe(false);
 });
 it('recomputes actual saved4 candidate scores and original explanations from their complete original archives',async()=>{
  const SQL=await initSqlJs({locateFile:()=>wasm}),original=new SQL.Database(new Uint8Array(readFileSync(resolve('tests/fixtures/naming-session-1.0.31.sqlite'))));try{const archives=new Map((original.exec('SELECT version,pack FROM knowledge_archives')[0]?.values??[]).map(([version,bytes])=>[String(version),bytes as Uint8Array]));for(const row of [...fixture.rows,...fixture.histories]){const session=row.session as NamingSession,bytes=archives.get(session.dataVersion)!;expect(bytes).toBeDefined();const pack=new SQL.Database(bytes);try{const characters=pack.exec('SELECT json FROM characters')[0].values.map(([json])=>JSON.parse(String(json))),citations=pack.exec('SELECT json FROM citations')[0].values.map(([json])=>JSON.parse(String(json)));for(const candidate of session.candidates){const evaluated=evaluateNameForRuleVersion(NAMING_RULE_V4_VERSION,candidate.givenName,session.profile,session.preferences,session.analysis,characters,citations,candidate.origin)!;expect(evaluated.evaluation).toEqual(candidate.evaluation);expect(evaluated.originalMeaning).toBe(candidate.originalMeaning);}}finally{pack.close();}}}finally{original.close();}
 });
 it('rejects current replacement with otherwise valid source4 metadata, preserving current bytes and history',async()=>{
  const{store,service,dir}=await open(),created=(await service.generate(profile,normalizePreferences({requiredChars:'扬善',generationChar:'扬',numerology:false,zodiacRules:false}))).session,session=service.saveSession({...created,reviewNote:'创建真实当前版本历史'}),before=readFileSync(join(dir,'customers.sqlite')),source4=service.bootstrap().sources.find(source=>source.id===NAMING_RULE_V4_SOURCE_ID)!;
  const changed=structuredClone(session);for(const candidate of changed.candidates)delete candidate.namingMeaningReview;changed.namingRules={version:NAMING_RULE_V4_VERSION,dataVersion:changed.dataVersion,sourceId:NAMING_RULE_V4_SOURCE_ID};changed.sourceSnapshot!.sources=changed.sourceSnapshot!.sources.filter(source=>!(ALL_NAMING_RULE_SOURCE_IDS as readonly string[]).includes(source.id));changed.sourceSnapshot!.sources.push(source4);expect(()=>store.saveSession(changed)).toThrow('命名规则版本');expect(()=>service.saveSession(changed)).toThrow('版本不得');expect(readFileSync(join(dir,'customers.sqlite')).equals(before)).toBe(true);
  const SQL=await initSqlJs({locateFile:()=>wasm}),db=new SQL.Database(new Uint8Array(store.backupBytes()));try{db.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(changed),session.id]);expect(()=>store.restore(db.export())).toThrow('字段不完整');}finally{db.close();}expect(readFileSync(join(dir,'customers.sqlite')).equals(before)).toBe(true);
 });
});
