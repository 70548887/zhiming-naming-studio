import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGzip, createGunzip, gunzipSync } from 'node:zlib';
import { createInterface } from 'node:readline';
import { spawnSync } from 'node:child_process';
import dns from 'node:dns';
import {validateEditorialCitations} from './editorial-citation-validation.mjs';
dns.setDefaultResultOrder('ipv4first');

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DATA = path.join(ROOT, 'data');
const RAW = path.join(DATA, 'raw');
const VERSION = '2026.10.18.1';
const ZHOUYI = 'c74ae5a89e4b01da03fc8024d653f764ffd10aef';
const POETRY = 'b8594f81a89752241442f2ce267d6f66f96704ee';
const UNICODE = '4fd8eca90b30aa4c72543ccddb4c15d05becdf8d';
const WIKTEXTRACT = '4b3d73adbacdc82aa1d8cb9f15aab2e5fba42b98';
const MOE = 'a6dc997417507eb510fc29822bc514de2c92728c';
fs.mkdirSync(RAW, { recursive: true });
const lockPath = path.join(DATA, 'source-lock.json');
const lock = fs.existsSync(lockPath) ? JSON.parse(fs.readFileSync(lockPath, 'utf8')) : {};
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const reproducibilityBefore=process.argv.includes('--reproducibility-check')&&fs.existsSync(path.join(DATA,'dataset.json'))&&fs.existsSync(path.join(DATA,'knowledge.sqlite'))?{json:sha(fs.readFileSync(path.join(DATA,'dataset.json'))),sqlite:sha(fs.readFileSync(path.join(DATA,'knowledge.sqlite')))}:null;
const atomic = (filename, bytes) => { fs.mkdirSync(path.dirname(filename), { recursive: true }); fs.writeFileSync(filename + '.tmp', bytes); fs.renameSync(filename + '.tmp', filename); };

async function download(key, url, gzip = false) {
  const target = path.join(RAW, key);
  if (!fs.existsSync(target)) {
    if (process.argv.includes('--offline')) throw new Error(`Offline source missing: ${key}`);
    console.log(`Downloading ${key}`);
    let completed = false;
    for(let attempt=1;attempt<=3&&!completed;attempt++) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(180000), headers: { 'User-Agent': 'NamingStudio-DataBuilder/1.0 (licensed offline dictionary snapshot)' } });
        if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
        const stream = Readable.fromWeb(response.body);
        if (gzip) await pipeline(stream, createGzip({ level: 9 }), fs.createWriteStream(target + '.tmp'));
        else await pipeline(stream, fs.createWriteStream(target + '.tmp'));
        completed = true;
      } catch(error) {
        if(attempt===3)throw error;
        console.log(`Retry ${attempt}/2: ${key} (${error.message})`);
      }
    }
    fs.renameSync(target + '.tmp', target);
  }
  const bytes = fs.readFileSync(target), hash = sha(bytes);
  if (lock[key] && lock[key].sha256 !== hash) throw new Error(`Source cache changed: ${key}; restore original bytes rather than silently accepting a new snapshot.`);
  lock[key] = { url, sha256: hash, bytes: bytes.length, ...(lock[key]?.retrievedAt ? { retrievedAt: lock[key].retrievedAt } : { retrievedAt: new Date().toISOString() }), encoding: gzip ? 'gzip of original UTF-8 response, no content edits' : 'original response' };
  atomic(lockPath, JSON.stringify(lock, null, 2) + '\n');
  return target;
}

const jobs = [
  ['zhouyi.tar.gz', `https://codeload.github.com/koriyoshi2041/zhouyi/tar.gz/${ZHOUYI}`],
  ['zhouyi-LICENSE', `https://raw.githubusercontent.com/koriyoshi2041/zhouyi/${ZHOUYI}/LICENSE`],
  ['shijing.json', `https://raw.githubusercontent.com/chinese-poetry/chinese-poetry/${POETRY}/%E8%AF%97%E7%BB%8F/shijing.json`],
  ['poetry-LICENSE', `https://raw.githubusercontent.com/chinese-poetry/chinese-poetry/${POETRY}/LICENSE`],
  ['unicode-LICENSE', `https://raw.githubusercontent.com/unicode-org/unicodetools/${UNICODE}/LICENSE`],
  ['CJKRadicals.txt', `https://raw.githubusercontent.com/unicode-org/unicodetools/${UNICODE}/unicodetools/data/ucd/17.0.0/CJKRadicals.txt`],
  ...['kMandarin', 'kTotalStrokes', 'kTraditionalVariant', 'kSimplifiedVariant', 'kRSUnicode'].map(f => [`${f}.txt`, `https://raw.githubusercontent.com/unicode-org/unicodetools/${UNICODE}/unicodetools/data/ucd/17.0.0/Unihan/${f}.txt`]),
  ['zhwiktionary-index.html', 'https://kaikki.org/zhwiktionary/%E6%BC%A2%E8%AA%9E/index.html'],
  ['zhwiktionary-Chinese.jsonl.gz', 'https://kaikki.org/zhwiktionary/%E6%BC%A2%E8%AA%9E/kaikki.org-dictionary-%E6%BC%A2%E8%AA%9E.jsonl', true],
  ['CC-BY-SA-4.0.txt', 'https://creativecommons.org/licenses/by-sa/4.0/legalcode.txt'],
  ['moe-revised.json.gz', `https://raw.githubusercontent.com/g0v/moedict-data/${MOE}/dict-revised_bkup.json`, true],
  ['moe-README.md', `https://raw.githubusercontent.com/g0v/moedict-data/${MOE}/README.md`],
  ['CC-BY-ND-3.0-TW.html', 'https://creativecommons.org/licenses/by-nd/3.0/tw/legalcode.zh-hant'],
];
await Promise.all(jobs.map(args => download(...args)));

