import type {BirthProfile,NamingPreferences} from '../shared/types';
import {CANDIDATE2_NAMING_SELECTION} from '../shared/candidate2-naming-consumer-v1';
import type {Candidate2NamingEligibility,Candidate2NamingEligibilityApi} from '../shared/candidate2-naming-eligibility-v1';
import type {Candidate2OptInChoice,Candidate2OptInIntent} from './Candidate2OptInPanel';
import type {Candidate2ReadonlyPreview} from './Candidate2OptInPreviewContainer';

export interface Candidate2EligibilityConsumerContext {profile:BirthProfile;preferences:NamingPreferences;contextKey:string;}
export interface Candidate2EligibilityConsumerState {contextKey:string;choice:Candidate2OptInChoice;eligibility?:Candidate2NamingEligibility;preview:Candidate2ReadonlyPreview;}
export interface Candidate2EligibilityConsumerController {
  getSnapshot:()=>Candidate2EligibilityConsumerState;
  subscribe:(listener:()=>void)=>()=>void;
  attach:()=>void;
  detach:()=>void;
  refresh:()=>void;
  choose:(choice:Candidate2OptInChoice)=>Promise<Candidate2OptInIntent|undefined>;
  retry:()=>Promise<void>;
  dispose:()=>void;
}

const idlePreview=():Candidate2ReadonlyPreview=>({status:'idle',summary:'默认保留原有取法；明确选择项目固定取法后才会进行只读资格检查。'});
const textOf=(error:unknown)=>error instanceof Error?error.message:String(error);
function previewForEligibility(value:Candidate2NamingEligibility):Candidate2ReadonlyPreview {
  const status=value.status==='eligible'?'ready':value.status==='unavailable'?'unavailable':value.status==='blocked'||value.status==='disabled'?'blocked':'error';
  const sources=[...(value.application?.sources??[]),...(value.dataIdentity?.sources??[])].filter((source,index,list)=>list.findIndex(item=>item.id===source.id)===index).map(source=>({name:source.name,license:source.license}));
  return {status,summary:value.notice||value.reasons.map(reason=>reason.message).join('；'),reasons:value.reasons.map(reason=>reason.message),methodVersion:value.versions.methodId,methodPolicy:value.versions.policyId,publicationId:value.versions.publicationId,namingRulesVersion:value.versions.namingRulesVersion,sources,traditionalStatus:value.traditionalStatus};
}

export function createCandidate2EligibilityConsumerController({getContext,getApi,isDisabled=()=>false}:{getContext:()=>Candidate2EligibilityConsumerContext;getApi:()=>Partial<Candidate2NamingEligibilityApi>|undefined;isDisabled?:()=>boolean}):Candidate2EligibilityConsumerController {
  let state:Candidate2EligibilityConsumerState={contextKey:getContext().contextKey,choice:'legacy',preview:idlePreview()};
  let sequence=0;
  let attached=true;
  const listeners=new Set<()=>void>();
  const emit=()=>listeners.forEach(listener=>listener());
  const current=(token:number,key:string)=>attached&&token===sequence&&state.contextKey===key&&getContext().contextKey===key;
  const refresh=()=>{const context=getContext();if(context.contextKey!==state.contextKey){sequence++;state={contextKey:context.contextKey,choice:'legacy',preview:idlePreview()};emit();}};
  const check=async(context:Candidate2EligibilityConsumerContext)=>{
    const token=++sequence;
    state={contextKey:context.contextKey,choice:'candidate2',preview:{status:'loading',summary:'正在读取项目固定取法资格…'}};
    emit();
    const api=getApi();
    const checker=api?.checkCandidate2NamingEligibility;
    if(typeof checker!=='function'){
      if(current(token,context.contextKey)){state={...state,preview:{status:'unavailable',summary:'只读资格服务当前不可用；未将不可用状态当作通过。'} };emit();}
      return;
    }
    try{
      const eligibility=await checker.call(api,context.profile,context.preferences,CANDIDATE2_NAMING_SELECTION);
      if(current(token,context.contextKey)){state={...state,eligibility,preview:previewForEligibility(eligibility)};emit();}
    }catch(error){
      if(current(token,context.contextKey)){state={...state,preview:{status:'error',summary:`只读资格检查失败：${textOf(error)}`}};emit();}
    }
  };
  const choose=async(choice:Candidate2OptInChoice)=>{
    if(!attached||isDisabled())return undefined;
    refresh();
    if(choice===state.choice)return undefined;
    const context=getContext(),intent:Candidate2OptInIntent={choice,contextKey:context.contextKey,source:'explicit-user-opt-in'};
    if(choice==='candidate2')await check(context);
    else{sequence++;state={contextKey:context.contextKey,choice:'legacy',preview:idlePreview()};emit();}
    return intent;
  };
  const retry=async()=>{
    if(!attached||isDisabled())return;
    refresh();
    if(state.choice!=='candidate2'||!['error','unavailable'].includes(state.preview.status))return;
    await check(getContext());
  };
  // React owns subscriptions. Effect cleanup retires requests without erasing
  // listeners that may already have been reinstalled during StrictMode replay.
  const detach=()=>{attached=false;sequence++;};
  const attach=()=>{if(attached)return;attached=true;state={contextKey:getContext().contextKey,choice:'legacy',preview:idlePreview()};emit();};
  return {getSnapshot:()=>state,subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener);},attach,detach,refresh,choose,retry,dispose:detach};
}
