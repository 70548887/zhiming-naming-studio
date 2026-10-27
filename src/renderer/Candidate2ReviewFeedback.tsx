import React,{useId,useRef} from 'react';
import type {Candidate2ReviewFeedbackProps,Candidate2ReviewFeedbackState} from './candidate2-review-ui';
import './candidate2-review-feedback.css';

export type {Candidate2ReviewFeedbackProps} from './candidate2-review-ui';
const needsReadback=(state:Candidate2ReviewFeedbackState)=>state.requiresReadback||state.phase==='reconcile';
const actionBlocked=(props:Candidate2ReviewFeedbackProps)=>!!props.disabled||props.state.requestPending||props.state.requiresRestart;
const hasDeliveryRetry=(state:Candidate2ReviewFeedbackState)=>state.phase==='delivering'&&state.canRetryDelivery&&!!state.error?.trim();
const canRetryDelivery=(props:Candidate2ReviewFeedbackProps)=>!actionBlocked(props)&&!needsReadback(props.state)&&hasDeliveryRetry(props.state);
const canReadSaved=(props:Candidate2ReviewFeedbackProps)=>!actionBlocked(props)&&needsReadback(props.state)&&props.state.canReadSaved;
const canLoadLatest=(props:Candidate2ReviewFeedbackProps)=>!actionBlocked(props)&&needsReadback(props.state)&&props.state.canLoadLatest;
const canCompareDraft=(props:Candidate2ReviewFeedbackProps)=>!actionBlocked(props)&&needsReadback(props.state)&&props.state.canCompareDraft;
function statusText(state:Candidate2ReviewFeedbackState):string {
 if(state.requiresRestart)return '本次写入返回了收尾提醒，结果需要核对。请先保留人工草稿，重启应用后再重新读取已保存方案。';
 if(state.requestPending)return state.phase==='delivering'?'审阅结果正在交接，请等待工作台接收。':needsReadback(state)?'正在等待已保存方案的重新读取结果。':'正在等待本次审阅操作返回。';
 if(needsReadback(state))return '保存结果尚未完成核对。人工草稿仍需保留，请先重新读取已保存方案，再明确选择如何处理。';
 switch(state.phase){
  case 'saving':return '正在处理本次审阅，请等待工作台更新状态。';
  case 'delivering':return hasDeliveryRetry(state)?'已返回的审阅结果尚未交接完成，可重新接收同一结果。':'审阅结果正在交接到工作台。';
  case 'ready':return state.draftDirty?'本次返回结果已由工作台接收；仍有人工草稿需要另行核对。':'本次返回结果已由工作台接收。';
  case 'blocked':return '当前条件暂不支持继续审阅操作，请先处理下方原因。';
  case 'unavailable':return '专用审阅通道当前不可用。';
  default:return state.draftDirty?'人工审阅草稿尚未提交。':'当前没有待提交的人工修改。';
 }
}

/** Presentation and events only. Existing editors, draft retention, actual
 * reads/writes, CAS and validated notice delivery stay with their owners. */
export function Candidate2ReviewFeedback(props:Candidate2ReviewFeedbackProps){
 const generated=useId(),id=`candidate2-review-feedback-${generated}`,{state}=props;
 const latest=useRef(props);latest.current=props;
 const retry=useRef({state,sent:false});if(retry.current.state!==state)retry.current={state,sent:false};
 const emitCancel=()=>{const current=latest.current;if(current.state.requestPending)current.onCancelWait();};
 const emitRead=()=>{const current=latest.current;if(canReadSaved(current))current.onReadSaved();};
 const emitLoad=()=>{const current=latest.current;if(canLoadLatest(current))current.onLoadLatest();};
 const emitCompare=()=>{const current=latest.current;if(canCompareDraft(current))current.onCompareDraft();};
 const emitRetry=()=>{const current=latest.current;if(!canRetryDelivery(current)||retry.current.sent)return;retry.current.sent=true;current.onRetryDelivery();};
 const reconcile=needsReadback(state)||state.requiresRestart;
 return <section className="c2-review-feedback" data-c2-review-feedback data-phase={state.phase} aria-labelledby={`${id}-title`}>
  <header className="c2rf-header"><div><p className="c2rf-eyebrow">项目固定取法 · 人工审阅</p><h3 id={`${id}-title`}>审阅与保存状态</h3></div><span className="c2rf-badge">原分析与分值单独保留</span></header>
  <p className="c2rf-scope">人工审阅文字、收藏和人工五行草案，与原分析、原始生成依据及分值分别保留。人工元素选择仅是草案，不表示重新计算了原命名分析。</p>
  <div className="c2rf-status" role="status" aria-live="polite" aria-atomic="true"><p>{statusText(state)}</p>{state.notice&&<p>{state.notice}</p>}</div>
  {state.draftDirty&&<p className="c2rf-draft">本次人工修改仍作为草稿保留。读取或比较不会由本组件自动覆盖草稿。</p>}
  {state.blockedReason&&<p className="c2rf-blocked">{state.blockedReason}</p>}
  {props.disabled&&!state.blockedReason&&<p className="c2rf-blocked">工作台正在处理其他操作，读取与接收动作暂不可用。</p>}
  {state.error&&<p className="c2rf-error" role="alert">{state.error}</p>}
  {reconcile&&<div className="c2rf-reconcile"><p>请先核对已保存内容，再明确选择比较或载入最新版本。本提示不证明保存成功，也不会自动再次保存或替换审阅版本。</p>{state.requiresRestart&&<p className="c2rf-restart">请先保留需要的草稿并重启应用；重启要求未解除前，重新读取、载入、比较和结果接收均不可用。</p>}<div className="c2rf-actions">
   <button type="button" className="c2rf-secondary" data-c2-review-action="read-saved" disabled={!canReadSaved(props)} onClick={emitRead}>重新读取已保存方案</button>
   <button type="button" className="c2rf-secondary" data-c2-review-action="compare-draft" disabled={!canCompareDraft(props)} onClick={emitCompare}>比较草稿与最新版本</button>
   <button type="button" className="c2rf-secondary" data-c2-review-action="load-latest" disabled={!canLoadLatest(props)} onClick={emitLoad}>载入最新版本</button>
  </div><p className="c2rf-hint">这些按钮只请求工作台读取或处理当前草稿；能否执行由真实通道与原有草稿确认流程决定。</p></div>}
  {(state.requestPending||hasDeliveryRetry(state))&&<div className="c2rf-actions">
   {state.requestPending&&<button type="button" className="c2rf-secondary" data-c2-review-action="cancel-wait" onClick={emitCancel}>停止等待</button>}
   {hasDeliveryRetry(state)&&<button type="button" className="c2rf-secondary" data-c2-review-action="retry-delivery" disabled={!canRetryDelivery(props)} onClick={emitRetry}>重新接收已返回的审阅结果</button>}
  </div>}
  {state.requestPending&&<p className="c2rf-wait">停止等待不会撤销已发出的后端请求，也不表示保存已经取消。原请求结束前仍由工作台保留操作状态。</p>}
  <p className="c2rf-boundary">本区域只反馈状态与人工操作意图，不提交保存，不更改原始事实或评分，也不提供新的传统判定。</p>
 </section>;
}
