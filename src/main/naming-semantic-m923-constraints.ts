import {createHash} from 'node:crypto';
import {isDeepStrictEqual,types} from 'node:util';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import fixedDataset from '../../data/dataset-v6.json';
import {analyzeProfile} from '../domain/engine';
import {evaluateNameForRuleVersionWithContext} from '../domain/naming';
import {expandNameVariants,parentNameReference,validatePreferences as validateGeneratorPreferences} from '../domain/naming-v7';
import {reviewedNamingSense} from '../domain/naming-semantics-v6';
import {culturalCanonicalJson,ownCulturalJson} from '../domain/qimen-cultural-comparison-canonical';
import {normalizePreferences} from '../shared/workflow';
import {readNamingElementMethodSelection} from '../shared/project-naming-use';
import {readNamePhoneticPreferences} from '../shared/name-phonetic-preferences';
import {readWordPronunciationPreference} from '../shared/word-pronunciation-reference';
import {validYueHomophoneRuleVersion} from '../shared/yue-homophone-types';
import {YUE_HOMOPHONE_VERSION} from '../domain/yue-homophones';
import {selectedReferenceOnlyReading} from '../shared/character-reading-reference';
import {NAMING_RULE_V7_VERSION} from '../shared/naming-rules';
import {readCulturalStoredProfile} from './qimen-cultural-provider-profile-v1';
import {readParentNamePhoneticsMode,validateParentNameProfileSync} from './parent-name-phonetics-adapter';
import type {Analysis,BirthProfile,CharacterEntry,Citation,NameCandidate,NamingPreferences} from '../shared/types';

export const M923_CONSTRAINT_ENGINE_ID='m923-existing-constraints-v1' as const;
const FIXED_CONTEXT=Object.freeze({packSha256:'1875aa49dcfaeca0f266a3be7578e4d4b2a9b2c9c1f59fd79699a3e26d5d6b8b',activeVersion:'1875aa49dcfa'});
const FIXED_SOURCE_DATA_DIR=resolve(fileURLToPath(new URL('../../data',import.meta.url)));
export interface M923ConstraintDataset {characters:CharacterEntry[];citations:Citation[];}
export interface NormalizedM923Constraints {
 profile:BirthProfile;preferences:NamingPreferences;analysis:Analysis;
 constraintEngineId:typeof M923_CONSTRAINT_ENGINE_ID;constraintContextSHA256:string;
}
const FIXED_DATA=ownCulturalJson<M923ConstraintDataset>({characters:fixedDataset.characters,citations:fixedDataset.citations});
const normalizedOwners=new WeakMap<object,{sourceDataset:M923ConstraintDataset;dataset:M923ConstraintDataset}>();
const invalid=():never=>{throw Error('M923_CONSTRAINT_INPUT_INVALID');};
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
function fields(value:unknown,required:readonly string[],optional:readonly string[]=[]):asserts value is Record<string,unknown>{
 if(!record(value)||required.some(key=>!Object.hasOwn(value,key))||Object.keys(value).some(key=>!required.includes(key)&&!optional.includes(key)))invalid();
}
const PROFILE_REQUIRED=['id','customerName','surname','surnamePinyin','gender','calendar','birthDate','leapMonth','birthTime','timeUnknown','birthPlace','timezone','notes'];
const PROFILE_OPTIONAL=['fatherName','motherName','parentNameReadings','namingPreferences','monthAuthorityMethod','seasonalMethod','timeBasis','birthLongitude','renMethod'];
const PREFERENCE_REQUIRED=['length','generationChar','requiredChars','forbiddenChars','elderTaboo','style','meanings','industry','priority','preferredElements','zodiacRules','numerology'];
const PREFERENCE_OPTIONAL=['namingElementMethod','avoidParentNames','parentNamePhonetics','wordPronunciationReference','elementAssessment','imageryReading','yueReading','namePhonetics','yueHomophones','yueHomophoneRuleVersion'];

/** The Service preference schema is copied here so this standalone family
 * does not obtain a Service/Store instance or drop any effective constraint.
 * All inspection follows the descriptor-only ordinary-data ownership gate.
 */
