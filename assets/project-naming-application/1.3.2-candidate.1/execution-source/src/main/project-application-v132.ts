import {types} from 'node:util';
import policy from '../../data/project-application-v132-policy.json';
import {analyzeProfile} from '../domain/engine';
import {rootChartPillarsFromBazi} from '../domain/bazi-root-calendar-branches';
import {createRootFeedbackV132Engine} from './bazi-root-feedback-v132-r2-engine';
import {loadRootFeedbackV132Resources,assertRootFeedbackV132ResourceBinding} from './bazi-root-feedback-v132-r2-resources';
import {verifyFixedRootFeedbackBaseFacts} from './bazi-root-feedback-facade';
import {inspectProjectApplicationV132} from './project-application-v132-policy';
import {loadProjectApplicationResources,assertProjectApplicationResourceBinding} from './project-application-v132-resources';
import {assertSavedApplicationEnvelopeV132,assertSavedApplicationMatchesV132,projectNamingApplicationInputV132,projectSavedApplicationV132} from './project-application-v132-saved';
import {applicationDigest,applicationSame,exactApplicationRecord,freezeApplication,readApplicationProfile} from './project-application-v132-common';
import {PROJECT_APPLICATION_V132_NAMING_INPUT,PROJECT_APPLICATION_V132_POLICY,PROJECT_APPLICATION_V132_PUBLICATION} from '../shared/project-application-v132';
import type {ProjectApplicationCertificate,ProjectApplicationNamingInput,ProjectApplicationOptions,ProjectApplicationResolution,ProjectApplicationTuple,SavedProjectApplicationV132} from '../shared/project-application-v132';
import type {Analysis,BirthProfile} from '../shared/types';

