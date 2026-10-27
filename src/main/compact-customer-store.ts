import type {Database,SqlJsStatic,SqlValue} from 'sql.js';
import {createCustomerDatabase,configureCustomerDatabaseConnection,assertCustomerDatabaseForeignKeys} from './customer-database-connection';
import {assertRawCustomerSchema} from './raw-customer-schema';
export {assertRawCustomerSchema};
import {encodeSnapshot,decodeSnapshotDetailed,validateSnapshotBlob,parseSnapshotRootManifest,SnapshotBlob,SnapshotRoot,EncodedSnapshot,SNAPSHOT_CODEC,snapshotSha} from './snapshot-blob-codec';
import {compactBaseDefinitions,compactSchemaDefinitions,compactCustomerCapabilities,COMPACT_CUSTOMER_VERSION,LEGACY_COMPACT_CUSTOMER_VERSION,CULTURAL_COMPACT_CUSTOMER_VERSION,type CompactCustomerVersion} from './compact-customer-schema';
import {readCustomerRevisionSequence,preserveCustomerRevisionSequence} from './customer-revision-sequence';
import {assertCompactCulturalSemanticsV1,type CompactCulturalScanOptions,type CompactCulturalScanResult} from './compact-cultural-semantics';
export {COMPACT_CUSTOMER_VERSION,LEGACY_COMPACT_CUSTOMER_VERSION,CULTURAL_COMPACT_CUSTOMER_VERSION,compactCustomerCapabilities};
export type {CompactCustomerVersion,CompactCustomerCapabilities} from './compact-customer-schema';
export const CUSTOMER_DATABASE_MAX_BYTES=200*1024*1024-4096;
export const CUSTOMER_DATABASE_WARNING_BYTES=160*1024*1024;
const MAX_ROOTS=50000,MAX_LOGICAL_BYTES=8*1024*1024*1024;
const normalize=(sql:string)=>sql.trim().replace(/;$/,'');
export function* customerRows(db:Database,sql:string,parameters:SqlValue[]=[]):Generator<SqlValue[]>{const stmt=db.prepare(sql);try{stmt.bind(parameters);while(stmt.step())yield stmt.get();}finally{stmt.free();}}
const one=(db:Database,sql:string,args:SqlValue[]=[])=>{const stmt=db.prepare(sql);try{stmt.bind(args);return stmt.step()?stmt.get():undefined;}finally{stmt.free();}};
const decodeCounts=new WeakMap<Database,{snapshots:number;rawBytes:number}>();
type ByteIdentity={rawBytes:number;codec:string;payloadSha:string};
type RootReference={position:number;sha:string;key:'analysis'|'sourceSnapshot';rawBytes:number};
type VerifiedRoot=ByteIdentity&{manifestBytes:number;manifestSha:string;id:unknown;profileId:unknown;refs:RootReference[]};
const currentCommitReads=new WeakMap<Database,{roots:Map<string,VerifiedRoot>;blobs:Map<string,ByteIdentity>}>();
export function compactDecodeCounters(db:Database){return{...(decodeCounts.get(db)??{snapshots:0,rawBytes:0})};}
export function isCompactCustomerDatabase(db:Database):boolean{return !!one(db,"SELECT name FROM sqlite_master WHERE type='table' AND name='compact_meta'");}
export function compactCustomerVersion(db:Database):string|undefined{
 if(!isCompactCustomerDatabase(db))return;
 const version=one(db,'SELECT version FROM compact_meta');
 if(!version||version.length!==1||typeof version[0]!=='string'||Number(one(db,'SELECT COUNT(*) FROM compact_meta')?.[0])!==1)throw new Error('客户存储版本未知或元数据损坏。');
 compactCustomerCapabilities(version[0]);
 return String(version[0]);
}
export function assertCompactCustomerSchema(db:Database){
 const version=compactCustomerVersion(db);if(!version)throw new Error('缺少客户压缩存储版本。');
 const capabilities=compactCustomerCapabilities(version),definitions=[...compactBaseDefinitions,...compactSchemaDefinitions(version)];
 const expected=new Map(definitions.map(sql=>{const [,kind,name]=/^CREATE (TABLE|VIEW|INDEX|TRIGGER) (\w+)/.exec(sql)!,type=kind.toLowerCase(),owner=type==='table'||type==='view'?name:/\bON (\w+)/.exec(sql)![1];return[type+'\0'+name,{sql,owner}];}));
 // SQLite owns these implicit PK/UNIQUE indexes; permit only the exact version's identities.
 const autoIndexes=new Map(['profiles','settings','profile_versions','compact_meta','snapshot_roots'].map(table=>['sqlite_autoindex_'+table+'_1',table]));
 for(const [table,count]of [['knowledge_archives',2],['snapshot_blobs',capabilities.hasRootLeafRefs?2:1],['session_records',capabilities.hasRevisionProfileId?2:1],['root_leaf_refs',capabilities.hasRootLeafRefs?2:0],['cultural_comparisons',capabilities.hasCulturalComparisons?2:0],['cultural_comparison_revisions',capabilities.hasCulturalComparisons?2:0],['cultural_write_receipts',capabilities.hasCulturalComparisons?1:0]] as const)for(let i=1;i<=count;i++)autoIndexes.set('sqlite_autoindex_'+table+'_'+i,table);
 let sequence=false;
 for(const [kind,name,owner,sql]of customerRows(db,'SELECT type,name,tbl_name,sql FROM sqlite_master')){
  const key=String(kind)+'\0'+String(name),definition=expected.get(key);
  if(definition){if(owner!==definition.owner||typeof sql!=='string'||normalize(sql)!==normalize(definition.sql))throw new Error('客户压缩存储结构被修改：'+String(name));expected.delete(key);continue;}
  if(kind==='table'&&name==='sqlite_sequence'&&owner==='sqlite_sequence'&&sql==='CREATE TABLE sqlite_sequence(name,seq)'&&!sequence){sequence=true;continue;}
  if(kind==='index'&&sql===null&&autoIndexes.get(String(name))===owner){autoIndexes.delete(String(name));continue;}
  throw new Error('客户压缩库含未知结构，未忽略或删除：'+String(kind)+'/'+String(name));
 }
 if(expected.size||autoIndexes.size||!sequence)throw new Error('客户压缩存储结构不完整。');
}
function rootFromRow(row:SqlValue[]):SnapshotRoot{return{sha:String(row[0]),rawBytes:Number(row[1]),manifestBytes:Number(row[2]),manifestSha:String(row[3]),codec:row[4] as typeof SNAPSHOT_CODEC,payload:row[5] as Uint8Array};}
function readBlob(db:Database,sha:string):SnapshotBlob{const leaf=one(db,'SELECT sha,raw_bytes,codec,payload FROM snapshot_blobs WHERE sha=?',[sha]);if(!leaf)throw new Error('客户快照blob缺失。');return{sha:String(leaf[0]),rawBytes:Number(leaf[1]),codec:leaf[2] as typeof SNAPSHOT_CODEC,payload:leaf[3] as Uint8Array};}
function assertRootReferences(db:Database,sha:string,refs:RootReference[]){
 if(!compactCustomerCapabilities(compactCustomerVersion(db)!).hasRootLeafRefs)return;
 const rows=[...customerRows(db,'SELECT position,role,blob_sha,raw_bytes FROM root_leaf_refs WHERE root_sha=? ORDER BY position',[sha])];
 if(rows.length!==refs.length||refs.some((ref,i)=>{const row=rows[i];return row[0]!==ref.position||row[1]!==ref.key||row[2]!==ref.sha||row[3]!==ref.rawBytes;}))throw new Error('客户快照显式引用边与清单不一致。');
}
function assertForeignKeyIntegrity(db:Database){if(one(db,'PRAGMA foreign_key_check'))throw new Error('客户压缩库外键引用不一致。');}
/** Retain exact existing compressed objects; only one row's encoded buffers are held at a time. */
function encodeForCustomerDatabase(db:Database,raw:string,result:EncodedSnapshot=encodeSnapshot(raw)){
 const prior=one(db,'SELECT sha,raw_bytes,manifest_bytes,manifest_sha,codec,payload FROM snapshot_roots WHERE sha=?',[result.root.sha]);
 if(!prior)return result;
 const root=rootFromRow(prior),{text,refs}=decodeSnapshotDetailed(root,key=>readBlob(db,key));
 if(text!==raw)throw new Error('既有快照与原文不一致。');
 assertRootReferences(db,root.sha,refs);
 return{root,blobs:[...new Set(refs.map(ref=>ref.sha))].map(key=>readBlob(db,key))};
}
/** Migration avoids repeated large JSON/base64 values crossing SQL UDF boundaries.
 * Physical FK, conflict, materialization, edge and identity triggers remain active. */
