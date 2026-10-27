import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {CULTURAL_COMPARISON_CATALOG_METHODS,hasCulturalComparisonCatalogAPI,type CulturalComparisonCatalogAPI,type CulturalComparisonCatalogPage} from '../src/shared/cultural-comparison-catalog';
import {CULTURAL_WORKFLOW_METHODS,hasCulturalWorkflowAPI} from '../src/shared/cultural-workflow-api';
import {invokeWithCustomerWriteNotice} from '../src/main/customer-write-notice-transport';

// Only transport adapters execute here. The fake Service and DTO replies are
// transport identity fixtures; they establish no cultural sources, authenticated
// facts, owned revisions, provider admission, persistence or replay evidence.
// Mocking esbuild avoids an unrelated CMN worker startup build.
const mocks=vi.hoisted(()=>({
 expose:vi.fn(),invoke:vi.fn(),on:vi.fn(),build:vi.fn(),storeConstruct:vi.fn(),storeInit:vi.fn(),list:vi.fn(),
 hidden:Object.fromEntries(['readMaterial','readMaterialBlob','verifyOwnedPreview','readAnchorMaterial','closeProvider','closeCulturalProvider','closeCmnReadingWorker','close'].map(name=>[name,vi.fn()])),
 services:[] as object[],
}));
vi.mock('electron',()=>({contextBridge:{exposeInMainWorld:mocks.expose},ipcRenderer:{invoke:mocks.invoke,on:mocks.on}}));
vi.mock('esbuild',()=>({build:mocks.build}));
vi.mock('../src/main/store',()=>({Store:class {
 constructor(...args:unknown[]){mocks.storeConstruct(...args);}
 async init(){mocks.storeInit();return this;}
}}));
vi.mock('../src/main/service',()=>({StudioService:class {
 store:object;
 constructor(store:object){this.store=store;Object.assign(this,{listCulturalComparisons:mocks.list},mocks.hidden);mocks.services.push(this);}
}}));

const METHOD='listCulturalComparisons';
const OWNER='  profile-𠮷😀  ';
const HIDDEN_METHODS=['readMaterial','readMaterialBlob','verifyOwnedPreview','readAnchorMaterial','closeProvider','closeCulturalProvider','closeCmnReadingWorker','close'];
const requestValue=()=>({limit:2,cursor:'  opaque-cursor𠮷😀  '});
const fakeBoundary={schema:'cultural-comparison-catalog/1',ownerProfileId:OWNER,storageVersion:'customer-compact/3',limit:2,order:'comparison-id-desc',factsAuthenticated:false,sourceAuthority:'not-authenticated-facts'} as const;
const fakeReply=():CulturalComparisonCatalogPage=>({...fakeBoundary,status:'available',items:[{comparisonId:'fake-comparison',ownerProfileId:OWNER,sourceSessionId:'fake-session',currentRevision:3,createdAt:'2026-10-26T00:00:00.000Z',factsAuthenticated:false,sourceAuthority:'not-authenticated-facts'}],nextCursor:'fake-next-cursor'});
const stateReplies:{label:string;reply:()=>CulturalComparisonCatalogPage}[]=[
 {label:'available metadata',reply:fakeReply},
 {label:'unsupported tables',reply:()=>({...fakeBoundary,status:'unsupported',reason:'cultural-tables-unavailable',items:[]})},
 ...(['owner-changed','database-changed','query-changed'] as const).map(reason=>({label:'cursor-expired '+reason,reply:():CulturalComparisonCatalogPage=>({...fakeBoundary,status:'cursor-expired',reason,items:[]})})),
];
const call=(api:CulturalComparisonCatalogAPI,args:unknown[]):Promise<unknown>=>Reflect.apply(api.listCulturalComparisons,api,args);
const arityCases=[
 {label:'omitted optional request',args:()=>[OWNER],json:()=>[OWNER]},
 {label:'explicit legal undefined request',args:()=>[OWNER,undefined],json:()=>[OWNER]},
 {label:'unchanged request fields',args:()=>[OWNER,requestValue()],json:()=>[OWNER,requestValue()]},
 {label:'explicit null request',args:()=>[OWNER,null],json:()=>[OWNER,null]},
 {label:'absent required owner',args:()=>[],json:()=>[]},
 {label:'undefined required owner',args:()=>[undefined],json:()=>[null]},
 {label:'extra undefined argument',args:()=>[OWNER,requestValue(),undefined],json:()=>[OWNER,requestValue(),null]},
 {label:'undefined request with illegal third slot',args:()=>[OWNER,undefined,undefined],json:()=>[OWNER,null,null]},
 {label:'undefined owner with illegal extra slots',args:()=>[undefined,undefined,undefined],json:()=>[null,null,null]},
];

