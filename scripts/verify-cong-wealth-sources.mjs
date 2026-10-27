/** Fixed same-edition monthly 从财 routes; no application domain import and no numerical strength thresholds. */
import fs from'node:fs';import path from'node:path';import crypto from'node:crypto';
const root=process.cwd(),read=file=>fs.readFileSync(path.join(root,file),'utf8'),sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const assert=(ok,message)=>{if(!ok)throw new Error(message);},stable=value=>JSON.stringify(value,null,2)+'\n';
const write=(file,value)=>{const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target+'.tmp',typeof value==='string'?value:stable(value));fs.renameSync(target+'.tmp',target);};
const VERSION='qiongtong-2294674-monthly-cong-wealth/1.0.0',ID='bazi-cong-wealth-qiongtong-2294674';
const meta=JSON.parse(read('data/raw/monthly-seasonal-qiongtong-source.json'));
const excerptFile='data/raw/cong-wealth-qiongtong-excerpts.json';
if(process.argv.includes('--archive')){
 const raw=fs.readFileSync(path.join(root,'.local/tiaohou-112/qiongtong-revision2294674.wiki'));assert(sha(raw)===meta.rawSha256,'Fixed原文hash mismatch');const text=raw.toString('utf8');
 const selections=[
  ['jia-chen-route','或柱中全无一水，戊己透干，支成土局，又作弃命从才，因人而致富贵，妻子有能。'],
  ['yi-summer-route','或柱中无水，又无比劫出干﹐乃为弃命从才，富大贵小，能招贤德之妻。从才格以火为妻，土为子。'],
  ['yi-summer-context','凡五六月乙木，气退枯焦，用癸水切忌戊己杂乱，则为下格。或甲木高透，制伏土神名为去浊留清，可许俊秀。土多乏甲秀气脱空，庸人而已。'],
  ['yi-summer-neighbor','或一派戊土出干，不见比肩，名为才多身弱，终为富屋贫人。'],
  ['geng-mao-route','或一片甲乙，忌庚出干破才，乃从才格，反主富贵。若见一比，又主孤贫。'],
 ];
 const excerpts=selections.map(([id,quote])=>{const pos=text.indexOf(quote);assert(pos>=0,'Missing source '+id);const start=[...text.slice(0,pos)].length,end=start+[...quote].length;return {id,sourceQuote:quote,sourceSpan:{start,end,unit:'unicode-codepoint',interval:'[start,end)'},sourceLocator:`oldid=2294674;codepoint[${start},${end})`};});
 write(excerptFile,{version:VERSION,source:meta,changes:'Five exact same-edition passages retained; four monthly route records. Context and neighboring 财多身弱 caution retained. No generic 从象 threshold imported.',excerpts});
}
const archive=JSON.parse(read(excerptFile));assert(archive.version===VERSION&&archive.excerpts.length===5,'Missing fixed route/context passages');
const quote=id=>{const v=archive.excerpts.find(item=>item.id===id);assert(v,'Missing passage '+id);const{id:_,...rest}=v;return rest;};
const elementAbsent={kind:'element',element:'水',scope:'any',includeDayMaster:false,present:false};
const exposedAbsent=stem=>({kind:'stem',stem,scope:'exposed',includeDayMaster:false,present:false});
const criteria=(id,label,role,sourceText,predicate,unresolved=[])=>({id,label,role,sourceText,...(predicate?{predicate}:{}),unresolved});
const jia={id:'jia-chen-monthly-cong-wealth',name:'甲日辰月原句从财路径',kind:'cong-wealth',sourceId:ID,applicability:{dayStems:['甲'],monthBranches:['辰']},candidatePolicy:'pending-unimplemented-necessary',...quote('jia-chen-route'),
 criteria:[criteria('jia-chen-no-water-exposed','明干未见水（全无水的必要子集）','necessary','柱中全无一水',{...elementAbsent,scope:'exposed'}),criteria('jia-chen-water-hidden-scope','柱中无水对藏干库水的作用范围','necessary','柱中全无一水',undefined,['辰月所选藏干表必含癸，但原文仍列本条路径，说明库中水是否计入原句有效水不能无证据等同。','不自动把藏干存在转换成此句反证；水的实际位置可阅读，藏干作用范围待核。']),criteria('jia-chen-earth-exposed','戊己透干的原句范围','necessary','戊己透干',undefined,['戊己并称可表示土类，也可作戊、己两干；本版不擅定必须二者均透或任一透。']),criteria('jia-chen-earth-configuration','支成土局','necessary','支成土局',undefined,['原文未在本句给出成土局的完整取法；不把四库齐全或任意土支数量自定为充分条件。'])],
 supportedMeaning:'明干无水只核全无水的必要子集；藏干作用域、戊己并称和土局取法仍未核，不能机械排除全部真实辰月。',unresolved:['本句是甲辰月别取从财的一个条件路径，不是所有从财的普遍定义。','辰月藏癸是所选电子藏干表事实，不直接等于本句水有效或破格。','原句后续富贵等历史断语不实施。']};
