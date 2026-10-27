import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {CULTURAL_WORKFLOW_METHODS,hasCulturalWorkflowAPI,type CulturalWorkflowAPI} from '../src/shared/cultural-workflow-api';
import {invokeWithCustomerWriteNotice} from '../src/main/customer-write-notice-transport';
import {CUSTOMER_WRITE_COMMITTED_NOTICE,type CustomerWriteNotice} from '../src/shared/customer-write-notice';
import {CUSTOMER_WRITE_NOTICE_HEADER,CUSTOMER_WRITE_NOTICE_MESSAGE,customerWriteNoticeHeader} from '../src/shared/customer-write-notice-delivery';

// This suite executes the real transport adapters, not cultural calculations or
// persistence. Service spies and every faked reply below are transport identity
// fixtures; they never establish source facts, admitted material or commit proof.
// The esbuild mock only avoids the unrelated CMN worker startup build. The
// dedicated real bundle and Service/Store suites are separate acceptance checks.
const mocks=vi.hoisted(()=>{
 const names=[
  'getCulturalStorageCapabilities','prepareCulturalBirthAnchor','getCulturalCharacterOptions','previewCulturalComparison',
  'prepareCulturalWrite','commitCulturalWrite','readCulturalComparison','listCulturalRevisions','restoreCulturalRevision',
  'previewCulturalStorageMigration','migrateCulturalStorage',
 ];
 const hidden=['readMaterial','readMaterialBlob','verifyOwnedPreview','readAnchorMaterial','closeProvider','closeCulturalProvider','closeCmnReadingWorker','close'];
 return{
  expose:vi.fn(),invoke:vi.fn(),on:vi.fn(),build:vi.fn(),storeConstruct:vi.fn(),storeInit:vi.fn(),
  methods:Object.fromEntries(names.map(name=>[name,vi.fn()])),
  hidden:Object.fromEntries(hidden.map(name=>[name,vi.fn()])),
  serviceInstances:[] as object[],
 };
});
vi.mock('electron',()=>({contextBridge:{exposeInMainWorld:mocks.expose},ipcRenderer:{invoke:mocks.invoke,on:mocks.on}}));
vi.mock('esbuild',()=>({build:mocks.build}));
vi.mock('../src/main/store',()=>({Store:class {
 constructor(...args:unknown[]){mocks.storeConstruct(...args);}
 async init(){mocks.storeInit();return this;}
}}));
vi.mock('../src/main/service',()=>({StudioService:class {
 store:object;
 constructor(store:object){this.store=store;Object.assign(this,mocks.methods,mocks.hidden);mocks.serviceInstances.push(this);}
}}));

const EXPECTED_METHODS=[
 'getCulturalStorageCapabilities','prepareCulturalBirthAnchor','getCulturalCharacterOptions','previewCulturalComparison',
 'prepareCulturalWrite','commitCulturalWrite','readCulturalComparison','listCulturalRevisions','restoreCulturalRevision',
 'previewCulturalStorageMigration','migrateCulturalStorage',
] as const;
const HIDDEN_METHODS=['readMaterial','readMaterialBlob','verifyOwnedPreview','readAnchorMaterial','closeProvider','closeCulturalProvider','closeCmnReadingWorker','close'] as const;
type MethodName=(typeof EXPECTED_METHODS)[number];
interface MethodCase {name:MethodName;args:()=>unknown[];}
const payload=(label:string)=>({transportFixture:label,raw:'  原值𠮷😀  ',nested:{values:[null,false,0,'']}});
const cases:MethodCase[]=[
 {name:'getCulturalStorageCapabilities',args:()=>[]},
 {name:'prepareCulturalBirthAnchor',args:()=>[payload('anchor request')]},
 {name:'getCulturalCharacterOptions',args:()=>['handle-𠮷😀',payload('candidate request')]},
 {name:'previewCulturalComparison',args:()=>['handle-𠮷😀',payload('preview request')]},
 {name:'prepareCulturalWrite',args:()=>[payload('save request')]},
 {name:'commitCulturalWrite',args:()=>[payload('commit request')]},
 {name:'readCulturalComparison',args:()=>['comparison-𠮷😀',7]},
 {name:'listCulturalRevisions',args:()=>['comparison-𠮷😀']},
 {name:'restoreCulturalRevision',args:()=>['comparison-𠮷😀',2,9,'  review-token𠮷  ','  idempotency-key😀  ']},
 {name:'previewCulturalStorageMigration',args:()=>[]},
 {name:'migrateCulturalStorage',args:()=>[]},
];
const fakeReply=(method:MethodName)=>({fixture:'M920 transport-only faked reply; no cultural source facts',method,raw:'  𠮷😀  '});
const call=(api:CulturalWorkflowAPI,name:MethodName,args:unknown[]):Promise<unknown>=>Reflect.apply(api[name],api,args);
const notice=():CustomerWriteNotice=>({schema:'customer-write-notice/1',kind:'committed-cleanup',id:'92000000-0000-4000-8000-000000000001',sequence:1,message:CUSTOMER_WRITE_COMMITTED_NOTICE,requiresRestart:true});

