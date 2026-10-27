/**
 * Reproducible Kangxi-radical stroke data. Counts are NEVER taken from
 * CharacterEntry.strokes / Unihan kTotalStrokes. No input glyph is selected here.
 * node scripts/build-numerology-data.mjs [--verify] [--offline]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const raw = path.join(root, 'data/raw');
const output = path.join(root, 'data/numerology-strokes.json');
const lockFile = path.join(root, 'data/numerology-source-lock.json');
const version = 'kangxi-radical-candidates-2026.10.19-v2';
const verify = process.argv.includes('--verify');
const offline = process.argv.includes('--offline');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const breezyCommit = '778d23d0566066ab19906557755b882818ec0a06';
const shunshiCommit = 'fad0bdf7c34b0ec555edbb2af91db737825a4beb';
const sources = [
  { id:'breezy-kangxi-radicals', name:'康熙部首计数表（Kawai Lo）', url:'https://github.com/breezyreeds/kangxi-strokecount', commit:breezyCommit, license:'MIT', files:['kangxi-strokecount.csv','LICENSE','README.md'], sha256:'', note:'按康熙部首规则计算的字形计数表，不是现代手写笔画；简体/繁体/古字各自计数。表中同一输入的多种字形必须人工确认，不能把原字简体计数当作繁体姓名笔画。未将该表全部行宣称为康熙原典独立收字。' },
  { id:'shunshi-kangxi-text', name:'《康熙字典》原文电子整理（Shunshi.AI）', url:'https://github.com/shunshi-ai/kangxi-mcp', commit:shunshiCommit, license:'MIT', files:['packages/kangxi-core/data/kangxi-text.json.gz','LICENSE','README.md'], sha256:'', note:'仅抽取原文头部明确的「康熙筆画」值，与部首表冲突时保留两种候选。原文条目缺少笔画值时不推算；不导入现代chars.kx表的简繁折叠或五行值。古籍原文属公有领域，电子编排MIT。' },
  { id:'unicode-kangxi-variants', name:'Unicode 17.0 简繁字形候选关系', url:'https://github.com/unicode-org/unicodetools', commit:'4fd8eca90b30aa4c72543ccddb4c15d05becdf8d', license:'Unicode-3.0', files:['unicodetools/data/ucd/17.0.0/Unihan/kTraditionalVariant.txt','unicodetools/data/ucd/17.0.0/Unihan/kSimplifiedVariant.txt','LICENSE'], sha256:'', note:'只用于展开全部候选字形，不提供姓名学笔画。kTotalStrokes为普通笔画；kRSKangXi为旧部首索引字段，均不在本构建中作为康熙姓名笔画来源。' },
];
const assets = [
  {name:'numerology-breezy-kangxi-strokecount.csv',source:'breezy-kangxi-radicals',url:`https://raw.githubusercontent.com/breezyreeds/kangxi-strokecount/${breezyCommit}/kangxi-strokecount.csv`},
  {name:'numerology-breezy-LICENSE.txt',source:'breezy-kangxi-radicals',url:`https://raw.githubusercontent.com/breezyreeds/kangxi-strokecount/${breezyCommit}/LICENSE`},
  {name:'numerology-breezy-README.md',source:'breezy-kangxi-radicals',url:`https://raw.githubusercontent.com/breezyreeds/kangxi-strokecount/${breezyCommit}/README.md`},
  {name:'numerology-shunshi-kangxi-text.json.gz',source:'shunshi-kangxi-text',url:`https://raw.githubusercontent.com/shunshi-ai/kangxi-mcp/${shunshiCommit}/packages/kangxi-core/data/kangxi-text.json.gz`},
  {name:'numerology-shunshi-LICENSE.txt',source:'shunshi-kangxi-text',url:`https://raw.githubusercontent.com/shunshi-ai/kangxi-mcp/${shunshiCommit}/LICENSE`},
  {name:'numerology-shunshi-README.md',source:'shunshi-kangxi-text',url:`https://raw.githubusercontent.com/shunshi-ai/kangxi-mcp/${shunshiCommit}/README.md`},
];
function atomicWrite(filename, bytes, readonly=false) {
  fs.mkdirSync(path.dirname(filename), {recursive:true});
  const temp = `${filename}.${process.pid}.tmp`;
  fs.writeFileSync(temp, bytes);
  if(fs.existsSync(filename)) fs.chmodSync(filename, 0o666);
  fs.renameSync(temp, filename);
  if(readonly) fs.chmodSync(filename, 0o444);
}
const lock = fs.existsSync(lockFile) ? JSON.parse(fs.readFileSync(lockFile,'utf8')) : {version, artifacts:{}};
for(const asset of assets) {
  const filename = path.join(raw,asset.name);
  if(!fs.existsSync(filename)) {
    if(verify || offline) throw new Error(`Missing raw source in ${offline?'offline':'verification'} mode: ${asset.name}`);
    // Explicit IPv4 also works on hosts with a non-routable IPv6 default.
    const bytes=execFileSync(process.platform==='win32'?'curl.exe':'curl',['-4','-f','-L','--retry','1','--max-time','45','-sS',asset.url],{maxBuffer:12*1024*1024,windowsHide:true});
    atomicWrite(filename, bytes, true);
    console.log(`Downloaded ${asset.name} (${bytes.length} bytes)`);
  }
  const bytes = fs.readFileSync(filename);
  const hash = sha256(bytes);
  const prior = lock.artifacts[asset.name];
  if(prior && (prior.sha256!==hash || prior.url!==asset.url)) throw new Error(`Source hash/URL mismatch: ${asset.name}`);
  if(verify && !prior) throw new Error(`Unlocked source: ${asset.name}`);
  lock.artifacts[asset.name] = {url:asset.url,sourceId:asset.source,sha256:hash,bytes:bytes.length,commit:sources.find(s=>s.id===asset.source).commit,license:'MIT'};
}
for(const [name,sourceName] of [['kTraditionalVariant.txt','unicode-kangxi-variants'],['kSimplifiedVariant.txt','unicode-kangxi-variants'],['unicode-LICENSE','unicode-kangxi-variants']]) {
  const bytes=fs.readFileSync(path.join(raw,name));
  const baseLock=JSON.parse(fs.readFileSync(path.join(root,'data/source-lock.json'),'utf8'));
  if(!baseLock[name] || baseLock[name].sha256!==sha256(bytes)) throw new Error(`Unicode original does not match main source lock: ${name}`);
  lock.artifacts[name]={...baseLock[name],sourceId:sourceName,commit:sources[2].commit,license:'Unicode-3.0'};
}
sources[0].sha256=lock.artifacts[assets[0].name].sha256;
sources[1].sha256=lock.artifacts[assets[3].name].sha256;
sources[2].sha256=lock.artifacts['kTraditionalVariant.txt'].sha256;

const csvText=fs.readFileSync(path.join(raw,assets[0].name),'utf8').replace(/^\uFEFF/,'');
if(!csvText.includes('MIT License') || !fs.readFileSync(path.join(raw,assets[1].name),'utf8').includes('Permission is hereby granted')) throw new Error('Kawai Lo MIT notice missing');
if(!fs.readFileSync(path.join(raw,assets[4].name),'utf8').includes('Permission is hereby granted')) throw new Error('Shunshi MIT notice missing');
const csv=new Map();
csvText.split(/\r?\n/).forEach((line,index)=>{
  const match=line.match(/^(U\+[0-9A-F]+),(\d+),(.+),(\d+)$/);
  if(!match)return;
  const [,codepoint,decimal,glyph,count]=match;
  if([...glyph].length!==1 || glyph.codePointAt(0)!==Number(decimal) || codepoint!==`U+${Number(decimal).toString(16).toUpperCase()}`) throw new Error(`Malformed source row ${index+1}`);
  const value=Number(count);
  if(!Number.isInteger(value)||value<1||value>100)throw new Error(`Invalid stroke row ${index+1}`);
  if(csv.has(glyph))throw new Error(`Duplicate glyph ${glyph}`);
  csv.set(glyph,{count:value,line:index+1,codepoint});
});
if(csv.size!==63696)throw new Error(`Unexpected fixed source table size: ${csv.size}`);
const original=JSON.parse(gunzipSync(fs.readFileSync(path.join(raw,assets[3].name))));
if(Object.keys(original).length!==17034)throw new Error('Unexpected fixed Kangxi original entry count');

const adjacency=new Map();
function connect(a,b){if(!adjacency.has(a))adjacency.set(a,new Set());if(!adjacency.has(b))adjacency.set(b,new Set());adjacency.get(a).add(b);adjacency.get(b).add(a);}
for(const name of ['kTraditionalVariant.txt','kSimplifiedVariant.txt']) {
  for(const line of fs.readFileSync(path.join(raw,name),'utf8').split(/\r?\n/)) {
    const [cp,rawTargets]=line.split('\t');
    if(!/^[0-9A-F]+$/.test(cp)||!rawTargets)continue;
    const input=String.fromCodePoint(parseInt(cp,16));
    for(const target of rawTargets.matchAll(/U\+([0-9A-F]+)/g))connect(input,String.fromCodePoint(parseInt(target[1],16)));
  }
}
const dataset=JSON.parse(fs.readFileSync(path.join(root,'data/dataset.json'),'utf8'));
if(!Array.isArray(dataset.characters)||!dataset.characters.length||new Set(dataset.characters.map(c=>c.char)).size!==dataset.characters.length||dataset.characters.some(c=>typeof c.char!=='string'||[...c.char].length!==1))throw new Error('Naming input vocabulary must contain unique single-character records');
// Public-domain 百家姓 input vocabulary, not stroke data or an external mapping.
const surnameText='赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜戚谢邹喻柏水窦章云苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳酆鲍史唐费廉岑薛雷贺倪汤滕殷罗毕郝邬安常乐于时傅皮卞齐康伍余元卜顾孟平黄和穆萧尹姚邵湛汪祁毛禹狄米贝明臧计伏成戴谈宋茅庞熊纪舒屈项祝董梁杜阮蓝闵席季麻强贾路娄危江童颜郭梅盛林刁钟徐邱骆高夏蔡田樊胡凌霍虞万支柯昝管卢莫经房裘缪干解应宗丁宣贲邓郁单杭洪包诸左石崔吉龚程嵇邢滑裴陆荣翁荀羊於惠甄曲家封芮羿储靳汲邴糜松井段富巫乌焦巴弓牧隗山谷车侯宓蓬全郗班仰秋仲伊宫宁仇栾暴甘钭厉戎祖武符刘景詹束龙叶幸司韶郜黎蓟薄印宿白怀蒲邰从鄂索咸籍赖卓蔺屠蒙池乔阴胥能苍双闻莘党翟谭贡劳逄姬申扶堵冉宰郦雍郤璩桑桂濮牛寿通边扈燕冀郏浦尚农温别庄晏柴瞿阎充慕连茹习宦艾鱼容向古易慎戈廖庾终暨居衡步都耿满弘匡国文寇广禄阙东欧殳沃利蔚越夔隆师巩厍聂晁勾敖融冷訾辛阚那简饶空曾毋沙乜养鞠须丰巢关蒯相查後荆红游竺权逯盖益桓公万俟司马上官欧阳夏侯诸葛闻人东方赫连皇甫尉迟公羊澹台公冶宗政濮阳淳于单于太叔申屠公孙仲孙轩辕令狐钟离宇文长孙慕容鲜于闾丘司徒司空丌官司寇仉督子车颛孙端木巫马公西漆雕乐正壤驷公良拓跋夹谷宰父谷梁晋楚闫法汝鄢涂钦段干百里东郭南门呼延归海羊舌微生梁丘左丘东门西门南宫佟第五言福';
const targets=new Set([...dataset.characters.map(c=>c.char),...surnameText,...'王李林安明文月天一司徒上官公羊']);
for(const c of dataset.characters)for(const glyph of c.variants??[])if([...glyph].length===1)targets.add(glyph);
for(const input of [...targets])for(const alternate of adjacency.get(input)??[])targets.add(alternate);
const records=[];
const originalConflicts=[];
for(const character of [...targets].sort((a,b)=>a.codePointAt(0)-b.codePointAt(0))) {
  const glyphs=new Set([character]);
  const queue=[character];
  while(queue.length){const current=queue.shift();for(const next of adjacency.get(current)??[]){if(!glyphs.has(next)){glyphs.add(next);queue.push(next);}}}
  for(const glyph of [...glyphs].sort((a,b)=>a.codePointAt(0)-b.codePointAt(0))) {
    const entry=csv.get(glyph);
    if(!entry)continue;
    const mappingNote=character===glyph?'输入原字形。':`Unicode简繁候选关系：${character}→${glyph}，需按姓名用义人工确认。`;
    const head=original[glyph]?.split('\n',1)[0];
    records.push({id:`kr-${character.codePointAt(0).toString(16)}-${glyph.codePointAt(0).toString(16)}-${entry.count}`,character,glyph,count:entry.count,sourceId:sources[0].id,sourceLocator:`kangxi-strokecount.csv:L${entry.line} (${entry.codepoint},${entry.count})`,note:`${mappingNote}康熙部首计数表的字形值，非普通手写笔画；不自动替换为繁体姓名字。${head?` 电子原典条目：${head}`:' 此字形未在本次电子原典条目中命中，须复核适用字形。'}`});
    const explicit=head?.match(/康熙筆[画畫]\s*[：:]\s*(\d+)/);
    if(explicit&&Number(explicit[1])!==entry.count){
      const count=Number(explicit[1]);
      records.push({id:`ko-${character.codePointAt(0).toString(16)}-${glyph.codePointAt(0).toString(16)}-${count}`,character,glyph,count,sourceId:sources[1].id,sourceLocator:`kangxi-text.json[${JSON.stringify(glyph)}] / ${head}`,note:`${mappingNote}电子原文明确标为${count}画，与康熙部首计数表${entry.count}画存在来源差异；需起名师按选定计数惯例确认，不静默覆盖。`});
      originalConflicts.push({character,glyph,radicalCount:entry.count,originalCount:count});
    }
  }
}
const covered=new Set(records.map(r=>r.character));
const missing=dataset.characters.map(c=>c.char).filter(c=>!covered.has(c));
if(missing.length)throw new Error(`Fixed Kangxi sources do not cover the current naming vocabulary: ${missing.join('、')}; no ordinary-stroke fallback is allowed`);
const ambiguities=dataset.characters.filter(c=>new Set(records.filter(r=>r.character===c.char).map(r=>`${r.glyph}/${r.count}`)).size>1).map(c=>c.char);
const artifact={version,sources,records};
const serialized=JSON.stringify(artifact,null,2)+'\n';
lock.version=version;
lock.build={datasetVersion:dataset.version,inputNamingCharacters:dataset.characters.length,coveredNamingCharacters:dataset.characters.length-missing.length,missingNamingCharacters:missing,ambiguousNamingCharacters:ambiguities,records:records.length,inputCharacters:targets.size,sourceRows:csv.size,originalEntries:Object.keys(original).length,explicitOriginalConflicts:originalConflicts,outputSha256:sha256(serialized)};
if(verify){
  if(!fs.existsSync(output)||fs.readFileSync(output,'utf8')!==serialized)throw new Error('Numerology output is not reproducible from locked inputs');
  if(JSON.stringify(JSON.parse(fs.readFileSync(lockFile,'utf8')))!==JSON.stringify(lock))throw new Error('Numerology source lock/build metadata differs');
}else{
  atomicWrite(output,serialized);
  atomicWrite(lockFile,JSON.stringify(lock,null,2)+'\n');
}
console.log(JSON.stringify({mode:verify?'verified':'built',networkPolicy:offline?'offline-raw-cache-only':verify?'verification-raw-cache-only':'fetch-only-missing-locked-assets',version,records:records.length,coveredNamingCharacters:dataset.characters.length-missing.length,namingCharacters:dataset.characters.length,ambiguousNamingCharacters:ambiguities.length,missing,explicitConflicts:originalConflicts.length,outputSha256:lock.build.outputSha256}));
