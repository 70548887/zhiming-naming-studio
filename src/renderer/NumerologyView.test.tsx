import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { NumerologyAnalysis } from '../shared/types';
import { numerologySelectionSnapshotKey, NumerologySummary, NumerologyView } from './NumerologyView';

const recorded: NumerologyAnalysis = {
  status: 'complete', fullName: '林安', dataVersion: 'test-data-v1',
  rule: { id: 'test-five-grid', version: '1', name: '测试公式', strokePolicy: '采用核对字形', formulaConvention: '单姓单名加虚位' },
  strokes: [
    { position: 0, inputChar: '林', role: 'surname', selectedRecordId: 'test-lin-8', status: 'selected', options: [{ id: 'test-lin-8', character: '林', glyph: '林', count: 8, sourceId: 'test-dictionary', sourceLocator: '木部·林', note: '' }] },
    { position: 1, inputChar: '安', role: 'given', selectedRecordId: 'test-an-6', status: 'selected', options: [{ id: 'test-an-6', character: '安', glyph: '安', count: 6, sourceId: 'test-dictionary', sourceLocator: '宀部·安', note: '' }] },
  ],
  grids: [
    { name: '天格', value: 9, formula: '8 + 1 = 9', element: '水' },
    { name: '人格', value: 14, formula: '8 + 6 = 14', element: '火' },
    { name: '地格', value: 7, formula: '6 + 1 = 7', element: '金' },
    { name: '外格', value: 2, formula: '1 + 1 = 2', element: '木' },
    { name: '总格', value: 14, formula: '8 + 6 = 14', element: '火' },
  ],
  threeTalents: { elements: ['水', '火', '金'], relationships: [{ from: '水', to: '火', relation: '相克' }, { from: '火', to: '金', relation: '相克' }], description: '按五行关系展示，不转为命运评分。' },
  warnings: ['测试提醒'],
};

describe('source-backed numerology display', () => {
  it('retains the selection context when a saved response recreates identical stroke data', () => {
    const freshResponse = JSON.parse(JSON.stringify(recorded)) as NumerologyAnalysis;
    expect(numerologySelectionSnapshotKey(freshResponse)).toBe(numerologySelectionSnapshotKey(recorded));
    freshResponse.grids = [];
    freshResponse.warnings = ['仅展示提醒发生变化'];
    expect(numerologySelectionSnapshotKey(freshResponse)).toBe(numerologySelectionSnapshotKey(recorded));
  });
  it('starts a new selection context when the name, confirmed glyph, rules, or source contents change', () => {
    const originalKey = numerologySelectionSnapshotKey(recorded);
    const changes: ((snapshot: NumerologyAnalysis) => void)[] = [
      snapshot => { snapshot.fullName = '林宁'; },
      snapshot => { snapshot.dataVersion = 'test-data-v2'; },
      snapshot => { snapshot.rule.version = '2'; },
      snapshot => { snapshot.rule.id = 'another-rule'; },
      snapshot => { snapshot.strokes[0].selectedRecordId = undefined; snapshot.strokes[0].status = 'ambiguous'; },
      snapshot => { snapshot.strokes[0].options[0].count = 9; },
      snapshot => { snapshot.strokes[0].options[0].sourceLocator = '修订定位'; },
      snapshot => { snapshot.strokes[0].options[0].note = '字形已复核'; },
    ];
    for (const change of changes) {
      const updated = JSON.parse(JSON.stringify(recorded)) as NumerologyAnalysis;
      change(updated);
      expect(numerologySelectionSnapshotKey(updated)).not.toBe(originalKey);
    }
  });
  it('keeps the optional module hidden when the old record has no snapshot and preference is off', () => {
    expect(renderToStaticMarkup(<NumerologyView />)).toBe('');
    expect(renderToStaticMarkup(<NumerologySummary />)).toBe('');
  });
  it('shows an explicit regeneration message for an enabled old record', () => {
    const html = renderToStaticMarkup(<NumerologyView enabled />);
    expect(html).toContain('当前方案未生成姓名数理快照');
    expect(html).toContain('请重新生成后查看');
    expect(html).not.toContain('numerology-grids');
  });
  it('shows every recorded count, source, formula, three-talents relationship, and version', () => {
    const html = renderToStaticMarkup(<NumerologyView analysis={recorded} enabled />);
    expect(html).toContain('林 · 8 画');
    expect(html).toContain('安 · 6 画');
    expect(html).toContain('test-dictionary · 木部·林');
    for (const grid of recorded.grids) {
      expect(html).toContain(grid.name);
      expect(html).toContain(grid.formula);
    }
    expect(html).toContain('三才五行 · 水 → 火 → 金');
    expect(html).toContain('水 → 火：相克');
    expect(html).toContain('test-data-v1');
    expect(html).toContain('test-five-grid / 1');
    expect(html).not.toContain('命运总分');
  });
  it('does not expose partial or stale grids while a glyph is ambiguous', () => {
    const pending: NumerologyAnalysis = { ...recorded, status: 'pending', strokes: [{ ...recorded.strokes[0], status: 'ambiguous', selectedRecordId: undefined }] };
    const html = renderToStaticMarkup(<NumerologyView analysis={pending} enabled onConfirm={() => undefined} />);
    expect(html).toContain('待核对字形');
    expect(html).toContain('请选择字形与来源');
    expect(html).toContain('保存前不生成五格');
    expect(html).toContain('test-lin-8');
    expect(html).not.toContain('numerology-grids');
    expect(html).not.toContain('8 + 1 = 9');
  });
  it('does not offer numeric free entry when a stroke source is missing', () => {
    const missing: NumerologyAnalysis = { ...recorded, status: 'pending', strokes: [{ ...recorded.strokes[0], status: 'missing', selectedRecordId: undefined, options: [] }], grids: [] };
    const html = renderToStaticMarkup(<NumerologyView analysis={missing} onConfirm={() => undefined} />);
    expect(html).toContain('尚未收录可核对的康熙笔画记录');
    expect(html).not.toContain('<input');
    expect(html).not.toContain('<select');
    expect(html).not.toContain('确认字形并重新计算');
  });
  it('disables glyph edits while the containing session is stale or busy', () => {
    const html = renderToStaticMarkup(<NumerologyView analysis={recorded} busy onConfirm={() => undefined} />);
    expect(html).toMatch(/<select[^>]*disabled=""/);
    expect(html).toMatch(/<button[^>]*disabled=""/);
  });
  it('summarizes the same saved grids for comparison, reports, and history', () => {
    const html = renderToStaticMarkup(<NumerologySummary analysis={recorded} />);
    expect(html).toContain('五格参考 · 已计算');
    expect(html).toContain('天格 9（水）');
    expect(html).toContain('总格 14（火）');
    expect(html).toContain('三才：水 → 火 → 金');
    const pendingHtml = renderToStaticMarkup(<NumerologySummary analysis={{ ...recorded, status: 'pending' }} />);
    expect(pendingHtml).toContain('待核对字形');
    expect(pendingHtml).not.toContain('天格 9');
  });
});
