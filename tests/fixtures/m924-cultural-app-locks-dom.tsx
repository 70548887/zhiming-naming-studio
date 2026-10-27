import React,{act,StrictMode,useLayoutEffect} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {App} from 'm924-actual-app';
import type {BirthProfile,NamingPreferences,GenerateResult,NamingSession} from '../../src/shared/types';
import type {CulturalWorkflowAPI} from '../../src/shared/cultural-workflow-api';
import type {CulturalComparisonSnapshot} from '../../src/shared/qimen-cultural-comparison';
import type {CulturalProviderOptions} from '../../src/shared/qimen-cultural-provider-v1';
import type {CulturalRevision,PreparedCulturalWrite} from '../../src/shared/cultural-storage-v3';
import {canonicalPlainJson} from '../../src/shared/plain-json';

import type {ReviewedDataSelection,ReviewedGenerateResult} from '../../src/shared/reviewed-naming-data';
import {reviewedDisplayFixture} from '../helpers/m924-reviewed-display-fixture';
type Method=keyof CulturalWorkflowAPI;
type Call={method:Method;args:unknown[]};
type Deferred<T>={promise:Promise<T>;resolve:(value:T)=>void;reject:(error:Error)=>void};
type Case={id:string;status:'passed'|'failed';assertions:number;error?:string;html:string;calls:Call[]};
type Seeds={sessions:NamingSession[];snapshots:Record<string,CulturalComparisonSnapshot>};
declare global{interface Window{__M924_APP_SEEDS__:Seeds;__M924_APP_RESULT__?:{scope:string;runtime:{userAgent:string;strictMode:boolean};cases:Case[];errors:string[];unhandled:string[];fatal?:string};}}
const clone=<T,>(value:T):T=>JSON.parse(JSON.stringify(value));
const deferred=<T,>():Deferred<T>=>{let resolve!:(value:T)=>void,reject!:(error:Error)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const host=document.getElementById('root')!;
let root:Root|undefined,assertions=0,currentCalls:Call[]=[];
const cases:Case[]=[],errors:string[]=[],unhandled:string[]=[];
window.addEventListener('error',event=>errors.push(event.message));
window.addEventListener('unhandledrejection',event=>unhandled.push(String(event.reason)));
const check=(condition:unknown,message:string)=>{assertions++;if(!condition)throw Error(message);};
const equal=(actual:unknown,expected:unknown,message:string)=>check(canonicalPlainJson(actual)===canonicalPlainJson(expected),message+'\nactual='+JSON.stringify(actual)+'\nexpected='+JSON.stringify(expected));
const tick=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
async function settle(){await act(async()=>{await tick();await tick();});}
async function wait(ready:()=>boolean,message:string){const started=performance.now();while(!ready()){if(performance.now()-started>5000)throw Error(message+'\nDOM='+host.innerText.slice(-5000));await settle();}await settle();}
const query=<T extends Element=HTMLElement>(selector:string)=>host.querySelector<T>(selector);
const nodes=<T extends Element=HTMLElement>(selector:string)=>[...host.querySelectorAll<T>(selector)];
const action=(name:string)=>query<HTMLButtonElement>('[data-cultural-app] [data-action="'+name+'"]');
const count=(name:Method)=>currentCalls.filter(call=>call.method===name).length;
const calls=(name:Method)=>currentCalls.filter(call=>call.method===name);
const busy=()=>query('main.main-area')?.getAttribute('aria-busy')==='true';
async function nativeClick(element:HTMLElement|null,message='Missing DOM action'){check(element,message);await act(async()=>{element!.click();});await settle();}
async function click(name:string){const button=action(name);check(button&&!button.matches(':disabled'),'Disabled/missing cultural action '+name);await nativeClick(button);}
async function clickText(text:string,selector='button'){const element=nodes<HTMLElement>(selector).find(node=>(node.textContent??'').trim()===text);await nativeClick(element??null,'Missing button '+text);}
function capturedClick(element:HTMLElement|null){check(element,'Missing captured click target');const key=Object.keys(element!).find(value=>value.startsWith('__reactProps$'));check(key,'Real ReactDOM handler metadata absent');const props=(element as unknown as Record<string,unknown>)[key!] as {onClick?:()=>void};check(typeof props.onClick==='function','No captured React onClick');return props.onClick!;}
async function invoke(handler:()=>void){await act(async()=>{handler();});await settle();}
async function setInput(selector:string,value:string){const input=query<HTMLInputElement>(selector);check(input,'Missing input '+selector);await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,value);input!.dispatchEvent(new Event('input',{bubbles:true}));input!.dispatchEvent(new Event('change',{bubbles:true}));});await settle();}
async function selectCandidates(session:NamingSession,indices=[0,1]){for(const index of indices)await nativeClick(query<HTMLInputElement>('[data-cultural-select="'+session.candidates[index].id+'"]'),'Missing saved candidate checkbox');await wait(()=>!!action('enable'),'Two saved refs did not expose the default-off panel');}
async function selectEvidence(){const selects=nodes<HTMLSelectElement>('[data-cultural-app] select[data-evidence]');check(selects.length===4,'Expected four actual evidence selectors');for(const select of selects){check(select.value==='','Evidence was selected implicitly');const option=[...select.options].find(value=>value.value);check(option,'Missing fixture evidence option');await act(async()=>{select.value=option!.value;select.dispatchEvent(new Event('change',{bubbles:true}));});await settle();}}
async function unmount(){if(root)await act(async()=>root!.unmount());root=undefined;await settle();}

