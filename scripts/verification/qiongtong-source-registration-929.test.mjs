import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createSourceExtensionFixture} from './source-extension-fixture-929.mjs';

const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const ownedFixtures=[];
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');

async function fixture(options={}){
 const value=await createSourceExtensionFixture({projectRoot,...options});
 ownedFixtures.push(value);return value;
}
after(async()=>{
 const errors=[];
 for(const value of ownedFixtures.reverse())try{await value.dispose();}catch(error){errors.push(error);}
 if(errors.length)throw new AggregateError(errors,'M929 source-registration fixture cleanup failed');
});

function assertNoAuthority(value){
 assert.equal(value.productionApproved,false);
 assert.equal(value.activation,'off');
 if(Object.hasOwn(value,'sourceBuildApproved'))assert.equal(value.sourceBuildApproved,false);
 if(Object.hasOwn(value,'outerSealsResealed'))assert.equal(value.outerSealsResealed,false);
}
function changedByte(bytes){
 assert.ok(bytes.length>0);const changed=Buffer.from(bytes);changed[changed.length-1]^=1;return changed;
}
function change(f,file,bytes,body){
 const original=f.read(file);f.write(file,bytes);
 try{return body();}finally{f.write(file,original);}
}
function assertProfileRejected(f,mutate){
 const file=f.group.M929_EXTENSION_PROFILE.file,value=JSON.parse(f.read(file));mutate(value);
 change(f,file,Buffer.from(JSON.stringify(value,null,2)+'\n'),()=>{
  assert.throws(()=>f.group.verifyM925QiongtongRegistration({root:f.root}),/fixed input differs/);
  assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/fixed input differs/);
 });
}

test('the actual seven postimages match only source compatibility in the known-only projection fixture',async()=>{
 const f=await fixture(),value=f.group.verifyM925QiongtongRegistration({root:f.root});
 assert.equal(value.status,'matched-m925-seven-source-postimages');
 assert.equal(value.currentReviewedPostimages,7);assert.equal(value.selected.length,7);
 assert.deepEqual(value.selected.map(row=>row.file).sort(),[...f.group.M925_DIRECT_FILES].sort());
 assert.ok(value.selected.every(row=>row.m925CurrentPostimage&&row.reviewIds.includes('M925-QIONGTONG-SOURCE')));
 assert.equal(value.supportFilesRegistered,0);assert.equal(value.historicalFixtureMaintenanceGaps,2);assertNoAuthority(value);
 const profile=JSON.parse(f.read(f.group.M929_EXTENSION_PROFILE.file));
 assert.equal(profile.productionAdmission,false);
 for(const [name,authority]of Object.entries(profile.authority))assert.ok(authority===false||authority===0,'unexpected authority: '+name);
 const normal=f.normal.verifyManagedSourceExtensions({root:f.root});
 assert.equal(normal.status,'matched-source-only');assert.equal(normal.sourceRoles.length,88);assertNoAuthority(normal);
 assert.equal(normal.sourceRoles.filter(row=>row.reviewIds.includes('M925-QIONGTONG-SOURCE')).length,7);
});

test('one real changed byte in each of the seven source files is rejected',async()=>{
 const f=await fixture();
 for(const file of f.group.M925_DIRECT_FILES)change(f,file,changedByte(f.read(file)),()=>{
  assert.throws(()=>f.group.verifyM925QiongtongRegistration({root:f.root}),/unknown bytes\/version/);
  assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/unknown bytes\/version/);
 });
 assert.equal(f.group.verifyM925QiongtongRegistration({root:f.root}).currentReviewedPostimages,7);
});

test('the full managed extension check rejects an actual eighth unreviewed source',async()=>{
 const f=await fixture(),file='src/main/m929-unreviewed-eighth.ts';
 assert.equal(fs.existsSync(f.file(file)),false);f.write(file,Buffer.from('export const unreviewedEighthSource=true;\n'));
 // The finite seven-file helper remains a bounded match; it is not the all-source gate.
 const group=f.group.verifyM925QiongtongRegistration({root:f.root});
 assert.equal(group.currentReviewedPostimages,7);assertNoAuthority(group);
 assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/unknown source path/);
});

test('replacement bytes in either original M925 evidence file are rejected',async()=>{
 const f=await fixture();
 for(const ref of[f.group.M925_REVIEW,f.group.M925_SOURCE_PINS])change(f,ref.file,changedByte(f.read(ref.file)),()=>{
  assert.throws(()=>f.group.verifyM925QiongtongRegistration({root:f.root}),/fixed input differs/);
  assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/fixed input differs/);
 });
});

