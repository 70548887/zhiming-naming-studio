import {analyzeProfile as analyzeV14} from './engine-v14';
import {calculateRenCommentary} from './ditian-ren';
import {normalizeRenMethod,REN_DIRECTION_METHOD,REN_JOINT_BATTLE_METHOD} from '../shared/ren-method';
import type {Analysis,BirthProfile} from '../shared/types';
export * from './engine-v14';
export const BAZI_REN_JOINT_BATTLE_RULE_VERSION='civil-midnight-fuyi-candidate/1.15.0;lunar-typescript/1.8.6';

/**1.5 preserves original1.4 nodes, local proofs, scores and nested metadata before adding joint evidence. */
export function analyzeProfile(profile:BirthProfile):Analysis {
 if(normalizeRenMethod(profile.renMethod)!==REN_JOINT_BATTLE_METHOD)return analyzeV14(profile);
 const inherited=analyzeV14({...profile,renMethod:REN_DIRECTION_METHOD});
 const bazi={...inherited.bazi,version:BAZI_REN_JOINT_BATTLE_RULE_VERSION};
 return {...inherited,bazi,renCommentary:calculateRenCommentary(profile,bazi)!};
}
