import {describe,it,expect} from 'vitest';
import {analyzeProfile,BAZI_RULE_VERSION,BAZI_REN_RULE_VERSION,QIMEN_RULE_VERSION} from '../src/domain/engine';
import {expectedAnalysis,expectedBazi} from '../src/main/expected-analysis';
import {validBaziSnapshot} from '../src/main/bazi-snapshot';
import {validQimenSnapshot} from '../src/main/qimen-snapshot';
import {compatibleSavedAnalysisVersions,requiresSessionSourceManifest} from '../src/main/saved-analysis-policy';
import {REN_METHOD} from '../src/shared/ren-method';
import {catalogSession} from './fixtures/catalog-session';

describe('optional Ren profile requires an explicit saved-version boundary',()=>{
 const plain={...catalogSession().profile,birthDate:'1914-11-25',birthTime:'13:30:00'};
 const enabled={...plain,renMethod:REN_METHOD};
 it('keeps default Bazi1.9 and emits1.10 only with the selected independent profile',()=>{
  const a=analyzeProfile(plain),b=analyzeProfile(enabled);
  expect(a.bazi.version).toBe(BAZI_RULE_VERSION);expect(a.renCommentary).toBeUndefined();
  expect(b.bazi.version).toBe(BAZI_REN_RULE_VERSION);expect(b.renCommentary).toBeDefined();
  expect({...b.bazi,version:a.bazi.version}).toEqual(a.bazi);expect(b.qimen).toEqual(a.qimen);
  expect(compatibleSavedAnalysisVersions(BAZI_REN_RULE_VERSION,QIMEN_RULE_VERSION)).toBe(true);expect(requiresSessionSourceManifest(BAZI_REN_RULE_VERSION)).toBe(true);
 });
 it('includes method in trusted cache keys and refuses old labels or absent selection',()=>{
  expect(expectedAnalysis(enabled).renCommentary).toBeDefined();expect(expectedAnalysis(plain).renCommentary).toBeUndefined();
  expect(expectedBazi(enabled,BAZI_REN_RULE_VERSION).version).toBe(BAZI_REN_RULE_VERSION);
  expect(()=>expectedBazi(enabled,BAZI_RULE_VERSION)).toThrow('不得使用旧版');expect(()=>expectedBazi(plain,BAZI_REN_RULE_VERSION)).toThrow('必须保留');
  const value=analyzeProfile(enabled);expect(validBaziSnapshot(value.bazi,enabled)).toBe(true);expect(validQimenSnapshot(value.qimen,value.bazi,enabled)).toBe(true);
  expect(validBaziSnapshot(value.bazi,plain)).toBe(false);expect(validQimenSnapshot(value.qimen,value.bazi,plain)).toBe(false);
 });
 it('rejects a method accessor without reading it or polluting expected analysis',()=>{
  let accessed=0;const input={...enabled};Object.defineProperty(input,'renMethod',{get(){accessed++;return REN_METHOD;},enumerable:true});
  expect(()=>expectedAnalysis(input)).toThrow('访问器');expect(accessed).toBe(0);expect(expectedAnalysis(plain).renCommentary).toBeUndefined();
 });
});
