import { describe,expect,it } from 'vitest';
import legacy0 from './fixtures/bazi-legacy-output-examples.json';
import legacy1 from './fixtures/bazi-v1-output-examples.json';
import legacy2 from './fixtures/bazi-v2-output-examples.json';
import legacy3 from './fixtures/bazi-v3-output-examples.json';
import { analyzeProfile,BAZI_RULE_VERSION } from '../src/domain/engine';
import { calculateLegacyBazi } from '../src/domain/bazi-legacy';
import { calculateBaziV1 } from '../src/domain/bazi-v1';
import { calculateBaziV2 } from '../src/domain/bazi-v2';
import { calculateBaziV3,BAZI_V3_RULE_VERSION } from '../src/domain/bazi-v3';
import { validBaziSnapshot,baziSnapshotStatus } from '../src/main/bazi-snapshot';
import { resolveBirthContext } from '../src/shared/civil-birth';
import { resolveBirthContext as resolveFrozenContext } from '../src/shared/civil-birth-v1';
import { expectedBazi } from '../src/main/expected-analysis';
import type { BirthProfile } from '../src/shared/types';

const base:BirthProfile={id:'second-precision-fixture',customerName:'秒级精度',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'09:30',timeUnknown:false,leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:''};
const unknown=(birthDate:string,timezone:string):BirthProfile=>({...base,birthDate,timezone,timeUnknown:true,birthTime:''});
const localAt=(epoch:number,timezone:string)=>new Intl.DateTimeFormat('en-GB',{timeZone:timezone,dateStyle:'short',timeStyle:'medium'}).format(new Date(epoch));

describe('complete unknown civil-date ranges at historical second-resolution boundaries',()=>{
  it.each([
    {date:'1972-01-07',zone:'Africa/Monrovia',start:'1972-01-07T00:44:30.000Z',oldStart:'1972-01-07T00:45:00.000Z',wall:'00:44:30'},
    {date:'1912-01-01',zone:'Africa/Abidjan',start:'1912-01-01T00:16:08.000Z',oldStart:'1912-01-01T00:17:00.000Z',wall:'00:16:08'}
  ])('includes the exact first valid second for $zone $date',({date,zone,start,oldStart,wall})=>{
    const p=unknown(date,zone),context=resolveBirthContext(p),frozen=resolveFrozenContext(p);
    expect(new Date(context.startEpoch).toISOString()).toBe(start);
    expect(new Date(frozen.startEpoch).toISOString()).toBe(oldStart);
    expect(localAt(context.startEpoch,zone).endsWith(wall)).toBe(true);
    expect(localAt(context.startEpoch-1000,zone).slice(0,10)).not.toBe(localAt(context.startEpoch,zone).slice(0,10));
    const known=analyzeProfile({...p,timeUnknown:false,birthTime:wall}).bazi;
    expect(known.evidence!.monthAuthority.segments[0].startAt).toBe(start);
    const bazi=analyzeProfile(p).bazi;
    expect(bazi.evidence!.monthAuthority.segments[0].startAt).toBe(start);
    expect(bazi.pillars.some(pillar=>pillar.label==='时柱')).toBe(false);
    expect(validBaziSnapshot(bazi,p)).toBe(true);
  });

  it('includes a final partial minute before the civil calendar jumps to its next date',()=>{
    const p=unknown('1911-12-31','Africa/Bissau'),context=resolveBirthContext(p),frozen=resolveFrozenContext(p);
    expect(new Date(context.endEpoch).toISOString()).toBe('1912-01-01T00:59:59.000Z');
    expect(localAt(context.endEpoch,p.timezone)).toBe('31/12/1911, 23:57:39');
    expect(localAt(context.endEpoch+1000,p.timezone)).toBe('01/01/1912, 00:00:00');
    expect(context.endEpoch-frozen.endEpoch).toBe(40000);
    expect(analyzeProfile(p).bazi.evidence!.monthAuthority.segments.at(-1)!.endAt).toBe('1912-01-01T00:59:59.000Z');
  });

  it('keeps known folds first, unknown final folds complete and noon gaps valid without manufacturing a time pillar',()=>{
    const cairo=resolveBirthContext(unknown('2024-10-31','Africa/Cairo'));
    expect(cairo.endEpoch-cairo.startEpoch+1000).toBe(25*3600000);
    expect(new Date(cairo.endEpoch).toISOString()).toBe('2024-10-31T21:59:59.000Z');
    const known=resolveBirthContext({...base,birthDate:'2024-10-31',birthTime:'23:30:25',timezone:'Africa/Cairo'});
    expect(new Date(known.instantEpoch).toISOString()).toBe('2024-10-31T20:30:25.000Z');expect(known.ambiguous).toBe(true);
    const juba=unknown('2000-01-15','Africa/Juba'),resolved=resolveBirthContext(juba);
    expect(resolved.endEpoch-resolved.startEpoch+1000).toBe(23*3600000);
    expect(analyzeProfile(juba).bazi.pillars.map(p=>p.label)).toEqual(['年柱','月柱','日柱']);
  });

  it('refuses a wholly skipped civil date and still retains a bounded complete ordinary date',()=>{
    expect(()=>resolveBirthContext(unknown('2011-12-30','Pacific/Apia'))).toThrow('所选民用日期');
    const ordinary=resolveBirthContext(unknown('2024-02-10','Asia/Shanghai'));
    expect(ordinary.endEpoch-ordinary.startEpoch+1000).toBe(24*3600000);
  });
});

