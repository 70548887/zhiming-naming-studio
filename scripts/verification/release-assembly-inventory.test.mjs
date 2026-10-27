import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {assembleRelease} from './release-assemble.mjs';
import {validateDesktop176SqlChildCapture} from './release-assemble-desktop176.mjs';
import {createInventoryFixture} from './release-assembly-inventory.fixture.mjs';
import {fixture as createLegacyFixture, VERSION as LEGACY_VERSION} from './release-directory.fixture.mjs';

// These are protocol and file-inventory components. The receipts are synthetic;
// no application, checker, installer, or child process is started by these tests.
// The one legacy fixture initializes its own small SQL database through sql.js.
const serial = {concurrency: false};
const unavailableLink = new Set(['EPERM', 'EACCES', 'ENOTSUP', 'EOPNOTSUPP', 'EXDEV', 'ENOSYS']);
const fileRef = file => {
  const bytes = fs.readFileSync(file);
  return {file: path.resolve(file), sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length};
};
const inside = (root, file) => {
  const relative = path.relative(root, file);
  return relative !== '' && !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep);
};
const outputRelative = (f, root, name) => path.relative(f.root, path.join(root, name));

function assertOwnedTemporaryRoot(root) {
  const realRoot = fs.realpathSync.native(root), temporary = fs.realpathSync.native(os.tmpdir());
  assert.ok(inside(temporary, realRoot), 'fixture cleanup must stay inside an owned temporary directory');
  return realRoot;
}

async function fixture(t, options) {
  const f = await createInventoryFixture(options);
  assertOwnedTemporaryRoot(f.root);
  const inputs = [...new Map(f.inputs.map(row => [path.resolve(row.file), fileRef(row.file)])).values()];
  t.after(async () => {
    try {
      for (const row of inputs) assert.deepEqual(fileRef(row.file), row, 'authenticated input bytes must remain unchanged');
    } finally {
      await f.cleanup();
    }
    assert.equal(fs.existsSync(f.root), false, 'owned inventory fixture must be removed');
  });
  assert.equal(f.proof.status, 'synthetic-commandgate-only');
  return f;
}

async function accept(f) {
  const result = await validateDesktop176SqlChildCapture(f.childInput);
  assert.equal(result.AppInputsAreNotSqlOutputs, true);
  assert.equal(result.actualConfig.file, path.resolve(f.capture.command.args[2]));
  assert.ok(result.immutableInputs > 0);
  assert.ok(result.referenceGraph > 0);
  return result;
}

function hardlink(t, source, destination) {
  try {
    fs.linkSync(source, destination);
  } catch (error) {
    if (!unavailableLink.has(error.code)) throw error;
    t.skip(`hardlinks unavailable on ${process.platform}: ${error.code}`);
    return false;
  }
  const a = fs.statSync(source, {bigint: true}), b = fs.statSync(destination, {bigint: true});
  if (a.ino === 0n || b.ino === 0n) {
    t.skip(`hardlink identity unavailable on ${process.platform}: filesystem returned inode 0`);
    return false;
  }
  assert.equal(a.dev, b.dev);
  assert.equal(a.ino, b.ino);
  t.diagnostic(`hardlink verified on ${process.platform}; dev=${a.dev}; ino=${a.ino}; nlink=${a.nlink}`);
  return true;
}

test('assembly3 SQL command component accepts the complete ordinary-leaf inventory', serial, async t => {
  const f = await fixture(t);
  for (const root of Object.values(f.paths)) {
    f.write(outputRelative(f, root, 'nested/output.bin'), 'synthetic nested output');
    fs.mkdirSync(path.join(root, 'nested/empty-directory'));
  }
  await f.refreshArtifacts();
  f.capture.artifacts.reverse();
  assert.ok(f.capture.artifacts.some(row => inside(f.paths.sidecar, row.file)));
  assert.ok(f.capture.artifacts.some(row => inside(f.paths.scratch, row.file)));
  for (const row of f.capture.artifacts) {
    const stat = fs.lstatSync(row.file);
    assert.ok(stat.isFile() && !stat.isSymbolicLink());
    assert.deepEqual(fileRef(row.file), row);
  }
  await accept(f);
});

test('assembly3 SQL command component accepts a real zero-byte artifact', serial, async t => {
  const f = await fixture(t, {zeroByteArtifact: true});
  const empty = f.capture.artifacts.find(row => row.bytes === 0 && inside(f.paths.scratch, row.file));
  assert.ok(empty, 'fixture must contain an actual empty output leaf');
  assert.equal(fs.statSync(empty.file).size, 0);
  assert.equal(empty.sha256, createHash('sha256').update(Buffer.alloc(0)).digest('hex'));
  assert.deepEqual(fileRef(empty.file), empty);
  await accept(f);
});

