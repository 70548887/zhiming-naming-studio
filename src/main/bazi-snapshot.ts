import { isDeepStrictEqual } from 'node:util';
import { BAZI_RULE_VERSION, BAZI_REN_RULE_VERSION, BAZI_REN_V1_RULE_VERSION,BAZI_REN_ACTION_RULE_VERSION,BAZI_REN_CAPACITY_RULE_VERSION,BAZI_REN_DIRECTION_RULE_VERSION,BAZI_REN_JOINT_BATTLE_RULE_VERSION } from '../domain/engine';
import { LEGACY_BAZI_RULE_VERSION } from '../domain/bazi-legacy';
import { BAZI_V1_RULE_VERSION } from '../domain/bazi-v1';
import { BAZI_V2_RULE_VERSION } from '../domain/bazi-v2';
import { BAZI_V3_RULE_VERSION } from '../domain/bazi-v3';
import { BAZI_V4_RULE_VERSION } from '../domain/bazi-v4';
import { BAZI_V5_RULE_VERSION } from '../domain/bazi-v5';
import { BAZI_V6_RULE_VERSION } from '../domain/bazi-v6';
import { BAZI_V7_RULE_VERSION } from '../domain/engine-v7';
import { BAZI_V8_RULE_VERSION } from '../domain/engine-v8';
import { expectedBazi } from './expected-analysis';
import { normalizeMonthAuthorityMethod } from '../shared/month-authority-method';
import { normalizeSeasonalMethod } from '../shared/seasonal-method';
import type { BaziAnalysis, BirthProfile } from '../shared/types';

export type BaziSnapshotStatus='verified-current'|'verified-legacy'|'unsupported-version'|'invalid';

/**
 * Legacy snapshots use the frozen original profile and must not contain newly attached
 * evidence. Unknown versions are refused; no saved historical result is upgraded in place.
 */
export function baziSnapshotStatus(bazi:unknown,profile:BirthProfile):BaziSnapshotStatus {
  if(!bazi || typeof bazi!=='object' || !('version' in bazi) || typeof bazi.version!=='string')return 'invalid';
  if(bazi.version!==BAZI_REN_JOINT_BATTLE_RULE_VERSION&&bazi.version!==BAZI_REN_DIRECTION_RULE_VERSION&&bazi.version!==BAZI_REN_CAPACITY_RULE_VERSION&&bazi.version!==BAZI_REN_ACTION_RULE_VERSION&&bazi.version!==BAZI_RULE_VERSION && bazi.version!==BAZI_REN_RULE_VERSION&&bazi.version!==BAZI_REN_V1_RULE_VERSION && bazi.version!==LEGACY_BAZI_RULE_VERSION&&bazi.version!==BAZI_V1_RULE_VERSION&&bazi.version!==BAZI_V2_RULE_VERSION&&bazi.version!==BAZI_V3_RULE_VERSION&&bazi.version!==BAZI_V4_RULE_VERSION&&bazi.version!==BAZI_V5_RULE_VERSION&&bazi.version!==BAZI_V6_RULE_VERSION&&bazi.version!==BAZI_V7_RULE_VERSION&&bazi.version!==BAZI_V8_RULE_VERSION)return 'unsupported-version';
  try{
    const method=normalizeMonthAuthorityMethod(profile.monthAuthorityMethod);
    const seasonal=normalizeSeasonalMethod(profile.seasonalMethod);
    if(bazi.version!==BAZI_REN_JOINT_BATTLE_RULE_VERSION&&bazi.version!==BAZI_REN_DIRECTION_RULE_VERSION&&bazi.version!==BAZI_REN_CAPACITY_RULE_VERSION&&bazi.version!==BAZI_REN_ACTION_RULE_VERSION&&bazi.version!==BAZI_RULE_VERSION&&bazi.version!==BAZI_REN_RULE_VERSION&&bazi.version!==BAZI_REN_V1_RULE_VERSION&&bazi.version!==BAZI_V3_RULE_VERSION&&bazi.version!==BAZI_V4_RULE_VERSION&&bazi.version!==BAZI_V5_RULE_VERSION&&bazi.version!==BAZI_V6_RULE_VERSION&&bazi.version!==BAZI_V7_RULE_VERSION&&bazi.version!==BAZI_V8_RULE_VERSION&&seasonal!=='no-monthly/1.0.0')return 'invalid';
    if(bazi.version!==BAZI_REN_JOINT_BATTLE_RULE_VERSION&&bazi.version!==BAZI_REN_DIRECTION_RULE_VERSION&&bazi.version!==BAZI_REN_CAPACITY_RULE_VERSION&&bazi.version!==BAZI_REN_ACTION_RULE_VERSION&&bazi.version!==BAZI_RULE_VERSION&&bazi.version!==BAZI_REN_RULE_VERSION&&bazi.version!==BAZI_REN_V1_RULE_VERSION&&bazi.version!==BAZI_V2_RULE_VERSION&&bazi.version!==BAZI_V3_RULE_VERSION&&bazi.version!==BAZI_V4_RULE_VERSION&&bazi.version!==BAZI_V5_RULE_VERSION&&bazi.version!==BAZI_V6_RULE_VERSION&&bazi.version!==BAZI_V7_RULE_VERSION&&bazi.version!==BAZI_V8_RULE_VERSION&&method!=='no-fixed-day/1.0.0')return 'invalid';
    const expected=expectedBazi(profile,bazi.version);
    return isDeepStrictEqual(bazi,expected)?bazi.version===BAZI_REN_JOINT_BATTLE_RULE_VERSION||bazi.version===BAZI_REN_DIRECTION_RULE_VERSION||bazi.version===BAZI_REN_CAPACITY_RULE_VERSION||bazi.version===BAZI_REN_ACTION_RULE_VERSION||bazi.version===BAZI_RULE_VERSION||bazi.version===BAZI_REN_RULE_VERSION||bazi.version===BAZI_REN_V1_RULE_VERSION?'verified-current':'verified-legacy':'invalid';
  }
  catch{return 'invalid';}
}

/** All generated fields, including explanations/warnings, must match the saved input. */
export function validBaziSnapshot(bazi:unknown,profile:BirthProfile):bazi is BaziAnalysis {
  const status=baziSnapshotStatus(bazi,profile);
  return status==='verified-current'||status==='verified-legacy';
}
