import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {evaluateName,selectNamingCitations,generateLocal} from '../src/domain/naming-v5';
import {evaluateNameForRuleVersion} from '../src/domain/naming';
import {evaluateName as evaluateV4} from '../src/domain/naming-v4';
import {reviewedNamingSense,hasReviewedProjectReading} from '../src/domain/naming-semantics-v5';
import {resolveSupplementalName} from '../src/domain/naming-name-rules-v5';
import {validCharacterReading} from '../src/main/candidate-facts';
import {analyzeProfile} from '../src/domain/engine';
import rules from '../data/naming-editorial-v5.json';
import baseRules from '../data/naming-editorial.json';
import baseData from '../data/dataset.json';
import newData from '../data/dataset-v5.json';
import {NAMING_RULE_V4_VERSION} from '../src/shared/naming-rules';
import type {BirthProfile,CharacterEntry,Citation,NamingPreferences} from '../src/shared/types';

const before=baseData as unknown as {characters:CharacterEntry[];citations:Citation[]},data=newData as unknown as {characters:CharacterEntry[];citations:Citation[]};
const profile:BirthProfile={id:'naming5-domain',customerName:'逐名范围',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'09:30',leapMonth:false,timeUnknown:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:''};
const pref:NamingPreferences={length:2,generationChar:'',requiredChars:'',forbiddenChars:'',elderTaboo:'',style:'典雅',meanings:'平安 求知 仁爱',industry:'',priority:'classic',preferredElements:[],zodiacRules:false,numerology:false},analysis=analyzeProfile(profile);
const evaluate=(name:string,characters=data.characters,citations=data.citations)=>evaluateName(name,profile,{...pref,requiredChars:name},analysis,characters,citations)!;
const noId=(value:any)=>{if(value===null)return null;const{id,...remaining}=value;return remaining;};
const sha=(value:string|Uint8Array)=>createHash('sha256').update(value).digest('hex');

