import ruleData from '../../data/ren-capacities-rules.json';
import type {RenCommentaryAnalysis,RenSourceReference,RenStructureNode} from '../shared/types';
import type {RenActionSourceClause} from '../shared/ren-actions-types';
import type {RenCapacityAnalysis,RenCapacityCheck,RenCapacityDependency,RenCapacityFact,RenCapacityState} from '../shared/ren-capacities-types';
import {calculateRenActionAnalysis} from './ren-actions';
import {resolveRenDependencies} from './ren-dependencies';
import {canonicalPlainJson} from '../shared/plain-json';

export const REN_CAPACITIES_VERSION='1.0.0' as const;
export const REN_CAPACITIES_PROFILE='ren-source-wood-capacities/1.0.0' as const;
export const REN_CAPACITIES_SOURCE_ID='bazi-ditian-ren-capacities-2600158' as const;
const BASE_VERSION='ditian-ren-commentary-2600158/1.2.0';
const BASE_BAZI_VERSION='civil-midnight-fuyi-candidate/1.12.0;lunar-typescript/1.8.6';
const CLASHES=['子午','丑未','寅申','卯酉','辰戌','巳亥'];
const COMBINATIONS=['甲己','乙庚','丙辛','丁壬','戊癸'];
const WOOD_GROUP=['亥','卯','未'],ADOPTED_BRANCHES=[...WOOD_GROUP,'辰'];
const RESTRICTIONS=[
  '四柱及日主已知，四支恰为亥、卯、未、辰各一；不补时柱，不加岁运。',
  '产品保守采用卯月、甲乙木日，四个明干仅属木或水；这不是作者公布的全部必要条件。',
  '本盘已知柱的全部所选明藏字及原节点保留；采用域内的未藏丁火、辰藏戊土、未藏己土不因能力判定删除。',
  '仅采用原文明列木局与辰余气的局部能力，不推及所有根联系、全局净作用或成格。'
];
export type RenCapacityRules=Omit<typeof ruleData,'clauses'>&{clauses:RenActionSourceClause[]};
/** The published source package remains separate from frozen action1.2 data. */
export function renCapacityRules():RenCapacityRules{
  const data=ruleData as unknown as RenCapacityRules;
  if(data.version!==REN_CAPACITIES_VERSION||data.profileId!==REN_CAPACITIES_PROFILE||data.methodVersion!=='ditian-ren-commentary-2600158/1.3.0'||data.sourceId!==REN_CAPACITIES_SOURCE_ID||data.source.revision!==2600158||!Array.isArray(data.clauses)||new Set(data.clauses.map(c=>c.id)).size!==data.clauses.length||!['wood-group-chen-vigour','chen-supports-wood-group'].every(id=>data.clauses.some(c=>c.id===id))||data.clauses.some(c=>c.sourceId!==REN_CAPACITIES_SOURCE_ID))throw new Error('任注木局有限能力固定规则不完整。');
  return structuredClone(data);
}
function sourceReferences():RenSourceReference[]{return renCapacityRules().clauses.map(({id,sourceId,section,layer,quote,locator})=>({id,sourceId,section,layer,quote,locator}));}
/** Validate all literal nodes against the frozen1.2 structural calculator before making independent facts. */
function inputNodes(base:RenCommentaryAnalysis):RenStructureNode[]{
  canonicalPlainJson(base);
  if(base.version!==BASE_VERSION||base.profileId!==BASE_VERSION||base.input.baziVersion!==BASE_BAZI_VERSION||base.capacityAnalysis!==undefined||!base.actionAnalysis||base.input.complete!==base.input.pillars.every(p=>p.known))throw new Error('任注木局能力需要未追加能力的完整原版1.2快照。');
  const checked=calculateRenActionAnalysis({...base,version:'ditian-ren-commentary-2600158/1.1.0'});
  if(canonicalPlainJson(checked)!==canonicalPlainJson(base.actionAnalysis))throw new Error('任注木局能力的原1.2条件动作或节点不一致。');
  return base.structureGraph.nodes;
}
function conjunction(facts:RenCapacityFact[]):RenCapacityState{
  if(facts.some(f=>f.state==='conflict'))return'conflict';
  if(facts.some(f=>f.state==='not-met'))return'not-met';
  if(!facts.length||facts.some(f=>f.state==='unknown'))return'unknown';
  return'met';
}
function absentState(complete:boolean,present:boolean):RenCapacityState{return present?'not-met':complete?'met':'unknown';}

