import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { approvedDocumentationDelta, archiveEntries, verifyRelease } from './release.mjs';
import { fileIdentity, sha256 } from './common.mjs';

const require = createRequire(import.meta.url);
const asar = require('@electron/asar');
async function fixture(t) {
  const root = fs.mkdtempSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '.release-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (file, value) => { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), typeof value === 'string' ? value : JSON.stringify(value)); };
  const pkg = { name: 'fixture', version: '9.9.9', type: 'module', main: 'main.js', dependencies: {}, build: { files: ['data/**/*', 'main.js', 'package.json'] } };
  write('package.json', pkg); write('main.js', 'console.log("fixture")'); write('data/input.json', { fixed: 'original' });
  const packRoot = path.join(root, 'fixture-pack'); fs.mkdirSync(packRoot);
  for (const f of ['package.json', 'main.js', 'data/input.json']) { fs.mkdirSync(path.dirname(path.join(packRoot, f)), { recursive: true }); fs.copyFileSync(path.join(root, f), path.join(packRoot, f)); }
  const built = path.join(root, 'release/win-unpacked/resources/app.asar'); fs.mkdirSync(path.dirname(built), { recursive: true }); await asar.createPackage(packRoot, built);
  const installed = path.join(root, 'installed/resources/app.asar'); fs.mkdirSync(path.dirname(installed), { recursive: true }); fs.copyFileSync(built, installed);
  write('release/NamingStudio-9.9.9-Setup.exe', 'fixture installer bytes'); const installer = await fileIdentity(path.join(root, 'release/NamingStudio-9.9.9-Setup.exe'));
  write('release/NamingStudio-9.9.9-Setup.exe.sha256', installer.sha256 + '  NamingStudio-9.9.9-Setup.exe\n');
  const frozenFiles = {};
  for (const f of ['package.json', 'main.js', 'data/input.json']) frozenFiles[f] = (await fileIdentity(path.join(root, f))).sha256;
  write('evidence/freeze.json', { schema: 'naming-studio-source-freeze/1', version: '9.9.9', frozenAt: '2026-10-20T00:00:00Z', files: frozenFiles });
  const ref = async file => ({ file, sha256: (await fileIdentity(path.join(root, file))).sha256 });
  const freeze = await ref('evidence/freeze.json');
  const record = { version: '9.9.9', status: 'local-verified-release', verifiedAt: '2026-10-20T00:00:00.000Z', installer: { path: path.join(root, 'release/NamingStudio-9.9.9-Setup.exe'), ...installer }, asar: { built, builtSha256: (await fileIdentity(built)).sha256, installed, installedSha256: (await fileIdentity(installed)).sha256 }, verification: { evidenceSchema: 'naming-studio-release-verification/1', sourceFreeze: freeze } };
  write('evidence/regression.json', { schema: 'naming-studio-regression/1', version: pkg.version, status: 'passed', exitCode: 0, sourceFreezeSha256: freeze.sha256, files: 2, tests: 10, failed: 0 });
  write('evidence/build.json', { schema: 'naming-studio-build-package/1', version: pkg.version, status: 'passed', exitCode: 0, sourceFreezeSha256: freeze.sha256, typecheck: 'passed', productionBuild: 'passed', installerSha256: installer.sha256, builtAsarSha256: record.asar.builtSha256 });
  const pack = { schema: 'naming-studio-package-payload/1', expectedVersion: pkg.version, ok: true, failures: [], installer, asar: record.asar, packageFields: [{ field: 'version', equal: true }], summary: { ok: true, failureCount: 0, workspaceFilesCompared: 3, embeddedSourcesCompared: 1, sourceLocksChecked: 1, sourceAggregatesChecked: 1, productionFieldsChecked: 1, runtimeFilesCompared: 1 } };
  write('evidence/package.json', pack); write('evidence/runtime-result.json', { appVersion: pkg.version });
  const result = await ref('evidence/runtime-result.json');
  const sql = { schema: 'naming-studio-installed-sql/1', expectedVersion: pkg.version, ok: true, runtimeVerified: true, failures: [], resultFile: result.file, resultSha256: result.sha256, runtimeResultSha256: result.sha256, summary: { ok: true, failureCount: 0, actualSessionBindings: 1, pdfCount: 1 }, bindings: [{ completeCurrentSqlJsonEqual: true }], database: { sessions: 1, revisions: 1, archives: 1 }, archiveBindings: [{ contentHashExact: true }], historyBindings: [{ completeHistorySqlJsonEqual: true }], pdfs: [{}] };
  write('evidence/sql.json', sql);
  write('evidence/runtime.json', { schema: 'naming-studio-runtime-process/1', version: pkg.version, status: 'passed', exitCode: 0, started: '2026-10-20T00:00:00Z', terminalAt: '2026-10-20T00:01:00Z', completed: '2026-10-20T00:02:00Z', normalProcessesTerminated: false, normalCustomerDataUsed: false, installedDir: path.join(root, 'installed'), app: { path: path.join(root, 'installed/app.exe'), pid: 456, electronRunAsNodePresent: false }, installer: { exitCode: 0, pid: 123, sha256: installer.sha256 }, sqlVerification: 'evidence/sql.json', result: result.file, packageVerificationPostRuntime: 'evidence/package.json' });
  record.verification.fullRegression = { ...(await ref('evidence/regression.json')), exitCode: 0, command: 'node tests', session: 1, files: 2, tests: 10, inputFreeze: freeze };
  record.verification.buildAndPackage = { ...(await ref('evidence/build.json')), exitCode: 0, command: 'node build', session: 2 };
  record.verification.package = await ref('evidence/package.json'); record.verification.installedRuntime = await ref('evidence/sql.json'); record.verification.runtimeRecord = await ref('evidence/runtime.json');
  const save = () => write('release/NamingStudio-9.9.9-verification.json', record); save();
  const updateEvidence = async (gate, mutate) => { const r = record.verification[gate], file = path.join(root, r.file), data = JSON.parse(fs.readFileSync(file)); mutate(data); write(r.file, data); r.sha256 = (await fileIdentity(file)).sha256; save(); };
  return { root, write, record, save, built, installed, updateEvidence };
}

