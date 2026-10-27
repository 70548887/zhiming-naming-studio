import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import type {BirthProfile,NamingPreferences} from '../src/shared/types';
import type {Candidate2NamingEligibility,Candidate2NamingEligibilityApi} from '../src/shared/candidate2-naming-eligibility-v1';
import {CANDIDATE2_NAMING_SELECTION} from '../src/shared/candidate2-naming-consumer-v1';

// These are transport-only tests. Actual HTTP/Service/resource checks are an
// independent suite; this module neither builds candidate.2 nor calculates it.
const mocks=vi.hoisted(()=>({
 expose:vi.fn(),invoke:vi.fn(),on:vi.fn(),build:vi.fn(),previewBuildFactory:vi.fn(),previewBuild:vi.fn(),candidateBuild:vi.fn(),
 storeConstruct:vi.fn(),storeInit:vi.fn(),check:vi.fn(),generate:vi.fn(),saveSession:vi.fn(),close:vi.fn(),
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
 constructor(...args:unknown[]){this.store=args[0]??{};}
 checkCandidate2NamingEligibility(...args:unknown[]){return mocks.check(...args);}
 generate(...args:unknown[]){return mocks.generate(...args);}
 saveSession(...args:unknown[]){return mocks.saveSession(...args);}
 closeCmnReadingWorker(){return mocks.close();}
}}));

const profile=():BirthProfile=>({id:'m872-transport',customerName:'运输原始样本𠮷😀',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2001-06-18',birthTime:'23:17',timeUnknown:true,leapMonth:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'  保留原值、未知时辰与空格  '});
const preferences=():NamingPreferences=>({length:1,generationChar:'',requiredChars:'  沐  ',forbiddenChars:'',elderTaboo:'',style:'自然',meanings:'',industry:'',priority:'balanced',preferredElements:[],zodiacRules:false,numerology:false,avoidParentNames:true,yueReading:false,yueHomophones:'none',imageryReading:false,wordPronunciationReference:false,elementAssessment:false});
const diagnostic=(status:Candidate2NamingEligibility['status']='unavailable'):Candidate2NamingEligibility=>({
 schema:'candidate2-naming-eligibility/1',checkerVersion:'candidate2-naming-eligibility/1.0.0',consumerVersion:'candidate2-naming-consumer/1.0.0',status,
 reasons:status==='unavailable'?[{code:'application-resources-unavailable',message:'固定执行资源未部署𠮷😀'}]:[],
 binding:{request:null,requestDigest:null,normalizedInputDigest:null,resourceDigest:null},
 versions:{methodId:'project-bazi-mainchain-145/1.3.2',policyId:'naming-element-application/1.3.2-candidate.2',publicationId:'project-naming-application/1.3.2-candidate.2',entryPolicy:'month-branch-only',namingRulesVersion:'naming-editorial-7.1.0'},
 application:null,dataIdentity:null,generationAuthority:false,candidateAvailability:'not-evaluated',traditionalStatus:'unknown',notice:'只读运输夹具；无资格计算结果。',
});
const cases=[
 {name:'raw explicit selection',tail:()=>[structuredClone(CANDIDATE2_NAMING_SELECTION)]},
 {name:'omitted selection',tail:()=>[]},
 {name:'explicit null selection',tail:()=>[null]},
 {name:'explicit disabled selection',tail:()=>[{enabled:false}]},
];
const call=(api:Candidate2NamingEligibilityApi,args:unknown[]):Promise<Candidate2NamingEligibility>=>Reflect.apply(api.checkCandidate2NamingEligibility,api,args);

beforeEach(()=>{
 vi.resetModules();vi.clearAllMocks();mocks.invoke.mockReset();mocks.check.mockReset();
 mocks.build.mockReset().mockResolvedValue({});mocks.previewBuild.mockReset().mockResolvedValue({});
 mocks.previewBuildFactory.mockReset().mockReturnValue(mocks.previewBuild);mocks.candidateBuild.mockReset();
});
afterEach(()=>{vi.unstubAllGlobals();});

async function preload():Promise<Candidate2NamingEligibilityApi>{
 await import('../src/main/preload');expect(mocks.expose).toHaveBeenCalledTimes(1);
 return mocks.expose.mock.calls[0][1] as Candidate2NamingEligibilityApi;
}
async function browser(fetchMock:ReturnType<typeof vi.fn>):Promise<Candidate2NamingEligibilityApi>{
 const window={};vi.stubGlobal('window',window);vi.stubGlobal('fetch',fetchMock);
 await import('../src/shared/browser-api');return(window as {studio:Candidate2NamingEligibilityApi}).studio;
}

describe('M872 candidate.2 preload and browser transport only',()=>{
 it.each(cases)('forwards $name through the existing IPC namespace without changing raw inputs',async({tail})=>{
  const p=profile(),n=preferences(),args=[p,n,...tail()],before=structuredClone(args),reply=diagnostic(),api=await preload();
  mocks.invoke.mockResolvedValueOnce(reply);await expect(call(api,args)).resolves.toBe(reply);
  expect(mocks.invoke).toHaveBeenCalledExactlyOnceWith('studio:checkCandidate2NamingEligibility',...args);
  expect(mocks.invoke.mock.calls[0][1]).toBe(p);expect(mocks.invoke.mock.calls[0][2]).toBe(n);expect(args).toEqual(before);
  expect(mocks.generate).not.toHaveBeenCalled();expect(mocks.saveSession).not.toHaveBeenCalled();
 });
 it.each(cases)('posts $name as the original JSON argument array',async({tail})=>{
  const args=[profile(),preferences(),...tail()],before=structuredClone(args),reply=diagnostic(),fetchMock=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(reply),{status:200})),api=await browser(fetchMock);
  await expect(call(api,args)).resolves.toEqual(reply);
  expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/__studio_api/checkCandidate2NamingEligibility',{method:'POST',headers:{'Content-Type':'application/json','X-Studio-Local-Request':'1'},body:JSON.stringify(before)});
  expect(args).toEqual(before);expect(mocks.candidateBuild).not.toHaveBeenCalled();
 });
 it('omits trailing undefined over JSON while preserving an explicit null',async()=>{
  const p=profile(),n=preferences(),fetchMock=vi.fn().mockResolvedValue(new Response(JSON.stringify(diagnostic('disabled')),{status:200})),api=await browser(fetchMock);
  await call(api,[p,n,undefined]);expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify([p,n]));
 });
 it('preserves IPC rejection and browser service/network failures',async()=>{
  const args=[profile(),preferences()],api=await preload(),ipcError=new Error('资格运输失败𠮷😀');
  mocks.invoke.mockRejectedValueOnce(ipcError);await expect(call(api,args)).rejects.toBe(ipcError);
  const fetchMock=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({error:'资格服务错误𠮷😀'}),{status:400})),web=await browser(fetchMock);
  await expect(call(web,args)).rejects.toThrow('资格服务错误𠮷😀');
  const network=new Error('local HTTP unavailable');fetchMock.mockRejectedValueOnce(network);await expect(call(web,args)).rejects.toBe(network);
 });
 it('keeps an already installed desktop bridge intact',async()=>{
  const existing={checkCandidate2NamingEligibility:vi.fn()},window={studio:existing},fetchMock=vi.fn();
  vi.stubGlobal('window',window);vi.stubGlobal('fetch',fetchMock);await import('../src/shared/browser-api');
  expect(window.studio).toBe(existing);expect(fetchMock).not.toHaveBeenCalled();
 });
});

