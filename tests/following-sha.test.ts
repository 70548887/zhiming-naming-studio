import{describe,expect,it}from'vitest';
import examples from'./fixtures/cong-sha-predicate-examples.json';
import oldSnapshots from'./fixtures/bazi-v6-output-examples.json';
import{calculateFollowingShaChecks,evaluateFollowingPatternDecisionBranches,followingShaSourceRules,FOLLOWING_SHA_VERSION,type FollowingShaSourceBranch}from'../src/domain/following-sha';
import{evaluateFollowingPatternPredicate}from'../src/domain/following-patterns';
import{analyzeProfile,BAZI_RULE_VERSION}from'../src/domain/engine';
import{calculateLegacyBazi}from'../src/domain/bazi-legacy';
import{calculateBaziV6,BAZI_V6_RULE_VERSION}from'../src/domain/bazi-v6';
import{validBaziSnapshot,baziSnapshotStatus}from'../src/main/bazi-snapshot';
import{generateLocal}from'../src/domain/naming';
import dataset from'../data/dataset.json';
import type{BirthProfile,FollowingPatternCriterion,NamingPreferences,CharacterEntry,Citation}from'../src/shared/types';
const base:BirthProfile={id:'sha-dependent-test',customerName:'从杀依赖证据',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-12-10',birthTime:'09:30:00',timeUnknown:false,leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:''};
const monthAuthority=analyzeProfile(base).bazi.evidence!.monthAuthority;
function supplied(dayMaster:string,monthBranch:string){const b=calculateLegacyBazi(base);return{...b,pillars:b.pillars.map(item=>item.label==='日柱'?{...item,gan:dayMaster}:item.label==='月柱'?{...item,zhi:monthBranch}:item)};}
const criterion=(id:string,result:FollowingPatternCriterion['result']):FollowingPatternCriterion=>({id,name:id,role:'exception',scope:'explicit fixture',result,sourceQuote:'test criterion only',sourceLocator:'test',observedEvidence:[],missing:[]});
const branch:FollowingShaSourceBranch={id:'dependent-function-test',name:'All explicit premises and signal',sourceQuote:'test branch only',sourceLocator:'test',premiseCriterionIds:['required1','required2'],signalCriterionIds:['signal'],unresolved:[]};

describe('dependency-gated rejection without invented source thresholds',()=>{
 it('requires every premise and signal to be known met before rejecting, with independent not-met/unknown/unimplemented cases',()=>{
  const evaluate=(a:FollowingPatternCriterion['result'],b:FollowingPatternCriterion['result'],signal:FollowingPatternCriterion['result'])=>evaluateFollowingPatternDecisionBranches([criterion('required1',a),criterion('required2',b),criterion('signal',signal)],[branch],'applicable')[0];
  expect(evaluate('met','met','met')).toMatchObject({status:'rejected',doesNotResolveClause:false});
  expect(evaluate('met','unknown','met')).toMatchObject({status:'pending',doesNotResolveClause:true});
  expect(evaluate('met','not-implemented','met')).toMatchObject({status:'pending',doesNotResolveClause:true});
  expect(evaluate('met','met','unknown')).toMatchObject({status:'pending',doesNotResolveClause:true});
  expect(evaluate('not-met','unknown','met')).toMatchObject({status:'not-triggered',doesNotResolveClause:true});
  expect(evaluate('not-implemented','not-implemented','not-met')).toMatchObject({status:'not-triggered',doesNotResolveClause:true});
  expect(evaluate('not-implemented','not-implemented','met').missing.join('')).toContain('不能上升为整句反证');
  expect(evaluateFollowingPatternDecisionBranches([criterion('required1','met'),criterion('required2','met'),criterion('signal','met')],[branch],'not-applicable')[0].status).toBe('not-evaluated');
  expect(()=>evaluateFollowingPatternDecisionBranches([criterion('signal','met')],[branch],'applicable')).toThrow('编号');
 });

 it('matches54 manually specified literal predicate examples while keeping each scope and absent-hour result intact',()=>{
  expect(examples.cases).toHaveLength(54);const criteria=followingShaSourceRules().flatMap(rule=>rule.criteria).filter(item=>item.predicate);expect(criteria).toHaveLength(6);
  for(const example of examples.cases){const source=criteria.find(item=>item.id===example.criterionId)!;expect(source,example.id).toBeDefined();expect(evaluateFollowingPatternPredicate(source.predicate!,example.facts).result,example.id).toBe(example.expected);}
 });

 it('keeps each of five source routes pending because its genuine necessary scope, quantity or strength remains unimplemented',()=>{
  const rules=followingShaSourceRules();expect(rules).toHaveLength(5);expect(rules.flatMap(rule=>rule.criteria)).toHaveLength(25);
  for(const source of rules){
   const result=calculateFollowingShaChecks(supplied(source.applicability.dayStems[0],source.applicability.monthBranches[0]),{timeUnknown:false,ambiguous:false,monthAuthority,facts:{complete:true,stems:[],hiddenStems:[]}}).find(check=>check.id===source.id)!;
   expect(result.status).toBe('pending');expect(result.criteria.some(item=>item.role==='necessary'&&item.result==='not-implemented')).toBe(true);
   expect(result.opposedBy).toEqual([]);expect(result.candidateBasis).toBeUndefined();expect(result.requiresManualReview).toBe(true);
   expect(result.criteria.filter(item=>item.decisionUse==='support-only').every(item=>item.contributesToVerdict===false)).toBe(true);
   expect(new Set(result.missing).size).toBe(result.missing.length);
  }
 });

 it('does not turn observed extra丁 or甲 into whole-clause contradiction while its dependent premises are unimplemented',()=>{
  expect(examples.dependencyCases).toHaveLength(6);
  for(const example of examples.dependencyCases){
   const source=followingShaSourceRules().find(rule=>rule.id===example.ruleId)!,signal=source.criteria.find(item=>item.id===example.signalCriterionId)!;
   expect(signal.predicate?.kind).toBe('stem');
   const result=calculateFollowingShaChecks(supplied(source.applicability.dayStems[0],source.applicability.monthBranches[0]),{timeUnknown:!example.facts.complete,ambiguous:false,monthAuthority,facts:example.facts}).find(item=>item.id===source.id)!;
   const observed=result.criteria.find(item=>item.id===signal.id)!;expect(observed.result).toBe(example.signalResult);expect(observed.contributesToVerdict).toBe(false);
   expect(observed.qualificationMissing!.length).toBeGreaterThan(0);expect(result.decisionBranches!.find(item=>item.id===example.branchId)).toMatchObject({status:example.expectedBranchStatus,doesNotResolveClause:true});
   expect(result.status).toBe(example.expectedRuleStatus);expect(result.opposedBy).toEqual([]);
  }
 });

 it('retains support subsets with an unknown hour but never declares unobserved印比 absent or a complete从杀 result',()=>{
  const source=followingShaSourceRules().find(rule=>rule.id.startsWith('geng-wu'))!;
  const result=calculateFollowingShaChecks(supplied('庚','午'),{timeUnknown:true,ambiguous:false,monthAuthority,facts:{complete:false,stems:[{pillar:'日柱',stem:'庚'},{pillar:'年柱',stem:'丙'}],hiddenStems:[]}}).find(item=>item.id===source.id)!;
  expect(result.status).toBe('pending');expect(result.criteria.filter(item=>item.predicate).every(item=>item.result==='unknown')).toBe(true);expect(result.supportedBy).toEqual([]);
  const observed=calculateFollowingShaChecks(supplied('丁','子'),{timeUnknown:true,ambiguous:false,monthAuthority,facts:{complete:false,stems:[{pillar:'年柱',stem:'戊'}],hiddenStems:[]}}).find(item=>item.id.startsWith('ding-zi'))!;
  expect(observed.supportedBy.length).toBeGreaterThan(0);expect(observed.status).toBe('pending');expect(observed.opposedBy).toEqual([]);
 });

 it('preserves an actual observed hour-only signal as unknown after time removal, without upgrading dependent rejection',()=>{
  const input={...base,birthDate:'2024-12-09',birthTime:'13:30:00'},known=analyzeProfile(input).bazi;
  expect(known.pillars.map(item=>item.gan+item.zhi)).toEqual(['甲辰','丙子','丁未','丁未']);
  const check=known.evidence!.patternEvidence!.checks.find(item=>item.id==='ding-zi-monthly-cong-sha')!;
  expect(check.criteria.find(item=>item.id==='ding-zi-extra-ding-exposed')).toMatchObject({result:'met',contributesToVerdict:false});
  expect(check.status).toBe('pending');expect(check.opposedBy).toEqual([]);expect(check.decisionBranches![0]).toMatchObject({status:'pending',doesNotResolveClause:true});
  const unknown=analyzeProfile({...input,timeUnknown:true,birthTime:''}).bazi.evidence!.patternEvidence!.checks.find(item=>item.id===check.id)!;
  expect(unknown.criteria.find(item=>item.id==='ding-zi-extra-ding-exposed')).toMatchObject({result:'unknown',contributesToVerdict:false});
  expect(unknown.status).toBe('pending');expect(unknown.opposedBy).toEqual([]);
 });
});

describe('new merged profile preserves previous wealth and history',()=>{
 it('keeps all four wealth checks verbatim, and replaces only the previous killing placeholder with five independent paths',()=>{
  for(const fixture of oldSnapshots.cases){const input=fixture.profile as BirthProfile,old=calculateBaziV6(input),current=analyzeProfile(input).bazi;
   expect(current.evidence!.patternEvidence!.checks.filter(item=>item.pattern==='cong-cai')).toEqual(old.evidence!.patternEvidence!.checks.filter(item=>item.pattern==='cong-cai'));
   expect(current.evidence!.patternEvidence!.checks.filter(item=>item.pattern==='cong-sha')).toHaveLength(5);
   expect(current.evidence!.patternEvidence!.checks).toHaveLength(11);expect(current.evidence!.patternCandidates).toEqual(old.evidence!.patternCandidates);
   expect(current.favorable).toEqual(old.favorable);expect(current.evidence!.seasonalConditions).toEqual(old.evidence!.seasonalConditions);
  }
 });

 it('binds the full dependency graph, contribution qualification and source clause in canonical current snapshots',()=>{
  let selected:BirthProfile|undefined;for(let day=7;day<=31;day++){const p={...base,birthDate:'2024-12-'+String(day).padStart(2,'0')};if(analyzeProfile(p).bazi.pillars.find(item=>item.label==='日柱')!.gan==='丁'){selected=p;break;}}
  expect(selected).toBeDefined();const current=analyzeProfile(selected!).bazi;expect(current.version).toBe(BAZI_RULE_VERSION);expect(current.evidence!.version).toBe('bazi-evidence-profile/1.7.0');expect(validBaziSnapshot(current,selected!)).toBe(true);
  const index=current.evidence!.patternEvidence!.checks.findIndex(item=>item.id.startsWith('ding-zi'));
  for(const edit of [(value:typeof current)=>{value.evidence!.patternEvidence!.checks[index].status='contradicted';},(value:typeof current)=>{value.evidence!.patternEvidence!.checks[index].decisionBranches![0].status='rejected';},(value:typeof current)=>{value.evidence!.patternEvidence!.checks[index].criteria.find(item=>item.decisionUse==='rejection-signal')!.contributesToVerdict=true;},(value:typeof current)=>{value.evidence!.patternEvidence!.checks[index].decisionBranches![0].premiseCriterionIds=[];}]){const altered=structuredClone(current);edit(altered);expect(validBaziSnapshot(altered,selected!)).toBe(false);}
 });

 it('preserves all four complete1.6 snapshots without appending the new dependent decisions',()=>{
  for(const fixture of oldSnapshots.cases){const input=fixture.profile as BirthProfile,previous=calculateBaziV6(input),current=analyzeProfile(input).bazi;
   expect(previous).toEqual(fixture.expected);expect(previous.version).toBe(BAZI_V6_RULE_VERSION);expect(baziSnapshotStatus(previous,input)).toBe('verified-legacy');
   expect(validBaziSnapshot({...previous,evidence:{...previous.evidence!,patternEvidence:current.evidence!.patternEvidence}},input)).toBe(false);
  }
 });

 it('does not change seeded names or score values when adding the independent conditions',()=>{
  const current=analyzeProfile(base),previous=calculateBaziV6(base),prefs:NamingPreferences={length:2,generationChar:'',requiredChars:'',forbiddenChars:'',elderTaboo:'',style:'自然',meanings:'平安',industry:'',priority:'balanced',preferredElements:[],zodiacRules:false,numerology:false};
  const names=(bazi:typeof previous)=>generateLocal(base,prefs,{...current,bazi},dataset.characters as CharacterEntry[],dataset.citations as Citation[],117).candidates.map(({id,...candidate})=>candidate);
  expect(names(current.bazi)).toEqual(names(previous));
 });
});
