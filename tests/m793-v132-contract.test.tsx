import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {describe,expect,it,vi} from 'vitest';
import type {BirthProfile} from '../src/shared/types';
import type {RootFeedbackV132FacadeDTO} from '../src/shared/bazi-root-feedback-v132-r2-facade';
import type {BaziRootFeedbackV132PreviewApi} from '../src/shared/bazi-root-feedback-v132-preview-api';
import {BaziRootFeedbackV132PreviewResult,BaziRootFeedbackV132PreviewView} from '../src/renderer/BaziRootFeedbackV132PreviewPanel';
import {createV132PreviewController,currentV132PreviewState,readV132PreviewFrame,matchesV132PreviewResponse} from '../src/renderer/bazi-root-feedback-v132-preview-state';
import {previewBoundDto,previewDto as dto,previewProfile as profile} from './fixtures/m793-v132-ui';

const defaultProfile=profile();
const api=(result:RootFeedbackV132FacadeDTO|Error):BaziRootFeedbackV132PreviewApi=>({previewBaziRootFeedbackV132:vi.fn(async()=>{if(result instanceof Error)throw result;return structuredClone(result);})});
const html=(state:ReturnType<ReturnType<typeof createV132PreviewController>['getSnapshot']>)=>renderToStaticMarkup(<BaziRootFeedbackV132PreviewView id="v132-test" state={state} disabled={false} currentModelLabel="当前采用的项目命名取法" onRun={()=>{}} onProposal={()=>{}}/>);
function pendingApi(){
 const calls:{input:BirthProfile;options:Parameters<BaziRootFeedbackV132PreviewApi['previewBaziRootFeedbackV132']>[1];resolve:(value:RootFeedbackV132FacadeDTO)=>void;reject:(error:Error)=>void}[]=[];
 const value:BaziRootFeedbackV132PreviewApi={previewBaziRootFeedbackV132:(input,options)=>new Promise((resolve,reject)=>calls.push({input,options,resolve,reject}))};
 return {api:value,calls};
}

