import type {Element} from './types';

export type M754ObjectTheme='river-object'|'mineral-stone-object'|'tree-branch-object'|'cotton-plant-object'|'hanging-flower-object';
export type M754AdoptionScope='default-reading-direct-object'|'explicit-naming-theme';
export interface M754ImageryCandidate {
 factId:string;char:string;defaultPinyin:string;authority:'project-convention';
 namingIntent:{text:string;authorId:string;license:'CC0-1.0'};
 projectMapping:{objectClass:string;element:Element;ruleId:string;claim:string};
 autoAdoption:{scope:M754AdoptionScope;themeId:M754ObjectTheme|null;condition:string;requiresIndependentReview:true};
 ambiguity:string;status:'pending-independent-review';candidateSha256:string;
}
export interface M754DictionaryFact {
 factId:string;char:string;defaultPinyin:string;dictionaryWord:string;sourceId:'moe-revised';
 sourceRecordId:string;entryIndex:number;readingIndex:number;definitionIndex:number;senseRecordId:string;
 sourceEntrySha256:string;sourceReadingSha256:string;sourceDefinitionSha256:string;rawPinyin:string;
 glyphEvidence:{file:string;lineNumber:number;line:string}[];
 verbatimEntry:{title:string;heteronyms:{pinyin:string;definitions:Record<string,unknown>[]}[];[key:string]:unknown};
}
export interface M754ImageryBinding {char:string;pinyin:string;sourceEntrySha256:string;sourceReadingSha256:string;}
export interface M754ImageryDecision {
 char:string;pinyin:string;status:'uncovered'|'pending-independent-review'|'theme-required'|'eligible';
 proposedElements:Element[];effectiveElements:Element[];factId:string|null;candidateSha256:string|null;
 profileId:string;packageLockSha256:string;reviewId:string|null;
 adoptionScope:M754AdoptionScope|null;requiredTheme:M754ObjectTheme|null;
}
/** Configured in trusted main-process code after a separate review. Never IPC/preferences input. */
export interface M754IndependentReviewPin {relativePath:string;expectedSha256:string;}
export interface M754IndependentReview {
 schemaVersion:'m754-independent-review/1.0.0';profileId:string;packageLockSha256:string;
 reviewId:string;reviewerId:string;authorId:'M754-DATA';
 rows:{char:string;candidateSha256:string;decision:'approved'|'rejected'|'pending';scope:M754AdoptionScope;themeId:M754ObjectTheme|null;rationale:string|null}[];
}
