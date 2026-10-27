import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it, vi} from 'vitest';
import type {RootFeedbackApplicationGate} from '../src/shared/bazi-root-feedback-application';
import {PROJECT_NAMING_METHOD_ID} from '../src/shared/project-naming-use';
import {ProjectNamingMethodField, ProjectNamingMethodFieldView} from '../src/renderer/ProjectNamingMethodField';
import {ProjectNamingApplicationGate} from '../src/renderer/ProjectNamingApplicationGate';
import {getProjectNamingContextKey, readProjectNamingIntent, type ProjectNamingGateState} from '../src/renderer/project-naming-method-state';

const legacy = {preferredElements: []};
const project = (entryPolicy: 'month-branch-only' | 'month-stem-proposal' = 'month-branch-only') => ({
  preferredElements: [], namingElementMethod: {methodId: PROJECT_NAMING_METHOD_ID, entryPolicy},
});
const key = () => getProjectNamingContextKey(null, project());
const state = (patch: Partial<ProjectNamingGateState> = {}): ProjectNamingGateState => ({
  phase: 'idle', gate: null, error: '', notice: '', contextKey: key(), ...patch,
});
const blocked: RootFeedbackApplicationGate = {status: 'blocked', caseId: null, regimeId: null, reasons: [
  {code: 'birth-input-unresolved', message: '出生时刻未确定，仍有两个可能时柱。'},
  {code: 'numeric-threshold-pending', message: '区间跨过项目阈值，暂不能确定唯一取用。'},
]};
// Presentation-only fixture: no engine authentication is performed or asserted by this view test.
const applicable = {status: 'applicable', reasons: [], caseId: 'saved-case', regimeId: 'saved-regime',
  effectiveElements: {primary: ['木'], secondary: ['火'], avoid: ['金'], applied: ['木', '火']},
  certificate: {methodId: PROJECT_NAMING_METHOD_ID, entryPolicy: 'month-branch-only'},
} as unknown as RootFeedbackApplicationGate;
function renderGate(patch: Partial<ProjectNamingGateState> = {}, props: Record<string, unknown> = {}) {
  return renderToStaticMarkup(<ProjectNamingApplicationGate preferences={project()} state={state(patch)}
    currentContextKey={key()} previewAvailable onPreview={() => {}} {...props}/>);
}
describe('independent project naming selector and application gate presentation', () => {
  it('defaults to one legacy radio without applying a preference or preview', () => {
    const onChange = vi.fn();
    const html = renderToStaticMarkup(<ProjectNamingMethodField preferences={legacy} contextKey="owner-a" onChange={onChange}/>);
    expect((html.match(/type="radio"/g) || [])).toHaveLength(3);
    expect((html.match(/checked=""/g) || [])).toHaveLength(1);
    expect(html.match(/<input\b[^>]*value="legacy"[^>]*>/)?.[0]).toContain('checked=""');
    expect(html).toContain('项目月支取法'); expect(html).toContain('项目月干透干提案');
    expect(onChange).not.toHaveBeenCalled();
    expect(Object.hasOwn(legacy, 'namingElementMethod')).toBe(false);
  });
  it('requires an explicit clear action for existing manual choices and preserves their text', () => {
    const html = renderToStaticMarkup(<ProjectNamingMethodFieldView intent={readProjectNamingIntent({preferredElements: ['水', '木']})}
      pendingChoice="month-stem-proposal" id="manual-case" onChoose={() => {}} onConfirmClear={() => {}} onCancelClear={() => {}}/>);
    expect(html).toContain('当前人工五行：水、木');
    expect(html).toContain('清空并切换'); expect(html).toContain('保留人工选择');
    expect(html).toContain('尚未应用的人工五行草稿');
    expect(html.match(/<input\b[^>]*value="legacy"[^>]*>/)?.[0]).toContain('checked=""');
    expect(html.match(/<input\b[^>]*value="month-stem-proposal"[^>]*>/)?.[0]).not.toContain('checked=""');
  });
  it('keeps an unknown explicit method visibly invalid without choosing the default radio', () => {
    const html = renderToStaticMarkup(<ProjectNamingMethodField preferences={{...legacy, namingElementMethod: {methodId: 'future', entryPolicy: 'month-branch-only'}}} contextKey="owner-a" onChange={() => {}}/>);
    expect(html).toContain('role="alert"'); expect(html).toContain('未知项目命名方法');
    expect(html).not.toContain('checked=""');
  });
  it('uses distinct radio groups and labelled feedback for simultaneous instances', () => {
    const html = renderToStaticMarkup(<><ProjectNamingMethodField preferences={legacy} contextKey="owner-a" onChange={() => {}}/>
      <ProjectNamingMethodField preferences={project()} contextKey="owner-b" onChange={() => {}}/>
      <ProjectNamingApplicationGate preferences={project()} state={state()} currentContextKey={key()} previewAvailable onPreview={() => {}}/>
      <ProjectNamingApplicationGate preferences={project()} state={state()} currentContextKey={key()} previewAvailable onPreview={() => {}}/></>);
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map(match => match[1]);
    const names = [...new Set([...html.matchAll(/ name="([^"]+)"/g)].map(match => match[1]))];
    expect(new Set(ids).size).toBe(ids.length); expect(names).toHaveLength(2);
    expect(html).toContain('aria-live="polite"'); expect(html).toContain('aria-describedby=');
  });
  it('renders every blocked reason exactly and never displays an eligible or saved result', () => {
    const html = renderGate({phase: 'ready', gate: blocked});
    expect(html).toContain('项目取法暂不能用于本次生成');
    for (const reason of blocked.reasons) expect(html).toContain(reason.message);
    expect(html).not.toContain('采用条件已满足'); expect(html).not.toContain('本方案已保存');
  });
  it('labels an applicable result as preview eligibility with fresh generation revalidation', () => {
    const html = renderGate({phase: 'ready', gate: applicable});
    expect(html).toContain('预览：采用条件已满足');
    expect(html).toContain('生成时将重新核对'); expect(html).toContain('生成并保存后才形成采用记录');
    expect(html).toContain('木、火'); expect(html).toContain('预览回避');
    expect(html).not.toContain('验局通过'); expect(html).not.toContain('已采用项目取法');
  });
  it('hides a prior gate immediately when current inputs differ, or while a new request loads', () => {
    const stale = renderGate({phase: 'ready', gate: applicable}, {currentContextKey: 'new-context'});
    expect(stale).toContain('资料或取法已变化'); expect(stale).not.toContain('采用条件已满足');
    const loading = renderGate({phase: 'loading', gate: applicable});
    expect(loading).toContain('正在核对采用条件'); expect(loading).toContain('disabled=""');
    expect(loading).not.toContain('采用条件已满足');
  });
  it('keeps missing API and legacy states separate from the old preview', () => {
    const unavailable = renderGate({}, {previewAvailable: false});
    expect(unavailable).toContain('接口尚未接通'); expect(unavailable).toContain('disabled=""');
    const old = renderGate({}, {preferences: legacy});
    expect(old).toContain('当前使用原有取法'); expect(old).not.toContain('<button');
    expect(unavailable).not.toContain('previewBaziMainchain');
  });
  it('does not display an eligible result if the API disappears or the permission guard rejects its certificate', () => {
    const unavailable = renderGate({phase: 'ready', gate: applicable}, {previewAvailable: false});
    expect(unavailable).toContain('接口尚未接通'); expect(unavailable).not.toContain('采用条件已满足');
    expect(unavailable).not.toContain('本次资料可提交');
    const wrong = structuredClone(applicable);
    if (wrong.status === 'applicable') wrong.certificate.entryPolicy = 'month-stem-proposal';
    const rejected = renderGate({phase: 'ready', gate: wrong});
    expect(rejected).toContain('项目采用门与当前取法不一致');
    expect(rejected).not.toContain('采用条件已满足'); expect(rejected).not.toContain('本次资料可提交');
  });
  it('escapes backend reasons and errors as plain text', () => {
    const unsafe = structuredClone(blocked); unsafe.reasons[0].message = '<img src=x onerror=bad>';
    const html = renderGate({phase: 'ready', gate: unsafe});
    expect(html).toContain('&lt;img src=x onerror=bad&gt;'); expect(html).not.toContain('<img');
    expect(renderGate({phase: 'error', error: '<script>error</script>'})).toContain('&lt;script&gt;error&lt;/script&gt;');
  });
});
