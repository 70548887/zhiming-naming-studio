/** Fixed external evidence; never imports application src or a calendar library. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// vm executes the exact archived external modules without installing dependencies.
// Their unused Solar dependency is a throwing stub: calendar calls fail this proof.
if (!vm.SourceTextModule) {
  const result=spawnSync(process.execPath,['--no-warnings','--experimental-vm-modules',fileURLToPath(import.meta.url),...process.argv.slice(2)],{stdio:'inherit'});
  process.exit(result.status??1);
}
const root=process.cwd(), version='zhuanpan-structural-patterns/1.0.0';
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const assert=(ok,message)=>{if(!ok)throw Error(message);};
const equal=(a,b,message)=>assert(JSON.stringify(a)===JSON.stringify(b),message);
const write=(file,value)=>{const p=path.join(root,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p+'.tmp',value);fs.renameSync(p+'.tmp',p);};
const lock=JSON.parse(read('data/qimen-patterns-source-lock.json'));
assert(lock.version===version,'Source version mismatch');
for(const source of lock.sources){
  const hashes=Object.fromEntries([...source.files].sort().map(file=>[file,digest(fs.readFileSync(path.join(root,file)))]));
  equal(hashes,source.fileHashes,'Source archive hash mismatch '+source.id);
  equal(digest(JSON.stringify(hashes)),source.sha256,'Source aggregate hash mismatch '+source.id);
  assert(source.license==='MIT'&&source.files.some(f=>f.endsWith('LICENSE.txt')),'Missing MIT license '+source.id);
}
const cache=new Map();
const context=vm.createContext({console});
const forbiddenSolar=new Proxy(function(){throw Error('Calendar constructor outside evidence scope');},{get(){throw Error('Calendar call outside evidence scope');}});
const solarModule=new vm.SyntheticModule(['Solar'],function(){this.setExport('Solar',forbiddenSolar);},{context,identifier:'unavailable-calendar'});
function externalModule(name){
  if(cache.has(name))return cache.get(name);
  assert(['constants.js','utils.js','calculations.js','patterns.js'].includes(name),'Unexpected external import '+name);
  const m=new vm.SourceTextModule(read('data/raw/qimen-patterns-arc-'+name),{context,identifier:name});
  cache.set(name,m);return m;
}
const entry=externalModule('calculations.js');
const linker=specifier=>specifier==='lunar-javascript'?solarModule:externalModule(path.basename(specifier));
await entry.link(linker);await entry.evaluate();
const patterns=externalModule('patterns.js');await patterns.link(linker);await patterns.evaluate();
const C=cache.get('constants.js').namespace,U=cache.get('utils.js').namespace,F=entry.namespace,P=patterns.namespace;
const numbers=[4,9,2,3,5,7,8,1,6];
const simplify=text=>String(text).replaceAll('門','门').replaceAll('開','开').replaceAll('驚','惊').replaceAll('傷','伤').replaceAll('輔','辅').replaceAll('沖','冲').replaceAll('離','离').replaceAll('兌','兑').replaceAll('陽','阳').replaceAll('陰','阴').replaceAll('蟄','蛰').replaceAll('穀','谷').replaceAll('滿','满').replaceAll('種','种').replaceAll('處','处');
const palace=gua=>numbers[C.LUOSHU_BAGUA.indexOf(gua)];
// These independent anchors are transcribed from test.js FAQIAO_MEN_PO and raw maps.
const doorPairs=[['开门',3],['开门',4],['惊门',3],['惊门',4],['休门',9],['生门',1],['死门',1],['伤门',2],['伤门',8],['杜门',2],['杜门',8],['景门',6],['景门',7]];
const strike={戊:3,己:2,庚:8,辛:9,壬:4,癸:4};
const tomb={乙:2,丙:6,丁:8};
const go=read('data/raw/qimen-patterns-go-qimen_defs.go');
const arc=read('data/raw/qimen-patterns-arc-patterns.js');
const parseMap=(text,name)=>{
  const body=new RegExp('(?:const|var) '+name+'\\s*=\\s*(?:Object.freeze\\(|map\\[string\\]string)?\\{([\\s\\S]*?)\\n\\}').exec(text)?.[1];
  assert(body,'Missing map '+name);
  return Object.fromEntries([...body.matchAll(/["']?([\u4e00-\u9fff]+)["']?\s*:\s*["']([^"']+)["']/g)].map(m=>[m[1],m[2]]));
};
const arcStrike=parseMap(arc,'JI_XING');
equal(Object.fromEntries(Object.entries(arcStrike).map(([s,g])=>[s,palace(g)])),strike,'Arc strike transcriptions differ');
const goStrike=parseMap(go,'QM6YiJiXing');
const hidden={甲子:'戊',甲戌:'己',甲申:'庚',甲午:'辛',甲辰:'壬',甲寅:'癸'};
const branchPalace={卯:3,未:2,寅:8,午:9,辰:4,巳:4};
equal(Object.fromEntries(Object.entries(goStrike).map(([h,z])=>[hidden[h],branchPalace[z]])),strike,'Go strike transcription differs');
assert(arc.includes("奇: '乙', 宮: '坤'")&&arc.includes("奇: '丙', 宮: '乾'")&&arc.includes("奇: '丁', 宮: '艮'")&&arc.includes("奇: '丁', 宮: '乾'"),'Missing explicit tomb alternatives');
assert(parseMap(go,'QMTomb').乙==='戌','Go tomb disagreement must remain explicit');
for(const [door,n] of doorPairs){
  const doors=Array(9).fill('');doors[numbers.indexOf(n)]=door.replaceAll('门','門').replaceAll('开','開').replaceAll('惊','驚').replaceAll('伤','傷');
  assert(P.detectMenPo({天門:doors}).some(f=>f.格==='門迫'&&palace(f.宮)===n),'External door anchor mismatch '+door+n);
}
function build(yang,ju,hour){
  const earth=F.getDiPan(yang,ju),head=U.getXunHead(hour),hiddenStem=U.getFuShou(head);
  const step=U.calculateFlyStep(head,hour),hourStem=hour[0]==='甲'?hiddenStem:hour[0];
  const heaven=F.calculateTianPan(yang,hourStem,hiddenStem,earth);
  const chiefStar=F.getZhiFuStar(hiddenStem,earth),chiefDoor=F.getZhiShiDoor(hiddenStem,earth);
  const stars=F.calculateNineStars(chiefStar,hourStem,earth),doors=F.calculateEightDoors(yang,chiefDoor,step,hiddenStem,earth);
  const hostedIndex=stars.indexOf('天芮'),hostedPalace=numbers[hostedIndex],hostedStem=earth[4];
  const raw={天盤:heaven,地盤:earth,天門:doors,符首:hiddenStem};
  const menpo=P.detectMenPo(raw).filter(f=>f.格==='門迫').map(f=>({palace:palace(f.宮),door:simplify(doors[C.LUOSHU_BAGUA.indexOf(f.宮)])})).sort((a,b)=>a.palace-b.palace);
  const jixing=P.detectLiuYiJiXing(raw).filter(f=>f.讀法?.startsWith('寬式')).map(f=>({palace:palace(f.宮),stem:heaven[C.LUOSHU_BAGUA.indexOf(f.宮)],hosted:false}));
  const rumu=P.detectSanQiRuMu(raw).filter(f=>!f.讀法?.startsWith('丁墓乾六')).map(f=>({palace:palace(f.宮),stem:heaven[C.LUOSHU_BAGUA.indexOf(f.宮)],hosted:false}));
  // The external source retains center in its array. Our selected same-school display
  // hosts that center stem with Tianrui. Apply the already verified table once there.
  if(strike[hostedStem]===hostedPalace)jixing.push({palace:hostedPalace,stem:hostedStem,hosted:true});
  if(tomb[hostedStem]===hostedPalace)rumu.push({palace:hostedPalace,stem:hostedStem,hosted:true});
  const byPalace=(a,b)=>a.palace-b.palace||a.stem.localeCompare(b.stem,'zh');
  const outside=[0,1,2,3,5,6,7,8];
  const original=(actual,home)=>outside.every(i=>actual[i]===home[i]);
  const opposite=(actual,home)=>outside.every(i=>actual[i]===home[numbers.indexOf(10-numbers[i])]);
  const palaces=numbers.map((number,i)=>({number,earth:earth[i],heaven:i===4?'':heaven[i]+(i===hostedIndex?'（寄'+hostedStem+'）':''),star:i===4?'':simplify(stars[i])+(i===hostedIndex?'、天禽':''),door:simplify(doors[i])}));
  const expected={palaces,menpo,jixing:jixing.sort(byPalace),rumu:rumu.sort(byPalace),starFuyin:original(stars,C.QIMEN_STARS),starFanyin:opposite(stars,C.QIMEN_STARS),doorFuyin:original(doors,C.EIGHT_DOORS_ORIGINAL),doorFanyin:opposite(doors,C.EIGHT_DOORS_ORIGINAL)};
  const tags=[yang?'yang':'yin','supplied-ju','center-hosted',...(earth.indexOf(hiddenStem)===4?['center-chief']:[]),...(earth.indexOf(hourStem)===4?['center-hour']:[]),...(F.getZhiShiTargetIndex(yang,step,hiddenStem,earth)===4?['center-door']:[]),...(jixing.some(f=>f.hosted)?['hosted-jixing']:[]),...(rumu.some(f=>f.hosted)?['hosted-rumu']:[]),...(menpo.some(m=>jixing.some(f=>f.palace===m.palace))?['colocated-patterns']:[])];
  return {expected,tags};
}
const all=[];
for(const yang of [true,false])for(let ju=1;ju<=9;ju++){
  // Only the immutable external ju table is used. No source calendar/yuan function runs.
  const [term,cfg]=Object.entries(C.JIEQI_JUSHU).find(([,v])=>v.yang===yang&&v.ju.includes(ju));
  const yuan=cfg.ju.indexOf(ju),day=['甲子','己巳','甲戌'][yuan];
  for(const hour of Object.values(C.SIX_XUNS).flat()){
    const result=build(yang,ju,hour);
    all.push({id:(yang?'yang':'yin')+'-'+ju+'-'+hour,input:{dayGanzhi:day,hourGanzhi:hour,solarTerm:simplify(term)},suppliedJu:{yang,ju,yuan},...result});
  }
}
const booleanRules=['starFuyin','starFanyin','doorFuyin','doorFanyin'];
const palaceRules=['menpo','jixing','rumu'];
const coverage={};
for(const r of [...palaceRules,...booleanRules]){
  const hit=c=>booleanRules.includes(r)?c.expected[r]:c.expected[r].length>0;
  const positives=all.filter(hit),negatives=all.filter(c=>!hit(c));
  assert(positives.length>=3&&negatives.length>=3,'Need three positive and negative plates '+r);
  for(const yang of [true,false])assert(positives.some(c=>c.suppliedJu.yang===yang)&&negatives.some(c=>c.suppliedJu.yang===yang),'Both dun directions required '+r);
  coverage[r]={positive:positives.length,negative:negatives.length,positiveAnchors:positives.slice(0,3).map(c=>c.id),negativeAnchors:negatives.slice(0,3).map(c=>c.id)};
}
for(const tag of ['center-chief','center-hour','center-door','hosted-jixing','hosted-rumu','colocated-patterns'])assert(all.some(c=>c.tags.includes(tag)),'Missing edge '+tag);
const fixture={version,school:'时家转盘；显式局数；中五寄坤二；天禽及中宫干随天芮',construction:'Exact fixed Arc low-level modules executed in vm; Solar import is a throwing unused stub. Ju supplied, no external yuan/calendar used. Expected principal markers from external detectors; hosted center uses independently transcribed tables at actual Tianrui palace; layer relations exact structural definitions.',ruleTables:{doorPairs,strike,tomb,disabledTomb:{丁:6},goDisagreement:{乙:6}},coverage,cases:all};
const target='tests/fixtures/qimen-patterns-examples.json';
if(process.argv.includes('--write')){
  const header=JSON.stringify({...fixture,cases:[]},null,2).replace(/\[\]\n\}$/,'[\n');
  write(target,header+all.map(c=>'    '+JSON.stringify(c)).join(',\n')+'\n  ]\n}\n');
}else equal(JSON.parse(read(target)),fixture,'Stored external fixture differs; review before --write');
console.log(JSON.stringify({version,verifiedPlates:all.length,coverage,sourceFiles:lock.sources.flatMap(s=>s.files).length,calendarCalls:0},null,2));
