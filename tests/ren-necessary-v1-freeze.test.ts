import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import frozen from './fixtures/ditian-ren-v1-complete-outputs.json';
import {analyzeProfile} from '../src/domain/engine';
import {calculateRenCommentary,validRenCommentaryAnalysis} from '../src/domain/ditian-ren';
import {LEGACY_REN_METHOD} from '../src/shared/ren-method';
import type {BirthProfile} from '../src/shared/types';
describe('published Ren1.0 keeps all output fields and the unchanged fixed source dependency',()=>{
  it.each(frozen.cases)('retains captured complete1.0 output: $id',item=>{
    const profile=item.profile as BirthProfile;expect(profile.renMethod).toBe(LEGACY_REN_METHOD);const actual=analyzeProfile(profile);expect(actual).toEqual(item.analysis);expect(actual.renCommentary!.necessaryConditions).toBeUndefined();expect(calculateRenCommentary(profile,actual.bazi)).toEqual(item.analysis.renCommentary);expect(validRenCommentaryAnalysis(actual.renCommentary,profile,actual.bazi)).toBe(true);
  });
  it('changes only the frozen method import when isolating the full prior calculator',()=>{
    const digest=(text:string)=>createHash('sha256').update(text).digest('hex');
    const frozenModule=readFileSync(resolve('src/domain/ditian-ren-v1.ts'),'utf8');
    expect(digest(frozenModule.replace("from '../shared/ren-method-v1'","from '../shared/ren-method'"))).toBe('911e0a1460b23736c4a9ba5ebf0b5c81d48e60fc11c2fd11046cc5642c7f722e');
    expect(frozenModule).toContain("from '../../data/ditian-ren-table.json'");expect(digest(readFileSync(resolve('src/shared/ren-method-v1.ts'),'utf8'))).toBe('c5188b9e9fb15aa7766a79fe9aec7bed7c4a67ff169767f1c7a1d0869fb651ac');
  });
});
