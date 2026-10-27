import {canonicalPlainJson} from '../shared/plain-json';
import type {ManualCharacterMeaningAPI,ManualCharacterMeaningDirectory,ManualCharacterMeaningSelection} from '../shared/manual-character-meaning-api';
import {readCustomerWriteNoticeDelivery} from '../shared/customer-write-notice-delivery';
import type {CulturalAppHost} from './cultural-workflow-app';
import type {ManualCharacterMeaningPanelState,ManualCharacterMeaningDirectoryView,ManualCharacterMeaningExplanationView} from './manual-character-meaning-panel-ui';
import {manualCharacterMeaningInputError,currentManualCharacterMeaningDirectory} from './ManualCharacterMeaningPanel';

export interface ManualMeaningContext{active:boolean;contextKey:string;requiresRestart:boolean;}
interface Binding{source:object;descriptor:PropertyDescriptor;method:(request:unknown)=>Promise<unknown>;}
interface Frame{signature:string;context:ManualMeaningContext;list?:Binding;select?:Binding;}
export interface ManualMeaningBindings{getContext:()=>ManualMeaningContext;getSource:()=>unknown;getOwnerGuard:()=>()=>boolean;host:CulturalAppHost;}
function bind(source:unknown,name:string):Binding|undefined{try{if(!source||typeof source!=='object')return;const descriptor=Object.getOwnPropertyDescriptor(source,name);if(descriptor&&Object.hasOwn(descriptor,'value')&&typeof descriptor.value==='function')return{source,descriptor,method:descriptor.value};}catch{/* No getter or fallback. */}}
function same(a:Binding|undefined,b:Binding|undefined){return!a||!b?a===b:a.source===b.source&&a.method===b.method&&['enumerable','writable','configurable'].every(key=>a.descriptor[key as keyof PropertyDescriptor]===b.descriptor[key as keyof PropertyDescriptor]);}
function owned<T>(raw:unknown):T{const json=canonicalPlainJson(raw);if(json.length>2*1024*1024)throw Error('人工释义返回过大，未采用。');return JSON.parse(json) as T;}
function boundaries(value:any){return value?.usageStatus==='manual-context-required'&&value.candidateOnly===true&&value.activation==='off'&&['productionApproved','admissionGranted','automaticMeaningAllowed','automaticNameRecommendation','automaticSemanticCreditAllowed','sourceAuthority','generationAuthority'].every(key=>value[key]===false)&&value.wholeNameMeaning===null&&value.scoreDelta===0&&value.formalCoverageAdded===0&&value.automaticCoverageAdded===0;}
const message=(error:unknown)=>error instanceof Error?error.message:typeof error==='string'?error:'人工释义操作未完成，请重新明确查询。';
const absent=(error:unknown)=>/404|not found|尚未接入|未连接/i.test(message(error));
export function captureManualMeaningDirectory(raw:unknown,char:string):ManualCharacterMeaningDirectoryView{
 const result=owned<ManualCharacterMeaningDirectory>(raw);
 if(result.schema!=='manual-character-meaning-directory/1'||result.mode!=='manual-request'||result.char!==char||!boundaries(result))throw Error('人工释义目录返回不完整或不属于当前字。');
 const directory:ManualCharacterMeaningDirectoryView={char:result.char,status:result.status,items:result.items};
 const state:ManualCharacterMeaningPanelState={ownerKey:'view',phase:'ready',requestPending:false,directory,explanation:null,notice:'',error:null};
 if(!currentManualCharacterMeaningDirectory({value:char,ownerKey:'view',state,onInputChange:()=>{},onQuery:()=>{},onSelect:()=>{},onCancel:()=>{}}))throw Error('人工释义目录字段不完整，未补用其他词义。');
 return directory;
}
export function captureManualMeaningSelection(raw:unknown,char:string,key:string):ManualCharacterMeaningExplanationView|null{
 const result=owned<ManualCharacterMeaningSelection>(raw);
 if(result.schema!=='manual-character-meaning-selection/1'||result.mode!=='manual-request'||!boundaries(result))throw Error('人工选义返回不完整。');
 if(result.status==='invalid-selection'&&result.explanation===null&&typeof result.reason==='string')return null;
 const value=result.explanation;
 if(result.status!=='selected'||result.reason!==null||!value||value.char!==char||value.selectionKey!==key||typeof value.meaning!=='string'||!value.meaning||typeof value.manualReason!=='string'||!Array.isArray(value.limits)||!value.limits.every(line=>typeof line==='string'))throw Error('人工选义说明不属于当前选择。');
 return value;
}

/** Manual-only owner. No automatic lookup, ordinary query/save/generation,
 * client pack identity or technical sense ID enters either dedicated call. */
