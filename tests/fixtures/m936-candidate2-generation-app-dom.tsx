import React,{act,StrictMode,useLayoutEffect} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {App} from 'm936-candidate2-actual-app';
import type {BirthProfile,NamingSession} from '../../src/shared/types';
import type {Candidate2GenerateSavedResult} from '../../src/shared/candidate2-generation-api';
import {CANDIDATE2_NAMING_SELECTION} from '../../src/shared/candidate2-naming-consumer-v1';
import {canonicalPlainJson} from '../../src/shared/plain-json';
import {candidate2GenerationFixture} from './m936-candidate2-generation';
import {catalogSession} from './catalog-session';

/** Full product App/Panel/hook source with explicit synthetic transports only.
 * No HTTP route, native Store save, saved source authentication or real
 * customer database is exercised by this renderer integration fixture. */
type Deferred<T>={promise:Promise<T>;resolve:(value:T)=>void;reject:(error:Error)=>void};
type Call={method:string;args:unknown[]};
type Case={id:string;status:'passed'|'failed';assertions:number;error?:string;html:string;calls:Call[]};
type Result={scope:string;runtime:{userAgent:string;strictMode:boolean};cases:Case[];errors:string[];unhandled:string[];fatal?:string};
declare global {interface Window {__M936_C2_APP_RESULT__?:Result;}}
declare const __M936_C2_APP_CASES__:string[];
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const clone=<T,>(value:T):T=>structuredClone(value);
const deferred=<T,>():Deferred<T>=>{let resolve!:(value:T)=>void,reject!:(error:Error)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const rootElement=document.getElementById('root')!;
const errors:string[]=[],unhandled:string[]=[],cases:Case[]=[];
window.addEventListener('error',event=>errors.push(event.message));
window.addEventListener('unhandledrejection',event=>unhandled.push(String(event.reason)));
let root:Root|undefined,assertions=0,currentCalls:Call[]=[];
const check=(condition:unknown,message:string)=>{assertions++;if(!condition)throw Error(message);};
const equal=(actual:unknown,expected:unknown,message:string)=>check(canonicalPlainJson(actual)===canonicalPlainJson(expected),message+'\nactual='+JSON.stringify(actual)+'\nexpected='+JSON.stringify(expected));
const tick=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
async function settle(){await act(async()=>{await tick();await tick();});}
async function wait(ready:()=>boolean,message:string){const began=performance.now();while(!ready()){if(performance.now()-began>4500)throw Error(message+'\nDOM='+document.body.innerText.slice(-6500));await settle();}await settle();}
const query=<T extends Element=HTMLElement>(selector:string)=>rootElement.querySelector<T>(selector);
const all=<T extends Element=HTMLElement>(selector:string,scope:ParentNode=rootElement)=>[...scope.querySelectorAll<T>(selector)];
const panel=()=>query<HTMLElement>('[data-c2-generation-panel]');
const action=(name:string)=>query<HTMLElement>('[data-c2-generation-panel] [data-c2-action="'+name+'"]');
const phase=()=>panel()?.getAttribute('data-phase');
const rootBusy=()=>query('main.main-area')?.getAttribute('aria-busy')==='true';
const count=(name:string)=>currentCalls.filter(call=>call.method===name).length;
const calls=(name:string)=>currentCalls.filter(call=>call.method===name);
async function nativeClick(element:HTMLElement|null,message='Missing native control',{allowDisabled=false}={}){check(element,message);if(!allowDisabled)check(!element!.matches(':disabled'),'Disabled control: '+message);await act(async()=>element!.click());await settle();}
async function clickText(text:string,selector='button',scope:ParentNode=rootElement){const button=all<HTMLElement>(selector,scope).find(node=>(node.textContent??'').trim()===text);await nativeClick(button??null,'button '+text);}
async function setField(selector:string,value:string){const input=query<HTMLInputElement|HTMLTextAreaElement>(selector);check(input,'Input missing '+selector);await act(async()=>{const prototype=input instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value')!.set!.call(input,value);input!.dispatchEvent(new Event('input',{bubbles:true}));input!.dispatchEvent(new Event('change',{bubbles:true}));});await settle();}
async function unmount(){if(root){await act(async()=>root!.unmount());root=undefined;}await settle();}
const genericWrites=['saveSession','updateNumerology','updateYueReading','updateElementAssessment','recordModernPracticalEvidence','clearModernPracticalEvidence','updateMeaningContext','restoreHistory','exportReport'];
function transport({missing=false,readOnly=false}:{missing?:boolean;readOnly?:boolean}={}){
 const fixture=candidate2GenerationFixture(),profiles:BirthProfile[]=[clone(fixture.profile),{...clone(fixture.profile),id:'m936-other-baby',customerName:'另一宝宝',birthDate:'2026-10-18'}];
 const original=catalogSession('m936-ui-legacy-session','2026-10-26T10:00:00Z',fixture.profile.id);original.profile=clone(fixture.profile);original.preferences=clone(fixture.preferences);original.reviewRevision=1;original.reviewToken='22222222-2222-4222-8222-222222222222';original.analysis.bazi.favorable=['火'];original.originalFavorable=['火'];original.analysis.bazi.version='m936-old-legacy-analysis';
 const sessions:NamingSession[]=[clone(original)],trace:Call[]=[];currentCalls=trace;
 const state={pending:deferred<Candidate2GenerateSavedResult>(),saveCalls:0,bootstrapCalls:0,pendingSave:undefined as Deferred<BirthProfile>|undefined};
 const summary=(session:NamingSession)=>({id:session.id,profileId:session.profileId,createdAt:session.createdAt,reviewNote:session.reviewNote,dataVersion:session.dataVersion,profile:{id:session.profileId,customerName:session.profile.customerName,surname:session.profile.surname},candidateCount:session.candidates.length,favoriteCount:session.candidates.filter(row=>row.favorite).length,candidateFactsVerified:false as const});
 const page=()=>({items:sessions.map(summary),total:sessions.length,matched:sessions.length,customers:profiles.map(profile=>({id:profile.id,label:profile.customerName})),profileCounts:Object.fromEntries(profiles.map(profile=>[profile.id,sessions.filter(session=>session.profileId===profile.id).length]))});
 const record=(method:string,args:unknown[])=>trace.push({method,args:clone(args)});
 const writes=Object.fromEntries(genericWrites.map(method=>[method,(...args:unknown[])=>{record(method,args);return Promise.reject(Error('Generic writer must not be used for candidate2 saved sessions'));}]));
 const studio={...writes,
  bootstrap:async()=>{state.bootstrapCalls++;return {profiles:clone(profiles),sessions:clone(sessions),sessionCatalog:page(),settings:{studioName:'M936 App synthetic transport',contact:'',logoDataUrl:'',apiBaseUrl:'',model:'',timeoutMs:45000,hasApiKey:false,useAi:false},sources:[],stats:{characters:100,citations:20,knowledge:20,dataVersion:'m936-app-fixture'},desktop:true,storageState:{version:'customer-compact/3',migrationRequired:readOnly,bytes:1,maxPhysicalBytes:1000000,warning:false}};},
  listSessionCatalog:async(input:unknown)=>{record('listSessionCatalog',[input]);return page();},
  readSessionDetail:async(id:string)=>{record('readSessionDetail',[id]);return clone(sessions.find(session=>session.id===id)??null);},
  saveProfile:async(profile:BirthProfile)=>{record('saveProfile',[profile]);state.saveCalls++;const saved=state.pendingSave?await state.pendingSave.promise:clone(profile);const index=profiles.findIndex(row=>row.id===saved.id);if(index<0)profiles.push(clone(saved));else profiles[index]=clone(saved);return clone(saved);},
  generate:async(...args:unknown[])=>{record('generate',args);return {session:clone(original),messages:[]};},
  generateReviewed:async(...args:unknown[])=>{record('generateReviewed',args);throw Error('Ordinary reviewed route is not the candidate2 generator');},
  listHistory:async(id:string)=>{record('listHistory',[id]);return [];},
  analyze:async(profile:BirthProfile)=>{record('analyze',[profile]);return clone(original.analysis);},
  getMeaningContextOptions:async(...args:unknown[])=>{record('getMeaningContextOptions',args);throw Error('Synthetic readonly display has no meaning editor data');},
  listCulturalComparisons:async(ownerProfileId:string,request:unknown)=>{record('listCulturalComparisons',[ownerProfileId,request]);return {schema:'cultural-comparison-catalog/1',ownerProfileId,storageVersion:'customer-compact/3',limit:10,order:'comparison-id-desc',factsAuthenticated:false,sourceAuthority:'not-authenticated-facts',status:'available',items:[]};},
  searchKnowledge:async()=>[],searchCharacters:async()=>[],
  ...(!missing?{generateCandidate2:function(this:unknown,...args:unknown[]){check(this===studio,'Candidate2 API lost original studio receiver');record('generateCandidate2',args);return state.pending.promise.then(result=>{const index=sessions.findIndex(session=>session.id===result.session.id);if(index<0)sessions.unshift(clone(result.session));else sessions[index]=clone(result.session);return result;});}}:{}),
 };
 return {fixture,profiles,sessions,original,studio,state,trace,resolve:async()=>{await act(async()=>state.pending.resolve(clone(fixture.result)));},reject:async(error:Error)=>{await act(async()=>state.pending.reject(error));}};
}
async function mount(options:Parameters<typeof transport>[0]={}){
 await unmount();const stub=transport(options);window.studio=stub.studio as unknown as typeof window.studio;
 window.localStorage.setItem('studio.onboarding.v1',JSON.stringify({version:1,dismissed:true}));window.confirm=()=>true;
 rootElement.replaceChildren();root=createRoot(rootElement);let setups=0,cleanups=0;
 function StrictProbe(){useLayoutEffect(()=>{setups++;return()=>{cleanups++;};},[]);return null;}
 await act(async()=>root!.render(<StrictMode><StrictProbe/><App/></StrictMode>));await wait(()=>!!panel(),'Actual App did not import/mount the generation Panel');check(setups===2&&cleanups===1,'Actual App StrictMode replay did not occur');return stub;
}
async function openProfile(stub:ReturnType<typeof transport>,index=0){await clickText('客户档案','nav button');const card=all<HTMLElement>('.customer-card').find(value=>value.textContent?.includes(stub.profiles[index].customerName));check(card,'Saved profile card absent');const open=card?all<HTMLElement>('button',card).find(value=>value.textContent?.trim().startsWith('打开档案')):undefined;await nativeClick(open??null,'open actual saved profile');await wait(()=>query<HTMLInputElement>('#birth-surname')?.value===stub.profiles[index].surname,'Saved profile was not applied');}
async function openLegacySession(stub:ReturnType<typeof transport>){await nativeClick(query('button.catalog-item[title*="'+stub.original.id+'"]'),'actual saved legacy session');await wait(()=>!!query('.current-session-label'),'Legacy baseline session was not applied');}
async function enable(){await nativeClick(action('enable'),'explicit candidate2 opt-in');}
async function generate(){await nativeClick(action('generate'),'independent exact-three candidate2 generate');}
async function dismissDialog(){const close=document.body.querySelector<HTMLElement>('[role="dialog"] button[aria-label="关闭"]');check(close,'Modal close control missing');await nativeClick(close,'close details portal');}
async function scenario(id:string,run:()=>Promise<void>){if(__M936_C2_APP_CASES__.length&&!__M936_C2_APP_CASES__.includes(id))return;assertions=0;const beforeErrors=errors.length,beforeUnhandled=unhandled.length;try{await run();check(errors.length===beforeErrors,'Window errors '+errors.slice(beforeErrors).join('\n'));check(unhandled.length===beforeUnhandled,'Unhandled '+unhandled.slice(beforeUnhandled).join('\n'));cases.push({id,status:'passed',assertions,html:document.body.innerHTML,calls:clone(currentCalls)});}catch(error){cases.push({id,status:'failed',assertions,error:error instanceof Error?error.stack:String(error),html:document.body.innerHTML,calls:clone(currentCalls)});}finally{await unmount();}}

async function run(){
 await scenario('actual-app-default-off-explicit-enable-zero-calls-and-exact-three-success',async()=>{
  const stub=await mount();equal(count('generateCandidate2'),0,'App mount generated');await openProfile(stub);equal(count('generateCandidate2'),0,'Saved profile open generated');await enable();equal(count('generateCandidate2'),0,'Opt-in generated automatically');check(phase()==='idle','Canonical saved profile was not eligible for an explicit request');await generate();equal(calls('generateCandidate2')[0].args,[stub.fixture.profile.id,stub.fixture.preferences,CANDIDATE2_NAMING_SELECTION],'App failed exact-three saved owner/raw prefs/fixed selection');check(rootBusy(),'Actual request did not own root lease');await stub.resolve();await wait(()=>!!query('[data-c2-session-readonly]'),'Returned C2 footprint was not delivered to actual App');await wait(()=>phase()==='ready','Successful C2 result did not reach ready');check(!rootBusy(),'Successful request/handoff left root locked');equal(all('.name-card h3').map(node=>node.textContent),stub.fixture.result.session.candidates.map(candidate=>candidate.fullName),'App reordered/substituted returned candidates');equal(count('generate'),0,'Success fell back to ordinary generation');equal(count('generateReviewed'),0,'Success merged reviewed generation');check(query('[data-c2-saved-summary]')?.textContent?.includes(stub.fixture.result.session.id),'Raw saved session identity missing');
 });
 await scenario('returned-analysis-scores-and-original-favorable-stay-canonical-with-generic-writers-readonly',async()=>{
  // Since M950, enabled review controls stage an owned local draft. This fixture
  // intentionally has no reviewCandidate2 route: no explicit or implicit review
  // save may reach an ordinary writer or mutate its in-memory saved canonical.
  const stub=await mount();await openLegacySession(stub);
  check(query('.session-summary')!.textContent!.includes('火'),'Legacy baseline favorable missing');
  await enable();await generate();await stub.resolve();
  await wait(()=>!!query('[data-c2-session-readonly]')&&!rootBusy(),'C2 result not adopted or handoff still pending');
  const original=clone(stub.fixture.result.session),originalJson=canonicalPlainJson(original);
  const saved=()=>stub.sessions.find(session=>session.id===original.id) as typeof original|undefined;
  const reviewFeedback=()=>document.body.querySelector<HTMLElement>('[data-c2-review-feedback]');
  const assertUnwritten=(stage:string)=>{
   equal(saved(),original,stage+': saved canonical changed before a dedicated review save');
   equal(canonicalPlainJson(stub.fixture.result.session),originalJson,stage+': original transport reply was mutated');
   equal(saved()!.analysis,original.analysis,stage+': original analysis changed');
   equal(saved()!.originalFavorable,original.originalFavorable,stage+': original favorable changed');
   equal(saved()!.candidates.map(candidate=>candidate.evaluation),original.candidates.map(candidate=>candidate.evaluation),stage+': candidate scores changed');
   equal(saved()!.candidate2Naming,original.candidate2Naming,stage+': C2 footprint changed');
   for(const method of [...genericWrites,'generate','generateReviewed','saveProfile','analyze','reviewCandidate2','listHistory'])equal(count(method),0,stage+': unexpected writer/history dispatch '+method);
   equal(count('generateCandidate2'),1,stage+': local review edit generated another batch');
   check(!rootBusy(),stage+': draft edit acquired a write lease');
  };
  check(!Object.hasOwn(stub.studio,'reviewCandidate2'),'Fixture unexpectedly supplied a dedicated review route');
  check(reviewFeedback()?.getAttribute('data-phase')==='unavailable','Missing dedicated review route was not unavailable');
  check(query('.session-summary')!.textContent!.includes(original.analysis.bazi.favorable.join('、')),'App retained legacy favorable instead of raw result');
  assertUnwritten('after generation');

  const favorites=all<HTMLButtonElement>('.favorite-button');
  check(favorites.length===original.candidates.length&&favorites.every(button=>!button.disabled),'Local favorite draft controls should be reachable');
  await nativeClick(favorites[0],'stage favorite without saving');
  check(all<HTMLButtonElement>('.favorite-button')[0].classList.contains('saved')===!original.candidates[0].favorite,'Favorite click did not change the local draft display');
  check(!!reviewFeedback()?.querySelector('.c2rf-draft'),'Favorite change was not reported as an unsaved draft');
  assertUnwritten('after favorite click');

  await nativeClick(query('.name-detail-link'),'open original candidate detail');
  await wait(()=>!!document.body.querySelector('.detail-hero'),'Detail portal absent');
  const labels:Record<string,string>={sound:'音韵顺畅',meaning:'语义匹配',simplicity:'读写便利',traditional:'传统参考',distinctiveness:'辨识度'};
  const displayed=Object.fromEntries(all<HTMLElement>('.evaluation-grid > div',document.body).map(node=>[node.querySelector('span')!.textContent,Number(node.querySelector('strong')!.textContent)]));
  equal(displayed,Object.fromEntries(Object.entries(original.candidates[0].evaluation).map(([key,value])=>[labels[key],value])),'Displayed candidate scores differ from their original labeled dimensions');
  await clickText('编辑寓意与依据','button',document.body);
  for(const [field,value] of [['meaning','  本地人工寓意\n保留空白  '],['reason','本地推荐理由草稿'],['traditionalReason','本地传统备注草稿'],['reviewNote','本地候选意见草稿']] as const){
   const textarea=document.body.querySelector<HTMLTextAreaElement>('[data-c2-review-field="'+field+'"]');
   check(textarea&&!textarea.disabled,'Allowed review text was not locally editable: '+field);
   await act(async()=>{Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')!.set!.call(textarea,value);textarea!.dispatchEvent(new Event('input',{bubbles:true}));textarea!.dispatchEvent(new Event('change',{bubbles:true}));});await settle();
   equal(document.body.querySelector<HTMLTextAreaElement>('[data-c2-review-field="'+field+'"]')!.value,value,'Local review text was not retained: '+field);
  }
  equal(document.body.querySelector('.detail-hero > p')!.textContent,original.candidates[0].meaning,'Editing draft changed canonical candidate description');
  const detailWrites=all<HTMLButtonElement>('.candidate-review-actions button',document.body);
  check(detailWrites.length>0&&detailWrites.every(button=>button.disabled),'Missing dedicated route enabled explicit candidate review save');
  for(const button of detailWrites)await nativeClick(button,'unavailable candidate save',{allowDisabled:true});
  assertUnwritten('after four text edits and unavailable save');
  await dismissDialog();

  await clickText('八字与五行','nav button');await wait(()=>!!query('.favorable-tags'),'Actual bazi view absent');
  check(query('.favorable-tags')!.textContent!.includes('原结果 '+original.originalFavorable.join('、')),'Original favorable was not preserved from raw session');
  check(query('.version-line')!.textContent!.includes(original.analysis.bazi.version),'Actual analysis version was changed');
  const water=query<HTMLButtonElement>('[data-c2-review-element="水"]');check(water&&!water.disabled,'Manual review element draft was not editable');
  const selectedBefore=water!.getAttribute('aria-pressed');await nativeClick(water,'stage manual element draft');
  check(query('[data-c2-review-element="水"]')!.getAttribute('aria-pressed')!==selectedBefore,'Manual element draft did not change locally');
  const elementSave=query<HTMLButtonElement>('[data-c2-review-save="elements"]');check(elementSave?.disabled,'Missing dedicated route enabled explicit element review save');
  await nativeClick(elementSave,'unavailable element review save',{allowDisabled:true});
  assertUnwritten('after manual element draft');

  await clickText('方案与报告','nav button');await setField('[data-c2-review-field="session-note"]','本地批次意见草稿');
  const reportButtons=all<HTMLButtonElement>('.report-paper button').filter(button=>/保存方案意见|审阅历史/.test(button.textContent??''));
  check(reportButtons.length===2&&reportButtons.every(button=>button.disabled),'Unavailable review save or ordinary history remained enabled');
  for(const button of reportButtons)await nativeClick(button,'unavailable report save/history',{allowDisabled:true});
  const exportButton=all<HTMLButtonElement>('button').find(button=>button.textContent?.includes('导出 PDF 报告'));
  check(exportButton?.disabled,'Generic C2 export remained enabled');await nativeClick(exportButton??null,'disabled export',{allowDisabled:true});
  assertUnwritten('after overall note and disabled report/history/export');
  check(reviewFeedback()?.getAttribute('data-phase')==='unavailable','Draft editing promoted missing review route into saved/available');
  check(!!reviewFeedback()?.querySelector('.c2rf-draft'),'Unsaved draft status was lost across pages');
 });
 await scenario('missing-route-and-real-unavailable-reply-never-fall-back-to-ordinary-generate',async()=>{
  let stub=await mount({missing:true});await openProfile(stub);await enable();check(phase()==='unavailable','Missing own method not unavailable');check(action('generate')!.matches(':disabled'),'Missing API could generate');equal(count('generateCandidate2'),0,'Missing route created a synthetic call');equal(count('generate'),0,'Missing route ordinary fallback');stub=await mount();await openProfile(stub);await enable();await generate();await stub.reject(Error('404 CANDIDATE2_NATIVE_ENTRY_UNAVAILABLE: route candidate not installed'));await wait(()=>phase()==='unavailable','Unavailable backend reply not visible');equal(count('generate'),0,'Unavailable route used ordinary fallback');equal(count('generateReviewed'),0,'Unavailable route used reviewed fallback');check(!query('[data-c2-session-readonly]')&&!query('[data-c2-saved-summary]'),'Unavailable route fabricated ready saved result');
 });
 await scenario('unsaved-profile-blocks-until-explicit-save-response-and-fresh-opt-in',async()=>{
  const stub=await mount();await enable();check(phase()==='blocked'&&action('generate')!.matches(':disabled'),'Blank unsaved profile generated');equal(count('generateCandidate2'),0,'Unsaved profile dispatched');await setField('#birth-surname','林');await setField('#birth-date','2026-10-17');await clickText('保存档案');await wait(()=>count('saveProfile')===1&&!rootBusy(),'Explicit save response not accepted');check(!query<HTMLInputElement>('[data-c2-action="enable"]')!.checked,'Save silently retained/promoted old opt-in');await enable();check(!action('generate')!.matches(':disabled'),'Explicitly saved canonical profile could not choose generation');await generate();equal(calls('generateCandidate2')[0].args[0],calls('saveProfile')[0].args[0]&&((calls('saveProfile')[0].args[0] as BirthProfile).id),'New saved profile ID did not flow to exact request');await stub.reject(Error('controlled pending end after request observation'));
 });
 await scenario('dirty-saved-profile-must-save-and-reconfirm-without-rewriting-original-flags',async()=>{
  const stub=await mount();await openProfile(stub);await setField('textarea[placeholder="记录家庭故事、特别期待……"]','M936 exact newly saved notes');await enable();check(phase()==='blocked','Dirty full profile bypassed saved canonical gate');equal(count('generateCandidate2'),0,'Dirty profile dispatched');await clickText('保存档案');await wait(()=>count('saveProfile')===1&&!rootBusy(),'Saved draft response did not settle');check(!query<HTMLInputElement>('[data-c2-action="enable"]')!.checked,'Saving promoted generation mode automatically');await enable();await generate();const submitted=calls('generateCandidate2')[0].args;equal(submitted.length,3,'Dirty saved retry did not use exact-three');equal(submitted[1],stub.fixture.preferences,'Saving notes rewrote original preference flags');equal((calls('saveProfile')[0].args[0] as BirthProfile).notes,'M936 exact newly saved notes','Explicit source save changed note value');await stub.reject(Error('controlled new canonical request observation'));
 });
 await scenario('ordinary-reviewed-generation-modes-are-exclusive-but-cultural-catalog-stays-independent',async()=>{
  const stub=await mount();await openProfile(stub);await enable();check(query<HTMLButtonElement>('button.generate-button')!.disabled,'Ordinary generate remained enabled in C2 mode');await nativeClick(query('button.generate-button'),'ordinary disabled',{allowDisabled:true});await clickText('起名偏好');const reviewedRadios=all<HTMLInputElement>('.reviewed-data-mode input[type="radio"]');check(reviewedRadios.length===2&&reviewedRadios.every(radio=>radio.matches(':disabled')),'Reviewed generation selector remained native-enabled in C2 mode');await nativeClick(reviewedRadios[1],'disabled reviewed mode',{allowDisabled:true});const openCatalog=query<HTMLElement>('[data-cultural-saved-catalog] [data-catalog-action="open"]');check(openCatalog&&!openCatalog.matches(':disabled'),'Independent cultural catalog was blocked by C2 opt-in');await nativeClick(openCatalog,'independent saved cultural catalog');await wait(()=>count('listCulturalComparisons')===1,'Independent catalog did not read explicitly');equal(count('generate'),0,'Exclusive C2 mode dispatched ordinary generate');equal(count('generateReviewed'),0,'Exclusive C2 mode dispatched reviewed generate');equal(count('generateCandidate2'),0,'Independent catalog auto-generated');await nativeClick(action('enable'),'turn C2 off');await nativeClick(reviewedRadios[1],'explicit reviewed mode');check(query<HTMLInputElement>('[data-c2-action="enable"]')!.disabled,'Reviewed mode did not block C2 opt-in');check(query<HTMLButtonElement>('button.generate-button')!.disabled,'Reviewed mode allowed ordinary generate');
 });
 await scenario('pending-native-cancel-remains-reachable-and-keeps-root-lease-until-late-reply-settles',async()=>{
  const stub=await mount();await openLegacySession(stub);await enable();await generate();await wait(rootBusy,'C2 pending root lease missing');check(action('cancel')&&!action('cancel')!.matches(':disabled'),'Native cancel was locked by root busy');check(query<HTMLButtonElement>('button.generate-button')!.disabled,'Root ordinary writer remained enabled while C2 pending');await nativeClick(action('cancel'),'native stop waiting');check(rootBusy(),'Native cancel released an unsettled physical request');check(!query<HTMLInputElement>('[data-c2-action="enable"]')!.checked,'Cancel retained C2 opt-in');await nativeClick(query('button.generate-button'),'ordinary pending disabled',{allowDisabled:true});equal(count('generate'),0,'Another native writer dispatched during stopped wait');await stub.resolve();await wait(()=>!rootBusy(),'Actual settlement did not release root lease');check(!query('[data-c2-session-readonly]')&&!query('[data-c2-saved-summary]'),'Cancelled late saved reply was adopted');check(query('.session-summary')!.textContent!.includes('火'),'Late reply replaced the original displayed analysis');
 });
 await scenario('pending-input-A-B-A-and-route-owner-change-do-not-adopt-old-saved-replies',async()=>{
  let stub=await mount();await openProfile(stub);await enable();await generate();const oldNotes=query<HTMLTextAreaElement>('textarea[placeholder="记录家庭故事、特别期待……"]')!.value;await setField('textarea[placeholder="记录家庭故事、特别期待……"]',oldNotes+' temporary B');await setField('textarea[placeholder="记录家庭故事、特别期待……"]',oldNotes);await stub.resolve();await wait(()=>!rootBusy(),'A-B-A physical request did not settle');check(!query('[data-c2-session-readonly]')&&!query('[data-c2-saved-summary]'),'A-B-A revived old reply');stub=await mount();await openProfile(stub);await enable();await generate();await clickText('客户档案','nav button');check(rootBusy(),'Route change released pending root writer');await stub.resolve();await wait(()=>!rootBusy(),'Retired route request did not settle');const card=all<HTMLElement>('.customer-card').find(value=>value.textContent?.includes(stub.profiles[1].customerName));const open=card?all<HTMLElement>('button',card).find(value=>value.textContent?.trim().startsWith('打开档案')):undefined;await nativeClick(open??null,'second owner after physical settlement');check(!query('[data-c2-session-readonly]')&&!query('[data-c2-saved-summary]'),'Late first-owner result appeared after owner switch');check(!query<HTMLInputElement>('[data-c2-action="enable"]')!.checked,'Owner switch revived old opt-in');
 });
 await scenario('live-method-getter-or-source-replacement-without-render-rejects-old-result',async()=>{
  for(const replacement of ['method','getter','source'] as const){const stub=await mount();await openProfile(stub);await enable();await generate();let getterCalls=0;const original=stub.studio.generateCandidate2;if(replacement==='method')stub.studio.generateCandidate2=function(...args:unknown[]){return original!.apply(stub.studio,args);};if(replacement==='getter')Object.defineProperty(stub.studio,'generateCandidate2',{configurable:true,enumerable:true,get(){getterCalls++;return original;}});if(replacement==='source')window.studio={...stub.studio} as unknown as typeof window.studio;await stub.resolve();await wait(()=>!rootBusy(),'Rebound physical request did not settle');check(!query('[data-c2-session-readonly]')&&!query('[data-c2-saved-summary]'),'Live rebound source delivered stale raw reply');equal(getterCalls,0,'Own-method guard executed replacement getter');equal(count('generateCandidate2'),1,'Source replacement created extra calls');}
 });
 await scenario('old-storage-readonly-cannot-dispatch-generation-or-auto-migration',async()=>{
  const stub=await mount({readOnly:true});await openProfile(stub);await enable();check(phase()==='blocked','Read-only storage not blocked');check(panel()!.textContent!.includes('只读'),'Read-only reason not visible');await nativeClick(action('generate'),'readonly disabled generate',{allowDisabled:true});equal(count('generateCandidate2'),0,'Read-only UI dispatched candidate2 generation');equal(count('generate'),0,'Read-only candidate2 fallback');equal(count('saveProfile'),0,'Read-only opt-in saved automatically');check(!query('[data-c2-saved-summary]'),'Read-only opt-in fabricated ready summary');
 });
 window.__M936_C2_APP_RESULT__={scope:'Actual App, product Candidate2GenerationPanel and generation hook/controller in development ReactDOM StrictMode/native Electron DOM; explicit synthetic bootstrap/generation/catalog transport only. No real generateCandidate2 route/native Store save/source-authentication or complete backend acceptance.',runtime:{userAgent:navigator.userAgent,strictMode:true},cases,errors,unhandled};
}
void run().catch(error=>{window.__M936_C2_APP_RESULT__={scope:'M936 actual App native DOM with explicit synthetic transport only.',runtime:{userAgent:navigator.userAgent,strictMode:true},cases,errors,unhandled,fatal:error instanceof Error?error.stack:String(error)};});
