import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {evaluateName,generateLocal,selectNamingCitations} from '../src/domain/naming-v4';
import {evaluateName as evaluateV3,generateLocal as generateV3} from '../src/domain/naming-v3';
import {hasReviewedProjectReading,reviewedNamingSense,reviewedNamingCombination,hasReviewedNaturalPair,semanticTagsForReading} from '../src/domain/naming-semantics-v4';
import {validCharacterReading} from '../src/main/candidate-facts';
import {analyzeProfile} from '../src/domain/engine';
import editorial from '../data/naming-editorial.json';
import v4 from '../data/naming-editorial-v4.json';
import type {BirthProfile,CharacterEntry,Citation,NamingPreferences} from '../src/shared/types';

const data=JSON.parse(readFileSync(new URL('../data/dataset.json',import.meta.url),'utf8'))as {characters:CharacterEntry[];citations:Citation[]};
const profile:BirthProfile={id:'reading-semantics-v4',customerName:'读音语义隔离',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'09:30',timeUnknown:false,leapMonth:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:''};
const preferences:NamingPreferences={length:2,generationChar:'',requiredChars:'',forbiddenChars:'',elderTaboo:'',style:'清朗自然',meanings:'平安 求知 仁爱',industry:'科技',priority:'classic',preferredElements:[],zodiacRules:false,numerology:false};
const analysis=analyzeProfile(profile),withoutId=(candidate:any)=>{if(!candidate)return candidate;const{id,...facts}=candidate;return facts;};
function changedReading(char:string,pinyin:string){const entry=data.characters.find(value=>value.char===char)!,reading=entry.readings!.find(value=>value.pinyin===pinyin)!;return {...structuredClone(entry),pinyin:reading.pinyin,tone:reading.tone,sourceId:reading.sourceId,meaning:reading.meanings[0]};}

