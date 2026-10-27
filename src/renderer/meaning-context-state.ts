import type {NamingSession} from '../shared/types';
import type {MeaningContextAPI,MeaningContextOption,MeaningContextOptions,MeaningContextUpdateRequest,SavedMeaningContextReview} from '../shared/meaning-context-review';
import {assertMeaningContextJson,validSavedMeaningContextReview} from '../shared/meaning-context-review';
import {isReviewConflict,validReviewToken} from '../shared/review-version';
import {MeaningContextReloadError,assertMeaningContextWriteResponse} from './meaning-context-api';

export const meaningOptionKey=(option:Pick<MeaningContextOption,'position'|'caseId'|'senseId'|'contextKey'>)=>JSON.stringify([option.position,option.caseId,option.senseId,option.contextKey]);
type ErrorKind='load'|'save'|'conflict';
export interface MeaningContextUiState{
 phase:'idle'|'loading'|'ready'|'load-error'|'saving';options?:MeaningContextOptions;
 draftPositions:readonly number[];draftChoices:Readonly<Record<number,string>>;
 error?:{kind:ErrorKind;message:string};needsRefresh:boolean;notice:string;
 focus?:'error'|'status';focusSerial:number;
}
export interface MeaningContextControllerConfig{sessionId:string;candidateId:string;givenName:string;fullName:string;getApi:()=>MeaningContextAPI;isDisabled?:()=>boolean;}
const message=(error:unknown,fallback:string)=>error instanceof Error&&error.message?error.message:fallback;
const sameNumbers=(a:readonly number[],b:readonly number[])=>a.length===b.length&&a.every((value,index)=>value===b[index]);
const sorted=(values:readonly number[])=>[...new Set(values)].sort((a,b)=>a-b);
const confirmed=(options?:MeaningContextOptions)=>sorted(options?.currentReadings.filter(row=>row.confirmed).map(row=>row.position)??[]);
const savedChoices=(options?:MeaningContextOptions)=>Object.fromEntries((options?.savedReview?.selections??[]).map(row=>[row.position,meaningOptionKey(row)]));
export const meaningContextDirty=(state:MeaningContextUiState)=>!sameNumbers(state.draftPositions,confirmed(state.options))||JSON.stringify(Object.entries(state.draftChoices).sort())!==JSON.stringify(Object.entries(savedChoices(state.options)).sort());
export function meaningContextCanWrite(state:MeaningContextUiState):boolean{return state.phase==='ready'&&!state.needsRefresh&&state.options?.status==='available'&&Number.isSafeInteger(state.options.reviewRevision)&&state.options.reviewRevision>=0&&typeof state.options.reviewToken==='string'&&validReviewToken(state.options.reviewToken);}

