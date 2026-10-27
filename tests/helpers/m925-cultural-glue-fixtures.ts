import type {NamingSession} from '../../src/shared/types';
import {catalogSession} from '../fixtures/catalog-session';

/** App glue contract fixtures only. No cultural snapshot, source admission,
 * catalog result or live Store/Service is fabricated by this fixture. */
export function makeM925GlueFixtures(){
 const make=(id:string,profileId:string,label:string,token:string):NamingSession=>{
  const value=catalogSession(id,'2026-10-17T16:00:00Z',profileId);
  value.profile={...value.profile,customerName:label,fatherName:'',motherName:'',namingPreferences:{...value.preferences}};
  value.reviewRevision=1;value.reviewToken=token;
  return value;
 };
 const current=make('m925-current-a','m925-owner-a','M925甲宝宝','11111111-1111-4111-8111-111111111111');
 const source=make('m925-origin-a','m925-owner-a','M925甲宝宝原方案','22222222-2222-4222-8222-222222222222');
 source.profile.birthDate='2026-10-16';
 const other=make('m925-origin-b','m925-owner-b','M925乙宝宝','33333333-3333-4333-8333-333333333333');
 return {sessions:[current,source,other],profiles:[current.profile,other.profile],references:{[current.profileId]:{comparisonId:'qc_'+'a'.repeat(64),ownerProfileId:current.profileId,sourceSessionId:source.id},[other.profileId]:{comparisonId:'qc_'+'b'.repeat(64),ownerProfileId:other.profileId,sourceSessionId:other.id}}};
}
