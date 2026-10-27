import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('current App source settings event handlers (isolated React hook harness; not DOM)', () => {
  it('preserves drafts across delayed saves and image reads, and isolates brand/key submission scopes', () => {
    const output=execFileSync(process.execPath,['tests/helpers/settings-app-harness.mjs'],{encoding:'utf8',timeout:30000});
    const result=JSON.parse(output);
    expect(result.note).toContain('not DOM');
    expect(result.cases).toHaveLength(13);
    for(const item of result.cases) expect(item.passed,item.name).toBe(true);
  },35000);
});
