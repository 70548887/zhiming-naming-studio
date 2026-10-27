import React from 'react';
import type { BirthTimeAnalysis } from '../shared/types';
import { birthClockText, birthTimeBasisLabel, birthTimeClockSummary, birthTimeDayText, birthTimeLongitudeText, birthTimeMinutesText, birthTimeOriginalSummary, birthTimePolicyText } from '../shared/birth-time-presentation';
import './birth-time.css';

/** Display the saved conversion only; no recalculation or geographic lookup occurs here. */
export function BirthTimeBasisView({ analysis }: { analysis?: BirthTimeAnalysis }) {
  if (!analysis) return null;
  const solar = analysis.basis === 'apparent-solar';
  return <section className="panel birth-time-basis" aria-label="出生时间取法与换算">
    <header><div><h2>出生时间取法</h2><p>原始出生记录与排盘钟表分开保存，便于逐项核对。</p></div><span className="tag">{birthTimeBasisLabel(analysis)}</span></header>
    <dl className="birth-time-overview">
      <div><dt>原民用记录</dt><dd>{birthTimeOriginalSummary(analysis)}<small>{analysis.timezone}</small></dd></div>
      <div><dt>{solar ? '真太阳钟表' : '排盘钟表'}</dt><dd>{birthTimeClockSummary(analysis)}<small>{birthTimeDayText(analysis)}</small></dd></div>
    </dl>
    <p>{birthTimePolicyText}</p>
    {!analysis.civilTime && <p className="birth-time-notice">出生时刻未知：区间覆盖该民用日期，不以中午代替，不生成唯一时柱或奇门盘。</p>}
    {analysis.dayStatus === 'uncertain' && <p className="birth-time-notice">换算区间跨过排盘钟表的午夜：日主待定，本项证据暂停；喜用与依赖日主的判断留待补全出生时刻。</p>}
    {analysis.warnings.length > 0 && <ul className="birth-time-warnings">{analysis.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
    <details className="birth-time-details"><summary>查看换算明细与资料依据</summary><div>
      <p>{solar ? '真太阳时采用经度和均时差模型。它描述太阳钟表与民用钟表的差别，不代表出生记录被改写，也不代表术数结论已获验证。' : '当前按民用钟表计算，未应用真太阳时修正。'}</p>
      <dl className="birth-time-method"><div><dt>出生地经度</dt><dd>{birthTimeLongitudeText(analysis.longitude)}</dd></div><div><dt>实际 UTC</dt><dd>{analysis.actualUtc ?? `${analysis.civilInterval.startUtc} 至 ${analysis.civilInterval.endUtc}（区间末秒包含）`}</dd></div><div><dt>算法与版本</dt><dd>{analysis.methodId}<small>{analysis.version}</small></dd></div>{analysis.sourceId && <div><dt>资料登记</dt><dd>{analysis.sourceId}<small>完整出处见方案的生成时来源登记。</small></dd></div>}</dl>
      <div className="birth-time-table-wrap"><table><thead><tr><th>换算点</th><th>原民用钟表 / 排盘钟表</th><th>修正明细</th></tr></thead><tbody>{analysis.points.map((point, index) => <tr key={index}><td>{point.label === 'birth' ? '出生瞬间' : point.label === 'start' ? '区间开始' : '区间末秒（包含）'}<small>{point.utc}</small></td><td>{birthClockText(point.civilDateTime)}<small>→ {birthClockText(point.clockDateTime)}</small></td><td>UTC 时差 {birthTimeMinutesText(point.utcOffsetMinutes)}<small>经度修正 {birthTimeMinutesText(point.longitudeMinutes)}<br/>均时差 {birthTimeMinutesText(point.equationOfTimeMinutes)}<br/>相对民用修正 {birthTimeMinutesText(point.correctionMinutes)}</small></td></tr>)}</tbody></table></div>
      {analysis.policies.length > 0 && <ul>{analysis.policies.map((policy, index) => <li key={index}>{policy}</li>)}</ul>}
      <p className="birth-time-version">{analysis.precision === 'model-estimate' ? '模型估算；临近换日、时辰或交节边界应核对原始记录。' : '民用出生记录取法。'}</p>
    </div></details>
  </section>;
}
