import type {ExistingSingleCharacterMeaningBatchSource,SingleCharacterMeaningOption,SingleCharacterMeaningOptions,SingleCharacterDictionarySource,SingleCharacterProjectExplanation} from '../shared/single-character-meaning';

export interface ManualM970MeaningConfig {dataDir:string;publicationDir?:string}
export interface ManualM970MeaningRequest {
 mode:'manual-request';char:string;pinyin:string;tone:number;senseId:string;
 /** Caller obtains actual context from its own knowledge package; this module checks the fixed original bytes too. */
 packSha256:string;activeVersion:string;
}
export interface ManualM970BatchSource extends ExistingSingleCharacterMeaningBatchSource {
 batchId:'M970-DATA';sourceId:'m970-manual-literal-reference';
 publicationState:'reviewed-literal-reference-manual-only';admission:'candidate-awaiting-independent-review';activation:'off';candidateOnly:true;
 manualOnly:true;individualAdmission:'not-granted';independentReview:'literal-scope-verified';publicationVersion:'manual-m970-query/1.0.0';sourceCommit:string;reviewSha256:string;
}
export interface ManualM970PublicationIdentity {
 publicationVersion:string;sourceCommit:string;manifestSha256:string;profileSha256:string;sourceSubsetSha256:string;admissionSha256:string;reviewSha256:string;
}
export interface ManualM970DictionarySource extends SingleCharacterDictionarySource {
 originalSha256:string;definitionSha256:string;allOriginalReadings:readonly Readonly<Record<string,unknown>>[];
}
export interface ManualM970MeaningOption extends SingleCharacterMeaningOption {
 source:ManualM970DictionarySource;project:SingleCharacterProjectExplanation&{manualReason:string};
 batch:ManualM970BatchSource;candidateId:string;senseId:string;usageStatus:'manual-context-required';manualReason:string;
 uncertainty:{reviewId:'M976-DATA-DELTA-REVIEW';judgment:string;context:string;suitability:string;selectedSenseChangedFromPrior:boolean;usageStatus:'manual-context-required';admissionGranted:false};
 publication:ManualM970PublicationIdentity;pack:{packSha256:string;activeVersion:string};
 sourceAuthority:false;generationAuthority:false;admissionGranted:false;automaticMeaningAllowed:false;formalCoverageAdded:0;automaticCoverageAdded:0;
}
export interface ManualM970MeaningOptions extends SingleCharacterMeaningOptions {
 options:readonly ManualM970MeaningOption[];source:ManualM970BatchSource|null;
 requestMode:'manual-request';reasonCode:null|'pack-mismatch'|'reading-mismatch'|'sense-mismatch'|'not-covered';usageStatus:'manual-context-required';
 sourceAuthority:false;generationAuthority:false;admissionGranted:false;automaticMeaningAllowed:false;formalCoverageAdded:0;automaticCoverageAdded:0;
}
export function createManualM970MeaningQuery(config:ManualM970MeaningConfig):Readonly<{
 getSingleCharacterMeaningOptions(request:ManualM970MeaningRequest):ManualM970MeaningOptions;
}>;
