import React from 'react';
import type { BaziEvidenceRule, BaziEvidenceSource, MonthlySeasonalAnalysis, MonthlySeasonalCondition, MonthlySeasonalUse } from '../shared/types';
import { classicDisplay } from '../shared/classic-display';
import { TraditionalTerms } from './TraditionalTerms';
import './monthly-seasonal.css';

const analysisStatus = { 'not-selected': '未启用', 'initial-reference': '原文初步参考', 'conditions-reviewed': '部分条件已核对', pending: '待核对 · 暂不应用' } as const;
const conditionStatus = { met: '满足已实现条件', 'not-met': '未满足已实现条件', unknown: '资料不足 · 未知', 'not-implemented': '该条件尚未实现' } as const;
const useRole = { first: '原文先用', support: '原文辅用', parallel: '原文并列', unranked: '原文未定先后' } as const;
const list = (items: string[]) => <ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul>;

function Uses({ uses, conditional = false }: { uses: MonthlySeasonalUse[]; conditional?: boolean }) {
  if (!uses.length) return <p className="monthly-seasonal-empty">{conditional ? '本分支未提取可明确识别的取用；保留原句供复核。' : '本条未提取可明确识别的主辅顺序；保留原文供复核。'}</p>;
  return <ol className="monthly-seasonal-uses">{uses.map((use, index) => <li key={`${use.sequence}-${use.stem}-${index}`}><div className="monthly-seasonal-use-title"><strong>{use.stem} · {use.element}</strong><span>{useRole[use.role]} · 原文序 {use.sequence}</span></div><blockquote>{classicDisplay(use.quote)}</blockquote></li>)}</ol>;
}

function Branch({ branch }: { branch: MonthlySeasonalCondition }) {
  return <details className={`monthly-seasonal-branch ${branch.result}`}><summary><span>{conditionStatus[branch.result]}</span><small>{branch.id}</small></summary><div className="monthly-seasonal-branch-body"><h5>条件原句（去除排版标记）</h5><blockquote>{classicDisplay(branch.sourceQuote)}</blockquote><p className="monthly-seasonal-locator">{branch.sourceLocator}</p>
    {branch.proposedUses.length > 0 && <><h5>该原句所述取用 · 须连同条件阅读</h5><Uses uses={branch.proposedUses} conditional/></>}
    {branch.observedEvidence.length > 0 && <><h5>本次已核对事实</h5>{list(branch.observedEvidence)}</>}
    {branch.missing.length > 0 && <div className="monthly-seasonal-unresolved"><h5>未核或缺失条件</h5>{list(branch.missing)}</div>}
    <p className="monthly-seasonal-condition-scope">此状态只对应上方已实现的条件，不能代替旺弱、从格、合化或全部调候条件的裁决。</p>
  </div></details>;
}

