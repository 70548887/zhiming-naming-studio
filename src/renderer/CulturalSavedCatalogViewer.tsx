import React,{useLayoutEffect,useMemo,useRef,useSyncExternalStore} from 'react';
import {QimenCulturalComparisonView} from './QimenCulturalComparisonView';
import {CulturalSavedCatalogController,culturalSavedSourceMethods,type CulturalSavedSourceReference} from './cultural-saved-catalog-state';

export interface CulturalSavedCatalogViewerProps {ownerProfileId:string|null;contextKey:string;busy:boolean;readOnly:boolean;isBusy:()=>boolean;isOwnerCurrent:()=>boolean;onOpenSource:(reference:CulturalSavedSourceReference)=>void;}
export function CulturalSavedCatalogViewer(props:CulturalSavedCatalogViewerProps){
 const live=useRef(props);live.current=props;const source=window.studio,methods=culturalSavedSourceMethods(source);
 const controller=useMemo(()=>new CulturalSavedCatalogController({getOwner:()=>({ownerProfileId:live.current.ownerProfileId,contextKey:live.current.contextKey}),getSource:()=>window.studio,isBusy:()=>live.current.busy||live.current.isBusy(),isOwnerCurrent:()=>live.current.isOwnerCurrent(),getOwnerGuard:()=>live.current.isOwnerCurrent}),[source,methods[0],methods[1],methods[2],props.ownerProfileId,props.contextKey]);
 useLayoutEffect(()=>controller.mount(),[controller]);
 const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot),ownerCurrent=props.isOwnerCurrent(),locked=props.busy||state.busy!==null||!ownerCurrent;
 if(!ownerCurrent)return <section className="panel" data-cultural-saved-catalog><p role="status">宝宝上下文已变化，请在当前档案重新打开文化目录。</p></section>;
 return <section className="panel" data-cultural-saved-catalog style={{padding:20,marginTop:20}}>
  <h2>本宝宝已保存文化比较</h2>
  <p>目录只含记录编号、原方案编号和修订索引，不含来源核验结论。出生盘与名字以原保存记录为准，不代表当前资料已采用。</p>
  {props.readOnly&&<p role="status">客户库当前只读，仍可查看已保存记录；本入口不写入、不迁移或恢复记录。</p>}
  {!props.ownerProfileId&&<p role="status">请先打开已保存的宝宝档案或方案，再查看本宝宝的文化记录。</p>}
  {!state.enabled?<button type="button" data-catalog-action="open" disabled={props.busy||!props.ownerProfileId} onClick={()=>void controller.open()}>查看本宝宝已保存文化比较</button>:<>
   <div className="button-row"><button type="button" data-catalog-action="close" onClick={controller.close}>关闭已保存目录</button><button type="button" data-catalog-action="restart" disabled={props.busy} onClick={()=>void controller.restart()}>重新从头读取目录</button></div>
   <p role="status">{state.notice}</p>{state.error&&<p role="alert" className="inline-warning">{state.error}</p>}
   {state.phase==='cursor-expired'&&<p>游标过期原因：{state.page?.status==='cursor-expired'?state.page.reason:''}。请使用“重新从头读取目录”。</p>}
   {state.page?.status==='available'&&<><p>本页 {state.page.items.length} 条 · 每页最多 10 条 · 按记录编号倒序（不是创建时间排序）。索引事实未核验。</p><ul>{state.page.items.map(row=><li key={row.comparisonId}><button type="button" data-cultural-record={row.comparisonId} disabled={locked} onClick={()=>void controller.select(row.comparisonId,state.pageGeneration)}>读取记录 {row.comparisonId}</button><p>原方案：{row.sourceSessionId??'无方案引用'} · 当前修订 {row.currentRevision} · 创建于 {row.createdAt}</p></li>)}</ul>{state.page.items.length===0&&<p>本宝宝没有已保存文化比较记录。</p>}<div className="button-row"><button type="button" data-catalog-action="previous" disabled={locked||!state.previous.length} onClick={()=>void controller.previous()}>上一页</button><button type="button" data-catalog-action="next" disabled={locked||!state.page.nextCursor} onClick={()=>void controller.next()}>下一页</button></div></>}
   {state.detail&&<section data-cultural-saved-detail>
    <h3>原保存文化记录 · 只读</h3><p>原方案：{state.detail.head.sourceSessionId??'无方案引用'} · 正在查看修订 {state.detail.revision.revision} · 记录当前修订 {state.detail.head.currentRevision}</p>
    <p>出生盘与名字以保存记录为准；不会自动套用当前编辑中的宝宝资料或当前候选名字。</p>
    <QimenCulturalComparisonView reply={{kind:'result',snapshot:state.detail.result.snapshot}}/>
    <p>原独立人工备注：{state.detail.result.note||'（空）'}</p>
    <h4>原记录历史</h4><ul>{state.history.map(row=><li key={row.revision}><button type="button" data-cultural-revision={row.revision} disabled={locked} onClick={()=>void controller.viewRevision(row.revision,state.viewGeneration)}>查看修订 {row.revision}</button><span> · {row.operation} · {row.createdAt}</span></li>)}</ul>
    {state.detail.head.sourceSessionId?<button type="button" data-catalog-action="open-source-session" disabled={locked} onClick={()=>controller.openSource(state.viewGeneration,reference=>live.current.onOpenSource(reference))}>打开原保存方案继续处理</button>:<p>本记录没有原保存方案引用，可在此只读查看。</p>}
   </section>}
  </>}
 </section>;
}
