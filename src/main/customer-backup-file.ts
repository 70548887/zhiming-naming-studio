import { openSync, closeSync, fstatSync, readSync } from 'node:fs';

const CUSTOMER_BACKUP_MAX_BYTES = 200 * 1024 * 1024;

/** Check a selected backup's size before allocating, then detect changes during the read. */
export function readCustomerBackupFile(file: string): Uint8Array {
  const fd = openSync(file, 'r');
  try {
    const before = fstatSync(fd, { bigint: true });
    if (!before.isFile() || before.size > BigInt(CUSTOMER_BACKUP_MAX_BYTES)) {
      throw new Error('客户备份文件超过200MiB或不是普通文件。');
    }
    const size = Number(before.size);
    const bytes = Buffer.alloc(size + 1);
    let read = 0;
    while (read < bytes.length) {
      const count = readSync(fd, bytes, read, bytes.length - read, null);
      if (!count) break;
      read += count;
    }
    const after = fstatSync(fd, { bigint: true });
    if (read !== size || before.dev !== after.dev || before.ino !== after.ino ||
        before.size !== after.size || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs) {
      throw new Error('客户备份读取期间已变动，未执行恢复。');
    }
    return new Uint8Array(bytes.buffer, bytes.byteOffset, size);
  } finally {
    closeSync(fd);
  }
}
