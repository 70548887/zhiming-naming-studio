import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildProjectApplicationV132R2} from '../scripts/build-project-application-v132-r2.mjs';
import {createCandidate2NamingConsumer} from '../src/main/candidate2-naming-consumer-v1';
import {CANDIDATE2_NAMING_SELECTION} from '../src/shared/candidate2-naming-consumer-v1';
import type {Candidate2NamingGeneration,Candidate2NamingReplayContext,Candidate2NamingRequest} from '../src/shared/candidate2-naming-consumer-v1';
import {normalizePreferences} from '../src/shared/workflow';
import {canonicalPlainJson} from '../src/shared/plain-json';
import {analyzeProfile} from '../src/domain/engine';
import fixture from './fixtures/project-naming-use-m153.json';
import type {BirthProfile,NamingPreferences} from '../src/shared/types';

const root=path.resolve('.');
const tempParent=fs.realpathSync(os.tmpdir());
const owned=fs.mkdtempSync(path.join(tempParent,'m803-candidate2-flow-'));
const bundle=path.join(owned,'candidate2.cjs');
const profile=structuredClone(fixture.positive.profile) as BirthProfile;
const preferences=normalizePreferences({length:1,requiredChars:'沐',zodiacRules:false,numerology:false});
const request:Candidate2NamingRequest={profile,preferences,selection:CANDIDATE2_NAMING_SELECTION,seed:17,excludeNames:[]};
const context:Candidate2NamingReplayContext={profile,preferences,selection:CANDIDATE2_NAMING_SELECTION};
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
const digest=(value:unknown)=>createHash('sha256').update(canonicalPlainJson(value)).digest('hex');
const summary:Record<string,unknown>={};
let consumer:ReturnType<typeof createCandidate2NamingConsumer>;
let live:Candidate2NamingGeneration;
let saved:Candidate2NamingGeneration;

function factory(dataDir=path.join(root,'data')){
 return createCandidate2NamingConsumer({applicationBundlePath:bundle,assetDir:path.join(root,'assets'),dataDir,namingRulesVersion:'naming-editorial-7.1.0'});
}
function rehash<T extends {digest:string}>(value:T):T {
 const {digest:_previous,...body}=value;
 value.digest=digest(body);
 return value;
}
function forgedRecord(change:(value:Candidate2NamingGeneration)=>void):Candidate2NamingGeneration {
 const value=clone(saved);change(value);return rehash(value);
}
function rejectSaved(value:unknown,realContext:Candidate2NamingReplayContext=context){
 expect(()=>consumer.verifySaved(value,realContext)).toThrow();
}
function physicalPackage(label:string){
 const directory=path.join(owned,label);fs.mkdirSync(directory,{recursive:true});
 for(const name of ['knowledge-v6.sqlite','dataset-v6.json'])fs.copyFileSync(path.join(root,'data',name),path.join(directory,name));
 return directory;
}

beforeAll(async()=>{
 const rawRequest=clone(request),rawBase=analyzeProfile(profile);
 const receipt=await buildProjectApplicationV132R2({root,outfile:bundle});
 consumer=factory();
 const result=consumer.generate(request);
 expect(result.status).toBe('generated');
 if(result.status!=='generated')throw Error('M803 positive generation unavailable');
 live=result;saved=consumer.createSaved(live);
 expect(request).toEqual(rawRequest);
 expect(live.baseAnalysis).toEqual(rawBase);
 summary.build={identity:receipt.identity,output:receipt.output};
 summary.positive={status:live.status,profileId:live.profile.id,coreElements:live.application.application.elements,candidates:live.candidates.map(candidate=>({givenName:candidate.givenName,traditional:candidate.evaluation.traditional,origin:candidate.origin})),originalPreferredElements:live.preferences.preferredElements,legacyFavorable:live.baseAnalysis.bazi.favorable,dataIdentity:{packSha256:live.dataIdentity.packSha256,semanticSha256:live.dataIdentity.semanticSha256,namingRulesVersion:live.dataIdentity.namingRulesVersion},domainProjection:live.domainProjection};
},60000);

