/**
 * M452 untrusted batch contracts, author-only source.
 * Before imports root's independent frozen naming4939/naming-v7 78dffe peers;
 * the historical M331 scalar capture is not substituted for that batch.
 * Both endpoints share the actual v6 supplemental rule module deliberately.
 * The pure M331 extraction reads SQLite bytes for SHA only and imports no main.
 * No generation, source authority, Store, SQL, Worker, profiling, or new API.
 */
import {afterEach,describe,expect,it,vi} from 'vitest';
import * as beforeNaming from './fixtures/m452-before/naming';
import * as afterNaming from '../src/domain/naming';
import {supplementalNameRules} from '../src/domain/naming-name-rules-v6';
import primaryTable from '../data/naming-editorial.json';
import reviewedTable from '../data/naming-editorial-v7.json';
import {manualFixture} from './helpers/m452-pure-fixture';
import type {NameCandidate} from '../src/shared/types';

type Runner=typeof afterNaming.recomputeCandidateFactsBatchForRuleVersion;
type Fixture=ReturnType<typeof manualFixture>;
type Input={givenName:string;origin:'local'|'ai'};
const endpoints:{name:'before'|'after';run:Runner}[]=[
  {name:'before',run:beforeNaming.recomputeCandidateFactsBatchForRuleVersion},
  {name:'after',run:afterNaming.recomputeCandidateFactsBatchForRuleVersion},
];
const local=(givenName:string):Input=>({givenName,origin:'local'});
function batch(run:Runner,fixture:Fixture,rows:Input[],inspect?:Parameters<Runner>[9]){
  return run(fixture.version,fixture.context,fixture.profile,fixture.preferences,fixture.analysis,
    fixture.characters,fixture.citations,rows,undefined,inspect);
}
function deterministic<T>(action:()=>T):T{
  let index=0;const actual=globalThis.crypto;
  const replacement=new Proxy(actual,{get(target,key){
    if(key==='randomUUID')return()=>'00000000-0000-4000-8000-'+String(++index).padStart(12,'0');
    const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
  }});
  vi.stubGlobal('crypto',replacement);
  try{return action();}finally{vi.unstubAllGlobals();}
}
function outcome<T>(action:()=>T){
  try{return{status:'returned' as const,value:action()};}
  catch(error){return{status:'thrown' as const,name:error instanceof Error?error.name:typeof error,
    message:error instanceof Error?error.message:String(error)};}
}
function candidate(value:NameCandidate|null|undefined,where:string):NameCandidate{
  expect(value,where+' real candidate prerequisite').not.toBeNull();
  if(!value)throw Error(where+' real candidate prerequisite was not met');
  return value;
}
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});

