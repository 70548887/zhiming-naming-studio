/** Genuine synchronous Store boundaries. No operation/capsule/fast flag is
 * supplied; source faults are scoped to the root's complete E-owned data copy.
 * Semantic-loader/batch counts are proved by root coverage, not FS counts. */
import {beforeAll,describe,expect,it} from 'vitest';
import {join,resolve,basename} from 'node:path';
import {readFileSync,existsSync} from 'node:fs';
import {readLiveCitationReadingDependenciesV6} from '../src/domain/naming-semantics-v6';
import {NAMING_EDITORIAL_V71_PINS} from '../src/main/naming-editorial-v7-data';
import {NAMING_RULE_V7_VERSION,NAMING_RULE_V71_VERSION} from '../src/shared/naming-rules';
import type {NamingSession} from '../src/shared/types';
import {
  prepareGenuineSeed,withFixture,sourceFile,bytes,replaceOwned,deleteOwned,differentBytes,
  captured,withNativeFs,traceReads,stableTraceReads,readsOf,genuineSeedBytes,
} from './helpers/m458-store-fixture';

const target=()=>sourceFile('naming-editorial-v7.json');
const equalPath=(a:string,b:string)=>resolve(a).toLowerCase()===resolve(b).toLowerCase();
const nativeSet=Object.getOwnPropertyDescriptor(Map.prototype,'set')!.value as Function;
const call=Function.prototype.call,apply=Function.prototype.apply,bind=Function.prototype.bind;
const invoke=bind.call(call,apply) as unknown as (fn:Function,receiver:unknown,args:unknown[])=>unknown;
function errorOf(result:{error?:unknown}):Error {
  expect(result.error).toBeInstanceOf(Error);return result.error as Error;
}
function observedSourceFault<T>(file:string,ordinal:number,body:()=>T):{value?:T;error?:unknown;observed:boolean} {
  const original=bytes(file),bad=differentBytes(original);let changed=false,observed=false;
  let result:{value?:T;error?:unknown}={};
  try{
    result=withNativeFs({
      beforeRead:(path,count)=>{if(equalPath(path,file)&&count===ordinal){replaceOwned(file,bad);changed=true;}},
      afterRead:(path,value,count)=>{
        if(equalPath(path,file)&&count===ordinal){
          const actual=typeof value==='string'?Buffer.from(value,'utf8'):Buffer.from(value as Uint8Array);
          observed=actual.equals(bad);replaceOwned(file,original);changed=false;
        }
      },
    },()=>captured(body));
  }finally{if(changed)replaceOwned(file,original);}
  expect(bytes(file).equals(original)).toBe(true);
  return{...result,observed};
}
function lockFileHashes(value:unknown):Record<string,string> {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('M458 lock must be a JSON record');
  const sources=(value as {sources?:unknown}).sources;
  if(!Array.isArray(sources)||sources.length!==1||!sources[0]||typeof sources[0]!=='object'||Array.isArray(sources[0]))throw new Error('M458 lock must have its actual single source record');
  const hashes=(sources[0] as {fileHashes?:unknown}).fileHashes;
  if(!hashes||typeof hashes!=='object'||Array.isArray(hashes))throw new Error('M458 lock source fileHashes is missing');
  for(const [file,hash]of Object.entries(hashes))if(!file||typeof hash!=='string'||!/^[a-f0-9]{64}$/.test(hash))throw new Error('M458 lock file hash entry is invalid');
  return hashes as Record<string,string>;
}
function closureTarget(kind:'v4-lock'|'v5-lock'|'v6-only'):string {
  if(kind==='v4-lock')return sourceFile('naming-editorial-readings-source-lock.json');
  if(kind==='v5-lock')return sourceFile('naming-editorial-names-v5-source-lock.json');
  const v7=lockFileHashes(JSON.parse(readFileSync(sourceFile('naming-editorial-meanings-v7-source-lock.json'),'utf8')));
  const v6=lockFileHashes(JSON.parse(readFileSync(sourceFile('naming-editorial-dictionary-v6-source-lock.json'),'utf8')));
  const selected=Object.keys(v6).find(file=>file.startsWith('data/')&&!(file in v7)&&!file.endsWith('lock.json'));
  if(!selected)throw new Error('M458 actual V6 lock must contain an input outside the V7 twenty-file receipt');
  return sourceFile(selected.slice('data/'.length));
}
beforeAll(prepareGenuineSeed);

