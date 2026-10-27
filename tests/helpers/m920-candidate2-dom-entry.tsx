import React,{StrictMode,Profiler,act,useLayoutEffect,useSyncExternalStore} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {Candidate2EligibilityConsumer} from '../../src/renderer/Candidate2EligibilityConsumer';
import {createCandidate2EligibilityConsumerController} from '../../src/renderer/candidate2-eligibility-consumer-state';
import {CANDIDATE2_NAMING_SELECTION} from '../../src/shared/candidate2-naming-consumer-v1';
import type {Candidate2NamingEligibilityApi,Candidate2NamingEligibility} from '../../src/shared/candidate2-naming-eligibility-v1';
import {profile,preferences,eligibility} from '../fixtures/m920-candidate2-lifecycle';

(globalThis as typeof globalThis&{IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
const assert=(value:unknown,message='DOM assertion failed')=>{if(!value)throw Error(message);};
function deferred(){let resolve!:(value:Candidate2NamingEligibility)=>void,reject!:(reason:Error)=>void;const promise=new Promise<Candidate2NamingEligibility>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
const flush=async()=>{await Promise.resolve();await new Promise(resolve=>setTimeout(resolve,0));};
function setApi(api:Partial<Candidate2NamingEligibilityApi>){window.studio=api as typeof window.studio;}
const cases:{name:string;passed:boolean}[]=[],errors:string[]=[],unhandled:string[]=[];
window.addEventListener('error',event=>errors.push(event.message));
window.addEventListener('unhandledrejection',event=>unhandled.push(String(event.reason)));
type Props=React.ComponentProps<typeof Candidate2EligibilityConsumer>;
async function mount(initial:Partial<Props>={}){
 const host=document.createElement('div');document.body.append(host);let root:Root|undefined=createRoot(host),props:Props={profile,preferences,...initial},commits=0,setups=0,cleanups=0;
 function LifecycleProbe(){useLayoutEffect(()=>{setups++;return()=>{cleanups++;};},[]);return null;}
 const render=async(next:Partial<Props>={})=>{props={...props,...next};await act(async()=>{root!.render(<StrictMode><Profiler id="consumer" onRender={()=>{commits++;}}><LifecycleProbe/><Candidate2EligibilityConsumer {...props}/></Profiler></StrictMode>);});};
 const unmount=async()=>{if(root){await act(async()=>{root!.unmount();});root=undefined;}};
 const click=async(selector:string)=>{const control=host.querySelector<HTMLInputElement|HTMLButtonElement>(selector);if(!control)throw Error(`Missing DOM control ${selector}`);await act(async()=>{control.click();control.click();});};
 const choose=()=>click('input[value="candidate2"]'),retry=()=>click('button');
 const status=()=>host.querySelector('[data-eligibility-status]')?.getAttribute('data-eligibility-status');
 const text=()=>host.textContent??'';
 await render();
 return {host,render,unmount,choose,retry,status,text,stats:()=>({commits,setups,cleanups}),remove:async()=>{await unmount();host.remove();}};
}

async function check(name:string,run:()=>Promise<void>){await run();assert(errors.length===0,errors.join('\n'));assert(unhandled.length===0,unhandled.join('\n'));cases.push({name,passed:true});}
async function suite(){
 await check('real StrictMode setup-cleanup-setup: default legacy, explicit native click, ready',async()=>{
  const pending=deferred();const calls:unknown[][]=[];const api={checkCandidate2NamingEligibility(...args:Parameters<Candidate2NamingEligibilityApi['checkCandidate2NamingEligibility']>){assert(this===api,'API owner changed');calls.push(args);return pending.promise;}};setApi(api);
  const ui=await mount();try{assert(ui.stats().setups===2&&ui.stats().cleanups===1,'Development StrictMode effects were not replayed');assert(calls.length===0);assert(ui.host.querySelector<HTMLInputElement>('input[value="legacy"]')?.checked);await ui.choose();assert(calls.length===1,'Double click dispatched duplicate requests');assert(calls[0][0]===profile&&calls[0][1]===preferences&&calls[0][2]===CANDIDATE2_NAMING_SELECTION&&calls[0].length===3,'Exact API inputs changed');assert(ui.status()==='loading');await act(async()=>{pending.resolve(eligibility());});assert(ui.status()==='ready','StrictMode response stayed loading');assert(ui.text().includes('未知（本检查不提供传统吉凶结论）'));assert(ui.text().includes('project-bazi-mainchain-145/1.3.2'));}finally{await ui.remove();}
 });
 await check('real StrictMode rejection becomes error; direct retry recovers without changing radios',async()=>{
  const first=deferred(),second=deferred();let calls=0;setApi({checkCandidate2NamingEligibility:()=>++calls===1?first.promise:second.promise});const ui=await mount();try{await ui.choose();await act(async()=>{first.reject(Error('首次读取失败'));});assert(ui.status()==='error');assert(ui.text().includes('首次读取失败'));assert(ui.text().includes('重试资格检查'));await ui.retry();assert(calls===2,'Retry did not run exactly once');assert(ui.status()==='loading');assert(ui.host.querySelector<HTMLInputElement>('input[value="candidate2"]')?.checked);await act(async()=>{second.resolve(eligibility('直接重试成功'));});assert(ui.status()==='ready');assert(ui.text().includes('直接重试成功'));}finally{await ui.remove();}
 });
 await check('unavailable API has a direct retry and never shows ready until a response arrives',async()=>{
  setApi({});const ui=await mount();try{await ui.choose();assert(ui.status()==='unavailable');let calls=0;setApi({checkCandidate2NamingEligibility:async()=>{calls++;return eligibility();}});await ui.retry();assert(calls===1&&ui.status()==='ready');}finally{await ui.remove();}
 });
 await check('global busy prevents native opt-in and retry until enabled',async()=>{
  let calls=0;setApi({checkCandidate2NamingEligibility:async()=>{calls++;throw Error('retryable');}});const ui=await mount({disabled:true});try{await ui.choose();assert(calls===0);await ui.render({disabled:false});await ui.choose();assert(ui.status()==='error'&&calls===1);await ui.render({disabled:true});assert(ui.host.querySelector<HTMLButtonElement>('button')?.disabled);await ui.retry();assert(calls===1);await ui.render({disabled:false});await ui.retry();assert(calls===2&&ui.status()==='error');}finally{await ui.remove();}
 });
 for(const outcome of ['resolve','reject'] as const){
  await check(`actual consumer unmount pending ${outcome}, remount and new check reject the old settlement`,async()=>{
   const old=deferred(),fresh=deferred();let calls=0;setApi({checkCandidate2NamingEligibility:()=>++calls===1?old.promise:fresh.promise});const first=await mount();await first.choose();await first.unmount();const oldCommits=first.stats().commits;const next=await mount();try{assert(next.status()==='idle');assert(calls===1);await next.choose();assert(calls===2);await act(async()=>{fresh.resolve(eligibility('新挂载结果'));});assert(next.status()==='ready');await act(async()=>{if(outcome==='resolve')old.resolve(eligibility('已卸载旧结果'));else old.reject(Error('已卸载旧错误'));await flush();});assert(first.stats().commits===oldCommits&&first.host.childNodes.length===0,'Unmounted consumer committed');assert(next.status()==='ready'&&next.text().includes('新挂载结果'));assert(!next.text().includes('已卸载旧'));}finally{await first.remove();await next.remove();}
  });
 }
 for(const change of ['profile','preferences'] as const){
  await check(`${change} A-B-A changes reset choice and reject reverse-order success and rejection`,async()=>{
   const requests=[deferred(),deferred(),deferred()];let calls=0;setApi({checkCandidate2NamingEligibility:()=>requests[calls++].promise});const ui=await mount();try{await ui.choose();await ui.render(change==='profile'?{profile:{...profile,birthDate:'2024-02-01'}}:{preferences:{...preferences,style:'明快自然'}});assert(ui.status()==='idle'&&ui.host.querySelector<HTMLInputElement>('input[value="legacy"]')?.checked);await ui.choose();await ui.render({profile,preferences});assert(ui.status()==='idle');await ui.choose();assert(calls===3);await act(async()=>{requests[2].resolve(eligibility('最新资料结果'));});assert(ui.status()==='ready');const commits=ui.stats().commits;await act(async()=>{requests[1].reject(Error('过期资料错误'));requests[0].resolve(eligibility('过期资料结果'));await flush();});assert(ui.status()==='ready'&&ui.text().includes('最新资料结果'));assert(!ui.text().includes('过期资料'));assert(ui.stats().commits===commits,'Retired response notified React');}finally{await ui.remove();}
  });
 }
 await check('real ReactDOM subscription survives replay, detach/dispose blocks writes and reattach retires old epoch',async()=>{
  const requests=[deferred(),deferred(),deferred()];let calls=0,notifications=0;const controller=createCandidate2EligibilityConsumerController({getContext:()=>({profile,preferences,contextKey:'same'}),getApi:()=>({checkCandidate2NamingEligibility:()=>requests[calls++].promise})});const unsubscribe=controller.subscribe(()=>{notifications++;});let setups=0,cleanups=0;
  function Probe(){const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot);useLayoutEffect(()=>{setups++;controller.attach();return()=>{cleanups++;controller.detach();};},[]);return <button onClick={()=>{void controller.choose('candidate2');}}>{state.preview.status}</button>;}
  const host=document.createElement('div');document.body.append(host);let root=createRoot(host);
  try{await act(async()=>{root.render(<StrictMode><Probe/></StrictMode>);});assert(setups===2&&cleanups===1);await act(async()=>{host.querySelector('button')!.click();});await act(async()=>{root.unmount();});const snapshot=controller.getSnapshot(),before=notifications;await act(async()=>{requests[0].resolve(eligibility('卸载后的返回'));await flush();});assert(controller.getSnapshot()===snapshot&&notifications===before,'Detached controller committed a response');await controller.choose('legacy');await controller.retry();assert(calls===1&&notifications===before);root=createRoot(host);await act(async()=>{root.render(<StrictMode><Probe/></StrictMode>);});assert(host.textContent==='idle');await act(async()=>{host.querySelector('button')!.click();});assert(calls===2);await act(async()=>{requests[1].resolve(eligibility());});assert(host.textContent==='ready','Subscription lost after reattach');await act(async()=>{root.unmount();});controller.attach();const pending=controller.choose('candidate2');controller.dispose();const disposed=controller.getSnapshot(),disposedNotifications=notifications;requests[2].reject(Error('disposed rejection'));await pending;assert(controller.getSnapshot()===disposed&&notifications===disposedNotifications,'dispose allowed a commit');}finally{unsubscribe();host.remove();}
 });
 assert(errors.length===0&&unhandled.length===0);
 return {passed:true,cases,errors,unhandled,scope:'Real development ReactDOM createRoot and native Chromium DOM in a hidden Electron window; StrictMode effects, native click handlers, actual unmount/remount. Fixture eligibility bridge responses; no Service/IPC/database/generation verification.'};
}
Object.assign(window,{__m920Result:suite().catch(error=>({passed:false,error:error instanceof Error?error.stack:String(error),cases,errors,unhandled}))});
