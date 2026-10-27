import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256 } from './common.mjs';
import { verifySourceLocks } from './source-locks.mjs';

function fixture(t, { convention = 'sha256(JSON.stringify(fileHashes)); sorted relative path keys', id = 'fixture', packaged = ['data/**/*'] } = {}) {
  const root = fs.mkdtempSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '.source-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (file, value) => { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), typeof value === 'string' ? value : JSON.stringify(value)); };
  write('package.json', { version: '0.0.0', build: { files: packaged } });
  write('data/raw/z.txt', 'fixed original z'); write('data/raw/a.txt', 'fixed original a');
  const fileHashes = { 'data/raw/a.txt': sha256('fixed original a'), 'data/raw/z.txt': sha256('fixed original z') };
  const source = { id, files: ['data/raw/z.txt', 'data/raw/a.txt'], fileHashes, sha256: sha256(JSON.stringify(fileHashes)) };
  const lock = { version: 'fixture/1', hashConvention: convention, sources: [source] };
  const lockFile = 'data/fixture-source-lock.json';
  const save = () => { write(lockFile, lock); return { locks: { [lockFile]: sha256(fs.readFileSync(path.join(root, lockFile))) } }; };
  return { root, write, lock, source, save, baseline: save() };
}

test('checks complete originals, sorted map aggregate, and reviewed lock bytes', async t => {
  const f = fixture(t);
  const report = await verifySourceLocks(f);
  assert.equal(report.status, 'passed'); assert.equal(report.summary.locks, 1); assert.equal(report.summary.uniqueFilesHashed, 3);
  f.write('data/raw/a.txt', 'changed original');
  const changed = await verifySourceLocks(f);
  assert.equal(changed.status, 'failed'); assert(changed.errors.some(e => e.check === 'file-hash')); assert(changed.errors.some(e => e.check === 'aggregate-hash'));
});

test('does not silently treat an unknown aggregate convention as JSON fileHashes', async t => {
  const f = fixture(t, { convention: 'sha256(some-new-unknown-format)' });
  const report = await verifySourceLocks(f);
  assert.equal(report.status, 'failed'); assert.match(report.errors[0].message, /Unrecognized aggregate/);
});

test('uses original source order for legacy basename-NUL hash; sorted-order substitution fails', async t => {
  const f = fixture(t);
  f.source.aggregateConvention = 'sha256(original files order: basename + NUL + sha256; newline joined)';
  f.source.sha256 = sha256(f.source.files.map(p => path.posix.basename(p) + '\0' + f.source.fileHashes[p]).join('\n'));
  f.baseline = f.save();
  assert.equal((await verifySourceLocks(f)).status, 'passed');
  f.source.sha256 = sha256([...f.source.files].sort().map(p => path.posix.basename(p) + '\0' + f.source.fileHashes[p]).join('\n')); f.baseline = f.save();
  assert((await verifySourceLocks(f)).errors.some(e => e.check === 'aggregate-hash'));
});

test('rejects missing fileHashes keys and missing original files', async t => {
  const f = fixture(t); delete f.source.fileHashes['data/raw/a.txt']; f.baseline = f.save();
  assert.match((await verifySourceLocks(f)).errors[0].message, /same complete set/);
  const g = fixture(t); fs.unlinkSync(path.join(g.root, 'data/raw/a.txt'));
  assert.equal((await verifySourceLocks(g)).status, 'failed');
});

test('fixed source-lock changes and unreviewed source-lock additions are rejected', async t => {
  const f = fixture(t); f.lock.note = 'unreviewed edit'; f.save();
  assert((await verifySourceLocks(f)).errors.some(e => e.check === 'file-hash' && e.context === 'reviewed lock bytes'));
  f.write('data/new-source-lock.json', f.lock);
  assert((await verifySourceLocks(f)).errors.some(e => e.check === 'reviewed-lock-set'));
});

test('permanent Arc negative: valid locked original must be explicitly included by package patterns', async t => {
  const f = fixture(t, { id: 'qimen-arc-structural-patterns', packaged: ['data/fixture-source-lock.json', 'data/raw/a.txt'] });
  const report = await verifySourceLocks(f);
  assert.equal(report.status, 'failed');
  assert.deepEqual(report.errors.find(e => e.check === 'required-arc-original-payload').files, ['data/raw/z.txt']);
});

test('ordinary retained build sources expose package boundary; strict full-source closure rejects it', async t => {
  const f = fixture(t, { packaged: ['data/fixture-source-lock.json'] });
  const normal = await verifySourceLocks(f);
  assert.equal(normal.status, 'passed'); assert.equal(normal.summary.packageDependencyClosure, 'incomplete'); assert.equal(normal.pending.length, 1);
  assert.equal((await verifySourceLocks({ ...f, requirePackageClosure: true })).status, 'failed');
});