test('profile expansion, third versions, borrowed Store scope and caller approval options cannot self-authorize',async()=>{
 const f=await fixture(),direct=new Set(f.group.M925_DIRECT_FILES);
 assertProfileRejected(f,profile=>{
  const row=structuredClone(profile.sourceRoles.find(item=>direct.has(item.file)));
  row.file='src/main/m929-forged-eighth.ts';row.role='m929-forged-eighth';profile.sourceRoles.push(row);
 });
 assertProfileRejected(f,profile=>{
  const row=profile.sourceRoles.find(item=>f.group.M925_PRESERVED_VERSION_PATHS.includes(item.file));
  row.versions.push({...structuredClone(row.versions.at(-1)),version:'unreviewed-third-version/1'});
 });
 assertProfileRejected(f,profile=>{
  const row=structuredClone(profile.sourceRoles.find(item=>direct.has(item.file)));
  row.file='src/main/store.ts';row.role='m929-borrowed-store';
  row.versions=row.versions.filter(version=>version.reviewIds.includes('M925-QIONGTONG-SOURCE'));
  profile.sourceRoles[profile.sourceRoles.findIndex(item=>!direct.has(item.file))]=row;
 });
 for(const extra of[{profile:'caller.json'},{approval:'caller.json'},{allowUnknown:true},{productionAdmission:true}]){
  assert.throws(()=>f.group.verifyM925QiongtongRegistration({root:f.root,...extra}),/only the canonical root option/);
  assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root,...extra}),/missing or unknown fields/);
 }
 assert.throws(()=>f.group.verifyM925QiongtongRegistration({root:projectRoot}),/canonical module checkout/);
 assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:projectRoot}),/canonical module checkout/);
});

test('all five preserved original Git postimages remain legacy versions rather than M925 current matches',async()=>{
 const f=await fixture(),profile=JSON.parse(f.read(f.group.M929_EXTENSION_PROFILE.file));
 assert.equal(f.group.M925_PRESERVED_VERSION_PATHS.length,5);
 for(const file of f.group.M925_PRESERVED_VERSION_PATHS){
  const role=profile.sourceRoles.find(row=>row.file===file),legacy=role.versions.find(version=>version.version==='source-current/1');
  assert.ok(legacy);assert.equal(legacy.reviewIds.includes('M925-QIONGTONG-SOURCE'),false);
  const original=execFileSync('git',['-C',projectRoot,'show',legacy.sourceCommit+':'+file],{windowsHide:true,maxBuffer:16*1024*1024});
  assert.equal(original.length,legacy.pin.bytes);assert.equal(sha256(original),legacy.pin.sha256);
  change(f,file,original,()=>{
   const value=f.group.verifyM925QiongtongRegistration({root:f.root}),selected=value.selected.find(row=>row.file===file);
   assert.equal(value.status,'matched-exact-preserved-source-versions');assert.equal(value.currentReviewedPostimages,6);
   assert.equal(selected.version,legacy.version);assert.equal(selected.sourceCommit,legacy.sourceCommit);
   assert.equal(selected.m925CurrentPostimage,false);assert.equal(selected.reviewIds.includes('M925-QIONGTONG-SOURCE'),false);assertNoAuthority(value);
   const normal=f.normal.verifyManagedSourceExtensions({root:f.root}),normalSelected=normal.sourceRoles.find(row=>row.file===file);
   assert.equal(normalSelected.version,legacy.version);assert.equal(normalSelected.reviewIds.includes('M925-QIONGTONG-SOURCE'),false);assertNoAuthority(normal);
  });
 }
 assert.equal(f.group.verifyM925QiongtongRegistration({root:f.root}).currentReviewedPostimages,7);
});

test('the actual 211-entry package projection still fails with only known source paths',async()=>{
 const f=await fixture({projection:'actual'}),profile=JSON.parse(f.read(f.group.M929_EXTENSION_PROFILE.file)),pkg=JSON.parse(f.read('package.json'));
 assert.equal(profile.packageProjection.legacyBuildFiles.length+profile.packageProjection.explicitAppends.length,180);
 assert.equal(pkg.build.files.length,211);
 const group=f.group.verifyM925QiongtongRegistration({root:f.root});assert.equal(group.currentReviewedPostimages,7);assertNoAuthority(group);
 assert.throws(()=>f.normal.verifyManagedSourceExtensions({root:f.root}),/unknown or changed package projection/);
});

test('a matched seven-source registration does not admit the empty managed outer registry',async()=>{
 const f=await fixture(),extensions=f.normal.verifyManagedSourceExtensions({root:f.root});
 assert.equal(extensions.status,'matched-source-only');assertNoAuthority(extensions);
 assert.throws(()=>f.normal.requireManagedOuterAdmission({root:f.root}),/current managed registry is empty or duplicated/);
});
