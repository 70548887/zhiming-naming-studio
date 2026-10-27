import {afterAll,afterEach,beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';
import {createServer,type Server} from 'node:http';
import {EventEmitter} from 'node:events';
import {createCmnPreviewProject} from './helpers/cmn-preview-project';
import {mainNoticeSource} from './helpers/main-notice-registration';
import ts from 'typescript';
import type {BirthProfile,StudioAPI} from '../src/shared/types';
import {BAZI_MAINCHAIN_PREVIEW_VERSION,type BaziMainchainPreview,type BaziMainchainPreviewOptions} from '../src/shared/bazi-mainchain';

// Only platform/storage/service dependencies are replaced. Each bridge and the
// development middleware below are the repository's actual modules.
const mocks=vi.hoisted(()=>({
  expose:vi.fn(),invoke:vi.fn(),on:vi.fn(),storeConstruct:vi.fn(),storeInit:vi.fn(),
  serviceConstruct:vi.fn(),preview:vi.fn()
}));
vi.mock('electron',()=>({
  contextBridge:{exposeInMainWorld:mocks.expose},ipcRenderer:{invoke:mocks.invoke,on:mocks.on}
}));
vi.mock('../src/main/store',()=>({Store:class {
  constructor(...args:unknown[]){mocks.storeConstruct(...args);}
  async init(){mocks.storeInit();return this;}
}}));
vi.mock('../src/main/service',()=>({StudioService:class {
  store:unknown;
  constructor(...args:unknown[]){this.store=args[0];mocks.serviceConstruct(...args);}
  previewBaziMainchain(...args:unknown[]){return mocks.preview(...args);}
}}));

const optionCases:Array<{name:string;options:BaziMainchainPreviewOptions|undefined}>=[
  {name:'omitted',options:undefined},
  {name:'empty object',options:{}},
  {name:'explicit true',options:{fromOutputMonthStem:true}},
  {name:'explicit false',options:{fromOutputMonthStem:false}}
];
const nativeFetch=globalThis.fetch;

function profileFixture():BirthProfile {
  return {
    id:'mainchain-transport-profile',customerName:'传输𠮷😀',surname:'林',surnamePinyin:'lín',gender:'中性',
    calendar:'solar',birthDate:'2001-06-18',birthTime:'23:17',leapMonth:false,timeUnknown:true,
    birthPlace:'杭州𠮷😀',timezone:'Asia/Shanghai',timeBasis:'apparent-solar',birthLongitude:120.155,
    notes:'时辰未知；原记录23:17必须原样传输。',fatherName:'林知远',motherName:'陈安宁',
    namingPreferences:{length:2,generationChar:'',requiredChars:'',forbiddenChars:'',elderTaboo:'',
      style:'清雅',meanings:'平安',industry:'',priority:'balanced',preferredElements:['木'],zodiacRules:false,numerology:false}
  };
}
function freezeProfile(profile:BirthProfile):BirthProfile {
  Object.freeze(profile.namingPreferences!.preferredElements);
  Object.freeze(profile.namingPreferences);
  return Object.freeze(profile);
}
function previewFixture(profile:BirthProfile,options?:BaziMainchainPreviewOptions):BaziMainchainPreview {
  return {
    schema:BAZI_MAINCHAIN_PREVIEW_VERSION,status:'pending-calendar',profileId:profile.id,
    recordedBirth:{calendar:profile.calendar,birthDate:profile.birthDate,birthTime:profile.birthTime,
      timeUnknown:profile.timeUnknown,leapMonth:profile.leapMonth,timezone:profile.timezone,
      birthPlace:profile.birthPlace,timeBasis:profile.timeBasis,birthLongitude:profile.birthLongitude},
    method:{id:'transport-fixture',status:'independent-project-proposal',
      entryPolicy:options?.fromOutputMonthStem===true?'month-stem-proposal':'month-branch-only',defaultProductIntegration:false},
    calendar:{engineVersion:null,solarDate:null,lunarDate:null,basis:'apparent-solar',timezone:profile.timezone,
      calculationDateTime:null,dayStatus:'uncertain',dayDateCandidates:['2001-06-18','2001-06-19'],
      pillars:[{position:'hour',label:'时柱',gan:null,zhi:null}],warnings:['传输测试𠮷😀']},
    headline:['这是传输 DTO；未运行历法或主链算法。'],opinion:null,entryComparison:null,
    pending:[{code:'hour-unknown',explanation:'保留未知时辰。'}],
    conflicts:[{kind:'entry-policy',explanation:'完整保留嵌套 DTO。'}],
    assumptions:['测试传输保真'],sources:[{id:'transport-fixture',role:'project-assumption',scope:'transport-only'}],
    details:{timeBasis:null,method:null,originalMonthBranch:null,calendarError:null,calendarEngineWarnings:['详情𠮷😀']}
  };
}
function callPreview(api:StudioAPI,profile:BirthProfile,options?:BaziMainchainPreviewOptions){
  return options===undefined?api.previewBaziMainchain(profile):api.previewBaziMainchain(profile,options);
}
function assertOriginalProfile(profile:BirthProfile,before:BirthProfile){
  expect(profile).toEqual(before);
  expect(profile.timeUnknown).toBe(true);
  expect(profile.birthTime).toBe('23:17');
}

beforeEach(()=>{
  vi.resetModules();
  vi.clearAllMocks();
  mocks.invoke.mockReset();
  mocks.preview.mockReset();
});
afterEach(()=>vi.unstubAllGlobals());

async function actualPreload():Promise<StudioAPI>{
  await import('../src/main/preload');
  expect(mocks.expose).toHaveBeenCalledTimes(1);
  expect(mocks.expose.mock.calls[0][0]).toBe('studio');
  expect(mocks.on).toHaveBeenCalledExactlyOnceWith('studio:customer-write-notice',expect.any(Function));
  return mocks.expose.mock.calls[0][1] as StudioAPI;
}

describe('mainchain actual Electron preload transport',()=>{
  it.each(optionCases)('forwards $name options and the unchanged unknown-hour profile',async({options})=>{
    const profile=freezeProfile(profileFixture()),before=structuredClone(profile),dto=previewFixture(profile,options);
    const api=await actualPreload();mocks.invoke.mockResolvedValueOnce(dto);
    expect(await callPreview(api,profile,options)).toBe(dto);
    // The fixed two-argument preload wrapper intentionally preserves undefined.
    expect(mocks.invoke).toHaveBeenCalledExactlyOnceWith('studio:previewBaziMainchain',profile,options);
    expect(mocks.invoke.mock.calls[0][1]).toBe(profile);
    expect(mocks.invoke.mock.calls[0][2]).toBe(options);
    assertOriginalProfile(profile,before);
  });
  it('propagates the IPC rejection without returning a synthetic DTO',async()=>{
    const profile=freezeProfile(profileFixture()),before=structuredClone(profile),error=new Error('主进程预览失败𠮷😀');
    const api=await actualPreload();mocks.invoke.mockRejectedValueOnce(error);
    await expect(callPreview(api,profile,{fromOutputMonthStem:false})).rejects.toBe(error);
    expect(mocks.invoke).toHaveBeenCalledExactlyOnceWith('studio:previewBaziMainchain',profile,{fromOutputMonthStem:false});
    assertOriginalProfile(profile,before);
  });
});

async function actualBrowserApi(fetchMock:ReturnType<typeof vi.fn>):Promise<StudioAPI>{
  const browserWindow={} as {studio?:StudioAPI};
  vi.stubGlobal('window',browserWindow);vi.stubGlobal('fetch',fetchMock);
  await import('../src/shared/browser-api');
  expect(browserWindow.studio).toBeDefined();
  return browserWindow.studio!;
}

describe('mainchain actual browser API transport',()=>{
  it.each(optionCases)('serializes $name options, retains nested DTOs and leaves the profile unchanged',async({options})=>{
    const profile=freezeProfile(profileFixture()),before=structuredClone(profile),dto=previewFixture(profile,options);
    const fetchMock=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(dto),{status:200}));
    const api=await actualBrowserApi(fetchMock),result=await callPreview(api,profile,options);
    const args=options===undefined?[profile]:[profile,options];
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/__studio_api/previewBaziMainchain',{
      method:'POST',headers:{'Content-Type':'application/json','X-Studio-Local-Request':'1'},body:JSON.stringify(args)
    });
    const sent=JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(sent).toEqual(options===undefined?[before]:[before,options]);
    expect(sent[0].timeUnknown).toBe(true);expect(sent[0].birthTime).toBe('23:17');
    expect(result).toEqual(dto);expect(result.recordedBirth).toEqual(dto.recordedBirth);
    assertOriginalProfile(profile,before);
  });
  it('propagates the JSON service error message',async()=>{
    const fetchMock=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({error:'主链预览拒绝𠮷😀'}),{status:400}));
    const api=await actualBrowserApi(fetchMock),profile=freezeProfile(profileFixture()),before=structuredClone(profile);
    await expect(callPreview(api,profile,{})).rejects.toThrow('主链预览拒绝𠮷😀');
    assertOriginalProfile(profile,before);
  });
  it('preserves the existing fallback for a non-JSON HTTP error',async()=>{
    const api=await actualBrowserApi(vi.fn().mockResolvedValueOnce(new Response('unavailable',{status:503})));
    await expect(callPreview(api,profileFixture())).rejects.toThrow('本地服务连接失败');
  });
  it('propagates a fetch rejection unchanged',async()=>{
    const error=new Error('本地连接中断'),api=await actualBrowserApi(vi.fn().mockRejectedValueOnce(error));
    await expect(callPreview(api,profileFixture(),{fromOutputMonthStem:true})).rejects.toBe(error);
  });
  it('keeps an existing desktop bridge instead of installing an HTTP bridge',async()=>{
    const existing={previewBaziMainchain:vi.fn()} as unknown as StudioAPI,browserWindow={studio:existing},fetchMock=vi.fn();
    vi.stubGlobal('window',browserWindow);vi.stubGlobal('fetch',fetchMock);
    await import('../src/shared/browser-api');
    expect(browserWindow.studio).toBe(existing);expect(fetchMock).not.toHaveBeenCalled();
  });
});

