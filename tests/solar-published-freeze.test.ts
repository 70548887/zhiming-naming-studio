import{describe,expect,it}from'vitest';
import frozen from'./fixtures/bazi-v7-qimen-v3-output-examples.json';
import{analyzeProfileV7,BAZI_V7_RULE_VERSION,QIMEN_V3_RULE_VERSION}from'../src/domain/engine-v7';
import type{BirthProfile}from'../src/shared/types';

describe('published1.7/1.3 civil analysis remains completely frozen',()=>{
 it.each(frozen.cases)('retains every published output field: $id',fixture=>{
  expect(BAZI_V7_RULE_VERSION).toBe(frozen.baziVersion);expect(QIMEN_V3_RULE_VERSION).toBe(frozen.qimenVersion);
  expect(analyzeProfileV7(fixture.profile as BirthProfile)).toEqual(fixture.analysis);
 });
});
