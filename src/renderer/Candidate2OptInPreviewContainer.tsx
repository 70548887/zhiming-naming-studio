import React,{useId} from 'react';
import type {Candidate2NamingEligibility} from '../shared/candidate2-naming-eligibility-v1';
import type {NamingPreferences} from '../shared/types';
import {Candidate2OptInPanelView,type Candidate2OptInChoice,type Candidate2OptInIntent} from './Candidate2OptInPanel';
import './candidate2-optin-preview.css';

export type Candidate2ReadonlyPreviewStatus='idle'|'loading'|'ready'|'blocked'|'unavailable'|'error';
export interface Candidate2ReadonlyPreview {status:Candidate2ReadonlyPreviewStatus;title?:string;summary?:string;reasons?:string[];methodVersion?:string;methodPolicy?:string;publicationId?:string;namingRulesVersion?:string;traditionalStatus?:string;sources?:{name:string;license:string}[];}
export interface Candidate2OptInPreviewContainerProps {preferences:NamingPreferences;contextKey:string;choice?:Candidate2OptInChoice;eligibility?:Candidate2NamingEligibility;preview?:Candidate2ReadonlyPreview;manualConflict?:boolean;disabled?:boolean;onIntent?:(intent:Candidate2OptInIntent)=>void;onRetry?:()=>void;id?:string;}
function previewText(preview:Candidate2ReadonlyPreview|undefined):string{if(!preview||preview.status==='idle')return'明确选择项目固定取法后，才会读取只读资格结果。';if(preview.status==='loading')return preview.summary||'正在读取只读资格结果…';if(preview.status==='ready')return preview.summary||'只读资格结果已返回；不会开启生成或保存。';if(preview.reasons?.length)return preview.reasons.join('；');if(preview.status==='blocked')return'当前资料尚未满足只读资格条件。';if(preview.status==='unavailable')return preview.summary||'只读资格资源当前不可用。';return preview.summary||'只读资格检查未完成，可重新明确选择。';}
export function Candidate2OptInPreviewContainer(props:Candidate2OptInPreviewContainerProps){
 const generated=useId();
 return <Candidate2OptInPreviewContainerView {...props} id={props.id??`candidate2-optin-preview-${generated}`}/>;
}
export function Candidate2OptInPreviewContainerView({contextKey,choice='legacy',eligibility,preview,manualConflict=false,disabled=false,onIntent,onRetry,id}:Candidate2OptInPreviewContainerProps&{id:string}){
 const previewId=`${id}-preview`,canRetry=choice==='candidate2'&&(preview?.status==='error'||preview?.status==='unavailable');
 return <section className="candidate2-optin-preview" aria-labelledby={`${previewId}-title`}>
  <Candidate2OptInPanelView id={`${id}-choice`} choice={choice} contextKey={contextKey} eligibility={eligibility} manualConflict={manualConflict} disabled={disabled} onChange={onIntent}/>
  <section className="candidate2-optin-preview-readonly" data-eligibility-status={preview?.status??'idle'} aria-labelledby={`${previewId}-title`} aria-live="polite" aria-busy={preview?.status==='loading'}>
   <div className="candidate2-optin-preview-heading"><h4 id={`${previewId}-title`}>项目固定取法 · 只读资格</h4><span>{choice==='candidate2'?'已明确选择':'原有取法'}</span></div>
   <p>{previewText(preview)}</p>
   {canRetry&&onRetry&&<button type="button" className="button secondary" disabled={disabled} onClick={()=>{if(!disabled)onRetry();}}>重试资格检查</button>}
   {preview?.methodVersion&&<dl><dt>方法版本</dt><dd>{preview.methodVersion}</dd>{preview.methodPolicy&&<><dt>政策版本</dt><dd>{preview.methodPolicy}</dd></>}{preview.publicationId&&<><dt>发布版本</dt><dd>{preview.publicationId}</dd></>}{preview.namingRulesVersion&&<><dt>命名规则</dt><dd>{preview.namingRulesVersion}</dd></>}{preview.traditionalStatus&&<><dt>传统结论</dt><dd>{preview.traditionalStatus==='unknown'?'未知（本检查不提供传统吉凶结论）':preview.traditionalStatus}</dd></>}</dl>}
   {preview?.sources&&preview.sources.length>0&&<details><summary>查看资格来源</summary><ul>{preview.sources.map((source,index)=><li key={index}>{source.name} · {source.license}</li>)}</ul></details>}
   <p className="candidate2-optin-preview-boundary">只读资格不改变评分、候选排序、保存记录或传统吉凶判断。</p>
  </section>
 </section>;
}
