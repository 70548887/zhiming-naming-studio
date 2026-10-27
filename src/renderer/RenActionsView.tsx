import React from 'react';
import type {RenActionAnalysis,RenActionCheck} from '../shared/ren-actions-types';
import {classicDisplay} from '../shared/classic-display';
import './ren-actions.css';
const statusLabels={met:'所列条件已见',contradicted:'所列必要路径不符',unknown:'尚有条件待核',conflict:'条件冲突 · 待核'} as const;
const kinds:RenActionCheck['kind'][]=['root-prerequisite','cover-carrier','wood-triad-clash','lifecycle-proof-guard','root-damage','resource-damage','resource-rescue'];
const kindLabels:Record<RenActionCheck['kind'],string>={'root-prerequisite':'根联系必要条件','cover-carrier':'同柱载覆方向','wood-triad-clash':'木局内插冲损条文','lifecycle-proof-guard':'十二运单一论据限制','root-damage':'根联系冲损路径','resource-damage':'财克印的具体路径','resource-rescue':'针对同一阻断的救应路径'};
const positions={year:'年柱',month:'月柱',day:'日柱',hour:'时柱'};
const list=(values:string[])=>values.length?<ul>{values.map((value,index)=><li key={index}>{classicDisplay(value)}</li>)}</ul>:null;

export function RenActionsView({analysis}:{analysis?:RenActionAnalysis}){
  if(!analysis)return null;
  const sources=(ids:string[])=>analysis.sourceReferences.filter(source=>ids.includes(source.id));
  return <section className="ren-actions" aria-labelledby="ren-actions-title"><h3 id="ren-actions-title">根联系与条件作用核查</h3>
    <p>逐条核对任注明示条件及其作用对象。所列前提符合只证明该前提；旺衰、有效生扶、冲克力量和救应作用仍按各条缺项保留。</p>
    <details><summary>根联系字位与原文类别（{analysis.rootLinks.length}）</summary><p>所选藏干中的同五行联系与原文类别分别保存，不把根数换成旺度，不删除被冲地支或藏干。</p>
      <div className="ren-table-wrap"><table><thead><tr><th>天干字位</th><th>载根位置</th><th>来源类别及待核</th></tr></thead><tbody>{analysis.rootLinks.map(link=><tr key={link.id}><td>{positions[link.stemPosition]} · {link.stem}</td><td>{positions[link.rootPosition]} · {link.branch}藏{link.hiddenStem}；列序{link.hiddenOrder}{link.samePillar?' · 同柱':''}</td><td>{({'growth-lu-wang':'原文生禄旺','store':'原文库','residue':'原文余气','selected-same-element':'所选藏干同五行'} as const)[link.category]}{list(link.evidence)}<strong>有效生扶：待核</strong></td></tr>)}</tbody></table></div>
    </details>
    {kinds.map(kind=>{const checks=analysis.checks.filter(check=>check.kind===kind);return checks.length?<details className="ren-actions-group" key={kind}><summary>{kindLabels[kind]}（{checks.length}）</summary>{checks.map(check=><article className={`ren-actions-check ${check.status}`} key={check.id}><header><h4>{check.name}</h4><strong>{statusLabels[check.status]}</strong></header><p>{check.scope}</p>{list(check.evidence)}<p>原文后果与适用限制：{classicDisplay(check.sourceConsequence)}</p><details><summary>所查前提与缺项</summary>{check.predicates.map(predicate=><div className="ren-actions-predicate" key={predicate.id}><h5>{predicate.label} · {statusLabels[predicate.state]}</h5>{list(predicate.evidence)}</div>)}{list(check.missing)}</details><details><summary>对应原句与固定出处</summary>{sources(check.sourceClauseIds).map(source=><article key={source.id}><h5>{source.section}</h5><blockquote>{classicDisplay(source.quote)}</blockquote><p className="ren-locator">{source.layer} · {source.locator}<br/>{source.sourceId} · {source.id}</p></article>)}</details></article>)}</details>:null;})}
    <details><summary>本方法完整原句与定位（{analysis.sourceReferences.length}）</summary>{analysis.sourceReferences.map(source=><article key={source.id}><h5>{source.section}</h5><blockquote>{classicDisplay(source.quote)}</blockquote><p className="ren-locator">{source.layer} · {source.locator}<br/>{source.sourceId} · {source.id}</p></article>)}</details>
    <details><summary>方法边界与未完成的判断</summary>{list(analysis.limitations)}<p className="ren-locator">{analysis.profileId} · {analysis.version}<br/>{analysis.sourceId}</p></details>
  </section>;
}
