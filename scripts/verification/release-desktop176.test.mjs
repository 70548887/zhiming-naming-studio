import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {makeDesktop176Fixture,formalLifecycleAssertions} from './desktop176-fixture-builder.mjs';
import {fixture} from './release-desktop176.fixture.mjs';
import {verifyRelease} from './release.mjs';
import {publishRelease,prepareAcceptanceReview} from './release-publication.mjs';
import {desktop138LifecycleWitness,validateAcceptancePng,verifyDesktop176OnboardingBinding} from './release-phases.mjs';
import {reference} from './release-capture.mjs';
import {readFreeze} from './release-capture.mjs';
import ownerR2 from './fixtures/desktop176-r2-contract.cjs';
const parse=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const noPublication=f=>assert.equal(fs.existsSync(f.abs('.local/publication3')),false);
async function rewriteDevelopmentResume(f,mutate){
 const refs=f.proofs.modes.Development.resume,h=f.helpers,raw=parse(refs.run.file),live=parse(raw.runtimeProcess.file),process=parse(refs.processReceipt.file),original=parse(process.stageProcess.file);mutate({raw,live,process,original,exercise:parse(f.proofs.modes.Development.exercise.run.file)});
 const replace=(ref,data)=>h.rewrite(ref,value=>{for(const key of Object.keys(value))delete value[key];Object.assign(value,data);});
 const liveRef=await replace(raw.runtimeProcess,live);raw.runtimeProcess=liveRef;
 const runRef=await replace(refs.run,raw);process.result=runRef;
 original.result=runRef;process.stageProcess=await replace(process.stageProcess,original);
 const processRef=await replace(refs.processReceipt,process),sqlRef=await h.rewrite(refs.installedRuntime,value=>{value.resultFile=runRef.file;value.resultSha256=runRef.sha256;value.runtimeResultSha256=runRef.sha256;value.processEvidence=process.stageProcess;});
 const captureRef=await h.rebindCapture(refs.commandCapture);
 await h.updateAcceptance('guiAcceptance',value=>{const mode=value.runs.find(row=>row.mode==='Development');mode.resume={...mode.resume,run:runRef,processReceipt:processRef,installedRuntime:sqlRef,commandCapture:captureRef};mode.processEvidence=[mode.exercise.processReceipt,processRef];});
}

test('synthetic protocol graph: both modes exit and resume, then publication3 verifies all six exercise PDFs',async()=>{
 const f=await makeDesktop176Fixture();
 for(const mode of f.guiModes){const exit=parse(mode.exercise.processReceipt.file);ownerR2.assertDesktop176ExerciseProcessSource(exit,parse(exit.stageProcess.file));}
 const result=await f.publish();f.installRecord(result);
 const value=await verifyRelease({root:f.root,strictLocal:true,releaseDirectory:f.options.releaseDirectory});
 assert.equal(value.status,'passed',JSON.stringify({errors:value.errors,pending:value.pending}));
 const gui=value.checks.find(row=>row.check==='directory-gui-acceptance'),pdf=value.checks.find(row=>row.check==='directory-pdf-acceptance'),lifecycle=value.checks.find(row=>row.check==='directory-lifecycle40-full-regression');
 assert.deepEqual(gui.modes,['Development','Installed']);assert.equal(gui.phases,4);assert.equal(gui.reopenScope,'separate-process-resume');
 assert.equal(pdf.pdfs,6);assert.equal(pdf.phaseID,'exercise');assert.equal(lifecycle.inventoryCases,40);assert.equal(lifecycle.lifecycleTests,12);assert.equal(lifecycle.desktopGenerationScope,'representative-only');
 assert.equal(value.writes,0);assert.equal(value.networkRequests,0);
});

test('pinned actual M176-r2 parser consumes the production freezeInputs/readFreeze string-map DTO',async()=>{
 const f=await fixture({phased:true,releaseDirectory:'.local/parser/release'}),actual=await readFreeze(f.root,f.freeze.file,'1.0.38',f.freeze.sha256),value=ownerR2.parseDesktop176TestInputFreeze(actual.value);
 assert.equal(value.schema,'naming-studio-test-input-freeze/1');assert.equal(Object.isFrozen(value),true);
 for(const file of ['src/main/smoke-desktop-workflow-176.ts','src/shared/naming-element-application.ts','tests/naming-v71-service-core.test.ts'])assert.equal(typeof value.files[file],'string');
 const objects=structuredClone(actual.value);objects.files['tests/naming-v71-service-core.test.ts']={sha256:value.files['tests/naming-v71-service-core.test.ts']};assert.throws(()=>ownerR2.parseDesktop176TestInputFreeze(objects),/SHA字符串/);
 const missing=structuredClone(actual.value);delete missing.documentation;assert.throws(()=>ownerR2.parseDesktop176TestInputFreeze(missing),/生产schema/);
 const other=structuredClone(actual.value);other.schema='naming-studio-publication-freeze/2';assert.throws(()=>ownerR2.parseDesktop176TestInputFreeze(other),/生产schema/);
});

