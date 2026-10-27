import { describe, expect, it } from 'vitest';
import { analyzeProfile, calculateQimenPlate, QIMEN_RULE_VERSION } from '../src/domain/engine';
import { calculateQimenAuxiliary, qimenAuxiliaryPalaceMarks, QIMEN_AUXILIARY_VERSION, validQimenAuxiliarySnapshot } from '../src/domain/qimen-markers';
import type { BirthProfile } from '../src/shared/types';
import examples from './fixtures/qimen-markers-examples.json';

const profile=(extra:Partial<BirthProfile>={}):BirthProfile=>({id:'marker-test',customerName:'测试',surname:'王',surnamePinyin:'wáng',gender:'中性',calendar:'solar',birthDate:'2024-02-10',leapMonth:false,birthTime:'08:30',timeUnknown:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:'',...extra});
const markerSummary=(hourGanzhi:string)=>{
  const result=calculateQimenAuxiliary(hourGanzhi);
  const empty=result.markers.find(marker=>marker.kind==='xunkong')!;
  const horse=result.markers.find(marker=>marker.kind==='yima')!;
  return {voidBranches:empty.branches,voidPalaces:empty.palaces,horseBranch:horse.branches[0],horsePalace:horse.palaces[0]};
};
const reverseKeys=(value:unknown):unknown=>Array.isArray(value)?value.map(reverseKeys):value && typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([key,item])=>[key,reverseKeys(item)])):value;

