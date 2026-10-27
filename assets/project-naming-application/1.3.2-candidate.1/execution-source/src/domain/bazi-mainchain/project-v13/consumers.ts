import type {RootFeedbackInput} from './root-feedback-types';
import {evaluateRootRegimeProtections} from './regime-protection';
import type {CarrierFlowSettlement} from './settled-flows';

import type {ResourceProtection} from '../kernel-v12-fixed/resource-protection';
import {reviewNumericalThresholds} from '../kernel-v12-fixed/numeric-review';
import {intervalBranchCandidates} from '../kernel-v12-fixed/branch-intervals';
import {divide,sumIntervals} from '../kernel-v12-fixed/numeric-interval';
import type {SettledChartResult145 as ChartResult140,ChartResult145,MethodResult145} from './types-v13-consumers';
import rawRules from './rules/project-mainchain-1.3.1.json';
import seasonalBook from './rules/qiongtong-initial-reference.json';
import type {Element140 as E,Position140 as Pos,Pillar140,ChartCase140,MethodInput140,MethodResult140,Carrier140,Relation140,Flow140,Trace140,Root140,Branch140,BranchCheck140,UseItem140,MethodPolicy140} from '../../../shared/bazi-mainchain-method-types';

export const METHOD_145=rawRules.methodId;
const elements=rawRules.tables.elements as E[],positions:Pos[]=['year','month','day','hour'],P=rawRules.parameters;
const stemElements=rawRules.tables.stemElements as Record<string,E>,hidden=rawRules.tables.hiddenStems as Record<string,string[]>;
const next=(element:E)=>elements[(elements.indexOf(element)+1)%5],previous=(element:E)=>elements[(elements.indexOf(element)+4)%5],controls=(element:E)=>elements[(elements.indexOf(element)+2)%5],controller=(element:E)=>elements[(elements.indexOf(element)+3)%5];
const sum=(values:number[])=>values.reduce((a,b)=>a+b,0),round=(value:number)=>Number(value.toFixed(9));
const samePair=(a:string,b:string,pair:string)=>pair.includes(a)&&pair.includes(b)&&a!==b;
function has(value:unknown,message:string):asserts value{if(!value)throw new Error('140取法：'+message);}
const relation=(source:E,day:E)=>source===day?'比劫':next(source)===day?'印':source===next(day)?'食伤':source===controls(day)?'财':'官杀';
function multiplier(element:E,month:E){return element===month?P.season.same:next(month)===element?P.season.generatedByMonth:next(element)===month?P.season.generatesMonth:controls(element)===month?P.season.controlsMonth:P.season.controlledByMonth;}
function ruleTrace(trace:Trace140[],step:number,id:string,summary:string,details:Record<string,unknown>){const rule=rawRules.rules.find(rule=>rule.id===id);has(rule,'未知规则'+id);trace.push({step,ruleId:id,origin:rule.origin as Trace140['origin'],sourceIds:[...rule.sourceIds],summary,details});}
function validPillar(value:Pillar140){has(value&&rawRules.tables.stems.includes(value.gan)&&rawRules.tables.branches.includes(value.zhi),'干支字符无效');has(rawRules.tables.stems.indexOf(value.gan)%2===rawRules.tables.branches.indexOf(value.zhi)%2,'单柱阴阳不配：'+value.gan+value.zhi);}
type Occupied={position:Pos;index:number;pillar:Pillar140};
function occupied(chart:ChartCase140):Occupied[]{return positions.flatMap((position,index)=>chart.pillars[position]?[{position,index,pillar:chart.pillars[position]!}]:[]);}
function makeCarriers(items:Occupied[],month:E):Carrier140[]{return items.flatMap(({position,index,pillar})=>{
 const exposed:Carrier140={id:position+':stem',position,positionIndex:index,kind:position==='day'?'day-master':'exposed',stem:pillar.gan,originalElement:stemElements[pillar.gan],element:stemElements[pillar.gan],base:P.stemBase,seasonFactor:multiplier(stemElements[pillar.gan],month),branchFactor:1,bindingFactor:1,rootFactor:1,seed:0,capacity:0,incomingControl:0,generationIn:0,generationOut:0,power:0};
 const stems=hidden[pillar.zhi],weights=P.hiddenWeights[String(stems.length) as keyof typeof P.hiddenWeights];
 const roots=stems.map((stem,order):Carrier140=>({...exposed,id:position+':hidden:'+stem,kind:'hidden',stem,branch:pillar.zhi,originalElement:stemElements[stem],element:stemElements[stem],base:P.branchBase[position]*weights[order],seasonFactor:multiplier(stemElements[stem],month)}));return[exposed,...roots];
});}
const refresh=(rows:Carrier140[])=>{for(const row of rows)row.seed=row.base*row.seasonFactor*row.branchFactor*row.bindingFactor;};
function amount(rows:Carrier140[],element:E,field:'seed'|'capacity'|'power'='seed'){return sum(rows.filter(row=>row.element===element).map(row=>row[field]));}
function eligibleRoot(rows:Carrier140[],element:E,field:'seed'|'power'='seed'){return rows.some(row=>row.kind==='hidden'&&row.element===element&&row[field]+P.epsilon>=P.rootMinimum);}

