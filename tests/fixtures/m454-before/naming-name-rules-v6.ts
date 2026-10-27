import additions from '../../../data/naming-editorial-v6.json';
import type {CharacterEntry,Citation} from '../../../src/shared/types';
import {matchesReviewedReading} from './naming-semantics-v6';

export interface NameRuleReading {
 char:string;pinyin:string;tone:number;sourceId:string;dictionaryWord:string;dictionarySense:string;
 rawHeteronymIndex:number;rawDefinitionIndex:number;
}
export interface SupplementalNameRule {
 name:string;ruleId:string;citation:Citation;excerpt:string;extraction:string;context:string;
 meaning:string;sourceMeaning:string;projectWish:string;readings:NameRuleReading[];
}
export const supplementalNameRules=additions.nameRules as SupplementalNameRule[];
const identityKeys=['id','sourceId','title','chapter','text'] as const;

/** A complete reviewed name is the scope of this credit; its characters gain no general approval. */
export function resolveSupplementalName(name:string,characters:Map<string,CharacterEntry>,citations:Citation[]):SupplementalNameRule|undefined{
 return supplementalNameRules.find(rule=>rule.name===name&&rule.readings.length===[...name].length&&rule.readings.map(reading=>reading.char).join('')===name&&rule.citation.text.includes(rule.excerpt)&&[...name].every(char=>rule.excerpt.includes(char))&&rule.readings.every(binding=>{
  const entry=characters.get(binding.char);return !!entry&&!!binding.dictionarySense&&matchesReviewedReading(entry,binding);
 })&&citations.some(citation=>identityKeys.every(key=>citation[key]===rule.citation[key])));
}
