import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createSourceExtensionFixture} from './source-extension-fixture-929.mjs';

const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),fixtures=[];
const groupCandidateFile='scripts/verification/extension-evidence/m940/project-v132-correspondence-candidate.json';
const groupCandidate=JSON.parse(fs.readFileSync(path.join(projectRoot,groupCandidateFile)));
async function fixture(projection='legacy-known-only'){const f=await createSourceExtensionFixture({projectRoot,projection});fixtures.push(f);return f;}
after(()=>{for(const f of fixtures.reverse())f.dispose();});
const flip=bytes=>{const value=Buffer.from(bytes);value[value.length-1]^=1;return value;};
function change(f,file,transform,body){const original=f.read(file);f.write(file,transform(original));try{body();}finally{f.write(file,original);}}
const check=f=>f.projectGroup.verifyProjectV132SourceRegistration({root:f.root});

test('the actual exact15 review binds10published and5source-only postimages with no product/build authority',async()=>{
 const f=await fixture(),value=check(f);assert.equal(value.status,'matched-exact15-reviewed-source-compatibility');assert.equal(value.selected.length,15);assert.equal(value.execution,9);assert.equal(value.resolution,1);assert.equal(value.sourceOnlyCompanions,5);assert.equal(value.contextDependenciesRegistered,0);
 assert.equal(new Set(value.selected.map(row=>row.perFileReviewId)).size,15);assert.ok(value.selected.every(row=>row.reviewRef.sha256==='b4343a3b181f21de58f40852d2dc4e295db4c08db459a685cb5d7070e3016172'&&row.judgment));
 assert.equal(value.selected.filter(row=>row.compileScope==='type-only').length,2);assert.equal(value.selected.filter(row=>row.compileScope==='source-only').length,3);assert.ok(value.selected.filter(row=>row.category==='source-only-companion').every(row=>row.executionAssetCounterpart===null));
 for(const key of ['productionApproved','sourceBuildApproved','outerSealsResealed'])assert.equal(value[key],false);assert.equal(value.activation,'off');assert.equal(value.traditionalConclusion,'unknown');assert.equal(value.methodScope,'project-proposal-only');assert.equal(value.scoreChange,0);
 const normal=f.normal.verifyManagedSourceExtensions({root:f.root});assert.equal(normal.sourceRoles.length,88);assert.equal(normal.projectV132Registration.selected.length,15);assert.equal(normal.qiongtongRegistration.currentReviewedPostimages,7);assert.equal(normal.productionApproved,false);
});
test('one changed byte in each of the fifteen source files is rejected by both real readers',async()=>{
 const f=await fixture();for(const row of [...groupCandidate.mapped.map(row=>({file:row.sourceFile})),...groupCandidate.companions])change(f,row.file,flip,()=>{assert.throws(()=>check(f),/fixed bytes differ|fixed input differs/);assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/fixed bytes differ|fixed input differs/);});
});
test('each of the ten execution publication counterparts retains its fixed bytes',async()=>{
 const f=await fixture();for(const row of groupCandidate.mapped)change(f,row.resourceFile,flip,()=>assert.throws(()=>check(f),/fixed bytes differ/));
});
test('a real sixteenth group source or a borrowed context dependency cannot enter the15-file authority',async()=>{
 const f=await fixture(),extra=groupCandidate.sourceRoot+'/sixteenth-unreviewed.ts';f.write(extra,Buffer.from('export const unreviewed=true;\n'));
 try{assert.throws(()=>check(f),/missing, duplicate or extra/);assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/missing, duplicate or extra/);}finally{fs.unlinkSync(f.file(extra));}
 const file=f.projectGroup.M944_EXTENSION_PROFILE.file;
 change(f,file,bytes=>{const value=JSON.parse(bytes),row=structuredClone(value.sourceRoles.find(row=>row.file.startsWith(groupCandidate.sourceRoot+'/')));row.file='src/domain/bazi-mainchain/kernel-v12-fixed/control-budget.ts';row.role='borrowed-context-dependency';value.sourceRoles.push(row);return Buffer.from(JSON.stringify(value));},()=>assert.throws(()=>check(f),/fixed input differs/));
});
test('the exact original review and original evidence manifest cannot be replaced or subsetted',async()=>{
 const f=await fixture();for(const ref of [f.projectGroup.M940_EXACT15_REVIEW,f.projectGroup.M940_EXACT15_MANIFEST])change(f,ref.file,flip,()=>assert.throws(()=>check(f),/fixed input differs/));
 change(f,f.projectGroup.M940_EXACT15_REVIEW.file,bytes=>{const v=JSON.parse(bytes);v.files.pop();v.semanticReview.fullTraditionalUseConclusion='approved';return Buffer.from(JSON.stringify(v));},()=>assert.throws(()=>check(f),/fixed input differs/));
});
test('null review references, false hashes, extra versions and runtime license classifications cannot reseal the fixed declaration',async()=>{
 const f=await fixture(),file=f.projectGroup.M944_EXTENSION_PROFILE.file;
 for(const mutate of [v=>{v.reviews.find(row=>row.id===f.projectGroup.M944_REVIEW_ID).sha256='0'.repeat(64);},v=>{v.sourceRoles.find(row=>row.file.startsWith(groupCandidate.sourceRoot+'/')).versions[0].reviewIds=[];},v=>{v.sourceRoles.find(row=>row.file.startsWith(groupCandidate.sourceRoot+'/')).versions[0].pin.sha256='f'.repeat(64);},v=>{v.sourceRoles.find(row=>row.file.startsWith(groupCandidate.sourceRoot+'/')).versions.push({version:'unreviewed'});},v=>{const row=v.sourceRoles.find(row=>row.readerClass==='source-only-license');row.readerClass='pure-rule-or-rule-data';row.compileScope='main-service-bundle';}])change(f,file,bytes=>{const v=JSON.parse(bytes);mutate(v);return Buffer.from(JSON.stringify(v));},()=>assert.throws(()=>check(f),/fixed input differs/));
});
test('the old null-reference M940 candidate remains pending and cannot be edited into an approval',async()=>{
 const f=await fixture();assert.ok(JSON.parse(f.read(groupCandidateFile)).companions.every(row=>row.review.reference===null));
 change(f,groupCandidateFile,bytes=>{const v=JSON.parse(bytes);v.companions[0].review.reference=true;v.authority.registrationAllowed=true;return Buffer.from(JSON.stringify(v));},()=>assert.throws(()=>check(f),/fixed bytes differ/));
});
test('the context build-pins copy is fixed evidence and not additional source registration',async()=>{
 const f=await fixture(),file='scripts/verification/extension-evidence/m944/M940-build-pins-original.json';assert.equal(fs.existsSync(f.file('src/main/bazi-root-feedback-v132-r2-pins.json')),false);
 change(f,file,flip,()=>assert.throws(()=>check(f),/fixed bytes differ/));assert.equal(check(f).contextDependenciesRegistered,0);
});
test('caller switches and a foreign root cannot add approval or change the review set',async()=>{
 const f=await fixture();for(const extra of [{allowUnknown:true},{sourceReviewApproved:true},{reviewRef:null},{manifest:'caller.json'},{productionAdmission:true}])assert.throws(()=>f.projectGroup.verifyProjectV132SourceRegistration({root:f.root,...extra}),/only the canonical root option/);
 assert.throws(()=>f.projectGroup.verifyProjectV132SourceRegistration({root:projectRoot}),/canonical module checkout/);
});
test('a matched15 prefix still refuses another source group, actual211package and empty outer registry',async()=>{
 const f=await fixture();f.write('src/domain/another-unreviewed-group.ts',Buffer.from('export const notReviewed=1;\n'));assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/unknown source path/);fs.unlinkSync(f.file('src/domain/another-unreviewed-group.ts'));
 assert.throws(()=>f.normal.requireManagedOuterAdmission({root:f.root}),/current managed registry is empty or duplicated/);
 const actual=await fixture('actual');assert.equal(check(actual).selected.length,15);assert.throws(()=>actual.normal.verifyManagedSourceExtensions({root:actual.root}),/unknown or changed package projection/);
});