beforeEach(()=>{
 vi.resetModules();vi.clearAllMocks();mocks.invoke.mockReset();mocks.build.mockReset().mockResolvedValue({});
 for(const spy of Object.values(mocks.methods))spy.mockReset();
 for(const spy of Object.values(mocks.hidden))spy.mockReset().mockResolvedValue(undefined);
 mocks.serviceInstances.length=0;
});
afterEach(()=>vi.unstubAllGlobals());

async function preload(){
 const window={postMessage:vi.fn()};vi.stubGlobal('window',window);
 await import('../src/main/preload');expect(mocks.expose).toHaveBeenCalledExactlyOnceWith('studio',expect.any(Object));
 return{api:mocks.expose.mock.calls[0][1] as CulturalWorkflowAPI,window};
}
async function browser(fetchMock:ReturnType<typeof vi.fn>){
 const window={postMessage:vi.fn()} as {studio?:CulturalWorkflowAPI;postMessage:ReturnType<typeof vi.fn>};
 vi.stubGlobal('window',window);vi.stubGlobal('fetch',fetchMock);await import('../src/shared/browser-api');
 if(!window.studio)throw Error('M920 browser bridge was not installed');
 return{api:window.studio,window};
}

describe('M920 public cultural capability discovery',()=>{
 it('keeps the exact eleven own data-function methods and no material or close surface',()=>{
  expect(CULTURAL_WORKFLOW_METHODS).toEqual(EXPECTED_METHODS);expect(Object.isFrozen(CULTURAL_WORKFLOW_METHODS)).toBe(true);
  const complete=Object.fromEntries(EXPECTED_METHODS.map(name=>[name,vi.fn()]));
  expect(hasCulturalWorkflowAPI(complete)).toBe(true);
  for(const name of HIDDEN_METHODS)expect(CULTURAL_WORKFLOW_METHODS).not.toContain(name);
  for(const value of [undefined,null,false,0,'api',()=>complete,[],Object.create(complete)])expect(hasCulturalWorkflowAPI(value)).toBe(false);
 });
 it.each(EXPECTED_METHODS)('rejects a missing or non-function %s',name=>{
  const complete=Object.fromEntries(EXPECTED_METHODS.map(method=>[method,vi.fn()]));
  delete complete[name];expect(hasCulturalWorkflowAPI(complete)).toBe(false);
  Object.defineProperty(complete,name,{value:undefined,enumerable:true,configurable:true});
  expect(hasCulturalWorkflowAPI(complete)).toBe(false);
 });
 it.each(EXPECTED_METHODS)('does not execute a getter for %s',name=>{
  const getter=vi.fn(()=>vi.fn()),complete=Object.fromEntries(EXPECTED_METHODS.map(method=>[method,vi.fn()]));
  Object.defineProperty(complete,name,{get:getter,enumerable:true,configurable:true});
  expect(hasCulturalWorkflowAPI(complete)).toBe(false);expect(getter).not.toHaveBeenCalled();
 });
 it('contains hostile descriptor failures without triggering ordinary property getters',()=>{
  const get=vi.fn(),descriptor=vi.fn(()=>{throw Error('descriptor trap');});
  const value=new Proxy({},{get,getOwnPropertyDescriptor:descriptor});
  expect(hasCulturalWorkflowAPI(value)).toBe(false);expect(descriptor).toHaveBeenCalledTimes(1);expect(get).not.toHaveBeenCalled();
 });
});