const yi=month=>({id:'yi-'+month+'-monthly-cong-wealth',name:'乙日'+month+'月原句从财结构候选',kind:'cong-wealth',sourceId:ID,applicability:{dayStems:['乙'],monthBranches:[month]},candidatePolicy:'structure-only-eligible',...quote('yi-summer-route'),context:[quote('yi-summer-context'),quote('yi-summer-neighbor')],
 criteria:[criteria('yi-'+month+'-no-water','全局未见水','necessary','柱中无水',elementAbsent),criteria('yi-'+month+'-no-peer-exposed','非日干明干无比劫','necessary','又无比劫出干',{kind:'all',items:[exposedAbsent('甲'),exposedAbsent('乙')]})],
 supportedMeaning:'四柱完整且本产品限定字面存在口径下两结构前提均符时，只列人工结构候选；该口径不是原典唯一作用范围，不称从财成立。',unresolved:['本产品对乙夏无水只作明干加所选藏干表的字面存在核对；库气是否有效、原文无水是否采用相同范围尚未证明。','同段五六月气退枯焦、土多等季节与旺衰解释未量化；不得把这些解释自动阈值化。','邻近又称一派戊土出干不见比肩为财多身弱，说明单凭无比肩不能跨句推成从财。','没有把藏干出现比劫自动判作本句出干条件的破格，也没有证明所有从财流派容许该藏根。','本句候选仅是人工复核入口，不输出唯一格局、喜用或命运；原文后果不实施。']});
const geng={id:'geng-mao-monthly-cong-wealth',name:'庚日卯月原句从财路径',kind:'cong-wealth',sourceId:ID,applicability:{dayStems:['庚'],monthBranches:['卯']},candidatePolicy:'pending-unimplemented-necessary',...quote('geng-mao-route'),
 criteria:[criteria('geng-mao-wood-dominance','一片甲乙','necessary','一片甲乙',undefined,['一片的范围和气势判定没有明确数值标准，不能以甲乙占比阈值替代。']),criteria('geng-mao-no-extra-geng','不见辅助庚出干破财','necessary','忌庚出干破才',exposedAbsent('庚')),criteria('geng-mao-one-peer','若见一比','exception','若见一比',undefined,['一比的明干／藏干作用域未在此句明确，不擅自推广为任一同类根均破格。'])],
 supportedMeaning:'额外庚明干出现时与本句忌庚前提相反；不代表否定所有从财。',unresolved:['日主自身庚不计作额外出干，否则本句永远自相矛盾；此项范围有明确说明。','原句一片甲乙与一比的其他作用域未决，保持人工复核；不借从化、假从或其他书规则补足。']};
const table={version:VERSION,sourceId:ID,title:'穷通宝鉴固定版月别从财结构证据',source:meta,rules:[jia,yi('午'),yi('未'),geng],
 contract:{scope:'只对甲辰、乙午、乙未、庚卯四条本版月别路径核对，不等于完整从财法。',status:'必要事实明确不符可报本条路径不符；完整结构事实满足可列structure-only候选；未实现必要仍pending；资料缺柱未见保留unknown。',noFate:'原句富贵、性格、妻子或命运等断语仅为历史引用，不转成产品结论。',notUniversal:'某一月别路径反证不是所有从财流派的否定；从杀、从儿、从旺、从强化另行源包，不混入。',missing:'不从缺水直接推喜用水，也不把某类数量简单等同旺弱，不改变五行计数或姓名排序。'},
 limitations:['从财候选识别与最终格局裁决区分；本包没有实现旺度、成局、制化、真假从以及运程。','乙夏原句具直接结构表述，但本包只做可复核候选，不把两事实当所有从财成立的充分法门。','其余经典如滴天髓阐微允许根气、印比无力或被制的特例，仍属另一阅读体系，本包未引入裁决。','固定电子转录未独立校勘影印原页或完整公版权利链，按CC BY-SA4.0保留署名。']};
