import {describe,expect,it} from 'vitest';
import {PROJECT_NAMING_METHOD_ID,readNamingElementMethodSelection} from '../src/shared/project-naming-use';
import {assertNamingElementApplicationTuple,NAMING_ELEMENT_APPLICATION_POLICY} from '../src/shared/naming-element-application';

const selection=()=>({methodId:PROJECT_NAMING_METHOD_ID,entryPolicy:'month-branch-only' as const});
describe('explicit project naming intent and registered application combinations',()=>{
 it('leaves a legacy or manual preference untouched when no method was selected',()=>{
  const preferences={preferredElements:['水'],style:'清朗'},before=JSON.stringify(preferences);
  expect(readNamingElementMethodSelection(preferences)).toBeUndefined();
  expect(JSON.stringify(preferences)).toBe(before);
 });
 it('returns an immutable detached selection for each declared entry policy',()=>{
  for(const entryPolicy of ['month-branch-only','month-stem-proposal'] as const){
   const input={namingElementMethod:{...selection(),entryPolicy}},result=readNamingElementMethodSelection(input)!;
   expect(result).toEqual(input.namingElementMethod);expect(Object.isFrozen(result)).toBe(true);
   input.namingElementMethod.entryPolicy=entryPolicy==='month-branch-only'?'month-stem-proposal':'month-branch-only';
   expect(result.entryPolicy).toBe(entryPolicy);
  }
 });
 it('rejects explicit empty, unknown or extra-field methods rather than silently choosing legacy',()=>{
  for(const value of [undefined,null,{},'project',[],{...selection(),methodId:'unknown'},{...selection(),entryPolicy:'unknown'},{...selection(),verified:true}]){
   const preferences={namingElementMethod:value,preferredElements:['水']};
   expect(()=>readNamingElementMethodSelection(preferences)).toThrow();
   expect(Object.hasOwn(preferences,'namingElementMethod')).toBe(true);
  }
 });
 it('never executes method, entry-policy or sibling getters',()=>{
  let invoked=0;const preferences={};Object.defineProperty(preferences,'namingElementMethod',{enumerable:true,get(){invoked++;return selection();}});
  expect(()=>readNamingElementMethodSelection(preferences)).toThrow();
  const selected={methodId:PROJECT_NAMING_METHOD_ID};Object.defineProperty(selected,'entryPolicy',{enumerable:true,get(){invoked++;return 'month-branch-only';}});
  expect(()=>readNamingElementMethodSelection({namingElementMethod:selected})).toThrow();
  const sibling={namingElementMethod:{...selection(),methodId:'unknown'}};Object.defineProperty(sibling,'preferredElements',{enumerable:true,get(){invoked++;return ['水'];}});
  expect(()=>readNamingElementMethodSelection(sibling)).toThrow(/未知项目命名方法/);
  expect(invoked).toBe(0);
 });
 it('rejects inherited, hidden and prototype-pollution intent',()=>{
  expect(()=>readNamingElementMethodSelection(Object.create({namingElementMethod:selection()}))).toThrow();
  const hidden={};Object.defineProperty(hidden,'namingElementMethod',{value:selection()});
  expect(()=>readNamingElementMethodSelection(hidden)).toThrow();
  expect(()=>readNamingElementMethodSelection(JSON.parse('{"__proto__":{}}'))).toThrow();
 });
 it('parses a known project/manual combination without granting resolution or deleting manual input',()=>{
  const preferences={namingElementMethod:selection(),preferredElements:['水']};
  expect(readNamingElementMethodSelection(preferences)).toEqual(selection());
  expect(preferences.preferredElements).toEqual(['水']);
 });
 it('accepts only the exact registered naming/method/application tuple',()=>{
  for(const version of ['naming-editorial-7.0.0','naming-editorial-7.1.0'] as const){
   expect(()=>assertNamingElementApplicationTuple(version,PROJECT_NAMING_METHOD_ID,NAMING_ELEMENT_APPLICATION_POLICY)).not.toThrow();
   expect(()=>assertNamingElementApplicationTuple(version,'project-bazi-mainchain-145/1.3.0',NAMING_ELEMENT_APPLICATION_POLICY)).toThrow();
   expect(()=>assertNamingElementApplicationTuple(version,PROJECT_NAMING_METHOD_ID,'naming-element-application/2.0.0')).toThrow();
  }
  for(const version of [undefined,'naming-editorial-6.0.0','naming-editorial-7.2.0','naming-editorial-8.0.0'])expect(()=>assertNamingElementApplicationTuple(version,PROJECT_NAMING_METHOD_ID,NAMING_ELEMENT_APPLICATION_POLICY)).toThrow();
 });
});