describe('M920 actual preload cultural IPC delegates with faked replies',()=>{
 it.each(cases)('forwards $name with exact arguments and untouched identities',async({name,args:input})=>{
  const args=input(),before=structuredClone(args),reply=fakeReply(name),{api}=await preload();mocks.invoke.mockResolvedValueOnce(reply);
  expect(hasCulturalWorkflowAPI(api)).toBe(true);await expect(call(api,name,args)).resolves.toBe(reply);
  expect(mocks.invoke).toHaveBeenCalledExactlyOnceWith('studio:'+name,...args);
  const sent=mocks.invoke.mock.calls[0].slice(1);expect(sent).toHaveLength(args.length);
  for(let index=0;index<args.length;index++)expect(sent[index]).toBe(args[index]);
  expect(args).toEqual(before);
 });
 it.each(cases)('keeps illegal extra arguments for $name visible to the owning Service',async({name,args:input})=>{
  const args=[...input(),payload('illegal extra argument')],{api}=await preload(),error=new Error('faked Service arity rejection '+name);
  mocks.invoke.mockRejectedValueOnce(error);await expect(call(api,name,args)).rejects.toBe(error);
  expect(mocks.invoke).toHaveBeenCalledExactlyOnceWith('studio:'+name,...args);
  expect(mocks.invoke.mock.calls[0]).toHaveLength(args.length+1);
 });
 it.each(cases)('preserves the IPC error identity for $name',async({name,args})=>{
  const {api}=await preload(),error=new Error('faked IPC error𠮷😀 '+name);mocks.invoke.mockRejectedValueOnce(error);
  await expect(call(api,name,args())).rejects.toBe(error);
 });
 it('distinguishes an omitted revision from explicit undefined, null and an extra undefined',async()=>{
  const {api}=await preload();mocks.invoke.mockResolvedValue(undefined);
  for(const args of [['comparison'],['comparison',undefined],['comparison',null],['comparison',3,undefined]]){
   await call(api,'readCulturalComparison',args);
   expect(mocks.invoke).toHaveBeenLastCalledWith('studio:readCulturalComparison',...args);
   expect(mocks.invoke.mock.calls.at(-1)).toHaveLength(args.length+1);
  }
 });
 it('subscribes to the existing desktop notice channel and exposes no hidden provider methods',async()=>{
  const {api,window}=await preload(),listener=mocks.on.mock.calls.find(([channel])=>channel==='studio:customer-write-notice')?.[1];
  expect(typeof listener).toBe('function');const value=notice();listener({},value);
  expect(window.postMessage).toHaveBeenCalledExactlyOnceWith({type:CUSTOMER_WRITE_NOTICE_MESSAGE,source:'desktop',notice:value},'*');
  for(const name of HIDDEN_METHODS)expect(Object.hasOwn(api,name)).toBe(false);
 });
});

