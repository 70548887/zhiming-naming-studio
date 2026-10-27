import {rebuildNamingCharacterMeanings71,verifyNamingCharacterMeanings71} from './naming-editorial-v7-rebuild.mjs';
import {V71_INPUT_HASHES,V71_PUBLICATION_PINS,V71_EXACT_CASE_IDS,V71_FILES} from './naming-editorial-v7-fixed.mjs';
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';import assert from 'node:assert/strict';import {test} from 'node:test';
import {rebuildNamingEditorialV7,verifyNamingEditorialV7} from './naming-editorial-v7-rebuild.mjs';
import {V7_INPUT_HASHES,V7_PUBLICATION_PINS} from './naming-editorial-v7-fixed.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),read=file=>fs.readFileSync(path.join(root,file)),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),inputPaths=new Set(Object.keys(V7_INPUT_HASHES));
const requested=[],rebuilt=rebuildNamingEditorialV7(file=>{requested.push(file);assert(inputPaths.has(file));return read(file);});
const entry=path.join(root,'scripts/build-naming-editorial-v7.mjs');

test('threeoutputsarebyteidenticaltothefixedr2publicationwithoutreadingthemforreconstruction',()=>{
 assert.equal(rebuilt.outputs.size,3);assert.equal(rebuilt.sourceFileCount,20);for(const[file,bytes]of rebuilt.outputs)assert(bytes.equals(read(file)),file);
 assert.equal(hash(rebuilt.outputs.get('data/naming-editorial-v7.json')),V7_PUBLICATION_PINS.tableSha256);
 assert.equal(hash(rebuilt.outputs.get('data/naming-editorial-meanings-v7-source-lock.json')),V7_PUBLICATION_PINS.lockSha256);
});

test('thereconstructionreadsallandonly18fixeddatafilesandignoresopaquehistoricalprovenancepaths',()=>{
 assert.deepEqual(requested,[...inputPaths]);assert(requested.every(file=>file.startsWith('data/')&&!file.includes('..')&&!file.includes('batches/')));
 const originalReview=JSON.parse(read('data/raw/naming-meanings-v7-review.json')),errata=JSON.parse(read('data/raw/naming-citations-v7-errata-r2.json'));
 assert(originalReview.batches.length===6);assert(originalReview.batches.every(item=>!inputPaths.has(item.file)));assert(!inputPaths.has(errata.audit.file));
});

test('verifychecks18sourcesand3derivedpublicationswithoutanydatawrites',()=>{
 const files=[...inputPaths,...rebuilt.outputs.keys()],before=files.map(file=>({file,hash:hash(read(file)),mtime:fs.statSync(path.join(root,file)).mtimeMs}));
 const result=verifyNamingEditorialV7(read);assert.equal(result.passed,true);assert.equal(result.fixedInputs,18);assert.equal(result.derivedOutputs,3);
 assert.deepEqual(files.map(file=>({file,hash:hash(read(file)),mtime:fs.statSync(path.join(root,file)).mtimeMs})),before);
});

test('eachfinalreviewanderratumisastrictpinnedinputratherthanaselfcertifiedreplacement',()=>{
 for(const target of ['data/raw/naming-meanings-v7-review.json','data/raw/naming-citations-v7-review.json','data/raw/naming-meanings-v7-errata-r1.json','data/raw/naming-citations-v7-errata-r2.json'])assert.throws(()=>rebuildNamingEditorialV7(file=>file===target?Buffer.from('{}'):read(file)),/fixed input bytes differ/);
});

test('missingfixedoriginalsabortwithoutexistingoutputfallback',()=>{
 for(const target of ['data/knowledge-v6.sqlite','data/raw/moe-revised.json.gz','data/raw/zhouyi.tar.gz'])assert.throws(()=>rebuildNamingEditorialV7(file=>{if(file===target)throw Error('missing-input:'+file);return read(file);}),/missing-input:/);
});

test('missingorchangedderivedoutputsfailverifyevenwhentheinputreviewsarevalid',()=>{
 for(const target of rebuilt.outputs.keys()){
  assert.throws(()=>verifyNamingEditorialV7(file=>{if(file===target)throw Error('missing-output:'+file);return read(file);}),/missing-output:/);
  assert.throws(()=>verifyNamingEditorialV7(file=>file===target?Buffer.from('wrong-output'):read(file)),/published output differs/);
 }
});

