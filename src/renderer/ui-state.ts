import type { BirthProfile, NamingPreferences } from '../shared/types';
import { normalizePreferences } from '../shared/workflow';
import { LunarMonth } from 'lunar-typescript';
import {normalizeMonthAuthorityMethod,validMonthAuthorityMethod} from '../shared/month-authority-method';
import {normalizeSeasonalMethod,validSeasonalMethod} from '../shared/seasonal-method';
import {normalizeBirthTimeBasis,validBirthTimeBasis} from '../shared/birth-time-basis';
import {normalizeRenMethod,validRenMethod} from '../shared/ren-method';

export type BirthDraftErrors = Partial<Record<'surname' | 'birthDate' | 'birthTime' | 'timezone' | 'monthAuthorityMethod' | 'seasonalMethod' | 'timeBasis' | 'birthLongitude' | 'renMethod', string>>;
export const birthControlIds = { surname: 'birth-surname', birthDate: 'birth-date', birthTime: 'birth-time', timezone: 'birth-timezone',monthAuthorityMethod:'birth-month-authority',seasonalMethod:'birth-seasonal-method',timeBasis:'birth-time-basis',birthLongitude:'birth-longitude',renMethod:'birth-ren-method' };
export function validateBirthDraft(p: BirthProfile): BirthDraftErrors {
  const errors: BirthDraftErrors = {};
  if (!p.surname.trim()) errors.surname = '请填写宝宝姓氏。';
  else if (!/^[\p{Script=Han}]{1,4}$/u.test(p.surname.trim())) errors.surname = '姓氏需为 1–4 个汉字，支持复姓。';
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p.birthDate);
  if (!p.birthDate) errors.birthDate = '请选择或填写出生日期。';
  else if (!parts) errors.birthDate = '日期格式为 YYYY-MM-DD，例如 2026-10-17。';
  else {
    const [, y, m, d] = parts, year = Number(y), month = Number(m), day = Number(d), date = new Date(Date.UTC(year, month - 1, day));
    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > (p.calendar === 'lunar' ? 30 : 31)) errors.birthDate = '请填写 1900–2100 年内的有效日期。';
    else if (p.calendar === 'solar' && (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day)) errors.birthDate = '该公历日期不存在，请核对月份和天数。';
    else if (p.calendar === 'lunar') {
      const lunarMonth = LunarMonth.fromYm(year, p.leapMonth ? -month : month);
      if (!lunarMonth) errors.birthDate = '该农历年份没有所选闰月，请核对闰月选项。';
      else if (day > lunarMonth.getDayCount()) errors.birthDate = `该农历月只有 ${lunarMonth.getDayCount()} 天，请核对日期。`;
    }
  }
  if (!p.timeUnknown && !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(p.birthTime)) errors.birthTime = '请填写有效时刻，或勾选“暂不清楚出生时刻”。';
  try { new Intl.DateTimeFormat('zh-CN', { timeZone: p.timezone.trim() || 'Asia/Shanghai' }).format(0); }
  catch { errors.timezone = '时区无效，例如中国使用 Asia/Shanghai。'; }
  if(!validBirthTimeBasis(p.timeBasis))errors.timeBasis='排盘时间取法无效，请重新选择。';
  if(p.timeBasis==='apparent-solar'&&p.birthLongitude===undefined)errors.birthLongitude='选择真太阳时后，请填写出生地经度。';
  else if(p.birthLongitude!==undefined&&(typeof p.birthLongitude!=='number'||!Number.isFinite(p.birthLongitude)||p.birthLongitude < -180||p.birthLongitude > 180))errors.birthLongitude='经度需为 −180 至 180 的有效数字；东经为正，西经为负。';
  if(!validMonthAuthorityMethod(p.monthAuthorityMethod))errors.monthAuthorityMethod='月令参考方法无效，请重新选择。';
  if(!validSeasonalMethod(p.seasonalMethod))errors.seasonalMethod='逐月调候参考方法无效，请重新选择。';
  if(!validRenMethod(p.renMethod))errors.renMethod='任注独立参考方法无效，请重新选择。';
  return errors;
}

export function formDraftKey(profile: BirthProfile, preferences: NamingPreferences): string {
  const { namingPreferences: _, ...original } = profile;
  // Empty confirmation is the same untouched family state as a legacy absent field.
  if(Array.isArray(original.parentNameReadings)&&original.parentNameReadings.length===0)delete original.parentNameReadings;
  const p = { ...original, fatherName: original.fatherName ?? '', motherName: original.motherName ?? '',monthAuthorityMethod:normalizeMonthAuthorityMethod(original.monthAuthorityMethod),seasonalMethod:normalizeSeasonalMethod(original.seasonalMethod),renMethod:normalizeRenMethod(original.renMethod),timeBasis:normalizeBirthTimeBasis(original.timeBasis),birthLongitude:original.birthLongitude??null };
  // Always use the known form fields, independent of source object property ordering.
  return JSON.stringify({ profile: Object.fromEntries(Object.keys(p).sort().map(key => [key, p[key as keyof typeof p]])), preferences: normalizePreferences(preferences) });
}
