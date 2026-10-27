import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {describe,it,expect} from 'vitest';
describe('actual App family confirmation callback integration',()=>{it('passes all12 controlled-deferred App scenarios',()=>{const r=spawnSync(process.execPath,[resolve('tests/helpers/parent-family-app-harness.mjs')],{cwd:process.cwd(),encoding:'utf8',windowsHide:true,maxBuffer:4*1024*1024});expect(r.status,r.stderr+r.stdout).toBe(0);const report=JSON.parse(r.stdout.trim().split(/\r?\n/).filter(Boolean).at(-1)!);expect(report.status).toBe('passed');expect(report.cases).toHaveLength(12);expect(report.cases.every((c:{passed:boolean})=>c.passed)).toBe(true);},20000);});
