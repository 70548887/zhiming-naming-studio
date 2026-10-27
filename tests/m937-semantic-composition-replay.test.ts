import {beforeAll,afterAll,describe,it,expect,vi} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createCandidate2SemanticCompositionV1} from '../src/main/candidate2-semantic-composition-v1';
import {adoptionDigest} from '../src/main/candidate2-generation-adoption-codec-v2';
import {M923_APPLICATION_ROOT,M923_FAMILY_DIRECTORY,M923_DECISION_AND_EVIDENCE_PINS,M923_ORIGINAL_DATA_PINS} from '../src/main/naming-semantic-m923-pins';
import {createM921GenerationFixture,type M921GenerationFixture} from './helpers/m921-generation-fixture';
import type {Candidate2SemanticCompositionRecordV1} from '../src/shared/candidate2-semantic-composition-v1';

// Environment-only replay tests: fixed original records and fixed-M873 runtime
// material are required. This file belongs outside portable default tests.
const frozenRecords='D:/Codex-NamingStudio-Evidence/m937-candidate2-semantic-composition/evidence';
const recordInputs={
  'source-identity':{file:path.join(frozenRecords,'phase1/phase1-record.json'),bytes:35594872,sha256:'d0ac84e71502a5a4ec7a88c5142abeb77dfa8bc04c2765def7b9681a6a86f338'},
  'zero-profile':{file:path.join(frozenRecords,'phase2/phase2-record.json'),bytes:35591137,sha256:'fc5e3727fd1f43d604508464215a681faab28b804ae541fcb6d7fef9b18f862d'},
} as const;
type ReplayCase=keyof typeof recordInputs;
const cases:readonly ReplayCase[]=['source-identity','zero-profile'];
const root=fileURLToPath(new URL('../',import.meta.url));
const evidence=process.env.M937_REPLAY_EVIDENCE_DIR??'D:/Codex-NamingStudio-Evidence/m937-two-replay-negatives/evidence';
const sha=(value:string|Uint8Array)=>createHash('sha256').update(value).digest('hex');
const normalizedPath=(value:unknown)=>typeof value==='string'?path.resolve(value).replaceAll('\\','/').toLowerCase():null;
const sourcePins=new Map([...M923_DECISION_AND_EVIDENCE_PINS.map(pin=>({...pin,file:path.join(M923_FAMILY_DIRECTORY,pin.file),logical:'family:'+pin.file})),...M923_ORIGINAL_DATA_PINS.map(pin=>({...pin,file:path.join(M923_APPLICATION_ROOT,pin.file),logical:'original:'+pin.file}))].map(pin=>[normalizedPath(pin.file),pin]));
function save(name:string,value:unknown){fs.mkdirSync(evidence,{recursive:true});const file=path.join(evidence,name);fs.writeFileSync(file+'.tmp',JSON.stringify(value,null,2)+'\n');fs.renameSync(file+'.tmp',file);}
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;

