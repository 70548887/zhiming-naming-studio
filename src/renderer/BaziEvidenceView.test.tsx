import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { BaziEvidenceAnalysis, BaziRelationKind } from '../shared/types';
import { baziEvidenceReport, baziEvidenceReportStyles } from '../main/bazi-evidence-report';
import { BaziEvidenceView } from './BaziEvidenceView';

function fixture(): BaziEvidenceAnalysis {
  const relationKinds: BaziRelationKind[] = ['stem-combination', 'branch-liuhe', 'branch-sanhe', 'branch-sanhui', 'branch-clash'];
  const labels = ['天干五合配对', '地支六合配对', '地支三合字组', '地支三会字组', '地支六冲配对'];
  return {
    version: 'test-evidence/1.0', profile: 'test-profile',
    sources: [{ id: 'fixed-source', name: '测试固定关系表', revision: 'source-revision-0123', url: 'https://example.com/fixed-tables', locator: 'fixture/table:8', note: '测试所选电子表，不代表统一流派。' }],
    rules: ['facts', 'month', 'fuyi', 'seasonal', ...relationKinds].map(id => ({ id, name: `规则名称 ${id}`, version: 'rule-v1', sourceIds: ['fixed-source'], conditions: [`${id} 的明确适用条件。`] })),
    dayMaster: { stem: '甲', element: '木' },
    timeBasis: { timezone: 'Asia/Shanghai', timeUnknown: false, ambiguous: false, description: '民用午夜换日；按记录的实际瞬间计算，未作真太阳时修正。' },
    stems: [{ pillar: '日柱', stem: '甲', element: '木', tenGod: '日主', relationToDay: '日主自身', ruleId: 'facts' }, { pillar: '年柱', stem: '己', element: '土', tenGod: '正财', relationToDay: '日主克此干', ruleId: 'facts' }],
    hiddenStems: [{ pillar: '月柱', branch: '寅', stem: '丙', element: '火', order: 2, tenGod: '食神', relationToDay: '日主生此干', ruleId: 'facts' }],
    relations: relationKinds.map((kind, i) => ({ kind, label: labels[i], subjects: [`字${i}甲`, `字${i}乙`], pillars: ['年柱', '月柱'], ruleId: kind, evidence: [`${kind}出现依据，仅记录完整字组。`] })),
    monthAuthority: { status: 'not-evaluated', ruleId: 'month', method: '相邻十二节时间区间，分日司权表尚待核实', candidates: [], segments: [{ monthBranch: '寅', previousJie: '立春', previousJieAt: '2026-02-03T20:01:00.000Z', startAt: '2026-02-04T00:00:00.000Z', endAt: '2026-02-04T12:00:00.000Z', elapsedStartDays: 0.1659722222, elapsedEndDays: 0.6659722222, candidates: [] }], evidence: ['交节经过日数以实际秒数除以86400。'], missing: ['未接入有来源与版本的分日司权表。'] },
    opinions: [
      { method: 'fuyi', profile: 'test-weighted-fuyi', status: 'candidate', elements: ['水', '木'], unfavorable: ['土'], evidence: ['项目自编扶抑阈值，不替代定格。'], missing: ['未执行从格裁决。'], requiresManualReview: true, ruleId: 'fuyi' },
      { method: 'tiaohou', profile: 'test-seasonal-imagery', status: 'pending', elements: [], unfavorable: [], evidence: ['春季保留多解，只作季节意象。'], missing: ['尚未完成完整寒暖燥湿调候。'], requiresManualReview: true, ruleId: 'seasonal' },
    ],
    patternCandidates: [{ kind: 'cong', name: '从格候选', status: 'not-evaluated', supportedBy: [], opposedBy: [], missing: ['缺少同流派成立与破格条件。'] }],
    transformationEvidence: [{ kind: 'stem-combination', subjects: ['甲', '己'], status: 'not-evaluated', supportedBy: ['仅核实明干字组出现。'], opposedBy: ['有待复核的争合因素。'], missing: ['得令、透引、阻隔尚未核对。'], ruleId: 'stem-combination' }],
    limitations: ['不同方法分开保存，不推导唯一喜用。'],
  };
}
const both = (evidence?: BaziEvidenceAnalysis) => [renderToStaticMarkup(<BaziEvidenceView evidence={evidence}/>), baziEvidenceReport(evidence)];

