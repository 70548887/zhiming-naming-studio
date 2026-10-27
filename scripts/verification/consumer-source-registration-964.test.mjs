import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createSourceExtensionFixture} from './source-extension-fixture-929.mjs';

const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),owned=[];
async function fixture(projection='legacy-known-only'){const f=await createSourceExtensionFixture({projectRoot,projection});owned.push(f);return f;}
after(()=>{for(const f of owned.reverse())f.dispose();});
const check=f=>f.consumerGroup.verifyConsumerSourceRegistration({root:f.root});
function change(f,file,transform,body){const bytes=f.read(file);f.write(file,transform(bytes));try{body();}finally{f.write(file,bytes);}}
const flip=bytes=>{const changed=Buffer.from(bytes);changed[changed.length-1]^=1;return changed;};

test('the original M957 review binds exact6foundation+2support without CJS/build/Store authority',async()=>{
 const f=await fixture(),result=check(f);assert.equal(result.status,'matched-exact8-reviewed-source-compatibility');assert.equal(result.selected.length,8);assert.equal(result.selected.filter(row=>row.subgroup==='consumer-foundation').length,6);assert.equal(result.selected.filter(row=>row.subgroup==='current-direct-support').length,2);assert.ok(result.selected.every(row=>row.judgment==='pass-bounded-source-review'&&row.rationale&&row.limits));
 assert.ok(result.selected.every(row=>row.compileScope==='main-service-bundle'));assert.equal(result.selected.filter(row=>row.readerClass==='service-fixed-source-reader').length,3);
 for(const key of ['externalContextFilesRegistered','oldE01Or906IdentityChanged','sourceBuildApproved','productionApproved','StoreSaveAuthority','wholeClosureApproved','outerSealsResealed'])assert.equal(result[key],key==='externalContextFilesRegistered'?0:false);assert.equal(result.activation,'off');assert.equal(result.traditionalStatus,'unknown');
 const normal=f.normal.verifyManagedSourceExtensions({root:f.root});assert.equal(normal.sourceRoles.length,88);assert.equal(normal.consumerRegistration.selected.length,8);assert.equal(normal.projectV132Registration.selected.length,15);assert.equal(normal.qiongtongRegistration.currentReviewedPostimages,7);assert.equal(normal.productionApproved,false);
});
test('a real single byte changed in each of the eight current postimages is refused',async()=>{
 const f=await fixture();for(const file of f.consumerGroup.M964_SOURCE_FILES)change(f,file,flip,()=>{assert.throws(()=>check(f),/fixed input differs/);assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/fixed input differs/);});
});
test('a missing source or actual ninth unknown source cannot become an accepted group',async()=>{
 const f=await fixture(),file=f.consumerGroup.M964_SOURCE_FILES[0],target=f.file(file),bytes=f.read(file);fs.unlinkSync(target);try{assert.throws(()=>check(f),/ENOENT/);}finally{f.write(file,bytes);}
 const ninth='src/domain/consumer-unreviewed-ninth.ts';f.write(ninth,Buffer.from('export const ninth=true;\n'));try{assert.equal(check(f).selected.length,8);assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/unknown source path/);}finally{fs.unlinkSync(f.file(ninth));}
});
test('original review and sealed manifest replacements or scope changes are rejected',async()=>{
 const f=await fixture();for(const ref of [f.consumerGroup.M957_SOURCE_REVIEW,f.consumerGroup.M957_SOURCE_MANIFEST])change(f,ref.file,flip,()=>assert.throws(()=>check(f),/fixed input differs/));
 change(f,f.consumerGroup.M957_SOURCE_REVIEW.file,bytes=>{const v=JSON.parse(bytes);v.files.pop();v.authority.StoreSaveAuthority=true;return Buffer.from(JSON.stringify(v));},()=>assert.throws(()=>check(f),/fixed input differs/));
});
test('wrong review ref, false hash, a ninth context role or wrong compilation class cannot self-repin',async()=>{
 const f=await fixture(),file=f.consumerGroup.M964_EXTENSION_PROFILE.file;
 for(const mutate of [v=>{v.reviews.find(r=>r.id===f.consumerGroup.M964_REVIEW_ID).sha256='0'.repeat(64);},v=>{v.sourceRoles.find(r=>r.versions.some(s=>s.reviewIds.includes(f.consumerGroup.M964_REVIEW_ID))).versions[0].reviewIds=[];},v=>{const r=structuredClone(v.sourceRoles.at(-1));r.file='src/domain/naming.ts';r.role='borrowed-naming-context';v.sourceRoles.push(r);},v=>{v.sourceRoles.at(-1).versions[0].pin.sha256='f'.repeat(64);},v=>{v.sourceRoles.find(r=>r.file==='src/shared/candidate2-naming-consumer-v1.ts').compileScope='type-only';}])change(f,file,bytes=>{const v=JSON.parse(bytes);mutate(v);return Buffer.from(JSON.stringify(v));},()=>assert.throws(()=>check(f),/fixed input differs/));
});
test('caller approval flags, substituted reviews and a foreign root do not affect selection',async()=>{
 const f=await fixture();for(const extra of [{allowUnknown:true},{reviewApproved:true},{reviewRef:null},{sourceCommit:'caller'},{productionAdmission:true}])assert.throws(()=>f.consumerGroup.verifyConsumerSourceRegistration({root:f.root,...extra}),/only the canonical root option/);assert.throws(()=>f.consumerGroup.verifyConsumerSourceRegistration({root:projectRoot}),/canonical module checkout/);
});
test('old seven and fifteen registrations remain exact while actual211projection and outerempty still block',async()=>{
 const f=await fixture();assert.equal(f.group.verifyM925QiongtongRegistration({root:f.root}).currentReviewedPostimages,7);assert.equal(f.projectGroup.verifyProjectV132SourceRegistration({root:f.root}).selected.length,15);assert.throws(()=>f.normal.requireManagedOuterAdmission({root:f.root}),/current managed registry is empty or duplicated/);
 const actual=await fixture('actual');assert.equal(check(actual).selected.length,8);assert.throws(()=>actual.normal.verifyManagedSourceExtensions({root:actual.root}),/unknown or changed package projection/);
});
test('source junction substitution is refused before a postimage can be claimed',async()=>{
 const f=await fixture(),file=f.consumerGroup.M964_SOURCE_FILES[0],target=f.file(file),held=f.file('owned-source-holder.ts');fs.renameSync(target,held);fs.symlinkSync(held,target,'file');try{assert.throws(()=>check(f),/linked input rejected/);}finally{fs.unlinkSync(target);fs.renameSync(held,target);}
});
