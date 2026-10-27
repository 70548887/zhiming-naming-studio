import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {SeasonalMethodField} from './SeasonalMethodField';
import {formDraftKey,validateBirthDraft} from './ui-state';
import {catalogSession} from '../../tests/fixtures/catalog-session';
import {isSessionCurrent,namingInputKey,createDraftTicket,canApplyDraftResult} from '../shared/workflow';
import {normalizeSeasonalMethod,validSeasonalMethod} from '../shared/seasonal-method';

describe('independent monthly seasonal method input',()=>{
 it('keeps historical omission equal to an explicit disabled method without changing a saved draft',()=>{
  const s=catalogSession(),p={...s.profile,seasonalMethod:'no-monthly/1.0.0' as const};
  expect(namingInputKey(p,s.preferences)).toBe(namingInputKey(s.profile,s.preferences));expect(formDraftKey(p,s.preferences)).toBe(formDraftKey(s.profile,s.preferences));expect(isSessionCurrent(p,s.preferences,s)).toBe(true);
 });
 it('invalidates old results and a pending response when a different attributed method is selected',()=>{
  const s=catalogSession(),p={...s.profile,seasonalMethod:'qiongtong-2294674-initial/1.0.0' as const},ticket=createDraftTicket(5,s.profile,s.preferences);
  expect(isSessionCurrent(p,s.preferences,s)).toBe(false);expect(canApplyDraftResult(ticket,5,p,s.preferences)).toBe(false);expect(formDraftKey(p,s.preferences)).not.toBe(formDraftKey(s.profile,s.preferences));
 });
 it('provides a labelled select that explains the scope and disabled default',()=>{
  const html=renderToStaticMarkup(<SeasonalMethodField onChange={()=>{}}/>);
  expect(html).toContain('for="birth-seasonal-method"');expect(html).toContain('value="no-monthly/1.0.0" selected=""');expect(html).toContain('初始取用参考');expect(html).toContain('不自动改变喜用或姓名排序');
  expect(renderToStaticMarkup(<SeasonalMethodField onChange={()=>{}} error="请重新选择"/>)).toContain('aria-invalid="true"');
 });
 it('rejects unregistered methods instead of silently mixing source profiles',()=>{
  expect(validSeasonalMethod('auto-tiaohou')).toBe(false);expect(()=>normalizeSeasonalMethod('auto-tiaohou')).toThrow('无效');
  expect(validateBirthDraft({...catalogSession().profile,seasonalMethod:'auto-tiaohou' as any}).seasonalMethod).toContain('无效');expect(normalizeSeasonalMethod(undefined)).toBe('no-monthly/1.0.0');
 });
});
