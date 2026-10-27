import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {afterEach,describe,expect,it,vi} from 'vitest';
import * as adapter from '../src/domain/traditional/jia-hai-control-v1';
import {evaluateJiaHaiControlProjection as evaluate} from '../src/domain/traditional/jia-hai-control-v1';
import type {JiaHaiControlProjection,JiaHaiCarrierSelector} from '../src/domain/traditional/jia-hai-control-types';
import {analyzeProfile} from '../src/domain/engine';
import * as legacy from '../src/domain/bazi-mainchain/project-v13';
import projectParameters from '../src/domain/bazi-mainchain/project-v13/rules/project-mainchain-1.3.1.json';
import sourceContext from '../src/domain/traditional/jia-hai-wu-ren-source.json';
import type {BirthProfile} from '../src/shared/types';

const profile=(date='2000-11-12',time='08:00:00'):BirthProfile=>({id:'m625-test',customerName:'戊壬项目干预测试',surname:'林',surnamePinyin:'lin',gender:'中性',calendar:'solar',birthDate:date,birthTime:time,timeUnknown:time==='',leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:''});
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function explicit(date:string,time:string,hiddenCarrierId:string){const discovery=evaluate(profile(date,time),{enabled:true});const choice=discovery.project.candidates.find(c=>c.hiddenCarrier.id===hiddenCarrierId);expect(choice).toBeDefined();return evaluate(profile(date,time),{enabled:true,selector:choice!.selector});}
function retained(result:JiaHaiControlProjection){return result.project.pairedRegimes.filter(p=>p.retainedOnEitherSide);}
function saveEvidence(file:string,value:unknown){const directory=process.env.M625_EVIDENCE_DIR;if(directory)writeFileSync(join(directory,file),JSON.stringify(value,null,2)+'\n');}
afterEach(()=>vi.restoreAllMocks());

