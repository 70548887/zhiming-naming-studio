/** New owned-citation computation tests only. The actual78 public batch body is
 * independently captured under m452-before; the three old gate files below are
 * import-path-only captures. Existing M452 public2 and M33124 remain separate.
 * No result here authenticates SQL rows, publication bytes or a Store producer. */
import {afterEach,describe,expect,it,vi} from 'vitest';
import * as beforeNaming from './fixtures/m452-before/naming';
import * as before5 from './fixtures/m454-before/naming-semantics-v5';
import * as before6 from './fixtures/m454-before/naming-semantics-v6';
import * as beforeNames from './fixtures/m454-before/naming-name-rules-v6';
import * as live5 from '../src/domain/naming-semantics-v5';
import * as live6 from '../src/domain/naming-semantics-v6';
import {createSupplementalNameResolver,type SupplementalNameRule} from '../src/domain/naming-name-rules-v6';
import {
  createOwnedReviewedCitationContext,recomputeOwnedCitationContextBatch,
  type OwnedReviewedCitationBatchInputs,type OwnedReviewedCitationContext,
} from '../src/domain/naming-v7';
import {resolveNamingContextForRuleVersion,resolveNamingBasisForRuleVersion} from '../src/domain/naming';
import {NAMING_RULE_V7_VERSION,NAMING_RULE_V71_VERSION} from '../src/shared/naming-rules';
import type {CharacterEntry,NameCandidate} from '../src/shared/types';
import {ownedInputs,gateTables,type PureRow} from './helpers/m454-pure-inputs';

type Candidate=NameCandidate|null;
const simpleRows:PureRow[]=[{givenName:'南安',origin:'local'},{givenName:'宜家',origin:'ai'}];
function deterministic<T>(run:()=>T):T {
  let index=0;const original=globalThis.crypto;
  vi.stubGlobal('crypto',new Proxy(original,{get(target,key){
    if(key==='randomUUID')return()=>`00000000-0000-4000-8000-${String(++index).padStart(12,'0')}`;
    const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
  }}));
  try{return run();}finally{vi.unstubAllGlobals();}
}
function captured(run:()=>unknown):unknown {
  try{run();}catch(error){return error;}
  throw new Error('M454 expected an exception');
}
function outcome(run:()=>unknown){
  try{return{status:'returned',value:run()};}catch(error){
    const value=error as Error&{code?:unknown};
    return{status:'thrown',name:value.name,message:value.message,...(value.code?{code:value.code}:{})};
  }
}
function guard(inputs:OwnedReviewedCitationBatchInputs){return()=>{
  const selected=resolveNamingContextForRuleVersion(inputs.version,inputs.trustedContext);
  if(inputs.basis)resolveNamingBasisForRuleVersion(selected.version,selected.context,inputs.preferences,inputs.analysis,inputs.basis);
  else if(!selected.context)throw new Error('M454 missing actual reviewed context');
};}
function baseline(inputs:OwnedReviewedCitationBatchInputs){
  return beforeNaming.recomputeCandidateFactsBatchForRuleVersion(inputs.version,inputs.trustedContext,inputs.profile,inputs.preferences,inputs.analysis,inputs.characters,inputs.citations,inputs.candidates,inputs.basis);
}
function collect(owner:OwnedReviewedCitationContext,inputs:OwnedReviewedCitationBatchInputs,inspect?:(value:Candidate,index:number)=>void){
  const values:Candidate[]=[];
  const returned=recomputeOwnedCitationContextBatch(owner,guard(inputs),(value,index)=>{
    values.push(value);inspect?.(value,index);
  });
  expect(returned).toBeUndefined();return values;
}
function entries<K,V>(map:ReadonlyMap<K,V>):Array<[K,V]>{return Array.from(Map.prototype.entries.call(map) as IterableIterator<[K,V]>);}
function restoreMap<K,V>(map:ReadonlyMap<K,V>,rows:Array<[K,V]>){
  Map.prototype.clear.call(map);for(const [key,value]of rows)Map.prototype.set.call(map,key,value);
}
type PureFunction=(...args:unknown[])=>unknown;
function comparePublic(before:unknown,after:unknown,name:string,args:unknown[]){
  const original=(before as Record<string,PureFunction>)[name],current=(after as Record<string,PureFunction>)[name];
  expect(outcome(()=>current(...args)),name).toEqual(outcome(()=>original(...args)));
}
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});

