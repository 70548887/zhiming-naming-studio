import test from 'node:test';
import assert from 'node:assert/strict';
import {Buffer} from 'node:buffer';
import {createHash, Hash} from 'node:crypto';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createByteDigestMemo} from '../src/main/byte-digest-memo.mjs';

const expected = input => createHash('sha256').update(input).digest('hex');

test('empty, Unicode and equal bytes in distinct Buffers match real SHA-256', () => {
  const memo = createByteDigestMemo();
  for (const text of ['', '知名·周易 🐉 e\u0301', 'plain\0binary']) {
    const first = Buffer.from(text);
    const second = Buffer.from(text);
    assert.equal(memo.digest(first), expected(first));
    assert.equal(memo.digest(second), expected(second));
  }
  assert.equal(memo.statistics().hashes, 3);
  assert.equal(memo.statistics().hits, 3);
});

test('caller mutation after hashing and same-length different contents require new SHA', () => {
  const memo = createByteDigestMemo();
  const input = Buffer.from('public-original');
  const original = Buffer.from(input);
  assert.equal(memo.digest(input), expected(original));
  input[0] ^= 1;
  assert.equal(memo.digest(input), expected(input));
  assert.notEqual(memo.digest(input), expected(original));
  assert.equal(memo.statistics().hashes, 2);
  assert.equal(memo.digest(original), expected(original));
  assert.equal(memo.statistics().hits, 2);
});

test('warm source tamper, restored bytes and truncated views stay content based', () => {
  const memo = createByteDigestMemo();
  const source = Buffer.from('real-public-dictionary');
  const original = Buffer.from(source);
  memo.digest(source);
  memo.digest(Buffer.from(source));
  source[source.length - 1] ^= 1;
  assert.equal(memo.digest(source), expected(source));
  assert.equal(memo.digest(source.subarray(0, source.length - 1)), expected(source.subarray(0, -1)));
  original.copy(source);
  assert.equal(memo.digest(source), expected(original));
  assert.equal(memo.statistics().hashes, 3);
  assert.equal(memo.statistics().hits, 2);
});

test('mutating an alias never mutates a retained owner copy', () => {
  const memo = createByteDigestMemo();
  const owner = Buffer.from('abcdefgh');
  const alias = owner.subarray(2, 6);
  const before = Buffer.from(alias);
  memo.digest(alias);
  owner.fill(0);
  assert.equal(memo.digest(alias), expected(alias));
  assert.equal(memo.digest(before), expected(before));
  assert.equal(memo.statistics().hashes, 2);
  assert.equal(memo.statistics().hits, 1);
  assert.deepEqual(Object.keys(memo).sort(), ['clear', 'digest', 'statistics']);
  assert.equal(Object.values(memo.statistics()).some(Buffer.isBuffer), false);
});

