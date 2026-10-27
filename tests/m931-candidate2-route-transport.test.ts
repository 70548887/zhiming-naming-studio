import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import path from 'node:path';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {captureCandidate2ServiceInput} from '../src/main/candidate2-service-input';
import {CANDIDATE2_NAMING_SELECTION} from '../src/shared/candidate2-naming-consumer-v1';
import {mainNoticeSource,noticeTransportForMain} from './helpers/main-notice-registration';

/** M931 mock transport-only checks of the actual new generateCandidate2 route.
 * A valid request reaches the real pure capture helper and then always throws
 * a boundary sentinel (or an explicitly injected error-propagation fixture).
 * No fake successful result, adoption capture, native save, migration, CAS or
 * core calculation is returned or proved. Unrelated startup CMN build is mocked.
 * This preparation file is copied into tests/ only after the worktree exists.
 */
const METHOD='generateCandidate2';
const SENTINEL='M931_BOUNDARY_ONLY: no native Store or save invoked';
const READONLY_ERROR='M931_READONLY_TRANSPORT_ONLY: no eligibility authority';
const mocks=vi.hoisted(()=>({
 expose:vi.fn(),invoke:vi.fn(),on:vi.fn(),build:vi.fn(),storeConstruct:vi.fn(),storeInit:vi.fn(),
 dispatch:vi.fn(),arity:vi.fn(),readonly:vi.fn(),generate:vi.fn(),save:vi.fn(),migrate:vi.fn(),close:vi.fn(),
 candidateBuild:vi.fn(),previewBuildFactory:vi.fn(),previewBuild:vi.fn(),
}));
vi.mock('electron',()=>({contextBridge:{exposeInMainWorld:mocks.expose},ipcRenderer:{invoke:mocks.invoke,on:mocks.on}}));
vi.mock('esbuild',()=>({build:mocks.build}));
vi.mock('../scripts/build-candidate2-naming-dependency-v1.mjs',()=>({ensureCandidate2NamingDependency:mocks.candidateBuild}));
vi.mock('../scripts/build-root-feedback-v132-preview.mjs',()=>({createLazyRootFeedbackV132PreviewBuild:mocks.previewBuildFactory}));
vi.mock('../src/main/store',()=>({Store:class {
 constructor(...args:unknown[]){mocks.storeConstruct(...args);}
 async init(){mocks.storeInit();return this;}
}}));
vi.mock('../src/main/service',()=>({StudioService:class {
 store:unknown;
 constructor(store:unknown){this.store=store;}
 generateCandidate2(...args:unknown[]){return mocks.dispatch(...args);}
 checkCandidate2NamingEligibility(...args:unknown[]){return mocks.readonly(...args);}
 generate(...args:unknown[]){return mocks.generate(...args);}
 saveSession(...args:unknown[]){return mocks.save(...args);}
 migrateCustomerStorage(...args:unknown[]){return mocks.migrate(...args);}
 closeCmnReadingWorker(){return mocks.close();}
}}));

