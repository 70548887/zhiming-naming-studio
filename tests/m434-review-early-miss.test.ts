/**
 * M434 lookupCitation early-miss proof. No timing or changed budgets.
 *
 * The before MJS is an independent exact e07f740f.../15398B readonly copy,
 * not M331's captured scalar (which shares the current review module).
 * Its .d.mts forwards types only; the before MJS has no runtime imports.
 * Real known entries/rules/citations come from the existing fixed JSON data.
 * Malformed factory arguments below probe original fallback behavior; they
 * are never represented as a validated publication or source authority.
 */
import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import * as before from './fixtures/m434-before-naming-review-v7.mjs';
import * as v1 from './fixtures/m434-v1-naming-review-v7.mjs';
import * as after from '../src/domain/naming-review-v7.mjs';
import tableJson from '../data/naming-editorial-v7.json';
import type {
  CharacterRecord,CitationRecord,ReviewedNameRule,SupplementalReviewTable,
  NamingReviewLookup,TrustedNamingContext,
} from '../src/domain/naming-review-v7.mjs';

type Factory=typeof after.createNamingReviewLookup;
type Lookup=Readonly<NamingReviewLookup>;
type Query={name:unknown;entries:unknown;citations:unknown;context:unknown};
const factories:Factory[]=[before.createNamingReviewLookup,after.createNamingReviewLookup];
const published=tableJson as unknown as SupplementalReviewTable;
const dataset=JSON.parse(fs.readFileSync(path.resolve('data/dataset-v6.json'),'utf8')) as {
  characters:CharacterRecord[];citations:CitationRecord[];
};
const clone=<T>(value:T):T=>structuredClone(value);
const actualRule=published.nameRules.find(row=>row.name==='宜家');
if(!actualRule)throw Error('M434 fixed original 宜家 rule is missing');
const rule:ReviewedNameRule=actualRule;
const missingName='甲乙';
if(published.nameRules.some(row=>row.name===missingName))throw Error('M434 missing-name fixture is no longer missing');
const context=():TrustedNamingContext=>({
  packSha256:published.base.knowledgePackSha256,
  activeVersion:published.base.knowledgePackSha256.slice(0,12),
});
function fixture(){
  const entries=rule.readings.map(binding=>{
    const entry=dataset.characters.find(row=>row.char===binding.char);
    if(!entry)throw Error('M434 original bound character missing: '+binding.char);
    return clone(entry);
  });
  const citation=dataset.citations.find(row=>row.id===rule.citation.id);
  if(!citation)throw Error('M434 original bound citation missing');
  return{name:rule.name,entries,citations:[clone(citation)],context:context()};
}
function call(lookup:Lookup,input:Query){
  return lookup.lookupCitation(input.name as string,input.entries as CharacterRecord[],
    input.citations as CitationRecord[],input.context as TrustedNamingContext);
}
function outcome(run:()=>unknown){
  try{return{status:'returned' as const,value:run()};}
  catch(error){return{status:'thrown' as const,
    name:error instanceof Error?error.name:typeof error,
    message:error instanceof Error?error.message:String(error)};}
}
type Variant=
  'known'|'missing'|'invalid-two-char'|'short-name'|'long-name'|'non-string-name'|
  'missing-entry-getter'|'known-entry-getter'|'missing-context-getter'|'known-context-getter'|
  'missing-throwing-proxy'|'known-throwing-proxy'|'missing-transparent-proxy'|
  'missing-null-context'|'known-null-context'|'missing-extra-context'|'known-extra-context'|
  'known-sparse-entries'|'missing-sparse-citations';