type Middleware=(request:unknown,response:unknown,next:()=>void)=>Promise<void>;
async function middleware():Promise<Middleware>{
 let handler:Middleware|undefined;const plugin=(await import('../scripts/dev-plugin')).studioDevPlugin();
 await(plugin.configureServer as Function)({config:{root:resolve('.')},httpServer:{once:vi.fn()},middlewares:{use(value:Middleware){handler=value;}}});
 if(!handler)throw Error('missing development HTTP middleware');return handler;
}
async function request(handler:Middleware,endpoint:string,payload:string,options:{method?:string;headers?:Record<string,string>}={}){
 let status=200,output='';const headers:Record<string,string>={};
 const req={url:'/__studio_api/'+endpoint,method:options.method??'POST',headers:options.headers??{host:'127.0.0.1:18000','x-studio-local-request':'1'},async *[Symbol.asyncIterator](){yield Buffer.from(payload);}};
 const res={get statusCode(){return status;},set statusCode(value:number){status=value;},setHeader(name:string,value:string){headers[name.toLowerCase()]=value;},end(value=''){output+=value;}};
 await handler(req,res,()=>{status=404;});let body:unknown;try{body=JSON.parse(output);}catch{body=output;}return{status,body,headers};
}

describe('M872 development middleware routing with mocked Service, not a real HTTP server',()=>{
 it.each(cases)('whitelists $name and forwards exact raw args without a core build hook',async({tail})=>{
  const handler=await middleware(),args=[profile(),preferences(),...tail()],reply=diagnostic();mocks.check.mockResolvedValueOnce(reply);
  const response=await request(handler,'checkCandidate2NamingEligibility',JSON.stringify(args));
  expect(response.status).toBe(200);expect(response.body).toEqual(reply);expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
  expect(mocks.check).toHaveBeenCalledExactlyOnceWith(...args);
  // Existing startup work is only the CMN worker; this endpoint adds no build.
  expect(mocks.build).toHaveBeenCalledTimes(1);expect(mocks.build.mock.calls[0][0].entryPoints).toEqual(['src/main/cmn-reading-worker.ts']);
  expect(mocks.previewBuildFactory).not.toHaveBeenCalled();expect(mocks.previewBuild).not.toHaveBeenCalled();expect(mocks.candidateBuild).not.toHaveBeenCalled();
  expect(mocks.generate).not.toHaveBeenCalled();expect(mocks.saveSession).not.toHaveBeenCalled();
 });
 it('preserves transport guards, error envelope and the rejection of unexposed candidate methods',async()=>{
  const handler=await middleware(),args=[profile(),preferences()];mocks.check.mockRejectedValueOnce(new Error('资格检查拒绝𠮷😀'));
  const failed=await request(handler,'checkCandidate2NamingEligibility',JSON.stringify(args));expect(failed.status).toBe(400);expect(failed.body).toEqual({error:'资格检查拒绝𠮷😀'});
  const get=await request(handler,'checkCandidate2NamingEligibility','[]',{method:'GET'});expect(get.status).toBe(403);expect(get.body).toBe('Forbidden');
  const missing=await request(handler,'checkCandidate2NamingEligibility','[]',{headers:{host:'127.0.0.1:18000'}});expect(missing.status).toBe(403);
  const origin=await request(handler,'checkCandidate2NamingEligibility','[]',{headers:{host:'127.0.0.1:18000','x-studio-local-request':'1',origin:'https://different.invalid'}});expect(origin.status).toBe(403);
  const nonArray=await request(handler,'checkCandidate2NamingEligibility',JSON.stringify({profile:profile()}));expect(nonArray.status).toBe(400);expect(nonArray.body).toEqual({error:'无效请求参数'});
  for(const method of ['generateCandidate2Naming','createCandidate2Saved','verifyCandidate2Saved']){const response=await request(handler,method,'[]');expect(response.status).toBe(400);expect(response.body).toEqual({error:'此功能使用系统文件选择器，请在桌面应用中操作。'});}
  expect(mocks.check).toHaveBeenCalledTimes(1);expect(mocks.generate).not.toHaveBeenCalled();expect(mocks.saveSession).not.toHaveBeenCalled();expect(mocks.candidateBuild).not.toHaveBeenCalled();
 });
});