/** UI state only. No dictionary/rule loading and no construction of source/meaning result payloads. */
export function createMeaningContextController(config:MeaningContextControllerConfig){
 let state:MeaningContextUiState={phase:'idle',draftPositions:[],draftChoices:{},needsRefresh:false,notice:'',focusSerial:0},alive=true,loadEpoch=0;
 let parentChangeEpoch=0;let observedParent:{revision:number;token:string}|undefined;let explicitReloadParent:{revision:number;token:string;optionsRevision:number;optionsToken:string|undefined}|undefined;
 const listeners=new Set<()=>void>(),publish=(patch:Partial<MeaningContextUiState>)=>{if(!alive)return;state={...state,...patch};for(const listener of listeners)listener();};
 const focus=(target:'error'|'status')=>({focus:target,focusSerial:state.focusSerial+1});
 const boundReview=(review:SavedMeaningContextReview|undefined)=>!review||review.sessionId===config.sessionId&&review.candidateId===config.candidateId&&review.givenName===config.givenName&&review.fullName===config.fullName;
 const validateOptions=(options:MeaningContextOptions)=>{
  if(!options||typeof options!=='object'||!Array.isArray(options.currentReadings)||!Array.isArray(options.options)||!['available','legacy-unavailable','unsupported-pack','not-covered','data-unavailable'].includes(options.status))throw Error('词义参考返回资料不完整，请重新读取。');
  if(options.version!=='meaning-context-options/1.0.0'||options.sessionId!==config.sessionId||options.candidateId!==config.candidateId||!boundReview(options.savedReview))throw Error('返回的词义参考与当前候选不一致，请重新读取。');
  if(options.savedReview&&!validSavedMeaningContextReview(options.savedReview))throw Error('保存的词义参考结构不完整，请重新读取核对。');
  const chars=[...config.givenName];
  if(options.currentReadings.some((row,index)=>!Number.isInteger(row.position)||row.position!==index||row.char!==chars[index])||(options.status==='available'||options.currentReadings.length>0)&&options.currentReadings.length!==chars.length)throw Error('返回的当前字位读音不完整，请重新读取。');
  if(options.options.some(row=>row.adopted!==false||row.givenName!==config.givenName||row.position<0||row.position>=chars.length||row.char!==chars[row.position]))throw Error('返回的可选词义范围不匹配，未采用任何解释。');
 };
 const load=async({preserveDraft=false,userInitiated=false}:{preserveDraft?:boolean;userInitiated?:boolean}={})=>{
  if(!alive||state.phase==='saving')return false;
  const epoch=++loadEpoch,previous=state,parentEpochAtStart=parentChangeEpoch,parentAtStart=observedParent?{...observedParent}:undefined;
  publish({phase:'loading',error:undefined,notice:''});
  try{const returned=await config.getApi().getMeaningContextOptions(config.sessionId,config.candidateId);assertMeaningContextJson(returned);const options=structuredClone(returned);if(!alive||epoch!==loadEpoch)return false;validateOptions(options);
   const positions=confirmed(options),valid=new Set(options.currentReadings.map(row=>row.position));
   const draftPositions=preserveDraft?sorted([...previous.draftPositions.filter(position=>valid.has(position)),...positions]):positions;
   const draftChoices=preserveDraft?{...savedChoices(options),...previous.draftChoices}:savedChoices(options);
   explicitReloadParent=userInitiated&&preserveDraft&&parentEpochAtStart===parentChangeEpoch&&parentAtStart&&observedParent&&parentAtStart.revision===observedParent.revision&&parentAtStart.token===observedParent.token&&options.reviewRevision>parentAtStart.revision?{...parentAtStart,optionsRevision:options.reviewRevision,optionsToken:options.reviewToken}:undefined;
   publish({phase:'ready',options,draftPositions,draftChoices,needsRefresh:false,error:undefined,notice:preserveDraft?'已读取最新记录；你的未保存选择仍保留，请核对后再保存。':'',...(userInitiated?focus('status'):{})});return true;
  }catch(error){if(!alive||epoch!==loadEpoch)return false;publish({phase:'load-error',error:{kind:'load',message:message(error,'词义参考读取失败，请重试。')},...(userInitiated?focus('error'):{})});return false;}
 };
 const adoptSession=(session:NamingSession,action:MeaningContextUpdateRequest)=>{
  if(session.id!==config.sessionId)throw Error('保存返回的方案身份不一致，请读取最新记录核对。');
  const candidate=session.candidates.find(row=>row.id===config.candidateId) as (NamingSession['candidates'][number]&{meaningContextReview?:SavedMeaningContextReview})|undefined;
  if(!candidate||candidate.givenName!==config.givenName||candidate.fullName!==config.fullName||!boundReview(candidate.meaningContextReview))throw Error('保存返回的候选身份不一致，请读取最新记录核对。');
  if(!Number.isInteger(session.reviewRevision)||typeof session.reviewToken!=='string'||!session.reviewToken)throw Error('保存返回的版本信息不完整，请读取最新记录核对。');
  const options={...state.options!,reviewRevision:session.reviewRevision!,reviewToken:session.reviewToken,currentReadings:state.options!.currentReadings.map(row=>({...row,confirmed:!!candidate.meaningContextReview?.confirmedReadings.some(reading=>reading.position===row.position)}))};
  if(candidate.meaningContextReview)options.savedReview=structuredClone(candidate.meaningContextReview);else delete options.savedReview;
  publish({phase:'ready',options,draftPositions:action.action==='clear'?[]:sorted([...state.draftPositions,...confirmed(options)]),draftChoices:action.action==='clear'?{}:{...savedChoices(options),...state.draftChoices},needsRefresh:false,error:undefined,notice:action.action==='clear'?'已清除此功能的词义选择与全部读音确认，原解释与其他审阅保留。':action.action==='confirm-current-readings'?'当前读音确认已保存；尚未保存的词义选择仍是草稿。':'所选完整词义参考已保存，未改变单字状态或评分。',...focus('status')});
 };
 const save=async(request:MeaningContextUpdateRequest)=>{
  if(!alive||config.isDisabled?.()||!meaningContextCanWrite(state))return false;
  const options=state.options!;let responseReceived=false;publish({phase:'saving',error:undefined,notice:''});
  try{const canonical=await config.getApi().updateMeaningContext(config.sessionId,config.candidateId,request,options.reviewRevision,options.reviewToken!);responseReceived=true;if(!alive)return false;
   assertMeaningContextWriteResponse(canonical,{sessionId:config.sessionId,candidateId:config.candidateId,givenName:config.givenName,fullName:config.fullName},request);
   adoptSession(canonical,request);return true;}
  catch(error){if(!alive)return false;const conflict=isReviewConflict(error);publish({phase:'ready',needsRefresh:conflict||responseReceived||error instanceof MeaningContextReloadError||state.needsRefresh,error:{kind:conflict?'conflict':'save',message:message(error,'未确认保存结果，输入仍保留；可重新读取最新记录核对。')},...focus('error')});return false;}
 };
 return{
  getSnapshot:()=>state,subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>listeners.delete(listener);},
  activate:()=>{if(!alive){alive=true;if(state.phase==='loading')publish({phase:'idle'});}},
  load,
  setReading:(position:number,checked:boolean)=>{if(config.isDisabled?.()||state.phase!=='ready'||state.needsRefresh||!state.options?.currentReadings.some(row=>row.position===position)||confirmed(state.options).includes(position))return;publish({draftPositions:sorted(checked?[...state.draftPositions,position]:state.draftPositions.filter(value=>value!==position)),error:undefined,notice:''});},
  setChoice:(position:number,key:string)=>{if(config.isDisabled?.()||state.phase!=='ready'||state.needsRefresh||!state.options?.options.some(row=>row.position===position&&meaningOptionKey(row)===key))return;publish({draftChoices:{...state.draftChoices,[position]:key},error:undefined,notice:''});},
  confirmReadings:()=>{const saved=confirmed(state.options),positions=sorted(state.draftPositions).filter(position=>!saved.includes(position));if(!positions.length)return Promise.resolve(false);return save({action:'confirm-current-readings',positions});},
  chooseContext:(position:number)=>{const option=state.options?.options.find(row=>row.position===position&&meaningOptionKey(row)===state.draftChoices[position]);if(!option||state.options?.currentReadings.some(row=>!row.confirmed)||savedChoices(state.options)[position]===meaningOptionKey(option))return Promise.resolve(false);return save({action:'choose-context',position,caseId:option.caseId,senseId:option.senseId,contextKey:option.contextKey});},
  clear:()=>state.options?.savedReview?save({action:'clear'}):Promise.resolve(false),
  markExternalRevision:(revision:number|undefined,token:string|undefined)=>{if(revision===undefined||!token)return;if(!observedParent||observedParent.revision!==revision||observedParent.token!==token)parentChangeEpoch++;observedParent={revision,token};if(state.phase==='saving'||state.phase==='loading'||!state.options)return;if(explicitReloadParent&&explicitReloadParent.revision===revision&&explicitReloadParent.token===token&&explicitReloadParent.optionsRevision===state.options.reviewRevision&&explicitReloadParent.optionsToken===state.options.reviewToken)return;explicitReloadParent=undefined;if(state.options.reviewRevision!==revision||state.options.reviewToken!==token)publish({needsRefresh:true,notice:'方案已由其他审阅更新。未保存的选择仍保留，请读取最新记录核对。'});},
  dispose:()=>{alive=false;loadEpoch++;listeners.clear();}
 };
}
export type MeaningContextController=ReturnType<typeof createMeaningContextController>;
