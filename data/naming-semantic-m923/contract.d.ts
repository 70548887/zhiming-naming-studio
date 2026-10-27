/** Decision-only specification for Dev01. No runtime loader is implemented here. */
export type M923Stage = 'pool'|'required'|'local'|'ai'|'save'|'restore';
export type SHA256 = string;
export interface M923FamilyIdentity {
  familyId:'naming-semantic-m921';
  sourceId:'naming-semantic-admission-v72-M921-M923';
  publicationVersion:'m921-character-meaning-publication/1.0.0-m923.1';
  decisionVersion:'M923-DECISION/1';
  ruleVersion:'naming-editorial-7.2.0';
}
export interface M923FamilySelection extends M923FamilyIdentity { enabled:true }
/** Branding helps TypeScript only. Main-process PRIVATE registry membership is required. */
declare const mainOnlyM923Brand: unique symbol;
export interface M921M923FamilyHandle { readonly [mainOnlyM923Brand]:true }
export type M923ErrorCode = 'M923_SOURCE_UNAVAILABLE'|'M923_REJECTED_INTEGRITY'|
 'M923_UNTRUSTED_HANDLE'|'M923_FAMILY_NOT_ENABLED'|'M923_CONTEXT_INVALID'|
 'M923_NOT_ADMITTED'|'M923_READING_MISMATCH'|'M923_CANDIDATE_SCOPE_MISMATCH'|
 'M923_BLOCKED_EXISTING_CONSTRAINTS';
export type M923LoadResult = {ok:true;handle:M921M923FamilyHandle}|
 {ok:false;code:'M923_SOURCE_UNAVAILABLE'|'M923_REJECTED_INTEGRITY'};
/** Internal main API; fixed paths derived from trusted application config.
 * No renderer callback, caller expected hash, external URL or source-authority flag.
 * Exact compiled registry-entry pins + S1-S7 must pass before handle registration.
 */
export declare function loadM921M923Family():M923LoadResult;
export interface M923Context {
 stage:Exclude<M923Stage,'pool'>;
 candidateId:string;
 candidateCaseId:string;
 fullName:string;
 surname:string;
 givenName:string;
 /** Zero-based Unicode codepoint position; fullName = surname + givenName. */
 position:number;
 char:string;
 selectedPinyin:string;
 tone:1|2|3|4|5;
 senseId:string;
 givenNameLength:1|2;
 namePart:'given-name';
 familySelection:M923FamilySelection;
 themeIds:readonly ('civic-homeland'|'water-bubbles'|'textile-ribbon'|'agriculture'|'literary-artwork'|'herb-plant')[];
}
/** Pool stage has no future name yet. It does not issue an adoption receipt.
 * Validate the same fixed row, source/read/sense, selection, requested length,
 * known themes, and existing constraints evaluable without a full combination.
 * All occurrence/full-name dependent checks remain mandatory at finalization.
 */
export interface M923PoolContext {
 stage:'pool';candidateCaseId:string;char:string;selectedPinyin:string;
 tone:1|2|3|4|5;senseId:string;requestedGivenNameLength:1|2;namePart:'given-name';
 familySelection:M923FamilySelection;themeIds:M923Context['themeIds'];
}
export interface M923Project {
 meaning:string;projectWish:null;limits:readonly string[];
 attribution:'M923 independent project wording decision; dictionary text remains MOE';license:'CC0-1.0';
}
/** Main validates and normalizes these with the actual existing profile and
 * preference schemas; includes parents, avoidance and required characters.
 * Computes constraint hash internally; caller hash/constraint-pass flags rejected.
 */
export interface M923ConstraintInputs { profile:unknown; preferences:unknown }
export type M923Assessment = {ok:true;status:'eligible';reviewId:string;
 candidateCaseId:string;project:M923Project;wholeNameMeaning:null;scoreDelta:0}|
 {ok:false;status:'blocked';code:M923ErrorCode};
/** Must be a verified main handle; baseline is reread from fixed main resources.
 * No public trusted:boolean argument and no boolean callback hard-constraint bypass.
 * When stage=save/restore, receipt-validation is a required operation below.
 */
export declare function assessM921M923(handle:M921M923FamilyHandle,
 context:(M923Context & {stage:'required'|'local'|'ai'})|M923PoolContext,
 constraints:M923ConstraintInputs):M923Assessment;
export interface M923Receipt extends M923FamilyIdentity {
 schema:'m921-m923-character-generation-adoption/1';
 registryEntrySHA256:SHA256;decisionRecordsSHA256:SHA256;policySHA256:SHA256;
 candidateId:string;fullName:string;givenName:string;position:number;
 char:string;pinyin:string;tone:1|2|3|4|5;senseId:string;reviewId:string;candidateCaseId:string;
 sourceEntrySHA256:SHA256;sourceDefinitionSHA256:SHA256;sourceCaseSHA256:SHA256;
 lineageSHA256:SHA256;baseDatasetSHA256:SHA256;basePackSHA256:SHA256;
 projectTextSHA256:SHA256;projectSHA256:SHA256;
 constraintEngineId:'m923-existing-constraints-v1';constraintContextSHA256:SHA256;contextSHA256:SHA256;
 explanationScope:'characterwise-only';projectWish:null;wholeNameMeaning:null;scoreDelta:0;
}
/** Only after actual candidate finalization and all relevant hard constraints.
 * Receipt is a reproducible adoption binding, not a signature or user proof.
 */
export declare function issueM921M923Receipt(handle:M921M923FamilyHandle,
 context:M923Context & {stage:'local'|'ai'},constraints:M923ConstraintInputs):M923Receipt;
export declare function validateM921M923Receipt(handle:M921M923FamilyHandle,receipt:unknown,
 savedContext:M923Context,savedConstraints:M923ConstraintInputs):{ok:true}|{ok:false;code:'M923_REJECTED_INTEGRITY'|'M923_UNTRUSTED_HANDLE'|'M923_SOURCE_UNAVAILABLE'};
/** Mandatory receipt validation FIRST, then source qualification and actual
 * saved constraints. Merely calling assess does not implement save/restore. */
export declare function validateAndAssessM921M923Saved(handle:M921M923FamilyHandle,request:{
 context:M923Context & {stage:'save'|'restore'};receipt:unknown;constraints:M923ConstraintInputs
}):M923Assessment;
/** Receipts are deterministic integrity bindings. No signature or past-issuer
 * provenance is claimed; an exactly equivalent reconstructed receipt may match.
 * It still cannot create a trusted main handle or bypass the fixed source checks. */
/** refresh must route this exact family and recheck resources; never use the
 * old M752 loader just because ruleVersion matches or sourceId is a string. */
export declare function refreshM921M923Family(handle:M921M923FamilyHandle):M923LoadResult;
