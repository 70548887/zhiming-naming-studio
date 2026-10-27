import type {SeasonalMethod} from './types';

export const DEFAULT_SEASONAL_METHOD:SeasonalMethod='no-monthly/1.0.0';
export function validSeasonalMethod(value:unknown):value is SeasonalMethod|undefined {
 return value===undefined||value==='no-monthly/1.0.0'||value==='qiongtong-2294674-initial/1.0.0';
}
export function normalizeSeasonalMethod(value:unknown):SeasonalMethod {
 if(!validSeasonalMethod(value))throw new Error('逐月调候参考方法无效，请选择已提供的方法。');
 return value??DEFAULT_SEASONAL_METHOD;
}
