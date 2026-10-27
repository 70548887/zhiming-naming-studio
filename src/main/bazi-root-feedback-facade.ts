import {isDeepStrictEqual} from 'node:util';
import {analyzeProfile} from '../domain/engine';
import {resolveRootCalendarBranches,rootChartPillarsFromBazi} from '../domain/bazi-root-calendar-branches';
import type {RootCalendarPartition} from '../domain/bazi-root-calendar-branches';
import {analyzeChart145,toRootFeedbackPreviewDTO,METHOD_145} from '../domain/bazi-mainchain/project-v13';
import type {BirthProfile,Analysis,Element,BirthTimeAnalysis} from '../shared/types';
import {readRootFeedbackFacadeOptions,ROOT_FEEDBACK_FACADE_VERSION} from '../shared/bazi-root-feedback-facade';
import type {RootFeedbackFacadeOptions,RootFeedbackFacadeDTO,RootFeedbackCalendarBranch} from '../shared/bazi-root-feedback-facade';
import {evaluateRootFeedbackApplication,assertRootFeedbackApplicationCertificateMatches} from './bazi-root-feedback-application';
import {ROOT_FEEDBACK_ENGINE_PROVENANCE} from '../shared/bazi-root-feedback-application';
import type {RootFeedbackApplicationCertificate} from '../shared/bazi-root-feedback-application';
import type {VerifiedRootFeedbackResources} from './bazi-root-feedback-resources';
import {baziSnapshotStatus} from './bazi-snapshot';
import {expectedQimen} from './expected-analysis';
import {compatibleSavedAnalysisVersions} from './saved-analysis-policy';
import {canonicalPlainJson} from '../shared/plain-json';

const order:Element[]=['木','火','土','金','水'];
const verifiedFacts=new WeakSet<object>();
export interface VerifiedRootFeedbackBaseFacts {readonly profile:BirthProfile;readonly baseAnalysis:Analysis;readonly timeBasis:BirthTimeAnalysis;readonly factsVersion:'verified-saved-base/1.0.0';}
export interface BaziRootFeedbackFacade {
 previewBaziRootFeedbackProfile(profile:BirthProfile,options?:RootFeedbackFacadeOptions):RootFeedbackFacadeDTO;
 fromVerifiedFixedBase(facts:VerifiedRootFeedbackBaseFacts,options?:RootFeedbackFacadeOptions):RootFeedbackFacadeDTO;
 verifyApplicationCertificate(saved:unknown,facts:VerifiedRootFeedbackBaseFacts,options?:RootFeedbackFacadeOptions):RootFeedbackApplicationCertificate;
}
function freeze<T>(value:T):T {if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}

/** Exact saved version replay, never a call to the current profile preview. */
export function verifyFixedRootFeedbackBaseFacts(profile:BirthProfile,savedBaseAnalysis:Analysis):VerifiedRootFeedbackBaseFacts {
 canonicalPlainJson(savedBaseAnalysis);
 if(!compatibleSavedAnalysisVersions(savedBaseAnalysis.bazi?.version,savedBaseAnalysis.qimen?.version))throw new Error('固定基础八字/奇门版本组合不受支持。');
 const status=baziSnapshotStatus(savedBaseAnalysis.bazi,profile);if(status!=='verified-current'&&status!=='verified-legacy')throw new Error('固定基础八字未按保存版本核验，拒绝重建项目证书。');
 if(!isDeepStrictEqual(savedBaseAnalysis.qimen,expectedQimen(profile,savedBaseAnalysis.qimen.version)))throw new Error('固定基础奇门未按保存版本核验。');
 const time=savedBaseAnalysis.bazi.timeBasis;
 if(profile.timeUnknown||!time||time.dayStatus!=='determined'||!time.actualUtc||!time.calculationDateTime||savedBaseAnalysis.bazi.pillars.length!==4)throw new Error('应用证书固定基线须含已验证的完整确定出生瞬间和时间基准；不以当前历法补齐旧结果。');
 const value:VerifiedRootFeedbackBaseFacts=freeze({profile:structuredClone(profile),baseAnalysis:structuredClone(savedBaseAnalysis),timeBasis:structuredClone(time),factsVersion:'verified-saved-base/1.0.0'});verifiedFacts.add(value);return value;
}

