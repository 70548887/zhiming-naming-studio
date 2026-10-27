import type {YueNameReading} from './types';

export type YueHomophoneMode='strict'|'ignore-tone';
export type YueHomophoneVersion='yue-homophone-review/1.0.0'|'yue-homophone-review/1.1.0';
export function validYueHomophoneRuleVersion(value:unknown):value is YueHomophoneVersion {
  return value==='yue-homophone-review/1.0.0'||value==='yue-homophone-review/1.1.0';
}
export type YueHomophoneScope='whole-full-name'|'whole-given-name'|'cross-surname-given';
export interface YueHomophoneSourceReference {
  id:string;version:string;license:string;file:string;line:number;locator:string;word:string;quote:string;url:string;
  recordSha256?:string;rowSha256?:string;
}
export interface YueHomophoneGloss {senseIndex:number;quotes:string[];tags:string[];rawTags?:string[];}
export interface YueHomophoneRule {
  id:string;term:string;tokens:string[];category:string;register:string[];glosses:YueHomophoneGloss[];
  scopes:YueHomophoneScope[];sourceRefs:YueHomophoneSourceReference[];notice:string;
}
export interface YueHomophoneData {
  version:YueHomophoneVersion;sourceIds:string[];sourceReferences:YueHomophoneSourceReference[];
  rules:YueHomophoneRule[];limitations:string[];
}
export interface YueHomophoneMatch {
  ruleId:string;term:string;category:string;register:string[];glosses:YueHomophoneGloss[];sourceRefs:YueHomophoneSourceReference[];
  span:{start:number;endExclusive:number;text:string;scope:YueHomophoneScope};
  actualTokens:string[];ruleTokens:string[];comparison:'exact'|'tone-only';differentTonePositions:number[];notice:string;
}
export interface YueHomophoneReview {
  version:YueHomophoneVersion;mode:YueHomophoneMode;status:'assessed'|'not-assessed';fullName:string;
  selectedTokens:string[];matches:YueHomophoneMatch[];sourceIds:string[];sourceReferences:YueHomophoneSourceReference[];
  limitations:string[];missing:string[];
}
export type YueHomophoneCandidateAddon={yueReading?:YueNameReading;yueHomophones?:YueHomophoneReview};