describe('v4 semantic credit follows fixed reviewed readings',()=>{
 it('keeps every available default single-character explanation and score equal to the frozen delivered3.0 implementation',()=>{
  expect(data.characters).toHaveLength(779);
  for(const entry of data.characters){expect(hasReviewedProjectReading(entry),entry.char).toBe(true);const pref={...preferences,length:1 as const,requiredChars:entry.char};expect(withoutId(evaluateName(entry.char,profile,pref,analysis,data.characters,data.citations)),entry.char).toEqual(withoutId(evaluateV3(entry.char,profile,pref,analysis,data.characters,data.citations)));}
 },30000);
 it('keeps all available natural pairings and all44 exact source identities unchanged at their published readings',()=>{
  for(const pair of v4.naturalPairs){const entries=[...pair.name].map(char=>data.characters.find(entry=>entry.char===char));if(entries.some(entry=>!entry))continue;const pref={...preferences,requiredChars:pair.name};expect(withoutId(evaluateName(pair.name,profile,pref,analysis,data.characters,data.citations)),pair.name).toEqual(withoutId(evaluateV3(pair.name,profile,pref,analysis,data.characters,data.citations)));}
  for(const rule of editorial.citations)for(const name of rule.names)expect(selectNamingCitations(name,data.characters,data.citations),name).toEqual([rule.citation]);
 });
 it('keeps seeded default full batches stable without weakening hard constraints',()=>{
  for(const priority of ['classic','balanced','sound']as const){const pref={...preferences,priority};expect(generateLocal(profile,pref,analysis,data.characters,data.citations,132).candidates.map(withoutId)).toEqual(generateV3(profile,pref,analysis,data.characters,data.citations,132).candidates.map(withoutId));}
 });
 it('does not let any actual alternate source reading self-approve the default project sense',()=>{
  let checked=0;for(const entry of data.characters)for(const reading of entry.readings??[]){if(reading.pinyin===entry.pinyin)continue;const alternate=changedReading(entry.char,reading.pinyin);expect(validCharacterReading(alternate)).toBe(true);expect(hasReviewedProjectReading(alternate),entry.char+'/'+reading.pinyin).toBe(false);expect(reviewedNamingSense(alternate)).toBeUndefined();const entries=data.characters.map(value=>value.char===entry.char?alternate:value),candidate=evaluateName(entry.char,profile,{...preferences,length:1,requiredChars:entry.char},analysis,entries,data.citations);if(candidate){expect(candidate.characters[0]).toEqual(alternate);expect(candidate.meaning).toContain(alternate.meaning);expect(candidate.meaning).toContain('命名适用义待审');}checked++;}expect(checked).toBeGreaterThan(50);
 });
 it.each([['予和','予','yú'],['乐安','乐','yuè'],['知微','微','wéi'],['知微','知','zhì']])('does not reuse the %s explanation when %s reads %s', (name,char,pinyin)=>{
  const alternate=changedReading(char,pinyin),characters=data.characters.map(entry=>entry.char===char?alternate:entry),entries=[...name].map(char=>characters.find(entry=>entry.char===char)!);const result=evaluateName(name,profile,{...preferences,requiredChars:name},analysis,characters,data.citations)!;
  expect(reviewedNamingCombination(name,entries)).toBeUndefined();expect(hasReviewedNaturalPair(name,entries)).toBe(false);expect(result.meaning).not.toContain((editorial.combinations as Record<string,string>)[name]);expect(result.meaning).toContain(alternate.meaning);expect(result.reason).not.toContain('组合列入本产品自编的自然表达参考词表');expect(result.citations).toEqual([]);expect(result.pinyin).toContain(pinyin);expect(result.warnings.join(' ')).not.toContain('本方案采用 '+data.characters.find(entry=>entry.char===char)!.pinyin+'，');expect(result.characters.find(entry=>entry.char===char)!.warning).toBe(alternate.warning);
 });
 it('does not recognize an imported reading as reviewed merely because its labels or name match',()=>{
  const alternate=changedReading('乐','yuè');alternate.tags=[...v4.projectTags,'用户自定义音乐偏好'];expect(semanticTagsForReading(alternate)).toEqual(['用户自定义音乐偏好']);const forged={...alternate,pinyin:'lè',tone:4,sourceId:'unreviewed-dictionary'};expect(hasReviewedProjectReading(forged)).toBe(false);
 });
 it('requires the selected meanings to belong to the expected dictionary word, not another same-sound word retained beside it',()=>{
  const entry=structuredClone(data.characters.find(entry=>entry.char==='予')!),rain=data.characters.find(entry=>entry.char==='雨')!.readings!.find(reading=>reading.pinyin===entry.pinyin)!;entry.readings!.push(structuredClone(rain));entry.meaning=rain.meanings[0];expect(validCharacterReading(entry)).toBe(true);expect(hasReviewedProjectReading(entry)).toBe(false);expect(reviewedNamingSense(entry)).toBeUndefined();
  const original=data.characters.find(entry=>entry.char==='安')!,reading=original.readings!.find(reading=>reading.pinyin===original.pinyin&&reading.word==='安')!;const three={...structuredClone(original),meaning:reading.meanings.slice(0,3).join('；')};expect(validCharacterReading(three)).toBe(true);expect(hasReviewedProjectReading(three)).toBe(true);
 });
 it('does not describe a music reading as the old bright semantic style while retaining simple writing preference',()=>{
  const alternate=changedReading('乐','yuè'),characters=data.characters.map(entry=>entry.char==='乐'?alternate:entry),pref={...preferences,length:1 as const,requiredChars:'乐',industry:'',meanings:''};const bright=evaluateName('乐',profile,{...pref,style:'明快'},analysis,characters,data.citations)!,simple=evaluateName('乐',profile,{...pref,style:'极简'},analysis,characters,data.citations)!;expect(bright.reason).not.toContain('明亮意象');expect(simple.reason).toContain('普通笔画平均');expect(simple.evaluation.meaning).toBeGreaterThanOrEqual(bright.evaluation.meaning);
 });
 it('retains pure writing style and explicitly requested true dictionary meanings without granting reviewed semantic coverage',()=>{
  const alternate=changedReading('乐','yuè'),characters=data.characters.map(entry=>entry.char==='乐'?alternate:entry),base={...preferences,length:1 as const,requiredChars:'乐',style:'极简',industry:'',meanings:''};const neutral=evaluateName('乐',profile,base,analysis,characters,data.citations)!,music=evaluateName('乐',profile,{...base,meanings:'動人'},analysis,characters,data.citations)!;expect(neutral.reason).toContain('普通笔画平均');expect(music.evaluation.meaning).toBeGreaterThan(neutral.evaluation.meaning);expect(music.evaluation.distinctiveness).toBe(65);expect(music.meaning).toContain(alternate.meaning);expect(music.citations).toEqual([]);
 });
});
