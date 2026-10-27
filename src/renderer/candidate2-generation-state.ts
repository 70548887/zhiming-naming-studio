import type {Candidate2GenerateSavedResult,Candidate2GenerationAPI} from '../shared/candidate2-generation-api';
import {CANDIDATE2_NAMING_SELECTION} from '../shared/candidate2-naming-consumer-v1';
import type {CulturalAppHost} from './cultural-workflow-app';
import type {Candidate2GenerationUiState} from './candidate2-generation-ui';
import {candidate2ContextSignature,candidate2GenerationBlock,candidate2OwnedInput,type Candidate2GenerationContext} from './candidate2-generation-input';
import {correlateCandidate2SavedResult} from './candidate2-generation-correlation';

export const CANDIDATE2_GENERATION_WRITE_LABEL='按项目固定取法生成名字';
type Method=Candidate2GenerationAPI['generateCandidate2'];
interface Binding {source:object;descriptor:PropertyDescriptor;method:Method;}
interface Frame {context:Candidate2GenerationContext;signature:string;binding?:Binding;}
export interface Candidate2GenerationDeliveryLease {isCurrent:()=>boolean;}
export interface Candidate2GenerationBindings {
 getContext:()=>Candidate2GenerationContext;getSource:()=>unknown;host:CulturalAppHost;
 getOwnerGuard:()=>()=>boolean;
 onGenerated:(result:Candidate2GenerateSavedResult,lease:Candidate2GenerationDeliveryLease)=>void|Promise<void>;
}
function binding(source:unknown):Binding|undefined {
 try{if(!source||typeof source!=='object')return;const descriptor=Object.getOwnPropertyDescriptor(source,'generateCandidate2');if(descriptor&&Object.hasOwn(descriptor,'value')&&typeof descriptor.value==='function')return{source,descriptor,method:descriptor.value};}catch{/* Shape discovery only, not a capability. */}
}
function sameBinding(left:Binding|undefined,right:Binding|undefined):boolean {
 if(!left||!right)return left===right;
 return left.source===right.source&&left.method===right.method&&left.descriptor.enumerable===right.descriptor.enumerable&&left.descriptor.writable===right.descriptor.writable&&left.descriptor.configurable===right.descriptor.configurable;
}
function frozen<T>(value:T):T {if(value&&typeof value==='object'){for(const child of Object.values(value))frozen(child);Object.freeze(value);}return value;}
function savedSnapshot(result:Candidate2GenerateSavedResult):Candidate2GenerateSavedResult{return frozen(JSON.parse(JSON.stringify(result)) as Candidate2GenerateSavedResult);}
const message=(error:unknown)=>error instanceof Error?error.message:String(error);
const unavailable=(error:unknown)=>/CANDIDATE2[^\s:]*UNAVAILABLE|not found|404|未接入|尚未连接|此功能使用系统文件选择器/i.test(message(error));

/** Explicit user-action owner. It performs only the future exact-three API
 * call, never eligibility, ordinary generation, saveSession or a local fallback. */
