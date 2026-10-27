/** Current generation and explicit versioned replay are distinct entry points. */
export * from '../../../src/domain/naming-v6';
import * as v4 from '../../../src/domain/naming-v4';
import * as v5 from '../../../src/domain/naming-v5';
import * as v6 from '../../../src/domain/naming-v6';
import * as v7 from './naming-v7';
import naming7 from '../../../data/naming-editorial-v7.json';
import {assertPlainJson} from '../../../src/domain/naming-review-v7.mjs';
import type {TrustedNamingContext} from '../../../src/domain/naming-review-v7.mjs';
export type {TrustedNamingContext} from '../../../src/domain/naming-review-v7.mjs';
import type {Analysis,BirthProfile,CharacterEntry,Citation,NamingPreferences} from '../../../src/shared/types';
import {getNamingElementBasis,NamingElementBasisError,type ResolvedNamingBasis} from '../../../src/domain/naming-element-basis';
import {assertNamingElementApplicationTuple} from '../../../src/shared/naming-element-application';
export {getNamingElementBasis,NamingElementBasisError,namingElementBasisLabel,namingElementBasisPromptTag,type ResolvedNamingBasis} from '../../../src/domain/naming-element-basis';
import {NAMING_RULE_V4_VERSION,NAMING_RULE_V5_VERSION,NAMING_RULE_V6_VERSION,NAMING_RULE_V7_VERSION,NAMING_RULE_V71_VERSION,NAMING_RULE_V4_SOURCE_ID,NAMING_RULE_V5_SOURCE_ID,NAMING_RULE_V6_SOURCE_ID,NAMING_RULE_V7_SOURCE_ID,NAMING_RULE_V71_SOURCE_ID,CURRENT_NAMING_RULE_VERSION,type NamingRuleVersion} from '../../../src/shared/naming-rules';

type VersionedEvaluationArguments=[name:string,profile:BirthProfile,preferences:NamingPreferences,analysis:Analysis,characters:CharacterEntry[],citations:Citation[],origin?:'local'|'ai'];
export function evaluateNameForRuleVersion(version:NamingRuleVersion,...args:VersionedEvaluationArguments){
 if(args.length>7)throw new Error('版本求值不能使用外部缓存的字义或引文准入结果。');
 if(version===NAMING_RULE_V4_VERSION)return v4.evaluateName(...args);
 if(version===NAMING_RULE_V5_VERSION)return v5.evaluateName(...args);
 if(version===NAMING_RULE_V6_VERSION)return v6.evaluateName(...args);
 throw new Error('未记录或未知的命名规则版本不能按当前版本重算。');
}
export function generateLocalForRuleVersion(version:NamingRuleVersion,...args:Parameters<typeof v4.generateLocal>){
 if(version===NAMING_RULE_V4_VERSION)return v4.generateLocal(...args);
 if(version===NAMING_RULE_V5_VERSION)return v5.generateLocal(...args);
 if(version===NAMING_RULE_V6_VERSION)return v6.generateLocal(...args);
 throw new Error('未记录或未知的命名规则版本不能按当前版本重算。');
}
export function selectNamingCitationsForRuleVersion(version:NamingRuleVersion,...args:Parameters<typeof v4.selectNamingCitations>){
 if(version===NAMING_RULE_V4_VERSION)return v4.selectNamingCitations(...args);
 if(version===NAMING_RULE_V5_VERSION)return v5.selectNamingCitations(...args);
 if(version===NAMING_RULE_V6_VERSION)return v6.selectNamingCitations(...args);
 throw new Error('未记录或未知的命名规则版本不能按当前版本重算。');
}

