import type {BaziAnalysis,BirthProfile} from '../shared/types';
import {resolveBirthContext} from '../shared/civil-birth';
import {normalizeMonthAuthorityMethod} from '../shared/month-authority-method';
import {normalizeSeasonalMethod} from '../shared/seasonal-method';
import {calculateLegacyBazi} from './bazi-legacy';
import {calculateBaziEvidence} from './bazi-evidence-v5';

export const BAZI_V5_RULE_VERSION='civil-midnight-fuyi-candidate/1.5.0;lunar-typescript/1.8.6';
/** Frozen1.5 retains independent seasonal prerequisites but never receives a later pattern inference. */
export function calculateBaziV5(profile:BirthProfile):BaziAnalysis{
 const context=resolveBirthContext(profile),original=calculateLegacyBazi(profile,context),base={...original,solarDate:profile.timeUnknown?original.solarDate:context.local.toYmdHms()};
 return {...base,version:BAZI_V5_RULE_VERSION,evidence:calculateBaziEvidence(base,{timezone:context.timezone,timeUnknown:profile.timeUnknown,ambiguous:context.ambiguous,monthAuthorityMethod:normalizeMonthAuthorityMethod(profile.monthAuthorityMethod),seasonalMethod:normalizeSeasonalMethod(profile.seasonalMethod),ranges:[{startEpoch:context.startEpoch,endEpoch:context.endEpoch}]})};
}
