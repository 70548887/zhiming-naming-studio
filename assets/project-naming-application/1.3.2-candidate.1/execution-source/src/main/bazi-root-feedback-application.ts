import {createHash} from 'node:crypto';
import {analyzeChart145} from '../domain/bazi-mainchain/project-v13';
import {settleControlBudget} from '../domain/bazi-mainchain/kernel-v12-fixed/control-budget';
import type {ClosedControlBudgetSettlement} from '../domain/bazi-mainchain/kernel-v12-fixed/control-budget-types';
import {canonicalPlainJson} from '../shared/plain-json';
import {ROOT_FEEDBACK_ENGINE_PROVENANCE,ROOT_FEEDBACK_APPLICATION_SCHEMA,ROOT_FEEDBACK_APPLICATION_POLICY,ROOT_FEEDBACK_METHOD_ID,type RootFeedbackEntryPolicy,type RootFeedbackResourceIdentity,type RootFeedbackApplicationReason,type RootFeedbackApplicationReasonCode,type RootFeedbackEffectiveElements,type RootFeedbackBlockedApplicationGate,type RootFeedbackApplicationGate,type RootFeedbackApplicationCertificate,type RootFeedbackControlSummary} from '../shared/bazi-root-feedback-application';
import {assertVerifiedRootFeedbackResources,type VerifiedRootFeedbackResources} from './bazi-root-feedback-resources';

import type {Analysis,BirthProfile,BirthTimeAnalysis,Element} from '../shared/types';
import type {ChartCase140} from '../shared/bazi-mainchain-method-types';
export type RootFeedbackEngineResult=ReturnType<typeof analyzeChart145>;
export type RootFeedbackSelectedRegime=RootFeedbackEngineResult['regimes'][number];
export interface RootFeedbackApplicationBranch {id:string;kind:'recorded-instant'|'unknown-hour-interval';hypothetical:boolean;actualInterval:{startUtc:string;endUtc:string};pillars:ChartCase140['pillars'];}
export interface RootFeedbackApplicationFacts {profile:BirthProfile;baseAnalysis:Analysis;timeBasis:BirthTimeAnalysis;branchCount:number;branch:RootFeedbackApplicationBranch;calendarComplete:boolean;calendarAmbiguous:boolean;entryPolicy:RootFeedbackEntryPolicy;engineResult:RootFeedbackEngineResult;}
export type RootFeedbackApplicationInspection=RootFeedbackBlockedApplicationGate|{status:'eligible';reasons:[];caseId:string;regimeId:string;selected:RootFeedbackSelectedRegime;effectiveElements:RootFeedbackEffectiveElements;};

const elements:readonly Element[]=['木','火','土','金','水'];
const finiteInterval=(value:{lower:number;upper:number}|null)=>value!==null&&Number.isFinite(value.lower)&&Number.isFinite(value.upper)&&value.lower>=0&&value.lower<=value.upper;

