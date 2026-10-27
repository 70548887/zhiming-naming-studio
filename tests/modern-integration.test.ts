import {beforeAll,afterAll,describe,it,expect,vi} from 'vitest';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import initSqlJs from 'sql.js';
import {Store,validSession,defaults} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {normalizePreferences,compareSessionReviews} from '../src/shared/workflow';
import {modernRecordView,modernPracticalEvidenceReport} from '../src/shared/modern-practical-evidence';
import {createModernRecord,authorizeModernMutation} from '../src/main/modern-practical-evidence';
import {reportHTML} from '../src/main/report';
import type {BirthProfile,NamingSession} from '../src/shared/types';
const workspace=fileURLToPath(new URL('../',import.meta.url)),out=resolve('.local/team-137/dev02/modern-evidence-integration/verification');
const wasm=createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm');
const stores:Store[]=[];const hash=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const p:BirthProfile={id:'modern-integration',customerName:'现代流程隔离样本',surname:'李',surnamePinyin:'lǐ',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'09:30',timeUnknown:false,leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:''};
let store:Store,service:StudioService,saved:NamingSession,candidateId:string;
const current=()=>store.readVerifiedSession(saved.id)!;
const target=(s:NamingSession)=>s.candidates.find(c=>c.id===candidateId)!;
const disk=()=>hash(readFileSync(join(store.userDir,'customers.sqlite')));
const record=()=>{const s=current();return service.recordModernPracticalEvidence(s.id,candidateId,s.reviewRevision??0,s.reviewToken);};
async function setup(){mkdirSync(out,{recursive:true});const directory=mkdtempSync(join(out,'store-')),st=await new Store(directory,join(workspace,'data'),wasm).init();stores.push(st);return {store:st,service:new StudioService(st,{read:()=>'',write:()=>{}},false)};}
function mutate(id:string,edit:(s:any)=>void){const raw=String(store.db.exec('SELECT json FROM sessions WHERE id=?',[id])[0].values[0][0]);const s=JSON.parse(raw);edit(s);store.db.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(s),id]);return ()=>store.db.run('UPDATE sessions SET json=? WHERE id=?',[raw,id]);}
beforeAll(async()=>{({store,service}=await setup());saved=(await service.generate(p,normalizePreferences({requiredChars:'知安',industry:'非科技行业',zodiacRules:false}))).session;candidateId=saved.candidates.find(c=>c.givenName==='知安')!.id;});
afterAll(()=>{for(const s of stores)s.db.close();});

