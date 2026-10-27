import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSessionSourceSnapshot, LEGACY_SESSION_SOURCES_NOTICE } from '../shared/session-sources';
import { SessionSources } from './SessionSources';

describe('historical source registry display',()=>{
  it('shows the saved source URL, full revision and hash without consulting current sources',()=>{
    const snapshot=createSessionSourceSnapshot('old-v1',[{id:'old-source',name:'旧资料',url:'https://example.test/old',commit:'1'.repeat(40),license:'MIT',files:['old.json'],sha256:'2'.repeat(64),note:'旧版本说明'}]);
    const html=renderToStaticMarkup(<SessionSources session={{dataVersion:'old-v1',sourceSnapshot:snapshot}}/>);
    expect(html).toContain('生成时资料来源');expect(html).toContain('方案数据版本：old-v1');expect(html).toContain('https://example.test/old');expect(html).toContain('1'.repeat(40));expect(html).toContain('2'.repeat(64));expect(html).toContain('登记文件（1）');
    expect(html).toContain('rel="noopener noreferrer"');expect(html).toContain('当前知识库更新不会替换此清单');
  });
  it('tells legacy users that source metadata was not captured instead of presenting current metadata',()=>{
    const html=renderToStaticMarkup(<SessionSources session={{dataVersion:'legacy'}}/>);
    expect(html).toContain(LEGACY_SESSION_SOURCES_NOTICE);expect(html).toContain('未保存有效清单');expect(html).not.toContain('session-source-record');
  });
  it('renders imported unsafe URLs as plain escaped text and keeps malformed snapshots hidden',()=>{
    const snapshot=createSessionSourceSnapshot('v1',[{id:'custom',name:'<img>',url:'javascript:alert(1)',commit:'custom',license:'',files:[],sha256:'missing',note:''}]);
    const html=renderToStaticMarkup(<SessionSources session={{dataVersion:'v1',sourceSnapshot:snapshot}}/>);
    expect(html).toContain('&lt;img&gt;');expect(html).not.toContain('href="javascript:');expect(html).toContain('未提供有效 SHA-256');
    expect(renderToStaticMarkup(<SessionSources session={{dataVersion:'other',sourceSnapshot:snapshot}}/>)).toContain('版本不一致或格式无效');
  });
  it('keeps factual verification visible before opening the source registry and identifies custom archive limits',()=>{
    const legacy=renderToStaticMarkup(<SessionSources session={{dataVersion:'legacy'}}/>);
    expect(legacy).toContain('历史用字与引文未重新核验');expect(legacy.indexOf('历史用字与引文未重新核验')).toBeLessThan(legacy.indexOf('<details>'));
    const archive=renderToStaticMarkup(<SessionSources session={{dataVersion:'custom',factVerification:{version:'candidate-facts/1.0.0',status:'verified-archive',dataVersion:'custom',datasetSha256:'a'.repeat(64)}}}/>);
    expect(archive).toContain('已按生成时知识包归档核对');expect(archive).toContain('内容一致不等于上游真实性或专家认证');
  });
});
