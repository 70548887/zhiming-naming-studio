import React,{useId,useRef} from 'react';
import type {ManualCharacterMeaningPanelProps,ManualCharacterMeaningDirectoryView,ManualCharacterMeaningExplanationView} from './manual-character-meaning-panel-ui';
import './manual-character-meaning-panel.css';

export type {ManualCharacterMeaningPanelProps} from './manual-character-meaning-panel-ui';
const text=(value:unknown):value is string=>typeof value==='string';
const lines=(value:unknown):value is readonly string[]=>Array.isArray(value)&&value.every(text);
export function manualCharacterMeaningInputError(value:string):string|null {
 if(!value)return '请输入一个汉字后，再明确查询。';
 return /^\p{Unified_Ideograph}$/u.test(value)?null:'一次只查询一个汉字，请移除空白、多个字或其他字符。';
}
const current=(props:ManualCharacterMeaningPanelProps)=>!!props.ownerKey&&props.state.ownerKey===props.ownerKey;
const unavailable=(props:ManualCharacterMeaningPanelProps)=>current(props)&&props.state.phase==='unavailable';
const blocked=(props:ManualCharacterMeaningPanelProps)=>!!props.disabled||!!props.blockedReason||props.state.requestPending||unavailable(props);
/** These checks prevent mismatched controlled projections/events. They do not
 * authenticate a directory, issue a key or replace the same-factory selection. */
export function currentManualCharacterMeaningDirectory(props:ManualCharacterMeaningPanelProps):ManualCharacterMeaningDirectoryView|null {
 if(!current(props)||manualCharacterMeaningInputError(props.value))return null;
 const directory=props.state.directory;
 if(!directory||directory.char!==props.value||!Array.isArray(directory.items))return null;
 if(directory.status==='not-covered')return directory.items.length===0?directory:null;
 if(directory.status!=='available'||!directory.items.length)return null;
 const seen=new Set<string>();
 for(const item of directory.items){
  if(!item||item.char!==props.value||!text(item.selectionKey)||!item.selectionKey||item.selectionKey.length>128||seen.has(item.selectionKey)||!text(item.pinyin)||!item.pinyin||!Number.isInteger(item.tone)||item.tone<1||item.tone>5||!text(item.originalMeaning)||!item.originalMeaning||!item.sourceCitation||!['dictionaryName','word','pinyin','license'].every(key=>text(item.sourceCitation[key as keyof typeof item.sourceCitation])&&!!item.sourceCitation[key as keyof typeof item.sourceCitation])||typeof item.changeMeaning!=='boolean'||!text(item.manualReason)||!lines(item.limits))return null;
  seen.add(item.selectionKey);
 }
 return directory;
}
export function currentManualCharacterMeaningExplanation(props:ManualCharacterMeaningPanelProps):ManualCharacterMeaningExplanationView|null {
 const directory=currentManualCharacterMeaningDirectory(props),explanation=props.state.explanation;
 if(!directory||props.state.phase!=='selected'||!explanation||explanation.char!==props.value||!directory.items.some(item=>item.selectionKey===explanation.selectionKey)||!text(explanation.meaning)||!explanation.meaning||!text(explanation.manualReason)||!lines(explanation.limits))return null;
 return explanation;
}
export function dispatchManualCharacterMeaningQuery(props:ManualCharacterMeaningPanelProps):boolean {
 if(blocked(props)||manualCharacterMeaningInputError(props.value))return false;
 props.onQuery(props.value);return true;
}
export function dispatchManualCharacterMeaningSelection(props:ManualCharacterMeaningPanelProps,selectionKey:string):boolean {
 if(blocked(props)||!currentManualCharacterMeaningDirectory(props)?.items.some(item=>item.selectionKey===selectionKey))return false;
 props.onSelect(selectionKey);return true;
}

/** Fully controlled display and explicit intents only: no effects, request,
 * local result fabrication, score, generation or persistence API is imported. */
