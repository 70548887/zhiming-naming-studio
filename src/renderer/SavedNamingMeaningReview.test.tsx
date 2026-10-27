import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  recordedNamingMeaningReview,
  SavedNamingMeaningReview,
  SavedNamingMeaningReviewSummary,
} from './SavedNamingMeaningReview';
import type { NamingMeaningReviewRow } from '../shared/naming-meaning-review';
import type {NamingMeaningReviewSnapshotV7} from '../shared/naming-meaning-review';
/** This test's records are explicitly frozen7.0, not the new71 union. */
type SavedNamingMeaningReviewCandidate=Omit<import('./SavedNamingMeaningReview').SavedNamingMeaningReviewCandidate,'namingMeaningReview'>&{namingMeaningReview?:NamingMeaningReviewSnapshotV7};

const row: NamingMeaningReviewRow = {
  position: 1, char: '甲',
  applicability: { status: 'manual-confirmation-required' },
  review: {
    pendingIndex: 0, char: '甲', status: 'approved',
    namingMeaning: '保留在旧方案中的限定用途说明', projectWish: '不应自动展示的家庭期许',
    useKind: 'context-bound', scope: '仅限保存的语境', reason: '需核对完整名字',
    binding: null, warnings: ['保存时的提醒'],
    licensing: { dictionary: 'CC BY-ND 3.0 TW', editorial: 'CC0 1.0' },
    automaticMeaningAllowed: false, automaticSemanticCreditAllowed: false, displayOnlyReview: true,
    applicability: { mode: 'manual-confirmation-required', allowedNames: [], reason: '语境限定' },
  },
};
const recorded = (): SavedNamingMeaningReviewCandidate => ({
  givenName: '甲', namingMeaningReview: {
    version: 'naming-editorial-7.0.0', sourceId: 'naming-editorial-meanings-v7-fixed', sourceSha256: 'a'.repeat(64),
    packSha256: 'b'.repeat(64), activeVersion: 'saved-pack', givenName: '甲',
    recordState: 'recorded', automaticSemanticCreditAllowed: false, rows: [structuredClone(row)],
  },
});

