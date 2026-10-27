import {createHash} from 'node:crypto';
import {snapshotApplicationJson} from './project-application-v132-r2-json';
import {canonicalPlainJson} from '../shared/plain-json';
import {normalizePreferences} from '../shared/workflow';
import {generateCandidate2DomainV1} from '../domain/candidate2-naming-consumer-v1';
import {finalizeNamingCandidateForRuleVersion} from './naming-meaning-review';
import {loadCandidate2NamingRuntime} from './candidate2-naming-runtime-v1';
import {loadCandidate2NamingData} from './candidate2-naming-data-v1';
import {CANDIDATE2_NAMING_CONSUMER_VERSION,CANDIDATE2_NAMING_SELECTION} from '../shared/candidate2-naming-consumer-v1';
import type {Candidate2NamingRequest,Candidate2NamingGeneration,Candidate2NamingFlowResult,Candidate2NamingReplayContext,Candidate2NamingVerification,Candidate2DomainProjection} from '../shared/candidate2-naming-consumer-v1';
import type {Analysis,BirthProfile,NamingPreferences,Element} from '../shared/types';
import type * as Candidate2Application from './project-application-v132-r2';
import type {ProjectApplicationNamingInput} from '../shared/project-application-v132-r2';
import type {Candidate2NamingEligibility,Candidate2EligibilityRequest} from '../shared/candidate2-naming-eligibility-v1';
import {captureEligibilityRequest,eligibilityCoreReason,eligibilityFailure,eligibilityResponse} from './candidate2-naming-eligibility-response-v1';

export type * from '../shared/candidate2-naming-consumer-v1';
export type * from '../shared/candidate2-naming-eligibility-v1';
const digest=(value:unknown)=>createHash('sha256').update(canonicalPlainJson(value)).digest('hex');
const same=(a:unknown,b:unknown)=>canonicalPlainJson(a)===canonicalPlainJson(b);
const owned=<T>(value:T):T=>snapshotApplicationJson(value) as T;
const fail=(code:string,message:string):never=>{throw Object.assign(new Error('CANDIDATE2_NAMING_'+code+': '+message),{code:'CANDIDATE2_NAMING_'+code});};
function exact(value:unknown,keys:string[]):asserts value is Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||keys.some(key=>!Object.hasOwn(value,key)))fail('INPUT_INVALID','exact fields required');}
function selection(value:unknown):boolean {
 if(value===undefined)return false;
 if(same(value,{enabled:false}))return false;
 if(!same(value,CANDIDATE2_NAMING_SELECTION))fail('UNSUPPORTED_SELECTION','explicit exact candidate.2 opt-in required; no old-version fallback');
 return true;
}
function preferences(value:NamingPreferences):NamingPreferences {
 if(!value||typeof value!=='object'||Array.isArray(value))fail('INPUT_INVALID','preferences must be an owned data object');
 if(Object.hasOwn(value,'namingElementMethod'))fail('CONFLICT','legacy project method cannot be mixed with candidate.2');
 let pref:NamingPreferences;
 try{pref=normalizePreferences(value);}catch{return fail('INPUT_INVALID','preferences failed normalization');}
 if(!Array.isArray(pref.preferredElements)||pref.preferredElements.length)fail('CONFLICT','original user manual elements must be empty');
 // These product enrichments require their own Service resources. Refusing
 // them here keeps this scoped consumer from silently omitting requested work.
 if(pref.numerology||pref.imageryReading||pref.yueReading||pref.elementAssessment||pref.wordPronunciationReference||pref.namePhonetics||pref.parentNamePhonetics&&pref.parentNamePhonetics!=='none'||pref.yueHomophones&&pref.yueHomophones!=='none')fail('UNSUPPORTED_FEATURE','optional product enrichment belongs to the owning Service pipeline');
 return owned(pref);
}
function birth(value:BirthProfile,pref:NamingPreferences):BirthProfile {
 if(!value||typeof value!=='object'||Array.isArray(value))fail('INPUT_INVALID','profile must be an owned data object');
 if(value.namingPreferences!==undefined&&!same(preferences(value.namingPreferences),pref))fail('PROFILE_MISMATCH','profile naming preferences differ from this generation');
 return owned({...value,namingPreferences:pref});
}
function mechanics(seed:unknown,excluded:unknown):{seed:number;excludeNames:string[]} {
 const fixedSeed=seed??0,excludeNames=excluded??[];
 if(typeof fixedSeed!=='number'||!Number.isSafeInteger(fixedSeed)||!Array.isArray(excludeNames)||excludeNames.length>10000||excludeNames.some(name=>typeof name!=='string'||name.length>100))return fail('INPUT_INVALID','invalid deterministic seed or exclusions');
 return{seed:fixedSeed,excludeNames:[...excludeNames]};
}
/** Generation and saved replay admit the same real domain output. A reader
 * must not certify an empty result that the live generator cannot issue. */
