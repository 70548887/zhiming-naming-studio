import {calculateRenCommentary as calculateV14,validRenCommentaryAnalysis as validV14} from './ditian-ren-v14';
import {calculateRenJointBattleAnalysis} from './ren-joint-battle';
import {normalizeRenMethod,REN_DIRECTION_METHOD,REN_JOINT_BATTLE_METHOD} from '../shared/ren-method';
import {canonicalPlainJson} from '../shared/plain-json';
import type {BaziAnalysis,BirthProfile,RenCommentaryAnalysis} from '../shared/types';
export * from './ditian-ren-v14';
export const REN_JOINT_BATTLE_COMMENTARY_VERSION='ditian-ren-commentary-2600158/1.5.0' as const;
const BAZI_JOINT_VERSION='civil-midnight-fuyi-candidate/1.15.0;lunar-typescript/1.8.6';
const BAZI_DIRECTION_VERSION='civil-midnight-fuyi-candidate/1.14.0;lunar-typescript/1.8.6';
const prior=(profile:BirthProfile,bazi:BaziAnalysis)=>({profile:{...profile,renMethod:REN_DIRECTION_METHOD},bazi:{...bazi,version:BAZI_DIRECTION_VERSION}});
/** Only explicit1.5 adds the adopted joint result. Historical methods retain complete frozen calculators. */
export function calculateRenCommentary(profile:BirthProfile,bazi:BaziAnalysis):RenCommentaryAnalysis|undefined {
 if(normalizeRenMethod(profile.renMethod)!==REN_JOINT_BATTLE_METHOD)return calculateV14(profile,bazi);
 if(bazi.version!==BAZI_JOINT_VERSION)throw new Error('任注1.5联合动气需要对应1.15出生分析，不得嫁接旧版本。');
 const input=prior(profile,bazi),base=calculateV14(input.profile,input.bazi)!;
 if(!validV14(base,input.profile,input.bazi))throw new Error('任注1.5继承的1.4完整分析未通过验证。');
 const jointBattleAnalysis=calculateRenJointBattleAnalysis(base,input.profile,input.bazi);
 return {...base,version:REN_JOINT_BATTLE_COMMENTARY_VERSION,profileId:REN_JOINT_BATTLE_COMMENTARY_VERSION,input:{...base.input,baziVersion:bazi.version},jointBattleAnalysis,sourceRules:[...base.sourceRules,...jointBattleAnalysis.sourceReferences]};
}
export function validRenCommentaryAnalysis(value:unknown,profile:BirthProfile,bazi:BaziAnalysis):value is RenCommentaryAnalysis|undefined {
 try {
  if(value!==undefined)canonicalPlainJson(value);
  if(normalizeRenMethod(profile.renMethod)!==REN_JOINT_BATTLE_METHOD)return validV14(value,profile,bazi);
  if(bazi.version!==BAZI_JOINT_VERSION)return false;
  return canonicalPlainJson(value)===canonicalPlainJson(calculateRenCommentary(profile,bazi));
 }catch{return false;}
}
