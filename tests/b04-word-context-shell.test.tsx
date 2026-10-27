import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {describe,it,expect,vi} from 'vitest';
import {B04WordContextPanel,B04WordContextQueryView} from '../src/renderer/B04WordContextPanel';
import type {B04WordContextApi} from '../src/shared/b04-word-context';

describe('word-context manual query shell',()=>{
 it('renders two labelled inputs and an explicit query with no SSR request or write action',()=>{
  const getB04WordContextOptions=vi.fn(async()=>{throw Error('SSR must not call API');}),api:B04WordContextApi={getB04WordContextOptions};const html=renderToStaticMarkup(<B04WordContextPanel api={api}/>);
  expect(getB04WordContextOptions).not.toHaveBeenCalled();expect(html).toContain('完整词语词境查询');expect(html).toContain('查询汉字');expect(html).toContain('读音（选填）');expect(html).toContain('查询词境');expect(html).toContain('词性未知');expect(html).toContain('不形成整名结论');expect(html).not.toMatch(/保存|采用此|添加到名字|起名按钮/);
  const inputs=[...html.matchAll(/<input\b[^>]*id="([^"]+)"/g)].map(row=>row[1]);expect(inputs).toHaveLength(2);for(const id of inputs)expect(html).toContain('for="'+id+'"');
 });
 it('disables an unavailable service without manufacturing an empty or ready response',()=>{
  const html=renderToStaticMarkup(<B04WordContextPanel initialChar="渤"/>);expect(html).toContain('词境查询服务尚未接通');expect(html).toContain('value="渤"');expect(html).toMatch(/<button[^>]*disabled/);expect(html).not.toContain('当前查询未收录词境');expect(html).not.toContain('词典原文释义');
 });
 it('shows loading and an accessible retry error while keeping supplied input verbatim and escaped',()=>{
  const callbacks={onChar:vi.fn(),onPinyin:vi.fn(),onQuery:vi.fn()},loading=renderToStaticMarkup(<B04WordContextQueryView idPrefix="query" available state={{char:'渤',pinyin:'bó',phase:'loading',api:undefined}} {...callbacks}/>);expect(loading).toContain('aria-busy="true"');expect(loading).toContain('正在查询词境…');expect(loading).toMatch(/<button[^>]*disabled/);
  const error=renderToStaticMarkup(<B04WordContextQueryView idPrefix="query" available state={{char:'<svg/onload=x>',pinyin:'bó',phase:'error',api:undefined,error:'请输入一个汉字。',errorKind:'input'}} {...callbacks}/>);expect(error).toContain('role="alert"');expect(error).toContain('aria-invalid="true"');expect(error).toContain('query-error');expect(error).toContain('重试词境查询');expect(error).toContain('&lt;svg/onload=x&gt;');expect(error).not.toContain('<svg/onload=x>');
 });
});
