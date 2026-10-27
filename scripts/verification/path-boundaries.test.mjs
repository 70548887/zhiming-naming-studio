import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {newEvidencePath,safeInput,safeRelativeInput,reserveEvidenceDirectory,writeNewJson} from './safe-paths.mjs';
import {verifySourceLocks} from './source-locks.mjs';
import {sha256} from './common.mjs';
import {runVerification,parseVerificationArguments} from '../verify.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
function fixture(t){
  const root=fs.mkdtempSync(path.join(here,'.boundary-test-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const write=(file,value)=>{fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),typeof value==='string'?value:JSON.stringify(value));};
  const pkg={version:'1.0.34',dependencies:{},devDependencies:{},engines:{},build:{files:['data/**/*','dependency-alias/**/*']}};
  write('package.json',pkg);write('package-lock.json',{version:pkg.version,lockfileVersion:3,packages:{'':pkg}});
  write('docs/CURRENT-STATUS.md','## 已交付：1.0.34\n[验收](../release/NamingStudio-1.0.34-verification.json)\n最近一次已交付版本的完整回归为 **192 个测试文件、2343 项通过**\n');
  return{root,write};
}
test('audited check-status CLI output cannot replace package input bytes',t=>{
  const f=fixture(t),input=path.join(f.root,'package.json'),before=fs.readFileSync(input);
  const run=spawnSync(process.execPath,[path.join(here,'check-status.mjs'),'--root',f.root,'--output',input],{encoding:'utf8'});
  assert.notEqual(run.status,0);assert.deepEqual(fs.readFileSync(input),before);assert.match(run.stderr,/protected|evidence|output/i);
});
test('audited release CLI output cannot replace existing external evidence or formal release JSON',t=>{
  const f=fixture(t),file='release/NamingStudio-1.0.34-verification.json';f.write(file,{sentinel:'keep-this-original'});const before=fs.readFileSync(path.join(f.root,file));
  const run=spawnSync(process.execPath,[path.join(here,'release.mjs'),'--root',f.root,'--output',path.join(f.root,file)],{encoding:'utf8'});
  assert.notEqual(run.status,0);assert.deepEqual(fs.readFileSync(path.join(f.root,file)),before);
  const output=path.join(f.root,'verification-output','prior.json');f.write('verification-output/prior.json',{sentinel:'earlier-evidence'});
  assert.throws(()=>writeNewJson(f.root,output,{changed:true}),/exists/);assert.match(fs.readFileSync(output,'utf8'),/earlier-evidence/);
});
test('audited wrapper rejects a top-level evidence junction into src before creating any files',t=>{
  const f=fixture(t),target=path.join(f.root,'src','empty-output'),alias=path.join(f.root,'.local','evidence-alias');fs.mkdirSync(target,{recursive:true});fs.mkdirSync(path.dirname(alias));fs.symlinkSync(target,alias,process.platform==='win32'?'junction':'dir');
  assert.throws(()=>parseVerificationArguments(['--root',f.root,'--profile','release','--output',alias]),/reparse|symbolic|realpath/i);
  assert.throws(()=>runVerification({root:f.root,profile:'release',output:alias}),/reparse|symbolic|realpath/i);
  assert.deepEqual(fs.readdirSync(target),[]);
});
test('audited Windows uppercase SRC and DOCS paths never become evidence roots',t=>{
  const f=fixture(t);
  for(const folder of ['SRC','src','DaTa','DOCS','Release','NODE_MODULES','scripts','.GiT'])assert.throws(()=>newEvidencePath(f.root,path.join(f.root,folder,'new-evidence')),/evidence|protected/i);
});
test('audited matching-byte source dependency junction escaping root is rejected',async t=>{
  const f=fixture(t),external=fs.mkdtempSync(path.join(here,'.external-source-'));t.after(()=>fs.rmSync(external,{recursive:true,force:true}));fs.writeFileSync(path.join(external,'original.txt'),'same-fixed-bytes');
  fs.symlinkSync(external,path.join(f.root,'dependency-alias'),process.platform==='win32'?'junction':'dir');
  const file='dependency-alias/original.txt',fileHashes={[file]:sha256('same-fixed-bytes')},source={id:'fixture',files:[file],fileHashes,sha256:sha256(JSON.stringify(fileHashes))},lock={version:'fixture/1',hashConvention:'sha256(JSON.stringify(fileHashes)); sorted relative path keys',sources:[source]};
  f.write('data/audit-source-lock.json',lock);const baseline={locks:{'data/audit-source-lock.json':sha256(fs.readFileSync(path.join(f.root,'data/audit-source-lock.json')))}};
  const result=await verifySourceLocks({root:f.root,baseline});assert.equal(result.status,'failed');assert(result.errors.some(error=>/reparse|symbolic|realpath/i.test(error.message??'')));
  assert.throws(()=>safeRelativeInput(f.root,file),/reparse|symbolic|realpath/i);
});
test('nested evidence ancestors are checked and a fresh ordinary output commits without overwrite',t=>{
  const f=fixture(t),directory=path.join(f.root,'verification-output','new-run');reserveEvidenceDirectory(f.root,directory);
  const file=path.join(directory,'report.json');writeNewJson(f.root,file,{status:'passed',scope:'unit-fixture'});assert.equal(JSON.parse(fs.readFileSync(file,'utf8')).scope,'unit-fixture');assert.throws(()=>writeNewJson(f.root,file,{status:'failed'}),/exists/);
  const alias=path.join(directory,'nested-alias');fs.symlinkSync(path.join(f.root,'docs'),alias,process.platform==='win32'?'junction':'dir');assert.throws(()=>newEvidencePath(f.root,path.join(alias,'out.json')),/reparse|symbolic|realpath/i);assert.equal(fs.existsSync(path.join(f.root,'docs/out.json')),false);
});
test('declared external paths are rejected before probing their filesystem metadata',t=>{
  const f=fixture(t),outside=path.resolve(f.root,'..','untrusted-external-input'),original=fs.lstatSync,probed=[];
  fs.lstatSync=function(file,...args){probed.push(path.resolve(file));return original.call(this,file,...args);};
  try{assert.throws(()=>safeInput(f.root,outside),/escapes/);assert.throws(()=>newEvidencePath(f.root,outside),/inside/);}finally{fs.lstatSync=original;}
  assert.equal(probed.some(file=>file===outside),false);
});