/** Main-process callers supply real package bytes identity; no public/client precomputed lookup is accepted. */
function fixedNamingPackContext(context:TrustedNamingContext|undefined){
 try{assertPlainJson(context);if(context&&Reflect.ownKeys(context).length===2&&Object.keys(context).length===2&&Object.keys(context).every(key=>['packSha256','activeVersion'].includes(key))&&context.packSha256===naming7.base.knowledgePackSha256&&context.activeVersion===naming7.base.activeVersion)return Object.freeze({packSha256:context.packSha256,activeVersion:context.activeVersion});}catch{/* Invalid context does not identify a fixed reviewed pack. */}return undefined;
}
/** Saved version is authoritative. Same packSHA never upgrades an old rule. */
export function resolveNamingContextForRuleVersion(version:NamingRuleVersion,context:TrustedNamingContext|undefined){
 if(version===NAMING_RULE_V4_VERSION)return{version:NAMING_RULE_V4_VERSION,sourceId:NAMING_RULE_V4_SOURCE_ID,context:undefined};
 if(version===NAMING_RULE_V5_VERSION)return{version:NAMING_RULE_V5_VERSION,sourceId:NAMING_RULE_V5_SOURCE_ID,context:undefined};
 if(version===NAMING_RULE_V6_VERSION)return{version:NAMING_RULE_V6_VERSION,sourceId:NAMING_RULE_V6_SOURCE_ID,context:undefined};
 if(version!==NAMING_RULE_V7_VERSION&&version!==NAMING_RULE_V71_VERSION)throw new Error('未记录或未知的命名规则版本不能按当前版本重算。');
 const trusted=fixedNamingPackContext(context);if(!trusted)throw new Error(version===NAMING_RULE_V7_VERSION?'命名7.0重算需要匹配生成时完整知识包身份，不能降级重算。':'命名7.1重算需要匹配生成时完整知识包身份，不能降级重算。');
 return version===NAMING_RULE_V7_VERSION?{version:NAMING_RULE_V7_VERSION,sourceId:NAMING_RULE_V7_SOURCE_ID,context:trusted}:{version:NAMING_RULE_V71_VERSION,sourceId:NAMING_RULE_V71_SOURCE_ID,context:trusted};
}
/** This entry alone chooses the current generation version. */
export function resolveNamingGenerationContext(context:TrustedNamingContext|undefined){
 const trusted=fixedNamingPackContext(context);if(trusted){const selected=resolveNamingContextForRuleVersion(CURRENT_NAMING_RULE_VERSION,trusted);if(!selected.context)throw new Error('当前固定生成版本未声明受审上下文。');return selected;}
 return {version:NAMING_RULE_V6_VERSION,sourceId:NAMING_RULE_V6_SOURCE_ID,context:undefined};
}
export function generateLocalWithContext(context:TrustedNamingContext|undefined,...args:Parameters<typeof v6.generateLocal>){getNamingElementBasis(args[1],args[2]);const selected=resolveNamingGenerationContext(context);return selected.context?v7.generateLocalWithContext(selected.context,...args):v6.generateLocal(...args);}
export function evaluateNameWithContext(context:TrustedNamingContext|undefined,...args:VersionedEvaluationArguments){if(args.length>7)throw new Error('命名求值不能使用外部缓存的字义或引文准入结果。');getNamingElementBasis(args[2],args[3]);const selected=resolveNamingGenerationContext(context);return selected.context?v7.evaluateNameWithContext(selected.context,...args):v6.evaluateName(...args);}
export function selectNamingCitationsWithContext(context:TrustedNamingContext|undefined,...args:Parameters<typeof v6.selectNamingCitations>){const selected=resolveNamingGenerationContext(context);return selected.context?v7.selectNamingCitationsWithContext(selected.context,...args):v6.selectNamingCitations(...args);}
export function selectNamingCitationNoteWithContext(context:TrustedNamingContext|undefined,...args:Parameters<typeof v6.selectNamingCitationNote>){const selected=resolveNamingGenerationContext(context);return selected.context?v7.selectNamingCitationNoteWithContext(selected.context,...args):v6.selectNamingCitationNote(...args);}
export function reviewedNamingCitationIdsWithContext(context:TrustedNamingContext|undefined){const selected=resolveNamingGenerationContext(context);return selected.context?v7.reviewedNamingCitationIdsWithContext(selected.context):v6.reviewedNamingCitationIds();}
export function reviewedNamingVocabularyWithContext(context:TrustedNamingContext|undefined,sourceId?:string){const selected=resolveNamingGenerationContext(context);return selected.context?v7.reviewedNamingVocabularyWithContext(selected.context,sourceId):v6.reviewedNamingVocabulary(sourceId);}
export function evaluateNameForRuleVersionWithContext(version:NamingRuleVersion,context:TrustedNamingContext|undefined,...args:VersionedEvaluationArguments){
 if(args.length>7)throw new Error('版本求值不能使用外部缓存的字义或引文准入结果。');
 if(version!==NAMING_RULE_V7_VERSION&&version!==NAMING_RULE_V71_VERSION)return evaluateNameForRuleVersion(version,...args);
 const selected=resolveNamingContextForRuleVersion(version,context);if(!selected.context)throw new Error('明确命名版本缺少归档上下文。');
 return v7.evaluateNameWithContext(selected.context,...args);
}

export function selectNamingCitationsForRuleVersionWithContext(version:NamingRuleVersion,context:TrustedNamingContext|undefined,...args:Parameters<typeof v6.selectNamingCitations>){const selected=resolveNamingContextForRuleVersion(version,context);if(selected.context)return v7.selectNamingCitationsWithContext(selected.context,...args);return selectNamingCitationsForRuleVersion(version,...args);}
export function generateLocalForRuleVersionWithContext(version:NamingRuleVersion,context:TrustedNamingContext|undefined,...args:Parameters<typeof v6.generateLocal>){const selected=resolveNamingContextForRuleVersion(version,context);if(selected.context)return v7.generateLocalWithContext(selected.context,...args);return generateLocalForRuleVersion(version,...args);}

