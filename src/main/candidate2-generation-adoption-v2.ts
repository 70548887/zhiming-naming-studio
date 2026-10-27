import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {snapshotApplicationJson} from './project-application-v132-r2-json';
import {canonicalPlainJson} from '../shared/plain-json';
import {CANDIDATE2_NAMING_SELECTION} from '../shared/candidate2-naming-consumer-v1';
import {createSessionSourceSnapshot,validSessionSources} from '../shared/session-sources';
import {inspectCandidate2SessionBytes} from './candidate2-session-contract-v1';
import {createCandidate2GenerationResourcesV2,createCandidate2InstalledVerificationGuardV2} from './candidate2-generation-resources-v2';
import {adoptionDigest,adoptionHash,captureOwnedMechanicsV2,decodeAdoptionSourcesV2,encodeAdoptionSources,exactAdoption,ownAdoptionEnvelopeV2,type AdoptionRawAssetV1} from './candidate2-generation-adoption-codec-v2';
import type {BirthProfile,NamingPreferences,SourceRecord} from '../shared/types';
import type {Candidate2NamingSelection} from '../shared/candidate2-naming-consumer-v1';
import type {Candidate2GenerationProposalV2,Candidate2AdoptedNamingSessionV2,Candidate2AdoptionEnvelopeV2,Candidate2AdoptionReplayV2} from '../shared/candidate2-generation-adoption-v2';

