import {performance} from 'node:perf_hooks';
import {types} from 'node:util';
import {deflateRawSync} from 'node:zlib';
import type {Database} from 'sql.js';
import {culturalCanonicalDigest,culturalCanonicalJson,ownCulturalJson} from '../domain/qimen-cultural-comparison-canonical';
import {CULTURAL_CHUNKED_EVIDENCE_SCHEMA,SOURCE_CHUNK_BYTES,SOURCE_CHUNK_SCHEMA,type CulturalEvidenceCapsule,type CulturalEvidenceCodec,type ProviderMaterial,type ReconstructedEvidence,type SourceAssetManifest,type SourceChunkLeaf,type SourceChunkRef} from '../shared/cultural-source-chunks';
import {decodeSnapshotBlobText,SNAPSHOT_CODEC,SNAPSHOT_LEAF_MAX_BYTES,SNAPSHOT_MANIFEST_MAX_BYTES,snapshotSha,type SnapshotBlob} from './snapshot-blob-codec';
import {parseSnapshotJsonStrict} from './snapshot-json-spans';

const SOURCE_UNIQUE_MAX=128*1024*1024,ITEM_MAX=4096,LEAF_COUNT_MAX=100000;
const UNIQUE_LEAF_RAW_MAX=2*1024**3,LOGICAL_SCAN_MAX=8*1024**3,SCAN_MS=60000;
const invalid=(reason:string):never=>{throw new Error('CULTURAL_SOURCE_CHUNKS_INVALID: '+reason);};
function check(value:unknown,reason:string):asserts value {if(!value)invalid(reason);}
const hash=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const integer=(value:unknown,min:number,max:number):value is number=>Number.isSafeInteger(value)&&Number(value)>=min&&Number(value)<=max;
const string=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<=8192;
function record(value:unknown,fields:string):Record<string,unknown>{
  check(value&&typeof value==='object'&&!Array.isArray(value),'object required');
  const expected=fields.split(','),actual=Object.keys(value);
  check(actual.length===expected.length&&actual.every(key=>expected.includes(key)),'exact keys');return value as Record<string,unknown>;
}
function parsedJson(text:string):unknown {return ownCulturalJson(parseSnapshotJsonStrict(text,SNAPSHOT_LEAF_MAX_BYTES));}
function material(value:unknown):ProviderMaterial {
  const m=record(value,'schema,providerVersion,ownerProfileId,sourceSessionId,sourceRevision,storage,jsons,blobs');
  check(m.schema==='qimen-cultural-provider-material/1.0.0'&&m.providerVersion==='qimen-cultural-provider/1.0.0'&&m.storage==='memory-only'&&string(m.ownerProfileId)&&string(m.sourceRevision)&&(m.sourceSessionId===null||string(m.sourceSessionId)),'material header');
  check(Array.isArray(m.jsons)&&m.jsons.length>0&&m.jsons.length<=ITEM_MAX&&Array.isArray(m.blobs)&&m.blobs.length<=ITEM_MAX,'material counts');
  const jsonIds=new Set<string>();let jsonBytes=0,prepared=false;
  for(const value of m.jsons){
    const j=record(value,'id,schemaId,codecVersion,sha256,exactUtf8Json');
    check(string(j.id)&&string(j.schemaId)&&(j.codecVersion==='exact-utf8-json/1'||j.codecVersion==='cultural-canonical-json/1')&&hash(j.sha256)&&typeof j.exactUtf8Json==='string'&&!jsonIds.has(j.id),'material JSON');
    jsonIds.add(j.id);const raw=Buffer.from(j.exactUtf8Json,'utf8');jsonBytes+=raw.length;
    check(jsonBytes<=SNAPSHOT_LEAF_MAX_BYTES&&new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw)===j.exactUtf8Json&&snapshotSha(raw)===j.sha256,'material JSON bytes');
    const parsed=parsedJson(j.exactUtf8Json);
    if(j.codecVersion==='cultural-canonical-json/1')check(culturalCanonicalJson(parsed)===j.exactUtf8Json,'material canonical JSON');
    if(j.id==='prepared-comparison'){
      check(parsed&&typeof parsed==='object'&&!Array.isArray(parsed)&&!Object.hasOwn(parsed,'evidenceCapsuleDigest'),'prepared comparison self reference');prepared=true;
    }
  }
  check(prepared,'prepared comparison missing');
  const blobIds=new Set<string>(),unique=new Map<string,number>();let uniqueBytes=0;
  for(const value of m.blobs){
    const b=record(value,'id,role,sha256,byteLength,mediaType');
    check(string(b.id)&&string(b.role)&&string(b.mediaType)&&hash(b.sha256)&&integer(b.byteLength,0,SOURCE_UNIQUE_MAX)&&!blobIds.has(b.id),'material blob');blobIds.add(b.id);
    const previous=unique.get(b.sha256);
    if(previous!==undefined)check(previous===b.byteLength,'source hash length conflict');
    else{unique.set(b.sha256,b.byteLength);uniqueBytes+=b.byteLength;check(uniqueBytes<=SOURCE_UNIQUE_MAX,'unique source budget');}
  }
  return value as ProviderMaterial;
}
function capsuleBody(c:CulturalEvidenceCapsule){return{schema:c.schema,materialDescriptor:c.materialDescriptor,materialDigest:c.materialDigest,assets:c.assets};}
/** Exact /1.1 dispatcher, original material D and independent capsule C.
 * This validates storage data only; it does not authenticate cultural sources. */
