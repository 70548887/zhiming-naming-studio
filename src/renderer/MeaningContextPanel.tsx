import React,{useEffect,useId,useMemo,useRef,useSyncExternalStore} from 'react';
import type {MeaningContextAPI,MeaningContextOption,SavedMeaningContextReview} from '../shared/meaning-context-review';
import {createMeaningContextController,meaningContextCanWrite,meaningContextDirty,meaningOptionKey,type MeaningContextUiState,type MeaningContextController} from './meaning-context-state';
import {SavedMeaningContextView,type MeaningContextViewCandidate} from './SavedMeaningContextView';
import './meaning-context.css';

export interface MeaningContextEditorProps{
 idPrefix:string;candidate:MeaningContextViewCandidate;sessionId:string;state:MeaningContextUiState;disabled?:boolean;disabledReason?:string;
 onReading:(position:number,checked:boolean)=>void;onChoice:(position:number,key:string)=>void;
 onConfirm:()=>void;onChoose:(position:number)=>void;onClear:()=>void;onReload:()=>void;initialReview?:SavedMeaningContextReview;
}
const optionsNotice={available:'有可选原词义；未保存的选择尚未采用。','legacy-unavailable':'此旧版记录不使用本批参考，原解释保持原样。','unsupported-pack':'此方案的资料包不适用本批参考，未套用新表。','not-covered':'此完整给名没有本批可选条件证据。','data-unavailable':'本批资料暂不可读取，原记录未回填。'} as const;
function OptionReference({option}:{option:MeaningContextOption}){
 const grammar=typeof option.grammar.text==='string'?option.grammar.text:'';
 return <div className="meaning-context-option-reference"><p className="meaning-context-unadopted">参考原文 · 尚未采用</p><blockquote>{option.dictionaryOriginal}</blockquote>
  <details><summary tabIndex={0}>查看场景限定、项目说明与来源</summary><h6>项目语法与取义说明</h6><p>{grammar}</p><p>{option.reason}</p><ul>{option.exclusions.map((line,index)=><li key={index}>{line}</li>)}</ul><p>原词条：{option.reference.word} · {option.reference.pinyin}</p><p>{option.reference.sourceId} · {option.reference.originalFile}<br/>原索引 {option.reference.rawEntryIndex}/{option.reference.rawHeteronymIndex}/{option.reference.rawDefinitionIndex} · {option.reference.license}</p></details>
 </div>;
}
/** Controlled React view. Its actual input/button handlers are directly testable without a native window. */
export function MeaningContextEditorView({idPrefix:id,candidate,sessionId,state,disabled=false,disabledReason,onReading,onChoice,onConfirm,onChoose,onClear,onReload,initialReview}:MeaningContextEditorProps){
 const options=state.options,busy=state.phase==='loading'||state.phase==='saving',writable=!disabled&&meaningContextCanWrite(state),record=options?options.savedReview:initialReview;
 const savedPositions=new Set(options?.currentReadings.filter(row=>row.confirmed).map(row=>row.position)),pendingConfirmation=state.draftPositions.some(position=>!savedPositions.has(position));
 const positions=[...new Set(options?.options.map(row=>row.position)??[])].sort((a,b)=>a-b),allConfirmed=!!options&&options.currentReadings.length>0&&options.currentReadings.every(row=>row.confirmed);
 return <section className="meaning-context-panel detail-section" aria-labelledby={`${id}-heading`} aria-busy={busy}>
  <h3 id={`${id}-heading`}>完整词义参考 · 选择与保存</h3><p className="meaning-context-scope">读音确认只表示本方案采用此读法，不表示唯一读法或词义已经成立。参考原文与项目说明分别列示。</p>
  {state.phase==='idle'||state.phase==='loading'?<p role="status">正在读取本方案的词义参考……</p>:null}
  {options&&<><p className="meaning-context-coverage">{optionsNotice[options.status]}</p>{options.notice&&<p>{options.notice}</p>}</>}
  {state.error&&<div id={`${id}-error`} tabIndex={-1} role="alert" className="meaning-context-error"><p>{state.error.message}</p><p>勾选与词义草稿仍保留；未据此认定已采用。</p></div>}
  {state.needsRefresh&&<p className="meaning-context-warning">记录版本已变化或保存结果待核对。请重新读取，核对保留的选择后再保存。</p>}
  <div id={`${id}-status`} tabIndex={-1} role="status" className="meaning-context-status">{state.notice||(!busy&&meaningContextDirty(state)?'本功能有未保存的选择。':'')}</div>
  {disabled&&<p className="meaning-context-warning">{disabledReason||'请先完成当前审阅操作或打开原方案快照，再保存此参考。'}</p>}
  {options?.status==='available'&&<>
   <fieldset className="meaning-context-readings" disabled={!writable}><legend>1. 确认当前保存的给名读音</legend>
    {options.currentReadings.map(row=><label key={row.position} htmlFor={`${id}-reading-${row.position}`}><input id={`${id}-reading-${row.position}`} type="checkbox" checked={state.draftPositions.includes(row.position)} disabled={row.confirmed||!writable} onChange={event=>onReading(row.position,event.target.checked)}/><span>第 {row.position+1} 字“{row.char}” · {row.pinyin} · {row.tone} 声<small>{row.confirmed?'本方案已确认；撤销须清除此功能的全部选择':'勾选后仍需保存确认'}</small></span></label>)}
    <button type="button" className="button secondary" disabled={!writable||!pendingConfirmation} onClick={onConfirm}>保存勾选的读音确认</button>
   </fieldset>
   <div className="meaning-context-choices"><h4>2. 明确选择完整词义与场景</h4><p>勾选词义只是草稿；只有保存记录中的已采用结果才会列入独立参考。</p>
    {positions.map(position=>{const choices=options.options.filter(row=>row.position===position),key=state.draftChoices[position],selected=choices.find(option=>meaningOptionKey(option)===key),saved=options.savedReview?.selections.find(row=>row.position===position),alreadySaved=!!saved&&meaningOptionKey(saved)===key;
     return <fieldset key={position} disabled={!writable} className="meaning-context-position"><legend>名字第 {position+1} 字“{options.currentReadings[position]?.char}” · 完整给名“{candidate.givenName}”</legend>
      {choices.map((option,index)=><article className="meaning-context-option" key={meaningOptionKey(option)}><label htmlFor={`${id}-choice-${position}-${index}`}><input id={`${id}-choice-${position}-${index}`} type="radio" name={`${id}-meaning-${position}`} value={meaningOptionKey(option)} checked={key===meaningOptionKey(option)} onChange={()=>onChoice(position,meaningOptionKey(option))}/><strong>{option.contextLabel}</strong></label><OptionReference option={option}/></article>)}
      {key&&!selected&&<p className="meaning-context-warning">之前的选择已不在当前可选项中，草稿保留供核对；请重新选择。</p>}
      {!allConfirmed&&<p>完整给名的读音尚未全部确认，暂不能保存采用词义。</p>}
      <button type="button" className="button secondary" disabled={!writable||!allConfirmed||!selected||alreadySaved} onClick={()=>onChoose(position)}>保存第 {position+1} 字的整词参考</button>
     </fieldset>;
    })}
   </div>
   {state.phase==='ready'&&!state.needsRefresh&&!meaningContextCanWrite(state)&&<p className="meaning-context-warning">保存版本信息不完整，请重新读取后再保存。</p>}
  </>}
  <div className="meaning-context-actions"><button type="button" className="button secondary" disabled={busy||disabled} onClick={onReload}>{state.options?'重新读取最新记录（保留选择）':'重新读取参考'}</button>{record&&<button type="button" className="button secondary" disabled={!writable} onClick={onClear}>清除本功能参考与全部读音确认</button>}</div>
  <SavedMeaningContextView candidate={candidate} sessionId={sessionId} review={record}/>
 </section>;
}

