import type {Carrier140} from '../../../shared/bazi-mainchain-method-types';
import type {CarrierFlowSettlement} from './settled-flows';
import {settleCarrierFlows} from './settled-flows';
import {difference,point,type NumericInterval} from './numeric-interval';
import rules from './rules/project-mainchain-1.2.0.json';
export interface ProtectionIdentity {rescuerIds:string[];wealthId:string;resourceId:string;dayId:string;interventionEdgeIds:string[];}
export interface ResourceProtection extends ProtectionIdentity {
 status:'effective-project-path'|'no-net-benefit'|'wrong-target'|'pending-input'|'pending-prerequisite';
 damageDelta:number|null;totalResourceLossDelta:number|null;dayContributionDelta:number|null;
 differenceBounds:{damage:NumericInterval;totalResourceLoss:NumericInterval;dayContribution:NumericInterval}|null;
 resourcePower:{value:number;bounds:NumericInterval}|null;
 blockedBy:string[];premises:{name:string;met:boolean;explanation:string}[];
 sourceQualification:'classical-object-and-order-only';sufficiency:'project-numerical-rule-only';
 controlDenominators:'frozen';generationRule:'same-recomputed-from-own-solution';
 counterfactual:{disabledEdgeIds:string[];status:string;iterations:number;errorBound:number|null;remaining:Record<string,number>|null;resourcePower:number|null;resourceDayContribution:number}|null;
}
const elements=rules.tables.elements,P=rules.parameters;
const index=(e:string)=>elements.indexOf(e),wealthOf=(e:string)=>elements[(index(e)+2)%5],resourceOf=(e:string)=>elements[(index(e)+4)%5];
const controlId=(source:string,target:string)=>'control:'+source+':'+target,generateId=(source:string,target:string)=>'generate:'+source+':'+target;
export function assessResourceProtection(full:CarrierFlowSettlement,without:CarrierFlowSettlement,identity:ProtectionIdentity,completeInput:boolean):ResourceProtection {
 const result:ResourceProtection={...identity,rescuerIds:[...identity.rescuerIds],interventionEdgeIds:[...identity.interventionEdgeIds],status:'pending-prerequisite',damageDelta:null,totalResourceLossDelta:null,dayContributionDelta:null,differenceBounds:null,resourcePower:null,blockedBy:[],premises:[],sourceQualification:'classical-object-and-order-only',sufficiency:'project-numerical-rule-only',controlDenominators:'frozen',generationRule:'same-recomputed-from-own-solution',counterfactual:null};
 const rows=full.carriers,wealth=rows.find(row=>row.id===identity.wealthId),resource=rows.find(row=>row.id===identity.resourceId),day=rows.find(row=>row.id===identity.dayId),rescuers=identity.rescuerIds.map(id=>rows.find(row=>row.id===id));
 const validEdges=identity.interventionEdgeIds.length>0&&identity.interventionEdgeIds.every(id=>{const edge=full.graph.edges.find(edge=>edge.id===id);return edge&&identity.rescuerIds.includes(edge.source)&&edge.target===identity.wealthId;});
 const correct=wealth&&resource&&day&&day.kind==='day-master'&&wealth.element===wealthOf(day.element)&&resource.element===resourceOf(day.element)&&rescuers.every(row=>row&&row.id!==day.id&&row.element===day.element)&&validEdges&&full.graph.edges.some(edge=>edge.source===wealth.id&&edge.target===resource.id&&edge.coefficient>0);
 if(!correct){result.status='wrong-target';result.blockedBy.push('指定比劫边未指向同一财，或该财未直接伤及同一印，或角色身份不符。');return result;}
 if(full.status!=='closed'||without.status!=='closed'||full.controlSettlement.status!=='closed'||without.controlSettlement.status!=='closed'){result.blockedBy.push('完整盘或指定干预的控制/生成分配尚未闭合。');return result;}
 if(JSON.stringify(full.graph)!==JSON.stringify(without.graph)){result.status='wrong-target';result.blockedBy.push('干预改变了原固定控制矩阵或容量。');return result;}
 const disabled=without.controlSettlement.lossByEdge.filter(edge=>edge.disabled).map(edge=>edge.id).sort();
 if(JSON.stringify(disabled)!==JSON.stringify([...identity.interventionEdgeIds].sort())){result.status='wrong-target';result.blockedBy.push('干预未仅关闭指定边。');return result;}
 const damageId=controlId(wealth.id,resource.id),deliveryId=generateId(resource.id,day.id),damage=full.flows.find(edge=>edge.id===damageId)?.amount??0,withoutDamage=without.flows.find(edge=>edge.id===damageId)?.amount??0,delivery=full.flows.find(edge=>edge.id===deliveryId)?.amount??0,withoutDelivery=without.flows.find(edge=>edge.id===deliveryId)?.amount??0;
 const fullLoss=full.controlSettlement.totalLossByNode![resource.id],withoutLoss=without.controlSettlement.totalLossByNode![resource.id];
 const deltas={damage:difference(without.bounds.flows[damageId]??point(0),full.bounds.flows[damageId]??point(0)),totalResourceLoss:difference(without.controlSettlement.totalLossBoundsByNode![resource.id],full.controlSettlement.totalLossBoundsByNode![resource.id]),dayContribution:difference(full.bounds.flows[deliveryId]??point(0),without.bounds.flows[deliveryId]??point(0))};
 result.damageDelta=withoutDamage-damage;result.totalResourceLossDelta=withoutLoss-fullLoss;result.dayContributionDelta=delivery-withoutDelivery;result.differenceBounds=deltas;result.resourcePower={value:resource.power,bounds:full.bounds.powers[resource.id]};
 result.counterfactual={disabledEdgeIds:disabled,status:without.status,iterations:without.controlSettlement.iterations,errorBound:without.controlSettlement.errorBound,remaining:without.controlSettlement.remaining,resourcePower:without.carriers.find(row=>row.id===resource.id)?.power??null,resourceDayContribution:withoutDelivery};
 result.premises=[{name:'指定财对同一印的伤害下降',met:deltas.damage.lower>0,explanation:'对照损伤减完整盘损伤；下界须大于零。'},{name:'该印全部受制量净下降',met:deltas.totalResourceLoss.lower>0,explanation:'包括其它攻击者的反馈，不能只看一条边。'},{name:'该印到同一日主的实际生成贡献增加',met:deltas.dayContribution.lower>0,explanation:'两解各按自身余量重算生成分配，包含分流净效。'},{name:'该印最终power达到既有可用量',met:result.resourcePower.bounds.lower>=P.usableMinimum,explanation:'以最终power区间核单载体可用门槛，非只看控制后remaining。'}];
 if(!completeInput){result.status='pending-input';result.blockedBy.push('缺时，仅已知三柱投影；未认证完整盘保护。');return result;}
 if([wealth,resource,day,...rescuers].some(row=>row&&(row.conversion||row.originalElement!==row.element))){result.blockedBy.push('参与载体被合化改变对象；原身份到作用角色的前提未闭合。');return result;}
 if(result.premises.every(item=>item.met)){result.status='effective-project-path';return result;}
 const resourceBoundary=result.resourcePower.bounds.lower<P.usableMinimum&&result.resourcePower.bounds.upper>=P.usableMinimum;
 const possiblePositiveUncertified=([['damage',result.damageDelta],['totalResourceLoss',result.totalResourceLossDelta],['dayContribution',result.dayContributionDelta]] as const).some(([key,value])=>value>0&&deltas[key].lower<=0);
 result.status=resourceBoundary||possiblePositiveUncertified?'pending-prerequisite':'no-net-benefit';for(const premise of result.premises.filter(item=>!item.met))result.blockedBy.push(premise.name+'未超数值误差界或未满足可用前提。');
 return result;
}
export function evaluateResourceProtections(full:CarrierFlowSettlement,completeInput:boolean):ResourceProtection[] {
 if(full.status!=='closed')return[];const rows=full.carriers,day=rows.find(row=>row.kind==='day-master');if(!day)return[];
 const peers=rows.filter(row=>row.id!==day.id&&row.element===day.element),wealths=rows.filter(row=>row.element===wealthOf(day.element)),resources=rows.filter(row=>row.element===resourceOf(day.element)),results:ResourceProtection[]=[];
 for(const rescuer of peers)for(const wealth of wealths){const edge=full.graph.edges.find(edge=>edge.id===controlId(rescuer.id,wealth.id)&&edge.coefficient>0);if(!edge)continue;
  const without=settleCarrierFlows(rows,full.graph,[edge.id]);
  for(const resource of resources){if(!full.graph.edges.some(edge=>edge.source===wealth.id&&edge.target===resource.id&&edge.coefficient>0))continue;results.push(assessResourceProtection(full,without,{rescuerIds:[rescuer.id],wealthId:wealth.id,resourceId:resource.id,dayId:day.id,interventionEdgeIds:[edge.id]},completeInput));}
 }
 return results;
}
