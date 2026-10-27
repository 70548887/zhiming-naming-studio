import ruleData from '../../data/ren-actions-rules.json';
import type {Element,RenCommentaryAnalysis,RenSourceReference,RenStructureNode} from '../shared/types';
import type {RenActionAnalysis,RenActionCheck,RenActionPredicate,RenActionSourceClause,RenActionState,RenRootLink} from '../shared/ren-actions-types';

export const REN_ACTIONS_VERSION='1.0.0' as const;
export const REN_ACTIONS_PROFILE='ren-source-conditional-actions/1.0.0' as const;
export const REN_ACTIONS_SOURCE_ID='bazi-ditian-ren-actions-2600158' as const;
const POSITIONS=['year','month','day','hour'] as const;
const LABELS=['年柱','月柱','日柱','时柱'] as const;
const ELEMENTS:Element[]=['木','火','土','金','水'];
const STEMS=[...'甲乙丙丁戊己庚辛壬癸'],BRANCHES=[...'子丑寅卯辰巳午未申酉戌亥'];
const STEM_ELEMENT:Record<string,Element>={甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
const BRANCH_ELEMENT:Record<string,Element>={子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};
const HIDDEN:Record<string,string[]>={子:['癸'],丑:['己','癸','辛'],寅:['甲','丙','戊'],卯:['乙'],辰:['戊','乙','癸'],巳:['丙','庚','戊'],午:['丁','己'],未:['己','丁','乙'],申:['庚','壬','戊'],酉:['辛'],戌:['戊','辛','丁'],亥:['壬','甲']};
const CLASHES=['子午','丑未','寅申','卯酉','辰戌','巳亥'];
const controls=(a:Element,b:Element)=>(ELEMENTS.indexOf(a)+2)%5===ELEMENTS.indexOf(b);
const generates=(a:Element,b:Element)=>(ELEMENTS.indexOf(a)+1)%5===ELEMENTS.indexOf(b);
const clash=(a:string,b:string)=>CLASHES.some(pair=>pair===a+b||pair===b+a);

/** Inspect descriptors before reading values. No sparse arrays, getters, symbols or hidden fields. */
function assertJson(value:unknown):void{
  const parents=new Set<object>();let count=0;
  const visit=(item:unknown,depth:number):void=>{
    if(depth>100||++count>500000)throw new Error('任注条件动作结构过深或过大。');
    if(item===null||typeof item==='string'||typeof item==='boolean'||typeof item==='number'&&Number.isFinite(item))return;
    if(!item||typeof item!=='object')throw new Error('任注条件动作须为完整 JSON 值。');
    if(parents.has(item))throw new Error('任注条件动作不得循环引用。');
    const array=Array.isArray(item),prototype=Object.getPrototypeOf(item);
    if(array?prototype!==Array.prototype:prototype!==Object.prototype&&prototype!==null)throw new Error('任注条件动作不得使用自定义原型。');
    const keys=Reflect.ownKeys(item);if(keys.some(key=>typeof key!=='string'))throw new Error('任注条件动作不得含符号字段。');
    if(array){const length=Object.getOwnPropertyDescriptor(item,'length')?.value;if(!Number.isSafeInteger(length)||length<0||length>100000||keys.length!==length+1)throw new Error('任注条件动作数组含额外字段或空位。');for(let i=0;i<length;i++)if(!Object.hasOwn(item,String(i)))throw new Error('任注条件动作数组不得稀疏。');}
    parents.add(item);
    for(const key of keys){if(array&&key==='length')continue;const descriptor=Object.getOwnPropertyDescriptor(item,key);if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)throw new Error('任注条件动作不得含访问器或隐藏字段。');visit(descriptor.value,depth+1);}
    parents.delete(item);
  };visit(value,0);
}
function canonical(value:unknown):string{assertJson(value);const stringify=(item:any):string=>Array.isArray(item)?'['+item.map(stringify).join(',')+']':item&&typeof item==='object'?'{'+Object.keys(item).sort().map(key=>JSON.stringify(key)+':'+stringify(item[key])).join(',')+'}':JSON.stringify(item);return stringify(value);}
export function renActionsRules():{version:string;profileId:string;sourceId:string;source:Record<string,unknown>;clauses:RenActionSourceClause[];rootVocabulary:Record<string,Partial<Record<Element,string[]>>>}{
  const data=ruleData as unknown as ReturnType<typeof renActionsRules>;
  if(data.version!==REN_ACTIONS_VERSION||data.profileId!==REN_ACTIONS_PROFILE||data.sourceId!==REN_ACTIONS_SOURCE_ID||data.source.revision!==2600158||data.clauses.length!==19||new Set(data.clauses.map(x=>x.id)).size!==19||data.clauses.some(x=>x.sourceId!==REN_ACTIONS_SOURCE_ID))throw new Error('任注条件动作固定规则版本不完整。');
  return structuredClone(data);
}
function sourceReferences():RenSourceReference[]{return renActionsRules().clauses.map(({id,sourceId,section,layer,quote,locator})=>({id,sourceId,section,layer,quote,locator}));}
function inputNodes(base:RenCommentaryAnalysis):RenStructureNode[]{
  assertJson(base);
  if(!base||!['ditian-ren-commentary-2600158/1.0.0','ditian-ren-commentary-2600158/1.1.0'].includes(base.version)||base.authority!=='ren-commentary'||!Array.isArray(base.input?.pillars)||base.input.pillars.length!==4||!Array.isArray(base.structureGraph?.nodes))throw new Error('任注条件动作需要未追加动作的固定基础快照。');
  const expected:Partial<RenStructureNode>[]=[];
  base.input.pillars.forEach((p,index)=>{
    if(p.position!==POSITIONS[index]||typeof p.known!=='boolean'||p.known!==!!p.ganzhi||p.known&&(!p.ganzhi||[...p.ganzhi].length!==2||!STEMS.includes(p.ganzhi[0])||!BRANCHES.includes(p.ganzhi[1]))||Object.keys(p).some(key=>!['position','known','ganzhi'].includes(key)))throw new Error('任注条件动作四柱位置不完整。');
    if(!p.known)return;const stem=p.ganzhi![0],branch=p.ganzhi![1],common={position:POSITIONS[index],pillar:LABELS[index]};
    expected.push({...common,id:`${POSITIONS[index]}:exposed:${stem}`,layer:'exposed',symbol:stem,element:STEM_ELEMENT[stem],isDayMaster:index===2});
    expected.push({...common,id:`${POSITIONS[index]}:branch:${branch}`,layer:'branch',symbol:branch,element:BRANCH_ELEMENT[branch],isDayMaster:false});
    HIDDEN[branch].forEach((hidden,i)=>expected.push({...common,id:`${POSITIONS[index]}:hidden:${i+1}`,layer:'hidden',symbol:hidden,element:STEM_ELEMENT[hidden],branch,hiddenOrder:i+1,isDayMaster:false}));
  });
  if(base.structureGraph.nodes.length!==expected.length||new Set(base.structureGraph.nodes.map(node=>node.id)).size!==expected.length)throw new Error('任注条件动作节点与所选四柱词汇不一致。');
  for(const want of expected){const actual=base.structureGraph.nodes.find(node=>node.id===want.id);if(!actual||Object.entries(want).some(([key,value])=>(actual as any)[key]!==value)||actual.effectiveSupport!=='unknown')throw new Error('任注条件动作节点位置、层或字形被改动。');}
  const day=base.input.pillars[2].ganzhi?.[0];if((base.input.dayStem??null)!==(day??null)||base.input.complete&&base.input.pillars.some(p=>!p.known))throw new Error('任注条件动作日主或完整性不一致。');
  return base.structureGraph.nodes;
}
function category(element:Element,branch:string):Pick<RenRootLink,'category'|'categoryAuthority'|'sourceClauseIds'>{
  const vocabulary=renActionsRules().rootVocabulary;
  for(const[key,value,clause]of [['growth','growth-lu-wang','root-growth-vocabulary'],['store','store','root-store-vocabulary'],['residue','residue','root-residue-vocabulary']]as const)if(vocabulary[key][element]?.includes(branch))return{category:value,categoryAuthority:'ren-explicit-element-vocabulary',sourceClauseIds:['element-identity','root-presence',clause,'root-support-damage']};
  return{category:'selected-same-element',categoryAuthority:'selected-hidden-vocabulary-only',sourceClauseIds:['element-identity','root-presence','root-support-damage']};
}
/** Four-valued necessary conjunction: explicit absence wins only over unknown, never over conflict. */
export function resolveRenActionPredicates(predicates:readonly RenActionPredicate[]):RenActionState{
  if(predicates.some(p=>p.state==='conflict'))return'conflict';
  if(predicates.some(p=>p.state==='contradicted'))return'contradicted';
  if(!predicates.length||predicates.some(p=>p.state==='unknown'))return'unknown';return'met';
}

