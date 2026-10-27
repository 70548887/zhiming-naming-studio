/** Genuine public Store regressions for the R4 publication receipt.
 * Root supplies a complete mutable E-owned copy and owns all execution.
 * FS counts identify real fault locations; they do not prove internal receipt
 * admission, batch ownership, hashing, memo hits, or final-seal coverage. */
import {beforeAll,describe,expect,it} from 'vitest';
import {existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import type {NamingSession} from '../src/shared/types';
import receipt from './fixtures/m480-publication-receipt-inputs-r4-present60.json';
import {
  prepareGenuineSeed,withFixture,sourceFile,bytes,replaceOwned,deleteOwned,
  differentBytes,captured,withNativeFs,traceReads,readsOf,
} from './helpers/m458-store-fixture';

const equalPath=(left:string,right:string)=>resolve(left).toLowerCase()===resolve(right).toLowerCase();
const digest=(value:Uint8Array)=>createHash('sha256').update(value).digest('hex');
const source=(file:string)=>{
  if(!file.startsWith('data/'))throw Error('M480 requires an exact data-relative publication row');
  return sourceFile(file.slice(5));
};
const v7=()=>source('data/naming-editorial-v7.json');
const rootDecision=()=>source(receipt.optionalBundle.find(row=>row.role==='decision')!.file);
function rejected(result:{value?:unknown;error?:unknown}):void {
  expect(result.error).toBeInstanceOf(Error);expect(result.value).toBeUndefined();
}
function assertNew60(session:NamingSession):void {
  expect(session.namingRules?.version).toBe('naming-editorial-7.1.0');
  expect(session.candidates.length).toBeGreaterThan(0);
  for(const candidate of session.candidates){
    expect(candidate.namingMeaningReview?.version).toBe('naming-editorial-7.1.0');
    expect(candidate.namingMeaningReview?.sourceSha256).toBe(receipt.publicationSourceSha256);
  }
}
/** Retain exact real bytes, never regenerate or relabel publication authority. */
function bundle():Array<{file:string;original:Buffer}> {
  return receipt.optionalBundle.map(row=>{
    const file=source(row.file),original=bytes(file);
    if(digest(original)!==row.sha256)throw Error('M480 exact bundle source differs: '+row.file);
    return{file,original};
  });
}
function removeBundle(rows:ReturnType<typeof bundle>):void {
  for(const row of rows)deleteOwned(row.file);
}
function restoreBundle(rows:ReturnType<typeof bundle>):void {
  for(const row of rows)replaceOwned(row.file,row.original);
}
function assertBundleRestored(rows:ReturnType<typeof bundle>):void {
  for(const row of rows)expect(bytes(row.file).equals(row.original)).toBe(true);
}

beforeAll(prepareGenuineSeed);

describe('M480 R4 actual publication receipt and optional-presence boundaries',()=>{
  it('observes all present60 source files on the real new60 path and rejects a changed actual root approval after warm reads',async()=>{
    await withFixture(({store,current,userDir})=>{
      assertNew60(current);
      expect(store.readVerifiedSession(current.id)).toEqual(current);
      const clean=traceReads(()=>store.readVerifiedSession(current.id));
      expect(clean.value).toEqual(current);
      for(const row of receipt.presentOperation.files){
        const file=source(row.file);
        expect(digest(bytes(file))).toBe(row.sha256);
        // These counts describe actual FS reads, without assigning an internal phase.
        // Root coverage must establish the operation receipt and each source hash.
        expect(readsOf(clean.paths,file)).toBeGreaterThanOrEqual(2);
      }
      const database=join(userDir,'customers.sqlite'),before=bytes(database);
      const file=rootDecision(),original=bytes(file),changed=differentBytes(original);
      let observed=false,result:{value?:unknown;error?:unknown}={};
      try{
        replaceOwned(file,changed);observed=bytes(file).equals(changed);
        result=captured(()=>store.readVerifiedSession(current.id));
      }finally{replaceOwned(file,original);}
      expect(observed).toBe(true);rejected(result);
      expect(bytes(file).equals(original)).toBe(true);
      expect(bytes(database).equals(before)).toBe(true);
      expect(store.readVerifiedSession(current.id)).toEqual(current);
    });
  });

  it('rejects actual changed external-review bytes at their stable final observed source read and restores exact originals',async()=>{
    await withFixture(({store,current,userDir})=>{
      assertNew60(current);
      const file=source('data/m460-lexical/reviews/M412.json');
      // Warm the actual Store package cache before comparing two real traces.
      expect(store.readVerifiedSession(current.id)).toEqual(current);
      const first=traceReads(()=>store.readVerifiedSession(current.id));
      const second=traceReads(()=>store.readVerifiedSession(current.id));
      expect(first.value).toEqual(current);expect(second.value).toEqual(current);
      const ordinal=readsOf(second.paths,file);
      expect(ordinal).toBeGreaterThan(1);
      expect(readsOf(first.paths,file)).toBe(ordinal);
      const original=bytes(file),changed=differentBytes(original);
      const database=join(userDir,'customers.sqlite'),before=bytes(database);
      let armed=true,observed=false,changedOnDisk=false,result:{value?:unknown;error?:unknown}={};
      try{
        result=withNativeFs({
          beforeRead:(path,count)=>{
            if(armed&&equalPath(path,file)&&count===ordinal){
              armed=false;replaceOwned(file,changed);changedOnDisk=true;
            }
          },
          afterRead:(path,value,count)=>{
            if(equalPath(path,file)&&count===ordinal&&changedOnDisk){
              const actual=typeof value==='string'?Buffer.from(value,'utf8'):Buffer.from(value as Uint8Array);
              observed=actual.equals(changed);replaceOwned(file,original);changedOnDisk=false;
            }
          },
        },()=>captured(()=>store.readVerifiedSession(current.id)));
      }finally{if(changedOnDisk)replaceOwned(file,original);}
      expect(armed).toBe(false);expect(observed).toBe(true);rejected(result);
      expect(bytes(file).equals(original)).toBe(true);expect(bytes(database).equals(before)).toBe(true);
      expect(store.readVerifiedSession(current.id)).toEqual(current);
      // This ordinal is an actual FS seam. Root coverage must establish that it
      // was the operation's final receipt seal; the test supplies no authority.
    });
  });

  it('allows genuine V7 reads with all six optional files absent and rejects a saved new60 row in that state',async()=>{
    await withFixture(({store,current,legacy,userDir})=>{
      assertNew60(current);
      const rows=bundle(),database=join(userDir,'customers.sqlite'),before=bytes(database);
      let legacyResult:NamingSession|undefined,newResult:{value?:unknown;error?:unknown}={};
      try{
        removeBundle(rows);expect(rows.every(row=>!existsSync(row.file))).toBe(true);
        legacyResult=store.readVerifiedSession(legacy.id);
        newResult=captured(()=>store.readVerifiedSession(current.id));
      }finally{restoreBundle(rows);}
      expect(legacyResult).toEqual(legacy);rejected(newResult);assertBundleRestored(rows);
      expect(bytes(database).equals(before)).toBe(true);
      expect(store.readVerifiedSession(current.id)).toEqual(current);
    });
  });

  it('rejects a partial optional bundle before releasing even a genuine V7 result',async()=>{
    await withFixture(({store,legacy,userDir})=>{
      const rows=bundle(),database=join(userDir,'customers.sqlite'),before=bytes(database);
      let result:{value?:unknown;error?:unknown}={};
      try{
        deleteOwned(rows[0].file);
        expect(rows.filter(row=>existsSync(row.file))).toHaveLength(rows.length-1);
        result=captured(()=>store.readVerifiedSession(legacy.id));
      }finally{restoreBundle(rows);}
      rejected(result);assertBundleRestored(rows);expect(bytes(database).equals(before)).toBe(true);
      expect(store.readVerifiedSession(legacy.id)).toEqual(legacy);
    });
  });

  it.each(['present-to-absent','absent-to-present'] as const)('rejects a completed %s bundle transition inside one genuine V7 public read',async direction=>{
    await withFixture(({store,legacy,userDir})=>{
      const rows=bundle(),database=join(userDir,'customers.sqlite'),before=bytes(database);
      let switched=false,callbackReturned=false,transitionObserved=false;
      let result:{value?:unknown;error?:unknown}={};
      try{
        if(direction==='absent-to-present')removeBundle(rows);
        result=withNativeFs({afterRead:(path,_value,ordinal)=>{
          if(switched||!equalPath(path,v7())||ordinal!==1)return;
          switched=true;
          if(direction==='present-to-absent')removeBundle(rows);else restoreBundle(rows);
          transitionObserved=rows.every(row=>existsSync(row.file)===(direction==='absent-to-present'));
          callbackReturned=true;
        }},()=>captured(()=>store.readVerifiedSession(legacy.id)));
      }finally{restoreBundle(rows);}
      expect(switched).toBe(true);expect(transitionObserved).toBe(true);expect(callbackReturned).toBe(true);
      rejected(result);assertBundleRestored(rows);expect(bytes(database).equals(before)).toBe(true);
      expect(store.readVerifiedSession(legacy.id)).toEqual(legacy);
      // Root coverage must prove initial six-file capture precedes this actual
      // V7 loader read. The callback only changes real E-owned filesystem state.
    });
  });
});
