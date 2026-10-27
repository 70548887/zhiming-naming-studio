/**
 * Synthetic FS/SQLite fixtures only: no App, command, renderer or tests run here.
 * Required deps: SQL (initialized sql.js), VERSION:'1.0.38', workflowSource,
 * driverSource (a distinct frozen .mjs), buildGeneratedOutputs, fixed40source,
 * materialIdentity (seven frozen refs plus the generated pinned worker receipt),
 * fortyLifecycleEvidence (owner's full report/capture/testSource/inputFreeze/suite),
 * makeScenarioSession(context), createCapture(context).
 * Optional: reference(root,file), writeNew({root,file,relative,bytes}),
 * exerciseCalls(context), scenarioEvidence(context), makeLiveRuntime(context),
 * projectOriginal(context), workerReceiptSchema (optional exact schema pin).
 * Domain payloads/traces remain caller-owned; no forty-request GUI loop exists.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const SCENARIO_IDS=Object.freeze(['legacy70-canonical','naming71-character40','project131-family-review']);
export const FORMAL_TEST_SOURCE_SHA256='6d50181287cfe94acdbff66644e3f5bbec42e72cbb40317787a29c61c83222f9';
const SUITE='tests/naming-v71-service-core.test.ts',WORKFLOW='desktop176/1';
const REPRESENTATIVES=Object.freeze(['静','南','黎']);
const MATERIAL_KEYS=['resourceContract','rootFeedbackManifest','naming71Profile','naming71Admission','naming71Lock','parentMethod','workerReceipt','applicationTupleSource'];
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGMU0bBhYGBgYgADAAWiAHylyrQdAAAAAElFTkSuQmCC','base64');
const copy=value=>structuredClone(value);
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new Error('Dual-mode synthetic fixture: '+message);};
const rows=(db,table)=>db.exec('SELECT id,json FROM '+table)[0]?.values??[];

export async function createModeProofs(f,deps={}){
 if(!deps.SQL?.Database||typeof deps.makeScenarioSession!=='function'||typeof deps.createCapture!=='function')fail('SQL plus explicit domain-session/capture factories are required');
 const version=deps.VERSION??f.config?.version;
 const root=fs.realpathSync.native(path.resolve(f.root));
 const within=value=>{
  if(typeof value!=='string'||!value||/[\u0000-\u001f]/u.test(value))fail('invalid file path');
  const absolute=path.resolve(root,value),relative=path.relative(root,absolute);
  if(!relative||relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))fail('all files must stay inside f.root');
  let current=root;for(const part of relative.split(path.sep)){current=path.join(current,part);try{if(fs.lstatSync(current).isSymbolicLink())fail('filesystem aliases are forbidden');}catch(error){if(error.code!=='ENOENT')throw error;}}
  return absolute;
 };
 const read=file=>JSON.parse(fs.readFileSync(within(file),'utf8'));
 const pkgIdentity=read('package.json');
 if(version!=='1.0.38'||pkgIdentity.version!==version||pkgIdentity.name!=='synthetic-naming-fixture')fail('only an isolated synthetic-naming-fixture package at 1.0.38 is supported');
 const reference=async value=>{
  const file=within(typeof value==='string'?value:value?.file);if(!fs.statSync(file).isFile())fail('reference requires a regular file');
  const bytes=fs.readFileSync(file),actual={file,sha256:hash(bytes),bytes:bytes.length};
  if(typeof value==='object'&&(value.sha256!==actual.sha256||value.bytes!==actual.bytes))fail('supplied reference identity differs');
  if(deps.reference){const ref=await deps.reference(root,file);if(within(ref.file)!==file||ref.sha256!==actual.sha256||ref.bytes!==actual.bytes)fail('reference callback changed identity');}
  return actual;
 };
 const generated=[];
 const writeNew=async(relative,value)=>{
  const file=within(relative);if(fs.existsSync(file))fail('refusing overwrite: '+path.relative(root,file));
  const bytes=typeof value==='string'||value instanceof Uint8Array?value:JSON.stringify(value,null,2)+'\n';
  fs.mkdirSync(path.dirname(file),{recursive:true});within(file);
  if(deps.writeNew){const out=await deps.writeNew({root,file,relative:path.relative(root,file),bytes});if(out&&within(typeof out==='string'?out:out.file)!==file)fail('write callback changed target');}
  else fs.writeFileSync(file,bytes,{flag:'wx'});
  const ref=await reference(file);if(ref.sha256!==hash(bytes))fail('write callback changed bytes');generated.push(ref);return ref;
 };
 const inputFreeze=await reference(f.freeze?.file??f.config?.inputFreeze?.file),freeze=read(inputFreeze.file);
 const frozen=async(value,label)=>{
  if(!value||typeof value!=='object')fail(label+' needs an exact supplied reference');
  const ref=await reference(value),relative=path.relative(root,ref.file).replaceAll('\\','/');
  if(freeze.files?.[relative]!==ref.sha256)fail(label+' was not originally frozen');return ref;
 };
 const workflowSource=await frozen(deps.workflowSource,'workflowSource'),driverSource=await frozen(deps.driverSource,'driverSource');
 if(path.relative(driverSource.file,workflowSource.file)===''||!driverSource.file.endsWith('.mjs'))fail('driverSource must be a distinct frozen .mjs driver');
 const fixed40source=await frozen(deps.fixed40source,'fixed40source'),profile=read(fixed40source.file);
 if(!Array.isArray(profile.cases)||profile.cases.length!==40||new Set(profile.cases.map(row=>row.caseId)).size!==40||profile.cases.some(row=>typeof row.caseId!=='string'||!row.caseId))fail('fixed40source must contain forty unique actual caseIds');
 for(const char of REPRESENTATIVES)if(!profile.cases.some(row=>row.char===char))fail('missing representative '+char);
 const materialIdentity={};
 for(const key of MATERIAL_KEYS){
  if(key!=='workerReceipt'){materialIdentity[key]=await frozen(deps.materialIdentity?.[key],'materialIdentity.'+key);continue;}
  const supplied=deps.materialIdentity?.workerReceipt;if(!supplied||typeof supplied!=='object')fail('workerReceipt needs an exact supplied reference');
  const receipt=await reference(supplied),relative='dist-electron/cmn-reading-worker-build-receipt.json',pinned=deps.buildGeneratedOutputs?.[relative];
  if(path.relative(receipt.file,within(relative))!==''||typeof pinned!=='string'||pinned!==receipt.sha256)fail('workerReceipt must match the fixed path and buildGeneratedOutputs SHA');
  const body=read(receipt.file);
  if(body.schema!==(deps.workerReceiptSchema??'cmn-worker-build-receipt/1'))fail('workerReceipt requires the pinned version1 JSON schema');
  materialIdentity.workerReceipt=receipt;
 }
 const formal=deps.fortyLifecycleEvidence;if(formal?.suite!==SUITE)fail('owner must supply the complete twelve-case lifecycle evidence');
 const fortyLifecycleEvidence={
  report:await reference(formal.report),commandCapture:await reference(formal.commandCapture),
  testSource:await frozen(formal.testSource,'formal test source'),inputFreeze:await reference(formal.inputFreeze),suite:SUITE,
 };
 if(fortyLifecycleEvidence.testSource.file!==within(SUITE)||fortyLifecycleEvidence.testSource.sha256!==FORMAL_TEST_SOURCE_SHA256)fail('formal test source differs from its fixed owner identity');
 if(fortyLifecycleEvidence.inputFreeze.file!==inputFreeze.file||fortyLifecycleEvidence.inputFreeze.sha256!==inputFreeze.sha256)fail('formal lifecycle evidence uses another input freeze');
 // Full formal reports/captures are supplied, never synthesized or rewritten.
 const baseSql=read(f.sqlFile),baseRuntime=read(f.runtimeFile),basePackage=read(f.packageFile),baseSession=read(baseSql.bindings[0].snapshotFile);
 const originalDb=within(baseSql.database.path),originalBytes=fs.readFileSync(originalDb),originalSha=hash(originalBytes);
 if(originalSha!==baseSql.database.sha256Before||originalSha!==baseSql.database.sha256After)fail('baseline SQLite bytes already differ');
 const directory=deps.outputDirectory??'.local/desktop176-prototype';within(directory);
 if(fixed40source.file!==materialIdentity.naming71Profile.file||fixed40source.sha256!==materialIdentity.naming71Profile.sha256)fail('inventory must use the exact material naming71 profile');
 const epoch=Math.max(Date.parse(baseRuntime.completed??baseRuntime.terminalAt),Date.parse(freeze.frozenAt));if(!Number.isFinite(epoch))fail('missing fixture timestamps');
 const timestamp=new Date(epoch).toISOString(),guiRuns=[],modes={},coverageInventory40ByMode={};
 for(const[modeIndex,mode]of ['Development','Installed'].entries()){
  const modeStart=generated.length,prefix=directory+'/'+mode.toLowerCase(),userData=within(prefix+'/user'),groups=[],db=new deps.SQL.Database(new Uint8Array(originalBytes));
  const coverageInventory40=await writeNew(prefix+'/exercise/coverage-inventory40.json',{
   schema:'desktop176-inventory40/1',workflowId:WORKFLOW,appVersion:version,namingRulesVersion:'naming-editorial-7.1.0',source:fixed40source,count:40,
   rows:profile.cases.map(row=>({caseId:row.caseId,char:row.char,selectedPinyin:row.selectedPinyin,tone:row.tone})),
   generationCoverage:'representative-only',representatives:[...REPRESENTATIVES],explanationReadScope:'actual-fixed-main-loader-not-a-new-IPC-endpoint',
  });coverageInventory40ByMode[mode]=coverageInventory40;
  let bytes,sessionRows,profileRows,revisionRows,archiveRows;
  try{
   if(db.exec('PRAGMA integrity_check')[0]?.values?.[0]?.[0]!=='ok')fail('baseline SQLite integrity failed');
   const legacyRows=rows(db,'sessions'),legacy=legacyRows.map(([,json])=>JSON.parse(String(json)));
   if(legacy.length!==3||legacy.some(session=>session.namingRules?.version!=='naming-editorial-7.0.0'))fail('caller must seed exactly three existing legacy70 sessions before constructing proofs');
   const previousRevisionIds=rows(db,'revisions').map(([id])=>Number(id));
   if(previousRevisionIds.some(id=>!Number.isSafeInteger(id)||id<0))fail('caller must seed numeric baseline revision IDs');
   let revisionId=Math.max(0,...previousRevisionIds);
   for(const scenarioId of SCENARIO_IDS){
    if(scenarioId==='legacy70-canonical'){groups.push({scenarioId,sessions:copy(legacy)});continue;}
    const reps=scenarioId==='naming71-character40'?REPRESENTATIVES:[null],sessions=[];
    for(const[index,representative]of reps.entries()){
     const id='desktop176-'+mode+'-exercise-'+scenarioId+'-'+index,session=copy(baseSession);
     session.id=id;session.profileId=id+'-profile';session.profile={...session.profile,id:session.profileId};
     const value=await deps.makeScenarioSession({mode,scenarioId,representative,index,session,baseSession:copy(baseSession),fixed40source,materialIdentity,coverageInventory40});
     if(!value||value.id!==id||value.profileId!==id+'-profile'||value.profile?.id!==value.profileId)fail('domain factory must retain assigned session/profile IDs');
     const json=JSON.stringify(value);db.run('INSERT INTO profiles(id,json) VALUES (?,?)',[value.profileId,JSON.stringify(value.profile)]);
     db.run('INSERT INTO sessions(id,json) VALUES (?,?)',[value.id,json]);db.run('INSERT INTO revisions(id,json) VALUES (?,?)',[String(++revisionId),json]);sessions.push(copy(value));
    }
    groups.push({scenarioId,sessions});
   }
   sessionRows=rows(db,'sessions');profileRows=rows(db,'profiles');revisionRows=rows(db,'revisions');archiveRows=db.exec('SELECT sha256,version,pack FROM knowledge_archives')[0]?.values??[];
   if(db.exec('PRAGMA integrity_check')[0]?.values?.[0]?.[0]!=='ok')fail('mode SQLite integrity failed');bytes=db.export();
  }finally{db.close();}
  const database=await writeNew(prefix+'/user/customers.sqlite',bytes),bindings=[];
  for(const[index,[id,json]]of sessionRows.entries()){
   const snapshot=await writeNew(prefix+'/snapshots/session-'+index+'.json',JSON.parse(String(json)));
   bindings.push({sessionId:String(id),snapshotFile:snapshot.file,snapshotSha256:snapshot.sha256,sqlJsonSha256:hash(String(json)),completeCurrentSqlJsonEqual:true});
  }
  if(sessionRows.length!==7)fail('mode must contain exactly three legacy70, three naming71 and one project session');
  const histories=revisionRows.map(([id,json])=>{const session=JSON.parse(String(json));return{id:Number(id),sessionId:session.id,createdAt:session.createdAt??timestamp,session};});
  const projectSession=groups.find(group=>group.scenarioId==='project131-family-review').sessions[0];
  const projectOriginal=deps.projectOriginal?await deps.projectOriginal({mode,session:copy(projectSession)}):copy(projectSession);
  const stateValue={database,
   current:sessionRows.map(([id,json])=>({id:String(id),canonical:JSON.stringify(JSON.parse(String(json))),rawSha256:hash(String(json))})),
   history:revisionRows.map(([id,json])=>({id:Number(id),sessionId:JSON.parse(String(json)).id,raw:String(json),rawSha256:hash(String(json))})),
   profiles:profileRows.map(([id,json])=>({id:String(id),canonical:JSON.stringify(JSON.parse(String(json))),rawSha256:hash(String(json))})),projectOriginal,
  };
  const state=await writeNew(prefix+'/exercise-state.json',stateValue);
  const scenarioSessionIds=Object.fromEntries(groups.map(group=>[group.scenarioId,group.sessions.map(session=>session.id)]));
  const exercisePid=baseRuntime.app.pid+1000*(modeIndex+1),resumePid=exercisePid+1;if(!Number.isSafeInteger(exercisePid)||exercisePid<=0)fail('missing synthetic application PID');
  const rendererOnboarding={schema:'desktop176-renderer-onboarding/1',phaseID:'exercise',storageKey:'studio.onboarding.v1',rawValue:'{"version":1,"dismissed":true}',guideVisible:false,observation:'read-only-production-preference'};
  const resumeSeal=await writeNew(prefix+'/resume-seal.json',{schema:'desktop176-resume-seal/1',workflowId:WORKFLOW,appVersion:version,mode,exercisePid,userData,inputFreeze,workflowSource,database,state,scenarioSessionIds,rendererOnboarding});
  let executable,installedAsar;
  if(mode==='Installed'){
   executable=await reference(baseRuntime.app.path);installedAsar=await reference(basePackage.asar.installed??f.config.installedAsar);
  }else{
   const appDirectory=prefix+'/app';
   for(const row of basePackage.runtimeFiles??[]){
    if(typeof row.path!=='string'||path.isAbsolute(row.path)||path.win32.isAbsolute(row.path)||row.path.replaceAll('\\','/').split('/').some(part=>!part||part==='.'||part==='..'))fail('invalid baseline runtime file');
    await writeNew(appDirectory+'/'+row.path,fs.readFileSync(within(path.join(baseRuntime.installedDir,row.path))));
   }
   executable=await reference(appDirectory+'/'+path.basename(baseRuntime.app.path));installedAsar=await reference(appDirectory+'/resources/app.asar');
  }
  const pkg=copy(basePackage);pkg.asar.installed=installedAsar.file;pkg.asar.installedSha256=installedAsar.sha256;
  const packageProof=await writeNew(prefix+'/package-proof.json',pkg),pdfs=[],scenarioBase=[];
  for(const group of groups){
   const session=group.sessions[0],snapshot=await reference(bindings.find(row=>row.sessionId===session.id).snapshotFile);
   const pdfRef=await writeNew(prefix+'/exercise/exports/'+group.scenarioId+'.pdf',fs.readFileSync(within(baseSql.pdfs[0].path)));
   const html=await writeNew(prefix+'/exercise/exports/'+group.scenarioId+'.html','<!doctype html><meta charset="utf-8"><p>Synthetic '+group.scenarioId+' fixture only.</p>');
   const image=await writeNew(prefix+'/exercise/screenshots/'+group.scenarioId+'.png',PNG);
   const pdf={...pdfRef,sessionId:session.id,snapshot,html,phaseID:'exercise'},screenshot={...image,mime:'image/png',width:2,height:2,phaseID:'exercise'};
   const evidence={sessions:await Promise.all(group.sessions.map(value=>reference(bindings.find(row=>row.sessionId===value.id).snapshotFile))),state,...group.scenarioId==='naming71-character40'?{coverageInventory40,representatives:[...REPRESENTATIVES]}:{}};
   if(deps.scenarioEvidence)Object.assign(evidence,await deps.scenarioEvidence({mode,group:copy(group),evidence:copy(evidence),prefix,writeNew,reference}));
   scenarioBase.push({scenarioId:group.scenarioId,status:'passed',customerIds:group.sessions.map(value=>value.profileId),sessionIds:group.sessions.map(value=>value.id),responseRequestIds:[],screenshot,pdf,artifactPhase:'exercise',evidence});pdfs.push(pdf);
  }
  const result=await writeNew(prefix+'/runtime-result.json',{appVersion:version,mode,synthetic:true,scenarioSessionIds}),sql=copy(baseSql);
  Object.assign(sql,{
   schema:'naming-studio-installed-sql/1',expectedVersion:version,bindings,historyBindings:revisionRows.map(([id,json])=>({revisionId:String(id),sqlJsonSha256:hash(String(json)),completeHistorySqlJsonEqual:true})),
   archiveBindings:archiveRows.map(([sha256,archiveVersion,pack])=>{if(hash(Buffer.from(pack))!==String(sha256))fail('cloned archive bytes differ');return{sha256:String(sha256),version:String(archiveVersion),contentHashExact:true};}),
   pdfs:pdfs.map(pdf=>({path:pdf.file,sha256:pdf.sha256,bytes:pdf.bytes})),resultFile:result.file,resultSha256:result.sha256,runtimeResultSha256:result.sha256,
   database:{...baseSql.database,path:database.file,sha256Before:database.sha256,sha256After:database.sha256,unchanged:true,profiles:profileRows.length,sessions:sessionRows.length,revisions:revisionRows.length,archives:archiveRows.length},
   summary:{...baseSql.summary,actualSessionBindings:sessionRows.length,pdfCount:pdfs.length},
  });
  const exerciseSql=await writeNew(prefix+'/exercise/sql-proof.json',{schema:'desktop176-exercise-sql/1',...copy(stateValue)});
  const assertSealed=()=>{if(hash(fs.readFileSync(database.file))!==database.sha256||hash(fs.readFileSync(state.file))!==state.sha256)fail('read-only resume changed sealed SQLite/state bytes');};
  const emitCalls=async(phaseID,scenarioId,calls,output)=>{
   const ids=[];
   for(const call of calls){
    if(!call||typeof call.method!=='string'||!Array.isArray(call.args)||!Object.hasOwn(call,'response'))fail('call factory must supply complete structured request/response values');
    const responseKind=call.responseKind??'resolved';if(!['resolved','rejected'].includes(responseKind))fail('invalid responseKind');
    if(phaseID==='resume'&&(!['bootstrap','listHistory'].includes(call.method)||responseKind!=='resolved'))fail('resume allows only resolved bootstrap/listHistory');
    const requestId='desktop176-'+mode+'-'+phaseID+'-'+String(output.length+1).padStart(4,'0');
    const request=await writeNew(prefix+'/'+phaseID+'/responses/'+requestId+'-request.json',{requestId,scenarioId,method:call.method,args:copy(call.args)});
    const serializedResponse=JSON.stringify(copy(call.response));if(typeof serializedResponse!=='string')fail('response must have a complete JSON representation');
    const response=await writeNew(prefix+'/'+phaseID+'/responses/'+requestId+'-response.json',serializedResponse+'\n');
    output.push({requestId,scenarioId,method:call.method,responseKind,transport:'renderer-preload-ipc',serialization:'complete-JSON-of-structured-value-as-received',request,response});ids.push(requestId);
   }
   if(!ids.length)fail('scenario requires this phase\'s original response files');return ids;
  };
  const exerciseResponses=[],exerciseScenarios=copy(scenarioBase);
  for(const scenario of exerciseScenarios)scenario.evidence.rendererOnboarding=copy(rendererOnboarding);
  for(const[index,group]of groups.entries()){
   let calls;
   if(deps.exerciseCalls)calls=await deps.exerciseCalls({mode,group:copy(group),histories:copy(histories),projectOriginal:copy(projectOriginal),profile:copy(profile)});
   else if(group.scenarioId==='legacy70-canonical')calls=[{method:'bootstrap',args:[],response:{sessions:group.sessions}},...group.sessions.map(session=>({method:'listHistory',args:[session.id],response:histories.filter(row=>row.sessionId===session.id)}))];
   else if(group.scenarioId==='naming71-character40')calls=[
    ...profile.cases.map(row=>({method:'searchCharacters',args:[row.char],response:[copy(row.baselineCharacter??{char:row.char})]})),
    ...group.sessions.flatMap((session,index)=>[{method:'generate',args:[session.profile,{...session.preferences,generationChar:REPRESENTATIVES[index]}],response:{session,messages:[]}},{method:'saveSession',args:[session],response:session}]),
   ];
   else calls=[{method:'generate',args:[projectOriginal.profile,projectOriginal.preferences],response:{session:projectOriginal,messages:[]}},{method:'saveSession',args:[group.sessions[0]],response:group.sessions[0]}];
   exerciseScenarios[index].responseRequestIds=await emitCalls('exercise',group.scenarioId,calls,exerciseResponses);
  }
  const makePhase=async({phaseID,pid,scenarios,originalResponses,installedRuntime:mainSnapshotSql,resumeEvidence,firstOutput})=>{
   const startedAt=new Date(epoch+modeIndex*2+(phaseID==='resume'?1:0)).toISOString(),terminalAt=new Date(Date.parse(startedAt)+(deps.equalExitTimestamps?0:1)).toISOString();
   const context={mode,phaseID,pid,executable,userData,startedAt,completedAt:startedAt,inputFreeze,workflowSource,sqlProof:mainSnapshotSql};
   const live=deps.makeLiveRuntime?await deps.makeLiveRuntime(copy(context)):{schema:'desktop176-live-process/1',appVersion:version,...context,exitCode:null,postExitReceipt:'outer-driver-only',runtimeVersions:{electron:'synthetic-no-real-execution'},app:{path:executable.file,pid,startedAt,userData,electronRunAsNodePresent:false}};
   // This file precedes its result/outer receipt, avoiding a post-exit SHA cycle.
   const runtimeProcess=await writeNew(prefix+'/'+phaseID+'/live-process.json',live);
   const raw={
    schema:'naming-studio-desktop176-result/1',workflowId:WORKFLOW,appVersion:version,mode,phaseID,status:phaseID==='exercise'?'awaiting-resume':'completed',
    captureCompleteness:'full-original-responses',pid,executable,userData,startedAt,completedAt:startedAt,inputFreeze,workflowSource,materialIdentity,
    runtimeProcess,sqlProof:mainSnapshotSql,originalResponses,scenarios,reopenScope:phaseID==='exercise'?'renderer-reload-and-store-reopen':'separate-process-resume',
    generationCoverage:'representative-only',coverageInventory40,fortyLifecycleEvidence,resumeSeal,...resumeEvidence?{resumeEvidence}:{},
    AIEnabled:false,networkAttempts:[],rendererNetworkAttempts:[],nativeExecutionRequiredForAcceptance:true,
    scope:'Synthetic FS/SQLite test data only; no App, IPC, GUI, printer, natural exit or process resume was executed.',
   };
   const run=await writeNew(prefix+'/'+phaseID+'/result.json',raw);
   const buildCapture=await reference(f.captures.buildAndPackage),builtAsar=await reference(f.config.builtAsar);
   const stageProcess=await writeNew(prefix+'/'+phaseID+'/original-smoke-process.json',{
    schema:'naming-studio-smoke-process/1',version,mode,scope:'naming-v7',status:'completed',pid,startedAt,terminalAt,completedAt:terminalAt,exitCode:0,signal:null,launchError:null,
    executable,result:run,database,builtAsar,installedAsar:mode==='Installed'?installedAsar:null,sourceFreeze:inputFreeze,buildCapture,
    environment:{NAMING_STUDIO_SMOKE_SCOPE:'naming-v7',NAMING_STUDIO_SMOKE_EXIT:'1',NAMING_STUDIO_DESKTOP_WORKFLOW:'176',NAMING_STUDIO_USER_DATA:userData,NAMING_STUDIO_SMOKE:path.dirname(run.file)},
    normalCustomerDataUsed:false,normalProcessesTerminated:false,electronRunAsNodePresent:false,developerToolsPathRemoved:mode==='Installed',
    scopeNote:'Synthetic unit evidence only. No actual App, launcher or natural exit was observed.',
   });
   // Main SQL precedes raw result; external SQL binds that completed raw result.
   // Nothing in raw result points back to the external SQL file.
   const externalSql=copy(sql);
   Object.assign(externalSql,{resultFile:run.file,resultSha256:run.sha256,runtimeResultSha256:run.sha256,sourceFreeze:inputFreeze,processEvidence:stageProcess,identity:{executable,builtAsar,installedAsar:mode==='Installed'?installedAsar:null}});
   const installedRuntime=await writeNew(prefix+'/'+phaseID+'/external-sql-proof.json',externalSql);
   const processReceipt=await writeNew(prefix+'/'+phaseID+'/process-receipt.json',{
    schema:'naming-studio-desktop176-process/1',appVersion:version,mode,phaseID,pid,executable,userData,startedAt,terminalAt,completedAt:terminalAt,
    exitCode:0,naturalExit:true,result:run,inputFreeze,workflowSource,stageProcess,
   });
   const outputs=generated.slice(firstOutput);
   const created=await deps.createCapture({f,root,mode,phaseID,prefix:prefix+'/'+phaseID,source:driverSource,driverSource,workflowSource,inputFreeze,pid,startedAt,completedAt:terminalAt,
    raw,run,rawResult:run,processReceipt,mainSnapshotSql,installedRuntime,runtimeProcess,outputs:[...outputs],writeNew,reference});
   const commandCapture=await reference(created);return{source:driverSource,commandCapture,run,processReceipt,mainSnapshotSql,installedRuntime,runtimeProcess,raw,outputs};
  };
  const exercise=await makePhase({phaseID:'exercise',pid:exercisePid,scenarios:exerciseScenarios,originalResponses:exerciseResponses,installedRuntime:exerciseSql,firstOutput:modeStart});
  assertSealed();
  const resumeStart=generated.length,reopened=new deps.SQL.Database(new Uint8Array(fs.readFileSync(database.file)));
  let reopenedSessions,reopenedProfiles,reopenedHistories;
  try{
   if(reopened.exec('PRAGMA integrity_check')[0]?.values?.[0]?.[0]!=='ok')fail('resume SQLite integrity failed');
   reopenedSessions=rows(reopened,'sessions').map(([,json])=>JSON.parse(String(json)));reopenedProfiles=rows(reopened,'profiles').map(([,json])=>JSON.parse(String(json)));
   reopenedHistories=rows(reopened,'revisions').map(([id,json])=>{const session=JSON.parse(String(json));return{id:Number(id),sessionId:session.id,createdAt:session.createdAt??timestamp,session};});
  }finally{reopened.close();}
  if(JSON.stringify(reopenedSessions)!==JSON.stringify(sessionRows.map(([,json])=>JSON.parse(String(json))))||JSON.stringify(reopenedHistories)!==JSON.stringify(histories))fail('resume changed complete current/history snapshots');
  const resumeResponses=[],resumeScenarios=copy(scenarioBase);
  for(const[index,group]of groups.entries()){
   resumeScenarios[index].evidence.resume={newPid:resumePid,exercisePid,bootstrapAndHistoryPreserved:true,readOnly:true};resumeScenarios[index].evidence.rendererOnboarding={...rendererOnboarding,phaseID:'resume'};
   const boot={profiles:reopenedProfiles,sessions:reopenedSessions,settings:{studioName:'Synthetic fixture',contact:'',logoDataUrl:'',apiBaseUrl:'',model:'',timeoutMs:1000,hasApiKey:false,useAi:false},sources:[],stats:{characters:0,citations:0,knowledge:0,dataVersion:'synthetic-only'},desktop:true};
   const calls=[{method:'bootstrap',args:[],response:boot},...group.sessions.map(session=>({method:'listHistory',args:[session.id],response:reopenedHistories.filter(row=>row.sessionId===session.id)}))];
   resumeScenarios[index].responseRequestIds=await emitCalls('resume',group.scenarioId,calls,resumeResponses);
  }
  const resumeSql=await writeNew(prefix+'/resume/sql-proof.json',{schema:'desktop176-resume-sql/1',unchanged:true,seal:resumeSeal,before:copy(stateValue),after:copy(stateValue)});assertSealed();
  const resume=await makePhase({phaseID:'resume',pid:resumePid,scenarios:resumeScenarios,originalResponses:resumeResponses,installedRuntime:resumeSql,firstOutput:resumeStart,
   resumeEvidence:{exercisePid,resumePid,exerciseResult:exercise.run,exerciseProcessReceipt:exercise.processReceipt,runtimeInputBefore:copy(resumeSeal),runtimeInputAfter:copy(resumeSeal)},
  });
  assertSealed();guiRuns.push({mode,exercise,resume});modes[mode]={mode,userData,database,state,resumeSeal,packageProof,installedAsar,executable,scenarioSessionIds,exercise,resume};
 }
 if(hash(fs.readFileSync(originalDb))!==originalSha)fail('baseline database changed');
 return{synthetic:true,root,guiRuns,modes,driverSource,workflowSource,coverageInventory40:coverageInventory40ByMode.Development,coverageInventory40ByMode,fixed40source,fortyLifecycleEvidence,generated,
  pending:['Exact exercise domain-operation traces/evidence are caller-owned via exerciseCalls/scenarioEvidence.','Outer process receipt follows the requested naming-studio-desktop176-process/1 schema; no process was launched.']};
}
