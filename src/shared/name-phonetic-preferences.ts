import {canonicalPlainJson} from './plain-json';
import type {NamePhoneticPreferences,PhoneticEnabledPreferences} from './name-phonetic-review-types';

export const NAME_PHONETIC_SOURCE_IDS=['phonetic-wiktionary-fixed-137','phonetic-rime-fixed-137'] as const;
export const NAME_PHONETIC_SNAPSHOT_VERSION='name-phonetic-reviews/1.0.0' as const;
export const NAME_PHONETIC_VERSIONS={cmn:'cmn-homophone-review/1.0.0',yue:'yue-homophone-review/1.2.0'} as const;

/** Inspect a relevant property before reading it; never execute an accessor supplied by IPC/import. */
export function ownPhoneticValue(value:unknown,key:string):{present:boolean;value:unknown}{
  if(!value||typeof value!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error('词音复核对象无效。');
  const descriptor=Object.getOwnPropertyDescriptor(value,key);
  if(!descriptor)return{present:false,value:undefined};
  if(!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)throw new Error('词音复核字段不得含访问器或隐藏数据。');
  return{present:true,value:descriptor.value};
}

/** Returns a detached canonical selection. Enabled languages always carry an explicit current version. */
export function readNamePhoneticPreferences(preferences:PhoneticEnabledPreferences):NamePhoneticPreferences|undefined{
  const slot=ownPhoneticValue(preferences,'namePhonetics');
  if(!slot.present)return undefined;
  canonicalPlainJson(slot.value);
  if(!slot.value||typeof slot.value!=='object'||Array.isArray(slot.value))throw new Error('词音复核偏好无效。');
  const keys=Object.keys(slot.value);
  if(!keys.length||keys.some(key=>!['cmn','yue'].includes(key)))throw new Error('词音复核须显式选择普通话或粤语；关闭时移除独立偏好。');
  const result:NamePhoneticPreferences={};
  for(const language of ['cmn','yue'] as const){
    if(!Object.hasOwn(slot.value,language))continue;
    const option=(slot.value as Record<string,unknown>)[language];
    if(!option||typeof option!=='object'||Array.isArray(option)||Object.keys(option).sort().join(',')!=='mode,version')throw new Error('词音复核语言选项缺少明确版本或含额外字段。');
    const item=option as {version:unknown;mode:unknown};
    if(item.version!==NAME_PHONETIC_VERSIONS[language]||!['strict','ignore-tone'].includes(item.mode as string))throw new Error('词音复核版本或模式不受支持。');
    if(language==='cmn')result.cmn={version:NAME_PHONETIC_VERSIONS.cmn,mode:item.mode as 'strict'|'ignore-tone'};
    else result.yue={version:NAME_PHONETIC_VERSIONS.yue,mode:item.mode as 'strict'|'ignore-tone'};
  }
  if(result.yue){
    if(ownPhoneticValue(preferences,'yueReading').value!==true)throw new Error('粤语1.2词汇复核须启用读音参考。');
    const oldMode=ownPhoneticValue(preferences,'yueHomophones'),oldVersion=ownPhoneticValue(preferences,'yueHomophoneRuleVersion');
    if(oldMode.present&&oldMode.value!=='none'||oldVersion.present)throw new Error('旧粤语1.0/1.1和新粤语1.2须择一明确保存，不能同时启用。');
  }
  return result;
}

export function validNamePhoneticPreferences(preferences:PhoneticEnabledPreferences):boolean{
  try{readNamePhoneticPreferences(preferences);return true;}catch{return false;}
}

/** Detect every new marker before deciding whether a historical row needs the independent gate. */
export function hasNamePhoneticFootprint(session:unknown):boolean{
  const preferences=ownPhoneticValue(session,'preferences').value;
  if(ownPhoneticValue(preferences,'namePhonetics').present)return true;
  const candidates=ownPhoneticValue(session,'candidates').value;
  if(!Array.isArray(candidates)||Object.getPrototypeOf(candidates)!==Array.prototype||Reflect.ownKeys(candidates).length!==candidates.length+1)throw new Error('词音复核候选列表无效。');
  for(let index=0;index<candidates.length;index++){
    const descriptor=Object.getOwnPropertyDescriptor(candidates,String(index));
    if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)throw new Error('词音候选不得含空位或访问器。');
    if(ownPhoneticValue(descriptor.value,'namePhoneticReviews').present)return true;
  }
  const snapshot=ownPhoneticValue(session,'sourceSnapshot').value;
  if(snapshot===undefined)return false;
  canonicalPlainJson(snapshot);
  const sources=ownPhoneticValue(snapshot,'sources').value;
  if(!Array.isArray(sources))throw new Error('词音生成时来源列表无效。');
  return sources.some(source=>(NAME_PHONETIC_SOURCE_IDS as readonly unknown[]).includes(ownPhoneticValue(source,'id').value));
}
