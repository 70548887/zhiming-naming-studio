import type {CustomerStorageVersion} from './cultural-storage-v3';

/** Discovery is separate from the frozen eleven-method cultural workflow. */
export const CULTURAL_COMPARISON_CATALOG_METHODS=Object.freeze(['listCulturalComparisons'] as const);
export interface CulturalComparisonCatalogRequest {readonly limit?:number;readonly cursor?:string;}
export interface CulturalComparisonCatalogMetadata {
 readonly comparisonId:string;readonly ownerProfileId:string;readonly sourceSessionId:string|null;
 readonly currentRevision:number;readonly createdAt:string;
 readonly factsAuthenticated:false;readonly sourceAuthority:'not-authenticated-facts';
}
interface CulturalComparisonCatalogBoundary {
 readonly schema:'cultural-comparison-catalog/1';readonly ownerProfileId:string;readonly storageVersion:CustomerStorageVersion;
 readonly limit:number;readonly order:'comparison-id-desc';readonly factsAuthenticated:false;readonly sourceAuthority:'not-authenticated-facts';
}
export type CulturalComparisonCatalogPage=
 | CulturalComparisonCatalogBoundary&{readonly status:'available';readonly items:readonly CulturalComparisonCatalogMetadata[];readonly nextCursor?:string}
 | CulturalComparisonCatalogBoundary&{readonly status:'unsupported';readonly reason:'cultural-tables-unavailable';readonly items:readonly []}
 | CulturalComparisonCatalogBoundary&{readonly status:'cursor-expired';readonly reason:'owner-changed'|'database-changed'|'query-changed';readonly items:readonly []};
export interface CulturalComparisonCatalogAPI {
 listCulturalComparisons(ownerProfileId:string,request?:CulturalComparisonCatalogRequest):Promise<CulturalComparisonCatalogPage>;
}
/** Shape discovery only. This does not validate sources or authenticate facts. */
export function hasCulturalComparisonCatalogAPI(value:unknown):value is CulturalComparisonCatalogAPI {
 if(!value||typeof value!=='object')return false;
 try{const slot=Object.getOwnPropertyDescriptor(value,'listCulturalComparisons');return !!slot&&Object.hasOwn(slot,'value')&&typeof slot.value==='function';}catch{return false;}
}
