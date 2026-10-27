import {afterAll,afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {captureCandidate2ServiceInput} from '../src/main/candidate2-service-input';
import {CANDIDATE2_NAMING_SELECTION} from '../src/shared/candidate2-naming-consumer-v1';
import {mainNoticeSource,noticeTransportForMain} from './helpers/main-notice-registration';

/** Mock transport boundary only. The existing eligibility route is a carrier
 * for strict three-value capture, not a real eligibility or generate route.
 * The default accepted capture throws SENTINEL; the two explicitly labelled
 * error-propagation cases instead throw their injected legacy error string.
 * No capture DTO, saved object or fake successful write is returned, and no
 * native Store/CAS/migration/save is proved.
 * The existing browser undefined-pop risk below is deliberately characterized
 * as NOT FIXED. Test-only candidate encoding never changes production code.
 */
const SENTINEL='M927_BOUNDARY_ONLY: no Store or save invoked';
const METHOD='checkCandidate2NamingEligibility';
const CULTURAL_CONTROL='previewCulturalComparison';
const mocks=vi.hoisted(()=>({
 expose:vi.fn(),invoke:vi.fn(),on:vi.fn(),build:vi.fn(),previewBuildFactory:vi.fn(),previewBuild:vi.fn(),candidateBuild:vi.fn(),
 storeConstruct:vi.fn(),storeInit:vi.fn(),dispatch:vi.fn(),record:vi.fn(),generate:vi.fn(),save:vi.fn(),unexposedGenerate:vi.fn(),close:vi.fn(),
}));
vi.mock('electron',()=>({contextBridge:{exposeInMainWorld:mocks.expose},ipcRenderer:{invoke:mocks.invoke,on:mocks.on}}));
vi.mock('esbuild',()=>({build:mocks.build}));
vi.mock('../scripts/build-root-feedback-v132-preview.mjs',()=>({createLazyRootFeedbackV132PreviewBuild:mocks.previewBuildFactory}));
vi.mock('../scripts/build-candidate2-naming-dependency-v1.mjs',()=>({ensureCandidate2NamingDependency:mocks.candidateBuild}));
vi.mock('../src/main/store',()=>({Store:class {
 constructor(...args:unknown[]){mocks.storeConstruct(...args);}
 async init(){mocks.storeInit();return this;}
}}));
vi.mock('../src/main/service',()=>({StudioService:class {
 store:unknown;
 constructor(store:unknown){this.store=store;}
 checkCandidate2NamingEligibility(...args:unknown[]){return mocks.dispatch(...args);}
 previewCulturalComparison(...args:unknown[]){return mocks.dispatch(...args);}
 generate(...args:unknown[]){return mocks.generate(...args);}
 saveSession(...args:unknown[]){return mocks.save(...args);}
 generateCandidate2(...args:unknown[]){return mocks.unexposedGenerate(...args);}
 closeCmnReadingWorker(){return mocks.close();}
}}));

type Api=Record<string,(...args:unknown[])=>Promise<unknown>>;
type Route=(event:{sender:object},...args:unknown[])=>unknown;
type Middleware=(request:unknown,response:unknown,next:()=>void)=>Promise<void>;
const selection=CANDIDATE2_NAMING_SELECTION;
const prefs=()=>({length:1,generationChar:'',requiredChars:' 沐 ',forbiddenChars:' 忌 ',elderTaboo:' 长辈 ',style:' 清朗 ',meanings:' 平安𠮷😀 ',industry:'',priority:'balanced',preferredElements:[],zodiacRules:false,numerology:false,avoidParentNames:false});
const args=():unknown[]=>['  m927-native-profile-id  ',prefs(),selection];
const observations:unknown[]=[];
const inputError=/CANDIDATE2_SERVICE_INPUT_INVALID|PROJECT_APPLICATION_INPUT_INVALID/u;

function descendants(node:ts.Node):ts.Node[]{const rows:ts.Node[]=[];const visit=(item:ts.Node)=>{rows.push(item);ts.forEachChild(item,visit);};visit(node);return rows;}
function mainBridge(){
 const {file,source}=mainNoticeSource(),nodes=descendants(source);
 const statement=(name:string)=>{
  const rows=nodes.filter(ts.isVariableStatement).filter(node=>node.declarationList.declarations.some(declaration=>ts.isIdentifier(declaration.name)&&declaration.name.text===name));
  if(rows.length!==1)throw Error('M927 actual main declaration missing: '+name);return rows[0].getText(source);
 };
 const routes=nodes.filter(ts.isCallExpression).filter(node=>ts.isIdentifier(node.expression)&&node.expression.text==='register'&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0])&&node.arguments[0].text===METHOD);
 if(routes.length!==1)throw Error('M927 actual existing C2 route missing or ambiguous');
 const code=ts.transpileModule([statement('invokeWithNotice'),statement('register'),routes[0].getText(source)+';'].join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 const handlers=new Map<string,Route>(),webContents={send:vi.fn()},phase=vi.fn(),desktop176Context={};
 const service={store:{},checkCandidate2NamingEligibility:(...values:unknown[])=>mocks.dispatch(...values)};
 const invoke=noticeTransportForMain(file),withNotice=vi.fn((...values:unknown[])=>Reflect.apply(invoke,undefined,values));
 runInNewContext(code,{ipcMain:{handle:(channel:string,handler:Route)=>handlers.set(channel,handler)},window:{webContents},desktop176Context,assertDesktop176PhaseMethod:phase,invokeWithCustomerWriteNotice:withNotice,service},{timeout:1000});
 const route=handlers.get('studio:'+METHOD);if(!route)throw Error('M927 actual guarded main route not installed');
 return{route,webContents,phase,desktop176Context,withNotice,handlers,source,nodes};
}
async function preload(bridge?:ReturnType<typeof mainBridge>){
 vi.stubGlobal('window',{postMessage:vi.fn()});
 if(bridge)mocks.invoke.mockImplementation((channel:string,...values:unknown[])=>Promise.resolve().then(()=>{
  if(channel!=='studio:'+METHOD)throw Error('unexpected IPC carrier');return bridge.route({sender:bridge.webContents},...values);
 }));
 await import('../src/main/preload');expect(mocks.expose).toHaveBeenCalledTimes(1);
 return mocks.expose.mock.calls[0][1] as Api;
}
async function developmentMiddleware():Promise<Middleware>{
 let handler:Middleware|undefined;const plugin=(await import('../scripts/dev-plugin')).studioDevPlugin();
 await(plugin.configureServer as Function)({config:{root:path.resolve('.')},httpServer:{once:vi.fn()},middlewares:{use(value:Middleware){handler=value;}}});
 if(!handler)throw Error('M927 actual development middleware missing');return handler;
}
async function middlewareRequest(handler:Middleware,method:string,payload:string,headers:Record<string,string>={host:'127.0.0.1:18000','x-studio-local-request':'1'},verb='POST'){
 let status=200,output='';const responseHeaders:Record<string,string>={};
 const req={url:'/__studio_api/'+method,method:verb,headers,async *[Symbol.asyncIterator](){yield Buffer.from(payload);}};
 const res={get statusCode(){return status;},set statusCode(value:number){status=value;},setHeader(name:string,value:string){responseHeaders[name.toLowerCase()]=value;},end(value=''){output+=value;}};
 await handler(req,res,()=>{status=404;});
 let body:any;try{body=JSON.parse(output);}catch{body=output;}
 return{status,body,headers:responseHeaders};
}
async function browser(){
 const handler=await developmentMiddleware(),fetchMock=vi.fn(async(url:string,options:{body:string})=>{
  const name=url.slice('/__studio_api/'.length),result=await middlewareRequest(handler,name,options.body);
  return new Response(JSON.stringify(result.body),{status:result.status,headers:result.headers});
 });
 const window:{studio?:Api;postMessage:ReturnType<typeof vi.fn>}={postMessage:vi.fn()};
 vi.stubGlobal('window',window);vi.stubGlobal('fetch',fetchMock);await import('../src/shared/browser-api');
 if(!window.studio)throw Error('M927 actual browser API missing');return{api:window.studio,fetchMock,handler};
}
const call=(api:Api,name:string,values:unknown[]):Promise<unknown>=>Reflect.apply(api[name],api,values);
function assertNoSave(){expect(mocks.generate).not.toHaveBeenCalled();expect(mocks.save).not.toHaveBeenCalled();expect(mocks.unexposedGenerate).not.toHaveBeenCalled();expect(mocks.candidateBuild).not.toHaveBeenCalled();expect(mocks.previewBuildFactory).not.toHaveBeenCalled();}