test('assembly3 SQL inventory rejects omitted proof/scratch leaves and an empty declaration', serial, async t => {
  for (const side of ['sidecar', 'scratch', 'all']) {
    await t.test(side, serial, async t => {
      const f = await fixture(t, {zeroByteArtifact: side === 'scratch'});
      assert.ok(f.capture.artifacts.length > 0);
      if (side === 'all') f.capture.artifacts = [];
      else {
        const index = f.capture.artifacts.findIndex(row => inside(f.paths[side], row.file) && (side !== 'scratch' || row.bytes === 0));
        assert.ok(index >= 0, `${side} must have an ordinary leaf to omit`);
        assert.equal(fs.statSync(f.capture.artifacts[index].file).isFile(), true);
        f.capture.artifacts.splice(index, 1);
      }
      await assert.rejects(validateDesktop176SqlChildCapture(f.childInput), /artifact inventory is incomplete or differs/);
    });
  }
});

test('assembly3 SQL inventory rejects an unlisted nested leaf in either exact root', serial, async t => {
  for (const side of ['sidecar', 'scratch']) {
    await t.test(side, serial, async t => {
      const f = await fixture(t);
      const extra = f.write(outputRelative(f, f.paths[side], 'unlisted/nested.bin'), 'unlisted ordinary output');
      assert.equal(f.capture.artifacts.some(row => path.resolve(row.file) === extra.file), false);
      assert.equal(fs.lstatSync(extra.file).isFile(), true);
      await assert.rejects(validateDesktop176SqlChildCapture(f.childInput), /artifact inventory is incomplete or differs/);
    });
  }
});

test('assembly3 SQL inventory rejects duplicate normalized artifact paths', serial, async t => {
  const f = await fixture(t), first = f.capture.artifacts[0];
  assert.ok(first);
  const duplicate = {...first, file: path.dirname(first.file) + path.sep + '.' + path.sep + path.basename(first.file)};
  assert.notEqual(duplicate.file, first.file);
  assert.equal(path.resolve(duplicate.file), path.resolve(first.file));
  f.capture.artifacts.push(duplicate);
  await assert.rejects(validateDesktop176SqlChildCapture(f.childInput), /duplicate\/malformed reference: SQL output artifact inventory/);
});

test('assembly3 SQL inventory rejects listed and unlisted hardlinks to an authenticated input', serial, async t => {
  for (const listed of [false, true]) {
    await t.test(listed ? 'listed' : 'unlisted', serial, async t => {
      const f = await fixture(t), source = f.databaseRef.file;
      const link = path.join(f.paths.scratch, 'input-hardlink.bin');
      if (!hardlink(t, source, link)) return;
      if (listed) f.capture.artifacts.push(f.ref(link));
      await assert.rejects(validateDesktop176SqlChildCapture(f.childInput), /artifact must be a new file.*never an App\/source input|inventory duplicates a path or aliases an authenticated input/);
    });
  }
});

test('assembly3 SQL inventory preserves two declared output paths sharing a hardlink', serial, async t => {
  const f = await fixture(t);
  const source = f.write(outputRelative(f, f.paths.scratch, 'output-hardlink-source.bin'), 'new synthetic output');
  const link = path.join(f.paths.sidecar, 'output-hardlink-alias.bin');
  if (!hardlink(t, source.file, link)) return;
  await f.refreshArtifacts();
  assert.ok(f.capture.artifacts.some(row => row.file === source.file));
  assert.ok(f.capture.artifacts.some(row => row.file === link));
  await accept(f);
});

test('the actual assembler keeps a successful explicit assembly2 component branch', serial, async t => {
  const releaseDirectory = 'verification-output/inventory-legacy2-release';
  const f = await createLegacyFixture({releaseDirectory}), root = assertOwnedTemporaryRoot(f.root);
  t.after(() => {
    fs.rmSync(root, {recursive: true, force: true});
    assert.equal(fs.existsSync(root), false, 'owned legacy component fixture must be removed');
  });
  assert.equal(f.config.schema, 'naming-studio-release-assembly/2');
  const result = await assembleRelease({root, config: f.config, output: 'verification-output/inventory-legacy2-typed', releaseDirectory});
  assert.equal(result.record.version, LEGACY_VERSION);
  assert.equal(result.record.releaseDirectory, releaseDirectory);
  assert.equal(result.record.status, 'local-verified-release');
  assert.equal(fs.statSync(result.file).isFile(), true);
  assert.equal(Object.hasOwn(result, 'bundle'), false);
});
