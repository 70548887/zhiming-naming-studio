import {createCmnPreviewProject} from './helpers/cmn-preview-project';
import {mainNoticeSource,noticeTransportForMain} from './helpers/main-notice-registration';
import {EventEmitter} from 'node:events';
import {afterAll,beforeAll,describe,expect,it,vi} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {Store} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {studioDevPlugin} from '../scripts/dev-plugin';
import {CMN_READING_INPUTS} from '../src/main/cmn-reading-pins';
import {recordCustomerWriteNotice} from '../src/main/writer-finalization';
import type {CmnReadingQuery} from '../src/shared/cmn-reading';
import type {BirthProfile,StudioAPI} from '../src/shared/types';

const electron=vi.hoisted(()=>({expose:vi.fn(),invoke:vi.fn(),on:vi.fn()}));
vi.mock('electron',()=>({contextBridge:{exposeInMainWorld:electron.expose},ipcRenderer:{invoke:electron.invoke,on:electron.on}}));
const invalid='请输入一个完整的汉字。',unavailable='普通话读音来源不可用或校验失败，请恢复内置资料后重试。';
const parent=fs.realpathSync.native(os.tmpdir()),data=path.resolve('data'),wasm=createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm');
const fixture=JSON.parse(fs.readFileSync(path.resolve('tests/fixtures/cmn-reading-query-m141.json'),'utf8')) as {queries:CmnReadingQuery[]};
const sha=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
let dir:string,fault:string,store:Store,svc:StudioService,middleware:(req:unknown,res:unknown,next:()=>void)=>Promise<void>;
const profile:BirthProfile={id:'cmn-api-real-profile',customerName:'普通话查询只读验收',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2026-10-17',birthTime:'09:30',leapMonth:false,timeUnknown:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'隔离测试，不是客户资料'};

function state(){
  const files=fs.readdirSync(dir).sort().map(name=>{const file=path.join(dir,name),s=fs.statSync(file,{bigint:true});return{name,size:String(s.size),mtimeNs:String(s.mtimeNs),sha256:s.isFile()?sha(fs.readFileSync(file)):null};});
  return{files,databaseSha256:sha(store.db.export()),profiles:store.db.exec('SELECT id,json FROM profiles ORDER BY id'),revisionRows:store.db.exec('SELECT COUNT(*) FROM revisions')};
}
type HttpResult={status:number;body:any;headers:Record<string,string>};
async function request(method:string,args:unknown,headers:Record<string,string>={'x-studio-local-request':'1'},httpMethod='POST'):Promise<HttpResult>{
  let status=200,text='';const responseHeaders:Record<string,string>={};
  const payload=Buffer.from(JSON.stringify(args));
  // Node's actual HTTP IncomingMessage lowercases header names.
  const incomingHeaders=Object.fromEntries(Object.entries(headers).map(([key,value])=>[key.toLowerCase(),value]));
  const req={url:'/__studio_api/'+method,method:httpMethod,headers:{host:'127.0.0.1:18141',...incomingHeaders},async *[Symbol.asyncIterator](){for(const byte of payload)yield Buffer.from([byte]);}};
  const res={get statusCode(){return status;},set statusCode(s:number){status=s;},setHeader(k:string,v:string){responseHeaders[k]=v;},end(s=''){text+=s;}};
  await middleware(req,res,()=>{status=404;});let body:unknown;try{body=JSON.parse(text);}catch{body=text;}
  return{status,body,headers:responseHeaders};
}
async function withFaultData<T>(action:()=>Promise<T>):Promise<T>{const before=store.dataDir;store.dataDir=fault;try{return await action();}finally{store.dataDir=before;}}
function editFault(file:string,edit:(b:Buffer)=>Buffer){const target=path.join(fault,file),original=fs.readFileSync(target);fs.writeFileSync(target,edit(original));return()=>fs.writeFileSync(target,original);}
function bindActualMainIpc(options:{service?:unknown;context?:unknown;phaseGuard?:(context:unknown,name:string)=>void}={}){
  // Execute the actual new main registration and its existing sender guard.
  // This is a contract execution, not an Electron window or transport launch.
  const {file,source:parsed}=mainNoticeSource();
  let invoke='',register='',route='';
  const visit=(node:ts.Node)=>{
    if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text==='invokeWithNotice')invoke=node.parent.parent.getText(parsed);
    if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text==='register')register=node.parent.parent.getText(parsed);
    if(ts.isExpressionStatement(node)&&ts.isCallExpression(node.expression)&&ts.isIdentifier(node.expression.expression)&&node.expression.expression.text==='register'&&ts.isStringLiteral(node.expression.arguments[0])&&node.expression.arguments[0].text==='getCmnReadingOptions')route=node.getText(parsed);
    ts.forEachChild(node,visit);
  };visit(parsed);expect(invoke).toContain('invokeWithCustomerWriteNotice(service.store,action,');expect(register).toContain('event.sender!==window.webContents');expect(route).toContain('service.getCmnReadingOptions');
  const handlers=new Map<string,(event:{sender:unknown},...args:unknown[])=>unknown>(),sender={scope:'only-owned-webcontents',send:vi.fn()};
  const code=ts.transpileModule(invoke+'\n'+register+'\n'+route,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  // Real same-source transport uses the actual owner scope and host Promise;
  // only window/IPC delivery is controlled, never notice invocation itself.
  runInNewContext(code,{ipcMain:{handle:(name:string,fn:(event:{sender:unknown},...args:unknown[])=>unknown)=>handlers.set(name,fn)},window:{webContents:sender},service:options.service??svc,desktop176Context:options.context,assertDesktop176PhaseMethod:options.phaseGuard,invokeWithCustomerWriteNotice:noticeTransportForMain(file),Promise});
  expect([...handlers.keys()]).toEqual(['studio:getCmnReadingOptions']);
  return{handler:handlers.get('studio:getCmnReadingOptions')!,sender};
}

