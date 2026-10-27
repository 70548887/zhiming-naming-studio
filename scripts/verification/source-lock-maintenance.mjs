import fs from 'node:fs';
import path from 'node:path';
import { fileIdentity, json, relativeFile, sha256 } from './common.mjs';

export const MAINTENANCE_FILE = 'scripts/verification/source-lock-maintenance-916.json';
export const MAINTENANCE_BYTES = 50026;
export const MAINTENANCE_SHA256 = '2ae261bc02cc63148fff5df043e5c24f53b8b81f3f70562ff99df2b47f8db405';
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const need = (ok, message) => { if (!ok) throw new Error('Source-lock maintenance: ' + message); };
const fixedIdentity = value => plain(value) && /^[a-f0-9]{64}$/.test(value.sha256 ?? '') && Number.isSafeInteger(value.bytes) && value.bytes >= 0;
const safeJoin = (base, file) => {
  need(typeof file === 'string' && !file.includes('\\') && !file.includes(':') && file.split('/').every(part => part && part !== '.' && part !== '..'), 'unsafe dependency path');
  return path.posix.join(base, file);
};

// Each profile has an explicit path convention. In particular, relocated M393
// candidate files are local to its sidecar, while its originals remain in data/.
export function maintainedDependencies(lockFile, lock, profile) {
  const files = {};
  const add = (file, pin) => {
    need(fixedIdentity(pin), 'invalid fixed dependency identity: ' + file);
    need(!files[file] || same(files[file], pin), 'conflicting dependency identity: ' + file);
    files[file] = { bytes: pin.bytes, sha256: pin.sha256 };
  };
  if (['m393', 'm610', 'm616'].includes(profile)) {
    for (const [file, pin] of Object.entries(lock.originalFiles ?? {})) add(safeJoin(['m393', 'm616'].includes(profile) ? 'data' : '', file), pin);
    for (const [key, row] of Object.entries(lock.candidateFiles ?? {})) {
      const base = profile === 'm393' ? path.posix.dirname(lockFile) : profile === 'm610' ? '' : 'data';
      add(safeJoin(base, profile === 'm393' ? key : row.file), row);
    }
    need(Object.keys(lock.originalFiles ?? {}).length === 8 && Object.keys(lock.candidateFiles ?? {}).length === 4, 'candidate dependency closure differs');
  } else if (profile === 'm754') {
    for (const original of lock.rawSources ?? []) add(safeJoin('', original.path), original);
    need(Object.keys(lock.projectFiles ?? {}).length === 6 && lock.rawSources?.length === 7, 'element dependency closure differs');
    // This lock stores project hashes without byte lengths; those lengths are
    // separately fixed by the maintenance registry, then checked on disk.
    for (const [file, digest] of Object.entries(lock.projectFiles)) files[safeJoin(path.posix.dirname(lockFile), file)] = { sha256: digest };
    files[safeJoin('', lock.baseline.path)] = { sha256: lock.baseline.sha256 };
  } else if (['m460-b04', 'm460-b02'].includes(profile)) {
    need(Array.isArray(lock.sources) && lock.sources.length === 1, 'source list differs');
    const source = lock.sources[0];
    need(Array.isArray(source.files) && plain(source.fileHashes) && same([...source.files].sort(), Object.keys(source.fileHashes).sort()), 'source dependency closure differs');
    for (const file of source.files) files[safeJoin('', file)] = { sha256: source.fileHashes[file] };
  } else throw new Error('Source-lock maintenance: unknown schema profile: ' + profile);
  return Object.fromEntries(Object.entries(files).sort(([left], [right]) => left.localeCompare(right)));
}

export async function loadSourceLockMaintenance(root, pins) {
  if (!fs.existsSync(path.join(root, MAINTENANCE_FILE))) return new Map();
  const ref = pins.sourceLockMaintenance ?? { file: MAINTENANCE_FILE, sha256: MAINTENANCE_SHA256, bytes: MAINTENANCE_BYTES };
  need(ref.file === MAINTENANCE_FILE && fixedIdentity(ref), 'unknown registry reference');
  // Verifier configuration is verified here; it is not a runtime data payload.
  const actual = await fileIdentity(relativeFile(root, ref.file));
  need(actual.sha256 === ref.sha256 && actual.bytes === ref.bytes, 'registry fixed bytes differ');
  const registry = json(relativeFile(root, ref.file));
  need(registry.schema === 'source-lock-maintenance/1' && registry.task === 'M916-D03' && plain(registry.locks) && Object.keys(registry.locks).length === 6, 'unknown registry schema or lock set');
  for (const [file, spec] of Object.entries(registry.locks)) {
    relativeFile(root, file);
    need((pins.locks?.[file] === undefined || pins.locks[file] === spec.lockSha256) && /^[a-f0-9]{64}$/.test(spec.lockSha256 ?? ''), 'registry/baseline pin differs: ' + file);
    need(spec.schema === spec.document.schema || spec.schema === spec.document.schemaVersion, 'registry schema differs: ' + file);
    need(spec.sourceId === (spec.document.sourceId ?? spec.document.profileId ?? spec.document.sources?.[0]?.id), 'registry source identity differs: ' + file);
  }
  return new Map(Object.entries(registry.locks));
}

export async function verifyMaintainedSourceLock({ root, lockFile, lock, spec, verify, checks }) {
  need(same(lock, spec.document), 'fixed source/schema/metadata differs: ' + lockFile);
  need((lock.schema ?? lock.schemaVersion) === spec.schema && (lock.sourceId ?? lock.profileId ?? lock.sources?.[0]?.id) === spec.sourceId, 'source schema/id differs: ' + lockFile);
  const declared = maintainedDependencies(lockFile, lock, spec.profile);
  need(plain(spec.dependencies) && same(Object.keys(declared).sort(), Object.keys(spec.dependencies).sort()), 'registered dependency set differs: ' + lockFile);
  for (const [file, pin] of Object.entries(declared)) {
    relativeFile(root, file);
    const fixed = spec.dependencies[file];
    need(fixedIdentity(fixed) && pin.sha256 === fixed.sha256 && (pin.bytes === undefined || pin.bytes === fixed.bytes), 'registered dependency pin differs: ' + file);
    await verify(file, fixed.sha256, fixed.bytes, lockFile + '#maintained-original-or-candidate');
  }
  need(plain(spec.publicationFiles) && Object.keys(spec.publicationFiles).length > 0, 'publication/notice closure missing');
  for (const [file, pin] of Object.entries(spec.publicationFiles)) {
    need(fixedIdentity(pin), 'invalid publication identity');
    await verify(file, pin.sha256, pin.bytes, lockFile + '#maintained-publication');
  }
  if (spec.profile === 'm754') {
    const keys = Object.keys(lock.projectFiles);
    need(same(keys, [...keys].sort()), 'element aggregate key order differs');
    const aggregate = sha256(JSON.stringify(lock.projectFiles));
    need(aggregate === lock.aggregateSha256, 'element aggregate differs');
  }
  checks.push({ file: lockFile, source: lock.sourceId ?? lock.profileId ?? lock.sources[0].id, convention: 'exact maintained schema, fixed source/permission metadata, full original/candidate/publication bytes', files: Object.keys(declared).length + Object.keys(spec.publicationFiles).length, maintenanceProfile: spec.profile, admissionChanged: false });
  // Generic source-list checks still recompute fileHashes and aggregates.
  return !['m460-b04', 'm460-b02'].includes(spec.profile);
}