describe('M454 pure owned initial-citation context; no main/source authority',()=>{
  it('matches actual78 full candidate DTOs for base/V6/V7 citations, miss, duplicate, missing glyph and upfront null with local/AI',()=>{
    const rows:PureRow[]=[
      {givenName:'',origin:'local'},{givenName:'明德',origin:'local'},
      {givenName:'扬善',origin:'ai'},{givenName:'宜家',origin:'local'},
      {givenName:'南安',origin:'ai'},{givenName:'\u{10ffff}安',origin:'local'},
      {givenName:'宜家',origin:'ai'},{givenName:'南安',origin:'local'},
    ];
    for(const version of [NAMING_RULE_V7_VERSION,NAMING_RULE_V71_VERSION] as const){
      const inputs=ownedInputs(rows,version);
      expect(inputs.characters.some(row=>row.char==='\u{10ffff}')).toBe(false);
      const expected=deterministic(()=>baseline(inputs));
      const owner=createOwnedReviewedCitationContext(inputs);
      const actual=deterministic(()=>collect(owner,inputs));
      expect(actual).toEqual(expected);expect(actual[0]).toBeNull();expect(actual[5]).toBeNull();
      for(const name of ['明德','扬善','宜家'])expect(actual.find(row=>row?.givenName===name)?.citations.length,name).toBeGreaterThan(0);
      expect(actual.filter(row=>row?.givenName==='南安').map(row=>row!.citations)).toEqual([[],[]]);
      expect(actual.filter(row=>row?.givenName==='宜家').map(row=>row!.origin)).toEqual(['local','ai']);
      expect(Object.keys(owner).sort()).toEqual(['dispose','run']);
      expect(()=>collect(owner,inputs)).toThrow('只允许一次');owner.dispose();owner.dispose();
    }
  });

  it('keeps distinct nested owners independent, rejects same-owner reentry and retires after success or an exact inspect error',()=>{
    const outerInputs=ownedInputs(simpleRows),innerInputs=ownedInputs([{givenName:'扬善',origin:'ai'}]);
    const outer=createOwnedReviewedCitationContext(outerInputs),inner=createOwnedReviewedCitationContext(innerInputs);
    let innerResults:Candidate[]=[];const inspected:number[]=[];
    const outerResults=deterministic(()=>collect(outer,outerInputs,(_value,index)=>{
      inspected.push(index);if(index!==0)return;
      expect(()=>recomputeOwnedCitationContextBatch(outer,guard(outerInputs),()=>{})).toThrow('只允许一次');
      innerResults=collect(inner,innerInputs);
      expect(()=>collect(inner,innerInputs)).toThrow('只允许一次');
    }));
    expect(inspected).toEqual([0,1]);expect(outerResults.map(row=>row?.givenName)).toEqual(['南安','宜家']);
    expect(innerResults.map(row=>row?.givenName)).toEqual(['扬善']);
    expect(()=>collect(outer,outerInputs)).toThrow('只允许一次');
    const failureInputs=ownedInputs(simpleRows),failureOwner=createOwnedReviewedCitationContext(failureInputs);
    const primary=Object.freeze(new Error('M454 exact synchronous inspect failure'));let calls=0;
    expect(captured(()=>collect(failureOwner,failureInputs,()=>{calls++;throw primary;}))).toBe(primary);
    expect(calls).toBe(1);expect(()=>collect(failureOwner,failureInputs)).toThrow('只允许一次');
    failureOwner.dispose();failureOwner.dispose();
  });

  it('checks changed fixed input before the next inspection, retires on failure and uses a fresh next owner; guards stay before inspect',()=>{
    const inputs=ownedInputs(simpleRows),owner=createOwnedReviewedCitationContext(inputs);
    const target=inputs.characters.find(row=>row.char==='安');if(!target)throw new Error('M454 missing actual 安');
    const meaning=target.meaning;let inspected=0;
    try{
      expect(()=>collect(owner,inputs,(_value,index)=>{inspected++;if(index===0)target.meaning+='M454 changed input';})).toThrow('固定字库或引文在调用期间发生变化');
      expect(inspected).toBe(1);expect(()=>collect(owner,inputs)).toThrow('只允许一次');
    }finally{target.meaning=meaning;owner.dispose();}
    const expected=deterministic(()=>baseline(inputs)),fresh=createOwnedReviewedCitationContext(inputs);
    expect(deterministic(()=>collect(fresh,inputs))).toEqual(expected);

    const citationsInputs=ownedInputs(simpleRows),citationsOwner=createOwnedReviewedCitationContext(citationsInputs);
    const citation=citationsInputs.citations.find(row=>row.id==='shijing-6-3');
    if(!citation)throw new Error('M454 missing actual 宜家 citation');
    const citationText=citation.text,citationExpected=deterministic(()=>baseline(citationsInputs));
    expect(citationExpected[1]?.citations.some(row=>row.id===citation.id&&row.text===citationText)).toBe(true);
    let citationInspected=0;
    try{
      expect(()=>collect(citationsOwner,citationsInputs,(_value,index)=>{
        citationInspected++;if(index===0)citation.text+=' M454 changed citation input';
      })).toThrow('固定字库或引文在调用期间发生变化');
      expect(citationInspected).toBe(1);
      expect(()=>collect(citationsOwner,citationsInputs)).toThrow('只允许一次');
    }finally{citation.text=citationText;citationsOwner.dispose();}
    const citationFresh=createOwnedReviewedCitationContext(citationsInputs);
    expect(deterministic(()=>collect(citationFresh,citationsInputs))).toEqual(citationExpected);

    const frontOwner=createOwnedReviewedCitationContext(inputs),primary=Object.freeze(new Error('M454 before-candidate guard failure'));
    let frontInspections=0;
    expect(captured(()=>recomputeOwnedCitationContextBatch(frontOwner,()=>{throw primary;},()=>{frontInspections++;}))).toBe(primary);
    expect(frontInspections).toBe(0);expect(()=>collect(frontOwner,inputs)).toThrow('只允许一次');
    // This tests callback ordering only, not a fabricated main admission gate.
  });

  it('uses the original gate/resolver algorithms and exposes effective live dependencies rather than a top-table clone, restoring map order',()=>{
    const inputs=ownedInputs(simpleRows),tables=gateTables(inputs);
    const gate5=live5.createCitationReadingGateV5(tables.v4,tables.v5),gate6=live6.createCitationReadingGateV6(tables.v6,gate5);
    const byChar=new Map(inputs.characters.map(row=>[row.char,row]));
    const characters=[...new Set(['安',...tables.v5.characterOverrides.map(row=>row.char),...tables.v6.characterOverrides.map(row=>row.char)])];
    const methods5=['hasReviewedProjectReading','hasBaselinePronunciation','reviewedNamingSense','semanticTagsForReading','currentCharacterWarning'];
    const methods6=[...methods5,'hasFixedDefaultDictionaryIdentity','reviewedNamingSenseConcept'];
    for(const char of characters){
      const entry=byChar.get(char);if(!entry)throw new Error('M454 missing fixed character '+char);
      for(const method of methods5)comparePublic(before5,live5,method,[entry]);
      for(const method of methods6)comparePublic(before6,live6,method,[entry]);
      expect(gate5.hasReviewedProjectReading(entry)).toBe(before5.hasReviewedProjectReading(entry));
      expect(gate6.hasReviewedProjectReading(entry)).toBe(before6.hasReviewedProjectReading(entry));
      comparePublic(before5,live5,'matchesReviewedReading',[entry,undefined]);
      comparePublic(before6,live6,'matchesReviewedReading',[entry,undefined]);
    }
    const rules=tables.v6.nameRules as SupplementalNameRule[],resolver=createSupplementalNameResolver(rules,gate6.matchesReviewedReading);
    for(const rule of rules){
      expect(outcome(()=>resolver(rule.name,byChar,inputs.citations))).toEqual(outcome(()=>beforeNames.resolveSupplementalName(rule.name,byChar,inputs.citations)));
      const sequence=[...rule.name].map(char=>byChar.get(char)!);
      for(const method of ['reviewedNamingCombination','hasReviewedNaturalPair']){
        comparePublic(before5,live5,method,[rule.name,sequence]);comparePublic(before6,live6,method,[rule.name,sequence]);
      }
      for(const binding of rule.readings){const entry=byChar.get(binding.char)!;
        expect(outcome(()=>gate5.matchesReviewedReading(entry,binding))).toEqual(outcome(()=>before5.matchesReviewedReading(entry,binding)));
        expect(outcome(()=>gate6.matchesReviewedReading(entry,binding))).toEqual(outcome(()=>before6.matchesReviewedReading(entry,binding)));
      }
    }
    const first=rules[0],duplicate={...structuredClone(first),ruleId:first.ruleId+'-later'};
    expect(createSupplementalNameResolver([first,duplicate],gate6.matchesReviewedReading)(first.name,byChar,inputs.citations)).toBe(first);
    const malformed={...byChar.get('安')!,meaning:0 as unknown as string};
    comparePublic(before6,live6,'matchesReviewedReading',[malformed,undefined]);

    const actual5=live5.readLiveCitationReadingDependenciesV5(),actual6=live6.readLiveCitationReadingDependenciesV6();
    expect(live5.readLiveCitationReadingDependenciesV5()).not.toBe(actual5);
    expect(live5.readLiveCitationReadingDependenciesV5().bindings).toBe(actual5.bindings);
    expect(actual6.gate5.bindings).toBe(actual5.bindings);
    const originalCorrected=entries(actual5.corrected),originalOverrides=entries(actual6.overrides);
    const firstCorrection=actual5.overrides[0];if(!firstCorrection)throw new Error('M454 missing actual V5 correction');
    const key=firstCorrection.char,entry=firstCorrection.after,originalBinding=actual5.bindings[key];
    const replacement={...originalBinding,pinyin:'m454-wrong-pinyin'};
    const raw5=JSON.stringify(actual5.v5Table),raw6=JSON.stringify(actual6.v6Table);
    const ordinary=inputs.characters.find(value=>value.char!==key&&!actual6.overrides.has(value.char)&&before5.hasReviewedProjectReading(value));
    if(!ordinary)throw new Error('M454 missing an actual non-overridden reviewed reading');
    try{
      expect(live5.hasReviewedProjectReading(entry)).toBe(true);
      Map.prototype.set.call(actual5.corrected,key,replacement);
      expect(actual5.bindings[key]).toBe(originalBinding);expect(live5.hasReviewedProjectReading(entry)).toBe(true);
      actual5.bindings[key]=replacement;
      expect(live5.hasReviewedProjectReading(entry)).toBe(false);
      expect(live5.readLiveCitationReadingDependenciesV5().bindings[key]).toBe(replacement);
      expect(entries(actual5.corrected)).not.toEqual(entries(gate5.readDependencies().corrected));
      Map.prototype.set.call(actual6.overrides,ordinary.char,ordinary);
      expect(before6.hasReviewedProjectReading(ordinary)).toBe(true);expect(live6.hasReviewedProjectReading(ordinary)).toBe(false);
      expect(entries(actual6.overrides)).not.toEqual(entries(gate6.readDependencies().overrides));
      expect(JSON.stringify(actual5.v5Table)).toBe(raw5);expect(JSON.stringify(actual6.v6Table)).toBe(raw6);
      // Main must compare these effective graphs before a new private batch.
      // Pure constructors/read ports do not themselves grant or authenticate it.
    }finally{
      actual5.bindings[key]=originalBinding;restoreMap(actual5.corrected,originalCorrected);restoreMap(actual6.overrides,originalOverrides);
    }
    expect(entries(actual5.corrected)).toEqual(originalCorrected);expect(entries(actual6.overrides)).toEqual(originalOverrides);
    expect(live5.hasReviewedProjectReading(entry)).toBe(true);expect(live6.hasReviewedProjectReading(ordinary)).toBe(true);
  });

  it('rejects malformed/altered four-table and V4 fixture inputs before a first inspection without inventing source authority',()=>{
    const inputs=ownedInputs(simpleRows);let inspected=0;
    const constructAndRun=(values:OwnedReviewedCitationBatchInputs)=>{
      const owner=createOwnedReviewedCitationContext(values);
      try{recomputeOwnedCitationContextBatch(owner,guard(values),()=>{inspected++;});}finally{owner.dispose();}
    };
    const malformed={...inputs,raw:{...inputs.raw,v5Json:'{'}};
    expect(()=>constructAndRun(malformed)).toThrow();
    const changedV6=JSON.parse(inputs.raw.v6Json);changedV6.characterOverrides[0].after.meaning=0;
    expect(()=>constructAndRun({...inputs,raw:{...inputs.raw,v6Json:JSON.stringify(changedV6)}})).toThrow('完整业务表不一致');
    expect(()=>constructAndRun({...inputs,raw:{...inputs.raw,extra:'not-a-grant'} as typeof inputs.raw})).toThrow('四个完整原始');
    const v4=structuredClone(inputs.verifiedV4Table),first=Object.keys(v4.characterReadings)[0];
    (v4.characterReadings as Record<string,{pinyin:string}>)[first].pinyin='m454-wrong';
    expect(()=>constructAndRun({...inputs,verifiedV4Table:v4})).toThrow('4.0读音表');
    let getterCalls=0;const accessor={...inputs.raw};
    Object.defineProperty(accessor,'v7Json',{enumerable:true,get(){getterCalls++;throw new Error('M454 raw getter must not run');}});
    expect(()=>constructAndRun({...inputs,raw:accessor})).toThrow();expect(getterCalls).toBe(0);
    expect(inspected).toBe(0);
    // A final valid pure owner remains usable after independent factory errors.
    const valid=createOwnedReviewedCitationContext(inputs);
    recomputeOwnedCitationContextBatch(valid,guard(inputs),()=>{inspected++;});expect(inspected).toBe(simpleRows.length);
  });
});
