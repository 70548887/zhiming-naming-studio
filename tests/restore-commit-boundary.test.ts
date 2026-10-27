import {afterEach,describe,expect,it} from 'vitest';
import fs from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createRequire,syncBuiltinESMExports} from 'node:module';
import {CustomerStorageCommittedError,Store} from '../src/main/store';
import type {BirthProfile} from '../src/shared/types';

const prefix='restore-commit-boundary-';
const parent=fs.realpathSync.native(tmpdir());
const wasm=path.resolve('node_modules/sql.js/dist/sql-wasm.wasm');
const dataDir=path.resolve('data');
const profile:BirthProfile={id:'restore-boundary-profile',customerName:'测试',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2026-10-17',leapMonth:false,birthTime:'09:30',timeUnknown:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'A'};
const dirs:string[]=[],stores:Store[]=[];
const file=(store:Store)=>path.join(store.userDir,'customers.sqlite');
const disk=(store:Store)=>fs.readFileSync(file(store));
const savedProfile=(store:Store)=>store.rows<BirthProfile>('profiles').find(row=>row.id===profile.id);
const epoch=(store:Store)=>(store as unknown as {profileEpoch:string}).profileEpoch;

async function setup(){
  const directory=fs.realpathSync.native(fs.mkdtempSync(path.join(parent,prefix)));dirs.push(directory);
  const store=await new Store(directory,dataDir,wasm).init();stores.push(store);
  store.saveProfile(profile);
  const backup=store.backupBytes();
  store.saveProfile({...profile,notes:'B'});
  expect(savedProfile(store)?.notes).toBe('B');
  return{store,directory,backup};
}

async function coldRead(directory:string){
  const reader=await new Store(directory,dataDir,wasm).init();stores.push(reader);
  return reader;
}

afterEach(()=>{
  for(const store of stores.splice(0))try{store.db.close();}catch(error){if(!/closed/i.test(String(error)))throw error;}
  for(const directory of dirs.splice(0)){
    const resolved=fs.realpathSync.native(directory),stat=fs.lstatSync(resolved);
    if(path.dirname(resolved)!==parent||!path.basename(resolved).startsWith(prefix)||!stat.isDirectory()||stat.isSymbolicLink())throw Error('Unsafe owned test directory');
    fs.rmSync(resolved,{recursive:true,force:false});
  }
});

describe('restore commit boundary on the real Store',()=>{
  it('keeps the restored profile active after previous.close fails once',async()=>{
    const {store,directory,backup}=await setup(),previous=store.db,beforeB=disk(store),beforeEpoch=epoch(store);
    const nativeClose=previous.close,marker='RESTORE_PREVIOUS_CLOSE_EIO';let hits=0,retiredCleanupError:unknown;
    previous.close=function(){
      if(store.db===previous||disk(store).equals(beforeB))throw Error('Previous close reached before restore install');
      hits++;
      const error=Object.assign(new Error(marker),{code:'EIO'});
      throw error;
    };
    let caught:unknown;
    try{store.restore(backup);}catch(error){caught=error;}
    finally{
      previous.close=nativeClose;
      if(hits)try{nativeClose.call(previous);}catch(error){retiredCleanupError=error;}
    }
    expect(hits).toBe(1);
    expect(retiredCleanupError).toBeUndefined();
    expect(previous.close).toBe(nativeClose);
    expect(caught).toBeInstanceOf(Error);
    expect(caught).toBeInstanceOf(CustomerStorageCommittedError);
    const committed=caught as CustomerStorageCommittedError;
    expect(committed).toMatchObject({code:'CUSTOMER_STORAGE_RESTORE_COMMITTED',committed:true,installed:true});
    expect(committed.operation).toBe('restore');
    expect(committed.message).toMatch(/已提交|未回滚/);
    expect(String((committed.cause as Error)?.message)).toContain(marker);
    expect(store.db).not.toBe(previous);
    expect(epoch(store)).not.toBe(beforeEpoch);
    expect(disk(store).equals(beforeB)).toBe(false);
    expect(savedProfile(store)?.notes).toBe('A');
    const reader=await coldRead(directory);
    expect(savedProfile(reader)?.notes).toBe('A');
    expect(disk(reader).equals(disk(store))).toBe(true);
  });

  it('keeps the old disk, connection and profile CAS when owned atomic rename fails before commit',async()=>{
    const {store,directory,backup}=await setup(),previous=store.db,beforeB=disk(store),beforeEpoch=epoch(store),beforeToken=store.profileWriteToken(profile.id);
    const nodeFs=createRequire(import.meta.url)('node:fs') as typeof import('node:fs');
    expect(nodeFs).toBe(fs);
    const nativeRename=nodeFs.renameSync,owned=path.resolve(file(store)).toLowerCase(),marker='RESTORE_ATOMIC_RENAME_EIO';let hits=0;
    (nodeFs as {renameSync:typeof nativeRename}).renameSync=function(this:typeof nodeFs,from,to){
      if(path.resolve(String(to)).toLowerCase()===owned){
        expect(store.db).toBe(previous);
        expect(disk(store).equals(beforeB)).toBe(true);
        hits++;
        throw Object.assign(new Error(marker),{code:'EIO'});
      }
      return Reflect.apply(nativeRename,this,[from,to]);
    };
    let caught:unknown;
    try{syncBuiltinESMExports();try{store.restore(backup);}catch(error){caught=error;}}
    finally{(nodeFs as {renameSync:typeof nativeRename}).renameSync=nativeRename;syncBuiltinESMExports();}
    expect(hits).toBe(1);
    expect(nodeFs.renameSync).toBe(nativeRename);
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toContain(marker);
    expect((caught as Error&{code?:string}).code).not.toBe('CUSTOMER_STORAGE_RESTORE_COMMITTED');
    expect(store.db).toBe(previous);
    expect(epoch(store)).toBe(beforeEpoch);
    expect(store.profileWriteToken(profile.id)).toBe(beforeToken);
    expect(disk(store).equals(beforeB)).toBe(true);
    expect(savedProfile(store)?.notes).toBe('B');
    const reader=await coldRead(directory);
    expect(savedProfile(reader)?.notes).toBe('B');
    expect(disk(reader).equals(beforeB)).toBe(true);
  });
});