test('consumer and pinned r2 producer agree on read-only onboarding observations in both phases',()=>{
 const observed={storageKey:'studio.onboarding.v1',rawValue:'{"version":1,"dismissed":true}',guideVisible:false},exercise=ownerR2.assertDesktop176OnboardingObservation(observed,'exercise'),resume=ownerR2.assertDesktop176OnboardingObservation(observed,'resume',exercise);
 const scenarios=value=>Array.from({length:3},()=>({evidence:{rendererOnboarding:structuredClone(value)}}));
 assert.equal(verifyDesktop176OnboardingBinding({rendererOnboarding:exercise},scenarios(resume),scenarios(exercise)),true);
 const changed={...resume,rawValue:'{"dismissed":true,"version":1}'};assert.throws(()=>verifyDesktop176OnboardingBinding({rendererOnboarding:exercise},scenarios(changed),scenarios(exercise)),/resume onboarding/);
 assert.throws(()=>ownerR2.assertDesktop176OnboardingObservation({...observed,guideVisible:true},'resume',exercise));
 assert.throws(()=>verifyDesktop176OnboardingBinding({},scenarios(resume),scenarios(exercise)),/exercise onboarding/);
 const wrong=scenarios(exercise);delete wrong[0].evidence.rendererOnboarding;assert.throws(()=>verifyDesktop176OnboardingBinding({rendererOnboarding:exercise},scenarios(resume),wrong),/exercise onboarding/);
});

test('post-exit receipt may share millisecond stamp with raw completion while retaining distinct App PIDs',async()=>{
 const f=await makeDesktop176Fixture({equalExitTimestamps:true}),result=await f.publish();f.installRecord(result);
 const value=await f.verify();assert.equal(value.status,'passed',JSON.stringify({errors:value.errors,pending:value.pending}));
 for(const mode of f.guiModes){assert.notEqual(parse(mode.exercise.run.file).pid,parse(mode.resume.run.file).pid);assert.equal(parse(mode.exercise.run.file).completedAt,parse(mode.exercise.processReceipt.file).terminalAt);}
});

test('synthetic partial adapter: one mode cannot create complete acceptance wrappers',async()=>{
 const f=await makeDesktop176Fixture(),config=structuredClone(f.refs.adapterConfig);delete config.development;
 const result=await prepareAcceptanceReview({root:f.root,config,output:'.local/partial-mode'});assert.equal(result.status,'partial');assert.equal(result.approved,false);assert.equal(result.guiFile,undefined);assert.equal(result.pdfFile,undefined);
 const partial=parse(result.file);assert.deepEqual(partial.missingPhases,['Development:exercise','Development:resume']);noPublication(f);
});

test('synthetic partial adapter: missing resume is retained as partial',async()=>{
 const f=await makeDesktop176Fixture(),config=structuredClone(f.refs.adapterConfig);delete config.installed.resume;
 const result=await prepareAcceptanceReview({root:f.root,config,output:'.local/partial-resume'});assert.equal(result.status,'partial');assert.equal(result.approved,false);assert.ok(parse(result.file).missingPhases.includes('Installed:resume'));noPublication(f);
});

for(const [label,change]of [
 ['one-mode approval',value=>{value.runs=value.runs.filter(row=>row.mode==='Installed');}],
 ['missing resume approval',value=>{delete value.runs[0].resume;}],
 ['old desktop-core profile',value=>{value.profile='desktop-core/1';}]
])test('reviewed metadata cannot turn '+label+' into complete desktop138',async()=>{
 const f=await makeDesktop176Fixture();await f.helpers.updateAcceptance('guiAcceptance',change);await assert.rejects(f.publish(),/directory-gui-acceptance/);noPublication(f);
});

test('adapter refuses partial response captures instead of completing their missing wire',async()=>{
 const f=await makeDesktop176Fixture(),config=structuredClone(f.refs.adapterConfig),raw=parse(config.development.exercise.run.file);raw.captureCompleteness='partial';
 const file=f.write('.local/partial-original-run.json',raw);config.development.exercise.run=await reference(f.root,file);
 await assert.rejects(prepareAcceptanceReview({root:f.root,config,output:'.local/refused-partial'}),/Partial\/missing/);assert.equal(fs.existsSync(f.abs('.local/refused-partial')),false);
});