export interface MeaningContextPanelProps{
 sessionId:string;candidate:MeaningContextViewCandidate&{meaningContextReview?:SavedMeaningContextReview};reviewRevision?:number;reviewToken?:string;
 api:MeaningContextAPI;disabled?:boolean;disabledReason?:string;onDirtyChange?:(dirty:boolean)=>void;
}
export function focusMeaningContextFeedback(id:string,state:Pick<MeaningContextUiState,'focus'|'focusSerial'>,page:Pick<Document,'getElementById'>=document){if(state.focusSerial>0&&state.focus)page.getElementById(`${id}-${state.focus}`)?.focus();}
export function MeaningContextPanel({sessionId,candidate,reviewRevision,reviewToken,api,disabled=false,disabledReason,onDirtyChange}:MeaningContextPanelProps){
 const id=useId(),latest=useRef({api,disabled,onDirtyChange});latest.current={api,disabled,onDirtyChange};
 const controller=useMemo(()=>createMeaningContextController({sessionId,candidateId:candidate.id,givenName:candidate.givenName,fullName:candidate.fullName,getApi:()=>latest.current.api,isDisabled:()=>latest.current.disabled}),[sessionId,candidate.id,candidate.givenName,candidate.fullName]);
 const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot),dirty=meaningContextDirty(state);
 useEffect(()=>{controller.activate();return()=>{controller.dispose();latest.current.onDirtyChange?.(false);};},[controller]);
 useEffect(()=>{if(!disabled&&controller.getSnapshot().phase==='idle')void controller.load();},[controller,disabled]);
 useEffect(()=>controller.markExternalRevision(reviewRevision,reviewToken),[controller,reviewRevision,reviewToken,state.phase,state.options?.reviewRevision,state.options?.reviewToken]);
 useEffect(()=>{onDirtyChange?.(dirty);},[dirty,onDirtyChange]);
 useEffect(()=>focusMeaningContextFeedback(id,state),[id,state.focusSerial,state.focus]);
 return <MeaningContextEditorView idPrefix={id} sessionId={sessionId} candidate={candidate} state={state} disabled={disabled} disabledReason={disabledReason} initialReview={candidate.meaningContextReview}
  onReading={controller.setReading} onChoice={controller.setChoice} onConfirm={()=>void controller.confirmReadings()} onChoose={position=>void controller.chooseContext(position)} onClear={()=>void controller.clear()} onReload={()=>void controller.load({preserveDraft:true,userInitiated:true})}/>;
}
