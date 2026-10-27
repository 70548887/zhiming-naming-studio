import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import path from 'node:path';
import {captureCandidate2ReportInput} from '../src/main/candidate2-report-source';

/** Actual preload/browser/plugin statements, pure mocked Service boundary.
 * Valid input is checked by the actual pure capture helper and then throws a
 * sentinel. No report DTO, source proof, PDF or saved/native result is faked. */
const PREVIEW='previewCandidate2Report',EXPORT='exportCandidate2Report',SENTINEL='M990_BOUNDARY_ONLY: no native report/PDF/source acceptance invoked';
const ID='c2s_0123456789abcdef0123456789abcdef',TOKEN='99000000-0000-4000-8000-000000000001';
const mocks=vi.hoisted(()=>({expose:vi.fn(),invoke:vi.fn(),on:vi.fn(),build:vi.fn(),dispatch:vi.fn(),storeConstruct:vi.fn(),storeInit:vi.fn(),save:vi.fn(),generate:vi.fn(),migrate:vi.fn(),close:vi.fn(),candidateBuild:vi.fn(),previewBuildFactory:vi.fn()}));
vi.mock('electron',()=>({contextBridge:{exposeInMainWorld:mocks.expose},ipcRenderer:{invoke:mocks.invoke,on:mocks.on}}));
vi.mock('esbuild',()=>({build:mocks.build}));
vi.mock('../scripts/build-candidate2-naming-dependency-v1.mjs',()=>({ensureCandidate2NamingDependency:mocks.candidateBuild}));
vi.mock('../scripts/build-root-feedback-v132-preview.mjs',()=>({createLazyRootFeedbackV132PreviewBuild:mocks.previewBuildFactory}));
vi.mock('../src/main/store',()=>({Store:class{constructor(...args:unknown[]){mocks.storeConstruct(...args);}async init(){mocks.storeInit();return this;}}}));
vi.mock('../src/main/service',()=>({StudioService:class{
 store:unknown;constructor(store:unknown){this.store=store;}
 previewCandidate2Report(...args:unknown[]){return mocks.dispatch(...args);}
 saveSession(...args:unknown[]){return mocks.save(...args);}
 generateCandidate2(...args:unknown[]){return mocks.generate(...args);}
 migrateCustomerStorage(...args:unknown[]){return mocks.migrate(...args);}
 closeCmnReadingWorker(){return mocks.close();}
}}));
type Api=Record<string,(...args:unknown[])=>Promise<unknown>>;
type Middleware=(request:unknown,response:unknown,next:()=>void)=>Promise<void>;
const args=():unknown[]=>[ID,2,TOKEN];
const call=(api:Api,method:string,values:unknown[])=>Reflect.apply(api[method],api,values);
async function preload(){
 vi.stubGlobal('window',{postMessage:vi.fn()});
 mocks.invoke.mockImplementation((channel:string,...values:unknown[])=>Promise.resolve().then(()=>{if(channel!=='studio:'+PREVIEW&&channel!=='studio:'+EXPORT)throw Error('Unexpected namespace');return mocks.dispatch(...values);}));
 await import('../src/main/preload');expect(mocks.expose).toHaveBeenCalledTimes(1);return mocks.expose.mock.calls[0][1] as Api;
}
async function middleware():Promise<Middleware>{
 let handler:Middleware|undefined;const plugin=(await import('../scripts/dev-plugin')).studioDevPlugin();
 await(plugin.configureServer as Function)({config:{root:path.resolve('.')},httpServer:{once:vi.fn()},middlewares:{use(value:Middleware){handler=value;}}});
 if(!handler)throw Error('Actual studio middleware missing');return handler;
}
async function request(handler:Middleware,method:string,values:unknown[],headers:Record<string,string>={host:'127.0.0.1:19900','x-studio-local-request':'1'},verb='POST'){
 let status=200,text='';const responseHeaders:Record<string,string>={};
 const req={url:'/__studio_api/'+method,method:verb,headers,async *[Symbol.asyncIterator](){yield Buffer.from(JSON.stringify(values));}};
 const res={get statusCode(){return status;},set statusCode(value:number){status=value;},setHeader(name:string,value:string){responseHeaders[name.toLowerCase()]=value;},end(value=''){text+=value;}};
 await handler(req,res,()=>{status=404;});let body:any;try{body=JSON.parse(text);}catch{body=text;}return{status,body,headers:responseHeaders};
}
async function browser(){
 const handler=await middleware(),fetchMock=vi.fn(async(url:string,options:{body:string})=>{const reply=await request(handler,url.slice('/__studio_api/'.length),JSON.parse(options.body));return new Response(JSON.stringify(reply.body),{status:reply.status,headers:reply.headers});});
 const window:{studio?:Api;postMessage:ReturnType<typeof vi.fn>}={postMessage:vi.fn()};vi.stubGlobal('window',window);vi.stubGlobal('fetch',fetchMock);
 await import('../src/shared/browser-api');if(!window.studio)throw Error('Actual browser report API missing');return{api:window.studio,handler,fetchMock};
}
beforeEach(()=>{
 vi.resetModules();vi.clearAllMocks();mocks.dispatch.mockReset().mockImplementation((...values:unknown[])=>{Reflect.apply(captureCandidate2ReportInput,undefined,values);throw Error(SENTINEL);});
 mocks.invoke.mockReset();mocks.build.mockReset().mockResolvedValue({});mocks.close.mockReset().mockResolvedValue(undefined);
});
afterEach(()=>{expect(mocks.save).not.toHaveBeenCalled();expect(mocks.generate).not.toHaveBeenCalled();expect(mocks.migrate).not.toHaveBeenCalled();expect(mocks.candidateBuild).not.toHaveBeenCalled();expect(mocks.previewBuildFactory).not.toHaveBeenCalled();vi.unstubAllGlobals();});

