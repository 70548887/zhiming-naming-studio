import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { analyzeProfile } from '../domain/engine';
import { catalogSession } from '../../tests/fixtures/catalog-session';
import { BirthTimeBasisView } from './BirthTimeBasisView';
import { BaziEvidenceView } from './BaziEvidenceView';
import { ExportConfirmation } from './ExportConfirmation';
import { QimenView } from './QimenView';
import type { StudioSettings } from '../shared/types';

const profile = () => ({ ...catalogSession().profile, birthDate: '2024-06-01', birthTime: '00:30:00', birthLongitude: 87.6, timeBasis: 'apparent-solar' as const });
const settings: StudioSettings = { studioName: '', contact: '', logoDataUrl: '', apiBaseUrl: '', model: '', timeoutMs: 5000, hasApiKey: false, useAi: false };

describe('saved birth time presentation', () => {
  it('does not make a conversion for old records', () => { expect(renderToStaticMarkup(<BirthTimeBasisView/>)).toBe(''); });
  it('shows the actual saved civil and solar clocks, including a previous date and sign-correct longitude', () => {
    const analysis = analyzeProfile(profile()).bazi.timeBasis!, html = renderToStaticMarkup(<BirthTimeBasisView analysis={analysis}/>);
    expect(analysis.calculationDateTime).toContain('2024-05-31');
    for (const value of ['2024-06-01 00:30:00', analysis.calculationDateTime!, '东经 87.6°', '日、时干支按所选钟表', '实际 UTC', '均时差', '经度修正', analysis.methodId, analysis.sourceId!]) expect(html).toContain(value);
    expect(html).not.toContain('日主待定，本项证据暂停'); expect(html).not.toContain('验算通过');
  });
  it('presents unknown intervals and paused dependent evidence instead of a noon point or historical placeholder', () => {
    const analysis = analyzeProfile({ ...profile(), birthTime: '', timeUnknown: true }), trace = analysis.bazi.timeBasis!;
    expect(trace.dayStatus).toBe('uncertain'); expect(trace.actualUtc).toBeNull();
    const html = renderToStaticMarkup(<><BirthTimeBasisView analysis={trace}/><BaziEvidenceView evidence={analysis.bazi.evidence} timeBasis={trace}/></>);
    for (const value of ['出生时刻未知', '区间末秒包含', '日主待定，本项证据暂停', ...trace.dayCandidates]) expect(html).toContain(value);
    expect(html).not.toContain('原方案未包含分层证据'); expect(html).not.toContain('出生瞬间</td>'); expect(html).not.toContain('12:00:00');
  });
  it('exports time selection from the snapshot rather than current profile fields and preserves missing history', () => {
    const session = catalogSession(), selected = profile(), analysis = analyzeProfile(selected);
    const html = renderToStaticMarkup(<ExportConfirmation session={{ ...session, profile: { ...selected, timeBasis: 'civil' }, analysis }} settings={settings} reportDirty={false} busy={false} onClose={() => {}} onConfirm={() => {}}/>);
    expect(html).toContain('<dt>排盘时间取法</dt><dd>真太阳时'); expect(html).toContain(analysis.bazi.timeBasis!.calculationDateTime!); expect(html).toContain('东经 87.6°');
    const old = renderToStaticMarkup(<ExportConfirmation session={{ ...session, profile: selected }} settings={settings} reportDirty={false} busy={false} onClose={() => {}} onConfirm={() => {}}/>);
    expect(old).toContain('本版未记录换算快照，保留原方案依据'); expect(old).not.toContain('东经 87.6°');
  });
  it('escapes saved note and source fields in the detailed view', () => {
    const trace = analyzeProfile(profile()).bazi.timeBasis!;
    const html = renderToStaticMarkup(<BirthTimeBasisView analysis={{ ...trace, warnings: ['<img src=x>'], policies: ['<script>bad</script>'], sourceId: '<source>' }}/>);
    expect(html).toContain('&lt;img'); expect(html).not.toContain('<script>bad'); expect(html).toContain('&lt;source&gt;');
  });
  it('keeps the same clock basis visible on the available and unavailable Qimen pages', () => {
    for (const input of [profile(), { ...profile(), birthTime: '', timeUnknown: true }]) {
      const analysis = analyzeProfile(input), html = renderToStaticMarkup(<QimenView analysis={analysis}/>);
      expect(html).toContain('奇门排盘时间取法'); expect(html).toContain('时间取法 · 真太阳时'); expect(html).toContain('奇门日、时干支与八字采用同一钟表'); expect(html).toContain('原民用记录：2024-06-01');
      if (input.timeUnknown) expect(html).toContain('当前资料尚不能确定唯一奇门盘');
    }
  });
});
