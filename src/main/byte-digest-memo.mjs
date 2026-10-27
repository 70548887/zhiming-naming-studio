import {Buffer} from 'node:buffer';
import {hash as cryptoHash} from 'node:crypto';
import {types} from 'node:util';

/**
 * Pure SHA-256 memoization, never an authorization/source-validation receipt.
 * Callers must still freshly read every complete file and run every existing
 * source/length/digest/qualification check. Statistics confer no authority.
 *
 * Runtime boundary: standard trusted Node intrinsics must exist at module load.
 * A captured crypto.hash one-shot function avoids the public Hash instance
 * handle/update/digest delegation chain. Later export replacement plus ESM
 * synchronization cannot replace that local function. Byte operations are
 * captured too, and cache indexing has no prototype.
 * SharedArrayBuffer-backed, resizable-backed and detached inputs are rejected
 * before comparison/hashing. An attached ordinary transferable ArrayBuffer is
 * supported; transferring it between calls makes the old input invalid.
 * This is not protection against an arbitrarily compromised Node runtime or
 * native addons. No caller callback runs between comparison/copy and hashing.
 * Retained byte storage is bounded; hashing an oversize input makes no copy.
 */
const apply = Reflect.apply;
const getPrototypeOf = Object.getPrototypeOf;
const freeze = Object.freeze;
const create = Object.create;
const isSafeInteger = Number.isSafeInteger;
const isProxy = types.isProxy;
const isUint8Array = types.isUint8Array;
const isSharedArrayBuffer = types.isSharedArrayBuffer;
const bufferPrototype = Buffer.prototype;
// allocUnsafeSlow never draws small buffers from Node's shared allocation pool.
// The cache must not share backing storage with any caller-owned pooled Buffer.
const allocate = Buffer.allocUnsafeSlow;
const compare = Buffer.compare;
const typedArrayPrototype = getPrototypeOf(Uint8Array.prototype);
const lengthGetter = Object.getOwnPropertyDescriptor(typedArrayPrototype, 'length').get;
const bufferGetter = Object.getOwnPropertyDescriptor(typedArrayPrototype, 'buffer').get;
const backingLengthGetter = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength').get;
const resizableGetter = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'resizable')?.get;
const setBytes = typedArrayPrototype.set;
const empty = allocate(0);
// Named ESM imports are live bindings. Capture the one-shot function itself,
// whose trusted Node implementation delegates directly to oneShotDigest;
// captured Hash.prototype.digest alone still performs a mutable handle lookup.
const hashPrimitive = cryptoHash;

function inputLength(input) {
  if (isProxy(input) || !isUint8Array(input)) throw new TypeError('digest requires a non-Proxy Buffer');
  // No caller property access, Symbol.hasInstance, getters or iteration.
  let prototype = getPrototypeOf(input);
  while (prototype !== bufferPrototype) {
    if (prototype === null || isProxy(prototype)) throw new TypeError('digest requires a non-Proxy Buffer');
    prototype = getPrototypeOf(prototype);
  }
  const backing = apply(bufferGetter, input, []);
  if (isSharedArrayBuffer(backing)) throw new TypeError('digest rejects SharedArrayBuffer-backed input');
  if (resizableGetter && apply(resizableGetter, backing, [])) throw new TypeError('digest rejects resizable ArrayBuffer-backed input');
  // A detached view reports length zero. Native set still rejects its detached
  // target, even with an empty source. This validates without reading caller
  // properties, invoking an iterator, allocating a snapshot or changing bytes.
  apply(setBytes, input, [empty, 0]);
  return apply(lengthGetter, input, []);
}

function sha256(input) {
  return hashPrimitive('sha256', input, 'hex');
}

function limit(value, name) {
  if (!isSafeInteger(value) || value < 0) throw new RangeError(`${name} must be a nonnegative safe integer`);
  return value;
}

export function createByteDigestMemo({maxEntries = 64, maxBytes = 64 * 1024 * 1024} = {}) {
  limit(maxEntries, 'maxEntries');
  limit(maxBytes, 'maxBytes');
  // Most recently used first. Neither entries nor their owned bytes escape.
  // Numeric insertion must never invoke an inherited Array/Object setter and
  // expose the entry (and its private owned Buffer) to caller-controlled code.
  const entries = create(null);
  let count = 0, bytes = 0, hits = 0, misses = 0, hashes = 0, evictions = 0, uncached = 0;

  function digest(input) {
    const length = inputLength(input);
    for (let index = 0; index < count; index++) {
      const entry = entries[index];
      if (entry.length !== length || compare(input, entry.bytes) !== 0) continue;
      for (let move = index; move > 0; move--) entries[move] = entries[move - 1];
      entries[0] = entry;
      hits++;
      return entry.hex;
    }

    misses++;
    if (maxEntries === 0 || length > maxBytes) {
      const hex = sha256(input);
      hashes++;
      uncached++;
      return hex;
    }

    // Evict before allocating: owned cached bytes, including the new copy,
    // never exceed maxBytes. Native set reads typed-array internal slots;
    // Buffer.from(input), caller copy methods and iterators are not used.
    while (count >= maxEntries || length > maxBytes - bytes) {
      const oldest = entries[--count];
      bytes -= oldest.length;
      delete entries[count];
      evictions++;
    }
    const owned = allocate(length);
    const ownedLength = apply(lengthGetter, owned, []);
    const ownedBackingLength = apply(backingLengthGetter, apply(bufferGetter, owned, []), []);
    if (ownedLength !== length || ownedBackingLength !== ownedLength) {
      throw new Error('digest requires an exact-length unpooled owned allocation');
    }
    apply(setBytes, owned, [input]);
    const hex = sha256(owned);
    hashes++;
    for (let move = count; move > 0; move--) entries[move] = entries[move - 1];
    entries[0] = {bytes: owned, length: ownedLength, hex};
    count++;
    bytes += ownedLength;
    return hex;
  }

  function statistics() {
    return freeze({hits, misses, hashes, evictions, uncached, entries: count, bytes, maxEntries, maxBytes});
  }

  function clear() {
    for (let index = 0; index < count; index++) delete entries[index];
    count = bytes = hits = misses = hashes = evictions = uncached = 0;
  }

  return freeze({digest, statistics, clear});
}
