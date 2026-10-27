import { describe,expect,it } from 'vitest';
import frozenV2 from './fixtures/bazi-v2-output-examples.json';
import { analyzeProfile,BAZI_RULE_VERSION } from '../src/domain/engine';
import { calculateBaziV2,BAZI_V2_RULE_VERSION } from '../src/domain/bazi-v2';
import { calculateBaziV1 } from '../src/domain/bazi-v1';
import { calculateLegacyBazi } from '../src/domain/bazi-legacy';
import {
  calculateMonthlySeasonal,evaluateMonthlySeasonalPredicate,monthlySeasonalEntries,monthlySeasonalStemFact,
  MONTHLY_SEASONAL_TABLE_VERSION,type MonthlySeasonalFacts
} from '../src/domain/monthly-seasonal';
import { validBaziSnapshot,baziSnapshotStatus } from '../src/main/bazi-snapshot';
import { expectedAnalysis } from '../src/main/expected-analysis';
import { generateLocal } from '../src/domain/naming';
import dataset from '../data/dataset.json';
import type { Analysis,BirthProfile,CharacterEntry,Citation,MonthlySeasonalPredicate,NamingPreferences } from '../src/shared/types';

const base:BirthProfile={id:'monthly-seasonal-fixture',customerName:'逐月初始参考',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'09:30',timeUnknown:false,leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:''};
const chosen:BirthProfile={...base,seasonalMethod:'qiongtong-2294674-initial/1.0.0'};
const predicate=(stem:string,present=true,scope:'exposed'|'hidden'|'any'='any',includeDayMaster=false):MonthlySeasonalPredicate=>({kind:'stem',stem,scope,includeDayMaster,present});
const facts:MonthlySeasonalFacts={dayMaster:'甲',stems:[{pillar:'日柱',stem:'甲'},{pillar:'年柱',stem:'丙'},{pillar:'月柱',stem:'癸'},{pillar:'时柱',stem:'戊'}],hiddenStems:[{pillar:'年柱',branch:'辰',stem:'癸'},{pillar:'月柱',branch:'寅',stem:'甲'},{pillar:'时柱',branch:'巳',stem:'庚'}],complete:true};

describe('scope-explicit three-valued monthly source-condition checking',()=>{
  it('distinguishes exposed, hidden, day-master-only and actually absent stems',()=>{
    expect(evaluateMonthlySeasonalPredicate(predicate('丙',true,'exposed'),facts).result).toBe('met');
    expect(evaluateMonthlySeasonalPredicate(predicate('庚',true,'hidden'),facts).result).toBe('met');
    expect(evaluateMonthlySeasonalPredicate(predicate('庚',true,'exposed'),facts).result).toBe('not-met');
    expect(evaluateMonthlySeasonalPredicate(predicate('辛',false,'any'),facts).result).toBe('met');
    expect(evaluateMonthlySeasonalPredicate(predicate('甲',true,'exposed'),facts).result).toBe('not-met');
    expect(evaluateMonthlySeasonalPredicate(predicate('甲',true,'exposed',true),facts).result).toBe('met');
    const self=monthlySeasonalStemFact('甲',facts);expect(self.dayMasterSame).toBe(true);expect(self.exposedPositions).toEqual([]);expect(self.hiddenPositions).toEqual(['月柱寅']);
  });

  it('never treats unobserved as absent with missing pillars and uses correct all/any/not logic',()=>{
    const incomplete={...facts,complete:false};
    expect(evaluateMonthlySeasonalPredicate(predicate('丙'),incomplete).result).toBe('met');
    expect(evaluateMonthlySeasonalPredicate(predicate('辛'),incomplete).result).toBe('unknown');
    expect(evaluateMonthlySeasonalPredicate(predicate('辛',false),incomplete).result).toBe('unknown');
    expect(evaluateMonthlySeasonalPredicate({kind:'all',items:[predicate('丙'),predicate('辛')]},incomplete).result).toBe('unknown');
    expect(evaluateMonthlySeasonalPredicate({kind:'all',items:[predicate('丙',false),predicate('辛')]},incomplete).result).toBe('not-met');
    expect(evaluateMonthlySeasonalPredicate({kind:'any',items:[predicate('丙'),predicate('辛')]},incomplete).result).toBe('met');
    expect(evaluateMonthlySeasonalPredicate({kind:'not',item:predicate('辛')},incomplete).result).toBe('unknown');
    expect(evaluateMonthlySeasonalPredicate({kind:'not',item:predicate('丙')},incomplete).result).toBe('not-met');
    expect(evaluateMonthlySeasonalPredicate(predicate('辛'),incomplete).missing.join('')).toContain('未见不能证明没有');
  });

  it('refuses undeclared condition scopes, empty operators, unsupported strength rules and excessive recursion',()=>{
    for(const invalid of [{kind:'stem',stem:'辛',scope:'global',includeDayMaster:false,present:true},{kind:'stem',stem:'风',scope:'any',includeDayMaster:false,present:true},{kind:'all',items:[]},{kind:'strong',stem:'甲'}])expect(()=>evaluateMonthlySeasonalPredicate(invalid as never,facts)).toThrow();
    let nested:MonthlySeasonalPredicate=predicate('甲');for(let i=0;i<15;i++)nested={kind:'not',item:nested};
    expect(()=>evaluateMonthlySeasonalPredicate(nested,facts)).toThrow('结构无效');
  });
});

