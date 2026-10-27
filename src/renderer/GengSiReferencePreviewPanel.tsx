import React,{useEffect,useId,useRef,useState} from 'react';
import type {BirthProfile} from '../shared/types';
import type {GengSiReferenceApi,GengSiReferencePreview} from '../shared/geng-si-reference';
import {TraditionalCoreReferenceView} from './TraditionalCoreReferenceView';
import {gengSiReferenceDisplay} from './geng-si-reference-display';

export interface GengSiReferencePreviewPanelProps {profile:BirthProfile;api?:GengSiReferenceApi;disabled?:boolean;}
export function hasGengSiReferenceApi(value:unknown):value is GengSiReferenceApi {
 if(!value||typeof value!=='object')return false;
 const method=Object.getOwnPropertyDescriptor(value,'previewGengSiReference');
 return !!method&&Object.hasOwn(method,'value')&&typeof method.value==='function';
}
/** Explicit readonly M493 request. It never changes a profile, saved session, favorable elements or candidate order. */
export function GengSiReferencePreviewPanel({profile,api,disabled=false}:GengSiReferencePreviewPanelProps){
 const id=useId(),key=JSON.stringify(profile),identity=useRef({key,api,epoch:0}),request=useRef(0);
 if(identity.current.key!==key||identity.current.api!==api)identity.current={key,api,epoch:identity.current.epoch+1};
 const [state,setState]=useState<{key:string;epoch:number;pending:boolean;result?:GengSiReferencePreview;error?:string}>({key,epoch:identity.current.epoch,pending:false});
 const alive=useRef(false);useEffect(()=>{alive.current=true;return()=>{alive.current=false;request.current++;};},[]);
 const current=state.key===key&&state.epoch===identity.current.epoch?state:undefined;
 const available=typeof api?.previewGengSiReference==='function';
 const read=async()=>{
  if(disabled||!available||current?.pending)return;
  const lease={...identity.current},number=++request.current,sent=structuredClone(profile);
  setState({key,epoch:lease.epoch,pending:true});
  const owns=()=>alive.current&&number===request.current&&identity.current.key===lease.key&&identity.current.epoch===lease.epoch&&identity.current.api===lease.api;
  try{
   const result=await api!.previewGengSiReference(sent);if(!owns())return;
   if(result.schema!=='geng-si-reference-preview/1.0.0'||result.profileId!==sent.id||result.sourceVerification.status!=='verified-fixed-resources'||result.sourceVerification.school!=='qiongtong-wikisource-2294674'||!gengSiReferenceDisplay(result.explanation)||result.sourceVerification.quote!==result.explanation.paragraph.source.quote||result.sourceVerification.locator!==result.explanation.paragraph.source.locator)throw Error('只读旁证返回的客户、来源或条文范围不一致，未采用结果。');
   setState({key,epoch:lease.epoch,pending:false,result});
  }catch(error){if(owns())setState({key,epoch:lease.epoch,pending:false,error:error instanceof Error?error.message:'读取条文旁证未完成，请保留当前资料。'});}
 };
 const result=current?.result,display=gengSiReferenceDisplay(result?.explanation);
 return <section className="tc-reference-preview" aria-labelledby={id}>
  <h2 id={id}>调候条文旁证（无排序）</h2><p>按当前出生资料明确读取一次。只核对庚日巳月条文、条件事实与固定来源，不保存资料，不改喜用、评分或候选。</p>
  {!available&&<p role="status">只读旁证服务尚未接通，当前不会补算或借用历史结论。</p>}
  <button type="button" className="button secondary" disabled={disabled||!available||!!current?.pending} onClick={()=>void read()}>{current?.pending?'正在读取条文旁证…':'读取本条调候旁证'}</button>
  {current?.pending&&<p role="status">只读请求正在进行；资料变化后旧结果不会写入当前展示。</p>}
  {current?.error&&<p className="inline-warning" role="alert">{current.error}</p>}
  {display&&<><TraditionalCoreReferenceView {...display}/><details className="tc-source"><summary>本次固定来源核对</summary><p>{result!.sourceVerification.label}</p><p>固定电子转录已核对；未作影印底本校勘。</p><ul>{result!.sourceVerification.sources.map((source,index)=><li key={source.id+':'+index}>{source.id} · {source.commit} · {source.license}</li>)}</ul></details></>}
 </section>;
}
