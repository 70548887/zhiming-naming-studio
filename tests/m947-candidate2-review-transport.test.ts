import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import path from 'node:path';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {captureCandidate2ReviewInput} from '../src/main/candidate2-review-input';
import {recordCustomerWriteNotice} from '../src/main/writer-finalization';
import {CUSTOMER_WRITE_FAILED_NOTICE} from '../src/shared/customer-write-notice';
import {mainNoticeSource,noticeTransportForMain} from './helpers/main-notice-registration';

/** Actual bridge/middleware statements with a mocked Service, not native
 * review/save/CAS. Valid raw input is checked by the real pure helper and then
 * throws SENTINEL. The injected legacy error strings and real failed-cleanup
 * notice below test transport only; no saved DTO or branded commit is faked. */
const METHOD='reviewCandidate2',SENTINEL='M947_BOUNDARY_ONLY: no native review or save invoked';
const SESSION='c2s_0123456789abcdef0123456789abcdef',TOKEN='94700000-0000-4000-8000-000000000001';
const mocks=vi.hoisted(()=>({
 expose:vi.fn(),invoke:vi.fn(),on:vi.fn(),build:vi.fn(),dispatch:vi.fn(),arity:vi.fn(),storeConstruct:vi.fn(),storeInit:vi.fn(),
 save:vi.fn(),generate:vi.fn(),migrate:vi.fn(),fallback:vi.fn(),close:vi.fn(),candidateBuild:vi.fn(),previewBuildFactory:vi.fn(),
}));
vi.mock('electron',()=>({contextBridge:{exposeInMainWorld:mocks.expose},ipcRenderer:{invoke:mocks.invoke,on:mocks.on}}));
vi.mock('esbuild',()=>({build:mocks.build}));
vi.mock('../scripts/build-candidate2-naming-dependency-v1.mjs',()=>({ensureCandidate2NamingDependency:mocks.candidateBuild}));
vi.mock('../scripts/build-root-feedback-v132-preview.mjs',()=>({createLazyRootFeedbackV132PreviewBuild:mocks.previewBuildFactory}));
vi.mock('../src/main/store',()=>({Store:class {constructor(...args:unknown[]){mocks.storeConstruct(...args);}async init(){mocks.storeInit();return this;}}}));
vi.mock('../src/main/service',()=>({StudioService:class {
 store:unknown;constructor(store:unknown){this.store=store;}
 reviewCandidate2(...args:unknown[]){return mocks.dispatch(...args);}
 saveSession(...args:unknown[]){return mocks.save(...args);}
 generateCandidate2(...args:unknown[]){return mocks.generate(...args);}
 generate(...args:unknown[]){return mocks.fallback(...args);}
 migrateCustomerStorage(...args:unknown[]){return mocks.migrate(...args);}
 closeCmnReadingWorker(){return mocks.close();}
}}));
type Api=Record<string,(...args:unknown[])=>Promise<unknown>>;
type Route=(event:{sender:object},...args:unknown[])=>unknown;
type Middleware=(request:unknown,response:unknown,next:()=>void)=>Promise<void>;
const patch=()=>({reviewNote:'  原审阅𠮷😀  ',preferredElements:['水','木'],candidates:[
 {id:'candidate-z',meaning:'  寓意  ',reason:'  推荐  ',traditionalReason:'  原依据  ',reviewNote:'  候选注  ',favorite:false},
 {id:'candidate-a',meaning:'',reason:' ',traditionalReason:' ',reviewNote:'',favorite:true},
]});
const args=():unknown[]=>[SESSION,patch(),7,TOKEN];
const invalid=/CANDIDATE2_REVIEW_INPUT_INVALID|PROJECT_APPLICATION_INPUT_INVALID/u;
function descendants(root:ts.Node){const rows:ts.Node[]=[];const walk=(node:ts.Node)=>{rows.push(node);ts.forEachChild(node,walk);};walk(root);return rows;}
function mainBridge(){
 const {file,source}=mainNoticeSource(),nodes=descendants(source);
 const statement=(name:string)=>{const rows=nodes.filter(ts.isVariableStatement).filter(node=>node.declarationList.declarations.some(declaration=>ts.isIdentifier(declaration.name)&&declaration.name.text===name));if(rows.length!==1)throw Error('M947 actual main declaration missing: '+name);return rows[0].getText(source);};
 const registrations=nodes.filter(ts.isCallExpression).filter(node=>ts.isIdentifier(node.expression)&&node.expression.text==='register'&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0])&&node.arguments[0].text===METHOD);
 if(registrations.length!==1)throw Error('M947 actual review guarded registration missing');
 const code=ts.transpileModule([statement('invokeWithNotice'),statement('register'),registrations[0].getText(source)+';'].join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 const routes=new Map<string,Route>(),webContents={send:vi.fn()},phase=vi.fn(),desktop176Context={};
 const service={store:{},reviewCandidate2:(...values:unknown[])=>mocks.dispatch(...values)};
 const actualNotice=noticeTransportForMain(file),notice=vi.fn((...values:unknown[])=>Reflect.apply(actualNotice,undefined,values));
 runInNewContext(code,{ipcMain:{handle:(channel:string,route:Route)=>routes.set(channel,route)},window:{webContents},desktop176Context,assertDesktop176PhaseMethod:phase,invokeWithCustomerWriteNotice:notice,service},{timeout:1000});
 const route=routes.get('studio:'+METHOD);if(!route)throw Error('M947 actual review handler missing');return{route,routes,webContents,phase,notice,service,desktop176Context};
}
async function preload(bridge:ReturnType<typeof mainBridge>){
 vi.stubGlobal('window',{postMessage:vi.fn()});mocks.invoke.mockImplementation((channel:string,...values:unknown[])=>Promise.resolve().then(()=>{
  if(channel!=='studio:'+METHOD)throw Error('unexpected IPC namespace');return bridge.route({sender:bridge.webContents},...values);
 }));
 await import('../src/main/preload');expect(mocks.expose).toHaveBeenCalledTimes(1);return mocks.expose.mock.calls[0][1] as Api;
}
async function middleware():Promise<Middleware>{
 let handler:Middleware|undefined;const plugin=(await import('../scripts/dev-plugin')).studioDevPlugin();
 await(plugin.configureServer as Function)({config:{root:path.resolve('.')},httpServer:{once:vi.fn()},middlewares:{use(value:Middleware){handler=value;}}});
 if(!handler)throw Error('M947 actual middleware missing');return handler;
}
async function request(handler:Middleware,method:string,values:unknown[],headers:Record<string,string>={host:'127.0.0.1:18000','x-studio-local-request':'1'},verb='POST'){
 let status=200,text='';const responseHeaders:Record<string,string>={};
 const req={url:'/__studio_api/'+method,method:verb,headers,async *[Symbol.asyncIterator](){yield Buffer.from(JSON.stringify(values));}};
 const res={get statusCode(){return status;},set statusCode(value:number){status=value;},setHeader(name:string,value:string){responseHeaders[name.toLowerCase()]=value;},end(value=''){text+=value;}};
 await handler(req,res,()=>{status=404;});let body:any;try{body=JSON.parse(text);}catch{body=text;}return{status,body,headers:responseHeaders};
}
async function browser(){
 const handler=await middleware(),fetchMock=vi.fn(async(url:string,options:{body:string})=>{const result=await request(handler,url.slice('/__studio_api/'.length),JSON.parse(options.body));return new Response(JSON.stringify(result.body),{status:result.status,headers:result.headers});});
 const window:{studio?:Api;postMessage:ReturnType<typeof vi.fn>}={postMessage:vi.fn()};vi.stubGlobal('window',window);vi.stubGlobal('fetch',fetchMock);
 await import('../src/shared/browser-api');if(!window.studio)throw Error('M947 actual browser review bridge missing');return{api:window.studio,handler,fetchMock};
}
const call=(api:Api,values:unknown[]):Promise<unknown>=>Reflect.apply(api[METHOD],api,values);
beforeEach(()=>{
 vi.resetModules();vi.clearAllMocks();mocks.invoke.mockReset();mocks.dispatch.mockReset();mocks.arity.mockReset();
 mocks.dispatch.mockImplementation((...values:unknown[])=>{mocks.arity(values.length);Reflect.apply(captureCandidate2ReviewInput,undefined,values);throw Error(SENTINEL);});
 mocks.build.mockReset().mockResolvedValue({});mocks.close.mockReset().mockResolvedValue(undefined);mocks.candidateBuild.mockReset();mocks.previewBuildFactory.mockReset();
});
afterEach(()=>{
 expect(mocks.save).not.toHaveBeenCalled();expect(mocks.generate).not.toHaveBeenCalled();expect(mocks.migrate).not.toHaveBeenCalled();expect(mocks.fallback).not.toHaveBeenCalled();
 expect(mocks.candidateBuild).not.toHaveBeenCalled();expect(mocks.previewBuildFactory).not.toHaveBeenCalled();vi.unstubAllGlobals();
});

