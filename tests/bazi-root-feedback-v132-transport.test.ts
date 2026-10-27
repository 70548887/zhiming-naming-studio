import{afterEach,beforeEach,describe,expect,it,vi}from'vitest';
import ts from'typescript';import {readFileSync}from'node:fs';import {resolve}from'node:path';
import type{BirthProfile}from'../src/shared/types';
import type{BaziRootFeedbackV132PreviewApi}from'../src/shared/bazi-root-feedback-v132-preview-api';

const mocks=vi.hoisted(()=>({expose:vi.fn(),invoke:vi.fn(),on:vi.fn(),build:vi.fn(),buildFactory:vi.fn(),buildRequest:vi.fn(),storeConstruct:vi.fn(),storeInit:vi.fn(),preview:vi.fn()}));
vi.mock('electron',()=>({contextBridge:{exposeInMainWorld:mocks.expose},ipcRenderer:{invoke:mocks.invoke,on:mocks.on}}));
vi.mock('esbuild',()=>({build:mocks.build}));
vi.mock('../scripts/build-root-feedback-v132-preview.mjs',()=>({createLazyRootFeedbackV132PreviewBuild:mocks.buildFactory}));
vi.mock('../src/main/store',()=>({Store:class{constructor(...args:unknown[]){mocks.storeConstruct(...args);}async init(){mocks.storeInit();return this;}}}));
vi.mock('../src/main/service',()=>({StudioService:class{store:unknown;constructor(...args:unknown[]){this.store=args[0]??{};}previewBaziRootFeedbackV132(...args:unknown[]){return mocks.preview(...args);}}}));

const profile=():BirthProfile=>({id:'m758-transport',customerName:'传输样本',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2001-06-18',birthTime:'23:17',leapMonth:false,timeUnknown:true,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'保留未知时辰'});
const reply=(p:BirthProfile)=>({schema:'bazi-root-feedback-facade/1.3.2-r2',methodId:'project-bazi-mainchain-145/1.3.2',profileId:p.id,applicationGate:{status:'blocked'},branches:[]});
const call=(api:BaziRootFeedbackV132PreviewApi,p:BirthProfile,o?:{fromOutputMonthStem?:boolean})=>o===undefined?api.previewBaziRootFeedbackV132(p):api.previewBaziRootFeedbackV132(p,o);
beforeEach(()=>{vi.resetModules();vi.clearAllMocks();mocks.invoke.mockReset();mocks.preview.mockReset();mocks.build.mockReset().mockResolvedValue({});mocks.buildRequest.mockReset().mockResolvedValue({});mocks.buildFactory.mockReset().mockReturnValue(mocks.buildRequest);});
afterEach(()=>{vi.unstubAllGlobals();});

async function preload():Promise<BaziRootFeedbackV132PreviewApi>{await import('../src/main/preload');expect(mocks.expose).toHaveBeenCalledTimes(1);return mocks.expose.mock.calls[0][1] as BaziRootFeedbackV132PreviewApi;}
async function browser(fetchMock:ReturnType<typeof vi.fn>):Promise<BaziRootFeedbackV132PreviewApi>{const window={};vi.stubGlobal('window',window);vi.stubGlobal('fetch',fetchMock);await import('../src/shared/browser-api');return(window as typeof globalThis & {studio:BaziRootFeedbackV132PreviewApi}).studio;}

describe('M758 r2 preload/browser transport',()=>{
  it('forwards the exact profile/options over Electron IPC and preserves rejection',async()=>{
    const p=profile(),o={fromOutputMonthStem:true},dto=reply(p),api=await preload();mocks.invoke.mockResolvedValueOnce(dto);
    await expect(call(api,p,o)).resolves.toBe(dto);
    expect(mocks.invoke).toHaveBeenCalledExactlyOnceWith('studio:previewBaziRootFeedbackV132',p,o);
    const error=new Error('r2 preview rejected');mocks.invoke.mockRejectedValueOnce(error);await expect(call(api,p)).rejects.toBe(error);
  });
  it('posts the local browser request and propagates JSON/fetch failures',async()=>{
    const p=profile(),before=structuredClone(p),o={fromOutputMonthStem:false},dto=reply(p),fetchMock=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(dto),{status:200})),api=await browser(fetchMock);
    await expect(call(api,p,o)).resolves.toEqual(dto);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/__studio_api/previewBaziRootFeedbackV132',{method:'POST',headers:{'Content-Type':'application/json','X-Studio-Local-Request':'1'},body:JSON.stringify([before,o])});
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({error:'固定 r2 不可用'}),{status:400}));
    await expect(call(api,p)).rejects.toThrow('固定 r2 不可用');
    const network=new Error('local transport down');fetchMock.mockRejectedValueOnce(network);await expect(call(api,p)).rejects.toBe(network);
  });
});

