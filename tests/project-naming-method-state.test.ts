import {describe,expect,it,vi} from 'vitest';
import type {Analysis,BirthProfile,BirthTimeAnalysis,Element} from '../src/shared/types';
import {PROJECT_NAMING_METHOD_ID} from '../src/shared/project-naming-use';
import {ROOT_FEEDBACK_FACADE_VERSION,type RootFeedbackFacadeDTO} from '../src/shared/bazi-root-feedback-facade';
import {ROOT_FEEDBACK_APPLICATION_POLICY,ROOT_FEEDBACK_APPLICATION_SCHEMA,type RootFeedbackApplicationCertificate,type RootFeedbackApplicationGate} from '../src/shared/bazi-root-feedback-application';
import {
 chooseProjectNamingMethod,createProjectNamingGateController,getProjectNamingContextKey,
 getProjectNamingGenerationPermission,guardProjectNamingManualUpdate,readProjectNamingIntent,
 type ProjectNamingChoice,type ProjectNamingGateState,type ProjectNamingPreferences,
} from '../src/renderer/project-naming-method-state';

type Policy=Exclude<ProjectNamingChoice,'legacy'>;
function preferences(manual:Element[]=[],choice?:Policy):ProjectNamingPreferences{
 return{length:2,generationChar:'',requiredChars:'',forbiddenChars:'',elderTaboo:'',style:'清朗',meanings:'',industry:'',priority:'balanced',preferredElements:[...manual],zodiacRules:true,numerology:false,...(choice?{namingElementMethod:{methodId:PROJECT_NAMING_METHOD_ID,entryPolicy:choice}}:{})};
}
function profile(id='profile-a'):BirthProfile{
 return{id,customerName:'客户',surname:'张',surnamePinyin:'zhang',gender:'中性',calendar:'solar',birthDate:'2000-01-01',leapMonth:false,birthTime:'12:30',timeUnknown:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:'',fatherName:'张父',motherName:'李母',namingPreferences:preferences()};
}
const EFFECTIVE={primary:['水'] as Element[],secondary:['木'] as Element[],avoid:['土'] as Element[],applied:['水','木'] as Element[]};
function blocked():RootFeedbackApplicationGate{
 return{status:'blocked',reasons:[{code:'root-prerequisite-pending',message:'通根前提尚待核对。'},{code:'numeric-threshold-pending',message:'数值区间仍跨越判定阈值。'}],caseId:'case-test',regimeId:null};
}
function applicable(input=profile(),entryPolicy:Policy='month-branch-only'):RootFeedbackApplicationGate{
 // A transport-correlation double only. It makes no claim of engine/certificate authenticity.
 const certificate={schema:ROOT_FEEDBACK_APPLICATION_SCHEMA,methodId:PROJECT_NAMING_METHOD_ID,applicationPolicyVersion:ROOT_FEEDBACK_APPLICATION_POLICY,profileId:input.id,entryPolicy,birthFacts:{calendar:input.calendar,birthDate:input.birthDate,birthTime:input.birthTime,timeUnknown:input.timeUnknown,leapMonth:input.leapMonth,timezone:input.timezone,timeBasis:input.timeBasis??'civil',birthLongitude:input.birthLongitude??null},effectiveElements:structuredClone(EFFECTIVE)} as unknown as RootFeedbackApplicationCertificate;
 return{status:'applicable',reasons:[],caseId:'case-test',regimeId:'regime-test',effectiveElements:structuredClone(EFFECTIVE),certificate};
}
function dto(input=profile(),entryPolicy:Policy='month-branch-only',gate:RootFeedbackApplicationGate=blocked()):RootFeedbackFacadeDTO{
 return{schema:ROOT_FEEDBACK_FACADE_VERSION,methodId:PROJECT_NAMING_METHOD_ID,profileId:input.id,entryPolicy,recordedBirth:{calendar:input.calendar,birthDate:input.birthDate,birthTime:input.birthTime,timeUnknown:input.timeUnknown,leapMonth:input.leapMonth,timezone:input.timezone,...(input.timeBasis===undefined?{}:{timeBasis:input.timeBasis}),...(input.birthLongitude===undefined?{}:{birthLongitude:input.birthLongitude})},status:'no-consistent-regime',baseAnalysis:{} as Analysis,calendar:{engineVersion:'transport-test',timeBasis:{} as BirthTimeAnalysis,knownPillars:[],partitionPolicy:'transport-test-only',partitionComplete:false,warnings:[]},branches:[],applicationGate:gate,commonOpinion:{status:'all-calendar-branches',primary:['火'],favorable:['火']},conflicts:[],pending:[],limitations:[]};
}
function deferred<T>(){
 let resolve!:(value:T)=>void,reject!:(error:unknown)=>void;
 const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};
}
function change(value:object,key:string,next:unknown){(value as Record<string,unknown>)[key]=next;}
function ready(gate:RootFeedbackApplicationGate,key:string):ProjectNamingGateState{return{phase:'ready',gate,error:'',notice:'',contextKey:key};}

