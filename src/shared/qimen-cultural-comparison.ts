import type {Element,QimenChart} from './types';

export const QIMEN_CULTURAL_VERSION='qimen-cultural-comparison/1.0.0' as const;
export const QIMEN_CULTURAL_PUBLICATION='project-qimen-cultural-comparison/1.0.0' as const;
export const CULTURAL_CANONICAL_ALGORITHM='cultural-canonical-json/1' as const;
export const LEGACY_CHART_DIGEST_ALGORITHM='legacy-json-stringify-sha256/1' as const;
export type OuterPalace=1|2|3|4|6|7|8|9;
export type CulturalChartDigestAlgorithm=typeof CULTURAL_CANONICAL_ALGORITHM|typeof LEGACY_CHART_DIGEST_ALGORITHM;
export type CulturalSourceAuthority='dictionary-fact'|'project-editorial-label'|'project-object-convention'|'palace-table'|'saved-chart-rule';
export interface CulturalEvidenceRef {id:string;version:string;sha256:string;locator:string;authority:CulturalSourceAuthority;license:string;note:string;}
export interface CulturalLabelPolicyIdentity {id:string;version:string;manifestDigest:string;dependencies:readonly {sourceId:string;version:string;sha256:string}[];}
export interface CulturalChartIdentity {qimenVersion:string;digest:string;digestAlgorithm:CulturalChartDigestAlgorithm;sourceDigest:string;birthInputDigest:string;timeBasisDigest:string;}
export interface CulturalBirthAnchorView {
 anchorId:string;ownerProfileId:string;sourceSessionId:string|null;sourceRevision:string;identity:CulturalChartIdentity;
 available:boolean;unavailableReasons:readonly string[];birthLabel:string;timeBasisLabel:string;sourceReferences:readonly CulturalEvidenceRef[];
}
export interface CulturalAnchorBinding {anchorId:string;ownerProfileId:string;sourceSessionId:string|null;sourceRevision:string;identity:CulturalChartIdentity;}
/** Source states are supplied by authenticated main providers, never admitted by this domain. */
export type CulturalSourceState='ready'|'unknown'|'no-mapping'|'pending'|'source-error'|'disputed';
export type CulturalRowStatus='mapped'|'unknown-label'|'unmapped'|'pending-admission'|'reading-selection-required'|'source-conflict';
export interface PreparedCulturalCharacter {
 position:number;char:string;pinyin:string|null;readingState:'selected'|'required';sourceState:CulturalSourceState;
 labelPolicyId:string;reviewedEvidenceId:string|null;dictionarySense:string|null;projectIntent:string|null;
 elements:readonly Element[];reasonCodes:readonly string[];sourceReferences:readonly CulturalEvidenceRef[];adoptionReceiptDigest:string|null;
}
export interface PreparedCulturalCandidate {
 candidateRef:string;kind:'saved'|'draft';fullName:string;givenName:string;
 anchorBinding:CulturalAnchorBinding;labelPolicy:CulturalLabelPolicyIdentity;rows:readonly PreparedCulturalCharacter[];
}
export interface CulturalCharacterComparisonRow {
 position:number;char:string;pinyin:string|null;status:CulturalRowStatus;sourceState:CulturalSourceState;
 dictionarySense:string|null;projectIntent:string|null;elements:readonly Element[];staticPalaces:readonly OuterPalace[];
 reasonCodes:readonly string[];sourceReferences:readonly CulturalEvidenceRef[];adoptionReceiptDigest:string|null;
}
export interface CulturalSavedPalaceObservation {
 palace:OuterPalace;ruleId:string;ruleVersion:string;scope:'palace-position';label:string;
 subjects:readonly string[];evidence:readonly string[];sourceReferences:readonly CulturalEvidenceRef[];nameEffect:'not-evaluated';
}
export interface CulturalPalaceView {
 palace:OuterPalace;trigram:string;direction:string;star:string;door:string;god:string;
 /** First version keeps exactly [savedPalace.heaven], including any hosted text
  * verbatim. This is not a parsed principal/hosted-stem inference. */
 principalAndHostedStems:readonly string[];observations:readonly CulturalSavedPalaceObservation[];
}
export interface CulturalWholeChartObservation {
 ruleId:string;ruleVersion:string;kind:string;layer:'stars'|'doors'|'other';label:string;subjects:readonly string[];evidence:readonly string[];
 sourceReferences:readonly CulturalEvidenceRef[];scope:'whole-chart';assignedToName:false;
}
export interface CulturalObservationCoverage {module:'auxiliary'|'patterns'|'stem-tombs';status:'recorded'|'not-recorded'|'not-assessed';version:string|null;reason:string|null;}
export interface CulturalRuleBasisDifference {kind:'different-rule-bases';ruleRefs:readonly CulturalEvidenceRef[];note:string;mergedVerdict:null;}
/** Main must authenticate sources, glyph/reading/sense/admission and capsule bytes
 * before calling. This structural DTO is not a runtime authority or source certificate.
 * The pure comparator never reads files, starts a chart, invokes AI or issues admission.
 */
