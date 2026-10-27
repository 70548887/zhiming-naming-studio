import type {BirthProfile,NamingPreferences,NamingSession,SourceRecord} from './types';
import type {Candidate2NamingGeneration,Candidate2NamingSelection,Candidate2NamingDataIdentity,Candidate2NamingVerification} from './candidate2-naming-consumer-v1';
import type {ProjectApplicationTuple} from './project-application-v132-r2';

/** M873 attachment shape. A serializable shape does not confer Store authority. */
export interface Candidate2AdoptionSourceRefV1 {
 role:'candidate2-source-capsule'|'candidate2-source-chunk';sha:string;rawBytes:number;codec:'deflate-raw/1';
}
export interface Candidate2AdoptionSourceAssetV1 {
 id:string;scope:'data'|'application-assets'|'application-runtime'|'consumer-execution'|'build-receipt';
 path:string;mediaType:string;byteLength:number;sha256:string;
 chunks:{ordinal:number;offset:number;byteLength:number;chunkSha256:string;blob:Candidate2AdoptionSourceRefV1}[];
}
export interface Candidate2AdoptionSourceCapsuleV1 {
 schema:'candidate2-naming-source-capsule/1';replayPublicationId:'candidate2-session-replay/1';
 consumerVersion:'candidate2-naming-consumer/1.0.0';applicationTuple:ProjectApplicationTuple;
 applicationRuntime:{file:'application.cjs';sha256:string;byteLength:number;receiptSha256:string};
 consumerExecution:{publicationId:'candidate2-session-consumer-execution/1';manifestSha256:string;fullClosureSha256:string;bundleSha256:string;bundleBytes:number};
 runtimeEnvironment:{node:string;icu:string|null;tz:string|null;unicode:string|null};
 dataIdentity:Candidate2NamingDataIdentity;sourceRecords:SourceRecord[];assets:Candidate2AdoptionSourceAssetV1[];witnessDigest:string;
}
export interface Candidate2AdoptionAttachmentV1 {
 schema:'candidate2-naming-session/1';sessionBinding:{sessionId:string;profileId:string;createdAt:string};
 request:{schema:'candidate2-session-request/1';profile:BirthProfile;preferences:NamingPreferences;selection:Candidate2NamingSelection};
 generation:Candidate2NamingGeneration;sourceCapsule:Candidate2AdoptionSourceRefV1;
 sourceWitnessDigest:string;sourceSnapshotDigest:string;attachmentDigest:string;
}
export type Candidate2AdoptedNamingSessionV1=NamingSession & {
 sourceSnapshot:NonNullable<NamingSession['sourceSnapshot']>;
 namingRules:NonNullable<NamingSession['namingRules']>;
 reviewRevision:number;reviewToken:string;candidate2Naming:Candidate2AdoptionAttachmentV1;
};
export interface Candidate2GenerationProposalV1 {
 schema:'candidate2-generation-proposal/1';status:'generated-unpersisted';session:Candidate2AdoptedNamingSessionV1;
 generationAuthority:false;storage:'not-connected';canSave:false;traditionalStatus:'unknown';
}
/** Transfer material for a future Store-owned transaction, not proof of SQL origin. */
export interface Candidate2AdoptionEnvelopeV1 {
 schema:'candidate2-adoption-envelope/1';session:Candidate2AdoptedNamingSessionV1;
 sourceBlobs:{sha:string;rawBytes:number;codec:'deflate-raw/1';payloadBase64:string}[];
 generationAuthority:false;storage:'not-connected';
}
export interface Candidate2AdoptionReplayV1 {
 schema:'candidate2-adoption-replay/1';status:'verified-envelope-replay';session:Candidate2AdoptedNamingSessionV1;
 verification:Candidate2NamingVerification;generationAuthority:false;canSave:false;storage:'not-connected';
 runtimeFromArchiveExecutable:false;traditionalStatus:'unknown';
}
