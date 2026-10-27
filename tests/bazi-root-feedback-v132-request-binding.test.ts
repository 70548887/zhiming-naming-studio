import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildPreviewFixture} from './helpers/root-feedback-v132-preview-fixture';
import fixture from './fixtures/project-naming-use-m153.json';
import type {BirthProfile} from '../src/shared/types';
import type {RootFeedbackV132FacadeDTO} from '../src/shared/bazi-root-feedback-v132-r2-facade';
import {canonicalPlainJson} from '../src/shared/plain-json';
import {matchesRootFeedbackV132RequestBinding,ROOT_FEEDBACK_V132_REQUEST_BINDING_SCHEMA} from '../src/shared/bazi-root-feedback-v132-request-binding';
import {bindRootFeedbackV132PreviewResponse,readRootFeedbackV132BoundPreviewRequest} from '../src/main/bazi-root-feedback-v132-request-binding';
import {createBaziRootFeedbackV132PreviewAdapter} from '../src/main/bazi-root-feedback-v132-preview';
import {StudioService} from '../src/main/service';

const root=path.resolve('.'),scratch=fs.mkdtempSync(path.join(os.tmpdir(),'m811-v132-binding-'));
const profile=()=>structuredClone(fixture.positive.profile) as BirthProfile;
const key=(value:BirthProfile)=>canonicalPlainJson(JSON.parse(JSON.stringify(value)));
let adapter:ReturnType<typeof createBaziRootFeedbackV132PreviewAdapter>,realDTO:RootFeedbackV132FacadeDTO;

beforeAll(async()=>{
  const built=await buildPreviewFixture(scratch,root);
  adapter=createBaziRootFeedbackV132PreviewAdapter(built.assetRoot);
  realDTO=adapter.previewBaziRootFeedbackProfile(profile(),{fromOutputMonthStem:false});
},60000);
afterAll(()=>{fs.rmSync(scratch,{recursive:true,force:true});});

