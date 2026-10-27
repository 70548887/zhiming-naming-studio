import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {inventorySourceTargets,changedSourceTargets,safeRelative,resealSourceProfile,validateResealApproval} from './source-profile-reseal-138.mjs';
import {loadRaw138SourceProfile,RAW138_SOURCE_PROFILE_SHA256} from './source-profile-138.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const encoded=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const raw=value=>{const bytes=encoded(value);return{bytes,sha256:hash(bytes),size:bytes.length};};
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'m489-source-reseal-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const put=(file,bytes)=>{const p=path.join(root,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,typeof bytes==='string'||Buffer.isBuffer(bytes)?bytes:encoded(bytes));return p;};
 const profile=JSON.parse(fs.readFileSync(path.join(here,'review-source-profile-138-m480.json'),'utf8'));
 const contract=JSON.parse(fs.readFileSync(path.join(here,'review-resources-138-m489-base.json'),'utf8'));
 put('package.json',{version:'1.0.38'});put('scripts/verification/review-resources-138.json',fs.readFileSync(path.join(here,'review-resources-138-m489-base.json')));put('scripts/verification/source-lock-baseline.json',{fixture:true});put('scripts/verification/source-locks.mjs','synthetic verifier fixture\n');
 for(const row of [...profile.approvedRoles,...contract.sourceReaders])put(row.file,'synthetic source fixture: '+row.file+'\n');
 const target=inventorySourceTargets({root}),targetRaw=raw(target),targetFile=put('target.json',targetRaw.bytes);
 // This explicit synthetic receipt is never written into the production registry.
 const receipt={schema:'naming-source-reseal-approval/1',taskId:'TEST-ONLY',reviewer:'synthetic-fixture',independent:true,synthetic:true,decision:'APPROVED-EXACT-SOURCE-RESEAL',targetManifest:{sha256:targetRaw.sha256,bytes:targetRaw.size},approvedChanges:changedSourceTargets(target),sourceLockBaseline:target.sourceLockBaseline,limitations:['unit fixture; no production approval']};
 const receiptRaw=raw(receipt),approvalFile=put('synthetic-receipt.json',receiptRaw.bytes);
 const trustedRegistry={schema:'naming-source-reseal-approval-registry/1',profileId:'raw138-m489/1',trustedReceipts:[{file:'scripts/verification/review-receipts/synthetic-test-only.json',sha256:receiptRaw.sha256,bytes:receiptRaw.size,taskId:receipt.taskId,reviewer:receipt.reviewer,targetManifestSha256:targetRaw.sha256}]};
 return{root,put,target,targetRaw,targetFile,receipt,receiptRaw,approvalFile,trustedRegistry,validate:()=>validateResealApproval({target,targetRaw,receipt,receiptRaw,trustedRegistry}),seal:(extra={})=>resealSourceProfile({root,output:path.join(root,'production-output'),...extra})};
}
test('inventory enumerates all 19 roles and the full reader closure without approving observations',t=>{
 const f=fixture(t);assert.equal(f.target.roles.length,19);assert.equal(f.target.sourceReaders.length,34);assert.ok(changedSourceTargets(f.target).some(row=>row.file==='src/main/naming-editorial-v7-data.ts'));assert.equal(fs.existsSync(path.join(f.root,'production-output')),false);
});
test('missing registered approval rejects production output even with an exact observed inventory',t=>{
 const f=fixture(t);assert.throws(()=>f.seal(),/canonical module checkout/);assert.equal(fs.existsSync(path.join(f.root,'production-output')),false);
});
test('synthetic fixture receipt is rejected even if a test trust list contains its exact hash',t=>{
 const f=fixture(t);assert.throws(()=>f.validate(),/fixture\/synthetic receipts are rejected/);
});
test('wrong declared target or approval SHA is rejected before creating output',t=>{
 const f=fixture(t);assert.throws(()=>f.seal({targetSha256:'0'.repeat(64)}),/only managed root\/output options/);assert.throws(()=>f.seal({approvalSha256:'0'.repeat(64)}),/only managed root\/output options/);assert.equal(fs.existsSync(path.join(f.root,'production-output')),false);
});
test('unknown role and reader targets reject rather than being ignored',t=>{
 const f=fixture(t);f.target.roles[0].role='unknown-target';assert.throws(()=>f.validate(),/unknown or reordered role target/);
 const g=fixture(t);g.target.sourceReaders[0].file='src/unreviewed.ts';assert.throws(()=>g.validate(),/unknown source-reader target/);
});
test('absolute, drive, traversal and poisoned relative targets are rejected',()=>{
 for(const file of ['/tmp/a','C:/a','C:a','src/../a','src\\a','src//a','src/./a','src/__proto__/a','../a'])assert.throws(()=>safeRelative(file),/safe relative path required/);
 assert.equal(safeRelative('src/main/store.ts'),'src/main/store.ts');
});
test('changed source bytes after inventory are observed and cannot use an unrelated production registry',t=>{
 const f=fixture(t);f.put(f.target.roles[0].file,'changed after inventory');assert.notDeepEqual(inventorySourceTargets({root:f.root}),f.target);assert.throws(()=>f.seal(),/canonical module checkout/);assert.equal(fs.existsSync(path.join(f.root,'production-output')),false);
});
test('new resource payload identity cannot enter through a source reseal',t=>{
 const f=fixture(t),contract=JSON.parse(fs.readFileSync(path.join(f.root,'scripts/verification/review-resources-138.json'),'utf8'));contract.files[Object.keys(contract.files)[0]].sha256='0'.repeat(64);f.put('scripts/verification/review-resources-138.json',contract);assert.throws(()=>inventorySourceTargets({root:f.root}),/payload membership\/identity changes/);
});
test('source and selected-root links are rejected before authenticated reads',t=>{
 const f=fixture(t),outside=fs.mkdtempSync(path.join(os.tmpdir(),'m489-link-outside-'));t.after(()=>fs.rmSync(outside,{recursive:true,force:true}));
 fs.writeFileSync(path.join(outside,'main.ts'),'outside bytes');const file=path.join(f.root,'src/main/main.ts');fs.unlinkSync(file);fs.symlinkSync(path.join(outside,'main.ts'),file,'file');assert.throws(()=>inventorySourceTargets({root:f.root}),/linked path rejected/);
 const g=fixture(t),link=path.join(outside,'linked-root');fs.symlinkSync(g.root,link,process.platform==='win32'?'junction':'dir');assert.throws(()=>inventorySourceTargets({root:link}),/linked path rejected/);
});
test('future app versions cannot silently select this profile',t=>{
 const f=fixture(t);f.put('package.json',{version:'1.0.39'});assert.throws(()=>inventorySourceTargets({root:f.root}),/unknown target application version/);
});
test('unknown CLI options fail before writing a target inventory',t=>{
 const f=fixture(t),output=path.join(f.root,'unknown-option-output.json');const result=spawnSync(process.execPath,[path.join(here,'source-profile-reseal-138.mjs'),'inventory','--root',f.root,'--output',output,'--unknown','value'],{encoding:'utf8',windowsHide:true});assert.equal(result.status,1);assert.match(result.stderr,/inventory uses/);assert.equal(fs.existsSync(output),false);
});
test('a sealed profile file outside the selected checkout is rejected by the exported loader',t=>{
 const f=fixture(t);assert.throws(()=>loadRaw138SourceProfile({root:f.root,file:path.join(here,'review-source-profile-138-m480.json'),sha256:RAW138_SOURCE_PROFILE_SHA256}),/profile must be the selected checkout fixed path/);
});

