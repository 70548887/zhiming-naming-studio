import React from 'react';
import type {RenDirectionAnalysis} from '../shared/ren-directions-types';
import type {RenStructureNode} from '../shared/types';
import {classicDisplay} from '../shared/classic-display';
import {renNodeText,renAuthorityLabel} from '../shared/ren-presentation';
import {renCapacityProofLabel} from '../shared/ren-capacities-presentation';
import {renDirectionConclusionLabel,renDirectionConsequenceLead,renDirectionFactKindLabel,renDirectionFactStateLabel} from '../shared/ren-directions-presentation';
import './ren-capacities.css';

const list=(values:string[])=>values.length?<ul>{values.map((value,index)=><li key={index}>{classicDisplay(value)}</li>)}</ul>:null;
export function RenDirectionsView({analysis,nodes=[]}:{analysis?:RenDirectionAnalysis;nodes?:RenStructureNode[]}){
  if(!analysis)return null;
  const positions=(ids:string[])=>ids.map(id=>{const node=nodes.find(value=>value.id===id);return node?renNodeText(node):'字位待核';}).join('、');
  return <section className="ren-capacities ren-directions" aria-labelledby="ren-directions-title">
    <h3 id="ren-directions-title">木方与火方 · 原句局部旺势</h3>
    <p>核对已定柱中的三方支及同气日主。原句支持的局部旺势与整盘净作用分别记录；本条尚未证明，不表示该方在所有取法下都不旺。</p>
    <p>{analysis.input.complete?'四柱已确定。':'存在未确定柱，只使用实际已定节点；本条所需事实若已齐备，局部证明仍可成立。'}本项不补造时柱，不改喜用或姓名排序。</p>
    {analysis.checks.map(check=><article className={`ren-capacity-check ${check.capability}`} key={check.id}>
      <header><h4>{check.name}</h4><strong>{renDirectionConclusionLabel(check)}</strong></header>
      <p>{check.scope}</p>{list(check.evidence)}
      <p className="ren-capacity-proof">{renCapacityProofLabel[check.state]} · 仅本条充分证明路径</p>
      <details><summary>原句条件与本次字位</summary>
        <blockquote>{classicDisplay(check.sourceGeneral)}</blockquote>
        {check.facts.map(fact=><div className="ren-capacity-fact" key={fact.id}>
          <h5>{fact.label} · {renDirectionFactStateLabel(fact)}</h5>
          <p>{renDirectionFactKindLabel[fact.kind]}{fact.contributesToProof?' · 用于本条证明':' · 不作为本条正判前提'}</p>
          <p>{classicDisplay(fact.basis)}</p>{list(fact.evidence)}
        </div>)}
        {check.sourceNodeIds.length>0&&<p>本方已见字位：{positions(check.sourceNodeIds)}</p>}
        {check.targetNodeIds.length>0&&<p>同气日主字位：{positions(check.targetNodeIds)}</p>}
        {list(check.productRestrictions)}{list(check.missing)}
      </details>
      <details><summary>对应原句与固定出处</summary>{analysis.sourceReferences.filter(source=>check.sourceClauseIds.includes(source.id)).map(source=><article key={source.sourceId+':'+source.id+':'+source.locator}>
        <blockquote>{classicDisplay(source.quote)}</blockquote><p className="ren-locator">{source.section} · {renAuthorityLabel(source.layer)}<br/>{source.locator} · {source.sourceId} · {source.id}</p>
      </article>)}</details>
      <p>{renDirectionConsequenceLead(check)}：{classicDisplay(check.sourceConsequence)}</p>
      <p className="ren-capacity-net">净作用、各干有效根气、完整判格及喜用：仍待核。</p>
    </article>)}
    <details><summary>本层范围与保留事项</summary>{list(analysis.limitations)}<p className="ren-locator">{analysis.profileId} · {analysis.version}<br/>{analysis.sourceId}</p></details>
  </section>;
}
