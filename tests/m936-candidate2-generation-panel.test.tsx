import React from 'react';
import {afterAll,describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {renderToStaticMarkup} from 'react-dom/server';
import {Candidate2GenerationPanel} from '../src/renderer/Candidate2GenerationPanel';
import type {Candidate2GenerationUiState,Candidate2GenerationPanelProps} from '../src/renderer/candidate2-generation-ui';

/** Explicit public UI state fixtures verify presentation and dispatch only.
 * They do not establish actual Service generation, persistence, or delivery. */
const evidenceDir=fs.mkdtempSync(path.join(process.env.M936_TEST_EVIDENCE_DIR??'D:/Codex-NamingStudio-Evidence/m936-candidate2-generation-panel','ssr-'));
const observations:Array<{case:string;value:unknown}>=[];
const initial=():Candidate2GenerationUiState=>({enabled:false,phase:'idle',requestPending:false,canGenerate:false,blockedReason:null,notice:'项目固定取法当前未启用。',error:null});
const state=(patch:Partial<Candidate2GenerationUiState>={}):Candidate2GenerationUiState=>({...initial(),...patch});
const freeze=<T,>(value:T):T=>{if(value&&typeof value==='object'){Object.freeze(value);for(const item of Object.values(value as Record<string,unknown>))freeze(item);}return value;};
const clone=<T,>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
function render(input:Candidate2GenerationUiState,disabled=false){
 const calls:string[]=[];
 const props:Candidate2GenerationPanelProps={state:freeze(input),disabled,onEnabledChange:value=>calls.push('enabled:'+value),onGenerate:()=>calls.push('generate'),onCancel:()=>calls.push('cancel'),onRetryDelivery:()=>calls.push('retry-delivery')};
 const before=clone(input),html=renderToStaticMarkup(<Candidate2GenerationPanel {...props}/>);
 expect(calls,'SSR rendering must not dispatch').toEqual([]);expect(input,'Rendering must not change supplied public state').toEqual(before);
 return html;
}
const action=(html:string,name:string)=>[...html.matchAll(/<(?:button|input)\b[^>]*>/g)].map(row=>row[0]).find(tag=>tag.includes(`data-c2-action="${name}"`));
const disabled=(tag:string|undefined)=>tag===undefined||/\sdisabled(?:=|\s|>)/.test(tag);
const escaped=(value:string)=>renderToStaticMarkup(<span>{value}</span>).slice(6,-7);

afterAll(()=>{
 const file=path.join(evidenceDir,'observations.json'),temporary=file+'.tmp';
 fs.writeFileSync(temporary,JSON.stringify({schema:'m936-candidate2-generation-panel-ssr-observations/1',scope:'Explicit public UI states; pure event presentation; no real Service, save, App or transport acceptance.',observations},null,2)+'\n');fs.renameSync(temporary,file);
 console.info('M936_SSR_EVIDENCE '+evidenceDir);
});

describe('M936 public candidate2 generation UI projection in SSR',()=>{
 it('defaults to off, renders the public phase and dispatches nothing',()=>{
  const html=render(initial());
  expect(html).toContain('data-c2-generation-panel');expect(html).toContain('data-phase="idle"');
  expect(action(html,'enable')).toMatch(/type="checkbox"/);expect(action(html,'enable')).not.toMatch(/\schecked(?:=|\s|>)/);
  expect(disabled(action(html,'generate'))).toBe(true);
  expect(html).toContain('按项目固定取法生成并保存');
  expect(html).toMatch(/aria-live="(?:polite|assertive)"/);
  observations.push({case:'default-off',value:{dispatches:0,phase:'idle'}});
 });

 it('projects enabled and canGenerate without interpreting a separate eligibility authority',()=>{
  const html=render(state({enabled:true,canGenerate:true,notice:'由上游状态允许本次发起。'}));
  expect(action(html,'enable')).toMatch(/\schecked(?:=|\s|>)/);expect(disabled(action(html,'generate'))).toBe(false);
  expect(html).toContain('由上游状态允许本次发起。');
 });

 it.each([
  ['disabled prop',state({enabled:true,canGenerate:true}),true],
  ['off',state({enabled:false,canGenerate:true}),false],
  ['canGenerate false',state({enabled:true,canGenerate:false}),false],
  ['request pending',state({enabled:true,canGenerate:true,requestPending:true,phase:'generating'}),false],
 ] as const)('%s prevents a generation action',(_label,input,externalDisabled)=>{const html=render(input,externalDisabled);expect(disabled(action(html,'generate'))).toBe(true);});

 it.each([
  ['blocked','当前客户记录只读，未允许生成。'],
  ['blocked','表单存在尚未保存的编辑，请先处理。'],
  ['unavailable','当前运行环境缺少项目生成桥接。'],
  ['blocked','上游状态给出的固定条件阻塞说明。'],
 ] as const)('%s preserves the supplied blocking explanation', (phase,reason)=>{
  const html=render(state({enabled:true,phase,canGenerate:false,blockedReason:reason,notice:'保持由上游给出的状态。'}));
  expect(html).toContain(`data-phase="${phase}"`);expect(html).toContain(escaped(reason));expect(disabled(action(html,'generate'))).toBe(true);
  observations.push({case:phase,value:reason});
 });

 it.each([false,true])('pending cancellation remains reachable with disabled=%s',externalDisabled=>{
  const html=render(state({enabled:true,phase:'generating',requestPending:true,canGenerate:false,notice:'正在等待生成结果。'}),externalDisabled);
  expect(disabled(action(html,'generate'))).toBe(true);expect(action(html,'cancel')).toBeDefined();expect(disabled(action(html,'cancel'))).toBe(false);
  expect(html).toContain('停止等待');expect(html).not.toMatch(/已撤销后端|撤销已保存|后端已取消|已删除结果/);
 });

 it('stopping intent does not hide cancellation before the original request settles',()=>{
  const html=render(state({enabled:false,phase:'generating',requestPending:true,canGenerate:false,notice:'已停止本次意图，原请求仍未结算。'}),true);
  expect(action(html,'cancel')).toBeDefined();expect(disabled(action(html,'cancel'))).toBe(false);expect(disabled(action(html,'generate'))).toBe(true);
 });

 it('does not advertise a returned result or delivery retry for a generation error',()=>{
  const html=render(state({enabled:true,phase:'error',canGenerate:false,error:'固定取法生成失败。',notice:'本次没有可交付结果。'}));
  expect(html).toContain('固定取法生成失败。');expect(action(html,'retry-delivery')).toBeUndefined();
  expect(html).not.toContain('重新接收已返回结果');
 });

 it('active delivery exposes progress without premature retry',()=>{
  const html=render(state({enabled:true,phase:'delivering',requestPending:true,canGenerate:false,error:null,notice:'已返回结果正在交接。'}));
  expect(html).toContain('data-phase="delivering"');expect(action(html,'retry-delivery')).toBeUndefined();expect(disabled(action(html,'generate'))).toBe(true);
 });

 it('delivery failure offers its independent retry without changing supplied result summary',()=>{
  const summary={sessionId:'m936-result-session',profileId:'m936-owner-profile',candidateCount:3,traditionalStatus:'unknown' as const};
  const html=render(state({enabled:true,phase:'delivering',requestPending:false,canGenerate:false,error:'结果交接未完成，请重试接收。',notice:'已返回结果仍由上游保留。',savedSummary:summary}));
  expect(html).toContain('重新接收已返回结果');expect(disabled(action(html,'retry-delivery'))).toBe(false);expect(disabled(action(html,'generate'))).toBe(true);
  expect(html).toContain('已返回结果仍由上游保留。');expect(html).toContain('结果交接未完成，请重试接收。');
  observations.push({case:'delivery-failure',value:{phase:'delivering',retryDelivery:true,newGeneration:false,summary}});
 });

 it('external disabled gates delivery retry without preventing pending cancellation',()=>{
  const html=render(state({enabled:true,phase:'delivering',requestPending:false,canGenerate:false,error:'交接未完成。',notice:'等待重新接收。'}),true);
  expect(disabled(action(html,'retry-delivery'))).toBe(true);
 });

 it('ready shows count/session/profile and keeps traditional status unknown',()=>{
  const summary={sessionId:'m936-ready-session',profileId:'m936-ready-profile',candidateCount:2,traditionalStatus:'unknown' as const};
  const html=render(state({enabled:true,phase:'ready',canGenerate:false,notice:'已保存结果已返回。',savedSummary:summary}));
  expect(html).toContain('data-phase="ready"');expect(html).toContain(summary.sessionId);expect(html).toContain(summary.profileId);expect(html).toContain('2');
  expect(html).toMatch(/未评估|未知|未判定|unknown/);expect(html).not.toMatch(/大吉|上上签|凶兆|保证好运|保证成功/);
  expect(action(html,'retry-delivery')).toBeUndefined();
 });

 it('escapes supplied state text instead of inserting executable markup',()=>{
  const danger='<script>window.__m936Unexpected=1</script>';
  const html=render(state({enabled:true,phase:'error',notice:danger,error:danger,blockedReason:danger}));
  expect(html).not.toContain('<script>');expect(html).toContain('&lt;script&gt;');
 });
});
