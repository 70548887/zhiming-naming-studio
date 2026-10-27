import type {WrittenWordReferences} from '../../data/name-word-pronunciation/word-engine.mjs';
import type {PhoneticEnabledPreferences} from './name-phonetic-review-types';
import {ownPhoneticValue,readNamePhoneticPreferences} from './name-phonetic-preferences';
import {canonicalPlainJson} from './plain-json';

/** Exact structural shape returned by the frozen reader; separate from namePhoneticReviews. */
export interface NameWordPronunciationSnapshot {
 readonly version:'name-written-word-references/1.0.0';
 readonly sourceLockSha256:string;
 readonly sourceIds:readonly string[];
 readonly reviews:{readonly cmn?:WrittenWordReferences;readonly yue?:WrittenWordReferences;};
}
export const WORD_PRONUNCIATION_VERSION='name-written-word-references/1.0.0' as const;
export const WORD_PRONUNCIATION_LOCK='23b218e227cd102c2b0ddef1dd8258fd4a87b2a0b8019f4413dae8f84abea07c';
export const WORD_PRONUNCIATION_SOURCE_IDS=Object.freeze(['word-pronunciation-moe-137-v1','word-pronunciation-rime-137-v1','word-pronunciation-unicode-137-v1'] as const);
/** Absence/false is off; enabling reuses the explicitly selected languages and modes. */
export function readWordPronunciationPreference(preferences:unknown):boolean {
 if(preferences===undefined)return false;
 const slot=ownPhoneticValue(preferences,'wordPronunciationReference');if(!slot.present)return false;
 if(typeof slot.value!=='boolean')throw Error('整词读音参照开关必须为明确布尔值。');
 if(slot.value&&!readNamePhoneticPreferences(preferences as PhoneticEnabledPreferences))throw Error('请先明确选择普通话或粤语及声调比较模式，再开启整词读音参照。');
 return slot.value;
}
export function validWordPronunciationPreference(preferences:unknown):boolean {try{readWordPronunciationPreference(preferences);return true;}catch{return false;}}
/** Guard the new immutable field before any JSON serialization or object spread. */
export function assertWordPronunciationFields(value:unknown):void {
 if(!value||typeof value!=='object')return;
 const pref=ownPhoneticValue(value,'preferences');if(pref.present)readWordPronunciationPreference(pref.value);
 const candidates=ownPhoneticValue(value,'candidates');if(!candidates.present)return;
 if(!Array.isArray(candidates.value))throw Error('整词参照候选列表无效。');
 for(let i=0;i<candidates.value.length;i++){
  const item=Object.getOwnPropertyDescriptor(candidates.value,String(i));if(!item||!Object.hasOwn(item,'value'))throw Error('整词参照候选不接受空位或访问器。');
  const field=ownPhoneticValue(item.value,'wordPronunciationReference');if(field.present)canonicalPlainJson(field.value);
 }
}
export function hasWordPronunciationFootprint(session:unknown):boolean {
 assertWordPronunciationFields(session);
 const preferences=ownPhoneticValue(session,'preferences').value;if(readWordPronunciationPreference(preferences))return true;
 const candidates=ownPhoneticValue(session,'candidates').value;if(!Array.isArray(candidates))throw Error('整词参照候选列表无效。');
 if(candidates.some(c=>ownPhoneticValue(c,'wordPronunciationReference').present))return true;
 const saved=ownPhoneticValue(session,'sourceSnapshot');if(!saved.present)return false;canonicalPlainJson(saved.value);
 const sources=ownPhoneticValue(saved.value,'sources').value;if(!Array.isArray(sources))throw Error('整词参照来源列表无效。');
 return sources.some(source=>(WORD_PRONUNCIATION_SOURCE_IDS as readonly unknown[]).includes(ownPhoneticValue(source,'id').value));
}
