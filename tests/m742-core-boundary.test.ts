import {describe,expect,it} from 'vitest';
import {settleControlBudget} from '../src/domain/bazi-mainchain/kernel-v12-fixed/control-budget';
import {settleRootCarrierFlows} from '../src/domain/bazi-mainchain/project-v132/settled-flows';
import {analyzeChart145,toRootFeedbackPreviewDTO,resolveRootFeedback} from '../src/domain/bazi-mainchain/project-v132';
import type {Carrier140} from '../src/shared/bazi-mainchain-method-types';
import type {RootFeedbackInput} from '../src/domain/bazi-mainchain/project-v132/root-feedback-types';

function carrier(id:string,element:'木'|'火'|'土'|'金'|'水',kind:Carrier140['kind']='exposed'):Carrier140 {
 return{id,position:'year',positionIndex:0,kind,stem:'甲',originalElement:element,element,base:1,seasonFactor:1,branchFactor:1,bindingFactor:1,rootFactor:1,seed:1,capacity:1,incomingControl:0,generationIn:0,generationOut:0,power:0};
}

describe('M708 fixed 1.2 inner-loop negative boundaries',()=>{
 it('returns an unclosed invalid-graph certificate and no substitute budgets',()=>{
  const result=settleControlBudget([{id:'a',capacity:1}],[{id:'edge',source:'a',target:'missing',coefficient:.25}],[]);
  expect(result.status).toBe('unclosed');expect(result.failureReason).toBe('invalid-graph');
  expect(result.remaining).toBeNull();expect(result.remainingBounds).toBeNull();expect(result.totalLossByNode).toBeNull();expect(result.lossByEdge).toEqual([]);
  expect(result.issues.some(issue=>issue.code==='unknown-target')).toBe(true);
 });
 it('keeps delta-zero large-capacity runs unclosed when the complete error bound is not certified',()=>{
  const result=settleControlBudget([{id:'a',capacity:1e300},{id:'b',capacity:1e300}],
   [{id:'a-to-b',source:'a',target:'b',coefficient:.25},{id:'b-to-a',source:'b',target:'a',coefficient:.25}],[]);
  expect(result.status).toBe('unclosed');expect(result.failureReason).toBe('uncertified-roundoff');
  expect(result.lastL1Delta).toBe(0);expect(result.errorBound).toBeGreaterThan(1e-9);
  expect(result.remaining).toBeNull();expect(result.lossByEdge).toEqual([]);
 });
 it('propagates a failed fixed loop to carrier flow consumers without generating flows',()=>{
  const rows=[carrier('a','木'),carrier('b','火')];
  const result=settleRootCarrierFlows(rows,[{source:'a',target:'b',factor:1},{source:'b',target:'a',factor:1}],['missing-edge']);
  expect(result.status).toBe('unclosed');expect(result.controlSettlement.status).toBe('unclosed');
  expect(result.flows).toEqual([]);expect(result.bounds.powers).toEqual({});expect(result.bounds.flows).toEqual({});
  expect(result.issues).toContain('invalid-graph');
 });
 it('downgrades a consumer failure to pending instead of claiming a unique regime',()=>{
  const input:RootFeedbackInput={id:'m708-consumer-failure',scope:'complete-known-pillars',carriers:[carrier('a','木','hidden')],relations:[],pathFactors:[],methodId:'project-bazi-mainchain-144/1.2.0',pending:[]};
  const result=resolveRootFeedback(input,{settle:()=>({status:'closed',carriers:[],bounds:{powers:{},flows:{}},flows:[],issues:[]}),consume:()=>{throw new Error('consumer failure');}});
  expect(result.resolution).toBe('pending-regime-resolution');expect(result.consistentIds).toHaveLength(1);expect(result.regimes[0].mainchainResult).toBeNull();expect(result.pending.join('')).toContain('consumer failure');
 });
});

describe('M708 typed explanation and formation boundaries',()=>{
 const chart={id:'m708-boundary-chart',provenance:'m708-test',pillars:{year:{gan:'甲',zhi:'子'},month:{gan:'己',zhi:'丑'},day:{gan:'甲',zhi:'寅'},hour:{gan:'己',zhi:'卯'}}};
 it('keeps blocked transformation premises visible and never upgrades them to classical formation',()=>{
  const result=analyzeChart145(chart),relations=result.regimes.flatMap(regime=>regime.mainchainResult?.calculationTrace.relations??[]);
  expect(relations.some(relation=>relation.kind==='stem-combination'&&relation.status!=='applied')).toBe(true);
  const dto=toRootFeedbackPreviewDTO(result),formation=dto.explanationChain.steps.find(step=>step.id==='formation-boundary');
  expect(dto.explanationChain.traditionalStatus).toBe('insufficient-source');expect(formation?.traditionalStatus).toBe('unknown');expect(formation?.projectStatus).toBe('not-evaluated');expect(formation?.unknownReason.join('')).toContain('合化');
  expect(dto.regimes.every(regime=>Object.hasOwn(regime.certificate,'failureReason'))).toBe(true);
  expect(dto.regimes.filter(regime=>regime.certificate.status==='closed').every(regime=>regime.certificate.maxIterations===64&&regime.certificate.epsilon===1e-9&&regime.certificate.controlFraction===.25&&regime.certificate.maxLossFraction===.8)).toBe(true);
 });
 it('marks an incomplete chart as unknown instead of producing a complete project opinion',()=>{
  const incomplete=analyzeChart145({...chart,id:'m708-unknown-chart',pillars:{...chart.pillars,hour:null}}),dto=toRootFeedbackPreviewDTO(incomplete);
  expect(dto.scope).toBe('known-pillars-only');expect(dto.explanationChain.projectStatus).toBe('unknown-chart');expect(dto.explanationChain.steps.find(step=>step.id==='chart-facts')?.unknownReason.join('')).toContain('不完整');
 });
});
