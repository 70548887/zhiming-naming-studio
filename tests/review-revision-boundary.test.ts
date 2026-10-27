import { afterEach,beforeAll,describe,expect,it } from 'vitest';
import { mkdtempSync,readFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import initSqlJs from 'sql.js';
import { Store,validSession } from '../src/main/store';
import { StudioService } from '../src/main/service';
import type { BirthProfile,NamingPreferences,NamingSession } from '../src/shared/types';

const wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm');
const profile:BirthProfile={id:'review-limit-fixture',customerName:'修订号上限回归',surname:'王',surnamePinyin:'wáng',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'09:30',leapMonth:false,timeUnknown:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:''};
const preferences:NamingPreferences={length:2,generationChar:'',requiredChars:'',forbiddenChars:'',elderTaboo:'',style:'自然',meanings:'平安',industry:'',priority:'balanced',preferredElements:[],zodiacRules:false,numerology:true};
const stores:Store[]=[],directories:string[]=[];
let SQL:Awaited<ReturnType<typeof initSqlJs>>;
beforeAll(async()=>{SQL=await initSqlJs({locateFile:()=>wasm});});
afterEach(()=>{for(const store of stores.splice(0))store.db.close();for(const directory of directories.splice(0))rmSync(directory,{recursive:true,force:true});});

async function atRevision(revision:number){
  const directory=mkdtempSync(join(tmpdir(),'studio-review-upper-bound-'));directories.push(directory);
  const store=await new Store(directory,resolve('data'),wasm).init();stores.push(store);
  const service=new StudioService(store,{read:()=>'',write:()=>{}});
  const generated=(await service.generate(profile,preferences)).session;
  const reviewed=service.saveSession({...generated,reviewNote:'备份中的当前审阅意见'});
  const database=new SQL.Database(store.backupBytes());
  try{
    database.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify({...reviewed,reviewRevision:revision}),reviewed.id]);
    store.restore(database.export());
  }finally{database.close();}
  const current=()=>store.rows<NamingSession>('sessions').find(session=>session.id===generated.id)!;
  return {store,service,current,path:join(directory,'customers.sqlite')};
}

describe('review revision upper bound keeps every accepted archive recoverable', { timeout: 15_000 },()=>{
  it('restores the highest valid revision and keeps a no-op save valid without adding history',async()=>{
    const {store,service,current}=await atRevision(Number.MAX_SAFE_INTEGER-1),original=current();
    expect(validSession(original)).toBe(true);
    const history=store.listRevisions(original.id).length;
    const saved=service.saveSession(structuredClone(original));
    expect(saved.reviewRevision).toBe(Number.MAX_SAFE_INTEGER-1);
    expect(saved.reviewToken).toBe(original.reviewToken);
    expect(store.listRevisions(original.id)).toHaveLength(history);
    expect(validSession(saved)).toBe(true);
    expect(()=>store.backupBytes()).not.toThrow();
  });

  it('refuses every actual review write at the upper bound without changing bytes, history or caller tokens',async()=>{
    const {store,service,current,path}=await atRevision(Number.MAX_SAFE_INTEGER-1),original=current();
    const before=readFileSync(path),history=store.listRevisions(original.id);
    const candidate=original.candidates[0];
    const choices=Object.fromEntries(candidate.numerology!.strokes.map(stroke=>[String(stroke.position),stroke.options[0].id]));
    const draft=structuredClone(original);draft.reviewNote='超过上限的待保存修改';
    const direct=structuredClone(original);direct.candidates[0].favorite=!direct.candidates[0].favorite;
    const attempts=[
      ()=>service.saveSession(draft),
      ()=>store.saveSession(direct),
      ()=>service.updateNumerology(original.id,candidate.id,choices,original.reviewRevision,original.reviewToken),
      ()=>service.restoreHistory(original.id,history[0].id,original.reviewRevision,original.reviewToken)
    ];
    for(const attempt of attempts){
      expect(attempt).toThrow('修订号已达上限');
      expect(readFileSync(path).equals(before)).toBe(true);
      expect(current()).toEqual(original);
      expect(store.listRevisions(original.id)).toEqual(history);
      expect(()=>store.backupBytes()).not.toThrow();
      expect(draft.reviewRevision).toBe(original.reviewRevision);expect(draft.reviewToken).toBe(original.reviewToken);
      expect(direct.reviewRevision).toBe(original.reviewRevision);expect(direct.reviewToken).toBe(original.reviewToken);
    }
  });

  it('allows the final valid increment, then refuses the next change while preserving a restorable snapshot',async()=>{
    const {store,service,current,path}=await atRevision(Number.MAX_SAFE_INTEGER-2);
    const final=service.saveSession({...current(),reviewNote:'最后一次有效修订'});
    expect(final.reviewRevision).toBe(Number.MAX_SAFE_INTEGER-1);
    expect(validSession(final)).toBe(true);
    const archive=store.backupBytes(),before=readFileSync(path);
    expect(()=>service.saveSession({...final,reviewNote:'不应保存的越界修订'})).toThrow('修订号已达上限');
    expect(readFileSync(path).equals(before)).toBe(true);
    expect(()=>store.restore(archive)).not.toThrow();
    const restored=current();
    expect(restored.reviewRevision).toBe(Number.MAX_SAFE_INTEGER-1);
    expect(restored.reviewNote).toBe('最后一次有效修订');
    expect(validSession(restored)).toBe(true);
  });
});
