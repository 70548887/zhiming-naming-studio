/**
 * Reusable synthetic1.0.38 protocol fixture builder, intended to be copied beside
 * the verification harness modules imported below. All work happens only when
 * makeDesktop176Fixture() is called by unit tests. Nothing here launches an App,
 * IPC endpoint, installer, PDF printer, renderer, command, or real test suite.
 * The formal13-pass report and process receipts are explicitly synthetic data.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fixture,VERSION} from './release-desktop176.fixture.mjs';
import {createModeProofs} from './desktop176-test-proofs.mjs';
import {assembleRelease} from './release-assemble.mjs';
import {prepareAcceptanceReview,prepareDocumentationReview,publishRelease} from './release-publication.mjs';
import {verifyRelease} from './release.mjs';
import {reference} from './release-capture.mjs';
import {sha256,walk} from './common.mjs';

const require=createRequire(import.meta.url),initSQL=require('sql.js');
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGMU0bBhYGBgYgADAAWiAHylyrQdAAAAAElFTkSuQmCC','base64');
const SUITE='tests/naming-v71-service-core.test.ts';
const BASE_GROUP='real71 Service Store reopen history backup and modern core; no UI/PDF claim';
const BATCH_GROUP='real71 independent character batches; functional coverage is not a cumulative performance benchmark';
const MANUAL_WARNING='人工喜用选择已修改，此批候选保留生成时的用字依据；重新生成可应用新选择。';
const clone=value=>structuredClone(value);
const need=(ok,message)=>{if(!ok)throw new Error('Synthetic desktop176 builder: '+message);};
const phaseRefs=phase=>Object.fromEntries(['source','commandCapture','run','processReceipt','installedRuntime'].map(key=>[key,phase[key]]));

export function formalLifecycleAssertions(profile){
 const titles=[
  'saves old70 then regenerates the same constrained mixed name under71 without rewriting the old record',
  'ordinary manual prose edit keeps71 snapshot immutable and history restores its exact saved version',
  'modern71 records its real71 identity while reusing explicit old70 scoring basis with no note score credit',
  'backup restore and a fresh Store reread preserve old70 and new71 raw snapshots together',
 ];
 return [
  ...titles.map(title=>({ancestorTitles:[BASE_GROUP],title,status:'passed'})),
  ...Array.from({length:8},(_,index)=>({ancestorTitles:[BATCH_GROUP],title:'actual71 characters batch '+(index+1)+'/8 ['+profile.cases.slice(index*5,index*5+5).map(row=>row.char).join('')+']',status:'passed'})),
 ];
}

function syntheticSession(context,profile){
 const {session,scenarioId,representative}=context,isProject=scenarioId==='project131-family-review',char=isProject?'沐':representative;
 const row=profile.cases.find(item=>item.char===char),preferences={length:1,generationChar:char,requiredChars:char,forbiddenChars:'',elderTaboo:'',style:'自然',meanings:'',industry:'',priority:'balanced',preferredElements:[],zodiacRules:false,numerology:false,avoidParentNames:!isProject,imageryReading:false,yueReading:false,yueHomophones:'none',wordPronunciationReference:false,elementAssessment:false,...isProject?{namingElementMethod:{methodId:'project-bazi-mainchain-145/1.3.1',entryPolicy:'month-branch-only'},parentNamePhonetics:'strict'}:{}};
 const birth={...session.profile,customerName:'SYNTHETIC UNIT '+session.id,surname:'林',surnamePinyin:'lín',fatherName:isProject?'林沐':'林文舟',motherName:isProject?'陈子':'陈若兰',gender:'中性',calendar:'solar',birthDate:isProject?'2022-02-13':'2026-10-17',leapMonth:false,birthTime:isProject?'11:30':'09:30',timeUnknown:false,birthPlace:'上海',timezone:'Asia/Shanghai',timeBasis:'civil',renMethod:'none',monthAuthorityMethod:'no-fixed-day/1.0.0',seasonalMethod:'no-monthly/1.0.0',notes:'Synthetic unit JSON only; no native or algorithm execution.',namingPreferences:clone(preferences)};
 const character=row?clone(row.baselineCharacter):{char,pinyin:'mù',tone:4,meaning:'Synthetic unit character',traditional:char,strokes:8,elements:['水'],elementBasis:'synthetic unit only',tags:[],warning:'',sourceId:'synthetic-unit'};
 const meaning=row?.editorial?.meaning??'Synthetic unit project explanation';
 const dataVersion=profile.base?.activeVersion??'synthetic-knowledge';
 const source={id:'naming-character-meanings-v7.1-fixed',name:'Synthetic unit use of fixed source identity',url:'',commit:'synthetic',license:'CC0-1.0',files:['data/naming-character-meanings-v7.1-profile.json'],sha256:'0'.repeat(64),note:'No Service or generation algorithm was executed.'};
 const note={caseId:row?.caseId??'synthetic-project-mu',char,projectMeaning:meaning,projectWish:row?.editorial?.projectWish??'Synthetic fixture wish'};
 const candidate={id:session.id+'-candidate',givenName:char,fullName:'林'+char,pinyin:'lín '+character.pinyin,style:'自然',characters:[character],meaning,originalMeaning:meaning,reason:'Synthetic protocol fixture',citations:[],evaluation:{sound:40,meaning:40,simplicity:40,traditional:40,distinctiveness:40},warnings:[],traditionalReason:'Synthetic unit only',favorite:false,origin:'local',reviewNote:'',namingMeaningReview:{version:'naming-editorial-7.1.0',sourceId:'naming-character-meanings-v7.1-fixed',sourceSha256:'0'.repeat(64),packSha256:profile.base?.packSha256??'0'.repeat(64),activeVersion:dataVersion,givenName:char,recordState:'recorded',automaticSemanticCreditAllowed:false,scope:'per-character-project-explanation-only',wholeNameAssessment:'not-assessed',wholeNameMeaning:null,automaticNameRecommendation:false,scoreDelta:0,rows:[{position:1,char,kind:'character-level-project-explanation',applicability:'applicable',characterExplanation:{status:'character-explanations-ready',rows:[note]}}]}};
 const analysis={bazi:{solarDate:birth.birthDate,lunarDate:'synthetic',zodiac:'synthetic',pillars:[],elements:{木:0,火:0,土:0,金:0,水:0},favorable:['土','金','水'],unfavorable:[],strength:'synthetic',reasons:[],seasonalAdvice:'',warnings:[],version:'synthetic-only',ruleDescription:'No algorithm executed'},qimen:{available:false,reason:'Synthetic unit data only'}};
 if(isProject){
  birth.parentNameReadings=[{version:'parent-name-reading/1.0.0',role:'father',fullName:'林沐',surnameLength:1,givenName:'沐',readings:[{index:0,char:'沐',confirmed:true,token:'mu4',origin:'family-confirmed'}]},{version:'parent-name-reading/1.0.0',role:'mother',fullName:'陈子',surnameLength:1,givenName:'子',readings:[{index:0,char:'子',confirmed:true,token:'zi5',origin:'family-confirmed'}]}];
  analysis.projectNamingUse={schema:'project-naming-use/1',selection:clone(preferences.namingElementMethod),sourceRecipe:{schema:'naming-element-source-recipe/1',source:'project',namingRulesVersion:'naming-editorial-7.1.0',applicationPolicyVersion:'naming-element-application/1.0.0'},engineCertificate:{synthetic:true,methodId:'project-bazi-mainchain-145/1.3.1',entryPolicy:'month-branch-only',applicationPolicyVersion:'naming-element-application/1.0.0',effectiveElements:{primary:['土'],secondary:['金'],avoid:[],applied:['土','金']}},application:{policyId:'naming-element-application/1.0.0',status:'applied',primary:['土'],secondary:['金'],avoid:[],effectiveElements:['土','金']}};
  preferences.preferredElements=['水'];candidate.warnings.push(MANUAL_WARNING);
  candidate.parentNamePhoneticReview={version:'parent-name-phonetic-review/1.0.0',recordState:'recorded',sessionId:session.id,candidateId:candidate.id,capture:{mode:'strict',parentNames:{fatherName:'林沐',motherName:'陈子'},readings:clone(birth.parentNameReadings),child:{surname:'林',surnamePinyin:'lín',givenName:'沐',characters:[{char:'沐',pinyin:'mù',tone:4,sourceId:'synthetic-unit'}]}},result:{version:'parent-name-phonetics/1.0.0',mode:'strict',scope:'whole-given-name-syllables-only',childFullName:'林沐',childGivenName:'沐',comparisons:[{role:'father',status:'matched',comparison:'exact',parentFullName:'林沐',parentGivenName:'沐',childGivenName:'沐',actualChildTokens:['mu4'],parentTokens:['mu4'],differentTonePositions:[],reason:'Synthetic unit matching record',confirmedParentReading:clone(birth.parentNameReadings[0])}],readingOrigins:{dictionarySourceIds:[],hasFamilyConfirmedInput:true},notice:'Synthetic fixture only',limitations:[],scoreDelta:0,automaticRejection:false,wholeNameSuitability:'not-assessed'},sourceSnapshot:{method:{...source,id:'parent-name-phonetics/1.0.0'},dictionarySources:[],confirmationPolicy:'family-confirmed-actual-reading'}};
 }
 return{...session,createdAt:'2026-10-22T00:00:00.000Z',profile:birth,preferences,analysis,candidates:[candidate],reviewNote:'Synthetic protocol unit only',originalFavorable:['土','金','水'],dataVersion,sourceSnapshot:{version:'session-sources/1.0.0',dataVersion,sources:[source]},namingRules:{version:'naming-editorial-7.1.0',sourceId:source.id,dataVersion},reviewRevision:1,reviewToken:'synthetic-token-'+session.id};
}

export async function makeDesktop176Fixture({documents=false,releaseDirectory='.local/新版 发布/release',makeScenarioSession,exerciseCalls,scenarioEvidence,equalExitTimestamps=false,runtimeIntervalShiftMs=0}={}){
 need(VERSION==='1.0.38','fixture asset version must be1.0.38');
 const f=await fixture({phased:true,releaseDirectory}),root=f.root;
 const inside=file=>{const absolute=path.resolve(root,file),relative=path.relative(root,absolute);need(relative&&relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative),'fixture file escapes its owned root');return absolute;};
 const read=file=>JSON.parse(fs.readFileSync(inside(file),'utf8'));
 const write=(file,value)=>f.write(path.relative(root,inside(file)),value);
 const ref=async file=>reference(root,inside(typeof file==='string'?file:file.file));
 const writeRef=async(file,value)=>ref(write(file,value));
 const sourceProfile=read('data/naming-character-meanings-v7.1-profile.json');
 const assertions=formalLifecycleAssertions(sourceProfile);
 const report={synthetic:true,scope:'Unit report data only; no tests were executed.',success:true,numFailedTests:0,numFailedTestSuites:0,numPendingTests:0,numTodoTests:0,numTotalTests:13,numPassedTests:13,numTotalTestSuites:2,numPassedTestSuites:2,numPendingTestSuites:0,testResults:[{name:inside('synthetic.test.ts'),status:'passed',assertionResults:[{title:'synthetic unit pass',ancestorTitles:[],status:'passed'}]},{name:inside(SUITE),status:'passed',assertionResults:assertions}]};
 write(f.regressionFile,report);await f.rebind('fullRegression');
 const fortyLifecycleEvidence={report:await ref(f.regressionFile),commandCapture:await ref(f.captures.fullRegression),testSource:await ref(SUITE),inputFreeze:f.freeze,suite:SUITE};
 const materialFiles={resourceContract:'data/desktop176-resource-contract.json',rootFeedbackManifest:'data/desktop176-feedback.json',naming71Profile:'data/naming-character-meanings-v7.1-profile.json',naming71Admission:'data/naming-character-meanings-v7.1-admission.json',naming71Lock:'data/naming-character-meanings-v7.1-source-lock.json',parentMethod:'data/desktop176-parent-method.json',workerReceipt:'dist-electron/cmn-reading-worker-build-receipt.json',applicationTupleSource:'src/shared/naming-element-application.ts'};
 const materialIdentity=Object.fromEntries(await Promise.all(Object.entries(materialFiles).map(async([key,file])=>[key,await ref(file)])));
 const buildGeneratedOutputs=Object.fromEntries(walk(inside('dist-electron')).map(file=>['dist-electron/'+file.replaceAll('\\','/'),sha256(fs.readFileSync(inside('dist-electron/'+file)))]));
 let captureSequence=0;
 const createCapture=async context=>{
  const original=read(f.captures.runtimeRecord),source=context.source,base=context.prefix;
  const stdout=await writeRef(base+'/stdout.log','Synthetic unit capture; no App/IPC/PDF execution.\n'),stderr=await writeRef(base+'/stderr.log','Synthetic empty stderr.\n');
  const outputs=[...new Map(context.outputs.map(row=>[path.resolve(row.file),row])).values()];
  const capture={...original,schema:'naming-studio-command-capture/1',version:VERSION,status:'completed',role:'runtimeRecord',sourceFreeze:f.freeze,freezeAfter:f.freeze,freezeError:null,command:{...original.command,args:[source.file],toolFiles:[source],entryScript:source,cwd:root},pid:40000+(++captureSequence),startedAt:context.startedAt,completedAt:context.completedAt,exitCode:0,signal:null,launchError:null,stdout,stderr,declaredOutputs:outputs.map(row=>row.file),outputs,outputErrors:[],artifacts:[],artifactErrors:[],scope:'SYNTHETIC unit command metadata; no command, App, IPC, printer or process was launched.'};
  return writeRef(base+'/command.json',capture);
 };
 const SQL=await initSQL({locateFile:name=>require.resolve('sql.js/dist/'+name)});
 const proofs=await createModeProofs(f,{SQL,reference,VERSION,workflowSource:await ref('src/main/smoke-desktop-workflow-176.ts'),driverSource:await ref('scripts/gui-acceptance.mjs'),fixed40source:materialIdentity.naming71Profile,materialIdentity,buildGeneratedOutputs,fortyLifecycleEvidence,createCapture,
  makeScenarioSession:makeScenarioSession??(context=>syntheticSession(context,sourceProfile)),exerciseCalls,scenarioEvidence,equalExitTimestamps,
  projectOriginal:({session})=>{const original=clone(session);original.preferences.preferredElements=[];original.candidates.forEach(candidate=>{candidate.warnings=candidate.warnings.filter(warning=>warning!==MANUAL_WARNING);});return original;},
 });
 const final=proofs.modes.Installed.resume,process=read(final.processReceipt.file),raw=read(final.run.file),runtime=read(f.runtimeFile);
 write(f.sqlFile,read(final.installedRuntime.file));
 Object.assign(runtime,{started:runtime.started,terminalAt:process.terminalAt,completed:process.completedAt,installedDir:path.dirname(raw.executable.file),output:path.dirname(final.run.file),result:final.run.file,sqlVerification:f.sqlFile,packageVerificationPostRuntime:f.packageFile,app:{...runtime.app,path:raw.executable.file,pid:raw.pid,startedAt:raw.startedAt,userData:raw.userData,electronRunAsNodePresent:false}});
 Object.assign(runtime,{processEvidence:process.stageProcess,sourceFreeze:f.freeze,buildCapture:await ref(f.captures.buildAndPackage),observedProcessStatus:'completed',observedProcessTimes:{startedAt:process.startedAt,terminalAt:process.terminalAt,completedAt:process.completedAt}});
 if(runtimeIntervalShiftMs)runtime.app.startedAt=new Date(Date.parse(runtime.app.startedAt)+runtimeIntervalShiftMs).toISOString();
 write(f.runtimeFile,runtime);
 for(const role of ['package','installedRuntime','runtimeRecord']){const capture=read(f.captures[role]);capture.completedAt=process.completedAt;write(f.captures[role],capture);await f.rebind(role);}
 const snapshot=await assembleRelease({root,config:f.config,output:'.local/desktop176-execution3'}),executionBundle=await ref(snapshot.file);
 const pdfSource=await ref('scripts/pdf-acceptance.mjs'),pdfs=[],pageImages=[];
 for(const mode of proofs.guiRuns)for(const scenario of mode.exercise.raw.scenarios){
  const image=await writeRef('.local/desktop176-pdf/'+mode.mode+'/'+scenario.scenarioId+'-page1.png',PNG);pageImages.push(image);
  pdfs.push({mode:mode.mode,scenarioId:scenario.scenarioId,phaseID:'exercise',pdf:{file:scenario.pdf.file,sha256:scenario.pdf.sha256,bytes:scenario.pdf.bytes},sessionId:scenario.pdf.sessionId,session:scenario.pdf.snapshot,html:scenario.pdf.html,pageCount:1,pages:[{page:1,image}],content:{status:'passed',missingNodes:0,extraNodes:0,overflowCharacters:0}});
 }
 const pdfResult=await writeRef('.local/desktop176-pdf/qa.json',{schema:'naming-studio-pdf-qa/1',version:VERSION,pdfs,scope:'SYNTHETIC JSON and PNG fixtures only; no PDF renderer or content inspection ran.'});
 const pdfTime=new Date(Math.max(Date.now(),...proofs.guiRuns.map(mode=>Date.parse(read(mode.resume.processReceipt.file).completedAt)),Date.parse(runtime.completed))).toISOString();
 const pdfCapture=await createCapture({source:pdfSource,prefix:'.local/desktop176-pdf/capture',outputs:[pdfResult,...pageImages],startedAt:pdfTime,completedAt:pdfTime});
 const pdfInput={source:pdfSource,commandCapture:pdfCapture,result:pdfResult,visualReview:pdfs.map(row=>({pdf:row.pdf,scope:'representative-pages',pages:[1]}))};
 const adapterConfig={schema:'naming-studio-desktop138-acceptance-inputs/1',releaseDirectory,executionBundle,development:{exercise:phaseRefs(proofs.modes.Development.exercise),resume:phaseRefs(proofs.modes.Development.resume)},installed:{exercise:phaseRefs(proofs.modes.Installed.exercise),resume:phaseRefs(proofs.modes.Installed.resume)},pdf:pdfInput};
 const prepared=await prepareAcceptanceReview({root,config:adapterConfig,output:'.local/desktop176-review-templates'});
 need(prepared.status==='pending-review'&&prepared.approved===false,'adapter must leave original templates unapproved');
 const approvalTime=new Date(Math.max(Date.now(),Date.parse(pdfTime))).toISOString();
 const gui=read(prepared.guiFile),pdf=read(prepared.pdfFile);
 for(const value of [gui,pdf])Object.assign(value,{status:'passed',reviewer:'Synthetic unit reviewer; no actual execution or visual acceptance',reviewedAt:approvalTime});
 const guiAcceptance=await writeRef('.local/desktop176-approved/gui.json',gui),pdfAcceptance=await writeRef('.local/desktop176-approved/pdf.json',pdf);
 const options={root,bundle:executionBundle,releaseDirectory,guiAcceptance,pdfAcceptance};
 if(documents){write('README.md','Synthetic unit publication only: two suites and13 assertions; both modes/four phases are fixture data, not actual native execution.');write('docs/CURRENT-STATUS.md','Synthetic protocol tests only. No application, IPC, GUI or PDF visual acceptance was executed.');}
 let reviewSequence=0;
 const review=async mutate=>{
  const suffix=++reviewSequence,template=await prepareDocumentationReview({...options,output:'.local/desktop176-docs/review-template-'+suffix+'.json'}),value=clone(template.value);
  Object.assign(value,{status:'reviewed',reviewer:'Synthetic unit documentation reviewer',reviewedAt:new Date(Math.max(Date.now(),Date.parse(approvalTime))).toISOString()});if(mutate)await mutate(value);
  return writeRef('.local/desktop176-docs/review-approved-'+suffix+'.json',value);
 };
 if(documents)options.documentationReview=await review();
 const publish=async extra=>publishRelease({...options,output:'.local/publication3',...extra});
 const installRecord=result=>{write(releaseDirectory+'/NamingStudio-'+VERSION+'-verification.json',result.record);write(releaseDirectory+'/NamingStudio-'+VERSION+'-Setup.exe.sha256',result.record.installer.sha256+'  NamingStudio-'+VERSION+'-Setup.exe\n');};
 const verify=extra=>verifyRelease({root,strictLocal:true,releaseDirectory,allowPostReleaseDocs:documents,...extra});
 const updateAcceptance=async(key,mutate)=>{need(['guiAcceptance','pdfAcceptance'].includes(key),'unknown acceptance key');const value=read(options[key].file);await mutate(value);write(options[key].file,value);options[key]=await ref(options[key].file);return options[key];};
 const rewrite=async(original,mutate)=>{const value=read(original.file);await mutate(value);write(original.file,value);return ref(original.file);};
 const rebindCapture=async original=>rewrite(original,async value=>{value.outputs=await Promise.all(value.outputs.map(row=>ref(row.file)));});
 const refs={workflowSource:proofs.workflowSource,driverSource:proofs.driverSource,pdfSource,materialIdentity,fortyLifecycleEvidence,executionBundle,pdfResult,pdfCapture,adapterConfig,pendingGui:await ref(prepared.guiFile),pendingPdf:await ref(prepared.pdfFile),guiAcceptance,pdfAcceptance};
 return{...f,f,options,publish,installRecord,verify,review,guiModes:proofs.guiRuns,proofs,refs,snapshot,prepared,pdfInput,
  helpers:{read,write,reference:ref,writeRef,createCapture,updateAcceptance,rewrite,rebindCapture},
  scope:'Synthetic unit fixtures only. Builder has no process/IPC/PDF-rendering or native-acceptance execution path.'};
}
