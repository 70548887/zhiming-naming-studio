import sourceData from '../../data/cong-sha-rules.json';
import {evaluateFollowingPatternPredicate,type FollowingPatternContext} from './following-patterns';
import type{BaziAnalysis,BaziEvidenceRule,BaziEvidenceSource,FollowingPatternCheck,FollowingPatternCriterion,FollowingPatternDecisionBranch,FollowingPatternPredicate}from'../shared/types';

export const FOLLOWING_SHA_VERSION='qiongtong-2294674-monthly-cong-sha/1.0.0';
const SOURCE_ID='bazi-cong-sha-qiongtong-2294674';
const SOURCE:BaziEvidenceSource={id:SOURCE_ID,name:'《穷通宝鉴》固定修订：从杀原句的依赖前提与局部事实',url:'https://zh.wikisource.org/w/index.php?title=穷通宝鉴&oldid=2294674',revision:'wikisource-revision/2294674',locator:'固定修订2294674丙亥、丙子、丁子、庚午、癸午原句，详见本条码点定位',note:'原文水多、癸旺、一派等必要语义未量化；只记已声明透干或缺失子集与反向信号，拒绝前提不齐不输出整体反证，不推真从。'};
const RULE:BaziEvidenceRule={id:'bazi-following-sha-dependent-clause-evidence',version:'1.0.0',name:'从杀原句的依赖式反证前提核对',sourceIds:[SOURCE_ID,'bazi-evidence-lunar186'],conditions:[
 '独立保留每条从杀原句的适用范围、必要前提、局部支持和反向信号，不改变已有从财四条检查。',
 '水多、癸旺、一派、实际制化、无甲或无伤的未明作用域不采用数量、扶抑占比或暗自扩展的藏根规则。',
 '明干无印比的子集只记支持事实，不能替代原文全局无印比；缺时柱时未见不等于没有。',
 '反证必须在列出的前提和反向信号全部已知满足时才触发；必要前提未知或未实现，已见丁、戊、甲等信号只作局部观测。',
 '本轮有源五路径的必要气势仍未实现，因此保留待审；不为得到候选或反证而把必要条件改为支持。'
]};
export interface FollowingShaSourceCriterion{
 id:string;name:string;role:'necessary'|'support'|'exception';scope:string;decisionUse:'necessary'|'support-only'|'rejection-premise'|'rejection-signal';predicate?:FollowingPatternPredicate;
 sourceQuote:string;sourceLocator:string;unresolved:string[];
}
export interface FollowingShaSourceBranch{
 id:string;name:string;sourceQuote:string;sourceLocator:string;premiseCriterionIds:string[];signalCriterionIds:string[];unresolved:string[];
}
export interface FollowingShaSourceRule{
 id:string;pattern:'cong-sha';name:string;applicability:{dayStems:string[];monthBranches:string[]};sourceQuote:string;sourceLocator:string;
 criteria:FollowingShaSourceCriterion[];rejectionBranches:FollowingShaSourceBranch[];unresolved:string[];context?:{sourceQuote:string;sourceLocator:string}[];
}
export function followingShaRules():{sources:BaziEvidenceSource[];rules:BaziEvidenceRule[]}{return{sources:[{...SOURCE}],rules:[{...RULE,sourceIds:[...RULE.sourceIds],conditions:[...RULE.conditions]}]};}
export function followingShaSourceRules():FollowingShaSourceRule[]{
 const data=sourceData as unknown as{version:string;rules:FollowingShaSourceRule[]};if(data.version!==FOLLOWING_SHA_VERSION||!Array.isArray(data.rules)||data.rules.length!==5)throw new Error('从杀原句证据资料版本或五路径不完整。');return structuredClone(data.rules);
}