function transport({missing=false,readOnly=false,version='customer-compact/3'}:{missing?:boolean;readOnly?:boolean;version?:'customer-compact/2'|'customer-compact/3'}={}){
 const sessions=clone(window.__M924_APP_SEEDS__.sessions),snapshots=clone(window.__M924_APP_SEEDS__.snapshots),trace:Call[]=[];currentCalls=trace;
 let storage=version,active=snapshots[sessions[0].id],prepared:PreparedCulturalWrite|undefined,lastNote='',headRevision=0;
 const paused=new Map<Method,Deferred<unknown>[]>(),failures=new Map<Method,Error[]>();
 const state={reviewedCalls:0,reviewedPending:deferred<ReviewedGenerateResult>(),reviewedInput:undefined as {profile:BirthProfile;preferences:NamingPreferences;selection:ReviewedDataSelection}|undefined,commitConflicts:0,generateCalls:0,saveCalls:0,generatePending:undefined as Deferred<GenerateResult>|undefined};
 const returned=<T,>(method:Method,args:unknown[],value:()=>T):Promise<T>=>{trace.push({method,args:clone(args)});const failure=failures.get(method)?.shift();if(failure)return Promise.reject(failure);const pending=paused.get(method)?.shift();return pending?pending.promise as Promise<T>:Promise.resolve(clone(value()));};
 const revision=(number:number):CulturalRevision=>({comparisonId:'m921-cultural-record',revision:number,profileId:active.anchor.ownerProfileId,parentRevision:number>1?number-1:null,operation:number===1?'create':'revise',restoredFromRevision:null,capsule:{sha:'a'.repeat(64),rawBytes:1,codec:'deflate-raw/1',role:'evidence'},result:{sha:'b'.repeat(64),rawBytes:1,codec:'deflate-raw/1',role:'revision-result'},createdAt:'2026-10-26T00:00:00Z'});
 const head=()=>({id:'m921-cultural-record',profileId:active.anchor.ownerProfileId,sourceSessionId:active.anchor.sourceSessionId,currentRevision:headRevision,reviewToken:'m921-cultural-review-'+headRevision,createdAt:'2026-10-26T00:00:00Z'});
 const committed=()=>({status:'committed' as const,committed:revision(++headRevision),currentHead:head(),requestSha:prepared!.requestSha});
 const api:CulturalWorkflowAPI={
  getCulturalStorageCapabilities:()=>returned('getCulturalStorageCapabilities',[],()=>({version:storage,hasRootLeafRefs:true,hasRevisionProfileId:true,hasCulturalTables:storage==='customer-compact/3'})),
  prepareCulturalBirthAnchor:request=>returned('prepareCulturalBirthAnchor',[request],()=>{if(request.kind!=='session'||!snapshots[request.sessionId])throw Error('Only a real saved-session fixture ref is permitted');active=snapshots[request.sessionId];const original=sessions.find(value=>value.id===request.sessionId)!;if(request.expectedReviewToken!==original.reviewToken)throw Error('Fixture review token mismatch');return{kind:'ok',value:{handle:'m921-anchor-handle',anchor:clone(active.anchor)}};}),
  getCulturalCharacterOptions:(handle,candidate)=>returned('getCulturalCharacterOptions',[handle,candidate],()=>{if(candidate.kind!=='saved')throw Error('Draft ref not allowed in App saved-session fixture');const original=active.candidates.find(value=>value.candidateRef===candidate.candidateId);if(!original)throw Error('Unknown saved candidate ref');const option:CulturalProviderOptions={candidateToken:'m921-token-'+candidate.candidateId,candidateRef:candidate.candidateId,anchorId:active.anchor.anchorId,selectionRevision:'m921-selection-1',givenName:original.givenName,fullName:original.fullName,positions:original.rows.map(row=>{const evidence=row.status==='mapped'?[{evidenceId:'m921-evidence-'+candidate.candidateId+'-'+row.position,position:row.position,char:row.char,pinyin:row.pinyin!,sourceState:'ready' as const,elements:row.elements,dictionarySense:row.dictionarySense,projectIntent:row.projectIntent}]:[];return{position:row.position,char:row.char,status:evidence.length?'options-available':'unknown-label',defaultEvidenceId:evidence[0]?.evidenceId??null,options:evidence};})};return{kind:'ok',value:option};}),
  previewCulturalComparison:(handle,request)=>returned('previewCulturalComparison',[handle,request],()=>({kind:'ok',value:{previewHandle:'m921-preview-handle',snapshot:clone(active),materialDigest:'d'.repeat(64)}})),
  prepareCulturalWrite:request=>returned('prepareCulturalWrite',[request],()=>{lastNote=request.note;prepared={ticket:'m921-ticket',ownerProfileId:request.ownerProfileId,idempotencyKey:request.idempotencyKey,requestSha:'e'.repeat(64),comparisonId:'m921-cultural-record',databaseGeneration:'m921-db-generation',expiresAt:'2099-01-01T00:00:00Z'};return prepared;}),
  commitCulturalWrite:request=>returned('commitCulturalWrite',[request],()=>state.commitConflicts-->0?{status:'conflict' as const,reason:'revision-conflict' as const}:committed()),
  readCulturalComparison:(id,number)=>returned('readCulturalComparison',number===undefined?[id]:[id,number],()=>({head:head(),revision:revision(number??headRevision),result:{schema:'qimen-cultural-revision/1.0.0',comparisonId:id,revision:number??headRevision,profileId:active.anchor.ownerProfileId,sourceSessionId:active.anchor.sourceSessionId,capsuleDigest:'c'.repeat(64),snapshot:clone(active),note:lastNote,noteAuthority:'human-note-only',createdAt:'2026-10-26T00:00:00Z',operation:'create',restoredFromRevision:null}})),
  listCulturalRevisions:id=>returned('listCulturalRevisions',[id],()=>Array.from({length:headRevision},(_,index)=>revision(headRevision-index))),
  restoreCulturalRevision:(...args)=>returned('restoreCulturalRevision',args,()=>committed()),
  previewCulturalStorageMigration:()=>returned('previewCulturalStorageMigration',[],()=>({from:storage,to:'customer-compact/3',counts:{profiles:2,sessions:2,namingRevisions:0,culturalHeads:0,culturalRevisions:0,culturalWriteReceipts:0},writes:0})),
  migrateCulturalStorage:()=>returned('migrateCulturalStorage',[],()=>{storage='customer-compact/3';return{version:storage,migrationRequired:false,bytes:1,maxPhysicalBytes:1000000,warning:false};}),
 };
 const studio={generateReviewed:(profile:BirthProfile,preferences:NamingPreferences,selection:ReviewedDataSelection)=>{state.reviewedCalls++;state.reviewedInput=clone({profile,preferences,selection});return state.reviewedPending.promise;},
  ...(missing?{}:api),
  bootstrap:async()=>({profiles:sessions.map(value=>clone(value.profile)),sessions:clone(sessions),settings:{studioName:'M921 DOM工作室',contact:'',logoDataUrl:'',apiBaseUrl:'',model:'',timeoutMs:45000,hasApiKey:false,useAi:false},sources:[],stats:{characters:100,citations:20,knowledge:20,dataVersion:'m921-fixture'},desktop:true,storageState:{version:storage,migrationRequired:readOnly,bytes:1,maxPhysicalBytes:1000000,warning:false}}),
  generate:async()=>{state.generateCalls++;return state.generatePending?state.generatePending.promise:{session:clone(sessions[0]),messages:[]};},
  saveProfile:async(profile:unknown)=>{state.saveCalls++;return clone(profile);},
  searchKnowledge:async()=>[],searchCharacters:async()=>[],
 };
 return{studio,sessions,snapshots,trace,state,readFixture:(id:string,number=1)=>({head:{...head(),currentRevision:Math.max(headRevision,number)},revision:revision(number),result:{schema:'qimen-cultural-revision/1.0.0',comparisonId:id,revision:number,profileId:active.anchor.ownerProfileId,sourceSessionId:active.anchor.sourceSessionId,capsuleDigest:'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',snapshot:clone(active),note:lastNote,noteAuthority:'human-note-only',createdAt:'2026-10-26T00:00:00Z',operation:'create',restoredFromRevision:null}}),pause:(method:Method)=>{const pending=deferred<unknown>();paused.set(method,[...(paused.get(method)??[]),pending]);return pending;},fail:(method:Method,message:string)=>failures.set(method,[...(failures.get(method)??[]),Error(message)]),committed};
}

