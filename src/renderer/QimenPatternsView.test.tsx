import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Analysis, QimenChart, QimenPatternAnalysis, QimenPatternLayer } from '../shared/types';
import { qimenPatternsReport, qimenPatternsReportStyles } from '../main/qimen-patterns-report';
import { QimenPatternsView } from './QimenPatternsView';
import { QimenView } from './QimenView';

const ruleRows: { id: string; name: string; layer: QimenPatternLayer; matched: boolean }[] = [
  { id: 'test-menpo', name: '门迫', layer: 'doors', matched: true },
  { id: 'test-jixing', name: '六仪击刑', layer: 'heaven-stems', matched: false },
  { id: 'test-rumu', name: '三奇入墓（乙丙丁）', layer: 'heaven-stems', matched: true },
  { id: 'test-star-fuyin', name: '星盘原位（九星伏吟）', layer: 'stars', matched: true },
  { id: 'test-star-fanyin', name: '星盘对宫（九星反吟）', layer: 'stars', matched: false },
  { id: 'test-door-fuyin', name: '门盘原位（八门伏吟）', layer: 'doors', matched: false },
  { id: 'test-door-fanyin', name: '门盘对宫（八门反吟）', layer: 'doors', matched: false },
];
const patterns: QimenPatternAnalysis = {
  version: 'test-structure/1', school: 'zhuanpan-chaibu-futou-kun2',
  rules: ruleRows.map(rule => ({ id: rule.id, version: 'test-v1', name: rule.name, conditions: [`${rule.name}测试条件，按指定盘层核对。`], sources: [{ id: `source-${rule.id}`, commit: 'abc0123456789012345678901234567890123456', url: `https://example.com/${rule.id}`, locator: `fixture/${rule.id}:L1-L9` }] })),
  checks: ruleRows.map(rule => ({ ruleId: rule.id, ruleVersion: 'test-v1', layer: rule.layer, status: rule.matched ? 'matched' : 'not-matched', palaces: rule.matched ? [2] : [], evidence: [`${rule.name}的完整核查依据${rule.matched ? '已触发' : '未触发'}。`] })),
  findings: [
    { kind: 'menpo', label: '门迫', layer: 'doors', palaces: [2], subjects: ['伤门'], ruleId: 'test-menpo', ruleVersion: 'test-v1', evidence: ['伤门木克坤宫土。'] },
    { kind: 'rumu', label: '三奇入墓', layer: 'heaven-stems', palaces: [2], subjects: ['乙（主干）'], ruleId: 'test-rumu', ruleVersion: 'test-v1', evidence: ['乙在坤二宫，按三奇表核对。'] },
    { kind: 'rumu', label: '三奇入墓', layer: 'heaven-stems', palaces: [6], subjects: ['丙（寄干）'], ruleId: 'test-rumu', ruleVersion: 'test-v1', evidence: ['丙在乾六宫，寄干按指定规则计入。'] },
    { kind: 'fuyin', label: '九星伏吟', layer: 'stars', palaces: [1, 2, 3, 4, 6, 7, 8, 9], subjects: ['八方星盘'], ruleId: 'test-star-fuyin', ruleVersion: 'test-v1', evidence: ['八方九星均在原宫，中五不另列。'] },
  ], warnings: ['本轮记录盘面关系，不建立名字落宫映射。'],
};
const chart: QimenChart = {
  available: true, dun: '阳遁', ju: 1, yuan: '上元', solarTerm: '冬至', xun: '甲子戊', chiefStar: '天蓬', chiefDoor: '休门',
  palaces: [{ number: 2, direction: '西南', trigram: '坤', earth: '乙', heaven: '乙', star: '天芮/天禽', door: '伤门', god: '六合', marks: ['门迫（伤门）', '三奇入墓（乙主干）'] }], reasons: ['甲己符头拆补'], warnings: ['传统文化参考'], version: 'test-qimen', patterns,
};
const both = (input: QimenChart) => [renderToStaticMarkup(<QimenPatternsView chart={input}/>), qimenPatternsReport(input)];

