import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import type {ClassicSection} from '../src/shared/classics-types';
import {ClassicSectionView} from '../src/renderer/ClassicsLibrary';

const makeSection=(rawText:string):ClassicSection=>({
 id:'classic-test:section:1',bookId:'classic-ditian-2600158',bookTitle:'滴天髓闡微',revision:'2600158',title:'通神論',headingLevel:2,path:['通神論'],
 start:100,end:100+[...rawText].length,sha256:'a'.repeat(64),kind:'section',previousSectionId:'classic-test:section:0',nextSectionId:'classic-test:section:2',rawText,usage:'source-text-only',
 source:{id:'classics-ditian-2600158-fixed',name:'中文维基文库固定电子转录',url:'https://zh.wikisource.org/w/index.php?oldid=2600158',commit:'wikisource-revision/2600158',files:['data/raw/classics-ditian-2600158.wiki'],sha256:'b'.repeat(64),license:'CC BY-SA 4.0',note:'原字保留，未完成影印校勘。'},
 quality:{privateUseCharacters:[],originalTranscription:true,scanCollation:false,note:'原字保留，未完成影印校勘。'}
});
const view=(section:ClassicSection,match?:{sectionId:string;start:number;end:number},mode:'raw'|'reading'='raw')=>renderToStaticMarkup(<ClassicSectionView section={section} match={match} onRead={()=>{}} onBack={()=>{}} mode={mode} onModeChange={()=>{}}/>);

describe('original classic reader source fidelity',()=>{
 it('uses source codepoints for a hit after and including a supplementary character',()=>{
  const section=makeSection('甲𠀀乙丙');
  const html=view(section,{sectionId:section.id,start:101,end:103});
  expect(html).toMatch(/<mark[^>]*>𠀀乙<\/mark>/u);expect(html).toContain('>甲<mark');expect(html).toContain('</mark>丙</div>');
 });
 it('escapes original markup without executing it or removing it from the full text',()=>{
  const html=view(makeSection('<script>alert(1)</script>\n{{原文|甲}}'));
  expect(html).not.toContain('<script>');expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;\n{{原文|甲}}');expect(html).toContain('完整章节原文');
 });
 it('keeps private-use characters with a visible source-quality note',()=>{
  const section=makeSection('甲\uE000乙');section.quality.privateUseCharacters=[{offset:101,character:'\uE000',codepoint:'U+E000'}];
  const html=view(section);expect(html).toContain('甲\uE000乙');expect(html).toContain('本节有 1 个待校字');expect(html).toContain('U+E000');expect(html).toContain('未完成影印校勘');
 });
 it('retains an entire chapter when a match reaches its boundary and explains continuation',()=>{
  const section=makeSection('甲𠀀乙');const html=view(section,{sectionId:section.id,start:102,end:108});
  expect(html).toMatch(/<mark[^>]*>乙<\/mark>/u);expect(html).toContain('匹配内容延伸至下一节');expect(html).toContain('上一节');expect(html).toContain('下一节');
 });
 it('does not apply another chapter’s old hit to the current text',()=>{
  const section=makeSection('甲乙丙');const html=view(section,{sectionId:'other-section',start:100,end:101});
  expect(html).not.toContain('<mark');expect(html).toContain('>甲乙丙</div>');
 });
 it('keeps the exact original range, digest and fixed-source link available for review',()=>{
  const section=makeSection('原文');const html=view(section);
  expect(html).toContain('修订 2600158');expect(html).toContain(section.sha256);expect(html).toContain('第 100 至 102');expect(html).toContain('末位不含');expect(html).toContain('rel="noopener noreferrer"');expect(html).toContain('CC BY-SA 4.0');
 });
 it('offers readable annotation text while preserving a supplementary-character hit through removed wrappers',()=>{
  const section=makeSection('{{annotate|任氏曰：甲𠀀乙。}}');
  const index=[...section.rawText].indexOf('𠀀'),html=view(section,{sectionId:section.id,start:100+index,end:102+index},'reading');
  expect(html).toContain('任氏曰：甲<mark');expect(html).toMatch(/<mark[^>]*>𠀀乙<\/mark>/u);expect(html).not.toContain('{{annotate|');expect(html).toContain('原始文本');
 });
 it('explains a syntax-only match instead of inventing a visible text highlight',()=>{
  const section=makeSection('{{annotate|任氏曰：甲。}}');const html=view(section,{sectionId:section.id,start:102,end:110},'reading');
  expect(html).not.toContain('<mark');expect(html).toContain('部分匹配位于原始标记');expect(html).toContain('任氏曰：甲。');
 });
});
