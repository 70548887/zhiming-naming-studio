import React,{useId} from 'react';
import type {NamingPreferences} from '../shared/types';
import type {PhoneticEnabledPreferences} from '../shared/name-phonetic-review-types';
import {changeNamePhoneticPreferences,selectedYuePhoneticVersion,type PhoneticUiAction,type PhoneticUiMode,type YueUiVersion} from '../shared/name-phonetic-ui-state';
import './name-phonetic.css';

export function NamePhoneticPreferencesField({preferences:p,disabled=false,onChange}:{preferences:PhoneticEnabledPreferences;disabled?:boolean;onChange:(next:NamingPreferences)=>void}){
  const id=useId(),yueVersion=selectedYuePhoneticVersion(p),change=(action:PhoneticUiAction)=>onChange(changeNamePhoneticPreferences(p,action));
  return <fieldset className="name-phonetic-preferences" disabled={disabled} aria-describedby={`${id}-scope`}><legend>音韵与词汇联想 · 可选</legend>
    <p id={`${id}-scope`} className="muted tiny">默认关闭。按所选版本的有限词表复核，结果单独保存；不淘汰候选或调整评分。更换版本或模式后需重新生成。</p>
    <label htmlFor={`${id}-cmn-version`}>普通话词表版本</label><select id={`${id}-cmn-version`} value={p.namePhonetics?.cmn?.version??'none'} onChange={event=>change({type:'cmn-version',value:event.target.value as 'none'|'cmn-homophone-review/1.0.0'})}>
      <option value="none">不启用（默认）</option><option value="cmn-homophone-review/1.0.0">普通话 1.0 · 67 词 / 82 条读音规则</option>
    </select>
    {p.namePhonetics?.cmn&&<><label htmlFor={`${id}-cmn-mode`}>普通话匹配模式</label><select id={`${id}-cmn-mode`} value={p.namePhonetics.cmn.mode} onChange={event=>change({type:'cmn-mode',value:event.target.value as PhoneticUiMode})}><option value="strict">严格比较音节与声调</option><option value="ignore-tone">同时复核仅声调不同的匹配</option></select>
      <p className="muted tiny">只用方案保存的默认拼音。姓氏请逐音节标调，复姓用空格分隔；未标调不当作轻声，缺读音时保留未评估。原有普通话检查继续保留。</p></>}
    <label className="checkbox-line" htmlFor={`${id}-yue-reading`}><input id={`${id}-yue-reading`} type="checkbox" checked={p.yueReading===true} onChange={event=>change({type:'yue-reading',value:event.target.checked})}/>粤语读音参考 · 粤拼</label>
    <p className="muted tiny">生成后确认家庭采用的姓氏与名字读音；词典候选不会自动确认，不模拟连读音变。</p>
    {p.yueReading&&<><label htmlFor={`${id}-yue-version`}>粤语词表版本</label><select id={`${id}-yue-version`} value={yueVersion} onChange={event=>change({type:'yue-version',value:event.target.value as YueUiVersion})}>
      <option value="none">只参考读音，不启用词汇复核</option><option value="yue-homophone-review/1.2.0">粤语 1.2 · 71 词 / 75 条读音规则</option><option value="yue-homophone-review/1.1.0">旧版粤语 1.1 · 28 词 / 29 条读音规则</option><option value="yue-homophone-review/1.0.0">旧版粤语 1.0 · 12 词</option>
    </select>{yueVersion!=='none'&&<><label htmlFor={`${id}-yue-mode`}>粤语匹配模式</label><select id={`${id}-yue-mode`} value={p.namePhonetics?.yue?.mode??p.yueHomophones??'strict'} onChange={event=>change({type:'yue-mode',value:event.target.value as PhoneticUiMode})}><option value="strict">确认后严格比较音节与声调</option><option value="ignore-tone">确认后同时复核仅声调不同的匹配</option></select></>}
      <p className="muted tiny">粤语 1.2 与旧版择一保存；普通话可同时启用。旧方案沿用原版，不随此选择升级；关闭粤语读音参考会一并关闭粤语词汇复核。</p></>}
  </fieldset>;
}
