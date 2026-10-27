import {createHash} from 'node:crypto';
import {deflateRawSync,inflateRawSync} from 'node:zlib';
import {types} from 'node:util';
import {canonicalPlainJson} from '../shared/plain-json';
import {parseSnapshotJsonStrict} from './snapshot-json-spans';
import type {Candidate2AdoptionEnvelopeV1,Candidate2AdoptionSourceAssetV1,Candidate2AdoptionSourceCapsuleV1,Candidate2AdoptionSourceRefV1} from '../shared/candidate2-generation-adoption-v1';

const LEAF=8*1024**2,CHUNK=5*1024**2,CONTAINER=200*1024**2,SOURCE=128*1024**2;
export const adoptionHash=(value:Uint8Array|string)=>createHash('sha256').update(value).digest('hex');
export const adoptionDigest=(value:unknown)=>adoptionHash(canonicalPlainJson(value));
function need(value:unknown,reason:string):asserts value{if(!value)throw Error('CANDIDATE2_ADOPTION_INVALID: '+reason);}
const isHash=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
export function exactAdoption(value:unknown,keys:readonly string[]):asserts value is Record<string,unknown>{
 need(!!value&&typeof value==='object'&&!Array.isArray(value),'object');
 need(Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key)),'exact fields');
}
/** Unlike the small request copier, this copier budgets the complete archive.
 * It still rejects Proxy/accessor/toJSON trees before reading any value. */
