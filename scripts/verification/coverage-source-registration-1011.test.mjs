import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createSourceExtensionFixture} from './source-extension-fixture-929.mjs';

const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),fixtures=[];
async function fixture(projection='legacy-known-only'){const f=await createSourceExtensionFixture({projectRoot,projection});fixtures.push(f);return f;}
after(()=>{for(const f of fixtures.reverse())f.dispose();});
const inspect=f=>f.coverageGroup.verifyCoverageSourceRegistration({root:f.root});
function change(f,file,transform,body){const before=f.read(file);f.write(file,transform(before));try{body();}finally{f.write(file,before);}}
const flip=bytes=>{const next=Buffer.from(bytes);next[next.length-1]^=1;return next;};

test('exact11 source registration preserves old59roles/16reviews and uses existing runtime/type classes',async()=>{
 const f=await fixture(),value=inspect(f),normal=f.normal.verifyManagedSourceExtensions({root:f.root});
 assert.equal(value.selected.length,11);assert.equal(value.selected.filter(r=>r.subgroup==='coverage-core4').length,4);assert.equal(value.selected.filter(r=>r.subgroup==='direct-qualification-support7').length,7);
 assert.equal(value.selected.filter(r=>r.compileScope==='type-only').length,2);const api=value.selected.find(r=>r.file==='src/shared/naming-coverage-api.ts');assert.equal(api.readerClass,'read-only-renderer');assert.equal(api.compileScope,'renderer-bundle');
 assert.equal(value.selected.filter(r=>r.compileScope==='main-service-bundle').length,8);assert.ok(value.selected.every(r=>r.verified.length&&r.limits.length&&/^[a-f0-9]{40}$/.test(r.gitBlob)));
 assert.equal(value.preservedSourceRoles,59);assert.equal(value.preservedReviews,16);assert.equal(normal.sourceRoles.length,88);assert.equal(normal.coverageRegistration.selected.length,11);
 assert.equal(normal.qiongtongRegistration.currentReviewedPostimages,7);assert.equal(normal.projectV132Registration.selected.length,15);assert.equal(normal.consumerRegistration.selected.length,8);assert.equal(normal.imageryRegistration.selected.length,7);
});
test('one changed byte in each of eleven source files is refused by group and normal reader',async()=>{
 const f=await fixture();for(const file of f.coverageGroup.M1011_SOURCE_FILES)change(f,file,flip,()=>{assert.throws(()=>inspect(f),/fixed input differs/);assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/fixed input differs/);});
});
test('missing sources, missing reviews and altered evidence do not fall back to historical source inventory',async()=>{
 const f=await fixture();for(const file of [f.coverageGroup.M1011_SOURCE_FILES[0],f.coverageGroup.M1003_SOURCE_REVIEW.file]){const bytes=f.read(file);fs.unlinkSync(f.file(file));try{assert.throws(()=>inspect(f),/ENOENT/);assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/ENOENT/);}finally{f.write(file,bytes);}}
 for(const ref of [f.coverageGroup.M1003_SOURCE_REVIEW,f.coverageGroup.M1003_SOURCE_MANIFEST,f.coverageGroup.M1003_SOURCE_RECEIPT,f.coverageGroup.M1011_BASELINE_PROFILE])change(f,ref.file,flip,()=>{assert.throws(()=>inspect(f),/fixed input differs/);assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/fixed input differs/);});
});
test('false SHA, absent review, wrong runtime/type role and expanded context cannot self-repin a profile',async()=>{
 const f=await fixture(),file=f.coverageGroup.M1011_EXTENSION_PROFILE.file;
 const edits=[v=>{v.sourceRoles[59].versions[0].pin.sha256='0'.repeat(64);},v=>{v.reviews.pop();},v=>{v.sourceRoles[59].versions[0].reviewIds=[];},v=>{v.sourceRoles.find(r=>r.file==='src/shared/naming-coverage-api.ts').readerClass='type-contract';},v=>{v.sourceRoles.find(r=>r.file==='src/shared/naming-coverage-api.ts').compileScope='type-only';},v=>{v.sourceRoles.find(r=>r.file==='src/shared/naming-coverage.ts').compileScope='renderer-bundle';},v=>{v.sourceRoles[59].readerClass='type-contract-with-runtime-guard';},v=>{v.sourceRoles[0].versions[0].reviewIds.push(f.coverageGroup.M1011_REVIEW_ID);},v=>{v.sourceRoles[59].file='src/main/m460-publication-data.mjs';},v=>{v.sourceRoles[0].role='changed-old-role';}];
 for(const edit of edits)change(f,file,bytes=>{const v=JSON.parse(bytes);edit(v);return Buffer.from(JSON.stringify(v));},()=>{assert.throws(()=>inspect(f),/fixed input differs/);assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/fixed input differs/);});
});
test('external20 stay context; reviewed521/60/581 labels grant no manual or default-off coverage',async()=>{
 const f=await fixture(),value=inspect(f);assert.equal(value.externalContextFiles.length,20);assert.equal(value.externalContextFilesNewlyRegistered,0);assert.ok(value.externalContextFiles.every(file=>!value.selected.some(row=>row.file===file)));
 assert.equal(value.reviewedCoverageLabels.defaultUnion,521);assert.equal(value.reviewedCoverageLabels.onRequest,60);assert.equal(value.reviewedCoverageLabels.displayMaterialUnion,581);assert.equal(value.coverageRecountExecuted,false);
 for(const key of ['manualCoverageAdded','defaultOffCoverageAdded','formalCoverageAdded'])assert.equal(value[key],0);
 for(const key of ['sourceBuildApproved','wholeSourceClosureApproved','dataSemanticsNewlyApproved','productionApproved','StoreSaveApproved','ServiceOrUIApproved','releaseApproved','outerSealsResealed'])assert.equal(value[key],false);assert.equal(value.activation,'off');
});
test('extra source and actual current package projection retain known-input refusal',async()=>{
 const f=await fixture(),extra='src/domain/coverage-unreviewed-twelfth.ts';f.write(extra,'export const extra=true;\n');try{assert.equal(inspect(f).selected.length,11);assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/unknown source path/);}finally{fs.unlinkSync(f.file(extra));}
 const actual=await fixture('actual');assert.equal(inspect(actual).selected.length,11);assert.throws(()=>actual.normal.verifyManagedSourceExtensions({root:actual.root}),/unknown or changed package projection/);assert.throws(()=>f.normal.requireManagedOuterAdmission({root:f.root}),/current managed registry is empty or duplicated/);
});
test('caller flags and alternate roots cannot supply their own review or extra authority',async()=>{
 const f=await fixture();for(const extra of [{allowUnknown:true},{reviewApproved:true},{profile:'caller.json'},{sourceBuildApproved:true},{reviewRef:null}])assert.throws(()=>f.coverageGroup.verifyCoverageSourceRegistration({root:f.root,...extra}),/only the canonical root option/);assert.throws(()=>f.coverageGroup.verifyCoverageSourceRegistration({root:projectRoot}),/canonical module checkout/);
});
test('a linked source cannot replace even the exact reviewed bytes',async()=>{
 const f=await fixture(),file=f.coverageGroup.M1011_SOURCE_FILES[0],target=f.file(file),held=f.file('held-reviewed-coverage.ts');fs.renameSync(target,held);fs.symlinkSync(held,target,'file');try{assert.throws(()=>inspect(f),/linked input rejected/);}finally{fs.unlinkSync(target);fs.renameSync(held,target);}
});
