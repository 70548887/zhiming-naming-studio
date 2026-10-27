import {describe,it,expect,afterEach} from 'vitest';
import {readFileSync,writeFileSync,copyFileSync,mkdirSync,mkdtempSync,rmSync,chmodSync} from 'node:fs';
import {join,resolve,dirname,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {loadClassicsData,loadClassicsSources,classicBookContents,classicBookSummaries,searchClassicsData,readClassicSectionData,CLASSICS_SOURCE_IDS} from '../src/main/classics-data';

const dataDirectory=resolve('data'),data=loadClassicsData(dataDirectory),hash=(value:string|Uint8Array)=>createHash('sha256').update(value).digest('hex');
const originals=data.books.map(book=>readFileSync(join(dataDirectory,book.summary.id==='classic-ditian-2600158'?'raw/classics-ditian-2600158.wiki':'raw/classics-qiongtong-2294674.wiki'),'utf8'));
const temporary:string[]=[];
afterEach(()=>{for(const file of temporary.splice(0)){if(dirname(file)!==resolve(tmpdir())||!basename(file).startsWith('naming-classics-'))throw new Error('Unsafe test cleanup path');rmSync(file,{recursive:true,force:true});}});
function copyPublication(){const directory=mkdtempSync(join(tmpdir(),'naming-classics-'));temporary.push(directory);const lock=JSON.parse(readFileSync(join(dataDirectory,'classics-source-lock.json'),'utf8')),files=new Set<string>(['data/classics-catalog.json','data/classics-source-lock.json',...lock.sources.flatMap((source:any)=>source.files)]);for(const file of files){const target=join(directory,file.slice(5));mkdirSync(dirname(target),{recursive:true});copyFileSync(join(dataDirectory,file.slice(5)),target);}return directory;}

describe('fixed complete classical-text library',()=>{
 it('keeps both independent whole-source publications and their exact original identities',()=>{
  expect(data.books.map(book=>[book.summary.id,book.summary.revision,book.summary.codepoints,book.summary.sectionCount])).toEqual([['classic-ditian-2600158','2600158',143701,66],['classic-qiongtong-2294674','2294674',36746,57]]);
  expect(originals.map(hash)).toEqual(['1d1a3d61c1b9a26618b41b8ead857a6b966992fdf2adabdc607a0c6cb4c8f04d','8ba17242f116583de2e10172e006f5ce5f74b23ccfc0bd24b886be135e9f20bd']);expect(originals.some(text=>text.includes('\uFFFD'))).toBe(false);
  expect(loadClassicsSources(dataDirectory).map(source=>source.id)).toEqual([...CLASSICS_SOURCE_IDS]);expect(data.sources.every(source=>source.license==='CC-BY-SA-4.0')).toBe(true);
 });
 it('reconstructs every original codepoint from consecutive sections including both frontmatters and tails',()=>{
  for(const [index,contents]of classicBookContents(data).entries()){
   let end=0,reconstructed='';expect(contents.sections[0].kind).toBe('frontmatter');expect(contents.sections[1].path).not.toContain('卷首与页面元信息');
   for(const [position,section]of contents.sections.entries()){
    const actual=readClassicSectionData(data,section.id);expect(actual.start).toBe(end);expect(actual.end).toBeGreaterThan(actual.start);expect(hash(actual.rawText)).toBe(section.sha256);expect(actual.previousSectionId).toBe(contents.sections[position-1]?.id);expect(actual.nextSectionId).toBe(contents.sections[position+1]?.id);end=actual.end;reconstructed+=actual.rawText;
   }expect(end).toBe(contents.book.codepoints);expect(reconstructed).toBe(originals[index]);
  }
 });
 it('finds known original content in its original author-neutral chapter path and exact coordinates',()=>{
  const result=searchClassicsData(data,'欲识三元万法宗','classic-ditian-2600158',1);expect(result.total).toBe(1);expect(result.pageSize).toBe(20);expect(result.hits[0].sectionPath).toEqual(['通神论','一、天道']);expect(result.hits[0].matchedOriginal).toBe('欲识三元万法宗');
  const hit=result.hits[0];expect([...originals[0]].slice(hit.sourceStart,hit.sourceEnd).join('')).toBe(hit.matchedOriginal);expect([...originals[0]].slice(hit.excerptStart,hit.excerptEnd).join('')).toBe(hit.rawExcerpt);expect(hit.usage).toBe('source-text-only');
 });
 it('preserves all nine unresolved PUA glyphs and returns their exact source-codepoint flags',()=>{
  const book=classicBookSummaries(data)[1];expect(book.quality.privateUseCount).toBe(9);expect(book.quality.scanCollation).toBe(false);expect(book.quality.note).toContain('不猜字修文');
  const first=searchClassicsData(data,'{{PUA|','classic-qiongtong-2294674');expect(first.total).toBe(9);expect(first.hits).toHaveLength(9);expect(first.hits.every(hit=>hit.quality.privateUseCharacters.length>0)).toBe(true);
  for(const hit of first.hits)for(const glyph of hit.quality.privateUseCharacters){expect([...originals[1]][glyph.offset]).toBe(glyph.character);expect(glyph.codepoint).toBe('U+'+glyph.character.codePointAt(0)!.toString(16).toUpperCase());}
 });
 it('paginates all exact matches deterministically and keeps book filters independent',()=>{
  const expected=[...originals[1]].filter(char=>char==='甲').length,first=searchClassicsData(data,'甲','classic-qiongtong-2294674',1),second=searchClassicsData(data,'甲','classic-qiongtong-2294674',2);
  expect(first.total).toBe(expected);expect(first.pageCount).toBe(Math.ceil(expected/20));expect(first.hits).toHaveLength(20);expect(second.hits).toHaveLength(20);expect(first.hits.some(hit=>second.hits.some(other=>other.id===hit.id))).toBe(false);expect(second.hits.every(hit=>hit.bookId==='classic-qiongtong-2294674')).toBe(true);
  expect(searchClassicsData(data,'甲','classic-qiongtong-2294674',first.pageCount+1).hits).toEqual([]);
 });
 it('distinguishes paginated chapter browsing from a genuine no-match result without fabricating judgements',()=>{
  const empty=searchClassicsData(data,'   '),missing=searchClassicsData(data,'原典无此片段ABCxyz');expect(empty.books).toHaveLength(2);expect(empty.total).toBe(123);expect(empty.pageCount).toBe(7);expect(empty.hits).toHaveLength(20);expect(empty.hits[0].sectionTitle).toBe('卷首与页面元信息');expect(empty.hits.every(hit=>hit.sourceStart===hit.sourceEnd&&hit.matchedOriginal==='')).toBe(true);expect(missing.total).toBe(0);expect(missing.searchMode).toBe('literal-original-text');expect(missing.notice).toContain('不等于');
  expect(searchClassicsData(data,'  欲识三元万法宗  ').query).toBe('欲识三元万法宗');expect(searchClassicsData(data,'🀄'.repeat(200)).total).toBe(0);
 });
 it('keeps the final catalogue page, book filter and consecutive-section navigation complete',()=>{
  const final=searchClassicsData(data,'',undefined,7),filtered=searchClassicsData(data,'','classic-qiongtong-2294674',3);expect(final.hits).toHaveLength(3);expect(filtered.total).toBe(57);expect(filtered.hits).toHaveLength(17);expect(filtered.hits.every(hit=>hit.bookId==='classic-qiongtong-2294674')).toBe(true);expect(final.hits.at(-1)?.sectionId).toBe(classicBookContents(data)[1].sections.at(-1)?.id);expect(searchClassicsData(data,'',undefined,8).hits).toEqual([]);
 });
 it('counts overlapping occurrences and supplementary Unicode positions without confusing UTF16 units',()=>{
  const rawText='𠀀哈哈哈𠀀甲',characters=[...rawText],book={...data.books[0],rawText,characters,sections:[{...data.books[0].sections[0],start:0,end:characters.length}],privateUseCharacters:[]},fixture={version:data.version,books:[book],sources:data.sources};
  const repeated=searchClassicsData(fixture,'哈哈');expect(repeated.total).toBe(2);expect(repeated.hits.map(hit=>[hit.sourceStart,hit.sourceEnd])).toEqual([[1,3],[2,4]]);expect(new Set(repeated.hits.map(hit=>hit.sectionId)).size).toBe(1);
  const nonBmp=searchClassicsData(fixture,'𠀀');expect(nonBmp.hits.map(hit=>[hit.sourceStart,hit.sourceEnd])).toEqual([[0,1],[4,5]]);expect(nonBmp.hits.every(hit=>hit.matchedOriginal==='𠀀')).toBe(true);expect(()=>searchClassicsData(fixture,'\uD840')).toThrow(/不完整Unicode/);expect(()=>searchClassicsData(fixture,'\uDC00')).toThrow(/不完整Unicode/);expect(()=>searchClassicsData(fixture,'甲\uD840乙')).toThrow(/不完整Unicode/);
 });
 it.each([0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER])('rejects invalid or unsafe page %s',page=>{expect(()=>searchClassicsData(data,'甲',undefined,page)).toThrow(/页码/);});
 it('rejects oversized queries, wrong query types, unknown book and section identities',()=>{
  expect(()=>searchClassicsData(data,'甲'.repeat(201))).toThrow(/未截断/);expect(()=>searchClassicsData(data,null as any)).toThrow(/检索词/);expect(()=>searchClassicsData(data,'甲','missing' as any)).toThrow(/古籍不存在/);expect(()=>searchClassicsData(data,'甲',null as any)).toThrow(/古籍不存在/);expect(()=>readClassicSectionData(data,'missing')).toThrow(/章节不存在/);expect(()=>readClassicSectionData(data,null as any)).toThrow(/章节编号/);
 });
 it('reports an input correction without implying that the immutable publication is damaged',()=>{
  expect(()=>searchClassicsData(data,'甲'.repeat(201))).toThrow(/^检索词最多200/u);
  expect(()=>searchClassicsData(data,'甲',undefined,0)).toThrow(/^页码须为/u);
  expect(()=>readClassicSectionData(data,null as any)).toThrow(/^章节编号无效/u);
 });
 it('returns source text and wikitext as data, retaining original annotation and exact source links',()=>{
  const result=searchClassicsData(data,'<onlyinclude>','classic-ditian-2600158');expect(result.total).toBe(1);expect(result.hits[0].rawExcerpt).toContain('<onlyinclude>');expect(result.hits[0].source.url).toContain('oldid=2600158');expect(result.hits[0].source.id).toBe(CLASSICS_SOURCE_IDS[0]);expect(result.hits[0].quality.originalTranscription).toBe(true);
  const section=readClassicSectionData(data,searchClassicsData(data,'任氏曰','classic-ditian-2600158').hits[0].sectionId);expect(section.rawText).toContain('{{annotate|任氏曰');expect(section.rawText).toContain('{{*|原注');
 });
 it('does not let returned catalogues, sections or hit metadata mutate the loaded publication',()=>{
  const contents=classicBookContents(data);contents[0].sections[1].path.push('corrupted');contents[0].book.aliases.push('corrupted');const query=searchClassicsData(data,'任氏曰');query.hits[0].source.note='corrupted';const section=readClassicSectionData(data,contents[0].sections[1].id);section.source.note='corrupted';
  expect(classicBookContents(data)[0].sections[1].path).not.toContain('corrupted');expect(classicBookSummaries(data)[0].aliases).not.toContain('corrupted');expect(searchClassicsData(data,'任氏曰').hits[0].source.note).not.toBe('corrupted');
 });
 it.each(['classics-catalog.json','classics-source-lock.json','classics/ditian-2600158-index.json','classics/qiongtong-2294674-index.json','raw/classics-ditian-2600158.wiki','raw/classics-qiongtong-2294674.wiki','raw/classics-ditian-2600158-NOTICE.md','raw/classics-qiongtong-2294674-NOTICE.md','raw/CC-BY-SA-4.0.txt'])('rejects modified immutable source, index or attribution %s',file=>{
  const directory=copyPublication(),target=join(directory,file);chmodSync(target,0o600);writeFileSync(target,Buffer.concat([readFileSync(target),Buffer.from(' ')]));expect(()=>loadClassicsData(directory)).toThrow();
 });
 it('keeps all298 existing fixed excerpt spans unchanged in the new complete library',()=>{
  const files=['ditian-ren-excerpts.json','ren-necessary-excerpts.json','ren-actions-excerpts.json','ren-capacities-excerpts.json','ren-directions-excerpts.json','cong-wealth-qiongtong-excerpts.json','cong-sha-qiongtong-excerpts.json'];let count=0;
  for(const file of files){const source=[...originals[file.includes('qiongtong')?1:0]];const visit=(value:any)=>{if(!value||typeof value!=='object')return;const quote=value.sourceQuote??value.quote,locator=value.sourceLocator??value.locator,match=typeof locator==='string'?/codepoint\[(\d+),(\d+)\)/u.exec(locator):null,start=value.sourceSpan?.start??value.start??(match?Number(match[1]):undefined),end=value.sourceSpan?.end??value.end??(match?Number(match[2]):undefined);if(typeof quote==='string'&&Number.isSafeInteger(start)&&Number.isSafeInteger(end)){expect(source.slice(start,end).join('')).toBe(quote);count++;}for(const child of Object.values(value))if(child&&typeof child==='object')visit(child);};visit(JSON.parse(readFileSync(join(dataDirectory,'raw',file),'utf8')));
  }expect(count).toBe(298);
 });
});
