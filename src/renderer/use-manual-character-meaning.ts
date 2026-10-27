import {useLayoutEffect,useRef,useState,useSyncExternalStore} from 'react';
import type {ManualCharacterMeaningPanelProps} from './manual-character-meaning-panel-ui';
import {ManualCharacterMeaningController,type ManualMeaningContext} from './manual-character-meaning-state';
import type {CulturalAppHost} from './cultural-workflow-app';
import {customerWriteNoticeFeed} from './customer-write-notice-feed';
import {CUSTOMER_WRITE_NOTICE_MESSAGE} from '../shared/customer-write-notice-delivery';

export function useManualCharacterMeaning(options:{context:ManualMeaningContext;getSource:()=>unknown;isContextCurrent:()=>boolean;host:CulturalAppHost}):ManualCharacterMeaningPanelProps{
 const latest=useRef(options);latest.current=options;
 const [controller]=useState(()=>new ManualCharacterMeaningController({getContext:()=>latest.current.context,getSource:()=>latest.current.getSource(),getOwnerGuard:()=>latest.current.isContextCurrent,host:options.host}));
 const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
 useLayoutEffect(()=>{controller.attach();const seen=new Set<string>(),receive=()=>{for(const item of customerWriteNoticeFeed?.getSnapshot()??[]){if(seen.has(item.notice.id))continue;seen.add(item.notice.id);controller.receiveWriteNotice({type:CUSTOMER_WRITE_NOTICE_MESSAGE,source:item.source,notice:item.notice});}};receive();const unsubscribe=customerWriteNoticeFeed?.subscribe(receive);return()=>{unsubscribe?.();controller.detach();};},[controller]);
 useLayoutEffect(()=>controller.refresh());
 return{value:controller.getValue(),ownerKey:state.ownerKey,state,blockedReason:controller.getBlockedReason(),onInputChange:controller.setInput,onQuery:char=>{void controller.query(char);},onSelect:key=>{void controller.select(key);},onCancel:controller.cancel};
}
