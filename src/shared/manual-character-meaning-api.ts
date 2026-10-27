/** Public manual-only display contract. Technical pack/sense/approval identity
 * stays in the main-owned directory factory, never in renderer arguments. */
export interface ManualCharacterMeaningListRequest{mode:'manual-request';char:string;}
export interface ManualCharacterMeaningSelectRequest{mode:'manual-request';selectionKey:string;}
export interface ManualCharacterMeaningLimits{
 usageStatus:'manual-context-required';candidateOnly:true;activation:'off';productionApproved:false;admissionGranted:false;
 automaticMeaningAllowed:false;automaticNameRecommendation:false;automaticSemanticCreditAllowed:false;sourceAuthority:false;generationAuthority:false;
 wholeNameMeaning:null;scoreDelta:0;formalCoverageAdded:0;automaticCoverageAdded:0;
}
export interface ManualCharacterMeaningItem{
 selectionKey:string;char:string;pinyin:string;tone:number;originalMeaning:string;
 sourceCitation:{dictionaryName:string;word:string;pinyin:string;license:string};
 changeMeaning:boolean;manualReason:string;limits:readonly string[];
}
export interface ManualCharacterMeaningDirectory extends ManualCharacterMeaningLimits{
 schema:'manual-character-meaning-directory/1';mode:'manual-request';char:string;status:'available'|'not-covered';items:readonly ManualCharacterMeaningItem[];
}
export interface ManualCharacterMeaningSelection extends ManualCharacterMeaningLimits{
 schema:'manual-character-meaning-selection/1';mode:'manual-request';status:'selected'|'invalid-selection';reason:string|null;
 explanation:{char:string;selectionKey:string;meaning:string;manualReason:string;limits:readonly string[]}|null;
}
export interface ManualCharacterMeaningAPI{
 listManualCharacterMeanings(request:ManualCharacterMeaningListRequest):Promise<ManualCharacterMeaningDirectory>;
 selectManualCharacterMeaning(request:ManualCharacterMeaningSelectRequest):Promise<ManualCharacterMeaningSelection>;
}