type Configuration=Parameters<typeof createCandidate2GenerationResourcesV2>[0];
const APP_SHA='906b191c88ce2e6f0335c674727c39bcae14edf2968d2c1c5cdffcb04079b47a';
const CONSUMER_SHA='e01a47e90ccb1bdb7576a01bb8a3d5ca1a7939e49550b1a3dee9e451acd8d639';
const MANIFEST_SHA='d3c555f7d3f6ced6d334d5efd52a8222ecb3f662e99fa20baa1ffc05e1ad057e';
const same=(a:unknown,b:unknown)=>canonicalPlainJson(a)===canonicalPlainJson(b);
function fail(reason:string):never{throw Error('CANDIDATE2_ADOPTION_REJECTED: '+reason);}
const own=<T>(value:T)=>snapshotApplicationJson(value) as T;
const prefKeys=['length','generationChar','requiredChars','forbiddenChars','elderTaboo','style','meanings','industry','priority','preferredElements','zodiacRules','numerology','avoidParentNames','parentNamePhonetics','wordPronunciationReference','elementAssessment','imageryReading','yueReading','namePhonetics','yueHomophones','yueHomophoneRuleVersion'];
function originalRequest(profile:BirthProfile,preferences:NamingPreferences,selection:Candidate2NamingSelection){
 const request=own({schema:'candidate2-session-request/1' as const,profile,preferences,selection});
 if(request.profile&&typeof request.profile==='object'&&['seed','excludeNames','mechanics'].some(key=>Object.hasOwn(request.profile,key)))fail('caller mechanics are not original profile fields');
 if(!same(request.selection,CANDIDATE2_NAMING_SELECTION))return fail('explicit exact candidate.2 selection required');
 if(!request.preferences||typeof request.preferences!=='object'||Array.isArray(request.preferences)||Object.keys(request.preferences).some(key=>!prefKeys.includes(key)))return fail('unsupported preference field or AI/runtime input');
 return request;
}
function materialPath(config:Configuration,asset:AdoptionRawAssetV1){
 if(asset.scope==='data')return path.join(config.dataDir,...asset.path.split('/'));
 if(asset.scope==='application-assets')return path.join(config.assetDir,...asset.path.split('/'));
 if(asset.scope==='application-runtime'&&asset.path==='application.cjs')return config.applicationBundlePath;
 if(asset.scope==='consumer-execution')return asset.path==='consumer.cjs'?path.join(config.consumerPublicationDir,'consumer.cjs'):path.join(config.consumerPublicationDir,'sources',...asset.path.split('/'));
 if(asset.scope==='build-receipt'&&asset.path==='application.cjs.receipt.json')return config.applicationBundlePath+'.receipt.json';
 if(asset.scope==='build-receipt'&&asset.path==='consumer-execution-manifest.json')return path.join(config.consumerPublicationDir,'consumer-execution-manifest.json');
 return fail('unsupported captured asset mapping');
}
function recheckCapturedAssets(config:Configuration,assets:readonly AdoptionRawAssetV1[]){
 for(const asset of assets){const file=materialPath(config,asset),stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink())fail('captured source is no longer physical');const bytes=fs.readFileSync(file);if(bytes.length!==asset.bytes.length||adoptionHash(bytes)!==adoptionHash(asset.bytes))fail('source changed since this generation');}
}
function verifyRecomputedSources(session:Candidate2AdoptedNamingSessionV2,sources:readonly SourceRecord[]){
 const snapshot=createSessionSourceSnapshot(session.candidate2Naming.generation.dataIdentity.activeVersion,[...sources]);
 if(!same(snapshot,session.sourceSnapshot)||!validSessionSources(session))fail('archived source snapshot differs from recomputed sources');
}
function assertMechanicsBinding(value:unknown,g:Candidate2AdoptedNamingSessionV2['candidate2Naming']['generation']){
 const recorded=captureOwnedMechanicsV2(value);
 if(!same(recorded,{seed:g.seed,excludeNames:g.excludeNames}))fail('recorded mechanics differ from actual generation');
 return recorded;
}
function assertFixedArchive(envelope:Candidate2AdoptionEnvelopeV2,closed:ReturnType<typeof decodeAdoptionSourcesV2>){
 const {capsule,assets}=closed;
 function get(scope:AdoptionRawAssetV1['scope'],name:string){const found=assets.find(asset=>asset.scope===scope&&asset.path===name);if(!found)return fail('mandatory archived source missing: '+scope+':'+name);return found.bytes;}
 exactAdoption(capsule.consumerExecution,['publicationId','manifestSha256','fullClosureSha256','bundleSha256','bundleBytes']);
 if(!same(capsule.consumerExecution,{publicationId:'candidate2-session-consumer-execution/1',manifestSha256:MANIFEST_SHA,fullClosureSha256:MANIFEST_SHA,bundleSha256:CONSUMER_SHA,bundleBytes:3036131}))fail('unregistered consumer execution');
 const manifestBytes=get('build-receipt','consumer-execution-manifest.json');if(adoptionHash(manifestBytes)!==MANIFEST_SHA)fail('consumer manifest differs from fixed registry');
 const manifest=JSON.parse(manifestBytes.toString('utf8')) as {inputs:{path:string;bytes:number;sha256:string}[]};
 if(adoptionDigest(manifest)!==MANIFEST_SHA||manifest.inputs.length!==57)fail('consumer input closure identity');
 for(const input of manifest.inputs){const bytes=get('consumer-execution',input.path);if(bytes.length!==input.bytes||adoptionHash(bytes)!==input.sha256)fail('consumer source closure differs');}
 if(get('consumer-execution','consumer.cjs').length!==3036131||adoptionHash(get('consumer-execution','consumer.cjs'))!==CONSUMER_SHA)fail('archived consumer evidence differs');
 if(!same(capsule.applicationRuntime,{file:'application.cjs',sha256:APP_SHA,byteLength:2002922,receiptSha256:adoptionHash(get('build-receipt','application.cjs.receipt.json'))}))fail('application evidence identity');
 const app=get('application-runtime','application.cjs');if(app.length!==2002922||adoptionHash(app)!==APP_SHA)fail('archived application evidence differs');
 const data=capsule.dataIdentity,pack=get('data','knowledge-v6.sqlite'),dataset=get('data','dataset-v6.json');
 if(pack.length!==data.packBytes||adoptionHash(pack)!==data.packSha256||adoptionHash(dataset)!==data.datasetSha256)fail('archived data identity differs');
 if(!same(capsule.runtimeEnvironment,envelope.session.candidate2Naming.generation.application.certificate.applicationIdentity.runtimeEnvironment))fail('recorded runtime environment binding');
}
function stageArchive(assets:readonly AdoptionRawAssetV1[]){
 const parent=fs.realpathSync.native(os.tmpdir()),root=fs.realpathSync.native(fs.mkdtempSync(path.join(parent,'candidate2-adoption-replay-')));
 const close=()=>{
  if(path.dirname(root)!==parent||!path.basename(root).startsWith('candidate2-adoption-replay-')||fs.realpathSync.native(root)!==root||fs.lstatSync(root).isSymbolicLink())fail('unsafe replay cleanup');
  const inspect=(file:string)=>{const stat=fs.lstatSync(file);if(stat.isSymbolicLink()||fs.realpathSync.native(file)!==file)fail('linked replay entry');if(stat.isDirectory())for(const child of fs.readdirSync(file))inspect(path.join(file,child));};inspect(root);fs.rmSync(root,{recursive:true,force:false});
 };
 try{
  fs.mkdirSync(path.join(root,'data'));fs.mkdirSync(path.join(root,'assets'));
  for(const asset of assets){if(asset.scope!=='data'&&asset.scope!=='application-assets')continue;const base=path.join(root,asset.scope==='data'?'data':'assets'),file=path.join(base,...asset.path.split('/')),relative=path.relative(base,file);if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))fail('archive mapping escaped replay root');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,asset.bytes,{flag:'wx'});if(adoptionHash(fs.readFileSync(file))!==adoptionHash(asset.bytes))fail('replay materialization changed');}
  return{dataDir:path.join(root,'data'),assetDir:path.join(root,'assets'),close};
 }catch(error){close();throw error;}
}

