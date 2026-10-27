import { describe, expect, it } from 'vitest';
import { analyzeProfile } from '../src/domain/engine';
import { birthTimeReport } from '../src/main/birth-time-report';
import { baziEvidenceReport } from '../src/main/bazi-evidence-report';
import { reportHTML } from '../src/main/report';
import { catalogSession } from './fixtures/catalog-session';
import type { StudioSettings } from '../src/shared/types';

const solarProfile = () => ({ ...catalogSession().profile, birthDate: '2024-06-01', birthTime: '00:30:00', timeBasis: 'apparent-solar' as const, birthLongitude: -74.006 });
const settings: StudioSettings = { studioName: '时间报告', contact: '', logoDataUrl: '', apiBaseUrl: '', model: '', timeoutMs: 5000, hasApiKey: false, useAi: false };
describe('saved birth time PDF report', () => {
  it('does not backfill missing old conversion and uses the stored civil clock without solar labels', () => {
    expect(birthTimeReport()).toBe('');
    const trace = analyzeProfile(catalogSession().profile).bazi.timeBasis!, html = birthTimeReport(trace);
    expect(html).toContain('本方案采用：<strong>民用时间'); expect(html).toContain('未应用真太阳时修正'); expect(html).toContain(trace.calculationDateTime!);
  });
  it('retains original civil birth and solar calculation with attribution and signed correction', () => {
    const profile = solarProfile(), analysis = analyzeProfile(profile), trace = analysis.bazi.timeBasis!, html = reportHTML({ ...catalogSession(), profile, analysis }, settings);
    for (const value of ['出生时间取法与换算', '原民用记录：2024-06-01 00:30:00', trace.calculationDateTime!, '西经 74.006°', trace.sourceId!, '日、时干支按所选钟表', 'UTC 时差 +480 分钟', '经度修正 -776.024 分钟']) expect(html).toContain(value);
    expect(html).toContain('出生：2024-06-01 00:30:00'); expect(html).not.toContain('出生：2024-05-31');
  });
  it('includes unknown interval, all candidate dates and paused day-master evidence without noon', () => {
    const analysis = analyzeProfile({ ...solarProfile(), birthTime: '', timeUnknown: true }), trace = analysis.bazi.timeBasis!;
    const html = birthTimeReport(trace) + baziEvidenceReport(analysis.bazi.evidence, trace);
    for (const value of ['不以中午代替', '区间末秒包含', '日主待定，本项证据暂停', ...trace.dayCandidates]) expect(html).toContain(value);
    expect(html).not.toContain('当前记录未生成'); expect(html).not.toContain('原方案未包含八字分层证据'); expect(html).not.toContain('12:00:00');
  });
  it('escapes all stored text, URLs and notes rather than injecting source content', () => {
    const trace = analyzeProfile(solarProfile()).bazi.timeBasis!;
    const html = birthTimeReport({ ...trace, timezone: '<zone>', sourceId: '<source>', policies: ['<img onerror=bad>'], warnings: ['<script>bad</script>'] });
    expect(html).toContain('&lt;zone&gt;'); expect(html).toContain('&lt;source&gt;'); expect(html).toContain('&lt;img'); expect(html).not.toContain('<script>bad');
  });
  it('explains an interval with no common pillar without printing an empty table', () => {
    const profile = { ...solarProfile(), birthDate: '2024-02-04', birthTime: '', timeUnknown: true }, analysis = analyzeProfile(profile);
    expect(analysis.bazi.pillars).toEqual([]);
    const html = reportHTML({ ...catalogSession(), profile, analysis, originalFavorable: [] }, settings);
    expect(html).toContain('当前出生区间内没有可统一确定的柱'); expect(html).not.toContain('<table><tr></tr><tr></tr></table>');
    expect(html).toContain('系统喜用候选：未提出');
  });
  it('groups the short paused evidence and unavailable Qimen explanation with the basic birth analysis before the detailed conversion page', () => {
    const profile = { ...solarProfile(), birthTime: '', timeUnknown: true }, analysis = analyzeProfile(profile);
    const html = reportHTML({ ...catalogSession(), profile, analysis, originalFavorable: [] }, settings);
    const summaryStart = html.indexOf('<div class="paused-analysis-summary">'), timePageStart = html.indexOf('<section class="birth-time-report">');
    expect(summaryStart).toBeGreaterThan(html.indexOf('<section class="analysis">')); expect(summaryStart).toBeLessThan(timePageStart);
    expect(html.indexOf('class="bazi-evidence-report bazi-evidence-report-paused"')).toBeLessThan(timePageStart);
    expect(html.indexOf('奇门：出生时刻未知')).toBeLessThan(timePageStart);
    expect(html.match(/<h2>八字分层证据<\/h2>/g)).toHaveLength(1); expect(html.match(/奇门：出生时刻未知/g)).toHaveLength(1);
    expect(html).toContain('.bazi-evidence-report.bazi-evidence-report-paused{break-before:auto');
  });
});
