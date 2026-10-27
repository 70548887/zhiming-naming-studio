import {useLayoutEffect,useRef,useState,useSyncExternalStore} from 'react';
import type {NamingSession} from '../shared/types';
import {CUSTOMER_WRITE_NOTICE_MESSAGE} from '../shared/customer-write-notice-delivery';
import {customerWriteNoticeFeed} from './customer-write-notice-feed';
import type {CulturalAppHost} from './cultural-workflow-app';
import {Candidate2ReportController} from './candidate2-report-state';

export interface UseCandidate2ReportOptions{
 canonicalSession:NamingSession|null|undefined;profileId:string;sessionCurrent:boolean;formDirty:boolean;draftDirty:boolean;desktop:boolean;requiresRestart:boolean;
 contextKey:string;getSource:()=>unknown;isContextCurrent:()=>boolean;host:CulturalAppHost;
}
/** Page-lifetime owner; canonical references and full UI epochs are supplied by
 * App. The unchanged report action component carries only the exact reference. */
export function useCandidate2Report(options:UseCandidate2ReportOptions){
 const latest=useRef(options);latest.current=options;
 const [controller]=useState(()=>new Candidate2ReportController({getContext:()=>({canonicalSession:latest.current.canonicalSession??null,profileId:latest.current.profileId,sessionCurrent:latest.current.sessionCurrent,formDirty:latest.current.formDirty,draftDirty:latest.current.draftDirty,desktop:latest.current.desktop,requiresRestart:latest.current.requiresRestart,contextKey:latest.current.contextKey}),getSource:()=>latest.current.getSource(),getOwnerGuard:()=>latest.current.isContextCurrent,host:options.host}));
 const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
 useLayoutEffect(()=>{controller.attach();const seen=new Set<string>();const receive=()=>{for(const item of customerWriteNoticeFeed?.getSnapshot()??[]){if(seen.has(item.notice.id))continue;seen.add(item.notice.id);controller.receiveWriteNotice({type:CUSTOMER_WRITE_NOTICE_MESSAGE,source:item.source,notice:item.notice});}};receive();const unsubscribe=customerWriteNoticeFeed?.subscribe(receive);return()=>{unsubscribe?.();controller.detach();};},[controller]);
 useLayoutEffect(()=>controller.refresh());
 return{state,request:controller.request,confirmSavedOnly:()=>{void controller.confirmSavedOnly();},dismissConfirmation:controller.dismissConfirmation,cancel:controller.cancel,closePreview:controller.closePreview};
}
