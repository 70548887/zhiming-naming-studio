import ruleData from '../../data/ren-directions-rules.json';
import type {RenCommentaryAnalysis,RenSourceReference,RenStructureNode,Element} from '../shared/types';
import type {RenActionSourceClause} from '../shared/ren-actions-types';
import type {RenCapacityDependency,RenCapacityState} from '../shared/ren-capacities-types';
import type {RenDirectionAnalysis,RenDirectionCheck,RenDirectionFact,RenDirectionFactKind,RenDirectionKind} from '../shared/ren-directions-types';
import {calculateRenCapacityAnalysis,REN_CAPACITIES_SOURCE_ID} from './ren-capacities';
import {canonicalPlainJson} from '../shared/plain-json';
import {resolveRenDependencies} from './ren-dependencies';

export const REN_DIRECTIONS_VERSION='1.0.0' as const;
export const REN_DIRECTIONS_PROFILE='ren-source-direction-capacities/1.0.0' as const;
export const REN_DIRECTIONS_SOURCE_ID='bazi-ditian-ren-directions-2600158' as const;
const COMPLETENESS_POLICY='四柱完整性只描述输入；已知柱见齐本方三字且日干同气时，即使缺少第四柱，本条局部充分证明仍可成立。';
const OPPOSITION_POLICY='冲克、合和重复支均按原结构保留；尚未判定的力量与救应不自动撤销已知局部原句前提，也不证明冲克实际无效。';
const HIDDEN_POLICY='所有已知明干、地支及所选藏干逐位置保留；不因本条局部正判删除财官、根或重复支。';
const SUFFICIENT_POLICY='本条采用原文明示的局部充分条件；本路径不符或前提未齐，都不能反判该能力在所有路径下不存在。';
interface SourcePremise {id:string;kind:RenDirectionFactKind;requiredForProof:boolean;label:string;sourceClauseIds:string[];basis:string;}
interface SourceContract {
 id:string;kind:RenDirectionKind;element:Extract<Element,'木'|'火'>;directionBranches:string[];dayStems:string[];
 sourceClauseIds:string[];premises:SourcePremise[];scope:string;consequence:string;nonConclusions:string[];
}
export interface RenDirectionRules {
 version:'1.0.0';profileId:typeof REN_DIRECTIONS_PROFILE;methodVersion:'ditian-ren-commentary-2600158/1.4.0';
 sourceId:typeof REN_DIRECTIONS_SOURCE_ID;source:{revision:number;[key:string]:unknown};clauses:RenActionSourceClause[];
 adoption:{contracts:SourceContract[];policy:string;hiddenStemPolicy:string;knownInputPolicy:string;inputCompletenessPolicy:string;potentialOppositionPolicy:string;nonConclusions:string[]};
}
/** Fixed source statements are separate from immutable1.3 capacity rules; no weights or source-case answer seeds. */
export function renDirectionRules():RenDirectionRules {
 const data=ruleData as unknown as RenDirectionRules;canonicalPlainJson(data);
 if(data.version!==REN_DIRECTIONS_VERSION||data.profileId!==REN_DIRECTIONS_PROFILE||data.sourceId!==REN_DIRECTIONS_SOURCE_ID||data.methodVersion!=='ditian-ren-commentary-2600158/1.4.0'||data.source.revision!==2600158||data.clauses.length!==13||new Set(data.clauses.map(clause=>clause.id)).size!==13||data.clauses.some(clause=>clause.sourceId!==REN_DIRECTIONS_SOURCE_ID)||data.adoption.contracts.length!==2)throw new Error('任注方向局部旺势固定来源不完整。');
 for(const [index,contract] of data.adoption.contracts.entries()) {
  const expected=index===0?{kind:'wood-direction-strength',element:'木',branches:['寅','卯','辰'],dayStems:['甲','乙']}:{kind:'fire-direction-strength',element:'火',branches:['巳','午','未'],dayStems:['丙','丁']};
  if(contract.id!==expected.kind||contract.kind!==expected.kind||contract.element!==expected.element||canonicalPlainJson(contract.directionBranches)!==canonicalPlainJson(expected.branches)||canonicalPlainJson(contract.dayStems)!==canonicalPlainJson(expected.dayStems)||new Set(contract.premises.map(premise=>premise.id)).size!==3||!['complete-direction','same-element-day-stem','input-completeness'].every(id=>contract.premises.some(premise=>premise.id===id))||contract.premises.some(premise=>premise.requiredForProof!==(premise.id!=='input-completeness'))||Object.keys(contract).some(key=>['monthBranches','branchMultisets','visibleStems'].includes(key)))throw new Error('任注方向充分证明不得混入月份、明干、第四支或完整性门槛。');
  if(contract.sourceClauseIds.concat(contract.premises.flatMap(premise=>premise.sourceClauseIds)).some(id=>!data.clauses.some(clause=>clause.id===id)))throw new Error('任注方向充分证明引用未登记原句。');
 }
 return structuredClone(data);
}
function prior12(base:RenCommentaryAnalysis):RenCommentaryAnalysis {
 const {capacityAnalysis,...rest}=base;
 return {...rest,version:'ditian-ren-commentary-2600158/1.2.0',profileId:'ditian-ren-commentary-2600158/1.2.0',input:{...base.input,baziVersion:'civil-midnight-fuyi-candidate/1.12.0;lunar-typescript/1.8.6'},sourceRules:base.sourceRules.filter(reference=>reference.sourceId!==REN_CAPACITIES_SOURCE_ID)};
}
/** Authenticate the inherited input's selected node vocabulary and unchanged1.3 capability result. */
function inputNodes(base:RenCommentaryAnalysis):RenStructureNode[] {
 canonicalPlainJson(base);
 if(base.version!=='ditian-ren-commentary-2600158/1.3.0'||base.profileId!==base.version||base.input.baziVersion!=='civil-midnight-fuyi-candidate/1.13.0;lunar-typescript/1.8.6'||Object.hasOwn(base,'directionAnalysis')||!base.capacityAnalysis||!base.actionAnalysis||base.input.complete!==base.input.pillars.every(pillar=>pillar.known))throw new Error('任注方向层需要未追加方向证明的原版1.3快照。');
 if(canonicalPlainJson(base.capacityAnalysis)!==canonicalPlainJson(calculateRenCapacityAnalysis(prior12(base))))throw new Error('任注方向层的原1.3能力或明藏节点不一致。');
 return base.structureGraph.nodes;
}
function conjunction(facts:RenDirectionFact[]):RenCapacityState {
 if(facts.some(fact=>fact.state==='conflict'))return'conflict';
 if(facts.some(fact=>fact.state==='not-met'))return'not-met';
 return facts.length&&facts.every(fact=>fact.state==='met')?'met':'unknown';
}

