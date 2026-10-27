import fs from 'node:fs';
import path from 'node:path';
import { sha256 } from './common.mjs';
import {PHASE_SCHEMA,DIRECTORY_PHASE_SCHEMA,isPhasedSchema,verifyPhasedEvidence} from './release-phases.mjs';
import {DESKTOP176_SQL_SCHEMA,LEGACY_SQL_SCHEMA,assertDesktop176SqlProof,desktop176SourceReader} from './desktop176-sql-consumer.mjs';

const hash = value => /^[a-f0-9]{64}$/.test(value ?? '');
const positive = value => Number.isInteger(value) && value > 0;
const object = value => value && typeof value === 'object' && !Array.isArray(value);
export const CURRENT_RELEASE_PROFILE = Object.freeze({ version: '1.0.34', freezeSha256: '189897c62b0c9ec023cfd744aedf9470575625c85cc0f4a65dd40ee4d7f46eb1', frozenInputs: 790, regressionFiles: 192, regressionTests: 2343 });
export const REQUIRED_GATES = ['fullRegression', 'buildAndPackage', 'sourceFreeze', 'package', 'installedRuntime', 'runtimeRecord'];

/** Negative/unknown statuses cannot be overridden by ok:true or positive counts. */
export function inspectEvidenceStatus(value, label, errors, pending) {
  for (const [where, node] of [[label, value], [label + '.summary', value?.summary]]) {
    if (!object(node)) continue;
    if (node.ok === false || node.passed === false || ['failed', 'error', 'rejected'].includes(node.status)) errors.push({ check: where + '.status', category: 'evidence', message: 'Evidence reports failure' });
    if (node.status !== undefined && !['passed', 'verified', 'complete', 'completed', 'local-verified-release'].includes(node.status)) pending.push({ check: where + '.status', status: 'not-verified', recordedStatus: node.status });
  }
}

export async function verifyEvidence(args) {
  const namespace=args.record?.verification?.evidenceSchema;
  if(isPhasedSchema(namespace))return verifyPhasedEvidence(args, adapted=>verifyOriginalEvidence(adapted,namespace===DIRECTORY_PHASE_SCHEMA?DESKTOP176_SQL_SCHEMA:LEGACY_SQL_SCHEMA));
  return verifyOriginalEvidence(args,LEGACY_SQL_SCHEMA);
}

/** Unique bounded entry for the future versioned desktop176 assembly owner.
 * Public default/unphased verification never gains this SQL contract.
 */
export async function verifyDesktop176AssemblyEvidence(args) {
  if(args.pkg?.version!=='1.0.38'||args.record?.version!=='1.0.38'||args.record?.verification?.evidenceSchema!=='naming-studio-release-verification/1')throw new Error('Desktop176 assembly evidence requires exact1.0.38 and its explicit typed assembly entry');
  return verifyOriginalEvidence(args,DESKTOP176_SQL_SCHEMA);
}

