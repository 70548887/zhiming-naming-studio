import React,{useLayoutEffect,useMemo,useRef,useState} from 'react';
import {CULTURAL_WORKFLOW_METHODS,hasCulturalWorkflowAPI} from '../shared/cultural-workflow-api';
import {canonicalPlainJson} from '../shared/plain-json';
import type {CustomerStorageState} from '../shared/customer-storage-state';
import {CulturalWorkflowPanel} from './CulturalWorkflowPanel';
import {culturalAppContext,culturalAppInputSignature,createCulturalAppContextClock,createCulturalWorkflowAppApi,type CulturalAppHost,type CulturalAppInput} from './cultural-workflow-app';
import type {CulturalContinuationIntent} from './cultural-record-continuation';
import type {CulturalWorkflowContext} from './cultural-workflow-controller';

export interface CulturalWorkflowAppEntryProps extends Omit<CulturalAppInput,'selectedIds'> {busy:boolean;readOnly:boolean;host:CulturalAppHost;isContextCurrent:()=>boolean;onMigrated?:(state:CustomerStorageState)=>void;continuation?:CulturalContinuationIntent;resolveContinuation?:(intentId:string)=>CulturalWorkflowContext|undefined;}
function continuationFrame(props:CulturalWorkflowAppEntryProps,selectedIds:readonly string[]){
 const resolved=props.continuation?props.resolveContinuation?.(props.continuation.intentId):undefined;
 return {resolved,signature:canonicalPlainJson({input:culturalAppInputSignature({...props,selectedIds}),continuation:resolved&&props.continuation?{intentId:props.continuation.intentId,comparisonId:resolved.comparisonId}:null})};
}
export function CulturalWorkflowAppEntry(props:CulturalWorkflowAppEntryProps){
 const [selection,setSelection]=useState<{owner:string;ids:string[]}>({owner:props.contextKey,ids:[]});
 const selectionRef=useRef(selection);selectionRef.current=selection;
 const [clock]=useState(createCulturalAppContextClock);
 const [continuationClock]=useState(createCulturalAppContextClock);
 const selectedIds=selection.owner===props.contextKey?selection.ids:[];
 const prepared=culturalAppContext({...props,selectedIds},clock);
 const continuation=continuationFrame(props,selectedIds),resumeKey=continuationClock.update(continuation.signature);
 const activeContext=continuation.resolved?{...continuation.resolved,contextKey:resumeKey,candidates:prepared.context?.candidates??[]}:prepared.context;
 const live=useRef({props,prepared});live.current={props,prepared};
 const mounted=useRef(false),owner=useRef<object|null>(null);
 useLayoutEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const source=window.studio,contextKey=activeContext?.contextKey??props.contextKey,signature=continuation.signature;
 const methodIdentities=CULTURAL_WORKFLOW_METHODS.map(method=>{try{const slot=source&&Object.getOwnPropertyDescriptor(source,method);return slot&&Object.hasOwn(slot,'value')?slot.value:undefined;}catch{return undefined;}});
 const binding=useMemo(()=>{
  const identity={};
  const api=createCulturalWorkflowAppApi({source,getSource:()=>window.studio,isCurrent:()=>{
   const current=live.current.props,selected=selectionRef.current.owner===current.contextKey?selectionRef.current.ids:[];
   const frame=continuationFrame(current,selected);
   return mounted.current&&owner.current===identity&&frame.signature===signature&&(frame.resolved?continuationClock.isCurrent(signature,contextKey):clock.isCurrent(culturalAppInputSignature({...current,selectedIds:selected}),contextKey))&&current.isContextCurrent();
  },getBlockReason:()=>{const current=live.current.props;return current.continuation&&current.resolveContinuation?.(current.continuation.intentId)?'':live.current.prepared.reason;},getContinuationComparisonId:()=>{const current=live.current.props;return current.continuation?current.resolveContinuation?.(current.continuation.intentId)?.comparisonId:undefined;},isReadOnly:()=>live.current.props.readOnly,host:props.host,onMigrated:state=>live.current.props.onMigrated?.(state)});
  return {identity,api};
 },[source,contextKey,signature,props.host,clock,continuationClock,...methodIdentities]);
 owner.current=binding.identity;
 const toggle=(candidateId:string)=>{
  if(props.host.isBusy()||!props.isContextCurrent())return;
  const ids=selectionRef.current.owner===props.contextKey?selectionRef.current.ids:[];
  const next={owner:props.contextKey,ids:ids.includes(candidateId)?ids.filter(id=>id!==candidateId):ids.length<4?[...ids,candidateId]:ids};
  selectionRef.current=next;clock.update(culturalAppInputSignature({...props,selectedIds:next.ids}));continuationClock.update(continuationFrame(props,next.ids).signature);setSelection(next);
 };
 return <section className="panel" data-cultural-app style={{padding:20,marginTop:20}}>
  <h2>文化比较 · 可选</h2>
  <p>从当前已保存方案中选择 2 至 4 个名字，单独查看并保存出生盘文化比较。默认关闭。</p>
  {props.readOnly&&<p role="status" className="inline-warning">客户库当前只读：可读取文化预览；保存、恢复和迁移会被拦截。请先备份并在存储维护中主动处理。</p>}
  {!hasCulturalWorkflowAPI(source)&&<p role="status" className="inline-warning">当前环境尚未接入文化比较公共 API。请待服务接通后重新打开此入口。</p>}
  {prepared.reason&&!continuation.resolved&&<p data-cultural-next-step role="status">{prepared.reason}</p>}
  {continuation.resolved&&<p data-cultural-continuation-active role="status">已明确选择继续处理文化记录 {continuation.resolved.comparisonId}。请先启用并读回该记录的最新版本与历史；恢复历史不要求重新选择候选，修订比较内容仍需明确选择 2 至 4 个名字。</p>}
  <fieldset disabled={props.busy} style={{border:0,padding:0,margin:0,minWidth:0}}>
   {prepared.selectable.length>0&&<><legend>选择本方案已保存候选（{selectedIds.length}/4）</legend><div className="choice-row">{prepared.selectable.map(candidate=><label key={candidate.id} className="checkbox-line"><input type="checkbox" data-cultural-select={candidate.id} checked={selectedIds.includes(candidate.id)} disabled={selectedIds.length>=4&&!selectedIds.includes(candidate.id)} onChange={()=>toggle(candidate.id)}/>{candidate.fullName}</label>)}</div></>}
   {activeContext&&<CulturalWorkflowPanel key={contextKey} {...activeContext} api={binding.api}/>}
  </fieldset>
 </section>;
}
