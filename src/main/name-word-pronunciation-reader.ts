import {join} from 'node:path';
import {canonicalPlainJson} from '../../data/name-phonetic/name-phonetic-engine.mjs';
import {calculateWrittenWordReferences} from '../../data/name-word-pronunciation/word-engine.mjs';
import {verifyWordPronunciationPackage} from '../../data/name-word-pronunciation/word-source-loader.mjs';
import {loadNamePhoneticAdapter} from './name-phonetic-adapter';
import type {PhoneticBirthProfile,PhoneticCandidate,PhoneticEnabledPreferences} from '../shared/name-phonetic-review-types';
import type {WrittenWordReferences} from '../../data/name-word-pronunciation/word-engine.mjs';
import type {SourceRecord} from '../shared/types';
const freeze=<T>(x:T):T=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const SOURCE_IDS=freeze(['word-pronunciation-moe-137-v1','word-pronunciation-rime-137-v1','word-pronunciation-unicode-137-v1'] as const);
export interface NameWrittenWordSnapshot {version:'name-written-word-references/1.0.0';sourceLockSha256:string;sourceIds:readonly string[];reviews:{cmn?:WrittenWordReferences;yue?:WrittenWordReferences};}
/** Main-only opt-in consumer. Existing adapters/historical records remain unchanged. */
export function loadNameWordPronunciationReader(dataDirectory:string){
 const adapter=loadNamePhoneticAdapter(dataDirectory),gate=Object.freeze(verifyWordPronunciationPackage(join(dataDirectory,'name-word-pronunciation')));
 const sources:readonly SourceRecord[]=freeze(SOURCE_IDS.map((id,index)=>({id,name:['固定教育部原词读音与义项参考','固定Rime整词读音参考','固定Unicode原字形对应'][index],url:['https://github.com/g0v/moedict-data/tree/a6dc997417507eb510fc29822bc514de2c92728c','https://github.com/rime/rime-cantonese/tree/259f0e48bba840c3a2e0d117539e96937f3d89bc','https://www.unicode.org/versions/Unicode17.0.0/'][index],commit:['a6dc997417507eb510fc29822bc514de2c92728c','259f0e48bba840c3a2e0d117539e96937f3d89bc','Unicode17.0.0'][index],license:['CC-BY-ND-3.0-TW','CC-BY-4.0','Unicode License'][index],files:['data/name-word-pronunciation/word-source-lock.json','data/name-word-pronunciation/source-excerpts.json'],sha256:gate.sourceLockSha256,note:'独立整词读音参考包；登记SHA为整包固定来源锁，不覆盖现有MOE/Rime/Unicode来源身份，不把原词读音当姓名读法或义项定论。'})));
 const calculate=(profile:PhoneticBirthProfile,preferences:PhoneticEnabledPreferences,candidate:PhoneticCandidate):NameWrittenWordSnapshot|undefined=>{
  const actual=adapter.calculate(profile,preferences,candidate);if(!actual)return undefined;
  const reviews:NameWrittenWordSnapshot['reviews']={};
  for(const language of ['cmn','yue']as const){const reading=actual.selectedReadings[language],previous=actual.reviews[language];if(reading&&previous)reviews[language]=calculateWrittenWordReferences({surname:profile.surname,given:candidate.givenName,mode:previous.mode,reading});}
  return Object.freeze({version:'name-written-word-references/1.0.0' as const,sourceLockSha256:gate.sourceLockSha256,sourceIds:SOURCE_IDS,reviews:Object.freeze(reviews)});
 };
 const verifySnapshot=(value:unknown,profile:PhoneticBirthProfile,preferences:PhoneticEnabledPreferences,candidate:PhoneticCandidate)=>{const expected=calculate(profile,preferences,candidate);if(expected===undefined?value!==undefined:value===undefined||canonicalPlainJson(value)!==canonicalPlainJson(expected))throw Error('整词读音参考与实际已选姓名音、固定原文或声调模式不一致。');};
 return Object.freeze({gate,sources,calculate,verifySnapshot});
}