if (process.argv.includes('--download-only')) { console.log('Source download complete.'); process.exit(0); }

const archiveRoot = path.join(RAW, `zhouyi-${ZHOUYI}`);
if (!fs.existsSync(archiveRoot)) {
  const result = spawnSync('tar', ['-xzf', path.join(RAW, 'zhouyi.tar.gz'), '-C', RAW], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(`tar extraction failed: ${result.stderr}`);
}
function field(name) {
  const map = new Map();
  for (const line of fs.readFileSync(path.join(RAW, name + '.txt'), 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const [range, value] = line.split('\t'); if (!value) continue;
    const [a,b] = range.split('..').map(x => parseInt(x,16));
    for(let cp=a;cp<=(b??a);cp++) map.set(String.fromCodePoint(cp), value);
  }
  return map;
}
const mandarin = field('kMandarin'), strokes = field('kTotalStrokes'), traditional = field('kTraditionalVariant'), simplified = field('kSimplifiedVariant'), radicals = field('kRSUnicode');
const variants = value => [...(value||'').matchAll(/U\+([0-9A-F]+)/g)].map(m => String.fromCodePoint(parseInt(m[1],16)));
const reverseSimplified=new Map();
for(const [original,value]of simplified)for(const s of variants(value)){if(s===original)continue;const list=reverseSimplified.get(s)||[];list.push(original);reverseSimplified.set(s,list);}
const traditionalCandidates=char=>[...new Set([...variants(traditional.get(char)).filter(c=>c!==char),...(reverseSimplified.get(char)||[]),char])];
const radicalNames=new Map(fs.readFileSync(path.join(RAW,'CJKRadicals.txt'),'utf8').split(/\r?\n/).filter(l=>l.trim()&&!l.startsWith('#')).map(l=>{const [n,,glyph]=l.split(';').map(s=>s.trim());return[n,String.fromCodePoint(parseInt(glyph,16))];}));
const moe=new Map(JSON.parse(gunzipSync(fs.readFileSync(path.join(RAW,'moe-revised.json.gz')))).map(e=>[e.title,e]));
const approved = [...new Set(fs.readFileSync(path.join(DATA,'naming-characters.txt'),'utf8').replace(/\s|#.*$/gm,'').split(''))];
const wanted = new Set(approved.flatMap(traditionalCandidates));
const dictionary = new Map();
const lines = createInterface({ input: fs.createReadStream(path.join(RAW,'zhwiktionary-Chinese.jsonl.gz')).pipe(createGunzip()), crlfDelay: Infinity });
for await(const line of lines) {
  if(!line)continue;
  const entry=JSON.parse(line);
  if(wanted.has(entry.word)) {
    const existing=dictionary.get(entry.word)||[]; existing.push(entry); dictionary.set(entry.word,existing);
  }
}

const tone = pinyin => { for(const [i,chars] of ['āēīōūǖ','áéíóúǘ','ǎěǐǒǔǚ','àèìòùǜ'].entries())if([...pinyin].some(c=>chars.includes(c)))return i+1; return 5; };
const editorial=JSON.parse(fs.readFileSync(path.join(DATA,'naming-editorial.json'),'utf8'));
const cleanPinyin=value=>(value||'').replace(/[（(][^）)]*[）)]/g,'').trim();
const isSingleReading=value=>/^[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+$/i.test(value);
const chineseNumbers={'一':0,'二':1,'三':2,'四':3,'五':4,'六':5,'七':6,'八':7,'九':8};
function moeReadingDefinitions(heteronyms,index,visited=new Set()) {
  if(visited.has(index))return[];visited.add(index);
  const defs=(heteronyms[index]?.definitions||[]).map(d=>d.def).filter(Boolean);
  const reference=defs.length===1?/^[（(]([一二三四五六七八九])[）)]之(?:又音|語音|讀音)。?$/.exec(defs[0]):null;
  return reference?moeReadingDefinitions(heteronyms,chineseNumbers[reference[1]],visited):defs.filter(s=>/[\u3400-\u9fff]/u.test(s)&&!/(之語音|之讀音|之又音)/.test(s));
}
const ideograms = {
  木: '木林森松柏杉桐梧桦楠榕榆柳杨桃梅杏桂榛栋梁栩栎楷樾桢桓梓楚棋棠棣樱槿樊桑棪榭棨植柯朴橙樟椿楫桉柠棕芃芊芙芝芮芯芸芷芩芬芳芹苇若英茂茉苗茗茜荃茵茹荞荟荣荷莉莎莞莘菀菁菊菲萃萌萍萱蓉蓁蓓蔚蕊蕙蕾薇蓝苏竹竺笙笛筠筱箫箐策符篁筑穗禾秀秋稚颖稷秉稼穆蕴艺萦筝竣笃',
  火: '火炎焱燚炜炫炯炳烨烁焕煌煜熠熙煊熹焰燃灿灵灼烜灯灿昀昂旭旦旻昊昌明昕星映春昭昱昶晋晟晗晨晏晖晔晓晴晞晢景晶智暖暄暅暘曜曦晁曙日夏丹彤南赤红骄昇炅',
  土: '土圭圻均坤坦坪垚垣城域培基堂堃堤堇境增墉墨垠埙圣坚岳山岚岑岐岱岩岫岭岷岿峥峻峰崇崎嵘嵩嵋嵚崧屹岺岗峤峨峪嵬安宇宥宛容宸宏家宜寅宣宁寰宽定宝琬琰玉玟玥玮珂珈珊珍珏珑玲珠珞琦琪琛琳琢琮琨琬琼瑄瑛瑜瑞瑶瑾璇璋璞璟璠璐璨璎璧璋玙玠瑗瑚璘',
  金: '金鑫钊钦钧钰钟钢钒钲钺钿铂铃铄铎铠铭铮铨银锋锐锦锴锟锶锡镇镕镐镟鉴锆铖镛钜锵钗锌镜镒钅钏钤锘锜铱钠锚锑锗锹铸铁铜钟铿兑秋肃商铉',
  水: '水永汀汇汉汐汕汝江池汶沁沂沅沐沛沙沣沦沧沫沭河泓泠泉泊泫泯泱泽洁洵洺洋洹洸洛津洪洲洱洽活洳流浈浚浦浩海浠涛浣涔润涵淇淋淞淑淳淙淮深添清渊渔渝渠渡渤温渺湘湛港游溢溥溪溯溱溶滢滨漓漪漫漾潇潍潘潜潼澄澈澍澜澎澳濂濛濯瀚瀛灏霖雨雪雯霁霏霄露霞霓霆云冰冬凝寒泷濡洛沄霈泳汎凌淼沂淅淳',
};
const charReview=[];
const characters=[];
for(const char of approved) {
  const tradCandidates=traditionalCandidates(char);
  const trad=editorial.characters[char]?.dictionaryWord||tradCandidates[0]||char;
  const entries=[...new Set([char,...tradCandidates])].flatMap(c=>dictionary.get(c)||[]);
  const direct=entries.flatMap(e=>(e.senses||[]).filter(s=>!s.tags?.some(t=>['obsolete','archaic','nonstandard'].includes(t))).flatMap(s=>s.glosses||[])).filter(g => /[\u3400-\u9fff]/u.test(g)&&!/(的[简簡繁]体|的[简簡繁]體|的异体|的異體|同“|同「|異體字|异体字|參見|参见|简化字|簡化字|词语|詞語|__NOTITLECONVERT__|^\^?‡)/.test(g));
  const wikiGlosses=[...new Set(direct)].filter(s=>s.length>1);
  const dictionaryWord=editorial.characters[char]?.dictionaryWord;
  if(dictionaryWord&&(!tradCandidates.includes(dictionaryWord)||!moe.has(dictionaryWord)))throw new Error(`Editorial dictionary word for ${char} must be an existing source entry among its Unicode variants.`);
  const moeWords=dictionaryWord?[dictionaryWord]:tradCandidates;
  const moeEntry=moeWords.map(c=>moe.get(c)).find(entry=>entry?.heteronyms?.some((h,index)=>isSingleReading(cleanPinyin(h.pinyin))&&moeReadingDefinitions(entry.heteronyms,index).length));
  const heteronyms=moeEntry?.heteronyms||[];
  const readings=heteronyms.map((h,index)=>({pinyin:cleanPinyin(h.pinyin),tone:tone(cleanPinyin(h.pinyin)),meanings:[...new Set(moeReadingDefinitions(heteronyms,index))],sourceId:'moe-revised',word:moeEntry.title})).filter(h=>isSingleReading(h.pinyin)&&h.meanings.length);
  const usedMoe=readings.length>0;
  const unicodeReading=mandarin.get(char)?.split(' ')[0];
  const preferredReading=editorial.characters[char]?.pinyin||unicodeReading;
  const selectedReading=readings.find(h=>h.pinyin===preferredReading)||readings.find(h=>h.pinyin===unicodeReading)||readings[0];
  const pinyin=usedMoe?selectedReading.pinyin:unicodeReading;
  const unique=usedMoe?selectedReading.meanings:wikiGlosses;
  if(!pinyin||!unique.length){charReview.push({char,status:'excluded',reason:!pinyin?'no source-linked Mandarin reading':'no direct Chinese gloss in selected dictionary entry'});continue;}
  const preferredSense=editorial.characters[char]?.dictionarySense;
  if(preferredSense&&usedMoe&&!unique.includes(preferredSense))throw new Error(`Editorial sense for ${char}/${pinyin} is not an exact source definition of this reading.`);
  const selected=preferredSense&&unique.includes(preferredSense)?[preferredSense,...unique.filter(s=>s!==preferredSense)].slice(0,3):unique.slice(0,3);
  const pinyins=[...new Set(entries.flatMap(e=>(e.sounds||[]).filter(s=>s.tags?.includes('Mandarin')&&s.tags?.includes('Standard-Chinese')&&s.tags?.includes('Pinyin')).map(s=>s.zh_pron)))];
  const warnings=[];
  const polyphonic=usedMoe?new Set(readings.map(h=>h.pinyin)).size>1:pinyins.length>1||/[ ,]/.test(mandarin.get(char)||'');
  if(polyphonic)warnings.push(`多音字：本方案采用 ${pinyin}，请按姓名用法确认；各读音义项分别保存。`);
  const count=Number(strokes.get(char)?.split(' ')[0]||0);
  if(count>16)warnings.push('书写笔画较多，请评估日常书写便利。');
  if('燚暘'.includes(char))warnings.push('叠字形或异体形较易引起识读疑问，口头介绍时建议说明读音。');
  if(trad!==char)warnings.push(`繁体对应“${trad}”，简繁与异体须按户籍用字确认。`);
  if(variants(traditional.get(char)).length>1)warnings.push(`Unicode 记有多个简繁对应：${variants(traditional.get(char)).join('、')}，请按实际字义确认。`);
  const elements=Object.entries(ideograms).filter(([,chars])=>chars.includes(char)).map(([element])=>element);
  const tags=[];
  if(/[花草木林树樹竹植物]/.test(selected.join('')))tags.push('自然草木');
  if(/(美玉|玉石|珍宝|珍寶)/.test(selected.join('')))tags.push('玉石珍宝');
  if(/[光|明|日|太阳|太陽]/.test(selected.join('')))tags.push('明朗');
  if(/[善|德|诚信|誠信|仁|美好]/.test(selected.join('')))tags.push('美德');
  if(!tags.length)tags.push('常用命名字候选');
  const sourceId=usedMoe?'moe-revised':'wiktionary-zh';
  const radical=radicalNames.get(radicals.get(char)?.split(' ')[0]?.split('.')[0])||moeEntry?.radical||'';
  const equivalence=[...new Set([char,...tradCandidates,...variants(simplified.get(char)),...tradCandidates.flatMap(ch=>variants(simplified.get(ch)))])];
  characters.push({char,pinyin,tone:tone(pinyin),meaning:selected.join('；'),traditional:trad,strokes:count||null,radical,elements,elementBasis:elements.length?'字形／字义意象参考 v1（项目自编标签，非唯一汉字五行定论；不得当作康熙笔画五行）':'五行属性待起名师指定；不从普通笔画数推定五行',tags,warning:warnings.join(' ')||'本表按字典中文义项与 Unicode 字形字段核对；仍需结合全名检查谐音。',sourceId,readings:usedMoe?readings:[{pinyin,tone:tone(pinyin),meanings:unique,sourceId,word:dictionary.has(char)?char:trad}],polyphonic,variants:equivalence});
  charReview.push({char,status:'included',sourceId,glossWord:usedMoe?moeEntry.title:(dictionary.has(char)?char:trad),traditionalVariants:equivalence,glosses:selected,pinyinSource:usedMoe?`MOE/${moeEntry.title}/heteronym/${pinyin}`:`Unihan17/kMandarin/U+${char.codePointAt(0).toString(16).toUpperCase()}`,readings:usedMoe?heteronyms.map((h,index)=>({pinyin:cleanPinyin(h.pinyin),sourceDefinitions:(h.definitions||[]).map(d=>d.def),resolvedDefinitions:moeReadingDefinitions(heteronyms,index)})):[],selectionRule:dictionaryWord?'explicit source dictionary word among Unicode variants; exact reading definitions retained':editorial.characters[char]?.pinyin?'project naming-reading preference; source heteronym meanings retained separately':'Unihan reading matched to MOE heteronym, otherwise first source heteronym',strokesSource:'Unihan17/kTotalStrokes（普通字形笔画，非康熙笔画）',radicalSource:'Unihan17/kRSUnicode + CJKRadicals.txt',entryUrl:usedMoe?`https://github.com/g0v/moedict-data/blob/${MOE}/dict-revised_bkup.json`:`https://zh.wiktionary.org/wiki/${encodeURIComponent(dictionary.has(char)?char:trad)}`,review:'Machine checks: each MOE reading keeps its own exact source definitions; pronunciation aliases resolve only explicit numbered references in the same original entry. Original dictionary definition text is unchanged. Editorial naming imagery is a separate project-authored layer, not a dictionary quotation.'});
}
if(characters.length<500)throw new Error(`Only ${characters.length} complete approved characters; minimum is 500. See source list and missing glosses.`);

const poetry=JSON.parse(fs.readFileSync(path.join(RAW,'shijing.json'),'utf8'));
const citations=poetry.flatMap((p,i)=>p.content.map((text,j)=>({id:`shijing-${i+1}-${j+1}`,title:'诗经',chapter:`${p.chapter}·${p.section}·${p.title} 第${j+1}章`,text,sourceId:'shijing'})));
const knowledge=[];
for(const p of poetry)knowledge.push({id:`poem-${knowledge.length+1}`,category:'诗经',title:`《诗经·${p.title}》`,text:`${p.chapter}·${p.section}\n${p.content.join('\n')}`,sourceId:'shijing'});

// The upstream TypeScript objects are static data; import only the known data module after it is located below.
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?walk(path.join(dir,d.name)):[path.join(dir,d.name)]);}

const { build } = await import('esbuild');
const compiled=await build({stdin:{contents:"export {HEXAGRAMS} from './src/data/hexagrams.ts'; export {TRIGRAMS} from './src/data/trigrams.ts';",resolveDir:archiveRoot},bundle:true,format:'esm',platform:'node',write:false,logLevel:'silent'});
const {HEXAGRAMS,TRIGRAMS}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
if(HEXAGRAMS.length!==64||new Set(HEXAGRAMS.map(h=>h.number)).size!==64||HEXAGRAMS.some(h=>h.yaoTexts.length!==6||!h.guaCi||!h.daXiang))throw new Error('Incomplete Zhouyi: expected 64 unique hexagrams, 384 line texts, and 64 judgements/images.');
for(const h of HEXAGRAMS){
  const base=`zhouyi-${h.number}`;
  citations.push({id:base+'-gua',title:'周易',chapter:`第${h.number}卦·${h.fullName}·卦辞`,text:h.guaCi,sourceId:'zhouyi'});
  citations.push({id:base+'-xiang',title:'周易·象传',chapter:`第${h.number}卦·${h.fullName}·大象`,text:h.daXiang,sourceId:'zhouyi'});
  h.yaoTexts.forEach((y,i)=>citations.push({id:base+`-yao-${i+1}`,title:'周易',chapter:`第${h.number}卦·${h.fullName}·${y.position}`,text:y.text,sourceId:'zhouyi'}));
  if(h.yongText)citations.push({id:base+'-yong',title:'周易',chapter:`第${h.number}卦·${h.fullName}·${h.name==='乾'?'用九':'用六'}`,text:h.yongText,sourceId:'zhouyi'});
  knowledge.push({id:base,category:'周易',title:`${h.unicode} 第${h.number}卦 ${h.fullName}`,text:`上卦${h.upperTrigram}，下卦${h.lowerTrigram}。\n卦辞：${h.guaCi}\n大象：${h.daXiang}\n${h.yaoTexts.map(y=>`${y.position}：${y.text}`).join('\n')}${h.yongText?'\n'+h.yongText:''}\n本条仅收入卦辞、六爻及大象原文，不代表完整《十翼》。`,sourceId:'zhouyi'});
}
const palaceInfo={'乾':[6,'西北'],'兑':[7,'西'],'离':[9,'南'],'震':[3,'东'],'巽':[4,'东南'],'坎':[1,'北'],'艮':[8,'东北'],'坤':[2,'西南']};
for(const t of Object.values(TRIGRAMS))knowledge.push({id:`trigram-${t.name}`,category:'八卦',title:`${t.symbol} ${t.name}卦`,text:`${t.name}为${t.nature}，卦德为${t.attribute}；传统五行为${t.element}。先天序数${t.xiantianIndex}；后天九宫为${palaceInfo[t.name][0]}宫、${palaceInfo[t.name][1]}方。三爻编码自下向上为${t.binary}。这些是术数分类关系，不是汉字五行自动归属依据。`,sourceId:'zhouyi'});
const add=(id,category,title,text)=>knowledge.push({id,category,title,text,sourceId:'editorial-rules'});
add('palace-layout','九宫','后天八卦与洛书九宫','洛书九宫：坎一北、坤二西南、震三东、巽四东南、中五、乾六西北、兑七西、艮八东北、离九南。常用图以上南下北绘制：四九二／三五七／八一六；图的视觉朝向须与实际方位标注区分。中宫没有独立经卦。');
for(const [number,direction,trigram,element] of [[1,'北','坎','水'],[2,'西南','坤','土'],[3,'东','震','木'],[4,'东南','巽','木'],[5,'中央','中宫','土'],[6,'西北','乾','金'],[7,'西','兑','金'],[8,'东北','艮','土'],[9,'南','离','火']])add(`palace-${number}`,'九宫',`${number}宫·${trigram}`,`后天九宫${number}宫，对应${direction}，${trigram}，传统五行${element}。${number===5?'本项目中五寄坤二，天禽随天芮，仅适用于当前奇门规则版本。':'宫位是空间分类，不能据此直接断定姓名吉凶。'}`);
const gens='甲乙丙丁戊己庚辛壬癸', genElements=['木','木','火','火','土','土','金','金','水','水'];
for(const [i,g] of [...gens].entries())add(`gan-${g}`,'天干地支',`天干·${g}`,`${g}为十天干第${i+1}位，属${i%2===0?'阳':'阴'}${genElements[i]}。天干按甲乙丙丁戊己庚辛壬癸循环。十神须以日干为参照，不能只凭一个天干确定。`);
const branches='子丑寅卯辰巳午未申酉戌亥',animals='鼠牛虎兔龙蛇马羊猴鸡狗猪',branchElements=['水','土','木','木','土','火','火','土','金','金','土','水'],hidden=['癸','己癸辛','甲丙戊','乙','戊乙癸','丙庚戊','丁己','己丁乙','庚壬戊','辛','戊辛丁','壬甲'];
for(const [i,b]of[...branches].entries()){
  add(`zhi-${b}`,'天干地支',`地支·${b}`,`${b}为十二地支第${i+1}位，传统五行${branchElements[i]}，藏干${[...hidden[i]].join('、')}，生肖${[...animals][i]}。对应时辰${i===0?'23:00—次日01:00':String(i*2-1).padStart(2,'0')+':00—'+String(i*2+1).padStart(2,'0')+':00'}。生肖年份与八字年柱的切换边界须分别计算。`);
}
const elementCycle=['木','火','土','金','水'];const overcome={木:'土',火:'金',土:'水',金:'木',水:'火'};
for(const [i,e]of elementCycle.entries())add(`element-${e}`,'五行',`五行·${e}`,`${e}生${elementCycle[(i+1)%5]}，${e}克${overcome[e]}；${elementCycle[(i+4)%5]}生${e}。五行是传统分类体系。八字缺少某一行不等同于需要补足，喜用候选还须考虑月令、日主与整体生克。字形意象标签与八字喜用神是两个不同层面的数据。`);
add('element-count-and-favorable','五行','五行缺项与喜用候选','先计算四柱、藏干和月令，再分析通根、透干及生克。单纯统计金木水火土个数只能给出分布，不足以确定用神。扶抑与调候的结论应分开，特殊格局保留起名师复核。');
add('zodiac-six-combines','生肖','地支六合','传统地支六合：子丑、寅亥、卯戌、辰酉、巳申、午未。这是地支关系表。将其应用到字根宜忌属于具体姓名学流派，必须单独说明规则，不能把字形直接当作人的生肖。');
add('zodiac-six-clashes','生肖','地支六冲','传统地支六冲：子午、丑未、寅申、卯酉、辰戌、巳亥。姓名字根规则若参照此表，结果作为传统参考提示，不能宣称单凭该规则预知人生。');
add('zodiac-three-combines','生肖','地支三合','传统三合局：申子辰水、亥卯未木、寅午戌火、巳酉丑金。三合成局的判断存在条件及流派差异，不应仅凭两个字根机械判断。');
add('qimen-overview','奇门','时家转盘奇门·本项目规则','本项目采用出生时刻的时家转盘参考盘：拆补法，三元按甲己符头；实际交节切换节气；中五寄坤二，天禽随天芮。记录规则版本。出生时刻未知时不排唯一盘。九宫参考盘不直接提供“姓名落宫”结论。');
add('qimen-nine-stars','奇门','奇门九星','九星：天蓬、天芮、天冲、天辅、天禽、天心、天柱、天任、天英；本位分别在坎一、坤二、震三、巽四、中五、乾六、兑七、艮八、离九。星名是传统符号，不能直接当作人的性格测验。');
add('qimen-eight-doors','奇门','奇门八门','八门：休、生、伤、杜、景、死、惊、开。本位依次为坎一、艮八、震三、巽四、离九、坤二、兑七、乾六。门的名称来自传统术数分类，单个门名不能代替完整分析。');
add('qimen-eight-gods','奇门','奇门八神','八神采用值符、螣蛇、太阴、六合、白虎、玄武、九地、九天版本，阳遁顺布、阴遁逆布。其他流派可采用不同神名与布局，不能无版本地混用。');
add('qimen-three-qi-six-yi','奇门','三奇六仪与遁甲','三奇为乙、丙、丁；六仪为戊、己、庚、辛、壬、癸。常用地盘奇仪序列为戊己庚辛壬癸丁丙乙，依阴阳遁和局数布置。六甲分别遁于六仪，旬首关系须按六十甲子查定。');
add('qimen-sanyuan','奇门','拆补法与三元符头','甲日、己日可作为五日一元的符头。符头地支属子午卯酉为上元、寅申巳亥为中元、辰戌丑未为下元。项目按实际交节更新节气局表，并保留该流派规则说明。');
add('qimen-dun','奇门','阴遁与阳遁','本规则冬至起阳遁，夏至起阴遁；交节按实际时刻判定。局数由节气与上中下元表共同决定。日期相同而交节前后不同，可能排出不同的局。');
add('qimen-review','奇门','奇门参考的使用边界','参考盘与出生资料关联，候选姓名共享同一出生盘。本项目不自创姓名落宫、解四害的选字映射。空亡、入墓、击刑等需有明确规则与独立标准盘后才可启用对应标记。');
add('naming-pronunciation','起名方法','音韵：先确认姓氏读音','复姓及单、解、乐、曾、查、仇、区等姓氏可能有特殊读音，应由用户确认。全名检查声母、韵母、声调连续重复及明显不雅谐音。普通话检查不覆盖所有方言，提醒起名师按家庭方言复核。');
add('naming-source','起名方法','引用原文与现代组合寓意','只有本地收录且能定位到作品篇章的原句才作为典籍引用。候选字来自不同作品或只具有现代组合寓意时，必须清楚标注，不应拼接或改写成“古籍原句”。');
add('naming-psychology','起名方法','语言印象与心理联想','温润、清朗、庄重等属于中文语感和联想描述，会因读者经验和文化背景不同。用这些词表达命名风格，不把它们写成人格、能力或未来成就的测量结果。');
add('naming-marketing','起名方法','传播与记忆：可读、可写、可复述','现代传播视角重点检查听过后能否复述、姓名书写是否方便、是否容易读错、是否有清晰的文化记忆线索。辨识度是方案内部的相对比较，没有人口统计数据时不提供全国重名率。');
add('naming-industry','起名方法','家庭文化与行业意象','家庭文化可用医学的仁爱、工程的求实、艺术的灵动等语义作为命名偏好；它只影响寓意选材，不改变八字或奇门盘，不限制儿童未来职业。');
add('naming-elements','起名方法','汉字五行与笔画数据','本字库使用项目自编的字形／字义意象参考标签；未标注的字保留空属性，允许起名师修订。Unicode kTotalStrokes 是普通字形笔画，不是康熙笔画，不能直接用于康熙姓名数理。');
add('naming-negative-rules','起名方法','传统不利组合与避讳','家庭禁用字、长辈避讳及明显不雅谐音可硬性排除。生肖和数理等传统不利组合必须说明具体规则与流派，不能在缺乏规则时使用“大凶”等断言。');

const sourceFiles={
 zhouyi:['zhouyi.tar.gz','zhouyi-LICENSE'],shijing:['shijing.json','poetry-LICENSE'],unicode:['kMandarin.txt','kTotalStrokes.txt','kTraditionalVariant.txt','kSimplifiedVariant.txt','kRSUnicode.txt','CJKRadicals.txt','unicode-LICENSE'],wiktionary:['zhwiktionary-Chinese.jsonl.gz','zhwiktionary-index.html','CC-BY-SA-4.0.txt'],moe:['moe-revised.json.gz','moe-README.md','CC-BY-ND-3.0-TW.html']
};
const aggregate=files=>sha(files.map(f=>`${f}\0${lock[f].sha256}`).join('\n'));
const sources=[
 {id:'zhouyi',name:'周易卦辞、爻辞与大象（koriyoshi2041/zhouyi）',url:'https://github.com/koriyoshi2041/zhouyi',commit:ZHOUYI,license:'MIT',files:sourceFiles.zhouyi.map(f=>'data/raw/'+f),sha256:aggregate(sourceFiles.zhouyi),note:'古籍原文为公版；仓库整理按 MIT 授权。仅提取64卦卦辞、384爻辞、64大象及乾坤用辞；不导入现代译文，不宣称完整十翼。package.json 的 ISC 字段与根 LICENSE 不同，本项目按实际根 MIT LICENSE 保留声明。'},
 {id:'shijing',name:'《诗经》原文（chinese-poetry）',url:'https://github.com/chinese-poetry/chinese-poetry',commit:POETRY,license:'MIT',files:sourceFiles.shijing.map(f=>'data/raw/'+f),sha256:aggregate(sourceFiles.shijing),note:'仅收录公版古籍原文及篇章组织，不导入现代翻译或注释。保留项目 MIT 声明。'},
 {id:'unicode-17',name:'Unicode 17.0 Unihan 字形及普通话字段',url:'https://github.com/unicode-org/unicodetools',commit:UNICODE,license:'Unicode-3.0',files:sourceFiles.unicode.map(f=>'data/raw/'+f),sha256:aggregate(sourceFiles.unicode),note:'读音 kMandarin、普通笔画 kTotalStrokes、简繁异体字段；不冒充中文辞书或康熙笔画。原字段的范围压缩展开成逐字记录。'},
 {id:'wiktionary-zh',name:'中文维基词典贡献者，经 Kaikki/Wiktextract 提取',url:'https://zh.wiktionary.org/',commit:`wiktextract@${WIKTEXTRACT};snapshot-sha256:${lock['zhwiktionary-Chinese.jsonl.gz'].sha256}`,license:'CC-BY-SA-4.0',files:sourceFiles.wiktionary.map(f=>'data/raw/'+f).concat(['data/character-review.json']),sha256:aggregate(sourceFiles.wiktionary),note:'中文义项逐条摘录自中文维基词典汉语提取包；每字原页面链接见 character-review.json。原文贡献者通过词条历史署名；字典提取与筛选修改部分按 CC BY-SA 4.0 提供。本源无 Git 提交，按下载快照SHA固定，提取器代码另固定Git提交。'},
 {id:'moe-revised',name:'中华民国教育部《重编国语辞典修订本》，g0v 原文格式转换',url:'https://github.com/g0v/moedict-data',commit:MOE,license:'CC-BY-ND-3.0-TW (verbatim definition text; format conversion allowed)',files:sourceFiles.moe.map(f=>'data/raw/'+f).concat(['data/character-review.json']),sha256:aggregate(sourceFiles.moe),note:'版权为教育部所有，策划执行国家教育研究院。按上游 README 转述教育部解释，禁止改作仅限文字本身，不限制格式转换与后续应用。本项目使用固定版本 dict-revised_bkup.json 的释义原文，不改写、翻译或将其重新授权为 CC BY-SA。原始完整辞典压缩保留；转换格式的编辑权由上游 kcwu 以 CC0 释出。'},
 {id:'editorial-rules',name:'项目整理：传统基础表与现代命名说明',url:'local:data/naming-editorial.json',commit:editorial.version,license:'CC0-1.0 (project-authored tables and labels only)',files:['scripts/build-data.mjs','scripts/editorial-citation-validation.mjs','data/naming-characters.txt','data/naming-editorial.json','data/character-review.json'],sha256:sha(Buffer.concat([fs.readFileSync(fileURLToPath(import.meta.url)),fs.readFileSync(path.join(ROOT,'scripts/editorial-citation-validation.mjs')),fs.readFileSync(path.join(DATA,'naming-editorial.json'))])),note:'项目自编八卦九宫、天干地支、五行、生肖和奇门基础说明、字形意象标签、命名选义及逐条上下文引文选用说明；传统分类不是科学预测。字典文字原文另行保留；命名意象不是字典引文或专家认证。'}
];
const dataset={version:VERSION,characters,citations,knowledge,sources};
const editorialCitationChecks=validateEditorialCitations(editorial,dataset);
atomic(path.join(DATA,'character-review.json'),JSON.stringify({version:VERSION,policy:'Source-backed automated verification of a curated shortlist; not a claim of independent expert review of every traditional judgement.',included:characters.length,excluded:charReview.filter(r=>r.status==='excluded').length,records:charReview},null,2)+'\n');
for(const [label,rows]of Object.entries({characters,citations,knowledge,sources})){
 const ids=rows.map(r=>label==='characters'?r.char:r.id);if(new Set(ids).size!==rows.length)throw new Error(`Duplicate ${label} identifier`);
 if(label!=='sources'&&rows.some(r=>!sources.some(s=>s.id===r.sourceId)))throw new Error(`Unknown source in ${label}`);
}
atomic(path.join(DATA,'dataset.json'),JSON.stringify(dataset,null,2)+'\n');
const initSqlJs=(await import('sql.js')).default;
const SQL=await initSqlJs({locateFile:f=>path.join(ROOT,'node_modules/sql.js/dist',f)});
const db=new SQL.Database();
for(const [table,rows]of Object.entries({characters,citations,knowledge,sources})){
 db.run(`CREATE TABLE ${table} (id TEXT PRIMARY KEY, json TEXT NOT NULL)`);
 const stmt=db.prepare(`INSERT INTO ${table} (id,json) VALUES (?,?)`);
 db.run('BEGIN');for(const row of rows)stmt.run([table==='characters'?row.char:row.id,JSON.stringify(row)]);db.run('COMMIT');stmt.free();
}
db.run('CREATE TABLE metadata (id TEXT PRIMARY KEY, json TEXT NOT NULL)');
db.run('INSERT INTO metadata VALUES (?,?)',['version',JSON.stringify({version:VERSION})]);
const sqlite=db.export();db.close();atomic(path.join(DATA,'knowledge.sqlite'),sqlite);
const glossMatchesRaw=c=>{
 const review=charReview.find(r=>r.char===c.char);
 const original=review?.sourceId==='moe-revised'?(moe.get(review.glossWord)?.heteronyms||[]).flatMap(h=>(h.definitions||[]).map(d=>d.def)):[c.char,...traditionalCandidates(c.char)].flatMap(ch=>dictionary.get(ch)||[]).flatMap(e=>(e.senses||[]).flatMap(s=>s.glosses||[]));
 return review?.glosses?.join('；')===c.meaning&&review.glosses.every(g=>original.includes(g));
};
const readingMatchesRaw=reading=>{
  if(reading.sourceId!=='moe-revised')return true;
  const original=moe.get(reading.word);return original?.heteronyms?.some((h,index)=>cleanPinyin(h.pinyin)===reading.pinyin&&reading.meanings.every(g=>moeReadingDefinitions(original.heteronyms,index).includes(g)));
};
const verifiedEditorialCitations=editorialCitationChecks.canonicalIdentitiesMatched&&editorialCitationChecks.excerptsAndReadingsMatched;
const verification={version:VERSION,characters:characters.length,citations:citations.length,knowledge:knowledge.length,sources:sources.length,hexagrams:HEXAGRAMS.length,lineTexts:HEXAGRAMS.reduce((n,h)=>n+h.yaoTexts.length,0),poems:poetry.length,allCharactersHaveChineseGloss:characters.every(c=>/[\u3400-\u9fff]/.test(c.meaning)),allGlossesMatchRaw:characters.every(glossMatchesRaw),allReadingsMatchSource:characters.every(c=>c.readings.every(readingMatchesRaw)),allDefaultReadingsMatchGloss:characters.every(c=>c.readings.some(r=>r.pinyin===c.pinyin&&charReview.find(review=>review.char===c.char).glosses.every(g=>r.meanings.includes(g)))),allEditorialCitationsMatchSource:verifiedEditorialCitations,editorialCitationChecks,reviewedCitationRules:editorial.citations.length,polyphonicCharacters:characters.filter(c=>c.polyphonic).length,allCharactersHavePinyin:characters.every(c=>c.pinyin&&c.tone>=1&&c.tone<=5),allCharactersHaveSource:characters.every(c=>sources.some(s=>s.id===c.sourceId)),allCharactersHaveRadical:characters.every(c=>c.radical),sourceCounts:Object.fromEntries(sources.map(s=>[s.id,characters.filter(c=>c.sourceId===s.id).length])),sha256:{json:sha(fs.readFileSync(path.join(DATA,'dataset.json'))),sqlite:sha(sqlite)},expertReviewStatus:'Source-field and structure checks passed. Individual cultural-name suitability and school-specific rules remain subject to explicit reviewer judgement; no expert certification is asserted.'};
if(!verification.allGlossesMatchRaw||!verification.allReadingsMatchSource||!verification.allDefaultReadingsMatchGloss||!verifiedEditorialCitations||!verification.allCharactersHavePinyin||!verification.allCharactersHaveSource||!verification.allCharactersHaveRadical)throw new Error('Source verification failed; do not distribute this dataset.');
atomic(path.join(DATA,'build-verification.json'),JSON.stringify(verification,null,2)+'\n');
if(reproducibilityBefore){
 const report={command:'node scripts/build-data.mjs --offline --reproducibility-check',networkUsed:!process.argv.includes('--offline'),before:reproducibilityBefore,after:verification.sha256,identical:reproducibilityBefore.json===verification.sha256.json&&reproducibilityBefore.sqlite===verification.sha256.sqlite};
 atomic(path.join(DATA,'reproducibility-verification.json'),JSON.stringify(report,null,2)+'\n');if(!report.identical)throw new Error('Reproducibility check failed: outputs differ from the previous build.');
}
for(const filename of walk(RAW).filter(f=>!f.endsWith('.tmp')))fs.chmodSync(filename,0o444);
console.log(JSON.stringify(verification,null,2));
