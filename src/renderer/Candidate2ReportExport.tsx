import React,{useId} from 'react';
import type {Candidate2ReportReference} from '../shared/candidate2-report-api';

/** Presentation reference only; main must reread and verify the stored source. */
export type {Candidate2ReportReference} from '../shared/candidate2-report-api';
export interface Candidate2ReportExportProps {
 source:Readonly<Candidate2ReportReference>|null;
 busy:boolean;
 disabled?:boolean;
 blockedReason?:string|null;
 draftDirty?:boolean;
 error?:string|null;
 notice?:string|null;
 onExport:(reference:Readonly<Candidate2ReportReference>)=>void;
}

/** Never forwards a full session or additional client properties. This guard
 * protects the event contract, not source authentication or CAS acceptance. */
export function captureCandidate2ReportReference(value:unknown):Readonly<Candidate2ReportReference>|null {
 try{
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const keys=Reflect.ownKeys(value);
  if(keys.length!==3||!['id','expectedReviewRevision','expectedReviewToken'].every(key=>keys.includes(key)))return null;
  const own=(key:string)=>{const descriptor=Object.getOwnPropertyDescriptor(value,key);return descriptor&&Object.hasOwn(descriptor,'value')?descriptor.value:undefined;};
  const id=own('id'),expectedReviewRevision=own('expectedReviewRevision'),expectedReviewToken=own('expectedReviewToken');
  if(typeof id!=='string'||!id.trim()||id.length>1000||typeof expectedReviewToken!=='string'||!expectedReviewToken.trim()||expectedReviewToken.length>1000||!Number.isSafeInteger(expectedReviewRevision)||expectedReviewRevision<0)return null;
  return Object.freeze({id,expectedReviewRevision,expectedReviewToken});
 }catch{return null;}
}

/** Event-only callback contract. Owner maps these three explicit values to
 * its real report method, handles errors/results and refreshes source on CAS
 * refusal. It must not fall back to ordinary saveSession/exportReport. */
export function dispatchCandidate2ReportExport(props:Candidate2ReportExportProps):boolean {
 if(props.disabled||props.busy||props.blockedReason?.trim())return false;
 const reference=captureCandidate2ReportReference(props.source);if(!reference)return false;
 props.onExport(reference);return true;
}

/** Controlled report action. No effect, transport, saved-session cache or
 * client report material is accepted here. The owning App supplies the last
 * canonical read's reference and keeps its shared operation lease while busy. */
export function Candidate2ReportExport(props:Candidate2ReportExportProps){
 const generated=useId(),id=`candidate2-report-${generated}`;
 const reference=captureCandidate2ReportReference(props.source),blocked=!!props.disabled||props.busy||!!props.blockedReason?.trim()||!reference;
 const emit=()=>{dispatchCandidate2ReportExport(props);};
 return <section className="c2-report-export" data-c2-report-export aria-labelledby={`${id}-title`} aria-busy={props.busy}>
  <h3 id={`${id}-title`}>项目固定取法 · 已保存方案报告</h3>
  <p id={`${id}-scope`}>报告读取已保存方案的当前审阅版本，不保存草稿、不追加审阅历史。项目采用依据、人工审阅和原分析分值在报告中分别列示，传统判断保持未知。</p>
  {props.draftDirty&&<p data-c2-report-draft>当前仍有未保存草稿。报告只包含已保存版本，草稿不进入报告。</p>}
  <p role="status" aria-live="polite">{props.busy?'正在读取已保存来源并生成报告，请等待当前请求结束。':props.notice||'点击后由主进程重新核对当前保存版本，再生成报告。'}</p>
  {!reference&&<p>请先明确读取需要导出的已保存方案。</p>}
  {props.blockedReason&&<p>{props.blockedReason}</p>}
  {props.error&&<p role="alert">{props.error}</p>}
  <button type="button" data-c2-report-action="export" disabled={blocked} aria-describedby={`${id}-scope`} onClick={emit}>导出已保存方案报告</button>
 </section>;
}
