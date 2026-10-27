import {describe,expect,it} from 'vitest';
import fixture from './fixtures/bazi-v8-qimen-v4-output-examples.json';
import {analyzeProfileV8} from '../src/domain/engine-v8';
import {expectedBazi} from '../src/main/expected-analysis';
import {validQimenSnapshot} from '../src/main/qimen-snapshot';
import {baziSnapshotStatus} from '../src/main/bazi-snapshot';
import type {BirthProfile} from '../src/shared/types';
describe('complete published1.8 and Qimen1.4 outputs stay frozen before monthly restrictions',()=>{
 it.each(fixture.cases)('preserves all captured fields: $id',item=>{
  const profile=item.profile as BirthProfile,actual=analyzeProfileV8(profile);expect(actual).toEqual(item.analysis);expect(actual.bazi.monthFollowingRestrictions).toBeUndefined();expect(expectedBazi(profile,actual.bazi.version)).toEqual(item.analysis.bazi);expect(baziSnapshotStatus(actual.bazi,profile)).toBe('verified-legacy');expect(validQimenSnapshot(actual.qimen,actual.bazi,profile)).toBe(true);
 });
});
