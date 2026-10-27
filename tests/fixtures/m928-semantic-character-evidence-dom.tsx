import React,{act,StrictMode,useEffect} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {SemanticCharacterEvidenceView,type SemanticCharacterEvidenceViewProps} from '../../src/renderer/SemanticCharacterEvidenceView';
import type {M928Seed} from '../helpers/m928-semantic-character-fixtures';

type BrowserCase={id:string;status:'passed'|'failed';assertions:number;error?:string;html:string};
declare global {interface Window {
 __M928_SEEDS__:Record<string,M928Seed>;
 __M928_RESULT__?:{scope:string;runtime:{userAgent:string;strictMode:boolean;reactRoot:string};cases:BrowserCase[];apiReads:number;networkCalls:string[];fatal?:string};
 __M928_KEYBOARD_REQUEST__?:{sequence:number;key:'Tab'|'Enter'|'Space'};
 __M928_KEYBOARD_ACK__?:number;
}}
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const clone=<T,>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
const container=document.getElementById('root')!;
const cases:BrowserCase[]=[],networkCalls:string[]=[];
let root:Root|undefined,assertions=0,apiReads=0,keySequence=0;
const lifecycle={mounts:0,cleanups:0};
Object.defineProperty(window,'api',{configurable:true,get(){apiReads++;return undefined;}});
window.fetch=((input:RequestInfo|URL)=>{networkCalls.push(String(input));return Promise.reject(Error('M928 fixture blocks fetch'));}) as typeof fetch;
const originalOpen=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(_method:string,url:string|URL){networkCalls.push('xhr:'+String(url));throw Error('M928 fixture blocks XHR');} as typeof originalOpen;
function Probe(){useEffect(()=>{lifecycle.mounts++;return()=>{lifecycle.cleanups++;};},[]);return null;}
const check=(condition:unknown,message:string)=>{assertions++;if(!condition)throw Error(message);};
const tick=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
async function settle(){await act(async()=>{await tick();await tick();});}
async function wait(condition:()=>boolean,message:string){const start=performance.now();while(!condition()){if(performance.now()-start>5000)throw Error(message);await tick();}await settle();}
function seed(key='local:安明'){return clone(window.__M928_SEEDS__[key]);}
async function mount(props:SemanticCharacterEvidenceViewProps){if(root)await act(async()=>root!.unmount());container.replaceChildren();root=createRoot(container);await act(async()=>root!.render(<StrictMode><Probe/><SemanticCharacterEvidenceView {...props} id="m928-browser"/></StrictMode>));await settle();}
async function rerender(props:SemanticCharacterEvidenceViewProps){await act(async()=>root!.render(<StrictMode><Probe/><SemanticCharacterEvidenceView {...props} id="m928-browser"/></StrictMode>));await settle();}
const text=()=>container.innerText;
const available=()=>container.querySelector('[data-semantic-character-evidence="available"]')!==null;
const unavailable=()=>container.querySelector('[data-semantic-character-evidence="unavailable"]')!==null;
const details=()=>[...container.querySelectorAll<HTMLDetailsElement>('details')];
async function nativeKey(key:'Tab'|'Enter'|'Space'){const sequence=++keySequence;window.__M928_KEYBOARD_REQUEST__={sequence,key};await wait(()=>window.__M928_KEYBOARD_ACK__===sequence,'Native keyboard '+key+' was not delivered');}
async function scenario(id:string,run:()=>Promise<void>){assertions=0;try{await run();cases.push({id,status:'passed',assertions,html:container.innerHTML});}catch(error){cases.push({id,status:'failed',assertions,error:error instanceof Error?error.stack:String(error),html:container.innerHTML});}}
function genericOnly(names:string[]){check(unavailable(),'Expected generic unavailable state');check(text().includes('当前单字说明不可用'),'Generic status text absent');check(!container.querySelector('[data-semantic-position]'),'Unavailable state retained a character row');check(!container.querySelector('details'),'Unavailable state retained details');for(const name of names)check(!text().includes(name),'Unavailable state disclosed '+name);}

