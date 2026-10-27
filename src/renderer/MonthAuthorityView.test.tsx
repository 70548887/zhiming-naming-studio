import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { BaziMonthAuthority, MonthAuthorityReference, MonthAuthorityTableMonth } from '../shared/types';
import { monthAuthorityReport, monthAuthorityReportStyles } from '../main/month-authority-report';
import { MonthAuthorityView } from './MonthAuthorityView';

const source = JSON.parse(readFileSync(resolve('data/month-authority-table.json'), 'utf8')) as {
  version: MonthAuthorityReference['version']; sourceId: string; title: string; months: MonthAuthorityTableMonth[];
  readings: { title: string; quote: string; sourceLocator: string; note: string }[];
  verification: { note: string }; policy: { shortMonth: string; longMonth: string };
};
function fixture(fixed = false): BaziMonthAuthority {
  return {
    status: 'not-evaluated', ruleId: 'month-reference-test', methodId: fixed ? 'sanming-first-paragraph/1.0.0' : 'no-fixed-day/1.0.0',
    method: fixed ? '所选首段表的软件24小时参考定位' : '默认不定日限，仅保存真实十二节时间区间', candidates: [], evidence: ['软件按实际秒数定位，不称原文精确到秒。'], missing: ['所有结果仍需按家庭资料人工核对。'],
    segments: [{ monthBranch: '寅', previousJie: '立春', previousJieAt: '2024-02-04T08:27:07.000Z', nextJieAt: '2024-03-05T02:22:31.000Z', startAt: '2024-02-05T08:27:07.000Z', endAt: '2024-02-05T08:27:07.000Z', elapsedStartDays: 1, elapsedEndDays: 1, candidates: [], status: 'not-evaluated', unlocated: [] }],
    reference: { version: source.version, sourceId: source.sourceId, title: source.title, months: structuredClone(source.months), alternativeViews: source.readings.map(item => ({ title: item.title, sourceQuote: item.quote, sourceLocator: item.sourceLocator, note: item.note })), limitations: [source.verification.note, source.policy.shortMonth, source.policy.longMonth] },
  };
}
function soilCandidate() {
  const row = source.months.find(item => item.monthBranch === '寅')!, segment = row.segments[0];
  return { sourceTerm: segment.sourceTerm, monthBranch: row.monthBranch, element: segment.element, fromDay: segment.fromDay, toDay: segment.toDay, sourceId: source.sourceId, sourceLocator: row.sourceLocator };
}
const both = (month: BaziMonthAuthority) => [renderToStaticMarkup(<MonthAuthorityView month={month}/>), monthAuthorityReport(month)];

