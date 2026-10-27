import {afterAll,beforeAll,describe,expect,it,vi} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildProjectApplicationV132R2} from '../scripts/build-project-application-v132-r2.mjs';
import {createCandidate2NamingConsumer} from '../src/main/candidate2-naming-consumer-v1';
import {createCandidate2NamingEligibilityHost} from '../src/main/candidate2-naming-eligibility-host-v1';
import * as realDomain from '../src/domain/candidate2-naming-consumer-v1';
import * as realFinalizer from '../src/main/naming-meaning-review';
import {CANDIDATE2_NAMING_SELECTION} from '../src/shared/candidate2-naming-consumer-v1';
import type {Candidate2NamingGeneration,Candidate2NamingRequest} from '../src/shared/candidate2-naming-consumer-v1';
import type {Candidate2NamingEligibility} from '../src/shared/candidate2-naming-eligibility-v1';
import {canonicalPlainJson} from '../src/shared/plain-json';
import {normalizePreferences} from '../src/shared/workflow';
import fixture from './fixtures/project-naming-use-m153.json';
import type {BirthProfile,NamingPreferences} from '../src/shared/types';

const root=path.resolve('.'),tempParent=fs.realpathSync(os.tmpdir());
const owned=fs.mkdtempSync(path.join(tempParent,'m845-candidate2-eligibility-'));
const bundle=path.join(owned,'candidate2.cjs');
const profile=structuredClone(fixture.positive.profile) as BirthProfile;
const preferences=normalizePreferences({length:1,requiredChars:'沐',zodiacRules:false,numerology:false});
const selection=CANDIDATE2_NAMING_SELECTION;
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
const digest=(value:unknown)=>createHash('sha256').update(canonicalPlainJson(value)).digest('hex');
const summary:Record<string,unknown>={};
let consumer:ReturnType<typeof createCandidate2NamingConsumer>;

function configuration(overrides:Partial<Parameters<typeof createCandidate2NamingConsumer>[0]>={}){
 return{applicationBundlePath:bundle,assetDir:path.join(root,'assets'),dataDir:path.join(root,'data'),namingRulesVersion:'naming-editorial-7.1.0' as const,...overrides};
}
function factory(overrides:Partial<Parameters<typeof createCandidate2NamingConsumer>[0]>={}){
 return createCandidate2NamingConsumer(configuration(overrides));
}
function request(birth=profile,pref=preferences):Candidate2NamingRequest {
 return{profile:birth,preferences:pref,selection,seed:17,excludeNames:[]};
}
function expectDiagnostic(result:Candidate2NamingEligibility){
 expect(result).toMatchObject({schema:'candidate2-naming-eligibility/1',checkerVersion:'candidate2-naming-eligibility/1.0.0',consumerVersion:'candidate2-naming-consumer/1.0.0',generationAuthority:false,candidateAvailability:'not-evaluated',traditionalStatus:'unknown'});
 expect(result).not.toHaveProperty('candidates');
 expect(result).not.toHaveProperty('certificate');
 expect(result).not.toHaveProperty('namingInput');
 expect(result.notice).toMatch(/[\u3400-\u9fff]/u);
 for(const reason of result.reasons){expect(reason.code.length).toBeGreaterThan(0);expect(reason.message).toMatch(/[\u3400-\u9fff]/u);}
}
function expectUnavailable(result:Candidate2NamingEligibility,code:string){
 expectDiagnostic(result);expect(result.status).toBe('unavailable');
 expect(result.reasons.map(item=>item.code)).toContain(code);
 expect(result.application).toBeNull();expect(result.dataIdentity).toBeNull();
 expect(result.binding.normalizedInputDigest).toBeNull();expect(result.binding.resourceDigest).toBeNull();
}
function ownAssets(label:string):string {
 const directory=path.join(owned,label,'assets');
 for(const relative of ['bazi-root-feedback/1.3.2-r2','project-naming-application/1.3.2-candidate.2']){
  fs.mkdirSync(path.dirname(path.join(directory,relative)),{recursive:true});
  fs.cpSync(path.join(root,'assets',relative),path.join(directory,relative),{recursive:true});
 }
 return directory;
}
function ownPhysicalPackage(label:string):string {
 const directory=path.join(owned,label);fs.mkdirSync(directory,{recursive:true});
 for(const name of ['knowledge-v6.sqlite','dataset-v6.json'])fs.copyFileSync(path.join(root,'data',name),path.join(directory,name));
 return directory;
}