test('base source-lock cache maps verify byte lengths without inventing fileHashes', async t => {
  const f = fixture(t); fs.unlinkSync(path.join(f.root, 'data/fixture-source-lock.json'));
  f.write('data/source-lock.json', { 'a.txt': { sha256: sha256('fixed original a'), bytes: 1 } });
  f.baseline = { locks: { 'data/source-lock.json': sha256(fs.readFileSync(path.join(f.root, 'data/source-lock.json'))) } };
  const report = await verifySourceLocks(f);
  assert(report.errors.some(e => e.check === 'file-bytes')); assert(!report.errors.some(e => /schema/.test(e.message ?? '')));
});

test('source dependency path traversal is rejected before reading outside the fixture', async t => {
  const f = fixture(t); f.source.files = ['../secret']; f.source.fileHashes = { '../secret': '0'.repeat(64) }; f.baseline = f.save();
  assert.match((await verifySourceLocks(f)).errors[0].message, /escapes project/);
});
test('audited missing runtime Arc constants is P1 while proof-only Arc originals remain P2',async t=>{
  const f=fixture(t,{id:'qimen-arc-structural-patterns',packaged:['data/fixture-source-lock.json']}),runtime='data/raw/qimen-patterns-arc-constants.js';
  f.write(runtime,'fixed runtime Arc constants');f.source.files=[runtime,'data/raw/a.txt'];f.source.fileHashes={'data/raw/a.txt':sha256('fixed original a'),[runtime]:sha256('fixed runtime Arc constants')};f.source.sha256=sha256(JSON.stringify(f.source.fileHashes));f.baseline=f.save();
  const result=await verifySourceLocks(f),runtimeIssue=result.errors.find(error=>error.check==='runtime-required-source-payload'),proofIssue=result.errors.find(error=>error.check==='required-arc-original-payload');
  assert.equal(result.status,'failed');assert.equal(runtimeIssue.runtimeRequired,true);assert.equal(runtimeIssue.category,'P1-runtime-payload');assert.deepEqual(runtimeIssue.files,[runtime]);assert.match(runtimeIssue.dependencies[0].reader,/name-imagery-data/);assert.equal(proofIssue.runtimeRequired,false);assert.deepEqual(proofIssue.files,['data/raw/a.txt']);
});