async function mount(options:Parameters<typeof transport>[0]={}){
 await unmount();const stub=transport(options);window.studio=stub.studio as unknown as typeof window.studio;
 window.localStorage.setItem('studio.onboarding.v1',JSON.stringify({version:1,dismissed:true}));window.confirm=()=>true;
 host.replaceChildren();root=createRoot(host);let mounts=0,cleanups=0;
 function Probe(){useLayoutEffect(()=>{mounts++;return()=>{cleanups++;};},[]);return null;}
 await act(async()=>root!.render(<StrictMode><Probe/><App/></StrictMode>));await wait(()=>!!query('[data-cultural-app]'),'Actual App did not mount cultural entry');
 check(mounts===2&&cleanups===1,'Actual development StrictMode effects did not replay');
 return stub;
}
async function openSaved(stub:ReturnType<typeof transport>,index=0){const session=stub.sessions[index];const button=query<HTMLButtonElement>('button.catalog-item[title*="'+session.id+'"]');await nativeClick(button,'Actual App saved-session entry absent');await wait(()=>nodes('[data-cultural-select]').length===session.candidates.length,'Saved-session candidates not exposed by App');return session;}
async function prepared(stub:ReturnType<typeof transport>){const session=await openSaved(stub);await selectCandidates(session);await click('enable');await click('prepare');await wait(()=>nodes('[data-cultural-app] select[data-evidence]').length===4,'Actual App prepare did not finish');return session;}
async function compared(stub:ReturnType<typeof transport>){const session=await prepared(stub);await selectEvidence();await click('compare');await wait(()=>nodes('[data-cultural-app] [data-cultural-candidate]').length===2,'Actual App comparison missing');return session;}
async function scenario(id:string,work:()=>Promise<void>){const beforeErrors=errors.length,beforeUnhandled=unhandled.length;assertions=0;try{await work();check(errors.length===beforeErrors,'Window error: '+errors.slice(beforeErrors).join('\n'));check(unhandled.length===beforeUnhandled,'Unhandled rejection: '+unhandled.slice(beforeUnhandled).join('\n'));cases.push({id,status:'passed',assertions,html:host.innerHTML,calls:clone(currentCalls)});}catch(error){cases.push({id,status:'failed',assertions,error:error instanceof Error?error.stack:String(error),html:host.innerHTML,calls:clone(currentCalls)});}finally{await unmount();}}