test('overwriting the caller entire small-Buffer pool cannot corrupt private cache bytes', () => {
  // Run destructive whole-pool mutation outside the test runner's own pool.
  // No cached bytes are exposed to the test: only caller-owned storage is used.
  const moduleUrl = new URL('../src/main/byte-digest-memo.mjs', import.meta.url).href;
  const program = `
    import assert from 'node:assert/strict';
    import {Buffer} from 'node:buffer';
    import {createHash} from 'node:crypto';
    import {createByteDigestMemo} from ${JSON.stringify(moduleUrl)};
    const expected = value => createHash('sha256').update(value).digest('hex');
    const publicText = 'public-pooled-original';
    let input, sibling;
    for (let attempt = 0; attempt < 4; attempt++) {
      input = Buffer.from(publicText);
      sibling = Buffer.from('caller pool sibling');
      if (input.buffer === sibling.buffer && input.byteOffset + 4 * input.length + 128 < input.buffer.byteLength) break;
    }
    assert.equal(input.buffer, sibling.buffer);
    assert.ok(input.buffer.byteLength > input.length);
    const length = input.length;
    const originalHex = expected(input);
    const zeroBytes = Buffer.alloc(length);
    const zeroHex = expected(zeroBytes);
    assert.notEqual(originalHex, zeroHex);
    const memo = createByteDigestMemo({maxEntries: 2, maxBytes: length * 2});
    assert.equal(memo.digest(input), originalHex);
    assert.equal(memo.digest(input), originalHex);
    new Uint8Array(input.buffer).fill(0);
    assert.equal(sibling.every(value => value === 0), true);
    assert.equal(memo.digest(zeroBytes), zeroHex);
    assert.equal(memo.digest(input), zeroHex);
    assert.equal(memo.digest(Buffer.from(publicText)), originalHex);
    assert.equal(memo.statistics().hashes, 2);
    assert.equal(memo.statistics().hits, 3);
    assert.equal(memo.statistics().bytes, length * 2);
    process.stdout.write(JSON.stringify({callerBackingBytes: input.buffer.byteLength, callerBytes: length, hashes: memo.statistics().hashes, hits: memo.statistics().hits, retainedBytes: memo.statistics().bytes}));
  `;
  const receipt = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', program], {encoding: 'utf8'}));
  assert.ok(receipt.callerBackingBytes > receipt.callerBytes);
  assert.equal(receipt.hashes, 2);
  assert.equal(receipt.hits, 3);
  assert.equal(receipt.retainedBytes, receipt.callerBytes * 2);
});

test('FS-held alias changed after a JSON.parse callback misses and restored bytes can hit', () => {
  const memo = createByteDigestMemo();
  const original = Buffer.from('{"public":1}');
  const alias = Buffer.from(original);
  const originalHex = expected(original);
  const originalRead = Object.getOwnPropertyDescriptor(fs, 'readFileSync');
  const originalParse = Object.getOwnPropertyDescriptor(JSON, 'parse');
  const sentinel = 'm524-owned-alias-only';
  let readCalls = 0, parseCalls = 0;
  try {
    Object.defineProperty(fs, 'readFileSync', {...originalRead, value(file, ...args) {
      if (file !== sentinel) return Reflect.apply(originalRead.value, this, [file, ...args]);
      readCalls++;
      return alias;
    }});
    Object.defineProperty(JSON, 'parse', {...originalParse, value(...args) {
      const result = Reflect.apply(originalParse.value, this, args);
      parseCalls++;
      alias[10] = 0x32;
      return result;
    }});
    const first = fs.readFileSync(sentinel);
    assert.equal(first, alias);
    assert.equal(memo.digest(first), originalHex);
    assert.equal(memo.digest(fs.readFileSync(sentinel)), originalHex);
    assert.deepEqual(JSON.parse(first.toString('utf8')), {public: 1});
    const changedHex = expected(alias);
    assert.notEqual(changedHex, originalHex);
    assert.equal(memo.digest(fs.readFileSync(sentinel)), changedHex);
    assert.equal(memo.digest(alias), changedHex);
    original.copy(alias);
    assert.equal(memo.digest(fs.readFileSync(sentinel)), originalHex);
  } finally {
    Object.defineProperty(fs, 'readFileSync', originalRead);
    Object.defineProperty(JSON, 'parse', originalParse);
  }
  assert.equal(readCalls, 4);
  assert.equal(parseCalls, 1);
  assert.equal(memo.statistics().hashes, 2);
  assert.equal(memo.statistics().hits, 3);
});

test('shared-backed input is rejected before cache hits or uncached SHA without caller getters', () => {
  const input = Buffer.from(new SharedArrayBuffer(4));
  let accesses = 0;
  Object.defineProperty(input, 'buffer', {get() { accesses++; throw Error('caller buffer getter'); }});
  for (const options of [{}, {maxEntries: 0}, {maxBytes: 1}]) {
    const memo = createByteDigestMemo(options);
    memo.digest(Buffer.alloc(4));
    const before = memo.statistics();
    assert.throws(() => memo.digest(input), {name: 'TypeError', message: /SharedArrayBuffer/});
    assert.deepEqual(memo.statistics(), before);
  }
  assert.equal(accesses, 0);
});

