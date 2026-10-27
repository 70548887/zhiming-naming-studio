import {describe,expect,it} from 'vitest';
import {resolve} from 'node:path';
import {readFileSync} from 'node:fs';
import {calculateYueNameReading,confirmYueNameReading,isCanonicalYueNameReading,parseJyutpingInput,yueReadingSelections} from '../src/domain/yue-reading';
import {loadYueReadingData} from '../src/main/yue-reading-data';
import type {YueNameReading,YueReadingSelection} from '../src/shared/types';

const {data}=loadYueReadingData(resolve('data'));
const family=(tokens:string[]):YueReadingSelection=>({tokens,origin:'user',confirmed:true});
const dictionary=(name:YueNameReading,index:'surname'|number,reading:string):YueReadingSelection=>{
 const unit=index==='surname'?name.surname:name.given[index],candidate=unit.candidates.find(row=>row.tokens.join(' ')===reading)!;
 if(!candidate)throw new Error('Fixture reading not in fixed dictionary: '+reading);
 return{tokens:[...candidate.tokens],origin:'dictionary',confirmed:true,dictionaryId:candidate.id};
};

describe('fixed Cantonese reading reference',()=>{
 it('provides candidates for every current naming glyph without confirming even one unique candidate',()=>{
  const dataset=JSON.parse(readFileSync(resolve('data/dataset.json'),'utf8')) as {characters:{char:string}[]};
  expect(dataset.characters).toHaveLength(779);
  for(const {char}of dataset.characters){const result=calculateYueNameReading('陳',char,data);expect(result.given[0].candidates.length,char).toBeGreaterThan(0);expect(result.given[0].selection).toBeUndefined();expect(result.status).toBe('unconfirmed');expect(result.fullNameTokens).toEqual([]);}
 });
 it('preserves input simplified glyph and exact original dictionary glyph and locator',()=>{
  const result=calculateYueNameReading('区','乐',data);
  expect(result.surname.text).toBe('区');expect(result.surname.candidates.some(row=>row.text==='區'&&row.tokens[0]==='au1')).toBe(true);
  expect(result.given[0].text).toBe('乐');expect(result.given[0].candidates.some(row=>row.text==='樂'&&row.tokens[0]==='ngok6')).toBe(true);
  expect(result.given[0].candidates.every(row=>row.sourceId==='rime-cantonese-jyutping'&&row.sourceLine>0&&row.id===`rime-yue:char:${row.sourceLine}`)).toBe(true);
 });
 it('uses explicit compound surname phrase and never assembles single-character alternatives',()=>{
  const result=calculateYueNameReading('欧阳','安',data);
  expect(result.surname.candidates.map(row=>row.tokens.join(' '))).toEqual(['au1 joeng4']);
  expect(result.surname.candidates[0].sourceFile).toBe('jyut6ping3.words.dict.yaml');
  expect(calculateYueNameReading('万俟','安',data).surname.candidates).toEqual([]);
 });
 it('never converts missing surname candidate into a positive or safety conclusion',()=>{
  const result=calculateYueNameReading('万俟','安',data);expect(result.status).toBe('unconfirmed');expect(result.fullNameTokens).toEqual([]);
  expect(result.limitations.join('')).toContain('未实现');expect(result.limitations.join('')).toContain('不作谐音安全');
 });
 it('allows partial confirmation and only publishes full-name tokens when all units are confirmed',()=>{
  const base=calculateYueNameReading('陈','安宁',data);
  const partial=confirmYueNameReading(base,{surname:dictionary(base,'surname','can4'),given:[null,dictionary(base,1,'ning4')]});
  expect(partial.status).toBe('partial');expect(partial.fullNameTokens).toEqual([]);expect(base.surname.selection).toBeUndefined();
  const complete=confirmYueNameReading(partial,{surname:dictionary(base,'surname','can4'),given:[dictionary(base,0,'on1'),dictionary(base,1,'ning4')]});
  expect(complete.status).toBe('confirmed');expect(complete.fullNameTokens).toEqual(['can4','on1','ning4']);
  expect(confirmYueNameReading(complete,{surname:null,given:[null,null]}).status).toBe('unconfirmed');
 });
 it('marks family-entered compound reading as user input without a borrowed dictionary source',()=>{
  const base=calculateYueNameReading('万俟','安',data);
  const result=confirmYueNameReading(base,{surname:family(['maan6','zi6']),given:[dictionary(base,0,'on1')]});
  expect(result.surname.selection).toEqual({tokens:['maan6','zi6'],origin:'user',confirmed:true});
  expect(result.status).toBe('confirmed');expect(result.surname.candidates).toEqual([]);expect(result.surname.selection).not.toHaveProperty('dictionaryId');
 });
 it('rejects a dictionary identifier from another name unit and mismatched dictionary tokens',()=>{
  const base=calculateYueNameReading('陈','安宁',data);
  expect(()=>confirmYueNameReading(base,{surname:dictionary(base,0,'on1'),given:[null,null]})).toThrow('候选不一致');
  expect(()=>confirmYueNameReading(base,{surname:{...dictionary(base,'surname','can4'),tokens:['can1']},given:[null,null]})).toThrow('候选不一致');
 });
 it('rejects manual source claims, omitted units and explicit false confirmation',()=>{
  const base=calculateYueNameReading('陈','安',data);
  expect(()=>confirmYueNameReading(base,{surname:{...family(['can4']),dictionaryId:'rime-yue:char:1'},given:[null]})).toThrow('不能附带字典来源');
  expect(()=>confirmYueNameReading(base,{surname:null,given:[]})).toThrow('完整');
  expect(()=>confirmYueNameReading(base,{surname:{...family(['can4']),confirmed:false} as never,given:[null]})).toThrow('不完整');
 });
 it('validates exact snapshots against name, candidates, source and all derived text',()=>{
  const base=calculateYueNameReading('陈','安',data);
  const result=confirmYueNameReading(base,{surname:dictionary(base,'surname','can4'),given:[family(['on1'])]});
  expect(isCanonicalYueNameReading(result,'陈','安',data)).toBe(true);
  expect(isCanonicalYueNameReading(result,'林','安',data)).toBe(false);
  for(const mutate of [
   (value:YueNameReading)=>{value.status='unconfirmed';},
   (value:YueNameReading)=>{value.fullNameTokens=['can4','on2'];},
   (value:YueNameReading)=>{value.surname.candidates[0].sourceLine++;},
   (value:YueNameReading)=>{value.given[0].candidates=[];},
   (value:YueNameReading)=>{value.limitations=[];},
   (value:YueNameReading)=>{value.sourceIds=[];},
   (value:YueNameReading)=>{(value as unknown as Record<string,unknown>).safe=true;},
  ]){const invalid=structuredClone(result);mutate(invalid);expect(isCanonicalYueNameReading(invalid,'陈','安',data)).toBe(false);}
  const selected=yueReadingSelections(result);selected.surname!.tokens[0]='can1';expect(result.surname.selection!.tokens).toEqual(['can4']);
 });
 it('rejects non-Han inputs and incompatible source version',()=>{
  expect(()=>calculateYueNameReading('Chan','安',data)).toThrow('汉字');
  expect(()=>calculateYueNameReading('陈','安宁宁',data)).toThrow('汉字');
  expect(()=>calculateYueNameReading('陈','安',{...data,sourceVersion:'old'} as never)).toThrow('版本');
 });
});

