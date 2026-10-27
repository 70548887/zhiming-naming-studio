import {createHash} from 'node:crypto';
import type {Analysis,BirthProfile,Element} from '../shared/types';
import {canonicalPlainJson} from '../shared/plain-json';
import type {Relation140} from '../shared/bazi-mainchain-method-types';
import type {ClosedControlBudgetSettlement} from '../domain/bazi-mainchain/kernel-v12-fixed/control-budget-types';
import {settleControlBudget} from '../domain/bazi-mainchain/kernel-v12-fixed/control-budget';
import type {analyzeChart145} from '../domain/bazi-mainchain/project-v132';
import type {ProjectApplicationElements,ProjectApplicationReason} from '../shared/project-application-v132';

type RootV132=ReturnType<typeof analyzeChart145>;
type ElementOrder=readonly Element[];
const ELEMENTS:ElementOrder=['木','火','土','金','水'];
const addReason=(reasons:ProjectApplicationReason[],code:string,message:string)=>{if(!reasons.some(item=>item.code===code&&item.message===message))reasons.push({code,message});};
const finite=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value);
const finiteInterval=(value:unknown):value is {lower:number;upper:number}=>!!value&&typeof value==='object'&&finite((value as {lower?:unknown}).lower)&&finite((value as {upper?:unknown}).upper)&&(value as {lower:number;upper:number}).lower>=0&&(value as {lower:number;upper:number}).lower<=(value as {lower:number;upper:number}).upper;
const digest=(value:unknown)=>createHash('sha256').update(canonicalPlainJson(value)).digest('hex');