/** Pure application policy. Numerical acceptance is independently supplied by the pinned main-process kernel. */
export function inspectRootFeedbackApplication(input:RootFeedbackApplicationFacts, numericalAccepted:boolean):RootFeedbackApplicationInspection {
  const reasons:RootFeedbackApplicationReason[]=[];
  const reject=(code:RootFeedbackApplicationReasonCode,message:string)=>{if(!reasons.some(item=>item.code===code))reasons.push({code,message});};
  const {profile,baseAnalysis,timeBasis,branch,engineResult:root}=input;
  const fullPillars=Object.values(branch.pillars).length===4&&Object.values(branch.pillars).every(pillar=>pillar!==null&&/^[甲乙丙丁戊己庚辛壬癸]$/.test(pillar.gan)&&/^[子丑寅卯辰巳午未申酉戌亥]$/.test(pillar.zhi));
  const basePillars=baseAnalysis.bazi.pillars.map(pillar=>({gan:pillar.gan,zhi:pillar.zhi}));
  const chartPillars=[branch.pillars.year,branch.pillars.month,branch.pillars.day,branch.pillars.hour];
  const normalizedRecordedTime=/^\d{2}:\d{2}$/.test(profile.birthTime)?profile.birthTime+':00':profile.birthTime;
  if(profile.timeUnknown!==false||input.branchCount!==1||branch.kind!=='recorded-instant'||!input.calendarComplete||input.calendarAmbiguous||!fullPillars||timeBasis.dayStatus!=='determined'||timeBasis.dayCandidates.length!==1||!timeBasis.actualUtc||!timeBasis.calculationDateTime||!baseAnalysis.bazi.version||!same(basePillars,chartPillars)||branch.actualInterval.startUtc!==timeBasis.actualUtc||branch.actualInterval.endUtc!==timeBasis.actualUtc||timeBasis.civilInterval.startUtc!==timeBasis.actualUtc||timeBasis.civilInterval.endUtc!==timeBasis.actualUtc||timeBasis.timezone!==profile.timezone||timeBasis.basis!==(profile.timeBasis??'civil')||timeBasis.longitude!==(timeBasis.basis==='apparent-solar'?profile.birthLongitude??null:null)||(timeBasis.civilDate!==profile.birthDate&&profile.calendar==='solar')||timeBasis.civilTime!==normalizedRecordedTime||(baseAnalysis.bazi.timeBasis&&!same(baseAnalysis.bazi.timeBasis,timeBasis)))reject('birth-input-unresolved','出生记录、实际时刻、计算日及四柱尚未唯一确定或事实绑定不一致。');
  if(branch.hypothetical!==false||root.hypothetical!==false)reject('hypothetical-birth-case','假设出生方案不进入实际命名。');
  if(root.resolution==='multiple-consistent-regimes'||root.consistentIds.length>1)reject('multiple-regimes','根反馈保留多个一致机制。');
  if(root.resolution==='no-consistent-regime'||root.consistentIds.length===0)reject('no-consistent-regime','根反馈没有唯一可采用的一致机制。');
  if(root.scope!=='complete-known-pillars'||root.resolution!=='unique-consistent-regime'||root.consistentIds.length!==1||root.possibleIds.length!==0||root.pending.length!==0||!same(root.consistentIds,root.regimes.filter(regime=>regime.consistency==='consistent').map(regime=>regime.id))||!same(root.possibleIds,root.regimes.filter(regime=>regime.consistency==='possible').map(regime=>regime.id)))reject('root-prerequisite-pending','根反馈完整性、唯一性或相关前提仍待确定。');
  const matches=root.regimes.filter(regime=>regime.id===root.consistentIds[0]);
  const selected=matches.length===1?matches[0]:null;
  if(!selected||selected.consistency!=='consistent'||selected.pending.length!==0||selected.inconsistencyReasons.length!==0)reject('root-prerequisite-pending','唯一根机制缺失、重复或前提未闭合。');
  if(selected){
    if(selected.rootAssumptions.length!==root.variables.length||selected.rootIntervals.length!==root.variables.length||selected.rootIntervals.some(witness=>witness.value==='unknown'||witness.value!==(witness.assumedRooted?'true':'false')||!witness.candidateSetComplete||witness.candidateIntervals.some(candidate=>candidate.qualification==='pending-prerequisite'||candidate.interval!==null&&!finiteInterval(candidate.interval)||candidate.power!==null&&!Number.isFinite(candidate.power)))||selected.rootAssumptions.some(assumption=>!root.variables.some(variable=>variable.id===assumption.variableId))||selected.capacities.some(capacity=>![capacity.seed,capacity.rootFactor,capacity.capacity].every(value=>Number.isFinite(value)&&value>=0)))reject('root-prerequisite-pending','选中机制的根谓词、容量或转换支撑资格尚未确定。');
    if(!numericalAccepted||selected.settlement?.status!=='closed'||!selected.controlSettlement||selected.settlement.issues.length!==0)reject('control-unsettled','选中机制未通过固定数值内核的闭合与系数复核。');
  }
  const mainchain=selected?.mainchainResult;
  if(!mainchain||mainchain.status!=='settled'||mainchain.coverage!=='complete'||mainchain.hypothetical!==false||mainchain.caseId!==branch.id||root.caseId!==branch.id||root.methodId!==ROOT_FEEDBACK_METHOD_ID||mainchain.methodId!==ROOT_FEEDBACK_METHOD_ID||root.entryPolicy!==input.entryPolicy||mainchain.entryPolicy!==input.entryPolicy||!same(mainchain.originalPillars,branch.pillars))reject('consumer-missing-or-failed','实际完整主链消费者缺失、失败或方法/出生事实绑定不一致。');
  if(mainchain&&(mainchain.decisionStatus!=='resolved-by-project-rules'||mainchain.missing.length!==0||mainchain.alternativeUses.length!==0))reject('mainchain-conditional','主用仍有缺失前提或未裁决的条件方案。');
  if(mainchain&&(mainchain.numericReview.status!=='separated-from-thresholds'||!finiteInterval(mainchain.numericReview.supportShare)||mainchain.numericReview.affectedPredicates.length!==0))reject('numeric-threshold-pending','主链数值判断尚未与阈值分离。');
  const uses=mainchain?.uses??[];
  if(uses.some(use=>!elements.includes(use.element)||!['primary','secondary','avoid'].includes(use.role)))reject('contradictory-uses','主辅忌用包含无效五行或角色。');
  const primary=elements.filter(element=>uses.some(use=>use.role==='primary'&&use.element===element));
  const secondary=elements.filter(element=>!primary.includes(element)&&uses.some(use=>use.role==='secondary'&&use.element===element));
  const avoid=elements.filter(element=>uses.some(use=>use.role==='avoid'&&use.element===element));
  if(primary.length===0)reject('missing-primary-use','实际主用为空。');
  if([...primary,...secondary].some(element=>avoid.includes(element)))reject('contradictory-uses','采用的主辅用与忌用相交。');
  if(reasons.length||!selected)return{status:'blocked',reasons,caseId:branch.id||null,regimeId:selected?.id??null};
  return{status:'eligible',reasons:[],caseId:branch.id,regimeId:selected.id,selected,effectiveElements:{primary,secondary,avoid,applied:elements.filter(element=>primary.includes(element)||secondary.includes(element))}};
}