let previewProject:ReturnType<typeof createCmnPreviewProject>|undefined;const previewHttp=new EventEmitter();
beforeAll(async()=>{previewProject=createCmnPreviewProject();
  const outer=fs.realpathSync.native(fs.mkdtempSync(path.join(parent,'cmn-reading-api-')));dir=path.join(outer,'user');fault=path.join(outer,'fault-data');
  store=await new Store(dir,path.join(previewProject!.root,'data'),wasm).init();store.saveProfile(profile);svc=new StudioService(store,{read:()=>'',write:()=>{}},false);
  fs.mkdirSync(fault);
  for(const p of CMN_READING_INPUTS){const relative=p.file.slice(5),dst=path.join(fault,relative);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(path.join(data,relative),dst);fs.chmodSync(dst,0o600);}
  vi.stubEnv('NAMING_STUDIO_PREVIEW_DATA',dir);
  const plugin=studioDevPlugin();await (plugin.configureServer as Function)({config:{root:previewProject.root},httpServer:previewHttp,middlewares:{use(fn:typeof middleware){middleware=fn;}}});
},60000);
afterAll(async()=>{
  await svc?.closeCmnReadingWorker();previewHttp.emit('close');await new Promise(r=>setImmediate(r));previewProject?.close();
  vi.restoreAllMocks();vi.unstubAllEnvs();vi.unstubAllGlobals();store?.db.close();
  if(dir){const outer=path.dirname(dir);if(!outer.startsWith(parent+path.sep))throw Error('Unsafe test cleanup');fs.rmSync(outer,{recursive:true,force:true});}
});

describe('CMN source through actual read-only StudioService',()=>{
  it('returns real alternative readings, fixed meanings, original glyphs and distinct defaults',async()=>{
    const before=state(),run=vi.spyOn(store.db,'run');
    const q=await svc.getCmnReadingOptions('行');
    expect(q).toEqual(fixture.queries.find(q=>q.char==='行'));
    expect(q.options.map(o=>o.pinyin)).toEqual(['xíng','háng','xìng','hàng']);
    expect(q.currentDefault?.pinyin).toBe('xíng');expect(q.options.find(o=>o.pinyin==='xìng')?.definitions[0].original.def).toBe('行為舉止。');
    expect(run).not.toHaveBeenCalled();run.mockRestore();expect(state()).toEqual(before);
    console.info('M141_CMN_SERVICE_READONLY',JSON.stringify({before,after:state(),equal:true}));
  },15000);
  it('validates char in main without coercion, trimming or reading any sources for invalid input',async()=>{
    const before=state();await withFaultData(async()=>{
      const actual=store.dataDir;store.dataDir=path.join(fault,'missing-directory');
      try{for(const char of [null,123,{},['行'],'','行行',' 行','行 ','\ud800','😀'] as unknown[])await expect(svc.getCmnReadingOptions(char as string)).rejects.toThrow(invalid);}
      finally{store.dataDir=actual;}
    });expect(state()).toEqual(before);
  });
  it('keeps real empty-definition references unselectable and unknown source characters unavailable',async()=>{
    for(const char of ['沈','重','燚'])expect(await svc.getCmnReadingOptions(char)).toEqual(fixture.queries.find(q=>q.char===char));
    const q=await svc.getCmnReadingOptions('沈');expect(q.references[0].selectable).toBe(false);expect(q.options.map(o=>o.pinyin)).toEqual(['shěn']);
  },15000);
  it('rechecks actual sources per request; tampering after a successful read cannot reuse available cache',async()=>{
    const before=state();await withFaultData(async()=>{
      expect((await svc.getCmnReadingOptions('长')).status).toBe('available');
      const restore=editFault('raw/moe-revised.json.gz',b=>Buffer.concat([b,Buffer.from('x')]));
      try{await expect(svc.getCmnReadingOptions('长')).rejects.toThrow(unavailable);}finally{restore();}
      expect((await svc.getCmnReadingOptions('长')).status).toBe('available');
    });expect(state()).toEqual(before);
  },15000);
  it('missing glyph original and modified character identity map to the same public source error without paths',async()=>{
    const before=state();await withFaultData(async()=>{
      const original=path.join(fault,'raw/kTraditionalVariant.txt'),moved=original+'.held';fs.renameSync(original,moved);
      try{await expect(svc.getCmnReadingOptions('长')).rejects.toThrow(unavailable);}finally{fs.renameSync(moved,original);}
      const restore=editFault('dataset-v6.json',b=>Buffer.from(b.toString('utf8').replace('zhāo','chāo')));
      try{await expect(svc.getCmnReadingOptions('朝')).rejects.toThrow(unavailable);}finally{restore();}
    });expect(state()).toEqual(before);
  },15000);
});

