import {generateLocalForRuleVersionWithContext} from './naming';
import type {TrustedNamingContext} from './naming-review-v7.mjs';
import type {Analysis,BirthProfile,CharacterEntry,Citation,Element,NamingPreferences} from '../shared/types';
/** Computational seam only. The main-process owner authenticates the live
 * candidate.2 capability before entering here. This creates no authority and
 * never changes caller preferences or legacy Bazi favorable elements. */
export function generateCandidate2DomainV1(profile:BirthProfile,preferences:NamingPreferences,base:Analysis,characters:CharacterEntry[],citations:Citation[],context:TrustedNamingContext,applied:Element[],seed:number,excluded:string[]){
 if(preferences.preferredElements.length||Object.hasOwn(preferences,'namingElementMethod'))throw Error('CANDIDATE2_NAMING_CONFLICT: manual or old project selection');
 const computationPreferences: NamingPreferences={...preferences,preferredElements:[...applied]};
 const result=generateLocalForRuleVersionWithContext('naming-editorial-7.1.0',context,profile,computationPreferences,base,characters,citations,seed,excluded);
 return{...result,computationPreferences};
}
