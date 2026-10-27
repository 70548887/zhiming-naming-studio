import { describe,expect,it } from 'vitest';
import { LunarUtil } from 'lunar-typescript';
import examples from './fixtures/bazi-evidence-examples.json';
import legacy from './fixtures/bazi-legacy-output-examples.json';
import { analyzeProfile,BAZI_RULE_VERSION } from '../src/domain/engine';
import { calculateLegacyBazi,LEGACY_BAZI_RULE_VERSION } from '../src/domain/bazi-legacy';
import { baziEvidenceRules,calculateBaziEvidence,validBaziEvidenceSnapshot,BAZI_EVIDENCE_VERSION } from '../src/domain/bazi-evidence';
import { baziSnapshotStatus,validBaziSnapshot } from '../src/main/bazi-snapshot';
import { resolveBirthContext } from '../src/shared/civil-birth';
import { generateLocal } from '../src/domain/naming';
import dataset from '../data/dataset.json';
import type { Analysis,BaziAnalysis,BaziRelationKind,BirthProfile,CharacterEntry,Citation,NamingPreferences,Pillar } from '../src/shared/types';

const base:BirthProfile={id:'bazi-evidence-test',customerName:'八字证据',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'09:30',timeUnknown:false,leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:''};
const profile=(overrides:Partial<BirthProfile>={}):BirthProfile=>({...base,...overrides});
const context={timezone:'Asia/Shanghai',timeUnknown:false,ambiguous:false,ranges:[{startEpoch:Date.UTC(2024,1,10,1,30),endEpoch:Date.UTC(2024,1,10,1,30)}]};
const elements=['木','火','土','金','水'] as const;
const gan=[...'甲乙丙丁戊己庚辛壬癸'];
function pillar(label:string,stem:string,branch:string):Pillar{return {label,gan:stem,zhi:branch,element:'',hidden:[],tenGod:''};}
function supplied(pillars:Pillar[]):BaziAnalysis{return {...calculateLegacyBazi(base),pillars};}
const sameMembers=(a:string[],b:string[])=>[...a].sort().join('')===[...b].sort().join('');

