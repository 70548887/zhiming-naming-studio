import {expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import initSqlJs from 'sql.js';
import {decodeCustomerBackup} from '../src/main/customer-backup-envelope';
import {createCulturalEvidenceCodec,encodeCulturalEvidence} from '../src/main/cultural-source-chunks';
import {decodeCulturalRevisionLeaf} from '../src/main/cultural-revision-codec';
import {verifyCulturalSemanticBindings} from '../src/main/cultural-semantic-verifier';
import {prepareCulturalOfflineReplayV1} from '../src/main/qimen-cultural-offline-v1';
import {compareQimenCultural} from '../src/domain/qimen-cultural-comparison';
import {SNAPSHOT_CODEC} from '../src/main/snapshot-blob-codec';
import type {PreparedCulturalCharacter,PreparedCulturalComparisonInput} from '../src/shared/qimen-cultural-comparison';
import type {ProviderMaterial} from '../src/shared/cultural-source-chunks';

const root=process.env.M925_REAL_RESTORE_CASE;
const hash=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
it.skipIf(root===undefined)('M925 actual fixed NSBK still rejects a fully resealed sense forgery after real source admission',async()=>{
 const backup=readFileSync(join(root!,'fixture','synthetic-three-revisions.nsbk'));
 expect(hash(backup)).toBe('c80e8de8521d16580cacfad5721fbcd06b1d2d8797066f3d33a54f3aa4facc26');
 const SQL=await initSqlJs({locateFile:()=>createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm')}),db=new SQL.Database(decodeCustomerBackup(backup).sqlite);
 const scratch=mkdtempSync(join(tmpdir(),'m925-resealed-source-'));let replay:Awaited<ReturnType<typeof prepareCulturalOfflineReplayV1>>|undefined;
 try{
  const row=db.exec('SELECT capsule_sha,capsule_bytes,result_sha,result_bytes FROM cultural_comparison_revisions WHERE revision=1')[0]?.values[0];
  if(!row||typeof row[0]!=='string'||typeof row[1]!=='number'||typeof row[2]!=='string'||typeof row[3]!=='number')throw Error('Exact genuine first revision missing');
  const evidence=createCulturalEvidenceCodec(db).decodeEvidenceFromSql(row[0],row[1]);
  const payload=db.exec('SELECT payload FROM snapshot_blobs WHERE sha=?',[row[2]])[0]?.values[0]?.[0];
  if(!(payload instanceof Uint8Array))throw Error('Actual original result payload required');
  const result=decodeCulturalRevisionLeaf({sha:row[2],rawBytes:row[3],codec:SNAPSHOT_CODEC,payload});
  replay=await prepareCulturalOfflineReplayV1({scratchRoot:scratch});
  const blobs=[...evidence.actualBlobsById].map(([id,bytes])=>({id,bytes}));
  const expectedOwner={profileId:evidence.materialDescriptor.ownerProfileId,sourceSessionId:evidence.materialDescriptor.sourceSessionId};
  expect(replay.verify({material:evidence.materialDescriptor,blobs,expectedSnapshot:result.snapshot,expectedOwner}).kind).toBe('verified-replay');
  const material=structuredClone(evidence.materialDescriptor) as Omit<ProviderMaterial,'jsons'>&{jsons:ProviderMaterial['jsons'][number][]};
  const preparedRow=material.jsons.find(item=>item.id==='prepared-comparison'),occurrenceRow=material.jsons.find(item=>item.id.startsWith('occurrences:'));
  if(!preparedRow||!occurrenceRow)throw Error('Genuine prepared comparison and occurrence material required');
  const prepared=JSON.parse(preparedRow.exactUtf8Json) as PreparedCulturalComparisonInput,occurrences=JSON.parse(occurrenceRow.exactUtf8Json) as PreparedCulturalCharacter[];
  prepared.candidates[0].rows[0].dictionarySense='M925_CALLER_RESEALED_SENSE';occurrences[0].dictionarySense='M925_CALLER_RESEALED_SENSE';
  // Preserve the original key insertion order: this archived chart's legacy
  // JSON.stringify digest is deliberately distinct from canonical JSON.
  for(const [original,value]of [[preparedRow,prepared],[occurrenceRow,occurrences]] as const){const text=JSON.stringify(value),index=material.jsons.findIndex(item=>item.id===original.id);material.jsons[index]={...original,exactUtf8Json:text,sha256:hash(text)};}
  const encoded=encodeCulturalEvidence(material,evidence.actualBlobsById),comparison=compareQimenCultural({...prepared,evidenceCapsuleDigest:encoded.capsule.materialDigest});
  expect(comparison.kind).toBe('result');if(comparison.kind!=='result')throw Error('Resealed forgery must be internally self-consistent');
  const forged={...result,capsuleDigest:encoded.capsule.capsuleDigest,snapshot:comparison.snapshot};
  expect(verifyCulturalSemanticBindings({capsule:encoded.capsule,revision:forged,sourceChunks:encoded.sourceChunks}).verified).toBe(true);
  expect(replay.verify({material,blobs,expectedSnapshot:comparison.snapshot,expectedOwner}).kind).toBe('rejected');
  expect(replay.verify({material:evidence.materialDescriptor,blobs,expectedSnapshot:result.snapshot,expectedOwner}).kind).toBe('verified-replay');
  expect(hash(readFileSync(join(root!,'fixture','synthetic-three-revisions.nsbk')))).toBe(hash(backup));
 }finally{replay?.close();db.close();rmSync(scratch,{recursive:true,force:true});}
},120000);
