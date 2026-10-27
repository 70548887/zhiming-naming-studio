import {loadNamingEditorialV4Data,verifyNamingEditorialV4Provenance} from './naming-editorial-v4-data';
import {loadNamingEditorialV5Data,verifyNamingEditorialV5Provenance} from './naming-editorial-v5-data';
import {loadNamingEditorialV6Data,verifyNamingEditorialV6Provenance} from './naming-editorial-v6-data';
import {loadNamingEditorialV7Data,verifyNamingEditorialV7Provenance,loadNamingEditorialV71Data,verifyNamingEditorialV71Provenance} from './naming-editorial-v7-data';
import {NAMING_RULE_V4_VERSION,NAMING_RULE_V5_VERSION,NAMING_RULE_V6_VERSION,NAMING_RULE_V7_VERSION,NAMING_RULE_V71_VERSION,resolveSessionNamingRulesVersion,type NamingRuleVersion} from '../shared/naming-rules';
import type {NamingSession,SourceRecord} from '../shared/types';

export interface NamingEditorialPackage {version:NamingRuleVersion;sources:SourceRecord[];}
export interface NamingEditorialPackages {packages:NamingEditorialPackage[];sources:SourceRecord[];}
export function loadNamingEditorialPackages(directory:string):NamingEditorialPackages{
 const v4=loadNamingEditorialV4Data(directory),v5=loadNamingEditorialV5Data(directory),v6=loadNamingEditorialV6Data(directory),v7=loadNamingEditorialV7Data(directory),v71=loadNamingEditorialV71Data(directory);
 const packages:NamingEditorialPackage[]=[{version:NAMING_RULE_V4_VERSION,sources:v4.sources},{version:NAMING_RULE_V5_VERSION,sources:v5.sources},{version:NAMING_RULE_V6_VERSION,sources:v6.sources},{version:NAMING_RULE_V7_VERSION,sources:v7.sources},{version:NAMING_RULE_V71_VERSION,sources:v71.sources}];
 return {packages,sources:packages.flatMap(pack=>pack.sources)};
}
export function namingEditorialPackageForVersion(packages:NamingEditorialPackages,version:NamingRuleVersion):NamingEditorialPackage{
 const selected=packages.packages.find(pack=>pack.version===version);if(!selected)throw new Error('缺少明确版本的命名规则资料，不能改用当前版本。');return selected;
}
export function verifySessionNamingEditorialProvenance(session:NamingSession,packages:NamingEditorialPackages):void{
 const version=resolveSessionNamingRulesVersion(session);if(version===null)return;
 const selected=namingEditorialPackageForVersion(packages,version);
 if(version===NAMING_RULE_V4_VERSION)verifyNamingEditorialV4Provenance(session,selected.sources);
 else if(version===NAMING_RULE_V5_VERSION)verifyNamingEditorialV5Provenance(session,selected.sources);
 else if(version===NAMING_RULE_V6_VERSION)verifyNamingEditorialV6Provenance(session,selected.sources);
 else if(version===NAMING_RULE_V7_VERSION)verifyNamingEditorialV7Provenance(session,selected.sources);
 else if(version===NAMING_RULE_V71_VERSION)verifyNamingEditorialV71Provenance(session,selected.sources);
}
