import {types} from 'node:util';
import {createHash} from 'node:crypto';
import {ownCulturalJson} from '../domain/qimen-cultural-comparison-canonical';
import {parseSnapshotJsonStrict} from './snapshot-json-spans';
import type {CulturalOfflineReplayInput} from '../shared/qimen-cultural-offline-v1';

const MAX_BYTES=200*1024*1024,MAX_REFS=128;
const hash=(v:Uint8Array|string)=>createHash('sha256').update(v).digest('hex');
const fail=():never=>{throw Error('OFFLINE_INPUT_INVALID');};
const typedPrototype=Object.getPrototypeOf(Uint8Array.prototype);
const getBuffer=Object.getOwnPropertyDescriptor(typedPrototype,'buffer')!.get!;
const getLength=Object.getOwnPropertyDescriptor(typedPrototype,'byteLength')!.get!;
const getOffset=Object.getOwnPropertyDescriptor(typedPrototype,'byteOffset')!.get!;
const nativeSet=Uint8Array.prototype.set;
function record(input:unknown,keys:readonly string[]):Record<string,unknown>{
 if(!input||typeof input!=='object'||types.isProxy(input)||Array.isArray(input)||![Object.prototype,null].includes(Object.getPrototypeOf(input)))return fail();
 const actual=Reflect.ownKeys(input);if(actual.length!==keys.length)return fail();
 const result:Record<string,unknown>={};
 for(const key of actual){if(typeof key!=='string'||!keys.includes(key))return fail();const d=Object.getOwnPropertyDescriptor(input,key);if(!d||!Object.hasOwn(d,'value')||!d.enumerable)return fail();Object.defineProperty(result,key,{value:d.value,enumerable:true});}
 return result;
}
/** Copy native byte slots without caller iterators, getters, toJSON or species. */
function bytes(input:unknown,remaining:number):Uint8Array{
 if(!input||typeof input!=='object'||types.isProxy(input)||!ArrayBuffer.isView(input)||![Uint8Array.prototype,Buffer.prototype].includes(Object.getPrototypeOf(input)))return fail();
 const buffer=getBuffer.call(input) as ArrayBuffer,length=getLength.call(input) as number,offset=getOffset.call(input) as number;
 if(Object.getPrototypeOf(buffer)!==ArrayBuffer.prototype||!Number.isSafeInteger(length)||length<=0||length>remaining||!Number.isSafeInteger(offset))return fail();
 const output=new Uint8Array(length);nativeSet.call(output,new Uint8Array(buffer,offset,length));return output;
}
export interface OwnedCulturalOfflineInput extends CulturalOfflineReplayInput {uniqueBlobs:readonly {sha256:string;bytes:Uint8Array}[];}
/** Entire call captured synchronously, before any await or filesystem access. */
export function ownCulturalOfflineInputV1(value:unknown):OwnedCulturalOfflineInput{
 const root=record(value,['material','blobs','expectedSnapshot','expectedOwner']);
 const material=ownCulturalJson<CulturalOfflineReplayInput['material']>(root.material),expectedSnapshot=ownCulturalJson<CulturalOfflineReplayInput['expectedSnapshot']>(root.expectedSnapshot),expectedOwner=ownCulturalJson<CulturalOfflineReplayInput['expectedOwner']>(root.expectedOwner);
 if(!material||typeof material!=='object'||!expectedOwner||Object.keys(expectedOwner).sort().join('|')!=='profileId|sourceSessionId'||typeof expectedOwner.profileId!=='string'||!expectedOwner.profileId||expectedOwner.profileId.length>2000||expectedOwner.sourceSessionId!==null&&(typeof expectedOwner.sourceSessionId!=='string'||!expectedOwner.sourceSessionId||expectedOwner.sourceSessionId.length>2000))return fail();
 const original=root.blobs;
 if(!original||typeof original!=='object'||types.isProxy(original)||!Array.isArray(original)||Object.getPrototypeOf(original)!==Array.prototype)return fail();
 const length=Object.getOwnPropertyDescriptor(original,'length');if(!length||!Object.hasOwn(length,'value')||!Number.isSafeInteger(length.value)||length.value<1||length.value>MAX_REFS||Reflect.ownKeys(original).length!==length.value+1)return fail();
 const payloads:{id:string;bytes:Uint8Array}[]=[],unique=new Map<string,Uint8Array>(),ids=new Set<string>();
 let total=Buffer.byteLength(JSON.stringify(material),'utf8')+Buffer.byteLength(JSON.stringify(expectedSnapshot),'utf8')+Buffer.byteLength(JSON.stringify(expectedOwner),'utf8');
 if(total>MAX_BYTES)return fail();
 for(let i=0;i<length.value;i++){
  const d=Object.getOwnPropertyDescriptor(original,String(i));if(!d||!Object.hasOwn(d,'value')||!d.enumerable)return fail();
  const row=record(d.value,['id','bytes']);if(typeof row.id!=='string'||!row.id||row.id.length>2000||ids.has(row.id))return fail();ids.add(row.id);
  // Charge each logical input view before allocating, even when its bytes are
  // identical to an earlier reference. Deduplication must not bypass the cap.
  const owned=bytes(row.bytes,MAX_BYTES-total);total+=owned.byteLength;const digest=hash(owned);let retained=unique.get(digest);
  if(!retained){retained=owned;unique.set(digest,retained);}
  payloads.push({id:row.id,bytes:retained});
 }
 if(!Array.isArray(material.jsons)||!Array.isArray(material.blobs)||material.jsons.length>128||material.blobs.length>MAX_REFS||new Set(material.jsons.map(j=>j.id)).size!==material.jsons.length||new Set(material.blobs.map(j=>j.id)).size!==material.blobs.length)return fail();
 for(const j of material.jsons){if(!j||Object.keys(j).sort().join('|')!=='codecVersion|exactUtf8Json|id|schemaId|sha256'||typeof j.id!=='string'||!j.id||typeof j.schemaId!=='string'||!j.schemaId||typeof j.codecVersion!=='string'||!j.codecVersion||typeof j.exactUtf8Json!=='string'||hash(j.exactUtf8Json)!==j.sha256)return fail();ownCulturalJson(parseSnapshotJsonStrict(j.exactUtf8Json));}
 const refs=new Map(material.blobs.map(b=>[b.id,b]));
 for(const p of payloads){const ref=refs.get(p.id);if(!ref)throw Error('OFFLINE_EXTRA_BLOB');if(Object.keys(ref).sort().join('|')!=='byteLength|id|mediaType|role|sha256'||!Number.isSafeInteger(ref.byteLength)||ref.byteLength!==p.bytes.length||typeof ref.role!=='string'||typeof ref.mediaType!=='string'||hash(p.bytes)!==ref.sha256)throw Error('OFFLINE_INTEGRITY');}
 if(material.blobs.length!==payloads.length||material.blobs.some(r=>!ids.has(r.id)))throw Error('OFFLINE_MISSING_BLOB');
 return Object.freeze({material,expectedSnapshot,expectedOwner,blobs:Object.freeze(payloads),uniqueBlobs:Object.freeze([...unique].map(([sha256,bytes])=>({sha256,bytes})))});
}
