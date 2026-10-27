import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import type {BirthProfile} from '../src/shared/types';
import type {BaziRootFeedbackV132PreviewApi} from '../src/shared/bazi-root-feedback-v132-preview-api';
import type {RootFeedbackV132FacadeDTO} from '../src/shared/bazi-root-feedback-v132-r2-facade';
import {canonicalPlainJson} from '../src/shared/plain-json';
import {createV132PreviewController,matchesV132PreviewResponse,readV132PreviewFrame} from '../src/renderer/bazi-root-feedback-v132-preview-state';
import {bindPreviewFixtureResponse} from './helpers/m812-bound-preview-response';
import {previewBoundDto} from './fixtures/m793-v132-ui';

const bytes=gunzipSync(readFileSync(new URL('./fixtures/m793-fixed-facade-capture.json.gz',import.meta.url)));
const capture=JSON.parse(bytes.toString('utf8')) as {cases:Record<string,{profile:BirthProfile;options:{fromOutputMonthStem:boolean};dto:RootFeedbackV132FacadeDTO;dtoSha256:string}>};
const historical=capture.cases.unique;
// The fixed historical DTO has no binding. Only this explicit test transport
// seam binds it to its ORIGINAL recorded request, never a newer UI request.
const originalResponse=()=>bindPreviewFixtureResponse(historical.dto,historical.profile,historical.options);
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

function subject(profile:BirthProfile,initial:unknown,proposal=false){
 let response=initial;
 const calls:{profile:BirthProfile;options:unknown}[]=[];
 const api:BaziRootFeedbackV132PreviewApi={previewBaziRootFeedbackV132:async(input,options)=>{calls.push({profile:structuredClone(input),options:structuredClone(options)});return structuredClone(response) as RootFeedbackV132FacadeDTO;}};
 const controller=createV132PreviewController({getProfile:()=>profile,getApi:()=>api});
 controller.activate();if(proposal)controller.setProposal(true);
 return {controller,api,calls,setResponse:(value:unknown)=>{response=value;}};
}
const expectResponseError=(app:ReturnType<typeof subject>)=>{
 expect(app.controller.getSnapshot()).toMatchObject({phase:'error',errorKind:'response'});
 expect(app.controller.getSnapshot().result).toBeUndefined();
};

