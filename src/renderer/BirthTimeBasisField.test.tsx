import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BirthTimeBasisField } from './BirthTimeBasisField';
import { formDraftKey, validateBirthDraft, birthControlIds } from './ui-state';
import { catalogSession } from '../../tests/fixtures/catalog-session';
import { canApplyDraftResult, createDraftTicket, isSessionCurrent, namingInputKey } from '../shared/workflow';

describe('birth clock selection and longitude draft', () => {
  it('keeps old omitted civil selection equal to an explicit default without making an old profile dirty', () => {
    const session = catalogSession(), profile = { ...session.profile, timeBasis: 'civil' as const, birthLongitude: undefined };
    expect(namingInputKey(profile, session.preferences)).toBe(namingInputKey(session.profile, session.preferences));
    expect(formDraftKey(profile, session.preferences)).toBe(formDraftKey(session.profile, session.preferences));
    expect(isSessionCurrent(profile, session.preferences, session)).toBe(true);
  });
  it('invalidates an existing result and pending request when either basis or longitude changes, including civil stored longitude', () => {
    const session = catalogSession(), ticket = createDraftTicket(3, session.profile, session.preferences);
    for (const profile of [{ ...session.profile, timeBasis: 'apparent-solar' as const, birthLongitude: 120.16 }, { ...session.profile, timeBasis: 'civil' as const, birthLongitude: 120.16 }]) {
      expect(isSessionCurrent(profile, session.preferences, session)).toBe(false);
      expect(canApplyDraftResult(ticket, 3, profile, session.preferences)).toBe(false);
      expect(formDraftKey(profile, session.preferences)).not.toBe(formDraftKey(session.profile, session.preferences));
    }
    expect(namingInputKey({ ...session.profile, timeBasis: 'apparent-solar', birthLongitude: 120.16 }, session.preferences)).not.toBe(namingInputKey({ ...session.profile, timeBasis: 'apparent-solar', birthLongitude: 120.17 }, session.preferences));
  });
  it('requires a finite range longitude only for solar and validates supplied values in civil too', () => {
    const profile = catalogSession().profile;
    expect(validateBirthDraft(profile)).toEqual({});
    expect(validateBirthDraft({ ...profile, timeBasis: 'apparent-solar' }).birthLongitude).toContain('请填写');
    for (const value of [NaN, Infinity, -181, 181, '120' as unknown as number, null as unknown as number]) expect(validateBirthDraft({ ...profile, birthLongitude: value }).birthLongitude).toContain('有效数字');
    for (const value of [-180, 0, 180, -74.006, 120.16]) expect(validateBirthDraft({ ...profile, timeBasis: 'apparent-solar', birthLongitude: value }).birthLongitude).toBeUndefined();
    expect(validateBirthDraft({ ...profile, timeBasis: 'guess-from-place' as any }).timeBasis).toContain('无效');
    expect(birthControlIds.birthLongitude).toBe('birth-longitude'); expect(birthControlIds.timeBasis).toBe('birth-time-basis');
  });
  it('labels the default select, conditionally requires longitude, and explains unknown-time behavior without a geographic guess', () => {
    const props = { timeUnknown: false, onChange: () => {}, onLongitudeChange: () => {} };
    const civil = renderToStaticMarkup(<BirthTimeBasisField {...props}/>);
    expect(civil).toContain('for="birth-time-basis"'); expect(civil).toContain('value="civil" selected=""'); expect(civil).not.toContain('id="birth-longitude"');
    const solar = renderToStaticMarkup(<BirthTimeBasisField {...props} value="apparent-solar" timeUnknown longitude={0} longitudeError="请输入经度"/>);
    for (const value of ['id="birth-longitude"', 'aria-required="true"', 'aria-invalid="true"', 'value="0"', '不根据地名自动推定', '不补造日主或时柱', '八字与奇门']) expect(solar).toContain(value);
    const invalidCivil = renderToStaticMarkup(<BirthTimeBasisField {...props} value="civil" longitudeError="经度超出范围"/>);
    expect(invalidCivil).toContain('id="birth-longitude"'); expect(invalidCivil).not.toContain('aria-required="true"');
  });
});
