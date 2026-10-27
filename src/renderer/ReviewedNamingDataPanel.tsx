import React,{useId,useLayoutEffect,useRef,useSyncExternalStore} from 'react';
import type {BirthProfile,NamingPreferences} from '../shared/types';
import type {ReviewedGenerateResult,ReviewedNamingDataApi} from '../shared/reviewed-naming-data';
import {createReviewedDataUiController,currentReviewedDataUiState,readReviewedGenerationFrame,REVIEWED_OBJECT_CHOICES,REVIEWED_SEMANTIC_CHOICES,type ReviewedDataUiChoice,type ReviewedDataUiController,type ReviewedDataUiState,type ReviewedResultLease} from './reviewed-naming-data-state';
import './reviewed-naming-data.css';

export interface ReviewedNamingDataPanelProps {
 profile:BirthProfile;preferences:NamingPreferences;api?:ReviewedNamingDataApi;disabled?:boolean;contextRevision?:number;blockedReason?:string;initialChoice?:ReviewedDataUiChoice;
 onGenerated:(result:ReviewedGenerateResult,lease:ReviewedResultLease)=>void|Promise<void>;beforeGenerate?:()=>boolean|Promise<boolean>;
 onSelectionChange?:(choice:ReviewedDataUiChoice)=>void;
}
export function ReviewedNamingDataPanel({profile,preferences,api,disabled=false,contextRevision,blockedReason,initialChoice,onGenerated,onSelectionChange,beforeGenerate}:ReviewedNamingDataPanelProps){
 const latest=useRef({profile,preferences,api,disabled,contextRevision,blockedReason,initialChoice,onGenerated,onSelectionChange,beforeGenerate});latest.current={profile,preferences,api,disabled,contextRevision,blockedReason,initialChoice,onGenerated,onSelectionChange,beforeGenerate};
 const context=()=>({profile:latest.current.profile,preferences:latest.current.preferences,revision:latest.current.contextRevision,blockedReason:latest.current.blockedReason});
 const owned=useRef<ReviewedDataUiController|null>(null);
 if(!owned.current)owned.current=createReviewedDataUiController({initialChoice:latest.current.initialChoice,getContext:context,getApi:()=>latest.current.api,isDisabled:()=>latest.current.disabled,onGenerated:(result,lease)=>latest.current.onGenerated(result,lease),onSelectionChange:choice=>latest.current.onSelectionChange?.(choice)});
 const controller=owned.current,stored=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
 const frame=readReviewedGenerationFrame(context(),api,disabled),state=currentReviewedDataUiState(stored,frame),id=useId();
 useLayoutEffect(()=>{controller.activate();return()=>controller.dispose();},[controller]);
 useLayoutEffect(()=>controller.refresh(),[controller,profile,frame.contextKey,api,frame.method,disabled]);
 return <ReviewedNamingDataSelector id={id} state={state} controller={controller} blockedReason={blockedReason} givenNameLength={preferences.length} beforeGenerate={beforeGenerate}/>;
}
export function ReviewedNamingDataSelector({id,state,controller,blockedReason,givenNameLength,beforeGenerate}:{id:string;state:ReviewedDataUiState;controller:ReviewedDataUiController;blockedReason?:string;givenNameLength?:1|2;beforeGenerate?:()=>boolean|Promise<boolean>}){
 const reviewed=state.choice.mode==='reviewed',selection=state.choice.mode==='reviewed'?state.choice.selection:null;
 const working=state.requestPending===true||state.phase==='generating'||state.phase==='delivering',disabled=state.frame.disabled||working;
 return <section className="reviewed-data-panel" aria-labelledby={id+'-title'} aria-busy={working}>
  <header><p className="reviewed-data-eyebrow">资料采用 · 显式选择</p><h3 id={id+'-title'}>本次是否采用已审项目资料</h3><p>默认使用原有资料。下方主题只是本次取意，不是整名吉凶、人格或未来结果保证。</p></header>
  <fieldset className="reviewed-data-mode" disabled={state.frame.disabled}><legend>本次生成路径</legend>
   <label><input type="radio" name={id+'-mode'} checked={!reviewed} onChange={()=>controller.setMode('legacy')}/><span><strong>沿用原有资料</strong><small>保留原生成入口和既有方案</small></span></label>
   <label><input type="radio" name={id+'-mode'} checked={reviewed} onChange={()=>controller.setMode('reviewed')}/><span><strong>采用已审项目资料</strong><small>仅本次新生成；不回填旧方案</small></span></label>
  </fieldset>
  {reviewed&&<>
   <p className="reviewed-data-notice">未勾选条件主题时仍可使用一般适用资料；有条件义项与物象不自动采用。实际读音、用法和必要条件由后端逐项核对。</p>
   <fieldset className="reviewed-data-themes" disabled={state.frame.disabled}><legend>语义主题（选填）</legend><div>{REVIEWED_SEMANTIC_CHOICES.map(row=><label key={row.id}><input type="checkbox" checked={selection!.semanticThemeIds.includes(row.id)} disabled={givenNameLength!==undefined&&!row.givenNameLengths.includes(givenNameLength)} onChange={event=>controller.setSemanticTheme(row.id,event.target.checked)}/><span><strong>{row.label}</strong><small>{row.note}</small>{givenNameLength!==undefined&&!row.givenNameLengths.includes(givenNameLength)&&<small>本次单字给名不适用该项新取意；原有生成路径仍保留。</small>}</span></label>)}</div></fieldset>
   <fieldset className="reviewed-data-objects" disabled={state.frame.disabled}><legend>精确物象主题（选填）</legend><p>只对相应汉字的已审默认读音与具体物象义生效，不从偏旁或主题名称推断其他义项。</p><div>{REVIEWED_OBJECT_CHOICES.map(row=><label key={row.char}><input type="checkbox" checked={selection!.objectThemes[row.char]===row.theme} onChange={event=>controller.setObjectTheme(row.char,event.target.checked)}/><span><strong>{row.label}</strong><small>{row.note}</small></span></label>)}</div></fieldset>
   <p className="reviewed-data-boundary">逐字取意不授予整名结论，也不额外增加语义分；已选物象由新方法按原有算法处理元素筛选与传统分。本控件不另行评分、排序或修改旧资料覆盖统计。</p>
   {blockedReason&&<p role="status" className="reviewed-data-error">当前不适用：{blockedReason}</p>}
   {!state.frame.method&&<p role="status">已审资料生成暂未连接，选择仍保留。</p>}
   <button type="button" className="button secondary" disabled={disabled||!state.frame.method||!!blockedReason} onClick={()=>void (beforeGenerate?Promise.resolve(beforeGenerate()).then(allowed=>{if(allowed)return controller.generate();return 'blocked' as const;}):controller.generate())}>{state.phase==='generating'?'正在按所选资料生成…':state.phase==='delivering'?'正在交回当前方案…':state.errorKind==='handoff'?'重试接收方案':state.phase==='error'?'重试生成':'按已选资料生成'}</button>
  </>}
  {!reviewed&&<p className="reviewed-data-notice">继续使用原有生成路径，不调用已审资料入口。开启不会自动勾选任何主题。</p>}
  {state.notice&&<p role={state.phase==='error'?'alert':'status'} className={state.phase==='error'?'reviewed-data-error':'reviewed-data-notice'}>{state.notice}</p>}
  {working&&<p role="status">可以修改资料或选择；旧回包将不会覆盖较新的输入。生成在后端可能已完成，过期结果可从方案目录核对。</p>}
 </section>;
}