function createRawMigrationWriter(db:Database){
 let lastRaw:string|undefined,lastEncoding:EncodedSnapshot|undefined;
 return(raw:string):string=>{
  const encoding=raw===lastRaw?lastEncoding!:encodeSnapshot(raw);
  // Only pure codec output is reused. Existing stored bytes/edges are read and rechecked on every row.
  const retainedBytes=raw.length*2+encoding.root.payload.byteLength+encoding.blobs.reduce((total,blob)=>total+blob.payload.byteLength,0);
  if(retainedBytes<=64*1024*1024){lastRaw=raw;lastEncoding=encoding;}else{lastRaw=undefined;lastEncoding=undefined;}
  const {root,blobs}=encodeForCustomerDatabase(db,raw,encoding);
  for(const blob of blobs)db.run('INSERT OR IGNORE INTO snapshot_blobs VALUES(?,?,?,?)',[blob.sha,blob.rawBytes,blob.codec,blob.payload]);
  db.run('INSERT OR IGNORE INTO snapshot_roots VALUES(?,?,?,?,?,?)',[root.sha,root.rawBytes,root.manifestBytes,root.manifestSha,root.codec,root.payload]);
  return root.sha;
 };
}
/** Register functions before preparing any logical view. No decoded snapshot or validation result is cached. */
export function bindCompactCustomerDatabase(db:Database){
 configureCustomerDatabaseConnection(db,()=>bindCompactCustomerDatabase(db));
 let encodedRaw:string|undefined,encodedResult:string|undefined;
 db.create_function('compact_encode',(raw:unknown)=>{if(typeof raw!=='string')throw new Error('客户快照必须为原始JSON文字。');if(raw===encodedRaw)return encodedResult!;const result=encodeForCustomerDatabase(db,raw),serialize=(blob:SnapshotBlob)=>({...blob,payload:Buffer.from(blob.payload).toString('base64')}),encoded=JSON.stringify({root:serialize(result.root),blobs:result.blobs.map(serialize)});if((raw.length+encoded.length)*2<=64*1024*1024){encodedResult=encoded;encodedRaw=raw;}else{encodedRaw=undefined;encodedResult=undefined;}return encoded;});
 db.create_function('compact_unbase64',(text:unknown)=>{if(typeof text!=='string'||text.length>Math.ceil((32*1024*1024+65536)/3)*4||text.length%4!==0)throw new Error('客户压缩数据编码无效。');const bytes=Buffer.from(text,'base64');if(bytes.toString('base64')!==text)throw new Error('客户压缩数据编码或填充无效。');return new Uint8Array(bytes);});
 const manifestRefs=(args:SqlValue[])=>parseSnapshotRootManifest(rootFromRow(args)).refs;
 db.create_function('compact_manifest_refs',(sha:SqlValue,raw:SqlValue,manifest:SqlValue,manifestSha:SqlValue,codec:SqlValue,payload:SqlValue)=>JSON.stringify(manifestRefs([sha,raw,manifest,manifestSha,codec,payload])));
 db.create_function('compact_materialized_refs',(sha:SqlValue,raw:SqlValue,manifest:SqlValue,manifestSha:SqlValue,codec:SqlValue,payload:SqlValue)=>{const args=[sha,raw,manifest,manifestSha,codec,payload],root=rootFromRow(args);return JSON.stringify(decodeSnapshotDetailed(root,key=>readBlob(db,key)).refs);});
 db.create_function('compact_json',(sha:unknown)=>{
  if(typeof sha!=='string'||! /^[a-f0-9]{64}$/.test(sha))throw new Error('客户快照引用无效。');
  const row=one(db,'SELECT sha,raw_bytes,manifest_bytes,manifest_sha,codec,payload FROM snapshot_roots WHERE sha=?',[sha]);if(!row)throw new Error('客户快照根缺失。');
  const root=rootFromRow(row),readLeaves:SnapshotBlob[]=[];
  const {text,refs}=decodeSnapshotDetailed(root,key=>{const value=readBlob(db,key);readLeaves.push(value);return value;});assertRootReferences(db,root.sha,refs);
  const stats=decodeCounts.get(db)??{snapshots:0,rawBytes:0};stats.snapshots++;stats.rawBytes+=root.rawBytes;decodeCounts.set(db,stats);
  const coverage=currentCommitReads.get(db);if(coverage){const identity=JSON.parse(text),id=typeof identity.id==='string'&&identity.id.length>0&&identity.id.length<=1000?identity.id:undefined,profileId=typeof identity.profileId==='string'&&identity.profileId.length>0&&identity.profileId.length<=300?identity.profileId:undefined;coverage.roots.set(root.sha,{rawBytes:root.rawBytes,manifestBytes:root.manifestBytes,manifestSha:root.manifestSha,codec:root.codec,payloadSha:snapshotSha(root.payload),id,profileId,refs});for(const leaf of readLeaves)coverage.blobs.set(leaf.sha,{rawBytes:leaf.rawBytes,codec:leaf.codec,payloadSha:snapshotSha(leaf.payload)});}
  return text;
 });

}
export function createCompactCustomerDatabase(SQL:SqlJsStatic,version:CompactCustomerVersion=COMPACT_CUSTOMER_VERSION):Database{const definitions=compactSchemaDefinitions(version),db=createCustomerDatabase(SQL);try{for(const definition of [...compactBaseDefinitions,...definitions])db.run(definition);db.run('INSERT INTO compact_meta VALUES(?)',[version]);bindCompactCustomerDatabase(db);return db;}catch(error){db.close();throw error;}}
export function writeCompactSession(db:Database,id:string,json:string){const exists=one(db,'SELECT id FROM session_records WHERE id=?',[id]);if(exists)db.run('UPDATE sessions SET json=? WHERE id=?',[json,id]);else db.run('INSERT INTO sessions(id,json) VALUES(?,?)',[id,json]);}
/** Mapping is valid only after the exact physical table/view/trigger definitions have been checked. */
export function compactLogicalTableInfo(db:Database,table:string):SqlValue[][]|undefined{
 if(!isCompactCustomerDatabase(db)||!['sessions','revisions'].includes(table))return;assertCompactCustomerSchema(db);return table==='sessions'?[[0,'id','TEXT',0,null,1],[1,'json','TEXT',1,null,0]]:[[0,'id','INTEGER',0,null,1],[1,'session_id','TEXT',0,null,0],[2,'created_at','TEXT',0,null,0],[3,'json','TEXT',0,null,0]];
}
/** Foundation gate: populated culture requires the fixed typed semantic validator.
 * Schema/FK/JSON integrity alone never authenticates cultural evidence. */
