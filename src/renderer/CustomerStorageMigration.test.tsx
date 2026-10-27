import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it,vi} from 'vitest';
import {CustomerStorageMigration,CustomerStorageMigrationView} from './CustomerStorageMigration';
import {CUSTOMER_STORAGE_MIGRATION_CONFIRM,createCustomerStorageMigrationController,readCustomerStorageMigrationFrame,type CustomerStorageMigrationApi,type CustomerStorageMigrationFrame,type CustomerStorageMigrationStatus} from './customer-storage-migration-state';

const legacy:CustomerStorageMigrationStatus={version:'legacy-json/1',migrationRequired:true,bytes:1024,maxPhysicalBytes:4096,warning:true};
const migrated:CustomerStorageMigrationStatus={...legacy,version:'paged/2',migrationRequired:false};
const deferred=<T,>()=>{let resolve!:(value:T)=>void,reject!:(error:unknown)=>void;const promise=new Promise<T>((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const tick=async()=>{await Promise.resolve();await Promise.resolve();};
function setup(api:CustomerStorageMigrationApi,confirm=vi.fn(()=>true),onMigrated=vi.fn<(state:CustomerStorageMigrationStatus)=>void|Promise<void>>()) {
  let frame=readCustomerStorageMigrationFrame({state:legacy,api,confirm,onMigrated});
  const controller=createCustomerStorageMigrationController({getFrame:()=>frame});
  return {controller,confirm,onMigrated,getFrame:()=>frame,setFrame:(next:CustomerStorageMigrationFrame)=>{frame=next;controller.refresh();}};
}

describe('manual customer storage migration renderer entry',()=>{
  it('renders read-only, backup and preservation instructions without starting migration',()=>{
    const api={migrateCustomerStorage:vi.fn(async()=>migrated)},onMigrated=vi.fn();
    const html=renderToStaticMarkup(<CustomerStorageMigration state={legacy} api={api} onMigrated={onMigrated}/>);
    for(const text of ['客户资料需要迁移，当前为只读','迁移前请先导出客户备份','确认后才开始','当前未保存草稿与设置会保留','迁移失败保留原库','备份后迁移客户存储','legacy-json/1','1,024','4,096'])expect(html).toContain(text);
    expect(api.migrateCustomerStorage).not.toHaveBeenCalled();expect(onMigrated).not.toHaveBeenCalled();
    expect(renderToStaticMarkup(<CustomerStorageMigration state={migrated} api={api} onMigrated={onMigrated}/>)).toBe('');
    const missing=renderToStaticMarkup(<CustomerStorageMigration state={legacy} onMigrated={onMigrated}/>);
    expect(missing).toContain('当前连接尚未提供迁移功能');expect(missing).toContain('disabled=""');
  });

  it('requires confirmation and permits only one confirmation and migration in flight',async()=>{
    const confirmation=deferred<boolean>(),request=deferred<CustomerStorageMigrationStatus>();
    const api={migrateCustomerStorage:vi.fn(()=>request.promise)},confirm=vi.fn(()=>confirmation.promise);
    let frame=readCustomerStorageMigrationFrame({state:legacy,api,confirm,onMigrated:vi.fn()});
    const controller=createCustomerStorageMigrationController({getFrame:()=>frame});
    await controller.migrate();expect(confirm).not.toHaveBeenCalled();
    controller.activate();const first=controller.migrate();await controller.migrate();
    expect(confirm).toHaveBeenCalledExactlyOnceWith(CUSTOMER_STORAGE_MIGRATION_CONFIRM);
    expect(api.migrateCustomerStorage).not.toHaveBeenCalled();expect(controller.getSnapshot().phase).toBe('confirming');
    confirmation.resolve(true);await tick();await controller.migrate();
    expect(api.migrateCustomerStorage).toHaveBeenCalledTimes(1);expect(controller.getSnapshot().phase).toBe('migrating');
    request.resolve(migrated);await first;expect(controller.getSnapshot().phase).toBe('complete');
  });

  it('keeps cancellation and failed migration read-only, then retries explicitly',async()=>{
    const api={migrateCustomerStorage:vi.fn().mockRejectedValueOnce(Error('disk unavailable')).mockResolvedValue(migrated)};
    const confirm=vi.fn().mockReturnValueOnce(false).mockReturnValue(true);
    const {controller,onMigrated}=setup(api,confirm);controller.activate();
    await controller.migrate();expect(controller.getSnapshot().phase).toBe('idle');expect(api.migrateCustomerStorage).not.toHaveBeenCalled();
    await controller.migrate();expect(controller.getSnapshot().errorKind).toBe('migration');expect(controller.getSnapshot().storage).toEqual(legacy);expect(onMigrated).not.toHaveBeenCalled();
    const failure=renderToStaticMarkup(<CustomerStorageMigrationView state={controller.getSnapshot()} onMigrate={()=>{}}/>);
    expect(failure).toContain('原库与当前草稿保留');expect(failure).toContain('重试迁移');
    await controller.migrate();expect(controller.getSnapshot().phase).toBe('complete');expect(onMigrated).toHaveBeenCalledExactlyOnceWith(migrated);
    expect(legacy).toEqual({version:'legacy-json/1',migrationRequired:true,bytes:1024,maxPhysicalBytes:4096,warning:true});
  });

  it('rejects a late API response after API or storage changes, including ABA changes',async()=>{
    const request=deferred<CustomerStorageMigrationStatus>();
    const api={migrateCustomerStorage:vi.fn(()=>request.promise)},otherApi={migrateCustomerStorage:vi.fn(async()=>migrated)};
    const {controller,confirm,onMigrated,getFrame,setFrame}=setup(api);controller.activate();
    const pending=controller.migrate();await tick();
    const original=getFrame();setFrame({...original,api:otherApi,method:otherApi.migrateCustomerStorage});
    await controller.migrate();expect(otherApi.migrateCustomerStorage).not.toHaveBeenCalled();expect(confirm).toHaveBeenCalledTimes(1);
    setFrame({...original,storageKey:JSON.stringify({...legacy,version:'other-version'})});setFrame(original);
    request.resolve(migrated);await pending;
    expect(onMigrated).not.toHaveBeenCalled();expect(controller.getSnapshot().phase).toBe('idle');
  });

  it('ignores completion after unmount and does not publish or refresh stale state',async()=>{
    const request=deferred<CustomerStorageMigrationStatus>(),api={migrateCustomerStorage:vi.fn(()=>request.promise)};
    const {controller,onMigrated}=setup(api),listener=vi.fn();controller.subscribe(listener);controller.activate();
    const pending=controller.migrate();await tick();const updates=listener.mock.calls.length;
    controller.dispose();request.resolve(migrated);await pending;
    expect(listener).toHaveBeenCalledTimes(updates);expect(onMigrated).not.toHaveBeenCalled();expect(controller.getSnapshot().phase).toBe('idle');
  });

  it('rejects malformed success and retries a failed refresh without migrating twice',async()=>{
    const api={migrateCustomerStorage:vi.fn().mockResolvedValueOnce({...migrated,bytes:-1}).mockResolvedValue(migrated)};
    const onMigrated=vi.fn<(state:CustomerStorageMigrationStatus)=>void|Promise<void>>().mockRejectedValueOnce(Error('catalog offline')).mockResolvedValue(undefined);
    const {controller,confirm}=setup(api,vi.fn(()=>true),onMigrated);controller.activate();
    await controller.migrate();expect(controller.getSnapshot().errorKind).toBe('result');expect(onMigrated).not.toHaveBeenCalled();
    await controller.migrate();expect(controller.getSnapshot().errorKind).toBe('refresh');
    const refresh=renderToStaticMarkup(<CustomerStorageMigrationView state={controller.getSnapshot()} onMigrate={()=>{}}/>);
    expect(refresh).toContain('迁移已完成，但目录刷新失败');expect(refresh).toContain('重试刷新');
    await controller.migrate();expect(controller.getSnapshot().phase).toBe('complete');
    expect(api.migrateCustomerStorage).toHaveBeenCalledTimes(2);expect(confirm).toHaveBeenCalledTimes(2);expect(onMigrated).toHaveBeenCalledTimes(2);
  });
});
