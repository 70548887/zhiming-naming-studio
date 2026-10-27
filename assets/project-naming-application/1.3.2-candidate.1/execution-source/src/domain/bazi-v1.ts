import type { BaziAnalysis,BirthProfile } from '../shared/types';
import { resolveBirthContext } from '../shared/civil-birth-v1';
import { calculateLegacyBazi } from './bazi-legacy';
import { calculateBaziEvidence } from './bazi-evidence-v1';

export const BAZI_V1_RULE_VERSION='civil-midnight-fuyi-candidate/1.1.0;lunar-typescript/1.8.6';

/** Frozen 1.1 profile: original evidence only, never a later month-authority table. */
export function calculateBaziV1(profile:BirthProfile):BaziAnalysis {
  const context=resolveBirthContext(profile),base=calculateLegacyBazi(profile,context);
  return {...base,version:BAZI_V1_RULE_VERSION,evidence:calculateBaziEvidence(base,{timezone:context.timezone,timeUnknown:profile.timeUnknown,ambiguous:context.ambiguous,ranges:[{startEpoch:context.startEpoch,endEpoch:context.endEpoch}]})};
}
