import type {RenMethod} from './types';
export const DEFAULT_REN_METHOD:RenMethod='none';
export const REN_METHOD:RenMethod='ditian-ren-commentary-2600158/1.1.0';
export const LEGACY_REN_METHOD:RenMethod='ditian-ren-commentary-2600158/1.0.0';
export const REN_ACTION_METHOD:RenMethod='ditian-ren-commentary-2600158/1.2.0';
export const REN_CAPACITY_METHOD:RenMethod='ditian-ren-commentary-2600158/1.3.0';
export const REN_DIRECTION_METHOD:RenMethod='ditian-ren-commentary-2600158/1.4.0';
export const REN_JOINT_BATTLE_METHOD:RenMethod='ditian-ren-commentary-2600158/1.5.0';
export function validRenMethod(value:unknown):value is RenMethod|undefined {
  return value===undefined||value===DEFAULT_REN_METHOD||value===REN_METHOD||value===LEGACY_REN_METHOD||value===REN_ACTION_METHOD||value===REN_CAPACITY_METHOD||value===REN_DIRECTION_METHOD||value===REN_JOINT_BATTLE_METHOD;
}
export function normalizeRenMethod(value:unknown):RenMethod {
  if(!validRenMethod(value))throw new Error('任注独立参考方法无效，请选择已提供的方法。');
  return value??DEFAULT_REN_METHOD;
}
