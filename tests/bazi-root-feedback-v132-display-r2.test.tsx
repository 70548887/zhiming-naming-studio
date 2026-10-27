import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it,vi} from 'vitest';
import raw from './fixtures/bazi-root-feedback-v132-display-r2.json';
import pins from '../src/main/bazi-root-feedback-v132-r2-pins.json';
import type {BirthProfile} from '../src/shared/types';
import type {RootFeedbackV132FacadeDTO} from '../src/shared/bazi-root-feedback-v132-r2-facade';
import {BaziRootFeedbackV132PreviewResult} from '../src/renderer/BaziRootFeedbackV132PreviewPanel';
import {createV132PreviewController} from '../src/renderer/bazi-root-feedback-v132-preview-state';

type CaseName=keyof typeof raw.cases;
const dto=(name:CaseName):RootFeedbackV132FacadeDTO=>structuredClone({...raw.cases[name].dto,resourceIdentity:raw.resourceIdentity,sources:raw.sources}) as unknown as RootFeedbackV132FacadeDTO;
const profile=(name:CaseName)=>structuredClone(raw.cases[name].profile) as BirthProfile;
const render=(result:RootFeedbackV132FacadeDTO)=>renderToStaticMarkup(<BaziRootFeedbackV132PreviewResult result={result}/>);
const headline=(html:string)=>html.match(/<h3>(.*?)<\/h3>/s)?.[1]??'';
const cards=(html:string)=>[...html.matchAll(/<section class="v132-regime" data-regime-id="([^"]+)"/g)].map(match=>match[1]);

