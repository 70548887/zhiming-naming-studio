import {describe,expect,it} from 'vitest';
import fixtures from './fixtures/qimen-stem-tombs-examples.json';
import frozen from './fixtures/qimen-v2-output-examples.json';
import {calculateQimenStemTombs,qimenStemTombTable,qimenStemTombRules,QIMEN_STEM_TOMBS_VERSION,validQimenStemTombsSnapshot} from '../src/domain/qimen-stem-tombs';
import {analyzeProfile,calculateQimenPlate,QIMEN_RULE_VERSION} from '../src/domain/engine';
import {calculateQimenProfileV2,QIMEN_V2_RULE_VERSION} from '../src/domain/qimen-v2';
import {validQimenSnapshot} from '../src/main/qimen-snapshot';
import {expectedQimen} from '../src/main/expected-analysis';
import{calculateBaziV4}from'../src/domain/bazi-v4';
import type {BirthProfile,QimenPalace,QimenStemTombAnalysis} from '../src/shared/types';

const profile:BirthProfile={id:'stem-tomb-test',customerName:'十干墓支测试',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'09:30:00',timeUnknown:false,leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:''};
const supplied=(palaces:typeof fixtures.plateCases[number]['palaces']):QimenPalace[]=>palaces.map(p=>({...p,direction:'',trigram:'',god:'',marks:[]}));
const reversed=(value:unknown):unknown=>Array.isArray(value)?value.map(reversed):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([key,item])=>[key,reversed(item)])):value;

describe('independent source-attributed explicit heaven-stem tomb table',()=>{
  it('retains all ten literal source rows and matches60 independently transcribed table lookups',()=>{
    const table=qimenStemTombTable();expect(table).toHaveLength(10);
    expect(fixtures.tableChecks).toHaveLength(60);
    for(const fixture of fixtures.tableChecks)expect(table.find(row=>row.stem===fixture.stem)!.palace===fixture.palace,fixture.id).toBe(fixture.expected);
    expect(table.find(row=>row.stem==='乙')).toMatchObject({tombBranch:'戌',palace:6});
    table[0].palace=99;expect(qimenStemTombTable()[0].palace).toBe(2);
    const rules=qimenStemTombRules();rules[0].sources[0].commit='changed';expect(qimenStemTombRules()[0].sources[0].commit).not.toBe('changed');
  });

  it('matches30 independent external plate arrays, including at least3 positives and3 negatives for each explicit stem',()=>{
    expect(fixtures.plateCases).toHaveLength(30);
    const counts=new Map<string,{matched:number;negative:number}>();let hostedHits=0,negativeYin=0;
    for(const fixture of fixtures.plateCases){
      const result=calculateQimenStemTombs(supplied(fixture.palaces));
      expect(result.version).toBe(QIMEN_STEM_TOMBS_VERSION);expect(result.checks).toHaveLength(10);
      for(const expected of fixture.checks){
        const actual=result.checks.find(item=>item.stem===expected.stem)!;
        expect(actual.status,fixture.id+expected.stem).toBe(expected.status);expect(actual.targetPalace).toBe(expected.targetPalace);expect(actual.targetBranch).toBe(expected.targetBranch);
        if(expected.stem==='甲'){expect(actual.observations).toEqual([]);continue;}
        expect(actual.observations).toEqual([{palace:expected.actualPalace,role:expected.lodged?'lodged':'principal'}]);
        const count=counts.get(expected.stem)||{matched:0,negative:0};count[actual.status==='matched'?'matched':'negative']++;counts.set(expected.stem,count);
        if(actual.status==='matched'&&expected.lodged)hostedHits++;
        if(actual.status==='not-matched'&&!fixture.suppliedJu.yang)negativeYin++;
      }
      expect(result.findings.length).toBe(fixture.checks.filter(item=>item.status==='matched').length);
      expect(result.findings.every(finding=>finding.palace!==5)).toBe(true);
      expect(validQimenStemTombsSnapshot(reversed(result),supplied(fixture.palaces))).toBe(true);
    }
    for(const [stem,count] of counts){expect(count.matched,stem).toBeGreaterThanOrEqual(3);expect(count.negative,stem).toBeGreaterThanOrEqual(3);}
    expect(counts.size).toBe(9);expect(hostedHits).toBeGreaterThan(0);expect(negativeYin).toBeGreaterThan(0);
  });

  it('ignores earth stems and center display duplicates while checking the actual hosted stem exactly once',()=>{
    const fixture=fixtures.plateCases.find(item=>item.checks.some(check=>check.status==='matched'&&check.lodged))!;
    const palaces=supplied(fixture.palaces),expected=calculateQimenStemTombs(palaces);
    palaces.find(p=>p.number===5)!.heaven='甲（寄乙）';palaces.find(p=>p.number===5)!.star='not-an-observed-star';palaces.forEach(p=>{p.earth='甲';});
    expect(calculateQimenStemTombs(palaces)).toEqual(expected);
    expect(expected.checks.find(check=>check.stem==='甲')!.status).toBe('not-directly-observed');
    expect(expected.checks.find(check=>check.stem==='甲')!.evidence.join('')).toContain('不从旬首遁仪');
    expect(expected.checks.flatMap(check=>check.observations)).toHaveLength(9);
  });

  it('does not overwrite the old three-qi Yi target or add extra palace marks',()=>{
    const fixture=fixtures.plateCases.find(item=>item.checks.some(check=>check.stem==='乙'&&check.status==='matched'))!;
    const result=calculateQimenPlate(fixture.input.dayGanzhi,fixture.input.hourGanzhi,fixture.input.solarTerm);
    expect(result.stemTombs!.checks.find(item=>item.stem==='乙')!.targetPalace).toBe(6);
    expect(result.patterns!.checks.find(check=>check.ruleId==='qimen-heaven-qi-rumu')!.evidence.join('')).toContain('乙→2');
    expect(result.patterns!.findings.filter(finding=>finding.kind==='rumu').some(finding=>finding.subjects.some(subject=>subject.startsWith('乙')))).toBe(false);
    expect(result.palaces.some(palace=>palace.marks.some(mark=>mark.includes('十干')))).toBe(false);
  });

  it('rejects altered result states, source versions, table targets, hosted positions and malformed plates',()=>{
    const palaces=supplied(fixtures.plateCases[0].palaces),original=calculateQimenStemTombs(palaces);
    const edits:((result:QimenStemTombAnalysis)=>void)[]=[value=>{value.version='invented';},value=>{value.rules[0].sources[0].commit='invented';},value=>{value.checks[1].targetPalace=2;},value=>{value.checks[0].status='not-matched';},value=>{value.checks[1].observations[0].palace=5;},value=>{value.checks[1].evidence=['自行解释'];},value=>{value.findings=[];}];
    for(const edit of edits){const altered=structuredClone(original);edit(altered);expect(validQimenStemTombsSnapshot(altered,palaces)).toBe(false);}
    const duplicate=structuredClone(palaces);duplicate[0].number=duplicate[1].number;expect(()=>calculateQimenStemTombs(duplicate)).toThrow('完整');
    const hidden=structuredClone(palaces);hidden.find(p=>p.number!==5)!.heaven='甲';expect(()=>calculateQimenStemTombs(hidden)).toThrow('实际主');
    const repeat=structuredClone(palaces);const outer=repeat.filter(p=>p.number!==5);outer[0].heaven=outer[1].heaven.replace(/（寄.）/,'');expect(()=>calculateQimenStemTombs(repeat)).toThrow();
  });
});

