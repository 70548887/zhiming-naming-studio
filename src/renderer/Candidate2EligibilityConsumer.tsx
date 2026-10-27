import React,{useCallback,useLayoutEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import type {BirthProfile,NamingPreferences} from '../shared/types';
import {namingInputKey} from '../shared/workflow';
import type {Candidate2NamingEligibilityApi} from '../shared/candidate2-naming-eligibility-v1';
import {Candidate2OptInPreviewContainer} from './Candidate2OptInPreviewContainer';
import {createCandidate2EligibilityConsumerController,type Candidate2EligibilityConsumerContext} from './candidate2-eligibility-consumer-state';

export interface Candidate2EligibilityConsumerProps {profile:BirthProfile;preferences:NamingPreferences;disabled?:boolean;id?:string;}
export function Candidate2EligibilityConsumer({profile,preferences,disabled=false,id='candidate2-eligibility'}:Candidate2EligibilityConsumerProps){
  const contextKey=useMemo(()=>namingInputKey(profile,preferences),[profile,preferences]);
  const context=useRef<Candidate2EligibilityConsumerContext>({profile,preferences,contextKey});
  context.current={profile,preferences,contextKey};
  const disabledRef=useRef(disabled);disabledRef.current=disabled;
  const [controller]=useState(()=>createCandidate2EligibilityConsumerController({getContext:()=>context.current,getApi:()=>window.studio as typeof window.studio&Partial<Candidate2NamingEligibilityApi>,isDisabled:()=>disabledRef.current}));
  const snapshot=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
  useLayoutEffect(()=>{controller.attach();return()=>controller.detach();},[controller]);
  useLayoutEffect(()=>{controller.refresh();},[controller,contextKey]);
  const onIntent=useCallback((intent:{choice:'legacy'|'candidate2';contextKey:string})=>{if(intent.contextKey===context.current.contextKey)void controller.choose(intent.choice);},[controller]);
  const onRetry=useCallback(()=>{void controller.retry();},[controller]);
  const manualConflict=preferences.preferredElements.length>0||Object.hasOwn(preferences,'namingElementMethod');
  const current=snapshot.contextKey===contextKey;
  return <Candidate2OptInPreviewContainer id={id} preferences={preferences} contextKey={contextKey} choice={current?snapshot.choice:'legacy'} eligibility={current?snapshot.eligibility:undefined} preview={current?snapshot.preview:undefined} manualConflict={manualConflict} disabled={disabled} onIntent={onIntent} onRetry={onRetry}/>;
}
