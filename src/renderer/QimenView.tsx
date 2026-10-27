import React from 'react';
import { Compass } from 'lucide-react';
import type { Analysis, QimenChart } from '../shared/types';
import { QimenPatternsView } from './QimenPatternsView';
import { QimenStemTombsView } from './QimenStemTombsView';
import { TraditionalTerms } from './TraditionalTerms';
import { birthTimeBasisLabel, birthTimeClockSummary, birthTimeOriginalSummary } from '../shared/birth-time-presentation';
import './qimen-patterns.css';

const palaceOrder = [4, 9, 2, 3, 5, 7, 8, 1, 6];
const palaceNames: Record<number, string> = { 1: '坎一宫', 2: '坤二宫', 3: '震三宫', 4: '巽四宫', 5: '中五宫', 6: '乾六宫', 7: '兑七宫', 8: '艮八宫', 9: '离九宫' };
const palaceText = (palaces: number[]) => palaces.map(n => palaceNames[n] || `${n}宫`).join('、');
const sourceHref = (url: string) => /^https:\/\//i.test(url) ? url : undefined;

export function QimenAuxiliaryView({ chart: q }: { chart: QimenChart }) {
  if (!q.available) return null;
  const auxiliary = q.auxiliary;
  if (!auxiliary) return <section className="panel qimen-auxiliary qimen-auxiliary-missing" aria-label="奇门辅助标记"><h2>旬空与驿马</h2><p>当前记录未生成旬空、驿马快照，请按出生资料重新分析后查看。</p><p className="muted">历史盘保持原记录，不自动补算辅助结论。</p></section>;
  return <section className="panel qimen-auxiliary" aria-labelledby="qimen-auxiliary-heading">
    <div className="qimen-auxiliary-heading"><div><h2 id="qimen-auxiliary-heading">旬空与驿马</h2><p>按记录的时柱推导，标注在固定地支宫位。</p></div><span className="tag">时柱辅助标记</span></div>
    <dl className="qimen-auxiliary-basis"><div><dt>时柱依据</dt><dd>{auxiliary.hourGanzhi}</dd></div><div><dt>驿马取支</dt><dd>时支 {auxiliary.hourGanzhi.slice(-1)}</dd></div><div><dt>标记版本</dt><dd>{auxiliary.version}</dd></div></dl>
    <div className="qimen-marker-grid">{auxiliary.markers.map(marker => <article className="qimen-marker-card" key={marker.kind}>
      <h3>{marker.label}</h3><dl><div><dt>{marker.kind === 'xunkong' ? '空支' : '驿马支'}</dt><dd>{marker.branches.join('、')}</dd></div><div><dt>固定地支宫位</dt><dd>{palaceText(marker.palaces)}</dd></div></dl>
      <h4>触发依据</h4><ul>{marker.evidence.map((evidence, i) => <li key={i}>{evidence}</li>)}</ul><p className="version-line">规则 {marker.ruleId} / {marker.ruleVersion}</p>
    </article>)}</div>
    <details className="qimen-rule-details"><summary>查看规则条件与资料来源</summary>{auxiliary.rules.map(rule => <section className="qimen-rule" key={rule.id}>
      <h3>{rule.name}</h3><p className="version-line">{rule.id} / {rule.version}</p><ul>{rule.conditions.map((condition, i) => <li key={i}>{condition}</li>)}</ul>
      <ul className="qimen-source-list">{rule.sources.map((source, i) => <li key={`${source.id}-${i}`}><span>{sourceHref(source.url) ? <a href={sourceHref(source.url)} target="_blank" rel="noreferrer">{source.id}</a> : source.id}</span><span>版本 {source.commit}</span><span>定位 {source.locator}</span></li>)}</ul>
    </section>)}</details>
    {auxiliary.warnings.length > 0 && <ul className="qimen-auxiliary-warnings">{auxiliary.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul>}
  </section>;
}

export function QimenView({ analysis: { qimen: q, bazi: b } }: { analysis: Analysis }) {
  const timeBasis = b?.timeBasis;
  const timeNote = timeBasis && <section className="panel qimen-notes" aria-label="奇门排盘时间取法"><h2>时间取法 · {birthTimeBasisLabel(timeBasis)}</h2><p>原民用记录：{birthTimeOriginalSummary(timeBasis)} · {timeBasis.timezone}</p><p>排盘钟表：{birthTimeClockSummary(timeBasis)}</p><p>奇门日、时干支与八字采用同一钟表，节气仍按原实际出生瞬间。完整换算明细见出生分析。</p></section>;
  if (!q.available) return <>{timeNote}<div className="empty-state"><div className="empty-icon"><Compass size={36}/></div><h3>当前资料尚不能确定唯一奇门盘</h3><p>{q.reason || '出生时刻未知，请补全时刻后重新分析。'}</p></div></>;
  return <div className="qimen-workspace">{timeNote}<TraditionalTerms terms={['三奇','六仪','旬空','入墓']} context="本盘的结构参考与各独立表分别记录；请按本次盘式和规则版本核对。"/><div className="qimen-layout"><div className="panel qimen-main"><div className="qimen-heading"><div><span className="tag">{q.dun}{q.ju}局 · {q.yuan}</span><h2>{q.solarTerm} · 出生参考盘</h2></div><Compass size={38} strokeWidth={1}/></div><div className="qimen-meta"><span>旬首 <strong>{q.xun}</strong></span><span>值符 <strong>{q.chiefStar}</strong></span><span>值使 <strong>{q.chiefDoor}</strong></span></div><div className="nine-palaces">{palaceOrder.map(n => {
    const p = q.palaces.find(x => x.number === n);
    return p ? <div className={`palace ${n === 5 ? 'center-palace' : ''}`} key={n}><div className="palace-top"><span>{p.trigram} · {p.direction}</span><b>{p.number}</b></div><div className="palace-god">{p.god || '中宫'}</div><div className="palace-center"><span>{p.star || '天禽'}</span><strong>{p.heaven}</strong></div><div className="palace-bottom"><span>{p.door || '寄坤二宫'}</span><strong>{p.earth}</strong></div>{p.marks.length > 0 && <div className="palace-marks">{p.marks.map((mark, i) => <span className="palace-mark" title={mark} key={i}>{mark}</span>)}</div>}</div> : <div className="palace" key={n}><span>{n}宫</span></div>;
  })}</div><p className="version-line">{q.version}</p></div><aside><section className="panel qimen-notes"><h2>排盘依据</h2><ul className="reason-list">{q.reasons.map((reason, i) => <li key={i}>{reason}</li>)}</ul></section><section className="panel qimen-notes"><h2>阅读提示</h2>{q.warnings.map((warning, i) => <p key={i}>{warning}</p>)}<p>本盘为同一出生资料的传统文化辅助参考，方案中的候选名字共用此盘。</p></section></aside></div><QimenAuxiliaryView chart={q}/><QimenPatternsView chart={q}/><QimenStemTombsView chart={q}/></div>;
}