describe('M452 independent old/current batch outcomes on untrusted shared data',()=>{
  it('preserves unused reviewed-character wrong-shape failure before any first-candidate inspection',()=>{
    const results=endpoints.map(endpoint=>{
      const fixture=manualFixture(),unused=supplementalNameRules[2];
      expect(unused?.name).toBe('有恒');expect(unused?.readings[0]?.char).toBe('有');
      expect('南安').not.toContain('有');
      const entry=fixture.characters.find(value=>value.char==='有');
      if(!entry)throw Error('M452 actual 有 dictionary row missing');
      const original=entry.meaning;expect(typeof original).toBe('string');
      let inspections=0;
      const selected=(()=>{
        try{
          return outcome(()=>deterministic(()=>{
            // Finite zero remains plain JSON; only the field shape is invalid.
            (entry as unknown as Record<string,unknown>).meaning=0;
            return batch(endpoint.run,fixture,[local('南安')],()=>{
              inspections++;throw Error('M452 inspection sentinel was reached');
            });
          }));
        }finally{entry.meaning=original;}
      })();
      expect(entry.meaning).toBe(original);
      return{selected,inspections};
    });
    const expected=results[0],actual=results[1];
    expect(expected.selected.status).toBe('thrown');
    if(expected.selected.status==='thrown')expect(expected.selected.name).toBe('TypeError');
    expect(expected.inspections).toBe(0);
    expect(actual.selected).toEqual(expected.selected);expect(actual.inspections).toBe(0);
    // Native error text is captured from the genuine frozen-before outcome.
  });

  it('retains initial outer citations while rules-only mutation is visible to nested and later fresh batches',()=>{
    const results=endpoints.map(endpoint=>{
      const fixture=manualFixture(),rule=supplementalNameRules.find(value=>value.name==='扬善');
      if(!rule)throw Error('M452 actual 扬善 supplemental rule missing');
      const original=rule.citation,originalValue=structuredClone(original);
      const absentId='m452-rule-only-absent-citation';
      expect(fixture.citations.some(value=>value.id===absentId)).toBe(false);
      expect(fixture.citations.find(value=>value.id===original.id)).toEqual(original);
      expect(primaryTable.citations.some(value=>value.names.includes('扬善'))).toBe(false);
      expect(reviewedTable.nameRules.some(value=>value.name==='扬善')).toBe(false);
      const trace:{phase:string;index?:number;name?:string;citationIds:string[]}[]=[];
      const observed=(()=>{
        try{
          return outcome(()=>deterministic(()=>{
            let nested:ReturnType<Runner>|undefined,outer:ReturnType<Runner>;
            try{
              outer=batch(endpoint.run,fixture,[local('南安'),local('扬善')],(value,index)=>{
                const inspected=candidate(value,endpoint.name+' inspect '+index);
                trace.push({phase:'outer-inspect',index,name:inspected.givenName,
                  citationIds:inspected.citations.map(citation=>citation.id)});
                if(index!==0)return;
                expect(inspected.givenName).toBe('南安');expect(inspected.citations).toEqual([]);
                rule.citation={...original,id:absentId};
                trace.push({phase:'rule-reference-replaced',citationIds:[rule.citation.id]});
                // A separate public-dispatcher call enters while outer inspect
                // is active. It receives the same raw inputs, not a cache/API.
                nested=batch(endpoint.run,fixture,[local('扬善')]);
                expect(nested).toHaveLength(1);
                const inner=candidate(nested[0],endpoint.name+' nested batch');
                trace.push({phase:'nested-return',name:inner.givenName,
                  citationIds:inner.citations.map(citation=>citation.id)});
              });
            }finally{rule.citation=original;}
            expect(rule.citation).toBe(original);expect(outer).toHaveLength(2);
            const first=candidate(outer[0],endpoint.name+' first outer candidate');
            const second=candidate(outer[1],endpoint.name+' second outer candidate');
            expect(first.citations).toEqual([]);
            if(!nested)throw Error('M452 real nested invocation did not occur');
            const inner=candidate(nested[0],endpoint.name+' nested result');
            const fresh=batch(endpoint.run,fixture,[local('扬善')]);
            expect(fresh).toHaveLength(1);
            const later=candidate(fresh[0],endpoint.name+' post-restore fresh batch');
            trace.push({phase:'post-restore-return',name:later.givenName,
              citationIds:later.citations.map(citation=>citation.id)});
            return{outer:structuredClone(outer),nested:structuredClone(nested),fresh:structuredClone(fresh),
              firstIds:first.citations.map(value=>value.id),
              outerIds:second.citations.map(value=>value.id),
              nestedIds:inner.citations.map(value=>value.id),
              freshIds:later.citations.map(value=>value.id),trace:[...trace]};
          }));
        }finally{rule.citation=original;}
      })();
      expect(rule.citation).toBe(original);expect(original).toEqual(originalValue);
      return{observed,originalValue};
    });
    const expected=results[0],actual=results[1];
    expect(expected.observed.status).toBe('returned');
    if(expected.observed.status==='returned'){
      expect(expected.observed.value.firstIds).toEqual([]);
      expect(expected.observed.value.outerIds).toEqual([expected.originalValue.id]);
      expect(expected.observed.value.nestedIds).toEqual([]);
      expect(expected.observed.value.freshIds).toEqual([expected.originalValue.id]);
    }
    expect(actual.observed).toEqual(expected.observed);
    expect(actual.originalValue).toEqual(expected.originalValue);
  });
});