type Middleware=(request:unknown,response:unknown,next:()=>void)=>Promise<void>;
async function middleware():Promise<Middleware>{let handler:Middleware|undefined;const plugin=(await import('../scripts/dev-plugin')).studioDevPlugin();await(plugin.configureServer as Function)({config:{root:resolve('.')},httpServer:{once:vi.fn()},middlewares:{use(value:Middleware){handler=value;}}});if(!handler)throw Error('missing middleware');return handler;}
async function request(handler:Middleware,endpoint:string,payload:string,options:{method?:string;headers?:Record<string,string>}={}):Promise<{status:number;body:unknown}> {let status=200,output='';const req={url:'/__studio_api/'+endpoint,method:options.method??'POST',headers:options.headers??{host:'127.0.0.1:18000','x-studio-local-request':'1'},async *[Symbol.asyncIterator](){yield Buffer.from(payload);}},res={get statusCode(){return status;},set statusCode(value:number){status=value;},setHeader(){},end(value=''){output+=value;}};await handler(req,res,()=>{status=404;});let body:unknown;try{body=JSON.parse(output);}catch{body=output;}return{status,body};}

describe('M758 r2 local HTTP transport',()=>{
  it('shares one lazy hook factory across simultaneous cold explicit requests',async()=>{
    const handler=await middleware(),p=profile(),dto=reply(p);mocks.preview.mockResolvedValue(dto);
    const results=await Promise.all([request(handler,'previewBaziRootFeedbackV132',JSON.stringify([p])),request(handler,'previewBaziRootFeedbackV132',JSON.stringify([p]))]);
    expect(results).toEqual([{status:200,body:dto},{status:200,body:dto}]);
    expect(mocks.buildFactory).toHaveBeenCalledTimes(1);expect(mocks.buildRequest).toHaveBeenCalledTimes(2);
  });
  it('routes the endpoint through the actual dev middleware and preserves guards/error envelope',async()=>{
    const handler=await middleware(),p=profile(),dto=reply(p);mocks.preview.mockResolvedValueOnce(dto);
    await expect(request(handler,'previewBaziRootFeedbackV132',JSON.stringify([p]))).resolves.toEqual({status:200,body:dto});
    expect(mocks.preview).toHaveBeenCalledExactlyOnceWith(p);expect(mocks.storeInit).toHaveBeenCalledTimes(1);
    mocks.preview.mockRejectedValueOnce(new Error('service r2 failure'));expect(await request(handler,'previewBaziRootFeedbackV132',JSON.stringify([p]))).toEqual({status:400,body:{error:'service r2 failure'}});
    expect(await request(handler,'previewBaziRootFeedbackV132',JSON.stringify([p]),{method:'GET'})).toEqual({status:403,body:'Forbidden'});
    expect(await request(handler,'previewBaziRootFeedbackV132',JSON.stringify({profile:p}))).toEqual({status:400,body:{error:'无效请求参数'}});
    expect(await request(handler,'previewBaziRootFeedbackV132',JSON.stringify([p]),{headers:{host:'127.0.0.1:18000'}})).toEqual({status:403,body:'Forbidden'});
  });
});

describe('M758 r2 main registration source contract',()=>{
  it('registers exactly one guarded Service route without touching the legacy endpoint',()=>{
    const source=ts.createSourceFile('main.ts',readFileSync(resolve('src/main/main.ts'),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),nodes:ts.Node[]=[];const visit=(node:ts.Node)=>{nodes.push(node);ts.forEachChild(node,visit);};visit(source);
    const routes=nodes.filter(ts.isCallExpression).filter(node=>ts.isIdentifier(node.expression)&&node.expression.text==='register'&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0])&&node.arguments[0].text==='previewBaziRootFeedbackV132');
    expect(routes).toHaveLength(1);const callback=routes[0].arguments[1];expect(callback&&ts.isArrowFunction(callback)).toBe(true);expect(callback?.getText(source)).toContain('service.previewBaziRootFeedbackV132(...args)');
  });
});
