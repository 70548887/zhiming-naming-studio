import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {describe,expect,it} from 'vitest';
import * as api from '../src/domain/traditional/qiongtong-jia-conditions-v11';
import {evaluateQiongtongJiaConditionsV11 as evaluate,type SafeChartInput140} from '../src/domain/traditional/qiongtong-jia-conditions-v11';
import catalog from '../src/domain/traditional/qiongtong-jia-branches-v11.json';
import {analyzeProfile} from '../src/domain/engine';
import type {BirthProfile,Analysis} from '../src/shared/types';

const cases=[
  {id:'jia-yin-gui-hidden-bing-exposed',positive:{date:'2024-02-10',time:'04:00:00',pillars:['甲辰','丙寅','甲辰','丙寅']},negative:{date:'2023-02-05',time:'04:00:00',pillars:['癸卯','甲寅','甲午','丙寅']},unknownDate:'2023-02-05'},
  {id:'jia-chen-geng-ren-exposed',positive:{date:'2021-04-06',time:'12:00:00',pillars:['辛丑','壬辰','甲申','庚午']},negative:{date:'2021-04-06',time:'00:00:00',pillars:['辛丑','壬辰','甲申','甲子']},unknownDate:'2021-04-06'},
  {id:'jia-si-gui-ding-geng-exposed',positive:{date:'2003-05-11',time:'12:00:00',pillars:['癸未','丁巳','甲申','庚午']},negative:{date:'2003-05-11',time:'00:00:00',pillars:['癸未','丁巳','甲申','甲子']},unknownDate:'2003-05-11'},
  {id:'jia-you-bing-geng-exposed',positive:{date:'2020-09-08',time:'04:00:00',pillars:['庚子','乙酉','甲寅','丙寅']},negative:{date:'2020-09-08',time:'00:00:00',pillars:['庚子','乙酉','甲寅','甲子']},unknownDate:'2020-09-08'},
] as const;
const positions=['年柱','月柱','日柱','时柱'] as const;
function birth(date:string,time:string):BirthProfile{return{id:'m588-fixture',customerName:'甲木条文事实测试',surname:'林',surnamePinyin:'lin',gender:'中性',calendar:'solar',birthDate:date,birthTime:time,timeUnknown:time==='',leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:''};}
function fromAnalysis(value:Analysis):SafeChartInput140{return{pillars:value.bazi.pillars.map(row=>({position:row.label,gan:row.gan,zhi:row.zhi})) as SafeChartInput140['pillars'],unknownPositions:positions.filter(p=>!value.bazi.pillars.some(row=>row.label===p))};}
function selected(input:SafeChartInput140,id:string){return evaluate(input).checks.find(row=>row.id===id)!;}

