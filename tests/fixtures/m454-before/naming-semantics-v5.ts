import baseRules from '../../../data/naming-editorial-v4.json';
import additions from '../../../data/naming-editorial-v5.json';
import type {CharacterEntry} from '../../../src/shared/types';
import {selectedMeaningBelongsToReading} from '../../../src/shared/character-reading';

interface ReadingBinding {char?:string;pinyin?:string;tone?:number;sourceId?:string;dictionaryWord?:string;dictionarySense?:string;}
interface BoundMeaning {meaning:string;readings:ReadingBinding[];status:string;}
const overrides=(additions.characterOverrides as unknown as Array<{char:string;after:CharacterEntry}>);
const corrected=new Map(overrides.map(({char,after})=>{const reading=after.readings?.find(reading=>reading.pinyin===after.pinyin&&reading.tone===after.tone&&reading.sourceId===after.sourceId&&selectedMeaningBelongsToReading(after.meaning,reading.meanings));if(!reading)throw new Error('5.0固定纠错缺少同词条的完整读音义项。');return [char,{char,pinyin:reading.pinyin,tone:reading.tone,sourceId:reading.sourceId,dictionaryWord:reading.word}] as const;}));
const rewrite=(values:ReadingBinding[])=>values.map(binding=>corrected.has(binding.char??'')?{...binding,...corrected.get(binding.char!)}:binding);
const bindings={...baseRules.characterReadings,...Object.fromEntries(corrected)} as Record<string,ReadingBinding>;
const senses=Object.fromEntries(Object.entries(baseRules.defaultSenseMap).map(([char,value])=>[char,{...value,readings:rewrite(value.readings)}])) as Record<string,BoundMeaning>;
const combinations=Object.fromEntries(Object.entries(baseRules.combinations).map(([name,value])=>[name,{...value,readings:rewrite(value.readings)}])) as Record<string,BoundMeaning>;
const pairs=new Map((baseRules.naturalPairs as Array<{name:string;readings:ReadingBinding[];status:string}>).map(pair=>[pair.name,{...pair,readings:rewrite(pair.readings)}]));
const projectTags=new Set(baseRules.projectTags as string[]);

/** The input cannot declare its own default; the binding comes from the fixed published baseline. */
export function matchesReviewedReading(entry:CharacterEntry,binding:ReadingBinding|undefined):boolean{
 return !!binding&&!!binding.pinyin&&binding.pinyin===entry.pinyin&&binding.tone===entry.tone&&binding.sourceId===entry.sourceId&&!!binding.dictionaryWord&&!!entry.readings?.some(reading=>reading.pinyin===binding.pinyin&&reading.tone===binding.tone&&reading.sourceId===binding.sourceId&&reading.word===binding.dictionaryWord&&selectedMeaningBelongsToReading(entry.meaning,reading.meanings)&&(binding.dictionarySense===undefined||reading.meanings.includes(binding.dictionarySense)));
}
export function hasReviewedProjectReading(entry:CharacterEntry):boolean{return matchesReviewedReading(entry,bindings[entry.char]);}
/** Display-only distinction; this does not confer semantic credit or verify a dictionary identity. */
export function hasBaselinePronunciation(entry:CharacterEntry):boolean{return bindings[entry.char]?.pinyin===entry.pinyin&&bindings[entry.char]?.tone===entry.tone;}
function allReadings(readings:ReadingBinding[],entries:CharacterEntry[]):boolean{
 return readings.length===entries.length&&readings.every((binding,index)=>binding.char===entries[index].char&&matchesReviewedReading(entries[index],binding));
}
export function reviewedNamingSense(entry:CharacterEntry):string|undefined{const sense=senses[entry.char];return sense?.status==='bound-default-reading'&&allReadings(sense.readings,[entry])?sense.meaning:undefined;}
export function reviewedNamingCombination(name:string,entries:CharacterEntry[]):string|undefined{const combination=combinations[name];return combination?.status==='bound-default-reading'&&allReadings(combination.readings,entries)?combination.meaning:undefined;}
export function hasReviewedNaturalPair(name:string,entries:CharacterEntry[]):boolean{const pair=pairs.get(name);return pair?.status==='bound-default-reading'&&allReadings(pair.readings,entries);}
/** Custom labels remain soft preferences; baseline project tags do not borrow a different reading's meaning. */
export function semanticTagsForReading(entry:CharacterEntry):string[]{return hasReviewedProjectReading(entry)?entry.tags:entry.tags.filter(tag=>!projectTags.has(tag));}

export function currentCharacterWarning(entry:CharacterEntry):string{
 if(hasReviewedProjectReading(entry))return entry.warning;
 const warning=entry.warning.replace(/多音字：本方案采用\s+[^，。；;]+[，,]请按姓名用法确认[；;]各读音义项分别保存[。.]?/gu,'').trim();
 return /本方案采用|本方案读/u.test(warning)?`字库原备注（当前读音为${entry.pinyin}，原默认读音断言不适用）：${warning}`:warning;
}
