import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { BaziEvidenceAnalysis, BaziEvidenceRule, BaziEvidenceSource, MonthlySeasonalAnalysis } from '../shared/types';
import { monthlySeasonalReport, monthlySeasonalReportStyles } from '../main/monthly-seasonal-report';
import { baziEvidenceReport } from '../main/bazi-evidence-report';
import { MonthlySeasonalView } from './MonthlySeasonalView';
import { BaziEvidenceView } from './BaziEvidenceView';

const rule: BaziEvidenceRule = { id: 'source-monthly-rule', version: 'test/1.0', name: '固定修订逐月初始取用与条件核对', sourceIds: ['qiongtong-source'], conditions: ['原文的初始顺序及条件分支分开，已实现事实不替代旺弱。'] };
const sources: BaziEvidenceSource[] = [{ id: 'qiongtong-source', name: '穷通宝鉴固定电子修订', revision: 'oldid2294674', url: 'https://example.com/qiongtong?oldid=2294674', locator: '甲木/寅月', note: '测试固定电子转录，未校勘影印原页。' }];
function fixture(): MonthlySeasonalAnalysis {
  return { version: 'test-monthly/1.0', methodId: 'qiongtong-2294674-initial/1.0.0', status: 'initial-reference', ruleId: rule.id, dayMaster: '甲', monthBranches: ['寅'], proposedElements: ['火', '水'], requiresManualReview: true, limitations: ['尚未核定原文中的旺弱、从化及全部后续条件。'], cases: [{ dayMaster: '甲', monthBranch: '寅', sourceId: sources[0].id, sourceQuote: '原段：先用丙火，癸水為佐；得庚乃可，其他须辨。', sourceLocator: '甲木/正月;codepoint[10,35)', reviewStatus: 'initial', initialUses: [
    { stem: '丙', element: '火', role: 'first', sequence: 1, quote: '先用丙火' },
    { stem: '癸', element: '水', role: 'support', sequence: 2, quote: '癸水為佐' },
  ], conditionBranches: [
    { id: 'presence', sourceQuote: '得庚乃可', sourceLocator: '甲木/正月;codepoint[25,30)', result: 'met', predicate: { kind: 'stem', stem: '庚', scope: 'any', includeDayMaster: false, present: true }, proposedUses: [{ stem: '庚', element: '金', role: 'parallel', sequence: 1, quote: '得庚乃可' }], observedEvidence: ['月支申藏庚，已确定位置。'], missing: ['旺弱及合化条件未核。'] },
    { id: 'absence', sourceQuote: '無丁則另論', sourceLocator: '甲木/正月;codepoint[31,37)', result: 'not-met', proposedUses: [], observedEvidence: ['时干丁已出现，不满足该无丁条件。'], missing: [] },
    { id: 'unknown-hour', sourceQuote: '若時上見辛', sourceLocator: '甲木/正月;codepoint[38,44)', result: 'unknown', proposedUses: [{ stem: '辛', element: '金', role: 'unranked', sequence: 1, quote: '若時上見辛' }], observedEvidence: ['当前时柱未知。'], missing: ['缺失时柱，未见不代表无。'] },
    { id: 'strength', sourceQuote: '木旺火多須辨', sourceLocator: '甲木/正月;codepoint[45,51)', result: 'not-implemented', proposedUses: [], observedEvidence: [], missing: ['木旺、火多未实现，不使用任意阈值。'] },
  ], stemFacts: [{ stem: '庚', exposedPositions: [], hiddenPositions: ['月柱申藏干'], dayMasterSame: false, absence: 'not-seen' }, { stem: '辛', exposedPositions: [], hiddenPositions: [], dayMasterSame: false, absence: 'unknown' }], unresolved: ['初提取用不等于最终用神。'] }] };
}
const both = (analysis?: MonthlySeasonalAnalysis) => [renderToStaticMarkup(<MonthlySeasonalView analysis={analysis} rule={rule} sources={sources}/>), monthlySeasonalReport(analysis, rule, sources)];
function evidence(monthlySeasonal?: MonthlySeasonalAnalysis): BaziEvidenceAnalysis {
  return { version: 'test-evidence/2', profile: 'facts-and-independent-opinions', rules: [rule], sources, dayMaster: { stem: '甲', element: '木' }, timeBasis: { timezone: 'Asia/Shanghai', timeUnknown: false, ambiguous: false, description: '按实际民用出生记录' }, stems: [], hiddenStems: [], relations: [], monthAuthority: { status: 'not-evaluated', ruleId: 'month-authority-test', method: '历史区间', candidates: [], segments: [], evidence: [], missing: [] }, opinions: [
    { method: 'fuyi', profile: 'original-fuyi', status: 'candidate', elements: ['木'], unfavorable: [], evidence: ['原有扶抑意见保留'], missing: [], requiresManualReview: true, ruleId: 'fuyi' },
    { method: 'tiaohou', profile: 'original-coarse-seasonal', status: 'pending', elements: [], unfavorable: [], evidence: ['原有粗粒度季节意见保留'], missing: [], requiresManualReview: true, ruleId: 'seasonal' },
  ], patternCandidates: [], transformationEvidence: [], limitations: [], ...(monthlySeasonal ? { monthlySeasonal } : {}) };
}