describe('M920 actual browser fetch transport with faked replies',()=>{
 it.each(cases)('posts $name as the exact original JSON argument array with the local header',async({name,args:input})=>{
  const args=input(),before=structuredClone(args),reply=fakeReply(name),fetchMock=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(reply),{status:200})),{api}=await browser(fetchMock);
  expect(hasCulturalWorkflowAPI(api)).toBe(true);await expect(call(api,name,args)).resolves.toEqual(reply);
  expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/__studio_api/'+name,{method:'POST',headers:{'Content-Type':'application/json','X-Studio-Local-Request':'1'},body:JSON.stringify(before)});
  expect(args).toEqual(before);for(const hidden of HIDDEN_METHODS)expect(Object.hasOwn(api,hidden)).toBe(false);
 });
 it.each(cases)('preserves illegal extra JSON arguments for $name and its service error',async({name,args:input})=>{
  const args=[...input(),payload('illegal extra argument')],message='faked Service arity rejection '+name;
  const fetchMock=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({error:message}),{status:400})),{api}=await browser(fetchMock);
  await expect(call(api,name,args)).rejects.toThrow(message);
  expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify(args));
 });
 it.each(cases)('retains the service error and network rejection for $name',async({name,args})=>{
  const message='faked cultural HTTP rejection𠮷😀 '+name,network=new Error('faked transport connection rejection '+name);
  const fetchMock=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({error:message}),{status:400})).mockRejectedValueOnce(network),{api}=await browser(fetchMock);
  await expect(call(api,name,args())).rejects.toThrow(message);await expect(call(api,name,args())).rejects.toBe(network);
 });
 it('omits only the legal optional revision while keeping null and illegal undefined argument slots',async()=>{
  const fetchMock=vi.fn().mockImplementation(()=>Promise.resolve(new Response('null',{status:200}))),{api}=await browser(fetchMock);
  await call(api,'readCulturalComparison',['comparison']);expect(fetchMock.mock.calls[0][1].body).toBe('["comparison"]');
  await call(api,'readCulturalComparison',['comparison',undefined]);expect(fetchMock.mock.calls[1][1].body).toBe('["comparison"]');
  await call(api,'readCulturalComparison',['comparison',null]);expect(fetchMock.mock.calls[2][1].body).toBe('["comparison",null]');
  await call(api,'readCulturalComparison',['comparison',3,undefined]);expect(fetchMock.mock.calls[3][1].body).toBe('["comparison",3,null]');
  await call(api,'getCulturalStorageCapabilities',[undefined]);expect(fetchMock.mock.calls[4][1].body).toBe('[null]');
  await call(api,'migrateCulturalStorage',[undefined]);expect(fetchMock.mock.calls[5][1].body).toBe('[null]');
 });
 it('delivers the real notice header on both success and rejection without changing either body',async()=>{
  const value=notice(),header=customerWriteNoticeHeader(value),reply=fakeReply('commitCulturalWrite');expect(header).toBeTypeOf('string');
  const fetchMock=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(reply),{status:200,headers:{[CUSTOMER_WRITE_NOTICE_HEADER]:header!}})).mockResolvedValueOnce(new Response(JSON.stringify({error:'faked commit failure'}),{status:400,headers:{[CUSTOMER_WRITE_NOTICE_HEADER]:header!}}));
  const {api,window}=await browser(fetchMock);await expect(call(api,'commitCulturalWrite',[payload('commit')])).resolves.toEqual(reply);
  await expect(call(api,'commitCulturalWrite',[payload('commit')])).rejects.toThrow('faked commit failure');
  expect(window.postMessage.mock.calls).toEqual(Array.from({length:2},()=>[{type:CUSTOMER_WRITE_NOTICE_MESSAGE,source:'browser',notice:value},'*']));
 });
 it('does not let a malformed notice, notification failure or invalid error JSON replace the primary result',async()=>{
  const reply=fakeReply('prepareCulturalWrite'),fetchMock=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(reply),{status:200,headers:{[CUSTOMER_WRITE_NOTICE_HEADER]:'%broken'}})).mockResolvedValueOnce(new Response(JSON.stringify(reply),{status:200,headers:{[CUSTOMER_WRITE_NOTICE_HEADER]:customerWriteNoticeHeader(notice())!}})).mockResolvedValueOnce(new Response('invalid error JSON',{status:500}));
  const {api,window}=await browser(fetchMock);await expect(call(api,'prepareCulturalWrite',[payload('save')])).resolves.toEqual(reply);expect(window.postMessage).not.toHaveBeenCalled();
  window.postMessage.mockImplementation(()=>{throw Error('faked notification failure');});await expect(call(api,'prepareCulturalWrite',[payload('save')])).resolves.toEqual(reply);
  await expect(call(api,'prepareCulturalWrite',[payload('save')])).rejects.toThrow('本地服务连接失败');
 });
 it('keeps an installed desktop bridge intact',async()=>{
  const existing=Object.fromEntries(EXPECTED_METHODS.map(name=>[name,vi.fn()])),window={studio:existing},fetchMock=vi.fn();
  vi.stubGlobal('window',window);vi.stubGlobal('fetch',fetchMock);await import('../src/shared/browser-api');
  expect(window.studio).toBe(existing);expect(fetchMock).not.toHaveBeenCalled();
 });
});

