import React,{useId} from 'react';
import type {ParagraphReferenceR3} from '../domain/traditional/geng-si-reference-r3';
import './TraditionalCoreReferenceView.css';

export interface TraditionalCoreReferenceViewProps {
  /** A readonly paragraph supplied by the core adapter; this component never calculates applicability. */
  reference?:ParagraphReferenceR3;
  baziVersion?:string;
}
const applicabilityLabels={matched:'条文适用','not-applicable':'本条不适用','insufficient-data':'资料不足'} as const;
const conditionLabels={met:'条件已满足','not-met':'条件不满足',unknown:'条件未知','not-applicable':'本条不适用'} as const;
const conditionNames:Record<string,string>={'day-stem':'日干是否为庚','month-branch':'月支是否为巳','disease-specific-selection':'分病用药'};
const sourceNames:Record<string,string>={'named-reference-set':'条文点名的参考集合','unranked-order':'条文不拘先后'};

/** Displays the core r4 DTO unchanged; source statements are separate from chart observations. */
export function TraditionalCoreReferenceView({reference,baziVersion}:TraditionalCoreReferenceViewProps){
 const id=useId();
 if(!reference)return <section className="tc-reference tc-empty" aria-labelledby={id}><h2 id={id}>调候条文旁证</h2><p>当前资料未提供可展示的条文旁证；不回填历史或补算结论。</p></section>;
 const label=applicabilityLabels[reference.status];
 return <section className="tc-reference" aria-labelledby={id} data-reference-status={reference.status}>
  <header className="tc-reference-header"><div><p className="tc-eyebrow">《穷通宝鉴》调候条文 · 限定旁证</p><h2 id={id}>调候条文旁证</h2></div><span className={'tc-status tc-status-'+reference.status}>{label}</span></header>
  <p className="tc-lead">{reference.status==='matched'?'这里只确认庚日巳月的条文适用；分病用药仍未裁定。':reference.status==='not-applicable'?'当前资料不在本条庚日巳月适用范围；不借用本条参考集合。':'当前资料不足以确定本条是否适用；不把未知写成不适用或不存在。'} 这不是完整喜用结论，也不是姓名吉凶或排名。</p>
  <dl className="tc-meta"><div><dt>规则版本</dt><dd>{reference.ruleId} · {reference.version}</dd></div><div><dt>资料范围</dt><dd>{reference.complete?'四柱已知':'存在未知柱位'}{reference.unknownPositions.length?'：'+reference.unknownPositions.join('、'):''}</dd></div>{baziVersion&&<div><dt>出生分析版本</dt><dd>{baziVersion}</dd></div>}</dl>
  <section aria-label="条文条件"><h3>适用条件与未裁定项目</h3><ul className="tc-conditions">{reference.conditions.map((condition,index)=><li className="tc-condition" key={condition.id+':'+index} data-condition-state={condition.status}><div className="tc-condition-head"><strong>{conditionNames[condition.id]??condition.id}</strong><span>{conditionLabels[condition.status]}</span></div><p className="tc-quote">对应原句：{condition.sourceQuote}</p>{condition.status==='unknown'&&<p className="tc-boundary">此项未知或尚未裁定，不据此作喜用或吉凶判断。</p>}</li>)}</ul></section>
  <section aria-label="条文原文声明"><h3>原文声明</h3><p>以下是原文所述范围，不是出生盘已满足的条件。</p><ul>{reference.sourceAssertions.map((assertion,index)=><li key={assertion.id+':'+index}><strong>{sourceNames[assertion.id]??assertion.id}</strong>：<q>{assertion.sourceQuote}</q>（原文已记录）</li>)}</ul></section>
  {reference.referenceSet&&<section className="tc-reference-set" aria-label="条文参考集合"><h3>无排序参考集合</h3><p>{reference.referenceSet.stems.join('、')}（{reference.referenceSet.elements.join('、')}）</p><p>无先后次序，取用尚未裁定；不据此生成喜用证书或命名权重。</p><ul>{reference.referenceSet.observations.map((observation,index)=><li key={observation.stem+':'+index} data-observation-state={observation.result}><strong>{observation.stem}</strong>：{observation.result==='met'?'已见':observation.result==='not-seen'?'完整资料范围未见':'资料不足，未知'}{observation.exposedPositions.length?'；明干 '+observation.exposedPositions.join('、'):''}{observation.hiddenPositions.length?'；藏干 '+observation.hiddenPositions.join('、'):''}</li>)}</ul><p>明干或藏干出现只说明结构所见，不证明有效根气、制化或取用；缺柱时未见不能证明不存在。</p></section>}
  <section className="tc-source" aria-label="原文与来源"><h3>原文、流派与来源</h3><p>取法范围：《穷通宝鉴》调候条文；仅展示本段，不与其他流派混并结论。</p><blockquote>{reference.source.quote}</blockquote><dl><div><dt>来源版本</dt><dd>{reference.source.sourceId} · {reference.source.revision}</dd></div><div><dt>定位</dt><dd>{reference.source.locator}</dd></div></dl></section>
  <section className="tc-limitations" aria-label="适用限制"><h3>适用限制与未解释内容</h3><p>本选定条文没有列明排除条件；不据此宣称没有其他限制。</p><p>未解释引文：<q>{reference.followup.quote}</q>；保留原文，不实施关系或命运断语。</p><ul>{reference.limitations.map((item,index)=><li key={index}>{item}</li>)}</ul><p>条文适用、条件不满足与资料不足均不等同于名字好坏。本展示不评分，不推荐或重排候选。</p></section>
 </section>;
}