function resolveRelations(items:Occupied[],rows:Carrier140[],month:E,day:E,trace:Trace140[]){
 const relations:Relation140[]=[],clashed=new Set<Pos>(),factors=new Map<Pos,number>(items.map(item=>[item.position,1]));refresh(rows);
 const branchMass=new Map(items.map(item=>[item.position,sum(rows.filter(row=>row.kind==='hidden'&&row.position===item.position).map(row=>row.seed))]));
 for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
  const a=items[i],b=items[j];if(!rawRules.tables.clashes.some(pair=>samePair(a.pillar.zhi,b.pillar.zhi,pair)))continue;
  const av=branchMass.get(a.position)!,bv=branchMass.get(b.position)!,strongA=av+P.epsilon>=P.clashRatio*bv,strongB=bv+P.epsilon>=P.clashRatio*av;
  const af=strongA?P.clashStrong:strongB?P.clashWeak:P.clashBalanced,bf=strongB?P.clashStrong:strongA?P.clashWeak:P.clashBalanced;
  factors.set(a.position,factors.get(a.position)!*af);factors.set(b.position,factors.get(b.position)!*bf);clashed.add(a.position);clashed.add(b.position);
  relations.push({id:'clash:'+a.position+':'+b.position,kind:'clash',positions:[a.position,b.position],subjects:[a.pillar.zhi,b.pillar.zhi],status:'applied',premises:[{name:'冲前量比较',met:true,detail:`${av}:${bv}，作用倍率${af}/${bf}`}],ruleId:'clash'});
 }
 for(const row of rows)if(row.kind==='hidden')row.branchFactor=Math.max(P.clashFloor,factors.get(row.position)!);refresh(rows);
 ruleTrace(trace,3,'clash','按未冲快照比较后一次分配余量',{branchMass:Object.fromEntries(branchMass),factors:Object.fromEntries(items.map(item=>[item.position,Math.max(P.clashFloor,factors.get(item.position)!)]))});
 const consumed=new Set<Pos>();
 for(const [index,group]of rawRules.tables.groups.entries()){
  const members=[...group.members];if(!members.every(branch=>items.some(item=>item.pillar.zhi===branch)))continue;
  const membersAt=items.filter(item=>members.includes(item.pillar.zhi)),target=group.element as E;
  const premises=[
   {name:'月令同化神或生化神',met:month===target||next(month)===target,detail:`月${month}，化${target}`},
   {name:'化神在明干有载体',met:rows.some(row=>row.kind!=='hidden'&&row.element===target),detail:'只看已知明干，不凭空补化神'},
   {name:'参与支均无六冲',met:membersAt.every(item=>!clashed.has(item.position)),detail:membersAt.map(item=>item.position).join(',')},
   {name:'化神未被更强异党克制',met:amount(rows,controller(target))<=amount(rows,target)*P.transformationOppositionRatio+P.epsilon,detail:`克方${amount(rows,controller(target))}，目标${amount(rows,target)}`},
   {name:'没有被优先成立组占用',met:membersAt.every(item=>!consumed.has(item.position)),detail:'三会先于三合，实际支不重复消耗'}
  ];const applied=premises.every(item=>item.met),id='group:'+index;
  relations.push({id,kind:group.kind as 'sanhui'|'sanhe',positions:membersAt.map(item=>item.position),subjects:members,target,status:applied?'applied':'blocked',premises,ruleId:'branch-transform'});
  if(applied)for(const item of membersAt){consumed.add(item.position);for(const row of rows.filter(row=>row.position===item.position&&row.kind==='hidden')){row.element=target;row.seasonFactor=multiplier(target,month);row.conversion=id;}}
  refresh(rows);
 }
 ruleTrace(trace,4,'branch-transform','完整支组逐项核前提；只有通过者改变作用五行',{groups:relations.filter(row=>row.kind==='sanhui'||row.kind==='sanhe'),originalFactsUnchanged:true});
 for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
  const a=items[i],b=items[j];if(!rawRules.tables.liuhe.some(pair=>samePair(a.pillar.zhi,b.pillar.zhi,pair)))continue;
  const applied=b.index-a.index===1&&!clashed.has(a.position)&&!clashed.has(b.position)&&!consumed.has(a.position)&&!consumed.has(b.position);
  relations.push({id:'liuhe:'+a.position+':'+b.position,kind:'liuhe',positions:[a.position,b.position],subjects:[a.pillar.zhi,b.pillar.zhi],status:applied?'binding-only':'observed',premises:[{name:'相邻、无冲、未成完整支局',met:applied,detail:'本版不判六合化气'}],ruleId:'binding'});
  if(applied)for(const row of rows)if(row.kind==='hidden'&&(row.position===a.position||row.position===b.position))row.bindingFactor*=P.liuheBinding;
 }refresh(rows);
 const before=rows.map(row=>({...row})),pairs:{a:Occupied;b:Occupied;target:E}[]=[];
 for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){const a=items[i],b=items[j],match=rawRules.tables.stemPairs.find(pair=>pair.slice(0,2).includes(a.pillar.gan)&&pair.slice(0,2).includes(b.pillar.gan)&&a.pillar.gan!==b.pillar.gan);if(match)pairs.push({a,b,target:match[2] as E});}
 for(const {a,b,target}of pairs){
  const unique=pairs.filter(pair=>[pair.a.position,pair.b.position].includes(a.position)).length===1&&pairs.filter(pair=>[pair.a.position,pair.b.position].includes(b.position)).length===1;
  const involvesDay=a.position==='day'||b.position==='day',outside=before.filter(row=>row.kind!=='hidden'&&row.position!==a.position&&row.position!==b.position);
  const premises=[{name:'相邻且无争合',met:b.index-a.index===1&&unique,detail:`距离${b.index-a.index}，唯一配对${unique}`},{name:'月令允许化神',met:month===target||next(month)===target,detail:`月${month}，化${target}`},{name:'化神在合对外透出或已有成局',met:outside.some(row=>row.element===target)||relations.some(row=>(row.kind==='sanhe'||row.kind==='sanhui')&&row.status==='applied'&&row.target===target),detail:'合对自身不自证化神透出'},{name:'化神有有效支载体',met:eligibleRoot(before,target),detail:`单个支载体门槛${P.rootMinimum}`},{name:'化神克方未超半量',met:amount(before,controller(target))<=amount(before,target)*P.transformationOppositionRatio+P.epsilon,detail:`克方${amount(before,controller(target))}，化神${amount(before,target)}`},{name:'日主原根及外透比印不阻化',met:!involvesDay||(!eligibleRoot(before,day)&&!outside.some(row=>row.element===day||row.element===previous(day))),detail:involvesDay?'原日主不可带有效根或外透比印':'不是日主之合'}];
  const applied=premises.every(item=>item.met),binding=!applied&&unique&&b.index-a.index===1,id='stem-combination:'+a.position+':'+b.position;
  relations.push({id,kind:'stem-combination',positions:[a.position,b.position],subjects:[a.pillar.gan,b.pillar.gan],target,status:applied?'applied':binding?'binding-only':'blocked',premises,ruleId:'stem-transform'});
  for(const row of rows.filter(row=>row.kind!=='hidden'&&(row.position===a.position||row.position===b.position))){if(applied){row.element=target;row.seasonFactor=multiplier(target,month);row.conversion=id;}else if(binding)row.bindingFactor*=P.stemBinding;}
 }refresh(rows);
 ruleTrace(trace,5,'stem-transform','五合充分前提、争合与不化合绊分列',{pairs:relations.filter(row=>row.kind==='stem-combination')});
 return relations;
}

