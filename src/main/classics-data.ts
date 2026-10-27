import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import type {SourceRecord} from '../shared/types';
import type {ClassicBookId,ClassicBookSummary,ClassicBookContents,ClassicPrivateUseCharacter,ClassicSectionSummary,ClassicSection,ClassicSearchResponse,ClassicSearchHit} from '../shared/classics-types';
import {parseClassicReading,mapClassicReadingMatch,type ClassicReading} from '../shared/classics-reading';

export const CLASSICS_SOURCE_IDS=['classics-ditian-2600158-fixed','classics-qiongtong-2294674-fixed'] as const;
export const CLASSICS_DATA_VERSION='classics-fulltext/1.0.0';
const CATALOG_SHA256='ab8f1865c966ce92a65308abaf1b3ce7e488d6ff3351ec7d77837ac0bf671ed4';
const SOURCE_LOCK_SHA256='0d639eaae8c5d91ee8252627a01c2387e96745f8fe6b770f48cf67c1b9508014';
const EXPECTED=[
 {id:'classic-ditian-2600158',sourceId:CLASSICS_SOURCE_IDS[0],revision:'2600158',indexFile:'data/classics/ditian-2600158-index.json',rawSha256:'1d1a3d61c1b9a26618b41b8ead857a6b966992fdf2adabdc607a0c6cb4c8f04d',codepoints:143701,sections:66},
 {id:'classic-qiongtong-2294674',sourceId:CLASSICS_SOURCE_IDS[1],revision:'2294674',indexFile:'data/classics/qiongtong-2294674-index.json',rawSha256:'8ba17242f116583de2e10172e006f5ce5f74b23ccfc0bd24b886be135e9f20bd',codepoints:36746,sections:57}
] as const;
const hash=(value:string|Uint8Array)=>createHash('sha256').update(value).digest('hex');
function requireFact(condition:unknown,message:string):asserts condition{if(!condition)throw new Error('古籍全文资料校验失败：'+message);}
function requireInput(condition:unknown,message:string):asserts condition{if(!condition)throw new Error(message);}
const object=(value:unknown):value is Record<string,any>=>!!value&&typeof value==='object'&&!Array.isArray(value);
function dataFile(directory:string,file:string):string{requireFact(typeof file==='string'&&file.startsWith('data/')&&!file.split('/').some(part=>!part||part==='.'||part==='..')&&!file.includes('\\'),'原件路径无效');return join(directory,file.slice(5));}
function frozen<T>(value:T):T{if(value&&typeof value==='object'){for(const child of Object.values(value))frozen(child);Object.freeze(value);}return value;}
interface LoadedBook {summary:ClassicBookSummary;sections:ClassicSectionSummary[];rawText:string;characters:string[];privateUseCharacters:ClassicPrivateUseCharacter[];}
export interface ClassicsData {version:typeof CLASSICS_DATA_VERSION;books:LoadedBook[];sources:SourceRecord[];}

