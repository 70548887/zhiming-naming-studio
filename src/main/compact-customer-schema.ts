export const COMPACT_CUSTOMER_VERSION='customer-compact/2';
export const LEGACY_COMPACT_CUSTOMER_VERSION='customer-compact/1';
export const CULTURAL_COMPACT_CUSTOMER_VERSION='customer-compact/3';
export type CompactCustomerVersion=typeof LEGACY_COMPACT_CUSTOMER_VERSION|typeof COMPACT_CUSTOMER_VERSION|typeof CULTURAL_COMPACT_CUSTOMER_VERSION;
export type CompactCustomerCapabilities=Readonly<{hasRootLeafRefs:boolean;hasRevisionProfileId:boolean;hasCulturalComparisons:boolean}>;
const legacyCapabilities=Object.freeze({hasRootLeafRefs:false,hasRevisionProfileId:false,hasCulturalComparisons:false});
const currentCapabilities=Object.freeze({hasRootLeafRefs:true,hasRevisionProfileId:true,hasCulturalComparisons:false});
const culturalCapabilities=Object.freeze({hasRootLeafRefs:true,hasRevisionProfileId:true,hasCulturalComparisons:true});
/** An exact version dispatch, independent of which format is the ordinary default. */
export function compactCustomerCapabilities(version:string):CompactCustomerCapabilities{
 switch(version){
  case LEGACY_COMPACT_CUSTOMER_VERSION:return legacyCapabilities;
  case COMPACT_CUSTOMER_VERSION:return currentCapabilities;
  case CULTURAL_COMPACT_CUSTOMER_VERSION:return culturalCapabilities;
  default:throw new Error('客户存储版本未知。');
 }
}
export const compactBaseDefinitions=[
 'CREATE TABLE profiles(id TEXT PRIMARY KEY,json TEXT NOT NULL)',
 'CREATE TABLE settings(id TEXT PRIMARY KEY,json TEXT NOT NULL)',
 'CREATE TABLE profile_versions(id TEXT PRIMARY KEY,token TEXT NOT NULL)',
 'CREATE TABLE knowledge_archives(sha256 TEXT PRIMARY KEY,version TEXT UNIQUE NOT NULL,pack BLOB NOT NULL)'
];
function insertEncoded(raw:string){return `INSERT OR IGNORE INTO snapshot_blobs SELECT json_extract(value,'$.sha'),json_extract(value,'$.rawBytes'),json_extract(value,'$.codec'),compact_unbase64(json_extract(value,'$.payload')) FROM json_each(compact_encode(${raw}),'$.blobs');INSERT OR IGNORE INTO snapshot_roots VALUES(json_extract(compact_encode(${raw}),'$.root.sha'),json_extract(compact_encode(${raw}),'$.root.rawBytes'),json_extract(compact_encode(${raw}),'$.root.manifestBytes'),json_extract(compact_encode(${raw}),'$.root.manifestSha'),json_extract(compact_encode(${raw}),'$.root.codec'),compact_unbase64(json_extract(compact_encode(${raw}),'$.root.payload')));`;}
export function compactSchemaDefinitions(version:string):string[]{
 const capabilities=compactCustomerCapabilities(version),legacy=!capabilities.hasRootLeafRefs;
 const definitions=[
  `CREATE TABLE compact_meta(version TEXT PRIMARY KEY CHECK(version='${version}'))`,
  legacy?'CREATE TABLE snapshot_blobs(sha TEXT PRIMARY KEY,raw_bytes INTEGER NOT NULL,codec TEXT NOT NULL,payload BLOB NOT NULL)':"CREATE TABLE snapshot_blobs(sha TEXT PRIMARY KEY NOT NULL,raw_bytes INTEGER NOT NULL CHECK(typeof(raw_bytes)='integer' AND raw_bytes BETWEEN 1 AND 8388608),codec TEXT NOT NULL,payload BLOB NOT NULL,UNIQUE(sha,raw_bytes))",
  legacy?'CREATE TABLE snapshot_roots(sha TEXT PRIMARY KEY,raw_bytes INTEGER NOT NULL,manifest_bytes INTEGER NOT NULL,manifest_sha TEXT NOT NULL,codec TEXT NOT NULL,payload BLOB NOT NULL)':'CREATE TABLE snapshot_roots(sha TEXT PRIMARY KEY NOT NULL,raw_bytes INTEGER NOT NULL,manifest_bytes INTEGER NOT NULL,manifest_sha TEXT NOT NULL,codec TEXT NOT NULL,payload BLOB NOT NULL)',
  legacy?'CREATE TABLE session_records(id TEXT PRIMARY KEY,profile_id TEXT NOT NULL,snapshot_sha TEXT NOT NULL)':'CREATE TABLE session_records(id TEXT PRIMARY KEY NOT NULL,profile_id TEXT NOT NULL,snapshot_sha TEXT NOT NULL,UNIQUE(id,profile_id),FOREIGN KEY(profile_id) REFERENCES profiles(id) ON UPDATE RESTRICT ON DELETE RESTRICT,FOREIGN KEY(snapshot_sha) REFERENCES snapshot_roots(sha) ON UPDATE RESTRICT ON DELETE RESTRICT)',
  legacy?'CREATE TABLE revision_records(id INTEGER PRIMARY KEY AUTOINCREMENT,session_id TEXT NOT NULL,created_at TEXT NOT NULL,snapshot_sha TEXT NOT NULL)':'CREATE TABLE revision_records(id INTEGER PRIMARY KEY AUTOINCREMENT,session_id TEXT NOT NULL,profile_id TEXT NOT NULL,created_at TEXT NOT NULL,snapshot_sha TEXT NOT NULL,FOREIGN KEY(session_id,profile_id) REFERENCES session_records(id,profile_id) ON UPDATE RESTRICT ON DELETE RESTRICT,FOREIGN KEY(snapshot_sha) REFERENCES snapshot_roots(sha) ON UPDATE RESTRICT ON DELETE RESTRICT)',
  'CREATE INDEX revision_records_session ON revision_records(session_id,id)',
  'CREATE INDEX session_records_profile ON session_records(profile_id)',
  'CREATE VIEW sessions AS SELECT rowid AS rowid,id,compact_json(snapshot_sha) AS json FROM session_records',
  'CREATE VIEW revisions AS SELECT id,session_id,created_at,compact_json(snapshot_sha) AS json FROM revision_records',
  `CREATE TRIGGER snapshot_blob_conflict BEFORE INSERT ON snapshot_blobs WHEN EXISTS(SELECT 1 FROM snapshot_blobs WHERE sha=NEW.sha AND (raw_bytes!=NEW.raw_bytes OR codec!=NEW.codec OR payload!=NEW.payload)) BEGIN SELECT RAISE(ABORT,'Immutable snapshot blob differs'); END`,
  `CREATE TRIGGER snapshot_root_conflict BEFORE INSERT ON snapshot_roots WHEN EXISTS(SELECT 1 FROM snapshot_roots WHERE sha=NEW.sha AND (raw_bytes!=NEW.raw_bytes OR manifest_bytes!=NEW.manifest_bytes OR manifest_sha!=NEW.manifest_sha OR codec!=NEW.codec OR payload!=NEW.payload)) BEGIN SELECT RAISE(ABORT,'Immutable snapshot root differs'); END`
 ];
 definitions.push(
  `CREATE TRIGGER sessions_insert INSTEAD OF INSERT ON sessions BEGIN ${insertEncoded('NEW.json')} INSERT INTO session_records(id,profile_id,snapshot_sha) VALUES(NEW.id,json_extract(NEW.json,'$.profileId'),json_extract(compact_encode(NEW.json),'$.root.sha')); END`,
  `CREATE TRIGGER sessions_update INSTEAD OF UPDATE ON sessions BEGIN ${insertEncoded('NEW.json')} UPDATE session_records SET id=NEW.id,profile_id=json_extract(NEW.json,'$.profileId'),snapshot_sha=json_extract(compact_encode(NEW.json),'$.root.sha') WHERE id=OLD.id; END`,
  'CREATE TRIGGER sessions_delete INSTEAD OF DELETE ON sessions BEGIN DELETE FROM session_records WHERE id=OLD.id; END',
  legacy?`CREATE TRIGGER revisions_insert INSTEAD OF INSERT ON revisions BEGIN ${insertEncoded('NEW.json')} INSERT INTO revision_records(id,session_id,created_at,snapshot_sha) VALUES(NEW.id,NEW.session_id,NEW.created_at,json_extract(compact_encode(NEW.json),'$.root.sha')); END`:`CREATE TRIGGER revisions_insert INSTEAD OF INSERT ON revisions BEGIN ${insertEncoded('NEW.json')} INSERT INTO revision_records(id,session_id,profile_id,created_at,snapshot_sha) VALUES(NEW.id,NEW.session_id,json_extract(NEW.json,'$.profileId'),NEW.created_at,json_extract(compact_encode(NEW.json),'$.root.sha')); END`,
  legacy?`CREATE TRIGGER revisions_update INSTEAD OF UPDATE ON revisions BEGIN ${insertEncoded('NEW.json')} UPDATE revision_records SET id=NEW.id,session_id=NEW.session_id,created_at=NEW.created_at,snapshot_sha=json_extract(compact_encode(NEW.json),'$.root.sha') WHERE id=OLD.id; END`:`CREATE TRIGGER revisions_update INSTEAD OF UPDATE ON revisions BEGIN ${insertEncoded('NEW.json')} UPDATE revision_records SET id=NEW.id,session_id=NEW.session_id,profile_id=json_extract(NEW.json,'$.profileId'),created_at=NEW.created_at,snapshot_sha=json_extract(compact_encode(NEW.json),'$.root.sha') WHERE id=OLD.id; END`,
  'CREATE TRIGGER revisions_delete INSTEAD OF DELETE ON revisions BEGIN DELETE FROM revision_records WHERE id=OLD.id; END'
 );
 if(legacy)return definitions;
 definitions.push(
  "CREATE TABLE root_leaf_refs(root_sha TEXT NOT NULL,position INTEGER NOT NULL CHECK(typeof(position)='integer' AND position BETWEEN 0 AND 4),role TEXT NOT NULL CHECK(role IN ('analysis','sourceSnapshot')),blob_sha TEXT NOT NULL,raw_bytes INTEGER NOT NULL CHECK(typeof(raw_bytes)='integer' AND raw_bytes BETWEEN 1 AND 8388608),PRIMARY KEY(root_sha,position),UNIQUE(root_sha,role),FOREIGN KEY(root_sha) REFERENCES snapshot_roots(sha) ON UPDATE RESTRICT ON DELETE RESTRICT,FOREIGN KEY(blob_sha,raw_bytes) REFERENCES snapshot_blobs(sha,raw_bytes) ON UPDATE RESTRICT ON DELETE RESTRICT)",
  'CREATE INDEX root_leaf_refs_blob ON root_leaf_refs(blob_sha,raw_bytes)',
  "CREATE TRIGGER snapshot_blob_no_update BEFORE UPDATE ON snapshot_blobs BEGIN SELECT RAISE(ABORT,'Immutable snapshot blob'); END",
  "CREATE TRIGGER snapshot_root_no_update BEFORE UPDATE ON snapshot_roots BEGIN SELECT RAISE(ABORT,'Immutable snapshot root'); END",
  "CREATE TRIGGER root_leaf_refs_no_update BEFORE UPDATE ON root_leaf_refs BEGIN SELECT RAISE(ABORT,'Immutable snapshot edge'); END",
  "CREATE TRIGGER root_leaf_refs_no_delete BEFORE DELETE ON root_leaf_refs BEGIN SELECT RAISE(ABORT,'Immutable snapshot edge'); END",
  `CREATE TRIGGER root_leaf_refs_validate BEFORE INSERT ON root_leaf_refs BEGIN SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM snapshot_roots r,json_each(compact_manifest_refs(r.sha,r.raw_bytes,r.manifest_bytes,r.manifest_sha,r.codec,r.payload)) e WHERE r.sha=NEW.root_sha AND json_extract(e.value,'$.position')=NEW.position AND json_extract(e.value,'$.key')=NEW.role AND json_extract(e.value,'$.sha')=NEW.blob_sha AND json_extract(e.value,'$.rawBytes')=NEW.raw_bytes) THEN RAISE(ABORT,'Snapshot edge differs from manifest') END; END`,
  `CREATE TRIGGER snapshot_root_materialize_refs AFTER INSERT ON snapshot_roots BEGIN INSERT INTO root_leaf_refs(root_sha,position,role,blob_sha,raw_bytes) SELECT NEW.sha,json_extract(value,'$.position'),json_extract(value,'$.key'),json_extract(value,'$.sha'),json_extract(value,'$.rawBytes') FROM json_each(compact_materialized_refs(NEW.sha,NEW.raw_bytes,NEW.manifest_bytes,NEW.manifest_sha,NEW.codec,NEW.payload)); END`
 );
 for(const operation of ['INSERT','UPDATE']){
  definitions.push(`CREATE TRIGGER session_records_identity_${operation.toLowerCase()} BEFORE ${operation} ON session_records BEGIN SELECT CASE WHEN json_extract(compact_json(NEW.snapshot_sha),'$.id') IS NOT NEW.id OR json_extract(compact_json(NEW.snapshot_sha),'$.profileId') IS NOT NEW.profile_id THEN RAISE(ABORT,'Snapshot session identity differs') END; END`);
  definitions.push(`CREATE TRIGGER revision_records_identity_${operation.toLowerCase()} BEFORE ${operation} ON revision_records BEGIN SELECT CASE WHEN json_extract(compact_json(NEW.snapshot_sha),'$.id') IS NOT NEW.session_id OR json_extract(compact_json(NEW.snapshot_sha),'$.profileId') IS NOT NEW.profile_id THEN RAISE(ABORT,'Snapshot history identity differs') END; END`);
 }
 if(capabilities.hasCulturalComparisons)definitions.push(...culturalCompactDefinitions);
 return definitions;
}

