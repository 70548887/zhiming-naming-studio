import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {analyzeProfile} from '../domain/engine';
import {REN_METHOD,LEGACY_REN_METHOD} from '../shared/ren-method';
import {RenCommentaryView} from './RenCommentaryView';
import {RenMethodField} from './RenMethodField';
import {ditianRenReport} from '../main/ditian-ren-report';
import {classicDisplay} from '../shared/classic-display';
import {catalogSession} from '../../tests/fixtures/catalog-session';
const base=()=>({...catalogSession().profile,birthDate:'2020-01-04',birthTime:'00:30:00',renMethod:REN_METHOD});
describe('literal necessary decisions without general formation overclaims',()=>{
 it('shows a complete lack of wealth as a scoped contradiction in UI and PDF',()=>{
  const ren=analyzeProfile(base()).renCommentary!;
  for(const html of [renderToStaticMarkup(<RenCommentaryView analysis={ren}/>),ditianRenReport(ren)]){
   expect(html).toContain('从儿必要条件核查');expect(html).toContain('本条必要字面条件不符');expect(html).toContain('已见所需字面成员');expect(html).toContain('仍不代表有效或成格');
   for(const check of ren.necessaryConditions!.checks){expect(html).toContain(classicDisplay(check.sourceQuote));expect(html).toContain(check.sourceLocator);}
  }
 });
 it('does not silently attach new clauses to old1.0 reports or method selection',()=>{
  const ren=analyzeProfile({...base(),renMethod:LEGACY_REN_METHOD}).renCommentary!;
  expect(ren.necessaryConditions).toBeUndefined();expect(ditianRenReport(ren)).not.toContain('从儿必要条件核查');expect(renderToStaticMarkup(<RenCommentaryView analysis={ren}/>)).not.toContain('从儿必要条件核查');
  const field=renderToStaticMarkup(<RenMethodField value={LEGACY_REN_METHOD} onChange={()=>{}}/>);expect(field).toContain('任注1.0（保留原取法）');expect(field).toContain('1.1.0');
 });
 it('keeps solar unknown day pending and escapes source text in the necessary section',()=>{
  const ren=analyzeProfile({...base(),birthDate:'2024-02-10',timeUnknown:true,birthTime:'',timeBasis:'apparent-solar',birthLongitude:87.6168}).renCommentary!;
  ren.necessaryConditions!.checks[0].sourceQuote='<script>bad</script>';
  for(const html of [renderToStaticMarkup(<RenCommentaryView analysis={ren}/>),ditianRenReport(ren)]){expect(html).toContain('资料不足 · 缺项尚不能确定');expect(html).toContain('&lt;script&gt;');expect(html).not.toContain('<script>bad');}
 });
});
