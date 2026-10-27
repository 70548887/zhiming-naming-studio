import type {ChartCase140,MethodInput140,MethodPolicy140,Element140} from '../../../shared/bazi-mainchain-method-types';
import type {SettledChartResult145} from './types-v13-consumers';
import type {CarrierFlowSettlement} from './settled-flows';
import {prepareRootInput145,consumeRootRegime145,METHOD_145} from './consumers';
import {resolveRootFeedback} from './root-feedback';
import {settleRootCarrierFlows} from './settled-flows';
import type {RootFeedbackResult} from './root-feedback-types';
import {compareRootInterventions145} from './intervention';
export {prepareRootInput145,consumeRootRegime145,METHOD_145,resolveRootFeedback,settleRootCarrierFlows};
export {compareRootInterventions145};
export {toRootFeedbackPreviewDTO} from './presentation';
export type * from './root-feedback-types';

const elements:Element140[]=['木','火','土','金','水'];
function opinions(items:{id:string;result:SettledChartResult145}[],canCertifyAll:boolean){
 const favors=items.map(item=>new Set(item.result.uses.filter(use=>use.role!=='avoid').map(use=>use.element))),common=elements.filter(element=>favors.length&&favors.every(values=>values.has(element))),primary=elements.filter(element=>items.length&&items.every(item=>item.result.uses.some(use=>use.role==='primary'&&use.element===element)));
 const conflicts=elements.flatMap(element=>{const favorableIn=items.filter((item,index)=>favors[index].has(element)).map(item=>item.id),avoidIn=items.filter(item=>item.result.uses.some(use=>use.role==='avoid'&&use.element===element)).map(item=>item.id);return favorableIn.length&&avoidIn.length?[{element,favorableIn,avoidIn}]:[];});
 return{commonOpinion:{status:!items.length?'unavailable' as const:canCertifyAll?'all-retained-regimes' as const:'known-opinions-only' as const,primary:canCertifyAll?primary:[],favorable:canCertifyAll?common:[],knownOpinionIntersection:common},conflicts};
}
export function aggregateRootRegimeOpinions145(resolved:RootFeedbackResult<CarrierFlowSettlement,SettledChartResult145>,complete:boolean){
 const retained=resolved.regimes.filter(regime=>resolved.consistentIds.includes(regime.id)||resolved.possibleIds.includes(regime.id));
 const computed=retained.filter(regime=>regime.mainchainResult!==null).map(regime=>({id:regime.id,result:regime.mainchainResult!}));
 const consumerPending=retained.flatMap(regime=>{const result=regime.mainchainResult;if(!result)return[regime.id+'：该保留机制尚无可用取用消费者意见。'];const issues=[...result.missing];if(result.decisionStatus!=='resolved-by-project-rules')issues.push('取用仍为具体条件化方案，尚未确定主辅用。');if(result.numericReview.status!=='separated-from-thresholds')issues.push('取用数值门槛仍有相邻判断。');if(result.alternativeUses.length)issues.push('取用包含未裁决的条件方案：'+result.alternativeUses.map(item=>item.id).join('、'));return [...new Set(issues)].map(issue=>regime.id+'：'+issue);});
 const pending=[...new Set([...resolved.pending,...consumerPending])];
 const allCertain=complete&&resolved.possibleIds.length===0&&resolved.consistentIds.length>0&&computed.length===retained.length&&pending.length===0&&resolved.resolution!=='pending-regime-resolution';
 return{...opinions(computed,allCertain),pending};
}
/** New version only; no dispatch from the old1.1/1.2 entry points. */
export function analyzeChart145(chart:ChartCase140,policy:MethodPolicy140={},disabledControlEdgeIds:readonly string[]=[],hypothetical=false){
 const prepared=prepareRootInput145(chart,policy,hypothetical);
 const resolved=resolveRootFeedback<CarrierFlowSettlement,SettledChartResult145>(prepared.input,{settle:(carriers,paths,disabled)=>settleRootCarrierFlows(carriers,paths,disabled),consume:(state,id)=>consumeRootRegime145(prepared,state,id,hypothetical)},{disabledControlEdgeIds});
 return{...resolved,schema:'bazi-root-feedback-result/1.3' as const,methodId:METHOD_145,caseId:chart.id,hypothetical,entryPolicy:policy.fromOutputMonthStem?'month-stem-proposal' as const:'month-branch-only' as const,...aggregateRootRegimeOpinions145(resolved,chart.pillars.hour!==null),relationshipBoundary:'adopted-relations-and-transformation-qualification-frozen' as const};
}
export function analyzeMethod145(input:MethodInput140,policy:MethodPolicy140={}){
 if(input?.schema!=='bazi-method-input/1'||!['none','missing-hour','cross-day'].includes(input.uncertainty)||!Array.isArray(input.chartCases)||input.chartCases.length<1||input.chartCases.length>8)throw new Error('1.3输入须保留一至八个明确历法方案。');
 if(input.uncertainty==='none'&&(input.chartCases.length!==1||!input.chartCases[0].pillars.hour))throw new Error('确定出生须有唯一完整盘。');
 if(input.uncertainty==='missing-hour'&&(input.chartCases.length!==1||input.chartCases[0].pillars.hour!==null))throw new Error('缺时输入须保留一个已知三柱盘。');
 if(input.uncertainty==='cross-day'&&(input.chartCases.length<2||new Set(input.chartCases.map(chart=>chart.pillars.day.gan+chart.pillars.day.zhi)).size<2))throw new Error('跨日输入须保留不同日柱。');
 const results=input.chartCases.flatMap(chart=>{
  const baseline={...analyzeChart145(chart,policy),hypothetical:false};
  if(!chart.hourCandidates)return[baseline];
  if(chart.pillars.hour!==null||chart.hourCandidates.length<1||chart.hourCandidates.length>12||new Set(chart.hourCandidates.map(p=>p.gan+p.zhi)).size!==chart.hourCandidates.length)throw new Error('小时备选须属于缺时盘，最多十二个互异已声明时柱。');
  return[baseline,...chart.hourCandidates.map((hour,index)=>analyzeChart145({...chart,id:chart.id+':hour-hypothesis:'+index,pillars:{...chart.pillars,hour},hourCandidates:undefined},policy,[],true))];
 });
 const hasPending=results.some(result=>result.resolution==='pending-regime-resolution'),hasNone=results.some(result=>result.resolution==='no-consistent-regime');
 const computed=results.flatMap(result=>result.regimes.filter(regime=>result.consistentIds.includes(regime.id)||result.possibleIds.includes(regime.id)).filter(regime=>regime.mainchainResult!==null).map(regime=>({id:result.caseId+':'+regime.id,result:regime.mainchainResult!})));
 return{schema:'bazi-root-feedback-method/1.3' as const,methodId:METHOD_145,entryPolicy:policy.fromOutputMonthStem?'month-stem-proposal' as const:'month-branch-only' as const,uncertainty:input.uncertainty,results,includedCaseIds:results.map(result=>result.caseId),...opinions(computed,!hasPending&&!hasNone&&input.uncertainty==='none'&&results.every(result=>result.commonOpinion.status==='all-retained-regimes')),pending:results.flatMap(result=>result.pending.map(reason=>result.caseId+'：'+reason)),limitations:['只枚举固定关系下的有限根容量机制，不认证数学上总有唯一解。','缺时、无解或可能态保留，不以完整日期的一组解过滤其它记录。','旧方法输出独立保留；不重写原喜用或评分。']};
}
/** Re-enumerated feedback is distinct from a conditional fixed-regime delta. */
export function compareRootFeedbackIntervention145(chart:ChartCase140,disabledControlEdgeIds:readonly string[],policy:MethodPolicy140={}){
 const prepared=prepareRootInput145(chart,policy);return compareRootInterventions145(prepared.input,disabledControlEdgeIds,(state,id)=>consumeRootRegime145(prepared,state,id));
}
