import {useLayoutEffect,useRef,useState,useSyncExternalStore} from 'react';
import type {NamingSession} from '../shared/types';
import {canonicalPlainJson} from '../shared/plain-json';
import {CUSTOMER_WRITE_NOTICE_MESSAGE} from '../shared/customer-write-notice-delivery';
import {customerWriteNoticeFeed} from './customer-write-notice-feed';
import type {CulturalAppHost} from './cultural-workflow-app';
import {Candidate2ReviewController,type Candidate2ReviewDeliveryLease} from './candidate2-review-state';
import {captureCandidate2ReviewBase,captureCandidate2ReviewDraft,type Candidate2ReviewBase,type Candidate2ReviewDraft,type Candidate2ReviewCandidateDraft,type Candidate2ReviewBoundaryResult} from './candidate2-review-boundary';
import type {Candidate2ReviewFeedbackProps} from './candidate2-review-ui';

export interface UseCandidate2ReviewOptions {
 canonicalSession:NamingSession|null|undefined;profileId:string;sessionCurrent:boolean;formDirty:boolean;storageReadOnly:boolean;
 contextKey:string;getSource:()=>unknown;isContextCurrent:()=>boolean;host:CulturalAppHost;
 /** Advanced by the App only after an actual canonical read/adoption; this is
  * an invalidation label, never source or saved-record authority. */
 canonicalAdoptionKey?:string|number;
 prepareAdoption:()=>Promise<void>;adopt:(session:NamingSession)=>void;
 confirmLoad:(action:()=>void)=>void;
}
interface ReadBinding {source:object;method:(id:string)=>Promise<unknown>;descriptor:PropertyDescriptor;}
const readBinding=(source:unknown):ReadBinding|undefined=>{
 try{if(!source||typeof source!=='object')return;const descriptor=Object.getOwnPropertyDescriptor(source,'readSessionDetail');if(descriptor&&Object.hasOwn(descriptor,'value')&&typeof descriptor.value==='function')return{source,descriptor,method:descriptor.value};}catch{/* Missing real reader stays unavailable. */}
};
const sameRead=(left:ReadBinding,right:ReadBinding|undefined)=>!!right&&left.source===right.source&&left.method===right.method&&['enumerable','writable','configurable'].every(key=>left.descriptor[key as keyof PropertyDescriptor]===right.descriptor[key as keyof PropertyDescriptor]);
const signature=(value:unknown)=>{try{return canonicalPlainJson(value);}catch{return 'invalid-canonical';}};
const canonicalSignature=(session:unknown,key:UseCandidate2ReviewOptions['canonicalAdoptionKey'])=>key===undefined?signature(session):signature({session,adoptionKey:key});
const sameRecord=(left:Candidate2ReviewBase|null,right:Candidate2ReviewBase|null)=>left?.session.id===right?.session.id&&left?.session.profileId===right?.session.profileId;
const message=(error:unknown)=>error instanceof Error?error.message:'读取已保存方案失败；当前草稿保留。';

/** One page-lifetime owner. Returned canonical values are staged during the
 * controller handoff, then adopted only after its actual lease has settled. */
