import {describe,expect,it} from 'vitest';
import {captureCandidate2HistoryRestoreInput} from '../src/main/candidate2-history-restore-input';

/** Pure shape capture only. A canonical SQL revision ID does not establish
 * history ownership, native SQL origin, current CAS or restore permission.
 * No Store, history fixture, snapshot replay or saved result is mocked here. */
const SESSION='c2s_0123456789abcdef0123456789abcdef';
const TOKEN='977abcde-abcd-4abc-8abc-abcdef012345';
const values=():unknown[]=>[SESSION,'42',7,TOKEN];
function frozen(value:unknown):void {
 if(value===null||typeof value!=='object')return;
 expect(Object.isFrozen(value)).toBe(true);
 for(const descriptor of Object.values(Object.getOwnPropertyDescriptors(value)))if(Object.hasOwn(descriptor,'value'))frozen(descriptor.value);
}
function hostileProxy(target:object){
 const traps={get:0,ownKeys:0,getOwnPropertyDescriptor:0,getPrototypeOf:0};
 const proxy=new Proxy(target,{
  get(){traps.get++;throw Error('unexpected caller get');},
  ownKeys(){traps.ownKeys++;throw Error('unexpected caller ownKeys');},
  getOwnPropertyDescriptor(){traps.getOwnPropertyDescriptor++;throw Error('unexpected caller descriptor');},
  getPrototypeOf(){traps.getPrototypeOf++;throw Error('unexpected caller prototype');},
 });return{proxy,traps};
}