async function verifyOriginalEvidence({ root, pkg, record, strictLocal, loadRef, compare, sourceInventory, packagedInventory }, expectedSqlSchema) {
  const desktop176=expectedSqlSchema===DESKTOP176_SQL_SCHEMA;
  const errors = [], pending = [], checks = [], loaded = new Map();
  const need = (condition, check, message) => { if (!condition) pending.push({ check, status: 'not-verified', message }); return condition; };
  const fail = (condition, check, message) => { if (!condition) errors.push({ check, category: 'evidence', message }); return condition; };
  const legacy = pkg.version === CURRENT_RELEASE_PROFILE.version && record.verification?.evidenceSchema === undefined;
  const typed = record.verification?.evidenceSchema === 'naming-studio-release-verification/1';
  const recognized = legacy || typed;
  need(recognized, 'evidence-schema', 'Unsupported release evidence schema/profile; review required.');
  for (const gate of REQUIRED_GATES) {
    const ref = record.verification?.[gate];
    if (!need(object(ref) && typeof ref.file === 'string' && ref.file.length > 0 && hash(ref.sha256), 'verification.' + gate, 'Required file and SHA256 reference absent or malformed.')) continue;
    inspectEvidenceStatus(ref, 'verification.' + gate, errors, pending);
    const value = await loadRef(ref, 'verification.' + gate);
    if (value !== null) loaded.set(gate, value);
  }
  const refs = record.verification ?? {};
  const freezeRef = refs.sourceFreeze;
  const full = refs.fullRegression;
  if (need(hash(full?.inputFreeze?.sha256) && typeof full?.inputFreeze?.file === 'string' && hash(freezeRef?.sha256), 'regression-source-freeze-binding', 'Regression must identify its exact input freeze.')) {
    fail(full.inputFreeze.sha256 === freezeRef.sha256 && path.resolve(root, full.inputFreeze.file) === path.resolve(root, freezeRef.file), 'regression-source-freeze-binding', 'Regression and release source freeze differ.');
  }
  const freezeRaw = loaded.get('sourceFreeze');
  let freeze;
  if (freezeRaw !== undefined) {
    try { freeze = JSON.parse(freezeRaw); } catch { need(false, 'verification.sourceFreeze.schema', 'Source freeze is not JSON.'); }
    if (freeze && need(freeze.version === pkg.version && typeof freeze.frozenAt === 'string' && !Number.isNaN(Date.parse(freeze.frozenAt)) && object(freeze.files) && Object.keys(freeze.files).length > 0, 'verification.sourceFreeze.schema', 'Source freeze requires version, timestamp and nonempty SHA256 file map.')) {
      const keys = Object.keys(freeze.files);
      if (pkg.version === CURRENT_RELEASE_PROFILE.version) {
        fail(freezeRef.sha256 === CURRENT_RELEASE_PROFILE.freezeSha256 && keys.length === CURRENT_RELEASE_PROFILE.frozenInputs, 'verification.sourceFreeze.profile', '1.0.34 requires the reviewed 790-input freeze identity.');
      } else if (typed) need(freeze.schema === (desktop176?'naming-studio-test-input-freeze/1':'naming-studio-source-freeze/1'), 'verification.sourceFreeze.schema', 'Unknown typed source freeze schema.');
      const missing = sourceInventory.filter(file => !(file in freeze.files));
      if (missing.length) pending.push({ check: 'verification.sourceFreeze.coverage', status: 'not-verified', missing });
      for (const [file, expected] of Object.entries(freeze.files)) {
        if (!hash(expected)) { errors.push({ check: 'frozen-input-sha256', category: 'evidence', file }); continue; }
        try { await compare(file, expected, undefined, 'frozen-input', true); } catch (error) { errors.push({ check: 'frozen-input', category: 'evidence', file, message: error.message }); }
      }
      checks.push({ check: 'source-freeze-complete', files: keys.length, coveredProductionInputs: sourceInventory.length, coverage: missing.length ? 'incomplete' : 'passed', version: freeze.version });
    }
  }
  for (const gate of ['fullRegression', 'buildAndPackage']) {
    const ref = refs[gate];
    if (!object(ref)) continue;
    need(ref.exitCode === 0 && typeof ref.command === 'string' && ref.command.length > 0 && positive(ref.session), 'verification.' + gate + '.command', 'Command, positive session id and explicit exitCode 0 are required.');
    if (ref.exitCode !== undefined && ref.exitCode !== 0) fail(false, 'verification.' + gate + '.exitCode', 'Recorded command failed.');
    const raw = loaded.get(gate);
    if (raw === undefined || !recognized) continue;
    if (legacy && gate === 'fullRegression') {
      const text = raw.replace(/\x1b\[[0-9;]*m/g, '');
      const files = /Test Files\s+(\d+) passed \((\d+)\)/.exec(text), tests = /\bTests\s+(\d+) passed \((\d+)\)/.exec(text);
      need(positive(ref.files) && positive(ref.tests) && ref.files === CURRENT_RELEASE_PROFILE.regressionFiles && ref.tests === CURRENT_RELEASE_PROFILE.regressionTests && files && tests && +files[1] === ref.files && +files[2] === ref.files && +tests[1] === ref.tests && +tests[2] === ref.tests && !/\d+ failed/.test(text), 'verification.fullRegression.counts', 'Regression count fields must match successful raw-log totals and reviewed profile.');
    } else if (legacy) {
      need(raw.includes(`${pkg.name}@${pkg.version} package`) && /tsc --noEmit/.test(raw) && /vite .*building for production/.test(raw) && /built in/.test(raw) && /target=nsis/.test(raw) && raw.includes(`NamingStudio-${pkg.version}-Setup.exe`), 'verification.buildAndPackage.log', 'Raw build log must show this version, typecheck, production build, and NSIS artifact.');
    } else {
      let data; try { data = JSON.parse(raw); } catch {}
      inspectEvidenceStatus(data, 'verification.' + gate, errors, pending);
      const schema = gate === 'fullRegression' ? 'naming-studio-regression/1' : 'naming-studio-build-package/1';
      need(data?.schema === schema && data.status === 'passed' && data.version === pkg.version && data.exitCode === 0 && hash(data.sourceFreezeSha256) && data.sourceFreezeSha256 === freezeRef?.sha256, 'verification.' + gate + '.schema', 'Unknown/incomplete typed command evidence.');
      if (gate === 'fullRegression') need(positive(data?.files) && positive(data?.tests) && data.failed === 0 && data.files === ref.files && data.tests === ref.tests, 'verification.fullRegression.counts', 'Typed successful test counts required.');
      else need(data?.typecheck === 'passed' && data?.productionBuild === 'passed' && data?.installerSha256 === record.installer?.sha256 && data?.builtAsarSha256 === record.asar?.builtSha256, 'verification.buildAndPackage.outputs', 'Typed build outputs are not bound to current release.');
    }
  }
  const parsed = {};
  for (const gate of ['package', 'installedRuntime', 'runtimeRecord']) {
    const raw = loaded.get(gate); if (raw === undefined) continue;
    try { parsed[gate] = JSON.parse(raw); } catch { need(false, 'verification.' + gate + '.schema', 'Expected typed JSON evidence.'); continue; }
    inspectEvidenceStatus(parsed[gate], 'verification.' + gate, errors, pending);
  }
  const pack = parsed.package, sql = parsed.installedRuntime, runtime = parsed.runtimeRecord;
  if (pack && recognized) {
    const schema = legacy ? pack.mode === 'installed-complete-payload' : pack.schema === 'naming-studio-package-payload/1';
    need(schema && pack.expectedVersion === pkg.version && pack.ok === true && pack.summary?.ok === true && Array.isArray(pack.failures) && pack.failures.length === 0 && pack.summary.failureCount === 0, 'verification.package.schema', 'Unknown/incomplete complete-payload evidence.');
    need(['workspaceFilesCompared', 'embeddedSourcesCompared', 'sourceLocksChecked', 'sourceAggregatesChecked', 'productionFieldsChecked', 'runtimeFilesCompared'].every(k => positive(pack.summary?.[k])) && Array.isArray(pack.packageFields) && pack.packageFields.length === pack.summary?.productionFieldsChecked && pack.packageFields.every(f => f.equal === true), 'verification.package.counts', 'Complete payload/source/production metadata counts are required.');
    fail(pack.installer?.sha256 === record.installer?.sha256 && pack.asar?.builtSha256 === record.asar?.builtSha256 && pack.asar?.installedSha256 === record.asar?.installedSha256, 'verification.package.artifact-binding', 'Package proof does not bind installer and both ASAR identities.');
  }
  if (sql && recognized) {
    const schema = legacy ? sql.mode === 'actual-installed-SQL-and-sidecar' : sql.schema === expectedSqlSchema;
    need(schema && sql.expectedVersion === pkg.version && sql.ok === true && sql.summary?.ok === true && sql.runtimeVerified === true && Array.isArray(sql.failures) && sql.failures.length === 0 && sql.summary.failureCount === 0, 'verification.installedRuntime.schema', 'Unknown/incomplete installed SQL evidence.');
    need(positive(sql.summary?.actualSessionBindings) && sql.bindings?.length === sql.summary.actualSessionBindings && sql.bindings.every(b => b.completeCurrentSqlJsonEqual === true) && positive(sql.database?.sessions) && sql.database.sessions === sql.bindings.length && positive(sql.database.archives) && sql.archiveBindings?.length === sql.database.archives && sql.archiveBindings.every(b => b.contentHashExact === true) && sql.historyBindings?.length === sql.database.revisions && sql.historyBindings.every(b => b.completeHistorySqlJsonEqual === true) && positive(sql.summary.pdfCount) && sql.pdfs?.length === sql.summary.pdfCount, 'verification.installedRuntime.counts', 'SQL counts must bind to complete current/history/archive/PDF arrays.');
    if(desktop176){
      try{const build=JSON.parse(loaded.get('buildAndPackage'));checks.push({check:'desktop176-final-strong-sql',...await assertDesktop176SqlProof({root,proof:sql,inputFreeze:refs.sourceFreeze,buildCapture:build.evidenceOrigin?.capture,mode:'Installed',phaseID:'resume',loadRef,compare,...desktop176SourceReader(root)})});}
      catch(error){errors.push({check:'desktop176-final-strong-sql',category:'evidence',message:error.message});}
    }
    if (need(typeof sql.resultFile === 'string' && hash(sql.resultSha256) && sql.runtimeResultSha256 === sql.resultSha256, 'verification.installedRuntime.result-ref', 'SQL result requires exact file/hash binding.')) {
      const raw = await loadRef({ file: sql.resultFile, sha256: sql.resultSha256 }, 'verification.installedRuntime.result');
      if (raw !== null) { try { const data = JSON.parse(raw); inspectEvidenceStatus(data, 'runtime-result', errors, pending); need(data.appVersion === pkg.version, 'runtime-result.version', 'Runtime result version differs.'); } catch { need(false, 'runtime-result.schema', 'Runtime result is not JSON.'); } }
    }
  }
  if (runtime && recognized) {
    const schema = legacy ? runtime.mode === 'Installed' : runtime.schema === 'naming-studio-runtime-process/1';
    need(schema && runtime.version === pkg.version && runtime.status === 'passed' && runtime.exitCode === 0 && positive(runtime.app?.pid) && typeof runtime.app?.path === 'string' && runtime.app.electronRunAsNodePresent === false && runtime.normalProcessesTerminated === false && runtime.normalCustomerDataUsed === false && ['started', 'terminalAt', 'completed'].every(k => typeof runtime[k] === 'string' && !Number.isNaN(Date.parse(runtime[k]))), 'verification.runtimeRecord.schema', 'Actual installed process, timestamps and explicit exitCode 0 are required independently of SQL counts.');
    need(runtime.installer?.exitCode === 0 && positive(runtime.installer?.pid) && runtime.installer?.sha256 === record.installer?.sha256, 'verification.runtimeRecord.installer', 'Installer process success must bind the release installer.');
    const installedRoot = typeof record.asar?.installed === 'string' ? path.dirname(path.dirname(path.resolve(root, record.asar.installed))) : null;
    need(installedRoot && typeof runtime.installedDir === 'string' && typeof runtime.app?.path === 'string' && path.resolve(root, runtime.installedDir) === installedRoot && path.dirname(path.resolve(root, runtime.app.path)) === installedRoot, 'verification.runtimeRecord.app-binding', 'Process executable and installed directory must bind the installed ASAR location.');
    need(sql && typeof runtime.sqlVerification === 'string' && typeof runtime.result === 'string' && typeof runtime.packageVerificationPostRuntime === 'string' && path.resolve(root, runtime.sqlVerification) === path.resolve(root, refs.installedRuntime?.file ?? '') && path.resolve(root, runtime.result) === path.resolve(root, sql?.resultFile ?? '') && path.resolve(root, runtime.packageVerificationPostRuntime) === path.resolve(root, refs.package?.file ?? ''), 'verification.runtimeRecord.bindings', 'Actual process record must bind current SQL, runtime result, and post-runtime package proof.');
  }
  // Additional historical references remain identity checks, never substitutes for required schemas.
  const seen = new Set(REQUIRED_GATES.map(k => refs[k]?.file).filter(Boolean));
  async function additional(node, label) {
    if (!object(node)) return;
    inspectEvidenceStatus(node, label, errors, pending);
    if (typeof node.file === 'string' && !seen.has(node.file)) { seen.add(node.file); await loadRef(node, label); }
    if (typeof node.log === 'string') await loadRef({ file: node.log, sha256: node.logSha256 }, label + '.log');
    for (const [k, v] of Object.entries(node)) if (object(v)) await additional(v, label + '.' + k);
  }
  await additional(refs, 'verification');
  return { errors, pending, checks, profile: legacy ? 'legacy-1.0.34-fixed-790-inputs' : typed ? 'naming-studio-release-verification/1' : 'unsupported' };
}
