import {ROOT_FEEDBACK_PREVIEW_VERSION} from '../../../shared/bazi-root-feedback-v132';
import type {RootFeedbackCertificateSummary,RootFeedbackExplanationChain,RootFeedbackExplanationStep,RootFeedbackPreviewDTO,RootFeedbackOpinion,RootFeedbackPreparationEvidence,RootFeedbackProjectStatus} from '../../../shared/bazi-root-feedback-v132';
import type {analyzeChart145} from './index';
import type {CarrierFlowSettlement} from './settled-flows';

type AnyCertificate={status?:unknown;failureReason?:unknown;epsilon?:unknown;maxIterations?:unknown;controlFraction?:unknown;maxLossFraction?:unknown;iterations?:unknown;lastL1Delta?:unknown;lastL1DeltaUpperBound?:unknown;contractionUpperBound?:unknown;errorBound?:unknown;residualL1UpperBound?:unknown;columnSums?:unknown;disabledEdgeIds?:unknown;issues?:unknown};
const finiteOrNull=(value:unknown):number|null=>typeof value==='number'&&Number.isFinite(value)?value:null;
function certificateSummary(value:unknown):RootFeedbackCertificateSummary {
 const candidate=(value&&typeof value==='object'?value:null) as AnyCertificate|null;
 const status=candidate?.status==='closed'||candidate?.status==='unclosed'?candidate.status:'unavailable';
 const failureReason=candidate?.failureReason==='invalid-graph'||candidate?.failureReason==='non-finite'||candidate?.failureReason==='not-converged'||candidate?.failureReason==='uncertified-roundoff'?candidate.failureReason:null;
 const columnSums=candidate?.columnSums&&typeof candidate.columnSums==='object'&&!Array.isArray(candidate.columnSums)?Object.fromEntries(Object.entries(candidate.columnSums).filter(entry=>typeof entry[1]==='number'&&Number.isFinite(entry[1]))):{};
 const disabledEdgeIds=Array.isArray(candidate?.disabledEdgeIds)?candidate!.disabledEdgeIds.filter((value):value is string=>typeof value==='string'):[];
 return{status,failureReason,epsilon:finiteOrNull(candidate?.epsilon),maxIterations:finiteOrNull(candidate?.maxIterations),controlFraction:finiteOrNull(candidate?.controlFraction),maxLossFraction:finiteOrNull(candidate?.maxLossFraction),iterations:finiteOrNull(candidate?.iterations),lastL1Delta:finiteOrNull(candidate?.lastL1Delta),lastL1DeltaUpperBound:finiteOrNull(candidate?.lastL1DeltaUpperBound),contractionUpperBound:finiteOrNull(candidate?.contractionUpperBound),errorBound:finiteOrNull(candidate?.errorBound),residualL1UpperBound:finiteOrNull(candidate?.residualL1UpperBound),columnSums,disabledEdgeIds,issues:Array.isArray(candidate?.issues)?candidate!.issues.filter((item):item is {message?:unknown}=>!!item&&typeof item==='object').map(item=>typeof item.message==='string'?item.message:JSON.stringify(item)):[]};
}
function explanationChain(result:ReturnType<typeof analyzeChart145>,certificates:RootFeedbackCertificateSummary[]):RootFeedbackExplanationChain {
 const mainResults=result.regimes.flatMap(regime=>regime.mainchainResult?[regime.mainchainResult]:[]);
 const preparation=result.preparation,preparedTraces=preparation.trace;
 const traces=[...preparedTraces,...mainResults.flatMap(main=>main.trace)];
 const ruleIds=[...new Set([...preparation.ruleIds,...traces.map(trace=>trace.ruleId),...mainResults.flatMap(main=>main.calculationTrace.relations.map(relation=>relation.ruleId))])].sort();
 const sourceIds=[...new Set(traces.flatMap(trace=>trace.sourceIds))].sort();
 const relationStatuses=preparation.relations.map(relation=>`${relation.id}:${relation.status}`);
 const numericClosed=certificates.length>0&&certificates.every(certificate=>certificate.status==='closed');
 const consumerPending=result.regimes.filter(regime=>regime.consistency!=='inconsistent'&&regime.mainchainResult===null);
 const preparationIncomplete=preparation.scope==='known-pillars-only';
 const relationPrerequisitesMet=preparation.relations.length>0&&preparation.relations.every(relation=>relation.status==='applied'&&relation.premises.length>0&&relation.premises.every(premise=>premise.met));
 const relationStatus:RootFeedbackProjectStatus=!numericClosed||consumerPending.length>0?'pending':preparationIncomplete?'partial-known-only':preparation.pending.length?'pending':relationPrerequisitesMet?'closed':'observed';
 const relationUnknown=[
  '合冲或五合出现只表示项目关系事实/前提；不自动推出经典合化、从格或喜用。',
  ...preparation.pending,
  ...(!numericClosed?['数值内核未闭合；保留准备阶段关系与前提，不认证其数值净作用。']:[]),
  ...(consumerPending.length?['保留机制的主链消费者尚未完成；关系依据不依赖消费者成功。',...consumerPending.flatMap(regime=>regime.pending)]:[]),
  ...preparation.relations.flatMap(relation=>relation.premises.filter(premise=>!premise.met).map(premise=>`${relation.id}：${premise.name}未满足；${premise.detail}`)),
 ];
 const projectOpinionClosed=mainResults.length>0&&mainResults.every(main=>main.decisionStatus==='resolved-by-project-rules'&&main.numericReview.status==='separated-from-thresholds'&&main.alternativeUses.length===0);
 const projectStatus=result.scope==='known-pillars-only'?'unknown-chart':result.resolution==='unique-consistent-regime'&&numericClosed&&projectOpinionClosed&&result.pending.length===0?'projected-only':'unknown';
 const residualGaps=[...new Set([...mainResults.flatMap(main=>main.limitations),'项目数值规则属于 project-proposal；不把它解释为经典充分条件。','完整传统用神、从格成立与破格、合化充分条件仍未闭合。'])];
 const steps:RootFeedbackExplanationStep[]=[
  {id:'chart-facts',truthLayer:'chart-fact',traditionalStatus:'unknown',projectStatus:'observed',ruleIds:[...new Set(preparedTraces.filter(trace=>trace.step<=2).map(trace=>trace.ruleId))],sourceIds:[...new Set(preparedTraces.filter(trace=>trace.step<=2).flatMap(trace=>trace.sourceIds))],assumptions:['只消费已验证出生盘与明确四柱；未知时柱不补代表时刻。'],unknownReason:result.scope==='known-pillars-only'?['出生盘不完整；完整传统有效作用保持未知。']:[]},
  {id:'relations-and-transformations',truthLayer:'project-rule',traditionalStatus:'unknown',projectStatus:relationStatus,ruleIds:[...preparation.ruleIds],sourceIds:[...preparation.sourceIds],assumptions:relationStatuses,unknownReason:[...new Set(relationUnknown)]},
  {id:'fixed-inner-loop',truthLayer:'numeric-certificate',traditionalStatus:'unknown',projectStatus:numericClosed?'closed':'unknown',ruleIds:['fixed-control-budget'],sourceIds:['project-bazi-mainchain-144'],assumptions:['同步固定图、原控制分母、禁用边只置零、不重新分配。'],unknownReason:certificates.flatMap(certificate=>certificate.issues),numericCertificates:certificates},
  {id:'formation-boundary',truthLayer:'traditional-boundary',traditionalStatus:'unknown',projectStatus:'not-evaluated',ruleIds:ruleIds.filter(id=>id.includes('cong')||id.includes('transform')||id.includes('hua')),sourceIds,assumptions:['从格与合化边界只保留项目分支和缺失前提。'],unknownReason:['未取得完整同流派从格成立、破格、合化充分条件与反例闭合；不把项目规则说成经典定论。']},
  {id:'project-opinion',truthLayer:'project-opinion',traditionalStatus:'unknown',projectStatus,ruleIds,sourceIds,assumptions:['项目意见只对已保留的一致/可能机制负责。'],unknownReason:[...result.pending,...(result.resolution==='unique-consistent-regime'?[]:['多解、无解或待定状态不拼接成单一结论。'])]},
 ];
 return{schema:'bazi-root-feedback-explanation/1.0.0',traditionalStatus:'insufficient-source',projectStatus,steps,residualGaps};
}
function preparationProjection(value:RootFeedbackPreparationEvidence):RootFeedbackPreparationEvidence {
 const copy=structuredClone(value);
 const freeze=(item:unknown):void=>{if(item&&typeof item==='object'&&!Object.isFrozen(item)){Object.values(item).forEach(freeze);Object.freeze(item);}};
 freeze(copy);return copy;
}
/** A shared DTO projection, not a new choice of regime or favorable element. */
export function toRootFeedbackPreviewDTO(result:ReturnType<typeof analyzeChart145>):RootFeedbackPreviewDTO {
 const certificates=result.regimes.map(regime=>certificateSummary((regime.settlement as CarrierFlowSettlement|null)?.controlSettlement));
 return{schema:ROOT_FEEDBACK_PREVIEW_VERSION,methodId:'project-bazi-mainchain-145/1.3.2',profileId:result.caseId,hypothetical:result.hypothetical,scope:result.scope,resolution:result.resolution,entryPolicy:result.entryPolicy,
  facts:result.facts.map(fact=>({id:fact.carrierId,originalElement:fact.originalElement,workingElement:fact.workingElement,conversion:fact.conversion??null,hiddenOrder:fact.hiddenOrder,originalSupportIds:[...fact.supportedOriginalCarrierIds]})),
  variables:result.variables.map(variable=>({id:variable.id,element:variable.element,carrierIds:[...variable.carrierIds],fallbackFactor:variable.fallbackFactor})),
  regimes:result.regimes.map((regime,index)=>{const main=regime.mainchainResult,certificate=certificates[index];
   const opinion:RootFeedbackOpinion|null=main?{regimeId:regime.id,methodId:main.methodId,hypothetical:main.hypothetical,strength:main.strength,branch:main.branch,primary:main.uses.filter(use=>use.role==='primary').map(use=>use.element),secondary:main.uses.filter(use=>use.role==='secondary').map(use=>use.element),avoid:main.uses.filter(use=>use.role==='avoid').map(use=>use.element),uses:structuredClone(main.uses),alternatives:structuredClone(main.alternativeUses),summary:[...main.summary],pending:[...main.missing]}:null;
   return{id:regime.id,consistency:regime.consistency,assumptions:regime.rootAssumptions.map(item=>({element:item.element,rooted:item.rooted,carrierIds:[...item.carrierIds]})),capacities:regime.capacities.map(item=>({id:item.carrierId,capacity:item.capacity,rootFactor:item.rootFactor})),roots:regime.rootIntervals.map(root=>({element:root.element,value:root.value,witnessIds:[...root.witnessCarrierIds],reasons:[...root.reasons],candidates:root.candidateIntervals.map(candidate=>({id:candidate.carrierId,lower:candidate.interval?.lower??null,upper:candidate.interval?.upper??null,qualification:candidate.qualification}))})),opinion,certificate,pending:[...regime.pending,...regime.inconsistencyReasons]};}),
  consistentIds:[...result.consistentIds],possibleIds:[...result.possibleIds],commonOpinion:structuredClone(result.commonOpinion),conflicts:structuredClone(result.conflicts),pending:[...result.pending],limitations:['外层只处理固定关系和转换资格下的有限根机制，不证明任意盘必有唯一解。','全部多解/无解/可能态均保留；明干有印源不会变成原藏根事实。','当前结果属于项目取法，不认证完整传统用神或杀印来源穿透。'],preparation:preparationProjection(result.preparation),explanationChain:explanationChain(result,certificates),detail:structuredClone(result)};
}
