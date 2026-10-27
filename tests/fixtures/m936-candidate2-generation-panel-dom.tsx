import React,{act,StrictMode,useEffect} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {Candidate2GenerationPanel} from '../../src/renderer/Candidate2GenerationPanel';
import type {Candidate2GenerationUiState,Candidate2GenerationPanelProps} from '../../src/renderer/candidate2-generation-ui';

/** These explicit public state fixtures are UI projections, not claims that a
 * real Service generated, saved, cancelled, or delivered anything. */
type Case={id:string;status:'passed'|'failed';assertions:number;error?:string;html:string;calls:string[]};
type Request={sequence:number;kind:'key';key:'Tab'|'Enter'|'Space'}|{sequence:number;kind:'viewport';width:320|390};
declare global {interface Window {__M936_CONTROL_REQUEST__?:Request;__M936_CONTROL_ACK__?:number;__M936_RESULT__?:{scope:string;runtime:{userAgent:string;strictMode:boolean;reactRoot:string};cases:Case[];apiReads:number;networkCalls:string[];viewports:unknown[];fatal?:string};}}
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const container=document.getElementById('root')!,cases:Case[]=[],networkCalls:string[]=[],viewports:unknown[]=[];
let root:Root|undefined,assertions=0,apiReads=0,sequence=0,calls:string[]=[];
const lifecycle={mounts:0,cleanups:0};
const initial=():Candidate2GenerationUiState=>({enabled:false,phase:'idle',requestPending:false,canGenerate:false,blockedReason:null,notice:'项目固定取法当前未启用。',error:null});
const state=(patch:Partial<Candidate2GenerationUiState>={}):Candidate2GenerationUiState=>({...initial(),...patch});
const clone=<T,>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
Object.defineProperty(window,'api',{configurable:true,get(){apiReads++;return undefined;}});
window.fetch=((input:RequestInfo|URL)=>{networkCalls.push(String(input));return Promise.reject(Error('M936 fixture blocks fetch'));}) as typeof fetch;
const originalOpen=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(_method:string,url:string|URL){networkCalls.push('xhr:'+String(url));throw Error('M936 fixture blocks XHR');} as typeof originalOpen;
const check=(condition:unknown,message:string)=>{assertions++;if(!condition)throw Error(message);};
const equal=(actual:unknown,expected:unknown,message:string)=>check(JSON.stringify(actual)===JSON.stringify(expected),message+'; actual='+JSON.stringify(actual)+' expected='+JSON.stringify(expected));
const tick=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
async function settle(){await act(async()=>{await tick();await tick();});}
async function wait(condition:()=>boolean,message:string){const start=performance.now();while(!condition()){if(performance.now()-start>5000)throw Error(message);await tick();}await settle();}
function Probe(){useEffect(()=>{lifecycle.mounts++;return()=>{lifecycle.cleanups++;};},[]);return null;}
const callbacks=():Omit<Candidate2GenerationPanelProps,'state'|'disabled'>=>({onEnabledChange:value=>calls.push('enabled:'+value),onGenerate:()=>calls.push('generate'),onCancel:()=>calls.push('cancel'),onRetryDelivery:()=>calls.push('retry-delivery')});
const action=<T extends HTMLElement=HTMLButtonElement>(name:string)=>container.querySelector<T>(`[data-c2-action="${name}"]`);
const panel=()=>container.querySelector<HTMLElement>('[data-c2-generation-panel]');
const content=()=>container.innerText;
async function mount(input:Candidate2GenerationUiState,disabled=false){if(root)await act(async()=>root!.unmount());container.replaceChildren();root=createRoot(container);calls=[];await act(async()=>root!.render(<StrictMode><Probe/><Candidate2GenerationPanel state={input} disabled={disabled} {...callbacks()}/></StrictMode>));await settle();}
async function rerender(input:Candidate2GenerationUiState,disabled=false){await act(async()=>root!.render(<StrictMode><Probe/><Candidate2GenerationPanel state={input} disabled={disabled} {...callbacks()}/></StrictMode>));await settle();}
async function click(name:string){const node=action<HTMLButtonElement|HTMLInputElement>(name);check(!!node,'Missing action '+name);await act(async()=>node!.click());await settle();}
async function key(key:'Tab'|'Enter'|'Space'){const request={sequence:++sequence,kind:'key' as const,key};window.__M936_CONTROL_REQUEST__=request;await wait(()=>window.__M936_CONTROL_ACK__===request.sequence,'Native key not delivered: '+key);}
async function viewport(width:320|390){const request={sequence:++sequence,kind:'viewport' as const,width};window.__M936_CONTROL_REQUEST__=request;await wait(()=>window.__M936_CONTROL_ACK__===request.sequence,'Viewport not applied: '+width);}
async function scenario(id:string,run:()=>Promise<void>){assertions=0;try{await run();cases.push({id,status:'passed',assertions,html:container.innerHTML,calls:clone(calls)});}catch(error){cases.push({id,status:'failed',assertions,error:error instanceof Error?error.stack:String(error),html:container.innerHTML,calls:clone(calls)});}}

