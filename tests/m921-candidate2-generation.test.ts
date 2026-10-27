import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {deflateRawSync} from 'node:zlib';
import {createCandidate2GenerationAdoptionV1} from '../src/main/candidate2-generation-adoption-v1';
import {adoptionDigest,adoptionHash,decodeAdoptionSources,encodeAdoptionSources} from '../src/main/candidate2-generation-adoption-codec-v1';
import type {Candidate2AdoptionEnvelopeV1,Candidate2AdoptionSourceCapsuleV1,Candidate2GenerationProposalV1} from '../src/shared/candidate2-generation-adoption-v1';
import {CANDIDATE2_NAMING_SELECTION} from '../src/shared/candidate2-naming-consumer-v1';
import {normalizePreferences} from '../src/shared/workflow';
import {canonicalPlainJson} from '../src/shared/plain-json';
import {validSessionSources} from '../src/shared/session-sources';
import {analyzeProfile} from '../src/domain/engine';
import {createM921GenerationFixture,type M921GenerationFixture} from './helpers/m921-generation-fixture';
import fixture from './fixtures/project-naming-use-m153.json';
import type {BirthProfile,NamingPreferences} from '../src/shared/types';

const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
const selection=CANDIDATE2_NAMING_SELECTION;
const profileA=structuredClone(fixture.positive.profile) as BirthProfile;
const preferencesA=normalizePreferences({length:1,requiredChars:'沐',zodiacRules:false,numerology:false});
const profileB:BirthProfile={...profileA,id:'m921-real-second-birth',birthDate:'2000-11-12',birthTime:'08:00'};
const preferencesB=normalizePreferences({length:1,requiredChars:'安',zodiacRules:false,numerology:false});
let owned:M921GenerationFixture;
let adoption:ReturnType<typeof createCandidate2GenerationAdoptionV1>;
let first:Candidate2GenerationProposalV1;
let captured:Candidate2AdoptionEnvelopeV1;
const observations:unknown[]=[];

