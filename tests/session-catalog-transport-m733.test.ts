import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const bridge=vi.hoisted(()=>({invoke:vi.fn(),expose:vi.fn(),on:vi.fn()}));
vi.mock('electron',()=>({ipcRenderer:{invoke:bridge.invoke,on:bridge.on},contextBridge:{exposeInMainWorld:bridge.expose}}));
beforeEach(()=>{vi.resetModules();vi.clearAllMocks();});
afterEach(()=>{vi.unstubAllGlobals();});
const requests=[['listSessionCatalog',[{limit:1,filters:{query:'林'}}]],['readSessionDetail',['saved-id']],['migrateCustomerStorage',[]]] as const;
describe('actual catalog and migration client bridges',()=>{
  it('preload forwards exact arguments over named IPC routes',async()=>{
    vi.stubGlobal('window',{postMessage:vi.fn()});
    bridge.invoke.mockResolvedValue({sentinel:true});
    await import('../src/main/preload');
    const api=bridge.expose.mock.calls[0][1] as Record<string,(...args:unknown[])=>Promise<unknown>>;
    for(const [method,args] of requests){await api[method](...args);expect(bridge.invoke).toHaveBeenLastCalledWith('studio:'+method,...args);}
  });
  it('browser bridge sends the same methods and arguments with the local-request header',async()=>{
    const window:{studio?:Record<string,(...args:unknown[])=>Promise<unknown>>;postMessage:ReturnType<typeof vi.fn>}={postMessage:vi.fn()};
    const fetch=vi.fn().mockImplementation(async()=>new Response(JSON.stringify({sentinel:true}),{status:200}));
    vi.stubGlobal('window',window);vi.stubGlobal('fetch',fetch);
    await import('../src/shared/browser-api');
    for(const [method,args] of requests){await window.studio![method](...args);expect(fetch).toHaveBeenLastCalledWith('/__studio_api/'+method,{method:'POST',headers:{'Content-Type':'application/json','X-Studio-Local-Request':'1'},body:JSON.stringify(args)});}
  });
  it('browser errors remain failures rather than silently returning an empty page',async()=>{
    const window:{studio?:Record<string,(...args:unknown[])=>Promise<unknown>>;postMessage:ReturnType<typeof vi.fn>}={postMessage:vi.fn()};
    vi.stubGlobal('window',window);vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({error:'目录已更新，请重新查询。'}),{status:400})));
    await import('../src/shared/browser-api');
    await expect(window.studio!.listSessionCatalog({cursor:'obsolete'})).rejects.toThrow('目录已更新');
  });
});
