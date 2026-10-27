import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {beforeAll,describe,expect,it} from 'vitest';

interface Result {cases:{id:string;passed:boolean;after?:{parentDirty:boolean;saveEnabled:boolean;saveCalls:number}}[];}
let result:Result;
beforeAll(()=>{
 const output=execFileSync(process.execPath,[resolve('tests/helpers/yue-reading-ui-harness.mjs')],{cwd:process.cwd(),encoding:'utf8',timeout:25000});
 result=JSON.parse(output) as Result;
},30000);
describe('Cantonese reading editor user actions',()=>{
 it.each([
  ['case-only-is-clean','does not mark a capitalization-only change unsaved or call the save API'],
  ['whitespace-only-is-clean','does not mark surrounding whitespace unsaved or call the save API'],
  ['dictionary-revert-is-clean','clears dirty state when returning from a manual draft to the saved dictionary choice'],
  ['real-change-saves','saves an actual pronunciation change and clears its close-protection state'],
  ['failed-save-preserves-input','retains actual unsaved input and an error after a rejected save'],
  ['invalid-input-remains-unsaved','keeps invalid input unsaved and avoids sending it to the save API'],
  ['pending-save-locks-controls','disables controls while the parent save is pending and restores the saved state'],
 ])('%s — %s',(id)=>{
  const observed=result.cases.find(item=>item.id===id);expect(observed,id).toBeDefined();expect(observed!.passed).toBe(true);
 });
});