describe('M764 review: two bounded presentation fixes on fixed907102f',()=>{
 it('uses fixed-publication, profile-bound captured data and labels the kernel-fault seam honestly',()=>{
  expect(raw.provenance.fullClosureSha256).toBe(pins.fullClosureSha256);
  expect(raw.provenance.manifestSha256).toBe(pins.manifestSha256);
  expect(raw.resourceIdentity.publicationId).toBe(pins.publicationId);
  expect(raw.provenance.serviceOrTransportExecuted).toBe(false);
  for(const name of Object.keys(raw.cases) as CaseName[]){
   const result=dto(name);expect(result.schema).toBe('bazi-root-feedback-facade/1.3.2-r2');expect(result.profileId).toBe(profile(name).id);
   expect(result.applicationGate.status).toBe('blocked');
   for(const branch of result.branches){expect(branch.root.profileId).toBe(branch.id);expect(branch.root.entryPolicy).toBe(result.entryPolicy);expect(branch.kind).toBe(profile(name).timeUnknown?'unknown-hour-interval':'recorded-instant');}
  }
  expect(raw.cases.multiple.kind).toBe('actual-fixed-facade-output');
  expect(raw.cases.knownPending.kind).toBe('explicit-inner-kernel-fault-injection-not-service-output');
  expect(raw.cases.knownPending.injection.disabledEdges).toEqual(['missing-edge']);
 });

 it('shows every actual consistent path and gives identical semantics after reversing the same multiple-solution set',()=>{
  const result=dto('multiple'),before=JSON.stringify(result),expected=result.branches[0].root.consistentIds;
  expect(expected.length).toBeGreaterThan(1);
  const first=render(result),reversed=structuredClone(result);
  for(const branch of reversed.branches){branch.root.regimes.reverse();branch.root.consistentIds.reverse();branch.root.possibleIds.reverse();}
  const second=render(reversed);
  expect(cards(first)).toEqual([...expected].sort());expect(cards(second)).toEqual(cards(first));expect(second).toBe(first);
  expect(first).toContain('列示顺序不表示优先或排名');expect(first).toContain('不选其中一条代表整体');
  expect(JSON.stringify(result)).toBe(before);
 });

 it('keeps different directions and avoidances separate in an explicitly presentation-only contrast fixture',()=>{
  // The actual multi-solution fixture has equal opinions. This DTO-shaped
  // contrast tests display semantics only; it is not claimed as engine output.
  const contrast=dto('multiple'),root=contrast.branches[0].root;
  const [a,b]=root.consistentIds.map(id=>root.regimes.find(regime=>regime.id===id)!);
  expect(a.opinion).not.toBeNull();expect(b.opinion).not.toBeNull();
  a.opinion!.primary=['木'];a.opinion!.avoid=['火'];b.opinion!.primary=['火'];b.opinion!.avoid=['木'];
  const first=render(contrast);root.consistentIds.reverse();root.regimes.reverse();const second=render(contrast);
  expect(second).toBe(first);expect(cards(first)).toHaveLength(2);
  expect(first).toContain('项目主方向：<b>木</b>');expect(first).toContain('项目主方向：<b>火</b>');
  expect(first).toContain('本路径慎用：火');expect(first).toContain('本路径慎用：木');
  expect(first).not.toContain('<button');
 });

 it('explains known-time pending from actual failed-kernel evidence without claiming the time is unknown',()=>{
  const result=dto('knownPending');
  expect(profile('knownPending').timeUnknown).toBe(false);expect(result.calendar.partitionComplete).toBe(true);
  expect(result.branches[0].root.scope).toBe('complete-known-pillars');
  expect(result.branches[0].root.regimes.every(regime=>regime.certificate.status==='unclosed'&&regime.certificate.failureReason==='invalid-graph'&&regime.opinion===null)).toBe(true);
  const html=render(result);expect(headline(html)).toContain('出生时刻已记录');expect(headline(html)).toContain('项目规则或计算证据');
  expect(headline(html)).not.toContain('时刻未知');expect(headline(html)).not.toContain('历法区间尚未唯一');
  const visibleReasons=html.match(/<section class="v132-pending-reasons">(.*?)<\/section>/s)?.[1]??'';
  expect(visibleReasons).toContain('内核未闭合');expect(visibleReasons).toContain('计算关系图不完整');
  expect(html).not.toContain('补充时辰');expect(html).not.toContain('<button');
 });

 it('describes the actual unknown-hour facade output as unknown time with possible branches',()=>{
  const result=dto('unknown');expect(profile('unknown').timeUnknown).toBe(true);expect(result.status).toBe('pending-regime-resolution');
  expect(result.branches.every(branch=>branch.kind==='unknown-hour-interval')).toBe(true);
  const html=render(result);expect(headline(html)).toContain('出生时刻未知');expect(headline(html)).toContain('可能时段分支');expect(html).toContain('可能时段分支');
  expect(headline(html)).not.toContain('一项一致');
 });

 it('preserves the actual unique result and the existing none-result display contract',()=>{
  const unique=dto('unique'),html=render(unique);expect(headline(html)).toContain('一项一致的项目结论');expect(cards(html)).toHaveLength(1);
  expect(html).toContain('项目主方向：<b>土</b>');
  // No-result is a display-only status fixture, retaining the same real
  // publication/profile identity; it is not a captured facade outcome.
  const none=structuredClone(unique);none.status='no-consistent-regime';
  for(const branch of none.branches){branch.root.resolution='no-consistent-regime';branch.root.consistentIds=[];branch.root.possibleIds=[];for(const regime of branch.root.regimes){regime.consistency='inconsistent';regime.opinion=null;}}
  const empty=render(none);expect(headline(empty)).toContain('未得到一致的项目结论');expect(cards(empty)).toHaveLength(0);expect(empty).not.toContain('项目主方向：');
  for(const value of [html,empty]){expect(value).toContain('应用门仍为阻塞状态');expect(value).toContain('尚未用于起名生成、保存、评分或候选排序');}
 });

 it('leaves the existing default-off read-only and stale-controller behavior untouched',async()=>{
  let current=profile('unique'),resolve!:(value:RootFeedbackV132FacadeDTO)=>void;
  const api={previewBaziRootFeedbackV132:vi.fn(()=>new Promise<RootFeedbackV132FacadeDTO>(yes=>{resolve=yes;}))};
  const before=JSON.stringify(current),controller=createV132PreviewController({getProfile:()=>current,getApi:()=>api});controller.activate();
  expect(api.previewBaziRootFeedbackV132).not.toHaveBeenCalled();
  const pending=controller.run();expect(api.previewBaziRootFeedbackV132).toHaveBeenCalledTimes(1);
  expect(api.previewBaziRootFeedbackV132.mock.calls[0]).toEqual([current,{fromOutputMonthStem:false}]);
  current=profile('multiple');controller.refresh();current=profile('unique');controller.refresh();resolve(dto('unique'));await pending;
  expect(controller.getSnapshot().result).toBeUndefined();expect(controller.getSnapshot().phase).toBe('idle');expect(JSON.stringify(current)).toBe(before);controller.dispose();
 });
});