function verifyCandidate2RecordedEnvelopeV2(config:Configuration,raw:unknown):Candidate2AdoptionReplayV2 {
   const envelope=ownAdoptionEnvelopeV2(raw);exactAdoption(envelope,['schema','mechanics','session','sourceBlobs','generationAuthority','storage']);
   if(envelope.schema!=='candidate2-adoption-envelope/2'||envelope.generationAuthority!==false||envelope.storage!=='not-connected')fail('unsupported adoption envelope');
   inspectCandidate2SessionBytes(Buffer.from(JSON.stringify(envelope.session)));
   const recordedMechanics=assertMechanicsBinding(envelope.mechanics,envelope.session.candidate2Naming.generation);
   const closed=decodeAdoptionSourcesV2(envelope);assertFixedArchive(envelope,closed);
   const stage=stageArchive(closed.assets);
   try{
    // Only the installed fixed e01/906 binaries execute. Archived copies are
    // checked as evidence, while data/assets come solely from this envelope.
    const replay=createCandidate2GenerationResourcesV2({...config,dataDir:stage.dataDir,assetDir:stage.assetDir});
    replay.verifyArchivedApplicationReceipt(closed.assets.find(asset=>asset.scope==='build-receipt'&&asset.path==='application.cjs.receipt.json')!.bytes);
    const saved=envelope.session.candidate2Naming,checked=replay.verifySaved(saved.generation,{profile:saved.request.profile,preferences:saved.request.preferences,selection:saved.request.selection});
    verifyRecomputedSources(envelope.session,checked.snapshotSources);
    const verification=checked.verification;
    return own({schema:'candidate2-adoption-replay/2' as const,mechanics:recordedMechanics,status:'verified-envelope-replay' as const,session:envelope.session,verification,generationAuthority:false as const,canSave:false as const,storage:'not-connected' as const,runtimeFromArchiveExecutable:false as const,traditionalStatus:'unknown' as const});
   }finally{stage.close();}
}

/** Main-process generation/adoption seam. No Store callback, current-settings
 * lookup, SQL reader, caller certificate, or dynamic registry is accepted.
 * The result is deliberately unpersisted; a Store owner must add its own
 * active-pack, profile-token, epoch, native-history and writer/CAS checks.
 * Mechanics are explicit frozen constructor data supplied by that main owner.
 * V1 wrapper inputs are rejected; no historic evidence is relabelled. */
