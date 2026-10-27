import type {Database,SqlValue} from 'sql.js';
import {deflateRawSync} from 'node:zlib';
import {types} from 'node:util';
import {canonicalPlainJson} from '../shared/plain-json';
import type {Candidate2AdoptedNamingSessionV1,Candidate2AdoptionSourceCapsuleV1,Candidate2AdoptionSourceRefV1} from '../shared/candidate2-generation-adoption-v1';
import type {Candidate2AdoptionEnvelopeV2,Candidate2OwnedMechanicsV2} from '../shared/candidate2-generation-adoption-v2';
import {adoptionHash,decodeAdoptionSourcesV2,exactAdoption,ownAdoptionEnvelopeV2,captureOwnedMechanicsV2} from './candidate2-generation-adoption-codec-v2';
import {decodeCandidate2SourceClosureFromSqlDatabase,inspectCandidate2SessionBytes} from './candidate2-session-contract-v1';
import {decodeSnapshotBlobText,SNAPSHOT_CODEC,SNAPSHOT_LEAF_MAX_BYTES,type SnapshotBlob} from './snapshot-blob-codec';

/** Internal byte codec only. The Store supplies and authenticates the native SQL
 * database, original generation, writer/CAS scope and installed replay owner.
 * Neither a binding nor an encoded envelope grants generation/write authority. */
export interface Candidate2NativeStorageBindingV1 {
 schema:'candidate2-native-storage/1';
 envelopeSchema:'candidate2-adoption-envelope/2';
 sessionBinding:Candidate2AdoptedNamingSessionV1['candidate2Naming']['sessionBinding'];
 attachmentDigest:string;
 mechanics:Candidate2OwnedMechanicsV2;
 sourceRefs:Candidate2AdoptionSourceRefV1[];
}
export interface EncodedCandidate2NativeStorageV1 {
 envelope:Candidate2AdoptionEnvelopeV2;
 binding:Candidate2NativeStorageBindingV1;
 bindingBlob:SnapshotBlob;
 sourceBlobs:SnapshotBlob[];
}
export interface Candidate2NativeStorageScanV1 {
 sessions:number;bindings:number;sourceBlobs:number;typedBlobs:number;
}
declare const nativeReadReceiptBrand:unique symbol;
/** Opaque, module-issued byte reuse within one Store-owned operation. This never
 * supplies generation/write authority or substitutes for installed replay. */
export interface Candidate2NativeReadReceiptV1 {readonly [nativeReadReceiptBrand]:true;}
export interface Candidate2NativeOwnershipV1 {
 readonly sourceRefs:readonly Readonly<Candidate2AdoptionSourceRefV1>[];
 readonly bindingRef:Readonly<Pick<SnapshotBlob,'sha'|'rawBytes'|'codec'>>;
}
interface NativeFingerprint {
 sha:string;rawBytes:number;codec:typeof SNAPSHOT_CODEC;payloadSha:string;
}
interface NativeReadState {
 database:Database;exec:Database['exec'];attachmentJson:string;mechanicsJson:string;
 refs:Candidate2AdoptionSourceRefV1[];binding:Candidate2NativeStorageBindingV1;
 bindingSha:string;fingerprints:Map<string,NativeFingerprint>;
}
interface NativeClosed {
 envelope:Candidate2AdoptionEnvelopeV2;receipt:Candidate2NativeReadReceiptV1;
 binding:Candidate2NativeStorageBindingV1;refs:Candidate2AdoptionSourceRefV1[];
 witness:Candidate2AdoptionSourceCapsuleV1;
}
const nativeReadReceipts=new WeakMap<object,NativeReadState>();
// Capture the intrinsic methods; replacing WeakMap.prototype cannot mint or
// redirect a byte receipt after this private registry has been created.
const getNativeReadState=WeakMap.prototype.get.bind(nativeReadReceipts) as (key:object)=>NativeReadState|undefined;
const setNativeReadState=WeakMap.prototype.set.bind(nativeReadReceipts) as (key:object,state:NativeReadState)=>unknown;
const invokeNative=Reflect.apply;
const reject=(reason:string):never=>{throw Error('CANDIDATE2_NATIVE_STORAGE_INVALID: '+reason);};
function need(value:unknown,reason:string):asserts value{if(!value)reject(reason);}
const same=(left:unknown,right:unknown)=>canonicalPlainJson(left)===canonicalPlainJson(right);
const equalBytes=(left:Uint8Array,right:Uint8Array)=>Buffer.from(left).equals(Buffer.from(right));
const hash=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);

