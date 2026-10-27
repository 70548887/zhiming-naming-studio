import {describe,expect,it} from 'vitest';
import {snapshotApplicationJson} from '../src/main/project-application-v132-r2-json';

const invalid=/^PROJECT_APPLICATION_INPUT_INVALID(?::|$)/u;
const rejects=(value:unknown)=>expect(()=>snapshotApplicationJson(value)).toThrow(invalid);

function trackedProxy(target:object){
 const traps={get:0,getOwnPropertyDescriptor:0,ownKeys:0,getPrototypeOf:0};
 const proxy=new Proxy(target,{
  get(){traps.get++;throw new Error('unexpected proxy get');},
  getOwnPropertyDescriptor(){traps.getOwnPropertyDescriptor++;throw new Error('unexpected proxy descriptor');},
  ownKeys(){traps.ownKeys++;throw new Error('unexpected proxy ownKeys');},
  getPrototypeOf(){traps.getPrototypeOf++;throw new Error('unexpected proxy prototype');},
 });
 return{proxy,traps};
}

function expectDeepFrozen(value:unknown):void {
 if(value===null||typeof value!=='object')return;
 expect(Object.isFrozen(value)).toBe(true);
 for(const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))){
  if(Object.hasOwn(descriptor,'value'))expectDeepFrozen(descriptor.value);
 }
}

