import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {evaluateName,selectNamingCitations,evaluateNameForRuleVersion} from '../src/domain/naming';
import {evaluateName as evaluate5} from '../src/domain/naming-v5';
import {matchesReviewedReading,hasFixedDefaultDictionaryIdentity,hasReviewedProjectReading,reviewedNamingSense,hasReviewedNaturalPair,semanticTagsForReading,currentCharacterWarning} from '../src/domain/naming-semantics-v6';
import {validCharacterReading} from '../src/main/candidate-facts';
import {validReadingReferenceMetadata,selectedReferenceOnlyReading} from '../src/shared/character-reading-reference';
import {analyzeProfile} from '../src/domain/engine';
import {NAMING_RULE_V5_VERSION,NAMING_RULE_V6_VERSION} from '../src/shared/naming-rules';
import table from '../data/naming-editorial-v6.json';
import before from '../data/dataset-v5.json';
import next from '../data/dataset-v6.json';
import type {BirthProfile,CharacterEntry,CharacterReading,NamingPreferences} from '../src/shared/types';

const old=before as unknown as {characters:CharacterEntry[];citations:typeof next.citations},data=next as unknown as typeof old;
const profile:BirthProfile={id:'naming6-domain',customerName:'词条纠正域测试',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'09:30',leapMonth:false,timeUnknown:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:''};
const pref:NamingPreferences={length:1,generationChar:'',requiredChars:'',forbiddenChars:'',elderTaboo:'',style:'清朗自然',meanings:'平安 求知',industry:'',priority:'balanced',preferredElements:[],zodiacRules:false,numerology:false},analysis=analyzeProfile(profile);
const entry=(char:string)=>data.characters.find(row=>row.char===char)!;
const evaluate=(name:string,characters=data.characters)=>evaluateName(name,profile,{...pref,length:[...name].length as 1|2,requiredChars:name},analysis,characters,data.citations)!;
const strip=(value:any)=>{if(value===null)return null;const{id,...rest}=value;return rest;};
const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');