describe('explicit modern record/clear with original saving boundaries',()=>{
 it('never backfills during generate, read, comparison or original HTML export',()=>{
  const s=current(),before=disk();expect(target(s).modernPracticalEvidence).toBeUndefined();expect(modernRecordView(target(s)).state).toBe('missing');expect(modernPracticalEvidenceReport(target(s))).toBe('');
  const html=reportHTML(s,defaults);expect(html).not.toContain('modern-practical-report');expect(compareSessionReviews(s,structuredClone(s))).toEqual([]);expect(disk()).toBe(before);
 });
 it('records from verified IDs only, with CAS/history/capture identities and fixed scores/sources',()=>{
  const old=current(),scores=old.candidates.map(c=>c.evaluation),snapshot=structuredClone(old.sourceSnapshot),s=record(),r=target(s).modernPracticalEvidence as any;
  expect(validSession(s)).toBe(true);expect(modernRecordView(target(s)).state).toBe('current');expect(s.reviewRevision).toBe((old.reviewRevision??0)+1);expect(s.reviewToken).not.toBe(old.reviewToken);
  expect(r.capture).toMatchObject({sessionId:s.id,candidateId,reviewRevision:old.reviewRevision,reviewToken:old.reviewToken,dataVersion:s.dataVersion,datasetSha256:s.factVerification!.datasetSha256});
  expect(r.capture.characterSha256).toMatch(/^[a-f0-9]{64}$/);expect(r.capture.sourceSnapshotSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(s.candidates.map(c=>c.evaluation)).toEqual(scores);expect(s.sourceSnapshot).toEqual(snapshot);expect(service.listHistory(s.id).some(row=>row.session.reviewToken===old.reviewToken&&target(row.session).modernPracticalEvidence===undefined)).toBe(true);
  writeFileSync(join(out,'saved-modern.json'),JSON.stringify(s,null,2));writeFileSync(join(out,'saved-modern-report.html'),reportHTML(s,defaults));
 });
 it('uses D01 verified targeted path and still revalidates all immutable source facts',()=>{
  const originalRows=store.rows;Object.defineProperty(store,'rows',{configurable:true,value:()=>{throw new Error('full rows scan forbidden');}});
  try{const s=store.readVerifiedSession(saved.id)!;expect(()=>service.recordModernPracticalEvidence(s.id,candidateId,s.reviewRevision??0,s.reviewToken)).not.toThrow();}finally{Object.defineProperty(store,'rows',{configurable:true,writable:true,value:originalRows});}
  for(const edit of [(s:any)=>s.candidates[0].characters[0].meaning='forged', (s:any)=>s.sourceSnapshot.sources[0].sha256='f'.repeat(64),(s:any)=>s.analysis.bazi.version='invalid']){
   const undo=mutate(saved.id,edit),before=disk();try{expect(()=>store.readVerifiedSession(saved.id)).toThrow();expect(()=>service.recordModernPracticalEvidence(saved.id,candidateId,current()?.reviewRevision??0,current()?.reviewToken)).toThrow();expect(disk()).toBe(before);}finally{undo();}
  }
 });
 it('ordinary service and direct Store saves reject graft/change/clear/capture and self-consistent basis replay',()=>{
  const original=current(),before=disk();
  const edits=[(s:NamingSession)=>{delete target(s).modernPracticalEvidence;},(s:NamingSession)=>{(target(s).modernPracticalEvidence as any).basis.meaning='invented';},(s:NamingSession)=>{(target(s).modernPracticalEvidence as any).capture.reviewRevision=0;},(s:NamingSession)=>{(target(s).modernPracticalEvidence as any).evidence.storedEvaluation.meaning=100;},(s:NamingSession)=>{target(s).meaning='changed meaning';target(s).modernPracticalEvidence=createModernRecord(s,candidateId);}];
  for(const edit of edits){const altered=structuredClone(original);edit(altered);expect(()=>service.saveSession(altered)).toThrow();expect(()=>store.saveSession(altered)).toThrow();expect(disk()).toBe(before);}
  const other=current().candidates.find(c=>c.id!==candidateId)!;
  const graft=structuredClone(original);graft.candidates.find(c=>c.id===other.id)!.modernPracticalEvidence=structuredClone(target(original).modernPracticalEvidence);expect(()=>store.saveSession(graft)).toThrow();expect(disk()).toBe(before);
 });
 it('stale CAS or extra caller facts cannot commit, and failure releases the writer lock',()=>{
  const stale=current();const updated=service.saveSession({...stale,reviewNote:'新审阅'}),before=disk();
  expect(()=>service.recordModernPracticalEvidence(stale.id,candidateId,stale.reviewRevision??0,stale.reviewToken)).toThrow('已被其他窗口更新');
  expect(()=>service.clearModernPracticalEvidence(stale.id,candidateId,stale.reviewRevision??0,stale.reviewToken)).toThrow();
  expect(()=>(service.recordModernPracticalEvidence as any)(updated.id,candidateId,updated.reviewRevision,updated.reviewToken,{evidence:'caller'})).toThrow();expect(disk()).toBe(before);expect(existsSync(join(store.userDir,'customers.write-lock'))).toBe(false);
 });
 it('writer re-reads previous and refuses a valid read that became stale before save',()=>{
  const s=current(),originalRead=store.readVerifiedSession.bind(store);let once=false;
  const spy=vi.spyOn(store,'readVerifiedSession').mockImplementation(id=>{const value=originalRead(id);if(!once){once=true;service.saveSession({...value!,reviewNote:'锁前发生的另一审阅'});}return value;});
  try{expect(()=>service.recordModernPracticalEvidence(s.id,candidateId,s.reviewRevision??0,s.reviewToken)).toThrow('已被其他窗口更新');}finally{spy.mockRestore();}
  expect(existsSync(join(store.userDir,'customers.write-lock'))).toBe(false);expect(current().reviewNote).toBe('锁前发生的另一审阅');
 });
 it('legal meaning edit preserves original record and becomes stale; notes/reason do not rebuild it',()=>{
  const s=current(),r=structuredClone(target(s).modernPracticalEvidence);target(s).meaning='<img src=x onerror=alert(1)>新的人工寓意';target(s).reviewNote='合法审阅';
  const updated=service.saveSession(s);expect(target(updated).modernPracticalEvidence).toEqual(r);expect(modernRecordView(target(updated)).state).toBe('stale');expect(store.readVerifiedSession(s.id)).toBeTruthy();
  const report=reportHTML(updated,defaults);expect(report).toContain('保存后寓意已修改');expect(report).not.toContain('<img src=x');expect(report).not.toContain('现代实用性说明 · 已保存');
  const noteOnly=structuredClone(updated);target(noteOnly).reason='合法推荐理由';target(noteOnly).reviewNote+='另记';expect(service.saveSession(noteOnly).candidates.find(c=>c.id===candidateId)!.modernPracticalEvidence).toEqual(r);
 });
 it('backup/history retain legitimate stale records; restore restores the exact historical current record',async()=>{
  const s=current();expect(modernRecordView(target(s)).state).toBe('stale');const backup=store.backupBytes(),other=await setup();other.store.restore(backup);const restored=other.store.readVerifiedSession(s.id)!;expect(modernRecordView(target(restored)).state).toBe('stale');expect(target(restored).modernPracticalEvidence).toEqual(target(s).modernPracticalEvidence);
  const history=service.listHistory(s.id),prior=history.find(row=>modernRecordView(target(row.session)).state==='current')!;expect(prior).toBeTruthy();
  const next=service.restoreHistory(s.id,prior.id,s.reviewRevision??0,s.reviewToken);expect(target(next).modernPracticalEvidence).toEqual(target(prior.session).modernPracticalEvidence);expect(modernRecordView(target(next)).state).toBe('current');expect(next.reviewToken).not.toBe(s.reviewToken);
 });
 it('clear is dedicated CAS, appends history and missing legacy HTML remains compatible',()=>{
  const s=current(),r=structuredClone(target(s).modernPracticalEvidence);const cleared=service.clearModernPracticalEvidence(s.id,candidateId,s.reviewRevision??0,s.reviewToken);
  expect(target(cleared).modernPracticalEvidence).toBeUndefined();expect(service.listHistory(s.id).some(row=>JSON.stringify(target(row.session).modernPracticalEvidence)===JSON.stringify(r))).toBe(true);
  expect(modernPracticalEvidenceReport(target(cleared))).toBe('');expect(cleared.candidates.map(c=>c.evaluation)).toEqual(s.candidates.map(c=>c.evaluation));
  const diskBefore=disk();expect(service.clearModernPracticalEvidence(cleared.id,candidateId,cleared.reviewRevision??0,cleared.reviewToken).reviewRevision).toBe(cleared.reviewRevision);expect(disk()).toBe(diskBefore);
 });
 it('restoring a pre-record revision removes only via history capability and retains generation identity',()=>{
  record();const s=current(),history=service.listHistory(s.id),old=history.find(row=>target(row.session).modernPracticalEvidence===undefined)!;
  const restored=service.restoreHistory(s.id,old.id,s.reviewRevision??0,s.reviewToken);expect(target(restored).modernPracticalEvidence).toBeUndefined();expect(restored.sourceSnapshot).toEqual(s.sourceSnapshot);expect(restored.candidates.map(c=>c.evaluation)).toEqual(old.session.candidates.map(c=>c.evaluation));
 });
 it('backups reject altered current and historical evidence/basis/identities without replacing the DB',async()=>{
  record();const backup=store.backupBytes(),SQL=await initSqlJs({locateFile:()=>wasm});
  for(const location of ['sessions','revisions']){
   const db=new SQL.Database(backup),rows=db.exec(`SELECT ${location==='sessions'?'id':'rowid'},json FROM ${location}`)[0].values;
   const row=rows.find(row=>JSON.parse(String(row[1])).candidates?.some((c:any)=>c.modernPracticalEvidence?.version==='modern-practical-evidence/1.0.0'))!;
   const value=JSON.parse(String(row[1])),c=value.candidates.find((c:any)=>c.modernPracticalEvidence);c.modernPracticalEvidence.capture.candidateId='another';db.run(`UPDATE ${location} SET json=? WHERE ${location==='sessions'?'id':'rowid'}=?`,[JSON.stringify(value),row[0]]);
   const broken=db.export();db.close();const before=disk();expect(()=>store.restore(broken)).toThrow('不是有效');expect(disk()).toBe(before);
  }
 });
 it('unknown versions remain opaque, do not enrich facts, and ordinary saves cannot upgrade them',()=>{
  const s=current(),undo=mutate(s.id,value=>{value.candidates.find((c:any)=>c.id===candidateId).modernPracticalEvidence={version:'modern-practical-evidence/999',futureMeaning:'<script>unknown</script>'};});
  try{const known=current(),r=structuredClone(target(known).modernPracticalEvidence);expect(modernRecordView(target(known)).state).toBe('unsupported');const h=reportHTML(known,defaults);expect(h).toContain('版本暂不支持');expect(h).not.toContain('<script>unknown');expect(service.saveSession({...known,reviewNote:'保留未知记录'}).candidates.find(c=>c.id===candidateId)!.modernPracticalEvidence).toEqual(r);}finally{undo();}
 });
 it('separate clone transactions preserve records but are not claimed to test D01/WORD implementations',()=>{
  const s=current(),r=structuredClone(target(s).modernPracticalEvidence),copy=structuredClone(s);
  (target(copy) as any).wordPronunciationReference={version:'synthetic-clone-only'};(target(copy) as any).meaningContextReview={synthetic:true};(target(copy) as any).elementConfirmation={synthetic:true};
  expect(target(copy).modernPracticalEvidence).toEqual(r);expect(modernRecordView(target(copy)).state).toBe(modernRecordView(target(s)).state);
  // Deliberately not persisted: actual new D01/04 source/domain validation belongs to root joint integration.
 });

 it('known capture revisions/tokens must resolve to actual same-session original meaning witnesses',()=>{
  for(const edit of [(r:any)=>r.capture.reviewToken='00000000-0000-4000-8000-000000000000',(r:any)=>r.capture.reviewRevision=Number.MAX_SAFE_INTEGER-2,(r:any)=>r.capture.sourceSnapshotSha256='f'.repeat(64),(r:any)=>r.capture.characterSha256='e'.repeat(64),(r:any)=>{r.basis.meaning='invented but internally canonical';}]){
   const undo=mutate(saved.id,s=>edit(s.candidates.find((c:any)=>c.id===candidateId).modernPracticalEvidence)),before=disk();
   try{expect(()=>store.readVerifiedSession(saved.id)).toThrow();expect(()=>store.backupBytes()).toThrow();expect(disk()).toBe(before);}finally{undo();}
  }
 });

 it('record authorization fixes exact bytes and lock-current capture, then is consumed once',()=>{
  const s=current(),next=structuredClone(s),c=target(next);c.modernPracticalEvidence=createModernRecord(next,candidateId);authorizeModernMutation(next,candidateId,'record');
  (c.modernPracticalEvidence as any).recordedAt='2020-01-01T00:00:00.000Z';const before=disk();expect(()=>store.saveSession(next)).toThrow('授权后的记录被替换');expect(disk()).toBe(before);
  // Failure consumes transferred authority. Restoring bytes cannot turn a later ordinary save into a dedicated action.
  c.modernPracticalEvidence=createModernRecord(next,candidateId);expect(()=>store.saveSession(next)).toThrow();expect(disk()).toBe(before);
 });

 it('offline unsigned data can be fully rewritten self-consistently: consistency is not authorship',async()=>{
  const s=current(),backup=store.backupBytes(),SQL=await initSqlJs({locateFile:()=>wasm}),db=new SQL.Database(backup);
  const unsignedSession=JSON.parse(String(db.exec('SELECT json FROM sessions WHERE id=?',[s.id])[0].values[0][0])) as NamingSession;
  // Explicit adversarial fixture: re-write the record, its capture revision/token and a new matching history witness.
  // This is not an exposed Service operation or a claimed cryptographic guarantee.
  const witness=structuredClone(unsignedSession);target(witness).meaning='整份无签名离线记录被一致改写';delete target(witness).modernPracticalEvidence;
  target(unsignedSession).meaning=target(witness).meaning;target(unsignedSession).modernPracticalEvidence=createModernRecord(witness,candidateId);
  unsignedSession.reviewRevision=(witness.reviewRevision??0)+1;
  db.run('INSERT INTO revisions(session_id,created_at,json) VALUES (?,?,?)',[s.id,new Date().toISOString(),JSON.stringify(witness)]);
  db.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(unsignedSession),s.id]);
  const rewritten=db.export();db.close();const other=await setup();expect(()=>other.store.restore(rewritten)).not.toThrow();
  const imported=other.store.readVerifiedSession(s.id)!;expect(modernRecordView(target(imported)).state).toBe('current');
  writeFileSync(join(out,'unsigned-offline-boundary.json'),JSON.stringify({consistentRewriteAccepted:true,cryptographicAuthorshipVerified:false,serviceMutationGateBypassed:false,scope:'Entire offline unsigned DB/history fixture rewritten; not an API bypass.'},null,2));
 });
});
