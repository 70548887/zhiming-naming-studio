import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';

describe('historical popularity renderer handlers and async lifecycle',()=>{
 it('executes real browser-targeted component handlers against isolated hooks and fixed catalog fixtures',()=>{
  execFileSync(process.execPath,[resolve('tests/helpers/official-name-popularity-harness.mjs')],{cwd:process.cwd(),encoding:'utf8',timeout:20000});
  const result=JSON.parse(readFileSync(resolve('.local/m916-tests/official-popularity-handler-results.json'),'utf8')) as {cases:Array<{name:string;passed:boolean}>;unhandled:string[];scope:string;browserBundle:{platform:string;referenceModuleBundled:boolean;nodeBuiltinImports:string[]}};
  expect(result.cases).toHaveLength(17);expect(result.cases.every(item=>item.passed)).toBe(true);expect(result.unhandled).toEqual([]);expect(result.scope).toContain('native DOM and real transport acceptance remain separate');
  expect(result.browserBundle).toEqual({platform:'browser',referenceModuleBundled:true,nodeBuiltinImports:[]});
 },25000);
});
