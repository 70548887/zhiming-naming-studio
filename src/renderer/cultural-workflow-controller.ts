import {canonicalPlainJson} from '../shared/plain-json';
import {CULTURAL_WORKFLOW_METHODS,hasCulturalWorkflowAPI,type CulturalWorkflowAPI} from '../shared/cultural-workflow-api';
import type {CulturalAnchorRequest,CulturalProviderAnchor,CulturalProviderCandidateRequest,CulturalProviderOptions,CulturalProviderPreview,CulturalProviderReply} from '../shared/qimen-cultural-provider-v1';
import type {CulturalSaveRequest,PreparedCulturalWrite,CulturalSaveResult} from '../shared/cultural-storage-v3';

type Capabilities=Awaited<ReturnType<CulturalWorkflowAPI['getCulturalStorageCapabilities']>>;
type Migration=Awaited<ReturnType<CulturalWorkflowAPI['previewCulturalStorageMigration']>>;
type Saved=Awaited<ReturnType<CulturalWorkflowAPI['readCulturalComparison']>>;
type Revisions=Awaited<ReturnType<CulturalWorkflowAPI['listCulturalRevisions']>>;
export type CulturalWorkflowAction='prepare'|'compare'|'migration-preview'|'migrate'|'prepare-write'|'commit'|'read'|'history'|'restore';
export interface CulturalWorkflowContext {
 ownerProfileId:string;anchorRequest:CulturalAnchorRequest;contextKey:string;
 candidates:readonly CulturalProviderCandidateRequest[];comparisonId?:string;
}
export interface CulturalWorkflowState {
 enabled:boolean;busy:CulturalWorkflowAction|null;error:string|null;notice:string;
 capabilities?:Capabilities;anchor?:CulturalProviderAnchor;options:readonly CulturalProviderOptions[];
 selections:Readonly<Record<string,string>>;preview?:CulturalProviderPreview;note:string;
 migration?:Migration;migrationConsent:boolean;prepared?:PreparedCulturalWrite;attempt?:CulturalSaveRequest;
 uncertainWrite:boolean;commitResult?:Exclude<CulturalSaveResult,{status:'conflict'}>;
 saved?:Saved;viewed?:Saved;history:Revisions;restoreConsent:boolean;
 saveMode:'create'|'revise';
}
const own=<T,>(value:T):T=>JSON.parse(canonicalPlainJson(value));
const initial=():CulturalWorkflowState=>({enabled:false,busy:null,error:null,notice:'默认关闭，不读取或写入文化比较资料。',options:[],selections:{},note:'',migrationConsent:false,uncertainWrite:false,history:[],restoreConsent:false,saveMode:'create'});
const nonempty=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=1000;
const key=(token:string,position:number)=>token+':'+position;
const errorText=(error:unknown)=>error instanceof Error?error.message:'文化比较操作失败，请按原请求重试。';
function ok<T>(reply:CulturalProviderReply<T>):T {if(reply.kind!=='ok')throw Error(reply.message);return reply.value;}

/** User-action controller. Its generation is independent of every server DTO.
 * Invalidating a request only stops UI delivery, not an already issued write.
 * Public API types are imported from the single owning shared contract. */
