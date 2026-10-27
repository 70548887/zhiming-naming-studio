import type {NamingPreferences} from './types';
import type {PhoneticEnabledPreferences} from './name-phonetic-review-types';
import {NAME_PHONETIC_VERSIONS,readNamePhoneticPreferences} from './name-phonetic-preferences';

export type PhoneticUiMode='strict'|'ignore-tone';
export type YueUiVersion='none'|'yue-homophone-review/1.0.0'|'yue-homophone-review/1.1.0'|'yue-homophone-review/1.2.0';
export type PhoneticUiAction={type:'cmn-version';value:'none'|'cmn-homophone-review/1.0.0'}|{type:'cmn-mode';value:PhoneticUiMode}|{type:'yue-reading';value:boolean}|{type:'yue-version';value:YueUiVersion}|{type:'yue-mode';value:PhoneticUiMode};
export function selectedYuePhoneticVersion(p:PhoneticEnabledPreferences):YueUiVersion{
  if(p.namePhonetics?.yue)return p.namePhonetics.yue.version;
  return p.yueHomophones&&p.yueHomophones!=='none'?p.yueHomophoneRuleVersion??'yue-homophone-review/1.0.0':'none';
}
/** A complete draft replaces the old draft, allowing fields to be deleted instead of storing undefined. */
export function changeNamePhoneticPreferences(preferences:PhoneticEnabledPreferences,action:PhoneticUiAction):NamingPreferences{
  const selected=readNamePhoneticPreferences(preferences),next:PhoneticEnabledPreferences={...preferences},options={...selected};
  const clearOld=()=>{next.yueHomophones='none';delete next.yueHomophoneRuleVersion;};
  switch(action.type){
    case 'cmn-version':
      if(action.value==='none')delete options.cmn;
      else if(action.value===NAME_PHONETIC_VERSIONS.cmn)options.cmn={version:action.value,mode:selected?.cmn?.mode??'strict'};
      else throw new Error('普通话词表版本无效。');
      break;
    case 'cmn-mode':
      if(!['strict','ignore-tone'].includes(action.value)||!options.cmn)throw new Error('请先选择普通话词表版本。');
      options.cmn={...options.cmn,mode:action.value};break;
    case 'yue-reading':
      next.yueReading=action.value;if(!action.value){delete options.yue;clearOld();}break;
    case 'yue-version':{
      const mode=selected?.yue?.mode??(preferences.yueHomophones&&preferences.yueHomophones!=='none'?preferences.yueHomophones:'strict');
      delete options.yue;clearOld();
      if(action.value===NAME_PHONETIC_VERSIONS.yue){next.yueReading=true;options.yue={version:action.value,mode};}
      else if(['yue-homophone-review/1.0.0','yue-homophone-review/1.1.0'].includes(action.value)){next.yueReading=true;next.yueHomophones=mode;next.yueHomophoneRuleVersion=action.value as NonNullable<NamingPreferences['yueHomophoneRuleVersion']>;}
      else if(action.value!=='none')throw new Error('粤语词表版本无效。');
      break;
    }
    case 'yue-mode':
      if(!['strict','ignore-tone'].includes(action.value)||selectedYuePhoneticVersion(preferences)==='none')throw new Error('请先选择粤语词表版本。');
      if(options.yue)options.yue={...options.yue,mode:action.value};else next.yueHomophones=action.value;
      break;
  }
  if(Object.keys(options).length)next.namePhonetics=options;else delete next.namePhonetics;
  readNamePhoneticPreferences(next);
  return next;
}
