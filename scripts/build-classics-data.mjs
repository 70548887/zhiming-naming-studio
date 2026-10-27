import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const BOOKS=[
 {id:'classic-ditian-2600158',short:'ditian-2600158',title:'滴天髓闡微',aliases:['滴天髓阐微'],revision:'2600158',rawSha256:'1d1a3d61c1b9a26618b41b8ead857a6b966992fdf2adabdc607a0c6cb4c8f04d',codepoints:143701,headings:65,url:'https://zh.wikisource.org/w/index.php?title=滴天髓闡微&oldid=2600158',history:'https://zh.wikisource.org/w/index.php?title=滴天髓闡微&action=history'},
 {id:'classic-qiongtong-2294674',short:'qiongtong-2294674',title:'穷通宝鉴',aliases:['窮通寶鑑','窮通寶鑒'],revision:'2294674',rawSha256:'8ba17242f116583de2e10172e006f5ce5f74b23ccfc0bd24b886be135e9f20bd',codepoints:36746,headings:56,url:'https://zh.wikisource.org/w/index.php?title=穷通宝鉴&oldid=2294674',history:'https://zh.wikisource.org/w/index.php?title=穷通宝鉴&action=history'}
];
const bytes=value=>Buffer.from(typeof value==='string'?value:JSON.stringify(value,null,2)+'\n','utf8');
/** Pure derivation from the two tracked fixed raw originals and the existing licence; never fetches or repairs source text. */
export function buildClassicArtifacts(root=process.cwd()){
 const outputs=new Map(),inputs=[],sources=[],catalogBooks=[];const put=(file,value)=>{const valueBytes=bytes(value);outputs.set(file,valueBytes);return digest(valueBytes);};
 const licenseFile='data/raw/CC-BY-SA-4.0.txt',license=fs.readFileSync(path.join(root,licenseFile));assert.equal(digest(license),'28a9529c7d0bb4dc51f4bf5c116a3d16ef247a052f7591466768ddf563fd1cf5','Fixed complete licence changed');inputs.push({path:licenseFile,sha256:digest(license),bytes:license.length});
 for(const book of BOOKS){
  const sourceId='classics-'+book.short+'-fixed',rawFile='data/raw/classics-'+book.short+'.wiki',indexFile='data/classics/'+book.short+'-index.json',noticeFile='data/raw/classics-'+book.short+'-NOTICE.md',raw=fs.readFileSync(path.join(root,rawFile)),text=raw.toString('utf8'),chars=[...text];
  assert.equal(digest(raw),book.rawSha256,'Fixed raw source changed: '+rawFile);assert(Buffer.from(text,'utf8').equals(raw),'Lossless UTF8 raw source required');assert.equal(chars.length,book.codepoints);inputs.push({path:rawFile,sha256:digest(raw),bytes:raw.length});
  const headings=[...text.matchAll(/^(={1,6})[ \t]*([^\r\n]*?)[ \t]*\1[ \t]*\r?$/gmu)].map(match=>({start:[...text.slice(0,match.index)].length,level:match[1].length,title:match[2].trim()}));assert.equal(headings.length,book.headings,'All fixed headings required');
  const rows=[{start:0,level:0,title:'卷首与页面元信息'},...headings],stack=[],sections=rows.map((section,index)=>{
   const start=section.start,end=rows[index+1]?.start??chars.length,id=book.id+':section:'+start,sha256=digest(chars.slice(start,end).join(''));
   if(index===0)return {id,bookId:book.id,title:section.title,headingLevel:0,path:[section.title],start,end,sha256,kind:'frontmatter',nextSectionId:book.id+':section:'+rows[1].start};
   while(stack.length&&stack.at(-1).level>=section.level)stack.pop();stack.push({level:section.level,title:section.title});return {id,bookId:book.id,title:section.title,headingLevel:section.level,path:stack.map(row=>row.title),start,end,sha256,kind:'section',previousSectionId:book.id+':section:'+rows[index-1].start,...(rows[index+1]?{nextSectionId:book.id+':section:'+rows[index+1].start}:{})};
  });assert.equal(sections.map(section=>chars.slice(section.start,section.end).join('')).join(''),text,'Complete consecutive raw coverage');
  const privateUseCharacters=[];chars.forEach((character,offset)=>{const cp=character.codePointAt(0);if(cp>=0xe000&&cp<=0xf8ff||cp>=0xf0000&&cp<=0xffffd||cp>=0x100000&&cp<=0x10fffd)privateUseCharacters.push({offset,codepoint:'U+'+cp.toString(16).toUpperCase(),character});});assert.equal(privateUseCharacters.length,book.short==='ditian-2600158'?0:9);
  const note=privateUseCharacters.length?'固定电子转录含9处私用区字形，保留原码点与标记，不猜字修文；未进行影印底本校勘。':'固定电子转录保留原字、标点与Wiki排版标记；未进行影印底本校勘。';
  const index={version:'classics-section-index/1.0.0',id:book.id,title:book.title,aliases:book.aliases,revision:book.revision,sourceId,rawFile,rawSha256:book.rawSha256,rawBytes:raw.length,codepoints:book.codepoints,sections,quality:{privateUseCharacters,originalTranscription:true,scanCollation:false,note},coordinateConvention:'0-based Unicode codepoints; half-open [start,end); exact original UTF8 text'};
  const indexSha256=put(indexFile,index);
  put(noticeFile,`# ${book.title}固定版全文检索资料\n\n中文维基文库贡献者转录；固定修订${book.revision}：[永久链接](${book.url})，[贡献者历史](${book.history})。本包复用已核本地原件，未重新抓取当前页面替换旧版。\n\n原始UTF-8字节SHA-256：${book.rawSha256}，${book.codepoints}个Unicode码点。整份原始wikitext逐字保留，包括卷首、标题、原注／评注模板、标点、疑字与私用区字形；不校补文字。只保证该固定电子快照完整复现，未独立审定影印底本或声明其为历史善本。${note}\n\n本项目整理内容：连续全覆盖章节索引、从0开始Unicode码点[start,end)定位、逐章节UTF-8摘要、书目与字形质量说明。全文检索和阅读是资料查阅，不自动赋予片段命名出处、有效断法、成格或喜用结论，也不改动姓名评分。\n\n原转录、节录和这些结构化整理依CC BY-SA 4.0保留署名、修改说明及相同方式共享；许可全文见同目录CC-BY-SA-4.0.txt。独立应用程序和其他资料继续各自许可。\n`);
  const files=[indexFile,rawFile,noticeFile,licenseFile].sort(),fileHashes=Object.fromEntries(files.map(file=>[file,digest(outputs.get(file)??fs.readFileSync(path.join(root,file)))]));
  sources.push({id:sourceId,name:book.title+' · 固定电子版全文与章节索引',url:book.url,commit:'wikisource-oldid/'+book.revision+';classics-fulltext/1.0.0',license:'CC-BY-SA-4.0',files,sha256:digest(JSON.stringify(fileHashes)),note:'仅供离线原典全文检索与阅读；固定电子转录，未影印校勘，不自动作为命名出处或判格规则。',fileHashes});catalogBooks.push({id:book.id,sourceId,indexFile,indexSha256});
 }
 put('data/classics-catalog.json',{version:'classics-catalog/1.0.0',books:catalogBooks,scope:'Fixed independent full-text library; excludes naming/session evaluation and mutable knowledge packs.'});
 put('data/classics-source-lock.json',{version:'classics-fulltext/1.0.0',hashConvention:'sha256(JSON.stringify(fileHashes)); sorted relative path keys',sources});return {outputs,inputs};
}
export function verifyClassicArtifacts(root=process.cwd()){
 const {outputs,inputs}=buildClassicArtifacts(root),files=[];for(const [file,expected]of outputs){const actual=fs.readFileSync(path.join(root,file));assert(actual.equals(expected),'Classics deterministic rebuild differs: '+file);files.push({path:file,bytes:actual.length,sha256:digest(actual),byteEqual:true});}return {passed:true,mode:'offline-deterministic-verify',books:2,sections:123,sourceCodepoints:180447,inputs,files,writes:0,networkRequests:0};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert(process.argv.slice(2).every(argument=>argument==='--verify')&&process.argv.slice(2).length<=1,'Usage: node scripts/build-classics-data.mjs [--verify]');
 if(process.argv.includes('--verify'))console.log(JSON.stringify(verifyClassicArtifacts()));
 else{const {outputs}=buildClassicArtifacts();let written=0;for(const [file,value]of outputs){const target=path.resolve(file);if(fs.existsSync(target)&&fs.readFileSync(target).equals(value))continue;fs.mkdirSync(path.dirname(target),{recursive:true});const temporary=target+'.'+process.pid+'.tmp';fs.writeFileSync(temporary,value);fs.renameSync(temporary,target);written++;}console.log(JSON.stringify({...verifyClassicArtifacts(),mode:'offline-deterministic-build',writes:written}));}
}