/** Known sufficient subfacts may close locally even when another pillar is unknown. Net force remains unresolved. */
export function calculateRenDirectionAnalysis(base:RenCommentaryAnalysis):RenDirectionAnalysis {
 const nodes=inputNodes(base),rules=renDirectionRules(),branches=nodes.filter(node=>node.layer==='branch'),day=nodes.find(node=>node.layer==='exposed'&&node.isDayMaster),complete=base.input.complete;
 const proofNodes:RenCapacityDependency[]=[],definitions=rules.adoption.contracts.map(contract=>{
  const members=branches.filter(node=>contract.directionBranches.includes(node.symbol)),allMembers=contract.directionBranches.every(symbol=>members.some(node=>node.symbol===symbol));
  const stateById:Record<string,RenCapacityState>={
   'complete-direction':allMembers?'met':complete?'not-met':'unknown',
   'same-element-day-stem':day?contract.dayStems.includes(day.symbol)?'met':'not-met':'unknown',
   'input-completeness':complete?'met':'unknown',
  };
  const facts:RenDirectionFact[]=contract.premises.map(premise=>{
   const selected=premise.id==='complete-direction'?members:premise.id==='same-element-day-stem'?day?[day]:[]:branches;
   const evidence=premise.id==='complete-direction'?[`已知柱见${branches.map(node=>node.pillar+node.symbol).join('、')||'无确定支'}；本方要求${contract.directionBranches.join('、')}。`,allMembers?'已知柱已见齐本方三字，不借未知第四柱补字。':complete?'完整四柱未见齐本方三字；只排除本句充分路径，不否定一切局部旺势。':'未知柱可能补足成员，未见齐仍保留待核。']:premise.id==='same-element-day-stem'?[day?`日干${day.symbol}属${day.element}，本方为${contract.element}。`:'日干未定，不用代表时刻或其他日期补定。']:[complete?'全部四柱已知。':'四柱尚未全部确定；本项只记录输入，不作本局部充分证明的必要门槛。'];
   return {id:premise.id,kind:premise.kind,label:premise.label,state:stateById[premise.id],nodeIds:selected.map(node=>node.id),sourceClauseIds:[...premise.sourceClauseIds],basis:premise.basis,evidence,contributesToProof:premise.requiredForProof};
  });
  for(const fact of facts)proofNodes.push({id:`${contract.id}:${fact.id}`,observed:fact.state,premises:[],inhibitors:[],mode:'sufficient-only'});
  const dependencyId=`direction:${contract.id}`;
  proofNodes.push({id:dependencyId,premises:facts.filter(fact=>fact.contributesToProof).map(fact=>`${contract.id}:${fact.id}`),inhibitors:[],mode:'sufficient-only'});
  return {contract,members,facts,dependencyId};
 });
 const results=resolveRenDependencies(proofNodes);
 const checks:RenDirectionCheck[]=definitions.map(({contract,members,facts,dependencyId})=>{
  const result=results[dependencyId].state,capability=result==='met'?'met':result==='conflict'?'conflict':'unknown',state=conjunction(facts.filter(fact=>fact.contributesToProof));
  return {id:contract.id,kind:contract.kind,name:contract.element+'方与同气日干的局部旺势',element:contract.element,state,capability,ruleMode:'sufficient-only',sourceNodeIds:members.map(node=>node.id),targetNodeIds:day&&contract.dayStems.includes(day.symbol)?[day.id]:[],sourceClauseIds:[...contract.sourceClauseIds],scope:contract.scope,sourceGeneral:contract.sourceClauseIds.map(id=>rules.clauses.find(clause=>clause.id===id)!.quote).join('；'),productRestrictions:[rules.adoption.knownInputPolicy,COMPLETENESS_POLICY,OPPOSITION_POLICY],facts,dependencyId,sourceConsequence:contract.consequence,evidence:[capability==='met'?'原文明示的两项充分前提已由当前已知柱支持，本方向局部旺势得到支持。':'本句充分证明未闭合；没有推出本方在所有证明路径下都不旺。',`保留${members.map(node=>node.pillar+node.symbol).join('、')||'尚无本方已知支'}，同字不同柱仍各自保留。`,'这是对固定原句的正面采用，不从“未实现攻击”或“未见某类字”反推一切阻断皆无。','所选明藏、冲克、重复支及根联系完整保留；具体竞争与净作用另待证明。'],missing:[...facts.filter(fact=>fact.contributesToProof&&fact.state!=='met').map(fact=>fact.label+'：'+(fact.state==='not-met'?'本句所列路径不适用':'信息待核')+'。'),...contract.nonConclusions],netEffect:'unknown'};
 });
 const sourceReferences:RenSourceReference[]=rules.clauses.map(({id,sourceId,section,layer,quote,locator})=>({id,sourceId,section,layer,quote,locator}));
 return {version:REN_DIRECTIONS_VERSION,profileId:REN_DIRECTIONS_PROFILE,sourceId:REN_DIRECTIONS_SOURCE_ID,authority:'source-sufficient-local-direction-strength',input:{baseVersion:'ditian-ren-commentary-2600158/1.3.0',complete,dayStem:day?.symbol??null,pillars:structuredClone(base.input.pillars)},checks,proof:{nodes:proofNodes,results},sourceReferences,originalNodesRetained:true,retainedNodeIds:nodes.map(node=>node.id),retainedRootLinkIds:base.actionAnalysis!.rootLinks.map(root=>root.id),netEffect:'unknown',effectiveRootSupport:'unknown',strengthDecision:'not-evaluated',formationDecision:'not-evaluated',usefulGodDecision:'not-evaluated',limitations:[SUFFICIENT_POLICY,HIDDEN_POLICY,rules.adoption.knownInputPolicy,COMPLETENESS_POLICY,OPPOSITION_POLICY,...rules.adoption.nonConclusions,'局部旺势不等于每条生克有效、所有根有效、完整身旺、从强成立或已定喜用；本层不修改原1.3能力、旧分析值或姓名评分排序。']};
}
export function validRenDirectionAnalysis(value:unknown,base:RenCommentaryAnalysis):value is RenDirectionAnalysis {
 try {return canonicalPlainJson(value)===canonicalPlainJson(calculateRenDirectionAnalysis(base));}catch{return false;}
}
