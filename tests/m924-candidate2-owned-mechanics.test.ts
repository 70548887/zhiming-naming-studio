import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {deflateRawSync} from 'node:zlib';
import {createCandidate2GenerationAdoptionV2} from '../src/main/candidate2-generation-adoption-v2';
import {createCandidate2GenerationAdoptionV1} from '../src/main/candidate2-generation-adoption-v1';
import {adoptionDigest,adoptionHash,decodeAdoptionSourcesV2,encodeAdoptionSources} from '../src/main/candidate2-generation-adoption-codec-v2';
import {createM921GenerationFixture,type M921GenerationFixture} from './helpers/m921-generation-fixture';
import {CANDIDATE2_NAMING_SELECTION} from '../src/shared/candidate2-naming-consumer-v1';
import {normalizePreferences} from '../src/shared/workflow';
import {canonicalPlainJson} from '../src/shared/plain-json';
import {validSessionSources} from '../src/shared/session-sources';
import fixture from './fixtures/project-naming-use-m153.json';
import type {BirthProfile,NamingPreferences} from '../src/shared/types';

type Owner=ReturnType<typeof createCandidate2GenerationAdoptionV2>;
type Proposal=ReturnType<Owner['generate']>;
type Envelope=ReturnType<Owner['createSaved']>;
type Replay=ReturnType<Owner['verifySaved']>;
type Mechanics={seed:number;excludeNames:string[]};
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
const selection=CANDIDATE2_NAMING_SELECTION;
const profile=structuredClone(fixture.positive.profile) as BirthProfile;
const unrestricted=normalizePreferences({length:1,requiredChars:'',zodiacRules:false,numerology:false});
const onlyMu=normalizePreferences({length:1,requiredChars:'沐',zodiacRules:false,numerology:false});
const mechanics23:Mechanics={seed:23,excludeNames:[]};
const mechanics29:Mechanics={seed:29,excludeNames:[]};
let owned:M921GenerationFixture;
let owner23:Owner,owner29:Owner;
let first23:Proposal,captured23:Envelope;
const observations:unknown[]=[];

