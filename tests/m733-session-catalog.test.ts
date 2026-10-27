import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import initSqlJs, { type Database } from 'sql.js';
import { join, resolve } from 'node:path';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';
import { createCustomerDatabase } from '../src/main/customer-database-connection';
import { bindCompactCustomerDatabase, compactDecodeCounters, createCompactCustomerDatabase, writeCompactSession } from '../src/main/compact-customer-store';
import { compactBaseDefinitions, compactSchemaDefinitions, LEGACY_COMPACT_CUSTOMER_VERSION } from '../src/main/compact-customer-schema';
import { snapshotSha } from '../src/main/snapshot-blob-codec';
import { querySessionCatalog } from '../src/main/session-catalog-query';
import { Store } from '../src/main/store';
import { StudioService } from '../src/main/service';
import { normalizePreferences } from '../src/shared/workflow';
import { DEFAULT_SESSION_FILTERS, filterSessions, sessionCustomerOptions, type SessionFilters } from '../src/shared/session-catalog';
import type { NamingSession } from '../src/shared/types';
import { catalogSession } from './fixtures/catalog-session';

let SQL: Awaited<ReturnType<typeof initSqlJs>>;
const databases: Database[] = [];
beforeAll(async () => { SQL = await initSqlJs({ locateFile: () => resolve('node_modules/sql.js/dist/sql-wasm.wasm') }); });
afterAll(() => { for (const db of databases) db.close(); });

function fixture(sessions: NamingSession[], compact = true, legacy = false): Database {
  const db = compact ? legacy ? createCustomerDatabase(SQL) : createCompactCustomerDatabase(SQL) : new SQL.Database();
  databases.push(db);
  if (legacy) {
    for (const definition of [...compactBaseDefinitions, ...compactSchemaDefinitions(LEGACY_COMPACT_CUSTOMER_VERSION)]) db.run(definition);
    db.run('INSERT INTO compact_meta VALUES(?)', [LEGACY_COMPACT_CUSTOMER_VERSION]);
    bindCompactCustomerDatabase(db);
  }
  if (!compact) db.run('CREATE TABLE profiles(id TEXT PRIMARY KEY,json TEXT NOT NULL);CREATE TABLE sessions(id TEXT PRIMARY KEY,json TEXT NOT NULL);CREATE TABLE settings(id TEXT PRIMARY KEY,json TEXT NOT NULL)');
  for (const session of sessions) {
    db.run('INSERT OR IGNORE INTO profiles VALUES(?,?)', [session.profileId, JSON.stringify({ ...session.profile, customerName: '已编辑的当前客户名称' })]);
    if (compact) writeCompactSession(db, session.id, JSON.stringify(session));
    else db.run('INSERT INTO sessions VALUES(?,?)', [session.id, JSON.stringify(session)]);
  }
  return db;
}

function sessions(): NamingSession[] {
  const rows = [
    catalogSession('batch-b', '2026-10-18T02:00:00Z'),
    catalogSession('batch-a', '2026-10-18T10:00:00+08:00'),
    catalogSession('start', '2026-10-17T16:00:00Z', 'customer-2'),
    catalogSession('before', '2026-10-17T15:59:59.999Z', 'customer-3'),
    catalogSession('end', '2026-10-18T15:59:59.999Z', 'customer-2'),
    catalogSession('after', '2026-10-18T16:00:00Z', 'customer-3'),
    catalogSession('unknown', 'unknown', 'customer-3'),
  ];
  rows[0].profile.customerName = 'ABC家长';
  rows[1].profile.surname = '欧阳'; rows[1].candidates[0].favorite = true;
  rows[2].profile.customerName = '旧客户称呼'; rows[4].profile.customerName = 'ABC家长';
  return rows;
}