export function createCandidate2GenerationAdoptionV2(configuration:Configuration){
 if(arguments.length!==1)fail('one main-owned configuration required');
 const config=own(configuration),mechanics=captureOwnedMechanicsV2(config.mechanics),resources=createCandidate2GenerationResourcesV2(config);
 const issued=new WeakMap<object,{envelope:Candidate2AdoptionEnvelopeV2;assets:readonly AdoptionRawAssetV1[]}>();
 return Object.freeze({
  generate(profile:BirthProfile,preferences:NamingPreferences,selection:Candidate2NamingSelection):Candidate2GenerationProposalV2 {
   if(arguments.length!==3)fail('generation accepts exactly original profile, preferences and selection');
   const request=originalRequest(profile,preferences,selection);
   // This always invokes generate again. An earlier eligibility result or live
   // proposal is never substituted for a fresh original-input computation.
   const generated=resources.generate(request.profile,request.preferences,request.selection),g=generated.generation;
   assertMechanicsBinding(mechanics,g);
   const snapshot=createSessionSourceSnapshot(g.dataIdentity.activeVersion,[...generated.snapshotSources]);
   const captured=encodeAdoptionSources(generated.assets,{
    replayPublicationId:'candidate2-session-replay/1',consumerVersion:g.consumerVersion,applicationTuple:g.application.tuple,
    applicationRuntime:{file:'application.cjs',sha256:APP_SHA,byteLength:2002922,receiptSha256:adoptionHash(fs.readFileSync(config.applicationBundlePath+'.receipt.json'))},
    consumerExecution:generated.consumerExecution,runtimeEnvironment:g.application.certificate.applicationIdentity.runtimeEnvironment,
    dataIdentity:g.dataIdentity,sourceRecords:snapshot.sources,
   });
   const id='c2s_'+randomBytes(16).toString('hex'),createdAt=new Date().toISOString();
   const attachmentBody={schema:'candidate2-naming-session/1' as const,sessionBinding:{sessionId:id,profileId:g.profile.id,createdAt},request,generation:g,sourceCapsule:captured.sourceCapsule,sourceWitnessDigest:captured.capsule.witnessDigest,sourceSnapshotDigest:adoptionDigest(snapshot)};
   const session=own({id,profileId:g.profile.id,createdAt,profile:g.profile,preferences:g.preferences,analysis:g.baseAnalysis,candidates:g.candidates,reviewNote:'',originalFavorable:[...g.baseAnalysis.bazi.favorable],dataVersion:g.dataIdentity.activeVersion,sourceSnapshot:snapshot,namingRules:{version:'naming-editorial-7.1.0' as const,dataVersion:g.dataIdentity.activeVersion,sourceId:'naming-character-meanings-v7.1-fixed' as const},reviewRevision:0,reviewToken:randomUUID(),candidate2Naming:{...attachmentBody,attachmentDigest:adoptionDigest(attachmentBody)}}) as Candidate2AdoptedNamingSessionV2;
   // Reuse the existing exact contract gate; it supplies structure validation,
   // never live-generation or stored-origin authority.
   inspectCandidate2SessionBytes(Buffer.from(JSON.stringify(session)));
   if(!validSessionSources(session))fail('generation source registry does not resolve its actual references');
   recheckCapturedAssets(config,generated.assets);
   const proposal=own({schema:'candidate2-generation-proposal/2' as const,mechanics,status:'generated-unpersisted' as const,session,generationAuthority:false as const,storage:'not-connected' as const,canSave:false as const,traditionalStatus:'unknown' as const});
   issued.set(proposal,{envelope:{schema:'candidate2-adoption-envelope/2',mechanics,session,sourceBlobs:captured.sourceBlobs,generationAuthority:false,storage:'not-connected'},assets:generated.assets});
   return proposal;
  },
  createSaved(proposal:Candidate2GenerationProposalV2):Candidate2AdoptionEnvelopeV2 {
   if(arguments.length!==1||!proposal||typeof proposal!=='object')fail('factory-issued generation required');
   const live=issued.get(proposal);if(!live)fail('clone, replay, eligibility or other-factory proposal cannot authorize capture');
   recheckCapturedAssets(config,live.assets);
   const g=live.envelope.session.candidate2Naming.generation,raw=live.envelope.session.candidate2Naming.request;
   assertMechanicsBinding(live.envelope.mechanics,g);
   if(!same(live.envelope.mechanics,mechanics))fail('captured mechanics differ from owning factory');
   const checked=resources.verifySaved(g,{profile:raw.profile,preferences:raw.preferences,selection:raw.selection});
   verifyRecomputedSources(live.envelope.session,checked.snapshotSources);
   const envelope=ownAdoptionEnvelopeV2(live.envelope);issued.delete(proposal);return envelope;
  },
  verifySaved(raw:unknown):Candidate2AdoptionReplayV2 {
   if(arguments.length!==1)fail('replay accepts the recorded envelope only; no current preference/context override');
   return verifyCandidate2RecordedEnvelopeV2(config,raw);
  },
 });
}

/** Internal read-only receiver for native saved-row verification. Unlike the
 * unchanged generation/adoption factory, construction captures plain config
 * only; physical validation happens at each verifySaved boundary. It never
 * exposes generate/createSaved or retains an installed success across calls. */
export function createCandidate2SavedVerifierV2(configuration:Configuration){
 if(arguments.length!==1)fail('one main-owned configuration required');
 const config=own(configuration);exactAdoption(config,['applicationBundlePath','assetDir','dataDir','consumerPublicationDir','mechanics']);
 captureOwnedMechanicsV2(config.mechanics);
 for(const name of ['applicationBundlePath','assetDir','dataDir','consumerPublicationDir'] as const)if(typeof config[name]!=='string'||!path.isAbsolute(config[name]))fail(name+' must be an absolute physical path');
 return Object.freeze({
  verifySaved(raw:unknown):Candidate2AdoptionReplayV2 {
   if(arguments.length!==1)fail('replay accepts the recorded envelope only; no current preference/context override');
   const installed=createCandidate2InstalledVerificationGuardV2(config);let primary:unknown;
   try{return verifyCandidate2RecordedEnvelopeV2(config,raw);}
   catch(error){primary=error;throw error;}
   finally{
    try{installed.recheckInstalled();}
    catch(error){if(primary instanceof Error)primary.message+=' [installed post-read verification: '+String(error)+']';else throw error;}
   }
  },
 });
}
