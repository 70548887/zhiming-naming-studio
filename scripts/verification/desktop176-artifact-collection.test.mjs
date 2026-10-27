import {test,after} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {captureCommand,reference} from './release-capture.mjs';

const owned=[],parent=fs.realpathSync.native(process.env.M220_CASE_ROOT??os.tmpdir()),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function fixture({version='1.0.38',mode='Development',phaseID='exercise',scenario='correct',enabled=true}={}){
 const root=fs.realpathSync.native(fs.mkdtempSync(path.join(parent,'desktop176-capture-')));owned.push(root);
 const write=(name,value)=>{const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');return file;};
 write('package.json',{version,build:{files:['package.json']}});fs.mkdirSync(path.join(root,'.local'));
 const entry=write('scripts/fixture-child.mjs',fs.readFileSync(fileURLToPath(new URL('./fixtures/desktop176-artifact-child.mjs',import.meta.url)),'utf8'));
 const config=write('inputs/config.json',{componentFixtureOnly:true}),build=write('inputs/build.json',{componentFixtureOnly:true}),workflow=write('inputs/workflow.mjs','export const componentFixtureOnly=true;\n');
 write('inputs/outside.json',{outsideApprovedCase:true});
 const files={};for(const name of ['package.json','scripts/fixture-child.mjs','inputs/config.json','inputs/build.json','inputs/workflow.mjs'])files[name]=sha(fs.readFileSync(path.join(root,name)));
 const freezeFile=write('.local/test-freeze.json',{schema:'naming-studio-test-input-freeze/1',version,frozenAt:new Date().toISOString(),files,documentation:{}});
 const inputFreeze=await reference(root,freezeFile),acceptanceRoot=path.join(root,'.local','desktop176-acceptance-fixture'),completionFile=path.join(acceptanceRoot,mode,phaseID,'driver','phase-completed.json'),output=path.join(root,'.local','command-capture');
 const plan={schema:'naming-studio-command-plan/1',version,role:'runtimeRecord',inputFreeze,executable:process.execPath,args:[entry,'--root',root,'--case',acceptanceRoot,'--mode',mode,'--phase',phaseID,'--scenario',scenario,'--freeze',freezeFile,'--capture',output],toolFiles:['scripts/fixture-child.mjs'],outputs:[completionFile],artifacts:[entry,config,freezeFile,build,workflow],...(enabled?{mode,phaseID,desktop176ArtifactCollection:{schema:'desktop176-artifact-collection/1',version:'1.0.38',mode,phaseID,acceptanceRoot,completionFile}}:{})};
 if(enabled){const db=path.join(acceptanceRoot,mode,'user-data','customers.sqlite');if(phaseID==='exercise')plan.outputs.push(db);else{fs.mkdirSync(path.dirname(db),{recursive:true});fs.writeFileSync(db,'existing resume fixture database');plan.artifacts.push(db);}}
 return{root,plan,output,entry,freezeFile,acceptanceRoot,completionFile,started:path.join(acceptanceRoot,mode,phaseID,'out','child-started.log')};
}
async function run(f){return captureCommand({root:f.root,plan:f.plan,output:f.output});}
function failedObservation(capture,exitCode=0){
 assert.equal(capture.result.status,'failed');assert.equal(capture.result.exitCode,exitCode);assert.ok(capture.result.pid>0);
 assert.equal(capture.result.signal,null);assert.ok(capture.result.stdout.bytes>0);assert.ok(capture.result.stderr.bytes>0);
 assert.match(fs.readFileSync(capture.result.stdout.file,'utf8'),/actually started/);
 assert.deepEqual(JSON.parse(fs.readFileSync(capture.file,'utf8')),capture.result);
}
after(()=>{
 if(process.env.M220_CASE_ROOT)return;
 for(const root of owned){if(path.dirname(root)!==parent||!path.basename(root).startsWith('desktop176-capture-')||fs.lstatSync(root).isSymbolicLink())throw Error('Unsafe owned fixture cleanup');fs.rmSync(root,{recursive:true,force:false});}
});

test('new profile collects unpredictable IPC/scratch files only after the actual child closes, with empty logs',async()=>{
 const f=await fixture(),capture=await run(f);assert.equal(capture.result.status,'completed',JSON.stringify(capture.result.artifactErrors));assert.equal(capture.result.exitCode,0);
 assert.equal(capture.result.profile,'desktop176/1');assert.equal(capture.result.mode,'Development');assert.equal(capture.result.phaseID,'exercise');
 assert.equal(capture.result.outputs[0].file,f.completionFile);assert.ok(capture.result.artifacts.length>f.plan.artifacts.length);
 assert.ok(capture.result.artifacts.some(ref=>/IPC-[^/\\]+\.json$/.test(ref.file)));assert.ok(capture.result.artifacts.some(ref=>ref.file.includes('scratch-')));
 assert.ok(capture.result.artifacts.some(ref=>ref.bytes===0&&path.basename(ref.file)==='stdout.log'));assert.ok(capture.result.artifacts.some(ref=>ref.file.endsWith('mock-report.pdf')));
 assert.ok(!capture.result.artifacts.some(ref=>ref.file===f.completionFile));assert.deepEqual(capture.result.sourceFreeze,capture.result.freezeAfter);
 const recordBytes=fs.readFileSync(capture.file);await assert.rejects(run(f),/already exists/);assert.ok(fs.readFileSync(capture.file).equals(recordBytes));
});
test('resume collects only out/driver artifacts and requires a null marker',async()=>{
 const f=await fixture({mode:'Installed',phaseID:'resume'}),capture=await run(f);assert.equal(capture.result.status,'completed');
 assert.equal(JSON.parse(fs.readFileSync(f.completionFile,'utf8')).marker,null);
 assert.equal(fs.existsSync(path.join(f.acceptanceRoot,'Installed','resume','pdf-operation')),false);
});
test('invalid opt-in declarations and directories reject before any fixture child spawn',async t=>{
 const variants=[
  ['unknown schema',f=>f.plan.desktop176ArtifactCollection.schema='unknown'],
  ['missing declaration field',f=>delete f.plan.desktop176ArtifactCollection.phaseID],
  ['unknown declaration field',f=>f.plan.desktop176ArtifactCollection.phaseId='exercise'],
  ['unknown plan field',f=>f.plan.mutableDirectory='anywhere'],
  ['wrong role',f=>f.plan.role='installedRuntime'],
  ['mode mismatch',f=>f.plan.desktop176ArtifactCollection.mode='Installed'],
  ['phase mismatch',f=>f.plan.desktop176ArtifactCollection.phaseID='resume'],
  ['manifest not predeclared',f=>f.plan.outputs=[]],
  ['wrong fixed manifest',f=>f.plan.desktop176ArtifactCollection.completionFile=path.join(f.acceptanceRoot,'other.json')],
  ['outside case',f=>f.plan.desktop176ArtifactCollection.acceptanceRoot=path.join(f.root,'inputs')],
  ['capture overlap',f=>f.output=path.join(f.acceptanceRoot,'outer-capture')],
  ['path alias',f=>f.plan.desktop176ArtifactCollection.acceptanceRoot+=path.sep+'..'+path.sep+path.basename(f.acceptanceRoot)],
 ];
 for(const [name,mutate]of variants)await t.test(name,async()=>{const f=await fixture();mutate(f);await assert.rejects(run(f));assert.equal(fs.existsSync(f.started),false);assert.equal(fs.existsSync(path.join(f.output,'command.json')),false);});
});
test('an existing manifest or directory junction is rejected without spawning or overwriting evidence',async t=>{
 await t.test('existing original manifest',async()=>{const f=await fixture();fs.mkdirSync(path.dirname(f.completionFile),{recursive:true});fs.writeFileSync(f.completionFile,'original');await assert.rejects(run(f));assert.equal(fs.readFileSync(f.completionFile,'utf8'),'original');assert.equal(fs.existsSync(f.started),false);});
 await t.test('junction alias',async()=>{const f=await fixture(),target=path.join(f.root,'.local','real-case');fs.mkdirSync(target);fs.symlinkSync(target,f.acceptanceRoot,'junction');await assert.rejects(run(f),/reparse|symbolic/i);assert.equal(fs.existsSync(f.started),false);});
});
test('version1.0.37 refuses the new profile before spawn even when its package and freeze agree',async()=>{
 const f=await fixture({version:'1.0.37'});await assert.rejects(run(f),/version1.0.38 runtimeRecord/);assert.equal(fs.existsSync(f.started),false);
});
for(const scenario of ['wrong-mode','wrong-phase','wrong-freeze','unknown-field','wrong-sha','wrong-bytes','missing','tamper','outside','duplicate','hardlink','empty-nonlog','self-cycle','capture-cycle','empty-manifest','malformed-manifest','no-manifest','too-many-artifacts','huge-declared-bytes']){
 test('failed capture preserves actual child exit/logs for '+scenario,async()=>{
  const f=await fixture({scenario}),capture=await run(f);failedObservation(capture);
  assert.ok(capture.result.artifactErrors.length>0||capture.result.outputErrors.length>0,scenario);
 });
}
test('an undeclared static input and a static/dynamic duplicate fail without silently deleting refs',async t=>{
 await t.test('top-level source missing predeclaration',async()=>{const f=await fixture();f.plan.artifacts=f.plan.artifacts.filter(file=>file!==f.entry);const capture=await run(f);failedObservation(capture);assert.match(JSON.stringify(capture.result.artifactErrors),/predeclared static/);});
 await t.test('same actual raw file in both artifact lists',async()=>{const f=await fixture();f.plan.artifacts.push(path.join(f.acceptanceRoot,'Development','exercise','out','raw.json'));const capture=await run(f);failedObservation(capture);const raw=path.join(f.acceptanceRoot,'Development','exercise','out','raw.json');assert.equal(capture.result.artifacts.filter(ref=>ref.file===raw).length,2);assert.match(JSON.stringify(capture.result.artifactErrors),/duplicate/);});
});
test('frozen/static mutation and deleted entry still write the first failed capture',async t=>{
 for(const scenario of ['static-tamper','delete-entry'])await t.test(scenario,async()=>{const f=await fixture({scenario}),capture=await run(f);failedObservation(capture);assert.ok(capture.result.freezeError);});
});
test('nonzero actual child exit remains failed despite a completed manifest and verified dynamic bytes',async()=>{
 const f=await fixture({scenario:'nonzero'}),capture=await run(f);failedObservation(capture,7);assert.ok(capture.result.artifacts.some(ref=>ref.file.includes('IPC-')));assert.equal(capture.result.artifactErrors.length,0);
});
test('no declaration preserves old default capture for37 and other roles, without dynamic discovery',async t=>{
 for(const [version,role]of [['1.0.37','runtimeRecord'],['1.0.38','installedRuntime'],['1.0.38','package']])await t.test(version+' '+role,async()=>{
  const f=await fixture({version,enabled:false});f.plan.role=role;fs.mkdirSync(path.dirname(f.completionFile),{recursive:true});
  const capture=await run(f);assert.equal(capture.result.status,'completed');assert.equal(capture.result.artifacts.length,f.plan.artifacts.length);
  assert.equal(Object.hasOwn(capture.result,'desktop176ArtifactCollection'),false);assert.equal(Object.hasOwn(capture.result,'profile'),false);
  assert.equal(capture.result.artifacts.some(ref=>ref.file.includes('IPC-')),false);
 });
});

test('nested snapshot referenceGraph and deterministic sibling receipts grant no dynamic permission',async()=>{
 const f=await fixture(),capture=await run(f);assert.equal(capture.result.status,'completed');
 assert.ok(capture.result.artifacts.some(ref=>ref.file.includes('scratch-')));
 assert.equal(capture.result.artifacts.some(ref=>ref.file===path.join(f.root,'inputs/outside.json')),false);
 assert.ok(fs.existsSync(path.join(f.acceptanceRoot,'Development','exercise','phase-reserved.json')));
 assert.equal(capture.result.artifacts.some(ref=>ref.file.endsWith('phase-reserved.json')),false);
});
test('predeclared deterministic database and reservation outputs are captured separately from dynamic roots',async()=>{
 const f=await fixture({scenario:'database-output'}),db=path.join(f.acceptanceRoot,'Development','user-data','customers.sqlite'),reserved=path.join(f.acceptanceRoot,'Development','exercise','phase-reserved.json');
 if(!f.plan.outputs.includes(db))f.plan.outputs.push(db);f.plan.outputs.push(reserved);const capture=await run(f);assert.equal(capture.result.status,'completed');
 assert.ok(capture.result.outputs.some(ref=>ref.file===db));assert.ok(capture.result.outputs.some(ref=>ref.file===reserved));
 assert.equal(capture.result.artifacts.some(ref=>ref.file===db||ref.file===reserved),false);
});
test('exercise exact database may be an explicitly declared mutable output, while resume static database is immutable',async t=>{
 await t.test('exercise existing private database output',async()=>{
  const f=await fixture({scenario:'database-output'}),db=path.join(f.acceptanceRoot,'Development','user-data','customers.sqlite');
  fs.mkdirSync(path.dirname(db),{recursive:true});fs.writeFileSync(db,'before fixture bytes');f.plan.outputs=f.plan.outputs.filter(file=>file!==db);f.plan.artifacts.push(db);
  const capture=await run(f);assert.equal(capture.result.status,'completed');assert.ok(capture.result.artifacts.some(ref=>ref.file===db));
 });
 for(const scenario of ['correct','database-tamper'])await t.test('resume '+scenario,async()=>{
  const f=await fixture({mode:'Installed',phaseID:'resume',scenario}),db=path.join(f.acceptanceRoot,'Installed','user-data','customers.sqlite'),prior=path.join(f.acceptanceRoot,'Installed','exercise','pdf-operation','prior-mock.pdf'),prepared=path.join(f.acceptanceRoot,'prepared.json');
  for(const file of [db,prior,prepared]){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,'existing static fixture '+path.basename(file));if(!f.plan.artifacts.includes(file))f.plan.artifacts.push(file);}
  const capture=await run(f);
  if(scenario==='correct'){assert.equal(capture.result.status,'completed');for(const file of [db,prior,prepared])assert.ok(capture.result.artifacts.some(ref=>ref.file===file));}
  else{failedObservation(capture);assert.match(JSON.stringify(capture.result.artifactErrors),/static input changed/);}
 });
});
test('resume database output and other-mode static authority reject before spawn',async t=>{
 await t.test('resume output even before database exists',async()=>{const f=await fixture({phaseID:'resume'}),db=path.join(f.acceptanceRoot,'Development','user-data','customers.sqlite');fs.unlinkSync(db);f.plan.outputs.push(db);await assert.rejects(run(f),/read-only/);assert.equal(fs.existsSync(f.started),false);});
 await t.test('other mode exact file',async()=>{const f=await fixture(),file=path.join(f.acceptanceRoot,'Installed','exercise','out','other.json');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,'{}');f.plan.artifacts.push(file);await assert.rejects(run(f),/different mode/);assert.equal(fs.existsSync(f.started),false);});
});

test('both phases require exact database registration before any spawn',async t=>{
 for(const phaseID of ['exercise','resume'])await t.test(phaseID,async()=>{
  const f=await fixture({phaseID}),db=path.join(f.acceptanceRoot,'Development','user-data','customers.sqlite');
  f.plan.outputs=f.plan.outputs.filter(file=>file!==db);f.plan.artifacts=f.plan.artifacts.filter(file=>file!==db);
  await assert.rejects(run(f),/database must be explicitly predeclared/);assert.equal(fs.existsSync(f.started),false);
 });
});
