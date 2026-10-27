import type {RenMethod} from './types';
export const DEFAULT_REN_METHOD:RenMethod='none';
export const REN_METHOD:RenMethod='ditian-ren-commentary-2600158/1.0.0';
export function validRenMethod(value:unknown):value is RenMethod|undefined {
  return value===undefined||value===DEFAULT_REN_METHOD||value===REN_METHOD;
}
export function normalizeRenMethod(value:unknown):RenMethod {
  if(!validRenMethod(value))throw new Error('任注独立参考方法无效，请选择已提供的方法。');
  return value??DEFAULT_REN_METHOD;
}
