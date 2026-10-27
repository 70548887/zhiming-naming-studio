import React,{act,StrictMode,useLayoutEffect} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {useCandidate2Generation,type UseCandidate2GenerationOptions} from '../../src/renderer/use-candidate2-generation';
import {createCulturalAppHost} from '../../src/renderer/cultural-workflow-app';
import {CANDIDATE2_NAMING_SELECTION} from '../../src/shared/candidate2-naming-consumer-v1';
import type {Candidate2GenerateSavedResult,Candidate2GenerationAPI} from '../../src/shared/candidate2-generation-api';
import type {Candidate2GenerationUiState} from '../../src/renderer/candidate2-generation-ui';
import type {Candidate2GenerationContext} from '../../src/renderer/candidate2-generation-input';
import {candidate2GenerationFixture} from './m936-candidate2-generation';

/** Real hook/controller lifecycle with an explicitly synthetic transport.
 * The test-only Probe is not the product Panel or App, and these results do
 * not establish a live route, source authentication or native Store save. */
type Deferred<T>={promise:Promise<T>;resolve:(value:T)=>void;reject:(error:Error)=>void};
type Case={id:string;status:'passed'|'failed';assertions:number;error?:string;html:string;observations:unknown[]};
type Result={scope:string;runtime:{userAgent:string;strictMode:boolean};cases:Case[];errors:string[];unhandled:string[];fatal?:string};
declare const __M936_HOOK_CASES__:readonly string[];
declare global {interface Window {__M936_HOOK_RESULT__?:Result;}}
const clone=<T,>(value:T):T=>structuredClone(value);
const deferred=<T,>():Deferred<T>=>{let resolve!:(value:T)=>void,reject!:(error:Error)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const container=document.getElementById('root')!;
const errors:string[]=[],unhandled:string[]=[],cases:Case[]=[];
window.addEventListener('error',event=>errors.push(event.message));
window.addEventListener('unhandledrejection',event=>unhandled.push(String(event.reason)));
let assertions=0,observations:unknown[]=[];
const check=(condition:unknown,message:string)=>{assertions++;if(!condition)throw Error(message);};
const equal=(actual:unknown,expected:unknown,message:string)=>check(JSON.stringify(actual)===JSON.stringify(expected),message+'\nactual='+JSON.stringify(actual)+'\nexpected='+JSON.stringify(expected));
const tick=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
async function settle(){await act(async()=>{await tick();await tick();});}
async function wait(ready:()=>boolean,message:string){const started=performance.now();while(!ready()){if(performance.now()-started>3500)throw Error(message+'\nDOM='+container.textContent);await settle();}await settle();}

function Probe(options:UseCandidate2GenerationOptions){
 const {state,onEnabledChange,onGenerate,onCancel,onRetryDelivery}=useCandidate2Generation(options);
 return <section data-m936-hook-probe data-phase={state.phase} data-enabled={String(state.enabled)} data-request-pending={String(state.requestPending)}>
  <p>Test-only hook/controller probe; synthetic API response, not product App/Panel or Store acceptance.</p>
  <label><input type="checkbox" data-probe-enable checked={state.enabled} onChange={event=>onEnabledChange(event.currentTarget.checked)}/>Explicit candidate2 generation intent</label>
  <button type="button" data-probe-generate disabled={!state.canGenerate} onClick={onGenerate}>Generate exact-three request</button>
  <button type="button" data-probe-cancel disabled={!state.requestPending&&state.phase!=='delivering'} onClick={onCancel}>Stop waiting only</button>
  <button type="button" data-probe-retry-delivery disabled={state.phase!=='delivering'||state.requestPending||!state.error} onClick={onRetryDelivery}>Retry delivery only</button>
  <output data-probe-state>{JSON.stringify(state)}</output>
 </section>;
}
async function setup({source:initialSource,context:initialContext,onGenerated:initialDelivery}:{source?:unknown;context?:Candidate2GenerationContext;onGenerated?:UseCandidate2GenerationOptions['onGenerated']}={}){
 const fixture=candidate2GenerationFixture(),calls:unknown[][]=[],deliveries:Candidate2GenerateSavedResult[]=[],forbiddenCalls:string[]=[];
 const first=deferred<Candidate2GenerateSavedResult>();let next=()=>first.promise,busy=false,root:Root|undefined=createRoot(container),setups=0,cleanups=0;
 const host=createCulturalAppHost({isBusy:()=>busy,setBusy:(active,label)=>{busy=active;observations.push({hostBusy:active,label});}});
 const transport:Candidate2GenerationAPI&{generate:()=>never;checkCandidate2NamingEligibility:()=>never;saveSession:()=>never}={
  generateCandidate2(...args){check(this===transport,'Exact original API owner changed');calls.push(clone(args));return next();},
  generate(){forbiddenCalls.push('generate');throw Error('Ordinary generation fallback must not run');},
  checkCandidate2NamingEligibility(){forbiddenCalls.push('eligibility');throw Error('Eligibility is not a generation capability');},
  saveSession(){forbiddenCalls.push('saveSession');throw Error('Renderer must not mint a save');},
 };
 let liveSource:unknown=initialSource??transport;
 let options:UseCandidate2GenerationOptions={context:clone(initialContext??fixture.context),source:liveSource,getSource:()=>liveSource,host,isContextCurrent:()=>true,onGenerated:initialDelivery??((result,lease)=>{check(lease.isCurrent(),'Delivery lease was not current');deliveries.push(result);})};
 function StrictProbe(){useLayoutEffect(()=>{setups++;return()=>{cleanups++;};},[]);return null;}
 const render=async(patch:Partial<UseCandidate2GenerationOptions>={})=>{if(Object.hasOwn(patch,'source'))liveSource=patch.source;options={...options,...patch};await act(async()=>{root!.render(<StrictMode><StrictProbe/><Probe {...options}/></StrictMode>);});};
 const state=():Candidate2GenerationUiState=>JSON.parse(container.querySelector('[data-probe-state]')!.textContent!);
 const click=async(selector:string,{double=false}={})=>{const button=container.querySelector<HTMLElement>(selector);check(button,'Missing native probe control '+selector);await act(async()=>{button!.click();if(double)button!.click();});await settle();};
 const enable=()=>click('[data-probe-enable]'),generate=(double=false)=>click('[data-probe-generate]',{double}),cancel=()=>click('[data-probe-cancel]'),retryDelivery=()=>click('[data-probe-retry-delivery]');
 const unmount=async()=>{if(root){await act(async()=>{root!.unmount();});root=undefined;}await settle();};
 const remount=async()=>{check(!root,'Cannot remount a live root');root=createRoot(container);await render();};
 await render();
 return {fixture,transport,host,calls,deliveries,forbiddenCalls,first,state,render,replaceSourceWithoutRender:(source:unknown)=>{liveSource=source;},enable,generate,cancel,retryDelivery,unmount,remount,busy:()=>busy,context:()=>options.context,setNext:(work:()=>Promise<Candidate2GenerateSavedResult>)=>{next=work;},stats:()=>({setups,cleanups}),dispose:async()=>{await unmount();check(forbiddenCalls.length===0,'Unexpected ordinary/eligibility/save fallback');container.replaceChildren();}};
}
async function scenario(id:string,work:(make:typeof setup)=>Promise<void>){if(!__M936_HOOK_CASES__.includes(id))return;const beforeErrors=errors.length,beforeUnhandled=unhandled.length,owned:Awaited<ReturnType<typeof setup>>[]=[];assertions=0;observations=[];const make:typeof setup=async options=>{const value=await setup(options);owned.push(value);return value;};try{await work(make);check(errors.length===beforeErrors,'Window errors '+errors.slice(beforeErrors).join('\n'));check(unhandled.length===beforeUnhandled,'Unhandled rejections '+unhandled.slice(beforeUnhandled).join('\n'));cases.push({id,status:'passed',assertions,html:container.innerHTML,observations:clone(observations)});}catch(error){cases.push({id,status:'failed',assertions,error:error instanceof Error?error.stack:String(error),html:container.innerHTML,observations:clone(observations)});}finally{for(const value of owned)await value.dispose();}}

async function run(){
 await scenario('strict-default-enable-zero-calls-exact-three-and-frozen-delivery',async make=>{
  const a=await make();check(a.stats().setups===2&&a.stats().cleanups===1,'Development StrictMode setup-cleanup-setup did not occur');check(!a.state().enabled&&a.state().phase==='idle','Initial opt-in was not off');equal(a.calls,[],'Mount called generation');await a.enable();equal(a.calls,[],'Enable called generation');await a.generate(true);equal(a.calls.length,1,'Double native click dispatched duplicate generation');equal(a.calls[0],[a.fixture.profile.id,a.fixture.preferences,CANDIDATE2_NAMING_SELECTION],'Request was not exact-three original ID/raw prefs/fixed selection');check(a.busy()&&a.state().requestPending,'Physical request did not own root lease');await act(async()=>a.first.resolve(clone(a.fixture.result)));await wait(()=>a.state().phase==='ready','StrictMode result did not reach ready');equal(a.deliveries.length,1,'Valid correlated result did not deliver');const delivered=a.deliveries[0];check(Object.isFrozen(delivered)&&Object.isFrozen(delivered.session)&&Object.isFrozen(delivered.session.candidate2Naming)&&Object.isFrozen(delivered.session.candidates),'Saved result snapshot was not deeply frozen');equal(delivered,a.fixture.result,'Delivery recomputed or changed the real returned result');check(!a.busy()&&!a.state().requestPending,'Settled request left lease held');check(a.state().savedSummary?.traditionalStatus==='unknown','Ready promoted a traditional conclusion');
 });
 await scenario('api-error-explicit-generation-retry-has-no-ordinary-fallback',async make=>{
  const a=await make(),second=deferred<Candidate2GenerateSavedResult>();await a.enable();await a.generate();await act(async()=>a.first.reject(Error('explicit transport failure')));await wait(()=>a.state().phase==='error','Request failure not visible');check(a.state().canGenerate&&!a.busy(),'Request failure permanently locked the UI');a.setNext(()=>second.promise);await a.generate();equal(a.calls.length,2,'Explicit retry did not dispatch exactly once');await act(async()=>second.resolve(clone(a.fixture.result)));await wait(()=>a.state().phase==='ready','Explicit retry did not recover');equal(a.deliveries.length,1,'Rejected request produced a delivery');
 });
 await scenario('missing-and-getter-bridge-stay-unavailable-without-calls',async make=>{
  for(const mode of ['missing','getter'] as const){let getterCalls=0;const source:Record<string,unknown>={};if(mode==='getter')Object.defineProperty(source,'generateCandidate2',{enumerable:true,configurable:true,get(){getterCalls++;return()=>Promise.resolve({});}});const a=await make({source});await a.enable();check(a.state().phase==='unavailable'&&!a.state().canGenerate,'Missing own data-method was not unavailable');await a.generate();equal(a.calls.length,0,'Missing method became a synthetic request');equal(getterCalls,0,'Capability discovery executed a getter');await a.unmount();}
 });
 await scenario('unsaved-dirty-readonly-or-noncanonical-input-cannot-dispatch',async make=>{
  for(const mode of ['unsaved','dirty','readonly','noncanonical'] as const){const fixture=candidate2GenerationFixture(),context=clone(fixture.context);if(mode==='unsaved'){context.savedProfile=null;context.savedPreferences=null;}if(mode==='dirty')context.dirty=true;if(mode==='readonly')context.storageReadOnly=true;if(mode==='noncanonical')context.profile.notes+='edited after save';const a=await make({context});await a.enable();check(a.state().phase==='blocked'&&!a.state().canGenerate,'Invalid canonical input was not blocked: '+mode);await a.generate();equal(a.calls.length,0,'Blocked input dispatched: '+mode);check(!a.busy(),'Blocked input acquired root lease');await a.unmount();}
 });
 await scenario('physical-request-cancel-keeps-root-lease-until-settlement',async make=>{
  const a=await make();await a.enable();await a.generate();await a.cancel();check(!a.state().enabled&&a.state().requestPending,'Cancel pretended backend request ended');check(a.busy(),'Cancel prematurely released root lease');let secondWriter=false;try{a.host.acquireWrite('another writer');secondWriter=true;}catch{}check(!secondWriter,'Second writer acquired cancelled-but-unsettled lease');await act(async()=>a.first.resolve(clone(a.fixture.result)));await wait(()=>!a.busy()&&!a.state().requestPending,'Physical settlement did not release lease');equal(a.deliveries.length,0,'Cancelled response was adopted');check(a.state().phase==='idle','Cancelled reply revived ready');
 });
 await scenario('unmount-pending-rejection-keeps-lease-and-remount-starts-off',async make=>{
  const a=await make();await a.enable();await a.generate();await a.unmount();check(a.busy(),'Unmount released physical request lease');await act(async()=>a.first.reject(Error('unmounted physical rejection')));await wait(()=>!a.busy(),'Rejected physical request did not settle after unmount');equal(a.deliveries.length,0,'Unmounted rejection delivered');a.setNext(async()=>clone(a.fixture.result));await a.remount();check(!a.state().enabled&&a.state().phase==='idle','Remount inherited old intent/result');await a.enable();await a.generate();await wait(()=>a.state().phase==='ready','Fresh remount request did not deliver');equal(a.calls.length,2,'Remount reused old request instead of generating explicitly');
 });
 for(const mode of ['owner','draft','database','A-B-A'] as const){
  await scenario(`pending-${mode}-change-retires-old-success`,async make=>{
   const a=await make(),original=clone(a.context()),changed=clone(original);await a.enable();await a.generate();changed.contextKey+='-new-generation';if(mode==='owner'){changed.profile.id='other-owner';if(changed.savedProfile)changed.savedProfile.id='other-owner';}if(mode==='draft')changed.profile.notes+='new draft';if(mode==='database')changed.contextKey+='-database-reopened';if(mode==='A-B-A')changed.profile.notes+='temporary B';await a.render({context:changed});if(mode==='A-B-A')await a.render({context:original});check(!a.state().enabled,'Input generation change retained opt-in');await act(async()=>a.first.resolve(clone(a.fixture.result)));await wait(()=>!a.busy()&&!a.state().requestPending,'Retired request did not settle');equal(a.deliveries.length,0,'Old request crossed generation: '+mode);check(!a.state().savedSummary,'Old summary crossed generation: '+mode);
  });
 }
 for(const mode of ['method','getter','source'] as const){
  await scenario(`pending-${mode}-replacement-rejects-old-reply`,async make=>{
   const a=await make();await a.enable();await a.generate();let getterCalls=0;if(mode==='method')a.transport.generateCandidate2=async()=>clone(a.fixture.result);if(mode==='getter')Object.defineProperty(a.transport,'generateCandidate2',{enumerable:true,configurable:true,get(){getterCalls++;return()=>Promise.resolve(a.fixture.result);}});if(mode==='source')a.replaceSourceWithoutRender({generateCandidate2:async()=>clone(a.fixture.result)});await act(async()=>a.first.resolve(clone(a.fixture.result)));await wait(()=>!a.busy()&&!a.state().requestPending,'Rebound request did not physically settle');equal(a.deliveries.length,0,'Rebound bridge delivered its old result');equal(getterCalls,0,'Post-await guard invoked a getter');check(!a.state().savedSummary,'Rebound bridge kept an old ready summary');
  });
 }
 await scenario('handoff-error-retries-same-frozen-result-without-second-generation',async make=>{
  const received:Candidate2GenerateSavedResult[]=[];let attempts=0;const a=await make({onGenerated:async(result,lease)=>{check(lease.isCurrent(),'Handoff lease invalid');received.push(result);if(++attempts===1)throw Error('controlled handoff failure');}});await a.enable();await a.generate();await act(async()=>a.first.resolve(clone(a.fixture.result)));await wait(()=>a.state().phase==='delivering'&&!!a.state().error,'Handoff error did not expose a separate delivery retry');check(!a.state().requestPending&&!a.state().canGenerate&&!a.busy(),'Handoff error confused delivery with an unsettled generate request');await a.retryDelivery();await wait(()=>a.state().phase==='ready','Delivery-only retry failed');equal(a.calls.length,1,'Retry delivery generated again');equal(received.length,2,'Retry delivery did not retry handoff');check(received[0]===received[1]&&Object.isFrozen(received[1].session),'Retry did not preserve the same frozen response');
 });
 await scenario('handoff-promise-pending-cancel-holds-lease-until-actual-delivery-settles',async make=>{
  const handoff=deferred<void>();let deliveries=0,lateLease:undefined|{isCurrent:()=>boolean};
  const a=await make({onGenerated:async(result,lease)=>{deliveries++;lateLease=lease;check(Object.isFrozen(result.session),'Handoff did not receive a frozen saved snapshot');check(lease.isCurrent(),'Pending handoff lease was already invalid');await handoff.promise;}});
  await a.enable();await a.generate();await act(async()=>a.first.resolve(clone(a.fixture.result)));await wait(()=>a.state().phase==='delivering','Saved result did not enter delivery');
  check(a.state().requestPending&&a.busy(),'Pending onGenerated promise did not retain shared root lease');equal(a.calls.length,1,'Handoff pending generated again');
  await a.cancel();check(!a.state().enabled&&a.state().requestPending&&a.busy(),'Cancel pretended pending handoff physically ended');check(lateLease&&!lateLease.isCurrent(),'Cancel left old delivery lease current');
  let secondWriter=false;try{a.host.acquireWrite('other root writer during cancelled handoff');secondWriter=true;}catch{}check(!secondWriter,'A second writer bypassed the pending handoff lease');
  await a.retryDelivery();equal(deliveries,1,'Cancel/physical handoff pending allowed a duplicate delivery');
  await act(async()=>handoff.resolve());await wait(()=>!a.busy()&&!a.state().requestPending,'Actual onGenerated settlement did not release the shared lease');
  check(!a.state().savedSummary&&a.state().phase==='idle','Cancelled handoff settlement revived a ready result');equal(a.calls.length,1,'Cancelled handoff caused another backend generation');
 });
 await scenario('saved-status-with-foreign-owner-does-not-become-ready',async make=>{
  const a=await make(),changed=clone(a.fixture.result);await a.enable();await a.generate();changed.session.profileId='foreign-returned-owner';await act(async()=>a.first.resolve(changed));await wait(()=>a.state().phase==='error','Foreign saved response was not rejected');equal(a.deliveries.length,0,'Shape-only saved response was delivered');check(!a.state().savedSummary,'Foreign saved response created ready summary');
 });
 await scenario('another-root-writer-blocks-dispatch-then-explicit-generation-recovers',async make=>{
  const a=await make(),release=a.host.acquireWrite('legacy or reviewed writer');await a.enable();await a.generate();equal(a.calls.length,0,'Root busy was bypassed');check(a.state().phase==='blocked','Root busy did not show a blocked state');release();await a.render();await wait(()=>a.state().canGenerate,'Busy settlement did not re-enable explicit generate');await a.generate();await act(async()=>a.first.resolve(clone(a.fixture.result)));await wait(()=>a.state().phase==='ready','Fresh generate after other writer failed');equal(a.calls.length,1,'Busy recovery auto-generated');
 });
 await scenario('real-route-unavailable-error-does-not-fall-back-or-display-ready',async make=>{
  const a=await make();await a.enable();await a.generate();await act(async()=>a.first.reject(Error('CANDIDATE2_NATIVE_ENTRY_UNAVAILABLE: exact route not installed')));await wait(()=>a.state().phase==='unavailable','Unavailable route did not remain explicit');check(!a.state().canGenerate&&!a.state().savedSummary,'Unavailable route became ready or retry permission');equal(a.deliveries.length,0,'Unavailable route fabricated saved result');equal(a.forbiddenCalls,[],'Unavailable route invoked a fallback');
 });
 window.__M936_HOOK_RESULT__={scope:'Real development ReactDOM StrictMode + native Electron DOM; actual useCandidate2Generation/controller with test-only Probe and explicit synthetic transport. No product Panel/App, actual route, native Store save or source-authentication acceptance.',runtime:{userAgent:navigator.userAgent,strictMode:true},cases,errors,unhandled};
}
void run().catch(error=>{window.__M936_HOOK_RESULT__={scope:'Hook/controller native DOM probe with fixture transport only.',runtime:{userAgent:navigator.userAgent,strictMode:true},cases,errors,unhandled,fatal:error instanceof Error?error.stack:String(error)};});