describe('source-backed Bazi facts and separate project opinions',()=>{
  it('matches all 12 source hidden-stem orders without reusing the old ranking order',()=>{
    expect(examples.hiddenStems).toHaveLength(12);
    for(const example of examples.hiddenStems){
      const analysis=calculateBaziEvidence(supplied([pillar('日柱','甲',example.branch)]),context);
      expect(analysis.hiddenStems.map(fact=>fact.stem),example.branch).toEqual(example.expected);
      expect(analysis.hiddenStems.map(fact=>fact.stem)).toEqual(LunarUtil.ZHI_HIDE_GAN[example.branch]);
      expect(analysis.hiddenStems.map(fact=>fact.order)).toEqual(example.expected.map((_,index)=>index+1));
      expect(analysis.hiddenStems.every(fact=>fact.ruleId==='bazi-hidden-tengod')).toBe(true);
    }
    const current=analyzeProfile(profile({birthTime:'09:30'})).bazi;
    expect(current.pillars.find(p=>p.zhi==='巳')!.hidden).toEqual(['丙','戊','庚']);
    expect(current.evidence!.hiddenStems.filter(fact=>fact.branch==='巳').map(fact=>fact.stem)).toEqual(['丙','庚','戊']);
    expect(current.evidence!.rules.find(rule=>rule.id==='bazi-hidden-tengod')!.conditions.join('')).toContain('不是司权顺序');
  });

  it('matches all 100 independently captured day-master/stem ten-god values and library cross-checks',()=>{
    expect(examples.tenGod).toHaveLength(100);
    for(const example of examples.tenGod){
      const analysis=calculateBaziEvidence(supplied([pillar('日柱',example.dayMaster,'子'),pillar('时柱',example.stem,'丑')]),context);
      expect(analysis.stems.find(fact=>fact.pillar==='时柱')!.tenGod,example.dayMaster+example.stem).toBe(example.expected);
      expect(example.expected).toBe(LunarUtil.SHI_SHEN[example.dayMaster+example.stem]);
    }
    const selected=calculateBaziEvidence(supplied([pillar('日柱','甲','子'),...['甲','丙','戊','庚','壬'].map((stem,index)=>pillar('对照'+index,stem,'丑'))]),context);
    expect(selected.stems.slice(1).map(fact=>fact.relationToDay)).toEqual(['与日主同五行','日主生此干','日主克此干','此干克日主','此干生日主']);
    expect(selected.stems.slice(1).map(fact=>fact.element)).toEqual(elements);
  });

  it('matches 75 externally transcribed positive, reversed/duplicate and incomplete relation fixtures',()=>{
    expect(examples.relationships).toHaveLength(75);
    for(const example of examples.relationships){
      const isStem=example.kind==='stem-combination';
      const p=example.input.map((subject,index)=>pillar(index===0?'日柱':'对照'+index,isStem?subject:'甲',isStem?'子':subject));
      const analysis=calculateBaziEvidence(supplied(p),context);
      const found=analysis.relations.some(relation=>relation.kind===example.kind&&sameMembers(relation.subjects,example.subjects));
      expect(found,example.id).toBe(example.matched);
      expect(analysis.relations.some(relation=>relation.kind==='branch-harm')).toBe(false);
      expect(analysis.relations.some(relation=>relation.candidateElement!==undefined)).toBe(false);
      expect(analysis.transformationEvidence.every(item=>item.status==='not-evaluated'&&item.candidateElement===undefined)).toBe(true);
    }
  });

  it('keeps every actual pair position and never completes a three-branch group with duplicate members',()=>{
    const repeated=calculateBaziEvidence(supplied([pillar('年柱','甲','申'),pillar('月柱','己','子'),pillar('日柱','甲','申'),pillar('时柱','己','子')]),context);
    expect(repeated.relations.filter(relation=>relation.kind==='stem-combination')).toHaveLength(4);
    expect(repeated.relations.filter(relation=>relation.kind==='branch-sanhe')).toEqual([]);
    const complete=calculateBaziEvidence(supplied([pillar('年柱','甲','申'),pillar('月柱','己','子'),pillar('日柱','甲','辰'),pillar('时柱','己','申')]),context);
    const relation=complete.relations.find(item=>item.kind==='branch-sanhe')!;
    expect(relation.subjects).toEqual(['申','子','辰']);
    expect(relation.pillars).toEqual(['年柱','月柱','日柱','时柱']);
  });

  it('records exact twelve-jie intervals without inventing month authority or transformation decisions',()=>{
    const current=analyzeProfile(base).bazi.evidence!;
    expect(current.version).toBe(BAZI_EVIDENCE_VERSION);
    expect(current.monthAuthority.status).toBe('not-evaluated');
    expect(current.monthAuthority.candidates).toEqual([]);
    expect(current.monthAuthority.missing.join('')).toContain('未选择固定分日定位方法');
    expect(current.patternCandidates.every(candidate=>candidate.status==='not-evaluated'&&candidate.supportedBy.length===0&&candidate.missing.length>0)).toBe(true);
    expect(current.transformationEvidence.every(candidate=>candidate.status==='not-evaluated'&&candidate.opposedBy.length===0&&candidate.missing.length>0)).toBe(true);
    const segment=current.monthAuthority.segments[0];
    expect(segment.previousJie).toBe('立春');
    expect(segment.monthBranch).toBe('寅');
    expect(segment.startAt).toBe(segment.endAt);
    expect(segment.elapsedStartDays).toBe((Date.parse(segment.startAt)-Date.parse(segment.previousJieAt))/86400000);
    expect(current.relations.every(relation=>relation.candidateElement===undefined)).toBe(true);
  });

  it('keeps fuyi and seasonal imagery independent and attributed to project heuristics',()=>{
    for(const birthDate of ['2024-01-20','2024-04-10','2024-07-20','2024-10-20']){
      const result=analyzeProfile(profile({birthDate})).bazi,evidence=result.evidence!;
      const fuyi=evidence.opinions.find(opinion=>opinion.method==='fuyi')!,seasonal=evidence.opinions.find(opinion=>opinion.method==='tiaohou')!;
      expect(fuyi.elements).toEqual(result.favorable);expect(fuyi.unfavorable).toEqual(result.unfavorable);
      expect(fuyi.profile).toBe('project-weighted-fuyi/1.0.0');
      expect(seasonal.profile).toBe('project-seasonal-imagery/1.0.0');
      expect(seasonal.evidence.join('')).toContain('不是《穷通宝鉴》');
      expect(evidence.opinions.every(opinion=>opinion.requiresManualReview)).toBe(true);
      if(birthDate.includes('-01-'))expect(seasonal.elements).toEqual(['火']);
      else if(birthDate.includes('-07-'))expect(seasonal.elements).toEqual(['水']);
      else expect(seasonal.elements).toEqual([]);
    }
  });

  it('provides immutable metadata copies and rejects tampered source, relation, opinion and time-range evidence',()=>{
    const result=analyzeProfile(base).bazi,expected=result.evidence!;
    const metadata=baziEvidenceRules();metadata.sources[0].revision='changed';metadata.rules[0].conditions.push('changed');
    expect(baziEvidenceRules().sources[0].revision).not.toBe('changed');
    expect(baziEvidenceRules().rules[0].conditions).not.toContain('changed');
    expect(validBaziEvidenceSnapshot(expected,{expected})).toBe(true);
    for(const edit of [(value:typeof expected)=>{value.sources[0].revision='changed';},(value:typeof expected)=>{value.hiddenStems[0].tenGod='伪造';},(value:typeof expected)=>{value.opinions[0].elements=['金'];},(value:typeof expected)=>{value.monthAuthority.segments[0].startAt='2024-01-01T00:00:00.000Z';}]){
      const altered=structuredClone(expected);edit(altered);expect(validBaziEvidenceSnapshot(altered,{expected})).toBe(false);expect(validBaziSnapshot({...result,evidence:altered},base)).toBe(false);
    }
  });
});

