import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createSourceExtensionFixture} from './source-extension-fixture-929.mjs';

const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),fixtures=[];
async function fixture(projection='legacy-known-only'){const f=await createSourceExtensionFixture({projectRoot,projection});fixtures.push(f);return f;}
after(()=>{for(const f of fixtures.reverse())f.dispose();});
const inspect=f=>f.semanticGroup.verifySemanticSourceRegistration({root:f.root});
function change(f,file,transform,body){const before=f.read(file);f.write(file,transform(before));try{body();}finally{f.write(file,before);}}
const flip=bytes=>{const next=Buffer.from(bytes);next[next.length-1]^=1;return next;};

test('exact3 matches and preserves70roles/75versions/17reviews with three runtime classifications',async()=>{
 const f=await fixture(),value=inspect(f),normal=f.normal.verifyManagedSourceExtensions({root:f.root});assert.equal(value.selected.length,3);assert.equal(value.preservedSourceRoles,70);assert.equal(value.preservedSourceVersions,75);assert.equal(value.preservedReviews,17);
 assert.ok(value.selected.every(row=>row.compileScope==='main-service-bundle'&&row.verified.length&&row.limits.length&&/^[a-f0-9]{40}$/.test(row.gitBlob)));assert.deepEqual(value.selected.map(row=>row.readerClass),['pure-rule-or-rule-data','pure-rule-or-rule-data','service-fixed-source-reader']);
 assert.equal(normal.sourceRoles.length,88);assert.equal(normal.semanticRegistration.selected.length,3);assert.equal(normal.coverageRegistration.selected.length,11);assert.equal(normal.imageryRegistration.selected.length,7);assert.equal(normal.consumerRegistration.selected.length,8);assert.equal(normal.projectV132Registration.selected.length,15);assert.equal(normal.qiongtongRegistration.currentReviewedPostimages,7);
});
test('changed or missing exact3 source bytes fail instead of accepting another historical version',async()=>{
 const f=await fixture();for(const file of f.semanticGroup.M1035_SOURCE_FILES)change(f,file,flip,()=>{assert.throws(()=>inspect(f),/fixed input differs/);assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/fixed input differs/);});
 const file=f.semanticGroup.M1035_SOURCE_FILES[0],bytes=f.read(file);fs.unlinkSync(f.file(file));try{assert.throws(()=>inspect(f),/ENOENT/);assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/ENOENT/);}finally{f.write(file,bytes);}
});
test('legacy facade source cannot substitute for a current reviewed subject or become a fourth subject',async()=>{
 const f=await fixture(),legacy='src/main/naming-semantic-generation-v72.ts',base=JSON.parse(f.read(f.semanticGroup.M1035_BASELINE_PROFILE.file));assert.ok(!base.sourceRoles.some(row=>row.file===legacy));assert.equal(inspect(f).legacyFacadeRegistered,false);
 // The genuine old facade postimage is test context, never an admitted current policy postimage.
 const legacyBytes=fs.readFileSync(path.join(projectRoot,legacy));change(f,f.semanticGroup.M1035_SOURCE_FILES[0],()=>legacyBytes,()=>{assert.throws(()=>inspect(f),/fixed input differs/);assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/fixed input differs/);});
 f.write(legacy,legacyBytes);try{assert.equal(inspect(f).selected.length,3);assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/unknown source path/);}finally{fs.unlinkSync(f.file(legacy));}
});
test('missing review and altered exact review/manifest/receipt/baseline are refused',async()=>{
 const f=await fixture(),refs=[f.semanticGroup.M1025_SOURCE_REVIEW,f.semanticGroup.M1025_SOURCE_MANIFEST,f.semanticGroup.M1025_SOURCE_RECEIPT,f.semanticGroup.M1035_BASELINE_PROFILE];for(const ref of refs)change(f,ref.file,flip,()=>{assert.throws(()=>inspect(f),/fixed input differs/);assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/fixed input differs/);});
 const file=refs[0].file,bytes=f.read(file);fs.unlinkSync(f.file(file));try{assert.throws(()=>inspect(f),/ENOENT/);assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/ENOENT/);}finally{f.write(file,bytes);}
});
test('profile cannot self-repin wrong SHA/review/role, mark runtime constants type-only or borrow context',async()=>{
 const f=await fixture(),file=f.semanticGroup.M1035_EXTENSION_PROFILE.file;
 const mutations=[v=>{v.sourceRoles[70].versions[0].pin.sha256='0'.repeat(64);},v=>{v.reviews.pop();},v=>{v.reviews.at(-1).sha256='f'.repeat(64);},v=>{v.sourceRoles[70].versions[0].reviewIds=[];},v=>{v.sourceRoles[70].role='unknown-semantic';},v=>{v.sourceRoles[71].readerClass='type-contract';v.sourceRoles[71].compileScope='type-only';},v=>{v.sourceRoles[72].readerClass='type-contract-with-runtime-guard';},v=>{v.sourceRoles[70].file='src/main/naming-semantic-generation-v72.ts';},v=>{v.sourceRoles[70].file='src/main/reviewed-naming-data-generation.ts';},v=>{v.sourceRoles[0].versions[0].reviewIds.push(f.semanticGroup.M1035_REVIEW_ID);},v=>{v.sourceRoles[0].versions[0].pin.bytes++;}];
 for(const mutate of mutations)change(f,file,bytes=>{const v=JSON.parse(bytes);mutate(v);return Buffer.from(JSON.stringify(v));},()=>{assert.throws(()=>inspect(f),/fixed input differs/);assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/fixed input differs/);});
});
test('manual-reference, project-intent and pending states keep distinct zero-coverage authority',async()=>{
 const f=await fixture(),value=inspect(f);assert.equal(value.policyScope.pending[0],'叶');assert.deepEqual(value.policyScope.general,['纪','年','岁']);assert.deepEqual(value.policyScope.requiresDoubleGivenName,['纶','作','萧']);assert.equal(Object.keys(value.policyScope.explicitTheme).length,6);assert.equal(value.policyScope.currentActivation,'not-current');assert.equal(value.policyScope.scoreDelta,0);assert.equal(value.policyScope.wholeNameMeaning,null);
 assert.equal(value.reviewedCountSeparation.M1003.default521,521);assert.equal(value.reviewedCountSeparation.M1003.onRequest60,60);assert.equal(value.reviewedCountSeparation.M1003.displayUnion581,581);assert.equal(value.reviewedCountSeparation.oldCompatibilityPools.withoutThemes,524);assert.equal(value.reviewedCountSeparation.oldCompatibilityPools.allThemes,530);
 for(const key of ['manualCoverageAdded','defaultCoverageAdded','formalCoverageAdded','externalContextFilesNewlyRegistered'])assert.equal(value[key],0);for(const key of ['coverageRecountExecuted','legacyFacadeRegistered','sourceBuildApproved','wholeSourceClosureApproved','productionApproved','StoreSaveApproved','family40Approval','traditionalAuthority','releaseApproved','outerSealsResealed'])assert.equal(value[key],false);assert.equal(value.activation,'off');
});
test('caller flags, foreign root and linked source cannot supply review or authority',async()=>{
 const f=await fixture();for(const extra of [{reviewApproved:true},{allowUnknown:true},{reviewRef:null},{profile:'caller.json'},{sourceBuildApproved:true},{legacyVersion:true}])assert.throws(()=>f.semanticGroup.verifySemanticSourceRegistration({root:f.root,...extra}),/only the canonical root option/);assert.throws(()=>f.semanticGroup.verifySemanticSourceRegistration({root:projectRoot}),/canonical module checkout/);
 const file=f.semanticGroup.M1035_SOURCE_FILES[0],target=f.file(file),held=f.file('held-semantic-policy.ts');fs.renameSync(target,held);fs.symlinkSync(held,target,'file');try{assert.throws(()=>inspect(f),/linked input rejected/);}finally{fs.unlinkSync(target);fs.renameSync(held,target);}
});
test('actual package metadata and empty production registry remain independent refusals',async()=>{
 const f=await fixture();assert.throws(()=>f.normal.requireManagedOuterAdmission({root:f.root}),/current managed registry is empty or duplicated/);const actual=await fixture('actual');assert.equal(inspect(actual).selected.length,3);assert.throws(()=>actual.normal.verifyManagedSourceExtensions({root:actual.root}),/unknown or changed package projection/);const extra='src/main/semantic-unreviewed-context.ts';f.write(extra,'export const extra=true;\n');try{assert.equal(inspect(f).selected.length,3);assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/unknown source path/);}finally{fs.unlinkSync(f.file(extra));}
});
