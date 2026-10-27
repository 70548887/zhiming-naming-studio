import React,{useId,useState} from 'react';
import type {NameCandidate} from '../shared/types';
import {PARENT_NAME_REVIEW_VERSION} from '../shared/parent-name-phonetics-review';
import type {ParentNamePhoneticSnapshot} from '../shared/parent-name-phonetics-review';
import {canonicalPlainJson} from '../shared/plain-json';
import {ParentNamePhoneticsNotice} from './ParentNamePhoneticsNotice';
import {parentPhoneticsForNotice} from './parent-name-reading-adapter';
import './saved-parent-name-phonetics.css';

export type SavedParentNamePhoneticsCandidate=Pick<NameCandidate,'id'|'givenName'|'fullName'|'parentNamePhoneticReview'>;
type SavedDisplay={state:'absent'}|{state:'uninterpreted';reason:string}|{state:'recorded';snapshot:ParentNamePhoneticSnapshot};
const tokens=(value:unknown)=>value===null||Array.isArray(value)&&value.length<=4&&value.every(token=>typeof token==='string');
/** Display-version/binding checks only. Store/main owns canonical source authentication. */
export function savedParentNamePhoneticsDisplay(candidate:SavedParentNamePhoneticsCandidate):SavedDisplay {
 const field=Object.getOwnPropertyDescriptor(candidate,'parentNamePhoneticReview');
 if(!field||Object.hasOwn(field,'value')&&field.value===undefined)return{state:'absent'};
 try{
  if(!Object.hasOwn(field,'value')||!field.enumerable)throw Error('opaque');
  if(canonicalPlainJson(field.value).length>150000)throw Error('oversized');
  const saved=candidate.parentNamePhoneticReview;
  if(!saved||saved.version!==PARENT_NAME_REVIEW_VERSION||saved.recordState!=='recorded')return{state:'uninterpreted',reason:'此保存记录版本或状态尚未解释，未展示比较结论。'};
  const result=saved.result;
  if(!result||result.version!=='parent-name-phonetics/1.0.0'||!['strict','ignore-tone'].includes(result.mode)||result.scope!=='whole-given-name-syllables-only'||saved.capture.mode!==result.mode)return{state:'uninterpreted',reason:'此保存结果的版本或比较范围尚未解释，未展示比较结论。'};
  if(saved.candidateId!==candidate.id||saved.capture.child.givenName!==candidate.givenName||result.childGivenName!==candidate.givenName||result.childFullName!==candidate.fullName||saved.capture.child.surname+saved.capture.child.givenName!==candidate.fullName)return{state:'uninterpreted',reason:'保存记录与当前候选绑定不符，未展示比较结论。'};
  if(!Array.isArray(result.comparisons)||result.comparisons.length!==2||new Set(result.comparisons.map(row=>row.role)).size!==2)throw Error('rows');
  for(const row of result.comparisons){
   if(!['father','mother'].includes(row.role)||!['matched','no-match','not-assessed'].includes(row.status)||!['exact','tone-only',null].includes(row.comparison)||row.childGivenName!==candidate.givenName||typeof row.parentFullName!=='string'||row.parentGivenName!==null&&typeof row.parentGivenName!=='string'||typeof row.reason!=='string'||!tokens(row.parentTokens)||!tokens(row.actualChildTokens)||!Array.isArray(row.differentTonePositions)||row.differentTonePositions.some(position=>!Number.isInteger(position)||position<0||position>=[...candidate.givenName].length))throw Error('row shape');
   if(row.parentFullName!==saved.capture.parentNames[row.role==='father'?'fatherName':'motherName'])throw Error('parent binding');
   if(row.status==='matched'&&(row.comparison===null||row.parentTokens===null||row.actualChildTokens===null||result.mode==='strict'&&row.comparison==='tone-only')||row.status!=='matched'&&row.comparison!==null)throw Error('unsupported outcome');
  }
  if(typeof result.notice!=='string'||!Array.isArray(result.limitations)||result.limitations.some(line=>typeof line!=='string')||!saved.sourceSnapshot||typeof saved.sourceSnapshot.method?.name!=='string'||typeof saved.sourceSnapshot.method?.id!=='string')throw Error('saved metadata');
  return{state:'recorded',snapshot:saved};
 }catch{return{state:'uninterpreted',reason:'保存记录结构或绑定不可解释，未展示比较结论。'};}
}
function SavedSource({snapshot}:{snapshot:ParentNamePhoneticSnapshot}) {
 const [open,setOpen]=useState(false);
 return <details className="saved-parent-phonetic-source" onToggle={event=>setOpen(event.currentTarget.open)}><summary>查看保存范围与来源</summary><p>{snapshot.result.notice}</p><ul>{snapshot.result.limitations.map((line,index)=><li key={index}>{line}</li>)}</ul><p>{snapshot.sourceSnapshot.method.name} · {snapshot.sourceSnapshot.method.id}</p><p>家庭确认与固定词典来源按保存记录保留；浏览不会重新查询词典。</p>{open&&<pre>{JSON.stringify(snapshot.sourceSnapshot,null,2)}</pre>}</details>;
}
function RecordedBody({snapshot}:{snapshot:ParentNamePhoneticSnapshot}) {
 const result=snapshot.result;
 return <><p className="saved-parent-phonetic-binding">保存的候选：{result.childFullName} · 完整给名：{result.childGivenName}</p><ParentNamePhoneticsNotice mode={result.mode} rows={parentPhoneticsForNotice(result)}/>{result.comparisons.filter(row=>row.comparison==='tone-only'&&row.differentTonePositions.length>0).map(row=><p className="saved-parent-phonetic-tone" key={row.role}>{row.role==='father'?'爸爸':'妈妈'}对应的给名异调字位：{row.differentTonePositions.map(position=>position+1).join('、')}。</p>)}<SavedSource snapshot={snapshot}/></>;
}
const rowLabel=(row:ParentNamePhoneticSnapshot['result']['comparisons'][number])=>`${row.role==='father'?'爸爸':'妈妈'}：${row.status==='not-assessed'?'尚未比较':row.status==='no-match'?'本范围未匹配':row.comparison==='tone-only'?'音同调异':'音节声调相同'}`;
/** Saved result only: no profile, preferences, API, dictionary or evaluator input. */
export function SavedParentNamePhoneticsView({candidate,summary=false}:{candidate:SavedParentNamePhoneticsCandidate;summary?:boolean}) {
 const id=useId(),display=savedParentNamePhoneticsDisplay(candidate);
 if(display.state==='absent')return null;
 if(display.state==='uninterpreted')return <section className="saved-parent-phonetics saved-parent-phonetics-opaque" aria-labelledby={id}>{summary?<h4 id={id}>家庭给名读音 · 保存记录未解释</h4>:<h3 id={id}>家庭给名读音 · 保存记录未解释</h3>}<p>{display.reason}</p><p>保留原记录，不从当前父母资料或偏好回算。</p></section>;
 const snapshot=display.snapshot;
 return summary?<details className="saved-parent-phonetics saved-parent-phonetics-summary"><summary>家庭给名读音 · 已保存<span>{snapshot.result.comparisons.map(rowLabel).join('；')}</span></summary><RecordedBody snapshot={snapshot}/></details>:<section className="saved-parent-phonetics detail-section" aria-labelledby={id}><h3 id={id}>家庭给名读音比较 · 已保存</h3><RecordedBody snapshot={snapshot}/></section>;
}