type Api=Record<string,(...args:unknown[])=>Promise<unknown>>;
type Route=(event:{sender:object},...args:unknown[])=>unknown;
type Middleware=(request:unknown,response:unknown,next:()=>void)=>Promise<void>;
const preferences=()=>({length:1,generationChar:' ',requiredChars:' 沐 ',forbiddenChars:' 忌 ',elderTaboo:' 长辈 ',style:' 清朗 ',meanings:' 平安𠮷😀 ',industry:' 文化 ',priority:'balanced',preferredElements:[],zodiacRules:false,numerology:false,avoidParentNames:false});
const args=():unknown[]=>['  m931-existing-native-profile-id  ',preferences(),CANDIDATE2_NAMING_SELECTION];
const inputFailure=/CANDIDATE2_SERVICE_INPUT_INVALID|PROJECT_APPLICATION_INPUT_INVALID/u;
function descendants(node:ts.Node){const rows:ts.Node[]=[];const walk=(item:ts.Node)=>{rows.push(item);ts.forEachChild(item,walk);};walk(node);return rows;}
function mainBridge(){
 const {file,source}=mainNoticeSource(),nodes=descendants(source);
 const statement=(name:string)=>{
  const matches=nodes.filter(ts.isVariableStatement).filter(node=>node.declarationList.declarations.some(declaration=>ts.isIdentifier(declaration.name)&&declaration.name.text===name));
  if(matches.length!==1)throw Error('M931 actual main declaration missing: '+name);return matches[0].getText(source);
 };
 const registrations=nodes.filter(ts.isCallExpression).filter(node=>ts.isIdentifier(node.expression)&&node.expression.text==='register'&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0])&&node.arguments[0].text===METHOD);
 if(registrations.length!==1)throw Error('M931 unique actual generateCandidate2 guarded route is required');
 const code=ts.transpileModule([statement('invokeWithNotice'),statement('register'),registrations[0].getText(source)+';'].join('\n'),{compilerOptions:{module:ts.ModuleKind.None,target:ts.ScriptTarget.ES2022}}).outputText;
 const handlers=new Map<string,Route>(),webContents={send:vi.fn()},phase=vi.fn(),desktop176Context={};
 const service={store:{},generateCandidate2:(...values:unknown[])=>mocks.dispatch(...values)};
 const actualNotice=noticeTransportForMain(file),notice=vi.fn((...values:unknown[])=>Reflect.apply(actualNotice,undefined,values));
 runInNewContext(code,{ipcMain:{handle:(channel:string,route:Route)=>handlers.set(channel,route)},window:{webContents},desktop176Context,assertDesktop176PhaseMethod:phase,invokeWithCustomerWriteNotice:notice,service},{timeout:1000});
 const route=handlers.get('studio:'+METHOD);if(!route)throw Error('M931 actual main handler was not installed');
 return{route,handlers,webContents,phase,notice,desktop176Context,registrationCount:registrations.length};
}
async function preload(bridge?:ReturnType<typeof mainBridge>){
 vi.stubGlobal('window',{postMessage:vi.fn()});
 if(bridge)mocks.invoke.mockImplementation((channel:string,...values:unknown[])=>Promise.resolve().then(()=>{
  if(channel!=='studio:'+METHOD)throw Error('unexpected IPC namespace');return bridge.route({sender:bridge.webContents},...values);
 }));
 await import('../src/main/preload');expect(mocks.expose).toHaveBeenCalledTimes(1);return mocks.expose.mock.calls[0][1] as Api;
}
async function middleware():Promise<Middleware>{
 let handler:Middleware|undefined;const plugin=(await import('../scripts/dev-plugin')).studioDevPlugin();
 await(plugin.configureServer as Function)({config:{root:path.resolve('.')},httpServer:{once:vi.fn()},middlewares:{use(value:Middleware){handler=value;}}});
 if(!handler)throw Error('M931 actual development middleware missing');return handler;
}
async function request(handler:Middleware,name:string,payload:string,headers:Record<string,string>={host:'127.0.0.1:18000','x-studio-local-request':'1'},verb='POST'){
 let status=200,text='';const responseHeaders:Record<string,string>={};
 const req={url:'/__studio_api/'+name,method:verb,headers,async *[Symbol.asyncIterator](){yield Buffer.from(payload);}};
 const res={get statusCode(){return status;},set statusCode(value:number){status=value;},setHeader(name:string,value:string){responseHeaders[name.toLowerCase()]=value;},end(value=''){text+=value;}};
 await handler(req,res,()=>{status=404;});let body:any;try{body=JSON.parse(text);}catch{body=text;}return{status,body,headers:responseHeaders};
}
async function browser(){
 const handler=await middleware(),fetchMock=vi.fn(async(url:string,options:{body:string})=>{
  const reply=await request(handler,url.slice('/__studio_api/'.length),options.body);return new Response(JSON.stringify(reply.body),{status:reply.status,headers:reply.headers});
 });
 const window:{studio?:Api;postMessage:ReturnType<typeof vi.fn>}={postMessage:vi.fn()};vi.stubGlobal('window',window);vi.stubGlobal('fetch',fetchMock);
 await import('../src/shared/browser-api');if(!window.studio)throw Error('M931 actual browser bridge missing');return{api:window.studio,handler,fetchMock};
}
const call=(api:Api,name:string,values:unknown[]):Promise<unknown>=>Reflect.apply(api[name],api,values);

