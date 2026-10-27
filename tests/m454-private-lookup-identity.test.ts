/** Pure diagnostic contracts only. This uses the published JSON as computation
 * input; it authenticates no source bytes, Store state or producer authority.
 * Existing suites/fixtures and product sources remain independent. */
import {describe,expect,it} from 'vitest';
import actualTable from '../data/naming-editorial-v7.json';
import {
  createNamingReviewLookup,readNamingReviewLookupInputJson,
  type SupplementalReviewTable,
} from '../src/domain/naming-review-v7.mjs';

const ownDescriptor=Object.getOwnPropertyDescriptor;
const defineOwn=Object.defineProperty;
const deleteOwn=Reflect.deleteProperty;
function cloneTable():SupplementalReviewTable {
  return structuredClone(actualTable) as unknown as SupplementalReviewTable;
}
function restoreOwn(target:object,key:PropertyKey,descriptor:PropertyDescriptor|undefined):void {
  if(descriptor)defineOwn(target,key,descriptor);
  else if(!deleteOwn(target,key))throw new Error('M454 diagnostic test could not restore an own property');
}
function capturedRead(lookup:unknown):{value:string|undefined;error?:unknown} {
  try{return{value:readNamingReviewLookupInputJson(lookup)};}
  catch(error){return{value:undefined,error};}
}

