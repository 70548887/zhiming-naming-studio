import type { BaziAnalysis,BirthProfile } from '../shared/types';
import { resolveBirthContext } from '../shared/civil-birth-v1';
import { normalizeMonthAuthorityMethod } from '../shared/month-authority-method';
import { calculateLegacyBazi } from './bazi-legacy';
import { calculateBaziEvidence } from './bazi-evidence-v2';

export const BAZI_V2_RULE_VERSION='civil-midnight-fuyi-candidate/1.2.0;lunar-typescript/1.8.6';

/** Frozen1.2 supports its original month-authority choice but never a later monthly seasonal method. */
export function calculateBaziV2(profile:BirthProfile):BaziAnalysis {
  const context=resolveBirthContext(profile),base=calculateLegacyBazi(profile,context);
  return {...base,version:BAZI_V2_RULE_VERSION,evidence:calculateBaziEvidence(base,{timezone:context.timezone,timeUnknown:profile.timeUnknown,ambiguous:context.ambiguous,monthAuthorityMethod:normalizeMonthAuthorityMethod(profile.monthAuthorityMethod),ranges:[{startEpoch:context.startEpoch,endEpoch:context.endEpoch}]})};
}
