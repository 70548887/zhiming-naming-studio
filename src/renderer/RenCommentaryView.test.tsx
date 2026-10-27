import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {analyzeProfile} from '../domain/engine';
import {RenCommentaryView} from './RenCommentaryView';
import {RenMethodField} from './RenMethodField';
import {ExportConfirmation} from './ExportConfirmation';
import {ditianRenReport} from '../main/ditian-ren-report';
import {classicDisplay} from '../shared/classic-display';
import {REN_METHOD} from '../shared/ren-method';
import {catalogSession} from '../../tests/fixtures/catalog-session';
import type {StudioSettings} from '../shared/types';
const base=()=>({...catalogSession().profile,birthDate:'1914-11-25',birthTime:'13:30:00',renMethod:REN_METHOD});
const settings:StudioSettings={studioName:'独立参考',contact:'',logoDataUrl:'',apiBaseUrl:'',model:'',timeoutMs:5000,useAi:false,hasApiKey:false};

describe('independent Ren profile UI and PDF',()=>{
 it('separates author case labels, observed structure and unresolved effectiveness in both surfaces',()=>{
  const ren=analyzeProfile(base()).renCommentary!;
  for(const html of [renderToStaticMarkup(<RenCommentaryView analysis={ren}/>),ditianRenReport(ren)]){
   expect(html).toContain('原书同盘');expect(html).toContain('原作者');expect(html).toContain('有效作用：未裁决');expect(html).toContain('未转成对任意新盘通用的作用规则');
   for(const item of ren.sourceCaseMatches){expect(html).toContain(classicDisplay(item.sourceQuote));expect(html).toContain(item.sourceLocator);}
  }
 });
 it('keeps missing day and hour explicit and does not equate no exemplar with a negative formation',()=>{
  const ren=analyzeProfile({...base(),birthDate:'2024-02-10',timeUnknown:true,birthTime:'',timeBasis:'apparent-solar',birthLongitude:87.6168}).renCommentary!;
  for(const html of [renderToStaticMarkup(<RenCommentaryView analysis={ren}/>),ditianRenReport(ren)]){
   expect(html).toContain('待定');expect(html).toContain('这不表示格局不成立');expect(html).toContain('缺柱时不补造时刻');expect(html).not.toContain('12:00:00');
  }
 });
 it('does not label known-day branch nodes as an unknown day master',()=>{
  const ren=analyzeProfile(base()).renCommentary!;
  for(const html of [renderToStaticMarkup(<RenCommentaryView analysis={ren}/>),ditianRenReport(ren)]){
   expect(html).toContain('本气五行位置，不列十神');expect(html).not.toContain('<td>日主待定</td>');
  }
 });
 it('does not backfill unselected reports, renders the method selector and discloses enabled profile before export',()=>{
  expect(renderToStaticMarkup(<RenCommentaryView/>)).toBe('');expect(ditianRenReport()).toBe('');
  const field=renderToStaticMarkup(<RenMethodField onChange={()=>{}}/>);expect(field).toContain('不启用任注独立参考（默认）');expect(field).toContain('birth-ren-method');
  const profile=base(),analysis=analyzeProfile(profile),session={...catalogSession(),profile,analysis};
  const html=renderToStaticMarkup(<ExportConfirmation session={session} settings={settings} reportDirty={false} busy={false} onClose={()=>{}} onConfirm={()=>{}}/>);
  expect(html).toContain('已启用任注独立参考');expect(html).toContain(REN_METHOD);expect(html).toContain('不代表完整格局裁决');
 });
 it('escapes source quotes, author labels and graph members without trusting source HTML',()=>{
  const ren=structuredClone(analyzeProfile(base()).renCommentary!);
  ren.sourceCaseMatches[0].authorAssertion='<script>case</script>';ren.sourceRules[0].quote='<img src=x onerror=bad>';
  ren.structureGraph.edges[0].memberFacts=['<svg onload=bad>'];ren.sourceCaseMatches[0].sourceQuote='<iframe src=bad>';
  for(const html of [renderToStaticMarkup(<RenCommentaryView analysis={ren}/>),ditianRenReport(ren)]){
   expect(html).toContain('&lt;script&gt;');expect(html).toContain('&lt;img');expect(html).toContain('&lt;svg');expect(html).not.toContain('<iframe');
  }
 });
});
