import { createHash } from 'node:crypto';
import { types as nodeTypes } from 'node:util';
import type { Database, SqlValue } from 'sql.js';
import { assertCompactCustomerSchema, assertRawCustomerSchema, compactCustomerVersion, COMPACT_CUSTOMER_VERSION, customerRows, isCompactCustomerDatabase } from './compact-customer-store';
import { parseSnapshotRootManifest, type SnapshotRoot } from './snapshot-blob-codec';
import { parseSnapshotJsonStrict, splitImmutableSnapshotJson } from './snapshot-json-spans';
import { DEFAULT_SESSION_FILTERS, sessionCreationDay, validateSessionFilters, type SessionFilters } from '../shared/session-catalog';
import type { SessionCatalogPage, SessionCatalogRequest, SessionCatalogSummary } from '../shared/session-pagination';
import {REVIEWED_DATA_METHOD,REVIEWED_DATA_SESSION_PREFIX,REVIEWED_DATA_CANDIDATE_PREFIX} from '../shared/reviewed-naming-data';

type CatalogEntry = { summary: SessionCatalogSummary; candidateNames: string[] };
type CatalogCursor = {version:1;generation:string;query:string;offset:number};
const normalized = (value: string) => value.normalize('NFKC').trim().toLocaleLowerCase('zh-CN');
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const identifier = (value: unknown): value is string => typeof value === 'string' && !!value.trim() && value.length <= 1000;

function ownData(value:unknown,keys:readonly string[],exact=false):Record<string,unknown>{
  if(!object(value)||nodeTypes.isProxy(value))throw new Error('方案目录只接受普通资料字段。');
  const proto=Object.getPrototypeOf(value);if(proto!==null&&proto!==Object.prototype)throw new Error('方案目录不接受继承的查询字段。');
  const own=Reflect.ownKeys(value);if((exact&&own.length!==keys.length)||own.some(key=>typeof key!=='string'||!keys.includes(key)))throw new Error('方案目录查询字段无效。');
  const result:Record<string,unknown>=Object.create(null);
  for(const key of own){const descriptor=Object.getOwnPropertyDescriptor(value,key)!;if(!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)throw new Error('方案目录不接受访问器字段。');result[key as string]=descriptor.value;}
  return result;
}
function validFilters(value: unknown): value is SessionFilters {
  const keys = Object.keys(DEFAULT_SESSION_FILTERS);
  return object(value) && Object.keys(value).length === keys.length && keys.every(key => typeof value[key] === 'string') && typeof value.favorite === 'string' && ['all', 'has', 'none'].includes(value.favorite) && typeof value.sort === 'string' && ['newest', 'oldest'].includes(value.sort);
}

