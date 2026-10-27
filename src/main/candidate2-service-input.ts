import {snapshotApplicationJson} from './project-application-v132-r2-json';
import {CANDIDATE2_NAMING_SELECTION,type Candidate2NamingSelection} from '../shared/candidate2-naming-consumer-v1';
import {readNamePhoneticPreferences} from '../shared/name-phonetic-preferences';
import {validYueHomophoneRuleVersion} from '../shared/yue-homophone-types';
import type {NamingPreferences} from '../shared/types';

export interface Candidate2ServiceInput {
 profileId:string;preferences:NamingPreferences;selection:Candidate2NamingSelection;
}

const strings=['generationChar','requiredChars','forbiddenChars','elderTaboo','style','meanings','industry'] as const;
const required=['length',...strings,'priority','preferredElements','zodiacRules','numerology'] as const;
const booleans=['avoidParentNames','wordPronunciationReference','elementAssessment','imageryReading','yueReading'] as const;
const optional=[...booleans,'parentNamePhonetics','namePhonetics','yueHomophones','yueHomophoneRuleVersion'] as const;
const allowed=new Set<string>([...required,...optional]);
function fail(detail:string):never {
 throw Object.assign(new Error('CANDIDATE2_SERVICE_INPUT_INVALID: '+detail),{code:'CANDIDATE2_SERVICE_INPUT_INVALID'});
}
function object(value:unknown):asserts value is Record<string,unknown>{
 if(value===null||typeof value!=='object'||Array.isArray(value))fail('ordinary object required');
}

/** Own and validate the raw three-argument Service request. This performs no
 * defaults, trimming, feature disabling, eligibility, generation or storage.
 * Legal raw flags/manual choices are preserved for the real consumer to reject
 * explicitly when unsupported. This DTO carries no save or source authority. */
export function captureCandidate2ServiceInput(profileId:unknown,preferences:unknown,selection:unknown):Candidate2ServiceInput {
 if(arguments.length!==3)fail('exactly profile id, preferences and explicit selection required');
 // One whole-tree snapshot checks Proxy/accessors/undefined before any ordinary
 // reads, including nested arrays and extension options.
 const request=snapshotApplicationJson({profileId,preferences,selection}) as Record<string,unknown>;
 if(typeof request.profileId!=='string'||!request.profileId.trim()||request.profileId.length>1000)fail('existing native profile id required');
 const chosen=request.selection;object(chosen);
 const expected=Object.keys(CANDIDATE2_NAMING_SELECTION) as (keyof Candidate2NamingSelection)[];
 if(Object.keys(chosen).length!==expected.length||expected.some(key=>!Object.hasOwn(chosen,key)||chosen[key]!==CANDIDATE2_NAMING_SELECTION[key]))fail('exact explicit candidate.2 opt-in required');
 const pref=request.preferences;object(pref);
 if(Object.keys(pref).some(key=>!allowed.has(key))||required.some(key=>!Object.hasOwn(pref,key)))fail('complete preferences with only current candidate.2 fields required');
 if(pref.length!==1&&pref.length!==2)fail('invalid name length');
 if(strings.some(key=>typeof pref[key]!=='string'))fail('preference text must remain strings');
 if(typeof pref.priority!=='string'||!['balanced','traditional','sound','classic','simple'].includes(pref.priority))fail('invalid priority');
 if(!Array.isArray(pref.preferredElements)||pref.preferredElements.some(element=>!['木','火','土','金','水'].includes(element)))fail('invalid manual element array');
 if(typeof pref.zodiacRules!=='boolean'||typeof pref.numerology!=='boolean'||booleans.some(key=>Object.hasOwn(pref,key)&&typeof pref[key]!=='boolean'))fail('flags must be explicit booleans');
 if(Object.hasOwn(pref,'parentNamePhonetics')&&!['none','strict','ignore-tone'].includes(pref.parentNamePhonetics as string))fail('invalid parent pronunciation mode');
 if(Object.hasOwn(pref,'yueHomophones')&&!['none','strict','ignore-tone'].includes(pref.yueHomophones as string))fail('invalid Cantonese homophone mode');
 if(Object.hasOwn(pref,'yueHomophoneRuleVersion')&&(!validYueHomophoneRuleVersion(pref.yueHomophoneRuleVersion)||!['strict','ignore-tone'].includes(pref.yueHomophones as string)))fail('explicit compatible Cantonese mode/version required');
 // Existing preference validation is read-only here. Its normalized return is
 // deliberately discarded, so absent fields and caller intent remain intact.
 try{readNamePhoneticPreferences(pref as unknown as NamingPreferences);}catch{fail('invalid explicit pronunciation preferences');}
 return request as unknown as Candidate2ServiceInput;
}