describe('independent naming5 source credit and exact4 replay',()=>{
 it('retains exact published4 calculator and semantic sources, rather than forwarding4 to the current evaluator',()=>{
  const original=readFileSync(new URL('../src/domain/naming-v4.ts',import.meta.url),'utf8').replace("from './naming-semantics-v4';","from './naming-semantics';");expect(sha(original)).toBe('5a3165b03a94e6cda9c76aab0d771031f788e60e7cf542a0e79f889a31d9212e');expect(sha(readFileSync(new URL('../src/domain/naming-semantics-v4.ts',import.meta.url)))).toBe('e0677f21be27550c3625fac611d48080cf85bda613633aa8cdd977e5e16ba96e');expect(sha(readFileSync(new URL('../src/shared/character-reading.ts',import.meta.url)))).toBe('717aac3c5f8c56abcbfcec4eef786dedac6c21a28c734561201b6b5a36f26a07');
  for(const name of ['乐安','知微','安宁'])expect(noId(evaluateNameForRuleVersion(NAMING_RULE_V4_VERSION,name,profile,{...pref,requiredChars:name},analysis,before.characters,before.citations))).toEqual(noId(evaluateV4(name,profile,{...pref,requiredChars:name},analysis,before.characters,before.citations)));
  expect(()=>evaluateNameForRuleVersion(null as never,'乐安',profile,pref,analysis,before.characters,before.citations)).toThrow('未知');
 });
 it('leaves every unaffected default character unchanged and limits new dictionary identities to志 and家',()=>{
  const changed=rules.characterOverrides.map(row=>row.char);expect(changed.sort()).toEqual(['家','志']);expect(data.characters).toHaveLength(779);
  for(const entry of data.characters){if(changed.includes(entry.char))continue;expect(entry).toEqual(before.characters.find(old=>old.char===entry.char));const p={...pref,length:1 as const,requiredChars:entry.char};expect(noId(evaluateName(entry.char,profile,p,analysis,data.characters,data.citations)),entry.char).toEqual(noId(evaluateV4(entry.char,profile,p,analysis,before.characters,before.citations)));}
 },30000);
 it('binds each new reviewed name to its whole canonical quotation, ordered dictionary words and reviewed source senses',()=>{
  expect(rules.nameRules).toHaveLength(27);for(const rule of rules.nameRules){const candidate=evaluate(rule.name);expect(candidate,rule.name).not.toBeNull();expect(candidate.citations,rule.name).toEqual([rule.citation]);expect(candidate.meaning,rule.name).toContain(rule.meaning);expect(candidate.reason,rule.name).toContain(rule.context);expect(selectNamingCitations(rule.name,data.characters,data.citations)).toEqual([rule.citation]);expect(candidate.reason.includes('并非原文连词'),rule.name).toBe(!rule.excerpt.includes(rule.name));}
 });
 it.each(['id','sourceId','title','chapter','text']as const)('withdraws new source credit when canonical %s changes',key=>{
  const rule=rules.nameRules.find(rule=>rule.name==='扬善')!,citations=data.citations.map(citation=>citation.id===rule.citation.id?{...citation,[key]:citation[key]+' changed'}:citation),candidate=evaluate(rule.name,data.characters,citations);expect(candidate.citations).toEqual([]);expect(candidate.meaning).not.toContain(rule.meaning);expect(candidate.reason).not.toContain(rule.context);
 });
 it('requires the reviewed sense in the complete matching word, even when that sense lies beyond the displayed first three',()=>{
  const pair=rules.nameRules.flatMap(rule=>rule.readings.map(binding=>({rule,binding}))).find(({binding})=>!data.characters.find(entry=>entry.char===binding.char)!.meaning.includes(binding.dictionarySense));expect(pair).toBeDefined();const{rule,binding}=pair!;
  const characters=structuredClone(data.characters),entry=characters.find(entry=>entry.char===binding.char)!;entry.readings=entry.readings!.map(reading=>reading.pinyin===binding.pinyin&&reading.tone===binding.tone&&reading.sourceId===binding.sourceId&&reading.word===binding.dictionaryWord?{...reading,meanings:reading.meanings.filter(meaning=>meaning!==binding.dictionarySense)}:reading);expect(validCharacterReading(entry)).toBe(true);expect(resolveSupplementalName(rule.name,new Map(characters.map(entry=>[entry.char,entry])),data.citations)).toBeUndefined();expect(evaluate(rule.name,characters).citations).toEqual([]);
 });
 it('does not treat a same-sound second word as the reviewed word just because both records are retained',()=>{
  const characters=structuredClone(data.characters),entry=characters.find(entry=>entry.char==='扬')!,other=data.characters.find(entry=>entry.char==='洋')!.readings!.find(reading=>reading.pinyin===entry.pinyin)!;entry.readings!.push(structuredClone(other));entry.meaning=other.meanings[0];expect(validCharacterReading(entry)).toBe(true);expect(hasReviewedProjectReading(entry)).toBe(false);expect(evaluate('扬善',characters).citations).toEqual([]);
 });
 it('does not spread a new whole-name meaning to a single character or an unrelated pairing',()=>{
  const rule=rules.nameRules.find(rule=>rule.name==='扬善')!,entry=data.characters.find(entry=>entry.char==='扬')!;expect(reviewedNamingSense(entry)).toBeUndefined();const single=evaluateName('扬',profile,{...pref,length:1,requiredChars:'扬'},analysis,data.characters,data.citations)!;expect(single.meaning).not.toContain(rule.meaning);expect(single.evaluation.distinctiveness).toBe(65);const other=evaluate('扬安');expect(other.citations).toEqual([]);expect(other.meaning).not.toContain(rule.meaning);
 });
 it('keeps independent base4 modern combinations when new source conditions are unavailable',()=>{
  for(const name of ['知微','乐安','予和']){const current=evaluate(name,data.characters,[]),old=evaluateV4(name,profile,{...pref,requiredChars:name},analysis,before.characters,[])!;expect(current.meaning).toBe(old.meaning);expect(current.evaluation).toEqual(old.evaluation);expect(current.citations).toEqual([]);}
  for(const rule of baseRules.citations)for(const name of rule.names){const current=evaluate(name),old=evaluateV4(name,profile,{...pref,requiredChars:name},analysis,before.characters,before.citations)!;expect(current.meaning,name).toBe(old.meaning);expect(current.evaluation,name).toEqual(old.evaluation);}
 });
 it('uses the corrected志 and家 words without merging誌/傢 meanings or removing家gū',()=>{
  for(const char of ['志','家']){const entry=data.characters.find(entry=>entry.char===char)!;expect(entry.traditional).toBe(char);expect(validCharacterReading(entry)).toBe(true);expect(hasReviewedProjectReading(entry)).toBe(true);expect(entry.readings!.every(reading=>reading.word===char)).toBe(true);}
  expect(data.characters.find(entry=>entry.char==='家')!.readings!.map(reading=>reading.pinyin)).toEqual(['jiā','gū']);expect(evaluate('遂志').meaning).toContain(rules.nameRules.find(rule=>rule.name==='遂志')!.meaning);expect(evaluate('家宜').meaning).toContain(rules.nameRules.find(rule=>rule.name==='家宜')!.meaning);
  expect(evaluate('遂志',before.characters,before.citations).citations).toEqual([]);expect(evaluate('家宜',before.characters,before.citations).citations).toEqual([]);
 });
 it('keeps new reviewed-name proposals subject to normal required characters and pronunciation constraints',()=>{
  const result=generateLocal(profile,{...pref,requiredChars:'扬善',generationChar:'扬'},analysis,data.characters,data.citations,133);expect(result.candidates).toHaveLength(1);expect(result.candidates[0].givenName).toBe('扬善');expect(result.candidates[0].citations).toEqual([rules.nameRules.find(rule=>rule.name==='扬善')!.citation]);
 });
});