describe('uncertain instants, exact boundaries and preserved historical results',()=>{
  it('does not invent unknown time, year or month facts on a Li Chun day',()=>{
    const result=analyzeProfile(profile({birthDate:'2024-02-04',timeUnknown:true,birthTime:''})).bazi,evidence=result.evidence!;
    expect(evidence.stems.map(fact=>fact.pillar)).toEqual(['日柱']);
    expect(evidence.hiddenStems.every(fact=>fact.pillar==='日柱')).toBe(true);
    expect(evidence.timeBasis.timeUnknown).toBe(true);
    expect(evidence.monthAuthority.segments.map(segment=>segment.monthBranch)).toEqual(['丑','寅']);
    const [before,after]=evidence.monthAuthority.segments;
    expect(Date.parse(after.startAt)-Date.parse(before.endAt)).toBe(1000);
    expect(after.startAt).toBe(after.previousJieAt);
    expect(after.elapsedStartDays).toBe(0);
    expect(evidence.opinions.every(opinion=>opinion.elements.length===0)).toBe(true);
  });

  it('assigns the exact jie second to its new month and keeps UTC+8 calculations consistent across timezones',()=>{
    const p=profile({birthDate:'2024-02-04',birthTime:'16:27:07'}),context=resolveBirthContext(p);
    const segment=analyzeProfile(p).bazi.evidence!.monthAuthority.segments[0];
    expect(segment.previousJie).toBe('立春');expect(segment.monthBranch).toBe('寅');expect(segment.elapsedStartDays).toBe(0);
    expect(segment.startAt).toBe(new Date(context.instantEpoch).toISOString());
    const tokyo=analyzeProfile(profile({birthDate:p.birthDate,birthTime:'17:27:07',timezone:'Asia/Tokyo'})).bazi.evidence!;
    expect(tokyo.monthAuthority.segments).toEqual([segment]);
  });

  it('records a fold as one first-occurrence instant and unknown DST dates as their actual 23/25-hour ranges',()=>{
    const folded=profile({birthDate:'2024-11-03',birthTime:'01:30',timezone:'America/New_York'}),context=resolveBirthContext(folded),evidence=analyzeProfile(folded).bazi.evidence!;
    expect(context.instantEpoch).toBe(Date.UTC(2024,10,3,5,30));
    expect(context.ambiguous).toBe(true);expect(evidence.timeBasis.ambiguous).toBe(true);
    expect(evidence.timeBasis.description).toContain('第二次未计算');
    expect(evidence.monthAuthority.segments).toHaveLength(1);
    expect(evidence.monthAuthority.segments[0].startAt).toBe('2024-11-03T05:30:00.000Z');
    expect(evidence.monthAuthority.segments[0].endAt).toBe('2024-11-03T05:30:00.000Z');
    for(const [birthDate,hours] of [['2024-03-10',23],['2024-11-03',25]] as const){
      const p=profile({birthDate,timeUnknown:true,birthTime:'',timezone:'America/New_York'}),range=resolveBirthContext(p);
      expect(range.endEpoch-range.startEpoch+1000).toBe(hours*3600000);
      const segments=analyzeProfile(p).bazi.evidence!.monthAuthority.segments;
      expect(Date.parse(segments.at(-1)!.endAt)-Date.parse(segments[0].startAt)+1000).toBe(hours*3600000);
    }
  });

  it('includes a repeated final civil hour in the new full-date range while preserving frozen legacy endpoints',()=>{
    const p=profile({birthDate:'2024-10-31',timeUnknown:true,birthTime:'',timezone:'Africa/Cairo'});
    const current=resolveBirthContext(p),old=resolveBirthContext(p,{legacyUnknownDayEndpoints:true});
    expect(current.startEpoch).toBe(Date.UTC(2024,9,30,21));
    expect(current.endEpoch).toBe(Date.UTC(2024,9,31,21,59,59));
    expect(current.endEpoch-current.startEpoch+1000).toBe(25*3600000);
    expect(old.endEpoch-old.startEpoch+1000).toBe(24*3600000);
    expect(old.endEpoch).toBe(Date.UTC(2024,9,31,20,59,59));
    expect(current.endSeasonal.getSolar().toYmdHms()).toBe('2024-11-01 05:59:59');
    expect(old.endSeasonal.getSolar().toYmdHms()).toBe('2024-11-01 04:59:59');
    const evidence=analyzeProfile(p).bazi.evidence!;
    expect(evidence.monthAuthority.segments.at(-1)!.endAt).toBe('2024-10-31T21:59:59.000Z');
    expect(evidence.monthAuthority.segments[0].startAt).toBe('2024-10-30T21:00:00.000Z');
    const known=resolveBirthContext({...p,timeUnknown:false,birthTime:'23:30'});
    expect(known.instantEpoch).toBe(Date.UTC(2024,9,31,20,30));
    expect(known.startEpoch).toBe(known.endEpoch);expect(known.ambiguous).toBe(true);
  });

  it('accepts an unknown-time date with a noon gap without inventing a time pillar or changing frozen legacy behavior',()=>{
    const p=profile({birthDate:'2000-01-15',birthTime:'',timeUnknown:true,timezone:'Africa/Juba'});
    const context=resolveBirthContext(p),result=analyzeProfile(p).bazi,evidence=result.evidence!;
    expect(context.startEpoch).toBe(Date.UTC(2000,0,14,22));
    expect(context.endEpoch).toBe(Date.UTC(2000,0,15,20,59,59));
    expect(context.endEpoch-context.startEpoch+1000).toBe(23*3600000);
    expect(context.instantEpoch).toBe(context.startEpoch);
    expect(context.ambiguous).toBe(false);expect(evidence.timeBasis.timeUnknown).toBe(true);
    expect(result.pillars.map(pillar=>pillar.label)).toEqual(['年柱','月柱','日柱']);
    expect(result.pillars.find(pillar=>pillar.label==='年柱')!.gan+result.pillars.find(pillar=>pillar.label==='年柱')!.zhi).toBe(context.startSeasonal.getYearInGanZhiExact());
    expect(result.pillars.find(pillar=>pillar.label==='月柱')!.gan+result.pillars.find(pillar=>pillar.label==='月柱')!.zhi).toBe(context.endSeasonal.getMonthInGanZhiExact());
    expect(context.startSeasonal.getMonthInGanZhiExact()).toBe(context.endSeasonal.getMonthInGanZhiExact());
    expect(result.warnings.join('')).toContain('未填入出生时刻或时柱');
    expect(evidence.monthAuthority.segments[0].startAt).toBe('2000-01-14T22:00:00.000Z');
    expect(evidence.monthAuthority.segments.at(-1)!.endAt).toBe('2000-01-15T20:59:59.000Z');
    expect(validBaziSnapshot(result,p)).toBe(true);
    expect(()=>calculateLegacyBazi(p)).toThrow('不存在');
    expect(()=>resolveBirthContext({...p,timeUnknown:false,birthTime:'12:00'})).toThrow('不存在');
    expect(()=>resolveBirthContext(profile({birthDate:'2011-12-30',birthTime:'',timeUnknown:true,timezone:'Pacific/Apia'}))).toThrow('所选民用日期');
    const tooLarge={...context,ranges:[{startEpoch:context.startEpoch,endEpoch:context.startEpoch+3*86400000+1000}],timeUnknown:true};
    expect(()=>calculateBaziEvidence(result,tooLarge)).toThrow('有界');
  });

  it('matches all 11 original frozen outputs while the current profile only adds evidence and its version',()=>{
    expect(legacy.cases).toHaveLength(11);
    for(const example of legacy.cases){
      const p=example.profile as BirthProfile,old=calculateLegacyBazi(p),current=analyzeProfile(p).bazi;
      expect(old).toEqual(example.expected);
      const {evidence,timeBasis,monthFollowingRestrictions,...withoutEvidence}=current;
      expect({...withoutEvidence,solarDate:example.expected.solarDate,version:LEGACY_BAZI_RULE_VERSION}).toEqual(example.expected);
      expect(evidence).toBeDefined();expect(current.version).toBe(BAZI_RULE_VERSION);
      expect(baziSnapshotStatus(old,p)).toBe('verified-legacy');
      expect(validBaziSnapshot(old,p)).toBe(true);expect(old.evidence).toBeUndefined();
      expect(baziSnapshotStatus(current,p)).toBe('verified-current');
      expect(validBaziSnapshot({...old,evidence},p)).toBe(false);
      const {evidence:removed,...stripped}=current;expect(validBaziSnapshot(stripped,p)).toBe(false);
    }
  });

  it('keeps deterministic name choices, rank values and old favorable inputs unchanged',()=>{
    const p=profile({birthTime:'09:30'}),analysis=analyzeProfile(p),oldAnalysis:Analysis={...analysis,bazi:calculateLegacyBazi(p)};
    const pref:NamingPreferences={length:2,generationChar:'',requiredChars:'',forbiddenChars:'',elderTaboo:'',style:'自然',meanings:'平安',industry:'',priority:'balanced',preferredElements:[],zodiacRules:false,numerology:false};
    const args=[dataset.characters as CharacterEntry[],dataset.citations as Citation[],71] as const;
    const oldNames=generateLocal(p,pref,oldAnalysis,...args),newNames=generateLocal(p,pref,analysis,...args);
    expect(newNames.candidates.map(({id,...candidate})=>candidate)).toEqual(oldNames.candidates.map(({id,...candidate})=>candidate));
    expect(newNames.messages).toEqual(oldNames.messages);
  });
});
