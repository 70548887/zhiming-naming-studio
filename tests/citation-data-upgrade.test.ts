import {afterEach,describe,expect,it} from 'vitest';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import initSqlJs from 'sql.js';
import fixture from './fixtures/citation-session-1.0.18.json';
import {Store} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {packSha} from '../src/main/candidate-facts';
import {reportHTML} from '../src/main/report';
import {calculateBaziV3} from '../src/domain/bazi-v3';
import {calculateQimenProfileV2} from '../src/domain/qimen-v2';
import type {NamingSession} from '../src/shared/types';

const dataDir=resolve('data'),wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm');
const oldPack=new Uint8Array(readFileSync(resolve('tests/fixtures/citation-data-1.0.18.sqlite')));
const directories:string[]=[],stores:Store[]=[];
const original=()=>structuredClone(fixture.session) as NamingSession;
const current=(store:Store,id:string)=>store.rows<NamingSession>('sessions').find(session=>session.id===id)!;
async function open(data=dataDir){
  const userDir=mkdtempSync(join(tmpdir(),'citation-data-upgrade-'));directories.push(userDir);
  const store=await new Store(userDir,data,wasm).init();stores.push(store);
  return {store,service:new StudioService(store,{read:()=>'',write:()=>{}},false)};
}
async function oldContext(){
  // Fixed3/4/5 application bundles stay intact; activate the authentic old package through the real import boundary.
  const old=await open(),preview=old.service.prepareDataPack(oldPack);old.service.applyDataPackPreview(preview.id);
  expect(Buffer.from(old.store.currentPackBytes()).equals(Buffer.from(oldPack))).toBe(true);
  const session=original();old.store.saveProfile(session.profile);old.store.saveSession(session);
  return {...old,session:current(old.store,session.id)};
}
async function setup(){
  const old=await oldContext(),edited=structuredClone(old.session);
  edited.candidates[0].meaning='人工保存的温和喜乐解释';edited.candidates[0].reason+=' 人工保留的推荐理由。';edited.candidates[0].reviewNote='家长已审阅';
  const annotated=old.service.saveSession(edited),backup=old.store.backupBytes(),upgraded=await open();
  expect(upgraded.store.dataset.version).not.toBe(old.session.dataVersion);
  upgraded.store.restore(backup);
  return {old,annotated,backup,...upgraded,restored:current(upgraded.store,old.session.id)};
}
async function mutateBackup(bytes:Uint8Array,edit:(session:NamingSession,db:any)=>void){
  const SQL=await initSqlJs({locateFile:()=>wasm}),db=new SQL.Database(bytes);
  try{const row=db.exec('SELECT id,json FROM sessions')[0].values[0],session=JSON.parse(String(row[1]));edit(session,db);db.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(session),String(row[0])]);return db.export();}finally{db.close();}
}
afterEach(()=>{for(const store of stores.splice(0))store.db.close();for(const dir of directories.splice(0))rmSync(dir,{recursive:true,force:true});});

