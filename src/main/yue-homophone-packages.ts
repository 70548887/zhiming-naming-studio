import type {NamingSession,SourceRecord} from '../shared/types';
import type {YueHomophoneData,YueHomophoneVersion} from '../shared/yue-homophone-types';
import {validYueHomophoneRuleVersion} from '../shared/yue-homophone-types';
import {resolveSessionYueHomophoneVersion} from '../domain/yue-homophone-router';
import {loadYueHomophoneData,verifyYueHomophoneProvenance} from './yue-homophone-data';
import {loadYueHomophoneExpandedData,verifyYueHomophoneExpandedProvenance} from './yue-homophone-expanded-data';

export interface YueHomophonePackage {data:YueHomophoneData;sources:SourceRecord[];}
export interface YueHomophonePackages {byVersion:Record<YueHomophoneVersion,YueHomophonePackage>;sources:SourceRecord[];}
/** Keep both published packages; a source catalogue is never an implicit historical version choice. */
export function loadYueHomophonePackages(directory:string):YueHomophonePackages{
  const legacy=loadYueHomophoneData(directory),expanded=loadYueHomophoneExpandedData(directory);
  return{byVersion:{'yue-homophone-review/1.0.0':legacy,'yue-homophone-review/1.1.0':expanded},sources:[...legacy.sources,...expanded.sources]};
}
export function yueHomophonePackageForVersion(packages:YueHomophonePackages,version:YueHomophoneVersion):YueHomophonePackage{
  if(!validYueHomophoneRuleVersion(version))throw new Error('粤语词汇规则版本不受支持。');
  const selected=packages.byVersion[version];
  if(!selected||selected.data.version!==version)throw new Error('粤语词汇版本资料缺失；不得改用当前词表。');
  return selected;
}
export function verifySessionYueHomophoneProvenance(session:NamingSession,packages:YueHomophonePackages):void{
  const version=resolveSessionYueHomophoneVersion(session);
  if(version===null)return;
  const selected=yueHomophonePackageForVersion(packages,version);
  if(version==='yue-homophone-review/1.0.0')verifyYueHomophoneProvenance(session,selected.sources);
  else verifyYueHomophoneExpandedProvenance(session,selected.sources);
}