function pathFactor(source:Carrier140,target:Carrier140){let value=P.pathByDistance[Math.abs(source.positionIndex-target.positionIndex)];if(source.kind==='hidden'&&target.kind==='hidden'&&source.position!==target.position)value*=P.hiddenAcrossBranches;else if(source.kind==='hidden'&&target.kind!=='hidden')value*=P.hiddenToExposed;return value;}

export function classifySupport145(share:number):'weak'|'strong'|'balanced'{has(Number.isFinite(share)&&share>=0&&share<=1,'比印比例超界');return share<=P.weakShare+P.epsilon?'weak':share+P.epsilon>=P.strongShare?'strong':'balanced';}

function rescuePath(rows:Carrier140[],flows:Flow140[],day:E,strength:ChartResult140['strength']):ChartResult140['rescue']{
 const dayNode=rows.find(row=>row.kind==='day-master')!,officer=controller(day),resource=previous(day);
 if(strength!=='weak'||amount(rows,officer,'power')<P.usableMinimum)return{status:'not-required',carrierIds:[],reasons:['本分支不以身弱受官杀作为当前候选拓扑问题。']};
 const candidates=rows.filter(row=>row.element===resource&&row.power>=P.usableMinimum),topology=candidates.filter(row=>flows.some(edge=>edge.kind==='generate'&&edge.target===row.id&&rows.find(source=>source.id===edge.source)?.element===officer&&edge.amount>P.epsilon)&&flows.some(edge=>edge.kind==='generate'&&edge.source===row.id&&edge.target===dayNode.id&&edge.amount>P.epsilon));
 return topology.length?{status:'candidate-topology',carrierIds:topology.map(row=>row.id),reasons:['官杀到印、印到日主存在生边，仅为候选拓扑。','1.2未认证生成来源经同一印穿透日主；保护印的净效另由指定边干预核验。']}:{status:'not-closed',carrierIds:candidates.map(row=>row.id),reasons:['未满足候选连续拓扑，完整杀印源流仍未闭合。']};
}

