import {useLayoutEffect,useRef,useState,useSyncExternalStore} from 'react';
import type {NamingSession} from '../shared/types';
import {CUSTOMER_WRITE_NOTICE_MESSAGE} from '../shared/customer-write-notice-delivery';
import {customerWriteNoticeFeed} from './customer-write-notice-feed';
import type {CulturalAppHost} from './cultural-workflow-app';
import {Candidate2HistoryController,type Candidate2HistoryDeliveryLease} from './candidate2-history-state';
import type {Candidate2HistoryStatusProps} from './Candidate2HistoryStatus';

export interface UseCandidate2HistoryOptions{
 canonicalSession:NamingSession|null|undefined;profileId:string;sessionCurrent:boolean;formDirty:boolean;storageReadOnly:boolean;
 canonicalReadKey:string;contextKey:string;getSource:()=>unknown;isContextCurrent:()=>boolean;host:CulturalAppHost;
 prepareAdoption:()=>Promise<void>;adopt:(session:NamingSession)=>void;
}
/** One page-lifetime reference controller. Native canonical results are staged
 * until both the actual restore and handoff leases finish before App adoption. */
export function useCandidate2History(options:UseCandidate2HistoryOptions){
 const latest=useRef(options);latest.current=options;
 const staged=useRef<{session:NamingSession;lease:Candidate2HistoryDeliveryLease;contextKey:string;readKey:string}|null>(null);
 const [controller]=useState(()=>new Candidate2HistoryController({
  getSource:()=>latest.current.getSource(),host:options.host,
  getContext:()=>({canonicalSession:latest.current.canonicalSession??null,profileId:latest.current.profileId,sessionCurrent:latest.current.sessionCurrent,formDirty:latest.current.formDirty,storageReadOnly:latest.current.storageReadOnly,canonicalReadKey:latest.current.canonicalReadKey,contextKey:latest.current.contextKey}),
  getOwnerGuard:()=>latest.current.isContextCurrent,
  onRestored:async(session,lease)=>{if(!lease.isCurrent())return;await latest.current.prepareAdoption();if(!lease.isCurrent())return;staged.current={session,lease,contextKey:latest.current.contextKey,readKey:latest.current.canonicalReadKey};}
 }));
 const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
 useLayoutEffect(()=>{
  controller.attach();const seen=new Set<string>();
  const receive=()=>{for(const item of customerWriteNoticeFeed?.getSnapshot()??[]){if(seen.has(item.notice.id))continue;seen.add(item.notice.id);staged.current=null;controller.receiveWriteNotice({type:CUSTOMER_WRITE_NOTICE_MESSAGE,source:item.source,notice:item.notice});}};
  receive();const unsubscribe=customerWriteNoticeFeed?.subscribe(receive);
  return()=>{staged.current=null;unsubscribe?.();controller.detach();};
 },[controller]);
 useLayoutEffect(()=>controller.refresh());
 useLayoutEffect(()=>{
  const pending=staged.current;if(!pending||state.phase!=='restored'||state.requestPending)return;staged.current=null;
  if(!pending.lease.isCurrent()||options.host.isBusy()||pending.contextKey!==latest.current.contextKey||pending.readKey!==latest.current.canonicalReadKey||!latest.current.isContextCurrent())return;
  latest.current.adopt(pending.session);controller.close();
 },[state,controller,options.host]);
 const status:Candidate2HistoryStatusProps={state,disabled:options.host.isBusy()&&!state.requestPending,onReadHistory:()=>{void controller.open();},onCancelWait:()=>{staged.current=null;controller.cancel();},onRetryDelivery:()=>{void controller.retryDelivery();}};
 return{state,status,open:()=>{void controller.open();},close:()=>{staged.current=null;controller.close();},requestRestore:controller.requestRestore,confirmRestore:()=>{void controller.confirmRestore();},dismissConfirmation:controller.dismissConfirmation};
}
