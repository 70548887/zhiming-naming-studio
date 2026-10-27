/** R2 genuine Store exit regressions only. No operation/capsule is supplied.
 * Root coverage, rather than FS ordinals, proves that the first child used owned
 * replay before the temporary SQL qualification change. No budget is raised. */
import {beforeAll,describe,expect,it} from 'vitest';
import {join,resolve} from 'node:path';
import {existsSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {NAMING_RULE_V71_VERSION} from '../src/shared/naming-rules';
import type {NamingSession,StudioSettings} from '../src/shared/types';
import {
  prepareGenuineSeed,withFixture,sourceFile,bytes,replaceOwned,differentBytes,
  captured,withNativeFs,stableTraceReads,readsOf,type GenuineFixture,
} from './helpers/m458-store-fixture';

const equalPath=(a:string,b:string)=>resolve(a).toLowerCase()===resolve(b).toLowerCase();
const call=Function.prototype.call,apply=Function.prototype.apply,bind=Function.prototype.bind;
const invoke=bind.call(call,apply) as unknown as (fn:Function,receiver:unknown,args:unknown[])=>unknown;
const sourceTarget=()=>sourceFile('naming-editorial-v7.json');
const parentMethod=()=>sourceFile('parent-name-phonetics-method-v1.json');

function requireError(result:{value?:unknown;error?:unknown}):void {
  expect(result.error).toBeInstanceOf(Error);
  expect(result.value).toBeUndefined();
}

/** These are ordinary new saves of the already genuine V71 facts, not new
 * producers or relabelled versions. The ordinary Store verifier must accept
 * each complete new row before any fault is armed; a failed save is not bypassed.
 * Explicit empty readings activate structural parent-source validation while
 * the absent comparison mode contributes no family method source or result. */
function saveParentBoundaryRows({store,service,current}:GenuineFixture):NamingSession[] {
  if(current.namingRules?.version!==NAMING_RULE_V71_VERSION)throw new Error('M458 R2 needs the genuine V71 seed');
  const profile=service.saveProfile({
    ...structuredClone(current.profile),id:randomUUID(),customerName:'M458 R2 explicit empty parent input',
    fatherName:'',motherName:'',parentNameReadings:[],
  });
  expect(Object.hasOwn(profile,'parentNameReadings')).toBe(true);
  expect(profile.parentNameReadings).toEqual([]);
  expect(current.preferences.parentNamePhonetics??'none').toBe('none');
  const saved:NamingSession[]=[];
  for(let index=0;index<2;index++){
    const next=structuredClone(current);
    next.id=randomUUID();next.profileId=profile.id;next.profile=structuredClone(profile);
    delete next.factVerification;delete next.reviewRevision;delete next.reviewToken;
    const stored=store.saveSession(next),verified=store.readVerifiedSession(stored.id);
    expect(verified).toBeDefined();
    if(!verified)throw new Error('M458 R2 ordinary newly saved row did not read back');
    expect(verified.namingRules?.version).toBe(NAMING_RULE_V71_VERSION);
    expect(verified.factVerification?.status).toMatch(/^verified-(builtin|archive)$/);
    expect(verified.candidates).toEqual(current.candidates);
    expect(verified.sourceSnapshot).toEqual(current.sourceSnapshot);
    expect(verified.profile.parentNameReadings).toEqual([]);
    saved.push(verified);
  }
  const rows=store.readVerifiedSessionsForProfile(profile.id);
  expect(rows).toEqual([...saved].reverse());
  return rows;
}

beforeAll(prepareGenuineSeed);

describe('M458 R2 successful cleanup and observed qualification loss',()=>{
  it('rejects backup after real successful lock unlink changes a fixed source without a callback error',async()=>{
    await withFixture(({store,userDir})=>{
      const file=join(userDir,'customers.sqlite'),lock=join(userDir,'customers.write-lock');
      const diskBefore=bytes(file),source=sourceTarget(),original=bytes(source),changed=differentBytes(original);
      let observed=false,lockGone=false,mutationCompleted=false,callbackReturned=false,callbackError:unknown;
      let failed:{value?:unknown;error?:unknown}={};
      try{
        failed=withNativeFs({afterUnlink:path=>{
          if(observed||!equalPath(path,lock))return;
          observed=true;lockGone=!existsSync(lock);
          try{
            replaceOwned(source,changed);
            mutationCompleted=bytes(source).equals(changed);
            callbackReturned=true;
          }catch(error){callbackError=error;throw error;}
        }},()=>captured(()=>store.backupBytes()));
      }finally{replaceOwned(source,original);}
      expect(observed).toBe(true);expect(lockGone).toBe(true);
      expect(mutationCompleted).toBe(true);expect(callbackReturned).toBe(true);
      expect(callbackError).toBeUndefined();requireError(failed);
      expect((failed.error as Error).message).toBe('命名固定来源资料校验失败：原件摘要不一致：data/naming-editorial-v7.json');
      expect(existsSync(lock)).toBe(false);
      expect(bytes(source).equals(original)).toBe(true);
      expect(bytes(file).equals(diskBefore)).toBe(true);
      const recovered=store.backupBytes();
      expect(Buffer.from(recovered).equals(bytes(file))).toBe(true);
    });
  });

  it('rejects outer backup after real successful lock unlink completes an independent public settings read',async()=>{
    await withFixture(({store,userDir})=>{
      const file=join(userDir,'customers.sqlite'),lock=join(userDir,'customers.write-lock');
      const diskBefore=bytes(file),expectedSettings=store.settings();
      let observed=false,lockGone=false,callbackReturned=false,callbackError:unknown;
      let inner:StudioSettings|undefined,failed:{value?:unknown;error?:unknown}={};
      failed=withNativeFs({afterUnlink:path=>{
        if(observed||!equalPath(path,lock))return;
        observed=true;lockGone=!existsSync(lock);
        try{inner=store.settings();callbackReturned=true;}
        catch(error){callbackError=error;throw error;}
      }},()=>captured(()=>store.backupBytes()));
      expect(observed).toBe(true);expect(lockGone).toBe(true);
      expect(callbackReturned).toBe(true);expect(callbackError).toBeUndefined();
      expect(inner).toEqual(expectedSettings);expect(inner?.useAi).toBe(false);
      requireError(failed);
      expect((failed.error as Error).message).toBe('本次内部读取期间发生公开重入，认证快照已失效。');
      expect(existsSync(lock)).toBe(false);
      expect(bytes(file).equals(diskBefore)).toBe(true);
      const recovered=store.backupBytes();
      expect(Buffer.from(recovered).equals(bytes(file))).toBe(true);
    });
  });

  it('rejects an observed later profile qualification loss before a self-restoring legacy SQL wrapper can run',async()=>{
    await withFixture(fixture=>{
      const {store,userDir}=fixture,expected=saveParentBoundaryRows(fixture);
      const profileId=expected[0].profileId,file=join(userDir,'customers.sqlite'),diskBefore=bytes(file);
      const clean=stableTraceReads(()=>store.readVerifiedSessionsForProfile(profileId));
      expect(clean.value).toEqual(expected);
      // Two actual method reads per child: lazy activation and boundary finally.
      // The source location after the first child's origin stamp is separately
      // proved by root coverage; this observed ordinal is not an authority flag.
      expect(readsOf(clean.paths,parentMethod())).toBe(4);
      const database=store.db,ownExec=Object.getOwnPropertyDescriptor(database,'exec'),originalExec=database.exec;
      let installed=false,callbackReturned=false,callbackError:unknown,wrapperCalls=0,nativeForwardCompleted=false;
      const restoreExec=()=>{
        if(ownExec)Object.defineProperty(database,'exec',ownExec);
        else if(!Reflect.deleteProperty(database,'exec'))throw new Error('M458 R2 could not restore the database exec slot');
      };
      const replacement=function(this:unknown,...args:unknown[]){
        wrapperCalls++;restoreExec();
        const result=invoke(originalExec,this,args);
        nativeForwardCompleted=true;return result;
      };
      let failed:{value?:unknown;error?:unknown}={};
      try{
        failed=withNativeFs({afterRead:(path,_value,ordinal)=>{
          if(installed||!equalPath(path,parentMethod())||ordinal!==2)return;
          try{
            Object.defineProperty(database,'exec',{configurable:true,writable:true,value:replacement});
            installed=Object.getOwnPropertyDescriptor(database,'exec')?.value===replacement;
            callbackReturned=true;
          }catch(error){callbackError=error;throw error;}
        }},()=>captured(()=>store.readVerifiedSessionsForProfile(profileId)));
      }finally{restoreExec();}
      expect(installed).toBe(true);expect(callbackReturned).toBe(true);expect(callbackError).toBeUndefined();
      requireError(failed);
      // R2 checks the already-stamped SQL origin before entering its legacy branch.
      expect((failed.error as Error).message).toBe('内部读取封口时当前客户库身份已变化。');
      expect(wrapperCalls).toBe(0);expect(nativeForwardCompleted).toBe(false);
      expect(Object.getOwnPropertyDescriptor(database,'exec')).toEqual(ownExec);
      expect(bytes(file).equals(diskBefore)).toBe(true);
      expect(store.readVerifiedSessionsForProfile(profileId)).toEqual(expected);
    });
  });
});
