import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256 } from './common.mjs';
import { maintainedDependencies, verifyMaintainedSourceLock } from './source-lock-maintenance.mjs';
import { verifySourceLocks } from './source-locks.mjs';

const currentRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const readJson = file => JSON.parse(fs.readFileSync(path.join(currentRoot, file), 'utf8'));
const tempRoot = () => fs.mkdtempSync(path.join(os.tmpdir(), 'm916-source-lock-'));
const put = (root, file, value) => { const target = path.join(root, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, typeof value === 'string' ? value : JSON.stringify(value)); };

test('M916 current six-lock maintenance passes source integrity with complete package closure', async () => {
  const report = await verifySourceLocks({ root: currentRoot });
  assert.equal(report.status, 'passed', JSON.stringify(report.errors));
  assert.equal(report.summary.sourceIntegrity, 'passed');
  assert.equal(report.summary.packageDependencyClosure, 'passed');
  assert.equal(report.summary.unpackagedDependencies, 0);
  assert.equal(report.summary.locks, 42);
  assert.equal(report.errors.length, 0);
  assert.equal(report.pending.length, 0);
});

test('M916 path conventions register all six audited dependency sets', () => {
  const rows = [
    ['data/m460-lexical/naming-character-meanings-m393-source-lock.json', 'm393'],
    ['data/meaning-context-m460-b04-source-lock.json', 'm460-b04'],
    ['data/naming-character-meanings-m610-source-lock.json', 'm610'],
    ['data/naming-character-meanings-m616-source-lock.json', 'm616'],
    ['data/naming-character-meanings-v71-m460-b02-source-lock.json', 'm460-b02'],
    ['data/element-imagery-m754/source-lock.json', 'm754']
  ];
  for (const [file, profile] of rows) {
    const lock = readJson(file);
    const dependencies = maintainedDependencies(file, lock, profile);
    assert(Object.keys(dependencies).length > 0);
    assert(Object.keys(dependencies).every(candidate => candidate.startsWith('data/')));
    assert(Object.keys(dependencies).every(candidate => fs.statSync(path.join(currentRoot, candidate)).isFile()));
  }
});

test('unknown source lock remains rejected by the reviewed lock set gate', async () => {
  const root = tempRoot();
  try {
    put(root, 'package.json', { build: { files: ['data/**/*'] } });
    put(root, 'data/unknown-source-lock.json', { schema: 'unknown', sources: [] });
    const report = await verifySourceLocks({ root, baseline: { locks: {} } });
    assert(report.errors.some(error => error.check === 'reviewed-lock-set'));
    assert(report.errors.some(error => error.check === 'unpinned-lock' && error.file === 'data/unknown-source-lock.json'));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('wrong lock pin remains rejected before any maintained schema acceptance', async () => {
  const root = tempRoot();
  try {
    put(root, 'package.json', { build: { files: ['data/**/*'] } });
    put(root, 'data/source-lock.json', { 'x.txt': { sha256: sha256('x'), bytes: 1 } });
    put(root, 'data/raw/x.txt', 'x');
    const report = await verifySourceLocks({ root, baseline: { locks: { 'data/source-lock.json': '0'.repeat(64) } } });
    assert(report.errors.some(error => error.check === 'file-hash' && error.context === 'reviewed lock bytes' && error.file === 'data/source-lock.json'));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('wrong maintained source identity is rejected after test-only lock repin', async () => {
  const lockFile = 'data/m460-lexical/naming-character-meanings-m393-source-lock.json';
  const registry = readJson('scripts/verification/source-lock-maintenance-916.json');
  const spec = registry.locks[lockFile];
  const lock = structuredClone(spec.document);
  lock.sourceId = 'unreviewed-source';
  await assert.rejects(
    verifyMaintainedSourceLock({ root: currentRoot, lockFile, lock, spec, verify: async () => {}, checks: [] }),
    /fixed source\/schema\/metadata differs/
  );
});
