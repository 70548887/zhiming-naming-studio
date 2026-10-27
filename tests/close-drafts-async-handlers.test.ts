import {execFileSync} from 'node:child_process';
import {describe,expect,it} from 'vitest';
describe('settings draft and pending image restoration boundaries',()=>{
 it('protects drafts, preserves cancellation and covers a pending Logo read without claiming it is saved',()=>{
  const output=execFileSync(process.execPath,['tests/helpers/close-drafts-app-harness.mjs'],{cwd:process.cwd(),encoding:'utf8',timeout:30000});const result=JSON.parse(output);expect(result.cases).toHaveLength(8);for(const item of result.cases)expect(item.passed,item.name).toBe(true);
 },35000);
});