/** A library publication is independent of mutable knowledge packs and saved naming/rule snapshots. */
export function loadClassicsData(directory:string):ClassicsData{
 const catalogBytes=readFileSync(join(directory,'classics-catalog.json')),lockBytes=readFileSync(join(directory,'classics-source-lock.json'));
 requireFact(hash(catalogBytes)===CATALOG_SHA256,'书目索引摘要不一致');requireFact(hash(lockBytes)===SOURCE_LOCK_SHA256,'固定来源锁摘要不一致');
 const catalog=JSON.parse(catalogBytes.toString('utf8')),lock=JSON.parse(lockBytes.toString('utf8'));
 requireFact(catalog.version==='classics-catalog/1.0.0'&&Array.isArray(catalog.books)&&catalog.books.length===2,'书目版本或数量无效');
 requireFact(lock.version===CLASSICS_DATA_VERSION&&Array.isArray(lock.sources)&&lock.sources.length===2,'来源版本或数量无效');
 const sources:SourceRecord[]=lock.sources.map((source:any,index:number)=>{
  requireFact(object(source)&&source.id===CLASSICS_SOURCE_IDS[index]&&Array.isArray(source.files)&&object(source.fileHashes),'书目来源身份无效');
  requireFact(isDeepStrictEqual(source.files,[...source.files].sort())&&new Set(source.files).size===source.files.length&&isDeepStrictEqual(Object.keys(source.fileHashes),source.files),'来源原件清单无效');
  const actual:Record<string,string>={};for(const file of source.files){const bytes=readFileSync(dataFile(directory,file));actual[file]=hash(bytes);requireFact(actual[file]===source.fileHashes[file],'原件或许可摘要不一致：'+file);}
  requireFact(hash(JSON.stringify(actual))===source.sha256,'来源汇总摘要不一致');const {id,name,url,commit,license,files,sha256,note}=source;return {id,name,url,commit,license,files:[...files],sha256,note};
 });
 const books:LoadedBook[]=EXPECTED.map((expected,index)=>{
  const listed=catalog.books[index];requireFact(listed.id===expected.id&&listed.sourceId===expected.sourceId&&listed.indexFile===expected.indexFile,'固定书目映射无效');
  const indexBytes=readFileSync(dataFile(directory,listed.indexFile));requireFact(hash(indexBytes)===listed.indexSha256,'章节索引摘要不一致');const item=JSON.parse(indexBytes.toString('utf8'));
  requireFact(item.version==='classics-section-index/1.0.0'&&item.id===expected.id&&item.sourceId===expected.sourceId&&item.revision===expected.revision,'章节索引身份无效');
  const raw=readFileSync(dataFile(directory,item.rawFile)),rawText=raw.toString('utf8'),characters=[...rawText];requireFact(Buffer.from(rawText,'utf8').equals(raw),'原文不是无损UTF8');
  requireFact(hash(raw)===expected.rawSha256&&item.rawSha256===expected.rawSha256&&raw.length===item.rawBytes&&characters.length===expected.codepoints&&item.codepoints===expected.codepoints,'整本原文与固定修订不一致');
  requireFact(Array.isArray(item.sections)&&item.sections.length===expected.sections,'章节数量无效');let end=0;const stack:{level:number;title:string}[]=[];
  for(const [position,section]of item.sections.entries()){
   requireFact(section.bookId===item.id&&section.id===item.id+':section:'+section.start&&Number.isSafeInteger(section.start)&&Number.isSafeInteger(section.end)&&section.start===end&&section.end>section.start&&section.end<=characters.length,'章节未连续覆盖原文');
   const text=characters.slice(section.start,section.end).join('');requireFact(hash(text)===section.sha256,'章节原文摘要不一致');
   requireFact(section.previousSectionId===(item.sections[position-1]?.id)&&section.nextSectionId===(item.sections[position+1]?.id),'连续阅读定位无效');
   if(position===0)requireFact(section.kind==='frontmatter'&&section.headingLevel===0&&isDeepStrictEqual(section.path,[section.title]),'卷首必须保留');
   else{const firstLine=text.split(/\r?\n/u,1)[0],match=/^(={1,6})[ \t]*([^\r\n]*?)[ \t]*\1[ \t]*$/u.exec(firstLine);requireFact(match&&section.kind==='section'&&section.headingLevel===match[1].length&&section.title===match[2].trim(),'标题与原文不一致');while(stack.length&&stack[stack.length-1].level>=section.headingLevel)stack.pop();stack.push({level:section.headingLevel,title:section.title});requireFact(isDeepStrictEqual(section.path,stack.map(row=>row.title)),'章节层级不一致');}
   end=section.end;
  }
  requireFact(end===characters.length,'原文尾部遗漏');
  const privateUseCharacters:ClassicPrivateUseCharacter[]=[];characters.forEach((character,offset)=>{const cp=character.codePointAt(0)!;if(cp>=0xe000&&cp<=0xf8ff||cp>=0xf0000&&cp<=0xffffd||cp>=0x100000&&cp<=0x10fffd)privateUseCharacters.push({offset,codepoint:'U+'+cp.toString(16).toUpperCase(),character});});
  requireFact(object(item.quality)&&item.quality.originalTranscription===true&&item.quality.scanCollation===false&&isDeepStrictEqual(item.quality.privateUseCharacters,privateUseCharacters),'原字质量标记无效');
  const summary:ClassicBookSummary={id:item.id,title:item.title,aliases:[...item.aliases],revision:item.revision,source:sources[index],codepoints:item.codepoints,rawSha256:item.rawSha256,sectionCount:item.sections.length,quality:{privateUseCount:privateUseCharacters.length,originalTranscription:true,scanCollation:false,note:item.quality.note}};
  return {summary,sections:item.sections,rawText,characters,privateUseCharacters};
 });
 return frozen<ClassicsData>({version:CLASSICS_DATA_VERSION,books,sources});
}
export function loadClassicsSources(directory:string):SourceRecord[]{return structuredClone(loadClassicsData(directory).sources);}
export function classicBookSummaries(data:ClassicsData):ClassicBookSummary[]{return structuredClone(data.books.map(book=>book.summary));}
export function classicBookContents(data:ClassicsData):ClassicBookContents[]{return structuredClone(data.books.map(book=>({book:book.summary,sections:book.sections})));}
const textQuality=(book:LoadedBook,start:number,end:number)=>({privateUseCharacters:book.privateUseCharacters.filter(row=>row.offset>=start&&row.offset<end),originalTranscription:true as const,scanCollation:false as const,note:book.summary.quality.note});
// Parsed complete sections stay private to this loaded book; cropped template fragments are never parsed as complete source.
const readingCache=new WeakMap<LoadedBook,Map<string,ClassicReading>>();
function readingExcerpt(book:LoadedBook,section:ClassicSectionSummary,start=section.start,end=section.start):string{
 let cache=readingCache.get(book);if(!cache){cache=new Map();readingCache.set(book,cache);}let reading=cache.get(section.id);
 if(!reading){reading=parseClassicReading(book.characters.slice(section.start,section.end).join(''),section.start);cache.set(section.id,reading);}
 const characters=[...reading.text],mapped=mapClassicReadingMatch(reading,start,end);
 const excerptStart=mapped.length?Math.max(0,mapped[0].displayStart-90):0,excerptEnd=mapped.length?Math.min(characters.length,mapped[mapped.length-1].displayEnd+120):Math.min(characters.length,210);
 return characters.slice(excerptStart,excerptEnd).join('').trim();
}

