import type {RootFeedbackInput} from './root-feedback-types';
import {resolveRootFeedback} from './root-feedback';
import {settleRootCarrierFlows} from './settled-flows';
import type {CarrierFlowSettlement} from './settled-flows';
import {difference,point,nextDown,nextUp,type NumericInterval} from '../kernel-v12-fixed/numeric-interval';

export interface ConditionalRootProtection {
 regimeId:string;rescueEdgeId:string;rescuerId:string;attackerId:string;hiddenRootId:string;
 status:'effective-project-root-protection'|'no-certified-net-benefit'|'pending-fixed-regime';
 damageDelta:NumericInterval|null;totalRootLossDelta:NumericInterval|null;rootPowerDelta:NumericInterval|null;
 controlDenominators:'frozen-within-regime';generationRule:'same-recomputed-from-own-solution';
}
/** Enumerated feedback comparison plus separate fixed-regime causal certificates. */
export function compareRootInterventions145<TMainchain=unknown>(input:RootFeedbackInput,disabledControlEdgeIds:readonly string[],consume?:(state:CarrierFlowSettlement,id:string)=>TMainchain){
 const callbacks={settle:settleRootCarrierFlows,...(consume?{consume}:{})},full=resolveRootFeedback(input,callbacks),without=resolveRootFeedback(input,callbacks,{disabledControlEdgeIds}),certificates:ConditionalRootProtection[]=[];
 for(const regime of full.regimes.filter(item=>full.consistentIds.includes(item.id)||full.possibleIds.includes(item.id))){const state=regime.settlement;if(!state||state.status!=='closed')continue;
  const conditional=settleRootCarrierFlows(state.carriers,input.pathFactors,disabledControlEdgeIds);
  for(const edgeId of disabledControlEdgeIds){const rescuerEdge=state.graph.edges.find(edge=>edge.id===edgeId);if(!rescuerEdge)continue;
   for(const root of regime.rootIntervals.flatMap(item=>item.candidateIntervals).filter(item=>item.qualification==='accepted')){
    const damageId='control:'+rescuerEdge.target+':'+root.carrierId;if(!state.graph.edges.some(edge=>edge.id===damageId&&edge.coefficient>0))continue;
    const base:ConditionalRootProtection={regimeId:regime.id,rescueEdgeId:edgeId,rescuerId:rescuerEdge.source,attackerId:rescuerEdge.target,hiddenRootId:root.carrierId,status:'pending-fixed-regime',damageDelta:null,totalRootLossDelta:null,rootPowerDelta:null,controlDenominators:'frozen-within-regime',generationRule:'same-recomputed-from-own-solution'};
    if(disabledControlEdgeIds.length===1&&conditional.status==='closed'&&state.controlSettlement.status==='closed'&&conditional.controlSettlement.status==='closed'){
     base.damageDelta=difference(conditional.bounds.flows[damageId]??point(0),state.bounds.flows[damageId]??point(0));base.totalRootLossDelta=difference(conditional.controlSettlement.totalLossBoundsByNode[root.carrierId],state.controlSettlement.totalLossBoundsByNode[root.carrierId]);base.rootPowerDelta=difference(state.bounds.powers[root.carrierId],conditional.bounds.powers[root.carrierId]);base.status=[base.damageDelta,base.totalRootLossDelta,base.rootPowerDelta].every(delta=>delta.lower>0)?'effective-project-root-protection':'no-certified-net-benefit';
    }
    certificates.push(base);
   }
  }
 }
 const bothUnique=full.resolution==='unique-consistent-regime'&&without.resolution==='unique-consistent-regime',restorations:{element:string;fullRegimeId:string;withoutRegimeId:string;hiddenRootId:string;certificate:ConditionalRootProtection}[]=[];
 if(bothUnique){const a=full.regimes.find(item=>item.id===full.consistentIds[0])!,b=without.regimes.find(item=>item.id===without.consistentIds[0])!;
  for(const root of a.rootIntervals){const counterpart=b.rootIntervals.find(item=>item.element===root.element);if(root.value!=='true'||counterpart?.value!=='false')continue;
   for(const witness of root.witnessCarrierIds){const aBound=a.settlement!.bounds.powers[witness],bBound=b.settlement!.bounds.powers[witness];if(!aBound||!bBound||nextDown(aBound.lower+1e-9)<.5||nextUp(bBound.upper+1e-9)>=.5)continue;const cert=certificates.find(item=>item.regimeId===a.id&&item.hiddenRootId===witness&&item.status==='effective-project-root-protection');if(cert)restorations.push({element:root.element,fullRegimeId:a.id,withoutRegimeId:b.id,hiddenRootId:witness,certificate:cert});}
  }
 }
 return{scope:'fully-reenumerated-regime-set-intervention' as const,status:restorations.length?'definite-project-root-restoration' as const:bothUnique?'two-unique-regime-comparison' as const:'conditional-or-unresolved-regime-comparison' as const,disabledControlEdgeIds:[...disabledControlEdgeIds],full,without,conditionalCertificates:certificates,definiteRestoration:restorations.length>0,restorations,limitations:['条件干预证书固定同一态的C/A；重枚举比较则允许各态容量改变，二者分别保留。','双方多解、无解、待定时不任取最高或最低态拼确定恢复。','只认证项目模型内指定攻击者对同一藏根的净保护，不认证完整古典成格或杀印来源穿透。']};
}