const reviewedButton=()=>nodes<HTMLButtonElement>('.reviewed-data-panel button').find(button=>/按已选资料生成|重试生成|正在按所选资料生成/.test(button.textContent??''))??null;
async function startReviewed(stub:ReturnType<typeof transport>){
 await nativeClick(nodes<HTMLInputElement>('.reviewed-data-mode input[type="radio"]')[1],'Native reviewed mode radio');
 const button=reviewedButton();check(button&&!button.matches(':disabled'),'Reviewed native generate control is disabled');await nativeClick(button);
 await wait(()=>stub.state.reviewedCalls===1,'Actual reviewed bridge request was not dispatched');
 check(query('.reviewed-data-panel')?.getAttribute('aria-busy')==='true','Reviewed child pending state absent');
 check(busy(),'Root main did not synchronously reflect the reviewed request write lease');
}
async function rejectReviewed(stub:ReturnType<typeof transport>){await act(async()=>stub.state.reviewedPending.reject(Error('M924 controlled reviewed rejection')));await wait(()=>!busy(),'Underlying reviewed rejection did not release root lease');}
async function nativeTryBlocked(name:string,method:Method){
 const button=action(name);check(button,'Pending reviewed request removed the expected cultural action '+name);check(button!.matches(':disabled'),'Native cultural '+name+' action remains enabled while reviewed generation is pending');
 const before=count(method);await nativeClick(button);equal(count(method),before,'Ordinary disabled native click dispatched '+method);
}