function decide(rows:Carrier140[],relations:Relation140[],roots:Root140[],month:E,day:E,share:number,strength:ChartResult140['strength'],flows:Flow140[],allowMonthStem:boolean){
 const total=sum(rows.map(row=>row.power)),fraction=(element:E)=>amount(rows,element,'power')/total,checks:BranchCheck140[]=[];
 const premise=(name:string,met:boolean,detail:string)=>({name,met,detail});
 const add=(branch:Branch140,ruleId:string,premises:BranchCheck140['premises'])=>{const value={branch,ruleId,premises,met:premises.every(item=>item.met)};checks.push(value);return value;};
 const hua=add('hua','hua',[premise('日主五合已经通过完整前提',relations.some(row=>row.kind==='stem-combination'&&row.status==='applied'&&row.positions.includes('day')),'未用单见合字替代成化')]);
 const food=next(day),wealth=controls(day),officer=controller(day),foodPower=amount(rows,food,'power'),wealthPower=amount(rows,wealth,'power'),officerPower=amount(rows,officer,'power'),sideTotal=foodPower+wealthPower+officerPower;
 const sideShare=sideTotal>P.epsilon?foodPower/sideTotal:0,monthStem=rows.find(row=>row.position==='month'&&row.kind==='exposed');
 const productive=flows.filter(edge=>edge.kind==='generate'&&rows.find(row=>row.id===edge.source)?.element===food&&rows.find(row=>row.id===edge.target)?.element===wealth),productiveAmount=sum(productive.map(edge=>edge.amount));
 const peerToFood=flows.filter(edge=>edge.kind==='generate'&&rows.find(row=>row.id===edge.source)?.element===day&&rows.find(row=>row.id===edge.target)?.element===food);
 const fromOutput=add('cong-output','cong-output',[
  premise('月柱食伤载体在提纲',month===food||!!(allowMonthStem&&monthStem?.element===food&&monthStem.power+P.epsilon>=P.usableMinimum),'原月支入口'+(month===food)+'；月干提案本次启用'+allowMonthStem),
  premise('食伤在泄耗制支路成气',foodPower+P.epsilon>=P.rootMinimum&&sideShare+P.epsilon>=P.fromOutputShare,'支路量比'+sideShare+'；分母不含比印'),
  premise('财有承接合量',wealthPower+P.epsilon>=P.usableMinimum,'财合量'+wealthPower+'；不是总盘财占比'),
  premise('实际食伤生财路径闭合',productiveAmount+P.epsilon>=P.usableMinimum,'食伤→财合流'+productiveAmount),
  premise('比劫确实顺生食伤',sum(peerToFood.map(edge=>edge.amount))>P.epsilon,'保留有源、有对象的生边；身旺身弱均不作门槛'),
  premise('印未构成有效夺食阻断',amount(rows,previous(day),'power')<P.opponentAbsMaximum-P.epsilon,String(amount(rows,previous(day),'power'))),
  premise('官杀未形成反向牵制',officerPower<P.opponentAbsMaximum-P.epsilon,String(officerPower))
 ]);
 const fromStrong=add('cong-strong','cong-strong',[premise('比印成主势',share+P.epsilon>=P.fromStrongShare,String(share)),premise('日主仍有项目有效根',roots.some(root=>root.effective),'按受冲合及控制后的单载体门槛'),premise('官杀不破势',amount(rows,controller(day),'power')<P.opponentAbsMaximum-P.epsilon,String(amount(rows,controller(day),'power'))),premise('财不破势',amount(rows,controls(day),'power')<P.opponentAbsMaximum-P.epsilon,String(amount(rows,controls(day),'power')))]);
 const external=rows.filter(row=>row.kind==='exposed'&&(row.element===day||row.element===previous(day))&&row.power+P.epsilon>=P.externalSupportMinimum);
 const weakChecks=([['cong-wealth',controls(day)],['cong-officer',controller(day)]] as const).map(([branch,target])=>add(branch,'cong-weak',[
  premise('比印未超过从弱门槛',share<=P.fromWeakShare+P.epsilon,String(share)),premise('日主无有效根',!roots.some(root=>root.effective),'原支事实不删除；只判本项目有效权重'),premise('没有有力外透比印',!external.length,external.map(row=>row.id).join(',')),premise('目标独成主势',fraction(target)+P.epsilon>=P.dominanceShare,String(fraction(target))),premise('月令同目标或生目标',month===target||next(month)===target,`月${month}、目标${target}`)
 ]));
 const ordered=weakChecks.filter(check=>check.met).sort((a,b)=>fraction(a.branch==='cong-wealth'?controls(day):controller(day))-fraction(b.branch==='cong-wealth'?controls(day):controller(day))).reverse();
 const branch:Branch140=hua.met?'hua':fromOutput.met?'cong-output':fromStrong.met?'cong-strong':ordered[0]?.branch??('regular-'+strength as Branch140);
 return{branch,checks};
}
function chooseUses(branch:Branch140,rows:Carrier140[],day:E,rescue:ChartResult140['rescue'],flows:Flow140[],protection:ResourceProtection[]){
 const actual=(element:E)=>rows.filter(row=>row.element===element&&row.power+P.epsilon>=P.usableMinimum).map(row=>row.id);
 const item=(element:E,role:UseItem140['role'],reason:string,ruleIds:string[]):UseItem140=>({element,role,reason,carrierIds:actual(element),ruleIds});
 const uses:UseItem140[]=[],alternatives:ChartResult140['alternativeUses']=[];
 const add=(primary:E,secondary:E,avoid:E[],reason:string,ruleId:string)=>{uses.push(item(primary,'primary',reason,[ruleId]),item(secondary,'secondary','作为主方向的辅助；有无现成载体另列。',[ruleId]));for(const element of [...new Set(avoid)])if(element!==primary&&element!==secondary)uses.push(item(element,'avoid','在当前已采用的项目分支下，会逆势或加重当前主病。',[ruleId]));};
 if(branch==='hua')add(day,previous(day),[controller(day),controls(day)],'日主已满足本项目顺化前提，顺化神而取其生源。','hua');
 else if(branch==='cong-output'){add(controls(day),next(day),[previous(day),controller(day)],'月柱食伤有气并有可追踪生财合流，取财承接再助食伤；日主可强可弱。','cong-output');const primary=uses.find(use=>use.role==='primary')!,productive=flows.filter(edge=>edge.kind==='generate'&&rows.find(row=>row.id===edge.source)?.element===next(day)&&rows.find(row=>row.id===edge.target)?.element===controls(day));primary.carrierIds=[...new Set(productive.map(edge=>edge.target))];primary.carrierBasis='collective-productive-path';primary.flowIds=productive.map(edge=>edge.id);}
 else if(branch==='cong-strong')add(day,previous(day),[controls(day),controller(day)],'比印已满足本项目从强条件，顺其主势。','cong-strong');
 else if(branch==='cong-wealth')add(controls(day),next(day),[day,previous(day)],'财成主势且无有效救身载体，按本项目从财顺财与财之生源。','cong-weak');
 else if(branch==='cong-officer')add(controller(day),controls(day),[day,previous(day),next(day)],'官杀成主势且无有效救身载体，按本项目从杀取官杀与财资。','cong-weak');
 else if(branch==='regular-weak'){
  const resource=previous(day),injured=rows.some(row=>row.element===resource&&row.incomingControl>row.capacity*P.rescueHeavyControlRatio);
  const protectedPaths=protection.filter(item=>item.status==='effective-project-path');
  if(protectedPaths.length){add(resource,day,[next(day),controls(day),controller(day)],'同靶干预证实比劫制财减轻该印净损，且该印向日主的实际生成贡献增加；仅为项目保护环节，不认证完整杀印来源穿透。','resource-protection');const primary=uses.find(item=>item.role==='primary')!;primary.carrierIds=[...new Set(protectedPaths.map(item=>item.resourceId))];primary.flowIds=protectedPaths.map(item=>'generate:'+item.resourceId+':'+item.dayId);}
  else if(injured)add(day,resource,[next(day),controls(day),controller(day)],'已有印被重制且未获同靶保护认证，先列比劫扶助，印须先解制后采用。','regular-use');
  else add(resource,day,[next(day),controls(day),controller(day)],'身弱未满足从化条件，按本项目扶抑列印比方向；未获同靶保护认证，不据两条生边声称完整通关。','regular-use');
 }else if(branch==='regular-strong'){
  if(actual(next(day)).length)add(next(day),controls(day),[day,previous(day)],'常规身旺已有食伤载体，优先泄秀，再取财承接。','regular-use');
  else if(actual(controls(day)).length)add(controls(day),next(day),[day,previous(day)],'常规身旺而财有载体，先承财，再列食伤通财目标。','regular-use');
  else if(actual(controller(day)).length)add(controller(day),controls(day),[day,previous(day),next(day)],'常规身旺有官杀载体而食伤财未成路径，列官杀制身并辅财；食伤与此方案相冲。','regular-use');
  else{alternatives.push({id:'strong-needs-outlet',condition:'身旺但当前缺可承担泄耗制的载体，须先核新增方向是否能够落实，暂不定唯一主用。',uses:[item(next(day),'primary','待补的泄秀方向；当前没有可用载体。',['regular-use']),item(controls(day),'secondary','待核的承接方向。',['regular-use'])]});}
 }else{
  alternatives.push({id:'balanced-protect',condition:'若进一步确认官杀耗制为主病，再采用扶助方案；当前中和分类不足以独断。',uses:[item(previous(day),'primary','条件化扶助方案。',['regular-use']),item(day,'secondary','条件化比劫辅助。',['regular-use'])]},{id:'balanced-circulate',condition:'若进一步确认日主可承受泄秀且以月令流通为要，再采用泄秀生财方案。',uses:[item(next(day),'primary','条件化泄秀方案。',['regular-use']),item(controls(day),'secondary','条件化财星承接。',['regular-use'])]});
 }
 return{uses,alternatives};
}
/** Preserve nested concrete plans; an empty direct use list is not a branch plan. */
export function conditionalUsesForBranch145(branch:Branch140,rows:Carrier140[],day:E,rescue:ChartResult140['rescue'],flows:Flow140[],protection:ResourceProtection[],condition:string):ChartResult140['alternativeUses'] {
 const selected=chooseUses(branch,rows,day,rescue,flows,protection),plans:ChartResult140['alternativeUses']=[];
 if(selected.uses.length)plans.push({id:'numeric-'+branch,condition,uses:selected.uses});
 for(const alternative of selected.alternatives)plans.push({id:'numeric-'+branch+':'+alternative.id,condition:condition+' '+alternative.condition,uses:alternative.uses});
 return plans;
}

