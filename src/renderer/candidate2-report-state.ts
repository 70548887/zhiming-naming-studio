import {canonicalPlainJson} from '../shared/plain-json';
import {readCustomerWriteNoticeDelivery} from '../shared/customer-write-notice-delivery';
import type {Candidate2ReportAPI,Candidate2ReportDocument,Candidate2ReportReference} from '../shared/candidate2-report-api';
import type {CulturalAppHost} from './cultural-workflow-app';
import {candidate2ReportReference,captureCandidate2ReportDocument} from './candidate2-report-boundary';

export type Candidate2ReportAction='preview'|'export';
export interface Candidate2ReportContext{
 canonicalSession:unknown;profileId:string;sessionCurrent:boolean;formDirty:boolean;draftDirty:boolean;desktop:boolean;requiresRestart:boolean;contextKey:string;
}
export interface Candidate2ReportUiState{
 phase:'idle'|'confirming'|'previewing'|'exporting'|'ready'|'exported'|'cancelled'|'blocked'|'unavailable'|'error';
 requestPending:boolean;requiresRestart:boolean;canPreview:boolean;canExport:boolean;confirmation:Candidate2ReportAction|null;
 reference:Readonly<Candidate2ReportReference>|null;preview:Readonly<Candidate2ReportDocument>|null;notice:string;error:string|null;blockedReason:string|null;
}
export interface Candidate2ReportBindings{getContext:()=>Candidate2ReportContext;getSource:()=>unknown;getOwnerGuard:()=>()=>boolean;host:CulturalAppHost;}
type ReportMethod=(...args:Parameters<Candidate2ReportAPI['previewCandidate2Report']>)=>Promise<unknown>;
interface Binding{source:object;method:ReportMethod;descriptor:PropertyDescriptor;}
interface Frame{signature:string;context?:Candidate2ReportContext;reference:Readonly<Candidate2ReportReference>|null;preview?:Binding;export?:Binding;reason:string|null;}
const message=(error:unknown)=>error instanceof Error?error.message:typeof error==='string'?error:'报告操作未完成，请核对当前已保存方案。';
const missing=(error:unknown)=>/404|not found|未接入|尚未连接|CANDIDATE2[^\s:]*UNAVAILABLE/i.test(message(error));
function method(source:unknown,name:string):Binding|undefined{try{if(!source||typeof source!=='object')return;const descriptor=Object.getOwnPropertyDescriptor(source,name);if(descriptor&&Object.hasOwn(descriptor,'value')&&typeof descriptor.value==='function')return{source,descriptor,method:descriptor.value};}catch{/* Never evaluate accessors or fall back. */}}
function same(a:Binding|undefined,b:Binding|undefined){return!a||!b?a===b:a.source===b.source&&a.method===b.method&&['enumerable','writable','configurable'].every(key=>a.descriptor[key as keyof PropertyDescriptor]===b.descriptor[key as keyof PropertyDescriptor]);}

/** Explicit read/export owner only. No saveSession, generic export, renderer
 * template, source validation bypass, history append or automatic retry. */
