export type ReviewStatus='approved'|'pending'|'not-recommended';
export interface TrustedNamingContext {packSha256:string;activeVersion:string;givenName?:string;}
export interface DictionaryBinding {char:string;pinyin:string;tone:number;sourceId:'moe-revised';dictionaryWord:string;rawEntryIndex:number;rawHeteronymIndex:number;rawDefinitionIndex:number;dictionarySense:string;}
export interface MeaningReview {pendingIndex:number;char:string;status:ReviewStatus;namingMeaning:string|null;projectWish:string|null;useKind:'literal-quality'|'literal-action'|'literal-manner'|'object-imagery'|'context-bound'|'none';scope:string;reason:string;binding:DictionaryBinding|null;warnings:string[];licensing:{dictionary:string;editorial:string};automaticMeaningAllowed:boolean;applicability:{mode:'any-name'|'allowed-names'|'manual-confirmation-required'|'not-approved';allowedNames:string[];reason:string};}
export interface CharacterRecord {char:string;pinyin:string;tone:number;sourceId:string;meaning:string;readings?:Array<{pinyin:string;tone:number;meanings:string[];sourceId:string;word:string;referenceOnly?:boolean;sourceReference?:Record<string,unknown>}>;}
export interface CitationRecord {id:string;sourceId:string;title:string;chapter:string;text:string;}
export interface ReviewedNameRule {name:string;ruleId:string;citation:CitationRecord;excerpt:string;extraction:'continuous'|'recombined';context:string;meaning:string;sourceMeaning:string;projectWish:string;readings:DictionaryBinding[];wholeContext:Record<string,unknown>;reviewWarnings:string[];licensing:{dictionary:string;editorial:string;citation:string};}
export interface SupplementalReviewTable {version:'naming-editorial-7.0.0';scope:'supplemental-meaning-and-citation-only';sourceIds:string[];base:{datasetMetadataVersion:string;datasetJsonSha256:string;knowledgePackSha256:string;activeVersion:string;[key:string]:unknown};coverage:Record<string,unknown>;baselineCharacters:CharacterRecord[];meaningReviews:MeaningReview[];nameRules:ReviewedNameRule[];[key:string]:unknown;}
export interface AutomaticMeaning {reviewId:string;char:string;meaning:string;projectWish:string;useKind:MeaningReview['useKind'];scope:string;binding:DictionaryBinding;warnings:string[];sourceIds:string[];automaticMeaningAllowed:true;automaticSemanticCreditAllowed:false;}
export interface Applicability {status:'applicable'|'not-applicable'|'not-reviewed-by-overlay'|ReviewStatus|'manual-confirmation-required';reason?:string;scope?:string;reviewId?:string;}
export interface NamingReviewLookup {
 applicability(entry:CharacterRecord,context:TrustedNamingContext):Applicability;
 lookupMeaning(entry:CharacterRecord,context:TrustedNamingContext):AutomaticMeaning|undefined;
 reviewMeaning(entry:CharacterRecord,context:TrustedNamingContext):(MeaningReview&{automaticSemanticCreditAllowed:false;displayOnlyReview:true})|undefined;
 describeReview(entry:CharacterRecord,context:TrustedNamingContext):(MeaningReview&{automaticSemanticCreditAllowed:false;displayOnlyReview:true})|undefined;
 lookupCitation(name:string,entries:CharacterRecord[],citations:CitationRecord[],context:TrustedNamingContext):ReviewedNameRule|undefined;
}
export function assertPlainJson(value:unknown,stack?:Set<unknown>,depth?:number):void;
export function createNamingReviewLookup(table:SupplementalReviewTable):Readonly<NamingReviewLookup>;


export interface NamingCharacterReview71Identity {ruleVersion:'naming-editorial-7.1.0';profileVersion:'naming-character-meanings-v7.1/1';sourceId:'naming-character-meanings-v7.1-fixed';subsetSha256:string;profileSha256:string;admissionSha256:string;lockSha256:string;manifestSha256:string;sourceSha256:string;}
export interface NamingCharacterExplanation71 {position:number;caseId:string;char:string;selectedPinyin:string;tone:number;dictionaryOriginal:string;originalSourceBinding:{sourceId:'moe-revised';word:string;rawEntryIndex:number;rawHeteronymIndex:number;rawDefinitionIndex:number;rawFile:string;rawSha256:string;pinyin:string;definition:Record<string,unknown>;completeOriginalEntry:Record<string,unknown>;parsedEntrySha256:string;parsedHashConvention:string;license:string};glyph:Record<string,unknown>;projectMeaning:string;projectWish:string;editorialAttribution:string;editorialLicense:'CC0-1.0';limits:string[];scope:'per-character-project-explanation-only';wholeNameAssessment:'not-assessed';wholeNameMeaning:null;automaticNameRecommendation:false;automaticSemanticCreditAllowed:false;scoreDelta:0;}
export interface NamingCharacterReview71Request {ruleVersion:string;givenName:string;characters:import('../shared/types').CharacterEntry[];context:{packSha256:string;activeVersion:string};}
export type NamingCharacterReview71Result={status:'character-explanations-ready';ruleVersion:'naming-editorial-7.1.0';scope:'per-character-project-explanation-only';givenNameContext:string;profile:NamingCharacterReview71Identity;rows:NamingCharacterExplanation71[];admittedCharacterCaseIds:string[];wholeNameAssessment:'not-assessed';wholeNameMeaning:null;automaticNameRecommendation:false;automaticSemanticCreditAllowed:false;scoreDelta:0}|{status:'not-covered'|'not-applicable'|'wrong-rule-version'|'not-admitted';reason:string};
export interface NamingCharacterReview71Lookup {generateCharacterNotes(request:NamingCharacterReview71Request):NamingCharacterReview71Result;characterExplanation(entry:import('../shared/types').CharacterEntry,context:{packSha256:string;activeVersion:string}):NamingCharacterReview71Result;}
export function createNamingCharacterReview71(profile:unknown,admission:unknown,identity:NamingCharacterReview71Identity):Readonly<NamingCharacterReview71Lookup>;

/** Primitive identity of an actual eligible private lookup input; no source authority. */
export function readNamingReviewLookupInputJson(lookup:unknown):string|undefined;
