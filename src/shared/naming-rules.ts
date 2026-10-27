import type {NamingSession} from './types';

export const NAMING_RULE_V4_VERSION='naming-editorial-4.0.0' as const;
export const NAMING_RULE_V5_VERSION='naming-editorial-5.0.0' as const;
export const NAMING_RULE_V6_VERSION='naming-editorial-6.0.0' as const;
export const NAMING_RULE_V7_VERSION='naming-editorial-7.0.0' as const;
export const NAMING_RULE_V71_VERSION='naming-editorial-7.1.0' as const;
export const NAMING_RULE_V4_SOURCE_ID='naming-editorial-readings-v4-fixed' as const;
export const NAMING_RULE_V5_SOURCE_ID='naming-editorial-names-v5-fixed' as const;
export const NAMING_RULE_V6_SOURCE_ID='naming-editorial-dictionary-v6-fixed' as const;
export const NAMING_RULE_V7_SOURCE_ID='naming-editorial-meanings-v7-fixed' as const;
export const NAMING_RULE_V71_SOURCE_ID='naming-character-meanings-v7.1-fixed' as const;
export const CURRENT_NAMING_RULE_VERSION=NAMING_RULE_V71_VERSION;
export const NAMING_RULE_SOURCE_ID=NAMING_RULE_V71_SOURCE_ID;
export const ALL_NAMING_RULE_SOURCE_IDS=[NAMING_RULE_V4_SOURCE_ID,NAMING_RULE_V5_SOURCE_ID,NAMING_RULE_V6_SOURCE_ID,NAMING_RULE_V7_SOURCE_ID,NAMING_RULE_V71_SOURCE_ID] as const;
export type NamingRuleVersion=typeof NAMING_RULE_V4_VERSION|typeof NAMING_RULE_V5_VERSION|typeof NAMING_RULE_V6_VERSION|typeof NAMING_RULE_V7_VERSION|typeof NAMING_RULE_V71_VERSION;
export type NamingRulesSnapshot={dataVersion:string}&(
 {version:typeof NAMING_RULE_V4_VERSION;sourceId:typeof NAMING_RULE_V4_SOURCE_ID}|
 {version:typeof NAMING_RULE_V5_VERSION;sourceId:typeof NAMING_RULE_V5_SOURCE_ID}|
 {version:typeof NAMING_RULE_V6_VERSION;sourceId:typeof NAMING_RULE_V6_SOURCE_ID}|
 {version:typeof NAMING_RULE_V7_VERSION;sourceId:typeof NAMING_RULE_V7_SOURCE_ID}|
 {version:typeof NAMING_RULE_V71_VERSION;sourceId:typeof NAMING_RULE_V71_SOURCE_ID}
);
const plain=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
const own=(value:object,key:string)=>Object.prototype.hasOwnProperty.call(value,key);
function property(value:object,key:string):unknown{const descriptor=Object.getOwnPropertyDescriptor(value,key);if(descriptor&&!('value'in descriptor))throw new Error('命名规则版本字段不接受访问器。');return descriptor?.value;}

/** Absence means an untouched legacy record, never an inferred current or old algorithm version. */
export function resolveSessionNamingRulesVersion(session:Pick<NamingSession,'dataVersion'|'sourceSnapshot'|'namingRules'>):NamingRuleVersion|null{
 if(!plain(session))throw new Error('命名规则版本记录无效。');
 const present=own(session,'namingRules'),snapshot=property(session,'sourceSnapshot');
 const sources=plain(snapshot)?property(snapshot,'sources'):undefined;
 const dedicated=Array.isArray(sources)?sources.filter(source=>plain(source)&&(ALL_NAMING_RULE_SOURCE_IDS as readonly unknown[]).includes(property(source,'id'))):[];
 if(!present&&!dedicated.length)return null;
 const value=property(session,'namingRules');
 const version=plain(value)?property(value,'version'):undefined,expectedSource=version===NAMING_RULE_V4_VERSION?NAMING_RULE_V4_SOURCE_ID:version===NAMING_RULE_V5_VERSION?NAMING_RULE_V5_SOURCE_ID:version===NAMING_RULE_V6_VERSION?NAMING_RULE_V6_SOURCE_ID:version===NAMING_RULE_V7_VERSION?NAMING_RULE_V7_SOURCE_ID:version===NAMING_RULE_V71_VERSION?NAMING_RULE_V71_SOURCE_ID:undefined;
 if(!present||!plain(value)||Reflect.ownKeys(value).length!==3||Object.keys(value).length!==3||!Object.keys(value).every(key=>['version','dataVersion','sourceId'].includes(key))||!expectedSource||property(value,'sourceId')!==expectedSource||typeof property(value,'dataVersion')!=='string'||!property(value,'dataVersion')||property(value,'dataVersion')!==property(session,'dataVersion')||dedicated.length!==1||property(dedicated[0],'id')!==expectedSource)throw new Error('命名规则版本、生成字库或固定来源不一致；不能降级或补填历史。');
 return version as NamingRuleVersion;
}
export function validSessionNamingRules(session:Pick<NamingSession,'dataVersion'|'sourceSnapshot'|'namingRules'>):boolean{try{resolveSessionNamingRulesVersion(session);return true;}catch{return false;}}

/** Same original fixed7 knowledge pack; only the character explanation layer differs. */
export function isNamingV7BaseRuleVersion(value:unknown):value is typeof NAMING_RULE_V7_VERSION|typeof NAMING_RULE_V71_VERSION{return value===NAMING_RULE_V7_VERSION||value===NAMING_RULE_V71_VERSION;}
