import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {dir,buildArtifacts,hash} from './build-r2.mjs';
const read=n=>JSON.parse(fs.readFileSync(path.join(dir,n)));
const contract=read('generation-admission-contract.json'),f=read('acceptance-cases.json'),rows=read('m740-generation-admission.json').records;
const issues=[];let checks=0;
function check(label,fn){fn();checks++;}
check('rebuild identical',()=>{for(const[n,b]of buildArtifacts())assert.equal(hash(fs.readFileSync(path.join(dir,n))),hash(b),n);});
const baselines=new Map(f.baselines.map(b=>[b.id,b])),themes=new Set(read('theme-registry.json').themes.map(x=>x.id));
for(const b of baselines.values())check('baseline '+b.id,()=>{assert(rows.some(r=>r.candidateCaseId===b.recordId));assert(b.context.themeIds.every(id=>themes.has(id)));});
for(const x of [...f.fixtures,...f.stageAssertions])check('dispatch '+x.id,()=>{
 assert(baselines.has(x.baselineRef));assert.equal(x.productExecution,'not-run');const op=contract.operations[x.action];assert(op);assert(op.stageValues.includes(x.stage));
 assert.equal(Object.keys(x.expected)[0],op.returns.discriminator);assert(op.returns.enum.includes(x.expected[op.returns.discriminator]));
 if(x.action==='assess'){assert(!Object.hasOwn(x.expected,'assertionKind'));assert(x.inputPatch&&x.faultInjection);assert(['qualification','receipt-validation'].includes(x.assessmentScope));const c={...baselines.get(x.baselineRef).context,...x.inputPatch};assert.equal([...c.givenName].length,c.requestedGivenNameLength);assert.equal(c.fullName,c.surname+c.givenName);}
 else assert(!Object.hasOwn(x.expected,'status'));
 if(x.action==='output-assertion')assert.equal(x.expected.ok,x.expected.assertionKind===null);
});
for(const stage of contract.stages)check('valid leaf '+stage,()=>{const x=f.stageAssertions.find(x=>x.id==='STAGE-叶-'+stage),b=baselines.get(x.baselineRef);assert.equal(b.recordId,'single-meaning-m740:叶:124301:0:0');assert.deepEqual(b.context.themeIds,[]);assert.equal(x.expected.status,'pending-source-identity');});
for(const stage of ['save','restore'])for(const char of ['纪','邦'])check('receipt '+stage+char,()=>{assert(f.stageAssertions.some(x=>x.id==='STAGE-'+char+'-'+stage&&x.expected.status==='eligible'));assert(f.stageAssertions.some(x=>x.id==='RECEIPT-TAMPER-'+char+'-'+stage&&x.expected.status==='rejected-integrity'));});
check('9 allow and leaf pending',()=>{assert.equal(rows.filter(r=>r.decision==='allow-single-character-generation').length,9);assert.equal(rows.find(r=>r.identity.char==='叶').decision,'pending');});
const registry=read('conflict-registry.json').conflicts;
check('conflict references',()=>{assert(rows.flatMap(r=>r.conflictIds).every(id=>registry.some(r=>r.id===id)));assert(registry.every(r=>r.wholeNameMatcher===null));});
check('surname leaf tests actual leaf surname',()=>{const x=f.fixtures.find(x=>x.id==='SURNAME-YE'),c={...baselines.get(x.baselineRef).context,...x.inputPatch};assert.equal(c.surname,'叶');assert.equal(c.fullName,'叶年');});
const input=read('input-pins.json');for(const p of input.originalFiles)check('original preserved '+p.file,()=>assert.equal(hash(fs.readFileSync(path.join(path.dirname(dir),p.file))),p.sha256));
const originalManifest=JSON.parse(fs.readFileSync(path.join(path.dirname(dir),'manifest.json')));for(const x of originalManifest.files)check('old manifest '+x.file,()=>assert.equal(hash(fs.readFileSync(path.join(path.dirname(dir),x.file))),x.sha256));
const verification={schema:'M752-r2-verification/1',at:new Date().toISOString(),checksPassed:checks,issues,originalManifestFilesUnchanged:originalManifest.files.length,sourceFilesChanged:0,productFilesWritten:0,productTestsExecuted:false,contractFixtures:f.fixtures.length,stageExpectations:f.stageAssertions.length,rebuiltArtifactsByteIdentical:true,recordPackageSha256:hash(fs.readFileSync(path.join(dir,'m740-generation-admission.json'))),formalCoverageAdded:0,unexecuted:['M751 assess execution','actual output rejection','legacy7.1 runtime replay','product generation/save/restore','build/install']};
fs.writeFileSync(path.join(dir,'verification.json.tmp'),JSON.stringify(verification,null,2)+'\n');fs.renameSync(path.join(dir,'verification.json.tmp'),path.join(dir,'verification.json'));
const files=fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isFile()&&!['manifest.json'].includes(e.name)&&!e.name.endsWith('.tmp')).map(e=>{const bytes=fs.readFileSync(path.join(dir,e.name));return{file:e.name,bytes:bytes.length,sha256:hash(bytes)};});
fs.writeFileSync(path.join(dir,'manifest.json.tmp'),JSON.stringify({schema:'M752-r2-manifest/1',revision:'r2',files},null,2)+'\n');fs.renameSync(path.join(dir,'manifest.json.tmp'),path.join(dir,'manifest.json'));
console.log(JSON.stringify(verification));