describe('real preview route and browser fallback',()=>{
  it('allows the new actual service route and preserves UTF8 Buffer boundaries with no persisted writes',async()=>{
    const before=state(),r=await request('getCmnReadingOptions',['长']);expect(r.status).toBe(200);expect(r.body).toEqual(fixture.queries.find(q=>q.char==='长'));
    expect(r.headers['Content-Type']).toBe('application/json; charset=utf-8');expect(state()).toEqual(before);
    console.info('M141_CMN_PREVIEW_READONLY',JSON.stringify({before,after:state(),equal:true}));
  },20000);
  it('maps invalid char to400/error and preserves local-request and origin guards',async()=>{
    const before=state();expect(await request('getCmnReadingOptions',['行行'])).toMatchObject({status:400,body:{error:invalid}});
    expect((await request('getCmnReadingOptions',['行'],{})).status).toBe(403);
    expect((await request('getCmnReadingOptions',['行'],{'x-studio-local-request':'1',origin:'http://different.invalid'})).status).toBe(403);
    expect((await request('getCmnReadingOptions',['行'],{'x-studio-local-request':'1'},'GET')).status).toBe(403);
    expect((await request('getCmnReadingOptions',{char:'行'})).status).toBe(400);expect(state()).toEqual(before);
  });
  it('maps real source tamper through actual Service into the existing400/error envelope',async()=>{
    const original=StudioService.prototype.getCmnReadingOptions;
    const spy=vi.spyOn(StudioService.prototype,'getCmnReadingOptions').mockImplementation(async function(this:StudioService,char:string){const before=this.store.dataDir;this.store.dataDir=fault;try{return await original.call(this,char);}finally{this.store.dataDir=before;}});
    const restore=editFault('raw/kTraditionalVariant.txt',b=>Buffer.concat([b,Buffer.from('\n')])),before=state();
    try{const r=await request('getCmnReadingOptions',['长']);expect(r).toMatchObject({status:400,body:{error:unavailable}});expect(JSON.stringify(r.body)).not.toContain(fault);expect(spy).toHaveBeenCalledWith('长');expect(state()).toEqual(before);}
    finally{restore();spy.mockRestore();}
  },15000);
  it('window.studio browser implementation makes the real POST and propagates the actual route error',async()=>{
    vi.stubGlobal('window',{});const fetch=vi.fn(async(url:string,init:RequestInit)=>{
      const r=await request(url.replace('/__studio_api/',''),JSON.parse(String(init.body)),init.headers as Record<string,string>,init.method);
      return new Response(JSON.stringify(r.body),{status:r.status,headers:r.headers});
    });vi.stubGlobal('fetch',fetch);
    await import('../src/shared/browser-api');const api=window.studio;
    const before=state();expect(await api.getCmnReadingOptions('长')).toEqual(fixture.queries.find(q=>q.char==='长'));
    expect(fetch).toHaveBeenCalledWith('/__studio_api/getCmnReadingOptions',expect.objectContaining({method:'POST',body:'["长"]'}));
    await expect(api.getCmnReadingOptions('行行')).rejects.toThrow(invalid);expect(state()).toEqual(before);
  },15000);
});