beforeEach(()=>{
 vi.resetModules();vi.clearAllMocks();mocks.invoke.mockReset();mocks.dispatch.mockReset();mocks.arity.mockReset();
 mocks.dispatch.mockImplementation((...values:unknown[])=>{
  mocks.arity(values.length);Reflect.apply(captureCandidate2ServiceInput,undefined,values);throw Error(SENTINEL);
 });
 mocks.readonly.mockReset().mockImplementation(()=>{throw Error(READONLY_ERROR);});
 mocks.build.mockReset().mockResolvedValue({});mocks.close.mockReset().mockResolvedValue(undefined);
 mocks.candidateBuild.mockReset();mocks.previewBuildFactory.mockReset();mocks.previewBuild.mockReset();
});
afterEach(()=>{
 expect(mocks.generate).not.toHaveBeenCalled();expect(mocks.save).not.toHaveBeenCalled();expect(mocks.migrate).not.toHaveBeenCalled();
 expect(mocks.candidateBuild).not.toHaveBeenCalled();expect(mocks.previewBuildFactory).not.toHaveBeenCalled();vi.unstubAllGlobals();
});

describe('M931 actual generateCandidate2 transport route, mock boundary only',{timeout:30000},()=>{
 it('exposes one guarded studio namespace route and forwards exact raw three values through preload/main',async()=>{
  const bridge=mainBridge(),api=await preload(bridge),values=args(),before=structuredClone(values);
  expect(bridge.registrationCount).toBe(1);expect([...bridge.handlers.keys()]).toEqual(['studio:generateCandidate2']);
  expect(Object.keys(api).filter(name=>name===METHOD)).toHaveLength(1);
  await expect(call(api,METHOD,values)).rejects.toThrow(SENTINEL);
  expect(mocks.invoke).toHaveBeenCalledExactlyOnceWith('studio:generateCandidate2',...values);
  expect(mocks.dispatch).toHaveBeenCalledExactlyOnceWith(...values);expect(mocks.arity).toHaveBeenCalledExactlyOnceWith(3);
  expect(mocks.dispatch.mock.calls[0][1]).toBe(values[1]);expect(values).toEqual(before);
  expect(bridge.phase).toHaveBeenCalledExactlyOnceWith(bridge.desktop176Context,METHOD);expect(bridge.notice).toHaveBeenCalledTimes(1);
 });
 it.each([1,2])('preserves %s extra undefined IPC slots so actual main/helper reject them',async count=>{
  const bridge=mainBridge(),api=await preload(bridge),values=[...args(),...Array.from({length:count},()=>undefined)];
  await expect(call(api,METHOD,values)).rejects.toThrow('exactly profile id');
  expect(mocks.dispatch.mock.calls[0]).toEqual(values);expect(mocks.arity).toHaveBeenCalledExactlyOnceWith(3+count);
 });
 it('preserves undefined selection in the third IPC slot for real input rejection',async()=>{
  const api=await preload(mainBridge()),values=[...args().slice(0,2),undefined];
  await expect(call(api,METHOD,values)).rejects.toThrow(inputFailure);expect(mocks.dispatch.mock.calls[0]).toEqual(values);
  expect(mocks.arity).toHaveBeenCalledExactlyOnceWith(3);
 });
 it('executes the actual foreign-sender guard without entering the capture helper',()=>{
  const bridge=mainBridge();expect(()=>bridge.route({sender:{}},...args())).toThrow('无效的调用来源。');
  expect(mocks.dispatch).not.toHaveBeenCalled();expect(bridge.phase).not.toHaveBeenCalled();expect(bridge.notice).not.toHaveBeenCalled();
 });
 it('executes the actual phase guard before dispatch rather than bypassing it in the test',()=>{
  const bridge=mainBridge(),failure=new Error('M931 transport phase rejection');bridge.phase.mockImplementation(()=>{throw failure;});
  expect(()=>bridge.route({sender:bridge.webContents},...args())).toThrow(failure);expect(mocks.dispatch).not.toHaveBeenCalled();expect(bridge.notice).not.toHaveBeenCalled();
 });
 it('forwards complete raw preferences through actual browser and middleware to sentinel rejection only',async()=>{
  const {api,fetchMock}=await browser(),values=args(),before=structuredClone(values);
  expect(typeof api.generateCandidate2).toBe('function');await expect(call(api,METHOD,values)).rejects.toThrow(SENTINEL);
  expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify(values));expect(mocks.dispatch.mock.calls[0]).toEqual(values);
  expect(mocks.arity).toHaveBeenCalledExactlyOnceWith(3);expect(values).toEqual(before);
 });
 it.each([1,2])('retains %s extra undefined browser slots as null instead of erasing invalid generation arity',async count=>{
  const {api,fetchMock}=await browser(),values=[...args(),...Array.from({length:count},()=>undefined)];
  await expect(call(api,METHOD,values)).rejects.toThrow('exactly profile id');
  const decoded=[...args(),...Array.from({length:count},()=>null)];expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify(decoded));
  expect(mocks.dispatch.mock.calls[0]).toEqual(decoded);expect(mocks.arity).toHaveBeenCalledExactlyOnceWith(3+count);
 });
 it('retains the undefined third browser slot as explicit JSON null and rejects it without defaults',async()=>{
  const {api,fetchMock}=await browser(),values=[...args().slice(0,2),undefined];
  await expect(call(api,METHOD,values)).rejects.toThrow(inputFailure);
  expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify([...args().slice(0,2),null]));expect(mocks.arity).toHaveBeenCalledExactlyOnceWith(3);
 });
 it.each([1,2])('rejects %s extra direct HTTP null slots with 400 and no migration or fallback',async count=>{
  const handler=await middleware(),values=[...args(),...Array.from({length:count},()=>null)];
  const reply=await request(handler,METHOD,JSON.stringify(values));expect(reply.status).toBe(400);expect(reply.body.error).toContain('exactly profile id');
  expect(mocks.dispatch.mock.calls[0]).toEqual(values);expect(mocks.arity).toHaveBeenCalledExactlyOnceWith(3+count);
 });
 it('preserves the old read-only route and its injected error without treating it as a save result',async()=>{
  const {api}=await browser(),values=[{profileFixture:'transport only'},preferences(),CANDIDATE2_NAMING_SELECTION];
  await expect(call(api,'checkCandidate2NamingEligibility',values)).rejects.toThrow(READONLY_ERROR);
  expect(mocks.readonly).toHaveBeenCalledExactlyOnceWith(...values);expect(mocks.dispatch).not.toHaveBeenCalled();
 });
 it('transports a legacy CAS error string without claiming native CAS or saving',async()=>{
  const message='客户库已被另一个窗口或进程更新，本次写入已取消。请重新打开应用以载入最新资料。';
  mocks.dispatch.mockImplementationOnce((...values:unknown[])=>{mocks.arity(values.length);Reflect.apply(captureCandidate2ServiceInput,undefined,values);throw Error(message);});
  const {api}=await browser();await expect(call(api,METHOD,args())).rejects.toThrow(message);expect(mocks.arity).toHaveBeenCalledExactlyOnceWith(3);
 });
 it('keeps POST/local-header/origin namespace guards ahead of mocked Service dispatch',async()=>{
  const handler=await middleware(),payload=JSON.stringify(args());
  for(const [headers,verb]of [
   [{host:'127.0.0.1:18000','x-studio-local-request':'1'},'GET'],
   [{host:'127.0.0.1:18000'},'POST'],
   [{host:'127.0.0.1:18000','x-studio-local-request':'1',origin:'https://different.invalid'},'POST'],
  ] as [Record<string,string>,string][]){const reply=await request(handler,METHOD,payload,headers,verb);expect(reply.status).toBe(403);}
  expect(mocks.dispatch).not.toHaveBeenCalled();expect(mocks.storeConstruct).not.toHaveBeenCalled();
 });
 it('exposes no sibling capture or verify runtime routes and never builds the candidate dependency on request',async()=>{
  const handler=await middleware();
  for(const name of ['createCandidate2Saved','verifyCandidate2Saved','generateCandidate2Naming']){
   const reply=await request(handler,name,JSON.stringify(args()));expect(reply.status).toBe(400);expect(reply.body.error).toContain('系统文件选择器');
  }
  // Mock Store construction and mocked startup CMN build occur before the
  // allowlist check; neither is candidate deployment or native persistence.
  expect(mocks.storeConstruct).toHaveBeenCalled();expect(mocks.build).toHaveBeenCalledTimes(1);
  expect(mocks.build.mock.calls[0][0].entryPoints).toEqual(['src/main/cmn-reading-worker.ts']);expect(mocks.dispatch).not.toHaveBeenCalled();
 });
});