test('resizable-backed input and out-of-bounds resized views are rejected', () => {
  const backing = new ArrayBuffer(4, {maxByteLength: 8});
  assert.equal(backing.resizable, true);
  const input = Buffer.from(backing);
  const memo = createByteDigestMemo();
  assert.throws(() => memo.digest(input), {name: 'TypeError', message: /resizable/});
  backing.resize(0);
  assert.throws(() => memo.digest(input), {name: 'TypeError', message: /resizable/});
  assert.equal(memo.statistics().hashes, 0);
});

test('attached transferable bytes work, detached views never alias an empty cache hit', () => {
  for (const options of [{}, {maxEntries: 0}, {maxBytes: 1}]) {
    const memo = createByteDigestMemo(options);
    memo.digest(Buffer.alloc(0));
    const backing = new ArrayBuffer(4);
    const input = Buffer.from(backing);
    input.set([11, 22, 33, 44]);
    const hex = expected(input);
    assert.equal(memo.digest(input), hex);
    const transferred = structuredClone(backing, {transfer: [backing]});
    assert.equal(input.length, 0);
    const before = memo.statistics();
    assert.throws(() => memo.digest(input), TypeError);
    assert.deepEqual(memo.statistics(), before);
    assert.equal(memo.digest(Buffer.from(transferred)), hex);
    if (options.maxEntries === undefined && options.maxBytes === undefined) {
      assert.equal(memo.statistics().hashes, 2);
      assert.equal(memo.statistics().hits, 1);
    }
  }
});

test('LRU entry and exact byte caps evict only as required', () => {
  const memo = createByteDigestMemo({maxEntries: 2, maxBytes: 6});
  const a = Buffer.from('aaa'), b = Buffer.from('bbb'), c = Buffer.from('ccc');
  memo.digest(a); memo.digest(b); memo.digest(a); memo.digest(c);
  assert.deepEqual(memo.statistics(), {hits: 1, misses: 3, hashes: 3, evictions: 1, uncached: 0, entries: 2, bytes: 6, maxEntries: 2, maxBytes: 6});
  memo.digest(a);
  memo.digest(b);
  assert.equal(memo.statistics().hashes, 4);
  assert.equal(memo.statistics().evictions, 2);
  assert.ok(memo.statistics().bytes <= 6);
  const byteBound = createByteDigestMemo({maxEntries: 9, maxBytes: 5});
  byteBound.digest(a); byteBound.digest(b);
  assert.equal(byteBound.statistics().entries, 1);
  assert.equal(byteBound.statistics().bytes, 3);
});

test('oversize inputs and disabled caching still compute every digest correctly', () => {
  const memo = createByteDigestMemo({maxBytes: 2});
  const input = Buffer.from('over-cap');
  assert.equal(memo.digest(input), expected(input));
  input[0] ^= 1;
  assert.equal(memo.digest(input), expected(input));
  assert.equal(memo.statistics().entries, 0);
  assert.equal(memo.statistics().bytes, 0);
  assert.equal(memo.statistics().hashes, 2);
  assert.equal(memo.statistics().uncached, 2);
  const disabled = createByteDigestMemo({maxEntries: 0});
  disabled.digest(Buffer.alloc(0)); disabled.digest(Buffer.alloc(0));
  assert.equal(disabled.statistics().hashes, 2);
  assert.equal(disabled.statistics().entries, 0);
  const zeroBytes = createByteDigestMemo({maxBytes: 0});
  zeroBytes.digest(Buffer.alloc(0)); zeroBytes.digest(Buffer.alloc(0));
  zeroBytes.digest(Buffer.from('x'));
  assert.equal(zeroBytes.statistics().hits, 1);
  assert.equal(zeroBytes.statistics().bytes, 0);
  assert.equal(zeroBytes.statistics().entries, 1);
});

