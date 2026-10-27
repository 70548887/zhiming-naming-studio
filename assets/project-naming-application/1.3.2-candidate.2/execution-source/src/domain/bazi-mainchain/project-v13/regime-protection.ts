import type {CarrierFlowSettlement,FrozenRootPath} from './settled-flows';
import {settleRootCarrierFlows} from './settled-flows';
import {assessResourceProtection} from '../kernel-v12-fixed/resource-protection';
import type {ResourceProtection} from '../kernel-v12-fixed/resource-protection';
import rules from './rules/project-mainchain-1.3.1.json';
const es=rules.tables.elements;
export function evaluateRootRegimeProtections(full:CarrierFlowSettlement,paths:readonly FrozenRootPath[],complete:boolean):ResourceProtection[]{
 if(full.status!=='closed')return[];const rows=full.carriers,day=rows.find(row=>row.kind==='day-master');if(!day)return[];const i=es.indexOf(day.element),wealth=es[(i+2)%5],resource=es[(i+4)%5],results:ResourceProtection[]=[];
 for(const rescuer of rows.filter(row=>row.id!==day.id&&row.element===day.element))for(const w of rows.filter(row=>row.element===wealth)){const edge=full.graph.edges.find(edge=>edge.source===rescuer.id&&edge.target===w.id&&edge.coefficient>0);if(!edge)continue;const without=settleRootCarrierFlows(rows,paths,[edge.id]);for(const r of rows.filter(row=>row.element===resource&&full.graph.edges.some(edge=>edge.source===w.id&&edge.target===row.id&&edge.coefficient>0)))results.push(assessResourceProtection(full,without,{rescuerIds:[rescuer.id],wealthId:w.id,resourceId:r.id,dayId:day.id,interventionEdgeIds:[edge.id]},complete));}
 return results;
}
