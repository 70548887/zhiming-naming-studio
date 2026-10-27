import React from 'react';
import type {RenJointBattleAnalysis} from '../shared/ren-joint-battle-types';
import type {RenStructureNode} from '../shared/types';
import {classicDisplay} from '../shared/classic-display';
import {renCapacityProofLabel} from '../shared/ren-capacities-presentation';
import {renAuthorityLabel,renNodeText} from '../shared/ren-presentation';
import {REN_JOINT_SCOPE_TEXT,REN_JOINT_RETAINED_TEXT,renJointBattleStateLabel,renJointBattleSummary,renJointBattleConsequence,renJointBattleEvidence} from '../shared/ren-joint-battle-presentation';
import './ren-joint-battle.css';

const list=(values:string[])=>values.length?<ul>{values.map((value,index)=><li key={index}>{classicDisplay(value)}</li>)}</ul>:null;
export function RenJointBattleView({analysis,nodes=[]}:{analysis?:RenJointBattleAnalysis;nodes?:RenStructureNode[]}){
 if(!analysis)return null;
 const known=new Map(nodes.map(node=>[node.id,node]));
 const positions=(ids:string[])=>ids.map(id=>{const node=known.get(id);return node?renNodeText(node):'字位待核';}).join('、');
 return <section className="ren-joint-battle" aria-labelledby="ren-joint-battle-title">
  <h3 id="ren-joint-battle-title">天地冲克与方会 · 限定核查</h3>
  <p>{REN_JOINT_SCOPE_TEXT}</p><p>{renJointBattleSummary(analysis)}</p>
  <p className="ren-joint-state">{renJointBattleStateLabel[analysis.state]}</p>
  {analysis.checks.map(check=><article className="ren-joint-check" key={check.id}>
   <header><h4>{check.name}</h4><strong>{renJointBattleStateLabel[check.state]}</strong></header>
   <p>{positions([check.target.stemNodeId,check.target.branchNodeId])} ↔ {positions([check.attacker.stemNodeId,check.attacker.branchNodeId])}</p>
   <p>{classicDisplay(renJointBattleConsequence(check))}</p>{list(check.evidence.map(value=>renJointBattleEvidence(value,check,nodes)))}
   <details><summary>本次字位、方会与继承证明</summary>
    <p>采用基础：任注1.4木方局部旺势；本条继承证明为 {renCapacityProofLabel[check.inheritedDirection.proofResult]}。</p>
    <p>所引方会字位：{positions(check.meetingNodeIds)||'尚未确定'}。</p>
    <p>方会与所查冲支的交集：{positions(check.meetingClashIntersectionNodeIds)||'尚未确定'}。</p>
    <p>同柱根联系 {check.samePillarTargetRootLinkIds.length} 项；本载体相关根联系 {check.relatedCarrierRootLinkIds.length} 项。这里仅定位已有联系，不把联系当作有效根。</p>
    <p className="ren-locator">干克边 {check.controlEdgeId}<br/>支冲边 {check.clashEdgeId}<br/>方会边 {check.meetingEdgeId||'待核'}</p>
    {list(check.missing)}
   </details>
   <p className="ren-joint-retained">{REN_JOINT_RETAINED_TEXT}</p>
  </article>)}
  {!analysis.checks.length&&<p className="ren-joint-empty">尚无可列出的本条组合；请结合上方范围与状态阅读，不能把空列表当作没有冲克。</p>}
  <details className="ren-joint-bridges"><summary>本产品采用的解释范围（{analysis.projectBridges.length} 项）</summary><p>以下是本产品明示的采用约定，与作者原句分开记录。</p>{analysis.projectBridges.map(bridge=><article key={bridge.id}><h4>{bridge.name}</h4><p>{classicDisplay(bridge.statement)}</p></article>)}</details>
  <details className="ren-joint-sources"><summary>原句、注家与固定出处</summary><p>本条按任氏评注采用；所列原注只供对读，不合并为同一判断。</p>{analysis.sourceReferences.map(source=><article key={source.sourceId+':'+source.id+':'+source.locator}><blockquote>{classicDisplay(source.quote)}</blockquote><p className="ren-locator">{source.section} · {renAuthorityLabel(source.layer)}<br/>{source.locator} · {source.sourceId} · {source.id}</p></article>)}</details>
  <details><summary>保留事项与版本</summary>{list(analysis.limitations)}<p className="ren-locator">{analysis.profileId} · {analysis.version}<br/>{analysis.sourceId}</p></details>
 </section>;
}
