import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('current App report delivery coordination', () => {
  it('keeps confirmation read-only, prevents duplicate submission, and handles cancellation and retry', () => {
    const result = JSON.parse(execFileSync(process.execPath, ['tests/helpers/delivery-app-harness.mjs'], { encoding: 'utf8', timeout: 30000 }));
    expect(result.note).toContain('not a DOM');
    expect(result.results).toHaveLength(4);
    for (const item of result.results) expect(item.passed, item.name).toBe(true);
  }, 35000);
});
