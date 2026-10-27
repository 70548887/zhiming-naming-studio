import { describe,expect,it,vi,afterEach } from 'vitest';
import * as engine from '../src/domain/engine';
import { expectedAnalysis,expectedBazi } from '../src/main/expected-analysis';
import { validBaziSnapshot } from '../src/main/bazi-snapshot';
import { validQimenSnapshot } from '../src/main/qimen-snapshot';
import { calculateLegacyBazi,LEGACY_BAZI_RULE_VERSION } from '../src/domain/bazi-legacy';
import { calculateBaziV1,BAZI_V1_RULE_VERSION } from '../src/domain/bazi-v1';
import type { BirthProfile } from '../src/shared/types';

const base:BirthProfile={id:'cache-input',customerName:'不可驻留的客户姓名',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'09:30',timeUnknown:false,leapMonth:false,birthPlace:'不可驻留的地点',timezone:'Asia/Shanghai',notes:'不可驻留的客户备注'};
afterEach(()=>vi.restoreAllMocks());

describe('bounded immutable main-process expected-analysis cache',()=>{
  it('shares one trusted computation between Qimen and Bazi validators, independently of untrusted snapshots',()=>{
    const profile={...base,birthDate:'2024-02-13'},original=engine.analyzeProfile(profile);
    const spy=vi.spyOn(engine,'analyzeProfile');
    expect(validQimenSnapshot(original.qimen,original.bazi,profile)).toBe(true);
    expect(validBaziSnapshot(original.bazi,profile)).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
    const altered=structuredClone(original);altered.bazi.favorable=['金'];altered.bazi.elements.木=999;
    expect(validBaziSnapshot(altered.bazi,profile)).toBe(false);
    altered.qimen.palaces[0].heaven='伪造';
    expect(validQimenSnapshot(altered.qimen,original.bazi,profile)).toBe(false);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(validBaziSnapshot(original.bazi,profile)).toBe(true);
  });

  it('deep-freezes all returned arrays and table/source objects and never retains non-computation profile fields',()=>{
    const profile={...base,birthDate:'2024-02-14'},value=expectedAnalysis(profile);
    expect(Object.isFrozen(value)).toBe(true);expect(Object.isFrozen(value.bazi.pillars)).toBe(true);
    expect(Object.isFrozen(value.bazi.evidence!.monthAuthority.reference!.months[0].segments[0])).toBe(true);
    expect(Object.isFrozen(value.bazi.evidence!.sources[0])).toBe(true);expect(Object.isFrozen(value.qimen.palaces[0])).toBe(true);
    expect(()=>{(value.bazi.elements as Record<string,number>).木=999;}).toThrow();
    expect(()=>{(value.bazi.evidence!.monthAuthority.reference!.months as unknown[]).push({});}).toThrow();
    const same=expectedAnalysis({...profile,id:'unrelated-id',customerName:'其他客户姓名',fatherName:'其他父亲',motherName:'其他母亲',surnamePinyin:'unrelated',birthPlace:'其他地点',notes:'其他备注'});
    expect(same).toBe(value);
    expect(JSON.stringify(value)).not.toContain(base.customerName);expect(JSON.stringify(value)).not.toContain(base.notes);expect(JSON.stringify(value)).not.toContain(base.birthPlace);
  });

  it('keeps every calculation input and selected method distinct while normalizing the absent default method',()=>{
    const profile={...base,birthDate:'2024-02-15'},normal=expectedAnalysis(profile);
    expect(expectedAnalysis({...profile,monthAuthorityMethod:'no-fixed-day/1.0.0'})).toBe(normal);
    const variants:Partial<BirthProfile>[]=[{surname:'王'},{gender:'男'},{calendar:'lunar'},{birthDate:'2024-02-16'},{birthTime:'11:30'},{timeUnknown:true},{leapMonth:true},{timezone:'Asia/Tokyo'},{monthAuthorityMethod:'sanming-first-paragraph/1.0.0'},{seasonalMethod:'qiongtong-2294674-initial/1.0.0'}];
    for(const variant of variants)expect(expectedAnalysis({...profile,...variant})).not.toBe(normal);
    const fixed=expectedAnalysis({...profile,monthAuthorityMethod:'sanming-first-paragraph/1.0.0'});
    expect(fixed.bazi.evidence!.monthAuthority.methodId).toBe('sanming-first-paragraph/1.0.0');
    expect(validBaziSnapshot(structuredClone(fixed.bazi),profile)).toBe(false);
  });

  it('rejects malformed or accessor calculation inputs even after a good cache entry exists',()=>{
    const profile={...base,birthDate:'2024-02-17'};expectedAnalysis(profile);
    for(const change of [{monthAuthorityMethod:'invented'},{seasonalMethod:'invented'},{timeUnknown:'yes'},{birthTime:'25:00'},{birthDate:'not-date'},{calendar:'invented'},{leapMonth:0},{surname:7}])expect(()=>expectedAnalysis({...profile,...change} as BirthProfile)).toThrow();
    const accessor={...profile};Object.defineProperty(accessor,'birthDate',{get:()=>profile.birthDate});
    expect(()=>expectedAnalysis(accessor)).toThrow('访问器');
    expect(()=>expectedAnalysis(Object.create(profile))).toThrow('结构无效');
    expect(()=>expectedAnalysis({...profile,birthDate:'2024-03-10',birthTime:'02:30',timezone:'America/New_York'})).toThrow('不存在');
    expect(expectedAnalysis(profile).bazi.solarDate).toContain(profile.birthDate);
  });

  it('evicts old entries after at most128 total analysis or legacy entries without changing their results',()=>{
    const profile={...base,birthDate:'2023-01-01'},first=expectedAnalysis(profile);
    for(let day=1;day<=129;day++){
      const date=new Date(Date.UTC(2023,0,1+day)).toISOString().slice(0,10);
      expectedAnalysis({...profile,birthDate:date});
    }
    const second=expectedAnalysis(profile);expect(second).not.toBe(first);expect(second).toEqual(first);
  });

  it('keeps historical versions separate, frozen and incompatible with a newly selected table method',()=>{
    const profile={...base,birthDate:'2024-02-18'},current=expectedAnalysis(profile).bazi;
    const oldest=expectedBazi(profile,LEGACY_BAZI_RULE_VERSION),previous=expectedBazi(profile,BAZI_V1_RULE_VERSION);
    expect(oldest).toEqual(calculateLegacyBazi(profile));expect(previous).toEqual(calculateBaziV1(profile));
    expect(oldest).not.toBe(previous);expect(previous).not.toBe(current);
    expect(Object.isFrozen(previous.evidence!.hiddenStems)).toBe(true);expect(oldest.evidence).toBeUndefined();
    expect(()=>expectedBazi({...profile,monthAuthorityMethod:'sanming-first-paragraph/1.0.0'},BAZI_V1_RULE_VERSION)).toThrow('旧版快照');
    expect(()=>expectedBazi(profile,'invented-version')).toThrow('未支持');
  });
});