/** Source-conditional structural premises only. No inferred force, node deletion, formation or ranking. */
export function calculateRenActionAnalysis(base:RenCommentaryAnalysis):RenActionAnalysis{
  const nodes=inputNodes(base),stems=nodes.filter(n=>n.layer==='exposed'),hidden=nodes.filter(n=>n.layer==='hidden'),branches=nodes.filter(n=>n.layer==='branch'),complete=base.input.complete&&base.input.pillars.every(p=>p.known),checks:RenActionCheck[]=[];
  const edgeIds=(from:string,to:string,kind:string)=>base.structureGraph.edges.filter(e=>e.kind===kind&&e.from.includes(from)&&e.to.includes(to)).map(e=>e.id);
  const branchFor=(position:RenStructureNode['position'])=>branches.find(n=>n.position===position)!;
  const rootLinks:RenRootLink[]=stems.flatMap(stem=>hidden.filter(root=>root.element===stem.element).map(root=>{
    const host=branchFor(root.position),attacks=branches.filter(b=>clash(host.symbol,b.symbol)),stemAttacks=stems.filter(s=>s.id!==stem.id&&controls(s.element,stem.element));
    return{id:`root:${stem.id}:${root.id}`,stemNodeId:stem.id,hiddenNodeId:root.id,branchNodeId:host.id,stem:stem.symbol,hiddenStem:root.symbol,branch:host.symbol,stemPosition:stem.position,rootPosition:root.position,element:stem.element,samePillar:stem.position===root.position,hiddenOrder:root.hiddenOrder!,...category(stem.element,host.symbol),threatNodeIds:[...attacks,...stemAttacks].map(n=>n.id),threatEdgeIds:[...attacks.flatMap(n=>[...edgeIds(n.id,host.id,'branch-clash'),...edgeIds(host.id,n.id,'branch-clash')]),...stemAttacks.flatMap(n=>edgeIds(n.id,stem.id,'controls'))],effectiveSupport:'unknown' as const,originalNodesRetained:true as const,evidence:[`${stem.pillar}明干${stem.symbol}与${root.pillar}${host.symbol}藏${root.symbol}同属${stem.element}；藏序${root.hiddenOrder}。`,stem.symbol===root.symbol?'同字藏根位置已见；未由同字推出作用有效。':'阴阳异干同五行位置已见；不因未藏同字否认该所选根成员。','冲、克仅登记确切靶标的候选威胁，未因此注销根。']};
  }));
  const predicate=(id:string,label:string,state:RenActionState,selected:RenStructureNode[]=[],evidence:string[]=[]):RenActionPredicate=>({id,label,state,nodeIds:selected.map(n=>n.id),evidence});
  const add=(value:Omit<RenActionCheck,'effectiveAction'|'formationDecision'|'status'>&{status?:RenActionState})=>{checks.push({...value,status:value.status??resolveRenActionPredicates(value.predicates),effectiveAction:'unknown',formationDecision:'not-evaluated'});};
  for(const stem of stems){const links=rootLinks.filter(r=>r.stemNodeId===stem.id),found=hidden.filter(n=>links.some(r=>r.hiddenNodeId===n.id)),state=links.length?'met':complete?'contradicted':'unknown';
    add({id:`root-prerequisite:${stem.id}`,kind:'root-prerequisite',name:`${stem.pillar}${stem.symbol} · 所选同五行藏根必要子路径`,scope:'全部已知四支所选藏干词汇；非一切生扶能力的必要条件',nodeIds:[stem.id,...found.map(n=>n.id)],edgeIds:[],predicates:[predicate('same-element-hidden-member','所选同五行藏根成员',state,found,links.length?['已见至少一个具体根联系，不计数量旺度。']:['完整仍未见只排除本藏根词汇子路径；印生或其他生机另论。'])],sourceClauseIds:['element-identity','root-presence','root-support-damage'],sourceConsequence:'本所选藏根子路径的成员前提可核；未证明有效力量。',evidence:[`日干之外的各明干也逐一核查；本干为${stem.symbol}。`],missing:['有效根气还须独立核载体生扶、冲克力量和救应。',...(!complete&&!links.length?['缺失柱可能有该根，不能证明全盘没有。']:[])]});
  }
  for(const stem of stems){const branch=branchFor(stem.position),patterns:{id:string;match:boolean;clause:string;consequence:string;direction:string}[]=[
    {id:'wood-carried-support',match:'甲乙'.includes(stem.symbol)&&'寅卯亥子'.includes(branch.symbol),clause:'wood-carried',consequence:'则生旺',direction:'同柱支→木干的原文支持方向'},
    {id:'wood-carried-restraint',match:'甲乙'.includes(stem.symbol)&&'申酉'.includes(branch.symbol),clause:'wood-carried',consequence:'则克败矣',direction:'同柱支→木干的原文制约方向'},
    {id:'fire-carried-restraint',match:'丙丁'.includes(stem.symbol)&&'亥子'.includes(branch.symbol),clause:'fire-carried',consequence:'则制伏',direction:'同柱支→火干的原文制约方向'},
    {id:'fire-carried-support',match:'丙丁'.includes(stem.symbol)&&'巳午寅卯'.includes(branch.symbol),clause:'fire-carried',consequence:'则肆逞矣',direction:'同柱支→火干的原文支持方向'},
    {id:'wood-covered-support',match:'寅卯'.includes(branch.symbol)&&'甲乙壬癸'.includes(stem.symbol),clause:'wood-covered',consequence:'则生旺',direction:'同柱覆干→木支的原文支持方向'},
    {id:'wood-covered-restraint',match:'寅卯'.includes(branch.symbol)&&'庚辛'.includes(stem.symbol),clause:'wood-covered',consequence:'则克败矣',direction:'同柱覆干→木支的原文制约方向'},
    {id:'fire-covered-restraint',match:'巳午'.includes(branch.symbol)&&'壬癸'.includes(stem.symbol),clause:'fire-covered',consequence:'则制伏',direction:'同柱覆干→火支的原文制约方向'},
    {id:'fire-covered-support',match:'巳午'.includes(branch.symbol)&&'丙丁甲乙'.includes(stem.symbol),clause:'fire-covered',consequence:'是肆逞矣',direction:'同柱覆干→火支的原文支持方向'},
  ];for(const pattern of patterns.filter(p=>p.match))add({id:`cover:${stem.position}:${pattern.id}`,kind:'cover-carrier',name:pattern.direction,scope:'仅原文明列同柱模式；成员方向命中不等于喜忌或力量前提成立',nodeIds:[stem.id,branch.id],edgeIds:[],predicates:[predicate('listed-same-pillar-pattern','原文明列同柱载覆模式','met',[stem,branch])],sourceClauseIds:[pattern.clause,'root-support-damage'],sourceConsequence:pattern.consequence,evidence:[`${stem.pillar}${stem.symbol}${branch.symbol}，分别保留上干、下支及方向；不移用隔柱关系。`],missing:['原句中的喜忌、实际能力及其他制化仍未裁决。']});}
  const wood=branches.filter(n=>'亥卯未'.includes(n.symbol)),intruder=branches.find(n=>'酉丑'.includes(n.symbol));
  const triad=wood.length===3&&new Set(wood.map(n=>n.symbol)).size===3&&!!intruder;
  const target=triad?branches.find(n=>n.symbol===(intruder!.symbol==='酉'?'卯':'未')):undefined;
  const pos=(n:RenStructureNode)=>POSITIONS.indexOf(n.position),inside=!!intruder&&triad&&pos(intruder)>Math.min(...wood.map(pos))&&pos(intruder)<Math.max(...wood.map(pos)),tight=!!intruder&&!!target&&Math.abs(pos(intruder)-pos(target))===1;
  const triadState:RenActionState=!complete?'unknown':!triad?'contradicted':inside&&tight?'met':'unknown';
  add({id:'wood-triad:internal-tight-clash',kind:'wood-triad-clash',name:'完整木局内插紧贴冲损条文',status:triadState,scope:'仅四支恰为亥卯未加酉或丑；冲字内插且紧贴所冲目标的明确子域',nodeIds:[...wood,...(intruder?[intruder]:[])].map(n=>n.id),edgeIds:[],predicates:[predicate('four-pillars-known','四柱完整',complete?'met':'unknown'),predicate('complete-wood-with-intruder','完整木局及所列冲字',triad?'met':complete?'contradicted':'unknown',[...wood,...(intruder?[intruder]:[])]),predicate('internal-tight-target','内插且紧贴确切所冲目标',inside&&tight?'met':triad?'unknown':complete?'contradicted':'unknown',intruder&&target?[intruder,target]:[])],sourceClauseIds:['wood-triad-internal','wood-triad-boundary','clash-power','clash-rescue'],sourceConsequence:'命中时只引用本条“是为破局”，排除完全无冲损的结构直通；不判有效拔根。',evidence:triad?[`${intruder!.symbol}所冲目标为${target!.symbol}；内插${inside?'符合':'不符合'}，相邻${tight?'符合':'不符合'}。`]:['未取得本条全部指定成员；不由未命中推全盘无冲损。'],missing:['冲字处外或内部不贴转后句待核；固定电子“瘐论”不擅改。','真正冲克方向、力量与救应仍须独立证据。']});
  const lifecycle=[['丁','酉',null,'财','yin-no-birth'],['乙','午',null,'食神','yin-no-birth'],['己','酉',null,'食神','yin-no-birth'],['辛','子',null,'食神','yin-no-birth'],['癸','卯',null,'食神','yin-no-birth'],['乙','亥',null,'印','yin-no-death'],['癸','申',null,'印','yin-no-death'],['己','寅','丙','印','yin-no-death'],['辛','巳','戊','印','yin-no-death']]as const;
  for(const[stemSymbol,branchSymbol,hiddenSymbol,role,clause]of lifecycle)for(const stem of stems.filter(n=>n.symbol===stemSymbol))for(const branch of branches.filter(n=>n.symbol===branchSymbol)){const selected=hiddenSymbol?hidden.filter(n=>n.position===branch.position&&n.symbol===hiddenSymbol):[],id=`lifecycle:${stem.id}:${branch.id}:${hiddenSymbol??'branch'}`;add({id,kind:'lifecycle-proof-guard',name:'阴干逆十二运唯一生死论据排除',scope:'原文明列配对；仅拒绝唯一论据，不删关系，也不判已有效',nodeIds:[stem.id,branch.id,...selected.map(n=>n.id)],edgeIds:[],predicates:[predicate('explicit-pair','原文配对及必要藏干定位','met',[stem,branch,...selected])],sourceClauseIds:[clause,'yin-same-lifecycle'],sourceConsequence:`本配对按${role}关系审察，不得仅以阴干逆十二运${clause==='yin-no-birth'?'长生':'死地'}直接证明生扶或注销。`,evidence:[`${stem.symbol}与${branch.symbol}${hiddenSymbol?'藏'+hiddenSymbol:''}均保留原节点。`],missing:['其他已证生克制化可以另论；本守卫不反推有效。']});}
  for(const link of rootLinks){const host=nodes.find(n=>n.id===link.branchNodeId)!,attackers=branches.filter(n=>clash(n.symbol,host.symbol));add({id:`root-damage:${link.id}`,kind:'root-damage',name:'根联系受冲的必要攻击与力量依赖',scope:'只针对本根所载支的六冲候选；不包含所有克损机制',nodeIds:[link.stemNodeId,link.hiddenNodeId,host.id,...attackers.map(n=>n.id)],edgeIds:attackers.flatMap(n=>[...edgeIds(n.id,host.id,'branch-clash'),...edgeIds(host.id,n.id,'branch-clash')]),predicates:[predicate('target-root-known','本根联系及载体已见','met',[host]),predicate('clash-on-this-carrier','所选六冲攻击指向此载根支',attackers.length?'met':complete?'contradicted':'unknown',attackers),predicate('clash-capability','攻击有力且目标可受','unknown'),predicate('clash-rescue-resolved','抑冲、助泄及解救已经独立查明','unknown')],sourceClauseIds:['root-support-damage','clash-power','clash-rescue'],sourceConsequence:'只有全部独立前提成立，才可讨论本根支撑受损；本次不执行拔根。',evidence:[`靶标${host.pillar}${host.symbol}，不把别支之冲挪到本根。`],missing:['力量、可达性和救应没有独立充分判据，命中攻击仍未知。']});}
  const day=base.input.dayStem,relation=(node:RenStructureNode)=>{if(!day)return null;const delta=(ELEMENTS.indexOf(node.element)-ELEMENTS.indexOf(STEM_ELEMENT[day])+5)%5;return(['peer','output','wealth','officer','resource']as const)[delta];},stemNodes=nodes.filter(n=>n.layer!=='branch');
  const resources=stemNodes.filter(n=>relation(n)==='resource'),wealth=stemNodes.filter(n=>relation(n)==='wealth'),peers=stemNodes.filter(n=>relation(n)==='peer'&&!n.isDayMaster),officers=stemNodes.filter(n=>relation(n)==='officer');
  for(const resource of resources){const attackers=wealth.filter(n=>controls(n.element,resource.element)),attackerIds=attackers.map(n=>n.id);add({id:`resource-damage:${resource.id}`,kind:'resource-damage',name:'财损印的精确靶标与有效前提',scope:'相对已定日主；全部所选明藏财→本印成员子路径',nodeIds:[resource.id,...attackerIds],edgeIds:attackers.flatMap(n=>edgeIds(n.id,resource.id,'controls')),predicates:[predicate('resource-target','具体印节点存在','met',[resource]),predicate('wealth-controls-resource','财星克此印的候选关系',attackers.length?'met':complete?'contradicted':'unknown',attackers),predicate('wealth-effective-capability','该财实际有力且能到达本印','unknown'),predicate('resource-protection-resolved','印的保护、转化及救应均已核','unknown')],sourceClauseIds:['resource-rescue','bridge-isolation','root-support-damage'],sourceConsequence:'前提不全不得取消本印→日主支撑；原印字永远保留。',evidence:[`确切被查印为${resource.pillar}${resource.layer==='hidden'?'藏':''}${resource.symbol}。`],missing:['财印位置存在不等于财已损印；不以财当令或根数自动补能力。']});
    for(const attacker of attackers){const bridge=officers.filter(n=>generates(attacker.element,n.element)&&generates(n.element,resource.element)),restrainers=peers.filter(n=>controls(n.element,attacker.element)),found=[...bridge,...restrainers];add({id:`resource-rescue:${attacker.id}:${resource.id}`,kind:'resource-rescue',name:'同一财损印靶标的官桥／比劫救应依赖',scope:'只论官桥财→官→本印、比劫→同一财两种原文子路径；不移用其他印的救应',nodeIds:[attacker.id,resource.id,...found.map(n=>n.id)],edgeIds:[],predicates:[predicate('specific-damage','此财损此印的有效阻断已独立证明','unknown',[attacker,resource]),predicate('same-target-rescue-members','针对同一财与本印的所选救应成员',found.length?'met':complete?'contradicted':'unknown',found),predicate('rescue-effective-reachable','救应本身有力、可达且未被抑制','unknown')],sourceClauseIds:['resource-rescue','bridge-isolation'],sourceConsequence:'只有该具体阻断与其解救都独立成立，才能恢复对应支撑；有官比劫不自动恢复。',evidence:[`官桥成员${bridge.map(n=>n.pillar+n.symbol).join('、')||'未见'}；制财比劫${restrainers.map(n=>n.pillar+n.symbol).join('、')||'未见'}。`],missing:['未实现合住冲开、冲坏合化、克去间神全部机制；未见这两种成员不否定其他救法。']});}
  }
  if(!day)add({id:'resource-paths:day-unknown',kind:'resource-damage',name:'印财及救应相对关系暂停',scope:'日干未确定，不借代表时刻赋相对十神',nodeIds:[],edgeIds:[],predicates:[predicate('day-master','日主已确定','unknown')],sourceClauseIds:['resource-rescue'],sourceConsequence:'相对财印与救应路径未评估。',evidence:['输入无日干，未借中午、机器当前或其他日期补盘。'],missing:['日主待定。']});
  return{version:REN_ACTIONS_VERSION,profileId:REN_ACTIONS_PROFILE,sourceId:REN_ACTIONS_SOURCE_ID,authority:'source-conditional-structural-prerequisites',input:{baseVersion:base.version,complete,dayStem:day??null,pillars:structuredClone(base.input.pillars)},rootLinks,checks,sourceReferences:sourceReferences(),formationDecision:'not-evaluated',strengthDecision:'not-evaluated',limitations:['同五行藏干表是所选电子词汇；同字、异干、本余气和位置分别保留，根数不转旺度。','met只表示本条所列结构或必要前提符合；不是所有有效力量或完整成格成立。','contradicted只排除声明的必要子路径；不扩大为该干无生机、全盘无救或全部流派否定。','载覆方向只采用原文明列木、火组；没有把五行一般相生克当作任注完整力量判准。','原文明列木亥寅卯生旺、四元素墓库余气分别标记；土及未列生旺只作所选同五行词汇，不补十二运。','根冲、财坏印和同靶官桥/比劫救应保留能力、到达与保护依赖；未知不以源例相似或数量阈值补足。','不删除结构节点，不调整旧任注解释、喜用候选或姓名排序，不执行完整旺衰、真假从、调候或合化。','不接人工力量开关；本轮所有实际有效作用仍待独立判据，未以位置命中冒称已解除。']};
}
export function validRenActionAnalysis(value:unknown,base:RenCommentaryAnalysis):value is RenActionAnalysis{
  try{return canonical(value)===canonical(calculateRenActionAnalysis(base));}catch{return false;}
}