export function readCulturalEvidenceCapsule(value:unknown):CulturalEvidenceCapsule {
  const owned=ownCulturalJson<CulturalEvidenceCapsule>(value),c=record(owned,'schema,materialDescriptor,materialDigest,assets,capsuleDigest');
  check(c.schema===CULTURAL_CHUNKED_EVIDENCE_SCHEMA&&hash(c.materialDigest)&&hash(c.capsuleDigest),'capsule header');
  const original=material(c.materialDescriptor);
  check(culturalCanonicalDigest(original)===c.materialDigest&&culturalCanonicalDigest(capsuleBody(owned))===c.capsuleDigest,'material D or capsule C');
  check(Array.isArray(c.assets)&&c.assets.length===original.blobs.length,'asset count');let refs=0,logical=0;
  for(let index=0;index<c.assets.length;index++){
    const a=record(c.assets[index],'id,originalPath,mediaType,byteLength,sha256,chunks'),b=original.blobs[index];
    check(a.id===b.id&&a.originalPath===b.role&&a.mediaType===b.mediaType&&a.byteLength===b.byteLength&&a.sha256===b.sha256,'asset original binding');
    check(Array.isArray(a.chunks)&&a.chunks.length===Math.ceil(b.byteLength/SOURCE_CHUNK_BYTES),'chunk count');
    for(let ordinal=0;ordinal<a.chunks.length;ordinal++){
      const r=record(a.chunks[ordinal],'ordinal,offset,byteLength,chunkSha256,blob'),leaf=record(r.blob,'role,sha,rawBytes,codec');
      check(r.ordinal===ordinal&&r.offset===ordinal*SOURCE_CHUNK_BYTES&&r.byteLength===Math.min(SOURCE_CHUNK_BYTES,b.byteLength-ordinal*SOURCE_CHUNK_BYTES)&&hash(r.chunkSha256),'chunk range or order');
      check(leaf.role==='source-chunk'&&hash(leaf.sha)&&integer(leaf.rawBytes,1,SNAPSHOT_LEAF_MAX_BYTES)&&leaf.codec===SNAPSHOT_CODEC,'chunk reference');
      logical+=leaf.rawBytes;check(++refs<=LEAF_COUNT_MAX&&logical<=LOGICAL_SCAN_MAX,'logical reference budget');
    }
  }
  return owned;
}
function encodeLeaf(value:unknown):SnapshotBlob {
  const text=culturalCanonicalJson(value),raw=Buffer.from(text,'utf8');
  check(integer(raw.length,1,SNAPSHOT_LEAF_MAX_BYTES),'leaf budget');parseSnapshotJsonStrict(text,SNAPSHOT_LEAF_MAX_BYTES);
  return{sha:snapshotSha(raw),rawBytes:raw.length,codec:SNAPSHOT_CODEC,payload:deflateRawSync(raw,{level:6})};
}
export function readCulturalSourceChunkBlob(blob:SnapshotBlob):{chunk:SourceChunkLeaf;bytes:Uint8Array}{
  // The byte decoder has already applied the same strict JSON byte/depth and
  // duplicate-key checks. Own the parsed value without scanning the text twice.
  const text=decodeSnapshotBlobText(blob),value=ownCulturalJson(JSON.parse(text)),c=record(value,'schema,encoding,byteLength,sha256,data');
  check(c.schema===SOURCE_CHUNK_SCHEMA&&c.encoding==='base64'&&integer(c.byteLength,1,SOURCE_CHUNK_BYTES)&&hash(c.sha256)&&typeof c.data==='string','chunk shape');
  check(text===culturalCanonicalJson(value),'chunk canonical JSON');
  // Search for forbidden characters/padding instead of an anchored repetition
  // over multi-megabyte data. These predicates retain the independent alphabet
  // check even if a Buffer base64 method is replaced by a caller.
  check(c.data.length===4*Math.ceil(c.byteLength/3)&&c.data.length%4===0&&!/[^A-Za-z0-9+/=]/.test(c.data)&&!/=[^=]|={3}/.test(c.data),'base64 shape');
  const bytes=Buffer.from(c.data,'base64');
  check(bytes.length===c.byteLength&&bytes.toString('base64')===c.data&&snapshotSha(bytes)===c.sha256,'chunk length, base64 or SHA');
  return{chunk:value as SourceChunkLeaf,bytes};
}
export interface EncodedCulturalEvidence {capsule:CulturalEvidenceCapsule;capsuleBlob:SnapshotBlob;sourceChunks:readonly SnapshotBlob[];}
/** The caller supplies actual provider bytes by original logical ref ID.
 * No source path is opened, and no admission claim follows from this codec. */
