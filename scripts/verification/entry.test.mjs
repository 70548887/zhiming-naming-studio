import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {parseVerificationArguments,assertLockfile,verificationPlan} from '../verify.mjs';

test('verification entry preserves strict profile and dedicated-output boundaries',()=>{
  assert.throws(()=>parseVerificationArguments(['--profile','unknown']));
  assert.throws(()=>parseVerificationArguments(['--profile']));
  assert.throws(()=>parseVerificationArguments(['--unexpected']));
  assert.throws(()=>parseVerificationArguments(['--root','C:/project','--output','C:/project/data']));
  assert.equal(parseVerificationArguments(['--profile','source','--dry-run']).dryRun,true);
});
test('lock validation rejects changed root dependencies and package version rather than npm-installing them',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'studio-lock-test-'));
  try{
    const pkg={version:'9.1.0',dependencies:{a:'1.2.3'},devDependencies:{b:'4.5.6'},engines:{node:'>=22'}};
    fs.writeFileSync(path.join(root,'package.json'),JSON.stringify(pkg));const lock={version:pkg.version,lockfileVersion:3,packages:{'':structuredClone(pkg)}};
    const write=()=>fs.writeFileSync(path.join(root,'package-lock.json'),JSON.stringify(lock));write();assert.equal(assertLockfile(root).version,'9.1.0');
    lock.packages[''].dependencies.a='9.0.0';write();assert.throws(()=>assertLockfile(root),/dependencies/);
    lock.version='9.2.0';write();assert.throws(()=>assertLockfile(root),/versions/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('CI plan contains no installer, native application, external service or local historical helper',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'studio-ci-plan-'));
  try{
    const scriptDirectory=path.join(root,'scripts');fs.mkdirSync(path.join(scriptDirectory,'verification'),{recursive:true});fs.writeFileSync(path.join(scriptDirectory,'verification','entry.test.mjs'),'');
    const options={root,output:path.join(root,'verification-output'),profile:'ci'},plan=verificationPlan(options,scriptDirectory),text=JSON.stringify(plan);
    assert.equal(plan.some(step=>step.id==='full-regression'),true);assert.equal(plan.some(step=>step.id==='electron-production-build'),true);
    assert.equal(text.includes('.local'),false);assert.equal(text.includes('http'),false);assert.equal(text.includes('electron.exe'),false);assert.equal(text.includes('electron-builder'),false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('capacity entry uses the real bounded synthetic benchmark interface',()=>{
  const root=path.resolve('C:/project'),output=path.join(root,'verification-output'),plan=verificationPlan({root,output,profile:'capacity'});
  assert.equal(plan.length,1);assert.equal(plan[0].args.includes('--project='+root),true);assert.equal(plan[0].args.includes('--owned-root='+output),true);assert.equal(plan[0].args.includes('--profiles=100'),true);assert.equal(plan[0].args.includes('--sessions=100'),true);assert.equal(plan[0].args.includes('--timeout-ms=180000'),true);
});