/** Conservative classification without invoking getters, iterators or Proxy traps.
 * A positive result requires the exact session gate; it is never admission. */
export function hasCandidate2NativeFootprint(raw:unknown):boolean {
 if(raw===null||typeof raw!=='object')return false;
 if(types.isProxy(raw))return true;
 if(Object.getOwnPropertyDescriptor(raw,'candidate2Naming'))return true;
 const id=Object.getOwnPropertyDescriptor(raw,'id');
 return !!id&&Object.hasOwn(id,'value')&&typeof id.value==='string'&&id.value.startsWith('c2s_');
}
function sessionFrom(raw:unknown):Candidate2AdoptedNamingSessionV1 {
 // The bounded archive copier rejects accessors/Proxy/toJSON before serialization.
 const owned=ownAdoptionEnvelopeV2(raw);
 return inspectCandidate2SessionBytes(Buffer.from(JSON.stringify(owned))).session as Candidate2AdoptedNamingSessionV1;
}
function sourceReferences(session:Candidate2AdoptedNamingSessionV1,capsule:Candidate2AdoptionSourceCapsuleV1):Candidate2AdoptionSourceRefV1[] {
 const refs=new Map<string,Candidate2AdoptionSourceRefV1>();
 const add=(ref:Candidate2AdoptionSourceRefV1)=>{
  exactAdoption(ref,['role','sha','rawBytes','codec']);
  need((ref.role==='candidate2-source-capsule'||ref.role==='candidate2-source-chunk')&&hash(ref.sha)&&Number.isSafeInteger(ref.rawBytes)&&ref.rawBytes>0&&ref.rawBytes<=SNAPSHOT_LEAF_MAX_BYTES&&ref.codec===SNAPSHOT_CODEC,'source reference');
  const previous=refs.get(ref.sha);need(!previous||same(previous,ref),'conflicting source reference');
  if(!previous)refs.set(ref.sha,{role:ref.role,sha:ref.sha,rawBytes:ref.rawBytes,codec:ref.codec});
 };
 add(session.candidate2Naming.sourceCapsule);
 // Call only after the complete source decoder validated every per-asset chunk.
 // Identical chunks shared by different assets are intentionally deduplicated.
 for(const asset of capsule.assets)for(const chunk of asset.chunks)add(chunk.blob);
 return [...refs.values()].sort((a,b)=>a.sha<b.sha?-1:a.sha>b.sha?1:0);
}
function bindingFor(session:Candidate2AdoptedNamingSessionV1,sourceRefs:Candidate2AdoptionSourceRefV1[]):Candidate2NativeStorageBindingV1 {
 const attachment=session.candidate2Naming,generation=attachment.generation;
 return {
  schema:'candidate2-native-storage/1',envelopeSchema:'candidate2-adoption-envelope/2',
  sessionBinding:{sessionId:attachment.sessionBinding.sessionId,profileId:attachment.sessionBinding.profileId,createdAt:attachment.sessionBinding.createdAt},
  attachmentDigest:attachment.attachmentDigest,
  mechanics:captureOwnedMechanicsV2({seed:generation.seed,excludeNames:generation.excludeNames}),
  sourceRefs,
 };
}
function bindingLeaf(binding:Candidate2NativeStorageBindingV1):SnapshotBlob {
 const raw=Buffer.from(canonicalPlainJson(binding));need(raw.length>0&&raw.length<=SNAPSHOT_LEAF_MAX_BYTES,'native binding budget');
 return {sha:adoptionHash(raw),rawBytes:raw.length,codec:SNAPSHOT_CODEC,payload:deflateRawSync(raw,{level:6})};
}
function blobFromResults(results:ReturnType<Database['exec']>,sha:string):SnapshotBlob|undefined {
 if(results.length===0)return;
 need(results.length===1&&results[0].values.length===1,'native blob row count');
 const row=results[0].values[0];need(row.length===4&&typeof row[0]==='string'&&row[0]===sha&&typeof row[1]==='number'&&Number.isSafeInteger(row[1])&&row[1]>0&&row[1]<=SNAPSHOT_LEAF_MAX_BYTES&&row[2]===SNAPSHOT_CODEC&&row[3] instanceof Uint8Array,'native blob columns');
 return {sha:row[0],rawBytes:row[1],codec:SNAPSHOT_CODEC,payload:new Uint8Array(row[3])};
}
function nativeBlob(db:Database,sha:string,exec:Database['exec']=db.exec):SnapshotBlob|undefined {
 return blobFromResults(invokeNative(exec,db,['SELECT sha,raw_bytes,codec,payload FROM snapshot_blobs WHERE sha=?',[sha]]) as ReturnType<Database['exec']>,sha);
}
function requiredBlob(db:Database,ref:Pick<SnapshotBlob,'sha'|'rawBytes'|'codec'>):SnapshotBlob {
 const blob=nativeBlob(db,ref.sha);need(blob&&blob.rawBytes===ref.rawBytes&&blob.codec===ref.codec,'missing or mismatched native blob');return blob;
}
function assertIdenticalBlob(actual:SnapshotBlob,expected:SnapshotBlob):void {
 need(actual.sha===expected.sha&&actual.rawBytes===expected.rawBytes&&actual.codec===expected.codec&&equalBytes(actual.payload,expected.payload),'immutable native blob differs');
}
function fingerprint(blob:SnapshotBlob):NativeFingerprint {
 return {sha:blob.sha,rawBytes:blob.rawBytes,codec:blob.codec,payloadSha:adoptionHash(blob.payload)};
}
function assertFingerprint(blob:SnapshotBlob,expected:NativeFingerprint):void {
 need(blob.sha===expected.sha&&blob.rawBytes===expected.rawBytes&&blob.codec===expected.codec&&adoptionHash(blob.payload)===expected.payloadSha,'native source fingerprint changed');
}
function assertReceiptState(db:Database,session:Candidate2AdoptedNamingSessionV1,state:NativeReadState):void {
 need(db===state.database&&db.exec===state.exec,'native receipt database changed');
 need(canonicalPlainJson(session.candidate2Naming)===state.attachmentJson&&canonicalPlainJson({seed:session.candidate2Naming.generation.seed,excludeNames:session.candidate2Naming.generation.excludeNames})===state.mechanicsJson,'native receipt immutable session changed');
 assertReceiptFingerprints(db,state);
}
function assertReceiptFingerprints(db:Database,state:NativeReadState):void {
 need(db===state.database&&db.exec===state.exec,'native receipt database changed');
 for(const expected of state.fingerprints.values()){
  const blob=nativeBlob(db,expected.sha,state.exec);need(blob,'native receipt source missing');assertFingerprint(blob,expected);
 }
 need(db.exec===state.exec,'native receipt database changed');
}