describe('M947 actual review route transport with boundary-only mocked Service',{timeout:30000},()=>{
 it('preserves exact four raw values through actual preload and guarded main registration',async()=>{
  const bridge=mainBridge(),api=await preload(bridge),values=args(),before=structuredClone(values);
  expect([...bridge.routes.keys()]).toEqual(['studio:reviewCandidate2']);await expect(call(api,values)).rejects.toThrow(SENTINEL);
  expect(mocks.invoke).toHaveBeenCalledExactlyOnceWith('studio:reviewCandidate2',...values);expect(mocks.dispatch).toHaveBeenCalledExactlyOnceWith(...values);
  expect(mocks.dispatch.mock.calls[0][1]).toBe(values[1]);expect(mocks.arity).toHaveBeenCalledExactlyOnceWith(4);expect(values).toEqual(before);
  expect(bridge.phase).toHaveBeenCalledExactlyOnceWith(bridge.desktop176Context,METHOD);expect(bridge.notice).toHaveBeenCalledTimes(1);
 });
 it.each([1,2])('keeps %s illegal trailing undefined IPC slots visible to the true helper',async count=>{
  const api=await preload(mainBridge()),values=[...args(),...Array.from({length:count},()=>undefined)];
  await expect(call(api,values)).rejects.toThrow('exactly session id');expect(mocks.dispatch.mock.calls[0]).toEqual(values);expect(mocks.arity).toHaveBeenCalledExactlyOnceWith(4+count);
 });
 it('retains explicit undefined token in the fourth IPC slot for plain input rejection',async()=>{
  const api=await preload(mainBridge()),values=[...args().slice(0,3),undefined];
  await expect(call(api,values)).rejects.toThrow(invalid);expect(mocks.dispatch.mock.calls[0]).toHaveLength(4);expect(mocks.dispatch.mock.calls[0][3]).toBeUndefined();
 });
 it('executes actual main foreign-sender and phase guards before helper or notice work',()=>{
  const bridge=mainBridge();expect(()=>bridge.route({sender:{}},...args())).toThrow('无效的调用来源。');expect(bridge.phase).not.toHaveBeenCalled();
  const phaseError=new Error('M947 transport-only phase guard');bridge.phase.mockImplementation(()=>{throw phaseError;});
  expect(()=>bridge.route({sender:bridge.webContents},...args())).toThrow(phaseError);expect(mocks.dispatch).not.toHaveBeenCalled();expect(bridge.notice).not.toHaveBeenCalled();
 });
 it('posts exact raw review text, draft element order and candidate order through browser/middleware',async()=>{
  const {api,fetchMock}=await browser(),values=args(),before=structuredClone(values);
  await expect(call(api,values)).rejects.toThrow(SENTINEL);expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify(values));
  expect(mocks.dispatch.mock.calls[0]).toEqual(values);expect(values).toEqual(before);expect(mocks.arity).toHaveBeenCalledExactlyOnceWith(4);
 });
 it.each([1,2])('encodes %s extra undefined browser slots as null and rejects instead of trimming them',async count=>{
  const {api,fetchMock}=await browser(),values=[...args(),...Array.from({length:count},()=>undefined)],wire=[...args(),...Array.from({length:count},()=>null)];
  await expect(call(api,values)).rejects.toThrow('exactly session id');expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify(wire));expect(mocks.dispatch.mock.calls[0]).toEqual(wire);
 });
 it.each([undefined,null])('retains a missing or null explicit token rather than defaulting it',async token=>{
  const {api,fetchMock}=await browser(),values=[...args().slice(0,3),token];
  await expect(call(api,values)).rejects.toThrow(invalid);expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify([...args().slice(0,3),null]));expect(mocks.arity).toHaveBeenCalledExactlyOnceWith(4);
 });
 it('rejects an omitted token and an injected original fact field at HTTP 400',async()=>{
  const handler=await middleware();const missing=await request(handler,METHOD,args().slice(0,3));expect(missing.status).toBe(400);expect(missing.body.error).toContain('exactly session id');
  const changed=patch() as any;changed.candidates[0].evaluation={traditional:100};
  const fact=await request(handler,METHOD,[SESSION,changed,7,TOKEN]);expect(fact.status).toBe(400);expect(fact.body.error).toContain('CANDIDATE2_REVIEW_INPUT_INVALID');
 });
 it('retains direct HTTP fifth null slots and allows only mocked CMN startup build',async()=>{
  const handler=await middleware(),values=[...args(),null];const result=await request(handler,METHOD,values);
  expect(result.status).toBe(400);expect(result.body.error).toContain('exactly session id');expect(mocks.dispatch.mock.calls[0]).toEqual(values);
  expect(mocks.build).toHaveBeenCalledTimes(1);expect(mocks.build.mock.calls[0][0].entryPoints).toEqual(['src/main/cmn-reading-worker.ts']);
 });
 it.each([
  '客户库已被另一个窗口或进程更新，本次写入已取消。请重新打开应用以载入最新资料。',
  '本次客户库写入已提交，未回滚；结果凭据回填未完成，需要重新读取最新档案和方案核实，勿直接重复生成或提交。',
 ])('preserves an injected legacy error text without fabricating native CAS or commit: %s',async message=>{
  mocks.dispatch.mockImplementationOnce((...values:unknown[])=>{mocks.arity(values.length);Reflect.apply(captureCandidate2ReviewInput,undefined,values);throw Error(message);});
  const {api}=await browser();await expect(call(api,args())).rejects.toThrow(message);expect(mocks.arity).toHaveBeenCalledExactlyOnceWith(4);
 });
 it('delivers an actually scoped failed-cleanup notice without replacing the sentinel or claiming commit',async()=>{
  const bridge=mainBridge(),api=await preload(bridge);
  mocks.dispatch.mockImplementationOnce((...values:unknown[])=>{
   mocks.arity(values.length);Reflect.apply(captureCandidate2ReviewInput,undefined,values);recordCustomerWriteNotice(bridge.service.store,'failed-cleanup');throw Error(SENTINEL);
  });
  await expect(call(api,args())).rejects.toThrow(SENTINEL);
  expect(bridge.webContents.send).toHaveBeenCalledExactlyOnceWith('studio:customer-write-notice',expect.objectContaining({schema:'customer-write-notice/1',kind:'failed-cleanup',message:CUSTOMER_WRITE_FAILED_NOTICE,requiresRestart:true}));
 });
 it('preserves POST, local-header and origin guards before mocked dispatch',async()=>{
  const handler=await middleware();
  for(const [headers,verb]of [
   [{host:'127.0.0.1:18000','x-studio-local-request':'1'},'GET'],
   [{host:'127.0.0.1:18000'},'POST'],
   [{host:'127.0.0.1:18000','x-studio-local-request':'1',origin:'https://different.invalid'},'POST'],
  ] as [Record<string,string>,string][]){expect((await request(handler,METHOD,args(),headers,verb)).status).toBe(403);}
  expect(mocks.dispatch).not.toHaveBeenCalled();expect(mocks.storeConstruct).not.toHaveBeenCalled();
 });
});
