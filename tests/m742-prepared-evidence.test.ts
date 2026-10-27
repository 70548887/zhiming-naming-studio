import {mkdirSync,renameSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {analyzeChart145,compareRootFeedbackIntervention145,prepareRootInput145,resolveRootFeedback,toRootFeedbackPreviewDTO} from '../src/domain/bazi-mainchain/project-v132';
import * as consumers from '../src/domain/bazi-mainchain/project-v132/consumers';
import {settleRootCarrierFlows} from '../src/domain/bazi-mainchain/project-v132/settled-flows';
import type {ChartCase140} from '../src/shared/bazi-mainchain-method-types';

const chart:ChartCase140={id:'m739-exact',provenance:'artificial-four-pillars-not-a-calendar-claim',pillars:{year:{gan:'癸',zhi:'卯'},month:{gan:'乙',zhi:'丑'},day:{gan:'庚',zhi:'午'},hour:{gan:'丙',zhi:'子'}}};
const relationStep=(dto:ReturnType<typeof toRootFeedbackPreviewDTO>)=>dto.explanationChain.steps.find(step=>step.id==='relations-and-transformations')!;
function evidence(name:string,value:unknown){
 const directory=process.env.M739_EVIDENCE_DIR;if(!directory)return;
 mkdirSync(directory,{recursive:true});const file=join(directory,name+'.json'),temporary=file+'.tmp';
 writeFileSync(temporary,JSON.stringify(value,null,2)+'\n');renameSync(temporary,file);
}
afterEach(()=>vi.restoreAllMocks());

describe('M739 prepare evidence survives failed settlement and consumers',()=>{
 it('retains the exact clash, observed liuhe and binding-only stem relation when every kernel fails',()=>{
  const prepared=prepareRootInput145(chart),result=analyzeChart145(chart,{},['missing-edge']),dto=toRootFeedbackPreviewDTO(result),step=relationStep(dto);
  expect(prepared.input.relations.map(row=>[row.id,row.status])).toEqual([
   ['clash:day:hour','applied'],['liuhe:month:hour','observed'],['stem-combination:month:day','binding-only'],
  ]);
  expect(result.resolution).toBe('pending-regime-resolution');expect(result.possibleIds).toHaveLength(16);expect(result.consistentIds).toEqual([]);
  expect(result.regimes.every(row=>row.settlement?.controlSettlement.status==='unclosed'&&row.settlement.controlSettlement.failureReason==='invalid-graph'&&row.mainchainResult===null)).toBe(true);
  expect(step.projectStatus).toBe('pending');expect(step.ruleIds).toEqual(expect.arrayContaining(['clash','binding','stem-transform']));
  expect(step.sourceIds).toEqual(expect.arrayContaining(['lunar-typescript-1.8.6-facts','ditian-ren-2600158-principles','project-bazi-mainchain-145']));
  expect(step.sourceIds).not.toContain('qiongtong-2294674-initial-reference');
  expect(result.preparation.relations).toEqual(prepared.input.relations);expect(result.preparation.trace).toEqual(prepared.trace);
  expect(dto.preparation).toEqual(result.preparation);expect(step.assumptions).toEqual(prepared.input.relations.map(row=>`${row.id}:${row.status}`));
  expect(step.unknownReason.join('')).toContain('未闭合');expect(dto.regimes.every(row=>row.opinion===null)).toBe(true);
  expect(dto.commonOpinion.favorable).toEqual([]);expect(dto.explanationChain.steps.find(row=>row.id==='fixed-inner-loop')?.projectStatus).toBe('unknown');
  evidence('exact-failed-kernels',{resolution:result.resolution,possible:result.possibleIds.length,consistent:result.consistentIds.length,preparation:dto.preparation,relationsStep:step,certificates:dto.regimes.map(row=>row.certificate),traditionalStatus:dto.explanationChain.traditionalStatus});
 });
 it('preserves the same preparation on success without promoting observed or binding-only to applied',()=>{
  const result=analyzeChart145(chart),dto=toRootFeedbackPreviewDTO(result),failed=analyzeChart145(chart,{},['missing-edge']);
  expect(result.regimes.every(row=>row.settlement?.status==='closed')).toBe(true);expect(result.regimes.some(row=>row.mainchainResult!==null)).toBe(true);
  expect(dto.preparation).toEqual(failed.preparation);expect(relationStep(dto).projectStatus).toBe('observed');
  expect(dto.preparation.relations.map(row=>row.status)).toEqual(['applied','observed','binding-only']);
  expect(dto.explanationChain.traditionalStatus).toBe('insufficient-source');
  const formation=dto.explanationChain.steps.find(row=>row.id==='formation-boundary')!;
  expect(formation.traditionalStatus).toBe('unknown');expect(formation.projectStatus).toBe('not-evaluated');
  expect(dto.explanationChain.residualGaps.join('')).not.toMatch(/M709|姓名落宫|文化比较/);
  evidence('success-boundary',{resolution:result.resolution,preparation:dto.preparation,relationsStep:relationStep(dto),formation});
 });
 it('retains known-three-pillar evidence and pending scope without inventing hour relations',()=>{
  const input:ChartCase140={...chart,id:'m739-missing-hour',pillars:{...chart.pillars,hour:null}},result=analyzeChart145(input),dto=toRootFeedbackPreviewDTO(result);
  expect(result.possibleIds).toHaveLength(8);expect(result.consistentIds).toEqual([]);
  expect(result.regimes.every(row=>row.rootIntervals.every(root=>root.value==='unknown'))).toBe(true);
  expect(dto.preparation.scope).toBe('known-pillars-only');expect(dto.preparation.relations.map(row=>[row.id,row.status])).toEqual([['stem-combination:month:day','binding-only']]);
  expect(dto.explanationChain.projectStatus).toBe('unknown-chart');expect(relationStep(dto).projectStatus).toBe('partial-known-only');
  expect(dto.preparation.pending.join('')).toContain('缺时');
  evidence('missing-hour-boundary',{preparation:dto.preparation,explanation:dto.explanationChain});
 });
 it.each([{disabledEdges:[] as string[]},{disabledEdges:['missing-edge']}])('keeps blocked transformation prerequisites and traditional cong/hua unknown with $disabledEdges',({disabledEdges})=>{
  const blocked:ChartCase140={id:'m739-blocked',provenance:'artificial',pillars:{year:{gan:'甲',zhi:'子'},month:{gan:'己',zhi:'丑'},day:{gan:'甲',zhi:'寅'},hour:{gan:'己',zhi:'卯'}}};
  const result=analyzeChart145(blocked,{},disabledEdges),dto=toRootFeedbackPreviewDTO(result);
  const relations=dto.preparation.relations.filter(row=>row.kind==='stem-combination');
  expect(relations.some(row=>row.status==='blocked')).toBe(true);expect(relations.every(row=>row.premises.some(premise=>!premise.met))).toBe(true);
  expect(relationStep(dto).projectStatus).toBe(disabledEdges.length?'pending':'observed');expect(dto.explanationChain.traditionalStatus).toBe('insufficient-source');
  expect(dto.explanationChain.steps.find(row=>row.id==='formation-boundary')).toMatchObject({traditionalStatus:'unknown',projectStatus:'not-evaluated'});
 });
 it('keeps preparation when the consumer throws after successful kernels',()=>{
  vi.spyOn(consumers,'consumeRootRegime145').mockImplementation(()=>{throw new Error('m739-consumer-failed');});
  const prepared=prepareRootInput145(chart),result=analyzeChart145(chart),dto=toRootFeedbackPreviewDTO(result);
  expect(result.pending.join('')).toContain('m739-consumer-failed');expect(result.regimes.every(row=>row.mainchainResult===null)).toBe(true);
  expect(result.preparation.relations).toEqual(prepared.input.relations);expect(result.preparation.trace).toEqual(prepared.trace);
  expect(relationStep(dto).projectStatus).toBe('pending');expect(relationStep(dto).sourceIds.length).toBeGreaterThan(0);
 });
 it('carries preparation through direct resolver and intervention paths independently of consumer output',()=>{
  const prepared=prepareRootInput145(chart),result=resolveRootFeedback(prepared.input,{settle:settleRootCarrierFlows},{disabledControlEdgeIds:['missing-edge']});
  expect(result.preparation.trace).toEqual(prepared.trace);expect(result.preparation.relations).toEqual(prepared.input.relations);
  const comparison=compareRootFeedbackIntervention145(chart,['missing-edge']);
  expect(comparison.full.preparation).toEqual(result.preparation);expect(comparison.without.preparation).toEqual(result.preparation);
 });
 it('marks a missing preparation trace pending without guessing source references',()=>{
  const prepared=prepareRootInput145(chart),{preparationTrace:_trace,...input}=prepared.input;
  const result=resolveRootFeedback(input,{settle:settleRootCarrierFlows},{disabledControlEdgeIds:['missing-edge']});
  expect(result.preparation.relations).toEqual(prepared.input.relations);expect(result.preparation.ruleIds).toEqual(expect.arrayContaining(['binding','clash','stem-transform']));
  expect(result.preparation.sourceIds).toEqual([]);expect(result.preparation.pending.join('')).toContain('trace 未提供');
 });
 it('takes a detached immutable snapshot before callbacks and projects it without aliasing consumer details',()=>{
  const prepared=prepareRootInput145(chart),original=structuredClone(prepared),result=resolveRootFeedback(prepared.input,{
   settle:(rows,paths,disabled)=>{prepared.input.relations[0].premises[0].detail='mutated-input';prepared.input.preparationTrace![0].sourceIds.push('invented-input-source');prepared.trace[0].sourceIds.push('invented-source');return settleRootCarrierFlows(rows,paths,disabled);},
  },{disabledControlEdgeIds:['missing-edge']});
  expect(result.preparation.relations).toEqual(original.input.relations);expect(result.preparation.trace).toEqual(original.trace);
  expect(Object.isFrozen(result.preparation)).toBe(true);expect(Object.isFrozen(result.preparation.relations[0].premises[0])).toBe(true);expect(Object.isFrozen(result.preparation.trace[0].sourceIds)).toBe(true);
  const clean=analyzeChart145(chart),dto=toRootFeedbackPreviewDTO(clean),expected=structuredClone(clean.preparation);
  expect(dto.preparation).not.toBe(clean.preparation);expect(Reflect.set(dto.preparation.relations[0] as object,'status','blocked')).toBe(false);
  const consumer=clean.regimes.find(row=>row.mainchainResult!==null)!.mainchainResult!;consumer.calculationTrace.relations[0].premises[0].detail='mutated-consumer';
  expect(clean.preparation).toEqual(expected);expect(toRootFeedbackPreviewDTO(clean).preparation).toEqual(expected);
 });
});