test('r1errataarenotappliedtwiceandthecorrectedfullnameandpendingcompoundpersist',()=>{
 const table=JSON.parse(rebuilt.outputs.get('data/naming-editorial-v7.json')),yi=table.meaningReviews.find(row=>row.char==='宜'),yin=table.meaningReviews.find(row=>row.char==='寅');assert.equal(yi.useKind,'literal-action');assert.equal(yin.useKind,'literal-manner');
 const ying=table.nameRules.find(rule=>rule.name==='琼莹').readings[1];assert.equal(ying.rawEntryIndex,96948);assert.equal(ying.rawDefinitionIndex,1);assert.equal(ying.dictionarySense,'美石。');assert(!table.nameRules.some(rule=>rule.name==='琼英'));assert.equal(table.rejectedCitationCandidates.find(rule=>rule.name==='琼英').status,'pending');assert.equal(table.nameRules.length,20);
});

test('theCLIrequiresanexplicitreadonlymodeandneverdefaults to publishing',()=>{
 for(const args of [[],['--write'],['--verify','--write']]){const result=spawnSync(process.execPath,[entry,...args],{cwd:root,encoding:'utf8'});assert.equal(result.status,2,result.stderr);assert(result.stderr.includes('No default data writes'));}
 const help=spawnSync(process.execPath,[entry,'--help'],{cwd:root,encoding:'utf8'});assert.equal(help.status,0);assert(help.stdout.includes('read-only'));
});

test('theCLIresolvesitscheckoutfromthescriptlocationandnotfromthecallersworkingdirectory',()=>{
 const result=spawnSync(process.execPath,[entry,'--verify'],{cwd:path.dirname(root),encoding:'utf8',maxBuffer:32768});assert.equal(result.status,0,result.stderr);const report=JSON.parse(result.stdout);assert.equal(report.fixedInputs,18);assert.equal(report.derivedOutputs,3);assert.equal(report.mode,'verify-no-writes');
});