beforeEach(()=>{
 vi.resetModules();vi.clearAllMocks();mocks.invoke.mockReset();mocks.list.mockReset();mocks.build.mockReset().mockResolvedValue({});
 for(const spy of Object.values(mocks.hidden))spy.mockReset().mockResolvedValue(undefined);
 mocks.services.length=0;
});
afterEach(()=>vi.unstubAllGlobals());

async function preload(){
 vi.stubGlobal('window',{postMessage:vi.fn()});await import('../src/main/preload');
 expect(mocks.expose).toHaveBeenCalledExactlyOnceWith('studio',expect.any(Object));
 return mocks.expose.mock.calls[0][1] as CulturalComparisonCatalogAPI;
}
async function browser(fetchMock:ReturnType<typeof vi.fn>){
 const window={postMessage:vi.fn()} as {studio?:CulturalComparisonCatalogAPI;postMessage:ReturnType<typeof vi.fn>};
 vi.stubGlobal('window',window);vi.stubGlobal('fetch',fetchMock);await import('../src/shared/browser-api');
 if(!window.studio)throw Error('M922 browser catalog bridge missing');return window.studio;
}

describe('M922 separate public catalog capability',()=>{
 it('exposes exactly one frozen method without expanding the frozen eleven-method workflow',()=>{
  expect(CULTURAL_COMPARISON_CATALOG_METHODS).toEqual([METHOD]);expect(Object.isFrozen(CULTURAL_COMPARISON_CATALOG_METHODS)).toBe(true);
  expect(CULTURAL_WORKFLOW_METHODS).toHaveLength(11);expect(Object.isFrozen(CULTURAL_WORKFLOW_METHODS)).toBe(true);
  expect(CULTURAL_WORKFLOW_METHODS).not.toContain(METHOD);
  const workflow=Object.fromEntries(CULTURAL_WORKFLOW_METHODS.map(name=>[name,vi.fn()]));
  expect(hasCulturalWorkflowAPI(workflow)).toBe(true);expect(hasCulturalComparisonCatalogAPI(workflow)).toBe(false);
  const catalog={[METHOD]:vi.fn()};expect(hasCulturalComparisonCatalogAPI(catalog)).toBe(true);expect(hasCulturalWorkflowAPI(catalog)).toBe(false);
 });
 it('rejects missing, inherited and non-function catalog APIs',()=>{
  const complete={[METHOD]:vi.fn()};
  for(const value of [undefined,null,false,0,'api',()=>complete,{},[],Object.create(complete),{[METHOD]:undefined},{[METHOD]:0}])expect(hasCulturalComparisonCatalogAPI(value)).toBe(false);
 });
 it('never executes a getter while checking the optional capability',()=>{
  const getter=vi.fn(()=>vi.fn()),value={};Object.defineProperty(value,METHOD,{get:getter,enumerable:true});
  expect(hasCulturalComparisonCatalogAPI(value)).toBe(false);expect(getter).toHaveBeenCalledTimes(0);
 });
 it('contains hostile descriptor errors without invoking ordinary property getters',()=>{
  const get=vi.fn(),descriptor=vi.fn(()=>{throw Error('faked descriptor error');});
  expect(hasCulturalComparisonCatalogAPI(new Proxy({},{get,getOwnPropertyDescriptor:descriptor}))).toBe(false);
  expect(descriptor).toHaveBeenCalledTimes(1);expect(get).toHaveBeenCalledTimes(0);
 });
});

