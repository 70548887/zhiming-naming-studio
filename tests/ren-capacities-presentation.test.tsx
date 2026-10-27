import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it,vi} from 'vitest';
import {analyzeProfile} from '../src/domain/engine';
import {REN_ACTION_METHOD,REN_CAPACITY_METHOD,REN_METHOD,LEGACY_REN_METHOD} from '../src/shared/ren-method';
import {RenCapacitiesView} from '../src/renderer/RenCapacitiesView';
import {RenCommentaryView} from '../src/renderer/RenCommentaryView';
import {renCapacitiesReport} from '../src/main/ren-capacities-report';
import {ditianRenReport} from '../src/main/ditian-ren-report';
import type {BirthProfile,RenCommentaryAnalysis} from '../src/shared/types';

const profile:BirthProfile={id:'ren-capacities-presentation',customerName:'有限能力呈现验收',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2012-03-15',birthTime:'14:00:00',timeUnknown:false,leapMonth:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'',timeBasis:'civil',renMethod:REN_CAPACITY_METHOD};
function outputs(ren:RenCommentaryAnalysis){return[renderToStaticMarkup(<RenCapacitiesView analysis={ren.capacityAnalysis} nodes={ren.structureGraph.nodes}/>),renCapacitiesReport(ren.capacityAnalysis)];}

describe('actual analyzer outputs keep local positive capacity distinct from net effect in UI and report',()=>{
  it.each([{birthDate:'2012-03-15',birthTime:'14:00:00'},{birthDate:'2003-04-01',birthTime:'22:00:00'}])('shows both source-supported positive abilities on $birthDate',example=>{
    const ren=analyzeProfile({...profile,...example}).renCommentary!;
    expect(ren.capacityAnalysis!.checks.every(c=>c.capability==='met')).toBe(true);
    expect(ren.structureGraph.nodes.filter(node=>node.layer==='hidden'&&node.branch==='辰').map(node=>node.symbol)).toEqual(['戊','乙','癸']);
    expect(ren.structureGraph.nodes.filter(node=>node.layer==='hidden'&&node.branch==='未').map(node=>node.symbol)).toEqual(['己','丁','乙']);
    for(const html of outputs(ren)){
      expect(html).toContain('本条木局旺势获原句支持');expect(html).toContain('辰对本木局的生助能力获原句支持');expect(html).toContain('本证明条件齐备');
      expect(html).toContain('净作用：待核');expect(html).toContain('能生助木神');expect(html).toContain('旺之极矣');
      expect(html).toContain('未据本条改写喜用或姓名排序');expect(html).toContain('不推断后续金运');expect(html).toContain('不表示木局永不受金克');
      expect(html).toContain('本盘已知柱的全部所选明藏节点保留');expect(html).toContain('采用域内的未藏丁火');expect(html).toContain('bazi-ditian-ren-capacities-2600158');
      for(const check of ren.capacityAnalysis!.checks)for(const id of check.sourceClauseIds){const reference=ren.capacityAnalysis!.sourceReferences.find(s=>s.id===id)!;expect(html).toContain(reference.locator);}
      expect(html).not.toContain('完整成格已成立');expect(html).not.toContain('有效根气已成立');
    }
    expect(renderToStaticMarkup(<RenCommentaryView analysis={ren}/>)).toContain('木局旺势与辰生助 · 限定能力');expect(ditianRenReport(ren)).toContain('辰对本木局的生助能力获原句支持');
  });
  it.each([
    {name:'unknown hour',input:{timeUnknown:true,birthTime:''},proof:'本证明仍缺条件'},
    {name:'unknown apparent-solar day',input:{timeUnknown:true,birthTime:'',timeBasis:'apparent-solar' as const,birthLongitude:0},proof:'本证明仍缺条件'},
    {name:'outside visible stem range',input:{birthDate:'2000-03-18'},proof:'不在本证明子域'},
    {name:'outside selected complete group',input:{birthTime:'16:00:00'},proof:'不在本证明子域'}
  ])('shows $name as an unproven sufficient path, not absence of all ability',example=>{
    const ren=analyzeProfile({...profile,...example.input}).renCommentary!;expect(ren.capacityAnalysis!.checks.every(c=>c.capability==='unknown')).toBe(true);
    for(const html of outputs(ren)){
      expect(html).toContain('本条局部能力尚待核');expect(html).toContain(example.proof);expect(html).toContain('本条充分证明路径');expect(html).toContain('不能证明该能力在所有路径都不存在');
      expect(html).not.toContain('未中己丁乙及全部原节点保留');expect(html).toContain('净作用：待核');expect(html).not.toContain('辰对本木局的生助能力获原句支持');expect(html).not.toContain('本条木局旺势获原句支持');
    }
  });
  it('adds neither the new section nor its new source to old explicit methods',()=>{
    expect(renCapacitiesReport()).toBe('');expect(renderToStaticMarkup(<RenCapacitiesView/>)).toBe('');
    for(const method of [REN_ACTION_METHOD,REN_METHOD,LEGACY_REN_METHOD,'none' as const]){
      const ren=analyzeProfile({...profile,renMethod:method}).renCommentary;
      expect(ren?.capacityAnalysis).toBeUndefined();
      for(const html of [ditianRenReport(ren),renderToStaticMarkup(<RenCommentaryView analysis={ren}/>)] ){
        expect(html).not.toContain('木局旺势与辰生助 · 限定能力');expect(html).not.toContain('bazi-ditian-ren-capacities-2600158');
      }
    }
  });
  it('escapes source quotations, locations, facts and labels at UI and PDF-HTML boundaries',()=>{
    const ren=analyzeProfile(profile).renCommentary!,capacity=ren.capacityAnalysis!,payload='<script>alert("source")</script>';
    capacity.checks[0].name=payload;capacity.checks[0].sourceGeneral=payload;capacity.checks[0].facts[0].evidence.push(payload);capacity.checks[0].missing.push(payload);capacity.limitations.push(payload);
    capacity.sourceReferences.find(s=>s.id==='wood-group-chen-vigour')!.quote=payload;capacity.sourceReferences.find(s=>s.id==='wood-group-chen-vigour')!.locator='<img src=x onerror=alert(1)>';
    for(const html of outputs(ren)){expect(html).not.toContain('<script>');expect(html).not.toContain('<img src=x');expect(html).toContain('&lt;script&gt;');expect(html).toContain('&lt;img');}
  });
  it('keeps duplicate clause names across independent publications as distinct React source identities',()=>{
    const error=vi.spyOn(console,'error').mockImplementation(()=>{});
    try{const ren=analyzeProfile(profile).renCommentary!;renderToStaticMarkup(<RenCommentaryView analysis={ren}/>);expect(error.mock.calls.flat().join(' ')).not.toContain('same key');}finally{error.mockRestore();}
  });
});
