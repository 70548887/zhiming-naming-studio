import {describe,expect,it} from 'vitest';
import {resolve} from 'node:path';
import {readFileSync} from 'node:fs';
import {loadYueReadingData} from '../src/main/yue-reading-data';
import {loadYueHomophoneData} from '../src/main/yue-homophone-data';
import {calculateYueNameReading,confirmYueNameReading} from '../src/domain/yue-reading';
import {calculateYueHomophoneReview,isCanonicalYueHomophoneReview} from '../src/domain/yue-homophones';
import type {YueNameReading,YueReadingSelection} from '../src/shared/types';
import type {YueHomophoneReview} from '../src/shared/yue-homophone-types';

const {data:readingData}=loadYueReadingData(resolve('data')),{data}=loadYueHomophoneData(resolve('data'));
const family=(tokens:string[]):YueReadingSelection=>({tokens,origin:'user',confirmed:true});
function confirmed(surname:string,given:string,tokens:string[],unconfirmed:number[]=[]):YueNameReading{
 const surnameLength=[...surname].length,initial=calculateYueNameReading(surname,given,readingData);
 return confirmYueNameReading(initial,{surname:unconfirmed.includes(0)?null:family(tokens.slice(0,surnameLength)),given:[...given].map((_,index)=>unconfirmed.includes(index+surnameLength)?null:family([tokens[index+surnameLength]]))});
}
// Artificial names with independently chosen source-attested character tokens, not surname or connected-speech proof.
const cases=[
 {id:'strict-epidemic',surname:'溫',given:'奕',tokens:['wan1','jik6'],expected:[['瘟疫','exact']]},
 {id:'different-final-epidemic',surname:'溫',given:'逸',tokens:['wan1','jat6'],expected:[]},
 {id:'different-initial-epidemic',surname:'文',given:'奕',tokens:['man4','jik6'],expected:[]},
 {id:'tone-only-negative-person',surname:'陳',given:'瑞仁',tokens:['can4','seoi6','jan4'],expected:[['衰人','tone-only']]},
 {id:'tone-only-insult',surname:'陳',given:'展仁',tokens:['can4','zin2','jan4'],expected:[['賤人','tone-only']]},
 {id:'chosen-final-no-match',surname:'陳',given:'健仁',tokens:['can4','gin6','jan4'],expected:[]},
 {id:'tone-only-fox-word',surname:'胡',given:'莉晶',tokens:['wu4','lei6','zing1'],expected:[['狐狸精','tone-only']]},
 {id:'polyphonic-selected-cing',surname:'胡',given:'莉菁',tokens:['wu4','lei6','cing1'],expected:[]},
 {id:'polyphonic-selected-zing',surname:'胡',given:'莉菁',tokens:['wu4','lei6','zing1'],expected:[['狐狸精','tone-only']]},
 {id:'hygiene-tone-only',surname:'衛',given:'笙瑾',tokens:['wai6','sang1','gan2'],expected:[['衛生巾','tone-only']]},
 {id:'hygiene-vowel-length-distinct',surname:'衛',given:'笙瑾',tokens:['wai6','saang1','gan2'],expected:[]},
 {id:'contextual-word-tone-only',surname:'卞',given:'泰',tokens:['bin6','taai3'],expected:[['變態','tone-only']]},
 {id:'exact-negative-noun',surname:'費',given:'柴',tokens:['fai3','caai4'],expected:[['廢柴','exact']]},
 {id:'given-only-tone-difference',surname:'何',given:'輝柴',tokens:['ho4','fai1','caai4'],expected:[['廢柴','tone-only']]},
 {id:'different-final-not-fuzzy',surname:'費',given:'采',tokens:['fai3','coi2'],expected:[]},
 {id:'exact-animal-term',surname:'朱',given:'頭',tokens:['zyu1','tau4'],expected:[['豬頭','exact']]},
 {id:'different-vowel-not-fuzzy',surname:'朱',given:'陶',tokens:['zyu1','tou4'],expected:[]},
 {id:'body-word-tone-only',surname:'何',given:'備題',tokens:['ho4','bei6','tai4'],expected:[['鼻涕','tone-only']]},
 {id:'body-word-vowel-length',surname:'何',given:'備泰',tokens:['ho4','bei6','taai3'],expected:[]},
 {id:'nonadjacent-syllables-ignored',surname:'卞',given:'仁泰',tokens:['bin6','jan4','taai3'],expected:[]},
 {id:'unconfirmed-surname-gates-all',surname:'溫',given:'奕',tokens:['wan1','jik6'],unconfirmed:[0],expected:[]},
 {id:'unconfirmed-given-gates-all',surname:'胡',given:'莉晶',tokens:['wu4','lei6','zing1'],unconfirmed:[2],expected:[]},
 {id:'surname-only-lexeme-not-flagged',surname:'費柴',given:'安',tokens:['fai3','caai4','on1'],expected:[]},
];

