import {createCmnPreviewProject} from './helpers/cmn-preview-project';
import {EventEmitter} from 'node:events';
import {afterAll,beforeAll,describe,expect,it,vi} from 'vitest';
import {mkdtempSync,readFileSync,realpathSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join,resolve,sep} from 'node:path';import {createHash} from 'node:crypto';
import {studioDevPlugin} from '../scripts/dev-plugin';import {StudioService} from '../src/main/service';import {Store} from '../src/main/store';import type {BirthProfile} from '../src/shared/types';

type Chunk=Buffer|string;type Result={status:number;body:any};
const parent=realpathSync.native(tmpdir()),wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm');let directory:string,middleware:(req:unknown,res:unknown,next:()=>void)=>Promise<void>;
const profile:BirthProfile={id:'preview-utf8-profile',customerName:'汉字𠮷😀保持完整',surname:'林',surnamePinyin:'lín',fatherName:'林知远',motherName:'陈安宁',gender:'中性',calendar:'solar',birthDate:'2026-10-17',birthTime:'09:30',leapMonth:false,timeUnknown:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'仅限原始文字：𠮷、😀与汉字。'};
const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
async function invoke(method:string,chunks:Chunk[],headers:Record<string,string>={'x-studio-local-request':'1'}):Promise<Result>{
 let output='',status=200;const request={url:'/__studio_api/'+method,method:'POST',headers:{host:'127.0.0.1:18000',...headers},async *[Symbol.asyncIterator](){for(const chunk of chunks)yield chunk;}},response={get statusCode(){return status;},set statusCode(value:number){status=value;},setHeader(){},end(value=''){output+=value;}};
 await middleware(request,response,()=>{status=404;});let body:any;try{body=JSON.parse(output);}catch{body=output;}return{status,body};
}
let previewProject:ReturnType<typeof createCmnPreviewProject>|undefined;const previewHttp=new EventEmitter();
beforeAll(async()=>{previewProject=createCmnPreviewProject();directory=mkdtempSync(join(parent,'preview-utf8-transport-'));vi.stubEnv('NAMING_STUDIO_PREVIEW_DATA',directory);const plugin=studioDevPlugin();await (plugin.configureServer as Function)({config:{root:previewProject.root},httpServer:previewHttp,middlewares:{use(fn:typeof middleware){middleware=fn;}}});expect((await invoke('bootstrap',[Buffer.from('[]')])).status).toBe(200);},20000);
afterAll(async()=>{previewHttp.emit('close');await new Promise(r=>setImmediate(r));previewProject?.close();vi.restoreAllMocks();vi.unstubAllEnvs();if(directory){if(!resolve(directory).startsWith(resolve(parent)+sep))throw Error('Unsafe isolated transport-test cleanup');rmSync(directory,{recursive:true,force:true});}});

describe('preview UTF8 transport through actual Service and Store',()=>{
 it('preserves three- and four-byte characters split into deterministic Buffer bytes and persists the exact text',async()=>{
  // This controls handler AsyncIterable chunks, not TCP packet/event boundaries.
  const spy=vi.spyOn(StudioService.prototype,'saveProfile'),payload=Buffer.from(JSON.stringify([profile]));const result=await invoke('saveProfile',Array.from(payload,byte=>Buffer.from([byte])));
  expect(result.status).toBe(200);expect(result.body.customerName).toBe(profile.customerName);expect(result.body.notes).toBe(profile.notes);expect(spy).toHaveBeenCalledWith(profile);spy.mockRestore();
  const reader=await new Store(directory,resolve('data'),wasm).init();try{const saved=reader.rows<BirthProfile>('profiles').find(row=>row.id===profile.id)!;expect(saved.customerName).toBe(profile.customerName);expect(saved.notes).toBe(profile.notes);}finally{reader.db.close();}
 // Actual lazy Service/resource initialization is in beforeAll; this case also
 // opens an independent SQL reader. Keep its local budget, not a global change.
 },20000);
 it('also preserves Buffer splits inside a four-byte codepoint and existing decoded string chunks',async()=>{
  const text=JSON.stringify([profile]),bytes=Buffer.from(text),index=bytes.indexOf(Buffer.from('𠮷'));expect(index).toBeGreaterThanOrEqual(0);
  const result=await invoke('saveProfile',[bytes.subarray(0,index+1),bytes.subarray(index+1,index+3),bytes.subarray(index+3)]);expect(result.status).toBe(200);expect(result.body.customerName).toBe(profile.customerName);
  const surrogate=text.indexOf('😀')+1,decoded=await invoke('saveProfile',[text.slice(0,surrogate),text.slice(surrogate)]);expect(decoded.status).toBe(200);expect(decoded.body.notes).toBe(profile.notes);
 },15000);
 it('keeps the decoded4000000 limit and checks decoder-end flush without accepting damaged JSON',async()=>{
  const before=hash(readFileSync(join(directory,'customers.sqlite')));
  expect((await invoke('bootstrap',[Buffer.from('[]'),Buffer.alloc(3999998,32)])).status).toBe(200);
  const excess=await invoke('bootstrap',[Buffer.alloc(4000001,32)]);expect(excess).toMatchObject({status:400,body:{error:'请求过大。'}});
  // The incomplete byte is flushed as a replacement character after the four
  // million decoded spaces; it must be counted and rejected before JSON parse.
  const tail=await invoke('bootstrap',[Buffer.alloc(4000000,32),Buffer.from([0xe4])]);expect(tail).toMatchObject({status:400,body:{error:'请求过大。'}});
  expect((await invoke('bootstrap',[Buffer.from('["'),Buffer.from([0xe4])])).status).toBe(400);
  expect(hash(readFileSync(join(directory,'customers.sqlite')))).toBe(before);
 },15000);
 it('retains local-request, origin, method and array-argument error boundaries',async()=>{
  const before=hash(readFileSync(join(directory,'customers.sqlite')));
  expect((await invoke('bootstrap',[Buffer.from('[]')],{})).status).toBe(403);
  expect((await invoke('bootstrap',[Buffer.from('[]')],{'x-studio-local-request':'1',origin:'http://different.invalid'})).status).toBe(403);
  expect((await invoke('utf8UnknownMethod',[Buffer.from('[]')])).status).toBe(400);
  expect((await invoke('bootstrap',[Buffer.from('{}')])).status).toBe(400);
  expect(hash(readFileSync(join(directory,'customers.sqlite')))).toBe(before);
 },15000);
});
