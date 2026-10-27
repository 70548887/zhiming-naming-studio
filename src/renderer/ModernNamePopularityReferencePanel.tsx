import React,{useId,useLayoutEffect,useMemo,useRef,useSyncExternalStore} from 'react';
import type {ModernNamePopularityReference} from '../shared/modern-name-popularity-reference';
import {createModernNamePopularityReferenceController,currentModernReferenceState,readModernReferenceFrame,type ModernReferenceCandidate,type ModernReferenceState,type ModernNamePopularityReferenceApi} from './modern-name-popularity-reference-state';
import './modern-name-popularity-reference.css';

export interface ModernNamePopularityReferencePanelProps {
  candidate:ModernReferenceCandidate;api?:ModernNamePopularityReferenceApi;disabled?:boolean;
}
const defaultApi=()=>typeof window==='undefined'?undefined:window.studio;

export function ModernNamePopularityReferenceResult({result}:{result:ModernNamePopularityReference}){
  const {historical,source}=result;
  return <div className="modern-name-reference-result">
    <p className="modern-name-reference-scope">2021 年出生，截至 {historical.cohort.registeredBy} 已登记户籍的新生儿；仅查询给名“{result.givenName}”，不含姓氏。</p>
    <div className="modern-name-reference-facts" aria-label="历史给名参考口径">
      <div data-reference-fact="evidence"><span>证据状态</span><strong>{result.modernEvidence.label}</strong></div>
      <div data-reference-fact="year"><span>统计年份</span><strong>{historical.report.statisticalYear} 年</strong></div>
      <div data-reference-fact="sample"><span>样本范围</span><strong>2021 年出生、截至 {historical.cohort.registeredBy} 已登记新生儿；给名不含姓氏</strong></div>
    </div>
    <p className="modern-name-reference-no-rate"><strong>当前全国全名重名率／频率：</strong>不可由本历史给名榜推导。</p>
    <div className="modern-name-reference-cohorts">{historical.records.map(record=><article key={record.sexCohort} className="modern-name-reference-cohort" data-sex-cohort={record.sexCohort} data-result-status={record.status} data-reported-people={record.reportedPeople??undefined}>
      <h5>{record.sexCohort==='male'?'男性新生儿榜':'女性新生儿榜'}</h5>
      {record.status==='listed'&&record.reportedPeople!==null?<><p><strong>{record.reportedPeople.toLocaleString('zh-CN')}</strong> 人</p><p>该榜第 {record.rank} 名 · 官方公布登记人数</p></>:<><p><strong>人数未公布</strong></p><p>未列入该榜前十，人数未知。</p></>}
    </article>)}</div>
    <p className="modern-name-reference-state">保存的现代说明状态：{result.modernEvidence.label}。此处仅展示保存记录状态，未重新认证现代说明。</p>
    <p className="modern-name-reference-state">{result.modernEvidence.notice}</p>
    <p className="modern-name-reference-state">来源状态：{result.sourceVerification.status === 'canonical-fixed-local' ? '已核验的固定官方历史出版物' : '来源状态未知'}；此参考只读，不写入客户库、候选或现代说明。</p>
    <details className="modern-name-reference-source"><summary>查看年份、统计群体与来源</summary>
      <dl><dt>统计出生年</dt><dd>{historical.report.statisticalYear} 年</dd><dt>登记截止</dt><dd>{historical.cohort.registeredBy}</dd><dt>统计群体</dt><dd>{historical.cohort.description}</dd><dt>地域口径</dt><dd>{historical.cohort.geography}</dd><dt>报告</dt><dd>{historical.report.title} · {historical.report.publisher}</dd><dt>转载网站</dt><dd>{historical.report.hostName}</dd><dt>可见发布日</dt><dd>{historical.report.visiblePublishedAt}</dd><dt>资料固定日期</dt><dd>{historical.report.retrievedOn}</dd><dt>来源 ID</dt><dd>{result.sourceVerification.sourceId}</dd><dt>来源闭包 SHA-256</dt><dd className="mono">{result.sourceVerification.sourceSha256}</dd><dt>官方原文 SHA-256</dt><dd className="mono">{result.sourceVerification.reportHtmlSha256}</dd><dt>独立盲录审阅 SHA-256</dt><dd className="mono">{result.sourceVerification.independentReviewRecordSha256}</dd><dt>表格图像 SHA-256</dt><dd className="mono">{result.sourceVerification.tableImageSha256s.join(' · ')}</dd><dt>公布母数精度</dt><dd>合计 {historical.cohort.denominators.total.published}；男性 {historical.cohort.denominators.male.published}；女性 {historical.cohort.denominators.female.published}；精度 {historical.cohort.denominators.total.publishedResolutionPeople} 人，精确母数未知，舍入规则未公布。</dd><dt>原报告许可</dt><dd>未声明开放许可；本界面不发行原文或原图。</dd><dt>资料版本</dt><dd>{historical.dataVersion}</dd><dt>许可说明</dt><dd>{source.license}</dd></dl>
      <p>原报告图文未声明开放许可；本界面仅展示项目自行结构化的最小事实与来源摘要，沿用原 NOTICE 的限制。</p>
      <p>{source.note}</p><a href={historical.report.url} target="_blank" rel="noopener noreferrer">查看官方报告</a>
      <ul>{historical.limitations.map((line,index)=><li key={index}>{line}</li>)}</ul>
    </details>
  </div>;
}

