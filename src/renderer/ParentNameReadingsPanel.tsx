import React,{useEffect,useId,useLayoutEffect,useMemo,useRef,useSyncExternalStore} from 'react';
import type {CmnReadingQuery} from '../shared/cmn-reading';
import {createFamilyReadingController,canConfirmFamilyReading,type FamilyReadingState,type ParentReadingIntent,type ParentRole} from './family-reading-state';
import './parent-name-readings.css';

/** Display projection only. The actual saved/shared schema is owned by the service. */
export interface ParentReadingSummary {
 role:ParentRole;fullName:string;surnameLength:number;givenName:string;
 readings:readonly {position:number;char:string;pinyin:string;origin:'dictionary'|'family-confirmed'}[];
 persistence:'draft'|'saved';
}
export interface ParentNameReadingsPanelProps {
 fatherName:string;motherName:string;
 confirmations?:readonly ParentReadingSummary[];
 getCmnReadingOptions:(char:string)=>Promise<CmnReadingQuery>;
 onConfirm:(intent:ParentReadingIntent)=>void|Promise<void>;
 onInvalidate:(role:ParentRole)=>void;
 mode:'none'|'strict'|'ignore-tone';onModeChange:(mode:'none'|'strict'|'ignore-tone')=>void;
 disabled?:boolean;disabledReason?:string;
}
const roleName={father:'爸爸',mother:'妈妈'};
export function boundParentSummary(value:ParentReadingSummary|undefined,role:ParentRole,fullName:string):ParentReadingSummary|undefined {
 if(!value||value.role!==role||value.fullName!==fullName)return undefined;
 const chars=[...fullName];if(!Number.isInteger(value.surnameLength)||value.surnameLength<1||value.surnameLength>4||value.surnameLength>=chars.length)return undefined;
 const given=chars.slice(value.surnameLength).join('');if([...given].length>4)return undefined;
 if(value.givenName!==given||value.readings.length!==[...given].length||value.readings.some((row,index)=>row.position!==index||row.char!==[...given][index]||!row.pinyin))return undefined;
 return value;
}
function ConfirmedSummary({summary}:{summary:ParentReadingSummary}) {
 return <div className="pnr-confirmed"><strong>已确认给名“{summary.givenName}” · {summary.readings.map(row=>row.pinyin).join(' ')}</strong><p>{summary.persistence==='draft'?'当前资料草稿已确认；保存档案或生成方案后留存。':'已随当前档案留存；后续改名或改读音需重新确认。'}</p><p className="pnr-small">{summary.readings.some(row=>row.origin==='family-confirmed')?'含家庭确认录入，未称词典认证。':'采用明确选中的固定词典读音，仍属本家庭确认。'}</p></div>;
}
export interface ParentReadingEditorViewProps {
 role:ParentRole;state:FamilyReadingState;summary?:ParentReadingSummary;disabled?:boolean;
 onBoundary:(n:number|null)=>void;onLoad:()=>void;onOrigin:(position:number,origin:'dictionary'|'family-confirmed')=>void;
 onOption:(position:number,id:string)=>void;onManual:(position:number,text:string)=>void;
 onAcknowledge:(position:number,checked:boolean)=>void;onConfirm:()=>void;feedbackId?:string;
}
export function ParentReadingEditorView({role,state,summary,disabled=false,onBoundary,onLoad,onOrigin,onOption,onManual,onAcknowledge,onConfirm,feedbackId}:ParentReadingEditorViewProps) {
 const id=useId(),label=roleName[role],busy=state.phase==='loading'||state.phase==='confirming',chars=[...state.fullName],boundaries=Array.from({length:Math.min(4,Math.max(0,chars.length-1))},(_,index)=>index+1).filter(n=>chars.length-n<=4),canSplit=chars.length>=2&&chars.length<=40&&boundaries.length>0&&chars.every(char=>/^\p{Script=Han}$/u.test(char));
 const bound=boundParentSummary(summary,role,state.fullName),feedback=feedbackId??`${id}-feedback`;
 return <section className="pnr-person" aria-labelledby={`${id}-heading`} aria-busy={busy}>
  <header><h4 id={`${id}-heading`}>{label} · {state.fullName||'尚未填写姓名'}</h4><span className={`pnr-status ${bound||state.confirmed?'pnr-status-confirmed':''}`}>{bound||state.confirmed?'本次给名已确认':'未确认 · 尚未比较'}</span></header>
  {bound&&<ConfirmedSummary summary={bound}/>}
  {!state.fullName?<p className="pnr-help">先在上方填写{label}的完整姓名；可保留为空，继续其他起名操作。</p>:!canSplit?<p className="pnr-help">当前姓名暂不支持逐字确认，请核对原姓名。原资料仍可保存，本次读音未比较。</p>:<>
   <fieldset disabled={disabled||busy}><legend>1. 明确姓与给名的分界</legend><label className="pnr-boundary" htmlFor={`${id}-boundary`}>姓氏包含几个字？<select id={`${id}-boundary`} value={state.surnameLength??''} onChange={event=>onBoundary(event.target.value===''?null:Number(event.target.value))}><option value="">请选择分界，不自动推定</option>{boundaries.map(n=><option key={n} value={n}>{chars.slice(0,n).join('')} / {chars.slice(n).join('')}（姓 {n} 字）</option>)}</select></label>
    {state.surnameLength!==null&&<p className="pnr-split"><span>姓：<strong>{chars.slice(0,state.surnameLength).join('')}</strong></span><span>给名：<strong>{state.givenName}</strong></span></p>}
   </fieldset>
   {state.surnameLength!==null&&<><div className="pnr-step-heading"><h5>2. 逐字选择实际采用的读音</h5><button type="button" className="pnr-text-button" disabled={disabled||busy} onClick={onLoad}>{state.phase==='loading'?'正在读取…':state.rows.some(row=>row.query)?'重新读取词典选项':'读取本地词典选项'}</button></div>
    <p className="pnr-help">未预选字库默认。词典未覆盖的字，可由家庭明确提供读音。</p>
    {state.rows.map(row=><fieldset className="pnr-character" key={`${state.fullName}-${state.surnameLength}-${row.position}`} disabled={disabled||state.phase==='confirming'}><legend>给名第 {row.position+1} 字 · {row.char}</legend>
     <div className="pnr-origin"><label><input type="radio" name={`${id}-origin-${row.position}`} checked={row.origin==='dictionary'} onChange={()=>onOrigin(row.position,'dictionary')}/>从词典选项选择</label><label><input type="radio" name={`${id}-origin-${row.position}`} checked={row.origin==='family-confirmed'} onChange={()=>onOrigin(row.position,'family-confirmed')}/>家庭确认录入</label></div>
     {row.origin==='dictionary'&&<div className="pnr-options">
      {state.phase==='loading'&&<p role="status">正在读取“{row.char}”的本地资料……</p>}
      {row.error&&<div className="pnr-row-error" role="alert"><p>{row.error}</p><button type="button" className="pnr-text-button" disabled={disabled||busy} onClick={onLoad}>重新读取词典</button></div>}
      {!row.query&&!row.error&&state.phase!=='loading'&&<p>先读取本地词典，或选择家庭确认录入。</p>}
      {row.query&&row.query.options.length===0&&<p>本字没有可采用的本地选项，尚未确认。可以家庭确认录入，不据此猜读音。</p>}
      {row.query?.options.map(option=><label className="pnr-reading-option" key={option.optionId}><input type="radio" name={`${id}-reading-${row.position}`} value={option.optionId} checked={row.optionId===option.optionId} disabled={disabled||busy} onChange={()=>onOption(row.position,option.optionId)}/><span><strong>{option.pinyin}</strong><small>第 {option.tone} 调{option.label?` · 原注${option.label}`:''}</small></span></label>)}
      {!!row.query?.options.length&&<p className="pnr-small">固定台湾教育部词典记录；不等同大陆普通话认证，也不自动说明姓名用法。</p>}
      {row.query&&<details className="pnr-source"><summary>查看“{row.char}”的词典来源与范围</summary><p>教育部《重编国语辞典修订本》固定资料。</p><p>{row.query.source.standard} · {row.query.source.license}</p><ul>{row.query.limitations.map((text,index)=><li key={index}>{text}</li>)}</ul><pre>{JSON.stringify({source:row.query.source,selectedOptionId:row.optionId||null},null,2)}</pre></details>}
     </div>}
     {row.origin==='family-confirmed'&&<div className="pnr-manual"><label htmlFor={`${id}-manual-${row.position}`}>家庭提供的数字调拼音<input id={`${id}-manual-${row.position}`} type="text" inputMode="text" autoComplete="off" spellCheck={false} maxLength={24} value={row.manualPinyin} placeholder="如 zhi1、yuan2；轻声用5" onChange={event=>onManual(row.position,event.target.value)} aria-describedby={`${id}-manual-hint-${row.position}`}/></label><p id={`${id}-manual-hint-${row.position}`} className="pnr-small">每字填写一个音节与1–5声调。来源记录为家庭确认，服务端仍会校验格式。</p><label className="pnr-ack"><input type="checkbox" checked={row.familyAcknowledged} onChange={event=>onAcknowledge(row.position,event.target.checked)}/>家人确认本字实际读作上述音节</label></div>}
    </fieldset>)}
    <div className="pnr-confirm-action"><button type="button" className="button secondary" disabled={disabled||busy||!canConfirmFamilyReading(state)} onClick={onConfirm}>{state.phase==='confirming'?'正在确认…':'确认本次给名读音'}</button><p>仅确认这份资料草稿；保存档案或生成方案后留存。</p></div>
   </>}
  </>}
  <div id={feedback} tabIndex={-1} role={state.error?'alert':'status'} aria-live={state.error?'assertive':'polite'} className="pnr-feedback">{state.error||state.notice}</div>
 </section>;
}
function ParentEditor({role,fullName,summary,disabled,onConfirm,onInvalidate,getOptions}:{role:ParentRole;fullName:string;summary?:ParentReadingSummary;disabled:boolean;onConfirm:ParentNameReadingsPanelProps['onConfirm'];onInvalidate:ParentNameReadingsPanelProps['onInvalidate'];getOptions:ParentNameReadingsPanelProps['getCmnReadingOptions']}) {
 const latest=useRef({disabled,onConfirm,onInvalidate,getOptions});latest.current={disabled,onConfirm,onInvalidate,getOptions};
 const controller=useMemo(()=>createFamilyReadingController({role,getOptions:char=>latest.current.getOptions(char),onConfirm:intent=>latest.current.onConfirm(intent),onInvalidate:who=>latest.current.onInvalidate(who),isDisabled:()=>latest.current.disabled}),[role]);
 const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot),feedbackId=`${useId()}-feedback`;
 useLayoutEffect(()=>{controller.activate();return()=>controller.dispose();},[controller]);
 useLayoutEffect(()=>controller.setName(fullName),[controller,fullName]);
 useEffect(()=>{if(state.focusSerial>0)document.getElementById(feedbackId)?.focus();},[state.focusSerial,feedbackId]);
 return <ParentReadingEditorView role={role} state={state} summary={summary} disabled={disabled} feedbackId={feedbackId} onBoundary={controller.setBoundary} onLoad={()=>void controller.load()} onOrigin={controller.chooseOrigin} onOption={controller.chooseOption} onManual={controller.setManual} onAcknowledge={controller.acknowledge} onConfirm={()=>void controller.confirm()}/>;
}
export function ParentNameReadingsPanel({fatherName,motherName,confirmations=[],getCmnReadingOptions,onConfirm,onInvalidate,mode,onModeChange,disabled=false,disabledReason}:ParentNameReadingsPanelProps) {
 const id=useId();
 const father=boundParentSummary(confirmations.find(value=>value.role==='father'),'father',fatherName),mother=boundParentSummary(confirmations.find(value=>value.role==='mother'),'mother',motherName);
 return <details className="parent-name-readings"><summary><span>家庭给名读音</span><small>{[father,mother].filter(Boolean).length}/2 人已确认 · {mode==='none'?'本次不比较':'确认后按完整给名比较'}</small></summary><div className="pnr-body">
  <p className="pnr-intro">父母姓名文本不能确定读音。请明确给名范围与实际读法，再核对候选是否与父母给名同音。</p>
  <label className="pnr-mode" htmlFor={`${id}-mode`}>本次完整给名比较<select id={`${id}-mode`} value={mode} disabled={disabled} onChange={event=>onModeChange(event.target.value as ParentNameReadingsPanelProps['mode'])}><option value="none">不比较（默认）</option><option value="strict">音节与声调均相同</option><option value="ignore-tone">音节相同，忽略声调</option></select></label>
  <p className="pnr-help">仅比较完整给名；字形避讳另行处理。未确认的家人显示“尚未比较”，未命中不表示名字安全或适宜。</p>
  {disabled&&<p className="pnr-notice">{disabledReason||'当前操作进行中，请稍后确认读音。'}</p>}
  <ParentEditor role="father" fullName={fatherName} summary={father} disabled={disabled} onConfirm={onConfirm} onInvalidate={onInvalidate} getOptions={getCmnReadingOptions}/>
  <ParentEditor role="mother" fullName={motherName} summary={mother} disabled={disabled} onConfirm={onConfirm} onInvalidate={onInvalidate} getOptions={getCmnReadingOptions}/>
 </div></details>;
}
