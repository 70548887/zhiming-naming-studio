import type {NamingSession,YueNameReading} from '../shared/types';
import type {YueHomophoneData,YueHomophoneMode,YueHomophoneReview,YueHomophoneVersion} from '../shared/yue-homophone-types';
import {validYueHomophoneRuleVersion} from '../shared/yue-homophone-types';
import {canonicalPlainJson} from '../shared/plain-json';
import {validSessionSourceSnapshot} from '../shared/session-sources';
import {calculateYueHomophoneReview,isCanonicalYueHomophoneReview,YUE_HOMOPHONE_VERSION,YUE_HOMOPHONE_SOURCE_IDS} from './yue-homophones';
import {calculateYueHomophoneExpandedReview,isCanonicalYueHomophoneExpandedReview,YUE_HOMOPHONE_EXPANDED_VERSION,YUE_HOMOPHONE_EXPANDED_SOURCE_IDS} from './yue-homophones-expanded';

export const YUE_HOMOPHONE_CURRENT_VERSION=YUE_HOMOPHONE_EXPANDED_VERSION;
export const ALL_YUE_HOMOPHONE_SOURCE_IDS=[...YUE_HOMOPHONE_SOURCE_IDS,...YUE_HOMOPHONE_EXPANDED_SOURCE_IDS] as const;
export const YUE_HOMOPHONE_SOURCE_IDS_BY_VERSION:Record<YueHomophoneVersion,readonly string[]>={
  [YUE_HOMOPHONE_VERSION]:YUE_HOMOPHONE_SOURCE_IDS,
  [YUE_HOMOPHONE_EXPANDED_VERSION]:YUE_HOMOPHONE_EXPANDED_SOURCE_IDS,
};

export function yueHomophoneSourceIdsForVersion(version:YueHomophoneVersion):readonly string[] {
  if(!validYueHomophoneRuleVersion(version))throw new Error('粤语词汇规则版本不受支持。');
  return [...YUE_HOMOPHONE_SOURCE_IDS_BY_VERSION[version]];
}

export function calculateYueHomophoneReviewForVersion(version:YueHomophoneVersion,surname:string,given:string,reading:YueNameReading,mode:YueHomophoneMode,data:YueHomophoneData):YueHomophoneReview {
  if(!validYueHomophoneRuleVersion(version)||data.version!==version)throw new Error('粤语词汇规则版本与资料不一致。');
  return version===YUE_HOMOPHONE_VERSION?calculateYueHomophoneReview(surname,given,reading,mode,data):calculateYueHomophoneExpandedReview(surname,given,reading,mode,data);
}

export function isCanonicalYueHomophoneReviewForVersion(version:YueHomophoneVersion,value:unknown,surname:string,given:string,reading:YueNameReading,mode:YueHomophoneMode,data:YueHomophoneData):value is YueHomophoneReview {
  if(!validYueHomophoneRuleVersion(version)||data.version!==version)return false;
  return version===YUE_HOMOPHONE_VERSION?isCanonicalYueHomophoneReview(value,surname,given,reading,mode,data):isCanonicalYueHomophoneExpandedReview(value,surname,given,reading,mode,data);
}

/** Only saved facts may select a historical package. Main additionally authenticates the exact source records. */
export function resolveSessionYueHomophoneVersion(session:Pick<NamingSession,'preferences'|'candidates'|'sourceSnapshot'>):YueHomophoneVersion|null {
  const ownValue=(object:object,key:string):unknown=>{
    if(!object||typeof object!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(object)))throw new Error('已保存粤语词汇记录对象无效。');
    const descriptor=Object.getOwnPropertyDescriptor(object,key);
    if(!descriptor)return undefined;
    if(!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)throw new Error('已保存粤语词汇记录不得含访问器或隐藏字段。');
    return descriptor.value;
  };
  const preferences=ownValue(session,'preferences') as NamingSession['preferences'];
  const rawMode=ownValue(preferences,'yueHomophones'),mode=rawMode===undefined?'none':rawMode,hasVersion=Object.hasOwn(preferences,'yueHomophoneRuleVersion'),preferenceVersion=ownValue(preferences,'yueHomophoneRuleVersion');
  const snapshot=ownValue(session,'sourceSnapshot') as NamingSession['sourceSnapshot'];
  if(snapshot!==undefined)canonicalPlainJson(snapshot);
  const rawCandidates=ownValue(session,'candidates') as NamingSession['candidates'];
  if(!Array.isArray(rawCandidates)||Object.getPrototypeOf(rawCandidates)!==Array.prototype||Reflect.ownKeys(rawCandidates).length!==rawCandidates.length+1)throw new Error('已保存粤语词汇候选数组无效。');
  const reviews=Array.from({length:rawCandidates.length},(_,index)=>{
    const descriptor=Object.getOwnPropertyDescriptor(rawCandidates,String(index));
    if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)throw new Error('已保存粤语词汇候选不得含空位或访问器。');
    const value=ownValue(descriptor.value,'yueHomophones');
    if(value!==undefined)canonicalPlainJson(value);
    return {present:Object.hasOwn(descriptor.value,'yueHomophones'),value:value as YueHomophoneReview|undefined};
  });
  if(mode!=='none'&&mode!=='strict'&&mode!=='ignore-tone')throw new Error('已保存粤语词汇模式无效。');
  const sourceIds=(snapshot?.sources??[]).map(source=>source.id).filter(id=>(ALL_YUE_HOMOPHONE_SOURCE_IDS as readonly string[]).includes(id));
  if(mode==='none') {
    if(hasVersion||sourceIds.length||reviews.some(review=>review.present))throw new Error('关闭粤语词汇复核的方案仍附带版本、结果或专用来源。');
    return null;
  }
  if(ownValue(preferences,'yueReading')!==true||!reviews.length||!snapshot||!validSessionSourceSnapshot(snapshot))throw new Error('已保存粤语词汇复核缺少读音、候选或生成时来源。');
  if(hasVersion&&!validYueHomophoneRuleVersion(preferenceVersion))throw new Error('已保存粤语词汇规则偏好版本无效。');
  const versions=reviews.map(review=>review.value?.version);
  if(versions.some(version=>!validYueHomophoneRuleVersion(version))||new Set(versions).size!==1)throw new Error('已保存粤语词汇结果缺版、漏项或混用版本。');
  const version=versions[0] as YueHomophoneVersion;
  if(hasVersion?preferenceVersion!==version:version!==YUE_HOMOPHONE_VERSION)throw new Error('已保存粤语词汇偏好与结果版本不一致；扩展版必须显式保存版本。');
  const expected=YUE_HOMOPHONE_SOURCE_IDS_BY_VERSION[version];
  if(sourceIds.length!==expected.length||expected.some(id=>!sourceIds.includes(id)))throw new Error('已保存粤语词汇来源跨版或不完整。');
  for(const item of reviews) {
    const review=item.value!;
    if(review.mode!==mode||canonicalPlainJson(review.sourceIds)!==canonicalPlainJson([...expected])||review.sourceReferences.some(reference=>!expected.includes(reference.id))||review.matches.some(match=>match.sourceRefs.some(reference=>!expected.includes(reference.id))))throw new Error('已保存粤语词汇结果的模式或来源与方案不一致。');
  }
  return version;
}
