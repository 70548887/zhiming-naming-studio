import type {BirthProfile,NamingPreferences,NamingSession} from '../shared/types';
import {validReviewToken} from '../shared/review-version';
import {CULTURAL_WORKFLOW_METHODS,hasCulturalWorkflowAPI,type CulturalWorkflowAPI} from '../shared/cultural-workflow-api';
import type {CustomerStorageState} from '../shared/customer-storage-state';
import {canonicalPlainJson} from '../shared/plain-json';
import type {CulturalWorkflowContext} from './cultural-workflow-controller';
import type {ReviewedNamingDataApi} from '../shared/reviewed-naming-data';

export interface CulturalAppInput {
 profile:BirthProfile;preferences:NamingPreferences;session:NamingSession|null;savedSession?:NamingSession|null;
 sessionCurrent:boolean;formDirty:boolean;reviewDirty:boolean;contextKey:string;selectedIds:readonly string[];
}
export interface CulturalAppContextClock {update:(signature:string)=>string;isCurrent:(signature:string,key:string)=>boolean;}
/** Full signatures stay private. An opaque UI generation is only an invalidation
 * label; exact references and the complete signature still gate the facade. */
export function createCulturalAppContextClock():CulturalAppContextClock {
 const owner=crypto.randomUUID();let previous:string|undefined,generation=0;
 const key=()=>`cultural-app-ui/1:${owner}:${generation}`;
 return {update:signature=>{if(signature!==previous){previous=signature;generation++;}return key();},isCurrent:(signature,expected)=>signature===previous&&expected===key()};
}
export function culturalAppInputSignature(input:CulturalAppInput):string {
 const {profile,session,savedSession,selectedIds}=input;
 const sessionRef=(value:NamingSession|null|undefined)=>value?{id:value.id,profileId:value.profileId,reviewToken:value.reviewToken??null,reviewRevision:value.reviewRevision??null,candidateRefs:value.candidates.map(candidate=>candidate.id)}:null;
 return canonicalPlainJson({input:input.contextKey,profileId:profile.id,session:sessionRef(session),savedSession:sessionRef(savedSession),sessionCurrent:input.sessionCurrent,formDirty:input.formDirty,reviewDirty:input.reviewDirty,selectedIds});
}
export function culturalAppContext(input:CulturalAppInput,clock:CulturalAppContextClock):{reason:string;signature:string;context?:CulturalWorkflowContext;selectable:readonly {id:string;fullName:string}[]} {
 const {profile,session,savedSession,selectedIds}=input,signature=culturalAppInputSignature(input);
 const uiKey=clock.update(signature);
 const blocked=(reason:string)=>({reason,signature,selectable:[]});
 if(!session||!savedSession)return blocked('请先生成并保存一份命名方案，或打开已保存方案，再选择 2 至 4 个候选名字。');
 if(!input.sessionCurrent||input.formDirty||input.reviewDirty)return blocked('当前资料或审阅有未保存变更。请先保存审阅，并按当前资料重新生成方案；也可明确打开原方案快照后再比较。');
 if(session.profileId!==profile.id||session.profile.id!==profile.id||savedSession.profileId!==profile.id||savedSession.id!==session.id||savedSession.reviewToken!==session.reviewToken||savedSession.reviewRevision!==session.reviewRevision)return blocked('当前宝宝与已保存方案引用不一致，请重新打开本宝宝的已保存方案。');
 if(typeof session.reviewToken!=='string'||!validReviewToken(session.reviewToken))return blocked('本方案缺少有效的已保存审阅凭据，请重新打开已保存方案后再比较。');
 const selectable=savedSession.candidates.map(candidate=>({id:candidate.id,fullName:candidate.fullName}));
 if(new Set(selectable.map(candidate=>candidate.id)).size!==selectable.length)return blocked('已保存方案的候选引用重复，请重新读取方案。');
 if(selectedIds.length<2||selectedIds.length>4||new Set(selectedIds).size!==selectedIds.length||selectedIds.some(id=>!selectable.some(candidate=>candidate.id===id)))return {reason:'请在下方明确选择本方案的 2 至 4 个候选名字，再启用文化比较。',signature,selectable};
 return {reason:'',signature,selectable,context:{ownerProfileId:profile.id,anchorRequest:{kind:'session',sessionId:session.id,expectedReviewToken:session.reviewToken},contextKey:uiKey,candidates:selectedIds.map(candidateId=>({kind:'saved' as const,candidateId}))}};
}

export interface CulturalAppHost {isBusy:()=>boolean;isWriting:(label:string)=>boolean;acquireWrite:(label:string)=>()=>void;}
/** A synchronous lease shares the App's existing busyRef. Cancellation only
 * retires UI delivery; the underlying request owns its lease until settlement. */