async function run(){
 await scenario('strict-mount-real-local-ai',async()=>{
  const expected:[string,number,number][]=[['local:明',0,1],['local:安',1,1],['local:安明',1,2],['local:安安',2,2],['ai:明',0,1],['ai:安',1,1],['ai:安明',1,2],['ai:安安',2,2]];
  for(const [key,count,total] of expected){const input=seed(key),before=JSON.stringify(input);await mount(input);check(available(),'Actual '+key+' did not display');check(text().includes(input.candidate.fullName),'Current name missing');check(text().includes(count+'/'+total),'Actual occurrence count missing: '+key);check(container.querySelectorAll('[data-semantic-position]').length===total,'Wrong occurrence row count');if(count===0)check(text().includes('未采用本批新增说明'),'Zero adoption was described as adopted');check(details().every(node=>!node.open),'Details opened by default');check(JSON.stringify(input)===before,'Rendering mutated candidate, scores, warnings or receipt');}
  check(lifecycle.mounts>=2&&lifecycle.cleanups>=1,'Real StrictMode lifecycle probe was not exercised');
 });
 await scenario('separate-meanings-and-receipt-scope',async()=>{
  const input=seed();await mount(input);
  const first=container.querySelector('[data-semantic-position="0"]')!;
  check(first.textContent!.includes('候选原有通用字义'),'Baseline heading absent');
  check(first.textContent!.includes(input.candidate.characters[0].meaning),'Baseline source meaning absent');
  check(first.textContent!.includes(input.candidate.characters[0].sourceId),'Baseline source identity absent');
  check(first.textContent!.includes('本次采用的单字取意'),'Adopted project heading absent');
  const row=input.candidate.semanticAdoptionM923.rows[0];
  check(first.textContent!.includes(row.project!.meaning),'Actual project meaning absent');
  for(const limit of row.project!.limits)check(first.textContent!.includes(limit),'Actual limit absent');
  check(text().includes('整名含义需人工核对'),'Whole-name scope missing');
  check(!/来源已认证|来源认证通过|签名验证通过|已获整名授权/.test(text()),'Display claimed authentication');
  for(const detail of details())await act(async()=>{detail.open=true;});await settle();
  for(const value of [row.adoption!.pinyin,row.adoption!.senseId,row.adoption!.reviewId,row.adoption!.candidateCaseId,row.adoption!.familyId,row.adoption!.sourceId,row.adoption!.publicationVersion,row.adoption!.decisionVersion,row.adoption!.ruleVersion])check(text().includes(value),'Public receipt identity absent: '+value);
  check(text().includes('此公开回执未包含辞典原始释义全文'),'Raw dictionary scope absent');
 });
 await scenario('native-keyboard-details-accessibility',async()=>{
  const input=seed('local:安');await mount(input);
  const section=container.querySelector<HTMLElement>('[data-semantic-character-evidence]')!;
  const labelled=section.getAttribute('aria-labelledby');check(!!labelled&&!!document.getElementById(labelled),'Evidence region has no accessible name');
  const first=details()[0],summary=first?.querySelector('summary');check(!!summary&&summary.textContent!.trim().length>0,'Native disclosure summary missing');
  check(!first.open,'Disclosure opened by default');
  document.body.tabIndex=-1;document.body.focus();await nativeKey('Tab');
  check(document.activeElement===summary,'Tab did not reach first native summary');
  await nativeKey('Enter');check(first.open,'Native Enter did not open disclosure');
  await nativeKey('Space');check(!first.open,'Native Space did not close disclosure');
  check(!text().includes(input.candidate.semanticAdoptionM923.constraintContextSHA256),'Constraint hash visible in default surface');
  const technical=details().at(-1)!;technical.querySelector<HTMLElement>('summary')!.focus();await nativeKey('Enter');check(technical.open,'Technical disclosure did not open with Enter');
  check(text().includes(input.candidate.semanticAdoptionM923.constraintContextSHA256),'Technical constraint hash unavailable on expansion');
  check(text().includes(input.candidate.semanticAdoptionM923.constraintEngineId),'Technical engine unavailable on expansion');
 });
 await scenario('owner-switch-old-association-no-name-leak',async()=>{
  const first=seed('local:安'),second=seed('ai:安明');await mount(first);check(available(),'First owner did not display');
  second.current.contextKey='m928-owner-selection-epoch-2';second.association={status:'upstream-associated',...first.current};
  await rerender(second);genericOnly([first.candidate.fullName,second.candidate.fullName]);
  second.association={status:'upstream-associated',...second.current};await rerender(second);check(available(),'New matching owner declaration did not display');check(text().includes(second.candidate.fullName),'New current name absent');
  second.association={status:'pending'};await rerender(second);genericOnly([first.candidate.fullName,second.candidate.fullName]);
 });
 await scenario('malformed-retired-and-mismatch-no-leak',async()=>{
  const input=seed(),original=clone(input);
  const mutations:Array<(value:M928Seed)=>void>=[
   value=>{(value.candidate.semanticAdoptionM923 as unknown as Record<string,unknown>).schema='m921-m923-character-generation-snapshot/1';},
   value=>{value.candidate.semanticAdoptionM923.fullName='钱外客泄漏';},
   value=>{value.candidate.semanticAdoptionM923.rows[0].adoption!.candidateId='old-candidate';},
   value=>{value.candidate.semanticAdoptionM923.rows[0].adoption!.pinyin='wěi';},
   value=>{value.candidate.semanticAdoptionM923.rows[0].adoption!.tone=4;},
   value=>{value.current.contextKey='m928-unmatched-owner';},
   value=>{(value.candidate.semanticAdoptionM923 as unknown as Record<string,unknown>).rows=null;},
  ];
  for(const mutate of mutations){const changed=clone(original);mutate(changed);await mount(changed);genericOnly([original.candidate.fullName,'钱外客泄漏']);}
  await mount(original);check(available(),'Valid input did not recover after malformed input');
 });
 await scenario('read-only-no-api-network-or-score-controls',async()=>{
  const input=seed('local:安安'),before=JSON.stringify(input);await mount(input);
  for(const detail of details())await act(async()=>{detail.open=true;});await settle();
  check(!container.querySelector('button,input,textarea,select,form,[contenteditable="true"]'),'Read-only panel exposes editing or generation controls');
  check(!container.querySelector('[role="slider"],[role="spinbutton"],meter,progress'),'Panel exposes a score control');
  check(apiReads===0,'Panel accessed window.api');check(networkCalls.length===0,'Panel attempted network');
  check(JSON.stringify(input)===before,'Details interaction mutated original candidate');
 });
 if(root)await act(async()=>root!.unmount());
 window.__M928_RESULT__={scope:'Real Electron Chromium + ReactDOM StrictMode; Node-generated M923 samples; supplied association declaration tests display consistency, not upstream transport authentication.',runtime:{userAgent:navigator.userAgent,strictMode:true,reactRoot:'react-dom/client.createRoot'},cases,apiReads,networkCalls};
}
run().catch(error=>{window.__M928_RESULT__={scope:'Isolated read-only component DOM harness.',runtime:{userAgent:navigator.userAgent,strictMode:true,reactRoot:'react-dom/client.createRoot'},cases,apiReads,networkCalls,fatal:error instanceof Error?error.stack:String(error)};});
