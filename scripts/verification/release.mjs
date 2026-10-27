import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as guards from './common.mjs';
import { argumentsFor, fileIdentity, finish, isMain, json, packageMatcher, portable, relativeFile, sha256, walk } from './common.mjs';
import { CURRENT_RELEASE_PROFILE, verifyEvidence } from './release-evidence.mjs';
import {PHASE_SCHEMA,DIRECTORY_PHASE_SCHEMA,isPhasedSchema,phasedDocumentationDelta} from './release-phases.mjs';
import {assertNoReparse,isInside} from './safe-paths.mjs';

const require = createRequire(import.meta.url);
const canonical = value => JSON.stringify(value, (_, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : v);

export function approvedDocumentationDelta(record, finding, approval) {
  const approved = approval.files?.[finding.file], facts = approval.statusFacts;
  return Boolean(approval.schema === 'naming-studio-post-release-docs/1' && record?.version === approval.releaseVersion && record?.verification?.sourceFreeze?.sha256 === approval.sourceFreezeSha256 && record?.verification?.fullRegression?.files === facts?.regressionFiles && record?.verification?.fullRegression?.tests === facts?.regressionTests && record?.features?.officialHistoricalNameStatistics?.rows === facts?.historicalGivenNameRows && approved && finding.currentSha256 === approved.approvedSha256 && finding.archiveSha256 === approved.releaseSha256);
}

/** Canonical names are for comparisons only; asar's Windows reader requires native separators. */
export function archiveEntries(header) {
  const entries = new Map(), aliases = [];
  function visit(node, prefix = '') {
    for (const [name, child] of Object.entries(node.files ?? {})) {
      const file = portable(prefix ? prefix + '/' + name : name);
      if (file.split('/').includes('..')) throw new Error('Archive path escapes root: ' + file);
      if (entries.has(file)) throw new Error('Archive path alias collision: ' + file);
      entries.set(file, child);
      if (name.includes('\\') || name.includes('/')) aliases.push({ path: file, headerName: name, kind: child.files ? 'directory' : 'file' });
      if (child.files) visit(child, file);
    }
  }
  visit(header);
  return { entries, aliases };
}

export function expectedPackageFiles(root, patterns) {
  const included = packageMatcher(patterns), candidates = new Set();
  for (const pattern of patterns.filter(p => !p.startsWith('!'))) {
    const fixed = pattern.split('/').filter(Boolean);
    const firstMagic = fixed.findIndex(s => /[*?{[!]/.test(s));
    const prefix = (firstMagic < 0 ? fixed : fixed.slice(0, firstMagic)).join('/');
    if (!prefix) throw new Error('Root-wide package pattern needs explicit review: ' + pattern);
    const file = relativeFile(root, prefix);
    if (!fs.existsSync(file)) throw new Error('Package input missing: ' + prefix);
    if (fs.statSync(file).isDirectory()) walk(file, prefix).forEach(f => candidates.add(f));
    else candidates.add(prefix);
  }
  return [...candidates].filter(included).sort();
}


/** One explicit portable spelling binds the CLI, capture and artifact paths. */
export function releaseArtifactPaths(root, version, releaseDirectory = 'release') {
  root = guards.safeRoot(root);
  if (!/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(version ?? '')) throw new Error('Invalid release version');
  if (typeof releaseDirectory !== 'string' || !releaseDirectory || path.isAbsolute(releaseDirectory) || path.win32.isAbsolute(releaseDirectory)) throw new Error('Release directory must be a project-relative directory');
  const parts = releaseDirectory.split('/');
  if (parts.some(part => !part || part === '.' || part === '..' || /[\\<>:"|?*\u0000-\u001f]/u.test(part) || /[ .]$/u.test(part) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) throw new Error('Unsafe release directory component');
  const directory = assertNoReparse(path.resolve(root, ...parts), {allowMissing:true});
  if (!isInside(root, directory)) throw new Error('Release directory escapes project root');
  if (fs.existsSync(directory) && !fs.statSync(directory).isDirectory()) throw new Error('Release directory is not a directory');
  const installerName = 'NamingStudio-' + version + '-Setup.exe';
  const installer = path.join(directory, installerName), recordPath = path.join(directory, 'NamingStudio-' + version + '-verification.json');
  const sidecar = installer + '.sha256', builtAsar = path.join(directory, 'win-unpacked/resources/app.asar');
  for (const file of [installer, recordPath, sidecar, builtAsar]) assertNoReparse(file, {allowMissing:true});
  return {releaseDirectory, directory, installerName, installer, recordPath, sidecar, builtAsar};
}

export function assertReleasePackageCommand(args, releaseDirectory = 'release', {explicit = false} = {}) {
  const valid = Array.isArray(args) && args.every(arg => typeof arg === 'string') && path.basename(args[0] ?? '') === 'npm-cli.js' && args[1] === 'run' && args[2] === 'package' && (explicit ? args.length === 5 && args[3] === '--' && args[4] === '--config.directories.output=' + releaseDirectory : releaseDirectory === 'release' && args.length === 3);
  if (!valid) throw new Error('Build command must be the explicit npm package script with the exact selected release directory');
}

export function releaseArgumentsFor(argv = process.argv.slice(2)) {
  const old = [], values = new Set(['--root','--report','--output','--baseline','--installed-asar','--built-asar']);
  let releaseDirectory;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--release-directory') {
      if (releaseDirectory !== undefined) throw new Error('Duplicate argument: --release-directory');
      if (!argv[i+1] || argv[i+1].startsWith('--')) throw new Error('Missing value for --release-directory');
      releaseDirectory = argv[++i];
    } else {
      old.push(arg);
      if (values.has(arg) && argv[i+1] && !argv[i+1].startsWith('--')) old.push(argv[++i]);
    }
  }
  const args = argumentsFor(old);
  return releaseDirectory === undefined ? args : {...args,releaseDirectory};
}

export async function verifyRelease({ root = process.cwd(), strictLocal = false, installedAsar, builtAsar, allowPostReleaseDocs = false, releaseDirectory = 'release' } = {}) {
  root = guards.safeRoot ? guards.safeRoot(root) : fs.realpathSync(path.resolve(root));
  const safe = file => {
    const abs = path.resolve(root, file), rel = path.relative(root, abs);
    if (!rel || rel.startsWith('..' + path.sep) || rel === '..' || path.isAbsolute(rel)) throw new Error('Input escapes project: ' + file);
    if (guards.safeInput) {
      let existing = abs;
      while (!fs.existsSync(existing) && existing !== path.dirname(existing)) existing = path.dirname(existing);
      if (existing !== root) guards.safeInput(root, existing, { allowExternal: false });
      return abs;
    }
    for (let current = abs; current !== path.dirname(current); current = path.dirname(current)) if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error('Input alias forbidden: ' + file);
    return abs;
  };
  const errors = [], pending = [], checks = [], workspaceDeltas = [], cache = new Map();
  const docApproval = json(path.join(path.dirname(fileURLToPath(import.meta.url)), 'post-release-docs.json'));
  let record,phaseDocumentation;
  const workspaceDelta = finding => {
    const phaseAllowed=isPhasedSchema(record?.verification?.evidenceSchema)&&phasedDocumentationDelta(finding,phaseDocumentation);
    const allowed = allowPostReleaseDocs && (phaseAllowed||approvedDocumentationDelta(record, finding, docApproval));
    const delta = { ...finding, allowedPostReleaseDocumentation: Boolean(allowed), approvalCommit: allowed&&!phaseAllowed ? docApproval.approvedCommit : undefined,approvalReviewer:allowed&&phaseAllowed?phaseDocumentation.reviewer:undefined };
    workspaceDeltas.push(delta);
    if (!delta.allowedPostReleaseDocumentation) errors.push({ ...delta, category: 'workspace-drift' });
  };
  const identity = file => {
    const abs = safe(file);
    if (!cache.has(abs)) cache.set(abs, fileIdentity(abs));
    return cache.get(abs);
  };
  const compare = async (file, expected, bytes, label, relative = false) => {
    file = relative ? relativeFile(root, file) : safe(file);
    const actual = await identity(file);
    if (!/^[a-f0-9]{64}$/.test(expected ?? '') || actual.sha256 !== expected) errors.push({ check: label, file, expected, actual: actual.sha256 });
    if (bytes !== undefined && actual.bytes !== bytes) errors.push({ check: label + '-bytes', file, expected: bytes, actual: actual.bytes });
    checks.push({ check: label, file, ...actual });
    return actual;
  };
  const pkg = json(safe('package.json'));
  if (!/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(pkg.version ?? '')) throw new Error('Invalid package.version');
  const artifacts = releaseArtifactPaths(root, pkg.version, releaseDirectory);
  const {installerName,installer,recordPath,sidecar} = artifacts;
  if (!fs.existsSync(recordPath) || !fs.existsSync(installer)) {
    return { schemaVersion: 1, status: 'pending', mode: strictLocal ? 'strict-local-evidence' : 'portable', writes: 0, networkRequests: 0, summary: { version: pkg.version, installer: 'not-executed', releaseConsistency: 'not-executed', runtimeAcceptance: 'not-executed' }, checks, errors, pending: [{ check: 'latest-release-artifacts', status: 'not-executed', missing: [recordPath, installer].filter(f => !fs.existsSync(f)) }] };
  }
  record = json(safe(recordPath));
  if (pkg.version === '1.0.38' && record.verification?.evidenceSchema !== DIRECTORY_PHASE_SCHEMA) errors.push({check:'desktop138-required-profile',message:'Application1.0.38 requires the full version3 two-mode acceptance profile.'});
  if (Object.hasOwn(record, 'releaseDirectory') && record.releaseDirectory !== releaseDirectory) errors.push({check:'release-directory-record',expected:releaseDirectory,actual:record.releaseDirectory});
  const sameArtifact = (file, expected) => typeof file === 'string' && file.length > 0 && path.relative(path.resolve(root,file),expected) === '';
  if (releaseDirectory !== 'release') {
    if (record.releaseDirectory !== releaseDirectory) errors.push({check:'release-directory-record',message:'A nondefault directory requires its explicit record declaration.'});
    for (const [key,file,expected] of [['installer',record.installer?.path,installer],['built-asar',record.asar?.built,artifacts.builtAsar]]) if (!sameArtifact(file,expected)) errors.push({check:'release-directory-'+key,message:'Recorded artifact path differs from the selected directory.'});
  }
  if (record.version !== pkg.version) errors.push({ check: 'release-version', expected: pkg.version, actual: record.version });
  if (record.status !== 'local-verified-release') pending.push({ check: 'release-record-status', status: record.status ?? 'missing', required: 'local-verified-release' });
  if (!record.verifiedAt || Number.isNaN(Date.parse(record.verifiedAt))) errors.push({ check: 'verification-timestamp', message: 'Missing or invalid verifiedAt' });
  if (path.win32.basename(record.installer?.path ?? '') !== installerName) errors.push({ check: 'installer-record-name', expected: installerName, actual: record.installer?.path });
  await compare(installer, record.installer?.sha256, record.installer?.bytes, 'installer');
  if (!fs.existsSync(sidecar)) pending.push({ check: 'installer-sidecar', status: 'missing', file: sidecar });
  else {
    const parsed = fs.readFileSync(sidecar, 'utf8').trim().match(/^([a-fA-F0-9]{64})(?:\s+\*?(.+))?$/);
    if (!parsed || parsed[1].toLowerCase() !== record.installer.sha256 || (parsed[2] && path.win32.basename(parsed[2]) !== installerName) || releaseDirectory !== 'release' && parsed[2] !== installerName) errors.push({ check: 'installer-sidecar', message: 'SHA256/name differs from current installer record' });
    checks.push({ check: 'installer-sidecar', file: sidecar, ...(await identity(sidecar)) });
  }
  const sourceInventory = [];let packagedInventory;
  for (const dir of ['src', 'data']) if (fs.existsSync(safe(dir))) sourceInventory.push(...walk(safe(dir), dir));
  for (const file of ['package.json', 'package-lock.json', 'index.html', 'tsconfig.json', 'vite.config.ts', 'vitest.config.ts']) if (fs.existsSync(safe(file))) sourceInventory.push(file);
  // Typed small applications must still freeze every explicit production input, not one convenient file.
  if (['naming-studio-release-verification/1',PHASE_SCHEMA,DIRECTORY_PHASE_SCHEMA].includes(record.verification?.evidenceSchema)) {
    packagedInventory=expectedPackageFiles(root,pkg.build.files);
    for (const file of packagedInventory) if (!sourceInventory.includes(file)) sourceInventory.push(file);
  }
  const evidenceLoad = async (ref, label) => {
    if (typeof ref?.file !== 'string' || !/^[a-f0-9]{64}$/.test(ref.sha256 ?? '')) { pending.push({ check: label, status: 'not-verified', message: 'Required file/SHA256 reference missing.' }); return null; }
    const external = /(?:^|[\\/])\.local(?:[\\/]|$)/.test(ref.file);
    if (external && !strictLocal) { pending.push({ check: label, status: 'external-evidence-unavailable', file: ref.file }); return null; }
    try {
      const file = safe(ref.file);
      if (!fs.existsSync(file)) { pending.push({ check: label, status: 'missing', file: ref.file }); return null; }
      const actual = await compare(file, ref.sha256, undefined, label);
      if (actual.sha256 !== ref.sha256) return null;
      return fs.readFileSync(file, 'utf8');
    } catch (error) { errors.push({ check: label, category: 'evidence', message: error.message }); return null; }
  };
  const evidence = await verifyEvidence({ root, pkg, record, strictLocal, loadRef: evidenceLoad, compare, sourceInventory, packagedInventory });
  if (releaseDirectory !== 'release') {
    const rawBuild = await evidenceLoad(record.verification?.buildAndPackage,'release-directory-build-evidence');
    if (rawBuild !== null) {
      try {
        const build = JSON.parse(rawBuild), captureRaw = await evidenceLoad(build.evidenceOrigin?.capture,'release-directory-build-capture');
        if (captureRaw !== null) {
          const capture = JSON.parse(captureRaw), freeze = isPhasedSchema(record.verification?.evidenceSchema) ? record.verification.inputFreeze : record.verification?.sourceFreeze;
          const freezeEqual = ref => ref?.sha256 === freeze?.sha256 && sameArtifact(ref?.file,path.resolve(root,freeze?.file ?? ''));
          if (capture.schema !== 'naming-studio-command-capture/1' || capture.role !== 'buildAndPackage' || capture.version !== pkg.version || capture.status !== 'completed' || capture.exitCode !== 0 || capture.signal !== null || capture.launchError !== null || capture.freezeError !== null || !freezeEqual(capture.sourceFreeze) || !freezeEqual(capture.freezeAfter) || !sameArtifact(capture.command?.cwd,root)) throw new Error('Selected-directory build capture does not bind this version, workspace and freeze.');
          assertReleasePackageCommand(capture.command.args,releaseDirectory,{explicit:true});
          for (const [file,expected] of [[installer,record.installer?.sha256],[artifacts.builtAsar,record.asar?.builtSha256]]) {
            const row = capture.artifacts?.find(ref => sameArtifact(ref.file,file) && ref.sha256 === expected);
            if (!row || !Number.isSafeInteger(row.bytes) || row.bytes <= 0) throw new Error('Selected-directory build capture lacks the exact artifact path/hash/size.');
            await compare(file,row.sha256,row.bytes,'release-directory-build-artifact');
          }
        }
      } catch (error) { errors.push({check:'release-directory-build-capture',message:error.message}); }
    }
  }
  phaseDocumentation=evidence.publicationDocumentation;
  errors.push(...evidence.errors); pending.push(...evidence.pending); checks.push(...evidence.checks);
  const built = safe(builtAsar ?? artifacts.builtAsar);
  if (releaseDirectory !== 'release' && path.relative(artifacts.builtAsar, built) !== '') throw new Error('Built ASAR differs from the selected release directory');
  if (!fs.existsSync(built)) pending.push({ check: 'built-asar', status: 'missing', file: built });
  else {
    try {
      const asar = require('@electron/asar');
      await compare(built, record.asar?.builtSha256, undefined, 'built-asar');
      const { entries, aliases } = archiveEntries(asar.getRawHeader(built).header);
      // Use path.sep on Windows; slash-only statFile/extractFile misreads otherwise valid ASAR directory aliases.
      const extract = rel => asar.extractFile(built, portable(rel).split('/').join(path.sep));
      const archivePackage = JSON.parse(extract('package.json').toString('utf8'));
      for (const field of ['name', 'version', 'description', 'author', 'license', 'type', 'main', 'dependencies']) if (canonical(archivePackage[field]) !== canonical(pkg[field])) errors.push({ check: 'production-package-field', field });
      const expected = expectedPackageFiles(root, pkg.build?.files);
      for (const rel of expected) {
        if (rel === 'package.json') continue; // electron-builder intentionally removes dev/build metadata.
        if (!entries.has(rel) || entries.get(rel).files || entries.get(rel).link) { workspaceDelta({ check: 'packaged-file-missing-or-alias', file: rel, archiveSha256: null, currentSha256: (await identity(relativeFile(root, rel))).sha256 }); continue; }
        const original = await identity(relativeFile(root, rel));
        const archived = sha256(extract(rel));
        if (original.sha256 !== archived) workspaceDelta({ check: 'packaged-file-bytes', file: rel, expected: original.sha256, actual: archived, currentSha256: original.sha256, archiveSha256: archived });
      }
      checks.push({ check: 'complete-explicit-package-pattern-payload', files: expected.length, archiveEntries: entries.size, windowsAliases: aliases });
      const installedCandidate = installedAsar ?? (strictLocal ? record.asar?.installed : undefined);
      const installed = installedCandidate ? safe(installedCandidate) : undefined;
      if (!installed) pending.push({ check: 'installed-asar', status: 'external-evidence-unavailable', file: record.asar?.installed ?? null });
      else if (!fs.existsSync(installed)) pending.push({ check: 'installed-asar', status: 'missing', file: installed });
      else {
        const installedId = await compare(installed, record.asar?.installedSha256, undefined, 'installed-asar');
        const builtId = await identity(built);
        if (installedId.sha256 !== builtId.sha256) errors.push({ check: 'installed-built-asar-equality', expected: builtId.sha256, actual: installedId.sha256 });
      }
    } catch (error) { errors.push({ check: 'archive-payload', message: error.message }); }
  }
  const artifactErrors = errors.filter(error => !['workspace-drift', 'evidence'].includes(error.category));
  const artifactChecksPresent = ['installer', 'installer-sidecar', 'built-asar'].every(gate => checks.some(check => check.check === gate));
  return { schemaVersion: 1, status: errors.length ? 'failed' : pending.length ? 'pending' : 'passed', mode: strictLocal ? 'strict-local-evidence' : 'portable', writes: 0, networkRequests: 0, scope: 'Current version, installer, sidecar, recorded evidence identities, frozen inputs in strict mode, production package and explicit pattern payload, built/installed archive identities. Existing evidence is checked; no application, installer, UI, AI, or runtime acceptance is executed.', remaining: record.remaining ?? [], summary: { version: pkg.version, recordedStatus: record.status ?? 'missing', evidenceProfile: evidence.profile, overallVerification: errors.length ? 'failed' : pending.length ? 'not-verified' : 'passed', artifactIntegrity: artifactErrors.length ? 'failed' : artifactChecksPresent ? 'passed' : 'not-verified', workspaceMatches: workspaceDeltas.length ? workspaceDeltas.every(d => d.allowedPostReleaseDocumentation) ? 'allowed-post-release-docs' : 'differs' : 'passed', checks: checks.length, failures: errors.length, pending: pending.length, runtimeAcceptance: 'not-executed' }, workspaceDeltas, checks, errors, pending };
}

if (isMain(import.meta.url)) {
  try { const args = releaseArgumentsFor(); finish(await verifyRelease(args), args); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