test('clear releases private entries, resets counters, and never exposes writable stats', () => {
  const memo = createByteDigestMemo();
  const input = Buffer.from('clear');
  memo.digest(input); memo.digest(input);
  const old = memo.statistics();
  assert.ok(Object.isFrozen(old));
  assert.ok(Object.isFrozen(memo));
  assert.throws(() => { old.bytes = 0; }, TypeError);
  memo.clear();
  assert.deepEqual(memo.statistics(), {hits: 0, misses: 0, hashes: 0, evictions: 0, uncached: 0, entries: 0, bytes: 0, maxEntries: 64, maxBytes: 64 * 1024 * 1024});
  assert.equal(old.hits, 1);
  assert.notEqual(old, memo.statistics());
  assert.equal(memo.digest(input), expected(input));
  assert.equal(memo.statistics().hashes, 1);
});

test('rejects Proxy, revoked Proxy, non-Buffer and forged Buffer without invoking traps', () => {
  const memo = createByteDigestMemo();
  let traps = 0;
  const proxied = new Proxy(Buffer.from('x'), {get() { traps++; throw Error('trap'); }, getPrototypeOf() { traps++; throw Error('trap'); }});
  const revoked = Proxy.revocable(Buffer.from('x'), {}); revoked.revoke();
  for (const input of [proxied, revoked.proxy, new Uint8Array([1]), new DataView(new ArrayBuffer(1)), 'x', null, undefined, {}, Object.create(Buffer.prototype)]) {
    assert.throws(() => memo.digest(input), TypeError);
  }
  const proxyPrototype = new Proxy({}, {getPrototypeOf() { traps++; throw Error('prototype trap'); }});
  const buffer = Buffer.from('x'); Object.setPrototypeOf(buffer, proxyPrototype);
  assert.throws(() => memo.digest(buffer), TypeError);
  assert.equal(traps, 0);
  assert.equal(memo.statistics().hashes, 0);
});

test('copy, comparison and hashing never invoke caller getters or iterators', () => {
  const memo = createByteDigestMemo();
  const input = Buffer.from('getter-proof');
  const hex = expected(input);
  let accesses = 0;
  const fail = () => { accesses++; throw Error('caller property accessed'); };
  for (const key of ['length', 'byteLength', 'byteOffset', 'buffer', 'copy', 'equals', 'valueOf', Symbol.iterator, Symbol.toPrimitive]) {
    Object.defineProperty(input, key, {get: fail});
  }
  assert.equal(memo.digest(input), hex);
  assert.equal(memo.digest(input), hex);
  assert.equal(memo.digest(Buffer.from('getter-proof')), hex);
  assert.equal(accesses, 0);
  assert.equal(memo.statistics().hashes, 1);
  const uncached = createByteDigestMemo({maxEntries: 0});
  assert.equal(uncached.digest(input), hex);
  assert.equal(accesses, 0);
});

test('later monkeypatches of Node byte and Hash methods cannot manufacture a hit', () => {
  const memo = createByteDigestMemo();
  const a = Buffer.from('aaaa'), b = Buffer.from('bbbb');
  const expectedA = expected(a), expectedB = expected(b);
  memo.digest(a);
  const typed = Object.getPrototypeOf(Uint8Array.prototype);
  const patches = [[Buffer.prototype, 'equals', () => true], [Buffer.prototype, 'copy', () => 0], [Buffer, 'compare', () => 0], [Buffer, 'from', () => { throw Error('patched from'); }], [Buffer, 'allocUnsafeSlow', () => { throw Error('patched alloc'); }], [typed, 'set', () => {}], [Hash.prototype, 'update', () => { throw Error('patched update'); }], [Hash.prototype, 'digest', () => 'fake']];
  const original = patches.map(([owner, key]) => Object.getOwnPropertyDescriptor(owner, key));
  try {
    patches.forEach(([owner, key, value]) => Object.defineProperty(owner, key, {...Object.getOwnPropertyDescriptor(owner, key), value}));
    assert.equal(memo.digest(b), expectedB);
    assert.equal(memo.digest(a), expectedA);
  } finally {
    patches.forEach(([owner, key], index) => Object.defineProperty(owner, key, original[index]));
  }
  assert.equal(memo.statistics().hashes, 2);
  assert.equal(memo.statistics().hits, 1);
});

