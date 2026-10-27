import { beforeEach, afterEach } from 'vitest';
import { Session } from 'node:inspector';
import { writeFileSync } from 'node:fs';
let session: Session | undefined;
function post(method: string, params: Record<string, unknown> = {}): Promise<any> {
  return new Promise((accept, reject) => session!.post(method, params, (error, result) => error ? reject(error) : accept(result)));
}
beforeEach(async () => {
  session = new Session(); session.connect();
  await post('Profiler.enable');
  await post('Profiler.setSamplingInterval', { interval: 1000 });
  await post('Profiler.start');
});
afterEach(async () => {
  if (!session) return;
  try {
    const { profile } = await post('Profiler.stop');
    writeFileSync(process.env.M454_CPU_PROFILE_FILE!, JSON.stringify(profile), { flag: 'wx' });
    await post('Profiler.disable');
  } finally { session.disconnect(); session = undefined; }
});
