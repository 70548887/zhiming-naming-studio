import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createSourceExtensionFixture} from './source-extension-fixture-929.mjs';

const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),fixtures=[];
async function fixture(projection='legacy-known-only'){const f=await createSourceExtensionFixture({projectRoot,projection});fixtures.push(f);return f;}
after(()=>{for(const f of fixtures.reverse())f.dispose();});
const inspect=f=>f.imageryGroup.verifyImagerySourceRegistration({root:f.root});
function change(f,file,transform,body){const before=f.read(file);f.write(file,transform(before));try{body();}finally{f.write(file,before);}}
const flip=bytes=>{const next=Buffer.from(bytes);next[next.length-1]^=1;return next;};

test('the exact5+2source review matches with real type/runtime roles and bounded score/coverage interpretation',async()=>{
 const f=await fixture(),result=inspect(f);assert.equal(result.status,'matched-exact7-reviewed-imagery-source-compatibility');assert.equal(result.selected.length,7);assert.equal(result.selected.filter(row=>row.subgroup==='foundation5').length,5);assert.equal(result.selected.filter(row=>row.subgroup==='adjacent-admitted2').length,2);assert.equal(result.selected.filter(row=>row.compileScope==='type-only').length,2);
 assert.equal(result.selected.find(row=>row.file==='src/shared/m754-element-imagery-pins.ts').compileScope,'main-service-bundle');assert.ok(result.selected.every(row=>row.verified.length&&row.limits.length));
 assert.equal(result.projectedElementsEnterExistingFilteringAndTraditionalScoring,true);assert.equal(result.newScoreWeightsApproved,false);assert.equal(result.formalKnown,257);assert.equal(result.formalUnknown,522);assert.equal(result.formalCoverageAdded,0);
 assert.equal(result.externalFactoryCallSites.length,2);assert.equal(result.externalFactoryCallersReviewed,false);assert.equal(result.externalContextFilesRegistered,0);
 for(const key of ['sourceBuildApproved','productionApproved','serviceStoreApproved','uiApproved','persistenceApproved','globalDefaultEnabled','traditionalUniqueElementsApproved','releaseApproved','outerSealsResealed'])assert.equal(result[key],false);assert.equal(result.activation,'off');
 const normal=f.normal.verifyManagedSourceExtensions({root:f.root});assert.equal(normal.sourceRoles.length,88);assert.equal(normal.imageryRegistration.selected.length,7);assert.equal(normal.consumerRegistration.selected.length,8);assert.equal(normal.projectV132Registration.selected.length,15);assert.equal(normal.qiongtongRegistration.currentReviewedPostimages,7);
});
test('one changed byte in each of seven source postimages is rejected by the group and actual extension reader',async()=>{
 const f=await fixture();for(const file of f.imageryGroup.M980_SOURCE_FILES)change(f,file,flip,()=>{assert.throws(()=>inspect(f),/fixed input differs/);assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/fixed input differs/);});
});
test('a missing subject and an actual extra unreviewed source cannot silently pass the full source gate',async()=>{
 const f=await fixture(),file=f.imageryGroup.M980_SOURCE_FILES[0],bytes=f.read(file);fs.unlinkSync(f.file(file));try{assert.throws(()=>inspect(f),/ENOENT/);}finally{f.write(file,bytes);}
 const eighth='src/domain/m754-unreviewed-eighth.ts';f.write(eighth,Buffer.from('export const unreviewed=true;\n'));try{assert.equal(inspect(f).selected.length,7);assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/unknown source path/);}finally{fs.unlinkSync(f.file(eighth));}
});
test('replacing either original review artifact or expanding semantic authority is refused',async()=>{
 const f=await fixture();for(const ref of [f.imageryGroup.M975_SOURCE_REVIEW,f.imageryGroup.M975_SOURCE_MANIFEST])change(f,ref.file,flip,()=>assert.throws(()=>inspect(f),/fixed input differs/));
 change(f,f.imageryGroup.M975_SOURCE_REVIEW.file,bytes=>{const v=JSON.parse(bytes);v.rows.pop();v.authority.globalDefaultEnabled=true;v.authority.newScoreWeightsApproved=true;return Buffer.from(JSON.stringify(v));},()=>assert.throws(()=>inspect(f),/fixed input differs/));
});
test('wrong review refs, false source hashes, misplaced type/runtime classes and external factory borrowing cannot self-repin',async()=>{
 const f=await fixture(),file=f.imageryGroup.M980_EXTENSION_PROFILE.file;
 for(const mutate of [v=>{v.reviews.find(row=>row.id===f.imageryGroup.M980_REVIEW_ID).sha256='0'.repeat(64);},v=>{v.sourceRoles.at(-1).versions[0].reviewIds=[];},v=>{v.sourceRoles.at(-1).versions[0].pin.sha256='f'.repeat(64);},v=>{v.sourceRoles.find(row=>row.file==='src/shared/m754-element-imagery-pins.ts').compileScope='type-only';},v=>{v.sourceRoles.find(row=>row.file==='src/shared/m754-element-imagery.ts').compileScope='main-service-bundle';},v=>{const role=structuredClone(v.sourceRoles.at(-1));role.file='src/main/reviewed-naming-data-resources.ts';role.role='borrowed-external-factory';v.sourceRoles.push(role);}])change(f,file,bytes=>{const v=JSON.parse(bytes);mutate(v);return Buffer.from(JSON.stringify(v));},()=>assert.throws(()=>inspect(f),/fixed input differs/));
});
test('caller true flags or alternate roots/reviews do not grant source or score/default authority',async()=>{
 const f=await fixture();for(const extra of [{allowUnknown:true},{reviewApproved:true},{newScoreWeightsApproved:true},{globalDefaultEnabled:true},{reviewRef:null}])assert.throws(()=>f.imageryGroup.verifyImagerySourceRegistration({root:f.root,...extra}),/only the canonical root option/);assert.throws(()=>f.imageryGroup.verifyImagerySourceRegistration({root:projectRoot}),/canonical module checkout/);
});
test('old registrations remain matched while actual211 package and the empty outer registry continue refusing',async()=>{
 const f=await fixture();assert.equal(f.group.verifyM925QiongtongRegistration({root:f.root}).currentReviewedPostimages,7);assert.equal(f.projectGroup.verifyProjectV132SourceRegistration({root:f.root}).selected.length,15);assert.equal(f.consumerGroup.verifyConsumerSourceRegistration({root:f.root}).selected.length,8);assert.throws(()=>f.normal.requireManagedOuterAdmission({root:f.root}),/current managed registry is empty or duplicated/);
 const actual=await fixture('actual');assert.equal(inspect(actual).selected.length,7);assert.throws(()=>actual.normal.verifyManagedSourceExtensions({root:actual.root}),/unknown or changed package projection/);
});
test('a linked source cannot substitute even for byte-identical reviewed imagery source',async()=>{
 const f=await fixture(),file=f.imageryGroup.M980_SOURCE_FILES[0],target=f.file(file),held=f.file('held-reviewed-imagery-source.ts');fs.renameSync(target,held);fs.symlinkSync(held,target,'file');try{assert.throws(()=>inspect(f),/linked input rejected/);}finally{fs.unlinkSync(target);fs.renameSync(held,target);}
});
