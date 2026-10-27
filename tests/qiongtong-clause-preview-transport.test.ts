import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import ts from 'typescript';
import type {BirthProfile} from '../src/shared/types';

// These are platform/dependency replacements only. Every bridge under test is
// the real module; no SQL, Worker, HTTP listener or esbuild build is started.
const mocks=vi.hoisted(()=>({
  expose:vi.fn(),invoke:vi.fn(),on:vi.fn(),build:vi.fn(),
  storeConstruct:vi.fn(),storeInit:vi.fn(),serviceConstruct:vi.fn(),preview:vi.fn(),close:vi.fn(),
}));
vi.mock('electron',()=>({
  contextBridge:{exposeInMainWorld:mocks.expose},ipcRenderer:{invoke:mocks.invoke,on:mocks.on},
}));
vi.mock('esbuild',()=>({build:mocks.build}));
vi.mock('../src/main/store',()=>({Store:class {
  constructor(...args:unknown[]){mocks.storeConstruct(...args);}
  async init(){mocks.storeInit();return this;}
}}));
vi.mock('../src/main/service',()=>({StudioService:class {
  store:unknown;
  constructor(...args:unknown[]){this.store=args[0];mocks.serviceConstruct(...args);}
  previewQiongtongClauseReferences(...args:unknown[]){return mocks.preview(...args);}
  closeCmnReadingWorker(){return mocks.close();}
}}));

const method='previewQiongtongClauseReferences';
const schema='qiongtong-clause-reference-preview/1.0.0';
type ClauseApi={previewQiongtongClauseReferences(profile:BirthProfile):Promise<unknown>};
type Middleware=(request:unknown,response:unknown,next:()=>void)=>Promise<void>;
type Result={status:number;body:unknown;headers:Record<string,string>};

function profileFixture():BirthProfile {
  return {
    id:'qiongtong-clause-transport-profile',customerName:'条文传输𠮷😀',surname:'林',surnamePinyin:'lín',
    fatherName:'林知远',motherName:'陈安宁',gender:'中性',calendar:'solar',birthDate:'2001-06-18',
    birthTime:'23:17',leapMonth:false,timeUnknown:true,birthPlace:'杭州𠮷😀',timezone:'Asia/Shanghai',
    timeBasis:'apparent-solar',birthLongitude:120.155,notes:'保留未知时辰、原始23:17和汉字𠮷😀。',
  };
}
/** Deliberately a transport sentinel, not a claim that the algorithm produced
 * these fields. The bridge must preserve the promised schema and all JSON. */
function replyFixture(profile:BirthProfile){
  return {schema,profileId:profile.id,transportProbe:{text:'条文𠮷😀',nested:['原样',{preserve:true}]}};
}
function frozenProfile(){return Object.freeze(profileFixture());}
function assertUnchanged(profile:BirthProfile,before:BirthProfile){
  expect(profile).toEqual(before);expect(profile.timeUnknown).toBe(true);expect(profile.birthTime).toBe('23:17');
}

beforeEach(()=>{
  vi.resetModules();vi.clearAllMocks();
  mocks.invoke.mockReset();mocks.preview.mockReset();
  mocks.build.mockReset().mockResolvedValue({});mocks.close.mockReset().mockResolvedValue(undefined);
});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});

async function actualBrowser(fetchMock:ReturnType<typeof vi.fn>):Promise<ClauseApi>{
  const fakeWindow:{studio?:ClauseApi;postMessage:ReturnType<typeof vi.fn>}={postMessage:vi.fn()};
  vi.stubGlobal('window',fakeWindow);vi.stubGlobal('fetch',fetchMock);
  await import('../src/shared/browser-api');
  expect(fakeWindow.studio).toBeDefined();return fakeWindow.studio!;
}

describe('Qiongtong clause actual browser API transport',()=>{
  it('returns a Promise, posts exactly one unchanged profile and preserves the complete JSON reply',async()=>{
    const profile=frozenProfile(),before=structuredClone(profile),reply=replyFixture(profile);
    const fetchMock=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(reply),{status:200}));
    const api=await actualBrowser(fetchMock),pending=api.previewQiongtongClauseReferences(profile);
    expect(pending).toBeInstanceOf(Promise);expect(await pending).toEqual(reply);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/__studio_api/'+method,{
      method:'POST',headers:{'Content-Type':'application/json','X-Studio-Local-Request':'1'},
      body:JSON.stringify([before]),
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual([before]);
    assertUnchanged(profile,before);
  });
  it('propagates the existing JSON error envelope without inventing a preview',async()=>{
    const profile=frozenProfile(),before=structuredClone(profile);
    const api=await actualBrowser(vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({error:'条文预览拒绝𠮷😀'}),{status:400})));
    await expect(api.previewQiongtongClauseReferences(profile)).rejects.toThrow('条文预览拒绝𠮷😀');
    assertUnchanged(profile,before);
  });
  it('propagates a rejected fetch unchanged',async()=>{
    const error=new Error('条文预览连接中断'),api=await actualBrowser(vi.fn().mockRejectedValueOnce(error));
    await expect(api.previewQiongtongClauseReferences(profileFixture())).rejects.toBe(error);
  });
});

