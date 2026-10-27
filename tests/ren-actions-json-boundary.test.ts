import {describe,expect,it} from 'vitest';
import published from './fixtures/ren-session-1.0.24.json';
import {analyzeProfile} from '../src/domain/engine';
import {validRenCommentaryAnalysis} from '../src/domain/ditian-ren';
import {REN_ACTION_METHOD} from '../src/shared/ren-method';
import type {BirthProfile,NamingSession,RenCommentaryAnalysis} from '../src/shared/types';

const oldCases=Object.entries(published.sessions).map(([key,session])=>({key,session:session as unknown as NamingSession})).filter(({session})=>!!session.analysis.renCommentary);
describe('strict JSON input guards wrap frozen Ren calculators without changing old JSON results',()=>{
  it.each(oldCases)('keeps published normal same-JSON $key data valid',({session})=>{
    const value=JSON.parse(JSON.stringify(session.analysis.renCommentary));expect(validRenCommentaryAnalysis(value,session.profile,session.analysis.bazi)).toBe(true);expect(value).toEqual(session.analysis.renCommentary);
  });
  it.each(oldCases)('rejects an existing hidden field and Array-subclass prototype in published $key payload',({session})=>{
    const hidden=structuredClone(session.analysis.renCommentary!);Object.defineProperty(hidden,'version',{value:hidden.version,enumerable:false,configurable:true});expect(validRenCommentaryAnalysis(hidden,session.profile,session.analysis.bazi)).toBe(false);
    const subclass=structuredClone(session.analysis.renCommentary!);Object.setPrototypeOf(subclass.sourceRules,class extends Array{}.prototype);expect(validRenCommentaryAnalysis(subclass,session.profile,session.analysis.bazi)).toBe(false);
  });
  it.each(oldCases)('rejects accessors, symbols and sparse arrays before reading getter in $key',({session})=>{
    let reads=0;const getter=structuredClone(session.analysis.renCommentary!);Object.defineProperty(getter,'version',{get(){reads++;return session.analysis.renCommentary!.version;},enumerable:true});expect(validRenCommentaryAnalysis(getter,session.profile,session.analysis.bazi)).toBe(false);expect(reads).toBe(0);
    const sparse=structuredClone(session.analysis.renCommentary!);sparse.sourceRules=new Array(sparse.sourceRules.length);expect(validRenCommentaryAnalysis(sparse,session.profile,session.analysis.bazi)).toBe(false);
    const symbol=structuredClone(session.analysis.renCommentary!)as RenCommentaryAnalysis&{[key:symbol]:unknown};symbol[Symbol('extra')]=1;expect(validRenCommentaryAnalysis(symbol,session.profile,session.analysis.bazi)).toBe(false);
  });
  it('accepts new1.2 exact raw source quotations, but rejects hidden fields and changed raw source text',()=>{
    const profile={...published.sessions.v10.profile,id:'new-json-ren12',renMethod:REN_ACTION_METHOD}as BirthProfile,analysis=analyzeProfile(profile),ren=analysis.renCommentary!;
    expect(validRenCommentaryAnalysis(JSON.parse(JSON.stringify(ren)),profile,analysis.bazi)).toBe(true);expect(ren.actionAnalysis!.sourceReferences.find(source=>source.id==='wood-triad-boundary')!.quote).toContain('瘐论');
    const raw=structuredClone(ren);raw.actionAnalysis!.sourceReferences.find(source=>source.id==='wood-triad-boundary')!.quote=raw.actionAnalysis!.sourceReferences.find(source=>source.id==='wood-triad-boundary')!.quote.replace('瘐论','并论');expect(validRenCommentaryAnalysis(raw,profile,analysis.bazi)).toBe(false);
    const hidden=structuredClone(ren);Object.defineProperty(hidden.actionAnalysis!,'version',{value:'1.0.0',enumerable:false});expect(validRenCommentaryAnalysis(hidden,profile,analysis.bazi)).toBe(false);
    let reads=0;const getter=structuredClone(ren);Object.defineProperty(getter.actionAnalysis!,'checks',{get(){reads++;return ren.actionAnalysis!.checks;},enumerable:true});expect(validRenCommentaryAnalysis(getter,profile,analysis.bazi)).toBe(false);expect(reads).toBe(0);
  });
  it('requires the1.2 method,Bazi1.12 and action source together;no graft to old methods',()=>{
    const profile={...published.sessions.v10.profile,id:'new-json-ren-graft',renMethod:REN_ACTION_METHOD}as BirthProfile,analysis=analyzeProfile(profile),ren=analysis.renCommentary!;
    expect(validRenCommentaryAnalysis(ren,{...profile,renMethod:'ditian-ren-commentary-2600158/1.1.0'},analysis.bazi)).toBe(false);
    expect(validRenCommentaryAnalysis(ren,profile,{...analysis.bazi,version:'civil-midnight-fuyi-candidate/1.11.0;lunar-typescript/1.8.6'})).toBe(false);
    const changed=structuredClone(ren);changed.actionAnalysis!.sourceId='bazi-ditian-ren-2600158' as never;expect(validRenCommentaryAnalysis(changed,profile,analysis.bazi)).toBe(false);
  });
});
