import React,{useId,useRef} from 'react';
import type {Candidate2GenerationPanelProps,Candidate2GenerationUiState} from './candidate2-generation-ui';
import './candidate2-generation-panel.css';

export type {Candidate2GenerationPanelProps} from './candidate2-generation-ui';

const active=(state:Candidate2GenerationUiState)=>state.phase==='generating'||state.phase==='delivering';
const reason=(state:Candidate2GenerationUiState)=>state.blockedReason?.trim()||null;
const canGenerate=(props:Candidate2GenerationPanelProps)=>!props.disabled&&props.state.enabled&&props.state.canGenerate&&!props.state.requestPending&&!reason(props.state)&&!['blocked','unavailable','generating','delivering'].includes(props.state.phase);
const deliveryFailed=(state:Candidate2GenerationUiState)=>state.enabled&&state.phase==='delivering'&&!state.requestPending&&!state.canGenerate&&!!state.error?.trim();
const canRetryDelivery=(props:Candidate2GenerationPanelProps)=>!props.disabled&&!reason(props.state)&&deliveryFailed(props.state);
function statusText(state:Candidate2GenerationUiState):string {
 if(state.requestPending)return state.phase==='delivering'?'结果已返回，正在等待交接完成。':'正在等待生成并保存结果。';
 if(!state.enabled)return '项目固定取法尚未启用。';
 switch(state.phase){
  case 'blocked':return '当前条件尚不支持本次生成。请先处理下方原因。';
  case 'unavailable':return '项目固定取法当前不可用。';
  case 'generating':return '正在处理本次生成，请等待工作台更新状态。';
  case 'delivering':return deliveryFailed(state)?'结果已返回，但工作台接收尚未完成。请重新接收同一结果。':'结果已返回，正在交接到工作台。';
  case 'ready':return '本次结果已接收到工作台。';
  case 'error':return '本次生成未完成。请查看错误后重试。';
  default:return state.canGenerate?'已启用。点击生成按钮后才会开始生成并保存。':'已启用，请等待工作台确认当前条件。';
 }
}

/** Controlled, event-only presentation. API work, owner leases, idempotency and
 * saved-result acceptance remain with the owning controller/App. No effect
 * dispatches actions, and eligibility diagnostics are not accepted as authority. */
export function Candidate2GenerationPanel(props:Candidate2GenerationPanelProps){
 const generated=useId(),id=`candidate2-generation-${generated}`,{state}=props;
 const latest=useRef(props);latest.current=props;
 // Protect rapid repeated activation within one controlled state projection.
 // The owner publishes a new projection to permit a later explicit retry.
 const dispatch=useRef({state,generate:false,retry:false});
 if(dispatch.current.state!==state)dispatch.current={state,generate:false,retry:false};
 const toggleLocked=!!props.disabled||state.requestPending||active(state);
 const emitEnabled=(enabled:boolean)=>{const current=latest.current;if(current.disabled||current.state.requestPending||active(current.state)||enabled===current.state.enabled)return;current.onEnabledChange(enabled);};
 const emitGenerate=()=>{const current=latest.current;if(!canGenerate(current)||dispatch.current.generate)return;dispatch.current.generate=true;current.onGenerate();};
 const emitCancel=()=>{const current=latest.current;if(current.state.requestPending)current.onCancel();};
 const emitRetry=()=>{const current=latest.current;if(!canRetryDelivery(current)||dispatch.current.retry)return;dispatch.current.retry=true;current.onRetryDelivery();};
 const summary=state.phase==='ready'&&state.enabled?state.savedSummary:undefined;
 const validSummary=summary&&typeof summary.sessionId==='string'&&summary.sessionId.length>0&&typeof summary.profileId==='string'&&summary.profileId.length>0&&Number.isSafeInteger(summary.candidateCount)&&summary.candidateCount>=0&&summary.traditionalStatus==='unknown';
 return <section className="c2-generation-panel" data-c2-generation-panel data-phase={state.phase} aria-labelledby={`${id}-title`}>
  <header className="c2g-header"><div><p className="c2g-eyebrow">可选命名流程</p><h3 id={`${id}-title`}>项目固定取法生成</h3></div><span className="c2g-badge">传统判断：未知</span></header>
  <p id={`${id}-help`} className="c2g-help">默认关闭。启用只改变本次意图，仍需点击按钮才会生成并保存。</p>
  <label className="c2g-enable" htmlFor={`${id}-enabled`}><input id={`${id}-enabled`} data-c2-action="enable" type="checkbox" checked={state.enabled} disabled={toggleLocked} aria-describedby={`${id}-help ${id}-scope`} onChange={event=>emitEnabled(event.currentTarget.checked)}/><span><strong>启用项目固定取法</strong><span>按项目既定规则处理当前资料，不自动改变原有取法。</span></span></label>
  <div className="c2g-status" role="status" aria-live="polite" aria-atomic="true"><p>{statusText(state)}</p>{state.notice&&<p>{state.notice}</p>}</div>
  {reason(state)&&<p className="c2g-blocked" id={`${id}-blocked`}>{reason(state)}</p>}
  {props.disabled&&!reason(state)&&<p className="c2g-blocked">工作台当前不可操作，请先完成其他操作。</p>}
  {state.error&&<p className="c2g-error" role="alert">{state.error}</p>}
  {state.requestPending&&<p className="c2g-wait">“停止等待”只停止界面等待，不会撤销已发出的后端请求。请求结果由工作台继续确认。</p>}
  <div className="c2g-actions">
   <button type="button" className="c2g-primary" data-c2-action="generate" disabled={!canGenerate(props)} aria-describedby={`${id}-scope${reason(state)?' '+id+'-blocked':''}`} onClick={emitGenerate}>按项目固定取法生成并保存</button>
   {state.requestPending&&<button type="button" className="c2g-secondary" data-c2-action="cancel" onClick={emitCancel}>停止等待</button>}
   {deliveryFailed(state)&&<button type="button" className="c2g-secondary" data-c2-action="retry-delivery" disabled={!canRetryDelivery(props)} onClick={emitRetry}>重新接收已返回结果</button>}
  </div>
  {validSummary&&<section className="c2g-summary" data-c2-saved-summary aria-labelledby={`${id}-summary`}><h4 id={`${id}-summary`}>已返回方案摘要</h4><p>本次方案含 {summary.candidateCount} 个候选名字。</p><dl><div><dt>原方案编号</dt><dd>{summary.sessionId}</dd></div><div><dt>宝宝档案编号</dt><dd>{summary.profileId}</dd></div><div><dt>传统判断状态</dt><dd>未知（unknown）</dd></div></dl></section>}
  <p id={`${id}-scope`} className="c2g-scope">项目固定取法有明确适用范围，不等同完整传统用神判断。结果摘要不提供来源认证、吉凶或运势结论，传统判断保持未知。</p>
 </section>;
}
