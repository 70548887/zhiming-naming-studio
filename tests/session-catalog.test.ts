import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SESSION_FILTERS, filterSessions, formatSessionCreatedAt, sessionBatchLabel,
  sessionCreationDay, sessionCustomerOptions, sessionFavoriteCount, sessionReportFilename, validateSessionFilters,
} from '../src/shared/session-catalog';
import { catalogSession } from './fixtures/catalog-session';

describe('saved session catalogue', () => {
  it('sorts by actual creation timestamp and breaks ties by ID without changing source records', () => {
    const latest = catalogSession('batch-c', '2026-10-18T02:01:00Z');
    const sameTimeB = catalogSession('batch-b', '2026-10-18T02:00:00Z');
    const sameTimeA = catalogSession('batch-a', '2026-10-18T10:00:00+08:00');
    const sessions = [sameTimeB, latest, sameTimeA], saved = JSON.stringify(sessions);
    expect(filterSessions(sessions, { ...DEFAULT_SESSION_FILTERS }).map(s => s.id)).toEqual(['batch-c', 'batch-a', 'batch-b']);
    expect(filterSessions(sessions, { ...DEFAULT_SESSION_FILTERS, sort: 'oldest' }).map(s => s.id)).toEqual(['batch-a', 'batch-b', 'batch-c']);
    expect(JSON.stringify(sessions)).toBe(saved);
    expect(filterSessions(sessions, { ...DEFAULT_SESSION_FILTERS })[0]).toBe(latest);
  });

  it('treats both date bounds as inclusive Shanghai creation dates across the UTC day boundary', () => {
    const before = catalogSession('before', '2026-10-17T15:59:59.999Z');
    const start = catalogSession('start', '2026-10-17T16:00:00.000Z');
    const end = catalogSession('end', '2026-10-18T15:59:59.999Z');
    const after = catalogSession('after', '2026-10-18T16:00:00.000Z');
    expect(filterSessions([before, start, end, after], { ...DEFAULT_SESSION_FILTERS, dateFrom: '2026-10-18', dateTo: '2026-10-18' }).map(s => s.id)).toEqual(['end', 'start']);
    expect(sessionCreationDay(before.createdAt)).toBe('2026-10-17');
    expect(sessionCreationDay(after.createdAt)).toBe('2026-10-19');
  });

  it('searches names and parent snapshots with trimmed Unicode-normalized input', () => {
    const one = catalogSession(), two = catalogSession('second', undefined, 'customer-2');
    two.profile.customerName = '第二位家长'; two.profile.surname = '林'; two.profile.fatherName = '林山'; two.profile.motherName = '周海';
    two.candidates.forEach(candidate => { candidate.fullName = candidate.fullName.replace('王', '林'); });
    for (const query of [' 王家长 ', '王', ' 志远 ', '陈清', ' 王安 ']) expect(filterSessions([one, two], { ...DEFAULT_SESSION_FILTERS, query }).map(s => s.id)).toEqual([one.id]);
    one.profile.customerName = 'ABC家长';
    expect(filterSessions([one, two], { ...DEFAULT_SESSION_FILTERS, query: ' ａｂｃ ' }).map(s => s.id)).toEqual([one.id]);
  });

  it('combines a specific customer with an exact single or compound surname and favorite condition', () => {
    const selected = catalogSession(), otherBatch = catalogSession('other', undefined, 'customer-2'), noFavorite = catalogSession('none');
    selected.profile.surname = '欧阳'; selected.candidates[1].favorite = true;
    otherBatch.profile.surname = '欧阳'; otherBatch.candidates[0].favorite = true;
    expect(sessionFavoriteCount(selected)).toBe(1);
    expect(filterSessions([selected, otherBatch, noFavorite], { ...DEFAULT_SESSION_FILTERS, customerId: 'customer-1', surname: ' 欧阳 ', favorite: 'has' }).map(s => s.id)).toEqual([selected.id]);
    expect(filterSessions([selected, otherBatch], { ...DEFAULT_SESSION_FILTERS, surname: '阳' })).toEqual([]);
    expect(filterSessions([selected, noFavorite], { ...DEFAULT_SESSION_FILTERS, favorite: 'none' }).map(s => s.id)).toEqual([noFavorite.id]);
    expect(filterSessions([selected, noFavorite], { ...DEFAULT_SESSION_FILTERS, query: '无匹配' })).toEqual([]);
  });

  it('rejects invalid calendar dates and reversed ranges explicitly rather than claiming no matches', () => {
    for (const dateFrom of ['2026-02-30', '2026-13-01', '2026-1-01', '2026-10', '0000-01-01']) {
      const filters = { ...DEFAULT_SESSION_FILTERS, dateFrom };
      expect(validateSessionFilters(filters)).toContain('开始日期无效');
      expect(() => filterSessions([catalogSession()], filters)).toThrow(RangeError);
    }
    expect(validateSessionFilters({ dateFrom: '2024-02-29', dateTo: '' })).toBeUndefined();
    expect(validateSessionFilters({ dateFrom: '', dateTo: '2026-02-29' })).toContain('结束日期无效');
    expect(validateSessionFilters({ dateFrom: '2026-10-19', dateTo: '2026-10-18' })).toContain('不能晚于');
  });

  it('provides creation seconds and an ID-based stable batch label independent of display order', () => {
    const session = catalogSession('9ba78e01-9451-4419-804b-148d5c2c8cab');
    expect(sessionBatchLabel(session)).toBe('批次 5c2c8cab');
    const reviewed = { ...session, reviewNote: '已审阅', createdAt: '2026-10-19T12:30:00Z' };
    expect(sessionBatchLabel(reviewed)).toBe(sessionBatchLabel(session));
    expect(formatSessionCreatedAt(session.createdAt)).toBe('2026年10月18日 00:00:00');
  });

  it('gives export files a stable batch ID and removes Windows filename separators and controls', () => {
    const session = catalogSession('abc:de/fg'); session.profile.surname = '王*?';
    expect(sessionReportFilename(session)).toBe('王__姓-批次 bc_de_fg-命名方案.pdf');
    expect(sessionReportFilename(catalogSession())).toBe('王姓-批次 00000001-命名方案.pdf');
  });

  it('keeps invalid historical creation dates visible last, and excludes them only when filtering by date', () => {
    const invalid = catalogSession('bad', 'unknown'), valid = catalogSession();
    expect(formatSessionCreatedAt(invalid.createdAt)).toBe('创建时间未记录');
    expect(filterSessions([invalid, valid], { ...DEFAULT_SESSION_FILTERS, sort: 'oldest' })).toEqual([valid, invalid]);
    expect(filterSessions([invalid, valid], { ...DEFAULT_SESSION_FILTERS, dateFrom: '2026-10-18' })).toEqual([valid]);
  });

  it('derives independent customer choices from stored profiles without needing a current customer record', () => {
    const older = catalogSession('old', '2026-10-17T00:00:00Z'), newer = catalogSession();
    newer.profile.customerName = '新称呼';
    const sameName = catalogSession('other-id', undefined, 'customer-2'); sameName.profile.customerName = '新称呼';
    const unnamed = catalogSession('unnamed', undefined, 'customer-3'); unnamed.profile.customerName = '  '; unnamed.profile.surname = '欧阳';
    expect(sessionCustomerOptions([older, sameName, newer, unnamed])).toEqual(expect.arrayContaining([
      { id: 'customer-1', label: '新称呼 · omer-1' }, { id: 'customer-2', label: '新称呼 · omer-2' }, { id: 'customer-3', label: '欧阳姓宝宝' },
    ]));
    expect(sessionCustomerOptions([older, sameName, newer, unnamed])).toHaveLength(3);
  });
});