function readPreferences(value:unknown):NamingPreferences{
 fields(value,PREFERENCE_REQUIRED,PREFERENCE_OPTIONAL);
 const p=value as unknown as NamingPreferences;
 if(![1,2].includes(p.length)||!['balanced','traditional','sound','classic','simple'].includes(p.priority))invalid();
 for(const key of ['generationChar','requiredChars','forbiddenChars','elderTaboo','style','meanings','industry','priority'] as const)if(typeof p[key]!=='string'||p[key].length>1000)invalid();
 if(!Array.isArray(p.preferredElements)||p.preferredElements.some(e=>!['木','火','土','金','水'].includes(e)))invalid();
 for(const key of ['zodiacRules','numerology'] as const)if(typeof p[key]!=='boolean')invalid();
 for(const key of ['avoidParentNames','elementAssessment','imageryReading','yueReading'] as const)if(p[key]!==undefined&&typeof p[key]!=='boolean')invalid();
 if(p.yueHomophones!==undefined&&!['none','strict','ignore-tone'].includes(p.yueHomophones)||(p.yueHomophones??'none')!=='none'&&p.yueReading!==true)invalid();
 if(p.yueHomophoneRuleVersion!==undefined&&(!validYueHomophoneRuleVersion(p.yueHomophoneRuleVersion)||(p.yueHomophones??'none')==='none'))invalid();
 const namingElementMethod=readNamingElementMethodSelection(p),parentNamePhonetics=readParentNamePhoneticsMode(p);
 const wordReference=readWordPronunciationPreference(p),namePhonetics=readNamePhoneticPreferences(p);
 if(namingElementMethod&&p.preferredElements.length)invalid();
 const {length,generationChar,requiredChars,forbiddenChars,elderTaboo,style,meanings,industry,priority,preferredElements,zodiacRules,numerology,avoidParentNames,imageryReading,yueReading,yueHomophones,yueHomophoneRuleVersion}=p;
 return normalizePreferences({...(namingElementMethod?{namingElementMethod}:{}),...(parentNamePhonetics!==undefined?{parentNamePhonetics}:{}),...(wordReference?{wordPronunciationReference:true}:{}),...(namePhonetics?{namePhonetics}:{}),...(p.elementAssessment!==undefined?{elementAssessment:p.elementAssessment}:{}),length,generationChar,requiredChars,forbiddenChars,elderTaboo,style,meanings,industry,priority,preferredElements,zodiacRules,numerology,avoidParentNames,imageryReading,yueReading,yueHomophones,...((yueHomophones??'none')!=='none'?{yueHomophoneRuleVersion:yueHomophoneRuleVersion??YUE_HOMOPHONE_VERSION}:{})});
}

/** Complete effective profile/preferences are bound using M923-C14N-1. The
 * engine ID, analysis and context digest are produced only by this adapter.
 * Dataset bytes/source authority are authenticated by the private family
 * loader; this gate additionally rejects a substituted baseline projection.
 */
export function normalizeM923Constraints(input:unknown,dataset:M923ConstraintDataset):NormalizedM923Constraints{
 const owned=ownCulturalJson<Record<string,unknown>>(input);
 fields(owned,['profile','preferences']);fields(owned.profile,PROFILE_REQUIRED,PROFILE_OPTIONAL);
 const rawProfile=owned.profile as unknown as BirthProfile;
 if(typeof rawProfile.id!=='string'||!rawProfile.id.trim()||typeof rawProfile.surname!=='string'||!/^\p{Script=Han}{1,4}$/u.test(rawProfile.surname.trim()))invalid();
 for(const key of ['fatherName','motherName'] as const)if(rawProfile[key]!==undefined&&(typeof rawProfile[key]!=='string'||[...rawProfile[key]!].length>40))invalid();
 if(rawProfile.namingPreferences!==undefined)readPreferences(rawProfile.namingPreferences);
 const preferences=readPreferences(owned.preferences);
 // This adapter has no caller-supplied resolved-basis/engine-result input.
 // A separately supported project method must use its real main resolver.
 if(readNamingElementMethodSelection(preferences))throw Error('M923_CONSTRAINT_UNSUPPORTED_PROJECT_METHOD');
 const data=ownCulturalJson<M923ConstraintDataset>(dataset);fields(data,['characters','citations']);
 if(!isDeepStrictEqual(data,FIXED_DATA))throw Error('M923_CONSTRAINT_DATASET_MISMATCH');
 const profileDraft={...rawProfile,surname:rawProfile.surname.trim(),fatherName:rawProfile.fatherName?.trim()||'',motherName:rawProfile.motherName?.trim()||'',namingPreferences:preferences};
 const stored=readCulturalStoredProfile(profileDraft,rawProfile.id);
 const profile=validateParentNameProfileSync(stored,FIXED_SOURCE_DATA_DIR);
 validateGeneratorPreferences(preferences,data.characters,profile);
 const analysis=analyzeProfile(profile);
 const constraintContextSHA256=createHash('sha256').update(culturalCanonicalJson({schema:'m923-constraint-context/1',engineId:M923_CONSTRAINT_ENGINE_ID,profile,preferences}),'utf8').digest('hex');
 const normalized=ownCulturalJson<NormalizedM923Constraints>({profile,preferences,analysis,constraintEngineId:M923_CONSTRAINT_ENGINE_ID,constraintContextSHA256});
 normalizedOwners.set(normalized,{sourceDataset:dataset,dataset:data});return normalized;
}

