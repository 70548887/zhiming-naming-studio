import type {BirthProfile} from '../shared/types';
import type {BaziRootFeedbackV132PreviewApi} from '../shared/bazi-root-feedback-v132-preview-api';
import type {RootFeedbackV132FacadeDTO} from '../shared/bazi-root-feedback-v132-r2-facade';
import {canonicalPlainJson} from '../shared/plain-json';
import {matchesRootFeedbackV132RequestBinding,type RootFeedbackV132BoundPreviewResponse} from '../shared/bazi-root-feedback-v132-request-binding';
// Compatibility type re-export for existing callers; the sole interface is
// still the backend-owned shared declaration, not a renderer duplicate.
export type {BaziRootFeedbackV132PreviewApi} from '../shared/bazi-root-feedback-v132-preview-api';

type PreviewMethod=BaziRootFeedbackV132PreviewApi['previewBaziRootFeedbackV132'];
export type V132PreviewPhase='idle'|'loading'|'ready'|'error';
export type V132PreviewError='input'|'unsupported'|'resources'|'response'|'request';
export interface V132PreviewFrame {
 owner:BirthProfile;profileKey:string;profileId:string;timeUnknown:boolean;api:BaziRootFeedbackV132PreviewApi|undefined;
 method:PreviewMethod|undefined;proposal:boolean;disabled:boolean;
}
export interface V132PreviewState extends V132PreviewFrame {
 phase:V132PreviewPhase;result?:RootFeedbackV132FacadeDTO;errorKind?:V132PreviewError;error?:string;notice?:string;
}
const METHOD='project-bazi-mainchain-145/1.3.2';
// Release-selection metadata only: equality here is not bundle authentication,
// a generation certificate, or permission to apply the preview to naming.
const RELEASE={manifest:'3d9b15e6f9963f385411a70eabcbb3ab940629bc285bea65a8ebee92c3f6c71a',closure:'9f3fa8d4cfc8f190934268597cffb25be19cbf2723b4b827ec74228f2c7596f8',kernelMethod:'project-bazi-mainchain-144/1.2.0',kernelRevision:'c73c53b4558dc5b4e339fe84e930d08695a4df5865147e422d7295a7822cc685'} as const;
const resolutions=['unique-consistent-regime','multiple-consistent-regimes','no-consistent-regime','pending-regime-resolution'];
const text=(value:unknown):value is string=>typeof value==='string';
const strings=(value:unknown):value is string[]=>Array.isArray(value)&&value.every(text);
const elements=(value:unknown):boolean=>Array.isArray(value)&&value.every(item=>['木','火','土','金','水'].includes(item));
const object=(value:unknown):value is Record<string,any>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const sha=(value:unknown)=>text(value)&&/^[a-f0-9]{64}$/.test(value);
const nonempty=(value:unknown):value is string=>text(value)&&value.length>0;
const uniqueStrings=(value:unknown):value is string[]=>strings(value)&&new Set(value).size===value.length;
const nullableFinite=(value:unknown)=>value===null||typeof value==='number'&&Number.isFinite(value);
const exact=(value:Record<string,any>,keys:readonly string[])=>Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const sameSet=(a:readonly string[],b:readonly string[])=>a.length===b.length&&a.every(id=>b.includes(id));
const freeze=<T,>(value:T):T=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const optionalProfileFields=new Set(['fatherName','motherName','parentNameReadings','namingPreferences','monthAuthorityMethod','seasonalMethod','timeBasis','birthLongitude','renMethod']);
function snapshotProfile(profile:BirthProfile):BirthProfile {
 const copy:Record<string,unknown>={};
 if(!profile||typeof profile!=='object'||Array.isArray(profile)||![Object.prototype,null].includes(Object.getPrototypeOf(profile)))throw Error('profile');
 for(const key of Reflect.ownKeys(profile)){
  if(typeof key!=='string')throw Error('key');
  const property=Object.getOwnPropertyDescriptor(profile,key);
  if(!property||!Object.hasOwn(property,'value')||!property.enumerable)throw Error('accessor');
  if(property.value===undefined&&optionalProfileFields.has(key))continue;
  Object.defineProperty(copy,key,{value:property.value,enumerable:true,writable:true,configurable:true});
 }
 canonicalPlainJson(copy);
 return structuredClone(copy) as unknown as BirthProfile;
}

