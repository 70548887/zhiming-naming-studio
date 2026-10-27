import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {mkdirSync,mkdtempSync,readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {Store} from '../src/main/store';import {StudioService} from '../src/main/service';
import {normalizePreferences} from '../src/shared/workflow';
import type {BirthProfile,NamingSession} from '../src/shared/types';

const directory=resolve('.local/m143-profile-reader-tests');mkdirSync(directory,{recursive:true});
const profile:BirthProfile={id:'m143-profile-a',customerName:'目标查询回归',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'09:30',timeUnknown:false,leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:'',renMethod:'none'};
let store:Store,service:StudioService,target:NamingSession,other:NamingSession;
const disk=()=>readFileSync(join(store.userDir,'customers.sqlite'));
function mutate(id:string,change:(session:NamingSession)=>void){const raw=String(store.db.exec('SELECT json FROM sessions WHERE id=?',[id])[0].values[0][0]),value=JSON.parse(raw);change(value);store.db.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(value),id]);return()=>store.db.run('UPDATE sessions SET json=? WHERE id=?',[raw,id]);}
beforeAll(async()=>{store=await new Store(mkdtempSync(join(directory,'database-')),resolve('data'),resolve('node_modules/sql.js/dist/sql-wasm.wasm')).init();service=new StudioService(store,{read:()=>'',write:()=>{}},false);const pref=(name:string)=>normalizePreferences({length:2,generationChar:[...name][0],requiredChars:[...name][1],numerology:false,zodiacRules:false});target=(await service.generate(profile,pref('安宁'))).session;await service.generate(profile,pref('沐清'));other=(await service.generate({...profile,id:'m143-profile-b'},pref('安宁'))).session;},30000);
afterAll(()=>store?.db.close());
describe('profile-specific verified generation history',{timeout:30000},()=>{
 it('returns the same ordered sessions and given-name exclusions as the previous full inventory',()=>{const before=disk(),expected=store.rows<NamingSession>('sessions').filter(s=>s.profileId===profile.id),actual=store.readVerifiedSessionsForProfile(profile.id);expect(actual).toEqual(expected);expect(actual).toHaveLength(2);expect(actual.map(s=>s.candidates.map(c=>c.givenName))).toEqual(expected.map(s=>s.candidates.map(c=>c.givenName)));expect(disk()).toEqual(before);});
 it('uses an exact bound profile ID and rejects malformed identifiers',()=>{expect(store.readVerifiedSessionsForProfile('missing')).toEqual([]);expect(store.readVerifiedSessionsForProfile("' OR 1=1 --")).toEqual([]);for(const value of ['',null,42,'x'.repeat(1001)])expect(()=>store.readVerifiedSessionsForProfile(value as string)).toThrow();});
 it('rejects altered facts in any selected session and preserves disk bytes',()=>{const before=disk(),undo=mutate(target.id,s=>{s.candidates[0].characters[0].meaning='伪造本字义';});try{expect(()=>store.readVerifiedSessionsForProfile(profile.id)).toThrow();expect(disk()).toEqual(before);}finally{undo();}});
 it('keeps target reads scoped while full backup still rejects unrelated corrupt facts',()=>{const before=disk(),undo=mutate(other.id,s=>{s.candidates[0].characters[0].meaning='伪造无关方案本字义';});try{expect(store.readVerifiedSessionsForProfile(profile.id)).toHaveLength(2);expect(()=>store.backupBytes()).toThrow('备份已取消');expect(disk()).toEqual(before);}finally{undo();}});
 it('retains stale revision and live writer-lock rejection for target review',()=>{const original=store.readVerifiedSession(target.id)!;service.saveSession({...structuredClone(original),reviewNote:'新审阅'});const before=disk();expect(()=>service.saveSession({...structuredClone(original),reviewNote:'过期审阅'})).toThrow('其他窗口');expect(disk()).toEqual(before);const lock=join(store.userDir,'customers.write-lock');writeFileSync(lock,String(process.pid),{flag:'wx'});try{expect(()=>store.saveProfile({...profile,notes:'不得获取锁'})).toThrow('另一个进程');expect(disk()).toEqual(before);expect(readFileSync(lock,'utf8')).toBe(String(process.pid));}finally{unlinkSync(lock);}});
});
