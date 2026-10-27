import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appendFileSync, closeSync, existsSync, fstatSync, ftruncateSync, mkdtempSync, openSync, rmdirSync, truncateSync, unlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readCustomerBackupFile } from '../src/main/customer-backup-file';

const hooks = vi.hoisted(() => ({
  afterRead: undefined as ((fd: number) => void) | undefined,
  beforeRead: undefined as (() => void) | undefined,
  lastFd: undefined as number | undefined,
  readCalls: 0,
  maxChunk: undefined as number | undefined,
}));
vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  const trackedOpen = ((...args: any[]) => {
    const fd = (actual.openSync as (...args: any[]) => number)(...args);
    hooks.lastFd = fd;
    return fd;
  }) as typeof actual.openSync;
  const trackedRead = ((...args: any[]) => {
    hooks.readCalls++;
    const before = hooks.beforeRead;
    hooks.beforeRead = undefined;
    before?.();
    if (hooks.maxChunk !== undefined && typeof args[3] === 'number') args[3] = Math.min(args[3], hooks.maxChunk);
    const count = (actual.readSync as (...args: any[]) => number)(...args);
    const after = hooks.afterRead;
    hooks.afterRead = undefined;
    after?.(args[0]);
    return count;
  }) as typeof actual.readSync;
  return { ...actual, openSync: trackedOpen, readSync: trackedRead };
});

let directory: string;
const files = new Set<string>();
function fixture(contents: string) {
  const file = join(directory, 'backup-' + files.size + '.sqlite');
  files.add(file);
  writeFileSync(file, contents);
  return file;
}
function descriptorClosed() {
  expect(hooks.lastFd).toBeTypeOf('number');
  expect(() => fstatSync(hooks.lastFd!)).toThrow();
}
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'naming-backup-read-179-'));
  hooks.afterRead = hooks.beforeRead = undefined;
  hooks.lastFd = hooks.maxChunk = undefined;
  hooks.readCalls = 0;
});
afterEach(() => {
  hooks.afterRead = hooks.beforeRead = undefined;
  for (const file of files) if (existsSync(file)) unlinkSync(file);
  files.clear();
  rmdirSync(directory);
});

describe('selected customer backup file boundary', () => {
  it('returns exactly the bytes from a stable ordinary file and closes its descriptor', () => {
    const bytes = readCustomerBackupFile(fixture('SQLite format 3\0actual bytes'));
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(Buffer.from(bytes).toString()).toBe('SQLite format 3\0actual bytes');
    descriptorClosed();
  });
  it('leaves empty file validity to the existing restore validator', () => {
    expect(readCustomerBackupFile(fixture(''))).toHaveLength(0);
    descriptorClosed();
  });
  it('finishes real short reads without truncating the selected file', () => {
    const file = fixture('partial-read-content');
    hooks.maxChunk = 2;
    expect(Buffer.from(readCustomerBackupFile(file)).toString()).toBe('partial-read-content');
    expect(hooks.readCalls).toBeGreaterThan(2);
    descriptorClosed();
  });
  it('rejects a file above 200MiB before reading any payload', () => {
    const file = fixture('');
    const fd = openSync(file, 'r+');
    try { ftruncateSync(fd, 200 * 1024 * 1024 + 1); } finally { closeSync(fd); }
    expect(() => readCustomerBackupFile(file)).toThrow(/200MiB/);
    expect(hooks.readCalls).toBe(0);
    descriptorClosed();
  });
  it('rejects a directory instead of treating it as a backup', () => {
    expect(() => readCustomerBackupFile(directory)).toThrow();
    expect(hooks.readCalls).toBe(0);
    if (hooks.lastFd !== undefined) descriptorClosed();
  });
  it('rejects a file that grows during the read', () => {
    const file = fixture('original');
    hooks.afterRead = () => appendFileSync(file, 'changed');
    expect(() => readCustomerBackupFile(file)).toThrow(/读取期间已变动/);
    descriptorClosed();
  });
  it('rejects a file that shrinks during the read', () => {
    const file = fixture('original');
    hooks.afterRead = () => truncateSync(file, 1);
    expect(() => readCustomerBackupFile(file)).toThrow(/读取期间已变动/);
    descriptorClosed();
  });
  it('rejects a same-length replacement whose timestamp changes', () => {
    const file = fixture('original');
    hooks.afterRead = () => { writeFileSync(file, 'modified'); utimesSync(file, new Date(), new Date(Date.now() + 10000)); };
    expect(() => readCustomerBackupFile(file)).toThrow(/读取期间已变动/);
    descriptorClosed();
  });
  it('closes the selected file when its read fails', () => {
    const file = fixture('original');
    hooks.beforeRead = () => { throw new Error('读取失败：EIO'); };
    expect(() => readCustomerBackupFile(file)).toThrow(/EIO/);
    descriptorClosed();
  });
});