export function ManualCharacterMeaningPanel(props:ManualCharacterMeaningPanelProps){
 const generated=useId(),id=`manual-character-meaning-${generated}`,latest=useRef(props);latest.current=props;
 const inputError=manualCharacterMeaningInputError(props.value),directory=currentManualCharacterMeaningDirectory(props),explanation=currentManualCharacterMeaningExplanation(props),isCurrent=current(props);
 const canQuery=!blocked(props)&&!inputError,canSelect=!blocked(props);
 const stale=!!props.state.directory&&!directory;
 const status=props.state.requestPending?(isCurrent&&props.state.phase==='selecting'?'正在重新核对所选义项，请等待返回说明。':'正在等待手动释义操作返回。'):!isCurrent||stale?'当前输入或资料已变化，请重新明确查询；旧结果未显示。':props.state.phase==='unavailable'?'手动释义查询尚未接入，请按下方原因处理。':directory?.status==='not-covered'?'这个字暂没有本目录的已审释义；不会补用其他词义。':explanation?'已返回所选义项的人工参考说明。':directory?'请核对读音、原义与出处，再明确选择一个义项。':'尚未查询。输入汉字后点击“查已审释义”。';
 return <section className="manual-character-meaning-panel" data-manual-character-meaning-panel data-phase={isCurrent?props.state.phase:'stale'} aria-labelledby={`${id}-heading`} aria-busy={props.state.requestPending}>
  <header className="mcmm-heading"><div><p className="mcmm-eyebrow">单字释义 · 显式人工查询</p><h3 id={`${id}-heading`}>手动查义与选义</h3></div><span className="mcmm-badge">人工参考</span></header>
  <p className="mcmm-scope" id={`${id}-scope`}>人工参考，未纳入自动推荐。查义或选择不表示整名已获采用，不改评分、排序、出生分析，也不会自动生成或保存方案。</p>
  <div className="mcmm-query"><label htmlFor={`${id}-input`}>查询单字</label><div className="mcmm-query-row"><input id={`${id}-input`} data-manual-meaning-input value={props.value} disabled={props.disabled} aria-describedby={`${id}-scope ${id}-input-hint`} aria-invalid={!!props.value&&!!inputError} placeholder="输入一个汉字，如：革" autoComplete="off" onChange={event=>{const active=latest.current;if(!active.disabled)active.onInputChange(event.currentTarget.value);}}/><button type="button" data-manual-meaning-action="query" disabled={!canQuery} onClick={()=>dispatchManualCharacterMeaningQuery(latest.current)}>查已审释义</button></div><small id={`${id}-input-hint`}>{inputError||'仅点击查询后读取；更换输入不会自动查义。'}</small></div>
  <div className="mcmm-status" role="status" aria-live="polite" aria-atomic="true"><p>{status}</p>{isCurrent&&props.state.notice&&<p>{props.state.notice}</p>}</div>
  {props.blockedReason&&<p className="mcmm-warning">{props.blockedReason}</p>}
  {isCurrent&&props.state.error&&<p className="mcmm-error" role="alert">{props.state.error}</p>}
  {props.state.requestPending&&<div className="mcmm-cancel"><button type="button" data-manual-meaning-action="cancel" onClick={()=>{const active=latest.current;if(active.state.requestPending)active.onCancel();}}>停止等待</button><p>停止等待不撤销已发出的请求。当前字、资料或选择变化后，父级会丢弃旧回复；实际请求结束前仍保留等待状态。</p></div>}
  {directory?.status==='available'&&<div className="mcmm-options" aria-label="已审释义选项">{directory.items.map((item,index)=>{
   const selected=explanation?.selectionKey===item.selectionKey;
   return <article className="mcmm-option" data-manual-meaning-option key={item.selectionKey}><header><h4><span className="mcmm-character">{item.char}</span><span>{item.pinyin} · {item.tone} 声</span></h4><span className="mcmm-option-label">义项 {index+1}</span></header>
    <dl><div><dt>字典原义</dt><dd className="mcmm-original">{item.originalMeaning}</dd></div><div><dt>出处</dt><dd>{item.sourceCitation.dictionaryName} · {item.sourceCitation.word} · {item.sourceCitation.pinyin}<br/>{item.sourceCitation.license}</dd></div><div><dt>换义提示</dt><dd>{item.changeMeaning?'本项采用的原义与此前不同，请重新核对语境；不沿用先前解释。':'按本项所列读音和原义核对，不据此推定其他义项。'}</dd></div></dl>
    <p className="mcmm-manual-reason">{item.manualReason}</p>{item.limits.length>0&&<ul className="mcmm-limits">{item.limits.map((line,position)=><li key={position}>{line}</li>)}</ul>}
    <button type="button" data-manual-meaning-action="select" disabled={!canSelect||selected} aria-label={`选择${item.char}的第${index+1}个义项，${item.pinyin}`} onClick={()=>dispatchManualCharacterMeaningSelection(latest.current,item.selectionKey)}>{selected?'此义项已返回说明':'选择此义项'}</button>
   </article>;
  })}</div>}
  {explanation&&<section className="mcmm-explanation" data-manual-meaning-explanation aria-labelledby={`${id}-explanation`}><h4 id={`${id}-explanation`}>所选义项 · 已返回说明</h4><p>{explanation.meaning}</p><p>{explanation.manualReason}</p>{explanation.limits.length>0&&<ul>{explanation.limits.map((line,index)=><li key={index}>{line}</li>)}</ul>}<p className="mcmm-warning">仅供这次人工选义参考；未纳入自动推荐，不表示整名释义、来源准入或保存成功。</p></section>}
 </section>;
}