describe('M922 actual preload catalog IPC transport',()=>{
 it.each(arityCases)('preserves exact IPC arity for $label',async({args:input})=>{
  const api=await preload(),args=input(),reply=fakeReply();mocks.invoke.mockResolvedValueOnce(reply);
  expect(hasCulturalComparisonCatalogAPI(api)).toBe(true);await expect(call(api,args)).resolves.toBe(reply);
  expect(mocks.invoke).toHaveBeenCalledExactlyOnceWith('studio:'+METHOD,...args);
  const sent=mocks.invoke.mock.calls[0].slice(1);expect(sent).toHaveLength(args.length);
  for(let index=0;index<args.length;index++)expect(sent[index]).toBe(args[index]);
 });
 it('preserves IPC error identity and exposes no internal provider methods',async()=>{
  const api=await preload(),error=new Error('faked catalog owning-Service error');mocks.invoke.mockRejectedValueOnce(error);
  await expect(call(api,[OWNER,requestValue()])).rejects.toBe(error);
  for(const name of HIDDEN_METHODS)expect(Object.hasOwn(api,name)).toBe(false);
 });
});

describe('M922 actual browser catalog HTTP transport',()=>{
 it.each(arityCases)('preserves JSON request slots for $label',async({args:input,json})=>{
  const reply=fakeReply(),fetchMock=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(reply),{status:200})),api=await browser(fetchMock),args=input(),before=structuredClone(args);
  expect(hasCulturalComparisonCatalogAPI(api)).toBe(true);await expect(call(api,args)).resolves.toEqual(reply);
  expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/__studio_api/'+METHOD,{method:'POST',headers:{'Content-Type':'application/json','X-Studio-Local-Request':'1'},body:JSON.stringify(json())});
  expect(args).toEqual(before);for(const name of HIDDEN_METHODS)expect(Object.hasOwn(api,name)).toBe(false);
 });
 it.each(stateReplies)('returns the faked $label DTO without authenticating facts or synthesizing success',async({reply:makeReply})=>{
  const reply=makeReply(),fetchMock=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(reply),{status:200})),api=await browser(fetchMock);
  await expect(call(api,[OWNER,requestValue()])).resolves.toEqual(reply);
  expect(reply.factsAuthenticated).toBe(false);expect(reply.sourceAuthority).toBe('not-authenticated-facts');
 });
 it('preserves owning-Service and network errors instead of returning an empty available page',async()=>{
  const message='CULTURAL_CATALOG_OWNER_NOT_FOUND',network=new Error('faked network failure');
  const fetchMock=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({error:message}),{status:400})).mockRejectedValueOnce(network).mockResolvedValueOnce(new Response('invalid error JSON',{status:500})),api=await browser(fetchMock);
  await expect(call(api,['not-present-owner'])).rejects.toThrow(message);
  await expect(call(api,[OWNER])).rejects.toBe(network);
  await expect(call(api,[OWNER])).rejects.toThrow('本地服务连接失败');
 });
 it('leaves an already installed desktop bridge intact',async()=>{
  const existing={[METHOD]:vi.fn()},window={studio:existing},fetchMock=vi.fn();
  vi.stubGlobal('window',window);vi.stubGlobal('fetch',fetchMock);await import('../src/shared/browser-api');
  expect(window.studio).toBe(existing);expect(fetchMock).not.toHaveBeenCalled();
 });
});

type Middleware=(request:unknown,response:unknown,next:()=>void)=>Promise<void>;
async function developmentMiddleware(){
 let handler:Middleware|undefined;const plugin=(await import('../scripts/dev-plugin')).studioDevPlugin();
 await(plugin.configureServer as Function)({config:{root:resolve('.')},httpServer:{once:vi.fn()},middlewares:{use(value:Middleware){handler=value;}}});
 if(!handler)throw Error('M922 actual development middleware missing');return handler;
}
async function request(handler:Middleware,method:string,args:unknown[],options:{verb?:string;headers?:Record<string,string|undefined>;chunks?:Uint8Array[]}={}){
 let status=200,output='';const headers:Record<string,string>={},next=vi.fn();
 const req={url:'/__studio_api/'+method,method:options.verb??'POST',headers:options.headers??{host:'127.0.0.1:18000','x-studio-local-request':'1'},async *[Symbol.asyncIterator](){for(const chunk of options.chunks??[Buffer.from(JSON.stringify(args))])yield chunk;}};
 const res={get statusCode(){return status;},set statusCode(value:number){status=value;},setHeader(name:string,value:string){headers[name.toLowerCase()]=value;},end(value=''){output+=value;}};
 await handler(req,res,next);let body:unknown;try{body=JSON.parse(output);}catch{body=output;}return{status,body,headers,next};
}

