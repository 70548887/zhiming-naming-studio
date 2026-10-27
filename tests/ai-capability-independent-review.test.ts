import {afterEach,describe,expect,it} from 'vitest';
import {createServer,type Server} from 'node:http';
import dataset from '../data/dataset.json';
import {testStructuredNaming} from '../src/main/ai-capability';
import type {Dataset} from '../src/main/store';

const servers:Server[]=[];
afterEach(async()=>{await Promise.all(servers.splice(0).map(server=>new Promise<void>(resolve=>server.close(()=>resolve()))));});
async function endpoint(response:(request:{authorization?:string;body:any})=>{status?:number;raw?:string;content?:unknown;location?:string}){
 let calls=0;const captured:{authorization?:string;body:any}[]=[];
 const server=createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;const request={authorization:req.headers.authorization,body:JSON.parse(raw)};captured.push(request);calls++;
  const reply=response(request);res.statusCode=reply.status??200;if(reply.location)res.setHeader('Location',reply.location);res.setHeader('Content-Type','application/json');res.end(reply.raw??JSON.stringify({choices:[{message:{content:reply.content}}]}));
 });servers.push(server);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {url:`http://127.0.0.1:${(server.address() as {port:number}).port}/v1`,captured,calls:()=>calls};
}
const data=dataset as Dataset;
const valid={givenName:'安宁',themeIds:['peace'],citationIds:[]};

describe('independent real-HTTP capability review',()=>{
 it.each([false,true])('passes when a valid candidate is mixed with invalid shape and invalid local constraints (valid last:%s)',async(last)=>{
  const invalidShape={givenName:'宁安',themeIds:['not-in-theme-catalog'],citationIds:[]},invalidLocal={givenName:'安安',themeIds:[],citationIds:[]};
  const provider=await endpoint(()=>({content:JSON.stringify({candidates:last?[invalidShape,invalidLocal,valid]:[valid,invalidShape,invalidLocal]})}));
  const result=await testStructuredNaming({apiBaseUrl:provider.url,model:'independent-mixed',timeoutMs:5000,useAi:false},'FAKE-CAPABILITY-KEY',data);
  expect(result.status).toBe('passed');expect(result.checks).toEqual({transport:'passed',json:'passed',candidateShape:'passed',localConstraints:'passed'});expect(provider.calls()).toBe(1);
 });

 it('does not expose a credential echoed in malformed provider JSON through the capability error message',async()=>{
  const secret='KEY-CANARY';
  const provider=await endpoint(request=>({raw:request.authorization!.slice('Bearer '.length)}));
  const result=await testStructuredNaming({apiBaseUrl:provider.url,model:'independent-malformed',timeoutMs:5000,useAi:false},secret,data);
  expect(provider.calls()).toBe(1);expect(result.status).toBe('failed');
  expect(JSON.stringify(result)).not.toContain(secret);
 });

 it('does not follow a redirect or forward a credential to a second endpoint',async()=>{
  const destination=await endpoint(()=>({content:JSON.stringify({candidates:[valid]})}));
  const provider=await endpoint(()=>({status:307,location:destination.url+'/chat/completions'}));
  const result=await testStructuredNaming({apiBaseUrl:provider.url,model:'independent-redirect',timeoutMs:5000,useAi:false},'FAKE-REDIRECT-KEY',data);
  expect(result.status).toBe('failed');expect(destination.calls()).toBe(0);expect(result.checks.transport).toBe('failed');
 });
});
