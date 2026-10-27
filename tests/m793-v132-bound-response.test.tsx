import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import type {BirthProfile} from '../src/shared/types';
import type {BaziRootFeedbackV132PreviewApi} from '../src/shared/bazi-root-feedback-v132-preview-api';
import type {RootFeedbackV132FacadeDTO} from '../src/shared/bazi-root-feedback-v132-r2-facade';
import legacyBound from './fixtures/bazi-root-feedback-v132-display-r2.json';
import {BaziRootFeedbackV132PreviewResult} from '../src/renderer/BaziRootFeedbackV132PreviewPanel';
import {createV132PreviewController,matchesV132PreviewResponse,readV132PreviewFrame} from '../src/renderer/bazi-root-feedback-v132-preview-state';
import {bindPreviewFixtureResponse} from './helpers/m812-bound-preview-response';

const captureBytes=gunzipSync(readFileSync(new URL('./fixtures/m793-fixed-facade-capture.json.gz',import.meta.url)));
type CapturedCase={profile:BirthProfile;options:{fromOutputMonthStem:boolean};dtoSha256:string;dto:RootFeedbackV132FacadeDTO};
const capture=JSON.parse(captureBytes.toString('utf8')) as {schema:string;provenance:{bundleSha256:string;receiptSha256:string;service:boolean;sql:boolean;browser:boolean};cases:Record<'unique'|'multiple'|'unknown'|'monthStem',CapturedCase>};
const render=(dto:RootFeedbackV132FacadeDTO)=>renderToStaticMarkup(<BaziRootFeedbackV132PreviewResult result={dto}/>);
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const cards=(html:string)=>[...html.matchAll(/data-regime-id="([^"]+)"/g)].map(match=>match[1]);

