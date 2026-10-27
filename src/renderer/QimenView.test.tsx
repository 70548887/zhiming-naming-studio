import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Analysis, QimenChart } from '../shared/types';
import { qimenAuxiliaryReport } from '../main/qimen-report';
import { QimenAuxiliaryView, QimenView } from './QimenView';

const chart: QimenChart = {
  available: true, dun: '阳遁', ju: 1, yuan: '上元', solarTerm: '冬至', xun: '甲子戊', chiefStar: '天蓬', chiefDoor: '休门',
  palaces: [{ number: 6, direction: '西北', trigram: '乾', earth: '己', heaven: '壬', star: '天心', door: '开门', god: '六合', marks: ['时旬空（戌、亥）'] }], reasons: ['甲己符头拆补'], warnings: ['传统文化参考'], version: 'test-qimen',
  auxiliary: {
    version: 'hour-xunkong-yima/1.0.0', hourGanzhi: '甲子', scope: 'hour',
    rules: [
      { id: 'hour-xunkong', version: '1.0.0', name: '时旬空', conditions: ['按时柱所在旬查空支；按固定地支宫位标注。'], sources: [{ id: 'fixture-calendar', url: 'https://github.com/example/calendar', commit: '1234567890abcdef', locator: 'src/xun.ts:L10' }] },
      { id: 'hour-yima', version: '1.0.0', name: '时驿马', conditions: ['按时支所属三合查驿马。'], sources: [{ id: 'fixture-qimen', url: 'https://github.com/example/qimen', commit: 'abcdef0123456789', locator: 'src/horse.ts:L20' }] },
    ],
    markers: [
      { kind: 'xunkong', label: '时旬空', branches: ['戌', '亥'], palaces: [6], ruleId: 'hour-xunkong', ruleVersion: '1.0.0', evidence: ['甲子时属甲子旬，空支为戌、亥。', '戌、亥同属固定乾六宫。'] },
      { kind: 'yima', label: '时驿马', branches: ['寅'], palaces: [8], ruleId: 'hour-yima', ruleVersion: '1.0.0', evidence: ['时支子属申子辰组，驿马为寅。', '寅属固定艮八宫。'] },
    ], warnings: ['旬空只作用于标注的空支；同宫另一地支不随之判空。'],
  },
};
const asAnalysis = (qimen: QimenChart) => ({ qimen } as Analysis);

describe('recorded hourly Qimen auxiliary display', () => {
  it('shows the saved hour, branches, fixed palaces, evidence, rules, sources, and chart marks', () => {
    const html = renderToStaticMarkup(<QimenView analysis={asAnalysis(chart)}/>);
    for (const text of ['时柱依据', '甲子', '时支 子', '戌、亥', '乾六宫', '寅', '艮八宫', '时旬空（戌、亥）', '时支子属申子辰组', 'hour-xunkong / 1.0.0', 'hour-xunkong-yima/1.0.0', 'src/horse.ts:L20', '1234567890abcdef']) expect(html).toContain(text);
    expect(html).toContain('<details');
    expect(html).toContain('href="https://github.com/example/calendar"');
    expect(html).toContain('rel="noreferrer"');
    expect(html).not.toContain('姓名验算');
    expect(html).not.toContain('名字吉凶');
  });
  it('leaves old records without an auxiliary snapshot uncalculated in UI and report', () => {
    const old: QimenChart = { ...chart, auxiliary: undefined, palaces: [] };
    const html = renderToStaticMarkup(<QimenAuxiliaryView chart={old}/>);
    const report = qimenAuxiliaryReport(old);
    expect(html).toContain('当前记录未生成旬空、驿马快照');
    expect(html).toContain('不自动补算');
    expect(report).toContain('当前记录未生成旬空、驿马快照');
    expect(report).not.toContain('qimen-auxiliary-report');
    for (const output of [html, report]) { expect(output).not.toContain('甲子'); expect(output).not.toContain('乾六宫'); }
  });
  it('suppresses every auxiliary conclusion when birth time is unknown, even with a stale snapshot', () => {
    const unknown = { ...chart, available: false, reason: '出生时刻未知' };
    expect(renderToStaticMarkup(<QimenAuxiliaryView chart={unknown}/>)).toBe('');
    expect(qimenAuxiliaryReport(unknown)).toBe('');
    const html = renderToStaticMarkup(<QimenView analysis={asAnalysis(unknown)}/>);
    expect(html).toContain('出生时刻未知');
    expect(html).not.toContain('旬空');
    expect(html).not.toContain('甲子');
  });
  it('uses snapshot evidence in both outputs and never adds inferred name judgements', () => {
    const report = qimenAuxiliaryReport(chart);
    expect(report).toContain('class="qimen-auxiliary-report"');
    for (const marker of chart.auxiliary!.markers) for (const evidence of marker.evidence) expect(report).toContain(evidence);
    for (const text of ['时柱依据：甲子', '驿马取时支：子', '乾六宫', '艮八宫', 'hour-xunkong-yima/1.0.0', 'fixture-calendar · 1234567890ab', 'docs/QIMEN-MARKERS.md']) expect(report).toContain(text);
    expect(report).not.toContain('abcdef0123456789');
    expect(report).not.toContain('名字吉凶');
  });
  it('escapes imported descriptive fields and suppresses non-HTTPS source links', () => {
    const hostile = structuredClone(chart);
    hostile.auxiliary!.warnings = ['<img src=x onerror="bad()">'];
    hostile.auxiliary!.markers[0].evidence = ['<script>alert(1)</script>'];
    hostile.auxiliary!.rules[0].sources[0].url = 'javascript:alert(1)';
    hostile.auxiliary!.rules[0].sources[0].locator = '<svg onload="bad()">';
    const html = renderToStaticMarkup(<QimenAuxiliaryView chart={hostile}/>);
    const report = qimenAuxiliaryReport(hostile);
    for (const output of [html, report]) { expect(output).toContain('&lt;script&gt;'); expect(output).toContain('&lt;img'); expect(output).not.toContain('<script>'); expect(output).not.toContain('<img'); expect(output).not.toContain('href="javascript:'); }
    expect(html).toContain('&lt;svg');
  });
});
