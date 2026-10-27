import React,{act,StrictMode} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {useCandidate2Review,type UseCandidate2ReviewOptions} from '../../src/renderer/use-candidate2-review';
import {createCulturalAppHost} from '../../src/renderer/cultural-workflow-app';
import {customerWriteNoticeFeed} from '../../src/renderer/customer-write-notice-feed';
import {CUSTOMER_WRITE_COMMITTED_NOTICE} from '../../src/shared/customer-write-notice';
import {captureCandidate2ReviewBase} from '../../src/renderer/candidate2-review-boundary';
import {candidate2GenerationFixture} from './m936-candidate2-generation';
import type {NamingSession} from '../../src/shared/types';

/** Actual hook in StrictMode with synthetic reads and review transport. The
 * test owner advances an epoch only after an explicit accepted validated read;
 * no native Store or backend restore/read qualification is established here. */
declare const __M982_ADOPTION_CASES__:string[];
type Case={id:string;status:'passed'|'failed';assertions:number;error?:string;html:string};
type Result={scope:string;runtime:{userAgent:string;strictMode:boolean};cases:Case[];errors:string[];unhandled:string[];fatal?:string};
declare global{interface Window{__M982_ADOPTION_RESULT__?:Result;}}
const clone=<T,>(value:T):T=>structuredClone(value);
function deferred<T>(){let resolve!:(value:T)=>void,reject!:(error:Error)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const container=document.getElementById('root')!,cases:Case[]=[],errors:string[]=[],unhandled:string[]=[];
window.addEventListener('error',event=>errors.push(event.message));window.addEventListener('unhandledrejection',event=>unhandled.push(String(event.reason)));
let assertions=0,currentRoot:Root|undefined;
const check=(condition:unknown,message:string)=>{assertions++;if(!condition)throw Error(message);};
const tick=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
async function settle(){await act(async()=>{await tick();await tick();});}
async function wait(ready:()=>boolean,message:string){const start=performance.now();while(!ready()){if(performance.now()-start>3500)throw Error(message+' '+container.textContent);await settle();}await settle();}
type Hook=ReturnType<typeof useCandidate2Review>;
async function setup(withKey=true){
 for(const item of customerWriteNoticeFeed?.getSnapshot()??[])customerWriteNoticeFeed?.dismiss(item.notice.id);
 const canonical=clone(candidate2GenerationFixture().result.session),pending=deferred<unknown>(),calls:unknown[][]=[];
 let readPending:ReturnType<typeof deferred<NamingSession>>|undefined,busy=false,owner=0,hook!:Hook;
 const source={reviewCandidate2:(...args:unknown[])=>{calls.push(clone(args));return pending.promise;},readSessionDetail:async()=>readPending?readPending.promise:clone(canonical)};
 const host=createCulturalAppHost({isBusy:()=>busy,setBusy:active=>{busy=active;}});
 let options:UseCandidate2ReviewOptions={canonicalSession:canonical,profileId:canonical.profileId,sessionCurrent:true,formDirty:false,storageReadOnly:false,contextKey:'A',getSource:()=>source,isContextCurrent:()=>true,host,prepareAdoption:async()=>{},adopt:()=>{},confirmLoad:action=>action(),...(withKey?{canonicalAdoptionKey:0}:{})};
 function Probe(){hook=useCandidate2Review(options);return<section><textarea data-adoption-note value={hook.draft?.reviewNote??''} onChange={event=>hook.editNote(event.target.value)}/><output>{JSON.stringify({dirty:hook.dirty,state:hook.state,pending:hook.pending,canSave:hook.canSave})}</output></section>;}
 const render=async(patch:Partial<UseCandidate2ReviewOptions>={})=>{options={...options,...patch};await act(async()=>currentRoot!.render(<StrictMode><Probe/></StrictMode>));await settle();};
 currentRoot=createRoot(container);await render();await wait(()=>!!hook.draft,'Owned base not loaded');
 const edit=async(value:string)=>{await act(async()=>hook.editNote(value));await settle();};
 const acceptedSameRead=async(confirmed:boolean)=>{
  if(!confirmed)return;const captured=owner,context=options.contextKey,read=captureCandidate2ReviewBase(await source.readSessionDetail());
  if(captured!==owner||context!==options.contextKey||hook.state.requiresRestart)return;
  await render({canonicalSession:read.session,canonicalAdoptionKey:Number(options.canonicalAdoptionKey??0)+1});
 };
 return{canonical,pending,calls,source,hook:()=>hook,render,edit,acceptedSameRead,getKey:()=>options.canonicalAdoptionKey,busy:()=>busy,readPending:()=>{readPending=deferred<NamingSession>();return readPending;},owner:()=>{owner++;},save:async()=>{await act(async()=>hook.save());await settle();},reject:async()=>{await act(async()=>pending.reject(Error('public save error')));await settle();}};
}
async function scenario(id:string,run:()=>Promise<void>){if(!__M982_ADOPTION_CASES__.includes(id))return;assertions=0;const e=errors.length,u=unhandled.length;try{await run();check(errors.length===e,'Window error');check(unhandled.length===u,'Unhandled rejection');cases.push({id,status:'passed',assertions,html:container.innerHTML});}catch(error){cases.push({id,status:'failed',assertions,error:error instanceof Error?error.stack:String(error),html:container.innerHTML});}finally{if(currentRoot){await act(async()=>currentRoot!.unmount());currentRoot=undefined;}await settle();}}
async function run(){
 await scenario('confirmed-same-bytes-canonical-adoption-clears-only-accepted-draft',async()=>{const a=await setup();await a.edit('人工草稿');check(a.hook().dirty,'Draft not dirty');await a.acceptedSameRead(false);check(a.hook().draft!.reviewNote==='人工草稿'&&a.getKey()===0,'Cancelled confirmation adopted');await a.acceptedSameRead(true);check(a.getKey()===1,'Actual accepted read did not advance epoch');check(!a.hook().dirty&&a.hook().draft!.reviewNote===a.canonical.reviewNote,'Same-bytes accepted adoption did not clear draft');check(a.calls.length===0,'Adoption wrote review');});
 await scenario('same-bytes-without-new-epoch-preserves-draft',async()=>{const a=await setup();await a.edit('保留文字');await a.render({canonicalSession:clone(a.canonical)});check(a.hook().draft!.reviewNote==='保留文字'&&a.hook().dirty,'Same-byte render cleared draft');check(a.getKey()===0&&a.calls.length===0,'Render advanced epoch or wrote');});
 await scenario('rejected-write-and-late-ABA-preserve-draft-and-consumed-read',async()=>{const a=await setup();await a.edit('失败原草稿');await a.save();await a.render({contextKey:'B'});await a.render({contextKey:'A'});await a.reject();check(a.hook().draft!.reviewNote==='失败原草稿','Late ABA cleared draft');check(a.getKey()===0&&!a.hook().canSave,'Failure advanced adoption or freed old read key');a.hook().save();await settle();check(a.calls.length===1,'Old credential was blindly resubmitted');});
 await scenario('cancelled-read-keeps-lease-and-does-not-adopt-epoch',async()=>{const a=await setup();await a.edit('读取取消草稿');await a.save();await a.reject();const pending=a.readPending();await act(async()=>a.hook().feedback.onReadSaved());await settle();check(a.busy(),'Read lease absent');await act(async()=>a.hook().feedback.onCancelWait());await settle();check(a.busy(),'Cancel released physical read lease');await act(async()=>pending.resolve(clone(a.canonical)));await wait(()=>!a.busy(),'Read lease did not settle');check(a.getKey()===0&&a.hook().dirty&&a.hook().draft!.reviewNote==='读取取消草稿','Cancelled read adopted or cleared');check(!a.hook().canSave,'Cancelled read unlocked consumed key');});
 await scenario('restart-notice-plus-epoch-cannot-unlock-or-clear-draft',async()=>{const a=await setup();await a.edit('收尾提醒草稿');await act(async()=>window.postMessage({type:'studio:customer-write-notice/1',source:'desktop',notice:{schema:'customer-write-notice/1',kind:'committed-cleanup',id:crypto.randomUUID(),sequence:1,message:CUSTOMER_WRITE_COMMITTED_NOTICE,requiresRestart:true}},'*'));await wait(()=>a.hook().state.requiresRestart,'Validated notice not delivered');await a.render({canonicalSession:clone(a.canonical),canonicalAdoptionKey:1});check(a.hook().state.requiresRestart&&!a.hook().canSave,'Epoch reset restart latch');check(a.hook().dirty&&a.hook().draft!.reviewNote==='收尾提醒草稿','Epoch discarded restart-protected draft');check(a.calls.length===0,'Notice or epoch wrote');});
 await scenario('ordinary-caller-without-optional-key-retains-previous-contract',async()=>{const a=await setup(false);await a.edit('旧调用草稿');await a.render({canonicalSession:clone(a.canonical)});check(a.getKey()===undefined&&a.hook().draft!.reviewNote==='旧调用草稿','Omitted optional key changed same-byte behavior');const next=clone(a.canonical);next.reviewNote='真实新canonical文字';next.reviewRevision++;next.reviewToken='22222222-2222-4222-8222-222222222222';await a.render({canonicalSession:next});check(!a.hook().dirty&&a.hook().draft!.reviewNote==='真实新canonical文字','Changed-byte old contract no longer adopted');});
 await scenario('restart-record-switch-isolates-retained-draft-and-keeps-same-owner-epoch',async()=>{
  const a=await setup();await a.edit('原记录人工草稿');
  await act(async()=>window.postMessage({type:'studio:customer-write-notice/1',source:'desktop',notice:{schema:'customer-write-notice/1',kind:'committed-cleanup',id:crypto.randomUUID(),sequence:1,message:CUSTOMER_WRITE_COMMITTED_NOTICE,requiresRestart:true}},'*'));
  await wait(()=>a.hook().state.requiresRestart,'Restart latch absent');
  await a.render({canonicalSession:clone(a.canonical),canonicalAdoptionKey:1});check(a.hook().draft!.reviewNote==='原记录人工草稿'&&a.hook().dirty,'Same-owner epoch cleared restart-retained draft');
  const b=clone(a.canonical);b.id='c2s_'+'c'.repeat(32);b.candidate2Naming.sessionBinding.sessionId=b.id;b.reviewNote='第二记录原保存意见';
  await a.render({canonicalSession:b,canonicalAdoptionKey:2});check(a.hook().draft!.reviewNote===b.reviewNote&&!a.hook().dirty,'Second record displayed first record draft');check(a.hook().state.requiresRestart&&!a.hook().canSave,'Record switch reset restart latch');
  await a.render({canonicalSession:clone(a.canonical),canonicalAdoptionKey:3});check(a.hook().draft!.reviewNote==='原记录人工草稿'&&a.hook().dirty,'Returning to original owner lost retained draft');
  await a.render({canonicalSession:null,canonicalAdoptionKey:4});check(a.hook().draft===null,'Non-C2 context exposed retained C2 draft');
  await a.render({canonicalSession:clone(a.canonical),canonicalAdoptionKey:5});check(a.hook().draft!.reviewNote==='原记录人工草稿'&&a.hook().state.requiresRestart&&!a.hook().canSave,'Ordinary navigation lost draft owner or released latch');check(a.calls.length===0,'Record navigation issued review writes');
 });
 window.__M982_ADOPTION_RESULT__={scope:'Actual review hook optional adoption epoch in ReactDOM StrictMode. Explicit synthetic read/review fixture only; no native history save or source admission.',runtime:{userAgent:navigator.userAgent,strictMode:true},cases,errors,unhandled};
}
void run().catch(error=>{window.__M982_ADOPTION_RESULT__={scope:'M982 review adoption hook probe',runtime:{userAgent:navigator.userAgent,strictMode:true},cases,errors,unhandled,fatal:error instanceof Error?error.stack:String(error)};});