let server:Server|undefined,address='',previewProject:ReturnType<typeof createCmnPreviewProject>|undefined;
const previewHttp=new EventEmitter();
describe('mainchain actual development middleware over HTTP',()=>{
  beforeAll(async()=>{
    const {studioDevPlugin}=await import('../scripts/dev-plugin');
    let middleware:((req:unknown,res:unknown,next:()=>void)=>Promise<void>)|undefined;
    const plugin=studioDevPlugin();
    previewProject=createCmnPreviewProject();
    await (plugin.configureServer as Function)({config:{root:previewProject.root},httpServer:previewHttp,middlewares:{use(fn:typeof middleware){middleware=fn;}}});
    if(!middleware)throw new Error('studioDevPlugin did not register its middleware');
    const handler=middleware;
    server=createServer((request,response)=>void handler(request,response,()=>{response.statusCode=404;response.end('Not Found');}));
    await new Promise<void>((resolve,reject)=>{server!.once('error',reject);server!.listen(0,'127.0.0.1',resolve);});
    address='http://127.0.0.1:'+(server.address() as {port:number}).port;
  });
  afterAll(async()=>{
    if(server)await new Promise<void>((resolve,reject)=>server!.close(error=>error?reject(error):resolve()));
    previewHttp.emit('close');await new Promise(r=>setImmediate(r));previewProject?.close();
  });
  const post=(method:string,args:unknown[],headers:Record<string,string>={})=>nativeFetch(address+'/__studio_api/'+method,{
    method:'POST',headers:{'Content-Type':'application/json','X-Studio-Local-Request':'1',...headers},body:JSON.stringify(args)
  });

  it.each(optionCases)('routes $name options to Service without adding or changing arguments',async({options})=>{
    const profile=freezeProfile(profileFixture()),before=structuredClone(profile),dto=previewFixture(profile,options);
    mocks.preview.mockResolvedValueOnce(dto);
    const args=options===undefined?[profile]:[profile,options],response=await post('previewBaziMainchain',args);
    expect(response.status).toBe(200);expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(await response.json()).toEqual(dto);
    expect(mocks.preview).toHaveBeenCalledTimes(1);
    expect(mocks.preview.mock.calls[0]).toEqual(options===undefined?[before]:[before,options]);
    expect(mocks.preview.mock.calls[0]).toHaveLength(options===undefined?1:2);
    expect(mocks.preview.mock.calls[0][0].timeUnknown).toBe(true);
    expect(mocks.preview.mock.calls[0][0].birthTime).toBe('23:17');
    assertOriginalProfile(profile,before);
  });
  it('returns the Service rejection in the existing HTTP error envelope',async()=>{
    mocks.preview.mockRejectedValueOnce(new Error('主链预览参数被拒绝𠮷😀'));
    const response=await post('previewBaziMainchain',[profileFixture(),{fromOutputMonthStem:false}]);
    expect(response.status).toBe(400);expect(await response.json()).toEqual({error:'主链预览参数被拒绝𠮷😀'});
    expect(mocks.preview).toHaveBeenCalledExactlyOnceWith(profileFixture(),{fromOutputMonthStem:false});
  });
  it('retains the non-POST, local-request-header and origin guards',async()=>{
    const get=await nativeFetch(address+'/__studio_api/previewBaziMainchain',{headers:{'X-Studio-Local-Request':'1'}});
    expect(get.status).toBe(403);expect(await get.text()).toBe('Forbidden');
    const missing=await nativeFetch(address+'/__studio_api/previewBaziMainchain',{method:'POST',body:'[]'});
    expect(missing.status).toBe(403);expect(await missing.text()).toBe('Forbidden');
    const cross=await post('previewBaziMainchain',[profileFixture()],{Origin:'https://different.invalid'});
    expect(cross.status).toBe(403);expect(await cross.text()).toBe('Forbidden');
    expect(mocks.preview).not.toHaveBeenCalled();
  });
  it('retains the unknown-method and non-array-argument rejections',async()=>{
    const unknown=await post('unknownMainchainTransportMethod',[profileFixture()]);
    expect(unknown.status).toBe(400);
    expect(await unknown.json()).toEqual({error:'此功能使用系统文件选择器，请在桌面应用中操作。'});
    const nonArray=await nativeFetch(address+'/__studio_api/previewBaziMainchain',{
      method:'POST',headers:{'Content-Type':'application/json','X-Studio-Local-Request':'1'},body:JSON.stringify({profile:profileFixture()})
    });
    expect(nonArray.status).toBe(400);expect(await nonArray.json()).toEqual({error:'无效请求参数'});
    expect(mocks.preview).not.toHaveBeenCalled();
  });
  it('passes unrelated paths to the next middleware',async()=>{
    const response=await nativeFetch(address+'/mainchain-unrelated');
    expect(response.status).toBe(404);expect(await response.text()).toBe('Not Found');
    expect(mocks.preview).not.toHaveBeenCalled();
  });
});

