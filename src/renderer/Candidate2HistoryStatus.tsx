import React from 'react';
import type {Candidate2HistoryUiState} from './candidate2-history-state';

export interface Candidate2HistoryStatusProps{
 state:Pick<Candidate2HistoryUiState,'phase'|'requestPending'|'canRead'|'canRetryDelivery'|'requiresReadback'|'requiresRestart'|'notice'|'error'|'blockedReason'>;
 disabled?:boolean;onReadHistory:()=>void;onCancelWait:()=>void;onRetryDelivery:()=>void;
}
/** Controlled status for the existing history/confirmation dialogs. The parent
 * owns original records, dirty confirmation, reads, CAS and the shared lease. */
export function Candidate2HistoryStatus({state,disabled,onReadHistory,onCancelWait,onRetryDelivery}:Candidate2HistoryStatusProps){
 return <section data-c2-history-status data-phase={state.phase} className="detail-section" aria-label="项目固定取法历史状态">
  <p role="status" aria-live="polite">{state.notice}</p>
  {state.blockedReason&&<p className="inline-warning">{state.blockedReason}</p>}
  {state.error&&<p className="inline-error" role="alert">{state.error}</p>}
  {state.requiresRestart?<p className="inline-warning">请保留人工草稿并重启；重启要求解除前，历史读取、恢复及结果接收均不可用。</p>:state.requiresReadback&&<p className="inline-warning">请先在人工审阅状态中明确读回当前已保存方案并核对草稿；重新列出历史不会解锁旧凭据或自动重试恢复。</p>}
  <div className="button-row">
   <button type="button" className="button secondary" data-c2-history-action="read" disabled={!!disabled||!state.canRead||state.requiresRestart} onClick={()=>{if(!disabled&&state.canRead&&!state.requiresRestart)onReadHistory();}}>重新读取历史</button>
   {state.requestPending&&<button type="button" className="button secondary" data-c2-history-action="cancel-wait" onClick={onCancelWait}>停止等待</button>}
   {state.canRetryDelivery&&<button type="button" className="button secondary" data-c2-history-action="retry-delivery" disabled={!!disabled||state.requestPending||state.requiresRestart} onClick={()=>{if(!disabled&&!state.requestPending&&!state.requiresRestart)onRetryDelivery();}}>重新接收实际恢复回复</button>}
  </div>
  {state.requestPending&&<p className="muted small">停止等待不会撤销已发出的读取或恢复；真实请求结束前仍保留工作台操作状态。</p>}
 </section>;
}
