import {describe,expect,it} from 'vitest';
import {calculateMonthFollowingRestrictions,followingRestrictionRules,FOLLOWING_RESTRICTIONS_SOURCE_ID} from '../src/domain/following-restrictions';
import {analyzeProfile,BAZI_RULE_VERSION,QIMEN_RULE_VERSION} from '../src/domain/engine';
import {analyzeProfileV8,BAZI_V8_RULE_VERSION} from '../src/domain/engine-v8';
import {expectedBazi} from '../src/main/expected-analysis';
import {baziSnapshotStatus,validBaziSnapshot} from '../src/main/bazi-snapshot';
import {validQimenSnapshot} from '../src/main/qimen-snapshot';
import type {BirthProfile,BaziAnalysis,Pillar} from '../src/shared/types';

const pillars=(day?:string,month?:string):Pick<BaziAnalysis,'pillars'>=>({pillars:[...(day?[{label:'日柱',gan:day,zhi:'子',element:'',hidden:[],tenGod:'日主'}]:[]),...(month?[{label:'月柱',gan:'丙',zhi:month,element:'',hidden:[],tenGod:''}]:[])] as Pillar[]});
const profile:BirthProfile={id:'monthly-restriction-domain',customerName:'月份限制',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'00:30:00',timeUnknown:false,leapMonth:false,birthPlace:'',timezone:'Asia/Shanghai',notes:'',seasonalMethod:'qiongtong-2294674-initial/1.0.0'};

describe('two explicitly sourced monthly restrictions have no invented strength premise',()=>{
 it.each([
  ['甲','寅','applies','not-applicable'],['甲','卯','applies','not-applicable'],['甲','辰','not-applicable','not-applicable'],
  ['癸','未','not-applicable','applies'],['癸','午','not-applicable','not-applicable'],['乙','寅','not-applicable','not-applicable'],
  ['丁','未','not-applicable','not-applicable']
 ] as const)('has manual expected scope for %s day / %s month',(day,month,jia,gui)=>{
  const result=calculateMonthFollowingRestrictions(pillars(day,month));expect(result.checks.map(check=>check.status)).toEqual([jia,gui]);
  expect(result.checks[0].patterns).toEqual(['cong-cai','cong-sha']);expect(result.checks[1].patterns).toEqual(['cong-sha']);expect(result.checks.every(check=>check.scope==='fixed-source-clause-only')).toBe(true);
 });
 it('retains from-transformation in the exact quote without adding it to evaluated patterns or recommendations',()=>{
  const result=calculateMonthFollowingRestrictions(pillars('甲','寅'));
  expect(result.checks[0].sourceQuote).toBe("'''正二月甲木'''，素无取从才从杀从化之理。");expect(result.checks[0].sourceHeading).toBe('正二月甲木');expect(result.checks[0].sourceLocator).toMatch(/^oldid=2294674;codepoint\[\d+,\d+\)$/);
  expect(JSON.stringify(result.checks.map(check=>check.patterns))).not.toContain('hua');expect(result.limitations.join('')).toContain('未评估化气或合化');expect(result.sourceId).toBe(FOLLOWING_RESTRICTIONS_SOURCE_ID);
 });
 it('keeps missing day pending even when a known month appears out of range, and never chooses a representative day',()=>{
  for(const month of ['寅','未','子',undefined]){const value=calculateMonthFollowingRestrictions(pillars(undefined,month));expect(value.checks.every(check=>check.status==='pending'&&check.dayStem===undefined&&check.missing.join('').includes('日主未定'))).toBe(true);}
 });
 it('keeps a matching day but uncertain month pending even if every possible month seems in range',()=>{
  const a=calculateMonthFollowingRestrictions(pillars('甲'),{possibleMonthBranches:['寅','卯','寅']});expect(a.checks[0]).toMatchObject({status:'pending',monthBranches:['寅','卯']});expect(a.checks[1].status).toBe('not-applicable');
  const b=calculateMonthFollowingRestrictions(pillars('癸'),{possibleMonthBranches:['午','未']});expect(b.checks[1].status).toBe('pending');expect(b.checks[1].missing.join('')).toContain('月柱交节待定');
 });
 it('rejects invalid actual or candidate symbols and returns fresh rule/result copies',()=>{
  expect(()=>calculateMonthFollowingRestrictions(pillars('X','寅'))).toThrow('日干');expect(()=>calculateMonthFollowingRestrictions(pillars('甲'),{possibleMonthBranches:['X']})).toThrow('月支');
  const a=followingRestrictionRules();a[0].patterns=[];expect(followingRestrictionRules()[0].patterns).toEqual(['cong-cai','cong-sha']);const b=calculateMonthFollowingRestrictions(pillars('甲','寅'));b.checks[0].missing.push('伪造');expect(calculateMonthFollowingRestrictions(pillars('甲','寅')).checks[0].missing).toEqual([]);
 });
});

