import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {ADMISSION_PATHS,observeOuterTarget,evaluateFixtureOuterAdmission,fixtureReviewBindings,requireManagedOuterAdmission,inventoryAdmissionSubjects,verifyManagedSourceExtensions} from './outer-source-admission-138.mjs';
import {loadRaw138SourceProfile,RAW138_SOURCE_PROFILE_FILE,RAW138_SOURCE_PROFILE_SHA256} from './source-profile-138.mjs';
import {resealSourceProfile,verifyResealedSourceProfile} from './source-profile-reseal-138.mjs';

const here=path.dirname(fileURLToPath(import.meta.url)),productionRoot=path.resolve(here,'../..');
const encode=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function assertProductionRemainsClosed(body){
 const registry=JSON.parse(fs.readFileSync(path.join(productionRoot,ADMISSION_PATHS.registry),'utf8'));assert.deepEqual(registry.admissions,[]);
 let prefix=null;
 try{const result=verifyManagedSourceExtensions({root:productionRoot});assert.equal(result.status,'matched-source-only');assert.equal(result.productionApproved,false);}
 catch(error){assert.equal(error.code,'raw138-outer-admission-rejected');assert.match(error.message,/^Outer source admission: source extensions (unknown bytes\/version:|unknown source path:|unknown or changed package projection)/);prefix=error;}
 // An earlier source refusal remains a refusal for both real entrypoints.
 // If the prefix ever matches, the separately asserted empty registry still blocks.
 assert.throws(body,prefix?error=>error.code===prefix.code&&error.message===prefix.message:/one exact outer admission|current managed registry is empty or duplicated/);
}
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'m535-outer-fixture-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const put=(file,value)=>{const bytes=typeof value==='string'||Buffer.isBuffer(value)?value:encode(value),p=path.join(root,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,bytes);return{file,sha256:hash(bytes),bytes:bytes.length};};
 const ref=file=>{const bytes=fs.readFileSync(path.join(root,file));return{file,sha256:hash(bytes),bytes:bytes.length};};
 const parse=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
 const profileRaw=fs.readFileSync(path.join(here,'review-source-profile-138-m480.json')),profile=JSON.parse(profileRaw),profileRef=put('scripts/verification/review-source-profile-138-m480.json',profileRaw);
 for(const gate of new Map(profile.approvedRoles.map(row=>[row.sourceGate.file,row.sourceGate])).values())put(gate.file,fs.readFileSync(path.join(productionRoot,gate.file)));
 const original=put('data/original.json','synthetic original data\n');put('data/root-decision.json',{schema:'test-root-decision',decision:'off'});
 const readers=Array.from({length:15},(_,i)=>({file:'src/test-reader-'+String(i).padStart(2,'0')+'.ts',sha256:'1'.repeat(64)}));
 const contract={schema:'fixture-contract/1',profile:'naming-review-resources/1.0.38',applicationVersion:'1.0.38',groups:{fixture:[original.file]},files:{[original.file]:{sha256:original.sha256,bytes:original.bytes}},locks:{},sourceReaders:readers,generatedWorker:{fixture:true},rootFeedbackPublication:{fixture:true},buildOnlyUpstreamPhoneticOriginals:[],derivation:'explicit synthetic fixture',excludedNextBatch:[],limitations:['not production']};
 const baseContractRef=put('scripts/verification/review-resources-138-m489-base.json',contract);put('scripts/verification/review-resources-138.json',contract);put('package.json',{version:'1.0.38'});
 for(const row of [...profile.approvedRoles,...readers])put(row.file,'synthetic source '+row.file+'\n');
 const extra=['index.html','scripts/fixed-moe-index.d.mts','scripts/fixed-moe-index.mjs','src/domain/naming-review-v7.mjs','src/main/m393-meaning-candidate-pins.mjs','src/main/m393-meaning-candidate.mjs','src/main/m460-publication-data.d.mts','src/main/m460-publication-data.mjs','src/main/m460-publication-pins.mjs','vite.config.ts'];for(const file of extra)put(file,'synthetic extra source '+file+'\n');
 put('scripts/ci/check.mjs','synthetic CI code\n');const baseline=put('scripts/verification/source-lock-baseline.json',{synthetic:true}),verifier=put('scripts/verification/source-locks.mjs','synthetic verifier\n');
 const roles=profile.approvedRoles.map(row=>({role:row.role,file:row.file,readerRequired:row.readerRequired,sourceGate:row.sourceGate,before:{sha256:row.sha256,bytes:row.bytes},after:((r)=>({sha256:r.sha256,bytes:r.bytes}))(ref(row.file))}));
 const known=new Map(readers.map(row=>[row.file,row]));for(const row of profile.approvedRoles)known.set(row.file,row);
 const inner={schema:'naming-source-reseal-targets/1',profileId:'raw138-m489/1',applicationVersion:'1.0.38',baseProfile:profileRef,baseContract:{file:'scripts/verification/review-resources-138.json',before:{sha256:baseContractRef.sha256,bytes:baseContractRef.bytes},after:{sha256:baseContractRef.sha256,bytes:baseContractRef.bytes}},sourceLockBaseline:baseline,sourceLockVerifier:verifier,roles,sourceReaders:[...known].sort(([a],[b])=>a<b?-1:1).map(([file,row])=>({file,before:{sha256:row.sha256,...(row.bytes===undefined?{}:{bytes:row.bytes})},after:((r)=>({sha256:r.sha256,bytes:r.bytes}))(ref(file))}))};
 put(ADMISSION_PATHS.inner,inner);put(ADMISSION_PATHS.base,{schema:'test-comparison-base/1',files:inventoryAdmissionSubjects(root)});
 let target=observeOuterTarget({root,scope:'test-fixture',targetId:'M535-TEST-FIXTURE-ONLY/1'});put(ADMISSION_PATHS.outer,target);
 function resign(){target=parse(ADMISSION_PATHS.outer);const outer=ref(ADMISSION_PATHS.outer),inner=ref(ADMISSION_PATHS.inner),receipt={schema:'naming-outer-source-review/1',scope:'test-fixture',synthetic:true,decision:'TEST-FIXTURE-ONLY',targetId:target.targetId,outer,inner,approvedBindings:fixtureReviewBindings(target),reviewer:'synthetic-test-reviewer',taskId:'M535-TEST-ONLY',limitations:['test fixture; never production approval']};const receiptRef=put(ADMISSION_PATHS.receipt,receipt);put(ADMISSION_PATHS.registry,{schema:'naming-outer-source-admission-registry/1',scope:'test-fixture',admissions:[{targetId:target.targetId,outer,inner,receipt:receiptRef,reviewer:receipt.reviewer,taskId:receipt.taskId}]});}
 resign();return{root,put,ref,parse,resign,admit:()=>evaluateFixtureOuterAdmission({root,scope:'test-fixture'}),mutateTarget:mutate=>{const target=parse(ADMISSION_PATHS.outer);mutate(target);put(ADMISSION_PATHS.outer,target);resign();}};
}
test('complete synthetic19/34/12/10 subject bundle transports and round-trips only in explicit fixture scope',t=>{
 const f=fixture(t),first=f.admit();assert.equal(first.productionApproved,false);assert.equal(first.status,'test-fixture-admitted');assert.equal(first.inner.roles.length,19);assert.equal(first.inner.sourceReaders.length,34);assert.equal(Object.keys(first.target.nonSourceReaderContractFields).length,12);assert.equal(first.target.additionalSourcePins.length,10);
 const copy=fs.mkdtempSync(path.join(os.tmpdir(),'m535-fixture-roundtrip-'));t.after(()=>fs.rmSync(copy,{recursive:true,force:true}));fs.cpSync(f.root,copy,{recursive:true});const second=evaluateFixtureOuterAdmission({root:copy,scope:'test-fixture'});assert.deepEqual(second.outerRef,first.outerRef);assert.deepEqual(second.innerRef,first.innerRef);assert.equal(second.productionApproved,false);
});
test('normal source-profile entrypoint preserves the actual source refusal and empty registry, including verifySources=false',()=>{
 for(const verifySources of [true,false])assertProductionRemainsClosed(()=>loadRaw138SourceProfile({root:productionRoot,file:path.join(here,RAW138_SOURCE_PROFILE_FILE),sha256:RAW138_SOURCE_PROFILE_SHA256,verifySources}));
});
test('normal reseal entrypoint preserves source/empty-registry refusal and rejects arbitrary receipt CLI inputs',t=>{
 const out=path.join(os.tmpdir(),'m535-never-created-'+Date.now());assertProductionRemainsClosed(()=>resealSourceProfile({root:productionRoot,output:out}));assert.equal(fs.existsSync(out),false);
 const run=spawnSync(process.execPath,[path.join(here,'source-profile-reseal-138.mjs'),'seal','--root',productionRoot,'--output',out,'--approval-receipt','fake.json'],{encoding:'utf8',windowsHide:true});assert.equal(run.status,1);assert.match(run.stderr,/fixed managed inputs/);assert.equal(fs.existsSync(out),false);
});
test('production cannot select a fixture root or an injected fixture registry',t=>{const f=fixture(t);assert.throws(()=>requireManagedOuterAdmission({root:f.root}),/canonical module checkout/);assert.throws(()=>evaluateFixtureOuterAdmission({root:f.root}),/explicit test-fixture/);});
test('outer and inner mismatch is rejected even with refreshed fixture receipt references',t=>{
 const f=fixture(t),inner=f.parse(ADMISSION_PATHS.inner);inner.profileId='different-inner';f.put(ADMISSION_PATHS.inner,inner);f.resign();assert.throws(()=>f.admit(),/outer\/inner exact target mismatch/);
});
test('same inner SHA never admits changed m393 extra-source bytes',t=>{
 const f=fixture(t),inner=f.ref(ADMISSION_PATHS.inner);f.put('src/main/m393-meaning-candidate.mjs','same-inner but changed extra source\n');assert.deepEqual(f.ref(ADMISSION_PATHS.inner),inner);assert.throws(()=>f.admit(),/actual subject path\/bytes\/SHA differs/);
});
test('changed CI postimage is rejected from actual bytes',t=>{const f=fixture(t);f.put('scripts/ci/check.mjs','changed CI code\n');assert.throws(()=>f.admit(),/actual subject path\/bytes\/SHA differs/);});
test('declared role deltas are checked against actual source rather than JSON self-reports',t=>{
 const f=fixture(t),inner=f.parse(ADMISSION_PATHS.inner),file=inner.roles[0].file;inner.roles[0].after.sha256='0'.repeat(64);inner.sourceReaders.find(row=>row.file===file).after.sha256='0'.repeat(64);f.put(ADMISSION_PATHS.inner,inner);
 f.mutateTarget(target=>{target.innerTarget=f.ref(ADMISSION_PATHS.inner);target.subjectFiles[target.subjectFiles.findIndex(row=>row.file===ADMISSION_PATHS.inner)]=f.ref(ADMISSION_PATHS.inner);target.sourceRoles=inner.roles;target.effectiveSourceReaders=inner.sourceReaders;target.declaredSourceChanges.find(row=>row.file===file).after.sha256='0'.repeat(64);});assert.throws(()=>f.admit(),/actual declared source SHA differs/);
});
test('all12non-sourceReader contract fields are bound, including worker metadata',t=>{const f=fixture(t);f.mutateTarget(target=>{target.nonSourceReaderContractFields.generatedWorker.fixture=false;});assert.throws(()=>f.admit(),/all12non-sourceReader contract fields differ/);});
test('missing, subset and duplicate registries fail closed',t=>{
 for(const mutate of [r=>{delete r.admissions;},r=>{r.admissions=[];},r=>{r.admissions.push(structuredClone(r.admissions[0]));}]){const f=fixture(t),registry=f.parse(ADMISSION_PATHS.registry);mutate(registry);f.put(ADMISSION_PATHS.registry,registry);assert.throws(()=>f.admit(),/fields|registry/);}
});
test('missing, duplicate and subset reference fields fail closed',t=>{
 for(const mutate of [r=>{delete r.admissions[0].receipt.bytes;},r=>{r.admissions[0].receipt.extra=true;},r=>{r.admissions[0].outer=r.admissions[0].inner;}]){const f=fixture(t),registry=f.parse(ADMISSION_PATHS.registry);mutate(registry);f.put(ADMISSION_PATHS.registry,registry);assert.throws(()=>f.admit(),/fields|registered bytes\/SHA|arbitrary admission path/);}
});
test('receipt SHA and byte-length changes cannot be hidden by correct outer and inner IDs',t=>{
 for(const key of ['sha256','bytes']){const f=fixture(t),registry=f.parse(ADMISSION_PATHS.registry);registry.admissions[0].receipt[key]=key==='sha256'?'0'.repeat(64):1;f.put(ADMISSION_PATHS.registry,registry);assert.throws(()=>f.admit(),/receipt registered bytes\/SHA differ/);}
});
test('traversal, absolute paths and undeclared receipt locations are rejected',t=>{
 for(const file of ['../receipt.json','C:/receipt.json','/tmp/receipt.json','scripts/verification/review-receipts/other.json']){const f=fixture(t),registry=f.parse(ADMISSION_PATHS.registry);registry.admissions[0].receipt.file=file;f.put(ADMISSION_PATHS.registry,registry);assert.throws(()=>f.admit(),/safe checkout-relative path|arbitrary admission path/);}
});
test('missing/subset/duplicate extra pins and CI postimage references reject even a re-signed fixture',t=>{
 for(const mutate of [t=>t.additionalSourcePins.pop(),t=>{t.additionalSourcePins[0]=structuredClone(t.additionalSourcePins[1]);},t=>t.ciPostimages.pop(),t=>{t.ciPostimages[0]=structuredClone(t.ciPostimages[1]);}]){const f=fixture(t);f.mutateTarget(mutate);assert.throws(()=>f.admit(),/set\/count|missing, duplicate|CI actual/);}
});
test('only the three exact admission documents are detached; source/data cannot be broadly excluded',t=>{
 for(const mutate of [t=>t.detachedAdmissionInputs.pop(),t=>t.detachedAdmissionInputs.push({kind:'source',file:'src/main/store.ts'}),t=>{t.detachedAdmissionInputs[1]=t.detachedAdmissionInputs[0];}]){const f=fixture(t);f.mutateTarget(mutate);assert.throws(()=>f.admit(),/detached admission inputs/);}
 const f=fixture(t);f.put('data/root-decision.json',{schema:'test-root-decision',decision:'on'});assert.throws(()=>f.admit(),/actual subject path\/bytes\/SHA differs/);
});
test('extra source files, evidence-directory code and linked source paths are rejected',t=>{
 const f=fixture(t);f.put('src/unreviewed.mjs','new code');assert.throws(()=>f.admit(),/source freeze set\/count/);
 const g=fixture(t);g.put('verification-output/unreviewed.mjs','code cannot hide as evidence');assert.throws(()=>g.admit(),/source code is not an evidence exclusion/);
 const h=fixture(t),target=path.join(h.root,'src/main/m393-meaning-candidate.mjs');fs.unlinkSync(target);fs.symlinkSync(path.join(h.root,'index.html'),target,'file');assert.throws(()=>h.admit(),/linked subject rejected/);
});

test('legacy inner-only receipts cannot substitute for an exact outer review even with registered fixture bytes',t=>{
 const f=fixture(t);f.put(ADMISSION_PATHS.receipt,{schema:'naming-source-reseal-approval/1',decision:'APPROVED-EXACT-SOURCE-RESEAL',targetManifest:{sha256:f.ref(ADMISSION_PATHS.inner).sha256,bytes:f.ref(ADMISSION_PATHS.inner).bytes}});const registry=f.parse(ADMISSION_PATHS.registry);registry.admissions[0].receipt=f.ref(ADMISSION_PATHS.receipt);f.put(ADMISSION_PATHS.registry,registry);assert.throws(()=>f.admit(),/missing or unknown fields/);
});
test('historical inspection API explicitly reports no current production approval',()=>{
 const result=verifyResealedSourceProfile({root:productionRoot,profile:{}});assert.equal(result.scope,'historical-inner-only');assert.equal(result.productionApproved,false);
});