export function reviewSeasonal145(monthBranch:string,rows:Carrier140[],uses:UseItem140[],originalStem:string,state:CarrierFlowSettlement,mainUncertain=false):ChartResult140['seasonal']{
 const total=sum(rows.map(row=>row.power)),share=(element:E)=>amount(rows,element,'power')/total,branches=rows.filter(row=>row.kind==='hidden').map(row=>row.branch!),targets:E[]=[],reasons:string[]=[];
 if('亥子丑'.includes(monthBranch)){targets.push('火');reasons.push('项目冬月寒暖辅助：核火是否已有可用载体。');}
 else if('巳午未'.includes(monthBranch)){targets.push('水');reasons.push('项目夏月寒暖辅助：核水是否已有可用载体。');}
 else if(new Set(rows.filter(row=>row.kind==='hidden'&&row.branch&&'戌未'.includes(row.branch)).map(row=>row.position)).size>=2){targets.push('水');reasons.push('项目燥土集中辅助：核润燥方向。');}
 else if(new Set(rows.filter(row=>row.kind==='hidden'&&row.branch&&'辰丑'.includes(row.branch)).map(row=>row.position)).size>=2){targets.push('火');reasons.push('项目湿土集中辅助：核温暖方向。');}
 const reference=seasonalBook.entries.find(entry=>entry.dayStem===originalStem&&entry.monthBranch===monthBranch);
 const conflicts=targets.filter(element=>uses.some(use=>use.element===element&&use.role==='avoid')),supplied=targets.every(element=>share(element)+P.epsilon>=P.seasonalSuppliedShare&&rows.some(row=>row.element===element&&row.power>=P.usableMinimum));
 let status:ChartResult140['seasonal']['status']=!targets.length?'not-triggered':conflicts.length?'conflict-with-main':supplied?'already-supplied':'auxiliary-needed';
 const numericMissing:string[]=[],statusCandidates:ChartResult140['seasonal']['statusCandidates']=[];
 const totalBounds=sumIntervals(rows.map(row=>state.bounds.powers[row.id]));
 for(const target of targets){const relevant=rows.filter(row=>row.element===target),shareBounds=divide(sumIntervals(relevant.map(row=>state.bounds.powers[row.id])),totalBounds),usableDefinite=relevant.some(row=>state.bounds.powers[row.id].lower>=P.usableMinimum),usablePossible=relevant.some(row=>state.bounds.powers[row.id].upper>=P.usableMinimum),shareDefinite=shareBounds.lower+P.epsilon>=P.seasonalSuppliedShare,sharePossible=shareBounds.upper+P.epsilon>=P.seasonalSuppliedShare;
  if(usablePossible!==usableDefinite||sharePossible!==shareDefinite)numericMissing.push('调候目标'+target+'的供给比例或单载体可用量跨数值误差区间。');
 }
 if(targets.length&&(numericMissing.length||mainUncertain)){
  if(mainUncertain)numericMissing.push('主链取用尚有相邻方案，调候与主链是否冲突须保留条件。');
  const supplyStates=targets.map(target=>{const relevant=rows.filter(row=>row.element===target),shareBounds=divide(sumIntervals(relevant.map(row=>state.bounds.powers[row.id])),totalBounds);return{definite:shareBounds.lower+P.epsilon>=P.seasonalSuppliedShare&&relevant.some(row=>state.bounds.powers[row.id].lower>=P.usableMinimum),possible:shareBounds.upper+P.epsilon>=P.seasonalSuppliedShare&&relevant.some(row=>state.bounds.powers[row.id].upper>=P.usableMinimum)};});
  if(supplyStates.every(item=>item.possible))statusCandidates.push('already-supplied');
  if(!supplyStates.every(item=>item.definite))statusCandidates.push('auxiliary-needed');
  if(mainUncertain||conflicts.length)statusCandidates.push('conflict-with-main');status='pending-prerequisite';
 }else statusCandidates.push(status);
 if(conflicts.length)reasons.push('寒暖辅助与当前主分支喜忌冲突，保留分层，不自动覆盖主用。');
 if(reference)reasons.push('附固定穷通该日干月支初始语句；其原文条件及未覆盖变例不被转成唯一取用。');
 return{projectElements:targets,status,statusCandidates,numericMissing,sourceReference:reference?JSON.parse(JSON.stringify(reference)):null,reasons};
}