describe('M588 first four NEW discrete facts using the real fixed calendar',()=>{
  for(const row of cases){
    it(row.id+' real positive, with source-linked literal decision only',()=>{
      const input=birth(row.positive.date,row.positive.time),before=analyzeProfile(input),serialized=JSON.stringify(before);
      expect(before.bazi.pillars.map(p=>p.gan+p.zhi)).toEqual(row.positive.pillars);
      const output=evaluate(fromAnalysis(before)),check=output.checks.find(r=>r.id===row.id)!;
      expect(check.status).toBe('condition-met');
      expect(check.decisionLevel).toBe('selected-literal-subclause-only');
      expect(check.wholeSourceBranchDecision).toBe('not-evaluated');
      expect(check.actionEvaluation).toBe('not-evaluated');expect(check.usefulGodDecision).toBe('not-evaluated');
      expect(check.source.quoteSpan.unit).toBe('unicode-codepoint');
      expect(output.schema).toBe('qiongtong-jia-literal-conditions/1.1.0');
      expect(output.namingImpact).toBe('none');
      expect(JSON.stringify(before)).toBe(serialized);expect(analyzeProfile(input)).toEqual(before);
    });
    it(row.id+' real counterexample preserves exposed/hidden scope',()=>{
      const value=analyzeProfile(birth(row.negative.date,row.negative.time));
      expect(value.bazi.pillars.map(p=>p.gan+p.zhi)).toEqual(row.negative.pillars);
      expect(selected(fromAnalysis(value),row.id).status).toBe('condition-not-met');
    });
    it(row.id+' unknown-hour absence is unknown, not a fabricated noon chart',()=>{
      const value=analyzeProfile(birth(row.unknownDate,''));
      expect(value.bazi.pillars.some(p=>p.label==='时柱')).toBe(false);
      const raw=fromAnalysis(value);expect(raw.unknownPositions).toContain('时柱');
      const result=evaluate(raw);expect(result.input.complete).toBe(false);
      expect(result.checks.find(r=>r.id===row.id)?.status).toBe('unknown');
    });
  }
  it('does not make 藏 exclusive of 透, and keeps sufficient known existence positive in a partial chart',()=>{
    const value=analyzeProfile(birth('2023-02-15','04:00:00'));
    expect(value.bazi.pillars.some(p=>p.gan==='癸')).toBe(true);
    expect(selected(fromAnalysis(value),'jia-yin-gui-hidden-bing-exposed').status).toBe('condition-met');
    const partial=analyzeProfile(birth('2024-02-10',''));
    const check=selected(fromAnalysis(partial),'jia-yin-gui-hidden-bing-exposed');
    expect(check.status).toBe('condition-met');expect(evaluate(fromAnalysis(partial)).input.complete).toBe(false);
  });
  it('does not borrow hidden 庚 or 丙 as proof of exposure in the three later-month negatives',()=>{
    for(const row of cases.slice(1)){
      const value=analyzeProfile(birth(row.negative.date,row.negative.time));
      const stem=row.id.includes('you')?'丙':'庚';
      expect(value.bazi.evidence!.hiddenStems.some(h=>h.stem===stem)).toBe(true);
      expect(value.bazi.pillars.some(p=>p.gan===stem)).toBe(false);
      expect(selected(fromAnalysis(value),row.id).status).toBe('condition-not-met');
    }
  });
});

