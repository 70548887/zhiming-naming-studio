import {describe,it,expect,vi} from 'vitest';
import {resolve} from 'node:path';
import {loadClassicsData,searchClassicsData,type ClassicsData} from '../src/main/classics-data';
import * as reading from '../src/shared/classics-reading';

const data=loadClassicsData(resolve('data'));
function fixture(rawText:string):ClassicsData{const characters=[...rawText],book={...data.books[0],rawText,characters,sections:[{...data.books[0].sections[0],start:0,end:characters.length}],privateUseCharacters:[]};return {version:data.version,books:[book],sources:data.sources};}
describe('readable search-card excerpts from complete source sections',()=>{
 it('provides a readable real-book catalogue without altering the original Header excerpt',()=>{
  const entry=searchClassicsData(data,'').hits[0];expect(entry.rawExcerpt).toContain('{{Header');expect(entry.readingExcerpt).not.toContain('{{Header');expect(entry.readingExcerpt).toContain('滴天髓闡微');expect(entry.readingExcerpt).toContain('任鐵樵');expect(entry.matchedOriginal).toBe('');expect(entry.sourceStart).toBe(0);expect(entry.sourceEnd).toBe(0);
 });
 it('leaves an empty real Header reading empty so UI fallback cannot be mistaken for source prose',()=>{
  const entry=searchClassicsData(data,'','classic-qiongtong-2294674').hits[0];expect(entry.rawExcerpt).toContain('{{header');expect(entry.readingExcerpt).toBe('');expect(entry.readingExcerpt).not.toContain('书目信息');
 });
 it('strips complete known formatting before cropping an unclosed raw template fragment',()=>{
  const source='{{annotate|任氏曰：关键词'+('甲乙'.repeat(400))+'}}',entry=searchClassicsData(fixture(source),'关键词').hits[0];expect(entry.rawExcerpt).toContain('{{annotate|');expect(entry.rawExcerpt).not.toContain('}}');expect(entry.readingExcerpt).toContain('任氏曰：关键词');expect(entry.readingExcerpt).not.toContain('{{annotate');expect(entry.matchedOriginal).toBe('关键词');expect([...source].slice(entry.sourceStart,entry.sourceEnd).join('')).toBe('关键词');
 });
 it('crops around a late mapped keyword in a long complete annotation rather than the beginning of its chapter',()=>{
  const source='{{annotate|'+('甲'.repeat(600))+'定位词'+('乙'.repeat(400))+'}}',entry=searchClassicsData(fixture(source),'定位词').hits[0];expect(entry.readingExcerpt).toBe('甲'.repeat(90)+'定位词'+'乙'.repeat(120));expect(entry.rawExcerpt).toBe('甲'.repeat(90)+'定位词'+'乙'.repeat(120));
 });
 it('preserves supplementary and PUA source characters and their original match codepoints',()=>{
  const source='{{annotate|𠮷原字\ue10f关键词}}',entry=searchClassicsData(fixture(source),'\ue10f关键词').hits[0];expect(entry.readingExcerpt).toBe('𠮷原字\ue10f关键词');expect([entry.sourceStart,entry.sourceEnd]).toEqual([14,18]);expect(entry.matchedOriginal).toBe('\ue10f关键词');
 });
 it('keeps syntax-only hits source-identifiable while offering the complete section reading',()=>{
  const source='{{annotate|任氏曰：原文字词}}',entry=searchClassicsData(fixture(source),'annotate').hits[0];expect(entry.matchedOriginal).toBe('annotate');expect(entry.rawExcerpt).toBe(source);expect(entry.readingExcerpt).toBe('任氏曰：原文字词');
 });
 it('does not erase an unknown complete template to manufacture cleaner source text',()=>{
  const source='{{未识别|原文字词}}',entry=searchClassicsData(fixture(source),'原文字词').hits[0];expect(entry.readingExcerpt).toBe(source);expect(entry.rawExcerpt).toBe(source);
 });
 it('parses one complete section once for many search hits and subsequent searches',()=>{
  const spy=vi.spyOn(reading,'parseClassicReading'),source='{{annotate|'+('甲乙'.repeat(200))+'}}',value=fixture(source);
  try{expect(searchClassicsData(value,'甲').hits).toHaveLength(20);expect(searchClassicsData(value,'乙').hits).toHaveLength(20);expect(spy).toHaveBeenCalledTimes(1);expect(spy).toHaveBeenCalledWith(source,0);}finally{spy.mockRestore();}
 });
});