describe('explicit project naming preference intent',()=>{
 it('keeps a missing method legacy and returns detached manual arrays',()=>{
  const input=preferences(['水']);const result=readProjectNamingIntent(input);
  expect(result).toEqual({status:'legacy',manualElements:['水']});
  if(result.status==='legacy')result.manualElements.push('木');
  expect(input.preferredElements).toEqual(['水']);expect(Object.hasOwn(input,'namingElementMethod')).toBe(false);
 });
 it.each<Policy>(['month-branch-only','month-stem-proposal'])('recognizes only explicit %s project intent',choice=>{
  const input=preferences([],choice),result=readProjectNamingIntent(input);
  expect(result).toEqual({status:'project',selection:input.namingElementMethod,manualElements:[],choice});
  if(result.status==='project')expect(result.selection).not.toBe(input.namingElementMethod);
 });
 it.each([undefined,null,'legacy',{},[],{methodId:'unknown',entryPolicy:'month-branch-only'},{methodId:PROJECT_NAMING_METHOD_ID,entryPolicy:'unknown'},{methodId:PROJECT_NAMING_METHOD_ID,entryPolicy:'month-branch-only',extra:true}])('does not turn malformed explicit selection %j into legacy',selection=>{
  const input={...preferences(),namingElementMethod:selection};
  expect(readProjectNamingIntent(input).status).toBe('invalid');
  expect(chooseProjectNamingMethod(input,'legacy').status).toBe('rejected');
  expect(guardProjectNamingManualUpdate(input).allowed).toBe(false);
 });
 it('runs the official method validation before touching manual accessors',()=>{
  let invoked=0;
  const input={namingElementMethod:{methodId:'unknown',entryPolicy:'month-branch-only'}};
  Object.defineProperty(input,'preferredElements',{enumerable:true,get(){invoked++;return['水'];}});
  const result=readProjectNamingIntent(input);
  expect(result.status).toBe('invalid');if(result.status==='invalid')expect(result.message).toContain('未知项目命名方法');
  expect(getProjectNamingContextKey(profile(),input)).toContain('invalid-project-naming-context:');
  expect(invoked).toBe(0);
 });
 it('never invokes selection, manual-array, or nested context accessors',()=>{
  let invoked=0;const methodGetter={...preferences()};
  Object.defineProperty(methodGetter,'namingElementMethod',{enumerable:true,get(){invoked++;return preferences([],'month-branch-only').namingElementMethod;}});
  expect(readProjectNamingIntent(methodGetter).status).toBe('invalid');
  const array:Element[]=[];Object.defineProperty(array,'0',{enumerable:true,get(){invoked++;return'水';}});
  expect(readProjectNamingIntent({...preferences(),preferredElements:array}).status).toBe('invalid');
  const nested={...preferences(),extra:{}};Object.defineProperty(nested.extra,'value',{enumerable:true,get(){invoked++;return 1;}});
  expect(()=>getProjectNamingContextKey(profile(),nested)).not.toThrow();
  expect(getProjectNamingContextKey(profile(),nested)).toContain('invalid-project-naming-context:');
  expect(invoked).toBe(0);
 });
 it('rejects hidden/inherited method intent and malformed manual values',()=>{
  const hidden=preferences();Object.defineProperty(hidden,'namingElementMethod',{value:preferences([],'month-branch-only').namingElementMethod});
  expect(readProjectNamingIntent(hidden).status).toBe('invalid');
  expect(readProjectNamingIntent(Object.create({namingElementMethod:preferences([],'month-branch-only').namingElementMethod})).status).toBe('invalid');
  for(const manual of [undefined,null,'水',['风'],new Array(1)])expect(readProjectNamingIntent({...preferences(),preferredElements:manual}).status).toBe('invalid');
 });
 it('reports a project/manual conflict without deleting either input',()=>{
  const input=preferences(['水'],'month-branch-only'),before=structuredClone(input),result=readProjectNamingIntent(input);
  expect(result).toMatchObject({status:'conflict',selection:input.namingElementMethod,manualElements:['水']});
  expect(input).toEqual(before);expect(guardProjectNamingManualUpdate(input).allowed).toBe(false);
 });
 it('requires an explicit clear before switching manual elements to project, and clones accepted data',()=>{
  const input={...preferences(['水']),extra:{selected:['original']}},before=structuredClone(input);
  expect(chooseProjectNamingMethod(input,'month-stem-proposal')).toEqual({status:'needs-manual-clear',choice:'month-stem-proposal',manualElements:['水']});
  const result=chooseProjectNamingMethod(input,'month-stem-proposal',true);
  expect(result.status).toBe('accepted');
  if(result.status==='accepted'){
   expect(result.clearManualDraft).toBe(true);expect(result.preferences.preferredElements).toEqual([]);
   expect(result.preferences.namingElementMethod).toEqual({methodId:PROJECT_NAMING_METHOD_ID,entryPolicy:'month-stem-proposal'});
   result.preferences.preferredElements.push('火');
   (result.preferences as typeof input).extra.selected.push('copy');
  }
  expect(input).toEqual(before);
 });
 it('clears pending manual draft on every accepted project choice and removes the own method for legacy',()=>{
  const input=preferences([],'month-branch-only');
  const project=chooseProjectNamingMethod(input,'month-stem-proposal');
  expect(project).toMatchObject({status:'accepted',clearManualDraft:true});
  const legacy=chooseProjectNamingMethod(input,'legacy');
  expect(legacy.status).toBe('accepted');if(legacy.status==='accepted'){
   expect(legacy.clearManualDraft).toBe(false);expect(Object.hasOwn(legacy.preferences,'namingElementMethod')).toBe(false);
   expect(legacy.preferences.preferredElements).not.toBe(input.preferredElements);
  }
  expect(input.namingElementMethod?.entryPolicy).toBe('month-branch-only');
 });
 it('allows a conflict to be resolved explicitly back to manual without silently dropping manual elements',()=>{
  const input=preferences(['水'],'month-branch-only'),result=chooseProjectNamingMethod(input,'legacy');
  expect(result.status).toBe('accepted');if(result.status==='accepted')expect(result.preferences).toEqual(preferences(['水']));
  expect(guardProjectNamingManualUpdate(preferences(['水']))).toEqual({allowed:true});
  expect(guardProjectNamingManualUpdate(preferences([],'month-branch-only'))).toMatchObject({allowed:false});
 });
});

