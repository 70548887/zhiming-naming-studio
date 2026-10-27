import React from 'react';
import type {RenCapacityAnalysis} from '../shared/ren-capacities-types';
import type {RenStructureNode} from '../shared/types';
import {classicDisplay} from '../shared/classic-display';
import {renCapacityConclusionLabel,renCapacityProofLabel} from '../shared/ren-capacities-presentation';
import {renNodeText,renAuthorityLabel} from '../shared/ren-presentation';
import './ren-capacities.css';

const list=(values:string[])=>values.length?<ul>{values.map((value,index)=><li key={index}>{classicDisplay(value)}</li>)}</ul>:null;
export function RenCapacitiesView({analysis,nodes=[]}:{analysis?:RenCapacityAnalysis;nodes?:RenStructureNode[]}){
  if(!analysis)return null;
  const positions=(ids:string[])=>ids.map(id=>{const node=nodes.find(item=>item.id===id);return node?renNodeText(node):id;}).join('、');
  return <section className="ren-capacities" aria-labelledby="ren-capacities-title">
    <h3 id="ren-capacities-title">木局旺势与辰生助 · 限定能力</h3>
    <p>本项按独立采用范围核对两条原文能力。证明条件未通过，只表示这条证明未成立；不能据此判全盘无力。能力获原句支持后，净作用、各干有效根气和完整成格仍须另核。本项不推断后续金运，也不表示木局永不受金克。</p>
    {analysis.checks.map(check=><article className={`ren-capacity-check ${check.capability}`} key={check.id}>
      <header><h4>{check.name}</h4><strong>{renCapacityConclusionLabel(check)}</strong></header>
      <p>{check.scope}</p>{list(check.evidence)}<p className="ren-capacity-proof">{renCapacityProofLabel[check.state]} · 仅本条充分证明路径</p>
      <p>原句后果：{classicDisplay(check.sourceConsequence)}</p>
      <details><summary>原文范围与本次采用条件</summary><p>{classicDisplay(check.sourceGeneral)}</p>{list(check.productRestrictions)}
        {check.facts.map(fact=><div className="ren-capacity-fact" key={fact.id}><h5>{fact.label} · {renCapacityProofLabel[fact.state]}</h5>{list(fact.evidence)}</div>)}
        {check.sourceNodeIds.length>0&&<p>起点字位：{positions(check.sourceNodeIds)}</p>}{check.targetNodeIds.length>0&&<p>对象字位：{positions(check.targetNodeIds)}</p>}{list(check.missing)}
      </details>
      <details><summary>对应原句与固定出处</summary>{analysis.sourceReferences.filter(source=>check.sourceClauseIds.includes(source.id)).map(source=><article key={source.sourceId+':'+source.id+':'+source.locator}><blockquote>{classicDisplay(source.quote)}</blockquote><p className="ren-locator">{source.section} · {renAuthorityLabel(source.layer)}<br/>{source.locator} · {source.sourceId} · {source.id}</p></article>)}</details>
      <p className="ren-capacity-net">净作用：待核；未据本条改写喜用或姓名排序。</p>
    </article>)}
    <details><summary>本方法边界</summary>{list(analysis.limitations)}<p className="ren-locator">{analysis.profileId} · {analysis.version}<br/>{analysis.sourceId}</p></details>
  </section>;
}
