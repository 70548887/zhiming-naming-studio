import { describe,expect,it } from 'vitest';
import fixtures from './fixtures/month-authority-examples.json';
import frozenV1 from './fixtures/bazi-v1-output-examples.json';
import { calculateMonthAuthority,locateMonthAuthorityRows,monthAuthorityReference,MONTH_AUTHORITY_TABLE_VERSION } from '../src/domain/month-authority';
import { analyzeProfile,BAZI_RULE_VERSION } from '../src/domain/engine';
import { calculateBaziV1,BAZI_V1_RULE_VERSION } from '../src/domain/bazi-v1';
import { calculateLegacyBazi } from '../src/domain/bazi-legacy';
import { validBaziSnapshot,baziSnapshotStatus } from '../src/main/bazi-snapshot';
import { resolveBirthContext } from '../src/shared/civil-birth';
import type { BirthProfile,Element } from '../src/shared/types';

const base:BirthProfile={id:'month-table-fixture',customerName:'分日转录表定位',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'09:30',timeUnknown:false,leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:''};
const fixed:BirthProfile={...base,monthAuthorityMethod:'sanming-first-paragraph/1.0.0'};
const at=(date:string)=>Date.parse(date);
const context=(startEpoch:number,endEpoch=startEpoch,extra:Partial<{timeUnknown:boolean;ambiguous:boolean}>={})=>({timezone:'Asia/Shanghai',timeUnknown:false,ambiguous:false,method:'sanming-first-paragraph/1.0.0' as const,ranges:[{startEpoch,endEpoch}],...extra});

describe('explicit first-paragraph month table and exact software location boundaries',()=>{
  it('preserves every source term, all 32 rows, quotations and both comparison readings',()=>{
    const reference=monthAuthorityReference();
    expect(reference.months).toHaveLength(12);
    expect(reference.months.flatMap(month=>month.segments)).toHaveLength(32);
    for(const definition of fixtures.definitions){
      const month=reference.months.find(month=>month.monthBranch===definition.monthBranch)!;
      const row=month.segments.find(segment=>segment.fromDay===definition.fromDay)!;
      expect(row).toMatchObject({sourceTerm:definition.sourceTerm,days:definition.days,fromDay:definition.fromDay,toDay:definition.toDay,element:definition.element});
      expect(month.sourceQuote).toContain(definition.sourceTerm);
      expect(month.sourceLocator).toContain('excerpt-codepoint[');
      if(fixtures.unresolvedTerms.includes(definition.sourceTerm))expect(row.normalizedStem).toBeUndefined();
    }
    expect(reference.alternativeViews.map(view=>view.title).join('')).toContain('玉井');
    expect(reference.alternativeViews.map(view=>view.title).join('')).toContain('醉醒子');
    expect(reference.alternativeViews.every(view=>view.sourceQuote.length>100&&!!view.sourceLocator&&!!view.note)).toBe(true);
    reference.months[0].segments[0].sourceTerm='changed';expect(monthAuthorityReference().months[0].segments[0].sourceTerm).not.toBe('changed');
  });

  it('matches all 132 independent boundary-second fixtures without treating endpoints as inclusive table rows',()=>{
    expect(fixtures.boundaries).toHaveLength(132);
    for(const fixture of fixtures.boundaries){
      const result=locateMonthAuthorityRows(fixture.monthBranch,fixture.elapsedSeconds,fixture.elapsedSeconds,31*86400);
      if(fixture.status==='covered')expect(result.candidates,fixture.id).toEqual([expect.objectContaining(fixture.expected!)]);
      else expect(result.candidates,fixture.id).toEqual([]);
      expect(result.candidates.every(candidate=>candidate.stem===undefined)).toBe(true);
    }
  });

  it('clips short actual months and leaves long-month tails unlocated without stretching the table',()=>{
    for(const fixture of fixtures.monthLengthCases){
      const located=locateMonthAuthorityRows(fixture.monthBranch,fixture.elapsedSeconds,fixture.elapsedSeconds,fixture.actualMonthSeconds);
      if(fixture.status==='covered')expect(located.candidates[0].sourceTerm).toBe(fixture.expectedSourceTerm);
      else expect(located.candidates).toEqual([]);
      expect(located.unlocated.length>0).toBe(fixture.status==='uncovered-tail');
    }
    // Actual summer Jie months exceed30 exact days. Locate an instant after the source table ends.
    const month=calculateMonthAuthority(context(at('2024-07-05T12:00:00Z')));
    expect(month.segments[0].elapsedStartDays).toBeGreaterThanOrEqual(30);
    expect(month.candidates).toEqual([]);expect(month.status).toBe('not-evaluated');
    expect(month.segments[0].status).toBe('out-of-table');
    expect(month.segments[0].unlocated?.[0].reason).toContain('超出30日表范围未定位');
  });

  it('defaults to no fixed day limits while always making the original table and divergent readings readable',()=>{
    const month=analyzeProfile(base).bazi.evidence!.monthAuthority;
    expect(month.methodId).toBe('no-fixed-day/1.0.0');expect(month.status).toBe('not-evaluated');
    expect(month.candidates).toEqual([]);expect(month.reference!.months).toHaveLength(12);
    expect(month.reference!.alternativeViews).toHaveLength(2);
    expect(month.method).toContain('未按分日限');
    expect(month.missing.join('')).toContain('未选择固定');
  });

  it('requires explicit method selection and reports transcription terms without silently converting earth terms',()=>{
    const selected=analyzeProfile({...fixed,birthDate:'2024-02-05'}).bazi.evidence!.monthAuthority;
    expect(selected.methodId).toBe(MONTH_AUTHORITY_TABLE_VERSION);
    expect(selected.status).toBe('determined');expect(selected.method).toContain('非唯一司权');
    expect(selected.candidates).toHaveLength(1);expect(selected.candidates[0].sourceTerm).toBe('艮土');
    expect(selected.candidates[0].normalizedStem).toBeUndefined();expect(selected.candidates[0].stem).toBeUndefined();
    expect(()=>analyzeProfile({...fixed,monthAuthorityMethod:'unknown' as never})).toThrow('方法无效');
  });

  it('changes rows precisely after five actual days and splits unknown dates across row and Jie boundaries',()=>{
    const jie=at('2024-02-04T08:27:07Z'),boundary=jie+5*86400000;
    expect(calculateMonthAuthority(context(boundary-1000)).candidates[0].sourceTerm).toBe('艮土');
    expect(calculateMonthAuthority(context(boundary)).candidates[0].sourceTerm).toBe('丙火');
    const unknown=analyzeProfile({...fixed,birthDate:'2024-02-09',birthTime:'',timeUnknown:true}).bazi.evidence!.monthAuthority;
    expect(unknown.status).toBe('uncertain');expect(unknown.candidates.map(candidate=>candidate.sourceTerm)).toEqual(['艮土','丙火']);
    const termDay=analyzeProfile({...fixed,birthDate:'2024-02-04',birthTime:'',timeUnknown:true}).bazi;
    expect(termDay.pillars.map(p=>p.label)).toEqual(['日柱']);
    expect(termDay.evidence!.monthAuthority.status).toBe('uncertain');
    expect(termDay.evidence!.monthAuthority.segments.map(segment=>segment.monthBranch)).toEqual(['丑','寅']);
    expect(termDay.evidence!.monthAuthority.candidates.map(candidate=>candidate.monthBranch)).toEqual(['丑','寅']);
  });

  it('keeps unknown time uncertain even within one row and retains fold ambiguity despite first-occurrence location',()=>{
    const unknown=analyzeProfile({...fixed,birthDate:'2024-02-05',timeUnknown:true,birthTime:''}).bazi.evidence!.monthAuthority;
    expect(unknown.candidates).toHaveLength(1);expect(unknown.status).toBe('uncertain');
    const p={...fixed,birthDate:'2024-11-03',birthTime:'01:30',timezone:'America/New_York'},resolved=resolveBirthContext(p),evidence=analyzeProfile(p).bazi.evidence!;
    expect(resolved.instantEpoch).toBe(Date.UTC(2024,10,3,5,30));
    expect(evidence.monthAuthority.status).toBe('uncertain');
    expect(evidence.monthAuthority.missing.join('')).toContain('第二次未计算');
    expect(evidence.monthAuthority.segments[0].startAt).toBe(evidence.monthAuthority.segments[0].endAt);
  });

  it('binds selected method and exact table/source snapshot to current Bazi validation without affecting favorable arithmetic',()=>{
    const plain=analyzeProfile(base).bazi,chosen=analyzeProfile(fixed).bazi;
    expect(plain.version).toBe(BAZI_RULE_VERSION);expect(plain.evidence!.version).toBe('bazi-evidence-profile/1.7.0');
    expect(chosen.favorable).toEqual(plain.favorable);expect(chosen.elements).toEqual(plain.elements);
    expect(chosen.pillars).toEqual(plain.pillars);expect(chosen.reasons).toEqual(plain.reasons);
    expect(validBaziSnapshot(chosen,fixed)).toBe(true);expect(validBaziSnapshot(chosen,base)).toBe(false);
    expect(validBaziSnapshot(plain,fixed)).toBe(false);
    const changed=structuredClone(chosen);changed.evidence!.monthAuthority.reference!.months[0].segments[0].sourceTerm='己土';
    expect(validBaziSnapshot(changed,fixed)).toBe(false);
  });
});