beforeAll(async()=>{
 const receipt=await buildProjectApplicationV132R2({root,outfile:bundle});
 consumer=factory();summary.build={identity:receipt.identity,output:receipt.output};
},60000);

afterAll(()=>{
 try{
  const directory=process.env.M845_EVIDENCE_DIR;
  if(directory){
   fs.mkdirSync(path.resolve(directory),{recursive:true});
   const target=path.join(path.resolve(directory),'m845-candidate2-eligibility-summary.json'),temporary=target+'.tmp';
   fs.writeFileSync(temporary,JSON.stringify(summary,null,2)+'\n');fs.renameSync(temporary,target);
  }
 }finally{
  const target=path.resolve(owned);
  if(path.dirname(target)!==tempParent||!path.basename(target).startsWith('m845-candidate2-eligibility-'))throw Error('M845 unsafe owned test cleanup');
  fs.rmSync(target,{recursive:true,force:true});
 }
});

describe('M845 focused candidate.2 eligibility diagnostics',()=>{
 it('offers the synchronous three-input contract and checks real authority without generating or finalizing',()=>{
  const generate=vi.spyOn(realDomain,'generateCandidate2DomainV1');
  const finalize=vi.spyOn(realFinalizer,'finalizeNamingCandidateForRuleVersion');
  try{
   expect(consumer.checkEligibility.length).toBe(3);
   const original={profile:clone(profile),preferences:clone(preferences),selection:clone(selection)};
   const result=consumer.checkEligibility(profile,preferences,selection);
   expect(result).not.toBeInstanceOf(Promise);expectDiagnostic(result);
   expect(result.status).toBe('eligible');expect(result.reasons).toEqual([]);
   expect(generate).not.toHaveBeenCalled();expect(finalize).not.toHaveBeenCalled();
   expect({profile,preferences,selection}).toEqual(original);
   expect(result.application).toMatchObject({branch:'regular-strong',elements:{primary:['土'],secondary:['金'],applied:['土','金']}});
   expect(result.application!.numerical.iterations).toBeGreaterThan(0);
   expect(result.application!.numerical.errorBound).toBeGreaterThanOrEqual(0);
   expect(result.application).not.toHaveProperty('certificate');expect(result.application).not.toHaveProperty('namingInput');
   expect(Object.keys(result.application!).sort()).toEqual(['tuple','branch','elements','numerical','sources'].sort());
   expect(result.application!.sources.length).toBeGreaterThan(0);
   expect(result.dataIdentity!.namingRulesVersion).toBe('naming-editorial-7.1.0');
   expect(result.binding.request).toEqual({...original,selectionWasProvided:true});
   expect(result.binding.request).not.toBe(original);
   expect(result.binding.requestDigest).toBe(digest(result.binding.request));
   expect(result.binding.normalizedInputDigest).toBe(digest({profile:{...profile,namingPreferences:preferences},preferences,selection}));
   expect(result.binding.resourceDigest).toBe(digest({application:result.application!.tuple,dataIdentity:result.dataIdentity}));
   expect(Object.isFrozen(result.binding.request!.profile)).toBe(true);
   summary.eligible={status:result.status,binding:result.binding,versions:result.versions,application:result.application,dataIdentity:{packSha256:result.dataIdentity!.packSha256,semanticSha256:result.dataIdentity!.semanticSha256},generatorCalls:generate.mock.calls.length,finalizerCalls:finalize.mock.calls.length,generationAuthority:result.generationAuthority,candidateAvailability:result.candidateAvailability};
  }finally{generate.mockRestore();finalize.mockRestore();}
 });

 it('still generates the real nonempty 沐40 result and verifies saved JSON without generation authority',()=>{
  const result=consumer.generate(request());
  expect(result.status).toBe('generated');if(result.status!=='generated')throw Error('M845 real positive generation unavailable');
  expect(result.candidates.map(item=>item.fullName)).toEqual(['林沐']);
  expect(result.candidates[0].evaluation.traditional).toBe(40);
  expect(result.application.application.elements.applied).toEqual(['土','金']);
  expect(result.preferences.preferredElements).toEqual([]);
  const saved=consumer.createSaved(result),replay=consumer.verifySaved(clone(saved),{profile,preferences,selection});
  expect(replay).toMatchObject({status:'verified-saved',candidateCount:1,generationAuthority:false,replayOrigin:'saved-replay'});
  expect(()=>consumer.createSaved(replay as unknown as Candidate2NamingGeneration)).toThrow('GENERATION_REQUIRED');
  summary.positiveSmoke={name:result.candidates[0].fullName,traditional:result.candidates[0].evaluation.traditional,saveStatus:replay.status,generationAuthority:replay.generationAuthority};
 });

 it('keeps omitted and explicit off selections disabled with exact raw selection binding',()=>{
  const omitted=consumer.checkEligibility(profile,preferences);
  const off=consumer.checkEligibility(profile,preferences,{enabled:false});
  for(const result of [omitted,off]){
   expectDiagnostic(result);expect(result.status).toBe('disabled');expect(result.reasons[0].code).toBe('not-selected');
   expect(result.application).toBeNull();expect(result.dataIdentity).toBeNull();expect(result.binding.resourceDigest).toBeNull();
   expect(result.binding.requestDigest).toBe(digest(result.binding.request));
  }
  expect(omitted.binding.request).toEqual({profile,preferences,selection:null,selectionWasProvided:false});
  expect(off.binding.request).toEqual({profile,preferences,selection:{enabled:false},selectionWasProvided:true});
  expect(omitted.binding.requestDigest).not.toBe(off.binding.requestDigest);
  summary.disabled={omitted:omitted.status,off:off.status,omittedSelection:omitted.binding.request!.selection};
 });

 it.each([
  {label:'unknown hour',profile:{...profile,id:'m845-unknown',birthTime:'',timeUnknown:true},code:'unknown-birth-time'},
  {label:'multiple roots',profile:{...profile,id:'m845-multi',birthDate:'1990-12-05',birthTime:'08:00'},code:'multiple-regimes'},
  {label:'competing balanced opinion',profile:{...fixture.negative.profile,id:'m845-competing'} as BirthProfile,code:'consumer-pending'},
 ])('reports real $label as blocked with Chinese reasons and no numerical authorization',({profile:birth,code})=>{
  const result=consumer.checkEligibility(birth,preferences,selection);
  expectDiagnostic(result);expect(result.status).toBe('blocked');
  expect(result.reasons.map(reason=>reason.code)).toContain(code);
  expect(result.application).toBeNull();expect(result.dataIdentity).toBeNull();
  expect(result.binding.normalizedInputDigest).toBeNull();expect(result.binding.resourceDigest).toBeNull();
  expect(()=>consumer.generate(request(birth))).toThrow('APPLICATION_REJECTED');
 });

 it.each([
  {label:'manual element conflict',preferences:{...preferences,preferredElements:['木']} as NamingPreferences,selection,code:'CANDIDATE2_NAMING_CONFLICT'},
  {label:'legacy method conflict',preferences:{...preferences,namingElementMethod:{methodId:'project-bazi-mainchain-145/1.3.1',entryPolicy:'month-branch-only'}} as NamingPreferences,selection,code:'CANDIDATE2_NAMING_CONFLICT'},
  {label:'old selection',preferences,selection:{...selection,methodId:'project-bazi-mainchain-145/1.3.1'} as unknown as typeof selection,code:'CANDIDATE2_NAMING_UNSUPPORTED_SELECTION'},
  {label:'candidate.1 selection',preferences,selection:{...selection,policyId:'naming-element-application/1.3.2-candidate.1',publicationId:'project-naming-application/1.3.2-candidate.1'} as unknown as typeof selection,code:'CANDIDATE2_NAMING_UNSUPPORTED_SELECTION'},
  {label:'unowned Service enrichment',preferences:{...preferences,numerology:true},selection,code:'CANDIDATE2_NAMING_UNSUPPORTED_FEATURE'},
 ])('reports $label as blocked instead of selecting a fallback',({preferences:pref,selection:chosen,code})=>{
  const result=consumer.checkEligibility(profile,pref,chosen);
  expectDiagnostic(result);expect(result.status).toBe('blocked');
  expect(result.reasons.map(reason=>reason.code)).toContain(code);expect(result.application).toBeNull();
 });

 it('reports physical data corruption as unavailable before missing review files could be used',()=>{
  const dataDir=ownPhysicalPackage('changed-two-file-package');
  const file=path.join(dataDir,'knowledge-v6.sqlite'),bytes=fs.readFileSync(file);bytes[0]^=1;fs.writeFileSync(file,bytes);
  const changed=factory({dataDir}),result=changed.checkEligibility(profile,preferences,selection);
  expectUnavailable(result,'data-resources-unavailable');
  expect(()=>changed.generate(request())).toThrow('CANDIDATE2_NAMING_DATA_INVALID');
  summary.changedPhysicalData={status:result.status,reasons:result.reasons};
 });

 it('lets the lazy host report unavailable initialization without throwing or falling back',()=>{
  const host=createCandidate2NamingEligibilityHost(configuration({applicationBundlePath:path.join(owned,'missing-candidate2.cjs')}));
  expect(host.checkEligibility.length).toBe(3);
  expect(host.checkEligibility(profile,preferences).status).toBe('disabled');
  const result=host.checkEligibility(profile,preferences,selection);
  expectUnavailable(result,'application-resources-unavailable');
  expect(result.binding.requestDigest).toBe(digest({profile,preferences,selection,selectionWasProvided:true}));
  expect(()=>host.generate(request())).toThrow();
  summary.missingRuntime={status:result.status,reasons:result.reasons};
 });

 it.each([
  {parentNamePhonetics:'invalid'},
  {elementAssessment:'yes'},
 ])('classifies invalid plain-JSON preferences %j as blocked input in both paths',invalid=>{
  const pref={...preferences,...invalid} as unknown as NamingPreferences;
  const result=consumer.checkEligibility(profile,pref,selection);
  expectDiagnostic(result);expect(result.status).toBe('blocked');
  expect(result.reasons.map(reason=>reason.code)).toEqual(['CANDIDATE2_NAMING_INPUT_INVALID']);
  expect(()=>consumer.generate(request(profile,pref))).toThrow('CANDIDATE2_NAMING_INPUT_INVALID');
 });

 it('revalidates warmed copied core assets after eligibility and restores only its owned copied bytes',()=>{
  const assetDir=ownAssets('warm-core'),warm=factory({assetDir});
  expect(warm.checkEligibility(profile,preferences,selection).status).toBe('eligible');
  const publication=path.join(assetDir,'project-naming-application','1.3.2-candidate.2');
  const manifest=JSON.parse(fs.readFileSync(path.join(publication,'resource-manifest.json'),'utf8')) as {files:{path:string;kind:string}[]};
  const resource=manifest.files.find(file=>file.kind==='runtime-source');if(!resource)throw Error('M845 declared application runtime resource missing');
  const file=path.join(publication,...resource.path.split('/')),original=fs.readFileSync(file);
  const changed=Buffer.from(original);changed[0]^=1;
  try{
   fs.writeFileSync(file,changed);
   const result=warm.checkEligibility(profile,preferences,selection);
   expectUnavailable(result,'application-resources-unavailable');
   expect(()=>warm.generate(request())).toThrow();
   summary.warmCoreTamper={declaredResource:resource.path,status:result.status,reasons:result.reasons};
  }finally{fs.writeFileSync(file,original);}
  expect(warm.checkEligibility(profile,preferences,selection).status).toBe('eligible');
 });

 it('does not turn an earlier eligible response into approval after caller preference changes',()=>{
  const birth=clone(profile),pref=clone(preferences);
  const checked=consumer.checkEligibility(birth,pref,selection),savedBinding=clone(checked.binding);
  expect(checked.status).toBe('eligible');
  pref.preferredElements.push('木');
  const changed=consumer.checkEligibility(birth,pref,selection);
  expect(changed.status).toBe('blocked');expect(changed.reasons[0].code).toBe('CANDIDATE2_NAMING_CONFLICT');
  expect(changed.binding.requestDigest).not.toBe(checked.binding.requestDigest);
  expect(checked.binding).toEqual(savedBinding);
  expect(()=>consumer.generate(request(birth,pref))).toThrow('CONFLICT');
  expect(()=>consumer.generate({...request(),eligibility:checked} as Candidate2NamingRequest)).toThrow('INPUT_INVALID');
 });

 it('rereads a warmed physical package instead of caching earlier eligible resource approval',()=>{
  const dataDir=path.join(owned,'warm-data');fs.cpSync(path.join(root,'data'),dataDir,{recursive:true});
  const warm=factory({dataDir}),checked=warm.checkEligibility(profile,preferences,selection);
  expect(checked.status).toBe('eligible');
  const file=path.join(dataDir,'knowledge-v6.sqlite'),original=fs.readFileSync(file),changed=Buffer.from(original);changed[0]^=1;
  try{
   fs.writeFileSync(file,changed);
   const result=warm.checkEligibility(profile,preferences,selection);
   expectUnavailable(result,'data-resources-unavailable');
   expect(()=>warm.generate(request())).toThrow('CANDIDATE2_NAMING_DATA_INVALID');
   expect(checked.status).toBe('eligible');expect(checked.generationAuthority).toBe(false);
   summary.warmPackTamper={before:checked.status,after:result.status,reasons:result.reasons};
  }finally{fs.writeFileSync(file,original);}
  expect(warm.checkEligibility(profile,preferences,selection).status).toBe('eligible');
 });

 it('keeps eligibility independent of candidate exclusions and enforces nonempty generation separately',()=>{
  const checked=consumer.checkEligibility(profile,preferences,selection);
  expect(checked.status).toBe('eligible');expect(checked.candidateAvailability).toBe('not-evaluated');
  expect(()=>consumer.generate({...request(),excludeNames:['林沐','沐']})).toThrow('CANDIDATE2_NAMING_NO_CANDIDATES');
  expect(consumer.checkEligibility(profile,preferences,selection)).toEqual(checked);
  summary.excludedOnlyCandidate={eligibility:checked.status,candidateAvailability:checked.candidateAvailability,generationError:'CANDIDATE2_NAMING_NO_CANDIDATES'};
 });

 it('rejects caller proxy input with zero traps and preserves stable diagnostic failure',()=>{
  const traps={get:0,ownKeys:0,getOwnPropertyDescriptor:0,getPrototypeOf:0};
  const input=new Proxy(clone(profile),{
   get(){traps.get++;throw Error('unexpected get');},ownKeys(){traps.ownKeys++;throw Error('unexpected ownKeys');},
   getOwnPropertyDescriptor(){traps.getOwnPropertyDescriptor++;throw Error('unexpected descriptor');},getPrototypeOf(){traps.getPrototypeOf++;throw Error('unexpected prototype');},
  });
  const result=consumer.checkEligibility(input,preferences,selection);
  expectDiagnostic(result);expect(result.status).toBe('blocked');expect(result.reasons[0].code).toBe('input-invalid');
  expect(traps).toEqual({get:0,ownKeys:0,getOwnPropertyDescriptor:0,getPrototypeOf:0});
  expect(result.binding.request).toBeNull();expect(result.binding.requestDigest).toBeNull();
 });
});
