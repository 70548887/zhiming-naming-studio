import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {culturalCanonicalJson,ownCulturalJson} from '../domain/qimen-cultural-comparison-canonical';
import {compareQimenCultural} from '../domain/qimen-cultural-comparison';
import {readCulturalRevisionResult} from './cultural-revision-codec';
import {readCulturalEvidenceCapsule,readCulturalSourceChunkBlob} from './cultural-source-chunks';
import {SOURCE_CHUNK_BYTES} from '../shared/cultural-source-chunks';
import type {CulturalAnchorBinding,CulturalBirthAnchorView,CulturalChartIdentity,CulturalComparisonSnapshot} from '../shared/qimen-cultural-comparison';
import type {CulturalEvidenceCapsule,ProviderMaterial,SourceAssetManifest,SourceChunkLeaf} from '../shared/cultural-source-chunks';
import type {CulturalRevisionResult} from '../shared/cultural-storage-v3';
import type {SnapshotBlob} from './snapshot-blob-codec';

/** M909D semantic boundary. C (storage capsule digest) and D (provider
 * material digest) are separate attestations; neither is accepted without
 * the other bindings below. */
export interface CulturalSemanticVerificationInput {
  capsule:unknown;
  revision:unknown;
  /** Exactly the immutable source-chunk leaves referenced by capsule.assets. */
  sourceChunks:readonly SnapshotBlob[]|ReadonlyMap<string,SnapshotBlob>;
  /** Optional trusted anchor supplied by the owner of the preview. */
  expectedAnchor?:Pick<CulturalBirthAnchorView,'anchorId'|'ownerProfileId'|'sourceSessionId'|'sourceRevision'|'identity'>|CulturalAnchorBinding;
}
export interface CulturalSemanticVerificationResult {
  verified:true;ownerProfileId:string;sourceSessionId:string|null;sourceRevision:string;anchorId:string;
  anchorIdentity:CulturalChartIdentity;capsuleDigest:string;materialDigest:string;snapshotDigest:string;
  sourceBytesById:ReadonlyMap<string,Uint8Array>;
}
const invalid=(reason:string):never=>{throw new Error(`CULTURAL_SEMANTIC_VERIFIER_INVALID: ${reason}`);};
const fail: (value:unknown,reason:string)=>asserts value = (value,reason)=>{if(!value)invalid(reason);};
const hash=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const same=(a:unknown,b:unknown)=>culturalCanonicalJson(a)===culturalCanonicalJson(b);

