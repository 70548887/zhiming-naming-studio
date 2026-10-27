import {useCallback,useLayoutEffect,useRef,useState,useSyncExternalStore} from 'react';
import type {Candidate2GenerationPanelProps} from './candidate2-generation-ui';
import {Candidate2GenerationController,type Candidate2GenerationBindings} from './candidate2-generation-state';
import type {Candidate2GenerationContext} from './candidate2-generation-input';

export interface UseCandidate2GenerationOptions extends Omit<Candidate2GenerationBindings,'getContext'|'getSource'|'getOwnerGuard'> {
 context:Candidate2GenerationContext;source:unknown;getSource:()=>unknown;isContextCurrent:()=>boolean;
}
/** API-only consumer hook; mounting/enabling never calls a backend method.
 * The App owns canonical saved profile identity, the shared host and delivery. */
export function useCandidate2Generation(options:UseCandidate2GenerationOptions):Candidate2GenerationPanelProps {
 const latest=useRef(options);latest.current=options;
 const [controller]=useState(()=>new Candidate2GenerationController({getContext:()=>latest.current.context,getSource:()=>latest.current.getSource(),getOwnerGuard:()=>latest.current.isContextCurrent,host:options.host,onGenerated:(result,lease)=>latest.current.onGenerated(result,lease)}));
 useLayoutEffect(()=>{controller.attach();return()=>controller.detach();},[controller]);
 // Every committed render observes full signatures/method descriptors. The
 // controller advances its independent serial on A-B-A changes, not on replay.
 useLayoutEffect(()=>controller.refresh());
 const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
 const onEnabledChange=useCallback((value:boolean)=>controller.setEnabled(value),[controller]);
 const onGenerate=useCallback(()=>{void controller.generate();},[controller]);
 const onCancel=useCallback(()=>controller.cancel(),[controller]);
 const onRetryDelivery=useCallback(()=>{void controller.retryDelivery();},[controller]);
 return{state,onEnabledChange,onGenerate,onCancel,onRetryDelivery};
}
