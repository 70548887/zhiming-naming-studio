import {snapshotApplicationJson} from './project-application-v132-r2-json';
import {decodeAdoptionSources,exactAdoption,ownAdoptionEnvelope} from './candidate2-generation-adoption-codec-v1';
import type {Candidate2AdoptionEnvelopeV1} from '../shared/candidate2-generation-adoption-v1';
import type {Candidate2AdoptionEnvelopeV2,Candidate2OwnedMechanicsV2} from '../shared/candidate2-generation-adoption-v2';

export {adoptionDigest,adoptionHash,encodeAdoptionSources,exactAdoption} from './candidate2-generation-adoption-codec-v1';
export type {AdoptionRawAssetV1} from './candidate2-generation-adoption-codec-v1';

export function captureOwnedMechanicsV2(raw:unknown):Candidate2OwnedMechanicsV2 {
 const value=snapshotApplicationJson(raw);exactAdoption(value,['seed','excludeNames']);
 if(typeof value.seed!=='number'||!Number.isSafeInteger(value.seed)||!Array.isArray(value.excludeNames)||value.excludeNames.length>10000||value.excludeNames.some(name=>typeof name!=='string'||name.length>100))throw Error('CANDIDATE2_MECHANICS_INVALID: explicit safe integer seed and bounded name exclusions required');
 return value as unknown as Candidate2OwnedMechanicsV2;
}

/** The archive copier and M873 source-leaf format are shared with v1. These
 * type views do not rewrite any schema or grant v1 compatibility/authority.
 * The v2 factory validates its exact wrapper and mechanics before decoding. */
export function ownAdoptionEnvelopeV2(raw:unknown):Candidate2AdoptionEnvelopeV2 {
 return ownAdoptionEnvelope(raw) as unknown as Candidate2AdoptionEnvelopeV2;
}
export function decodeAdoptionSourcesV2(envelope:Candidate2AdoptionEnvelopeV2){
 return decodeAdoptionSources(envelope as unknown as Candidate2AdoptionEnvelopeV1);
}
