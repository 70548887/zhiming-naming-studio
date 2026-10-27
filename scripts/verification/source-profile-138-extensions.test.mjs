import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createSourceExtensionFixture} from './source-extension-fixture-929.mjs';

const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const profileFile='scripts/verification/source-profile-138-extensions.json';
const profile=JSON.parse(fs.readFileSync(path.join(projectRoot,profileFile)));
const fixtures=[];

async function fixture(){
 const value=await createSourceExtensionFixture({projectRoot,projection:'legacy-known-only'});fixtures.push(value);return value;
}
test.after(()=>{for(const value of fixtures)value.dispose();});
const corrupt=b=>{const changed=Buffer.from(b);changed[changed.length-1]^=1;return changed;};

test('current fixed append-only map matches exact source bytes with no production or naming authority',async()=>{
 const f=await fixture(),value=f.normal.verifyManagedSourceExtensions({root:f.root});
 assert.equal(value.status,'matched-source-only');assert.equal(value.productionApproved,false);assert.equal(value.activation,'off');
 assert.equal(value.sourceRoles.length,88);assert.equal(value.resources.length,9);assert.equal(value.readerCompanions.length,3);
 assert.equal(value.qiongtongRegistration.currentReviewedPostimages,7);assert.equal(value.qiongtongRegistration.outerSealsResealed,false);
 assert.equal(value.readerTransitions[0].version,'reviewed-private-byte-parse-cache');
 assert.ok(value.sourceRoles.every(row=>/^[a-f0-9]{40}$/.test(row.sourceCommit)&&row.reviewIds.length));
 assert.ok(value.resources.every(row=>row.readerFiles.length));
});

test('exact historical reader pin remains supported using original published bytes, not a forged digest',async()=>{
 const f=await fixture(),original=fs.readFileSync(path.join(projectRoot,'fixtures/publication-roots/m393/src/main/m393-meaning-candidate.mjs'));
 f.write('src/main/m393-meaning-candidate.mjs',original);
 const value=f.normal.verifyManagedSourceExtensions({root:f.root});assert.equal(value.readerTransitions[0].version,'original-publication-reader');
 assert.equal(value.productionApproved,false);
});

test('unknown source-reader revision rejects instead of replacing either preserved version pin',async()=>{
 const f=await fixture(),file='src/main/m393-meaning-candidate.mjs';f.write(file,corrupt(f.read(file)));
 assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/source extensions unknown bytes\/version/);
});

test('modified or subset profile cannot self-authorize even when caller keeps reviewed metadata',async()=>{
 const f=await fixture(),changed=JSON.parse(f.read(profileFile));changed.sourceRoles.pop();f.write(profileFile,JSON.stringify(changed));
 assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/source extensions fixed input differs/);
});

test('extra profile/approval/allowUnknown caller options are rejected',async()=>{
 const f=await fixture();for(const extra of[{profile:'caller.json'},{approval:'caller.json'},{allowUnknown:true}])assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root,...extra}),/missing or unknown fields/);
});

test('one altered resource byte fails the actual managed resource check',async()=>{
 const f=await fixture(),file=profile.resources[0].file;f.write(file,corrupt(f.read(file)));
 assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/source extensions unknown bytes\/version/);
});

test('a new unreviewed source path fails while historical source paths remain explicitly separate',async()=>{
 const f=await fixture();f.write('src/main/unreviewed-future.mjs','export const future=true;\n');
 assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/source extensions unknown source path/);
});

test('known source role and its exact reader companion are both authenticated',async()=>{
 for(const file of[profile.sourceRoles[0].file,profile.readerCompanions[0].file]){const f=await fixture();f.write(file,corrupt(f.read(file)));assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/source extensions unknown bytes\/version/);}
});

test('original bounded review bytes are required; altered decision does not become admission',async()=>{
 const f=await fixture(),file=profile.reviews.find(row=>row.id==='M598-root').file;f.write(file,corrupt(f.read(file)));
 assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/source extensions fixed input differs/);
});

