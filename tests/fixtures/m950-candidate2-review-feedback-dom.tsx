import React,{act,StrictMode,useEffect} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {Candidate2ReviewFeedback} from '../../src/renderer/Candidate2ReviewFeedback';
import type {Candidate2ReviewFeedbackState,Candidate2ReviewFeedbackProps} from '../../src/renderer/candidate2-review-ui';

/** Explicit public feedback states test controlled projection and pure events.
 * They are not proof of a real Service write, readback, or saved-session state. */
type Case={id:string;status:'passed'|'failed';assertions:number;error?:string;html:string;calls:string[]};
type Request={sequence:number;kind:'key';key:'Tab'|'Enter'|'Space'}|{sequence:number;kind:'viewport';width:320|390};
declare global {interface Window {__M950_CONTROL_REQUEST__?:Request;__M950_CONTROL_ACK__?:number;__M950_RESULT__?:{scope:string;runtime:{userAgent:string;strictMode:boolean;reactRoot:string};cases:Case[];apiReads:number;networkCalls:string[];viewports:unknown[];fatal?:string};}}
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const container=document.getElementById('root')!,cases:Case[]=[],networkCalls:string[]=[],viewports:unknown[]=[];
let root:Root|undefined,assertions=0,apiReads=0,sequence=0,calls:string[]=[];
const lifecycle={mounts:0,cleanups:0};
const initial=():Candidate2ReviewFeedbackState=>({phase:'idle',requestPending:false,canRetryDelivery:false,requiresReadback:false,requiresRestart:false,blockedReason:null,notice:'当前仅显示复核反馈。',error:null,draftDirty:false,canReadSaved:false,canLoadLatest:false,canCompareDraft:false});
const state=(patch:Partial<Candidate2ReviewFeedbackState>={}):Candidate2ReviewFeedbackState=>({...initial(),...patch});
const clone=<T,>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
const freeze=<T,>(value:T):T=>{if(value&&typeof value==='object'){Object.freeze(value);for(const child of Object.values(value as Record<string,unknown>))freeze(child);}return value;};
Object.defineProperty(window,'api',{configurable:true,get(){apiReads++;return undefined;}});
window.fetch=((input:RequestInfo|URL)=>{networkCalls.push(String(input));return Promise.reject(Error('M950 fixture blocks fetch'));}) as typeof fetch;
const originalOpen=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(_method:string,url:string|URL){networkCalls.push('xhr:'+String(url));throw Error('M950 fixture blocks XHR');} as typeof originalOpen;
const check=(condition:unknown,message:string)=>{assertions++;if(!condition)throw Error(message);};
const equal=(actual:unknown,expected:unknown,message:string)=>check(JSON.stringify(actual)===JSON.stringify(expected),message+'; actual='+JSON.stringify(actual)+' expected='+JSON.stringify(expected));
const tick=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
async function settle(){await act(async()=>{await tick();await tick();});}
async function wait(condition:()=>boolean,message:string){const start=performance.now();while(!condition()){if(performance.now()-start>5000)throw Error(message);await tick();}await settle();}
function Probe(){useEffect(()=>{lifecycle.mounts++;return()=>{lifecycle.cleanups++;};},[]);return null;}
const callbacks=():Omit<Candidate2ReviewFeedbackProps,'state'|'disabled'>=>({onCancelWait:()=>calls.push('cancel-wait'),onRetryDelivery:()=>calls.push('retry-delivery'),onReadSaved:()=>calls.push('read-saved'),onLoadLatest:()=>calls.push('load-latest'),onCompareDraft:()=>calls.push('compare-draft')});
const action=(name:string)=>container.querySelector<HTMLButtonElement>(`[data-c2-review-action="${name}"]`);
const panel=()=>container.querySelector<HTMLElement>('[data-c2-review-feedback]');
const content=()=>container.innerText;
async function mount(input:Candidate2ReviewFeedbackState,disabled=false){if(root)await act(async()=>root!.unmount());container.replaceChildren();root=createRoot(container);calls=[];await act(async()=>root!.render(<StrictMode><Probe/><Candidate2ReviewFeedback state={freeze(input)} disabled={disabled} {...callbacks()}/></StrictMode>));await settle();}
async function rerender(input:Candidate2ReviewFeedbackState,disabled=false){await act(async()=>root!.render(<StrictMode><Probe/><Candidate2ReviewFeedback state={freeze(input)} disabled={disabled} {...callbacks()}/></StrictMode>));await settle();}
async function click(name:string){const node=action(name);check(!!node,'Missing action '+name);await act(async()=>node!.click());await settle();}
async function tryClick(name:string){const node=action(name);if(node){await act(async()=>node.click());await settle();}}
async function key(key:'Tab'|'Enter'|'Space'){const request={sequence:++sequence,kind:'key' as const,key};window.__M950_CONTROL_REQUEST__=request;await wait(()=>window.__M950_CONTROL_ACK__===request.sequence,'Native key not delivered: '+key);}
async function viewport(width:320|390){const request={sequence:++sequence,kind:'viewport' as const,width};window.__M950_CONTROL_REQUEST__=request;await wait(()=>window.__M950_CONTROL_ACK__===request.sequence,'Viewport not applied: '+width);}
async function scenario(id:string,run:()=>Promise<void>){assertions=0;try{await run();cases.push({id,status:'passed',assertions,html:container.innerHTML,calls:clone(calls)});}catch(error){cases.push({id,status:'failed',assertions,error:error instanceof Error?error.stack:String(error),html:container.innerHTML,calls:clone(calls)});}}
const unavailableAction=(name:string)=>check(!action(name)||action(name)!.disabled,'Action must be absent or disabled: '+name);