describe('M458 genuine public Store operation boundaries',()=>{
  it('keeps complete current/history rows and handles a V7 to V71 transition inside one public rows traversal',async()=>{
    await withFixture(({store,current,legacy,history})=>{
      const traced=traceReads(()=>store.rows<NamingSession>('sessions'));
      expect(traced.value).toEqual([legacy,current]);
      expect(traced.value.map(row=>row.namingRules?.version)).toEqual([NAMING_RULE_V7_VERSION,NAMING_RULE_V71_VERSION]);
      expect(readsOf(traced.paths,target())).toBeGreaterThan(1);
      const profileFile=sourceFile(NAMING_EDITORIAL_V71_PINS.profile.file.replace(/^data\//,''));
      expect(readsOf(traced.paths,profileFile)).toBeGreaterThan(0);
      expect(store.readVerifiedSession(current.id)).toEqual(current);
      expect(store.listRevisions(legacy.id)).toEqual(history);
      // Root precise coverage must show first-auth reuse plus fresh actual/live
      // and candidate checks; repeated reads alone are not semantic-hit proof.
    });
  });

  it('preserves profile/meaning public reads, light empty reads, settings, and full native backup bytes',async()=>{
    await withFixture(({store,current})=>{
      expect(store.readVerifiedSessionsForProfile(current.profileId)).toEqual([current]);
      expect(store.meaningContextSession(current.id)).toEqual(current);
      const light=traceReads(()=>{
        expect(store.readVerifiedSession('m458-known-missing-id')).toBeUndefined();
        expect(store.rows('profiles').length).toBe(2);
        expect(store.settings().useAi).toBe(false);
      });
      expect(readsOf(light.paths,target())).toBe(0);
      const backup=store.backupBytes();
      expect(Buffer.from(backup).equals(bytes(join(store.userDir,'customers.sqlite')))).toBe(true);
    });
  });

  it('authenticates separate public calls independently and retires a deleted-source failure before a clean next call',async()=>{
    await withFixture(({store,current})=>{
      expect(store.readVerifiedSession(current.id)).toEqual(current);
      const file=target(),original=bytes(file);
      try{deleteOwned(file);errorOf(captured(()=>store.readVerifiedSession(current.id)));}
      finally{replaceOwned(file,original);}
      const next=traceReads(()=>store.readVerifiedSession(current.id));
      expect(next.value).toEqual(current);expect(readsOf(next.paths,file)).toBeGreaterThan(0);
    });
  });

  it('rejects late observed persistent and temporary source changes even after identical bytes are restored',async()=>{
    await withFixture(({store,current,legacy})=>{
      const clean=stableTraceReads(()=>store.rows<NamingSession>('sessions'));
      expect(clean.value).toEqual([legacy,current]);
      const count=readsOf(clean.paths,target());expect(count).toBeGreaterThan(2);
      // Select a late actual native sample from a clean trace. Root precise
      // coverage distinguishes a batch hash from a final seal; ordinal alone cannot.
      const file=target(),original=bytes(file),bad=differentBytes(original);
      let changed=false,persistentObserved=false,persistent:{value?:unknown;error?:unknown}={};
      try{
        persistent=withNativeFs({afterRead:(path,value,ordinal)=>{
          if(!equalPath(path,file))return;
          if(!changed&&ordinal===count-1){replaceOwned(file,bad);changed=true;return;}
          if(changed&&ordinal>count-1){
            const seen=typeof value==='string'?Buffer.from(value,'utf8'):Buffer.from(value as Uint8Array);
            if(seen.equals(bad))persistentObserved=true;
          }
        }},()=>captured(()=>store.rows('sessions')));
      }finally{if(changed)replaceOwned(file,original);}
      expect(changed).toBe(true);expect(persistentObserved).toBe(true);errorOf(persistent);
      expect(persistent.value).toBeUndefined();expect(bytes(file).equals(original)).toBe(true);
      const failed=observedSourceFault(file,count-1,()=>store.rows('sessions'));
      expect(failed.observed).toBe(true);errorOf(failed);expect(failed.value).toBeUndefined();
      expect(store.rows('sessions')).toEqual([legacy,current]);
    });
  });

  it('does not borrow a base V7 receipt for the first V71 publication authentication',async()=>{
    await withFixture(({store,current,legacy})=>{
      const file=sourceFile(NAMING_EDITORIAL_V71_PINS.profile.file.replace(/^data\//,''));
      const clean=stableTraceReads(()=>store.rows<NamingSession>('sessions'));
      expect(clean.value).toEqual([legacy,current]);
      expect(readsOf(clean.paths,file)).toBeGreaterThan(0);
      const failed=observedSourceFault(file,1,()=>store.rows('sessions'));
      expect(failed.observed).toBe(true);errorOf(failed);expect(failed.value).toBeUndefined();
      expect(store.rows('sessions')).toEqual([legacy,current]);
    });
  });

  it.each(['v4-lock','v5-lock','v6-only'] as const)('hashes %s at successful exit rather than only the V7 twenty-file subset',async kind=>{
    await withFixture(({store,current})=>{
      const file=closureTarget(kind),clean=stableTraceReads(()=>store.readVerifiedSession(current.id));
      expect(clean.value).toEqual(current);
      const count=readsOf(clean.paths,file);expect(count).toBeGreaterThan(1);
      const failed=observedSourceFault(file,count,()=>store.readVerifiedSession(current.id));
      expect(failed.observed).toBe(true);errorOf(failed);expect(failed.value).toBeUndefined();
    });
  });

  it('creates independent same-instance and other-instance reentrant reads and invalidates the active outer read',async()=>{
    await withFixture(async outer=>{
      await withFixture(inner=>{
        for(const selected of [outer.store,inner.store]){
          const clean=stableTraceReads(()=>outer.store.readVerifiedSession(outer.current.id));
          expect(clean.value).toEqual(outer.current);
          const late=readsOf(clean.paths,target());expect(late).toBeGreaterThan(1);
          let armed=true,innerResult:{value?:NamingSession;error?:unknown}|undefined;
          const failed=withNativeFs({afterRead:(file,_value,ordinal)=>{
            if(armed&&equalPath(file,target())&&ordinal===late){armed=false;innerResult=captured(()=>selected.readVerifiedSession(outer.current.id));}
          }},()=>captured(()=>outer.store.readVerifiedSession(outer.current.id)));
          expect(armed).toBe(false);expect(innerResult?.error).toBeUndefined();
          expect(innerResult?.value).toEqual(outer.current);
          errorOf(failed);expect(failed.value).toBeUndefined();
        }
        expect(outer.store.readVerifiedSession(outer.current.id)).toEqual(outer.current);
      });
    });
  });

  it('detects a late same-size live Map value change instead of returning mixed rows',async()=>{
    await withFixture(({store,current,legacy})=>{
      const clean=stableTraceReads(()=>store.rows<NamingSession>('sessions'));
      expect(clean.value).toEqual([legacy,current]);
      const count=readsOf(clean.paths,target());expect(count).toBeGreaterThan(2);
      const map=readLiveCitationReadingDependenciesV6().overrides,first=map.entries().next().value;
      if(!first)throw new Error('M458 requires a real live override');
      const [key,original]=first,initialSize=map.size,replacement={...structuredClone(original),warning:original.warning+' M458 changed live binding'};
      let changed=false,observed=false;
      let failed:{value?:unknown;error?:unknown}={};
      try{
        failed=withNativeFs({afterRead:(file,_value,ordinal)=>{
          if(!changed&&equalPath(file,target())&&ordinal===count-1){invoke(nativeSet,map,[key,replacement]);changed=true;observed=map.size===initialSize&&map.get(key)===replacement;}
        }},()=>captured(()=>store.rows('sessions')));
      }finally{invoke(nativeSet,map,[key,original]);}
      expect(changed).toBe(true);expect(observed).toBe(true);errorOf(failed);expect(failed.value).toBeUndefined();
      expect(map.size).toBe(initialSize);expect(map.get(key)).toBe(original);
      expect(store.rows('sessions')).toEqual([legacy,current]);
    });
  });

  it('checks integrity after the final source callback before releasing a result',async()=>{
    await withFixture(({store,current})=>{
      const clean=stableTraceReads(()=>store.readVerifiedSession(current.id));
      expect(clean.value).toEqual(current);
      const count=readsOf(clean.paths,target());expect(count).toBeGreaterThan(1);
      const original=Object.getOwnPropertyDescriptor(Array.prototype,'push');
      if(!original||!('value'in original))throw new Error('M458 requires restorable push');
      const replacement=function(this:unknown,...args:unknown[]){return invoke(original.value,this,args);};
      let changed=false,failed:{value?:unknown;error?:unknown}={};
      try{
        failed=withNativeFs({afterRead:(file,_value,ordinal)=>{
          if(!changed&&equalPath(file,target())&&ordinal===count){Object.defineProperty(Array.prototype,'push',{...original,value:replacement});changed=true;}
        }},()=>captured(()=>store.readVerifiedSession(current.id)));
      }finally{Object.defineProperty(Array.prototype,'push',original);}
      expect(changed).toBe(true);errorOf(failed);expect(failed.value).toBeUndefined();
      expect(store.readVerifiedSession(current.id)).toEqual(current);
    });
  });

  it('keeps an actual export body error and rejects thenables without extending an operation lifetime',async()=>{
    await withFixture(({store,userDir})=>{
      const database=store.db,originalExport=Object.getOwnPropertyDescriptor(database,'export'),normalExport=database.export;
      const restoreExport=()=>{
        if(originalExport)Object.defineProperty(database,'export',originalExport);
        else if(!Reflect.deleteProperty(database,'export'))throw new Error('M458 could not restore this database export descriptor');
      };
      const primary=new Error('M458 actual export completed then body failed'),file=target();
      let exported=false,readsAfterPrimary=0,failed:{value?:unknown;error?:unknown}={};
      try{
        Object.defineProperty(database,'export',{configurable:true,writable:true,value:()=>{
          invoke(normalExport,database,[]);exported=true;throw primary;
        }});
        failed=withNativeFs({afterRead:path=>{if(exported&&equalPath(path,file))readsAfterPrimary++;}},()=>captured(()=>store.backupBytes()));
      }finally{restoreExport();}
      expect(exported).toBe(true);expect(failed.error).toBe(primary);expect(readsAfterPrimary).toBe(0);
      expect(Object.getOwnPropertyDescriptor(database,'export')).toEqual(originalExport);

      const thenable={};let thenGetterCalls=0,exportCalls=0,returned=false,thenableError:unknown;
      Object.defineProperty(thenable,'then',{configurable:true,enumerable:true,get(){thenGetterCalls++;throw new Error('M458 then getter must not run');}});
      try{
        Object.defineProperty(database,'export',{configurable:true,writable:true,value:()=>{
          invoke(normalExport,database,[]);exportCalls++;return thenable;
        }});
        try{store.backupBytes();returned=true;}catch(error){thenableError=error;}
      }finally{restoreExport();}
      expect(exportCalls).toBe(1);expect(returned).toBe(false);expect(thenableError).toBeInstanceOf(Error);
      expect(thenGetterCalls).toBe(0);expect(Object.getOwnPropertyDescriptor(database,'export')).toEqual(originalExport);
      const recovered=traceReads(()=>store.backupBytes());
      expect(Buffer.from(recovered.value).equals(bytes(join(userDir,'customers.sqlite')))).toBe(true);
      expect(readsOf(recovered.paths,file)).toBeGreaterThan(0);
    });
  });

  it('rehashes actual SQL archive bytes and retains original row identity and review CAS checks',async()=>{
    await withFixture(({store,service,current})=>{
      const row=store.db.exec('SELECT sha256,pack FROM knowledge_archives LIMIT 1')[0]?.values[0];
      if(!row)throw new Error('M458 genuine archive row missing');
      const hash=String(row[0]),pack=Buffer.from(row[1] as Uint8Array),bad=differentBytes(pack);
      const disk=bytes(join(store.userDir,'customers.sqlite'));
      try{
        store.db.run('UPDATE knowledge_archives SET pack=? WHERE sha256=?',[bad,hash]);
        errorOf(captured(()=>store.readVerifiedSession(current.id)));
      }finally{store.db.run('UPDATE knowledge_archives SET pack=? WHERE sha256=?',[pack,hash]);}
      expect(bytes(join(store.userDir,'customers.sqlite')).equals(disk)).toBe(true);
      const original=String(store.db.exec('SELECT json FROM sessions WHERE id=?',[current.id])[0].values[0][0]);
      try{
        const wrong={...JSON.parse(original),id:'m458-other-row-id'};
        store.db.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(wrong),current.id]);
        errorOf(captured(()=>store.readVerifiedSession(current.id)));
      }finally{store.db.run('UPDATE sessions SET json=? WHERE id=?',[original,current.id]);}
      const reviewed=service.saveSession({...structuredClone(current),reviewNote:'M458 legitimate competing review'});
      const after=bytes(join(store.userDir,'customers.sqlite'));
      errorOf(captured(()=>service.saveSession({...structuredClone(current),reviewNote:'M458 stale review'})));
      expect(bytes(join(store.userDir,'customers.sqlite')).equals(after)).toBe(true);
      expect(store.readVerifiedSession(current.id)?.reviewToken).toBe(reviewed.reviewToken);
    });
  });

  it('seals restore under the writer lock after copy/export and before any atomic replacement',async()=>{
    await withFixture(({store,service,current,userDir})=>{
      service.saveSession({...structuredClone(current),reviewNote:'M458 destination before restore'});
      const file=join(userDir,'customers.sqlite'),before=bytes(file),primary=new Error('M458 restore precommit source seal');
      let copied=false,underLock=false,sourceObserved=false,atomicRenames=0;
      const failed=withNativeFs({
        afterCopy:(from,to)=>{if(equalPath(from,file)&&basename(to)==='customers.before-restore.sqlite'){copied=true;underLock=existsSync(join(userDir,'customers.write-lock'));}},
        afterRead:path=>{if(copied&&!sourceObserved&&equalPath(path,target())){sourceObserved=true;throw primary;}},
        afterRename:(_from,to)=>{if(equalPath(to,file))atomicRenames++;},
      },()=>captured(()=>store.restore(genuineSeedBytes())));
      expect(copied).toBe(true);expect(underLock).toBe(true);expect(sourceObserved).toBe(true);expect(failed.error).toBe(primary);
      expect(atomicRenames).toBe(0);expect(bytes(file).equals(before)).toBe(true);
      expect(store.readVerifiedSession(current.id)?.reviewNote).toBe('M458 destination before restore');
      store.restore(genuineSeedBytes());
      expect(store.readVerifiedSession(current.id)?.reviewNote).toBe(current.reviewNote);
    });
  });

  it('preserves an actually committed restore when native lock cleanup fails after real unlink',async()=>{
    await withFixture(({store,service,current,userDir})=>{
      service.saveSession({...structuredClone(current),reviewNote:'M458 destination committed cleanup'});
      const file=join(userDir,'customers.sqlite'),before=bytes(file),lock=join(userDir,'customers.write-lock');
      const secondary=new Error('M458 real unlink then cleanup failure');let cleanupObserved=false,lateNamingReads=0;
      const failed=withNativeFs({
        afterRead:path=>{if(cleanupObserved&&equalPath(path,target()))lateNamingReads++;},
        afterUnlink:path=>{if(!cleanupObserved&&equalPath(path,lock)){cleanupObserved=true;throw secondary;}},
      },()=>captured(()=>store.restore(genuineSeedBytes())));
      expect(cleanupObserved).toBe(true);expect(lateNamingReads).toBe(0);errorOf(failed);
      expect((failed.error as {code?:string}).code).toBe('CUSTOMER_STORAGE_RESTORE_COMMITTED');
      expect(bytes(file).equals(before)).toBe(false);
      expect(store.readVerifiedSession(current.id)?.reviewNote).toBe(current.reviewNote);
      expect(Buffer.from(store.backupBytes()).equals(bytes(file))).toBe(true);
    });
  });
});
