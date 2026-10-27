import React from 'react';
import {describe, expect, it, vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {Candidate2ReviewFeedback} from '../src/renderer/Candidate2ReviewFeedback';
import type {
 Candidate2ReviewFeedbackProps,
 Candidate2ReviewFeedbackState,
} from '../src/renderer/candidate2-review-ui';

const idleState: Candidate2ReviewFeedbackState = {
 phase: 'idle',
 requestPending: false,
 canRetryDelivery: false,
 requiresReadback: false,
 requiresRestart: false,
 blockedReason: null,
 notice: '',
 error: null,
 draftDirty: false,
 canReadSaved: false,
 canLoadLatest: false,
 canCompareDraft: false,
};

const actions = ['cancel-wait', 'retry-delivery', 'read-saved', 'load-latest', 'compare-draft'] as const;
type Action = typeof actions[number];

function actionTag(html: string, action: Action): string | undefined {
 return html.match(new RegExp('<button\\b(?=[^>]*\\bdata-c2-review-action="' + action + '")[^>]*>', 'u'))?.[0];
}

function expectEnabled(html: string, action: Action) {
 const tag = actionTag(html, action);
 expect(tag, action + ' must be a separate button').toBeDefined();
 expect(tag).not.toMatch(/(?:^|\s)disabled(?:=|\s|>)/u);
 expect(tag).not.toMatch(/\baria-disabled="true"/u);
 expect(tag).toMatch(/\btype="button"/u);
}

function expectUnavailable(html: string, action: Action) {
 const tag = actionTag(html, action);
 if (tag !== undefined) expect(tag, action + ' must be disabled when still displayed').toMatch(/(?:^|\s)disabled(?:=|\s|>)/u);
}

function visibleText(html: string): string {
 return html.replace(/<[^>]*>/gu, ' ').replace(/\s+/gu, ' ').trim();
}

function expectDisplayOnly(html: string) {
 expect(html).not.toMatch(/<(?:form|input|textarea|select)\b/iu);
 expect(html).not.toMatch(/\bcontenteditable="true"/iu);
 const renderedActions = [...html.matchAll(/\bdata-c2-review-action="([^"]+)"/gu)].map(match => match[1]);
 expect(renderedActions.every(action => (actions as readonly string[]).includes(action))).toBe(true);
 expect(html).not.toMatch(/\b(?:savedSummary|sessionId|reviewRevision|sourceVerified|expectedRevision|traditionalStatus)\b/u);
}

function renderFeedback(state: Candidate2ReviewFeedbackState, disabled = false) {
 const before = {...state};
 const callbacks = {
  onCancelWait: vi.fn(),
  onRetryDelivery: vi.fn(),
  onReadSaved: vi.fn(),
  onLoadLatest: vi.fn(),
  onCompareDraft: vi.fn(),
 } satisfies Omit<Candidate2ReviewFeedbackProps, 'state' | 'disabled'>;
 const props: Candidate2ReviewFeedbackProps = {
  state: Object.freeze(state),
  disabled,
  ...callbacks,
 };
 const html = renderToStaticMarkup(<Candidate2ReviewFeedback {...props}/>);
 const section = html.match(/<section\b(?=[^>]*\bdata-c2-review-feedback(?:=|\s|>))[^>]*>/u)?.[0];
 expect(section).toBeDefined();
 expect(section).toContain('data-phase="' + state.phase + '"');
 expect(state).toEqual(before);
 for (const callback of Object.values(callbacks)) expect(callback).not.toHaveBeenCalled();
 expectDisplayOnly(html);
 return {html, callbacks};
}

describe('M950 candidate.2 review feedback SSR projection', () => {
 it('renders a clean idle draft without manufacturing a saved-success result or dispatching an event', () => {
  const {html} = renderFeedback({...idleState});
  expect(html).not.toContain('data-phase="ready"');
  expect(html).not.toMatch(/>\s*(?:复核)?(?:保存成功|已成功保存)(?:[。！!]|<)/u);
  for (const action of actions) expectUnavailable(html, action);
 });

 it('explains a dirty manual-review/favorite draft separately from immutable analysis and scores', () => {
  const {html} = renderFeedback({...idleState, draftDirty: true});
  const text = visibleText(html);
  expect(text).toMatch(/复核|备注|评语|意见|文本|文字/u);
  expect(text).toContain('收藏');
  expect(text).toContain('草稿');
  expect(text).toMatch(/原始分析|分析结果|分析与评分|分析/u);
  expect(text).toMatch(/评分|分数/u);
  expect(text).toMatch(/不会|不改|不可|不能|不影响|保持|保留/u);
  for (const action of ['read-saved', 'load-latest', 'compare-draft'] as const) expectUnavailable(html, action);
 });

 it.each([false, true])('keeps pending cancellation available while saving, including disabled=%s', disabled => {
  const {html} = renderFeedback({
   ...idleState,
   phase: 'saving',
   requestPending: true,
   draftDirty: true,
  }, disabled);
  expectEnabled(html, 'cancel-wait');
  expect(visibleText(html)).toContain('停止等待');
  expect(visibleText(html)).toMatch(/(?:不会|不代表|不等于|不保证).{0,40}(?:回滚|撤销|撤回|取消|终止|停止|后端)|(?:后端|请求).{0,24}(?:仍|继续)|(?:仅|只).{0,12}(?:停止|结束).{0,8}等待/u);
  for (const action of ['retry-delivery', 'read-saved', 'load-latest', 'compare-draft'] as const) expectUnavailable(html, action);
 });

 it('keeps an unresolved reconcile draft and does not create a retry-save or write action', () => {
  const {html} = renderFeedback({
   ...idleState,
   phase: 'reconcile',
   requiresReadback: true,
   draftDirty: true,
   error: '读取结果尚未核对；请保留本次复核草稿。',
  });
  expect(visibleText(html)).toMatch(/(?:保留|仍在|未丢失|不丢失).{0,24}草稿|草稿.{0,24}(?:保留|仍在|未丢失|不丢失)/u);
  expectUnavailable(html, 'retry-delivery');
  expect(html).not.toMatch(/data-c2-review-action="(?:retry-save|save|patch|write|submit|overwrite)"/u);
 });

 it('escapes public conflict errors verbatim without deriving success from their contents', () => {
  const error = '版本冲突：服务端原文“保存成功”仍待核对 <script>alert("x")</script> & "原文"';
  const {html} = renderFeedback({
   ...idleState,
   phase: 'reconcile',
   requiresReadback: true,
   draftDirty: true,
   error,
  });
  expect(html).toContain(renderToStaticMarkup(<>{error}</>));
  expect(html).not.toContain('<script>');
  expect(html).not.toContain('data-phase="ready"');
  expect(html).not.toMatch(/data-c2-review-(?:success|verified)(?:=|\s|>)/u);
  expectUnavailable(html, 'retry-delivery');
 });

 it.each([
  {name: 'owner allows readback', canReadSaved: true, requestPending: false, disabled: false, requiresRestart: false, enabled: true},
  {name: 'owner withholds readback', canReadSaved: false, requestPending: false, disabled: false, requiresRestart: false, enabled: false},
  {name: 'a request is pending', canReadSaved: true, requestPending: true, disabled: false, requiresRestart: false, enabled: false},
  {name: 'the parent disables actions', canReadSaved: true, requestPending: false, disabled: true, requiresRestart: false, enabled: false},
  {name: 'the owner requires restart', canReadSaved: true, requestPending: false, disabled: false, requiresRestart: true, enabled: false},
 ])('projects read-saved only when $name', ({canReadSaved, requestPending, disabled, requiresRestart, enabled}) => {
  const {html} = renderFeedback({
   ...idleState,
   phase: 'reconcile',
   requiresReadback: true,
   draftDirty: true,
   canReadSaved,
   requestPending,
   requiresRestart,
  }, disabled);
  if (enabled) expectEnabled(html, 'read-saved');
  else expectUnavailable(html, 'read-saved');
 });

 it.each([false, true])('blocks read/load/compare/delivery retry on restart while pending cancellation remains available, disabled=%s', disabled => {
  const {html} = renderFeedback({
   ...idleState,
   phase: 'delivering',
   requestPending: true,
   canRetryDelivery: true,
   requiresReadback: true,
   requiresRestart: true,
   draftDirty: true,
   canReadSaved: true,
   canLoadLatest: true,
   canCompareDraft: true,
  }, disabled);
  expectEnabled(html, 'cancel-wait');
  for (const action of ['retry-delivery', 'read-saved', 'load-latest', 'compare-draft'] as const) expectUnavailable(html, action);
 });

 it.each([
  {draftDirty: false, canLoadLatest: false, canCompareDraft: false},
  {draftDirty: true, canLoadLatest: false, canCompareDraft: false},
  {draftDirty: true, canLoadLatest: true, canCompareDraft: false},
  {draftDirty: true, canLoadLatest: false, canCompareDraft: true},
  {draftDirty: true, canLoadLatest: true, canCompareDraft: true},
 ])('keeps load-latest and compare-draft independent and obeys the owner dirty-draft guards: %j', ({draftDirty, canLoadLatest, canCompareDraft}) => {
  const {html} = renderFeedback({
   ...idleState,
   phase: 'reconcile',
   requiresReadback: true,
   draftDirty,
   canLoadLatest,
   canCompareDraft,
  });
  if (canLoadLatest) expectEnabled(html, 'load-latest');
  else expectUnavailable(html, 'load-latest');
  if (canCompareDraft) expectEnabled(html, 'compare-draft');
  else expectUnavailable(html, 'compare-draft');
  expect((html.match(/data-c2-review-action="load-latest"/gu) ?? []).length).toBeLessThanOrEqual(1);
  expect((html.match(/data-c2-review-action="compare-draft"/gu) ?? []).length).toBeLessThanOrEqual(1);
  expectUnavailable(html, 'read-saved');
 });

 it.each([
  {requestPending: true, disabled: false},
  {requestPending: false, disabled: true},
 ])('blocks owner-approved load and compare while pending=$requestPending and disabled=$disabled', ({requestPending, disabled}) => {
  const {html} = renderFeedback({
   ...idleState,
   phase: 'reconcile',
   requestPending,
   draftDirty: true,
   canLoadLatest: true,
   canCompareDraft: true,
  }, disabled);
  expectUnavailable(html, 'load-latest');
  expectUnavailable(html, 'compare-draft');
 });

 it('offers delivery retry after delivery failure without exposing a writer', () => {
  const error = '结果投递失败，保存状态仍需由外层确认。';
  const {html} = renderFeedback({
   ...idleState,
   phase: 'delivering',
   canRetryDelivery: true,
   draftDirty: true,
   error,
  });
  expectEnabled(html, 'retry-delivery');
  expect(html).toContain(error);
  const retry = html.match(/<button\b(?=[^>]*\bdata-c2-review-action="retry-delivery")[^>]*>([\s\S]*?)<\/button>/u)?.[1];
  expect(visibleText(retry ?? '')).not.toBe('');
  for (const action of ['cancel-wait', 'read-saved', 'load-latest', 'compare-draft'] as const) expectUnavailable(html, action);
 });

 it.each([
  {canRetryDelivery: false, requestPending: false, requiresRestart: false, requiresReadback: false, disabled: false},
  {canRetryDelivery: true, requestPending: true, requiresRestart: false, requiresReadback: false, disabled: false},
  {canRetryDelivery: true, requestPending: false, requiresRestart: false, requiresReadback: false, disabled: true},
  {canRetryDelivery: true, requestPending: false, requiresRestart: true, requiresReadback: false, disabled: false},
  {canRetryDelivery: true, requestPending: false, requiresRestart: false, requiresReadback: true, disabled: false},
 ])('withholds delivery retry when its public guard is closed: %j', ({disabled, ...guard}) => {
  const {html} = renderFeedback({...idleState, phase: 'delivering', error: '审阅结果交接失败。', ...guard}, disabled);
  expectUnavailable(html, 'retry-delivery');
 });

 it.each(['', '   '])('does not infer a delivery failure from an empty public error: %j', error => {
  const {html} = renderFeedback({...idleState, phase: 'delivering', canRetryDelivery: true, error});
  expectUnavailable(html, 'retry-delivery');
 });

 it('does not infer a readback path or delivery retry from capability flags alone', () => {
  const {html} = renderFeedback({
   ...idleState,
   canReadSaved: true,
   canLoadLatest: true,
   canCompareDraft: true,
   canRetryDelivery: true,
   error: '外层原文仅作显示。',
  });
  for (const action of actions) expectUnavailable(html, action);
 });

 it('renders ready as the owner projection without manufacturing receipt, source or CAS data', () => {
  const notice = '外层状态说明：请按当前复核流程继续。';
  const {html} = renderFeedback({...idleState, phase: 'ready', notice});
  expect(html).toContain(notice);
  expect(html).not.toMatch(/\b(?:CAS|compareAndSwap|expectedRevision|sourceVerified|savedSummary|sessionId|reviewRevision)\b/u);
  for (const action of actions) expectUnavailable(html, action);
 });

 it.each(['blocked', 'unavailable'] as const)('retains the owner-supplied %s reason and notice', phase => {
  const blockedReason = '当前路径不可继续 <保留原文>';
  const notice = '请保留当前复核草稿。';
  const {html} = renderFeedback({...idleState, phase, blockedReason, notice, draftDirty: true});
  expect(html).toContain(renderToStaticMarkup(<>{blockedReason}</>));
  expect(html).toContain(notice);
  for (const action of actions) expectUnavailable(html, action);
 });

 it('exposes a live status region and preserves a frozen input state during SSR', () => {
  const state: Candidate2ReviewFeedbackState = Object.freeze({
   ...idleState,
   phase: 'reconcile',
   requiresReadback: true,
   draftDirty: true,
   notice: '状态由外层提供。',
   error: '尚待读取并核对。',
  });
  const before = {...state};
  const {html} = renderFeedback(state);
  expect(html).toMatch(/<[a-z][^>]*(?=[^>]*\brole="status")(?=[^>]*\baria-live="(?:polite|assertive)")[^>]*>/u);
  expect(state).toEqual(before);
 });
});
