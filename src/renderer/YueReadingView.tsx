import React,{useEffect,useId,useState} from 'react';
import {Check} from 'lucide-react';
import type {YueNameReading,YueReadingSelection,YueReadingSelections,YueReadingUnit} from '../shared/types';
import {parseJyutpingInput,yueReadingSelections} from '../domain/yue-reading';
import './name-reading.css';

const statuses={unconfirmed:'读音待确认',partial:'部分读音已确认',confirmed:'所选字音已确认'} as const;
type UnitDraft={choice:string;manual:string};
const unitDraft=(unit:YueReadingUnit):UnitDraft=>({choice:unit.selection?.origin==='dictionary'?unit.selection.dictionaryId??'':unit.selection?.origin==='user'?'user':'',manual:unit.selection?.origin==='user'?unit.selection.tokens.join(' '):''});
const draftsFor=(analysis:YueNameReading)=>[analysis.surname,...analysis.given].map(unitDraft);
const selectionKey=(selections:YueReadingSelections)=>JSON.stringify([selections.surname,...selections.given].map(value=>value?[value.origin,value.confirmed,value.dictionaryId??null,value.tokens]:null));
const selectionsFor=(analysis:YueNameReading,drafts:UnitDraft[]):YueReadingSelections=>{
  const values=[analysis.surname,...analysis.given].map((unit,index):YueReadingSelection|null=>{
    const draft=drafts[index];if(!draft.choice)return null;
    if(draft.choice==='user')return {tokens:parseJyutpingInput(draft.manual,[...unit.text].length),origin:'user',confirmed:true};
    const reading=unit.candidates.find(candidate=>candidate.id===draft.choice);if(!reading)throw new Error('所选粤拼候选已失效，请重新选择。');
    return {tokens:[...reading.tokens],dictionaryId:reading.id,origin:'dictionary',confirmed:true};
  });
  return {surname:values[0],given:values.slice(1)};
};

export function YueReadingSummary({analysis,homophones=false}:{analysis?:YueNameReading;homophones?:boolean}){
  if(!analysis)return null;
  return <div className="name-reading-summary yue-reading-reference"><strong>粤语读音参考 · {statuses[analysis.status]}</strong><p>{analysis.status==='confirmed'?analysis.fullNameTokens.join(' '):[analysis.surname,...analysis.given].map(unit=>`${unit.text}：${unit.selection?.tokens.join(' ')||'待确认'}`).join('；')}</p><small>Jyutping 粤拼 · 所选字音组合，未做连读音变{homophones?'；有限词汇复核另列':'或粤语谐音词检查'}</small></div>;
}

export function YueReadingView({analysis,homophones=false,busy=false,onConfirm,onDirtyChange}:{analysis?:YueNameReading;homophones?:boolean;busy?:boolean;onConfirm?:(selections:YueReadingSelections)=>Promise<boolean>;onDirtyChange?:(dirty:boolean)=>void}){
  const id=useId();
  const signature=JSON.stringify(analysis?[analysis.surname.selection,...analysis.given.map(unit=>unit.selection)]:null);
  const [drafts,setDrafts]=useState<UnitDraft[]>(()=>analysis?draftsFor(analysis):[]),[error,setError]=useState('');
  useEffect(()=>{setDrafts(analysis?draftsFor(analysis):[]);setError('');},[signature]);
  const dirty=!!analysis&&(()=>{try{return selectionKey(selectionsFor(analysis,drafts))!==selectionKey(yueReadingSelections(analysis));}catch{return true;}})();
  useEffect(()=>{onDirtyChange?.(dirty);},[dirty,onDirtyChange]);
  useEffect(()=>()=>onDirtyChange?.(false),[onDirtyChange]);
  if(!analysis)return null;
  const update=(index:number,patch:Partial<UnitDraft>)=>{setDrafts(values=>values.map((value,i)=>i===index?{...value,...patch}:value));setError('');};
  const save=async()=>{try{setError('');const selections=selectionsFor(analysis,drafts);if(onConfirm&&!await onConfirm(selections))setError('粤语读音未保存，选择仍保留，请重试。');}catch(cause){setError(cause instanceof Error?cause.message:String(cause));}};
  return <section className="detail-section yue-reading" aria-label="粤语读音确认"><h3>粤语读音参考</h3><YueReadingSummary analysis={analysis} homophones={homophones}/>
    <p>请按家庭实际采用的读音确认姓氏及名字。词典提供候选；简繁字形只用于查找，不改变姓名原字。复姓按整体确认。</p>
    <div className="name-reading-units">{[analysis.surname,...analysis.given].map((unit,index)=>{
      const draft=drafts[index]??unitDraft(unit),control=`${id}-unit-${index}`;
      return <article key={index}><h4>{index===0?'姓氏':'名字第'+index+'字'} · {unit.text}</h4>
        {onConfirm?<><label htmlFor={control}>选择本家庭采用的粤拼</label><select id={control} disabled={busy} value={draft.choice} onChange={event=>update(index,{choice:event.target.value})}>
          <option value="">尚未确认</option>{unit.candidates.map(candidate=><option key={candidate.id} value={candidate.id}>{candidate.tokens.join(' ')} · 词典原字 {candidate.text}</option>)}<option value="user">手动填写家庭确认读音</option>
        </select>{draft.choice==='user'&&<><label htmlFor={`${control}-manual`}>家庭确认读音（每字一个带 1–6 调号的音节）</label><input id={`${control}-manual`} disabled={busy} value={draft.manual} maxLength={80} autoCapitalize="none" spellCheck={false} placeholder={index===0&&[...unit.text].length>1?'如 au1 joeng4':'如 cing1'} onChange={event=>update(index,{manual:event.target.value})}/></>}
        {!unit.candidates.length&&<p className="name-reading-options-help">没有本姓名单位的词典候选，请由家庭确认后填写。不会自动拼接复姓的单字候选。</p>}</>:<p>{unit.selection?.tokens.join(' ')||'待确认'} · {unit.selection?.origin==='dictionary'?'已确认词典候选':unit.selection?.origin==='user'?'家庭手工确认':'未选择'}</p>}
        <details className="name-reading-provenance"><summary>查看本单位的字典候选与出处（{unit.candidates.length}）</summary><ul>{unit.candidates.map(candidate=><li key={candidate.id}>{candidate.text} · {candidate.tokens.join(' ')}<br/>{candidate.sourceId} / {candidate.sourceVersion} · {candidate.sourceFile}:{candidate.sourceLine}</li>)}</ul></details>
      </article>;
    })}</div>
    {onConfirm&&<div className="yue-reading-action"><span role="status">{dirty?'粤语读音选择尚未保存':'粤语读音选择已保存'}</span><button className="button secondary" type="button" disabled={busy||!dirty} onClick={()=>void save()}><Check size={15}/>确认并保存粤语读音</button></div>}
    {error&&<p className="inline-error" role="alert">{error}</p>}
    <details className="name-reading-provenance"><summary>参考范围与数据版本</summary><p>{analysis.version} · {analysis.sourceIds.join('、')}</p><ul>{analysis.limitations.map((item,index)=><li key={index}>{item}</li>)}</ul>{homophones&&<p>以上为读音模块1.0自身范围；本方案另启用的有限词汇复核在独立章节保存模式、结果和来源。</p>}</details>
  </section>;
}
