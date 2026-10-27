import React from 'react';
import type { MonthFollowingRestriction, MonthFollowingRestrictions } from '../shared/types';
import { restrictionPatternLabel, restrictionStatusLabel } from '../shared/following-restrictions-presentation';
import { classicDisplay } from '../shared/classic-display';
import './following-restrictions.css';

function Restriction({check}:{check:MonthFollowingRestriction}) {
  return <article className={`following-restriction ${check.status}`}>
    <header><h3>{check.name}</h3><span>{restrictionStatusLabel(check.status)}</span></header>
    <p className="restriction-patterns">所限格类：{restrictionPatternLabel(check.patterns)}</p>
    <p>{check.explanation}</p>
    <dl><div><dt>已确定日干</dt><dd>{check.dayStem||'待定'}</dd></div><div><dt>已知／可能月支</dt><dd>{check.monthBranches.join('、')||'待定'}</dd></div></dl>
    {check.missing.length>0&&<ul className="restriction-missing">{check.missing.map((item,index)=><li key={index}>{item}</li>)}</ul>}
    <details><summary>原句与适用范围</summary><div>
      <p>本条范围：日干 {check.targetDayStems.join('、')} · 月支 {check.targetMonthBranches.join('、')}</p>
      <blockquote>{classicDisplay(check.sourceQuote)}</blockquote>
      <p className="restriction-locator">{check.sourceHeading}<br/>{check.sourceLocator}<br/>来源 {check.sourceId}</p>
    </div></details>
  </article>;
}

/** Displays the stored source-bound restriction without recalculating a historical chart. */
export function MonthFollowingRestrictionsView({data}:{data?:MonthFollowingRestrictions}) {
  if(!data)return null;
  const active=data.checks.filter(check=>check.status!=='not-applicable');
  const inactive=data.checks.filter(check=>check.status==='not-applicable');
  return <section className="panel month-following-restrictions" aria-labelledby="month-following-restrictions-heading">
    <header className="restrictions-heading"><div><h2 id="month-following-restrictions-heading">月别从格限制</h2><p>《穷通宝鉴》固定电子版的明确月份条文，独立于从财、从杀条件证据。</p></div><span className="tag">同版原句</span></header>
    <p className="restriction-scope">未命中限制不代表从格成立；本条不替代完整调候、根气、制化或合化判断。</p>
    {active.map(check=><Restriction key={check.id} check={check}/>)}
    {inactive.length>0&&<details className="inactive-restrictions"><summary>未命中的原文限制（{inactive.length}）</summary><div>{inactive.map(check=><Restriction key={check.id} check={check}/>)}</div></details>}
    <details className="restrictions-limitations"><summary>方法范围与版本</summary><div><ul>{data.limitations.map((item,index)=><li key={index}>{item}</li>)}</ul><p className="restriction-locator">{data.profile}<br/>{data.version} · {data.sourceId}</p></div></details>
  </section>;
}
