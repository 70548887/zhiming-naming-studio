import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import type {BirthProfile} from '../src/shared/types';
import type {RootFeedbackV132FacadeDTO} from '../src/shared/bazi-root-feedback-v132-r2-facade';
import type {RootFeedbackV132BoundPreviewResponse} from '../src/shared/bazi-root-feedback-v132-request-binding';
import type {BaziRootFeedbackV132PreviewApi} from '../src/shared/bazi-root-feedback-v132-preview-api';
import {canonicalPlainJson} from '../src/shared/plain-json';
import {createV132PreviewController} from '../src/renderer/bazi-root-feedback-v132-preview-state';
import {bindPreviewFixtureResponse} from './helpers/m812-bound-preview-response';

type Captured={raw:BirthProfile;normalized:BirthProfile;options:{fromOutputMonthStem:boolean};response:RootFeedbackV132BoundPreviewResponse;dtoSha256:string;responseSha256:string};
const captured=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/m812-normalized-profile-capture.json.gz',import.meta.url))).toString('utf8')) as {schema:string;cases:Record<'unique'|'unknown'|'multiple'|'monthStem',Captured>};
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function subject(input:BirthProfile,initial:unknown,proposal=false){
 let response=initial;
 const calls:{profile:BirthProfile;options:unknown}[]=[];
 const api:BaziRootFeedbackV132PreviewApi={previewBaziRootFeedbackV132:async(profile,options)=>{calls.push({profile:structuredClone(profile),options:structuredClone(options)});return structuredClone(response) as RootFeedbackV132FacadeDTO;}};
 const controller=createV132PreviewController({getProfile:()=>input,getApi:()=>api});controller.activate();if(proposal)controller.setProposal(true);
 return {controller,calls,setResponse:(next:unknown)=>{response=next;}};
}
const rejected=(app:ReturnType<typeof subject>)=>{expect(app.controller.getSnapshot()).toMatchObject({phase:'error',errorKind:'response'});expect(app.controller.getSnapshot().result).toBeUndefined();};