describe('full draft context and explicit project adoption checks',()=>{
 it('has a stable snapshot and makes no request from construction/context/activation or legacy intent',async()=>{
  const api={previewBaziRootFeedback:vi.fn(async()=>dto())},controller=createProjectNamingGateController(api);
  const first=controller.getSnapshot();expect(controller.getSnapshot()).toBe(first);
  controller.setContext(profile(),preferences());controller.activate();await controller.run();
  controller.setContext(null,preferences([],'month-branch-only'));await controller.run();
  expect(api.previewBaziRootFeedback).not.toHaveBeenCalled();expect(controller.getSnapshot()).toMatchObject({phase:'error',gate:null});
 });
 it.each<Policy>(['month-branch-only','month-stem-proposal'])('sends the exact explicit boolean for %s and stores blocked reasons',async choice=>{
  const input=profile(),pref=preferences([],choice),output=dto(input,choice);
  const api={previewBaziRootFeedback:vi.fn(async()=>output)},controller=createProjectNamingGateController(api);
  controller.setContext(input,pref);expect(api.previewBaziRootFeedback).not.toHaveBeenCalled();await controller.run();
  expect(api.previewBaziRootFeedback.mock.calls[0]).toEqual([input,{fromOutputMonthStem:choice==='month-stem-proposal'}]);
  expect(controller.getSnapshot()).toMatchObject({phase:'ready',gate:blocked()});
  expect(getProjectNamingGenerationPermission(pref,controller.getSnapshot(),getProjectNamingContextKey(input,pref))).toEqual({allowed:false,reasons:blocked().reasons.map(reason=>reason.message)});
 });
 it('uses applicationGate independently of top-level status or commonOpinion',async()=>{
  const input=profile(),pref=preferences([],'month-branch-only');
  const output=dto(input,'month-branch-only',applicable(input));
  expect(output.status).toBe('no-consistent-regime');expect(output.commonOpinion.favorable).toEqual(['火']);
  const controller=createProjectNamingGateController({previewBaziRootFeedback:async()=>output});
  controller.setContext(input,pref);await controller.run();
  expect(controller.getSnapshot().gate?.status).toBe('applicable');
  expect(getProjectNamingGenerationPermission(pref,controller.getSnapshot(),getProjectNamingContextKey(input,pref))).toEqual({allowed:true,reasons:[]});
  const blockedController=createProjectNamingGateController({previewBaziRootFeedback:async()=>dto()});
  blockedController.setContext(input,pref);await blockedController.run();expect(blockedController.getSnapshot().gate?.status).toBe('blocked');
 });
 it('copies complete profiles at setContext and request boundaries and detaches/freezes response data',async()=>{
  const input=profile(),pref=preferences([],'month-branch-only'),original=structuredClone(input),output=dto();
  const requests:BirthProfile[]=[];
  const controller=createProjectNamingGateController({previewBaziRootFeedback:async submitted=>{
   requests.push(structuredClone(submitted));submitted.birthDate='2099-01-01';submitted.namingPreferences!.preferredElements.push('火');return output;
  }});
  controller.setContext(input,pref);input.fatherName='较新的家人草稿';input.namingPreferences!.preferredElements.push('土');
  await controller.run();await controller.run();
  expect(requests).toEqual([original,original]);
  const state=controller.getSnapshot();expect(state.phase).toBe('ready');
  if(output.applicationGate.status==='blocked')output.applicationGate.reasons[0].message='服务返回对象被修改';
  expect(state.gate?.reasons[0]?.message).toBe('通根前提尚待核对。');
  expect(Object.isFrozen(state)).toBe(true);expect(Object.isFrozen(state.gate)).toBe(true);expect(Object.isFrozen(state.gate?.reasons)).toBe(true);
  expect(input.namingPreferences!.preferredElements).toEqual(['土']);
 });
 it('preserves equal reordered contexts but clears a gate on any profile/preference/entry/manual change',async()=>{
  const input=profile(),pref=preferences([],'month-branch-only'),api={previewBaziRootFeedback:vi.fn(async()=>dto())};
  const controller=createProjectNamingGateController(api);controller.setContext(input,pref);await controller.run();
  const readyState=controller.getSnapshot();
  const reorder=<T extends object>(value:T)=>Object.fromEntries(Object.entries(value).reverse()) as T;
  controller.setContext(reorder(input),reorder(pref));expect(controller.getSnapshot()).toBe(readyState);
  for(const [nextProfile,nextPref] of [[{...input,notes:'new'},pref],[{...input,fatherName:'new'},pref],[input,{...pref,style:'new'}],[input,preferences([],'month-stem-proposal')],[input,preferences(['水'],'month-branch-only')],[input,{...pref,extra:{values:['new']}}]] as const){
   controller.setContext(nextProfile,nextPref);expect(controller.getSnapshot()).toMatchObject({phase:'idle',gate:null});
   expect(controller.getSnapshot().contextKey).toBe(getProjectNamingContextKey(nextProfile,nextPref));
  }
  expect(api.previewBaziRootFeedback).toHaveBeenCalledTimes(1);
 });
 it('does not issue requests for invalid intent, conflicts, cycles or accessor-bearing drafts',async()=>{
  const api={previewBaziRootFeedback:vi.fn(async()=>dto())},controller=createProjectNamingGateController(api);
  const invalid:{[key:string]:unknown}={...preferences(),namingElementMethod:undefined};
  const cyclic:{[key:string]:unknown}={...preferences([],'month-branch-only')};cyclic.self=cyclic;
  let invoked=0;const getter={...preferences()};Object.defineProperty(getter,'preferredElements',{enumerable:true,get(){invoked++;return['水'];}});
  for(const pref of [invalid,preferences(['水'],'month-branch-only'),cyclic,getter]){
   expect(()=>controller.setContext(profile(),pref)).not.toThrow();await controller.run();expect(controller.getSnapshot()).toMatchObject({phase:'error',gate:null});
  }
  expect(invoked).toBe(0);expect(api.previewBaziRootFeedback).not.toHaveBeenCalled();
 });
 it.each([new Error('真实预览服务错误'),'真实字符串服务错误'])('keeps the current service error without retaining a gate',async error=>{
  const controller=createProjectNamingGateController({previewBaziRootFeedback:async()=>{throw error;}});
  controller.setContext(profile(),preferences([],'month-branch-only'));await controller.run();
  expect(controller.getSnapshot()).toMatchObject({phase:'error',gate:null,error:error instanceof Error?error.message:error});
 });
 it('does not reuse a completed A result or an in-flight A result after A→B→A',async()=>{
  const pending=deferred<RootFeedbackFacadeDTO>(),fresh=deferred<RootFeedbackFacadeDTO>();
  const api={previewBaziRootFeedback:vi.fn().mockResolvedValueOnce(dto()).mockImplementationOnce(()=>pending.promise).mockImplementationOnce(()=>fresh.promise)};
  const controller=createProjectNamingGateController(api),a=profile(),b=profile('profile-b'),pref=preferences([],'month-branch-only');
  controller.setContext(a,pref);await controller.run();expect(controller.getSnapshot().gate).not.toBeNull();
  controller.setContext(b,pref);controller.setContext(a,pref);expect(controller.getSnapshot()).toMatchObject({phase:'idle',gate:null});
  const oldRun=controller.run();controller.setContext(b,pref);controller.setContext(a,pref);const newRun=controller.run();
  fresh.resolve(dto(a,'month-branch-only',applicable(a)));await newRun;const accepted=controller.getSnapshot();
  pending.resolve(dto());await oldRun;expect(controller.getSnapshot()).toBe(accepted);expect(accepted.gate?.status).toBe('applicable');
 });
 it.each(['success','failure'] as const)('drops an older request late %s after a new explicit run',async outcome=>{
  const old=deferred<RootFeedbackFacadeDTO>(),fresh=deferred<RootFeedbackFacadeDTO>();
  const controller=createProjectNamingGateController({previewBaziRootFeedback:vi.fn().mockImplementationOnce(()=>old.promise).mockImplementationOnce(()=>fresh.promise)});
  controller.setContext(profile(),preferences([],'month-branch-only'));const oldRun=controller.run(),freshRun=controller.run();
  fresh.resolve(dto());await freshRun;const accepted=controller.getSnapshot();
  if(outcome==='success')old.resolve(dto(profile(),'month-branch-only',applicable()));else old.reject(new Error('较旧失败'));
  await oldRun;expect(controller.getSnapshot()).toBe(accepted);
 });
 it('prevents requests disabled before run and discards success/failure disabled while awaiting',async()=>{
  let disabled=true;const success=deferred<RootFeedbackFacadeDTO>(),failure=deferred<RootFeedbackFacadeDTO>();
  const api={previewBaziRootFeedback:vi.fn().mockImplementationOnce(()=>success.promise).mockImplementationOnce(()=>failure.promise)};
  const controller=createProjectNamingGateController(api,{isDisabled:()=>disabled});controller.setContext(profile(),preferences([],'month-branch-only'));
  await controller.run();expect(api.previewBaziRootFeedback).not.toHaveBeenCalled();
  disabled=false;const first=controller.run();disabled=true;success.resolve(dto());await first;expect(controller.getSnapshot()).toMatchObject({phase:'idle',gate:null});
  disabled=false;const second=controller.run();disabled=true;failure.reject(new Error('当前禁用期间失败'));await second;expect(controller.getSnapshot()).toMatchObject({phase:'idle',gate:null,error:''});
 });
 it('drops an in-flight request when a disabled reentrant run cancels it',async()=>{
  let disabled=false;const pending=deferred<RootFeedbackFacadeDTO>(),api={previewBaziRootFeedback:vi.fn(()=>pending.promise)};
  const controller=createProjectNamingGateController(api,{isDisabled:()=>disabled});controller.setContext(profile(),preferences([],'month-branch-only'));
  const old=controller.run();disabled=true;await controller.run();const cancelled=controller.getSnapshot();
  disabled=false;pending.resolve(dto());await old;expect(controller.getSnapshot()).toBe(cancelled);expect(cancelled.gate).toBeNull();
 });
 it('handles synchronous subscriber and disabled-check reentrancy without issuing an obsolete request',async()=>{
  const input=profile(),pref=preferences([],'month-branch-only'),api={previewBaziRootFeedback:vi.fn(async()=>dto())};
  const controller=createProjectNamingGateController(api);let replaced=false;
  controller.setContext(input,pref);controller.subscribe(()=>{if(!replaced&&controller.getSnapshot().phase==='loading'){replaced=true;controller.setContext({...input,notes:'reentrant'},pref);}});
  await controller.run();expect(api.previewBaziRootFeedback).not.toHaveBeenCalled();expect(controller.getSnapshot()).toMatchObject({phase:'idle',gate:null});
  let checked=false;const checkController=createProjectNamingGateController(api,{isDisabled:()=>{if(!checked){checked=true;checkController.setContext({...input,notes:'disable-reentrant'},pref);}return false;}});
  checkController.setContext(input,pref);await checkController.run();expect(api.previewBaziRootFeedback).not.toHaveBeenCalled();expect(checkController.getSnapshot()).toMatchObject({phase:'idle',gate:null});
 });
 it('rechecks reentrant context ownership after awaiting and after the disabled callback',async()=>{
  const input=profile(),pref=preferences([],'month-branch-only');let checks=0;
  const controller=createProjectNamingGateController({previewBaziRootFeedback:async()=>dto()},{isDisabled:()=>{checks++;if(checks===3)controller.setContext({...input,notes:'changed after await'},pref);return false;}});
  controller.setContext(input,pref);await controller.run();expect(controller.getSnapshot()).toMatchObject({phase:'idle',gate:null,error:''});
 });
 it('clears gates on disposal and never revives old requests after activation',async()=>{
  const pending=deferred<RootFeedbackFacadeDTO>(),api={previewBaziRootFeedback:vi.fn().mockImplementationOnce(()=>pending.promise).mockResolvedValueOnce(dto())};
  const controller=createProjectNamingGateController(api),listener=vi.fn();controller.subscribe(listener);
  controller.setContext(profile(),preferences([],'month-branch-only'));const oldRun=controller.run();controller.dispose();const calls=listener.mock.calls.length;
  await controller.run();expect(api.previewBaziRootFeedback).toHaveBeenCalledTimes(1);expect(controller.getSnapshot().gate).toBeNull();
  const freshListener=vi.fn(),unsubscribe=controller.subscribe(freshListener);controller.activate();await controller.run();const accepted=controller.getSnapshot();
  pending.resolve(dto());await oldRun;expect(controller.getSnapshot()).toBe(accepted);expect(listener).toHaveBeenCalledTimes(calls);expect(freshListener).toHaveBeenCalledTimes(2);
  unsubscribe();controller.setContext({...profile(),notes:'after unsubscribe'},preferences([],'month-branch-only'));expect(freshListener).toHaveBeenCalledTimes(2);
 });
});

