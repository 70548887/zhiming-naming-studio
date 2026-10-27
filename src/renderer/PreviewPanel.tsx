import React,{useEffect,useId,useLayoutEffect,useMemo,useRef,useSyncExternalStore} from 'react';
import type {BirthProfile} from '../shared/types';
import type {BaziMainchainPreview,BaziMainchainPreviewOptions,BaziMainchainQualitativeCase} from '../shared/bazi-mainchain';
import {classicDisplay} from '../shared/classic-display';
import {createBaziMainchainPreviewController,type BaziMainchainPreviewState} from './bazi-mainchain-preview-state';
import './bazi-mainchain-preview.css';

export interface BaziMainchainPreviewApi {
 previewBaziMainchain(profile:BirthProfile,options?:BaziMainchainPreviewOptions):Promise<BaziMainchainPreview>;
}
export interface PreviewPanelProps {
 profile:BirthProfile;api:BaziMainchainPreviewApi;disabled?:boolean;disabledReason?:string;
 draftDirty?:boolean;onEditBirth?:()=>void;id?:string;
}
export interface PreviewPanelViewProps extends Omit<PreviewPanelProps,'api'> {
 state:BaziMainchainPreviewState;onRun:()=>void;onProposal:(enabled:boolean)=>void;
 feedbackId?:string;
}
const statusCopy:Record<BaziMainchainPreview['status'],{label:string;intro:string}>={
 'project-opinion':{label:'本次项目意见',intro:'按当前出生记录与所选入口，得到以下定性意见。'},
 'conditional-opinion':{label:'存在条件化方案',intro:'当前条件不足以确定唯一主方向，请保留各方案的前提。'},
 'provisional-missing-hour':{label:'缺时 · 三柱暂定',intro:'只推导已知三柱；补充时辰后，根、冲合与取用可能改变。'},
 'pending-calendar':{label:'关键柱待定',intro:'现有历法尚未确定关键柱，暂不选取用方向。'},
 'invalid-input':{label:'出生资料需核对',intro:'资料尚未通过历法校验，请核对后再预览。'}
};
const strengthText={strong:'项目判为偏旺',weak:'项目判为偏弱',balanced:'项目判为中和'};
const sourceRoles={'calendar-facts':'历法与时间事实','classical-principle':'经典原则与语境','project-assumption':'项目假设与充分条件','initial-reference':'固定月别初始参照'};
const join=(items:readonly string[])=>items.length?items.join('、'):'尚未定';

