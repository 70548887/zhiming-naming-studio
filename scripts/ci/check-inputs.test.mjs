import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {inspectCheckout} from './check-inputs.mjs';
import {RAW138_SOURCE_PROFILE_ID,RAW138_SOURCE_PROFILE_FILE} from '../verification/source-profile-138.mjs';
const profileFile='scripts/verification/'+RAW138_SOURCE_PROFILE_FILE;

function fixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'naming-ci-input-test-')),tracked=new Set();
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const put=(file,value)=>{fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),typeof value==='string'?value:JSON.stringify(value));tracked.add(file);};
  const pkg={version:'1.0.38',dependencies:{},devDependencies:{},engines:{node:'^22.12.0 || ^24.0.0 || >=26.0.0'}};
  put('package.json',pkg);put('package-lock.json',{lockfileVersion:3,version:pkg.version,packages:{'':pkg}});
  for(const file of ['scripts/verify.mjs','scripts/build-electron.mjs','scripts/verification/source-locks.mjs','scripts/verification/source-profile-138.mjs','scripts/verification/source-profile-reseal-138.mjs','scripts/verification/outer-source-admission-138.mjs','scripts/verification/source-profile-138-approvals.json','scripts/verification/review-source-profile-138-m480.json','scripts/verification/review-resources-138-m489-base.json','docs/THIRD-PARTY-NOTICES.md','data/raw/LICENSE.txt','data/raw/original.bin'])put(file,'fixture bytes\n');
  put('scripts/verification/source-lock-baseline.json',{locks:{'data/source-lock.json':'0'.repeat(64)}});
  put('data/source-lock.json',{'original.bin':{sha256:'1'.repeat(64),bytes:14}});
  put('scripts/verification/review-resources-138.json',{files:{'data/raw/LICENSE.txt':'2'.repeat(64)},sourceReaders:[]});
  const gateText='reviewed fixture bytes\n',gateFile='scripts/verification/review-receipts/ci-fixture-review.json';put(gateFile,gateText);
  const gate={file:gateFile,sha256:createHash('sha256').update(gateText).digest('hex'),bytes:Buffer.byteLength(gateText)};
  const profile={schema:'naming-review-source-profile/1',profileId:RAW138_SOURCE_PROFILE_ID,status:'ready',pendingRoles:[],approvedRoles:[{role:'fixture',sourceGate:gate}]};
  put(profileFile,profile);
  return{root,tracked,put,profile,gate,inspect:()=>inspectCheckout({root,trackedFiles:[...tracked]})};
}

test('accepts a fully contained tracked inventory without claiming fixed-source gate success',t=>{
  const f=fixture(t),result=f.inspect();assert.equal(result.status,'passed');assert.equal(result.networkRequests,0);
  assert.ok(result.inputs.some(row=>row.file==='data/raw/original.bin'&&row.tracked));
  assert.match(result.scope,/Full fixed data\/license hashes/);
});

test('rejects a required license removed from both disk and checkout index',t=>{
  const f=fixture(t);fs.unlinkSync(path.join(f.root,'data/raw/LICENSE.txt'));f.tracked.delete('data/raw/LICENSE.txt');
  const result=f.inspect();assert.equal(result.status,'failed');
  assert.ok(result.errors.some(error=>error.code==='required-input-not-tracked'&&error.file==='data/raw/LICENSE.txt'));
  assert.ok(result.errors.some(error=>error.code==='required-input-unavailable'&&error.file==='data/raw/LICENSE.txt'));
});

test('rejects a machine-local source gate even if the referenced file exists',t=>{
  const f=fixture(t),outside=fs.mkdtempSync(path.join(os.tmpdir(),'naming-ci-outside-test-'));t.after(()=>fs.rmSync(outside,{recursive:true,force:true}));
  const file=path.join(outside,'review.json');fs.writeFileSync(file,'real local review');
  f.profile.approvedRoles[0].sourceGate={...f.gate,file};f.put(profileFile,f.profile);
  const result=f.inspect();assert.equal(result.status,'failed');assert.ok(result.errors.some(error=>error.code==='source-review-ref-outside-checkout'));
});