describe('M588 known exclusion, unknowns and unchanged reviewed safe raw entry',()=>{
  it('known non-甲 day excludes all four even when the month is unknown',()=>{
    const result=evaluate({pillars:[{position:'日柱',gan:'辛',zhi:'丑'}],unknownPositions:['年柱','月柱','时柱']});
    expect(result.checks.every(r=>r.status==='not-applicable')).toBe(true);
    expect(result.checks.every(r=>r.applicability.dayStem==='not-met'&&r.applicability.monthBranch==='unknown')).toBe(true);
  });
  it('a known unselected month excludes even with unknown day; all-unknown stays unknown',()=>{
    const result=evaluate({pillars:[{position:'月柱',gan:'丁',zhi:'卯'}],unknownPositions:['年柱','日柱','时柱']});
    expect(result.checks.every(r=>r.status==='not-applicable')).toBe(true);
    expect(evaluate({pillars:[],unknownPositions:positions}).checks.every(r=>r.status==='unknown')).toBe(true);
  });
  it('known 甲 but unknown month cannot be promoted to applicability',()=>{
    const result=evaluate({pillars:[{position:'日柱',gan:'甲',zhi:'辰'}],unknownPositions:['年柱','月柱','时柱']});
    expect(result.checks.every(r=>r.status==='unknown')).toBe(true);
  });
  it('rejects caller-derived booleans/hidden facts, missing/duplicate/conflicting positions',()=>{
    const input=fromAnalysis(analyzeProfile(birth('2003-05-11','12:00:00')));
    expect(()=>evaluate({...input,complete:true} as never)).toThrow('未允许字段');
    expect(()=>evaluate({...input,hiddenStems:[{position:'月柱',branch:'巳',stem:'壬'}]} as never)).toThrow('未允许字段');
    expect(()=>evaluate({pillars:input.pillars.slice(0,3)})).toThrow('缺失柱位');
    expect(()=>evaluate({pillars:[input.pillars[0],input.pillars[0]],unknownPositions:['月柱','日柱','时柱']})).toThrow('重复');
    expect(()=>evaluate({...input,unknownPositions:['时柱']})).toThrow('同时声明');
  });
  it('rejects proxies and accessors without invoking them, plus hidden/symbol/sparse-array claims',()=>{
    let count=0;const input=fromAnalysis(analyzeProfile(birth('2003-05-11','12:00:00')));
    expect(()=>evaluate(new Proxy(input,{getPrototypeOf(){count++;throw new Error('trap')}}))).toThrow('代理');
    expect(()=>evaluate(Object.defineProperty({},'pillars',{enumerable:true,get(){count++;return[]}}) as never)).toThrow('访问器');
    expect(()=>evaluate({...input,[Symbol('trust')]:true} as never)).toThrow('未允许字段');
    expect(()=>evaluate(Object.defineProperty(input,'hidden',{value:1}) as never)).toThrow('未允许字段');
    expect(()=>evaluate({pillars:Array(4)})).toThrow();expect(count).toBe(0);
  });
  it('exports only the new evaluator at runtime; reviewed derive nodes are copied unchanged and private',()=>{
    expect(Object.keys(api)).toEqual(['evaluateQiongtongJiaConditionsV11']);
    const here=new URL('../src/domain/traditional/qiongtong-jia-conditions-v11.ts',import.meta.url),source=ts.createSourceFile('candidate.ts',readFileSync(here,'utf8'),ts.ScriptTarget.Latest,true);
    const previousPath=new URL('../src/domain/traditional/qiongtong-clause-reference.ts',import.meta.url);
    const previous=ts.createSourceFile('accepted-v101.ts',readFileSync(previousPath,'utf8'),ts.ScriptTarget.Latest,true);
    const selectedNames=['PillarPosition','Stem','Branch','SafeChartInput140','PositionPillar','DerivedFacts','POSITIONS','STEMS','BRANCHES','HIDDEN','freeze','plainObject','denseArray','derive'];
    function name(node:ts.Node):string[]{if(ts.isFunctionDeclaration(node)||ts.isInterfaceDeclaration(node)||ts.isTypeAliasDeclaration(node))return[node.name?.text??''];if(ts.isVariableStatement(node))return node.declarationList.declarations.map(d=>ts.isIdentifier(d.name)?d.name.text:'');return[];}
    for(const selectedName of selectedNames){const node=source.statements.find(n=>name(n).includes(selectedName)),accepted=previous.statements.find(n=>name(n).includes(selectedName));expect(node,selectedName).toBeDefined();expect(accepted,selectedName).toBeDefined();expect(node!.getText(source),selectedName).toBe(accepted!.getText(previous));}
  });
});