test('current installer, sidecar, source freeze, pattern payload and installed archive are consistent', async t => {
  const f = await fixture(t); const report = await verifyRelease({ ...f, strictLocal: true });
  assert.equal(report.status, 'passed', JSON.stringify(report.errors)); assert.equal(report.summary.runtimeAcceptance, 'not-executed');
  assert(report.checks.some(c => c.check === 'source-freeze-complete' && c.files === 3));
});

test('portable mode leaves installed history unverified and never claims runtime execution', async t => {
  const f = await fixture(t); f.record.verification.package.file = '.local/old/pass.json'; f.save();
  const report = await verifyRelease(f);
  assert.equal(report.status, 'pending'); assert(report.pending.some(p => p.status === 'external-evidence-unavailable')); assert.equal(report.summary.runtimeAcceptance, 'not-executed');
});

test('missing latest installer is not-executed even if older releases exist', async t => {
  const f = await fixture(t); fs.unlinkSync(path.join(f.root, 'release/NamingStudio-9.9.9-Setup.exe'));
  const report = await verifyRelease(f);
  assert.equal(report.status, 'pending'); assert.equal(report.summary.installer, 'not-executed');
});

test('tampered sidecar and frozen source bytes are independently detected', async t => {
  const f = await fixture(t); f.write('release/NamingStudio-9.9.9-Setup.exe.sha256', '0'.repeat(64)); f.write('data/input.json', { changed: true });
  const report = await verifyRelease({ ...f, strictLocal: true });
  assert.equal(report.status, 'failed'); assert(report.errors.some(e => e.check === 'installer-sidecar')); assert(report.errors.some(e => e.check === 'frozen-input')); assert(report.errors.some(e => e.check === 'packaged-file-bytes'));
});

test('missing final status or required evidence cannot yield passed', async t => {
  const f = await fixture(t); delete f.record.status; delete f.record.verification.installedRuntime; f.save();
  const report = await verifyRelease({ ...f, strictLocal: true });
  assert.equal(report.status, 'pending'); assert(report.pending.some(p => p.check === 'release-record-status')); assert(report.pending.some(p => p.check === 'verification.installedRuntime'));
});

test('does not accept recorded installer or installed archive SHA after byte changes', async t => {
  const f = await fixture(t); fs.appendFileSync(f.installed, 'changed');
  const report = await verifyRelease({ ...f, strictLocal: true });
  assert.equal(report.status, 'failed'); assert(report.errors.some(e => e.check === 'installed-built-asar-equality'));
});

test('normalizes Windows ASAR header directory aliases and rejects canonical collisions', () => {
  const tree = archiveEntries({ files: { 'data\\nested': { files: { 'a.json': { size: 1 } } } } });
  assert(tree.entries.has('data/nested/a.json')); assert.equal(tree.aliases.length, 1);
  assert.throws(() => archiveEntries({ files: { 'data\\nested': { size: 1 }, 'data/nested': { size: 1 } } }), /collision/);
});

test('recorded nonzero build exit code is rejected even when log bytes match', async t => {
  const f = await fixture(t); f.record.verification.buildAndPackage.exitCode = 1; f.save();
  assert((await verifyRelease({ ...f, strictLocal: true })).errors.some(e => e.check === 'verification.buildAndPackage.exitCode'));
});

