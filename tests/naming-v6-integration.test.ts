import {afterEach,beforeAll,describe,expect,it} from 'vitest';
import {copyFileSync,existsSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import initSqlJs from 'sql.js';
import {Store,validSession} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {evaluateNameForRuleVersion} from '../src/domain/naming';
import {analyzeProfile} from '../src/domain/engine';
import {normalizePreferences,namingInputKey} from '../src/shared/workflow';
import {ALL_NAMING_RULE_SOURCE_IDS,CURRENT_NAMING_RULE_VERSION,NAMING_RULE_SOURCE_ID,NAMING_RULE_V5_VERSION,NAMING_RULE_V5_SOURCE_ID,NAMING_RULE_V6_VERSION,NAMING_RULE_V6_SOURCE_ID} from '../src/shared/naming-rules';
import actual from './fixtures/naming-session-1.0.32.json';
import probe from './fixtures/dictionary-session-1.0.32-probe.json';
import table from '../data/naming-editorial-v6.json';
import type {BirthProfile,CharacterEntry,NamingSession} from '../src/shared/types';

const wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm'),dirs:string[]=[],stores:Store[]=[];
const hash=(value:Uint8Array)=>createHash('sha256').update(value).digest('hex');
const profile:BirthProfile={id:'name6-current',customerName:'6.0隔离',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'09:30',leapMonth:false,timeUnknown:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:''};
let SQL:Awaited<ReturnType<typeof initSqlJs>>;
beforeAll(async()=>{SQL=await initSqlJs({locateFile:()=>wasm});});
async function open(mode:'new'|'actual32'|'probe32'|'override5'='new'){
 const dir=mkdtempSync(join(tmpdir(),'naming6-integration-'));dirs.push(dir);
 if(mode==='actual32'||mode==='probe32')copyFileSync(resolve('tests/fixtures/'+(mode==='actual32'?'naming-session-1.0.32.sqlite':'dictionary-session-1.0.32-probe.sqlite')),join(dir,'customers.sqlite'));
 if(mode==='override5')copyFileSync(resolve('data/knowledge-v5.sqlite'),join(dir,'knowledge.sqlite'));
 const store=await new Store(dir,resolve('data'),wasm).init();stores.push(store);return{store,dir,service:new StudioService(store,{read:()=>'',write:()=>{}},false)};
}
afterEach(()=>{for(const store of stores.splice(0))store.db.close();for(const dir of dirs.splice(0))rmSync(dir,{recursive:true,force:true});});
function modifiedCharacter(bytes:Uint8Array,char:string,edit:(entry:CharacterEntry)=>void){const db=new SQL.Database(new Uint8Array(bytes));try{const row=db.exec('SELECT rowid,json FROM characters')[0].values.find(([,json])=>JSON.parse(String(json)).char===char)!;const entry=JSON.parse(String(row[1]));edit(entry);db.run('UPDATE characters SET json=? WHERE rowid=?',[JSON.stringify(entry),row[0]]);return db.export();}finally{db.close();}}

describe('current generation, frozen6 semantics and actual delivered5 archives remain independent',{ timeout: 15_000 }, ()=>{
 it('uses the current source on the retained corrected knowledge package',async()=>{
  const{store,service}=await open();expect(hash(store.currentPackBytes())).toBe(table.newDataset.sqliteSha256);expect(store.maintenanceStatus().builtin?.sha256).toBe(table.newDataset.sqliteSha256);expect(ALL_NAMING_RULE_SOURCE_IDS.every(id=>service.bootstrap().sources.some(row=>row.id===id))).toBe(true);
  const session=(await service.generate(profile,normalizePreferences({length:1,requiredChars:'秋',numerology:false,zodiacRules:false}))).session;expect(validSession(session)).toBe(true);expect(session.namingRules).toEqual({version:CURRENT_NAMING_RULE_VERSION,dataVersion:store.dataset.version,sourceId:NAMING_RULE_SOURCE_ID});expect(session.sourceSnapshot!.sources.filter(row=>(ALL_NAMING_RULE_SOURCE_IDS as readonly string[]).includes(row.id)).map(row=>row.id)).toEqual([NAMING_RULE_SOURCE_ID]);expect(session.candidates[0].namingMeaningReview).toMatchObject({version:CURRENT_NAMING_RULE_VERSION,recordState:'recorded',givenName:'秋'});expect(session.candidates[0].meaning).toContain('项目原创季节类比，非字典原义');
 });
 it('replays frozen6 semantics without adding a current7 review snapshot',async()=>{
  const{store}=await open(),preferences=normalizePreferences({length:1,requiredChars:'秋',numerology:false,zodiacRules:false}),candidate=evaluateNameForRuleVersion(NAMING_RULE_V6_VERSION,'秋',profile,preferences,analyzeProfile(profile),store.dataset.characters,store.dataset.citations)!;expect(candidate.meaning).toContain('项目原创季节类比，非字典原义');expect(candidate).not.toHaveProperty('namingMeaningReview');
 });
 it('keeps the actual installed32 seven current and four history snapshots unmodified under the current app',async()=>{
  const{store,service,dir}=await open('actual32'),before=readFileSync(join(dir,'customers.sqlite'));expect(hash(before)).toBe('332f3a85cdeb090901f53b119999e476fdb63950820461bb51009e06356db9a0');expect(store.rows<NamingSession>('sessions')).toEqual(actual.rows.map(row=>row.session));for(const row of actual.rows)expect(service.listHistory(row.id)).toEqual(actual.histories.filter(history=>history.sessionId===row.id).map(({sqlJsonSha256,...history})=>history));expect(readFileSync(join(dir,'customers.sqlite')).equals(before)).toBe(true);
  const selected=store.rows<NamingSession>('sessions')[0],key=namingInputKey(selected.profile,selected.preferences),saved=service.saveSession({...selected,reviewNote:'仅保留原5版资料'});expect(saved.namingRules).toEqual(selected.namingRules);expect(saved.namingRules!.version).toBe(NAMING_RULE_V5_VERSION);expect(saved.candidates).toEqual(selected.candidates);expect(saved.sourceSnapshot).toEqual(selected.sourceSnapshot);expect(namingInputKey(saved.profile,saved.preferences)).toBe(key);
  const destination=await open();destination.store.restore(store.backupBytes());expect(destination.store.rows<NamingSession>('sessions').find(row=>row.id===saved.id)?.candidates).toEqual(selected.candidates);
 },20000);
 it('retains all nine real service-probe old word snapshots and recomputes5 only from their original5 complete archive',async()=>{
  expect(probe.provenance.scope).toContain('service-only');const{store,dir}=await open('probe32'),before=readFileSync(join(dir,'customers.sqlite'));expect(hash(before)).toBe('862d47f53cc8b66839e5d7c22bed59620a1f69ec0da71edca7cb12035dd02d5e');expect(store.rows<NamingSession>('sessions')).toEqual(probe.rows.map(row=>row.session));
  const original=new SQL.Database(new Uint8Array(before));try{const archives=new Map((original.exec('SELECT version,pack FROM knowledge_archives')[0]?.values??[]).map(([version,bytes])=>[String(version),bytes as Uint8Array]));for(const row of probe.rows){const session=row.session as NamingSession,pack=new SQL.Database(new Uint8Array(archives.get(session.dataVersion)!));try{const characters=pack.exec('SELECT json FROM characters')[0].values.map(([json])=>JSON.parse(String(json))),citations=pack.exec('SELECT json FROM citations')[0].values.map(([json])=>JSON.parse(String(json)));for(const candidate of session.candidates){const value=evaluateNameForRuleVersion(NAMING_RULE_V5_VERSION,candidate.givenName,session.profile,session.preferences,session.analysis,characters,citations,candidate.origin)!;expect(value.evaluation).toEqual(candidate.evaluation);expect(value.originalMeaning).toBe(candidate.originalMeaning);}}finally{pack.close();}}}finally{original.close();}expect(readFileSync(join(dir,'customers.sqlite')).equals(before)).toBe(true);
 });
 it('does not replace a legitimate old override and does not lend it new corrected semantics',async()=>{
  const{store,service,dir}=await open('override5'),old=readFileSync(join(dir,'knowledge.sqlite'));expect(hash(store.currentPackBytes())).toBe(table.base.knowledgeSqliteSha256);const session=(await service.generate(profile,normalizePreferences({length:1,requiredChars:'秋',numerology:false,zodiacRules:false}))).session;expect(session.namingRules!.version).toBe(NAMING_RULE_V6_VERSION);expect(session.namingRules!.sourceId).toBe(NAMING_RULE_V6_SOURCE_ID);expect(session.candidates[0]).not.toHaveProperty('namingMeaningReview');expect(session.dataVersion).toBe(hash(old).slice(0,12));expect(session.candidates[0].characters[0].readings!.some(row=>row.word==='鞦')).toBe(true);expect(session.candidates[0].meaning).not.toContain('项目原创季节类比');expect(readFileSync(join(dir,'knowledge.sqlite')).equals(old)).toBe(true);
 });
 it('rejects5↔6 metadata replacement against an existing scheme and its actual history atomically',async()=>{
  const{store,service,dir}=await open('actual32'),selected=store.rows<NamingSession>('sessions').find(row=>service.listHistory(row.id).length>0)!,before=readFileSync(join(dir,'customers.sqlite')),changed=structuredClone(selected),source6=service.bootstrap().sources.find(row=>row.id===NAMING_RULE_V6_SOURCE_ID)!;
  changed.namingRules={version:NAMING_RULE_V6_VERSION,dataVersion:changed.dataVersion,sourceId:NAMING_RULE_V6_SOURCE_ID};changed.sourceSnapshot!.sources=changed.sourceSnapshot!.sources.filter(row=>!(ALL_NAMING_RULE_SOURCE_IDS as readonly string[]).includes(row.id));changed.sourceSnapshot!.sources.push(source6);expect(validSession(changed)).toBe(true);expect(()=>service.saveSession(changed)).toThrow('版本不得');expect(()=>store.saveSession(changed)).toThrow('命名规则版本');
  const db=new SQL.Database(new Uint8Array(store.backupBytes()));try{db.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(changed),changed.id]);expect(()=>store.restore(db.export())).toThrow('字段不完整');}finally{db.close();}expect(readFileSync(join(dir,'customers.sqlite')).equals(before)).toBe(true);
 },15000);
 it('rejects malformed reference metadata and selecting a reference-only default without touching the active package',async()=>{
  const{store}=await open(),before=store.currentPackBytes();const bad=modifiedCharacter(before,'沈',entry=>{const reading=entry.readings!.find(row=>row.referenceOnly)!;entry.pinyin=reading.pinyin;entry.tone=reading.tone;entry.meaning=reading.meanings[0];});expect(()=>store.installPack(bad)).toThrow('只有辞典参照');expect(store.currentPackBytes()).toEqual(before);
  const malformed=modifiedCharacter(before,'沈',entry=>{delete entry.readings!.find(row=>row.referenceOnly)!.sourceReference;});expect(()=>store.installPack(malformed)).toThrow('字段不合法');expect(store.currentPackBytes()).toEqual(before);
 // Two full779-row invalid-package checks took6.96s with concurrent archive validation.
 },15000);
});

