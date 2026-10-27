/** Exact actual four-array predicate only; these tiny JSON records have no
 * source/authentication or Store authority. The genuine BLOB SHA test is separate. */
import {beforeAll,describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {assertActualTables,actualMainSHA256,actualComparisonRegionSHA256} from './fixtures/m458-actual-tables';
import inputs from './fixtures/m458-actual-tables-inputs.json';
const digest=(value:Uint8Array|string)=>createHash('sha256').update(value).digest('hex');
const keys=['characters','citations','knowledge','sources'] as const;
function tables(){
  const result={} as Record<(typeof keys)[number],Array<{id:string;detail:{marker:string;flags:boolean[]}}>>;
  for(const key of keys)result[key]=[{id:key+'-first',detail:{marker:'first',flags:[true,false]}},{id:key+'-second',detail:{marker:'second',flags:[false,true]}}];
  return result;
}
beforeAll(()=>{
  const main=readFileSync(new URL('../src/main/candidate-facts.ts',import.meta.url));
  const fixture=readFileSync(new URL('./fixtures/m458-actual-tables.ts',import.meta.url));
  expect(digest(main)).toBe(inputs.mainSHA256);expect(digest(fixture)).toBe(inputs.fixtureSHA256);
  expect(actualMainSHA256).toBe(inputs.mainSHA256);expect(actualComparisonRegionSHA256).toBe(inputs.regionSHA256);
  const text=main.toString('utf8').replace(/\r\n/g,'\n'),scope=text.indexOf('function '+inputs.functionName+'(');
  const start=text.indexOf('if(actual.version!==archive.version||!isDeepStrictEqual([actual.characters,',scope);
  const end=text.indexOf('\n const eligible=',start);
  expect(scope).toBeGreaterThanOrEqual(0);expect(start).toBeGreaterThan(scope);expect(end).toBeGreaterThan(start);
  expect(digest(text.slice(start,end))).toBe(inputs.regionSHA256);
  const fixtureText=fixture.toString('utf8').replace(/\r\n/g,'\n'),fixtureStart=fixtureText.indexOf('if(actual.version!==archive.version||!isDeepStrictEqual([actual.characters,');
  const fixtureEnd=fixtureText.indexOf('\n}\nexport const actualMainSHA256=',fixtureStart);
  expect(digest(fixtureText.slice(fixtureStart,fixtureEnd))).toBe(inputs.regionSHA256);
});
describe('M458 exact operation actual-table comparison',()=>{
  it('accepts complete equal arrays only with the actual archive version',()=>{
    const expected={...tables(),version:'dataset-metadata-version'},archive={version:'actual-pack-version'};
    const actual={...structuredClone(expected),version:archive.version};
    expect(()=>assertActualTables(actual,expected,archive)).not.toThrow();
    expect(()=>assertActualTables({...actual,version:'claimed-other-version'},expected,archive)).toThrow('全字段或原顺序');
  });
  it('rejects every four-array nested field change and every original row-order change',()=>{
    const expected=tables(),archive={version:'actual-pack-version'};
    for(const key of keys){
      const changed={...structuredClone(expected),version:archive.version};
      changed[key][0].detail.marker='changed complete field';
      expect(()=>assertActualTables(changed,expected,archive),key+' field').toThrow('全字段或原顺序');
      const reordered={...structuredClone(expected),version:archive.version};
      reordered[key]=[reordered[key][1],reordered[key][0]];
      expect(()=>assertActualTables(reordered,expected,archive),key+' order').toThrow('全字段或原顺序');
    }
  });
});
