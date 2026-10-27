import type {Candidate2GenerateSavedResult} from '../../src/shared/candidate2-generation-api';
import type {Candidate2GenerationContext} from '../../src/renderer/candidate2-generation-input';
import type {SourceRecord,CharacterEntry} from '../../src/shared/types';
import {CANDIDATE2_NAMING_SELECTION} from '../../src/shared/candidate2-naming-consumer-v1';
import {normalizePreferences} from '../../src/shared/workflow';
import {catalogSession} from './catalog-session';

/** Explicit synthetic UI-correlation fixture. Hash-shaped fields are placeholders,
 * never authenticated sources, a native Store receipt or a generation grant. */
export function candidate2GenerationFixture({omitOptional=false}:{omitOptional?:boolean}={}){
 const original=catalogSession('fixture-original-session','2026-10-26T10:00:00Z','m936-saved-baby');
 const preferences=structuredClone(original.preferences);
 if(omitOptional){delete preferences.avoidParentNames;delete preferences.imageryReading;delete preferences.yueReading;delete preferences.yueHomophones;}
 const profile={...original.profile,notes:'M936 synthetic UI transport only.',namingPreferences:structuredClone(preferences)};
 const normalized=normalizePreferences(preferences),generatedProfile={...structuredClone(profile),namingPreferences:structuredClone(normalized)};
 const digest='a'.repeat(64),source=(id:string):SourceRecord=>({id,name:'M936 display fixture source metadata',url:'local:m936-synthetic-ui-only',commit:'fixture/1',license:'fixture-only',files:['fixture.json'],sha256:digest,note:'Not a verified source or native Store record.'});
 const rulesSource=source('naming-character-meanings-v7.1-fixed'),dependency=source('naming-editorial-meanings-v7-fixed');
 const char=(value:string):CharacterEntry=>({char:value,pinyin:value==='安'?'ān':'níng',tone:1,meaning:'Fixture dictionary display text',traditional:value,strokes:6,elements:['土'],elementBasis:'Fixture only',tags:[],warning:'UI fixture, not source authentication',sourceId:dependency.id});
 const candidates=original.candidates.map((candidate,index)=>({...candidate,id:'candidate2-naming-v1:'+String(index+1).repeat(64),characters:[char(candidate.givenName)],traditionalReason:'M936 synthetic original candidate.2 explanation.',evaluation:{sound:4,meaning:3,simplicity:2,traditional:1,distinctiveness:0}}));
 const elements={primary:['水'],secondary:[],avoid:['火'],applied:['水']};
 const tuple={methodId:CANDIDATE2_NAMING_SELECTION.methodId,entryPolicy:CANDIDATE2_NAMING_SELECTION.entryPolicy,enginePublicationId:'bazi-root-feedback/1.3.2;preview-publication-r2',engineFullClosureSha256:digest,engineManifestSha256:digest,policyId:CANDIDATE2_NAMING_SELECTION.policyId,policyPublicationId:CANDIDATE2_NAMING_SELECTION.publicationId,applicationFullClosureSha256:digest,applicationManifestSha256:digest,namingInputVersion:'project-naming-input/1.0.0'};
 const replay={schema:'project-application-replay/1',profile:generatedProfile,baseAnalysis:original.analysis,entryPolicy:'month-branch-only'};
 const runtimeEnvironment={node:'fixture',icu:null,tz:null,unicode:null};
 const engine={schema:'bazi-root-feedback-build/2',methodId:CANDIDATE2_NAMING_SELECTION.methodId,publicationId:'bazi-root-feedback/1.3.2;preview-publication-r2',fullClosureSha256:digest,manifestSha256:digest,esbuildVersion:'fixture'};
 const identity={schema:'project-application-build/1',policyId:CANDIDATE2_NAMING_SELECTION.policyId,publicationId:CANDIDATE2_NAMING_SELECTION.publicationId,fullClosureSha256:digest,manifestSha256:digest,esbuildVersion:'fixture',engine,runtimeEnvironment};
 const engineIdentity={schema:'bazi-root-feedback-resource-identity/3',methodId:CANDIDATE2_NAMING_SELECTION.methodId,applicationPolicyVersion:'naming-element-preview/1.3.2',publicationId:'bazi-root-feedback/1.3.2;preview-publication-r2',manifestSha256:digest,fullClosureSha256:digest,kernel:{methodId:'fixture-kernel',sourceRevision:'fixture/1'},files:[{path:'fixture.json',bytes:1,sha256:digest,kind:'rule'}],runtimeEnvironment};
 const certificate={schema:'project-application-certificate/1',tuple,profileId:profile.id,engineIdentity,applicationIdentity:identity,replay,rootDigest:digest,preparationDigest:digest,numerical:{iterations:1,errorBound:0,residualL1UpperBound:0,certificateDigest:digest},selectedRegimeId:'fixture-regime',branch:'fixture-branch',effectiveElements:elements,sources:[dependency],traditionalStatus:'unknown',limitations:['Synthetic UI fixture only'],digest};
 const application={schema:'project-naming-use/2',tuple,replay,certificate,application:{status:'applied',policyId:CANDIDATE2_NAMING_SELECTION.policyId,elements},digest};
 const dataIdentity={schema:'candidate2-naming-data/1',packSha256:digest,packBytes:10,datasetSha256:digest,activeVersion:digest.slice(0,12),metadataVersion:'fixture',namingRulesVersion:'naming-editorial-7.1.0',semanticSha256:digest,reviewIdentity:{fixture:true},sources:[dependency]};
 const messages=['M936 synthetic response; source/Store authenticity not asserted.'];
 const generation={schema:'candidate2-naming-generation/1',status:'generated',consumerVersion:'candidate2-naming-consumer/1.0.0',profile:generatedProfile,preferences:normalized,selection:CANDIDATE2_NAMING_SELECTION,baseAnalysis:original.analysis,application,dataIdentity,domainProjection:{schema:'candidate2-domain-element-projection/1',source:'candidate.2-authorized-elements',originalPreferencesDigest:digest,effectivePreferencesDigest:digest,applied:elements.applied,userManualElements:[],baseAnalysisUnchanged:true,domainEntry:'generateLocalForRuleVersionWithContext',namingRulesVersion:'naming-editorial-7.1.0',limitation:'private numeric input projection; not user manual intent or old project tuple; avoid is not a hard filter'},seed:10,excludeNames:[],candidates,messages,digest};
 const sessionId='c2s_'+'b'.repeat(32),createdAt='2026-10-26T10:01:00Z';
 const session={id:sessionId,profileId:profile.id,createdAt,profile:generatedProfile,preferences:normalized,analysis:original.analysis,candidates,reviewNote:'',originalFavorable:[...original.analysis.bazi.favorable],dataVersion:dataIdentity.activeVersion,sourceSnapshot:{version:'session-sources/1.0.0',dataVersion:dataIdentity.activeVersion,sources:[rulesSource]},namingRules:{version:'naming-editorial-7.1.0',dataVersion:dataIdentity.activeVersion,sourceId:rulesSource.id},reviewRevision:0,reviewToken:'11111111-1111-4111-8111-111111111111',candidate2Naming:{schema:'candidate2-naming-session/1',sessionBinding:{sessionId,profileId:profile.id,createdAt},request:{schema:'candidate2-session-request/1',profile,preferences,selection:CANDIDATE2_NAMING_SELECTION},generation,sourceCapsule:{role:'candidate2-source-capsule',sha:digest,rawBytes:100,codec:'deflate-raw/1'},sourceWitnessDigest:digest,sourceSnapshotDigest:digest,attachmentDigest:digest}};
 const result=JSON.parse(JSON.stringify({schema:'candidate2-generate-saved/1',status:'saved',session,messages,traditionalStatus:'unknown'})) as Candidate2GenerateSavedResult;
 const context:Candidate2GenerationContext={profile:structuredClone(profile),preferences:structuredClone(preferences),savedProfile:structuredClone(profile),savedPreferences:structuredClone(preferences),contextKey:'m936-owner1/draft1/database1',storageReadOnly:false,dirty:false};
 return{profile:structuredClone(profile),preferences:structuredClone(preferences),context,result};
}
