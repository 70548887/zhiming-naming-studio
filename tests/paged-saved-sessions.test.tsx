import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SESSION_FILTERS } from '../src/shared/session-catalog';
import { PagedSavedSessions } from '../src/renderer/PagedSavedSessions';
import type { CatalogState, SessionCatalogController } from '../src/renderer/session-catalog-state';

const controller = () => ({ setFilters: vi.fn(), retry: vi.fn(), previous: vi.fn(), next: vi.fn() }) as unknown as SessionCatalogController;
function state(overrides: Partial<CatalogState> = {}): CatalogState {
  return {
    filters: { ...DEFAULT_SESSION_FILTERS }, phase: 'ready', total: 101,
    customers: [{ id: 'customer-1', label: '王家' }, { id: 'customer-2', label: '李家' }],
    profileCounts: { 'customer-1': 80, 'customer-2': 21 }, cursors: [undefined, 'cursor-25'], pageNumber: 2, api: undefined,
    page: { total: 101, matched: 81, nextCursor: 'cursor-50', profileCounts: { 'customer-1': 80, 'customer-2': 21 }, customers: [{ id: 'customer-1', label: '王家' }], items: [
      { id: 'saved-00000026', profileId: 'customer-1', createdAt: '2026-10-17T16:00:00.000Z', reviewNote: '', dataVersion: 'old', profile: { id: 'customer-1', customerName: '王家', surname: '王' }, candidateCount: 40, favoriteCount: 7, candidateFactsVerified: false },
      { id: 'saved-00000027', profileId: 'customer-2', createdAt: '2026-10-17T15:00:00.000Z', reviewNote: '', dataVersion: 'old', profile: { id: 'customer-2', customerName: '', surname: '李' }, candidateCount: 3, favoriteCount: 0, candidateFactsVerified: false },
    ] }, ...overrides,
  };
}

describe('paginated saved-session directory', () => {
  it('renders summary counts and global customer counts without reading or filtering details during render', () => {
    const actions = controller(), select = vi.fn(), value = state();
    value.filters = { ...value.filters, query: 'outside-current-page', customerId: 'customer-1' };
    const before = JSON.stringify(value);
    const html = renderToStaticMarkup(<PagedSavedSessions state={value} controller={actions} selectedId="saved-00000026" onSelect={select} />);
    for (const text of ['匹配 81 / 共 101 份', '王家（80 份）', '李家（21 份）', '40 个名字 · 7 个收藏', '3 个名字 · 0 个收藏', '批次 00000026', '2026年10月18日 00:00:00', '李姓宝宝']) expect(html).toContain(text);
    expect(html).toContain('aria-current="true"'); expect(html).toContain('完整方案编号：saved-00000026');
    expect(actions.setFilters).not.toHaveBeenCalled(); expect(select).not.toHaveBeenCalled(); expect(JSON.stringify(value)).toBe(before);
    expect(html).not.toContain('已核验');
  });

  it('exposes the complete API filter controls and real cursor pagination', () => {
    const value = state(), actions = controller();
    value.filters = { query: '王', customerId: 'customer-1', surname: '王', dateFrom: '2026-10-01', dateTo: '2026-10-25', favorite: 'has', sort: 'oldest' };
    const html = renderToStaticMarkup(<PagedSavedSessions state={value} controller={actions} onSelect={() => {}} />);
    for (const text of ['搜索方案', '客户', '姓氏', '开始日期', '结束日期', '收藏情况', '生成时间排序', '包含起止当天', '查询全部已保存方案', '第 2 页 · 本页 2 份', '上一页', '下一页']) expect(html).toContain(text);
    expect(html).toContain('data-shortcut-search="true"'); expect(html).toContain('value="2026-10-01"');
    expect(html).toContain('<option value="has" selected="">'); expect(html).toContain('<option value="oldest" selected="">');
    expect(html.match(/disabled=""/g) ?? []).toHaveLength(0);
  });

  it('hides stale page rows on load/error or invalid date and exposes a useful retry', () => {
    const actions = controller();
    const loading = renderToStaticMarkup(<PagedSavedSessions state={state({ phase: 'loading' })} controller={actions} onSelect={() => {}} />);
    expect(loading).toContain('正在读取已保存方案目录'); expect(loading).toContain('aria-busy="true"'); expect(loading).not.toContain('40 个名字');
    const failed = renderToStaticMarkup(<PagedSavedSessions state={state({ phase: 'error', error: '目录页已过期，请重试。' })} controller={actions} onSelect={() => {}} />);
    expect(failed).toContain('方案目录读取失败'); expect(failed).toContain('目录页已过期，请重试。'); expect(failed).toContain('重试读取目录'); expect(failed).not.toContain('40 个名字');
    const invalid = state({ filters: { ...DEFAULT_SESSION_FILTERS, dateFrom: '2026-02-31' } });
    const invalidHtml = renderToStaticMarkup(<PagedSavedSessions state={invalid} controller={actions} onSelect={() => {}} />);
    expect(invalidHtml).toContain('开始日期无效'); expect(invalidHtml).toContain('筛选暂未应用'); expect(invalidHtml).toContain('aria-invalid="true"'); expect(invalidHtml).not.toContain('40 个名字'); expect(invalidHtml).not.toContain('方案目录分页');
  });

  it('distinguishes empty storage from no match and preserves draft-oriented detail feedback', () => {
    const actions = controller(), empty = state({ total: 0, pageNumber: 1, cursors: [undefined], page: { items: [], total: 0, matched: 0, customers: [], profileCounts: {} } });
    const emptyHtml = renderToStaticMarkup(<PagedSavedSessions state={empty} controller={actions} onSelect={() => {}} />);
    expect(emptyHtml).toContain('还没有保存的方案'); expect(emptyHtml).not.toContain('没有匹配的方案');
    const unmatched = state(); unmatched.page = { ...unmatched.page!, items: [], matched: 0, nextCursor: undefined };
    const unmatchedHtml = renderToStaticMarkup(<PagedSavedSessions state={unmatched} controller={actions} onSelect={() => {}} />);
    expect(unmatchedHtml).toContain('没有匹配的方案'); expect(unmatchedHtml).not.toContain('还没有保存的方案');
    const readingHtml = renderToStaticMarkup(<PagedSavedSessions state={state()} controller={actions} onSelect={() => {}} detailLoadingId="saved-00000026" detailError="方案暂未读到，当前草稿保留。" onRetryDetail={() => {}} />);
    for (const text of ['当前草稿暂不切换', '正在读取完整方案', '当前草稿保留', '重试读取方案']) expect(readingHtml).toContain(text);
    expect(readingHtml).toContain('aria-busy="true" disabled=""');
  });
});
