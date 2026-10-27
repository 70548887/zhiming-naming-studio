import type {BirthProfile,BirthTimeAnalysis} from './types';
import type {ChartResult140,Element140,MethodPolicy140,MethodResult140} from './bazi-mainchain-method-types';

export const BAZI_MAINCHAIN_PREVIEW_VERSION='bazi-mainchain-preview/1.0.2' as const;
export type BaziMainchainRecordedBirth=Pick<BirthProfile,'calendar'|'birthDate'|'birthTime'|'timeUnknown'|'leapMonth'|'timezone'|'birthPlace'|'timeBasis'|'birthLongitude'>;
export interface BaziMainchainPreviewOptions extends MethodPolicy140 {}
export interface BaziMainchainPendingItem {
 code:'year-undetermined'|'month-undetermined'|'day-undetermined'|'hour-unknown'|'calendar-review'|'conditional-use'|'scope-not-implemented'|'invalid-input';
 explanation:string;
}
export interface BaziMainchainSource {
 id:string;role:'calendar-facts'|'classical-principle'|'project-assumption'|'initial-reference';
 scope:string;license?:string;url?:string;sha256?:string;
}
export interface BaziMainchainQualitativeCase {
 caseId:string;coverage:ChartResult140['coverage'];strength:ChartResult140['strength'];
 branch:ChartResult140['branch'];branchLabel:string;summary:string[];
 primary:Element140[];secondary:Element140[];avoid:Element140[];
 conditionalAlternatives:ChartResult140['alternativeUses'];
 seasonal:{elements:Element140[];status:ChartResult140['seasonal']['status'];reasons:string[]};
}
export interface BaziMainchainPreview {
 schema:typeof BAZI_MAINCHAIN_PREVIEW_VERSION;
 status:'project-opinion'|'conditional-opinion'|'provisional-missing-hour'|'pending-calendar'|'invalid-input';
 profileId:string;
 recordedBirth:BaziMainchainRecordedBirth;
 method:{id:string;status:'independent-project-proposal';entryPolicy:'month-branch-only'|'month-stem-proposal';defaultProductIntegration:false};
 calendar:{engineVersion:string|null;solarDate:string|null;lunarDate:string|null;
  basis:'civil'|'apparent-solar';timezone:string;calculationDateTime:string|null;
  dayStatus:BirthTimeAnalysis['dayStatus']|null;dayDateCandidates:string[];
  pillars:{position:'year'|'month'|'day'|'hour';label:string;gan:string|null;zhi:string|null}[];
  warnings:string[]};
 headline:string[];
 opinion:BaziMainchainQualitativeCase|null;
 entryComparison:{originalMonthBranch:BaziMainchainQualitativeCase;selectedProposal:BaziMainchainQualitativeCase;changed:boolean}|null;
 pending:BaziMainchainPendingItem[];
 conflicts:{kind:'seasonal-main'|'entry-policy';explanation:string}[];
 assumptions:string[];sources:BaziMainchainSource[];
 /** Numeric weights and time corrections are expandable detail, not a score. */
 details:{timeBasis:BirthTimeAnalysis|null;method:MethodResult140|null;originalMonthBranch:MethodResult140|null;calendarError:string|null;calendarEngineWarnings:string[]};
}
export interface BaziMainchainAlternativePreview {
 schema:'bazi-mainchain-alternative-preview/1.0.0';
 scope:'user-declared-alternative-records';
 status:'declared-record-opinions'|'pending-declared-records';
 records:BaziMainchainPreview[];
 consensus:MethodResult140['consensus']|null;
 pendingRecordIds:string[];
 limitations:string[];
}

/** Only this explicit project switch may cross the service boundary. */
export function readBaziMainchainPreviewOptions(value:unknown):BaziMainchainPreviewOptions {
 if(value===undefined)return {};
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error('主链预览选项须为普通对象。');
 const keys=Reflect.ownKeys(value);
 if(keys.some(key=>key!=='fromOutputMonthStem'))throw new Error('主链预览只接受 fromOutputMonthStem 布尔选项。');
 const field=Object.getOwnPropertyDescriptor(value,'fromOutputMonthStem');
 if(!field)return {};
 if(!Object.hasOwn(field,'value')||!field.enumerable||typeof field.value!=='boolean')throw new Error('fromOutputMonthStem 必须为显式布尔值，不接受访问器或隐藏字段。');
 return {fromOutputMonthStem:field.value};
}