export class Candidate2GenerationController {
 #active=false;#serial=0;#physicalPending=false;#handoffPending=false;#frame:Frame;#listeners=new Set<()=>void>();
 #delivery?:{result:Candidate2GenerateSavedResult;frame:Frame;ownerGuard:()=>boolean};
 #state:Candidate2GenerationUiState;
 constructor(readonly options:Candidate2GenerationBindings){
  this.#frame=this.#capture();this.#state={enabled:false,phase:'idle',requestPending:false,canGenerate:false,blockedReason:this.#reason(this.#frame),notice:'默认关闭；明确启用后仍需单独点击生成。只读资格结果不授予生成许可。',error:null};
 }
 getSnapshot=()=>this.#state;
 subscribe=(listener:()=>void)=>{this.#listeners.add(listener);return()=>{this.#listeners.delete(listener);};};
 #capture():Frame {
  try{const context=candidate2OwnedInput(this.options.getContext());return{context,signature:candidate2ContextSignature(context),binding:binding(this.options.getSource())};}
  catch{return{context:{profile:{} as Candidate2GenerationContext['profile'],preferences:{} as Candidate2GenerationContext['preferences'],savedProfile:null,savedPreferences:null,storageReadOnly:true,dirty:true,contextKey:'invalid'},signature:'invalid-input',binding:binding(this.options.getSource())};}
 }
 #reason(frame:Frame){return candidate2GenerationBlock(frame.context)??(!frame.binding?'当前环境尚未接入项目固定取法生成接口。':null);}
 #publish(patch:Partial<Candidate2GenerationUiState>){
  const next={...this.#state,...patch,requestPending:this.#physicalPending||this.#handoffPending};
  next.canGenerate=next.enabled&&!next.requestPending&&!next.blockedReason&&!['generating','delivering','blocked','unavailable'].includes(next.phase);
  this.#state=next;for(const notify of this.#listeners)notify();
 }
 #same(frame:Frame){const current=this.#capture();return frame.signature===current.signature&&sameBinding(frame.binding,current.binding);}
 #live(serial:number,frame:Frame,ownerGuard:()=>boolean){return this.#active&&this.#serial===serial&&this.#state.enabled&&ownerGuard()&&this.#same(frame);}
 #reset(notice:string){this.#serial++;this.#delivery=undefined;this.#publish({enabled:false,phase:'idle',blockedReason:this.#reason(this.#frame),notice,error:null,savedSummary:undefined});}
 attach=()=>{this.#active=true;this.refresh();};
 detach=()=>{this.#active=false;this.#frame=this.#capture();this.#reset('已离开生成入口；已发出的请求仍会在后端完成或失败，迟到结果不替换当前资料。');};
 refresh=()=>{
  const next=this.#capture();
  if(next.signature!==this.#frame.signature||!sameBinding(next.binding,this.#frame.binding)){
   this.#frame=next;this.#reset('宝宝、完整资料、偏好、存储或生成连接已变化；本次选择已关闭，请按当前已保存资料重新选择。');
  }else if(this.#active&&this.#state.enabled&&!this.#physicalPending&&this.#state.phase==='blocked'&&!this.#reason(next)&&!this.options.host.isBusy()){
   this.#publish({phase:'idle',blockedReason:null,notice:'工作台已空闲，可按当前已保存资料重新明确生成。'});
  }
 };
 setEnabled=(enabled:boolean)=>{
  if(!this.#active)return;this.refresh();
  if(enabled===this.#state.enabled)return;
  if(!enabled){this.#reset('已关闭项目固定取法。停止等待不撤销已经发出的后端请求。');return;}
  const reason=this.#reason(this.#frame);this.#serial++;this.#delivery=undefined;
  this.#publish({enabled:true,phase:reason?(this.#frame.binding?'blocked':'unavailable'):'idle',blockedReason:reason,notice:'已明确选择项目固定取法。尚未生成或保存；请核对已保存档案后单独点击生成。',error:null,savedSummary:undefined});
 };
 cancel=()=>{if(!this.#active)return;this.#reset('已停止等待，本地不会采用这次迟到回复。已发出的后端请求及其共享写锁会持续到实际请求结束。');};
 async #deliver(serial:number,frame:Frame,ownerGuard:()=>boolean,result:Candidate2GenerateSavedResult){
  if(!this.#live(serial,frame,ownerGuard))return;
  let release:()=>void;
  try{release=this.options.host.acquireWrite(CANDIDATE2_GENERATION_WRITE_LABEL);}catch(error){this.#publish({phase:'delivering',error:message(error),notice:'方案已返回，工作台暂时忙碌。请稍后明确重新接收，重试不会再次生成。'});return;}
  this.#handoffPending=true;this.#publish({phase:'delivering',notice:'服务已返回保存方案，正在交回当前工作台。这里只核对请求对应关系，不核发来源或存储资格。',error:null});
  try{
   await this.options.onGenerated(result,{isCurrent:()=>this.#live(serial,frame,ownerGuard)});
   if(this.#live(serial,frame,ownerGuard)){
    this.#delivery=undefined;this.#publish({phase:'ready',notice:'当前请求对应的保存方案已交回工作台；传统结论仍为未知，来源与存储资格由真实后端判断。',error:null,savedSummary:{sessionId:result.session.id,profileId:result.session.profileId,candidateCount:result.session.candidates.length,traditionalStatus:'unknown'}});
   }
  }catch(error){if(this.#live(serial,frame,ownerGuard))this.#publish({phase:'delivering',notice:'服务已返回方案，但工作台接收未完成。重试接收会复用同一回复，不再次生成。',error:message(error)});}
  finally{this.#handoffPending=false;release();if(this.#active)this.#publish({});}
 }
 generate=async()=>{
  if(!this.#active)return;this.refresh();if(!this.#state.enabled||this.#physicalPending||this.#state.phase==='delivering')return;
  const frame=this.#frame,reason=this.#reason(frame),ownerGuard=this.options.getOwnerGuard();
  if(reason||!ownerGuard()){this.#publish({phase:!frame.binding?'unavailable':'blocked',blockedReason:reason??'当前资料已变化，请按当前界面重新选择。',error:null});return;}
  if(this.options.host.isBusy()){this.#publish({phase:'blocked',blockedReason:'工作台正在处理其他操作，请等待完成后重新明确生成。',error:null});return;}
  let release:()=>void;
  try{release=this.options.host.acquireWrite(CANDIDATE2_GENERATION_WRITE_LABEL);}catch(error){this.#publish({phase:'blocked',blockedReason:message(error),error:null});return;}
  const serial=++this.#serial;this.#physicalPending=true;this.#delivery=undefined;
  this.#publish({phase:'generating',blockedReason:null,error:null,notice:'正在按已保存宝宝档案生成并保存。此操作独立检查原始输入；不会复用只读资格结果。',savedSummary:undefined});
  let raw:unknown,failure:unknown,failed=false;
  try{
   // Only exact original ID, exact raw preferences and the frozen selection.
   raw=await frame.binding!.method.call(frame.binding!.source,frame.context.profile.id,candidate2OwnedInput(frame.context.preferences),CANDIDATE2_NAMING_SELECTION);
  }catch(error){failed=true;failure=error;}
  finally{this.#physicalPending=false;release();if(this.#active)this.#publish({});}
  if(!this.#live(serial,frame,ownerGuard))return;
  if(failed){this.#publish({phase:unavailable(failure)?'unavailable':'error',blockedReason:unavailable(failure)?'真实生成接口或固定资源尚不可用，未采用其他生成路径。':null,error:message(failure),notice:'本次生成未接回可用方案。后端可能已处理请求，请先按实际状态核对；重试生成会发出新请求。'});return;}
  const matched=correlateCandidate2SavedResult(raw,{profile:frame.context.savedProfile!,preferences:frame.context.preferences});
  if(!matched){this.#publish({phase:'error',error:'返回方案不完整，或与本次原始已保存档案、偏好、固定取法及候选记录不一致。当前工作台未替换。',notice:'仅有 saved 状态或对象形状不足以采用方案；请读取真实后端记录核对。'});return;}
  const result=savedSnapshot(matched);this.#delivery={result,frame,ownerGuard};
  await this.#deliver(serial,frame,ownerGuard,result);
 };
 retryDelivery=async()=>{
  if(!this.#active||this.#physicalPending||this.#handoffPending)return;this.refresh();const cached=this.#delivery;
  if(!cached||this.#state.phase!=='delivering'||!this.#state.error||this.options.host.isBusy()||!this.#live(this.#serial,cached.frame,cached.ownerGuard))return;
  await this.#deliver(this.#serial,cached.frame,cached.ownerGuard,cached.result);
 };
}