function assertCompactCulturalSemantics(db:Database,options:CompactCulturalScanOptions={}):CompactCulturalScanResult{
 if(!compactCustomerCapabilities(compactCustomerVersion(db)!).hasCulturalComparisons)return{revisionCount:0,logicalBytes:0};
 return assertCompactCulturalSemanticsV1(db,options);
}
export function validateCompactCustomerStorage(db:Database,options:Pick<CompactCulturalScanOptions,'signal'|'maxElapsedMs'|'sourceReplayOperation'>={}){
 const started=performance.now(),maxElapsedMs=options.maxElapsedMs??60000;if(!Number.isSafeInteger(maxElapsedMs)||maxElapsedMs<1||maxElapsedMs>60000)throw new Error('客户存储扫描预算无效。');const budget=()=>{if(options.signal?.aborted||performance.now()-started>maxElapsedMs)throw new Error('客户存储完整性扫描已取消或超过60秒预算，未写入。');};budget();
 assertCustomerDatabaseForeignKeys(db);assertCompactCustomerSchema(db);assertForeignKeyIntegrity(db);readCustomerRevisionSequence(db);const cultural=assertCompactCulturalSemantics(db,{...options,startedAt:started,maxElapsedMs});budget();if(one(db,'PRAGMA integrity_check')?.[0]!=='ok')throw new Error('客户压缩库完整性失败。');const roots=Number(one(db,'SELECT COUNT(*) FROM snapshot_roots')?.[0]);if(!Number.isSafeInteger(roots)||roots+cultural.revisionCount>MAX_ROOTS)throw new Error('客户快照数量超过明确限制。');let total=cultural.logicalBytes;
 let uniqueBlobBytes=0,blobCount=0;for(const [sha,length,codec,payload]of customerRows(db,'SELECT sha,raw_bytes,codec,payload FROM snapshot_blobs')){budget();uniqueBlobBytes+=Number(length);if(++blobCount>MAX_ROOTS*2||!Number.isSafeInteger(uniqueBlobBytes)||uniqueBlobBytes>2*1024*1024*1024)throw new Error('不可变字段数量或累计预算超出限制。');validateSnapshotBlob({sha:String(sha),rawBytes:Number(length),codec:codec as typeof SNAPSHOT_CODEC,payload:payload as Uint8Array});}
 type Projection={sha:string;rawBytes:number;manifestBytes:number;manifestSha:string;codec:string;payloadSha:string;refs:RootReference[];leaves:(ByteIdentity&{sha:string})[];id?:string;profileId?:string};
 const projections=new Map<string,Projection>();
 const recheckProjection=(projection:Projection)=>{const row=one(db,'SELECT sha,raw_bytes,manifest_bytes,manifest_sha,codec,payload FROM snapshot_roots WHERE sha=?',[projection.sha]);if(!row||Number(row[1])!==projection.rawBytes||Number(row[2])!==projection.manifestBytes||String(row[3])!==projection.manifestSha||String(row[4])!==projection.codec||snapshotSha(row[5] as Uint8Array)!==projection.payloadSha)throw new Error('客户快照根物理身份在同次校验中改变。');const root=rootFromRow(row);assertRootReferences(db,root.sha,projection.refs);for(const leaf of projection.leaves){const current=readBlob(db,leaf.sha);if(current.rawBytes!==leaf.rawBytes||current.codec!==leaf.codec||snapshotSha(current.payload)!==leaf.payloadSha)throw new Error('客户快照叶子物理身份在同次校验中改变。');}};
 for(const [sha,length,manifestBytes,manifestSha,codec,payload]of customerRows(db,'SELECT sha,raw_bytes,manifest_bytes,manifest_sha,codec,payload FROM snapshot_roots')){budget();total+=Number(length);if(!Number.isSafeInteger(total)||total>MAX_LOGICAL_BYTES)throw new Error('客户快照逻辑字节总量超过8GiB验证预算。');const raw=one(db,'SELECT compact_json(?)',[sha])?.[0],value=JSON.parse(String(raw)),root=rootFromRow([sha,length,manifestBytes,manifestSha,codec,payload]),refs=compactCustomerCapabilities(compactCustomerVersion(db)!).hasRootLeafRefs?[...customerRows(db,'SELECT position,role,blob_sha,raw_bytes FROM root_leaf_refs WHERE root_sha=? ORDER BY position',[String(sha)])].map(row=>({position:Number(row[0]),key:row[1] as RootReference['key'],sha:String(row[2]),rawBytes:Number(row[3])})):parseSnapshotRootManifest(root).refs,leaves=refs.map(ref=>{const leaf=readBlob(db,ref.sha);return{sha:leaf.sha,rawBytes:leaf.rawBytes,codec:leaf.codec,payloadSha:snapshotSha(leaf.payload)}});projections.set(String(sha),{sha:String(sha),rawBytes:root.rawBytes,manifestBytes:root.manifestBytes,manifestSha:root.manifestSha,codec:root.codec,payloadSha:snapshotSha(root.payload),refs,leaves,id:typeof value?.id==='string'?value.id:undefined,profileId:typeof value?.profileId==='string'?value.profileId:undefined});}
 for(const [id,profile,sha]of customerRows(db,'SELECT id,profile_id,snapshot_sha FROM session_records')){budget();const projection=projections.get(String(sha));if(projection)recheckProjection(projection);const value=projection??{id:undefined,profileId:undefined};if(typeof id!=='string'||!id||value.id!==id||typeof profile!=='string'||!profile||value.profileId!==profile)throw new Error('压缩方案索引与原始JSON身份不一致。');}
 for(const [id,sessionId,createdAt,sha]of customerRows(db,'SELECT id,session_id,created_at,snapshot_sha FROM revision_records')){budget();const projection=projections.get(String(sha));if(projection)recheckProjection(projection);const value=projection??{id:undefined,profileId:undefined},current=one(db,'SELECT profile_id FROM session_records WHERE id=?',[sessionId]);if(!Number.isSafeInteger(id)||Number(id)<1||typeof sessionId!=='string'||value.id!==sessionId||typeof createdAt!=='string'||!Number.isFinite(Date.parse(createdAt))||!current||value.profileId!==current[0])throw new Error('压缩历史行关联不一致。');}
}
/** Migrate only known customer tables, preserving exact json strings, row ordering and revision IDs. */
export function migrateRawCustomerDatabase(SQL:SqlJsStatic,raw:Database,targetVersion:CompactCustomerVersion=COMPACT_CUSTOMER_VERSION):Database{
 const targetCapabilities=compactCustomerCapabilities(targetVersion);if(!targetCapabilities.hasRootLeafRefs)throw new Error('客户迁移目标必须为压缩存储版本2或3。');
 if(isCompactCustomerDatabase(raw))bindCompactCustomerDatabase(raw);else configureCustomerDatabaseConnection(raw);
 if(isCompactCustomerDatabase(raw)){const sourceVersion=compactCustomerVersion(raw)!;if(compactCustomerCapabilities(sourceVersion).hasCulturalComparisons&&!targetCapabilities.hasCulturalComparisons)throw new Error('文化客户库不得降级为旧压缩存储版本。');validateCompactCustomerStorage(raw);if(sourceVersion===targetVersion)return raw;}
 const legacyCompact=isCompactCustomerDatabase(raw);if(!legacyCompact){assertRawCustomerSchema(raw);assertForeignKeyIntegrity(raw);if(one(raw,'PRAGMA integrity_check')?.[0]!=='ok')throw new Error('原始客户库完整性失败。');}const names=legacyCompact?['profiles','sessions','settings','profile_versions','revisions','knowledge_archives']:[...customerRows(raw,"SELECT name FROM sqlite_master WHERE type='table' AND name NOT GLOB 'sqlite_*'")].map(row=>String(row[0]));const result=createCompactCustomerDatabase(SQL,targetVersion);try{result.run('BEGIN');for(const table of ['profiles','settings','profile_versions','knowledge_archives']){if(!names.includes(table))continue;const columns=[...customerRows(raw,`PRAGMA table_info(${table})`)].map(r=>String(r[1]));const expected=table==='knowledge_archives'?['sha256','version','pack']:table==='profile_versions'?['id','token']:['id','json'];if(columns.join(',')!==expected.join(','))throw new Error('迁移表结构无效：'+table);for(const row of customerRows(raw,`SELECT ${expected.join(',')} FROM ${table} ORDER BY rowid`))result.run(`INSERT INTO ${table} VALUES(${row.map(()=>'?').join(',')})`,row);}
 if(legacyCompact)copyCompactSnapshotObjects(raw,result);
 if(legacyCompact){
  for(const row of customerRows(raw,'SELECT id,profile_id,snapshot_sha FROM session_records ORDER BY rowid'))result.run('INSERT INTO session_records(id,profile_id,snapshot_sha) VALUES(?,?,?)',row);
  if(compactCustomerCapabilities(compactCustomerVersion(raw)!).hasRevisionProfileId){for(const row of customerRows(raw,'SELECT id,session_id,profile_id,created_at,snapshot_sha FROM revision_records ORDER BY id'))result.run('INSERT INTO revision_records(id,session_id,profile_id,created_at,snapshot_sha) VALUES(?,?,?,?,?)',row);}
  else for(const [id,sessionId,createdAt,sha]of customerRows(raw,'SELECT id,session_id,created_at,snapshot_sha FROM revision_records ORDER BY id')){const profile=one(raw,'SELECT profile_id FROM session_records WHERE id=?',[sessionId]);if(!profile)throw new Error('旧压缩库历史缺少当前归属。');result.run('INSERT INTO revision_records(id,session_id,profile_id,created_at,snapshot_sha) VALUES(?,?,?,?,?)',[id,sessionId,profile[0],createdAt,sha]);}
 }else{
  const writeRawSnapshot=createRawMigrationWriter(result);
  if(names.includes('sessions'))for(const [id,json]of customerRows(raw,'SELECT id,json FROM sessions ORDER BY rowid')){
   if(typeof json!=='string')throw new Error('迁移方案必须为原始JSON文字。');const sha=writeRawSnapshot(json);
   result.run("INSERT INTO session_records(id,profile_id,snapshot_sha) VALUES(?,json_extract(?,'$.profileId'),?)",[id,json,sha]);
  }
  if(names.includes('revisions'))for(const [id,sessionId,createdAt,json]of customerRows(raw,'SELECT id,session_id,created_at,json FROM revisions ORDER BY id')){
   if(typeof json!=='string')throw new Error('迁移历史必须为原始JSON文字。');const sha=writeRawSnapshot(json);
   result.run("INSERT INTO revision_records(id,session_id,profile_id,created_at,snapshot_sha) VALUES(?,?,json_extract(?,'$.profileId'),?,?)",[id,sessionId,json,createdAt,sha]);
  }
 }
 preserveCustomerRevisionSequence(raw,result);result.run('COMMIT');validateCompactCustomerStorage(result);return result;}catch(error){result.close();throw error;}
}
export function compactCustomerBytes(db:Database,options:Pick<CompactCulturalScanOptions,'sourceReplayOperation'>={}):Uint8Array{validateCompactCustomerStorage(db,options);const bytes=db.export();if(bytes.length>CUSTOMER_DATABASE_MAX_BYTES)throw new Error('客户压缩工作库超过200MiB备份容量预算，原文件未替换。');return bytes;}
/** Run the unchanged Store history/fact guard inside this synchronous scope.
 * Reuse only bytes decoded during that very guard, not a prior validation verdict.
 * Recheck every physical payload fingerprint and every index relation; untouched
 * orphan roots/blobs are decoded normally. Backup/restore still use full scans. */