/** Validate each exact native row once through the unchanged full SQL decoder.
 * The internal reader records the same detached bytes it returns to that decoder;
 * a later reread is never used to invent the receipt's initial fingerprints. */
function readClosed(db:Database,session:Candidate2AdoptedNamingSessionV1):NativeClosed {
 const exec=db.exec,validated=new Map<string,SnapshotBlob>();let bytes=0;
 const reader={exec(sql:string,parameters:SqlValue[]){
  need(sql==='SELECT sha,raw_bytes,codec,payload FROM snapshot_blobs WHERE sha=?'&&Array.isArray(parameters)&&parameters.length===1&&typeof parameters[0]==='string','native closure query');
  const sha=parameters[0],results=invokeNative(exec,db,[sql,parameters]) as ReturnType<Database['exec']>,blob=blobFromResults(results,sha);
  need(blob,'missing or mismatched native blob');
  need(blob.payload.length>0&&blob.payload.length<=SNAPSHOT_LEAF_MAX_BYTES+65536,'source compressed leaf budget');
  const previous=validated.get(sha);if(previous)assertIdenticalBlob(blob,previous);else{
   validated.set(sha,blob);bytes+=blob.rawBytes;need(validated.size<=100000&&Number.isSafeInteger(bytes)&&bytes<=2*1024**3,'source closure budget');
  }
  return [{columns:['sha','raw_bytes','codec','payload'],values:[[blob.sha,blob.rawBytes,blob.codec,blob.payload]]}];
 }};
 const closed=decodeCandidate2SourceClosureFromSqlDatabase(reader,session),witness=closed.witness as Candidate2AdoptionSourceCapsuleV1;
 const refs=sourceReferences(session,witness),capsule=session.candidate2Naming.sourceCapsule,capsuleJson=canonicalPlainJson(witness);
 // The SQL decoder authenticates the capsule's raw SHA; hashing its parsed
 // canonical form proves canonical capsule JSON without inflating it again.
 need(adoptionHash(capsuleJson)===capsule.sha&&Buffer.byteLength(capsuleJson)===capsule.rawBytes,'noncanonical native source capsule');
 need(refs.length===validated.size,'native source closure differs');
 const binding=bindingFor(session,refs),expected=bindingLeaf(binding),stored=nativeBlob(db,expected.sha,exec);
 need(stored&&stored.rawBytes===expected.rawBytes&&stored.codec===expected.codec,'missing or mismatched native blob');assertIdenticalBlob(stored,expected);
 // Exact compressed equality with the freshly encoded canonical binding proves
 // its byte/JSON identity. No second inflate is needed for this leaf either.
 const sourceBlobs=refs.map(ref=>{
  const blob=validated.get(ref.sha);need(blob&&blob.rawBytes===ref.rawBytes&&blob.codec===ref.codec,'native source reference differs');
  return {sha:blob.sha,rawBytes:blob.rawBytes,codec:blob.codec,payloadBase64:Buffer.from(blob.payload).toString('base64')};
 });
 const envelope=ownAdoptionEnvelopeV2({schema:'candidate2-adoption-envelope/2',session,mechanics:binding.mechanics,sourceBlobs,generationAuthority:false,storage:'not-connected'});
 const fingerprints=new Map([...validated.values(),stored].map(blob=>[blob.sha,fingerprint(blob)]));
 const state:NativeReadState={database:db,exec,attachmentJson:canonicalPlainJson(session.candidate2Naming),mechanicsJson:canonicalPlainJson(binding.mechanics),refs,binding,bindingSha:stored.sha,fingerprints};
 assertReceiptFingerprints(db,state);
 const receipt=Object.freeze({}) as Candidate2NativeReadReceiptV1;setNativeReadState(receipt,state);
 return {envelope,receipt,binding,refs,witness};
}

