import {canonicalPlainJson} from '../shared/plain-json';import {calculateParentNamePhonetics} from '../domain/parent-name-phonetics';
import {PARENT_NAME_REVIEW_VERSION} from '../shared/parent-name-phonetics-review';
import type {ParentNamePhoneticSnapshot,ParentPhoneticProfile,ParentPhoneticPreferences,ParentPhoneticCandidate,ParentPhoneticSession} from '../shared/parent-name-phonetics-review';
import type {ParentNameReadingConfirmIntent,ParentNamePhoneticsMode,ParentNameBinding,ParentNameReadings} from '../shared/parent-name-phonetics';import type {CmnReadingQuery,CmnReadingSourceIdentity} from '../shared/cmn-reading';
import type {BirthProfile,NamingPreferences,NamingSession,SourceRecord} from '../shared/types';
import {parentNameMethodSource,parentNameDictionarySource,parentNameSourceValidator,PARENT_NAME_METHOD_SOURCE_ID,withParentNameSourceBoundary} from './parent-name-source-validator';
function fact(c:unknown,m:string):asserts c{if(!c)throw Error('家庭姓名读音：'+m);}
function slot(value:unknown,key:string):{present:boolean;value:unknown}{if(!value||typeof value!=='object')return{present:false,value:undefined};const d=Object.getOwnPropertyDescriptor(value,key);if(!d)return{present:false,value:undefined};fact(Object.hasOwn(d,'value')&&d.enumerable,'不可读取访问器或隐藏的'+key);return{present:true,value:d.value};}
const same=(a:unknown,b:unknown)=>canonicalPlainJson(a)===canonicalPlainJson(b);
export function readParentNamePhoneticsMode(value:unknown):ParentNamePhoneticsMode|undefined{const r=slot(value,'parentNamePhonetics');if(!r.present)return undefined;fact(r.value==='none'||r.value==='strict'||r.value==='ignore-tone','未知家庭给名比较模式；不得按当前模式回算。');return r.value;}
function profileNames(profile:ParentPhoneticProfile):Required<ParentNameBinding>{for(const k of ['fatherName','motherName']){const r=slot(profile,k);fact(!r.present||r.value===undefined||typeof r.value==='string'&&[...r.value].length<=40,'父母原名格式无效或超过40个字符。');}return{fatherName:profile.fatherName??'',motherName:profile.motherName??''};}
/** Confirmation is independent of the baby's birth fields and is not a profile
 * save. Take only safe own parent names, preserving their exact binding. */
export function parentNameBindingFromDraft(value:unknown):Required<ParentNameBinding>{
 const plain=canonicalPlainJson(value);fact(plain.length<=100000&&!!value&&typeof value==='object'&&!Array.isArray(value),'确认草稿须为有界普通资料对象。');const id=slot(value,'id');fact(!id.present||typeof id.value==='string'&&id.value.length<=300,'确认草稿客户编号无效。');return profileNames(value as ParentPhoneticProfile);
}
export function assertParentNameProfileInput(value:unknown){const r=slot(value,'parentNameReadings');if(r.present){canonicalPlainJson(r.value);for(const key of ['fatherName','motherName'])slot(value,key);}}
/** Inspect the new readonly field before any generic JSON budget/source traversal. */
export function assertParentNameReviewInput(value:unknown){
 const p=slot(value,'profile');if(p.present)assertParentNameProfileInput(p.value);const prefs=slot(value,'preferences');const mode=prefs.present?slot(prefs.value,'parentNamePhonetics'):{present:false,value:undefined};if(mode.present)readParentNamePhoneticsMode(prefs.value);
 const rows=slot(value,'candidates');let hasRows=false;if(rows.present){fact(Array.isArray(rows.value),'候选列表无效。');for(let i=0;i<rows.value.length;i++){const d=Object.getOwnPropertyDescriptor(rows.value,String(i));fact(d&&Object.hasOwn(d,'value')&&d.enumerable,'候选字位不得为空或访问器。');const record=slot(d.value,'parentNamePhoneticReview');if(record.present){canonicalPlainJson(record.value);hasRows=true;}}}
 if(mode.present||hasRows){slot(p.value,'fatherName');slot(p.value,'motherName');}
}
/** Sync save/read/backup guard; no JSON parse of the full dictionary is needed
 * after actual worker confirmation warmed this private data-directory cache.
 */