function configuration(){
 return{applicationBundlePath:owned.applicationBundlePath,assetDir:owned.assetDir,dataDir:owned.dataDir,consumerPublicationDir:owned.consumerPublicationDir};
}
function createOwner(){return createCandidate2GenerationAdoptionV1(configuration());}
function seal<T extends {digest:string}>(value:T):T {
 const {digest:_previous,...body}=value;value.digest=adoptionDigest(body);return value;
}
function sealAttachment(envelope:Candidate2AdoptionEnvelopeV1){
 const attachment=envelope.session.candidate2Naming,{attachmentDigest:_previous,...body}=attachment;
 attachment.attachmentDigest=adoptionDigest(body);return envelope;
}
function proposalSummary(value:Candidate2GenerationProposalV1){
 const g=value.session.candidate2Naming.generation;
 return{status:value.status,sessionId:value.session.id,profileId:value.session.profileId,birthDate:g.profile.birthDate,birthTime:g.profile.birthTime,requiredChars:g.preferences.requiredChars,applied:g.application.application.elements.applied,candidates:g.candidates.map(candidate=>({name:candidate.fullName,traditional:candidate.evaluation.traditional})),generationDigest:g.digest,storage:value.storage,canSave:value.canSave};
}
function assertProposal(value:Candidate2GenerationProposalV1,profile:BirthProfile,preferences:NamingPreferences,applied:string[]){
 expect(value).toMatchObject({schema:'candidate2-generation-proposal/1',status:'generated-unpersisted',generationAuthority:false,storage:'not-connected',canSave:false,traditionalStatus:'unknown'});
 const session=value.session,attachment=session.candidate2Naming,g=attachment.generation;
 expect(session.id).toMatch(/^c2s_[a-f0-9]{32}$/u);
 expect(attachment.sessionBinding).toEqual({sessionId:session.id,profileId:profile.id,createdAt:session.createdAt});
 expect(attachment.request).toEqual({schema:'candidate2-session-request/1',profile,preferences,selection});
 expect(g.profile).toEqual({...profile,namingPreferences:preferences});expect(g.preferences).toEqual(preferences);
 expect(session.profile).toEqual(g.profile);expect(session.preferences).toEqual(preferences);
 expect(session.analysis).toEqual(g.baseAnalysis);expect(session.analysis).toEqual(analyzeProfile(profile));
 expect(session.originalFavorable).toEqual(g.baseAnalysis.bazi.favorable);
 expect(g.preferences.preferredElements).toEqual([]);expect(session.profile.namingPreferences!.preferredElements).toEqual([]);
 expect(g.application.application.elements.applied).toEqual(applied);expect(g.domainProjection.applied).toEqual(applied);
 expect(g.application.certificate.traditionalStatus).toBe('unknown');expect(g.candidates.length).toBeGreaterThan(0);
 expect(session.analysis).not.toHaveProperty('projectNamingUse');expect(validSessionSources(session)).toBe(true);
 const dedicated=session.sourceSnapshot.sources.filter(source=>['naming-editorial-readings-v4-fixed','naming-editorial-names-v5-fixed','naming-editorial-dictionary-v6-fixed','naming-editorial-meanings-v7-fixed','naming-character-meanings-v7.1-fixed'].includes(source.id));
 expect(dedicated.map(source=>source.id)).toEqual(['naming-character-meanings-v7.1-fixed']);
 expect(g.dataIdentity.sources.some(source=>source.id==='naming-editorial-meanings-v7-fixed')).toBe(true);
 expect(Object.isFrozen(value)).toBe(true);expect(Object.isFrozen(attachment.request.profile)).toBe(true);
}
function replaceCapsule(envelope:Candidate2AdoptionEnvelopeV1,capsule:Candidate2AdoptionSourceCapsuleV1){
 const attachment=envelope.session.candidate2Naming,old=attachment.sourceCapsule.sha;
 const {witnessDigest:_old,...body}=capsule;capsule.witnessDigest=adoptionDigest(body);
 const bytes=Buffer.from(canonicalPlainJson(capsule)),row={sha:adoptionHash(bytes),rawBytes:bytes.length,codec:'deflate-raw/1' as const,payloadBase64:deflateRawSync(bytes,{level:6}).toString('base64')};
 envelope.sourceBlobs=envelope.sourceBlobs.filter(item=>item.sha!==old);envelope.sourceBlobs.push(row);
 attachment.sourceCapsule={role:'candidate2-source-capsule',sha:row.sha,rawBytes:row.rawBytes,codec:row.codec};
 attachment.sourceWitnessDigest=capsule.witnessDigest;return sealAttachment(envelope);
}
function assertReplay(value:ReturnType<ReturnType<typeof createCandidate2GenerationAdoptionV1>['verifySaved']>){
 expect(value).toMatchObject({schema:'candidate2-adoption-replay/1',status:'verified-envelope-replay',generationAuthority:false,canSave:false,storage:'not-connected',runtimeFromArchiveExecutable:false,traditionalStatus:'unknown'});
 expect(value.verification).toMatchObject({status:'verified-saved',generationAuthority:false,replayOrigin:'saved-replay'});
 expect(value.status).not.toBe('verified-stored');
}
function evidence(name:string,value:unknown){
 const directory=process.env.M921_EVIDENCE_DIR;if(!directory)return;
 const target=path.join(path.resolve(directory),name);fs.mkdirSync(path.dirname(target),{recursive:true});
 fs.writeFileSync(target+'.tmp',JSON.stringify(value,null,2)+'\n');fs.renameSync(target+'.tmp',target);
}