test('rejects parent traversal and drive-relative source gate references',t=>{
  const f=fixture(t);
  for(const file of ['scripts/verification/review-receipts/../other.json','C:review.json']){
    f.profile.approvedRoles[0].sourceGate={...f.gate,file};f.put(profileFile,f.profile);
    const result=f.inspect();assert.equal(result.status,'failed');
    assert.ok(result.errors.some(error=>error.code==='source-review-ref-outside-checkout'&&error.declaredFile===file));
  }
});

test('rejects an absent or linked review receipt even when its metadata is tracked',t=>{
  const f=fixture(t),file=path.join(f.root,f.gate.file);
  fs.unlinkSync(file);let result=f.inspect();assert.equal(result.status,'failed');
  assert.ok(result.errors.some(error=>error.code==='source-review-ref-unavailable'&&error.file===f.gate.file));
  const outside=fs.mkdtempSync(path.join(os.tmpdir(),'naming-ci-review-link-'));t.after(()=>fs.rmSync(outside,{recursive:true,force:true}));
  fs.writeFileSync(path.join(outside,'review.json'),'reviewed fixture bytes\n');
  fs.symlinkSync(path.join(outside,'review.json'),file,'file');
  result=f.inspect();assert.equal(result.status,'failed');
  assert.ok(result.errors.some(error=>error.code==='source-review-ref-unavailable'&&error.file===f.gate.file&&/Reparse|symbolic/.test(error.message??'')));
});

test('rejects tampered contained review bytes and a lock root differing from package engines',t=>{
  const f=fixture(t);f.put(f.gate.file,'changed');const lock=JSON.parse(fs.readFileSync(path.join(f.root,'package-lock.json'),'utf8'));lock.packages[''].engines.node='>=18';f.put('package-lock.json',lock);
  const result=f.inspect();assert.equal(result.status,'failed');
  assert.ok(result.errors.some(error=>error.code==='source-review-ref-identity'));
  assert.ok(result.errors.some(error=>error.code==='package-lock-root-differs'&&error.field==='engines'));
});

test('rejects a symlinked original instead of reading outside the checkout',t=>{
  const f=fixture(t),outside=fs.mkdtempSync(path.join(os.tmpdir(),'naming-ci-link-test-'));t.after(()=>fs.rmSync(outside,{recursive:true,force:true}));
  const original=path.join(f.root,'data/raw/original.bin');fs.unlinkSync(original);
  // Directory junctions work on Windows without Developer Mode or elevation.
  const linked='data/linked',target=path.join(outside,'raw');fs.mkdirSync(target);fs.writeFileSync(path.join(target,'original.bin'),'outside');
  fs.symlinkSync(target,path.join(f.root,linked),process.platform==='win32'?'junction':'dir');
  f.put('data/source-lock.json',{});f.put('scripts/verification/review-resources-138.json',{files:{[linked+'/original.bin']:'3'.repeat(64)},sourceReaders:[]});f.tracked.add(linked+'/original.bin');
  const result=f.inspect();assert.equal(result.status,'failed');assert.ok(result.errors.some(error=>error.file===linked+'/original.bin'&&/Reparse|symbolic/.test(error.message??'')));
});

test('rejects conflicting fixed identities for one review path before deduplication',t=>{
 const f=fixture(t);f.profile.approvedRoles.push({role:'second-role',sourceGate:{...f.gate,sha256:'0'.repeat(64)}});f.put(profileFile,f.profile);const result=f.inspect();assert.equal(result.status,'failed');assert.ok(result.errors.some(error=>error.code==='source-review-ref-conflict'&&error.file===f.gate.file));
});
test('invalid null role returns a failed report instead of aborting report creation',t=>{
 const f=fixture(t);f.profile.approvedRoles.push(null);f.put(profileFile,f.profile);const result=f.inspect();assert.equal(result.status,'failed');assert.ok(result.errors.some(error=>error.code==='source-profile-invalid-role'));
});
