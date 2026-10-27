import React,{useId} from 'react';
import type {JiaLiteralReferenceV11,JiaLiteralState} from '../domain/traditional/qiongtong-jia-v11-types';
import './QiongtongJiaChapterView.css';

export interface QiongtongJiaChapterViewProps {reference?:JiaLiteralReferenceV11;}
const statusLabels:Record<JiaLiteralState,string>={'condition-met':'符合所列字面条件','condition-not-met':'不符合所列字面条件',unknown:'所列字面条件待定','not-applicable':'不在本条适用范围'};
const applicabilityLabels={met:'符合条文范围','not-met':'不符合条文范围',unknown:'资料未知'} as const;
const factLabels={met:'所列字面判据满足','not-met':'所列字面判据未满足',unknown:'所列字面判据未知','not-evaluated':'本条未作字面核查'} as const;
/** Displays independent selected subclauses; never infers a whole source branch or missing context text. */
export function QiongtongJiaChapterView({reference}:QiongtongJiaChapterViewProps){
 const id=useId();
 return <section className="qt-jia-reference" aria-labelledby={id+'-heading'}>
  <header><p className="qt-jia-eyebrow">《穷通宝鉴》· 甲木篇</p><h3 id={id+'-heading'}>甲木篇字面子句参考</h3></header>
  <p className="qt-jia-boundary">逐条状态只对应所列字句，不代表整段或整章条件成立。有效作用与完整用神仍未裁定，也不形成名字采纳意见。</p>
  {!reference?<p className="qt-jia-empty" role="status">本次尚未提供甲木篇字面子句结果。</p>:<>
   <dl className="qt-jia-input"><div><dt>当前输入</dt><dd>日干：{reference.input.dayStem??'未知'}；月支：{reference.input.monthBranch??'未知'}</dd></div><div><dt>资料范围</dt><dd>{reference.input.complete?'四柱资料已知':'存在未知柱位'}{reference.input.unknownPositions.length?'：'+reference.input.unknownPositions.join('、'):''}</dd></div></dl>
   {reference.input.unknownPositions.includes('时柱')&&<p className="qt-jia-note">时柱未知，仍逐条保留本次返回的状态；已知资料可能足以支持某条字面判断，不补造出生时刻或时柱。</p>}
   <p className="qt-jia-scope">本次列出 {reference.checks.length} 条独立字面子句；完整月别分支与全章判断尚未完成。</p>
   {!reference.checks.length?<p className="qt-jia-empty" role="status">本次结果未列出可展示子句，空列表不表示条件已满足。</p>:<ol className="qt-jia-checks" aria-label="甲木篇各条字面子句">{reference.checks.map((check,index)=>{
    const heading=id+'-check-'+index;
    return <li key={check.id+':'+index}><article className="qt-jia-check" aria-labelledby={heading} data-jia-clause-id={check.id} data-jia-clause-status={check.status}>
     <header><h4 id={heading}>{check.label}</h4><span className={'qt-jia-status qt-jia-status-'+check.status}>{statusLabels[check.status]}</span></header>
     <dl className="qt-jia-applicability"><div><dt>日干范围</dt><dd>{applicabilityLabels[check.applicability.dayStem]}</dd></div><div><dt>月支范围</dt><dd>{applicabilityLabels[check.applicability.monthBranch]}</dd></div><div><dt>字面事实</dt><dd>{factLabels[check.literalFact.result]}</dd></div></dl>
     <section aria-label="本条字面事实与缺失资料"><h5>字面事实与缺失资料</h5>{check.literalFact.evidence.length?<ul>{check.literalFact.evidence.map((text,i)=><li key={'e'+i}>{text}</li>)}</ul>:<p>{check.literalFact.result==='not-evaluated'?'本条未继续核查字面事实。':'本次未列出可展示的字面证据，不补定结论。'}</p>}{check.literalFact.missing.length>0&&<ul className="qt-jia-missing" aria-label="本条缺失资料">{check.literalFact.missing.map((text,i)=><li key={i}>{text}</li>)}</ul>}</section>
     <p className="qt-jia-undecided"><strong>整段条件未评估 · 有效作用未评估 · 完整用神未裁定</strong></p>
     <details className="qt-jia-source"><summary>查看原文字句与文献定位</summary><h5>本条所列原文字句</h5><blockquote>{check.source.quote}</blockquote><dl><div><dt>文献版本</dt><dd>《穷通宝鉴》固定电子修订 2294674；尚未独立校勘影印底本。</dd></div><div><dt>字句定位</dt><dd>{check.source.locator}</dd></div><div><dt>字句范围</dt><dd>[{check.source.quoteSpan.start}, {check.source.quoteSpan.end})</dd></div><div><dt>上下文位置</dt><dd>[{check.source.contextSpan.start}, {check.source.contextSpan.end})</dd></div></dl><p>以上为 Unicode 字符位置，包含起点、不包含终点。上下文只列定位，不补写未返回的上下文正文。</p></details>
     {check.unresolvedDependencies.length>0&&<details className="qt-jia-limits"><summary>查看仍待明确的条件与限制</summary><ul>{check.unresolvedDependencies.map((text,i)=><li key={i}>{text}</li>)}</ul></details>}
    </article></li>;
   })}</ol>}
  </>}
 </section>;
}
