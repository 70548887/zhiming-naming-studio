import type {CulturalAnchorRequest,CulturalProviderAPI,CulturalProviderCandidateRequest,CulturalProviderPreviewRequest} from './qimen-cultural-provider-v1';
import type {CulturalSaveRequest,CommitCulturalWriteRequest,CulturalSaveResult,PreparedCulturalWrite,CustomerStorageVersion,StorageCounts,CulturalHead,CulturalRevision,CulturalRevisionResult} from './cultural-storage-v3';
import type {CustomerStorageState} from './customer-storage-state';

/** Public reference-only surface. Provider material/blob/verification methods
 * remain inside the owning Store and never become transport routes. */
export const CULTURAL_WORKFLOW_METHODS=Object.freeze([
 'getCulturalStorageCapabilities','prepareCulturalBirthAnchor','getCulturalCharacterOptions','previewCulturalComparison',
 'prepareCulturalWrite','commitCulturalWrite','readCulturalComparison','listCulturalRevisions','restoreCulturalRevision',
 'previewCulturalStorageMigration','migrateCulturalStorage',
] as const);
export interface CulturalStorageCapabilities {version:CustomerStorageVersion;hasRootLeafRefs:boolean;hasRevisionProfileId:boolean;hasCulturalTables:boolean;}
export interface CulturalStorageMigrationPreview {from:CustomerStorageVersion;to:'customer-compact/3';counts:StorageCounts;writes:0;}
/** The Store verifies its full internal capsule before this public projection.
 * Neither the original capsule nor replay/provider handles cross this API. */
export interface CulturalComparisonRead {head:CulturalHead;revision:CulturalRevision;result:CulturalRevisionResult;}
export type CulturalRevisionListing=CulturalRevision[];
export interface CulturalWorkflowAPI {
 getCulturalStorageCapabilities():Promise<CulturalStorageCapabilities>;
 prepareCulturalBirthAnchor(request:CulturalAnchorRequest):ReturnType<CulturalProviderAPI['prepareBirthAnchor']>;
 getCulturalCharacterOptions(handle:string,candidate:CulturalProviderCandidateRequest):Promise<ReturnType<CulturalProviderAPI['queryCharacterOptions']>>;
 previewCulturalComparison(handle:string,request:CulturalProviderPreviewRequest):Promise<ReturnType<CulturalProviderAPI['preview']>>;
 prepareCulturalWrite(request:CulturalSaveRequest):Promise<PreparedCulturalWrite>;
 commitCulturalWrite(request:CommitCulturalWriteRequest):Promise<CulturalSaveResult>;
 readCulturalComparison(id:string,revision?:number):Promise<CulturalComparisonRead>;
 listCulturalRevisions(id:string):Promise<CulturalRevisionListing>;
 restoreCulturalRevision(id:string,targetRevision:number,expectedRevision:number,expectedReviewToken:string,idempotencyKey:string):Promise<CulturalSaveResult>;
 previewCulturalStorageMigration():Promise<CulturalStorageMigrationPreview>;
 migrateCulturalStorage():Promise<CustomerStorageState>;
}
/** Capability discovery reads only own data-function descriptors. Merely
 * resembling this bridge does not qualify snapshots or establish sources. */
export function hasCulturalWorkflowAPI(value:unknown):value is CulturalWorkflowAPI {
 if(!value||typeof value!=='object')return false;
 try{return CULTURAL_WORKFLOW_METHODS.every(name=>{const slot=Object.getOwnPropertyDescriptor(value,name);return !!slot&&Object.hasOwn(slot,'value')&&typeof slot.value==='function';});}catch{return false;}
}
