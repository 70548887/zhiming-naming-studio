import { describe, expect, it } from 'vitest';
import { analyzeProfile, BAZI_RULE_VERSION } from '../src/domain/engine';
import { baziSnapshotStatus, validBaziSnapshot } from '../src/main/bazi-snapshot';
import { resolveBirthContext, resolveCivil, validCivilBirthProfile } from '../src/shared/civil-birth';
import type { BaziAnalysis, BirthProfile, NamingPreferences } from '../src/shared/types';

const base:BirthProfile={id:'bazi-snapshot-regression',customerName:'隔离校验',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',leapMonth:false,birthTime:'09:30',timeUnknown:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:''};
const profile=(overrides:Partial<BirthProfile>={}):BirthProfile=>({...base,...overrides});
const preferences:NamingPreferences={length:2,generationChar:'',requiredChars:'',forbiddenChars:'',elderTaboo:'',style:'自然',meanings:'平安',industry:'',priority:'balanced',preferredElements:['水'],zodiacRules:false,numerology:false};

describe('current-version Bazi snapshot binding to original birth input',()=>{
  it.each([
    {},
    {birthDate:'2024-02-04',birthTime:'16:26:30'},
    {birthDate:'2024-02-04',birthTime:'16:27:30'},
    {birthDate:'2024-02-04',timeUnknown:true,birthTime:''},
    {timeUnknown:true,birthTime:''},
    {calendar:'lunar',birthDate:'2023-02-01',leapMonth:true},
    {birthDate:'2024-11-03',birthTime:'01:30',timezone:'America/New_York'}
  ] satisfies Partial<BirthProfile>[])('accepts the exact supported snapshot for %j',overrides=>{
    const p=profile(overrides),bazi=analyzeProfile(p).bazi;
    expect(bazi.version).toBe(BAZI_RULE_VERSION);
    expect(validBaziSnapshot(structuredClone(bazi),p)).toBe(true);
    expect(baziSnapshotStatus(bazi,p)).toBe('verified-current');
  });

  it('rejects changed counts, favorables, year/month pillars, explanations and every other system field',()=>{
    const p=profile(),original=analyzeProfile(p).bazi;
    const changes:{label:string;edit:(b:BaziAnalysis)=>void}[]=[
      {label:'elements',edit:b=>{b.elements.木+=1;}},
      {label:'fractional-count',edit:b=>{b.elements.火+=.5;}},
      {label:'favorable',edit:b=>{b.favorable=b.favorable.includes('金')?['水']:['金'];}},
      {label:'unfavorable',edit:b=>{b.unfavorable=['金','木','水','火','土'];}},
      {label:'year-pillar',edit:b=>{b.pillars.find(pillar=>pillar.label==='年柱')!.gan='癸';}},
      {label:'month-pillar',edit:b=>{b.pillars.find(pillar=>pillar.label==='月柱')!.zhi='子';}},
      {label:'hidden-stems',edit:b=>{b.pillars[0].hidden=['癸'];}},
      {label:'ten-god',edit:b=>{b.pillars[0].tenGod='正官';}},
      {label:'solar-date',edit:b=>{b.solarDate='2024-02-11 09:30';}},
      {label:'lunar-date',edit:b=>{b.lunarDate='伪造农历';}},
      {label:'zodiac',edit:b=>{b.zodiac='鼠';}},
      {label:'strength',edit:b=>{b.strength='人为断定';}},
      {label:'reasons',edit:b=>{b.reasons=['篡改后的判断依据'];}},
      {label:'seasonal-advice',edit:b=>{b.seasonalAdvice='人为调候断言';}},
      {label:'warnings',edit:b=>{b.warnings=[];}},
      {label:'rule-description',edit:b=>{b.ruleDescription='伪造规则来源';}}
    ];
    for(const change of changes){const altered=structuredClone(original);change.edit(altered);expect(validBaziSnapshot(altered,p),change.label).toBe(false);}
    expect(validBaziSnapshot({...original,extraUnsupportedSystemField:true},p)).toBe(false);
  });

  it('does not let an unknown-time snapshot acquire a unique year/month or time pillar',()=>{
    const p=profile({birthDate:'2024-02-04',timeUnknown:true,birthTime:''});
    const original=analyzeProfile(p).bazi,known=analyzeProfile(profile({birthDate:p.birthDate,birthTime:'18:00'})).bazi;
    expect(original.pillars.map(pillar=>pillar.label)).toEqual(['日柱']);
    expect(original.favorable).toEqual([]);
    const changed=structuredClone(original);changed.pillars=known.pillars;
    expect(validBaziSnapshot(changed,p)).toBe(false);
    expect(validBaziSnapshot(known,p)).toBe(false);
  });

  it('does not accept a valid snapshot copied from the opposite side of the precise Li Chun instant',()=>{
    const before=profile({birthDate:'2024-02-04',birthTime:'16:26:30'}),after=profile({birthDate:'2024-02-04',birthTime:'16:27:30'});
    expect(validBaziSnapshot(analyzeProfile(before).bazi,after)).toBe(false);
    expect(validBaziSnapshot(analyzeProfile(after).bazi,before)).toBe(false);
  });

  it('permits manual preferred elements as a separate opinion without changing the system Bazi snapshot',()=>{
    const plain=profile(),manual=profile({namingPreferences:preferences}),bazi=analyzeProfile(plain).bazi;
    expect(validBaziSnapshot(bazi,manual)).toBe(true);
    expect(analyzeProfile(manual).bazi).toEqual(bazi);
    expect(manual.namingPreferences!.preferredElements).toEqual(['水']);
  });

  it('refuses unsupported versions without rewriting or silently upgrading their saved fields',()=>{
    const p=profile(),historical={...analyzeProfile(p).bazi,version:'civil-midnight-fuyi-candidate/0.9.0;lunar-typescript/1.8.6'};
    const before=structuredClone(historical);
    expect(baziSnapshotStatus(historical,p)).toBe('unsupported-version');
    expect(validBaziSnapshot(historical,p)).toBe(false);
    expect(historical).toEqual(before);
    expect(validBaziSnapshot(null,p)).toBe(false);
  });
});

describe('shared civil birth validation retains the existing engine semantics',()=>{
  it('rejects a DST gap while accepting real local clocks on both sides',()=>{
    const gap=profile({birthDate:'2024-03-10',birthTime:'02:30',timezone:'America/New_York'});
    expect(validCivilBirthProfile(gap)).toBe(false);
    expect(()=>resolveBirthContext(gap)).toThrow('不存在');
    expect(validCivilBirthProfile({...gap,birthTime:'01:59'})).toBe(true);
    expect(validCivilBirthProfile({...gap,birthTime:'03:00'})).toBe(true);
    expect(validCivilBirthProfile({...gap,timeUnknown:true,birthTime:''})).toBe(true);
  });

  it('keeps the first-occurrence policy for a fold, with the existing warning',()=>{
    const folded=resolveCivil({year:2024,month:11,day:3,hour:1,minute:30,second:0},'America/New_York');
    expect(folded).toEqual({epoch:Date.UTC(2024,10,3,5,30),ambiguous:true});
    const p=profile({birthDate:'2024-11-03',birthTime:'01:30',timezone:'America/New_York'});
    expect(validCivilBirthProfile(p)).toBe(true);
    expect(resolveBirthContext(p).warnings.join('')).toContain('第一次出现');
    expect(validBaziSnapshot(analyzeProfile(p).bazi,p)).toBe(true);
  });

  it('supports midnight gaps and rejects a completely skipped local date',()=>{
    const midnightGap=profile({birthDate:'2018-11-04',birthTime:'08:30',timezone:'America/Sao_Paulo'});
    expect(validCivilBirthProfile(midnightGap)).toBe(true);
    expect(validCivilBirthProfile({...midnightGap,timeUnknown:true,birthTime:''})).toBe(true);
    expect(validCivilBirthProfile({...midnightGap,birthTime:'00:30'})).toBe(false);
    expect(validCivilBirthProfile(profile({birthDate:'2011-12-30',birthTime:'12:00',timezone:'Pacific/Apia'}))).toBe(false);
    expect(validCivilBirthProfile(profile({birthDate:'2011-12-30',timeUnknown:true,birthTime:'',timezone:'Pacific/Apia'}))).toBe(false);
  });

  it('uses the same Gregorian, leap lunar and timezone limits as analysis',()=>{
    expect(validCivilBirthProfile(profile({birthDate:'2024-02-30'}))).toBe(false);
    expect(validCivilBirthProfile(profile({timezone:'Mars/City'}))).toBe(false);
    expect(validCivilBirthProfile(profile({calendar:'lunar',birthDate:'2023-02-01',leapMonth:true}))).toBe(true);
    expect(validCivilBirthProfile(profile({calendar:'lunar',birthDate:'2024-02-01',leapMonth:true}))).toBe(false);
    const tokyo=profile({birthDate:'2024-02-04',birthTime:'17:27:30',timezone:'Asia/Tokyo'});
    expect(resolveBirthContext(tokyo).seasonal.getMonthInGanZhiExact()).toBe('丙寅');
    expect(validBaziSnapshot(analyzeProfile(tokyo).bazi,tokyo)).toBe(true);
  });
});
