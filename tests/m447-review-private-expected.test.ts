/**
 * M447 private expected canonical reuse: independent 079a before vs candidate.
 * The before MJS is an exact 079a/17300B readonly copy with no runtime imports.
 * Type-only sidecar reuse does not load the candidate as the before evaluator.
 * Real data is shared by bytes and cloned separately for the two factories.
 * Historical M434's exact eight-case suite remains a separate unchanged file.
 * No timers, budget/filter changes, Store, source worker, authority or producer.
 */
import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import * as before from './fixtures/m447-before-naming-review-v7.mjs';
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
const foundRule=published.nameRules.find(value=>value.name==='宜家');
if(!foundRule)throw Error('M447 actual 宜家 rule is missing');
const rule:ReviewedNameRule=foundRule;
const missingName='甲乙';
if(published.nameRules.some(value=>value.name===missingName))throw Error('M447 missing-name fixture is now covered');
const context=():TrustedNamingContext=>({
  packSha256:published.base.knowledgePackSha256,
  activeVersion:published.base.knowledgePackSha256.slice(0,12),
});
function character(char:string){
  const value=dataset.characters.find(entry=>entry.char===char);
  if(!value)throw Error('M447 actual character missing: '+char);return clone(value);
}
function inputFor(selected:ReviewedNameRule=rule){
  const citation=dataset.citations.find(value=>value.id===selected.citation.id);
  if(!citation)throw Error('M447 actual citation missing');
  return{name:selected.name,entries:selected.readings.map(value=>character(value.char)),
    citations:[clone(citation)],context:context()};
}
function call(lookup:Lookup,input:Query){
  return lookup.lookupCitation(input.name as string,input.entries as CharacterRecord[],
    input.citations as CitationRecord[],input.context as TrustedNamingContext);
}
function outcome(run:()=>unknown){
  try{return{status:'returned' as const,value:run()};}
  catch(error){return{status:'thrown' as const,name:error instanceof Error?error.name:typeof error,
    message:error instanceof Error?error.message:String(error)};}
}