export function ModernNamePopularityReferenceView({id,state,onQuery,onClose}:{id:string;state:ModernReferenceState;onQuery:()=>void;onClose:()=>void}){
  const unavailable=!state.api||!state.method,blocked=state.disabled||!state.candidate;
  return <section className="modern-name-reference" aria-labelledby={id+'-title'} aria-busy={state.phase==='loading'}>
    <div className="modern-name-reference-heading"><h4 id={id+'-title'}>2021年给名参考</h4><button type="button" className="button secondary" aria-expanded={state.expanded} aria-controls={id+'-content'} disabled={unavailable||blocked} onClick={state.expanded?onClose:onQuery}>{state.expanded?'收起给名参考':'查看2021年给名参考'}</button></div>
    <p className="modern-name-reference-boundary">历史给名榜不代表当前全国全名重名率；榜外人数未知，不推断罕见或独一无二。查阅不改变评分、排序或保存记录。</p>
    {blocked?<p role="status">请先保存当前审阅；此参考只查看现有保存候选。</p>:unavailable?<p role="status">历史榜单服务尚未接通。</p>:null}
    {state.expanded&&<div id={id+'-content'}>
      {state.phase==='loading'&&<p role="status">正在读取本地固定历史榜单…</p>}
      {state.phase==='error'&&<div className="modern-name-reference-error" role="alert"><p>{state.errorKind==='source'?'历史榜单与固定来源不一致，参考未展示。':state.errorKind==='input'?'当前保存候选资料不完整，参考未展示。':'暂未能读取历史榜单，参考未展示。'}</p><button type="button" className="button secondary" onClick={onQuery} disabled={blocked||unavailable}>重新读取参考</button></div>}
      {state.phase==='ready'&&state.result&&<ModernNamePopularityReferenceResult result={state.result}/>}
    </div>}
  </section>;
}

/** Existing saved/reviewed session paths supply the candidate; no new authenticity claim. */
export function ModernNamePopularityReferencePanel({candidate,api,disabled=false}:ModernNamePopularityReferencePanelProps){
  const id=useId(),latest=useRef({candidate,api,disabled});latest.current={candidate,api,disabled};
  const getFrame=()=>readModernReferenceFrame(latest.current.candidate,latest.current.api??defaultApi(),latest.current.disabled);
  const controller=useMemo(()=>createModernNamePopularityReferenceController({getFrame}),[]);
  const stored=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
  const frame=getFrame(),state=currentModernReferenceState(stored,frame);
  useLayoutEffect(()=>{controller.activate();return()=>controller.dispose();},[controller]);
  useLayoutEffect(()=>controller.refresh(),[controller,candidate,frame.ownerKey,frame.api,frame.method,disabled]);
  return <ModernNamePopularityReferenceView id={id} state={state} onQuery={()=>void controller.query()} onClose={controller.close}/>;
}