describe('M625 closed canonical carrier selector, default off',()=>{
  it('exports only a profile-based adapter, defaults off, and does not invoke legacy comparison',()=>{
    const spy=vi.spyOn(legacy,'compareRootFeedbackIntervention145'),input=profile(),before=JSON.stringify(input),result=evaluate(input);
    expect(Object.keys(adapter)).toEqual(['evaluateJiaHaiControlProjection']);
    expect(result.project.enabled).toBe(false);expect(result.project.status).toBe('disabled');expect(result.project.discovery).toBeNull();expect(result.project.legacyComparison).toBeNull();expect(spy).not.toHaveBeenCalled();
    expect(result.birth.originalAnalysisDigest).toBe(hash(analyzeProfile(input)));expect(JSON.stringify(input)).toBe(before);
    expect(result.traditional.status).toBe('traditional-unknown');expect(result.traditional.dependencies).toHaveLength(4);expect(result.traditional.dependencies.every(d=>d.status==='unknown')).toBe(true);
  });
  it('resolves the genuine 2000-11-12 08:00 graph to one canonical 戊→壬→same hidden carrier chain',()=>{
    const spy=vi.spyOn(legacy,'compareRootFeedbackIntervention145'),input=profile(),before=analyzeProfile(input),result=evaluate(input,{enabled:true});
    expect(result.birth.knownPillars.map(p=>p.gan+p.zhi)).toEqual(['庚辰','丁亥','甲戌','戊辰']);
    expect(result.project.status).toBe('projected-only');expect(result.project.candidates).toHaveLength(1);
    const selected=result.project.selected!;
    expect(selected.canonicalEdgeId).toBe('control:hour:stem:month:hidden:壬');
    expect(selected.attackerToHiddenEdgeId).toBe('control:month:hidden:壬:day:hidden:丁');
    expect(selected.controller.stem).toBe('戊');expect(selected.controller.kind).toBe('exposed');expect(selected.attacker.stem).toBe('壬');expect(selected.hiddenCarrier.id).toBe('day:hidden:丁');
    expect(spy).toHaveBeenCalledTimes(1);expect(spy.mock.calls[0][1]).toEqual([selected.canonicalEdgeId]);
    expect(result.project.legacyComparison!.disabledControlEdgeIds).toEqual([selected.canonicalEdgeId]);
    expect(result.project.legacyComparison!.full.regimes).toHaveLength(16);expect(result.project.legacyComparison!.without.regimes).toHaveLength(16);
    expect(result.project.comparisonResolution).toBe('two-unique-regime-comparison');
    expect(analyzeProfile(input)).toEqual(before);expect(result.birth.originalAnalysisDigest).toBe(hash(before));
    saveEvidence('real-0800-result.json',result);
  });
  it('returns source-backed candidates rather than choosing the first of multiple chains',()=>{
    const spy=vi.spyOn(legacy,'compareRootFeedbackIntervention145'),result=evaluate(profile('1970-11-10','08:00:00'),{enabled:true});
    expect(result.project.candidates.length).toBeGreaterThan(1);expect(result.project.status).toBe('ambiguous-selector');expect(result.project.selected).toBeNull();expect(result.project.legacyComparison).toBeNull();expect(spy).not.toHaveBeenCalled();
    for(const candidate of result.project.candidates){expect(candidate.canonicalEdgeId).toBe('control:'+candidate.controller.id+':'+candidate.attacker.id);expect(candidate.attackerToHiddenEdgeId).toBe('control:'+candidate.attacker.id+':'+candidate.hiddenCarrier.id);expect(candidate.graphIdentity).toMatch(/^[a-f0-9]{64}$/);}
  });
  it('allows only internally rechecked typed node identifiers to select the unique chain',()=>{
    const result=explicit('1970-11-10','08:00:00','day:hidden:丁');
    expect(result.project.status).toBe('projected-only');expect(result.project.selected!.selector.hiddenCarrierId).toBe('day:hidden:丁');
    expect(result.project.legacyComparison!.disabledControlEdgeIds).toHaveLength(1);
    for(const c of result.project.selectedLegacyCertificates){expect(c.rescueEdgeId).toBe(result.project.selected!.canonicalEdgeId);expect(c.attackerId).toBe(result.project.selected!.attacker.id);expect(c.hiddenRootId).toBe('day:hidden:丁');}
  });
  it('rejects arbitrary edge IDs, lists, thresholds, graph/root claims and unknown/non-戊 carriers before an intervention',()=>{
    const spy=vi.spyOn(legacy,'compareRootFeedbackIntervention145');
    for(const invalid of [{enabled:true,edgeId:'control:any'}, {enabled:true,disabledControlEdgeIds:['a','b']}, {enabled:true,threshold:0}, {enabled:true,graph:{}}, {enabled:true,selector:[]}])expect(()=>evaluate(profile(),invalid as never)).toThrow();
    expect(spy).not.toHaveBeenCalled();
    const bad:JiaHaiCarrierSelector={controllerId:'day:stem',attackerId:'month:hidden:壬',hiddenCarrierId:'day:hidden:丁'};
    const result=evaluate(profile(),{enabled:true,selector:bad});expect(result.project.status).toBe('selector-rejected');expect(result.project.legacyComparison).toBeNull();
    expect(evaluate(profile(),{enabled:true,selector:{controllerId:'hour:stem',attackerId:'unknown',hiddenCarrierId:'day:hidden:丁'}}).project.status).toBe('selector-rejected');expect(spy).not.toHaveBeenCalled();
    expect(()=>evaluate({...profile(),rooted:true} as never,{enabled:true})).toThrow('未允许字段');
  });
});

