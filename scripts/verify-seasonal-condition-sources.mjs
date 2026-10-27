/** Independent supplemental quote curation and date anchors. No application/calendar implementation is imported. */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const root=process.cwd(),read=file=>fs.readFileSync(path.join(root,file),'utf8'),sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const assert=(ok,message)=>{if(!ok)throw new Error(message);},stable=value=>JSON.stringify(value,null,2)+'\n';
const write=(file,value)=>{const out=path.join(root,file);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out+'.tmp',typeof value==='string'?value:stable(value));fs.renameSync(out+'.tmp',out);};
const VERSION='qiongtong-2294674-conditions/1.0.0',ID='bazi-monthly-qiongtong-2294674-conditions';
const SOURCE_URL='https://zh.wikisource.org/w/index.php?title=穷通宝鉴&oldid=2294674';
const sourceMeta=JSON.parse(read('data/raw/monthly-seasonal-qiongtong-source.json'));
const sourceFile='data/raw/seasonal-condition-qiongtong-excerpts.json';
if(process.argv.includes('--archive')){
 const raw=fs.readFileSync(path.join(root,'.local/tiaohou-112/qiongtong-revision2294674.wiki'));
 assert(sha(raw)===sourceMeta.rawSha256,'Fixed original source hash mismatch');
 const text=raw.toString('utf8'),phrases=[
  ['yi-you','在白露之后，桂蕊未开，耑用癸水以滋桂萼。若秋分后，桂花已开，却喜向阳，又宜用丙，癸水次之'],
  ['gui-chen','清明后、火气未炽，专用丙火，为阴阳合谐。谷雨后，虽用丙火，尚宜辛甲佐之。'],
  ['yi-yin','丙癸两透，科甲定然'],['geng-chen','甲透丁藏，采芹拾芥'],['xin-chou','壬丙俱藏，游庠食饩之人'],
 ];
 const excerpts=phrases.map(([id,textQuote])=>{const start=text.indexOf(textQuote);assert(start>=0,'Missing new literal condition '+id);return {id,sourceQuote:textQuote,sourceSpan:{start:[...text.slice(0,start)].length,end:[...text.slice(0,start+textQuote.length)].length,unit:'unicode-codepoint',interval:'[start,end)'},sourceLocator:`oldid=2294674;codepoint[${[...text.slice(0,start)].length},${[...text.slice(0,start+textQuote.length)].length})`};});
 write(sourceFile,{version:VERSION,source:sourceMeta,changes:'Five exact source passages extracted for four partial calendar prerequisites and three explicit stem-position facts. No complete seasonal judgment inferred.',excerpts});
}
const archive=JSON.parse(read(sourceFile));assert(archive.version===VERSION&&archive.excerpts.length===5,'Incomplete supplemental source passages');
const excerpt=id=>{const found=archive.excerpts.find(entry=>entry.id===id);assert(found,'Missing source excerpt '+id);return found;};
const position=(stem,scope)=>({kind:'stem',stem,scope,includeDayMaster:false,present:true});
const temporal=(id,dayStem,monthBranch,originalConditionId,fromTerm,toTerm,passage,unresolved)=>({...excerpt(passage),id,caseId:dayStem+'-'+monthBranch,dayStem,monthBranch,originalConditionId,sourceId:ID,kind:'calendar-prerequisite',scope:'partial-prerequisite',calendar:{fromTerm,toTerm,range:'[from,to)'},unresolved,proposedUses:[],doesNotResolveOriginalBranch:true});
const fact=(id,dayStem,monthBranch,passage,predicate)=>({...excerpt(passage),id,caseId:dayStem+'-'+monthBranch,dayStem,monthBranch,sourceId:ID,kind:'fact',scope:'full-fact-predicate',predicate,unresolved:['只核原句明示的天干位置事实，不采纳其后富贵、科甲等历史断语，不自动决定取用。'],proposedUses:[],doesNotResolveOriginalBranch:true});
const rules=[
 temporal('yi-you-before-autumn-equinox','乙','酉','yi-you-white-dew-autumn-equinox','白露','秋分','yi-you',['桂蕊未开是原文物候意象，本软件没有观测或裁定。','白露至秋分的时间前提不等于原分支整体成立；不自动提出癸水。']),
 temporal('yi-you-after-autumn-equinox','乙','酉','yi-you-white-dew-autumn-equinox','秋分','寒露','yi-you',['桂花已开、喜向阳等原文意象没有观测或裁定。','寒露上界来自当前酉节月范围，是软件定位边界，不冒称原句另外给出了寒露。','只显示秋分后的历法前提，不能据此宣布丙癸取舍完成。']),
 temporal('gui-chen-before-grain-rain','癸','辰','gui-chen-pure-brightness-grain-rain','清明','谷雨','gui-chen',['火气未炽没有公认或本包指定的数值阈值，仍未核定。','只核清明至谷雨的历法前提，原句整体适用性待审，不新增用神结论。']),
 temporal('gui-chen-after-grain-rain','癸','辰','gui-chen-pure-brightness-grain-rain','谷雨','立夏','gui-chen',['丙火初用与辛甲辅助仍为传统取用意见；本包只核时间前提。','立夏上界来自当前辰节月范围，是软件定位边界，不冒称原句另外给出了立夏。','不能把时间命中视为完整调候条件已满足或改变初始候选。']),
 fact('yi-yin-bing-gui-exposed','乙','寅','yi-yin',{kind:'all',items:[position('丙','exposed'),position('癸','exposed')]}),
 fact('geng-chen-jia-exposed-ding-hidden','庚','辰','geng-chen',{kind:'all',items:[position('甲','exposed'),position('丁','hidden')]}),
 fact('xin-chou-ren-bing-hidden','辛','丑','xin-chou',{kind:'all',items:[position('壬','hidden'),position('丙','hidden')]}),
];
for(const rule of rules){assert(rule.proposedUses.length===0&&rule.doesNotResolveOriginalBranch===true,'Partial progress must not become a recipe');assert(rule.sourceQuote.includes(rule.kind==='calendar-prerequisite'?(rule.dayStem==='乙'?'秋分':'谷雨'):rule.predicate.items[0].stem),'Rule lacks literal source term');}
assert(new Set(rules.map(rule=>rule.id)).size===7,'Supplement rule IDs must be unique');
const table={version:VERSION,sourceId:ID,title:'固定电子版调候条件补充：时间前提与透藏事实',source:sourceMeta,rules,
 contract:{timeBasis:'相邻节气真实瞬间，实际UTC毫秒；[from,to)软件约定，起点含边界。',unknown:'对出生民用日期全部有效瞬间区间核对，范围跨前提边界保留uncertain；不取默认中午代替。',scope:'按本条日干和节月匹配，时间前提和完整传统分支分别展示。',noPromotion:'calendar met只代表时间前提已核；原condition result不升级，proposedUses恒空，姓名排序和旧初提不变。',legacy:'独立附加证据与来源，不改写旧120表、旧15条件或任何旧版快照。'},
 deferredOriginalConditions:['yi-wu-half-month-branches','bing-chen-earth-group','bing-hai-strength-branches','ding-wu-fire-group','wu-xu-metal-switch','ji-xu-earth-strong-jia','geng-si-no-fixed-order','ren-wei-alternative-order','gui-si-no-xin-fallback','gui-wei-half-month'],
 limitations:['四个时间前提是两个原条件的部分可核证据，不宣称解决其中旺弱或物候意见。','新增三项只核明确明干或藏干事实；不接收原文科甲、贫富、性格或健康断语。','未把上下半月机械等于15个24小时；没有多寡旺弱、成局、从化阈值。','当前固定电子转录未独立核验影印原页，署名与CC BY-SA4.0继续保留。']};