export interface PreparedRootInput145 {input:RootFeedbackInput;monthElement:E;monthStem:string;originalDay:E;trace:Trace140[];policy:MethodPolicy140;}
export function prepareRootInput145(chart:ChartCase140,policy:MethodPolicy140={},hypothetical=false):PreparedRootInput145{
 has(policy.fromOutputMonthStem===undefined||typeof policy.fromOutputMonthStem==='boolean','从儿入口选择须为布尔值');const allowMonthStem=policy.fromOutputMonthStem===true,entryPolicy=allowMonthStem?'month-stem-proposal' as const:'month-branch-only' as const;
 has(chart&&typeof chart.id==='string'&&chart.id.length>0&&typeof chart.provenance==='string'&&chart.provenance.length>0,'每盘必须有身份与历法/结构对照来源');
 for(const position of ['year','month','day'] as const){has(chart.pillars?.[position],'缺少已知'+position+'柱');validPillar(chart.pillars[position]);}if(chart.pillars.hour!==null)validPillar(chart.pillars.hour);
 const items=occupied(chart),originalDay=stemElements[chart.pillars.day.gan],monthStem=hidden[chart.pillars.month.zhi][0],monthElement=stemElements[monthStem],trace:Trace140[]=[];
 ruleTrace(trace,1,'input','复用传入四柱，不重排历法、不补小时',{caseId:chart.id,provenance:chart.provenance,knownPositions:items.map(item=>item.position),hypothetical});
 ruleTrace(trace,1,'facts','固定干五行与藏干原列序',{pillars:items.map(item=>({position:item.position,...item.pillar,hiddenStems:hidden[item.pillar.zhi]}))});
 const rows=makeCarriers(items,monthElement);refresh(rows);
 ruleTrace(trace,2,'season','月支主气及项目季节权重；月令不独断旺弱',{monthBranch:chart.pillars.month.zhi,principalStem:monthStem,monthElement,relationToDay:relation(monthElement,originalDay)});
 const relations=resolveRelations(items,rows,monthElement,originalDay,trace);
 const pathFactors=rows.flatMap(source=>rows.map(target=>({source:source.id,target:target.id,factor:pathFactor(source,target)})));
 const nativeHiddenOrder=Object.fromEntries(rows.filter(row=>row.kind==='hidden').map(row=>[row.id,hidden[chart.pillars[row.position]!.zhi].indexOf(row.stem)]));
 return{input:{id:chart.id,scope:chart.pillars.hour?'complete-known-pillars':'known-pillars-only',carriers:structuredClone(rows),relations:structuredClone(relations),pathFactors,methodId:METHOD_145,chart:structuredClone(chart),pending:[],nativeHiddenOrder},monthElement,monthStem,originalDay,trace,policy:structuredClone(policy)};
}