describe('current analysis preserves all previous opinions and uses actual selected day and actual month',()=>{
 it('adds restrictions without rewriting old following clauses, favorable elements, Qimen or clock trace',()=>{
  const current=analyzeProfile(profile),old=analyzeProfileV8(profile),{monthFollowingRestrictions,evidence,...base}=current.bazi;
  expect({...base,version:old.bazi.version}).toEqual({...old.bazi,evidence:undefined});
  expect({...evidence,version:old.bazi.evidence!.version}).toEqual(old.bazi.evidence);expect(current.qimen).toEqual(old.qimen);expect(monthFollowingRestrictions!.checks[0].status).toBe('applies');
  expect(current.bazi.evidence!.patternEvidence).toEqual(old.bazi.evidence!.patternEvidence);expect(current.bazi.favorable).toEqual(old.bazi.favorable);
 });
 it('applies with an unknown birth hour when civil day and month are both certain',()=>{
  const a=analyzeProfile({...profile,timeUnknown:true,birthTime:''});expect(a.bazi.monthFollowingRestrictions!.checks[0].status).toBe('applies');expect(a.bazi.pillars.some(p=>p.label==='时柱')).toBe(false);
 });
 it('uses the corrected day across solar midnight, while retaining the actual-instant month',()=>{
  const solar={...profile,timeBasis:'apparent-solar' as const,birthLongitude:87.6168},a=analyzeProfile(solar);
  expect(a.bazi.pillars.find(p=>p.label==='日柱')!.gan).toBe('癸');expect(a.bazi.monthFollowingRestrictions!.checks[0]).toMatchObject({status:'not-applicable',dayStem:'癸',monthBranches:['寅']});expect(a.bazi.monthFollowingRestrictions!.checks[1].status).toBe('not-applicable');
  const unknown=analyzeProfile({...solar,timeUnknown:true,birthTime:''});expect(unknown.bazi.evidence).toBeUndefined();expect(unknown.bazi.monthFollowingRestrictions!.checks.every(check=>check.status==='pending')).toBe(true);expect(unknown.bazi.monthFollowingRestrictions!.checks.every(check=>check.monthBranches[0]==='寅')).toBe(true);
 });
 it('keeps a zero-pillar solar Li Chun date pending and records only actual possible month branches',()=>{
  const a=analyzeProfile({...profile,birthDate:'2024-02-04',timeUnknown:true,birthTime:'',timeBasis:'apparent-solar',birthLongitude:87.6168});
  expect(a.bazi.pillars).toEqual([]);expect(a.bazi.evidence).toBeUndefined();expect(a.bazi.monthFollowingRestrictions!.checks.every(check=>check.status==='pending')).toBe(true);expect(a.bazi.monthFollowingRestrictions!.checks[0].monthBranches).toEqual(['丑','寅']);
 });
 it('keeps an actual unknown-hour Jia Li Chun date pending instead of adopting its noon month',()=>{
  const a=analyzeProfile({...profile,birthDate:'2027-02-04',timeUnknown:true,birthTime:''});expect(a.bazi.pillars.map(p=>p.label)).toEqual(['日柱']);
  expect(a.bazi.monthFollowingRestrictions!.checks[0]).toMatchObject({status:'pending',dayStem:'甲',monthBranches:['丑','寅']});expect(a.bazi.monthFollowingRestrictions!.checks[1].status).toBe('not-applicable');
 });
 it('freezes old solar1.8 and rejects deleting, changing or relabelling the required new analysis field',()=>{
  const p={...profile,timeBasis:'apparent-solar' as const,birthLongitude:87.6168},old=analyzeProfileV8(p),current=analyzeProfile(p);
  expect(expectedBazi(p,BAZI_V8_RULE_VERSION)).toEqual(old.bazi);expect(baziSnapshotStatus(old.bazi,p)).toBe('verified-legacy');expect(old.bazi.monthFollowingRestrictions).toBeUndefined();expect(validQimenSnapshot(old.qimen,old.bazi,p)).toBe(true);
  const absent=structuredClone(current.bazi);delete absent.monthFollowingRestrictions;expect(validBaziSnapshot(absent,p)).toBe(false);
  const tampered=structuredClone(current.bazi);tampered.monthFollowingRestrictions!.checks[0].status='applies';expect(validBaziSnapshot(tampered,p)).toBe(false);
  const relabelled=structuredClone(current.bazi);relabelled.version=BAZI_V8_RULE_VERSION;expect(validBaziSnapshot(relabelled,p)).toBe(false);
  expect(BAZI_RULE_VERSION).toContain('/1.9.0;');expect(QIMEN_RULE_VERSION).toContain('/1.4.0');
 });
});
