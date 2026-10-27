import {createHash} from 'node:crypto';
import {canonicalPlainJson} from '../shared/plain-json';
import {snapshotApplicationJson} from './project-application-v132-r2-json';
import {CANDIDATE2_ELIGIBILITY_VERSION} from '../shared/candidate2-naming-eligibility-v1';
import type {Candidate2NamingEligibility,Candidate2EligibilityReason,Candidate2EligibilityRequest} from '../shared/candidate2-naming-eligibility-v1';
import {CANDIDATE2_NAMING_CONSUMER_VERSION,CANDIDATE2_NAMING_SELECTION} from '../shared/candidate2-naming-consumer-v1';
import type {BirthProfile,NamingPreferences} from '../shared/types';
import type {Candidate2NamingRequest} from '../shared/candidate2-naming-consumer-v1';
export const eligibilityDigest=(value:unknown)=>createHash('sha256').update(canonicalPlainJson(value)).digest('hex');
export function captureEligibilityRequest(profile:BirthProfile,preferences:NamingPreferences,selection:Candidate2NamingRequest['selection']):Candidate2EligibilityRequest {
 return snapshotApplicationJson({profile,preferences,selection:selection===undefined?null:selection,selectionWasProvided:selection!==undefined}) as Candidate2EligibilityRequest;
}
export function eligibilityResponse(status:Candidate2NamingEligibility['status'],request:Candidate2EligibilityRequest|null,reasons:Candidate2EligibilityReason[],extra?:Pick<Candidate2NamingEligibility,'application'|'dataIdentity'>&{normalizedInputDigest:string}):Candidate2NamingEligibility {
 const resourceDigest=extra?eligibilityDigest({application:extra.application?.tuple??null,dataIdentity:extra.dataIdentity}):null;
 return snapshotApplicationJson({schema:'candidate2-naming-eligibility/1',checkerVersion:CANDIDATE2_ELIGIBILITY_VERSION,consumerVersion:CANDIDATE2_NAMING_CONSUMER_VERSION,status,reasons,
  binding:{request,requestDigest:request?eligibilityDigest(request):null,normalizedInputDigest:extra?.normalizedInputDigest??null,resourceDigest},
  versions:{methodId:CANDIDATE2_NAMING_SELECTION.methodId,policyId:CANDIDATE2_NAMING_SELECTION.policyId,publicationId:CANDIDATE2_NAMING_SELECTION.publicationId,entryPolicy:CANDIDATE2_NAMING_SELECTION.entryPolicy,namingRulesVersion:'naming-editorial-7.1.0'},
  application:extra?.application??null,dataIdentity:extra?.dataIdentity??null,generationAuthority:false,candidateAvailability:'not-evaluated',traditionalStatus:'unknown',
  notice:'本次仅核对当前取法、出生资料和固定资源是否可用，不保证当前指定字或排除约束一定有候选；生成时会重新核验。',
 }) as Candidate2NamingEligibility;
}
const messages:Record<string,string>={
 CONFLICT:'项目取法与人工五行或原项目选择冲突，请先明确采用一种取法。',
 UNSUPPORTED_FEATURE:'当前消费者尚未接入已开启的扩展复核，请保留原方法，或明确关闭相应扩展后重试。',
 UNSUPPORTED_SELECTION:'请选择完整登记的 candidate.2 取法；当前选择不能自动升级或降级。',
 PROFILE_MISMATCH:'出生资料中的命名偏好与当前偏好不一致，请先同步资料。',
 INPUT_INVALID:'输入结构或必要字段无效，请核对出生资料和命名偏好。',
 UNSUPPORTED_NAMING_VERSION:'当前命名规则版本尚未支持本取法。',
};
const coreMessages:Record<string,string>={
 'unknown-birth-time':'出生时辰未知，不能采用假设时柱生成。',
 'birth-facts-unverified':'完整出生资料或固定历法事实尚未通过核验。',
 'invalid-birth-profile':'出生日期、时制或必要资料无效，请核对输入。',
 'multiple-regimes':'当前保留多个一致根机制，尚不能确定唯一采用结果。',
 'no-consistent-regime':'当前没有可采用的一致根机制。',
 'root-pending':'根气、容量或取用前提仍待确定。',
 'preparation-pending':'准备阶段仍有未决前提。',
 'preparation-evidence-missing':'准备阶段的规则或来源证据不完整。',
 'control-unsettled':'数值收敛、误差或残差证书尚未闭合。',
 'control-certificate-mismatch':'固定数值证书重算结果不一致，不能采用。',
 'consumer-pending':'取用意见仍有缺失条件或替代方案。',
 'numeric-threshold-pending':'关键数值判断尚未与阈值分离。',
 'unsupported-formation':'当前属于未支持的从格或合化分支，不能采用为命名依据。',
 'calendar-ambiguous':'出生时刻存在歧义，不能确定唯一采用结果。',
 'identity-pending':'取用结果与当前输入或执行身份未能完整绑定。',
 'missing-primary-use':'当前没有已确定的主用方向。',
 'contradictory-uses':'主辅用与避用存在冲突，不能采用。',
};
export function eligibilityCoreReason(code:string):Candidate2EligibilityReason {return{code,message:coreMessages[code]??'当前取法必要条件尚未全部满足，请补充资料后重试。'};}
export function eligibilityFailure(error:unknown,request:Candidate2EligibilityRequest|null):Candidate2NamingEligibility {
 const text=error instanceof Error?error.message:'',code=error&&typeof error==='object'&&'code'in error?String(error.code):'';
 const suffix=code.replace(/^CANDIDATE2_NAMING_/,'');
 if(messages[suffix])return eligibilityResponse('blocked',request,[{code:code||'input-invalid',message:messages[suffix]}]);
 if(text.startsWith('PROJECT_APPLICATION_INPUT_INVALID'))return eligibilityResponse('blocked',request,[{code:'input-invalid',message:messages.INPUT_INVALID}]);
 const data=text.startsWith('CANDIDATE2_NAMING_DATA_INVALID');
 return eligibilityResponse('unavailable',request,[{code:data?'data-resources-unavailable':'application-resources-unavailable',message:data?'当前数据包、命名规则或固定来源版本不匹配，请先恢复已核验的数据后重试。':'当前固定取法执行文件或来源资源不可用，请完成部署或恢复资源后重试。'}]);
}