// Explicit7.1 publication tests. The approved decision inventory is a test
// input, not a runtime admission source or an editable lookup override.
const v71Requested=[],v71=rebuildNamingCharacterMeanings71(file=>{v71Requested.push(file);return read(file);});
test('v71-six-publications-reproduce-exactly-without-reading-derived-profile-or-admission-as-input',()=>{
 assert.equal(v71.outputs.size,6);for(const[file,bytes]of v71.outputs)assert(bytes.equals(read(file)),file);
 assert.deepEqual(v71Requested,Object.keys(V71_INPUT_HASHES));assert(!v71Requested.includes(V71_FILES.profile));assert(!v71Requested.includes(V71_FILES.admission));assert(!v71Requested.includes(V71_FILES.manifest));
 assert.equal(hash(v71.outputs.get(V71_FILES.profile)),V71_PUBLICATION_PINS.profile.sha256);assert.equal(hash(v71.outputs.get(V71_FILES.lock)),V71_PUBLICATION_PINS.lock.sha256);
});
test('v71-complete40-approved-source-bindings-and-six-editorial-corrections-remain-exact',()=>{
 const decisionBytes=read('tests/fixtures/naming71-accepted40.json');assert.equal(hash(decisionBytes),'58a6d9d57f672a9da46ea5f6f55f9c6f54caab613677105942702b386a8aed3c');
 const decision=JSON.parse(decisionBytes),subset=JSON.parse(v71.outputs.get(V71_FILES.subset)),profile=JSON.parse(v71.outputs.get(V71_FILES.profile)),old=JSON.parse(read('data/naming-editorial-v7.json'));
 assert.equal(subset.cases.length,40);assert.equal(new Set(subset.cases.map(r=>r.char)).size,40);assert.deepEqual(profile.cases,subset.cases);
 for(const [index,row]of subset.cases.entries()){const expected=decision.rows[index];assert.equal(row.caseId,expected.caseId);assert.equal(row.char,expected.char);assert.equal(row.selectedPinyin,expected.pinyin);assert.equal(row.tone,expected.tone);assert.deepEqual({meaning:row.editorial.meaning,projectWish:row.editorial.projectWish,reason:row.editorial.reason,limits:row.editorial.limits},expected.editorial);assert(!old.meaningReviews.find(r=>r.char===row.char).automaticMeaningAllowed);assert.equal(row.scope,'per-character-project-explanation-only');assert.equal(row.wholeNameMeaning,null);assert.equal(row.automaticSemanticCreditAllowed,false);assert.equal(row.scoreDelta,0);assert(!Object.hasOwn(row,'proposedAutomaticScope'));}
 for(const char of ['绪','朔','霆','中','黎','彩'])assert.deepEqual(subset.cases.find(r=>r.char===char).editorial.limits,decision.rows.find(r=>r.char===char).editorial.limits);
 const ting=subset.cases.find(r=>r.char==='霆'),li=subset.cases.find(r=>r.char==='黎');assert(ting.editorial.meaning.includes('闪电'));assert(ting.editorial.reason.includes('古籍'));assert(li.editorial.reason.includes('梨')||li.editorial.reason.includes('黧'));
});
test('v71-admission-binds-whole40-set-and-profile-without-client-supplied-grants',()=>{
 const admission=JSON.parse(v71.outputs.get(V71_FILES.admission));assert.equal(admission.decision,'approved-character-notes');assert.equal(admission.activation,'naming-editorial-7.1.0');assert.equal(admission.testOnly,false);assert.equal(admission.profileSha256,hash(v71.outputs.get(V71_FILES.profile)));assert.deepEqual(admission.approvedCaseIds,V71_EXACT_CASE_IDS);assert.equal(new Set(admission.approvedCaseIds).size,40);assert.equal(admission.automaticNameRecommendation,false);assert.equal(admission.wholeNameMeaning,null);assert.equal(admission.scoreDelta,0);
});
test('v71-fixed-source-subset-pack-and-oldv7-dependencies-reject-tamper-or-missing-input',()=>{
 for(const target of [V71_FILES.subset,'data/raw/moe-revised.json.gz','data/knowledge-v6.sqlite','data/naming-editorial-meanings-v7-source-lock.json','data/raw/kTraditionalVariant.txt']){assert.throws(()=>rebuildNamingCharacterMeanings71(file=>file===target?Buffer.from('{}'):read(file)),/7.1 fixed input bytes differ/);assert.throws(()=>rebuildNamingCharacterMeanings71(file=>{if(file===target)throw Error('missing:'+file);return read(file);}),/missing:/);}
});
test('v71-derived-profile-pending-admission-or-manifest-grafts-fail-readonly-verification',()=>{
 for(const target of [V71_FILES.profile,V71_FILES.admission,V71_FILES.manifest,V71_FILES.lock])assert.throws(()=>verifyNamingCharacterMeanings71(file=>file===target?Buffer.from('{}'):read(file)),/7.1 published output differs/);
});
test('v71-source-lock-covers-sorted-real-dependencies-with-one-new-active-source',()=>{
 const lock=JSON.parse(v71.outputs.get(V71_FILES.lock)),source=lock.sources[0],manifest=JSON.parse(v71.outputs.get(V71_FILES.manifest));assert.equal(lock.sources.length,1);assert.equal(source.id,'naming-character-meanings-v7.1-fixed');assert.deepEqual(source.files,[...source.files].sort());assert(!source.files.includes(V71_FILES.lock));assert(!source.files.includes(V71_FILES.manifest));assert(source.files.includes('data/naming-editorial-v7.json'));assert(source.files.includes('data/naming-editorial-meanings-v7-source-lock.json'));
 const actual=Object.fromEntries(source.files.map(file=>[file,hash(v71.outputs.get(file)??read(file))]));assert.equal(hash(JSON.stringify(actual)),source.sha256);for(const row of manifest.files){const bytes=v71.outputs.get(row.file)??read(row.file);assert.equal(hash(bytes),row.sha256);assert.equal(bytes.length,row.bytes);}assert.equal(manifest.newProductAdoptionsInCurrent37,0);
});
test('v71-explicit-CLI-is-readonly-and-does-not-change-old7-verify-output',()=>{
 const oldResult=spawnSync(process.execPath,[entry,'--verify'],{cwd:root,encoding:'utf8',maxBuffer:32768});assert.equal(oldResult.status,0,oldResult.stderr);assert.equal(JSON.parse(oldResult.stdout).fixedInputs,18);assert.equal(JSON.parse(oldResult.stdout).derivedOutputs,3);
 const paths=[...Object.keys(V71_INPUT_HASHES),...v71.outputs.keys()],before=paths.map(file=>({file,sha256:hash(read(file)),mtime:fs.statSync(path.join(root,file)).mtimeMs}));
 const result=spawnSync(process.execPath,[entry,'--profile','naming-character-meanings-v7.1/1','--verify'],{cwd:path.dirname(root),encoding:'utf8',maxBuffer:65536});assert.equal(result.status,0,result.stderr);const report=JSON.parse(result.stdout);assert.equal(report.passed,true);assert.equal(report.derivedOutputs,6);assert.equal(report.mode,'verify-7.1-no-writes');assert.deepEqual(paths.map(file=>({file,sha256:hash(read(file)),mtime:fs.statSync(path.join(root,file)).mtimeMs})),before);
 const invalid=spawnSync(process.execPath,[entry,'--profile','unknown','--verify'],{cwd:root,encoding:'utf8'});assert.equal(invalid.status,2);
});