export function encodeCandidate2NativeStorageV1(rawEnvelope:unknown):EncodedCandidate2NativeStorageV1 {
 const envelope=ownAdoptionEnvelopeV2(rawEnvelope);
 exactAdoption(envelope,['schema','session','sourceBlobs','generationAuthority','storage','mechanics']);
 need(envelope.schema==='candidate2-adoption-envelope/2'&&envelope.generationAuthority===false&&envelope.storage==='not-connected','exact v2 envelope required');
 const session=sessionFrom(envelope.session),mechanics=captureOwnedMechanicsV2(envelope.mechanics);
 need(same(mechanics,{seed:session.candidate2Naming.generation.seed,excludeNames:session.candidate2Naming.generation.excludeNames}),'recorded mechanics differ');
 const closed=decodeAdoptionSourcesV2(envelope),sourceRefs=sourceReferences(session,closed.capsule);
 const binding=bindingFor(session,sourceRefs),bindingBlob=bindingLeaf(binding);
 // Both formats use deflate-raw/1. Preserve the exact captured compressed bytes.
 const sourceBlobs=envelope.sourceBlobs.map(row=>({sha:row.sha,rawBytes:row.rawBytes,codec:row.codec,payload:new Uint8Array(Buffer.from(row.payloadBase64,'base64'))}));
 return {envelope,binding,bindingBlob,sourceBlobs};
}

