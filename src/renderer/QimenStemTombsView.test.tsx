import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Analysis, QimenChart, QimenStemTombAnalysis } from '../shared/types';
import { QimenStemTombsView } from './QimenStemTombsView';
import { QimenView } from './QimenView';

const stems = [...'甲乙丙丁戊己庚辛壬癸'];
const data: QimenStemTombAnalysis = { version: 'test-stem-tombs/1.0', profile: 'qimen-go-explicit-stem-tombs', rules: [{ id: 'test-rule', version: 'source-v1', name: '所选十干墓库电子表', conditions: ['甲未直接显出不以遁仪替代。', '主干与随芮寄干按实际宫核对。'], sources: [{ id: 'test-source', url: 'https://example.com/stem-table', commit: '1'.repeat(40), locator: 'source/ganzhi.go:1–10' }] }], checks: stems.map((stem, index) => ({ stem, targetBranch: ['未', '戌', '戌', '丑', '戌', '丑', '丑', '辰', '辰', '未'][index], targetPalace: [2, 6, 6, 8, 6, 8, 8, 4, 4, 2][index], status: index === 0 ? 'not-directly-observed' : index === 1 ? 'matched' : 'not-matched', observations: index === 0 ? [] : [{ palace: index === 1 ? 6 : 1, role: index === 1 ? 'lodged' : 'principal' }], ruleId: 'test-rule', ruleVersion: 'source-v1', evidence: [`${stem}的独立核查依据。`] })), findings: [{ stem: '乙', palace: 6, role: 'lodged', targetBranch: '戌', ruleId: 'test-rule', ruleVersion: 'source-v1', evidence: ['乙随芮寄干实际在乾六宫。'] }], warnings: ['不同表分别保留，不建立姓名落宫算法。'] };
const chart: QimenChart = { available: true, dun: '阳遁', ju: 1, yuan: '上元', solarTerm: '冬至', xun: '甲子戊', chiefStar: '天蓬', chiefDoor: '休门', palaces: [], reasons: [], warnings: [], version: 'test-qimen', stemTombs: data };
const render = (value = chart) => renderToStaticMarkup(<QimenStemTombsView chart={value}/>);

describe('independent Qimen stem-tomb reading', () => {
  it('preserves all ten source targets and distinguishes findings, negative checks and non-observable Jia', () => {
    const html = render();
    expect(html).toContain('10 项');expect(html).toContain('1 项 · 1 条位置');
    for (const check of data.checks) {
      expect(html).toContain(check.stem);expect(html).toContain(check.targetBranch);expect(html).toContain(check.evidence[0]);expect(html).toContain(`${check.ruleId} / ${check.ruleVersion}`);
    }
    for (const word of ['命中所选表位置', '未命中所选表位置', '未直接观测', '不把遁仪或其他干任意替换', '随芮寄干', '主干', '乙随芮寄干实际在乾六宫']) expect(html).toContain(word);
  });
  it('clearly separates the new Yi Xu/6 table from the old Yi Kun/2 three-stem convention without changing palace marks', () => {
    const before = structuredClone(chart), html = render();
    expect(html).toContain('本表乙取戌、乾六宫');expect(html).toContain('原有三奇模块乙取坤二宫');expect(html).toContain('两种读法分别保留，不能混用');expect(html).toContain('不能混用或据此声称名字已经通过完整奇门验局');
    expect(chart).toEqual(before);expect(html).not.toContain('class="palace-mark"');
  });
  it('does not populate historical snapshots or infer a unique chart for an unknown birth time', () => {
    const html = render({ ...chart, stemTombs: undefined });expect(html).toContain('此历史盘未记录');expect(html).toContain('不补入当前规则');expect(html).not.toContain('10 项');
    expect(render({ ...chart, available: false, reason: '时刻未知' })).toBe('');
    const unavailable = renderToStaticMarkup(<QimenView analysis={{ qimen: { ...chart, available: false, reason: '时刻未知' } } as Analysis}/>);expect(unavailable).not.toContain('十干墓库');
  });
  it('retains exact source conditions, version and locator and uses keyboard-native collapsed groups', () => {
    const html = render();for (const rule of data.rules) { for (const word of [rule.name, ...rule.conditions]) expect(html).toContain(word);for (const source of rule.sources) for (const word of [source.id, source.url, source.commit, source.locator]) expect(html).toContain(word); }
    expect(html).toContain('aria-labelledby="qimen-stem-tombs-heading"');expect(html.match(/class="qimen-stem-tomb-check /g)).toHaveLength(10);expect(html).not.toContain('<details open');expect(html).toContain(data.profile);expect(html).toContain(data.version);
  });
  it('escapes imported explanations and does not link unsafe source schemes', () => {
    const hostile = structuredClone(chart);hostile.stemTombs!.checks[0].evidence = ['<script>check()</script>'];hostile.stemTombs!.rules[0].sources[0] = { id: '<img>', url: 'javascript:attack()', commit: '<commit>', locator: '<iframe>' };hostile.stemTombs!.warnings = ['<svg onload="attack()">'];
    const html = render(hostile);for (const word of ['&lt;script&gt;', '&lt;img&gt;', '&lt;commit&gt;', '&lt;iframe&gt;', '&lt;svg']) expect(html).toContain(word);for (const word of ['<script>', '<img>', '<iframe>', '<svg', 'href="javascript:']) expect(html).not.toContain(word);
  });
});