describe('real 1.0.18 citation-package and saved-candidate compatibility after editorial expansion', { timeout: 15_000 },()=>{
  it('pins the actual original package and pre-edit session, then archives the complete legally imported old package',async()=>{
    expect(packSha(oldPack)).toBe(fixture.provenance.originalPackSha256);
    expect(fixture.provenance.originalPackSha256).toBe('0693545fa1ee7ce674640a16674f0b6ecb8a39f52c06f0b13f02cd2fb9d3d8d3');
    const {store,session}=await oldContext();
    expect(session.dataVersion).toBe(fixture.provenance.oldDataVersion);
    expect(session.factVerification?.status).toBe('verified-archive');
    expect(session.candidates).toEqual(fixture.session.candidates);
    const archive=store.db.exec('SELECT sha256,version,pack FROM knowledge_archives')[0].values[0];
    expect(archive[0]).toBe(packSha(oldPack));expect(archive[1]).toBe(session.dataVersion);expect(Buffer.from(archive[2] as Uint8Array).equals(Buffer.from(oldPack))).toBe(true);
  });

  it('loads the old real package as an archive while preserving every candidate field and original source declaration',async()=>{
    const {annotated,restored}=await setup();
    expect(restored.candidates).toEqual(annotated.candidates);
    expect(restored.sourceSnapshot).toEqual(annotated.sourceSnapshot);
    expect(restored.dataVersion).toBe(annotated.dataVersion);
    expect(restored.factVerification).toMatchObject({status:'verified-archive',datasetSha256:packSha(oldPack)});
  });

  it('reviews the upgraded archive without recomputing scores, dictionary senses or original explanations',async()=>{
    const {service,restored}=await setup(),draft=structuredClone(restored);draft.reviewNote='升级后的独立审阅意见';
    const saved=service.saveSession(draft);
    expect(saved.candidates).toEqual(restored.candidates);expect(saved.sourceSnapshot).toEqual(restored.sourceSnapshot);expect(saved.reviewNote).toBe(draft.reviewNote);
  });

  it('restores the earliest review from the old snapshot instead of applying current editorial rules',async()=>{
    const {service,restored}=await setup(),revision=service.listHistory(restored.id).at(-1)!;
    const saved=service.restoreHistory(restored.id,revision.id,restored.reviewRevision,restored.reviewToken);
    expect(saved.candidates).toEqual(fixture.session.candidates);
    expect(saved.sourceSnapshot).toEqual(fixture.session.sourceSnapshot);
  });

  it('renders saved old explanations, citations and hashes in the report',async()=>{
    const {store,restored}=await setup(),html=reportHTML(restored,store.settings());
    expect(html).toContain(restored.candidates[0].meaning);
    expect(html).toContain(restored.candidates[0].originalMeaning);
    expect(html).toContain(restored.candidates[0].citations[0].text);
    const oldEditorial=restored.sourceSnapshot!.sources.find(source=>source.id==='editorial-rules')!;
    const newEditorial=store.dataset.sources.find(source=>source.id==='editorial-rules')!;
    expect(oldEditorial.sha256).not.toBe(newEditorial.sha256);
    expect(html).toContain(oldEditorial.sha256);expect(html).not.toContain(newEditorial.sha256);
  });

  it('keeps old candidate and source values through another full backup and restore',async()=>{
    const {store,restored}=await setup(),other=await open();other.store.restore(store.backupBytes());
    const after=current(other.store,restored.id);
    expect(after.candidates).toEqual(restored.candidates);expect(after.sourceSnapshot).toEqual(restored.sourceSnapshot);
    expect(after.factVerification?.datasetSha256).toBe(packSha(oldPack));
  });

  it('retains a legacy-format record as unverified without current-rule replacement',async()=>{
    const {backup,store,annotated}=await setup();
    const bytes=await mutateBackup(backup,(s,db)=>{db.run('DELETE FROM knowledge_archives');db.run('DELETE FROM revisions');s.analysis.bazi=calculateBaziV3(s.profile);s.analysis.qimen=calculateQimenProfileV2(s.profile);s.originalFavorable=[...s.analysis.bazi.favorable];s.dataVersion='legacy-original-citation-profile';s.sourceSnapshot!.dataVersion=s.dataVersion;delete s.factVerification;});
    store.restore(bytes);const saved=current(store,fixture.session.id);
    expect(saved.factVerification?.status).toBe('unverified-legacy');
    expect(saved.candidates).toEqual(annotated.candidates);
    expect(saved.candidates[0].originalMeaning).toBe(fixture.session.candidates[0].originalMeaning);
    expect(saved.sourceSnapshot!.sources).toEqual(fixture.session.sourceSnapshot.sources);
  });

  it('atomically rejects removal of a current-generation archive instead of revalidating using new editorial data',async()=>{
    const {backup,store}=await setup(),before=readFileSync(join(store.userDir,'customers.sqlite'));
    const damaged=await mutateBackup(backup,(_s,db)=>{db.run('DELETE FROM knowledge_archives');});
    expect(()=>store.restore(damaged)).toThrow('字段不完整');
    expect(readFileSync(join(store.userDir,'customers.sqlite')).equals(before)).toBe(true);
  });
});