beforeEach(()=>{
 vi.resetModules();vi.clearAllMocks();mocks.invoke.mockReset();mocks.dispatch.mockReset();mocks.record.mockReset();
 mocks.dispatch.mockImplementation((...values:unknown[])=>{
  mocks.record(values.length);
  Reflect.apply(captureCandidate2ServiceInput,undefined,values);
  throw Error(SENTINEL);
 });
 mocks.build.mockReset().mockResolvedValue({});mocks.close.mockReset().mockResolvedValue(undefined);
 mocks.previewBuildFactory.mockReset();mocks.previewBuild.mockReset();mocks.candidateBuild.mockReset();
});
afterEach(()=>{assertNoSave();vi.unstubAllGlobals();});
afterAll(()=>{
 const directory=process.env.M927_EVIDENCE_DIR;if(!directory)return;
 const target=path.join(path.resolve(directory),'m927-transport-arity-summary.json');fs.mkdirSync(path.dirname(target),{recursive:true});
 fs.writeFileSync(target+'.tmp',JSON.stringify({scope:'mock transport boundary only; no native Store/save/CAS proof',newGenerateRouteExposed:false,productionBrowserC2UndefinedPopFixed:false,acceptedCaptureNeverReturnsSuccess:true,defaultAcceptedCaptureSentinel:SENTINEL,observations},null,2)+'\n');fs.renameSync(target+'.tmp',target);
});

