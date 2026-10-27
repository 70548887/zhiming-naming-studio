import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { BaziEvidenceSource, SeasonalConditionEvidence } from '../shared/types';
import { SeasonalConditionsView } from './SeasonalConditionsView';

function fixture(): SeasonalConditionEvidence {
  return { version: 'qiongtong-2294674-conditions/1.0.0', profile: 'qiongtong-2294674-conditions', status: 'available', rules: [{ id: 'calendar-condition-test', version: 'test-v1', name: '节气时间前提核对', sourceIds: ['conditional-source'], conditions: ['只核对实际节气区间，不代替花候、火势与旺弱。'] }], checks: [{ id: 'yi-you-before-qi', caseId: 'yi-you', conditionId: 'original-condition', dayMaster: '乙', monthBranch: '酉', sourceId: 'conditional-source', sourceQuote: "'''白露以後'''，桂蕊未開。", sourceLocator: '乙木/酉;codepoint[10,30)', scope: 'partial-prerequisite', status: 'met', predicateDescription: '出生瞬间处于白露至秋分的实际区间。', observations: [{ startAt: '2024-09-10T01:00:00.000Z', endAt: '2024-09-10T01:00:00.000Z', result: 'met', fromTermAt: '2024-09-07T03:11:06.000Z', toTermAt: '2024-09-22T12:43:36.000Z', evidence: ['起节含边界，止节不含边界。'] }], missing: ['桂蕊未开未经物候观测，火势与其他条件仍未核。'], doesNotResolveOriginalBranch: true }], warnings: ['原有逐月分支结论保持不变。'] };
}
const sources: BaziEvidenceSource[] = [{ id: 'conditional-source', name: '固定版条件原句', revision: 'oldid2294674', url: 'https://example.test/fixed', locator: '四个时间原句', note: '电子转录。' }];
const render = (evidence?: SeasonalConditionEvidence) => renderToStaticMarkup(<SeasonalConditionsView evidence={evidence} sources={sources}/>);
describe('independent seasonal condition supplement',()=>{
 it('leaves old snapshots without the new independent field unchanged',()=>{
  expect(render()).toBe('');
  const disabled=fixture();disabled.status='not-selected';disabled.checks=[];
  expect(render(disabled)).toContain('未选择逐月资料取法，本项不核对');
 });
 it('labels a met time prerequisite as only a partial result and retains the original undecided branch',()=>{
  const value=fixture(),before=structuredClone(value),html=render(value);
  for(const word of ['仅时间前提满足 · 原句未裁决','不覆盖上方原始分支结论','不等于桂花、桂蕊、火炽、旺弱或整条调候原句已经成立','此项不裁决原分支',value.checks[0].missing[0],'白露以後','原有逐月分支结论保持不变','历史原文（含旧时断语，不作软件结论）','不推导原文后半的成就断言'])expect(html).toContain(word);
  expect(html).not.toContain('&#39;&#39;&#39;');expect(html).not.toContain('&#x27;&#x27;&#x27;');expect(value).toEqual(before);
 });
 it('preserves split uncertain observations, exact UTC boundaries and independent source locators',()=>{
  const value=fixture(),check=value.checks[0];check.status='uncertain';check.observations.push({...structuredClone(check.observations[0]),startAt:'2024-09-22T12:43:36.000Z',endAt:'2024-09-22T15:59:59.000Z',result:'not-met',evidence:['出生时刻未知，跨越秋分。']});
  const html=render(value);for(const word of ['时间前提区间不确定 · 原句未裁决',check.sourceLocator,check.id,check.caseId,check.conditionId!,...check.observations.flatMap(item=>[item.startAt,item.endAt,...item.evidence])])expect(html).toContain(word);
  expect(html).toContain('本区间满足所核前提');expect(html).toContain('本区间未满足所核前提');expect(html).toContain(check.observations[0].fromTermAt!);expect(html).toContain(check.observations[0].toTermAt!);
 });
 it('keeps full declared factual predicates distinct from incomplete time prerequisites',()=>{
  const value=fixture();value.checks[0].scope='full-fact-predicate';value.checks[0].doesNotResolveOriginalBranch=false;
  expect(render(value)).toContain('限定透藏事实满足');
  value.checks[0].status='not-evaluated';expect(render(value)).toContain('限定透藏事实未评估');
  value.checks[0].scope='partial-prerequisite';expect(render(value)).toContain('时间前提未评估 · 原句未裁决');
 });
 it('renders source versions, rule conditions and imported text safely in native collapsible groups',()=>{
  const value=fixture();value.checks[0].sourceQuote='<script>quote()</script>';value.rules[0].conditions=['<img src=x>'];const hostile=[{...sources[0],url:'javascript:attack()',name:'<svg>'}];
  const html=renderToStaticMarkup(<SeasonalConditionsView evidence={value} sources={hostile}/>);
  for(const word of ['&lt;script&gt;','&lt;img','&lt;svg&gt;','oldid2294674','calendar-condition-test / test-v1','<details'])expect(html).toContain(word);
  for(const word of ['<script>','<img','<svg>','href="javascript:','<details open'])expect(html).not.toContain(word);
 });
});
