/** Genuine SQL push-projection regression, source only; root owns execution.
 * Bound SOURCE: stage-ready-r2/manifest.json SHA256
 * c0bed92bb82c08d5ef4de62e50cf9c451ad9e97f35cafed824f4ac8ecb71a631.
 * The root envelope verifies the imported product graph against that manifest.
 * Actual main imports precede the push hook. No issuer, replay capsule,
 * business method replacement or faster flag is supplied by this test. */
import {it,expect} from 'vitest';
import {mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {randomUUID,webcrypto} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {Store} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {verifyCandidateFacts,packSha,type FactArchive} from '../src/main/candidate-facts';
import {readLiveCitationReadingDependenciesV6} from '../src/domain/naming-semantics-v6';
import {normalizePreferences} from '../src/shared/workflow';
import {NAMING_RULE_V7_VERSION,NAMING_RULE_V71_VERSION} from '../src/shared/naming-rules';
import type {BirthProfile,CharacterEntry,CandidateFactVerification} from '../src/shared/types';

type EntryRows=Array<[string,CharacterEntry]>;
type Invoke=(target:Function,receiver:unknown,args:ArrayLike<unknown>)=>unknown;
const invoke=Function.prototype.call.bind(Function.prototype.apply) as Invoke;
const nativeForEach=Object.getOwnPropertyDescriptor(Map.prototype,'forEach')!.value as Function;
const nativeSet=Object.getOwnPropertyDescriptor(Map.prototype,'set')!.value as Function;
const nativeDelete=Object.getOwnPropertyDescriptor(Map.prototype,'delete')!.value as Function;
const nativeClear=Object.getOwnPropertyDescriptor(Map.prototype,'clear')!.value as Function;
const nativeDefine=Object.getOwnPropertyDescriptor(Object,'defineProperty')!.value as Function;
const nativePush=Object.getOwnPropertyDescriptor(Array.prototype,'push')!.value as Function;

function ownAppend<T>(rows:T[],value:T):void {
  const descriptor=Object.create(null) as PropertyDescriptor;
  descriptor.value=value;descriptor.writable=true;descriptor.enumerable=true;descriptor.configurable=true;
  invoke(nativeDefine,undefined,[rows,String(rows.length),descriptor]);
}
function nativeRows(map:ReadonlyMap<string,CharacterEntry>):EntryRows {
  const rows:EntryRows=[];
  invoke(nativeForEach,map,[(value:CharacterEntry,key:string)=>{ownAppend(rows,[key,value]);}]);return rows;
}
/** Data-only witness of the old dependencyValue projection for the real
 * CharacterEntry value. It neither issues nor authenticates a replay input.
 * Own data and property order are retained; output records have null prototype. */
function projectedData(value:unknown):unknown {
  if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return value;
  if(!value||typeof value!=='object')throw new Error('M454 projection witness needs real plain data');
  if(Array.isArray(value)){
    const rows:unknown[]=[];
    for(let index=0;index<value.length;index++){
      const descriptor=Object.getOwnPropertyDescriptor(value,String(index));
      if(!descriptor||!Object.hasOwn(descriptor,'value'))throw new Error('M454 projection witness refuses array accessors');
      ownAppend(rows,projectedData(descriptor.value));
    }
    return rows;
  }
  const output=Object.create(null) as Record<string,unknown>;
  for(const key of Object.getOwnPropertyNames(value)){
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)throw new Error('M454 projection witness refuses record accessors');
    const next=Object.create(null) as PropertyDescriptor;
    next.value=projectedData(descriptor.value);next.writable=true;next.enumerable=true;next.configurable=true;
    invoke(nativeDefine,undefined,[output,key,next]);
  }
  return output;
}
function safeProjectedRows(map:ReadonlyMap<string,CharacterEntry>):unknown[][] {
  const rows:unknown[][]=[];
  invoke(nativeForEach,map,[(value:CharacterEntry,key:string)=>{ownAppend(rows,[key,projectedData(value)]);}]);return rows;
}
function verdict(read:()=>CandidateFactVerification|undefined){
  try{return{status:'returned' as const,value:read()};}catch(error){
    const value=error as Error&{code?:unknown};
    return{status:'thrown' as const,name:value.name,message:value.message,...(value.code?{code:value.code}:{})};
  }
}

