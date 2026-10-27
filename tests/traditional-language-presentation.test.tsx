import React from 'react';
import {resolve} from 'node:path';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it,vi} from 'vitest';
import {analyzeProfile} from '../src/domain/engine';
import {REN_ACTION_METHOD,REN_METHOD} from '../src/shared/ren-method';
import {RenActionsView} from '../src/renderer/RenActionsView';
import {RenCommentaryView} from '../src/renderer/RenCommentaryView';
import {renActionsReport} from '../src/main/ren-actions-report';
import {YueHomophoneView} from '../src/renderer/YueHomophoneView';
import {yueHomophoneReport} from '../src/main/yue-homophone-report';
import {calculateYueHomophoneReview} from '../src/domain/yue-homophones';
import {loadYueHomophoneData} from '../src/main/yue-homophone-data';
import {loadYueReadingData} from '../src/main/yue-reading-data';
import {calculateYueNameReading,confirmYueNameReading} from '../src/domain/yue-reading';
import type {BirthProfile} from '../src/shared/types';

const profile:BirthProfile={id:'presentation-125',customerName:'隔离呈现核查',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'1914-11-25',birthTime:'13:30:00',timeUnknown:false,leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:'',renMethod:REN_ACTION_METHOD};
const readingData=loadYueReadingData(resolve('data')).data,termsData=loadYueHomophoneData(resolve('data')).data;
const reading=(confirmed=true)=>{const initial=calculateYueNameReading('溫','奕',readingData);return confirmed?confirmYueNameReading(initial,{surname:{tokens:['wan1'],origin:'user',confirmed:true},given:[{tokens:['jik6'],origin:'user',confirmed:true}]}):initial;};

describe('conditional traditional actions and limited language review are clear in the saved presentation',()=>{
  it('keeps same clause IDs from independent sources as separate React identities',()=>{
    const error=vi.spyOn(console,'error').mockImplementation(()=>{});
    try{const value=analyzeProfile(profile).renCommentary!;expect(value.sourceRules.filter(source=>source.id==='root-support-damage')).toHaveLength(2);const html=renderToStaticMarkup(<RenCommentaryView analysis={value}/>);expect(html).toContain('bazi-ditian-ren-actions-2600158');expect(error.mock.calls.flat().join(' ')).not.toContain('same key');}finally{error.mockRestore();}
  });
  it('adds no panels to old snapshots that have no optional results',()=>{expect(renActionsReport()).toBe('');expect(yueHomophoneReport()).toBe('');expect(renderToStaticMarkup(<RenActionsView/>)).toBe('');expect(renderToStaticMarkup(<YueHomophoneView/>)).toBe('');expect(analyzeProfile({...profile,renMethod:REN_METHOD}).renCommentary!.actionAnalysis).toBeUndefined();});
  it('renders root identities, actual prerequisite states and traceable source excerpts without an effectiveness verdict',()=>{
    const value=analyzeProfile(profile).renCommentary!.actionAnalysis!,html=renActionsReport(value),view=renderToStaticMarkup(<RenActionsView analysis={value}/>);
    expect(value.rootLinks.length).toBeGreaterThan(0);expect(html).toContain('根联系与条件作用核查');expect(view).toContain('根联系与条件作用核查');
    for(const link of value.rootLinks){expect(html).toContain(link.hiddenStem);expect(html).toContain(link.branch);}
    for(const source of value.sourceReferences){expect(html).toContain(source.locator);expect(view).toContain(source.locator);}
    for(const check of value.checks)expect(html).toContain(check.id);
    expect(html).toContain('力量和救应的缺项继续保留');expect(view).toContain('有效生扶：待核');expect(html).not.toContain('有效作用已成立');
  });
  it('preserves unknown chart conditions and actual missing dependencies',()=>{const value=analyzeProfile({...profile,timeUnknown:true,birthTime:''}).renCommentary!.actionAnalysis!,html=renActionsReport(value);expect(value.input.complete).toBe(false);for(const check of value.checks)for(const item of check.missing)expect(html).toContain(item.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'));expect(html).toContain('待核');});
  it('only displays confirmed exact matches and keeps illness associations distinct from personal attributes',()=>{
    const review=calculateYueHomophoneReview('溫','奕',reading(),'strict',termsData),html=yueHomophoneReport(review),view=renderToStaticMarkup(<YueHomophoneView review={review}/>);
    expect(review.matches.some(match=>match.term==='瘟疫')).toBe(true);for(const output of [html,view]){expect(output).toContain('瘟疫');expect(output).toContain('wan1 jik6');expect(output).toContain('不描述孩子的属性');expect(output).toContain('所选音节与声调一致');expect(output).not.toContain('无不良谐音');}
    for(const match of review.matches)for(const source of match.sourceRefs){expect(html).toContain(source.locator);expect(html).toContain(source.license);}
  });
  it('shows unconfirmed input as not checked and negative results as a finite-table outcome',()=>{
    const unknown=calculateYueHomophoneReview('溫','奕',reading(false),'ignore-tone',termsData);expect(yueHomophoneReport(unknown)).toContain('暂未检查');expect(unknown.matches).toEqual([]);
    const other=confirmYueNameReading(calculateYueNameReading('溫','逸',readingData),{surname:{tokens:['wan1'],origin:'user',confirmed:true},given:[{tokens:['jat6'],origin:'user',confirmed:true}]});const negative=calculateYueHomophoneReview('溫','逸',other,'strict',termsData);expect(yueHomophoneReport(negative)).toContain('有限词表未发现匹配');expect(renderToStaticMarkup(<YueHomophoneView review={negative} summary/>)).toContain('有限词表未发现匹配');
  });
  it('escapes imported text and dictionary excerpts on both UI and report boundaries',()=>{
    const ren=analyzeProfile(profile).renCommentary!.actionAnalysis!;ren.limitations.push('<script>alert(1)</script>');ren.sourceReferences[0].quote='<img onerror=x>';
    const review=calculateYueHomophoneReview('溫','奕',reading(),'strict',termsData);review.matches[0].notice='<script>alert(1)</script>';
    for(const html of [renActionsReport(ren),renderToStaticMarkup(<RenActionsView analysis={ren}/>),yueHomophoneReport(review),renderToStaticMarkup(<YueHomophoneView review={review}/>)]){expect(html).not.toContain('<script>');expect(html).toContain('&lt;script&gt;');}
  });
});
