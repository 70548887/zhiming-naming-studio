import {describe,expect,it} from 'vitest';
import fixtures from './fixtures/seasonal-condition-examples.json';
import frozen from './fixtures/bazi-v4-output-examples.json';
import {calculateSeasonalConditionEvidence,seasonalSupplementRules,seasonalTermWindow,SEASONAL_CONDITION_VERSION} from '../src/domain/seasonal-conditions';
import {analyzeProfile,BAZI_RULE_VERSION} from '../src/domain/engine';
import {calculateBaziV4,BAZI_V4_RULE_VERSION} from '../src/domain/bazi-v4';
import {calculateLegacyBazi} from '../src/domain/bazi-legacy';
import {validBaziSnapshot,baziSnapshotStatus} from '../src/main/bazi-snapshot';
import {resolveBirthContext} from '../src/shared/civil-birth';
import type {BaziAnalysis,BirthProfile,MonthlySeasonalAnalysis} from '../src/shared/types';

const base:BirthProfile={id:'seasonal-condition-fixture',customerName:'条件事实补充',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'09:30:00',timeUnknown:false,leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:'',seasonalMethod:'qiongtong-2294674-initial/1.0.0'};
const monthly=(dayMaster:string,monthBranch:string):MonthlySeasonalAnalysis=>({version:'test-input',methodId:'qiongtong-2294674-initial/1.0.0',status:'initial-reference',ruleId:'test',dayMaster,monthBranches:[monthBranch],cases:[],proposedElements:[],requiresManualReview:true,limitations:[]});
function supplied(dayMaster:string,monthBranch:string):BaziAnalysis{const b=calculateLegacyBazi(base);return {...b,pillars:b.pillars.map(pillar=>pillar.label==='日柱'?{...pillar,gan:dayMaster}:pillar.label==='月柱'?{...pillar,zhi:monthBranch}:pillar)};}
function runRule(rule:ReturnType<typeof seasonalSupplementRules>[number],input:Partial<BirthProfile>,override?:{startEpoch:number;endEpoch:number}){
 const p={...base,...input},context=resolveBirthContext(p),bazi=supplied(rule.dayStem,rule.monthBranch);
 return calculateSeasonalConditionEvidence(bazi,{ranges:[override??{startEpoch:context.startEpoch,endEpoch:context.endEpoch}],timeUnknown:p.timeUnknown,ambiguous:context.ambiguous,monthly:monthly(rule.dayStem,rule.monthBranch),facts:{dayMaster:rule.dayStem,stems:[],hiddenStems:[],complete:!p.timeUnknown}});
}
describe('separate source-attributed time prerequisites and fact conditions',()=>{
 it('keeps exactly4 calendar prerequisites and3 scoped fact rules without changing their original-branch status',()=>{
  const rules=seasonalSupplementRules();expect(rules).toHaveLength(7);expect(new Set(rules.map(rule=>rule.id)).size).toBe(7);
  expect(rules.filter(rule=>rule.kind==='calendar-prerequisite')).toHaveLength(4);expect(rules.filter(rule=>rule.kind==='fact')).toHaveLength(3);
  expect(rules.every(rule=>rule.doesNotResolveOriginalBranch&&rule.proposedUses.length===0)).toBe(true);
  for(const rule of rules){expect(rule.sourceQuote).toBeTruthy();expect(rule.sourceLocator).toContain('2294674');if(rule.kind==='calendar-prerequisite'){expect(rule.scope).toBe('partial-prerequisite');expect(rule.unresolved.length).toBeGreaterThan(0);}}
 });

 it('matches12 independently supplied official-calendar-date cases and never treats a met time window as the full original conclusion',()=>{
  expect(fixtures.dateCases).toHaveLength(12);
  for(const fixture of fixtures.dateCases){const rule=seasonalSupplementRules().find(rule=>rule.id===fixture.ruleId)!;expect(rule,fixture.id).toBeDefined();
   const result=runRule(rule,fixture),check=result.checks.find(check=>check.id===rule.id)!;
   expect(check.status,fixture.id).toBe(fixture.expected);expect(check.scope).toBe('partial-prerequisite');expect(check.doesNotResolveOriginalBranch).toBe(true);
   expect(check.missing.length).toBeGreaterThan(0);expect(check.missing.join('')).toContain('不改变原条件');
   if(fixture.timeUnknown){expect(check.observations).toHaveLength(2);expect(new Set(check.observations.map(o=>o.result)).size).toBe(2);}
  }
 });

 it('uses actual UTC+8 term instants and half-open endpoints with exact before/at/after second checks',()=>{
  for(const rule of seasonalSupplementRules().filter(rule=>rule.calendar)){
   const calendar=rule.calendar!,window=seasonalTermWindow(Date.UTC(2024,4,1),calendar.fromTerm,calendar.toTerm);
   expect(new Date(window.fromEpoch+8*3600000).toISOString().slice(0,10)).toBe(fixtures.officialCalendar.facts.find(item=>item[0]===calendar.fromTerm)![1]);
   expect(new Date(window.toEpoch+8*3600000).toISOString().slice(0,10)).toBe(fixtures.officialCalendar.facts.find(item=>item[0]===calendar.toTerm)![1]);
   for(const [epoch,expected] of [[window.fromEpoch-1000,'not-met'],[window.fromEpoch,'met'],[window.toEpoch-1000,'met'],[window.toEpoch,'not-met']] as const){
    const result=runRule(rule,{birthDate:'2024-09-15'}, {startEpoch:epoch,endEpoch:epoch});expect(result.checks.find(item=>item.id===rule.id)!.status,rule.id+epoch).toBe(expected);
   }
   const crossed=runRule(rule,{timeUnknown:true,birthTime:''},{startEpoch:window.toEpoch-1000,endEpoch:window.toEpoch+1000}).checks.find(item=>item.id===rule.id)!;
   expect(crossed.status).toBe('uncertain');expect(crossed.observations.map(item=>item.result)).toEqual(['met','not-met']);
   expect(crossed.observations[0].endAt).toBe(new Date(window.toEpoch-1000).toISOString());expect(crossed.observations[1].startAt).toBe(new Date(window.toEpoch).toISOString());
  }
 });

 it('matches9 literal positive, negative and incomplete scoped fact fixtures using three-valued evaluation',()=>{
  expect(fixtures.factCases).toHaveLength(9);
  for(const fixture of fixtures.factCases){const rule=seasonalSupplementRules().find(rule=>rule.id===fixture.ruleId)!;
   const result=calculateSeasonalConditionEvidence(supplied(rule.dayStem,rule.monthBranch),{ranges:[{startEpoch:Date.UTC(2024,1,10),endEpoch:Date.UTC(2024,1,10)}],timeUnknown:!fixture.facts.complete,ambiguous:false,monthly:monthly(rule.dayStem,rule.monthBranch),facts:{dayMaster:rule.dayStem,complete:fixture.facts.complete,stems:fixture.facts.exposed.map((stem,index)=>({pillar:'明干'+index,stem})),hiddenStems:fixture.facts.hidden.map((stem,index)=>({pillar:'地支'+index,branch:'丑',stem}))}});
   const check=result.checks.find(check=>check.id===rule.id)!;expect(check.status).toBe(fixture.expected==='unknown'?'uncertain':fixture.expected);expect(check.scope).toBe('full-fact-predicate');expect(check.doesNotResolveOriginalBranch).toBe(true);expect(check.observations.every(item=>item.evidence.length>0)).toBe(true);
  }
 });

 it('preserves original monthly15 states and initial favorable arithmetic while adding only a separate field',()=>{
  const profile={...base,birthDate:'2024-09-12'};const current=analyzeProfile(profile).bazi,old=calculateBaziV4(profile);
  expect(current.version).toBe(BAZI_RULE_VERSION);expect(current.evidence!.version).toBe('bazi-evidence-profile/1.7.0');
  expect(current.evidence!.monthlySeasonal).toEqual(old.evidence!.monthlySeasonal);
  expect(current.evidence!.opinions).toEqual(old.evidence!.opinions);expect(current.favorable).toEqual(old.favorable);
  expect(current.evidence!.seasonalConditions!.version).toBe(SEASONAL_CONDITION_VERSION);
  const disabled=analyzeProfile({...profile,seasonalMethod:'no-monthly/1.0.0'}).bazi.evidence!.seasonalConditions!;expect(disabled.status).toBe('not-selected');expect(disabled.checks).toEqual([]);
 });

 it('binds source, result, observation and partial/full scope in canonical snapshot validation',()=>{
  // Find a real乙酉 date so the two sourced time checks are present without invented chart pillars.
  let input:BirthProfile|undefined;for(let day=8;day<30;day++){const p={...base,birthDate:'2024-09-'+String(day).padStart(2,'0')};if(analyzeProfile(p).bazi.pillars.find(p=>p.label==='日柱')!.gan==='乙'){input=p;break;}}
  expect(input).toBeDefined();const result=analyzeProfile(input!).bazi;expect(result.evidence!.seasonalConditions!.checks).toHaveLength(2);expect(validBaziSnapshot(result,input!)).toBe(true);
  for(const edit of [(value:BaziAnalysis)=>{value.evidence!.seasonalConditions!.checks[0].scope='full-fact-predicate';},(value:BaziAnalysis)=>{value.evidence!.seasonalConditions!.checks[0].doesNotResolveOriginalBranch=false;},(value:BaziAnalysis)=>{value.evidence!.seasonalConditions!.checks[0].sourceQuote='changed';},(value:BaziAnalysis)=>{value.evidence!.seasonalConditions!.checks[0].observations[0].endAt='2000-01-01T00:00:00Z';}]){const changed=structuredClone(result);edit(changed);expect(validBaziSnapshot(changed,input!)).toBe(false);}
 });

 it('retains the first instant for a known folded wall time and refuses oversized observation ranges',()=>{
  const rule=seasonalSupplementRules().find(rule=>rule.calendar)!;
  const folded=runRule(rule,{birthDate:'2024-11-03',birthTime:'01:30:00',timezone:'America/New_York'});
  expect(folded.checks[0].observations[0].startAt).toBe('2024-11-03T05:30:00.000Z');expect(folded.warnings.join('')).toContain('第二次未计算');
  expect(()=>runRule(rule,{}, {startEpoch:0,endEpoch:3*86400000+1000})).toThrow('有界');
 });
});

describe('frozen1.4 evidence never acquires the new condition supplement',()=>{
 it('preserves4 captured complete old snapshots and refuses grafting current field onto their old version',()=>{
  for(const fixture of frozen.cases){const input=fixture.profile as BirthProfile,previous=calculateBaziV4(input),current=analyzeProfile(input).bazi;
   expect(previous).toEqual(fixture.expected);expect(previous.version).toBe(BAZI_V4_RULE_VERSION);expect(baziSnapshotStatus(previous,input)).toBe('verified-legacy');expect(previous.evidence!.seasonalConditions).toBeUndefined();
   expect(validBaziSnapshot({...previous,evidence:{...previous.evidence!,seasonalConditions:current.evidence!.seasonalConditions}},input)).toBe(false);
  }
 });
});