async function actualPreload():Promise<ClauseApi>{
  vi.stubGlobal('window',{postMessage:vi.fn()});
  await import('../src/main/preload');
  expect(mocks.expose).toHaveBeenCalledTimes(1);expect(mocks.expose.mock.calls[0][0]).toBe('studio');
  expect(mocks.on).toHaveBeenCalledExactlyOnceWith('studio:customer-write-notice',expect.any(Function));
  return mocks.expose.mock.calls[0][1] as ClauseApi;
}

describe('Qiongtong clause actual Electron preload transport',()=>{
  it('invokes the exact studio method with the same profile object and returns the Promise reply',async()=>{
    const profile=frozenProfile(),before=structuredClone(profile),reply=replyFixture(profile);
    mocks.invoke.mockResolvedValueOnce(reply);const api=await actualPreload();
    const pending=api.previewQiongtongClauseReferences(profile);
    expect(pending).toBeInstanceOf(Promise);expect(await pending).toBe(reply);
    expect(mocks.invoke).toHaveBeenCalledExactlyOnceWith('studio:'+method,profile);
    expect(mocks.invoke.mock.calls[0][1]).toBe(profile);assertUnchanged(profile,before);
  });
  it('preserves a rejected IPC invocation unchanged',async()=>{
    const error=new Error('主进程条文预览拒绝𠮷😀'),profile=frozenProfile(),before=structuredClone(profile);
    const api=await actualPreload();mocks.invoke.mockRejectedValueOnce(error);
    await expect(api.previewQiongtongClauseReferences(profile)).rejects.toBe(error);
    expect(mocks.invoke).toHaveBeenCalledExactlyOnceWith('studio:'+method,profile);assertUnchanged(profile,before);
  });
});

async function actualMiddleware():Promise<Middleware>{
  const {studioDevPlugin}=await import('../scripts/dev-plugin');
  let middleware:Middleware|undefined;
  await (studioDevPlugin().configureServer as Function)({
    config:{root:resolve('.')},httpServer:{once:vi.fn()},middlewares:{use(handler:Middleware){middleware=handler;}},
  });
  if(!middleware)throw new Error('Real dev plugin did not register middleware');
  expect(mocks.build).toHaveBeenCalledTimes(1);return middleware;
}
async function request(
  middleware:Middleware,endpoint:string,chunks:Array<string|Buffer>,
  options:{method?:string;headers?:Record<string,string>}={},
):Promise<Result>{
  let output='',status=200;const headers:Record<string,string>={};
  const req={
    url:'/__studio_api/'+endpoint,method:options.method??'POST',
    headers:options.headers??{host:'127.0.0.1:18000','x-studio-local-request':'1'},
    async *[Symbol.asyncIterator](){for(const chunk of chunks)yield chunk;},
  };
  const res={
    get statusCode(){return status;},set statusCode(value:number){status=value;},
    setHeader(name:string,value:string){headers[name.toLowerCase()]=value;},end(value=''){output+=value;},
  };
  await middleware(req,res,()=>{status=404;});
  let body:unknown;try{body=JSON.parse(output);}catch{body=output;}return{status,body,headers};
}

describe('Qiongtong clause actual development middleware with isolated dependencies',()=>{
  it('allows the method and forwards one complete UTF8 profile through actual JSON decoding',async()=>{
    const middleware=await actualMiddleware(),profile=frozenProfile(),before=structuredClone(profile),reply=replyFixture(profile);
    mocks.preview.mockResolvedValueOnce(reply);
    const encoded=Buffer.from(JSON.stringify([profile]));
    const result=await request(middleware,method,Array.from(encoded,byte=>Buffer.from([byte])));
    expect(result).toEqual({status:200,body:reply,headers:{'content-type':'application/json; charset=utf-8'}});
    expect(mocks.preview).toHaveBeenCalledExactlyOnceWith(before);expect(mocks.preview.mock.calls[0]).toHaveLength(1);
    expect(mocks.storeConstruct).toHaveBeenCalledTimes(1);expect(mocks.storeInit).toHaveBeenCalledTimes(1);
    expect(mocks.serviceConstruct).toHaveBeenCalledTimes(1);assertUnchanged(profile,before);
  });
  it('returns a Service rejection through the existing HTTP error envelope',async()=>{
    const middleware=await actualMiddleware(),profile=profileFixture();
    mocks.preview.mockRejectedValueOnce(new Error('条文服务失败𠮷😀'));
    expect(await request(middleware,method,[JSON.stringify([profile])])).toMatchObject({status:400,body:{error:'条文服务失败𠮷😀'}});
    expect(mocks.preview).toHaveBeenCalledExactlyOnceWith(profile);
  });
  it('retains unknown-method, non-array, local-request, origin and POST boundaries',async()=>{
    const middleware=await actualMiddleware(),payload=JSON.stringify([profileFixture()]);
    expect(await request(middleware,method+'Unknown',[payload])).toMatchObject({status:400,body:{error:'此功能使用系统文件选择器，请在桌面应用中操作。'}});
    expect(await request(middleware,method,[JSON.stringify({profile:profileFixture()})])).toMatchObject({status:400,body:{error:'无效请求参数'}});
    expect(await request(middleware,method,[payload],{method:'GET'})).toMatchObject({status:403,body:'Forbidden'});
    expect(await request(middleware,method,[payload],{headers:{host:'127.0.0.1:18000'}})).toMatchObject({status:403,body:'Forbidden'});
    expect(await request(middleware,method,[payload],{headers:{host:'127.0.0.1:18000','x-studio-local-request':'1',origin:'http://different.invalid'}})).toMatchObject({status:403,body:'Forbidden'});
    expect(mocks.preview).not.toHaveBeenCalled();
  });
});