/** Caller owns the surrounding native Store transaction and rollback. All existing
 * rows are checked before inserting any row; equivalent recompression is a conflict. */
export function insertCandidate2NativeStorageV1(db:Database,encoded:EncodedCandidate2NativeStorageV1):void {
 need(!!encoded&&typeof encoded==='object'&&!types.isProxy(encoded),'encoded storage');
 const descriptor=Object.getOwnPropertyDescriptor(encoded,'envelope');need(descriptor&&Object.hasOwn(descriptor,'value'),'encoded envelope data');
 // Encoded helper objects are not capabilities. Revalidate their owned envelope.
 const verified=encodeCandidate2NativeStorageV1(descriptor.value),blobs=[...verified.sourceBlobs,verified.bindingBlob];
 const absent:SnapshotBlob[]=[];
 for(const blob of blobs){const previous=nativeBlob(db,blob.sha);if(previous)assertIdenticalBlob(previous,blob);else absent.push(blob);}
 for(const blob of absent)db.run('INSERT INTO snapshot_blobs(sha,raw_bytes,codec,payload) VALUES(?,?,?,?)',[blob.sha,blob.rawBytes,blob.codec,blob.payload]);
 for(const blob of blobs)assertIdenticalBlob(requiredBlob(db,blob),blob);
 // Fixed M873 SQL closure checks are required in addition to generic leaf JSON.
 const closed=decodeCandidate2SourceClosureFromSqlDatabase(db,verified.envelope.session);
 need(same(sourceReferences(verified.envelope.session,closed.witness as Candidate2AdoptionSourceCapsuleV1),verified.binding.sourceRefs),'native source closure differs');
}

export function readCandidate2NativeClosedV1(db:Database,rawSession:unknown):{envelope:Candidate2AdoptionEnvelopeV2;receipt:Candidate2NativeReadReceiptV1} {
 const {envelope,receipt}=readClosed(db,sessionFrom(rawSession));return {envelope,receipt};
}
export function assertCandidate2NativeReadReceiptV1(db:Database,rawSession:unknown,receipt:Candidate2NativeReadReceiptV1):void {
 need(receipt!==null&&typeof receipt==='object'&&!types.isProxy(receipt),'native read receipt required');
 const state=getNativeReadState(receipt);need(state,'unknown native read receipt');assertReceiptState(db,sessionFrom(rawSession),state);
}
/** Point-checked ownership data for a Store-owned lifecycle decision. The receipt
 * must already belong to the fixed-owner replay scope; this helper supplies no
 * deletion/adoption authority and never performs another source decode. */
export function getCandidate2NativeOwnershipV1(db:Database,rawSession:unknown,receipt:Candidate2NativeReadReceiptV1):Candidate2NativeOwnershipV1 {
 need(receipt!==null&&typeof receipt==='object'&&!types.isProxy(receipt),'native read receipt required');
 const state=getNativeReadState(receipt);need(state,'unknown native read receipt');assertReceiptState(db,sessionFrom(rawSession),state);
 const binding=state.fingerprints.get(state.bindingSha);need(binding,'native binding fingerprint missing');
 const sourceRefs=Object.freeze(state.refs.map(ref=>Object.freeze({role:ref.role,sha:ref.sha,rawBytes:ref.rawBytes,codec:ref.codec})));
 const bindingRef=Object.freeze({sha:binding.sha,rawBytes:binding.rawBytes,codec:binding.codec});
 return Object.freeze({sourceRefs,bindingRef});
}
export function readCandidate2NativeEnvelopeV1(db:Database,rawSession:unknown):Candidate2AdoptionEnvelopeV2 {
 return readCandidate2NativeClosedV1(db,rawSession).envelope;
}

