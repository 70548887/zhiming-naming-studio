import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {MonthAuthorityMethodField} from './MonthAuthorityMethodField';
import {formDraftKey,validateBirthDraft} from './ui-state';
import {canApplyDraftResult,createDraftTicket,isSessionCurrent,namingInputKey,normalizePreferences} from '../shared/workflow';
import {catalogSession} from '../../tests/fixtures/catalog-session';
import {normalizeMonthAuthorityMethod,validMonthAuthorityMethod} from '../shared/month-authority-method';

describe('explicit month authority method across UI and draft ownership',()=>{
 it('defaults older profiles to the non-fixed-day method without making the input stale or dirty',()=>{
  const s=catalogSession(),p={...s.profile,monthAuthorityMethod:'no-fixed-day/1.0.0' as const};
  expect(namingInputKey(p,s.preferences)).toBe(namingInputKey(s.profile,s.preferences));
  expect(formDraftKey(p,s.preferences)).toBe(formDraftKey(s.profile,s.preferences));
  expect(isSessionCurrent(p,s.preferences,s)).toBe(true);
 });
 it('changing the named table invalidates displayed results and in-flight response tickets',()=>{
  const s=catalogSession(),fixed={...s.profile,monthAuthorityMethod:'sanming-first-paragraph/1.0.0' as const},ticket=createDraftTicket(4,s.profile,s.preferences);
  expect(isSessionCurrent(fixed,s.preferences,s)).toBe(false);
  expect(canApplyDraftResult(ticket,4,fixed,s.preferences)).toBe(false);
  expect(formDraftKey(fixed,s.preferences)).not.toBe(formDraftKey(s.profile,s.preferences));
 });
 it('labels a real select and exposes the limits needed to choose a method',()=>{
  const html=renderToStaticMarkup(<MonthAuthorityMethodField onChange={()=>{}}/>);
  expect(html).toContain('for="birth-month-authority"');expect(html).toContain('select id="birth-month-authority"');
  expect(html).toContain('value="no-fixed-day/1.0.0" selected=""');expect(html).toContain('实际24小时');expect(html).toContain('不改变现有扶抑和名字排序');
  const fixed=renderToStaticMarkup(<MonthAuthorityMethodField value="sanming-first-paragraph/1.0.0" onChange={()=>{}} error="请选择支持的方法"/>);
  expect(fixed).toContain('aria-invalid="true"');expect(fixed).toContain('首段分日表（转录参考）');
 });
 it('rejects unknown method IDs instead of falling back to another school silently',()=>{
  const s=catalogSession();expect(validMonthAuthorityMethod('auto-best-school')).toBe(false);expect(()=>normalizeMonthAuthorityMethod('auto-best-school')).toThrow('无效');
  expect(validateBirthDraft({...s.profile,monthAuthorityMethod:'auto-best-school' as any}).monthAuthorityMethod).toContain('无效');
  expect(normalizeMonthAuthorityMethod(undefined)).toBe('no-fixed-day/1.0.0');expect(normalizePreferences().preferredElements).toEqual([]);
 });
});