const responseMismatches:Array<[string,(value:RootFeedbackFacadeDTO)=>void]>=[
 ['schema',value=>change(value,'schema','wrong')],['method',value=>change(value,'methodId','wrong')],
 ['profile',value=>change(value,'profileId','other')],['entry',value=>change(value,'entryPolicy','month-stem-proposal')],
 ...(['calendar','birthDate','birthTime','timeUnknown','leapMonth','timezone','timeBasis','birthLongitude'] as const).map(field=>[field,(value:RootFeedbackFacadeDTO)=>change(value.recordedBirth,field,field==='timeUnknown'||field==='leapMonth'?true:field==='birthLongitude'?121:'different')] as [string,(value:RootFeedbackFacadeDTO)=>void]),
];
describe('facade response and application certificate correlation',()=>{
 it.each(responseMismatches)('rejects a mismatched DTO %s without retaining a gate',async(_name,mutate)=>{
  const output=dto();mutate(output);const controller=createProjectNamingGateController({previewBaziRootFeedback:async()=>output});
  controller.setContext(profile(),preferences([],'month-branch-only'));await controller.run();expect(controller.getSnapshot()).toMatchObject({phase:'error',gate:null});
 });
 it.each(['schema','applicationPolicyVersion','methodId','profileId','entryPolicy','calendar','birthDate','birthTime','timeUnknown','leapMonth','timezone','timeBasis','birthLongitude','effectiveElements'])('rejects a mismatched applicable certificate %s',async field=>{
  const output=dto(profile(),'month-branch-only',applicable());
  if(output.applicationGate.status==='applicable'){
   const certificate=output.applicationGate.certificate;
   if(['calendar','birthDate','birthTime','timeUnknown','leapMonth','timezone','timeBasis','birthLongitude'].includes(field))change(certificate.birthFacts,field,field==='timeUnknown'||field==='leapMonth'?true:field==='birthLongitude'?121:'different');
   else change(certificate,field,field==='effectiveElements'?{...EFFECTIVE,applied:['火']}:'wrong');
  }
  const controller=createProjectNamingGateController({previewBaziRootFeedback:async()=>output});controller.setContext(profile(),preferences([],'month-branch-only'));await controller.run();
  expect(controller.getSnapshot()).toMatchObject({phase:'error',gate:null});
 });
 it('accepts correctly bound explicit solar time/longitude and the certificate defaults for absent options',async()=>{
  for(const input of [profile(),{...profile(),calendar:'lunar' as const,leapMonth:true,timeBasis:'apparent-solar' as const,birthLongitude:121.47}]){
   const controller=createProjectNamingGateController({previewBaziRootFeedback:async()=>dto(input,'month-stem-proposal',applicable(input,'month-stem-proposal'))});
   controller.setContext(input,preferences([],'month-stem-proposal'));await controller.run();expect(controller.getSnapshot().gate?.status).toBe('applicable');
  }
 });
 it('retains a blocked unknown-hour reason but rejects a falsely applicable unknown-hour record',async()=>{
  const input={...profile(),timeUnknown:true,birthTime:''},pref=preferences([],'month-branch-only');
  const controller=createProjectNamingGateController({previewBaziRootFeedback:async()=>dto(input)});controller.setContext(input,pref);await controller.run();expect(controller.getSnapshot().gate?.status).toBe('blocked');
  const wrong=createProjectNamingGateController({previewBaziRootFeedback:async()=>dto(input,'month-branch-only',applicable(input))});wrong.setContext(input,pref);await wrong.run();expect(wrong.getSnapshot()).toMatchObject({phase:'error',gate:null});
 });
 it('rejects malformed application gates and output accessors without executing getters',async()=>{
  let invoked=0;const accessor=dto();Object.defineProperty(accessor,'applicationGate',{enumerable:true,get(){invoked++;return blocked();}});
  const noGate=dto();change(noGate,'applicationGate',null);
  const badReason=dto();change(badReason.applicationGate,'reasons',[{code:'root-prerequisite-pending',message:''}]);
  const unknown=dto();change(unknown.applicationGate,'status','unknown');
  for(const output of [accessor,noGate,badReason,unknown]){
   const controller=createProjectNamingGateController({previewBaziRootFeedback:async()=>output});controller.setContext(profile(),preferences([],'month-branch-only'));await controller.run();expect(controller.getSnapshot()).toMatchObject({phase:'error',gate:null});
  }
  expect(invoked).toBe(0);
 });
});

