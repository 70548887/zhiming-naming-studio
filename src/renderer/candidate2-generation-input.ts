import {canonicalPlainJson} from '../shared/plain-json';
import type {BirthProfile,NamingPreferences} from '../shared/types';

export interface Candidate2GenerationContext {
 profile:BirthProfile;preferences:NamingPreferences;
 /** Actual App-owned saved profile/preferences from a successful backend read
  * or explicit saveProfile response; a draft or eligibility DTO is not a substitute. */
 savedProfile:BirthProfile|null;savedPreferences:NamingPreferences|null;
 contextKey:string;storageReadOnly:boolean;dirty:boolean;blockedReason?:string;
}
/** Preserve exact JSON values and reject accessors/hidden metadata. Undefined
 * object fields are omitted as in IPC JSON; values are never trimmed/rewritten. */
export function candidate2OwnedInput<T>(value:T):T {
 function walk(input:unknown,depth:number):unknown {
  if(depth>100)throw Error('资料结构过深。');
  if(Array.isArray(input)){canonicalPlainJson(input);return JSON.parse(canonicalPlainJson(input));}
  if(input&&typeof input==='object'){
   if(![Object.prototype,null].includes(Object.getPrototypeOf(input)))throw Error('资料须为普通数据对象。');
   const result:Record<string,unknown>={};
   for(const key of Reflect.ownKeys(input)){
    const descriptor=Object.getOwnPropertyDescriptor(input,key);
    if(typeof key!=='string'||!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)throw Error('资料不得包含访问器或隐藏字段。');
    if(descriptor.value!==undefined)Object.defineProperty(result,key,{value:walk(descriptor.value,depth+1),enumerable:true,writable:true,configurable:true});
   }
   return result;
  }
  canonicalPlainJson(input);return input;
 }
 return walk(value,0) as T;
}
export function candidate2ProfileIdentity(profile:BirthProfile):string {
 const captured=candidate2OwnedInput(profile),{namingPreferences:ignored,...data}=captured;
 void ignored;return canonicalPlainJson(data);
}
export function candidate2ContextSignature(context:Candidate2GenerationContext):string{return canonicalPlainJson(candidate2OwnedInput(context));}
export function candidate2GenerationBlock(context:Candidate2GenerationContext):string|null {
 try{
  const c=candidate2OwnedInput(context);
  if(c.storageReadOnly)return'客户库当前只读；请主动处理存储状态后再生成。';
  if(!c.savedProfile||!c.savedPreferences||typeof c.profile.id!=='string'||!c.profile.id||c.savedProfile.id!==c.profile.id)return'请先保存当前宝宝档案和起名偏好，再明确生成。';
  if(c.dirty||candidate2ProfileIdentity(c.profile)!==candidate2ProfileIdentity(c.savedProfile)||canonicalPlainJson(c.preferences)!==canonicalPlainJson(c.savedPreferences)||!c.savedProfile.namingPreferences||canonicalPlainJson(c.savedProfile.namingPreferences)!==canonicalPlainJson(c.savedPreferences)||c.profile.namingPreferences!==undefined&&canonicalPlainJson(c.profile.namingPreferences)!==canonicalPlainJson(c.preferences))return'当前资料或偏好尚未与已保存档案一致。请先明确保存，再核对当前资料。';
  if(c.blockedReason)return c.blockedReason;
  const pref=c.preferences;
  if(!Array.isArray(pref.preferredElements)||pref.preferredElements.length||Object.hasOwn(pref,'namingElementMethod'))return'项目固定取法与人工五行或原项目取法冲突，请先明确调整偏好并保存。';
  if(pref.numerology||pref.imageryReading||pref.yueReading||pref.elementAssessment||pref.wordPronunciationReference||pref.namePhonetics||pref.parentNamePhonetics&&pref.parentNamePhonetics!=='none'||pref.yueHomophones&&pref.yueHomophones!=='none')return'当前可选增强功能不在本次固定生成链路内，请先明确关闭相关选项并保存。';
  return null;
 }catch{return'当前资料结构无效，未提交生成请求。';}
}