function descendants(node:ts.Node):ts.Node[]{const nodes:ts.Node[]=[];const visit=(child:ts.Node)=>{nodes.push(child);ts.forEachChild(child,visit);};visit(node);return nodes;}
describe('M872 main IPC registration source contract',()=>{
 it('adds exactly one normal guarded register route to the original Service method',()=>{
  const source=ts.createSourceFile('main.ts',readFileSync(resolve('src/main/main.ts'),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),nodes=descendants(source);
  const routes=nodes.filter(ts.isCallExpression).filter(node=>ts.isIdentifier(node.expression)&&node.expression.text==='register'&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0])&&node.arguments[0].text==='checkCandidate2NamingEligibility');
  expect(routes).toHaveLength(1);const callback=routes[0].arguments[1];expect(callback&&ts.isArrowFunction(callback)).toBe(true);expect(callback?.getText(source)).toContain('service.checkCandidate2NamingEligibility(...args)');
  const guard=nodes.filter(ts.isVariableDeclaration).find(node=>ts.isIdentifier(node.name)&&node.name.text==='register');
  expect(guard?.getText(source)).toContain('event.sender!==window.webContents');expect(guard?.getText(source)).toContain('assertDesktop176PhaseMethod');expect(guard?.getText(source)).toContain('invokeWithNotice');
  const direct=nodes.filter(ts.isCallExpression).filter(node=>ts.isPropertyAccessExpression(node.expression)&&node.expression.expression.getText(source)==='ipcMain'&&node.expression.name.text==='handle'&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0])&&node.arguments[0].text==='studio:checkCandidate2NamingEligibility');
  expect(direct).toEqual([]);
 });
 it('keeps the development endpoint separate from automatic preview or candidate deployment hooks',()=>{
  const source=readFileSync(resolve('scripts/dev-plugin.ts'),'utf8');
  expect(source).toContain("allowed.push('checkCandidate2NamingEligibility')");
  expect(source).not.toContain('ensureCandidate2NamingDependency');expect(source).not.toContain('build-candidate2-naming-dependency');
  const parsed=ts.createSourceFile('dev-plugin.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  const predicates=descendants(parsed).filter(ts.isIfStatement).map(node=>node.expression.getText(parsed));
  expect(predicates).not.toContain("method==='checkCandidate2NamingEligibility'");
 });
});
