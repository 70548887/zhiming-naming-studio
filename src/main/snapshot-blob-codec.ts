import {createHash} from 'node:crypto';import {deflateRawSync,inflateRawSync} from 'node:zlib';
import {parseSnapshotJsonStrict,splitImmutableSnapshotJson,SNAPSHOT_RAW_MAX_BYTES} from './snapshot-json-spans';
export const SNAPSHOT_CODEC='deflate-raw/1';
export const SNAPSHOT_LEAF_MAX_BYTES=8*1024*1024;
export const SNAPSHOT_MANIFEST_MAX_BYTES=32*1024*1024;
export interface SnapshotBlob {sha:string;rawBytes:number;codec:typeof SNAPSHOT_CODEC;payload:Uint8Array;}
export interface SnapshotRoot extends SnapshotBlob {manifestBytes:number;manifestSha:string;}
export interface EncodedSnapshot {root:SnapshotRoot;blobs:SnapshotBlob[];}
export type SnapshotManifestPart={text:string}|{blob:string;key:'analysis'|'sourceSnapshot';rawBytes:number};
export interface SnapshotLeafReference {position:number;sha:string;key:'analysis'|'sourceSnapshot';rawBytes:number;}
export interface ParsedSnapshotRootManifest {parts:SnapshotManifestPart[];refs:SnapshotLeafReference[];}
export const snapshotSha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const hash=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{64}$/.test(value);
const count=(value:unknown,max=SNAPSHOT_RAW_MAX_BYTES):value is number=>Number.isSafeInteger(value)&&Number(value)>0&&Number(value)<=max;
function utf8(bytes:Uint8Array){return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);}
function inflate(blob:SnapshotBlob,expectedBytes:number,expectedHash:string):Buffer{
 if(blob.codec!==SNAPSHOT_CODEC||!count(expectedBytes,SNAPSHOT_MANIFEST_MAX_BYTES)||!hash(expectedHash)||!(blob.payload instanceof Uint8Array)||blob.payload.length===0||blob.payload.length>SNAPSHOT_MANIFEST_MAX_BYTES+65536)throw new Error('快照压缩段格式或大小无效。');
 const value=inflateRawSync(blob.payload,{maxOutputLength:expectedBytes,info:true}) as unknown as {buffer:Buffer;engine:{bytesWritten:number}};
 if(value.buffer.length!==expectedBytes||value.engine.bytesWritten!==blob.payload.length||snapshotSha(value.buffer)!==expectedHash)throw new Error('快照压缩段摘要、长度或结尾不一致。');return value.buffer;
}
export function validateSnapshotBlob(blob:SnapshotBlob):void{
 if(!count(blob.rawBytes,SNAPSHOT_LEAF_MAX_BYTES)||!hash(blob.sha))throw new Error('不可变字段预算无效。');
 const bytes=inflate(blob,blob.rawBytes,blob.sha);parseSnapshotJsonStrict(utf8(bytes),SNAPSHOT_LEAF_MAX_BYTES);
}
/** Bounded existing byte/JSON validation, returning its text for cultural role
 * decoders. Source admission remains the fixed offline validator's job. */