function variant(kind:Variant){
  const input:Query=fixture();let getters=0;
  const missing=kind.startsWith('missing');
  if(missing||kind==='missing')input.name=missingName;
  if(kind==='invalid-two-char')input.name='a!';
  if(kind==='short-name')input.name='宜';
  if(kind==='long-name')input.name='宜家人';
  if(kind==='non-string-name')input.name=null;
  if(kind.endsWith('entry-getter')){
    const entries=input.entries as CharacterRecord[];
    Object.defineProperty(entries[0],'pinyin',{enumerable:true,configurable:true,get(){getters++;return rule.readings[0].pinyin;}});
  }
  if(kind.endsWith('context-getter')){
    Object.defineProperty(input.context,'packSha256',{enumerable:true,configurable:true,get(){getters++;return published.base.knowledgePackSha256;}});
  }
  if(kind.endsWith('throwing-proxy')){
    input.entries=new Proxy(input.entries as CharacterRecord[],{
      getOwnPropertyDescriptor(){throw Error('M434 controlled Proxy descriptor failure');},
    });
  }
  if(kind==='missing-transparent-proxy')
    input.citations=new Proxy(input.citations as CitationRecord[],{});
  if(kind.endsWith('null-context'))input.context=null;
  if(kind.endsWith('extra-context'))
    input.context={...(input.context as TrustedNamingContext),nonce:'not-a-source-grant'};
  if(kind==='known-sparse-entries')input.entries=new Array<CharacterRecord>(2);
  if(kind==='missing-sparse-citations')input.citations=new Array<CitationRecord>(1);
  return{input,getterReads:()=>getters};
}

