import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {copyFileSync,mkdtempSync,readFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join,resolve,sep} from 'node:path';
import {Store} from '../src/main/store';import {StudioService} from '../src/main/service';
import {assertCompactCustomerSchema} from '../src/main/compact-customer-store';
import {normalizePreferences} from '../src/shared/workflow';import {calculateLegacyBazi} from '../src/domain/bazi-legacy';import {calculateQimenProfileV2} from '../src/domain/qimen-v2';
import type {BirthProfile,NamingSession} from '../src/shared/types';

const profile:BirthProfile={id:'history-binding-a',customerName:'历史关联回归',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'09:30',timeUnknown:false,leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:''};
let directory:string,store:Store,service:StudioService,current:NamingSession,other:NamingSession;
const disk=()=>readFileSync(join(directory,'customers.sqlite'));
// Only a copied test database bypasses write guards; restore them before exercising the unchanged readers.
function injectIdentityFault(db:Store['db'],triggerName:'session_records_identity_update'|'revision_records_identity_update',mutate:()=>void){
 const trigger=String(db.exec('SELECT sql FROM sqlite_master WHERE type=? AND name=?',['trigger',triggerName])[0].values[0][0]);
 db.run('PRAGMA foreign_keys=OFF');db.run(`DROP TRIGGER ${triggerName}`);
 try{mutate();}finally{db.run(trigger);db.run('PRAGMA foreign_keys=ON');}
 expect(db.exec('PRAGMA foreign_keys')[0].values[0][0]).toBe(1);assertCompactCustomerSchema(db);
}
beforeAll(async()=>{directory=mkdtempSync(join(tmpdir(),'naming-history-row-binding-'));store=await new Store(directory,resolve('data'),resolve('node_modules/sql.js/dist/sql-wasm.wasm')).init();service=new StudioService(store,{read:()=>'',write:()=>{}},false);const preferences=normalizePreferences({length:2,generationChar:'安',requiredChars:'宁',zodiacRules:false,numerology:false});const generated=(await service.generate(profile,preferences)).session;current=service.saveSession({...generated,reviewNote:'创建真实历史'});other=(await service.generate({...profile,id:'history-binding-b',customerName:'另一已有客户'},preferences)).session;},30000);
afterAll(()=>{store?.db.close();if(directory){const absolute=resolve(directory),temporary=resolve(tmpdir());if(!absolute.startsWith(temporary+sep)||!absolute.split(sep).at(-1)?.startsWith('naming-history-row-binding-'))throw new Error('Unexpected temporary test directory');rmSync(absolute,{recursive:true,force:true});}});

describe('actual SQL session and revision identity binding',{timeout:30000},()=>{
 it('saves and reads normal current snapshots with their real linked revisions',()=>{const before=disk(),saved=store.readVerifiedSession(current.id)!;expect(saved.id).toBe(current.id);expect(saved.profileId).toBe(profile.id);expect(service.listHistory(current.id)).toHaveLength(1);expect(store.rows<NamingSession>('sessions')).toHaveLength(2);expect(store.backupBytes().length).toBeGreaterThan(0);expect(disk()).toEqual(before);});
 it.each(['revision-profileId','revision-sql-session-id','current-json-id','orphan-revision'] as const)('rejects %s in the target reader and whole reader without changing disk',async kind=>{
  const isolatedDirectory=mkdtempSync(join(tmpdir(),'naming-history-row-binding-fault-')),before=disk();let isolated:Store|undefined;
  try{
   copyFileSync(join(directory,'customers.sqlite'),join(isolatedDirectory,'customers.sqlite'));isolated=await new Store(isolatedDirectory,resolve('data'),resolve('node_modules/sql.js/dist/sql-wasm.wasm')).init();const reader=isolated,db=reader.db,revision=db.exec('SELECT id,session_id,json FROM revisions WHERE session_id=? LIMIT 1',[current.id])[0].values[0],source=String(db.exec('SELECT json FROM sessions WHERE id=?',[current.id])[0].values[0][0]);let target=current.id;
   injectIdentityFault(db,kind==='current-json-id'?'session_records_identity_update':'revision_records_identity_update',()=>{
    if(kind==='current-json-id'){const value=JSON.parse(source);value.id='forged-json-id';db.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(value),current.id]);expect(JSON.parse(String(db.exec('SELECT json FROM sessions WHERE id=?',[current.id])[0].values[0][0]))).toEqual(value);}
    else{const value=JSON.parse(String(revision[2]));let relation=String(revision[1]);if(kind==='revision-profileId')value.profileId=other.profileId;if(kind==='revision-sql-session-id'){relation=other.id;target=other.id;}if(kind==='orphan-revision'){relation='orphan-without-current';value.id=relation;target=relation;}db.run('UPDATE revisions SET session_id=?,json=? WHERE id=?',[relation,JSON.stringify(value),revision[0]]);const row=db.exec('SELECT session_id,json FROM revisions WHERE id=?',[revision[0]])[0].values[0];expect(row[0]).toBe(relation);expect(JSON.parse(String(row[1]))).toEqual(value);}
   });
   expect(()=>reader.readVerifiedSession(target)).toThrow(/编号|归属/);expect(()=>reader.rows('sessions')).toThrow(/编号|归属/);expect(()=>reader.backupBytes()).toThrow('备份已取消');expect(readFileSync(join(isolatedDirectory,'customers.sqlite'))).toEqual(before);expect(disk()).toEqual(before);
  }finally{isolated?.db.close();rmSync(isolatedDirectory,{recursive:true,force:true});}
 });
 it('retains true missing-source legacy snapshots through save and history reads',()=>{
  const toLegacy=(raw:string)=>{const value=JSON.parse(raw) as NamingSession;value.analysis.bazi=calculateLegacyBazi(value.profile);value.analysis.qimen=calculateQimenProfileV2(value.profile);value.originalFavorable=[...value.analysis.bazi.favorable];delete value.sourceSnapshot;delete value.namingRules;for(const candidate of value.candidates)delete candidate.namingMeaningReview;return value;};
  const source=String(store.db.exec('SELECT json FROM sessions WHERE id=?',[current.id])[0].values[0][0]),revisions=store.db.exec('SELECT id,json FROM revisions WHERE session_id=?',[current.id])[0].values;store.db.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(toLegacy(source)),current.id]);for(const [id,json] of revisions)store.db.run('UPDATE revisions SET json=? WHERE id=?',[JSON.stringify(toLegacy(String(json))),id]);
  const legacy=store.readVerifiedSession(current.id)!;expect(legacy).not.toHaveProperty('sourceSnapshot');const saved=service.saveSession({...legacy,reviewNote:'旧版仍可审阅'});expect(saved).not.toHaveProperty('sourceSnapshot');expect(store.readVerifiedSession(saved.id)).not.toHaveProperty('sourceSnapshot');expect(service.listHistory(saved.id).every(row=>!Object.hasOwn(row.session,'sourceSnapshot'))).toBe(true);expect(store.backupBytes().length).toBeGreaterThan(0);
 });
});