export type * from '../shared/project-application-v132';
const trustedNamingInputs=new WeakSet<object>();
/** Future consumers must check this capability; a DTO, clone or saved JSON is never generation authorization. */
export function assertProjectApplicationNamingInput(value:unknown):asserts value is ProjectApplicationNamingInput {
 if(!value||typeof value!=='object'||!trustedNamingInputs.has(value))throw Error('PROJECT_APPLICATION_UNTRUSTED_NAMING_INPUT');
}
function options(value:unknown):Required<ProjectApplicationOptions> {
 if(value===undefined)return{enabled:false,entryPolicy:'month-branch-only'};
 if(!value||typeof value!=='object'||types.isProxy(value)||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw Error('PROJECT_APPLICATION_INPUT_INVALID: options must be plain data');
 const keys=Reflect.ownKeys(value);if(keys.some(key=>typeof key!=='string'||!['enabled','entryPolicy'].includes(key)))throw Error('PROJECT_APPLICATION_INPUT_INVALID: no external engine, result, graph or certificate inputs');
 exactApplicationRecord(value,keys as string[]);
 if(Object.hasOwn(value,'enabled')&&typeof value.enabled!=='boolean'||Object.hasOwn(value,'entryPolicy')&&value.entryPolicy!=='month-branch-only')throw Error('PROJECT_APPLICATION_INPUT_INVALID: unsupported policy selection');
 return{enabled:value.enabled===true,entryPolicy:'month-branch-only'};
}
const rejection=(status:'blocked'|'pending'|'disabled',code:string,message:string):ProjectApplicationResolution=>freezeApplication({schema:'project-application-resolution/1',status,reasons:code?[{code,message}]:[],traditionalStatus:'unknown'});

/** Independent candidate API. No old Service/Store/UI or production tuple dispatch changes. */
export function createProjectApplicationV132(configuration:{assetDir:string}) {
 exactApplicationRecord(configuration,['assetDir']);
 if(policy.policyId!==PROJECT_APPLICATION_V132_POLICY||policy.publicationId!==PROJECT_APPLICATION_V132_PUBLICATION||policy.enabledByDefault!==false||policy.productionEnabled!==false)throw Error('PROJECT_APPLICATION_POLICY_INVALID');
 const engine=createRootFeedbackV132Engine();
 const issued=new WeakMap<object,ProjectApplicationCertificate>(),replayed=new WeakMap<object,ProjectApplicationCertificate>();
 function authenticate(){
  const resources=loadRootFeedbackV132Resources(configuration,engine),application=loadProjectApplicationResources(configuration.assetDir,engine);
  assertRootFeedbackV132ResourceBinding(resources,engine);assertProjectApplicationResourceBinding(application,engine);
  return{resources,application};
 }
 function tuple():ProjectApplicationTuple {
  const {resources,application}=authenticate();
  return freezeApplication({methodId:'project-bazi-mainchain-145/1.3.2',entryPolicy:'month-branch-only',enginePublicationId:engine.identity.publicationId,engineFullClosureSha256:resources.resourceIdentity.fullClosureSha256,engineManifestSha256:resources.resourceIdentity.manifestSha256,policyId:PROJECT_APPLICATION_V132_POLICY,policyPublicationId:PROJECT_APPLICATION_V132_PUBLICATION,applicationFullClosureSha256:application.identity.fullClosureSha256,applicationManifestSha256:application.identity.manifestSha256,namingInputVersion:PROJECT_APPLICATION_V132_NAMING_INPUT});
 }
 function evaluate(profile:BirthProfile,baseAnalysis:Analysis):ProjectApplicationResolution {
  const {resources,application}=authenticate();
  let facts:ReturnType<typeof verifyFixedRootFeedbackBaseFacts>;
  try{facts=verifyFixedRootFeedbackBaseFacts(profile,baseAnalysis);}catch{return rejection('pending','birth-facts-unverified','完整出生资料或记录的基础历法版本尚未通过固定核验。');}
  const chart={id:profile.id,provenance:'project-application-v132-fixed-facts/1;'+facts.baseAnalysis.bazi.version+';'+facts.timeBasis.methodId,pillars:rootChartPillarsFromBazi(facts.baseAnalysis.bazi.pillars)};
  const root=engine.analyze(chart,{fromOutputMonthStem:false},[],false);
  const inspection=inspectProjectApplicationV132({profile:facts.profile,baseAnalysis:facts.baseAnalysis,root,entryPolicy:'month-branch-only'});
  if(inspection.status!=='eligible')return freezeApplication({schema:'project-application-resolution/1',status:inspection.status,reasons:inspection.reasons,traditionalStatus:'unknown'});
  if(!inspection.effectiveElements||!inspection.numericalSummary||root.consistentIds.length!==1)throw Error('PROJECT_APPLICATION_INTERNAL_CERTIFICATE_MISSING');
  const selected=root.regimes.find(regime=>regime.id===root.consistentIds[0])!;
  const body={schema:'project-application-certificate/1' as const,tuple:tuple(),profileId:profile.id,engineIdentity:resources.resourceIdentity,applicationIdentity:application.identity,
   replay:{schema:'project-application-replay/1' as const,profile:facts.profile,baseAnalysis:facts.baseAnalysis,entryPolicy:'month-branch-only' as const},
   rootDigest:applicationDigest(root),preparationDigest:applicationDigest(root.preparation),numerical:inspection.numericalSummary,selectedRegimeId:selected.id,branch:selected.mainchainResult!.branch,effectiveElements:inspection.effectiveElements,
   sources:[...resources.sources,...application.sources],traditionalStatus:'unknown' as const,limitations:[...policy.limitations]};
  const certificate:ProjectApplicationCertificate=freezeApplication({...body,digest:applicationDigest(body)});
  const resolution:ProjectApplicationResolution=freezeApplication({schema:'project-application-resolution/1',status:'applicable',reasons:[],traditionalStatus:'unknown',certificate});
  issued.set(resolution,certificate);return resolution;
 }
 function consume(certificate:ProjectApplicationCertificate,origin:ProjectApplicationNamingInput['origin']):ProjectApplicationNamingInput {
  const input=projectNamingApplicationInputV132(certificate,origin);trustedNamingInputs.add(input);return input;
 }
 authenticate();
 return Object.freeze({
  identity:tuple(),
  resolve(profileInput:BirthProfile,value?:ProjectApplicationOptions):ProjectApplicationResolution {
   authenticate();const selection=options(value);if(!selection.enabled)return rejection('disabled','','');
   const profile=readApplicationProfile(profileInput);
   if(profile.timeUnknown)return rejection('pending','unknown-birth-time','时辰未知，不采用假设时柱或已知部分机制授权命名。');
   let base:Analysis;try{base=analyzeProfile(profile);}catch{return rejection('blocked','invalid-birth-profile','出生日期、时制或必要资料无效。');}
   return evaluate(profile,base);
  },
  toNamingInput(resolution:ProjectApplicationResolution):ProjectApplicationNamingInput {
   authenticate();const certificate=issued.get(resolution);if(!certificate)throw Error('PROJECT_APPLICATION_UNTRUSTED_RESOLUTION: clone, preview or replay cannot authorize new generation');
   return consume(certificate,'generation');
  },
  createSaved(resolution:ProjectApplicationResolution):SavedProjectApplicationV132 {
   authenticate();const certificate=issued.get(resolution);if(!certificate)throw Error('PROJECT_APPLICATION_UNTRUSTED_RESOLUTION: only this adapter generation can create a saved record');
   return projectSavedApplicationV132(certificate);
  },
  verifySaved(saved:unknown):{status:'verified-saved';namingInput:ProjectApplicationNamingInput} {
   authenticate();assertSavedApplicationEnvelopeV132(saved,tuple());
   const profile=readApplicationProfile(saved.replay.profile);
   // Saved versions are validated and replayed by fixed base facts; no current preview/calendar resolver runs.
   const resolution=evaluate(profile,freezeApplication(saved.replay.baseAnalysis));
   if(resolution.status!=='applicable')throw Error('PROJECT_APPLICATION_SAVED_INVALID: recorded fixed replay is not applicable');
   const expected=projectSavedApplicationV132(resolution.certificate);assertSavedApplicationMatchesV132(saved,expected);
   // Replaying imported JSON never returns a generation-issued resolution or issues a new saved authorization.
   issued.delete(resolution);
   const result=Object.freeze({status:'verified-saved' as const,namingInput:consume(resolution.certificate,'saved-replay')});replayed.set(result,resolution.certificate);return result;
  },
 });
}
