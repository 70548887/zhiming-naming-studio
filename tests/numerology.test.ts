import{describe,it,expect}from'vitest';
import{analyzeNumerology,calculateFiveGrids,numeralElement,talentRelationship,validNumerologySnapshot}from'../src/domain/numerology';
import type{NumerologyRules,NumerologyStrokeData}from'../src/domain/numerology';
const rules:NumerologyRules={version:'fixture',profile:{id:'kumazaki-five-grid',version:'fixture',name:'测试公式',strokePolicy:'explicit fixture records',formulaConvention:'single surname and name add virtual 1'},sources:[],interpretations:{'11':{label:'fixture',keyword:'test',sourceId:'fixture'}}};
const strokes:NumerologyStrokeData={version:'fixture',sources:[],records:[...Object.entries({王:4,安:6,文:4,李:7,明:8,林:8,司:5,徒:10,上:3,官:8})].map(([char,count])=>({id:`fixture-${char}`,character:char,glyph:char,count,sourceId:'fixture',sourceLocator:`fixture:${char}`,note:'unit fixture, not source claim'}))};
const values=(surname:number[],given:number[])=>Object.fromEntries(calculateFiveGrids(surname,given,rules).map(g=>[g.name,g.value]));
describe('fixed five-grid and three-talent calculations',()=>{
  it('calculates all four surname/name shapes using only explicit source strokes',()=>{
    expect(values([4],[6])).toEqual({天格:5,人格:10,地格:7,外格:2,总格:10});
    expect(values([4],[6,4])).toEqual({天格:5,人格:10,地格:10,外格:5,总格:14});
    expect(values([5,10],[6])).toEqual({天格:15,人格:16,地格:7,外格:6,总格:21});
    expect(values([5,10],[8,4])).toEqual({天格:15,人格:18,地格:12,外格:9,总格:27});
  });
  it('keeps raw numbers over 81 and never cycles them into another interpretation',()=>{
    const g=calculateFiveGrids([50,50],[50,50],rules);expect(g.find(x=>x.name==='总格')!.value).toBe(200);expect(g.every(x=>!x.interpretation)).toBe(true);
    expect(numeralElement(10)).toBe('水');expect(numeralElement(81)).toBe('木');expect(numeralElement(82)).toBe('木');expect(numeralElement(100)).toBe('水');
    expect(()=>numeralElement(0)).toThrow();expect(()=>calculateFiveGrids([4,4,4],[8],rules)).toThrow();
  });
  it('uses directional generation/control without fabricating a 125-outcome judgement',()=>{
    expect(talentRelationship('木','火')).toBe('木生火');expect(talentRelationship('火','木')).toBe('木生火（下生上）');expect(talentRelationship('木','土')).toBe('木克土');expect(talentRelationship('水','土')).toBe('土克水（下克上）');expect(talentRelationship('金','金')).toBe('金金同类');
  });
});
describe('source choices and snapshot integrity',()=>{
  it('auto-selects exact unique glyph records and exposes each formula and source',()=>{
    const r=analyzeNumerology('王','安文',strokes,rules);expect(r.status).toBe('complete');expect(r.strokes[0].selectedRecordId).toBe('fixture-王');expect(r.grids).toHaveLength(5);expect(r.threeTalents?.elements).toEqual(['土','水','水']);expect(validNumerologySnapshot(r,'王','安文')).toBe(true);
  });
  it('requires confirmation for a mapped glyph even if only one is present',()=>{
    const d={...strokes,records:[...strokes.records,{id:'chen-trad',character:'陈',glyph:'陳',count:16,sourceId:'fixture',sourceLocator:'fixture:陳',note:'mapping requires confirmation'}]};
    const pending=analyzeNumerology('陈','安',d,rules);expect(pending.status).toBe('pending');expect(pending.grids).toEqual([]);expect(pending.threeTalents).toBeUndefined();
    const done=analyzeNumerology('陈','安',d,rules,{'0':'chen-trad'});expect(done.status).toBe('complete');expect(done.grids[0].value).toBe(17);
  });
  it('never silently chooses a conflicting count, never fabricates missing characters and rejects foreign selection IDs',()=>{
    const d={...strokes,records:[...strokes.records,{...strokes.records[0],id:'other-王',count:5}]};
    const conflict=analyzeNumerology('王','安',d,rules);expect(conflict.status).toBe('pending');expect(conflict.strokes[0].options).toHaveLength(2);
    expect(analyzeNumerology('王','安',d,rules,{'0':'other-王'}).grids[0].value).toBe(6);
    expect(()=>analyzeNumerology('王','安',d,rules,{'0':'fixture-安'})).toThrow('不属于');expect(()=>analyzeNumerology('王','安',d,rules,{'9':'x'})).toThrow('格式');
    expect(analyzeNumerology('未知','安',strokes,rules).status).toBe('pending');expect(analyzeNumerology('宇文某','安',strokes,rules).status).toBe('unsupported');
  });
  it('rejects altered counts, invalid selections and fabricated derived results in imported snapshots',()=>{
    const original=analyzeNumerology('王','安文',strokes,rules);
    for(const change of [(n:any)=>n.grids[0].value++,(n:any)=>n.strokes[0].selectedRecordId='wrong',(n:any)=>n.strokes[0].options[0].count=NaN,(n:any)=>n.strokes[0].options=[null],(n:any)=>n.threeTalents.elements=['火'],(n:any)=>n.status='pending']){const n=structuredClone(original);change(n);expect(validNumerologySnapshot(n,'王','安文')).toBe(false);}
    expect(validNumerologySnapshot(original,'李','安文')).toBe(false);
  });
});