describe('M625 real solver invariants, numeric certificates and contrary outcomes',()=>{
  it('keeps nodes, roots, capacities, other paths and original control denominators identical within EVERY paired regime',()=>{
    const result=evaluate(profile(),{enabled:true});
    expect(result.project.pairedRegimes).toHaveLength(16);
    for(const pair of result.project.pairedRegimes){
      expect(pair.invariants.valid,pair.regimeId).toBe(true);expect(pair.invariants.issues).toEqual([]);expect(pair.invariants.graphDigestEnabled).toBe(pair.invariants.graphDigestDisabled);
      const a=pair.convergenceEnabled!,b=pair.convergenceDisabled!;expect(a.status).toBe('closed');expect(b.status).toBe('closed');
      expect(a.nodes).toEqual(b.nodes);expect(a.columnSums).toEqual(b.columnSums);expect(a.columnSumUpperBounds).toEqual(b.columnSumUpperBounds);
      expect(a.disabledEdgeIds).toEqual([]);expect(b.disabledEdgeIds).toEqual([result.project.selected!.canonicalEdgeId]);
      expect(a.fixedCoefficients.map(e=>({...e,disabled:false}))).toEqual(b.fixedCoefficients.map(e=>({...e,disabled:false})));
      expect(a.maxIterations).toBe(64);expect(a.epsilon).toBe(1e-9);expect(a.controlFraction).toBe(.25);expect(a.maxLossFraction).toBe(.8);
      expect(a.errorBound).not.toBeNull();expect(b.errorBound).not.toBeNull();expect(a.iterations).toBeGreaterThan(0);expect(b.iterations).toBeGreaterThan(0);
      expect(pair.capacities.some(c=>c.carrierId===result.project.selected!.controller.id)).toBe(true);expect(pair.deltas).not.toBeNull();
    }
    expect(result.project.controls).toBe('same-regime-capacity-and-original-control-denominator');expect(result.project.generation).toBe('unchanged-existing-rule-recomputed-from-each-solution');
  });
  it('actually invokes the old comparison unmodified; its full numerical result is preserved exactly',()=>{
    const result=evaluate(profile(),{enabled:true});
    const expected=legacy.compareRootFeedbackIntervention145(result.birth.chart!,[result.project.selected!.canonicalEdgeId],{});
    expect(result.project.legacyComparison).toEqual(expected);
  });
  it('has a real 08:00 no-net-root-rescue counterexample: 壬 is reduced but the selected root gain is uncertified',()=>{
    const result=evaluate(profile(),{enabled:true}),pair=retained(result)[0],selected=result.project.selected!;
    const a=pair.convergenceEnabled!,b=pair.convergenceDisabled!;expect(a.status).toBe('closed');expect(b.status).toBe('closed');if(a.status!=='closed'||b.status!=='closed')throw new Error('closed required');
    expect(a.lossByEdge.find(e=>e.id===selected.canonicalEdgeId)!.loss).toBeGreaterThan(0);
    expect(b.lossByEdge.find(e=>e.id===selected.canonicalEdgeId)!.loss).toBe(0);
    expect(pair.deltas!.renRemainingReduction.lower).toBeGreaterThan(0);
    expect(pair.deltas!.selectedHiddenCarrierPowerChange.lower).toBeLessThanOrEqual(0);expect(pair.deltas!.selectedHiddenCarrierPowerChange.upper).toBeGreaterThanOrEqual(0);
    expect(pair.deltas!.selectedHiddenTotalLossReduction.lower).toBeLessThanOrEqual(0);expect(pair.deltas!.selectedHiddenTotalLossReduction.upper).toBeGreaterThanOrEqual(0);
    expect(pair.deltas!.jiaDayPowerChange.upper).toBeLessThan(0);
    expect(result.project.selectedLegacyCertificates.every(c=>c.status==='no-certified-net-benefit')).toBe(true);
    expect(result.project.legacyComparison!.definiteRestoration).toBe(false);expect(result.traditional.status).toBe('traditional-unknown');
  });
  it('preserves the genuine 1970-11-10 negative side effect: 丁 power improves while 庚 power decreases',()=>{
    const result=explicit('1970-11-10','08:00:00','day:hidden:丁'),pairs=retained(result);
    expect(result.birth.knownPillars.map(p=>p.gan+p.zhi)).toEqual(['庚戌','丁亥','甲午','戊辰']);
    expect(pairs.some(p=>p.deltas!.gengNamedCarrierPowerChange.upper<0&&p.deltas!.dingNamedCarrierPowerChange.lower>0)).toBe(true);
    expect(result.traditional.status).toBe('traditional-unknown');expect(result.traditional.dependencies.every(p=>p.status==='unknown')).toBe(true);
    expect(result.traditional.usefulGodDecision).toBe('not-evaluated');expect(result.project.scoreMutation).toBe(false);
    saveEvidence('negative-side-effect-result.json',result);
  });
  it('retains genuine multiple consistent feedback regimes, with same-state deltas kept separate',()=>{
    const result=explicit('1990-12-05','08:00:00','year:hidden:丁');
    expect(result.project.legacyComparison!.full.resolution).toBe('multiple-consistent-regimes');
    expect(result.project.legacyComparison!.full.consistentIds.length).toBeGreaterThan(1);expect(result.project.comparisonResolution).toBe('conditional-or-unresolved');
    expect(retained(result).length).toBeGreaterThan(1);expect(result.project.stopReasons.join('')).toContain('不拼接');
    expect(result.project.legacyComparison!.definiteRestoration).toBe(false);expect(result.traditional.status).toBe('traditional-unknown');
    saveEvidence('multiple-feedback-result.json',result);
  });
});