beforeAll(async()=>{
 owned=await createM921GenerationFixture();adoption=createOwner();
 first=adoption.generate(profileA,preferencesA,selection);assertProposal(first,profileA,preferencesA,['土','金']);
 captured=adoption.createSaved(first);observations.push({case:'real first generation',...proposalSummary(first),sourceBlobCount:captured.sourceBlobs.length});
 evidence('m921-positive-generation.json',first.session.candidate2Naming.generation);
 evidence('m921-positive-session.json',first.session);
},120000);

afterAll(()=>{
 try{evidence('m921-generation-summary.json',{observations,storage:'not-connected',sqlPersistenceExecuted:false,productGenerationPermission:false});}
 finally{if(typeof owned!=='undefined')owned.close();}
},120000);

describe('M921 true candidate.2 generation adoption and archived envelope replay',{timeout:120000},()=>{
 it('uses the genuine M153 result with original inputs and separate unpersisted session identity',()=>{
  assertProposal(first,profileA,preferencesA,['土','金']);
  expect(first.session.candidates.map(candidate=>candidate.fullName)).toEqual(['林沐']);
  expect(first.session.candidates[0].evaluation.traditional).toBe(40);
  expect(first.session.originalFavorable).toEqual(['土','金','水']);
  expect(captured).toMatchObject({schema:'candidate2-adoption-envelope/1',generationAuthority:false,storage:'not-connected'});
  expect(captured.session).toEqual(first.session);expect(captured.sourceBlobs.length).toBeGreaterThan(200);
 });

 it('generates a second real birthday and a repeat first birthday with fresh session IDs and per-proposal capture',()=>{
  // This is an actual nonempty generation assertion, never a pending/eligible
  // stand-in. If 安 has no candidates, the run must fail visibly for review.
  const second=adoption.generate(profileB,preferencesB,selection);assertProposal(second,profileB,preferencesB,['火','土']);
  const secondEnvelope=adoption.createSaved(second);expect(secondEnvelope.session.id).toBe(second.session.id);
  const again=adoption.generate(profileA,preferencesA,selection);assertProposal(again,profileA,preferencesA,['土','金']);
  expect(new Set([first.session.id,second.session.id,again.session.id]).size).toBe(3);
  expect(again.session.candidate2Naming.generation).toEqual(first.session.candidate2Naming.generation);
  const againEnvelope=adoption.createSaved(again);expect(againEnvelope.session.id).toBe(again.session.id);
  expect(()=>adoption.createSaved(second)).toThrow();expect(()=>adoption.createSaved(again)).toThrow();
  observations.push({case:'two birthdays and repeat',second:proposalSummary(second),repeated:proposalSummary(again),sameGenerationContent:true,perProposalCapture:true});
  evidence('m921-second-generation.json',second.session.candidate2Naming.generation);
 });

 it('rejects manual, missing hour, legacy, requested enrichment and AI preference inputs without fallback',()=>{
  expect(()=>adoption.generate(profileA,{...preferencesA,preferredElements:['水']},selection)).toThrow('CONFLICT');
  expect(()=>adoption.generate({...profileA,timeUnknown:true,birthTime:''},preferencesA,selection)).toThrow('APPLICATION_REJECTED');
  expect(()=>adoption.generate(profileA,preferencesA,{...selection,methodId:'project-bazi-mainchain-145/1.3.1'} as never)).toThrow();
  expect(()=>adoption.generate(profileA,{...preferencesA,namingElementMethod:{methodId:'project-bazi-mainchain-145/1.3.1',entryPolicy:'month-branch-only'}},selection)).toThrow();
  expect(()=>adoption.generate(profileA,{...preferencesA,numerology:true},selection)).toThrow('UNSUPPORTED_FEATURE');
  expect(()=>adoption.generate(profileA,{...preferencesA,useAi:true} as NamingPreferences,selection)).toThrow('unsupported preference');
 });

 it('accepts exactly three original inputs and never an eligibility DTO or fourth runtime authority',()=>{
  const generate=adoption.generate as (...args:unknown[])=>unknown;
  expect(generate.length).toBe(3);
  expect(()=>generate({schema:'candidate2-naming-eligibility/1',status:'eligible',generationAuthority:false})).toThrow('exactly original');
  expect(()=>generate(profileA,preferencesA,selection,{certificate:{claimed:true},runtime:{claimed:true}})).toThrow('exactly original');
  expect(()=>createCandidate2GenerationAdoptionV1({...configuration(),runtime:{claimed:true}} as Parameters<typeof createCandidate2GenerationAdoptionV1>[0])).toThrow();
 });

 it('rejects getter and Proxy input before executing caller code',()=>{
  let getter=0;const accessor=clone(profileA);
  Object.defineProperty(accessor,'birthDate',{enumerable:true,get(){getter++;return profileA.birthDate;}});
  expect(()=>adoption.generate(accessor,preferencesA,selection)).toThrow();expect(getter).toBe(0);
  const traps={get:0,ownKeys:0,getOwnPropertyDescriptor:0,getPrototypeOf:0};
  const proxy=new Proxy(clone(profileA),{
   get(){traps.get++;throw Error('unexpected get');},ownKeys(){traps.ownKeys++;throw Error('unexpected ownKeys');},
   getOwnPropertyDescriptor(){traps.getOwnPropertyDescriptor++;throw Error('unexpected descriptor');},getPrototypeOf(){traps.getPrototypeOf++;throw Error('unexpected prototype');},
  });
  expect(()=>adoption.generate(proxy,preferencesA,selection)).toThrow();
  expect(traps).toEqual({get:0,ownKeys:0,getOwnPropertyDescriptor:0,getPrototypeOf:0});
 });

 it('captures a proposal only once in its owning factory and rejects clone, saved and replay objects',()=>{
  const fresh=adoption.generate(profileA,preferencesA,selection);
  expect(()=>adoption.createSaved(clone(fresh))).toThrow();
  expect(()=>createOwner().createSaved(fresh)).toThrow();
  const envelope=adoption.createSaved(fresh);expect(envelope.session.id).toBe(fresh.session.id);
  expect(()=>adoption.createSaved(fresh)).toThrow();
  expect(()=>adoption.createSaved(envelope as unknown as Candidate2GenerationProposalV1)).toThrow();
  const replay=adoption.verifySaved(clone(envelope));assertReplay(replay);
  expect(()=>adoption.createSaved(replay as unknown as Candidate2GenerationProposalV1)).toThrow();
 });

 it('replays the complete captured snapshot without any today profile or preference context',()=>{
  const birth=clone(profileA),pref=clone(preferencesA),original={birth:clone(birth),pref:clone(pref)};
  const proposal=adoption.generate(birth,pref,selection),envelope=adoption.createSaved(proposal);
  birth.birthDate='2022-02-24';birth.id='today-different-profile';pref.preferredElements.push('火');pref.requiredChars='安';
  expect(proposal.session.candidate2Naming.request.profile).toEqual(original.birth);
  expect(proposal.session.candidate2Naming.request.preferences).toEqual(original.pref);
  const replay=adoption.verifySaved(clone(envelope));assertReplay(replay);expect(replay.session).toEqual(envelope.session);
  expect(replay.verification.recordDigest).toBe(envelope.session.candidate2Naming.generation.digest);
  const verify=adoption.verifySaved as (...args:unknown[])=>unknown;
  expect(()=>verify(envelope,{profile:birth,preferences:pref,selection})).toThrow('recorded envelope only');
  observations.push({case:'snapshot-only replay',status:replay.status,recordDigest:replay.verification.recordDigest,todayContextUsed:false,storage:replay.storage});
 });

 it.each(['data-json','application-receipt','application-906','consumer-input'] as const)('rejects changed %s after generation and never reuses warm approval',kind=>{
  const proposal=adoption.generate(profileA,preferencesA,selection);
  const manifest=JSON.parse(fs.readFileSync(path.join(owned.consumerPublicationDir,'consumer-execution-manifest.json'),'utf8')) as {inputs:{path:string}[]};
  const file=kind==='data-json'?path.join(owned.dataDir,'dataset-v6.json'):
   kind==='application-receipt'?owned.applicationBundlePath+'.receipt.json':kind==='application-906'?owned.applicationBundlePath:
    path.join(owned.consumerPublicationDir,'sources',...manifest.inputs[0].path.split('/'));
  const original=fs.readFileSync(file),before=fs.statSync(file),changed=Buffer.from(original);changed[0]^=1;
  try{
   fs.writeFileSync(file,changed);
   expect(()=>adoption.generate(profileA,preferencesA,selection)).toThrow();
   expect(()=>adoption.createSaved(proposal)).toThrow();
   expect(fs.readFileSync(file)).toEqual(changed);
  }finally{fs.writeFileSync(file,original);fs.utimesSync(file,before.atime,before.mtime);}
  const capturedAfterRestore=adoption.createSaved(proposal);expect(capturedAfterRestore.session.id).toBe(proposal.session.id);
  observations.push({case:'post-generation input tamper',kind,generationRejected:true,captureRejected:true,restoredCapture:true});
 });

 it('replays archived data after live data is poisoned while keeping installed e01 and 906 unchanged',()=>{
  const file=path.join(owned.dataDir,'dataset-v6.json'),original=fs.readFileSync(file),before=fs.statSync(file);
  const installed={application:adoptionHash(fs.readFileSync(owned.applicationBundlePath)),consumer:adoptionHash(fs.readFileSync(path.join(owned.consumerPublicationDir,'consumer.cjs')))};
  try{
   fs.writeFileSync(file,Buffer.from('{"liveDataPoisoned":true}'));
   expect(()=>adoption.generate(profileA,preferencesA,selection)).toThrow();
   const replay=adoption.verifySaved(clone(captured));assertReplay(replay);
   expect(replay.session).toEqual(captured.session);
   expect(replay.session.candidate2Naming.generation.preferences).toEqual(preferencesA);
   expect(replay.session.candidate2Naming.generation.application.application.elements.applied).toEqual(['土','金']);
   expect(adoptionHash(fs.readFileSync(owned.applicationBundlePath))).toBe(installed.application);
   expect(adoptionHash(fs.readFileSync(path.join(owned.consumerPublicationDir,'consumer.cjs')))).toBe(installed.consumer);
   observations.push({case:'archived data replay under poisoned live data',status:replay.status,liveDataUsed:false,runtimeFromArchiveExecutable:replay.runtimeFromArchiveExecutable});
  }finally{fs.writeFileSync(file,original);fs.utimesSync(file,before.atime,before.mtime);}
 });

 it('rejects score 100 after recomputing public generation, application and attachment hashes',()=>{
  const bad=clone(captured),g=bad.session.candidate2Naming.generation;
  bad.session.candidates[0].evaluation.traditional=100;g.candidates[0].evaluation.traditional=100;
  seal(g.application.certificate);seal(g.application);seal(g);sealAttachment(bad);
  expect(g.digest).toBe(adoptionDigest((({digest:_previous,...body})=>body)(g)));
  expect(()=>adoption.verifySaved(bad)).toThrow();
 });

 it('rejects a self-rehashed unregistered consumer execution capsule',()=>{
  const bad=clone(captured),closed=decodeAdoptionSources(bad),capsule=clone(closed.capsule);
  capsule.consumerExecution.bundleSha256='0'.repeat(64);replaceCapsule(bad,capsule);
  expect(()=>adoption.verifySaved(bad)).toThrow('unregistered consumer execution');
 });

 it('rejects self-rehashed outer source metadata that differs from genuinely recomputed snapshot sources',()=>{
  const bad=clone(captured),closed=decodeAdoptionSources(bad),capsule=clone(closed.capsule);
  const originalGeneration=clone(bad.session.candidate2Naming.generation);
  bad.session.sourceSnapshot.sources[0].name+=' [M921 source metadata regression]';
  bad.session.candidate2Naming.sourceSnapshotDigest=adoptionDigest(bad.session.sourceSnapshot);
  capsule.sourceRecords=clone(bad.session.sourceSnapshot.sources);
  replaceCapsule(bad,capsule);
  expect(bad.session.candidate2Naming.generation).toEqual(originalGeneration);
  expect(bad.session.candidate2Naming.generation).toEqual(captured.session.candidate2Naming.generation);
  expect(()=>adoption.verifySaved(bad)).toThrow('archived source snapshot differs from recomputed sources');
 });

 it('rejects re-encoded archived application receipt metadata after updating every source hash',()=>{
  const bad=clone(captured),closed=decodeAdoptionSources(bad);
  const originalGeneration=clone(bad.session.candidate2Naming.generation);
  const receiptAsset=closed.assets.find(asset=>asset.scope==='build-receipt'&&asset.path==='application.cjs.receipt.json');
  if(!receiptAsset)throw Error('M921 actual archived application receipt asset missing');
  const receipt=JSON.parse(receiptAsset.bytes.toString('utf8')) as {metafile:{inputs:Record<string,{bytes:number}>}};
  const input=Object.values(receipt.metafile.inputs)[0];
  expect(Number.isSafeInteger(input.bytes)).toBe(true);input.bytes++;
  receiptAsset.bytes=Buffer.from(JSON.stringify(receipt,null,2)+'\n');
  const {schema:_schema,assets:_assets,witnessDigest:_witness,...body}=closed.capsule;
  body.applicationRuntime={...body.applicationRuntime,receiptSha256:adoptionHash(receiptAsset.bytes)};
  const encoded=encodeAdoptionSources(closed.assets,body);
  bad.sourceBlobs=encoded.sourceBlobs;
  bad.session.candidate2Naming.sourceCapsule=encoded.sourceCapsule;
  bad.session.candidate2Naming.sourceWitnessDigest=encoded.capsule.witnessDigest;sealAttachment(bad);
  expect(bad.session.candidate2Naming.generation).toEqual(originalGeneration);
  expect(bad.session.candidate2Naming.generation).toEqual(captured.session.candidate2Naming.generation);
  expect(()=>adoption.verifySaved(bad)).toThrow('complete fixed application receipt content differs');
 });

 it('rejects a missing source chunk and re-encoded changed execution bytes despite new leaf hashes',()=>{
  const missing=clone(captured),closed=decodeAdoptionSources(missing);
  const chunk=closed.capsule.assets.find(asset=>asset.chunks.length)!.chunks[0].blob.sha;
  missing.sourceBlobs=missing.sourceBlobs.filter(row=>row.sha!==chunk);
  expect(()=>adoption.verifySaved(missing)).toThrow();
  const bad=clone(captured),source=decodeAdoptionSources(bad);
  const manifest=JSON.parse(fs.readFileSync(path.join(owned.consumerPublicationDir,'consumer-execution-manifest.json'),'utf8')) as {inputs:{path:string}[]};
  const target=source.assets.find(asset=>asset.scope==='consumer-execution'&&asset.path===manifest.inputs[0].path)!;
  const original=Buffer.from(target.bytes);target.bytes=Buffer.from(original);target.bytes[0]^=1;
  const {schema:_schema,assets:_assets,witnessDigest:_witness,...body}=source.capsule;
  const encoded=encodeAdoptionSources(source.assets,body);
  bad.sourceBlobs=encoded.sourceBlobs;bad.session.candidate2Naming.sourceCapsule=encoded.sourceCapsule;
  bad.session.candidate2Naming.sourceWitnessDigest=encoded.capsule.witnessDigest;sealAttachment(bad);
  expect(()=>adoption.verifySaved(bad)).toThrow('consumer source closure differs');
 });
});