describe('independent fixed-edition monthly references',()=>{
  it('defaults to unselected without repurposing the old coarse-seasonal opinion',()=>{
    const bazi=analyzeProfile(base).bazi;
    expect(bazi.version).toBe(BAZI_RULE_VERSION);expect(bazi.evidence!.version).toBe('bazi-evidence-profile/1.7.0');
    expect(bazi.evidence!.monthlySeasonal!.methodId).toBe('no-monthly/1.0.0');
    expect(bazi.evidence!.monthlySeasonal!.status).toBe('not-selected');
    expect(bazi.evidence!.monthlySeasonal!.cases).toEqual([]);expect(bazi.evidence!.monthlySeasonal!.proposedElements).toEqual([]);
    expect(bazi.evidence!.opinions.map(opinion=>opinion.method)).toEqual(['fuyi','tiaohou']);
    expect(bazi.evidence!.opinions.find(opinion=>opinion.method==='tiaohou')!.profile).toBe('project-seasonal-imagery/1.0.0');
  });

  it('has120 exact source cases and requires a noninvented source sentence for every initial-use role',()=>{
    const entries=monthlySeasonalEntries();expect(entries).toHaveLength(120);
    expect(new Set(entries.map(entry=>entry.dayStem+entry.monthBranch)).size).toBe(120);
    for(const entry of entries){
      expect(entry.sourceQuote.length).toBeGreaterThan(5);expect(entry.sourceLocator).toBeTruthy();
      for(const use of entry.initialUses){expect(use.quote).toBeTruthy();expect(entry.sourceQuote).toContain(use.quote);expect(use.quote).toContain(use.stem);}
      for(const condition of entry.conditions){expect(condition.sourceQuote).toBeTruthy();expect(condition.sourceLocator).toBeTruthy();}
    }
    const yiChou=entries.find(entry=>entry.dayStem==='乙'&&entry.monthBranch==='丑')!;
    expect(yiChou.reviewStatus).toBe('needs-review');expect(yiChou.initialUses).toEqual([]);
  });

  it('retains source roles, separate stem facts and condition outcomes without replacing initial uses automatically',()=>{
    const bazi=analyzeProfile(chosen).bazi,monthly=bazi.evidence!.monthlySeasonal!;
    expect(monthly.methodId).toBe(MONTHLY_SEASONAL_TABLE_VERSION);expect(monthly.cases).toHaveLength(1);
    const item=monthly.cases[0];expect(item.dayMaster).toBe('甲');expect(item.monthBranch).toBe('寅');
    expect(item.sourceId).toBe('bazi-monthly-qiongtong-2294674');expect(item.sourceQuote).toBeTruthy();expect(item.sourceLocator).toBeTruthy();
    expect(item.initialUses.length).toBeGreaterThan(0);expect(item.initialUses.every(use=>use.element&&use.quote&&use.sequence>=0)).toBe(true);
    expect(item.conditionBranches.every(condition=>['met','not-met','unknown','not-implemented'].includes(condition.result))).toBe(true);
    expect(monthly.requiresManualReview).toBe(true);
    expect(monthly.proposedElements).toEqual([...new Set(item.initialUses.map(use=>use.element))]);
    expect(item.stemFacts.every(fact=>fact.exposedPositions.every(position=>position!=='日柱'))).toBe(true);
  });

  it('checks each of the three real curated source conditions with positive, negative and missing-pillar facts',()=>{
    const entries=monthlySeasonalEntries();
    const sourceConditions=entries.flatMap(entry=>entry.conditions.filter(condition=>condition.predicate));
    expect(sourceConditions).toHaveLength(3);
    const lookup=(id:string)=>sourceConditions.find(condition=>condition.id===id)!.predicate!;
    const empty:MonthlySeasonalFacts={dayMaster:'甲',stems:[{pillar:'日柱',stem:'甲'}],hiddenStems:[],complete:true};
    const exposed={...empty,stems:[...empty.stems,{pillar:'年柱',stem:'庚'},{pillar:'月柱',stem:'丁'},{pillar:'时柱',stem:'戊'}]};
    expect(evaluateMonthlySeasonalPredicate(lookup('jia-hai-three-exposed'),exposed).result).toBe('met');
    expect(evaluateMonthlySeasonalPredicate(lookup('jia-hai-three-exposed'),{...exposed,stems:exposed.stems.filter(fact=>fact.stem!=='戊')}).result).toBe('not-met');
    expect(evaluateMonthlySeasonalPredicate(lookup('jia-hai-three-exposed'),{...exposed,complete:false,stems:exposed.stems.filter(fact=>fact.stem!=='戊')}).result).toBe('unknown');
    const exposedAndHidden={...empty,stems:[...empty.stems,{pillar:'年柱',stem:'庚'}],hiddenStems:[{pillar:'月柱',branch:'丑',stem:'丁'}]};
    expect(evaluateMonthlySeasonalPredicate(lookup('jia-chou-geng-exposed-ding-hidden'),exposedAndHidden).result).toBe('met');
    expect(evaluateMonthlySeasonalPredicate(lookup('jia-chou-geng-exposed-ding-hidden'),{...exposedAndHidden,hiddenStems:[]}).result).toBe('not-met');
    expect(evaluateMonthlySeasonalPredicate(lookup('jia-chou-geng-exposed-ding-hidden'),{...exposedAndHidden,hiddenStems:[],complete:false}).result).toBe('unknown');
    const yi={...empty,dayMaster:'乙',stems:[{pillar:'日柱',stem:'乙'}]};
    expect(evaluateMonthlySeasonalPredicate(lookup('yi-zi-no-bing-anywhere'),yi).result).toBe('met');
    expect(evaluateMonthlySeasonalPredicate(lookup('yi-zi-no-bing-anywhere'),{...yi,hiddenStems:[{pillar:'月柱',branch:'寅',stem:'丙'}]}).result).toBe('not-met');
    expect(evaluateMonthlySeasonalPredicate(lookup('yi-zi-no-bing-anywhere'),{...yi,complete:false}).result).toBe('unknown');
  });

  it('keeps cross-Jie month cases pending with no proposed element union and no fabricated time facts',()=>{
    const p={...chosen,birthDate:'2024-02-04',birthTime:'',timeUnknown:true},bazi=analyzeProfile(p).bazi,monthly=bazi.evidence!.monthlySeasonal!;
    expect(bazi.pillars.map(pillar=>pillar.label)).toEqual(['日柱']);
    expect(monthly.status).toBe('pending');expect(monthly.monthBranches).toEqual(['丑','寅']);expect(monthly.cases).toHaveLength(2);
    expect(monthly.proposedElements).toEqual([]);expect(monthly.limitations.join('')).toContain('月柱交节待定');
    expect(monthly.cases.flatMap(item=>item.stemFacts).every(fact=>fact.absence==='unknown')).toBe(true);
  });

  it('retains a known folded clock as the first instant and rejects nonexistent or oversized date ranges',()=>{
    const p={...chosen,birthDate:'2024-11-03',birthTime:'01:30',timezone:'America/New_York'},bazi=analyzeProfile(p).bazi;
    expect(bazi.evidence!.monthlySeasonal!.limitations.join('')).toContain('第一次实际瞬间');
    expect(bazi.evidence!.timeBasis.ambiguous).toBe(true);
    expect(bazi.evidence!.monthAuthority.segments[0].startAt).toBe('2024-11-03T05:30:00.000Z');
    expect(()=>analyzeProfile({...chosen,birthDate:'2024-03-10',birthTime:'02:30',timezone:'America/New_York'})).toThrow('不存在');
    expect(()=>analyzeProfile({...chosen,birthDate:'2011-12-30',timeUnknown:true,birthTime:'',timezone:'Pacific/Apia'})).toThrow('所选民用日期');
  });

  it('keeps not-implemented branches explicit and verifies only explicitly curated predicates',()=>{
    const entries=monthlySeasonalEntries(),unimplemented=entries.flatMap(entry=>entry.conditions).filter(condition=>!condition.predicate);
    expect(unimplemented.length).toBeGreaterThan(0);
    const bazi=analyzeProfile(chosen).bazi,evidence=bazi.evidence!;
    const revised={...bazi,pillars:bazi.pillars.map(pillar=>pillar.label==='日柱'?{...pillar,gan:entries[0].dayStem}:pillar.label==='月柱'?{...pillar,zhi:entries[0].monthBranch}:pillar)};
    const monthly=calculateMonthlySeasonal(revised,{method:MONTHLY_SEASONAL_TABLE_VERSION,timeUnknown:false,ambiguous:false,monthAuthority:evidence.monthAuthority,stems:evidence.stems,hiddenStems:evidence.hiddenStems});
    for(const condition of monthly.cases[0].conditionBranches)if(!condition.predicate){expect(condition.result).toBe('not-implemented');expect(condition.observedEvidence).toEqual([]);expect(condition.missing.length).toBeGreaterThan(0);}
  });

  it('binds new method, source clauses and predicate outputs in canonical snapshot/cache validation',()=>{
    const current=analyzeProfile(chosen).bazi;
    expect(validBaziSnapshot(current,chosen)).toBe(true);expect(validBaziSnapshot(current,base)).toBe(false);
    const altered=structuredClone(current);altered.evidence!.monthlySeasonal!.cases[0].sourceQuote='伪造原句';
    expect(validBaziSnapshot(altered,chosen)).toBe(false);
    expect(expectedAnalysis(base)).not.toBe(expectedAnalysis(chosen));
    expect(expectedAnalysis({...chosen,seasonalMethod:'no-monthly/1.0.0'})).toBe(expectedAnalysis(base));
  });

  it('leaves existing favorable arithmetic and deterministic name evaluation untouched',()=>{
    const plain=analyzeProfile(base),enabled=analyzeProfile(chosen);
    expect(enabled.bazi.favorable).toEqual(plain.bazi.favorable);expect(enabled.bazi.pillars).toEqual(plain.bazi.pillars);expect(enabled.bazi.elements).toEqual(plain.bazi.elements);
    const pref:NamingPreferences={length:2,generationChar:'',requiredChars:'',forbiddenChars:'',elderTaboo:'',style:'自然',meanings:'平安',industry:'',priority:'balanced',preferredElements:[],zodiacRules:false,numerology:false};
    const run=(analysis:Analysis)=>generateLocal(base,pref,analysis,dataset.characters as CharacterEntry[],dataset.citations as Citation[],93).candidates.map(({id,...candidate})=>candidate);
    expect(run(enabled)).toEqual(run(plain));
  });
});