describe('M812 full dispatched raw-request binding at the renderer boundary',()=>{
 it('preserves the exact unbound historical capture and accepts only its explicit original-request transport extension',async()=>{
  expect(createHash('sha256').update(bytes).digest('hex')).toBe('0c21529f76c722a3df91e726ddc274db51bbfc6837f0b727e26341471e1bbb4d');
  expect(digest(historical.dto)).toBe(historical.dtoSha256);
  expect(historical.profile).toMatchObject({birthDate:'2022-02-13',birthTime:'11:30'});
  expect(historical.dto).not.toHaveProperty('requestBinding');
  const bound=originalResponse(),{requestBinding,...unchanged}=bound;
  expect(digest(unchanged)).toBe(historical.dtoSha256);
  expect(requestBinding.profileKey).toBe(canonicalPlainJson(historical.profile));
  const app=subject(historical.profile,bound);await app.controller.run();
  expect(app.controller.getSnapshot().phase).toBe('ready');
  expect(app.controller.getSnapshot().result?.applicationGate.status).toBe('blocked');
  expect(historical.dto).not.toHaveProperty('requestBinding');app.controller.dispose();
 });

 it.each([
  ['birthDate','2022-02-14'],['birthTime','13:30'],
  ['calendar','lunar'],['leapMonth',true],['timeUnknown',true],['timezone','Asia/Tokyo'],
  ['birthLongitude',121.47],['timeBasis','apparent-solar'],
  ['fatherName','林文舟'],['motherName','陈若兰'],['parentNameReadings',{fatherName:['lín','wén','zhōu']}],
  ['notes','another draft'],['birthPlace','杭州'],['customerName','another customer'],
  ['surname','陈'],['surnamePinyin','lin'],['gender','女'],
  ['monthAuthorityMethod','sanming-first-paragraph/1.0.0'],['seasonalMethod','qiongtong-2294674-initial/1.0.0'],
  ['renMethod','ditian-ren-commentary-2600158/1.1.0'],['namingPreferences',{preferredElements:['木']}],
 ] as const)('rejects the old real DTO after same-id %s changes, then retries with a fresh request-specific fixture',async(field,value)=>{
  const input={...structuredClone(historical.profile),[field]:value} as BirthProfile;
  const before=structuredClone(input),stale=originalResponse(),app=subject(input,stale);
  expect(input.id).toBe(historical.profile.id);
  await app.controller.run();expectResponseError(app);
  expect(app.calls).toEqual([{profile:input,options:{fromOutputMonthStem:false}}]);
  expect(stale.requestBinding.profileKey).toBe(canonicalPlainJson(historical.profile));
  // This positive response is an explicitly synthetic DTO constructed for the
  // current request. It is NOT the old real DTO relabeled with a new binding.
  app.setResponse(previewBoundDto(input,{fromOutputMonthStem:false}));
  await app.controller.run();expect(app.controller.getSnapshot().phase).toBe('ready');
  expect(app.calls).toHaveLength(2);expect(input).toEqual(before);
  expect(app.controller.getSnapshot().result?.applicationGate.status).toBe('blocked');
  app.controller.dispose();
 });

 it('rejects missing metadata and malformed/mismatched metadata as retryable response errors',async()=>{
  const good=originalResponse();
  const invalid:unknown[]=[
   historical.dto,
   {...good,requestBinding:undefined},
   {...good,requestBinding:null},
   {...good,requestBinding:{...good.requestBinding,schema:'old'}},
   {...good,requestBinding:{...good.requestBinding,profileKey:good.requestBinding.profileKey+' '}},
   {...good,requestBinding:{...good.requestBinding,fromOutputMonthStem:true}},
   {...good,requestBinding:{...good.requestBinding,extra:true}},
  ];
  for(const value of invalid){
   const app=subject(historical.profile,value);await app.controller.run();expectResponseError(app);
   app.setResponse(good);await app.controller.run();expect(app.controller.getSnapshot().phase).toBe('ready');
   expect(app.calls).toHaveLength(2);app.controller.dispose();
  }
 });

 it('compares the explicit proposal option even when the DTO entry policy has been changed to match',async()=>{
  const wrong=originalResponse();wrong.entryPolicy='month-stem-proposal';
  for(const branch of wrong.branches)branch.root.entryPolicy='month-stem-proposal';
  const app=subject(historical.profile,wrong,true);await app.controller.run();expectResponseError(app);
  expect(app.calls[0].options).toEqual({fromOutputMonthStem:true});
  app.setResponse(previewBoundDto(historical.profile,{fromOutputMonthStem:true}));
  await app.controller.run();expect(app.controller.getSnapshot().phase).toBe('ready');app.controller.dispose();
 });

 it('matches object key order and exactly the existing nine optional undefined omissions without editing the caller',async()=>{
  for(const field of ['fatherName','motherName','parentNameReadings','namingPreferences','monthAuthorityMethod','seasonalMethod','timeBasis','birthLongitude','renMethod']){
   const input={...historical.profile,[field]:undefined} as BirthProfile,before=structuredClone(input);
   const reversed=Object.fromEntries(Object.entries(input).reverse()) as unknown as BirthProfile;
   const app=subject(input,previewBoundDto(reversed));await app.controller.run();
   expect(app.controller.getSnapshot().phase,field).toBe('ready');
   expect(app.calls[0].profile).not.toHaveProperty(field);expect(input).toEqual(before);app.controller.dispose();
  }
 });

 it('uses the raw request rather than trimmed names for correlation',async()=>{
  const input={...historical.profile,surname:' 林 ',fatherName:' 林文舟 ',motherName:' 陈若兰 '};
  const correct=previewBoundDto(input),app=subject(input,correct);await app.controller.run();
  expect(app.controller.getSnapshot().phase).toBe('ready');
  expect(app.calls[0].profile.fatherName).toBe(' 林文舟 ');
  const normalized=previewBoundDto({...input,surname:'林',fatherName:'林文舟',motherName:'陈若兰'});
  expect(matchesV132PreviewResponse(normalized,readV132PreviewFrame(input,app.api,false))).toBe(false);
  expect(input.motherName).toBe(' 陈若兰 ');app.controller.dispose();
 });
});