afterAll(()=>{
 const directory=process.env.M803_EVIDENCE_DIR;
 if(directory){
  fs.mkdirSync(path.resolve(directory),{recursive:true});
  const target=path.join(path.resolve(directory),'m803-candidate2-flow-summary.json'),temporary=target+'.tmp';
  fs.writeFileSync(temporary,JSON.stringify(summary,null,2)+'\n');fs.renameSync(temporary,target);
 }
 const resolved=path.resolve(owned);
 if(path.dirname(resolved)!==tempParent||!path.basename(resolved).startsWith('m803-candidate2-flow-'))throw Error('M803 unsafe owned temporary cleanup');
 fs.rmSync(resolved,{recursive:true,force:true});
});

describe('M803 candidate.2 real naming generation and saved replay',()=>{
 it('feeds certified 土金 into the real 7.1 domain and produces 林沐 with project score 40',()=>{
  expect(live.consumerVersion).toBe('candidate2-naming-consumer/1.0.0');
  const candidate=live.candidates.find(item=>item.givenName==='沐');
  expect(candidate).toBeDefined();
  expect(candidate!.fullName).toBe('林沐');
  expect(candidate!.origin).toBe('local');
  expect(candidate!.evaluation.traditional).toBe(fixture.positive.expectedTraditional);
  expect(candidate!.traditionalReason).toContain('candidate.2');
  expect(live.application.application.elements.primary).toEqual(['土']);
  expect(live.application.application.elements.secondary).toEqual(['金']);
  expect(live.application.application.elements.applied).toEqual(['土','金']);
  expect(live.application.tuple.policyPublicationId).toBe('project-naming-application/1.3.2-candidate.2');
  expect(live.application.certificate.traditionalStatus).toBe('unknown');
  expect(live.preferences).toEqual(preferences);
  expect(live.preferences.preferredElements).toEqual([]);
  expect(live.profile.namingPreferences).toEqual(preferences);
  expect(live.baseAnalysis.bazi.favorable).toEqual(fixture.positive.legacyElements);
  expect(live.baseAnalysis).not.toHaveProperty('projectNamingUse');
  expect(live.domainProjection).toMatchObject({source:'candidate.2-authorized-elements',applied:['土','金'],userManualElements:[],baseAnalysisUnchanged:true,domainEntry:'generateLocalForRuleVersionWithContext',namingRulesVersion:'naming-editorial-7.1.0'});
  expect(live.domainProjection.originalPreferencesDigest).toBe(digest(preferences));
  expect(live.domainProjection.effectivePreferencesDigest).not.toBe(live.domainProjection.originalPreferencesDigest);
 });

 it('is deterministic without changing caller profile, preferences, exclusions or base analysis',()=>{
  const raw=clone(request),base=analyzeProfile(profile);
  const again=consumer.generate(request);
  expect(again).toEqual(live);
  expect(request).toEqual(raw);
  expect(profile).toEqual(fixture.positive.profile);
  expect(preferences.preferredElements).toEqual([]);
  expect(analyzeProfile(profile)).toEqual(base);
  expect(Object.isFrozen(live)).toBe(true);
  expect(Object.isFrozen(live.candidates[0].evaluation)).toBe(true);
 });

 it('roundtrips independent saved JSON with the real replay context and no generation authority',()=>{
  const imported=clone(saved),before=clone(imported);
  expect(imported.schema).toBe('candidate2-naming-generation/1');
  expect(imported.application.schema).toBe('project-naming-use/2');
  const verified=consumer.verifySaved(imported,context);
  expect(verified).toMatchObject({schema:'candidate2-naming-verification/1',status:'verified-saved',generationAuthority:false,replayOrigin:'saved-replay',profileId:profile.id,candidateCount:live.candidates.length,recordDigest:saved.digest});
  expect(imported).toEqual(before);
  expect(factory().verifySaved(clone(saved),context)).toEqual(verified);
  summary.replay=verified;
 });

 it('captures only this consumer live generations, never clones, replay results or another consumer generations',()=>{
  expect(consumer.createSaved(live)).toEqual(saved);
  expect(()=>consumer.createSaved(clone(live))).toThrow('GENERATION_REQUIRED');
  const verified=consumer.verifySaved(clone(saved),context);
  expect(()=>consumer.createSaved(verified as unknown as Candidate2NamingGeneration)).toThrow('GENERATION_REQUIRED');
  expect(()=>factory().createSaved(live)).toThrow('GENERATION_REQUIRED');
 });

 it('keeps omitted or explicitly disabled selection disabled with no candidates',()=>{
  const {selection:_selected,...unselected}=request;
  expect(consumer.generate(unselected)).toEqual({schema:'candidate2-naming-generation/1',status:'disabled',consumerVersion:'candidate2-naming-consumer/1.0.0'});
  const disabled=consumer.generate({...request,selection:{enabled:false}});
  expect(disabled.status).toBe('disabled');expect(disabled).not.toHaveProperty('candidates');
 });

 it.each([
  {label:'old 1.3.1 method',selection:{...CANDIDATE2_NAMING_SELECTION,methodId:'project-bazi-mainchain-145/1.3.1'}},
  {label:'candidate.1 publication',selection:{...CANDIDATE2_NAMING_SELECTION,policyId:'naming-element-application/1.3.2-candidate.1',publicationId:'project-naming-application/1.3.2-candidate.1'}},
 ])('rejects $label selection without an old-method fallback',({selection})=>{
  expect(()=>consumer.generate({...request,selection} as Candidate2NamingRequest)).toThrow('UNSUPPORTED_SELECTION');
 });

 it.each([
  {label:'unknown hour',profile:{...profile,id:'m803-unknown',birthTime:'',timeUnknown:true}},
  {label:'multiple roots',profile:{...profile,id:'m803-multi',birthDate:'1990-12-05',birthTime:'08:00'}},
  {label:'competing balanced opinions',profile:{...fixture.negative.profile,id:'m803-competing'} as BirthProfile},
 ])('refuses real $label application instead of generating with legacy elements',({profile:birth})=>{
  expect(()=>consumer.generate({...request,profile:birth})).toThrow('APPLICATION_REJECTED');
 });

 it('rejects nonempty manual elements and legacy namingElementMethod conflicts',()=>{
  expect(()=>consumer.generate({...request,preferences:{...preferences,preferredElements:['木']}})).toThrow('CONFLICT');
  const legacy: NamingPreferences={...preferences,namingElementMethod:{methodId:'project-bazi-mainchain-145/1.3.1',entryPolicy:'month-branch-only'}};
  expect(()=>consumer.generate({...request,preferences:legacy})).toThrow('CONFLICT');
  expect(()=>consumer.generate({...request,profile:{...profile,namingPreferences:{...preferences,preferredElements:['金']}}})).toThrow('CONFLICT');
 });

 it('rejects score and semantic candidate forgeries even after recomputing the public envelope digest',()=>{
  const score=forgedRecord(value=>{value.candidates[0].evaluation.traditional=100;});
  expect(score.digest).toBe(digest((({digest:_hash,...body})=>body)(score)));
  rejectSaved(score);
  rejectSaved(forgedRecord(value=>{value.candidates[0].meaning+='伪造';}));
  rejectSaved(forgedRecord(value=>{value.domainProjection.applied=['火'];}));
 });

 it.each([
  {label:'pack digest',change:(value:Candidate2NamingGeneration)=>{value.dataIdentity.packSha256='0'.repeat(64);}},
  {label:'semantic digest',change:(value:Candidate2NamingGeneration)=>{value.dataIdentity.semanticSha256='1'.repeat(64);}},
  {label:'dataset metadata version',change:(value:Candidate2NamingGeneration)=>{value.dataIdentity.metadataVersion='forged-version';}},
  {label:'source provenance',change:(value:Candidate2NamingGeneration)=>{value.dataIdentity.sources[0].sha256='2'.repeat(64);}},
 ])('rejects changed $label regardless of a self-consistent envelope hash',({change})=>{
  expect(()=>consumer.verifySaved(forgedRecord(change),context)).toThrow('DATA_MISMATCH');
 });

 it('rereads physical package bytes and rejects changed semantic, source or metadata records before naming',()=>{
  for(const kind of ['semantic','source','version'] as const){
   const directory=physicalPackage('changed-dataset-'+kind),file=path.join(directory,'dataset-v6.json');
   const dataset=JSON.parse(fs.readFileSync(file,'utf8')) as {version:string;characters:{meaning:string}[];sources:{sha256:string}[]};
   if(kind==='semantic')dataset.characters[0].meaning+='changed';
   else if(kind==='source')dataset.sources[0].sha256='0'.repeat(64);
   else dataset.version='forged-version';
   fs.writeFileSync(file,JSON.stringify(dataset));
   const changed=factory(directory);
   expect(()=>changed.generate(request)).toThrow('CANDIDATE2_NAMING_DATA_INVALID');
   expect(()=>changed.verifySaved(clone(saved),context)).toThrow('CANDIDATE2_NAMING_DATA_INVALID');
  }
 });

 it.each([
  {label:'birth date',change:{birthDate:'2022-02-14'}},
  {label:'recorded time',change:{birthTime:'12:30'}},
  {label:'profile identity',change:{id:'m803-another-profile'}},
  {label:'surname',change:{surname:'陈',surnamePinyin:'chén'}},
  {label:'father',change:{fatherName:'林改名'}},
  {label:'mother',change:{motherName:'陈改名'}},
 ])('rejects a replay context with the wrong $label',({change})=>{
  expect(()=>consumer.verifySaved(clone(saved),{...context,profile:{...profile,...change}})).toThrow('PROFILE_MISMATCH');
 });

 it('rejects wrong replay preferences and selection, including disabled selection',()=>{
  expect(()=>consumer.verifySaved(clone(saved),{...context,preferences:{...preferences,requiredChars:'安'}})).toThrow('PROFILE_MISMATCH');
  rejectSaved(clone(saved),{...context,selection:{...CANDIDATE2_NAMING_SELECTION,publicationId:'project-naming-application/1.3.2-candidate.1'}} as unknown as Candidate2NamingReplayContext);
  rejectSaved(clone(saved),{...context,selection:{enabled:false}} as unknown as Candidate2NamingReplayContext);
 });

 it('rejects forged core application elements, tuple and sources after rehashing every public layer',()=>{
  for(const target of ['elements','tuple','source'] as const){
   const forged=clone(saved);
   if(target==='elements'){
    forged.application.application.elements.primary=['火'];forged.application.application.elements.applied=['火'];
    forged.application.certificate.effectiveElements.primary=['火'];forged.application.certificate.effectiveElements.applied=['火'];
   }else if(target==='tuple'){
    forged.application.tuple.policyPublicationId='project-naming-application/1.3.2-candidate.1' as never;
    forged.application.certificate.tuple.policyPublicationId='project-naming-application/1.3.2-candidate.1' as never;
   }else forged.application.certificate.sources[0].sha256='f'.repeat(64);
   rehash(forged.application.certificate);rehash(forged.application);rehash(forged);
   rejectSaved(forged);
  }
 });

 it('rejects caller-supplied analysis, capability, data and generator inputs',()=>{
  for(const key of ['baseAnalysis','application','namingInput','characters','generator']){
   expect(()=>consumer.generate({...request,[key]:{claimed:true}} as Candidate2NamingRequest)).toThrow('INPUT_INVALID');
  }
 });
});
