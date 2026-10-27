import {createCmnPreviewProject} from './helpers/cmn-preview-project';
import {EventEmitter} from 'node:events';
import {afterAll,beforeAll,describe,expect,it,vi} from 'vitest';
import {createServer,type Server} from 'node:http';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {studioDevPlugin} from '../scripts/dev-plugin';

let server:Server,address:string,directory:string;
const post=async(method:string,args:unknown[],headers:Record<string,string>={})=>fetch(address+'/__studio_api/'+method,{method:'POST',headers:{'Content-Type':'application/json','X-Studio-Local-Request':'1',...headers},body:JSON.stringify(args)});
let previewProject:ReturnType<typeof createCmnPreviewProject>|undefined;const previewHttp=new EventEmitter();
beforeAll(async()=>{previewProject=createCmnPreviewProject();directory=mkdtempSync(join(tmpdir(),'classics-preview-'));vi.stubEnv('NAMING_STUDIO_PREVIEW_DATA',directory);let middleware:any;const plugin=studioDevPlugin();await (plugin.configureServer as Function)({config:{root:previewProject.root},httpServer:previewHttp,middlewares:{use(fn:any){middleware=fn;}}});server=createServer((req,res)=>void middleware(req,res,()=>{res.statusCode=404;res.end();}));await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));address='http://127.0.0.1:'+(server.address() as {port:number}).port;});
afterAll(async()=>{previewHttp.emit('close');await new Promise(r=>setImmediate(r));previewProject?.close();await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));vi.unstubAllEnvs();rmSync(directory,{recursive:true,force:true});});

describe('actual preview HTTP transport for classic library', { timeout: 15_000 },()=>{
 it('preserves an omitted middle book filter on page two through the browser bridge JSON representation',async()=>{
  const response=await post('searchClassics',['',undefined,2]);expect(response.status).toBe(200);const body=await response.json();expect(body.page).toBe(2);expect(body.total).toBe(123);expect(body.hits).toHaveLength(20);expect(body).not.toHaveProperty('bookId');
  const search=await post('searchClassics',['木',undefined,2]);expect(search.status).toBe(200);const matches=await search.json();expect(matches.page).toBe(2);expect(matches.total).toBeGreaterThan(20);expect(matches.hits).toHaveLength(20);
 });
 it('filters a real book and reads its full section through the approved routes',async()=>{
  const response=await post('searchClassics',['通关','classic-ditian-2600158',1]);const body=await response.json();expect(response.status).toBe(200);expect(body.hits.length).toBeGreaterThan(0);expect(body.hits.every((hit:any)=>hit.bookId==='classic-ditian-2600158')).toBe(true);
  const read=await post('readClassicSection',[body.hits[0].sectionId]),section=await read.json();expect(read.status).toBe(200);expect(section.rawText).toContain('通关');expect(section.source.id).toBe('classics-ditian-2600158-fixed');expect([...section.rawText].length).toBe(section.end-section.start);
 });
 it('keeps validation and local request guards on both new endpoints',async()=>{
  for(const [method,args]of [['searchClassics',['木','missing',1]],['searchClassics',['木',null,0]],['readClassicSection',['../../customers.sqlite']]]as const){const response=await post(method,[...args]);expect(response.status).toBe(400);expect((await response.json()).error).toBeTruthy();}
  const cross=await post('searchClassics',[''],{Origin:'https://example.invalid'});expect(cross.status).toBe(403);
  const noHeader=await fetch(address+'/__studio_api/readClassicSection',{method:'POST',body:'[]'});expect(noHeader.status).toBe(403);
 });
});
