import React from 'react';
import type { BaziEvidenceSource, FollowingPatternCheck, FollowingPatternCriterion, FollowingPatternEvidence } from '../shared/types';
import { classicDisplay } from '../shared/classic-display';
import './pattern-evidence.css';

export const followingPatternStatusLabel = (check: FollowingPatternCheck): string => check.applicability === 'not-applicable' ? '不适用 · 未评估' : ({ candidate: '字面条件候选 · 供人工复核', pending: '条件待核', contradicted: '与本条必要条件不符', 'not-evaluated': '本条未评估' }[check.status]);
const resultLabels = { met: '已知事实符合', 'not-met': '已知事实不符', unknown: '资料不足 · 未知', 'not-implemented': '取法尚未实现' } as const;
const roleLabels = { necessary: '本条必要条件', support: '支持条件', exception: '本条反对因素' } as const;
const list = (items: string[]) => <ul>{items.map((item, index) => <li key={index}>{classicDisplay(item)}</li>)}</ul>;
function Criterion({ criterion }: { criterion: FollowingPatternCriterion }) {
  const qualifiedOut=criterion.contributesToVerdict===false;
  const opposition = !qualifiedOut&&(criterion.role === 'exception' ? criterion.result === 'met' : criterion.role === 'necessary' && criterion.result === 'not-met');
  const support = !qualifiedOut&&criterion.role !== 'exception' && criterion.result === 'met';
  const decisionRole=criterion.decisionUse==='rejection-premise'?'否定分支的依赖前提':criterion.decisionUse==='rejection-signal'?'否定分支的局部信号':criterion.decisionUse==='support-only'?'仅作支持事实':roleLabels[criterion.role];
  return <article className={`pattern-criterion ${opposition ? 'opposed' : support ? 'supported' : 'pending'}`}>
    <header><div><h5>{criterion.name}</h5><p>{decisionRole}</p></div><span>{qualifiedOut?`局部事实：${resultLabels[criterion.result]}`:resultLabels[criterion.result]}</span></header>
    <blockquote>{classicDisplay(criterion.sourceQuote)}</blockquote><p className="pattern-evidence-locator">{criterion.sourceLocator}<br/>条件 {criterion.id} · 作用域 {criterion.scope}</p>
    {qualifiedOut&&<p className="pattern-criterion-qualification">只核局部事实，整句尚未裁决；该观察不作为当前路径的完整反证，须先核齐依赖前提。</p>}
    {criterion.observedEvidence.length > 0 && <div className="pattern-criterion-facts"><h6>{opposition ? '针对本条的反对事实' : support ? '支持这项字面条件的事实' : '已观察事实'}</h6>{list(criterion.observedEvidence)}</div>}
    {criterion.missing.length > 0 && <div className="pattern-criterion-missing"><h6>缺失资料或未实现取法</h6>{list(criterion.missing)}</div>}
    {(criterion.qualificationMissing?.length??0)>0&&<div className="pattern-criterion-missing"><h6>依赖条件尚未齐备</h6>{list(criterion.qualificationMissing!)}</div>}
    {criterion.result === 'unknown' && <p className="pattern-criterion-note">已知柱未见不证明全局没有；不补时柱或推定无根。</p>}
    {opposition && <p className="pattern-criterion-note">反证仅限本条明确条件，不泛化为全部从格或其他流派均不成立。</p>}
  </article>;
}