export interface PreparedCulturalComparisonInput {
 schema:typeof QIMEN_CULTURAL_VERSION;enabled:boolean;requestId:string;surname:string;
 anchor:CulturalBirthAnchorView;qimen:QimenChart;labelPolicy:CulturalLabelPolicyIdentity;candidates:readonly PreparedCulturalCandidate[];
 palaceViews:readonly CulturalPalaceView[];chartWideObservations:readonly CulturalWholeChartObservation[];
 observationCoverage:readonly CulturalObservationCoverage[];ruleBasisDifferences:readonly CulturalRuleBasisDifference[];
 sourceReferences:readonly CulturalEvidenceRef[];evidenceCapsuleDigest:string;
}
export interface CulturalCandidateComparisonView {
 candidateRef:string;fullName:string;givenName:string;inputIndex:number;rows:readonly CulturalCharacterComparisonRow[];
 knownPalaces:readonly OuterPalace[];complete:boolean;palaceViews:readonly CulturalPalaceView[];
}
export interface CulturalSetSummary {
 state:'complete'|'known-subsets-only'|'not-evaluated';sharedKnownPalaces:readonly OuterPalace[];completeSharedPalaces:readonly OuterPalace[]|null;
 perCandidate:readonly {candidateRef:string;knownPalaces:readonly OuterPalace[];remainingFromCommon:readonly OuterPalace[]|null;exclusiveToCandidate:readonly OuterPalace[]|null}[];
 interpretation:'positions-only-no-preference';
}
export interface CulturalComparisonSnapshot {
 schema:typeof QIMEN_CULTURAL_VERSION;rulePublicationId:typeof QIMEN_CULTURAL_PUBLICATION;labelPolicy:CulturalLabelPolicyIdentity;
 anchor:CulturalBirthAnchorView;candidateOrder:readonly string[];candidates:readonly CulturalCandidateComparisonView[];
 status:'ready'|'partial-known-only'|'unknown-chart'|'insufficient-candidates'|'no-mapped-labels';summary:CulturalSetSummary;
 chartWideObservations:readonly CulturalWholeChartObservation[];observationCoverage:readonly CulturalObservationCoverage[];ruleBasisDifferences:readonly CulturalRuleBasisDifference[];
 traditional:{status:'not-admitted';verdict:'not-evaluated';namePalaceMethod:'not-established'};
 score:null;ranking:'input-order';scoreMutation:false;filtering:false;nameEffect:'not-evaluated';fourHarmRemoval:'not-performed';
 sourceReferences:readonly CulturalEvidenceRef[];limitations:readonly string[];requestDigest:string;snapshotDigest:string;evidenceCapsuleDigest:string;digestAlgorithm:typeof CULTURAL_CANONICAL_ALGORITHM;
}
export type CulturalComparisonFailure='invalid-input'|'source-unavailable'|'unsupported-version'|'rejected-integrity';
export type CulturalComparisonReply={kind:'disabled'}|{kind:'result';snapshot:CulturalComparisonSnapshot}|{kind:'unavailable';reason:CulturalComparisonFailure;message:string};