describe('M927 preload through actual guarded main registration: boundary-only carrier',{timeout:30000},()=>{
 it('retains all three raw values and reaches only the real capture helper plus sentinel',async()=>{
  const bridge=mainBridge(),api=await preload(bridge),values=args(),before=structuredClone(values);
  await expect(call(api,METHOD,values)).rejects.toThrow(SENTINEL);
  expect(mocks.invoke).toHaveBeenCalledExactlyOnceWith('studio:'+METHOD,...values);
  expect(mocks.dispatch).toHaveBeenCalledExactlyOnceWith(...values);expect(mocks.record).toHaveBeenCalledExactlyOnceWith(3);
  expect(mocks.dispatch.mock.calls[0][1]).toBe(values[1]);expect(values).toEqual(before);
  expect(bridge.phase).toHaveBeenCalledExactlyOnceWith(bridge.desktop176Context,METHOD);expect(bridge.withNotice).toHaveBeenCalledTimes(1);
 });
 it('retains a fourth undefined through preload and actual main for the helper to reject',async()=>{
  const bridge=mainBridge(),api=await preload(bridge),values=[...args(),undefined];
  await expect(call(api,METHOD,values)).rejects.toThrow('exactly profile id');
  expect(mocks.invoke.mock.calls[0]).toHaveLength(5);expect(mocks.dispatch.mock.calls[0]).toHaveLength(4);
  expect(mocks.dispatch.mock.calls[0][3]).toBeUndefined();expect(mocks.record).toHaveBeenCalledExactlyOnceWith(4);
 });
 it('retains multiple illegal trailing undefined IPC slots instead of shortening them',async()=>{
  const bridge=mainBridge(),api=await preload(bridge),values=[...args(),undefined,undefined];
  await expect(call(api,METHOD,values)).rejects.toThrow('exactly profile id');
  expect(mocks.dispatch.mock.calls[0]).toEqual(values);expect(mocks.record).toHaveBeenCalledExactlyOnceWith(5);
 });
 it('keeps an explicit undefined third selection at arity three so plain JSON capture rejects it',async()=>{
  const bridge=mainBridge(),api=await preload(bridge),values=[...args().slice(0,2),undefined];
  await expect(call(api,METHOD,values)).rejects.toThrow(inputError);
  expect(mocks.dispatch.mock.calls[0]).toHaveLength(3);expect(mocks.dispatch.mock.calls[0][2]).toBeUndefined();
  expect(mocks.record).toHaveBeenCalledExactlyOnceWith(3);
 });
 it('runs the actual foreign-sender guard before helper, phase or notice work',()=>{
  const bridge=mainBridge();expect(()=>bridge.route({sender:{}},...args())).toThrow('无效的调用来源。');
  expect(mocks.dispatch).not.toHaveBeenCalled();expect(mocks.record).not.toHaveBeenCalled();expect(bridge.phase).not.toHaveBeenCalled();expect(bridge.withNotice).not.toHaveBeenCalled();
 });
 it('runs the actual phase-guard position before helper invocation',()=>{
  const bridge=mainBridge(),failure=new Error('M927 transport-only phase guard');bridge.phase.mockImplementation(()=>{throw failure;});
  expect(()=>bridge.route({sender:bridge.webContents},...args())).toThrow(failure);
  expect(mocks.dispatch).not.toHaveBeenCalled();expect(bridge.withNotice).not.toHaveBeenCalled();
 });
});

