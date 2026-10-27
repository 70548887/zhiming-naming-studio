import {createCmnPreviewProject} from './helpers/cmn-preview-project';
import {EventEmitter} from 'node:events';
import {afterAll,beforeAll,describe,expect,it,vi} from 'vitest';
import {createServer,type Server} from 'node:http';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {studioDevPlugin} from '../scripts/dev-plugin';
import {OFFICIAL_NAME_POPULARITY_DATASET_ID,assertOfficialNamePopularityCatalog} from '../src/shared/official-name-popularity';

let server:Server,address:string,directory:string;
const post=(args:unknown[]=[],headers:Record<string,string>={})=>fetch(address+'/__studio_api/getOfficialNamePopularity',{method:'POST',headers:{'Content-Type':'application/json','X-Studio-Local-Request':'1',...headers},body:JSON.stringify(args)});
let previewProject:ReturnType<typeof createCmnPreviewProject>|undefined;const previewHttp=new EventEmitter();
beforeAll(async()=>{previewProject=createCmnPreviewProject();directory=mkdtempSync(join(tmpdir(),'official-popularity-http-'));vi.stubEnv('NAMING_STUDIO_PREVIEW_DATA',directory);let middleware:any;const plugin=studioDevPlugin();await (plugin.configureServer as Function)({config:{root:previewProject.root},httpServer:previewHttp,middlewares:{use(fn:any){middleware=fn;}}});server=createServer((request,response)=>void middleware(request,response,()=>{response.statusCode=404;response.end();}));await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));address='http://127.0.0.1:'+(server.address() as {port:number}).port;});
afterAll(async()=>{previewHttp.emit('close');await new Promise(r=>setImmediate(r));previewProject?.close();await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));vi.unstubAllEnvs();rmSync(directory,{recursive:true,force:true});});

describe('actual local-preview catalog transport', { timeout: 15_000 },()=>{
 it('returns the complete fixed publication through the approved read-only endpoint',async()=>{
  const response=await post();expect(response.status).toBe(200);const catalog=await response.json();expect(()=>assertOfficialNamePopularityCatalog(catalog)).not.toThrow();expect(catalog.datasetId).toBe(OFFICIAL_NAME_POPULARITY_DATASET_ID);expect(catalog.tables.flatMap((table:any)=>table.rows)).toHaveLength(20);
  const before=readFileSync(join(directory,'customers.sqlite'));await post();expect(readFileSync(join(directory,'customers.sqlite')).equals(before)).toBe(true);
 });
 it('rejects arguments, cross-origin calls and missing local-request headers',async()=>{
  const extra=await post([{}]);expect(extra.status).toBe(400);expect((await extra.json()).error).toContain('不接受查询参数');expect((await post([],{Origin:'https://example.invalid'})).status).toBe(403);
  expect((await fetch(address+'/__studio_api/getOfficialNamePopularity',{method:'POST',body:'[]'})).status).toBe(403);
 });
});