test('unknown package addition and omission of a required appended resource are rejected',async()=>{
 for(const kind of['extra','missing']){const f=await fixture(),pkg=JSON.parse(f.read('package.json'));if(kind==='extra')pkg.build.files.push('data/unreviewed-future.json');else pkg.build.files=pkg.build.files.filter(file=>file!==profile.resources[0].file);f.write('package.json',JSON.stringify(pkg));assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/source extensions unknown or changed package projection/);}
});

test('the historical137 contract is not silently rewritten by the extension layer',async()=>{
 const f=await fixture(),file='scripts/verification/review-resources-138.json';f.write(file,corrupt(f.read(file)));
 assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/source extensions may not rewrite the historical137 contract/);
});

test('actual normal source-profile loader consumes the map and rejects before publication/admission',async()=>{
 const f=await fixture(),file=profile.resources[0].file;f.write(file,corrupt(f.read(file)));
 const normal=await import(pathToFileURL(f.file('scripts/verification/source-profile-138.mjs')).href);
 assert.throws(()=>normal.loadRaw138SourceProfile({root:f.root,file:f.file('scripts/verification/'+normal.RAW138_SOURCE_PROFILE_FILE),sha256:normal.RAW138_SOURCE_PROFILE_SHA256}),/source extensions unknown bytes\/version/);
});

test('direct production admission also consumes the map and never treats a matched map as approval',async()=>{
 const f=await fixture();assert.throws(()=>f.normal.requireManagedOuterAdmission({root:f.root}),/current managed registry is empty or duplicated/);
 const file=profile.sourceRoles[0].file;f.write(file,corrupt(f.read(file)));
 assert.throws(()=>f.normal.requireManagedOuterAdmission({root:f.root}),/source extensions unknown bytes\/version/);
});

test('actual normal payload prefix rejects a missing appended resource before any full source gate',async()=>{
 const f=await fixture(),payload=path.join(f.root,'owned-payload');fs.mkdirSync(payload);
 for(const row of profile.resources.slice(1)){const p=path.join(payload,row.file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.copyFileSync(f.file(row.file),p);}
 const normal=await import(pathToFileURL(f.file('scripts/verification/review-resources.mjs')).href);
 const result=await normal.verifyReviewResources({root:f.root,payloadRoot:payload,stage:'runtime-payload'});
 assert.equal(result.status,'failed');assert.equal(result.loaderChecks.length,0);assert.equal(result.summary.historicalRequiredFiles,137);
 assert.equal(result.resources.length,9);assert.ok(result.errors.some(row=>row.check==='extension-resource-read'&&row.file===profile.resources[0].file));
 assert.match(result.scope,/production admission and historical resource gates were not run/);
});

test('actual normal profile failure reports matched extensions without calling them an admission',async()=>{
 const f=await fixture(),normal=await import(pathToFileURL(f.file('scripts/verification/review-resources.mjs')).href);
 const result=await normal.verifyReviewResources({root:f.root,stage:'source-prebuild'});
 fs.writeFileSync(f.file('normal-prefix-result.json'),JSON.stringify(result,null,2)+'\n');
 // This owned fixture deliberately omits the publication originals; its normal
 // publication/source profile cannot be admitted. Only the9extension bytes ran.
 assert.equal(result.status,'failed');assert.equal(result.sourceProfile.status,'not-admitted');
 assert.equal(result.sourceExtensions.status,'matched-source-only');assert.equal(result.sourceExtensions.productionApproved,false);
 assert.equal(result.summary.historicalRequiredFiles,137);assert.equal(result.summary.extensionResourceFiles,9);
 assert.equal(result.summary.requiredFiles,146);assert.equal(result.summary.filesIntegrityPassed,9);assert.equal(result.summary.packageCovered,9);
 assert.equal(result.loaderChecks.length,0);assert.equal(result.resources.length,9);
});
