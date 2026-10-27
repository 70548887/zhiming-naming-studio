import React,{useId} from 'react';
import type {Candidate2NamingEligibility} from '../shared/candidate2-naming-eligibility-v1';
import type {NamingPreferences} from '../shared/types';
import './candidate2-optin.css';

export type Candidate2OptInChoice='legacy'|'candidate2';
export interface Candidate2OptInIntent {choice:Candidate2OptInChoice;contextKey:string;source:'explicit-user-opt-in';}
export interface Candidate2OptInPanelProps {preferences:NamingPreferences;contextKey:string;choice?:Candidate2OptInChoice;eligibility?:Candidate2NamingEligibility;disabled?:boolean;onChange?:(intent:Candidate2OptInIntent)=>void;id?:string;}
export interface Candidate2OptInPanelViewProps {choice:Candidate2OptInChoice;contextKey:string;eligibility?:Candidate2NamingEligibility;manualConflict:boolean;disabled?:boolean;onChange?:(intent:Candidate2OptInIntent)=>void;id:string;}

function manualConflict(preferences:NamingPreferences):boolean{return preferences.preferredElements.length>0||Object.hasOwn(preferences,'namingElementMethod');}
function eligibilityMessage(eligibility:Candidate2NamingEligibility|undefined):{kind:'none'|'status'|'warning';text:string}{
 if(!eligibility)return{kind:'none',text:'尚未检查项目固定取法资格。明确选择后才会读取当前资料与固定资源结果。'};
 if(eligibility.status==='eligible')return{kind:'status',text:'当前资料、偏好与固定资源已通过资格检查；这仍是只读结果，不会开启生成或保存。'};
 if(eligibility.status==='disabled')return{kind:'warning',text:'当前未明确选择项目固定取法。'};
 if(eligibility.status==='unavailable')return{kind:'warning',text:'项目固定资源当前不可用；未将不可用状态当作通过。'};
 return{kind:'warning',text:eligibility.reasons.map(reason=>reason.message).join('；')||'当前资料尚未满足项目固定取法资格。'};
}
export function Candidate2OptInPanelView({choice,contextKey,eligibility,manualConflict:conflict,disabled=false,onChange,id}:Candidate2OptInPanelViewProps){
 const message=choice==='candidate2'?eligibilityMessage(eligibility):{kind:'none' as const,text:'当前保留原有取法；项目固定取法资格结果不会带入本次默认路径。'},helpId=`${id}-help`,statusId=`${id}-status`,conflictId=`${id}-conflict`;
 const emit=(next:Candidate2OptInChoice)=>{if(disabled||next===choice)return;onChange?.({choice:next,contextKey,source:'explicit-user-opt-in'});};
 return <section className="candidate2-optin" aria-labelledby={`${id}-title`}>
  <header><div><p className="candidate2-optin-kicker">命名取法</p><h3 id={`${id}-title`}>是否读取项目固定取法资格</h3></div><span className="candidate2-optin-badge">显式选择</span></header>
  <p id={helpId} className="candidate2-optin-help">默认保留原有取法。只有你明确选择项目固定取法，才会检查当前资料；本组件不自动检查、不生成、不保存。</p>
  <fieldset disabled={disabled} aria-describedby={`${helpId} ${statusId}${conflict?' '+conflictId:''}`}>
   <legend>本次命名取法</legend>
   <label className={choice==='legacy'?'is-selected':''}><input type="radio" name={`${id}-choice`} value="legacy" checked={choice==='legacy'} onChange={()=>emit('legacy')}/><span><strong>原有取法 <small>默认</small></strong><span>保留原有分析、人工五行与已有方案路径。</span></span></label>
   <label className={choice==='candidate2'?'is-selected':''}><input type="radio" name={`${id}-choice`} value="candidate2" checked={choice==='candidate2'} onChange={()=>emit('candidate2')}/><span><strong>项目固定取法</strong><span>需要独立资格检查；不代表完整传统用神，也不会覆盖原分析。</span></span></label>
  </fieldset>
  {conflict&&<p id={conflictId} className="candidate2-optin-warning" role="alert">当前偏好包含人工五行或旧项目取法。请先由工作台明确处理冲突；组件不会自动清空或改写。</p>}
  <p id={statusId} className={message.kind==='warning'?'candidate2-optin-warning':message.kind==='status'?'candidate2-optin-status':'candidate2-optin-note'} role={message.kind==='none'?'status':message.kind}>{message.text}</p>
  <p className="candidate2-optin-boundary">本次选择只产生界面意图：{choice==='candidate2'?'已明确选择':'继续使用默认原有取法'}。本组件不提供生成、保存或传统吉凶结论。</p>
 </section>;
}
export function Candidate2OptInPanel({preferences,contextKey,choice='legacy',eligibility,disabled=false,onChange,id}:Candidate2OptInPanelProps){
 const generated=useId();
 return <Candidate2OptInPanelView id={id??`candidate2-optin-${generated}`} choice={choice} contextKey={contextKey} eligibility={eligibility} manualConflict={manualConflict(preferences)} disabled={disabled} onChange={onChange}/>;
}