export function consumeRootRegime145(prepared:PreparedRootInput145,settled:CarrierFlowSettlement,regimeId:string,hypothetical=false):ChartResult140 {
 if(settled.status!=='closed')throw new Error('未闭合状态不得进入每态取用消费者。');
 const chart=prepared.input.chart! as ChartCase140,rows=settled.carriers,relations=[...prepared.input.relations],monthElement=prepared.monthElement,monthStem=prepared.monthStem,originalDay=prepared.originalDay,trace=structuredClone(prepared.trace),policy=prepared.policy,allowMonthStem=policy.fromOutputMonthStem===true,entryPolicy=allowMonthStem?'month-stem-proposal' as const:'month-branch-only' as const;
 const flows=settled.flows,day=rows.find(row=>row.kind==='day-master')!.element;
 ruleTrace(trace,6,'root-feedback','外层机制已固定本态根假设与容量；此态内部不更改C/A',{regimeId,capacities:rows.map(row=>({id:row.id,rootFactor:row.rootFactor,capacity:row.capacity}))});

 const protection=evaluateRootRegimeProtections(settled,prepared.input.pathFactors,chart.pillars.hour!==null),numericReview=reviewNumericalThresholds(settled);
 ruleTrace(trace,8,'resource-protection','按同一财、印、日主身份分别核指定边干预三项净效；边际收益不相加',{protection,numericReview});
 const powers=Object.fromEntries(elements.map(element=>[element,amount(rows,element,'power')])) as Record<E,number>,total=sum(Object.values(powers));has(total>P.epsilon,'项目载体总权重无法形成');
 const supportShare=(powers[day]+powers[previous(day)])/total,strength=classifySupport145(supportShare),boundarySensitive=Math.min(Math.abs(supportShare-P.weakShare),Math.abs(supportShare-P.strongShare))<=P.boundaryBand+P.epsilon;
 const roots:Root140[]=rows.filter(row=>row.kind==='hidden'&&row.element===day).map(row=>({carrierId:row.id,position:row.position,stem:row.stem,element:row.element,amount:row.power,effective:row.power+P.epsilon>=P.rootMinimum}));
 ruleTrace(trace,8,'strength','按已结算项目作用权重判旺弱；不称命局实测量',{powers,total,supportShare,strength,boundarySensitive});
 const {branch,checks}=decide(rows,relations,roots,monthElement,day,supportShare,strength,flows,allowMonthStem);ruleTrace(trace,9,checks.find(check=>check.branch===branch)?.ruleId??'regular-use','一般特殊分支核验后继续常规扶抑',{selected:branch,checks});
 const originalEntry=monthElement===next(day),monthStemCarrier=rows.find(row=>row.position==='month'&&row.kind==='exposed'),proposedEntry=!!(monthStemCarrier?.element===next(day)&&monthStemCarrier.power+P.epsilon>=P.usableMinimum),childOtherConditions=checks.find(check=>check.branch==='cong-output')!.premises.slice(1).every(premise=>premise.met);ruleTrace(trace,9,'cong-output-entry-policy','原入口与新增入口分别保留，不混作经典唯一必要条件',{entryPolicy,originalMonthBranchEntry:originalEntry,proposedMonthStemEntry:proposedEntry,originalEntryAndNewActionConditions:originalEntry&&childOtherConditions,proposedEntryAndNewActionConditions:(originalEntry||proposedEntry)&&childOtherConditions});
 const rescue:ChartResult140['rescue']=branch==='regular-weak'?rescuePath(rows,flows,day,strength):{status:'not-required',carrierIds:[],reasons:['所选分支不是常规偏弱扶抑，不反向启动印星通关消费者。']};ruleTrace(trace,10,'rescue','仅列官杀印日候选拓扑，完整来源穿透未认证',{...rescue});
 let {uses,alternatives}=chooseUses(branch,rows,day,rescue,flows,protection);
 if(numericReview.status==='pending-prerequisite'){
  const provisional=uses;alternatives.push({id:'numeric-current-branch',condition:'当前点估计对应分支，但数值区间跨门槛，暂不自动采用。',uses:provisional});
  for(const candidate of intervalBranchCandidates(settled,relations,monthElement,policy)){if(candidate.branch!==branch)alternatives.push(...conditionalUsesForBranch145(candidate.branch,rows,day,rescue,flows,protection,'数值区间允许该相邻项目分支；须逐项核'+candidate.premises.filter(item=>item.status==='uncertain').map(item=>item.name).join('、')+'，当前未作成格认证。'));}
  uses=[];
 }
 const decisionStatus:ChartResult140['decisionStatus']=uses.length?'resolved-by-project-rules':'competing-interpretations';
 ruleTrace(trace,10,'regular-use','给分层项目意见；关键未闭合时保留具体替代，不强行兜底',{uses,alternatives,decisionStatus});
 const seasonal=reviewSeasonal145(chart.pillars.month.zhi,rows,uses,chart.pillars.day.gan,settled,numericReview.status==='pending-prerequisite');ruleTrace(trace,11,'seasonal','调候辅助与主链分开处理，目标门槛跨界保留待定及相邻状态',{projectElements:seasonal.projectElements,status:seasonal.status,statusCandidates:seasonal.statusCandidates,numericMissing:seasonal.numericMissing});ruleTrace(trace,11,'qiong-reference','仅引用固定日干月支初始参照，不自动采纳古文断语',{sourceLocator:(seasonal.sourceReference as {sourceLocator?:string}|null)?.sourceLocator??null});
 const missing:string[]=[];if(numericReview.status==='pending-prerequisite')missing.push('数值区间跨越具体门槛：'+numericReview.affectedPredicates.map(item=>item.id).join('、')+'；保留相邻判断，不按显示舍入裁定。');if(!chart.pillars.hour)missing.push('缺小时：新根、透干、争合及冲合可能改变结论；当前只算已知三柱。');if(!uses.length)missing.push(branch==='regular-balanced'?'中和盘的唯一月令格局取用次序在本方法中未闭合；列出扶助与泄秀的具体条件化方案。':'当前有旺势但缺可承担泄耗制的载体，未闭合唯一主用。');
 const qualitative=strength==='weak'?'偏弱':strength==='strong'?'偏旺':'中和',summary=[`已知${chart.pillars.hour?'四':'三'}柱在本项目权重规则下判为${qualitative}。`,uses.length?`采用${branch}项目分支；主方向为${uses.filter(use=>use.role==='primary').map(use=>use.element).join('、')}。`:'当前不强置唯一主用，保留具体替代及其前提。'];if(boundarySensitive)summary.push('临近项目旺弱分界，须同时复核相邻方案。');if(!chart.pillars.hour)summary.push('缺小时，以上只为已知三柱的暂定推导。');if(seasonal.status==='conflict-with-main')summary.push('调候辅助与主分支有冲突，未自动合并。');
 if(branch==='cong-output'&&!originalEntry&&allowMonthStem)summary.push('本结论使用新增月干入口，属于项目提案；仅原月支入口结果另行保留供复核。');
 const capacityBasis=rows.map(row=>({carrierId:row.id,rootEvidence:'regime-assumption' as const,effectiveSeedRootIds:rows.filter(candidate=>candidate.kind==='hidden'&&candidate.element===row.element&&candidate.seed+P.epsilon>=P.rootMinimum).map(candidate=>candidate.id),seedResourceAmount:amount(rows,previous(row.element)),rootFactor:row.rootFactor,capacity:row.capacity}));
 const output:ChartResult140={status:'settled',controlSettlement:settled.controlSettlement,resourceProtection:protection,resourceProtectionCoverage:{status:!chart.pillars.hour?'pending-input':protection.length?'complete-fixed-graph':'no-eligible-path',missing:!chart.pillars.hour?['缺时，不认证完整盘同靶印保护。']:protection.length?[]:['已知载体未构成可检验的比劫→财→印身份链。']},numericReview,branchCandidates:intervalBranchCandidates(settled,relations,monthElement,policy),caseId:chart.id,hypothetical,coverage:chart.pillars.hour?'complete':'known-three-pillars',methodId:METHOD_145,entryPolicy,originalPillars:JSON.parse(JSON.stringify(chart.pillars)),dayMaster:{stem:chart.pillars.day.gan,originalElement:originalDay,workingElement:day},month:{branch:chart.pillars.month.zhi,principalStem:monthStem,element:monthElement,relationToDay:relation(monthElement,originalDay)},strength,boundarySensitive,branch,decisionStatus,summary,uses,alternativeUses:alternatives,rescue,seasonal,trace,calculationTrace:{carriers:rows,roots,relations,flows,powers,supportShare,branchChecks:checks,intervals:settled.bounds,numericReview,capacityBasis,posteriorRoots:structuredClone(roots),rootFeedback:'root-regime'},missing,limitations:[...rawRules.limitations]};
 return structuredClone(output);
}
