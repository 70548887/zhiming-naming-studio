import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { AiSettings } from '../shared/types';
import type { AiNamingCapability } from '../shared/ai-capability';
import { aiCapabilityBinding, AiCapabilityCheck, AiCapabilityResult } from './AiCapabilityCheck';
const settings: AiSettings = { apiBaseUrl: 'https://example.com/v1', model: 'sample-model', timeoutMs: 45000, useAi: false };
const result: AiNamingCapability = { kind: 'structured-naming', status: 'passed', endpoint: 'https://example.com/v1/chat/completions', model: 'sample-model', checkedAt: '2026-10-18T00:00:00.000Z', checks: { transport: 'passed', json: 'passed', candidateShape: 'passed', localConstraints: 'passed' }, message: '固定样例通过结构与本地约束。', limitations: ['不代替真实创意质量评估。'] };
describe('AI naming format capability reading',()=>{
 it('binds protocol settings and credential revisions without including secret values or the enable switch',()=>{
  const base=aiCapabilityBinding(settings,1,2,3);
  expect(aiCapabilityBinding({...settings,useAi:true},1,2,3)).toBe(base);
  for(const value of [aiCapabilityBinding({...settings,model:'other'},1,2,3),aiCapabilityBinding({...settings,timeoutMs:5000},1,2,3),aiCapabilityBinding({...settings,apiBaseUrl:'https://other.test'},1,2,3),aiCapabilityBinding(settings,2,2,3),aiCapabilityBinding(settings,1,3,3),aiCapabilityBinding(settings,1,2,4)])expect(value).not.toBe(base);
  expect(base).not.toContain('key');
 });
 it('explains the bounded fictional request and does not call the API until the action is requested',()=>{
  const html=renderToStaticMarkup(<AiCapabilityCheck settings={settings} apiKey="SECRET-SHOULD-NOT-RENDER" keyDraftRevision={1} credentialRevision={1} busy="" onOperation={async(_label,work)=>work()}/>);
  for(const value of ['检测命名格式','虚构固定样例','最多重试一次','不发送当前客户姓名','不保存检测结果','不自动启用 AI'])expect(html).toContain(value);
  expect(html).not.toContain('SECRET-SHOULD-NOT-RENDER');
 });
 it('shows four distinct stages and marks prior configuration results expired without presenting them as current validation',()=>{
  const good=renderToStaticMarkup(<AiCapabilityResult result={result} current/>);
  for(const value of ['命名格式检测通过','接口通信','JSON 解析','候选结构','本地约束校验',result.endpoint,result.model,'不认证实际创意质量'])expect(good).toContain(value);
  const stale=renderToStaticMarkup(<AiCapabilityResult result={result} current={false}/>);expect(stale).toContain('检测结果已过期');expect(stale).toContain('重新检测');expect(stale).not.toContain('命名格式检测通过');
  const failed=renderToStaticMarkup(<AiCapabilityResult result={{...result,status:'failed',checks:{transport:'passed',json:'failed',candidateShape:'not-run',localConstraints:'not-run'}}} current/>);
  expect(failed).toContain('命名格式检测未通过');expect(failed).toContain('未通过');expect(failed).toContain('未执行');
 });
 it('escapes provider fields and messages as text',()=>{
  const html=renderToStaticMarkup(<AiCapabilityResult result={{...result,endpoint:'<script>endpoint()</script>',model:'<img>',message:'<svg onload="x">',limitations:['<iframe>']}} current/>);
  for(const value of ['&lt;script&gt;','&lt;img&gt;','&lt;svg','&lt;iframe&gt;'])expect(html).toContain(value);
  for(const value of ['<script>','<img>','<svg','<iframe>'])expect(html).not.toContain(value);
 });
});