test('adapter refuses old or differently named workflow captures',async()=>{
 const f=await makeDesktop176Fixture(),config=structuredClone(f.refs.adapterConfig),raw=parse(config.development.exercise.run.file);raw.workflowId='desktop170/1';
 config.development.exercise.run=await reference(f.root,f.write('.local/old-workflow.json',raw));await assert.rejects(prepareAcceptanceReview({root:f.root,config,output:'.local/refused-old-workflow'}),/Unknown or old/);assert.equal(fs.existsSync(f.abs('.local/refused-old-workflow')),false);
});

test('source original response bytes are immutable after review',async()=>{
 const f=await makeDesktop176Fixture(),raw=parse(f.guiModes[0].exercise.run.file);fs.appendFileSync(raw.originalResponses[0].response.file,'tampered');
 await assert.rejects(f.publish(),/directory-gui-acceptance/);noPublication(f);
});

test('a self-consistent same-PID resume cannot be advertised as a new App process',async()=>{
 const f=await makeDesktop176Fixture();await rewriteDevelopmentResume(f,({raw,live,process,original,exercise})=>{raw.pid=exercise.pid;raw.resumeEvidence.resumePid=exercise.pid;for(const scenario of raw.scenarios)scenario.evidence.resume.newPid=exercise.pid;live.pid=exercise.pid;if(live.app)live.app.pid=exercise.pid;process.pid=exercise.pid;original.pid=exercise.pid;});
 await assert.rejects(f.publish(),/new PID|different|Desktop176|directory-gui-acceptance/);noPublication(f);
});

test('rebound native-command capture cannot claim a fabricated frozen GUI entry pointer',async()=>{
 const f=await makeDesktop176Fixture(),phase=f.proofs.modes.Development.resume,capture=await f.helpers.rewrite(phase.commandCapture,value=>{value.command.args=['native-operation'];});
 await f.helpers.updateAcceptance('guiAcceptance',value=>{value.runs.find(row=>row.mode==='Development').resume.commandCapture=capture;});
 await assert.rejects(f.publish(),/entry script binding missing/);noPublication(f);
});

test('self-consistent resume still rejects non-natural termination',async()=>{
 const f=await makeDesktop176Fixture();await rewriteDevelopmentResume(f,({process})=>{process.naturalExit=false;});
 await assert.rejects(f.publish(),/natural post-exit|directory-gui-acceptance/);noPublication(f);
});

test('Installed resume cannot borrow an overall runtime with a different original App start interval',async()=>{
 const f=await makeDesktop176Fixture({runtimeIntervalShiftMs:-1});await assert.rejects(f.publish(),/post-exit process interval/);noPublication(f);
});

async function rewriteDevelopmentPostReceipt(f,change){
 const phase=f.proofs.modes.Development.resume,process=await f.helpers.rewrite(phase.processReceipt,change),capture=await f.helpers.rebindCapture(phase.commandCapture);
 await f.helpers.updateAcceptance('guiAcceptance',value=>{const mode=value.runs.find(row=>row.mode==='Development');mode.resume.processReceipt=process;mode.resume.commandCapture=capture;mode.processEvidence=[mode.exercise.processReceipt,process];});
}

test('desktop postreceipt cannot omit its original stageProcess proof',async()=>{
 const f=await makeDesktop176Fixture();await rewriteDevelopmentPostReceipt(f,value=>{delete value.stageProcess;});await assert.rejects(f.publish(),/stageProcess/);noPublication(f);
});

test('desktop postreceipt cannot reverse stageProcess to a new desktop schema',async()=>{
 const f=await makeDesktop176Fixture();
 await rewriteDevelopmentPostReceipt(f,async value=>{value.stageProcess=await f.helpers.rewrite(value.stageProcess,original=>{original.schema='naming-studio-desktop176-process/1';});});await assert.rejects(f.publish(),/original successful smoke receipt/);noPublication(f);
});

test('rebound desktop times cannot override the exact original smoke-process interval',async()=>{
 const f=await makeDesktop176Fixture();await rewriteDevelopmentPostReceipt(f,value=>{value.startedAt=new Date(Date.parse(value.startedAt)-1).toISOString();});await assert.rejects(f.publish(),/preserve original input\/build and App interval/);noPublication(f);
});

test('original smoke-process reference bytes are rechecked after approval',async()=>{
 const f=await makeDesktop176Fixture(),p=parse(f.proofs.modes.Development.resume.processReceipt.file);fs.appendFileSync(p.stageProcess.file,'changed');await assert.rejects(f.publish(),/bytes changed/);noPublication(f);
});

test('new desktop138 profile requires the original sourceFreeze ref without object-map or publication substitution',async()=>{
 const f=await makeDesktop176Fixture();await rewriteDevelopmentResume(f,({original})=>{delete original.sourceFreeze;});
 const gui=parse(f.options.guiAcceptance.file),process=parse(gui.runs.find(row=>row.mode==='Development').resume.processReceipt.file);assert.equal(Object.hasOwn(parse(process.stageProcess.file),'sourceFreeze'),false);
 await assert.rejects(f.publish(),/preserve original input\/build/);noPublication(f);
});

