import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
describe('naming capability and terminology renderer handlers',()=>{
 it('tracks configuration/credential versions and keeps late checks expired without customer writes',()=>{
  execFileSync(process.execPath,[resolve('tests/helpers/ai-capability-ui-harness.mjs')],{cwd:process.cwd(),encoding:'utf8',timeout:25000});
  const result=JSON.parse(readFileSync(resolve('.local/seasonal-115/ai-ui-handler-results.json'),'utf8')) as {cases:{name:string;passed:boolean}[]};expect(result.cases).toHaveLength(9);expect(result.cases.every(item=>item.passed)).toBe(true);
 },30000);
});