describe('independent Cantonese lexical-review name goldens',()=>{
 it.each(cases)('$id',item=>{
  const reading=confirmed(item.surname,item.given,item.tokens,item.unconfirmed),result=calculateYueHomophoneReview(item.surname,item.given,reading,'ignore-tone',data);
  expect(result.matches.map(match=>[match.term,match.comparison])).toEqual(item.expected);
  expect(result.status).toBe(item.unconfirmed?'not-assessed':'assessed');
  expect(result.selectedTokens).toEqual(item.unconfirmed?[]:item.tokens);
  const strict=calculateYueHomophoneReview(item.surname,item.given,reading,'strict',data);
  expect(strict.matches.map(match=>[match.term,match.comparison])).toEqual(item.expected.filter(([,comparison])=>comparison==='exact'));
  expect(isCanonicalYueHomophoneReview(result,item.surname,item.given,reading,'ignore-tone',data)).toBe(true);
 });
 it('has original Rime character-row evidence for every explicitly assumed name token',()=>{
  const rows=readFileSync(resolve('data/raw/yue-reading-chars.dict.yaml'),'utf8').split(/\r?\n/u);
  for(const item of cases)for(const [index,char]of [...item.surname,...item.given].entries())expect(rows.some(row=>{const [glyph,token]=row.split('\t');return glyph===char&&token===item.tokens[index];}),`${item.id}:${char}/${item.tokens[index]}`).toBe(true);
 });
});

