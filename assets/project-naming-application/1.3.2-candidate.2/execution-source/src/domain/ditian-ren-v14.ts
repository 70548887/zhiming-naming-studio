import {calculateRenCommentary as calculateV13,validRenCommentaryAnalysis as validV13} from './ditian-ren-v13';
import {calculateRenDirectionAnalysis} from './ren-directions';
import {normalizeRenMethod,REN_CAPACITY_METHOD,REN_DIRECTION_METHOD} from '../shared/ren-method';
import {canonicalPlainJson} from '../shared/plain-json';
import type {BaziAnalysis,BirthProfile,RenCommentaryAnalysis} from '../shared/types';
export * from './ditian-ren-v13';
export const REN_DIRECTION_COMMENTARY_VERSION='ditian-ren-commentary-2600158/1.4.0' as const;
const BAZI_DIRECTION_VERSION='civil-midnight-fuyi-candidate/1.14.0;lunar-typescript/1.8.6';
const BAZI_CAPACITY_VERSION='civil-midnight-fuyi-candidate/1.13.0;lunar-typescript/1.8.6';
const prior=(profile:BirthProfile,bazi:BaziAnalysis)=>({profile:{...profile,renMethod:REN_CAPACITY_METHOD},bazi:{...bazi,version:BAZI_CAPACITY_VERSION}});
/** Every old method retains its frozen calculator;1.4 adds a separate source-sufficient local direction layer. */
export function calculateRenCommentary(profile:BirthProfile,bazi:BaziAnalysis):RenCommentaryAnalysis|undefined {
 if(normalizeRenMethod(profile.renMethod)!==REN_DIRECTION_METHOD)return calculateV13(profile,bazi);
 if(bazi.version!==BAZI_DIRECTION_VERSION)throw new Error('任注1.4方向局部旺势需要对应1.14出生分析，不得嫁接旧版本。');
 const input=prior(profile,bazi),base=calculateV13(input.profile,input.bazi)!;
 const directionAnalysis=calculateRenDirectionAnalysis(base);
 return {...base,version:REN_DIRECTION_COMMENTARY_VERSION,profileId:REN_DIRECTION_COMMENTARY_VERSION,input:{...base.input,baziVersion:bazi.version},directionAnalysis,sourceRules:[...base.sourceRules,...directionAnalysis.sourceReferences]};
}
export function validRenCommentaryAnalysis(value:unknown,profile:BirthProfile,bazi:BaziAnalysis):value is RenCommentaryAnalysis|undefined {
 try {
  if(value!==undefined)canonicalPlainJson(value);
  if(normalizeRenMethod(profile.renMethod)!==REN_DIRECTION_METHOD)return validV13(value,profile,bazi);
  if(bazi.version!==BAZI_DIRECTION_VERSION)return false;
  const input=prior(profile,bazi),base=calculateV13(input.profile,input.bazi);
  if(!validV13(base,input.profile,input.bazi))return false;
  return canonicalPlainJson(value)===canonicalPlainJson(calculateRenCommentary(profile,bazi));
 }catch{return false;}
}
