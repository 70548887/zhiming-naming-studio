import type {BirthProfile,Element,NamingPreferences} from '../shared/types';
import {PROJECT_NAMING_METHOD_ID,readNamingElementMethodSelection,type NamingElementMethodSelection} from '../shared/project-naming-use';
import {ROOT_FEEDBACK_FACADE_VERSION,type RootFeedbackFacadeDTO,type RootFeedbackFacadeOptions} from '../shared/bazi-root-feedback-facade';
import {ROOT_FEEDBACK_APPLICATION_POLICY,ROOT_FEEDBACK_APPLICATION_SCHEMA,type RootFeedbackApplicationGate} from '../shared/bazi-root-feedback-application';

export type ProjectNamingPreferences=NamingPreferences&{namingElementMethod?:NamingElementMethodSelection};
export type ProjectNamingChoice='legacy'|'month-branch-only'|'month-stem-proposal';
export type ProjectNamingIntent=
 |{status:'legacy';manualElements:Element[]}
 |{status:'project';selection:NamingElementMethodSelection;manualElements:[];choice:NamingElementMethodSelection['entryPolicy']}
 |{status:'conflict';selection:NamingElementMethodSelection;manualElements:Element[];message:string}
 |{status:'invalid';message:string};
export type ProjectNamingChoiceResult=
 |{status:'accepted';preferences:ProjectNamingPreferences;clearManualDraft:boolean}
 |{status:'needs-manual-clear';choice:Exclude<ProjectNamingChoice,'legacy'>;manualElements:Element[]}
 |{status:'rejected';message:string};

const MANUAL_CONFLICT='项目取法与人工五行不能同时采用；请先明确清空人工五行，或切回原有取法。';
const MANUAL_GUARD='当前已选择项目取法；请先切回原有取法，再修改人工五行。';
const ELEMENTS:readonly Element[]=['木','火','土','金','水'];
function message(error:unknown):string{return error instanceof Error&&error.message.trim()?error.message:typeof error==='string'&&error.trim()?error:'项目取法状态无效，请重新选择。';}
function record(value:unknown):value is Record<string,unknown>{return value!==null&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));}