function paths(){return{applicationBundlePath:owned.applicationBundlePath,assetDir:owned.assetDir,dataDir:owned.dataDir,consumerPublicationDir:owned.consumerPublicationDir};}
function makeOwner(mechanics:Mechanics):Owner{return createCandidate2GenerationAdoptionV2({...paths(),mechanics});}
function assertMechanics(value:{mechanics:Mechanics;session:Proposal['session']},expected:Mechanics){
 expect(value.mechanics).toEqual(expected);
 const generation=value.session.candidate2Naming.generation;
 expect(generation.seed).toBe(expected.seed);expect(generation.excludeNames).toEqual(expected.excludeNames);
 expect(generation.profile.namingPreferences).toEqual(generation.preferences);
 expect(generation.preferences.preferredElements).toEqual([]);
 expect(generation.application.application.elements.applied).toEqual(['土','金']);
 expect(generation.domainProjection.applied).toEqual(['土','金']);
 expect(value.session.analysis).toEqual(generation.baseAnalysis);
 expect(value.session.originalFavorable).toEqual(['土','金','水']);
 expect(value.session.candidate2Naming.schema).toBe('candidate2-naming-session/1');
 expect(generation.application.schema).toBe('project-naming-use/2');
 expect(validSessionSources(value.session)).toBe(true);
}
function assertProposal(value:Proposal,mechanics:Mechanics,preferences:NamingPreferences){
 expect(value).toMatchObject({schema:'candidate2-generation-proposal/2',status:'generated-unpersisted',generationAuthority:false,storage:'not-connected',canSave:false,traditionalStatus:'unknown'});
 assertMechanics(value,mechanics);
 expect(value.session.candidate2Naming.request).toEqual({schema:'candidate2-session-request/1',profile,preferences,selection});
 expect(value.session.candidate2Naming.generation.preferences).toEqual(preferences);
 expect(value.session.candidates.length).toBeGreaterThan(0);
 expect(Object.isFrozen(value.mechanics)).toBe(true);expect(Object.isFrozen(value.mechanics.excludeNames)).toBe(true);
}
function assertEnvelope(value:Envelope,mechanics:Mechanics){
 expect(value).toMatchObject({schema:'candidate2-adoption-envelope/2',generationAuthority:false,storage:'not-connected'});
 assertMechanics(value,mechanics);expect(value.sourceBlobs.length).toBeGreaterThan(200);
}
function assertReplay(value:Replay,mechanics:Mechanics){
 expect(value).toMatchObject({schema:'candidate2-adoption-replay/2',status:'verified-envelope-replay',generationAuthority:false,canSave:false,storage:'not-connected',runtimeFromArchiveExecutable:false,traditionalStatus:'unknown'});
 assertMechanics(value,mechanics);
 expect(value.verification).toMatchObject({status:'verified-saved',generationAuthority:false,replayOrigin:'saved-replay'});
 expect(value.status).not.toBe('verified-stored');
}
function evidence(name:string,value:unknown){
 const directory=process.env.M924_EVIDENCE_DIR;if(!directory)return;
 const file=path.join(path.resolve(directory),name);fs.mkdirSync(path.dirname(file),{recursive:true});
 fs.writeFileSync(file+'.tmp',JSON.stringify(value,null,2)+'\n');fs.renameSync(file+'.tmp',file);
}
function recordGeneration(label:string,value:Proposal,rawPreferences:NamingPreferences){
 const generation=value.session.candidate2Naming.generation;
 evidence('m924-'+label+'.json',{rawProfile:profile,rawPreferences,mechanics:value.mechanics,generation,sessionId:value.session.id,storage:value.storage,storeHistoryQueryExecuted:false});
 observations.push({case:label,sessionId:value.session.id,mechanics:value.mechanics,candidateCount:generation.candidates.length,firstName:generation.candidates[0]?.fullName,applied:generation.application.application.elements.applied,recordedGenerationDigest:generation.digest,storeHistoryQueryExecuted:false});
}
function sealAttachment(envelope:Envelope){
 const attachment=envelope.session.candidate2Naming,{attachmentDigest:_old,...body}=attachment;
 attachment.attachmentDigest=adoptionDigest(body);return envelope;
}
function replaceCapsule(envelope:Envelope,capsule:ReturnType<typeof decodeAdoptionSourcesV2>['capsule']){
 const attachment=envelope.session.candidate2Naming,old=attachment.sourceCapsule.sha;
 const {witnessDigest:_previous,...body}=capsule;capsule.witnessDigest=adoptionDigest(body);
 const bytes=Buffer.from(canonicalPlainJson(capsule)),row={sha:adoptionHash(bytes),rawBytes:bytes.length,codec:'deflate-raw/1' as const,payloadBase64:deflateRawSync(bytes,{level:6}).toString('base64')};
 envelope.sourceBlobs=envelope.sourceBlobs.filter(value=>value.sha!==old);envelope.sourceBlobs.push(row);
 attachment.sourceCapsule={role:'candidate2-source-capsule',sha:row.sha,rawBytes:row.rawBytes,codec:row.codec};attachment.sourceWitnessDigest=capsule.witnessDigest;
 return sealAttachment(envelope);
}

beforeAll(async()=>{
 // This helper installs the fixed runtime from the reviewed fixture. Its
 // M921 name is a fixture origin, not an M924 result or execution claim.
 owned=await createM921GenerationFixture();owner23=makeOwner(mechanics23);owner29=makeOwner(mechanics29);
 first23=owner23.generate(profile,unrestricted,selection);assertProposal(first23,mechanics23,unrestricted);
 captured23=owner23.createSaved(first23);assertEnvelope(captured23,mechanics23);
 recordGeneration('seed23-first-generation',first23,unrestricted);
},120000);

afterAll(()=>{
 try{evidence('m924-owned-mechanics-summary.json',{observations,storeHistoryQueryExecuted:false,sqlPersistenceExecuted:false,storage:'not-connected',fixtureOrigin:'fixed M921 runtime installation fixture; all M924 outcomes are from this test run'});}
 finally{if(typeof owned!=='undefined')owned.close();}
},120000);

