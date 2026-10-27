import {canonicalPlainJson} from '../shared/plain-json';
import {readCustomerWriteNoticeDelivery} from '../shared/customer-write-notice-delivery';
import type {SessionRevision} from '../shared/types';
import type {Candidate2AdoptedNamingSessionV2} from '../shared/candidate2-generation-adoption-v2';
import type {Candidate2HistoryRestoreAPI} from '../shared/candidate2-history-restore-api';
import type {CulturalAppHost} from './cultural-workflow-app';
import {captureCandidate2ReviewBase,type Candidate2ReviewBase} from './candidate2-review-boundary';
import {captureCandidate2HistoryRows,correlateCandidate2HistoryRestoreResult} from './candidate2-history-boundary';

export interface Candidate2HistoryContext{canonicalSession:unknown;profileId:string;sessionCurrent:boolean;formDirty:boolean;storageReadOnly:boolean;canonicalReadKey:string;contextKey:string;}
export interface Candidate2HistoryUiState{
 open:boolean;phase:'idle'|'loading'|'ready'|'confirming'|'restoring'|'delivering'|'restored'|'unavailable'|'blocked'|'reconcile';
 rows:SessionRevision[];confirmation:SessionRevision|null;listVersion:number;requestPending:boolean;canRead:boolean;canRestore:boolean;canRetryDelivery:boolean;
 requiresReadback:boolean;requiresRestart:boolean;notice:string;error:string|null;blockedReason:string|null;
}
export interface Candidate2HistoryDeliveryLease{isCurrent:()=>boolean;}
export interface Candidate2HistoryBindings{
 getContext:()=>Candidate2HistoryContext;getSource:()=>unknown;getOwnerGuard:()=>()=>boolean;host:CulturalAppHost;
 onRestored:(session:Candidate2AdoptedNamingSessionV2,lease:Candidate2HistoryDeliveryLease)=>void|Promise<void>;
}
interface MethodBinding{source:object;descriptor:PropertyDescriptor;method:(...args:unknown[])=>unknown;}
type RestoreMethod=Candidate2HistoryRestoreAPI['restoreCandidate2History'];
interface Frame{signature:string;context?:Candidate2HistoryContext;base?:Candidate2ReviewBase;read?:MethodBinding;restore?:MethodBinding;readIdentity?:string;reason:string|null;}
interface Delivery{serial:number;frame:Frame;owner:()=>boolean;session:Candidate2AdoptedNamingSessionV2;}
const readLabel='读取项目固定取法审阅历史',restoreLabel='恢复项目固定取法审阅历史';
const message=(error:unknown)=>error instanceof Error?error.message:typeof error==='string'?error:'历史操作未完成，请核对已保存方案。';
const unavailable=(error:unknown)=>/404|not found|未接入|尚未连接|CANDIDATE2[^\s:]*UNAVAILABLE/i.test(message(error));
function binding(source:unknown,name:string):MethodBinding|undefined{try{if(!source||typeof source!=='object')return;const descriptor=Object.getOwnPropertyDescriptor(source,name);if(descriptor&&Object.hasOwn(descriptor,'value')&&typeof descriptor.value==='function')return{source,descriptor,method:descriptor.value};}catch{/* Discovery only; never a fallback. */}}
function sameBinding(a:MethodBinding|undefined,b:MethodBinding|undefined){return!a||!b?a===b:a.source===b.source&&a.method===b.method&&['enumerable','writable','configurable'].every(key=>a.descriptor[key as keyof PropertyDescriptor]===b.descriptor[key as keyof PropertyDescriptor]);}

/** Explicit existing-list reader and reference-only restore owner. A successful
 * read grants no writer authority; the native restore authenticates its rows. */
