import {canonicalPlainJson} from '../shared/plain-json';
import type {CulturalComparisonCatalogPage,CulturalComparisonCatalogMetadata} from '../shared/cultural-comparison-catalog';
import type {CulturalComparisonRead,CulturalWorkflowAPI} from '../shared/cultural-workflow-api';
import type {CulturalRevision} from '../shared/cultural-storage-v3';

export const CULTURAL_SAVED_CATALOG_PAGE_LIMIT=10;
export interface CulturalCatalogOwner {ownerProfileId:string|null;contextKey:string;}
export interface CulturalSavedSourceReference {comparisonId:string;ownerProfileId:string;sourceSessionId:string;}
export interface CulturalSavedCatalogState {
 enabled:boolean;busy:'list'|'read'|null;phase:'off'|'ready'|'unsupported'|'cursor-expired'|'error';
 page?:CulturalComparisonCatalogPage;cursor?:string;previous:(string|undefined)[];pageGeneration:number;
 detail?:CulturalComparisonRead;history:readonly CulturalRevision[];viewGeneration:number;error:string;notice:string;
}
const initial=():CulturalSavedCatalogState=>({enabled:false,busy:null,phase:'off',previous:[],pageGeneration:0,history:[],viewGeneration:0,error:'',notice:'默认关闭；只有明确打开目录后才会读取已保存记录索引。'});
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const nonempty=(value:unknown,max=1000):value is string=>typeof value==='string'&&value.length>0&&value.length<=max;
const id=(value:unknown):value is string=>typeof value==='string'&&/^qc_[a-f0-9]{64}$/.test(value);
const positive=(value:unknown):value is number=>Number.isSafeInteger(value)&&Number(value)>0;
const keys=(value:object,required:string[],optional:string[]=[])=>{const own=Object.keys(value);return required.every(key=>own.includes(key))&&own.every(key=>required.includes(key)||optional.includes(key));};
const own=<T,>(value:T):T=>JSON.parse(canonicalPlainJson(value));
const invalid=():never=>{throw Error('已保存文化目录返回的结构、归属或索引标志不符，请重新读取目录。');};
export function readCulturalSavedCatalogPage(value:unknown,owner:string):CulturalComparisonCatalogPage {
 value=own(value);
 if(!object(value)||value.schema!=='cultural-comparison-catalog/1'||value.ownerProfileId!==owner||value.limit!==CULTURAL_SAVED_CATALOG_PAGE_LIMIT||value.order!=='comparison-id-desc'||value.factsAuthenticated!==false||value.sourceAuthority!=='not-authenticated-facts'||!['raw-legacy','customer-compact/1','customer-compact/2','customer-compact/3'].includes(String(value.storageVersion))||!Array.isArray(value.items))return invalid();
 const base=['schema','ownerProfileId','storageVersion','limit','order','factsAuthenticated','sourceAuthority','status','items'];
 if(value.status==='unsupported'||value.status==='cursor-expired'){
  if(!keys(value,[...base,'reason'])||value.items.length!==0||value.status==='unsupported'&&value.reason!=='cultural-tables-unavailable'||value.status==='cursor-expired'&&!['owner-changed','database-changed','query-changed'].includes(String(value.reason)))return invalid();
 }else if(value.status==='available'){
  if(!keys(value,base,['nextCursor'])||value.storageVersion!=='customer-compact/3'||value.items.length>CULTURAL_SAVED_CATALOG_PAGE_LIMIT||value.nextCursor!==undefined&&(!nonempty(value.nextCursor,2048)||!/^[A-Za-z0-9_-]+$/.test(value.nextCursor)))return invalid();
  let previous:string|undefined;
  for(const row of value.items){
   if(!object(row)||!keys(row,['comparisonId','ownerProfileId','sourceSessionId','currentRevision','createdAt','factsAuthenticated','sourceAuthority'])||!id(row.comparisonId)||row.ownerProfileId!==owner||row.sourceSessionId!==null&&!nonempty(row.sourceSessionId)||!positive(row.currentRevision)||!nonempty(row.createdAt,80)||!Number.isFinite(Date.parse(row.createdAt))||row.factsAuthenticated!==false||row.sourceAuthority!=='not-authenticated-facts'||previous!==undefined&&row.comparisonId>=previous)return invalid();
   previous=row.comparisonId;
  }
 }else return invalid();
 return own(value) as unknown as CulturalComparisonCatalogPage;
}
function checkSaved(value:CulturalComparisonRead,metadata:CulturalComparisonCatalogMetadata,owner:string,revision?:number){
 const {head,revision:row,result}=value??{};
 if(!head||!row||!result||head.id!==metadata.comparisonId||head.profileId!==owner||head.sourceSessionId!==metadata.sourceSessionId||!positive(head.currentRevision)||row.comparisonId!==head.id||row.profileId!==owner||!positive(row.revision)||row.revision>head.currentRevision||row.revision!==(revision??head.currentRevision)||result.schema!=='qimen-cultural-revision/1.0.0'||result.comparisonId!==head.id||result.profileId!==owner||result.revision!==row.revision||result.sourceSessionId!==head.sourceSessionId||result.snapshot?.anchor?.ownerProfileId!==owner||result.snapshot.anchor.sourceSessionId!==head.sourceSessionId||typeof result.note!=='string'||result.noteAuthority!=='human-note-only')throw Error('已保存文化记录与所选宝宝、记录或原方案引用不符；未展示返回内容。');
 if(!id(head.id)||!nonempty(head.profileId)||!nonempty(head.reviewToken)||!stamp(head.createdAt)||head.sourceSessionId!==null&&!nonempty(head.sourceSessionId)||!validRevision(row)||result.createdAt!==row.createdAt||result.operation!==row.operation||result.restoredFromRevision!==row.restoredFromRevision)throw Error('已保存文化记录的文本或修订格式不符。');
}
const stamp=(value:unknown):value is string=>nonempty(value,80)&&Number.isFinite(Date.parse(value));
const operation=(value:unknown)=>typeof value==='string'&&['create','revise','restore-revision'].includes(value);
const validRevision=(row:CulturalRevision)=>!!row&&id(row.comparisonId)&&nonempty(row.profileId)&&positive(row.revision)&&operation(row.operation)&&stamp(row.createdAt)&&(row.revision===1?row.parentRevision===null&&row.operation==='create'&&row.restoredFromRevision===null:row.parentRevision===row.revision-1&&row.operation!=='create'&&(row.operation==='restore-revision'?positive(row.restoredFromRevision)&&row.restoredFromRevision<row.revision:row.restoredFromRevision===null));
function checkHistory(history:readonly CulturalRevision[],saved:CulturalComparisonRead){
 if(!Array.isArray(history))throw Error('文化记录历史格式不符。');
 let previous=Infinity;
 for(const row of history){if(!validRevision(row)||row.comparisonId!==saved.head.id||row.profileId!==saved.head.profileId||row.revision>saved.head.currentRevision||row.revision>=previous)throw Error('文化记录历史的归属或修订引用不符。');previous=row.revision;}
 const selected=history.find(row=>row.revision===saved.revision.revision);
 if(!selected||canonicalPlainJson(selected)!==canonicalPlainJson(saved.revision))throw Error('已读取修订与返回的原记录历史同项不符。');
}

