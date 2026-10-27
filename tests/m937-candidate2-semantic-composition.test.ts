import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {createCandidate2SemanticCompositionV1} from '../src/main/candidate2-semantic-composition-v1';
import {createCandidate2SemanticConstraintAdapterV1} from '../src/main/candidate2-semantic-constraint-adapter-v1';
import {CANDIDATE2_NAMING_SELECTION} from '../src/shared/candidate2-naming-consumer-v1';
import {M923_FAMILY} from '../src/shared/naming-semantic-m923';
import {normalizePreferences} from '../src/shared/workflow';
import {adoptionDigest} from '../src/main/candidate2-generation-adoption-codec-v2';
import {createM921GenerationFixture,type M921GenerationFixture} from './helpers/m921-generation-fixture';
import positive from './fixtures/project-naming-use-m153.json';
import type {BirthProfile} from '../src/shared/types';
import type {Candidate2SemanticRequestV1,Candidate2SemanticCompositionRecordV1,Candidate2SemanticConfigurationV1} from '../src/shared/candidate2-semantic-composition-v1';

// Explicit environment stage: requires the fixed external M873 material.
// The environment-manifest owner must classify this file outside portable
// defaults. The original actual cases and CPU gate remain unchanged.
const evidence=process.env.M937_EVIDENCE_DIR??'D:/Codex-NamingStudio-Evidence/m937-candidate2-semantic-composition/evidence';
const observations:unknown[]=[];
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
const selection={...M923_FAMILY,enabled:true as const};
function request(char='安'):Candidate2SemanticRequestV1 {
  return {profile:clone(positive.positive.profile) as BirthProfile,preferences:normalizePreferences({length:1,requiredChars:char,zodiacRules:false,numerology:false}),candidate2Selection:CANDIDATE2_NAMING_SELECTION,semanticSelection:selection,themeIds:[]};
}

function evidenceValue(name:string,value:unknown){fs.mkdirSync(evidence,{recursive:true});const target=path.join(evidence,name);fs.writeFileSync(target+'.tmp',JSON.stringify(value,null,2)+'\n');fs.renameSync(target+'.tmp',target);}
function reseal(value:Candidate2SemanticCompositionRecordV1){const {integrityDigest,...body}=value;void integrityDigest;value.integrityDigest=adoptionDigest(body);return value;}

