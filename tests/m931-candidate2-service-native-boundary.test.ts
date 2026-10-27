import {describe,expect,it,vi} from 'vitest';
import {StudioService} from '../src/main/service';
import {Store} from '../src/main/store';
import {CANDIDATE2_NAMING_SELECTION} from '../src/shared/candidate2-naming-consumer-v1';

/** Real Service and real Store module, with NO module/prototype mocks.
 * Malicious instance methods return a fake claimed saved result only if
 * invoked; every test requires those spies to remain at zero calls. Valid
 * input must reach the captured native Store function and fail its private
 * receiver brand, not return an injected result or trigger core recomputation.
 * This proves a rejection boundary, never a successful native save or CAS.
 */
const selection=CANDIDATE2_NAMING_SELECTION;
const preferences=()=>({length:1,generationChar:'',requiredChars:' 沐 ',forbiddenChars:' 忌 ',elderTaboo:' 长辈 ',style:' 清朗 ',meanings:' 平安𠮷😀 ',industry:'',priority:'balanced',preferredElements:[],zodiacRules:false,numerology:false,avoidParentNames:false});
const values=():unknown[]=>['  m931-existing-profile-id  ',preferences(),selection];
const brandFailure=/private (?:member|field|method)|private.*(?:brand|class)|Receiver must be an instance of class Store|Cannot access private|原生\s*Store.*(?:身份|接收)|native\s+Store.*(?:brand|receiver)/iu;
function boundary(kind:'plain'|'same-prototype'){
 const fakeSaved={session:{id:'M931_MALICIOUS_FAKE_SAVED_RESULT'},messages:['not a native save']};
 const generated=vi.fn(()=>fakeSaved),read=vi.fn(()=>fakeSaved.session),save=vi.fn(()=>fakeSaved.session),migrate=vi.fn(()=>fakeSaved);
 const fake:Record<string,unknown>=kind==='plain'?{}:Object.create(Store.prototype);
 for(const [name,value]of Object.entries({generateAndSaveCandidate2:generated,readVerifiedSession:read,saveSession:save,migrateCustomerStorage:migrate}))Object.defineProperty(fake,name,{value,enumerable:true,writable:true,configurable:true});
 const service=Object.create(StudioService.prototype) as StudioService;
 Object.defineProperty(service,'store',{value:fake,enumerable:true,writable:false,configurable:false});
 const invoke=(args:unknown[])=>Promise.resolve().then(()=>{
  const method=(StudioService.prototype as unknown as Record<string,unknown>).generateCandidate2;
  if(typeof method!=='function')throw Error('M931 actual generateCandidate2 Service method is missing');
  return Reflect.apply(method,service,args);
 });
 const noFakeMethods=()=>{expect(generated).not.toHaveBeenCalled();expect(read).not.toHaveBeenCalled();expect(save).not.toHaveBeenCalled();expect(migrate).not.toHaveBeenCalled();};
 return{fake,service,invoke,noFakeMethods,fakeSaved};
}

describe('M931 real Service uses captured native Store receiver, rejection only',{timeout:30000},()=>{
 it.each(['plain','same-prototype'] as const)('refuses a valid exact-three request on a %s unbranded Store without calling instance replacements',async kind=>{
  const fixture=boundary(kind),args=values(),before=structuredClone(args);let failure:unknown;
  if(kind==='same-prototype')expect(fixture.fake).toBeInstanceOf(Store);else expect(fixture.fake).not.toBeInstanceOf(Store);
  try{await fixture.invoke(args);}catch(error){failure=error;}
  expect(failure).toBeInstanceOf(Error);expect((failure as Error).message).toMatch(brandFailure);
  expect((failure as Error).message).not.toMatch(/CANDIDATE2_SERVICE_INPUT_INVALID|PROJECT_APPLICATION_INPUT_INVALID/u);
  fixture.noFakeMethods();expect(args).toEqual(before);
 });

 it.each([
  {name:'omitted all input',args:()=>[]},
  {name:'omitted selection',args:()=>values().slice(0,2)},
  {name:'explicit undefined third selection',args:()=>[...values().slice(0,2),undefined]},
  {name:'fourth undefined authority slot',args:()=>[...values(),undefined]},
  {name:'multiple undefined authority slots',args:()=>[...values(),undefined,undefined]},
  {name:'fourth fake saved authority object',args:()=>[...values(),{session:{id:'claimed'},canSave:true}]},
 ])('runs the real helper before any native/fake store work for $name',async({args:input})=>{
  const fixture=boundary('same-prototype');
  await expect(fixture.invoke(input())).rejects.toThrow(/CANDIDATE2_SERVICE_INPUT_INVALID|PROJECT_APPLICATION_INPUT_INVALID/u);
  fixture.noFakeMethods();
 });

 it('rejects a full profile passed as an ID before touching malicious instance reads',async()=>{
  const fixture=boundary('plain');
  await expect(fixture.invoke([{id:'claimed-profile',birthDate:'2022-02-13'},preferences(),selection])).rejects.toThrow('CANDIDATE2_SERVICE_INPUT_INVALID');
  fixture.noFakeMethods();
 });

 it('does not execute caller preference accessors before rejecting input or reaching a Store receiver',async()=>{
  const fixture=boundary('same-prototype');let getter=0;
  const pref=Object.defineProperty(preferences(),'requiredChars',{enumerable:true,get(){getter++;return '沐';}});
  await expect(fixture.invoke(['p',pref,selection])).rejects.toThrow('PROJECT_APPLICATION_INPUT_INVALID');
  expect(getter).toBe(0);fixture.noFakeMethods();
 });
});
