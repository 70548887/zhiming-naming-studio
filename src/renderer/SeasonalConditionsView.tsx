import React from 'react';
import type { BaziEvidenceSource, SeasonalConditionCheck, SeasonalConditionEvidence } from '../shared/types';
import { classicDisplay } from '../shared/classic-display';
import './seasonal-conditions.css';

export function seasonalConditionLabel(check: SeasonalConditionCheck): string {
  if (check.scope === 'partial-prerequisite') return { met: '仅时间前提满足 · 原句未裁决', 'not-met': '时间前提未满足 · 原句未裁决', uncertain: '时间前提区间不确定 · 原句未裁决', 'not-evaluated': '时间前提未评估 · 原句未裁决' }[check.status];
  return { met: '限定透藏事实满足', 'not-met': '限定透藏事实未满足', uncertain: '限定透藏事实不确定', 'not-evaluated': '限定透藏事实未评估' }[check.status];
}

/** An independent recorded supplement; it never changes the original monthly branch verdict. */
export function SeasonalConditionsView({ evidence, sources = [] }: { evidence?: SeasonalConditionEvidence; sources?: BaziEvidenceSource[] }) {
  if (!evidence) return null;
  return <section className="seasonal-conditions" aria-label="逐月原文条件补充核对"><header><div><h3>逐月原文条件补充核对</h3><p>单独记录已整理的事实谓词或局部时间前提，不覆盖上方原始分支结论。</p></div><span>{evidence.status === 'not-selected' ? '未启用' : evidence.status === 'pending' ? '待核对' : '已记录补充依据'}</span></header>
    <p className="seasonal-conditions-boundary">“时间前提满足”只说明处于所选节气区间；“限定透藏事实满足”只对应声明的柱位事实。不等于桂花、桂蕊、火炽、旺弱或整条调候原句已经成立，也不推导原文后半的成就断言。未实现因素仍保留待审。</p>
    {evidence.checks.length ? <div className="seasonal-condition-list">{evidence.checks.map(check => <details key={check.id} className={`seasonal-condition ${check.scope}`}><summary><strong>{check.dayMaster}日 · {check.monthBranch}月</strong><span>{seasonalConditionLabel(check)}</span></summary><div><p className="seasonal-condition-predicate">{check.predicateDescription}</p><h4>历史原文（含旧时断语，不作软件结论）</h4><p className="seasonal-condition-locator">仅去除排版标记，保留原句；状态不作用于原文后半的成就断言。</p><blockquote>{classicDisplay(check.sourceQuote)}</blockquote><p className="seasonal-condition-locator">来源 {check.sourceId} · {check.sourceLocator}<br/>条目 {check.caseId}{check.conditionId ? ` · 原分支 ${check.conditionId}` : ''} · 核查 {check.id}</p>
      {check.doesNotResolveOriginalBranch && <p className="seasonal-condition-unresolved">此项不裁决原分支；原句中的其他条件仍须独立核对。</p>}
      {check.observations.map((observation, index) => <article className="seasonal-condition-observation" key={index}><h4>可能瞬间区间（UTC）</h4><p>{observation.startAt}<br/>至 {observation.endAt}</p><p>{observation.result === 'met' ? '本区间满足所核前提' : observation.result === 'not-met' ? '本区间未满足所核前提' : '本区间尚不确定'}</p>{observation.fromTermAt && <p className="seasonal-condition-locator">起节瞬间 {observation.fromTermAt}</p>}{observation.toTermAt && <p className="seasonal-condition-locator">止节瞬间 {observation.toTermAt}</p>}<ul>{observation.evidence.map((item, i) => <li key={i}>{item}</li>)}</ul></article>)}
      {check.missing.length > 0 && <div className="seasonal-condition-unresolved"><h4>其余未核与缺失信息</h4><ul>{check.missing.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
    </div></details>)}</div> : <p>{evidence.status === 'not-selected' ? '未选择逐月资料取法，本项不核对。' : '当前条目没有本版已整理的补充条件，不能以此推断其他原句已成立。'}</p>}
    {evidence.rules.length > 0 && <details className="seasonal-condition-rules"><summary>补充规则与来源</summary>{evidence.rules.map(rule => <article key={rule.id}><h4>{rule.name}</h4><p className="seasonal-condition-locator">{rule.id} / {rule.version}</p><ul>{rule.conditions.map((condition, index) => <li key={index}>{condition}</li>)}</ul><p className="seasonal-condition-locator">来源 {rule.sourceIds.join('、')}</p></article>)}{sources.map(source => <article key={source.id}><h4>{source.name}</h4><p className="seasonal-condition-locator">{source.id} · {source.revision}<br/>{source.locator}</p>{source.url && <p className="seasonal-condition-locator">{/^https:\/\//i.test(source.url) ? <a href={source.url} target="_blank" rel="noreferrer">{source.url}</a> : source.url}</p>}</article>)}</details>}
    {evidence.warnings.length > 0 && <ul className="seasonal-condition-warnings">{evidence.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
    <p className="seasonal-condition-locator">{evidence.profile} / {evidence.version}</p>
  </section>;
}
