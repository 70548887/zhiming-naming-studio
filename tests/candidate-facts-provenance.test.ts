import { afterEach,describe,expect,it } from 'vitest';
import { mkdirSync,mkdtempSync,readFileSync,rmSync } from 'node:fs';
import { join,resolve } from 'node:path';
import { tmpdir } from 'node:os';
import initSqlJs from 'sql.js';
import { Store } from '../src/main/store';
import { StudioService } from '../src/main/service';
import { normalizePreferences } from '../src/shared/workflow';
import { sessionFactStatus } from '../src/shared/candidate-facts';
import {ALL_NAMING_RULE_SOURCE_IDS} from '../src/shared/naming-rules';
import { packSha } from '../src/main/candidate-facts';
import { calculateBaziV3 } from '../src/domain/bazi-v3';
import{calculateQimenProfileV2}from'../src/domain/qimen-v2';
import type { BirthProfile,NamingSession,SourceRecord } from '../src/shared/types';

const wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm'),dirs:string[]=[],stores:Store[]=[];
const profile:BirthProfile={id:'fact-113-customer',customerName:'候选事实隔离',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'09:30',timeUnknown:false,leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:''};
async function open(){const dir=mkdtempSync(join(tmpdir(),'candidate-facts-113-'));dirs.push(dir);const store=await new Store(dir,resolve('data'),wasm).init();stores.push(store);return {store,service:new StudioService(store,{read:()=>'',write:()=>{}},false)};}
async function setup(){const context=await open();return {...context,session:(await context.service.generate(profile,normalizePreferences({requiredChars:'和乐',style:'诗经',priority:'classic',numerology:true,zodiacRules:false}))).session};}
const current=(store:Store,id:string)=>store.rows<NamingSession>('sessions').find(session=>session.id===id)!;
async function mutateBackup(bytes:Uint8Array,id:string,edit:(session:NamingSession,db:any)=>void):Promise<Uint8Array>{const SQL=await initSqlJs({locateFile:()=>wasm}),db=new SQL.Database(bytes);try{const row=db.exec('SELECT json FROM sessions WHERE id=?',[id])[0].values[0][0],session=JSON.parse(String(row));edit(session,db);db.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(session),id]);return db.export();}finally{db.close();}}
async function customPack(store:Store,index:number):Promise<Uint8Array>{const SQL=await initSqlJs({locateFile:()=>wasm}),db=new SQL.Database(),data=structuredClone(store.dataset);const source=data.sources.find(source=>source.id==='shijing')!;source.url='https://example.test/custom-'+index;source.commit='custom-'+index;source.sha256=String(index).repeat(64);data.citations.find(citation=>citation.id==='shijing-161-3')!.text+=' 自定义修订'+index;try{for(const table of ['characters','citations','knowledge','sources']as const){db.run(`CREATE TABLE ${table}(json TEXT NOT NULL)`);const insert=db.prepare(`INSERT INTO ${table}(json) VALUES (?)`);for(const value of data[table])insert.run([JSON.stringify(value)]);insert.free();}return db.export();}finally{db.close();}}
afterEach(()=>{for(const store of stores.splice(0))store.db.close();for(const dir of dirs.splice(0))rmSync(dir,{recursive:true,force:true});});