describe('independent6 dictionary corrections without reapproving all project meanings',()=>{
 it('pins the actual32 frozen5 modules and routes explicit5 to that implementation',()=>{
  for(const [file,sha]of [['naming-v5.ts','94bd2e4da3a16afccaf4cb685535fce2a90acefa32aa0dbc21f0db8bb7ca29c9'],['naming-semantics-v5.ts','3c08df92066ccf966acddaa1cc641f02fc4920f78f021dba50a71c2b73936d22'],['naming-name-rules-v5.ts','78fd7ded8063d9e8c88b8d59b0725131b8e6d921dea70f2c8695e23711a48d5a']])expect(hash(readFileSync(new URL('../src/domain/'+file,import.meta.url)))).toBe(sha);
  for(const char of '才冬千秋沈咸旋郁致'){const p={...pref,requiredChars:char};expect(strip(evaluateNameForRuleVersion(NAMING_RULE_V5_VERSION,char,profile,p,analysis,old.characters,old.citations))).toEqual(strip(evaluate5(char,profile,p,analysis,old.characters,old.citations)));}
  expect(()=>evaluateNameForRuleVersion(undefined as never,'秋',profile,pref,analysis,data.characters,data.citations)).toThrow('未知');
 });
 it('preserves every unaffected record and its default evaluation from5 without new weights',()=>{
  const changed=table.characterOverrides.map(row=>row.char);expect(changed.sort()).toEqual([... '才冬千秋沈咸旋郁致'].sort());expect(data.characters).toHaveLength(779);let count=0;
  for(const value of data.characters){if(changed.includes(value.char))continue;count++;expect(value).toEqual(old.characters.find(row=>row.char===value.char));const p={...pref,requiredChars:value.char};expect(strip(evaluateName(value.char,profile,p,analysis,data.characters,data.citations)),value.char).toEqual(strip(evaluate5(value.char,profile,p,analysis,old.characters,old.citations)));}expect(count).toBe(770);
 },30000);
 it('keeps all nine default pronunciations while correcting the exact dictionary words',()=>{
  for(const row of table.characterOverrides){const current=entry(row.char);expect(current.pinyin).toBe(row.before.pinyin);expect(current.tone).toBe(row.before.tone);expect(current.traditional).toBe(row.char);expect(validCharacterReading(current)).toBe(true);expect(hasFixedDefaultDictionaryIdentity(current)).toBe(true);expect(hasReviewedProjectReading(current)).toBe(false);expect(semanticTagsForReading(current).every(tag=>!['平安','求知','明朗','谦和','典雅'].includes(tag))).toBe(true);}
  expect(entry('沈')).toMatchObject({pinyin:'shěn',tone:3,meaning:'姓。如宋代有沈括。',tags:[]});expect(entry('旋')).toMatchObject({pinyin:'xuàn',tone:4});
  for(const char of ['沈','旋']){expect(currentCharacterWarning(entry(char))).toBe(entry(char).warning);expect(currentCharacterWarning(entry(char))).not.toContain('原默认读音断言不适用');}
 });
 it('limits the two seasonal metaphors to explicitly labeled project meanings',()=>{
  for(const char of ['冬','秋']){expect(reviewedNamingSense(entry(char))).toContain('项目原创季节类比，非字典原义');const candidate=evaluate(char);expect(candidate.meaning).toContain('项目原创季节类比，非字典原义');expect(candidate.citations).toEqual([]);}
  for(const char of '才千沈咸旋郁致')expect(reviewedNamingSense(entry(char))).toBeUndefined();
 });
 it('uses an approved seasonal concept for preference matching while keeping its visible scope label',()=>{
  for(const [char,concept]of [['冬','坚韧'],['秋','收获']]){const base={...pref,requiredChars:char,meanings:''},a=evaluateName(char,profile,base,analysis,data.characters,data.citations)!,b=evaluateName(char,profile,{...base,meanings:concept},analysis,data.characters,data.citations)!;expect(b.evaluation.meaning-a.evaluation.meaning).toBe(8);expect(b.meaning).toContain('项目原创季节类比');}
 });
 it('withdraws a seasonal migration when the reviewed dictionary sense is deleted despite a legal remaining sense',()=>{
  for(const char of ['冬','秋']){const chars=structuredClone(data.characters),value=chars.find(row=>row.char===char)!,binding=table.semanticMigrations.defaultSenseMap[char as '冬'|'秋'].after.readings[0];value.readings=value.readings!.map(row=>row.pinyin===value.pinyin?{...row,meanings:row.meanings.filter(sense=>sense!==binding.dictionarySense)}:row);value.meaning=value.readings!.find(row=>row.pinyin===value.pinyin)!.meanings[0];expect(validCharacterReading(value)).toBe(true);expect(reviewedNamingSense(value)).toBeUndefined();expect(evaluate(char,chars).meaning).not.toContain('项目原创季节类比');}
 });
 it('requires致 and遠 exact words and reviewed full senses for only the modern致远expression',()=>{
  expect(hasReviewedNaturalPair('致远',[entry('致'),entry('远')])).toBe(true);expect(evaluate('致远').citations).toEqual([]);expect(selectNamingCitations('致远',data.characters,data.citations)).toEqual([]);
  for(const char of ['致','远']){const chars=structuredClone(data.characters),value=chars.find(row=>row.char===char)!,binding=table.semanticMigrations.naturalPairs[0].after.readings.find(row=>row.char===char)!;value.readings=value.readings!.map(row=>row.pinyin===value.pinyin?{...row,meanings:row.meanings.filter(sense=>sense!==binding.dictionarySense)}:row);value.meaning=value.readings!.find(row=>row.pinyin===value.pinyin)!.meanings[0];expect(validCharacterReading(value)).toBe(true);expect(hasReviewedNaturalPair('致远',chars.filter(row=>row.char==='致'||row.char==='远').sort((a)=>a.char==='致'?-1:1))).toBe(false);}
  expect(hasReviewedNaturalPair('致远',[old.characters.find(row=>row.char==='致')!,entry('远')])).toBe(false);
 });
 it('does not borrow an expected word retained alongside another same-sound selected word',()=>{
  const chars=structuredClone(data.characters),value=chars.find(row=>row.char==='冬')!,oldWinter=old.characters.find(row=>row.char==='冬')!;value.readings!.push(...structuredClone(oldWinter.readings!));value.meaning=oldWinter.meaning;expect(validCharacterReading(value)).toBe(true);expect(hasFixedDefaultDictionaryIdentity(value)).toBe(false);expect(reviewedNamingSense(value)).toBeUndefined();expect(evaluate('冬',chars).meaning).not.toContain('坚韧');
 });
 it('keeps legitimate nondefault旋xuán dictionary text without using xuàn-specific or generic approved meaning',()=>{
  const chars=structuredClone(data.characters),value=chars.find(row=>row.char==='旋')!,reading=value.readings!.find(row=>row.pinyin==='xuán')!;value.pinyin=reading.pinyin;value.tone=reading.tone;value.meaning=reading.meanings[0];expect(validCharacterReading(value)).toBe(true);expect(hasReviewedProjectReading(value)).toBe(false);expect(evaluate('旋',chars).meaning).toContain(reading.meanings[0]);expect(evaluate('旋',chars).citations).toEqual([]);
 });
 it('does not turn a user-added project明朗tag on沈shěn into reviewed thematic credit',()=>{
  const chars=structuredClone(data.characters),value=chars.find(row=>row.char==='沈')!;value.tags.push('明朗');expect(validCharacterReading(value)).toBe(true);expect(hasReviewedProjectReading(value)).toBe(false);expect(semanticTagsForReading(value)).not.toContain('明朗');expect(evaluate('沈',chars).evaluation).toEqual(evaluate('沈').evaluation);
 });
 it('retains the existing27 whole-name rules without expanding the corrected characters approval',()=>{
  expect(table.nameRules).toHaveLength(27);for(const rule of table.nameRules){const candidate=evaluate(rule.name);expect(candidate.citations,rule.name).toEqual([rule.citation]);expect(candidate.meaning).toContain(rule.meaning);}expect(evaluateNameForRuleVersion(NAMING_RULE_V6_VERSION,'秋',profile,{...pref,requiredChars:'秋'},analysis,data.characters,data.citations)?.meaning).toContain('项目原创季节类比');
 });
});

