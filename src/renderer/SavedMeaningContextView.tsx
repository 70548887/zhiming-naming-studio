import React,{useId} from 'react';
import type {SavedMeaningContextReview} from '../shared/meaning-context-review';
import {validSavedMeaningContextReview} from '../shared/meaning-context-review';
import './meaning-context.css';

export interface MeaningContextViewCandidate{id:string;givenName:string;fullName:string;}
const text=(value:unknown)=>typeof value==='string'?value:'';
const record=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const strings=(value:unknown)=>Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'):[];
export function boundSavedMeaningContext(review:unknown,candidate:MeaningContextViewCandidate,sessionId?:string):review is SavedMeaningContextReview{
 return validSavedMeaningContextReview(review)&&review.candidateId===candidate.id&&review.givenName===candidate.givenName&&review.fullName===candidate.fullName&&(!sessionId||review.sessionId===sessionId);
}
/** This view reads only saved rows. It never recreates a result from current options or data. */
export function SavedMeaningContextView({candidate,review,sessionId,summary=false,showMissing=true}:{candidate:MeaningContextViewCandidate;review?:SavedMeaningContextReview;sessionId?:string;summary?:boolean;showMissing?:boolean}){
 const id=useId();
 if(!review)return showMissing?<p className="meaning-context-missing">此记录未保存本批完整词义参考，沿用原解释；不据此认定未覆盖或已经采用。</p>:null;
 if(!boundSavedMeaningContext(review,candidate,sessionId))return <p className="meaning-context-missing">保存的词义参考身份或版本不匹配，未显示为已采用解释。</p>;
 const content=<>
  <p className="meaning-context-scope">以下只记完整词义参考；不批准通用单字义或完整姓名，不改变评分。</p>
  <dl className="meaning-context-saved-readings">{review.binding.characters.map(row=><div key={row.position}><dt>名字第 {row.position+1} 字 · {row.char}</dt><dd>{row.pinyin} · {row.tone} 声 · {review.confirmedReadings.some(value=>value.position===row.position)?'本方案读音已确认':'读音未确认'}</dd></div>)}</dl>
  {review.rows.map(row=>{const result=row.result;
   if(result.status!=='explanation-ready')return <p className="meaning-context-row-state" key={row.position}>名字第 {row.position+1} 字“{row.char}”：{result.status==='not-covered'?'在此完整给名中无本批条件证据':result.status==='needs-confirmed-reading'?'读音待确认':result.status==='needs-explicit-choice'?'尚未选择具体词义与场景':result.reason}</p>;
   if(result.independentCharacterMeaningApproved!==false||result.wholeNameApproved!==false||result.automaticSemanticCreditAllowed!==false||result.scoreDelta!==0||result.givenName!==candidate.givenName||typeof result.dictionaryOriginal!=='string'||typeof result.reason!=='string'||!Array.isArray(result.exclusions)||!result.exclusions.every(line=>typeof line==='string')||record(record(result.source).definition).def!==result.dictionaryOriginal)return <p className="meaning-context-row-state" key={row.position}>名字第 {row.position+1} 字的保存状态不完整或不一致，未显示为已采用解释。</p>;
   const source=record(result.source),definition=record(source.definition),grammar=record(result.grammar),selected=record(result.selectedContext);
   return <article className="meaning-context-adopted" key={row.position}><h5>已保存的整词参考 · 名字第 {row.position+1} 字“{row.char}”</h5><p>完整给名：{result.givenName} · 采用场景：{text(selected.contextLabel)}</p>
    <h6>词典原文</h6><blockquote>{result.dictionaryOriginal}</blockquote>
    {strings(definition.quote).length>0&&<div><h6>原条引文</h6><ul>{strings(definition.quote).map((line,index)=><li key={index}>{line}</li>)}</ul></div>}
    {strings(definition.example).length>0&&<div><h6>原条例句</h6><ul>{strings(definition.example).map((line,index)=><li key={index}>{line}</li>)}</ul></div>}
    <div className="meaning-context-project"><h6>项目语法与取义说明</h6><p>{text(grammar.text)}</p><p>{result.reason}</p><ul>{result.exclusions.map((line,index)=><li key={index}>{line}</li>)}</ul></div>
    <details className="meaning-context-source"><summary tabIndex={0}>查看保存的来源锚点与许可</summary><p>原词条：{text(source.word)} · {text(source.pinyin)}</p><p>来源 {text(source.id)} · {text(source.originalFile)}</p><p>原索引：条 {String(source.rawEntryIndex??'')} / 音 {String(source.rawHeteronymIndex??'')} / 义 {String(source.rawDefinitionIndex??'')}（来源索引从 0 开始）</p><p>词典许可：{text(source.license)}；项目说明：CC0 1.0。</p><p>固定原件摘要：{text(source.originalSha256)}</p></details>
   </article>;
  })}
  <details className="meaning-context-source"><summary tabIndex={0}>查看本次独立参考的数据身份</summary><p>{review.version} · {review.source.sourceId}</p><p>资料摘要：{review.source.dataSha256}<br/>来源锁：{review.source.sourceLockSha256}</p></details>
 </>;
 return <section className={`saved-meaning-context ${summary?'meaning-context-summary':''}`} aria-labelledby={id}>
  {summary?<details><summary id={id} tabIndex={0}>完整词义参考 · 查看已保存选择</summary>{content}</details>:<><h4 id={id}>已保存的完整词义参考</h4>{content}</>}
 </section>;
}
