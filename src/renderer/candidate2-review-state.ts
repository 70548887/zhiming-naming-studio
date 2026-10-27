import {canonicalPlainJson} from '../shared/plain-json';
import type {Candidate2ReviewAPI} from '../shared/candidate2-review-api';
import {readCustomerWriteNoticeDelivery} from '../shared/customer-write-notice-delivery';
import type {CulturalAppHost} from './cultural-workflow-app';
import type {Candidate2ReviewUiState} from './candidate2-review-ui';
export type {Candidate2ReviewUiState} from './candidate2-review-ui';
import {captureCandidate2ReviewBase,captureCandidate2ReviewDraft,correlateCandidate2ReviewResult,type Candidate2ReviewBase,type Candidate2ReviewDraft,type Candidate2ReviewBoundaryResult} from './candidate2-review-boundary';

export const CANDIDATE2_REVIEW_WRITE_LABEL='保存项目固定取法方案审阅';
export interface Candidate2ReviewContext {
 canonicalSession:unknown;draft:unknown;profileId:string;sessionCurrent:boolean;formDirty:boolean;storageReadOnly:boolean;
 /** Advanced only by an explicit canonical read/adoption, never by draft edits. */
 canonicalReadKey:string;
 /** Full owner, draft, page and database epoch, including A-B-A changes. */
 contextKey:string;
}
export interface Candidate2ReviewDeliveryLease {isCurrent:()=>boolean;}
export interface Candidate2ReviewBindings {
 getContext:()=>Candidate2ReviewContext;getSource:()=>unknown;getOwnerGuard:()=>()=>boolean;host:CulturalAppHost;
 onSaved:(result:Candidate2ReviewBoundaryResult,lease:Candidate2ReviewDeliveryLease)=>void|Promise<void>;
}
type ReviewMethod=Candidate2ReviewAPI['reviewCandidate2'];
interface Binding {source:object;method:ReviewMethod;descriptor:PropertyDescriptor;}
interface Frame {signature:string;binding?:Binding;context?:Candidate2ReviewContext;base?:Candidate2ReviewBase;draft?:Candidate2ReviewDraft;readIdentity?:string;reason:string|null;}
interface Delivery {serial:number;frame:Frame;owner:()=>boolean;result:Candidate2ReviewBoundaryResult;}
function binding(source:unknown):Binding|undefined {
 try{if(!source||typeof source!=='object')return;const descriptor=Object.getOwnPropertyDescriptor(source,'reviewCandidate2');if(descriptor&&Object.hasOwn(descriptor,'value')&&typeof descriptor.value==='function')return{source,descriptor,method:descriptor.value};}catch{/* No accessor or fallback capability. */}
}
function sameBinding(left:Binding|undefined,right:Binding|undefined):boolean {
 if(!left||!right)return left===right;
 return left.source===right.source&&left.method===right.method&&['enumerable','writable','configurable'].every(key=>left.descriptor[key as keyof PropertyDescriptor]===right.descriptor[key as keyof PropertyDescriptor]);
}
const message=(error:unknown)=>error instanceof Error?error.message:typeof error==='string'?error:'审阅请求失败，请核对已保存方案。';
const unavailable=(error:unknown)=>/CANDIDATE2[^\s:]*UNAVAILABLE|not found|404|未接入|尚未连接/i.test(message(error));
const readback='本次保存已发出；请先明确读取原方案的最新已保存版本并核对草稿，再决定是否提交。';

/** Pure boundary owner only. There is no route, generic writer, generation,
 * latest-token lookup, source admission or native Store authentication here. */
