import React,{useId} from 'react';
import type {NamePhoneticReviewsSnapshot} from '../shared/name-phonetic-review-types';
import type {NamePhoneticReview,PhoneticLanguage,SelectedNamePhonetics} from '../../data/name-phonetic/name-phonetic-types';
import {phoneticLanguages,phoneticLanguageLabel,phoneticModeLabel,phoneticStateLabel,phoneticOriginLabel,phoneticScopeLabel,phoneticSourceRoleLabel,phoneticComparisonLabel} from '../shared/name-phonetic-presentation';
import './name-phonetic.css';

function SavedReading({reading,language}:{reading?:SelectedNamePhonetics;language:PhoneticLanguage}){
  return reading?<dl className="name-phonetic-readings">{[reading.surname,...reading.given].map((unit,index)=><div key={index}><dt>{index===0?'姓氏':'给名第'+index+'字'} · {unit.text}</dt><dd>{unit.selection?<>{unit.selection.tokens.join(' ')}<small>{phoneticOriginLabel(unit.selection.origin)}</small></>:'未确认，未评估'}</dd></div>)}</dl>:<p>未保存{phoneticLanguageLabel(language)}逐字读音，未评估。</p>;
}
function ReviewEvidence({review}:{review:NamePhoneticReview}){
  return <>
    {review.status==='not-assessed'?<ul className="name-phonetic-missing">{review.missing.map((message,index)=><li key={index}>{message}</li>)}</ul>:review.matches.map((match,index)=><details className="name-phonetic-match" key={`${match.rule.id}:${match.span.start}:${index}`}>
      <summary>姓名第 {match.span.start+1}–{match.span.endExclusive} 字 · {match.span.text} → 原词“{match.rule.term}” · {phoneticComparisonLabel(match.comparison)}</summary>
      <p>匹配范围：{phoneticScopeLabel(match.span.scope)}；所选音节 {match.actualTokens.join(' ')}；原词音节 {match.rule.tokens.join(' ')}。</p>
      {match.differentTonePositions.length>0&&<p>声调不同的全名字位：{match.differentTonePositions.map(position=>position+1).join('、')}。</p>}
      <p>{match.rule.notice}</p><p>原词分类标签：{match.rule.categories.join('、')||match.rule.category}</p>
      {match.rule.senses.map((sense,senseIndex)=><div className="name-phonetic-sense" key={`${sense.recordLine}:${sense.senseIndex}:${senseIndex}`}><h5>原词义项 {sense.senseIndex+1}</h5><ul>{sense.glosses.map((gloss,glossIndex)=><li key={glossIndex}>{gloss}</li>)}</ul><p>语域：{sense.registerDisplay.join('、')||'未标'}{sense.registerStatus==='unmarked'?'（来源未标，不推定中性）':''}</p>{sense.tags.length>0&&<p>来源标签：{sense.tags.join('、')}</p>}{sense.rawTags.length>0&&<p>原始标签：{sense.rawTags.join('、')}</p>}</div>)}
      <details className="name-phonetic-sources"><summary>查看这项原词义与读音的来源</summary><ul>{match.rule.sourceRefs.map((source,sourceIndex)=><li key={sourceIndex}>{source.word} · {phoneticSourceRoleLabel(source.role)}<br/>{source.id} · {source.file}:{source.line}<br/>{source.license}{source.rawPronunciation&&` · 原读音 ${source.rawPronunciation}`}<br/>{source.url}{source.soundTags?.length?<p>读音标签：{source.soundTags.join('、')}</p>:null}{source.soundRawTags?.length?<p>原读音标签：{source.soundRawTags.join('、')}</p>:null}</li>)}</ul></details>
    </details>)}
    <details className="name-phonetic-sources"><summary>保存的检查范围与版本</summary><p>{review.coverageNotice}</p><ul>{review.limitations.map((line,index)=><li key={index}>{line}</li>)}</ul><p>{review.version} · {review.sourceIds.join('、')}</p><p>规则摘要：{review.profileSha256}<br/>来源锁摘要：{review.sourceLockSha256}</p></details>
  </>;
}
/** Only a persisted wrapper is rendered. No preference, dictionary, profile or engine is imported. */
export function NamePhoneticReviewsView({snapshot,summary=false,enabled=false}:{snapshot?:NamePhoneticReviewsSnapshot;summary?:boolean;enabled?:boolean}){
  const id=useId();if(!snapshot&&!enabled)return null;
  return <section className={`name-phonetic-reviews ${summary?'name-phonetic-summary':'detail-section'}`} aria-labelledby={id}>
    {summary?<h4 id={id}>保存的词音复核</h4>:<h3 id={id}>普通话与粤语 · 词汇联想复核</h3>}
    {!snapshot?<p>此方案未保存本版词音复核记录，历史结果不补算。</p>:<>
      <p className="name-phonetic-scope">仅展示本方案保存的读音、版本和有限词表结果；词汇联想不描述孩子的属性，不自动淘汰或调整评分。</p>
      {phoneticLanguages.map(language=>{const review=snapshot.reviews[language];return review?<article key={language} data-phonetic-status={review.status}><h4>{phoneticLanguageLabel(language)} · {phoneticStateLabel(review)}</h4><p>{review.fullName} · {phoneticModeLabel(review.mode)} · {review.version}</p><SavedReading reading={snapshot.selectedReadings[language]} language={language}/>{summary?<details><summary>展开保存的逐项结果与来源</summary><ReviewEvidence review={review}/></details>:<ReviewEvidence review={review}/>}</article>:null;})}
      {!snapshot.reviews.cmn&&!snapshot.reviews.yue&&<p>保存记录没有语言结果，未评估。</p>}
    </>}
  </section>;
}
