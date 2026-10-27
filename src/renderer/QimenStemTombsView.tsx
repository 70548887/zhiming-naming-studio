import React from 'react';
import type { QimenChart } from '../shared/types';
import './qimen-stem-tombs.css';

const palaceNames: Record<number, string> = { 1: '坎一宫', 2: '坤二宫', 3: '震三宫', 4: '巽四宫', 5: '中五宫', 6: '乾六宫', 7: '兑七宫', 8: '艮八宫', 9: '离九宫' };
const roleNames = { principal: '主干', lodged: '随芮寄干' } as const;
const statuses = { matched: '命中所选表位置', 'not-matched': '未命中所选表位置', 'not-directly-observed': '未直接观测' } as const;

/** A separate saved rule profile; it never changes existing palace marks or the old three-stem checks. */
export function QimenStemTombsView({ chart }: { chart: QimenChart }) {
  if (!chart.available) return null;
  const data = chart.stemTombs;
  if (!data) return <section className="panel qimen-stem-tombs qimen-stem-tombs-missing" aria-label="十干墓库独立参考"><h2>十干墓库 · 独立表参考</h2><p>此历史盘未记录本表核查，保留原三奇与盘层结构，不补入当前规则。</p></section>;
  const matched = data.checks.filter(check => check.status === 'matched').length;
  const unobserved = data.checks.filter(check => check.status === 'not-directly-observed').length;
  return <section className="panel qimen-stem-tombs" aria-labelledby="qimen-stem-tombs-heading">
    <header><div><h2 id="qimen-stem-tombs-heading">十干墓库 · 独立表参考</h2><p>只检查本盘实际可见的天盘主干与随芮寄干，保留所选电子表的墓支和目标宫。</p></div><span className="tag">单独规则口径</span></header>
    <p className="qimen-stem-tombs-boundary">本表乙取戌、乾六宫；原有三奇模块乙取坤二宫。两种读法分别保留，不能混用或据此声称名字已经通过完整奇门验局。</p>
    <dl className="qimen-stem-tombs-overview"><div><dt>逐干核查</dt><dd>{data.checks.length} 项</dd></div><div><dt>命中干项</dt><dd>{matched} 项 · {data.findings.length} 条位置</dd></div><div><dt>未直接观测</dt><dd>{unobserved} 项</dd></div></dl>
    <details className="qimen-stem-tombs-table"><summary>查看所选墓支与目标宫全表</summary><div className="qimen-stem-tombs-table-scroll"><table><thead><tr><th>天干</th><th>墓支</th><th>目标宫</th><th>本盘核查状态</th></tr></thead><tbody>{data.checks.map(check => <tr key={check.stem}><th scope="row">{check.stem}</th><td>{check.targetBranch}</td><td>{palaceNames[check.targetPalace] || `${check.targetPalace}宫`}</td><td>{statuses[check.status]}</td></tr>)}</tbody></table></div></details>
    <div className="qimen-stem-tomb-checks">{data.checks.map(check => {
      const findings = data.findings.filter(finding => finding.stem === check.stem && finding.ruleId === check.ruleId);
      return <details className={`qimen-stem-tomb-check ${check.status}`} key={check.stem}><summary><strong>{check.stem} · {check.targetBranch}墓 · {palaceNames[check.targetPalace] || `${check.targetPalace}宫`}</strong><span>{statuses[check.status]}</span></summary><div>
        {check.observations.length > 0 ? <p>实际观测：{check.observations.map(observation => `${palaceNames[observation.palace] || `${observation.palace}宫`}（${roleNames[observation.role]}）`).join('；')}</p> : <p>本盘未直接显示此天干；不把遁仪或其他干任意替换为它。</p>}
        {findings.map((finding, index) => <article key={index}><h4>{finding.stem} · {palaceNames[finding.palace] || `${finding.palace}宫`} · {roleNames[finding.role]}</h4><ul>{finding.evidence.map((item, i) => <li key={i}>{item}</li>)}</ul><p className="qimen-stem-tombs-version">{finding.ruleId} / {finding.ruleVersion}</p></article>)}
        <h4>逐项依据</h4><ul>{check.evidence.map((item, index) => <li key={index}>{item}</li>)}</ul><p className="qimen-stem-tombs-version">规则 {check.ruleId} / {check.ruleVersion}</p>
      </div></details>;
    })}</div>
    <details className="qimen-stem-tombs-rules"><summary>规则条件与资料版本</summary>{data.rules.map(rule => <article key={rule.id}><h3>{rule.name}</h3><p className="qimen-stem-tombs-version">{rule.id} / {rule.version}</p><ul>{rule.conditions.map((condition, index) => <li key={index}>{condition}</li>)}</ul><ul className="qimen-stem-tombs-sources">{rule.sources.map((source, index) => <li key={`${source.id}-${index}`}><span>{/^https:\/\//i.test(source.url) ? <a href={source.url} target="_blank" rel="noreferrer">{source.id}</a> : source.id}</span><span>版本 {source.commit}</span><span>定位 {source.locator}</span></li>)}</ul></article>)}</details>
    {data.warnings.length > 0 && <ul className="qimen-stem-tombs-warnings">{data.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
    <p className="qimen-stem-tombs-version">{data.profile} / {data.version}</p>
  </section>;
}