function captured(normalized:NormalizedM923Constraints,dataset:M923ConstraintDataset):M923ConstraintDataset{
 if(!normalized||typeof normalized!=='object'||types.isProxy(normalized)||!dataset||typeof dataset!=='object'||types.isProxy(dataset))invalid();
 const owned=normalizedOwners.get(normalized);
 if(!owned||owned.sourceDataset!==dataset)throw Error('M923_CONSTRAINT_UNTRUSTED_NORMALIZED');
 return owned.dataset;
}
const normalizeConstraint=(value:string)=>value.replace(/[\s,，、]/g,'');
/** Exact character-only predicates from naming-v7. Its full-name awkward
 * reading and combination predicates still run in the real final evaluator.
 */
const FORBIDDEN_CHARACTERS='死屎尿癌妓嫖傻蠢贱丑残病殇夭';
function semanticCaution(entry:CharacterEntry):boolean{
 const first=entry.meaning.split(/[；;]/)[0].trim();
 return /^(參見|参见|見「|见「)/.test(first)&&!reviewedNamingSense(entry)||/倨慢|邪惡|邪恶|愚蠢|死亡|疾病|病痛|醜陋|丑陋|奴隸|奴隶|侮辱|卑賤|卑贱|淫亂|淫乱|災禍|灾祸|貪婪|贪婪|怨恨|悲傷|悲伤|憂愁|忧愁|孤獨|孤独|孤單|孤单/.test(first);
}
export function checkM923PoolConstraints(char:string,normalized:NormalizedM923Constraints,dataset:M923ConstraintDataset):boolean{
 const data=captured(normalized,dataset);if(typeof char!=='string'||!/^\p{Script=Han}$/u.test(char))return false;
 const {profile,preferences}=normalized,entry=data.characters.find(c=>c.char===char);if(!entry)return false;
 const excluded=preferences.forbiddenChars+preferences.elderTaboo+parentNameReference(profile,preferences,data.characters).excluded+FORBIDDEN_CHARACTERS;
 if(expandNameVariants(excluded,data.characters).includes(char.normalize('NFKC'))||selectedReferenceOnlyReading(entry)||entry.meaning.trimStart().startsWith('辞典参照：'))return false;
 const required=normalizeConstraint(preferences.requiredChars+preferences.generationChar),requiredSet=new Set([...required]);
 if(semanticCaution(entry)&&!required.includes(char))return false;
 // At pool stage a two-character name may contain both a required glyph and
 // this glyph. Exclude outsiders only when all requested slots are occupied.
 if(requiredSet.size===preferences.length&&!requiredSet.has(char))return false;
 return true;
}
export function checkM923CandidateConstraints(givenName:string,normalized:NormalizedM923Constraints,dataset:M923ConstraintDataset,origin:'local'|'ai'):NameCandidate|null{
 const data=captured(normalized,dataset);
 if(typeof givenName!=='string'||!/^\p{Script=Han}{1,2}$/u.test(givenName)||origin!=='local'&&origin!=='ai')return null;
 return evaluateNameForRuleVersionWithContext(NAMING_RULE_V7_VERSION,FIXED_CONTEXT,givenName,normalized.profile,normalized.preferences,normalized.analysis,data.characters,data.citations,origin);
}
