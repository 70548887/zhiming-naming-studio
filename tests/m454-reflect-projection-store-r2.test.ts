/** Genuine SQL-read regression, authored only; root owns the execution window.
 * Bound SOURCE: stage-ready-r2/manifest.json SHA256
 * c0bed92bb82c08d5ef4de62e50cf9c451ad9e97f35cafed824f4ac8ecb71a631.
 * The root envelope verifies the imported product graph against that manifest.
 * Import actual main before installing the Reflect wrapper. This case never
 * makes a replay capsule, patches a business method or supplies a fast flag.
 * The common public verifier below is a reference computation over the real
 * generated row/pack, not the producer of the Store-owned replay authority. */
import {it,expect} from 'vitest';
import {mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {randomUUID,webcrypto} from 'node:crypto';
import {Store} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {verifyCandidateFacts,packSha,type FactArchive} from '../src/main/candidate-facts';
import {readLiveCitationReadingDependenciesV6,hasReviewedProjectReading} from '../src/domain/naming-semantics-v6';
import {normalizePreferences} from '../src/shared/workflow';
import {NAMING_RULE_V7_VERSION,NAMING_RULE_V71_VERSION} from '../src/shared/naming-rules';
import type {BirthProfile,CharacterEntry,CandidateFactVerification} from '../src/shared/types';

type EntryRows=Array<[string,CharacterEntry]>;
type Invoke=(target:Function,receiver:unknown,args:ArrayLike<unknown>)=>unknown;
// Trusted Function roots are the same explicit bootstrap boundary as product.
const invoke=Function.prototype.call.bind(Function.prototype.apply) as Invoke;
const nativeForEach=Object.getOwnPropertyDescriptor(Map.prototype,'forEach')!.value as Function;
const nativeSet=Object.getOwnPropertyDescriptor(Map.prototype,'set')!.value as Function;
const nativeClear=Object.getOwnPropertyDescriptor(Map.prototype,'clear')!.value as Function;
function nativeRows(map:ReadonlyMap<string,CharacterEntry>):EntryRows {
  const rows:EntryRows=[];
  invoke(nativeForEach,map,[(value:CharacterEntry,key:string)=>{rows.push([key,value]);}]);return rows;
}
function verdict(read:()=>CandidateFactVerification|undefined){
  try{return{status:'returned' as const,value:read()};}catch(error){
    const value=error as Error&{code?:unknown};
    return{status:'thrown' as const,name:value.name,message:value.message,...(value.code?{code:value.code}:{})};
  }
}

it('ignores a proven Reflect.apply Map projection hook during a genuine Store SQL read and matches the real public legacy outcome',async()=>{
  const ownedRoot=resolve('.local/team-454/store-projection-work');
  mkdirSync(ownedRoot,{recursive:true});const userDir=mkdtempSync(join(ownedRoot,'projection-'));
  const originalReflect=Object.getOwnPropertyDescriptor(Reflect,'apply');
  if(!originalReflect||!Object.hasOwn(originalReflect,'value')||typeof originalReflect.value!=='function')throw new Error('M454 requires a restorable initial Reflect.apply data property');
  const forwardReflect=originalReflect.value as typeof Reflect.apply;
  let store:Store|undefined,service:StudioService|undefined;
  let actualMap:ReadonlyMap<string,CharacterEntry>|undefined,originalEntries:EntryRows|undefined;
  let wrapperInstalled=false,complete=false;
  try{
    expect(globalThis.crypto).toBe(webcrypto);
    store=new Store(userDir,resolve('data'),resolve('node_modules/sql.js/dist/sql-wasm.wasm'));await store.init();
    store.put('settings','main',{...store.settings(),useAi:false});
    service=new StudioService(store,{read:()=>'',write:()=>{}},false);
    // Actual shared/types.ts2-5,25-36 and Service.validateProfile189-192
    // accept these explicit civil/no-fixed/no-monthly/none options; notes is required.
    const profile:BirthProfile={
      id:randomUUID(),customerName:'M454 SQL回归家庭',surname:'林',surnamePinyin:'lín',
      fatherName:'',motherName:'',gender:'中性',calendar:'solar',birthDate:'2026-10-17',
      leapMonth:false,birthTime:'09:30',timeUnknown:false,birthPlace:'杭州',timezone:'Asia/Shanghai',
      notes:'真实存储行与Reflect投影回归',renMethod:'none',timeBasis:'civil',
      monthAuthorityMethod:'no-fixed-day/1.0.0',seasonalMethod:'no-monthly/1.0.0',
    };
    const preferences=normalizePreferences({
      length:2,preferredElements:['水'],requiredChars:'明',generationChar:'',forbiddenChars:'',elderTaboo:'',
      style:'自然',meanings:'',industry:'',numerology:false,zodiacRules:false,
    });
    const generated=(await service.generate(profile,preferences)).session;
    const baseline=store.readVerifiedSession(generated.id);expect(baseline).toBeDefined();
    if(!baseline)throw new Error('M454 genuine generated row was not saved');
    expect([NAMING_RULE_V7_VERSION,NAMING_RULE_V71_VERSION]).toContain(baseline.namingRules?.version);
    expect(baseline.profile.fatherName).toBe('');expect(baseline.profile.motherName).toBe('');
    const pack=new Uint8Array(store.currentPackBytes());
    const archive:FactArchive={sha256:packSha(pack),version:store.dataset.version,pack,dataset:structuredClone(store.dataset)};
    expect(archive.version).toBe(archive.sha256.slice(0,12));expect(baseline.dataVersion).toBe(archive.version);
    const originalVerdict=verdict(()=>verifyCandidateFacts(structuredClone(baseline),archive,archive));
    expect(originalVerdict).toEqual({status:'returned',value:baseline.factVerification});

    const dependencies=readLiveCitationReadingDependenciesV6();actualMap=dependencies.overrides;
    originalEntries=nativeRows(actualMap);const originalRaw=JSON.stringify(dependencies.v6Table);
    expect(readLiveCitationReadingDependenciesV6().overrides).toBe(actualMap);
    const chosen=baseline.candidates.flatMap(row=>row.characters).find(entry=>!actualMap!.has(entry.char)&&hasReviewedProjectReading(entry));
    if(!chosen)throw new Error('M454 generated fixture needs a genuinely reviewed, non-overridden character');
    invoke(nativeSet,actualMap,[chosen.char,chosen]);
    expect(actualMap.has(chosen.char)).toBe(true);expect(hasReviewedProjectReading(chosen)).toBe(false);
    const changedEntries=nativeRows(actualMap);expect(changedEntries).not.toEqual(originalEntries);
    expect(JSON.stringify(dependencies.v6Table)).toBe(originalRaw);
    // Reference the real changed live rules before the test hook is installed.
    // This may return or throw; do not invent a required legacy error outcome.
    const expected=verdict(()=>verifyCandidateFacts(structuredClone(baseline),archive,archive));
    const oldProjection=new Map(originalEntries);let projectionCalls=0;
    const wrapper=((target:Function,receiver:unknown,args:ArrayLike<unknown>)=>{
      if(target===nativeForEach&&receiver===actualMap){projectionCalls++;return invoke(forwardReflect,undefined,[target,oldProjection,args]);}
      return invoke(forwardReflect,undefined,[target,receiver,args]);
    }) as typeof Reflect.apply;
    const replacement=Object.create(null) as PropertyDescriptor;
    replacement.value=wrapper;replacement.writable=originalReflect.writable;
    replacement.enumerable=originalReflect.enumerable;replacement.configurable=originalReflect.configurable;
    Object.defineProperty(Reflect,'apply',replacement);wrapperInstalled=true;

    // Prove the exact active same-Map/native-forEach misprojection, not merely
    // a function name. Reset the witness count before the genuine SQL read.
    const forgedRows:EntryRows=[];
    Reflect.apply(nativeForEach,actualMap,[(value:CharacterEntry,key:string)=>{forgedRows.push([key,value]);}]);
    expect(projectionCalls).toBe(1);expect(forgedRows).toEqual(originalEntries);
    expect(forgedRows).not.toEqual(changedEntries);expect(nativeRows(actualMap)).toEqual(changedEntries);
    projectionCalls=0;
    const actual=verdict(()=>store!.readVerifiedSession(generated.id)?.factVerification);
    expect(actual).toEqual(expected);expect(projectionCalls).toBe(0);
    expect(nativeRows(actualMap)).toEqual(changedEntries);expect(JSON.stringify(dependencies.v6Table)).toBe(originalRaw);
    Object.defineProperty(Reflect,'apply',originalReflect);wrapperInstalled=false;
    invoke(nativeClear,actualMap,[]);for(const [key,value]of originalEntries)invoke(nativeSet,actualMap,[key,value]);
    expect(nativeRows(actualMap)).toEqual(originalEntries);
    for(const [key,value]of originalEntries)expect(actualMap.get(key)).toBe(value);
    expect(store.readVerifiedSession(generated.id)?.factVerification).toEqual(baseline.factVerification);
    complete=true;
  }finally{
    if(wrapperInstalled)Object.defineProperty(Reflect,'apply',originalReflect);
    if(actualMap&&originalEntries){invoke(nativeClear,actualMap,[]);for(const [key,value]of originalEntries)invoke(nativeSet,actualMap,[key,value]);}
    try{await service?.closeCmnReadingWorker();}finally{store?.db?.close();}
    if(complete){
      const resolved=resolve(userDir);if(dirname(resolved)!==ownedRoot)throw new Error('M454 cleanup path escaped its exact owned root');
      rmSync(resolved,{recursive:true,force:true});
    }else{console.error('M454_STORE_PROJECTION_RETAINED',userDir);}
  }
});