describe('M812 normalization followup: server ID allocation with the original raw binding',()=>{
 it.each(['unique','unknown','multiple','monthStem'] as const)('accepts real %s normalized output without changing the unsaved raw draft',async name=>{
  const row=captured.cases[name],input=structuredClone(row.raw),before=structuredClone(input),response=structuredClone(row.response);
  const {requestBinding,...dto}=response;
  expect(digest(dto)).toBe(row.dtoSha256);expect(digest(response)).toBe(row.responseSha256);
  expect(input.id).toBe('');expect(row.normalized.id).not.toBe('');expect(response.profileId).toBe(row.normalized.id);
  for(const field of ['surname','fatherName','motherName'] as const){expect(input[field]).toMatch(/^ .+ $/);expect(row.normalized[field]).toBe(input[field]?.trim());}
  expect(requestBinding.profileKey).toBe(canonicalPlainJson(input));expect(requestBinding.profileKey).not.toBe(canonicalPlainJson(row.normalized));
  expect(requestBinding.fromOutputMonthStem).toBe(row.options.fromOutputMonthStem);
  const app=subject(input,response,row.options.fromOutputMonthStem);await app.controller.run();
  expect(app.calls).toEqual([{profile:before,options:row.options}]);expect(app.controller.getSnapshot().phase).toBe('ready');
  expect(app.controller.getSnapshot().result?.profileId).toBe(row.normalized.id);expect(app.controller.getSnapshot().result?.applicationGate.status).toBe('blocked');
  if(name==='multiple')expect(response.branches[0].root.consistentIds.length).toBeGreaterThan(1);
  if(name==='unknown'){expect(response.status).toBe('pending-regime-resolution');expect(response.branches.every(branch=>branch.id.startsWith(response.profileId+':calendar-interval:'))).toBe(true);}
  expect(input).toEqual(before);expect(row.raw.id).toBe('');app.controller.dispose();
 });

 it('rejects empty/non-string response IDs and branch/root IDs not belonging to the validated response',async()=>{
  const cases:{name:'unique'|'unknown';mutate:(response:RootFeedbackV132BoundPreviewResponse)=>unknown}[]=[
   {name:'unique',mutate:r=>({...r,profileId:''})},
   {name:'unique',mutate:r=>({...r,profileId:27})},
   {name:'unique',mutate:r=>{r.branches[0].id='other-server-id';r.branches[0].root.profileId='other-server-id';return r;}},
   {name:'unique',mutate:r=>{r.branches[0].root.profileId='other-root-id';return r;}},
   {name:'unknown',mutate:r=>{r.branches[0].id=':calendar-interval:0';r.branches[0].root.profileId=r.branches[0].id;return r;}},
  ];
  for(const value of cases){const row=captured.cases[value.name],bad=value.mutate(structuredClone(row.response)),app=subject(row.raw,bad,row.options.fromOutputMonthStem);
   await app.controller.run();rejected(app);app.setResponse(row.response);await app.controller.run();expect(app.controller.getSnapshot().phase).toBe('ready');app.controller.dispose();}
 });

 it('requires the original raw key and exact entry option, even for a real normalized response',async()=>{
  const row=captured.cases.unique,r=row.response;
  const wrong:unknown[]=[
   (({requestBinding,...dto})=>dto)(r),
   {...r,requestBinding:null},
   {...r,requestBinding:{...r.requestBinding,profileKey:canonicalPlainJson(row.normalized)}},
   {...r,requestBinding:{...r.requestBinding,fromOutputMonthStem:true}},
  ];
  for(const response of wrong){const app=subject(row.raw,response);await app.controller.run();rejected(app);app.setResponse(r);await app.controller.run();expect(app.controller.getSnapshot().phase).toBe('ready');app.controller.dispose();}
 });

 it.each([['birthDate','2022-02-14'],['birthTime','13:30'],['timezone','Asia/Tokyo'],['calendar','lunar'],['fatherName',' 另一个姓名 '],['motherName',' 另一个姓名 ']] as const)('rejects a different raw %s while both drafts have empty IDs',async(field,value)=>{
  const row=captured.cases.unique,input={...row.raw,[field]:value};expect(input[field]).not.toBe(row.raw[field]);
  const app=subject(input,row.response);await app.controller.run();expect(app.calls).toHaveLength(1);rejected(app);app.controller.dispose();
 });

 it('continues requiring an exact response ID for a nonempty raw ID even when metadata and branch IDs are otherwise coherent',async()=>{
  const historical=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/m793-fixed-facade-capture.json.gz',import.meta.url))).toString('utf8')).cases.unique as {profile:BirthProfile;options:{fromOutputMonthStem:boolean};dto:RootFeedbackV132FacadeDTO};
  expect(historical.profile.id).not.toBe('');const good=bindPreviewFixtureResponse(historical.dto,historical.profile,historical.options),bad=structuredClone(good);
  bad.profileId='other-generated-id';for(const branch of bad.branches){branch.id=bad.profileId;branch.root.profileId=bad.profileId;}
  const app=subject(historical.profile,bad);await app.controller.run();rejected(app);app.setResponse(good);await app.controller.run();expect(app.controller.getSnapshot().phase).toBe('ready');app.controller.dispose();
 });

 it('rejects malformed raw ID types before dispatch',async()=>{
  for(const id of [undefined,null,27]){const app=subject({...captured.cases.unique.raw,id} as unknown as BirthProfile,captured.cases.unique.response);await app.controller.run();expect(app.calls).toHaveLength(0);expect(app.controller.getSnapshot()).toMatchObject({phase:'error',errorKind:'input'});app.controller.dispose();}
 });

 it('keeps empty-ID same-owner A-to-B-to-A protection when the server allocates result IDs',async()=>{
  const row=captured.cases.unique,input=structuredClone(row.raw);let settle!:(response:RootFeedbackV132FacadeDTO)=>void,calls=0;
  const api:BaziRootFeedbackV132PreviewApi={previewBaziRootFeedbackV132:async()=>++calls===1?new Promise<RootFeedbackV132FacadeDTO>(resolve=>{settle=resolve;}):structuredClone(row.response)};
  const controller=createV132PreviewController({getProfile:()=>input,getApi:()=>api});controller.activate();const old=controller.run();
  input.birthDate='2022-02-14';controller.refresh();input.birthDate=row.raw.birthDate;controller.refresh();await controller.run();
  expect(controller.getSnapshot().phase).toBe('ready');const ready=controller.getSnapshot();settle(structuredClone(row.response));await old;
  expect(controller.getSnapshot()).toBe(ready);expect(calls).toBe(2);expect(input.id).toBe('');controller.dispose();
 });
});
