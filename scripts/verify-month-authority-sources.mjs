/** Literal source extraction and independent table-boundary fixtures; never imports the app or calendar library. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=process.cwd(),digest=value=>crypto.createHash('sha256').update(value).digest('hex');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const assert=(test,message)=>{if(!test)throw new Error(message);};
const serial=value=>JSON.stringify(value,null,2)+'\n';
const write=(file,value)=>{const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target+'.tmp',typeof value==='string'?value:serial(value));fs.renameSync(target+'.tmp',target);};
const SOURCE_ID='bazi-month-authority-sanming-v1',COMMIT='eb3cacbf4b41a4fe8fc3c0e77e0d12b5bd17c079';
const VERSION='sanming-first-paragraph/1.0.0';
const EXCERPT='data/raw/month-authority-sanming-excerpt.md';
const LICENSE='data/raw/month-authority-sanming-LICENSE.md';
const UPSTREAM_MANIFEST='data/raw/month-authority-sanming-SOURCE_MANIFEST.json';
const ATTRIBUTION='data/raw/month-authority-ATTRIBUTION.md';
if(process.argv.includes('--archive')){
  const volume=fs.readFileSync(path.join(root,'.local/bazi-110/sanming-markdown-volume2.md'));
  assert(digest(volume)==='c3b12dc4fab50db3b1c21cadc0f58809bf93a02579e98ca530d39efa5f75c730','Pinned original volume hash mismatch');
  const raw=volume.toString('utf8'),start=raw.indexOf('## 論人元司事'),end=raw.indexOf('\n## ',start+4);assert(start>=0&&end>start,'Missing exact source section');
  write(EXCERPT,raw.slice(start,end));
  for(const [original,target,expected] of [
    ['.local/bazi-110/sanming-markdown-LICENSE.md',LICENSE,'3d7fb0b7c5ac2f9b377edaee6a5182cfd016dc5102af279628354591132772f6'],
    ['.local/bazi-110/sanming-markdown-SOURCE_MANIFEST.json',UPSTREAM_MANIFEST,'cbb2536294fac611b6cd08a12ce235a61056be105f07bc77806949df02ea7a75']
  ]){const bytes=fs.readFileSync(path.join(root,original));assert(digest(bytes)===expected,'Pinned source metadata hash mismatch '+original);write(target,bytes.toString('utf8'));}
}

const excerpt=read(EXCERPT),paragraphs=excerpt.split(/\r?\n\r?\n/).filter(Boolean);
assert(paragraphs[0]==='## 論人元司事'&&paragraphs[1].startsWith('夫一氣渾淪'),'Unexpected source section structure');
const prose=paragraphs[1];
const monthAnchors=[
 ['寅','正月建寅'],['卯','二月建卯'],['辰','三月建辰'],['巳','四月建巳'],['午','五月建午'],['未','六月建未'],
 ['申','七月建申'],['酉','八月建酉'],['戌','九月建戌'],['亥','十月建亥'],['子','十一月建子'],['丑','十二月建丑'],
];
const literalDays={'五':5,'七':7,'一十八':18,'二十':20,'二十三':23};
const sourceLocator=(start,length)=>{assert(start>=0&&length>0,'Source quotation is not present verbatim in excerpt');return `source/juan-02.md#論人元司事; excerpt-codepoint[${[...excerpt.slice(0,start)].length},${[...excerpt.slice(0,start+length)].length})`;};
const months=monthAnchors.map(([monthBranch,anchor],index)=>{
 const start=prose.indexOf(anchor),end=index<11?prose.indexOf(monthAnchors[index+1][1]):prose.indexOf('此十二支');
 assert(start>=0&&end>start,'Missing month source quote '+monthBranch);
 const sourceQuote=prose.slice(start,end),matches=[...sourceQuote.matchAll(/(艮土|坤土|[甲乙丙丁戊己庚辛壬癸巳已][木火土金水])(?:用事|長生|墓庫)?(一十八|二十三|二十|七|五)日/g)];
 assert(matches.length>=2&&matches.length<=3,'Unexpected month segment count '+monthBranch);
 let cursor=0;
 const segments=matches.map(match=>{
  const sourceTerm=match[1],days=literalDays[match[2]],fromDay=cursor;cursor+=days;
  const normalizedStem=/^[甲乙丙丁戊己庚辛壬癸][木火土金水]$/.test(sourceTerm)?sourceTerm[0]:undefined;
  return {sourceTerm,days,fromDay,toDay:cursor,element:sourceTerm.slice(-1),...(normalizedStem?{normalizedStem}:{})};
 });
 assert(cursor===30,'First-paragraph month does not total30 '+monthBranch);
 const offset=excerpt.indexOf(sourceQuote);
 return {monthBranch,sourceQuote,sourceLocator:sourceLocator(offset,sourceQuote.length),segments};
});

// Separately transcribed anchors check every row, including deliberately unresolved earth terms.
const hand=[
 ['寅',[['艮土',5],['丙火',5],['甲木',20]]],['卯',[['甲木',7],['乙木',23]]],
 ['辰',[['乙木',7],['壬水',5],['戊土',18]]],['巳',[['戊土',7],['庚金',5],['丙火',18]]],
 ['午',[['丙火',7],['丁火',23]]],['未',[['丁火',7],['甲木',5],['巳土',18]]],
 ['申',[['坤土',5],['壬水',5],['庚金',20]]],['酉',[['庚金',7],['辛金',23]]],
 ['戌',[['辛金',7],['丙火',5],['戊土',18]]],['亥',[['戊土',5],['甲木',5],['壬水',20]]],
 ['子',[['壬水',7],['癸水',23]]],['丑',[['癸水',7],['庚金',5],['巳土',18]]],
];
for(const [branch,segments] of hand)assert(JSON.stringify(months.find(row=>row.monthBranch===branch).segments.map(segment=>[segment.sourceTerm,segment.days]))===JSON.stringify(segments),'Independent transcription mismatch '+branch);

const yujing=paragraphs.slice(2,-1).join('\n\n'),zuixingzi=paragraphs.at(-1);
assert(yujing.startsWith('正月寅')&&yujing.includes('辛二十日庚七日丁五日')&&yujing.includes('癸十八日壬五日辛三日'),'Missing divergent Yujing rows');
assert(zuixingzi.startsWith('醉醒子曰')&&zuixingzi.includes('又豈可以三五七日為限哉'),'Missing non-fixed-day reading');
const manifest=JSON.parse(read(UPSTREAM_MANIFEST)),upstream=manifest.sources.find(source=>source.revision_id===761691);
assert(upstream&&manifest.verification.independently_collated_against_scanned_original===false,'Unexpected source verification scope');
const readings=[
 {id:'yujing-alternative',title:'同章再考玉井异表',status:'comparison-only',quote:yujing,sourceLocator:sourceLocator(excerpt.indexOf(yujing),yujing.length),note:'原列次序和天数保留，不作为本版本计算表；酉20+7+5为32，子18+5+3为26，不擅自补齐或归一30，亦不自动调换原列序。'},
 {id:'zuixingzi-non-fixed-days',title:'醉醒子不以固定日限的意见',status:'comparison-only',quote:zuixingzi,sourceLocator:sourceLocator(excerpt.indexOf(zuixingzi),zuixingzi.length),note:'保留同章反对以三五七日定限的意见，与首段所选分日表并列；不能把电子表定位结果合成为唯一司令或喜用神。'},
];
const table={
 version:VERSION,sourceId:SOURCE_ID,title:'《三命通会》四库卷二“论人元司事”首段分日表（明确转录口径）',
 source:{repository:'mikkokotila/Sanming-Tongshui',commit:COMMIT,upstreamPath:'source/juan-02.md',edition:'三命通會（四庫全書本）电子转录',section:'論人元司事',permalink:upstream.permalink,contributorHistory:upstream.contributor_history},
 license:{historicalText:'Public domain historical text',transcription:'CC-BY-SA-4.0',structuredMapping:'CC-BY-SA-4.0',notice:ATTRIBUTION,fullLicense:'data/raw/CC-BY-SA-4.0.txt'},
 verification:{scanCollation:false,status:'fixed-electronic-transcription-only',note:'上游明确未与影印原页独立校勘；固定Wikisource修订无扫描Index/Page链接。Kanripo相应电子分页可对读，但不构成影印页校核，本应用未再分发其无明确许可的电子编排。'},
 policy:{id:'elapsed-24h-first-prose-no-tail-extension/1.0.0',daySeconds:86400,interval:'fromDay inclusive; toDay exclusive',tableDays:30,sourceTerms:'艮土、坤土、巳土、已土保留原文；只归土元素，不擅映射戊己天干。normalizedStem只在原词明确为十天干时提供。',actualMonth:'先按实际交节区间分段，再以距该节实际秒数除86400定位；这项时长约定属于软件，不声称原文明确采用UTC秒数。',shortMonth:'下一节前按实际区间裁切；不把30日按节长比例缩放。',longMonth:'超过第30个24小时但尚未交下一节的尾段无表项，输出未覆盖；不续尾、不折返、不取模。',unknownTime:'对实际可能瞬间区间求候选集合；跨交节分别保留月别、引用和未覆盖区间。'},
 months,readings,
 limitations:['本表是所选电子转录的首段，不等于全部传本或学派一致。','不将原词艮土/坤土/巳土更改成戊己，元素土明确不等于天干明确。','未根据表结果改变旧扶抑权重、命名排序或喜用神。','首段、玉井异表和醉醒子意见不合并成唯一司权。'],
};
const definitions=months.flatMap(month=>month.segments.map(segment=>({...segment,monthBranch:month.monthBranch})));
const fixtures=[];
for(const month of months){
 const cuts=[0,...month.segments.map(segment=>segment.toDay)];
 for(const day of cuts)for(const deltaSeconds of [-1,0,1]){
  const elapsedSeconds=day*86400+deltaSeconds;
  const selected=month.segments.find(segment=>elapsedSeconds>=segment.fromDay*86400&&elapsedSeconds<segment.toDay*86400);
  fixtures.push({id:`${month.monthBranch}-${day}d-${deltaSeconds}s`,monthBranch:month.monthBranch,elapsedSeconds,boundaryDay:day,deltaSeconds,status:selected?'covered':'outside-table',...(selected?{expected:{sourceTerm:selected.sourceTerm,element:selected.element,...(selected.normalizedStem?{normalizedStem:selected.normalizedStem}:{}),fromDay:selected.fromDay,toDay:selected.toDay}}:{}),sourceLocator:month.sourceLocator});
 }
}
const fixture={version:VERSION,method:'fixed-upstream-literal-first-prose-table-plus-manual12row-transcriptions; no application/calendar import',scope:'Software table-location boundaries only, not astronomical Jie time accuracy or traditional judgment validity.',sourceId:SOURCE_ID,commit:COMMIT,definitions,boundaries:fixtures,monthLengthCases:[
 {id:'short-month-yin',monthBranch:'寅',actualMonthSeconds:29*86400+40000,elapsedSeconds:29*86400+39999,status:'covered',expectedSourceTerm:'甲木',note:'Next Jie is exclusive; this instant remains in original30-day table.'},
 {id:'short-month-next-jie-exclusive',monthBranch:'寅',actualMonthSeconds:29*86400+40000,elapsedSeconds:29*86400+40000,status:'outside-month',note:'Must move to the next actual month before table lookup.'},
 {id:'long-month-tail-uncovered',monthBranch:'寅',actualMonthSeconds:31*86400,elapsedSeconds:30*86400+100,status:'uncovered-tail',note:'Do not extend the last source segment past30 elapsed24h days.'},
 {id:'long-month-next-jie-exclusive',monthBranch:'寅',actualMonthSeconds:31*86400,elapsedSeconds:31*86400,status:'outside-month',note:'An actual next Jie excludes the old month even if table is already uncovered.'},
 ],unresolvedTerms:[...new Set(definitions.filter(segment=>!segment.normalizedStem).map(segment=>segment.sourceTerm))]};

const source={id:SOURCE_ID,name:'三命通会四库卷二首段月令人元分日：固定电子转录',url:'https://github.com/mikkokotila/Sanming-Tongshui',commit:COMMIT,license:'原典公有领域；电子转录、转换及本项目结构化映射 CC-BY-SA-4.0',files:[EXCERPT,LICENSE,UPSTREAM_MANIFEST,ATTRIBUTION,'data/raw/CC-BY-SA-4.0.txt','data/month-authority-table.json'],note:'只节录論人元司事该节并逐字定位。固定Wikisource卷二oldid761691及贡献者历史；首段12月32段，保留艮土/坤土/巳土等原词，未映射成戊己。玉井异表和醉醒子反固定日限意见原文并列，不运行；未校勘影印原页。软件按实际24h区间定位且不延长30日尾段，不作为唯一司权或喜用判断。'};
if(process.argv.includes('--write'))write('data/month-authority-table.json',table);else assert(read('data/month-authority-table.json')===serial(table),'Structured month table differs from fixed transcription');
source.fileHashes=Object.fromEntries([...source.files].sort().map(file=>[file,digest(fs.readFileSync(path.join(root,file)))]));source.sha256=digest(JSON.stringify(source.fileHashes));
const lock={version:VERSION,hashConvention:'sha256(JSON.stringify(fileHashes)); keys sorted by relative path',sources:[source]};
if(process.argv.includes('--write')){write('data/month-authority-source-lock.json',lock);write('tests/fixtures/month-authority-examples.json',fixture);}else{
 assert(read('data/month-authority-source-lock.json')===serial(lock),'Month source manifest differs');assert(read('tests/fixtures/month-authority-examples.json')===serial(fixture),'Independent month boundary fixture differs');
}
const result={version:VERSION,sources:1,months:months.length,segments:definitions.length,boundaryCases:fixtures.length,monthLengthCases:fixture.monthLengthCases.length,unresolvedTerms:fixture.unresolvedTerms,manifestSha256:digest(read('data/month-authority-source-lock.json')),fileCount:source.files.length,scanCollation:false,independentOfApplication:true};
write('.local/bazi-111/source-verification.json',result);console.log(serial(result));
