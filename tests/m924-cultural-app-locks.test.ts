import {describe,it,expect,vi} from 'vitest';
import {CULTURAL_WORKFLOW_METHODS,type CulturalWorkflowAPI} from '../src/shared/cultural-workflow-api';
import {createCulturalAppHost,createCulturalWorkflowAppApi,createReviewedGenerationAppApi,REVIEWED_GENERATION_WRITE_LABEL} from '../src/renderer/cultural-workflow-app';
import type {ReviewedNamingDataApi} from '../src/shared/reviewed-naming-data';

function deferred<T>(){let resolve!:(value:T)=>void,reject!:(reason:Error)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function setup(){
 let busy=false,current=true,readOnly=false;
 const changes:unknown[][]=[];
 const host=createCulturalAppHost({isBusy:()=>busy,setBusy:(active,label)=>{busy=active;changes.push([active,label]);}});
 const source=Object.fromEntries(CULTURAL_WORKFLOW_METHODS.map(method=>[method,vi.fn(async()=>({method}))])) as unknown as CulturalWorkflowAPI&ReviewedNamingDataApi;
 source.generateReviewed=vi.fn(async()=>({session:{id:'display-result'},messages:[]} as never));let actual:unknown=source;
 const cultural=()=>createCulturalWorkflowAppApi({source,getSource:()=>actual,isCurrent:()=>current,getBlockReason:()=>'',isReadOnly:()=>readOnly,host})!;
 const reviewed=()=>createReviewedGenerationAppApi({source,getSource:()=>actual,isCurrent:()=>current,isReadOnly:()=>readOnly,host})!;
 return {source,host,cultural,reviewed,changes,retire:()=>{current=false;},replace:()=>{actual={};},readonly:()=>{readOnly=true;},busy:()=>busy};
}
describe('M924 shared root write lease',()=>{
 it.each(['commitCulturalWrite','migrateCulturalStorage','restoreCulturalRevision'] as const)('reviewed pending synchronously excludes %s and releases only on settlement',async method=>{
  const state=setup(),pending=deferred<never>();state.source.generateReviewed=vi.fn(()=>pending.promise);const request=state.reviewed().generateReviewed({} as never,{} as never,{} as never);const result=expect(request).rejects.toThrow('pending rejected');
  expect(state.busy()).toBe(true);expect(state.host.isWriting(REVIEWED_GENERATION_WRITE_LABEL)).toBe(true);
  await expect((state.cultural()[method] as (...args:unknown[])=>Promise<unknown>)()).rejects.toThrow('工作台');expect(state.source[method]).not.toHaveBeenCalled();
  pending.reject(Error('pending rejected'));await result;expect(state.busy()).toBe(false);expect(state.host.isWriting(REVIEWED_GENERATION_WRITE_LABEL)).toBe(false);
 });
 it('returns the untouched real reviewed reply and exact arguments to the existing validator',async()=>{
  const state=setup(),response={session:{id:'original'},messages:['original']},args=[{id:'profile'},{length:2},{method:'reviewed-naming-data/1.0.0'}] as unknown as Parameters<ReviewedNamingDataApi['generateReviewed']>;
  state.source.generateReviewed=vi.fn(function(this:unknown,...actual:unknown[]){expect(this).toBe(state.source);expect(actual).toEqual(args);return Promise.resolve(response as never);});
  expect(await state.reviewed().generateReviewed(...args)).toBe(response);expect(state.changes).toEqual([[true,REVIEWED_GENERATION_WRITE_LABEL],[false,'']]);
 });
 it('retiring a child leaves the underlying reviewed lease held until its promise settles',async()=>{
  const state=setup(),pending=deferred<never>();state.source.generateReviewed=vi.fn(()=>pending.promise);const request=state.reviewed().generateReviewed({} as never,{} as never,{} as never);const rejected=expect(request).rejects.toThrow('已变化');state.retire();
  expect(state.busy()).toBe(true);expect(()=>state.host.acquireWrite('legacy generation')).toThrow('工作台');pending.resolve({} as never);await rejected;expect(state.busy()).toBe(false);
 });
 it('an old finally never clears a newer lease and duplicate releases are inert',()=>{
  let busy=false;const host=createCulturalAppHost({isBusy:()=>busy,setBusy:active=>{busy=active;}}),first=host.acquireWrite('reviewed');busy=false;const second=host.acquireWrite('cultural');first();expect(busy).toBe(true);expect(host.isWriting('cultural')).toBe(true);second();first();expect(busy).toBe(false);
 });
 it('getter-shaped reviewed bridges are never called or treated as source authority',()=>{const state=setup(),getter=vi.fn();Object.defineProperty(state.source,'generateReviewed',{get:getter,configurable:true});expect(state.reviewed()).toBeUndefined();expect(getter).not.toHaveBeenCalled();expect(state.busy()).toBe(false);});
});
describe('M924 mutable cultural bridge identity',()=>{
 for(const method of ['previewCulturalComparison','readCulturalComparison'] as const){
  for(const replacement of ['function','getter','source','other-method'] as const){
   it(`${method} rejects a pending ${replacement} replacement before delivering old data`,async()=>{
    const state=setup(),pending=deferred<never>(),getter=vi.fn();state.source[method]=vi.fn(()=>pending.promise) as never;const facade=state.cultural(),request=(facade[method] as (...args:unknown[])=>Promise<unknown>)('original');const rejected=expect(request).rejects.toThrow(/变化/);
    if(replacement==='function')state.source[method]=vi.fn(async()=>({})) as never;
    if(replacement==='getter')Object.defineProperty(state.source,method,{get:getter,configurable:true});
    if(replacement==='source')state.replace();
    if(replacement==='other-method')state.source.listCulturalRevisions=vi.fn(async()=>[]);
    pending.resolve({old:'must not deliver'} as never);await rejected;expect(getter).not.toHaveBeenCalled();
   });
  }
 }
 it('does not dispatch a captured facade when the current own method became a getter',async()=>{
  const state=setup(),facade=state.cultural(),original=state.source.commitCulturalWrite,getter=vi.fn();Object.defineProperty(state.source,'previewCulturalComparison',{get:getter,configurable:true});await expect(facade.commitCulturalWrite({} as never)).rejects.toThrow('连接');expect(original).not.toHaveBeenCalled();expect(getter).not.toHaveBeenCalled();
 });
 it('releases an unsettled cultural write lease even when the method reply is retired',async()=>{
  const state=setup(),pending=deferred<never>();state.source.commitCulturalWrite=vi.fn(()=>pending.promise);const request=state.cultural().commitCulturalWrite({} as never);const rejected=expect(request).rejects.toThrow('连接');expect(state.busy()).toBe(true);state.source.commitCulturalWrite=vi.fn();pending.resolve({} as never);await rejected;expect(state.busy()).toBe(false);
 });
});
