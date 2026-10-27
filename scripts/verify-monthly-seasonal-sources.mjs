/** Verify curated source quotes and literal fixture expectations without importing application code. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=process.cwd(),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const assert=(test,message)=>{if(!test)throw new Error(message);};
const stable=value=>JSON.stringify(value,null,2)+'\n';
const write=(file,value)=>{const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target+'.tmp',typeof value==='string'?value:stable(value));fs.renameSync(target+'.tmp',target);};
const version='qiongtong-2294674-initial/1.0.0',sourceId='bazi-monthly-qiongtong-2294674';
const table=JSON.parse(read('data/monthly-seasonal-table.json')),editorial=JSON.parse(read('data/monthly-seasonal-editorial.json'));
const archive=JSON.parse(read('data/raw/monthly-seasonal-qiongtong-excerpts.json')),metadata=JSON.parse(read('data/raw/monthly-seasonal-qiongtong-source.json'));
assert(table.version===version&&table.sourceId===sourceId&&table.entries.length===120&&editorial.entries.length===120,'Missing120 source index');
assert(archive.chapters.length===10&&JSON.stringify(table.source)===JSON.stringify(metadata),'Source metadata mismatch');
const fragments=archive.chapters.flatMap(chapter=>chapter.excerpts);
function quoted(span,quote){
 assert(span&&span.unit==='unicode-codepoint'&&Number.isInteger(span.start)&&span.end>span.start,'Invalid codepoint locator');
 const found=fragments.find(fragment=>fragment.sourceSpan.start<=span.start&&fragment.sourceSpan.end>=span.end);
 assert(found,'Missing original source fragment '+span.start);
 assert([...found.text].slice(span.start-found.sourceSpan.start,span.end-found.sourceSpan.start).join('')===quote,'Quote differs from fixed source '+span.start);
}
for(const entry of table.entries){
 const rule=editorial.entries.find(item=>item.id===entry.id);assert(rule,'Missing editorial source selection '+entry.id);
 for(const [key,value]of Object.entries(rule))assert(JSON.stringify(entry[key])===JSON.stringify(value),'Curated selection changed '+entry.id+'/'+key);
 quoted(entry.sourceSpan,entry.sourceQuote);
 for(const use of entry.initialUses){assert(entry.reviewStatus==='initial'&&use.quote.includes(use.stem)&&entry.sourceQuote.includes(use.quote),'Use lacks a literal supporting quote '+entry.id);assert(['first','support','parallel','unranked'].includes(use.role),'Unsupported literal role');}
 for(const condition of entry.conditions){quoted(condition.sourceSpan,condition.sourceQuote);assert(Array.isArray(condition.proposedUses)&&condition.proposedUses.length===0,'Do not import a conditional recipe without source review');}
 if(entry.reviewStatus==='needs-review')assert(!entry.initialUses.length,'Pending entry has invented initial uses '+entry.id);
}
if(process.argv.includes('--source-check')){
 const raw=fs.readFileSync(path.join(root,'.local/tiaohou-112/qiongtong-revision2294674.wiki'));assert(hash(raw)===metadata.rawSha256,'Original fixed wikitext hash mismatch');const text=[...raw.toString('utf8')];
 for(const fragment of fragments)assert(text.slice(fragment.sourceSpan.start,fragment.sourceSpan.end).join('')===fragment.text,'Original wikitext fragment mismatch');
}
const required=new Set();for(const stem of [...'甲乙丙丁戊己庚辛壬癸'])for(const branch of [...'寅卯辰巳午未申酉戌亥子丑'])required.add(stem+'-'+branch);
assert(new Set(table.entries.map(entry=>entry.id)).size===120&&table.entries.every(entry=>required.has(entry.id)),'Duplicate or missing monthly case');
const needsReview=table.entries.filter(entry=>entry.reviewStatus==='needs-review').map(entry=>entry.id);
assert(JSON.stringify(needsReview)===JSON.stringify(['甲-卯','乙-午','乙-未','乙-酉','乙-丑','丙-亥','丁-午','壬-未']),'Review boundary changed without explicit audit');
// Independent manual transcription anchors, intentionally covering disagreements with modern summary tables.
const hand=[
 ['甲-寅',['丙','癸'],['unranked','unranked'],'得丙癸逢'],
 ['甲-辰',['庚','壬'],['first','support'],'先取庚金，次用壬水。'],
 ['甲-丑',['庚','丁'],['first','support'],'先用庚噼甲'],
 ['乙-酉',[],[],'在白露之后'],['乙-丑',[],[],'冬月之木'],
 ['丙-亥',[],[],'木旺宜庚，水旺宜戊，火旺用壬'],
 ['丁-寅',['庚'],['unranked'],'姑用庚金。'],
 ['丁-未',['甲','壬'],['first','support'],'专取甲木，壬水次之。'],
 ['己-申',['癸','丙','辛'],['first','support','support'],'先癸后丙，取辛辅癸。'],
 ['庚-巳',['壬','丙','戊'],['unranked','unranked','unranked'],'但非拘执先后'],
 ['辛-辰',['壬','甲'],['first','support'],'先壬后甲。'],
 ['辛-戌',['壬','甲'],['first','support'],'先壬后甲。'],
 ['壬-未',[],[],'先用辛金癸水，次用甲木'],
 ['癸-巳',['辛'],['first'],'无辛用庚'],
 ['癸-丑',['丙'],['first'],'宜丙火解冻。'],
];
for(const [id,stems,roles,phrase]of hand){const entry=table.entries.find(item=>item.id===id);assert(JSON.stringify(entry.initialUses.map(use=>use.stem))===JSON.stringify(stems),'Hand stem transcription mismatch '+id);assert(JSON.stringify(entry.initialUses.map(use=>use.role))===JSON.stringify(roles),'Hand role transcription mismatch '+id);assert(entry.sourceQuote.includes(phrase),'Hand source anchor mismatch '+id);}
const fixture={version,sourceId,method:'independent-manual-source-quote-anchors-plus-complete-curated-index; not application output',coverage:table.coverage,entries:table.entries.map(entry=>({id:entry.id,dayStem:entry.dayStem,monthBranch:entry.monthBranch,expectedStems:entry.initialUses.map(use=>use.stem),expectedRoles:entry.initialUses.map(use=>use.role),reviewStatus:entry.reviewStatus,sourceScope:entry.sourceScope,sourceLocator:entry.sourceLocator})),handAnchors:hand.map(([id,stems,roles,sourcePhrase])=>({id,stems,roles,sourcePhrase})),predicateExamples:[
 {id:'jia-hai-three-exposed',caseId:'甲-亥',facts:{exposed:['庚','丁','戊'],hidden:[],complete:true},expected:'matched'},
 {id:'jia-hai-three-exposed',caseId:'甲-亥',facts:{exposed:['庚','丁'],hidden:['戊'],complete:true},expected:'not-matched'},
 {id:'jia-chou-geng-exposed-ding-hidden',caseId:'甲-丑',facts:{exposed:['庚'],hidden:['丁'],complete:true},expected:'matched'},
 {id:'jia-chou-geng-exposed-ding-hidden',caseId:'甲-丑',facts:{exposed:['庚','丁'],hidden:[],complete:true},expected:'not-matched'},
 {id:'yi-zi-no-bing-anywhere',caseId:'乙-子',facts:{exposed:['乙','癸'],hidden:['壬','己'],complete:true},expected:'matched'},
 {id:'yi-zi-no-bing-anywhere',caseId:'乙-子',facts:{exposed:['乙','癸'],hidden:['丙'],complete:true},expected:'not-matched'},
 {id:'yi-zi-no-bing-anywhere',caseId:'乙-子',facts:{exposed:['乙','癸'],hidden:['壬'],complete:false},expected:'uncertain'},
 ]};
const files=['data/monthly-seasonal-table.json','data/monthly-seasonal-editorial.json','data/raw/monthly-seasonal-qiongtong-excerpts.json','data/raw/monthly-seasonal-qiongtong-source.json','data/raw/monthly-seasonal-ATTRIBUTION.md','data/raw/CC-BY-SA-4.0.txt'];
const source={id:sourceId,name:'穷通宝鉴维基文库2294674版：逐月初始取用与已列条件',url:metadata.url,commit:'wikisource-revision/2294674',license:'CC-BY-SA-4.0（维基文库转录、节录及结构化映射）',files,note:'固定维基文库修订及贡献者历史。120日干×月索引，112初始句转录、8待审；共享季节段明确保留。仅3条明干/支藏/全局无丙事实谓词，旺弱/成局/从化与其余条件未实现；不继承原吉凶性格等断语，不宣称完整调候、影印校勘或已核公版权利链。'};
source.fileHashes=Object.fromEntries([...files].sort().map(file=>[file,hash(fs.readFileSync(path.join(root,file)))]));source.sha256=hash(JSON.stringify(source.fileHashes));
const lock={version,hashConvention:'sha256(JSON.stringify(fileHashes)); keys sorted by relative path',sources:[source]};
if(process.argv.includes('--write')){write('data/monthly-seasonal-source-lock.json',lock);write('tests/fixtures/monthly-seasonal-examples.json',fixture);}else{
 assert(read('data/monthly-seasonal-source-lock.json')===stable(lock),'Monthly source manifest differs');assert(read('tests/fixtures/monthly-seasonal-examples.json')===stable(fixture),'Monthly independent fixture differs');
}
const result={version,indexedCases:120,initial:112,needsReview:8,excerpts:fragments.length,conditions:table.entries.reduce((sum,entry)=>sum+entry.conditions.length,0),factPredicates:3,manualAnchors:hand.length,predicateExamples:fixture.predicateExamples.length,sourceChecked:process.argv.includes('--source-check'),manifestSha256:hash(read('data/monthly-seasonal-source-lock.json'))};write('.local/bazi-112/source-verification.json',result);console.log(stable(result));