export function encodeCulturalEvidence(value:ProviderMaterial,actualBlobsById:ReadonlyMap<string,Uint8Array>):EncodedCulturalEvidence {
  const original=material(ownCulturalJson(value));check(actualBlobsById instanceof Map&&!types.isProxy(actualBlobsById),'actual byte map');
  const leaves=new Map<string,SnapshotBlob>(),sources=new Map<string,Buffer>(),assets:SourceAssetManifest[]=[];
  for(const b of original.blobs){
    const supplied=actualBlobsById.get(b.id);check(types.isUint8Array(supplied)&&supplied.byteLength===b.byteLength,'actual source missing or length');
    const source=Buffer.from(supplied);check(snapshotSha(source)===b.sha256,'actual source SHA');
    const existing=sources.get(b.sha256);if(existing)check(existing.equals(source),'source bytes conflict');else sources.set(b.sha256,source);
    const chunks:SourceChunkRef[]=[];
    for(let offset=0,ordinal=0;offset<source.length;offset+=SOURCE_CHUNK_BYTES,ordinal++){
      const bytes=source.subarray(offset,Math.min(offset+SOURCE_CHUNK_BYTES,source.length)),chunkSha256=snapshotSha(bytes);
      const leaf=encodeLeaf({schema:SOURCE_CHUNK_SCHEMA,encoding:'base64',byteLength:bytes.length,sha256:chunkSha256,data:bytes.toString('base64')});
      const prior=leaves.get(leaf.sha);
      if(prior)check(prior.rawBytes===leaf.rawBytes&&Buffer.from(prior.payload).equals(leaf.payload),'encoded leaf collision');else leaves.set(leaf.sha,leaf);
      chunks.push({ordinal,offset,byteLength:bytes.length,chunkSha256,blob:{role:'source-chunk',sha:leaf.sha,rawBytes:leaf.rawBytes,codec:SNAPSHOT_CODEC}});
    }
    assets.push({id:b.id,originalPath:b.role,mediaType:b.mediaType,byteLength:b.byteLength,sha256:b.sha256,chunks});
  }
  const body={schema:CULTURAL_CHUNKED_EVIDENCE_SCHEMA,materialDescriptor:original,materialDigest:culturalCanonicalDigest(original),assets};
  const capsule=readCulturalEvidenceCapsule({...body,capsuleDigest:culturalCanonicalDigest(body)});
  return{capsule,capsuleBlob:encodeLeaf(capsule),sourceChunks:[...leaves.values()]};
}
/** Store creates one codec per complete scan/operation and reuses it for every
 * revision and orphan capsule. No caller reader or validator is accepted.
 * Existing roots/results/orphans also charge the outer Store's shared budget. */
