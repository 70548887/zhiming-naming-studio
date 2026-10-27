import type {
 Candidate2AdoptedNamingSessionV1,Candidate2AdoptionEnvelopeV1,
 Candidate2AdoptionReplayV1,Candidate2GenerationProposalV1,
} from './candidate2-generation-adoption-v1';

/** Supplied by a main-process owner, eventually from native Store history.
 * This data is neither an IPC argument nor proof that a Store query occurred. */
export interface Candidate2OwnedMechanicsV2 {seed:number;excludeNames:string[];}

// The fixed M873 consumer/session/source formats remain unchanged. Only the
// unpersisted adoption wrapper changes version; no historical input is relabelled.
export type Candidate2AdoptedNamingSessionV2=Candidate2AdoptedNamingSessionV1;
export interface Candidate2GenerationProposalV2 extends Omit<Candidate2GenerationProposalV1,'schema'> {
 schema:'candidate2-generation-proposal/2';mechanics:Candidate2OwnedMechanicsV2;
}
export interface Candidate2AdoptionEnvelopeV2 extends Omit<Candidate2AdoptionEnvelopeV1,'schema'> {
 schema:'candidate2-adoption-envelope/2';mechanics:Candidate2OwnedMechanicsV2;
}
export interface Candidate2AdoptionReplayV2 extends Omit<Candidate2AdoptionReplayV1,'schema'> {
 schema:'candidate2-adoption-replay/2';mechanics:Candidate2OwnedMechanicsV2;
}
