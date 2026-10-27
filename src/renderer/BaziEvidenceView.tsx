import React from 'react';
import type { BaziEvidenceAnalysis, BaziEvidenceRule, BaziEvidenceSource, BirthTimeAnalysis } from '../shared/types';
import { MonthAuthorityView, monthAuthorityStatusLabel } from './MonthAuthorityView';
import { MonthlySeasonalView } from './MonthlySeasonalView';
import { TraditionalTerms } from './TraditionalTerms';
import { SeasonalConditionsView } from './SeasonalConditionsView';
import { PatternEvidenceView } from './PatternEvidenceView';
import './bazi-evidence.css';

const opinionStatus = { candidate: '独立候选意见', pending: '信息不足 · 待复核', 'not-evaluated': '尚未启用' } as const;
const list = (items: string[]) => <ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul>;
const elements = (items: string[]) => items.length ? items.join('、') : '未提出';

function Source({ source }: { source: BaziEvidenceSource }) {
  const href = /^https:\/\//i.test(source.url) ? source.url : undefined;
  return <li><strong>{source.name}</strong><span>{source.id} · 版本 {source.revision}</span><span>定位 {source.locator}</span><span>{href ? <a href={href} target="_blank" rel="noreferrer">{source.url}</a> : source.url}</span>{source.note && <span>{source.note}</span>}</li>;
}

function Rule({ evidence, ruleId }: { evidence: BaziEvidenceAnalysis; ruleId: string }) {
  const rule = evidence.rules.find(item => item.id === ruleId);
  if (!rule) return <p className="bazi-evidence-version">记录的规则引用：{ruleId}；未附规则内容。</p>;
  return <details className="bazi-evidence-rule"><summary>规则条件与资料 · {rule.name}</summary><div><p className="bazi-evidence-version">{rule.id} / {rule.version}</p>{list(rule.conditions)}<ul className="bazi-evidence-sources">{rule.sourceIds.map(id => {
    const source = evidence.sources.find(item => item.id === id);
    return source ? <Source key={id} source={source}/> : <li key={id}>来源引用：{id}；未附来源记录。</li>;
  })}</ul></div></details>;
}

function Rules({ evidence, rules }: { evidence: BaziEvidenceAnalysis; rules: BaziEvidenceRule[] }) {
  return <div>{rules.map(rule => <Rule key={rule.id} evidence={evidence} ruleId={rule.id}/>)}</div>;
}