describe('M990 actual report bridges and plugin with boundary-only mocked Service',()=>{
 it.each([PREVIEW,EXPORT])('preload forwards exact raw three references to %s',async method=>{
  const api=await preload(),values=args();await expect(call(api,method,values)).rejects.toThrow(SENTINEL);
  expect(mocks.invoke).toHaveBeenCalledExactlyOnceWith('studio:'+method,...values);expect(mocks.dispatch).toHaveBeenCalledExactlyOnceWith(...values);
 });
 it.each([
  ['omitted token',[ID,2]],['undefined token',[ID,2,undefined]],['null token',[ID,2,null]],['fourth undefined',[ID,2,TOKEN,undefined]],
 ] as [string,unknown[]][])('preload retains %s for actual pure input rejection',async(_name,values)=>{
  const api=await preload();await expect(call(api,PREVIEW,values)).rejects.toThrow(/CANDIDATE2_REPORT_INPUT_INVALID|PROJECT_APPLICATION_INPUT_INVALID/);
  expect(mocks.invoke.mock.calls[0].slice(1)).toEqual(values);expect(mocks.dispatch.mock.calls[0]).toEqual(values);
 });
 it('preload rejects a full client snapshot and accessor id without reading a getter',async()=>{
  const api=await preload();let getters=0;const snapshot={id:ID,candidates:[],analysis:{},get fakeSource(){getters++;return true;}};
  await expect(call(api,PREVIEW,[snapshot,2,TOKEN])).rejects.toThrow(/CANDIDATE2_REPORT_INPUT_INVALID|PROJECT_APPLICATION_INPUT_INVALID/);expect(getters).toBe(0);expect(mocks.dispatch.mock.calls[0][0]).toBe(snapshot);
 });
 it('browser posts exact three references through actual fetch and original preview route',async()=>{
  const {api,fetchMock}=await browser(),values=args();await expect(call(api,PREVIEW,values)).rejects.toThrow(SENTINEL);
  expect(fetchMock).toHaveBeenCalledTimes(1);expect(fetchMock.mock.calls[0][0]).toBe('/__studio_api/'+PREVIEW);expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify(values));expect(mocks.dispatch).toHaveBeenCalledExactlyOnceWith(...values);
 });
 it.each([
  ['omitted token',[ID,2],[ID,2]],['undefined token',[ID,2,undefined],[ID,2,null]],['null token',[ID,2,null],[ID,2,null]],['fourth undefined',[ID,2,TOKEN,undefined],[ID,2,TOKEN,null]],
 ] as [string,unknown[],unknown[]][])('browser preserves %s without trimming or filling slots',async(_name,values,wire)=>{
  const {api,fetchMock}=await browser();await expect(call(api,PREVIEW,values)).rejects.toThrow(/CANDIDATE2_REPORT_INPUT_INVALID|PROJECT_APPLICATION_INPUT_INVALID/);
  expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify(wire));expect(mocks.dispatch.mock.calls[0]).toEqual(wire);
 });
 it('browser rejects a full client session id instead of treating its source as report authority',async()=>{
  const {api}=await browser(),snapshot={id:ID,candidates:[],analysis:{},html:'<script>not-authority</script>'};
  await expect(call(api,PREVIEW,[snapshot,2,TOKEN])).rejects.toThrow(/CANDIDATE2_REPORT_INPUT_INVALID|PROJECT_APPLICATION_INPUT_INVALID/);expect(mocks.dispatch.mock.calls[0][0]).toEqual(snapshot);
 });
 it('browser desktop-only export rejects explicitly without fetch or preview fallback',async()=>{
  const {api,fetchMock}=await browser();await expect(call(api,EXPORT,args())).rejects.toThrow('浏览器可预览已保存报告');
  expect(fetchMock).not.toHaveBeenCalled();expect(mocks.dispatch).not.toHaveBeenCalled();
 });
 it('original plugin exposes preview only and rejects direct desktop-export HTTP with 400',async()=>{
  const handler=await middleware();const reply=await request(handler,EXPORT,args());expect(reply.status).toBe(400);expect(reply.body.error).toContain('桌面应用');expect(mocks.dispatch).not.toHaveBeenCalled();
  expect(mocks.build).toHaveBeenCalledTimes(1);expect(mocks.build.mock.calls[0][0].entryPoints).toEqual(['src/main/cmn-reading-worker.ts']);
 });
 it('original plugin keeps local POST/header/origin rejection before any mocked Store or dispatch',async()=>{
  const handler=await middleware();for(const [headers,verb]of[
   [{host:'127.0.0.1:19900','x-studio-local-request':'1'},'GET'],[{host:'127.0.0.1:19900'},'POST'],[{host:'127.0.0.1:19900','x-studio-local-request':'1',origin:'http://foreign.invalid'},'POST'],
  ] as [Record<string,string>,string][]){expect((await request(handler,PREVIEW,args(),headers,verb)).status).toBe(403);}
  expect(mocks.storeConstruct).not.toHaveBeenCalled();expect(mocks.dispatch).not.toHaveBeenCalled();
 });
});