export function useCandidate2Review(options:UseCandidate2ReviewOptions){
 const latest=useRef(options);latest.current=options;
 const [,render]=useState(0),alive=useRef(false);
 const view=useRef({inputSignature:'',base:null as Candidate2ReviewBase|null,draft:null as Candidate2ReviewDraft|null,readKey:'unopened',ownerEpoch:0,draftEpoch:0,readEpoch:0,readPending:false,readError:null as string|null,latest:null as {base:Candidate2ReviewBase;binding:ReadBinding;ownerEpoch:number;contextKey:string}|null,compare:false});
 const restartDraft=useRef<{base:Candidate2ReviewBase;draft:Candidate2ReviewDraft;readKey:string}|null>(null);
 const staged=useRef<{result:Candidate2ReviewBoundaryResult;lease:Candidate2ReviewDeliveryLease;ownerEpoch:number;draftEpoch:number;contextKey:string}|null>(null);
 const notify=()=>{if(alive.current)render(value=>value+1);};
 const [controller]=useState(()=>new Candidate2ReviewController({
  getSource:()=>latest.current.getSource(),host:options.host,
  getContext:()=>({canonicalSession:view.current.base?.session??null,draft:view.current.draft,canonicalReadKey:view.current.readKey,profileId:latest.current.profileId,sessionCurrent:latest.current.sessionCurrent,formDirty:latest.current.formDirty,storageReadOnly:latest.current.storageReadOnly,contextKey:signature({app:latest.current.contextKey,owner:view.current.ownerEpoch,draft:view.current.draftEpoch})}),
  getOwnerGuard:()=>{const owner=view.current.ownerEpoch,draft=view.current.draftEpoch,guard=latest.current.isContextCurrent;return()=>alive.current&&view.current.ownerEpoch===owner&&view.current.draftEpoch===draft&&guard();},
  onSaved:async(result,lease)=>{
   if(!lease.isCurrent())return;
   await latest.current.prepareAdoption();if(!lease.isCurrent())return;
   staged.current={result,lease,ownerEpoch:view.current.ownerEpoch,draftEpoch:view.current.draftEpoch,contextKey:latest.current.contextKey};
  }
 }));
 const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
 const inputSignature=options.canonicalSession&&Object.hasOwn(options.canonicalSession,'candidate2Naming')?canonicalSignature(options.canonicalSession,options.canonicalAdoptionKey):'';
 useLayoutEffect(()=>{
  alive.current=true;controller.attach();
  const seen=new Set<string>();
  const receive=()=>{for(const item of customerWriteNoticeFeed?.getSnapshot()??[]){if(seen.has(item.notice.id))continue;seen.add(item.notice.id);controller.receiveWriteNotice({type:CUSTOMER_WRITE_NOTICE_MESSAGE,source:item.source,notice:item.notice});staged.current=null;view.current.readEpoch++;notify();}};
  receive();const unsubscribe=customerWriteNoticeFeed?.subscribe(receive);
  return()=>{alive.current=false;view.current.readEpoch++;staged.current=null;unsubscribe?.();controller.detach();};
 },[controller]);
 useLayoutEffect(()=>{
  if(view.current.inputSignature!==inputSignature){
   if(controller.getSnapshot().requiresRestart){
    let next:Candidate2ReviewBase|null=null,error:string|null=null;
    try{next=inputSignature?captureCandidate2ReviewBase(latest.current.canonicalSession):null;}catch(failure){error=message(failure);}
    if(sameRecord(view.current.base,next)){view.current.inputSignature=inputSignature;controller.refresh();return;}
    // A restart-protected draft stays with its original record. Other records
    // show their own read-only canonical; navigation never releases the latch.
    if(!restartDraft.current&&view.current.base&&view.current.draft)restartDraft.current={base:view.current.base,draft:view.current.draft,readKey:view.current.readKey};
    const retained=restartDraft.current&&sameRecord(restartDraft.current.base,next)?restartDraft.current:null;
    view.current.ownerEpoch++;view.current.readEpoch++;view.current.latest=null;view.current.compare=false;view.current.readError=error;staged.current=null;
    view.current.base=retained?.base??next;view.current.draft=retained?.draft??next?.draft??null;view.current.readKey=retained?.readKey??'restart-display-only';view.current.inputSignature=inputSignature;
    notify();controller.refresh();return;
   }
   view.current.ownerEpoch++;view.current.readEpoch++;view.current.latest=null;view.current.compare=false;view.current.readError=null;staged.current=null;
   view.current.inputSignature=inputSignature;
   try{view.current.base=inputSignature?captureCandidate2ReviewBase(latest.current.canonicalSession):null;view.current.draft=view.current.base?.draft??null;view.current.readKey=crypto.randomUUID();}catch(error){view.current.base=null;view.current.draft=null;view.current.readError=message(error);}
   notify();
  }
  controller.refresh();
 });
 useLayoutEffect(()=>{
  const pending=staged.current;if(!pending||state.phase!=='ready'||state.requestPending)return;
  staged.current=null;
  if(!pending.lease.isCurrent()||options.host.isBusy()||pending.ownerEpoch!==view.current.ownerEpoch||pending.draftEpoch!==view.current.draftEpoch||pending.contextKey!==latest.current.contextKey)return;
  // No await or user callback between the final live checks and actual adoption.
  const base=captureCandidate2ReviewBase(pending.result.session);
  latest.current.adopt(pending.result.session);
  view.current.base=base;view.current.draft=base.draft;view.current.inputSignature=canonicalSignature(base.session,latest.current.canonicalAdoptionKey);view.current.readKey=crypto.randomUUID();view.current.draftEpoch++;view.current.latest=null;view.current.compare=false;view.current.readError=null;
  notify();
 },[state,options.host]);
 const dirty=!!view.current.base&&!!view.current.draft&&signature(view.current.base.draft)!==signature(view.current.draft);
 const edit=(change:(draft:Candidate2ReviewDraft)=>void)=>{
  if(!view.current.base||!view.current.draft||controller.getSnapshot().requestPending||controller.getSnapshot().requiresRestart||view.current.readPending||latest.current.storageReadOnly)return;
  const next=structuredClone(view.current.draft);change(next);
  view.current.draft=captureCandidate2ReviewDraft(view.current.base,next);view.current.draftEpoch++;staged.current=null;view.current.compare=false;controller.refresh();notify();
 };
 const readSaved=async()=>{
  const current=view.current,base=current.base,guard=latest.current.isContextCurrent,contextKey=latest.current.contextKey,binding=readBinding(latest.current.getSource());
  if(!base||!binding||current.readPending||options.host.isBusy()||controller.getSnapshot().requestPending||controller.getSnapshot().requiresRestart||!guard())return;
  const owner=current.ownerEpoch,draft=current.draftEpoch,epoch=++current.readEpoch;
  const owns=()=>alive.current&&epoch===view.current.readEpoch&&owner===view.current.ownerEpoch&&draft===view.current.draftEpoch&&contextKey===latest.current.contextKey&&guard()&&sameRead(binding,readBinding(latest.current.getSource()))&&!controller.getSnapshot().requiresRestart;
  const release=options.host.acquireWrite('读取项目固定取法原方案');current.readPending=true;current.readError=null;current.latest=null;current.compare=false;notify();
  try{
   const raw=await binding.method.call(binding.source,base.session.id);if(!owns())return;
   const read=captureCandidate2ReviewBase(raw);
   if(read.session.id!==base.session.id||read.session.profileId!==base.session.profileId||signature(read.session.candidate2Naming)!==signature(base.session.candidate2Naming))throw Error('读回方案不属于当前原始记录；草稿保留。');
   current.latest={base:read,binding,ownerEpoch:owner,contextKey};
  }catch(error){if(owns())current.readError=message(error);}
  finally{current.readPending=false;release();notify();}
 };
 const latestCurrent=()=>{const read=view.current.latest;return !!read&&read.ownerEpoch===view.current.ownerEpoch&&read.contextKey===latest.current.contextKey&&sameRead(read.binding,readBinding(latest.current.getSource()));};
 const loadLatest=()=>{
  if(!latestCurrent()||controller.getSnapshot().requiresRestart||controller.getSnapshot().requestPending||view.current.readPending||options.host.isBusy())return;
  const read=view.current.latest!;latest.current.confirmLoad(()=>{
   if(!latestCurrent()||read!==view.current.latest||options.host.isBusy()||!latest.current.isContextCurrent()||controller.getSnapshot().requiresRestart)return;
   latest.current.adopt(read.base.session);view.current.base=read.base;view.current.draft=read.base.draft;view.current.inputSignature=canonicalSignature(read.base.session,latest.current.canonicalAdoptionKey);view.current.readKey=crypto.randomUUID();view.current.ownerEpoch++;view.current.draftEpoch++;view.current.latest=null;view.current.compare=false;view.current.readError=null;staged.current=null;controller.refresh();notify();
  });
 };
 const pending=state.requestPending||view.current.readPending;
 const effectiveState={...state,requestPending:pending,...(view.current.readError?{error:view.current.readError}:{}),draftDirty:dirty,canReadSaved:!!view.current.base&&!!readBinding(options.getSource())&&!pending&&!state.requiresRestart,canLoadLatest:latestCurrent()&&!pending&&!state.requiresRestart,canCompareDraft:latestCurrent()&&!pending&&!state.requiresRestart};
 const feedback:Candidate2ReviewFeedbackProps={state:effectiveState,disabled:options.host.isBusy()&&!pending,onCancelWait:()=>{if(view.current.readPending){view.current.readEpoch++;view.current.readError='已停止等待读回；原请求结束前仍保留工作台租约。';notify();}else controller.cancel();staged.current=null;},onRetryDelivery:()=>{void controller.retryDelivery();},onReadSaved:()=>{void readSaved();},onLoadLatest:loadLatest,onCompareDraft:()=>{if(latestCurrent()&&!pending&&!state.requiresRestart){view.current.compare=true;notify();}}};
 const draftCandidate=(id:string):Candidate2ReviewCandidateDraft|undefined=>view.current.draft?.candidates.find(candidate=>candidate.id===id);
 return{state,feedback,draft:view.current.draft,dirty,pending,canEdit:!!view.current.base&&!pending&&!state.requiresRestart&&!options.storageReadOnly,canSave:state.canSave&&!view.current.readPending&&!options.host.isBusy(),save:()=>{void controller.save();},editNote:(value:string)=>edit(draft=>{draft.reviewNote=value;}),editElements:(value:Candidate2ReviewDraft['preferredElements'])=>edit(draft=>{draft.preferredElements=[...value];}),editCandidate:(id:string,updates:Partial<Omit<Candidate2ReviewCandidateDraft,'id'>>)=>edit(draft=>{const candidate=draft.candidates.find(row=>row.id===id);if(candidate)Object.assign(candidate,updates);}),draftCandidate,comparison:view.current.compare&&latestCurrent()?{latest:view.current.latest!.base.session,draft:view.current.draft}:null};
}