describe('saved month-authority method and source-table presentation', () => {
  it('leaves evidence 1.0 records as saved without adding the new first-paragraph table', () => {
    const month = fixture();delete month.methodId;delete month.reference;
    const before = structuredClone(month);
    for (const html of both(month)) {
      expect(html).toContain('司权未评估');expect(html).toContain(month.method);
      expect(html).toContain('2024-02-04T08:27:07.000Z');
      expect(html).not.toContain('首段十二月');expect(html).not.toContain('醉醒子');expect(html).not.toContain(source.sourceId);
    }
    expect(month).toEqual(before);
  });

  it('keeps the default method uncalculated while displaying all 12 saved table rows and their precise quotes/locators', () => {
    const month = fixture(), before = structuredClone(month);
    expect(month.reference!.months).toHaveLength(12);
    for (const html of both(month)) {
      expect(html).toContain('不定日限 · 默认方法');expect(html).toContain('当前不计算固定分日候选');
      expect(html).toContain('no-fixed-day/1.0.0');expect(html).toContain(source.version);expect(html).toContain(source.sourceId);
      for (const row of source.months) {
        expect(html).toContain(row.sourceQuote);expect(html).toContain(row.sourceLocator);
        for (const segment of row.segments) expect(html).toContain(segment.sourceTerm);
      }
      expect(html).not.toContain('本次可能涉及的表段');expect(html).not.toContain('所选表单段定位');
    }
    expect(month).toEqual(before);
  });

  it('uses the original earth term for selected software positioning without inventing a stem', () => {
    const month = fixture(true), candidate = soilCandidate();month.status = 'determined';month.candidates = [candidate];month.segments[0].status = 'located';month.segments[0].candidates = [candidate];
    for (const html of both(month)) {
      expect(html).toContain('采用《三命通会》首段分日表');expect(html).toContain('所选表单段定位');
      expect(html).toContain('艮土 · 土');expect(html).toContain('不推定具体天干');expect(html).toContain('[0, 5)');
      expect(html).toContain('24小时');expect(html).toContain('左闭右开');expect(html).toContain('精确到秒');
      expect(html).not.toContain('艮土=戊');expect(html).not.toContain('艮土=己');
    }
  });

  it('preserves the union of unknown-time candidates and does not turn a one-candidate interval into certainty', () => {
    const month = fixture(true), first = soilCandidate(), row = source.months[0], segment = row.segments[1];
    const second = { ...first, sourceTerm: segment.sourceTerm, element: segment.element, fromDay: segment.fromDay, toDay: segment.toDay, normalizedStem: segment.normalizedStem };
    month.status = 'uncertain';month.candidates = [first, second];month.segments[0].candidates = [first, second];month.segments[0].status = 'multiple';month.missing.push('出生时刻未知，展示可能区间候选集合。');
    for (const html of both(month)) {
      expect(html).toContain('可能区间 · 待核对');expect(html).toContain('艮土');expect(html).toContain('丙火');expect(html).toContain('涉及多个表段');expect(html).toContain('出生时刻未知');
      expect(html).not.toContain('所选表单段定位');
    }
    month.candidates = [first];month.segments[0].candidates = [first];month.segments[0].status = 'located';
    for (const html of both(month)) expect(html).toContain('可能区间 · 待核对');
  });

  it('shows uncovered long-month intervals instead of wrapping or extending the final entry', () => {
    const month = fixture(true);month.status = 'uncertain';month.segments[0].status = 'out-of-table';month.segments[0].elapsedStartDays = 30.1;month.segments[0].elapsedEndDays = 30.3;month.segments[0].unlocated = [{ fromAt: '2024-03-05T00:00:00.000Z', toAt: '2024-03-05T02:00:00.000Z', reason: '已超过第30个24小时，首段表无覆盖，不续尾或取模。' }];
    for (const html of both(month)) {
      expect(html).toContain('含表外区间');expect(html).toContain('未定位区间');expect(html).toContain('首段表无覆盖');expect(html).toContain('2024-03-05T02:00:00.000Z');expect(html).not.toContain('本次可能涉及的表段');
    }
  });

  it('retains the complete Yujing and Zuixingzi readings side by side without treating them as calculation tables', () => {
    for (const html of both(fixture(true))) {
      expect(html).toContain('只作对读，不混入定位');
      for (const view of source.readings) for (const value of [view.title, view.quote, view.sourceLocator, view.note]) expect(html).toContain(value);
      expect(html).toContain('不擅自补齐或归一30');
      expect(html).toContain(source.verification.note);
      expect(html).toContain(source.policy.shortMonth);expect(html).toContain(source.policy.longMonth);
    }
  });

  it('escapes imported quotes, original terms, locators and limitations in both display surfaces', () => {
    const month = fixture(true);month.method = '<svg onload="attack()">';month.reference!.months[0].sourceQuote = '<script>quote()</script>';month.reference!.months[0].sourceLocator = '<iframe>';month.reference!.months[0].segments[0].sourceTerm = '<img src=x>';month.reference!.alternativeViews[0].note = '<script>comparison()</script>';month.reference!.limitations = ['<script>limit()</script>'];
    for (const html of both(month)) {
      for (const value of ['&lt;svg', '&lt;script&gt;', '&lt;iframe&gt;', '&lt;img']) expect(html).toContain(value);
      for (const value of ['<script>', '<svg', '<iframe', '<img']) expect(html).not.toContain(value);
    }
  });

  it('provides collapsed native reading groups, a labelled full table and print rules that keep captions with tables', () => {
    const html = both(fixture())[0];
    expect(html).toContain('aria-label="月令分日方法与原文参考"');
    expect(html).toContain('<caption>首段十二月原文、分日次序与软件区间</caption>');
    expect(html).toContain('<details');expect(html).not.toContain('<details open');
    expect(monthAuthorityReportStyles).toContain('.month-authority-report .month-authority-table-caption{break-after:avoid');
    expect(monthAuthorityReportStyles).toContain('white-space:pre-line');
    expect(monthAuthorityReportStyles).toContain('.month-authority-report-alternative{');
  });
});