function chunkMap(value:CulturalSemanticVerificationInput['sourceChunks']):Map<string,SnapshotBlob>{
  const map=new Map<string,SnapshotBlob>();
  fail(!types.isProxy(value),'source chunks proxy');
  if(value instanceof Map){fail(Object.getPrototypeOf(value)===Map.prototype&&Reflect.ownKeys(value).length===0,'source chunks map prototype');Map.prototype.forEach.call(value,(blob:SnapshotBlob,key:string)=>{fail(typeof key==='string'&&hash(key),'source chunk map key');fail(!map.has(key),'duplicate source chunk map key');const owned=ownSnapshotBlob(blob);fail(owned.sha===key,'source chunk map binding');map.set(key,owned);});return map;}
  fail(Array.isArray(value),'source chunks must be an array or Map');
  const array=value as readonly SnapshotBlob[];fail(Object.getPrototypeOf(array)===Array.prototype,'source chunks array prototype');const length=Object.getOwnPropertyDescriptor(array,'length');fail(!!length&&Object.hasOwn(length,'value')&&Number.isSafeInteger(length!.value),'source chunks array length');const keys=Reflect.ownKeys(array);fail(keys.length===Number(length!.value)+1,'source chunks array shape');
  for(let index=0;index<Number(length!.value);index++){const descriptor=Object.getOwnPropertyDescriptor(array,String(index));fail(!!descriptor&&Object.hasOwn(descriptor,'value')&&descriptor.enumerable,'source chunk array descriptor');const blob=ownSnapshotBlob(descriptor!.value);fail(!map.has(blob.sha),'duplicate source chunk leaf');map.set(blob.sha,blob);}
  return map;
}
function ownSnapshotBlob(value:unknown):SnapshotBlob{
  fail(!!value&&typeof value==='object'&&!types.isProxy(value),'source chunk proxy');const object=value as object;fail(Object.getPrototypeOf(object)===Object.prototype||Object.getPrototypeOf(object)===null,'source chunk prototype');const ownKeys=Reflect.ownKeys(object);fail(ownKeys.every(key=>typeof key==='string'),'source chunk symbol key');const keys=Object.keys(object).sort().join(',');fail(keys==='codec,payload,rawBytes,sha'&&ownKeys.length===4,'source chunk keys');
  const descriptors=Object.getOwnPropertyDescriptors(object);for(const key of ['sha','rawBytes','codec','payload'])fail(Object.hasOwn(descriptors,key)&&!!descriptors[key].enumerable&&Object.hasOwn(descriptors[key],'value'),'source chunk descriptor');
  const blob={sha:descriptors.sha.value,rawBytes:descriptors.rawBytes.value,codec:descriptors.codec.value,payload:descriptors.payload.value};fail(hash(blob.sha),'source chunk SHA');fail(Number.isSafeInteger(blob.rawBytes)&&blob.rawBytes>0,'source chunk rawBytes');fail(blob.codec==='deflate-raw/1','source chunk codec');fail(blob.payload instanceof Uint8Array&&!types.isProxy(blob.payload),'source chunk payload');return{sha:blob.sha,rawBytes:blob.rawBytes,codec:blob.codec,payload:new Uint8Array(blob.payload)};
}
function identity(anchor:{identity:CulturalChartIdentity}):CulturalChartIdentity{return ownCulturalJson(anchor.identity);}
function assertAnchor(snapshot:CulturalComparisonSnapshot,material:ProviderMaterial,expected?:CulturalSemanticVerificationInput['expectedAnchor']):void{
  const anchor=snapshot.anchor;
  fail(anchor.ownerProfileId===material.ownerProfileId,'anchor ownerProfileId differs from material');
  fail(anchor.sourceSessionId===material.sourceSessionId,'anchor sourceSessionId differs from material');
  fail(anchor.sourceRevision===material.sourceRevision,'anchor sourceRevision differs from material');
  if(expected){fail(anchor.anchorId===expected.anchorId,'anchorId differs from trusted anchor');fail(anchor.ownerProfileId===expected.ownerProfileId,'ownerProfileId differs from trusted anchor');fail(anchor.sourceSessionId===expected.sourceSessionId,'sourceSessionId differs from trusted anchor');fail(anchor.sourceRevision===expected.sourceRevision,'sourceRevision differs from trusted anchor');fail(same(identity(anchor),identity(expected)),'anchor identity differs from trusted anchor');}
}
function assertPreparedAnchor(material:ProviderMaterial,snapshot:CulturalComparisonSnapshot):void{
  const prepared=material.jsons.find(item=>item.id==='prepared-comparison');if(!prepared)return;
  let parsed:unknown;try{parsed=JSON.parse(prepared.exactUtf8Json) as unknown;}catch{invalid('prepared comparison JSON');}
  fail(!!parsed&&typeof parsed==='object'&&!Array.isArray(parsed),'prepared comparison shape');
  const anchor=(parsed as Record<string,unknown>).anchor;
  fail(!!anchor&&typeof anchor==='object'&&!Array.isArray(anchor),'prepared comparison anchor missing');
  fail(same(anchor,snapshot.anchor),'prepared comparison anchor differs from revision snapshot');
  fail((parsed as Record<string,unknown>).evidenceCapsuleDigest===undefined,'prepared comparison must omit evidenceCapsuleDigest');
  const replay=compareQimenCultural({...parsed as Record<string,unknown>,evidenceCapsuleDigest:snapshot.evidenceCapsuleDigest} as never);
  fail(replay.kind==='result','prepared comparison replay unavailable');
  if(replay.kind==='result')fail(same(replay.snapshot,snapshot),'prepared comparison semantic snapshot differs from revision');
}
function reassemble(capsule:CulturalEvidenceCapsule,chunks:Map<string,SnapshotBlob>):ReadonlyMap<string,Uint8Array>{
  const referenced=new Set<string>(),actual=new Map<string,Uint8Array>();
  for(const asset of capsule.assets as readonly SourceAssetManifest[]){
    const parts:Uint8Array[]=[];
    for(let ordinal=0;ordinal<asset.chunks.length;ordinal++){
      const ref=asset.chunks[ordinal],blob=chunks.get(ref.blob.sha);
      fail(blob!==undefined,`missing source chunk ${ref.blob.sha}`);
      fail(blob!.rawBytes===ref.blob.rawBytes&&blob!.codec===ref.blob.codec,'source chunk rawBytes/codec mismatch');
      const decoded=readCulturalSourceChunkBlob(blob!);
      fail(ref.ordinal===ordinal&&ref.offset===ordinal*SOURCE_CHUNK_BYTES,'source chunk ordinal/offset');
      fail(decoded.chunk.sha256===ref.chunkSha256,'source chunk SHA mismatch');
      fail(decoded.bytes.byteLength===ref.byteLength,'source chunk byteLength mismatch');
      referenced.add(ref.blob.sha);parts.push(decoded.bytes);
    }
    const bytes=Buffer.concat(parts,asset.byteLength);
    fail(bytes.byteLength===asset.byteLength,'reassembled source length');
    fail(createHash('sha256').update(bytes).digest('hex')===asset.sha256,'reassembled source SHA');
    actual.set(asset.id,new Uint8Array(bytes));
  }
  fail(referenced.size===chunks.size,'unknown or unreferenced source chunk');
  return actual;
}
/** Validate C/D, revision ownership, anchor identity, and every source chunk
 * before any semantic result is accepted. */
