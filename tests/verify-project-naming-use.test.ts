import {afterEach,beforeAll,expect,it,vi} from 'vitest';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {analyzeProfile} from '../src/domain/engine';
import {createNamingElementResolver} from '../src/main/naming-element-resolution';
import {createBaziRootFeedbackFacade,verifyFixedRootFeedbackBaseFacts,type BaziRootFeedbackFacade} from '../src/main/bazi-root-feedback-facade';
import {loadRootFeedbackResources,type VerifiedRootFeedbackResources} from '../src/main/bazi-root-feedback-resources';
import {buildProjectNamingUseSnapshot} from '../src/main/project-naming-use';
import {verifySavedProjectNamingUse,hasProjectNamingUseFootprint,assertVerifiedSavedProjectNamingBasis} from '../src/main/verify-project-naming-use';
import {rootFeedbackCanonicalDigest} from '../src/main/bazi-root-feedback-application';
import {normalizePreferences} from '../src/shared/workflow';
import {createSessionSourceSnapshot} from '../src/shared/session-sources';
import {NAMING_RULE_V7_SOURCE_ID} from '../src/shared/naming-rules';
import type {BirthProfile,NamingSession,SourceRecord} from '../src/shared/types';
import type {ProjectNamingUseSnapshot} from '../src/shared/project-naming-use';
import fixture from './fixtures/project-naming-use-m153.json';

type Saved=NamingSession&{analysis:NamingSession['analysis']&{projectNamingUse?:ProjectNamingUseSnapshot}};
const version='naming-editorial-7.0.0';
const configuration={assetDir:resolve(process.env.PROJECT_REPLAY_TEST_ROOT??'.','assets'),dataDir:resolve(process.env.PROJECT_REPLAY_TEST_ROOT??'.','data')};
let resources:VerifiedRootFeedbackResources,facade:BaziRootFeedbackFacade,original:Saved;
const deps=()=>({facade,fixedSourceRecords:resources.sources});
const copy=()=>structuredClone(original);
const jsonHash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
beforeAll(()=>{
 resources=loadRootFeedbackResources(configuration);facade=createBaziRootFeedbackFacade(resources);
 const preferences={...normalizePreferences({preferredElements:[],zodiacRules:false,numerology:false}),namingElementMethod:{methodId:fixture.methodId as 'project-bazi-mainchain-145/1.3.1',entryPolicy:'month-branch-only' as const}};
 const profile={...structuredClone(fixture.positive.profile),namingPreferences:preferences} as BirthProfile;
 const base=analyzeProfile(profile),resolution=createNamingElementResolver(configuration).resolve(profile,preferences,base,version);
 const snapshot=buildProjectNamingUseSnapshot(resolution,version);if(!snapshot)throw Error('Actual branded producer must yield project snapshot');
 original=JSON.parse(JSON.stringify({id:'m156-real-saved-replay',profileId:profile.id,createdAt:'2026-10-22T00:00:00.000Z',profile,preferences,analysis:{...base,projectNamingUse:snapshot},candidates:[],reviewNote:'',originalFavorable:[...base.bazi.favorable],dataVersion:'2026.10.20.2',namingRules:{dataVersion:'2026.10.20.2',version,sourceId:NAMING_RULE_V7_SOURCE_ID},sourceSnapshot:createSessionSourceSnapshot('2026.10.20.2',resources.sources)})) as Saved;
},15000);
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});