describe('M454 private lookup identity diagnostic',()=>{
  it('reports the actual closed copy and declines unknown or alias-unsafe lookups without reading them',()=>{
    const raw=cloneTable(),expected=JSON.stringify(raw),lookup=createNamingReviewLookup(raw);
    expect(readNamingReviewLookupInputJson(lookup)).toBe(expected);
    raw.nameRules[0].citation.text+=' caller mutation after construction';
    raw.meaningReviews[0].scope='caller changed the raw scope';
    raw.baselineCharacters[0].meaning+=' caller changed the raw character';
    expect(JSON.stringify(raw)).not.toBe(expected);
    expect(readNamingReviewLookupInputJson(lookup)).toBe(expected);

    let proxyTraps=0;
    const forbiddenTrap=()=>{proxyTraps++;throw new Error('M454 lookup identity must not inspect a proxy');};
    const wrappedLookup=new Proxy(lookup,{
      get:forbiddenTrap,getPrototypeOf:forbiddenTrap,ownKeys:forbiddenTrap,
      getOwnPropertyDescriptor:forbiddenTrap,has:forbiddenTrap,
    });
    expect(readNamingReviewLookupInputJson({})).toBeUndefined();
    expect(readNamingReviewLookupInputJson(wrappedLookup)).toBeUndefined();
    expect(proxyTraps).toBe(0);

    const unsafe=cloneTable(),pending=unsafe.meaningReviews.find(row=>row.status==='pending');
    expect(pending).toBeDefined();
    if(!pending)throw new Error('M454 actual table must retain a pending review');
    const rawScope={marker:'deliberately unsafe scope alias'};
    (pending as unknown as {scope:unknown}).scope=rawScope;
    const unsafeLookup=createNamingReviewLookup(unsafe);
    const entry=unsafe.baselineCharacters.find(row=>row.char===pending.char);
    expect(entry).toBeDefined();
    if(!entry)throw new Error('M454 pending review must have an actual baseline character');
    const applicability=unsafeLookup.applicability(entry,{
      packSha256:unsafe.base.knowledgePackSha256,
      activeVersion:unsafe.base.knowledgePackSha256.slice(0,12),
    });
    expect(applicability.status).toBe('pending');
    const privateScope=(applicability as unknown as {scope:object}).scope;
    expect(privateScope).toEqual(rawScope);
    expect(privateScope).not.toBe(rawScope);
    const original=ownDescriptor(privateScope,'toJSON');
    let aliasSerializationGets=0,result:{value:string|undefined;error?:unknown}|undefined;
    try{
      defineOwn(privateScope,'toJSON',{configurable:true,get(){
        aliasSerializationGets++;throw new Error('M454 unsafe private copy must not be serialized');
      }});
      result=capturedRead(unsafeLookup);
    }finally{restoreOwn(privateScope,'toJSON',original);}
    expect(ownDescriptor(privateScope,'toJSON')).toEqual(original);
    expect(result).toEqual({value:undefined});
    expect(aliasSerializationGets).toBe(0);
  });

  it('declines serializer hooks and keeps the registry private after method replacement, restoring every descriptor',()=>{
    const raw=cloneTable(),expected=JSON.stringify(raw),lookup=createNamingReviewLookup(raw);
    // Save all expected text before installing any serializer or registry hooks.
    const constructionRaw=cloneTable(),constructionExpected=JSON.stringify(constructionRaw);
    expect(readNamingReviewLookupInputJson(lookup)).toBe(expected);

    for(const prototype of [Object.prototype,Array.prototype]){
      const original=ownDescriptor(prototype,'toJSON');
      let gets=0,sets=0,result:{value:string|undefined;error?:unknown}|undefined;
      try{
        defineOwn(prototype,'toJSON',{configurable:true,get(){
          gets++;throw new Error('M454 inherited toJSON getter must not run');
        },set(_value:unknown){
          sets++;throw new Error('M454 inherited toJSON setter must not run');
        }});
        result=capturedRead(lookup);
      }finally{restoreOwn(prototype,'toJSON',original);}
      // Assertions run only after the global descriptor has been restored.
      expect(ownDescriptor(prototype,'toJSON')).toEqual(original);
      expect(result).toEqual({value:undefined});
      expect(gets).toBe(0);expect(sets).toBe(0);
    }

    const originalStringify=ownDescriptor(JSON,'stringify');
    let stringifyCalls=0,stringifyResult:{value:string|undefined;error?:unknown}|undefined;
    try{
      defineOwn(JSON,'stringify',{configurable:true,writable:true,value(..._args:unknown[]){
        stringifyCalls++;return 'm454-forged-serialization';
      }});
      stringifyResult=capturedRead(lookup);
    }finally{restoreOwn(JSON,'stringify',originalStringify);}
    expect(ownDescriptor(JSON,'stringify')).toEqual(originalStringify);
    expect(stringifyResult).toEqual({value:undefined});
    expect(stringifyCalls).toBe(0);

    const originalGet=ownDescriptor(WeakMap.prototype,'get');
    let getCalls=0,getReceiver:unknown,getResult:{value:string|undefined;error?:unknown}|undefined;
    try{
      defineOwn(WeakMap.prototype,'get',{configurable:true,writable:true,value(this:unknown,..._args:unknown[]){
        getCalls++;getReceiver=this;return()=> 'm454-forged-registry-read';
      }});
      getResult=capturedRead(lookup);
    }finally{restoreOwn(WeakMap.prototype,'get',originalGet);}
    expect(ownDescriptor(WeakMap.prototype,'get')).toEqual(originalGet);
    expect(getResult).toEqual({value:expected});
    expect(getCalls).toBe(0);expect(getReceiver).toBeUndefined();

    const originalSet=ownDescriptor(WeakMap.prototype,'set');
    let setCalls=0,setReceiver:unknown;
    let setResult:{value:string|undefined;error?:unknown}|undefined;
    let constructionResult:{value:string|undefined;error?:unknown}|undefined,constructionError:unknown;
    try{
      defineOwn(WeakMap.prototype,'set',{configurable:true,writable:true,value(this:unknown,..._args:unknown[]){
        setCalls++;setReceiver=this;return this;
      }});
      setResult=capturedRead(lookup);
      try{constructionResult=capturedRead(createNamingReviewLookup(constructionRaw));}
      catch(error){constructionError=error;}
    }finally{restoreOwn(WeakMap.prototype,'set',originalSet);}
    expect(ownDescriptor(WeakMap.prototype,'set')).toEqual(originalSet);
    expect(setResult).toEqual({value:expected});
    expect(constructionError).toBeUndefined();
    expect(constructionResult).toEqual({value:constructionExpected});
    expect(setCalls).toBe(0);expect(setReceiver).toBeUndefined();
    expect(readNamingReviewLookupInputJson(lookup)).toBe(expected);
  });
});