describe('recorded layered Qimen structure display', () => {
  it('separates checked rules, matched findings, matched rules, and the negative checklist', () => {
    const [html, report] = both(chart);
    expect(html).toContain('7 项规则');
    expect(html).toContain('4 条');
    expect(html).toContain('3 项');
    expect(report).toContain('已核查 7 项规则 · 命中 4 条标记 · 涉及 3 项规则');
    for (const output of [html, report]) {
      expect(output).toContain('未命中清单');
      for (const rule of ruleRows.filter(rule => !rule.matched)) expect(output).toContain(rule.name);
      for (const rule of ruleRows) expect(output).toContain(rule.name);
      for (const label of ['八门盘', '天盘干', '九星盘', '时家转盘', '甲己符头拆补', '中五寄坤二', '天禽随天芮', 'test-structure/1']) expect(output).toContain(label);
    }
    expect(html.match(/<details /g)).toHaveLength(7);
    expect(html.match(/<summary>/g)).toHaveLength(7);
    expect(report.match(/<article class="qimen-pattern-report-rule">/g)).toHaveLength(7);
  });

  it('preserves every saved condition, positive and negative evidence, source version and locator', () => {
    for (const output of both(chart)) {
      for (const check of patterns.checks) {
        expect(output).toContain(`${check.ruleId} / ${check.ruleVersion}`);
        for (const evidence of check.evidence) expect(output).toContain(evidence);
      }
      for (const finding of patterns.findings) {
        for (const evidence of finding.evidence) expect(output).toContain(evidence);
        for (const subject of finding.subjects) expect(output).toContain(subject);
      }
      for (const rule of patterns.rules) {
        for (const condition of rule.conditions) expect(output).toContain(condition);
        for (const source of rule.sources) for (const value of [source.id, source.commit, source.locator, source.url]) expect(output).toContain(value);
      }
      for (const text of ['坤二宫', '乾六宫', '盘面关系', '名字落宫映射']) expect(output).toContain(text);
      for (const unsupported of ['命运总分', '姓名大凶', '名字吉凶', '十干入墓']) expect(output).not.toContain(unsupported);
    }
  });

  it('retains explicit no-hit results when all checked rules are negative', () => {
    const negative: QimenChart = { ...chart, patterns: { ...patterns, findings: [], checks: patterns.checks.map(check => ({ ...check, status: 'not-matched', palaces: [], evidence: [`${check.ruleId}未触发`] })) } };
    const [html, report] = both(negative);
    expect(html).toContain('0 条');
    expect(report).toContain('命中 0 条标记 · 涉及 0 项规则');
    for (const output of [html, report]) for (const check of negative.patterns!.checks) expect(output).toContain(check.evidence[0]);
    expect(html.match(/qimen-pattern-status "/g)).toHaveLength(7);
    expect(html).not.toContain('qimen-pattern-findings');
    expect(report).not.toContain('qimen-pattern-report-result');
  });

  it('leaves historical records without a snapshot uncalculated', () => {
    for (const output of both({ ...chart, patterns: undefined })) {
      expect(output).toContain('原记录未包含');
      expect(output).toContain('请按出生资料重新分析');
      expect(output).not.toContain('test-structure/1');
      expect(output).not.toContain('已核查');
      expect(output).not.toContain('未命中清单');
    }
  });

  it('suppresses structure conclusions for unavailable birth time even with an attached stale snapshot', () => {
    const unknown = { ...chart, available: false, reason: '出生时刻未知' };
    expect(both(unknown)).toEqual(['', '']);
    const html = renderToStaticMarkup(<QimenView analysis={{ qimen: unknown } as Analysis}/>);
    expect(html).toContain('出生时刻未知');
    expect(html).not.toContain('结构标记');
    expect(html).not.toContain('门迫');
  });

  it('escapes all imported narrative fields and suppresses unsafe source links', () => {
    const hostile = structuredClone(chart);
    const data = hostile.patterns!;
    data.rules[0].name = '<svg onload="attack()">';
    data.rules[0].conditions = ['<script>condition()</script>'];
    data.rules[0].sources[0] = { id: '<img src=x>', commit: '<commit>', locator: '<iframe>', url: 'javascript:attack()' };
    data.checks[0].evidence = ['<script>check()</script>'];
    data.findings[0].label = '<script>label()</script>';
    data.findings[0].subjects = ['<script>subject()</script>'];
    data.findings[0].evidence = ['<script>finding()</script>'];
    data.warnings = ['<img src=x onerror="attack()">'];
    for (const output of both(hostile)) {
      for (const escaped of ['&lt;script&gt;', '&lt;svg', '&lt;img', '&lt;commit&gt;', '&lt;iframe&gt;']) expect(output).toContain(escaped);
      for (const raw of ['<script>', '<svg', '<img', '<iframe', 'href="javascript:']) expect(output).not.toContain(raw);
    }
  });

  it('shows compact individually labelled palace marks and keyboard-native evidence groups', () => {
    const html = renderToStaticMarkup(<QimenView analysis={{ qimen: chart } as Analysis}/>);
    expect(html).toContain('class="palace-mark" title="门迫（伤门）"');
    expect(html).toContain('class="palace-mark" title="三奇入墓（乙主干）"');
    expect(html).toContain('aria-labelledby="qimen-patterns-heading"');
    expect(html).toContain('href="https://example.com/test-menpo" target="_blank" rel="noreferrer"');
    expect(qimenPatternsReportStyles).toContain('.qimen-pattern-report-rule{break-inside:avoid');
    expect(qimenPatternsReportStyles).toContain('.qimen-patterns-report{break-before:page');
  });
});