function assertGeneratedCandidates(output:{candidates:readonly unknown[]}):void {
 if(!output.candidates.length)fail('NO_CANDIDATES','no legitimate candidates passed the real domain constraints');
}
/** Candidate-only bridge. Product Service chooses this explicit factory and
 * persists its independent envelope; old NamingSession readers are unchanged. */
export function createCandidate2NamingConsumer(configuration:{applicationBundlePath:string;assetDir:string;dataDir:string;namingRulesVersion:'naming-editorial-7.1.0'}) {
 const config=owned(configuration);exact(config,['applicationBundlePath','assetDir','dataDir','namingRulesVersion']);
 if(config.namingRulesVersion!=='naming-editorial-7.1.0')fail('UNSUPPORTED_NAMING_VERSION','only the exact reviewed 7.1 consumer tuple is supported');
 const api:typeof Candidate2Application=loadCandidate2NamingRuntime(config.applicationBundlePath),application=api.createProjectApplicationV132R2({assetDir:config.assetDir});
 const generations=new WeakSet<object>();
 function data(){return loadCandidate2NamingData(config.dataDir,config.namingRulesVersion);}
 function assertCapability(input:ProjectApplicationNamingInput,origin:'generation'|'saved-replay',profile:BirthProfile){
  api.assertProjectApplicationNamingInput(input);
  if(input.origin!==origin||input.profileId!==profile.id||input.tuple.policyPublicationId!==CANDIDATE2_NAMING_SELECTION.publicationId||!same(input.tuple,application.identity))fail('AUTHORITY_INVALID','wrong origin, profile, engine or exact application tuple');
 }
 function prepareInput(profileInput:BirthProfile,preferencesInput:NamingPreferences,selectionInput:Candidate2NamingRequest['selection']) {
  if(!selection(selectionInput))return null;
  const pref=preferences(preferencesInput),profile=birth(profileInput,pref);
  return{pref,profile};
 }
 /** Both eligibility and real generation run this fixed application and data
  * validation independently. No checked DTO or cached approval enters here. */
 function prepareAuthority(prepared:NonNullable<ReturnType<typeof prepareInput>>) {
  const resolution=application.resolve(prepared.profile,{enabled:true,entryPolicy:'month-branch-only'});
  if(resolution.status!=='applicable')return{resolution} as const;
  const resources=data();return{resolution,resources} as const;
 }
 function candidates(profile:BirthProfile,pref:NamingPreferences,base:Analysis,applied:Element[],seed:number,excluded:string[],resources:ReturnType<typeof data>){
  const generated=generateCandidate2DomainV1(profile,pref,base,resources.characters,resources.citations,resources.context,applied,seed,excluded);
  const domainProjection:Candidate2DomainProjection={schema:'candidate2-domain-element-projection/1',source:'candidate.2-authorized-elements',originalPreferencesDigest:digest(pref),effectivePreferencesDigest:digest(generated.computationPreferences),applied:[...applied],userManualElements:[],baseAnalysisUnchanged:true,domainEntry:'generateLocalForRuleVersionWithContext',namingRulesVersion:'naming-editorial-7.1.0',limitation:'private numeric input projection; not user manual intent or old project tuple; avoid is not a hard filter'};
  const finalized=generated.candidates.map((candidate,index)=>{
   const result=finalizeNamingCandidateForRuleVersion('naming-editorial-7.1.0',candidate,profile,generated.computationPreferences,base,resources.context,resources.review71);
   const id='candidate2-naming-v1:'+digest({profileId:profile.id,preferences:pref,seed,excluded,name:result.givenName,index,data:resources.identity,tuple:application.identity});
   return{...result,id,traditionalReason:'项目 candidate.2 / consumer 1.0：仅按已认证项目元素作选字参考，不是客户人工选择或完整传统用神。'+result.traditionalReason};
  });
  return{candidates:finalized,domainProjection,messages:[...generated.messages,'本批采用独立 candidate.2 项目意见；原用户偏好和基础分析保持原样，尚未接入生产保存入口。']};
 }
 return Object.freeze({
  consumerVersion:CANDIDATE2_NAMING_CONSUMER_VERSION,
  checkEligibility(profileInput:BirthProfile,preferencesInput:NamingPreferences,selectionInput?:Candidate2NamingRequest['selection']):Candidate2NamingEligibility {
   let request:Candidate2EligibilityRequest|null=null;
   try{
    request=captureEligibilityRequest(profileInput,preferencesInput,selectionInput);
    const prepared=prepareInput(request.profile,request.preferences,(request.selectionWasProvided?request.selection:undefined) as Candidate2NamingRequest['selection']);
    if(!prepared)return eligibilityResponse('disabled',request,[{code:'not-selected',message:'尚未明确开启 candidate.2，本次不采用新取法。'}]);
    const validated=prepareAuthority(prepared);
    if(validated.resolution.status!=='applicable')return eligibilityResponse('blocked',request,validated.resolution.reasons.map(reason=>eligibilityCoreReason(reason.code)));
    if(!validated.resources)throw Error('CANDIDATE2_NAMING_AUTHORITY_INVALID');
    const certificate=validated.resolution.certificate;
    return eligibilityResponse('eligible',request,[],{
     application:{tuple:certificate.tuple,branch:certificate.branch,elements:certificate.effectiveElements,numerical:{iterations:certificate.numerical.iterations,errorBound:certificate.numerical.errorBound,residualL1UpperBound:certificate.numerical.residualL1UpperBound},sources:certificate.sources},
     dataIdentity:validated.resources.identity,normalizedInputDigest:digest({profile:prepared.profile,preferences:prepared.pref,selection:CANDIDATE2_NAMING_SELECTION}),
    });
   }catch(error){return eligibilityFailure(error,request);}
  },
  generate(raw:Candidate2NamingRequest):Candidate2NamingFlowResult {
   const request=owned(raw);if(!request||typeof request!=='object'||Object.keys(request).some(key=>!['profile','preferences','selection','seed','excludeNames'].includes(key)))fail('INPUT_INVALID','no caller basis, certificate, data, analysis or generator inputs');
   const prepared=prepareInput(request.profile,request.preferences,request.selection);
   if(!prepared)return owned({schema:'candidate2-naming-generation/1',status:'disabled',consumerVersion:CANDIDATE2_NAMING_CONSUMER_VERSION});
   const {pref,profile}=prepared,mechanic=mechanics(request.seed,request.excludeNames);
   const {resolution,resources}=prepareAuthority(prepared);
   if(resolution.status!=='applicable')return fail('APPLICATION_REJECTED',resolution.status+': '+resolution.reasons.map(reason=>reason.code).join(','));
   if(!resources)throw Error('CANDIDATE2_NAMING_AUTHORITY_INVALID');
   const capability=application.toNamingInput(resolution);assertCapability(capability,'generation',profile);
   const base=resolution.certificate.replay.baseAnalysis;
   const output=candidates(profile,pref,base,capability.elements.applied,mechanic.seed,mechanic.excludeNames,resources);
   assertGeneratedCandidates(output);
   const savedApplication=application.createSaved(resolution);
   if(!same(savedApplication.certificate.effectiveElements,capability.elements)||!same(savedApplication.replay.profile,profile))fail('AUTHORITY_INVALID','issued saved record differs from generation capability');
   const body={schema:'candidate2-naming-generation/1' as const,status:'generated' as const,consumerVersion:CANDIDATE2_NAMING_CONSUMER_VERSION,profile,preferences:pref,selection:CANDIDATE2_NAMING_SELECTION,baseAnalysis:base,application:savedApplication,dataIdentity:resources.identity,domainProjection:output.domainProjection,...mechanic,candidates:output.candidates,messages:output.messages};
   const result:Candidate2NamingGeneration=owned({...body,digest:digest(body)});generations.add(result);return result;
  },
  createSaved(result:Candidate2NamingGeneration):Candidate2NamingGeneration {
   if(!result||!generations.has(result))return fail('GENERATION_REQUIRED','only this factory live generated result can be captured; saved replay/DTO/clone is not generation');
   return owned(result);
  },
  verifySaved(raw:unknown,rawContext:Candidate2NamingReplayContext):Candidate2NamingVerification {
   const saved=owned(raw),context=owned(rawContext);exact(context,['profile','preferences','selection']);
   if(!selection(context.selection))return fail('UNSUPPORTED_SELECTION','saved replay requires explicit candidate.2 selection');
   exact(saved,['schema','status','consumerVersion','profile','preferences','selection','baseAnalysis','application','dataIdentity','domainProjection','seed','excludeNames','candidates','messages','digest']);
   const record=saved as unknown as Candidate2NamingGeneration;
   if(record.schema!=='candidate2-naming-generation/1'||record.status!=='generated'||record.consumerVersion!==CANDIDATE2_NAMING_CONSUMER_VERSION||!same(record.selection,context.selection))fail('SAVED_INVALID','unsupported saved consumer schema/version/selection');
   const pref=preferences(context.preferences),profile=birth(context.profile,pref);
   if(!same(record.profile,profile)||!same(record.preferences,pref))fail('PROFILE_MISMATCH','saved profile or preferences differ from the real replay context');
   const resources=data();if(!same(record.dataIdentity,resources.identity))fail('DATA_MISMATCH','pack semantics, exact naming rules or reviewed publication changed; archive adapter required');
   const verified=application.verifySaved(record.application);assertCapability(verified.namingInput,'saved-replay',profile);
   if(!same(record.application.replay.profile,profile)||!same(record.baseAnalysis,record.application.replay.baseAnalysis))fail('SAVED_INVALID','saved core facts do not match real profile/base analysis');
   const mechanic=mechanics(record.seed,record.excludeNames);
   if(!same(mechanic,{seed:record.seed,excludeNames:record.excludeNames}))fail('SAVED_INVALID','saved generation mechanics must be explicit canonical values');
   const expected=candidates(profile,pref,record.application.replay.baseAnalysis,verified.namingInput.elements.applied,mechanic.seed,mechanic.excludeNames,resources);
   assertGeneratedCandidates(expected);
   if(!same(record.candidates,expected.candidates)||!same(record.messages,expected.messages)||!same(record.domainProjection,expected.domainProjection))fail('SAVED_INVALID','real fixed naming generation/finalization does not reproduce saved candidate facts');
   const {digest:recordedDigest,...body}=record;if(digest(body)!==recordedDigest)fail('SAVED_INVALID','complete consumer envelope digest differs');
   return owned({schema:'candidate2-naming-verification/1',status:'verified-saved',consumerVersion:CANDIDATE2_NAMING_CONSUMER_VERSION,generationAuthority:false,replayOrigin:'saved-replay',profileId:profile.id,candidateCount:record.candidates.length,recordDigest:record.digest});
  },
 });
}
