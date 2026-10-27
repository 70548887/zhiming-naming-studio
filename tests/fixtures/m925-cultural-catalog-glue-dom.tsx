import React,{act,StrictMode,useLayoutEffect} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {App} from 'm925-actual-app';
import type {GenerateResult,NamingSession,BirthProfile} from '../../src/shared/types';
import {canonicalPlainJson} from '../../src/shared/plain-json';

type Reference={comparisonId:string;ownerProfileId:string;sourceSessionId:string};
type Seeds={sessions:NamingSession[];profiles:BirthProfile[];references:Record<string,Reference>};
type Deferred<T>={promise:Promise<T>;resolve:(value:T)=>void;reject:(reason:Error)=>void};
type Call={method:string;args:unknown[]};
type Case={id:string;status:'passed'|'failed';assertions:number;error?:string;html:string;calls:Call[]};
declare global {interface Window {__M925_GLUE_SEEDS__:Seeds;__M925_GLUE_RESULT__?:{scope:string;runtime:{userAgent:string;strictMode:boolean};cases:Case[];errors:string[];unhandled:string[];fatal?:string};}}
const clone=<T,>(value:T):T=>JSON.parse(JSON.stringify(value));
const deferred=<T,>():Deferred<T>=>{let resolve!:(value:T)=>void,reject!:(reason:Error)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const host=document.getElementById('root')!;
let root:Root|undefined,assertions=0,activeCalls:Call[]=[];
const cases:Case[]=[],errors:string[]=[],unhandled:string[]=[];
window.addEventListener('error',event=>errors.push(event.message));
window.addEventListener('unhandledrejection',event=>unhandled.push(String(event.reason)));
const check=(condition:unknown,message:string)=>{assertions++;if(!condition)throw Error(message);};
const equal=(actual:unknown,expected:unknown,message:string)=>check(canonicalPlainJson(actual)===canonicalPlainJson(expected),message+'\nactual='+JSON.stringify(actual)+'\nexpected='+JSON.stringify(expected));
const tick=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
async function settle(){await act(async()=>{await tick();await tick();});}
async function wait(ready:()=>boolean,message:string){const started=performance.now();while(!ready()){if(performance.now()-started>4000)throw Error(message+'\nDOM='+document.body.innerText.slice(-4500));await settle();}await settle();}
const query=<T extends Element=HTMLElement>(selector:string)=>host.querySelector<T>(selector);
const all=<T extends Element=HTMLElement>(selector:string,scope:ParentNode=host)=>[...scope.querySelectorAll<T>(selector)];
const viewer=()=>query<HTMLElement>('[data-m925-viewer-props]');
const sourceButton=()=>query<HTMLButtonElement>('[data-m925-open-source]');
const rootBusy=()=>query('main.main-area')?.getAttribute('aria-busy')==='true';
async function nativeClick(element:HTMLElement|null,message='Missing native control'){check(element,message);check(!element!.matches(':disabled'),'Control disabled: '+message);await act(async()=>element!.click());await settle();}
async function textClick(text:string,selector='button',scope:ParentNode=host){const node=all<HTMLElement>(selector,scope).find(value=>(value.textContent??'').trim()===text);await nativeClick(node??null,'button '+text);}
function capturedClick(element:HTMLElement|null){check(element,'Missing real event capture target');const key=Object.keys(element!).find(name=>name.startsWith('__reactProps$'));check(key,'Real ReactDOM event props absent');const props=(element as unknown as Record<string,unknown>)[key!] as {onClick?:()=>void};check(typeof props.onClick==='function','No click handler');return props.onClick!;}
async function invoke(callback:()=>void){await act(async()=>callback());await settle();}
async function setDate(value:string){const node=query<HTMLInputElement>('#birth-date');check(node,'Birth date input absent');await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(node,value);node!.dispatchEvent(new Event('input',{bubbles:true}));node!.dispatchEvent(new Event('change',{bubbles:true}));});await settle();}
async function unmount(){if(root)await act(async()=>root!.unmount());root=undefined;await settle();}