export function ownAdoptionEnvelope(value:unknown):Candidate2AdoptionEnvelopeV1 {
 let text=0,nodes=0;const active=new WeakSet<object>();
 function own(value:unknown,depth:number):any{
  need(++nodes<=1_000_000&&depth<=100,'archive depth/node budget');
  if(value===null||typeof value==='boolean')return value;
  if(typeof value==='number'){need(Number.isFinite(value),'finite number');return value;}
  if(typeof value==='string'){text+=Buffer.byteLength(value,'utf8');need(text<=CONTAINER,'archive text budget');return value;}
  need(typeof value==='object'&&!types.isProxy(value),'plain archive data');const object=value as object;
  need(!active.has(object),'archive cycle');const array=Array.isArray(value),prototype=Object.getPrototypeOf(value);
  need(array?prototype===Array.prototype:prototype===Object.prototype||prototype===null,'archive prototype');
  const keys=Reflect.ownKeys(object);need(keys.every(key=>typeof key==='string'),'archive symbol');active.add(object);
  let result:any;
  if(array){const length=Object.getOwnPropertyDescriptor(object,'length')?.value;need(Number.isSafeInteger(length)&&length<=100_000&&keys.length===length+1,'archive array');result=[];for(let i=0;i<length;i++){const d=Object.getOwnPropertyDescriptor(object,String(i));need(d&&Object.hasOwn(d,'value')&&d.enumerable,'archive array descriptor');result.push(own(d.value,depth+1));}}
  else{result={};for(const key of keys as string[]){text+=Buffer.byteLength(key,'utf8');need(text<=CONTAINER,'archive text budget');const d=Object.getOwnPropertyDescriptor(object,key);need(d&&Object.hasOwn(d,'value')&&d.enumerable,'archive object descriptor');Object.defineProperty(result,key,{value:own(d.value,depth+1),enumerable:true,writable:false,configurable:false});}}
  active.delete(object);return Object.freeze(result);
 }
 return own(value,0);
}
export interface AdoptionRawAssetV1 {id:string;scope:Candidate2AdoptionSourceAssetV1['scope'];path:string;bytes:Buffer;}
type Blob=Candidate2AdoptionEnvelopeV1['sourceBlobs'][number];
function leaf(value:unknown):Blob{
 const raw=Buffer.from(canonicalPlainJson(value));need(raw.length>0&&raw.length<=LEAF,'leaf budget');
 return{sha:adoptionHash(raw),rawBytes:raw.length,codec:'deflate-raw/1',payloadBase64:deflateRawSync(raw,{level:6}).toString('base64')};
}
function reference(role:Candidate2AdoptionSourceRefV1['role'],row:Blob):Candidate2AdoptionSourceRefV1{return{role,sha:row.sha,rawBytes:row.rawBytes,codec:row.codec};}
export function encodeAdoptionSources(assets:readonly AdoptionRawAssetV1[],body:Omit<Candidate2AdoptionSourceCapsuleV1,'schema'|'assets'|'witnessDigest'>){
 const rows=new Map<string,Blob>(),descriptions:Candidate2AdoptionSourceAssetV1[]=[];
 for(const asset of assets){const chunks:Candidate2AdoptionSourceAssetV1['chunks']=[];
  for(let offset=0,ordinal=0;offset<asset.bytes.length;offset+=CHUNK,ordinal++){
   const bytes=asset.bytes.subarray(offset,offset+CHUNK),hash=adoptionHash(bytes);
   const row=leaf({schema:'candidate2-naming-source-chunk/1',encoding:'base64',byteLength:bytes.length,sha256:hash,data:bytes.toString('base64')});rows.set(row.sha,row);
   chunks.push({ordinal,offset,byteLength:bytes.length,chunkSha256:hash,blob:reference('candidate2-source-chunk',row)});
  }
  descriptions.push({id:asset.id,scope:asset.scope,path:asset.path,mediaType:asset.path.endsWith('.json')?'application/json':'application/octet-stream',byteLength:asset.bytes.length,sha256:adoptionHash(asset.bytes),chunks});
 }
 const capsuleBody={schema:'candidate2-naming-source-capsule/1' as const,...body,assets:descriptions};
 const capsule:Candidate2AdoptionSourceCapsuleV1={...capsuleBody,witnessDigest:adoptionDigest(capsuleBody)};
 const capsuleRow=leaf(capsule);rows.set(capsuleRow.sha,capsuleRow);
 return{capsule,sourceCapsule:reference('candidate2-source-capsule',capsuleRow),sourceBlobs:[...rows.values()]};
}
function decodeBase64(value:unknown,max:number):Buffer{need(typeof value==='string'&&value.length<=Math.ceil(max/3)*4&&value.length%4===0,'base64 budget');const bytes=Buffer.from(value,'base64');need(bytes.length<=max&&bytes.toString('base64')===value,'canonical base64');return bytes;}
export function decodeAdoptionSources(envelope:Candidate2AdoptionEnvelopeV1){
 const rows=new Map<string,{raw:Buffer;value:any;rawBytes:number;codec:string}>();
 need(Array.isArray(envelope.sourceBlobs)&&envelope.sourceBlobs.length>0&&envelope.sourceBlobs.length<=100_000,'leaf count');let rawBudget=0;
 for(const row of envelope.sourceBlobs){exactAdoption(row,['sha','rawBytes','codec','payloadBase64']);need(isHash(row.sha)&&!rows.has(row.sha)&&Number.isSafeInteger(row.rawBytes)&&row.rawBytes>0&&row.rawBytes<=LEAF&&row.codec==='deflate-raw/1','leaf identity');rawBudget+=row.rawBytes;need(rawBudget<=2*1024**3,'unique leaf budget');const compressed=decodeBase64(row.payloadBase64,LEAF+65536);const result=inflateRawSync(compressed,{maxOutputLength:row.rawBytes,info:true}) as unknown as {buffer:Buffer;engine:{bytesWritten:number}};need(result.engine.bytesWritten===compressed.length&&result.buffer.length===row.rawBytes&&adoptionHash(result.buffer)===row.sha,'leaf bytes or compression tail');const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(result.buffer);const value=parseSnapshotJsonStrict(text,LEAF);need(canonicalPlainJson(value)===text,'canonical leaf JSON');rows.set(row.sha,{raw:result.buffer,value,rawBytes:row.rawBytes,codec:row.codec});}
 const used=new Set<string>();
 function get(ref:Candidate2AdoptionSourceRefV1,role:Candidate2AdoptionSourceRefV1['role']){exactAdoption(ref,['role','sha','rawBytes','codec']);const row=rows.get(ref.sha);need(ref.role===role&&ref.codec==='deflate-raw/1'&&row&&row.rawBytes===ref.rawBytes&&row.codec===ref.codec,'requested reference binding');used.add(ref.sha);return row;}
 const attachment=envelope.session.candidate2Naming,ref=attachment.sourceCapsule,capsule=get(ref,'candidate2-source-capsule').value as Candidate2AdoptionSourceCapsuleV1;
 exactAdoption(capsule,['schema','replayPublicationId','consumerVersion','applicationTuple','applicationRuntime','consumerExecution','runtimeEnvironment','dataIdentity','sourceRecords','assets','witnessDigest']);
 const {witnessDigest,...body}=capsule;
 need(capsule.schema==='candidate2-naming-source-capsule/1'&&capsule.replayPublicationId==='candidate2-session-replay/1'&&capsule.consumerVersion==='candidate2-naming-consumer/1.0.0'&&isHash(witnessDigest)&&adoptionDigest(body)===witnessDigest&&attachment.sourceWitnessDigest===witnessDigest,'capsule digest/schema');
 need(adoptionDigest(capsule.dataIdentity)===adoptionDigest(attachment.generation.dataIdentity)&&adoptionDigest(capsule.applicationTuple)===adoptionDigest(attachment.generation.application.tuple)&&adoptionDigest(capsule.sourceRecords)===adoptionDigest(envelope.session.sourceSnapshot.sources),'capsule generation binding');
 need(Array.isArray(capsule.assets)&&capsule.assets.length>0&&capsule.assets.length<=4096,'asset count');
 const assets:AdoptionRawAssetV1[]=[],paths=new Set<string>(),ids=new Set<string>(),unique=new Map<string,number>();let total=0,scan=ref.rawBytes;
 for(const asset of capsule.assets){exactAdoption(asset,['id','scope','path','mediaType','byteLength','sha256','chunks']);need(typeof asset.id==='string'&&!ids.has(asset.id)&&['data','application-assets','application-runtime','consumer-execution','build-receipt'].includes(asset.scope)&&typeof asset.path==='string'&&asset.path.length>0&&!/[\\:\u0000-\u001f]/.test(asset.path)&&!asset.path.startsWith('/')&&asset.path.split('/').every(part=>part&&part!=='.'&&part!=='..'),'asset path/id');ids.add(asset.id);const key=(asset.scope+':'+asset.path).toLowerCase();need(!paths.has(key),'asset alias');paths.add(key);need(Number.isSafeInteger(asset.byteLength)&&asset.byteLength>=0&&asset.byteLength<=SOURCE&&isHash(asset.sha256)&&Array.isArray(asset.chunks)&&asset.chunks.length===Math.ceil(asset.byteLength/CHUNK),'asset size');if(!unique.has(asset.sha256)){total+=asset.byteLength;need(total<=SOURCE,'source unique budget');unique.set(asset.sha256,asset.byteLength);}else need(unique.get(asset.sha256)===asset.byteLength,'hash length conflict');const parts:Buffer[]=[];
  for(let i=0;i<asset.chunks.length;i++){const r=asset.chunks[i];exactAdoption(r,['ordinal','offset','byteLength','chunkSha256','blob']);need(r.ordinal===i&&r.offset===i*CHUNK&&r.byteLength===Math.min(CHUNK,asset.byteLength-r.offset)&&r.blob.sha!==ref.sha,'chunk range');scan+=r.blob.rawBytes;need(scan<=8*1024**3,'logical budget');const c=get(r.blob,'candidate2-source-chunk').value;exactAdoption(c,['schema','encoding','byteLength','sha256','data']);need(c.schema==='candidate2-naming-source-chunk/1'&&c.encoding==='base64'&&c.byteLength===r.byteLength&&c.sha256===r.chunkSha256,'typed chunk');const bytes=decodeBase64(c.data,CHUNK);need(bytes.length===r.byteLength&&adoptionHash(bytes)===c.sha256,'chunk source bytes');parts.push(bytes);}
  const bytes=Buffer.concat(parts);need(bytes.length===asset.byteLength&&adoptionHash(bytes)===asset.sha256,'whole asset bytes');assets.push({id:asset.id,scope:asset.scope,path:asset.path,bytes});
 }
 need(used.size===rows.size,'unreferenced material');return{capsule,assets,uniqueSourceBytes:total,logicalScanBytes:scan};
}