function descendants(node:ts.Node):ts.Node[]{
  const nodes:ts.Node[]=[];const visit=(current:ts.Node)=>{nodes.push(current);ts.forEachChild(current,visit);};visit(node);return nodes;
}
describe('Qiongtong clause exact main IPC registration source contract',()=>{
  it('registers the new endpoint in start through the guarded IPC helper and the exact Service method',()=>{
    const source=ts.createSourceFile('main.ts',readFileSync(new URL('../src/main/main.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
    const start=descendants(source).find((node):node is ts.FunctionDeclaration=>ts.isFunctionDeclaration(node)&&node.name?.text==='start');
    if(!start?.body)throw new Error('Actual main start function missing');
    const nodes=descendants(start.body);
    const routes=nodes.filter(ts.isCallExpression).filter(node=>ts.isIdentifier(node.expression)&&node.expression.text==='register'
      &&node.arguments[0]&&ts.isStringLiteral(node.arguments[0])&&node.arguments[0].text===method);
    expect(routes).toHaveLength(1);expect(routes[0].arguments).toHaveLength(2);
    const callback=routes[0].arguments[1];
    if(!callback||!ts.isArrowFunction(callback)||!ts.isCallExpression(callback.body))throw new Error('Actual preview register callback must directly call Service');
    expect(callback.parameters).toHaveLength(1);const parameter=callback.parameters[0];
    expect(parameter.initializer).toBeUndefined();expect(ts.isIdentifier(parameter.name)).toBe(true);
    const call=callback.body;
    if(!ts.isPropertyAccessExpression(call.expression))throw new Error('Expected the exact Service method');
    expect(call.expression.expression.getText(source)).toBe('service');expect(call.expression.name.text).toBe(method);
    expect(call.arguments).toHaveLength(1);
    const argument=call.arguments[0];
    expect(ts.isSpreadElement(argument)).toBe(Boolean(parameter.dotDotDotToken));
    expect((ts.isSpreadElement(argument)?argument.expression:argument).getText(source)).toBe(parameter.name.getText(source));

    const declarations=start.body.statements.filter(ts.isVariableStatement).flatMap(statement=>[...statement.declarationList.declarations]);
    const registration=declarations.find(node=>ts.isIdentifier(node.name)&&node.name.text==='register');
    if(!registration?.initializer||!ts.isArrowFunction(registration.initializer)||!ts.isCallExpression(registration.initializer.body))throw new Error('Same-scope guarded register helper missing');
    const handle=registration.initializer.body;expect(handle.expression.getText(source)).toBe('ipcMain.handle');
    expect(handle.arguments[0].getText(source).replace(/\s/g,'')).toMatch(/^["']studio:["']\+name$/);
    const handler=handle.arguments[1];
    if(!handler||!ts.isArrowFunction(handler)||!ts.isBlock(handler.body))throw new Error('Expected the actual IPC sender-guard block');
    const guard=handler.body.statements[0];
    if(!guard||!ts.isIfStatement(guard))throw new Error('Sender guard must precede forwarding');
    expect(guard.expression.getText(source).replace(/\s/g,'')).toBe('event.sender!==window.webContents');
    expect(descendants(guard.thenStatement).some(ts.isThrowStatement)).toBe(true);
    const forward=handler.body.statements.find(ts.isReturnStatement);
    if(!forward?.expression||!ts.isCallExpression(forward.expression))throw new Error('Guarded helper forwarding missing');
    expect(forward.expression.expression.getText(source)).toBe('invokeWithNotice');
    const action=forward.expression.arguments[0];
    if(!action||!ts.isArrowFunction(action)||!ts.isCallExpression(action.body))throw new Error('Notice wrapper must invoke the guarded callback');
    expect(action.body.expression.getText(source)).toBe('fn');expect(action.body.arguments.map(node=>node.getText(source))).toEqual(['...args']);
  });
});
