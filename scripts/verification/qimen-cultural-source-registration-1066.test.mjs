import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createSourceExtensionFixture} from './source-extension-fixture-929.mjs';

const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),fixtures=[];
async function fixture(projection='legacy-known-only'){const f=await createSourceExtensionFixture({projectRoot,projection});fixtures.push(f);return f;}
after(()=>{for(const f of fixtures.reverse())f.dispose();});
const inspect=f=>f.qimenCulturalGroup.verifyQimenCulturalSourceRegistration({root:f.root});
function change(f,file,transform,body){const before=f.read(file);f.write(file,transform(before));try{body();}finally{f.write(file,before);}}
const flip=bytes=>{const next=Buffer.from(bytes);next[next.length-1]^=1;return next;};

test('exact15 preserves73roles/78versions/18reviews and bounded oldgroup slices',async()=>{
 const f=await fixture(),value=inspect(f),normal=f.normal.verifyManagedSourceExtensions({root:f.root});assert.equal(value.selected.length,15);assert.equal(value.preservedSourceRoles,73);assert.equal(value.preservedSourceVersions,78);assert.equal(value.preservedReviews,18);assert.equal(normal.sourceRoles.length,88);assert.equal(normal.qimenCulturalRegistration.selected.length,15);
 assert.equal(value.selected.filter(row=>row.readerClass==='pure-rule-or-rule-data').length,10);assert.equal(value.selected.filter(row=>row.readerClass==='service-fixed-source-reader').length,5);assert.equal(value.selected.filter(row=>row.file.startsWith('src/shared/')).length,4);assert.ok(value.selected.every(row=>row.compileScope==='main-service-bundle'&&row.verified.length&&row.limits.length));
 assert.equal(normal.semanticRegistration.selected.length,3);assert.deepEqual(normal.semanticRegistration.selected.map(row=>row.file),f.semanticGroup.M1035_SOURCE_FILES);assert.equal(normal.coverageRegistration.selected.length,11);assert.equal(normal.imageryRegistration.selected.length,7);assert.equal(normal.consumerRegistration.selected.length,8);assert.equal(normal.projectV132Registration.selected.length,15);assert.equal(normal.qiongtongRegistration.currentReviewedPostimages,7);
});
test('changed current bytes in each of fifteen source postimages fail in both readers',async()=>{
 const f=await fixture();for(const file of f.qimenCulturalGroup.M1066_SOURCE_FILES)change(f,file,flip,()=>{assert.throws(()=>inspect(f),/fixed input differs/);assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/fixed input differs/);});
});
test('missing source/review and altered review/pins/receipt/baseline cannot fall back',async()=>{
 const f=await fixture(),refs=[f.qimenCulturalGroup.M1051_SOURCE_REVIEW,f.qimenCulturalGroup.M1051_SOURCE_PINS,f.qimenCulturalGroup.M1051_SOURCE_RECEIPT,f.qimenCulturalGroup.M1066_BASELINE_PROFILE];for(const ref of refs)change(f,ref.file,flip,()=>{assert.throws(()=>inspect(f),/fixed input differs/);assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/fixed input differs/);});
 for(const file of [f.qimenCulturalGroup.M1066_SOURCE_FILES[0],refs[0].file]){const bytes=f.read(file);fs.unlinkSync(f.file(file));try{assert.throws(()=>inspect(f),/ENOENT/);assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/ENOENT/);}finally{f.write(file,bytes);}}
});
test('profile cannot self-repin SHA/review/role/type or move newreview into an oldslice',async()=>{
 const f=await fixture(),file=f.qimenCulturalGroup.M1066_EXTENSION_PROFILE.file;const mutations=[v=>{v.sourceRoles[73].versions[0].pin.sha256='0'.repeat(64);},v=>{v.reviews.pop();},v=>{v.reviews.at(-1).sha256='f'.repeat(64);},v=>{v.sourceRoles[73].versions[0].reviewIds=[];},v=>{v.sourceRoles[73].role='unreviewed-cultural-role';},v=>{v.sourceRoles.find(r=>r.file==='src/shared/qimen-cultural-comparison.ts').readerClass='type-contract';v.sourceRoles.find(r=>r.file==='src/shared/qimen-cultural-comparison.ts').compileScope='type-only';},v=>{v.sourceRoles[73].readerClass='type-contract-with-runtime-guard';},v=>{v.sourceRoles[70].versions[0].reviewIds=[f.qimenCulturalGroup.M1066_REVIEW_ID];},v=>{v.sourceRoles[0].versions[0].pin.bytes++;},v=>{[v.sourceRoles[70],v.sourceRoles[73]]=[v.sourceRoles[73],v.sourceRoles[70]];}];
 for(const mutate of mutations)change(f,file,bytes=>{const v=JSON.parse(bytes);mutate(v);return Buffer.from(JSON.stringify(v));},()=>{assert.throws(()=>inspect(f),/fixed input differs/);assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/fixed input differs/);});
});
test('excluded wrapper/CSS and external Store cannot borrow exact15 registration',async()=>{
 const f=await fixture(),profileFile=f.qimenCulturalGroup.M1066_EXTENSION_PROFILE.file;
 for(const file of [...f.qimenCulturalGroup.M1066_EXCLUDED_CONTEXT,'src/main/store.ts'])change(f,profileFile,bytes=>{const v=JSON.parse(bytes);v.sourceRoles[73].file=file;return Buffer.from(JSON.stringify(v));},()=>assert.throws(()=>inspect(f),/fixed input differs/));
 for(const file of f.qimenCulturalGroup.M1066_EXCLUDED_CONTEXT){f.write(file,fs.readFileSync(path.join(projectRoot,file)));try{assert.equal(inspect(f).selected.length,15);assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/unknown source path/);}finally{fs.unlinkSync(f.file(file));}}
 const value=inspect(f);assert.equal(value.externalDependencyCount,24);assert.equal(value.reverseCallerCount,16);assert.equal(value.currentStoreCompositionNewlyApproved,false);assert.equal(value.excludedContextNewlyRegistered,0);assert.equal(value.externalContextFilesNewlyRegistered,0);
});
test('cultural positions preserve unknown/source/score and no traditional or storage authority',async()=>{
 const value=inspect(await fixture());assert.equal(value.behavior.cultureMode,'project-convention-only');assert.deepEqual(value.behavior.outerPalaces,[1,2,3,4,6,7,8,9]);assert.equal(value.behavior.score,null);assert.equal(value.behavior.ranking,'input-order');assert.equal(value.behavior.scoreMutation,false);assert.equal(value.behavior.filtering,false);assert.equal(value.behavior.traditional.namePalaceMethod,'not-established');assert.equal(value.behavior.nameEffect,'not-evaluated');assert.equal(value.behavior.fourHarmRemoval,'not-performed');assert.equal(value.reviewedBaselineScope.newTenConsumed,false);assert.equal(value.reviewedBaselineScope.existingLabels,257);assert.equal(value.reviewedBaselineScope.unknownLabels,522);
 for(const key of ['formalCoverageAdded','defaultCoverageAdded'])assert.equal(value[key],0);for(const key of ['coverageRecountExecuted','wholeSourceClosureApproved','sourceBuildApproved','standardElectronOrPdfApproved','generationAuthority','automaticNameRecommendation','storageAuthority','StoreOrCASApproved','ServiceOrUIApproved','traditionalNameMethodEstablished','productionApproved','releaseApproved','outerSealsResealed'])assert.equal(value[key],false);assert.equal(value.activation,'off');
});
test('caller flags, alternate roots and linked source cannot mint review authority',async()=>{
 const f=await fixture();for(const extra of [{allowUnknown:true},{reviewApproved:true},{reviewRef:null},{profile:'caller.json'},{sourceBuildApproved:true},{standardElectronOrPdfApproved:true}])assert.throws(()=>f.qimenCulturalGroup.verifyQimenCulturalSourceRegistration({root:f.root,...extra}),/only the canonical root option/);assert.throws(()=>f.qimenCulturalGroup.verifyQimenCulturalSourceRegistration({root:projectRoot}),/canonical module checkout/);
 const file=f.qimenCulturalGroup.M1066_SOURCE_FILES[0],target=f.file(file),held=f.file('held-cultural-source.ts');fs.renameSync(target,held);fs.symlinkSync(held,target,'file');try{assert.throws(()=>inspect(f),/linked input rejected/);}finally{fs.unlinkSync(target);fs.renameSync(held,target);}
});
test('actual package metadata and empty outer approval remain independent refusals',async()=>{
 const f=await fixture();assert.throws(()=>f.normal.requireManagedOuterAdmission({root:f.root}),/current managed registry is empty or duplicated/);const actual=await fixture('actual');assert.equal(inspect(actual).selected.length,15);assert.throws(()=>actual.normal.verifyManagedSourceExtensions({root:actual.root}),/unknown or changed package projection/);const extra='src/domain/cultural-unreviewed-sixteenth.ts';f.write(extra,'export const extra=true;\n');try{assert.equal(inspect(f).selected.length,15);assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/unknown source path/);}finally{fs.unlinkSync(f.file(extra));}
});
