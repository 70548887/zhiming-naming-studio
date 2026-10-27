import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { NameCandidate, NamingSession, NumerologyAnalysis, StudioSettings } from '../shared/types';
import { normalizePreferences } from '../shared/workflow';
import { ExportConfirmation, type ExportConfirmationProps } from './ExportConfirmation';

const candidate = (id: string, favorite = false): NameCandidate => ({
  id, fullName: `林${id}`, givenName: id, pinyin: 'lín míng', style: '清朗', characters: [], meaning: '寓意', reason: '理由', citations: [],
  evaluation: { sound: 80, meaning: 80, simplicity: 80, traditional: 80, distinctiveness: 80 }, warnings: [], traditionalReason: '依据', favorite,
  origin: 'local', reviewNote: '', originalMeaning: '寓意',
});
const session: NamingSession = {
  id: 'session-confirm-12345678', profileId: 'customer-confirm', createdAt: '2026-10-18T04:30:08Z',
  profile: { id: 'customer-confirm', customerName: '林家长', surname: '林', surnamePinyin: 'lín', gender: '中性', calendar: 'solar', birthDate: '2026-10-17', leapMonth: false, birthTime: '09:30', timeUnknown: false, birthPlace: '杭州', timezone: 'Asia/Shanghai', notes: '' },
  preferences: normalizePreferences(),
  analysis: { bazi: { solarDate: '', lunarDate: '', zodiac: '马', pillars: [], elements: { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 }, favorable: [], unfavorable: [], strength: '', reasons: [], seasonalAdvice: '', warnings: [], version: 'fixture', ruleDescription: '' }, qimen: { available: false, dun: '', ju: 0, yuan: '', solarTerm: '', xun: '', chiefStar: '', chiefDoor: '', palaces: [], reasons: [], warnings: [], version: 'fixture' } },
  candidates: [candidate('安'), candidate('清'), candidate('宁')], reviewNote: '', originalFavorable: [], dataVersion: 'fixture',
};
const settings: StudioSettings = { studioName: '已保存工作室', contact: '已保存联系方式', logoDataUrl: '', apiBaseUrl: '', model: '', timeoutMs: 5000, hasApiKey: false, useAi: false };
function render(overrides: Partial<ExportConfirmationProps> = {}) {
  return renderToStaticMarkup(<ExportConfirmation session={session} settings={settings} reportDirty={false} busy={false} onClose={() => {}} onConfirm={() => {}} {...overrides}/>);
}

