import React from 'react';
import type { QimenChart, QimenPatternLayer } from '../shared/types';

const palaceNames: Record<number, string> = { 1: '坎一宫', 2: '坤二宫', 3: '震三宫', 4: '巽四宫', 5: '中五宫', 6: '乾六宫', 7: '兑七宫', 8: '艮八宫', 9: '离九宫' };
const layerNames: Record<QimenPatternLayer, string> = { doors: '八门盘', 'heaven-stems': '天盘干', stars: '九星盘' };
const palaceText = (palaces: number[]) => palaces.map(number => palaceNames[number] || `${number}宫`).join('、');
const sourceHref = (url: string) => /^https:\/\//i.test(url) ? url : undefined;
const schoolName = '时家转盘 · 甲己符头拆补 · 中五寄坤二 · 天禽随天芮';

export function QimenPatternsView({ chart }: { chart: QimenChart }) {
  if (!chart.available) return null;
  const patterns = chart.patterns;
  if (!patterns) return <section className="panel qimen-patterns qimen-patterns-missing" aria-label="奇门结构标记"><h2>盘层结构标记</h2><p>原记录未包含门迫、击刑、入墓与伏吟反吟的结构标记，请按出生资料重新分析后查看。</p><p className="muted">保留历史盘的原始内容，不自动补算。</p></section>;
  const matchedChecks = patterns.checks.filter(check => check.status === 'matched');
  const unmatchedChecks = patterns.checks.filter(check => check.status === 'not-matched');
  return <section className="panel qimen-patterns" aria-labelledby="qimen-patterns-heading">
    <header className="qimen-patterns-heading"><div><h2 id="qimen-patterns-heading">盘层结构标记</h2><p>分开核对八门、天盘干与九星的位置关系，保留每项规则的触发依据。</p></div><span className="tag">盘面关系参考</span></header>
    <dl className="qimen-patterns-summary" aria-label="结构标记核查汇总"><div><dt>已核查</dt><dd>{patterns.checks.length} 项规则</dd></div><div><dt>命中标记</dt><dd>{patterns.findings.length} 条</dd></div><div><dt>涉及规则</dt><dd>{matchedChecks.length} 项</dd></div></dl>
    <div className="qimen-patterns-context"><span>流派与盘式</span><p>{schoolName}</p><p className="version-line">{patterns.school} · 结构标记版本 {patterns.version}</p></div>
    <div className="qimen-patterns-checklist"><h3>未命中清单</h3>{unmatchedChecks.length ? <ul>{unmatchedChecks.map(check => <li key={check.ruleId}>{patterns.rules.find(rule => rule.id === check.ruleId)?.name || check.ruleId}<span> · {layerNames[check.layer]}</span></li>)}</ul> : <p>本盘各项规则均有对应标记，逐项依据见下方。</p>}</div>
    <div className="qimen-pattern-groups">{patterns.checks.map(check => {
      const rule = patterns.rules.find(item => item.id === check.ruleId);
      const findings = patterns.findings.filter(finding => finding.ruleId === check.ruleId);
      return <details className={`qimen-pattern-group ${check.status === 'matched' ? 'has-findings' : ''}`} key={check.ruleId}>
        <summary><span className="qimen-pattern-group-title">{rule?.name || check.ruleId}<small>{layerNames[check.layer]}</small></span><span className={`qimen-pattern-status ${check.status === 'matched' ? 'matched' : ''}`}>{check.status === 'matched' ? `命中 ${findings.length} 条` : '未命中'}</span></summary>
        <div className="qimen-pattern-group-body">
          {findings.length > 0 && <ul className="qimen-pattern-findings">{findings.map((finding, i) => <li key={`${finding.kind}-${i}`}><strong>{finding.label}</strong><span>{finding.subjects.join('、')} · {palaceText(finding.palaces)}</span></li>)}</ul>}
          <h4>核查依据</h4><ul className="qimen-pattern-evidence">{check.evidence.map((evidence, i) => <li key={i}>{evidence}</li>)}</ul>
          {findings.some(finding => finding.evidence.some(evidence => !check.evidence.includes(evidence))) && <div className="qimen-pattern-detail-evidence"><h4>标记明细</h4>{findings.map((finding, i) => {
            const evidence = finding.evidence.filter(item => !check.evidence.includes(item));
            return evidence.length ? <div key={i}><strong>{finding.label} · {palaceText(finding.palaces)}</strong><ul>{evidence.map((item, index) => <li key={index}>{item}</li>)}</ul></div> : null;
          })}</div>}
          {rule && <><h4>规则条件</h4><ul className="qimen-pattern-evidence">{rule.conditions.map((condition, i) => <li key={i}>{condition}</li>)}</ul><h4>资料来源</h4><ul className="qimen-pattern-sources">{rule.sources.map((source, i) => <li key={`${source.id}-${i}`}><span>{sourceHref(source.url) ? <a href={sourceHref(source.url)} target="_blank" rel="noreferrer">{source.id}</a> : source.id}</span><span>版本 {source.commit}</span><span>定位 {source.locator}</span></li>)}</ul></>}
          <p className="version-line">规则 {check.ruleId} / {check.ruleVersion}</p>
        </div>
      </details>;
    })}</div>
    {patterns.warnings.length > 0 && <ul className="qimen-pattern-warnings">{patterns.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul>}
  </section>;
}