/** Both replay and generation validate the actual basis against an explicit version. */
export function resolveNamingBasisForRuleVersion(version:NamingRuleVersion,context:TrustedNamingContext|undefined,pref:NamingPreferences,analysis:Analysis,basis?:ResolvedNamingBasis):ResolvedNamingBasis{
 const selected=resolveNamingContextForRuleVersion(version,context),resolved=getNamingElementBasis(pref,analysis,basis);
 if(resolved.source==='project'){
  if(!selected.context)throw new NamingElementBasisError('unsupported-tuple','项目命名需要所选明确版本的完整知识包身份。');
  try{assertNamingElementApplicationTuple(selected.version,resolved.selection.methodId,resolved.applicationPolicyVersion);}catch(error){throw new NamingElementBasisError('unsupported-tuple',error instanceof Error?error.message:'项目命名规则与应用协议组合不受支持。');}
 }
 return resolved;
}
export function resolveNamingGenerationBasis(context:TrustedNamingContext|undefined,pref:NamingPreferences,analysis:Analysis,basis?:ResolvedNamingBasis):ResolvedNamingBasis{
 const selected=resolveNamingGenerationContext(context);return resolveNamingBasisForRuleVersion(selected.version,selected.context,pref,analysis,basis);
}
export function generateLocalWithResolvedBasisForRuleVersion(version:NamingRuleVersion,context:TrustedNamingContext|undefined,basis:ResolvedNamingBasis,...args:Parameters<typeof v6.generateLocal>){
 const selected=resolveNamingContextForRuleVersion(version,context),resolved=resolveNamingBasisForRuleVersion(selected.version,selected.context,args[1],args[2],basis);
 return selected.context?v7.generateLocalWithResolvedBasisForRuleVersion(selected.version,selected.context,resolved,...args):generateLocalForRuleVersion(selected.version,...args);
}
export function evaluateNameWithResolvedBasisForRuleVersion(version:NamingRuleVersion,context:TrustedNamingContext|undefined,basis:ResolvedNamingBasis,...args:VersionedEvaluationArguments){
 if(args.length>7)throw new Error('版本求值不能使用外部缓存的字义或引文准入结果。');
 const selected=resolveNamingContextForRuleVersion(version,context),resolved=resolveNamingBasisForRuleVersion(selected.version,selected.context,args[2],args[3],basis);
 return selected.context?v7.evaluateNameWithResolvedBasisForRuleVersion(selected.version,selected.context,resolved,...args):evaluateNameForRuleVersion(selected.version,...args);
}
/** Only these current-generation wrappers select CURRENT. The explicit methods above never do. */
export function generateLocalWithResolvedBasis(context:TrustedNamingContext|undefined,basis:ResolvedNamingBasis,...args:Parameters<typeof v6.generateLocal>){const selected=resolveNamingGenerationContext(context);return generateLocalWithResolvedBasisForRuleVersion(selected.version,selected.context,basis,...args);}
export function evaluateNameWithResolvedBasis(context:TrustedNamingContext|undefined,basis:ResolvedNamingBasis,...args:VersionedEvaluationArguments){if(args.length>7)throw new Error('命名求值不能使用外部缓存的字义或引文准入结果。');const selected=resolveNamingGenerationContext(context);return evaluateNameWithResolvedBasisForRuleVersion(selected.version,selected.context,basis,...args);}
export function selectNamingCitationNoteForRuleVersionWithContext(version:NamingRuleVersion,context:TrustedNamingContext|undefined,...args:Parameters<typeof v6.selectNamingCitationNote>){const selected=resolveNamingContextForRuleVersion(version,context);if(selected.context)return v7.selectNamingCitationNoteWithContext(selected.context,...args);if(selected.version===NAMING_RULE_V4_VERSION)return v4.selectNamingCitationNote(...args);if(selected.version===NAMING_RULE_V5_VERSION)return v5.selectNamingCitationNote(...args);return v6.selectNamingCitationNote(...args);}
export function reviewedNamingCitationIdsForRuleVersionWithContext(version:NamingRuleVersion,context:TrustedNamingContext|undefined){const selected=resolveNamingContextForRuleVersion(version,context);if(selected.context)return v7.reviewedNamingCitationIdsWithContext(selected.context);if(selected.version===NAMING_RULE_V4_VERSION)return [] as string[];if(selected.version===NAMING_RULE_V5_VERSION)return v5.reviewedNamingCitationIds();return v6.reviewedNamingCitationIds();}
export function reviewedNamingVocabularyForRuleVersionWithContext(version:NamingRuleVersion,context:TrustedNamingContext|undefined,sourceId?:string){const selected=resolveNamingContextForRuleVersion(version,context);if(selected.context)return v7.reviewedNamingVocabularyWithContext(selected.context,sourceId);if(selected.version===NAMING_RULE_V4_VERSION)return [] as Array<{name:string;sourceId:string}>;if(selected.version===NAMING_RULE_V5_VERSION)return v5.reviewedNamingVocabulary(sourceId);return v6.reviewedNamingVocabulary(sourceId);}
