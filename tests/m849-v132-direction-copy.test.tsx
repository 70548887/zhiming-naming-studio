import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import type {BirthProfile} from '../src/shared/types';
import type {RootFeedbackV132FacadeDTO} from '../src/shared/bazi-root-feedback-v132-r2-facade';
import type {RootFeedbackV132BoundPreviewResponse} from '../src/shared/bazi-root-feedback-v132-request-binding';
import {StudioService} from '../src/main/service';
import {createBaziRootFeedbackV132PreviewAdapter} from '../src/main/bazi-root-feedback-v132-preview';
import {readRootFeedbackV132BoundPreviewRequest,bindRootFeedbackV132PreviewResponse} from '../src/main/bazi-root-feedback-v132-request-binding';
import {BaziRootFeedbackV132PreviewResult} from '../src/renderer/BaziRootFeedbackV132PreviewPanel';
import {buildPreviewFixture} from './helpers/root-feedback-v132-preview-fixture';

const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'m849-direction-copy-'));
const evidence=path.resolve('.local/m849');
const captureBytes=gunzipSync(fs.readFileSync(new URL('./fixtures/m793-fixed-facade-capture.json.gz',import.meta.url)));
const historical=JSON.parse(captureBytes.toString('utf8')) as {cases:Record<'unique'|'multiple'|'unknown',{profile:BirthProfile;dto:RootFeedbackV132FacadeDTO}>};
let known:RootFeedbackV132BoundPreviewResponse,unknown:RootFeedbackV132BoundPreviewResponse;
const freeze=<T,>(value:T):T=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const render=(result:RootFeedbackV132FacadeDTO)=>renderToStaticMarkup(<BaziRootFeedbackV132PreviewResult result={result}/>);
const summary=(html:string)=>html.match(/<section class="v132-pending-reasons">([\s\S]*?)<\/section>/)?.[1]??'';
const retained=(dto:RootFeedbackV132FacadeDTO)=>dto.branches.flatMap(branch=>branch.root.regimes.filter(regime=>regime.consistency!=='inconsistent'&&[...branch.root.consistentIds,...branch.root.possibleIds].includes(regime.id)));
const rawReasons=(dto:RootFeedbackV132FacadeDTO)=>[...dto.calendar.warnings,...dto.branches.flatMap(branch=>[...branch.root.pending,...branch.root.regimes.flatMap(regime=>regime.pending)])];

beforeAll(async()=>{
 const built=await buildPreviewFixture(scratch,process.cwd()),adapter=createBaziRootFeedbackV132PreviewAdapter(built.assetRoot);
 const raw:BirthProfile={...historical.cases.unique.profile,id:'m849-direction-copy',surname:'林',calendar:'solar',birthDate:'2022-02-14',birthTime:'11:30',timeUnknown:false,timezone:'Asia/Shanghai'};
 const receiver=Object.create(StudioService.prototype);
 const compute=(input:BirthProfile)=>{
  const owned=readRootFeedbackV132BoundPreviewRequest(input,{fromOutputMonthStem:false});
  const normalized=StudioService.prototype.validateProfile.call(receiver,owned.profile);
  return bindRootFeedbackV132PreviewResponse(owned,adapter.previewBaziRootFeedbackProfile(normalized,owned.options));
 };
 known=freeze(compute(raw));unknown=freeze(compute({...raw,id:'',birthTime:'',timeUnknown:true}));
 fs.mkdirSync(evidence,{recursive:true});
 fs.writeFileSync(path.join(evidence,'test-real-responses.json'),JSON.stringify({raw,known,unknown,scope:'Actual validator + fixed M758 adapter + main binder; no full Service wire, SQL or browser.'}));
},60000);
afterAll(()=>{
 const base=path.resolve(os.tmpdir()),target=path.resolve(scratch),relative=path.relative(base,target);
 if(relative&&relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative)&&path.basename(target).startsWith('m849-direction-copy-'))fs.rmSync(target,{recursive:true,force:true});
});