test('missing positive evidence status and missing command exit code remain pending', async t => {
  const f = await fixture(t); await f.updateEvidence('package', data => { delete data.schema; delete data.summary; });
  delete f.record.verification.buildAndPackage.exitCode; f.save();
  const report = await verifyRelease({ ...f, strictLocal: true });
  assert.equal(report.status, 'pending'); assert(report.pending.some(p => p.check === 'verification.package.schema')); assert(report.pending.some(p => p.check.endsWith('.command')));
});

test('audit: arbitrary documentation replacement is rejected even with allow-post-release-docs', async t => {
  const f = await fixture(t); const pkg = JSON.parse(fs.readFileSync(path.join(f.root, 'package.json')));
  pkg.build.files.push('README.md'); f.write('package.json', pkg); f.write('README.md', 'new post-release documentation');
  const strict = await verifyRelease({ ...f, strictLocal: true });
  assert.equal(strict.status, 'failed'); assert.equal(strict.summary.workspaceMatches, 'differs');
  const allowed = await verifyRelease({ ...f, strictLocal: true, allowPostReleaseDocs: true });
  assert.equal(allowed.status, 'failed'); assert.equal(allowed.summary.workspaceMatches, 'differs'); assert.equal(allowed.workspaceDeltas.length, 1);
  f.write('main.js', 'non-documentation drift');
  assert.equal((await verifyRelease({ ...f, strictLocal: true, allowPostReleaseDocs: true })).status, 'failed');
});

test('audit: all empty required gates are pending, never passed', async t => {
  const f = await fixture(t); for (const k of ['fullRegression', 'buildAndPackage', 'sourceFreeze', 'package', 'installedRuntime', 'runtimeRecord']) f.record.verification[k] = {}; f.save();
  const report = await verifyRelease({ ...f, strictLocal: true });
  assert.equal(report.status, 'pending'); assert.equal(report.summary.overallVerification, 'not-verified'); assert(report.pending.filter(p => /^verification\./.test(p.check)).length >= 6);
});

test('audit: runtime ok:true and positive counts cannot override status:not-verified', async t => {
  const f = await fixture(t); await f.updateEvidence('installedRuntime', data => { data.status = 'not-verified'; });
  const report = await verifyRelease({ ...f, strictLocal: true });
  assert.equal(report.status, 'pending'); assert(report.pending.some(p => p.check === 'verification.installedRuntime.status'));
});

test('audit: SQL counts cannot substitute for an actual installed process record', async t => {
  const f = await fixture(t); await f.updateEvidence('runtimeRecord', data => { delete data.app; delete data.exitCode; });
  const report = await verifyRelease({ ...f, strictLocal: true });
  assert.equal(report.status, 'pending'); assert(report.pending.some(p => p.check === 'verification.runtimeRecord.schema'));
});

test('audit: package.json-only freeze lacks production coverage', async t => {
  const f = await fixture(t); await f.updateEvidence('sourceFreeze', data => { data.files = { 'package.json': data.files['package.json'] }; });
  f.record.verification.fullRegression.inputFreeze = f.record.verification.sourceFreeze;
  for (const gate of ['fullRegression', 'buildAndPackage']) await f.updateEvidence(gate, data => { data.sourceFreezeSha256 = f.record.verification.sourceFreeze.sha256; });
  f.save(); const report = await verifyRelease({ ...f, strictLocal: true });
  assert.equal(report.status, 'pending'); assert(report.pending.some(p => p.check === 'verification.sourceFreeze.coverage'));
});

test('approved documentation exception binds every original/approved SHA and status fact', () => {
  const approval = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'post-release-docs.json')));
  const record = { version: approval.releaseVersion, verification: { sourceFreeze: { sha256: approval.sourceFreezeSha256 }, fullRegression: { files: approval.statusFacts.regressionFiles, tests: approval.statusFacts.regressionTests } }, features: { officialHistoricalNameStatistics: { rows: 20 } } };
  for (const [file, hashes] of Object.entries(approval.files)) {
    const finding = { file, archiveSha256: hashes.releaseSha256, currentSha256: hashes.approvedSha256 };
    assert.equal(approvedDocumentationDelta(record, finding, approval), true);
    assert.equal(approvedDocumentationDelta(record, { ...finding, currentSha256: sha256('invented 99999 passed claim') }, approval), false);
    assert.equal(approvedDocumentationDelta(record, { ...finding, archiveSha256: '0'.repeat(64) }, approval), false);
  }
  record.verification.fullRegression.tests = 99999;
  assert.equal(approvedDocumentationDelta(record, { file: 'README.md', archiveSha256: approval.files['README.md'].releaseSha256, currentSha256: approval.files['README.md'].approvedSha256 }, approval), false);
});