/**
 * Two source-sufficient positive local abilities, within an explicit conservative adopted domain.
 * Neither absence of a known attack nor a source-case formation label supplies an ability seed.
 * Failure of this sufficient path leaves the ability unknown, never universally false.
 */
export function calculateRenCapacityAnalysis(base:RenCommentaryAnalysis):RenCapacityAnalysis{
  const nodes=inputNodes(base),branches=nodes.filter(n=>n.layer==='branch'),stems=nodes.filter(n=>n.layer==='exposed');
  const complete=base.input.complete,month=branches.find(n=>n.position==='month'),day=stems.find(n=>n.isDayMaster);
  const branchSymbols=branches.map(n=>n.symbol),foreign=branchSymbols.some(s=>!ADOPTED_BRANCHES.includes(s)),duplicate=new Set(branchSymbols).size!==branchSymbols.length;
  const triad=branches.filter(n=>WOOD_GROUP.includes(n.symbol)),chen=branches.filter(n=>n.symbol==='辰');
  const fact=(id:string,label:string,state:RenCapacityState,selected:RenStructureNode[],evidence:string[]):RenCapacityFact=>({id,label,state,nodeIds:selected.map(n=>n.id),evidence});
  const clashPairs=branches.flatMap((a,index)=>branches.slice(index+1).filter(b=>CLASHES.includes(a.symbol+b.symbol)||CLASHES.includes(b.symbol+a.symbol)).map(b=>`${a.pillar}${a.symbol}与${b.pillar}${b.symbol}`));
  const combinationPairs=stems.flatMap((a,index)=>stems.slice(index+1).filter(b=>COMBINATIONS.includes(a.symbol+b.symbol)||COMBINATIONS.includes(b.symbol+a.symbol)).map(b=>`${a.pillar}${a.symbol}与${b.pillar}${b.symbol}`));
  const metal=nodes.filter(n=>n.layer!=='branch'&&n.element==='金');
  const facts:RenCapacityFact[]=[
    fact('complete-four-pillars','四柱及其所选藏干完整',complete?'met':'unknown',branches,[complete?'全部四柱由出生分析确定。':'缺失柱保持未知；不能借同生日的已知时刻方案补齐。']),
    fact('exact-wood-combination-plus-chen','亥卯未与辰各一的完整所选四支',foreign||duplicate?'not-met':complete?'met':'unknown',branches,[`已知四支：${branchSymbols.join('、')||'未定'}。`,'这项只核对实际四支成员，不预先假设全局合化或从强。']),
    fact('mao-month','产品采用子域：月支卯',month?month.symbol==='卯'?'met':'not-met':'unknown',month?[month]:[],['卯月是本产品保守边界；不能把月支相等当作任意旺度的通用证明。']),
    fact('wood-day-stem','产品采用子域：日主甲乙木',day?day.element==='木'?'met':'not-met':'unknown',day?[day]:[],[day?`日主${day.symbol}已定。`:'日主未定，不借代表日期选定。']),
    fact('visible-wood-water-only','产品采用子域：四个明干仅木水',stems.some(n=>n.element!=='木'&&n.element!=='水')?'not-met':complete?'met':'unknown',stems,[`已知明干：${stems.map(n=>n.symbol).join('、')||'未定'}。`,'此明干范围不冒充全部藏干无土无火；藏干另逐节点保留。']),
    fact('selected-metal-absent','完整所选明藏词汇中未有金字',absentState(complete,metal.length>0),metal,['只对当前完整所选词汇作有限不存在判断；不是“一切阻断都不存在”。',...metal.map(n=>`${n.pillar}${n.layer==='hidden'?'藏':''}${n.symbol}仍保留。`)]),
    fact('selected-six-clash-absent','本四支中未有六冲配对',absentState(complete,clashPairs.length>0),branches,[...clashPairs,'六冲成员的有限核查不是所有有效阻断机制的穷尽。']),
    fact('selected-five-combination-absent','本四明干中未有五合配对',absentState(complete,combinationPairs.length>0),stems,[...combinationPairs,'没有五合配对不等于已经完成全部合化判断。'])
  ];
  const proofNodes:RenCapacityDependency[]=facts.map(f=>({id:f.id,observed:f.state,premises:[],inhibitors:[],mode:'sufficient-only'}));
  const definitions=[
    {id:'wood-group-strength',name:'本亥卯未兼辰的局部木势',clause:'wood-group-chen-vigour',sources:[...triad,...chen],targets:triad,consequence:'原文明说本木局再逢辰余气“旺之极矣”；本采用子域可支持该木神局部旺势。'},
    {id:'chen-wood-support-capacity',name:'本辰支对所指亥卯未木神的生助能力',clause:'chen-supports-wood-group',sources:chen,targets:triad,consequence:'原文明说辰为东方湿土“能生助木神”；本采用子域可支持本辰→本木神的具体生助方向。'}
  ] as const;
  for(const d of definitions)proofNodes.push({id:`capacity:${d.id}`,premises:facts.map(f=>f.id),inhibitors:[],mode:'sufficient-only'});
  const results=resolveRenDependencies(proofNodes),state=conjunction(facts),rules=renCapacityRules();
  const checks:RenCapacityCheck[]=definitions.map(d=>{
    const result=results[`capacity:${d.id}`].state,capability=result==='met'?'met':result==='conflict'?'conflict':'unknown',quote=rules.clauses.find(c=>c.id===d.clause)!;
    return{id:d.id,kind:d.id,name:d.name,state,capability,ruleMode:'sufficient-only',sourceNodeIds:d.sources.map(n=>n.id),targetNodeIds:d.targets.map(n=>n.id),sourceClauseIds:[d.clause],scope:'仅本完整出生盘所列辰与亥卯未木神的局部命题；不借岁运，不逐根扩散。',sourceGeneral:quote.quote,productRestrictions:[...RESTRICTIONS],facts:structuredClone(facts),dependencyId:`capacity:${d.id}`,sourceConsequence:d.consequence,evidence:[capability==='met'?'本条充分证明路径已齐备，局部能力得到支持。':'本条充分证明路径未齐；这不能证明该能力在所有路径都不存在。',`源节点${d.sources.map(n=>n.pillar+n.symbol).join('、')||'未齐'}；靶节点${d.targets.map(n=>n.pillar+n.symbol).join('、')||'未齐'}。`,'本盘已知柱的全部所选明藏节点保留；未由所选金字缺席推断一切阻断缺席。','本原局局部木势不能推出木局永不受金克，也不能推出后续金运无害；岁运加入后须另审。'],missing:[...facts.filter(f=>f.state!=='met').map(f=>`${f.label}：${f.state==='not-met'?'不在本采用范围':'信息待核'}。`),'全局竞争、净作用、具体各根有效支撑及喜用没有由本条闭合。'],netEffect:'unknown'};
  });
  return{version:REN_CAPACITIES_VERSION,profileId:REN_CAPACITIES_PROFILE,sourceId:REN_CAPACITIES_SOURCE_ID,authority:'source-sufficient-local-capacities',input:{baseVersion:base.version,complete,dayStem:day?.symbol??null,pillars:structuredClone(base.input.pillars)},checks,proof:{nodes:proofNodes,results},sourceReferences:sourceReferences(),originalNodesRetained:true,netEffect:'unknown',effectiveRootSupport:'unknown',strengthDecision:'not-evaluated',formationDecision:'not-evaluated',limitations:[...RESTRICTIONS,'met能力由固定原文正面命题及本采用子域支持，非由未见已实现的攻击自动推出。','充分路径不匹配时只表示本证明未应用，不产生所有木势、生助能力或从强取法的通用否定。','没有把作者原例的成格标签当作任意新盘每条作用边为真的独立种子。','局部木神旺势不等于全盘日主总旺；辰生助能力不等于所有根联系已有效。','辰生助的对象限本木神；春木受水、戊土强根及采用域内未藏丁火的有效生扶均须另证。','本原局局部木势不能推出木局永不受金克，也不能推出后续金运无害；本固定原例仍说明西方金运可克破，加入岁运须另证。','本扩展不修改原1.2条件动作、节点、喜用候选、姓名评分或排序；完整调候、真假从及合化另待闭合。']};
}
export function validRenCapacityAnalysis(value:unknown,base:RenCommentaryAnalysis):value is RenCapacityAnalysis{
  try{return canonicalPlainJson(value)===canonicalPlainJson(calculateRenCapacityAnalysis(base));}catch{return false;}
}