describe.skipIf(process.env.M937_REPLAY_CPU_WINDOW!=='1')('M937 actual saved-record replay rejection without generation',{timeout:120000},()=>{
  let installation:M921GenerationFixture,owner:ReturnType<typeof createCandidate2SemanticCompositionV1>;
  beforeAll(async()=>{
    installation=await createM921GenerationFixture(root);
    owner=createCandidate2SemanticCompositionV1({applicationBundlePath:installation.applicationBundlePath,assetDir:installation.assetDir,dataDir:installation.dataDir,consumerPublicationDir:installation.consumerPublicationDir,mechanics:{seed:23,excludeNames:[]}});
    save('installation.json',{applicationBundlePath:installation.applicationBundlePath,consumerPublicationDir:installation.consumerPublicationDir,applicationSHA256:sha(fs.readFileSync(installation.applicationBundlePath)),consumerSHA256:sha(fs.readFileSync(path.join(installation.consumerPublicationDir,'consumer.cjs'))),consumerManifestSHA256:sha(fs.readFileSync(path.join(installation.consumerPublicationDir,'consumer-execution-manifest.json'))),generateCalls:0,verifyCallsBeforeCase:0});
  },120000);
  afterAll(()=>{installation?.close();},120000);

  it.each(cases)('%s: resealed outer change is rejected after actual replay and observed source checks',caseId=>{
    const input=recordInputs[caseId],raw=fs.readFileSync(input.file);
    expect(raw.length).toBe(input.bytes);expect(sha(raw)).toBe(input.sha256);
    const original=JSON.parse(raw.toString('utf8')) as Candidate2SemanticCompositionRecordV1,changed=clone(original);
    const envelopeSHA256=adoptionDigest(original.candidate2Envelope);
    const expectedDetail=caseId==='source-identity'?'fixed replay, source, original context or character explanation differs':'complete original C2 request differs';
    if(caseId==='source-identity')changed.semanticSourceIdentity.pins.sourceClosureSHA256='0'.repeat(64);
    else changed.request.profile.id+='-different-baby';
    const {integrityDigest:_old,...changedBody}=changed;void _old;changed.integrityDigest=adoptionDigest(changedBody);
    expect(changed.integrityDigest).toBe(adoptionDigest(changedBody));expect(changed.integrityDigest).not.toBe(original.integrityDigest);
    expect(adoptionDigest(changed.candidate2Envelope)).toBe(envelopeSHA256);
    const expected=clone(original);if(caseId==='source-identity')expected.semanticSourceIdentity.pins.sourceClosureSHA256='0'.repeat(64);else expected.request.profile.id+='-different-baby';expected.integrityDigest=changed.integrityDigest;expect(changed).toEqual(expected);
    if(caseId==='zero-profile')expect(changed.overlays.every(overlay=>overlay.rows.every(row=>row.receipt===null&&row.project===null))).toBe(true);
    save('input-preflight.json',{caseId,original:input,originalInputSHA256:adoptionDigest(original.request),originalEnvelopeSHA256:envelopeSHA256,changedEnvelopeSHA256:adoptionDigest(changed.candidate2Envelope),originalAggregateDigest:original.integrityDigest,changedAggregateDigest:changed.integrityDigest,changedAggregateMatchesBody:true,changedField:caseId==='source-identity'?'semanticSourceIdentity.pins.sourceClosureSHA256':'request.profile.id',originalRequest:original.request,changedRequest:changed.request,originalSourceIdentity:original.semanticSourceIdentity,changedSourceIdentity:changed.semanticSourceIdentity,actualSourceFilesModified:false,generateCalls:0,plannedJointVerifyCalls:1,expectedDetail});
    const actualRead=fs.readFileSync,reads:Array<{logical:string;sha256:string;bytes:number;matchesFixedPin:boolean}>=[];
    const observer=vi.spyOn(fs,'readFileSync').mockImplementation(((filename:unknown,...options:unknown[])=>{
      const result=Reflect.apply(actualRead,fs,[filename,...options]);
      const pin=sourcePins.get(normalizedPath(filename));
      if(pin){const bytes=typeof result==='string'?Buffer.from(result):result as Buffer;reads.push({logical:pin.logical,sha256:sha(bytes),bytes:bytes.length,matchesFixedPin:bytes.length===pin.bytes&&sha(bytes)===pin.sha256});}
      return result;
    }) as typeof fs.readFileSync);
    let captured:unknown,jointVerifyCalls=0;const started=performance.now();
    try{jointVerifyCalls++;owner.verify(changed);}catch(error){captured=error;}finally{observer.mockRestore();}
    const error=captured as {code?:unknown;detail?:unknown;message?:unknown}|undefined;
    const unique=new Set(reads.map(read=>read.logical)),allSourcesReached=reads.length===39&&unique.size===39&&reads.every(read=>read.matchesFixedPin);
    const reached=allSourcesReached&&error?.code==='C2_SEMANTIC_RECORD_INVALID'&&error.detail===expectedDetail?'actual-C2-replay-completed;physical-M923-closure-read;expected-composition-comparison-rejected':reads.length>0?'physical-M923-read-observed;expected-comparison-not-confirmed':error?.code==='C2_SEMANTIC_C2_REJECTED'?'actual-C2-path-rejected-before-M923':'earlier-or-unexpected-stage';
    save('actual-result.json',{caseId,jointVerifyCalls,generateCalls:0,elapsedVerifyMs:performance.now()-started,error:{code:error?.code??null,detail:error?.detail??null,message:error?.message??String(captured)},reached,physicalM923ReadCount:reads.length,uniqueM923Paths:unique.size,expectedFixedM923Paths:39,allSourceBytesMatched:allSourcesReached,reads,expectedFunctionalRejectionPass:allSourcesReached&&error?.code==='C2_SEMANTIC_RECORD_INVALID'&&error.detail===expectedDetail,observation:'Native readFileSync call-through only; no source bytes, owner or error replaced.',logicalC2ReplayCount:{expectedFromFixedSingleCallPath:1,dynamicCounterInjected:false,completedInferredOnlyWhenExpectedDownstreamComparisonAndPhysicalSourcesObserved:true},notCovered:['physical-source-file-tamper','generation','other-nine-full-owner-suite-completion','stored-session-origin','alternate-owner-recorded-mechanics'],correctnessTimeoutMs:120000,fifteenSecondAcceptanceClaim:false});
    expect(jointVerifyCalls).toBe(1);expect(error?.code).toBe('C2_SEMANTIC_RECORD_INVALID');expect(error?.detail).toBe(expectedDetail);
    expect(reads.length).toBe(39);expect(unique.size).toBe(39);expect(reads.every(read=>read.matchesFixedPin)).toBe(true);
    expect(sha(fs.readFileSync(input.file))).toBe(input.sha256);expect(adoptionDigest(changed.candidate2Envelope)).toBe(envelopeSHA256);
    for(const pin of sourcePins.values()){const bytes=fs.readFileSync(pin.file);expect(bytes.length).toBe(pin.bytes);expect(sha(bytes)).toBe(pin.sha256);}
    save('terminal-assertions.json',{caseId,status:'passed-expected-rejection',actualJointVerifyCalls:1,generateCalls:0,all39PhysicalSourcePinsUnchanged:true,originalRecordUnchanged:true,originalC2EnvelopeUnchanged:true,reached});
  });
});