describe('M927 actual browser generic-pop characterization, not a production C2 fix',{timeout:30000},()=>{
 it('posts exact three raw values to actual middleware and receives only boundary sentinel failure',async()=>{
  const {api,fetchMock}=await browser(),values=args(),before=structuredClone(values);
  await expect(call(api,METHOD,values)).rejects.toThrow(SENTINEL);
  expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify(values));expect(mocks.record).toHaveBeenCalledExactlyOnceWith(3);
  expect(mocks.dispatch.mock.calls[0]).toEqual(values);expect(values).toEqual(before);
  expect(mocks.build).toHaveBeenCalledTimes(1);expect(mocks.build.mock.calls[0][0].entryPoints).toEqual(['src/main/cmn-reading-worker.ts']);
 });
 it('characterizes NOT FIXED: fourth undefined is erased by current C2 generic browser transport',async()=>{
  const {api,fetchMock}=await browser(),values=[...args(),undefined];
  await expect(call(api,METHOD,values)).rejects.toThrow(SENTINEL);
  expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify(values.slice(0,3)));expect(mocks.record).toHaveBeenCalledExactlyOnceWith(3);
  observations.push({case:'current C2 browser fourth undefined',callerArity:4,receivedArity:3,captureAcceptedBeforeSentinel:true,productionFixed:false});
 });
 it('characterizes NOT FIXED: multiple trailing undefined values are erased to three slots',async()=>{
  const {api,fetchMock}=await browser(),values=[...args(),undefined,undefined];
  await expect(call(api,METHOD,values)).rejects.toThrow(SENTINEL);
  expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify(values.slice(0,3)));expect(mocks.record).toHaveBeenCalledExactlyOnceWith(3);
  observations.push({case:'current C2 browser multiple trailing undefined',callerArity:5,receivedArity:3,captureAcceptedBeforeSentinel:true,productionFixed:false});
 });
 it('preserves an explicit null fourth slot and lets the true helper reject arity four',async()=>{
  const {api,fetchMock}=await browser(),values=[...args(),null];
  await expect(call(api,METHOD,values)).rejects.toThrow('exactly profile id');
  expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify(values));expect(mocks.record).toHaveBeenCalledExactlyOnceWith(4);
 });
 it('characterizes the undefined third selection being trimmed to two slots and rejected',async()=>{
  const {api,fetchMock}=await browser(),values=[...args().slice(0,2),undefined];
  await expect(call(api,METHOD,values)).rejects.toThrow('exactly profile id');
  expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify(values.slice(0,2)));expect(mocks.record).toHaveBeenCalledExactlyOnceWith(2);
 });
 it('uses the actually protected cultural branch as a transport pattern control, not C2 semantic proof',async()=>{
  const {api,fetchMock}=await browser(),values=[...args(),undefined];
  await expect(call(api,CULTURAL_CONTROL,values)).rejects.toThrow('exactly profile id');
  expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify([...args(),null]));expect(mocks.record).toHaveBeenCalledExactlyOnceWith(4);
  observations.push({case:'existing protected cultural transport control',method:CULTURAL_CONTROL,receivedArity:4,C2ProductionProtected:false,culturalSemanticsExercised:false});
 });
 it.each([1,2])('demonstrates a test-only null encoding candidate for %s extra undefined slots',async extra=>{
  const {api,fetchMock}=await browser(),values=[...args(),...Array.from({length:extra},()=>undefined)];
  // Candidate for a future exact-three generation route only. Calling the
  // actual current checker carrier here does not alter its real semantics.
  const encoded=values.map(value=>value===undefined?null:value);
  await expect(call(api,METHOD,encoded)).rejects.toThrow('exactly profile id');
  expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify(encoded));expect(mocks.record).toHaveBeenCalledExactlyOnceWith(3+extra);
  observations.push({case:'test-only future exact-three JSON candidate',extraUndefined:extra,receivedArity:3+extra,productionPatch:false});
 });
});

