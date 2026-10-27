import type {PhoneticLanguage,PhoneticProfileVersion,PhoneticReviewInput,NamePhoneticReview} from './name-phonetic-types';
export const NAME_PHONETIC_VERSIONS:Readonly<Record<PhoneticLanguage,PhoneticProfileVersion>>;
export function canonicalPlainJson(value:unknown):string;
/** Detached copy of the private frozen profile actually consumed by the evaluator. */
export function getImportedNamePhoneticProfile():unknown;
export function calculateNamePhoneticReview(input:PhoneticReviewInput,version?:PhoneticProfileVersion):NamePhoneticReview;
export function calculateCombinedNamePhoneticReviews(inputs:Partial<Record<PhoneticLanguage,PhoneticReviewInput>>):Partial<Record<PhoneticLanguage,NamePhoneticReview>>;
export function isCanonicalNamePhoneticReview(value:unknown,input:PhoneticReviewInput,version?:PhoneticProfileVersion):value is NamePhoneticReview;
export function normalizeSelectedPinyin(text:string,expectedSyllables:number):string[];
export function getNamePhoneticProfileInfo():{
 versions:Record<PhoneticLanguage,PhoneticProfileVersion>;
 languages:Record<PhoneticLanguage,{terms:number;rules:number}>;
 limitations:string[];
};
