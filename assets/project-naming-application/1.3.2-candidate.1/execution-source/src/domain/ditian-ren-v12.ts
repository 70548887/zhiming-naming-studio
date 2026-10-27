import {calculateRenCommentary as calculateV11,validRenCommentaryAnalysis as validV11} from './ditian-ren-v11';
import {calculateRenActionAnalysis} from './ren-actions';
import {normalizeRenMethod,REN_METHOD,REN_ACTION_METHOD} from '../shared/ren-method';
import {canonicalPlainJson} from '../shared/plain-json';
import type {BaziAnalysis,BirthProfile,RenCommentaryAnalysis} from '../shared/types';
export * from './ditian-ren-v11';
// New callers use order-independent evidence closure; historical v1/v11 keep their frozen local solver.
export {resolveRenDependencies} from './ren-dependencies';
export type {RenDependencyInput,RenDependencyState,RenDependencyMode,RenDependencyResult} from './ren-dependencies';
export const REN_ACTION_COMMENTARY_VERSION='ditian-ren-commentary-2600158/1.2.0' as const;
const BAZI_ACTION_VERSION='civil-midnight-fuyi-candidate/1.12.0;lunar-typescript/1.8.6';
const BAZI_V11_VERSION='civil-midnight-fuyi-candidate/1.11.0;lunar-typescript/1.8.6';
const prior=(profile:BirthProfile,bazi:BaziAnalysis)=>({profile:{...profile,renMethod:REN_METHOD},bazi:{...bazi,version:BAZI_V11_VERSION}});
/** Historical methods keep frozen results;1.2 appends a separate conditional action layer. */
export function calculateRenCommentary(profile:BirthProfile,bazi:BaziAnalysis):RenCommentaryAnalysis|undefined{
 const method=normalizeRenMethod(profile.renMethod);
 if(method!==REN_ACTION_METHOD)return calculateV11(profile,bazi);
 if(bazi.version!==BAZI_ACTION_VERSION)throw new Error('任注1.2条件作用需要对应1.12出生分析，不得嫁接旧版本。');
 const input=prior(profile,bazi),base=calculateV11(input.profile,input.bazi)!;
 const actionAnalysis=calculateRenActionAnalysis(base);
 return {...base,version:REN_ACTION_COMMENTARY_VERSION,profileId:REN_ACTION_COMMENTARY_VERSION,input:{...base.input,baziVersion:bazi.version},actionAnalysis,sourceRules:[...base.sourceRules,...actionAnalysis.sourceReferences]};
}
export function validRenCommentaryAnalysis(value:unknown,profile:BirthProfile,bazi:BaziAnalysis):value is RenCommentaryAnalysis|undefined{
 try{
  if(value!==undefined)canonicalPlainJson(value);
  if(normalizeRenMethod(profile.renMethod)!==REN_ACTION_METHOD)return validV11(value,profile,bazi);
  if(bazi.version!==BAZI_ACTION_VERSION)return false;
  const input=prior(profile,bazi),base=calculateV11(input.profile,input.bazi);
  if(!validV11(base,input.profile,input.bazi))return false;
  return canonicalPlainJson(value)===canonicalPlainJson(calculateRenCommentary(profile,bazi));
 }catch{return false;}
}
