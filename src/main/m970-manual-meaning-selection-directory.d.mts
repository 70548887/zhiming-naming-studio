import type {ManualM970MeaningOptions} from './m970-manual-character-meaning-query.mjs';

export interface ManualM970SelectionConfig {
 dataDir:string;
 /** Trusted main-process active/archive file for this view. Recreate factory if selected path changes. Never a renderer field. */
 actualPackFile:string;
 publicationDir?:string;
}
export interface ManualM970DirectoryRequest {mode:'manual-request';char:string}
export interface ManualM970SelectionRequest {mode:'manual-request';selectionKey:string}
export interface ManualM970DirectoryBoundaries {
 candidateOnly:true;activation:'off';productionApproved:false;admissionGranted:false;automaticMeaningAllowed:false;
 sourceAuthority:false;generationAuthority:false;wholeNameMeaning:null;automaticNameRecommendation:false;automaticSemanticCreditAllowed:false;
 scoreDelta:0;formalCoverageAdded:0;automaticCoverageAdded:0;usageStatus:'manual-context-required';
}
export interface ManualM970DirectoryItem extends ManualM970DirectoryBoundaries {
 /** Same factory only; opaque. No sense/hash/approval is required from UI. */
 selectionKey:string;char:string;pinyin:string;tone:number;meaning:string;
 originalMeaning:string;
 sourceCitation:{dictionaryName:string;sourceId:string;word:string;pinyin:string;license:string};
 /** True only for the reviewed change of selected literal sense (革/姿/由). It never grants adoption. */
 changeMeaning:boolean;manualReason:string;limits:readonly string[];
 original:{dictionaryName:string;word:string;pinyin:string;tone:number;definition:Readonly<Record<string,unknown>>;sourcePOS:string;completeOriginalEntry:Readonly<Record<string,unknown>>;license:string};
 project:{meaning:string;projectWish:null;limits:readonly string[];manualReason:string;attribution:string;license:string};
 uncertainty:{judgment:string;context:string;suitability:string};publicationVersion:string;
}
export interface ManualM970MeaningDirectory extends ManualM970DirectoryBoundaries {
 schema:'manual-character-meaning-directory/1';mode:'manual-request';char:string;status:'available'|'not-covered';items:readonly ManualM970DirectoryItem[];
}
export type ManualM970SelectionResult=ManualM970DirectoryBoundaries&{
 schema:'manual-character-meaning-selection/1';mode:'manual-request';
}&({status:'selected';meaningOptions:ManualM970MeaningOptions;reason:null}|{status:'invalid-selection';meaningOptions:null;reason:string});
export function createManualM970MeaningSelectionDirectory(config:ManualM970SelectionConfig):Readonly<{
 listAvailableMeanings(request:ManualM970DirectoryRequest):ManualM970MeaningDirectory;
 selectMeaning(request:ManualM970SelectionRequest):ManualM970SelectionResult;
}>;
