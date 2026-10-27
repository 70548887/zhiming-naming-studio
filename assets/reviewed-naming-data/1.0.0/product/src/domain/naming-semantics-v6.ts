import rules from '../../data/naming-editorial-v6.json';
import base4 from '../../data/naming-editorial-v4.json';
import * as frozen5 from './naming-semantics-v5';
import type {CitationReadingGateV5,CitationReadingDependenciesV5} from './naming-semantics-v5';
import type {CharacterEntry} from '../shared/types';
import {selectedMeaningBelongsToReading} from '../shared/character-reading';
import {validReadingReferenceMetadata} from '../shared/character-reading-reference';

interface ReadingBinding {char?:string;pinyin?:string;tone?:number;sourceId?:string;dictionaryWord?:string;dictionarySense?:string;}
interface BoundMeaning {meaning:string;readings:ReadingBinding[];status:string;}
interface BoundPair {name:string;readings:ReadingBinding[];status:string;}
export type CitationReadingBindingV6=ReadingBinding;
export type CitationReadingTableV6=typeof rules;
export interface CitationReadingDependenciesV6 {
 v6Table:CitationReadingTableV6;overrides:ReadonlyMap<string,CharacterEntry>;gate5:CitationReadingDependenciesV5;
}
export interface CitationReadingGateV6 {
 matchesReviewedReading(entry:CharacterEntry,binding:ReadingBinding|undefined):boolean;
 hasReviewedProjectReading(entry:CharacterEntry):boolean;
 readDependencies():CitationReadingDependenciesV6;
}
function matchesReviewedReadingWithGate5(entry:CharacterEntry,binding:ReadingBinding|undefined,gate5:CitationReadingGateV5):boolean{
 if(entry.meaning.trimStart().startsWith('辞典参照：'))return false;
 return gate5.matchesReviewedReading({...entry,readings:entry.readings?.filter(reading=>validReadingReferenceMetadata(reading)&&reading.referenceOnly!==true)},binding);
}
function hasReviewedReadingWithGate5(entry:CharacterEntry,overrides:ReadonlyMap<string,CharacterEntry>,gate5:CitationReadingGateV5):boolean{return !overrides.has(entry.char)&&gate5.hasReviewedProjectReading(entry);}
/** Pure original override exclusion and V5 reading match; no admission is issued. */
export function createCitationReadingGateV6(ownedV6:CitationReadingTableV6,gate5:CitationReadingGateV5):CitationReadingGateV6 {
 const overrides=new Map((ownedV6.characterOverrides as unknown as Array<{char:string;after:CharacterEntry}>).map(row=>[row.char,row.after]));
 return {
  matchesReviewedReading:(entry,binding)=>matchesReviewedReadingWithGate5(entry,binding,gate5),
  hasReviewedProjectReading:entry=>hasReviewedReadingWithGate5(entry,overrides,gate5),
  readDependencies:()=>({v6Table:ownedV6,overrides,gate5:gate5.readDependencies()}),
 };
}
const liveCitationReadingGate6=createCitationReadingGateV6(rules,{
 matchesReviewedReading:(entry,binding)=>frozen5.matchesReviewedReading(entry,binding),
 hasReviewedProjectReading:entry=>frozen5.hasReviewedProjectReading(entry),
 readDependencies:()=>frozen5.readLiveCitationReadingDependenciesV5(),
});
const {overrides}=liveCitationReadingGate6.readDependencies();
/** Raw actual dependency references, including the used V5 bindings, not a clone. */
export function readLiveCitationReadingDependenciesV6():CitationReadingDependenciesV6{return liveCitationReadingGate6.readDependencies();}
const projectTags=new Set(base4.projectTags as string[]);
const senseMigrations=rules.semanticMigrations.defaultSenseMap as unknown as Record<string,{after:BoundMeaning}>;
const pairMigrations=new Map((rules.semanticMigrations.naturalPairs as unknown as Array<{name:string;after:BoundPair}>).map(row=>[row.name,row.after]));
export function matchesReviewedReading(entry:CharacterEntry,binding:ReadingBinding|undefined):boolean{return liveCitationReadingGate6.matchesReviewedReading(entry,binding);}

/** Fixed dictionary identity is separate from approval of project tags, themes or imagery. */
export function hasFixedDefaultDictionaryIdentity(entry:CharacterEntry):boolean{
 const expected=overrides.get(entry.char);if(!expected)return frozen5.hasReviewedProjectReading(entry);
 const reading=expected.readings?.find(row=>row.pinyin===expected.pinyin&&row.tone===expected.tone&&row.sourceId===expected.sourceId&&selectedMeaningBelongsToReading(expected.meaning,row.meanings));
 return !!reading&&matchesReviewedReading(entry,{char:expected.char,pinyin:expected.pinyin,tone:expected.tone,sourceId:expected.sourceId,dictionaryWord:reading.word});
}
/** The nine corrections do not broadly approve the older project meanings or labels. */
export function hasReviewedProjectReading(entry:CharacterEntry):boolean{return liveCitationReadingGate6.hasReviewedProjectReading(entry);}
export function hasBaselinePronunciation(entry:CharacterEntry):boolean{const expected=overrides.get(entry.char);return expected?expected.pinyin===entry.pinyin&&expected.tone===entry.tone:frozen5.hasBaselinePronunciation(entry);}
function allReadings(readings:ReadingBinding[],entries:CharacterEntry[]):boolean{return readings.length===entries.length&&readings.every((binding,index)=>binding.char===entries[index].char&&matchesReviewedReading(entries[index],binding));}
export function reviewedNamingSense(entry:CharacterEntry):string|undefined{
 if(!overrides.has(entry.char))return frozen5.reviewedNamingSense(entry);
 const reviewed=senseMigrations[entry.char]?.after;return reviewed?.status==='bound-default-reading'&&allReadings(reviewed.readings,[entry])?reviewed.meaning:undefined;
}
/** Keep the visible scope label out of the semantic concept used for an approved preference match. */
export function reviewedNamingSenseConcept(entry:CharacterEntry):string|undefined{
 const reviewed=reviewedNamingSense(entry);if(!reviewed)return undefined;
 const migration=rules.semanticMigrations.defaultSenseMap as unknown as Record<string,{before:{meaning:string}}>;
 return overrides.has(entry.char)?migration[entry.char]?.before.meaning:reviewed;
}
export function reviewedNamingCombination(name:string,entries:CharacterEntry[]):string|undefined{return entries.some(entry=>overrides.has(entry.char))?undefined:frozen5.reviewedNamingCombination(name,entries);}
export function hasReviewedNaturalPair(name:string,entries:CharacterEntry[]):boolean{
 if(!entries.some(entry=>overrides.has(entry.char)))return frozen5.hasReviewedNaturalPair(name,entries);
 const reviewed=pairMigrations.get(name);return reviewed?.status==='bound-default-reading'&&allReadings(reviewed.readings,entries);
}
export function semanticTagsForReading(entry:CharacterEntry):string[]{return overrides.has(entry.char)?entry.tags.filter(tag=>!projectTags.has(tag)):frozen5.semanticTagsForReading(entry);}
export function currentCharacterWarning(entry:CharacterEntry):string{return hasFixedDefaultDictionaryIdentity(entry)?entry.warning:frozen5.currentCharacterWarning(entry);}