async function run(){
 await scenario('reviewed-pending-native-commit-is-disabled-until-rejection-settles',async()=>{
  const stub=await mount();await compared(stub);await click('prepare-write');await wait(()=>!!action('commit'),'Prepared cultural commit missing');
  await startReviewed(stub);await nativeTryBlocked('commit','commitCulturalWrite');equal(count('commitCulturalWrite'),0,'Reviewed generation overlapped a native cultural commit');
  await rejectReviewed(stub);await click('commit');await wait(()=>count('commitCulturalWrite')===1,'Native cultural commit remained blocked after reviewed rejection');
 });
 await scenario('reviewed-pending-native-migration-is-disabled-until-request-settles',async()=>{
  const stub=await mount({version:'customer-compact/2'});await compared(stub);await click('migration-preview');await nativeClick(query('[data-consent="migration"]'),'Migration consent');
  await startReviewed(stub);await nativeTryBlocked('migrate','migrateCulturalStorage');equal(count('migrateCulturalStorage'),0,'Reviewed generation overlapped native migration');
  await rejectReviewed(stub);await click('migrate');await wait(()=>count('migrateCulturalStorage')===1,'Migration stayed blocked after reviewed settlement');
 });
 await scenario('reviewed-pending-native-restore-is-disabled-until-request-settles',async()=>{
  const stub=await mount();await compared(stub);await click('prepare-write');await click('commit');await wait(()=>!!query('[data-consent="restore"]'),'Saved record restore consent missing');await nativeClick(query('[data-consent="restore"]'),'Restore consent');
  await startReviewed(stub);await nativeTryBlocked('restore','restoreCulturalRevision');equal(count('restoreCulturalRevision'),0,'Reviewed generation overlapped native restore');
  await rejectReviewed(stub);await click('restore');await wait(()=>count('restoreCulturalRevision')===1,'Restore stayed blocked after reviewed settlement');
 });
 await scenario('reviewed-mode-cancel-and-child-unmount-hold-root-lease-until-physical-rejection',async()=>{
  const stub=await mount();const session=await openSaved(stub);await startReviewed(stub);
  const legacy=nodes<HTMLInputElement>('.reviewed-data-mode input[type="radio"]')[0];check(!legacy.matches(':disabled'),'Request owner cannot change its reviewed mode');await nativeClick(legacy,'Native cancellation by selecting legacy mode');check(busy(),'Mode change released the still-pending reviewed write lease');
  await clickText('客户档案','nav button');check(busy(),'Unmounting reviewed child released the physical request lease');
  await rejectReviewed(stub);await clickText('起名工作台','nav button');stub.state.generatePending=deferred<GenerateResult>();await nativeClick(query('button.generate-button'),'Legacy native generate after reviewed rejection');equal(stub.state.generateCalls,1,'Legacy generate did not recover after reviewed request settled');
  await act(async()=>stub.state.generatePending!.resolve({session:clone(session),messages:[]}));await wait(()=>!busy(),'Recovered legacy generation did not release its root lease');
 });
 await scenario('reviewed-display-valid-success-delivers-without-self-busy-invalidating-owner',async()=>{
  const stub=await mount();await openSaved(stub);await startReviewed(stub);check(stub.state.reviewedInput,'Reviewed request inputs were not captured');
  const {profile,preferences,selection}=stub.state.reviewedInput!;const result=reviewedDisplayFixture(stub.sessions[0],profile,preferences,selection);
  await act(async()=>stub.state.reviewedPending.resolve(result));await wait(()=>!busy(),'Successful reviewed response did not release its request lease');
  await wait(()=>!!query('.reviewed-data-provenance'),'Display-valid reviewed result was incorrectly retired by its own root busy state');
  check(query('.reviewed-data-provenance')!.textContent!.includes('本方案已审项目资料'),'Successful reviewed result provenance was not delivered');equal(stub.state.reviewedCalls,1,'Successful result caused duplicate generation');
 });
 for(const replacement of ['method','getter'] as const){
  await scenario(`same-object-${replacement}-replacement-rejects-pending-preview`,async()=>{
   const stub=await mount();await prepared(stub);await selectEvidence();const pending=stub.pause('previewCulturalComparison');await click('compare');const original=stub.studio.previewCulturalComparison;let getterReads=0;
   if(replacement==='method')stub.studio.previewCulturalComparison=(...args)=>original!(...args);
   else Object.defineProperty(stub.studio,'previewCulturalComparison',{configurable:true,enumerable:true,get(){getterReads++;return original;}});
   await act(async()=>pending.resolve({kind:'ok',value:{previewHandle:'m924-retired-preview',snapshot:stub.snapshots[stub.sessions[0].id],materialDigest:'d'.repeat(64)}}));await settle();
   equal(nodes('[data-cultural-app] [data-cultural-candidate]').length,0,'Same-object retired preview response reached the current UI');equal(getterReads,0,'API method identity guard invoked a replacement getter');
   check(!query('.cwf-preview'),'Retired bridge retained a current preview section');
  });
 }
 for(const replacement of ['method','getter'] as const){
  await scenario(`same-object-${replacement}-replacement-rejects-pending-saved-read`,async()=>{
   const stub=await mount();await compared(stub);await click('prepare-write');const pending=stub.pause('readCulturalComparison');await click('commit');await wait(()=>count('readCulturalComparison')===1,'Exact committed-record readback did not start');const original=stub.studio.readCulturalComparison;let getterReads=0;
   if(replacement==='method')stub.studio.readCulturalComparison=(...args)=>original!(...args);
   else Object.defineProperty(stub.studio,'readCulturalComparison',{configurable:true,enumerable:true,get(){getterReads++;return original;}});
   await act(async()=>pending.resolve(stub.readFixture('m921-cultural-record',1)));await settle();
   equal(nodes('.cwf-saved').length,0,'Same-object retired saved-read response was displayed');equal(count('listCulturalRevisions'),0,'Retired read response continued loading history');equal(getterReads,0,'Saved-read bridge identity guard evaluated a getter');
   check(!query('.cwf-saved'),'Retired saved read retained a current saved-record section');
  });
 }
 await scenario('whole-source-object-replacement-still-rejects-pending-preview',async()=>{
  const stub=await mount();await prepared(stub);await selectEvidence();const pending=stub.pause('previewCulturalComparison');await click('compare');window.studio={...stub.studio} as unknown as typeof window.studio;
  await act(async()=>pending.resolve({kind:'ok',value:{previewHandle:'m924-retired-object',snapshot:stub.snapshots[stub.sessions[0].id],materialDigest:'d'.repeat(64)}}));await settle();
  equal(nodes('[data-cultural-app] [data-cultural-candidate]').length,0,'Replacing the complete source object revived a pending old preview');
 });
 window.__M924_APP_RESULT__={scope:'Actual App source + development ReactDOM StrictMode and native Electron Chromium; explicit fixture bridge only. Valid reviewed-success fixture is checked by the unchanged production display-correlation validator; no Service/Store/source authenticity or IPC acceptance is claimed.',runtime:{userAgent:navigator.userAgent,strictMode:true},cases,errors,unhandled};
}
void run().catch(error=>{window.__M924_APP_RESULT__={scope:'M924 actual App native-DOM fixture boundary',runtime:{userAgent:navigator.userAgent,strictMode:true},cases,errors,unhandled,fatal:String(error?.stack??error)};});