export function compactCommitBytes(db:Database,verifyExistingHistory:()=>void):Uint8Array{
 const started=performance.now(),budget=()=>{if(performance.now()-started>60000)throw new Error('客户持久化完整性扫描超过60秒预算，未写入。');};budget();
 assertCustomerDatabaseForeignKeys(db);
 if(currentCommitReads.has(db))throw new Error('客户持久化验证不得重入。');const coverage={roots:new Map<string,VerifiedRoot>(),blobs:new Map<string,ByteIdentity>()};currentCommitReads.set(db,coverage);try{verifyExistingHistory();assertCompactCustomerSchema(db);assertForeignKeyIntegrity(db);readCustomerRevisionSequence(db);budget();const cultural=assertCompactCulturalSemantics(db,{startedAt:started,maxElapsedMs:60000});budget();let roots=cultural.revisionCount,logical=cultural.logicalBytes,leaves=0,leafBytes=0;
 for(const [sha,length,manifestLength,manifestSha,codec,payload]of customerRows(db,'SELECT sha,raw_bytes,manifest_bytes,manifest_sha,codec,payload FROM snapshot_roots')){budget();logical+=Number(length);if(++roots>MAX_ROOTS||!Number.isSafeInteger(logical)||logical>MAX_LOGICAL_BYTES)throw new Error('客户快照持久化预算超限。');const old=coverage.roots.get(String(sha));if(!old||old.rawBytes!==length||old.manifestBytes!==manifestLength||old.manifestSha!==manifestSha||old.codec!==codec||!(payload instanceof Uint8Array)||old.payloadSha!==snapshotSha(payload))one(db,'SELECT compact_json(?)',[sha]);else assertRootReferences(db,String(sha),old.refs);}
 for(const [sha,length,codec,payload]of customerRows(db,'SELECT sha,raw_bytes,codec,payload FROM snapshot_blobs')){budget();leafBytes+=Number(length);if(++leaves>MAX_ROOTS*2||!Number.isSafeInteger(leafBytes)||leafBytes>2*1024*1024*1024)throw new Error('不可变字段持久化预算超限。');const old=coverage.blobs.get(String(sha));if(!old||old.rawBytes!==length||old.codec!==codec||!(payload instanceof Uint8Array)||old.payloadSha!==snapshotSha(payload))validateSnapshotBlob({sha:String(sha),rawBytes:Number(length),codec:codec as typeof SNAPSHOT_CODEC,payload:payload as Uint8Array});}
 const profiles=new Map<string,string>();for(const [id,profile,sha]of customerRows(db,'SELECT id,profile_id,snapshot_sha FROM session_records')){budget();const identity=coverage.roots.get(String(sha));if(typeof id!=='string'||!id||typeof profile!=='string'||!profile||identity?.id!==id||identity.profileId!==profile)throw new Error('客户持久化方案索引关联无效。');profiles.set(id,profile);}
 for(const [id,sessionId,created,sha]of customerRows(db,'SELECT id,session_id,created_at,snapshot_sha FROM revision_records')){budget();const identity=coverage.roots.get(String(sha));if(!Number.isSafeInteger(id)||Number(id)<1||typeof sessionId!=='string'||identity?.id!==sessionId||identity.profileId!==profiles.get(sessionId)||typeof created!=='string'||!Number.isFinite(Date.parse(created)))throw new Error('客户持久化历史索引关联无效。');}
 budget();const bytes=db.export();if(bytes.length>CUSTOMER_DATABASE_MAX_BYTES)throw new Error('客户工作库超过200MiB备份容量预算，未写入。');return bytes;
 }finally{currentCommitReads.delete(db);}
}

/** Preserve orphan immutable payloads as well as currently referenced objects; no GC on restore. */
export function copyCompactSnapshotObjects(source:Database,target:Database){
 assertCustomerDatabaseForeignKeys(source);assertCustomerDatabaseForeignKeys(target);
 assertCompactCustomerSchema(source);assertCompactCustomerSchema(target);
 if(compactCustomerCapabilities(compactCustomerVersion(source)!).hasCulturalComparisons&&!compactCustomerCapabilities(compactCustomerVersion(target)!).hasCulturalComparisons)throw new Error('文化客户库不得复制到旧压缩存储版本。');
 for(const row of customerRows(source,'SELECT sha,raw_bytes,codec,payload FROM snapshot_blobs ORDER BY rowid'))target.run('INSERT OR IGNORE INTO snapshot_blobs VALUES(?,?,?,?)',row);
 for(const row of customerRows(source,'SELECT sha,raw_bytes,manifest_bytes,manifest_sha,codec,payload FROM snapshot_roots ORDER BY rowid'))target.run('INSERT OR IGNORE INTO snapshot_roots VALUES(?,?,?,?,?,?)',row);
}
