import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import goldens from './fixtures/ren-action-bridge-source-goldens.json';

// These expectations come from the fixed author's text, never a product evaluator.
const originalBytes=readFileSync(goldens.source.file);
const original=[...originalBytes.toString('utf8')];
const sha=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
const find=(id:string)=>goldens.cases.find(value=>value.id===id)!;
type Span={quote:string;start:number;end:number;unit:string;interval:string;sha256:string;locator:string};
function checkSpan(span:Span){
  expect(Number.isSafeInteger(span.start)).toBe(true);
  expect(span.start).toBeGreaterThanOrEqual(0);
  expect(span.end).toBeGreaterThan(span.start);
  expect(span.unit).toBe('unicode-codepoint');
  expect(span.interval).toBe('[start,end)');
  expect(span.locator).toBe(`oldid=2600158;codepoint[${span.start},${span.end})`);
  expect([...span.quote]).toHaveLength(span.end-span.start);
  expect(original.slice(span.start,span.end).join('')).toBe(span.quote);
  expect(sha(span.quote)).toBe(span.sha256);
}

describe('independent Ren action/bridge author goldens against the bundled full original',()=>{
  it('keeps the exact fixed original, share-alike attribution and research-only scope',()=>{
    expect(goldens.version).toBe('ren-action-bridge-source-goldens/1.0.0');
    expect(goldens.source.revision).toBe(2600158);
    expect(original).toHaveLength(143701);
    expect(sha(originalBytes)).toBe('1d1a3d61c1b9a26618b41b8ead857a6b966992fdf2adabdc607a0c6cb4c8f04d');
    expect(sha(originalBytes)).toBe(goldens.source.fullWikitextSha256);
    expect(goldens.source.license).toBe('CC-BY-SA-4.0');
    expect(goldens.source.attribution).toContain('贡献者');
    expect(goldens.source.contributors).toContain('action=history');
    expect(readFileSync(goldens.source.licenseText,'utf8')).toContain('Attribution-ShareAlike 4.0 International');
    expect(goldens.purpose).toContain('不作为新盘自动有效作用规则');
    expect(goldens.policy.applicationRules).toBe(false);
    expect(goldens.policy.sufficientGeneralization).toBe(false);
  });

  it.each(goldens.contexts)('$id retains a full selected Ren commentary paragraph at its actual original interval',value=>{
    checkSpan(value.anchor);
    expect(value.anchor.quote.startsWith('{{annotate|任氏曰：')).toBe(true);
    expect(value.anchor.quote.endsWith('}}')).toBe(true);
    expect(value.anchor.quote.slice(0,-2)).not.toContain('}}');
  });

  it.each(goldens.cases)('$id independently anchors all four original pillars, the complete paragraph and each author assertion',value=>{
    expect(value.pillars).toHaveLength(4);
    expect(value.chart.quote.replace(/\s/g,'')).toBe(value.pillars.join(''));
    expect(value.chart.end).toBeLessThan(value.context.start);
    expect(value.context.start-value.chart.end).toBeLessThan(100);
    expect(value.authority).toBe('ren-author-case-commentary');
    expect(value.authorAssertions.length).toBeGreaterThan(1);
    for(const span of [value.chart,value.context,...value.authorAssertions])checkSpan(span);
    for(const span of value.authorAssertions){
      expect(span.start).toBeGreaterThanOrEqual(value.context.start);
      expect(span.end).toBeLessThanOrEqual(value.context.end);
    }
    expect(value.manualExpected.authority).toBe('manually-entered-source-reading-not-application-generated');
    expect(value.manualExpected.sourceScope.length).toBeGreaterThan(0);
    expect(value.manualExpected.blocks.length).toBeGreaterThan(0);
    expect(value.manualExpected.doesNotProve.length).toBeGreaterThan(0);
    expect(value.interpretation.authority).toBe('project-research-inference-not-author-algorithm');
    expect(value).not.toHaveProperty('gregorianDate');
    expect(value).not.toHaveProperty('birthDate');
    expect(value).not.toHaveProperty('effectiveAction');
  });

  it.each(goldens.conditionalContracts)('$id separates literal members, qualitative source premises and a precisely scoped consequence',value=>{
    checkSpan(value.sourceQuote);
    const parent=goldens.contexts.find(context=>context.anchor.start<=value.sourceQuote.start&&context.anchor.end>=value.sourceQuote.end);
    expect(parent).toBeDefined();
    expect(value.literalFacts.length).toBeGreaterThan(0);
    expect(value.requiredSourceQualifications.length).toBeGreaterThan(0);
    expect(value.notAdoptedOperationalDefinitions.length).toBeGreaterThan(1);
    expect(value.currentDependenciesCannotAssign.length).toBeGreaterThan(1);
    expect(value.readyForNewChartEvaluation).toBe(false);
    expect(value.independentCaseIds.length).toBeGreaterThan(1);
    for(const id of value.independentCaseIds)expect(find(id)).toBeDefined();
    expect(value).not.toHaveProperty('ruleWeight');
    expect(value).not.toHaveProperty('strengthThreshold');
  });

  it('has a genuine four-clash author positive rather than treating any clash as net root damage',()=>{
    const value=find('bridge-four-clashes-four-assists');
    expect(value.pillars).toEqual(['癸酉','甲子','丁卯','丙午']);
    expect([value.pillars[0][1],value.pillars[2][1]]).toEqual(['酉','卯']);
    expect([value.pillars[1][1],value.pillars[3][1]]).toEqual(['子','午']);
    expect(value.context.quote).toContain('四冲反为四助');
    expect(value.context.quote).toContain('无阻节之物');
    expect(value.manualExpected.blocks).toContain('any-clash-is-net-root-damage');
  });

  it('preserves both a distant positive and an adjacent negative for effective bridge reachability',()=>{
    const distant=find('bridge-distant-becomes-close'),adjacent=find('bridge-adjacent-officer-resource-still-not-connected');
    expect(distant.pillars).toEqual(['戊寅','癸亥','丁未','辛亥']);
    expect(distant.context.quote).toContain('寅本遥隔，反为亲近');
    expect(adjacent.pillars).toEqual(['己巳','丁卯','辛卯','乙未']);
    expect(adjacent.pillars.map(p=>p[0]).slice(0,3)).toEqual(['己','丁','辛']);
    expect(adjacent.context.quote).toContain('年印，月杀，未得相通');
    expect(adjacent.context.quote).toContain('无辅主之意');
    expect(adjacent.manualExpected.blocks).toContain('adjacent-exposed-officer-resource-proves-bridge');
  });

  it('retains the actual damaged exposed and branch resource targets instead of a generic missing-resource flag',()=>{
    const value=find('bridge-wealth-breaks-both-resource-carriers');
    expect(value.pillars).toEqual(['戊辰','乙卯','辛丑','丁酉']);
    expect(value.context.quote).toContain('不但戊土不能生化，即日支之丑土，亦被卯木所坏');
    expect(value.manualExpected.blocks).toContain('any-hidden-earth-root-proves-effective-resource');
    expect(value.manualExpected.doesNotProve).toContain('原局不能通即任何岁运不能通');
  });

  it('distinguishes full wood-group author cases from a literally missing member, with no strength numeric shortcut',()=>{
    const full=find('wood-group-exposed-metal-weak'),missing=find('wood-without-full-group-boundary'),earth=find('wood-group-metal-officer-no-landing');
    expect(new Set(full.pillars.map(p=>p[1]))).toEqual(new Set(['亥','卯','未']));
    expect(missing.pillars.map(p=>p[1])).not.toContain('亥');
    expect(missing.context.quote).toContain('虽无全会');
    expect(missing.manualExpected.blocks).toContain('life-outcome-proves-effective-action');
    expect(earth.pillars).toEqual(['庚寅','己卯','乙亥','癸未']);
    expect(earth.context.quote).toContain('用官则官临绝地');
    expect(earth.pillars.map(p=>p[0])).toContain('己');
    expect(earth.manualExpected.blocks).toContain('any-visible-earth-proves-metal-control-capability');
  });

  it('does not turn alternative rescue paths into an all-required conjunction or a closed-world no-rescue verdict',()=>{
    const contract=goldens.conditionalContracts.find(value=>value.id==='same-obstruction-alternative-rescue')!;
    expect(contract.sourceQuote.quote).toContain('或官星化之，或比劫解之');
    expect(contract.targetScope).toContain('替代');
    expect(contract.notAdoptedOperationalDefinitions.join('')).toContain('不反推穷尽无救');
    expect(contract.currentDependenciesCannotAssign).toContain('rescue-effective-reachable');
  });

  it('retains the incomplete fixed electronic wording as an explicit qualification rather than silently supplying a rule',()=>{
    const contract=goldens.conditionalContracts.find(value=>value.id==='officer-resource-explicit-bridge')!;
    expect(contract.sourceQuote.quote).toContain('煞藏印亦，此显然通达');
    expect(contract.sourceQuote.quote).not.toContain('煞藏印亦藏');
    expect(contract.requiredSourceQualifications.join('')).toContain('末语未校定');
    expect(contract.readyForNewChartEvaluation).toBe(false);
  });
});