export function searchClassicsData(data:ClassicsData,query:string,bookId?:ClassicBookId,page=1):ClassicSearchResponse{
 requireInput(typeof query==='string','检索词必须是文字');for(let index=0;index<query.length;index++){const unit=query.charCodeAt(index);if(unit>=0xd800&&unit<=0xdbff){const next=query.charCodeAt(++index);requireInput(next>=0xdc00&&next<=0xdfff,'检索词含不完整Unicode字符，请重新输入');}else requireInput(unit<0xdc00||unit>0xdfff,'检索词含不完整Unicode字符，请重新输入');}const term=query.trim();requireInput([...term].length<=200,'检索词最多200个Unicode字符，请缩短后重试；未截断检索词');
 requireInput(Number.isSafeInteger(page)&&page>=1,'页码须为从1开始的安全整数');requireInput(bookId===undefined||data.books.some(book=>book.summary.id===bookId),'所选古籍不存在');
 const hits:ClassicSearchHit[]=[],pageSize=20,first=(page-1)*pageSize;requireInput(Number.isSafeInteger(first),'页码过大');let total=0;
 if(!term){for(const book of data.books.filter(book=>bookId===undefined||book.summary.id===bookId))for(const section of book.sections){if(total>=first&&hits.length<pageSize){const excerptStart=section.start,excerptEnd=Math.min(section.end,section.start+210);hits.push({id:section.id,bookId:book.summary.id,bookTitle:book.summary.title,revision:book.summary.revision,sectionId:section.id,sectionTitle:section.title,sectionPath:[...section.path],sourceStart:section.start,sourceEnd:section.start,excerptStart,excerptEnd,matchedOriginal:'',rawExcerpt:book.characters.slice(excerptStart,excerptEnd).join(''),readingExcerpt:readingExcerpt(book,section),source:structuredClone(book.summary.source),quality:structuredClone(textQuality(book,excerptStart,excerptEnd)),usage:'source-text-only'});}total++;}}
 else for(const book of data.books.filter(book=>bookId===undefined||book.summary.id===bookId)){
  let from=0,index:number;while((index=book.rawText.indexOf(term,from))>=0){
   if(total>=first&&hits.length<pageSize){const sourceStart=[...book.rawText.slice(0,index)].length,sourceEnd=sourceStart+[...term].length,excerptStart=Math.max(0,sourceStart-90),excerptEnd=Math.min(book.characters.length,sourceEnd+120),section=book.sections.find(row=>row.start<=sourceStart&&row.end>sourceStart)!;
    hits.push({id:book.summary.id+':hit:'+sourceStart,bookId:book.summary.id,bookTitle:book.summary.title,revision:book.summary.revision,sectionId:section.id,sectionTitle:section.title,sectionPath:[...section.path],sourceStart,sourceEnd,excerptStart,excerptEnd,matchedOriginal:book.characters.slice(sourceStart,sourceEnd).join(''),rawExcerpt:book.characters.slice(excerptStart,excerptEnd).join(''),readingExcerpt:readingExcerpt(book,section,sourceStart,sourceEnd),source:structuredClone(book.summary.source),quality:structuredClone(textQuality(book,excerptStart,excerptEnd)),usage:'source-text-only'});
   }total++;from=index+1;
  }
 }
 return {query:term,...(bookId===undefined?{}:{bookId}),page,pageSize:20,total,pageCount:Math.ceil(total/pageSize),books:classicBookSummaries(data),hits,searchMode:'literal-original-text',notice:(term?'按固定原文逐字检索，简繁异写与近义词不自动替换。':'未输入关键词时按书目与章节顺序浏览，包含卷首。')+'内容为原典资料，不等于已经实现的断法或命名出处。'};
}
export function readClassicSectionData(data:ClassicsData,id:string):ClassicSection{
 requireInput(typeof id==='string'&&id.length<=200,'章节编号无效');for(const book of data.books){const section=book.sections.find(row=>row.id===id);if(section)return {...structuredClone(section),bookTitle:book.summary.title,revision:book.summary.revision,rawText:book.characters.slice(section.start,section.end).join(''),source:structuredClone(book.summary.source),quality:structuredClone(textQuality(book,section.start,section.end)),usage:'source-text-only'};}
 throw new Error('古籍章节不存在，请重新选择书目中的章节。');
}
