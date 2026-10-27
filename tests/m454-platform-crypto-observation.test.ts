import { it, expect } from 'vitest';
import { webcrypto } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { Store } from '../src/main/store';

it('records the unmodified platform crypto descriptor after the actual Store dependency graph loads', () => {
  expect(typeof Store).toBe('function');
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  const result = {
    node: process.version,
    actualStoreGraphImported: true,
    ownData: !!descriptor && Object.hasOwn(descriptor, 'value'),
    ownGetter: !!descriptor && Object.hasOwn(descriptor, 'get'),
    getterType: typeof descriptor?.get,
    setterType: typeof descriptor?.set,
    ownValueEqualsImportedWebcrypto: !!descriptor && Object.hasOwn(descriptor, 'value') && descriptor.value === webcrypto,
    getterInvokedByObservation: false,
    SQL: false,
    productFunctionReplacement: false,
    scope: 'Target-realm diagnostic only, not an owned activation or product acceptance test',
  };
  writeFileSync(process.env.M454_PLATFORM_OBSERVATION_FILE!, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
});
