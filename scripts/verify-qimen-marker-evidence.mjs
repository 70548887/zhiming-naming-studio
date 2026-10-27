/** Development evidence only. No application engine or calendar library is imported. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const write = (file, value) => {
  const target = path.join(root,file);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target+'.tmp',typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');
  fs.renameSync(target+'.tmp',target);
};

const files = {
  arc: ['data/raw/qimen-markers-arc-constants.js','data/raw/qimen-markers-arc-LICENSE.txt'],
  go: ['data/raw/qimen-markers-go-ganzhi.go','data/raw/qimen-markers-go-qimen.go','data/raw/qimen-markers-go-LICENSE.txt'],
};
if (process.argv.includes('--archive')) {
  const copies = [
    ['tests/fixtures/qimen-reference/constants.js',files.arc[0]],
    ['tests/fixtures/qimen-reference/LICENSE',files.arc[1]],
    ['.local/qimen-marker-source-search/go-xuan-ganzhi.go',files.go[0]],
    ['.local/qimen-marker-source-search/go-xuan-qimen.go',files.go[1]],
    ['.local/qimen-marker-source-search/go-LICENSE',files.go[2]],
  ];
  for (const [from,to] of copies) write(to,read(from));
}
const arc = read(files.arc[0]);
const go = read(files.go[0]);
const parseGoMap = name => {
  const body = new RegExp('var '+name+' = map\\[string\\](?:\\[\\]string|int|string)\\{([\\s\\S]*?)\\n\\}').exec(go)?.[1];
  assert(body, 'Missing external source map '+name);
  return Object.fromEntries([...body.matchAll(/"([^"]+)":\s*(?:\{([^}]+)\}|"([^"]+)"|(\d+))/g)].map(([,key,array,text,number])=>[key,array?[...array.matchAll(/"([^"]+)"/g)].map(m=>m[1]):text??Number(number)]));
};
const voids = parseGoMap('KongWang');
const palaces = parseGoMap('ZhiGong9');
const horses = parseGoMap('Horse');
const sixXunsBody = /export const SIX_XUNS = deepFreeze\(\{([\s\S]*?)\n\}\);/.exec(arc)?.[1];
assert(sixXunsBody,'Missing independent six-xun listing');
const xuns = Object.fromEntries([...sixXunsBody.matchAll(/'([^']+)': \[([^\]]+)\]/g)].map(([,head,listing])=>[head,[...listing.matchAll(/'([^']+)'/g)].map(m=>m[1])]));
assert(Object.keys(xuns).length===6,'Expected all six external xun groups');
const zhi = [...'子丑寅卯辰巳午未申酉戌亥'];
const gan = [...'甲乙丙丁戊己庚辛壬癸'];
const allPalaces = [1,2,3,4,5,6,7,8,9];
const sorted = values => [...new Set(values)].sort((a,b)=>a-b);
function expected(timeGanzhi) {
  const xunHead = Object.entries(xuns).find(([,hours])=>hours.includes(timeGanzhi))?.[0];
  assert(xunHead,'Time not present in independent 60-hour source '+timeGanzhi);
  const voidBranches=voids[xunHead];
  const horseBranch=horses[[...timeGanzhi][1]];
  return {xunHead,voidBranches,voidPalaces:sorted(voidBranches.map(z=>palaces[z])),horseBranch,horsePalace:palaces[horseBranch]};
}
// These 12 checks were transcribed from the three external tables, separately from the app.
const handChecks = [
  ['甲子','甲子','戌亥',[6],'寅',8],['乙丑','甲子','戌亥',[6],'亥',6],
  ['甲戌','甲戌','申酉',[2,7],'申',2],['乙亥','甲戌','申酉',[2,7],'巳',4],
  ['甲申','甲申','午未',[2,9],'寅',8],['乙酉','甲申','午未',[2,9],'亥',6],
  ['甲午','甲午','辰巳',[4],'申',2],['乙未','甲午','辰巳',[4],'巳',4],
  ['甲辰','甲辰','寅卯',[3,8],'寅',8],['乙巳','甲辰','寅卯',[3,8],'亥',6],
  ['甲寅','甲寅','子丑',[1,8],'申',2],['乙卯','甲寅','子丑',[1,8],'巳',4],
];
for (const [hour,xun,empty,positions,horse,position] of handChecks) {
  assert(JSON.stringify(expected(hour))===JSON.stringify({xunHead:xun,voidBranches:[...empty],voidPalaces:positions,horseBranch:horse,horsePalace:position}),'Hand transcription mismatch '+hour);
}
// The missing two branches must also agree with the separate explicit Arc table.
const arcVoidsBody = /export const XUN_TO_KONGWANG_ZHI = deepFreeze\(\{([\s\S]*?)\n\}\);/.exec(arc)?.[1];
assert(arcVoidsBody,'Missing Arc void table');
for (const [head,hours] of Object.entries(xuns)) {
  const missing = zhi.filter(z=>!hours.some(hour=>hour.endsWith(z)));
  const literal = new RegExp("'"+head+"': \\[([^\\]]+)\\]").exec(arcVoidsBody)?.[1];
  assert(JSON.stringify(missing)===JSON.stringify(voids[head]),'Six-xun complement mismatch '+head);
  assert(literal&&voids[head].every(z=>literal.includes("'"+z+"'")),'Arc/Go void disagreement '+head);
}

const sources = [
  {id:'qimen-arc-markers',name:'时旬空表：arc119226/qimen_dunjia 固定源码',url:'https://github.com/arc119226/qimen_dunjia',commit:'7d941031d685d818d9fd234edf891dba5bd6a323',license:'MIT',files:files.arc,note:'仅引用constants.js六旬干支及空亡地支表；该项目三元定法与本应用不同，未采用其定元或整盘作为同流派标准。'},
  {id:'qimen-go-markers',name:'时旬空、时驿马及地支洛书宫：deminzhang/qimen-go 固定源码',url:'https://github.com/deminzhang/qimen-go',commit:'4d3f58fa0f401b5b3a337f119138e99e90685dda',license:'MIT',files:files.go,note:'xuan/ganzhi.go KongWang、ZhiGong9、Horse三表及xuan/qimen.go时家取时旬空/时支马；多流派工程的这几项通用表作为辅助规则交叉来源，不宣称其整盘等同本应用。'},
].map(source=>{
  const fileHashes=Object.fromEntries([...source.files].sort().map(file=>[file,digest(fs.readFileSync(path.join(root,file)))]));
  return {...source,sha256:digest(JSON.stringify(fileHashes)),fileHashes};
});

// Gregorian integer-day calculation, independent of lunar-typescript and the production engine.
// Anchor: Gregorian 2000-01-07 is 甲子. Midnight is the app's explicitly selected day boundary.
function civilGanzhi(date,time) {
  const [year,month,day]=date.split('-').map(Number);
  const a=Math.floor((14-month)/12),y=year+4800-a,m=month+12*a-3;
  const jdn=day+Math.floor((153*m+2)/5)+365*y+Math.floor(y/4)-Math.floor(y/100)+Math.floor(y/400)-32045;
  const dayIndex=((jdn+49)%60+60)%60;
  const hour=Number(time.slice(0,2)),hourBranch=Math.floor((hour+1)/2)%12;
  return {dayGanzhi:gan[dayIndex%10]+zhi[dayIndex%12],timeGanzhi:gan[(2*(dayIndex%10)+hourBranch)%10]+zhi[hourBranch]};
}

if (process.argv.includes('--write')) {
  const plateCases=Object.entries(xuns).flatMap(([head,hours],group)=>hours.map((timeGanzhi,index)=>{
    const stem=gan.indexOf([...timeGanzhi][0]),branch=zhi.indexOf([...timeGanzhi][1]);
    const dayStem=((stem-branch+20)%10)/2;
    const result=expected(timeGanzhi);
    return {id:'external-'+head+'-'+timeGanzhi,input:{dayGanzhi:gan[dayStem]+zhi[dayStem],timeGanzhi,solarTerm:group%2?'夏至':'冬至'},expected:result,absent:{voidPalaces:allPalaces.filter(n=>!result.voidPalaces.includes(n)),horsePalaces:allPalaces.filter(n=>n!==result.horsePalace)},tags:[group%2?'yin':'yang','external-table',...(index===0?['xun-boundary']:[]),'center-unmarked'],evidence:['Arc SIX_XUNS lists '+timeGanzhi+' under '+head,'Arc XUN_TO_KONGWANG_ZHI / Go KongWang agree; Go ZhiGong9 and Horse are independently transcribed source tables']};
  }));
  // Existing independently transcribed plates remain the same school used by the app.
  for(const [id,dayGanzhi,timeGanzhi,solarTerm,tags] of [
    ['golden-yang5','戊午','庚申','立春',['yang','existing-golden-plate']],
    ['golden-yin3','丁巳','辛亥','夏至',['yin','existing-golden-plate']],
    ['central-chief','戊辰','丙辰','雨水',['yang','central-chief','borrow-kun2']],
    ['central-hosted','丁亥','丁未','冬至',['yang','center-hosted-stem']],
  ]) {
    const result=expected(timeGanzhi);
    plateCases.push({id,input:{dayGanzhi,timeGanzhi,solarTerm},expected:result,absent:{voidPalaces:allPalaces.filter(n=>!result.voidPalaces.includes(n)),horsePalaces:allPalaces.filter(n=>n!==result.horsePalace)},tags,evidence:['Existing fixed test.js plate/transcription in qimen-reference/PROVENANCE.md; marker expectations independently from source tables, not its full-chart output.']});
  }
  const civilCases=[
    ['summer-before','2024-06-21','04:50:00','芒种','阳遁',['solstice-before','yin-yang-boundary']],
    ['summer-after','2024-06-21','04:52:00','夏至','阴遁',['solstice-after','yin-yang-boundary']],
    ['spring-before','2024-02-04','16:26:30','大寒','阳遁',['term-before']],
    ['spring-after','2024-02-04','16:27:30','立春','阳遁',['term-after']],
    ['zi-before','2024-02-10','22:59:59','立春','阳遁',['zi-hour-before']],
    ['zi-start','2024-02-10','23:00:00','立春','阳遁',['zi-hour-start','civil-midnight-rule']],
    ['midnight-before','2024-02-10','23:59:59','立春','阳遁',['midnight-before','civil-midnight-rule']],
    ['midnight-after','2024-02-11','00:00:00','立春','阳遁',['midnight-after','civil-midnight-rule']],
  ].map(([id,birthDate,birthTime,solarTerm,dun,tags])=>{
    const gz=civilGanzhi(birthDate,birthTime);
    return {id,input:{birthDate,birthTime,timezone:'Asia/Shanghai'},expected:{...gz,solarTerm,dun,...expected(gz.timeGanzhi)},tags,evidence:['Day/hour: independent Gregorian JDN anchor and five-rat hour-stem arithmetic.','Term brackets reuse previously verified calendar anchors from tests/engine.test.ts; no new astronomical calculation claimed.']};
  });
  write('data/qimen-markers-source-lock.json',{version:'hour-xunkong-yima/1.0.0',hashConvention:'sha256(JSON.stringify(fileHashes)); fileHashes keys sorted by relative path',sources});
  write('tests/fixtures/qimen-markers-examples.json',{schemaVersion:1,ruleVersion:'hour-xunkong-yima/1.0.0',sourceIds:sources.map(s=>s.id),note:'Expected markers originate from fixed external source tables and the independently transcribed 12 anchors. No src or lunar-typescript import. Negative examples assert absence on all other palaces, including center 5; these universal markers always exist for a valid hour.',handChecks:handChecks.map(([hourGanzhi,xunHead,voidBranches,voidPalaces,horseBranch,horsePalace])=>({hourGanzhi,xunHead,voidBranches:[...voidBranches],voidPalaces,horseBranch,horsePalace})),plateCases,civilCases});
}
const lock=JSON.parse(read('data/qimen-markers-source-lock.json'));
assert(lock.version==='hour-xunkong-yima/1.0.0','Unexpected source-lock version');
assert(JSON.stringify(lock.sources)===JSON.stringify(sources),'Source lock mismatch');
const fixture=JSON.parse(read('tests/fixtures/qimen-markers-examples.json'));
assert(fixture.ruleVersion===lock.version&&fixture.schemaVersion===1,'Unexpected fixture version');
for(const item of [...fixture.plateCases,...fixture.civilCases]) {
  const hour=item.input.timeGanzhi??civilGanzhi(item.input.birthDate,item.input.birthTime).timeGanzhi;
  if(item.input.birthDate) for(const [key,value] of Object.entries(civilGanzhi(item.input.birthDate,item.input.birthTime))) assert(item.expected[key]===value,item.id+' Gregorian day/hour mismatch '+key);
  for(const [key,value] of Object.entries(expected(hour))) assert(JSON.stringify(item.expected[key])===JSON.stringify(value),item.id+' expectation mismatch '+key);
  if(item.absent) {
    assert(!item.absent.voidPalaces.some(n=>item.expected.voidPalaces.includes(n)),item.id+' contradictory negative void');
    assert(!item.absent.horsePalaces.includes(item.expected.horsePalace),item.id+' contradictory negative horse');
    assert(item.absent.voidPalaces.includes(5)&&item.absent.horsePalaces.includes(5),item.id+' center must remain unmarked');
  }
}
console.log(JSON.stringify({ok:true,sourceCount:sources.length,handChecks:handChecks.length,plateCases:fixture.plateCases.length,civilCases:fixture.civilCases.length,xunGroups:Object.keys(xuns).length,horseTargets:[...new Set(Object.values(horses))],engineImported:false},null,2));
