import React,{useEffect,useId,useRef,useState} from 'react';
import type {BirthProfile} from '../shared/types';
import type {QiongtongClauseReferenceApi} from '../shared/qiongtong-clause-reference-preview';
import {QiongtongClauseReferenceView} from './QiongtongClauseReferenceView';
import {createClausePreviewLeaseController,validClausePreviewResponse,type ClausePreviewWithJia} from './qiongtong-clause-preview-bindings';

export interface QiongtongClausePreviewPanelProps {profile:BirthProfile;api?:QiongtongClauseReferenceApi;disabled?:boolean;}
export function hasQiongtongClauseReferenceApi(value:unknown):value is QiongtongClauseReferenceApi {
 if(!value||typeof value!=='object')return false;
 const method=Object.getOwnPropertyDescriptor(value,'previewQiongtongClauseReferences');
 return !!method&&Object.hasOwn(method,'value')&&typeof method.value==='function';
}

/** Explicit M561 readonly request. Source/resource authority remains in Service; this checks returned binding only. */
export function QiongtongClausePreviewPanel({profile,api,disabled=false}:QiongtongClausePreviewPanelProps){
 const id=useId(),key=JSON.stringify(profile),controller=useRef(createClausePreviewLeaseController()).current;
 controller.setIdentity(key,api);
 const identity=controller.identity();
 const [state,setState]=useState<{key:string;epoch:number;pending:boolean;result?:ClausePreviewWithJia;error?:string}>({key,epoch:identity.epoch,pending:false});
 const current=state.key===key&&state.epoch===identity.epoch?state:undefined;
 useEffect(()=>{controller.activate();setState(previous=>previous.pending?{...previous,pending:false}:previous);return()=>controller.dispose();},[controller]);
 const available=typeof api?.previewQiongtongClauseReferences==='function';
 const read=async()=>{
  if(disabled||!available||current?.pending)return;
  const lease=controller.begin(),sent=structuredClone(profile);
  setState({key,epoch:lease.epoch,pending:true});
  const owns=()=>controller.owns(lease);
  try{
   const result:ClausePreviewWithJia=await api!.previewQiongtongClauseReferences(sent);if(!owns())return;
   if(!validClausePreviewResponse(result,sent.id))throw Error('条文预览返回的客户、固定来源或逐条引用不一致，未采用结果。');
   setState({key,epoch:lease.epoch,pending:false,result});
  }catch{if(owns())setState({key,epoch:lease.epoch,pending:false,error:'读取月别条文条件未完成，请保留当前资料并重试。'});}
 };
 const result=current?.result;
 // Textual place names are optional; only apparent-solar mode requires a separate longitude.
 const missingBirthDetails=[!profile.surname.trim()&&'姓氏',!profile.birthDate.trim()&&'出生日期',!profile.timeUnknown&&!profile.birthTime.trim()&&'出生时刻',profile.timeBasis==='apparent-solar'&&profile.birthLongitude===undefined&&'出生地经度'].filter(Boolean);
 const invalidLongitude=profile.birthLongitude!==undefined&&(typeof profile.birthLongitude!=='number'||!Number.isFinite(profile.birthLongitude)||profile.birthLongitude < -180||profile.birthLongitude > 180);
 const timezone=profile.timezone.trim();let invalidTimezone=false;
 if(timezone){try{new Intl.DateTimeFormat('en',{timeZone:timezone}).format(0);}catch{invalidTimezone=true;}}
 return <section className="qt-clause-preview" aria-labelledby={id}>
  <h2 id={id}>月别条文参考</h2><p>按当前出生资料查阅月别字句，帮助你核对适用范围与原文依据。</p>
  {!available&&<p role="status">当前版本此项查阅暂不可用。可从左侧“工作空间”返回“起名工作台”，继续编辑资料。</p>}
  {available&&missingBirthDetails.length>0&&<p className="qt-clause-note" role="status">待补资料：{missingBirthDetails.join('、')}。请在“起名工作台”补充后查阅。</p>}
  {available&&!timezone&&<p className="qt-clause-note" role="status">未填写时区，当前按 Asia/Shanghai（中国标准时间）查阅；如出生记录采用其他时区，请在“起名工作台”修改。</p>}
  {available&&invalidTimezone&&<p className="qt-clause-note" role="status">待核对资料：时区无效，请在“起名工作台”填写 Asia/Shanghai 等 IANA 时区名称后查阅。</p>}
  {available&&invalidLongitude&&<p className="qt-clause-note" role="status">待核对资料：出生地经度应为 -180 至 180 的有限数字，东经为正、西经为负；请在“起名工作台”核对后查阅。</p>}
  {available&&profile.timeUnknown&&<p className="qt-clause-note">出生时刻尚未确定，无需为查阅补填时刻；涉及缺失时刻的条件可能保留为待定。</p>}
  <button type="button" className="button secondary" disabled={disabled||!available||!!current?.pending} onClick={()=>void read()}>{current?.pending?'正在查阅月别条文…':'查阅月别条文'}</button>
  {current?.pending&&<p role="status">正在按当前出生资料查阅，请稍候。</p>}
  {current?.error&&<p className="inline-warning" role="alert">这次查阅没有完成。当前输入仍保留，可再次点击“查阅月别条文”。</p>}
  {result&&<><QiongtongClauseReferenceView reference={result.reference} jiaChapter={result.jiaChapter}/><details className="qt-clause-source"><summary>文献与适用说明</summary><p>本次结果只用于核对原文、适用范围和资料状态。</p><p>固定电子转录已核对；影印底本尚未独立校勘。</p><ul aria-label="本次文献来源与许可">{result.sourceVerification.sources.map((source,index)=><li key={source.id+':'+index}>{source.name} · {source.license}</li>)}</ul></details></>}
  <p className="qt-clause-user-boundary">只查阅，不保存客户、不自动计算、不改变评分或候选排序。完整用神、从格、合化和有效制化仍未判断。</p>
 </section>;
}
