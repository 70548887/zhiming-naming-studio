import {isDeepStrictEqual as equal} from 'node:util';
import {createHash} from 'node:crypto';
import {snapshotApplicationJson} from './project-application-v132-r2-json';
import {adoptionDigest,ownAdoptionEnvelopeV2} from './candidate2-generation-adoption-codec-v2';
import {createCandidate2SemanticConstraintAdapterV1} from './candidate2-semantic-constraint-adapter-v1';
import type {Candidate2SemanticOwnedContextV1} from './candidate2-semantic-constraint-adapter-v1';
import {Candidate2SemanticError,candidate2SemanticNeed as need} from './candidate2-semantic-errors-v1';
import {loadM921M923Family,getAuthenticatedM923Resources} from './naming-semantic-m923-data';
import type {AuthenticatedM923Resources} from './naming-semantic-m923-data';
import {normalizeM923FamilySelection,normalizeM923ThemeIds} from './naming-semantic-m923';
import {CANDIDATE2_GENERATION_CONSUMER_EXECUTION_V1} from './candidate2-generation-resources-v2';
import {CANDIDATE2_NAMING_SELECTION} from '../shared/candidate2-naming-consumer-v1';
import {CANDIDATE2_SEMANTIC_COMPOSITION_SCHEMA,CANDIDATE2_SEMANTIC_CONSTRAINT_ENGINE} from '../shared/candidate2-semantic-composition-v1';
import type {Candidate2SemanticConfigurationV1,Candidate2SemanticRequestV1,Candidate2SemanticCompositionRecordV1,Candidate2SemanticVerificationV1,Candidate2SemanticOriginalIdentityV1,Candidate2SemanticSourceIdentityV1,Candidate2SemanticOccurrenceReceiptV1,Candidate2SemanticOverlayV1,Candidate2SemanticPositionV1} from '../shared/candidate2-semantic-composition-v1';
import type {M923AdmissionRecord} from '../shared/naming-semantic-m923';

export {Candidate2SemanticError} from './candidate2-semantic-errors-v1';
const sourcePolicy='fixed-c2-replay-and-physical-m923-source-recheck/1' as const;
const limitations=Object.freeze([
  'Original candidate.2 names, order, all five scores, application basis and base analysis remain unchanged.',
  'This record adds optional fixed single-character explanations only; it does not expand or filter the C2 candidate pool.',
  'No whole-name meaning, personality, fortune, element change or semantic score is granted.',
  'Local C2 generation only. AI generation and optional unsupported enrichments remain outside this composition.',
  'Deterministic integrity and replay are not a secret signature or proof of a past issuer event.',
  'The record is unpersisted and cannot authorize Store, Service, IPC, review or database writes.',
]);
const recordKeys=['schema','status','canSave','storage','generationAuthority','request','candidate2Envelope','candidate2Identity','semanticSourceIdentity','constraintEngineId','contextSHA256','overlays','sourcePolicy','limitations','integrityDigest'];
const own=<T>(value:T):T=>snapshotApplicationJson(value) as T;
const textHash=(value:string)=>createHash('sha256').update(value,'utf8').digest('hex');
const objectHash=(value:unknown)=>textHash(JSON.stringify(value));
function exact(value:unknown,keys:readonly string[],detail:string):asserts value is Record<string,unknown>{
  need(!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key)),'C2_SEMANTIC_INPUT_INVALID',detail);
}
/** Shape is only the request boundary, never evidence that a source or a C2
 * generation was admitted. It runs before constructing any physical owner. */