describe('stored Bazi evidence reading and report', () => {
  it('leaves historical records without evidence uncalculated', () => {
    for (const output of both()) {
      expect(output).toContain('原方案未包含');
      expect(output).toContain('重新分析');
      expect(output).toContain('不自动补算');
      expect(output).not.toContain('日主 甲');
      expect(output).not.toContain('test-profile');
    }
  });

  it('shows recorded facts and each relation without declaring transformation or inventing candidates', () => {
    const evidence = fixture(), before = structuredClone(evidence);
    for (const output of both(evidence)) {
      for (const item of [...evidence.stems, ...evidence.hiddenStems]) for (const value of [item.pillar, item.stem, item.element, item.tenGod, item.relationToDay]) expect(output).toContain(value);
      for (const relation of evidence.relations) for (const value of [relation.label, ...relation.subjects, ...relation.evidence, relation.ruleId]) expect(output).toContain(value);
      expect(output).toContain('合关系不等于');
      expect(output).not.toContain('合化成立：');
      expect(output).not.toContain('命运总分');
    }
    expect(evidence).toEqual(before);
  });

  it('preserves real solar-term intervals while keeping the unavailable authority day-table unassessed', () => {
    const evidence = fixture();
    for (const output of both(evidence)) {
      expect(output).toContain('司权未评估');
      expect(output).toContain('相邻十二节');
      expect(output).toContain('未接入有来源与版本的分日司权表');
      expect(output).toContain('2026-02-03T20:01:00.000Z');
      expect(output).toContain('2026-02-04T00:00:00.000Z');
      expect(output).toContain('0.16597');
      expect(output).toContain('UTC');
      expect(output).not.toContain('已定位司权候选');
    }
    expect(both(evidence)[0]).toContain('title="0.1659722222—0.6659722222"');
  });

  it('retains confirmed facts for unknown time and makes omitted hour and ambiguous instants explicit', () => {
    const evidence = fixture();evidence.timeBasis.timeUnknown = true;evidence.timeBasis.ambiguous = true;
    evidence.timeBasis.description += ' 重复小时只采用第一次瞬间。';
    for (const output of both(evidence)) {
      expect(output).toContain('出生时刻未知');
      expect(output).toContain('不生成缺失时柱');
      expect(output).toContain('第一次瞬间');
      expect(output).toContain('歧义');
      expect(output).toContain('日主自身');
      expect(output).not.toContain('时柱 ·');
    }
  });

  it('separates weighted fuyi from seasonal imagery and explicitly records missing pattern and transformation conditions', () => {
    const evidence = fixture();
    for (const output of both(evidence)) {
      for (const value of ['扶抑初筛', '季节意象 · 非完整调候', 'test-weighted-fuyi', 'test-seasonal-imagery', '需人工复核', '不改变候选姓名评分', '不合成为唯一喜用神', '未提出', '从格候选', '未评估', '缺少同流派成立与破格条件', '仅核实明干字组出现', '有待复核的争合因素', '得令、透引、阻隔尚未核对']) expect(output).toContain(value);
      for (const opinion of evidence.opinions) for (const value of [...opinion.evidence, ...opinion.missing, opinion.ruleId]) expect(output).toContain(value);
    }
  });

  it('retains every saved rule condition, version, source URL, locator and limitation', () => {
    const evidence = fixture();
    for (const output of both(evidence)) {
      for (const rule of evidence.rules) for (const value of [rule.name, rule.id, rule.version, ...rule.conditions]) expect(output).toContain(value);
      for (const source of evidence.sources) for (const value of [source.id, source.name, source.revision, source.url, source.locator, source.note]) expect(output).toContain(value);
      for (const limitation of evidence.limitations) expect(output).toContain(limitation);
    }
  });

  it('offers keyboard-native collapsed reading groups and local terminology explanations', () => {
    const html = both(fixture())[0];
    expect(html).toContain('aria-labelledby="bazi-evidence-heading"');
    expect(html).toContain('aria-label="证据阅读概览"');
    expect(html).toContain('这些术语怎么看？');
    expect(html).toContain('日主与十神');
    expect(html).toContain('藏干与司权');
    expect(html).toContain('查看本次依据与限制');
    expect(html).toContain('<details');
    expect(html).not.toContain('<details open');
    expect(baziEvidenceReportStyles).toContain('.bazi-evidence-report{break-before:page');
    expect(baziEvidenceReportStyles).toContain('.bazi-evidence-report tr{break-inside:avoid}');
    expect(baziEvidenceReportStyles).toContain('break-after:avoid');
    expect(baziEvidenceReportStyles).toContain('table-header-group');
  });

  it('escapes untrusted imported text and leaves non-https source URLs unlinked', () => {
    const evidence = fixture();
    evidence.sources[0] = { id: '<source>', name: '<svg onload="attack()">', url: 'javascript:attack()', revision: '<revision>', locator: '<iframe>', note: '<script>note()</script>' };
    evidence.rules[0].name = '<script>rule()</script>';evidence.rules[0].conditions = ['<img src=x onerror="attack()">'];
    evidence.monthAuthority.evidence = ['<script>month()</script>'];
    evidence.opinions[0].evidence = ['<script>opinion()</script>'];
    evidence.relations[0].evidence = ['<script>relation()</script>'];
    evidence.transformationEvidence[0].missing = ['<script>missing()</script>'];
    evidence.limitations = ['<script>limit()</script>'];
    for (const output of both(evidence)) {
      for (const value of ['&lt;script&gt;', '&lt;svg', '&lt;img', '&lt;iframe&gt;', '&lt;revision&gt;', '&lt;source&gt;']) expect(output).toContain(value);
      for (const value of ['<script>', '<svg', '<img', '<iframe', 'href="javascript:']) expect(output).not.toContain(value);
    }
  });
});
