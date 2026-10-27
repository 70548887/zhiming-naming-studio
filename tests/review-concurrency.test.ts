import {afterEach,describe,expect,it} from 'vitest';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {Store} from '../src/main/store';
import {StudioService} from '../src/main/service';
import type {BirthProfile,NamingPreferences,NamingSession} from '../src/shared/types';

const p:BirthProfile={id:'cas-person',customerName:'隔离并发回归',surname:'王',surnamePinyin:'wáng',gender:'中性',calendar:'solar',birthDate:'2026-10-17',birthTime:'09:30',leapMonth:false,timeUnknown:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:''};
const pref:NamingPreferences={length:2,generationChar:'',requiredChars:'',forbiddenChars:'',elderTaboo:'',style:'自然',meanings:'平安',industry:'',priority:'balanced',preferredElements:[],zodiacRules:false,numerology:true};
const stores:Store[]=[],dirs:string[]=[];
async function setup(){const dir=mkdtempSync(join(tmpdir(),'studio-review-cas-'));dirs.push(dir);const store=await new Store(dir,resolve('data'),resolve('node_modules/sql.js/dist/sql-wasm.wasm')).init();stores.push(store);const service=new StudioService(store,{read:()=>'',write:()=>{}});const session=(await service.generate(p,pref)).session;return {store,service,session,current:()=>store.rows<NamingSession>('sessions').find(s=>s.id===session.id)!};}
afterEach(()=>{for(const store of stores.splice(0))store.db.close();for(const dir of dirs.splice(0))rmSync(dir,{recursive:true,force:true});});

describe('review compare-and-swap across clients and restoration', { timeout: 15_000 },()=>{
  it('rejects a stale different-field submission without erasing a newer candidate review',async()=>{
    const {store,service,session,current}=await setup(),a=structuredClone(session),b=structuredClone(session);
    a.candidates[0].reviewNote='窗口A已保存';const saved=service.saveSession(a),before=store.backupBytes();
    b.reviewNote='窗口B未保存';expect(()=>service.saveSession(b)).toThrow('其他窗口更新');
    expect(current().candidates[0].reviewNote).toBe('窗口A已保存');expect(current().reviewNote).toBe('');expect(Buffer.from(store.backupBytes()).equals(Buffer.from(before))).toBe(true);expect(b.reviewNote).toBe('窗口B未保存');
    expect(saved.reviewRevision).toBe(1);expect(saved.reviewToken).not.toBe(session.reviewToken);
    const merged=structuredClone(saved);merged.reviewNote=b.reviewNote;const result=service.saveSession(merged);expect(result.reviewRevision).toBe(2);expect(result.candidates[0].reviewNote).toBe('窗口A已保存');expect(result.reviewNote).toBe(b.reviewNote);
  });
  it('rejects omitted, forged and stale review tokens but allows a current no-op without new history',async()=>{
    const {store,service,session}=await setup();const before=store.backupBytes();
    for(const revision of [undefined,-1,1,NaN]){const draft=structuredClone(session);draft.reviewRevision=revision;draft.reviewToken=undefined;expect(()=>service.saveSession(draft)).toThrow();}
    const forged=structuredClone(session);forged.reviewToken='not-a-token';expect(()=>service.saveSession(forged)).toThrow();expect(Buffer.from(store.backupBytes()).equals(Buffer.from(before))).toBe(true);
    const same=service.saveSession(structuredClone(session));expect(same.reviewRevision).toBe(session.reviewRevision);expect(same.reviewToken).toBe(session.reviewToken);expect(store.listRevisions(session.id)).toHaveLength(0);
  });
  it('guards favorites, numerology confirmations and historical restores with the same current token',async()=>{
    const {store,service,session,current}=await setup(),draft=structuredClone(session);draft.candidates[0].favorite=true;
    const saved=service.saveSession(draft),candidate=saved.candidates[0];
    const choices=Object.fromEntries(candidate.numerology!.strokes.map(stroke=>[String(stroke.position),stroke.options[0].id]));
    expect(()=>service.updateNumerology(saved.id,candidate.id,choices,session.reviewRevision,session.reviewToken)).toThrow('其他窗口更新');
    expect(()=>service.updateNumerology(saved.id,candidate.id,choices)).toThrow('其他窗口更新');
    const numeric=service.updateNumerology(saved.id,candidate.id,choices,saved.reviewRevision,saved.reviewToken);expect(numeric.candidates[0].favorite).toBe(true);
    const revision=service.listHistory(saved.id).at(-1)!;
    expect(()=>service.restoreHistory(saved.id,revision.id,saved.reviewRevision,saved.reviewToken)).toThrow('其他窗口更新');
    const restored=service.restoreHistory(saved.id,revision.id,numeric.reviewRevision,numeric.reviewToken);expect(restored.candidates[0].favorite).toBe(false);expect(restored.reviewRevision).toBe(numeric.reviewRevision!+1);expect(current().reviewToken).toBe(restored.reviewToken);
    expect(store.listRevisions(saved.id).length).toBeGreaterThanOrEqual(3);
  });
  it('invalidates in-flight clients after backup restore even when numeric revision and content match',async()=>{
    const {store,service,session,current}=await setup(),archive=store.backupBytes(),oldToken=session.reviewToken;
    store.restore(archive);expect(current().reviewRevision).toBe(session.reviewRevision);expect(current().reviewToken).not.toBe(oldToken);
    const stale=structuredClone(session);stale.reviewNote='恢复前客户端';const before=readFileSync(join(store.userDir,'customers.sqlite'));
    expect(()=>service.saveSession(stale)).toThrow('其他窗口更新');expect(readFileSync(join(store.userDir,'customers.sqlite')).equals(before)).toBe(true);
    const fresh=current();fresh.reviewNote='恢复后客户端';expect(service.saveSession(fresh).reviewNote).toBe('恢复后客户端');
  });
  it('the persistence layer rejects stale snapshots and never mutates caller tokens on a failed disk write',async()=>{
    const {store,service,session}=await setup(),a=structuredClone(session),b=structuredClone(session);a.reviewNote='A';service.saveSession(a);b.reviewNote='B';expect(()=>store.saveSession(b)).toThrow('其他窗口更新');
    const draft=store.rows<NamingSession>('sessions')[0],token=draft.reviewToken,revision=draft.reviewRevision;draft.reviewNote='failure';
    store.db.run("CREATE TRIGGER reject_review_update BEFORE UPDATE ON sessions BEGIN SELECT RAISE(FAIL,'injected review failure'); END");
    expect(()=>store.saveSession(draft)).toThrow('injected review failure');expect(draft.reviewToken).toBe(token);expect(draft.reviewRevision).toBe(revision);
  });
});