it('rejects a proven target-only push projection during a genuine Store SQL read and preserves the real legacy outcome',async()=>{
  const ownedRoot=resolve('.local/team-454/store-push-projection-work');
  mkdirSync(ownedRoot,{recursive:true});const userDir=mkdtempSync(join(ownedRoot,'push-projection-'));
  const originalPush=Object.getOwnPropertyDescriptor(Array.prototype,'push');
  if(!originalPush||!Object.hasOwn(originalPush,'value')||originalPush.value!==nativePush)throw new Error('M454 requires a restorable original Array.prototype.push');
  let store:Store|undefined,service:StudioService|undefined;
  let actualMap:ReadonlyMap<string,CharacterEntry>|undefined,originalEntries:EntryRows|undefined;
  let wrapperInstalled=false,complete=false;
  try{
    expect(globalThis.crypto).toBe(webcrypto);
    store=new Store(userDir,resolve('data'),resolve('node_modules/sql.js/dist/sql-wasm.wasm'));await store.init();
    store.put('settings','main',{...store.settings(),useAi:false});
    service=new StudioService(store,{read:()=>'',write:()=>{}},false);
    const profile:BirthProfile={
      id:randomUUID(),customerName:'M454 push回归家庭',surname:'林',surnamePinyin:'lín',
      fatherName:'',motherName:'',gender:'中性',calendar:'solar',birthDate:'2026-10-17',
      leapMonth:false,birthTime:'09:30',timeUnknown:false,birthPlace:'杭州',timezone:'Asia/Shanghai',
      notes:'真实存储行与限定push投影回归',renMethod:'none',timeBasis:'civil',
      monthAuthorityMethod:'no-fixed-day/1.0.0',seasonalMethod:'no-monthly/1.0.0',
    };
    // Actual V6 publication includes this real override; requiring it also
    // places the affected character in each genuine generated candidate.
    const targetChar='冬';
    const preferences=normalizePreferences({
      length:2,preferredElements:['水'],requiredChars:targetChar,generationChar:'',forbiddenChars:'',elderTaboo:'',
      style:'自然',meanings:'',industry:'',numerology:false,zodiacRules:false,
    });
    const generated=(await service.generate(profile,preferences)).session;
    const baseline=store.readVerifiedSession(generated.id);expect(baseline).toBeDefined();
    if(!baseline)throw new Error('M454 genuine generated row was not saved');
    expect([NAMING_RULE_V7_VERSION,NAMING_RULE_V71_VERSION]).toContain(baseline.namingRules?.version);
    expect(baseline.profile.fatherName).toBe('');expect(baseline.profile.motherName).toBe('');
    expect(baseline.candidates.length).toBeGreaterThan(0);
    expect(baseline.candidates.every(row=>row.characters.some(entry=>entry.char===targetChar))).toBe(true);
    const pack=new Uint8Array(store.currentPackBytes());
    const archive:FactArchive={sha256:packSha(pack),version:store.dataset.version,pack,dataset:structuredClone(store.dataset)};
    expect(archive.version).toBe(archive.sha256.slice(0,12));expect(baseline.dataVersion).toBe(archive.version);
    expect(verdict(()=>verifyCandidateFacts(structuredClone(baseline),archive,archive))).toEqual({status:'returned',value:baseline.factVerification});

    const dependencies=readLiveCitationReadingDependenciesV6();actualMap=dependencies.overrides;
    originalEntries=nativeRows(actualMap);const originalRaw=JSON.stringify(dependencies.v6Table);
    expect(readLiveCitationReadingDependenciesV6().overrides).toBe(actualMap);
    const target=originalEntries.find(([key])=>key===targetChar);
    if(!target)throw new Error('M454 actual V6 overrides must contain the published 冬 row');
    const projectedValue=projectedData(target[1]);
    const oldExpectedMap=new Map(originalEntries),originalProjection=safeProjectedRows(actualMap);
    expect(invoke(nativeDelete,actualMap,[targetChar])).toBe(true);
    const changedEntries=nativeRows(actualMap),changedProjection=safeProjectedRows(actualMap);
    expect(changedEntries).not.toEqual(originalEntries);expect(changedProjection).not.toEqual(originalProjection);
    expect(changedEntries.some(([key])=>key===targetChar)).toBe(false);
    expect(JSON.stringify(dependencies.v6Table)).toBe(originalRaw);
    // Establish the actual public result before installing any hook. Either
    // a real rejection or a real returned verification is compared exactly.
    const expected=verdict(()=>verifyCandidateFacts(structuredClone(baseline),archive,archive));
    let droppedPairs=0;
    const wrapper=function(this:unknown,...args:unknown[]){
      const pair=args.length===1?args[0]:undefined;
      // Full projected CharacterEntry equality prevents name-only suppression
      // of unrelated evaluator/fixture/framework pushes.
      if(Array.isArray(pair)&&pair.length===2&&pair[0]===targetChar&&isDeepStrictEqual(pair[1],projectedValue)){
        droppedPairs++;return (this as {length:number}).length;
      }
      return invoke(nativePush,this,args);
    };
    const replacement=Object.create(null) as PropertyDescriptor;
    replacement.value=wrapper;replacement.writable=originalPush.writable;
    replacement.enumerable=originalPush.enumerable;replacement.configurable=originalPush.configurable;
    Object.defineProperty(Array.prototype,'push',replacement);wrapperInstalled=true;

    // This is the exact old entries.push([key, projectedValue]) sink over the
    // genuine original Map data, not an authority or fake business producer.
    const hiddenExpectedProjection:unknown[][]=[];
    invoke(nativeForEach,oldExpectedMap,[(value:CharacterEntry,key:string)=>{
      hiddenExpectedProjection.push([key,projectedData(value)]);
    }]);
    expect(droppedPairs).toBe(1);
    expect(hiddenExpectedProjection).toEqual(changedProjection);
    expect(hiddenExpectedProjection).not.toEqual(originalProjection);
    expect(nativeRows(actualMap)).toEqual(changedEntries);
    droppedPairs=0;

    const actual=verdict(()=>store!.readVerifiedSession(generated.id)?.factVerification);
    expect(actual).toEqual(expected);expect(droppedPairs).toBe(0);
    // If the hook affects even the common public reference, this fixture
    // fails explicitly rather than accepting two jointly corrupted outcomes.
    const referenceUnderHook=verdict(()=>verifyCandidateFacts(structuredClone(baseline),archive,archive));
    expect(referenceUnderHook).toEqual(expected);expect(droppedPairs).toBe(0);
    expect(nativeRows(actualMap)).toEqual(changedEntries);expect(JSON.stringify(dependencies.v6Table)).toBe(originalRaw);

    Object.defineProperty(Array.prototype,'push',originalPush);wrapperInstalled=false;
    invoke(nativeClear,actualMap,[]);for(const [key,value]of originalEntries)invoke(nativeSet,actualMap,[key,value]);
    expect(nativeRows(actualMap)).toEqual(originalEntries);
    for(const [key,value]of originalEntries)expect(actualMap.get(key)).toBe(value);
    expect(store.readVerifiedSession(generated.id)?.factVerification).toEqual(baseline.factVerification);
    complete=true;
  }finally{
    if(wrapperInstalled)Object.defineProperty(Array.prototype,'push',originalPush);
    if(actualMap&&originalEntries){invoke(nativeClear,actualMap,[]);for(const [key,value]of originalEntries)invoke(nativeSet,actualMap,[key,value]);}
    try{await service?.closeCmnReadingWorker();}finally{store?.db?.close();}
    if(complete){
      const resolved=resolve(userDir);if(dirname(resolved)!==ownedRoot)throw new Error('M454 cleanup path escaped its exact owned root');
      rmSync(resolved,{recursive:true,force:true});
    }else{console.error('M454_STORE_PUSH_PROJECTION_RETAINED',userDir);}
  }
});