export function validateParentNameProfileSync(profile:BirthProfile,dataDirectory:string):ParentPhoneticProfile{
 assertParentNameProfileInput(profile);readParentNamePhoneticsMode(slot(profile,'namingPreferences').value);const value=slot(profile,'parentNameReadings');if(!value.present)return profile;const names=profileNames(profile);const readings=parentNameSourceValidator(dataDirectory).validateSync(value.value,names);return{...profile,parentNameReadings:readings};
}
function expectedSnapshot(session:ParentPhoneticSession,candidate:ParentPhoneticCandidate,mode:Exclude<ParentNamePhoneticsMode,'none'>,readings:ParentNameReadings,queries:ReadonlyMap<string,CmnReadingQuery>):ParentNamePhoneticSnapshot{
 const parentNames=profileNames(session.profile),child={surname:session.profile.surname,surnamePinyin:session.profile.surnamePinyin,givenName:candidate.givenName,characters:candidate.characters.map(r=>({char:r.char,pinyin:r.pinyin,tone:r.tone,sourceId:r.sourceId}))},result=calculateParentNamePhonetics({mode,profile:parentNames,child,readings},queries),dictionarySources:CmnReadingSourceIdentity[]=[];
 for(const unit of readings.flatMap(r=>r.readings))if(unit.origin==='dictionary'&&!dictionarySources.some(s=>same(s,unit.source)))dictionarySources.push(structuredClone(unit.source));
 return{version:PARENT_NAME_REVIEW_VERSION,recordState:'recorded',sessionId:session.id,candidateId:candidate.id,capture:{mode,parentNames,readings:structuredClone(readings),child},result,sourceSnapshot:{method:parentNameMethodSource(),dictionarySources,confirmationPolicy:'family-confirmed-actual-reading'}};
}
export function attachNewParentNamePhoneticReviews(session:NamingSession,dataDirectory:string):void{
 const s=session as ParentPhoneticSession,mode=readParentNamePhoneticsMode(s.preferences);if(!mode||mode==='none'){for(const c of s.candidates)fact(!slot(c,'parentNamePhoneticReview').present,'未启用家庭比较却附加结果。');return;}
 parentNameSourceValidator(dataDirectory).withQueries(slot(s.profile,'parentNameReadings').value,profileNames(s.profile),(readings,queries)=>{for(const c of s.candidates){fact(!slot(c,'parentNamePhoneticReview').present,'生成路径不得接受客户端家庭结果。');c.parentNamePhoneticReview=expectedSnapshot(s,c,mode,readings,queries);}});
}
export function parentNameGenerationSources(preferences:NamingPreferences,profile?:BirthProfile,existing:SourceRecord[]=[]):SourceRecord[]{const mode=readParentNamePhoneticsMode(preferences);if(!mode||mode==='none')return[];const desired=[parentNameMethodSource()],records=slot(profile,'parentNameReadings').value as ParentNameReadings|undefined;if(records?.some(r=>r.readings.some(u=>u.origin==='dictionary')))desired.push(parentNameDictionarySource());return desired.filter(source=>{const old=existing.find(r=>r.id===source.id);fact(!old||same(old,source),'所选知识包占用了与固定家庭来源不同的登记。');return!old;});}
/** Rebuild only to authenticate the exact recorded version; never assign a live
 * result to an old record, read-time profile or revision. Absence stays absent.
 */