describe('M977 pure candidate.2 history restore input capture',{timeout:30000},()=>{
 it('keeps exact four raw scalar values with no status, snapshot facts or authority',()=>{
  const result=captureCandidate2HistoryRestoreInput(SESSION,'42',7,TOKEN);
  expect(result).toEqual({sessionId:SESSION,revisionId:'42',expectedRevision:7,expectedToken:TOKEN});
  expect(Object.keys(result).sort()).toEqual(['sessionId','revisionId','expectedRevision','expectedToken'].sort());
  for(const key of ['status','authority','canSave','generationAuthority','session','snapshot','history','store','saved','changes'])expect(result).not.toHaveProperty(key);
  frozen(result);
 });

 it('owns an independent frozen result and is unaffected by caller argument replacement',()=>{
  const input=values(),before=[...input];
  const result=Reflect.apply(captureCandidate2HistoryRestoreInput,undefined,input);
  input[0]='caller-changed';input[1]='99';input[2]=8;input[3]='caller-token';
  expect(result).toEqual({sessionId:before[0],revisionId:before[1],expectedRevision:before[2],expectedToken:before[3]});
  expect(result).not.toBe(input);frozen(result);expect(Object.isFrozen(input)).toBe(false);
 });

 it('accepts canonical positive SQL IDs through MAX_SAFE_INTEGER and explicit CAS zero or MAX minus one',()=>{
  for(const revisionId of ['1','42',String(Number.MAX_SAFE_INTEGER)]){
   const result=captureCandidate2HistoryRestoreInput(SESSION,revisionId,0,TOKEN);
   expect(result.revisionId).toBe(revisionId);expect(typeof result.revisionId).toBe('string');expect(result.expectedRevision).toBe(0);
  }
  expect(captureCandidate2HistoryRestoreInput(SESSION,'1',Number.MAX_SAFE_INTEGER-1,TOKEN).expectedRevision).toBe(Number.MAX_SAFE_INTEGER-1);
 });

 it.each([1,2,3,4,5])('preserves an explicit mixed-case UUID version %s token without normalization',version=>{
  const token='977ABCDE-ABCD-'+version+'ABC-8ABC-ABCDEF012345';
  expect(captureCandidate2HistoryRestoreInput(SESSION,'1',0,token).expectedToken).toBe(token);
 });

 it.each([
  {label:'undefined',value:undefined},{label:'null',value:null},{label:'empty',value:''},
  {label:'non-C2 ID',value:'session-42'},{label:'uppercase hex',value:'c2s_'+'A'.repeat(32)},
  {label:'surrounding whitespace',value:' '+SESSION+' '},{label:'overlong ID',value:'c2s_'+'a'.repeat(33)},
 ])('rejects $label session identity without trimming or accepting old session shape',({value})=>{
  expect(()=>captureCandidate2HistoryRestoreInput(value,'1',0,TOKEN)).toThrow();
 });

 it.each([
  {label:'undefined',value:undefined},{label:'null',value:null},{label:'numeric SQL ID',value:42},
  {label:'zero',value:'0'},{label:'leading zero',value:'042'},{label:'negative decimal',value:'-1'},
  {label:'explicit plus',value:'+1'},{label:'exponent',value:'1e2'},{label:'decimal point',value:'1.0'},
  {label:'whitespace',value:' 42 '},{label:'blank',value:''},{label:'above MAX_SAFE',value:'9007199254740992'},
  {label:'long decimal',value:'1'.repeat(1001)},{label:'key object',value:{revisionId:'42'}},
 ])('rejects $label revision ID instead of coercing it into a native history key',({value})=>{
  expect(()=>captureCandidate2HistoryRestoreInput(SESSION,value,0,TOKEN)).toThrow();
 });

 it.each([
  {label:'undefined',value:undefined},{label:'null',value:null},{label:'string',value:'0'},
  {label:'negative',value:-1},{label:'fractional',value:.5},{label:'MAX_SAFE',value:Number.MAX_SAFE_INTEGER},
  {label:'non-finite',value:Infinity},
 ])('requires an explicit bounded numeric current CAS revision: $label',({value})=>{
  expect(()=>captureCandidate2HistoryRestoreInput(SESSION,'1',value,TOKEN)).toThrow();
 });

 it.each([
  {label:'undefined',value:undefined},{label:'null',value:null},{label:'nonstring',value:42},
  {label:'malformed',value:'token'},{label:'unsupported version',value:'977abcde-abcd-6abc-8abc-abcdef012345'},
 ])('rejects $label token instead of defaulting expected identity',({value})=>{
  expect(()=>captureCandidate2HistoryRestoreInput(SESSION,'1',0,value)).toThrow();
 });

 it('enforces exactly four slots, including a fifth undefined or authority object',()=>{
  const capture=captureCandidate2HistoryRestoreInput as (...args:unknown[])=>unknown;
  expect(capture.length).toBe(4);
  for(const input of [[],[SESSION],[SESSION,'1'],[SESSION,'1',0],[...values(),undefined],[...values(),{owner:{claimed:true},snapshot:{saved:true}}]])expect(()=>capture(...input)).toThrow();
 });

 it('rejects caller full snapshots in place of either scalar key without calling hooks',()=>{
  let serializations=0,callbacks=0;
  const snapshot={id:SESSION,revisionId:'1',session:{generation:{claimed:true}},toJSON(){serializations++;return SESSION;}};
  expect(()=>captureCandidate2HistoryRestoreInput(snapshot,'1',0,TOKEN)).toThrow();
  expect(()=>captureCandidate2HistoryRestoreInput(SESSION,snapshot,0,TOKEN)).toThrow();
  const callback=()=>{callbacks++;return '1';};
  expect(()=>captureCandidate2HistoryRestoreInput(SESSION,callback,0,TOKEN)).toThrow();
  expect(serializations).toBe(0);expect(callbacks).toBe(0);
 });

 it('rejects explicit undefined at every root slot and inside an invalid caller object',()=>{
  for(let index=0;index<4;index++){
   const input=values();input[index]=undefined;expect(()=>Reflect.apply(captureCandidate2HistoryRestoreInput,undefined,input)).toThrow();
  }
  expect(()=>captureCandidate2HistoryRestoreInput(SESSION,{revisionId:undefined},0,TOKEN)).toThrow();
 });

 it('captures the whole tree before shape checks without invoking nested getters or toJSON',()=>{
  let getters=0,serializations=0;
  const revision=Object.defineProperty({},'nested',{enumerable:true,get(){getters++;return '1';}});
  expect(()=>captureCandidate2HistoryRestoreInput(SESSION,revision,0,TOKEN)).toThrow();
  const token={nested:{toJSON(){serializations++;return TOKEN;}}};
  expect(()=>captureCandidate2HistoryRestoreInput(SESSION,'1',0,token)).toThrow();
  expect(getters).toBe(0);expect(serializations).toBe(0);
 });

 it('rejects hidden, symbol, custom-prototype and cyclic metadata without treating it as a history key',()=>{
  const hidden=Object.defineProperty({revisionId:'1'},'hidden',{value:true});
  const symbol={revisionId:'1',[Symbol('authority')]:true};
  const custom=Object.assign(Object.create({owner:'caller'}),{revisionId:'1'});
  const cyclic:{revisionId?:unknown}={};cyclic.revisionId=cyclic;
  for(const input of [hidden,symbol,custom,cyclic])expect(()=>captureCandidate2HistoryRestoreInput(SESSION,input,0,TOKEN)).toThrow();
 });

 it.each([0,1,2,3])('rejects a Proxy in scalar slot %s before every caller trap',index=>{
  const {proxy,traps}=hostileProxy({value:values()[index]}),input=values();input[index]=proxy;
  expect(()=>Reflect.apply(captureCandidate2HistoryRestoreInput,undefined,input)).toThrow();
  expect(traps).toEqual({get:0,ownKeys:0,getOwnPropertyDescriptor:0,getPrototypeOf:0});
 });

 it('rejects a revoked nested Proxy with a stable ordinary-JSON error',()=>{
  const revoked=Proxy.revocable({value:'1'},{});revoked.revoke();
  expect(()=>captureCandidate2HistoryRestoreInput(SESSION,{nested:revoked.proxy},0,TOKEN)).toThrow(/^PROJECT_APPLICATION_INPUT_INVALID:/u);
 });

 it('does not execute later caller getters even when an earlier scalar ID is already invalid',()=>{
  let getters=0;
  const token=Object.defineProperty({},'token',{enumerable:true,get(){getters++;return TOKEN;}});
  expect(()=>captureCandidate2HistoryRestoreInput('invalid-session','1',0,token)).toThrow(/^PROJECT_APPLICATION_INPUT_INVALID:/u);
  expect(getters).toBe(0);
 });
});
