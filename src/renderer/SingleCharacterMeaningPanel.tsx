import React,{useEffect,useId,useMemo,useRef,useSyncExternalStore} from 'react';
import type {SingleCharacterMeaningOptions,SingleCharacterMeaningOption} from '../shared/single-character-meaning';
import {createCharacterMeaningController,hasSingleCharacterMeaningQuery,type CharacterMeaningState,type SingleCharacterMeaningQueryApi} from './single-character-meaning-state';
import './single-character-meaning.css';

const own=(value:unknown,key:string):unknown=>{if(!value||typeof value!=='object')return undefined;try{const d=Object.getOwnPropertyDescriptor(value,key);return d&&Object.hasOwn(d,'value')?d.value:undefined;}catch{return undefined;}};
const string=(value:unknown)=>typeof value==='string'?value:'';
const list=(value:unknown):string[]=>{if(!Array.isArray(value))return[];const rows:string[]=[];for(let i=0;i<value.length;i++){const v=own(value,String(i));if(typeof v==='string')rows.push(v);}return rows;};
const toneLabel=(tone:number)=>tone===5?'轻声':`第 ${tone} 声`;
const materialLabel=(batch:SingleCharacterMeaningOption['batch'])=>batch.admission==='approved-character-notes'&&!batch.candidateOnly?'已审按需资料':'候选批次资料';
function CharacterMeaningOptionView({option}:{option:SingleCharacterMeaningOption}){
 const source=option.source,definition=source.definition,quotes=list(own(definition,'quote')),examples=list(own(definition,'example')),links=list(own(definition,'link'));
 return <article className="scm-option">
  <header><h4>{option.char} · {option.pinyin} <small>{toneLabel(option.tone)}</small></h4><span className={'scm-material '+(option.batch.candidateOnly?'scm-candidate':'scm-reviewed')}>{materialLabel(option.batch)}</span></header>
  <div className="scm-reading-grid"><section><h5>本次实际选音</h5><p>{option.pinyin} · {toneLabel(option.tone)}</p><small>以下原文与项目解释仅对应这一读音。</small></section><section><h5>资料默认读音 · 对照</h5>{option.defaultReading?<><p>{option.defaultReading.pinyin} · {toneLabel(option.defaultReading.tone)}</p><small>保留作对照，未用于解释本次异读。</small></>:<p className="scm-muted">本次返回未单列默认读音，不补猜或替换。</p>}</section></div>
  <div className="scm-explanation-grid"><section className="scm-dictionary" aria-label="字典原文"><h5>字典原文</h5><p className="scm-pos">原词条：{source.word} · {source.pinyin}<br/>原词性：{source.sourcePOS||'未标注'}</p><blockquote>{string(own(definition,'def'))}</blockquote>{quotes.length>0&&<><h6>原文所引文献</h6>{quotes.map((line,index)=><p className="scm-verbatim" key={index}>{line}</p>)}</>}{examples.length>0&&<><h6>原例</h6>{examples.map((line,index)=><p className="scm-verbatim" key={index}>{line}</p>)}</>}{links.length>0&&<><h6>原参见说明</h6>{links.map((line,index)=><p className="scm-verbatim" key={index}>{line}</p>)}</>}<p className="scm-license">{source.sourceId==='moe-revised'?'教育部《重编国语辞典修订本》电子资料':source.sourceId}<br/>资料许可：{source.license}</p></section>
   <section className="scm-project" aria-label="项目解释与限制"><h5>项目解释与限制</h5><p>{option.project.meaning}</p>{option.project.projectWish&&<p><strong>项目寄意：</strong>{option.project.projectWish}</p>}<ul>{[...new Set([...option.project.limits,...option.limits])].map((line,index)=><li key={index}>{line}</li>)}</ul><p className="scm-license">以上解释与寄意属于项目说明，不是辞书原文。<br/>项目说明许可：{option.project.license}</p></section></div>
  <details className="scm-details"><summary>查看资料状态与默认读音对照</summary><p>{materialLabel(option.batch)} · 仅按请求查阅；不表示已加入自动起名范围。</p>{option.batch.candidateOnly&&<p>候选批次原义与解释单列展示，未转为已审按需资料。</p>}{option.defaultReading&&<><h6>默认读音原有释义（仅作对照）</h6><p>{option.defaultReading.word} · {option.defaultReading.pinyin}</p><ul>{option.defaultReading.meanings.map((meaning,index)=><li key={index}>{meaning}</li>)}</ul></>}<p>本次查阅不形成整名含义，不自动采纳或加分。</p></details>
 </article>;
}
export function SingleCharacterMeaningResults({result}:{result:SingleCharacterMeaningOptions}){
 if(result.status==='ambiguous-reading')return <div className="scm-empty" role="status"><strong>请明确本次读音与声调</strong><p>“{result.char}”存在需要分别核对的读音。请填写带调拼音并指定声调，再点击查阅。当前未替你选择异读，也未借用默认读音的释义。</p></div>;
 if(result.status==='not-covered')return <div className="scm-empty" role="status"><strong>当前条件未覆盖</strong><p>“{result.char}”{result.pinyin?'（'+result.pinyin+'）':''}的当前读音或声调条件暂无这批补充释义；不自动改读音，也不据此认定这个字没有含义。</p></div>;
 return <div className="scm-results"><p className="scm-result-count">本次实际选音：{result.pinyin} · {result.options.length} 项补充释义</p>{result.options.map((option,index)=><CharacterMeaningOptionView key={option.char+':'+option.pinyin+':'+option.tone+':'+index} option={option}/>)}{result.limits.length>0&&<details className="scm-details"><summary>本次查询的适用限制</summary><ul>{result.limits.map((limit,index)=><li key={index}>{limit}</li>)}</ul></details>}</div>;
}
export interface CharacterMeaningQueryViewProps {idPrefix:string;state:CharacterMeaningState;available:boolean;disabled?:boolean;onChar:(value:string)=>void;onPinyin:(value:string)=>void;onTone:(value:string)=>void;onQuery:()=>void;}
export function CharacterMeaningQueryView({idPrefix:id,state,available,disabled=false,onChar,onPinyin,onTone,onQuery}:CharacterMeaningQueryViewProps){
 const loading=state.phase==='loading',hint=id+'-hint',error=id+'-error';
 return <section className="single-character-meaning panel" aria-labelledby={id+'-heading'} aria-busy={loading}><header className="scm-heading"><p className="scm-eyebrow">逐字查阅 · 按音分义</p><h3 id={id+'-heading'}>逐字释义补充</h3><p>查询一个字的补充原义，核对所选读音与资料状态。</p></header>
  <form className="scm-form" onSubmit={event=>{event.preventDefault();onQuery();}}><div><label htmlFor={id+'-char'}>查询汉字</label><input id={id+'-char'} value={state.char} required disabled={disabled} autoComplete="off" onChange={event=>onChar(event.target.value)} aria-invalid={state.inputError||undefined} aria-describedby={state.error?hint+' '+error:hint}/></div><div><label htmlFor={id+'-pinyin'}>带调拼音（选填）</label><input id={id+'-pinyin'} value={state.pinyin} disabled={disabled} autoComplete="off" onChange={event=>onPinyin(event.target.value)} aria-describedby={hint}/></div><div><label htmlFor={id+'-tone'}>声调（选填）</label><select id={id+'-tone'} value={state.tone} disabled={disabled} onChange={event=>onTone(event.target.value)} aria-describedby={hint}><option value="">不指定</option><option value="1">第 1 声</option><option value="2">第 2 声</option><option value="3">第 3 声</option><option value="4">第 4 声</option><option value="5">轻声</option></select></div><button className="button secondary" type="submit" disabled={disabled||!available||loading}>{loading?'正在查阅…':state.phase==='error'?'重试查阅':'查阅释义'}</button></form>
  <p className="scm-hint" id={hint}>留空的拼音和声调不发送筛选；填写时按原值精确查询，不自动去声调、补声调或替换读音。部分异读需同时指定拼音与声调。</p>
  {!available?<p className="scm-notice" role="status">逐字释义服务尚未接通，输入保留供稍后查阅。</p>:state.phase==='idle'?<p className="scm-notice" role="status">{state.notice||'填好条件后点击“查阅释义”，不会自动查询。'}</p>:null}
  {loading&&<p className="scm-notice" role="status">正在核对本次资料；查询条件或服务变化后，旧结果不会写入当前展示。</p>}
  {state.error&&<p className="scm-error" id={error} role="alert">{state.error}</p>}
  {state.phase==='ready'&&state.result&&<SingleCharacterMeaningResults result={state.result}/>}
  <p className="scm-boundary">仅按请求补充查阅，已审按需资料与候选资料分别标注；不自动增加命名覆盖，不改变评分、候选排序或整名结论。</p>
 </section>;
}
export interface SingleCharacterMeaningPanelProps {api?:SingleCharacterMeaningQueryApi;disabled?:boolean;}
export function SingleCharacterMeaningPanel({api,disabled=false}:SingleCharacterMeaningPanelProps){
 const id=useId(),latest=useRef({api,disabled});latest.current={api,disabled};const controller=useMemo(()=>createCharacterMeaningController({getApi:()=>latest.current.api,isDisabled:()=>latest.current.disabled}),[]),state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
 useEffect(()=>{controller.activate();return()=>controller.dispose();},[controller]);useEffect(()=>controller.refreshApi(),[controller,api]);const current=state.api===api?state:{char:state.char,pinyin:state.pinyin,tone:state.tone,phase:'idle' as const,api,notice:'查询服务已更新，请重新查阅。'};
 return <CharacterMeaningQueryView idPrefix={id} state={current} available={hasSingleCharacterMeaningQuery(api)} disabled={disabled} onChar={controller.setChar} onPinyin={controller.setPinyin} onTone={controller.setTone} onQuery={()=>void controller.query()}/>;
}