describe('second-precision current summaries and frozen pre-fix snapshots',()=>{
  it('shows the two distinct precise Li Chun inputs in the main summary while retaining their exact pillar change',()=>{
    const before={...base,birthDate:'2024-02-04',birthTime:'16:27:06'},after={...before,birthTime:'16:27:07'};
    const a=analyzeProfile(before).bazi,b=analyzeProfile(after).bazi;
    expect(a.solarDate).toBe('2024-02-04 16:27:06');expect(b.solarDate).toBe('2024-02-04 16:27:07');
    expect(a.pillars.slice(0,2).map(p=>p.gan+p.zhi)).toEqual(['癸卯','乙丑']);
    expect(b.pillars.slice(0,2).map(p=>p.gan+p.zhi)).toEqual(['甲辰','丙寅']);
    expect(analyzeProfile(base).bazi.solarDate).toBe('2024-02-10 09:30:00');
    expect(calculateBaziV3(before).solarDate).toBe('2024-02-04 16:27');
    expect(a.version).toBe(BAZI_RULE_VERSION);expect(a.version).toContain('/1.9.0;');
    expect(a.evidence!.version).toBe('bazi-evidence-profile/1.7.0');
  });

  it('preserves all saved1.0,1.1,1.2 and1.3 fixtures rather than rewriting their old summaries or endpoints',()=>{
    for(const fixture of legacy0.cases){expect(calculateLegacyBazi(fixture.profile as BirthProfile)).toEqual(fixture.expected);expect(validBaziSnapshot(fixture.expected,fixture.profile as BirthProfile)).toBe(true);}
    for(const fixture of legacy1.cases){expect(calculateBaziV1(fixture.profile as BirthProfile)).toEqual(fixture.expected);expect(validBaziSnapshot(fixture.expected,fixture.profile as BirthProfile)).toBe(true);}
    for(const fixture of legacy2.cases){expect(calculateBaziV2(fixture.profile as BirthProfile)).toEqual(fixture.expected);expect(validBaziSnapshot(fixture.expected,fixture.profile as BirthProfile)).toBe(true);}
    for(const fixture of legacy3.cases){
      const p=fixture.profile as BirthProfile;expect(calculateBaziV3(p)).toEqual(fixture.expected);expect(baziSnapshotStatus(fixture.expected,p)).toBe('verified-legacy');
      expect(expectedBazi(p,BAZI_V3_RULE_VERSION)).toEqual(fixture.expected);
    }
  });

  it('rejects grafting repaired summaries or repaired date endpoints onto an old1.3 version',()=>{
    const fixture=legacy3.cases.find(item=>item.profile.timezone==='Africa/Monrovia')!,p=fixture.profile as BirthProfile;
    const original=fixture.expected,repaired=analyzeProfile(p).bazi;
    expect(original.evidence.monthAuthority.segments[0].startAt).not.toBe(repaired.evidence!.monthAuthority.segments[0].startAt);
    expect(validBaziSnapshot({...repaired,version:BAZI_V3_RULE_VERSION},p)).toBe(false);
    const secondFixture=legacy3.cases[0],q=secondFixture.profile as BirthProfile;
    expect(validBaziSnapshot({...secondFixture.expected,solarDate:analyzeProfile(q).bazi.solarDate},q)).toBe(false);
    expect(validBaziSnapshot({...repaired,version:'unsupported'},p)).toBe(false);
  });
});