describe('M927 actual development middleware argument and error transport only',{timeout:30000},()=>{
 it('keeps a direct four-slot HTTP JSON array intact and rejects with helper error at HTTP 400',async()=>{
  const handler=await developmentMiddleware(),values=[...args(),null];
  const result=await middlewareRequest(handler,METHOD,JSON.stringify(values));
  expect(result.status).toBe(400);expect(result.body.error).toContain('CANDIDATE2_SERVICE_INPUT_INVALID');
  expect(mocks.dispatch.mock.calls[0]).toEqual(values);expect(mocks.record).toHaveBeenCalledExactlyOnceWith(4);
 });
 it('keeps multiple direct trailing null JSON slots for strict arity rejection',async()=>{
  const handler=await developmentMiddleware(),values=[...args(),null,null];
  const result=await middlewareRequest(handler,METHOD,JSON.stringify(values));
  expect(result.status).toBe(400);expect(result.body.error).toContain('exactly profile id');
  expect(mocks.dispatch.mock.calls[0]).toEqual(values);expect(mocks.record).toHaveBeenCalledExactlyOnceWith(5);
 });
 it.each([
  '旧客户库在显式迁移前只读，请先执行 migrateCustomerStorage。',
  '客户库已被另一个窗口或进程更新，本次写入已取消。请重新打开应用以载入最新资料。',
 ])('preserves an injected real legacy error string without claiming native migration or CAS: %s',async message=>{
  const handler=await developmentMiddleware();
  mocks.dispatch.mockImplementationOnce((...values:unknown[])=>{
   mocks.record(values.length);Reflect.apply(captureCandidate2ServiceInput,undefined,values);throw Error(message);
  });
  const result=await middlewareRequest(handler,METHOD,JSON.stringify(args()));
  expect(result.status).toBe(400);expect(result.body).toEqual({error:message});expect(mocks.record).toHaveBeenCalledExactlyOnceWith(3);
 });
 it('keeps internal Store and owner methods unexposed after the dedicated M931 public route is added',async()=>{
   // The earlier absence assertion is preserved at 3ced and its sealed receipt.
   // M931 now owns the public route; these internal capabilities remain private.
   const desktop=await preload();expect(typeof desktop.generateCandidate2).toBe('function');
   const {api,handler}=await browser();expect(typeof api.generateCandidate2).toBe('function');
  const bridge=mainBridge();expect(bridge.handlers.has('studio:generateCandidate2')).toBe(false);
  const registrations=bridge.nodes.filter(ts.isCallExpression).filter(node=>ts.isIdentifier(node.expression)&&node.expression.text==='register'&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0])&&node.arguments[0].text==='generateCandidate2');
   expect(registrations).toHaveLength(1);
  const direct=bridge.nodes.filter(ts.isCallExpression).filter(node=>ts.isPropertyAccessExpression(node.expression)&&node.expression.expression.getText(bridge.source)==='ipcMain'&&node.expression.name.text==='handle'&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0])&&node.arguments[0].text==='studio:generateCandidate2');
  expect(direct).toEqual([]);
   for(const method of ['generateAndSaveCandidate2','reviewCandidate2Session','createSaved','verifySaved']){
    expect(Object.hasOwn(desktop,method)).toBe(false);expect(Object.hasOwn(api,method)).toBe(false);
    const rejected=await middlewareRequest(handler,method,JSON.stringify(args()));
    expect(rejected.status).toBe(400);expect(rejected.body).toEqual({error:'此功能使用系统文件选择器，请在桌面应用中操作。'});
   }
  // Existing dev startup constructs the mock Store and starts the mocked CMN
  // worker build before allowlist rejection. Neither is a native save/build.
  expect(mocks.storeConstruct).toHaveBeenCalled();expect(mocks.build).toHaveBeenCalled();
  expect(mocks.dispatch).not.toHaveBeenCalled();expect(mocks.unexposedGenerate).not.toHaveBeenCalled();expect(mocks.save).not.toHaveBeenCalled();
 });
});
