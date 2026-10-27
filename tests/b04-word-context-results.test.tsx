import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {describe,it,expect} from 'vitest';
import {B04WordContextResults} from '../src/renderer/B04WordContextPanel';import type {B04WordContextOptions} from '../src/shared/b04-word-context';
import availableJSON from './fixtures/b04-actual-available.json';import notCoveredJSON from './fixtures/b04-actual-not-covered.json';
import titleJSON from './fixtures/b04-actual-title.json';
const available=availableJSON as B04WordContextOptions,notCovered=notCoveredJSON as B04WordContextOptions;
const escaped=(value:string)=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#x27;');
describe('actual B04 Service DTO readonly rendering',()=>{
 it('renders complete words and original definitions with source disclosures without adopting meanings or showing internal paths',()=>{
  const before=structuredClone(available),html=renderToStaticMarkup(<B04WordContextResults result={available}/>);for(const option of available.options){expect(html).toContain(escaped(option.word));const source=option.source,definition=source.definition as {def?:string;link?:string[]};expect(typeof definition.def).toBe('string');expect(html).toContain(escaped(definition.def!));expect(html).toContain(escaped(String(source.pinyin)));expect(html).toContain(escaped(String(source.word)));for(const link of definition.link??[])expect(html).toContain(escaped(link));}
  expect(html).toContain('词性：未知');expect(html).toContain('词境参考不等于整名寓意或名字推荐');expect(html).toContain('不拆作查询字的新增单字释义');expect(html).toContain('查看词境说明与出处');expect(html).toContain('词典原文释义');expect(html).toContain('项目词境说明');expect(html).not.toMatch(/<button|<input|D:\/|E:\/|C:\/|M584|originalSha256|productionApproved|caseId|parsedEntrySha256/);expect(available).toEqual(before);
 });
 it('keeps the actual chapter-title explanation and project grammar separate from a name citation or POS claim',()=>{
  const title=titleJSON as B04WordContextOptions,before=structuredClone(title),html=renderToStaticMarkup(<B04WordContextResults result={title}/>);for(const option of title.options){expect(html).toContain(escaped(option.word));expect(html).toContain(escaped((option.source.definition as {def:string}).def));expect(html).toContain(escaped(String(option.grammar.text)));}expect(html).toContain('词性：未知');expect(html).toContain('项目词境说明');expect(html).not.toContain('词性：名词');expect(title).toEqual(before);
 });
 it('does not execute an accessor in an unknown source record or invent its definition',()=>{
  const copy=structuredClone(available);let reads=0;Object.defineProperty(copy.options[0].source,'definition',{get(){reads++;throw Error('must not run');}});const html=renderToStaticMarkup(<B04WordContextResults result={copy}/>);expect(reads).toBe(0);expect(html).toContain('本次资料未附可展示的原文释义');
 });
 it('renders a genuine not-covered result as missing coverage without inventing a definition or rejecting the character for names',()=>{
  const before=structuredClone(notCovered),html=renderToStaticMarkup(<B04WordContextResults result={notCovered}/>);expect(html).toContain('当前查询未收录词境');expect(html).toContain(escaped(notCovered.char));expect(html).toContain('未收录不表示该字没有含义');expect(html).not.toContain('词典原文释义');expect(html).not.toContain('完整词语参考</p>');expect(notCovered).toEqual(before);
 });
});
