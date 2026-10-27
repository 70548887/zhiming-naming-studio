import type {CulturalBirthAnchorView,CulturalComparisonSnapshot,CulturalSourceState} from './qimen-cultural-comparison';
import type {Element} from './types';

export const CULTURAL_PROVIDER_VERSION='qimen-cultural-provider/1.0.0' as const;
/** Only these references cross the request boundary. Material and source data
 * are never accepted back as authority; opaque handles resolve process state. */
export type CulturalAnchorRequest={kind:'session';sessionId:string;expectedReviewToken:string}|{kind:'profile';profileId:string;expectedBirthInputDigest?:string};
export type CulturalProviderCandidateRequest={kind:'saved';candidateId:string}|{kind:'draft';draftId:string;givenName:string};
export interface CulturalProviderEvidenceOption {
 evidenceId:string;position:number;char:string;pinyin:string;sourceState:Exclude<CulturalSourceState,'source-error'>;
 elements:readonly Element[];dictionarySense:string|null;projectIntent:string|null;
}
export interface CulturalProviderOptions {
 candidateToken:string;candidateRef:string;anchorId:string;selectionRevision:string;givenName:string;fullName:string;
 positions:readonly {position:number;char:string;status:'options-available'|'reading-selection-required'|'unknown-label'|'unmapped'|'pending-admission'|'source-conflict';defaultEvidenceId:string|null;options:readonly CulturalProviderEvidenceOption[]}[];
}
export interface CulturalProviderSelection {candidateToken:string;position:number;evidenceId:string;}
export interface CulturalProviderPreviewRequest {candidateTokens:readonly string[];selections:readonly CulturalProviderSelection[];}
export interface CulturalProviderJsonMaterial {id:string;schemaId:string;codecVersion:string;sha256:string;exactUtf8Json:string;}
export interface CulturalProviderBlobReference {id:string;role:string;sha256:string;byteLength:number;mediaType:string;}
/** Actual JSON text is embedded. Every blob ref is backed by retained bytes
 * retrievable from this process. This is not a Store/NSBK persistence receipt. */
export interface CulturalProviderMaterial {
 schema:'qimen-cultural-provider-material/1.0.0';providerVersion:typeof CULTURAL_PROVIDER_VERSION;
 ownerProfileId:string;sourceSessionId:string|null;sourceRevision:string;storage:'memory-only';
 jsons:readonly CulturalProviderJsonMaterial[];blobs:readonly CulturalProviderBlobReference[];
}
export type CulturalProviderFailureReason='invalid-input'|'not-found'|'rejected-integrity'|'stale-source'|'source-unavailable'|'closed'|'capacity';
export type CulturalProviderReply<T>={kind:'ok';value:T}|{kind:'unavailable';reason:CulturalProviderFailureReason;sourceState:'source-error'|null;message:string};
export interface CulturalProviderAnchor {handle:string;anchor:CulturalBirthAnchorView;}
export interface CulturalProviderPreview {previewHandle:string;snapshot:CulturalComparisonSnapshot;materialDigest:string;}
/** A live check returned to the private Store caller, never a write capability
 * that an IPC caller can submit back. Invoke again immediately before commit.
 */
export interface CulturalOwnedPreviewCheck {
 validation:'live-main-owned-preview';previewHandle:string;anchorId:string;ownerProfileId:string;sourceSessionId:string|null;
 sourceRevision:string;databaseRevision:string;sourceDigest:string;materialDigest:string;snapshotDigest:string;
}
export interface CulturalProviderAPI {
 prepareBirthAnchor(request:CulturalAnchorRequest):Promise<CulturalProviderReply<CulturalProviderAnchor>>;
 queryCharacterOptions(handle:string,candidate:CulturalProviderCandidateRequest):CulturalProviderReply<CulturalProviderOptions>;
 preview(handle:string,request:CulturalProviderPreviewRequest):CulturalProviderReply<CulturalProviderPreview>;
 readAnchorMaterial(handle:string):CulturalProviderReply<CulturalProviderMaterial>;
 readMaterial(previewHandle:string):CulturalProviderReply<CulturalProviderMaterial>;
 verifyOwnedPreview(previewHandle:string):CulturalProviderReply<CulturalOwnedPreviewCheck>;
 /** Immutable byte retrieval only. This does not replace verifyOwnedPreview at
  * prepare/commit boundaries; source changes never destroy the retained bytes. */
 readMaterialBlob(handle:string,blobId:string):CulturalProviderReply<Uint8Array>;
 close():void;
}