describe('independent monthly seasonal source opinion UI and report', () => {
  it('does not populate old records from the current table or attach source metadata to an absent snapshot', () => {
    for (const html of both()) {
      expect(html).toContain('本版未记录');expect(html).toContain('不会补入当前资料或重新推算');
      expect(html).not.toContain('oldid2294674');expect(html).not.toContain('先用丙火');expect(html).not.toContain('qiongtong-source');
    }
  });

  it('shows the new disabled state separately from an old unrecorded state without producing a current case', () => {
    const value = fixture();value.methodId = 'no-monthly/1.0.0';value.status = 'not-selected';value.cases = [];value.proposedElements = [];
    for (const html of both(value)) {
      expect(html).toContain('未启用');expect(html).toContain('未选择逐月');expect(html).toContain('不计算该资料的取用');
      expect(html).not.toContain('本版未记录');expect(html).not.toContain('先用丙火');
    }
  });

  it('preserves source-attributed original use order, roles and every exact qualifying quotation', () => {
    const value = fixture(), before = structuredClone(value);
    for (const html of both(value)) {
      expect(html.indexOf('丙 · 火')).toBeLessThan(html.indexOf('癸 · 水'));
      for (const word of ['原文先用', '原文辅用', '原文并列', '原文未定先后', '原文序 1', '原文序 2', value.cases[0].sourceQuote, value.cases[0].sourceLocator, ...value.cases[0].initialUses.map(use => use.quote)]) expect(html).toContain(word);
      expect(html).toContain('初步取用');expect(html).toContain('不合成为唯一喜用神');expect(html).toContain('不改变候选姓名评分');
    }
    expect(value).toEqual(before);
  });

  it('distinguishes all four condition states while retaining original sentence, facts, unimplemented factors and missing information', () => {
    const value = fixture();
    for (const html of both(value)) {
      for (const word of ['满足已实现条件', '未满足已实现条件', '资料不足 · 未知', '该条件尚未实现']) expect(html).toContain(word);
      for (const branch of value.cases[0].conditionBranches) for (const word of [branch.id, branch.sourceQuote, branch.sourceLocator, ...branch.observedEvidence, ...branch.missing, ...branch.proposedUses.map(use => use.quote)]) expect(html).toContain(word);
      expect(html).toMatch(/不(?:能)?代替旺弱、从格、合化或全部调候条件/);
    }
    const html = both(value)[0];
    expect(html).toContain('class="monthly-seasonal-branch met"');expect(html).toContain('class="monthly-seasonal-branch not-met"');expect(html).toContain('class="monthly-seasonal-branch unknown"');expect(html).toContain('class="monthly-seasonal-branch not-implemented"');
  });

  it('keeps unknown hour absence uncertain and distinguishes visible from hidden stem locations', () => {
    for (const html of both(fixture())) {
      expect(html).toContain('月柱申藏干');expect(html).toContain('明干位置');expect(html).toContain('藏干位置');
      expect(html).toContain('“未见”不等于“无”');expect(html).toContain('不推定缺失时柱');
      expect(html).toContain('缺失柱');expect(html).toContain('不能判无');
    }
  });

  it('keeps multiple uncertain month cases as reading only, without promoting them to an applied opinion', () => {
    const value = fixture();value.status = 'pending';value.monthBranches = ['丑', '寅'];value.cases.push({ ...structuredClone(value.cases[0]), monthBranch: '丑', sourceQuote: '另一月原段，不拼接取用。' });value.proposedElements = [];
    for (const html of both(value)) {
      expect(html).toContain('待核对 · 暂不应用');expect(html).toContain('暂不应用其中的取用');
      expect(html).toContain('甲日 · 寅月');expect(html).toContain('甲日 · 丑月');expect(html).toContain('另一月原段，不拼接取用。');expect(html).toContain('暂未提出');
    }
    value.cases = [];
    for (const html of both(value)) expect(html).toContain('不从相近月份借用取用');
  });

  it('does not invent a main or assisting stem for ambiguous initial extraction', () => {
    const value = fixture();value.cases[0].reviewStatus = 'needs-review';value.cases[0].initialUses = [];value.cases[0].conditionBranches = [];value.cases[0].unresolved = ['该段无明确专月初句，未移植现代取用表。'];value.proposedElements = [];
    for (const html of both(value)) {
      expect(html).toContain('提取有歧义 · 待审');expect(html).toContain('未提取可明确识别的主辅顺序');expect(html).toContain(value.cases[0].unresolved[0]);expect(html).not.toContain('原文先用');
    }
  });

  it('prints only supplied current cases and keeps source and rule locators traceable without a full catalog', () => {
    const value = fixture();
    for (const html of both(value)) {
      for (const word of [rule.id, rule.version, rule.name, ...rule.conditions, ...value.limitations]) expect(html).toContain(word);
      for (const source of sources) for (const word of [source.id, source.name, source.revision, source.url, source.locator, source.note]) expect(html).toContain(word);
      expect(html).not.toContain('甲日 · 卯月');expect(html).not.toContain('癸日 · 亥月');
    }
    const html = monthlySeasonalReport(value, rule, sources);
    expect(html).toContain('不附全量逐月表');expect(html.match(/class="monthly-seasonal-report-case"/g)).toHaveLength(1);
    expect(monthlySeasonalReportStyles).toContain('break-after:avoid');expect(monthlySeasonalReportStyles).toContain('white-space:pre-line');expect(monthlySeasonalReportStyles).toContain('.monthly-seasonal-report-branch{');
  });

  it('escapes imported source prose, conditions, roles and URLs and never links non-https schemes', () => {
    const value = fixture();value.cases[0].sourceQuote = '<script>source()</script>';value.cases[0].sourceLocator = '<iframe>';value.cases[0].initialUses[0].quote = '<img src=x>';value.cases[0].conditionBranches[0].sourceQuote = '<script>condition()</script>';value.limitations = ['<svg onload="attack()">'];
    const hostileRule = { ...rule, conditions: ['<script>rule()</script>'] }, hostileSources = [{ ...sources[0], url: 'javascript:attack()', name: '<script>sourceName()</script>' }];
    for (const html of [renderToStaticMarkup(<MonthlySeasonalView analysis={value} rule={hostileRule} sources={hostileSources}/>), monthlySeasonalReport(value, hostileRule, hostileSources)]) {
      for (const word of ['&lt;script&gt;', '&lt;iframe&gt;', '&lt;img', '&lt;svg']) expect(html).toContain(word);
      for (const word of ['<script>', '<iframe', '<img', '<svg', 'href="javascript:']) expect(html).not.toContain(word);
    }
  });

  it('adds an independent block while preserving the existing two opinion cards and their coarse-seasonal label', () => {
    const value = evidence(fixture());
    const html = renderToStaticMarkup(<BaziEvidenceView evidence={value}/>), report = baziEvidenceReport(value);
    expect(html.match(/class="bazi-evidence-opinion"/g)).toHaveLength(2);
    for (const output of [html, report]) for (const word of ['原有扶抑意见保留', '原有粗粒度季节意见保留', '季节意象 · 非完整调候', '逐月调候资料参考', '先用丙火']) expect(output).toContain(word);
    delete value.monthlySeasonal;
    for (const output of [renderToStaticMarkup(<BaziEvidenceView evidence={value}/>), baziEvidenceReport(value)]) {
      expect(output).toContain('本版未记录');expect(output).not.toContain('先用丙火');
    }
  });

  it('strips only wiki display markers while retaining original quoted characters, unknown templates and escaped HTML', () => {
    const value = fixture(), before = structuredClone(value);
    value.cases[0].sourceQuote = "=== 甲木 ===\n'''正月甲木'''，''先用丙火''。{{PUA|待核}} <script>literal()</script>";
    value.cases[0].initialUses[0].quote = "'''先用丙火'''";
    value.cases[0].conditionBranches[0].sourceQuote = "''得庚乃可''";
    const raw = structuredClone(value);
    for (const html of both(value)) {
      expect(html).toContain('去除排版标记');expect(html).toContain('正月甲木');expect(html).toContain('先用丙火');expect(html).toContain('得庚乃可');
      expect(html).toContain('{{PUA|待核}}');expect(html).toContain('&lt;script&gt;literal()&lt;/script&gt;');
      expect(html).not.toContain('===');expect(html).not.toContain("'''");expect(html).not.toContain('&#39;&#39;&#39;');expect(html).not.toContain('&#x27;&#x27;&#x27;');expect(html).not.toContain('<script>');
    }
    expect(value).toEqual(raw);expect(value).not.toEqual(before);
  });
});
