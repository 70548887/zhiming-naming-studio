import {describe,expect,it} from 'vitest';
import captured from './fixtures/ren-default-1.0.21-output-examples.json';
import {analyzeProfile} from '../src/domain/engine';
import type {BirthProfile} from '../src/shared/types';
describe('optional Ren profile does not rewrite previously captured default1.0.21 outputs',()=>{
 it.each(captured.cases)('matches every prior field without enabling Ren: $id',item=>{
  expect(analyzeProfile(item.profile as BirthProfile)).toEqual(item.analysis);
  expect(analyzeProfile({...item.profile,renMethod:'none'} as BirthProfile)).toEqual(item.analysis);
 });
});
