import type {BirthProfile,CharacterEntry,NamingPreferences,NamingSession,SourceRecord,YueNameReading} from './types';
import type {NamePhoneticReview,SelectedNamePhonetics} from '../../data/name-phonetic/name-phonetic-types';

/** Independent preferences: absence disables the feature without backfilling historical records. */
export interface NamePhoneticPreferences {
  cmn?:{version:'cmn-homophone-review/1.0.0';mode:'strict'|'ignore-tone'};
  yue?:{version:'yue-homophone-review/1.2.0';mode:'strict'|'ignore-tone'};
}
export type PhoneticEnabledPreferences=NamingPreferences&{namePhonetics?:NamePhoneticPreferences};
export interface NamePhoneticReviewsSnapshot {
  version:'name-phonetic-reviews/1.0.0';
  recordState:'recorded';
  readingPolicy:'saved-default-and-confirmed-yue/1.0.0';
  engine:{profileSha256:string;sourceLockSha256:string;actualProfileObjectSha256:string};
  selectedReadings:{cmn?:SelectedNamePhonetics;yue?:SelectedNamePhonetics};
  reviews:{cmn?:NamePhoneticReview;yue?:NamePhoneticReview};
}
export interface PhoneticCandidate {
  givenName:string;characters:CharacterEntry[];yueReading?:YueNameReading;
  namePhoneticReviews?:NamePhoneticReviewsSnapshot;
}
export type PhoneticBirthProfile=Pick<BirthProfile,'surname'|'surnamePinyin'>;
export type PhoneticSession=Omit<Pick<NamingSession,'dataVersion'|'sourceSnapshot'|'profile'|'preferences'|'candidates'>,'preferences'|'candidates'>&{
  preferences:PhoneticEnabledPreferences;candidates:PhoneticCandidate[];
};
export interface NamePhoneticAdapter {
  readonly sources:readonly SourceRecord[];
  readonly gate:{profileSha256:string;sourceLockSha256:string;actualProfileObjectSha256:string;engineProfileMatched:true};
  calculate(profile:PhoneticBirthProfile,preferences:PhoneticEnabledPreferences,candidate:PhoneticCandidate):NamePhoneticReviewsSnapshot|undefined;
  verifySession(session:PhoneticSession):void;
  /** Both sessions are revalidated; preference/source identity and Mandarin results stay immutable. */
  verifyTransition(previous:PhoneticSession,next:PhoneticSession):void;
}
