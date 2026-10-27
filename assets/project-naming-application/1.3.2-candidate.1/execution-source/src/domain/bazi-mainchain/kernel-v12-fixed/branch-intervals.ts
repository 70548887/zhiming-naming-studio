import type {Branch140,MethodPolicy140,Relation140} from '../../../shared/bazi-mainchain-method-types';
import type {CarrierFlowSettlement} from './settled-flows';
import {divide,point,sumIntervals,type NumericInterval} from './numeric-interval';
import rules from './rules/project-mainchain-1.2.0.json';
type Truth='true'|'false'|'uncertain';
export interface IntervalBranchCandidate {branch:Branch140;status:Truth;premises:{name:string;status:Truth}[];}
const P=rules.parameters,es=rules.tables.elements;
const and=(values:Truth[]):Truth=>values.includes('false')?'false':values.includes('uncertain')?'uncertain':'true';
const or=(values:Truth[]):Truth=>values.includes('true')?'true':values.includes('uncertain')?'uncertain':'false';
const not=(value:Truth):Truth=>value==='true'?'false':value==='false'?'true':'uncertain';
const fixed=(value:boolean):Truth=>value?'true':'false';
function compare(value:NumericInterval,threshold:number,operation:'ge'|'le'|'lt'|'gt'):Truth {
 if(value.lower-P.epsilon<=threshold&&value.upper+P.epsilon>=threshold)return'uncertain';
 return fixed(operation==='ge'?value.lower>=threshold:operation==='le'?value.upper<=threshold:operation==='lt'?value.upper<threshold:value.lower>threshold);
}
/** Conservative adjacent branches; an interval candidate is never formation proof. */
export function intervalBranchCandidates(state:CarrierFlowSettlement,relations:Relation140[],monthElement:string,policy:MethodPolicy140={}):IntervalBranchCandidate[] {
 const rows=state.carriers,day=rows.find(row=>row.kind==='day-master')!,i=es.indexOf(day.element),resource=es[(i+4)%5],food=es[(i+1)%5],wealth=es[(i+2)%5],officer=es[(i+3)%5],bound=(e:string)=>sumIntervals(rows.filter(row=>row.element===e).map(row=>state.bounds.powers[row.id])),total=sumIntervals(rows.map(row=>state.bounds.powers[row.id])),support=divide(sumIntervals([bound(day.element),bound(resource)]),total);
 const roots=or(rows.filter(row=>row.kind==='hidden'&&row.element===day.element).map(row=>compare(state.bounds.powers[row.id],P.rootMinimum,'ge'))),external=or(rows.filter(row=>row.kind==='exposed'&&(row.element===day.element||row.element===resource)).map(row=>compare(state.bounds.powers[row.id],P.externalSupportMinimum,'ge')));
 const make=(branch:Branch140,values:[string,Truth][]):IntervalBranchCandidate=>({branch,status:and(values.map(x=>x[1])),premises:values.map(([name,status])=>({name,status}))});
 const hua=make('hua',[['固定关系阶段日主成化',fixed(relations.some(row=>row.kind==='stem-combination'&&row.status==='applied'&&row.positions.includes('day')))]]);
 const monthStem=rows.find(row=>row.position==='month'&&row.kind==='exposed'),entry=or([fixed(monthElement===food),policy.fromOutputMonthStem&&monthStem?.element===food?compare(state.bounds.powers[monthStem.id],P.usableMinimum,'ge'):'false']);
 const side=sumIntervals([bound(food),bound(wealth),bound(officer)]),sideShare=side.lower>0?compare(divide(bound(food),side),P.fromOutputShare,'ge'):side.upper===0?'false':'uncertain';
 const product=state.flows.filter(edge=>edge.kind==='generate'&&rows.find(row=>row.id===edge.source)?.element===food&&rows.find(row=>row.id===edge.target)?.element===wealth),peer=state.flows.filter(edge=>edge.kind==='generate'&&rows.find(row=>row.id===edge.source)?.element===day.element&&rows.find(row=>row.id===edge.target)?.element===food);
 const output=make('cong-output',[['月柱入口',entry],['食伤合量',compare(bound(food),P.rootMinimum,'ge')],['生育支路占比',sideShare],['财合量',compare(bound(wealth),P.usableMinimum,'ge')],['实际食伤生财',compare(sumIntervals(product.map(edge=>state.bounds.flows[edge.id]??point(0))),P.usableMinimum,'ge')],['比劫顺生食伤',compare(sumIntervals(peer.map(edge=>state.bounds.flows[edge.id]??point(0))),P.epsilon,'gt')],['印未阻断',compare(bound(resource),P.opponentAbsMaximum-P.epsilon,'lt')],['官杀未阻断',compare(bound(officer),P.opponentAbsMaximum-P.epsilon,'lt')]]);
 const strong=make('cong-strong',[['比印成势',compare(support,P.fromStrongShare,'ge')],['后验有效根',roots],['官杀不破',compare(bound(officer),P.opponentAbsMaximum-P.epsilon,'lt')],['财不破',compare(bound(wealth),P.opponentAbsMaximum-P.epsilon,'lt')]]);
 const weak=(branch:'cong-wealth'|'cong-officer',target:string)=>make(branch,[['比印从弱上限',compare(support,P.fromWeakShare,'le')],['无后验有效根',not(roots)],['无有效外透比印',not(external)],['目标独成主势',compare(divide(bound(target),total),P.dominanceShare,'ge')],['固定月令关系',fixed(monthElement===target||es[(es.indexOf(monthElement)+1)%5]===target)]]);
 const specials=[hua,output,strong,weak('cong-wealth',wealth),weak('cong-officer',officer)],candidates:IntervalBranchCandidate[]=[];
 for(const item of specials){if(item.status!=='false')candidates.push(item);if(item.status==='true')return candidates;}
 // No special branch is certain: retain every reachable regular strength.
 if(support.lower-P.epsilon<=P.weakShare)candidates.push(make('regular-weak',[['比印偏弱相邻区间','uncertain']]));
 if(support.upper+P.epsilon>P.weakShare&&support.lower-P.epsilon<P.strongShare)candidates.push(make('regular-balanced',[['比印中和相邻区间','uncertain']]));
 if(support.upper+P.epsilon>=P.strongShare)candidates.push(make('regular-strong',[['比印偏旺相邻区间','uncertain']]));
 return candidates;
}
