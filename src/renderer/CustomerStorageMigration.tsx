import React,{useEffect,useRef,useSyncExternalStore} from 'react';
import {createCustomerStorageMigrationController,currentCustomerStorageMigrationState,readCustomerStorageMigrationFrame,type CustomerStorageMigrationApi,type CustomerStorageMigrationState,type CustomerStorageMigrationStatus} from './customer-storage-migration-state';
import './customer-storage-migration.css';

export interface CustomerStorageMigrationProps {
  state?:CustomerStorageMigrationStatus;
  api?:CustomerStorageMigrationApi;
  onMigrated:(state:CustomerStorageMigrationStatus)=>void|Promise<void>;
  busy?:boolean;
  confirm?:(message:string)=>boolean|Promise<boolean>;
}

const confirmMigration=(message:string)=>typeof window!=='undefined'&&window.confirm(message);
const byteLabel=(bytes:number)=>`${bytes.toLocaleString('zh-CN')} 字节`;

export function CustomerStorageMigrationView({state,onMigrate}:{state:CustomerStorageMigrationState;onMigrate:()=>void}) {
  if(!state.storage?.migrationRequired)return null;
  const working=['confirming','migrating','refreshing'].includes(state.phase);
  const refreshFailed=state.errorKind==='refresh';
  const unavailable=!state.method||!state.api;
  const error=state.errorKind==='confirmation'?'迁移确认未完成；当前仍为只读，请重试。'
    :refreshFailed?'迁移已完成，但目录刷新失败。当前草稿与设置仍保留，请重试刷新。'
    :state.errorKind==='result'?'未取得完整的迁移完成状态；当前仍为只读，请重试。'
    :'迁移失败，原库与当前草稿保留。请重试迁移。';
  const label=state.phase==='confirming'?'等待迁移确认…':state.phase==='migrating'?'正在迁移…':state.phase==='refreshing'?'正在刷新目录…':state.phase==='complete'?'迁移已完成':refreshFailed?'重试刷新':state.phase==='error'?'重试迁移':'备份后迁移客户存储';
  return <aside className="customer-storage-migration" aria-label="客户资料存储迁移" aria-busy={working}>
    <div className="customer-storage-migration-copy">
      <strong>客户资料需要迁移，当前为只读</strong>
      <p>迁移前请先导出客户备份并确认备份可用。确认后才开始更新本机客户资料存储格式；迁移期间暂停保存和资料修改。</p>
      <p>当前未保存草稿与设置会保留。迁移成功并刷新目录后恢复保存；迁移失败保留原库，可再次重试。</p>
      <details><summary>查看当前存储状态</summary><dl>
        <div><dt>格式版本</dt><dd>{state.storage.version}</dd></div>
        <div><dt>当前大小</dt><dd>{byteLabel(state.storage.bytes)}</dd></div>
        <div><dt>容量上限</dt><dd>{byteLabel(state.storage.maxPhysicalBytes)}</dd></div>
      </dl>{state.storage.warning&&<p>客户资料已接近存储容量上限，请保留可用备份。</p>}</details>
      {state.phase==='error'&&<p className="customer-storage-migration-error" role="alert">{error}</p>}
      {unavailable&&<p role="status">当前连接尚未提供迁移功能，客户资料保持只读。</p>}
      {state.busy&&<p role="status">请等待当前操作完成后再迁移。</p>}
    </div>
    <button type="button" className="secondary customer-storage-migration-action" disabled={working||state.busy||unavailable||state.phase==='complete'} onClick={onMigrate}>{label}</button>
  </aside>;
}

/** Manual entry only. The caller refreshes its catalog without replacing the user's draft or settings. */
export function CustomerStorageMigration({state,api,onMigrated,busy=false,confirm=confirmMigration}:CustomerStorageMigrationProps) {
  const frame=readCustomerStorageMigrationFrame({state,api,onMigrated,busy,confirm});
  const frameRef=useRef(frame);frameRef.current=frame;
  const controllerRef=useRef<ReturnType<typeof createCustomerStorageMigrationController>|null>(null);
  if(!controllerRef.current)controllerRef.current=createCustomerStorageMigrationController({getFrame:()=>frameRef.current});
  const controller=controllerRef.current;
  const snapshot=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
  useEffect(()=>{controller.activate();return()=>controller.dispose();},[controller]);
  useEffect(()=>controller.refresh(),[controller,frame.storageKey,frame.api,frame.method,frame.busy]);
  return <CustomerStorageMigrationView state={currentCustomerStorageMigrationState(snapshot,frame)} onMigrate={()=>{void controller.migrate();}}/>;
}