describe('M625 inapplicability, unknown calendar, source provenance and fail-closed metadata',()=>{
  it('2000-11-12 16:00 has no exposed 戊 and never substitutes a hidden 戊',()=>{
    const spy=vi.spyOn(legacy,'compareRootFeedbackIntervention145'),result=evaluate(profile('2000-11-12','16:00:00'),{enabled:true});
    expect(result.birth.knownPillars.map(p=>p.gan+p.zhi)).toEqual(['庚辰','丁亥','甲戌','壬申']);
    expect(result.literal.exposedWu).toBe('not-seen');expect(result.project.status).toBe('no-eligible-path');expect(result.project.candidates).toEqual([]);expect(spy).not.toHaveBeenCalled();expect(result.traditional.status).toBe('traditional-unknown');
  });
  it('the real unknown-hour case runs the known-three-pillar discovery but retains all eight possible states',()=>{
    const result=evaluate(profile('2000-11-12',''),{enabled:true});
    expect(result.birth.chart!.pillars.hour).toBeNull();expect(result.literal.exposedWu).toBe('unknown');expect(result.project.status).toBe('pending-incomplete-graph');
    expect(result.project.discovery!.resolution).toBe('pending-regime-resolution');expect(result.project.discovery!.possibleIds).toHaveLength(8);expect(result.project.discovery!.consistentIds).toEqual([]);
    expect(result.project.discovery!.regimes.every(r=>r.rootIntervals.every(p=>p.value==='unknown'))).toBe(true);expect(result.project.legacyComparison).toBeNull();
  });
  it('even with a known exposed 戊 and a visible candidate chain, an unknown hour never reaches the full intervention call',()=>{
    const spy=vi.spyOn(legacy,'compareRootFeedbackIntervention145'),result=evaluate(profile('1998-11-13',''),{enabled:true});
    expect(result.literal.exposedWu).toBe('present');expect(result.project.candidates.length).toBeGreaterThan(0);
    expect(result.project.discovery!.resolution).toBe('pending-regime-resolution');expect(result.project.status).toBe('pending-incomplete-graph');
    expect(result.project.legacyComparison).toBeNull();expect(result.project.selected).toBeNull();expect(spy).not.toHaveBeenCalled();
  });
  it('known wrong month is not applicable, and unresolved apparent-solar day is calendar-unknown',()=>{
    const spy=vi.spyOn(legacy,'compareRootFeedbackIntervention145'),wrong=evaluate(profile('2020-05-11','12:00:00'),{enabled:true});
    expect(wrong.applicability).toBe('not-applicable');expect(wrong.project.status).toBe('not-applicable');expect(wrong.project.discovery).toBeNull();
    const unknown=evaluate({...profile('2000-11-12',''),timeBasis:'apparent-solar',birthLongitude:87.6168},{enabled:true});
    expect(unknown.applicability).toBe('unknown');expect(unknown.project.status).toBe('calendar-unknown');expect(unknown.birth.chart).toBeNull();expect(spy).not.toHaveBeenCalled();
  });
  it('rejects malformed options/profile accessors/proxies without executing getter traps, and accepts legal optional undefined',()=>{
    let calls=0;
    expect(()=>evaluate(Object.defineProperty(profile(),'birthDate',{enumerable:true,get(){calls++;return'2000-11-12'}}))).toThrow('访问器');
    expect(()=>evaluate(profile(),Object.defineProperty({},'enabled',{enumerable:true,get(){calls++;return true}}))).toThrow('访问器');
    expect(()=>evaluate(profile(),new Proxy({enabled:true},{getPrototypeOf(){calls++;throw new Error('trap')}}))).toThrow('代理');expect(calls).toBe(0);
    const result=evaluate({...profile(),birthLongitude:undefined,renMethod:undefined});expect(result.project.status).toBe('disabled');
  });
  it('refuses a mutated approved project parameter object rather than silently changing an experiment',()=>{
    const old=projectParameters.parameters.controlFraction;
    try{projectParameters.parameters.controlFraction=.125;expect(()=>evaluate(profile(),{enabled:true})).toThrow('M625_PROJECT_PARAMETERS_CHANGED');}finally{projectParameters.parameters.controlFraction=old;}
  });
  it('source metadata is private and exact, with no claim that model thresholds are classical proof',()=>{
    const raw=readFileSync(new URL('../data/raw/classics-qiongtong-2294674.wiki',import.meta.url)),points=Array.from(raw.toString('utf8'));
    expect(createHash('sha256').update(raw).digest('hex')).toBe(sourceContext.rawSha256);
    const result=evaluate(profile());expect(points.slice(result.source.quoteSpan.start,result.source.quoteSpan.end).join('')).toBe(result.source.quote);
    const old=sourceContext.rawSha256;
    try{sourceContext.rawSha256='0'.repeat(64);expect(evaluate(profile()).source.rawSha256).toBe(old);}finally{sourceContext.rawSha256=old;}
    expect(result.source.note).toContain('项目参数不是古籍数值');expect(result.project.parameters).toEqual(projectParameters.parameters);
    expect(Object.isFrozen(result.project.parameters)).toBe(true);
  });
});