describe('frozen Bazi1.1 and evidence1.0 historical snapshots',()=>{
  it('accepts all four pre-change snapshots verbatim without adding a table or reinterpreting their method',()=>{
    for(const example of frozenV1.cases){
      const p=example.profile as BirthProfile,expected=example.expected;
      expect(calculateBaziV1(p)).toEqual(expected);
      expect(baziSnapshotStatus(expected,p)).toBe('verified-legacy');
      expect(expected.version).toBe(BAZI_V1_RULE_VERSION);
      expect(validBaziSnapshot(expected,{...p,monthAuthorityMethod:'no-fixed-day/1.0.0'})).toBe(true);
      expect(validBaziSnapshot(expected,{...p,monthAuthorityMethod:MONTH_AUTHORITY_TABLE_VERSION})).toBe(false);
      expect((expected.evidence.monthAuthority as {reference?:unknown}).reference).toBeUndefined();
      expect(expected.evidence.version).toBe('bazi-evidence-profile/1.0.0');
    }
  });

  it('refuses a fixed-day preference on an old1.0 snapshot and rejects new evidence grafted onto either old version',()=>{
    const old=calculateLegacyBazi(base),previous=calculateBaziV1(base),current=analyzeProfile(base).bazi;
    expect(validBaziSnapshot(old,base)).toBe(true);
    expect(validBaziSnapshot(old,fixed)).toBe(false);
    expect(validBaziSnapshot({...old,evidence:current.evidence},base)).toBe(false);
    expect(validBaziSnapshot({...previous,evidence:current.evidence},base)).toBe(false);
    expect(calculateLegacyBazi(base).favorable).toEqual(current.favorable as Element[]);
  });
});