export class Candidate2HistoryController{
 #active=false;#serial=0;#pending=false;#handoff=false;#restart=false;#frame:Frame;#delivery?:Delivery;
 #consumed=new Set<string>();#listeners=new Set<()=>void>();#state:Candidate2HistoryUiState;
 constructor(readonly options:Candidate2HistoryBindings){this.#frame=this.#capture();this.#state={open:false,phase:'idle',rows:[],confirmation:null,listVersion:0,requestPending:false,canRead:false,canRestore:false,canRetryDelivery:false,requiresReadback:false,requiresRestart:false,notice:'历史仅在明确打开后读取。恢复只提交所选历史引用及当前已保存修订凭据。',error:null,blockedReason:null};}
 getSnapshot=()=>this.#state;
 subscribe=(listener:()=>void)=>{this.#listeners.add(listener);return()=>{this.#listeners.delete(listener);};};
 #capture():Frame{
  let source:unknown;try{source=this.options.getSource();}catch{/* Unavailable remains unavailable. */}
  const read=binding(source,'listHistory'),restore=binding(source,'restoreCandidate2History');
  try{
   const signature=canonicalPlainJson(this.options.getContext());if(signature.length>32*1024*1024)throw Error('历史上下文过大。');
   const context=JSON.parse(signature) as Candidate2HistoryContext;
   if(typeof context.profileId!=='string'||typeof context.canonicalReadKey!=='string'||!context.canonicalReadKey||typeof context.contextKey!=='string'||['sessionCurrent','formDirty','storageReadOnly'].some(key=>typeof context[key as keyof Candidate2HistoryContext]!=='boolean'))throw Error('历史需要明确的当前方案与资料引用。');
   const base=captureCandidate2ReviewBase(context.canonicalSession);if(context.profileId!==base.session.profileId)throw Error('当前宝宝与已保存方案不一致。');
   return{signature,context,base,read,restore,readIdentity:canonicalPlainJson({id:base.session.id,profileId:context.profileId,key:context.canonicalReadKey}),reason:null};
  }catch(error){return{signature:'invalid-context',read,restore,reason:message(error)};}
 }
 #restoreReason(frame:Frame){return this.#restart?'保存收尾提醒要求保留草稿并重启后核对。':frame.reason??(!frame.restore?'专用历史恢复接口尚未接入；当前仍可按需浏览历史。':frame.context?.storageReadOnly?'客户库当前只读，历史恢复不可用。':frame.context?.formDirty||!frame.context?.sessionCurrent?'当前资料或偏好已变化，请先明确打开原方案。':frame.readIdentity&&this.#consumed.has(frame.readIdentity)?'恢复请求已发出，请先明确读回当前方案，不能重复提交旧凭据。':null);}
 #publish(patch:Partial<Candidate2HistoryUiState>){
  const pending=this.#pending||this.#handoff,next={...this.#state,...patch,requestPending:pending,requiresRestart:this.#restart};
  next.canRead=this.#active&&!pending&&!this.#restart&&!this.#frame.reason&&!!this.#frame.read;
  next.canRestore=this.#active&&!pending&&!this.#restoreReason(this.#frame)&&next.rows.length>0&&['ready','confirming'].includes(next.phase);
  next.canRetryDelivery=this.#active&&!pending&&!this.#restart&&next.phase==='delivering'&&!!next.error&&!!this.#delivery&&this.#live(this.#delivery);
  this.#state=next;for(const listener of this.#listeners)listener();
 }
 #same(frame:Frame){const now=this.#capture();return frame.signature===now.signature&&sameBinding(frame.read,now.read)&&sameBinding(frame.restore,now.restore);}
 #live(attempt:Pick<Delivery,'serial'|'frame'|'owner'>){try{return this.#active&&!this.#restart&&attempt.serial===this.#serial&&attempt.owner()&&this.#same(attempt.frame);}catch{return false;}}
 #retire(notice:string,close=false){this.#serial++;this.#delivery=undefined;const used=!!this.#frame.readIdentity&&this.#consumed.has(this.#frame.readIdentity);this.#publish({open:close?false:this.#state.open,phase:this.#restart||used?'reconcile':'idle',rows:close?[]:this.#state.rows,confirmation:null,requiresReadback:this.#restart||used,error:null,blockedReason:this.#restart||used?this.#restoreReason(this.#frame):null,notice});}
 #settledStale(attempt:Pick<Delivery,'serial'|'frame'|'owner'>){if(this.#active&&!this.#restart&&attempt.serial===this.#serial){this.#frame=this.#capture();this.#retire('资料、草稿、页面或历史连接已变化；迟到回复未采用，当前草稿保留。');}}
 attach=()=>{this.#active=true;this.refresh();this.#publish({});};
 detach=()=>{this.#active=false;this.#retire('已离开历史入口；实际请求结束前仍保留原工作台租约。',true);};
 refresh=()=>{const next=this.#capture();if(next.signature!==this.#frame.signature||!sameBinding(next.read,this.#frame.read)||!sameBinding(next.restore,this.#frame.restore)){this.#frame=next;this.#retire('当前方案、资料、草稿或连接已变化，请重新明确打开历史。',true);}};
 cancel=()=>{if(this.#active)this.#retire('已停止等待。已发出的读取或恢复不会因此撤销，实际请求结束前仍保持工作台租约。');};
 close=()=>{if(this.#active)this.#retire('已关闭历史浏览；当前资料和人工草稿保留。',true);};
 receiveWriteNotice=(raw:unknown)=>{const delivery=readCustomerWriteNoticeDelivery(raw);if(!delivery)return false;this.#restart=true;this.#retire(delivery.notice.message);return true;};
 open=async()=>{
  if(!this.#active)return;this.refresh();if(this.#pending||this.#handoff)return;
  const frame=this.#frame,reason=this.#restart?'请先保留草稿并重启，再读取历史。':frame.reason??(!frame.read?'当前环境尚未接入真实历史读取接口。':null);
  if(reason){this.#publish({open:true,phase:!frame.read?'unavailable':'blocked',error:null,blockedReason:reason,notice:reason});return;}
  if(this.options.host.isBusy()){this.#publish({open:true,phase:'blocked',blockedReason:'工作台正在处理其他操作，请稍后明确读取。',error:null});return;}
  const owner=this.options.getOwnerGuard();if(!owner())return;
  let release:()=>void;try{release=this.options.host.acquireWrite(readLabel);}catch(error){this.#publish({phase:'blocked',error:message(error)});return;}
  const serial=++this.#serial;this.#pending=true;this.#publish({open:true,phase:'loading',rows:[],confirmation:null,error:null,blockedReason:null,notice:'正在按当前原方案读取并核对审阅历史；读取不会覆盖人工草稿。'});
  try{
   const raw=await frame.read!.method.call(frame.read!.source,frame.base!.session.id);const attempt={serial,frame,owner};
   if(!this.#live(attempt)){this.#settledStale(attempt);return;}
   const rows=captureCandidate2HistoryRows(raw,frame.base!);this.#publish({phase:'ready',rows,listVersion:this.#state.listVersion+1,blockedReason:this.#restoreReason(frame),notice:rows.length?'历史已读回。可比较所选版本；恢复前仍需单独确认。':'当前原方案没有审阅历史。',error:null});
  }catch(error){if(this.#live({serial,frame,owner}))this.#publish({phase:unavailable(error)?'unavailable':'blocked',error:message(error),notice:'历史未读回，当前资料与人工草稿保留。'});else this.#settledStale({serial,frame,owner});}
  finally{this.#pending=false;release();if(this.#active)this.#publish({});}
 };
 requestRestore=(id:string)=>{
  if(!this.#active)return;this.refresh();if(!this.#state.canRestore||this.options.host.isBusy())return;
  const row=this.#state.rows.find(value=>value.id===id);if(!row)return;
  this.#serial++;this.#publish({phase:'confirming',confirmation:row,error:null,notice:'请明确确认恢复所选历史。人工草稿仅在真实恢复回复采用后替换；原始事实与评分保留。'});
 };
 dismissConfirmation=()=>{if(!this.#active)return;if(this.#pending||this.#handoff){this.cancel();return;}this.#publish({phase:'ready',confirmation:null,notice:'已取消恢复确认，历史与当前人工草稿保留。'});};
 async #deliver(delivery:Delivery){
  if(!this.#live(delivery))return;let release:()=>void;
  try{release=this.options.host.acquireWrite(restoreLabel);}catch(error){this.#publish({phase:'delivering',error:message(error),notice:'真实恢复回复已返回，工作台接收暂未完成；可稍后重新接收同一回复。'});return;}
  this.#handoff=true;this.#publish({phase:'delivering',error:null,notice:'正在把实际恢复回复交回工作台；此处不提供来源或保存资格。'});
  try{await this.options.onRestored(delivery.session,{isCurrent:()=>this.#live(delivery)});if(this.#live(delivery)){this.#delivery=undefined;this.#publish({phase:'restored',confirmation:null,notice:'实际恢复回复已交回工作台，待当前页面采用。',error:null});}else this.#settledStale(delivery);}
  catch(error){if(this.#live(delivery))this.#publish({phase:'delivering',error:message(error),notice:'实际回复接收未完成；重新接收只复用同一回复，不再次恢复。'});else this.#settledStale(delivery);}
  finally{this.#handoff=false;release();if(this.#active)this.#publish({});}
 }
 confirmRestore=async()=>{
  if(!this.#active)return;this.refresh();const row=this.#state.confirmation,frame=this.#frame,reason=this.#restoreReason(frame);
  if(!row||this.#state.phase!=='confirming'||this.#pending||this.#handoff||reason||this.options.host.isBusy()){if(reason)this.#publish({blockedReason:reason});return;}
  const owner=this.options.getOwnerGuard();if(!owner())return;
  let release:()=>void;try{release=this.options.host.acquireWrite(restoreLabel);}catch(error){this.#publish({error:message(error)});return;}
  const serial=++this.#serial;this.#consumed.add(frame.readIdentity!);this.#pending=true;this.#delivery=undefined;
  this.#publish({phase:'restoring',requiresReadback:false,error:null,blockedReason:null,notice:'正在提交所选历史 ID 和当前 canonical 的原修订号、凭据；没有发送历史快照或人工 patch。'});
  let raw:unknown,failure:unknown,failed=false;
  try{raw=await (frame.restore!.method as RestoreMethod).call(frame.restore!.source,frame.base!.session.id,row.id,frame.base!.session.reviewRevision,frame.base!.session.reviewToken);}catch(error){failed=true;failure=error;}
  finally{this.#pending=false;release();if(this.#active)this.#publish({});}
  const attempt={serial,frame,owner};if(!this.#live(attempt)){this.#settledStale(attempt);return;}
  if(failed){this.#publish({phase:unavailable(failure)?'unavailable':'reconcile',requiresReadback:true,error:message(failure),blockedReason:this.#restoreReason(frame),notice:'恢复未接回可采用回复，当前人工草稿保留。请明确读回当前方案，不自动重提或调用普通恢复。'});return;}
  const returned=correlateCandidate2HistoryRestoreResult(raw,frame.base!);if(!returned){this.#publish({phase:'reconcile',requiresReadback:true,error:'返回恢复方案不完整或改变了原始事实、分值、候选顺序与依据。',blockedReason:this.#restoreReason(frame),notice:'当前人工草稿保留，请明确读回当前已保存方案核对。'});return;}
  const delivery={...attempt,session:returned.session};this.#delivery=delivery;await this.#deliver(delivery);
 };
 retryDelivery=async()=>{if(!this.#active||this.#pending||this.#handoff)return;this.refresh();const delivery=this.#delivery;if(!delivery||this.#state.phase!=='delivering'||!this.#state.error||this.options.host.isBusy()||!this.#live(delivery))return;await this.#deliver(delivery);};
}