function pending(reasons:ProjectApplicationReason[],code:string,message:string){addReason(reasons,code,message);}
function blocked(reasons:ProjectApplicationReason[],code:string,message:string){addReason(reasons,code,message);}
function allFiniteBounds(value:unknown):boolean {
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 return Object.values(value).every(finiteInterval);
}
function sameCanonical(left:unknown,right:unknown):boolean {
 try{return canonicalPlainJson(left)===canonicalPlainJson(right);}catch{return false;}
}
function regularBranch(branch:unknown):branch is 'regular-weak'|'regular-strong'|'regular-balanced' {
 return branch==='regular-weak'||branch==='regular-strong'||branch==='regular-balanced';
}
function transformedRelation(relation:Relation140):boolean {
 return (relation.kind==='stem-combination'||relation.kind==='sanhe'||relation.kind==='sanhui')&&relation.status==='applied';
}
function projectElements(main:any):ProjectApplicationElements {
 const primary=[...new Set(main.uses.filter((use:any)=>use.role==='primary').map((use:any)=>use.element))] as Element[];
 const secondary=[...new Set(main.uses.filter((use:any)=>use.role==='secondary').map((use:any)=>use.element))] as Element[];
 const avoid=[...new Set(main.uses.filter((use:any)=>use.role==='avoid').map((use:any)=>use.element))] as Element[];
 const applied=ELEMENTS.filter(element=>primary.includes(element)||secondary.includes(element));
 return{primary,secondary,avoid,applied};
}
function validateBirth(profile:BirthProfile,base:Analysis,reasons:ProjectApplicationReason[]):void {
 const time=base.bazi.timeBasis;
 if(profile.timeUnknown)pending(reasons,'birth-input-pending','出生小时未知，不能形成完整固定盘。');
 if(!time||time.dayStatus!=='determined'||!time.actualUtc||!time.calculationDateTime||time.dayCandidates.length!==1)pending(reasons,'birth-input-pending','出生时间基线未唯一确定。');
 if(base.bazi.pillars.length!==4)pending(reasons,'birth-input-pending','基础八字未包含四个确定柱。');
 if(base.bazi.evidence?.timeBasis?.ambiguous===true)blocked(reasons,'calendar-ambiguous','基础时间证据标记为 ambiguous，禁止项目应用。');
}
function validatePreparation(root:any,reasons:ProjectApplicationReason[]):void {
 const prep=root.preparation;
 if(!prep||prep.scope!=='complete-known-pillars')pending(reasons,'preparation-pending','准备证据未达到完整已知四柱。');
 if(!prep||!Array.isArray(prep.trace)||prep.trace.length===0)pending(reasons,'preparation-evidence-missing','准备 trace 缺失。');
 if(!prep||!Array.isArray(prep.sourceIds)||prep.sourceIds.length===0)pending(reasons,'preparation-evidence-missing','准备来源身份缺失。');
 if(prep?.pending?.length)pending(reasons,'preparation-pending','准备阶段仍有未决前提：'+prep.pending.join('；'));
}
function validateRoot(root:any,reasons:ProjectApplicationReason[]):any|null {
 if(root.resolution==='multiple-consistent-regimes')pending(reasons,'multiple-regimes','根反馈保留多个一致机制。');
 if(root.resolution==='no-consistent-regime'||root.consistentIds.length===0)pending(reasons,'no-consistent-regime','根反馈没有可采用的一致机制。');
 if(root.resolution!=='unique-consistent-regime'||root.consistentIds.length!==1||root.possibleIds.length!==0)pending(reasons,'root-pending','根反馈尚未形成唯一完整机制。');
 if(root.pending.length)pending(reasons,'root-pending','根反馈仍有未决前提：'+root.pending.join('；'));
 const selected=root.regimes.filter((regime:any)=>regime.id===root.consistentIds[0]);
 if(selected.length!==1)return null;
 const regime=selected[0];
 if(regime.consistency!=='consistent'||regime.pending.length||regime.inconsistencyReasons.length)pending(reasons,'root-pending','选中根机制仍有不一致或待决信息。');
 if(regime.rootAssumptions.length!==root.variables.length||regime.rootIntervals.length!==root.variables.length)pending(reasons,'root-pending','根容量假设与根谓词数量不一致。');
 for(const interval of regime.rootIntervals){
  if(interval.value==='unknown'||interval.value!==(interval.assumedRooted?'true':'false')||!interval.candidateSetComplete)pending(reasons,'root-pending','根谓词仍未知或与假设不一致。');
  if(interval.candidateIntervals.some((candidate:any)=>candidate.qualification==='pending-prerequisite'||candidate.interval!==null&&!finiteInterval(candidate.interval)))pending(reasons,'root-pending','根候选仍有未满足转换资格或无效数值区间。');
 }
 return regime;
}
function validateFormation(root:any,regime:any,reasons:ProjectApplicationReason[]):void {
 const prepRelations=(root.preparation?.relations??[]) as Relation140[];
 if(prepRelations.some(transformedRelation))blocked(reasons,'unsupported-formation','1.3.2 candidate policy does not admit applied stem-combination/sanhe/sanhui transformations.');
 if((regime?.settlement?.carriers??[]).some((carrier:any)=>carrier.conversion!==undefined))blocked(reasons,'unsupported-formation','Carrier conversion is not admitted by the 1.3.2 application policy.');
 if(regime?.mainchainResult?.branch==='hua'||String(regime?.mainchainResult?.branch??'').startsWith('cong-'))blocked(reasons,'unsupported-formation','cong/hua project branches remain outside the application policy.');
}
function validateNumerical(regime:any,reasons:ProjectApplicationReason[]):{summary:{iterations:number;errorBound:number;residualL1UpperBound:number;certificateDigest:string}|null;closed:ClosedControlBudgetSettlement|null} {
 const state=regime.settlement,actual=state?.controlSettlement;
 if(!state||state.status!=='closed'||!actual||actual.status!=='closed'){pending(reasons,'control-unsettled','固定数值内核未闭合。');return{closed:null,summary:null};}
 if(!state.graph||state.graph.coefficientPolicy!=='outward-denominator/downward-coefficient'){pending(reasons,'control-unsettled','控制图系数策略不匹配。');return{closed:null,summary:null};}
 let expected:ClosedControlBudgetSettlement;
 try{const checked=settleControlBudget(state.graph.nodes,state.graph.edges,[]);if(checked.status!=='closed'){pending(reasons,'control-unsettled','固定内核重算未闭合。');return{closed:null,summary:null};}expected=checked;}catch{pending(reasons,'control-unsettled','固定内核重算失败。');return{closed:null,summary:null};}
 if(!sameCanonical(expected,actual)||!sameCanonical(expected,regime.controlSettlement)||!sameCanonical(expected,regime.mainchainResult?.controlSettlement))pending(reasons,'control-certificate-mismatch','固定内核重算证书与结果不完全一致。');
 if(actual.maxIterations!==64||actual.epsilon!==1e-9||actual.controlFraction!==.25||actual.maxLossFraction!==.8||actual.disabledEdgeIds.length!==0||actual.issues.length!==0)pending(reasons,'control-certificate-mismatch','固定内核参数或证书问题不匹配。');
 if(!finite(actual.errorBound)||!finite(actual.residualL1UpperBound)||actual.errorBound>actual.epsilon||actual.residualL1UpperBound>actual.epsilon)pending(reasons,'control-unsettled','数值误差界或残差界未闭合。');
 if(!allFiniteBounds(state.bounds?.powers)||!allFiniteBounds(state.bounds?.flows)||!allFiniteBounds(actual.remainingBounds)||!allFiniteBounds(actual.totalLossBoundsByNode)||!allFiniteBounds(regime.generation?.bounds))pending(reasons,'control-unsettled','数值结果含无效或负区间。');
 return{closed:actual,summary:{iterations:actual.iterations,errorBound:actual.errorBound,residualL1UpperBound:actual.residualL1UpperBound,certificateDigest:digest(actual)}};
}

