/** Same-edition 从杀 support subsets and dependent rejection signals; no production evaluator imported. */
import fs from'node:fs';import path from'node:path';import crypto from'node:crypto';
const root=process.cwd(),read=file=>fs.readFileSync(path.join(root,file),'utf8'),sha=input=>crypto.createHash('sha256').update(input).digest('hex');
const assert=(test,message)=>{if(!test)throw new Error(message);},stable=value=>JSON.stringify(value,null,2)+'\n';
const write=(file,value)=>{const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target+'.tmp',typeof value==='string'?value:stable(value));fs.renameSync(target+'.tmp',target);};
const VERSION='qiongtong-2294674-monthly-cong-sha/1.0.0',ID='bazi-cong-sha-qiongtong-2294674';
const meta=JSON.parse(read('data/raw/monthly-seasonal-qiongtong-source.json')),rawFile='data/raw/cong-sha-qiongtong-excerpts.json';
if(process.argv.includes('--archive')){
 const bytes=fs.readFileSync(path.join(root,'.local/tiaohou-112/qiongtong-revision2294674.wiki'));assert(sha(bytes)===meta.rawSha256,'Fixed2294674 original hash mismatch');const full=bytes.toString('utf8');
 const inputs=[
 ['bing-hai-context',"'''十月丙火'''，太阳失令，得见甲戊庚出干，可云科甲，主为人性好清高，斯文领袖。如辛透见辰，名化合逢时，主大贵。"],
 ['bing-hai-route','或壬多无甲，乃作弃命从杀，即不科甲，亦是宦僚。或壬多有甲无戊，却非从杀，宜用己土混壬。'],
 ['bing-zi-context',"'''十一月丙火'''，冬至一阳生，弱中复强，壬水为最，戊土佐之。"],
 ['bing-zi-route','或四柱多壬无甲，乃作弃命从杀，亦有云路。'],
 ['bing-zi-negative','或水多、有甲、无戊，却非从杀，宜用己土浊壬，十一月丙火，与十月颇同。'],
 ['ding-zi-route',"'''十一月丁火'''，或仲冬水多癸旺，全无比印，此作弃命从杀，亦有异途功名。见丁比出干，难合格局，常人，且主骨肉浮云，六亲流水。戊出破癸，颇有兄弟妻儿。此格用戊，火妻土子。用甲、水妻木子。"],
 ['geng-wu-context',"'''五月庚金'''，丁火旺烈，庚金败地，专用壬水，癸又次之。壬透癸藏，支见庚辛，必然科甲，切忌戊己透干制水、则否。戊藏支内，不失儒林。或壬在支，有金生助，又得金神出干，明经之贵。或癸出带辛，异路之荣。"],
 ['geng-wu-route','总之，仲夏无水，必非上格，或一派木火，无伤、印、比劫，又作从杀而论。'],
 ['gui-wu-context',"'''五月癸水'''，至弱无根，必须庚辛为生身之本，但丁火司权，金难敌火，安能滋养癸水，宜见比劫，方得辛金之用。五月癸水，庚辛壬参酌并用可也。"],
 ['gui-wu-route','或支成火局，无壬出干，定主僧道。或二壬一庚同透，衣锦腰金。或一派己土，无甲出制，此作从杀而论，又主大贵。凡从杀者，切不可破格方吉。'],
 ];
 const excerpts=inputs.map(([id,quote])=>{const index=full.indexOf(quote);assert(index>=0,'Missing exact original '+id);const start=[...full.slice(0,index)].length,end=start+[...quote].length;return{id,sourceQuote:quote,sourceLocator:`oldid=2294674;codepoint[${start},${end})`,sourceSpan:{start,end,unit:'unicode-codepoint',interval:'[start,end)'}};});
 write(rawFile,{version:VERSION,source:meta,changes:'Ten exact contextual passages retained. Five monthly 从杀 routes distinguish unknown strength/scope from observable stem-position subsets and dependent counter-signals. No original fortune conclusions implemented.',excerpts});
}
const archive=JSON.parse(read(rawFile));assert(archive.version===VERSION&&archive.excerpts.length===10,'Source context incomplete');
const q=id=>{const found=archive.excerpts.find(x=>x.id===id);assert(found,'Missing passage '+id);const{id:unused,...quote}=found;return quote;};
const stem=(value,present=true)=>({kind:'stem',stem:value,scope:'exposed',includeDayMaster:false,present});
const noPair=(a,b)=>({kind:'all',items:[stem(a,false),stem(b,false)]});
function criterion(id,name,role,decisionUse,quote,passage,predicate,unresolved=[]){const original=q(passage);assert(original.sourceQuote.includes(quote),'Criterion is not literal '+id);return{id,name,role,decisionUse,scope:predicate?'仅非日主明干位置子集；不推断藏干、有效气或成格':'原文旺弱、范围或制化取法未核',sourceQuote:quote,sourceLocator:original.sourceLocator,...(predicate?{predicate}:{}),unresolved};}
const branch=(id,name,passage,premises,signals,unresolved)=>({id,name,...q(passage),premiseCriterionIds:premises,signalCriterionIds:signals,outcome:'contradicted',unresolved});
const rule=(id,name,day,month,passage,criteria,branches=[],context=[])=>({id,pattern:'cong-sha',kind:'cong-killing',name,sourceId:ID,applicability:{dayStems:[day],monthBranches:[month]},candidatePolicy:'pending-unimplemented-necessary',...q(passage),criteria,rejectionBranches:branches,context:context.map(q),unresolved:['这是同版指定月别原句路径，不代表全部从杀流派。','本轮必要旺弱／一派等取法未实现，不能由位置子集推出从杀成立。','原文科甲、富贵、贫贱、性格、家属与命运等历史断语不实施。']});
const bingHai=rule('bing-hai-monthly-cong-sha','丙日亥月原句从杀路径','丙','亥','bing-hai-route',[
 criterion('bing-hai-ren-many','壬多','necessary','rejection-premise','壬多','bing-hai-route',undefined,['多的明干／藏干范围与有效气取法未明，不以数量阈值代替。']),
 criterion('bing-hai-jia-absent','无甲','necessary','necessary','无甲','bing-hai-route',undefined,['无甲未明示只看明干或包括藏根；不把甲存在直接等同本句完整反证。']),
 criterion('bing-hai-jia-present-signal','有甲的原句范围','exception','rejection-signal','有甲','bing-hai-route',undefined,['有甲的明暗作用范围未核。']),
 criterion('bing-hai-wu-absent-signal','无戊的原句范围','exception','rejection-signal','无戊','bing-hai-route',undefined,['无戊的明暗作用范围未核。']),
],[branch('bing-hai-dependent-negative','壬多且有甲无戊的反向原句','bing-hai-route',['bing-hai-ren-many'],['bing-hai-jia-present-signal','bing-hai-wu-absent-signal'],['壬多和甲戊作用范围均未齐备，不能仅甲有戊无就宣告本条从杀不成立。'])],['bing-hai-context']);
const bingZi=rule('bing-zi-monthly-cong-sha','丙日子月原句从杀路径','丙','子','bing-zi-route',[
 criterion('bing-zi-ren-many','四柱多壬','necessary','necessary','四柱多壬','bing-zi-route',undefined,['四柱范围明确但多的气势／有效性未定义，不设壬数量门槛。']),
 criterion('bing-zi-jia-absent','无甲的作用范围','necessary','necessary','无甲','bing-zi-route',undefined,['甲明干／藏干作用范围未明，不自定无印。']),
 criterion('bing-zi-water-many-negative','反向句的水多前提','exception','rejection-premise','水多','bing-zi-negative',undefined,['原反向句为水多，不可偷换为任何一个水或上一句多壬。']),
 criterion('bing-zi-jia-present-signal','反向句有甲','exception','rejection-signal','有甲','bing-zi-negative',undefined,['有甲作用域未明。']),
 criterion('bing-zi-wu-absent-signal','反向句无戊','exception','rejection-signal','无戊','bing-zi-negative',undefined,['无戊作用域未明。']),
],[branch('bing-zi-dependent-negative','水多且有甲无戊的反向原句','bing-zi-negative',['bing-zi-water-many-negative'],['bing-zi-jia-present-signal','bing-zi-wu-absent-signal'],['水多前提及甲戊范围未核，单见甲或未见戊均不足整体反证。'])],['bing-zi-context','bing-zi-negative']);
const dingZi=rule('ding-zi-monthly-cong-sha','丁日子月原句从杀路径','丁','子','ding-zi-route',[
 criterion('ding-zi-water-many','仲冬水多','necessary','rejection-premise','水多','ding-zi-route',undefined,['水多有效气和气势未定，不用五行明字数量代替。']),
 criterion('ding-zi-gui-strong','癸旺','necessary','rejection-premise','癸旺','ding-zi-route',undefined,['癸旺未给定本包可执行取法，不用扶抑加权比例代替。']),
 criterion('ding-zi-no-peer-resource','全无比印','necessary','necessary','全无比印','ding-zi-route',undefined,['全无比印涉及明暗生扶及有效气作用范围，未把有任一藏根作绝对破格。']),
 criterion('ding-zi-extra-ding-exposed','已见额外丁比出干','exception','rejection-signal','见丁比出干','ding-zi-route',stem('丁'),['只核额外丁明干；原句反向判断仍依赖仲冬水多癸旺，不能脱离前提。']),
 criterion('ding-zi-wu-exposed','戊出的位置子集','support','support-only','戊出破癸','ding-zi-route',stem('戊'),['仅戊明干出现可核；破癸的制化效果和原后果未核，不转用神或整体反证。']),
],[branch('ding-zi-dependent-extra-ding','水多癸旺背景下见丁比出干','ding-zi-route',['ding-zi-water-many','ding-zi-gui-strong'],['ding-zi-extra-ding-exposed'],['额外丁虽可观察，水多癸旺未核齐全时只记反对信号，不把本条整体升级为不成立。'])]);
const gengWu=rule('geng-wu-monthly-cong-sha','庚日午月原句从杀路径','庚','午','geng-wu-route',[
 criterion('geng-wu-wood-fire-field','一派木火','necessary','necessary','一派木火','geng-wu-route',undefined,['一派的范围、纯杂及气势未核，不把木火数量比例当作充分条件。']),
 criterion('geng-wu-no-shang','无伤的原文含义','necessary','necessary','无伤','geng-wu-route',undefined,['伤可能指伤官或伤食等，不把伤字擅扩或缩为确定天干集合。']),
 criterion('geng-wu-no-resource-full','无印完整范围','necessary','necessary','印','geng-wu-route',undefined,['印的明暗和有效生扶范围未核；明干子集核对不能代表完整无印。']),
 criterion('geng-wu-no-peer-full','无比劫完整范围','necessary','necessary','比劫','geng-wu-route',undefined,['比劫明暗根气完整范围未核，不忽略藏根证明无扶。']),
 criterion('geng-wu-no-resource-exposed-subset','明干无戊己的无印位置子集','support','support-only','印','geng-wu-route',noPair('戊','己'),['只核非日干明干子集；不因其满足就将原完整无印判满足。']),
 criterion('geng-wu-no-peer-exposed-subset','明干无额外庚辛的无比劫位置子集','support','support-only','比劫','geng-wu-route',noPair('庚','辛'),['日干庚自身不计额外比劫；藏根未核，此子集不裁定完整无比劫。']),
],[],['geng-wu-context']);
const guiWu=rule('gui-wu-monthly-cong-sha','癸日午月原句从杀路径','癸','午','gui-wu-route',[
 criterion('gui-wu-ji-field','一派己土','necessary','rejection-premise','一派己土','gui-wu-route',undefined,['一派己土的范围、纯杂、数量和气势未核，不设阈值。']),
 criterion('gui-wu-no-effective-jia-control','无甲出制的完整前提','necessary','necessary','无甲出制','gui-wu-route',undefined,['明干甲是否有效出制取决于未核制化，不把只见甲等于制杀有效。']),
 criterion('gui-wu-jia-exposed-absent-subset','明干未见甲的位置子集','support','support-only','无甲出制','gui-wu-route',stem('甲',false),['仅无明干甲这个可见子集；有效出制及原句完整前提仍待审。']),
 criterion('gui-wu-jia-exposed-signal','已见甲明干的潜在反对信号','exception','rejection-signal','无甲出制','gui-wu-route',stem('甲'),['只显示甲明干存在，不能独自证明其能制或原句应被否定。']),
 criterion('gui-wu-effective-control-premise','甲确能出制的效果','exception','rejection-premise','出制','gui-wu-route',undefined,['甲出制的力量、合克及作用位置未核；反向判断必须保留这一依赖。']),
],[branch('gui-wu-dependent-jia-control','一派己土背景下甲出现并确能出制','gui-wu-route',['gui-wu-ji-field','gui-wu-effective-control-premise'],['gui-wu-jia-exposed-signal'],['只有甲明干信号不能跳过一派己土及有效出制；当前依赖未齐故不能整体反证。'])],['gui-wu-context']);
const rules=[bingHai,bingZi,dingZi,gengWu,guiWu];
assert(new Set(rules.map(x=>x.id)).size===5,'Rule IDs not unique');
for(const rule of rules){const ids=new Set(rule.criteria.map(x=>x.id));for(const branch of rule.rejectionBranches)for(const id of[...branch.premiseCriterionIds,...branch.signalCriterionIds])assert(ids.has(id),'Unknown rejection dependency '+id);assert(rule.criteria.some(x=>x.role==='necessary'&&!x.predicate),'Every route must keep its unimplemented source necessity');}
const table={version:VERSION,sourceId:ID,title:'穷通宝鉴同版从杀：限定事实与依赖反向句',source:meta,rules,
 contract:{scope:'丙亥、丙子、丁子、庚午、癸午五条月别路径；不是完整从杀判格。',status:'全部仍有未实现必要，故不能作完整候选。明干位置支持或反对信号单独显示；条件依赖未齐的反向原句保持pending。',dependentRejection:'反向分支全部premises与signals已明确满足才可记本条反证；unknown/notimplemented前提不能被某个已见信号覆盖。',noThreshold:'不把多、旺、一派、伤、全无比印或出制的未明范围编成计数或力量阈值。',legacy:'新独立来源和补充证据，不覆写从财规则、旧版本输出或其他书真假从取法。'},
 limitations:['本轮提供有出处的支持位置、反向信号和未核因素；不把pending误写成未做任何工作。','明干子集即使满足，也不能提升完整必要条件；support-only与rejection-signal均不能直接决定格局。','未实现必要不可为了得到candidate而删去或降成support。','反向原句只适用于同句背景，不泛化到所有从杀／从财流派。','原文涉及命运、科甲、财富、性格、婚姻或身体断语不实施。','固定电子转录未独立校勘影印或底本，不主张科学命运效果。']};
