import {canonicalPlainJson} from '../shared/plain-json';
import {validReviewToken,validReviewRevision} from '../shared/review-version';
import {CULTURAL_WORKFLOW_METHODS} from '../shared/cultural-workflow-api';
import type {BirthProfile,NamingPreferences,NamingSession} from '../shared/types';
import type {CulturalWorkflowContext} from './cultural-workflow-controller';
import type {CulturalSavedSourceReference} from './cultural-saved-catalog-state';

export const CULTURAL_RECORD_CONTINUATION_VERSION='cultural-record-continuation/1.0.0' as const;
export interface CulturalContinuationContext {
 profile:BirthProfile;preferences:NamingPreferences;session:NamingSession|null;savedSession:NamingSession|null;
 sessionCurrent:boolean;formDirty:boolean;reviewDirty:boolean;
 /** Full App-owned signature including owner/draft/database epochs. Not an API authority. */
 contextKey:string;
}
export interface CulturalContinuationOffer extends CulturalSavedSourceReference {
 offerId:string;status:'awaiting-explicit-choice';
}
export interface CulturalContinuationIntent extends CulturalSavedSourceReference {
 intentId:string;status:'explicit-record-choice';
}
export interface CulturalContinuationState {offer?:CulturalContinuationOffer;intent?:CulturalContinuationIntent;}
type Method=typeof CULTURAL_WORKFLOW_METHODS[number]|'readSessionDetail';
type SourceBinding={source:object;methods:readonly {name:Method;descriptor:PropertyDescriptor}[]};
const methodNames:readonly Method[]=['readSessionDetail',...CULTURAL_WORKFLOW_METHODS];
const own=<T,>(value:T):T=>JSON.parse(canonicalPlainJson(value));
const recordId=(value:unknown):value is string=>typeof value==='string'&&/^qc_[a-f0-9]{64}$/.test(value);
function sourceBinding(source:unknown):SourceBinding|undefined {
 if(!source||typeof source!=='object')return;
 try{
  const methods=methodNames.map(name=>({name,descriptor:Object.getOwnPropertyDescriptor(source,name)}));
  if(methods.some(row=>!row.descriptor||!Object.hasOwn(row.descriptor,'value')||typeof row.descriptor.value!=='function'))return;
  return{source,methods:methods as SourceBinding['methods']};
 }catch{return;}
}
function sameSource(binding:SourceBinding|undefined,source:unknown):boolean {
 if(!binding||binding.source!==source)return false;
 const current=sourceBinding(source);return !!current&&current.methods.every((row,index)=>{
  const previous=binding.methods[index];return row.name===previous.name&&row.descriptor.value===previous.descriptor.value&&row.descriptor.enumerable===previous.descriptor.enumerable&&row.descriptor.writable===previous.descriptor.writable&&row.descriptor.configurable===previous.descriptor.configurable;
 });
}
function sessionBinding(session:NamingSession|null){
 return session?{id:session.id,profileId:session.profileId,profile:session.profile,preferences:session.preferences,reviewRevision:session.reviewRevision??null,reviewToken:session.reviewToken??null,candidateRefs:session.candidates.map(candidate=>({id:candidate.id,givenName:candidate.givenName,fullName:candidate.fullName}))}:null;
}
function signature(context:CulturalContinuationContext):string {
 return canonicalPlainJson({contextKey:context.contextKey,profile:context.profile,preferences:context.preferences,session:sessionBinding(context.session),savedSession:sessionBinding(context.savedSession),sessionCurrent:context.sessionCurrent,formDirty:context.formDirty,reviewDirty:context.reviewDirty});
}
function matchesSource(context:CulturalContinuationContext,reference:CulturalSavedSourceReference,loaded:NamingSession):boolean {
 const {session,savedSession,profile}=context;
 if(!recordId(reference.comparisonId)||!reference.ownerProfileId||!reference.sourceSessionId||!session||!savedSession||!context.sessionCurrent||context.formDirty||context.reviewDirty)return false;
 if(typeof loaded.reviewToken!=='string'||!validReviewToken(loaded.reviewToken)||!validReviewRevision(loaded.reviewRevision))return false;
 return reference.ownerProfileId===profile.id&&loaded.id===reference.sourceSessionId&&loaded.profileId===reference.ownerProfileId&&loaded.profile.id===reference.ownerProfileId&&session.id===loaded.id&&savedSession.id===loaded.id&&canonicalPlainJson(sessionBinding(loaded))===canonicalPlainJson(sessionBinding(session))&&canonicalPlainJson(sessionBinding(loaded))===canonicalPlainJson(sessionBinding(savedSession));
}

/** App-owned intent only. Offer issuance belongs after the actual source-session
 * read and application. This helper performs no reads/writes, stores no cultural
 * record CAS/token/notes/snapshot, and never qualifies metadata or sources.
 * The existing Panel must explicitly re-read the chosen record/head/history. */
export function createCulturalRecordContinuation({getContext,getSource}:{getContext:()=>CulturalContinuationContext;getSource:()=>unknown}){
 let state:CulturalContinuationState={},generation=0,boundSignature:string|undefined,boundSource:SourceBinding|undefined;
 let reference:CulturalSavedSourceReference|undefined;
 const retire=()=>{generation++;state={};reference=undefined;boundSignature=undefined;boundSource=undefined;};
 const current=()=>{
  if(!reference||!boundSignature||!boundSource)return false;
  try{return boundSignature===signature(getContext())&&sameSource(boundSource,getSource());}catch{return false;}
 };
 const refresh=()=>{if((state.offer||state.intent)&&!current())retire();return own(state);};
 return {
  getSnapshot:()=>own(state),
  refresh,
  clear:retire,
  /** Caller supplies the exact successful readSessionDetail response, after it
   * has become the current canonical saved session. Merely browsing is not a call. */
  offerAfterSourceApplied:(requested:CulturalSavedSourceReference,loaded:NamingSession):CulturalContinuationOffer|undefined=>{
   retire();
   try{
    const context=getContext(),source=sourceBinding(getSource());if(!source||!matchesSource(context,requested,loaded))return;
    boundSignature=signature(context);boundSource=source;reference=own(requested);
    const offer:CulturalContinuationOffer={...reference,offerId:`cultural-continuation-offer/1:${crypto.randomUUID()}:${generation}`,status:'awaiting-explicit-choice'};
    state={offer};return own(offer);
   }catch{retire();return;}
  },
  choose:(offerId:string):CulturalContinuationIntent|undefined=>{
   refresh();if(!state.offer||state.offer.offerId!==offerId||!reference||!current())return;
   const intent:CulturalContinuationIntent={...reference,intentId:`cultural-continuation-choice/1:${crypto.randomUUID()}:${generation}`,status:'explicit-record-choice'};
   state={intent};return own(intent);
  },
  panelContext:(intentId:string):CulturalWorkflowContext|undefined=>{
   refresh();if(!state.intent||state.intent.intentId!==intentId||!reference||!current())return;
   const session=getContext().savedSession;if(!session||typeof session.reviewToken!=='string')return;
   return{ownerProfileId:reference.ownerProfileId,anchorRequest:{kind:'session',sessionId:reference.sourceSessionId,expectedReviewToken:session.reviewToken},contextKey:state.intent.intentId,candidates:[],comparisonId:reference.comparisonId};
  },
 };
}