function build(profile:BirthProfile,base:Analysis,partition:RootCalendarPartition,options:RootFeedbackFacadeOptions,resources:VerifiedRootFeedbackResources):RootFeedbackFacadeDTO {
 const branches:RootFeedbackCalendarBranch[]=[],raw:ReturnType<typeof analyzeChart145>[]=[];
 for(const part of partition.branches){const hypothetical=profile.timeUnknown&&partition.branches.length>1,chart={...part.chart,provenance:ROOT_FEEDBACK_ENGINE_PROVENANCE+';'+base.bazi.version+';'+partition.timeBasis.methodId},result=analyzeChart145(chart,options,[],hypothetical);raw.push(result);branches.push({id:part.chart.id,kind:profile.timeUnknown?'unknown-hour-interval':'recorded-instant',hypothetical,actualInterval:{startUtc:new Date(part.startEpoch).toISOString(),endUtc:new Date(part.endEpoch).toISOString()},witness:profile.timeUnknown?{actualUtc:new Date(part.witnessEpoch).toISOString(),calculationClock:part.calculationClock,purpose:'calendar-partition-witness-only'}:null,pillars:structuredClone(part.chart.pillars),root:toRootFeedbackPreviewDTO(result)});}
 const first=branches[0],firstRaw=raw[0];
 if(!first||!firstRaw)throw new Error('根反馈实际出生分支为空，未生成预览或应用证书。');
 const entryPolicy=options.fromOutputMonthStem?'month-stem-proposal' as const:'month-branch-only' as const;
 const applicationGate=evaluateRootFeedbackApplication({profile,baseAnalysis:base,timeBasis:partition.timeBasis,branchCount:branches.length,branch:first,engineResult:firstRaw,calendarComplete:partition.complete,calendarAmbiguous:partition.context.ambiguous,entryPolicy,resources});
 const opinions=branches.flatMap(branch=>branch.root.regimes.filter(regime=>branch.root.consistentIds.includes(regime.id)||branch.root.possibleIds.includes(regime.id)).filter(regime=>regime.opinion!==null).map(regime=>({id:branch.id+':'+regime.id,opinion:regime.opinion!})));
 const allOpinions=!profile.timeUnknown&&partition.complete&&!partition.context.ambiguous&&branches.every(branch=>branch.root.commonOpinion.status==='all-retained-regimes');
 const favorable=order.filter(element=>opinions.length&&opinions.every(item=>item.opinion.uses.some(use=>use.role!=='avoid'&&use.element===element))),primary=order.filter(element=>opinions.length&&opinions.every(item=>item.opinion.primary.includes(element)));
 const conflicts=order.flatMap(element=>{const favorableIn=opinions.filter(item=>item.opinion.uses.some(use=>use.role!=='avoid'&&use.element===element)).map(item=>item.id),avoidIn=opinions.filter(item=>item.opinion.avoid.includes(element)).map(item=>item.id);return favorableIn.length&&avoidIn.length?[{element,favorableIn,avoidIn}]:[];});
 const pending=[...new Set([...branches.flatMap(branch=>branch.root.pending.map(reason=>branch.id+'：'+reason)),...(profile.timeUnknown?['出生小时未知，所有区间仅为已知三柱的条件投影，应用门关闭。']:[]),...(partition.context.ambiguous?['民用记录处于重复小时，现有历法沿用第一次实际瞬间；第二次未另算，应用门关闭。']:[])])];
 const status=profile.timeUnknown||!partition.complete||branches.length!==1?'pending-regime-resolution':first.root.resolution;
 return{schema:ROOT_FEEDBACK_FACADE_VERSION,methodId:METHOD_145 as 'project-bazi-mainchain-145/1.3.1',entryPolicy,profileId:profile.id,recordedBirth:{calendar:profile.calendar,birthDate:profile.birthDate,birthTime:profile.birthTime,timeUnknown:profile.timeUnknown,leapMonth:profile.leapMonth,timezone:profile.timezone,...(profile.timeBasis===undefined?{}:{timeBasis:profile.timeBasis}),...(profile.birthLongitude===undefined?{}:{birthLongitude:profile.birthLongitude})},status,baseAnalysis:structuredClone(base),calendar:{engineVersion:base.bazi.version,timeBasis:structuredClone(partition.timeBasis),knownPillars:structuredClone(base.bazi.pillars),partitionPolicy:'existing-civil/timebasis/Jie-and-solar-midnight-closed-seconds/1.0.0',partitionComplete:partition.complete,warnings:[...partition.warnings]},branches,applicationGate,commonOpinion:{status:!opinions.length?'unavailable':allOpinions?'all-calendar-branches':'known-opinions-only',primary:allOpinions?primary:[],favorable:allOpinions?favorable:[]},conflicts,pending,limitations:['出生时间分支、根机制结果及取用应用门分别保留，不将数学唯一解等同取用已决。','1.3.1是固定关系下的项目模型，不认证完整传统用神、杀印来源穿透或奇门姓名验局。','本预览不修改基础八字/奇门、不写人工五行、评分、客户或方案。']};
}

export function createBaziRootFeedbackFacade(resources:VerifiedRootFeedbackResources):BaziRootFeedbackFacade {
 const facade:BaziRootFeedbackFacade={
  previewBaziRootFeedbackProfile(profile:BirthProfile,value?:RootFeedbackFacadeOptions):RootFeedbackFacadeDTO {const options=readRootFeedbackFacadeOptions(value),base=analyzeProfile(structuredClone(profile)),partition=resolveRootCalendarBranches(profile,base);return build(profile,base,partition,options,resources);},
  fromVerifiedFixedBase(facts:VerifiedRootFeedbackBaseFacts,value?:RootFeedbackFacadeOptions):RootFeedbackFacadeDTO {
   if(!verifiedFacts.has(facts))throw new Error('历史项目核验必须使用主进程按保存版本验证的固定基线，不接受请求自带事实。');
   const options=readRootFeedbackFacadeOptions(value),profile=facts.profile,base=facts.baseAnalysis,time=facts.timeBasis,epoch=Date.parse(time.actualUtc!);
   // Context metadata below is assembled from the verified saved result only;
   // no current civil/timebasis/calendar resolver runs on this path.
   const partition={timeBasis:time,complete:true,warnings:[...time.warnings],context:{ambiguous:base.bazi.evidence?.timeBasis.ambiguous===true},branches:[{chart:{id:profile.id,provenance:'verified-saved-base:'+base.bazi.version+';'+time.methodId,pillars:rootChartPillarsFromBazi(base.bazi.pillars)},startEpoch:epoch,endEpoch:epoch,calculationClock:time.calculationDateTime!,witnessEpoch:epoch}]} as RootCalendarPartition;
   return build(profile,base,partition,options,resources);
  },
  verifyApplicationCertificate(saved:unknown,facts:VerifiedRootFeedbackBaseFacts,value?:RootFeedbackFacadeOptions){const rebuilt=facade.fromVerifiedFixedBase(facts,value);return assertRootFeedbackApplicationCertificateMatches(saved,rebuilt.applicationGate);}
 };
 return facade;
}