test('worker, lock and schema fields require resource approval rather than source reseal',t=>{
 for(const mutate of [c=>{c.schema='unknown-schema';},c=>{c.generatedWorker.outputFile='data/unknown-worker.js';},c=>{c.generatedWorker.inputFiles={};},c=>{c.generatedWorker.requiredTokens=[];},c=>{c.locks.elements.sha256='0'.repeat(64);}]){
  const f=fixture(t),contract=JSON.parse(fs.readFileSync(path.join(f.root,'scripts/verification/review-resources-138.json'),'utf8'));mutate(contract);f.put('scripts/verification/review-resources-138.json',contract);assert.throws(()=>inventorySourceTargets({root:f.root}),/non-source contract fields/);
 }
});
test('source reader metadata and null readers cannot enter the known closure',t=>{
 const f=fixture(t),file='scripts/verification/review-resources-138.json',contract=JSON.parse(fs.readFileSync(path.join(f.root,file),'utf8'));contract.sourceReaders[0].unreviewed=true;f.put(file,contract);assert.throws(()=>inventorySourceTargets({root:f.root}),/unknown source-reader metadata/);contract.sourceReaders[0]=null;f.put(file,contract);assert.throws(()=>inventorySourceTargets({root:f.root}),/unknown source-reader target/);
});
