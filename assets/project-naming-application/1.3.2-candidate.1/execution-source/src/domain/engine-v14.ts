import {analyzeProfile as analyzeV13} from './engine-v13';
import {calculateRenCommentary} from './ditian-ren-v14';
import {normalizeRenMethod,REN_CAPACITY_METHOD,REN_DIRECTION_METHOD} from '../shared/ren-method';
import type {Analysis,BirthProfile} from '../shared/types';
export * from './engine-v13';
export const BAZI_REN_DIRECTION_RULE_VERSION='civil-midnight-fuyi-candidate/1.14.0;lunar-typescript/1.8.6';

/** Historical methods always use the complete frozen1.13 engine, including the original nested capability metadata. */
export function analyzeProfile(profile:BirthProfile):Analysis {
 if(normalizeRenMethod(profile.renMethod)!==REN_DIRECTION_METHOD)return analyzeV13(profile);
 const inherited=analyzeV13({...profile,renMethod:REN_CAPACITY_METHOD});
 const bazi={...inherited.bazi,version:BAZI_REN_DIRECTION_RULE_VERSION};
 return {...inherited,bazi,renCommentary:calculateRenCommentary(profile,bazi)!};
}
