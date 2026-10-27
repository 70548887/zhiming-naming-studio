import {describe,expect,it} from 'vitest';
import {captureCandidate2ReviewInput} from '../src/main/candidate2-review-input';
import type {Candidate2ReviewChanges} from '../src/shared/candidate2-review-api';

/** Shape-only raw review capture. These tests confer no native candidate order,
 * current-session identity, CAS, save permission or successful review proof. */
const SESSION='c2s_0123456789abcdef0123456789abcdef';
const TOKEN='94700000-0000-4000-8000-000000000001';
const candidateKeys=['id','meaning','reason','traditionalReason','reviewNote','favorite'] as const;
const textKeys=['meaning','reason','traditionalReason','reviewNote'] as const;
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
function changes():Candidate2ReviewChanges {
 return{reviewNote:'  原审阅𠮷😀  ',preferredElements:['水','木'],candidates:[
  {id:'candidate-z',meaning:'  寓意一  ',reason:'  推荐一  ',traditionalReason:'  依据一  ',reviewNote:'  注一  ',favorite:false},
  {id:'candidate-a',meaning:'',reason:' ',traditionalReason:'  ',reviewNote:'',favorite:true},
 ]};
}
function frozen(value:unknown):void {
 if(value===null||typeof value!=='object')return;expect(Object.isFrozen(value)).toBe(true);
 for(const descriptor of Object.values(Object.getOwnPropertyDescriptors(value)))if(Object.hasOwn(descriptor,'value'))frozen(descriptor.value);
}
function proxy(target:object){
 const traps={get:0,ownKeys:0,getOwnPropertyDescriptor:0,getPrototypeOf:0};
 const value=new Proxy(target,{
  get(){traps.get++;throw Error('caller get');},ownKeys(){traps.ownKeys++;throw Error('caller ownKeys');},
  getOwnPropertyDescriptor(){traps.getOwnPropertyDescriptor++;throw Error('caller descriptor');},getPrototypeOf(){traps.getPrototypeOf++;throw Error('caller prototype');},
 });return{value,traps};
}