/** Presents the saved evidence only. It never creates an hour pillar or recalculates a historical chart. */
export function BaziEvidenceView({ evidence, timeBasis }: { evidence?: BaziEvidenceAnalysis; timeBasis?: BirthTimeAnalysis }) {
  if (!evidence && timeBasis?.dayStatus === 'uncertain') return <section className="panel bazi-evidence bazi-evidence-missing" aria-label="八字分层证据"><h2>八字分层证据</h2><p>日主待定，本项证据暂停。</p><p className="muted">所选排盘钟表的日期候选为 {timeBasis.dayCandidates.join('、')}；待补全出生时刻后再评估十神、喜用及格局条件。</p></section>;
  if (!evidence) return <section className="panel bazi-evidence bazi-evidence-missing" aria-label="八字分层证据"><h2>八字分层证据</h2><p>原方案未包含分层证据，请按出生资料重新分析后查看。</p><p className="muted">保留历史方案生成时的依据，不自动补算。</p></section>;
  const month = evidence.monthAuthority;
  const factRuleIds = new Set([...evidence.stems, ...evidence.hiddenStems].map(item => item.ruleId));
  const relationRuleIds = new Set(evidence.relations.map(item => item.ruleId));
  const monthlyRule = evidence.rules.find(rule => rule.id === evidence.monthlySeasonal?.ruleId);
  const monthlySourceIds = new Set([...(monthlyRule?.sourceIds ?? []), ...(evidence.monthlySeasonal?.cases.map(item => item.sourceId) ?? [])]);
  return <section className="panel bazi-evidence" aria-labelledby="bazi-evidence-heading">
    <header className="bazi-evidence-heading"><div><h2 id="bazi-evidence-heading">八字分层证据</h2><p>先读概览，再按需展开事实、条件与资料；不同方法的意见分别保留。</p></div><span className="tag">独立参考</span></header>
    <div className="bazi-evidence-context"><p><strong>日主 {evidence.dayMaster.stem} · {evidence.dayMaster.element}</strong><span>{evidence.timeBasis.timezone}</span></p><p>{evidence.timeBasis.description}</p>{evidence.timeBasis.timeUnknown && <p className="bazi-evidence-notice">出生时刻未知：只保留已确定的柱与事实，不生成缺失时柱。</p>}{evidence.timeBasis.ambiguous && <p className="bazi-evidence-notice">出生时刻存在歧义，请结合记录的区间与缺失信息复核。</p>}<p className="bazi-evidence-version">{evidence.profile} · 证据版本 {evidence.version}</p></div>

    <dl className="bazi-evidence-overview" aria-label="证据阅读概览"><div><dt>已记录事实</dt><dd>{evidence.stems.length} 条天干 · {evidence.hiddenStems.length} 条藏干</dd></div><div><dt>出现关系</dt><dd>{evidence.relations.length} 条 · 合化另核</dd></div><div><dt>月令司权</dt><dd>{monthAuthorityStatusLabel(month)}</dd></div></dl>
    <TraditionalTerms terms={['日主','藏干','透干','通根','月令','扶抑','调候','合化']} title="这些术语怎么看？ · 术语说明" context="先分清柱位事实、所选流派与项目启发式，再阅读各项意见。"/>

    <MonthAuthorityView month={month}><Rule evidence={evidence} ruleId={month.ruleId}/></MonthAuthorityView>

    <div className="bazi-evidence-opinions" aria-label="扶抑与季节意象独立意见">{evidence.opinions.map((opinion, index) => <article className="bazi-evidence-opinion" key={`${opinion.method}-${index}`}><div className="bazi-evidence-section-heading"><h3>{opinion.method === 'fuyi' ? '扶抑初筛' : '季节意象 · 非完整调候'}</h3><span>{opinionStatus[opinion.status]}</span></div><p className="bazi-evidence-method">{opinion.profile}</p><p className="bazi-evidence-elements">用字参考 <strong>{elements(opinion.elements)}</strong></p>{opinion.unfavorable.length > 0 && <p>本方法不优先：{opinion.unfavorable.join('、')}</p>}<details className="bazi-evidence-opinion-details"><summary>查看本次依据与限制</summary><h4>本次依据</h4>{list(opinion.evidence)}{opinion.missing.length > 0 && <div className="bazi-evidence-missing-info"><h4>待补与限制</h4>{list(opinion.missing)}</div>}</details><p className="bazi-evidence-review">需人工复核；各方法分别呈现，不合成为唯一喜用神，不改变候选姓名评分。</p><Rule evidence={evidence} ruleId={opinion.ruleId}/></article>)}</div>

    <MonthlySeasonalView analysis={evidence.monthlySeasonal} rule={monthlyRule} sources={evidence.sources.filter(source => monthlySourceIds.has(source.id))}/>
    <SeasonalConditionsView evidence={evidence.seasonalConditions} sources={evidence.sources.filter(source => evidence.seasonalConditions?.rules.some(rule => rule.sourceIds.includes(source.id)))}/>
    <PatternEvidenceView evidence={evidence.patternEvidence} sources={evidence.sources.filter(source => evidence.patternEvidence?.rules.some(rule => rule.sourceIds.includes(source.id)))}/>

    <details className="bazi-evidence-facts"><summary>藏干、十神与生克事实 · {evidence.stems.length} 条天干 / {evidence.hiddenStems.length} 条藏干</summary><div className="bazi-evidence-detail-body"><p>以本次日主为参照，记录固定表中的属性及关系。</p><div className="bazi-evidence-table-wrap"><table><thead><tr><th>位置</th><th>天干 / 藏干</th><th>五行</th><th>十神</th><th>相对日主的关系</th></tr></thead><tbody>{evidence.stems.map((fact, index) => <tr key={`stem-${index}`}><td>{fact.pillar}</td><td>{fact.stem}</td><td>{fact.element}</td><td>{fact.tenGod}</td><td>{fact.relationToDay}</td></tr>)}{evidence.hiddenStems.map((fact, index) => <tr key={`hidden-${index}`}><td>{fact.pillar} · {fact.branch}藏干</td><td>{fact.stem}</td><td>{fact.element}</td><td>{fact.tenGod}</td><td>{fact.relationToDay}</td></tr>)}</tbody></table></div><Rules evidence={evidence} rules={evidence.rules.filter(rule => factRuleIds.has(rule.id))}/></div></details>

    <details className="bazi-evidence-facts"><summary>天干地支关系 · {evidence.relations.length} 条</summary><div className="bazi-evidence-detail-body"><p className="bazi-evidence-notice">记录组合、冲害关系的存在；合关系不等于已经化气成格。三合、三会仅列齐全字组，未将半合当成完整组合。</p>{evidence.relations.length ? <ul className="bazi-evidence-relations">{evidence.relations.map((relation, index) => <li key={index}><strong>{relation.label}</strong><p>{relation.subjects.join('、')} · {relation.pillars.join('、')}{relation.candidateElement ? ` · 所指五行 ${relation.candidateElement}（未判定化气）` : ''}</p>{list(relation.evidence)}<small>规则 {relation.ruleId}</small></li>)}</ul> : <p>本次已记录的柱未触发所核查的关系。</p>}<Rules evidence={evidence} rules={evidence.rules.filter(rule => relationRuleIds.has(rule.id))}/></div></details>

    <details className="bazi-evidence-facts"><summary>{evidence.patternEvidence ? '旧通用格局与合化的未启用范围' : '从格与合化的评估范围'}</summary><div className="bazi-evidence-detail-body"><p>{evidence.patternEvidence ? '此处保留原通用接口的未启用范围；上方限定月别原句的支持与反证单独记录，不互相覆盖。' : '以下状态记录本次是否启用专门判断；待补条件需逐项确认。'}</p>{evidence.patternCandidates.map((candidate, index) => <article className="bazi-evidence-scope" key={`pattern-${index}`}><h4>{candidate.name}<span>{candidate.status === 'not-evaluated' ? '未评估' : '候选 · 待确认'}</span></h4>{candidate.supportedBy.length > 0 && <><p>支持证据</p>{list(candidate.supportedBy)}</>}{candidate.opposedBy.length > 0 && <><p>反对证据</p>{list(candidate.opposedBy)}</>}{candidate.missing.length > 0 && <><p>未评估原因 / 待补信息</p>{list(candidate.missing)}</>}</article>)}{evidence.transformationEvidence.map((candidate, index) => <article className="bazi-evidence-scope" key={`transformation-${index}`}><h4>{candidate.subjects.join('、')} · 合化条件<span>{candidate.status === 'not-evaluated' ? '未评估' : '候选 · 待确认'}</span></h4>{candidate.candidateElement && <p>关系所指五行：{candidate.candidateElement}</p>}{candidate.supportedBy.length > 0 && <><p>支持证据</p>{list(candidate.supportedBy)}</>}{candidate.opposedBy.length > 0 && <><p>反对证据</p>{list(candidate.opposedBy)}</>}{candidate.missing.length > 0 && <><p>未评估原因 / 待补信息</p>{list(candidate.missing)}</>}<p className="bazi-evidence-version">规则 {candidate.ruleId}</p></article>)}</div></details>

    <details className="bazi-evidence-facts bazi-evidence-provenance"><summary>本次规则与完整资料来源</summary><div className="bazi-evidence-detail-body"><p className="bazi-evidence-version">{evidence.profile} / {evidence.version}</p>{evidence.rules.map(rule => <div className="bazi-evidence-catalog-rule" key={rule.id}><h4>{rule.name}</h4><p className="bazi-evidence-version">{rule.id} / {rule.version} · 来源 {rule.sourceIds.join('、')}</p>{list(rule.conditions)}</div>)}<ul className="bazi-evidence-sources">{evidence.sources.map(source => <Source key={source.id} source={source}/>)}</ul></div></details>
    {evidence.limitations.length > 0 && <details className="bazi-evidence-facts bazi-evidence-limitations"><summary>本次适用范围与限制</summary><div className="bazi-evidence-detail-body">{list(evidence.limitations)}</div></details>}
  </section>;
}