describe('immutable candidate facts and complete original knowledge-package archives',()=>{
 it('rejects altered built-in readings, glosses, citations and original source declarations without changing current bytes',async()=>{
  const {store,session}=await setup(),good=store.backupBytes(),disk=readFileSync(join(store.userDir,'customers.sqlite'));
  const edits:((s:NamingSession)=>void)[]=[s=>{s.candidates[0].characters[0].pinyin='zzz';},s=>{s.candidates[0].characters[0].meaning='伪造字义';},s=>{s.candidates[0].pinyin='fake';},s=>{s.candidates[0].citations[0].text='伪造诗经原文';},s=>{s.candidates[0].citations[0].id='does-not-exist';},s=>{s.sourceSnapshot!.sources.find(source=>source.id==='shijing')!.commit='forged';}];
  for(const edit of edits){const bad=await mutateBackup(good,session.id,s=>edit(s));expect(()=>store.restore(bad)).toThrow('字段不完整');expect(readFileSync(join(store.userDir,'customers.sqlite')).equals(disk)).toBe(true);}
  expect(current(store,session.id).factVerification?.status).toBe('verified-builtin');
 },20000);
 it('archives full custom packages through consecutive updates and restores historical content using its actual original package',async()=>{
  const {store,service}=await open(),one=await customPack(store,1);store.installPack(one);
  const first=(await service.generate(profile,normalizePreferences({requiredChars:'和乐',style:'诗经',priority:'classic',zodiacRules:false}))).session;
  const citation=structuredClone(first.candidates[0].citations),manifest=structuredClone(first.sourceSnapshot),version=first.dataVersion;
  expect(first.factVerification).toMatchObject({status:'verified-archive',datasetSha256:packSha(one),dataVersion:version});
  store.installPack(await customPack(store,2));store.installPack(await customPack(store,3));
  const edited=service.saveSession({...first,reviewNote:'人工意见'}),revision=service.listHistory(first.id)[0];expect(edited.candidates[0].citations).toEqual(citation);
  const restoredHistory=service.restoreHistory(first.id,revision.id,edited.reviewRevision,edited.reviewToken);expect(restoredHistory.sourceSnapshot).toEqual(manifest);
  const backup=store.backupBytes(),other=await open();other.store.restore(backup);const restored=current(other.store,first.id);
  expect(restored.dataVersion).toBe(version);expect(restored.candidates[0].citations).toEqual(citation);expect(restored.factVerification?.status).toBe('verified-archive');expect(restored.sourceSnapshot).toEqual(manifest);
  expect(other.store.db.exec('SELECT sha256,version,length(pack) FROM knowledge_archives')[0].values.some(row=>row[0]===packSha(one)&&row[1]===version&&Number(row[2])===one.length)).toBe(true);
 },20000);
 it('rejects self-consistent candidate edits against a custom archive, not just a self-authored checksum',async()=>{
  const {store,service}=await open();store.installPack(await customPack(store,1));const session=(await service.generate(profile,normalizePreferences({requiredChars:'和乐',style:'诗经',priority:'classic',zodiacRules:false}))).session,good=store.backupBytes(),disk=readFileSync(join(store.userDir,'customers.sqlite'));
  const bad=await mutateBackup(good,session.id,s=>{const character=s.candidates[0].characters[0];character.meaning='伪造但内部一致';character.readings!.find(reading=>reading.pinyin===character.pinyin)!.meanings=[character.meaning];s.factVerification={version:'candidate-facts/1.0.0',status:'verified-archive',dataVersion:s.dataVersion,datasetSha256:'f'.repeat(64)};});
  expect(()=>store.restore(bad)).toThrow('字段不完整');expect(readFileSync(join(store.userDir,'customers.sqlite')).equals(disk)).toBe(true);
 },20000);
 it('refuses removal of a current generation archive, including attempts to erase its marker and forge self-consistent dictionary facts',async()=>{
  const {store,service}=await open();store.installPack(await customPack(store,1));const session=(await service.generate(profile,normalizePreferences({requiredChars:'和乐',style:'诗经',priority:'classic',zodiacRules:false}))).session,good=store.backupBytes();
  store.installPack(await customPack(store,2));const disk=readFileSync(join(store.userDir,'customers.sqlite'));
  for(const eraseMarker of [false,true]){const bad=await mutateBackup(good,session.id,(s,db)=>{db.run('DELETE FROM knowledge_archives');if(eraseMarker)delete s.factVerification;const ch=s.candidates[0].characters[0];ch.meaning='自洽伪造';ch.readings!.find(reading=>reading.pinyin===ch.pinyin)!.meanings=[ch.meaning];});expect(()=>store.restore(bad)).toThrow('字段不完整');expect(readFileSync(join(store.userDir,'customers.sqlite')).equals(disk)).toBe(true);}
 },20000);
 it('retains unknown external legacy snapshots as unverified while refusing exact built-in source impersonation',async()=>{
  const {store,session}=await setup(),good=store.backupBytes();
  const unknown=await mutateBackup(good,session.id,(s,db)=>{db.run('DELETE FROM knowledge_archives');s.analysis.bazi=calculateBaziV3(s.profile);s.analysis.qimen=calculateQimenProfileV2(s.profile);s.originalFavorable=[...s.analysis.bazi.favorable];s.dataVersion='unknown-external-history';s.sourceSnapshot!.dataVersion=s.dataVersion;delete s.namingRules;for(const candidate of s.candidates)delete candidate.namingMeaningReview;s.sourceSnapshot!.sources=s.sourceSnapshot!.sources.filter(source=>!(ALL_NAMING_RULE_SOURCE_IDS as readonly string[]).includes(source.id));s.sourceSnapshot!.sources.find(source=>source.id==='shijing')!.commit='legitimate-external-old';s.candidates[0].citations[0].id='external-custom-id';s.candidates[0].citations[0].text='历史自定义文本';delete s.factVerification;});
  store.restore(unknown);const restored=current(store,session.id);expect(restored.factVerification?.status).toBe('unverified-legacy');expect(sessionFactStatus(restored).status).toBe('unverified');expect(restored).not.toHaveProperty('namingRules');expect(restored.sourceSnapshot!.sources.some(source=>(ALL_NAMING_RULE_SOURCE_IDS as readonly string[]).includes(source.id))).toBe(false);
  const originalSource=session.sourceSnapshot!.sources.find(source=>source.id==='shijing')!;
  const forged=await mutateBackup(store.backupBytes(),session.id,s=>{const index=s.sourceSnapshot!.sources.findIndex(source=>source.id==='shijing');s.sourceSnapshot!.sources[index]=structuredClone(originalSource);});const disk=readFileSync(join(store.userDir,'customers.sqlite'));
  expect(()=>store.restore(forged)).toThrow('字段不完整');expect(readFileSync(join(store.userDir,'customers.sqlite')).equals(disk)).toBe(true);
  const inconsistent=await mutateBackup(store.backupBytes(),session.id,s=>{s.candidates[0].characters[0].pinyin='not-a-stored-reading';});expect(()=>store.restore(inconsistent)).toThrow('字段不完整');
 },20000);
 it('rejects corrupted archive bytes, conflicting short-version mappings and oversized or duplicate archive catalogs',async()=>{
  const {store,session}=await setup(),good=store.backupBytes(),disk=readFileSync(join(store.userDir,'customers.sqlite'));
  for(const mutation of [
   (db:any)=>{db.run('UPDATE knowledge_archives SET pack=?',[new Uint8Array([1,2,3])]);},
   (db:any)=>{db.run("UPDATE knowledge_archives SET version='wrong-version'");},
   (db:any)=>{db.run('DROP TABLE knowledge_archives');db.run('CREATE TABLE knowledge_archives(sha256 TEXT PRIMARY KEY,version TEXT NOT NULL,pack BLOB NOT NULL)');for(let i=0;i<101;i++)db.run('INSERT INTO knowledge_archives VALUES (?,?,?)',[String(i).padStart(64,'0'),String(i).padStart(12,'0'),new Uint8Array([0])]);},
  ]){const bad=await mutateBackup(good,session.id,(_s,db)=>mutation(db));expect(()=>store.restore(bad)).toThrow('字段不完整');expect(readFileSync(join(store.userDir,'customers.sqlite')).equals(disk)).toBe(true);}
 },20000);
});

describe('all displayed fixed-rule source identities',()=>{
 it('rejects modified qimen and numerology metadata even if the active candidate never enabled numerology',async()=>{
  const {store,service}=await open(),session=(await service.generate(profile,normalizePreferences({requiredChars:'安宁',numerology:false,zodiacRules:false}))).session,good=store.backupBytes(),disk=readFileSync(join(store.userDir,'customers.sqlite'));
  const ids=['qimen-go-markers','qimen-go-structural-patterns','breezy-kangxi-radicals','shunshi-numerology-e93e1f3','tianji-formula-0b3e64f'];
  for(const id of ids){const bad=await mutateBackup(good,session.id,s=>{const source=s.sourceSnapshot!.sources.find(source=>source.id===id)!;source.url='https://example.test/forged';source.commit='forged';source.sha256='f'.repeat(64);});expect(()=>store.restore(bad),id).toThrow('字段不完整');expect(readFileSync(join(store.userDir,'customers.sqlite')).equals(disk)).toBe(true);}
 },20000);
});