export class Candidate2ReviewController {
 #active=false;#serial=0;#physicalPending=false;#handoffPending=false;#restart=false;
 #attemptedReads=new Set<string>();#frame:Frame;#delivery?:Delivery;#listeners=new Set<()=>void>();
 #state:Candidate2ReviewUiState;
 constructor(readonly options:Candidate2ReviewBindings){
  this.#frame=this.#capture();this.#state={phase:'idle',requestPending:false,canSave:false,canRetryDelivery:false,requiresReadback:false,requiresRestart:false,blockedReason:this.#reason(this.#frame),notice:'尚未提交审阅。仅允许备注、人工五行草案、候选文本和收藏；生成依据保持原样。',error:null};
 }
 getSnapshot=()=>this.#state;
 subscribe=(listener:()=>void)=>{this.#listeners.add(listener);return()=>{this.#listeners.delete(listener);};};
 #capture():Frame {
  let bridge:Binding|undefined;
  try{bridge=binding(this.options.getSource());}catch{/* A live unavailable bridge remains unavailable. */}
  try{
   const signature=canonicalPlainJson(this.options.getContext());
   if(signature.length>32*1024*1024)throw Error('审阅上下文超过边界大小。');
   const context=JSON.parse(signature) as Candidate2ReviewContext;
   if(!context||typeof context!=='object'||typeof context.profileId!=='string'||!context.profileId||typeof context.contextKey!=='string'||!context.contextKey||typeof context.canonicalReadKey!=='string'||!context.canonicalReadKey||['sessionCurrent','formDirty','storageReadOnly'].some(key=>typeof context[key as keyof Candidate2ReviewContext]!=='boolean'))throw Error('审阅需要明确的当前资料及已保存读取引用。');
   const base=captureCandidate2ReviewBase(context.canonicalSession),draft=captureCandidate2ReviewDraft(base,context.draft);
   const readIdentity=canonicalPlainJson({profileId:context.profileId,sessionId:base.session.id,read:context.canonicalReadKey});
   const reason=context.storageReadOnly?'客户库当前只读，审阅草稿仍保留。':context.formDirty?'宝宝资料尚有未保存变更，请先核对当前资料。':!context.sessionCurrent||context.profileId!==base.session.profileId?'当前宝宝与已保存方案不一致，请明确打开原方案。':null;
   return{signature,binding:bridge,context,base,draft,readIdentity,reason};
  }catch(error){return{signature:'invalid-input',binding:bridge,reason:message(error)};}
 }
 #reason(frame:Frame):string|null {
  return this.#restart?'保存收尾提醒要求重启；重启后请明确读回最新已保存方案。':frame.reason??(!frame.binding?'当前环境尚未接入项目固定取法审阅接口。':frame.readIdentity&&this.#attemptedReads.has(frame.readIdentity)?readback:null);
 }
 #publish(patch:Partial<Candidate2ReviewUiState>){
  const requestPending=this.#physicalPending||this.#handoffPending,blockedReason=this.#reason(this.#frame);
  const next={...this.#state,...patch,requestPending,requiresRestart:this.#restart};
  next.canSave=this.#active&&!requestPending&&!blockedReason&&next.phase==='idle';
  next.canRetryDelivery=this.#active&&!requestPending&&!this.#restart&&next.phase==='delivering'&&!!next.error&&!!this.#delivery&&this.#live(this.#delivery);
  this.#state=next;for(const notify of this.#listeners)notify();
 }
 #same(frame:Frame){const current=this.#capture();return frame.signature===current.signature&&sameBinding(frame.binding,current.binding);}
 #live(delivery:Pick<Delivery,'serial'|'frame'|'owner'>):boolean {
  try{return this.#active&&!this.#restart&&this.#serial===delivery.serial&&delivery.owner()&&this.#same(delivery.frame);}catch{return false;}
 }
 #retire(notice:string){
  this.#serial++;this.#delivery=undefined;
  const reason=this.#reason(this.#frame),used=!!this.#frame.readIdentity&&this.#attemptedReads.has(this.#frame.readIdentity);
  this.#publish({phase:this.#restart||used?'reconcile':reason?(this.#frame.binding?'blocked':'unavailable'):'idle',blockedReason:reason,requiresReadback:this.#restart||used,notice,error:null,savedSummary:undefined});
 }
 attach=()=>{this.#active=true;this.refresh();const reason=this.#reason(this.#frame);this.#publish(this.#state.phase==='idle'&&reason?{phase:this.#restart||!!this.#frame.readIdentity&&this.#attemptedReads.has(this.#frame.readIdentity)?'reconcile':this.#frame.binding?'blocked':'unavailable',blockedReason:reason}:{});};
 detach=()=>{this.#active=false;this.#frame=this.#capture();this.#retire('已离开审阅入口；已发出的保存仍由后端完成或失败，迟到结果不会进入当前方案。');};
 refresh=()=>{
  const next=this.#capture();
  if(next.signature!==this.#frame.signature||!sameBinding(next.binding,this.#frame.binding)){
   this.#frame=next;this.#retire('方案、审阅草稿、完整资料、存储或连接已变化；旧回复不替换当前草稿。');
  }else if(this.#active&&!this.#physicalPending&&!this.#handoffPending&&this.#state.phase==='blocked'&&!this.#reason(next)&&!this.options.host.isBusy()){
   this.#publish({phase:'idle',blockedReason:null,error:null,notice:'工作台已空闲，可以按当前明确读回的方案提交审阅。'});
  }
 };
 cancel=()=>{if(this.#active)this.#retire('已停止等待；保留当前审阅草稿。取消不撤回后端保存，共享写锁保持到实际请求结束。');};
 /** Accepts existing validated transport shape only. A notice is never a saved
  * response, commit proof or permission to discard/rewrite the user's draft. */
 receiveWriteNotice=(raw:unknown)=>{
  const delivery=readCustomerWriteNoticeDelivery(raw);if(!delivery)return false;
  this.#restart=true;this.#retire(delivery.notice.message);return true;
 };
 #settledStale(attempt:Pick<Delivery,'serial'|'frame'|'owner'>){
  // A bridge or owner can change without a render. Actual settlement must also
  // retire its waiting display; cancellation/notice already own newer serials.
  if(this.#active&&!this.#restart&&this.#serial===attempt.serial){
   this.#frame=this.#capture();this.#retire('当前审阅资料、归属或连接已变化。保存已发出且不会自动重提，请核对当前已保存方案与草稿。');
  }
 }
 async #deliver(delivery:Delivery){
  if(!this.#live(delivery))return;
  let release:()=>void;
  try{release=this.options.host.acquireWrite(CANDIDATE2_REVIEW_WRITE_LABEL);}catch(error){this.#publish({phase:'delivering',blockedReason:null,error:message(error),notice:'审阅回复已返回，工作台暂时忙碌；稍后可明确重新接收同一回复。'});return;}
  this.#handoffPending=true;this.#publish({phase:'delivering',blockedReason:null,error:null,notice:'服务已返回审阅方案，正在交回当前工作台；这里只核对对应关系。'});
  try{
   await this.options.onSaved(delivery.result,{isCurrent:()=>this.#live(delivery)});
   if(this.#live(delivery)){
    this.#delivery=undefined;this.#publish({phase:'ready',blockedReason:null,requiresReadback:false,error:null,notice:'本次审阅回复已交回工作台；后续修改需以明确采用的最新 canonical 为基准。',savedSummary:{sessionId:delivery.result.session.id,reviewRevision:delivery.result.session.reviewRevision!,traditionalStatus:'unknown'}});
   }else this.#settledStale(delivery);
  }catch(error){if(this.#live(delivery))this.#publish({phase:'delivering',blockedReason:null,requiresReadback:false,error:message(error),notice:'审阅回复已返回，工作台接收尚未完成。重新接收复用同一回复，不再次保存。'});else this.#settledStale(delivery);}
  finally{this.#handoffPending=false;release();if(this.#active)this.#publish({});}
 }
 save=async()=>{
  if(!this.#active)return;this.refresh();if(this.#physicalPending||this.#handoffPending||this.#state.phase==='delivering')return;
  const frame=this.#frame,reason=this.#reason(frame);
  if(reason){this.#publish({phase:this.#restart||frame.readIdentity&&this.#attemptedReads.has(frame.readIdentity)?'reconcile':!frame.binding?'unavailable':'blocked',blockedReason:reason,requiresReadback:this.#restart||!!frame.readIdentity&&this.#attemptedReads.has(frame.readIdentity),error:null});return;}
  let owner:()=>boolean;
  try{owner=this.options.getOwnerGuard();if(!owner())throw Error('当前审阅归属已变化，请核对后再提交。');}catch(error){this.#publish({phase:'blocked',blockedReason:message(error),error:null});return;}
  if(this.options.host.isBusy()){this.#publish({phase:'blocked',blockedReason:'工作台正在处理其他操作，请等待后重新明确提交。',error:null});return;}
  let release:()=>void;
  try{release=this.options.host.acquireWrite(CANDIDATE2_REVIEW_WRITE_LABEL);}catch(error){this.#publish({phase:'blocked',blockedReason:message(error),error:null});return;}
  const serial=++this.#serial;this.#attemptedReads.add(frame.readIdentity!);this.#delivery=undefined;this.#physicalPending=true;
  this.#publish({phase:'saving',blockedReason:null,requiresReadback:false,error:null,notice:'正在以原始已保存修订号和凭据提交完整白名单审阅。',savedSummary:undefined});
  let raw:unknown,failure:unknown,failed=false;
  try{
   raw=await frame.binding!.method.call(frame.binding!.source,frame.base!.session.id,frame.draft!,frame.base!.session.reviewRevision!,frame.base!.session.reviewToken!);
  }catch(error){failed=true;failure=error;}
  finally{this.#physicalPending=false;release();if(this.#active)this.#publish({});}
  const attempt={serial,frame,owner};if(!this.#live(attempt)){this.#settledStale(attempt);return;}
  if(failed){this.#publish({phase:unavailable(failure)?'unavailable':'reconcile',blockedReason:readback,requiresReadback:true,error:message(failure),notice:'审阅保存未接回可采用的回复；当前草稿保留。请明确核对最新已保存方案，不自动重提或重新生成。'});return;}
  const result=correlateCandidate2ReviewResult(raw,frame.base!,frame.draft!);
  if(!result){this.#publish({phase:'reconcile',blockedReason:readback,requiresReadback:true,error:'返回审阅方案不完整，或修改了白名单以外的原始资料、候选与依据。',notice:'当前方案和草稿未替换；请明确读回原方案的最新已保存版本核对。'});return;}
  const delivery={...attempt,result};this.#delivery=delivery;await this.#deliver(delivery);
 };
 retryDelivery=async()=>{
  if(!this.#active||this.#physicalPending||this.#handoffPending)return;this.refresh();const delivery=this.#delivery;
  if(!delivery||this.#state.phase!=='delivering'||!this.#state.error||this.options.host.isBusy()||!this.#live(delivery))return;
  await this.#deliver(delivery);
 };
}
