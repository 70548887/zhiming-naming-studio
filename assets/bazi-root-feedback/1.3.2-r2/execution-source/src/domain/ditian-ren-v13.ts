import {calculateRenCommentary as calculateV12,validRenCommentaryAnalysis as validV12} from './ditian-ren-v12';
import {calculateRenCapacityAnalysis} from './ren-capacities';
import {normalizeRenMethod,REN_ACTION_METHOD,REN_CAPACITY_METHOD} from '../shared/ren-method';
import {canonicalPlainJson} from '../shared/plain-json';
import type {BaziAnalysis,BirthProfile,RenCommentaryAnalysis} from '../shared/types';
export * from './ditian-ren-v12';
export const REN_CAPACITY_COMMENTARY_VERSION='ditian-ren-commentary-2600158/1.3.0' as const;
const BAZI_CAPACITY_VERSION='civil-midnight-fuyi-candidate/1.13.0;lunar-typescript/1.8.6';
const BAZI_ACTION_VERSION='civil-midnight-fuyi-candidate/1.12.0;lunar-typescript/1.8.6';
const prior=(profile:BirthProfile,bazi:BaziAnalysis)=>({profile:{...profile,renMethod:REN_ACTION_METHOD},bazi:{...bazi,version:BAZI_ACTION_VERSION}});
/** Frozen1.0/1.1/1.2 remain exact;1.3 appends a source-sufficient positive local capability layer. */
export function calculateRenCommentary(profile:BirthProfile,bazi:BaziAnalysis):RenCommentaryAnalysis|undefined{
 const method=normalizeRenMethod(profile.renMethod);
 if(method!==REN_CAPACITY_METHOD)return calculateV12(profile,bazi);
 if(bazi.version!==BAZI_CAPACITY_VERSION)throw new Error('任注1.3木局有限能力需要对应1.13出生分析，不得嫁接旧版本。');
 const input=prior(profile,bazi),base=calculateV12(input.profile,input.bazi)!;
 const capacityAnalysis=calculateRenCapacityAnalysis(base);
 return {...base,version:REN_CAPACITY_COMMENTARY_VERSION,profileId:REN_CAPACITY_COMMENTARY_VERSION,input:{...base.input,baziVersion:bazi.version},capacityAnalysis,sourceRules:[...base.sourceRules,...capacityAnalysis.sourceReferences]};
}
export function validRenCommentaryAnalysis(value:unknown,profile:BirthProfile,bazi:BaziAnalysis):value is RenCommentaryAnalysis|undefined{
 try{
  if(value!==undefined)canonicalPlainJson(value);
  if(normalizeRenMethod(profile.renMethod)!==REN_CAPACITY_METHOD)return validV12(value,profile,bazi);
  if(bazi.version!==BAZI_CAPACITY_VERSION)return false;
  const input=prior(profile,bazi),base=calculateV12(input.profile,input.bazi);
  if(!validV12(base,input.profile,input.bazi))return false;
  return canonicalPlainJson(value)===canonicalPlainJson(calculateRenCommentary(profile,bazi));
 }catch{return false;}
}
