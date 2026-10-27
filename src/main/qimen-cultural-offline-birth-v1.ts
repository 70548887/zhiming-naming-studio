import {isDeepStrictEqual} from 'node:util';
import {analyzeProfile as analyzeFrozenProfile,QIMEN_RULE_VERSION} from '../domain/engine-v13';
import {ownCulturalJson} from '../domain/qimen-cultural-comparison-canonical';
import {parseSnapshotJsonStrict} from './snapshot-json-spans';
import {readCulturalStoredProfile} from './qimen-cultural-provider-profile-v1';
import type {CulturalProviderJsonMaterial,CulturalProviderMaterial} from '../shared/qimen-cultural-provider-v1';
import type {BirthProfile,NamingSession,QimenChart} from '../shared/types';

const REGISTERED_PROVIDER_VERSION='qimen-cultural-provider/1.0.0';
const REGISTERED_QIMEN_VERSION='zhuanpan-chaibu-futou-kun2/1.4.0';
/** engine-v13 constructs the complete Bazi body before selecting only its
 * version by Ren method. engine-v14 and engine's 1.4/1.5 wrappers likewise
 * replace only that version; their separate Ren commentary is outside scope.
 * Keep every accepted pair explicit: a saved version cannot select a calculator.
 */
const BAZI_VERSION_BY_REN_METHOD:Readonly<Record<string,string>>=Object.freeze({
 'none':'civil-midnight-fuyi-candidate/1.9.0;lunar-typescript/1.8.6',
 'ditian-ren-commentary-2600158/1.0.0':'civil-midnight-fuyi-candidate/1.10.0;lunar-typescript/1.8.6',
 'ditian-ren-commentary-2600158/1.1.0':'civil-midnight-fuyi-candidate/1.11.0;lunar-typescript/1.8.6',
 'ditian-ren-commentary-2600158/1.2.0':'civil-midnight-fuyi-candidate/1.12.0;lunar-typescript/1.8.6',
 'ditian-ren-commentary-2600158/1.3.0':'civil-midnight-fuyi-candidate/1.13.0;lunar-typescript/1.8.6',
 'ditian-ren-commentary-2600158/1.4.0':'civil-midnight-fuyi-candidate/1.14.0;lunar-typescript/1.8.6',
 'ditian-ren-commentary-2600158/1.5.0':'civil-midnight-fuyi-candidate/1.15.0;lunar-typescript/1.8.6',
});
const REGISTERED_BAZI_VERSIONS=new Set(Object.values(BAZI_VERSION_BY_REN_METHOD));
class BirthVerificationFailure extends Error {}
const integrity=():never=>{throw new BirthVerificationFailure('OFFLINE_INTEGRITY: fixed birth material verification failed.');};
const unsupported=():never=>{throw new BirthVerificationFailure('OFFLINE_UNSUPPORTED: birth material version is not registered.');};
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);

/** Birth-only recertification of already captured material. No Store, source
 * archive execution, current analyzer, name scoring or Ren commentary check.
 * Original JSON strings remain intact; comparisons operate on owned parses.
 * Profile mode certifies only the captured Qimen and birth clock, never a
 * nonexistent saved full Bazi. Saved mode also checks the actual full Bazi.
 */
export function verifyCulturalOfflineBirthV1(material:CulturalProviderMaterial):{profile:BirthProfile;qimen:QimenChart;timeBasis:unknown;session:NamingSession|null}{
 try{
  const owned=ownCulturalJson<CulturalProviderMaterial>(material);
  if(!record(owned)||owned.schema!=='qimen-cultural-provider-material/1.0.0'||owned.storage!=='memory-only'||!Array.isArray(owned.jsons)||typeof owned.ownerProfileId!=='string'||!owned.ownerProfileId.trim()||owned.sourceSessionId!==null&&(typeof owned.sourceSessionId!=='string'||!owned.sourceSessionId.trim()))integrity();
  if(owned.providerVersion!==REGISTERED_PROVIDER_VERSION||QIMEN_RULE_VERSION!==REGISTERED_QIMEN_VERSION)unsupported();
  const rows=new Map<string,CulturalProviderJsonMaterial>();
  for(const row of owned.jsons){
   if(!record(row)||typeof row.id!=='string'||rows.has(row.id))integrity();
   rows.set(row.id,row);
  }
  const read=(id:string,schemaId?:string):unknown=>{
   const row=rows.get(id);
   if(!row||schemaId!==undefined&&row.schemaId!==schemaId||row.codecVersion!=='exact-utf8-json/1'||typeof row.exactUtf8Json!=='string')integrity();
   return ownCulturalJson(parseSnapshotJsonStrict(row!.exactUtf8Json));
  };
  const profile=readCulturalStoredProfile(read('original-profile','birth-profile/stored'),owned.ownerProfileId);
  const qimenValue=read('original-qimen');
  if(!record(qimenValue)||typeof qimenValue.version!=='string')return integrity();
  if(qimenValue.version!==REGISTERED_QIMEN_VERSION)unsupported();
  if(rows.get('original-qimen')!.schemaId!==REGISTERED_QIMEN_VERSION)integrity();
  const qimen=qimenValue as unknown as QimenChart;
  const timeBasis=read('original-time-basis','birth-time-basis/stored');
  const fixed=analyzeFrozenProfile({...profile,renMethod:'none'});
  const fallback={timezone:profile.timezone,timeUnknown:profile.timeUnknown};
  if(!isDeepStrictEqual(qimen,fixed.qimen)||!isDeepStrictEqual(timeBasis,fixed.bazi.timeBasis??fallback))integrity();
  if(profile.timeUnknown&&(qimen.available!==false||!Array.isArray(qimen.palaces)||qimen.palaces.length!==0))integrity();
  let session:NamingSession|null=null;
  if(owned.sourceSessionId===null){
   if(rows.has('original-session')||!isDeepStrictEqual(read('original-source-snapshot','cultural-provider-sources/1'),{state:'profile-mode',sourceSnapshot:null}))integrity();
  }else{
   const saved=read('original-session','naming-session/stored');
   if(!record(saved)||saved.id!==owned.sourceSessionId||saved.profileId!==owned.ownerProfileId||!isDeepStrictEqual(saved.profile,profile)||!record(saved.analysis)||!record(saved.analysis.bazi)||!record(saved.analysis.qimen))integrity();
   session=saved as unknown as NamingSession;
   if(typeof session.analysis.bazi.version!=='string')integrity();
   if(!REGISTERED_BAZI_VERSIONS.has(session.analysis.bazi.version))unsupported();
   const version=BAZI_VERSION_BY_REN_METHOD[profile.renMethod??'none'];
   if(!version)unsupported();
   if(session.analysis.bazi.version!==version||!isDeepStrictEqual(session.analysis.bazi,{...fixed.bazi,version})||!isDeepStrictEqual(session.analysis.qimen,qimen)||!isDeepStrictEqual(timeBasis,session.analysis.bazi.timeBasis??fallback))integrity();
   const snapshot=session.sourceSnapshot??{state:'not-recorded',sourceSnapshot:null};
   if(!isDeepStrictEqual(read('original-source-snapshot','session-source-snapshot/'+String(session.sourceSnapshot?.version??'legacy')),snapshot))integrity();
  }
  return {profile,qimen,timeBasis,session};
 }catch(error){
  if(error instanceof BirthVerificationFailure)throw error;
  return integrity();
 }
}