describe('M947 pure candidate.2 review input capture',{timeout:30000},()=>{
 it('keeps all four original fields, review text, element order and candidate order without authority',()=>{
  const patch=changes(),before=clone(patch),captured=captureCandidate2ReviewInput(SESSION,patch,7,TOKEN);
  expect(captured).toEqual({sessionId:SESSION,changes:before,expectedRevision:7,expectedToken:TOKEN});
  expect(Object.keys(captured).sort()).toEqual(['sessionId','changes','expectedRevision','expectedToken'].sort());
  expect(captured.changes.candidates.map(candidate=>candidate.id)).toEqual(['candidate-z','candidate-a']);
  expect(captured.changes.preferredElements).toEqual(['水','木']);expect(patch).toEqual(before);
  for(const key of ['status','store','session','authority','canSave','generation','saved'])expect(captured).not.toHaveProperty(key);
  frozen(captured);
 });
 it('returns detached deeply frozen arrays and nested rows while leaving callers mutable',()=>{
  const patch=changes(),before=clone(patch),captured=captureCandidate2ReviewInput(SESSION,patch,0,TOKEN);
  expect(captured.changes).not.toBe(patch);expect(captured.changes.candidates).not.toBe(patch.candidates);
  expect(captured.changes.candidates[0]).not.toBe(patch.candidates[0]);expect(captured.changes.preferredElements).not.toBe(patch.preferredElements);
  patch.reviewNote='changed';patch.preferredElements.push('火');patch.candidates.reverse();patch.candidates[0].meaning='changed';
  expect(captured.changes).toEqual(before);frozen(captured);expect(Object.isFrozen(patch)).toBe(false);
 });
 it('does not assert native candidate identity or reorder shape-valid raw candidate IDs',()=>{
  const patch=changes();patch.candidates.reverse();patch.candidates[0].id='  raw caller candidate-id  ';
  expect(captureCandidate2ReviewInput(SESSION,patch,1,TOKEN).changes).toEqual(patch);
 });
 it('accepts the recorded maximum text lengths, 8192-character candidate ID and 100 rows',()=>{
  const patch=changes();patch.reviewNote='a'.repeat(100000);
  const row={id:'i'.repeat(8192),meaning:'a'.repeat(100000),reason:'a'.repeat(100000),traditionalReason:'a'.repeat(100000),reviewNote:'a'.repeat(100000),favorite:false};
  patch.candidates=[row];expect(captureCandidate2ReviewInput(SESSION,patch,1,TOKEN).changes).toEqual(patch);
  const bounded=changes();bounded.candidates=Array.from({length:100},(_,index)=>({...bounded.candidates[0],id:'candidate-'+index}));
  expect(captureCandidate2ReviewInput(SESSION,bounded,1,TOKEN).changes.candidates).toHaveLength(100);
 });
 it('accepts five unique legal draft elements in their original order, including an empty draft',()=>{
  const patch=changes();patch.preferredElements=['水','金','土','火','木'];
  expect(captureCandidate2ReviewInput(SESSION,patch,1,TOKEN).changes.preferredElements).toEqual(patch.preferredElements);
  patch.preferredElements=[];expect(captureCandidate2ReviewInput(SESSION,patch,1,TOKEN).changes.preferredElements).toEqual([]);
 });
 it('accepts revision zero and MAX_SAFE_INTEGER minus one without defaulting',()=>{
  expect(captureCandidate2ReviewInput(SESSION,changes(),0,TOKEN).expectedRevision).toBe(0);
  expect(captureCandidate2ReviewInput(SESSION,changes(),Number.MAX_SAFE_INTEGER-1,TOKEN).expectedRevision).toBe(Number.MAX_SAFE_INTEGER-1);
 });
 it.each([1,2,3,4,5])('accepts an explicit UUID version %s token unchanged',version=>{
  const token='94700000-0000-'+version+'000-8000-000000000001';
  expect(captureCandidate2ReviewInput(SESSION,changes(),1,token).expectedToken).toBe(token);
 });
 it.each([undefined,null,'',23,{},'session-id','c2s_'+'A'.repeat(32),' '+SESSION])('rejects malformed session ID %j',id=>{
  expect(()=>captureCandidate2ReviewInput(id,changes(),1,TOKEN)).toThrow();
 });
 it.each([undefined,null,'0',-1,.5,NaN,Infinity,Number.MAX_SAFE_INTEGER])('rejects invalid explicit revision %j',revision=>{
  expect(()=>captureCandidate2ReviewInput(SESSION,changes(),revision,TOKEN)).toThrow();
 });
 it.each([undefined,null,'',23,'token','94700000-0000-0000-8000-000000000001','94700000-0000-6000-8000-000000000001','94700000-0000-4000-0000-000000000001'])('rejects missing or malformed explicit token %j',token=>{
  expect(()=>captureCandidate2ReviewInput(SESSION,changes(),1,token)).toThrow();
 });
 it('enforces exact four arguments and never executes a fifth callback',()=>{
  const capture=captureCandidate2ReviewInput as (...args:unknown[])=>unknown;let callbacks=0;const callback=()=>{callbacks++;};
  expect(capture.length).toBe(4);
  for(const args of [[],[SESSION],[SESSION,changes()],[SESSION,changes(),1],[SESSION,changes(),1,TOKEN,undefined],[SESSION,changes(),1,TOKEN,callback]])expect(()=>capture(...args)).toThrow();
  expect(callbacks).toBe(0);
 });
 it.each(['reviewNote','preferredElements','candidates'] as const)('requires the explicit review patch field %s',key=>{
  const patch=clone(changes()) as unknown as Record<string,unknown>;delete patch[key];expect(()=>captureCandidate2ReviewInput(SESSION,patch,1,TOKEN)).toThrow();
 });
 it.each(candidateKeys)('requires the exact candidate review field %s',key=>{
  const patch=clone(changes()) as any;delete patch.candidates[0][key];expect(()=>captureCandidate2ReviewInput(SESSION,patch,1,TOKEN)).toThrow();
 });
 it.each(['analysis','sourceSnapshot','candidate2Naming','mechanics','owner'])('rejects original fact or authority patch field %s',key=>{
  expect(()=>captureCandidate2ReviewInput(SESSION,{...changes(),[key]:{claimed:true}},1,TOKEN)).toThrow();
 });
 it.each(['evaluation','characters','citations','warnings','generation'])('rejects original candidate fact field %s',key=>{
  const patch=changes();(patch.candidates[0] as unknown as Record<string,unknown>)[key]={claimed:true};expect(()=>captureCandidate2ReviewInput(SESSION,patch,1,TOKEN)).toThrow();
 });
 it.each([23,null,'a'.repeat(100001)])('rejects invalid or overlong patch reviewNote',reviewNote=>{
  expect(()=>captureCandidate2ReviewInput(SESSION,{...changes(),reviewNote},1,TOKEN)).toThrow();
 });
 it.each(textKeys)('rejects nonstring and overlong candidate text %s',key=>{
  const patch=clone(changes()) as any;patch.candidates[0][key]=23;expect(()=>captureCandidate2ReviewInput(SESSION,patch,1,TOKEN)).toThrow();
  patch.candidates[0][key]='a'.repeat(100001);expect(()=>captureCandidate2ReviewInput(SESSION,patch,1,TOKEN)).toThrow();
 });
 it.each([
  {label:'empty ID',change:{id:''}},{label:'nonstring ID',change:{id:23}},
  {label:'overlong ID',change:{id:'i'.repeat(8193)}},{label:'nonboolean favorite',change:{favorite:'false'}},
 ])('rejects malformed candidate $label',({change})=>{
  const patch=changes();Object.assign(patch.candidates[0],change);expect(()=>captureCandidate2ReviewInput(SESSION,patch,1,TOKEN)).toThrow();
 });
 it.each([undefined,null,{},[],Array.from({length:101},()=>({id:'candidate',meaning:'',reason:'',traditionalReason:'',reviewNote:'',favorite:false}))].map(candidates=>({candidates})))('rejects absent, nonarray or out-of-bounds candidate list',({candidates})=>{
  expect(()=>captureCandidate2ReviewInput(SESSION,{...changes(),candidates},1,TOKEN)).toThrow();
 });
 it.each([undefined,null,'水',['水','水'],['风'],['木','火','土','金','水','木']].map(preferredElements=>({preferredElements})))('rejects malformed manual draft elements',({preferredElements})=>{
  expect(()=>captureCandidate2ReviewInput(SESSION,{...changes(),preferredElements},1,TOKEN)).toThrow();
 });
 it('rejects explicit undefined at root, optional-looking fields and nested candidate values',()=>{
  expect(()=>captureCandidate2ReviewInput(SESSION,undefined,1,TOKEN)).toThrow();
  const patch=clone(changes()) as any;patch.candidates[0].favorite=undefined;expect(()=>captureCandidate2ReviewInput(SESSION,patch,1,TOKEN)).toThrow();
  expect(()=>captureCandidate2ReviewInput(SESSION,{...changes(),source:undefined},1,TOKEN)).toThrow();
 });
 it('does not invoke getters or toJSON while rejecting a hostile patch tree',()=>{
  let getters=0,serializers=0;const patch=Object.defineProperty(changes(),'reviewNote',{enumerable:true,get(){getters++;return '';}});
  expect(()=>captureCandidate2ReviewInput(SESSION,patch,1,TOKEN)).toThrow();
  const nested=changes();Object.defineProperty(nested.candidates[0],'meaning',{enumerable:true,get(){getters++;return '';}});
  expect(()=>captureCandidate2ReviewInput(SESSION,nested,1,TOKEN)).toThrow();
  expect(()=>captureCandidate2ReviewInput(SESSION,{...changes(),toJSON(){serializers++;return changes();}},1,TOKEN)).toThrow();
  expect(getters).toBe(0);expect(serializers).toBe(0);
 });
 it('rejects custom prototypes, hidden properties, symbols, cycles and sparse arrays',()=>{
  expect(()=>captureCandidate2ReviewInput(SESSION,Object.assign(Object.create({inherited:true}),changes()),1,TOKEN)).toThrow();
  expect(()=>captureCandidate2ReviewInput(SESSION,Object.defineProperty(changes(),'hidden',{value:true}),1,TOKEN)).toThrow();
  expect(()=>captureCandidate2ReviewInput(SESSION,{...changes(),[Symbol('extra')]:true},1,TOKEN)).toThrow();
  const cyclic=changes() as any;cyclic.candidates[0].meaning=cyclic;expect(()=>captureCandidate2ReviewInput(SESSION,cyclic,1,TOKEN)).toThrow();
  expect(()=>captureCandidate2ReviewInput(SESSION,{...changes(),candidates:new Array(1)},1,TOKEN)).toThrow();
 });
 it.each(['session','patch','candidate','elements'] as const)('rejects a %s Proxy without any traps',where=>{
  const target=where==='candidate'?changes().candidates[0]:where==='elements'?['水']:changes();const hostile=proxy(target);
  const patch=where==='patch'?hostile.value:where==='candidate'?{...changes(),candidates:[hostile.value]}:where==='elements'?{...changes(),preferredElements:hostile.value}:changes();
  expect(()=>captureCandidate2ReviewInput(where==='session'?hostile.value:SESSION,patch,1,TOKEN)).toThrow();
  expect(hostile.traps).toEqual({get:0,ownKeys:0,getOwnPropertyDescriptor:0,getPrototypeOf:0});
 });
 it('rejects a revoked nested candidate Proxy',()=>{
  const revoked=Proxy.revocable(changes().candidates[0],{});revoked.revoke();
  expect(()=>captureCandidate2ReviewInput(SESSION,{...changes(),candidates:[revoked.proxy]},1,TOKEN)).toThrow();
 });
});
