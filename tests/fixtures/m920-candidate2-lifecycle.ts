import type {BirthProfile,NamingPreferences} from '../../src/shared/types';
import type {Candidate2NamingEligibility} from '../../src/shared/candidate2-naming-eligibility-v1';
import {DEFAULT_NAMING_PREFERENCES} from '../../src/shared/workflow';

// Display fixtures only: these are not Service/resource verification results.
export const profile:BirthProfile={id:'m920-profile',customerName:'',surname:'林',surnamePinyin:'lin',gender:'中性',calendar:'solar',birthDate:'2024-01-01',leapMonth:false,birthTime:'12:00',timeUnknown:false,birthPlace:'',timezone:'Asia/Shanghai',notes:''};
export const preferences:NamingPreferences={...DEFAULT_NAMING_PREFERENCES,preferredElements:[]};
export function eligibility(notice='当前资料资格已完成'):Candidate2NamingEligibility {
 return {schema:'candidate2-naming-eligibility/1',checkerVersion:'candidate2-naming-eligibility/1.0.0',consumerVersion:'candidate2-naming-consumer/1.0.0',status:'eligible',reasons:[],binding:{request:null,requestDigest:null,normalizedInputDigest:null,resourceDigest:null},versions:{methodId:'project-bazi-mainchain-145/1.3.2',policyId:'naming-element-application/1.3.2-candidate.2',publicationId:'project-naming-application/1.3.2-candidate.2',entryPolicy:'month-branch-only',namingRulesVersion:'naming-editorial-7.1.0'},application:null,dataIdentity:null,generationAuthority:false,candidateAvailability:'not-evaluated',traditionalStatus:'unknown',notice};
}
