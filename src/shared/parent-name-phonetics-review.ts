import type {SourceRecord,CharacterEntry,BirthProfile,NamingPreferences,NameCandidate,NamingSession} from './types';
import type {ParentNameReadings,ParentNamePhoneticsMode,ParentNamePhoneticResult} from './parent-name-phonetics';
import type {CmnReadingSourceIdentity} from './cmn-reading';
export const PARENT_NAME_REVIEW_VERSION='parent-name-phonetic-review/1.0.0' as const;
export interface ParentNamePhoneticSnapshot {
 version:typeof PARENT_NAME_REVIEW_VERSION;recordState:'recorded';sessionId:string;candidateId:string;
 capture:{mode:Exclude<ParentNamePhoneticsMode,'none'>;parentNames:{fatherName:string;motherName:string};readings:ParentNameReadings;child:{surname:string;surnamePinyin:string;givenName:string;characters:Array<Pick<CharacterEntry,'char'|'pinyin'|'tone'|'sourceId'>>}};
 result:ParentNamePhoneticResult;
 sourceSnapshot:{method:SourceRecord;dictionarySources:CmnReadingSourceIdentity[];confirmationPolicy:'family-confirmed-actual-reading'};
}
/** Temporary structural aliases for root's central optional-field integration. */
export type ParentPhoneticProfile=BirthProfile&{parentNameReadings?:ParentNameReadings};
export type ParentPhoneticPreferences=NamingPreferences&{parentNamePhonetics?:ParentNamePhoneticsMode};
export type ParentPhoneticCandidate=NameCandidate&{parentNamePhoneticReview?:ParentNamePhoneticSnapshot};
export type ParentPhoneticSession=NamingSession&{profile:ParentPhoneticProfile;preferences:ParentPhoneticPreferences;candidates:ParentPhoneticCandidate[]};
