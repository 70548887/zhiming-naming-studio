import type {CulturalProviderMaterial} from './qimen-cultural-provider-v1';
import type {CulturalComparisonSnapshot} from './qimen-cultural-comparison';

export const CULTURAL_OFFLINE_REPLAY_VERSION='qimen-cultural-offline-replay/1.0.0' as const;
export interface CulturalOfflineReplayInput {
 material:CulturalProviderMaterial;
 /** One actual payload per logical material blob ID. Same-hash references can
  * point to the same native view; the entry owns and deduplicates their bytes.
  * Its 200 MiB input budget counts every logical view before deduplication. */
 blobs:readonly {id:string;bytes:Uint8Array}[];
 /** Store-owned captured snapshot. Its material digest D must stay bound to
  * the original Store/storage seal C when asserting historical provenance. */
 expectedSnapshot:CulturalComparisonSnapshot;
 /** Trusted Store linkage context, not a source admission or write callback. */
 expectedOwner:{profileId:string;sourceSessionId:string|null};
}
export type CulturalOfflineRejection='invalid-input'|'missing-blob'|'extra-blob'|'unsupported-version'|'integrity'|'source-unavailable'|'closed';
export type CulturalOfflineReplayReply={
 kind:'verified-replay';schema:typeof CULTURAL_OFFLINE_REPLAY_VERSION;
 ownerProfileId:string;sourceSessionId:string|null;sourceRevision:string;
 materialDigest:string;snapshotDigest:string;sourceDigest:string;snapshot:CulturalComparisonSnapshot;
 generationAuthority:false;storageAuthority:false;
 /** Selection means revalidated fixed-option semantics. Opaque evidence IDs
  * alone do not prove original provider issuance or user interaction history. */
 verifiedScope:'fixed-cultural-sources-birth-labels-selection-and-derived-result';
}|{kind:'rejected';reason:CulturalOfflineRejection;message:string};
export interface CulturalOfflineReplayAPI {
 /** Synchronous after the fixed one-time runtime preparation. */
 verify(input:CulturalOfflineReplayInput):CulturalOfflineReplayReply;
 close():void;
}