function Direction({opinion,compact=false}:{opinion:BaziMainchainQualitativeCase;compact?:boolean}) {
 return <div className={`bmc-direction${compact?' bmc-direction-compact':''}`}>
  <div className="bmc-opinion-heading"><h4>{opinion.branchLabel}</h4><span>{strengthText[opinion.strength]}</span></div>
  <dl className="bmc-direction-grid"><div><dt>主方向</dt><dd>{join(opinion.primary)}</dd></div><div><dt>辅助方向</dt><dd>{join(opinion.secondary)}</dd></div><div><dt>本分支慎用</dt><dd>{join(opinion.avoid)}</dd></div></dl>
  {opinion.conditionalAlternatives.length>0&&<div className="bmc-alternatives"><h5>保留的条件化方案</h5>{opinion.conditionalAlternatives.map(item=><article key={item.id}><p>{item.condition}</p><p>主方向 {join(item.uses.filter(use=>use.role==='primary').map(use=>use.element))} · 辅助 {join(item.uses.filter(use=>use.role==='secondary').map(use=>use.element))}</p></article>)}</div>}
  {compact&&<ul className="bmc-summary-list">{opinion.summary.map((line,index)=><li key={index}>{line}</li>)}</ul>}
 </div>;
}
function RawDetail({label,value}:{label:string;value:unknown}) {
 const [open,setOpen]=React.useState(false);
 return <details className="bmc-raw" onToggle={event=>setOpen(event.currentTarget.open)}><summary>{label}</summary>{open&&<pre>{JSON.stringify(value,null,2)}</pre>}</details>;
}
function safeSourceUrl(url:string|undefined):string|undefined {
 if(!url)return undefined;
 try{const parsed=new URL(url);return parsed.protocol==='https:'?parsed.href:undefined;}catch{return undefined;}
}
function PreviewEvidence({result}:{result:BaziMainchainPreview}) {
 const main=result.details.method?.results[0],reference=main?.seasonal.sourceReference;
 const ref=reference&&typeof reference==='object'?reference as Record<string,unknown>:null;
 const quote=typeof ref?.sourceQuote==='string'?ref.sourceQuote:null;
 return <div className="bmc-evidence">
  <details><summary><span>01</span>出生记录与时间依据</summary><div className="bmc-disclosure-body">
   <dl className="bmc-facts"><div><dt>原始记录</dt><dd>{result.recordedBirth.calendar==='lunar'?'农历':'公历'} {result.recordedBirth.birthDate}{result.recordedBirth.leapMonth?'（闰月）':''} · {result.recordedBirth.timeUnknown?'时刻未知':result.recordedBirth.birthTime}</dd></div><div><dt>时区与地点</dt><dd>{result.recordedBirth.timezone} · {result.recordedBirth.birthPlace||'地点未填写'}</dd></div><div><dt>排盘钟表</dt><dd>{result.calendar.basis==='apparent-solar'?'真太阳时':'民用时'} · {result.calendar.calculationDateTime||'未确定具体时刻'}</dd></div>{result.calendar.dayDateCandidates.length>1&&<div><dt>可能的排盘日期</dt><dd>{result.calendar.dayDateCandidates.join('、')}（尚未选定）</dd></div>}</dl>
   <p>原出生记录与排盘钟表分别列出。缺时不补中午，跨日未定时不任取日柱。</p>
   {result.calendar.warnings.length>0&&<ul>{result.calendar.warnings.map((text,index)=><li key={index}>{text}</li>)}</ul>}
   {result.details.timeBasis&&<RawDetail label="展开时间换算原件与政策" value={result.details.timeBasis}/>}
  </div></details>
  <details><summary><span>02</span>经典原文与引用范围</summary><div className="bmc-disclosure-body">
   <p>原文转录与本项目推导分别呈现。月别条目只作初始参照，未代替整章条件与变例。</p>
   {quote?<article className="bmc-classic"><h4>{typeof ref?.title==='string'?ref.title:'固定月别初始条目'}</h4><blockquote>{classicDisplay(quote)}</blockquote><p className="bmc-source-locator">{typeof ref?.sourceLocator==='string'?ref.sourceLocator:''}</p>{Array.isArray(ref?.missing)&&<ul>{ref.missing.filter((item):item is string=>typeof item==='string').map((text,index)=><li key={index}>{text}</li>)}</ul>}<details><summary>查看原始转录条目</summary><pre>{quote}</pre></details></article>:<p>当前预览没有可展示的月别原句，未补写或摘造原文。</p>}
   <p>任注原句未随本预览返回。可从下方固定底本链接核对；计算轨迹中的解释属于项目表述。</p>
   {result.sources.filter(source=>source.role==='classical-principle'||source.role==='initial-reference').map(source=>{const url=safeSourceUrl(source.url);return <article className="bmc-reference" key={source.id}><h4>{sourceRoles[source.role]}</h4><p>{source.scope}</p>{url&&<a href={url} target="_blank" rel="noreferrer">查看固定底本 ↗</a>}</article>;})}
  </div></details>
  <details><summary><span>03</span>项目条件与计算轨迹</summary><div className="bmc-disclosure-body">
   <p>以下权重、门槛与作用次序属于项目规则；数值不是命局能量的实测值。</p>
   <ul>{result.assumptions.map((text,index)=><li key={index}>{text}</li>)}</ul>
   {main?<ol className="bmc-trace">{main.trace.map((item,index)=><li key={`${item.ruleId}-${index}`}><strong>{item.summary}</strong><small>{item.origin==='source-derived'?'资料事实 / 所引原则':'项目推导'}</small><RawDetail label={`展开第 ${index+1} 项条件与数值`} value={item}/></li>)}</ol>:<p>关键柱未定，本次未运行项目主链，没有计算轨迹。</p>}
   {main&&<RawDetail label="展开全部载体、根、生克边与分支检查" value={main.calculationTrace}/>}
   {result.details.originalMonthBranch&&<RawDetail label="展开默认月支路线的完整计算原件" value={result.details.originalMonthBranch}/>}
   {result.details.calendarEngineWarnings.length>0&&<details><summary>现有历法引擎附带说明</summary><p>这些是原引擎说明，不作为本次主链的取用意见。</p><ul>{result.details.calendarEngineWarnings.map((text,index)=><li key={index}>{text}</li>)}</ul></details>}
  </div></details>
  <details><summary><span>04</span>覆盖范围与来源登记</summary><div className="bmc-disclosure-body">
   <ul>{result.pending.filter(item=>item.code==='scope-not-implemented').map((item,index)=><li key={index}>{item.explanation}</li>)}</ul>
   <p>本次为一般取用的独立项目预览；完整传统格局裁决与姓名验局仍有待补范围。</p>
   <p className="bmc-version">方法：{result.method.id}<br/>预览：{result.schema}</p>
   <RawDetail label="展开来源版本、授权与固定文件标识" value={result.sources}/>
  </div></details>
 </div>;
}
export function PreviewPanelView({profile,state,onRun,onProposal,disabled=false,disabledReason,draftDirty=false,onEditBirth,id,feedbackId}:PreviewPanelViewProps) {
 const generatedId=useId(),panelId=id??`${generatedId}-preview`,feedback=feedbackId??`${generatedId}-feedback`,proposalId=`${generatedId}-proposal`,hintId=`${generatedId}-hint`,busy=state.phase==='loading';
 const missing=!profile.surname.trim()||!profile.birthDate;
 const result=!state.stale?state.result:null;
 const pending=result?.pending.filter(item=>item.code!=='scope-not-implemented'&&item.code!=='calendar-review')??[];
 const copy=result?statusCopy[result.status]:null;
 return <section id={panelId} className="bmc-preview panel" aria-labelledby={`${panelId}-heading`} aria-busy={busy}>
  <header className="bmc-header"><div><p className="bmc-eyebrow">独立取法 · 预览</p><h2 id={`${panelId}-heading`} tabIndex={-1}>一般取用主链预览</h2><p>从当前出生资料出发，逐层核对主方向、适用条件与资料依据。</p></div><span className="bmc-badge">项目规则候选</span></header>
  <div className="bmc-input-context"><span>{profile.surname.trim()||'待填写姓氏'}姓宝宝 · {profile.calendar==='lunar'?'农历':'公历'} {profile.birthDate||'待填写生日'}{profile.leapMonth?'（闰月）':''} · {profile.timeUnknown?'时刻未知':profile.birthTime||'待填写时刻'}</span><span>{draftDirty?'当前资料草稿':'当前出生资料'}</span></div>
  <div className="bmc-controls"><fieldset disabled={disabled||busy}><legend>选择本次预览入口</legend><p className="bmc-default">默认沿用月支入口</p><label className="bmc-proposal" htmlFor={proposalId}><input id={proposalId} type="checkbox" checked={state.proposal} onChange={event=>onProposal(event.target.checked)} aria-describedby={hintId}/><span><strong>同时试算月干入口</strong><small>独立项目提案 · 显式开启</small></span></label><p id={hintId} className="bmc-hint">开启后保留默认月支结果，并列比较两条路线。勾选后需重新预览。</p></fieldset>
   <div className="bmc-run"><button type="button" className="button primary" disabled={disabled||busy||missing} onClick={onRun} aria-describedby={hintId}>{busy?<><span className="bmc-loading-dot" aria-hidden="true"/>正在推导…</>:state.phase==='error'?'重试当前资料':state.result||state.stale?'按当前资料重新预览':'预览当前资料'}</button><p>预览结果尚未应用到起名方案。</p></div>
  </div>
  {disabled&&<p className="bmc-notice">{disabledReason||'请等待当前操作结束后再预览。'}</p>}
  {missing&&<div className="bmc-empty"><h3>先补齐姓氏与出生日期</h3><p>时辰不清楚时可明确标为未知，预览将保留待定范围。</p>{onEditBirth&&<button type="button" className="button secondary" onClick={onEditBirth}>填写出生资料</button>}</div>}
  {!missing&&state.phase==='idle'&&!state.stale&&<div className="bmc-empty"><h3>将一条取用思路，展开看清楚</h3><p>运行后先看定性意见，再按需展开时间记录、经典参照和项目计算依据。</p></div>}
  <div id={feedback} tabIndex={-1} className="bmc-feedback" role={state.phase==='error'?'alert':'status'} aria-live={state.phase==='error'?'assertive':'polite'} aria-atomic="true">
   {busy&&<p>正在按本次资料推导。出生资料与父母姓名草稿仍保留。</p>}
   {state.stale&&<p className="bmc-notice">资料或入口已改变，上次结果已失效。请按当前输入重新预览。</p>}
   {state.phase==='error'&&<div className="bmc-error"><h3>本次预览未完成</h3><p>{state.error}</p><p>请核对出生资料，或重试本次输入。</p>{onEditBirth&&<button type="button" className="button secondary" onClick={onEditBirth}>返回核对资料</button>}</div>}
   {state.phase==='ready'&&result&&copy&&<p>预览已完成：{copy.label}。结果与依据列在下方。</p>}
   {!busy&&state.phase!=='error'&&state.notice&&<p>{state.notice}</p>}
  </div>
  {result&&copy&&<div className="bmc-result">
   <div className={`bmc-result-heading bmc-result-${result.status}`}><div><span className="bmc-status-label">{copy.label}</span><h3>{copy.intro}</h3></div>{onEditBirth&&(result.status==='pending-calendar'||result.status==='invalid-input'||result.status==='provisional-missing-hour')&&<button type="button" className="button secondary" onClick={onEditBirth}>补充 / 核对资料</button>}</div>
   <div className="bmc-pillars" aria-label="本次已确定的四柱">{result.calendar.pillars.map(pillar=><div key={pillar.position}><span>{pillar.label}</span><strong>{pillar.gan&&pillar.zhi?`${pillar.gan}${pillar.zhi}`:'待定'}</strong></div>)}</div>
   {result.opinion&&<Direction opinion={result.opinion}/>}
   <ul className="bmc-summary-list">{result.headline.map((line,index)=><li key={index}>{line}</li>)}</ul>
   {pending.length>0&&<div className="bmc-pending"><h4>本次待补与待核对</h4><ul>{pending.map((item,index)=><li key={index}>{item.explanation}</li>)}</ul></div>}
   {result.conflicts.length>0&&<div className="bmc-conflicts"><h4>需要分开看的取法差异</h4><ul>{result.conflicts.map((item,index)=><li key={index}>{item.explanation}</li>)}</ul></div>}
   {result.entryComparison&&<section className="bmc-comparison" aria-label="月支与月干提案入口对照"><h3>同一份资料，两条入口并列核对</h3><p>{result.entryComparison.changed?'本次两条路线产生不同意见，保留各自条件。':'本次两条路线意见一致；这不表示两种入口普遍等同。'}</p><div><article><span className="bmc-comparison-label">默认路线 · 月支入口</span><Direction compact opinion={result.entryComparison.originalMonthBranch}/></article><article><span className="bmc-comparison-label">本次提案 · 月干入口</span><Direction compact opinion={result.entryComparison.selectedProposal}/></article></div></section>}
   <PreviewEvidence result={result}/>
  </div>}
 </section>;
}

/** Reads current drafts; never saves/replaces profile, analysis, preferences or history. */
export function PreviewPanel({profile,api,disabled=false,...rest}:PreviewPanelProps) {
 const latest=useRef({api,disabled});latest.current={api,disabled};
 const controller=useMemo(()=>createBaziMainchainPreviewController({previewBaziMainchain:(p,o)=>latest.current.api.previewBaziMainchain(p,o)},{isDisabled:()=>latest.current.disabled}),[]);
 const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot),feedbackId=`${useId()}-feedback`;
 useLayoutEffect(()=>{controller.activate();return()=>controller.dispose();},[controller]);
 useLayoutEffect(()=>controller.setContext(profile),[controller,profile]);
 useEffect(()=>{if(state.focusSerial>0)document.getElementById(feedbackId)?.focus();},[state.focusSerial,feedbackId]);
 return <PreviewPanelView {...rest} profile={profile} disabled={disabled} state={state} feedbackId={feedbackId} onRun={()=>void controller.run()} onProposal={controller.setProposal}/>;
}
