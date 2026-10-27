import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('manual element draft in the real App handlers', () => {
  it('preserves, applies, discards and protects current chart selections across asynchronous workflow boundaries', () => {
    execFileSync(process.execPath, [resolve('tests/helpers/favorable-app-harness.mjs')], { cwd: process.cwd(), encoding: 'utf8', timeout: 25000 });
    const result = JSON.parse(readFileSync(resolve('.local/fix-113/favorable-handler-results.json'), 'utf8')) as { cases: { name: string; passed: boolean }[] };
    expect(result.cases).toHaveLength(15);
    expect(result.cases.every(item => item.passed)).toBe(true);
  }, 30000);
});
