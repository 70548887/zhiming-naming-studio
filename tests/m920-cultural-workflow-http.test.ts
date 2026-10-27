import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createServer,type Server} from 'node:http';
import type {Socket} from 'node:net';
import {studioDevPlugin} from '../scripts/dev-plugin';
import {CULTURAL_WORKFLOW_METHODS} from '../src/shared/cultural-workflow-api';
import type {BirthProfile} from '../src/shared/types';
import type {CulturalProviderReply,CulturalProviderAnchor,CulturalProviderOptions,CulturalProviderPreview} from '../src/shared/qimen-cultural-provider-v1';

const temporaryRoot=fs.realpathSync.native(os.tmpdir()),root=path.resolve('.'),directory=fs.realpathSync.native(fs.mkdtempSync(path.join(temporaryRoot,'m920-real-http-')));
const priorEnvironment=process.env.NAMING_STUDIO_PREVIEW_DATA;
const evidence=path.resolve('.local/m920-http');
const profile:BirthProfile={id:'m920-http-owner',customerName:'M920隔离HTTP档案',surname:'林',surnamePinyin:'lín',fatherName:'',motherName:'',gender:'中性',calendar:'solar',birthDate:'2026-10-17',birthTime:'09:30',timeUnknown:false,leapMonth:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'M920合成HTTP资料'};
let server:Server,address='',port=0,anchor:CulturalProviderAnchor;
const sockets=new Set<Socket>(),calls:Array<{method:string;status:number}>=[];
type Middleware=(request:unknown,response:unknown,next:()=>void)=>Promise<void>;
async function post<T>(method:string,args:unknown[],headers:Record<string,string>={}):Promise<{status:number;body:T}>{
 const response=await fetch(address+'/__studio_api/'+method,{method:'POST',headers:{'Content-Type':'application/json','X-Studio-Local-Request':'1',...headers},body:JSON.stringify(args),redirect:'error',signal:AbortSignal.timeout(60000)});
 const body=await response.json() as T;calls.push({method,status:response.status});return{status:response.status,body};
}
function ok<T>(reply:CulturalProviderReply<T>):T{expect(reply.kind).toBe('ok');if(reply.kind!=='ok')throw Error('Real provider rejected: '+reply.message);return reply.value;}
beforeAll(async()=>{
 let middleware:Middleware|undefined;
 server=createServer((request,response)=>{void middleware!(request,response,()=>{response.statusCode=404;response.end();});});
 server.on('connection',socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));});
 const plugin=studioDevPlugin();await(plugin.configureServer as (server:unknown)=>Promise<void>)({config:{root},httpServer:server,middlewares:{use(value:Middleware){middleware=value;}}});
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const binding=server.address();if(!binding||typeof binding==='string')throw Error('Missing random loopback listener');port=binding.port;address='http://127.0.0.1:'+port;expect(port).not.toBe(5173);
 process.env.NAMING_STUDIO_PREVIEW_DATA=directory;
 try{expect((await post('bootstrap',[])).status).toBe(200);}finally{if(priorEnvironment===undefined)delete process.env.NAMING_STUDIO_PREVIEW_DATA;else process.env.NAMING_STUDIO_PREVIEW_DATA=priorEnvironment;}
 expect((await post('saveProfile',[profile])).status).toBe(200);
},60000);
afterAll(async()=>{
 if(server){server.closeIdleConnections();server.closeAllConnections();for(const socket of sockets)socket.destroy();await new Promise<void>(resolve=>server.close(()=>resolve()));await new Promise<void>(resolve=>setImmediate(resolve));}
 if(process.env.NAMING_STUDIO_PREVIEW_DATA===directory){if(priorEnvironment===undefined)delete process.env.NAMING_STUDIO_PREVIEW_DATA;else process.env.NAMING_STUDIO_PREVIEW_DATA=priorEnvironment;}
 const inspect=(target:string):void=>{const stat=fs.lstatSync(target),actual=fs.realpathSync.native(target),relative=path.relative(directory,actual);if(stat.isSymbolicLink()||actual!==target||relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw Error('Unsafe M920 HTTP cleanup');if(stat.isDirectory())for(const name of fs.readdirSync(target))inspect(path.join(target,name));};
 if(path.dirname(directory)!==temporaryRoot||!path.basename(directory).startsWith('m920-real-http-'))throw Error('Unexpected M920 HTTP directory');inspect(directory);fs.rmSync(directory,{recursive:true,force:false});
 fs.mkdirSync(evidence,{recursive:true});const file=path.join(evidence,'RESULT.json'),temporary=file+'.tmp';fs.writeFileSync(temporary,JSON.stringify({scope:'Real native loopback HTTP -> actual studioDevPlugin -> real StudioService/Store/provider; no source or provider mock',port,calls,ownedDirectoryRemoved:!fs.existsSync(directory),methods:CULTURAL_WORKFLOW_METHODS,limitations:['No native Electron window or UI acceptance.','Full save lifecycle is covered by the separate real Service suite.']},null,2)+'\n');fs.renameSync(temporary,file);
},30000);

describe('M920 actual loopback cultural workflow routing',()=>{
 it('preserves default compact2 and prepares a genuine profile anchor/options/preview without writing customer data',async()=>{
  const file=path.join(directory,'customers.sqlite'),before=fs.readFileSync(file);
  const capabilities=await post<{version:string;hasCulturalTables:boolean}>('getCulturalStorageCapabilities',[]);expect(capabilities).toMatchObject({status:200,body:{version:'customer-compact/2',hasCulturalTables:false}});
  anchor=ok((await post<CulturalProviderReply<CulturalProviderAnchor>>('prepareCulturalBirthAnchor',[{kind:'profile',profileId:profile.id}])).body);
  const options=ok((await post<CulturalProviderReply<CulturalProviderOptions>>('getCulturalCharacterOptions',[anchor.handle,{kind:'draft',draftId:'m920-http-draft',givenName:'安宁'}])).body);
  const preview=ok((await post<CulturalProviderReply<CulturalProviderPreview>>('previewCulturalComparison',[anchor.handle,{candidateTokens:[options.candidateToken],selections:options.positions.flatMap(row=>row.defaultEvidenceId?[{candidateToken:options.candidateToken,position:row.position,evidenceId:row.defaultEvidenceId}]:[])}])).body);
  expect(preview.previewHandle).not.toBe('');expect(preview.snapshot.snapshotDigest).toMatch(/^[a-f0-9]{64}$/);expect(preview).not.toHaveProperty('jsons');
  expect((await post('previewCulturalStorageMigration',[])).body).toMatchObject({from:'customer-compact/2',to:'customer-compact/3',writes:0});
  expect(fs.readFileSync(file)).toEqual(before);
 },60000);
 it('returns actual provider failure/Service errors and never exposes retained material or an automatic migration route',async()=>{
  const before=fs.readFileSync(path.join(directory,'customers.sqlite'));
  const invalid=await post<CulturalProviderReply<CulturalProviderAnchor>>('prepareCulturalBirthAnchor',[{kind:'profile',profileId:profile.id,snapshot:{approved:true}}]);expect(invalid.status).toBe(200);expect(invalid.body.kind).toBe('unavailable');
  const wrongHandle=await post<CulturalProviderReply<CulturalProviderOptions>>('getCulturalCharacterOptions',['forged-handle',{kind:'draft',draftId:'wrong',givenName:'安宁'}]);expect(wrongHandle.body.kind).toBe('unavailable');
  const extra=await post<{error:string}>('getCulturalStorageCapabilities',[{target:'customer-compact/3'}]);expect(extra.status).toBe(400);expect(extra.body.error).not.toBe('');
  for(const method of ['readMaterial','readMaterialBlob','verifyOwnedPreview','readAnchorMaterial','closeCulturalWorkflow']){const reply=await post<{error:string}>(method,[]);expect(reply.status).toBe(400);expect(reply.body.error).toContain('桌面应用');}
  const foreignOrigin=await fetch(address+'/__studio_api/getCulturalStorageCapabilities',{method:'POST',headers:{'X-Studio-Local-Request':'1',Origin:'https://foreign.invalid'},body:'[]'});expect(foreignOrigin.status).toBe(403);
  expect(fs.readFileSync(path.join(directory,'customers.sqlite'))).toEqual(before);
 },60000);
});
