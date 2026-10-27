import { beforeEach, afterEach } from 'vitest';
import { Session } from 'node:inspector';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Test-only observation in the Vitest fork. No project function is replaced.
// The original performance case is run separately without this setup.
let session: Session | undefined;
function post(method: string, params: Record<string, unknown> = {}): Promise<any> {
  return new Promise((accept, reject) => session!.post(method, params, (error, result) => error ? reject(error) : accept(result)));
}
beforeEach(async () => {
  session = new Session();
  session.connect();
  await post('Profiler.enable');
  await post('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
});
afterEach(async () => {
  if (!session) return;
  try {
    const result = await post('Profiler.takePreciseCoverage');
    writeFileSync(resolve(process.env.M454_ACTIVATION_COVERAGE_FILE!), JSON.stringify(result), { flag: 'wx' });
    await post('Profiler.stopPreciseCoverage');
    await post('Profiler.disable');
  } finally {
    session.disconnect();
    session = undefined;
  }
});