describe('M849 actual r2 display semantics',()=>{
 it('distinguishes an unresolved balanced direction from numeric consistency and summarizes real unknown-time reasons without losing paths or diagnostics',()=>{
  expect(createHash('sha256').update(captureBytes).digest('hex')).toBe('0c21529f76c722a3df91e726ddc274db51bbfc6837f0b727e26341471e1bbb4d');
  const before=JSON.stringify({known,unknown}),knownPaths=retained(known);
  expect(known.status).toBe('unique-consistent-regime');expect(knownPaths).toHaveLength(1);
  const opinion=knownPaths[0].opinion!;expect(opinion).not.toBeNull();expect(opinion.primary).toEqual([]);expect(opinion.secondary).toEqual([]);expect(opinion.avoid).toEqual([]);
  expect(opinion.alternatives.map(value=>value.id)).toEqual(['balanced-protect','balanced-circulate']);expect(knownPaths[0].certificate.status).toBe('closed');
  const knownHtml=render(known);
  expect(knownHtml).toContain('一条一致路径，取用方向待定');expect(knownHtml).toContain('取用方向尚未确定');
  expect(knownHtml).not.toContain('本次预览得到一项一致的项目结论');expect(knownHtml).not.toContain('项目主方向：');
  expect(knownHtml).toContain('尚未确定主辅用');expect(knownHtml).toContain('balanced-protect');

  const unknownHtml=render(unknown),visible=summary(unknownHtml),details=unknownHtml.slice(unknownHtml.indexOf('<details class="v132-source">'));
  const paths=retained(unknown),ids=unknown.branches.flatMap(branch=>[branch.id,branch.root.profileId,...branch.root.regimes.map(regime=>regime.id)]);
  expect(unknown.status).toBe('pending-regime-resolution');expect(paths).toHaveLength(4);
  expect(unknownHtml).toContain('出生时刻未知，当前仅展示可能时段分支，结果待定。');expect(unknownHtml).toContain('不选其中一条代表整体');
  expect(unknownHtml.match(/class="v132-regime"/g)).toHaveLength(4);expect(visible.match(/<li>/g)).toHaveLength(7);
  for(const id of ids){expect(visible).not.toContain(id);expect(details).toContain(id);}
  for(const reason of rawReasons(unknown)){const escaped=renderToStaticMarkup(<li>{reason}</li>).slice(4,-5);expect(details).toContain(escaped);}
  for(const regime of paths){expect(unknownHtml).toContain(`data-regime-id="${regime.id}"`);if(regime.opinion?.primary.length)expect(unknownHtml).toContain(`项目主方向：<b>${regime.opinion.primary.join('、')}</b>`);}
  expect(visible.match(/缺小时：新根/g)).toHaveLength(1);expect(visible).toContain('balanced-protect、balanced-circulate');
  const reordered=structuredClone(unknown);for(const branch of reordered.branches){branch.root.regimes.reverse();branch.root.consistentIds.reverse();branch.root.possibleIds.reverse();}
  expect(render(reordered)).toBe(unknownHtml);

  // Formatting controls alter only a private diagnostic copy, not any computed opinion.
  const controls=structuredClone(unknown),id=paths[0].id;
  const opaque='aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee：外部记录原文保留。',middle=`正文保留 ${id} 供人工核对。`,similar=`${id}-extra：不同来源的正文。`;
  controls.calendar.warnings.push(opaque,middle,similar);const controlledSummary=summary(render(controls));
  expect(controlledSummary).toContain(opaque);expect(controlledSummary).toContain(middle);expect(controlledSummary).toContain(similar);

  const withDirection=render(historical.cases.unique.dto),multiple=render(historical.cases.multiple.dto);
  expect(withDirection).toContain('本次预览得到一项一致的项目结论（仅供预览）。');expect(withDirection).toContain('项目主方向：<b>');
  expect(multiple).toContain('存在多个一致的项目结论，未合并为唯一结果。');expect(multiple.match(/class="v132-regime"/g)).toHaveLength(retained(historical.cases.multiple.dto).length);
  expect(multiple).toContain('不选其中一条代表整体');
  expect(known.applicationGate.status).toBe('blocked');expect(unknown.applicationGate.status).toBe('blocked');expect(JSON.stringify({known,unknown})).toBe(before);
  fs.writeFileSync(path.join(evidence,'M849-EFFECT.json'),JSON.stringify({known:{status:known.status,opinionObject:true,directions:[],alternatives:opinion.alternatives.map(value=>value.id),heading:'一条一致路径，取用方向待定'},unknown:{status:unknown.status,calendarBranches:unknown.branches.length,retainedPaths:paths.length,rawReasons:rawReasons(unknown).length,summaryReasons:(visible.match(/<li>/g)??[]).length,summaryHasKnownIds:false,rawDiagnosticsPreserved:true},sourceObjectsUnchanged:true,applicationGate:'blocked'},null,2)+'\n');
 },30000);
});
