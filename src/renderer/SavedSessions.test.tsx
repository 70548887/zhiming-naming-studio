import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { catalogSession } from '../../tests/fixtures/catalog-session';
import { SavedSessions } from './SavedSessions';

describe('saved session catalogue display', () => {
  it('distinguishes a genuinely empty library from a filtered empty result', () => {
    const html = renderToStaticMarkup(<SavedSessions sessions={[]} onSelect={() => {}} />);
    expect(html).toContain('还没有保存的方案');
    expect(html).toContain('生成的每一组名字');
    expect(html).not.toContain('没有匹配的方案');
    expect(html).not.toContain('清空筛选条件');
  });
  it('exposes every planned filter with labels and an accessible current batch', () => {
    const session = catalogSession(); session.candidates[1].favorite = true;
    const html = renderToStaticMarkup(<SavedSessions sessions={[session]} selectedId={session.id} onSelect={() => {}} />);
    for (const text of ['搜索方案', '客户', '姓氏', '开始日期', '结束日期', '收藏情况', '生成时间排序', '包含起止当天', '清空条件', '匹配 1 / 共 1 份', '批次 00000001', '2026年10月18日 00:00:00', '2 个名字 · 1 个收藏']) expect(html).toContain(text);
    expect(html).toContain('aria-current="true"');
    expect(html).toContain('data-shortcut-search="true"');
    expect(html).toContain('完整方案编号：saved-00000001');
  });
  it('renders the newest batch first, shows counts separately, and blocks selection while busy', () => {
    const older = catalogSession('older', '2026-10-16T00:00:00Z'), latest = catalogSession('latest');
    latest.candidates.forEach(candidate => { candidate.favorite = true; });
    const html = renderToStaticMarkup(<SavedSessions sessions={[older, latest]} busy onSelect={() => {}} />);
    expect(html.indexOf('批次 latest')).toBeLessThan(html.indexOf('批次 older'));
    expect(html).toContain('2 个名字 · 2 个收藏');
    expect(html).toContain('2 个名字 · 0 个收藏');
    expect(html).toContain('aria-busy="true"');
    expect((html.match(/class="session-item catalog-item [^"]*"[^>]*disabled=""/g) || []).length).toBe(2);
  });
});