describe('export confirmation', () => {
  it('shows the immutable customer and batch identity with the complete PDF list', () => {
    const html = render();
    for (const text of ['林家长', '林 · 中性', '公历 2026-10-17 · 09:30', 'Asia/Shanghai', '杭州', '批次 12345678', '2026年10月18日 12:30:08', '林安', '林清', '林宁']) expect(html).toContain(text);
    expect(html).toContain('PDF 保留本批生成顺序');
    expect(html).toContain('本批共 3 个候选，已收藏 0 个');
  });

  it('uses the same favorite-only subset and original order as the PDF renderer', () => {
    const html = render({ session: { ...session, candidates: [candidate('安', true), candidate('清'), candidate('宁', true)] } });
    expect(html).toContain('本批共 3 个候选，已收藏 2 个');
    expect(html).toContain('2 个名字');
    expect(html).toContain('林安'); expect(html).toContain('林宁'); expect(html).not.toContain('林清');
    expect(html.indexOf('林安')).toBeLessThan(html.indexOf('林宁'));
  });

  it('shows the current review draft and the save-before-export behavior', () => {
    const html = render({ reportDirty: true, reviewNote: '交付前最新审阅' });
    expect(html).toContain('交付前最新审阅'); expect(html).toContain('待保存');
    expect(html).toContain('确认后先保存当前总体审阅');
    expect(render()).toContain('尚未填写总体审阅意见');
  });

  it('previews saved brand information and calls out unsaved settings', () => {
    const html = render({ settingsDirty: true });
    expect(html).toContain('已保存工作室'); expect(html).toContain('已保存联系方式');
    expect(html).toContain('返回设置保存后再导出'); expect(html).toContain('未设置 Logo');
    expect(html).not.toContain('验算通过'); expect(html).not.toContain('数据已验证');
  });

  it('uses the same default studio name as the PDF when the saved name is empty', () => {
    const html = render({ settings: { ...settings, studioName: '' } });
    expect(html).toContain('知名起名工作室');
    expect(html).toContain('使用默认工作室名称');
    expect(html).not.toContain('未设置工作室名称');
  });

  it('counts unconfirmed numerology only within the export scope and keeps export available', () => {
    const html = render({ session: { ...session, preferences: normalizePreferences({ numerology: true }), candidates: [candidate('安', true), candidate('清')] } });
    expect(html).toContain('有 1 个名字的数理字形尚未确认或当前结构不支持');
    expect(html).toContain('可以继续导出');
    expect(html).not.toContain('disabled=""');
  });

  it('distinguishes completed, pending and unsupported numerology without claiming validation', () => {
    const numeric = (status: NumerologyAnalysis['status']): NumerologyAnalysis => ({ status, fullName: '林名', rule: { id: 'fixture', version: 'fixture', name: 'fixture', strokePolicy: '', formulaConvention: '' }, dataVersion: 'fixture', strokes: [], grids: [], warnings: [] });
    const candidates = [
      { ...candidate('安'), numerology: numeric('complete') },
      { ...candidate('清'), numerology: numeric('pending') },
      { ...candidate('宁'), numerology: numeric('unsupported') },
    ];
    expect(render({ session: { ...session, preferences: normalizePreferences({ numerology: true }), candidates } })).toContain('有 2 个名字的数理字形尚未确认或当前结构不支持');
    expect(render({ session: { ...session, candidates } })).not.toContain('数理字形尚未确认');
  });

  it('preserves failure feedback with a retry button and disables actions while exporting', () => {
    const html = render({ error: '文件写入失败，请重试' });
    expect(html).toContain('role="alert"'); expect(html).toContain('文件写入失败，请重试');
    expect(html).toContain('确认并导出 PDF');
    const busy = render({ busy: true });
    expect(busy).toContain('aria-busy="true"');
    expect(busy.match(/disabled=""/g)).toHaveLength(2);
    expect(busy).toContain('正在保存并导出');
  });

  it('labels unknown lunar birth times and accepts an explicitly supplied batch label', () => {
    const html = render({ session: { ...session, profile: { ...session.profile, calendar: 'lunar', leapMonth: true, timeUnknown: true } }, batchLabel: '批次测试标签' });
    expect(html).toContain('农历（闰月） 2026-10-17 · 时刻未知');
    expect(html).toContain('批次测试标签');
    expect(html).not.toContain('09:30');
  });

  it('summarizes saved parent names and the same automatic avoidance used for naming', () => {
    const html = render({ session: { ...session, profile: { ...session.profile, fatherName: '林知远', motherName: '陈安宁' } } });
    for (const value of ['爸爸姓名', '林知远', '妈妈姓名', '陈安宁', '父母用字避讳', '已启用：避开', '知、远、安、宁', '常见中文姓氏不计入']) expect(html).toContain(value);
    const off = render({ session: { ...session, profile: { ...session.profile, fatherName: '林知远' }, preferences: normalizePreferences({ avoidParentNames: false }) } });
    expect(off).toContain('<dt>父母用字避讳</dt><dd>未启用');expect(off).not.toContain('已启用：避开');
  });

  it('distinguishes saved default methods from enabled references and does not fill missing historical choices from profile inputs', () => {
    const baseEvidence = { monthAuthority: { methodId: 'no-fixed-day/1.0.0', status: 'not-evaluated' }, monthlySeasonal: { methodId: 'no-monthly/1.0.0', status: 'not-selected' } } as NonNullable<NamingSession['analysis']['bazi']['evidence']>;
    const defaults = render({ session: { ...session, analysis: { ...session.analysis, bazi: { ...session.analysis.bazi, evidence: baseEvidence } } } });
    expect(defaults).toContain('默认：不定日限，未启用固定分日定位');expect(defaults).toContain('默认：未启用逐月调候资料');
    const selected = render({ session: { ...session, analysis: { ...session.analysis, bazi: { ...session.analysis.bazi, evidence: { ...baseEvidence, monthAuthority: { ...baseEvidence.monthAuthority, methodId: 'sanming-first-paragraph/1.0.0', status: 'uncertain' }, monthlySeasonal: { ...baseEvidence.monthlySeasonal!, methodId: 'qiongtong-2294674-initial/1.0.0', status: 'pending' } } } } } });
    expect(selected).toContain('已启用：《三命通会》');expect(selected).toContain('已启用：《穷通宝鉴》');expect(selected).toContain('区间待复核');expect(selected).toContain('资料待核对，暂不应用');
    const old = render({ session: { ...session, profile: { ...session.profile, monthAuthorityMethod: 'sanming-first-paragraph/1.0.0', seasonalMethod: 'qiongtong-2294674-initial/1.0.0' } } });
    expect(old).toContain('本版未记录选表方法，不补入当前默认值');expect(old).toContain('本版未记录逐月资料方法，不补入当前默认值');expect(old).not.toContain('已启用：《');
  });

  it('keeps unverified historic facts visible and distinguishes custom archived consistency from upstream certification', () => {
    expect(render()).toContain('历史用字与引文未重新核验');expect(render()).toContain('不能用当前字库补证');
    const custom = render({ session: { ...session, factVerification: { version: 'candidate-facts/1.0.0', status: 'verified-archive', dataVersion: session.dataVersion, datasetSha256: 'a'.repeat(64) } } });
    expect(custom).toContain('已按生成时知识包归档核对');expect(custom).toContain('内容一致不等于上游真实性或专家认证');
    const builtin = render({ session: { ...session, factVerification: { version: 'candidate-facts/1.0.0', status: 'verified-builtin', dataVersion: session.dataVersion, datasetSha256: 'a'.repeat(64) } } });
    expect(builtin).toContain('已按内置原版本核对用字与引文');expect(builtin).not.toContain('历史用字与引文未重新核验');
  });
});
