import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {analyzeProfile} from '../domain/engine';
import {MonthFollowingRestrictionsView} from './MonthFollowingRestrictionsView';
import {followingRestrictionsReport} from '../main/following-restrictions-report';
import {reportHTML} from '../main/report';
import {catalogSession} from '../../tests/fixtures/catalog-session';
import {classicDisplay} from '../shared/classic-display';
import type {BirthProfile,StudioSettings} from '../shared/types';
const profile:BirthProfile={...catalogSession().profile,birthDate:'2024-02-10',birthTime:'09:30:00'};
const settings:StudioSettings={studioName:'限制参考',contact:'',logoDataUrl:'',apiBaseUrl:'',model:'',timeoutMs:5000,useAi:false,hasApiKey:false};

describe('fixed-edition following restriction display and PDF',()=>{
 it('shows the actual matching rule and keeps nonmatching clauses in a separate disclosure',()=>{
  const data=analyzeProfile(profile).bazi.monthFollowingRestrictions!;
  const html=renderToStaticMarkup(<MonthFollowingRestrictionsView data={data}/>);
  expect(html).toContain('本固定版本原句不取');expect(html).toContain('未命中的原文限制（1）');
  expect(html).toContain('未命中限制不代表从格成立');expect(html).toContain('已确定日干');
  for(const check of data.checks){expect(html).toContain(classicDisplay(check.sourceQuote));expect(html).toContain(check.sourceLocator);}
  expect(html).toContain('不代表所有流派不取');expect(html).not.toContain('全部从格均不成立');expect(html).not.toContain('姓名已验算');
 });
 it('preserves uncertainty for solar unknown input even though day-master evidence is absent',()=>{
  const bazi=analyzeProfile({...profile,birthTime:'',timeUnknown:true,timeBasis:'apparent-solar',birthLongitude:87.6168}).bazi;
  expect(bazi.evidence).toBeUndefined();expect(bazi.monthFollowingRestrictions!.checks.every(check=>check.status==='pending')).toBe(true);
  const ui=renderToStaticMarkup(<MonthFollowingRestrictionsView data={bazi.monthFollowingRestrictions}/>);
  const pdf=followingRestrictionsReport(bazi.monthFollowingRestrictions);
  for(const text of [ui,pdf]){expect(text).toContain('日主或月份待定');expect(text).toContain('待定');expect(text).not.toContain('12:00:00');}
 });
 it('prints stored rules and restrictions without recalculating from mutable profile values',()=>{
  const analysis=analyzeProfile(profile),data=analysis.bazi.monthFollowingRestrictions!;
  const html=reportHTML({...catalogSession(),profile:{...profile,birthDate:'2024-07-08'},analysis},settings);
  expect(html).toContain('月别从格限制');expect(html).toContain(classicDisplay(data.checks[0].sourceQuote));
  expect(html).toContain('已确定日干：甲');expect(html).not.toContain('已确定日干：癸');
  expect(html).toContain(data.version);expect(html).toContain(data.sourceId);
 });
 it('does not append modern restrictions to old reports and escapes every stored string',()=>{
  expect(followingRestrictionsReport()).toBe('');expect(renderToStaticMarkup(<MonthFollowingRestrictionsView/>)).toBe('');
  const data=structuredClone(analyzeProfile(profile).bazi.monthFollowingRestrictions!);
  data.checks[0].name='<script>name</script>';data.checks[0].sourceQuote='<img src=x onerror=bad>';
  data.checks[0].sourceLocator='<locator>';data.limitations=['<svg onload=bad>'];
  for(const html of [followingRestrictionsReport(data),renderToStaticMarkup(<MonthFollowingRestrictionsView data={data}/>)]){
   expect(html).toContain('&lt;script&gt;');expect(html).toContain('&lt;img');expect(html).toContain('&lt;locator&gt;');expect(html).not.toContain('<svg');
  }
 });
});