for(const rule of table.rules){rule.pattern='cong-cai';for(const criterion of rule.criteria){criterion.name=criterion.label;criterion.sourceQuote=criterion.sourceText;criterion.sourceLocator=rule.sourceLocator;criterion.scope=criterion.predicate?(criterion.id==='jia-chen-no-water-exposed'?'仅明干水，作为全无水的必要子集，不判藏干库气':criterion.id.includes('no-water')?'本产品限定字面口径：明干与所选藏干表，非原典唯一有效气范围':'仅非日主位置的明确明干；不把藏干等同出干'):'原文作用范围或操作取法未核，不作真假判断';assert(rule.sourceQuote.includes(criterion.sourceQuote),'Criterion lacks exact source clause '+criterion.id);}}
assert(table.rules.length===4&&new Set(table.rules.map(rule=>rule.id)).size===4,'Rule identity mismatch');
const fixture={version:VERSION,method:'manual literal-source prerequisites and synthetic explicit fact examples; no app imported',cases:[
 {ruleId:jia.id,dayMaster:'甲',monthBranch:'辰',facts:{exposed:['戊','己','丙'],hidden:['乙','戊','癸'],complete:true},expected:'pending',reason:'辰藏癸不擅等同原句有效水；水范围、成局及戊己范围未核必要，不可提升或机械反证。'},
 {ruleId:jia.id,dayMaster:'甲',monthBranch:'辰',facts:{exposed:['戊','癸','丙'],hidden:[],complete:true},expected:'contradicted',reason:'明干已见癸，不符全无水的明确必要子集；不借藏水判反证。'},
 {ruleId:jia.id,dayMaster:'甲',monthBranch:'辰',facts:{exposed:['戊','丙'],hidden:['乙'],complete:false},expected:'pending',reason:'缺时不能证明全局无水。'},
 ...['午','未'].flatMap(month=>[
  {ruleId:'yi-'+month+'-monthly-cong-wealth',dayMaster:'乙',monthBranch:month,facts:{exposed:['丙','戊','丁'],hidden:['己','丁','庚'],complete:true},expected:'candidate',reason:'两个明确结构前提均符，仅结构候选；仍未完成所有从财裁决。'},
  {ruleId:'yi-'+month+'-monthly-cong-wealth',dayMaster:'乙',monthBranch:month,facts:{exposed:['丙','甲','丁'],hidden:['己'],complete:true},expected:'contradicted',reason:'非日主明干甲为本句比劫出干反证。'},
  {ruleId:'yi-'+month+'-monthly-cong-wealth',dayMaster:'乙',monthBranch:month,facts:{exposed:['丙','戊'],hidden:['己'],complete:false},expected:'pending',reason:'缺时未见水和比劫不能肯定没有。'},
  {ruleId:'yi-'+month+'-monthly-cong-wealth',dayMaster:'乙',monthBranch:month,facts:{exposed:['丙','戊','丁'],hidden:['甲','己'],complete:true},expected:'candidate',reason:'藏甲不等于甲出干；不把本句的出干范围擅扩到藏根。'},
 ]),
 {ruleId:geng.id,dayMaster:'庚',monthBranch:'卯',facts:{exposed:['甲','乙','丁'],hidden:['乙'],complete:true},expected:'pending',reason:'无额外庚明干，但一片甲乙必要未核。'},
 {ruleId:geng.id,dayMaster:'庚',monthBranch:'卯',facts:{exposed:['甲','庚','丁'],hidden:['乙'],complete:true},expected:'contradicted',reason:'额外庚明干不符本句忌庚出干。'},
 {ruleId:geng.id,dayMaster:'庚',monthBranch:'卯',facts:{exposed:['甲','乙'],hidden:['庚'],complete:false},expected:'pending',reason:'缺时不能证明无额外庚；藏庚也不按未定一比scope判格。'},
 ],assertions:['DayMasteritselfisexcludedfrom出干比劫检查','Noarbitrary旺弱/一片/土局threshold','Contradictedmeansonlythismonthlyroutefails','Unknownhoursneverproveabsence','从杀/儿/旺/强notimported']};
if(process.argv.includes('--write'))write('data/cong-wealth-rules.json',table);else assert(read('data/cong-wealth-rules.json')===stable(table),'Congwealthrule mapping differs');
const files=['data/cong-wealth-rules.json',excerptFile,'data/raw/cong-wealth-ATTRIBUTION.md','data/raw/CC-BY-SA-4.0.txt'];
const source={id:ID,name:'穷通宝鉴2294674月别从财原句：结构候选及本条反证',url:meta.url,commit:'wikisource-revision/2294674',license:'CC-BY-SA-4.0（维基文库转录、节录与月别结构映射）',files,note:'同版甲辰、乙午未、庚卯从财四路径；明示无水、无比劫出干等可核；一片、土局、戊己范围未决。候选不是格局成立，反证仅说明本条路径不符；不把其他书真假从规则混入。'};
source.fileHashes=Object.fromEntries([...files].sort().map(file=>[file,sha(fs.readFileSync(path.join(root,file)))]));source.sha256=sha(JSON.stringify(source.fileHashes));
const lock={version:VERSION,hashConvention:'sha256(JSON.stringify(fileHashes)); sorted relative keys',sources:[source]};
if(process.argv.includes('--write')){write('data/cong-wealth-source-lock.json',lock);write('tests/fixtures/cong-wealth-examples.json',fixture);}else{assert(read('data/cong-wealth-source-lock.json')===stable(lock),'Congwealthsource lock differs');assert(read('tests/fixtures/cong-wealth-examples.json')===stable(fixture),'Independentprerequisitefixtures differ');}
const result={version:VERSION,rules:4,caseTypes:3,criteria:table.rules.reduce((n,rule)=>n+rule.criteria.length,0),predicates:table.rules.reduce((n,rule)=>n+rule.criteria.filter(item=>item.predicate).length,0),sourcePassages:5,fixtures:fixture.cases.length,manifestSha256:sha(read('data/cong-wealth-source-lock.json'))};write('.local/cong-116/source-verification.json',result);console.log(stable(result));