export function verifySessionParentNamePhonetics(session:NamingSession,dataDirectory:string):void{
 const s=session as ParentPhoneticSession,mode=readParentNamePhoneticsMode(s.preferences),reserved=s.sourceSnapshot?.sources.filter(r=>r.id===PARENT_NAME_METHOD_SOURCE_ID)??[],hasRows=s.candidates.some(c=>slot(c,'parentNamePhoneticReview').present);
 if(!mode||mode==='none'){fact(!reserved.length&&!hasRows,'关闭或历史未启用家庭比较的方案附带来源或结果。');if(slot(s.profile,'parentNameReadings').present)validateParentNameProfileSync(s.profile,dataDirectory);return;}
 fact(reserved.length===1&&same(reserved[0],parentNameMethodSource()),'生成时家庭方法来源缺失、重复或被替换。');
 parentNameSourceValidator(dataDirectory).withQueries(slot(s.profile,'parentNameReadings').value,profileNames(s.profile),(readings,queries)=>{for(const c of s.candidates){const saved=slot(c,'parentNamePhoneticReview');fact(saved.present,'启用家庭比较但保存结果缺失，不能读取时补算。');canonicalPlainJson(saved.value);fact(same(saved.value,expectedSnapshot(s,c,mode,readings,queries)),'家庭保存结果、读音、原名、源或版本被修改。');}});
 if(s.profile.parentNameReadings?.some(r=>r.readings.some(u=>u.origin==='dictionary')))fact(same(s.sourceSnapshot!.sources.find(r=>r.id==='moe-revised'),parentNameDictionarySource()),'家庭词典来源没有保留在生成时来源登记。');
}
/** Apply before ordinary review rebuilds a candidate from its previous row. */
export function assertUnchangedParentNamePhoneticReview(next:NamingSession,previous:NamingSession):void{
 const a=next as ParentPhoneticSession,b=previous as ParentPhoneticSession,hasAny=slot(a.profile,'parentNameReadings').present||slot(b.profile,'parentNameReadings').present||slot(a.preferences,'parentNamePhonetics').present||slot(b.preferences,'parentNamePhonetics').present||a.candidates.some(c=>slot(c,'parentNamePhoneticReview').present)||b.candidates.some(c=>slot(c,'parentNamePhoneticReview').present);if(!hasAny)return;
 const optional=(v:unknown,k:string)=>{const r=slot(v,k);return r.present?{present:true,value:r.value}:{present:false};};
 fact(same(profileNames(a.profile),profileNames(b.profile))&&same(optional(a.profile,'parentNameReadings'),optional(b.profile,'parentNameReadings'))&&same(optional(a.preferences,'parentNamePhonetics'),optional(b.preferences,'parentNamePhonetics')),'原方案父母姓名、确认读音和比较模式不可通过普通审阅改变。');
 for(const old of b.candidates){const c=a.candidates.find(r=>r.id===old.id);fact(c&&same(optional(c,'parentNamePhoneticReview'),optional(old,'parentNamePhoneticReview')),'普通审阅不能附加、删除或嫁接家庭比较快照。');}
}
export function parentNameReadingsInputKey(profile:BirthProfile):string{const r=slot(profile,'parentNameReadings');return r.present?canonicalPlainJson(r.value):'absent';}
export function createParentNamePhoneticsMainAdapter(dataDirectory:string,actualWorkerQuery:(char:string)=>Promise<CmnReadingQuery>){
 return Object.freeze({
  async confirm(draftProfile:ParentNameBinding,intent:ParentNameReadingConfirmIntent){const names=parentNameBindingFromDraft(draftProfile);canonicalPlainJson(intent);return parentNameSourceValidator(dataDirectory).confirm(names,intent,actualWorkerQuery);},
  validateProfile:(p:BirthProfile)=>validateParentNameProfileSync(p,dataDirectory),
  sources:parentNameGenerationSources,
  attachNew:(s:NamingSession)=>attachNewParentNamePhoneticReviews(s,dataDirectory),
  verifySession:(s:NamingSession)=>verifySessionParentNamePhonetics(s,dataDirectory),
  boundary:<T>(name:string,action:()=>T)=>withParentNameSourceBoundary(dataDirectory,name,action),
  diagnostics:()=>parentNameSourceValidator(dataDirectory).diagnostics(),
 });
}