describe('current chart and frozen pre-ten-stem compatibility',()=>{
  it('attaches the independent reference only to a known current chart and rejects removed or grafted evidence',()=>{
    const current=analyzeProfile(profile);
    expect(current.qimen.version).toBe(QIMEN_RULE_VERSION);expect(current.qimen.version).toContain('/1.4.0');
    expect(validQimenSnapshot(current.qimen,current.bazi,profile)).toBe(true);
    const absent=structuredClone(current.qimen);delete absent.stemTombs;expect(validQimenSnapshot(absent,current.bazi,profile)).toBe(false);
    const hidden=analyzeProfile({...profile,timeUnknown:true,birthTime:''});expect(hidden.qimen.stemTombs).toBeUndefined();expect(validQimenSnapshot(hidden.qimen,hidden.bazi,{...profile,timeUnknown:true,birthTime:''})).toBe(true);
    const injected={...hidden.qimen,stemTombs:current.qimen.stemTombs};expect(validQimenSnapshot(injected,hidden.bazi,{...profile,timeUnknown:true,birthTime:''})).toBe(false);
  });

  it('preserves all six complete captured1.2 charts, never backfills the new table and uses isolated version cache entries',()=>{
    expect(frozen.cases).toHaveLength(6);
    for(const fixture of frozen.cases){
      const input=fixture.profile as BirthProfile,old=calculateQimenProfileV2(input),current=analyzeProfile(input);
      expect(old).toEqual(fixture.expected);expect(old.version).toBe(QIMEN_V2_RULE_VERSION);
      expect(validQimenSnapshot(old,calculateBaziV4(input),input)).toBe(true);expect(old.stemTombs).toBeUndefined();
      expect(expectedQimen(input,QIMEN_V2_RULE_VERSION)).toEqual(old);expect(expectedQimen(input,QIMEN_V2_RULE_VERSION)).not.toBe(expectedQimen(input,QIMEN_RULE_VERSION));
      if(current.qimen.stemTombs)expect(validQimenSnapshot({...old,stemTombs:current.qimen.stemTombs},current.bazi,input)).toBe(false);
    }
  });
});
