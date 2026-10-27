import {describe,it,expect,vi} from 'vitest';
import {CULTURAL_WORKFLOW_METHODS,type CulturalWorkflowAPI} from '../src/shared/cultural-workflow-api';
import {culturalAppContext as deriveContext,createCulturalAppContextClock,createCulturalAppHost,createCulturalWorkflowAppApi,type CulturalAppInput} from '../src/renderer/cultural-workflow-app';
import {catalogSession} from './fixtures/catalog-session';
const culturalAppContext=(current:CulturalAppInput,clock=createCulturalAppContextClock())=>deriveContext(current,clock);

function input():CulturalAppInput {
 const savedSession=catalogSession();savedSession.reviewToken='c497b341-2da6-4b50-8a13-0123456789ab';savedSession.reviewRevision=2;
 return {profile:savedSession.profile,preferences:savedSession.preferences,session:savedSession,savedSession,sessionCurrent:true,formDirty:false,reviewDirty:false,contextKey:'current-owner',selectedIds:savedSession.candidates.map(candidate=>candidate.id)};
}
function deferred<T>(){let resolve!:(value:T)=>void,reject!:(reason:Error)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function setup(){
 let busy=false,current=true,readonly=false,reason='',source:unknown;
 const setBusy=vi.fn((active:boolean)=>{busy=active;});
 const host=createCulturalAppHost({isBusy:()=>busy,setBusy});
 const api=Object.fromEntries(CULTURAL_WORKFLOW_METHODS.map(method=>[method,vi.fn(async()=>({method}))])) as unknown as CulturalWorkflowAPI;
 source=api;
 const facade=()=>createCulturalWorkflowAppApi({source:api,getSource:()=>source,isCurrent:()=>current,getBlockReason:()=>reason,isReadOnly:()=>readonly,host})!;
 return {api,facade,host,setBusy,busy:()=>busy,setRootBusy:(value:boolean)=>{busy=value;},retire:()=>{current=false;},readOnly:()=>{readonly=true;},block:(value:string)=>{reason=value;},replace:()=>{source={};}};
}

describe('M921 App saved references',()=>{
 it('uses a bounded UI context for large raw drafts while preserving exact saved refs',()=>{
  const current=input(),clock=createCulturalAppContextClock(),long={...current,contextKey:JSON.stringify({notes:'长备注'.repeat(5000),revision:42})};
  const result=culturalAppContext(long,clock).context!,changed=culturalAppContext({...long,contextKey:long.contextKey+'changed'},clock).context!;
  expect(result.contextKey.length).toBeLessThan(1000);expect(result.contextKey).not.toBe(changed.contextKey);
  expect(result.anchorRequest).toEqual({kind:'session',sessionId:current.session!.id,expectedReviewToken:current.session!.reviewToken});
  expect(result.candidates).toEqual(current.selectedIds.map(candidateId=>({kind:'saved',candidateId})));
 });
 it('keeps repeated StrictMode signatures stable and separates three A-B-A generations',()=>{
  const clock=createCulturalAppContextClock(),a=input(),b={...a,selectedIds:[...a.selectedIds].reverse()};
  const first=culturalAppContext(a,clock),repeated=culturalAppContext(a,clock),second=culturalAppContext(b,clock),third=culturalAppContext(a,clock);
  expect(first.signature).toBe(repeated.signature);expect(first.context!.contextKey).toBe(repeated.context!.contextKey);
  expect(first.signature).toBe(third.signature);expect(new Set([first.context!.contextKey,second.context!.contextKey,third.context!.contextKey]).size).toBe(3);
  expect(clock.isCurrent(first.signature,first.context!.contextKey)).toBe(false);expect(clock.isCurrent(third.signature,third.context!.contextKey)).toBe(true);
  expect(third.context!.contextKey).toBe(culturalAppContext(a,clock).context!.contextKey);
 });
 it('retires the UI generation across an invalid one-candidate gap',()=>{
  const clock=createCulturalAppContextClock(),a=input(),first=culturalAppContext(a,clock).context!;
  expect(culturalAppContext({...a,selectedIds:a.selectedIds.slice(0,1)},clock).context).toBeUndefined();
  expect(culturalAppContext(a,clock).context!.contextKey).not.toBe(first.contextKey);
 });
 it('binds only exact current canonical session token and saved candidate references',()=>{
  const current=input(),result=culturalAppContext(current);
  expect(result.context?.anchorRequest).toEqual({kind:'session',sessionId:current.session!.id,expectedReviewToken:current.session!.reviewToken});
  expect(result.context?.candidates).toEqual(current.selectedIds.map(candidateId=>({kind:'saved',candidateId})));
  expect(Object.keys(result.context!.anchorRequest)).toEqual(['kind','sessionId','expectedReviewToken']);
 });
 it.each(['sessionCurrent','formDirty','reviewDirty','token','owner','selection','canonical'] as const)('blocks %s instead of falling back to an old profile anchor',field=>{
  const current=input();
  if(field==='sessionCurrent')current.sessionCurrent=false;
  if(field==='formDirty')current.formDirty=true;
  if(field==='reviewDirty')current.reviewDirty=true;
  if(field==='token')current.session!.reviewToken=undefined;
  if(field==='owner')current.profile={...current.profile,id:'other-baby'};
  if(field==='selection')current.selectedIds=['fabricated-id',current.selectedIds[0]];
  if(field==='canonical')current.savedSession=undefined;
  const result=culturalAppContext(current);expect(result.context).toBeUndefined();expect(result.reason).not.toBe('');
 });
 it('requires 2–4 unique selected refs and independently binds selection order',()=>{
  const current=input();expect(culturalAppContext({...current,selectedIds:[]}).context).toBeUndefined();
  expect(culturalAppContext({...current,selectedIds:[current.selectedIds[0],current.selectedIds[0]]}).context).toBeUndefined();
  expect(culturalAppContext(current).context?.contextKey).not.toBe(culturalAppContext({...current,selectedIds:[...current.selectedIds].reverse()}).context?.contextKey);
 });
});

describe('M921 App API facade and synchronous root write lease',()=>{
 it('discovers a missing bridge without issuing any calls or fabricated capabilities',()=>{
  const state=setup();expect(vi.mocked(state.api.getCulturalStorageCapabilities)).not.toHaveBeenCalled();
  expect(createCulturalWorkflowAppApi({source:{},getSource:()=>({}),isCurrent:()=>true,getBlockReason:()=>'',isReadOnly:()=>false,host:state.host})).toBeUndefined();
 });
 it('retains original API owner, args and exact returned response',async()=>{
  const state=setup(),marker={version:'customer-compact/3'},request={kind:'session' as const,sessionId:'s',expectedReviewToken:'token'};
  state.api.prepareCulturalBirthAnchor=vi.fn(function(this:unknown,...args:unknown[]){expect(this).toBe(state.api);expect(args).toEqual([request]);return Promise.resolve(marker as never);});
  expect(await state.facade().prepareCulturalBirthAnchor(request)).toBe(marker);
 });
 it.each(['root-busy','retired','dirty','read-only','replaced','method-replaced'] as const)('captured facade refuses %s before any write dispatch',async mode=>{
  const state=setup(),api=state.facade(),original=state.api.commitCulturalWrite;
  if(mode==='root-busy')state.setRootBusy(true);
  if(mode==='retired')state.retire();
  if(mode==='dirty')state.block('输入已改变');
  if(mode==='read-only')state.readOnly();
  if(mode==='replaced')state.replace();
  if(mode==='method-replaced')state.api.commitCulturalWrite=vi.fn();
  await expect(api.commitCulturalWrite({} as never)).rejects.toThrow();expect(original).not.toHaveBeenCalled();expect(state.setBusy).not.toHaveBeenCalled();
 });
 it('allows reads in read-only state and rejects each write including migration',async()=>{
  const state=setup();state.readOnly();const api=state.facade();await api.getCulturalStorageCapabilities();
  for(const method of ['prepareCulturalWrite','commitCulturalWrite','restoreCulturalRevision','migrateCulturalStorage'] as const)await expect((api[method] as (...values:unknown[])=>Promise<unknown>)()).rejects.toThrow('只读');
  expect(state.api.getCulturalStorageCapabilities).toHaveBeenCalledTimes(1);expect(state.api.migrateCulturalStorage).not.toHaveBeenCalled();
 });
 it('serializes two writers synchronously and holds the lock through retired-owner settlement',async()=>{
  const state=setup(),pending=deferred<never>();state.api.commitCulturalWrite=vi.fn(()=>pending.promise);const first=state.facade(),second=state.facade();
  const outstanding=first.commitCulturalWrite({} as never);const rejected=expect(outstanding).rejects.toThrow('已变化');
  expect(state.busy()).toBe(true);await expect(second.migrateCulturalStorage()).rejects.toThrow('工作台');expect(state.api.migrateCulturalStorage).not.toHaveBeenCalled();
  state.retire();expect(state.busy()).toBe(true);pending.resolve({status:'conflict',reason:'source-changed'} as never);await rejected;expect(state.busy()).toBe(false);
 });
 it('keeps a cancelled/unmounted rejected request locked until its underlying rejection settles',async()=>{
  const state=setup(),pending=deferred<never>();state.api.restoreCulturalRevision=vi.fn(()=>pending.promise);const api=state.facade(),outstanding=api.restoreCulturalRevision('id',1,2,'token','key');const rejected=expect(outstanding).rejects.toThrow('write failed');
  state.retire();expect(state.busy()).toBe(true);pending.reject(Error('write failed'));await rejected;expect(state.busy()).toBe(false);
 });
 it('never lets an old lease finally clear a newer root write token',()=>{
  const state=setup(),oldRelease=state.host.acquireWrite('old');state.setRootBusy(false);const currentRelease=state.host.acquireWrite('new');
  oldRelease();expect(state.busy()).toBe(true);currentRelease();expect(state.busy()).toBe(false);oldRelease();expect(state.setBusy).toHaveBeenCalledTimes(3);
 });
 it('passes a storage conflict through unchanged without refreshing CAS or claiming success',async()=>{
  const state=setup(),conflict={status:'conflict' as const,reason:'revision-conflict' as const};vi.mocked(state.api.commitCulturalWrite).mockResolvedValue(conflict);
  expect(await state.facade().commitCulturalWrite({} as never)).toBe(conflict);expect(state.busy()).toBe(false);expect(state.api.readCulturalComparison).not.toHaveBeenCalled();
 });
});
