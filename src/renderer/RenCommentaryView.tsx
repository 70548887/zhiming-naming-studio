import React from 'react';
import type {RenCommentaryAnalysis,RenSourceReference,RenStructureEdge} from '../shared/types';
import {renAuthorityLabel,renCaseEvidenceLabel,renCaseStatusLabel,renDependencyStateLabel,renEdgeLabel,renEdgeNodes,renLayerLabel,renNecessaryStatusLabel,renObservationLabel,renPositionLabel,renRelationLabel,renSummary} from '../shared/ren-presentation';
import {classicDisplay} from '../shared/classic-display';
import './ren-commentary.css';
import {RenActionsView} from './RenActionsView';
import {RenCapacitiesView} from './RenCapacitiesView';
import {RenDirectionsView} from './RenDirectionsView';
import {RenJointBattleView} from './RenJointBattleView';

const list=(items:string[])=><ul>{items.map((item,index)=><li key={index}>{classicDisplay(item)}</li>)}</ul>;
function Source({source}:{source:RenSourceReference}) {
  return <article className="ren-source"><h4>{source.section}</h4><blockquote>{classicDisplay(source.quote)}</blockquote><p className="ren-locator">层级 {renAuthorityLabel(source.layer)} · {source.locator}<br/>来源 {source.sourceId} · 条文 {source.id}</p></article>;
}
function GraphGroup({data,kind}:{data:RenCommentaryAnalysis;kind:RenStructureEdge['kind']}) {
  const edges=data.structureGraph.edges.filter(edge=>edge.kind===kind);
  if(!edges.length)return null;
  return <details className="ren-graph-group"><summary>{renEdgeLabel[kind]}（{edges.length}）</summary>
    <p>成员关系已记录；是否发生有效生扶、制约、拔根或化气，须另核所列依赖。</p>
    <div className="ren-table-wrap"><table><thead><tr><th>起点 / 成员</th><th>终点</th><th>所见关系与待核条件</th></tr></thead><tbody>{edges.map(edge=><tr key={edge.id}>
      <td>{renEdgeNodes(data,edge.from)}</td><td>{renEdgeNodes(data,edge.to)||'同组成员'}</td>
      <td>{edge.memberFacts.map((item,index)=><p key={index}>{item}</p>)}<strong>有效作用：未裁决</strong>{edge.dayMasterParticipates&&<p>日主参与此项成员关系</p>}{edge.distance!==undefined&&<p>柱位距离 {edge.distance}</p>}{list(edge.dependencies.map(item=>item.description))}</td>
    </tr>)}</tbody></table></div>
  </details>;
}

