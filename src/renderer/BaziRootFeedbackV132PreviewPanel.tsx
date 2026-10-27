import React,{useId,useLayoutEffect,useMemo,useRef,useSyncExternalStore} from 'react';
import type {BirthProfile} from '../shared/types';
import type {RootFeedbackPreviewDTO} from '../shared/bazi-root-feedback-v132';
import type {RootFeedbackV132FacadeDTO} from '../shared/bazi-root-feedback-v132-r2-facade';
import type {BaziRootFeedbackV132PreviewApi} from '../shared/bazi-root-feedback-v132-preview-api';
import {createV132PreviewController,currentV132PreviewState,readV132PreviewFrame,type V132PreviewState} from './bazi-root-feedback-v132-preview-state';
import './bazi-root-feedback-v132-preview.css';

const resolutionCopy:Record<RootFeedbackV132FacadeDTO['status'],string>={
 'unique-consistent-regime':'本次预览得到一项一致的项目结论（仅供预览）。',
 'multiple-consistent-regimes':'存在多个一致的项目结论，未合并为唯一结果。',
 'no-consistent-regime':'当前资料未得到一致的项目结论。',
 'pending-regime-resolution':'本次项目规则或计算证据尚未得到确定结果。',
};
const resolutionLabel:Record<RootFeedbackV132FacadeDTO['status'],string>={
 'unique-consistent-regime':'一项一致结论','multiple-consistent-regimes':'多项一致结论','no-consistent-regime':'无一致结论','pending-regime-resolution':'结果待定',
};
const hasDirections=(opinion:RootFeedbackPreviewDTO['regimes'][number]['opinion'])=>!!opinion&&[opinion.primary,opinion.secondary,opinion.avoid].some(values=>values.length>0);
function retainedRegimes(root:RootFeedbackPreviewDTO){
 const ids=new Set([...root.consistentIds,...root.possibleIds]);
 return root.regimes.filter(regime=>regime.consistency!=='inconsistent'&&ids.has(regime.id)).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
}
const directionPending=(root:RootFeedbackPreviewDTO)=>root.resolution==='unique-consistent-regime'&&!retainedRegimes(root).some(regime=>hasDirections(regime.opinion));
const directionPendingLabel='一条一致路径，取用方向待定';
const directionPendingCopy='本次预览得到一条一致的项目路径，取用方向尚未确定。';
function Elements({values}:{values:readonly string[]}){return <>{values.length?values.join('、'):'未确定'}</>;}
function pendingIntroduction(result:RootFeedbackV132FacadeDTO):string {
 if(result.branches.some(branch=>branch.kind==='unknown-hour-interval'))return '出生时刻未知，当前仅展示可能时段分支，结果待定。';
 if(!result.calendar.partitionComplete)return '本次历法区间尚未完成核对，暂未得到确定的项目结果。';
 return '出生时刻已记录，但本次项目规则或计算证据尚未得到确定结果。';
}
function pendingReasons(result:RootFeedbackV132FacadeDTO):string[] {
 return [...new Set([...result.calendar.warnings,...result.branches.flatMap(branch=>[...branch.root.pending,...branch.root.regimes.filter(regime=>regime.consistency!=='inconsistent').flatMap(regime=>regime.pending)])])];
}
const reasonLabel=(reason:string)=>reason.replaceAll('invalid-graph','计算关系图不完整').replaceAll('non-finite','计算中存在无效数值').replaceAll('not-converged','计算尚未收敛').replaceAll('uncertified-roundoff','舍入误差尚未验证');
function summaryPendingReasons(result:RootFeedbackV132FacadeDTO):string[]{
 const ids=[...new Set(result.branches.flatMap(branch=>[branch.id,branch.root.profileId,...branch.root.regimes.map(regime=>regime.id)]))].filter(Boolean).sort((a,b)=>b.length-a.length);
 return [...new Set(pendingReasons(result).map(reason=>{
  const text=reason.trim(),id=ids.find(value=>text.startsWith(value+'：')||text.startsWith(value+': '));
  return reasonLabel(id?text.slice(id.length+1).trim():text);
 }))];
}
function RawPendingDiagnostics({result}:{result:RootFeedbackV132FacadeDTO}){
 return <section className="v132-raw-diagnostics"><h5>完整原始待定诊断与路径标识</h5>
  {result.calendar.warnings.length>0&&<><h6>历法记录</h6><ul>{result.calendar.warnings.map((reason,index)=><li key={index}>{reason}</li>)}</ul></>}
  {result.branches.map((branch,index)=><section key={branch.id}><h6>分支 {index+1}</h6><p>分支标识：<span className="mono">{branch.id}</span></p>
   <ul>{branch.root.pending.map((reason,index)=><li key={index}>{reason}</li>)}</ul>
   {[...branch.root.regimes].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0).map(regime=><section key={regime.id}><p>项目路径标识：<span className="mono">{regime.id}</span></p><ul>{regime.pending.map((reason,index)=><li key={index}>{reason}</li>)}</ul></section>)}
  </section>)}
 </section>;
}
const certificateLabel={closed:'本次数值检查闭合',unclosed:'数值检查尚未闭合',unavailable:'暂无数值检查凭据'};
const numberLabel=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?String(value):'未提供';
function Certificates({regimes}:{regimes:RootFeedbackPreviewDTO['regimes']}){
 return <div className="v132-certificates">{[...regimes].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0).map(regime=><section key={regime.id}><h5>项目路径 · {certificateLabel[regime.certificate.status]}</h5><dl><dt>迭代次数</dt><dd>{numberLabel(regime.certificate.iterations)}</dd><dt>误差界限</dt><dd>{numberLabel(regime.certificate.errorBound)}</dd><dt>残差上界</dt><dd>{numberLabel(regime.certificate.residualL1UpperBound)}</dd></dl><p>数值检查只说明本项目计算的相应条件，不代表传统用神已确定，也不是命名采用证书。</p></section>)}</div>;
}
function Branch({branch}:{branch:RootFeedbackV132FacadeDTO['branches'][number]}){
 const root=branch.root;
 // Stable identifier order only; it carries no preference, score or ranking.
 const retained=retainedRegimes(root);
 return <article className="v132-branch"><header><strong>{branch.kind==='unknown-hour-interval'?'可能时段分支':'当前出生时刻'}</strong><span>{branch.hypothetical?'项目假设分支':'记录分支'}</span></header><p className="v132-branch-status">{directionPending(root)?directionPendingLabel:resolutionLabel[root.resolution]}</p>{retained.length>1&&<p>以下项目路径并列保留；列示顺序不表示优先或排名，不选其中一条代表整体。</p>}{retained.length?retained.map(regime=><section className="v132-regime" data-regime-id={regime.id} key={regime.id}>{retained.length>1&&<h5>保留的项目路径</h5>}{hasDirections(regime.opinion)?<><p>项目主方向：<b><Elements values={regime.opinion!.primary}/></b></p><p>辅助方向：<Elements values={regime.opinion!.secondary}/> · 本路径慎用：<Elements values={regime.opinion!.avoid}/></p></>:<p>{regime.opinion?'本路径的主、辅及慎用方向尚未确定；请展开下方查看待定与边界。':'本路径尚未形成可展示的项目方向。'}</p>}</section>):<p>本分支尚未形成可展示的项目方向。</p>}<details><summary>查看本分支的待定与边界</summary><ul>{[...root.pending,...root.limitations].map((item,index)=><li key={index}>{reasonLabel(item)}</li>)}</ul><Certificates regimes={root.regimes}/></details></article>;
}
export function BaziRootFeedbackV132PreviewResult({result}:{result:RootFeedbackV132FacadeDTO}){
 const pending=result.status==='pending-regime-resolution',reasons=pending?summaryPendingReasons(result):[];
 const directionsPending=result.status==='unique-consistent-regime'&&result.branches.every(branch=>directionPending(branch.root));
 return <div className="v132-result"><div className="v132-result-heading"><div><span className="v132-status">{directionsPending?directionPendingLabel:resolutionLabel[result.status]}</span><h3>{pending?pendingIntroduction(result):directionsPending?directionPendingCopy:resolutionCopy[result.status]}</h3></div><span className="v132-badge">项目预览</span></div><p className="v132-gate">本预览尚未用于起名生成、保存、评分或候选排序。</p>{pending&&<section className="v132-pending-reasons"><h4>本次仍待确定的原因</h4>{reasons.length?<ul>{reasons.map((reason,index)=><li key={index}>{reason}</li>)}</ul>:<p>本次项目规则与计算证据未形成确定意见。</p>}</section>}<div className="v132-branches">{result.branches.map(branch=><Branch branch={branch} key={branch.id}/>)}</div><details className="v132-source"><summary>查看版本、来源与证书边界</summary><dl><dt>方法版本</dt><dd>{result.methodId} · 1.3.2-r2</dd><dt>预览出版</dt><dd>{result.resourceIdentity.publicationId}</dd><dt>来源修订</dt><dd>{result.resourceIdentity.kernel.sourceRevision}</dd><dt>资源闭包 SHA-256</dt><dd className="mono">{result.resourceIdentity.fullClosureSha256}</dd><dt>资源清单 SHA-256</dt><dd className="mono">{result.resourceIdentity.manifestSha256}</dd><dt>应用状态</dt><dd>阻塞：此版本未进入起名应用或保存证书。</dd></dl>{result.sources.map(source=><section key={source.id}><h5>{source.name}</h5><p>固定版本：{source.commit}</p><p>资料许可：{source.license}</p><p>{source.note}</p></section>)}{pending&&<RawPendingDiagnostics result={result}/>}<p>{result.branches.some(branch=>branch.kind==='unknown-hour-interval')?'本次未知时辰保留可能分支。':''}本预览不把项目方向说成完整传统用神，也不写入当前命名模型。</p></details></div>;
}
export interface BaziRootFeedbackV132PreviewPanelProps {profile:BirthProfile;api?:BaziRootFeedbackV132PreviewApi;disabled?:boolean;currentModelLabel?:string;}
export function BaziRootFeedbackV132PreviewPanel({profile,api,disabled=false,currentModelLabel}:BaziRootFeedbackV132PreviewPanelProps){
 const id=useId(),latest=useRef({profile,api,disabled});latest.current={profile,api,disabled};
 const controller=useMemo(()=>createV132PreviewController({getProfile:()=>latest.current.profile,getApi:()=>latest.current.api,isDisabled:()=>latest.current.disabled}),[]);
 const stored=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot),frame=readV132PreviewFrame(profile,api,stored.proposal,disabled),state=currentV132PreviewState(stored,frame);
 useLayoutEffect(()=>{controller.activate();return()=>controller.dispose();},[controller]);
 useLayoutEffect(()=>controller.refresh(),[controller,profile,frame.profileKey,frame.api,frame.method,disabled]);
 return <BaziRootFeedbackV132PreviewView id={id} state={state} disabled={disabled} currentModelLabel={currentModelLabel} onRun={()=>void controller.run()} onProposal={controller.setProposal}/>;
}
export function BaziRootFeedbackV132PreviewView({id,state,disabled,currentModelLabel,onRun,onProposal}:{id:string;state:V132PreviewState;disabled:boolean;currentModelLabel?:string;onRun:()=>void;onProposal:(value:boolean)=>void}){
 const busy=state.phase==='loading',unavailable=!state.api||!state.method;
 return <section className="v132-preview panel" aria-labelledby={`${id}-title`} aria-busy={busy}><header className="v132-heading"><div><p className="v132-eyebrow">项目用神 · 独立预览</p><h2 id={`${id}-title`}>新版项目用神预览</h2><p>这是可选的项目模型预览，不替换当前命名模型或已保存结果。</p></div><span className="v132-badge">默认不运行</span></header><p className="v132-current-model">当前命名：{currentModelLabel??'沿用现有命名模型'}；下方仅作独立预览。</p><div className="v132-controls"><label><input type="checkbox" checked={state.proposal} disabled={disabled||busy} onChange={event=>onProposal(event.target.checked)}/><span><strong>同时试算月干入口</strong><small>显式开启；默认使用月支入口</small></span></label><button type="button" className="button secondary" disabled={disabled||busy||unavailable} onClick={onRun}>{busy?'正在读取项目预览…':state.phase==='error'?'重试当前资料':state.phase==='ready'?'按当前资料重新预览':'预览当前出生资料'}</button></div>{unavailable&&<p className="v132-notice" role="status">新版项目预览暂未连接，请更新连接后重试；当前命名模型保持不变。</p>}{disabled&&<p className="v132-notice" role="status">当前有其他操作进行中，请稍后再预览。</p>}{state.phase==='idle'&&<p className="v132-notice" role="status">{state.notice??'明确点击“预览当前出生资料”后，才会读取本次资料。'}</p>}{state.phase==='loading'&&<p className="v132-notice" role="status">正在按当前出生资料读取；修改资料后旧结果不会落下。</p>}{state.phase==='error'&&<div className="v132-error" role="alert"><strong>项目预览未完成</strong><p>{state.error}</p><button type="button" className="button secondary" onClick={onRun} disabled={disabled||unavailable}>重试</button></div>}{state.phase==='ready'&&state.result&&<BaziRootFeedbackV132PreviewResult result={state.result}/>}</section>;
}
