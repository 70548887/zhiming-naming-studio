import type {BirthProfile, NamingPreferences, NameCandidate, CharacterEntry} from './types';
import type {SemanticSourceIdentity, SemanticThemeId} from './naming-semantic-admission-v72';

/** An independent opt-in publication. The M752 discriminant remains unchanged. */
export const M923_FAMILY = Object.freeze({
  familyId:'naming-semantic-m921',
  sourceId:'naming-semantic-admission-v72-M921-M923',
  publicationVersion:'m921-character-meaning-publication/1.0.0-m923.1',
  decisionVersion:'M923-DECISION/1',
  ruleVersion:'naming-editorial-7.2.0',
} as const);
export type M923FamilyIdentity = typeof M923_FAMILY;
export type M923Stage = 'pool'|'required'|'local'|'ai'|'save'|'restore';
export interface M923FamilySelection extends M923FamilyIdentity {enabled:true}
declare const mainOnlyM923Brand:unique symbol;
/** A type brand is not authority; the main process must also recognize object identity. */
export interface M921M923FamilyHandle {readonly [mainOnlyM923Brand]:true}
export type M923ErrorCode = 'M923_SOURCE_UNAVAILABLE'|'M923_REJECTED_INTEGRITY'|
  'M923_UNTRUSTED_HANDLE'|'M923_FAMILY_NOT_ENABLED'|'M923_CONTEXT_INVALID'|
  'M923_NOT_ADMITTED'|'M923_READING_MISMATCH'|'M923_CANDIDATE_SCOPE_MISMATCH'|
  'M923_BLOCKED_EXISTING_CONSTRAINTS';
export type M923LoadResult = {ok:true;handle:M921M923FamilyHandle}|
  {ok:false;code:'M923_SOURCE_UNAVAILABLE'|'M923_REJECTED_INTEGRITY'};
export interface M923Project {
  meaning:string;projectWish:null;limits:readonly string[];
  attribution:'M923 independent project wording decision; dictionary text remains MOE';license:'CC0-1.0';
}
export interface M923AdmissionRecord {
  schema:'m923-character-generation-decision/1';familyIdentity:M923FamilyIdentity;
  candidateCaseId:string;admissionId:string;reviewId:string;
  identity:SemanticSourceIdentity;project:M923Project;
  decision:'allow-single-character-generation';eligibilityPolicyApproved:true;
  sourceDefinition:Record<string,unknown>;sourceSHA256:string;
  sourceCoordinates:{rawEntryIndex:number;rawHeteronymIndex:number;rawDefinitionIndex:number};
  projectTextSHA256:string;projectSHA256:string;
  lineage:{m921SourceRowSHA256:string;[key:string]:unknown};
  [key:string]:unknown;
}
export interface M923Context {
  stage:Exclude<M923Stage,'pool'>;candidateId:string;candidateCaseId:string;
  fullName:string;surname:string;givenName:string;position:number;char:string;
  selectedPinyin:string;tone:1|2|3|4|5;senseId:string;givenNameLength:1|2;
  namePart:'given-name';familySelection:M923FamilySelection;themeIds:readonly SemanticThemeId[];
}
export interface M923PoolContext {
  stage:'pool';candidateCaseId:string;char:string;selectedPinyin:string;
  tone:1|2|3|4|5;senseId:string;requestedGivenNameLength:1|2;namePart:'given-name';
  familySelection:M923FamilySelection;themeIds:readonly SemanticThemeId[];
}
export interface M923ConstraintInputs {profile:unknown;preferences:unknown}
export type M923Assessment = {ok:true;status:'eligible';reviewId:string;candidateCaseId:string;
  project:M923Project;wholeNameMeaning:null;scoreDelta:0}|
  {ok:false;status:'blocked';code:M923ErrorCode};
export interface M923Receipt extends M923FamilyIdentity {
  schema:'m921-m923-character-generation-adoption/1';
  registryEntrySHA256:string;decisionRecordsSHA256:string;policySHA256:string;
  candidateId:string;fullName:string;givenName:string;position:number;
  char:string;pinyin:string;tone:1|2|3|4|5;senseId:string;reviewId:string;candidateCaseId:string;
  sourceEntrySHA256:string;sourceDefinitionSHA256:string;sourceCaseSHA256:string;
  lineageSHA256:string;baseDatasetSHA256:string;basePackSHA256:string;
  projectTextSHA256:string;projectSHA256:string;
  constraintEngineId:'m923-existing-constraints-v1';constraintContextSHA256:string;contextSHA256:string;
  explanationScope:'characterwise-only';projectWish:null;wholeNameMeaning:null;scoreDelta:0;
}
export interface M923GenerationRequest {
  profile:BirthProfile;preferences:NamingPreferences;
  familySelection:M923FamilySelection;themeIds:readonly SemanticThemeId[];
}
/** Unpublished snapshot/1 had no independent zero-adoption context binding.
 * It is deliberately not accepted or upgraded by the snapshot/2 consumer. */
export const M923_GENERATION_SNAPSHOT_SCHEMA='m921-m923-character-generation-snapshot/2' as const;
export interface M923GenerationSnapshotV2 extends M923FamilyIdentity {
  schema:typeof M923_GENERATION_SNAPSHOT_SCHEMA;
  constraintEngineId:M923Receipt['constraintEngineId'];constraintContextSHA256:string;
  candidateId:string;fullName:string;givenName:string;themeIds:readonly SemanticThemeId[];
  familySelection:M923FamilySelection;generationOrigin:'local'|'ai';
  rows:readonly {position:number;char:string;adoption:M923Receipt|null;project:M923Project|null}[];
  generatedMeaning:string;baseMeaning:string;baseReason:string;baseWarnings:readonly string[];
  wholeNameMeaning:null;projectWish:null;scoreDelta:0;
}
export type M923GenerationSnapshot=M923GenerationSnapshotV2;
/** Kept outside the default candidate/session type until Store integration is accepted. */
export type M923GeneratedCandidate = NameCandidate & {semanticAdoptionM923:M923GenerationSnapshot};
export type M923CandidateEvaluation = {status:'generated';candidate:M923GeneratedCandidate}|
  {status:'blocked';candidate:null;code:M923ErrorCode};
export interface M923PoolResult {pool:readonly CharacterEntry[];eligibleAdopted:readonly string[];defaultCoverageDelta:0}