/** Reads only saved clause-specific evidence and does not turn a candidate into a confirmed pattern. */
export function PatternEvidenceView({ evidence, sources = [] }: { evidence?: FollowingPatternEvidence; sources?: BaziEvidenceSource[] }) {
  if (!evidence) return <section className="pattern-evidence pattern-evidence-legacy" aria-label="从格原句证据"><h3>从格原句证据 · 本版未记录</h3><p>原方案未保存本项支持、反证和条件清单；保留旧通用范围，不补入当前取法或重新定格。</p></section>;
  const active = evidence.checks.filter(check => check.applicability !== 'not-applicable' && check.criteria.length > 0);
  const inactive = evidence.checks.filter(check => !active.includes(check));
  return <section className="pattern-evidence" aria-labelledby="pattern-evidence-heading"><header className="pattern-evidence-heading"><div><h3 id="pattern-evidence-heading">从格原句证据</h3><p>只核对所选月别原句中的明确条件，逐项分开支持、反对与缺失。</p></div><span>限定原句 · 人工复核</span></header>
    <p className="pattern-evidence-boundary">候选仅是字面条件的人工复核入口，不是真从或充分成格结论。“与本条必要条件不符”只反对指定原句的必要条件，不代表所有从格、其他原句或流派都被否定。</p>
    <dl className="pattern-evidence-overview"><div><dt>当前适用或可能路径</dt><dd>{active.length} 条</dd></div><div><dt>字面候选</dt><dd>{active.filter(check => check.status === 'candidate').length} 条</dd></div><div><dt>必要条件反证</dt><dd>{active.filter(check => check.status === 'contradicted').length} 条</dd></div></dl>
    {active.map(check => {
      const sourceContext=check.missing.filter(item=>item.startsWith('原文背景尚需对读：'));
      const outstanding=check.missing.filter(item=>!item.startsWith('原文背景尚需对读：'));
      return <article className={`pattern-evidence-check ${check.status}`} key={check.id}>
      <header><h4>{check.name}</h4><span>{followingPatternStatusLabel(check)}</span></header><p className="pattern-evidence-applicability">{check.applicability === 'possible' ? '当前月支仍待定：只保留可能路径，不据此定格。' : '当前日干与月支在本条所选范围内。'}</p><p>{check.statusExplanation}</p>
      {check.candidateBasis === 'literal-clause-only' && <p className="pattern-evidence-candidate-note">仅软件字面结构，未裁定原典成立。</p>}
      <details className="pattern-evidence-context"><summary>原句与适用背景（历史引文，不作软件结论）</summary><div><blockquote>{classicDisplay(check.sourceQuote)}</blockquote><p className="pattern-evidence-locator">来源 {check.sourceId || '未附来源'} · {check.sourceLocator}</p><p>仅移除排版标记，保留原字。原文中的财富、婚姻、成就等旧时断语只作引文，不由软件推导。</p>{sourceContext.length>0&&<section className="pattern-evidence-historical-context"><h5>背景原文对读 · 尚未核定</h5>{sourceContext.map((item,index)=><blockquote key={index}>{classicDisplay(item)}</blockquote>)}</section>}</div></details>
      <div className="pattern-evidence-triad"><section><h5>支持</h5>{check.supportedBy.length ? list(check.supportedBy) : <p>本次未记录支持事实。</p>}</section><section><h5>反对</h5>{check.opposedBy.length ? list(check.opposedBy) : <p>本次未记录明确反证；不等于已证明成格。</p>}</section><section><h5>缺失与待审</h5>{outstanding.length ? list(outstanding) : <p>保留人工复核，不以空清单宣称充分成立。</p>}{sourceContext.length>0&&<p>另有 {sourceContext.length} 条历史背景对读，见上方“原句与适用背景”；尚未据此裁决。</p>}</section></div>
      <details className="pattern-evidence-criteria"><summary>逐项条件、事实范围与依据 · {check.criteria.length} 项</summary><div>{check.criteria.map(criterion => <Criterion key={criterion.id} criterion={criterion}/>)}</div></details>
      {check.decisionBranches&&check.decisionBranches.length>0&&<details className="pattern-evidence-decision-branches"><summary>否定分支的依赖前提与局部信号 · {check.decisionBranches.length} 条</summary><div>{check.decisionBranches.map(branch=><article className="pattern-decision-branch" key={branch.id}><header><h5>{branch.name}</h5><span>{{rejected:'本分支指定否定条件已触发',pending:'前提未齐 · 整句尚未裁决','not-triggered':'未触发本分支的指定否定条件','not-evaluated':'本分支未评估'}[branch.status]}</span></header><blockquote>{classicDisplay(branch.sourceQuote)}</blockquote><p className="pattern-evidence-locator">{branch.sourceLocator}<br/>分支 {branch.id}</p><div className="pattern-decision-dependencies"><section><h6>必须先核对的前提</h6><ul>{branch.premiseCriterionIds.map(id=><li key={id}>{check.criteria.find(item=>item.id===id)?.name||id}<small>{id}</small></li>)}</ul></section><section><h6>本分支引用的局部信号</h6><ul>{branch.signalCriterionIds.map(id=><li key={id}>{check.criteria.find(item=>item.id===id)?.name||id}<small>{id}</small></li>)}</ul></section></div>{branch.observedEvidence.length>0&&<><h6>本次观察与依赖核对</h6>{list(branch.observedEvidence)}</>}{branch.missing.length>0&&<div className="pattern-criterion-missing"><h6>尚未核定</h6>{list(branch.missing)}</div>}{branch.doesNotResolveClause&&<p className="pattern-criterion-qualification">此分支只保留其局部条件状态，不裁决整条从杀原句，也不改变从财或其他路径的结论。</p>}</article>)}</div></details>}
      <p className="pattern-evidence-locator">路径 {check.id} · 格别 {check.pattern} · 必须人工复核</p>
    </article>;})}
    {!active.length && <p className="pattern-evidence-no-active">当前日干、月支没有本版可执行的适用路径；不从相邻月份借用条件，也不把未评估当作已排除从格。</p>}
    {inactive.length > 0 && <div className="pattern-evidence-inactive"><h4>本版其他范围</h4><ul>{inactive.map(check => <li key={check.id}><strong>{check.name}</strong><span>{followingPatternStatusLabel(check)}</span><p>{check.statusExplanation}</p></li>)}</ul><p>这些项目未在当前路径评估；适用与来源边界见下方取法说明，不展开无关条件冒充本盘证据。</p></div>}
    <details className="pattern-evidence-provenance"><summary>本项取法、版本与资料来源</summary><div><p className="pattern-evidence-locator">{evidence.profile} / {evidence.version}</p>{evidence.rules.map(rule => <article key={rule.id}><h4>{rule.name}</h4><p className="pattern-evidence-locator">{rule.id} / {rule.version}</p>{list(rule.conditions)}<p className="pattern-evidence-locator">来源 {rule.sourceIds.join('、')}</p></article>)}{sources.map(source => <article key={source.id}><h4>{source.name}</h4><p className="pattern-evidence-locator">{source.id} · {source.revision}<br/>{source.locator}</p>{source.url && <p className="pattern-evidence-locator">{/^https:\/\//i.test(source.url) ? <a href={source.url} target="_blank" rel="noreferrer">{source.url}</a> : source.url}</p>}{source.note && <p>{source.note}</p>}</article>)}</div></details>
    {evidence.limitations.length > 0 && <div className="pattern-evidence-limitations"><h4>适用范围与限制</h4>{list(evidence.limitations)}</div>}
  </section>;
}
