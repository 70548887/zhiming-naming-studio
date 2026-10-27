import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import fixture from './fixtures/name-imagery-known-chart.json';
import {calculateNameImageryReading,nameImageryProfile,validNameImageryAnalysis,NAME_IMAGERY_VERSION} from '../src/domain/name-imagery';
import {analyzeProfile} from '../src/domain/engine';
import type {BirthProfile,CharacterEntry,NameImageryAnalysis,QimenChart} from '../src/shared/types';
const chart=fixture.chart as QimenChart;
const characters=(name:string)=>[...name].map(char=>structuredClone(fixture.characters.find(entry=>entry.char===char)!)) as CharacterEntry[];
const metadata=(q=chart)=>({profile:nameImageryProfile(),chartSha256:createHash('sha256').update(JSON.stringify(q)).digest('hex')});
const calculate=(name:string,surname='林',q=chart)=>calculateNameImageryReading(surname,name,characters(name),q,metadata(q));
const birth:BirthProfile={id:'imagery-unit',customerName:'意象实验',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2026-10-17',birthTime:'09:30',timeUnknown:false,leapMonth:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:''};

describe('project imagery maps complete element sets without inventing name positions or a traditional verdict',()=>{
  it.each(fixture.cases)('matches pre-product fixed same-chart example: $id',item=>{
    const before=JSON.stringify(chart),result=calculate(item.givenName,item.surname);
    expect(result.unionPalaces).toEqual(item.expectedPalaces);expect(result.characterRows.map(row=>row.palaces)).toEqual(item.expectedCharacterPalaces);expect(result.status).toBe(item.expectedState);
    expect(result.version).toBe(NAME_IMAGERY_VERSION);expect(result.mode).toBe(NAME_IMAGERY_VERSION);expect(result.surnameContext).toBe(item.surname);expect(result.surnameMapping).toBe('not-performed');expect(result.authority).toBe('project-experimental');
    expect(result.goodBadScore).toBeNull();expect(result.formationDecision).toBe('not-evaluated');expect(result.nameEffect).toBe('not-evaluated');expect(result.trueVoid).toBe('not-evaluated');expect(result.trueTomb).toBe('not-evaluated');expect(result.fourHarmRemoval).toBe('not-performed');expect(result.unionPalaces).not.toContain(5);expect(JSON.stringify(chart)).toBe(before);
  });
  it('retains surname background, single names, reversed and duplicate character positions without accumulating force',()=>{
    expect(calculate('安宁','欧阳').unionPalaces).toEqual(calculate('安宁').unionPalaces);expect(calculate('安宁','欧阳上官').surnameContext).toBe('欧阳上官');expect(calculate('宁安').characterRows.map(row=>row.char)).toEqual(['宁','安']);
    expect(calculate('安').unionPalaces).toEqual([2,8]);const repeat=calculate('安安');expect(repeat.characterRows).toHaveLength(2);expect(repeat.palaceReadings.every(reading=>reading.characterIndexes.join(',')==='0,1')).toBe(true);
  });
  it('retains all labels and exact pinyin and basis, and never fills an unresolved label from a pleasant meaning',()=>{
    const synthetic=characters('安');synthetic[0].elements=['土','木'];synthetic[0].elementBasis='合成多元素鲁棒性测试，未改字库';const result=calculateNameImageryReading('林','安',synthetic,chart,metadata());expect(result.unionPalaces).toEqual([2,3,4,8]);expect(result.characterRows[0].elements).toEqual(['土','木']);expect(result.characterRows[0].labelBasis).toBe(synthetic[0].elementBasis);expect(result.characterRows[0].pinyin).toBe('ān');
    const unknown=calculate('厚德');expect(unknown.status).toBe('partial');expect(unknown.unionPalaces).toEqual([]);expect(unknown.characterRows.every(row=>row.state==='unresolved'&&row.elements.length===0)).toBe(true);expect(unknown.characterRows[0].labelSourceId).toBe('editorial-rules');expect(unknown.characterRows[0].dictionarySourceId).toBe('moe-revised');
    const partial=calculate('厚安');expect(partial.status).toBe('partial');expect(partial.unionPalaces).toEqual([2,8]);expect(partial.palaceReadings.every(reading=>reading.characterIndexes.join(',')==='1')).toBe(true);
  });
});

describe('saved chart intersections remain actual palace-scoped structure facts',()=>{
  it('reads the saved earth set and water set differently without calling one harmful or the other a passed name',()=>{
    const earth=calculate('安宁'),water=calculate('沐清');expect(earth.palaceReadings.find(reading=>reading.palace===8)!.observations.some(observation=>observation.kind==='jixing')).toBe(true);
    expect(water.palaceReadings[0]).toMatchObject({palace:1,intersectionStatus:'no-registered-intersection'});expect(water.palaceReadings[0].note).toContain('不是好名通过');
    for(const reading of [...earth.palaceReadings,...water.palaceReadings])expect(reading.snapshot).toEqual(chart.palaces.find(palace=>palace.number===reading.palace));
  });
  it('keeps selected-hour voids and separate tomb tables attached only to the exact intersecting palace',()=>{
    const metal=calculate('钧烨'),qian=metal.palaceReadings.find(reading=>reading.palace===6)!;
    expect(qian.observations.some(observation=>observation.category==='auxiliary'&&observation.kind==='xunkong'&&observation.subjects.join('')==='戌亥')).toBe(true);
    expect(qian.observations.some(observation=>observation.category==='stem-tomb'&&observation.subjects[0]==='丙')).toBe(true);expect(qian.observations.some(observation=>observation.category==='pattern'&&observation.kind==='rumu')).toBe(true);
    for(const reading of metal.palaceReadings)for(const observation of reading.observations){expect(observation.palace).toBe(reading.palace);expect(observation.nameEffect).toBe('not-evaluated');expect(observation.sourceReferences.length).toBeGreaterThan(0);expect(observation.subjects).not.toContain('甲');}
    expect(metal.sourceIds).toContain('project-name-imagery-outer-palaces-v1');expect(metal.sourceIds).toContain('name-imagery-arc-palace-elements');expect(metal.sourceIds).toContain('editorial-rules');expect(metal.sourceIds).toContain('qimen-arc-structural-patterns');
  });
  it('does not reassign whole-layer star or door findings as name-palace observations',()=>{
    const synthetic=structuredClone(chart);const rule=synthetic.patterns!.rules.find(rule=>rule.id==='qimen-stars-fuyin')!;synthetic.patterns!.findings.push({kind:'fuyin',label:'星盘整层原位（合成范围测试）',layer:'stars',palaces:[1,2,3,4,6,7,8,9],subjects:['整层'],ruleId:rule.id,ruleVersion:rule.version,evidence:['合成整层范围，不是单宫姓名关系']});
    const result=calculate('安宁','林',synthetic);expect(result.wholeLayerRulesNotAssigned).toContain(rule.id);expect(result.palaceReadings.every(reading=>reading.observations.every(observation=>observation.kind!=='fuyin'))).toBe(true);expect(result.palaceReadings[0].snapshot.marks).toEqual(chart.palaces.find(palace=>palace.number===2)!.marks);
  });
  it('keeps static sets but no palace observations or noon chart when birth time is unknown',()=>{
    const unavailable=analyzeProfile({...birth,timeUnknown:true,birthTime:''}).qimen;const result=calculate('安宁','林',unavailable);expect(result.status).toBe('chart-unavailable');expect(result.unionPalaces).toEqual([2,8]);expect(result.palaceReadings).toEqual([]);expect(result.characterRows.every(row=>row.chartObservationStatus==='not-assessed')).toBe(true);expect(result.chart.observationStatus).toBe('not-assessed');expect(result.chart.available).toBe(false);
  });
  it('does not backfill missing historical marker modules',()=>{
    const legacy=structuredClone(chart);delete legacy.auxiliary;delete legacy.patterns;delete legacy.stemTombs;const result=calculate('钧烨','林',legacy);expect(result.palaceReadings.every(reading=>reading.observations.length===0)).toBe(true);expect(result.limitations.join('')).toContain('不按今天规则回填');expect(result.limitations.join('')).toContain('不补算');
  });
});

describe('imagery input and canonical snapshot validation refuse grafted fields or guessed labels',()=>{
  it('rejects invalid surname, name length, misordered characters, invalid element or missing source metadata',()=>{
    for(const surname of ['A','林 李','欧阳上官司马',''])expect(()=>calculate('安',surname)).toThrow('姓氏');expect(()=>calculateNameImageryReading('林','安宁知',[...characters('安宁'),...characters('知')],chart,metadata())).toThrow('给名');
    expect(()=>calculateNameImageryReading('林','安宁',characters('安宁').reverse(),chart,metadata())).toThrow('字形');const bad=characters('安');bad[0].elements=['天气' as never];expect(()=>calculateNameImageryReading('林','安',bad,chart,metadata())).toThrow('元素');
    for(const sha of ['','x'.repeat(64),'a'.repeat(63),'A'.repeat(64)])expect(()=>calculateNameImageryReading('林','安',characters('安'),chart,{...metadata(),chartSha256:sha})).toThrow('SHA-256');
    const profile=nameImageryProfile();profile.elementPalaces.土=[5];expect(()=>calculateNameImageryReading('林','安',characters('安'),chart,{...metadata(),profile})).toThrow('固定版本');
  });
  it('validates full result, label snapshot, source, source hash binding and original chart facts',()=>{
    const chars=characters('安宁'),result=calculate('安宁'),candidate={givenName:'安宁',characters:chars};expect(validNameImageryAnalysis(result,birth,candidate,chart,metadata())).toBe(true);
    const edits:((result:NameImageryAnalysis)=>void)[]=[r=>{r.characterRows[0].elements=['水'];},r=>{r.characterRows[0].pinyin='wrong';},r=>{r.unionPalaces=[5];},r=>{r.chart.sha256='f'.repeat(64);},r=>{r.palaceReadings[0].snapshot.star='伪造';},r=>{r.sourceIds=[];},r=>{r.goodBadScore=99 as never;},r=>{r.trueVoid='passed' as never;}];
    for(const edit of edits){const modified=structuredClone(result);edit(modified);expect(validNameImageryAnalysis(modified,birth,candidate,chart,metadata())).toBe(false);}
    const alteredChars=characters('安宁');alteredChars[0].elements=['水'];expect(validNameImageryAnalysis(result,birth,{givenName:'安宁',characters:alteredChars},chart,metadata())).toBe(false);
    const alteredChart=structuredClone(chart);alteredChart.palaces.find(p=>p.number===1)!.earth='变';expect(validNameImageryAnalysis(result,birth,candidate,alteredChart,metadata(alteredChart))).toBe(false);
  });
  it('rejects extra undefined or symbol fields, accessors and sparse arrays instead of silently dropping them',()=>{
    const candidate={givenName:'安宁',characters:characters('安宁')},original=calculate('安宁');const extra=structuredClone(original) as any;extra.extra=undefined;expect(validNameImageryAnalysis(extra,birth,candidate,chart,metadata())).toBe(false);
    const symbol=structuredClone(original) as any;symbol.characterRows[Symbol('extra')]='x';expect(validNameImageryAnalysis(symbol,birth,candidate,chart,metadata())).toBe(false);
    const accessor=structuredClone(original);Object.defineProperty(accessor,'status',{get:()=> 'mapped'});expect(validNameImageryAnalysis(accessor,birth,candidate,chart,metadata())).toBe(false);
    const sparse=structuredClone(original);delete sparse.characterRows[0];expect(validNameImageryAnalysis(sparse,birth,candidate,chart,metadata())).toBe(false);
    let called=0;const meta={...metadata()};Object.defineProperty(meta,'chartSha256',{get(){called++;return original.chart.sha256;}});expect(()=>calculateNameImageryReading('林','安宁',candidate.characters,chart,meta)).toThrow('访问器');expect(called).toBe(0);
  });
});
