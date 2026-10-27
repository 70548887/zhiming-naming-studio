import {beforeAll,afterAll,describe,expect,it} from 'vitest';
import {copyFileSync,existsSync,mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {deflateRawSync} from 'node:zlib';
import initSqlJs from 'sql.js';
import {createCandidate2NamingConsumer} from '../src/main/candidate2-naming-consumer-v1';
import {normalizePreferences} from '../src/shared/workflow';
import {readNamingElementMethodSelection} from '../src/shared/project-naming-use';
import {decodeCandidate2SourceClosure,decodeCandidate2SourceClosureFromSqlDatabase,digest,hash,inspectCandidate2SessionBytes} from '../src/main/candidate2-session-contract-v1';

const evidenceRoot='D:/Codex-NamingStudio-Evidence/m873-core-session-contract';
const runRoot=join(evidenceRoot,'runs','run-3');
const fixture=join(runRoot,'persisted-envelope.json');
const sourceDb=join(runRoot,'source-blobs-managed.sqlite');
const wasm=resolve('node_modules/sql.js/dist/sql-wasm.wasm');
let SQL:Awaited<ReturnType<typeof initSqlJs>>;
let tempRoot='';
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
const sealAttachment=(session:any)=>{const {attachmentDigest,...body}=session.candidate2Naming;session.candidate2Naming.attachmentDigest=digest(body);return session;};
const encodeLeaf=(value:unknown)=>{const raw=Buffer.from(JSON.stringify(value),'utf8');return{sha:hash(raw),rawBytes:raw.length,codec:'deflate-raw/1' as const,payload:deflateRawSync(raw,{level:6})};};
const sqlReader=(db:any)=>(sha:string)=>{const rows=db.exec('SELECT sha,raw_bytes,codec,payload FROM snapshot_blobs WHERE sha=?',[sha]);if(!rows.length||!rows[0].values.length)throw Error('missing SQL blob');const row=rows[0].values[0];return{sha:String(row[0]),rawBytes:Number(row[1]),codec:String(row[2]),payload:row[3] as Uint8Array};};

beforeAll(async()=>{
 if(!existsSync(fixture)||!existsSync(sourceDb))throw Error('M873 run-3 managed fixture is required');
 SQL=await initSqlJs({locateFile:()=>wasm});
 tempRoot=mkdtempSync(join(process.env.TEMP??'C:/Windows/Temp','m899-c2-contract-'));
 copyFileSync(sourceDb,join(tempRoot,'source.sqlite'));
},30000);
afterAll(()=>{if(tempRoot)rmSync(tempRoot,{recursive:true,force:true});});

describe('M899 C2 attachment/source witness contract',()=>{
 it('replays complete run-3 capsule/chunks and preserves C2 40 vs old 100 control',()=>{
  const raw=readFileSync(fixture),decoded=inspectCandidate2SessionBytes(raw);
  const session:any=decoded.session;
  expect(session.candidate2Naming.generation.candidates[0].evaluation.traditional).toBe(40);
  expect(JSON.parse(readFileSync(join(runRoot,'legacy-control-session.json'),'utf8')).candidates[0].evaluation.traditional).toBe(100);
  const db=new SQL.Database(readFileSync(join(tempRoot,'source.sqlite')));
  try {
   const closed:any=decodeCandidate2SourceClosureFromSqlDatabase(db,session);
   expect(closed.byteIntegrity).toBe('verified');
   expect(closed.runtimeFromSqlExecutable).toBe(false);
   expect(closed.sourceBytesById.size).toBeGreaterThan(300);
   expect(closed.sourceUniqueBytes).toBeGreaterThan(30_000_000);
   expect(closed.logicalScanBytes).toBeGreaterThan(closed.sourceUniqueBytes);
   expect(closed.witness.applicationRuntime.sha256).toBe('906b191c88ce2e6f0335c674727c39bcae14edf2968d2c1c5cdffcb04079b47a');
   expect(closed.witness.applicationRuntime.byteLength).toBe(2002922);
  } finally {db.close();}
 });

 it('rejects stripped/unknown C2 fields and SQL source tamper after rehash',()=>{
  const original=JSON.parse(readFileSync(fixture,'utf8'));
  const stripped=clone(original);delete stripped.candidate2Naming;
  expect(()=>inspectCandidate2SessionBytes(Buffer.from(JSON.stringify(stripped)))).toThrow('M873_REJECT');
  const unknown=clone(original);unknown.candidate2Naming.extra=true;sealAttachment(unknown);
  expect(()=>inspectCandidate2SessionBytes(Buffer.from(JSON.stringify(unknown)))).toThrow('M873_REJECT');
  const changedScore=clone(original);changedScore.candidates[0].evaluation.traditional=100;sealAttachment(changedScore);
  expect(()=>inspectCandidate2SessionBytes(Buffer.from(JSON.stringify(changedScore)))).toThrow('M873_REJECT');

  const db=new SQL.Database(readFileSync(join(tempRoot,'source.sqlite')));
  try {
   const positive=inspectCandidate2SessionBytes(Buffer.from(JSON.stringify(original)));
   const closed:any=decodeCandidate2SourceClosureFromSqlDatabase(db,positive.session);
   expect(()=>decodeCandidate2SourceClosure({read:sqlReader(db)} as any,positive.session)).toThrow('M873_REJECT:owner-reader');
   const malformedDb={exec:()=>[{values:[['0'.repeat(64),(positive.session as any).candidate2Naming.sourceCapsule.rawBytes,'deflate-raw/1',new Uint8Array([1])]]}]};
   expect(()=>decodeCandidate2SourceClosureFromSqlDatabase(malformedDb as any,positive.session)).toThrow('M873_REJECT:owner-reader-binding');
   const witness:any=clone(closed.witness as any);witness.applicationRuntime.sha256='0'.repeat(64);
   const {witnessDigest,...body}=witness;witness.witnessDigest=digest(body);
   const leaf=encodeLeaf(witness);db.run('INSERT OR REPLACE INTO snapshot_blobs(sha,raw_bytes,codec,payload) VALUES (?,?,?,?)',[leaf.sha,leaf.rawBytes,leaf.codec,leaf.payload]);
   const tampered=clone(original);tampered.candidate2Naming.sourceCapsule={role:'candidate2-source-capsule',sha:leaf.sha,rawBytes:leaf.rawBytes,codec:leaf.codec};tampered.candidate2Naming.sourceWitnessDigest=witness.witnessDigest;sealAttachment(tampered);
   const inspected=inspectCandidate2SessionBytes(Buffer.from(JSON.stringify(tampered)));
   expect(()=>decodeCandidate2SourceClosureFromSqlDatabase(db,inspected.session)).toThrow('M873_REJECT');

   const forgedWitness:any=clone(closed.witness as any);
   forgedWitness.consumerExecution={publicationId:'candidate2-session-consumer-execution/forged',manifestSha256:'1'.repeat(64),fullClosureSha256:'2'.repeat(64),bundleSha256:'3'.repeat(64),bundleBytes:1};
   const {witnessDigest:forgedDigest,...forgedBody}=forgedWitness;forgedWitness.witnessDigest=digest(forgedBody);
   const forgedLeaf=encodeLeaf(forgedWitness);db.run('INSERT OR REPLACE INTO snapshot_blobs(sha,raw_bytes,codec,payload) VALUES (?,?,?,?)',[forgedLeaf.sha,forgedLeaf.rawBytes,forgedLeaf.codec,forgedLeaf.payload]);
   const forged=clone(original);forged.candidate2Naming.sourceCapsule={role:'candidate2-source-capsule',sha:forgedLeaf.sha,rawBytes:forgedLeaf.rawBytes,codec:'deflate-raw/1'};forged.candidate2Naming.sourceWitnessDigest=forgedWitness.witnessDigest;sealAttachment(forged);
   const inspectedForged=inspectCandidate2SessionBytes(Buffer.from(JSON.stringify(forged)));
   expect(()=>decodeCandidate2SourceClosureFromSqlDatabase(db,inspectedForged.session)).toThrow('M873_REJECT:consumer-execution-registry');
  } finally {db.close();}
 });

 it('refuses createSaved on a persisted/clone generation and rejects old 1.3.1 dispatch',()=>{
  const saved=JSON.parse(readFileSync(join(runRoot,'generation.json'),'utf8'));
  const consumer=createCandidate2NamingConsumer({applicationBundlePath:'D:/Codex-NamingStudio-Evidence/m803-core-consumer/evidence/candidate2.cjs',assetDir:resolve('assets'),dataDir:resolve('data'),namingRulesVersion:'naming-editorial-7.1.0'});
  expect(()=>consumer.createSaved(saved)).toThrow('GENERATION_REQUIRED');
  expect(saved.preferences.preferredElements).toEqual([]);
  expect(saved.domainProjection.applied).toEqual(['土','金']);
  const positive=JSON.parse(readFileSync(join(evidenceRoot,'runs','run-3','generation.json'),'utf8'));
  const profile=positive.profile;
  const preferences=normalizePreferences({length:1,requiredChars:'沐',zodiacRules:false,numerology:false});
  const selection=positive.selection;
  const request={profile,preferences,selection,seed:17,excludeNames:[]};
  expect(()=>consumer.generate({...request,preferences:{...preferences,preferredElements:['水']}})).toThrow('CONFLICT');
  expect(()=>consumer.generate({...request,profile:{...profile,timeUnknown:true}})).toThrow();
  const blockedProfile=JSON.parse(readFileSync('tests/fixtures/project-naming-use-m153.json','utf8')).negative.profile;
  expect(()=>consumer.generate({...request,profile:blockedProfile})).toThrow();
  expect(()=>consumer.generate({...request,preferences:{...preferences,numerology:true}})).toThrow('UNSUPPORTED_FEATURE');
  expect(()=>consumer.generate({...request,excludeNames:['沐']})).toThrow('NO_CANDIDATES');
  expect(()=>readNamingElementMethodSelection({...preferences,namingElementMethod:{methodId:'project-bazi-mainchain-145/1.3.2',entryPolicy:'month-branch-only'} as any})).toThrow();
 });
});
