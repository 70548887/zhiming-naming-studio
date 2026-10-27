import type {BirthProfile,NamingPreferences} from '../shared/types';
import type {ReviewedDataSelection,ReviewedGenerateResult,ReviewedNamingDataApi,ReviewedNameCandidate,ReviewedNamingSession} from '../shared/reviewed-naming-data';
import {canonicalPlainJson} from '../shared/plain-json';
import {namingInputKey} from '../shared/workflow';

export const REVIEWED_UI_METHOD:ReviewedDataSelection['method']='reviewed-naming-data/1.0.0';
type Theme=ReviewedDataSelection['semanticThemeIds'][number];
type ObjectChar=keyof ReviewedDataSelection['objectThemes'];
export const REVIEWED_SEMANTIC_CHOICES:readonly {id:Theme;label:string;note:string;givenNameLengths:readonly number[]}[]=[
 {id:'civic-homeland',label:'家国文化',note:'邦（bāng）· 单字或双字给名；不推定家族使命或未来成就。',givenNameLengths:[1,2]},
 {id:'water-bubbles',label:'水面小泡',note:'沫（mò）· 单字或双字给名；不泛指所有水景。',givenNameLengths:[1,2]},
 {id:'textile-ribbon',label:'青色丝带',note:'纶（lún）· 仅双字给名；不借用其他读音或义项。',givenNameLengths:[2]},
 {id:'agriculture',label:'耕种事业',note:'农（nóng）· 单字或双字给名；不推成事业结果承诺。',givenNameLengths:[1,2]},
 {id:'literary-artwork',label:'诗文书画作品',note:'作（zuò）· 仅双字给名；不据此认定文学才能。',givenNameLengths:[2]},
 {id:'herb-plant',label:'香草艾蒿',note:'萧（xiāo）· 仅双字给名；不保证健康或人格。',givenNameLengths:[2]},
];
export const REVIEWED_OBJECT_CHOICES:readonly {char:ObjectChar;theme:NonNullable<ReviewedDataSelection['objectThemes'][ObjectChar]>;label:string;note:string}[]=[
 {char:'川',theme:'river-object',label:'川 · 河流',note:'chuān · 限具体河流物象。'},
 {char:'石',theme:'mineral-stone-object',label:'石 · 矿物石',note:'shí · 岩石名词义，不采用 dàn 量词义。'},
 {char:'枝',theme:'tree-branch-object',label:'枝 · 树枝',note:'zhī · 树枝义，不采用 qí 读音。'},
 {char:'棉',theme:'cotton-plant-object',label:'棉 · 棉花植株',note:'mián · 棉类植物的具体物象。'},
 {char:'蕤',theme:'hanging-flower-object',label:'蕤 · 草木垂结之花',note:'ruí · 名词义，不采用首项“下垂”的形容义。'},
];
export type ReviewedDataUiChoice={mode:'legacy'}|{mode:'reviewed';selection:ReviewedDataSelection};
export const defaultReviewedDataChoice=():ReviewedDataUiChoice=>({mode:'legacy'});
export const emptyReviewedSelection=():ReviewedDataSelection=>({method:REVIEWED_UI_METHOD,semanticThemeIds:[],objectThemes:{}});
function ownJson<T>(value:T):T {
 const walk=(item:unknown):unknown=>{
  if(Array.isArray(item)){canonicalPlainJson(item);return structuredClone(item);}
  if(item&&typeof item==='object'){
   if(![Object.prototype,null].includes(Object.getPrototypeOf(item)))throw Error('plain');
   const out:Record<string,unknown>={};
   for(const key of Reflect.ownKeys(item)){
    const p=Object.getOwnPropertyDescriptor(item,key);if(typeof key!=='string'||!p||!Object.hasOwn(p,'value')||!p.enumerable)throw Error('property');
    if(p.value===undefined)continue;
    Object.defineProperty(out,key,{value:walk(p.value),enumerable:true,writable:true,configurable:true});
   }return out;
  }
  canonicalPlainJson(item);return item;
 };
 return walk(value) as T;
}
export function readReviewedUiSelection(choice:ReviewedDataUiChoice):ReviewedDataSelection|null {
 if(choice.mode==='legacy')return null;
 const source=ownJson(choice.selection);
 if(source.method!==REVIEWED_UI_METHOD||!Array.isArray(source.semanticThemeIds)||new Set(source.semanticThemeIds).size!==source.semanticThemeIds.length||source.semanticThemeIds.some(theme=>!REVIEWED_SEMANTIC_CHOICES.some(row=>row.id===theme))||!source.objectThemes||typeof source.objectThemes!=='object')throw Error('资料主题选择无效。');
 for(const [char,theme]of Object.entries(source.objectThemes))if(!REVIEWED_OBJECT_CHOICES.some(row=>row.char===char&&row.theme===theme))throw Error('精确物象主题选择无效。');
 return {method:REVIEWED_UI_METHOD,semanticThemeIds:REVIEWED_SEMANTIC_CHOICES.filter(row=>source.semanticThemeIds.includes(row.id)).map(row=>row.id),objectThemes:{...source.objectThemes}};
}
export interface ReviewedDataGenerationContext {profile:BirthProfile;preferences:NamingPreferences;revision?:number;blockedReason?:string;}
type GenerateMethod=ReviewedNamingDataApi['generateReviewed'];
export interface ReviewedGenerationFrame {owner:BirthProfile;contextKey:string;api:ReviewedNamingDataApi|undefined;method:GenerateMethod|undefined;disabled:boolean;}
export interface ReviewedDataUiState {choice:ReviewedDataUiChoice;phase:'idle'|'generating'|'delivering'|'ready'|'error';frame:ReviewedGenerationFrame;requestPending?:boolean;errorKind?:'input'|'request'|'response'|'handoff';notice?:string;sessionId?:string;}
export interface ReviewedResultLease {isCurrent:()=>boolean;}
export interface ReviewedGenerationBindings {
 initialChoice?:ReviewedDataUiChoice;
 getContext:()=>ReviewedDataGenerationContext;getApi:()=>ReviewedNamingDataApi|undefined;isDisabled?:()=>boolean;
 onGenerated:(result:ReviewedGenerateResult,lease:ReviewedResultLease)=>void|Promise<void>;
 onSelectionChange?:(choice:ReviewedDataUiChoice)=>void;
}
function method(api:ReviewedNamingDataApi|undefined):GenerateMethod|undefined {
 try{const p=api&&Object.getOwnPropertyDescriptor(api,'generateReviewed');return p&&Object.hasOwn(p,'value')&&typeof p.value==='function'?p.value:undefined;}catch{return undefined;}
}
export function readReviewedGenerationFrame(context:ReviewedDataGenerationContext,api:ReviewedNamingDataApi|undefined,disabled=false):ReviewedGenerationFrame {
 let contextKey='invalid';try{contextKey=canonicalPlainJson(ownJson(context));}catch{/* Reject malformed drafts without dispatch. */}
 return {owner:context.profile,contextKey,api,method:method(api),disabled};
}
const same=(a:ReviewedGenerationFrame,b:ReviewedGenerationFrame)=>a.owner===b.owner&&a.contextKey===b.contextKey&&a.api===b.api&&a.method===b.method&&a.disabled===b.disabled;
export function currentReviewedDataUiState(state:ReviewedDataUiState,frame:ReviewedGenerationFrame):ReviewedDataUiState {
 return same(state.frame,frame)?state:{choice:state.choice,frame,phase:'idle',requestPending:state.requestPending,notice:'资料或连接已改变，旧生成回包不会替换当前草稿。'};
}
/** Display correlation only; backend Store/verifier owns actual adoption and saved authenticity. */
export function isReviewedSessionDisplayShape(value:unknown):value is ReviewedNamingSession {
 const record=(v:unknown):v is Record<string,any>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const texts=(v:unknown)=>Array.isArray(v)&&v.every(item=>typeof item==='string');
 const project=(v:unknown)=>v===null||record(v)&&typeof v.meaning==='string'&&texts(v.limits);
 try{
  if(!record(value)||typeof value.id!=='string'||typeof value.profileId!=='string'||!record(value.profile)||value.profile.id!==value.profileId||!record(value.reviewedData)||!Array.isArray(value.candidates))return false;
  const addon=value.reviewedData;
  if(addon.method!==REVIEWED_UI_METHOD||!record(addon.binding)||addon.binding.sessionId!==value.id||addon.binding.profileId!==value.profileId||!record(addon.publication)||addon.publication.publicationId!==REVIEWED_UI_METHOD||!Array.isArray(addon.candidateBindings)||addon.candidateBindings.length!==value.candidates.length)return false;
  readReviewedUiSelection({mode:'reviewed',selection:addon.selection});
  return value.candidates.every((candidate:unknown,index:number)=>{
   if(!record(candidate)||!['id','givenName','fullName','pinyin','meaning'].every(key=>typeof candidate[key]==='string')||!Array.isArray(candidate.characters)||!candidate.characters.every((row:unknown)=>record(row)&&typeof row.char==='string'&&typeof row.meaning==='string'))return false;
   const use=candidate.reviewedDataUse,bound=addon.candidateBindings[index];
   if(!record(use)||use.method!==REVIEWED_UI_METHOD||!record(use.binding)||use.binding.sessionId!==value.id||use.binding.candidateId!==candidate.id||use.binding.candidateIndex!==index||use.binding.givenName!==candidate.givenName||use.binding.fullName!==candidate.fullName||!record(bound)||bound.candidateId!==candidate.id||bound.candidateIndex!==index)return false;
   if(!record(use.semantic)||!Array.isArray(use.semantic.rows)||!record(use.imagery)||!Array.isArray(use.imagery.rows))return false;
   const semantic=use.semantic.rows.every((row:unknown)=>record(row)&&Number.isSafeInteger(row.position)&&row.position>=0&&row.position<candidate.characters.length&&row.char===candidate.characters[row.position].char&&typeof row.pinyin==='string'&&['adopted','not-adopted'].includes(row.adoptionStatus)&&record(row.qualification)&&typeof row.qualification.status==='string'&&typeof row.qualification.reasonCode==='string'&&project(row.project)&&(row.adoptionStatus==='adopted'?record(row.adoption)&&row.project!==null:row.adoption===null));
   const imagery=use.imagery.rows.every((row:unknown)=>record(row)&&Number.isSafeInteger(row.position)&&row.position>=1&&row.position<=candidate.characters.length&&row.char===candidate.characters[row.position-1].char&&typeof row.pinyin==='string'&&Array.isArray(row.effectiveElements)&&row.effectiveElements.every((element:unknown)=>['木','火','土','金','水'].includes(String(element)))&&(row.mapping===null||record(row.mapping)&&['eligible','theme-required'].includes(row.mapping.status)&&typeof row.mapping.condition==='string'));
   return semantic&&imagery;
  });
 }catch{return false;}
}
export function matchesReviewedGenerateResult(value:unknown,profile:BirthProfile,selection:ReviewedDataSelection,preferences?:NamingPreferences):value is ReviewedGenerateResult {
 try{
  const result=value as ReviewedGenerateResult,session=result?.session;
  if(!isReviewedSessionDisplayShape(session)||session.profileId!==profile.id||!Array.isArray(result.messages)||!result.messages.every(text=>typeof text==='string')||canonicalPlainJson(readReviewedUiSelection({mode:'reviewed',selection:session.reviewedData.selection}))!==canonicalPlainJson(selection))return false;
  if(preferences&&namingInputKey(session.profile,session.preferences)!==namingInputKey(profile,preferences))return false;
  return (session.candidates as readonly ReviewedNameCandidate[]).every((candidate,index)=>candidate?.reviewedDataUse?.method===REVIEWED_UI_METHOD&&candidate.reviewedDataUse.binding.candidateId===candidate.id&&candidate.reviewedDataUse.binding.sessionId===session.id&&candidate.reviewedDataUse.binding.candidateIndex===index&&candidate.reviewedDataUse.binding.givenName===candidate.givenName&&candidate.reviewedDataUse.binding.fullName===candidate.fullName);
 }catch{return false;}
}
export function createReviewedDataUiController(bindings:ReviewedGenerationBindings){
 let alive=false,serial=0,inFlight=false,retryResult:ReviewedGenerateResult|undefined;
 const frame=()=>readReviewedGenerationFrame(bindings.getContext(),bindings.getApi(),bindings.isDisabled?.()??false);
 let state:ReviewedDataUiState={choice:bindings.initialChoice?ownJson(bindings.initialChoice):defaultReviewedDataChoice(),phase:'idle',frame:frame()};
 const listeners=new Set<()=>void>(),publish=(next:ReviewedDataUiState)=>{state={...next,requestPending:inFlight};for(const listener of listeners)listener();};
 const choose=(choice:ReviewedDataUiChoice)=>{readReviewedUiSelection(choice);serial++;retryResult=undefined;publish({choice:ownJson(choice),phase:'idle',frame:frame(),notice:'选择已改变；主题意图不等于实际采用或保存许可。'});bindings.onSelectionChange?.(ownJson(choice));};
 return {
  getSnapshot:()=>state,subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};},activate:()=>{alive=true;},dispose:()=>{alive=false;serial++;retryResult=undefined;state={choice:state.choice,phase:'idle',frame:frame(),requestPending:inFlight};},
  refresh:()=>{const next=frame();if(!same(state.frame,next)){serial++;retryResult=undefined;publish({choice:state.choice,phase:'idle',frame:next,notice:'资料或连接已改变，旧回包不会替换当前草稿。'});}},
  setMode:(mode:ReviewedDataUiChoice['mode'])=>choose(mode==='legacy'?{mode:'legacy'}:{mode:'reviewed',selection:state.choice.mode==='reviewed'?state.choice.selection:emptyReviewedSelection()}),
  setSemanticTheme:(id:Theme,enabled:boolean)=>{const selection=readReviewedUiSelection(state.choice);if(!selection)return;choose({mode:'reviewed',selection:{...selection,semanticThemeIds:enabled?[...new Set([...selection.semanticThemeIds,id])]:selection.semanticThemeIds.filter(item=>item!==id)}});},
  setObjectTheme:(char:ObjectChar,enabled:boolean)=>{const selection=readReviewedUiSelection(state.choice),row=REVIEWED_OBJECT_CHOICES.find(item=>item.char===char);if(!selection||!row)return;const objectThemes=enabled?{...selection.objectThemes,[char]:row.theme}:{...selection.objectThemes};if(!enabled)delete objectThemes[char];choose({mode:'reviewed',selection:{...selection,objectThemes}});},
  getSelection:()=>readReviewedUiSelection(state.choice),
  generate:async()=>{
   const next=frame(),selection=readReviewedUiSelection(state.choice);if(!selection)return 'legacy-path' as const;
   if(!alive||inFlight||next.disabled||!next.api||!next.method)return 'blocked' as const;
   let context:ReviewedDataGenerationContext;
   try{context=ownJson(bindings.getContext());if(next.contextKey==='invalid'||!context.profile.id||context.blockedReason||context.preferences.elementAssessment||context.preferences.imageryReading||context.preferences.namingElementMethod)throw Error('input');}catch{publish({...state,frame:next,phase:'error',errorKind:'input',notice:'当前资料或功能组合尚不适用，请核对出生资料与命名取法；未替换草稿。'});return 'failed' as const;}
   const token=++serial,choice=ownJson(state.choice),owns=()=>alive&&serial===token&&same(next,frame());inFlight=true;
   try{
    let result=retryResult;
    if(!result){publish({choice,frame:next,phase:'generating'});if(!owns())return 'superseded' as const;
     try{result=await next.method.call(next.api,context.profile,context.preferences,selection);}catch{if(owns())publish({choice,frame:next,phase:'error',errorKind:'request',notice:'生成未完成，当前资料和选择已保留；可以重试。'});return 'failed' as const;}
    }
    if(!owns())return 'superseded' as const;
    if(!matchesReviewedGenerateResult(result,context.profile,selection,context.preferences)){publish({choice,frame:next,phase:'error',errorKind:'response',notice:'返回方案与本次资料或选择不一致，当前草稿未替换；请读取最新方案核对。'});return 'failed' as const;}
    retryResult=result;publish({choice,frame:next,phase:'delivering',sessionId:result.session.id});if(!owns())return 'superseded' as const;
    try{await bindings.onGenerated(result,{isCurrent:owns});}catch{if(owns())publish({choice,frame:next,phase:'error',errorKind:'handoff',sessionId:result.session.id,notice:'方案已返回，但界面接收未完成；重试只重新接收，不再次生成。'});return 'failed' as const;}
    if(owns()){retryResult=undefined;publish({choice,frame:next,phase:'ready',sessionId:result.session.id,notice:'本次方案已返回。实际采用与来源请以父层读取的后端结果为准。'});return 'delivered' as const;}
    return 'superseded' as const;
   }finally{inFlight=false;if(alive)publish({...state,requestPending:false});}
  },
 };
}
export type ReviewedDataUiController=ReturnType<typeof createReviewedDataUiController>;