describe('M922 actual development middleware with transport-only fake Service',()=>{
 it('allows the catalog tuple route and dispatches exact decoded arguments',async()=>{
  const handler=await developmentMiddleware(),args=[OWNER,requestValue()],reply=fakeReply();mocks.list.mockResolvedValueOnce(reply);
  const result=await request(handler,METHOD,args);expect(result.status).toBe(200);expect(result.body).toEqual(reply);
  expect(result.headers['content-type']).toBe('application/json; charset=utf-8');expect(mocks.list).toHaveBeenCalledExactlyOnceWith(...args);
  expect(mocks.list.mock.contexts[0]).toBe(mocks.services[0]);expect(mocks.build).toHaveBeenCalledTimes(1);
 });
 it.each(arityCases)('retains decoded arguments for $label before the fake Service rejects them',async({args:input})=>{
  const handler=await developmentMiddleware(),args=input(),decoded=JSON.parse(JSON.stringify(args)),message='faked catalog arity/validation failure';
  mocks.list.mockRejectedValueOnce(new Error(message));const result=await request(handler,METHOD,args);
  expect(result.status).toBe(400);expect(result.body).toEqual({error:message});expect(mocks.list).toHaveBeenCalledExactlyOnceWith(...decoded);
  expect(mocks.list.mock.calls[0]).toHaveLength(decoded.length);
 });
 it.each([
  {label:'GET',verb:'GET',headers:{host:'127.0.0.1:18000','x-studio-local-request':'1'}},
  {label:'missing local header',verb:'POST',headers:{host:'127.0.0.1:18000'}},
  {label:'wrong local header',verb:'POST',headers:{host:'127.0.0.1:18000','x-studio-local-request':'0'}},
  {label:'foreign origin',verb:'POST',headers:{host:'127.0.0.1:18000','x-studio-local-request':'1',origin:'https://different.invalid'}},
 ])('rejects $label before Store construction or Service dispatch',async({verb,headers})=>{
  const handler=await developmentMiddleware(),result=await request(handler,METHOD,[OWNER],{verb,headers});
  expect(result.status).toBe(403);expect(result.body).toBe('Forbidden');expect(mocks.storeConstruct).not.toHaveBeenCalled();expect(mocks.list).not.toHaveBeenCalled();
 });
 it('preserves split UTF-8 owner and opaque cursor text for the matching local origin',async()=>{
  const handler=await developmentMiddleware(),args=[OWNER,requestValue()],bytes=Buffer.from(JSON.stringify(args)),split=bytes.indexOf(Buffer.from('𠮷'))+1;
  expect(split).toBeGreaterThan(0);mocks.list.mockResolvedValueOnce(fakeReply());
  const result=await request(handler,METHOD,args,{headers:{host:'127.0.0.1:18000','x-studio-local-request':'1',origin:'http://127.0.0.1:18000'},chunks:[bytes.subarray(0,split),bytes.subarray(split)]});
  expect(result.status).toBe(200);expect(mocks.list).toHaveBeenCalledExactlyOnceWith(...args);
 });
 it.each(HIDDEN_METHODS)('rejects hidden %s even when the fake Service owns it',async name=>{
  const handler=await developmentMiddleware(),result=await request(handler,name,[]);
  expect(result.status).toBe(400);expect(result.body).toEqual({error:'此功能使用系统文件选择器，请在桌面应用中操作。'});
  expect(mocks.hidden[name]).not.toHaveBeenCalled();expect(mocks.list).not.toHaveBeenCalled();
 });
});

