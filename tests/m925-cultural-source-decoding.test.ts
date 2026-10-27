import {describe,expect,it} from 'vitest';
import {deflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import initSqlJs from 'sql.js';
import {culturalCanonicalJson} from '../src/domain/qimen-cultural-comparison-canonical';
import {SOURCE_CHUNK_BYTES,SOURCE_CHUNK_SCHEMA} from '../src/shared/cultural-source-chunks';
import {createCulturalEvidenceCodec,encodeCulturalEvidence,readCulturalSourceChunkBlob} from '../src/main/cultural-source-chunks';
import {SNAPSHOT_CODEC,type SnapshotBlob} from '../src/main/snapshot-blob-codec';

const hash=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
function rawBlob(text:string):SnapshotBlob{
 const raw=Buffer.from(text);return{sha:hash(raw),rawBytes:raw.length,codec:SNAPSHOT_CODEC,payload:deflateRawSync(raw)};
}
function leaf(bytes:Uint8Array,data=Buffer.from(bytes).toString('base64')){
 return{schema:SOURCE_CHUNK_SCHEMA,encoding:'base64',byteLength:bytes.length,sha256:hash(bytes),data};
}
function encoded(value:unknown){return rawBlob(culturalCanonicalJson(value));}

describe('M925 actual cultural source byte decoder equivalence boundaries',()=>{
 it('returns exact arbitrary bytes across all padding classes and a maximum-size leaf',()=>{
  for(const size of [1,2,3,4,5,6,255,256,257,SOURCE_CHUNK_BYTES]){
   const bytes=Buffer.allocUnsafe(size);for(let i=0;i<size;i++)bytes[i]=(i*149+37)%256;
   const decoded=readCulturalSourceChunkBlob(encoded(leaf(bytes)));
   expect(Buffer.from(decoded.bytes).equals(bytes)).toBe(true);
   expect(decoded.chunk.data).toBe(bytes.toString('base64'));expect(Object.isFrozen(decoded.chunk)).toBe(true);
  }
 });
 it('rejects noncanonical base64 even with a correct decoded-byte hash and declared length',()=>{
  const bytes=Buffer.from([255]);
  for(const data of ['_w==','-w==','/w=\n','/w =','/w\t=','/w\r=','/x==','/y==','/z==','==/w','/w===','/w','/w==AAAA','/w＝='])expect(()=>readCulturalSourceChunkBlob(encoded(leaf(bytes,data))),JSON.stringify(data)).toThrow();
  const two=Buffer.from([255,255]);
  for(const data of ['//9=','//+=','///=','__8=','//8\n','//8=='])expect(()=>readCulturalSourceChunkBlob(encoded(leaf(two,data))),JSON.stringify(data)).toThrow();
 });
 it('keeps byte-length type/range bounds and truncated or wrong-length physical leaf rejection',()=>{
  const value=leaf(Buffer.from([1]));
  for(const byteLength of [0,-1,1.5,'1',SOURCE_CHUNK_BYTES+1])expect(()=>readCulturalSourceChunkBlob(encoded({...value,byteLength}))).toThrow();
  const wrongLength=encoded(value);wrongLength.rawBytes++;expect(()=>readCulturalSourceChunkBlob(wrongLength)).toThrow();
  const truncated=encoded(value);truncated.payload=truncated.payload.slice(0,-1);expect(()=>readCulturalSourceChunkBlob(truncated)).toThrow();
  const overBudget=encoded(value);overBudget.rawBytes=8*1024*1024+1;expect(()=>readCulturalSourceChunkBlob(overBudget)).toThrow();
 });
 it('keeps strict duplicate-key, depth, UTF8, canonical JSON, trailing-byte and physical SHA checks',()=>{
  const value=leaf(Buffer.from([255])),text=culturalCanonicalJson(value);
  expect(()=>readCulturalSourceChunkBlob(rawBlob(text.replace('"data":','"data":"/w==","data":')))).toThrow();
  expect(()=>readCulturalSourceChunkBlob(rawBlob(text+'\n'))).toThrow();
  expect(()=>readCulturalSourceChunkBlob(rawBlob(text+'{}'))).toThrow();
  expect(()=>readCulturalSourceChunkBlob(rawBlob('['.repeat(66)+'0'+']'.repeat(66)))).toThrow();
  const utf8=Buffer.concat([Buffer.from(text.slice(0,-1)),Buffer.from([0xff]),Buffer.from('}')]);
  expect(()=>readCulturalSourceChunkBlob({sha:hash(utf8),rawBytes:utf8.length,codec:SNAPSHOT_CODEC,payload:deflateRawSync(utf8)})).toThrow();
  const wrongHash=encoded(value);wrongHash.sha='0'.repeat(64);expect(()=>readCulturalSourceChunkBlob(wrongHash)).toThrow();
  const trailing=encoded(value);trailing.payload=Buffer.concat([trailing.payload,Buffer.from([0])]);expect(()=>readCulturalSourceChunkBlob(trailing)).toThrow();
 });
 it('rejects foreign alphabet and misplaced padding even if Buffer.prototype.toString lies about a canonical roundtrip',()=>{
  const inputs=[{bytes:Buffer.from([255]),data:'_w=='},{bytes:Buffer.from([0]),data:'AA=A'}].map(row=>({...row,blob:encoded(leaf(row.bytes,row.data))}));
  const slot=Object.getOwnPropertyDescriptor(Buffer.prototype,'toString'),original=Buffer.prototype.toString;
  if(!slot)throw Error('Missing original Buffer toString descriptor');
  for(const input of inputs)try{
   Object.defineProperty(Buffer.prototype,'toString',{...slot,value:function(this:Buffer,encoding?:BufferEncoding,start?:number,end?:number){if(encoding==='base64')return input.data;return original.call(this,encoding,start,end);}});
   expect(input.bytes.toString('base64')).toBe(input.data);expect(()=>readCulturalSourceChunkBlob(input.blob)).toThrow();
  }finally{Object.defineProperty(Buffer.prototype,'toString',slot);}
  expect(readCulturalSourceChunkBlob(encoded(leaf(Buffer.from([255])))).chunk.data).toBe('/w==');
 });
 it('observes changed physical input and recovers after failure without retaining a verdict or returned bytes',()=>{
  const first=Buffer.from([0,1,2,3]),second=Buffer.from([4,5,6,7]),blob=encoded(leaf(first));
  const result=readCulturalSourceChunkBlob(blob);result.bytes.fill(99);
  expect(Buffer.from(readCulturalSourceChunkBlob(blob).bytes).equals(first)).toBe(true);
  const broken={...blob,payload:Buffer.from(blob.payload)};broken.payload[0]^=0xff;expect(()=>readCulturalSourceChunkBlob(broken)).toThrow();
  expect(Buffer.from(readCulturalSourceChunkBlob(encoded(leaf(second))).bytes).equals(second)).toBe(true);
  expect(Buffer.from(readCulturalSourceChunkBlob(blob).bytes).equals(first)).toBe(true);
  const counterfeit=leaf(first);counterfeit.sha256=hash(second);expect(()=>readCulturalSourceChunkBlob(encoded(counterfeit))).toThrow();
  expect(Buffer.from(readCulturalSourceChunkBlob(blob).bytes).equals(first)).toBe(true);
 });
 it('re-reads real SQL capsule/chunk tuples and recovers on the same codec after strict JSON rejection',async()=>{
  const SQL=await initSqlJs({locateFile:()=>createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm')}),db=new SQL.Database();
  try{
   db.run('CREATE TABLE snapshot_blobs(sha TEXT PRIMARY KEY,raw_bytes INTEGER,codec TEXT,payload BLOB)');
   const bytes=Buffer.from([0,17,255]),prepared='{}';
   const encodedEvidence=encodeCulturalEvidence({schema:'qimen-cultural-provider-material/1.0.0',providerVersion:'qimen-cultural-provider/1.0.0',ownerProfileId:'codec-only',sourceSessionId:null,sourceRevision:'codec-only',storage:'memory-only',jsons:[{id:'prepared-comparison',schemaId:'codec-boundary-only',codecVersion:'exact-utf8-json/1',sha256:hash(prepared),exactUtf8Json:prepared}],blobs:[{id:'bytes',role:'codec-only',sha256:hash(bytes),byteLength:bytes.length,mediaType:'application/octet-stream'}]},new Map([['bytes',bytes]]));
   const insert=(blob:SnapshotBlob)=>db.run('INSERT INTO snapshot_blobs VALUES(?,?,?,?)',[blob.sha,blob.rawBytes,blob.codec,blob.payload]);
   for(const blob of [encodedEvidence.capsuleBlob,...encodedEvidence.sourceChunks])insert(blob);
   const codec=createCulturalEvidenceCodec(db),capsule=encodedEvidence.capsuleBlob;
   const read=()=>codec.decodeEvidenceFromSql(capsule.sha,capsule.rawBytes);
   const first=read();expect(first.fixedOfflineAuthentication).toBe('required');expect(Buffer.from(first.actualBlobsById.get('bytes')!).equals(bytes)).toBe(true);
   first.actualBlobsById.get('bytes')!.fill(66);expect(Buffer.from(read().actualBlobsById.get('bytes')!).equals(bytes)).toBe(true);
   const chunk=encodedEvidence.sourceChunks[0];db.run('DELETE FROM snapshot_blobs WHERE sha=?',[chunk.sha]);expect(read).toThrow();insert(chunk);expect(Buffer.from(read().actualBlobsById.get('bytes')!).equals(bytes)).toBe(true);
   const canonical=culturalCanonicalJson(encodedEvidence.capsule),duplicate=rawBlob(canonical.replace('"capsuleDigest":','"capsuleDigest":"'+encodedEvidence.capsule.capsuleDigest+'","capsuleDigest":'));
   insert(duplicate);expect(()=>codec.decodeEvidenceFromSql(duplicate.sha,duplicate.rawBytes)).toThrow();
   expect(Buffer.from(read().actualBlobsById.get('bytes')!).equals(bytes)).toBe(true);
   db.run('UPDATE snapshot_blobs SET codec=? WHERE sha=?',['foreign/1',capsule.sha]);expect(read).toThrow();db.run('UPDATE snapshot_blobs SET codec=? WHERE sha=?',[SNAPSHOT_CODEC,capsule.sha]);expect(read().materialDigest).toBe(encodedEvidence.capsule.materialDigest);
  }finally{db.close();}
 });
});