describe('M786 owned plain JSON input snapshots',()=>{
 it('accepts ordinary nested JSON and returns a detached deeply frozen snapshot',()=>{
  const source={
   nested:{nothing:null,enabled:true,disabled:false,number:1.25,words:['甲','乙','丙']},
   rows:[{value:'original'},[],[null,false,0,'']],
  };
  const expected=JSON.parse(JSON.stringify(source));
  const snapshot=snapshotApplicationJson(source) as typeof source;
  expect(snapshot).toEqual(expected);
  expect(snapshot).not.toBe(source);
  expect(snapshot.nested).not.toBe(source.nested);
  expect(snapshot.nested.words).not.toBe(source.nested.words);
  expect(snapshot.rows).not.toBe(source.rows);
  expect(snapshot.rows[0]).not.toBe(source.rows[0]);
  expectDeepFrozen(snapshot);
  source.nested.words[0]='changed';
  source.nested.enabled=false;
  source.rows.push({value:'later'});
  (source.rows[0] as {value:string}).value='changed';
  expect(snapshot).toEqual(expected);
  expect(Object.isFrozen(source)).toBe(false);
  expect(Object.isFrozen(source.nested)).toBe(false);
 });

 it('accepts null-prototype ordinary data without retaining caller references',()=>{
  const source=Object.assign(Object.create(null) as Record<string,unknown>,{text:'甲',nested:{ready:true}});
  const snapshot=snapshotApplicationJson({source}) as {source:Record<string,unknown>};
  expect(snapshot).toEqual({source:{text:'甲',nested:{ready:true}}});
  expect(snapshot.source).not.toBe(source);
  expectDeepFrozen(snapshot);
  source.text='changed';
  (source.nested as {ready:boolean}).ready=false;
  expect(snapshot.source).toEqual({text:'甲',nested:{ready:true}});
 });

 it.each(['object','array'] as const)('rejects a nested %s proxy before invoking any proxy trap',kind=>{
  const {proxy,traps}=trackedProxy(kind==='object'?{value:'unread'}:['unread']);
  rejects({outer:[{deeper:proxy}]});
  expect(traps).toEqual({get:0,getOwnPropertyDescriptor:0,ownKeys:0,getPrototypeOf:0});
 });

 it.each(['object','array'] as const)('rejects a revoked nested %s proxy with the stable application error',kind=>{
  const handle=Proxy.revocable(kind==='object'?{value:1}:[1],{});
  handle.revoke();
  rejects({outer:[{revoked:handle.proxy}]});
 });

 it('rejects a root proxy without invoking any proxy trap',()=>{
  const {proxy,traps}=trackedProxy({value:'unread'});
  rejects(proxy);
  expect(traps).toEqual({get:0,getOwnPropertyDescriptor:0,ownKeys:0,getPrototypeOf:0});
 });

 it('rejects nested getters without executing the getter',()=>{
  let calls=0;
  const nested=Object.defineProperty({},'value',{enumerable:true,get(){calls++;return 'unread';}});
  rejects({outer:[{nested}]});
  expect(calls).toBe(0);
 });

 it('rejects array element accessors without executing them',()=>{
  let calls=0;
  const nested:unknown[]=[];
  Object.defineProperty(nested,'0',{enumerable:true,configurable:true,get(){calls++;return 'unread';}});
  rejects({outer:{nested}});
  expect(calls).toBe(0);
 });

 it('does not invoke nested toJSON methods or toJSON accessors',()=>{
  let methodCalls=0,getterCalls=0;
  rejects({outer:[{toJSON(){methodCalls++;return {forged:true};}}]});
  const nested=Object.defineProperty({},'toJSON',{enumerable:true,get(){getterCalls++;return ()=>({forged:true});}});
  rejects({outer:{nested}});
  expect(methodCalls).toBe(0);
  expect(getterCalls).toBe(0);
 });

 it.each([NaN,Infinity,-Infinity])('rejects non-finite numbers, including nested %s',value=>{
  rejects(value);
  rejects({outer:[{value}]});
 });

 it.each([undefined,BigInt(1),Symbol('value'),()=>1])('rejects non-JSON values at every depth',value=>{
  rejects(value);
  rejects({outer:[value]});
 });

 it('rejects sparse arrays even when a hole has an inherited value',()=>{
  rejects({nested:new Array(1)});
  const sparse=['first',,'third'];
  rejects({nested:sparse});
  const inherited=Object.create(Array.prototype) as unknown[];
  Object.defineProperty(inherited,'0',{value:'inherited',enumerable:true});
  const custom=Object.setPrototypeOf(new Array(1),inherited);
  rejects({nested:custom});
 });

 it('rejects hidden own metadata on objects and arrays',()=>{
  const hidden=Object.defineProperty({visible:true},'hidden',{value:'unread',enumerable:false});
  rejects({outer:[hidden]});
  const array=Object.defineProperty(['visible'],'hidden',{value:'unread',enumerable:false});
  rejects({outer:{array}});
 });

 it('rejects own symbol properties on objects and arrays',()=>{
  const key=Symbol('hidden');
  rejects({outer:[{[key]:'unread'}]});
  const array=['visible'];
  Object.defineProperty(array,key,{value:'unread',enumerable:true});
  rejects({outer:{array}});
 });

 it('rejects custom object and array prototypes',()=>{
  rejects({outer:Object.create({inherited:'unread'})});
  rejects({outer:new Date('2026-10-25T00:00:00Z')});
  rejects({outer:Object.setPrototypeOf(['value'],Object.create(Array.prototype))});
 });

 it('rejects enumerable extra array properties',()=>{
  const array=['value'];
  Object.defineProperty(array,'extra',{value:'unread',enumerable:true});
  rejects({nested:array});
 });

 it('rejects object and array cycles with the stable application error',()=>{
  const object:{self?:unknown}={};object.self=object;
  rejects({outer:[object]});
  const array:unknown[]=[];array.push({array});
  rejects({outer:array});
 });

 it('rejects an excessive nesting depth before native recursion failure',()=>{
  const source:{next?:unknown}={};
  let cursor=source;
  for(let index=0;index<1000;index++){
   const next:{next?:unknown}={};cursor.next=next;cursor=next;
  }
  rejects(source);
 });

 it('rejects a dense array above the fixed 100000-element limit',()=>{
  const dense=Array.from({length:100001},()=>0);
  rejects({nested:dense});
 });
});