describe('saved naming meaning review renderer integration', () => {
  it('adds no panel or inferred review to old candidates without a snapshot', () => {
    const old = { givenName: '甲', meaning: '旧说明', characters: [{ char: '甲', meaning: '字库最新说明' }] };
    expect(recordedNamingMeaningReview(old)).toBeUndefined();
    expect(renderToStaticMarkup(<SavedNamingMeaningReview candidate={old} />)).toBe('');
    expect(renderToStaticMarkup(<SavedNamingMeaningReviewSummary candidate={old} />)).toBe('');
  });

  it('uses only the selected candidate snapshot and preserves its rows without rewriting them', () => {
    const saved = recorded();
    const before = structuredClone(saved);
    const props = recordedNamingMeaningReview(saved);
    expect(props?.rows).toBe(saved.namingMeaningReview?.rows);
    const html = renderToStaticMarkup(<SavedNamingMeaningReview candidate={saved} />);
    expect(html).toContain('保留在旧方案中的限定用途说明');
    expect(html).toContain('保存时的提醒');
    expect(html).toContain('需人工确认');
    expect(html).not.toContain('不应自动展示的家庭期许');
    expect(saved).toEqual(before);
  });

  it('opens neither comparison nor historical details by default and offers native keyboard disclosure', () => {
    const html = renderToStaticMarkup(<SavedNamingMeaningReviewSummary candidate={recorded()} />);
    expect(html).toContain('<details class="saved-naming-review-summary">');
    expect(html).toContain('<summary>逐字补充审阅 · 查看已保存记录</summary>');
    expect(html).not.toContain(' open');
    expect(html).not.toContain('<button');
    expect(html).not.toContain('<input');
    expect(html).not.toContain('<textarea');
  });

  it.each(['unrecorded', 'not-applicable'] as const)('does not display grafted rows for explicit %s records', recordState => {
    const saved = recorded();
    (saved.namingMeaningReview as unknown as { recordState: string }).recordState = recordState;
    const props = recordedNamingMeaningReview(saved);
    expect(props?.rows).toBeUndefined();
    const detail = renderToStaticMarkup(<SavedNamingMeaningReview candidate={saved} />);
    const summary = renderToStaticMarkup(<SavedNamingMeaningReviewSummary candidate={saved} />);
    for (const html of [detail, summary]) {
      expect(html).toContain('原解释与历史记录保持原样');
      expect(html).not.toContain('保留在旧方案中的限定用途说明');
    }
  });

  it('does not infer recorded status when an incomplete snapshot contains rows', () => {
    const saved = recorded();
    delete (saved.namingMeaningReview as Partial<NonNullable<typeof saved.namingMeaningReview>>).recordState;
    const html = renderToStaticMarkup(<SavedNamingMeaningReview candidate={saved} />);
    expect(html).toContain('未记录本版补充审阅');
    expect(html).not.toContain('保留在旧方案中的限定用途说明');
  });

  it('keeps selected-history and current snapshots independent', () => {
    const selected = recorded(), current = recorded();
    current.namingMeaningReview!.rows![0].review!.namingMeaning = '另一个版本的说明';
    const history = renderToStaticMarkup(<SavedNamingMeaningReviewSummary candidate={selected} />);
    const active = renderToStaticMarkup(<SavedNamingMeaningReviewSummary candidate={current} />);
    expect(history).toContain('保留在旧方案中的限定用途说明');
    expect(history).not.toContain('另一个版本的说明');
    expect(active).toContain('另一个版本的说明');
  });

  it('does not move a saved row to a different character position', () => {
    const saved = recorded();
    saved.namingMeaningReview!.rows[0].position = 2;
    const html = renderToStaticMarkup(<SavedNamingMeaningReview candidate={saved} />);
    expect(html).not.toContain('保留在旧方案中的限定用途说明');
    expect(html).toContain('未记录本版补充审阅');
  });

  it('requires the saved name and each character to match the displayed candidate', () => {
    for (const mutate of [
      (saved: SavedNamingMeaningReviewCandidate) => { saved.givenName = '乙'; },
      (saved: SavedNamingMeaningReviewCandidate) => { saved.namingMeaningReview!.givenName = '乙'; },
      (saved: SavedNamingMeaningReviewCandidate) => { saved.namingMeaningReview!.rows[0].char = '乙'; },
      (saved: SavedNamingMeaningReviewCandidate) => { saved.namingMeaningReview!.rows.push(structuredClone(row)); },
    ]) {
      const saved = recorded(); mutate(saved);
      const html = renderToStaticMarkup(<SavedNamingMeaningReview candidate={saved} />);
      expect(html).toContain('未记录本版补充审阅');
      expect(html).not.toContain('保留在旧方案中的限定用途说明');
    }
  });

  it('does not interpret unsupported versions, sources or contradictory score flags', () => {
    for (const updates of [{ version: 'future-version' }, { sourceId: 'another-source' }, { automaticSemanticCreditAllowed: true }]) {
      const saved = recorded(); Object.assign(saved.namingMeaningReview!, updates);
      const html = renderToStaticMarkup(<SavedNamingMeaningReviewSummary candidate={saved} />);
      expect(html).toContain('未记录本版审阅');
      expect(html).not.toContain('保留在旧方案中的限定用途说明');
    }
  });

  it('renders saved text as escaped text in comparison and history disclosures', () => {
    const saved = recorded();
    saved.namingMeaningReview!.rows![0].review!.namingMeaning = '<img src=x onerror="bad()">';
    const html = renderToStaticMarkup(<SavedNamingMeaningReviewSummary candidate={saved} />);
    expect(html).toContain('&lt;img src=x onerror=&quot;bad()&quot;&gt;');
    expect(html).not.toContain('<img');
  });
});
