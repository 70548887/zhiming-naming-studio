import type {BirthProfile} from '../../src/shared/types';
import type {RootFeedbackPreviewDTO,RootFeedbackOpinion} from '../../src/shared/bazi-root-feedback-v132';
import type {RootFeedbackV132FacadeDTO} from '../../src/shared/bazi-root-feedback-v132-r2-facade';
import {bindPreviewFixtureResponse} from '../helpers/m812-bound-preview-response';

/** Typed renderer fixtures; only the bound variant uses main's request seam, with no Service or engine execution. */
export const previewProfile=(id='profile-a',unknown=false):BirthProfile=>({id,customerName:'预览界面样本',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2026-10-25',birthTime:unknown?'':'09:30',timeUnknown:unknown,leapMonth:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:''});
function opinion(regimeId:string,element:'木'|'水'):RootFeedbackOpinion {
 return {regimeId,methodId:'project-bazi-mainchain-145/1.3.2',hypothetical:false,strength:'balanced',branch:'regular-balanced',primary:[element],secondary:[],avoid:[],uses:[],alternatives:[],summary:['界面 fixture 项目方向'],pending:[]};
}
function root(status:RootFeedbackV132FacadeDTO['status'],id:string):RootFeedbackPreviewDTO {
 const regimes:RootFeedbackPreviewDTO['regimes']=['regime-a','regime-b'].slice(0,status==='multiple-consistent-regimes'?2:1).map((regimeId,index)=>({
  id:regimeId,consistency:status==='no-consistent-regime'?'inconsistent':status==='pending-regime-resolution'?'possible':'consistent',assumptions:[],capacities:[],roots:[],opinion:status==='no-consistent-regime'?null:opinion(regimeId,index?'水':'木'),
  certificate:{status:'closed',failureReason:null,epsilon:0.000001,maxIterations:32,controlFraction:0.2,maxLossFraction:0.5,iterations:7,lastL1Delta:0.0000001,lastL1DeltaUpperBound:0.0000002,contractionUpperBound:0.5,errorBound:0.0000004,residualL1UpperBound:0.0000001,columnSums:{},disabledEdgeIds:[],issues:[]},pending:[],
 }));
 return {schema:'bazi-root-feedback-preview/1.3.2',methodId:'project-bazi-mainchain-145/1.3.2',profileId:id,hypothetical:false,scope:'complete-known-pillars',resolution:status,entryPolicy:'month-branch-only',facts:[],variables:[],regimes,
  consistentIds:regimes.filter(regime=>regime.consistency==='consistent').map(regime=>regime.id),possibleIds:regimes.filter(regime=>regime.consistency==='possible').map(regime=>regime.id),commonOpinion:{status:'unavailable',primary:[],favorable:[]},conflicts:[],pending:[],limitations:['fixture 保留的范围限制'],
  preparation:{scope:'complete-known-pillars',relations:[],trace:[],ruleIds:[],sourceIds:[],pending:[]},explanationChain:{schema:'bazi-root-feedback-explanation/1.0.0',traditionalStatus:'unknown',projectStatus:'unknown',steps:[],residualGaps:[]},detail:{},
 };
}
export function previewDto(status:RootFeedbackV132FacadeDTO['status']='unique-consistent-regime',profileId='profile-a',unknown=false):RootFeedbackV132FacadeDTO {
 const branchId=unknown?profileId+':calendar-interval:0':profileId;
 const projected=root(status,branchId);if(unknown){projected.scope='known-pillars-only';projected.preparation={...projected.preparation,scope:'known-pillars-only'};}
 return {schema:'bazi-root-feedback-facade/1.3.2-r2',methodId:'project-bazi-mainchain-145/1.3.2',profileId,entryPolicy:'month-branch-only',status,
  baseAnalysis:{} as RootFeedbackV132FacadeDTO['baseAnalysis'],
  resourceIdentity:{schema:'bazi-root-feedback-resource-identity/3',methodId:'project-bazi-mainchain-145/1.3.2',applicationPolicyVersion:'naming-element-preview/1.3.2',publicationId:'bazi-root-feedback/1.3.2;preview-publication-r2',manifestSha256:'3d9b15e6f9963f385411a70eabcbb3ab940629bc285bea65a8ebee92c3f6c71a',fullClosureSha256:'9f3fa8d4cfc8f190934268597cffb25be19cbf2723b4b827ec74228f2c7596f8',kernel:{methodId:'project-bazi-mainchain-144/1.2.0',sourceRevision:'c73c53b4558dc5b4e339fe84e930d08695a4df5865147e422d7295a7822cc685'},files:[],runtimeEnvironment:{node:'fixture-node',icu:null,tz:null,unicode:null}},
  sources:[{id:'fixture-project-source',name:'界面测试来源',url:'project://fixture',commit:'fixture-r2',license:'Fixture only',files:[],sha256:'c'.repeat(64),note:'仅为 renderer 测试夹具，未执行主进程认证。'}],
  branches:[{id:branchId,kind:unknown?'unknown-hour-interval':'recorded-instant',hypothetical:false,root:projected}],
  applicationGate:{status:'blocked',reasons:[{code:'version-not-admitted-for-application',message:'renderer fixture application blocked'}]},calendar:{partitionComplete:true,warnings:[]},
 };
}

/** Synthetic display data plus the real main binding seam for this exact test request. */
export function previewBoundDto(profile:BirthProfile,options?:{fromOutputMonthStem?:boolean},status?:RootFeedbackV132FacadeDTO['status']) {
 const dto=previewDto(status??(profile.timeUnknown?'pending-regime-resolution':'unique-consistent-regime'),profile.id,profile.timeUnknown);
 const entryPolicy=options?.fromOutputMonthStem===true?'month-stem-proposal':'month-branch-only';
 dto.entryPolicy=entryPolicy;
 for(const branch of dto.branches)branch.root.entryPolicy=entryPolicy;
 return bindPreviewFixtureResponse(dto,profile,options);
}
