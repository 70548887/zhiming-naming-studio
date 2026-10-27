import React from 'react';
import type {YueHomophoneReview} from '../shared/yue-homophone-types';
import {yueHomophoneCategoryLabel,yueHomophoneCoverageLabel} from '../shared/yue-homophone-presentation';
import './name-reading.css';

export function YueHomophoneView({review,summary=false}:{review?:YueHomophoneReview;summary?:boolean}){
  if(!review)return null;
  const state=review.status==='not-assessed'?'读音未全部确认 · 暂未检查':review.matches.length?`有限词表匹配 ${review.matches.length} 项`:'本次有限词表未发现匹配';
  return <section className={`yue-homophone-review ${summary?'name-reading-summary':'detail-section'}`} aria-label="粤语词汇联想复核">
    {summary?<strong>粤语词汇联想 · {state}</strong>:<h3>粤语词汇联想复核</h3>}
    <p className="muted small">{yueHomophoneCoverageLabel(review.version)}</p>
    <p>{review.mode==='ignore-tone'?'已开启忽略声调复核；严格同音与仅去调匹配分别标记。':'按已确认音节及声调严格比较。'}{!summary&&state+'。'}</p>
    <p className="muted small">匹配只提示具体词汇联想，不描述孩子的属性，不自动淘汰或降分。未命中不代表所有地方读法或谐音均已检查。</p>
    {!summary&&<>{review.matches.map((match,index)=>{const Container=match.category==='explicit-insult'?'details':'article';return <Container className="name-reading-summary" key={`${match.ruleId}-${index}`}>{match.category==='explicit-insult'&&<summary>所选字音与词典贬称有匹配，展开查看原词与语境</summary>}<h4>{match.span.text} → {match.term}</h4><p><strong>{match.comparison==='exact'?'所选音节与声调一致':'仅忽略声调时近似'}</strong> · 姓名第 {match.span.start+1}–{match.span.endExclusive} 字</p><p>所选 {match.actualTokens.join(' ')}；词条 {match.ruleTokens.join(' ')}</p><p>{match.notice}</p><details className="name-reading-provenance"><summary>原词义、语域与来源</summary><p>所载分类：{yueHomophoneCategoryLabel(match.category)} · 标签 {match.register.join('、')||'未标'}</p>{match.glosses.map(gloss=><div key={gloss.senseIndex}><p>义项 {gloss.senseIndex+1}{gloss.tags.length?' · '+gloss.tags.join('、'):''}</p><ul>{gloss.quotes.map((quote,i)=><li key={i}>{quote}</li>)}</ul>{gloss.rawTags&&gloss.rawTags.length>0&&<p>原词典标签：{gloss.rawTags.join('、')}（不据此推断地区使用频率）</p>}</div>)}<ul>{match.sourceRefs.map((source,i)=><li key={i}>{source.word} · {source.quote}<br/>{source.id} · {source.file}:{source.line} · {source.locator}<br/>{source.license} · {source.version}</li>)}</ul></details></Container>;})}
    {review.missing.map((message,index)=><p className="inline-warning" key={index}>{message}</p>)}
    <details className="name-reading-provenance"><summary>本次词表来源与检查范围</summary><ul>{review.limitations.map((message,index)=><li key={index}>{message}</li>)}</ul><ul>{review.sourceReferences.map((source,index)=><li key={index}>{source.word} · {source.file}:{source.line} · {source.locator}<br/>{source.id} · {source.version} · {source.license}</li>)}</ul><p>{review.version}</p></details></>}
  </section>;
}
