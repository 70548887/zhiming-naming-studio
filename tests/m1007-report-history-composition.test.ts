import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import path from 'node:path';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {captureCandidate2ReportInput} from '../src/main/candidate2-report-source';
import {captureCandidate2HistoryRestoreInput} from '../src/main/candidate2-history-restore-input';
import {exportCandidate2ReportWithDialog} from '../src/main/candidate2-report-export';
import {mainNoticeSource,noticeTransportForMain} from './helpers/main-notice-registration';

// Composition transport only: actual bridge/middleware/registration statements
// and actual pure input capture. Every valid request throws SENTINEL before
// native Store, report source, history selection, save, dialog or PDF work.
const PREVIEW='previewCandidate2Report',EXPORT='exportCandidate2Report',HISTORY='restoreCandidate2History';
const SENTINEL='M1007_COMPOSITION_BOUNDARY_ONLY',ID='c2s_0123456789abcdef0123456789abcdef',TOKEN='1007ABCD-ABCD-4ABC-8ABC-ABCDEF012345';
const reportArgs=():unknown[]=>[ID,7,TOKEN],historyArgs=():unknown[]=>[ID,'42',7,TOKEN];
const mocks=vi.hoisted(()=>({expose:vi.fn(),invoke:vi.fn(),on:vi.fn(),build:vi.fn(),preview:vi.fn(),history:vi.fn(),save:vi.fn(),legacyRestore:vi.fn(),generate:vi.fn(),review:vi.fn(),migrate:vi.fn(),close:vi.fn(),store:vi.fn(),init:vi.fn(),dialog:vi.fn(),pdf:vi.fn(),candidateBuild:vi.fn()}));
vi.mock('electron',()=>({contextBridge:{exposeInMainWorld:mocks.expose},ipcRenderer:{invoke:mocks.invoke,on:mocks.on}}));
vi.mock('esbuild',()=>({build:mocks.build}));
vi.mock('../scripts/build-candidate2-naming-dependency-v1.mjs',()=>({ensureCandidate2NamingDependency:mocks.candidateBuild}));
vi.mock('../src/main/store',()=>({Store:class{constructor(...args:unknown[]){mocks.store(...args);}async init(){mocks.init();return this;}}}));
vi.mock('../src/main/service',()=>({StudioService:class{
 store:unknown;constructor(store:unknown){this.store=store;}
 previewCandidate2Report(...args:unknown[]){return mocks.preview(...args);}
 restoreCandidate2History(...args:unknown[]){return mocks.history(...args);}
 saveSession(...args:unknown[]){return mocks.save(...args);}
 restoreHistory(...args:unknown[]){return mocks.legacyRestore(...args);}
 generateCandidate2(...args:unknown[]){return mocks.generate(...args);}
 reviewCandidate2(...args:unknown[]){return mocks.review(...args);}
 migrateCustomerStorage(...args:unknown[]){return mocks.migrate(...args);}
 closeCmnReadingWorker(){return mocks.close();}
}}));
type Api=Record<string,(...args:unknown[])=>Promise<unknown>>;
type Middleware=(req:unknown,res:unknown,next:()=>void)=>Promise<void>;
type Route=(event:{sender:object},...args:unknown[])=>unknown;
const call=(api:Api,method:string,args:unknown[])=>Reflect.apply(api[method],api,args);
function mainRoutes(){
 const {file,source}=mainNoticeSource(),nodes:ts.Node[]=[];const visit=(node:ts.Node)=>{nodes.push(node);ts.forEachChild(node,visit);};visit(source);
 const declaration=(name:string)=>{const found=nodes.filter(ts.isVariableStatement).filter(node=>node.declarationList.declarations.some(item=>ts.isIdentifier(item.name)&&item.name.text===name));expect(found).toHaveLength(1);return found[0].getText(source);};
 const selected=[PREVIEW,EXPORT,HISTORY].map(name=>{const found=nodes.filter(ts.isCallExpression).filter(node=>ts.isIdentifier(node.expression)&&node.expression.text==='register'&&ts.isStringLiteral(node.arguments[0])&&node.arguments[0].text===name);expect(found).toHaveLength(1);return found[0].getText(source)+';';});
 const code=ts.transpileModule([declaration('invokeWithNotice'),declaration('register'),...selected].join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 const routes=new Map<string,Route>(),webContents={send:vi.fn()},phase=vi.fn(),context={},service={store:{},previewCandidate2Report:(...args:unknown[])=>mocks.preview(...args),restoreCandidate2History:(...args:unknown[])=>mocks.history(...args)};
 runInNewContext(code,{ipcMain:{handle:(name:string,route:Route)=>routes.set(name,route)},window:{webContents},desktop176Context:context,assertDesktop176PhaseMethod:phase,invokeWithCustomerWriteNotice:noticeTransportForMain(file),service,dialog:{showSaveDialog:mocks.dialog},exportPDF:mocks.pdf,exportCandidate2ReportWithDialog},{timeout:1000});
 return{routes,webContents,phase};
}
async function preload(){const main=mainRoutes();vi.stubGlobal('window',{postMessage:vi.fn()});mocks.invoke.mockImplementation((name:string,...args:unknown[])=>Promise.resolve().then(()=>main.routes.get(name)!({sender:main.webContents},...args)));await import('../src/main/preload');return{api:mocks.expose.mock.calls[0][1] as Api,main};}
async function middleware(){let handler:Middleware|undefined;const plugin=(await import('../scripts/dev-plugin')).studioDevPlugin();await(plugin.configureServer as Function)({config:{root:path.resolve('.')},httpServer:{once:vi.fn()},middlewares:{use(value:Middleware){handler=value;}}});if(!handler)throw Error('Actual composed middleware missing');return handler;}
async function request(handler:Middleware,method:string,args:unknown[]){let status=200,text='';const headers:Record<string,string>={};await handler({url:'/__studio_api/'+method,method:'POST',headers:{host:'127.0.0.1:19907','x-studio-local-request':'1'},async *[Symbol.asyncIterator](){yield Buffer.from(JSON.stringify(args));}},{get statusCode(){return status;},set statusCode(value:number){status=value;},setHeader(name:string,value:string){headers[name]=value;},end(value=''){text+=value;}},()=>{status=404;});return{status,text,headers};}
async function browser(){const handler=await middleware(),fetch=vi.fn(async(url:string,options:{body:string})=>{const result=await request(handler,url.split('/').at(-1)!,JSON.parse(options.body));return new Response(result.text,{status:result.status,headers:result.headers});}),window:{studio?:Api;postMessage:ReturnType<typeof vi.fn>}={postMessage:vi.fn()};vi.stubGlobal('window',window);vi.stubGlobal('fetch',fetch);await import('../src/shared/browser-api');return{api:window.studio!,fetch,handler};}
beforeEach(()=>{vi.resetModules();vi.clearAllMocks();mocks.preview.mockImplementation((...args:unknown[])=>{Reflect.apply(captureCandidate2ReportInput,undefined,args);throw Error(SENTINEL);});mocks.history.mockImplementation((...args:unknown[])=>{Reflect.apply(captureCandidate2HistoryRestoreInput,undefined,args);throw Error(SENTINEL);});mocks.build.mockResolvedValue({});mocks.close.mockResolvedValue(undefined);});
afterEach(()=>{for(const fn of [mocks.save,mocks.legacyRestore,mocks.generate,mocks.review,mocks.migrate,mocks.dialog,mocks.pdf,mocks.candidateBuild])expect(fn).not.toHaveBeenCalled();vi.unstubAllGlobals();});

describe('M1007 composed report/history exact transport only',()=>{
 it.each([PREVIEW,EXPORT,HISTORY])('preload and guarded main keep %s exact original arguments',async method=>{const{api,main}=await preload(),args=method===HISTORY?historyArgs():reportArgs();await expect(call(api,method,args)).rejects.toThrow(SENTINEL);expect(mocks.invoke).toHaveBeenCalledExactlyOnceWith('studio:'+method,...args);expect(method===HISTORY?mocks.history:mocks.preview).toHaveBeenCalledExactlyOnceWith(...args);expect(main.phase).toHaveBeenCalledTimes(1);});
 it.each([PREVIEW,EXPORT,HISTORY])('IPC preserves an illegal additional undefined slot for %s',async method=>{const{api}=await preload(),args=[...(method===HISTORY?historyArgs():reportArgs()),undefined];await expect(call(api,method,args)).rejects.toThrow(/CANDIDATE2_(?:REPORT|HISTORY)_INPUT_INVALID/);expect(mocks.invoke.mock.calls[0].slice(1)).toEqual(args);});
 it.each([PREVIEW,HISTORY])('browser/plugin keep %s original arity without trim',async method=>{const{api,fetch}=await browser(),args=method===HISTORY?historyArgs():reportArgs();await expect(call(api,method,args)).rejects.toThrow(SENTINEL);expect(fetch.mock.calls[0][1].body).toBe(JSON.stringify(args));expect(method===HISTORY?mocks.history:mocks.preview).toHaveBeenCalledExactlyOnceWith(...args);});
 it.each([PREVIEW,HISTORY])('browser/plugin preserve %s omitted, null, undefined and extra slots',async method=>{const{api,fetch}=await browser(),valid=method===HISTORY?historyArgs():reportArgs(),dispatch=method===HISTORY?mocks.history:mocks.preview;for(const values of [valid.slice(0,-1),[...valid.slice(0,-1),null],[...valid.slice(0,-1),undefined],[...valid,undefined]]){await expect(call(api,method,values)).rejects.toThrow(/CANDIDATE2_(?:REPORT|HISTORY)_INPUT_INVALID|PROJECT_APPLICATION_INPUT_INVALID/);expect(fetch.mock.calls.at(-1)![1].body).toBe(JSON.stringify(values));expect(dispatch.mock.calls.at(-1)).toEqual(JSON.parse(JSON.stringify(values)));}});
 it('browser native export remains explicit desktop-only with no fetch',async()=>{const{api,fetch}=await browser();await expect(call(api,EXPORT,reportArgs())).rejects.toThrow('浏览器可预览已保存报告');expect(fetch).not.toHaveBeenCalled();expect(mocks.preview).not.toHaveBeenCalled();expect(mocks.history).not.toHaveBeenCalled();});
 it('actual plugin exposes report preview and history but no native export route',async()=>{const handler=await middleware();expect((await request(handler,PREVIEW,reportArgs())).status).toBe(400);expect(mocks.preview).toHaveBeenCalledExactlyOnceWith(...reportArgs());expect((await request(handler,HISTORY,historyArgs())).status).toBe(400);expect(mocks.history).toHaveBeenCalledExactlyOnceWith(...historyArgs());expect((await request(handler,EXPORT,reportArgs())).text).toContain('桌面应用');expect(mocks.preview).toHaveBeenCalledTimes(1);expect(mocks.history).toHaveBeenCalledTimes(1);});
 it('all three actual main registrations retain the sender guard before dispatch',()=>{const main=mainRoutes();for(const method of [PREVIEW,EXPORT,HISTORY])expect(()=>main.routes.get('studio:'+method)!({sender:{}},...(method===HISTORY?historyArgs():reportArgs()))).toThrow('无效的调用来源');expect(main.phase).not.toHaveBeenCalled();expect(mocks.preview).not.toHaveBeenCalled();expect(mocks.history).not.toHaveBeenCalled();});
});