async function run(){
 await scenario('idle-no-dispatch-dirty-is-not-save-proof',async()=>{
  const input=initial(),before=JSON.stringify(input);await mount(input);check(!!panel(),'Feedback selector absent');check(panel()!.dataset.phase==='idle','Wrong idle phase');equal(calls,[],'Mount dispatched');check(!container.querySelector('[data-c2-saved-summary],[data-c2-review-saved-summary]'),'Idle fabricated a saved summary');
  check(!/保存成功|已成功保存|复核已保存成功/.test(content()),'Idle dirty false claimed successful save');
  check(!container.querySelector('form,input,textarea,select,[contenteditable="true"]'),'Feedback added an editor or writer');check(JSON.stringify(input)===before,'Idle render mutated owner state');check(lifecycle.mounts>=2&&lifecycle.cleanups>=1,'StrictMode lifecycle not exercised');
 });
 await scenario('dirty-draft-manual-fields-separate-analysis',async()=>{
  const input=state({draftDirty:true,notice:'人工复核文字与收藏暂存在本地草稿。'}),before=JSON.stringify(input);await mount(input);
  check(content().includes('草稿'),'Dirty draft not described');check(/人工|复核|备注/.test(content()),'Manual review text scope missing');check(content().includes('收藏'),'Favorite manual scope missing');check(/原始分析|原分析|分析/.test(content())&&/评分|分数/.test(content()),'Original analysis and score boundary missing');
  for(const name of ['read-saved','load-latest','compare-draft','retry-delivery']){unavailableAction(name);await tryClick(name);}equal(calls,[],'Absent owner capabilities inferred from dirty state');check(JSON.stringify(input)===before,'Dirty display changed manual draft projection');
 });
 await scenario('pending-cancel-disabled-and-restart-independent',async()=>{
  const input=state({phase:'saving',requestPending:true,draftDirty:true,requiresRestart:false,notice:'正在等待已提交请求。'});await mount(input,true);
  check(!!action('cancel-wait')&&!action('cancel-wait')!.disabled,'Pending cancel locked by disabled');check(action('cancel-wait')!.textContent!.includes('停止等待'),'Cancel label does not communicate stop waiting');await click('cancel-wait');equal(calls,['cancel-wait'],'Cancel mixed with another event');
  check(!/后端已撤销|后端已取消|已删除保存结果/.test(content()),'Panel claims backend rollback');
  await rerender(state({...input,requiresRestart:true,notice:'原请求仍未结算，请保留草稿并重启。'}),true);check(!!action('cancel-wait')&&!action('cancel-wait')!.disabled,'Restart requirement lost pending cancel');await click('cancel-wait');equal(calls,['cancel-wait','cancel-wait'],'Restart cancellation dispatched wrong callback');
 });
 await scenario('read-saved-owner-capability-pending-disabled-gates',async()=>{
  const readable=state({phase:'reconcile',requiresReadback:true,draftDirty:true,canReadSaved:true,notice:'需要从已有读取路由核对。'});await mount(readable);check(!!action('read-saved')&&!action('read-saved')!.disabled,'Owner read capability not projected');await click('read-saved');equal(calls,['read-saved'],'Read action mixed with another callback');
  for(const [patch,externalDisabled] of [[{canReadSaved:false},false],[{requestPending:true},false],[{},true],[{requiresRestart:true},false]] as const){await rerender(state({...readable,...patch}),externalDisabled);unavailableAction('read-saved');await tryClick('read-saved');equal(calls,['read-saved'],'Blocked read capability dispatched');}
  await rerender(state({canReadSaved:true,canLoadLatest:true,canCompareDraft:true}));for(const name of ['read-saved','load-latest','compare-draft'])unavailableAction(name);equal(calls,['read-saved'],'Capabilities outside readback state dispatched');
 });
 await scenario('requires-restart-blocks-all-reconciliation-actions',async()=>{
  const input=state({phase:'reconcile',requiresRestart:true,requiresReadback:true,draftDirty:true,canReadSaved:true,canLoadLatest:true,canCompareDraft:true,canRetryDelivery:true,error:'返回状态需要重启后核对。',notice:'保留原草稿。'});await mount(input);
  check(content().includes('重启'),'Restart guidance absent');check(content().includes('草稿'),'Draft preservation guidance absent');
  for(const name of ['read-saved','load-latest','compare-draft','retry-delivery']){unavailableAction(name);await tryClick(name);}equal(calls,[],'Restart state emitted blocked action');
  await rerender(state({...input,phase:'delivering',requiresReadback:false}));unavailableAction('retry-delivery');await tryClick('retry-delivery');equal(calls,[],'Restart state emitted delivery retry');
 });
 await scenario('conflict-load-latest-and-compare-independent',async()=>{
  const error='C2_REVIEW_REVISION_CONFLICT: 固定冲突原文<&>。';
  const input=state({phase:'reconcile',draftDirty:false,canLoadLatest:true,canCompareDraft:true,error,notice:'上游已开放两个独立的处理入口。'});await mount(input);check(content().includes(error),'Public conflict error was changed');equal(calls,[],'Conflict caused automatic action');
  check(!!action('load-latest')&&!action('load-latest')!.disabled,'Owner load capability not projected');await click('load-latest');equal(calls,['load-latest'],'Load latest also compared or retried');
  check(!!action('compare-draft')&&!action('compare-draft')!.disabled,'Owner compare capability not projected');await click('compare-draft');equal(calls,['load-latest','compare-draft'],'Compare dispatched a different action');
  await rerender(state({...input,draftDirty:true,canLoadLatest:false,canCompareDraft:true,notice:'原草稿保留，先独立比对。'}));unavailableAction('load-latest');await tryClick('load-latest');equal(calls,['load-latest','compare-draft'],'Dirty guard inferred overwrite capability');
  const dirtyIntent=state({...input,draftDirty:true,canLoadLatest:true,notice:'上游已保留真实草稿确认路由，仅请求该路由处理。'}),before=JSON.stringify(dirtyIntent);await rerender(dirtyIntent);await click('load-latest');equal(calls,['load-latest','compare-draft','load-latest'],'Owner-authorized dirty intent was reinterpreted locally');check(JSON.stringify(dirtyIntent)===before,'Load intent overwrote controlled draft projection');
 });
 await scenario('delivery-retry-pure-and-reconcile-not-success-inference',async()=>{
  const failed=state({phase:'delivering',canRetryDelivery:true,error:'已返回回执交接失败。',notice:'上游保留固定回执。',draftDirty:true}),before=JSON.stringify(failed);await mount(failed);
  check(!!action('retry-delivery')&&!action('retry-delivery')!.disabled,'Delivery retry capability not projected');await click('retry-delivery');equal(calls,['retry-delivery'],'Delivery retry dispatched read/load/compare');check(JSON.stringify(failed)===before,'Delivery retry mutated fixed owner projection');
  await click('retry-delivery');equal(calls,['retry-delivery'],'Same fixed reply projection retried twice');
  await rerender(state({...failed,requestPending:true}));unavailableAction('retry-delivery');await tryClick('retry-delivery');equal(calls,['retry-delivery'],'Active handoff allowed retry');
  await rerender(state({...failed,requiresReadback:true}));unavailableAction('retry-delivery');await tryClick('retry-delivery');equal(calls,['retry-delivery'],'Required readback allowed delivery retry');
  const reconcile=state({phase:'reconcile',requiresReadback:true,draftDirty:true,error:'外部文字含“保存成功”，但状态仍需核对。',notice:'保留草稿，等待显式读取能力。'});await rerender(reconcile);check(panel()!.dataset.phase==='reconcile','Error string changed public phase');check(content().includes(reconcile.error!),'Supplied error not preserved');check(!container.querySelector('[data-c2-saved-summary],[data-c2-review-saved-summary]'),'Reconcile constructed a saved summary');unavailableAction('retry-delivery');check(!container.querySelector('[data-c2-review-action="save"],[data-c2-review-action="retry-save"]'),'Feedback added a write action');
  await rerender(state({phase:'ready',notice:'上游投影为已完成。'}));check(panel()!.dataset.phase==='ready','Ready owner projection not displayed');check(!container.querySelector('[data-c2-saved-summary],[data-c2-review-saved-summary]'),'Ready fabricated a session summary');check(!/来源已认证|sourceVerified|reviewRevision\s*[:=]/.test(content()),'Feedback fabricated provenance or CAS');
 });
 await scenario('native-keyboard-and-live-region',async()=>{
  const input=state({phase:'reconcile',requiresReadback:true,canReadSaved:true,notice:'可显式读取既有结果。'});await mount(input);
  check(!!container.querySelector('[aria-live="polite"],[aria-live="assertive"]'),'Feedback lacks live status');const labelled=panel()!.getAttribute('aria-labelledby');check(!!labelled&&!!document.getElementById(labelled),'Feedback has no accessible region title');
  check(action('read-saved')!.textContent!.trim().length>0,'Read action lacks accessible name');document.body.tabIndex=-1;document.body.focus();await key('Tab');check(document.activeElement===action('read-saved'),'Tab did not reach only enabled read action');await key('Enter');equal(calls,['read-saved'],'Native Enter did not read saved');
  await rerender(state({...input,notice:'新的上游反馈投影。'}));action('read-saved')!.focus();await key('Space');equal(calls,['read-saved','read-saved'],'Native Space did not activate read action');
  await rerender(state({phase:'saving',requestPending:true,notice:'请求等待中。'}),true);action('cancel-wait')!.focus();await key('Enter');equal(calls,['read-saved','read-saved','cancel-wait'],'Keyboard cannot cancel disabled pending wait');
 });
 await scenario('real-320-390-viewports-no-horizontal-overflow',async()=>{
  const long='m950-'+('a'.repeat(160));
  const inputs=[state({phase:'reconcile',draftDirty:true,requiresReadback:true,error:'这是需要保留原草稿并人工核对的较长冲突说明。'.repeat(7),notice:long}),state({phase:'saving',requestPending:true,requiresRestart:true,draftDirty:true,notice:'请保留原草稿并在请求结束后重启。'.repeat(5)}),state({phase:'ready',notice:long+'-ready-owner-projection'})];
  for(const width of [320,390] as const){await viewport(width);for(const [index,input] of inputs.entries()){await mount(input);await settle();const rect=panel()!.getBoundingClientRect(),measure={width,case:index,innerWidth,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,panelLeft:rect.left,panelRight:rect.right,panelWidth:rect.width};viewports.push(measure);check(innerWidth===width,'Actual Chromium viewport not '+width);check(document.documentElement.scrollWidth<=innerWidth+1,'Document horizontal overflow at '+width);check(rect.left>=-1&&rect.right<=innerWidth+1,'Panel exceeds viewport at '+width);}}
 });
 await scenario('zero-api-network-and-no-writer',async()=>{
  await mount(initial());equal(apiReads,0,'Feedback accessed window.api');equal(networkCalls,[],'Feedback attempted network');check(!container.querySelector('form,input,textarea,select,[contenteditable="true"]'),'Feedback rendered editable write payload');check(!container.querySelector('[data-c2-review-action="save"],[data-c2-review-action="retry-save"]'),'Feedback rendered writer callback');
 });
 if(root)await act(async()=>root!.unmount());
 window.__M950_RESULT__={scope:'Real isolated Electron Chromium + ReactDOM StrictMode; unique public feedback state fixtures and pure callbacks only; no real Service/Store save, readback, acceptance, or App route claim.',runtime:{userAgent:navigator.userAgent,strictMode:true,reactRoot:'react-dom/client.createRoot'},cases,apiReads,networkCalls,viewports};
}
run().catch(error=>{window.__M950_RESULT__={scope:'Isolated review feedback projection harness.',runtime:{userAgent:navigator.userAgent,strictMode:true,reactRoot:'react-dom/client.createRoot'},cases,apiReads,networkCalls,viewports,fatal:error instanceof Error?error.stack:String(error)};});
