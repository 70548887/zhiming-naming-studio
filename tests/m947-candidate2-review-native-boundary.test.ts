import {describe,expect,it,vi} from 'vitest';
import {StudioService} from '../src/main/service';
import {Store} from '../src/main/store';

/** Real modules with no Store module/prototype mock and no native init/save.
 * Instance replacements return a malicious fake saved result only if called;
 * all tests require zero calls. Genuine private receiver rejection, not a fake
 * review success, is the sole native-boundary outcome tested here. No-change,
 * CAS and immutable generation semantics require separate real Store probes. */
const SESSION='c2s_0123456789abcdef0123456789abcdef',TOKEN='94700000-0000-4000-8000-000000000001';
const patch=()=>({reviewNote:'  原审阅𠮷😀  ',preferredElements:['水','木'],candidates:[{id:'candidate-z',meaning:'  寓意  ',reason:'  推荐  ',traditionalReason:'  依据  ',reviewNote:'  注  ',favorite:false}]});
const args=():unknown[]=>[SESSION,patch(),0,TOKEN];
const privateBrand=/private (?:member|field|method)|private.*(?:brand|class)|Receiver must be an instance of class Store|Cannot access private|原生\s*Store.*(?:身份|接收)|native\s+Store.*(?:brand|receiver)/iu;
const inputFailure=/CANDIDATE2_REVIEW_INPUT_INVALID|PROJECT_APPLICATION_INPUT_INVALID/u;
function boundary(kind:'plain'|'same-prototype'|'proxy'){
 const fakeSaved={schema:'M947_MALICIOUS_FAKE_SAVED',session:{id:SESSION}},review=vi.fn(()=>fakeSaved),read=vi.fn(()=>fakeSaved.session),save=vi.fn(()=>fakeSaved.session),fallback=vi.fn(()=>fakeSaved),migrate=vi.fn(()=>fakeSaved);
 const target:Record<string,unknown>=kind==='plain'?{}:Object.create(Store.prototype);
 for(const [key,value]of Object.entries({reviewCandidate2Session:review,readVerifiedSession:read,saveSession:save,generateAndSaveCandidate2:fallback,migrateCustomerStorage:migrate}))Object.defineProperty(target,key,{value,enumerable:true,configurable:true,writable:true});
 const traps={get:0,ownKeys:0,getOwnPropertyDescriptor:0,getPrototypeOf:0};
 const receiver=kind!=='proxy'?target:new Proxy(target,{
  get(){traps.get++;throw Error('unexpected receiver get');},ownKeys(){traps.ownKeys++;throw Error('unexpected receiver ownKeys');},
  getOwnPropertyDescriptor(){traps.getOwnPropertyDescriptor++;throw Error('unexpected receiver descriptor');},getPrototypeOf(){traps.getPrototypeOf++;throw Error('unexpected receiver prototype');},
 });
 const service=Object.create(StudioService.prototype) as StudioService;Object.defineProperty(service,'store',{value:receiver,enumerable:true});
 const invoke=(values:unknown[])=>Promise.resolve().then(()=>{
  const method=(StudioService.prototype as unknown as Record<string,unknown>).reviewCandidate2;
  if(typeof method!=='function')throw Error('M947 actual reviewCandidate2 Service route missing');return Reflect.apply(method,service,values);
 });
 const untouched=()=>{for(const spy of [review,read,save,fallback,migrate])expect(spy).not.toHaveBeenCalled();expect(traps).toEqual({get:0,ownKeys:0,getOwnPropertyDescriptor:0,getPrototypeOf:0});};
 return{receiver,invoke,untouched};
}

describe('M947 real Service/native Store review receiver rejection only',{timeout:30000},()=>{
 it.each(['plain','same-prototype','proxy'] as const)('rejects a %s receiver through captured native private brand without using public replacements',async kind=>{
  const test=boundary(kind),values=args(),before=structuredClone(values);let error:unknown;
  if(kind==='same-prototype')expect(test.receiver).toBeInstanceOf(Store);
  try{await test.invoke(values);}catch(failure){error=failure;}
  expect(error).toBeInstanceOf(Error);expect((error as Error).message).toMatch(privateBrand);expect((error as Error).message).not.toMatch(inputFailure);
  test.untouched();expect(values).toEqual(before);
 });
 it.each([
  {label:'all omitted',values:()=>[]},
  {label:'token omitted',values:()=>args().slice(0,3)},
  {label:'undefined token',values:()=>[...args().slice(0,3),undefined]},
  {label:'null token',values:()=>[...args().slice(0,3),null]},
  {label:'fifth undefined',values:()=>[...args(),undefined]},
  {label:'multiple trailing undefined',values:()=>[...args(),undefined,undefined]},
  {label:'fifth authority',values:()=>[...args(),{saved:true,owner:{claimed:true}}]},
 ])('rejects $label before touching native or malicious instance methods',async({values})=>{
  const test=boundary('same-prototype');await expect(test.invoke(values())).rejects.toThrow(inputFailure);test.untouched();
 });
 it('rejects generation facts in changes before reaching the unbranded receiver',async()=>{
  const test=boundary('plain'),changes={...patch(),candidate2Naming:{generation:{claimed:true}}};
  await expect(test.invoke([SESSION,changes,0,TOKEN])).rejects.toThrow('CANDIDATE2_REVIEW_INPUT_INVALID');test.untouched();
 });
 it('does not invoke review accessors before rejecting malformed input',async()=>{
  const test=boundary('proxy');let getters=0;
  const changes=Object.defineProperty(patch(),'reviewNote',{enumerable:true,get(){getters++;return '';}});
  await expect(test.invoke([SESSION,changes,0,TOKEN])).rejects.toThrow('PROJECT_APPLICATION_INPUT_INVALID');expect(getters).toBe(0);test.untouched();
 });
});
