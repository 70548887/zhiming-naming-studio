import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import path from 'node:path';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {captureCandidate2HistoryRestoreInput} from '../src/main/candidate2-history-restore-input';
import {mainNoticeSource,noticeTransportForMain} from './helpers/main-notice-registration';

/** Actual transport statements, mocked Service, real pure input helper.
 * Valid refs end in SENTINEL, never a fake restore/save DTO. Injected CAS and
 * committed-error text tests authenticate no native history row or commit. */
const METHOD='restoreCandidate2History',SENTINEL='M977_BOUNDARY_ONLY: no native restore or save invoked';
const SESSION='c2s_0123456789abcdef0123456789abcdef',TOKEN='977ABCDE-ABCD-4ABC-8ABC-ABCDEF012345';
const args=():unknown[]=>[SESSION,'42',7,TOKEN];
const invalid=/CANDIDATE2_HISTORY_INPUT_INVALID|PROJECT_APPLICATION_INPUT_INVALID/u;
const mocks=vi.hoisted(()=>({expose:vi.fn(),invoke:vi.fn(),on:vi.fn(),build:vi.fn(),dispatch:vi.fn(),arity:vi.fn(),storeConstruct:vi.fn(),storeInit:vi.fn(),save:vi.fn(),review:vi.fn(),generate:vi.fn(),legacyRestore:vi.fn(),migrate:vi.fn(),close:vi.fn(),candidateBuild:vi.fn(),previewBuildFactory:vi.fn()}));
vi.mock('electron',()=>({contextBridge:{exposeInMainWorld:mocks.expose},ipcRenderer:{invoke:mocks.invoke,on:mocks.on}}));
vi.mock('esbuild',()=>({build:mocks.build}));
vi.mock('../scripts/build-candidate2-naming-dependency-v1.mjs',()=>({ensureCandidate2NamingDependency:mocks.candidateBuild}));
vi.mock('../scripts/build-root-feedback-v132-preview.mjs',()=>({createLazyRootFeedbackV132PreviewBuild:mocks.previewBuildFactory}));
vi.mock('../src/main/store',()=>({Store:class {constructor(...values:unknown[]){mocks.storeConstruct(...values);}async init(){mocks.storeInit();return this;}}}));
vi.mock('../src/main/service',()=>({StudioService:class {
 store:unknown;constructor(store:unknown){this.store=store;}
 restoreCandidate2History(...values:unknown[]){return mocks.dispatch(...values);}
 restoreHistory(...values:unknown[]){return mocks.legacyRestore(...values);}
 reviewCandidate2(...values:unknown[]){return mocks.review(...values);}
 saveSession(...values:unknown[]){return mocks.save(...values);}
 generateCandidate2(...values:unknown[]){return mocks.generate(...values);}
 migrateCustomerStorage(...values:unknown[]){return mocks.migrate(...values);}
 closeCmnReadingWorker(){return mocks.close();}
}}));
type Api=Record<string,(...values:unknown[])=>Promise<unknown>>;
type Route=(event:{sender:object},...values:unknown[])=>unknown;
type Middleware=(request:unknown,response:unknown,next:()=>void)=>Promise<void>;
function descendants(root:ts.Node){const nodes:ts.Node[]=[];const walk=(node:ts.Node)=>{nodes.push(node);ts.forEachChild(node,walk);};walk(root);return nodes;}
function mainBridge(){
 const {file,source}=mainNoticeSource(),nodes=descendants(source);
 const declaration=(name:string)=>{const found=nodes.filter(ts.isVariableStatement).filter(node=>node.declarationList.declarations.some(item=>ts.isIdentifier(item.name)&&item.name.text===name));if(found.length!==1)throw Error('M977 actual main declaration missing: '+name);return found[0].getText(source);};
 const registrations=nodes.filter(ts.isCallExpression).filter(node=>ts.isIdentifier(node.expression)&&node.expression.text==='register'&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0])&&node.arguments[0].text===METHOD);
 if(registrations.length!==1)throw Error('M977 exact guarded restore registration missing');
 const code=ts.transpileModule([declaration('invokeWithNotice'),declaration('register'),registrations[0].getText(source)+';'].join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 const routes=new Map<string,Route>(),webContents={send:vi.fn()},phase=vi.fn(),desktop176Context={};
 const service={store:{},restoreCandidate2History:(...values:unknown[])=>mocks.dispatch(...values)};
 const realNotice=noticeTransportForMain(file),notice=vi.fn((...values:unknown[])=>Reflect.apply(realNotice,undefined,values));
 runInNewContext(code,{ipcMain:{handle:(channel:string,route:Route)=>routes.set(channel,route)},window:{webContents},desktop176Context,assertDesktop176PhaseMethod:phase,invokeWithCustomerWriteNotice:notice,service},{timeout:1000});
 const route=routes.get('studio:'+METHOD);if(!route)throw Error('M977 actual main handler missing');return{route,routes,webContents,phase,notice,desktop176Context};
}
async function preload(bridge:ReturnType<typeof mainBridge>){
 vi.stubGlobal('window',{postMessage:vi.fn()});mocks.invoke.mockImplementation((channel:string,...values:unknown[])=>Promise.resolve().then(()=>{if(channel!=='studio:'+METHOD)throw Error('unexpected IPC namespace');return bridge.route({sender:bridge.webContents},...values);}));
 await import('../src/main/preload');expect(mocks.expose).toHaveBeenCalledTimes(1);return mocks.expose.mock.calls[0][1] as Api;
}
async function middleware():Promise<Middleware>{
 let handler:Middleware|undefined;const plugin=(await import('../scripts/dev-plugin')).studioDevPlugin();
 await(plugin.configureServer as Function)({config:{root:path.resolve('.')},httpServer:{once:vi.fn()},middlewares:{use(value:Middleware){handler=value;}}});
 if(!handler)throw Error('M977 actual dev middleware missing');return handler;
}
async function request(handler:Middleware,method:string,values:unknown[],headers:Record<string,string>={host:'127.0.0.1:18000','x-studio-local-request':'1'},verb='POST'){
 let status=200,text='';const responseHeaders:Record<string,string>={};
 const req={url:'/__studio_api/'+method,method:verb,headers,async *[Symbol.asyncIterator](){yield Buffer.from(JSON.stringify(values));}};
 const res={get statusCode(){return status;},set statusCode(value:number){status=value;},setHeader(name:string,value:string){responseHeaders[name.toLowerCase()]=value;},end(value=''){text+=value;}};
 await handler(req,res,()=>{status=404;});let body:any;try{body=JSON.parse(text);}catch{body=text;}return{status,body,headers:responseHeaders};
}
async function browser(){
 const handler=await middleware(),fetchMock=vi.fn(async(url:string,options:{body:string})=>{const reply=await request(handler,url.slice('/__studio_api/'.length),JSON.parse(options.body));return new Response(JSON.stringify(reply.body),{status:reply.status,headers:reply.headers});});
 const window:{studio?:Api;postMessage:ReturnType<typeof vi.fn>}={postMessage:vi.fn()};vi.stubGlobal('window',window);vi.stubGlobal('fetch',fetchMock);await import('../src/shared/browser-api');
 if(!window.studio)throw Error('M977 actual browser restore bridge missing');return{api:window.studio,handler,fetchMock};
}
const call=(api:Api,values:unknown[]):Promise<unknown>=>Reflect.apply(api[METHOD],api,values);
beforeEach(()=>{
 vi.resetModules();vi.clearAllMocks();mocks.invoke.mockReset();mocks.dispatch.mockReset();mocks.arity.mockReset();
 mocks.dispatch.mockImplementation((...values:unknown[])=>{mocks.arity(values.length);Reflect.apply(captureCandidate2HistoryRestoreInput,undefined,values);throw Error(SENTINEL);});
 mocks.build.mockReset().mockResolvedValue({});mocks.close.mockReset().mockResolvedValue(undefined);mocks.candidateBuild.mockReset();mocks.previewBuildFactory.mockReset();
});
afterEach(()=>{for(const spy of [mocks.save,mocks.review,mocks.generate,mocks.legacyRestore,mocks.migrate,mocks.candidateBuild,mocks.previewBuildFactory])expect(spy).not.toHaveBeenCalled();vi.unstubAllGlobals();});