export function decodeSnapshotBlobText(blob:SnapshotBlob):string{
 if(!count(blob.rawBytes,SNAPSHOT_LEAF_MAX_BYTES)||!hash(blob.sha))throw new Error('不可变字段预算无效。');
 const text=utf8(inflate(blob,blob.rawBytes,blob.sha));parseSnapshotJsonStrict(text,SNAPSHOT_LEAF_MAX_BYTES);return text;
}
export function encodeSnapshot(raw:string):EncodedSnapshot{
 const original=Buffer.from(raw,'utf8'),parts=splitImmutableSnapshotJson(raw).parts,blobs=new Map<string,SnapshotBlob>();const manifest={version:'snapshot-segments/1',parts:parts.map(part=>{if(part.kind==='raw')return{text:part.text};const bytes=Buffer.from(part.text,'utf8'),sha=snapshotSha(bytes);if(!count(bytes.length,SNAPSHOT_LEAF_MAX_BYTES))throw new Error('单个不可变字段超过8MiB。');if(!blobs.has(sha))blobs.set(sha,{sha,rawBytes:bytes.length,codec:SNAPSHOT_CODEC,payload:deflateRawSync(bytes,{level:6})});return{blob:sha,key:part.key,rawBytes:bytes.length};})};const bytes=Buffer.from(JSON.stringify(manifest),'utf8');if(bytes.length>SNAPSHOT_MANIFEST_MAX_BYTES)throw new Error('快照分段清单超过32MiB。');return{root:{sha:snapshotSha(original),rawBytes:original.length,codec:SNAPSHOT_CODEC,manifestBytes:bytes.length,manifestSha:snapshotSha(bytes),payload:deflateRawSync(bytes,{level:6})},blobs:[...blobs.values()]};
}
/** Verify the root envelope and strict manifest JSON without reading or trusting any referenced leaf. */
export function parseSnapshotRootManifest(root:SnapshotRoot):ParsedSnapshotRootManifest{
 if(!root||!hash(root.sha)||!count(root.rawBytes)||!count(root.manifestBytes,SNAPSHOT_MANIFEST_MAX_BYTES)||!hash(root.manifestSha))throw new Error('快照根记录无效。');
 const manifestText=utf8(inflate(root,root.manifestBytes,root.manifestSha));let parsed:unknown;
 try{parsed=parseSnapshotJsonStrict(manifestText,SNAPSHOT_MANIFEST_MAX_BYTES);}catch(error){throw new Error('快照分段清单JSON无效。',{cause:error});}
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('快照分段清单或版本无效。');
 const manifest=parsed as Record<string,unknown>;
 if(JSON.stringify(manifest)!==manifestText||Object.keys(manifest).sort().join(',')!=='parts,version'||manifest.version!=='snapshot-segments/1'||!Array.isArray(manifest.parts)||manifest.parts.length<1||manifest.parts.length>5)throw new Error('快照分段清单或版本无效。');
 const parts:SnapshotManifestPart[]=[],refs:SnapshotLeafReference[]=[];let leaves=0;
 for(let position=0;position<manifest.parts.length;position++){
  const value:unknown=manifest.parts[position];if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('快照段不接受嵌套引用。');
  const part=value as Record<string,unknown>;
  if(Object.keys(part).join(',')==='text'&&typeof part.text==='string')parts.push({text:part.text});
  else if(Object.keys(part).sort().join(',')==='blob,key,rawBytes'&&hash(part.blob)&&(part.key==='analysis'||part.key==='sourceSnapshot')&&count(part.rawBytes,SNAPSHOT_LEAF_MAX_BYTES)&&++leaves<=2){
   parts.push({blob:part.blob,key:part.key,rawBytes:part.rawBytes});refs.push({position,sha:part.blob,key:part.key,rawBytes:part.rawBytes});
  }else throw new Error('快照段引用无效。');
 }
 return{parts,refs};
}
/** Hashes prove byte integrity; callers must still run all saved-fact and association validators. */
export interface DecodedSnapshotDetails {text:string;refs:SnapshotLeafReference[];}
export function decodeSnapshotDetailed(root:SnapshotRoot,readBlob:(sha:string)=>SnapshotBlob):DecodedSnapshotDetails{
 const {parts,refs}=parseSnapshotRootManifest(root),fragments:Buffer[]=[];let size=0;
 for(const part of parts){
  let bytes:Buffer;
  if('text'in part)bytes=Buffer.from(part.text,'utf8');
  else{const blob=readBlob(part.blob);if(!blob||blob.sha!==part.blob||blob.rawBytes!==part.rawBytes)throw new Error('快照引用段缺失或字段长度不一致。');bytes=inflate(blob,blob.rawBytes,part.blob);}
  size+=bytes.length;if(size>root.rawBytes)throw new Error('快照还原超出原始长度。');fragments.push(bytes);
 }
 const bytes=Buffer.concat(fragments,size);if(size!==root.rawBytes||snapshotSha(bytes)!==root.sha)throw new Error('完整快照还原摘要不一致。');
 const text=utf8(bytes),actual=splitImmutableSnapshotJson(text).parts;
 if(actual.length!==parts.length||actual.some((p,i)=>{const part=parts[i];return p.kind==='raw'?!('text'in part)||part.text!==p.text:!('blob'in part)||part.key!==p.key||part.rawBytes!==Buffer.byteLength(p.text)||part.blob!==snapshotSha(Buffer.from(p.text));}))throw new Error('不可变字段引用位置或身份不一致。');
 return{text,refs};
}

/** Preserve the existing string API; detailed decoding still executes every original codec check. */
export function decodeSnapshot(root:SnapshotRoot,readBlob:(sha:string)=>SnapshotBlob):string{
 return decodeSnapshotDetailed(root,readBlob).text;
}