/** A met local signal never satisfies a missing dependent premise. This is also safe for future fully executable branches. */
export function evaluateFollowingPatternDecisionBranches(criteria:FollowingPatternCriterion[],branches:FollowingShaSourceBranch[],applicability:FollowingPatternCheck['applicability']):FollowingPatternDecisionBranch[]{
 const registry=new Map(criteria.map(item=>[item.id,item]));
 return branches.map(branch=>{
  if(!branch.premiseCriterionIds.length||!branch.signalCriterionIds.length||[...branch.premiseCriterionIds,...branch.signalCriterionIds].some(id=>!registry.has(id)))throw new Error('从杀反证分支的依赖前提或信号编号无效。');
  const premises=branch.premiseCriterionIds.map(id=>registry.get(id)!),signals=branch.signalCriterionIds.map(id=>registry.get(id)!);
  const all=[...premises,...signals],unknown=all.some(item=>item.result==='unknown'||item.result==='not-implemented'),notTriggered=all.some(item=>item.result==='not-met');
  const status:FollowingPatternDecisionBranch['status']=applicability==='not-applicable'?'not-evaluated':notTriggered?'not-triggered':unknown?'pending':'rejected';
  return{id:branch.id,name:branch.name,sourceQuote:branch.sourceQuote,sourceLocator:branch.sourceLocator,premiseCriterionIds:[...branch.premiseCriterionIds],signalCriterionIds:[...branch.signalCriterionIds],status,
   observedEvidence:all.map(item=>`${premises.includes(item)?'依赖前提':'局部信号'}「${item.name}」：${item.result}。`),missing:[...branch.unresolved,...all.filter(item=>item.result==='unknown'||item.result==='not-implemented').map(item=>`拒绝前提或信号未齐：${item.name}（${item.result}）。`),...(status!=='rejected'?['本分支未具备全部拒绝前提；已见局部信号不能上升为整句反证。']:[])],doesNotResolveClause:status!=='rejected'};
 });
}
export function calculateFollowingShaChecks(bazi:BaziAnalysis,context:FollowingPatternContext):FollowingPatternCheck[]{
 const day=bazi.pillars.find(item=>item.label==='日柱')?.gan;if(!day)throw new Error('从杀证据需要已确定日干。');
 const month=bazi.pillars.find(item=>item.label==='月柱')?.zhi,possible=month?[month]:[...new Set(context.monthAuthority.segments.map(item=>item.monthBranch))];
 const facts={...context.facts,complete:context.facts.complete&&!context.timeUnknown&&bazi.pillars.length===4};
 return followingShaSourceRules().map(source=>{
  const applicability:FollowingPatternCheck['applicability']=!source.applicability.dayStems.includes(day)||!possible.some(value=>source.applicability.monthBranches.includes(value))?'not-applicable':month?'applicable':'possible';
  const criteria:FollowingPatternCriterion[]=source.criteria.map(criterion=>{
   const value=applicability!=='not-applicable'&&criterion.predicate?evaluateFollowingPatternPredicate(criterion.predicate,facts):undefined;
   return{id:criterion.id,name:criterion.name,role:criterion.role,scope:criterion.scope,decisionUse:criterion.decisionUse,contributesToVerdict:false,...(criterion.predicate?{predicate:structuredClone(criterion.predicate)}:{}),result:value?.result??'not-implemented',sourceQuote:criterion.sourceQuote,sourceLocator:criterion.sourceLocator,observedEvidence:value?.observedEvidence||[],missing:[...criterion.unresolved,...(value?.missing||[]),...(!value?[applicability==='not-applicable'?'不在当前日干、月支范围，本项未按此句评估。':'本项原文气势、范围或制化尚未实现，不以数值阈值补足。']:[])]};
  });
  const branches=evaluateFollowingPatternDecisionBranches(criteria,source.rejectionBranches,applicability);
  for(const criterion of criteria){
   const uses=branches.filter(branch=>branch.signalCriterionIds.includes(criterion.id)||branch.premiseCriterionIds.includes(criterion.id));
   criterion.contributesToVerdict=uses.some(branch=>branch.status==='rejected');
   criterion.qualificationMissing=[...new Set(uses.filter(branch=>branch.status!=='rejected').flatMap(branch=>branch.missing))];
   if(criterion.decisionUse==='support-only')criterion.qualificationMissing.push('此项只核明干或藏干的已声明子集，不代表原句全局必要条件已满足。');
  }
  const supportedBy=criteria.filter(item=>item.result==='met'&&item.decisionUse==='support-only').map(item=>`${item.name}：已知字面子集符合，仅作局部支持。`);
  const opposedBy=branches.filter(branch=>branch.status==='rejected').map(branch=>`${branch.name}：所列依赖前提与信号均已核实；仅本条路径反证。`);
  const missing=[...new Set([...source.unresolved,...(source.context||[]).map(item=>`原文背景尚需对读：${item.sourceQuote}（${item.sourceLocator}）`),...criteria.flatMap(item=>item.missing),...branches.flatMap(branch=>branch.missing),...(applicability==='possible'?['月支交节待定，按可能月份保留本句，不给唯一结论。']:[]),...(context.ambiguous?['重复民用时刻只计算第一次；仍需人工核对另一可能瞬间。']:[])])];
  const status:FollowingPatternCheck['status']=applicability==='not-applicable'?'not-evaluated':opposedBy.length?'contradicted':'pending';
  return{id:source.id,pattern:'cong-sha',name:source.name,status,applicability,sourceId:SOURCE_ID,sourceQuote:source.sourceQuote,sourceLocator:source.sourceLocator,statusExplanation:status==='not-evaluated'?'当前日干或月支不在本句范围，未评估该路径。':status==='contradicted'?'本条列出的拒绝前提与信号全部已核实，仅对该句路径给反证。':'必要气势或作用域仍未核；已见局部支持、丁戊甲等信号不能代替完整从杀裁决。',criteria,decisionBranches:branches,supportedBy,opposedBy,missing,requiresManualReview:true};
 });
}