export function verifyCulturalSemanticBindings(input:CulturalSemanticVerificationInput):CulturalSemanticVerificationResult{
  fail(!!input&&typeof input==='object'&&!Array.isArray(input)&&!types.isProxy(input),'input shape');
  fail(Object.getPrototypeOf(input)===Object.prototype||Object.getPrototypeOf(input)===null,'input prototype');const inputKeys=Reflect.ownKeys(input);fail(inputKeys.every(key=>typeof key==='string'),'input symbol key');const descriptors=Object.getOwnPropertyDescriptors(input);const keys=Object.keys(descriptors).sort();fail(keys.join(',')==='capsule,revision,sourceChunks'||keys.join(',')==='capsule,expectedAnchor,revision,sourceChunks','input keys');for(const key of keys)fail(Object.hasOwn(descriptors,key)&&!!descriptors[key].enumerable&&Object.hasOwn(descriptors[key],'value'),'input descriptor');
  const ownedInput={capsule:descriptors.capsule.value,revision:descriptors.revision.value,sourceChunks:descriptors.sourceChunks.value,expectedAnchor:descriptors.expectedAnchor?.value};
  const capsule=readCulturalEvidenceCapsule(ownedInput.capsule),revision=readCulturalRevisionResult(ownedInput.revision),material=capsule.materialDescriptor;
  fail(capsule.capsuleDigest!==capsule.materialDigest,'C/D digests must remain distinct');
  fail(revision.capsuleDigest===capsule.capsuleDigest,'revision C capsuleDigest');
  fail(revision.snapshot.evidenceCapsuleDigest===capsule.materialDigest,'revision D evidenceCapsuleDigest');
  fail(revision.profileId===material.ownerProfileId,'revision ownerProfileId');
  fail(revision.sourceSessionId===material.sourceSessionId,'revision sourceSessionId');
  const expectedAnchor=ownedInput.expectedAnchor===undefined?undefined:ownCulturalJson(ownedInput.expectedAnchor) as CulturalSemanticVerificationInput['expectedAnchor'];
  assertAnchor(revision.snapshot,material,expectedAnchor);assertPreparedAnchor(material,revision.snapshot);
  const sourceChunks=ownedInput.sourceChunks;fail(sourceChunks!==undefined,'source chunks missing');
  const sourceBytesById=reassemble(capsule,chunkMap(sourceChunks));
  return Object.freeze({verified:true as const,ownerProfileId:material.ownerProfileId,sourceSessionId:material.sourceSessionId,sourceRevision:material.sourceRevision,anchorId:revision.snapshot.anchor.anchorId,anchorIdentity:identity(revision.snapshot.anchor),capsuleDigest:capsule.capsuleDigest,materialDigest:capsule.materialDigest,snapshotDigest:revision.snapshot.snapshotDigest,sourceBytesById});
}
export function assertCulturalSemanticBindings(input:CulturalSemanticVerificationInput):void{verifyCulturalSemanticBindings(input);}
export const verifyCulturalCapsuleRevision=verifyCulturalSemanticBindings;
export const assertCulturalCapsuleRevision=assertCulturalSemanticBindings;
export type {CulturalEvidenceCapsule,CulturalRevisionResult,ProviderMaterial,SourceChunkLeaf};