function descendants(node:ts.Node){const nodes:ts.Node[]=[];const visit=(child:ts.Node)=>{nodes.push(child);ts.forEachChild(child,visit);};visit(node);return nodes;}
// Execute the actual main declarations and catalog registration statement. Only
// unrelated Electron startup is omitted; route bodies are never reimplemented.
function actualMainBridgeProgram(){
 const source=ts.createSourceFile('main.ts',readFileSync(resolve('src/main/main.ts'),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),nodes=descendants(source);
 const statement=(name:string)=>{
  const matches=nodes.filter(ts.isVariableStatement).filter(node=>node.declarationList.declarations.some(declaration=>ts.isIdentifier(declaration.name)&&declaration.name.text===name));
  if(matches.length!==1)throw Error('M922 actual main declaration missing or ambiguous: '+name);return matches[0].getText(source);
 };
 const loops=nodes.filter(ts.isForOfStatement).filter(node=>ts.isIdentifier(node.expression)&&node.expression.text==='CULTURAL_COMPARISON_CATALOG_METHODS');
 if(loops.length!==1)throw Error('M922 actual catalog registration tuple loop missing or ambiguous');
 return ts.transpileModule([statement('invokeWithNotice'),statement('register'),loops[0].getText(source)].join('\n'),{fileName:'m922-main-ipc-extract.ts',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
}
const mainBridgeProgram=actualMainBridgeProgram();
function mainBridge(desktopPhase=false){
 type Route=(event:{sender:object},...args:unknown[])=>unknown;
 const routes=new Map<string,Route>(),webContents={send:vi.fn()},service={store:{},listCulturalComparisons:mocks.list},desktop176Context=desktopPhase?{}:undefined;
 const phase=vi.fn(),withNotice=vi.fn((owner:object,action:()=>unknown,publish:(value:unknown)=>void)=>invokeWithCustomerWriteNotice(owner,action,publish));
 const handle=vi.fn((channel:string,route:Route)=>{if(routes.has(channel))throw Error('duplicate IPC route '+channel);routes.set(channel,route);});
 runInNewContext(mainBridgeProgram,{CULTURAL_COMPARISON_CATALOG_METHODS,service,window:{webContents},ipcMain:{handle},desktop176Context,assertDesktop176PhaseMethod:phase,invokeWithCustomerWriteNotice:withNotice},{timeout:1000});
 const route=routes.get('studio:'+METHOD);if(!route)throw Error('M922 actual main catalog route missing');
 return{routes,route,webContents,service,desktop176Context,phase,withNotice,handle};
}

describe('M922 executes actual guarded main catalog registration in a VM',()=>{
 it('registers precisely the separate public catalog tuple',()=>{
  const bridge=mainBridge();expect([...bridge.routes.keys()]).toEqual(['studio:'+METHOD]);expect(bridge.handle).toHaveBeenCalledTimes(1);
  for(const name of HIDDEN_METHODS)expect(bridge.routes.has('studio:'+name)).toBe(false);
 });
 it.each(arityCases)('preserves exact main IPC arguments for $label',async({args:input})=>{
  const bridge=mainBridge(true),args=input(),reply=fakeReply();mocks.list.mockResolvedValueOnce(reply);
  await expect(bridge.route({sender:bridge.webContents},...args)).resolves.toBe(reply);
  expect(mocks.list).toHaveBeenCalledExactlyOnceWith(...args);expect(mocks.list.mock.calls[0]).toHaveLength(args.length);
  expect(mocks.list.mock.contexts[0]).toBe(bridge.service);expect(bridge.phase).toHaveBeenCalledExactlyOnceWith(bridge.desktop176Context,METHOD);
  expect(bridge.withNotice).toHaveBeenCalledExactlyOnceWith(bridge.service.store,expect.any(Function),expect.any(Function));expect(bridge.webContents.send).not.toHaveBeenCalled();
 });
 it('rejects a foreign sender before phase guard, notice wrapper or Service execution',()=>{
  const bridge=mainBridge(true);expect(()=>bridge.route({sender:{}},OWNER)).toThrow('无效的调用来源。');
  expect(bridge.phase).not.toHaveBeenCalled();expect(bridge.withNotice).not.toHaveBeenCalled();expect(mocks.list).not.toHaveBeenCalled();
 });
 it('preserves the owning-Service rejection and illegal argument count',async()=>{
  const bridge=mainBridge(),error=new Error('faked catalog owning-Service strict rejection'),args=[OWNER,requestValue(),undefined];mocks.list.mockRejectedValueOnce(error);
  await expect(bridge.route({sender:bridge.webContents},...args)).rejects.toBe(error);expect(mocks.list.mock.calls[0]).toHaveLength(3);
 });
 it('allows the actual phase guard to stop dispatch before the notice wrapper',()=>{
  const bridge=mainBridge(true),error=new Error('faked phase-method guard rejection');bridge.phase.mockImplementation(()=>{throw error;});
  expect(()=>bridge.route({sender:bridge.webContents},OWNER)).toThrow(error);
  expect(bridge.phase).toHaveBeenCalledExactlyOnceWith(bridge.desktop176Context,METHOD);expect(bridge.withNotice).not.toHaveBeenCalled();expect(mocks.list).not.toHaveBeenCalled();
 });
});