describe('M977 actual C2 history restore transport, boundary-only mocked Service',{timeout:30000},()=>{
 it('forwards exact canonical references and original-case token through preload and guarded main',async()=>{
  const bridge=mainBridge(),api=await preload(bridge),values=args(),before=[...values];
  expect([...bridge.routes.keys()]).toEqual(['studio:'+METHOD]);await expect(call(api,values)).rejects.toThrow(SENTINEL);
  expect(mocks.invoke).toHaveBeenCalledExactlyOnceWith('studio:'+METHOD,...values);expect(mocks.dispatch).toHaveBeenCalledExactlyOnceWith(...values);
  expect(mocks.arity).toHaveBeenCalledExactlyOnceWith(4);expect(values).toEqual(before);
  expect(bridge.phase).toHaveBeenCalledExactlyOnceWith(bridge.desktop176Context,METHOD);expect(bridge.notice).toHaveBeenCalledTimes(1);
 });
 it.each([1,2])('retains %s extra undefined IPC slots for real helper rejection',async count=>{
  const api=await preload(mainBridge()),values=[...args(),...Array.from({length:count},()=>undefined)];
  await expect(call(api,values)).rejects.toThrow('exactly session id');expect(mocks.dispatch.mock.calls[0]).toEqual(values);expect(mocks.arity).toHaveBeenCalledExactlyOnceWith(4+count);
 });
 it('keeps an explicit undefined token as the fourth IPC value',async()=>{
  const api=await preload(mainBridge()),values=[...args().slice(0,3),undefined];
  await expect(call(api,values)).rejects.toThrow(invalid);expect(mocks.dispatch.mock.calls[0]).toEqual(values);expect(mocks.arity).toHaveBeenCalledExactlyOnceWith(4);
 });
 it('executes the existing sender and phase guard positions before dispatch',()=>{
  const bridge=mainBridge();expect(()=>bridge.route({sender:{}},...args())).toThrow('无效的调用来源。');expect(bridge.phase).not.toHaveBeenCalled();
  const error=new Error('M977 phase transport rejection');bridge.phase.mockImplementation(()=>{throw error;});expect(()=>bridge.route({sender:bridge.webContents},...args())).toThrow(error);
  expect(mocks.dispatch).not.toHaveBeenCalled();expect(bridge.notice).not.toHaveBeenCalled();
 });
 it('posts the four original scalar references through browser and actual middleware without normalization',async()=>{
  const {api,fetchMock}=await browser(),values=args();await expect(call(api,values)).rejects.toThrow(SENTINEL);
  expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify(values));expect(mocks.dispatch.mock.calls[0]).toEqual(values);expect(mocks.arity).toHaveBeenCalledExactlyOnceWith(4);
 });
 it.each([1,2])('preserves %s fifth-or-later undefined browser slots as JSON null and rejects',async count=>{
  const {api,fetchMock}=await browser(),values=[...args(),...Array.from({length:count},()=>undefined)],wire=[...args(),...Array.from({length:count},()=>null)];
  await expect(call(api,values)).rejects.toThrow('exactly session id');expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify(wire));expect(mocks.dispatch.mock.calls[0]).toEqual(wire);
 });
 it('rejects caller snapshot authority and noncanonical revision IDs with HTTP 400',async()=>{
  const handler=await middleware();
  for(const values of [[SESSION,{id:'42',session:{claimed:true}},7,TOKEN],[SESSION,'042',7,TOKEN],[...args(),{owner:{claimed:true}}]]){
   const reply=await request(handler,METHOD,values);expect(reply.status).toBe(400);expect(reply.body.error).toContain('CANDIDATE2_HISTORY_INPUT_INVALID');
  }
 });
 it.each([
  '方案已被其他窗口更新，本次修改未保存。当前草稿仍保留，请先核对最新已保存方案，再重新应用修改。',
  '本次客户库写入已提交，未回滚；结果凭据回填未完成，需要重新读取最新档案和方案核实，勿直接重复生成或提交。',
 ])('preserves injected legacy error text, with no native CAS/commit claim: %s',async message=>{
  mocks.dispatch.mockImplementationOnce((...values:unknown[])=>{mocks.arity(values.length);Reflect.apply(captureCandidate2HistoryRestoreInput,undefined,values);throw Error(message);});
  const {api}=await browser();await expect(call(api,args())).rejects.toThrow(message);expect(mocks.arity).toHaveBeenCalledExactlyOnceWith(4);
 });
 it('keeps POST, local header and origin guards before mock Store construction',async()=>{
  const handler=await middleware();
  for(const [headers,verb]of [
   [{host:'127.0.0.1:18000','x-studio-local-request':'1'},'GET'],
   [{host:'127.0.0.1:18000'},'POST'],
   [{host:'127.0.0.1:18000','x-studio-local-request':'1',origin:'https://different.invalid'},'POST'],
  ] as [Record<string,string>,string][]){expect((await request(handler,METHOD,args(),headers,verb)).status).toBe(403);}
  expect(mocks.dispatch).not.toHaveBeenCalled();expect(mocks.storeConstruct).not.toHaveBeenCalled();
 });
 it('adds no generic native history or public replay API and no candidate build hook',async()=>{
  const {api,handler}=await browser();
  for(const name of ['restoreCandidate2Native','readCandidate2NativeHistory','verifyCandidate2Saved','candidate2CommitCore']){
   expect(Object.hasOwn(api,name)).toBe(false);const reply=await request(handler,name,args());expect(reply.status).toBe(400);expect(reply.body.error).toContain('系统文件选择器');
  }
  expect(mocks.build).toHaveBeenCalledTimes(1);expect(mocks.build.mock.calls[0][0].entryPoints).toEqual(['src/main/cmn-reading-worker.ts']);expect(mocks.dispatch).not.toHaveBeenCalled();
 });
});