// Official published calendar facts anchor civil date ranges only, deliberately not claiming exact astronomical seconds.
const official={url:'https://www.hko.gov.hk/en/gts/time/calendar/text/files/T2024e.txt',title:'Hong Kong Observatory Gregorian-Lunar Calendar Conversion Table2024',timeBasis:'HongKong UTC+08:00 calendar date',facts:[['清明','2024-04-04','Bright & Clear'],['谷雨','2024-04-19','Corn Rain'],['立夏','2024-05-05','Summer Commences'],['白露','2024-09-07','White Dew'],['秋分','2024-09-22','Autumnal Equinox'],['寒露','2024-10-08','Cold Dew']]};
if(process.argv.includes('--calendar-check')){const hko=read('.local/seasonal-115/hko-2024-calendar.txt');for(const[,date,name]of official.facts){const[y,m,d]=date.split('-').map(Number);assert(hko.split(/\r?\n/).some(line=>line.startsWith(`${y}/${m}/${d} `)&&line.includes(name)),'Official calendar date differs '+name);}}
const dateCases=[];
for(const [beforeId,afterId,before,boundary,after]of [
 ['yi-you-before-autumn-equinox','yi-you-after-autumn-equinox','2024-09-15','2024-09-22','2024-09-25'],
 ['gui-chen-before-grain-rain','gui-chen-after-grain-rain','2024-04-10','2024-04-19','2024-04-25'],
])for(const[id,beforeResult,afterResult]of [[beforeId,'met','not-met'],[afterId,'not-met','met']]){
 dateCases.push({id:id+'-before',ruleId:id,birthDate:before,birthTime:'12:00:00',timeUnknown:false,timezone:'Asia/Shanghai',expected:beforeResult,doesNotResolveOriginalBranch:true});
 dateCases.push({id:id+'-after',ruleId:id,birthDate:after,birthTime:'12:00:00',timeUnknown:false,timezone:'Asia/Shanghai',expected:afterResult,doesNotResolveOriginalBranch:true});
 dateCases.push({id:id+'-unknown-boundary',ruleId:id,birthDate:boundary,birthTime:'',timeUnknown:true,timezone:'Asia/Shanghai',expected:'uncertain',doesNotResolveOriginalBranch:true});
}
const factCases=[
 ['yi-yin-bing-gui-exposed',{exposed:['丙','癸'],hidden:[],complete:true},'met'],['yi-yin-bing-gui-exposed',{exposed:['丙'],hidden:['癸'],complete:true},'not-met'],['yi-yin-bing-gui-exposed',{exposed:['丙'],hidden:[],complete:false},'unknown'],
 ['geng-chen-jia-exposed-ding-hidden',{exposed:['甲'],hidden:['丁'],complete:true},'met'],['geng-chen-jia-exposed-ding-hidden',{exposed:['甲','丁'],hidden:[],complete:true},'not-met'],['geng-chen-jia-exposed-ding-hidden',{exposed:['甲'],hidden:[],complete:false},'unknown'],
 ['xin-chou-ren-bing-hidden',{exposed:[],hidden:['壬','丙'],complete:true},'met'],['xin-chou-ren-bing-hidden',{exposed:['壬'],hidden:['丙'],complete:true},'not-met'],['xin-chou-ren-bing-hidden',{exposed:[],hidden:['丙'],complete:false},'unknown'],
].map(([ruleId,facts,expected])=>({ruleId,facts,expected,proposedUses:[]}));
const fixture={version:VERSION,method:'Manually transcribed exact source conditions and independent HKO civil-date facts; no application/calendar import',officialCalendar:official,dateCases,factCases,assertions:['Original12unimplementedconditionsstayunchanged','Allcalendarchecksremainpartial-prerequisiteevenwhenmet','NoautomaticproposedUses','No15dayhalfmonthconversion']};
if(process.argv.includes('--write'))write('data/monthly-seasonal-conditions.json',table);else assert(read('data/monthly-seasonal-conditions.json')===stable(table),'Supplement condition data differs');
const files=['data/monthly-seasonal-conditions.json',sourceFile,'data/raw/seasonal-condition-ATTRIBUTION.md','data/raw/CC-BY-SA-4.0.txt'];
const source={id:ID,name:'穷通宝鉴2294674条件补充：节气前提及明示透藏事实',url:SOURCE_URL,commit:'wikisource-revision/2294674',license:'CC-BY-SA-4.0（维基文库转录、节录及补充映射）',files,note:'独立于旧120表与15条件的追加版本，仅四个历法前提和三项透藏事实；时间命中不表示原分支整体成立，proposedUses为空。固定贡献者历史/码点原文，未校勘影印，不建立旺弱、半月或成局阈值。'};
source.fileHashes=Object.fromEntries([...files].sort().map(file=>[file,sha(fs.readFileSync(path.join(root,file)))]));source.sha256=sha(JSON.stringify(source.fileHashes));
const lock={version:VERSION,hashConvention:'sha256(JSON.stringify(fileHashes)); sorted relative path keys',sources:[source]};
if(process.argv.includes('--write')){write('data/seasonal-condition-source-lock.json',lock);write('tests/fixtures/seasonal-condition-examples.json',fixture);}else{assert(read('data/seasonal-condition-source-lock.json')===stable(lock),'Supplement source manifest differs');assert(read('tests/fixtures/seasonal-condition-examples.json')===stable(fixture),'Independent condition fixtures differ');}
const result={version:VERSION,rules:7,calendarPartial:4,facts:3,dateCases:dateCases.length,factCases:factCases.length,sourcePassages:5,manifestSha256:sha(read('data/seasonal-condition-source-lock.json')),calendarSourceChecked:process.argv.includes('--calendar-check')};write('.local/seasonal-115/source-verification.json',result);console.log(stable(result));
