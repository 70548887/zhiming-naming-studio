import rules from './rules/project-mainchain-1.3.2.json';
import type {Carrier140,Flow140} from '../../../shared/bazi-mainchain-method-types';
import {settleControlBudget} from '../kernel-v12-fixed/control-budget';
import type {ControlBudgetEdge,ControlBudgetNode,ControlBudgetSettlement} from '../kernel-v12-fixed/control-budget-types';
import {add,divide,multiply,nextDown,nextUp,point,sumIntervals,type NumericInterval} from '../kernel-v12-fixed/numeric-interval';
const P=rules.parameters,elements=rules.tables.elements;
export interface FrozenCarrierGraph {nodes:ControlBudgetNode[];edges:ControlBudgetEdge[];coefficientPolicy:'outward-denominator/downward-coefficient';}
export interface CarrierFlowSettlement {
 status:'closed'|'unclosed';graph:FrozenCarrierGraph;controlSettlement:ControlBudgetSettlement;
 carriers:Carrier140[];flows:Flow140[];
 bounds:{powers:Record<string,NumericInterval>;flows:Record<string,NumericInterval>};
 issues:string[];
}
const controls=(element:string)=>elements[(elements.indexOf(element)+2)%5],next=(element:string)=>elements[(elements.indexOf(element)+1)%5];
export interface FrozenRootPath {source:string;target:string;factor:number;}
export function carrierPathFactor(source:Carrier140,target:Carrier140,paths:readonly FrozenRootPath[]):number {
 const matches=paths.filter(path=>path.source===source.id&&path.target===target.id);
 if(matches.length!==1||!Number.isFinite(matches[0].factor)||matches[0].factor<0)throw new Error('固定关系路径缺失、重复或无效：'+source.id+'→'+target.id);return matches[0].factor;
}

export function buildFrozenCarrierGraph(carriers:readonly Carrier140[],paths:readonly FrozenRootPath[]):FrozenCarrierGraph {
 const rows=[...carriers].sort((a,b)=>a.id.localeCompare(b.id)),edges:ControlBudgetEdge[]=[];
 for(const source of rows){const targets=rows.filter(target=>source.id!==target.id&&target.element===controls(source.element));
  const weighted=targets.map(target=>({target,path:carrierPathFactor(source,target,paths)}));
  const denominator=sumIntervals(weighted.map(item=>multiply(point(item.target.capacity),point(item.path))));
  if(denominator.upper===0)continue;
  for(const item of weighted){const weight=multiply(point(item.target.capacity),point(item.path));
   // Directed rounding fixes one representable matrix with exact column sum
   // at most the original .25 budget. It never redistributes a disabled edge.
   const coefficient=weight.upper===0?0:Math.max(0,nextDown(P.controlFraction*nextDown(weight.lower/denominator.upper)));
   edges.push({id:'control:'+source.id+':'+item.target.id,source:source.id,target:item.target.id,coefficient,pathFactor:item.path});
  }
 }
 return{nodes:rows.map(row=>({id:row.id,capacity:row.capacity})),edges,coefficientPolicy:'outward-denominator/downward-coefficient'};
}
export function settleRootCarrierFlows(carriers:readonly Carrier140[],paths:readonly FrozenRootPath[],disabledEdgeIds:readonly string[]=[]):CarrierFlowSettlement {
 const graph=buildFrozenCarrierGraph(carriers,paths);
 const rows=carriers.map(row=>({...row,incomingControl:0,generationIn:0,generationOut:0,power:0})),settlement=settleControlBudget(graph.nodes,graph.edges,disabledEdgeIds),result:CarrierFlowSettlement={status:'unclosed',graph,controlSettlement:settlement,carriers:rows,flows:[],bounds:{powers:{},flows:{}},issues:[]};
 if(settlement.status!=='closed'){result.issues.push(settlement.failureReason??'控制预算未闭合');return result;}
 const remaining=settlement.remaining!,remainingBounds=settlement.remainingBounds!,flows:Flow140[]=[],flowBounds:Record<string,NumericInterval>={};
 for(const row of rows)row.incomingControl=settlement.totalLossByNode![row.id];
 for(const edge of settlement.lossByEdge){const flow:Flow140={id:edge.id,source:edge.source,target:edge.target,kind:'control',pathFactor:edge.pathFactor??1,amount:edge.loss,ruleId:'control-settlement'};flows.push(flow);flowBounds[edge.id]={lower:edge.lossLowerBound,upper:edge.lossUpperBound};}
 const generationIn=new Map(rows.map(row=>[row.id,point(0)])),generationOut=new Map(rows.map(row=>[row.id,point(0)]));
 for(const source of [...rows].sort((a,b)=>a.id.localeCompare(b.id))){
  const targets=rows.filter(target=>target.id!==source.id&&target.element===next(source.element)).sort((a,b)=>a.id.localeCompare(b.id));
  const weighted=targets.map(target=>({target,path:carrierPathFactor(source,target,paths),value:remaining[target.id]*carrierPathFactor(source,target,paths),bounds:multiply(remainingBounds[target.id],point(carrierPathFactor(source,target,paths)))}));
  const total=weighted.reduce((sum,item)=>sum+item.value,0),denominator=sumIntervals(weighted.map(item=>item.bounds));
  if(denominator.upper===0)continue;
  if(!(denominator.lower>0)||!Number.isFinite(total)||!(total>0)){result.issues.push('生成分配分母区间含零而未证明无目标：'+source.id);return result;}
  for(const item of weighted){const amount=remaining[source.id]*P.generationFraction*item.value/total,bounds=multiply(multiply(remainingBounds[source.id],point(P.generationFraction)),divide(item.bounds,denominator));
   if(!Number.isFinite(amount)||!Number.isFinite(bounds.upper)){result.issues.push('生成分配出现非有限数：'+source.id);return result;}
   source.generationOut+=amount;item.target.generationIn+=amount;const id='generate:'+source.id+':'+item.target.id;
   flows.push({id,source:source.id,target:item.target.id,kind:'generate',pathFactor:item.path,amount,ruleId:'flow'});flowBounds[id]=bounds;generationIn.set(item.target.id,add(generationIn.get(item.target.id)!,bounds));generationOut.set(source.id,add(generationOut.get(source.id)!,bounds));
  }
 }
 for(const row of rows){row.power=remaining[row.id]-row.generationOut+row.generationIn;
  // Include the outward sum/subtraction of actual outgoing allocations; no
  // display rounding or ideal conservation identity replaces arithmetic error.
  const out=generationOut.get(row.id)!,retained={lower:Math.max(0,nextDown(remainingBounds[row.id].lower-out.upper)),upper:Math.max(0,nextUp(remainingBounds[row.id].upper-out.lower))};
  result.bounds.powers[row.id]=add(retained,generationIn.get(row.id)!);
 }
 const day=rows.find(row=>row.kind==='day-master');
 if(day)for(const source of rows.filter(row=>row.id!==day.id&&row.element===day.element)){const path=carrierPathFactor(source,day,paths),id='assist:'+source.id,amount=source.power*P.assistFraction*path;flows.push({id,source:source.id,target:day.id,kind:'assist',pathFactor:path,amount,ruleId:'flow'});flowBounds[id]=multiply(multiply(result.bounds.powers[source.id],point(P.assistFraction)),point(path));}
 result.status='closed';result.flows=flows;result.bounds.flows=flowBounds;return result;
}