export function captureCandidate2SemanticRequestV1(input:unknown):Candidate2SemanticRequestV1 {
  let value:unknown;try{value=snapshotApplicationJson(input);}catch{throw new Candidate2SemanticError('C2_SEMANTIC_INPUT_INVALID','ordinary complete request required');}
  exact(value,['profile','preferences','candidate2Selection','semanticSelection','themeIds'],'exact five request fields required');
  need(equal(value.candidate2Selection,CANDIDATE2_NAMING_SELECTION),'C2_SEMANTIC_SELECTION_REQUIRED','explicit exact candidate.2 selection required');
  let semanticSelection:Candidate2SemanticRequestV1['semanticSelection'],themeIds:Candidate2SemanticRequestV1['themeIds'];
  try{semanticSelection=normalizeM923FamilySelection(value.semanticSelection);themeIds=normalizeM923ThemeIds(value.themeIds);}catch{throw new Candidate2SemanticError('C2_SEMANTIC_SELECTION_REQUIRED','explicit registered semantic selection and themes required');}
  need(!!value.profile&&typeof value.profile==='object'&&!Array.isArray(value.profile)&&!!value.preferences&&typeof value.preferences==='object'&&!Array.isArray(value.preferences),'C2_SEMANTIC_INPUT_INVALID','profile and preferences required');
  return own({...value,semanticSelection,themeIds}) as unknown as Candidate2SemanticRequestV1;
}
function semanticResources():AuthenticatedM923Resources {
  // Always invoke the physical fixed loader, including every replay. It may
  // reuse pure parsed values only after re-reading all fixed current bytes.
  const loaded=loadM921M923Family();
  if(!loaded.ok)throw new Candidate2SemanticError(loaded.code==='M923_SOURCE_UNAVAILABLE'?'C2_SEMANTIC_SOURCE_UNAVAILABLE':'C2_SEMANTIC_SOURCE_INTEGRITY',loaded.code);
  return getAuthenticatedM923Resources(loaded.handle);
}
function sourceIdentity(resources:AuthenticatedM923Resources):Candidate2SemanticSourceIdentityV1{return own({family:resources.identity,pins:resources.pins});}
/** No scoring entry point exists in this composition. The registered original
 * C2 result is the only candidate and application source. */