describe('M733 metadata-only session catalogue', () => {
  it.each([true, false])('matches all old filtering/sorting and whole-catalogue counts (compact=%s)', compact => {
    const input = sessions(), db = fixture(input, compact), saved = JSON.stringify(input);
    const cases: Partial<SessionFilters>[] = [
      {}, { sort: 'oldest' }, { query: ' ａｂｃ ' }, { query: ' 志远 ' }, { query: '陈清' }, { query: '王安' },
      { surname: ' 欧阳 ' }, { surname: '阳' }, { customerId: 'customer-2' }, { favorite: 'has' }, { favorite: 'none' },
      { dateFrom: '2026-10-18', dateTo: '2026-10-18' }, { dateFrom: '2026-10-19' }, { dateTo: '2026-10-17' },
      { query: '无匹配' }, { customerId: 'customer-1', surname: '欧阳', favorite: 'has' },
    ];
    for (const change of cases) {
      const filters = { ...DEFAULT_SESSION_FILTERS, ...change };
      const expected = filterSessions(input, filters);
      const page = querySessionCatalog(db, { limit: 1, filters });
      expect(page.items.map(item => item.id)).toEqual(expected.slice(0, 1).map(item => item.id));
      expect(page.matched).toBe(expected.length); expect(page.total).toBe(input.length);
      expect(page.customers).toEqual(sessionCustomerOptions(input));
      expect(page.profileCounts).toEqual({ 'customer-1': 2, 'customer-2': 2, 'customer-3': 3 });
    }
    const item = querySessionCatalog(db, { filters: { ...DEFAULT_SESSION_FILTERS, surname: '欧阳' } }).items[0];
    expect(item).toMatchObject({ candidateCount: 2, favoriteCount: 1, candidateFactsVerified: false, profile: { customerName: '王家长', surname: '欧阳' } });
    expect(item).not.toHaveProperty('candidates'); expect(item).not.toHaveProperty('candidateNames'); expect(item).not.toHaveProperty('analysis');
    expect(JSON.stringify(input)).toBe(saved);
  });

  it('reads neither compact leaves nor full decodes, leaves bytes intact, and keeps snapshot labels', () => {
    const db = fixture(sessions()), counts = compactDecodeCounters(db), before = Buffer.from(db.export());
    const prepare = db.prepare.bind(db), seen: string[] = [];
    const spy = vi.spyOn(db, 'prepare').mockImplementation((sql, ...rest) => {
      seen.push(sql);
      if (/compact_json\s*\(|\bFROM\s+snapshot_blobs\b/i.test(sql)) throw new Error('Directory attempted a full read');
      return prepare(sql, ...rest);
    });
    const page = querySessionCatalog(db, { limit: 2 });
    spy.mockRestore();
    expect(page.items).toHaveLength(2); expect(seen.length).toBeGreaterThan(0);
    expect(compactDecodeCounters(db)).toEqual(counts);
    expect(Buffer.from(db.export())).toEqual(before);
    expect(page.customers.some(row => row.label.includes('已编辑'))).toBe(false);
  });

  it('walks every page exactly once and binds cursors to filters, sorting and the data generation', () => {
    const input = sessions(), db = fixture(input), ids: string[] = [];
    let page = querySessionCatalog(db, { limit: 2 }, 'generation-1');
    const first = page;
    for (;;) {
      ids.push(...page.items.map(item => item.id));
      if (!page.nextCursor) break;
      page = querySessionCatalog(db, { limit: 2, cursor: page.nextCursor }, 'generation-1');
    }
    expect(ids).toEqual(filterSessions(input, { ...DEFAULT_SESSION_FILTERS }).map(row => row.id));
    expect(new Set(ids).size).toBe(input.length);
    expect(() => querySessionCatalog(db, { limit: 2, cursor: first.nextCursor, filters: { ...DEFAULT_SESSION_FILTERS, sort: 'oldest' } }, 'generation-1')).toThrow(/筛选条件已改变/);
    expect(() => querySessionCatalog(db, { cursor: first.nextCursor }, 'after-restore')).toThrow(/过期/);
    const reviewed = { ...input[0], reviewNote: '保存后的新意见' };
    writeCompactSession(db, reviewed.id, JSON.stringify(reviewed));
    expect(() => querySessionCatalog(db, { cursor: first.nextCursor }, 'generation-1')).toThrow(/过期/);
  });

  it('Store exposes the same bounded query and rejects cursors after an insert or reopen', () => {
    const db = fixture(sessions()), store = new Store('unused', 'unused', 'unused'); store.db = db;
    const first = store.listSessionCatalog({ limit: 1 });
    expect(first.total).toBe(7); expect(first.items).toHaveLength(1);
    const reopened = new Store('unused', 'unused', 'unused'); reopened.db = db;
    expect(() => reopened.listSessionCatalog({ cursor: first.nextCursor })).toThrow(/过期/);
    const added = catalogSession('new-insert', '2026-10-20T00:00:00Z');
    writeCompactSession(db, added.id, JSON.stringify(added));
    expect(() => store.listSessionCatalog({ cursor: first.nextCursor })).toThrow(/过期/);
  });

  it('expires real Store cursors after saved reviews and backup restore without reading full sessions for a page', async () => {
    const root = resolve('.local/m733-catalog-backend-tests'); mkdirSync(root, { recursive: true });
    const directory = mkdtempSync(join(root, 'lifecycle-'));
    const store = await new Store(directory, resolve('data'), resolve('node_modules/sql.js/dist/sql-wasm.wasm')).init();
    try {
      const service = new StudioService(store, { read: () => '', write: () => {} }, false);
      const profile = { ...catalogSession().profile, id: 'm733-real-profile', customerName: 'M733目录生命周期' };
      const first = (await service.generate(profile, normalizePreferences({ length: 1, requiredChars: '安', zodiacRules: false, numerology: false }))).session;
      await service.generate(profile, normalizePreferences({ length: 1, requiredChars: '宁', zodiacRules: false, numerology: false }));
      const counts = compactDecodeCounters(store.db), page = store.listSessionCatalog({ limit: 1 });
      expect(page.nextCursor).toBeTruthy(); expect(compactDecodeCounters(store.db)).toEqual(counts);
      service.saveSession({ ...first, reviewNote: '保存意见后游标失效' });
      expect(() => store.listSessionCatalog({ cursor: page.nextCursor })).toThrow(/过期/);
      const backup = store.backupBytes(), beforeRestore = store.listSessionCatalog({ limit: 1 });
      store.restore(backup);
      expect(() => store.listSessionCatalog({ cursor: beforeRestore.nextCursor })).toThrow(/过期/);
      expect(store.listSessionCatalog().total).toBe(2);
      expect(store.readVerifiedSession(first.id)?.reviewNote).toBe('保存意见后游标失效');
    } finally { store.db.close(); rmSync(directory, { recursive: true, force: true }); }
  }, 30000);

  it('defaults to 50 and caps pages at 100 while retaining total counts beyond the first page', () => {
    const db = fixture(Array.from({ length: 105 }, (_, index) => catalogSession('many-' + String(index).padStart(3, '0'))), false);
    const first = querySessionCatalog(db);
    expect(first.items).toHaveLength(50); expect(first.total).toBe(105); expect(first.matched).toBe(105);
    expect(first.profileCounts['customer-1']).toBe(105);
    const hundred = querySessionCatalog(db, { limit: 100 });
    expect(hundred.items).toHaveLength(100);
    const tail = querySessionCatalog(db, { limit: 100, cursor: hundred.nextCursor });
    expect(tail.items).toHaveLength(5); expect(tail.nextCursor).toBeUndefined();
  });

  it.each([true, false])('rejects malformed limits, dates and cursors (compact=%s)', compact => {
    const db = fixture(sessions(), compact);
    for (const limit of [0, 101, 1.5, NaN]) expect(() => querySessionCatalog(db, { limit })).toThrow(/页大小/);
    for (const dateFrom of ['2026-02-30', '2026-13-01', '2026-1-01', '0000-01-01']) expect(() => querySessionCatalog(db, { filters: { ...DEFAULT_SESSION_FILTERS, dateFrom } })).toThrow(/开始日期无效/);
    expect(() => querySessionCatalog(db, { filters: { ...DEFAULT_SESSION_FILTERS, dateFrom: '2026-10-19', dateTo: '2026-10-18' } })).toThrow(/不能晚于/);
    for (const cursor of ['', '1', '*', Buffer.from('{}').toString('base64url')]) expect(() => querySessionCatalog(db, { cursor })).toThrow(/游标无效/);
    expect(querySessionCatalog(db).items).toHaveLength(7);
  });

  it('verifies compact manifest hashes and JSON/reference positions before exposing metadata', () => {
    const db = fixture([catalogSession()], true, true);
    const [sha, rawBytes, manifestBytes, manifestSha, codec, payload] = db.exec('SELECT * FROM snapshot_roots')[0].values[0];
    db.run('UPDATE snapshot_roots SET manifest_sha=? WHERE sha=?', ['0'.repeat(64), sha]);
    expect(() => querySessionCatalog(db)).toThrow(/摘要|不一致/);
    db.run('UPDATE snapshot_roots SET manifest_sha=? WHERE sha=?', [manifestSha, sha]);
    expect(querySessionCatalog(db).items).toHaveLength(1);
    const duplicate = '{"version":"snapshot-segments/1","parts":[{"text":"{}","text":"{}"}]}';
    db.run('UPDATE snapshot_roots SET manifest_bytes=?,manifest_sha=?,payload=? WHERE sha=?', [Buffer.byteLength(duplicate), snapshotSha(Buffer.from(duplicate)), deflateRawSync(Buffer.from(duplicate)), sha]);
    expect(() => querySessionCatalog(db)).toThrow(/JSON无效/);
    db.run('UPDATE snapshot_roots SET raw_bytes=?,manifest_bytes=?,manifest_sha=?,codec=?,payload=? WHERE sha=?', [rawBytes, manifestBytes, manifestSha, codec, payload, sha]);
    const misplaced = { version: 'snapshot-segments/1', parts: [{ text: '{"id":' }, { blob: '1'.repeat(64), key: 'analysis', rawBytes: 2 }, { text: '}' }] };
    const text = JSON.stringify(misplaced);
    db.run('UPDATE snapshot_roots SET raw_bytes=?,manifest_bytes=?,manifest_sha=?,payload=? WHERE sha=?', [9, Buffer.byteLength(text), snapshotSha(Buffer.from(text)), deflateRawSync(Buffer.from(text)), sha]);
    expect(() => querySessionCatalog(db)).toThrow(/引用位置/);
  });

  it.each([true, false])('rejects mismatched row/profile identities and orphan ownership (compact=%s)', compact => {
    const value = catalogSession(), db = fixture([value], compact, compact);
    if (compact) db.run('UPDATE session_records SET profile_id=?', ['other-customer']);
    else db.run('UPDATE sessions SET json=?', [JSON.stringify({ ...value, profileId: 'other-customer' })]);
    expect(() => querySessionCatalog(db)).toThrow(/归属/);
    const mismatch = catalogSession('mismatch'); mismatch.profile.id = 'wrong-profile';
    const second = fixture([mismatch], compact, compact);
    expect(() => querySessionCatalog(second)).toThrow(/客户快照/);
  });

  it('does not upgrade a compact metadata row when its facts are unread or unavailable', () => {
    const db = fixture([catalogSession()], true, true);
    // Legacy storage permits detached leaves. The directory proves metadata only.
    db.run('DELETE FROM snapshot_blobs');
    expect(querySessionCatalog(db).items[0].candidateFactsVerified).toBe(false);
    expect(() => db.exec('SELECT json FROM sessions')).toThrow();
  });
});
