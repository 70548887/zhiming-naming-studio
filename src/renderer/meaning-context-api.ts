import type {NamingSession} from '../shared/types';
import type {MeaningContextAPI,MeaningContextUpdateRequest,SavedMeaningContextReview} from '../shared/meaning-context-review';
import {validSavedMeaningContextReview} from '../shared/meaning-context-review';
import {validReviewToken} from '../shared/review-version';

interface MeaningContextUiBindings{
 transport:MeaningContextAPI;getCurrentSession:()=>NamingSession|null;canWrite:()=>boolean;isBusy:()=>boolean;
 beginWrite:(intent:MeaningContextUpdateRequest)=>{commit:(session:NamingSession)=>void;finish:()=>void;};
 onConflict:(error:unknown,draft:NamingSession)=>Promise<void>;
}
export class MeaningContextReloadError extends Error{}
export function assertMeaningContextWriteResponse(canonical:NamingSession,expected:{sessionId:string;candidateId:string;givenName:string;fullName:string;},intent:MeaningContextUpdateRequest):void{
 const candidate=canonical.candidates?.find(row=>row.id===expected.candidateId) as (NamingSession['candidates'][number]&{meaningContextReview?:SavedMeaningContextReview})|undefined;
 if(canonical.id!==expected.sessionId||!candidate||candidate.givenName!==expected.givenName||candidate.fullName!==expected.fullName)throw new MeaningContextReloadError('保存返回的方案或候选身份不一致，请读取最新记录核对。');
 if(!Number.isSafeInteger(canonical.reviewRevision)||canonical.reviewRevision!<0||typeof canonical.reviewToken!=='string'||!validReviewToken(canonical.reviewToken))throw new MeaningContextReloadError('保存返回的版本信息不完整，请读取最新记录核对。');
 const review=candidate.meaningContextReview;
 if(intent.action==='clear'){if(review!==undefined)throw new MeaningContextReloadError('返回记录仍保留此功能参考，请读取最新记录核对清除结果。');return;}
 if(!validSavedMeaningContextReview(review)||review.sessionId!==expected.sessionId||review.candidateId!==expected.candidateId||review.givenName!==expected.givenName||review.fullName!==expected.fullName)throw new MeaningContextReloadError('返回记录未包含本次有效参考，请读取最新记录核对。');
 if(intent.action==='confirm-current-readings'&&!intent.positions.every(position=>review.confirmedReadings.some(row=>row.position===position)))throw new MeaningContextReloadError('返回记录未包含本次读音确认，请读取最新记录核对。');
 if(intent.action==='choose-context'&&(!review.selections.some(row=>row.position===intent.position&&row.caseId===intent.caseId&&row.senseId===intent.senseId&&row.contextKey===intent.contextKey)||!review.rows.some(row=>row.position===intent.position&&row.result.status==='explanation-ready')))throw new MeaningContextReloadError('返回记录未包含本次已采用参考，请读取最新记录核对。');
}
/** Copies intent only. Character records, source and completed explanations are never sent by UI. */
export function meaningContextIntent(request:MeaningContextUpdateRequest):MeaningContextUpdateRequest{
 if(request.action==='confirm-current-readings')return{action:request.action,positions:[...request.positions]};
 if(request.action==='choose-context')return{action:request.action,position:request.position,caseId:request.caseId,senseId:request.senseId,contextKey:request.contextKey};
 if(request.action==='clear')return{action:'clear'};
 throw Error('词义参考操作无效。');
}
export function createMeaningContextUiApi(bindings:MeaningContextUiBindings):MeaningContextAPI{
 const current=(id:string,candidate:string)=>{const session=bindings.getCurrentSession();if(!session||session.id!==id||!session.candidates.some(row=>row.id===candidate))throw Error('当前候选已切换，请返回原方案查看。');return session;};
 return{
  getMeaningContextOptions:async(id,candidate)=>{current(id,candidate);return bindings.transport.getMeaningContextOptions(id,candidate);},
  updateMeaningContext:async(id,candidate,request,revision,token)=>{const session=current(id,candidate);if(!bindings.canWrite()||bindings.isBusy())throw Error('请先完成当前操作或打开原方案快照，再保存词义参考。');const intent=meaningContextIntent(request),run=bindings.beginWrite(intent);
   try{const canonical=await bindings.transport.updateMeaningContext(id,candidate,intent,revision,token),original=session.candidates.find(row=>row.id===candidate)!;assertMeaningContextWriteResponse(canonical,{sessionId:id,candidateId:candidate,givenName:original.givenName,fullName:original.fullName},intent);run.commit(canonical);return canonical;}
   catch(error){try{await bindings.onConflict(error,session);}catch{/* Keep the original save/CAS error if the latest-record refresh also fails. */}throw error;}
   finally{run.finish();}
  }
 };
}
