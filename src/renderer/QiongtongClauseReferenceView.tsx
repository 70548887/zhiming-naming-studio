import React,{useId} from 'react';
import type {LiteralConditionState,QiongtongClauseReference} from '../shared/qiongtong-clause-reference';
import type {JiaLiteralReferenceV11} from '../domain/traditional/qiongtong-jia-v11-types';
import {QiongtongJiaChapterView} from './QiongtongJiaChapterView';
import './QiongtongClauseReferenceView.css';

export interface QiongtongClauseReferenceViewProps {reference?:QiongtongClauseReference;jiaChapter?:JiaLiteralReferenceV11;}
const statusLabels:Record<LiteralConditionState,string>={'condition-met':'符合字面条件','condition-not-met':'不符合字面条件',unknown:'字面条件待定','not-applicable':'不在本条适用范围'};
const applicabilityLabels={met:'符合条文范围','not-met':'不符合条文范围',unknown:'资料未知'} as const;
const factLabels={met:'字面判据满足','not-met':'字面判据未满足',unknown:'字面判据未知','not-evaluated':'本条未作字面核查'} as const;
const ruleTitles:Record<string,string>={'jia-hai-three-exposed':'甲日亥月 · 庚丁两透、戊出干','jia-chou-geng-exposed-ding-hidden':'甲日丑月 · 庚透丁藏','yi-zi-no-bing-anywhere':'乙日子月 · 干支无丙'};
const roleLabels:Record<string,string>={first:'原文首项',parallel:'原文并列',support:'原文次项'};

/** Only reads the supplied M508 DTO; applicability and literal conditions are never recalculated here. */
export function QiongtongClauseReferenceView({reference,jiaChapter}:QiongtongClauseReferenceViewProps){
 const id=useId();
 return <><section className="qt-clause-reference" aria-labelledby={id}>
  <header><p className="qt-clause-eyebrow">《穷通宝鉴》固定电子版 · 月别字面条件</p><h2 id={id}>月别条文条件参考</h2></header>
  <p className="qt-clause-boundary">这里显示的是原文中的字句条件，不是命运、性格或取名结论。完整用神、从格、合化和有效制化仍未判断。</p>
  {!reference?<p className="qt-clause-empty" role="status">当前没有可展示的月别条文结果；不补算或回填历史结论。</p>:<>
   <dl className="qt-clause-input"><div><dt>当前输入</dt><dd>日干：{reference.input.dayStem??'未知'}；月支：{reference.input.monthBranch??'未知'}</dd></div><div><dt>资料范围</dt><dd>{reference.input.complete?'四柱资料已知':'存在未知柱位'}{reference.input.unknownPositions.length?'：'+reference.input.unknownPositions.join('、'):''}</dd></div><div><dt>命名影响</dt><dd>不改变喜用、评分或候选排序</dd></div></dl>
   {reference.input.unknownPositions.length>0&&<p className="qt-clause-note">部分出生资料尚未确定：{reference.input.unknownPositions.join('、')}。当前按已知资料和本次实际返回的状态显示；如后续取得完整记录，可补充后重新查阅。</p>}
   {!reference.rules.length?<p className="qt-clause-empty" role="status">本次结果未列出条文，不把空列表解释为条件已满足或没有限制。</p>:<ol className="qt-clause-rules" aria-label="各条月别字面条件">{reference.rules.map((rule,index)=>{
    const heading=id+'-rule-'+index;
    return <li key={rule.id+':'+index}><article className="qt-clause-rule" aria-labelledby={heading} data-clause-id={rule.existingConditionId} data-clause-status={rule.status}>
     <header className="qt-clause-rule-head"><h3 id={heading}>{ruleTitles[rule.existingConditionId]??rule.id}</h3><span className={'qt-clause-status qt-clause-status-'+rule.status}>{statusLabels[rule.status]}</span></header>
     <dl className="qt-clause-applicability"><div><dt>日干范围</dt><dd>{applicabilityLabels[rule.applicability.dayStem]}</dd></div><div><dt>月支范围</dt><dd>{applicabilityLabels[rule.applicability.monthBranch]}</dd></div><div><dt>字面事实</dt><dd>{factLabels[rule.literalFact.result]}</dd></div></dl>
     <section className="qt-clause-facts" aria-label="本条依据与待补资料"><h4>本条依据与待补资料</h4>
      {rule.literalFact.evidence.length?<ul>{rule.literalFact.evidence.map((evidence,i)=><li key={'e'+i}>{evidence}</li>)}</ul>:<p>{rule.literalFact.result==='not-evaluated'?'本条范围不适用，未继续核查字面事实。':'本次结果没有列出可展示的字面证据；不据此补定条件。'}</p>}
      {rule.literalFact.missing.length>0&&<ul className="qt-clause-missing" aria-label="本条缺失资料">{rule.literalFact.missing.map((missing,i)=><li key={i}>{missing}</li>)}</ul>}
     </section>
     <p className="qt-clause-undecided"><strong>这只是字句条件参考</strong><br/>有效制化、完整用神、从格和合化仍未裁定，不等同于整名适合。</p>
     <details className="qt-clause-source"><summary>查看本条原文和适用范围</summary>
      <h4>本条原文（保留原文）</h4><blockquote>{rule.source.quote}</blockquote><h4>对应上下文（仅原文记录）</h4><blockquote>{rule.source.contextQuote}</blockquote>
      <dl><div><dt>流派与版本</dt><dd>《穷通宝鉴》固定电子修订 2294674；不与其他流派合并取用结论。</dd></div><div><dt>定位</dt><dd>{rule.source.locator}</dd></div></dl>
      <p>字面条件原文范围：[{rule.source.quoteSpan.start}, {rule.source.quoteSpan.end})；上下文范围：[{rule.source.contextSpan.start}, {rule.source.contextSpan.end})（Unicode 字符位置）。</p>
      <p>固定电子转录；尚未独立校勘影印底本。</p>
      {rule.textReferences.length>0&&<section aria-label="本条原文点名"><h4>原文点名（不是本次已选用神）</h4><ul>{rule.textReferences.map((item,i)=><li key={item.stem+':'+i}><strong>{item.stem}</strong> · {roleLabels[item.role]??item.role}：<q>{item.quote}</q>（仅文本记录）</li>)}</ul></section>}
     </details>
     <details className="qt-clause-limits"><summary>查看限制与仍待判断内容</summary><ul>{rule.limitations.map((limitation,i)=><li key={i}>{limitation}</li>)}</ul></details>
    </article></li>;
   })}</ol>}
  </>}
 </section>{jiaChapter&&<QiongtongJiaChapterView reference={jiaChapter}/>}</>;
}