function transport({readOnly=false}:{readOnly?:boolean}={}){
 const seeds=clone(window.__M925_GLUE_SEEDS__),calls:Call[]=[];activeCalls=calls;
 const state={readMode:'normal' as 'normal'|'wrong-id'|'wrong-owner',pendingRead:undefined as Deferred<NamingSession|null>|undefined,pendingGenerate:undefined as Deferred<GenerateResult>|undefined,generateCalls:0};
 const readSessionDetail=function(this:unknown,id:string):Promise<NamingSession|null>{
  check(this===studio,'Actual source read lost studio owner');calls.push({method:'readSessionDetail',args:[id]});
  if(state.pendingRead)return state.pendingRead.promise;
  const value=clone(seeds.sessions.find(session=>session.id===id)??null);
  if(value&&state.readMode==='wrong-id')value.id='foreign-source-id';
  if(value&&state.readMode==='wrong-owner'){value.profileId=seeds.profiles[1].id;value.profile.id=seeds.profiles[1].id;}
  return Promise.resolve(value);
 };
 const studio={
  bootstrap:async()=>({profiles:clone(seeds.profiles),sessions:clone(seeds.sessions),settings:{studioName:'M925 props合同工作室',contact:'',logoDataUrl:'',apiBaseUrl:'',model:'',timeoutMs:45000,hasApiKey:false,useAi:false},sources:[],stats:{characters:100,citations:20,knowledge:20,dataVersion:'m925-contract-fixture'},desktop:true,storageState:{version:'customer-compact/3',migrationRequired:readOnly,bytes:1,maxPhysicalBytes:1000000,warning:false}}),
  readSessionDetail,
  generate:async()=>{state.generateCalls++;calls.push({method:'generate',args:[]});return state.pendingGenerate?state.pendingGenerate.promise:{session:clone(seeds.sessions[0]),messages:[]};},
  searchKnowledge:async()=>[],searchCharacters:async()=>[],
 };
 return {studio,seeds,state,calls,pauseRead:()=>state.pendingRead=deferred<NamingSession|null>(),pauseGenerate:()=>state.pendingGenerate=deferred<GenerateResult>()};
}
async function mount(options:Parameters<typeof transport>[0]={}){
 await unmount();const stub=transport(options);window.studio=stub.studio as unknown as typeof window.studio;
 window.localStorage.setItem('studio.onboarding.v1',JSON.stringify({version:1,dismissed:true}));window.confirm=()=>true;
 host.replaceChildren();root=createRoot(host);let setups=0,cleanups=0;
 function Probe(){useLayoutEffect(()=>{setups++;return()=>{cleanups++;};},[]);return null;}
 await act(async()=>root!.render(<StrictMode><Probe/><App/></StrictMode>));await wait(()=>!!viewer(),'Actual App did not pass props to viewer contract stub');
 check(setups===2&&cleanups===1,'Real StrictMode replay absent');return stub;
}
async function openSavedProfile(stub:ReturnType<typeof transport>,index=0){await textClick('客户档案','nav button');const label=stub.seeds.profiles[index].customerName;const card=all<HTMLElement>('.customer-card').find(value=>value.textContent?.includes(label));check(card,'Saved customer card absent');const button=card?all<HTMLButtonElement>('button',card).find(value=>value.textContent?.trim().startsWith('打开档案')):undefined;await nativeClick(button??null,'Actual saved profile open');await wait(()=>viewer()?.dataset.owner===stub.seeds.profiles[index].id,'Saved profile owner prop not delivered');}
async function scenario(id:string,run:()=>Promise<void>){const beforeErrors=errors.length,beforeUnhandled=unhandled.length;assertions=0;try{await run();check(errors.length===beforeErrors,'Window errors '+errors.slice(beforeErrors).join('\n'));check(unhandled.length===beforeUnhandled,'Unhandled '+unhandled.slice(beforeUnhandled).join('\n'));cases.push({id,status:'passed',assertions,html:document.body.innerHTML,calls:clone(activeCalls)});}catch(error){cases.push({id,status:'failed',assertions,error:error instanceof Error?error.stack:String(error),html:document.body.innerHTML,calls:clone(activeCalls)});}finally{await unmount();}}