describe('M434 independent original lookupCitation early-miss equivalence',()=>{
  it('keeps known, missing, invalid-name and malformed getter/Proxy/context public outcomes equal',()=>{
    const lookups=factories.map(factory=>factory(clone(published)));
    const valid=fixture();
    expect(call(lookups[0],valid)).toEqual(rule);
    expect(call(lookups[1],valid)).toEqual(rule);
    const variants:Variant[]=[
      'known','missing','invalid-two-char','short-name','long-name','non-string-name',
      'missing-entry-getter','known-entry-getter','missing-context-getter','known-context-getter',
      'missing-throwing-proxy','known-throwing-proxy','missing-transparent-proxy',
      'missing-null-context','known-null-context','missing-extra-context','known-extra-context',
      'known-sparse-entries','missing-sparse-citations',
    ];
    for(const label of variants){
      const observed=lookups.map(lookup=>{
        const selected=variant(label);
        return{result:outcome(()=>call(lookup,selected.input)),getterReads:selected.getterReads()};
      });
      expect(observed[1],label).toEqual(observed[0]);
      expect(observed[0].getterReads,label).toBe(0);
      // Missing names may intentionally skip Proxy traps; only outcomes and
      // non-execution of own accessors are compared in this matrix.
    }
  });

  it('reduces missing-name caller descriptor reads without a timing assertion',()=>{
    const observed=factories.map(factory=>{
      const lookup=factory(clone(published)),base=fixture();let descriptorReads=0;
      const citations=new Proxy(clone(dataset.citations),{
        getOwnPropertyDescriptor(target,key){descriptorReads++;return Reflect.getOwnPropertyDescriptor(target,key);},
      });
      const result=call(lookup,{...base,name:missingName,citations});
      return{result,descriptorReads};
    });
    expect(observed[0].result).toBeUndefined();expect(observed[1].result).toBeUndefined();
    expect(observed[0].descriptorReads).toBeGreaterThan(0);
    expect(observed[1].descriptorReads).toBeLessThan(observed[0].descriptorReads);
  });

  it('revalidates known same-identity entry, citation and context mutations and their restoration',()=>{
    const observed=factories.map(factory=>{
      const lookup=factory(clone(published)),input=fixture();
      const results:{step:string;result:unknown}[]=[];
      const read=(step:string)=>results.push({step,result:call(lookup,input)});
      read('initial');
      const binding=rule.readings[0],entry=input.entries[0];
      const reading=entry.readings?.find(row=>row.pinyin===binding.pinyin&&row.tone===binding.tone&&
        row.sourceId===binding.sourceId&&row.word===binding.dictionaryWord);
      if(!reading)throw Error('M434 original selected complete reading is missing');
      const meanings=reading.meanings;reading.meanings=[...meanings,'M434 nested tamper'];read('reading-tamper');
      reading.meanings=meanings;read('reading-restored');
      const text=input.citations[0].text;input.citations[0].text+='M434 citation tamper';read('citation-tamper');
      input.citations[0].text=text;read('citation-restored');
      const version=input.context.activeVersion;input.context.activeVersion='M434-wrong';read('context-tamper');
      input.context.activeVersion=version;read('context-restored');
      const descriptor=Object.getOwnPropertyDescriptor(entry,'pinyin');if(!descriptor)throw Error('M434 missing original pinyin descriptor');
      let getters=0;Object.defineProperty(entry,'pinyin',{enumerable:true,configurable:true,get(){getters++;return binding.pinyin;}});
      read('known-getter');expect(getters).toBe(0);
      Object.defineProperty(entry,'pinyin',descriptor);read('getter-restored');
      return results;
    });
    expect(observed[1]).toEqual(observed[0]);
    for(const rows of observed)for(const row of rows){
      if(row.step.endsWith('tamper')||row.step==='known-getter')expect(row.result,row.step).toBeUndefined();
      else expect(row.result,row.step).toEqual(rule);
    }
  });

  it('retains the first duplicate rule and returns independent complete rule clones',()=>{
    for(const factory of factories){
      const source=clone(published),duplicate=clone(rule);duplicate.context='M434 duplicate must not replace the first rule';
      source.nameRules.push(duplicate);
      const lookup=factory(source),input=fixture(),first=call(lookup,input);
      expect(first).toEqual(rule);if(!first)throw Error('M434 original first rule missing');
      first.context='M434 returned poison';first.citation.text='M434 nested returned poison';
      first.readings[0].dictionarySense='M434 returned binding poison';first.reviewWarnings.push('M434 warning poison');
      const firstSource=source.nameRules.find(row=>row.name===rule.name);if(!firstSource)throw Error('M434 source first rule missing');
      firstSource.context='M434 original caller table poison';
      expect(call(lookup,input)).toEqual(rule);
    }
  });

  it('falls back when an unsafe leaked scope aliases nameRules and Proxy guard reentry turns miss into match',()=>{
    const observed=factories.map(factory=>{
      // An adversarial factory argument, not a validated source publication.
      // All inserted rule/character/citation values remain actual original data.
      const source=clone(published);
      source.nameRules=source.nameRules.filter(row=>row.name!==rule.name);
      const pending=source.meaningReviews.find(row=>row.char==='百'&&row.status==='pending');
      const original=dataset.characters.find(row=>row.char==='百');
      if(!pending||!original)throw Error('M434 actual pending 百 fixture missing');
      (pending as unknown as Record<string,unknown>).scope=source.nameRules;
      const lookup=factory(source),input=fixture();let reentered=false;
      input.entries=new Proxy(input.entries,{
        getOwnPropertyDescriptor(target,key){
          if(key==='0'&&!reentered){
            reentered=true;
            const escaped=lookup.applicability(clone(original),context());
            expect(escaped.status).toBe('pending');expect(Array.isArray(escaped.scope)).toBe(true);
            (escaped.scope as unknown as ReviewedNameRule[]).push(clone(rule));
          }
          return Reflect.getOwnPropertyDescriptor(target,key);
        },
      });
      return{result:call(lookup,input),reentered};
    });
    expect(observed[0]).toEqual({result:rule,reentered:true});
    expect(observed[1]).toEqual(observed[0]);
  });

  it('preserves original factory outcome classes and fallback behavior for malformed arguments',()=>{
    type Built={value:unknown;getterReads:()=>number};
    const changed=(mutate:(source:SupplementalReviewTable)=>void):Built=>{
      const source=clone(published);mutate(source);return{value:source,getterReads:()=>0};
    };
    const cases:{label:string;build:()=>Built}[]=[
      {label:'null',build:()=>({value:null,getterReads:()=>0})},
      {label:'empty',build:()=>({value:{},getterReads:()=>0})},
      {label:'null review list',build:()=>changed(source=>{(source as unknown as Record<string,unknown>).meaningReviews=null;})},
      {label:'null review row',build:()=>changed(source=>{(source.meaningReviews as unknown[])[0]=null;})},
      {label:'missing rules',build:()=>changed(source=>{delete (source as unknown as Record<string,unknown>).nameRules;})},
      {label:'null rules',build:()=>changed(source=>{(source as unknown as Record<string,unknown>).nameRules=null;})},
      {label:'missing leaked scope',build:()=>changed(source=>{delete (source.meaningReviews[0] as unknown as Record<string,unknown>).scope;})},
      {label:'object leaked reason',build:()=>changed(source=>{(source.meaningReviews[0] as unknown as Record<string,unknown>).reason={not:'a string'};})},
      {label:'null applicability',build:()=>changed(source=>{(source.meaningReviews[0] as unknown as Record<string,unknown>).applicability=null;})},
      {label:'falsy approved binding false',build:()=>changed(source=>{
        const row=source.meaningReviews.find(value=>value.status==='approved');if(!row)throw Error('M434 actual approved row missing');
        (row as unknown as Record<string,unknown>).binding=false;
      })},
      {label:'falsy rules false',build:()=>changed(source=>{(source as unknown as Record<string,unknown>).nameRules=false;})},
      {label:'null name-rule readings',build:()=>changed(source=>{
        const selected=source.nameRules.find(value=>value.name===rule.name);if(!selected)throw Error('M434 actual rule missing');
        (selected as unknown as Record<string,unknown>).readings=null;
      })},
      {label:'cyclic',build:()=>changed(source=>{source.cycle=source;})},
      {label:'transparent source Proxy',build:()=>({value:new Proxy(clone(published),{}),getterReads:()=>0})},
      {label:'own source getter',build:()=>{
        const source=clone(published);let reads=0;
        Object.defineProperty(source,'nameRules',{enumerable:true,configurable:true,get(){reads++;return[];}});
        return{value:source,getterReads:()=>reads};
      }},
      {label:'own row getter',build:()=>{
        const source=clone(published);let reads=0;
        Object.defineProperty(source.meaningReviews[0],'scope',{enumerable:true,configurable:true,get(){reads++;return 'never execute';}});
        return{value:source,getterReads:()=>reads};
      }},
    ];
    for(const test of cases){
      const observed=factories.map(factory=>{
        const built=test.build();
        const result=outcome(()=>{
          const lookup=factory(built.value as SupplementalReviewTable),input=fixture();
          return{members:Object.keys(lookup).sort(),
            known:outcome(()=>call(lookup,input)),
            missing:outcome(()=>call(lookup,{...input,name:missingName}))};
        });
        return{result,getterReads:built.getterReads()};
      });
      expect(observed[1],test.label).toEqual(observed[0]);
      expect(observed[0].getterReads,test.label).toBe(0);
    }
  });
});