function descendants(node:ts.Node):ts.Node[]{
  const result:ts.Node[]=[];
  const visit=(current:ts.Node)=>{result.push(current);ts.forEachChild(current,visit);};
  visit(node);return result;
}
describe('mainchain independent main-process registration source contract',()=>{
  it('registers the endpoint through the existing sender guard before forwarding its arguments',()=>{
    // Inspect the real main source without importing it or creating a window.
    const {source}=mainNoticeSource();
    const nodes=descendants(source);
    const routes=nodes.filter(ts.isCallExpression).filter(node=>ts.isIdentifier(node.expression)&&node.expression.text==='register'
      &&node.arguments[0]&&ts.isStringLiteral(node.arguments[0])&&node.arguments[0].text==='previewBaziMainchain');
    expect(routes).toHaveLength(1);
    const route=routes[0],callback=route.arguments[1];
    if(!callback||!ts.isArrowFunction(callback))throw new Error('previewBaziMainchain must use the guarded register callback');
    expect(callback.parameters).toHaveLength(1);expect(callback.parameters[0].dotDotDotToken).toBeDefined();
    expect(callback.parameters[0].name.getText(source)).toBe('args');expect(callback.parameters[0].initializer).toBeUndefined();
    const calls=descendants(callback.body).filter(ts.isCallExpression).filter(node=>ts.isPropertyAccessExpression(node.expression)
      &&ts.isIdentifier(node.expression.expression)&&node.expression.expression.text==='service'&&node.expression.name.text==='previewBaziMainchain');
    expect(calls).toHaveLength(1);expect(calls[0].arguments).toHaveLength(1);
    expect(ts.isSpreadElement(calls[0].arguments[0])).toBe(true);expect(calls[0].arguments[0].getText(source)).toBe('...args');

    const registration=nodes.filter(ts.isVariableDeclaration).find(node=>ts.isIdentifier(node.name)&&node.name.text==='register');
    if(!registration?.initializer||!ts.isArrowFunction(registration.initializer)||!ts.isCallExpression(registration.initializer.body))throw new Error('Guarded register helper missing');
    const handle=registration.initializer.body;
    expect(handle.expression.getText(source)).toBe('ipcMain.handle');
    expect(handle.arguments[0].getText(source).replace(/\s/g,'')).toBe("'studio:'+name");
    const handler=handle.arguments[1];
    if(!handler||!ts.isArrowFunction(handler)||!ts.isBlock(handler.body))throw new Error('Main handler must contain the sender guard');
    expect(handler.parameters.map(parameter=>parameter.name.getText(source))).toEqual(['event','args']);
    expect(handler.parameters[1].dotDotDotToken).toBeDefined();
    expect(handler.body.statements).toHaveLength(3);
    const [guard,phaseGuard,forward]=handler.body.statements;
    if(!guard||!ts.isIfStatement(guard))throw new Error('Sender guard must precede forwarding');
    expect(guard.expression.getText(source).replace(/\s/g,'')).toBe('event.sender!==window.webContents');
    expect(descendants(guard.thenStatement).some(ts.isThrowStatement)).toBe(true);
    if(!phaseGuard||!ts.isIfStatement(phaseGuard)||!ts.isExpressionStatement(phaseGuard.thenStatement)||!ts.isCallExpression(phaseGuard.thenStatement.expression))throw new Error('Desktop176 phase guard must remain between sender validation and forwarding');
    expect(phaseGuard.expression.getText(source)).toBe('desktop176Context');
    expect(phaseGuard.elseStatement).toBeUndefined();
    expect(phaseGuard.thenStatement.expression.expression.getText(source)).toBe('assertDesktop176PhaseMethod');
    expect(phaseGuard.thenStatement.expression.arguments.map(argument=>argument.getText(source))).toEqual(['desktop176Context','name']);
    if(!forward||!ts.isReturnStatement(forward)||!forward.expression||!ts.isCallExpression(forward.expression))throw new Error('Guarded helper must return the forwarded call');
    expect(forward.expression.expression.getText(source)).toBe('invokeWithNotice');expect(forward.expression.arguments).toHaveLength(1);
    const action=forward.expression.arguments[0];if(!ts.isArrowFunction(action)||!ts.isCallExpression(action.body))throw new Error('Notice wrapper must invoke the original forwarding thunk');
    expect(action.parameters).toHaveLength(0);expect(action.body.expression.getText(source)).toBe('fn');expect(action.body.arguments.map(argument=>argument.getText(source))).toEqual(['...args']);
    const invocation=nodes.filter(ts.isVariableDeclaration).find(node=>ts.isIdentifier(node.name)&&node.name.text==='invokeWithNotice');
    if(!invocation?.initializer||!ts.isArrowFunction(invocation.initializer))throw new Error('Actual same-source notice helper missing');
    expect(invocation.initializer.parameters.map(parameter=>parameter.name.getText(source))).toEqual(['action']);
    expect(invocation.initializer.body.getText(source).replace(/\s/g,'')).toBe("invokeWithCustomerWriteNotice(service.store,action,notice=>window.webContents.send('studio:customer-write-notice',notice)).then(({result})=>result)");
  });
});