describe('shared generation permission is a fail-closed UI guard',()=>{
 it('allows legacy without a gate, rejects malformed or conflicting project intent',()=>{
  const state:ProjectNamingGateState={phase:'idle',gate:null,error:'',notice:'',contextKey:''};
  expect(getProjectNamingGenerationPermission(preferences(['水']),state,'different')).toEqual({allowed:true,reasons:[]});
  for(const pref of [{...preferences(),namingElementMethod:undefined},preferences(['水'],'month-branch-only')])expect(getProjectNamingGenerationPermission(pref,state,'').allowed).toBe(false);
 });
 it('requires current ready applicable state and carries original blocked messages individually',()=>{
  const input=profile(),pref=preferences([],'month-branch-only'),key=getProjectNamingContextKey(input,pref),valid=ready(applicable(),key);
  expect(getProjectNamingGenerationPermission(pref,valid,key)).toEqual({allowed:true,reasons:[]});
  for(const state of [{...valid,phase:'idle' as const},{...valid,phase:'loading' as const},{...valid,phase:'error' as const,error:'真实服务错误'},{...valid,gate:null},{...valid,contextKey:'old'}])expect(getProjectNamingGenerationPermission(pref,state,key).allowed).toBe(false);
  expect(getProjectNamingGenerationPermission(pref,{...valid,phase:'error',error:'真实服务错误'},key).reasons).toEqual(['真实服务错误']);
  expect(getProjectNamingGenerationPermission(pref,ready(blocked(),key),key)).toEqual({allowed:false,reasons:['通根前提尚待核对。','数值区间仍跨越判定阈值。']});
  expect(getProjectNamingGenerationPermission(preferences([],'month-stem-proposal'),valid,key).allowed).toBe(false);
 });
});