describe('M447 independent 079a private-expected canonical equivalence',()=>{
  it('keeps real covered rules and the existing unknown early-miss public boundary equal',()=>{
    const observed=factories.map(factory=>{
      const lookup=factory(clone(published));
      const known=published.nameRules.map(selected=>({name:selected.name,result:outcome(()=>call(lookup,inputFor(selected)))}));
      const input=inputFor();let descriptorReads=0,getters=0;
      const citations=new Proxy(clone(dataset.citations),{
        getOwnPropertyDescriptor(target,key){descriptorReads++;return Reflect.getOwnPropertyDescriptor(target,key);},
      });
      const missing=outcome(()=>call(lookup,{...input,name:missingName,citations}));
      const invalidName=outcome(()=>call(lookup,{...input,name:'a!'}));
      const invalidContext=outcome(()=>call(lookup,{...input,context:{...context(),activeVersion:'wrong'}}));
      Object.defineProperty(input.entries[0],'pinyin',{configurable:true,enumerable:true,get(){getters++;return 'never read';}});
      const ownAccessor=outcome(()=>call(lookup,input));
      const sparse=outcome(()=>call(lookup,{...inputFor(),citations:new Array(1)}));
      const throwingProxy=outcome(()=>call(lookup,{...inputFor(),context:new Proxy(context(),{
        getOwnPropertyDescriptor(){throw Error('M447 controlled caller descriptor failure');},
      })}));
      return{known,missing,invalidName,invalidContext,ownAccessor,sparse,throwingProxy,descriptorReads,getters};
    });
    expect(observed[1]).toEqual(observed[0]);
    for(const sample of observed){
      // Both 079a and M447 already contain early miss. There is no strict
      // before>after count claim here; M434's e07 comparison stays unchanged.
      expect(sample.descriptorReads).toBe(0);expect(sample.getters).toBe(0);
      expect(sample.missing).toEqual({status:'returned',value:undefined});
      expect(sample.invalidContext).toEqual({status:'returned',value:undefined});
      expect(sample.ownAccessor).toEqual({status:'returned',value:undefined});
      for(const row of sample.known)expect(row.result.status).toBe('returned');
      expect(sample.known.find(row=>row.name===rule.name)?.result).toEqual({status:'returned',value:rule});
    }
  });

  it('rechecks warmed same-identity nested callers across meaning, review and citation entry points',()=>{
    const observed=factories.map(factory=>{
      const lookup=factory(clone(published)),input=inputFor(),entry=input.entries[0];
      const namedContext={...input.context,givenName:rule.name};
      const captures:{step:string;value:unknown}[]=[];
      const read=(step:string)=>captures.push({step,value:{
        applicability:lookup.applicability(entry,namedContext),
        meaning:lookup.lookupMeaning(entry,namedContext),
        review:lookup.reviewMeaning(entry,namedContext),
        describe:lookup.describeReview(entry,namedContext),
        citation:call(lookup,input),
        pendingReview:lookup.reviewMeaning(character('百'),namedContext),
      }});
      read('cold');read('warm');
      const binding=rule.readings[0],selected=entry.readings?.find(value=>
        value.pinyin===binding.pinyin&&value.tone===binding.tone&&value.sourceId===binding.sourceId&&value.word===binding.dictionaryWord);
      if(!selected)throw Error('M447 actual selected reading missing');
      const meanings=selected.meanings;selected.meanings=[...meanings,'M447 nested tamper'];read('reading-tamper');
      selected.meanings=meanings;read('reading-restored');
      const readings=entry.readings;if(!readings)throw Error('M447 actual readings missing');
      readings.push(clone(selected));read('duplicate-reading-tamper');readings.pop();read('duplicate-restored');
      const readingIndex=readings.indexOf(selected);
      readings[readingIndex]=Object.fromEntries(Object.entries(selected).reverse()) as typeof selected;
      read('reordered-record-keys');readings[readingIndex]=selected;
      const text=input.citations[0].text;input.citations[0].text+='M447 caller citation tamper';read('citation-tamper');
      input.citations[0].text=text;read('citation-restored');
      const version=input.context.activeVersion;input.context.activeVersion='wrong';namedContext.activeVersion='wrong';read('context-tamper');
      input.context.activeVersion=version;namedContext.activeVersion=version;read('context-restored');
      let getterReads=0;const descriptor=Object.getOwnPropertyDescriptor(selected,'meanings');
      if(!descriptor)throw Error('M447 original meanings descriptor missing');
      Object.defineProperty(selected,'meanings',{enumerable:true,configurable:true,get(){getterReads++;return meanings;}});
      read('nested-getter-tamper');expect(getterReads).toBe(0);
      Object.defineProperty(selected,'meanings',descriptor);read('getter-restored');
      return{captures,getterReads};
    });
    expect(observed[1]).toEqual(observed[0]);
    for(const sample of observed){
      const first=sample.captures[0].value;
      expect(sample.captures[1].value).toEqual(first);expect(sample.getterReads).toBe(0);
      for(const capture of sample.captures){
        const value=capture.value as {citation:unknown};
        if(capture.step.endsWith('tamper'))expect(value.citation,capture.step).toBeUndefined();
        else expect(value.citation,capture.step).toEqual(rule);
      }
    }
  });

  it('uses fresh expected canonical on the unsafe scope-to-private-citation alias after warmup',()=>{
    const observed=factories.map(factory=>{
      // Acyclic adversarial factory input: a review row outside nameRules
      // points directly to the real rule's citation object. No authority claim.
      const source=clone(published);
      const pending=source.meaningReviews.find(value=>value.char==='百'&&value.status==='pending');
      const selected=source.nameRules.find(value=>value.name===rule.name);
      if(!pending||!selected)throw Error('M447 actual alias endpoints missing');
      (pending as unknown as Record<string,unknown>).scope=selected.citation;
      const lookup=factory(source),input=inputFor();
      const first=call(lookup,input),warm=call(lookup,input);
      const exposed=lookup.applicability(character('百'),context());
      expect(exposed.status).toBe('pending');
      const privateCitation=exposed.scope as unknown as CitationRecord;
      expect(privateCitation).toEqual(rule.citation);
      expect(privateCitation).not.toBe(selected.citation);
      const original=privateCitation.text;privateCitation.text+='M447 private alias tamper';
      const callerUnchanged=call(lookup,input);
      input.citations[0].text=privateCitation.text;
      const callerMatchesNewExpected=call(lookup,input);
      privateCitation.text=original;input.citations[0].text=original;
      const restored=call(lookup,input);
      return{first,warm,callerUnchanged,callerMatchesNewExpected,restored,
        externalSourceUnchanged:source.nameRules.find(value=>value.name===rule.name)?.citation.text===rule.citation.text};
    });
    expect(observed[1]).toEqual(observed[0]);
    for(const sample of observed){
      expect(sample.first).toEqual(rule);expect(sample.warm).toEqual(rule);
      expect(sample.callerUnchanged).toBeUndefined();
      expect(sample.callerMatchesNewExpected).toEqual({
        ...rule,citation:{...rule.citation,text:rule.citation.text+'M447 private alias tamper'},
      });
      expect(sample.restored).toEqual(rule);expect(sample.externalSourceUnchanged).toBe(true);
    }
  });

  it('retains first-match rules and clone isolation while dynamic caller Proxies remain fresh',()=>{
    const observed=factories.map(factory=>{
      const source=clone(published),duplicate=clone(rule);
      duplicate.context='M447 second duplicate never replaces first';source.nameRules.push(duplicate);
      const lookup=factory(source),input=inputFor(),first=call(lookup,input);
      expect(first).toEqual(rule);if(!first)throw Error('M447 missing original rule');
      first.citation.text='M447 returned clone poison';first.readings[0].dictionarySense='M447 returned binding poison';
      const own=source.nameRules.find(value=>value.name===rule.name);if(!own)throw Error('M447 original source missing');
      own.citation.text='M447 caller source poison';
      const target=input.citations[0];let text=target.text,descriptorReads=0;
      input.citations[0]=new Proxy(target,{
        getOwnPropertyDescriptor(record,key){descriptorReads++;return Reflect.getOwnPropertyDescriptor(record,key);},
        get(record,key,receiver){return key==='text'?text:Reflect.get(record,key,receiver);},
      });
      const steps:{result:unknown;descriptorReads:number}[]=[];
      const read=()=>{descriptorReads=0;steps.push({result:call(lookup,input),descriptorReads});};
      read();text+='M447 live Proxy text';read();text=target.text;read();
      return steps;
    });
    expect(observed[1]).toEqual(observed[0]);
    for(const steps of observed){
      expect(steps[0].result).toEqual(rule);expect(steps[1].result).toBeUndefined();expect(steps[2].result).toEqual(rule);
      for(const step of steps)expect(step.descriptorReads).toBeGreaterThan(0);
    }
  });

  it('preserves malformed factory outcomes and deferred expected-side failures without eager throws',()=>{
    const mutations:{label:string;mutate:(source:SupplementalReviewTable)=>void}[]=[
      {label:'missing private citation',mutate:source=>{
        const selected=source.nameRules.find(value=>value.name===rule.name);
        if(!selected)throw Error('M447 actual rule missing');delete (selected as unknown as Record<string,unknown>).citation;
      }},
      {label:'invalid private baseline readings',mutate:source=>{
        const selected=source.baselineCharacters.find(value=>value.char===rule.readings[0].char);
        if(!selected)throw Error('M447 actual baseline missing');(selected as unknown as Record<string,unknown>).readings=false;
      }},
      {label:'falsy approved binding',mutate:source=>{
        const selected=source.meaningReviews.find(value=>value.char==='宜');
        if(!selected)throw Error('M447 actual reviewed row missing');(selected as unknown as Record<string,unknown>).binding=false;
      }},
      {label:'null rules',mutate:source=>{(source as unknown as Record<string,unknown>).nameRules=null;}},
    ];
    for(const {label,mutate} of mutations){
      const observed=factories.map(factory=>{
        const source=clone(published);mutate(source);
        return outcome(()=>{
          const lookup=factory(source),input=inputFor();
          const known=outcome(()=>call(lookup,input));
          const emptyCitations=outcome(()=>call(lookup,{...input,citations:[]}));
          // Original Array.some visits no citation, so its expected-side
          // canonical operand must remain uncomputed on an empty list.
          const missing=outcome(()=>call(lookup,{...input,name:missingName}));
          const meaning=outcome(()=>lookup.reviewMeaning(input.entries[0],input.context));
          let getterReads=0,proxyReads=0;
          const badEntry=clone(input.entries[0]);
          Object.defineProperty(badEntry,'pinyin',{enumerable:true,configurable:true,get(){getterReads++;return 'never execute';}});
          const actualGetter=outcome(()=>call(lookup,{...input,entries:[badEntry,input.entries[1]]}));
          const actualProxy=outcome(()=>call(lookup,{...input,entries:new Proxy(input.entries,{
            getOwnPropertyDescriptor(){proxyReads++;throw Error('M447 actual guard stops before expected comparison');},
          })}));
          expect(getterReads).toBe(0);
          return{known,emptyCitations,missing,meaning,actualGetter,actualProxy,getterReads,proxyReads};
        });
      });
      expect(observed[1],label).toEqual(observed[0]);
      // These are plain JSON but incomplete internals: old 079a constructs the
      // lookup and reports its unsupported query at the original lazy boundary.
      expect(observed[0].status,label).toBe('returned');
    }
  });
});
