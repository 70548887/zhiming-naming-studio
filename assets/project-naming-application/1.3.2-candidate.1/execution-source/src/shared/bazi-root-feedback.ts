import type {Element140,Branch140,UseItem140} from './bazi-mainchain-method-types';
export const ROOT_FEEDBACK_PREVIEW_VERSION='bazi-root-feedback-preview/1.0.0' as const;
export type RootRegimeResolution='unique-consistent-regime'|'multiple-consistent-regimes'|'no-consistent-regime'|'pending-regime-resolution';
export interface RootFeedbackOpinion {
 regimeId:string;methodId:string;hypothetical:boolean;strength:'weak'|'balanced'|'strong';branch:Branch140;
 primary:Element140[];secondary:Element140[];avoid:Element140[];
 uses:UseItem140[];alternatives:{id:string;condition:string;uses:UseItem140[]}[];
 summary:string[];pending:string[];
}
export interface RootFeedbackPreviewDTO {
 schema:typeof ROOT_FEEDBACK_PREVIEW_VERSION;methodId:'project-bazi-mainchain-145/1.3.1';
 profileId:string;hypothetical:boolean;scope:'complete-known-pillars'|'known-pillars-only';resolution:RootRegimeResolution;
 entryPolicy:'month-branch-only'|'month-stem-proposal';
 facts:{id:string;originalElement:Element140;workingElement:Element140;conversion:string|null;hiddenOrder:number|null;originalSupportIds:string[]}[];
 variables:{id:string;element:Element140;carrierIds:string[];fallbackFactor:number}[];
 regimes:{id:string;consistency:'consistent'|'inconsistent'|'possible';
  assumptions:{element:Element140;rooted:boolean;carrierIds:string[]}[];
  capacities:{id:string;capacity:number;rootFactor:number}[];
  roots:{element:Element140;value:'true'|'false'|'unknown';witnessIds:string[];reasons:string[];
   candidates:{id:string;lower:number|null;upper:number|null;qualification:string}[]}[];
  opinion:RootFeedbackOpinion|null;
  certificate:{status:string;iterations:number|null;errorBound:number|null};
  pending:string[];
 }[];
 consistentIds:string[];possibleIds:string[];
 commonOpinion:{status:'all-retained-regimes'|'known-opinions-only'|'unavailable';primary:Element140[];favorable:Element140[];knownOpinionIntersection?:Element140[]};
 conflicts:{element:Element140;favorableIn:string[];avoidIn:string[]}[];
 pending:string[];limitations:string[];
 /** Detailed immutable numerical/versioned evidence; it is not a score. */
 detail:unknown;
}