if(process.argv.includes('--write'))write('data/cong-sha-rules.json',table);else assert(read('data/cong-sha-rules.json')===stable(table),'Fromkilling rules differ');
const p=(pillar,stem)=>({pillar,stem}),h=(pillar,branch,stem)=>({pillar,branch,stem}),f=(exposed,hidden=[],complete=true)=>({stems:exposed,hiddenStems:hidden,complete});
const examples=[];const add=(id,group,items)=>{for(const[index,[facts,expected,note]]of items.entries())examples.push({id:id+'/'+group+'-'+(index+1),criterionId:id,category:group,facts,expected,note});};
for(const[id,target]of[['ding-zi-extra-ding-exposed','丁'],['ding-zi-wu-exposed','戊'],['gui-wu-jia-exposed-signal','甲']]){
 add(id,'positive',[[f([p('年柱',target)]),'met','年干目标可见。'],[f([p('月柱',target)]),'met','月干目标可见。'],[f([p('时柱',target)]),'met','时干目标可见。']]);
 add(id,'negative',[[f([p('日柱',target),p('年柱','庚')]),'not-met','日干目标不作额外明干。'],[f([p('年柱','庚')],[h('月柱','午',target)]),'not-met','藏干目标不等于明干。'],[f([p('年柱','壬')]),'not-met','完整已知明干未见目标。']]);
 add(id,'incomplete-edge',[[f([p('年柱','庚')],[],false),'unknown','缺柱未见存在未知。'],[f([p('年柱',target)],[],false),'met','缺柱但目标已见，可确认存在。'],[f([p('日柱',target)],[h('月柱','午',target)],false),'unknown','仅日干和藏干不满足非日主明干，且缺柱。']]);
}
for(const[id,a,b]of[['geng-wu-no-resource-exposed-subset','戊','己'],['geng-wu-no-peer-exposed-subset','庚','辛']]){
 add(id,'positive',[[f([p('日柱','庚'),p('年柱','甲'),p('时柱','丁')]),'met','完整非日主明干无目标集合。'],[f([p('年柱','乙')],[h('月柱','午',a)]),'met','藏干不混入明干子集。'],[f([p('日柱',a),p('年柱','丁')]),'met','日主明干位置排除的合成作用域探针。']]);
 add(id,'negative',[[f([p('年柱',a)]),'not-met','第一个目标明干反证该位置子集。'],[f([p('月柱',b)]),'not-met','第二个目标明干反证该位置子集。'],[f([p('年柱',a),p('时柱',b)]),'not-met','两个目标并见。']]);
 add(id,'incomplete-edge',[[f([p('年柱','丁')],[],false),'unknown','缺柱未见不能证明缺失。'],[f([p('年柱',a)],[],false),'not-met','缺柱但已见目标可反证子集。'],[f([p('年柱','丁')],[h('时柱','午',b)],false),'unknown','藏干不代替明干且资料不全。']]);
}
add('gui-wu-jia-exposed-absent-subset','positive',[[f([p('年柱','己')]),'met','完整明干无甲。'],[f([p('年柱','丁')],[h('时柱','寅','甲')]),'met','藏甲不等于甲出干。'],[f([p('日柱','甲'),p('年柱','戊')]),'met','合成日干排除测试。']]);
add('gui-wu-jia-exposed-absent-subset','negative',[[f([p('年柱','甲')]),'not-met','年甲可见。'],[f([p('月柱','甲')]),'not-met','月甲可见。'],[f([p('时柱','甲')]),'not-met','时甲可见。']]);
add('gui-wu-jia-exposed-absent-subset','incomplete-edge',[[f([p('年柱','己')],[],false),'unknown','缺柱未见甲仍未知。'],[f([p('年柱','甲')],[],false),'not-met','已知甲可反证位置子集但不代表整体从杀反证。'],[f([p('日柱','甲')],[h('月柱','寅','甲')],false),'unknown','日干和藏甲不替代缺失明干。']]);
assert(examples.length===54,'Need54independent scoped predicate cases');
const fixture={version:VERSION,method:'Manual literal-position fact matrix; expected values not generated by any production evaluator',cases:examples,
 dependencyCases:[
 {ruleId:dingZi.id,branchId:'ding-zi-dependent-extra-ding',signalCriterionId:'ding-zi-extra-ding-exposed',signalResult:'met',unimplementedPremises:['ding-zi-water-many','ding-zi-gui-strong'],expectedRuleStatus:'pending',expectedBranchStatus:'pending',note:'额丁已见也不可跨越水多癸旺前提。'},
 {ruleId:dingZi.id,branchId:'ding-zi-dependent-extra-ding',signalCriterionId:'ding-zi-extra-ding-exposed',signalResult:'not-met',unimplementedPremises:['ding-zi-water-many','ding-zi-gui-strong'],expectedRuleStatus:'pending',expectedBranchStatus:'not-triggered',note:'完整已知未见额丁时此反向信号未触发；不表示正向从杀成立。'},
 {ruleId:dingZi.id,branchId:'ding-zi-dependent-extra-ding',signalCriterionId:'ding-zi-extra-ding-exposed',signalResult:'unknown',unimplementedPremises:['ding-zi-water-many','ding-zi-gui-strong'],expectedRuleStatus:'pending',expectedBranchStatus:'pending',note:'缺柱未见额丁且前提未核，维持依赖待审。'},
 {ruleId:guiWu.id,branchId:'gui-wu-dependent-jia-control',signalCriterionId:'gui-wu-jia-exposed-signal',signalResult:'met',unimplementedPremises:['gui-wu-ji-field','gui-wu-effective-control-premise'],expectedRuleStatus:'pending',expectedBranchStatus:'pending',note:'甲已见不证明一派己土或有效出制。'},
 {ruleId:guiWu.id,branchId:'gui-wu-dependent-jia-control',signalCriterionId:'gui-wu-jia-exposed-signal',signalResult:'not-met',unimplementedPremises:['gui-wu-ji-field','gui-wu-effective-control-premise'],expectedRuleStatus:'pending',expectedBranchStatus:'not-triggered',note:'甲明干完整未见时该信号不触发，原必要仍未核。'},
 {ruleId:guiWu.id,branchId:'gui-wu-dependent-jia-control',signalCriterionId:'gui-wu-jia-exposed-signal',signalResult:'unknown',unimplementedPremises:['gui-wu-ji-field','gui-wu-effective-control-premise'],expectedRuleStatus:'pending',expectedBranchStatus:'pending',note:'缺柱甲存在未知，不能省去一派与有效制化前提。'},
 ],proofLimit:'事实作用域及依赖关系验证，不等于已取得同师承3组成格/破格真实出生盘。'};