export class CulturalWorkflowController {
 readonly context:CulturalWorkflowContext;
 #api:CulturalWorkflowAPI|undefined;#state=initial();#mounted=false;#generation=0;
 #methodIdentity:readonly unknown[];
 #listeners=new Set<()=>void>();
 #restoreAttempt?:{id:string;target:number;expected:number;reviewToken:string;idempotencyKey:string};
 #restoreInFlight=false;
 constructor(api:CulturalWorkflowAPI|undefined,context:CulturalWorkflowContext){this.#api=api;this.context=own(context);this.#methodIdentity=this.#methods();}
 getSnapshot=()=>this.#state;
 subscribe=(listener:()=>void)=>{this.#listeners.add(listener);return()=>{this.#listeners.delete(listener);};};
 mount=()=>{this.#mounted=true;return()=>{this.#mounted=false;++this.#generation;this.#state=initial();};};
 #update(patch:Partial<CulturalWorkflowState>){this.#state={...this.#state,...patch};for(const notify of this.#listeners)notify();}
 #methods(){try{return CULTURAL_WORKFLOW_METHODS.map(method=>{const slot=this.#api&&Object.getOwnPropertyDescriptor(this.#api,method);return slot&&Object.hasOwn(slot,'value')?slot.value:undefined;});}catch{return[];}}
 #resourceCurrent(){const current=this.#methods();return current.length===this.#methodIdentity.length&&current.every((method,index)=>method===this.#methodIdentity[index]);}
 #live(token:number){
  if(!this.#mounted||!this.#state.enabled||token!==this.#generation)return false;
  if(!this.#resourceCurrent()){++this.#generation;this.#update({busy:null,error:'文化 API 连接已变化，本次迟到回复已丢弃。请由当前页面重新建立工作流；已发出的写入不会被撤销。',anchor:undefined,options:[],selections:{},preview:undefined});return false;}
  return true;
 }
 #apiRequired(){if(!this.#resourceCurrent())throw Error('文化 API 连接已变化，请由当前页面重新建立工作流。');if(!hasCulturalWorkflowAPI(this.#api))throw Error('当前环境尚未接入文化比较公共 API。');return this.#api;}
 #contextValid(){
  const c=this.context;if(!nonempty(c.ownerProfileId)||!nonempty(c.contextKey)||c.candidates.length<2||c.candidates.length>4)throw Error('请选择同一宝宝的 2 至 4 个候选名字。');
  if(c.anchorRequest.kind==='profile'&&c.anchorRequest.profileId!==c.ownerProfileId)throw Error('出生档案与当前宝宝不一致。');
  if(new Set(c.candidates.map(candidate=>canonicalPlainJson(candidate))).size!==c.candidates.length)throw Error('候选引用重复，请重新选择。');
 }
 async #run(action:CulturalWorkflowAction,work:(api:CulturalWorkflowAPI,token:number)=>Promise<void>){
  if(!this.#mounted||!this.#state.enabled||this.#state.busy)return;
  const token=++this.#generation;this.#update({busy:action,error:null});
  try{await work(this.#apiRequired(),token);}catch(error){if(this.#live(token))this.#update({error:errorText(error)});}
  finally{if(this.#live(token))this.#update({busy:null});}
 }
 enable=()=>{
  if(!this.#mounted||this.#state.enabled)return;
  ++this.#generation;this.#update({...initial(),enabled:true,notice:'已启用。由用户准备出生盘与候选资料后开始。'});
 };
 disable=()=>{
  if(this.#state.uncertainWrite){this.#update({error:'提交结果尚未确定，请先按原请求重试确认结果；关闭面板不会撤销已发出的写入。'});return;}
  ++this.#generation;this.#restoreAttempt=undefined;this.#update(initial());
 };
 cancel=()=>{
  if(!this.#state.busy)return;const write=['commit','restore','migrate'].includes(this.#state.busy);
  ++this.#generation;this.#update({busy:null,error:null,restoreConsent:false,migrationConsent:false,notice:write?'已停止等待。已发出的写入不会因此撤销；请按原请求重试或重新检查存储状态。':'已停止等待，迟到回复不会进入本面板。'});
 };
 prepare=()=>this.#run('prepare',async(api,token)=>{
  if(this.#state.uncertainWrite)throw Error('请先确认原提交结果。');this.#contextValid();
  this.#restoreAttempt=undefined;this.#update({anchor:undefined,options:[],selections:{},preview:undefined,prepared:undefined,attempt:undefined,migration:undefined,migrationConsent:false});
  const capabilities=own(await api.getCulturalStorageCapabilities());if(!this.#live(token))return;this.#update({capabilities});
  const anchor=own(ok(await api.prepareCulturalBirthAnchor(own(this.context.anchorRequest))));if(!this.#live(token))return;
  if(anchor.anchor.ownerProfileId!==this.context.ownerProfileId||anchor.anchor.sourceSessionId!==(this.context.anchorRequest.kind==='session'?this.context.anchorRequest.sessionId:null))throw Error('出生盘返回的归属或原会话引用不符。');
  const options:CulturalProviderOptions[]=[];
  for(const candidate of this.context.candidates){const option=own(ok(await api.getCulturalCharacterOptions(anchor.handle,own(candidate))));if(!this.#live(token))return;if(option.anchorId!==anchor.anchor.anchorId||option.candidateRef!==(candidate.kind==='saved'?candidate.candidateId:candidate.draftId)||candidate.kind==='draft'&&option.givenName!==candidate.givenName)throw Error('候选资料与本次出生盘或原候选引用不符。');options.push(option);}
  if(new Set(options.map(option=>option.candidateToken)).size!==options.length)throw Error('候选资料令牌重复，未显示。');
  this.#update({anchor,options,notice:'请逐字明确选择读音和字义证据。未知字位保留未知，不自动采用推荐项。'});
 });
 select=(candidateToken:string,position:number,evidenceId:string)=>{
  if(!this.#state.enabled||this.#state.busy||this.#state.attempt||this.#state.uncertainWrite)return;
  const row=this.#state.options.find(option=>option.candidateToken===candidateToken)?.positions.find(row=>row.position===position);
  if(!row||evidenceId!==''&&!row.options.some(option=>option.evidenceId===evidenceId)){this.#update({error:'请选择当前候选字位的真实证据。'});return;}
  const selections={...this.#state.selections};if(evidenceId)selections[key(candidateToken,position)]=evidenceId;else delete selections[key(candidateToken,position)];
  this.#update({selections,preview:undefined,prepared:undefined,error:null});
 };
 compare=()=>this.#run('compare',async(api,token)=>{
  const {anchor,options,selections,attempt,uncertainWrite}=this.#state;if(!anchor||options.length<2||attempt||uncertainWrite)throw Error('请先准备本次出生盘和候选字义；已准备的保存需先处理。');
  for(const option of options)for(const position of option.positions)if(position.options.length&&!selections[key(option.candidateToken,position.position)])throw Error('请明确选择每个可用字位的读音和字义证据。');
  this.#update({preview:undefined,prepared:undefined});
  const request={candidateTokens:options.map(option=>option.candidateToken),selections:options.flatMap(option=>option.positions.flatMap(position=>{const evidenceId=selections[key(option.candidateToken,position.position)];return evidenceId?[{candidateToken:option.candidateToken,position:position.position,evidenceId}]:[];}))};
  const preview=own(ok(await api.previewCulturalComparison(anchor.handle,request)));if(!this.#live(token))return;
  if(preview.snapshot.anchor.ownerProfileId!==this.context.ownerProfileId||preview.snapshot.anchor.anchorId!==anchor.anchor.anchorId||preview.snapshot.anchor.sourceSessionId!==anchor.anchor.sourceSessionId||preview.snapshot.anchor.sourceRevision!==anchor.anchor.sourceRevision||canonicalPlainJson(preview.snapshot.anchor.identity)!==canonicalPlainJson(anchor.anchor.identity)||canonicalPlainJson(preview.snapshot.candidateOrder)!==canonicalPlainJson(options.map(option=>option.candidateRef)))throw Error('比较结果与本次出生盘或候选引用不一致。');
  this.#update({preview,notice:'项目文化比较已返回；传统姓名落宫方法仍未建立。'});
 });
 setNote=(note:string)=>{if(this.#state.enabled&&!this.#state.busy&&!this.#state.attempt&&!this.#state.uncertainWrite)this.#update({note:note.slice(0,10000)});};
 setSaveMode=(saveMode:'create'|'revise')=>{if(!this.#state.busy&&!this.#state.attempt&&!this.#state.uncertainWrite&&(saveMode==='create'||this.#state.saved))this.#update({saveMode});};
 previewMigration=()=>this.#run('migration-preview',async(api,token)=>{
  this.#update({migration:undefined,migrationConsent:false});const migration=own(await api.previewCulturalStorageMigration());if(!this.#live(token))return;
  if(migration.to!=='customer-compact/3'||migration.writes!==0)throw Error('迁移预览目标或只读标志不符。');this.#update({migration,notice:'迁移预览不写入；只有确认迁移按钮会请求升级到 /3。'});
 });
 setMigrationConsent=(consent:boolean)=>{if(!this.#state.busy&&this.#state.migration)this.#update({migrationConsent:consent});};
 migrate=()=>this.#run('migrate',async(api,token)=>{
  if(!this.#state.migration||!this.#state.migrationConsent||this.#state.uncertainWrite)throw Error('请先查看 /3 迁移预览并勾选确认。');
  // Migration changes the database generation and invalidates all provider handles.
  this.#update({anchor:undefined,options:[],selections:{},preview:undefined,prepared:undefined,attempt:undefined,migrationConsent:false});
  const migrated=own(await api.migrateCulturalStorage());if(!this.#live(token))return;
  if(migrated.version!=='customer-compact/3')throw Error('迁移尚未确认达到 /3，请重新查看存储状态。');
  const capabilities=own(await api.getCulturalStorageCapabilities());if(!this.#live(token))return;
  this.#update({capabilities,migration:undefined,notice:'存储已迁移到 /3。请重新准备出生盘与候选资料，旧令牌已清除。'});
 });
 prepareWrite=()=>this.#run('prepare-write',async(api,token)=>{
  const state=this.#state;if(!state.preview||state.capabilities?.version!=='customer-compact/3')throw Error('文化保存须先查看并确认 /3 存储迁移，再重新比较。');
  if(state.uncertainWrite)throw Error('原提交结果未确定，请按原提交请求重试。');
  const previous=state.saved;
  if(state.saveMode==='revise'&&!previous)throw Error('请先读取要修订的原记录。');
  const attempt=state.attempt??own({previewToken:state.preview.previewHandle,ownerProfileId:this.context.ownerProfileId,target:state.saveMode==='revise'&&previous?{mode:'revise' as const,comparisonId:previous.head.id,expectedRevision:previous.head.currentRevision,expectedReviewToken:previous.head.reviewToken}:{mode:'create' as const},idempotencyKey:crypto.randomUUID(),expectedSnapshotDigest:state.preview.snapshot.snapshotDigest,note:state.note});
  this.#update({attempt,prepared:undefined});const prepared=own(await api.prepareCulturalWrite(own(attempt)));if(!this.#live(token))return;
  if(prepared.ownerProfileId!==attempt.ownerProfileId||prepared.idempotencyKey!==attempt.idempotencyKey||!nonempty(prepared.ticket)||!nonempty(prepared.databaseGeneration)||!/^[a-f0-9]{64}$/.test(prepared.requestSha))throw Error('保存准备回复与原请求引用不一致。');
  this.#update({prepared,notice:'保存已准备，尚未提交。请核对独立审阅备注并明确确认提交。'});
 });
 resetWrite=()=>{if(!this.#state.busy&&!this.#state.uncertainWrite)this.#update({attempt:undefined,prepared:undefined,error:null,notice:'已放弃未提交的保存准备。再次准备会建立新的请求。'});};
 async #load(api:CulturalWorkflowAPI,token:number,id:string,revision?:number){
  const saved=own(await api.readCulturalComparison(id,revision));if(!this.#live(token))return;
  this.#checkSaved(saved,id,revision);const history=own(await api.listCulturalRevisions(id));if(!this.#live(token))return;
  if(history.some(item=>item.comparisonId!==id||item.profileId!==this.context.ownerProfileId))throw Error('历史记录归属不符。');
  // A successful explicit reload is a new selection boundary only after the
  // previous write has a definite outcome. Failed reads keep its original refs.
  if(this.#state.uncertainWrite||this.#restoreInFlight)throw Error('原恢复请求结果未确定，请先按原请求确认。');
  const retiredRestore=!!this.#restoreAttempt;this.#restoreAttempt=undefined;
  this.#update({saved,viewed:saved,history,saveMode:'revise',restoreConsent:false,notice:retiredRestore?'已重新读取当前记录，原恢复意图已结束。请重新查看目标并勾选确认后建立新的恢复请求。':'已从文化存储读回记录。审阅备注仅为人工备注，不参与名字评分。'});
 }
 #checkSaved(saved:Saved,id:string,revision?:number){
  if(saved.head.id!==id||saved.head.profileId!==this.context.ownerProfileId||saved.head.sourceSessionId!==(this.context.anchorRequest.kind==='session'?this.context.anchorRequest.sessionId:null)||saved.revision.comparisonId!==id||saved.revision.profileId!==this.context.ownerProfileId||saved.result.comparisonId!==id||saved.result.profileId!==this.context.ownerProfileId||saved.result.revision!==saved.revision.revision||revision!==undefined&&saved.revision.revision!==revision)throw Error('已保存记录与当前宝宝、原会话或修订引用不符。');
 }
 commit=()=>this.#run('commit',async(api,token)=>{
  const {prepared,attempt}=this.#state;if(!prepared||!attempt)throw Error('请先准备保存，再确认提交。');
  this.#update({uncertainWrite:true});
  const request={ticket:prepared.ticket,ownerProfileId:prepared.ownerProfileId,idempotencyKey:prepared.idempotencyKey,expectedRequestSha:prepared.requestSha,databaseGeneration:prepared.databaseGeneration};
  const result=own(await api.commitCulturalWrite(request));if(!this.#live(token))return;
  if(result.status==='conflict'){this.#update({uncertainWrite:false,error:'保存冲突：'+result.reason+'。原请求引用已保留，可重试或重新读取后显式重新准备。'});return;}
  if(result.currentHead.profileId!==this.context.ownerProfileId||result.currentHead.id!==prepared.comparisonId||result.committed.profileId!==this.context.ownerProfileId||result.committed.comparisonId!==prepared.comparisonId||result.requestSha!==prepared.requestSha)throw Error('提交收据与原保存准备引用不符，请按原请求确认。');
  this.#update({uncertainWrite:false,commitResult:result,prepared:undefined,attempt:undefined,saved:undefined,viewed:undefined,history:[]});
  await this.#load(api,token,result.committed.comparisonId,result.committed.revision);
 });
 readSaved=()=>this.#run('read',async(api,token)=>{if(this.#state.uncertainWrite)throw Error('请先按原请求确认未确定的写入。');const id=this.#state.commitResult?.committed.comparisonId??this.#state.saved?.head.id??this.context.comparisonId;if(!id)throw Error('当前没有已保存的文化比较引用。');await this.#load(api,token,id,this.#state.commitResult?.committed.revision);});
 refreshHead=()=>this.#run('read',async(api,token)=>{if(this.#state.uncertainWrite)throw Error('请先按原请求确认未确定的写入。');const id=this.#state.saved?.head.id??this.#state.commitResult?.committed.comparisonId??this.context.comparisonId;if(!id)throw Error('当前没有文化比较引用。');await this.#load(api,token,id);});
 viewRevision=(revision:number)=>this.#run('history',async(api,token)=>{
  const id=this.#state.saved?.head.id;if(this.#state.uncertainWrite)throw Error('请先按原请求确认未确定的写入。');if(!id||!this.#state.history.some(item=>item.revision===revision))throw Error('请选择已读取历史中的修订引用。');
  const viewed=own(await api.readCulturalComparison(id,revision));if(!this.#live(token))return;this.#checkSaved(viewed,id,revision);this.#restoreAttempt=undefined;this.#update({viewed,restoreConsent:false,notice:'正在查看历史修订原记录；尚未恢复。'});
 });
 setRestoreConsent=(consent:boolean)=>{if(!this.#state.busy&&this.#state.viewed)this.#update({restoreConsent:consent});};
 restore=()=>this.#run('restore',async(api,token)=>{
  if(this.#restoreInFlight)throw Error('原恢复请求仍未结束，请等待其返回后按原请求重试；停止等待不会撤销写入。');
  const {saved,viewed,restoreConsent}=this.#state;if(this.#state.attempt||this.#state.uncertainWrite&&!this.#restoreAttempt)throw Error('请先处理原保存请求，再恢复历史。');if(!saved||!viewed||!restoreConsent)throw Error('请先查看目标历史修订并勾选恢复确认。');
  const attempt=this.#restoreAttempt??{id:saved.head.id,target:viewed.revision.revision,expected:saved.head.currentRevision,reviewToken:saved.head.reviewToken,idempotencyKey:crypto.randomUUID()};
  this.#restoreAttempt=attempt;this.#update({uncertainWrite:true});
  this.#restoreInFlight=true;let result:CulturalSaveResult;
  try{result=own(await api.restoreCulturalRevision(attempt.id,attempt.target,attempt.expected,attempt.reviewToken,attempt.idempotencyKey));}
  finally{this.#restoreInFlight=false;}
  if(!this.#live(token))return;
  if(result.status==='conflict'){this.#update({uncertainWrite:false,error:'恢复冲突：'+result.reason+'。原请求引用已保留；可按原请求重试，或重新读取并确认新的恢复目标。'});return;}
  if(result.currentHead.profileId!==this.context.ownerProfileId||result.currentHead.id!==attempt.id||result.committed.profileId!==this.context.ownerProfileId||result.committed.comparisonId!==attempt.id)throw Error('恢复收据归属不符。');
  this.#restoreAttempt=undefined;this.#update({uncertainWrite:false,restoreConsent:false,commitResult:result,saved:undefined,viewed:undefined,history:[]});await this.#load(api,token,attempt.id,result.committed.revision);
 });
}
