import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';

describe('M733 actual renderer integration',()=>{
  it('executes summary paging, real detail callbacks, canonical review and migration refresh boundaries',()=>{
    const result=JSON.parse(execFileSync(process.execPath,[resolve('tests/helpers/session-catalog-app-harness.mjs')],{cwd:process.cwd(),encoding:'utf8',timeout:25000}));
    expect(result.passed).toBe(true);expect(result.cases).toHaveLength(10);expect(result.cases.every((row:{passed:boolean})=>row.passed)).toBe(true);expect(result.unhandled).toEqual([]);
  },30000);
});