function Provenance({ rule, sources }: { rule?: BaziEvidenceRule; sources: BaziEvidenceSource[] }) {
  if (!rule && !sources.length) return null;
  return <details className="bazi-evidence-facts monthly-seasonal-provenance"><summary>本项规则条件与资料版本</summary><div className="bazi-evidence-detail-body">{rule && <><h4>{rule.name}</h4><p className="monthly-seasonal-locator">{rule.id} / {rule.version}</p>{list(rule.conditions)}</>}{sources.map(source => <article key={source.id}><h4>{source.name}</h4><p className="monthly-seasonal-locator">{source.id} · 版本 {source.revision}<br/>{source.locator}</p>{source.url && <p className="monthly-seasonal-locator">{/^https:\/\//i.test(source.url) ? <a href={source.url} target="_blank" rel="noreferrer">{source.url}</a> : source.url}</p>}{source.note && <p>{source.note}</p>}</article>)}</div></details>;
}

/** Shows the saved current-case extract, never reads a live table or expands old snapshots. */
export function MonthlySeasonalView({ analysis, rule, sources = [] }: { analysis?: MonthlySeasonalAnalysis; rule?: BaziEvidenceRule; sources?: BaziEvidenceSource[] }) {
  if (!analysis) return <section className="monthly-seasonal monthly-seasonal-legacy" aria-label="逐月调候资料参考"><div className="bazi-evidence-section-heading"><h3>逐月调候资料参考</h3><span>本版未记录</span></div><p>这份历史方案未记录逐月调候资料意见，保留原有扶抑与季节意象；不会补入当前资料或重新推算。</p></section>;
  const selected = analysis.status !== 'not-selected';
  const counts = (['met', 'not-met', 'unknown', 'not-implemented'] as const).map(result => ({ result, count: analysis.cases.reduce((count, item) => count + item.conditionBranches.filter(branch => branch.result === result).length, 0) }));
  return <section className={`monthly-seasonal ${selected ? 'selected' : 'not-selected'}`} aria-label="逐月调候资料参考">
    <header className="monthly-seasonal-heading"><div><h3>逐月调候资料参考</h3><p>与扶抑、粗粒度季节意象并列保留，按所选原文逐条核对。</p></div><span>{analysisStatus[analysis.status]}</span></header>
    <div className="monthly-seasonal-method"><strong>{selected ? '《穷通宝鉴》固定修订 · 当前条目' : '未启用逐月资料取法'}</strong><p>日主 {analysis.dayMaster} · 月支 {analysis.monthBranches.join('、') || '未定'}</p><p className="monthly-seasonal-locator">{analysis.methodId} · {analysis.version}</p></div>
    <p className="monthly-seasonal-notice">{analysis.status === 'pending' ? '出生月份或当前资料仍待核对；各条目只作原文对读，暂不应用其中的取用。' : selected ? '初步取用和条件分支均是所选资料的独立意见；原文顺序不等于无条件的喜用顺序。' : '当前未选择逐月调候资料，不计算该资料的取用。'}需人工复核，不合成为唯一喜用神，不改变候选姓名评分。</p>
    <TraditionalTerms terms={['透干','藏干','通根','调候']} context="本项只解释原文取用与已实现的事实条件；未见、未知与未实现要分别阅读。"/>
    {selected && <>
      <p className="monthly-seasonal-proposals">本项提出的五行：<strong>{analysis.proposedElements.join('、') || '暂未提出'}</strong><span>仅供本项参考，未并入系统扶抑或名字排序。</span></p>
      {analysis.cases.length > 0 && <dl className="monthly-seasonal-counts" aria-label="条件核对概览">{counts.map(({ result, count }) => <div key={result}><dt>{conditionStatus[result]}</dt><dd>{count} 条</dd></div>)}</dl>}
      {analysis.cases.map((item, index) => <article className="monthly-seasonal-case" key={`${item.dayMaster}-${item.monthBranch}-${index}`}><header><h4>{item.dayMaster}日 · {item.monthBranch}月</h4><span>{item.reviewStatus === 'needs-review' ? '提取有歧义 · 待审' : '初步条目 · 待复核'}</span></header><p className="monthly-seasonal-locator">来源 {item.sourceId}<br/>{item.sourceLocator}</p>
        <h5>原文初提的主辅取用</h5><Uses uses={item.initialUses}/>
        {item.unresolved.length > 0 && <div className="monthly-seasonal-unresolved"><h5>本条尚未核定</h5>{list(item.unresolved)}</div>}
        <details className="bazi-evidence-facts monthly-seasonal-source-text"><summary>查看初始取用原段（去除排版标记）</summary><div className="bazi-evidence-detail-body"><blockquote>{classicDisplay(item.sourceQuote)}</blockquote><p className="monthly-seasonal-locator">{item.sourceLocator}</p><p>仅移除标题、粗斜体排版标记，保留原字；本段未表示已覆盖该章的全部后续条件。</p></div></details>
        {item.conditionBranches.length > 0 && <details className="bazi-evidence-facts monthly-seasonal-conditions"><summary>条件分支 · {item.conditionBranches.length} 条，逐句核对</summary><div className="bazi-evidence-detail-body"><p>“满足/未满足”只针对已明确实现的事实条件；未知和未实现分开记录，原文中的旺、弱、多、从化等不以自编阈值替代。</p>{item.conditionBranches.map(branch => <Branch key={branch.id} branch={branch}/>)}</div></details>}
        {item.stemFacts.length > 0 && <details className="bazi-evidence-facts monthly-seasonal-stem-facts"><summary>用于核对的透干与藏干事实</summary><div className="bazi-evidence-detail-body"><p>资料不全时“未见”不等于“无”；这里只列已确定柱中的位置，不推定缺失时柱。</p><div className="monthly-seasonal-table-wrap"><table><thead><tr><th>天干</th><th>明干位置</th><th>藏干位置</th><th>日主 / 缺失说明</th></tr></thead><tbody>{item.stemFacts.map((fact, factIndex) => <tr key={`${fact.stem}-${factIndex}`}><th scope="row">{fact.stem}</th><td>{fact.exposedPositions.join('、') || '已知柱未见'}</td><td>{fact.hiddenPositions.join('、') || '已知柱未见'}</td><td>{fact.dayMasterSame ? '与日主相同；' : ''}{fact.absence === 'unknown' ? '缺失柱仍可能出现，不能判无' : '仅说明已核对范围的出现情况'}</td></tr>)}</tbody></table></div></div></details>}
      </article>)}
      {!analysis.cases.length && <p className="monthly-seasonal-empty">当前尚无可定位条目，保留待核对状态，不从相近月份借用取用。</p>}
    </>}
    {analysis.limitations.length > 0 && <details className="bazi-evidence-facts monthly-seasonal-limits"><summary>本项适用范围与未核因素</summary><div className="bazi-evidence-detail-body">{list(analysis.limitations)}</div></details>}
    <Provenance rule={rule} sources={sources}/>
    <p className="monthly-seasonal-locator">记录规则 {analysis.ruleId}</p>
  </section>;
}
