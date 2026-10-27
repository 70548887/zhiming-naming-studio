import type {CharacterEntry,NameCandidate,BirthProfile,NamingPreferences,Analysis} from './types';

export const NAMING_EDITORIAL_V72_VERSION='naming-editorial-7.2.0' as const;
export const NAMING_EDITORIAL_V72_SOURCE_ID='naming-semantic-admission-v72-M752' as const;
export const SEMANTIC_THEMES_V72=['civic-homeland','water-bubbles','textile-ribbon','agriculture','literary-artwork','herb-plant'] as const;
export type SemanticThemeId=typeof SEMANTIC_THEMES_V72[number];
export type SemanticAdmissionStage='pool'|'required'|'local'|'ai'|'save'|'restore';
export type SemanticAdmissionStatus='eligible'|'needs-theme'|'pending-source-identity'|'manual-only'|'not-admitted'|'reading-mismatch'|'candidate-scope-mismatch'|'source-unavailable'|'rejected-integrity'|'condition-not-supported'|'blocked-existing-constraints';
export interface SemanticSourceIdentity {
 char:string;pinyin:string;tone:number;sourceId:string;dictionaryWord:string;sourceWord:string;sourcePOS:string;
 rawEntryIndex:number;rawHeteronymIndex:number;rawDefinitionIndex:number;dictionarySense:string;senseId:string;
 rawOriginalSha256:string;parsedEntrySha256:string;definitionSha256:string;definitionTextSha256:string;
 baselineCharacterSha256:string;readingsSha256:string;glyphProofSha256:string;sourceCaseSha256:string;
 candidateProfileSha256:string;sourceLockSha256:string;baseDatasetSha256:string;basePackSha256:string;baseActiveVersion:string;
}
export interface SemanticProjectIntent {meaning:string;projectWish:null;limits:readonly string[];attribution:string;license:'CC0-1.0'}
export interface SemanticAdmissionRecord {
 candidateCaseId:string;admissionId:string;reviewId:string;ruleVersion:typeof NAMING_EDITORIAL_V72_VERSION;
 decision:'allow-single-character-generation'|'manual-only'|'pending'|'reject';
 usage:{mode:'any-context'}|{mode:'explicit-themes';anyOf:readonly SemanticThemeId[]};
 candidateConstraints:{namePart:'given-name';givenNameLengths:readonly (1|2)[];wholeNameApprovalRequired:false;requiresNewFamilySignature:false};
 identity:SemanticSourceIdentity;project:SemanticProjectIntent;projectSha256:string;originalM740ProjectSha256:string;
 approvedScope:'none'|'single-character-project-intent-only';sourceIdentityDecision:string;sourceLicense:string;sourceFieldMayBeRewritten:false;
 reason:string;prohibitedInferences:readonly string[];priorEvidence:Record<string,unknown>;newReview:Record<string,unknown>;
 conditionIds:readonly string[];conflictIds:readonly string[];
 machineConditions:{selectedPinyin:string;tone:number;senseId:string;allowedGivenNameLengths:readonly number[];requiredThemeIds:readonly string[];namePart:'given-name';conflictPolicy:'do-not-claim-alternate-sense'};
 grants:{eligibilityPolicyApproved:boolean;sourceAuthorityFromCaller:false;automaticSemanticCreditAllowed:false;scoreDelta:0;wholeNameMeaning:null;wholeNameApproved:false;personalityPrediction:false;fortunePrediction:false;elementModification:false};
 productionActivation:string;
}
export interface SemanticCandidateRowV72 {
 caseId:string;char:string;pinyin:string;tone:number;defaultReading:NonNullable<CharacterEntry['readings']>[number];
 baselineCharacter:CharacterEntry;baselineCharacterSha256:string;binding:Record<string,unknown>;glyph:Record<string,unknown>;
 source:{sourceId:string;word:string;pinyin:string;tone:number;originalFile:string;originalSha256:string;rawEntryIndex:number;rawHeteronymIndex:number;rawDefinitionIndex:number;sourcePOS:string;definition:Record<string,unknown>;completeOriginalEntry:Record<string,unknown>;parsedEntrySha256:string;license:string};
 project:SemanticProjectIntent;priorV7Review:Record<string,unknown>;priorV7ReviewSha256:string;notWholeWordDerived:boolean;
 candidateOnly:true;activation:'off';generationAuthority?:false;[key:string]:unknown;
}
export interface SemanticPublicationIdentityV72 {
 ruleVersion:typeof NAMING_EDITORIAL_V72_VERSION;sourceId:typeof NAMING_EDITORIAL_V72_SOURCE_ID;
 decisionSha256:string;policySha256:string;themeSha256:string;contractSha256:string;fixtureSha256:string;
 candidateProfileSha256:string;candidateLockSha256:string;datasetSha256:string;basePackSha256:string;
}
export interface SemanticPublicationV72 {
 identity:SemanticPublicationIdentityV72;records:readonly SemanticAdmissionRecord[];rows:readonly SemanticCandidateRowV72[];
 themes:readonly SemanticThemeId[];activation:'not-current';productionApproved:false;
}
/** This structural handle alone confers no source authority. The main loader
 * separately registers actual resource handles in a private registry. */