/** Whole-database C2 gate. The Store passes every current/history session read
 * from the same authenticated SQL operation. Generic non-C2 orphan behavior stays
 * unchanged; every C2 typed leaf must belong to an exact validated session closure. */
export function assertCandidate2NativeStorageV1(db:Database,sessions:readonly unknown[]):Candidate2NativeStorageScanV1 {
 need(Array.isArray(sessions),'session scan input');
 const references=new Map<string,Candidate2AdoptionSourceRefV1>(),bindings=new Set<string>(),identities=new Map<string,string>();let count=0;
 // Local invocation only: review/history rows sharing the immutable attachment
 // still pass strict per-row structure. The same operation seals native bytes.
 const checkedAttachments=new Map<string,NativeReadState>();
 const knownFingerprints=new Map<string,NativeFingerprint>();
 for(const raw of sessions){
  if(!hasCandidate2NativeFootprint(raw))continue;
  const session=sessionFrom(raw),attachmentJson=canonicalPlainJson(session.candidate2Naming);let state=checkedAttachments.get(attachmentJson);
  if(!state){
   const closed=readClosed(db,session);state=getNativeReadState(closed.receipt)!;checkedAttachments.set(attachmentJson,state);
   need(checkedAttachments.size<=50000,'unique C2 root budget');
   for(const expected of state.fingerprints.values()){const old=knownFingerprints.get(expected.sha);need(!old||same(old,expected),'conflicting native source fingerprint');knownFingerprints.set(expected.sha,expected);}
  }
  const previous=identities.get(session.id);need(!previous||previous===state.bindingSha,'current/history immutable C2 identity differs');identities.set(session.id,state.bindingSha);bindings.add(state.bindingSha);count++;
  for(const ref of state.refs){const old=references.get(ref.sha);need(!old||same(old,ref),'conflicting shared source reference');references.set(ref.sha,ref);}
 }
 let typedBlobs=0,total=0,rows=0;
 const statement=db.prepare('SELECT sha,raw_bytes,codec,payload FROM snapshot_blobs');
 try{
  while(statement.step()){
   const row=statement.get() as SqlValue[];need(++rows<=100000&&typeof row[1]==='number'&&Number.isSafeInteger(row[1])&&row[1]>0&&Number.isSafeInteger(total+=row[1])&&total<=2*1024**3,'blob scan budget');
   need(typeof row[0]==='string'&&row[2]===SNAPSHOT_CODEC&&row[3] instanceof Uint8Array,'blob scan row');
   const blob:SnapshotBlob={sha:row[0],rawBytes:row[1],codec:SNAPSHOT_CODEC,payload:row[3]},known=knownFingerprints.get(blob.sha);
   // These exact bytes already passed the complete typed source/binding decoder
   // in this invocation. Unknown rows still get the original strict leaf gate.
   if(known){assertFingerprint(blob,known);typedBlobs++;continue;}
   const value=JSON.parse(decodeSnapshotBlobText(blob)) as unknown;
   if(!value||typeof value!=='object'||Array.isArray(value))continue;
   const schema=(value as Record<string,unknown>).schema;if(typeof schema!=='string'||!schema.startsWith('candidate2-'))continue;
   typedBlobs++;
   if(schema==='candidate2-native-storage/1'){need(bindings.has(blob.sha),'orphan native binding');continue;}
   if(schema==='candidate2-naming-source-capsule/1'||schema==='candidate2-naming-source-chunk/1'){
    const ref=references.get(blob.sha),role=schema==='candidate2-naming-source-capsule/1'?'candidate2-source-capsule':'candidate2-source-chunk';
    need(ref&&ref.role===role&&ref.rawBytes===blob.rawBytes&&ref.codec===blob.codec,'orphan or mismatched C2 source leaf');continue;
   }
   reject('unknown typed C2 schema');
  }
 }finally{statement.free();}
 for(const state of checkedAttachments.values())assertReceiptFingerprints(db,state);
 return {sessions:count,bindings:bindings.size,sourceBlobs:references.size,typedBlobs};
}
