import {describe,expect,it,vi} from 'vitest';
import {StudioService} from '../src/main/service';
import {Store} from '../src/main/store';

/** Real Service/Store modules, no module or Store.prototype mocks, no native
 * init/restore/save. Malicious instance methods must stay uncalled. Valid refs
 * must fail the captured native Store receiver brand, never return fake saved
 * content. Cross-session, no-change and CAS success need real native probes. */
const SESSION='c2s_0123456789abcdef0123456789abcdef',TOKEN='977abcde-abcd-4abc-8abc-abcdef012345';
const args=():unknown[]=>[SESSION,'42',7,TOKEN];
const inputFailure=/CANDIDATE2_HISTORY_INPUT_INVALID|PROJECT_APPLICATION_INPUT_INVALID/u;
const brandFailure=/private (?:member|field|method)|private.*(?:brand|class)|Receiver must be an instance of class Store|Cannot access private|原生\s*Store.*(?:身份|接收)|native\s+Store.*(?:brand|receiver)/iu;
function boundary(kind:'plain'|'same-prototype'|'proxy'){
 const fake={schema:'M977_MALICIOUS_FAKE_RESTORED',session:{id:SESSION}};
 const restore=vi.fn(()=>fake),read=vi.fn(()=>fake.session),list=vi.fn(()=>[fake.session]),review=vi.fn(()=>fake.session),save=vi.fn(()=>fake.session),fallback=vi.fn(()=>fake);
 const target:Record<string,unknown>=kind==='plain'?{}:Object.create(Store.prototype);
 for(const [key,value]of Object.entries({restoreCandidate2History:restore,readVerifiedSession:read,listRevisions:list,listHistory:list,reviewCandidate2Session:review,saveSession:save,restoreHistory:fallback,generateAndSaveCandidate2:fallback}))Object.defineProperty(target,key,{value,enumerable:true,configurable:true,writable:true});
 const traps={get:0,ownKeys:0,getOwnPropertyDescriptor:0,getPrototypeOf:0};
 const receiver=kind!=='proxy'?target:new Proxy(target,{
  get(){traps.get++;throw Error('unexpected receiver get');},ownKeys(){traps.ownKeys++;throw Error('unexpected receiver ownKeys');},
  getOwnPropertyDescriptor(){traps.getOwnPropertyDescriptor++;throw Error('unexpected receiver descriptor');},getPrototypeOf(){traps.getPrototypeOf++;throw Error('unexpected receiver prototype');},
 });
 const service=Object.create(StudioService.prototype) as StudioService;Object.defineProperty(service,'store',{value:receiver,enumerable:true});
 const invoke=(values:unknown[])=>Promise.resolve().then(()=>{
  const method=(StudioService.prototype as unknown as Record<string,unknown>).restoreCandidate2History;
  if(typeof method!=='function')throw Error('M977 actual Service restoreCandidate2History missing');return Reflect.apply(method,service,values);
 });
 const untouched=()=>{for(const spy of [restore,read,list,review,save,fallback])expect(spy).not.toHaveBeenCalled();expect(traps).toEqual({get:0,ownKeys:0,getOwnPropertyDescriptor:0,getPrototypeOf:0});};
 return{receiver,invoke,untouched};
}

describe('M977 real Service/native history receiver rejection only',{timeout:30000},()=>{
 it.each(['plain','same-prototype','proxy'] as const)('rejects valid refs on a %s unbranded receiver without using public replacements',async kind=>{
  const test=boundary(kind),values=args(),before=[...values];let error:unknown;
  if(kind==='same-prototype')expect(test.receiver).toBeInstanceOf(Store);
  try{await test.invoke(values);}catch(failure){error=failure;}
  expect(error).toBeInstanceOf(Error);expect((error as Error).message).toMatch(brandFailure);expect((error as Error).message).not.toMatch(inputFailure);
  test.untouched();expect(values).toEqual(before);
 });
 it.each([
  {label:'missing token',values:()=>args().slice(0,3)},
  {label:'undefined token',values:()=>[...args().slice(0,3),undefined]},
  {label:'numeric revision ID',values:()=>[SESSION,42,7,TOKEN]},
  {label:'noncanonical leading zero',values:()=>[SESSION,'042',7,TOKEN]},
  {label:'caller full snapshot',values:()=>[SESSION,{revisionId:'42',session:{claimed:true}},7,TOKEN]},
  {label:'fifth undefined',values:()=>[...args(),undefined]},
  {label:'fifth authority object',values:()=>[...args(),{saved:true,owner:{claimed:true}}]},
 ])('rejects $label through the real input helper before native receiver work',async({values})=>{
  const test=boundary('same-prototype');await expect(test.invoke(values())).rejects.toThrow(inputFailure);test.untouched();
 });
 it('rejects caller getter refs before touching a Proxy Store receiver',async()=>{
  const test=boundary('proxy');let getter=0;
  const revision=Object.defineProperty({},'id',{enumerable:true,get(){getter++;return '42';}});
  await expect(test.invoke([SESSION,revision,7,TOKEN])).rejects.toThrow('PROJECT_APPLICATION_INPUT_INVALID');expect(getter).toBe(0);test.untouched();
 });
});
