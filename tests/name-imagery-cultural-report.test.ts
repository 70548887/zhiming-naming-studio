import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import fixture from './fixtures/name-imagery-known-chart.json';
import {calculateNameImageryReading,nameImageryProfile} from '../src/domain/name-imagery';
import {nameImageryReport} from '../src/main/name-imagery-report';
import type {CharacterEntry,NameImageryAnalysis,QimenChart} from '../src/shared/types';

// Reuse the existing actual saved chart and recorded character labels. This
// maps the fixed comparison fixture; it never recalculates a birth chart.
const chart=fixture.chart as QimenChart;
const imagery=(name='钧烨',savedChart=chart)=>calculateNameImageryReading('林',name,[...name].map(char=>structuredClone(fixture.characters.find(row=>row.char===char)!)) as CharacterEntry[],savedChart,{profile:nameImageryProfile(),chartSha256:createHash('sha256').update(JSON.stringify(savedChart)).digest('hex')});
const text=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
function freeze(value:unknown):void{if(value&&typeof value==='object'){for(const item of Object.values(value))freeze(item);Object.freeze(value);}}

describe('optional project cultural comparison report uses saved labels and saved chart observations',()=>{
  it('keeps historical candidates without analysis empty',()=>{
    expect(nameImageryReport()).toBe('');
    expect(nameImageryReport(undefined)).toBe('');
  });
  it('states the project comparison choice and separates its label convention from a traditional verdict',()=>{
    const html=nameImageryReport(imagery());
    expect(html).toContain('<h2>项目文化比较 · 姓名意象与九宫对照</h2>');
    expect(html).toContain('用已保存的项目元素标签对照宝宝出生盘；标签依据和盘内观察分别列示，不评分、不排序。');
    expect(html).toContain('项目元素标签是项目约定');expect(html).toContain('不等同于词典给出的汉字五行');
    expect(html).toContain('不从字义、寓意、偏旁或读音自动推断');expect(html).toContain('不是传统姓名落宫');expect(html).toContain('姓氏不参与映射');
    // Preserve the old report's complete scope assertion; do not weaken the old test.
    expect(html).toContain('没有成格、姓名作用、真假空墓或四害解除判定');
    expect(html.indexOf('用字标签与依据')).toBeLessThan(html.indexOf('原盘位置与观察'));
    expect(html).toContain('<b>原盘位置：</b>');expect(html).toContain('<b>观察：</b>');
    expect(html).not.toContain('验局通过');
  });
  it('preserves every recorded label, basis, reading and source per position, including repeated characters',()=>{
    const value=imagery('安安'),html=nameImageryReport(value);
    expect(html).toContain('第1位 安 · ān');expect(html).toContain('第2位 安 · ān');
    for(const row of value.characterRows){
      expect(html).toContain(text(row.elements.join('、')));expect(html).toContain(text(row.labelBasis));
      expect(html).toContain('标签来源：'+text(row.labelSourceId));expect(html).toContain('原字记录来源：'+text(row.dictionarySourceId));
      expect(html).toContain(text(row.palaces.map(palace=>`${palace}宫`).join('、')));
      for(const missing of row.missing)expect(html).toContain(text(missing));
    }
    const mixed=imagery('梓涵'),mixedHTML=nameImageryReport(mixed);
    for(const row of mixed.characterRows)expect(mixedHTML).toContain('项目标签：'+text(row.elements.join('、')));
  });
  it('retains saved palace snapshots, observations, references, method versions and the chart hash',()=>{
    const value=imagery(),html=nameImageryReport(value);
    expect(value.chart.sha256).toBe(fixture.sourceChartSha);
    for(const reading of value.palaceReadings){
      for(const saved of [reading.snapshot.trigram,reading.snapshot.direction,reading.snapshot.star,reading.snapshot.door,reading.snapshot.god,reading.snapshot.heaven,reading.snapshot.earth,reading.note,...reading.snapshot.marks])expect(html).toContain(text(saved));
      for(const observation of reading.observations){
        for(const saved of [observation.label,observation.ruleId,observation.ruleVersion,...observation.subjects,...observation.evidence])expect(html).toContain(text(saved));
        for(const source of observation.sourceReferences)for(const saved of [source.id,source.locator,source.version,source.note])expect(html).toContain(text(saved));
      }
    }
    for(const source of value.sourceReferences)for(const saved of [source.id,source.locator,source.version,source.note])expect(html).toContain(text(saved));
    for(const saved of [value.profile.name,value.profile.version,value.version,value.chart.version,value.chart.sha256,...value.limitations,...value.wholeLayerRulesNotAssigned])expect(html).toContain(text(saved));
  });
  it('keeps partial labels unresolved and does not borrow another character’s element or infer it from meaning',()=>{
    const value=imagery('厚安'),html=nameImageryReport(value);
    expect(value.status).toBe('partial');expect(value.characterRows[0].elements).toEqual([]);
    expect(html).toContain('部分用字标签待定');expect(html).toContain('未定字不借用其他字的标签，也不自动补齐');
    expect(html).toContain('项目标签：待定');expect(html).toContain('对照集合：未映射');
    for(const missing of value.characterRows[0].missing)expect(html).toContain(text(missing));
    expect(html).toContain('第1位 厚');expect(html).toContain('第2位 安');expect(html).not.toContain('厚 → 2宫');
    const noIntersection=imagery('沐清');expect(nameImageryReport(noIntersection)).toContain('不是好名通过、无害或已解除四害');
  });
  it('prints only static sets when the supplied saved-chart state is unavailable and does not invent observations',()=>{
    // Explicit unavailable-chart presentation control, not a fabricated saved generation.
    const unavailable:QimenChart={available:false,reason:'出生时刻未知',dun:'',ju:0,yuan:'',solarTerm:'',xun:'',chiefStar:'',chiefDoor:'',palaces:[],reasons:[],warnings:[],version:chart.version};
    const value=imagery('安宁',unavailable),html=nameImageryReport(value);
    expect(value.status).toBe('chart-unavailable');expect(value.palaceReadings).toEqual([]);
    expect(html).toContain('出生参考盘未确定，仅保留静态意象集合，没有盘内观察');
    expect(html).toContain('对照集合：2宫、8宫');expect(html).not.toContain('<div class="name-imagery-observation">');
    expect(html).not.toContain('<b>原盘位置：</b>');expect(html).toContain(value.chart.sha256);
  });
  it('escapes every displayed text boundary, including imported labels, snapshot marks and source metadata',()=>{
    // Deliberately hostile display controls; these do not claim source authentication.
    const payload='<script data-x="a">&'+String.fromCharCode(39)+'marker</script>',encoded='&lt;script data-x=&quot;a&quot;&gt;&amp;&#39;marker&lt;/script&gt;';
    const edits:Array<(value:NameImageryAnalysis)=>void>=[
      value=>{value.characterRows[0].char=payload;},value=>{value.characterRows[0].pinyin=payload;},
      value=>{value.characterRows[0].labelBasis=payload;},value=>{value.characterRows[0].missing=[payload];},
      value=>{Object.assign(value.characterRows[0],{elements:[payload]});},value=>{Object.assign(value.characterRows[0],{labelSourceId:payload});},
      value=>{value.characterRows[0].dictionarySourceId=payload;},value=>{Object.assign(value.characterRows[0],{palaces:[payload]});},
      ...(['trigram','direction','star','door','god','heaven','earth'] as const).map(key=>(value:NameImageryAnalysis)=>{value.palaceReadings[0].snapshot[key]=payload;}),
      value=>{value.palaceReadings[0].snapshot.marks=[payload];},value=>{value.palaceReadings[0].note=payload;},
      value=>{Object.assign(value.palaceReadings[0],{palace:payload});},
      value=>{value.palaceReadings[0].observations[0].label=payload;},value=>{value.palaceReadings[0].observations[0].subjects=[payload];},
      value=>{value.palaceReadings[0].observations[0].evidence=[payload];},value=>{value.palaceReadings[0].observations[0].ruleId=payload;},
      value=>{value.palaceReadings[0].observations[0].ruleVersion=payload;},
      ...(['id','locator','version','note'] as const).map(key=>(value:NameImageryAnalysis)=>{value.palaceReadings[0].observations[0].sourceReferences[0][key]=payload;}),
      value=>{value.wholeLayerRulesNotAssigned=[payload];},value=>{value.limitations=[payload];},value=>{value.profile.name=payload;},
      value=>{Object.assign(value.profile,{version:payload});},value=>{Object.assign(value,{version:payload});},
      value=>{value.chart.version=payload;},value=>{value.chart.sha256=payload;},
      ...(['id','locator','version','note'] as const).map(key=>(value:NameImageryAnalysis)=>{value.sourceReferences[0][key]=payload;}),
    ];
    for(const edit of edits){const value=imagery();edit(value);const html=nameImageryReport(value);expect(html).toContain(encoded);expect(html).not.toContain(payload);expect(html).not.toContain('<script');}
  });
  it('renders a frozen saved-input value without changing labels, sources, chart identity or comparison decisions',()=>{
    const value=imagery(),before=JSON.stringify(value),chartBefore=JSON.stringify(chart);freeze(value);
    expect(nameImageryReport(value)).toContain('项目文化比较');expect(JSON.stringify(value)).toBe(before);expect(JSON.stringify(chart)).toBe(chartBefore);
    expect(value.goodBadScore).toBeNull();expect(value.formationDecision).toBe('not-evaluated');expect(value.nameEffect).toBe('not-evaluated');
    expect(value.trueVoid).toBe('not-evaluated');expect(value.trueTomb).toBe('not-evaluated');expect(value.fourHarmRemoval).toBe('not-performed');
  });
});
