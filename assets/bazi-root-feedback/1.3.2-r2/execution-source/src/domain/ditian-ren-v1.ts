import tableData from '../../data/ditian-ren-table.json';
import {normalizeRenMethod,REN_METHOD} from '../shared/ren-method-v1';
import {resolveBirthContext} from '../shared/civil-birth';
import {resolveBirthCalculationClock} from '../shared/birth-time-basis';
import {calculateLegacyBazi} from './bazi-legacy';
import type {BaziAnalysis,BirthProfile,Element,RenActionContractResult,RenCommentaryAnalysis,RenRelation,RenSourceCaseMatch,RenSourceClaim,RenSourceReference,RenStructuralObservation,RenStructureEdge,RenStructureNode} from '../shared/types';

export const REN_COMMENTARY_VERSION='ditian-ren-commentary-2600158/1.0.0' as const;
export const REN_COMMENTARY_SOURCE_ID='bazi-ditian-ren-2600158';
const BAZI_VERSION='civil-midnight-fuyi-candidate/1.10.0;lunar-typescript/1.8.6';
const LABELS=['年柱','月柱','日柱','时柱'] as const,POSITIONS=['year','month','day','hour'] as const;
const ELEMENTS:Element[]=['木','火','土','金','水'],STEMS=[...'甲乙丙丁戊己庚辛壬癸'],BRANCHES=[...'子丑寅卯辰巳午未申酉戌亥'];
const STEM_ELEMENT:Record<string,Element>={甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
const BRANCH_ELEMENT:Record<string,Element>={子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};
const HIDDEN:Record<string,string[]>={子:['癸'],丑:['己','癸','辛'],寅:['甲','丙','戊'],卯:['乙'],辰:['戊','乙','癸'],巳:['丙','庚','戊'],午:['丁','己'],未:['己','丁','乙'],申:['庚','壬','戊'],酉:['辛'],戌:['戊','辛','丁'],亥:['壬','甲']};
const COMBINATIONS=['甲己','乙庚','丙辛','丁壬','戊癸'],COMBINATION_TARGET:Element[]=['土','金','水','木','火'];
const CLASHES=['子午','丑未','寅申','卯酉','辰戌','巳亥'];
const SANHE=['亥卯未','寅午戌','巳酉丑','申子辰'],SANHUI=['寅卯辰','巳午未','申酉戌','亥子丑'];
interface SourceClause {id:string;section:string;layer:string;quote:string;locator:string;}
interface SourceCase {id:string;section:string;pillars:string[];authorAssertion:string;authorLabels:string[];classificationEvidence:string;confidence:string;labelConfidence:'explicit'|'context-only'|'quarantined';sourceQuote:string;sourceLocator:string;quarantines:{code:string;reason:string;scope:string;scanPage?:number}[];}
interface Contract {id:string;name:string;sourceClauseIds:string[];sourceSupplementalIds:string[];sourceCaseIds:string[];scope:string;decisionRole:string;limitations:string[];}
interface GraphContract {id:string;sourceClauseId:string;premises:string[];result:string[];guards:string[];sourceCaseConstraints:string[];}
interface GraphClaim {id:string;pillars:string[];authorEffect:{quote:string;sourceLocator:string};scopeNote:string;notGeneralSufficientPredicate:boolean;}
interface RenTable {version:string;profileId:string;sourceId:string;authority:string;clauses:SourceClause[];supplementalExcerpts:SourceClause[];cases:SourceCase[];contracts:Contract[];limits:string[];graphClauses?:SourceClause[];graphContracts?:GraphContract[];graphSourceClaims?:GraphClaim[];}
const TABLE=tableData as RenTable;
const GENERAL_POLICY=[
  '独立任注固定电子版：正文、原注、任注及编校补句分层，不移入《穷通宝鉴》条件或姓名排序。',
  '结构成员只证明存在与位置，所有候选生克合冲会边的有效作用仍未知；不以出现即注销根、印或比劫。',
  '作者标签只对应原书相同四柱；未匹配、章节上下文或疑文不能变成任意新盘的成格或否定结论。',
  '不使用旺度分数、数量比例、38%/55%扶抑阈值或AI自由推断；原书人生断语不作为结果。'
];
const SELECTED_RELATION_TABLE:RenSourceReference={id:'ren-selected-hidden-and-tengod-table',sourceId:'bazi-evidence-lunar186',section:'lunar-typescript1.8.6固定藏干与十神表',layer:'selected-electronic-table',quote:'ZHI_HIDE_GAN',locator:'data/raw/bazi-evidence-lunar-LunarUtil.ts:928–1043'};
/** Fixed Chinese wording for project research contracts; original source quotations stay unchanged. */
const CONTRACT_CHINESE:Record<string,string>={
  'same-element root vocabulary selected':'已选定同五行藏干的潜在根词汇范围',
  'branch observed':'已观测到实际地支柱位',
  'root present does not imply effective support':'根候选存在不等于有效生扶',
  'no removal from absence of same-stem hidden string':'未见同一天干藏字，不足以删除根联系',
  'do not assign numeric strength':'不赋予自编旺度分数',
  'potential-root-of(stem,branch)':'列出天干与所载地支藏干的潜在根联系',
  'literal heavy/light source category only':'只保留原文根气轻重的文字类别，不作定量判断',
  'known same-pillar stem/branch':'同一柱的天干与地支位置均已确定',
  '切 is priority not sufficient effective support':'原文“切”说明同柱关系应优先审察，不足以证明有效生扶',
  'distant edges remain available but unresolved':'远隔关系仍保留为候选，其有效作用待审',
  'record covered-by / carried-by and source priority':'记录同柱天干覆盖与地支承载的位置关系及原文审察顺序',
  'potential root exists':'已见潜在根联系',
  'effective support/clash attack on supporting branch independently proven':'对载根地支的有效生扶或冲克已独立证明',
  'clash-strength and rescue dependencies satisfied':'冲克力量与救应前提均已查明',
  'branch clash pair alone cannot erase hidden stem':'仅有地支六冲成员不能删除其中藏干',
  'effect cannot be proven by formation it is meant to prove':'不能用待判格局成立反过来证明其作用前提',
  'root support strengthened or root link damaged according to proof':'按独立证据判断根的生扶增强或联系受损',
  'preserve original node':'保留原有字位节点',
  'literal clash exists':'已见地支六冲成员',
  'source/target relative strength and season independently qualified':'冲克双方的相对力量及季节作用已独立核定',
  'all relevant rescue/suppression/drain evidence resolved':'相关救应、制伏和泄气证据均已查明',
  'monthBranch equality not equivalent得令有力':'月支相同不等于已经证明得令有力',
  'unresolved救应 means effectivenessunknown':'救应尚未查明时，有效冲克继续待审',
  'directional effective clash / removal only if force dependency proven':'只有力量等前提独立成立，才能判断有效冲克方向或具体联系失效',
  'resource node observed':'已观测到印星字位',
  'wealth controls resource member relation':'已见财星五行克印星的成员关系',
  'wealth effective capability proven':'财星的有效制伏能力已独立证明',
  'resource target exposed/hidden and reachability proved':'印星目标的明藏位置及实际作用可达性已证明',
  'no protection/redirection remains unresolved':'保护或转向作用均已查明，没有未决因素',
  '财官当令+日弱 source prerequisites cannot be omitted':'不得省略原文财官得时当令、日主虚弱等前提',
  'wealth presence cannot self-prove damage':'财星存在不能自行证明破印有效',
  'do not turn case quote into arbitrary chart predicate':'不能把单例解释直接改成任意新盘的判据',
  'disable specific resource→daymaster supporting edge, not resource node itself':'只限制具体印星对日主的生扶联系，不删除印星字位本身',
  'specific resource damage mechanism proven':'具体破印机制已经独立证明',
  'officer bridge or peer restraint or unblock edge independently effective':'官星通关、比劫制财或解除阻断的具体作用已独立证明',
  '官/比劫 presence alone insufficient':'仅见官星或比劫不足以证明救应有效',
  '冲开合住 and合化冲坏 are different mechanisms,not interchangeable':'冲开合住与合化冲坏属于不同机制，不能互相替代',
  'restore specific support reachability after its actual blocker relieved':'实际阻断解除后，才恢复具体生扶联系的可达性',
  'water overgrowth / wood inability to receive independently qualified':'水势过盛及木不能受生的条件已独立核定',
  'effective earth→water restraint proven':'土制水的有效作用已独立证明',
  'no numberthreshold forwaterovergrowth':'不以自编数量阈值判断水势过盛',
  'presenceearth!=effectiveearth':'土字存在不等于土能够有效制水',
  'wood can receive water / potential root support restored':'在相应作用成立后，才判断木能受水生或根的生扶联系恢复',
  'branch human element observed':'已观测到地支所藏人元位置',
  'source-bound activation/leading exposed contributor observed':'符合本条取法范围的天干引助位置已核定',
  'season source and exceptions resolved':'季节作用及原文例外均已查明',
  'do not require all effective wealth exposed;child-bing-chou contradicts':'不要求有效财星一律透干；丙火丑月从儿源例以丑藏辛财为用',
  'do not assume allmonthhidden jointly司令':'不假定月支全部藏干同时司令',
  'monthmainqi-only child veto prohibited':'不能仅凭月支本气不是食伤便否定从儿',
  'record activated-by relation and exact source scope':'记录引助候选及其对应的原文范围',
  'daymaster exposed combination pair observed':'已见日主参与的明干五合成员',
  'effective seasonal target/root/counterforce graph resolved':'所化五行的季节、根气及逆势作用均已核定',
  'formation proven independently':'合化成立已由独立判据证明',
  'never use既合而化 consequence to prove formation premise':'不能用“既合而化”之后的结论循环证明合化前提',
  'extra competingstems not automatictrueorfalse':'额外同类或相同合干不自动判成格或破格',
  'extra peer occurrence cannot veto already proven transformation':'已经独立证明的合化，不因额外比劫出现而被机械否定',
  'specific2/3branchmembers observed':'已见本条所论支组中的两个或三个成员',
  'adjacency/intervening nodes observed':'成员的相邻、隔柱及中间字位已记录',
  'leadingstem/counterclashresolutionavailable':'天干引出与反向冲克等条件已经查明',
  'two-member with other pillar between without leader meanslimited per clause':'两支隔位且无天干领出时，按本条保留作用限制，不能直接判成局',
  'not all branches transform automatically':'地支成员出现不自动证明合化',
  'support candidate branch cooperation edges':'列出地支会合的候选联系',
  'resource/officerorothermediatingpair recognized':'已识别印星、官杀等可能参与通关的成员关系',
  'actual same/different layer and interveningnodes recorded':'实际明暗层位及中间字位已记录',
  'not all distance>1 edges blocked':'不能把所有隔柱关系一律判为无效',
  'only exact-source case may assert effective isolation until predicate adopted':'通用判据尚未采用时，有效阻隔只可作为相同源例的作者解释',
  'identify potential path or explicit source-claimed isolation':'列出潜在通关路径，或单列相同源例中作者所说的阻隔'
};
const CLAIM_SCOPE_CHINESE:Record<string,string>={
  'root-loss-clash':'作者称此例寅印之根被冲拔；相邻寅申只作成员事实，不自编冲克力量阈值。',
  'clash-root-protected':'作者称此例丙火盖申使冲无力；不把所有相邻冲都当作拔根。',
  'clash-root-lost-with-rescue':'作者在同例中并列根受冲损与水的救应；原有根节点仍须保留。',
  'distant-store-no-clash':'本例明确提示远隔冲成员未必有效；不能与普遍的遥冲动说法互相替代。',
  'root-in-wei-damaged':'这里只保留作者对未中藏根受损的解释；不以大运改造原出生四柱。',
  'resource-wealth-damage':'作者称此例乙印受辛财克、所载亥支受巳冲；有效破印包含多项前提。',
  'root-long-distance-motion':'本例年申与时寅并不相邻；作者所说遥动不能推广为所有远隔作用均有效。',
  'fire-root-missing':'保留同书对照例中的根气、寒暖及其他柱位差别，不只比较单个字。',
  'remote-water-protected-fire':'作者称此例壬水生乙而不克年丙，中间还有己土；不推广为固定作用距离。',
  'near-water-damages-fire':'本例月、时之间有日干乙，作者仍说作用相近；相近不能只按紧邻柱位定义。',
  'author-far-control-exists':'作者明确称年癸克时丁，用以保留远隔有效作用的源例边界，不设普遍紧邻门槛。',
  'transformation-peer-controlled':'作者同时论及明干与藏干制化；不能仅数额外甲乙便否定化象。',
  'transformation-remote-resource-unable':'作者称远隔且无根的制伏不能奏效，同时仍称化象真；两项主张分别保留。',
  'false-transformation-water-cold':'丙火与土有五行相生成员关系，但作者称寒水使其不能生扶；不能只凭相生顺序判断有效。',
  'child-hidden-wealth-effective':'作者用藏财而不要求透干；本例反对把所有藏干作用都设为必须同字透出。',
  'child-exposed-wealth-root-weak':'财星透出不必比藏财更有效；原作者仍取从儿，明暗位置与作用解释分开。'
};
function chineseContract(text:string):string {const translated=CONTRACT_CHINESE[text];if(!translated)throw new Error('任注项目合同缺少固定中文释义：'+text);return translated;}
const RELATION_LABEL:Record<RenRelation,string>={peer:'比劫',resource:'印',output:'食伤',wealth:'财',officer:'官杀'};
const mod=(n:number,d=5)=>((n%d)+d)%d;
function relation(day:string,other:string):RenRelation {const a=ELEMENTS.indexOf(STEM_ELEMENT[day]),b=ELEMENTS.indexOf(STEM_ELEMENT[other]);return a===b?'peer':mod(a+1)===b?'output':mod(a+2)===b?'wealth':mod(a+3)===b?'officer':'resource';}
function tenGod(day:string,other:string):string {const r=relation(day,other),same=STEMS.indexOf(day)%2===STEMS.indexOf(other)%2;return r==='peer'?same?'比肩':'劫财':r==='resource'?same?'偏印':'正印':r==='output'?same?'食神':'伤官':r==='wealth'?same?'偏财':'正财':same?'七杀':'正官';}
function sourceRef(clause:SourceClause):RenSourceReference{return {id:clause.id,sourceId:REN_COMMENTARY_SOURCE_ID,section:clause.section,layer:clause.layer,quote:clause.quote,locator:clause.locator};}
function refsFor(contractId:string):RenSourceReference[]{const contract=TABLE.contracts.find(item=>item.id===contractId);if(!contract)throw new Error('任注结构合同缺失。');const ids=[...contract.sourceClauseIds,...contract.sourceSupplementalIds];return ids.map(id=>{const clause=[...TABLE.clauses,...TABLE.supplementalExcerpts].find(item=>item.id===id);if(!clause)throw new Error('任注结构合同引用原句缺失。');return sourceRef(clause);});}
function tableGate(){if(TABLE.version!==REN_COMMENTARY_VERSION||TABLE.profileId!==REN_COMMENTARY_VERSION||TABLE.sourceId!==REN_COMMENTARY_SOURCE_ID||TABLE.authority!=='ren-commentary'||TABLE.cases.length!==42||TABLE.clauses.length!==15||TABLE.contracts.length!==10||TABLE.graphClauses?.length!==29||TABLE.graphContracts?.length!==11||TABLE.graphSourceClaims?.length!==16||new Set(TABLE.cases.map(item=>item.id)).size!==42)throw new Error('任注独立取法固定资料不完整。');for(const contract of TABLE.graphContracts)for(const text of [...contract.premises,...contract.guards,...contract.result])chineseContract(text);for(const claim of TABLE.graphSourceClaims)if(!CLAIM_SCOPE_CHINESE[claim.id])throw new Error('任注源例作用范围缺少固定中文释义：'+claim.id);}
function graphRefs(ids:string[]):RenSourceReference[]{return ids.map(id=>{const found=TABLE.graphClauses?.find(clause=>clause.id===id);if(!found)throw new Error('任注有向作用合同原句缺失：'+id);return sourceRef(found);});}
export type RenDependencyState='met'|'not-met'|'unknown'|'conflict';
export interface RenDependencyInput {id:string;observed?:RenDependencyState;premises:string[];inhibitors:string[];}
/** Missing proof and cycles remain unknown; contradictions are never resolved by majority vote. */
export function resolveRenDependencies(input:RenDependencyInput[]):Record<string,{state:RenDependencyState;cycleDetected:boolean}> {
  const map=new Map(input.map(item=>[item.id,item]));if(map.size!==input.length)throw new Error('任注依赖编号重复。');
  for(const item of input){if(!item.id||item.observed&&!['met','not-met','unknown','conflict'].includes(item.observed)||[...item.premises,...item.inhibitors].some(id=>!map.has(id)))throw new Error('任注依赖引用或状态无效。');}
  const result:Record<string,{state:RenDependencyState;cycleDetected:boolean}>={};
  const visit=(id:string,path:string[]):{state:RenDependencyState;cycleDetected:boolean}=>{
    if(result[id])return result[id];if(path.includes(id))return{state:'unknown',cycleDetected:true};const item=map.get(id)!;
    if(item.observed==='conflict')return result[id]={state:'conflict',cycleDetected:false};
    const dependencies=[...item.premises.map(ref=>({kind:'premise',value:visit(ref,[...path,id])})),...item.inhibitors.map(ref=>({kind:'inhibitor',value:visit(ref,[...path,id])}))];
    const cycleDetected=dependencies.some(value=>value.value.cycleDetected),conflict=dependencies.some(value=>value.value.state==='conflict');
    if(conflict)return result[id]={state:'conflict',cycleDetected};
    const defeated=dependencies.some(value=>value.kind==='premise'&&value.value.state==='not-met'||value.kind==='inhibitor'&&value.value.state==='met');
    if(defeated)return result[id]={state:item.observed==='met'?'conflict':'not-met',cycleDetected};
    if(cycleDetected||dependencies.some(value=>value.value.state==='unknown'))return result[id]={state:'unknown',cycleDetected};
    return result[id]={state:item.observed??(item.premises.length?'met':'unknown'),cycleDetected};
  };
  for(const item of input)visit(item.id,[]);return result;
}

/** Returns all original occurrences. A missing or quarantined example never supplies a generic negative verdict. */
export function matchRenSourceCases(pillars:readonly string[],complete=true):RenSourceCaseMatch[] {
  tableGate();if(!complete||pillars.length!==4)return [];
  return TABLE.cases.filter(item=>item.pillars.every((ganzhi,index)=>ganzhi===pillars[index])).map(item=>({caseId:item.id,section:item.section,pillars:[...item.pillars],authorAssertion:item.authorAssertion,authorLabels:[...item.authorLabels],classificationEvidence:item.classificationEvidence,confidence:item.confidence,labelConfidence:item.labelConfidence,status:item.quarantines.length?'quarantined':item.labelConfidence==='context-only'?'chapter-context':'author-labelled-example',sourceQuote:item.sourceQuote,sourceLocator:item.sourceLocator,quarantines:structuredClone(item.quarantines),interpretationPolicy:['原作者对本张记录四柱的文字分类，不是软件对任意新盘独立推导的结论。',...(item.quarantines.length?['本例存在校勘或历算隔离项，不作为完整真假标签或生日历算金标准。']:[]),...(item.labelConfidence==='context-only'?['只保留章节上下文，不改写成原文明确假从或假化。']:[])]}));
}

/** Source-bound structure graph. Effective actions deliberately require further adopted interpretation rules. */
export function calculateRenCommentary(profile:BirthProfile,bazi:BaziAnalysis):RenCommentaryAnalysis|undefined {
  if(normalizeRenMethod(profile.renMethod)!==REN_METHOD)return undefined;
  tableGate();if(bazi.version!==BAZI_VERSION)throw new Error('任注独立参考需要启用任注的1.10出生盘，不得嫁接未启用或旧版快照。');
  const ordered=LABELS.map(label=>bazi.pillars.find(pillar=>pillar.label===label));
  if(bazi.pillars.length!==ordered.filter(Boolean).length||ordered.some(pillar=>pillar&&(!STEMS.includes(pillar.gan)||!BRANCHES.includes(pillar.zhi))))throw new Error('任注输入仅接受唯一且有效的已确定四柱。');
  const day=ordered[2]?.gan,month=ordered[1]?.zhi,complete=ordered.every(Boolean)&&!profile.timeUnknown;
  const nodes:RenStructureNode[]=[];
  ordered.forEach((pillar,index)=>{if(!pillar)return;const add=(layer:RenStructureNode['layer'],symbol:string,order?:number)=>{const isDayMaster=index===2&&layer==='exposed';nodes.push({id:`${POSITIONS[index]}:${layer}:${order??symbol}`,pillar:LABELS[index],position:POSITIONS[index],layer,symbol,element:layer==='branch'?BRANCH_ELEMENT[symbol]:STEM_ELEMENT[symbol],...(layer==='hidden'?{branch:pillar.zhi,hiddenOrder:order}:{}),...(day&&layer!=='branch'?{relation:relation(day,symbol),tenGod:isDayMaster?'日主':tenGod(day,symbol)}:{}),isDayMaster,effectiveSupport:'unknown'});};add('exposed',pillar.gan);add('branch',pillar.zhi);HIDDEN[pillar.zhi].forEach((stem,order)=>add('hidden',stem,order+1));});
  const exposed=nodes.filter(node=>node.layer==='exposed'),stemNodes=nodes.filter(node=>node.layer!=='branch'),branches=nodes.filter(node=>node.layer==='branch');
  const observations:RenStructuralObservation[]=[];
  const observe=(id:string,contractId:string,name:string,selected:RenStructureNode[],scope:string,known:boolean,evidence:string[],missing:string[]=[])=>{observations.push({id,contractId,name,state:selected.length?'present':known?'not-listed':'unknown',scope,nodeIds:selected.map(node=>node.id),positions:selected.map(node=>`${node.pillar}${node.layer==='hidden'?`${node.branch}藏${node.symbol}`:node.symbol}`),evidence,missing:[...missing,...(!known&&!selected.length?['相应出生柱或日主不完整，已知位置未见不证明没有。']:[])],sourceReferences:[...refsFor(contractId),{...SELECTED_RELATION_TABLE}],interpretationPolicy:['只核本条声明范围的成员、位置或必要措辞，不判有效性或充分成格。','藏干次序与十神分类取明示电子表，未将该表冒作任注自带的完整有效根气算法。']});};
  for(const r of ['peer','resource','output','wealth','officer'] as const)for(const layer of ['exposed','hidden'] as const){const selected=stemNodes.filter(node=>node.layer===layer&&node.relation===r&&!node.isDayMaster);observe(`relation:${r}:${layer}`,'relation-positions',`${layer==='exposed'?'明干':'藏干'}${RELATION_LABEL[r]}位置`,selected,`${layer==='exposed'?'非日主明干':'所选lunar-typescript1.8.6藏干表'}的${RELATION_LABEL[r]}；日干自身不计额外比劫`,!!day&&complete,[selected.length?`见${selected.length}个位置，只记录事实而非力量。`:'在当前所列位置未见。']);}
  const monthNodes=stemNodes.filter(node=>node.position==='month'),monthExposed=monthNodes.filter(node=>node.layer==='exposed'&&node.relation==='output'),monthHidden=monthNodes.filter(node=>node.layer==='hidden'&&node.relation==='output'),monthMain=monthNodes.filter(node=>node.layer==='hidden'&&node.hiddenOrder===1&&node.relation==='output');
  observe('child:month-exposed-output','child-month-food-observation','提纲食伤观察 · 月干',monthExposed,'月干明透的食伤位置；不独自解释提纲',!!day&&!!month,['月干、本气及全藏分开列出。'],['提纲的完整操作范围尚未采用，月干未见不能拒绝从儿。']);
  observe('child:month-main-output','child-month-food-observation','提纲食伤观察 · 月支本气',monthMain,'所选藏干表月支第1位本气；不是唯一提纲定义',!!day&&!!month,['本气仅取所选表第1位，不代替全部月支或任氏有效月令。'],['甲丑、戊辰源例提示不能把本气非食伤作普遍一票否定。']);
  observe('child:month-all-hidden-output','child-month-food-observation','提纲食伤观察 · 月支全藏',monthHidden,'月支全部所选藏干食伤',!!day&&!!month,['藏干位置不等于透干或有效司权。'],['食伤在提纲的最终语义仍未完整裁决。']);
  for(const layer of ['exposed','hidden'] as const)observe(`child:wealth:${layer}`,'child-wealth-observation',`从儿财星 · ${layer==='exposed'?'明干':'藏干'}`,stemNodes.filter(node=>node.layer===layer&&node.relation==='wealth'&&!node.isDayMaster),`${layer==='exposed'?'明干':'藏干'}财星分别记录，不要求财一定透出`,!!day&&complete,['局中有财是原文必要措辞；位置存在不是有效生育或充分条件。']);
  observe('child:peer-no-veto','child-peer-does-not-veto','额外比劫观察，不单独否定从儿',stemNodes.filter(node=>node.relation==='peer'&&!node.isDayMaster),'比劫明藏位置；不套从财杀孤弱无扶条件',!!day&&complete,['有比劫本身不生成从儿破格结论。']);
  observe('wang-strong:peer-resource','wang-strong-name-preservation','从旺／从强的比印组成',stemNodes.filter(node=>['peer','resource'].includes(node.relation??'')&&!node.isDayMaster),'从旺与从强名称分开；比印位置不转强度分',!!day&&complete,['从旺允许印，未把八字每字皆比劫当硬条件。'],['旺极、强极与日主当令的有效判断未采用。']);
  observe('wang-strong:wealth-officer','wang-strong-name-preservation','从旺／从强的财官位置',stemNodes.filter(node=>['wealth','officer'].includes(node.relation??'')),'财官明藏位置和无效一票否定分开',!!day&&complete,['存在财官不自行注销从旺、从强源例解释。'],['财官是否有效、虚实及制化尚未裁决。']);
  observe('transformation:chen-no-veto','transformation-no-chen-veto','辰字观察，不作真化硬门槛',branches.filter(node=>node.symbol==='辰'),'四支辰成员观察，不套原注到任注',complete,['辰缺失不单独否定任注化象；存在也不证明化气。']);
  observe('transformation:rivals-no-veto','transformation-no-rival-veto','同类与争合位置，不单独否定化象',exposed.filter(node=>node.relation==='peer'&&!node.isDayMaster),'额外明干同类位置，不将出现等同争合破化',!!day&&complete,['额外比劫、同一合干出现本身不自动拒绝任注真化。']);
  if(TABLE.graphClauses?.length){
    const dayBranch=ordered[2]?.zhi,specific=day&&dayBranch&&['甲午','己亥','癸巳'].includes(day+dayBranch);
    const hiddenPartner=day?nodes.filter(node=>node.position==='day'&&node.layer==='hidden'&&COMBINATIONS.some(pair=>pair===day+node.symbol||pair===node.symbol+day)):[];
    observe('transformation:hidden-shortcut','day-combination-members','坐支藏干相合的特定非化格捷径限制',specific?hiddenPartner:[],'仅甲午、己亥、癸巳三种源文明确列举；不推广所有藏合禁止',!!day&&!!dayBranch,[specific?'命中源文列举：不能把此坐支藏干的五合成员直接当日主化格。':'未命中三种特定列举，不反推其他藏合成立。']);
    observations.at(-1)!.sourceReferences=graphRefs(['hidden-combination-specific','hidden-combination-not-huage']);
  }
  const edges:RenStructureEdge[]=[];
  const edge=(kind:RenStructureEdge['kind'],from:RenStructureNode[],to:RenStructureNode[],direction:RenStructureEdge['direction'],contractId:string,memberFacts:string[],extras:Partial<RenStructureEdge>={})=>{
    const participants=[...from,...to];edges.push({id:`edge:${kind}:${participants.map(node=>node.id).join('|')}`,kind,from:from.map(node=>node.id),to:to.map(node=>node.id),direction,...(participants.length===2?{distance:Math.abs(POSITIONS.indexOf(participants[0].position)-POSITIONS.indexOf(participants[1].position))}:{}),dayMasterParticipates:participants.some(node=>node.isDayMaster),...(month?{monthBranch:month}:{}),exposedHidden:participants.map(node=>`${node.pillar}:${node.layer}`),memberFacts,effectiveAction:'unknown',dependencies:[{id:'action-season-and-strength',state:'unresolved',description:'季节、旺衰、根气与来源作用范围未形成完整可执行定义。'},{id:'action-interference-and-rescue',state:'unresolved',description:'需核位置、透藏、合克先后及救应；成员关系不等于有效作用或取消节点。'}],sourceReferences:refsFor(contractId),interpretationPolicy:['有向生克为五行关系候选；合冲会为成员事实。不得依此注销印比、拔根、成局或判化。'],...extras});
  };
  for(const a of stemNodes)for(const b of stemNodes){if(a.id===b.id)continue;const ai=ELEMENTS.indexOf(a.element),bi=ELEMENTS.indexOf(b.element);if(mod(ai+1)===bi)edge('generates',[a],[b],'directed','relation-positions',[`${a.pillar}${a.symbol}${a.layer==='hidden'?'（藏）':''}五行生${b.pillar}${b.symbol}${b.layer==='hidden'?'（藏）':''}。`],{outputDrainElement:b.element});if(mod(ai+2)===bi)edge('controls',[a],[b],'directed','relation-positions',[`${a.pillar}${a.symbol}${a.layer==='hidden'?'（藏）':''}五行克${b.pillar}${b.symbol}${b.layer==='hidden'?'（藏）':''}；尚未证明有效制伏。`]);}
  for(let a=0;a<exposed.length;a++)for(let b=a+1;b<exposed.length;b++){const x=exposed[a],y=exposed[b],index=COMBINATIONS.findIndex(pair=>pair===x.symbol+y.symbol||pair===y.symbol+x.symbol);if(index<0)continue;edge('stem-combination',[x],[y],'symmetric','day-combination-members',[`${x.pillar}${x.symbol}与${y.pillar}${y.symbol}是五合成员；${x.isDayMaster||y.isDayMaster?'日主参与':'非日主两干相合，不作日主化格'}。`],{combinationTargetElement:COMBINATION_TARGET[index]});}
  for(let a=0;a<branches.length;a++)for(let b=a+1;b<branches.length;b++){const x=branches[a],y=branches[b];if(CLASHES.some(pair=>pair===x.symbol+y.symbol||pair===y.symbol+x.symbol))edge('branch-clash',[x],[y],'symmetric','branch-complete-set',[`${x.pillar}${x.symbol}与${y.pillar}${y.symbol}六冲成员出现；冲根是否成立仍未知。`]);}
  for(const [groups,kind] of [[SANHE,'branch-sanhe'],[SANHUI,'branch-sanhui']] as const)for(const group of groups)if([...group].every(symbol=>branches.some(node=>node.symbol===symbol))){const selected=branches.filter(node=>group.includes(node.symbol));edge(kind,selected,[],'group','branch-complete-set',[`${[...group].join('、')}成员齐备，记录全部实际柱位；不宣告成局、化气或根被取消。`]);}
  if(TABLE.graphClauses?.length){
    for(const stem of exposed)for(const root of nodes.filter(node=>node.layer==='hidden'&&node.element===stem.element)){
      edge('potential-root',[stem],[root],'directed','relation-positions',[`${stem.pillar}${stem.symbol}与${root.pillar}${root.branch}藏${root.symbol}同五行，仅列潜在根联系。`]);
      const last=edges.at(-1)!;last.sourceReferences=graphRefs(['root-candidate-store','root-support-damage']);last.dependencies.push({id:'root-link-effective',state:'unresolved',description:'同五行藏干是所选根词汇成员；有效根气、冲克和救应须独立证明，不能因此生扶或注销。'});
    }
    for(const stem of exposed){const branch=branches.find(node=>node.position===stem.position)!;
      edge('cover-carrier',[stem],[branch],'symmetric','relation-positions',[`${stem.pillar}${stem.symbol}覆${branch.symbol}，${branch.symbol}载${stem.symbol}：同柱上下位置事实。`]);edges.at(-1)!.sourceReferences=graphRefs(['cover-carrier','root-support-damage']);
    }
    for(const item of edges){
      if(item.kind==='branch-clash')item.sourceReferences=[...TABLE.supplementalExcerpts.filter(clause=>['ren-clash-eight-members','ren-clash-store-members','ren-clash-general-premise'].includes(clause.id)).map(sourceRef),...graphRefs(['tight-remote-clash','clash-strength-premise','clash-rescue-premise'])];
      if(item.kind==='controls'){item.sourceReferences=[...item.sourceReferences,...graphRefs(['root-support-damage','false-follow-flow'])];item.dependencies.push({id:'wealth-officer-season-day-strength',state:'unresolved',description:'财官得时当令、日主虚弱和实际可达/救应未证；财克印成员不能自证破印，官克比劫成员不能自证取消帮身。'});}
      if(item.kind==='generates')item.sourceReferences=[...item.sourceReferences,...graphRefs(['root-support-damage','month-exposed-link','bridging-isolation'])];
      if(item.kind==='stem-combination')item.sourceReferences=[...item.sourceReferences,...graphRefs(['form-then-rivalry'])];
      if(item.kind==='branch-sanhe'||item.kind==='branch-sanhui')item.sourceReferences=[...item.sourceReferences,...graphRefs(['half-combination-distance'])];
    }
  }
  const dayCombinationEdges=edges.filter(item=>item.kind==='stem-combination'&&item.dayMasterParticipates),otherCombinationEdges=edges.filter(item=>item.kind==='stem-combination'&&!item.dayMasterParticipates);
  for(const [id,name,selected] of [['day-combination:own','日主参与五合成员',dayCombinationEdges],['day-combination:other','其余明干五合成员',otherCombinationEdges]] as const){const selectedNodes=[...new Set(selected.flatMap(item=>[...item.from,...item.to]))].map(id=>nodes.find(node=>node.id===id)!);observe(id,'day-combination-members',name,selectedNodes,'只看明确明干配对；日主参与和其余干配对分开',!!day&&complete,['候选所化五行与食伤泄秀五行使用不同字段，不混称化神。']);}
  const groups=edges.filter(item=>item.kind==='branch-sanhe'||item.kind==='branch-sanhui');observe('branch:complete-groups','branch-complete-set','三合三会全成员位置',[...new Set(groups.flatMap(item=>item.from))].map(id=>nodes.find(node=>node.id===id)!),'完整支组成员事实，重复支不代替缺支',complete,['只记录已齐成员，不判力量、合化或取消根气。']);
  const matches=matchRenSourceCases(ordered.map(pillar=>pillar?pillar.gan+pillar.zhi:''),complete);
  const sourceClaims:RenSourceClaim[]=matches.map(match=>({caseId:match.caseId,label:'本张原书四柱的结构解释（作者主张）',quote:match.sourceQuote,locator:match.sourceLocator,scope:'exact-source-case-only',effectiveAction:'source-claim',nodeIds:nodes.map(node=>node.id),edgeIds:[],quarantined:match.quarantines.length>0,interpretationPolicy:['只转录本例结构解释，不将其泛化到新盘或改写候选边的有效状态。','作者关于根、印、比劫或合化的说法不自动删除任何结构节点。']}));
  if(complete)for(const claim of TABLE.graphSourceClaims??[]){if(!claim.pillars.every((ganzhi,index)=>ganzhi===ordered[index]!.gan+ordered[index]!.zhi))continue;sourceClaims.push({caseId:claim.id,label:'同四柱的具体作用解释（作者主张）',quote:claim.authorEffect.quote,locator:claim.authorEffect.sourceLocator,scope:'exact-source-case-only',effectiveAction:'source-claim',nodeIds:nodes.map(node=>node.id),edgeIds:[],quarantined:false,interpretationPolicy:['本句只说明作者对这张原书四柱的具体作用解释，不是普遍充分判据。',CLAIM_SCOPE_CHINESE[claim.id]]});}
  const actionContracts:RenActionContractResult[]=(TABLE.graphContracts??[]).map(contract=>{
    const linked=contract.id==='root-candidate'||contract.id==='resource-root-survival'||contract.id==='root-vs-mass'?edges.filter(item=>item.kind==='potential-root'):contract.id==='carrier-priority'?edges.filter(item=>item.kind==='cover-carrier'):contract.id==='clash-direction'?edges.filter(item=>item.kind==='branch-clash'):contract.id==='combination-formation'?edges.filter(item=>item.kind==='stem-combination'&&item.dayMasterParticipates):contract.id==='source-half-combination'?edges.filter(item=>item.kind==='branch-sanhe'||item.kind==='branch-sanhui'):contract.id==='resource-damage'?edges.filter(item=>item.kind==='controls'&&item.to.some(id=>nodes.find(node=>node.id===id)?.relation==='resource')):contract.id==='resource-restoration'||contract.id==='same-layer-bridge'?edges.filter(item=>item.kind==='generates'):[];
    const observedIds=[...new Set(linked.flatMap(item=>[...item.from,...item.to]))];
    const sourceRefs=graphRefs([contract.sourceClauseId]);
    const partialGroupMembers=[...SANHE,...SANHUI].flatMap(group=>{const selected=branches.filter(node=>group.includes(node.symbol));return new Set(selected.map(node=>node.symbol)).size>=2?selected:[];});
    const literalPremise=(description:string):RenDependencyState=>{
      if(description==='same-element root vocabulary selected')return 'met';
      if(description==='branch observed'&&branches.length)return 'met';
      if(description==='known same-pillar stem/branch'&&exposed.some(stem=>branches.some(branch=>branch.position===stem.position)))return 'met';
      if(description==='potential root exists'&&edges.some(item=>item.kind==='potential-root'))return 'met';
      if(description==='literal clash exists'&&edges.some(item=>item.kind==='branch-clash'))return 'met';
      if(description==='resource node observed'&&stemNodes.some(node=>node.relation==='resource'))return 'met';
      if(description==='wealth controls resource member relation'&&edges.some(item=>item.kind==='controls'&&item.from.some(id=>nodes.find(node=>node.id===id)?.relation==='wealth')&&item.to.some(id=>nodes.find(node=>node.id===id)?.relation==='resource')))return 'met';
      if(description==='branch human element observed'&&nodes.some(node=>node.layer==='hidden'))return 'met';
      if(description==='daymaster exposed combination pair observed'&&dayCombinationEdges.length)return 'met';
      if(description==='specific2/3branchmembers observed'&&partialGroupMembers.length)return 'met';
      if(description==='adjacency/intervening nodes observed'&&partialGroupMembers.length&&complete)return 'met';
      if(description==='resource/officerorothermediatingpair recognized'&&edges.some(item=>item.kind==='generates'&&[...item.from,...item.to].some(id=>['resource','officer'].includes(nodes.find(node=>node.id===id)?.relation??''))))return 'met';
      if(description==='actual same/different layer and interveningnodes recorded'&&complete&&linked.length)return 'met';
      return 'unknown';
    };
    const premiseDependencies=contract.premises.map((description,index)=>({id:`${contract.id}:premise:${index}`,state:literalPremise(description),description:chineseContract(description)}));
    const inhibitorDependencies=contract.guards.map((description,index)=>({id:`${contract.id}:guard:${index}`,state:'unknown' as RenDependencyState,description:chineseContract(description)}));
    // A present member can prove a literal prerequisite only. Every effective-action contract
    // retains at least one independent semantic prerequisite with unknown truth.
    const proof:RenDependencyInput[]=[...premiseDependencies,...inhibitorDependencies].map(item=>({id:item.id,observed:item.state,premises:[],inhibitors:[]}));
    proof.push({id:contract.id,premises:premiseDependencies.map(item=>item.id),inhibitors:inhibitorDependencies.map(item=>item.id)});
    const resolved=resolveRenDependencies(proof)[contract.id];
    const names:Record<string,string>={'root-candidate':'潜在根联系','carrier-priority':'同柱覆载优先位置','resource-root-survival':'根的生扶、冲克与救应','clash-direction':'冲的力量与作用方向','resource-damage':'财破印的有效前提','resource-restoration':'印受制后的救应恢复','root-vs-mass':'水木承受与土止水','hidden-effective':'藏干引助与月令作用','combination-formation':'先证合化再论争合','source-half-combination':'二支会合的邻隔与引出','same-layer-bridge':'通关的层位与隔神'};
    return {id:contract.id,name:names[contract.id]??contract.id,state:resolved.state,sourceReferences:sourceRefs,premiseDependencies,inhibitorDependencies,nodeIds:observedIds,edgeIds:linked.map(item=>item.id),cycleDetected:resolved.cycleDetected,interpretationPolicy:['源句有条件作用合同；仅位置前提可核，旺衰/根气/救应等尚未知，故不执行有效注销或恢复。',`原合同所列可能后果（本次未执行）：${contract.result.map(chineseContract).join('；')}。`,...contract.guards.map(chineseContract)]};
  });
  const scoped=matches.some(match=>match.status==='author-labelled-example'&&match.labelConfidence==='explicit'&&!match.quarantines.length);
  return {version:REN_COMMENTARY_VERSION,profileId:REN_COMMENTARY_VERSION,authority:'ren-commentary',sourceId:REN_COMMENTARY_SOURCE_ID,input:{baziVersion:bazi.version,timeBasis:bazi.timeBasis?structuredClone(bazi.timeBasis):null,pillars:ordered.map((pillar,index)=>({position:POSITIONS[index],known:!!pillar,...(pillar?{ganzhi:pillar.gan+pillar.zhi}:{})})),...(day?{dayStem:day}:{}),...(month?{monthBranch:month}:{}),complete},sourceRules:[...[...TABLE.clauses,...TABLE.supplementalExcerpts,...(TABLE.graphClauses??[])].map(sourceRef),{...SELECTED_RELATION_TABLE}],sourceCaseMatches:matches,observations,structureGraph:{nodes,edges,actionContracts},sourceClaims,formationDecision:scoped?'source-case-only':'unresolved',unresolvedConditions:[...(!day?['日主未定，暂停相对十神与完整原书判例匹配，不使用12:00代表日干。']:[]),...(!month?['月柱交节待定，季节和提纲范围不能任选一个月。']:[]),...(!complete?['四柱不完整或时刻未知，不执行完整源例精确匹配。']:[]),...(!matches.length?['未与42张记录四柱完全匹配；这不是原书或本软件判定格局不成立。']:[]),'有效根气、印比是否能依靠、月令旺极与制化成败未形成完整判据。','有向图保留生克合冲会的候选和依赖；全部effectiveAction未知，不从结构存在推断破印、拔根或合化成功。','提纲食伤的最终范围、财星有效生育及一般新盘从儿/从旺/从强/真假从/合化裁决仍未实现。'],interpretationPolicy:[...GENERAL_POLICY]};
}

function canonical(value:unknown,depth=0):string {if(depth>100)throw new Error('任注快照过深。');if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);if(Array.isArray(value)){const keys=Reflect.ownKeys(value);if(keys.length!==value.length+1||keys.some(key=>typeof key!=='string'||key!=='length'&&!/^(0|[1-9]\d*)$/.test(key)))throw new Error('任注数组无效。');const parts=[];for(let index=0;index<value.length;index++){const descriptor=Object.getOwnPropertyDescriptor(value,String(index));if(!descriptor||!Object.hasOwn(descriptor,'value'))throw new Error('任注数组访问器或空位无效。');parts.push(canonical(descriptor.value,depth+1));}return '['+parts.join(',')+']';}if(value&&typeof value==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(value))){const keys=Reflect.ownKeys(value);if(keys.some(key=>typeof key!=='string'))throw new Error('任注键无效。');return '{'+(keys as string[]).sort().map(key=>{const descriptor=Object.getOwnPropertyDescriptor(value,key);if(!descriptor||!Object.hasOwn(descriptor,'value'))throw new Error('任注访问器无效。');return JSON.stringify(key)+':'+canonical(descriptor.value,depth+1);}).join(',')+'}';}throw new Error('任注快照值无效。');}
/** Reconstruct from trusted birth/Bazi inputs. No caller-authored checksum or extra interpretation fields are accepted. */
export function validRenCommentaryAnalysis(value:unknown,profile:BirthProfile,bazi:BaziAnalysis):value is RenCommentaryAnalysis|undefined {
  try{
    const method=normalizeRenMethod(profile.renMethod);if(method==='none')return value===undefined;if(bazi.version!==BAZI_VERSION)return false;
    const context=resolveBirthContext(profile),clock=resolveBirthCalculationClock(profile,context),expected=calculateLegacyBazi(profile,{...context,local:clock.clock??context.local});
    const expectedPillars=(clock.trace.dayStatus==='uncertain'?expected.pillars.filter(pillar=>pillar.label!=='日柱'&&pillar.label!=='时柱'):expected.pillars).map(({label,gan,zhi})=>({label,gan,zhi}));
    if(canonical(expectedPillars)!==canonical(bazi.pillars.map(({label,gan,zhi})=>({label,gan,zhi})))||canonical(clock.trace)!==canonical(bazi.timeBasis))return false;
    return canonical(value)===canonical(calculateRenCommentary(profile,bazi));
  }catch{return false;}
}