describe('M793 true fixed M758 publication compatibility plus retained M764 display semantics',()=>{
 it('pins exact capture provenance, then accepts test-only main transport extensions of every complete real DTO',async()=>{
  expect(createHash('sha256').update(captureBytes).digest('hex')).toBe('0c21529f76c722a3df91e726ddc274db51bbfc6837f0b727e26341471e1bbb4d');
  expect(capture.provenance).toMatchObject({bundleSha256:'d01d2b51e10b48c3de361ab27de451dcb91670b71197a559f6fb8182215193fb',receiptSha256:'13494715c04fb21f3d8ce61a78fb817ad64c6bfcdc3ceb3dd72d5d43f15454fc',service:false,sql:false,browser:false});
  for(const [name,row]of Object.entries(capture.cases)){
   const before=JSON.stringify(row);
   expect(digest(row.dto)).toBe(row.dtoSha256);
   // The recorded facade bytes remain unbound; only this explicit test transport seam adds metadata.
   expect(row.dto).not.toHaveProperty('requestBinding');
   const transported=bindPreviewFixtureResponse(row.dto,row.profile,row.options);
   const {requestBinding,...capturedDto}=transported;
   expect(requestBinding.fromOutputMonthStem).toBe(row.options.fromOutputMonthStem);expect(digest(capturedDto)).toBe(row.dtoSha256);
   const api:BaziRootFeedbackV132PreviewApi={previewBaziRootFeedbackV132:async(p,o)=>{expect(p).toEqual(row.profile);expect(o).toEqual(row.options);return structuredClone(transported);}};
   const controller=createV132PreviewController({getProfile:()=>row.profile,getApi:()=>api});controller.activate();
   if(row.options.fromOutputMonthStem)controller.setProposal(true);
   expect(matchesV132PreviewResponse(transported,readV132PreviewFrame(row.profile,api,row.options.fromOutputMonthStem)),name).toBe(true);
   await controller.run();expect(controller.getSnapshot().phase,name).toBe('ready');expect(controller.getSnapshot().result?.applicationGate.status).toBe('blocked');
   expect(controller.getSnapshot().result?.branches[0].root.detail).not.toBeNull();expect(JSON.stringify(row)).toBe(before);controller.dispose();
  }
 });

 it('retains every actual multi-solution card with byte-equal HTML when the same solution set is reversed',()=>{
  const value=structuredClone(capture.cases.multiple.dto),before=JSON.stringify(value),first=render(value);
  expect(value.branches[0].root.consistentIds.length).toBeGreaterThan(1);expect(cards(first)).toHaveLength(value.branches[0].root.consistentIds.length);
  const reversed=structuredClone(value);for(const branch of reversed.branches){branch.root.regimes.reverse();branch.root.consistentIds.reverse();branch.root.possibleIds.reverse();}
  expect(render(reversed)).toBe(first);expect(first).toContain('列示顺序不表示优先或排名');expect(first).toContain('不选其中一条代表整体');expect(JSON.stringify(value)).toBe(before);
 });

 it('preserves known-time pending real fault reasons separately from actual unknown-hour output',()=>{
  const known=structuredClone({...legacyBound.cases.knownPending.dto,resourceIdentity:legacyBound.resourceIdentity,sources:legacyBound.sources}) as unknown as RootFeedbackV132FacadeDTO;
  const profile=legacyBound.cases.knownPending.profile as BirthProfile;
  expect(legacyBound.cases.knownPending.kind).toBe('explicit-inner-kernel-fault-injection-not-service-output');
  const transported=bindPreviewFixtureResponse(known,profile,{fromOutputMonthStem:false});
  expect(matchesV132PreviewResponse(transported,readV132PreviewFrame(profile,undefined,false))).toBe(true);
  const knownHtml=render(known),unknownHtml=render(capture.cases.unknown.dto);
  expect(knownHtml.match(/<h3>(.*?)<\/h3>/s)?.[1]).toContain('出生时刻已记录');expect(knownHtml).toContain('内核未闭合');expect(knownHtml).toContain('计算关系图不完整');
  expect(knownHtml).not.toContain('出生时刻未知');expect(knownHtml).not.toContain('补充时辰');
  expect(unknownHtml.match(/<h3>(.*?)<\/h3>/s)?.[1]).toContain('出生时刻未知');expect(unknownHtml).toContain('可能时段分支');
 });

 it('rejects malformed real-response display fields and valid-format wrong resource identities as retryable errors',async()=>{
  const mutations:((value:RootFeedbackV132FacadeDTO)=>void)[]=[
   v=>{v.profileId='wrong-profile';},v=>{v.entryPolicy='month-stem-proposal';},
   v=>{(v as unknown as {schema:string}).schema='bazi-root-feedback-facade/1.0.0';},
   v=>{v.resourceIdentity.fullClosureSha256='0'.repeat(64);},v=>{v.resourceIdentity.manifestSha256='0'.repeat(64);},
   v=>{v.resourceIdentity.kernel.methodId='wrong-kernel';},v=>{v.resourceIdentity.kernel.sourceRevision='0'.repeat(64);},
   v=>{v.resourceIdentity.files[0].bytes=-1;},v=>{(v.resourceIdentity.runtimeEnvironment as unknown as {node:unknown}).node=null;},
   v=>{(v.branches[0].root as unknown as {schema:string}).schema='other';},
   v=>{v.branches[0].id='wrong-profile';v.branches[0].root.profileId='wrong-profile';},
   v=>{(v.branches[0].root.regimes[0] as unknown as {pending:unknown}).pending=[{}];},
   v=>{v.branches[0].root.consistentIds.push(v.branches[0].root.consistentIds[0]);},
   v=>{v.branches[0].root.regimes.find(r=>r.id===v.branches[0].root.consistentIds[0])!.consistency='inconsistent';},
   v=>{(v.applicationGate as unknown as {status:string}).status='applicable';},
  ];
  for(const mutate of mutations){
   const row=capture.cases.unique,value=bindPreviewFixtureResponse(row.dto,row.profile,row.options);mutate(value);
   const profile=capture.cases.unique.profile,api:BaziRootFeedbackV132PreviewApi={previewBaziRootFeedbackV132:async()=>value};
   const controller=createV132PreviewController({getProfile:()=>profile,getApi:()=>api});controller.activate();await controller.run();
   expect(controller.getSnapshot().phase).toBe('error');expect(controller.getSnapshot().errorKind).toBe('response');expect(controller.getSnapshot().result).toBeUndefined();controller.dispose();
  }
 });

 it('does not treat an echoed allowed release hash as generation permission',async()=>{
  const row=capture.cases.unique,echo=bindPreviewFixtureResponse(row.dto,row.profile,row.options);
  expect(echo.applicationGate.status).toBe('blocked');expect(echo.resourceIdentity.fullClosureSha256).toHaveLength(64);
  const before=JSON.stringify(row),api:BaziRootFeedbackV132PreviewApi={previewBaziRootFeedbackV132:async()=>echo};
  const controller=createV132PreviewController({getProfile:()=>row.profile,getApi:()=>api});controller.activate();await controller.run();
  const result=controller.getSnapshot().result!;expect(result.applicationGate).not.toHaveProperty('certificate');
  const html=render(result);expect(html).toContain('尚未用于起名生成、保存、评分或候选排序');expect(html).toContain('此版本未进入起名应用或保存证书');expect(html).not.toContain('<button');expect(JSON.stringify(row)).toBe(before);controller.dispose();
 });
});