describe('actual preload and main registration contracts without a native window',()=>{
  it('executes main sender guard and rejects unrelated webContents before Service is called',async()=>{
    const {handler,sender}=bindActualMainIpc(),before=state(),spy=vi.spyOn(svc,'getCmnReadingOptions');
    expect(()=>handler({sender:{}},'行')).toThrow('无效的调用来源。');expect(spy).not.toHaveBeenCalled();
    expect(await handler({sender},'行')).toEqual(fixture.queries.find(q=>q.char==='行'));expect(spy).toHaveBeenCalledWith('行');spy.mockRestore();expect(state()).toEqual(before);
  },15000);
  it('actual preload exposes studio and invokes the new registered main callback',async()=>{
    const {handler,sender}=bindActualMainIpc();electron.invoke.mockImplementation((name:string,...args:unknown[])=>{if(name!=='studio:getCmnReadingOptions')throw Error('Unexpected channel');return handler({sender},...args);});
    await import('../src/main/preload');expect(electron.expose).toHaveBeenCalledWith('studio',expect.any(Object));expect(electron.on).toHaveBeenCalledWith('studio:customer-write-notice',expect.any(Function));
    const api=electron.expose.mock.calls[0][1] as StudioAPI,before=state();expect(await api.getCmnReadingOptions('行')).toEqual(fixture.queries.find(q=>q.char==='行'));
    expect(electron.invoke).toHaveBeenCalledWith('studio:getCmnReadingOptions','行');await expect(api.getCmnReadingOptions('行行')).rejects.toThrow(invalid);expect(state()).toEqual(before);
  },15000);
  it('the actual main callback rejects missing source through the real Service',async()=>{
    const {handler,sender}=bindActualMainIpc(),before=state(),original=store.dataDir;store.dataDir=path.join(fault,'missing');
    try{await expect(handler({sender},'行')).rejects.toThrow(unavailable);}finally{store.dataDir=original;}expect(state()).toEqual(before);
  });
  it('rejects foreign sender and denied phase synchronously before the owner getter or action',()=>{
    const owner={},ownerGetter=vi.fn(()=>owner),action=vi.fn(),target=Object.defineProperty({getCmnReadingOptions:action},'store',{get:ownerGetter}),denied=new Error('controlled phase denial'),phaseGuard=vi.fn(()=>{throw denied;});
    const {handler,sender}=bindActualMainIpc({service:target,context:{phaseID:'resume'},phaseGuard});
    expect(()=>handler({sender:{}},'行')).toThrow('无效的调用来源。');expect(phaseGuard).not.toHaveBeenCalled();expect(ownerGetter).not.toHaveBeenCalled();
    expect(()=>handler({sender},'行')).toThrow(denied);expect(phaseGuard).toHaveBeenCalledOnce();expect(ownerGetter).not.toHaveBeenCalled();expect(action).not.toHaveBeenCalled();
  });
  it('keeps same args, this, results and primary rejections through the real scoped notice helper',async()=>{
    const owner={},value={exact:'business result'},seen:unknown[][]=[],target={store:owner,getCmnReadingOptions(...args:unknown[]):unknown{expect(this).toBe(target);seen.push(args);return value;}};
    const {handler,sender}=bindActualMainIpc({service:target});
    for(const args of [[],['行'],['行',value]])expect(await handler({sender},...args)).toBe(value);expect(seen).toEqual([[],['行'],['行',value]]);expect(sender.send).not.toHaveBeenCalled();
    const sync=Object.freeze(new Error('primary sync')),rejected=Object.freeze(new Error('primary async'));
    target.getCmnReadingOptions=()=>{throw sync;};await expect(handler({sender},'行')).rejects.toBe(sync);
    target.getCmnReadingOptions=()=>Promise.reject(rejected);await expect(handler({sender},'行')).rejects.toBe(rejected);
    target.getCmnReadingOptions=()=>({committed:true});await handler({sender},'行');expect(sender.send).not.toHaveBeenCalled();
    target.getCmnReadingOptions=()=>{recordCustomerWriteNotice(owner,'committed-cleanup');return value;};expect(await handler({sender},'行')).toBe(value);expect(sender.send).toHaveBeenCalledOnce();expect(sender.send).toHaveBeenCalledWith('studio:customer-write-notice',expect.objectContaining({schema:'customer-write-notice/1',kind:'committed-cleanup',requiresRestart:true}));
  });
});