describe('explicit Jyutping input',()=>{
 it('normalizes only ASCII case and whitespace',()=>{expect(parseJyutpingInput('  AU1\tJOENG4  ',2)).toEqual(['au1','joeng4']);});
 it.each(['au joeng','au7 joeng4','au0 joeng4','au¹ joeng⁴','aú1 joeng4','au1-joeng4','au1 joeng4 extra1','','au1'])('rejects incomplete or noncanonical two-syllable input %s',input=>{expect(()=>parseJyutpingInput(input,2)).toThrow();});
 it('bounds the complete input and each explicit syllable before confirmation',()=>{
  expect(()=>parseJyutpingInput(' '.repeat(79)+'a1',1)).toThrow('80字符');
  expect(()=>parseJyutpingInput('a'.repeat(16)+'1',1)).toThrow();
  const base=calculateYueNameReading('陈','安',data);
  expect(()=>confirmYueNameReading(base,{surname:family(['a'.repeat(16)+'1']),given:[null]})).toThrow('音节数不符');
 });
});

describe('Cantonese JSON preflight',()=>{
 const base=()=>calculateYueNameReading('陈','安',data);
 const full=()=>{const initial=base();return confirmYueNameReading(initial,{surname:dictionary(initial,'surname','can4'),given:[family(['on1'])]});};
 it('rejects sparse name/token/candidate arrays instead of skipping holes',()=>{
  for(const mutate of [
   (value:YueNameReading)=>{delete value.given[0];},
   (value:YueNameReading)=>{delete value.surname.selection!.tokens[0];},
   (value:YueNameReading)=>{delete value.given[0].candidates[0];},
  ]){const value=full();mutate(value);expect(isCanonicalYueNameReading(value,'陈','安',data)).toBe(false);}
  const sparse=new Array(1) as Array<YueReadingSelection|null>;
  expect(()=>confirmYueNameReading(base(),{surname:null,given:sparse})).toThrow('空位');
 });
 it('rejects array extras, symbols and hidden fields even when JSON.stringify would erase them',()=>{
  for(const mutate of [
   (value:YueNameReading)=>{Object.assign(value.given,{extra:true});},
   (value:YueNameReading)=>{Object.assign(value.fullNameTokens,{extra:true});},
   (value:YueNameReading)=>{Object.defineProperty(value,'hidden',{value:true,enumerable:false});},
   (value:YueNameReading)=>{Object.defineProperty(value,Symbol('extra'),{value:true});},
  ]){const value=full();mutate(value);expect(isCanonicalYueNameReading(value,'陈','安',data)).toBe(false);}
  const tokens=['can4'];Object.assign(tokens,{extra:true});
  expect(()=>confirmYueNameReading(base(),{surname:family(tokens),given:[null]})).toThrow('额外字段');
 });
 it('rejects accessors at snapshot, selection and token levels without invoking their getters',()=>{
  let calls=0;
  const value=full();Object.defineProperty(value,'surname',{enumerable:true,get(){calls++;return base().surname;}});
  expect(isCanonicalYueNameReading(value,'陈','安',data)).toBe(false);
  expect(()=>yueReadingSelections(value)).toThrow('访问器');
  const selection=family(['can4']);Object.defineProperty(selection,'tokens',{enumerable:true,get(){calls++;return ['can4'];}});
  expect(()=>confirmYueNameReading(base(),{surname:selection,given:[null]})).toThrow('访问器');
  const tokens=['can4'];Object.defineProperty(tokens,'0',{enumerable:true,get(){calls++;return 'can4';}});
  expect(()=>confirmYueNameReading(base(),{surname:family(tokens),given:[null]})).toThrow('访问器');
  const changedData=structuredClone(data);Object.defineProperty(changedData,'version',{enumerable:true,get(){calls++;return data.version;}});
  expect(()=>calculateYueNameReading('陈','安',changedData)).toThrow('访问器');
  expect(calls).toBe(0);
 });
 it('rejects custom object/array prototypes, undefined values, cycles and non-JSON values',()=>{
  for(const mutate of [
   (value:YueNameReading)=>{Object.setPrototypeOf(value.surname,{family:'custom'});},
   (value:YueNameReading)=>{Object.setPrototypeOf(value.given,{});},
   (value:YueNameReading)=>{Object.assign(value,{extra:undefined});},
   (value:YueNameReading)=>{Object.assign(value,{extra:new Date()});},
   (value:YueNameReading)=>{Object.assign(value,{extra:value});},
   (value:YueNameReading)=>{Object.assign(value,{extra:Infinity});},
  ]){const value=full();mutate(value);expect(isCanonicalYueNameReading(value,'陈','安',data)).toBe(false);}
  expect(()=>confirmYueNameReading(base(),{surname:undefined,given:[null]} as never)).toThrow('未定义');
  const inherited=Object.assign(Object.create({other:true}),family(['can4']));
  expect(()=>confirmYueNameReading(base(),{surname:inherited,given:[null]})).toThrow('原型');
 });
 it('keeps returned confirmation and selector arrays ordinary dense JSON without sharing caller arrays',()=>{
  const initial=base(),tokens=['can4'];const confirmed=confirmYueNameReading(initial,{surname:family(tokens),given:[family(['on1'])]});
  tokens[0]='can1';expect(confirmed.surname.selection!.tokens).toEqual(['can4']);
  const selected=yueReadingSelections(confirmed);expect(Object.getPrototypeOf(selected)).toBe(Object.prototype);expect(Object.getPrototypeOf(selected.given)).toBe(Array.prototype);
  expect(Reflect.ownKeys(selected.given)).toEqual(['0','length']);expect(isCanonicalYueNameReading(confirmed,'陈','安',data)).toBe(true);
 });
});