/** Read-only discovery and saved-record viewer. Catalog metadata never grants
 * source authority, a current-chart binding or a write/restore capability. */
export class CulturalSavedCatalogController {
 #state=initial();#active=false;#generation=0;#listeners=new Set<()=>void>();
 readonly #owner:CulturalCatalogOwner;#source:unknown;#methods:readonly unknown[]=[];
 #requestGuard?:{token:number;isOwnerCurrent:()=>boolean};
 constructor(readonly options:{getOwner:()=>CulturalCatalogOwner;getSource:()=>unknown;isBusy:()=>boolean;isOwnerCurrent:()=>boolean;getOwnerGuard?:()=>()=>boolean}){this.#owner={...options.getOwner()};this.#source=options.getSource();}
 getSnapshot=()=>this.#state;
 subscribe=(listener:()=>void)=>{this.#listeners.add(listener);return()=>{this.#listeners.delete(listener);};};
 mount=()=>{this.#active=true;return()=>{this.#active=false;this.#generation++;this.#requestGuard=undefined;this.#state=initial();};};
 #update(patch:Partial<CulturalSavedCatalogState>){this.#state={...this.#state,...patch};for(const listener of this.#listeners)listener();}
 #contextOwned(token:number){const current=this.options.getOwner();return this.#active&&this.#generation===token&&current.ownerProfileId===this.#owner.ownerProfileId&&current.contextKey===this.#owner.contextKey;}
 #owned(token:number){return this.#contextOwned(token)&&(this.#requestGuard?.token===token?this.#requestGuard.isOwnerCurrent():this.options.isOwnerCurrent());}
 #capture(token:number){this.#requestGuard={token,isOwnerCurrent:this.options.getOwnerGuard?.()??this.options.isOwnerCurrent};}
 #finish(token:number){
  if(this.#contextOwned(token)){
   if(!this.#owned(token))this.#update({busy:null,phase:'error',page:undefined,cursor:undefined,previous:[],detail:undefined,history:[],error:'读取期间宝宝资料已编辑，本次回复未采用。请明确重新读取。'});
   else this.#update({busy:null});
  }
  if(this.#requestGuard?.token===token)this.#requestGuard=undefined;
 }
 #failure(token:number,error:unknown){if(this.#owned(token))this.#update({phase:'error',page:undefined,cursor:undefined,previous:[],detail:undefined,history:[],error:error instanceof Error?error.message:'文化记录读取失败。'});}
 #guard(token:number){
  if(!this.#owned(token))throw Error('宝宝或目录上下文已变化，本次读取已失效。');
  if(this.options.isBusy())throw Error('工作台正在处理其他操作，请等待完成后再读取文化记录。');
  if(this.options.getSource()!==this.#source)throw Error('文化记录服务连接已变化，请关闭目录后重新打开。');
  const methods=culturalSavedSourceMethods(this.#source);if(methods.length!==3||this.#methods.length!==3||methods.some((method,index)=>method!==this.#methods[index]))throw Error('文化记录服务方法已变化，请明确重新读取目录。');
 }
 async #call<T>(method:'listCulturalComparisons'|'readCulturalComparison'|'listCulturalRevisions',token:number,args:unknown[]):Promise<T>{
  this.#guard(token);const source=this.#source,slot=object(source)?Object.getOwnPropertyDescriptor(source,method):undefined,fn=slot&&Object.hasOwn(slot,'value')?slot.value:undefined;
  if(typeof fn!=='function')throw Error(method==='listCulturalComparisons'?'当前环境尚未接入已保存文化比较目录。':'当前环境尚未接入文化记录读取与历史服务。');
  const result=await fn.apply(source,args);this.#guard(token);
  if(Object.getOwnPropertyDescriptor(source,method)?.value!==fn)throw Error('文化记录服务方法已变化，请重新打开目录。');
  return own(result) as T;
 }
 close=()=>{this.#generation++;this.#requestGuard=undefined;this.#update(initial());};
 open=()=>this.#load(undefined,[],true);
 restart=()=>this.#load(undefined,[],true);
 next=()=>{const page=this.#state.page;if(this.#state.phase==='ready'&&page?.status==='available'&&page.nextCursor&&!this.#state.busy)return this.#load(page.nextCursor,[...this.#state.previous,this.#state.cursor]);};
 previous=()=>{if(this.#state.phase==='ready'&&this.#state.page?.status==='available'&&this.#state.previous.length&&!this.#state.busy)return this.#load(this.#state.previous.at(-1),this.#state.previous.slice(0,-1));};
 async #load(cursor:string|undefined,previous:(string|undefined)[],bind=false){
  if(!this.#active||!this.#owner.ownerProfileId)return;
  const token=++this.#generation;
  this.#capture(token);
  if(bind){this.#source=this.options.getSource();this.#methods=culturalSavedSourceMethods(this.#source);}
  this.#update({enabled:true,busy:'list',phase:'ready',page:undefined,detail:undefined,history:[],error:'',cursor,previous,pageGeneration:token,viewGeneration:token,notice:'正在读取有界文化记录索引；索引不代表来源核验。'});
  try{
   const page=readCulturalSavedCatalogPage(await this.#call('listCulturalComparisons',token,[this.#owner.ownerProfileId,{limit:CULTURAL_SAVED_CATALOG_PAGE_LIMIT,...(cursor===undefined?{}:{cursor})}]),this.#owner.ownerProfileId);
   if(!this.#owned(token))return;
   this.#guard(token);
   this.#update({page,...(page.status==='available'?{}:{cursor:undefined,previous:[]}),phase:page.status==='available'?'ready':page.status,notice:page.status==='unsupported'?'当前客户存储不支持文化比较目录；本入口不会自动迁移。':page.status==='cursor-expired'?'目录游标已过期，旧列表和详情已清空。请明确从头重新读取。':'目录仅为元数据索引，尚未读取或核验具体记录内容。'});
  }catch(error){this.#failure(token,error);}
  finally{this.#finish(token);}
 }
 select=(comparisonId:string,pageGeneration:number)=>this.#read(comparisonId,pageGeneration);
 async #read(comparisonId:string,pageGeneration:number,revision?:number){
  const page=this.#state.page,metadata=page?.status==='available'?page.items.find(row=>row.comparisonId===comparisonId):undefined;
  if(!this.#active||!metadata||pageGeneration!==this.#state.pageGeneration||this.#state.busy)return;
  const token=++this.#generation;
  this.#capture(token);
  this.#update({busy:'read',detail:undefined,history:[],viewGeneration:token,error:'',notice:'正在读取原保存记录及其历史。出生盘和名字均以保存记录为准。'});
  try{
   const [detail,history]=await Promise.all([
    this.#call<CulturalComparisonRead>('readCulturalComparison',token,revision===undefined?[comparisonId]:[comparisonId,revision]),
    this.#call<Awaited<ReturnType<CulturalWorkflowAPI['listCulturalRevisions']>>>('listCulturalRevisions',token,[comparisonId]),
   ]);
   checkSaved(detail,metadata,this.#owner.ownerProfileId!,revision);checkHistory(history,detail);
   this.#guard(token);this.#update({detail,history,notice:'正在只读查看原保存记录；不表示当前编辑资料已经采用这些内容。'});
  }catch(error){this.#failure(token,error);}
  finally{this.#finish(token);}
 }
 viewRevision=(revision:number,viewGeneration:number)=>{
  const detail=this.#state.detail;if(!detail||viewGeneration!==this.#state.viewGeneration||!this.#state.history.some(row=>row.revision===revision))return;
  return this.#read(detail.head.id,this.#state.pageGeneration,revision);
 };
 openSource=(viewGeneration:number,onOpen:(reference:CulturalSavedSourceReference)=>void)=>{
  const detail=this.#state.detail;if(!detail||viewGeneration!==this.#state.viewGeneration||!detail.head.sourceSessionId||this.#state.busy)return;
  try{this.#guard(this.#generation);onOpen({comparisonId:detail.head.id,ownerProfileId:detail.head.profileId,sourceSessionId:detail.head.sourceSessionId});}
  catch(error){this.#failure(this.#generation,error);}
 };
}

/** Three own data-function identities form one read lease. No getters run. */
export function culturalSavedSourceMethods(source:unknown):readonly unknown[]{
 try{return ['listCulturalComparisons','readCulturalComparison','listCulturalRevisions'].map(method=>{const slot=object(source)?Object.getOwnPropertyDescriptor(source,method):undefined;return slot&&Object.hasOwn(slot,'value')?slot.value:undefined;});}catch{return[];}
}