describe('review scope, interpretation and immutable snapshots',()=>{
 it('records actual adjacent character positions and each changed tone without duplicate exact/tone-only entries',()=>{
  const reading=confirmed('衛','笙瑾',['wai6','sang1','gan2']);
  const result=calculateYueHomophoneReview('衛','笙瑾',reading,'ignore-tone',data),match=result.matches[0];
  expect(match.span).toEqual({start:0,endExclusive:3,text:'衛笙瑾',scope:'whole-full-name'});expect(match.differentTonePositions).toEqual([2]);
  expect(match.actualTokens).toEqual(['wai6','sang1','gan2']);expect(match.ruleTokens).toEqual(['wai6','sang1','gan1']);
  expect(match.category).toBe('hygiene-object');expect(match.notice).toContain('不是辱词');expect(match.sourceRefs.map(ref=>ref.license)).toEqual(['CC-BY-SA-4.0','CC-BY-4.0']);
  expect(result.matches).toHaveLength(1);
 });
 it('retains literal and alternative-context senses instead of labelling all words insulting',()=>{
  const fox=data.rules.find(rule=>rule.term==='狐狸精')!,pig=data.rules.find(rule=>rule.term==='豬頭')!,fool=data.rules.find(rule=>rule.term==='傻瓜')!;
  expect(fox.glosses[0].quotes).toEqual(['狐仙']);expect(pig.register).toContain('endearing');expect(fool.glosses.some(gloss=>gloss.tags.includes('endearing'))).toBe(true);
  expect(data.rules.find(rule=>rule.term==='瘟疫')!.notice).toContain('不据姓名同音预测');
 });
 it('does not assess a partially confirmed name or interpret no match as safety',()=>{
  const reading=confirmed('溫','奕',['wan1','jik6'],[0]),result=calculateYueHomophoneReview('溫','奕',reading,'strict',data);
  expect(result.matches).toEqual([]);expect(result.missing[0]).toContain('姓氏');expect(result.status).toBe('not-assessed');
  expect(result.sourceReferences).toHaveLength(24);expect(result.limitations.join('')).toContain('未命中不表示');
 });
 it('preserves a cross-surname/given adjacent match while excluding surname-only and skipped syllables',()=>{
  const reading=confirmed('何溫','奕安',['ho4','wan1','jik6','on1']);
  const result=calculateYueHomophoneReview('何溫','奕安',reading,'strict',data);
  expect(result.matches[0].span).toEqual({start:1,endExclusive:3,text:'溫奕',scope:'cross-surname-given'});
 });
 it('rejects mismatched names, invalid modes and forged derived reading status',()=>{
  const reading=confirmed('溫','奕',['wan1','jik6']);
  expect(()=>calculateYueHomophoneReview('文','奕',reading,'strict',data)).toThrow('姓名不一致');
  expect(()=>calculateYueHomophoneReview('溫','奕',reading,'none' as never,data)).toThrow('模式');
  reading.fullNameTokens=['wan1','jat6'];expect(()=>calculateYueHomophoneReview('溫','奕',reading,'strict',data)).toThrow('状态或音节');
 });
 it('recomputes matches, source references, notices, unknown status and exact mode when validating',()=>{
  const reading=confirmed('衛','笙瑾',['wai6','sang1','gan2']),original=calculateYueHomophoneReview('衛','笙瑾',reading,'ignore-tone',data);
  for(const change of [
   (value:YueHomophoneReview)=>{value.matches[0].comparison='exact';},
   (value:YueHomophoneReview)=>{value.matches[0].span.start=1;},
   (value:YueHomophoneReview)=>{value.matches[0].sourceRefs[0].quote='edited';},
   (value:YueHomophoneReview)=>{value.matches[0].glosses=[];},
   (value:YueHomophoneReview)=>{value.matches[0].register=[];},
   (value:YueHomophoneReview)=>{value.sourceReferences.pop();},
   (value:YueHomophoneReview)=>{value.limitations=[];},
   (value:YueHomophoneReview)=>{value.status='not-assessed';},
   (value:YueHomophoneReview)=>{value.selectedTokens=[];},
  ]){const changed=structuredClone(original);change(changed);expect(isCanonicalYueHomophoneReview(changed,'衛','笙瑾',reading,'ignore-tone',data)).toBe(false);}
  expect(isCanonicalYueHomophoneReview(original,'衛','笙瑾',reading,'strict',data)).toBe(false);
 });
 it('rejects holes, metadata, inherited objects and accessors before reading them',()=>{
  const reading=confirmed('溫','奕',['wan1','jik6']),original=calculateYueHomophoneReview('溫','奕',reading,'strict',data);let getters=0;
  for(const change of [
   (value:YueHomophoneReview)=>{delete value.matches[0];},
   (value:YueHomophoneReview)=>{Object.assign(value.matches,{extra:true});},
   (value:YueHomophoneReview)=>{Object.assign(value,{extra:undefined});},
   (value:YueHomophoneReview)=>{Object.setPrototypeOf(value.matches[0],{inherited:true});},
   (value:YueHomophoneReview)=>{Object.defineProperty(value,'mode',{enumerable:true,get(){getters++;return 'strict';}});},
   (value:YueHomophoneReview)=>{Object.defineProperty(value,Symbol('hidden'),{value:true});},
  ]){const changed=structuredClone(original);change(changed);expect(isCanonicalYueHomophoneReview(changed,'溫','奕',reading,'strict',data)).toBe(false);}
  const changedReading=structuredClone(reading);Object.defineProperty(changedReading,'surname',{enumerable:true,get(){getters++;return reading.surname;}});
  expect(()=>calculateYueHomophoneReview('溫','奕',changedReading,'strict',data)).toThrow('访问器');expect(getters).toBe(0);
 });
 it('does not mutate saved reading choices or share returned rule objects',()=>{
  const reading=confirmed('溫','奕',['wan1','jik6']),before=JSON.stringify(reading),result=calculateYueHomophoneReview('溫','奕',reading,'strict',data);
  result.matches[0].glosses[0].quotes.push('changed');result.matches[0].actualTokens[0]='wan2';result.sourceReferences[0].quote='changed';
  expect(JSON.stringify(reading)).toBe(before);expect(data.rules.find(rule=>rule.term==='瘟疫')!.glosses[0].quotes).not.toContain('changed');
 });
});