describe('M793 combined display and dev06 contract consumer',()=>{
 it('does not request by default, snapshots the current input and suppresses duplicate clicks',async()=>{
  const pending=pendingApi(),input=profile(),before=JSON.stringify(input);
  const controller=createV132PreviewController({getProfile:()=>input,getApi:()=>pending.api});controller.activate();
  expect(pending.calls).toHaveLength(0);expect(html(controller.getSnapshot())).toContain('默认不运行');
  const request=controller.run();void controller.run();expect(pending.calls).toHaveLength(1);
  expect(pending.calls[0].input).toEqual(input);expect(pending.calls[0].input).not.toBe(input);
  expect(pending.calls[0].options).toEqual({fromOutputMonthStem:false});expect(controller.getSnapshot().phase).toBe('loading');
  pending.calls[0].resolve(previewBoundDto(pending.calls[0].input,pending.calls[0].options));await request;
  expect(controller.getSnapshot().phase).toBe('ready');expect(html(controller.getSnapshot())).toContain('一项一致结论');
  expect(html(controller.getSnapshot())).toContain('尚未用于起名生成、保存');
  expect(Object.isFrozen(controller.getSnapshot().result)).toBe(true);expect(JSON.stringify(input)).toBe(before);controller.dispose();
 });

 it('preserves both retained paths for multiple results and plain-language no-result boundaries',()=>{
  const multiple=renderToStaticMarkup(<BaziRootFeedbackV132PreviewResult result={dto('multiple-consistent-regimes')}/>);
  expect(multiple).toContain('未合并为唯一结果');expect(multiple.match(/class="v132-regime"/g)).toHaveLength(2);expect(multiple).toContain('不选其中一条代表整体');
  expect(multiple).toContain('<b>木</b>');expect(multiple).toContain('<b>水</b>');
  const none=renderToStaticMarkup(<BaziRootFeedbackV132PreviewResult result={dto('no-consistent-regime')}/>);
  expect(none).toContain('未得到一致的项目结论');expect(none).not.toContain('项目主方向：');
  for(const rendered of [multiple,none]){expect(rendered).toContain('此版本未进入起名应用或保存证书');expect(rendered).not.toContain('<pre>');}
 });

 it('keeps unknown-hour input pending and rejects a fabricated unique aggregate',async()=>{
  const input=profile('profile-a',true),result=previewBoundDto(input,undefined,'pending-regime-resolution'),service=api(result);
  const controller=createV132PreviewController({getProfile:()=>input,getApi:()=>service});controller.activate();await controller.run();
  expect(controller.getSnapshot().phase).toBe('ready');const rendered=html(controller.getSnapshot());
  expect(rendered).toContain('出生时刻未知，当前仅展示可能时段分支');expect(rendered).not.toContain('出生时刻已记录');expect(rendered).not.toContain('12:00');
  const promoted={...result,status:'unique-consistent-regime'} as RootFeedbackV132FacadeDTO;
  expect(matchesV132PreviewResponse(promoted,readV132PreviewFrame(input,service,false))).toBe(false);controller.dispose();
 });

 it('rejects wrong version/profile/policy, unblocked gates, bad resources and malformed branches before display',async()=>{
  const mutations:((result:RootFeedbackV132FacadeDTO)=>void)[]=[
   result=>{(result as {schema:string}).schema='bazi-root-feedback-facade/1.0.0';},
   result=>{result.profileId='wrong-profile';},
   result=>{result.entryPolicy='month-stem-proposal';},
   result=>{(result.applicationGate as unknown as {status:string}).status='applicable';},
   result=>{result.resourceIdentity.publicationId='preview-publication-r1';},
   result=>{result.resourceIdentity.fullClosureSha256='not-a-sha';},
   result=>{result.branches=[];},
   result=>{result.branches[0].root.regimes[0].opinion!.primary=['火','forged'] as never;},
  ];
  for(const mutate of mutations){const changed=previewBoundDto(defaultProfile);mutate(changed);const service=api(changed),controller=createV132PreviewController({getProfile:()=>defaultProfile,getApi:()=>service});controller.activate();await controller.run();
   expect(controller.getSnapshot().errorKind).toBe('response');expect(controller.getSnapshot().result).toBeUndefined();expect(html(controller.getSnapshot())).not.toContain('保留项目路径');controller.dispose();}
 });

 it('retains a stale notice and discards late results for profile A-to-B-to-A, options and disabled state',async()=>{
  const pending=pendingApi();let current=profile(),disabled=false;
  const controller=createV132PreviewController({getProfile:()=>current,getApi:()=>pending.api,isDisabled:()=>disabled});controller.activate();
  const old=controller.run();current=profile('profile-b');controller.refresh();current=profile();controller.refresh();
  pending.calls[0].resolve(previewBoundDto(pending.calls[0].input,pending.calls[0].options));await old;expect(controller.getSnapshot().phase).toBe('idle');expect(html(controller.getSnapshot())).toContain('上次结果已失效');
  const fresh=controller.run();pending.calls[1].resolve(previewBoundDto(pending.calls[1].input,pending.calls[1].options));await fresh;
  current={...current,birthTime:'10:15'};const masked=currentV132PreviewState(controller.getSnapshot(),readV132PreviewFrame(current,pending.api,false));
  expect(masked.result).toBeUndefined();expect(html(masked)).toContain('上次结果已失效');controller.refresh();
  controller.setProposal(true);const proposed=controller.run();expect(pending.calls[2].options).toEqual({fromOutputMonthStem:true});
  controller.setProposal(false);controller.setProposal(true);pending.calls[2].resolve(previewBoundDto(pending.calls[2].input,pending.calls[2].options));await proposed;expect(controller.getSnapshot().phase).toBe('idle');
  disabled=true;await controller.run();expect(pending.calls).toHaveLength(3);controller.dispose();
 });

 it('retires API A-to-B-to-A and same-object callable replacement on both resolve and reject',async()=>{
  for(const settle of ['resolve','reject'] as const){
   const first=pendingApi(),second=pendingApi();let current=first.api;
   const controller=createV132PreviewController({getProfile:()=>defaultProfile,getApi:()=>current});controller.activate();
   const old=controller.run();current=second.api;controller.refresh();current=first.api;controller.refresh();
   if(settle==='resolve')first.calls[0].resolve(previewBoundDto(first.calls[0].input,first.calls[0].options));else first.calls[0].reject(Error('late failure'));await old;expect(controller.getSnapshot().phase).toBe('idle');
   const request=controller.run();first.api.previewBaziRootFeedbackV132=second.api.previewBaziRootFeedbackV132;
   expect(currentV132PreviewState(controller.getSnapshot(),readV132PreviewFrame(profile(),current,false)).phase).toBe('idle');
   controller.refresh();first.calls[1].resolve(previewBoundDto(first.calls[1].input,first.calls[1].options));await request;expect(controller.getSnapshot().result).toBeUndefined();controller.dispose();
  }
 });

 it('classifies unsupported and resource-not-ready failures into ordinary Chinese and retries successfully',async()=>{
  for(const [message,expected,label] of [
   ['ROOT_FEEDBACK_VERSION_UNSUPPORTED private/path','unsupported','暂不支持这一版'],
   ['ROOT_FEEDBACK_V132_R2_PREVIEW_UNAVAILABLE private/path','resources','固定资料尚未就绪'],
   ['ROOT_FEEDBACK_V132_R2_RESOURCES_UNAVAILABLE private/path','resources','固定资料尚未就绪'],
   ['network private/path','request','预览暂不可用'],
  ] as const){
   let fail=true;const service:BaziRootFeedbackV132PreviewApi={previewBaziRootFeedbackV132:vi.fn(async(input,options)=>{if(fail)throw Error(message);return previewBoundDto(input,options);})};
   const controller=createV132PreviewController({getProfile:()=>defaultProfile,getApi:()=>service});controller.activate();await controller.run();
   expect(controller.getSnapshot().errorKind).toBe(expected);expect(html(controller.getSnapshot())).toContain(label);expect(html(controller.getSnapshot())).not.toContain('private/path');
   fail=false;await controller.run();expect(controller.getSnapshot().phase).toBe('ready');controller.dispose();
  }
 });

 it('rechecks the lease after notifying subscribers before dispatch and clears state on unmount',async()=>{
  const pending=pendingApi();let current=profile();const controller=createV132PreviewController({getProfile:()=>current,getApi:()=>pending.api});
  controller.activate();const unsubscribe=controller.subscribe(()=>{if(controller.getSnapshot().phase==='loading'){current=profile('profile-b');controller.refresh();}});
  await controller.run();expect(pending.calls).toHaveLength(0);unsubscribe();current=profile();controller.refresh();
  const old=controller.run();controller.dispose();pending.calls[0].resolve(previewBoundDto(pending.calls[0].input,pending.calls[0].options));await old;expect(controller.getSnapshot().phase).toBe('idle');expect(controller.getSnapshot().result).toBeUndefined();
 });

 it('puts actual source attribution and numeric certificate summaries in details without JSON',()=>{
  const rendered=renderToStaticMarkup(<BaziRootFeedbackV132PreviewResult result={dto()}/>);
  for(const text of ['查看版本、来源与证书边界','界面测试来源','资料许可：','Fixture only','资源闭包 SHA-256','迭代次数','误差界限','数值检查只说明本项目计算'])expect(rendered).toContain(text);
  expect(rendered).toContain('4e-7');expect(rendered).not.toContain('<pre>');expect(rendered).not.toContain('previewBaziRootFeedbackV132');
 });

 it('executes real mounted Panel handlers with bounded asynchronous test APIs',()=>{
  const result=JSON.parse(execFileSync(process.execPath,[resolve('tests/helpers/m793-v132-panel-harness.mjs')],{cwd:process.cwd(),encoding:'utf8',timeout:20000}));
  expect(result.passed).toBe(true);expect(result.cases.length).toBeGreaterThanOrEqual(4);expect(result.writesAfterDispose).toBe(0);expect(result.unhandled).toEqual([]);
 },25000);

 it('accepts omitted optional birth fields without touching accessors or invalid drafts',async()=>{
  const pending=pendingApi(),input={...profile(),fatherName:undefined,birthLongitude:undefined};
  const controller=createV132PreviewController({getProfile:()=>input,getApi:()=>pending.api});controller.activate();const request=controller.run();
  expect(pending.calls).toHaveLength(1);expect(pending.calls[0].input).not.toHaveProperty('fatherName');expect(pending.calls[0].input).not.toHaveProperty('birthLongitude');pending.calls[0].resolve(previewBoundDto(pending.calls[0].input,pending.calls[0].options));await request;expect(controller.getSnapshot().phase).toBe('ready');controller.dispose();
  let reads=0;const poisoned=profile();Object.defineProperty(poisoned,'birthDate',{enumerable:true,get(){reads++;return '2026-10-25';}});
  const invalid=createV132PreviewController({getProfile:()=>poisoned,getApi:()=>pending.api});invalid.activate();await invalid.run();expect(invalid.getSnapshot().errorKind).toBe('input');expect(reads).toBe(0);expect(pending.calls).toHaveLength(1);invalid.dispose();
 });
});