test('invalid caps fail instead of disabling memory bounds', () => {
  for (const value of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '64', null]) {
    assert.throws(() => createByteDigestMemo({maxEntries: value}), RangeError);
    assert.throws(() => createByteDigestMemo({maxBytes: value}), RangeError);
  }
});

test('captured one-shot SHA survives CJS replacements and syncBuiltinESMExports without sticky SHA1', () => {
  const moduleUrl = new URL('../src/main/byte-digest-memo.mjs', import.meta.url).href;
  const program = `
    import assert from 'node:assert/strict';
    import crypto, {createHash as liveCreateHash, hash as liveOneShot} from 'node:crypto';
    import {syncBuiltinESMExports} from 'node:module';
    import {Buffer} from 'node:buffer';
    import {createByteDigestMemo} from ${JSON.stringify(moduleUrl)};
    const realCreateHash = crypto.createHash;
    const realOneShot = crypto.hash;
    const input = Buffer.from('M546 real constructor mutation');
    const expected = realCreateHash('sha256').update(input).digest('hex');
    const cached = createByteDigestMemo({maxEntries: 2, maxBytes: 128});
    const disabled = createByteDigestMemo({maxEntries: 0});
    const oversize = createByteDigestMemo({maxBytes: 1});
    let during, uncached, large, control;
    try {
      crypto.createHash = () => realCreateHash('sha1');
      crypto.hash = (_algorithm, data, encoding) => realCreateHash('sha1').update(data).digest(encoding);
      syncBuiltinESMExports();
      assert.equal(liveCreateHash, crypto.createHash);
      assert.equal(liveOneShot, crypto.hash);
      control = liveCreateHash('sha256').update(input).digest('hex');
      assert.equal(control.length, 40);
      assert.equal(liveOneShot('sha256', input, 'hex').length, 40);
      during = cached.digest(input);
      uncached = disabled.digest(input);
      large = oversize.digest(input);
    } finally {
      crypto.createHash = realCreateHash;
      crypto.hash = realOneShot;
      syncBuiltinESMExports();
    }
    const after = cached.digest(Buffer.from(input));
    assert.equal(during, expected);
    assert.equal(uncached, expected);
    assert.equal(large, expected);
    assert.equal(after, expected);
    assert.equal(during.length, 64);
    assert.equal(cached.statistics().hashes, 1);
    assert.equal(cached.statistics().hits, 1);
    process.stdout.write(JSON.stringify({controlLength: control.length, during, after, expected, hashes: cached.statistics().hashes, hits: cached.statistics().hits}));
  `;
  const receipt = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', program], {encoding: 'utf8'}));
  assert.equal(receipt.controlLength, 40);
  assert.equal(receipt.during.length, 64);
  assert.equal(receipt.during, receipt.expected);
  assert.equal(receipt.after, receipt.expected);
  assert.equal(receipt.hashes, 1);
  assert.equal(receipt.hits, 1);
});