export function createCulturalAppHost({isBusy,setBusy}:{isBusy:()=>boolean;setBusy:(busy:boolean,label:string)=>void}):CulturalAppHost {
 let owner:{token:symbol;label:string}|undefined;
 return {isBusy,isWriting:label=>!!owner&&owner.label===label&&isBusy(),acquireWrite:label=>{
  if(isBusy())throw Error('工作台正在处理其他操作，请等待完成后重试文化比较。');
  const lease={token:Symbol('app-write'),label};owner=lease;setBusy(true,label);
  return()=>{if(owner!==lease)return;owner=undefined;setBusy(false,'');};
 }};
}
interface DataFunction {descriptor:PropertyDescriptor;call:(...values:unknown[])=>unknown;}
function dataFunction(source:unknown,name:string):DataFunction|undefined {
 try{if(!source||typeof source!=='object')return;const descriptor=Object.getOwnPropertyDescriptor(source,name);if(descriptor&&Object.hasOwn(descriptor,'value')&&typeof descriptor.value==='function')return{descriptor,call:descriptor.value};}catch{/* An inaccessible bridge is unavailable, not a source. */}
}
function sameDataFunction(source:unknown,name:string,binding:DataFunction):boolean {
 const current=dataFunction(source,name),original=binding.descriptor;
 return !!current&&current.call===binding.call&&current.descriptor.enumerable===original.enumerable&&current.descriptor.configurable===original.configurable&&current.descriptor.writable===original.writable;
}
export const REVIEWED_GENERATION_WRITE_LABEL='按已审资料生成名字';
/** Wrap only the real request. Existing controller validation and handoff remain
 * unchanged; cancellation never releases another operation's write lease. */
export function createReviewedGenerationAppApi({source,getSource,isCurrent,isReadOnly,host}:{source:unknown;getSource:()=>unknown;isCurrent:()=>boolean;isReadOnly:()=>boolean;host:CulturalAppHost}):ReviewedNamingDataApi|undefined {
 const binding=dataFunction(source,'generateReviewed');if(!binding)return;
 const guard=()=>{if(!isCurrent()||getSource()!==source||!sameDataFunction(source,'generateReviewed',binding))throw Error('已审资料生成连接已变化，本次旧回复不会进入当前方案。');};
 return Object.freeze({generateReviewed:async(...args:Parameters<ReviewedNamingDataApi['generateReviewed']>)=>{
  guard();if(isReadOnly())throw Error('客户库当前只读，请主动处理存储状态后再生成。');
  const release=host.acquireWrite(REVIEWED_GENERATION_WRITE_LABEL);
  try{const result=await binding.call.apply(source,args);guard();return result as Awaited<ReturnType<ReviewedNamingDataApi['generateReviewed']>>;}
  finally{release();}
 }});
}
type Method=typeof CULTURAL_WORKFLOW_METHODS[number];
const writeLabels:Partial<Record<Method,string>>={prepareCulturalWrite:'准备文化比较保存',commitCulturalWrite:'保存文化比较',restoreCulturalRevision:'恢复文化比较修订',migrateCulturalStorage:'迁移文化存储'};
export function createCulturalWorkflowAppApi({source,getSource,isCurrent,getBlockReason,isReadOnly,host,onMigrated,getContinuationComparisonId}:{
 source:unknown;getSource:()=>unknown;isCurrent:()=>boolean;getBlockReason:()=>string;isReadOnly:()=>boolean;host:CulturalAppHost;onMigrated?:(state:CustomerStorageState)=>void;getContinuationComparisonId?:()=>string|undefined;
}):CulturalWorkflowAPI|undefined {
 if(!hasCulturalWorkflowAPI(source))return undefined;
 const bindings=CULTURAL_WORKFLOW_METHODS.map(method=>({method,binding:dataFunction(source,method)}));
 if(bindings.some(row=>!row.binding))return undefined;
 const assertCurrent=()=>{
  if(!isCurrent()||getSource()!==source)throw Error('宝宝、资料或候选名单已变化，请按当前方案重新建立文化比较。');
  if(bindings.some(row=>!sameDataFunction(source,row.method,row.binding!)))throw Error('文化 API 连接已变化，请重新打开当前文化比较入口；旧回复已失效。');
  const reason=getBlockReason();if(reason)throw Error(reason);
 };
 return Object.fromEntries(CULTURAL_WORKFLOW_METHODS.map(method=>{
  const original=bindings.find(row=>row.method===method)!.binding!.call;
  return [method,async(...args:unknown[])=>{
   assertCurrent();
   if(host.isBusy())throw Error('工作台正在处理其他操作，请等待完成后重试文化比较。');
   const label=writeLabels[method];
   if(label&&isReadOnly())throw Error('客户库当前只读；文化预览仍可读取，保存、恢复与迁移尚未执行。请先备份并在存储维护中主动处理。');
   const continued=getContinuationComparisonId?.();
   if(continued&&method==='prepareCulturalWrite'){
    const request=args[0] as {target?:{mode?:unknown;comparisonId?:unknown}}|undefined;
    if(request?.target?.mode!=='revise'||request.target.comparisonId!==continued)throw Error('继续处理原记录前，请先明确读回该记录的最新版本和历史；本次不会另建记录。');
   }
   if(continued&&(method==='readCulturalComparison'||method==='listCulturalRevisions'||method==='restoreCulturalRevision')&&args[0]!==continued)throw Error('本次继续处理只能读取或恢复明确选择的原文化记录。');
   const release=label?host.acquireWrite(label):undefined;
   try{
    const value=await original.apply(source,args);
    assertCurrent();
    if(method==='migrateCulturalStorage')onMigrated?.(value as CustomerStorageState);
    return value;
   }finally{release?.();}
  }];
 })) as unknown as CulturalWorkflowAPI;
}