// Independent concrete inputs: these are position-scope probes, not fabricated birth charts.
for(const test of fixture.dependencyCases){
 const target=test.ruleId===dingZi.id?'丁':'甲',dayMaster=test.ruleId===dingZi.id?'丁':'癸';
 test.facts=test.signalResult==='met'?f([p('日柱',dayMaster),p('年柱',target),p('月柱','壬'),p('时柱','庚')]):test.signalResult==='not-met'?f([p('日柱',dayMaster),p('年柱','庚'),p('月柱','壬'),p('时柱','辛')]):f([p('日柱',dayMaster),p('年柱','庚'),p('月柱','壬')],[],false);
}
const files=['data/cong-sha-rules.json',rawFile,'data/raw/cong-sha-ATTRIBUTION.md','data/raw/CC-BY-SA-4.0.txt'];const source={id:ID,name:'穷通宝鉴2294674月别从杀：支持子集及依赖反向句',url:meta.url,commit:'wikisource-revision/2294674',license:'CC-BY-SA-4.0（维基文库转录、节录与月别从杀映射）',files,note:'五场景保留水多、癸旺、一派、无比印及有效出制等未核必要。六项明干位置子集仅support/signals；反向句须前提齐备，不以单个已见信号自动否定格局。未替换旧从财规则。'};
source.fileHashes=Object.fromEntries([...files].sort().map(file=>[file,sha(fs.readFileSync(path.join(root,file)))]));source.sha256=sha(JSON.stringify(source.fileHashes));const lock={version:VERSION,hashConvention:'sha256(JSON.stringify(fileHashes)); sorted relative path keys',sources:[source]};
if(process.argv.includes('--write')){write('data/cong-sha-source-lock.json',lock);write('tests/fixtures/cong-sha-predicate-examples.json',fixture);}else{assert(read('data/cong-sha-source-lock.json')===stable(lock),'Fromkilling source lock differs');assert(read('tests/fixtures/cong-sha-predicate-examples.json')===stable(fixture),'Independentpredicate fixture differs');}
const result={version:VERSION,rules:rules.length,criteria:rules.reduce((n,r)=>n+r.criteria.length,0),executablePredicates:rules.reduce((n,r)=>n+r.criteria.filter(c=>c.predicate).length,0),dependentBranches:rules.reduce((n,r)=>n+r.rejectionBranches.length,0),manualPredicateCases:examples.length,dependencyCases:fixture.dependencyCases.length,sourcePassages:10,manifestSha256:sha(read('data/cong-sha-source-lock.json'))};write('.local/sha-117/source-verification.json',result);console.log(stable(result));