test('late Array.prototype numeric setter cannot acquire or mutate private owned cache bytes', () => {
  const moduleUrl = new URL('../src/main/byte-digest-memo.mjs', import.meta.url).href;
  const program = `
    import assert from 'node:assert/strict';
    import {Buffer} from 'node:buffer';
    import {createHash} from 'node:crypto';
    import {createByteDigestMemo} from ${JSON.stringify(moduleUrl)};
    const a = Buffer.from('AAAA'), b = Buffer.from('BBBB');
    const expectedA = createHash('sha256').update(a).digest('hex');
    const expectedB = createHash('sha256').update(b).digest('hex');
    const memo = createByteDigestMemo({maxEntries: 2, maxBytes: 128});
    const old = Object.getOwnPropertyDescriptor(Array.prototype, '0');
    const define = Object.defineProperty;
    let leaked, setterCalls = 0, during;
    try {
      define(Array.prototype, '0', {configurable: true, set(value) {
        setterCalls++;
        if (value && Buffer.isBuffer(value.bytes)) leaked = value.bytes;
        define(this, '0', {value, writable: true, enumerable: true, configurable: true});
      }});
      during = memo.digest(a);
    } finally {
      if (old) define(Array.prototype, '0', old);
      else delete Array.prototype[0];
    }
    if (leaked) leaked.write('BBBB');
    const actualB = memo.digest(b);
    assert.equal(during, expectedA);
    assert.equal(actualB, expectedB);
    assert.equal(leaked, undefined);
    assert.equal(memo.digest(a), expectedA);
    assert.equal(memo.statistics().hashes, 2);
    assert.equal(memo.statistics().hits, 1);
    assert.equal(memo.statistics().bytes, 8);
    process.stdout.write(JSON.stringify({leaked: leaked !== undefined, setterCalls, actualB, expectedB, hashes: memo.statistics().hashes, hits: memo.statistics().hits}));
  `;
  const receipt = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', program], {encoding: 'utf8'}));
  assert.equal(receipt.leaked, false);
  assert.equal(receipt.actualB, receipt.expectedB);
  assert.equal(receipt.hashes, 2);
  assert.equal(receipt.hits, 1);
});

test('one-shot SHA bypasses a later ordinary Hash handle prototype digest replacement', () => {
  const moduleUrl = new URL('../src/main/byte-digest-memo.mjs', import.meta.url).href;
  const program = `
    import assert from 'node:assert/strict';
    import {Buffer} from 'node:buffer';
    import {createHash} from 'node:crypto';
    import {createByteDigestMemo} from ${JSON.stringify(moduleUrl)};
    const input = Buffer.from('M546 actual handle delegation');
    const expected = createHash('sha256').update(input).digest('hex');
    const control = createHash('sha256').update(input);
    const handleKey = Object.getOwnPropertySymbols(control).find(key => {
      const value = control[key];
      if (!value || typeof value !== 'object') return false;
      const prototype = Object.getPrototypeOf(value);
      return typeof Object.getOwnPropertyDescriptor(prototype, 'digest')?.value === 'function'
        && typeof Object.getOwnPropertyDescriptor(prototype, 'update')?.value === 'function';
    });
    assert.notEqual(handleKey, undefined);
    const handlePrototype = Object.getPrototypeOf(control[handleKey]);
    const old = Object.getOwnPropertyDescriptor(handlePrototype, 'digest');
    const cached = createByteDigestMemo({maxEntries: 2, maxBytes: 128});
    const disabled = createByteDigestMemo({maxEntries: 0});
    const oversize = createByteDigestMemo({maxBytes: 1});
    const zeros = '0'.repeat(64);
    let during, uncached, large, poisonedControl;
    try {
      Object.defineProperty(handlePrototype, 'digest', {...old, value() { return zeros; }});
      poisonedControl = control.digest('hex');
      assert.equal(poisonedControl, zeros);
      during = cached.digest(input);
      uncached = disabled.digest(input);
      large = oversize.digest(input);
    } finally {
      Object.defineProperty(handlePrototype, 'digest', old);
    }
    const after = cached.digest(Buffer.from(input));
    assert.notEqual(expected, zeros);
    assert.equal(during, expected);
    assert.equal(uncached, expected);
    assert.equal(large, expected);
    assert.equal(after, expected);
    assert.equal(cached.statistics().hashes, 1);
    assert.equal(cached.statistics().hits, 1);
    process.stdout.write(JSON.stringify({poisonedControl, during, after, expected, hashes: cached.statistics().hashes, hits: cached.statistics().hits}));
  `;
  const receipt = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', program], {encoding: 'utf8'}));
  assert.equal(receipt.poisonedControl, '0'.repeat(64));
  assert.equal(receipt.during, receipt.expected);
  assert.equal(receipt.after, receipt.expected);
  assert.equal(receipt.hashes, 1);
  assert.equal(receipt.hits, 1);
});