async function run(){
 await scenario('default-off-pure-mount-enable-only-event',async()=>{
  await mount(initial());check(!!panel(),'Panel selector absent');check(panel()!.dataset.phase==='idle','Wrong default phase');check(!action<HTMLInputElement>('enable')!.checked,'Default is enabled');equal(calls,[],'Mount dispatched');
  await click('enable');equal(calls,['enabled:true'],'Enable must dispatch only enable event');check(!action<HTMLInputElement>('enable')!.checked,'Controlled checkbox changed without upstream state');
  await settle();equal(calls,['enabled:true'],'Enable caused an implicit generation');check(action<HTMLButtonElement>('generate')!.disabled,'Off state allowed generation');
  check(lifecycle.mounts>=2&&lifecycle.cleanups>=1,'StrictMode lifecycle not exercised');
 });
 await scenario('generate-upstream-pending-prevents-duplicate',async()=>{
  const idle=state({enabled:true,canGenerate:true,notice:'可以发起本次项目生成。'});
  await mount(idle);check(action('generate')!.textContent!.includes('按项目固定取法生成并保存'),'Generation action label changed');await click('generate');equal(calls,['generate'],'Generate event absent or mixed with another event');await click('generate');equal(calls,['generate'],'Same projection allowed rapid duplicate generation');
  const pending=state({enabled:true,phase:'generating',requestPending:true,canGenerate:true,notice:'正在等待项目生成。'});await rerender(pending);check(action<HTMLButtonElement>('generate')!.disabled,'Pending state did not gate duplicate generation');
  await click('generate');equal(calls,['generate'],'Pending emitted duplicate generation');
  await rerender(idle,true);await click('generate');equal(calls,['generate'],'External disabled emitted generation');
  await rerender(state({enabled:true,canGenerate:false}));await click('generate');equal(calls,['generate'],'canGenerate false emitted generation');
 });
 await scenario('pending-cancel-available-even-disabled',async()=>{
  const input=state({enabled:true,phase:'generating',requestPending:true,canGenerate:false,notice:'正在等待已提交请求。'});
  await mount(input,true);check(action<HTMLButtonElement>('generate')!.disabled,'External disabled generation remains available');check(!!action('cancel')&&!action<HTMLButtonElement>('cancel')!.disabled,'Pending cancel locked by disabled prop');check(action('cancel')!.textContent!.includes('停止等待'),'Cancel label implies backend rollback');
  await click('cancel');equal(calls,['cancel'],'Cancel invoked a different action');check(!/已撤销后端|后端已取消|已删除结果/.test(content()),'Panel claims backend rollback');
  await rerender(state({...input,enabled:false,notice:'已停止本次意图，原请求仍未结算。'}),true);check(!!action('cancel')&&!action<HTMLButtonElement>('cancel')!.disabled,'Off pending request lost cancellation access');await click('cancel');equal(calls,['cancel','cancel'],'Off pending cancel did not dispatch only cancel');
 });
 await scenario('blocked-readonly-dirty-unavailable-projected',async()=>{
  const fixtures:Array<{phase:Candidate2GenerationUiState['phase'];reason:string}>=[{phase:'blocked',reason:'当前客户记录只读，不能由此状态发起。'},{phase:'blocked',reason:'表单存在尚未保存的编辑。'},{phase:'unavailable',reason:'当前环境缺少项目生成桥接。'}];
  for(const {phase,reason} of fixtures){await mount(state({enabled:true,phase,canGenerate:false,blockedReason:reason,notice:'该原因由上游给出。'}));check(content().includes(reason),'Blocking reason not projected');check(panel()!.dataset.phase===phase,'Phase not projected');await click('generate');equal(calls,[],'Blocked projection dispatched generation');check(!action('retry-delivery'),'Blocked state advertised delivery result');}
 });
 await scenario('delivery-retry-independent-generation-error-no-retry',async()=>{
  const summary={sessionId:'m936-session-result',profileId:'m936-profile-result',candidateCount:3,traditionalStatus:'unknown' as const};
  const failed=state({enabled:true,phase:'delivering',requestPending:false,canGenerate:false,error:'已返回结果交接失败。',notice:'上游保留原结果。',savedSummary:summary});
  const before=JSON.stringify(failed);await mount(failed);check(action('retry-delivery')!.textContent!.includes('重新接收已返回结果'),'Delivery retry label not explicit');await click('retry-delivery');equal(calls,['retry-delivery'],'Retry delivered a generate/cancel event');await click('retry-delivery');equal(calls,['retry-delivery'],'Same projection allowed rapid duplicate delivery retry');check(JSON.stringify(failed)===before,'Delivery retry mutated controlled state');
  await rerender(state({...failed,requestPending:true,error:null}));check(!action('retry-delivery'),'Active delivery exposes retry');await click('generate');equal(calls,['retry-delivery'],'Delivery dispatched another generation');
  await rerender(state({enabled:true,phase:'error',canGenerate:false,error:'本次生成失败。',notice:'没有返回结果。'}));check(!action('retry-delivery'),'Generation error advertises retry delivery');check(!content().includes('重新接收已返回结果'),'Generation error claims returned result');
  await rerender(state({enabled:true,phase:'error',canGenerate:true,error:'本次生成失败。',notice:'上游允许显式重新生成。'}));check(!action('retry-delivery'),'Retryable generation error advertises delivery retry');check(!action<HTMLButtonElement>('generate')!.disabled,'Retryable generation error blocks explicit generation');await click('generate');equal(calls,['retry-delivery','generate'],'Explicit generation retry dispatched the wrong action');
 });
 await scenario('ready-summary-unknown-and-state-immutable',async()=>{
  const input=state({enabled:true,phase:'ready',canGenerate:false,notice:'已保存结果已返回。',savedSummary:{sessionId:'m936-ready-session',profileId:'m936-ready-profile',candidateCount:2,traditionalStatus:'unknown'}}),before=JSON.stringify(input);
  await mount(input);for(const value of ['m936-ready-session','m936-ready-profile','2'])check(content().includes(value),'Ready summary missing '+value);check(/未评估|未知|未判定|unknown/.test(content()),'Traditional unknown not shown');check(!/大吉|上上签|凶兆|保证好运|保证成功/.test(content()),'Ready summary invented a traditional verdict');check(!action('retry-delivery'),'Ready exposes delivery retry');check(JSON.stringify(input)===before,'Ready display mutated state');
 });
 await scenario('native-keyboard-accessible-live-region',async()=>{
  await mount(state({enabled:true,canGenerate:true,notice:'键盘测试可发起。'}));
  check(!!container.querySelector('[aria-live="polite"],[aria-live="assertive"]'),'Status has no live region');
  const enable=action<HTMLInputElement>('enable')!,generate=action<HTMLButtonElement>('generate')!;
  check(!!enable.labels?.length||!!enable.getAttribute('aria-label')||!!enable.getAttribute('aria-labelledby'),'Enable lacks accessible label');check(generate.textContent!.trim().length>0,'Generation button has no accessible name');
  document.body.tabIndex=-1;document.body.focus();await key('Tab');check(document.activeElement===enable,'Tab did not focus enable');await key('Space');equal(calls,['enabled:false'],'Native Space did not dispatch controlled enable');
  await key('Tab');check(document.activeElement===generate,'Tab did not focus generate');await key('Enter');equal(calls,['enabled:false','generate'],'Native Enter did not dispatch generation');
  await rerender(state({enabled:true,phase:'generating',requestPending:true,canGenerate:false,notice:'等待中的请求。'}),true);action<HTMLElement>('cancel')!.focus();await key('Enter');equal(calls,['enabled:false','generate','cancel'],'Keyboard could not stop waiting');
 });
 await scenario('real-320-390-viewports-no-horizontal-overflow',async()=>{
  const long='m936-'+('a'.repeat(160));
  const inputs=[state({enabled:true,phase:'blocked',canGenerate:false,blockedReason:'这是上游传入的较长阻塞说明，用来确认窄屏中的文字可换行并完整展示。'.repeat(5),notice:'固定项目状态说明。'.repeat(7)}),state({enabled:true,phase:'ready',canGenerate:false,notice:'结果摘要。',savedSummary:{sessionId:long,profileId:long+'-profile',candidateCount:3,traditionalStatus:'unknown'}}),state({enabled:true,phase:'delivering',canGenerate:false,error:'结果交接暂未完成，请重新接收已返回结果。'.repeat(4),notice:'保留原结果。'})];
  for(const width of [320,390] as const){await viewport(width);for(const [index,input] of inputs.entries()){await mount(input);await settle();const rect=panel()!.getBoundingClientRect(),measure={width,case:index,innerWidth,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,panelLeft:rect.left,panelRight:rect.right,panelWidth:rect.width};viewports.push(measure);check(innerWidth===width,'Actual Chromium viewport not '+width);check(document.documentElement.scrollWidth<=innerWidth+1,'Document horizontal overflow at '+width);check(rect.left>=-1&&rect.right<=innerWidth+1,'Panel exceeds viewport at '+width);}}
 });
 await scenario('zero-api-network-pure-event-scope',async()=>{
  await mount(initial());equal(apiReads,0,'Panel read window.api');equal(networkCalls,[],'Panel attempted network');check(!container.querySelector('form,textarea,[contenteditable="true"]'),'Panel added editable storage payload');
 });
 if(root)await act(async()=>root!.unmount());
 window.__M936_RESULT__={scope:'Real isolated Electron Chromium + ReactDOM StrictMode; explicit unique public UI state fixtures; pure event/component acceptance only, no real Service generation/save/delivery acceptance.',runtime:{userAgent:navigator.userAgent,strictMode:true,reactRoot:'react-dom/client.createRoot'},cases,apiReads,networkCalls,viewports};
}
run().catch(error=>{window.__M936_RESULT__={scope:'Isolated candidate2 generation panel component harness.',runtime:{userAgent:navigator.userAgent,strictMode:true,reactRoot:'react-dom/client.createRoot'},cases,apiReads,networkCalls,viewports,fatal:error instanceof Error?error.stack:String(error)};});
