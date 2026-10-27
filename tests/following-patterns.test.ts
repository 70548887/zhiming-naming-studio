import {describe,expect,it} from 'vitest';
import fixtures from './fixtures/cong-wealth-examples.json';
import frozen from './fixtures/bazi-v5-output-examples.json';
import {calculateFollowingPatternEvidence,evaluateFollowingPatternPredicate,followingPatternSourceRules,FOLLOWING_PATTERN_VERSION,type FollowingPatternFacts} from '../src/domain/following-patterns';
import {analyzeProfile,BAZI_RULE_VERSION} from '../src/domain/engine';
import {calculateLegacyBazi} from '../src/domain/bazi-legacy';
import {calculateBaziV5,BAZI_V5_RULE_VERSION} from '../src/domain/bazi-v5';
import {PATTERN_EVIDENCE_VERSION} from '../src/domain/pattern-evidence';
import {validBaziSnapshot,baziSnapshotStatus} from '../src/main/bazi-snapshot';
import {generateLocal} from '../src/domain/naming';
import dataset from '../data/dataset.json';
import type {BirthProfile,FollowingPatternPredicate,NamingPreferences,CharacterEntry,Citation} from '../src/shared/types';

const base:BirthProfile={id:'cong-facts-fixture',customerName:'从财字面证据',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2026-06-10',birthTime:'09:30:00',timeUnknown:false,leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:''};
const monthAuthority=analyzeProfile(base).bazi.evidence!.monthAuthority;
function supplied(dayMaster:string,monthBranch:string){const b=calculateLegacyBazi(base);return {...b,pillars:b.pillars.map(p=>p.label==='日柱'?{...p,gan:dayMaster}:p.label==='月柱'?{...p,zhi:monthBranch}:p)};}
const predicate=(element:'木'|'火'|'土'|'金'|'水',present:boolean,scope:'exposed'|'hidden'|'any'='any'):FollowingPatternPredicate=>({kind:'element',element,present,scope,includeDayMaster:false});

describe('source-limited following-wealth clause checks',()=>{
 it('matches all14 independently transcribed synthetic structure/support/contradiction/missing examples',()=>{
  expect(fixtures.cases).toHaveLength(14);
  for(const fixture of fixtures.cases){
   const result=calculateFollowingPatternEvidence(supplied(fixture.dayMaster,fixture.monthBranch),{timeUnknown:!fixture.facts.complete,ambiguous:false,monthAuthority,facts:{complete:fixture.facts.complete,stems:[{pillar:'日柱',stem:fixture.dayMaster},...fixture.facts.exposed.map((stem,index)=>({pillar:'明干'+index,stem}))],hiddenStems:fixture.facts.hidden.map((stem,index)=>({pillar:'藏干'+index,branch:'土',stem}))}});
   const check=result.checks.find(item=>item.id===fixture.ruleId)!;expect(check.status,fixture.reason).toBe(fixture.expected);
   expect(check.requiresManualReview).toBe(true);
   if(check.status==='candidate'){expect(check.candidateBasis).toBe('literal-clause-only');expect(check.statusExplanation).toContain('不称真从或成格');expect(check.missing.join('')).toContain('气退枯焦');}
   if(check.status==='contradicted'){expect(check.opposedBy.length).toBeGreaterThan(0);expect(check.statusExplanation).toContain('仅本条');}
   expect(result.checks.filter(item=>item.pattern!=='cong-cai').every(item=>item.status==='not-evaluated')).toBe(true);
  }
 });

 it('keeps unresolved necessary formation and purity clauses necessary instead of relabeling them as support',()=>{
  const rules=followingPatternSourceRules(),jia=rules.find(rule=>rule.id.startsWith('jia-chen'))!,geng=rules.find(rule=>rule.id.startsWith('geng-mao'))!;
  expect(jia.criteria.filter(item=>item.role==='necessary'&&!item.predicate)).toHaveLength(3);
  expect(geng.criteria.some(item=>item.role==='necessary'&&!item.predicate&&item.sourceQuote==='一片甲乙')).toBe(true);
  expect(geng.criteria.some(item=>item.role==='exception'&&!item.predicate)).toBe(true);
  const result=calculateFollowingPatternEvidence(supplied('甲','辰'),{timeUnknown:false,ambiguous:false,monthAuthority,facts:{complete:true,stems:[{pillar:'日柱',stem:'甲'},{pillar:'年柱',stem:'戊'},{pillar:'月柱',stem:'己'}],hiddenStems:[]}}).checks.find(item=>item.id===jia.id)!;
  expect(result.status).toBe('pending');expect(result.supportedBy.length).toBeGreaterThan(0);
  expect(result.criteria.filter(item=>item.role==='necessary'&&item.result==='not-implemented')).toHaveLength(3);
 });

 it('does not count the day master as an extra peer and never treats missing-hour absence as proof',()=>{
  const facts:FollowingPatternFacts={complete:true,stems:[{pillar:'日柱',stem:'乙'},{pillar:'年柱',stem:'丙'}],hiddenStems:[{pillar:'日柱',branch:'未',stem:'乙'}]};
  const noPeer:FollowingPatternPredicate={kind:'all',items:[{kind:'stem',stem:'甲',scope:'exposed',includeDayMaster:false,present:false},{kind:'stem',stem:'乙',scope:'exposed',includeDayMaster:false,present:false}]};
  expect(evaluateFollowingPatternPredicate(noPeer,facts).result).toBe('met');
  expect(evaluateFollowingPatternPredicate(noPeer,{...facts,complete:false}).result).toBe('unknown');
  expect(evaluateFollowingPatternPredicate(noPeer,{...facts,complete:false,stems:[...facts.stems,{pillar:'时柱',stem:'甲'}]}).result).toBe('not-met');
  expect(evaluateFollowingPatternPredicate(predicate('水',false),{...facts,complete:false}).result).toBe('unknown');
  expect(evaluateFollowingPatternPredicate(predicate('水',false),{...facts,complete:false,hiddenStems:[{pillar:'年柱',branch:'辰',stem:'癸'}]}).result).toBe('not-met');
 });

 it('retains three-valued all/any/not logic and refuses undefined strength/count/scope predicates',()=>{
  const facts:FollowingPatternFacts={complete:false,stems:[{pillar:'年柱',stem:'丙'}],hiddenStems:[]};
  expect(evaluateFollowingPatternPredicate({kind:'any',items:[predicate('火',true),predicate('水',true)]},facts).result).toBe('met');
  expect(evaluateFollowingPatternPredicate({kind:'all',items:[predicate('火',true),predicate('水',true)]},facts).result).toBe('unknown');
  expect(evaluateFollowingPatternPredicate({kind:'not',item:predicate('水',true)},facts).result).toBe('unknown');
  for(const invalid of [{kind:'majority',share:.9},{kind:'element',element:'风',scope:'any',present:false,includeDayMaster:false},{kind:'element',element:'水',scope:'all-life',present:false,includeDayMaster:false},{kind:'all',items:[]}])expect(()=>evaluateFollowingPatternPredicate(invalid as never,facts)).toThrow();
 });

 it('treats actual independent source applicability precisely rather than classifying every month or all kinds of following patterns',()=>{
  const bazi=analyzeProfile({...base,birthDate:'2024-02-10'}).bazi,checks=bazi.evidence!.patternEvidence!.checks;
  expect(checks).toHaveLength(11);expect(checks.every(check=>check.status==='not-evaluated')).toBe(true);
  expect(checks.filter(check=>check.pattern==='cong-cai').every(check=>check.applicability==='not-applicable')).toBe(true);
  expect(bazi.evidence!.patternCandidates[0].status).toBe('not-evaluated');
 });

 it('keeps a possible cross-Jie route pending and records a known necessary contradiction even with missing pillars',()=>{
  const bazi=supplied('乙','午');bazi.pillars=bazi.pillars.filter(p=>p.label!=='月柱'&&p.label!=='时柱');
  const result=calculateFollowingPatternEvidence(bazi,{timeUnknown:true,ambiguous:false,monthAuthority:{...monthAuthority,segments:[{...monthAuthority.segments[0],monthBranch:'巳'},{...monthAuthority.segments[0],monthBranch:'午'}]},facts:{complete:false,stems:[{pillar:'日柱',stem:'乙'},{pillar:'年柱',stem:'丙'}],hiddenStems:[]}});
  const possible=result.checks.find(check=>check.id.startsWith('yi-午'))!;expect(possible.applicability).toBe('possible');expect(possible.status).toBe('pending');expect(possible.missing.join('')).toContain('月支待定');
  const broken=calculateFollowingPatternEvidence(bazi,{timeUnknown:true,ambiguous:false,monthAuthority:{...monthAuthority,segments:[{...monthAuthority.segments[0],monthBranch:'午'}]},facts:{complete:false,stems:[{pillar:'日柱',stem:'乙'},{pillar:'年柱',stem:'甲'}],hiddenStems:[]}}).checks.find(check=>check.id.startsWith('yi-午'))!;
  expect(broken.status).toBe('contradicted');expect(broken.opposedBy.join('')).toContain('比劫');
 });
});

describe('current evidence, snapshots and unchanged ranking inputs',()=>{
 it('finds real literal candidates and counterpart missing-time states without inventing a true-pattern conclusion',()=>{
  const selected={...base,birthDate:'2029-06-24',birthTime:'03:30:00'};
  const current=analyzeProfile(selected).bazi,check=current.evidence!.patternEvidence!.checks.find(check=>check.status==='candidate')!;
  expect(check).toBeDefined();expect(current.pillars.map(p=>p.gan+p.zhi)).toEqual(['己酉','庚午','乙酉','戊寅']);
  expect(check.pattern).toBe('cong-cai');expect(check.candidateBasis).toBe('literal-clause-only');expect(check.missing.length).toBeGreaterThan(0);
  const missing=analyzeProfile({...selected,timeUnknown:true,birthTime:''}).bazi.evidence!.patternEvidence!.checks.find(item=>item.id===check.id)!;
  expect(missing.status).toBe('pending');expect(missing.criteria.some(item=>item.result==='unknown')).toBe(true);
  expect(current.evidence!.patternEvidence!.version).toBe(PATTERN_EVIDENCE_VERSION);expect(current.version).toBe(BAZI_RULE_VERSION);
 });

 it('binds per-criterion role, source, status, candidate boundary and missing facts in canonical verification',()=>{
  const input={...base,birthDate:'2026-06-10'},current=analyzeProfile(input).bazi;expect(validBaziSnapshot(current,input)).toBe(true);
  for(const edit of [(value:typeof current)=>{value.evidence!.patternEvidence!.checks[0].criteria[0].role='support';},(value:typeof current)=>{value.evidence!.patternEvidence!.checks[0].status='candidate';},(value:typeof current)=>{value.evidence!.patternEvidence!.checks[0].sourceQuote='伪造';},(value:typeof current)=>{value.evidence!.patternEvidence!.checks[0].missing=[];}]){const altered=structuredClone(current);edit(altered);expect(validBaziSnapshot(altered,input)).toBe(false);}
 });

 it('preserves all4 old1.5 snapshots and does not graft a new pattern interpretation onto historical evidence',()=>{
  for(const fixture of frozen.cases){const input=fixture.profile as BirthProfile,old=calculateBaziV5(input),current=analyzeProfile(input).bazi;
   expect(old).toEqual(fixture.expected);expect(old.version).toBe(BAZI_V5_RULE_VERSION);expect(baziSnapshotStatus(old,input)).toBe('verified-legacy');expect(old.evidence!.patternEvidence).toBeUndefined();
   expect(validBaziSnapshot({...old,evidence:{...old.evidence!,patternEvidence:current.evidence!.patternEvidence}},input)).toBe(false);
  }
 });

 it('keeps existing favorable opinions, seasonal facts and deterministic name evaluation identical to frozen1.5',()=>{
  const current=analyzeProfile(base),old=calculateBaziV5(base);expect(current.bazi.favorable).toEqual(old.favorable);expect(current.bazi.evidence!.opinions).toEqual(old.evidence!.opinions);expect(current.bazi.evidence!.seasonalConditions).toEqual(old.evidence!.seasonalConditions);
  const prefs:NamingPreferences={length:2,generationChar:'',requiredChars:'',forbiddenChars:'',elderTaboo:'',style:'自然',meanings:'平安',industry:'',priority:'balanced',preferredElements:[],zodiacRules:false,numerology:false};
  const run=(bazi:typeof old)=>generateLocal(base,prefs,{...current,bazi},dataset.characters as CharacterEntry[],dataset.citations as Citation[],114).candidates.map(({id,...candidate})=>candidate);
  expect(run(current.bazi)).toEqual(run(old));
 });
});
