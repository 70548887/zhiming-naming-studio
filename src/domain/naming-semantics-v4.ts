import rules from '../../data/naming-editorial-v4.json';
import type {CharacterEntry} from '../shared/types';
import {selectedMeaningBelongsToReading} from '../shared/character-reading';

interface ReadingBinding {char?:string;pinyin?:string;tone?:number;sourceId?:string;dictionaryWord?:string;}
interface BoundMeaning {meaning:string;readings:ReadingBinding[];status:string;}
const bindings=rules.characterReadings as Record<string,ReadingBinding>;
const senses=rules.defaultSenseMap as Record<string,BoundMeaning>;
const combinations=rules.combinations as Record<string,BoundMeaning>;
const pairs=new Map((rules.naturalPairs as Array<{name:string;readings:ReadingBinding[];status:string}>).map(pair=>[pair.name,pair]));
const projectTags=new Set(rules.projectTags as string[]);

/** The input cannot declare its own default; the binding comes from the fixed published baseline. */
export function matchesReviewedReading(entry:CharacterEntry,binding:ReadingBinding|undefined):boolean{
 return !!binding&&!!binding.pinyin&&binding.pinyin===entry.pinyin&&binding.tone===entry.tone&&binding.sourceId===entry.sourceId&&!!binding.dictionaryWord&&!!entry.readings?.some(reading=>reading.pinyin===binding.pinyin&&reading.tone===binding.tone&&reading.sourceId===binding.sourceId&&reading.word===binding.dictionaryWord&&selectedMeaningBelongsToReading(entry.meaning,reading.meanings));
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
