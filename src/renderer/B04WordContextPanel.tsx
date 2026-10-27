import React,{useEffect,useId,useMemo,useRef,useSyncExternalStore} from 'react';
import type {B04WordContextApi,B04WordContextOption,B04WordContextOptions} from '../shared/b04-word-context';
import {createB04QueryController,hasB04WordContextApi,type B04QueryState} from './b04-word-context-state';
import './b04-word-context.css';

const stringValue=(value:unknown)=>typeof value==='string'?value:'';
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const ownValue=(value:unknown,key:string):unknown=>{if(!value||typeof value!=='object')return undefined;try{const descriptor=Object.getOwnPropertyDescriptor(value,key);return descriptor&&Object.hasOwn(descriptor,'value')?descriptor.value:undefined;}catch{return undefined;}};
const lines=(value:unknown):string[]=>{if(!Array.isArray(value))return[];const result:string[]=[];for(let index=0;index<value.length;index++){const item=ownValue(value,String(index));if(typeof item==='string')result.push(item);}return result;};
function WordContextOption({option,char,pinyin}:{option:B04WordContextOption;char:string;pinyin:string|null}){
 const source=record(ownValue(option,'source')),definition=record(ownValue(source,'definition')),original=stringValue(ownValue(definition,'def')),sourceWord=stringValue(ownValue(source,'word')),sourcePinyin=stringValue(ownValue(source,'pinyin')),license=stringValue(ownValue(source,'license')),sourceId=stringValue(ownValue(source,'sourceId')),quotes=lines(ownValue(definition,'quote')),examples=lines(ownValue(definition,'example')),links=lines(ownValue(definition,'link')),grammarText=stringValue(ownValue(record(ownValue(option,'grammar')),'text'));
 const targetReadings=[...new Set(option.confirmedReadings.flatMap(reading=>ownValue(reading,'char')===char&&typeof ownValue(reading,'pinyin')==='string'&&(!pinyin||ownValue(reading,'pinyin')===pinyin)?[String(ownValue(reading,'pinyin'))]:[]))];
 return <article className="b04-word-option">
  <header><h4>{option.word}</h4><span className="b04-word-label">完整词语</span></header>
  <p className="b04-word-reading">词语读音：{sourcePinyin||'未提供'}<span>词性：未知</span></p>
  {targetReadings.length>0&&<p className="b04-word-reading">该词中“{char}”的读音：{targetReadings.join('、')}</p>}
  <h5>词典原文释义</h5>{original?<blockquote>{original}</blockquote>:<p>本次资料未附可展示的原文释义。</p>}
  {quotes.length>0&&<div className="b04-word-original"><h5>原文所引文献</h5>{quotes.map((quote,index)=><p key={index}>{quote}</p>)}</div>}
  {examples.length>0&&<div className="b04-word-original"><h5>词典原例</h5>{examples.map((example,index)=><p key={index}>{example}</p>)}</div>}
  {links.length>0&&<div className="b04-word-original"><h5>词典参见说明</h5>{links.map((link,index)=><p key={index}>{link}</p>)}</div>}
  <details><summary>查看词境说明与出处</summary>
   <div className="b04-word-project"><h5>项目词境说明</h5><p>{option.contextLabel}</p>{grammarText&&<p>{grammarText}</p>}<p>{option.reason}</p>{option.exclusions.length>0&&<ul>{option.exclusions.map((line,index)=><li key={index}>{line}</li>)}</ul>}</div>
   <h5>词典出处</h5>{sourceWord?<>{sourceId==='moe-revised'&&<p>教育部《重编国语辞典修订本》电子资料</p>}<p>原词条：{sourceWord}{sourcePinyin?' · '+sourcePinyin:''}</p></>:<p>本次资料未附可展示的词条出处。</p>}{license&&<p>资料许可：{license}</p>}
  </details>
 </article>;
}
export function B04WordContextResults({result}:{result:B04WordContextOptions}){
 if(result.status==='not-covered')return <div className="b04-word-empty" role="status"><strong>当前查询未收录词境</strong><p>“{result.char}”{result.pinyin?'（'+result.pinyin+'）':''}暂没有可展示的完整词语参考。{result.pinyin?'可留空读音，查询该字已收录的词境。':''}未收录不表示该字没有含义，也不表示不适合入名。</p></div>;
 return <div className="b04-word-results"><p className="b04-word-count">“{result.char}”{result.pinyin?' · '+result.pinyin:''} · {result.options.length} 项完整词语参考</p><p className="b04-word-scope">以下释义属于完整词语，不拆作查询字的新增单字释义；词境参考不等于整名寓意或名字推荐。</p>{result.options.map((option,index)=><WordContextOption key={option.selection.caseId+':'+option.selection.contextKey+':'+index} option={option} char={result.char} pinyin={result.pinyin}/>)}</div>;
}
export interface B04WordContextQueryViewProps {idPrefix:string;state:B04QueryState;available:boolean;disabled?:boolean;onChar:(value:string)=>void;onPinyin:(value:string)=>void;onQuery:()=>void;}
export function B04WordContextQueryView({idPrefix:id,state,available,disabled=false,onChar,onPinyin,onQuery}:B04WordContextQueryViewProps){
 const loading=state.phase==='loading',errorId=id+'-error',hintId=id+'-hint';
 return <section className="b04-word-context panel" aria-labelledby={id+'-heading'} aria-busy={loading}>
  <header className="b04-word-heading"><p className="b04-word-eyebrow">查阅原义 · 保留语境</p><h2 id={id+'-heading'}>完整词语词境查询</h2><p>输入一个汉字，手动查看已收录的完整词语、原文释义与出处。</p></header>
  <form onSubmit={event=>{event.preventDefault();onQuery();}} className="b04-word-form">
   <div><label htmlFor={id+'-char'}>查询汉字</label><input id={id+'-char'} value={state.char} onChange={event=>onChar(event.target.value)} disabled={disabled} required autoComplete="off" aria-invalid={state.errorKind==='input'||undefined} aria-describedby={state.error?hintId+' '+errorId:hintId}/></div>
   <div><label htmlFor={id+'-pinyin'}>读音（选填）</label><input id={id+'-pinyin'} value={state.pinyin} onChange={event=>onPinyin(event.target.value)} disabled={disabled} autoComplete="off" aria-describedby={hintId}/></div>
   <button type="submit" className="button secondary" disabled={disabled||!available||loading}>{loading?'正在查询词境…':state.phase==='error'?'重试词境查询':'查询词境'}</button>
  </form>
  <p id={hintId} className="b04-word-hint">读音按词典标注精确匹配；留空查看该字已收录的词境。修改输入后需重新查询。</p>
  {!available?<p className="b04-word-notice" role="status">词境查询服务尚未接通，当前输入仍保留。</p>:state.phase==='idle'?<p className="b04-word-notice" role="status">{state.notice||'填写查询条件后，点击“查询词境”。'}</p>:null}
  {loading&&<p className="b04-word-notice" role="status">正在读取本次词境，输入修改后旧回包不会作为新查询结果。</p>}
  {state.error&&<p id={errorId} className="b04-word-error" role="alert">{state.error}</p>}
  {state.phase==='ready'&&state.result&&<B04WordContextResults result={state.result}/>}
  <p className="b04-word-boundary">词性未知 · 仅供查阅词境。查询不自动采纳，不改变评分或候选排序，也不形成整名结论。</p>
 </section>;
}
export interface B04WordContextPanelProps {api?:B04WordContextApi;disabled?:boolean;initialChar?:string;initialPinyin?:string;}
export function B04WordContextPanel({api,disabled=false,initialChar='',initialPinyin=''}:B04WordContextPanelProps){
 const id=useId(),latest=useRef({api,disabled});latest.current={api,disabled};
 const controller=useMemo(()=>createB04QueryController({getApi:()=>latest.current.api,isDisabled:()=>latest.current.disabled,initialChar,initialPinyin}),[]);
 const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
 useEffect(()=>{controller.activate();return()=>controller.dispose();},[controller]);useEffect(()=>controller.refreshApi(),[controller,api]);
 const current=state.api===api?state:{char:state.char,pinyin:state.pinyin,phase:'idle' as const,api,notice:'查询服务已更新，请重新查询。'};
 return <B04WordContextQueryView idPrefix={id} state={current} available={hasB04WordContextApi(api)} disabled={disabled} onChar={controller.setChar} onPinyin={controller.setPinyin} onQuery={()=>void controller.query()}/>;
}
