/** M886 frozen byte-storage contract. Integrity is not source admission. */
export const SOURCE_CHUNK_BYTES=5_242_880;
export const SOURCE_CHUNK_SCHEMA='qimen-cultural-source-chunk/1.0.0' as const;
export const CULTURAL_CHUNKED_EVIDENCE_SCHEMA='qimen-cultural-evidence/1.1.0' as const;
export interface SourceChunkLeaf {
  schema:typeof SOURCE_CHUNK_SCHEMA;encoding:'base64';byteLength:number;sha256:string;data:string;
}
export interface SourceChunkRef {
  ordinal:number;offset:number;byteLength:number;chunkSha256:string;
  blob:{role:'source-chunk';sha:string;rawBytes:number;codec:'deflate-raw/1'};
}
export interface SourceAssetManifest {
  id:string;originalPath:string;mediaType:string;byteLength:number;sha256:string;chunks:readonly SourceChunkRef[];
}
export interface ProviderJsonMaterial {
  id:string;schemaId:string;codecVersion:string;sha256:string;exactUtf8Json:string;
}
export interface ProviderBlobReference {id:string;role:string;sha256:string;byteLength:number;mediaType:string;}
export interface ProviderMaterial {
  schema:'qimen-cultural-provider-material/1.0.0';providerVersion:'qimen-cultural-provider/1.0.0';
  ownerProfileId:string;sourceSessionId:string|null;sourceRevision:string;storage:'memory-only';
  jsons:readonly ProviderJsonMaterial[];blobs:readonly ProviderBlobReference[];
}
export interface CulturalEvidenceCapsule {
  schema:typeof CULTURAL_CHUNKED_EVIDENCE_SCHEMA;materialDescriptor:ProviderMaterial;materialDigest:string;
  assets:readonly SourceAssetManifest[];capsuleDigest:string;
}
export interface ReconstructedEvidence {
  capsule:CulturalEvidenceCapsule;materialDescriptor:ProviderMaterial;materialDigest:string;
  actualBlobsById:ReadonlyMap<string,Uint8Array>;byteIntegrity:'verified';fixedOfflineAuthentication:'required';
}
/** Product-private; Store constructs this with its own SQL connection. */
export interface CulturalEvidenceCodec {
  decodeEvidenceFromSql(capsuleSha:string,capsuleRawBytes:number):ReconstructedEvidence;
}
