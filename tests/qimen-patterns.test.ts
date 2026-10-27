import { describe, expect, it } from 'vitest';
import { analyzeProfile, calculateQimenPlate, QIMEN_RULE_VERSION } from '../src/domain/engine';
import { calculateQimenPatterns, qimenPatternPalaceMarks, qimenPatternRules, QIMEN_PATTERN_VERSION, validQimenPatternsSnapshot } from '../src/domain/qimen-patterns';
import type { BirthProfile, QimenPalace, QimenPatternAnalysis, QimenPatternFinding } from '../src/shared/types';
import fixtures from './fixtures/qimen-patterns-examples.json';

const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
const reverseKeys=(value:unknown):unknown=>Array.isArray(value)?value.map(reverseKeys):value && typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([key,item])=>[key,reverseKeys(item)])):value;
const profile=(extra:Partial<BirthProfile>={}):BirthProfile=>({id:'pattern-test',customerName:'测试',surname:'王',surnamePinyin:'wáng',gender:'中性',calendar:'solar',birthDate:'2024-02-10',leapMonth:false,birthTime:'08:30',timeUnknown:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:'',...extra});
const sort=<T extends {palace:number}>(rows:T[])=>rows.sort((a,b)=>a.palace-b.palace || JSON.stringify(a).localeCompare(JSON.stringify(b)));
const stemFindings=(patterns:QimenPatternAnalysis,kind:'jixing'|'rumu')=>sort(patterns.findings.filter(f=>f.kind===kind).flatMap(f=>f.subjects.map(subject=>({palace:f.palaces[0],stem:subject[0],hosted:subject.includes('寄干')}))));
const layerHit=(patterns:QimenPatternAnalysis,layer:'stars'|'doors',kind:'fuyin'|'fanyin')=>patterns.findings.some(f=>f.layer===layer && f.kind===kind);
const findingKeys=['menpo','jixing','rumu','starFuyin','starFanyin','doorFuyin','doorFanyin'] as const;