async function run(){
 await scenario('saved-profile-props-mount-default-no-source-read',async()=>{const stub=await mount();check(viewer()!.dataset.owner==='','Unsaved blank profile received owner authority');await openSavedProfile(stub);equal(viewer()!.dataset.owner,stub.seeds.profiles[0].id,'Wrong saved owner prop');check(!!viewer()!.dataset.context,'Independent owner context prop absent');equal(viewer()!.dataset.readOnly,'false','Writable storage prop mismatch');equal(viewer()!.dataset.busy,'false','Default busy prop mismatch');equal(stub.calls,[],'Mount/profile loading auto-read original cultural source');});
 await scenario('explicit-known-reference-performs-actual-source-read-and-apply',async()=>{const stub=await mount();await openSavedProfile(stub);await nativeClick(sourceButton(),'Known original source action');await wait(()=>stub.calls.some(row=>row.method==='readSessionDetail'),'Explicit source action did not call real studio method');equal(stub.calls.filter(row=>row.method==='readSessionDetail').map(row=>row.args),[[stub.seeds.sessions[1].id]],'Original source reference changed');await wait(()=>query('.current-session-label')?.textContent?.includes(stub.seeds.sessions[1].profile.customerName)??false,'Actual source response was not applied');equal(query<HTMLInputElement>('#birth-date')!.value,stub.seeds.sessions[1].profile.birthDate,'Original profile data not applied');});
 await scenario('dirty-portal-confirmation-cancel-and-explicit-confirm',async()=>{const stub=await mount();await openSavedProfile(stub);await setDate('2026-10-20');await nativeClick(sourceButton(),'Dirty source action');await wait(()=>document.body.textContent!.includes('有修改尚未保存'),'Dirty modal not found in document body portal');equal(stub.calls,[],'Source read ran before dirty consent');await textClick('继续编辑','button',document.body);equal(stub.calls,[],'Cancel dirty modal read original source');equal(query<HTMLInputElement>('#birth-date')!.value,'2026-10-20','Cancel discarded current date');await nativeClick(sourceButton());await textClick('放弃修改并继续','button',document.body);await wait(()=>stub.calls.some(row=>row.method==='readSessionDetail'),'Confirmed dirty modal did not issue source read');equal(stub.calls.filter(row=>row.method==='readSessionDetail').map(row=>row.args),[[stub.seeds.sessions[1].id]],'Confirmed source read reference changed');await wait(()=>query<HTMLInputElement>('#birth-date')?.value===stub.seeds.sessions[1].profile.birthDate,'Confirmed source not applied');});
 await scenario('pending-source-read-preserves-new-same-owner-date',async()=>{const stub=await mount();await openSavedProfile(stub);const pending=stub.pauseRead();await nativeClick(sourceButton());await wait(rootBusy,'Source read busy lease not acquired');equal(viewer()!.dataset.busy,'true','Root busy prop not forwarded');await setDate('2026-10-21');await act(async()=>pending.resolve(clone(stub.seeds.sessions[1])));await wait(()=>!rootBusy(),'Settled source read did not release root busy');equal(query<HTMLInputElement>('#birth-date')!.value,'2026-10-21','Late original source overwrote new same-owner date');check(document.body.textContent!.includes('当前新输入已保留'),'Preserved-input notice absent');check(!query('.current-session-label')?.textContent?.includes(stub.seeds.sessions[1].profile.customerName),'Old source unexpectedly applied');});
 await scenario('foreign-source-response-id-or-owner-is-refused',async()=>{for(const mode of ['wrong-id','wrong-owner'] as const){const stub=await mount();await openSavedProfile(stub);stub.state.readMode=mode;await nativeClick(sourceButton());await wait(()=>document.body.textContent!.includes('原保存方案不存在或不属于当前宝宝'),'Foreign source response rejection absent');equal(viewer()!.dataset.owner,stub.seeds.profiles[0].id,'Foreign response changed current owner');check(!query('.current-session-label'),'Foreign response applied an original session');equal(query<HTMLInputElement>('#birth-date')!.value,stub.seeds.profiles[0].birthDate,'Foreign response changed profile date');}});
 await scenario('same-studio-read-method-rebind-rejects-pending-response',async()=>{const stub=await mount();await openSavedProfile(stub);const pending=stub.pauseRead();await nativeClick(sourceButton());await wait(rootBusy,'Pending source read not started');const replacement=async()=>clone(stub.seeds.sessions[1]);Object.assign(stub.studio,{readSessionDetail:replacement});await act(async()=>pending.resolve(clone(stub.seeds.sessions[1])));await wait(()=>!rootBusy(),'Method-rebind source read did not settle');check(document.body.textContent!.includes('方案读取服务已变化'),'Same-object method replacement was not refused');check(!query('.current-session-label'),'Rebound source response applied');equal(viewer()!.dataset.owner,stub.seeds.profiles[0].id,'Method replacement changed owner');});
 await scenario('root-busy-refuses-captured-source-action',async()=>{const stub=await mount();await openSavedProfile(stub);const oldSource=capturedClick(sourceButton()),pending=stub.pauseGenerate();await nativeClick(query('button.generate-button'),'Root generation action');await wait(rootBusy,'Root generation busy lease absent');equal(viewer()!.dataset.busy,'true','Root generate busy prop not forwarded');await invoke(oldSource);equal(stub.calls.filter(row=>row.method==='readSessionDetail'),[],'Captured source bypassed root busy');await act(async()=>pending.resolve({session:clone(stub.seeds.sessions[0]),messages:[]}));await wait(()=>!rootBusy(),'Root generation did not settle');});
 await scenario('owner-switch-retires-late-source-session-response',async()=>{const stub=await mount();await openSavedProfile(stub);const context=viewer()!.dataset.context,pending=stub.pauseRead();await nativeClick(sourceButton());await wait(rootBusy,'Pending source read did not start');await textClick('客户档案','nav button');check(!viewer(),'Navigating away retained the active source viewer');await act(async()=>pending.resolve(clone(stub.seeds.sessions[1])));await wait(()=>!rootBusy(),'Retired source read did not release owned lease');await openSavedProfile(stub,1);equal(viewer()!.dataset.owner,stub.seeds.profiles[1].id,'Explicit second owner was not applied');check(viewer()!.dataset.context!==context,'Owner/reset epoch did not change viewer context');equal(query<HTMLInputElement>('#birth-date')!.value,stub.seeds.profiles[1].birthDate,'Late source replaced second owner profile');check(!query('.current-session-label'),'Late original session was applied across route/owner switch');});
 await scenario('readonly-prop-still-permits-explicit-original-source-read',async()=>{const stub=await mount({readOnly:true});await openSavedProfile(stub);equal(viewer()!.dataset.readOnly,'true','Read-only prop not forwarded');equal(stub.calls,[],'Readonly mount auto-read source');await nativeClick(sourceButton());await wait(()=>query('.current-session-label')?.textContent?.includes(stub.seeds.sessions[1].profile.customerName)??false,'Readonly source view was blocked');equal(stub.calls.filter(row=>row.method==='readSessionDetail').map(row=>row.args),[[stub.seeds.sessions[1].id]],'Readonly explicit original source read missing');equal(viewer()!.dataset.readOnly,'true','Opening source changed read-only contract');});
 window.__M925_GLUE_RESULT__={scope:'Contract-only actual App glue: real ReactDOM StrictMode/native DOM with an explicit props-and-onOpenSource viewer stub. No final design viewer/controller/catalog integration, real Service/Store/HTTP verification or source authority claim.',runtime:{userAgent:navigator.userAgent,strictMode:true},cases,errors,unhandled};
}
run().catch(error=>{window.__M925_GLUE_RESULT__={scope:'M925 contract-only App glue harness with viewer props stub.',runtime:{userAgent:navigator.userAgent,strictMode:true},cases,errors,unhandled,fatal:error instanceof Error?error.stack:String(error)};});
