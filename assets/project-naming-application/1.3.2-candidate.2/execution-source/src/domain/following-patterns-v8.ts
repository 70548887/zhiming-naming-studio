import sourceData from '../../data/cong-wealth-rules.json';
import type {
 BaziAnalysis,BaziEvidenceRule,BaziEvidenceSource,BaziHiddenStemFact,BaziMonthAuthority,BaziStemFact,Element,
 FollowingPatternCheck,FollowingPatternCriterion,FollowingPatternEvidence,FollowingPatternKind,FollowingPatternPredicate
} from '../shared/types';

export const FOLLOWING_PATTERN_VERSION='qiongtong-2294674-monthly-cong-wealth/1.0.0';
const SOURCE_ID='bazi-cong-wealth-qiongtong-2294674';
const STEM_ELEMENT:Record<string,Element>={甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
const SOURCE:BaziEvidenceSource={id:SOURCE_ID,name:'《穷通宝鉴》固定修订：从财原句的支持与反证',url:'https://zh.wikisource.org/w/index.php?title=穷通宝鉴&oldid=2294674',revision:'wikisource-revision/2294674',locator:'固定电子修订2294674：甲辰、乙午未、庚卯原句；详见逐项码点定位',note:'仅核所选原句的明确字面条件；一片、旺度、成局、三夏背景等未裁决，不把候选称真从，不以扶抑加权占比替代格局。'};
const RULE:BaziEvidenceRule={id:'bazi-following-pattern-clause-evidence',version:'1.0.0',name:'从财限定原句的结构支持与必要条件反证',sourceIds:[SOURCE_ID,'bazi-evidence-lunar186'],conditions:[
 '每条保留适用日干、月支、原句、明确必要条件、反对因素和未核条件，不把不同原句的条件拼成统一流派。',
 '只核固定明干或所选藏干中的天干、五行存在与缺失；不使用既有扶抑权重或38%/55%阈值断从格。',
 '缺柱时已见可作为存在或反证；未见不能证明没有印、比、水或根，必要条件保持未知。',
 '已知事实不符某条明确必要条件或命中原句明确破格因素时，只记该句路径反证，不泛化到全部格局或流派。',
 'literal-clause-only候选仅表示该句可执行字面前提齐备；背景气势、纯杂、成局、真假从和充分性仍须人工，不称成格。',
 '必要条件未实现时即使已有支持仍为待审；从杀、从儿、从旺未取得同等明确可操作来源前不计算。'
]};
export interface FollowingPatternSourceCriterion{
 id:string;name:string;role:'necessary'|'support'|'exception';scope:string;predicate?:FollowingPatternPredicate;
 sourceQuote:string;sourceLocator:string;unresolved:string[];
}
export interface FollowingPatternSourceRule{
 id:string;pattern:FollowingPatternKind;name:string;applicability:{dayStems:string[];monthBranches:string[]};sourceQuote:string;sourceLocator:string;
 candidatePolicy:'structure-only-eligible'|'pending-unimplemented-necessary'|'not-operationalized';criteria:FollowingPatternSourceCriterion[];unresolved:string[];
 context?:{sourceQuote:string;sourceLocator:string}[];
}
export interface FollowingPatternFacts{
 stems:Pick<BaziStemFact,'pillar'|'stem'>[];hiddenStems:Pick<BaziHiddenStemFact,'pillar'|'branch'|'stem'>[];complete:boolean;
}
export interface FollowingPatternContext{
 timeUnknown:boolean;ambiguous:boolean;monthAuthority:BaziMonthAuthority;facts:FollowingPatternFacts;
}
export function followingPatternRules():{sources:BaziEvidenceSource[];rules:BaziEvidenceRule[]}{return {sources:[{...SOURCE}],rules:[{...RULE,sourceIds:[...RULE.sourceIds],conditions:[...RULE.conditions]}]};}
export function followingPatternSourceRules():FollowingPatternSourceRule[]{
 const data=sourceData as unknown as {version:string;rules:FollowingPatternSourceRule[]};
 if(data.version!==FOLLOWING_PATTERN_VERSION||!Array.isArray(data.rules)||!data.rules.length)throw new Error('从格原句证据资料版本或规则缺失。');
 return structuredClone(data.rules);
}
export interface FollowingPredicateResult{result:'met'|'not-met'|'unknown';observedEvidence:string[];missing:string[];}
/** Literal layer-scoped predicates only. No count, strength, purity, roots or formation threshold is supplied here. */
export function evaluateFollowingPatternPredicate(predicate:FollowingPatternPredicate,facts:FollowingPatternFacts,depth=0):FollowingPredicateResult{
 if(!predicate||typeof predicate!=='object'||depth>12)throw new Error('从格条件结构无效。');
 if(predicate.kind==='stem'||predicate.kind==='element'){
  if(!['exposed','hidden','any'].includes(predicate.scope)||typeof predicate.present!=='boolean'||typeof predicate.includeDayMaster!=='boolean'
   ||predicate.kind==='stem'&&!STEM_ELEMENT[predicate.stem]||predicate.kind==='element'&&!['木','火','土','金','水'].includes(predicate.element))throw new Error('从格条件作用域或干行无效。');
  const match=(stem:string)=>predicate.kind==='stem'?stem===predicate.stem:STEM_ELEMENT[stem]===predicate.element;
  const exposed=facts.stems.filter(item=>match(item.stem)&&(predicate.includeDayMaster||item.pillar!=='日柱')).map(item=>item.pillar+item.stem);
  const hidden=facts.hiddenStems.filter(item=>match(item.stem)).map(item=>item.pillar+item.branch+'藏'+item.stem);
  const hits=predicate.scope==='exposed'?exposed:predicate.scope==='hidden'?hidden:[...exposed,...hidden];
  const presence=hits.length?'met' as const:facts.complete?'not-met' as const:'unknown' as const;
  const result=predicate.present?presence:presence==='met'?'not-met':presence==='not-met'?'met':'unknown';
  const name=predicate.kind==='stem'?predicate.stem:predicate.element+'行';
  return {result,observedEvidence:[`${predicate.scope==='exposed'?'明干':predicate.scope==='hidden'?'藏干':'明干与藏干'}${predicate.present?'有':'无'}${name}核对：${hits.join('、')||'已知柱未见'}；明干${predicate.includeDayMaster?'计入':'不计入'}日主自身。`],missing:result==='unknown'?['出生柱不完整，已知柱未见不能证明全局没有；不补时柱或猜根气。']:[]};
 }
 if(predicate.kind==='not'){
  const item=evaluateFollowingPatternPredicate(predicate.item,facts,depth+1);return {...item,result:item.result==='met'?'not-met':item.result==='not-met'?'met':'unknown'};
 }
 if(!['all','any'].includes(predicate.kind)||!Array.isArray(predicate.items)||!predicate.items.length||predicate.items.length>20)throw new Error('从格组合条件无效。');
 const items=predicate.items.map(item=>evaluateFollowingPatternPredicate(item,facts,depth+1));
 const result=predicate.kind==='all'?items.some(item=>item.result==='not-met')?'not-met':items.some(item=>item.result==='unknown')?'unknown':'met':items.some(item=>item.result==='met')?'met':items.some(item=>item.result==='unknown')?'unknown':'not-met';
 return {result,observedEvidence:items.flatMap(item=>item.observedEvidence),missing:[...new Set(items.flatMap(item=>item.missing))]};
}
export function calculateFollowingPatternEvidence(bazi:BaziAnalysis,context:FollowingPatternContext):FollowingPatternEvidence{
 const day=bazi.pillars.find(pillar=>pillar.label==='日柱')?.gan;if(!day||!STEM_ELEMENT[day])throw new Error('从格证据需要已确定的日干。');
 const month=bazi.pillars.find(pillar=>pillar.label==='月柱')?.zhi,possibleMonths=month?[month]:[...new Set(context.monthAuthority.segments.map(item=>item.monthBranch))];
 const facts={...context.facts,complete:context.facts.complete&&!context.timeUnknown&&bazi.pillars.length===4};
 const checks:FollowingPatternCheck[]=followingPatternSourceRules().map(source=>{
  const dayMatches=source.applicability.dayStems.includes(day),monthMatches=possibleMonths.some(value=>source.applicability.monthBranches.includes(value));
  const applicability:FollowingPatternCheck['applicability']=!dayMatches||!monthMatches?'not-applicable':month?'applicable':'possible';
  const criteria:FollowingPatternCriterion[]=source.criteria.map(criterion=>{
   const calculated=applicability!=='not-applicable'&&criterion.predicate?evaluateFollowingPatternPredicate(criterion.predicate,facts):undefined;
   return {id:criterion.id,name:criterion.name,role:criterion.role,scope:criterion.scope,...(criterion.predicate?{predicate:structuredClone(criterion.predicate)}:{}),result:calculated?.result??'not-implemented',sourceQuote:criterion.sourceQuote,sourceLocator:criterion.sourceLocator,observedEvidence:calculated?.observedEvidence||[],missing:[...criterion.unresolved,...(calculated?.missing||[]),...(!calculated?[applicability==='not-applicable'?'当前日干或月支不在本句范围，本项未据此判格。':'此项尚无明确可执行取法，保留原条件，不以自编阈值代替。']:[])]};
  });
  const supportedBy=criteria.filter(item=>item.role!=='exception'&&item.result==='met').map(item=>`${item.name}：已知事实符合。`);
  const opposedBy=criteria.filter(item=>item.role==='necessary'&&item.result==='not-met'||item.role==='exception'&&item.result==='met').map(item=>`${item.name}：${item.role==='necessary'?'与本条指定的软件字面条件不符':'已见本条指定的反对因素'}；作用域为${item.scope}，不否定其他取法。`);
  const missing=[...source.unresolved,...(source.context||[]).map(item=>`原文背景尚需对读：${item.sourceQuote}（${item.sourceLocator}）`),...criteria.flatMap(item=>item.missing),...(applicability==='possible'?['出生日期交节，月支待定；仅按可能月份保留本句证据。']:[]),...(context.ambiguous?['民用时刻重复，本次只取第一次；格局仍须人工复核。']:[])];
  const necessary=criteria.filter(item=>item.role==='necessary'),exceptions=criteria.filter(item=>item.role==='exception');
  let status:FollowingPatternCheck['status']='pending',statusExplanation='已列本句支持与缺失，未裁定从格成立。';
  if(applicability==='not-applicable'||source.candidatePolicy==='not-operationalized'){status='not-evaluated';statusExplanation='当前未按此句路径评估，不表示已经排除其他原句或流派。';}
  else if(opposedBy.length){status='contradicted';statusExplanation='仅本条指定的软件字面条件或已明示透干反证与已知事实不符；不证明原典所有条件已解释，也不否定其他从格取法。';}
  else if(source.candidatePolicy==='structure-only-eligible'&&applicability==='applicable'&&!context.timeUnknown&&!context.ambiguous&&necessary.length>0&&necessary.every(item=>item.result==='met')&&exceptions.every(item=>item.result==='not-met')){status='candidate';statusExplanation='仅本产品明干与所选藏干记录的字面结构候选；原典水项作用域、三夏背景气势与充分性未裁决，不称真从或成格。';}
  return {id:source.id,pattern:source.pattern,name:source.name,status,applicability,sourceId:SOURCE_ID,sourceQuote:source.sourceQuote,sourceLocator:source.sourceLocator,...(status==='candidate'?{candidateBasis:'literal-clause-only' as const}:{}),statusExplanation,criteria,supportedBy,opposedBy,missing,requiresManualReview:true};
 });
 for(const [pattern,name] of [['cong-sha','从杀'],['cong-er','从儿'],['cong-wang','从旺']] as const)checks.push({id:pattern+'-not-operationalized',pattern,name:name+'待独立取法',status:'not-evaluated',applicability:'not-applicable',sourceQuote:'',sourceLocator:'',statusExplanation:'尚未接入明确、可操作且可独立核查的同条原文条件；未套用从财规则。',criteria:[],supportedBy:[],opposedBy:[],missing:['本轮尚无足够来源支持该格的必要、反对与成立取法，继续分阶段整理。'],requiresManualReview:true});
 return {version:FOLLOWING_PATTERN_VERSION,profile:'qiongtong-literal-following-pattern-clauses',rules:followingPatternRules().rules,checks,limitations:[
  '限定原句的支持、反证和缺失分别记录；candidate仅是本产品明干与所选藏干记录的字面结构人工候选，不证明原典所有必要条件或充分性，不是成格或唯一命局结论。',
  '一片、旺度、纯杂、根气、成局、三夏气势等原文语义未形成明确操作口径时保留未核。',
  '缺失时刻不推定无印、无比、无水或无根；不使用扶抑加权占比、数量阈值或姓名笔画代替格局条件。',
  '从杀、从儿、从旺与真假从的完整裁决仍未实现，不把本轮从财规则推广为统一流派。',
  '本项不改变原系统喜用或姓名排序，不输出命运、财富、婚姻或人格断语。'
 ]};
}