describe('dictionary cross-reference metadata cannot become a default entity definition',()=>{
 const reference=()=>structuredClone(entry('沈').readings!.find(row=>row.pinyin==='chén')!);
 it('preserves the raw reference as an alternate reading while the default姓义 stays valid',()=>{
  const row=reference();expect(row).toMatchObject({referenceOnly:true,sourceReference:{kind:'dictionary-cross-reference',rawDefinitionIndex:0,text:'同「沉」。'},meanings:['辞典参照：同「沉」。']});expect(validReadingReferenceMetadata(row)).toBe(true);expect(validCharacterReading(entry('沈'))).toBe(true);
  const selected={...entry('沈'),pinyin:row.pinyin,tone:row.tone,meaning:row.meanings[0]};expect(selectedReferenceOnlyReading(selected)).toBeDefined();expect(validCharacterReading(selected)).toBe(false);expect(evaluateName('沈',profile,{...pref,requiredChars:'沈'},analysis,data.characters.map(value=>value.char==='沈'?selected:value),data.citations)).toBeNull();expect(matchesReviewedReading(selected,{char:'沈',pinyin:row.pinyin,tone:row.tone,sourceId:row.sourceId,dictionaryWord:'沈'})).toBe(false);
 });
 it('preserves unmarked legacy reference text structurally while6 gives it no entity meaning or candidate',()=>{
  const row=reference();delete row.referenceOnly;delete row.sourceReference;expect(validReadingReferenceMetadata(row)).toBe(true);const selected={...entry('沈'),pinyin:row.pinyin,tone:row.tone,meaning:row.meanings[0],readings:[row]};expect(validCharacterReading(selected)).toBe(true);expect(matchesReviewedReading(selected,{char:'沈',pinyin:row.pinyin,tone:row.tone,sourceId:row.sourceId,dictionaryWord:'沈'})).toBe(false);expect(evaluateName('沈',profile,{...pref,requiredChars:'沈'},analysis,data.characters.map(value=>value.char==='沈'?selected:value),data.citations)).toBeNull();
 });
 it.each(['missing-flag','missing-reference','wrong-kind','negative-index','unlabeled-meaning','extra-reference-field'] as const)('rejects %s metadata while preserving normal legacy reading shapes',change=>{
  expect(validReadingReferenceMetadata(entry('秋').readings![0])).toBe(true);const row=reference() as CharacterReading&Record<string,any>;
  if(change==='missing-flag')delete row.referenceOnly;if(change==='missing-reference')delete row.sourceReference;if(change==='wrong-kind')row.sourceReference!.kind='entity' as never;if(change==='negative-index')row.sourceReference!.rawDefinitionIndex=-1;if(change==='unlabeled-meaning')row.meanings=['沉稳'];if(change==='extra-reference-field')(row.sourceReference as any).approved=true;expect(validReadingReferenceMetadata(row)).toBe(false);
 });
 it('rejects metadata accessors without executing them',()=>{
  let reads=0;const row=reference();Object.defineProperty(row,'referenceOnly',{enumerable:true,get(){reads++;return true;}});expect(validReadingReferenceMetadata(row)).toBe(false);expect(reads).toBe(0);
 });
});