export interface RootFeedbackCertificateProjectionContext {
  resourceIdentity:RootFeedbackResourceIdentity;controlSummary:RootFeedbackControlSummary;
  birthFactsBindingDigest:string;engineResultDigest:string;seasonalSourceReferenceDigest:string;
}
/** Compact typed projection only: full carrier/flow diagnostic graphs stay in the recomputable engine result. */
export function projectRootFeedbackApplicationCertificate(input:RootFeedbackApplicationFacts,inspection:Extract<RootFeedbackApplicationInspection,{status:'eligible'}>,context:RootFeedbackCertificateProjectionContext):Omit<RootFeedbackApplicationCertificate,'digest'> {
  const {profile,baseAnalysis,timeBasis,branch,engineResult:root}=input;
  const selected=inspection.selected,mainchain=selected.mainchainResult!;
  return{schema:ROOT_FEEDBACK_APPLICATION_SCHEMA,methodId:ROOT_FEEDBACK_METHOD_ID,applicationPolicyVersion:ROOT_FEEDBACK_APPLICATION_POLICY,entryPolicy:input.entryPolicy,profileId:profile.id,
    birthFacts:{calendar:profile.calendar,birthDate:profile.birthDate,leapMonth:profile.leapMonth,birthTime:profile.birthTime,timeUnknown:false,timezone:profile.timezone,timeBasis:profile.timeBasis??'civil',birthLongitude:profile.birthLongitude??null,actualInterval:branch.actualInterval,pillars:branch.pillars,timeAnalysis:timeBasis},
    calendarIdentity:{baziVersion:baseAnalysis.bazi.version,timeBasisVersion:timeBasis.version,timeBasisMethod:timeBasis.methodId,timeBasisSourceId:timeBasis.sourceId??null,birthFactsBindingDigest:context.birthFactsBindingDigest},resourceIdentity:context.resourceIdentity,
    rootSummary:{scope:root.scope,resolution:root.resolution,regimes:root.regimes.map(regime=>({id:regime.id,consistency:regime.consistency})),consistentIds:root.consistentIds,possibleIds:root.possibleIds,selectedRegimeId:selected.id,facts:root.facts,variables:root.variables,rootAssumptions:selected.rootAssumptions,capacities:selected.capacities,rootIntervals:selected.rootIntervals,pending:root.pending},controlSummary:context.controlSummary,
    mainchainOpinion:{status:'settled',coverage:'complete',hypothetical:false,methodId:ROOT_FEEDBACK_METHOD_ID,entryPolicy:input.entryPolicy,decisionStatus:'resolved-by-project-rules',numericReview:mainchain.numericReview,strength:mainchain.strength,branch:mainchain.branch,uses:mainchain.uses,missing:mainchain.missing,alternativeUses:[]},
    auxiliary:{conflicts:root.conflicts,seasonal:{status:mainchain.seasonal.status,statusCandidates:mainchain.seasonal.statusCandidates,projectElements:mainchain.seasonal.projectElements,numericMissing:mainchain.seasonal.numericMissing,reasons:mainchain.seasonal.reasons,sourceReferenceDigest:context.seasonalSourceReferenceDigest},limitations:mainchain.limitations,separateFromEffective:true},effectiveElements:inspection.effectiveElements,engineResultDigest:context.engineResultDigest};
}