describe('M588 complete source alignment and honest per-month coverage',()=>{
  it('pins the entire 3928-codepoint Jia section and all 65 paragraphs, not twelve truncated initial sentences',()=>{
    const raw=readFileSync(new URL('../data/raw/classics-qiongtong-2294674.wiki',import.meta.url));
    expect(createHash('sha256').update(raw).digest('hex')).toBe(catalog.source.rawSha256);
    const points=Array.from(raw.toString('utf8'));
    expect(catalog.source.chapterSpan).toEqual({start:1292,end:5220,unit:'unicode-codepoint',interval:'[start,end)'});
    expect(catalog.source.chapterCodepoints).toBe(3928);expect(catalog.paragraphs).toHaveLength(65);
    const covered=new Set<number>();
    for(const row of catalog.paragraphs){const exact=points.slice(row.sourceSpan.start,row.sourceSpan.end).join('');expect(createHash('sha256').update(exact).digest('hex')).toBe(row.sha256);for(let n=row.sourceSpan.start;n<row.sourceSpan.end;n++)covered.add(n);}
    for(let n=1292;n<5220;n++)if(!covered.has(n))expect(/\s/u.test(points[n])).toBe(true);
  });
  it('binds every identified branch anchor and each new rule quote to exact full-context positions',()=>{
    const points=Array.from(readFileSync(new URL('../data/raw/classics-qiongtong-2294674.wiki',import.meta.url),'utf8'));
    expect(catalog.branchAnchors).toHaveLength(159);
    for(const anchor of catalog.branchAnchors)expect(points.slice(anchor.quoteSpan.start,anchor.quoteSpan.end).join(''),anchor.id).toBe(anchor.sourceQuote);
    for(const rule of catalog.executable){expect(points.slice(rule.source.quoteSpan.start,rule.source.quoteSpan.end).join('')).toBe(rule.source.quote);expect(createHash('sha256').update(points.slice(rule.source.contextSpan.start,rule.source.contextSpan.end).join('')).digest('hex')).toBe(rule.source.contextSha256);}
  });
  it('states only four NEW predicates, keeps previous branches separate, and lists the unimplemented source sentence units',()=>{
    expect(catalog.executable.map(r=>r.id)).toEqual(cases.map(c=>c.id));
    expect(catalog.coveragePolicy.fullSourceAlignment).toBe(true);
    expect(catalog.coveragePolicy.fullSemanticBranchClosure).toBe(false);
    expect(catalog.branchAnchors.filter(a=>a.implementation==='existing-version-only').map(a=>a.ruleId)).toEqual(['jia-yin-mao-fixed-month-restriction','jia-hai-three-exposed','jia-chou-geng-exposed-ding-hidden']);
    const points=Array.from(readFileSync(new URL('../data/raw/classics-qiongtong-2294674.wiki',import.meta.url),'utf8'));
    const sentenceIds=catalog.paragraphs.flatMap(row=>(points.slice(row.sourceSpan.start,row.sourceSpan.end).join('').match(/[^。！？]+[。！？]?/gu)||[]).map((_text,index)=>row.id+'-sentence-'+String(index+1).padStart(2,'0')));
    expect(sentenceIds).toHaveLength(190);
    expect(catalog.monthCoverage).toHaveLength(12);
    for(const month of catalog.monthCoverage){expect(month.fullMonthDecisionImplemented).toBe(false);expect(month.needsDefinition).toBeGreaterThan(0);expect(month.actualUnimplementedSentenceIds.length).toBeGreaterThan(0);for(const id of month.actualUnimplementedSentenceIds)expect(sentenceIds).toContain(id);}
  });
  it('does not return historical outcome/kin assertions or promote partial unknowns into implemented branches',()=>{
    const result=evaluate(fromAnalysis(analyzeProfile(birth('2024-02-10','04:00:00'))));
    expect(JSON.stringify(result)).not.toMatch(/富贵|科甲|妻|残疾|寿命|淫/);
    expect(result.coverage.fullChapterDecisionImplemented).toBe(false);expect(result.coverage.newlyExecutablePredicates).toBe(4);
    expect(result.coverage.months.filter(m=>m.newExecutablePredicates===1).map(m=>m.monthBranch)).toEqual(['寅','辰','巳','酉']);
  });
  it('keeps frozen output and source metadata independent from later imported-JSON mutation',()=>{
    const input=fromAnalysis(analyzeProfile(birth('2024-02-10','04:00:00'))),before=JSON.stringify(evaluate(input));
    const original=structuredClone(catalog);
    try{catalog.source.rawSha256='0'.repeat(64);catalog.version='tampered';catalog.executable[0].source.quote='tampered';catalog.executable[0].predicate.items[0].stem='壬';catalog.monthCoverage[0].newExecutablePredicates=99;
      expect(JSON.stringify(evaluate(input))).toBe(before);
      expect(()=>((evaluate(input).checks[0].literalFact.evidence as string[]).push('fake'))).toThrow();
    }finally{Object.assign(catalog,original);}
  });
});
