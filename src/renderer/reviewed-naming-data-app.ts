import {useCallback,useEffect,useMemo,useState} from 'react';
import type {BirthProfile,NamingPreferences} from '../shared/types';
import type {ReviewedDataSelection,ReviewedGenerateResult,ReviewedNamingDataApi} from '../shared/reviewed-naming-data';
import type {ReviewedDataUiChoice} from './reviewed-naming-data-state';
import type {ReviewedBackendDisplay} from './ReviewedNamingDataProvenance';
import type {ReviewedResultLease} from './reviewed-naming-data-state';

export interface ReviewedNamingAppFlowOptions {
  profile:BirthProfile;
  preferences:NamingPreferences;
  busy:boolean;
  contextRevision:number;
  sessionId?:string;
  blockedReason?:string;
  onGenerated:(result:ReviewedGenerateResult,lease:ReviewedResultLease)=>void|Promise<void>;
  api?:ReviewedNamingDataApi;
}
export function createReviewedDirtyGuard(isDirty:()=>boolean,confirm:()=>Promise<boolean>):()=>Promise<boolean>{
 return async()=>!isDirty()||await confirm();
}
export function useReviewedNamingAppFlow(options:ReviewedNamingAppFlowOptions){
  const [choice,setChoice]=useState<ReviewedDataUiChoice>({mode:'legacy'});
  const [display,setDisplay]=useState<ReviewedBackendDisplay>({status:'not-verified'});
  useEffect(()=>{if(display.status!=='verified-generation'||options.sessionId===display.session.id)return;setDisplay({status:'not-verified'});},[options.sessionId,options.profile.id,options.contextRevision,display]);
  const explicitApi=Object.hasOwn(options,'api');
  const api=useMemo<ReviewedNamingDataApi|undefined>(()=>{
    if(explicitApi)return options.api;
    const raw=window.studio as typeof window.studio&Partial<ReviewedNamingDataApi>;
    if(typeof raw.generateReviewed!=='function')return undefined;
    return Object.freeze({generateReviewed:(profile:BirthProfile,preferences:NamingPreferences,selection:ReviewedDataSelection)=>raw.generateReviewed!(profile,preferences,selection)});
  },[explicitApi,options.api]);
  const onSelectionChange=useCallback((next:ReviewedDataUiChoice)=>{setChoice(next);setDisplay({status:'not-verified'});},[]);
  const onGenerated=useCallback(async(result:ReviewedGenerateResult,lease:ReviewedResultLease)=>{
    await options.onGenerated(result,lease);
    if(lease.isCurrent())setDisplay({status:'verified-generation',session:result.session});
  },[options.onGenerated]);
  return {choice,api,display,onSelectionChange,onGenerated,contextRevision:options.contextRevision,busy:options.busy,blockedReason:options.blockedReason,profile:options.profile,preferences:options.preferences};
}