it('replays the real fixed facade against the owner branded snapshot, returns a frozen capability and leaves the complete saved DTO unchanged',()=>{
 const session=copy(),before=jsonHash(session),preview=vi.spyOn(facade,'previewBaziRootFeedbackProfile'),replay=vi.spyOn(facade,'fromVerifiedFixedBase'),fetch=vi.fn(()=>{throw Error('AI/current transport must not execute');});vi.stubGlobal('fetch',fetch);
 const basis=verifySavedProjectNamingUse(session,deps());
 expect(basis).toEqual({source:'project',elements:fixture.positive.expectedElements,selection:session.analysis.projectNamingUse!.selection,applicationPolicyVersion:'naming-element-application/1.0.0'});
 expect(()=>assertVerifiedSavedProjectNamingBasis(basis)).not.toThrow();
 expect(Object.isFrozen(basis)).toBe(true);expect(Object.isFrozen(basis!.elements)).toBe(true);expect(Object.isFrozen(basis!.selection)).toBe(true);
 expect(preview).not.toHaveBeenCalled();expect(replay).toHaveBeenCalledTimes(1);expect(fetch).not.toHaveBeenCalled();expect(jsonHash(session)).toBe(before);
});
it('uses generation preferences while retaining a later manual review draft without reinterpreting it as adopted elements',()=>{
 const session=copy();session.preferences.preferredElements=['水'];
 const before=jsonHash(session);expect(verifySavedProjectNamingUse(session,deps())!.elements).toEqual(['土','金']);expect(session.preferences.preferredElements).toEqual(['水']);expect(jsonHash(session)).toBe(before);
});
it('retains existing optional own-undefined birth-field semantics without relaxing an explicit undefined method',()=>{
 const session=copy();session.profile.fatherName=undefined;session.profile.birthLongitude=undefined;
 expect(verifySavedProjectNamingUse(session,deps())!.elements).toEqual(['土','金']);
 (session.profile.namingPreferences as any).namingElementMethod=undefined;
 expect(()=>verifySavedProjectNamingUse(session,deps())).toThrow();
});
it('does not grant a verified capability to a client-shaped basis, a clone or a serialized genuine basis',()=>{
 const genuine=verifySavedProjectNamingUse(copy(),deps())!;
 for(const untrusted of [{...genuine},structuredClone(genuine),JSON.parse(JSON.stringify(genuine)),{source:'project',elements:['土','金']}])expect(()=>assertVerifiedSavedProjectNamingBasis(untrusted)).toThrow('真实固定重放');
 expect(()=>assertVerifiedSavedProjectNamingBasis(genuine)).not.toThrow();
});
it('returns legacy only after complete footprint absence and never evaluates lazy dependency getters',()=>{
 const legacy=copy();delete legacy.analysis.projectNamingUse;delete (legacy.profile.namingPreferences as any).namingElementMethod;delete (legacy.preferences as any).namingElementMethod;legacy.sourceSnapshot!.sources=[];legacy.profile.namingPreferences!.preferredElements=['水'];
 let reads=0;const unavailable:any={};for(const key of ['facade','fixedSourceRecords'])Object.defineProperty(unavailable,key,{enumerable:true,get(){reads++;throw Error('Legacy must not load new assets');}});
 expect(hasProjectNamingUseFootprint(legacy)).toBe(false);expect(verifySavedProjectNamingUse(legacy,unavailable)).toBeUndefined();expect(reads).toBe(0);
});
it('detects explicit undefined, malformed method fragments, recipe remnants and either reserved source record',()=>{
 const legacy:any={profile:{namingPreferences:{preferredElements:[]}},preferences:{preferredElements:[]},analysis:{},sourceSnapshot:{sources:[]}};
 const values=[{...legacy,analysis:{projectNamingUse:undefined}},{...legacy,profile:{namingPreferences:{namingElementMethod:undefined}}},{...legacy,preferences:{namingElementMethod:{}}},{...legacy,sourceRecipe:undefined},...['project-bazi-mainchain-145','naming-element-application-v1'].map(id=>({...legacy,sourceSnapshot:{sources:[{id}]}}))];
 for(const session of values){expect(hasProjectNamingUseFootprint(session)).toBe(true);expect(()=>verifySavedProjectNamingUse(session as Saved,deps())).toThrow();}
});
it('reads footprint descriptors without invoking getters, including opaque parents and reserved source IDs',()=>{
 let calls=0;const getter=()=>{calls++;throw Error('Getter must not run');};
 const analysis={};Object.defineProperty(analysis,'projectNamingUse',{enumerable:true,get:getter});
 const profile={};Object.defineProperty(profile,'namingPreferences',{enumerable:true,get:getter});
 const source={};Object.defineProperty(source,'id',{enumerable:true,get:getter});
 for(const value of [{analysis},{profile},{sourceSnapshot:{sources:[source]}}])expect(hasProjectNamingUseFootprint(value)).toBe(true);
 const extraSources:any[]=[];Object.defineProperty(extraSources,'alias',{enumerable:true,get:getter});expect(hasProjectNamingUseFootprint({sourceSnapshot:{sources:extraSources}})).toBe(true);
 expect(hasProjectNamingUseFootprint({sourceSnapshot:{sources:[{id:undefined}]}})).toBe(true);
 for(const key of ['profile','analysis','sourceSnapshot']){const value={};Object.defineProperty(value,key,{enumerable:true,get:getter});expect(hasProjectNamingUseFootprint(value)).toBe(true);expect(()=>verifySavedProjectNamingUse(value as Saved,deps())).toThrow();}
 const forged=copy();Object.defineProperty(forged.analysis.projectNamingUse!.engineCertificate,'digest',{enumerable:true,get:getter});expect(()=>verifySavedProjectNamingUse(forged,deps())).toThrow();
 expect(calls).toBe(0);
});
it('rejects partial deletion of generation selection, snapshot, recipe or retained sources rather than downgrading',()=>{
 const mutations=[(s:any)=>{delete s.profile.namingPreferences;},(s:any)=>{delete s.profile.namingPreferences.namingElementMethod;},(s:any)=>{delete s.preferences.namingElementMethod;},(s:any)=>{delete s.analysis.projectNamingUse;},(s:any)=>{delete s.analysis.projectNamingUse.sourceRecipe;},(s:any)=>{s.sourceSnapshot.sources=[];}];
 for(const mutate of mutations){const session=copy();mutate(session);expect(hasProjectNamingUseFootprint(session)).toBe(true);expect(()=>verifySavedProjectNamingUse(session,deps())).toThrow();}
});
it('rejects unregistered version tuples, entry mismatches and generation manual conflicts before fallback',()=>{
 const mutations=[(s:any)=>{s.namingRules.version='naming-editorial-6.0.0';},(s:any)=>{s.namingRules.version='naming-editorial-7.1.0';},(s:any)=>{s.profile.namingPreferences.namingElementMethod.methodId='project-bazi-mainchain-145/1.3.0';s.profile.namingPreferences.preferredElements=['水'];},(s:any)=>{s.analysis.projectNamingUse.sourceRecipe.applicationPolicyVersion='naming-element-application/2.0.0';},(s:any)=>{s.analysis.projectNamingUse.sourceRecipe.namingRulesVersion='naming-editorial-7.1.0';},(s:any)=>{s.analysis.projectNamingUse.selection.entryPolicy='month-stem-proposal';},(s:any)=>{s.profile.namingPreferences.preferredElements=['水'];}];
 for(const mutate of mutations){const session=copy();mutate(session);expect(()=>verifySavedProjectNamingUse(session,deps())).toThrow();}
});
it('compares the full engine certificate even when the original digest is retained or a modified certificate gets a valid self digest',()=>{
 for(const regenerate of [false,true]){
  const session=copy(),certificate=session.analysis.projectNamingUse!.engineCertificate,previousDigest=certificate.digest;
  certificate.auxiliary.limitations.push('Injected body field under a plausible digest');
  if(regenerate){const {digest,...body}=certificate;certificate.digest=rootFeedbackCanonicalDigest(body);expect(certificate.digest).not.toBe(previousDigest);}else expect(certificate.digest).toBe(previousDigest);
  expect(()=>verifySavedProjectNamingUse(session,deps())).toThrow('完整保存快照');
 }
});
it('rejects body-preserving adoption-array changes and extra snapshot/client verification fields',()=>{
 for(const mutate of [(s:any)=>{s.analysis.projectNamingUse.application.primary=['水'];},(s:any)=>{s.analysis.projectNamingUse.application.secondary=['水'];},(s:any)=>{s.analysis.projectNamingUse.application.avoid=['土'];},(s:any)=>{s.analysis.projectNamingUse.application.effectiveElements=['水'];},(s:any)=>{s.analysis.projectNamingUse.verified=true;},(s:any)=>{s.analysis.projectNamingUse.schema='project-naming-use/2';}]){const session=copy();mutate(session);expect(()=>verifySavedProjectNamingUse(session,deps())).toThrow();}
});
it('rechecks saved birth and base facts and rejects an actual fixed replay whose gate is blocked',()=>{
 const changedBirth=copy();changedBirth.profile.birthDate='2022-02-14';expect(()=>verifySavedProjectNamingUse(changedBirth,deps())).toThrow();
 const changedBase=copy();changedBase.analysis.bazi.favorable=['水'];expect(()=>verifySavedProjectNamingUse(changedBase,deps())).toThrow();
 const blocked=copy();blocked.profile={...structuredClone(fixture.negative.profile),namingPreferences:structuredClone(original.profile.namingPreferences)} as BirthProfile;blocked.profileId=blocked.profile.id;
 const base=JSON.parse(JSON.stringify(analyzeProfile(blocked.profile)));blocked.analysis={...base,projectNamingUse:blocked.analysis.projectNamingUse};
 const facts=verifyFixedRootFeedbackBaseFacts(blocked.profile,base);expect(facade.fromVerifiedFixedBase(facts).applicationGate.status).toBe('blocked');
 expect(()=>verifySavedProjectNamingUse(blocked,deps())).toThrow('没有通过');
});
it('authenticates complete retained SourceRecord fields, duplicates and fixed-source/actual-certificate publication mismatches',()=>{
 for(const key of ['name','url','commit','license','sha256','note'] as const){const session=copy();session.sourceSnapshot!.sources[0][key]+='changed';expect(()=>verifySavedProjectNamingUse(session,deps())).toThrow('保留来源');}
 const missing=copy();missing.sourceSnapshot!.sources.pop();expect(()=>verifySavedProjectNamingUse(missing,deps())).toThrow();
 const duplicate=copy();duplicate.sourceSnapshot!.sources.push(structuredClone(duplicate.sourceSnapshot!.sources[0]));expect(()=>verifySavedProjectNamingUse(duplicate,deps())).toThrow();
 const replaced=copy(),fixed=structuredClone(resources.sources) as SourceRecord[];for(const record of fixed){record.sha256='0'.repeat(64);const saved=replaced.sourceSnapshot!.sources.find(source=>source.id===record.id)!;saved.sha256=record.sha256;}
 expect(()=>verifySavedProjectNamingUse(replaced,{facade,fixedSourceRecords:fixed})).toThrow('出版身份');
});
