import type {Applicability,AutomaticMeaning,MeaningReview,NamingCharacterReview71Result} from '../domain/naming-review-v7.mjs';

interface NamingMeaningReviewRowBase {
 position:number;char:string;applicability:Applicability;
 review?:(MeaningReview&{automaticSemanticCreditAllowed:false;displayOnlyReview:true});
 automaticMeaning?:AutomaticMeaning;
}
/** Old JSON has neither kind nor characterExplanation. */
export interface NamingMeaningReviewRowV7 extends NamingMeaningReviewRowBase {kind?:never;characterExplanation?:never;}
export type NamingMeaningReviewRowV71=
 (NamingMeaningReviewRowBase&{kind:'legacy-v7-review';characterExplanation?:never})|
 (NamingMeaningReviewRowBase&{kind:'character-level-project-explanation';characterExplanation:NamingCharacterReview71Result});
export type NamingMeaningReviewRow=NamingMeaningReviewRowV7|NamingMeaningReviewRowV71;
interface NamingMeaningReviewSnapshotBase {
 sourceSha256:string;packSha256:string;activeVersion:string;givenName:string;
 recordState:'recorded';automaticSemanticCreditAllowed:false;
}
export interface NamingMeaningReviewSnapshotV7 extends NamingMeaningReviewSnapshotBase {
 version:'naming-editorial-7.0.0';sourceId:'naming-editorial-meanings-v7-fixed';rows:NamingMeaningReviewRowV7[];
}
export interface NamingMeaningReviewSnapshotV71 extends NamingMeaningReviewSnapshotBase {
 version:'naming-editorial-7.1.0';sourceId:'naming-character-meanings-v7.1-fixed';
 scope:'per-character-project-explanation-only';wholeNameAssessment:'not-assessed';wholeNameMeaning:null;
 automaticNameRecommendation:false;scoreDelta:0;rows:NamingMeaningReviewRowV71[];
}
export type NamingMeaningReviewSnapshot=NamingMeaningReviewSnapshotV7|NamingMeaningReviewSnapshotV71;