export function hasBaziRootFeedbackV132PreviewApi(value:unknown):value is BaziRootFeedbackV132PreviewApi {
 try{const property=value&&typeof value==='object'?Object.getOwnPropertyDescriptor(value,'previewBaziRootFeedbackV132'):undefined;return !!property&&Object.hasOwn(property,'value')&&typeof property.value==='function';}catch{return false;}
}
export function readV132PreviewFrame(profile:BirthProfile,api:BaziRootFeedbackV132PreviewApi|undefined,proposal:boolean,disabled=false):V132PreviewFrame {
 let profileKey='invalid-profile',profileId='',timeUnknown=false;
 try{const input=snapshotProfile(profile);profileKey=canonicalPlainJson(input);profileId=input.id;timeUnknown=input.timeUnknown;}catch{/* Malformed local draft is rejected before dispatch. */}
 const method=hasBaziRootFeedbackV132PreviewApi(api)?Object.getOwnPropertyDescriptor(api,'previewBaziRootFeedbackV132')!.value as PreviewMethod:undefined;
 return{owner:profile,profileKey,profileId,timeUnknown,api,method,proposal,disabled};
}
const same=(a:V132PreviewFrame,b:V132PreviewFrame)=>a.owner===b.owner&&a.profileKey===b.profileKey&&a.api===b.api&&a.method===b.method&&a.proposal===b.proposal&&a.disabled===b.disabled;
export function currentV132PreviewState(state:V132PreviewState,frame:V132PreviewFrame):V132PreviewState {
 return same(state,frame)?state:{...frame,phase:'idle',notice:'出生资料、连接或预览入口已改变，上次结果已失效。请按当前资料重新预览。'};
}

