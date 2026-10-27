import type {CulturalComparisonSnapshot} from './qimen-cultural-comparison';

export const CULTURAL_EVIDENCE_SCHEMA='qimen-cultural-evidence/1.1.0' as const;
export const CULTURAL_REVISION_SCHEMA='qimen-cultural-revision/1.0.0' as const;
export const CULTURAL_WRITE_SCHEMA='qimen-cultural-write/1.0.0' as const;
export type CulturalWriteOperation='create'|'revise'|'restore-revision';
export type CustomerStorageVersion='raw-legacy'|'customer-compact/1'|'customer-compact/2'|'customer-compact/3';
export interface CulturalBlobRef {sha:string;rawBytes:number;codec:'deflate-raw/1';role:'evidence'|'revision-result';}
export interface CulturalHead {id:string;profileId:string;sourceSessionId:string|null;currentRevision:number;reviewToken:string;createdAt:string;}
export interface CulturalRevision {
  comparisonId:string;revision:number;profileId:string;parentRevision:number|null;operation:CulturalWriteOperation;restoredFromRevision:number|null;
  capsule:CulturalBlobRef;result:CulturalBlobRef;createdAt:string;
}
export interface CulturalRevisionResult {
  schema:typeof CULTURAL_REVISION_SCHEMA;comparisonId:string;revision:number;profileId:string;sourceSessionId:string|null;
  capsuleDigest:string;snapshot:CulturalComparisonSnapshot;note:string;noteAuthority:'human-note-only';createdAt:string;
  operation:CulturalWriteOperation;restoredFromRevision:number|null;
}
/** Stable intent only. Later server timestamps, result leaf bytes and head
 * tokens are deliberately absent so committed retries identify the same write. */
export interface CulturalWriteIdentity {
  schema:typeof CULTURAL_WRITE_SCHEMA;operation:CulturalWriteOperation;profileId:string;comparisonId:string;
  expectedRevision:number|null;expectedReviewToken:string|null;sourceSessionId:string|null;sourceRevision:string;
  capsuleSha:string;snapshotDigest:string;noteSha256:string;restoredFromRevision:number|null;
}
export interface CulturalWriteReceipt {profileId:string;idempotencyKey:string;request:CulturalWriteIdentity;requestSha:string;comparisonId:string;resultRevision:number;createdAt:string;}
export interface CulturalSaveRequest {
  previewToken:string;ownerProfileId:string;target:{mode:'create'}|{mode:'revise';comparisonId:string;expectedRevision:number;expectedReviewToken:string};
  idempotencyKey:string;expectedSnapshotDigest:string;note:string;
}
export interface PreparedCulturalWrite {ticket:string;ownerProfileId:string;idempotencyKey:string;requestSha:string;comparisonId:string;databaseGeneration:string;expiresAt:string;}
export interface CommitCulturalWriteRequest {ticket:string;ownerProfileId:string;idempotencyKey:string;expectedRequestSha:string;databaseGeneration:string;}
export type CulturalSaveResult={status:'committed'|'already-committed';committed:CulturalRevision;currentHead:CulturalHead;requestSha:string}|{status:'conflict';reason:'revision-conflict'|'idempotency-conflict'|'source-changed'};
export interface StorageCounts {profiles:number;sessions:number;namingRevisions:number;culturalHeads:number;culturalRevisions:number;culturalWriteReceipts:number;}
export interface CustomerRestorePlan {
  planId:string;mode:'replace';inputFormat:'raw-sqlite'|'compact-sqlite';inputVersion:CustomerStorageVersion;targetVersion:'customer-compact/2'|'customer-compact/3';
  currentDiskHash:string;inputDatabaseHash:string;cleanStagingHash:string;databaseGeneration:string;expiresAt:string;
  currentCounts:StorageCounts;inputCounts:StorageCounts;preimage:{required:true;immutable:true;sha256:string;format:'sqlite'};
  implicitMerge:false;preimageHistoryPreserved:true;inputHistoryDropped:false;
}
export interface CustomerRestoreResult {status:'committed'|'committed-cleanup';restored:StorageCounts;preimagePath:string;}