function readRequest(request: unknown): { limit: number; cursor?: string; filters: SessionFilters; query: string } {
  request=ownData(request,['limit','cursor','filters']);
  const input=request as Record<string,unknown>;
  const limit = input.limit === undefined ? 50 : input.limit;
  if (typeof limit !== 'number' || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error('摘要页大小必须为1到100。');
  if (input.cursor !== undefined && (typeof input.cursor !== 'string' || !/^[A-Za-z0-9_-]+$/.test(input.cursor) || input.cursor.length > 2048)) throw new Error('摘要游标无效。');
  const supplied = ownData(input.filters === undefined ? DEFAULT_SESSION_FILTERS : input.filters,Object.keys(DEFAULT_SESSION_FILTERS),true);
  if (!validFilters(supplied)) throw new Error('方案筛选条件无效。');
  if(supplied.query.length>1000||supplied.customerId.length>1000||supplied.surname.length>1000||supplied.dateFrom.length>10||supplied.dateTo.length>10)throw new Error('方案目录筛选文字过长。');
  const filters: SessionFilters = { query: normalized(supplied.query), customerId: supplied.customerId, surname: normalized(supplied.surname), dateFrom: supplied.dateFrom, dateTo: supplied.dateTo, favorite: supplied.favorite, sort: supplied.sort };
  const error = validateSessionFilters(filters);
  if (error) throw new RangeError(error);
  return { limit, cursor: input.cursor as string|undefined, filters, query: hash(JSON.stringify(filters)) };
}

/** This is a marker check only. Full proofs remain a detail/history read duty. */
function assertReviewedCatalogStructure(value:Record<string,unknown>,rawProjection:boolean){
  const addonPresent=rawProjection?value._reviewedAddonType!==null:Object.hasOwn(value,'reviewedData');
  const addon=!rawProjection&&addonPresent?value.reviewedData:undefined;
  const addonType=rawProjection?value._reviewedAddonType:object(addon)&&!Array.isArray(addon)?'object':undefined;
  const method=rawProjection?value._reviewedMethod:object(addon)?addon.method:undefined;
  const candidates=value.candidates as Record<string,unknown>[];
  const candidateMetadata=candidates.map(candidate=>{
    const present=rawProjection?candidate._reviewedProofType!==null:Object.hasOwn(candidate,'reviewedDataUse');
    const proof=!rawProjection&&present?candidate.reviewedDataUse:undefined;
    return{prefix:typeof candidate.id==='string'&&candidate.id.startsWith(REVIEWED_DATA_CANDIDATE_PREFIX),present,type:rawProjection?candidate._reviewedProofType:object(proof)&&!Array.isArray(proof)?'object':undefined,method:rawProjection?candidate._reviewedProofMethod:object(proof)?proof.method:undefined};
  });
  const prefix=typeof value.id==='string'&&value.id.startsWith(REVIEWED_DATA_SESSION_PREFIX);
  if(!prefix&&!addonPresent&&!candidateMetadata.some(row=>row.prefix||row.present))return;
  if(!prefix||!addonPresent||addonType!=='object'||method!==REVIEWED_DATA_METHOD||candidateMetadata.some(row=>!row.prefix||!row.present||row.type!=='object'||row.method!==REVIEWED_DATA_METHOD))throw new Error('已审资料方案目录标记缺失或版本不一致，请读取有效原方案。');
}

function readEntry(value: unknown, id: SqlValue, profileId: SqlValue, profiles: Set<string>,rawProjection=false): CatalogEntry {
  if (!object(value) || !identifier(id) || value.id !== id || !identifier(profileId) || value.profileId !== profileId || !profiles.has(profileId)) throw new Error('方案摘要编号或客户归属不一致。');
  const profile = value.profile;
  if (!object(profile) || profile.id !== profileId || typeof profile.customerName !== 'string' || typeof profile.surname !== 'string' || !profile.surname || ['fatherName', 'motherName'].some(key => profile[key] !== undefined && typeof profile[key] !== 'string')) throw new Error('方案摘要客户快照无效。');
  if (typeof value.createdAt !== 'string' || typeof value.reviewNote !== 'string' || typeof value.dataVersion !== 'string' || !value.dataVersion || !Array.isArray(value.candidates) || value.candidates.length > 100) throw new Error('方案摘要元数据无效。');
  const names: string[] = [];
  let favorites = 0;
  for (const candidate of value.candidates) {
    if (!object(candidate) || typeof candidate.fullName !== 'string' || typeof candidate.favorite !== 'boolean') throw new Error('方案摘要候选字段无效。');
    names.push(candidate.fullName);
    if (candidate.favorite) favorites++;
  }
  assertReviewedCatalogStructure(value,rawProjection);
  const snapshot: SessionCatalogSummary['profile'] = { id: profileId, customerName: profile.customerName, surname: profile.surname, fatherName: typeof profile.fatherName === 'string' ? profile.fatherName : '', motherName: typeof profile.motherName === 'string' ? profile.motherName : '' };
  return { summary: { id, profileId, createdAt: value.createdAt, reviewNote: value.reviewNote, dataVersion: value.dataVersion, profile: snapshot, candidateCount: names.length, favoriteCount: favorites, candidateFactsVerified: false }, candidateNames: names };
}

/** Verify only the authenticated manifest and its projection; referenced leaves stay unread. */
function compactProjection(root: SnapshotRoot) {
  const { parts, refs } = parseSnapshotRootManifest(root);
  const originalBytes = parts.reduce((sum, part) => sum + ('text' in part ? Buffer.byteLength(part.text, 'utf8') : part.rawBytes), 0);
  if (originalBytes !== root.rawBytes) throw new Error('方案摘要清单与原始长度不一致。');
  const text = parts.map(part => 'text' in part ? part.text : 'null').join('');
  const projected = splitImmutableSnapshotJson(text).parts;
  if (projected.length !== parts.length || projected.some((part, index) => {
    const original = parts[index];
    return part.kind === 'raw' ? !('text' in original) || part.text !== original.text : !('blob' in original) || part.key !== original.key || part.text !== 'null';
  })) throw new Error('方案摘要不可变字段引用位置无效。');
  return { value: parseSnapshotJsonStrict(text), refs };
}

function creationOrder(a: CatalogEntry, b: CatalogEntry, sort: SessionFilters['sort']): number {
  const aTime = Date.parse(a.summary.createdAt), bTime = Date.parse(b.summary.createdAt);
  const aValid = Number.isFinite(aTime), bValid = Number.isFinite(bTime);
  if (aValid !== bValid) return aValid ? -1 : 1;
  const order = aValid ? sort === 'oldest' ? aTime - bTime : bTime - aTime : 0;
  return order || (a.summary.id < b.summary.id ? -1 : a.summary.id > b.summary.id ? 1 : 0);
}

function matches(entry: CatalogEntry, filters: SessionFilters): boolean {
  const item = entry.summary;
  if (filters.customerId && item.profileId !== filters.customerId) return false;
  if (filters.surname && normalized(item.profile.surname) !== filters.surname) return false;
  if (filters.favorite === 'has' && !item.favoriteCount || filters.favorite === 'none' && item.favoriteCount) return false;
  if (filters.dateFrom || filters.dateTo) {
    const day = sessionCreationDay(item.createdAt);
    if (!day || filters.dateFrom && day < filters.dateFrom || filters.dateTo && day > filters.dateTo) return false;
  }
  return !filters.query || normalized([item.profile.customerName, item.profile.surname, item.profile.fatherName || '', item.profile.motherName || '', ...entry.candidateNames].join('\n')).includes(filters.query);
}

function parseCursor(cursor:string):CatalogCursor{
  if (!/^[A-Za-z0-9_-]+$/.test(cursor)) throw new Error('摘要游标无效。');
  const bytes = Buffer.from(cursor, 'base64url');
  if (bytes.toString('base64url') !== cursor) throw new Error('摘要游标无效。');
  let value: unknown;
  try { value = parseSnapshotJsonStrict(new TextDecoder('utf-8', { fatal: true }).decode(bytes), 2048); }
  catch { throw new Error('摘要游标无效。'); }
  if (!object(value) || Object.keys(value).sort().join(',') !== 'generation,offset,query,version' || value.version !== 1 || !Number.isSafeInteger(value.offset) || Number(value.offset) < 0 || typeof value.generation !== 'string' || !/^[a-f0-9]{64}$/.test(value.generation) || typeof value.query !== 'string' || !/^[a-f0-9]{64}$/.test(value.query)) throw new Error('摘要游标无效。');
  return value as CatalogCursor;
}
function readCursor(cursor:CatalogCursor|undefined,generation:string,query:string,matched:number):number{
  if(cursor===undefined)return 0;
  if (cursor.query !== query) throw new Error('方案筛选条件已改变，请从第一页重新读取。');
  if (cursor.generation !== generation) throw new Error('方案目录已更新，分页游标已过期，请从第一页重新读取。');
  if (cursor.offset > matched) throw new Error('摘要游标超出结果范围。');
  return cursor.offset;
}

/** No full-session reader, immutable leaf or persisted cache participates in directory queries. */
export function querySessionCatalog(db: Database, request: SessionCatalogRequest = {}, databaseGeneration = ''): SessionCatalogPage {
  const { limit, cursor, filters, query } = readRequest(request);
  const parsedCursor=cursor===undefined?undefined:parseCursor(cursor);
  if(parsedCursor&&parsedCursor.query!==query)throw new Error('方案筛选条件已改变，请从第一页重新读取。');
  const compact = isCompactCustomerDatabase(db);
  if (compact) assertCompactCustomerSchema(db); else assertRawCustomerSchema(db);
  const profiles = new Set<string>();
  for (const [id] of customerRows(db, 'SELECT id FROM profiles ORDER BY id')) {
    if (!identifier(id)) throw new Error('方案目录客户编号无效。');
    profiles.add(id);
  }
  const generationHash = createHash('sha256').update(JSON.stringify([databaseGeneration, compact, [...profiles]]));
  const entries: CatalogEntry[] = [];
  if (compact) {
    const version = compactCustomerVersion(db);
    const sql = 'SELECT s.id,s.profile_id,s.snapshot_sha,r.sha,r.raw_bytes,r.manifest_bytes,r.manifest_sha,r.codec,r.payload FROM session_records s LEFT JOIN snapshot_roots r ON r.sha=s.snapshot_sha ORDER BY s.rowid DESC';
    for (const row of customerRows(db, sql)) {
      if (row[2] !== row[3]) throw new Error('方案摘要快照根缺失或身份不一致。');
      const root: SnapshotRoot = { sha: row[3] as string, rawBytes: row[4] as number, manifestBytes: row[5] as number, manifestSha: row[6] as string, codec: row[7] as SnapshotRoot['codec'], payload: row[8] as Uint8Array };
      const { value, refs } = compactProjection(root);
      if (version === COMPACT_CUSTOMER_VERSION) {
        const edges = [...customerRows(db, 'SELECT position,role,blob_sha,raw_bytes FROM root_leaf_refs WHERE root_sha=? ORDER BY position', [root.sha])];
        if (edges.length !== refs.length || refs.some((ref, index) => { const edge = edges[index]; return edge[0] !== ref.position || edge[1] !== ref.key || edge[2] !== ref.sha || edge[3] !== ref.rawBytes; })) throw new Error('方案摘要快照引用边与清单不一致。');
      }
      entries.push(readEntry(value, row[0], row[1], profiles));
      generationHash.update(JSON.stringify([row[0], row[1], root.sha, root.manifestSha]));
    }
  } else {
    // SQL projects only directory fields and name/favorite pairs, never full candidate facts.
    const sql = `SELECT id,json_extract(json,'$.profileId'),json_object(
      'id',json_extract(json,'$.id'),'profileId',json_extract(json,'$.profileId'),
      'createdAt',json_extract(json,'$.createdAt'),'reviewNote',json_extract(json,'$.reviewNote'),'dataVersion',json_extract(json,'$.dataVersion'),
      '_reviewedAddonType',json_type(json,'$.reviewedData'),'_reviewedMethod',json_extract(json,'$.reviewedData.method'),
      'profile',json_object('id',json_extract(json,'$.profile.id'),'customerName',json_extract(json,'$.profile.customerName'),'surname',json_extract(json,'$.profile.surname'),
        'fatherName',coalesce(json_extract(json,'$.profile.fatherName'),''),'motherName',coalesce(json_extract(json,'$.profile.motherName'),'')),
      'candidates',json((SELECT json_group_array(json_object('id',json_extract(value,'$.id'),'fullName',json_extract(value,'$.fullName'),'favorite',json(CASE json_type(value,'$.favorite') WHEN 'true' THEN 'true' WHEN 'false' THEN 'false' ELSE 'null' END),'_reviewedProofType',json_type(value,'$.reviewedDataUse'),'_reviewedProofMethod',json_extract(value,'$.reviewedDataUse.method'))) FROM json_each(sessions.json,'$.candidates')))
    ),json_type(json,'$.candidates') FROM sessions ORDER BY rowid DESC`;
    for (const [id, profileId, json, candidateType] of customerRows(db, sql)) {
      if (candidateType !== 'array' || typeof json !== 'string') throw new Error('方案摘要候选字段无效。');
      entries.push(readEntry(parseSnapshotJsonStrict(json), id, profileId, profiles,true));
      generationHash.update(JSON.stringify([id, profileId, json]));
    }
  }
  const profileCounts: Record<string, number> = Object.create(null);
  const labels = new Map<string, string>();
  for (const { summary } of [...entries].sort((a, b) => creationOrder(a, b, 'newest'))) {
    profileCounts[summary.profileId] = (profileCounts[summary.profileId] || 0) + 1;
    if (!labels.has(summary.profileId)) labels.set(summary.profileId, summary.profile.customerName.trim() || `${summary.profile.surname}姓宝宝`);
  }
  const labelCounts = new Map<string, number>();
  for (const label of labels.values()) labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
  const customers = [...labels].map(([id, label]) => ({ id, label: labelCounts.get(label)! > 1 ? `${label} · ${id.slice(-6)}` : label })).sort((a, b) => a.label.localeCompare(b.label, 'zh-CN') || a.id.localeCompare(b.id));
  const visible = entries.filter(entry => matches(entry, filters)).sort((a, b) => creationOrder(a, b, filters.sort));
  const generation = generationHash.digest('hex'), offset = readCursor(parsedCursor, generation, query, visible.length);
  const end = offset + limit;
  const nextCursor = end < visible.length ? Buffer.from(JSON.stringify({ version: 1, generation, query, offset: end })).toString('base64url') : undefined;
  return { items: visible.slice(offset, end).map(entry => entry.summary), ...(nextCursor?{nextCursor}:{}), total: entries.length, matched: visible.length, customers, profileCounts };
}
