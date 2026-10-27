import{describe,expect,it}from'vitest';
import fixture from'./fixtures/cong-wealth-predicate-examples.json';
import source from'../data/cong-wealth-rules.json';
import{evaluateFollowingPatternPredicate,type FollowingPatternFacts}from'../src/domain/following-patterns';
import type{FollowingPatternPredicate}from'../src/shared/types';
const predicates=new Map(source.rules.flatMap(rule=>rule.criteria.filter(criterion=>'predicate'in criterion).map(criterion=>[criterion.id,(criterion as any).predicate as FollowingPatternPredicate]as const)));
describe('independently transcribed 从财 literal predicate scope matrix',()=>{
 it('covers each of the six executable predicates with3positive,3negative and3incomplete-edge inputs',()=>{
  expect(predicates.size).toBe(6);expect(fixture.cases).toHaveLength(54);expect(fixture.method).toContain('no application imports');
  for(const[id]of predicates)for(const category of['positive','negative','incomplete-edge'])expect(fixture.cases.filter(example=>example.criterionId===id&&example.category===category),id+'/'+category).toHaveLength(3);
 });
 it.each(fixture.cases)('$id → $expected',example=>{
  const predicate=predicates.get(example.criterionId);expect(predicate).toBeDefined();
  const checked=evaluateFollowingPatternPredicate(predicate!,example.facts as FollowingPatternFacts);
  expect(checked.result).toBe(example.expected);expect(checked.observedEvidence.length).toBeGreaterThan(0);
  if(example.expected==='unknown')expect(checked.missing.join('')).toContain('不完整');
 });
});
