import {afterAll,afterEach,beforeAll,describe,expect,it,vi} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type {Database} from 'sql.js';
import {Store} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {normalizePreferences} from '../src/shared/workflow';
import {decodeCustomerBackup} from '../src/main/customer-backup-envelope';
import type {BirthProfile,NamingSession} from '../src/shared/types';

// Faults apply only to the final-byte helper in this test module. Production
// limits and validators remain unchanged; the wrapper always runs the real scan.
const fault=vi.hoisted(()=>({
  mode:'none' as 'none'|'bytes'|'roots'|'blob'|'foreign-keys',byteLimit:0,rootLimit:0,
  observations:[] as {roots:number;token:string;model:string;bytes?:number}[]
}));
vi.mock('../src/main/compact-customer-store',async importOriginal=>{
  const actual=await importOriginal<typeof import('../src/main/compact-customer-store')>();
  return {...actual,compactCustomerBytes(db:Database){
    if(fault.mode==='none')return actual.compactCustomerBytes(db);
    const session=JSON.parse(String(db.exec('SELECT json FROM sessions')[0].values[0][0]));
    const settings=JSON.parse(String(db.exec("SELECT json FROM settings WHERE id='main'")[0].values[0][0]));
    const observation={roots:Number(db.exec('SELECT COUNT(*) FROM snapshot_roots')[0].values[0][0]),token:String(session.reviewToken),model:String(settings.model),bytes:undefined as number|undefined};
    fault.observations.push(observation);
    if(fault.mode==='blob')db.run('INSERT INTO snapshot_blobs(sha,raw_bytes,codec,payload) VALUES(?,?,?,?)',['f'.repeat(64),8,'deflate-raw/1',new Uint8Array([1,2,3,4])]);
    if(fault.mode==='foreign-keys')db.run('PRAGMA foreign_keys=OFF');
    const bytes=actual.compactCustomerBytes(db);
    observation.bytes=bytes.length;
    if(fault.mode==='bytes'&&bytes.length>fault.byteLimit)throw new Error('M734 isolated final byte budget exceeded');
    if(fault.mode==='roots'&&observation.roots>fault.rootLimit)throw new Error('M734 isolated final root budget exceeded');
    return bytes;
  }};
});

const ownedRoot=path.resolve('.local/m734-restore-final-budget'),data=path.resolve('data'),wasm=path.resolve('node_modules/sql.js/dist/sql-wasm.wasm');
const profile:BirthProfile={id:'m734-profile',customerName:'恢复最终预算',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'09:30',timeUnknown:false,leapMonth:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'source-profile'};
const localAi={apiBaseUrl:'https://local.invalid/v1',model:'local-model-'+'m'.repeat(24576),timeoutMs:55000,useAi:false,hasApiKey:true};
const stores:Store[]=[],directories:string[]=[];
let archive:Uint8Array,sourceBytes:Uint8Array,inputSession:NamingSession,inputHistory:unknown[][],sourceRoots:string[],sourceService:StudioService;
async function open(directory:string){const store=await new Store(directory,data,wasm).init();stores.push(store);return store;}
function directory(label:string){const result=fs.mkdtempSync(path.join(ownedRoot,label+'-'));directories.push(result);return result;}
const file=(store:Store)=>path.join(store.userDir,'customers.sqlite');
const rawHistory=(store:Store)=>store.db.exec('SELECT id,session_id,created_at,json FROM revisions ORDER BY id')[0]?.values??[];
const epoch=(store:Store)=>(store as unknown as {profileEpoch:string}).profileEpoch;
beforeAll(async()=>{
  fs.mkdirSync(ownedRoot,{recursive:true});const source=await open(directory('source'));
  source.put('settings','main',{...source.settings(),studioName:'M734源品牌',contact:'source-contact'});
  sourceService=new StudioService(source,{read:()=>'',write:()=>{}},false);
  const generated=(await sourceService.generate(profile,normalizePreferences({length:1,requiredChars:'安',zodiacRules:false,numerology:false}))).session;
  sourceService.saveSession({...generated,reviewNote:'保留完整历史'});
  inputSession=JSON.parse(String(source.db.exec('SELECT json FROM sessions')[0].values[0][0]));
  inputHistory=rawHistory(source);sourceRoots=(source.db.exec('SELECT sha FROM snapshot_roots')[0]?.values??[]).map(row=>String(row[0]));
  archive=source.backupBytes();sourceBytes=source.db.export();
},30000);
afterEach(()=>{fault.mode='none';fault.observations.length=0;});
afterAll(async()=>{
  await sourceService?.closeCmnReadingWorker();for(const store of stores)store.db.close();
  for(const value of directories){const resolved=path.resolve(value);if(path.dirname(resolved)!==ownedRoot)throw new Error('Unexpected test cleanup target');fs.rmSync(resolved,{recursive:true});}
});
async function target(){
  const dir=directory('target');fs.writeFileSync(path.join(dir,'customers.sqlite'),sourceBytes,{flag:'wx'});
  const store=await open(dir);store.put('settings','main',{...store.settings(),studioName:'本地品牌',contact:'local-contact',...localAi});
  store.saveProfile({...profile,notes:'local-profile-before-restore'});
  return store;
}
function capture(store:Store){
  const prior=path.join(store.userDir,'customers.before-restore.sqlite'),sentinel=Buffer.from('M734 existing before-restore backup');fs.writeFileSync(prior,sentinel);
  return{db:store.db,bytes:fs.readFileSync(file(store)),epoch:epoch(store),cas:store.profileWriteToken(profile.id),prior,sentinel,settings:store.settings(),session:store.readVerifiedSession(inputSession.id),history:rawHistory(store)};
}
async function assertUntouched(store:Store,before:ReturnType<typeof capture>){
  expect(store.db).toBe(before.db);expect(fs.readFileSync(file(store))).toEqual(before.bytes);expect(fs.readFileSync(before.prior)).toEqual(before.sentinel);
  expect(epoch(store)).toBe(before.epoch);expect(store.profileWriteToken(profile.id)).toBe(before.cas);expect(store.settings()).toEqual(before.settings);
  expect(store.readVerifiedSession(inputSession.id)).toEqual(before.session);expect(rawHistory(store)).toEqual(before.history);
  expect(store.rows<BirthProfile>('profiles')[0].notes).toBe('local-profile-before-restore');
  expect(fs.existsSync(path.join(store.userDir,'customers.write-lock'))).toBe(false);
  const cold=await open(store.userDir);expect(cold.rows<BirthProfile>('profiles')[0].notes).toBe('local-profile-before-restore');
  expect(fs.readFileSync(file(cold))).toEqual(before.bytes);
}

