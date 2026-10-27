import type {BaziAnalysis,BirthProfile} from '../shared/types';
import {resolveBirthContext} from '../shared/civil-birth';
import {normalizeMonthAuthorityMethod} from '../shared/month-authority-method';
import {normalizeSeasonalMethod} from '../shared/seasonal-method';
import {calculateLegacyBazi} from './bazi-legacy';
import {calculateBaziEvidence} from './bazi-evidence-v4';

export const BAZI_V4_RULE_VERSION='civil-midnight-fuyi-candidate/1.4.0;lunar-typescript/1.8.6';
/** Frozen1.4 has repaired second-resolution dates but no independent seasonal-condition supplement. */
export function calculateBaziV4(profile:BirthProfile):BaziAnalysis{
 const context=resolveBirthContext(profile),original=calculateLegacyBazi(profile,context),base={...original,solarDate:profile.timeUnknown?original.solarDate:context.local.toYmdHms()};
 return {...base,version:BAZI_V4_RULE_VERSION,evidence:calculateBaziEvidence(base,{timezone:context.timezone,timeUnknown:profile.timeUnknown,ambiguous:context.ambiguous,monthAuthorityMethod:normalizeMonthAuthorityMethod(profile.monthAuthorityMethod),seasonalMethod:normalizeSeasonalMethod(profile.seasonalMethod),ranges:[{startEpoch:context.startEpoch,endEpoch:context.endEpoch}]})};
}