describe('built-in corrected package upgrade uses the ordinary preview/apply/rollback boundary',{ timeout: 15_000 }, ()=>{
 it('previews6 without changing an active5 override, applies exact6 and retains5 for rollback',async()=>{
  const{store,service,dir}=await open('override5'),old=store.currentPackBytes(),customer=readFileSync(join(dir,'customers.sqlite')),oldDataset=structuredClone(store.dataset),preview=service.previewBuiltinDataPack();expect(preview.current.sha256).toBe(hash(old));expect(preview.incoming.sha256).toBe(table.newDataset.sqliteSha256);expect(preview.changes.characters).toEqual({added:0,removed:0,changed:9,unchanged:770});expect(store.dataset).toEqual(oldDataset);expect(store.currentPackBytes()).toEqual(old);expect(readFileSync(join(dir,'customers.sqlite')).equals(customer)).toBe(true);expect(existsSync(join(dir,'knowledge.previous.sqlite'))).toBe(false);
  service.applyDataPackPreview(preview.id);expect(hash(store.currentPackBytes())).toBe(table.newDataset.sqliteSha256);expect(Buffer.from(store.previousPackBytes()!).equals(Buffer.from(old))).toBe(true);expect(readFileSync(join(dir,'customers.sqlite')).equals(customer)).toBe(true);const rollback=service.previewRollbackDataPack();expect(rollback.incoming.sha256).toBe(hash(old));service.applyDataPackPreview(rollback.id);expect(store.currentPackBytes()).toEqual(old);
 // This actual source verification, preview/apply and rollback path took7.11s; bound it locally.
 },15000);
 it('keeps a no-change built-in preview safe and does not create an override or rollback copy',async()=>{
  const{store,service,dir}=await open(),before=store.currentPackBytes(),preview=service.previewBuiltinDataPack();expect(preview.current.sha256).toBe(preview.incoming.sha256);expect(preview.changes.characters.changed).toBe(0);expect(service.applyDataPackPreview(preview.id)).toContain('一致');expect(store.currentPackBytes()).toEqual(before);expect(existsSync(join(dir,'knowledge.sqlite'))).toBe(false);expect(existsSync(join(dir,'knowledge.previous.sqlite'))).toBe(false);
 });
});