type Middleware=(request:unknown,response:unknown,next:()=>void)=>Promise<void>;
async function developmentMiddleware(){
 let handler:Middleware|undefined;const once=vi.fn(),plugin=(await import('../scripts/dev-plugin')).studioDevPlugin();
 await(plugin.configureServer as Function)({config:{root:resolve('.')},httpServer:{once},middlewares:{use(value:Middleware){handler=value;}}});
 if(!handler)throw Error('M920 development middleware missing');return{handler,once};
}
async function request(handler:Middleware,method:string,body:string,options:{verb?:string;headers?:Record<string,string|undefined>;url?:string;chunks?:Uint8Array[]}={}){
 let status=200,output='';const headers:Record<string,string>={},next=vi.fn(()=>{status=404;});
 const req={url:options.url??'/__studio_api/'+method,method:options.verb??'POST',headers:options.headers??{host:'127.0.0.1:18000','x-studio-local-request':'1'},async *[Symbol.asyncIterator](){for(const chunk of options.chunks??[Buffer.from(body)])yield chunk;}};
 const res={get statusCode(){return status;},set statusCode(value:number){status=value;},setHeader(name:string,value:string){headers[name.toLowerCase()]=value;},end(value=''){output+=value;}};
 await handler(req,res,next);let value:unknown;try{value=JSON.parse(output);}catch{value=output;}return{status,body:value,headers,next};
}

describe('M920 actual development middleware with a fake Service',()=>{
 it.each(cases)('allows $name and dispatches exact decoded arguments to the fake Service',async({name,args:input})=>{
  const {handler}=await developmentMiddleware(),args=input(),reply=fakeReply(name);mocks.methods[name].mockResolvedValueOnce(reply);
  const result=await request(handler,name,JSON.stringify(args));expect(result.status).toBe(200);expect(result.body).toEqual(reply);
  expect(result.headers['content-type']).toBe('application/json; charset=utf-8');expect(mocks.methods[name]).toHaveBeenCalledExactlyOnceWith(...args);
  expect(mocks.methods[name].mock.contexts[0]).toBe(mocks.serviceInstances[0]);
  expect(mocks.build).toHaveBeenCalledTimes(1);expect(mocks.build.mock.calls[0][0].entryPoints).toEqual(['src/main/cmn-reading-worker.ts']);
 });
 it.each(cases)('keeps extra arguments for $name and reports the fake Service rejection',async({name,args:input})=>{
  const {handler}=await developmentMiddleware(),args=[...input(),payload('illegal extra argument')],message='faked Service strict arity '+name;
  mocks.methods[name].mockRejectedValueOnce(new Error(message));const result=await request(handler,name,JSON.stringify(args));
  expect(result.status).toBe(400);expect(result.body).toEqual({error:message});expect(mocks.methods[name]).toHaveBeenCalledExactlyOnceWith(...args);
 });
 it.each([
  {label:'GET',verb:'GET',headers:{host:'127.0.0.1:18000','x-studio-local-request':'1'}},
  {label:'missing local header',verb:'POST',headers:{host:'127.0.0.1:18000'}},
  {label:'wrong local header',verb:'POST',headers:{host:'127.0.0.1:18000','x-studio-local-request':'0'}},
  {label:'foreign origin',verb:'POST',headers:{host:'127.0.0.1:18000','x-studio-local-request':'1',origin:'https://different.invalid'}},
 ])('rejects $label before constructing the fake Store or dispatching',async({verb,headers})=>{
  const {handler}=await developmentMiddleware(),result=await request(handler,'getCulturalStorageCapabilities','[]',{verb,headers});
  expect(result.status).toBe(403);expect(result.body).toBe('Forbidden');expect(mocks.storeConstruct).not.toHaveBeenCalled();
  for(const spy of Object.values(mocks.methods))expect(spy).not.toHaveBeenCalled();
 });
 it('accepts the matching local origin and preserves split UTF-8 payloads',async()=>{
  const {handler}=await developmentMiddleware(),args=[payload('split request')],body=JSON.stringify(args),bytes=Buffer.from(body),split=bytes.indexOf(Buffer.from('𠮷'))+1;
  expect(split).toBeGreaterThan(0);mocks.methods.prepareCulturalBirthAnchor.mockResolvedValueOnce(fakeReply('prepareCulturalBirthAnchor'));
  const result=await request(handler,'prepareCulturalBirthAnchor',body,{headers:{host:'127.0.0.1:18000','x-studio-local-request':'1',origin:'http://127.0.0.1:18000'},chunks:[bytes.subarray(0,split),bytes.subarray(split)]});
  expect(result.status).toBe(200);expect(mocks.methods.prepareCulturalBirthAnchor).toHaveBeenCalledExactlyOnceWith(...args);
 });
 it.each(HIDDEN_METHODS)('rejects the unexposed %s method even when present on the fake Service',async name=>{
  const {handler}=await developmentMiddleware(),result=await request(handler,name,'[]');
  expect(result.status).toBe(400);expect(result.body).toEqual({error:'此功能使用系统文件选择器，请在桌面应用中操作。'});
  expect(mocks.hidden[name]).not.toHaveBeenCalled();for(const spy of Object.values(mocks.methods))expect(spy).not.toHaveBeenCalled();
 });
 it('rejects malformed and non-array JSON and delegates non-API URLs to next',async()=>{
  const {handler}=await developmentMiddleware();
  expect((await request(handler,'prepareCulturalWrite','{')).status).toBe(400);
  const nonArray=await request(handler,'prepareCulturalWrite','{}');expect(nonArray.status).toBe(400);expect(nonArray.body).toEqual({error:'无效请求参数'});
  const other=await request(handler,'prepareCulturalWrite','[]',{url:'/unrelated'});expect(other.status).toBe(404);expect(other.next).toHaveBeenCalledTimes(1);
  for(const spy of Object.values(mocks.methods))expect(spy).not.toHaveBeenCalled();
 });
});

