import type {Analysis,BirthProfile,GenerateResult,NameCandidate,NamingPreferences,NamingSession} from './types';
import type {SemanticAdmissionResult,SemanticAdoptionReceipt,SemanticProjectIntent,SemanticPublicationIdentityV72,SemanticThemeId} from './naming-semantic-admission-v72';
import type {M779NameProvenance,M779PublicationIdentity} from './m779-admitted-element-imagery';
import type {NamingCharacterReview71Identity} from '../domain/naming-review-v7.mjs';

/** Explicit opt-in identity; the underlying namingRules remains the real7.1 rule. */
export const REVIEWED_DATA_METHOD='reviewed-naming-data/1.0.0' as const;
export const REVIEWED_DATA_SESSION_PREFIX='rd1-s-' as const;
export const REVIEWED_DATA_CANDIDATE_PREFIX='rd1-c-' as const;
export const REVIEWED_DATA_SEMANTIC_THEME_IDS=Object.freeze(['civic-homeland','water-bubbles','textile-ribbon','agriculture','literary-artwork','herb-plant'] as const);
export const REVIEWED_DATA_SOURCE_IDS=Object.freeze([
 'reviewed-naming-data-1.0.0','m752-semantic-generation-admission-r2','m751-semantic-admission-consumer-candidate',
 'm740-default-meanings-candidate-originals','m744-character-meaning-source-audit',
 'm770-admitted-project-element-imagery-1','m770-independent-object-element-review','m777-object-element-admission-audit',
] as const);
export const REVIEWED_DATA_OBJECT_THEMES=Object.freeze({
 '川':'river-object','石':'mineral-stone-object','枝':'tree-branch-object','棉':'cotton-plant-object','蕤':'hanging-flower-object',
} as const);
export type ReviewedDataObjectThemes={readonly [K in keyof typeof REVIEWED_DATA_OBJECT_THEMES]?:typeof REVIEWED_DATA_OBJECT_THEMES[K]};
export interface ReviewedDataSelection {
 readonly method:typeof REVIEWED_DATA_METHOD;
 readonly semanticThemeIds:readonly SemanticThemeId[];
 readonly objectThemes:ReviewedDataObjectThemes;
}
export interface ReviewedDataPublicationIdentity {
 readonly publicationId:typeof REVIEWED_DATA_METHOD;
 readonly manifestSha256:string;
 readonly semantic:SemanticPublicationIdentityV72;
 readonly imagery:M779PublicationIdentity;
 readonly sourceEvidence:{
  readonly m751:{originalCommit:string;integrationCommit:string;reviewStatus:'candidate-not-independently-reviewed';snapshotSha256:string};
  readonly m752:{manifestSha256:string;decisionSha256:string};
  readonly m740:{deliverySha256:string;manifestSha256:string;lockSha256:string};
  readonly m744:{auditSha256:string};
  readonly editorialV71:NamingCharacterReview71Identity;
 };
}
export interface ReviewedDataSemanticRow {
 readonly position:number;readonly char:string;readonly pinyin:string;readonly tone:number;
 readonly baselineCharacterSha256:string;readonly projectedCharacterSha256:string;
 readonly adoptionStatus:'adopted'|'not-adopted';
 readonly qualification:SemanticAdmissionResult;
 readonly adoption:SemanticAdoptionReceipt|null;
 readonly project:SemanticProjectIntent|null;
}
export interface ReviewedDataSemanticUse {
 readonly publication:SemanticPublicationIdentityV72;
 readonly rows:readonly ReviewedDataSemanticRow[];
 readonly warningRevisions:readonly {position:number;char:string;from:string;to:string;reason:'versioned-admission-replaces-old-scope'}[];
 readonly generatedMeaning:string;readonly wholeNameMeaning:null;readonly scoreDelta:0;
 readonly explanationPolicy:'eligible-characterwise-only-otherwise-preserve-7.1';
}
export interface ReviewedDataSessionBinding {
 readonly sessionId:string;readonly profileId:string;readonly createdAt:string;readonly dataVersion:string;
 readonly namingRulesSha256:string;readonly profileSha256:string;readonly generationPreferencesSha256:string;
 readonly analysisSha256:string;readonly sourceSnapshotSha256:string;readonly originalFavorableSha256:string;
 readonly sourceRecordsSha256:string;
}
export interface ReviewedDataCandidateUse {
 readonly schemaVersion:'reviewed-naming-data-candidate/1';readonly method:typeof REVIEWED_DATA_METHOD;
 readonly publication:ReviewedDataPublicationIdentity;readonly selectionSha256:string;
 readonly binding:ReviewedDataSessionBinding&{readonly candidateIndex:number;readonly candidateId:string;readonly givenName:string;readonly fullName:string;readonly pinyin:string;readonly origin:'local'|'ai'};
 readonly semantic:ReviewedDataSemanticUse;readonly imagery:M779NameProvenance;
 readonly stylePolicy:'canonical-existing-evaluate-style';
 readonly canonicalCandidateSha256:string;readonly proofSha256:string;
}
export interface ReviewedDataSessionAddon {
 readonly schemaVersion:'reviewed-naming-data-session/1';readonly method:typeof REVIEWED_DATA_METHOD;
 readonly publication:ReviewedDataPublicationIdentity;readonly selection:ReviewedDataSelection;
 readonly binding:ReviewedDataSessionBinding;
 readonly candidateBindings:readonly {candidateIndex:number;candidateId:string;givenName:string;fullName:string;pinyin:string;origin:'local'|'ai';proofSha256:string}[];
 readonly proofSha256:string;
}
export type ReviewedNameCandidate=NameCandidate&{reviewedDataUse:ReviewedDataCandidateUse};
export type ReviewedNamingSession=NamingSession&{reviewedData:ReviewedDataSessionAddon;candidates:ReviewedNameCandidate[]};
export type ReviewedGenerateResult=Omit<GenerateResult,'session'>&{session:ReviewedNamingSession};
export interface ReviewedNamingGenerationRequest {profile:BirthProfile;preferences:NamingPreferences;analysis:Analysis;selection:ReviewedDataSelection;}
export interface ReviewedNamingDataApi {
 generateReviewed(profile:BirthProfile,preferences:NamingPreferences,selection:ReviewedDataSelection):Promise<ReviewedGenerateResult>;
}