export interface RootFeedbackApplicationInput extends RootFeedbackApplicationFacts {resources:VerifiedRootFeedbackResources;}
const evaluatedGates=new WeakSet<object>();
export const rootFeedbackCanonicalDigest=(value:unknown):string=>createHash('sha256').update(canonicalPlainJson(value)).digest('hex');
const same=(left:unknown,right:unknown)=>canonicalPlainJson(left)===canonicalPlainJson(right);
function frozenJson<T>(value:T):T {
  const clone=JSON.parse(canonicalPlainJson(value)) as T;
  const freeze=(item:unknown):void=>{if(item&&typeof item==='object'){for(const child of Object.values(item))freeze(child);Object.freeze(item);}};
  freeze(clone);return clone;
}
function validateNumericalCertificate(input:RootFeedbackApplicationInput):RootFeedbackControlSummary|null {
  const root=input.engineResult;
  if(root.consistentIds.length!==1)return null;
  const matches=root.regimes.filter(regime=>regime.id===root.consistentIds[0]);
  if(matches.length!==1)return null;
  const selected=matches[0],state=selected.settlement;
  if(!state||state.status!=='closed'||state.graph.coefficientPolicy!=='outward-denominator/downward-coefficient'||state.controlSettlement.status!=='closed'||!selected.mainchainResult)return null;
  const actual=state.controlSettlement;
  if(actual.disabledEdgeIds.length!==0||actual.issues.length!==0)return null;
  try{
    // Re-executes exact binary column-budget validation and outward numerical iteration.
    const expected=settleControlBudget(state.graph.nodes,state.graph.edges,[]);
    if(expected.status!=='closed'||!same(expected,actual)||!same(expected,selected.controlSettlement)||!same(expected,selected.mainchainResult.controlSettlement))return null;
    if(!Number.isInteger(actual.iterations)||actual.iterations<1||actual.iterations>64||actual.errorBound>1e-9||actual.lastL1Delta>1e-9||actual.contractionUpperBound>0.25||actual.contractionUpperBound<0)return null;
    canonicalPlainJson(state);canonicalPlainJson(actual);
    for(const group of [state.bounds.powers,state.bounds.flows,selected.generation.bounds,actual.remainingBounds,actual.totalLossBoundsByNode])if(Object.values(group).some(bound=>!Number.isFinite(bound.lower)||!Number.isFinite(bound.upper)||bound.lower<0||bound.lower>bound.upper))return null;
    const numbers:ClosedControlBudgetSettlement=actual;
    const summary:RootFeedbackControlSummary={status:'closed',version:numbers.version,iterations:numbers.iterations,epsilon:numbers.epsilon,maxIterations:numbers.maxIterations,controlFraction:numbers.controlFraction,maxLossFraction:numbers.maxLossFraction,lastL1Delta:numbers.lastL1Delta,lastL1DeltaUpperBound:numbers.lastL1DeltaUpperBound,theoreticalIterationErrorBound:numbers.theoreticalIterationErrorBound,contractionUpperBound:numbers.contractionUpperBound,roundoffBound:numbers.roundoffBound,iterationErrorBound:numbers.iterationErrorBound,roundoffErrorBound:numbers.roundoffErrorBound,errorBound:numbers.errorBound,residualL1UpperBound:numbers.residualL1UpperBound,coefficientValidation:{status:'accepted-by-pinned-kernel',kernelMethodId:input.resources.resourceIdentity.kernel.methodId,graphDigest:rootFeedbackCanonicalDigest(state.graph),certificateDigest:rootFeedbackCanonicalDigest(actual),nodeCount:actual.nodes.length,edgeCount:actual.fixedCoefficients.length,disabledEdgeIds:actual.disabledEdgeIds}};
    if(Object.entries(summary).some(([,value])=>typeof value==='number'&&(!Number.isFinite(value)||value<0)))return null;
    return summary;
  }catch{return null;}
}
/** The engine result must be from the facade's same fixed-facts run; IPC never supplies this input. */
export function evaluateRootFeedbackApplication(input:RootFeedbackApplicationInput):RootFeedbackApplicationGate {
  assertVerifiedRootFeedbackResources(input.resources);
  const controlSummary=validateNumericalCertificate(input);
  const inspection=inspectRootFeedbackApplication(input,controlSummary!==null);
  if(inspection.status==='blocked'){const gate=frozenJson(inspection);evaluatedGates.add(gate);return gate;}
  if(!controlSummary)throw new Error('ROOT_FEEDBACK_APPLICATION_UNRESOLVED: 数值认证缺失。');
  const birthFactsBinding={profile:{calendar:input.profile.calendar,birthDate:input.profile.birthDate,leapMonth:input.profile.leapMonth,birthTime:input.profile.birthTime,timeUnknown:input.profile.timeUnknown,timezone:input.profile.timezone,timeBasis:input.profile.timeBasis??'civil',birthLongitude:input.profile.birthLongitude??null},baziVersion:input.baseAnalysis.bazi.version,timeBasis:input.timeBasis,branch:{id:input.branch.id,kind:input.branch.kind,hypothetical:input.branch.hypothetical,actualInterval:input.branch.actualInterval,pillars:input.branch.pillars}};
  const projected=projectRootFeedbackApplicationCertificate(input,inspection,{resourceIdentity:input.resources.resourceIdentity,controlSummary,birthFactsBindingDigest:rootFeedbackCanonicalDigest(birthFactsBinding),engineResultDigest:rootFeedbackCanonicalDigest(input.engineResult),seasonalSourceReferenceDigest:rootFeedbackCanonicalDigest(inspection.selected.mainchainResult!.seasonal.sourceReference??null)});
  const certificate:RootFeedbackApplicationCertificate={...projected,digest:rootFeedbackCanonicalDigest(projected)};
  const gate=frozenJson<RootFeedbackApplicationGate>({status:'applicable',reasons:[],caseId:inspection.caseId,regimeId:inspection.regimeId,effectiveElements:inspection.effectiveElements,certificate});
  evaluatedGates.add(gate);return gate;
}
/** expectedGate is produced by the pinned saved-facts replay seam, never by the client. */
export function assertRootFeedbackApplicationCertificateMatches(saved:unknown,expectedGate:RootFeedbackApplicationGate):RootFeedbackApplicationCertificate {
  if(!evaluatedGates.has(expectedGate)||expectedGate.status!=='applicable')throw new Error('ROOT_FEEDBACK_CERTIFICATE_INVALID: 固定出生事实重算未通过应用门。');
  try{
    // Exact canonical equality checks own presence, every projected field and both digests.
    if(canonicalPlainJson(saved)!==canonicalPlainJson(expectedGate.certificate))throw new Error('mismatch');
  }catch{throw new Error('ROOT_FEEDBACK_CERTIFICATE_INVALID: 保存证书与固定版本完整重算结果不一致。');}
  return expectedGate.certificate;
}
/** Replays only supplied validated historical calendar facts; this function never invokes a current calendar resolver. */
export function verifyRootFeedbackApplicationCertificate(saved:unknown,input:RootFeedbackApplicationInput):RootFeedbackApplicationCertificate {
  assertVerifiedRootFeedbackResources(input.resources);
  const provenance=ROOT_FEEDBACK_ENGINE_PROVENANCE+';'+input.baseAnalysis.bazi.version+';'+input.timeBasis.methodId;
  const engineResult=analyzeChart145({id:input.branch.id,provenance,pillars:input.branch.pillars},{fromOutputMonthStem:input.entryPolicy==='month-stem-proposal'},[],input.branch.hypothetical);
  const gate=evaluateRootFeedbackApplication({...input,engineResult});
  return assertRootFeedbackApplicationCertificateMatches(saved,gate);
}