describe('fixed-school Qimen structural analysis with independent supplied-ju expectations',()=>{
  it('matches all 18 yin/yang ju × 60 hours of fixed upstream plate layers and separately derived structural facts',()=>{
    expect(fixtures.cases).toHaveLength(1080);
    const counts=Object.fromEntries(findingKeys.map(key=>[key,{positive:0,negative:0}]));
    for(const fixture of fixtures.cases) {
      const q=calculateQimenPlate(fixture.input.dayGanzhi,fixture.input.hourGanzhi,fixture.input.solarTerm);
      expect(q.ju,fixture.id).toBe(fixture.suppliedJu.ju);
      expect(q.dun==='阳遁',fixture.id).toBe(fixture.suppliedJu.yang);
      // The external source leaves only its nonrotating center's display descriptors blank.
      expect(q.palaces.map(({number,earth,heaven,star,door})=>({number,earth,heaven:number===5?'':heaven,star:number===5?'':star,door})),fixture.id).toEqual(fixture.expected.palaces);
      const patterns=q.patterns!;
      const actual={
        menpo:sort(patterns.findings.filter(f=>f.kind==='menpo').map(f=>({palace:f.palaces[0],door:f.subjects[0]}))),
        jixing:stemFindings(patterns,'jixing'),rumu:stemFindings(patterns,'rumu'),
        starFuyin:layerHit(patterns,'stars','fuyin'),starFanyin:layerHit(patterns,'stars','fanyin'),
        doorFuyin:layerHit(patterns,'doors','fuyin'),doorFanyin:layerHit(patterns,'doors','fanyin')
      };
      expect(actual,fixture.id).toEqual({...fixture.expected,palaces:undefined});
      expect(patterns.checks,fixture.id).toHaveLength(7);
      findingKeys.forEach((key,index)=>{
        const hit=typeof actual[key]==='boolean'?actual[key]:actual[key].length>0;
        counts[key][hit?'positive':'negative']++;
        expect(patterns.checks[index].status,`${fixture.id}:${key}`).toBe(hit?'matched':'not-matched');
        expect(patterns.checks[index].evidence.length,`${fixture.id}:${key}`).toBeGreaterThan(0);
      });
      for(const p of q.palaces) expect(p.marks.filter(mark=>!mark.startsWith('时') && !mark.startsWith('中五')),fixture.id).toEqual(qimenPatternPalaceMarks(patterns,p.number));
    }
    for(const key of findingKeys) {
      expect(counts[key].positive,key).toBe(fixtures.coverage[key].positive);
      expect(counts[key].negative,key).toBe(fixtures.coverage[key].negative);
      expect(counts[key].positive,key).toBeGreaterThanOrEqual(3);
      expect(counts[key].negative,key).toBeGreaterThanOrEqual(3);
    }
  },20000);

  it('covers exactly the independently transcribed 13 door pairs, six instrument palaces and three selected tomb palaces',()=>{
    const doorPairs=new Set<string>(),strikePairs=new Set<string>(),tombPairs=new Set<string>();
    for(const fixture of fixtures.cases) {
      const p=calculateQimenPlate(fixture.input.dayGanzhi,fixture.input.hourGanzhi,fixture.input.solarTerm).patterns!;
      p.findings.filter(f=>f.kind==='menpo').forEach(f=>doorPairs.add(`${f.subjects[0]}:${f.palaces[0]}`));
      stemFindings(p,'jixing').forEach(f=>strikePairs.add(`${f.stem}:${f.palace}`));
      stemFindings(p,'rumu').forEach(f=>tombPairs.add(`${f.stem}:${f.palace}`));
    }
    expect([...doorPairs].sort()).toEqual(fixtures.ruleTables.doorPairs.map(([door,palace])=>`${door}:${palace}`).sort());
    expect([...strikePairs].sort()).toEqual(Object.entries(fixtures.ruleTables.strike).map(([stem,palace])=>`${stem}:${palace}`).sort());
    expect([...tombPairs].sort()).toEqual(Object.entries(fixtures.ruleTables.tomb).map(([stem,palace])=>`${stem}:${palace}`).sort());
  },20000);

  it('counts hosted instruments and qi only at their actual Tianrui palace and never repeats them in center',()=>{
    const selected=fixtures.cases.filter(f=>[...f.expected.jixing,...f.expected.rumu].some(finding=>finding.hosted));
    expect(selected.length).toBeGreaterThan(3);
    for(const fixture of selected) {
      const q=calculateQimenPlate(fixture.input.dayGanzhi,fixture.input.hourGanzhi,fixture.input.solarTerm);
      for(const key of ['jixing','rumu'] as const) {
        expect(stemFindings(q.patterns!,key),fixture.id).toEqual(sort(clone(fixture.expected[key])));
        for(const hit of stemFindings(q.patterns!,key).filter(hit=>hit.hosted)) expect(q.palaces.find(p=>p.number===hit.palace)?.star,fixture.id).toBe('天芮、天禽');
      }
      expect(qimenPatternPalaceMarks(q.patterns,5),fixture.id).toEqual([]);
      expect(q.palaces.find(p=>p.number===5)?.marks,fixture.id).toEqual(['中五寄坤，天禽随天芮']);
    }
  });

  it('does not substitute one chief sector or six matching sectors for an entire eight-item layer',()=>{
    for(const [field,layer,key] of [['star','stars','starFuyin'],['door','doors','doorFuyin'],['star','stars','starFanyin'],['door','doors','doorFanyin']] as const) {
      const fixture=fixtures.cases.find(f=>f.expected[key])!;
      const q=calculateQimenPlate(fixture.input.dayGanzhi,fixture.input.hourGanzhi,fixture.input.solarTerm);
      const palaces=clone(q.palaces),movable=palaces.filter(p=>p.number!==5 && !p.star.includes('天芮')).slice(0,2);
      [movable[0][field],movable[1][field]]=[movable[1][field],movable[0][field]];
      const p=calculateQimenPatterns(palaces);
      const kind=key.endsWith('Fuyin')?'fuyin':'fanyin';
      expect(layerHit(p,layer,kind),key).toBe(false);
      expect(p.checks.find(check=>check.layer===layer && check.ruleId.endsWith(kind))?.evidence.at(-1),key).toContain('6/8');
    }
  });

  it('keeps the unselected 丁乾 and alternative 乙乾 readings out of the selected three-qi tomb rule',()=>{
    for(const stem of ['丁','乙']) {
      const selected=fixtures.cases.filter(f=>f.expected.palaces.find(p=>p.number===6)?.heaven.includes(stem));
      expect(selected.length).toBeGreaterThanOrEqual(3);
      for(const fixture of selected) {
        const q=calculateQimenPlate(fixture.input.dayGanzhi,fixture.input.hourGanzhi,fixture.input.solarTerm);
        expect(stemFindings(q.patterns!,'rumu').some(f=>f.stem===stem && f.palace===6),fixture.id).toBe(false);
      }
    }
    expect(qimenPatternRules()[2].conditions.join('')).toContain('丁墓乾六');
    expect(qimenPatternRules()[2].sources.every(source=>source.id==='qimen-arc-structural-patterns')).toBe(true);
  });

  it('is input-order independent, has exact-version metadata, and returns fresh mutable copies',()=>{
    const q=calculateQimenPlate('甲子','甲子','冬至'),p=q.patterns!;
    expect(QIMEN_RULE_VERSION).toBe('zhuanpan-chaibu-futou-kun2/1.4.0');
    expect(p.version).toBe(QIMEN_PATTERN_VERSION);
    expect(p.rules).toHaveLength(7);
    expect(p.checks.map(c=>c.ruleId)).toEqual(p.rules.map(r=>r.id));
    expect(p.rules.every(rule=>rule.sources.every(source=>/^[a-f0-9]{40}$/.test(source.commit)))).toBe(true);
    expect(calculateQimenPatterns([...q.palaces].reverse())).toEqual(p);
    expect(validQimenPatternsSnapshot(reverseKeys(p),q.palaces)).toBe(true);
    const rules=qimenPatternRules();rules[0].sources[0].commit='altered';rules[1].conditions.push('altered');
    p.findings[0].subjects.push('altered');p.rules[0].name='altered';p.checks[0].evidence=[];
    expect(calculateQimenPatterns(q.palaces).rules).toEqual(qimenPatternRules());
    expect(JSON.stringify(calculateQimenPatterns(q.palaces))).not.toContain('altered');
  });

  it('rejects altered findings, absence statuses, evidence, provenance and versions instead of trusting a snapshot',()=>{
    const q=calculateQimenPlate('甲子','甲子','冬至'),original=q.patterns!;
    const mutations:((value:any)=>void)[]=[
      p=>p.version='0',p=>p.school='different',p=>p.rules.pop(),p=>p.rules[0].sources[0].commit='0'.repeat(40),
      p=>p.rules[0].conditions=[],p=>p.rules[0].name='大吉',p=>p.checks.pop(),p=>p.checks[0].status='matched',
      p=>p.checks[0].evidence=[],p=>p.checks[1].palaces=[5],p=>p.findings.pop(),p=>p.findings[0].label='保证大吉',
      p=>p.findings[0].layer='earth',p=>p.findings[0].subjects=['甲'],p=>p.findings[0].ruleVersion='0',
      p=>p.findings[0].evidence=['任意'],p=>p.warnings=[],p=>p.extra=true
    ];
    for(const mutate of mutations) { const p=clone(original);mutate(p);expect(validQimenPatternsSnapshot(p,q.palaces)).toBe(false); }
    for(const value of [undefined,null,[],{},'text',Infinity,new Date()]) expect(validQimenPatternsSnapshot(value,q.palaces)).toBe(false);
    const cycle:any={};cycle.self=cycle;expect(validQimenPatternsSnapshot(cycle,q.palaces)).toBe(false);
    const sparse=clone(original);delete sparse.checks[0];expect(validQimenPatternsSnapshot(sparse,q.palaces)).toBe(false);
    const withSymbol=clone(original);(withSymbol as any)[Symbol('extra')]=true;expect(validQimenPatternsSnapshot(withSymbol,q.palaces)).toBe(false);
  });

  it('rejects malformed plate inputs and inherited object names as door identities without throwing from the snapshot guard',()=>{
    const q=calculateQimenPlate('甲子','甲子','冬至');
    const mutations:((palaces:QimenPalace[])=>void)[]=[
      p=>p.pop(),p=>p[0].number=5,p=>p[0].number=0,p=>p[0].star='天禽',p=>p[0].door='toString',
      p=>p[0].door=p[1].door,p=>p[0].heaven='甲',p=>p[0].heaven='乙（寄甲）',p=>p[0].star='天辅、天禽'
    ];
    for(const mutate of mutations) {
      const palaces=clone(q.palaces);mutate(palaces);
      expect(()=>calculateQimenPatterns(palaces)).toThrow('结构辅助');
      expect(validQimenPatternsSnapshot(q.patterns,palaces)).toBe(false);
    }
    expect(qimenPatternPalaceMarks(undefined,1)).toEqual([]);
    expect(qimenPatternPalaceMarks(q.patterns,5)).toEqual([]);
  });

  it('keeps missing-hour charts unanalysed and recomputes markers from the correct side of a solstice boundary',()=>{
    const unknown=analyzeProfile(profile({timeUnknown:true,birthTime:''})).qimen;
    expect(unknown.available).toBe(false);expect(unknown.patterns).toBeUndefined();
    const before=analyzeProfile(profile({birthDate:'2024-06-21',birthTime:'04:50'})).qimen;
    const after=analyzeProfile(profile({birthDate:'2024-06-21',birthTime:'04:52'})).qimen;
    expect([before.dun,after.dun]).toEqual(['阳遁','阴遁']);
    expect(before.solarTerm).toBe('芒种');expect(after.solarTerm).toBe('夏至');
    for(const q of [before,after]) {
      expect(validQimenPatternsSnapshot(q.patterns,q.palaces)).toBe(true);
      expect(q.patterns?.checks).toHaveLength(7);
      expect(q.patterns?.findings.every((f:QimenPatternFinding)=>!f.palaces.includes(5))).toBe(true);
    }
  });
});
