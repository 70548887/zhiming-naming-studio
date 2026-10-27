import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
describe('knowledge preflight and guide component handlers',()=>{
 it('keeps previews read-only, cancels explicitly, retries failures and stores only the guide device flag',()=>{
  execFileSync(process.execPath,[resolve('tests/helpers/maintenance-ui-harness.mjs')],{cwd:process.cwd(),encoding:'utf8',timeout:25000});
  const result=JSON.parse(readFileSync(resolve('.local/expand-114/maintenance-handler-results.json'),'utf8')) as {cases:{name:string;passed:boolean}[]};
  expect(result.cases).toHaveLength(10);expect(result.cases.every(item=>item.passed)).toBe(true);
 },30000);
});