export interface SemanticAdmissionHandle {readonly publication:SemanticPublicationV72}
export interface SemanticAdmissionContext {
 themeIds:readonly string[];requestedGivenNameLength:1|2;namePart:'given-name';stage:SemanticAdmissionStage;
 givenName?:string;fullName?:string;position?:number;candidateId?:string;
}
export type SemanticAdmissionContextV72SafeResult=
 | {readonly ok:true;readonly context:SemanticAdmissionContext}
 | {readonly ok:false;readonly context:SemanticAdmissionContext;readonly reasonCode:'unknown-theme'};
export interface SemanticAdmissionResult {
 status:SemanticAdmissionStatus;recordId:string|null;reasonCode:string;project:SemanticProjectIntent|null;
 wholeNameMeaning:null;automaticSemanticCreditAllowed:false;scoreDelta:0;
}
export interface SemanticAdoptionReceipt {
 schema:'single-character-generation-adoption/1';ruleVersion:typeof NAMING_EDITORIAL_V72_VERSION;candidateId:string;fullName:string;givenName:string;position:number;
 candidateCaseId:string;reviewId:string;char:string;pinyin:string;tone:number;senseId:string;
 publicationSha256:string;admissionSha256:string;sourceSha256:string;basePackSha256:string;
 identitySha256:string;projectSha256:string;contextSha256:string;explanationScope:'characterwise-only';wholeNameMeaning:null;scoreDelta:0;
}
export interface SemanticAdoptionSnapshotV72 {
 schema:'naming-semantic-generation-snapshot/1';ruleVersion:typeof NAMING_EDITORIAL_V72_VERSION;sourceId:typeof NAMING_EDITORIAL_V72_SOURCE_ID;
 publication:SemanticPublicationIdentityV72;candidateId:string;fullName:string;givenName:string;requestedGivenNameLength:1|2;themeIds:readonly string[];
 rows:readonly {position:number;char:string;status:SemanticAdmissionStatus;adoption:SemanticAdoptionReceipt|null;project:SemanticProjectIntent|null}[];
 baseRuleVersion:'naming-editorial-7.1.0';baseMeaning:string;generatedMeaning:string;wholeNameMeaning:null;scoreDelta:0;
 baseReason:string;baseWarnings:readonly string[];
 warningRevisions:readonly {position:number;char:string;from:string;to:string;reason:'versioned-admission-replaces-old-scope'}[];
 generationOrigin:'local'|'ai';
}
export type SemanticGeneratedCandidateV72=NameCandidate&{semanticAdoption72:SemanticAdoptionSnapshotV72};
export type SemanticOutputAssertion={ok:true;assertionKind:null}|{ok:false;assertionKind:'reject-semantic-credit'|'reject-unreviewed-claim';reasonCode:string};
export interface SemanticReplayAssertion {ok:true;assertionKind:'preserve-legacy';oldBytesUnchanged:true;noNewReceipt:true}
export interface SemanticGenerationRequestV72 {profile:BirthProfile;preferences:NamingPreferences;analysis:Analysis;themeIds:readonly string[]}
export interface SemanticCandidateEvaluationV72 {
 status:'generated'|'blocked-admission'|'blocked-existing-constraints';
 candidate:SemanticGeneratedCandidateV72|null;
 qualifications:readonly {position:number;char:string;result:SemanticAdmissionResult}[];
}