export class ManualCharacterMeaningController{
 #active=false;#serial=0;#pending=false;#restart=false;#frame:Frame;#listeners=new Set<()=>void>();
 #value='';#state:ManualCharacterMeaningPanelState;
 constructor(readonly options:ManualMeaningBindings){this.#frame=this.#capture();this.#state={ownerKey:'manual-ui/0',phase:'idle',requestPending:false,directory:null,explanation:null,notice:'人工参考，未纳入自动推荐；请选择单字并明确查询。',error:null};}
 getSnapshot=()=>this.#state;
 getValue=()=>this.#value;
 subscribe=(listener:()=>void)=>{this.#listeners.add(listener);return()=>{this.#listeners.delete(listener);};};
 #capture():Frame{let source:unknown;try{source=this.options.getSource();}catch{}const list=bind(source,'listManualCharacterMeanings'),select=bind(source,'selectManualCharacterMeaning');try{const json=canonicalPlainJson(this.options.getContext()),context=JSON.parse(json) as ManualMeaningContext;if(typeof context.active!=='boolean'||typeof context.requiresRestart!=='boolean'||typeof context.contextKey!=='string')throw Error();return{signature:json,context,list,select};}catch{return{signature:'invalid',context:{active:false,requiresRestart:true,contextKey:'invalid'},list,select};}}
 #reason(frame=this.#frame){return this.#restart||frame.context.requiresRestart?'存在资料收尾提醒，请保留当前资料并重启后再查。':!frame.context.active?'请明确打开“人工释义参考”入口后再查询。':!frame.list||!frame.select?'手动释义目录或选义接口尚未接入。':null;}
 getBlockedReason=()=>this.#reason();
 #publish(patch:Partial<ManualCharacterMeaningPanelState>){this.#state={...this.#state,...patch,requestPending:this.#pending};for(const listener of this.#listeners)listener();}
 #retire(notice:string){this.#serial++;this.#publish({ownerKey:'manual-ui/'+this.#serial,phase:this.#reason()?'unavailable':'idle',directory:null,explanation:null,error:null,notice});}
 attach=()=>{this.#active=true;this.refresh();if(this.#reason())this.#publish({phase:'unavailable',notice:this.#reason()!});};
 detach=()=>{this.#active=false;this.#retire('已离开人工释义入口；实际请求结束前仍保留工作台租约。');};
 refresh=()=>{const next=this.#capture();if(next.signature!==this.#frame.signature||!same(next.list,this.#frame.list)||!same(next.select,this.#frame.select)){this.#frame=next;this.#retire('当前资料、词库、页面或连接已变化，请重新明确查询。');}};
 setInput=(value:string)=>{if(!this.#active)return;this.#value=value;this.#retire('输入已改变；尚未查询，新输入不会自动读取目录。');};
 cancel=()=>{if(this.#active)this.#retire('已停止等待；请求不会撤销，迟到回复不会标记为当前结果。');};
 receiveWriteNotice=(raw:unknown)=>{if(!readCustomerWriteNoticeDelivery(raw))return false;this.#restart=true;this.#retire('资料收尾需要核对，请重启后再人工查义。');return true;};
 #live(serial:number,frame:Frame,owner:()=>boolean,char:string){try{const now=this.#capture();return this.#active&&serial===this.#serial&&!this.#restart&&!now.context.requiresRestart&&owner()&&this.#value===char&&frame.signature===now.signature&&same(frame.list,now.list)&&same(frame.select,now.select);}catch{return false;}}
 query=async(char:string)=>{if(char!==this.#value||manualCharacterMeaningInputError(char))return;await this.#run('query',char);};
 select=async(key:string)=>{const row=this.#state.directory?.items.find(item=>item.selectionKey===key);if(!row||row.char!==this.#value)return;await this.#run('select',row.char,key);};
 async #run(kind:'query'|'select',char:string,key?:string){
  if(!this.#active)return;this.refresh();if(this.#pending)return;
  if(kind==='select'&&!this.#state.directory?.items.some(item=>item.char===char&&item.selectionKey===key))return;
  const frame=this.#frame,reason=this.#reason(frame);
  if(reason){this.#publish({phase:'unavailable',notice:reason,error:null});return;}
  if(this.options.host.isBusy()){this.#publish({phase:'error',error:'工作台正在处理其他操作，请等待后重新明确查询。'});return;}
  const owner=this.options.getOwnerGuard();if(!owner())return;let release:()=>void;
  try{release=this.options.host.acquireWrite(kind==='query'?'查已审人工释义':'核对人工选义');}catch(error){this.#publish({phase:'error',error:message(error)});return;}
  const serial=++this.#serial;this.#pending=true;this.#publish({ownerKey:'manual-ui/'+serial,phase:kind==='query'?'querying':'selecting',directory:kind==='query'?null:this.#state.directory,explanation:null,error:null,notice:kind==='query'?'正在核对当前活动词库与已审人工释义。':'正在重新核对包和所选义项；不授自动推荐或保存权限。'});
  let raw:unknown,failure:unknown,failed=false;
  try{raw=kind==='query'?await frame.list!.method.call(frame.list!.source,{mode:'manual-request',char}):await frame.select!.method.call(frame.select!.source,{mode:'manual-request',selectionKey:key!});}catch(error){failed=true;failure=error;}
  finally{this.#pending=false;release();if(this.#active)this.#publish({});}
  if(!this.#live(serial,frame,owner,char)){if(this.#active&&serial===this.#serial){this.#frame=this.#capture();this.#retire('当前字、资料或连接已变化，旧回复未采用。');}return;}
  if(failed){this.#publish({phase:absent(failure)?'unavailable':'error',directory:null,explanation:null,error:message(failure),notice:'资料读取或核对失败；这不是“无资料”，也没有回退到默认词义。'});return;}
  try{
   if(kind==='query'){const directory=captureManualMeaningDirectory(raw,char);this.#publish({phase:'ready',directory,notice:directory.status==='not-covered'?'当前已审目录没有此字资料。':'目录已核对，请阅读原义与限制后明确选一义项。'});}
   else{const explanation=captureManualMeaningSelection(raw,char,key!);this.#publish(explanation?{phase:'selected',explanation,notice:'已返回人工选义说明；未纳自动推荐，不改评分、不保存。'}:{phase:'error',directory:null,explanation:null,error:'选择已失效，请重新查已审释义后再选择。',notice:'选义失效不等于无资料；没有采用旧回复。'});}
  }catch(error){this.#publish({phase:'error',directory:null,explanation:null,error:message(error),notice:'返回对应关系校验失败，没有采用或补造说明。'});}
 }
}
