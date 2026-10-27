import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { argumentsFor, fileIdentity, finish, isMain, json, packageMatcher, portable, relativeFile, sha256, walk,safeRoot,safeInput } from './common.mjs';
import { loadSourceLockMaintenance, verifyMaintainedSourceLock } from './source-lock-maintenance.mjs';

const sortedConvention = /^sha256\(JSON\.stringify\(fileHashes\)\); (?:fileHashes keys sorted by relative path|keys sorted by relative path|sorted relative path keys|sorted relative keys)$/;
const basenameConvention = 'sha256(original files order: basename + NUL + sha256; newline joined)';
const legacySortedVersions = new Map([['following-restrictions-source-lock.json', 'qiongtong-2294674-monthly-following-restrictions/1.0.0']]);
const RUNTIME_ARC_ORIGINALS=new Map([['data/raw/qimen-patterns-arc-constants.js',{reader:'src/main/name-imagery-data.ts:31',mechanism:'loadNameImageryData unconditionally reads and hashes this exact original during StudioService construction'}]]);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const requireFormat=(ok,message)=>{if(!ok)throw new Error('Reviewed source-lock format: '+message);};

export async function verifySourceLocks({ root = process.cwd(), baseline, requirePackageClosure = false } = {}) {
  root = safeRoot(root);
  const errors = [], pending = [], checks = [], dependencies = new Set(), cache = new Map();
  const mandatoryPayload = new Set();
  const reviewedPayload = new Set();
  const identify = async rel => {
    relativeFile(root,rel);
    rel = portable(rel);
    dependencies.add(rel);
    if (!cache.has(rel)) cache.set(rel, fileIdentity(relativeFile(root, rel)));
    return cache.get(rel);
  };
  const verify = async (rel, expected, bytes, context) => {
    if (!/^[a-f0-9]{64}$/.test(expected ?? '')) throw new Error('Invalid fixed SHA256: ' + context);
    const actual = await identify(rel);
    if (actual.sha256 !== expected) errors.push({ check: 'file-hash', file: rel, context, expected, actual: actual.sha256 });
    if (bytes !== undefined && actual.bytes !== bytes) errors.push({ check: 'file-bytes', file: rel, context, expected: bytes, actual: actual.bytes });
    return actual.sha256;
  };
  const lockFiles = walk(path.join(root, 'data'), 'data').filter(f => /(?:^|\/)source-lock\.json$|-source-lock\.json$/.test(f));
  const pins = baseline ?? json(path.join(path.dirname(fileURLToPath(import.meta.url)), 'source-lock-baseline.json'));
  const maintained = await loadSourceLockMaintenance(root, pins);
  const localFile=(lockFile,name)=>{
    requireFormat(typeof name==='string'&&/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)&&!name.includes('..'),'unsafe local dependency path');
    return path.posix.dirname(lockFile)+'/'+name;
  };
  const verifyMap=async(lockFile,actual,expected,context,local=false)=>{
    requireFormat(plain(actual)&&plain(expected)&&same(Object.keys(actual).sort(),Object.keys(expected).sort()),'dependency set differs: '+context);
    const hashes={};
    for(const name of Object.keys(actual).sort()){
      const file=local?localFile(lockFile,name):name;relativeFile(root,file);
      requireFormat(actual[name]===expected[name],'unapproved dependency SHA: '+context+'#'+name);
      hashes[name]=await verify(file,actual[name],undefined,context);
    }
    return hashes;
  };
  const verifyReviewedFormat=async(lockFile,lock,spec)=>{
    requireFormat(plain(spec)&&['elements','phonetic','word','meaning-v1','meaning-v1.1','naming-character-meanings-v7.1'].includes(spec.kind),'unknown schema profile: '+lockFile);
    requireFormat(same(Object.keys(lock).sort(),[...spec.topKeys].sort()),'unexpected top-level fields: '+lockFile);
    requireFormat(plain(spec.runtimeFiles)&&Object.keys(spec.runtimeFiles).length>0,'missing approved runtime dependency registry');
    // These are reviewed payload requirements, not all upstream/build inputs.
    // Their completeness comes from the audited 137 contract in the baseline.
    for(const [file,expected]of Object.entries(spec.runtimeFiles)){
      relativeFile(root,file);reviewedPayload.add(file);
      await verify(file,expected.sha256,expected.bytes,lockFile+'#reviewed-runtime-dependency');
    }
    if(spec.kind==='naming-character-meanings-v7.1'){
      requireFormat(lock.version===spec.version&&lock.profileVersion===spec.profileVersion&&lock.hashConvention===spec.hashConvention&&Array.isArray(lock.sources)&&lock.sources.length===1&&lock.sources[0].id===spec.sourceId,'character71 source/profile/convention differs');
      const source=lock.sources[0];requireFormat(same(source.files,spec.files)&&same(source.fileHashes,spec.fileHashes)&&source.sha256===spec.sourceAggregateSha256,'character71 exact29 dependency registry differs');
      const parse=file=>json(relativeFile(root,file)),profile=parse(spec.publication.profile.file),admission=parse(spec.publication.admission.file),subset=parse(spec.publication.subset.file),manifest=parse(spec.publication.manifest.file);
      for(const row of Object.values(spec.publication))await verify(row.file,row.sha256,row.bytes,lockFile+'#character71-publication');
      const scope=value=>value.scope==='per-character-project-explanation-only'&&value.wholeNameAssessment==='not-assessed'&&value.wholeNameMeaning===null&&value.automaticNameRecommendation===false&&value.automaticSemanticCreditAllowed===false&&value.scoreDelta===0;
      requireFormat(profile.schema==='naming-character-meanings-profile/1'&&profile.profileVersion===spec.profileVersion&&profile.ruleVersion===spec.version&&profile.sourceId===spec.sourceId&&profile.subset.sha256===spec.publication.subset.sha256&&profile.cases.length===40&&new Set(profile.cases.map(row=>row.caseId)).size===40&&new Set(profile.cases.map(row=>row.char)).size===40&&same(profile.cases,subset.cases),'character71 exact40 profile differs');
      requireFormat(admission.schema==='naming-character-meanings-admission/1'&&admission.profileVersion===spec.profileVersion&&admission.ruleVersion===spec.version&&admission.sourceId===spec.sourceId&&admission.profileSha256===spec.publication.profile.sha256&&admission.decision==='approved-character-notes'&&admission.activation===spec.version&&admission.testOnly===false&&same(admission.approvedCaseIds,profile.cases.map(row=>row.caseId).sort())&&scope(admission)&&scope(subset)&&profile.cases.every(scope),'character71 complete production admission differs');
      const published=[...source.files,lockFile].sort();requireFormat(manifest.schema==='naming-character-meanings-v7.1-publication/1'&&manifest.ruleVersion===spec.version&&manifest.profileVersion===spec.profileVersion&&manifest.sourceId===spec.sourceId&&same(manifest.files.map(row=>row.file),published)&&manifest.exactCharacterRows===40,'character71 manifest exact closure differs');
      for(const row of manifest.files)await verify(row.file,row.sha256,row.bytes,lockFile+'#character71-manifest');
      // Generic source/fileHashes/aggregate checks below still verify all29 original dependencies.
    }else if(spec.kind==='elements'){
      requireFormat(lock.profileId===spec.profileId&&lock.hashConvention===spec.hashConvention&&same(lock.baseline,spec.baseline),'element profile/baseline/convention differs');
      const hashes=await verifyMap(lockFile,lock.projectFiles,spec.projectFiles,lockFile+'#projectFiles',true);
      requireFormat(same(Object.keys(lock.projectFiles),Object.keys(spec.projectFiles)),'element aggregate key order differs from reviewed map');
      // The reviewed element map's original order is its documented aggregate.
      const aggregate=sha256(JSON.stringify(Object.fromEntries(Object.keys(lock.projectFiles).map(name=>[name,hashes[name]]))));
      if(aggregate!==lock.aggregateSha256)errors.push({check:'aggregate-hash',file:lockFile,source:lock.profileId,expected:lock.aggregateSha256,actual:aggregate});
      requireFormat(Array.isArray(lock.rawSources),'element raw source list missing');
      for(const original of lock.rawSources)relativeFile(root,original.path);
      requireFormat(same(lock.rawSources,spec.rawSources),'element original source identities differ');
      for(const original of lock.rawSources)await verify(original.path,original.sha256,original.bytes,lockFile+'#rawSources');
      await verify(lock.baseline.path,lock.baseline.sha256,undefined,lockFile+'#baseline');
      checks.push({file:lockFile,source:lock.profileId,convention:lock.hashConvention,files:Object.keys(hashes).length+lock.rawSources.length+1,aggregateSha256:aggregate});
    }else if(spec.kind==='phonetic'){
      requireFormat(lock.schema===spec.schema&&same(lock.profileVersions,spec.profileVersions)&&same(lock.licenses,spec.licenses)&&lock.rimeCommit===spec.rimeCommit&&lock.wiktionarySnapshot===spec.wiktionarySnapshot&&lock.aggregateConvention===spec.aggregateConvention,'phonetic source/profile/convention differs');
      const hashes=await verifyMap(lockFile,lock.fileHashes,spec.fileHashes,lockFile+'#fileHashes',true);
      requireFormat(same(Object.keys(lock.fileHashes),Object.keys(lock.fileHashes).sort()),'phonetic aggregate key order');
      const aggregate=sha256(JSON.stringify(hashes));
      if(aggregate!==lock.sha256)errors.push({check:'aggregate-hash',file:lockFile,expected:lock.sha256,actual:aggregate});
      await verifyMap(lockFile,lock.originals,spec.originals,lockFile+'#upstream-originals');
      checks.push({file:lockFile,source:spec.kind,convention:lock.aggregateConvention,files:Object.keys(hashes).length+Object.keys(lock.originals).length,aggregateSha256:aggregate,upstreamOriginalsChecked:true});
    }else if(spec.kind==='word'){
      requireFormat(lock.version===spec.version&&same(lock.sourceIds,spec.sourceIds),'word version/source IDs differ');
      requireFormat(plain(lock.sources)&&same(Object.keys(lock.sources),Object.keys(spec.sources)),'word source list differs');
      for(const source of Object.values(lock.sources))relativeFile(root,source.file);
      requireFormat(same(lock.sources,spec.sources),'word original source identity differs');
      const hashes=await verifyMap(lockFile,lock.files,spec.files,lockFile+'#files',true);
      for(const source of Object.values(lock.sources))await verify(source.file,source.sha256,undefined,lockFile+'#sources');
      checks.push({file:lockFile,source:spec.kind,convention:'exact reviewed files and upstream-source SHA256; this schema has no aggregate',files:Object.keys(hashes).length+Object.keys(lock.sources).length,upstreamOriginalsChecked:true});
    }else{
      requireFormat(lock.schema===spec.schema&&lock.hashConvention===spec.hashConvention&&Array.isArray(lock.sources)&&lock.sources.length===1&&lock.sources[0].id===spec.sourceId,'meaning schema/source/convention differs');
      requireFormat(same(lock.sources[0].files,spec.files)&&same(lock.sources[0].fileHashes,spec.fileHashes),'meaning dependency registry differs');
      // Existing sources/fileHashes/aggregate verification below remains active.
    }
  };
  const pinnedNames = [...new Set([...Object.keys(pins.locks ?? {}), ...maintained.keys()])].sort();
  if (JSON.stringify(lockFiles) !== JSON.stringify(pinnedNames)) errors.push({ check: 'reviewed-lock-set', added: lockFiles.filter(f => !pinnedNames.includes(f)), missing: pinnedNames.filter(f => !lockFiles.includes(f)) });
  for (const lockFile of lockFiles) {
    try {
      const lock = json(relativeFile(root, lockFile));
      const fixedLockSha256 = pins.locks?.[lockFile] ?? maintained.get(lockFile)?.lockSha256;
      if (fixedLockSha256) await verify(lockFile, fixedLockSha256, undefined, 'reviewed lock bytes');
      else errors.push({ check: 'unpinned-lock', file: lockFile });
      const maintainedSpec = maintained.get(lockFile);
      if (maintainedSpec) {
        await verifyMaintainedSourceLock({ root, lockFile, lock, spec: maintainedSpec, verify, checks });
        continue;
      }
      const format=pins.formats?.[lockFile];
      if(format){await verifyReviewedFormat(lockFile,lock,format);if(!format.kind.startsWith('meaning-')&&format.kind!=='naming-character-meanings-v7.1')continue;}
      if (Array.isArray(lock.sources)) {
        if (!lock.sources.length) throw new Error('Empty sources list');
        for (const source of lock.sources) {
          const context = lockFile + '#' + source.id;
          if (!Array.isArray(source.files) || !source.files.length || !source.fileHashes || typeof source.fileHashes !== 'object') throw new Error('Missing files/fileHashes: ' + context);
          const files = source.files.map(file=>{relativeFile(root,file);return portable(file);});
          // Arc source modules are extracted originals, not runtime-only builder tools.
          if (source.id.startsWith('qimen-arc-')) files.forEach(file => mandatoryPayload.add(file));
          const keys = Object.keys(source.fileHashes);
          if (new Set(files).size !== files.length || JSON.stringify([...files].sort()) !== JSON.stringify([...keys].sort())) throw new Error('files and fileHashes are not the same complete set: ' + context);
          const actualHashes = {};
          for (const file of [...files].sort()) actualHashes[file] = await verify(file, source.fileHashes[file], undefined, context);
          let convention = source.aggregateConvention ?? lock.hashConvention;
          if(format?.kind.startsWith('meaning-')&&convention==='sha256(JSON.stringify(fileHashes));sorted relative paths')convention='reviewed-meaning-sorted-fileHashes';
          if (convention === undefined && legacySortedVersions.get(path.basename(lockFile)) === lock.version) convention = 'legacy-versioned-sorted-fileHashes';
          let aggregate;
          if (convention === basenameConvention) aggregate = sha256(files.map(f => path.posix.basename(f) + '\0' + actualHashes[f]).join('\n'));
          else if (sortedConvention.test(convention ?? '') || convention === 'legacy-versioned-sorted-fileHashes' || convention==='reviewed-meaning-sorted-fileHashes') {
            if (JSON.stringify(keys) !== JSON.stringify([...keys].sort())) errors.push({ check: 'aggregate-key-order', file: lockFile, source: source.id });
            aggregate = sha256(JSON.stringify(actualHashes));
          } else throw new Error('Unrecognized aggregate convention: ' + context + ': ' + convention);
          if (aggregate !== source.sha256) errors.push({ check: 'aggregate-hash', file: lockFile, source: source.id, expected: source.sha256, actual: aggregate });
          checks.push({ file: lockFile, source: source.id, convention, files: files.length, aggregateSha256: aggregate });
        }
      } else {
        const artifacts = lock.artifacts ?? (path.basename(lockFile) === 'source-lock.json' ? lock : null);
        if (!artifacts || !Object.keys(artifacts).length || Object.values(artifacts).some(v => !v || typeof v !== 'object' || !v.sha256)) throw new Error('Unrecognized source-lock schema: ' + lockFile);
        for (const [name, artifact] of Object.entries(artifacts)) await verify('data/raw/' + name, artifact.sha256, artifact.bytes, lockFile);
        checks.push({ file: lockFile, convention: lock.artifacts ? 'artifact-cache-map; SHA256 and byte length per original' : 'base-cache-map; SHA256 and byte length per original', files: Object.keys(artifacts).length });
        if (lock.artifacts && lock.build?.outputSha256) {
          const output = path.posix.dirname(lockFile) + '/numerology-strokes.json';
          await verify(output, lock.build.outputSha256, undefined, lockFile + '#build.outputSha256');
          const table = json(relativeFile(root, output));
          const selected = { 'breezy-kangxi-radicals': 'numerology-breezy-kangxi-strokecount.csv', 'shunshi-kangxi-text': 'numerology-shunshi-kangxi-text.json.gz', 'unicode-kangxi-variants': 'kTraditionalVariant.txt' };
          for (const source of table.sources ?? []) {
            const artifact = selected[source.id];
            if (!artifact || source.sha256 !== lock.artifacts[artifact]?.sha256) throw new Error('Numerology selected-original identity mismatch: ' + source.id);
            checks.push({ file: output, source: source.id, convention: 'SHA256 of selected original, not an aggregate of displayed upstream paths', original: 'data/raw/' + artifact });
          }
        }
      }
    } catch (error) { errors.push({ check: 'source-lock', file: lockFile, message: error.message }); }
  }
  // The base dataset predates fileHashes. Its published source SHA conventions are explicit here.
  if (fs.existsSync(path.join(root, 'data/dataset.json')) && fs.existsSync(path.join(root, 'data/source-lock.json'))) {
    try {
      const raw = json(path.join(root, 'data/source-lock.json'));
      const dataset = json(path.join(root, 'data/dataset.json'));
      for (const source of dataset.sources) {
        let actual, convention;
        if (source.id === 'editorial-rules') {
          const inputs = ['scripts/build-data.mjs', 'scripts/editorial-citation-validation.mjs', 'data/naming-editorial.json'];
          inputs.forEach(f => dependencies.add(f));
          actual = sha256(Buffer.concat(inputs.map(f => fs.readFileSync(relativeFile(root, f)))));
          convention = 'ordered raw-byte concatenation of builder, citation validator, editorial JSON; displayed review files excluded';
        } else {
          const inputs = source.files.filter(f => f.startsWith('data/raw/'));
          if (!inputs.length || inputs.some(f => !raw[path.posix.basename(f)])) throw new Error('Unknown base dataset source: ' + source.id);
          const rows = [];
          for (const f of inputs) rows.push(path.posix.basename(f) + '\0' + await verify(f, raw[path.posix.basename(f)].sha256, undefined, 'dataset#' + source.id));
          actual = sha256(rows.join('\n'));
          convention = basenameConvention + '; derived character-review excluded';
        }
        if (actual !== source.sha256) errors.push({ check: 'dataset-source-aggregate', source: source.id, expected: source.sha256, actual });
        checks.push({ file: 'data/dataset.json', source: source.id, convention, aggregateSha256: actual });
      }
    } catch (error) { errors.push({ check: 'dataset-legacy-conventions', message: error.message }); }
  }
  let omissions = [];
  try {
    const packaged = packageMatcher(json(path.join(root, 'package.json')).build?.files);
    omissions = [...dependencies].sort().filter(f => !packaged(f));
    const missingMandatory = [...mandatoryPayload].sort().filter(f => !packaged(f));
    const missingReviewed=[...reviewedPayload].sort().filter(file=>!packaged(file));
    if(missingReviewed.length)errors.push({check:'reviewed-runtime-source-payload',runtimeRequired:true,files:missingReviewed,message:'The approved new source format requires these exact runtime/provenance resources in explicit build.files; historical build-only omissions remain separately pending.'});
    const missingRuntime=missingMandatory.filter(file=>RUNTIME_ARC_ORIGINALS.has(file)),missingProvenance=missingMandatory.filter(file=>!RUNTIME_ARC_ORIGINALS.has(file));
    if(missingRuntime.length)errors.push({check:'runtime-required-source-payload',category:'P1-runtime-payload',runtimeRequired:true,files:missingRuntime,dependencies:missingRuntime.map(file=>({file,...RUNTIME_ARC_ORIGINALS.get(file)})),message:'The declared application startup reader requires these exact original files; excluding them from the installed payload breaks that runtime source check.'});
    if (missingProvenance.length) errors.push({ check: 'required-arc-original-payload', category: 'P2-provenance-payload', runtimeRequired: false, files: missingProvenance, message: 'Arc originals used only by research/source proofs are absent from explicit build.files. This provenance payload gate does not imply an application startup failure.', evidence: ['src/main/qimen-data.ts:8-20,42-52: installed loaders read fixed manifests, not these raw research originals', 'scripts/verify-qimen-pattern-evidence.mjs:21-40,52: raw-original research proof dependencies'] });
    if (omissions.length) {
      const finding = { check: 'package-source-dependency-closure', status: 'incomplete', files: omissions, detail: 'All originals are checked in the workspace. These locked/build inputs are absent from explicit build.files patterns; full original-source payload closure is not established.' };
      if (requirePackageClosure) errors.push(finding); else pending.push(finding);
    }
  } catch (error) { errors.push({ check: 'package-patterns', message: error.message }); }
  const integrityErrors = errors.filter(error => !['required-arc-original-payload','runtime-required-source-payload','reviewed-runtime-source-payload', 'package-source-dependency-closure', 'package-patterns'].includes(error.check));
  return { schemaVersion: 1, status: errors.length ? 'failed' : 'passed', scope: 'Read-only fixed-lock identity, original bytes, known aggregate conventions, and explicit package pattern coverage. Not a semantic source audit or a rebuilt application.', writes: 0, networkRequests: 0, summary: { sourceIntegrity: integrityErrors.length ? 'failed' : 'passed', locks: lockFiles.length, sourcesOrConventions: checks.length, uniqueFilesHashed: cache.size, packageDependencyClosure: omissions.length ? 'incomplete' : 'passed', unpackagedDependencies: omissions.length, errorCount: errors.length, errorsTruncated: errors.length > 8 }, checks, dependencies: [...dependencies].sort(), errors, pending };
}

if (isMain(import.meta.url)) {
  try { const args = argumentsFor(); finish(await verifySourceLocks({ ...args, baseline: args.baseline ? json(safeInput(args.root,path.resolve(args.baseline))) : undefined }), args); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