/** Renders only the saved independent profile; existing opinions and source labels are not recomputed. */
export function RenCommentaryView({analysis:data}:{analysis?:RenCommentaryAnalysis}) {
  if(!data)return null;
  const groups=Object.keys(renEdgeLabel) as RenStructureEdge['kind'][];
  return <section className="panel ren-commentary" aria-labelledby="ren-commentary-heading">
    <header className="ren-heading"><div><h2 id="ren-commentary-heading">任注独立参考</h2><p>《滴天髓阐微》固定任注 · 条文、结构与原书同盘对读</p></div><span className="tag">独立取法</span></header>
    <p className="ren-overview">{renSummary(data)}</p>
    <dl className="ren-input">{data.input.pillars.map(pillar=><div key={pillar.position}><dt>{renPositionLabel[pillar.position]}</dt><dd>{pillar.known?pillar.ganzhi:'待定'}</dd></div>)}</dl>
    <p className="ren-scope">{data.capacityAnalysis?'本取法另核原句明确支持的局部能力，净作用与完整成格分别保留待核。':'当前只核可定位的结构与来源。'}原书标签、成员出现和有效作用分别记录，不用本项重写喜用、原从格意见或姓名排序。</p>
    {data.necessaryConditions&&<section className="ren-necessary" aria-labelledby="ren-necessary-heading"><h3 id="ren-necessary-heading">从儿必要条件核查</h3><p>完整四柱的字面缺项可以反证本条前提；见到所需成员只说明未被缺项排除，仍不代表有效或成格。</p>
      {data.necessaryConditions.checks.map(check=><article className={`ren-necessary-check ${check.status}`} key={check.id}><header><h4>{check.name}</h4><strong>{renNecessaryStatusLabel[check.status]}</strong></header>
        <p>日干 {check.dayStem||'待定'} · {check.complete?'四柱完整':'存在未确定柱'}</p>{list(check.evidence)}{check.positions.length>0&&<p>所见位置：{check.positions.join('、')}</p>}
        <details><summary>本条原句与未核条件</summary><blockquote>{classicDisplay(check.sourceQuote)}</blockquote>{list(check.missing)}<p className="ren-locator">{check.sourceLocator}<br/>{check.sourceId} · {check.id}</p></details>
      </article>)}{list(data.necessaryConditions.interpretationPolicy)}</section>}

    <RenJointBattleView analysis={data.jointBattleAnalysis} nodes={data.structureGraph.nodes}/>
    <RenDirectionsView analysis={data.directionAnalysis} nodes={data.structureGraph.nodes}/>
    <RenCapacitiesView analysis={data.capacityAnalysis} nodes={data.structureGraph.nodes}/>
    <RenActionsView analysis={data.actionAnalysis}/>
    <h3>原书同盘对照</h3>
    {!data.sourceCaseMatches.length&&<p>没有完整同盘记录；缺柱时不补造时刻以匹配原例。</p>}
    {data.sourceCaseMatches.map(item=><article className={`ren-case ${item.status}`} key={item.caseId}>
      <header><h4>{item.authorAssertion}</h4><span>{renCaseStatusLabel(item)}</span></header>
      <p>{item.pillars.join(' · ')} · {item.section}</p><p>{renCaseEvidenceLabel(item.classificationEvidence)}</p>
      {item.quarantines.length>0&&<ul className="ren-unresolved">{item.quarantines.map(q=><li key={q.code}>{q.reason}{q.scanPage?`（影印PDF第${q.scanPage}页）`:''}</li>)}</ul>}
      <details><summary>本例原句与解释范围</summary><blockquote>{classicDisplay(item.sourceQuote)}</blockquote>{list(item.interpretationPolicy)}<p className="ren-locator">{item.sourceLocator} · 例号 {item.caseId}</p></details>
    </article>)}

    <h3>已核结构观察</h3><p>“所查位置未见”仅限列出的明干、藏干范围；信息不全时保留未知。</p>
    <div className="ren-observations">{data.observations.map(item=><details key={item.id} className={`ren-observation ${item.state}`}>
      <summary><span>{item.name}</span><strong>{renObservationLabel[item.state]}</strong></summary><p>{item.scope}</p>{list(item.evidence)}
      {item.positions.length>0&&<p>所见位置：{item.positions.join('、')}</p>}{item.missing.length>0&&list(item.missing)}
      {list(item.interpretationPolicy)}{item.sourceReferences.map(source=><Source key={source.sourceId+':'+source.id+':'+source.locator} source={source}/>)}
    </details>)}</div>

    <details className="ren-graph"><summary>生克合冲关系图 · 柱位与依赖（{data.structureGraph.edges.length} 条关系）</summary>
      <p>有向边列出相生、相克关系；合、冲、会按成员记录。关系出现不自动注销印比或根，也不自动宣布合化。</p>
      <details><summary>节点与明暗位置（{data.structureGraph.nodes.length}）</summary><div className="ren-table-wrap"><table><thead><tr><th>柱位</th><th>字与五行</th><th>相对日主</th></tr></thead><tbody>{data.structureGraph.nodes.map(node=><tr key={node.id}><td>{node.pillar} · {renLayerLabel[node.layer]}</td><td>{node.symbol} · {node.element}{node.hiddenOrder?` · 藏干列序${node.hiddenOrder}`:''}</td><td>{node.isDayMaster?'日主':node.relation?renRelationLabel[node.relation]:node.layer==='branch'&&data.input.dayStem?'本气五行位置，不列十神':'日主待定'}{node.tenGod?` · ${node.tenGod}`:''}</td></tr>)}</tbody></table></div></details>
      {groups.map(kind=><GraphGroup key={kind} data={data} kind={kind}/>)}
      <h3>有效作用的条件链</h3><p>前提、阻碍因素与循环依赖分别记录；未核条件不因已见成员关系而自动成立。</p>
      {data.structureGraph.actionContracts.map(contract=><details className="ren-action-contract" key={contract.id}><summary>{contract.name} · {renDependencyStateLabel[contract.state]}</summary>
        {contract.cycleDetected&&<p className="ren-unresolved">存在循环依赖；缺少独立证据，不能自行推出成立。</p>}
        <h4>必要前提</h4>{list(contract.premiseDependencies.map(item=>`${item.description}：${renDependencyStateLabel[item.state]}`))}
        {contract.inhibitorDependencies.length>0&&<><h4>阻碍因素</h4>{list(contract.inhibitorDependencies.map(item=>`${item.description}：${renDependencyStateLabel[item.state]}`))}</>}
        {list(contract.interpretationPolicy)}{contract.sourceReferences.map(source=><Source key={source.sourceId+':'+source.id+':'+source.locator} source={source}/>)}
      </details>)}
    </details>

    {data.sourceClaims.length>0&&<details className="ren-author-claims"><summary>原作者对同盘作用的解释（{data.sourceClaims.length}）</summary><p>以下解释只绑定同一源例，未转成对任意新盘通用的作用规则。</p>{data.sourceClaims.map((claim,index)=><article key={`${claim.caseId}-${index}`}><h4>{claim.label}{claim.quarantined?' · 疑文隔离':''}</h4><blockquote>{classicDisplay(claim.quote)}</blockquote>{list(claim.interpretationPolicy)}<p className="ren-locator">{claim.locator} · {claim.caseId}</p></article>)}</details>}
    <details className="ren-limitations"><summary>有效生扶与制化仍需核定的条件</summary>{list(data.unresolvedConditions)}{list(data.interpretationPolicy)}</details>
    <details className="ren-sources"><summary>所用条文与版本（{data.sourceRules.length}）</summary>{data.sourceRules.map(source=><Source key={source.sourceId+':'+source.id+':'+source.locator} source={source}/>)}<p className="ren-locator">{data.profileId} · {data.sourceId}</p></details>
  </section>;
}