export function inspectProjectApplicationV132(input:{profile:BirthProfile;baseAnalysis:Analysis;root:RootV132;entryPolicy:'month-branch-only'}):{status:'eligible'|'pending'|'blocked';reasons:{code:string;message:string}[];effectiveElements?:ProjectApplicationElements;numericalSummary?:{iterations:number;errorBound:number;residualL1UpperBound:number;certificateDigest:string}} {
 const reasons:ProjectApplicationReason[]=[];
 if(input.entryPolicy!=='month-branch-only')blocked(reasons,'entry-policy-unsupported','Only month-branch-only is admitted by candidate policy.');
 validateBirth(input.profile,input.baseAnalysis,reasons);
 const root:any=input.root;validatePreparation(root,reasons);
 const regime=validateRoot(root,reasons);
 validateFormation(root,regime,reasons);
 if(!regime){
  const blockedStatus=reasons.some(item=>item.code==='unsupported-formation'||item.code==='entry-policy-unsupported'||item.code==='calendar-ambiguous');
  return{status:blockedStatus?'blocked':'pending',reasons};
 }
 const main=regime.mainchainResult;
 if(!main||main.status!=='settled'||main.coverage!=='complete'||main.hypothetical!==false)pending(reasons,'consumer-pending','完整项目消费者缺失或不完整。');
 if(main?.caseId!==root.caseId||main?.methodId!=='project-bazi-mainchain-145/1.3.2'||main?.entryPolicy!=='month-branch-only')pending(reasons,'identity-pending','主链结果与当前根结果未绑定。');
 if(main&& !regularBranch(main.branch))blocked(reasons,'unsupported-formation','Only regular weak/strong/balanced branches are admitted.');
 if(main?.decisionStatus!=='resolved-by-project-rules'||main?.missing?.length||main?.alternativeUses?.length)pending(reasons,'consumer-pending','主链仍有缺失、条件方案或未裁决替代。');
 if(main?.numericReview?.status!=='separated-from-thresholds'||main?.numericReview?.affectedPredicates?.length)pending(reasons,'numeric-threshold-pending','主链数值门槛仍有相邻判断。');
 const numerical=validateNumerical(regime,reasons);
 const elements=main?projectElements(main):null;
 if(elements){
  if(!elements.primary.length)pending(reasons,'missing-primary-use','主用为空。');
  if([...elements.primary,...elements.secondary].some(element=>elements.avoid.includes(element)))blocked(reasons,'contradictory-uses','主辅与忌用相交。');
  if(elements.primary.some(element=>!ELEMENTS.includes(element))||elements.secondary.some(element=>!ELEMENTS.includes(element))||elements.avoid.some(element=>!ELEMENTS.includes(element)))blocked(reasons,'invalid-elements','主辅忌用含无效五行。');
 }
 const blockedStatus=reasons.some(item=>item.code==='unsupported-formation'||item.code==='entry-policy-unsupported'||item.code==='calendar-ambiguous'||item.code==='contradictory-uses'||item.code==='invalid-elements');
 if(blockedStatus)return{status:'blocked',reasons};
 if(reasons.length||!elements||!numerical.summary)return{status:'pending',reasons};
 return{status:'eligible',reasons:[],effectiveElements:elements,numericalSummary:numerical.summary};
}