export function createCandidate2SemanticCompositionV1(configuration:Candidate2SemanticConfigurationV1){
  need(arguments.length===1,'C2_SEMANTIC_INPUT_INVALID','one main configuration required');
  const adapter=createCandidate2SemanticConstraintAdapterV1(configuration);
  function derive(request:Candidate2SemanticRequestV1,context:Candidate2SemanticOwnedContextV1,resources:AuthenticatedM923Resources):Omit<Candidate2SemanticCompositionRecordV1,'integrityDigest'> {
    const actual=adapter.describe(context),envelope=actual.envelope,generation=actual.generation,original=envelope.session.candidate2Naming.request;
    need(equal(request.profile,original.profile)&&equal(request.preferences,original.preferences)&&equal(request.candidate2Selection,original.selection),'C2_SEMANTIC_RECORD_INVALID','complete original C2 request differs');
    need(generation.dataIdentity.packSha256===resources.pins.basePackSHA256&&generation.dataIdentity.datasetSha256===resources.pins.baseDatasetSHA256,'C2_SEMANTIC_SOURCE_INTEGRITY','C2 and M923 must use the same actual fixed baseline');
    need(equal(envelope.session.candidates,generation.candidates)&&equal(envelope.session.profile,generation.profile)&&equal(envelope.session.preferences,generation.preferences)&&equal(envelope.session.analysis,generation.baseAnalysis),'C2_SEMANTIC_RECORD_INVALID','original C2 facts unchanged');
    const candidate2Identity:Candidate2SemanticOriginalIdentityV1=own({
      envelopeSchema:'candidate2-adoption-envelope/2',envelopeSHA256:adoptionDigest(envelope),sessionId:envelope.session.id,profileId:envelope.session.profileId,createdAt:envelope.session.createdAt,
      generationSchema:generation.schema,generationDigest:generation.digest,consumerVersion:generation.consumerVersion,consumerExecution:CANDIDATE2_GENERATION_CONSUMER_EXECUTION_V1,
      applicationTuple:generation.application.tuple,applicationSHA256:adoptionDigest(generation.application),dataIdentity:generation.dataIdentity,mechanics:envelope.mechanics,
      originalProfileSHA256:adoptionDigest(actual.profile),originalPreferencesSHA256:adoptionDigest(actual.preferences),candidatesSHA256:adoptionDigest(generation.candidates),baseAnalysisSHA256:adoptionDigest(generation.baseAnalysis),domainProjectionSHA256:adoptionDigest(generation.domainProjection),
    });
    const semanticSourceIdentity=sourceIdentity(resources);
    const contextSHA256=adoptionDigest({schema:'candidate2-semantic-context/1',constraintEngineId:CANDIDATE2_SEMANTIC_CONSTRAINT_ENGINE,request,originalProfile:actual.profile,originalPreferences:actual.preferences,computationPreferences:actual.computationPreferences,candidate2Identity,semanticSourceIdentity});
    const overlays:Candidate2SemanticOverlayV1[]=generation.candidates.map((candidate,candidateIndex)=>{
      const candidateFactsSHA256=adoptionDigest(candidate),glyphs=[...candidate.givenName];
      need(candidate.fullName===actual.profile.surname+candidate.givenName&&glyphs.length===actual.preferences.length&&candidate.characters.length===glyphs.length,'C2_SEMANTIC_RECORD_INVALID','actual candidate occurrence');
      const rows:Candidate2SemanticPositionV1[]=candidate.characters.map((entry,position)=>{
        need(glyphs[position]===entry.char,'C2_SEMANTIC_RECORD_INVALID','actual character position');
        const base={position,char:entry.char,pinyin:entry.pinyin,tone:entry.tone};
        const unadopted=(reason:Candidate2SemanticPositionV1['reason']):Candidate2SemanticPositionV1=>({...base,status:'not-adopted',reason,project:null,receipt:null});
        const record=resources.records.find(row=>row.identity.char===entry.char);
        if(!record)return unadopted('not-in-semantic-family');
        const baseline=resources.dataset.characters.find(row=>row.char===entry.char);
        if(!equal(entry,baseline))return unadopted('baseline-mismatch');
        if(!qualifiedReading(record,entry))return unadopted('reading-or-sense-mismatch');
        if(!supportedScope(record,actual.preferences.length))return unadopted('scope-not-supported');
        const receipt:Candidate2SemanticOccurrenceReceiptV1={
          schema:'candidate2-semantic-occurrence/1',constraintEngineId:CANDIDATE2_SEMANTIC_CONSTRAINT_ENGINE,contextSHA256,candidateIndex,candidateId:candidate.id,candidateFactsSHA256,
          fullName:candidate.fullName,givenName:candidate.givenName,...base,candidateCaseId:record.candidateCaseId,reviewId:record.reviewId,senseId:record.identity.senseId,
          sourceEntrySHA256:record.sourceSHA256,sourceDefinitionSHA256:record.identity.definitionSha256,sourceCaseSHA256:record.lineage.m921SourceRowSHA256,lineageSHA256:objectHash(record.lineage),
          projectTextSHA256:record.projectTextSHA256,projectSHA256:record.projectSHA256,semanticSourceSHA256:adoptionDigest(semanticSourceIdentity),explanationScope:'characterwise-only',wholeNameMeaning:null,projectWish:null,scoreDelta:0,
        };
        return {...base,status:'adopted',reason:'fixed-character-meaning',project:record.project,receipt};
      });
      const adopted=rows.filter(row=>row.status==='adopted');
      return {candidateIndex,candidateId:candidate.id,fullName:candidate.fullName,givenName:candidate.givenName,candidateFactsSHA256,rows,
        characterExplanation:adopted.length?'独立逐字取意（M923）：'+adopted.map(row=>`${row.char}：${row.project!.meaning}`).join('；')+'；本说明不替代原 C2 组合解释、取用或评分。':null,
        originalMeaning:candidate.meaning,originalReason:candidate.reason,originalTraditionalReason:candidate.traditionalReason,originalEvaluation:candidate.evaluation,wholeNameMeaning:null,projectWish:null,scoreDelta:0};
    });
    return {schema:CANDIDATE2_SEMANTIC_COMPOSITION_SCHEMA,status:'generated-unpersisted',canSave:false,storage:'not-connected',generationAuthority:false,request,candidate2Envelope:envelope,candidate2Identity,semanticSourceIdentity,constraintEngineId:CANDIDATE2_SEMANTIC_CONSTRAINT_ENGINE,contextSHA256,overlays,sourcePolicy,limitations};
  }
  return Object.freeze({
    generate(input:Candidate2SemanticRequestV1):Candidate2SemanticCompositionRecordV1 {
      need(arguments.length===1,'C2_SEMANTIC_INPUT_INVALID','one exact joint request required');
      const request=captureCandidate2SemanticRequestV1(input),resources=semanticResources();
      const generated=adapter.generateOriginal(request.profile,request.preferences,request.candidate2Selection);
      const body=derive(request,generated.context,resources);
      // The archive copier owns large envelopes without the small DTO budget.
      return ownAdoptionEnvelopeV2({...body,integrityDigest:adoptionDigest(body)}) as unknown as Candidate2SemanticCompositionRecordV1;
    },
    verify(input:unknown):Candidate2SemanticVerificationV1 {
      need(arguments.length===1,'C2_SEMANTIC_INPUT_INVALID','recorded composition only; no current overrides');
      let record:Candidate2SemanticCompositionRecordV1;
      try{record=ownAdoptionEnvelopeV2(input) as unknown as Candidate2SemanticCompositionRecordV1;exact(record,recordKeys,'exact composition record fields');}
      catch{throw new Candidate2SemanticError('C2_SEMANTIC_RECORD_INVALID','ordinary exact composition record required');}
      need(record.schema===CANDIDATE2_SEMANTIC_COMPOSITION_SCHEMA&&record.status==='generated-unpersisted'&&record.canSave===false&&record.generationAuthority===false&&record.storage==='not-connected'&&record.constraintEngineId===CANDIDATE2_SEMANTIC_CONSTRAINT_ENGINE,'C2_SEMANTIC_RECORD_INVALID','composition schema, scope or engine');
      const request=captureCandidate2SemanticRequestV1(record.request);
      need(equal(request,record.request),'C2_SEMANTIC_RECORD_INVALID','canonical explicit request');
      const {integrityDigest,...body}=record;
      need(typeof integrityDigest==='string'&&/^[a-f0-9]{64}$/.test(integrityDigest)&&adoptionDigest(body)===integrityDigest,'C2_SEMANTIC_RECORD_INVALID','composition integrity');
      // A digest is not an approval. Always run actual fixed C2 replay using
      // recorded mechanics, followed by a fresh physical M923 source load.
      const context=adapter.replayOriginal(record.candidate2Envelope),resources=semanticResources();
      const expected=derive(request,context,resources);
      need(equal(body,expected),'C2_SEMANTIC_RECORD_INVALID','fixed replay, source, original context or character explanation differs');
      return own({schema:'candidate2-semantic-composition-verification/1',status:'verified-unpersisted-composition',canSave:false,storage:'not-connected',generationAuthority:false,runtimeFromArchiveExecutable:false,
        recordDigest:integrityDigest,profileId:expected.candidate2Identity.profileId,candidateCount:expected.overlays.length,adoptedOccurrences:expected.overlays.reduce((sum,candidate)=>sum+candidate.rows.filter(row=>row.status==='adopted').length,0),recordedMechanics:expected.candidate2Identity.mechanics});
    },
  });
}
function qualifiedReading(record:M923AdmissionRecord,entry:{pinyin:string;tone:number;readings?:{pinyin:string;tone:number;sourceId:string;word:string;referenceOnly?:true;meanings:string[]}[]}):boolean {
  const id=record.identity;
  return entry.pinyin===id.pinyin&&entry.tone===id.tone&&!!entry.readings?.some(reading=>reading.pinyin===id.pinyin&&reading.tone===id.tone&&reading.sourceId===id.sourceId&&reading.word===id.sourceWord&&reading.referenceOnly!==true&&reading.meanings.includes(id.dictionarySense));
}
function supportedScope(record:M923AdmissionRecord,length:number):boolean {
  const condition=record.machineConditions as {namePart?:unknown;allowedGivenNameLengths?:unknown;selectedPinyin?:unknown;tone?:unknown;senseId?:unknown;familyOptInRequired?:unknown;familyOptInIdentity?:unknown;existingHardConstraintsApply?:unknown};
  return record.decision==='allow-single-character-generation'&&record.eligibilityPolicyApproved===true&&length>=1&&length<=2&&condition?.namePart==='given-name'&&Array.isArray(condition.allowedGivenNameLengths)&&condition.allowedGivenNameLengths.includes(length)&&condition.selectedPinyin===record.identity.pinyin&&condition.tone===record.identity.tone&&condition.senseId===record.identity.senseId&&condition.familyOptInRequired===true&&condition.existingHardConstraintsApply===true&&equal(condition.familyOptInIdentity,record.familyIdentity);
}
