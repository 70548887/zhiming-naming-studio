import type {Buffer} from 'node:buffer';

export interface ByteDigestMemoOptions {
  readonly maxEntries?: number;
  readonly maxBytes?: number;
}

/** Fresh frozen observation only; never a validation or authorization receipt. */
export interface ByteDigestMemoStatistics {
  readonly hits: number;
  readonly misses: number;
  readonly hashes: number;
  readonly evictions: number;
  readonly uncached: number;
  readonly entries: number;
  /** Sum of exact-length private unpooled backing storage; excludes caller input. */
  readonly bytes: number;
  readonly maxEntries: number;
  readonly maxBytes: number;
}

export interface ByteDigestMemo {
  /** Exact complete bytes are compared; only private hashed copies are retained.
   * Rejects Proxy/non-Buffer, shared-backed, resizable-backed and detached inputs.
   * Attached ordinary transferable backing is accepted; the old detached view
   * is rejected after transfer. Requires crypto.hash and trusted Node intrinsics
   * at import (verified Node 22.16 / Electron 44.9 with Node 24.22);
   * captured native operations invoke no caller getters/iterators/callbacks. */
  digest(input: Buffer): string;
  statistics(): Readonly<ByteDigestMemoStatistics>;
  /** Releases all retained entries and resets every observation counter. */
  clear(): void;
}

/** Nonnegative safe-integer caps; oversize inputs hash without being retained.
 * Upstream must freshly read full files and retain all qualification checks.
 * maxEntries=0 disables retention; maxBytes=0 can retain empty buffers only. */
export function createByteDigestMemo(options?: ByteDigestMemoOptions): Readonly<ByteDigestMemo>;
