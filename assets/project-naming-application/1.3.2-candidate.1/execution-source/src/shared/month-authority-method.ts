import type { MonthAuthorityMethod } from './types';

export const MONTH_AUTHORITY_METHODS = ['no-fixed-day/1.0.0','sanming-first-paragraph/1.0.0'] as const;
export const DEFAULT_MONTH_AUTHORITY_METHOD:MonthAuthorityMethod='no-fixed-day/1.0.0';
export function validMonthAuthorityMethod(value:unknown):value is MonthAuthorityMethod|undefined {
  return value===undefined||MONTH_AUTHORITY_METHODS.some(method=>method===value);
}
export function normalizeMonthAuthorityMethod(value:unknown):MonthAuthorityMethod {
  if(!validMonthAuthorityMethod(value))throw new Error('月令参考方法无效，请选择已提供的方法。');
  return value??DEFAULT_MONTH_AUTHORITY_METHOD;
}