function descendants(node:ts.Node){const nodes:ts.Node[]=[];const visit=(child:ts.Node)=>{nodes.push(child);ts.forEachChild(child,visit);};visit(node);return nodes;}
// Extract actual statements, including the notice wrapper and sender/phase
// guard. Only unrelated Electron startup is omitted; no route body is copied or
// reimplemented. The resulting product statements execute in a bounded VM.
function actualMainBridgeProgram(){
 const source=ts.createSourceFile('main.ts',readFileSync(resolve('src/main/main.ts'),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),nodes=descendants(source);
 const statement=(name:string)=>{
  const matches=nodes.filter(ts.isVariableStatement).filter(node=>node.declarationList.declarations.some(declaration=>ts.isIdentifier(declaration.name)&&declaration.name.text===name));
  if(matches.length!==1)throw Error('M920 actual main declaration missing or ambiguous: '+name);return matches[0].getText(source);
 };
 const loops=nodes.filter(ts.isForOfStatement).filter(node=>ts.isIdentifier(node.expression)&&node.expression.text==='CULTURAL_WORKFLOW_METHODS');
 if(loops.length!==1)throw Error('M920 actual cultural registration tuple loop missing or ambiguous');
 return ts.transpileModule([statement('invokeWithNotice'),statement('register'),loops[0].getText(source)].join('\n'),{fileName:'m920-main-ipc-extract.ts',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
}
const mainBridgeProgram=actualMainBridgeProgram();
function mainBridge(desktopPhase=false){
 type Route=(event:{sender:object},...args:unknown[])=>unknown;
 const routes=new Map<string,Route>(),webContents={send:vi.fn()},service={store:{},...mocks.methods},desktop176Context=desktopPhase?{}:undefined;
 const phase=vi.fn(),withNotice=vi.fn((owner:object,action:()=>unknown,publish:(value:CustomerWriteNotice)=>void)=>invokeWithCustomerWriteNotice(owner,action,publish));
 const handle=vi.fn((channel:string,route:Route)=>{if(routes.has(channel))throw Error('duplicate IPC route '+channel);routes.set(channel,route);});
 runInNewContext(mainBridgeProgram,{CULTURAL_WORKFLOW_METHODS,service,window:{webContents},ipcMain:{handle},desktop176Context,assertDesktop176PhaseMethod:phase,invokeWithCustomerWriteNotice:withNotice},{timeout:1000});
 const route=(name:MethodName)=>{const handler=routes.get('studio:'+name);if(!handler)throw Error('missing actual main route '+name);return handler;};
 return{routes,route,webContents,service,desktop176Context,phase,withNotice,handle};
}

describe('M920 executes actual main IPC tuple registration and guarded routes in a VM',()=>{
 it('registers every public cultural method exactly once without hidden provider routes',()=>{
  const bridge=mainBridge();expect([...bridge.routes.keys()]).toEqual(EXPECTED_METHODS.map(name=>'studio:'+name));expect(bridge.handle).toHaveBeenCalledTimes(11);
  for(const hidden of HIDDEN_METHODS)expect(bridge.routes.has('studio:'+hidden)).toBe(false);
 });
 it.each(cases)('runs the actual $name route through the real write-notice wrapper',async({name,args:input})=>{
  const bridge=mainBridge(true),args=input(),reply=fakeReply(name);mocks.methods[name].mockResolvedValueOnce(reply);
  await expect(bridge.route(name)({sender:bridge.webContents},...args)).resolves.toBe(reply);
  expect(mocks.methods[name]).toHaveBeenCalledExactlyOnceWith(...args);expect(mocks.methods[name].mock.contexts[0]).toBe(bridge.service);
  expect(bridge.phase).toHaveBeenCalledExactlyOnceWith(bridge.desktop176Context,name);
  expect(bridge.withNotice).toHaveBeenCalledExactlyOnceWith(bridge.service.store,expect.any(Function),expect.any(Function));
  expect(bridge.webContents.send).not.toHaveBeenCalled();
 });
 it.each(cases)('rejects a foreign sender for $name before phase, notice or Service work',({name,args})=>{
  const bridge=mainBridge(true);expect(()=>bridge.route(name)({sender:{}},...args())).toThrow('无效的调用来源。');
  expect(bridge.phase).not.toHaveBeenCalled();expect(bridge.withNotice).not.toHaveBeenCalled();expect(mocks.methods[name]).not.toHaveBeenCalled();
 });
 it.each(cases)('preserves illegal extra arguments and the fake owning Service error for $name',async({name,args:input})=>{
  const bridge=mainBridge(),args=[...input(),payload('illegal extra argument')],error=new Error('faked owning Service arity error '+name);
  mocks.methods[name].mockRejectedValueOnce(error);await expect(bridge.route(name)({sender:bridge.webContents},...args)).rejects.toBe(error);
  expect(mocks.methods[name]).toHaveBeenCalledExactlyOnceWith(...args);expect(mocks.methods[name].mock.calls[0]).toHaveLength(args.length);
 });
 it('preserves the actual read route argument count for omitted and explicit optional values',async()=>{
  const bridge=mainBridge(),spy=mocks.methods.readCulturalComparison;spy.mockResolvedValue(undefined);
  for(const args of [['comparison'],['comparison',undefined],['comparison',null],['comparison',3,undefined]]){
   spy.mockClear();await bridge.route('readCulturalComparison')({sender:bridge.webContents},...args);
   expect(spy).toHaveBeenCalledExactlyOnceWith(...args);expect(spy.mock.calls[0]).toHaveLength(args.length);
  }
 });
 it('lets the real phase-guard position stop dispatch before invoking the write wrapper',()=>{
  const bridge=mainBridge(true),error=new Error('faked phase-method guard rejection');bridge.phase.mockImplementation(()=>{throw error;});
  expect(()=>bridge.route('migrateCulturalStorage')({sender:bridge.webContents})).toThrow(error);
  expect(bridge.phase).toHaveBeenCalledExactlyOnceWith(bridge.desktop176Context,'migrateCulturalStorage');expect(bridge.withNotice).not.toHaveBeenCalled();expect(mocks.methods.migrateCulturalStorage).not.toHaveBeenCalled();
 });
});