describe('M811 exact raw-request correlation',()=>{
  it('binds a real fixed-bundle DTO without changing its mathematical output or gate',()=>{
    const input=profile(),request=readRootFeedbackV132BoundPreviewRequest(input),before=canonicalPlainJson(realDTO);
    const response=bindRootFeedbackV132PreviewResponse(request,realDTO),{requestBinding,...dto}=response;
    expect(realDTO.schema).toBe('bazi-root-feedback-facade/1.3.2-r2');
    expect(matchesRootFeedbackV132RequestBinding(requestBinding,key(input),false)).toBe(true);
    expect(canonicalPlainJson(dto)).toBe(before);
    expect(canonicalPlainJson(realDTO)).toBe(before);
    expect(Object.hasOwn(realDTO,'requestBinding')).toBe(false);
    expect(response.applicationGate.status).toBe('blocked');
  });

  it.each([
    ['birthDate',{birthDate:'2022-02-14'}],['birthTime',{birthTime:'13:30'}],
    ['calendar',{calendar:'lunar'}],['leapMonth',{leapMonth:true}],['timeUnknown',{timeUnknown:true}],
    ['timezone',{timezone:'Asia/Tokyo'}],['birthLongitude',{birthLongitude:121.47}],
    ['timeBasis',{timeBasis:'apparent-solar'}],['fatherName',{fatherName:'林文舟'}],['motherName',{motherName:'陈若兰'}],
    ['notes',{notes:'changed'}],['birthPlace',{birthPlace:'杭州'}],['customerName',{customerName:'another draft'}],
    ['surname',{surname:'陈'}],['surnamePinyin',{surnamePinyin:'lin'}],['gender',{gender:'女'}],
    ['monthAuthorityMethod',{monthAuthorityMethod:'sanming-first-paragraph/1.0.0'}],['seasonalMethod',{seasonalMethod:'qiongtong-2294674-initial/1.0.0'}],
    ['renMethod',{renMethod:'ditian-ren-commentary-2600158/1.1.0'}],['nested preference',{namingPreferences:{preferredElements:['木']}}],
  ])('rejects the unchanged real response after same-id %s edits',(_name,change)=>{
    const input=profile(),old=bindRootFeedbackV132PreviewResponse(readRootFeedbackV132BoundPreviewRequest(input),realDTO);
    const current={...input,...change} as BirthProfile;
    expect(current.id).toBe(old.profileId);
    expect(matchesRootFeedbackV132RequestBinding(old.requestBinding,key(current),false)).toBe(false);
  });

  it('matches JSON object ordering and the same nine optional-undefined omissions as M793 dispatch',()=>{
    const input=profile();
    for(const field of ['fatherName','motherName','parentNameReadings','namingPreferences','monthAuthorityMethod','seasonalMethod','timeBasis','birthLongitude','renMethod']){
      const omitted={...input} as unknown as Record<string,unknown>;delete omitted[field];
      const undefinedField={...omitted,[field]:undefined} as unknown as BirthProfile;
      const a=readRootFeedbackV132BoundPreviewRequest(omitted),b=readRootFeedbackV132BoundPreviewRequest(undefinedField);
      expect(a.requestBinding.profileKey).toBe(key(undefinedField));
      expect(b.requestBinding.profileKey).toBe(a.requestBinding.profileKey);
    }
    const reversed=Object.fromEntries(Object.entries(input).reverse()) as unknown as BirthProfile;
    expect(readRootFeedbackV132BoundPreviewRequest(reversed).requestBinding.profileKey).toBe(key(input));
  });

  it('normalizes absent/empty/false options to false and preserves explicit true',()=>{
    for(const options of [undefined,{},Object.create(null),{fromOutputMonthStem:false}]){
      const request=readRootFeedbackV132BoundPreviewRequest(profile(),options);
      expect(request.options).toEqual({fromOutputMonthStem:false});
      expect(matchesRootFeedbackV132RequestBinding(request.requestBinding,key(profile()),false)).toBe(true);
      expect(matchesRootFeedbackV132RequestBinding(request.requestBinding,key(profile()),true)).toBe(false);
    }
    const request=readRootFeedbackV132BoundPreviewRequest(profile(),{fromOutputMonthStem:true});
    const result=adapter.previewBaziRootFeedbackProfile(request.profile,request.options);
    expect(result.entryPolicy).toBe('month-stem-proposal');
    expect(matchesRootFeedbackV132RequestBinding(bindRootFeedbackV132PreviewResponse(request,result).requestBinding,key(profile()),true)).toBe(true);
    expect(()=>readRootFeedbackV132BoundPreviewRequest(profile(),{fromOutputMonthStem:undefined})).toThrow('布尔');
  });

  it('retains unknown-time raw input even when birthTime is only a placeholder',()=>{
    const input={...profile(),timeUnknown:true,birthTime:''},request=readRootFeedbackV132BoundPreviewRequest(input);
    const response=bindRootFeedbackV132PreviewResponse(request,adapter.previewBaziRootFeedbackProfile(request.profile,request.options));
    expect(response.status).toBe('pending-regime-resolution');
    expect(response.branches.every(branch=>branch.kind==='unknown-hour-interval')).toBe(true);
    expect(matchesRootFeedbackV132RequestBinding(response.requestBinding,key(input),false)).toBe(true);
    expect(matchesRootFeedbackV132RequestBinding(response.requestBinding,key({...input,birthTime:'12:00'}),false)).toBe(false);
  });

  it('captures before the actual Service validator assigns ID and trims names',()=>{
    const input={...profile(),id:'',surname:' 林 ',fatherName:' 林文舟 ',motherName:' 陈若兰 '};
    const request=readRootFeedbackV132BoundPreviewRequest(input);
    const normalized=StudioService.prototype.validateProfile.call({} as StudioService,request.profile);
    expect(normalized.id).not.toBe('');expect(normalized.surname).toBe('林');expect(normalized.fatherName).toBe('林文舟');
    const response=bindRootFeedbackV132PreviewResponse(request,adapter.previewBaziRootFeedbackProfile(normalized,request.options));
    expect(response.profileId).toBe(normalized.id);
    expect(matchesRootFeedbackV132RequestBinding(response.requestBinding,key(input),false)).toBe(true);
    expect(matchesRootFeedbackV132RequestBinding(response.requestBinding,key(normalized),false)).toBe(false);
    expect(request.profile.id).toBe('');expect(request.profile.surname).toBe(' 林 ');
  });

  it('owns and freezes nested input/options before caller mutation or later getter installation',()=>{
    const input=profile(),nested={preferredElements:['木']};
    input.namingPreferences=nested as BirthProfile['namingPreferences'];
    const options={fromOutputMonthStem:true},before=key(input),request=readRootFeedbackV132BoundPreviewRequest(input,options);
    input.birthDate='2000-01-01';nested.preferredElements.push('火');options.fromOutputMonthStem=false;
    let calls=0;Object.defineProperty(input,'surname',{enumerable:true,get(){calls++;throw Error('late profile reread');}});
    Object.defineProperty(options,'fromOutputMonthStem',{enumerable:true,get(){calls++;throw Error('late option reread');}});
    const response=bindRootFeedbackV132PreviewResponse(request,adapter.previewBaziRootFeedbackProfile(request.profile,request.options));
    expect(request.profile.birthDate).toBe('2022-02-13');
    expect(request.profile.namingPreferences?.preferredElements).toEqual(['木']);
    expect(request.options.fromOutputMonthStem).toBe(true);
    expect(matchesRootFeedbackV132RequestBinding(response.requestBinding,before,true)).toBe(true);
    expect(calls).toBe(0);
    expect(()=>{request.profile.birthDate='1990-01-01';}).toThrow();
    expect(Object.isFrozen(request.profile.namingPreferences?.preferredElements)).toBe(true);
    expect(Object.isFrozen(response.requestBinding)).toBe(true);
  });
});