/** Descriptor reads keep malformed drafts from running accessors while computing identity. */
function signature(value:unknown,ancestors=new Set<object>()):string{
 if(value===undefined)return 'undefined';
 if(value===null)return 'null';
 if(typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
 if(typeof value==='number'&&Number.isFinite(value))return Object.is(value,-0)?'-0':String(value);
 if(typeof value!=='object'||(!Array.isArray(value)&&!record(value)))throw new Error('项目取法上下文只接受普通数据。');
 if(ancestors.has(value))throw new Error('项目取法上下文不得包含循环引用。');
 ancestors.add(value);
 try{
  const keys=Reflect.ownKeys(value);
  if(keys.some(key=>typeof key!=='string'||['__proto__','prototype','constructor'].includes(key)))throw new Error('项目取法上下文含无效字段。');
  if(Array.isArray(value)){
   if(keys.length!==value.length+1)throw new Error('项目取法数组须为连续数据数组。');
   const parts:string[]=[];
   for(let index=0;index<value.length;index++){
    const descriptor=Object.getOwnPropertyDescriptor(value,String(index));
    if(!descriptor||!descriptor.enumerable||!Object.hasOwn(descriptor,'value'))throw new Error('项目取法数组不得含空项或访问器。');
    parts.push(signature(descriptor.value,ancestors));
   }
   return `[${parts.join(',')}]`;
  }
  return `{${(keys as string[]).sort().map(key=>{
   const descriptor=Object.getOwnPropertyDescriptor(value,key)!;
   if(!descriptor.enumerable||!Object.hasOwn(descriptor,'value'))throw new Error('项目取法上下文不得含访问器或隐藏字段。');
   return `${JSON.stringify(key)}:${signature(descriptor.value,ancestors)}`;
  }).join(',')}}`;
 }finally{ancestors.delete(value);}
}
function copyData<T>(value:T):T{signature(value);return structuredClone(value);}
function freezeData<T>(value:T):T{
 if(value!==null&&typeof value==='object'){
  for(const child of Object.values(value))freezeData(child);
  Object.freeze(value);
 }
 return value;
}
function elementArray(value:unknown):Element[]{
 if(!Array.isArray(value))throw new Error('人工五行必须为五行数组。');
 signature(value);
 const result:Element[]=[];
 for(let index=0;index<value.length;index++){
  const element:unknown=Object.getOwnPropertyDescriptor(value,String(index))!.value;
  if(!ELEMENTS.includes(element as Element))throw new Error('人工五行含未登记的五行。');
  result.push(element as Element);
 }
 return result;
}

export function readProjectNamingIntent(preferences:unknown):ProjectNamingIntent{
 try{
  // This is the only selection reader; it must run before looking at manual input.
  const selection=readNamingElementMethodSelection(preferences);
  const manualField=Object.getOwnPropertyDescriptor(preferences as object,'preferredElements');
  const manualElements=manualField?elementArray(manualField.value):[];
  if(!selection)return{status:'legacy',manualElements};
  if(manualElements.length)return{status:'conflict',selection,manualElements,message:MANUAL_CONFLICT};
  return{status:'project',selection,manualElements:[],choice:selection.entryPolicy};
 }catch(error){return{status:'invalid',message:message(error)};}
}

export function chooseProjectNamingMethod(preferences:unknown,choice:ProjectNamingChoice,clearManual=false):ProjectNamingChoiceResult{
 const intent=readProjectNamingIntent(preferences);
 if(intent.status==='invalid')return{status:'rejected',message:intent.message};
 if(!['legacy','month-branch-only','month-stem-proposal'].includes(choice)||typeof clearManual!=='boolean')return{status:'rejected',message:'请选择已登记的起名取法。'};
 if(choice!=='legacy'&&intent.manualElements.length&&!clearManual)return{status:'needs-manual-clear',choice,manualElements:[...intent.manualElements]};
 try{
  const next=copyData(preferences) as ProjectNamingPreferences;
  delete next.namingElementMethod;
  next.preferredElements=[...intent.manualElements];
  if(choice==='legacy')return{status:'accepted',preferences:next,clearManualDraft:false};
  next.preferredElements=[];
  next.namingElementMethod={methodId:PROJECT_NAMING_METHOD_ID,entryPolicy:choice};
  return{status:'accepted',preferences:next,clearManualDraft:true};
 }catch(error){return{status:'rejected',message:message(error)};}
}

export function guardProjectNamingManualUpdate(preferences:unknown):{allowed:true}|{allowed:false;message:string}{
 const intent=readProjectNamingIntent(preferences);
 if(intent.status==='legacy')return{allowed:true};
 return{allowed:false,message:intent.status==='invalid'||intent.status==='conflict'?intent.message:MANUAL_GUARD};
}

/** Full draft identity, shared by the controller and synchronous render-time guards. */
export function getProjectNamingContextKey(profile:BirthProfile|null,preferences:unknown):string{
 try{
  readNamingElementMethodSelection(preferences);
  return `project-naming-context/1:${signature({profile,preferences})}`;
 }catch(error){return `invalid-project-naming-context:${message(error)}`;}
}

export interface ProjectNamingGateState{
 readonly phase:'idle'|'loading'|'ready'|'error';
 readonly gate:RootFeedbackApplicationGate|null;
 readonly error:string;
 readonly notice:string;
 readonly contextKey:string;
}
export interface ProjectNamingGateApi{
 previewBaziRootFeedback(profile:BirthProfile,options?:RootFeedbackFacadeOptions):Promise<RootFeedbackFacadeDTO>;
}
export interface ProjectNamingGateController{
 setContext(profile:BirthProfile|null,preferences:unknown):void;
 run():Promise<void>;
 getSnapshot():ProjectNamingGateState;
 subscribe(listener:()=>void):()=>void;
 activate():void;
 dispose():void;
}
export interface ProjectNamingGateControllerOptions{isDisabled?:()=>boolean;}

function sameBirth(recorded:Record<string,unknown>,profile:BirthProfile,certificate=false):boolean{
 return recorded.calendar===profile.calendar&&recorded.birthDate===profile.birthDate
  &&recorded.birthTime===profile.birthTime&&recorded.timeUnknown===profile.timeUnknown
  &&recorded.leapMonth===profile.leapMonth&&recorded.timezone===profile.timezone
  &&recorded.timeBasis===(certificate?profile.timeBasis??'civil':profile.timeBasis)
  &&recorded.birthLongitude===(certificate?profile.birthLongitude??null:profile.birthLongitude);
}
function assertEffectiveElements(value:unknown):void{
 if(!record(value))throw new Error('项目取法返回的采用五行格式无效。');
 for(const role of ['primary','secondary','avoid','applied'])elementArray(value[role]);
}
/** Correlation checks only; the generation service still authenticates/replays its certificate. */
function gateFromResponse(value:RootFeedbackFacadeDTO,profile:BirthProfile,selection:NamingElementMethodSelection):RootFeedbackApplicationGate{
 const dto:unknown=copyData(value);
 if(!record(dto)||dto.schema!==ROOT_FEEDBACK_FACADE_VERSION||dto.methodId!==selection.methodId
  ||dto.profileId!==profile.id||dto.entryPolicy!==selection.entryPolicy)throw new Error('项目取法预览的版本、资料标识或入口与本次请求不一致。');
 if(!record(dto.recordedBirth)||!sameBirth(dto.recordedBirth,profile))throw new Error('项目取法预览的出生记录与本次请求不一致。');
 const gate=dto.applicationGate;
 if(!record(gate)||!Array.isArray(gate.reasons))throw new Error('项目取法未返回有效采用门。');
 if(gate.status==='blocked'){
  for(const reason of gate.reasons)if(!record(reason)||typeof reason.code!=='string'||typeof reason.message!=='string'||!reason.message.trim())throw new Error('项目取法阻断理由格式无效。');
 }else if(gate.status==='applicable'){
  const certificate=gate.certificate;
  if(gate.reasons.length||typeof gate.caseId!=='string'||!gate.caseId||typeof gate.regimeId!=='string'||!gate.regimeId
   ||!record(certificate)||certificate.schema!==ROOT_FEEDBACK_APPLICATION_SCHEMA
   ||certificate.applicationPolicyVersion!==ROOT_FEEDBACK_APPLICATION_POLICY
   ||certificate.profileId!==profile.id||certificate.methodId!==selection.methodId
   ||certificate.entryPolicy!==selection.entryPolicy||!record(certificate.birthFacts)
   ||!sameBirth(certificate.birthFacts,profile,true)||profile.timeUnknown!==false)throw new Error('项目取法采用证书与本次资料、入口或出生记录不一致。');
  assertEffectiveElements(gate.effectiveElements);
  assertEffectiveElements(certificate.effectiveElements);
  if(signature(gate.effectiveElements)!==signature(certificate.effectiveElements))throw new Error('项目取法采用门与证书的五行记录不一致。');
 }else throw new Error('项目取法采用门状态无效。');
 return freezeData(gate as unknown as RootFeedbackApplicationGate);
}

export function createProjectNamingGateController(api:ProjectNamingGateApi,options:ProjectNamingGateControllerOptions={}):ProjectNamingGateController{
 let profile:BirthProfile|null=null,intent:ProjectNamingIntent={status:'invalid',message:'请先提供起名偏好。'};
 let contextError='',serial=0,disposed=false;
 const listeners=new Set<()=>void>();
 let state:ProjectNamingGateState=Object.freeze({phase:'idle',gate:null,error:'',notice:'',contextKey:''});
 const publish=(next:ProjectNamingGateState)=>{state=Object.freeze(next);for(const listener of [...listeners])listener();};
 const invalidate=(notice:string)=>publish({...state,phase:'idle',gate:null,error:'',notice});
 const disabledNow=()=>{try{return !!options.isDisabled?.();}catch{return true;}};

 function setContext(nextProfile:BirthProfile|null,preferences:unknown):void{
  if(disposed)return;
  const nextIntent=readProjectNamingIntent(preferences),nextKey=getProjectNamingContextKey(nextProfile,preferences);
  let copied:BirthProfile|null=null,nextError='';
  try{copied=nextProfile===null?null:copyData(nextProfile);if(copied!==null&&!record(copied))throw new Error('出生资料须为普通数据对象。');signature(preferences);}catch(error){nextError=message(error);}
  if(nextKey===state.contextKey&&!nextError&&nextIntent.status!=='invalid')return;
  serial++;profile=copied;intent=nextIntent;contextError=nextError;
  publish({phase:'idle',gate:null,error:'',notice:nextError||(nextIntent.status==='invalid'||nextIntent.status==='conflict'?nextIntent.message:nextIntent.status==='project'?'资料或取法已更新，请明确运行项目采用检查。':''),contextKey:nextKey});
 }

 async function run():Promise<void>{
  if(disposed)return;
  const request=++serial;
  const initiallyDisabled=disabledNow();
  if(disposed||request!==serial)return;
  if(initiallyDisabled){invalidate('当前有其他操作进行中，请稍后运行项目采用检查。');return;}
  if(contextError||intent.status==='invalid'||intent.status==='conflict'){
   publish({...state,phase:'error',gate:null,error:contextError||(intent.status==='invalid'||intent.status==='conflict'?intent.message:''),notice:''});return;
  }
  if(intent.status==='legacy'){invalidate('当前沿用原有取法，无需项目采用检查。');return;}
  if(!profile){publish({...state,phase:'error',gate:null,error:'请先提供出生资料。',notice:''});return;}
  const expectedProfile=copyData(profile),selection=copyData(intent.selection),key=state.contextKey;
  const current=()=>!disposed&&request===serial&&key===state.contextKey;
  publish({...state,phase:'loading',gate:null,error:'',notice:'正在检查当前资料与项目取法的采用条件。'});
  // A subscriber can synchronously replace the draft or begin another request.
  if(!current())return;
  const disabledBeforeRequest=disabledNow();
  if(!current())return;
  if(disabledBeforeRequest){invalidate('当前操作已阻止项目采用检查，请稍后重新运行。');return;}
  try{
   const response=await api.previewBaziRootFeedback(copyData(expectedProfile),{fromOutputMonthStem:selection.entryPolicy==='month-stem-proposal'});
   if(!current())return;
   const disabledAfterRequest=disabledNow();
   if(!current())return;
   if(disabledAfterRequest){invalidate('当前操作已改变，请稍后重新运行项目采用检查。');return;}
   const gate=gateFromResponse(response,expectedProfile,selection);
   if(!current())return;
   publish({...state,phase:'ready',gate,error:'',notice:gate.status==='blocked'?'当前项目取法尚未满足采用条件。':'项目采用检查已完成；生成时仍会重新核验。'});
  }catch(error){
   if(!current())return;
   const disabledAfterFailure=disabledNow();
   if(!current())return;
   if(disabledAfterFailure){invalidate('当前操作已改变，请稍后重新运行项目采用检查。');return;}
   publish({...state,phase:'error',gate:null,error:message(error),notice:''});
  }
 }

 return{
  setContext,run,getSnapshot:()=>state,
  subscribe:listener=>{listeners.add(listener);return()=>{listeners.delete(listener);};},
  activate:()=>{if(disposed){serial++;disposed=false;}},
  dispose:()=>{serial++;disposed=true;listeners.clear();state=Object.freeze({...state,phase:'idle',gate:null,error:'',notice:'项目采用检查已取消，请重新运行。'});},
 };
}

/** UI submission guard only. The backend performs the authoritative generation-time check. */
export function getProjectNamingGenerationPermission(preferences:unknown,state:ProjectNamingGateState,currentContextKey:string):{allowed:boolean;reasons:string[]}{
 const intent=readProjectNamingIntent(preferences);
 if(intent.status==='legacy')return{allowed:true,reasons:[]};
 if(intent.status==='invalid'||intent.status==='conflict')return{allowed:false,reasons:[intent.message]};
 if(state.contextKey!==currentContextKey)return{allowed:false,reasons:['出生资料或起名偏好已改变，请重新运行项目采用检查。']};
 if(state.phase==='loading')return{allowed:false,reasons:['项目采用检查尚在进行中。']};
 if(state.phase==='error')return{allowed:false,reasons:[state.error||'项目采用检查未完成，请重试。']};
 if(state.phase!=='ready'||!state.gate)return{allowed:false,reasons:['请先明确运行当前资料的项目采用检查。']};
 if(state.gate.status==='blocked')return{allowed:false,reasons:state.gate.reasons.length?state.gate.reasons.map(reason=>reason.message):['当前项目取法尚未满足采用条件。']};
 if(state.gate.status!=='applicable'||state.gate.certificate.methodId!==intent.selection.methodId||state.gate.certificate.entryPolicy!==intent.selection.entryPolicy)return{allowed:false,reasons:['项目采用门与当前取法不一致，请重新检查。']};
 return{allowed:true,reasons:[]};
}
