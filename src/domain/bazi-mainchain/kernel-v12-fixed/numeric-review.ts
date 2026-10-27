import type {CarrierFlowSettlement} from './settled-flows';
import type {NumericReview144} from './types-v12';
import {divide,sumIntervals,point,type NumericInterval} from './numeric-interval';
import rules from './rules/project-mainchain-1.2.0.json';
const P=rules.parameters,elements=rules.tables.elements;
export function reviewNumericalThresholds(state:CarrierFlowSettlement):NumericReview144 {
 const rows=state.carriers,day=rows.find(row=>row.kind==='day-master')!,dayElement=day.element,resource=elements[(elements.indexOf(dayElement)+4)%5],food=elements[(elements.indexOf(dayElement)+1)%5],wealth=elements[(elements.indexOf(dayElement)+2)%5],officer=elements[(elements.indexOf(dayElement)+3)%5];
 const byElement=(element:string)=>sumIntervals(rows.filter(row=>row.element===element).map(row=>state.bounds.powers[row.id]));
 const total=sumIntervals(rows.map(row=>state.bounds.powers[row.id])),support=divide(sumIntervals([byElement(dayElement),byElement(resource)]),total),affected:NumericReview144['affectedPredicates']=[];
 const check=(id:string,interval:NumericInterval,threshold:number,adjacentJudgments:string[],comparisonTolerance:number=P.epsilon)=>{if(interval.lower-comparisonTolerance<=threshold&&interval.upper+comparisonTolerance>=threshold)affected.push({id,interval,threshold,comparisonTolerance,adjacentJudgments});};
 check('support-weak',support,P.weakShare,['weak','balanced']);check('support-strong',support,P.strongShare,['balanced','strong']);check('support-follow-strong',support,P.fromStrongShare,['cong-strong-admission','regular-admission']);check('support-follow-weak',support,P.fromWeakShare,['cong-weak-admission','regular-admission']);
 for(const row of rows){const bounds=state.bounds.powers[row.id];check('usable:'+row.id,bounds,P.usableMinimum,['usable-carrier','unusable-carrier']);if(row.kind==='hidden')check('root:'+row.id,bounds,P.rootMinimum,['effective-root','ineffective-root']);else if(row.element===dayElement||row.element===resource)check('external-support:'+row.id,bounds,P.externalSupportMinimum,['external-support-block','no-external-support-block']);
  const loss=state.controlSettlement.totalLossBoundsByNode?.[row.id];if(row.element===resource&&loss)check('resource-heavy-control:'+row.id,loss,row.capacity*P.rescueHeavyControlRatio,['resource-heavy-injury','resource-not-heavy-injury']);
 }
 for(const element of [resource,officer,wealth]){const bounds=byElement(element);check('element-opponent:'+element,bounds,P.opponentAbsMaximum,['opposition-block','no-opposition-block']);if(element===wealth||element===officer)check('dominance:'+element,divide(bounds,total),P.dominanceShare,['dominant','not-dominant']);}
 const output=byElement(food),side=sumIntervals([output,byElement(wealth),byElement(officer)]);check('food-amount',output,P.rootMinimum,['food-has-capacity','food-insufficient']);if(side.lower>0)check('food-side-share',divide(output,side),P.fromOutputShare,['productive-side-dominant','productive-side-insufficient']);
 const productive=state.flows.filter(edge=>edge.kind==='generate'&&rows.find(row=>row.id===edge.source)?.element===food&&rows.find(row=>row.id===edge.target)?.element===wealth);check('productive-flow',sumIntervals(productive.map(edge=>state.bounds.flows[edge.id]??point(0))),P.usableMinimum,['productive-flow-usable','productive-flow-insufficient']);
 check('wealth-amount',byElement(wealth),P.usableMinimum,['wealth-usable','wealth-insufficient']);
 const peerToFood=state.flows.filter(edge=>edge.kind==='generate'&&rows.find(row=>row.id===edge.source)?.element===dayElement&&rows.find(row=>row.id===edge.target)?.element===food);
 check('peer-to-food-positive',sumIntervals(peerToFood.map(edge=>state.bounds.flows[edge.id]??point(0))),P.epsilon,['peer-generates-food','no-certified-peer-to-food'],0);
 const strengthCandidates:NumericReview144['strengthCandidates']=[];if(support.lower-P.epsilon<=P.weakShare)strengthCandidates.push('weak');if(support.upper+P.epsilon>P.weakShare&&support.lower-P.epsilon<P.strongShare)strengthCandidates.push('balanced');if(support.upper+P.epsilon>=P.strongShare)strengthCandidates.push('strong');
 return{status:affected.length?'pending-prerequisite':'separated-from-thresholds',supportShare:support,strengthCandidates,affectedPredicates:affected};
}