describe('M811 safe main boundary and strict browser comparison',()=>{
  it('rejects top-level/nested/revoked proxies without invoking their traps',()=>{
    let traps=0;const proxy=(value:object)=>new Proxy(value,{get(){traps++;throw Error('get');},getPrototypeOf(){traps++;throw Error('prototype');},ownKeys(){traps++;throw Error('keys');},getOwnPropertyDescriptor(){traps++;throw Error('descriptor');}});
    expect(()=>readRootFeedbackV132BoundPreviewRequest(proxy(profile()))).toThrow('代理');
    expect(()=>readRootFeedbackV132BoundPreviewRequest({...profile(),namingPreferences:proxy({})})).toThrow('代理');
    expect(()=>readRootFeedbackV132BoundPreviewRequest(profile(),proxy({fromOutputMonthStem:true}))).toThrow('代理');
    const revoked=Proxy.revocable(profile(),{});revoked.revoke();
    expect(()=>readRootFeedbackV132BoundPreviewRequest(revoked.proxy)).toThrow('代理');
    const revokedOptions=Proxy.revocable({},{});revokedOptions.revoke();
    expect(()=>readRootFeedbackV132BoundPreviewRequest(profile(),revokedOptions.proxy)).toThrow('代理');
    expect(traps).toBe(0);
  });

  it('rejects accessors at root/nested/options without executing getters',()=>{
    let calls=0;const accessor=(value:object,field:string)=>Object.defineProperty(value,field,{enumerable:true,get(){calls++;throw Error('getter ran');}});
    expect(()=>readRootFeedbackV132BoundPreviewRequest(accessor(profile(),'birthDate'))).toThrow('访问器');
    expect(()=>readRootFeedbackV132BoundPreviewRequest({...profile(),namingPreferences:accessor({},'preferredElements')})).toThrow('访问器');
    expect(()=>readRootFeedbackV132BoundPreviewRequest(profile(),accessor({},'fromOutputMonthStem'))).toThrow('访问器');
    expect(calls).toBe(0);
  });

  it('rejects hidden/symbol/extra fields and forged owned requests',()=>{
    expect(()=>readRootFeedbackV132BoundPreviewRequest({...profile(),unexpected:true})).toThrow('未允许字段');
    expect(()=>readRootFeedbackV132BoundPreviewRequest({...profile(),[Symbol('extra')]:true})).toThrow('未允许字段');
    expect(()=>readRootFeedbackV132BoundPreviewRequest(Object.defineProperty(profile(),'notes',{value:'hidden',enumerable:false}))).toThrow('隐藏字段');
    expect(()=>readRootFeedbackV132BoundPreviewRequest(profile(),{other:true})).toThrow('只接受');
    const request=readRootFeedbackV132BoundPreviewRequest(profile());
    expect(()=>bindRootFeedbackV132PreviewResponse({...request},realDTO)).toThrow('主进程安全读取');
    expect(()=>bindRootFeedbackV132PreviewResponse(new Proxy(request,{}),realDTO)).toThrow('主进程安全读取');
  });

  it('rejects required and nested undefined rather than broadening the optional omission contract',()=>{
    expect(()=>readRootFeedbackV132BoundPreviewRequest({...profile(),birthDate:undefined})).toThrow('非 JSON');
    expect(()=>readRootFeedbackV132BoundPreviewRequest({...profile(),namingPreferences:{preferredElements:undefined}})).toThrow('非 JSON');
  });

  it('requires exactly three own enumerable data fields and fails closed for missing/mismatched binding',()=>{
    const binding=readRootFeedbackV132BoundPreviewRequest(profile()).requestBinding,expected=key(profile());
    const bad:unknown[]=[undefined,null,{},[],{...binding,schema:'old'}, {...binding,profileKey:expected+' '},{...binding,fromOutputMonthStem:true},{...binding,extra:true},{...binding,[Symbol('extra')]:true},Object.create(binding),Object.defineProperty({...binding},'profileKey',{value:expected,enumerable:false})];
    for(const value of bad)expect(matchesRootFeedbackV132RequestBinding(value,expected,false)).toBe(false);
    let calls=0;
    for(const field of ['schema','profileKey','fromOutputMonthStem']){
      const accessor=Object.defineProperty({...binding},field,{enumerable:true,get(){calls++;throw Error('binding getter ran');}});
      expect(matchesRootFeedbackV132RequestBinding(accessor,expected,false)).toBe(false);
    }
    expect(calls).toBe(0);
    const plainNull=Object.assign(Object.create(null),binding);
    expect(matchesRootFeedbackV132RequestBinding(plainNull,expected,false)).toBe(true);
    expect(binding.schema).toBe(ROOT_FEEDBACK_V132_REQUEST_BINDING_SCHEMA);
  });
});
