import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import {safeRoot,safeInput,safeRelativeInput,assertNoReparse,newEvidencePath,writeNewJson} from './safe-paths.mjs';
export {safeRoot,safeInput,newEvidencePath,writeNewJson};

const require = createRequire(import.meta.url);
export const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
export const json = file => JSON.parse(fs.readFileSync(assertNoReparse(file), 'utf8'));
export const portable = file => file.replaceAll('\\', '/').replace(/^\/+/, '');
export const isMain = url => process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(url);
export function relativeFile(root, file) {
  return safeRelativeInput(root,file);
}
export async function fileIdentity(file) {
  assertNoReparse(file);
  const stat = fs.statSync(file);
  if (!stat.isFile()) throw new Error('Expected regular file: ' + file);
  const hash = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return { bytes: stat.size, sha256: hash.digest('hex') };
}
export function walk(root, prefix = '') {
  assertNoReparse(root);
  const rows = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const rel = portable(path.join(prefix, entry.name));
    if (entry.isSymbolicLink()) throw new Error('Filesystem alias requires explicit review: ' + rel);
    if (entry.isDirectory()) rows.push(...walk(path.join(root, entry.name), rel));
    else if (entry.isFile()) rows.push(rel);
  }
  return rows.sort();
}
export function packageMatcher(patterns) {
  const module = require('minimatch');
  const match = module.minimatch ?? module;
  if (!Array.isArray(patterns) || patterns.some(p => typeof p !== 'string')) throw new Error('Only explicit string build.files patterns are supported; FileSet objects require review');
  const positive = patterns.filter(p => !p.startsWith('!'));
  const negative = patterns.filter(p => p.startsWith('!')).map(p => p.slice(1));
  return file => positive.some(p => match(portable(file), p, { dot: true })) && !negative.some(p => match(portable(file), p, { dot: true }));
}
export function atomicJson(file, value, {root=process.cwd()}={}) {
  return writeNewJson(root,file,value);
}
export function argumentsFor(argv = process.argv.slice(2)) {
  const args = { root: process.cwd() };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (['--root', '--report', '--output', '--baseline', '--installed-asar', '--built-asar'].includes(arg)) {
      if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error('Missing value for ' + arg);
      args[(arg === '--output' ? 'report' : arg.slice(2)).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = argv[++i];
    } else if (arg === '--strict-local' || arg === '--strict-local-evidence') args.strictLocal = true;
    else if (arg === '--allow-post-release-docs') args.allowPostReleaseDocs = true;
    else if (arg === '--require-package-closure') args.requirePackageClosure = true;
    else throw new Error('Unknown argument: ' + arg);
  }
  args.root = safeRoot(args.root);
  if(args.report)newEvidencePath(args.root,path.resolve(args.report));
  return args;
}
export function finish(report, args) {
  if (args.report) atomicJson(path.resolve(args.report), report,{root:args.root});
  console.log(JSON.stringify({ status: report.status, summary: report.summary, errors: report.errors.slice(0, 8), pending: report.pending?.slice(0, 8), report: args.report ?? null }));
  process.exitCode = report.status === 'failed' ? 1 : report.status === 'pending' ? 2 : 0;
}
