/** New standalone profiles. Historical yue 1.0/1.1 remain routed to their old engines. */
export type PhoneticLanguage='cmn'|'yue';
export type PhoneticMode='strict'|'ignore-tone';
export type PhoneticProfileVersion='cmn-homophone-review/1.0.0'|'yue-homophone-review/1.2.0';
export interface SelectedPhoneticUnit {
  text:string;
  /** One numeric-tone syllable per Han character: Pinyin 1–5 or Jyutping 1–6. */
  tokens:string[];
  confirmed:true;
  /** cmn: current-default only; yue: dictionary/user. Never enumerate alternates. */
  origin:'current-default'|'dictionary'|'user';
  /** Caller provenance; never promoted to lexicon evidence or validated by this engine. */
  referenceIds:string[];
}
export interface SelectedNamePhonetics {
  version:'selected-name-phonetics/1.0.0';
  language:PhoneticLanguage;
  surname:{text:string;selection:SelectedPhoneticUnit|null};
  given:{text:string;selection:SelectedPhoneticUnit|null}[];
}
export type PhoneticScope='whole-full-name'|'whole-given-name'|'cross-surname-given'|'given-subspan';
export interface PhoneticReviewInput {
  surname:string;given:string;mode:PhoneticMode;reading:SelectedNamePhonetics;
}
export interface PhoneticSourceReference {
  id:string;file:string;line:number;sha256:string;word:string;
  license:'CC-BY-4.0'|'CC-BY-SA-4.0';url:string;
  soundIndex?:number;senseIndices?:number[];rawPronunciation?:string;
  soundTags?:string[];soundRawTags?:string[];
  role:'pronunciation-and-meaning'|'exact-word-pronunciation'|'original-word-presence-only';
}
export interface PhoneticSense {
  recordLine:number;senseIndex:number;glosses:string[];tags:string[];rawTags:string[];
  /** Raw lexical labels are retained; absent source labels display 未标. */
  registerStatus:'source-marked'|'unmarked';registerDisplay:string[];
}
export interface PhoneticRule {
  id:string;language:PhoneticLanguage;term:string;tokens:string[];category:string;categories:string[];
  senses:PhoneticSense[];sourceRefs:PhoneticSourceReference[];notice:string;
}
export interface NamePhoneticReview {
  version:PhoneticProfileVersion;language:PhoneticLanguage;mode:PhoneticMode;
  status:'assessed'|'not-assessed';fullName:string;selectedTokens:string[];
  matches:{rule:PhoneticRule;span:{start:number;endExclusive:number;text:string;scope:PhoneticScope};
    actualTokens:string[];comparison:'exact'|'tone-only';differentTonePositions:number[]}[];
  missing:string[];coverageNotice:string;limitations:string[];
  sourceIds:string[];profileSha256:string;sourceLockSha256:string;
}