describe('M924 main-owned candidate.2 seed and exclusions',{timeout:120000},()=>{
 it('records actual seed 23 with untouched original preferences and complete generation facts',()=>{
  assertProposal(first23,mechanics23,unrestricted);assertEnvelope(captured23,mechanics23);
  expect(first23.session.candidate2Naming.request.preferences.requiredChars).toBe('');
  expect(unrestricted.preferredElements).toEqual([]);expect(profile).toEqual(fixture.positive.profile);
  expect(first23.mechanics.seed).not.toBe(17);
  const closed=decodeAdoptionSourcesV2(captured23);
  expect(closed.capsule.schema).toBe('candidate2-naming-source-capsule/1');
 });

 it('executes seed 29 as an independent real generation and captures its own mechanics',()=>{
  const second=owner29.generate(profile,unrestricted,selection);assertProposal(second,mechanics29,unrestricted);
  const saved=owner29.createSaved(second);assertEnvelope(saved,mechanics29);
  expect(second.session.id).not.toBe(first23.session.id);
  expect(second.session.candidate2Naming.generation.seed).not.toBe(first23.session.candidate2Naming.generation.seed);
  expect(second.session.candidate2Naming.generation.digest).not.toBe(first23.session.candidate2Naming.generation.digest);
  recordGeneration('seed29-generation',second,unrestricted);
 });

 it('excludes the actual prior first-batch name with the same seed and still generates a nonempty batch',()=>{
  const priorName=first23.session.candidates[0].fullName;
  expect(typeof priorName).toBe('string');expect(priorName.length).toBeGreaterThan(0);
  const nextMechanics={seed:23,excludeNames:[priorName]},nextOwner=makeOwner(nextMechanics);
  const next=nextOwner.generate(profile,unrestricted,selection);assertProposal(next,nextMechanics,unrestricted);
  expect(next.session.candidates.every(candidate=>candidate.fullName!==priorName)).toBe(true);
  expect(next.session.candidates.length).toBeGreaterThan(0);
  const saved=nextOwner.createSaved(next);assertEnvelope(saved,nextMechanics);
  const todayOwner=makeOwner({seed:29,excludeNames:[]});
  const replay=todayOwner.verifySaved(saved);assertReplay(replay,nextMechanics);
  expect(replay.session).toEqual(saved.session);
  expect(replay.verification.recordDigest).toBe(saved.session.candidate2Naming.generation.digest);
  expect(replay.session.candidates.every(candidate=>candidate.fullName!==priorName)).toBe(true);
  expect(()=>todayOwner.createSaved(replay as unknown as Proposal)).toThrow();
  observations.push({case:'recorded nonempty exclusions replay',recorded:replay.mechanics,currentOwner:{seed:29,excludeNames:[]},priorName,status:replay.status,recordDigest:replay.verification.recordDigest,storeHistoryQueryExecuted:false});
  recordGeneration('actual-prior-name-excluded',next,unrestricted);
  observations.push({case:'prior exclusion provenance',priorName,sourceSessionId:first23.session.id,seed:23,storeHistoryQueryExecuted:false,exclusionSource:'actual immediately preceding test batch; no Store history query'});
 });

 it('first generates the real required 沐 candidate and then refuses exclusion of all actual candidates',()=>{
  const originalOwner=makeOwner({seed:29,excludeNames:[]});
  const genuine=originalOwner.generate(profile,onlyMu,selection);assertProposal(genuine,{seed:29,excludeNames:[]},onlyMu);
  expect(genuine.session.candidates.map(candidate=>candidate.fullName)).toEqual(['林沐']);
  const exclusions=[...new Set(genuine.session.candidates.flatMap(candidate=>[candidate.fullName,candidate.givenName]))];
  const exhausted=makeOwner({seed:29,excludeNames:exclusions});
  expect(()=>exhausted.generate(profile,onlyMu,selection)).toThrow('CANDIDATE2_NAMING_NO_CANDIDATES');
  expect(onlyMu.requiredChars).toBe('沐');expect(onlyMu.preferredElements).toEqual([]);
  recordGeneration('required-mu-before-exclusion',genuine,onlyMu);
  observations.push({case:'all actual required-name candidates excluded',seed:29,excludeNames:exclusions,rawRequiredChars:'沐',expectedConsumerError:'CANDIDATE2_NAMING_NO_CANDIDATES',storeHistoryQueryExecuted:false});
 });

 it('captures only the owning live proposal once, never a clone or foreign proposal',()=>{
  const fresh=owner23.generate(profile,unrestricted,selection);
  expect(()=>owner23.createSaved(clone(fresh))).toThrow();expect(()=>owner29.createSaved(fresh)).toThrow();
  const saved=owner23.createSaved(fresh);assertEnvelope(saved,mechanics23);
  expect(()=>owner23.createSaved(fresh)).toThrow();
  expect(()=>owner23.createSaved(saved as unknown as Proposal)).toThrow();
 });

 it('replays recorded seed and exclusions under a different current owner without creating capture authority',()=>{
  const priorName=first23.session.candidates[0].fullName;
  const todayOwner=makeOwner({seed:29,excludeNames:[priorName]});
  const replay=todayOwner.verifySaved(clone(captured23));assertReplay(replay,mechanics23);
  expect(replay.verification.recordDigest).toBe(captured23.session.candidate2Naming.generation.digest);
  expect(replay.session).toEqual(captured23.session);
  expect(()=>todayOwner.createSaved(replay as unknown as Proposal)).toThrow();
  const verify=todayOwner.verifySaved as (...args:unknown[])=>unknown;
  expect(()=>verify(captured23,{mechanics:{seed:29,excludeNames:[priorName]}})).toThrow();
  observations.push({case:'recorded mechanics replay',recorded:replay.mechanics,currentOwner:{seed:29,excludeNames:[priorName]},status:replay.status,generationAuthority:replay.generationAuthority,storeHistoryQueryExecuted:false});
 });

 it('refuses genuine v1 envelopes without silently upgrading the old version',()=>{
  // This is a separate compatibility control of the unchanged v1 API. Its
  // fixed mechanics do not supply the v2 prior-name exclusion experiment.
  const old=createCandidate2GenerationAdoptionV1(paths()),oldProposal=old.generate(profile,onlyMu,selection),oldEnvelope=old.createSaved(oldProposal);
  expect(oldEnvelope.schema).toBe('candidate2-adoption-envelope/1');expect(oldEnvelope).not.toHaveProperty('mechanics');
  expect(()=>owner23.verifySaved(oldEnvelope)).toThrow();
 });

 it('rejects fourth caller mechanics, a one-argument eligibility DTO and injected mechanics fields',()=>{
  const generate=owner23.generate as (...args:unknown[])=>unknown;
  expect(generate.length).toBe(3);
  expect(()=>generate(profile,unrestricted,selection,{seed:29,excludeNames:[]})).toThrow();
  expect(()=>generate({schema:'candidate2-naming-eligibility/1',status:'eligible',mechanics:mechanics23})).toThrow();
  expect(()=>owner23.generate({...profile,mechanics:mechanics29} as BirthProfile,unrestricted,selection)).toThrow();
  expect(()=>owner23.generate(profile,{...unrestricted,mechanics:mechanics29} as NamingPreferences,selection)).toThrow();
  expect(()=>owner23.generate(profile,unrestricted,{...selection,mechanics:mechanics29} as typeof selection)).toThrow();
 });

 it.each([
  {name:'missing seed',value:{excludeNames:[]}},
  {name:'fractional seed',value:{seed:23.5,excludeNames:[]}},
  {name:'non-finite seed',value:{seed:Infinity,excludeNames:[]}},
  {name:'string seed',value:{seed:'23',excludeNames:[]}},
  {name:'missing exclusions',value:{seed:23}},
  {name:'nonarray exclusions',value:{seed:23,excludeNames:'林沐'}},
  {name:'nonstring exclusion',value:{seed:23,excludeNames:[23]}},
  {name:'extra mechanism field',value:{seed:23,excludeNames:[],authority:'caller'}},
 ])('rejects malformed constructor mechanics: $name',({value})=>{
  expect(()=>createCandidate2GenerationAdoptionV2({...paths(),mechanics:value} as unknown as Parameters<typeof createCandidate2GenerationAdoptionV2>[0])).toThrow();
 });

 it('rejects callback and getter mechanics without invoking caller code',()=>{
  let callbacks=0,getters=0;
  const callback=()=>{callbacks++;return 23;};
  expect(()=>createCandidate2GenerationAdoptionV2({...paths(),mechanics:{seed:callback,excludeNames:[]}} as unknown as Parameters<typeof createCandidate2GenerationAdoptionV2>[0])).toThrow();
  const mechanics=Object.defineProperty({excludeNames:[]},'seed',{enumerable:true,get(){getters++;return 23;}});
  expect(()=>createCandidate2GenerationAdoptionV2({...paths(),mechanics} as unknown as Parameters<typeof createCandidate2GenerationAdoptionV2>[0])).toThrow();
  expect(callbacks).toBe(0);expect(getters).toBe(0);
 });

 it.each(['configuration','mechanics','exclusions'] as const)('rejects a constructor %s Proxy before any trap',location=>{
  const traps={get:0,ownKeys:0,getOwnPropertyDescriptor:0,getPrototypeOf:0};
  const target=location==='configuration'?{...paths(),mechanics:clone(mechanics23)}:location==='mechanics'?clone(mechanics23):[];
  const proxy=new Proxy(target,{
   get(){traps.get++;throw Error('unexpected get');},ownKeys(){traps.ownKeys++;throw Error('unexpected ownKeys');},
   getOwnPropertyDescriptor(){traps.getOwnPropertyDescriptor++;throw Error('unexpected descriptor');},getPrototypeOf(){traps.getPrototypeOf++;throw Error('unexpected prototype');},
  });
  const configuration=location==='configuration'?proxy:location==='mechanics'?{...paths(),mechanics:proxy}:{...paths(),mechanics:{seed:23,excludeNames:proxy}};
  expect(()=>createCandidate2GenerationAdoptionV2(configuration as unknown as Parameters<typeof createCandidate2GenerationAdoptionV2>[0])).toThrow();
  expect(traps).toEqual({get:0,ownKeys:0,getOwnPropertyDescriptor:0,getPrototypeOf:0});
 });

 it('owns detached constructor mechanics and preserves raw caller inputs after external mutation',()=>{
  const mechanics=clone(mechanics23),configuration={...paths(),mechanics};
  const owner=createCandidate2GenerationAdoptionV2(configuration);
  mechanics.seed=29;mechanics.excludeNames.push(first23.session.candidates[0].fullName);
  const birth=clone(profile),pref=clone(unrestricted),original={profile:clone(birth),preferences:clone(pref)};
  const proposal=owner.generate(birth,pref,selection);assertProposal(proposal,mechanics23,unrestricted);
  birth.birthDate='2022-02-24';birth.id='m924-mutated-caller';pref.preferredElements.push('火');pref.requiredChars='沐';
  const envelope=owner.createSaved(proposal);assertEnvelope(envelope,mechanics23);
  expect(envelope.session.candidate2Naming.request.profile).toEqual(original.profile);
  expect(envelope.session.candidate2Naming.request.preferences).toEqual(original.preferences);
  expect(envelope.mechanics).toEqual({seed:23,excludeNames:[]});
  recordGeneration('detached-owned-mechanics',proposal,original.preferences);
 });

 it('rejects envelope mechanics that disagree with its immutable generated seed or exclusions',()=>{
  const seed=clone(captured23);seed.mechanics.seed=29;
  expect(()=>owner23.verifySaved(seed)).toThrow();
  const exclusions=clone(captured23);exclusions.mechanics.excludeNames.push(first23.session.candidates[0].fullName);
  expect(()=>owner23.verifySaved(exclusions)).toThrow();
 });

 it('independently rejects self-rehashed outer source metadata with unchanged v2 generation',()=>{
  const bad=clone(captured23),closed=decodeAdoptionSourcesV2(bad),capsule=clone(closed.capsule);
  const originalGeneration=clone(bad.session.candidate2Naming.generation);
  bad.session.sourceSnapshot.sources[0].name+=' [M924 source metadata regression]';
  bad.session.candidate2Naming.sourceSnapshotDigest=adoptionDigest(bad.session.sourceSnapshot);
  capsule.sourceRecords=clone(bad.session.sourceSnapshot.sources);replaceCapsule(bad,capsule);
  expect(bad.session.candidate2Naming.generation).toEqual(originalGeneration);
  expect(bad.mechanics).toEqual(mechanics23);
  expect(()=>owner23.verifySaved(bad)).toThrow('archived source snapshot differs from recomputed sources');
 });

 it('independently rejects a re-encoded altered archived receipt with unchanged v2 generation',()=>{
  const bad=clone(captured23),closed=decodeAdoptionSourcesV2(bad);
  const originalGeneration=clone(bad.session.candidate2Naming.generation);
  const asset=closed.assets.find(value=>value.scope==='build-receipt'&&value.path==='application.cjs.receipt.json');
  if(!asset)throw Error('M924 real archived application receipt missing');
  const receipt=JSON.parse(asset.bytes.toString('utf8')) as {metafile:{inputs:Record<string,{bytes:number}>}};
  const input=Object.values(receipt.metafile.inputs)[0];expect(Number.isSafeInteger(input.bytes)).toBe(true);input.bytes++;
  asset.bytes=Buffer.from(JSON.stringify(receipt,null,2)+'\n');
  const {schema:_schema,assets:_assets,witnessDigest:_witness,...body}=closed.capsule;
  body.applicationRuntime={...body.applicationRuntime,receiptSha256:adoptionHash(asset.bytes)};
  const encoded=encodeAdoptionSources(closed.assets,body);
  bad.sourceBlobs=encoded.sourceBlobs;bad.session.candidate2Naming.sourceCapsule=encoded.sourceCapsule;
  bad.session.candidate2Naming.sourceWitnessDigest=encoded.capsule.witnessDigest;sealAttachment(bad);
  expect(bad.session.candidate2Naming.generation).toEqual(originalGeneration);
  expect(bad.mechanics).toEqual(mechanics23);
  expect(()=>owner23.verifySaved(bad)).toThrow('complete fixed application receipt content differs');
 });
});
