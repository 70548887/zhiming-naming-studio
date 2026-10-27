import type {RootFeedbackApplicationGate} from './bazi-root-feedback-application';
export type {RootFeedbackApplicationCertificate,RootFeedbackApplicationGate} from './bazi-root-feedback-application';
import type {Analysis,BirthProfile,BirthTimeAnalysis,Element} from './types';
import type {RootFeedbackPreviewDTO} from './bazi-root-feedback';
import type {ChartCase140,UseItem140} from './bazi-mainchain-method-types';
export const ROOT_FEEDBACK_FACADE_VERSION='bazi-root-feedback-facade/1.0.0' as const;
export interface RootFeedbackFacadeOptions {fromOutputMonthStem?:boolean;}
export interface RootFeedbackCalendarBranch {
 id:string;kind:'recorded-instant'|'unknown-hour-interval';hypothetical:boolean;
 actualInterval:{startUtc:string;endUtc:string};
 witness:{actualUtc:string;calculationClock:string;purpose:'calendar-partition-witness-only'}|null;
 pillars:ChartCase140['pillars'];root:RootFeedbackPreviewDTO;
}
export interface RootFeedbackFacadeDTO {
 schema:typeof ROOT_FEEDBACK_FACADE_VERSION;methodId:'project-bazi-mainchain-145/1.3.1';entryPolicy:'month-branch-only'|'month-stem-proposal';
 profileId:string;recordedBirth:Pick<BirthProfile,'calendar'|'birthDate'|'birthTime'|'timeUnknown'|'leapMonth'|'timezone'|'timeBasis'|'birthLongitude'>;
 status:'unique-consistent-regime'|'multiple-consistent-regimes'|'no-consistent-regime'|'pending-regime-resolution';
 baseAnalysis:Analysis;
 calendar:{engineVersion:string;timeBasis:BirthTimeAnalysis;knownPillars:Analysis['bazi']['pillars'];partitionPolicy:string;partitionComplete:boolean;warnings:string[]};
 branches:RootFeedbackCalendarBranch[];
 applicationGate:RootFeedbackApplicationGate;
 commonOpinion:{status:'all-calendar-branches'|'known-opinions-only'|'unavailable';primary:Element[];favorable:Element[]};
 conflicts:{element:Element;favorableIn:string[];avoidIn:string[]}[];
 pending:string[];limitations:string[];
}
export function readRootFeedbackFacadeOptions(value:unknown):RootFeedbackFacadeOptions {
 if(value===undefined)return{};
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error('根反馈方法选项须为普通对象。');
 const keys=Reflect.ownKeys(value);if(keys.some(key=>key!=='fromOutputMonthStem'))throw new Error('根反馈只接受 fromOutputMonthStem 布尔选项。');
 const field=Object.getOwnPropertyDescriptor(value,'fromOutputMonthStem');if(!field)return{};
 if(!Object.hasOwn(field,'value')||!field.enumerable||typeof field.value!=='boolean')throw new Error('根反馈入口须为显式布尔值，不接受隐藏字段或访问器。');return{fromOutputMonthStem:field.value};
}