export function createCulturalEvidenceCodec(database:Database):CulturalEvidenceCodec {
  let started:number|undefined,logicalScan=0,uniqueRaw=0;const uniqueLeaves=new Map<string,number>();
  const budget=()=>{if(started===undefined)started=performance.now();check(performance.now()-started<=SCAN_MS,'scan deadline');};
  function readSql(sha:string):SnapshotBlob {
    budget();check(hash(sha),'SQL leaf SHA');const statement=database.prepare('SELECT sha,raw_bytes,codec,payload FROM snapshot_blobs WHERE sha=?');
    try{
      statement.bind([sha]);check(statement.step(),'missing SQL leaf');const row=statement.getAsObject();check(!statement.step(),'duplicate SQL leaf');
      check(row.sha===sha&&integer(row.raw_bytes,1,SNAPSHOT_LEAF_MAX_BYTES)&&row.codec===SNAPSHOT_CODEC&&types.isUint8Array(row.payload)&&row.payload.length>0&&row.payload.length<=SNAPSHOT_MANIFEST_MAX_BYTES+65536,'SQL leaf tuple');
      const old=uniqueLeaves.get(sha);
      if(old===undefined){uniqueLeaves.set(sha,row.raw_bytes);uniqueRaw+=row.raw_bytes;check(uniqueLeaves.size<=LEAF_COUNT_MAX&&uniqueRaw<=UNIQUE_LEAF_RAW_MAX,'unique leaf budget');}
      else check(old===row.raw_bytes,'SQL leaf length conflict');
      return{sha,rawBytes:row.raw_bytes,codec:SNAPSHOT_CODEC,payload:Buffer.from(row.payload)};
    }finally{statement.free();}
  }
  return Object.freeze({decodeEvidenceFromSql(capsuleSha:string,capsuleRawBytes:number):ReconstructedEvidence{
    budget();check(hash(capsuleSha)&&integer(capsuleRawBytes,1,SNAPSHOT_LEAF_MAX_BYTES),'capsule reference');
    const blob=readSql(capsuleSha);check(blob.rawBytes===capsuleRawBytes,'capsule SQL binding');
    // decodeSnapshotBlobText performed strict parsing; the capsule reader owns
    // and validates the result, so an extra strict scan/ownership copy is idle.
    const capsule=readCulturalEvidenceCapsule(JSON.parse(decodeSnapshotBlobText(blob)));
    let nextLogical=blob.rawBytes;
    for(const asset of capsule.assets)for(const ref of asset.chunks)nextLogical+=ref.blob.rawBytes;
    check(Number.isSafeInteger(nextLogical)&&logicalScan+nextLogical<=LOGICAL_SCAN_MAX,'logical scan budget');logicalScan+=nextLogical;
    const chunks=new Map<string,{blob:SnapshotBlob;chunk:SourceChunkLeaf;bytes:Uint8Array}>(),sources=new Map<string,Buffer>(),byId=new Map<string,Uint8Array>();
    for(const asset of capsule.assets){
      budget();const parts:Uint8Array[]=[];
      for(const ref of asset.chunks){
        check(ref.blob.sha!==capsuleSha,'capsule back reference');const leaf=readSql(ref.blob.sha);
        check(leaf.rawBytes===ref.blob.rawBytes&&leaf.codec===ref.blob.codec,'SQL chunk binding');
        let decoded=chunks.get(leaf.sha);
        if(!decoded){decoded={blob:leaf,...readCulturalSourceChunkBlob(leaf)};chunks.set(leaf.sha,decoded);}
        else check(decoded.blob.rawBytes===leaf.rawBytes&&decoded.blob.codec===leaf.codec&&Buffer.from(decoded.blob.payload).equals(leaf.payload),'SQL immutable tuple conflict');
        check(decoded.chunk.sha256===ref.chunkSha256&&decoded.bytes.length===ref.byteLength,'manifest chunk binding');parts.push(decoded.bytes);budget();
      }
      const actual=Buffer.concat(parts,asset.byteLength);
      check(actual.length===asset.byteLength&&snapshotSha(actual)===asset.sha256,'whole source length or SHA');
      const existing=sources.get(asset.sha256);
      if(existing)check(existing.equals(actual),'whole source conflict');else sources.set(asset.sha256,actual);
      byId.set(asset.id,existing??actual);budget();
    }
    return Object.freeze({capsule,materialDescriptor:capsule.materialDescriptor,materialDigest:capsule.materialDigest,actualBlobsById:byId,byteIntegrity:'verified',fixedOfflineAuthentication:'required'});
  }});
}