describe('frozen Bazi1.2/evidence1.1 monthly-method compatibility',()=>{
  it('preserves all original1.2 snapshots and their original month choices without adding monthly seasonal facts',()=>{
    for(const example of frozenV2.cases){
      const p=example.profile as BirthProfile;expect(calculateBaziV2(p)).toEqual(example.expected);expect(example.expected.version).toBe(BAZI_V2_RULE_VERSION);
      expect(validBaziSnapshot(example.expected,p)).toBe(true);expect(baziSnapshotStatus(example.expected,p)).toBe('verified-legacy');
      expect(validBaziSnapshot(example.expected,{...p,seasonalMethod:MONTHLY_SEASONAL_TABLE_VERSION})).toBe(false);
      expect((example.expected.evidence as {monthlySeasonal?:unknown}).monthlySeasonal).toBeUndefined();
    }
  });
  it('refuses newly selected monthly methods on older versions and rejects grafted new evidence',()=>{
    const old=calculateLegacyBazi(base),v1=calculateBaziV1(base),v2=calculateBaziV2(base),current=analyzeProfile(chosen).bazi;
    for(const previous of [old,v1,v2]){expect(validBaziSnapshot(previous,chosen)).toBe(false);expect(validBaziSnapshot({...previous,evidence:current.evidence},base)).toBe(false);}
  });
});
