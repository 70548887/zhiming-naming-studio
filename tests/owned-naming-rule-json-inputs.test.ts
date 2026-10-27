import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire,syncBuiltinESMExports} from 'node:module';
import {createHash} from 'node:crypto';
import {loadNamingEditorialV7Data,loadOwnedNamingRuleJsonInputs} from '../src/main/naming-editorial-v7-data';
import type {OwnedNamingRuleJsonInputs} from '../src/shared/candidate-facts';

// Validate the actual fixed publication using unchanged expected digests.
// Negative cases change returned Buffers; source files remain unchanged.
const directory=path.resolve('data');
const nodeFs=createRequire(import.meta.url)('node:fs') as typeof import('node:fs');
const nativeRead=nodeFs.readFileSync;
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const normalize=(file:string)=>path.resolve(file).toLowerCase();
const targets=[
  {field:'baseJson',file:'naming-editorial.json',sha:'97c3162238c9493174544580a338fb0852d2784fbeac712fbd8e234f99945195'},
  {field:'v5Json',file:'naming-editorial-v5.json',sha:'bb8d3d255b42a6b67932988e13ceb2d7a7a1c6ef8fbbcc65312b9a50b5519da8'},
  {field:'v6Json',file:'naming-editorial-v6.json',sha:'35de5f749f438e849543e5fde6e405b89ba01cba20597e82e7c4f518dd4363ab'},
  {field:'v7Json',file:'naming-editorial-v7.json',sha:'392fa47441a0c410b0903c3e85853081225a1a5e9f540b5467e4ea4e2151cc48'},
] as const;
const targetPath=(file:string)=>normalize(path.join(directory,file));
const sourceLock=JSON.parse(nativeRead(path.join(directory,'naming-editorial-meanings-v7-source-lock.json'),'utf8')) as {sources:Array<{files:string[]}>};
const ownedPaths=new Set([...sourceLock.sources[0].files.map(file=>targetPath(file.slice(5))),targetPath('naming-editorial-meanings-v7-source-lock.json')]);

type ReadEvent={file:string;ordinal:number;bytes:Buffer};
type ReadPatch=(event:ReadEvent)=>Buffer|undefined;
/** Real source files remain untouched. Only reads of the exact fixed source
 * paths are observed/patched; unrelated I/O and every unmodified read use the
 * original native implementation with unchanged arguments and values. */
function withReads<T>(action:()=>T,patch?:ReadPatch):{value:T;reads:string[];counts:Map<string,number>} {
  expect(nodeFs).toBe(fs);
  const previousRead=nodeFs.readFileSync,reads:string[]=[],counts=new Map<string,number>();
  const wrapped=((...args:unknown[])=>{
    const value=Reflect.apply(previousRead,nodeFs,args);
    if(typeof args[0]!=='string')return value;
    const file=normalize(args[0]);if(!ownedPaths.has(file))return value;
    if(!Buffer.isBuffer(value))throw new Error('Owned publication reads must supply the original byte buffer');
    const ordinal=(counts.get(file)??0)+1;counts.set(file,ordinal);reads.push(file);
    const changed=patch?.({file,ordinal,bytes:value});return changed===undefined?value:changed;
  }) as typeof nativeRead;
  try{nodeFs.readFileSync=wrapped;syncBuiltinESMExports();return{value:action(),reads,counts};}
  finally{nodeFs.readFileSync=previousRead;syncBuiltinESMExports();expect(nodeFs.readFileSync).toBe(previousRead);}
}
function authenticTrace(){
  // The actual original loader executes all source authentication. No mocked
  // success return, public source hash rewrite or compiled publication change.
  return withReads(()=>loadNamingEditorialV7Data(directory));
}
function appendedSpace(bytes:Buffer):Buffer{return Buffer.concat([bytes,Buffer.from(' ')]);}

describe('owned naming rule JSON inputs from authentic publication bytes',()=>{
  it('returns the exact four original UTF-8 strings in a frozen plain record with no verdict fields',()=>{
    const original=targets.map(target=>({target,bytes:nativeRead(path.join(directory,target.file))}));
    const result:OwnedNamingRuleJsonInputs=loadOwnedNamingRuleJsonInputs(directory);
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(Reflect.ownKeys(result).sort()).toEqual(targets.map(target=>target.field).sort());
    expect(Object.isFrozen(result)).toBe(true);
    for(const {target,bytes}of original){
      const descriptor=Object.getOwnPropertyDescriptor(result,target.field);
      expect(descriptor).toBeDefined();expect(descriptor?.enumerable).toBe(true);
      expect(Object.hasOwn(descriptor!,'value')).toBe(true);expect(typeof result[target.field]).toBe('string');
      expect(sha(bytes)).toBe(target.sha);
      expect(Buffer.from(result[target.field],'utf8').equals(bytes)).toBe(true);
      expect(result[target.field]).toBe(bytes.toString('utf8'));
    }
  });

  it.each(targets)('rejects authentic-publication tampering in $field without changing any expected source hash',target=>{
    let injections=0;
    withReads(()=>{
      expect(()=>loadOwnedNamingRuleJsonInputs(directory)).toThrow();
    },event=>{
      if(event.file!==targetPath(target.file))return undefined;
      injections++;return appendedSpace(event.bytes);
    });
    expect(injections>0).toBe(true);
  });

  it('performs the original full-publication read prefix before the four leaf rereads',()=>{
    const baseline=authenticTrace(),actual=withReads(()=>loadOwnedNamingRuleJsonInputs(directory));
    expect(baseline.value.sources).toHaveLength(1);
    expect(actual.reads.slice(0,baseline.reads.length)).toEqual(baseline.reads);
    expect(actual.reads.slice(baseline.reads.length).sort()).toEqual(targets.map(target=>targetPath(target.file)).sort());
    expect(actual.reads).toHaveLength(baseline.reads.length+4);
    // The trace establishes read ordering. Final CPU-only validation completion
    // additionally requires source review of the direct full-loader call.
  });

  it('rejects a v6 buffer changed only after the real complete authentication read sequence',()=>{
    const baseline=authenticTrace(),file=targetPath('naming-editorial-v6.json');
    const originalReads=baseline.counts.get(file);
    if(originalReads===undefined)throw new Error('Original full loader did not authenticate the v6 source');
    let injected=false;
    withReads(()=>{
      expect(()=>loadOwnedNamingRuleJsonInputs(directory)).toThrow();
    },event=>{
      if(event.file!==file||event.ordinal<=originalReads)return undefined;
      injected=true;return appendedSpace(event.bytes);
    });
    expect(injected).toBe(true);
  });

  it('hashes the returned v7 leaf buffer and does not substitute a third clean reread for it',()=>{
    const baseline=authenticTrace(),file=targetPath('naming-editorial-v7.json');
    const originalReads=baseline.counts.get(file);
    if(originalReads===undefined)throw new Error('Original full loader did not authenticate the v7 source');
    let leafReads=0;
    withReads(()=>{
      expect(()=>loadOwnedNamingRuleJsonInputs(directory)).toThrow();
    },event=>{
      if(event.file!==file||event.ordinal<=originalReads)return undefined;
      leafReads++;
      // A vulnerable later reread would see clean original bytes. The first
      // leaf-returned buffer itself must fail its fixed original SHA check.
      return leafReads===1?appendedSpace(event.bytes):event.bytes;
    });
    expect(leafReads).toBe(1);
  });
});
// Scope: byte provenance/shape only. No authority, acceptance verdict, producer,
// SQL, Store, candidate evaluation or cross-call cache is established here.