export class Candidate2ReportController{
 #active=false;#serial=0;#pending=false;#restart=false;#frame:Frame;#intent?:{frame:Frame;action:Candidate2ReportAction;owner:()=>boolean};#listeners=new Set<()=>void>();#state:Candidate2ReportUiState;
 constructor(readonly options:Candidate2ReportBindings){this.#frame=this.#capture();this.#state={phase:'idle',requestPending:false,requiresRestart:false,canPreview:false,canExport:false,confirmation:null,reference:this.#frame.reference,preview:null,notice:'仅通过明确操作读取当前已保存版本的报告；不会保存人工草稿。',error:null,blockedReason:null};}
 getSnapshot=()=>this.#state;
 subscribe=(listener:()=>void)=>{this.#listeners.add(listener);return()=>{this.#listeners.delete(listener);};};
 #capture():Frame{
  let source:unknown;try{source=this.options.getSource();}catch{/* Unavailable. */}const preview=method(source,'previewCandidate2Report'),exportMethod=method(source,'exportCandidate2Report');
  try{
   const signature=canonicalPlainJson(this.options.getContext());if(signature.length>32*1024*1024)throw Error('报告上下文过大。');
   const context=JSON.parse(signature) as Candidate2ReportContext;
   if(typeof context.profileId!=='string'||typeof context.contextKey!=='string'||['sessionCurrent','formDirty','draftDirty','desktop','requiresRestart'].some(key=>typeof context[key as keyof Candidate2ReportContext]!=='boolean'))throw Error('报告需要明确的当前已保存方案与运行环境。');
   const reference=candidate2ReportReference(context.canonicalSession);const profile=(context.canonicalSession as {profileId?:unknown})?.profileId;
   const reason=profile!==context.profileId?'当前宝宝与已保存方案不一致。':context.formDirty||!context.sessionCurrent?'出生资料或起名偏好尚有变化，请先保存审阅所对应的资料，或明确打开原方案。':null;
   return{signature,context,reference,preview,export:exportMethod,reason};
  }catch(error){return{signature:'invalid-report-context',reference:null,preview,export:exportMethod,reason:message(error)};}
 }
 #reason(frame:Frame,action:Candidate2ReportAction){return this.#restart||frame.context?.requiresRestart?'存在资料收尾提醒，请保留草稿并重启后核对已保存版本。':frame.reason??(action==='export'&&!frame.context?.desktop?'浏览器仅支持报告预览，不提供桌面 PDF 文件导出。':!frame[action]?'当前环境尚未接入专用报告'+(action==='preview'?'预览':'导出')+'接口。':null);}
 #publish(patch:Partial<Candidate2ReportUiState>){
  const next={...this.#state,...patch,requestPending:this.#pending,requiresRestart:this.#restart||this.#frame.context?.requiresRestart===true,reference:this.#frame.reference};
  next.canPreview=this.#active&&!this.#pending&&!next.confirmation&&!this.#reason(this.#frame,'preview');
  next.canExport=this.#active&&!this.#pending&&!next.confirmation&&!this.#reason(this.#frame,'export');
  this.#state=next;for(const listener of this.#listeners)listener();
 }
 #same(frame:Frame){const now=this.#capture();return now.signature===frame.signature&&same(frame.preview,now.preview)&&same(frame.export,now.export);}
 #live(serial:number,frame:Frame,owner:()=>boolean){try{return this.#active&&!this.#restart&&!frame.context?.requiresRestart&&serial===this.#serial&&owner()&&this.#same(frame);}catch{return false;}}
 #retire(notice:string){this.#serial++;this.#intent=undefined;const action=this.#frame.context?.desktop?'export':'preview',reason=this.#reason(this.#frame,action);this.#publish({phase:reason?(!this.#frame[action]?'unavailable':'blocked'):'idle',confirmation:null,preview:null,error:null,blockedReason:reason,notice});}
 attach=()=>{this.#active=true;this.refresh();const action=this.#frame.context?.desktop?'export':'preview',reason=this.#reason(this.#frame,action);this.#publish(reason?{phase:!this.#frame[action]?'unavailable':'blocked',blockedReason:reason}:{});};
 detach=()=>{this.#active=false;this.#retire('已离开报告入口；已发出的读取或桌面导出仍保持工作台租约直至实际结束。');};
 refresh=()=>{const next=this.#capture();if(next.signature!==this.#frame.signature||!same(next.preview,this.#frame.preview)||!same(next.export,this.#frame.export)){this.#frame=next;this.#retire('当前方案、草稿、页面或报告连接已变化；旧预览与待确认操作已失效。');}};
 cancel=()=>{if(this.#active)this.#retire('已停止等待并保留原草稿。已发出的主进程读取、文件对话框或导出不会因此撤销；租约保持到实际操作结束。');};
 closePreview=()=>{if(this.#active)this.#publish({preview:null,phase:'idle',notice:'已关闭预览，当前资料与人工草稿保留。'});};
 dismissConfirmation=()=>{if(this.#active){this.#intent=undefined;this.#publish({confirmation:null,phase:'idle',notice:'已返回审阅，尚未请求报告，也未保存草稿。'});}};
 receiveWriteNotice=(raw:unknown)=>{const delivery=readCustomerWriteNoticeDelivery(raw);if(!delivery)return false;this.#restart=true;this.#retire(delivery.notice.message);return true;};
 request=(action:Candidate2ReportAction)=>{
  if(!this.#active)return;this.refresh();if(this.#pending||this.#state.confirmation)return;const frame=this.#frame,reason=this.#reason(frame,action);
  if(reason){this.#publish({phase:!frame[action]?'unavailable':'blocked',blockedReason:reason,error:null,notice:reason});return;}
  if(this.options.host.isBusy()){this.#publish({phase:'blocked',blockedReason:'工作台正在处理其他操作，请稍后明确请求报告。',error:null});return;}
  const owner=this.options.getOwnerGuard();if(!owner())return;
  if(frame.context!.draftDirty){this.#intent={frame,action,owner};this.#publish({phase:'confirming',confirmation:action,preview:null,blockedReason:null,error:null,notice:'当前有未保存的人工草稿。请先保存审阅，或明确仅使用当前已保存版本；报告请求不会自动保存草稿。'});return;}
  void this.#dispatch(action,frame,owner);
 };
 confirmSavedOnly=async()=>{const intent=this.#intent;if(!intent||!this.#active||this.#pending)return;this.#intent=undefined;this.refresh();if(!intent.owner()||!this.#same(intent.frame)||this.#reason(intent.frame,intent.action))return;await this.#dispatch(intent.action,intent.frame,intent.owner);};
 async #dispatch(action:Candidate2ReportAction,frame:Frame,owner:()=>boolean){
  if(this.options.host.isBusy()||!this.#active||this.#pending||this.#reason(frame,action)||!owner()||!this.#same(frame))return;
  let release:()=>void;try{release=this.options.host.acquireWrite(action==='preview'?'读取已保存项目报告预览':'导出已保存项目报告');}catch(error){this.#publish({phase:'blocked',blockedReason:message(error)});return;}
  const serial=++this.#serial;this.#pending=true;this.#publish({phase:action==='preview'?'previewing':'exporting',confirmation:null,preview:null,error:null,blockedReason:null,notice:action==='preview'?'正在读取主进程报告预览；人工草稿不会进入报告。':'正在由桌面主进程核对来源并处理 PDF 文件对话框。'});
  let raw:unknown,failure:unknown,failed=false;
  try{const ref=frame.reference!;raw=await frame[action]!.method.call(frame[action]!.source,ref.id,ref.expectedReviewRevision,ref.expectedReviewToken);}catch(error){failed=true;failure=error;}
  finally{this.#pending=false;release();if(this.#active)this.#publish({});}
  if(!this.#live(serial,frame,owner)){if(this.#active&&serial===this.#serial){this.#frame=this.#capture();this.#retire('报告请求结束，但当前来源或资料已变化；旧结果未显示，当前草稿保留。');}return;}
  if(failed){this.#publish({phase:missing(failure)?'unavailable':'error',error:message(failure),notice:'报告操作未返回可采用结果。请核对已保存方案后再明确操作；没有自动保存、重试或普通导出回退。'});return;}
  if(action==='preview'){
   const document=captureCandidate2ReportDocument(raw,frame.reference!);if(!document){this.#publish({phase:'error',error:'报告文档不完整或与当前原始已保存版本不一致，未显示。',notice:'仅有 HTML 或 ready 字样不足以采用报告。'});return;}
   this.#publish({phase:'ready',preview:document,notice:'已返回当前已保存版本的报告预览。预览不等于已生成或保存 PDF。'});
  }else if(raw===null)this.#publish({phase:'cancelled',notice:'已取消桌面文件保存；未把草稿写入方案。',error:null});
  else if(typeof raw==='string'&&raw.trim()&&raw.length<=32768)this.#publish({phase:'exported',notice:'桌面报告接口已返回导出文件：'+raw,error:null});
  else this.#publish({phase:'error',error:'桌面导出接口返回值无效，未确认文件结果。',notice:'请按实际文件状态核对；不会调用普通导出或保存。'});
 }
}
