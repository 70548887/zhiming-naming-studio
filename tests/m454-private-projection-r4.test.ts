/** R4 exact-private-region regression only. No Store issuer, source authority
 * or replay capability is exposed by the extracted calculation fixture.
 * Existing genuine push/Store regression remains a separate integration proof. */
import {beforeAll,describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {
  projectCitationDependencies as project,projectionIntrinsicsIntact,
  CitationReplayIneligible,actualMainSHA256,actualProjectionRegionSHA256,
} from './fixtures/m454-projection-r4';

const mainPin='3c6190d549c5fd03b97d7776674475f1fc086c3b7a2380569c45edd9096552c9';
const fixturePin='4034c22029ba1b592acef58a7cecebd8b7e7197aa3faf825b84bb4fb2e6d1ee5';
const regionPin='b02407f77f0c25f0ccff175206061103cf5dc6217a8d2ecd2f2d50d99f023020';
const descriptor=Object.getOwnPropertyDescriptor,defineOwn=Object.defineProperty,deleteOwn=Reflect.deleteProperty;
const nativePush=descriptor(Array.prototype,'push')!.value as (...args:unknown[])=>number;
const call=Function.prototype.call,apply=Function.prototype.apply,bind=Function.prototype.bind;
const invoke=bind.call(call,apply) as unknown as (fn:Function,receiver:unknown,args:unknown[])=>unknown;
const digest=(value:Uint8Array|string)=>createHash('sha256').update(value).digest('hex');
function restoreOwn(target:object,key:PropertyKey,original:PropertyDescriptor|undefined):void {
  if(original)defineOwn(target,key,original);
  else if(!deleteOwn(target,key))throw new Error('M454 R4 could not restore an own descriptor');
}
function region(text:string,start:string,end:string):string {
  const normalized=text.replace(/\r\n/g,'\n'),first=normalized.indexOf(start),last=normalized.indexOf(end,first);
  if(first<0||last<=first||first!==normalized.lastIndexOf(start))throw new Error('M454 R4 private source region is not uniquely bound');
  return normalized.slice(first,last);
}
function citationValue(text='original text'){
  return{id:'r4-citation',sourceId:'r4-pure-input',title:'full title',chapter:'chapter',text,details:{reading:{pinyin:'ān',tone:1},approved:false}};
}
type Projected={rows:unknown[];map:{mapEntries:Array<[unknown,Record<string,unknown>]>}};

beforeAll(()=>{
  const main=readFileSync(new URL('../src/main/candidate-facts.ts',import.meta.url));
  const fixture=readFileSync(new URL('./fixtures/m454-projection-r4.ts',import.meta.url));
  expect(actualMainSHA256).toBe(mainPin);expect(actualProjectionRegionSHA256).toBe(regionPin);
  expect(digest(main)).toBe(mainPin);expect(digest(fixture)).toBe(fixturePin);
  expect(digest(region(main.toString('utf8'),'const replayOwnDescriptor=','const initialCryptoDescriptor='))).toBe(regionPin);
  expect(digest(region(fixture.toString('utf8'),'const replayOwnDescriptor=','\nexport {dependencyValue as projectCitationDependencies'))).toBe(regionPin);
  expect(projectionIntrinsicsIntact()).toBe(true);
});

describe('M454 R4 private dependency projection',()=>{
  it('fully projects under an inherited numeric setter without calling it or inheriting it on private growth arrays',()=>{
    const input={rows:[1,{label:'second',nested:[true,'kept']}],map:new Map([['first',citationValue()],['second',citationValue('second text')]])};
    const expected=project(input),original=descriptor(Array.prototype,'0');
    let setterCalls=0,intact=false,actual:unknown,failure:unknown;
    try{
      defineOwn(Array.prototype,'0',{configurable:true,enumerable:false,set(_value:unknown){setterCalls++;}});
      try{intact=projectionIntrinsicsIntact();actual=project(input);}
      catch(error){failure=error;}
    }finally{restoreOwn(Array.prototype,'0',original);}
    // The hook has been restored before any framework assertion/serialization.
    expect(descriptor(Array.prototype,'0')).toEqual(original);
    expect(failure).toBeUndefined();expect(intact).toBe(true);expect(setterCalls).toBe(0);
    expect(isDeepStrictEqual(actual,expected)).toBe(true);
    const output=actual as Projected;
    expect(output.rows.length).toBe(2);expect(output.rows[0]).toBe(1);
    expect((output.rows[1] as {label:string}).label).toBe('second');
    expect(output.map.mapEntries.length).toBe(2);
    expect(output.map.mapEntries[0][0]).toBe('first');
    expect(output.map.mapEntries[0][1].text).toBe('original text');
    expect(output.map.mapEntries[1][0]).toBe('second');
    expect(output.map.mapEntries[1][1].text).toBe('second text');
    expect(Object.getPrototypeOf(output.rows)).toBeNull();
    expect(Object.getPrototypeOf((output.rows[1] as {nested:unknown[]}).nested)).toBeNull();
    expect(Object.getPrototypeOf(output.map.mapEntries)).toBeNull();
    expect(Object.getPrototypeOf(input.rows)).toBe(Array.prototype);
  });

  it('does not let a changed push wrapper drop private output and declines the real Map projection gate',()=>{
    const input=[citationValue(),{nested:[1,2,3]}],expected=project(input);
    const map=new Map([['target',citationValue()]]),original=descriptor(Array.prototype,'push');
    if(!original||!('value'in original)||original.value!==nativePush)throw new Error('M454 R4 needs a restorable native push');
    let pushCalls=0,droppedPairs=0,witnessDrops=0,witnessLength=-1;
    let intact=true,actual:unknown,arrayFailure:unknown,mapFailure:unknown;
    const wrapper=function(this:unknown,...args:unknown[]){
      pushCalls++;
      const pair=args.length===1?args[0]:undefined;
      if(Array.isArray(pair)&&pair.length===2&&pair[0]==='target'){
        droppedPairs++;return (this as {length:number}).length;
      }
      return invoke(nativePush,this,args);
    };
    try{
      defineOwn(Array.prototype,'push',{...original,value:wrapper});
      const witness:unknown[]=[];witness.push(['target',citationValue()]);
      witnessDrops=droppedPairs;witnessLength=witness.length;pushCalls=0;droppedPairs=0;
      intact=projectionIntrinsicsIntact();
      try{actual=project(input);}catch(error){arrayFailure=error;}
      try{project(map);}catch(error){mapFailure=error;}
    }finally{restoreOwn(Array.prototype,'push',original);}
    expect(descriptor(Array.prototype,'push')).toEqual(original);
    expect(witnessDrops).toBe(1);expect(witnessLength).toBe(0);
    expect(intact).toBe(false);expect(arrayFailure).toBeUndefined();
    expect(isDeepStrictEqual(actual,expected)).toBe(true);
    expect((actual as unknown[]).length).toBe(2);
    expect(((actual as unknown[])[0] as {text:string}).text).toBe('original text');
    expect(Object.getPrototypeOf(actual)).toBeNull();
    expect(Object.getPrototypeOf(((actual as unknown[])[1] as {nested:unknown[]}).nested)).toBeNull();
    expect(mapFailure).toBeInstanceOf(CitationReplayIneligible);
    expect(pushCalls).toBe(0);expect(droppedPairs).toBe(0);
    expect(projectionIntrinsicsIntact()).toBe(true);
  });

  it('rejects cycles and malformed containers, accepts shared aliases, and preserves ordered Map entries with every nested field',()=>{
    const shared={text:'same',nested:{tone:1,flags:[true,false]}};
    const aliases={left:shared,right:shared};
    const expanded={left:{text:'same',nested:{tone:1,flags:[true,false]}},right:{text:'same',nested:{tone:1,flags:[true,false]}}};
    expect(isDeepStrictEqual(project(aliases),project(expanded))).toBe(true);
    const cycle:{self?:unknown}={};cycle.self=cycle;
    expect(()=>project(cycle)).toThrow(CitationReplayIneligible);

    const original=new Map([['first',citationValue()],['second',citationValue('other text')]]);
    const same=new Map([['first',citationValue()],['second',citationValue('other text')]]);
    const reordered=new Map([['second',citationValue('other text')],['first',citationValue()]]);
    const changedValue=citationValue();changedValue.details.reading.tone=2;
    const changed=new Map([['first',changedValue],['second',citationValue('other text')]]);
    expect(isDeepStrictEqual(project(original),project(same))).toBe(true);
    expect(isDeepStrictEqual(project(original),project(reordered))).toBe(false);
    expect(isDeepStrictEqual(project(original),project(changed))).toBe(false);

    const hole=new Array(1);expect(()=>project({ancestor:{hole}})).toThrow(CitationReplayIneligible);
    let getterCalls=0;const accessor={};
    defineOwn(accessor,'field',{enumerable:true,get(){getterCalls++;throw new Error('M454 R4 accessor must not run');}});
    expect(()=>project({ancestor:accessor})).toThrow(CitationReplayIneligible);
    expect(getterCalls).toBe(0);
  });
});