/** Correlation and display-shape checks. Resource authentication remains owned by main. */
export function matchesV132PreviewResponse(value:unknown,frame:V132PreviewFrame):value is RootFeedbackV132BoundPreviewResponse {
 try{
  canonicalPlainJson(value);
  if(!object(value)||value.schema!=='bazi-root-feedback-facade/1.3.2-r2'||value.methodId!==METHOD||value.entryPolicy!==(frame.proposal?'month-stem-proposal':'month-branch-only')||!resolutions.includes(value.status))return false;
  if(!matchesRootFeedbackV132RequestBinding(value.requestBinding,frame.profileKey,frame.proposal))return false;
  // Main may allocate an ID for an unsaved draft; the binding still names its raw empty ID.
  if(!nonempty(value.profileId)||(frame.profileId!==''&&value.profileId!==frame.profileId))return false;
  if(!object(value.applicationGate)||!exact(value.applicationGate,['status','reasons'])||value.applicationGate.status!=='blocked'||!Array.isArray(value.applicationGate.reasons)||!value.applicationGate.reasons.length||!value.applicationGate.reasons.every((reason:unknown)=>object(reason)&&reason.code==='version-not-admitted-for-application'&&text(reason.message)))return false;
  if(!object(value.calendar)||typeof value.calendar.partitionComplete!=='boolean'||!strings(value.calendar.warnings)||!object(value.baseAnalysis)||!Array.isArray(value.branches)||!value.branches.length)return false;
  const identity=value.resourceIdentity;
  if(!object(identity)||identity.schema!=='bazi-root-feedback-resource-identity/3'||identity.methodId!==METHOD||identity.applicationPolicyVersion!=='naming-element-preview/1.3.2'||identity.publicationId!=='bazi-root-feedback/1.3.2;preview-publication-r2'||identity.manifestSha256!==RELEASE.manifest||identity.fullClosureSha256!==RELEASE.closure||!object(identity.kernel)||identity.kernel.methodId!==RELEASE.kernelMethod||identity.kernel.sourceRevision!==RELEASE.kernelRevision||!Array.isArray(identity.files)||!object(identity.runtimeEnvironment))return false;
  if(!identity.files.every((file:unknown)=>object(file)&&nonempty(file.path)&&Number.isSafeInteger(file.bytes)&&file.bytes>=0&&sha(file.sha256)&&['rule','source-lock','runtime-source','license','notice','publication'].includes(file.kind))||new Set(identity.files.map((file:any)=>file.path)).size!==identity.files.length)return false;
  if(!nonempty(identity.runtimeEnvironment.node)||!['icu','tz','unicode'].every(key=>identity.runtimeEnvironment[key]===null||nonempty(identity.runtimeEnvironment[key])))return false;
  if(!Array.isArray(value.sources)||!value.sources.every((source:unknown)=>object(source)&&['id','name','commit','license','url','note'].every(key=>text(source[key]))&&sha(source.sha256)&&strings(source.files)))return false;
  if(new Set(value.branches.map((branch:any)=>branch?.id)).size!==value.branches.length)return false;
  if((frame.timeUnknown||!value.calendar.partitionComplete||value.branches.length!==1)&&value.status!=='pending-regime-resolution')return false;
  if(!frame.timeUnknown&&value.calendar.partitionComplete&&value.branches.length===1&&value.status!==value.branches[0]?.root?.resolution)return false;
  return value.branches.every((branch:unknown)=>{
   if(!object(branch)||!nonempty(branch.id)||branch.kind!==(frame.timeUnknown?'unknown-hour-interval':'recorded-instant')||branch.hypothetical!==(frame.timeUnknown&&value.branches.length>1)||!object(branch.root))return false;
   if(frame.timeUnknown?!branch.id.startsWith(value.profileId+':calendar-interval:'):branch.id!==value.profileId)return false;
   const root=branch.root;
   if(root.schema!=='bazi-root-feedback-preview/1.3.2'||root.methodId!==METHOD||root.profileId!==branch.id||root.entryPolicy!==value.entryPolicy||root.hypothetical!==branch.hypothetical||!resolutions.includes(root.resolution)||root.scope!==(frame.timeUnknown?'known-pillars-only':'complete-known-pillars')||!strings(root.pending)||!strings(root.limitations)||!uniqueStrings(root.consistentIds)||!uniqueStrings(root.possibleIds)||!Array.isArray(root.regimes))return false;
   const ids=new Set(root.regimes.map((regime:any)=>regime?.id));
   if(ids.size!==root.regimes.length||root.consistentIds.some((id:string)=>!ids.has(id))||root.possibleIds.some((id:string)=>!ids.has(id)))return false;
   const regimesValid=root.regimes.every((regime:unknown)=>{
    if(!object(regime)||!nonempty(regime.id)||!['consistent','inconsistent','possible'].includes(regime.consistency)||!strings(regime.pending)||!object(regime.certificate)||!['closed','unclosed','unavailable'].includes(regime.certificate.status))return false;
    const certificate=regime.certificate;
    if(!['epsilon','maxIterations','controlFraction','maxLossFraction','iterations','lastL1Delta','lastL1DeltaUpperBound','contractionUpperBound','errorBound','residualL1UpperBound'].every(key=>nullableFinite(certificate[key]))||!strings(certificate.disabledEdgeIds)||!strings(certificate.issues)||!object(certificate.columnSums)||!Object.values(certificate.columnSums).every(item=>typeof item==='number'&&Number.isFinite(item))||!(certificate.failureReason===null||['invalid-graph','non-finite','not-converged','uncertified-roundoff'].includes(certificate.failureReason)))return false;
    if(regime.opinion===null)return true;
    const opinion=regime.opinion;
    return object(opinion)&&opinion.regimeId===regime.id&&opinion.methodId===METHOD&&opinion.hypothetical===branch.hypothetical&&elements(opinion.primary)&&elements(opinion.secondary)&&elements(opinion.avoid)&&strings(opinion.summary)&&strings(opinion.pending);
   });
   if(!regimesValid)return false;
   const consistent=root.regimes.filter((regime:any)=>regime.consistency==='consistent').map((regime:any)=>regime.id),possible=root.regimes.filter((regime:any)=>regime.consistency==='possible').map((regime:any)=>regime.id);
   if(!sameSet(root.consistentIds,consistent)||!sameSet(root.possibleIds,possible))return false;
   if(root.resolution==='unique-consistent-regime'&&(consistent.length!==1||possible.length!==0))return false;
   if(root.resolution==='multiple-consistent-regimes'&&(consistent.length<2||possible.length!==0))return false;
   if(root.resolution==='no-consistent-regime'&&(consistent.length!==0||possible.length!==0))return false;
   return object(root.commonOpinion)&&['all-retained-regimes','known-opinions-only','unavailable'].includes(root.commonOpinion.status)&&elements(root.commonOpinion.primary)&&elements(root.commonOpinion.favorable);
  });
 }catch{return false;}
}
const errorCopy:Record<V132PreviewError,string>={
 input:'请先核对当前出生资料，填写姓氏与出生日期；时辰不清楚时可明确选择未知。',
 unsupported:'当前连接暂不支持这一版项目预览，请更新连接后重试。当前命名模型与已保存内容未改变。',
 resources:'这一版预览所需的固定资料尚未就绪或校验未通过，请稍后重试。当前命名模型与已保存内容未改变。',
 response:'返回内容与当前资料或预览范围不一致，本次结果未展示。请重新读取当前资料。',
 request:'项目用神预览暂不可用，请稍后重试；当前命名模型与已保存内容未改变。',
};
function failureKind(error:unknown):V132PreviewError {
 const message=error instanceof Error?error.message:'';
 if(/ROOT_FEEDBACK_(?:VERSION_UNSUPPORTED|V132_SAVED_REPLAY_UNSUPPORTED)/.test(message))return 'unsupported';
 if(/ROOT_FEEDBACK_V132_R2_(?:PREVIEW_UNAVAILABLE|RESOURCES_UNAVAILABLE|BUILD_UNVERIFIED)/.test(message))return 'resources';
 return 'request';
}
export function createV132PreviewController({getProfile,getApi,isDisabled=()=>false}:{getProfile:()=>BirthProfile;getApi:()=>BaziRootFeedbackV132PreviewApi|undefined;isDisabled?:()=>boolean}){
 let alive=false,serial=0,proposal=false;
 const frame=()=>readV132PreviewFrame(getProfile(),getApi(),proposal,isDisabled());
 let state:V132PreviewState={...frame(),phase:'idle'};
 const listeners=new Set<()=>void>(),publish=(next:V132PreviewState)=>{state=next;for(const listener of listeners)listener();};
 return {
  getSnapshot:()=>state,subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};},
  activate:()=>{alive=true;},dispose:()=>{alive=false;serial++;state={...frame(),phase:'idle'};},
  setProposal:(value:boolean)=>{if(proposal===value)return;proposal=value;serial++;publish({...frame(),phase:'idle',notice:'预览入口已改变，上次结果已失效。请重新预览。'});},
  refresh:()=>{const next=frame();if(!same(state,next)){serial++;publish({...next,phase:'idle',notice:'出生资料、连接或预览入口已改变，上次结果已失效。请重新预览。'});}},
  run:async()=>{
   const next=frame();if(!alive||next.disabled||!next.api||!next.method||state.phase==='loading'&&same(state,next))return;
   let input:BirthProfile;
   try{input=snapshotProfile(getProfile());if(next.profileKey==='invalid-profile'||canonicalPlainJson(input)!==next.profileKey||typeof input.id!=='string'||!input.surname?.trim()||!input.birthDate)throw Error('input');}catch{publish({...next,phase:'error',errorKind:'input',error:errorCopy.input});return;}
   const options={fromOutputMonthStem:next.proposal},lease=++serial;
   const responseFrame={...next,profileKey:canonicalPlainJson(input),proposal:options.fromOutputMonthStem};
   const owns=()=>alive&&lease===serial&&same(next,frame());
   publish({...next,phase:'loading'});
   if(!owns())return;
   let result:unknown;
   try{result=await next.method.call(next.api,input,options);}catch(error){if(owns()){const errorKind=failureKind(error);publish({...next,phase:'error',errorKind,error:errorCopy[errorKind]});}return;}
   if(!owns())return;
   if(!matchesV132PreviewResponse(result,responseFrame)){publish({...next,phase:'error',errorKind:'response',error:errorCopy.response});return;}
   publish({...next,phase:'ready',result:freeze(structuredClone(result))});
  },
 };
}
