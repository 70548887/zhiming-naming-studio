import React from 'react';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import fixture from './fixtures/name-imagery-known-chart.json';
import {calculateNameImageryReading,nameImageryProfile} from '../src/domain/name-imagery';
import {calculateYueNameReading,confirmYueNameReading} from '../src/domain/yue-reading';
import {loadYueReadingData} from '../src/main/yue-reading-data';
import {nameImageryReport} from '../src/main/name-imagery-report';
import {yueReadingReport} from '../src/main/yue-reading-report';
import {NameImageryView} from '../src/renderer/NameImageryView';
import {YueReadingView} from '../src/renderer/YueReadingView';
import type {CharacterEntry,QimenChart,YueReadingSelections} from '../src/shared/types';

const chart=fixture.chart as QimenChart;
const imagery=(name='钧烨')=>calculateNameImageryReading('林',name,[...name].map(char=>fixture.characters.find(value=>value.char===char)!) as CharacterEntry[],chart,{profile:nameImageryProfile(),chartSha256:createHash('sha256').update(JSON.stringify(chart)).digest('hex')});
const yue=()=>calculateYueNameReading('欧阳','清宁',loadYueReadingData(resolve('data')).data);

describe('saved optional name readings in delivery and accessible detail views',()=>{
  it('does not append new explanatory panels to historical candidates without snapshots',()=>{
    expect(nameImageryReport()).toBe('');expect(yueReadingReport()).toBe('');
    expect(renderToStaticMarkup(<NameImageryView/>)).toBe('');expect(renderToStaticMarkup(<YueReadingView/>)).toBe('');
  });
  it('prints actual saved intersections and source locators while retaining the unresolved traditional scope',()=>{
    const value=imagery(),html=nameImageryReport(value),view=renderToStaticMarkup(<NameImageryView analysis={value}/>);
    for(const text of ['姓名意象与九宫对照','实验','四害解除',value.chart.sha256]){expect(html).toContain(text);expect(view).toContain(text);}
    for(const row of value.characterRows)expect(html).toContain(row.char);
    for(const reading of value.palaceReadings)for(const observation of reading.observations){expect(html).toContain(observation.ruleId);for(const source of observation.sourceReferences)expect(html).toContain(source.locator);}
    expect(view).toContain('<summary>查看保存盘中的对应位置');expect(html).not.toContain('验局通过');expect(value.fourHarmRemoval).toBe('not-performed');expect(html).toContain('没有成格、姓名作用、真假空墓或四害解除判定');
  });
  it('keeps missing character labels unresolved in the delivered table',()=>{
    const html=nameImageryReport(imagery('厚德'));expect(html).toContain('未映射');expect(html).toContain('待定');expect(html).not.toContain('厚 → 2宫');
  });
  it('distinguishes pending full names, individual confirmations and family-entered readings',()=>{
    const initial=yue(),pending=yueReadingReport(initial);expect(pending).toContain('尚未确认');expect(pending).not.toContain('所选字音组合：');
    const choices:YueReadingSelections={surname:{tokens:['au1','joeng4'],origin:'user',confirmed:true},given:[null,null]};
    const partial=confirmYueNameReading(initial,choices);expect(partial.status).toBe('partial');expect(yueReadingReport(partial)).toContain('家庭手工确认；无词典出处声明');expect(yueReadingReport(partial)).not.toContain('所选字音组合：');
    choices.given=[{tokens:['cing1'],origin:'user',confirmed:true},{tokens:['ning4'],origin:'user',confirmed:true}];
    const confirmed=confirmYueNameReading(initial,choices),html=yueReadingReport(confirmed),view=renderToStaticMarkup(<YueReadingView analysis={confirmed}/>);
    expect(html).toContain('au1 joeng4 cing1 ning4');expect(view).toContain('au1 joeng4 cing1 ning4');expect(html).toContain('未进行粤语谐音词检查');expect(view).not.toContain('无不良谐音');
    for(const unit of [initial.surname,...initial.given])for(const candidate of unit.candidates)expect(html).toContain(candidate.sourceFile+':'+candidate.sourceLine);
  });
  it('escapes imported historical explanations and source values at both render boundaries',()=>{
    const image=imagery();image.characterRows[0].labelBasis='<img src=x onerror=alert(1)>';image.limitations.push('<script>payload</script>');
    const reading=yue();reading.limitations.push('<script>payload</script>');
    for(const html of [nameImageryReport(image),renderToStaticMarkup(<NameImageryView analysis={image}/>),yueReadingReport(reading),renderToStaticMarkup(<YueReadingView analysis={reading}/>)] )expect(html).not.toContain('<script>');
    expect(nameImageryReport(image)).toContain('&lt;img');expect(yueReadingReport(reading)).toContain('&lt;script&gt;');
  });
});