// Fixed approved 1.0.37 identities, not synthetic hashes presented as approval.
const currentRoot=path.resolve(process.env.M498_SOURCE_ROOT??fileURLToPath(new URL('../..',import.meta.url)));
const reviewedBaseline=JSON.parse(fs.readFileSync(new URL('./source-lock-baseline.json',import.meta.url),'utf8'));
function currentFixture(t,kind){
  const root=fs.realpathSync.native(fs.mkdtempSync(path.join(path.dirname(fileURLToPath(import.meta.url)),'.source-current-test-')));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const [lockFile,spec]=Object.entries(reviewedBaseline.formats).find(([,r])=>r.kind===kind);
  const files=new Set(Object.keys(spec.runtimeFiles));
  if(kind==='phonetic')Object.keys(spec.originals).forEach(f=>files.add(f));
  if(kind==='word')Object.values(spec.sources).forEach(r=>files.add(r.file));
  if(kind==='naming-character-meanings-v7.1')for(const extra of ['data/dataset-v5.json','data/raw/CC-BY-SA-4.0.txt'])files.add(extra);
  for(const file of files){const dest=path.join(root,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(currentRoot,file),dest);fs.chmodSync(dest,0o600);}
  if(kind==='naming-character-meanings-v7.1')for(const file of Object.keys(reviewedBaseline.locks))if(file!==lockFile&&!Object.hasOwn(spec.runtimeFiles,file))fs.rmSync(path.join(root,file),{force:true});
  const locks=Object.fromEntries(Object.entries(reviewedBaseline.locks).filter(([file])=>fs.existsSync(path.join(root,file))));
  const formats=Object.fromEntries(Object.entries(reviewedBaseline.formats).filter(([file])=>file in locks).map(([file,format])=>[file,structuredClone(format)]));
  const baseline={...structuredClone(reviewedBaseline),locks,formats};
  const lock=JSON.parse(fs.readFileSync(path.join(root,lockFile),'utf8'));
  const write=(file,value)=>{fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),typeof value==='string'?value:JSON.stringify(value));};
  write('package.json',{version:'1.0.37',build:{files:['data/**/*']}});
  // Test-only re-pinning must update both copies of this lock's own identity.
  // Leave its approved schema and all other dependency pins unchanged so a
  // duplicate lock-byte mismatch cannot hide the intended format diagnostic.
  const repin=()=>{
    write(lockFile,lock);const bytes=fs.readFileSync(path.join(root,lockFile)),digest=sha256(bytes);
    baseline.locks[lockFile]=digest;baseline.formats[lockFile].runtimeFiles[lockFile]={sha256:digest,bytes:bytes.length};
  };
  return{root,baseline,lockFile,lock,spec,write,repin};
}
async function assertFormatDiagnostic(f,pattern){
  const report=await verifySourceLocks(f);assert.equal(report.status,'failed');
  assert(report.errors.some(e=>e.check==='source-lock'&&e.file===f.lockFile&&pattern.test(e.message??'')),JSON.stringify(report.errors));
  assert(!report.errors.some(e=>['file-hash','file-bytes'].includes(e.check)&&e.file===f.lockFile),'A duplicate lock identity check masked the intended format rejection');
  return report;
}
test('test-only dual repinning leaves approved format registries isolated between fixtures',async t=>{
  const before=JSON.stringify(reviewedBaseline.formats),f=currentFixture(t,'word');f.lock.sourceIds.push('unknown-source');f.repin();
  const bytes=fs.readFileSync(path.join(f.root,f.lockFile));assert.equal(f.baseline.locks[f.lockFile],sha256(bytes));
  assert.deepEqual(f.baseline.formats[f.lockFile].runtimeFiles[f.lockFile],{sha256:sha256(bytes),bytes:bytes.length});
  await assertFormatDiagnostic(f,/word version\/source IDs differ/);
  assert.equal(JSON.stringify(reviewedBaseline.formats),before);
  const fresh=currentFixture(t,'word');assert.equal((await verifySourceLocks(fresh)).status,'passed');
});
test('retains all30 historical fixed pins while adding only the five audited137 locks',()=>{
  assert.equal(Object.keys(reviewedBaseline.locks).length,36);assert.equal(Object.keys(reviewedBaseline.formats).length,6);
  assert.equal(reviewedBaseline.reviewedExtensions.contractSha256,'7b8230d86e3ac29b0122dd4e2bdc82ea5fa5705829648419478484fd57ace19b');
  for(const [kind,expected]of [['elements','9c42d9649c3a07cf94a690b1d4059b30352f85eb84cb902fc3ccd67ac49c221f'],['phonetic','0a170e50e46d63f8d4d13396eba93155cb615aabafd16d839de6c63ec8f9b440'],['word','23b218e227cd102c2b0ddef1dd8258fd4a87b2a0b8019f4413dae8f84abea07c'],['meaning-v1','cdc25bbb48fe24d84413e71ead37a07fe633ba8758c991c6b481924c7838eb72'],['meaning-v1.1','473b1fb377bfeeb07c3cea800450e2ec88532b1678c9c590dcad650d8e3dd964']]){
    const [file]=Object.entries(reviewedBaseline.formats).find(([,spec])=>spec.kind===kind);assert.equal(reviewedBaseline.locks[file],expected);
  }
});
for(const kind of ['elements','phonetic','word','meaning-v1','meaning-v1.1'])test('actual reviewed '+kind+' format checks its full dependencies and exact package requirements',async t=>{
  const f=currentFixture(t,kind),report=await verifySourceLocks(f);assert.equal(report.status,'passed',JSON.stringify(report.errors));
  const targets=Object.keys(f.spec.runtimeFiles).filter(file=>file!==f.lockFile);assert(targets.every(file=>report.dependencies.includes(file)));
  const omitted=kind==='word'?'data/name-word-pronunciation/word-engine.d.mts':kind==='phonetic'?'data/name-phonetic/name-phonetic-engine.mjs':kind==='elements'?'data/raw/moe-revised.json.gz':kind==='meaning-v1.1'?'data/meaning-context-v1-1-manifest.json':'data/meaning-context-next-manifest.json';
  f.write('package.json',{version:'1.0.37',build:{files:['data/**/*','!'+omitted]}});
  const missing=await verifySourceLocks(f);assert.equal(missing.status,'failed');assert(missing.errors.some(e=>e.check==='reviewed-runtime-source-payload'&&e.files.includes(omitted)));
});
test('element project aggregate and raw baseline/definition source tampering are rejected',async t=>{
  const f=currentFixture(t,'elements');f.lock.aggregateSha256='0'.repeat(64);f.repin();const aggregate=await verifySourceLocks(f);assert(aggregate.errors.some(e=>e.check==='aggregate-hash'));assert(!aggregate.errors.some(e=>['file-hash','file-bytes'].includes(e.check)&&e.file===f.lockFile));
  const g=currentFixture(t,'elements');fs.appendFileSync(path.join(g.root,'data/raw/moe-revised.json.gz'),'x');assert((await verifySourceLocks(g)).errors.some(e=>e.check==='file-hash'||e.check==='file-bytes'));
});
test('phonetic upstream original is checked even though packaged excerpts are intact',async t=>{
  const f=currentFixture(t,'phonetic'),original='data/raw/zhwiktionary-Chinese.jsonl.gz';fs.appendFileSync(path.join(f.root,original),'changed');
  const result=await verifySourceLocks(f);assert.equal(result.status,'failed');assert(result.errors.some(e=>e.check==='file-hash'&&e.file===original));
});
test('phonetic schema/profile/source identities and aggregate are closed under test-only dual repinning',async t=>{
  for(const [edit,pattern]of [[lock=>{lock.schema='unknown-schema';},/phonetic source\/profile\/convention differs/],[lock=>{lock.profileVersions.cmn='unknown';},/phonetic source\/profile\/convention differs/],[lock=>{lock.licenses['unknown-source']='CC0';},/phonetic source\/profile\/convention differs/],[lock=>{lock.originals['data/raw/unknown.txt']='0'.repeat(64);},/dependency set differs/],[lock=>{lock.aggregateConvention='sha256(unreviewed)';},/phonetic source\/profile\/convention differs/]]){
    const f=currentFixture(t,'phonetic');edit(f.lock);f.repin();await assertFormatDiagnostic(f,pattern);
  }
  const f=currentFixture(t,'phonetic');f.lock.sha256='1'.repeat(64);f.repin();const aggregate=await verifySourceLocks(f);assert(aggregate.errors.some(e=>e.check==='aggregate-hash'));assert(!aggregate.errors.some(e=>['file-hash','file-bytes'].includes(e.check)&&e.file===f.lockFile));
});
test('word originals, unknown source IDs and hash-read declarations remain required',async t=>{
  const f=currentFixture(t,'word');fs.appendFileSync(path.join(f.root,'data/raw/moe-revised.json.gz'),'changed');assert.equal((await verifySourceLocks(f)).status,'failed');
  const g=currentFixture(t,'word');g.lock.sourceIds.push('unknown-source');g.repin();await assertFormatDiagnostic(g,/word version\/source IDs differ/);
  const h=currentFixture(t,'word');delete h.lock.files['word-engine.d.mts'];h.repin();await assertFormatDiagnostic(h,/dependency set differs/);
});
test('unknown extra fields and unsafe local/full dependency paths are rejected for new formats',async t=>{
  const f=currentFixture(t,'elements');f.lock.schema='unknown-extra-schema';f.repin();await assertFormatDiagnostic(f,/unexpected top-level fields/);
  const g=currentFixture(t,'word');g.lock.files['../secret']='0'.repeat(64);g.repin();await assertFormatDiagnostic(g,/dependency set differs/);
  const h=currentFixture(t,'elements');h.lock.rawSources[0].path='../secret';h.repin();await assertFormatDiagnostic(h,/escapes|path/i);
});
test('meaning accepts only the exact reviewed convention and rejects wrong source/dependency/aggregate',async t=>{
  for(const [edit,pattern]of [[lock=>{lock.hashConvention='sha256(JSON.stringify(fileHashes));sorted paths';},/meaning schema\/source\/convention differs/],[lock=>{lock.sources[0].id='unknown-source';},/meaning schema\/source\/convention differs/],[lock=>{lock.sources[0].files.pop();},/meaning dependency registry differs/],[lock=>{lock.sources[0].fileHashes['../secret']='0'.repeat(64);},/meaning dependency registry differs/]]){
    const f=currentFixture(t,'meaning-v1');edit(f.lock);f.repin();await assertFormatDiagnostic(f,pattern);
  }
  const f=currentFixture(t,'meaning-v1.1');f.lock.sources[0].sha256='2'.repeat(64);f.repin();const aggregate=await verifySourceLocks(f);assert(aggregate.errors.some(e=>e.check==='aggregate-hash'));assert(!aggregate.errors.some(e=>['file-hash','file-bytes'].includes(e.check)&&e.file===f.lockFile));
});
test('new-format unknown additional lock is still rejected and original runtime dependency deletion fails',async t=>{
  const f=currentFixture(t,'word');f.write('data/unknown-source-lock.json',f.lock);assert((await verifySourceLocks(f)).errors.some(e=>e.check==='reviewed-lock-set'||e.check==='unpinned-lock'));
  const g=currentFixture(t,'meaning-v1');fs.unlinkSync(path.join(g.root,'data/meaning-context-next-manifest.json'));assert.equal((await verifySourceLocks(g)).status,'failed');
});
test('v7.1 reviewed publication dependency rejects a bad source hash',async t=>{
  const f=currentFixture(t,'naming-character-meanings-v7.1');
  f.lock.sources[0].sha256='0'.repeat(64);f.repin();
  const report=await verifySourceLocks(f);
  assert.equal(report.status,'failed');
  assert(report.errors.some(error=>['aggregate-hash','source-lock','file-hash','file-bytes'].includes(error.check)));
  assert(!report.errors.some(error=>['file-hash','file-bytes'].includes(error.check)&&error.file===f.lockFile));
});
