import React from 'react';
import type { BirthTimeBasis } from '../shared/types';
import { Field } from './Field';

export function BirthTimeBasisField({ value, longitude, timeUnknown, onChange, onLongitudeChange, error, longitudeError }: {
  value?: BirthTimeBasis; longitude?: number; timeUnknown: boolean;
  onChange: (value: BirthTimeBasis) => void; onLongitudeChange: (value: number | undefined) => void;
  error?: string; longitudeError?: string;
}) {
  const basis = value ?? 'civil';
  return <>
    <Field label="排盘时间取法" controlId="birth-time-basis" error={error} hint="出生记录原样保留；年、月和节气按实际出生瞬间，日、时干支按所选钟表计算。">
      <select id="birth-time-basis" value={basis} onChange={event => onChange(event.target.value as BirthTimeBasis)}>
        <option value="civil">民用时间（默认，按出生记录）</option>
        <option value="apparent-solar">真太阳时（需填写出生地经度）</option>
      </select>
    </Field>
    {(basis === 'apparent-solar' || longitudeError) && <>
      <Field label="出生地经度" required={basis === 'apparent-solar'} controlId="birth-longitude" error={longitudeError} hint="东经填正数，西经填负数，范围 −180° 至 180°。例如杭州约 120.16°；请按实际出生地点核对，不根据地名自动推定。">
        <input id="birth-longitude" type="number" min={-180} max={180} step="any" value={longitude ?? ''} placeholder="如：120.16" onChange={event => onLongitudeChange(event.target.value === '' ? undefined : Number(event.target.value))}/>
      </Field>
      {basis === 'apparent-solar' && <p className="field-hint">真太阳时会影响八字与奇门的日、时干支，换算后可能跨日。{timeUnknown ? '时刻未知时换算整段出生日期；跨日则保留多个日期候选，不补造日主或时柱。' : '换算记录和资料依据会随方案保存，可在出生分析中核对。'}</p>}
    </>}
  </>;
}
