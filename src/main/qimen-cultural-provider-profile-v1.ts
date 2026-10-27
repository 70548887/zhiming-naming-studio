import {ownCulturalJson} from '../domain/qimen-cultural-comparison-canonical';
import {validCivilBirthProfile} from '../shared/civil-birth';
import {validBirthTimeInput} from '../shared/birth-time-basis';
import {validMonthAuthorityMethod} from '../shared/month-authority-method';
import {validSeasonalMethod} from '../shared/seasonal-method';
import {validRenMethod} from '../shared/ren-method';
import {validWordPronunciationPreference} from '../shared/word-pronunciation-reference';
import {validNamePhoneticPreferences} from '../shared/name-phonetic-preferences';
import {validYueHomophoneRuleVersion} from '../shared/yue-homophone-types';
import {readNamingElementMethodSelection} from '../shared/project-naming-use';
import {readParentNamePhoneticsMode} from './parent-name-phonetics-adapter';
import type {BirthProfile,NamingPreferences} from '../shared/types';

const fail=():never=>{throw Error('CULTURAL_STORED_PROFILE_INVALID');};
const strings=(v:unknown):v is string[]=>Array.isArray(v)&&v.every(x=>typeof x==='string');
function checkPreferences(value:NamingPreferences):void{
 const allowed=['length','generationChar','requiredChars','forbiddenChars','elderTaboo','style','meanings','industry','priority','preferredElements','zodiacRules','numerology','namingElementMethod','avoidParentNames','parentNamePhonetics','wordPronunciationReference','elementAssessment','imageryReading','yueReading','namePhonetics','yueHomophones','yueHomophoneRuleVersion'];
 if(!value||typeof value!=='object'||Object.keys(value).some(k=>!allowed.includes(k))||![1,2].includes(value.length)||!['balanced','traditional','sound','classic','simple'].includes(value.priority))fail();
 for(const k of ['generationChar','requiredChars','forbiddenChars','elderTaboo','style','meanings','industry','priority'] as const)if(typeof value[k]!=='string'||value[k].length>1000)fail();
 if(!strings(value.preferredElements)||value.preferredElements.some(e=>!['木','火','土','金','水'].includes(e))||typeof value.zodiacRules!=='boolean'||typeof value.numerology!=='boolean')fail();
 for(const k of ['avoidParentNames','elementAssessment','imageryReading','yueReading'] as const)if(value[k]!==undefined&&typeof value[k]!=='boolean')fail();
 if(value.yueHomophones!==undefined&&!['none','strict','ignore-tone'].includes(value.yueHomophones)||(value.yueHomophones??'none')!=='none'&&value.yueReading!==true)fail();
 if(value.yueHomophoneRuleVersion!==undefined&&(!validYueHomophoneRuleVersion(value.yueHomophoneRuleVersion)||(value.yueHomophones??'none')==='none'))fail();
 if(!validWordPronunciationPreference(value)||!validNamePhoneticPreferences(value))fail();
 readNamingElementMethodSelection(value);readParentNamePhoneticsMode(value);
}
/** A new bounded semantic gate for a stored profile, not a public profile input
 * endpoint. It preserves exact values; it never normalizes or calls the chart
 * analyzer. Parent-readings provenance remains checked by the actual Store.
 */
export function readCulturalStoredProfile(value:unknown,expectedId:string):BirthProfile{
 const p=ownCulturalJson<BirthProfile>(value);
 const allowed=['id','customerName','surname','surnamePinyin','gender','calendar','birthDate','leapMonth','birthTime','timeUnknown','birthPlace','timezone','notes','fatherName','motherName','parentNameReadings','namingPreferences','monthAuthorityMethod','seasonalMethod','timeBasis','birthLongitude','renMethod'];
 if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).some(k=>!allowed.includes(k))||Buffer.byteLength(JSON.stringify(p),'utf8')>200_000||p.id!==expectedId||!p.id.trim())return fail();
 for(const k of ['id','customerName','surname','surnamePinyin','birthDate','birthTime','birthPlace','timezone','notes'] as const)if(typeof p[k]!=='string'||p[k].length>(k==='notes'?10000:300))return fail();
 if(!/^\p{Script=Han}{1,4}$/u.test(p.surname)||!['男','女','中性'].includes(p.gender)||!['solar','lunar'].includes(p.calendar)||typeof p.timeUnknown!=='boolean'||typeof p.leapMonth!=='boolean')return fail();
 if(!p.timeUnknown&&!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(p.birthTime))return fail();
 for(const k of ['fatherName','motherName'] as const)if(p[k]!==undefined&&(typeof p[k]!=='string'||[...p[k]!].length>40))return fail();
 if(!validMonthAuthorityMethod(p.monthAuthorityMethod)||!validSeasonalMethod(p.seasonalMethod)||!validRenMethod(p.renMethod)||!validBirthTimeInput(p)||!validCivilBirthProfile(p))return fail();
 if(p.namingPreferences!==undefined)checkPreferences(p.namingPreferences);
 return p;
}
