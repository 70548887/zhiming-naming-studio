import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {analyzeProfile} from '../src/domain/engine';
import {REN_DIRECTION_METHOD} from '../src/shared/ren-method';
import type {BirthProfile} from '../src/shared/types';
import {RenDirectionsView} from '../src/renderer/RenDirectionsView';
import {renDirectionsReport} from '../src/main/ren-directions-report';

const profile:BirthProfile={id:'direction-presentation',customerName:'隔离呈现验收',surname:'李',surnamePinyin:'lǐ',gender:'中性',calendar:'solar',birthDate:'2023-02-15',birthTime:'22:00:00',timeUnknown:false,leapMonth:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'',renMethod:REN_DIRECTION_METHOD};
function actual(changes:Partial<BirthProfile>={}){
  const ren=analyzeProfile({...profile,...changes}).renCommentary!;
  return {analysis:ren.directionAnalysis!,nodes:ren.structureGraph.nodes};
}

describe('saved directional local proof in UI and report',()=>{
  it('shows a supported local wood proof despite an unknown hour without adding an hour node',()=>{
    const {analysis,nodes}=actual({timeUnknown:true,birthTime:''});
    expect(analysis.input.complete).toBe(false);
    expect(analysis.checks.find(check=>check.kind==='wood-direction-strength')!.capability).toBe('met');
    expect(nodes.some(node=>node.position==='hour')).toBe(false);
    for(const html of [renderToStaticMarkup(<RenDirectionsView analysis={analysis} nodes={nodes}/>),renDirectionsReport(analysis,nodes)]){
      expect(html).toContain('原句支持本方局部旺势');
      expect(html).toContain('存在未确定柱，只使用实际已定节点');
      expect(html).toContain('本条所需事实若已齐备，局部证明仍可成立');
      expect(html).toContain('净作用、各干有效根气、完整判格及喜用：仍待核');
      expect(html).not.toContain('四柱已确定。');
      const fire=html.slice(html.indexOf('火方与同气日干的局部旺势'));
      expect(fire).toContain('原句前提齐备时才可采用的结论');
      expect(fire).not.toContain('本条已证明的原句结论');
      const wood=html.slice(html.indexOf('木方与同气日干的局部旺势'),html.indexOf('火方与同气日干的局部旺势'));
      expect(wood).toContain('存在未定柱');
      expect(wood).toContain('该项前提符合');
      expect(wood).not.toContain('本证明仍缺条件');
    }
  });
  it.each([
    {name:'metal and earth do not silently remove the wood proof',changes:{birthDate:'1950-03-10'},kind:'wood-direction-strength'},
    {name:'repeated fire branches remain genuine displayed positions',changes:{birthDate:'1977-06-18',birthTime:'14:00:00'},kind:'fire-direction-strength'}
  ] as const)('$name',({changes,kind})=>{
    const {analysis,nodes}=actual(changes),check=analysis.checks.find(item=>item.kind===kind)!;
    expect(check.capability).toBe('met');
    const html=renDirectionsReport(analysis,nodes);
    expect(html).toContain('原句支持本方局部旺势');
    expect(html).toContain('本方已见字位：');
    expect(html).toContain('同气日主字位：');
    expect(html).toContain('bazi-ditian-ren-directions-2600158');
    expect(html).not.toContain('从强已经成立');
  });
  it('keeps an uncertain solar day unknown rather than borrowing the civil-day master',()=>{
    const {analysis,nodes}=actual({timeUnknown:true,birthTime:'',timeBasis:'apparent-solar',birthLongitude:120});
    expect(analysis.input.dayStem).toBeNull();
    expect(analysis.checks.every(check=>check.capability==='unknown')).toBe(true);
    const html=renderToStaticMarkup(<RenDirectionsView analysis={analysis} nodes={nodes}/>);
    expect(html).not.toContain('原句支持本方局部旺势');
    expect(html).toContain('本条尚未证明局部旺势');
    expect(html).not.toContain('本条已证明的原句结论');
  });
  it('escapes source text and stops a report that points at an absent saved node',()=>{
    const {analysis,nodes}=actual(),draft=structuredClone(analysis);
    draft.checks[0].sourceGeneral='<img src=x onerror="untrusted">';
    for(const html of [renderToStaticMarkup(<RenDirectionsView analysis={draft} nodes={nodes}/>),renDirectionsReport(draft,nodes)]){
      expect(html).not.toContain('<img src=x');
      expect(html).toContain('&lt;img');
    }
    draft.checks[0].sourceNodeIds=['absent-saved-node'];
    expect(()=>renDirectionsReport(draft,nodes)).toThrow('缺失字位');
  });
  it('adds no directional output when the saved method lacks this layer',()=>{
    expect(renderToStaticMarkup(<RenDirectionsView/>)).toBe('');
    expect(renDirectionsReport(undefined,[])).toBe('');
  });
});
