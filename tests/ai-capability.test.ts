import {afterEach,describe,expect,it} from 'vitest';
import {createServer,type Server} from 'node:http';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {Store} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {testAI} from '../src/main/ai';
import type {AiSettings} from '../src/shared/types';
const dirs:string[]=[],stores:Store[]=[],servers:Server[]=[];
async function setup(mode:'valid'|'no-json-support'|'malformed'|'bad-shape'|'bad-constraints'|'http-error'='valid'){
 const captured:{body:any;auth:string|undefined}[]=[],server=createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;const b=JSON.parse(body);captured.push({body:b,auth:req.headers.authorization});
  if(mode==='http-error'||mode==='no-json-support'&&b.response_format){res.statusCode=mode==='http-error'?503:400;res.end('{}');return;}
  let content=b.response_format?JSON.stringify({candidates:[{givenName:'安宁',themeIds:['peace'],citationIds:[]},{givenName:'安安',themeIds:[],citationIds:[]}]}):'连接成功';
  if(b.response_format&&mode==='malformed')content='not-json';if(b.response_format&&mode==='bad-shape')content=JSON.stringify({candidates:[{givenName:'安宁',themeIds:['fake-theme'],citationIds:[]}]});if(b.response_format&&mode==='bad-constraints')content=JSON.stringify({candidates:[{givenName:'安安',themeIds:[],citationIds:[]}]});
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message:{content}}]}));
 });servers.push(server);await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${(server.address()as any).port}/v1`;
 const dir=mkdtempSync(join(tmpdir(),'capability-115-'));dirs.push(dir);const store=await new Store(dir,resolve('data'),resolve('node_modules/sql.js/dist/sql-wasm.wasm')).init();stores.push(store);let saved='',scope='';const service=new StudioService(store,{read:x=>x===scope?saved:'',write:(key,x)=>{saved=key;scope=x||'';}},false);
 const settings:AiSettings={apiBaseUrl:base,model:'fixture-model',timeoutMs:5000,useAi:false};return{captured,server,store,service,settings,dir};
}
afterEach(async()=>{await Promise.all(servers.splice(0).map(server=>new Promise<void>(resolve=>server.close(()=>resolve()))));stores.splice(0).forEach(s=>s.db.close());dirs.splice(0).forEach(d=>rmSync(d,{recursive:true,force:true}));});
describe('actual structured naming capability with fictional inputs', { timeout: 15_000 },()=>{
 it('uses the production JSON protocol/local constraints without saving settings, credentials or customer records',async()=>{
  const{captured,store,service,settings,dir}=await setup(),before=readFileSync(join(dir,'customers.sqlite'));
  const result=await service.testNamingCapability(settings,'FIXTURE-ONLY-KEY');expect(result.status).toBe('passed');expect(result.checks).toEqual({transport:'passed',json:'passed',candidateShape:'passed',localConstraints:'passed'});
  expect(captured).toHaveLength(1);expect(captured[0].body.response_format).toEqual({type:'json_object'});expect(captured[0].auth).toBe('Bearer FIXTURE-ONLY-KEY');expect(readFileSync(join(dir,'customers.sqlite')).equals(before)).toBe(true);expect(store.rows('profiles')).toEqual([]);expect(store.rows('sessions')).toEqual([]);
  const input=JSON.parse(captured[0].body.messages[1].content);for(const key of ['customerName','fatherName','motherName','birthDate','birthTime','birthPlace','notes'])expect(input).not.toHaveProperty(key);expect(input.preferences.requiredChars).toBe('安宁');expect(JSON.stringify(result)).not.toContain('FIXTURE-ONLY-KEY');
 });
 it('distinguishes ordinary text connectivity from a provider rejecting JSON requests',async()=>{
  const{service,settings}=await setup('no-json-support');await expect(testAI({...service.bootstrap().settings,...settings},'FAKE')).resolves.toContain('连接成功');const result=await service.testNamingCapability(settings,'FAKE');expect(result.status).toBe('failed');expect(result.checks.transport).toBe('failed');expect(result.message).toContain('400');expect(result.checks.json).toBe('not-run');
 });
 it.each([['malformed','json'],['bad-shape','candidateShape'],['bad-constraints','localConstraints']] as const)('reports %s at the failed stage after the actual bounded retry',async(mode,stage)=>{
  const{service,settings,captured}=await setup(mode);const result=await service.testNamingCapability(settings,'FAKE');expect(result.status).toBe('failed');expect(result.checks.transport).toBe('passed');expect(result.checks[stage]).toBe('failed');expect(captured).toHaveLength(2);
 });
 it('binds a saved key to its own normalized endpoint and never reuses it for a changed URL',async()=>{
  const{service,settings,captured}=await setup();service.saveAiSettings(settings,'SAVED-FIXTURE');expect((await service.testNamingCapability(settings)).status).toBe('passed');expect(captured).toHaveLength(1);
  const changed=await service.testNamingCapability({...settings,apiBaseUrl:settings.apiBaseUrl+'/other'});expect(changed.status).toBe('failed');expect(changed.checks.transport).toBe('not-run');expect(captured).toHaveLength(1);
 });
 it('validates draft settings without making requests or persisting invalid inputs',async()=>{
  const{service,settings,captured}=await setup();const result=await service.testNamingCapability({...settings,timeoutMs:0},'FAKE');expect(result.status).toBe('failed');expect(result.checks.transport).toBe('not-run');expect(captured).toHaveLength(0);
 });
});