describe.skipIf(process.env.M937_ACTUAL_CPU_WINDOW!=='1')('M937 actual fixed local C2 + M923 composition',{timeout:120000},()=>{
  let installation:M921GenerationFixture,config:Candidate2SemanticConfigurationV1,owner:ReturnType<typeof createCandidate2SemanticCompositionV1>;
  const records=new Map<string,Candidate2SemanticCompositionRecordV1>();
  beforeAll(async()=>{
    installation=await createM921GenerationFixture();
    config={applicationBundlePath:installation.applicationBundlePath,assetDir:installation.assetDir,dataDir:installation.dataDir,consumerPublicationDir:installation.consumerPublicationDir,mechanics:{seed:23,excludeNames:[]}};
    owner=createCandidate2SemanticCompositionV1(config);
  },120000);
  afterAll(()=>{try{evidenceValue('actual-observations.json',{observations,correctnessBudgetPerCaseMs:120000,fifteenSecondAcceptanceClaim:false,storeExecuted:false,defaultCoverageAdded:0});}finally{installation?.close();}},120000);

  it('phase1 actual matched composition generates and replays the same original C2 record',()=>{
    const original=request('安'),before=clone(original),record=owner.generate(original);
    const envelope=record.candidate2Envelope,generation=envelope.session.candidate2Naming.generation;
    expect(original).toEqual(before);expect(generation.candidates.map(candidate=>candidate.givenName)).toEqual(['安']);
    expect(envelope.session.candidates).toEqual(generation.candidates);expect(envelope.session.profile).toEqual(generation.profile);
    expect(envelope.session.preferences).toEqual(generation.preferences);expect(envelope.session.analysis).toEqual(generation.baseAnalysis);
    expect(record.overlays.map(overlay=>overlay.candidateId)).toEqual(generation.candidates.map(candidate=>candidate.id));
    expect(record.candidate2Identity.envelopeSHA256).toBe(adoptionDigest(envelope));expect(record.candidate2Identity.candidatesSHA256).toBe(adoptionDigest(generation.candidates));
    for(const [index,overlay]of record.overlays.entries()){
      expect(overlay.originalEvaluation).toEqual(generation.candidates[index].evaluation);
      expect(overlay.originalTraditionalReason).toBe(generation.candidates[index].traditionalReason);
      expect(overlay.originalMeaning).toBe(generation.candidates[index].meaning);expect(overlay.scoreDelta).toBe(0);
    }
    expect(record.overlays[0].rows[0]).toMatchObject({char:'安',status:'adopted',reason:'fixed-character-meaning',project:{meaning:'取平稳、安全、舒适的环境与状态之意。'},receipt:{schema:'candidate2-semantic-occurrence/1'}});
    evidenceValue('phase1-record.json',record);
    const originalRecordDigest=adoptionDigest(record),originalEnvelopeDigest=adoptionDigest(envelope),verification=owner.verify(record);
    expect(verification).toMatchObject({status:'verified-unpersisted-composition',canSave:false,storage:'not-connected',generationAuthority:false,adoptedOccurrences:1,recordedMechanics:{seed:23,excludeNames:[]}});
    expect(adoptionDigest(record)).toBe(originalRecordDigest);expect(adoptionDigest(record.candidate2Envelope)).toBe(originalEnvelopeDigest);
    evidenceValue('phase1-result.json',{verification,request:original,originalInputSHA256:adoptionDigest(original),generationDigest:generation.digest,envelopeDigest:originalEnvelopeDigest,candidateCount:generation.candidates.length,candidateFacts:generation.candidates.map(candidate=>({id:candidate.id,givenName:candidate.givenName,evaluation:candidate.evaluation,traditionalReason:candidate.traditionalReason})),baseAnalysis:generation.baseAnalysis,semanticSourceIdentity:record.semanticSourceIdentity,sourceLeafCount:envelope.sourceBlobs.length,sourceBlobsSHA256:adoptionDigest(envelope.sourceBlobs),recordDigest:originalRecordDigest,unchanged:true,correctnessBudgetMs:120000,fifteenSecondClaim:false});
    observations.push({case:'phase1 actual matched generate and replay',verification,recordDigest:originalRecordDigest,envelopeDigest:originalEnvelopeDigest});
  });

  it('phase2 actual zero-adoption composition preserves C2 scores and rejects untrusted aggregate mutations',()=>{
    const original=request('沐'),before=clone(original),record=owner.generate(original),envelope=record.candidate2Envelope,generation=envelope.session.candidate2Naming.generation;
    expect(original).toEqual(before);expect(generation.candidates.map(candidate=>candidate.givenName)).toEqual(['沐']);
    expect(envelope.session.candidates).toEqual(generation.candidates);expect(envelope.session.analysis).toEqual(generation.baseAnalysis);expect(envelope.session.preferences).toEqual(generation.preferences);
    expect(generation.domainProjection.applied).toEqual(['土','金']);expect(generation.baseAnalysis.bazi.favorable).toEqual(['土','金','水']);
    expect(generation.candidates[0].evaluation.traditional).toBe(40);expect(record.overlays[0].originalEvaluation).toEqual(generation.candidates[0].evaluation);
    expect(record.overlays[0].rows).toMatchObject([{char:'沐',status:'not-adopted',reason:'not-in-semantic-family',project:null,receipt:null}]);
    expect(record.overlays[0].characterExplanation).toBeNull();
    evidenceValue('phase2-record.json',record);
    const unchangedDigest=adoptionDigest(envelope),verification=owner.verify(record);
    expect(verification).toMatchObject({adoptedOccurrences:0,canSave:false,storage:'not-connected',recordedMechanics:{seed:23,excludeNames:[]}});expect(adoptionDigest(envelope)).toBe(unchangedDigest);
    const mutations:Array<[string,(r:any)=>void]>=[['profile-id',r=>r.request.profile.id+='-other'],['notes',r=>r.request.profile.notes+='changed'],['parents',r=>r.request.profile.fatherName='林沐'],['required',r=>r.request.preferences.requiredChars='安'],['C2selection',r=>r.request.candidate2Selection.enabled=false],['semanticSelection',r=>r.request.semanticSelection.enabled=false],['source',r=>r.semanticSourceIdentity.pins.sourceClosureSHA256='0'.repeat(64)],['zeroOverlay',r=>r.overlays[0].rows[0].project={meaning:'伪造'}],['originalScore',r=>r.candidate2Envelope.session.candidates[0].evaluation.traditional=100]];
    for(const [label,change]of mutations){const bad=clone(record);change(bad);expect(()=>owner.verify(bad),label).toThrow();}
    const adapter=createCandidate2SemanticConstraintAdapterV1(config);
    for(const fake of [{},clone(generation),envelope,clone({schema:'context',origin:'generation'})])expect(()=>adapter.describe(fake as any)).toThrow('C2_SEMANTIC_UNTRUSTED_CONTEXT');
    expect(()=>(owner.verify as (...args:unknown[])=>unknown)(record,request())).toThrow('C2_SEMANTIC_INPUT_INVALID');
    evidenceValue('phase2-result.json',{verification,request:original,originalInputSHA256:adoptionDigest(original),generationDigest:generation.digest,envelopeDigest:unchangedDigest,sourceLeafCount:envelope.sourceBlobs.length,sourceBlobsSHA256:adoptionDigest(envelope.sourceBlobs),candidateFacts:generation.candidates.map(candidate=>({id:candidate.id,givenName:candidate.givenName,evaluation:candidate.evaluation})),applied:generation.domainProjection.applied,originalFavorable:generation.baseAnalysis.bazi.favorable,aggregateMutationCases:mutations.map(([label])=>label),aggregateMutationValidation:'no reseal; exact aggregate/request integrity only, not full source replay',fakeContextCases:4,correctnessBudgetMs:120000,fifteenSecondClaim:false});
    observations.push({case:'phase2 actual zero adoption generate/replay plus aggregate negatives',verification});
  });

  it.each(['安','沐'])('generates actual %s with unchanged C2 order, scores, application and analysis',char=>{
    const original=request(char),before=clone(original),record=owner.generate(original);records.set(char,record);
    expect(original).toEqual(before);expect(record).toMatchObject({schema:'candidate2-semantic-composition/1',status:'generated-unpersisted',canSave:false,storage:'not-connected',generationAuthority:false});
    const envelope=record.candidate2Envelope,g=envelope.session.candidate2Naming.generation;
    expect(g.candidates).toEqual(envelope.session.candidates);expect(g.baseAnalysis).toEqual(envelope.session.analysis);expect(g.preferences).toEqual(envelope.session.preferences);expect(g.profile.namingPreferences).toEqual(g.preferences);
    expect(g.preferences.preferredElements).toEqual([]);expect(g.domainProjection.applied).toEqual(['土','金']);
    expect(record.candidate2Identity.candidatesSHA256).toBe(adoptionDigest(g.candidates));expect(record.candidate2Identity.envelopeSHA256).toBe(adoptionDigest(envelope));
    expect(record.overlays.map(row=>row.candidateId)).toEqual(g.candidates.map(row=>row.id));
    record.overlays.forEach((overlay,index)=>{const candidate=g.candidates[index];expect(overlay.originalEvaluation).toEqual(candidate.evaluation);expect(overlay.originalMeaning).toBe(candidate.meaning);expect(overlay.originalTraditionalReason).toBe(candidate.traditionalReason);expect(overlay.scoreDelta).toBe(0);expect(overlay.rows.map(row=>row.char).join('')).toBe(candidate.givenName);});
    expect(g.candidates.map(candidate=>candidate.givenName)).toEqual([char]);
    const row=record.overlays[0].rows[0];
    if(char==='安'){expect(row.status).toBe('adopted');expect(row.project?.meaning).toBe('取平稳、安全、舒适的环境与状态之意。');expect(row.receipt?.schema).toBe('candidate2-semantic-occurrence/1');}
    else{expect(row).toMatchObject({status:'not-adopted',reason:'not-in-semantic-family',project:null,receipt:null});expect(record.overlays[0].characterExplanation).toBeNull();expect(g.candidates[0].evaluation.traditional).toBe(40);}
    observations.push({case:'actual generation',char,profileId:g.profile.id,candidateIds:g.candidates.map(candidate=>candidate.id),evaluations:g.candidates.map(candidate=>candidate.evaluation),applied:g.domainProjection.applied,baseFavorable:g.baseAnalysis.bazi.favorable,adoption:row.status,digest:record.integrityDigest});
    evidenceValue('record-'+char+'.json',record);
  });
  it.each(['安','沐'])('replays actual %s including zero adoption and recorded mechanics under another current owner',char=>{
    const record=records.get(char)!;expect(record).toBeDefined();
    const next=createCandidate2SemanticCompositionV1({...config,mechanics:{seed:29,excludeNames:['不同当前批次']}});
    const before=adoptionDigest(record),verification=next.verify(record);
    expect(verification).toMatchObject({status:'verified-unpersisted-composition',canSave:false,generationAuthority:false,storage:'not-connected',runtimeFromArchiveExecutable:false,profileId:record.request.profile.id,recordedMechanics:{seed:23,excludeNames:[]}});
    expect(verification.adoptedOccurrences).toBe(char==='安'?1:0);expect(adoptionDigest(record)).toBe(before);observations.push({case:'actual replay',char,verification});
  });
  it('only an actual adapter-issued context describes the original C2 calculation',()=>{
    const adapter=createCandidate2SemanticConstraintAdapterV1(config);
    for(const fake of [{},clone(records.get('安')!.candidate2Envelope.session.candidate2Naming.generation),records.get('安')!.candidate2Envelope])expect(()=>adapter.describe(fake as any)).toThrow('C2_SEMANTIC_UNTRUSTED_CONTEXT');
  });
  it('rejects changed original fields, selections, source and overlays without replaying untrusted aggregate data',()=>{
    const changes:Array<[string,(r:any)=>void]>=[
      ['profile-id',r=>r.request.profile.id+='-other'],['notes',r=>r.request.profile.notes+='changed'],['parents',r=>r.request.profile.fatherName='林安'],['required',r=>r.request.preferences.requiredChars='明'],
      ['C2 selection',r=>r.request.candidate2Selection.enabled=false],['semantic selection',r=>r.request.semanticSelection.enabled=false],['source',r=>r.semanticSourceIdentity.pins.sourceClosureSHA256='0'.repeat(64)],
      ['sense',r=>r.overlays[0].rows[0].receipt.senseId='wrong'],['overlay',r=>r.overlays[0].rows[0].project.meaning='changed'],['score',r=>r.candidate2Envelope.session.candidates[0].evaluation.traditional=0],
    ];
    for(const [label,change]of changes){const bad=clone(records.get('安')!);change(bad);expect(()=>owner.verify(bad),label).toThrow();}
    const zero=clone(records.get('沐')!);zero.request.profile.id+='-other';expect(()=>owner.verify(zero)).toThrow();
  });
  it('actual fixed replay refuses resealed foreign original request even for zero adoption',()=>{
    const bad=clone(records.get('沐')!);bad.request.profile.id+='-other';reseal(bad);expect(()=>owner.verify(bad)).toThrow('C2_SEMANTIC_RECORD_INVALID');
  });
  it('actual fixed replay refuses a caller-resealed source identity or adopted sense',()=>{
    const bad=clone(records.get('安')!);bad.semanticSourceIdentity.pins.sourceClosureSHA256='0'.repeat(64);bad.overlays[0].rows[0].receipt!.senseId='caller-sense';reseal(bad);
    expect(()=>owner.verify(bad)).toThrow('C2_SEMANTIC_RECORD_INVALID');
  });
  it('does not accept external current inputs, AI generation, extra aggregate fields or mechanics overrides',()=>{
    const record=records.get('安')!;
    expect(()=>(owner.verify as (...args:unknown[])=>unknown)(record,request())).toThrow('C2_SEMANTIC_INPUT_INVALID');
    expect(()=>(owner.generate as (...args:unknown[])=>unknown)(request(),true)).toThrow('C2_SEMANTIC_INPUT_INVALID');
    expect(()=>owner.generate({...request(),origin:'ai'} as any)).toThrow('C2_SEMANTIC_INPUT_INVALID');
    expect(()=>owner.verify({...record,canSave:true})).toThrow('C2_SEMANTIC_RECORD_INVALID');
    expect(()=>owner.verify({...record,mechanics:{seed:9,excludeNames:[]}})).toThrow('C2_SEMANTIC_RECORD_INVALID');
  });
});