// M831 additions only. Existing /1 and /2 definitions above retain their exact SQL.
const culturalCompactDefinitions=[
 `CREATE TABLE cultural_comparisons(
 id TEXT PRIMARY KEY NOT NULL,
 profile_id TEXT NOT NULL,
 source_session_id TEXT,
 current_revision INTEGER NOT NULL CHECK(typeof(current_revision)='integer' AND current_revision BETWEEN 1 AND 9007199254740991),
 review_token TEXT NOT NULL CHECK(length(review_token)>0),
 created_at TEXT NOT NULL,
 UNIQUE(id,profile_id),
 FOREIGN KEY(profile_id) REFERENCES profiles(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 FOREIGN KEY(source_session_id,profile_id) REFERENCES session_records(id,profile_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 FOREIGN KEY(id,current_revision,profile_id) REFERENCES cultural_comparison_revisions(comparison_id,revision,profile_id) DEFERRABLE INITIALLY DEFERRED
)`,
 `CREATE TABLE cultural_comparison_revisions(
 comparison_id TEXT NOT NULL,
 revision INTEGER NOT NULL CHECK(typeof(revision)='integer' AND revision BETWEEN 1 AND 9007199254740991),
 profile_id TEXT NOT NULL,
 parent_revision INTEGER,
 operation TEXT NOT NULL CHECK(operation IN ('create','revise','restore-revision')),
 restored_from_revision INTEGER,
 capsule_sha TEXT NOT NULL CHECK(length(capsule_sha)=64 AND capsule_sha NOT GLOB '*[^0-9a-f]*'),
 capsule_bytes INTEGER NOT NULL CHECK(typeof(capsule_bytes)='integer' AND capsule_bytes BETWEEN 1 AND 8388608),
 result_sha TEXT NOT NULL CHECK(length(result_sha)=64 AND result_sha NOT GLOB '*[^0-9a-f]*'),
 result_bytes INTEGER NOT NULL CHECK(typeof(result_bytes)='integer' AND result_bytes BETWEEN 1 AND 8388608),
 created_at TEXT NOT NULL,
 PRIMARY KEY(comparison_id,revision),
 UNIQUE(comparison_id,revision,profile_id),
 CHECK((revision=1 AND parent_revision IS NULL AND operation='create') OR (revision>1 AND parent_revision IS NOT NULL AND typeof(parent_revision)='integer' AND parent_revision=revision-1 AND operation IN ('revise','restore-revision'))),
 CHECK((operation='restore-revision' AND typeof(restored_from_revision)='integer' AND restored_from_revision BETWEEN 1 AND revision-1) OR (operation!='restore-revision' AND restored_from_revision IS NULL)),
 FOREIGN KEY(comparison_id,profile_id) REFERENCES cultural_comparisons(id,profile_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 FOREIGN KEY(comparison_id,parent_revision) REFERENCES cultural_comparison_revisions(comparison_id,revision) DEFERRABLE INITIALLY DEFERRED,
 FOREIGN KEY(comparison_id,restored_from_revision) REFERENCES cultural_comparison_revisions(comparison_id,revision) DEFERRABLE INITIALLY DEFERRED,
 FOREIGN KEY(capsule_sha,capsule_bytes) REFERENCES snapshot_blobs(sha,raw_bytes) ON UPDATE RESTRICT ON DELETE RESTRICT,
 FOREIGN KEY(result_sha,result_bytes) REFERENCES snapshot_blobs(sha,raw_bytes) ON UPDATE RESTRICT ON DELETE RESTRICT
)`,
 `CREATE TABLE cultural_write_receipts(
 profile_id TEXT NOT NULL,
 idempotency_key TEXT NOT NULL CHECK(length(idempotency_key)>0),
 request_json TEXT NOT NULL CHECK(length(CAST(request_json AS BLOB)) BETWEEN 1 AND 8192),
 request_sha TEXT NOT NULL CHECK(length(request_sha)=64 AND request_sha NOT GLOB '*[^0-9a-f]*'),
 comparison_id TEXT NOT NULL,
 result_revision INTEGER NOT NULL,
 created_at TEXT NOT NULL,
 PRIMARY KEY(profile_id,idempotency_key),
 FOREIGN KEY(comparison_id,result_revision,profile_id) REFERENCES cultural_comparison_revisions(comparison_id,revision,profile_id) ON UPDATE RESTRICT ON DELETE RESTRICT
)`,
 'CREATE INDEX cultural_comparisons_profile ON cultural_comparisons(profile_id,id)',
 'CREATE INDEX cultural_comparison_revisions_capsule ON cultural_comparison_revisions(capsule_sha,capsule_bytes)',
 'CREATE INDEX cultural_comparison_revisions_result ON cultural_comparison_revisions(result_sha,result_bytes)',
 'CREATE INDEX cultural_write_receipts_result ON cultural_write_receipts(comparison_id,result_revision)',
 `CREATE TRIGGER cultural_head_no_reinsert BEFORE INSERT ON cultural_comparisons
 WHEN EXISTS(SELECT 1 FROM cultural_comparisons WHERE id=NEW.id)
 BEGIN SELECT RAISE(ABORT,'Cultural head already exists'); END`,
 `CREATE TRIGGER cultural_revision_no_reinsert BEFORE INSERT ON cultural_comparison_revisions
 WHEN EXISTS(SELECT 1 FROM cultural_comparison_revisions WHERE comparison_id=NEW.comparison_id AND revision=NEW.revision)
 BEGIN SELECT RAISE(ABORT,'Cultural revision already exists'); END`,
 `CREATE TRIGGER cultural_receipt_no_reinsert BEFORE INSERT ON cultural_write_receipts
 WHEN EXISTS(SELECT 1 FROM cultural_write_receipts WHERE profile_id=NEW.profile_id AND idempotency_key=NEW.idempotency_key)
 BEGIN SELECT RAISE(ABORT,'Cultural receipt already exists'); END`,
 `CREATE TRIGGER cultural_head_identity_no_change BEFORE UPDATE ON cultural_comparisons
 WHEN NEW.id IS NOT OLD.id OR NEW.profile_id IS NOT OLD.profile_id OR NEW.source_session_id IS NOT OLD.source_session_id OR NEW.created_at IS NOT OLD.created_at
 BEGIN SELECT RAISE(ABORT,'Cultural comparison ownership is immutable'); END`,
 `CREATE TRIGGER cultural_head_revision_step BEFORE UPDATE ON cultural_comparisons
 WHEN NEW.current_revision NOT IN (OLD.current_revision,OLD.current_revision+1) OR NEW.review_token=OLD.review_token
 BEGIN SELECT RAISE(ABORT,'Cultural head requires next revision or explicit token rotation'); END`,
 "CREATE TRIGGER cultural_head_no_delete BEFORE DELETE ON cultural_comparisons BEGIN SELECT RAISE(ABORT,'Cultural comparison history must be retained'); END",
 "CREATE TRIGGER cultural_revision_no_update BEFORE UPDATE ON cultural_comparison_revisions BEGIN SELECT RAISE(ABORT,'Immutable cultural revision'); END",
 "CREATE TRIGGER cultural_revision_no_delete BEFORE DELETE ON cultural_comparison_revisions BEGIN SELECT RAISE(ABORT,'Immutable cultural history'); END",
 "CREATE TRIGGER cultural_receipt_no_update BEFORE UPDATE ON cultural_write_receipts BEGIN SELECT RAISE(ABORT,'Immutable cultural write receipt'); END",
 "CREATE TRIGGER cultural_receipt_no_delete BEFORE DELETE ON cultural_write_receipts BEGIN SELECT RAISE(ABORT,'Cultural write receipt must be retained'); END"
];
