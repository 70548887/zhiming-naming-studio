import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {describe,it,expect,vi} from 'vitest';
import {QiongtongClauseReferenceView} from '../src/renderer/QiongtongClauseReferenceView';import {QiongtongClausePreviewPanel} from '../src/renderer/QiongtongClausePreviewPanel';
import {evaluateQiongtongClauseReferences,type SafeChartInput140} from '../src/domain/traditional/qiongtong-clause-reference';
import type {JiaLiteralReferenceV11} from '../src/domain/traditional/qiongtong-jia-v11-types';
import records from './fixtures/jia-actual-core-references.json';
const cases=records as unknown as {id:string;rawInput:SafeChartInput140;reference:JiaLiteralReferenceV11}[];
describe('one clause-result area with separate original and Jia groups',()=>{
 it('presents both actual pure result groups together without merging their statuses or adding controls',()=>{
  const row=cases[0],original=evaluateQiongtongClauseReferences(row.rawInput),before=JSON.stringify({original,jia:row.reference}),html=renderToStaticMarkup(<QiongtongClauseReferenceView reference={original} jiaChapter={row.reference}/>);
  expect([...html.matchAll(/data-clause-id=/g)]).toHaveLength(original.rules.length);expect([...html.matchAll(/data-jia-clause-id=/g)]).toHaveLength(row.reference.checks.length);expect(html).toContain('月别条文条件参考');expect(html).toContain('甲木篇字面子句参考');expect(html).toContain('整段条件未评估');expect(html).toContain('完整用神未裁定');expect(html).not.toMatch(/<button|[CDE]:[\\/]|data\//);expect(html).not.toContain(original.schema);expect(html).not.toContain(row.reference.schema);expect(JSON.stringify({original,jia:row.reference})).toBe(before);
 });
 it('retains the original-only view where no new DTO was supplied and never fabricates a new group',()=>{
  const original=evaluateQiongtongClauseReferences(cases[0].rawInput),html=renderToStaticMarkup(<QiongtongClauseReferenceView reference={original}/>);expect(html).toContain('data-clause-id=');expect(html).not.toContain('data-jia-clause-id=');expect(html).not.toContain('甲木篇字面子句参考');
 });
 it('keeps exactly one neutral manual read action and leaves an unknown-time family draft untouched during rendering',()=>{
  const profile={id:'m615-explicit-unknown',customerName:'只读家庭资料',surname:'林',surnamePinyin:'lín',fatherName:'林测甲',motherName:'陈测乙',gender:'中性' as const,calendar:'solar' as const,birthDate:'2024-02-10',birthTime:'',timeUnknown:true,leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:''},before=JSON.stringify(profile),previewQiongtongClauseReferences=vi.fn(async()=>{throw Error('No render-time request');});
  const html=renderToStaticMarkup(<QiongtongClausePreviewPanel profile={profile} api={{previewQiongtongClauseReferences}}/>);expect([...html.matchAll(/<button\b/g)]).toHaveLength(1);expect(html).toContain('月别条文参考');expect(html).toContain('查阅月别条文');expect(html).not.toContain('三条月别');expect(previewQiongtongClauseReferences).not.toHaveBeenCalled();expect(JSON.stringify(profile)).toBe(before);expect(profile.birthTime).toBe('');
 });
});