describe('M734 final transformed restore validation',()=>{
  it('rejects final physical bytes over an isolated small budget before touching the old library or recovery backup',async()=>{
    const store=await target(),before=capture(store);fault.mode='bytes';fault.byteLimit=decodeCustomerBackup(archive).sqlite.length;
    expect(()=>store.restore(archive)).toThrow('M734 isolated final byte budget exceeded');
    const seen=fault.observations[0];expect(seen.bytes).toBeGreaterThan(fault.byteLimit);expect(seen.roots).toBeGreaterThan(sourceRoots.length);expect(seen.token).not.toBe(inputSession.reviewToken);expect(seen.model).toBe(localAi.model);
    fault.mode='none';await assertUntouched(store,before);
  },15000);
  it('rejects an isolated final root budget after current token rotation without removing retained roots or history',async()=>{
    const store=await target(),before=capture(store);fault.mode='roots';fault.rootLimit=sourceRoots.length;
    expect(()=>store.restore(archive)).toThrow('M734 isolated final root budget exceeded');expect(fault.observations[0].roots).toBe(sourceRoots.length+1);expect(fault.observations[0].token).not.toBe(inputSession.reviewToken);
    fault.mode='none';await assertUntouched(store,before);
  },15000);
  it.each(['blob','foreign-keys'] as const)('runs the real final compact validator and preserves live state when %s is invalid',async mode=>{
    const store=await target(),before=capture(store);fault.mode=mode;
    expect(()=>store.restore(archive)).toThrow();expect(fault.observations[0].token).not.toBe(inputSession.reviewToken);expect(fault.observations[0].roots).toBeGreaterThan(sourceRoots.length);
    fault.mode='none';await assertUntouched(store,before);
  },15000);
  it('commits validated transformed bytes, rotates ABA tokens, keeps complete history and local AI settings, and remains backuppable after cold reopen',async()=>{
    const store=await target(),oldClient=store.readVerifiedSession(inputSession.id)!,oldDb=store.db,oldCas=store.profileWriteToken(profile.id),before=fs.readFileSync(file(store));
    store.restore(archive);const saved=store.readVerifiedSession(inputSession.id)!;
    expect(store.db).not.toBe(oldDb);expect(store.profileWriteToken(profile.id)).not.toBe(oldCas);expect(saved.reviewToken).not.toBe(inputSession.reviewToken);expect(saved.reviewToken).not.toBe(oldClient.reviewToken);
    expect({...saved,reviewToken:inputSession.reviewToken}).toEqual(inputSession);expect(rawHistory(store)).toEqual(inputHistory);
    expect((store.db.exec('SELECT sha FROM snapshot_roots')[0]?.values??[]).map(row=>String(row[0]))).toEqual(expect.arrayContaining(sourceRoots));
    expect(store.settings()).toMatchObject({studioName:'M734源品牌',contact:'source-contact',...localAi});
    expect(fs.readFileSync(path.join(store.userDir,'customers.before-restore.sqlite'))).toEqual(before);
    const service=new StudioService(store,{read:()=>'',write:()=>{}},false);expect(()=>service.saveSession({...oldClient,reviewNote:'stale review'})).toThrow('方案已被其他窗口更新');
    const backup=store.backupBytes();expect(Buffer.from(backup.subarray(0,8)).toString('ascii')).toBe('NSBK0001');
    const cold=await open(store.userDir);expect(cold.readVerifiedSession(inputSession.id)?.reviewToken).toBe(saved.reviewToken);expect(rawHistory(cold)).toEqual(inputHistory);expect(cold.settings()).toMatchObject(localAi);expect(()=>cold.backupBytes()).not.toThrow();
  },15000);
});