describe('versioned hour-based Qimen auxiliary facts',()=>{
  it('matches fixed independently supplied branch/palace expectations and negative palace membership',()=>{
    for(const fixture of examples.plateCases) {
      const q=calculateQimenPlate(fixture.input.dayGanzhi,fixture.input.timeGanzhi,fixture.input.solarTerm);
      const summary=markerSummary(fixture.input.timeGanzhi);
      const {xunHead,...expected}=fixture.expected;
      expect(summary,fixture.id).toEqual(expected);
      expect(q.xun.slice(0,2),fixture.id).toBe(xunHead);
      expect(q.auxiliary?.hourGanzhi,fixture.id).toBe(fixture.input.timeGanzhi);
      for(const palace of fixture.absent.voidPalaces) expect(qimenAuxiliaryPalaceMarks(q.auxiliary,palace).some(mark=>mark.startsWith('时旬空')),fixture.id).toBe(false);
      for(const palace of fixture.absent.horsePalaces) expect(qimenAuxiliaryPalaceMarks(q.auxiliary,palace).some(mark=>mark.startsWith('时驿马')),fixture.id).toBe(false);
      for(const palace of q.palaces) expect(palace.marks.filter(mark=>mark.startsWith('时')),fixture.id).toEqual(qimenAuxiliaryPalaceMarks(q.auxiliary,palace.number));
    }
  });

  it('keeps one aggregated void marker while retaining each branch in a shared or split palace',()=>{
    const together=calculateQimenAuxiliary('甲子');
    expect(together.markers).toHaveLength(2);
    expect(together.markers[0].branches).toEqual(['戌','亥']);
    expect(together.markers[0].palaces).toEqual([6]);
    expect(qimenAuxiliaryPalaceMarks(together,6)).toEqual(['时旬空（戌、亥）']);
    const split=calculateQimenAuxiliary('甲申');
    expect(split.markers[0].palaces).toEqual([2,9]);
    expect(qimenAuxiliaryPalaceMarks(split,2)).toEqual(['时旬空（未）']);
    expect(qimenAuxiliaryPalaceMarks(calculateQimenAuxiliary('甲戌'),2)).toEqual(['时旬空（申）','时驿马（申）']);
  });

  it('uses fixed branches without inheriting rotating sectors or center lodging',()=>{
    const centerChief=calculateQimenPlate('戊辰','丙辰','雨水');
    expect(centerChief.chiefStar).toBe('天禽');
    expect(centerChief.auxiliary?.markers[0].palaces).toEqual([1,8]);
    expect(centerChief.palaces.find(p=>p.number===5)?.marks).toEqual(['中五寄坤，天禽随天芮']);
    expect(qimenAuxiliaryPalaceMarks(centerChief.auxiliary,5)).toEqual([]);
    expect(qimenAuxiliaryPalaceMarks(centerChief.auxiliary,2)).toEqual([]);
    const yang=calculateQimenPlate('甲子','辛亥','冬至');
    const yin=calculateQimenPlate('癸亥','辛亥','夏至');
    expect(yang.auxiliary).toEqual(yin.auxiliary);
    expect(yang.dun).not.toBe(yin.dun);
  });

  it('matches civil-hour and seasonal-boundary examples without inventing facts when time is unknown',()=>{
    for(const fixture of examples.civilCases) {
      const analysis=analyzeProfile(profile(fixture.input));
      const day=analysis.bazi.pillars.find(p=>p.label==='日柱')!;
      const time=analysis.bazi.pillars.find(p=>p.label==='时柱')!;
      const {dayGanzhi,timeGanzhi,solarTerm,dun,xunHead,...expected}=fixture.expected;
      expect(day.gan+day.zhi,fixture.id).toBe(dayGanzhi);
      expect(time.gan+time.zhi,fixture.id).toBe(timeGanzhi);
      expect(analysis.qimen.solarTerm,fixture.id).toBe(solarTerm);
      expect(analysis.qimen.dun,fixture.id).toBe(dun);
      expect(analysis.qimen.xun.slice(0,2),fixture.id).toBe(xunHead);
      expect(markerSummary(timeGanzhi),fixture.id).toEqual(expected);
      expect(analysis.qimen.auxiliary?.hourGanzhi,fixture.id).toBe(timeGanzhi);
    }
    const unknown=analyzeProfile(profile({timeUnknown:true,birthTime:''})).qimen;
    expect(unknown.available).toBe(false);
    expect(unknown.auxiliary).toBeUndefined();
    expect(unknown.palaces).toEqual([]);
  });

  it('rejects invalid or impossible stem-branch inputs',()=>{
    for(const input of ['','甲丑','乙子','甲子时',' 甲子','甲子 ',null,undefined,123]) expect(()=>calculateQimenAuxiliary(input as string)).toThrow('六十甲子');
    expect(qimenAuxiliaryPalaceMarks(undefined,1)).toEqual([]);
  });

  it('preserves exact source metadata, conditions, evidence and version in a key-order-independent snapshot',()=>{
    const aux=calculateQimenAuxiliary('辛亥');
    expect(aux.version).toBe(QIMEN_AUXILIARY_VERSION);
    expect(aux.scope).toBe('hour');
    expect(aux.rules.map(rule=>rule.id)).toEqual(['qimen-hour-xunkong','qimen-hour-yima']);
    expect(aux.rules.every(rule=>rule.sources.every(source=>/^[a-f0-9]{40}$/.test(source.commit)))).toBe(true);
    expect(validQimenAuxiliarySnapshot(aux)).toBe(true);
    expect(validQimenAuxiliarySnapshot(JSON.parse(JSON.stringify(aux)))).toBe(true);
    expect(validQimenAuxiliarySnapshot(reverseKeys(aux))).toBe(true);
    expect(QIMEN_RULE_VERSION).toBe('zhuanpan-chaibu-futou-kun2/1.4.0');
  });

  it('rejects imported conclusions whose result, provenance or narrative has been altered',()=>{
    const original=calculateQimenAuxiliary('辛亥');
    const mutations:((aux:any)=>void)[]=[
      aux=>aux.version='hour-xunkong-yima/0.0.0',aux=>aux.scope='day',aux=>aux.hourGanzhi='甲子',
      aux=>aux.rules[0].sources[0].commit='0'.repeat(40),aux=>aux.rules[0].sources[0].url='https://example.com',
      aux=>aux.rules[0].sources[0].id='other',aux=>aux.rules[0].sources[0].locator='other',
      aux=>aux.rules[0].conditions[0]='按日柱',aux=>aux.rules.pop(),aux=>aux.markers[0].palaces=[5],
      aux=>aux.markers[0].branches=['辰','巳'],aux=>aux.markers[1].label='吉马',aux=>aux.markers[0].ruleVersion='0',
      aux=>aux.markers[0].evidence=[],aux=>aux.markers[1].evidence[0]='大吉',aux=>aux.warnings=[],aux=>aux.extra=true
    ];
    for(const mutate of mutations) {
      const copy=JSON.parse(JSON.stringify(original)); mutate(copy);
      expect(validQimenAuxiliarySnapshot(copy)).toBe(false);
    }
    for(const invalid of [undefined,null,[],{},'甲子',{hourGanzhi:'甲丑'}]) expect(validQimenAuxiliarySnapshot(invalid)).toBe(false);
    const cycle:any={hourGanzhi:'甲子'};cycle.self=cycle;
    expect(validQimenAuxiliarySnapshot(cycle)).toBe(false);
  });

  it('returns independent rule/result copies so consumer edits cannot change later calculations',()=>{
    const aux=calculateQimenAuxiliary('甲子');
    aux.rules[0].sources[0].commit='altered';aux.rules[1].conditions.push('altered');aux.markers[0].branches[0]='子';
    const next=calculateQimenAuxiliary('甲子');
    expect(next.rules[0].sources[0].commit).toBe('7d941031d685d818d9fd234edf891dba5bd6a323');
    expect(next.rules[1].conditions).not.toContain('altered');
    expect(next.markers[0].branches).toEqual(['戌','亥']);
    expect(validQimenAuxiliarySnapshot(next)).toBe(true);
  });
});