/** r2 sink witnesses: before=e07, after=r2, and v1=fixed dcbe are distinct MJS.
 * Only a caller-owned meanings Array Proxy replaces its own includes lookup.
 * No global intrinsic or production method is rewritten.
 */
const sinkFactories:Factory[]=[
  before.createNamingReviewLookup,after.createNamingReviewLookup,v1.createNamingReviewLookup,
];
function realInputFor(selected:ReviewedNameRule){
  const entries=selected.readings.map(binding=>{
    const found=dataset.characters.find(row=>row.char===binding.char);
    if(!found)throw Error('M434 r2 actual character missing: '+binding.char);return clone(found);
  });
  const found=dataset.citations.find(row=>row.id===selected.citation.id);
  if(!found)throw Error('M434 r2 actual citation missing');
  return{name:selected.name,entries,citations:[clone(found)],context:context()};
}
function includesSink(entry:CharacterRecord,binding:ReviewedNameRule['readings'][number],capture:(value:unknown)=>void){
  const reading=entry.readings?.find(value=>value.pinyin===binding.pinyin&&value.tone===binding.tone&&
    value.sourceId===binding.sourceId&&value.word===binding.dictionaryWord);
  if(!reading)throw Error('M434 r2 real complete selected reading missing');
  reading.meanings=new Proxy(reading.meanings,{
    get(target,key,receiver){
      if(key==='includes')return(needle:unknown)=>{capture(needle);return true;};
      return Reflect.get(target,key,receiver);
    },
  });
}
function guardedOriginalName(change:()=>void){
  const input=fixture();let entered=false;
  input.entries=new Proxy(input.entries,{
    getOwnPropertyDescriptor(target,key){
      if(key==='0'&&!entered){entered=true;change();}
      return Reflect.getOwnPropertyDescriptor(target,key);
    },
  });
  return{input,entered:()=>entered};
}
function assertSinkContrast(samples:{first:unknown;result:unknown;guardEntered:boolean;includesCalls:number;callerStillMissing:boolean}[]){
  expect(samples[0].result).toEqual(rule);expect(samples[0].guardEntered).toBe(true);
  expect(samples[1]).toEqual(samples[0]);
  expect(samples[2].first).toEqual(samples[0].first);
  expect(samples[2].result).toBeUndefined();expect(samples[2].guardEntered).toBe(false);
  expect(samples[2].result).not.toEqual(samples[0].result);
  for(const sample of samples){expect(sample.includesCalls).toBeGreaterThan(0);expect(sample.callerStillMissing).toBe(true);}
}
describe('M434 r2 includes-argument alias sinks distinguish immutable fallback from v1',()=>{
  it('falls back for meaning-review binding.dictionarySense leaked by applicability through caller includes',()=>{
    const samples=sinkFactories.map(factory=>{
      // Acyclic alias: a meaning-review row is outside nameRules.
      const source=clone(published);source.nameRules=source.nameRules.filter(row=>row.name!==rule.name);
      const row=source.meaningReviews.find(value=>value.char==='宜'&&value.status==='approved'&&value.binding);
      const original=dataset.characters.find(value=>value.char==='宜');
      if(!row?.binding||!original)throw Error('M434 r2 actual approved 宜 binding missing');
      const binding=clone(row.binding);
      (row.binding as unknown as Record<string,unknown>).dictionarySense=source.nameRules;
      const lookup=factory(source),entry=clone(original);let leaked:unknown,includesCalls=0;
      includesSink(entry,binding,value=>{leaked=value;includesCalls++;});
      const first=outcome(()=>lookup.applicability(entry,{...context(),givenName:rule.name}));
      if(!Array.isArray(leaked))throw Error('M434 before applicability did not expose the private includes argument');
      expect(leaked).not.toBe(source.nameRules);
      const privateRules=leaked as ReviewedNameRule[];
      expect(privateRules.some(value=>value.name===rule.name)).toBe(false);
      const guarded=guardedOriginalName(()=>privateRules.push(clone(rule)));
      const result=call(lookup,guarded.input);
      return{first,result,guardEntered:guarded.entered(),includesCalls,
        callerStillMissing:!source.nameRules.some(value=>value.name===rule.name)};
    });
    assertSinkContrast(samples);
  });
  it('falls back for name-rule reading.dictionarySense leaking an acyclic array sharing another nameRules member',()=>{
    const realCovered=published.nameRules.find(value=>value.name==='家邦');
    if(!realCovered)throw Error('M434 r2 actual 家邦 rule missing');
    const samples=sinkFactories.map(factory=>{
      const source=clone(published);source.nameRules=source.nameRules.filter(value=>value.name!==rule.name);
      const covered=source.nameRules.find(value=>value.name===realCovered.name);
      const target=source.nameRules.find(value=>value.name!==realCovered.name);
      if(!covered||!target)throw Error('M434 r2 actual two-rule alias fixture missing');
      // Direct A -> covered -> A would be cyclic and rejected by the original
      // factory. B=[T] is acyclic; T is shared with the real nameRules array A.
      const bridge=[target];
      (covered.readings[0] as unknown as Record<string,unknown>).dictionarySense=bridge;
      const lookup=factory(source),coveredInput=realInputFor(realCovered);let leaked:unknown,includesCalls=0;
      includesSink(coveredInput.entries[0],realCovered.readings[0],value=>{leaked=value;includesCalls++;});
      const first=outcome(()=>call(lookup,coveredInput));
      if(!Array.isArray(leaked)||!leaked[0])throw Error('M434 before covered lookup did not expose its private includes argument');
      expect(first.status).toBe('returned');if(first.status==='returned')expect(first.value).toBeDefined();
      expect(leaked).not.toBe(bridge);expect(leaked[0]).not.toBe(target);
      const privateTarget=leaked[0] as unknown as Record<string,unknown>;
      const guarded=guardedOriginalName(()=>{
        for(const key of Object.keys(privateTarget))delete privateTarget[key];
        Object.assign(privateTarget,clone(rule));
      });
      const result=call(lookup,guarded.input);
      return{first,result,guardEntered:guarded.entered(),includesCalls,
        callerStillMissing:!source.nameRules.some(value=>value.name===rule.name)};
    });
    assertSinkContrast(samples);
  });
});
