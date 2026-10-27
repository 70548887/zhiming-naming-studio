import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';

const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const candidateFile='scripts/verification/extension-evidence/m940/project-v132-correspondence-candidate.json';
const helperFile='scripts/verification/project-v132-source-group-940.mjs';
const candidate=JSON.parse(fs.readFileSync(path.join(project,candidateFile),'utf8'));
const parent=fs.realpathSync.native(os.tmpdir());let root,group;
before(async()=>{
 root=fs.realpathSync.native(fs.mkdtempSync(path.join(parent,'m940-project-v132-fs-')));
 const files=[candidateFile,helperFile,candidate.manifest.file,candidate.manifestCopy.file,candidate.buildPins.file,...candidate.mapped.flatMap(row=>[row.sourceFile,row.resourceFile]),...candidate.companions.map(row=>row.file),...candidate.priorEvidence.map(row=>row.file)];
 for(const file of new Set(files)){const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(project,file),target);}
 group=await import(pathToFileURL(path.join(root,helperFile)).href);
});
after(()=>{
 if(!root)return;const resolved=fs.realpathSync.native(root);assert.equal(path.dirname(resolved),parent);assert.equal(resolved,root);assert.ok(path.basename(root).startsWith('m940-project-v132-fs-'));assert.equal(fs.lstatSync(root).isSymbolicLink(),false);fs.rmSync(root,{recursive:true,force:false});
});
const inspect=()=>group.inspectProjectV132SourceGroup({root});
function changed(file,transform,body){const target=path.join(root,file),original=fs.readFileSync(target);fs.writeFileSync(target,transform(original));try{body();}finally{fs.writeFileSync(target,original);}}
const flip=bytes=>{const next=Buffer.from(bytes);next[next.length-1]^=1;return next;};
function absent(file,body){const target=path.join(root,file),held=target+'.held';fs.renameSync(target,held);try{body();}finally{fs.renameSync(held,target);}}

test('actual15-file bytes form exact10published+5source-only roles without registration',()=>{
 const result=inspect();assert.equal(result.status,'matched-fixed-group-bytes-source-review-pending');assert.equal(result.sourceFiles,15);assert.deepEqual(result.publishedCorrespondence,{matched:10,execution:9,resolution:1});assert.equal(result.sourceOnlyCompanions,5);
 assert.equal(result.selected.length,10);assert.equal(result.companions.length,5);assert.ok(result.companions.every(row=>row.executionAssetCounterpart===null&&row.reviewRef===null&&row.registrationAllowed===false));
 for(const key of ['registrationAllowed','sourceBuildApproved','productionAdmission','activeGateModified','fullApplicationClosureVerified'])assert.equal(result[key],false);
 assert.equal(result.activation,'off');assert.equal(result.traditionalConclusion,'unknown');assert.equal(result.methodScope,'project-proposal-only');assert.equal(result.scoreChange,0);
 assert.equal(result.priorPublicationMatches.length,10);assert.ok(result.priorPublicationMatches.every(row=>row.sourceReviewGranted===false));
});
test('the registration entrypoint refuses publication integrity without exact15source-review refs',()=>{
 assert.throws(()=>group.requireProjectV132SourceRegistration({root}),/registration pending: exact independent review references/);
});
test('one changed byte in each root published source is rejected',()=>{
 for(const row of candidate.mapped)changed(row.sourceFile,flip,()=>assert.throws(inspect,/fixed bytes differ/));
});
test('one changed byte in each published asset counterpart is rejected',()=>{
 for(const row of candidate.mapped)changed(row.resourceFile,flip,()=>assert.throws(inspect,/fixed bytes differ/));
});
test('type-only, notice and both license companions have exact independent byte requirements',()=>{
 for(const row of candidate.companions)changed(row.file,flip,()=>assert.throws(inspect,/fixed bytes differ/));
});
test('omitting a root source or one published counterpart rejects the complete path set',()=>{
 absent(candidate.mapped[0].sourceFile,()=>assert.throws(inspect,/missing, duplicate or extra/));
 absent(candidate.mapped[0].resourceFile,()=>assert.throws(inspect,/missing, duplicate or extra/));
});
test('omitting a companion does not silently collapse15source files to10execution mappings',()=>{
 absent(candidate.companions[0].file,()=>assert.throws(inspect,/missing, duplicate or extra/));
});
test('an actual extra root source and an actual extra publication source are each rejected',()=>{
 for(const file of [candidate.sourceRoot+'/unreviewed-extra.ts',candidate.publicationRoot+'/execution-source/'+candidate.sourceRoot+'/unreviewed-extra.ts']){
  const target=path.join(root,file);fs.writeFileSync(target,'export const unreviewed = true;\n',{flag:'wx'});
  try{assert.throws(inspect,/missing, duplicate or extra/);}finally{fs.unlinkSync(target);}
 }
});
test('the live and copied manifests must both retain their exact original bytes',()=>{
 for(const file of [candidate.manifest.file,candidate.manifestCopy.file])changed(file,bytes=>{
  const value=JSON.parse(bytes);value.files=value.files.concat(value.files.filter(row=>row.path===candidate.mapped[0].manifestPath));return Buffer.from(JSON.stringify(value));
 },()=>assert.throws(inspect,/fixed bytes differ/));
});
test('wrong closure version or execution-to-resolution membership is not a new supported version',()=>{
 changed(candidate.buildPins.file,bytes=>{const value=JSON.parse(bytes);value.publicationId='bazi-root-feedback/1.3.1';value.closure.files.find(row=>row.sourcePath===candidate.mapped[0].sourceFile).role='resolution';return Buffer.from(JSON.stringify(value));},()=>assert.throws(inspect,/fixed bytes differ/));
});
test('a subset, extra source, remapped counterpart or fabricated companion review cannot reseal the candidate',()=>{
 for(const mutate of [value=>value.mapped.pop(),value=>value.mapped.push({...value.mapped[0],sourceFile:value.sourceRoot+'/forged.ts'}),value=>{value.mapped[0].resourceFile=value.mapped[1].resourceFile;},value=>{value.companions[0].executionAssetCounterpart=value.mapped[0].resourceFile;},value=>{value.companions[0].review={status:'approved',reference:true};value.authority.registrationAllowed=true;}]){
  changed(candidateFile,bytes=>{const value=JSON.parse(bytes);mutate(value);return Buffer.from(JSON.stringify(value));},()=>assert.throws(inspect,/fixed bytes differ/));
 }
});
test('replacing a previous bounded review does not grant a current group source review',()=>{
 for(const row of candidate.priorEvidence)changed(row.file,flip,()=>assert.throws(inspect,/fixed bytes differ/));
});
test('caller approval flags, supplied manifests and a foreign checkout cannot alter fixed scope',()=>{
 for(const extra of [{allowUnknown:true},{reviewApproved:true},{manifest:candidate.manifest.file},{registrationAllowed:true},{companionReviewRefs:[]}])assert.throws(()=>group.inspectProjectV132SourceGroup({root,...extra}),/only the canonical root option/);
 assert.throws(()=>group.inspectProjectV132SourceGroup({root:project}),/canonical module checkout/);
});
test('directory junctions cannot replace the real source group',()=>{
 const original=path.join(root,candidate.sourceRoot),held=path.join(root,'owned-held-group');fs.renameSync(original,held);fs.symlinkSync(held,original,'junction');
 try{assert.throws(inspect,/linked input rejected/);}finally{fs.unlinkSync(original);fs.renameSync(held,original);}
});
