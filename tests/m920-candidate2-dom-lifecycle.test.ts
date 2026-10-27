import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {describe,it,expect} from 'vitest';

describe('M920 candidate2 real ReactDOM lifecycle',()=>{
 it('replays StrictMode, retries, unmounts/remounts and rejects reverse-order responses in native DOM',()=>{
  const result=JSON.parse(execFileSync(process.execPath,[resolve('tests/helpers/m920-candidate2-dom-harness.mjs')],{cwd:process.cwd(),encoding:'utf8',timeout:45000})) as {passed:boolean;cases:{name:string;passed:boolean}[];errors:string[];unhandled:string[];scope:string};
  expect(result.passed).toBe(true);expect(result.cases).toHaveLength(9);expect(result.cases.every(value=>value.passed)).toBe(true);expect(result.errors).toEqual([]);expect(result.unhandled).toEqual([]);expect(result.scope).toContain('Real development ReactDOM');
 },50000);
});
