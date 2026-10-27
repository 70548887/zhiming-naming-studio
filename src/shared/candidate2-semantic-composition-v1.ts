import type {BirthProfile,NamingPreferences,NameCandidate} from './types';
import type {Candidate2NamingSelection,Candidate2NamingDataIdentity} from './candidate2-naming-consumer-v1';
import type {Candidate2AdoptionEnvelopeV2,Candidate2OwnedMechanicsV2} from './candidate2-generation-adoption-v2';
import type {ProjectApplicationTuple} from './project-application-v132-r2';
import type {M923FamilyIdentity,M923FamilySelection,M923Project} from './naming-semantic-m923';
import type {SemanticThemeId} from './naming-semantic-admission-v72';

export const CANDIDATE2_SEMANTIC_COMPOSITION_SCHEMA='candidate2-semantic-composition/1' as const;
export const CANDIDATE2_SEMANTIC_CONSTRAINT_ENGINE='candidate2-semantic-constraints/1.0.0' as const;
export const CANDIDATE2_SEMANTIC_ERRORS=Object.freeze([
  'C2_SEMANTIC_INPUT_INVALID','C2_SEMANTIC_SELECTION_REQUIRED','C2_SEMANTIC_UNSUPPORTED',
  'C2_SEMANTIC_UNTRUSTED_CONTEXT','C2_SEMANTIC_C2_REJECTED',
  'C2_SEMANTIC_SOURCE_UNAVAILABLE','C2_SEMANTIC_SOURCE_INTEGRITY','C2_SEMANTIC_RECORD_INVALID',
] as const);
export type Candidate2SemanticErrorCode=typeof CANDIDATE2_SEMANTIC_ERRORS[number];
/** Paths and mechanics belong to the main owner. No injected provider is accepted. */
export interface Candidate2SemanticConfigurationV1 {
  applicationBundlePath:string;assetDir:string;dataDir:string;consumerPublicationDir:string;
  mechanics:Candidate2OwnedMechanicsV2;
}
export interface Candidate2SemanticRequestV1 {
  profile:BirthProfile;preferences:NamingPreferences;candidate2Selection:Candidate2NamingSelection;
  semanticSelection:M923FamilySelection;themeIds:readonly SemanticThemeId[];
}
export interface Candidate2SemanticSourceIdentityV1 {
  family:M923FamilyIdentity;
  pins:{registryEntrySHA256:string;decisionRecordsSHA256:string;policySHA256:string;contractSHA256:string;
    baseDatasetSHA256:string;basePackSHA256:string;publicationSHA256:string;lineageSHA256:string;sourceClosureSHA256:string};
}
export interface Candidate2SemanticOriginalIdentityV1 {
  envelopeSchema:'candidate2-adoption-envelope/2';envelopeSHA256:string;
  sessionId:string;profileId:string;createdAt:string;
  generationSchema:'candidate2-naming-generation/1';generationDigest:string;
  consumerVersion:'candidate2-naming-consumer/1.0.0';
  consumerExecution:{publicationId:'candidate2-session-consumer-execution/1';manifestSha256:string;fullClosureSha256:string;bundleSha256:string;bundleBytes:number};
  applicationTuple:ProjectApplicationTuple;applicationSHA256:string;dataIdentity:Candidate2NamingDataIdentity;
  mechanics:Candidate2OwnedMechanicsV2;originalProfileSHA256:string;originalPreferencesSHA256:string;
  candidatesSHA256:string;baseAnalysisSHA256:string;domainProjectionSHA256:string;
}
/** A separate composition record, never the old M923 receipt/1 with a new meaning. */
export interface Candidate2SemanticOccurrenceReceiptV1 {
  schema:'candidate2-semantic-occurrence/1';constraintEngineId:typeof CANDIDATE2_SEMANTIC_CONSTRAINT_ENGINE;
  contextSHA256:string;candidateIndex:number;candidateId:string;candidateFactsSHA256:string;
  fullName:string;givenName:string;position:number;char:string;pinyin:string;tone:number;
  candidateCaseId:string;reviewId:string;senseId:string;
  sourceEntrySHA256:string;sourceDefinitionSHA256:string;sourceCaseSHA256:string;lineageSHA256:string;
  projectTextSHA256:string;projectSHA256:string;semanticSourceSHA256:string;
  explanationScope:'characterwise-only';wholeNameMeaning:null;projectWish:null;scoreDelta:0;
}
export interface Candidate2SemanticPositionV1 {
  position:number;char:string;pinyin:string;tone:number;
  status:'adopted'|'not-adopted';
  reason:'fixed-character-meaning'|'not-in-semantic-family'|'baseline-mismatch'|'reading-or-sense-mismatch'|'scope-not-supported';
  project:M923Project|null;receipt:Candidate2SemanticOccurrenceReceiptV1|null;
}
export interface Candidate2SemanticOverlayV1 {
  candidateIndex:number;candidateId:string;fullName:string;givenName:string;candidateFactsSHA256:string;
  rows:readonly Candidate2SemanticPositionV1[];
  characterExplanation:string|null;
  originalMeaning:string;originalReason:string;originalTraditionalReason:string;
  originalEvaluation:NameCandidate['evaluation'];wholeNameMeaning:null;projectWish:null;scoreDelta:0;
}
export interface Candidate2SemanticCompositionRecordV1 {
  schema:typeof CANDIDATE2_SEMANTIC_COMPOSITION_SCHEMA;
  status:'generated-unpersisted';canSave:false;storage:'not-connected';generationAuthority:false;
  request:Candidate2SemanticRequestV1;
  candidate2Envelope:Candidate2AdoptionEnvelopeV2;
  candidate2Identity:Candidate2SemanticOriginalIdentityV1;
  semanticSourceIdentity:Candidate2SemanticSourceIdentityV1;
  constraintEngineId:typeof CANDIDATE2_SEMANTIC_CONSTRAINT_ENGINE;contextSHA256:string;
  overlays:readonly Candidate2SemanticOverlayV1[];
  sourcePolicy:'fixed-c2-replay-and-physical-m923-source-recheck/1';
  limitations:readonly string[];integrityDigest:string;
}
export interface Candidate2SemanticVerificationV1 {
  schema:'candidate2-semantic-composition-verification/1';status:'verified-unpersisted-composition';
  canSave:false;storage:'not-connected';generationAuthority:false;runtimeFromArchiveExecutable:false;
  recordDigest:string;profileId:string;candidateCount:number;adoptedOccurrences:number;
  recordedMechanics:Candidate2OwnedMechanicsV2;
}