test('resume seal and readonly SQLite are checked against actual bytes',async()=>{
 const f=await makeDesktop176Fixture(),raw=parse(f.guiModes[0].exercise.run.file),seal=parse(raw.resumeSeal.file);fs.appendFileSync(seal.database.file,'tampered');
 await assert.rejects(f.publish(),/directory-gui-acceptance|SQL bytes/);noPublication(f);
});

test('reviewed lifecycle documents bind the new complete acceptance refs',async()=>{
 const f=await makeDesktop176Fixture({documents:true}),result=await f.publish();f.installRecord(result);
 const resultAllowed=await f.verify();assert.equal(resultAllowed.status,'passed',JSON.stringify(resultAllowed));assert.equal(resultAllowed.workspaceDeltas.filter(row=>row.allowedPostReleaseDocumentation).length,2);
 const denied=await f.verify({allowPostReleaseDocs:false});assert.equal(denied.status,'failed');
});

test('new application cannot publish through the old bundle2 namespace',async()=>{
 const f=await makeDesktop176Fixture(),bundle=parse(f.options.bundle.file);bundle.schema='naming-studio-execution-bundle/2';
 const old=await reference(f.root,f.write('.local/relabelled-old-bundle.json',bundle));await assert.rejects(publishRelease({root:f.root,bundle:old,output:'.local/old-profile'}),/Application1.0.38 requires/);assert.equal(fs.existsSync(f.abs('.local/old-profile')),false);
});

test('final1.0.38 verification cannot accept an old record schema',async()=>{
 const f=await makeDesktop176Fixture(),result=await f.publish();result.record.verification.evidenceSchema='naming-studio-release-verification/1';f.installRecord(result);
 const value=await f.verify();assert.equal(value.status,'failed');assert.ok(value.errors.some(row=>row.check==='desktop138-required-profile'));
});

test('selected directory missing its record cannot use another release record',async()=>{
 const f=await makeDesktop176Fixture(),result=await f.publish();f.write('release/NamingStudio-1.0.38-verification.json',result.record);
 const value=await f.verify();assert.equal(value.status,'pending');assert.equal(value.checks.length,0);
});

test('pending adapter templates cannot serve as approved GUI/PDF acceptance',async()=>{
 const f=await makeDesktop176Fixture();await assert.rejects(f.publish({guiAcceptance:f.refs.pendingGui,pdfAcceptance:f.refs.pendingPdf}),/directory-gui-acceptance|directory-pdf-acceptance/);noPublication(f);
});

test('fixed40 lifecycle validates the exact final-full assertion list',async()=>{
 const f=await fixture({phased:true,releaseDirectory:'.local/lifecycle/release'}),input=parse(f.freeze.file),profile=parse(f.abs('data/naming-character-meanings-v7.1-profile.json'));
 const report={testResults:[{name:f.abs('tests/naming-v71-service-core.test.ts'),status:'passed',assertionResults:formalLifecycleAssertions(profile)}]};
 assert.equal(desktop138LifecycleWitness({root:f.root,input,report}).inventoryCases,40);
 const wrong=structuredClone(report);wrong.testResults[0].assertionResults[0].title+=' wrong';assert.throws(()=>desktop138LifecycleWitness({root:f.root,input,report:wrong}),/exact12/);
 const missing=structuredClone(report);missing.testResults[0].assertionResults.pop();assert.throws(()=>desktop138LifecycleWitness({root:f.root,input,report:missing}),/exact12/);
 const other=structuredClone(input);other.files['tests/naming-v71-service-core.test.ts']='0'.repeat(64);assert.throws(()=>desktop138LifecycleWitness({root:f.root,input:other,report}),/exact reviewed/);
});

const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGMU0bBhYGBgYgADAAWiAHylyrQdAAAAAElFTkSuQmCC','base64');
test('PNG evidence decodes a complete independently generated PNG',()=>assert.doesNotThrow(()=>validateAcceptancePng(png)));
for(const [label,bytes]of [
 ['header-only',png.subarray(0,24)],['missing-IEND',png.subarray(0,png.length-12)],
 ['bad-CRC',(()=>{const b=Buffer.from(png);b[b.length-1]^=1;return b;})()],
 ['high-bit-type-with-recomputed-CRC',Buffer.from('iVBORw0KGgoAAAANyUhEUgAAAAIAAAACCAIAAABHWFGbAAAAEklEQVR4nGMU0bBhYGBgYgADAAWiAHylyrQdAAAAAElFTkSuQmCC','base64')]
])test('PNG evidence rejects '+label,()=>assert.throws(()=>validateAcceptancePng(bytes),/Invalid acceptance PNG/));
