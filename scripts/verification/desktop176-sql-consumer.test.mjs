import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {assertSqlSchemaForNamespace,assertDesktop176SqlProof,DESKTOP176_SQL_SCHEMA,LEGACY_SQL_SCHEMA} from './desktop176-sql-consumer.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=value=>JSON.stringify(value,(_,child)=>child&&typeof child==='object'&&!Array.isArray(child)?Object.fromEntries(Object.entries(child).sort(([a],[b])=>a<b?-1:a>b?1:0)):child);
const NS3='naming-studio-release-verification/3';
const CASES=['legacy70-canonical','naming71-character40','project131-family-review'];

function fixture({factStatus='verified-builtin',deriveFactOnly=false,casFault,selectedPhase='resume'}={}){
 const root=path.resolve(process.cwd(),'virtual-desktop176-consumer');
 const files=new Map(),compared=[];
 const add=(name,value,{binary=false}={})=>{
  const file=path.join(root,name),bytes=binary?Buffer.from(value):Buffer.from(JSON.stringify(value));
  const ref={file,sha256:sha(bytes),bytes:bytes.length};files.set(path.resolve(file),bytes);return ref;
 };
 const compare=async(file)=>{compared.push(file);const bytes=files.get(path.resolve(file));assert.ok(bytes,'mock input missing: '+file);return{file,sha256:sha(bytes),bytes:bytes.length};};
 const loadRef=async ref=>files.get(path.resolve(ref.file))?.toString('utf8');
 const storeSource=add('src/main/store.ts','frozen Store source',{binary:true});
 const entrySource=add('src/main/store-replay-entry.ts','reader entry',{binary:true});
 const workflowSource=add('src/main/smoke-desktop-workflow-176.ts','workflow',{binary:true});
 const bundle=add('reader/bundle.cjs','compiled full reader',{binary:true});
 const wasm=add('reader/sql-wasm.wasm',[0,97,115,109],{binary:true});
 const buildScript=add('reader/build.mjs','reader build',{binary:true});
 const rootPackage=add('package.json',{name:'naming-studio',version:'1.0.38'});
 const rootPackageLock=add('package-lock.json',{lockfileVersion:3});
 const sqlRuntimeJavaScript=add('reader/sql-wasm.js','sql runtime',{binary:true});
 const sqlRuntimePackage=add('reader/sql-package.json',{name:'sql.js'});
 const checkerSources={
  bindings:add('checker/bindings.mjs','bindings',{binary:true}),
  entry:add('checker/entry.mjs','entry',{binary:true}),
  safePaths:add('checker/safe-paths.mjs','safe paths',{binary:true}),
  semanticGate:add('checker/semantic-gate.mjs','semantic gate',{binary:true})
 };
 const closure={schema:'naming-studio-store-replay-build/1',applicationVersion:'1.0.38',manifestSourceRoot:root,
  outputs:{reader:bundle},sqlRuntime:{wasm,javascript:sqlRuntimeJavaScript,package:sqlRuntimePackage},storeSource,
  entrySource,buildScript,rootPackage,rootPackageLock,
  sourceInputs:[{...storeSource,kind:'source'},{...entrySource,kind:'source'}]};
 const closureRef=add('reader/manifest.json',closure);
 const freeze=add('input-freeze.json',{schema:'naming-studio-test-input-freeze/1',version:'1.0.38',
  files:{'src/main/store.ts':storeSource.sha256,'src/main/store-replay-entry.ts':entrySource.sha256}});
 const build=add('build-capture.json',{schema:'naming-studio-command-capture/1',role:'buildAndPackage',version:'1.0.38',
  status:'completed',exitCode:0,sourceFreeze:freeze,freezeAfter:freeze});
 const executable=add('app/NamingStudio.exe','native executable',{binary:true});
 const database=add('user/customers.sqlite','sqlite bytes',{binary:true});
 const archiveBytes=Buffer.from('knowledge archive'),archiveSha=sha(archiveBytes);
 const facts={version:'candidate-facts/1.0.0',status:factStatus,dataVersion:'pack-v1',datasetSha256:archiveSha};
 const warning='人工喜用选择已修改，此批候选保留生成时的用字依据；重新生成可应用新选择。';
 const projectProfile={id:'profile-6',fatherName:'林沐',motherName:'陈子',namingPreferences:{preferredElements:[]},
  parentNameReadings:[{role:'father',readings:[{token:'mu4'}]},{role:'mother',readings:[{token:'zi5'}]}]};
 const ordinary=Array.from({length:6},(_,index)=>({id:'session-'+index,profileId:'profile-'+index,dataVersion:'pack-v1',
  profile:{id:'profile-'+index},preferences:{preferredElements:[]},reviewNote:'saved',reviewRevision:index<3?2:1,
  reviewToken:'before-'+index,factVerification:structuredClone(facts)}));
 if(deriveFactOnly)delete ordinary[0].factVerification;
 const A={id:'session-6',profileId:'profile-6',dataVersion:'pack-v1',profile:projectProfile,
  preferences:{preferredElements:[]},analysis:{bazi:{favorable:['土','金','水']},projectNamingUse:{selection:{methodId:'project-bazi-mainchain-145/1.3.1'},
   sourceRecipe:{applicationPolicyVersion:'naming-element-application/1.0.0',namingRulesVersion:'naming-editorial-7.1.0'},
   application:{effectiveElements:['土','金']},engineCertificate:{effectiveElements:{applied:['土','金']}}}},
  sourceSnapshot:{source:'project-original'},originalFavorable:['土','金','水'],namingRules:{version:'naming-editorial-7.1.0'},
  candidates:[{id:'candidate-6',givenName:'沐',evaluation:{traditional:40},warnings:[],parentNamePhoneticReview:{result:{comparisons:[{role:'father',status:'matched'}]}}}],
  reviewNote:'',reviewRevision:0,reviewToken:'token-A',factVerification:structuredClone(facts)};
 const B=structuredClone(A);B.preferences.preferredElements=['水'];B.reviewNote='desktop176保存人工水草稿，仍保留原项目采用';
 B.candidates[0].warnings.push(warning);B.reviewRevision=1;B.reviewToken='token-B';
 const C={...structuredClone(B),reviewNote:'desktop176归档真实水草稿',reviewRevision:2,reviewToken:'token-C'};
 if(casFault==='c-same-token')C.reviewToken=B.reviewToken;
 if(casFault==='c-no-increment')C.reviewRevision=B.reviewRevision;
 if(casFault==='c-mutated-source')C.sourceSnapshot.source='changed-outside-review-note';
 const D={...structuredClone(B),reviewRevision:3,reviewToken:'token-D'};
 const E={...structuredClone(D),reviewNote:'只存在于备份后的改动',reviewRevision:4,reviewToken:'token-E'};
 const F={...structuredClone(D),reviewToken:'token-F'};
 const beforeSessions=[...ordinary,D],sessions=[...ordinary.map((row,index)=>({...structuredClone(row),reviewToken:'final-'+index})),F];
 const profileValues=[...ordinary.map(row=>row.profile),projectProfile];
 const profiles=profileValues.map(row=>({id:row.id,json:JSON.stringify(row)}));
 const sqlSessions=sessions.map(row=>({id:row.id,json:JSON.stringify(row)}));
 const revisions=[A,B,C].map((row,index)=>({id:index+1,sessionId:A.id,
  createdAt:'2026-10-23T00:00:0'+index+'.000Z',json:JSON.stringify(row)}));
 if(['history-retains-D','history-retains-E'].includes(casFault)){
  const extra=casFault==='history-retains-D'?D:E;
  revisions.push({id:4,sessionId:A.id,createdAt:'2026-10-23T00:00:03.000Z',json:JSON.stringify(extra)});
 }
 const archives=[{version:'pack-v1',sha256:archiveSha,contentSha256:archiveSha,bytes:archiveBytes.length}];
 const table=(name,columns,rows)=>({name,columns,rows,columnInfo:{columns:['cid','name','type','notnull','dflt_value','pk'],rows:columns.map((column,index)=>[index,column,'TEXT',0,null,index===0?1:0])}});
 const tables=[table('profiles',['id','json'],profiles.map(row=>[row.id,row.json])),table('sessions',['id','json'],sqlSessions.map(row=>[row.id,row.json])),table('revisions',['id','session_id','created_at','json'],revisions.map(row=>[row.id,row.sessionId,row.createdAt,row.json])),table('knowledge_archives',['sha256','version','pack'],archives.map(row=>[row.sha256,row.version,{sqliteType:'blob',bytes:archiveBytes.length,sha256:archiveSha,base64:archiveBytes.toString('base64')}]))];
 const rawRows={schemaColumns:['type','name','tbl_name','rootpage','sql'],schema:tables.map((row,index)=>['table',row.name,row.name,index+1,'CREATE TABLE '+row.name]),tables};
 const rawRowsRef=add('sidecars/raw-rows.json',rawRows);
 const derivations=[],adjudications=[],current=[],history=[],currentManifest=[],historyManifest=[],bindings=[],historyBindings=[];
 for(const [table,source]of [['sessions',sqlSessions],['revisions',revisions]])for(const row of source){
  const id=row.id,original=JSON.parse(row.json),derived=structuredClone(original),stem=table+'-'+id;
  const present=Object.hasOwn(original,'factVerification');if(!present)derived.factVerification=structuredClone(facts);const changed=!present;
  const originalRef=add('sidecars/'+stem+'-original.json',original),replayedRef=add('sidecars/'+stem+'-replayed.json',derived);
  const replayed={id,raw:row.json,original,replayed:derived,publicRead:derived,allOtherOriginalFieldsEqual:true,
   factsVerified:true,fullOriginalEqual:!changed,...table==='revisions'?{sessionId:row.sessionId,createdAt:row.createdAt}:{}};
  const d={table,id,originalPresent:present,original:present?facts:null,replayed:facts,changed,factsVerified:true};
  derivations.push(d);adjudications.push({table,id,changed,originalPresent:present,original:d.original,replayed:facts});
  if(table==='sessions'){
   current.push(replayed);currentManifest.push({sessionId:id,original:originalRef,replayed:replayedRef});
   bindings.push({sessionId:id,snapshotFile:originalRef.file,snapshotSha256:originalRef.sha256,replayFile:replayedRef.file,
    replaySha256:replayedRef.sha256,sqlJsonSha256:sha(row.json),completeCurrentSqlJsonEqual:true});
  }else{
   history.push(replayed);historyManifest.push({revisionId:id,sessionId:row.sessionId,original:originalRef,replayed:replayedRef});
   historyBindings.push({revisionId:id,sessionId:row.sessionId,createdAt:row.createdAt,snapshotFile:originalRef.file,
    snapshotSha256:originalRef.sha256,replayFile:replayedRef.file,replaySha256:replayedRef.sha256,
    sqlJsonSha256:sha(row.json),completeHistorySqlJsonEqual:true});
  }
 }
 const changedRows=adjudications.filter(row=>row.changed).map(({table,id})=>({table,id}));
 const replay={schema:'naming-studio-store-replay/1',status:changedRows.length?'not-verified':'passed',proofEligible:changedRows.length===0,raw:rawRows,rawAfter:rawRows,
  semanticReplayPassed:changedRows.length===0,notVerified:changedRows.map(row=>({...row,factStatus:facts.status,fullOriginalEqual:false,reason:'existing Store derived a different factVerification; complete original equality did not pass'})),rawSnapshots:{unchanged:true,beforeSha256:sha(JSON.stringify(rawRows)),afterSha256:sha(JSON.stringify(rawRows))},
  rawBeforeAfterEqual:true,repairInvoked:false,initInvoked:false,customerWrites:0,storeInitCalled:false,
  storeValidationCompleted:true,storeSource,wasm,originalDatabase:{sha256:database.sha256,bytes:database.bytes},
  rows:{profiles,sessions:sqlSessions,revisions,archives,tables:rawRows.tables,schema:rawRows.schema},current,history,
  factVerificationDerivations:derivations,counts:{sessions:sqlSessions.length,profiles:profiles.length,revisions:revisions.length,archives:archives.length,allTables:rawRows.tables.map(table=>({table:table.name,rows:table.rows.length}))}};
 const replayRef=add('sidecars/replay-result.json',replay);
 const sidecarManifest={schema:'naming-studio-desktop176-sql-sidecars/1',rawRows:rawRowsRef,replayResult:replayRef,
  current:currentManifest,history:historyManifest};
 const sidecarManifestRef=add('sidecars/manifest.json',sidecarManifest);
 const stateBody={database,current:sessions.map(row=>({id:row.id,rawSha256:sha(JSON.stringify(row)),canonical:canonical(row)})),
  history:revisions.map(row=>({id:row.id,sessionId:row.sessionId,raw:row.json,rawSha256:sha(row.json)})),
  profiles:profiles.map(row=>({id:row.id,canonical:canonical(JSON.parse(row.json))}))};
 const stateRef=add('resume-state.json',{...stateBody,projectOriginal:A});
 const scenarioSessionIds={
  [CASES[0]]:sessions.slice(0,3).map(row=>row.id),[CASES[1]]:sessions.slice(3,6).map(row=>row.id),[CASES[2]]:[F.id]};
 const userData=path.join(root,'user');
 const sealRef=add('resume-seal.json',{schema:'desktop176-resume-seal/1',workflowId:'desktop176/1',appVersion:'1.0.38',
  mode:'Installed',exercisePid:31414,userData,database,state:stateRef,inputFreeze:freeze,workflowSource,scenarioSessionIds});
 const pdfs=CASES.map((_,index)=>{
  const selected=sessions[[0,3,6][index]],ref=add('reports/report-'+index+'.pdf','%PDF-'+index,{binary:true});
  return{...ref,sessionId:selected.id,snapshot:add('reports/session-'+index+'.json',selected),
   html:add('reports/report-'+index+'.html','<html>report '+index+'</html>',{binary:true}),phaseID:'exercise'};
 });
 const backupRef=add('backup.sqlite','backup bytes',{binary:true});
 const exerciseSqlRef=add('exercise-sql-proof.json',{schema:'desktop176-exercise-sql/1',...stateBody,
  files:{restores:2,backup:backupRef,reports:pdfs}});
 const resumeSqlRef=add('resume-sql-proof.json',{schema:'desktop176-resume-sql/1',unchanged:true,seal:sealRef,
  before:stateBody,after:stateBody});
 const makeScenarios=records=>CASES.map((scenarioId,index)=>({scenarioId,status:'passed',sessionIds:scenarioSessionIds[scenarioId],
  customerIds:scenarioSessionIds[scenarioId].map(id=>'profile-'+id.split('-')[1]),pdf:pdfs[index],artifactPhase:'exercise',
  responseRequestIds:records.filter(row=>row.scenarioId===scenarioId).map(row=>row.requestId),evidence:{}}));
 const boot=value=>({sessions:structuredClone(value),profiles:structuredClone(profileValues)});
 const traces={};
 const call=(phaseID,scenarioId,method,args,response,kind='resolved')=>{
  const records=traces[phaseID]??(traces[phaseID]=[]);
  const id='desktop176-Installed-'+phaseID+'-'+String(records.length+1).padStart(4,'0');
  const request={requestId:id,scenarioId,method,args};
  if(casFault==='resume-write'&&phaseID==='resume'&&scenarioId===CASES[2]&&method==='bootstrap'){
   request.method='saveSession';method='saveSession';
  }
  if(phaseID==='exercise'&&records.length===55){
   if(casFault==='requestId')request.requestId=id.replace('0056','9999');
   if(casFault==='scenario')request.scenarioId=CASES[1];
   if(casFault==='method'){request.method='bootstrap';method='bootstrap';}
   if(casFault==='responseKind')kind='resolved';
  }
  const requestRef=add('ipc/'+id+'-request.json',request),responseRef=add('ipc/'+id+'-response.json',response);
  const row={requestId:id,scenarioId,method,responseKind:kind,transport:'renderer-preload-ipc',
   serialization:'complete-JSON-of-structured-value-as-received',request:requestRef,response:responseRef};
  records.push(row);return{row,request,response};
 };
 call('exercise',CASES[0],'bootstrap',[],{sessions:[],profiles:[]});
 call('exercise',CASES[0],'restore',[],true);
 for(let index=0;index<40;index++)call('exercise',CASES[1],'searchCharacters',['字'+index],[{char:'字'+index}]);
 for(let index=0;index<3;index++){
  const prior={...structuredClone(beforeSessions[index+3]),reviewRevision:0,reviewToken:'generated-'+index,reviewNote:''};
  call('exercise',CASES[1],'generate',[{id:prior.profileId},{generationChar:['静','南','黎'][index]}],{session:prior});
  call('exercise',CASES[1],'saveSession',[{...prior,reviewNote:'desktop176实际71代表保存'}],beforeSessions[index+3]);
 }
 for(const role of ['father','mother']){
  const char=role==='father'?'沐':'子',option={pinyin:role==='father'?'mù':'zi',tone:role==='father'?4:5};
  call('exercise',CASES[2],'getCmnReadingOptions',[char],{options:[option]});
  call('exercise',CASES[2],'confirmParentNameReading',[projectProfile,{role,fullName:role==='father'?'林沐':'陈子',
   surnameLength:1,readings:[{position:0,char,origin:'dictionary',option}]}],projectProfile.parentNameReadings.find(row=>row.role===role));
 }
 call('exercise',CASES[2],'saveProfile',[projectProfile],projectProfile);
 const generated=call('exercise',CASES[2],'generate',[projectProfile,{preferredElements:[]}],{session:A});
 const draftRequest={...structuredClone(A),preferences:{...A.preferences,preferredElements:['水']},reviewNote:B.reviewNote};
 const water=call('exercise',CASES[2],'saveSession',[draftRequest],B);
 const staleBody={...structuredClone(casFault==='token-not-stale'?B:A),reviewNote:'应拒绝的过期窗口'};
 const stale=call('exercise',CASES[2],'saveSession',[staleBody],{name:'Error',message:'方案审阅版本已变化。'},'rejected');
 const noteRequest={...structuredClone(B),reviewNote:C.reviewNote};
 if(casFault==='c-wrong-prior-token')noteRequest.reviewToken='not-token-B';
 const noted=call('exercise',CASES[2],'saveSession',[noteRequest],C);
 const list=call('exercise',CASES[2],'listHistory',[A.id],revisions.slice(0,2).reverse().map(row=>({id:String(row.id),
  sessionId:row.sessionId,createdAt:row.createdAt,session:JSON.parse(row.json)})));
 call('exercise',CASES[2],'restoreHistory',[A.id,casFault==='d-wrong-target'?'1':'2',C.reviewRevision,
  casFault==='d-wrong-token'?'not-token-C':C.reviewToken],D);
 call('exercise',CASES[2],'bootstrap',[],boot(beforeSessions));
 call('exercise',CASES[2],'backup',[],backupRef.file);
 call('exercise',CASES[2],'saveSession',[{...structuredClone(D),reviewNote:E.reviewNote}],E);
 call('exercise',CASES[2],'restore',[],true);
 call('exercise',CASES[2],'bootstrap',[],boot(sessions));
 const finalBootstrap=boot(sessions);
 if(casFault==='finalbootstrap')finalBootstrap.sessions[6].reviewToken='wrong-final-token';
 call('exercise',CASES[2],'bootstrap',[],finalBootstrap);
 for(let index=0;index<3;index++)call('exercise',CASES[index],'exportReport',[sessions[[0,3,6][index]]],pdfs[index].file);
 if(casFault==='index')traces.exercise.splice(54,2,traces.exercise[55],traces.exercise[54]);
 const exerciseRecords=traces.exercise;
 const exerciseRaw={schema:'naming-studio-desktop176-result/1',workflowId:'desktop176/1',appVersion:'1.0.38',mode:'Installed',
  phaseID:'exercise',status:'awaiting-resume',pid:31414,inputFreeze:freeze,executable,
  userData:casFault==='exercise-root'?path.join(root,'different-user'):userData,workflowSource,
  resumeSeal:sealRef,sqlProof:exerciseSqlRef,reopenScope:'renderer-reload-and-store-reopen',
  startedAt:'2026-10-23T00:00:00.000Z',completedAt:'2026-10-23T00:01:00.000Z',originalResponses:exerciseRecords,
  scenarios:makeScenarios(exerciseRecords)};
 const exerciseRef=add('exercise-result.json',exerciseRaw);
 const exerciseProcessRef=add('exercise-process.json',{schema:'naming-studio-smoke-process/1',version:'1.0.38',mode:'Installed',
  pid:exerciseRaw.pid,status:'completed',exitCode:0,signal:null,launchError:null,result:exerciseRef,sourceFreeze:freeze,
  buildCapture:build,executable,database,startedAt:'2026-10-23T00:00:00.000Z',terminalAt:'2026-10-23T00:01:01.000Z',
  completedAt:'2026-10-23T00:01:02.000Z',environment:{NAMING_STUDIO_USER_DATA:exerciseRaw.userData,
   NAMING_STUDIO_SMOKE:path.dirname(exerciseRef.file)}});
 const exercisePostRef=add('exercise-post-exit.json',{schema:'naming-studio-desktop176-process/1',appVersion:'1.0.38',mode:'Installed',
  phaseID:'exercise',pid:exerciseRaw.pid,exitCode:0,naturalExit:true,stageProcess:exerciseProcessRef,result:exerciseRef,
  inputFreeze:freeze,workflowSource,executable,userData:exerciseRaw.userData,startedAt:'2026-10-23T00:00:00.000Z',
  terminalAt:'2026-10-23T00:01:01.000Z',completedAt:'2026-10-23T00:01:02.000Z'});
 const resumeRecords=[];traces.resume=resumeRecords;
 for(const scenarioId of CASES){
  const resumed=boot(sessions);
  if(casFault==='resume-bootstrap'&&scenarioId===CASES[2])resumed.sessions[6].reviewToken='not-final-token';
  call('resume',scenarioId,'bootstrap',[],resumed);
  for(const id of scenarioSessionIds[scenarioId])call('resume',scenarioId,'listHistory',[id],
   revisions.filter(row=>row.sessionId===id).slice().reverse().map(row=>({id:String(row.id),sessionId:row.sessionId,
    createdAt:row.createdAt,session:JSON.parse(row.json)})));
 }
 const resumePid=casFault==='resume-pid'?exerciseRaw.pid:31415;
 const resumeEvidence={exercisePid:exerciseRaw.pid,resumePid,exerciseResult:casFault==='origin-mismatch'?exerciseProcessRef:exerciseRef,
  exerciseProcessReceipt:exercisePostRef,runtimeInputBefore:sealRef,
  runtimeInputAfter:casFault==='resume-seal'?stateRef:sealRef};
 const raw={schema:'naming-studio-desktop176-result/1',workflowId:'desktop176/1',appVersion:'1.0.38',mode:'Installed',
  phaseID:'resume',status:'completed',pid:resumePid,inputFreeze:freeze,executable,userData,workflowSource,
  resumeSeal:sealRef,sqlProof:resumeSqlRef,reopenScope:'separate-process-resume',
  startedAt:'2026-10-23T00:02:00.000Z',completedAt:'2026-10-23T00:03:00.000Z',resumeEvidence,
  originalResponses:resumeRecords,scenarios:makeScenarios(resumeRecords).map(row=>({...row,evidence:{resume:{
   newPid:resumePid,exercisePid:exerciseRaw.pid,bootstrapAndHistoryPreserved:true,readOnly:true}}}))};
 const rawRef=add('raw-result.json',raw);
 const processRef=add('original-process.json',{schema:'naming-studio-smoke-process/1',version:'1.0.38',mode:'Installed',pid:raw.pid,
  status:'completed',exitCode:0,signal:null,launchError:null,result:rawRef,sourceFreeze:freeze,buildCapture:build,executable,database,
  startedAt:'2026-10-23T00:02:00.000Z',terminalAt:'2026-10-23T00:03:01.000Z',completedAt:'2026-10-23T00:03:02.000Z',
  environment:{NAMING_STUDIO_USER_DATA:userData,NAMING_STUDIO_SMOKE:path.dirname(rawRef.file)}});
 const postRef=add('post-exit.json',{schema:'naming-studio-desktop176-process/1',appVersion:'1.0.38',mode:'Installed',
  phaseID:'resume',pid:raw.pid,exitCode:0,naturalExit:true,stageProcess:processRef,result:rawRef,inputFreeze:freeze,workflowSource,
  executable,userData,startedAt:'2026-10-23T00:02:00.000Z',terminalAt:'2026-10-23T00:03:01.000Z',
  completedAt:'2026-10-23T00:03:02.000Z'});
 const selected=selectedPhase==='exercise'?{raw:exerciseRaw,rawRef:exerciseRef,processRef:exerciseProcessRef,
  postRef:exercisePostRef,records:exerciseRecords,finalBootstrap:exerciseRecords[64].response}:
  {raw,rawRef,processRef,postRef,records:resumeRecords,finalBootstrap:resumeRecords[0].response};
 for(const binding of bindings)binding.capturedResponse=selected.finalBootstrap;
 const projectChecks={originalProjectResponse:generated.row.response,staleRequest:stale.row.request,
  rejectedResponse:stale.row.response,subsequentAcceptedResponse:noted.row.response,casByteWitness:'not-recorded-in-r2'};
 const witnessFaults={
  'wrong-originalProjectResponse':['originalProjectResponse',water.row.response],
  'wrong-staleRequest':['staleRequest',water.row.request],
  'wrong-rejectedResponse':['rejectedResponse',noted.row.response],
  'wrong-subsequentAcceptedResponse':['subsequentAcceptedResponse',stale.row.response]
 };
 if(casFault==='missing-ref'||casFault==='missing-staleRequest')delete projectChecks.staleRequest;
 if(casFault==='ref-mismatch')projectChecks.staleRequest=water.row.request;
 if(casFault?.startsWith('missing-'))delete projectChecks[casFault.slice('missing-'.length)];
 if(witnessFaults[casFault]){const [key,ref]=witnessFaults[casFault];projectChecks[key]=ref;}
 const proof={schema:DESKTOP176_SQL_SCHEMA,expectedVersion:'1.0.38',workflowId:'desktop176/1',mode:'Installed',phaseID:selectedPhase,
  status:'passed',ok:true,runtimeVerified:true,failures:[],summary:{ok:true,failureCount:0,actualSessionBindings:bindings.length,
   actualHistoryBindings:historyBindings.length,pdfCount:pdfs.length},inputs:{raw:selected.rawRef,process:selected.processRef,
    post:selected.postRef,inputFreeze:freeze,buildCapture:build},sourceFreeze:freeze,
  processEvidence:selected.processRef,postEvidence:selected.postRef,rawStatus:selected.raw.status,
  resultFile:selected.rawRef.file,resultSha256:selected.rawRef.sha256,runtimeResultSha256:selected.rawRef.sha256,
  database:{path:database.file,unchanged:true,sha256Before:database.sha256,sha256After:database.sha256,
   bytesBefore:database.bytes,bytesAfter:database.bytes,sessions:bindings.length,profiles:profiles.length,
   revisions:historyBindings.length,archives:archives.length},
  fullSource:{sourceRoot:root,manifest:closureRef,bundle,wasm,storeSource,checkerSources},sidecars:{manifest:sidecarManifestRef},
  semanticReplay:{status:'passed',storeSourceSha256:storeSource.sha256,repairInvoked:false,initInvoked:false,
   rawBeforeAfterEqual:true,completeRawRowsChecked:rawRows.tables.reduce((sum,row)=>sum+row.rows.length,0),
   completeSessionReplays:bindings.length,completeHistoryReplays:historyBindings.length,
   factVerificationDerivations:derivations,adjudication:{status:'passed',kind:changedRows.length?'verified-fact-only-derivations':'identical-original',originalReaderStatus:replay.status,
    originalProofEligible:replay.proofEligible,adjudications,changedRows}},
  bindings,historyBindings,pdfs:pdfs.map(ref=>({path:ref.file,sha256:ref.sha256,bytes:ref.bytes})),
  phaseBindings:{seal:sealRef,exerciseResult:exerciseRef,status:'passed',originalCurrentProfileHistoryEqual:true,
   responseFilesChecked:2*(exerciseRecords.length+selected.records.length*(selectedPhase==='resume'?1:0)),
   casTransitionVerified:true,
   casByteWitness:'not-recorded-in-r2',scenarios:CASES.map(scenarioId=>({scenarioId,
    sessionIds:scenarioSessionIds[scenarioId],completeOriginalCurrentEqual:true,completeOriginalHistoryEqual:true,
    sourceProtocol:'desktop176/1-r2',...scenarioId===CASES[2]?projectChecks:{}}))}};
 const validate=()=>assertDesktop176SqlProof({root,proof,inputFreeze:freeze,buildCapture:build,mode:'Installed',
  phaseID:selectedPhase,rawRef:selected.rawRef,processRef:selected.processRef,postRef:selected.postRef,loadRef,compare});
 const replaceReplay=change=>{const next=structuredClone(replay);change(next);const ref=add('sidecars/replay-changed.json',next);
  const nextManifest={...sidecarManifest,replayResult:ref};proof.sidecars.manifest=add('sidecars/manifest-changed.json',nextManifest);};
 return{root,proof,validate,compared,files,replaceReplay,exerciseRecords,resumeRecords,exerciseRef,exercisePostRef,
  rawRef:selected.rawRef,sealRef,projectChecks,A,B,C,D,E,F};
}

test('namespace3 consumes the full desktop176 proof and authenticated row sidecars',async()=>{
 const f=fixture(),result=await f.validate();
 assert.equal(result.status,'passed');assert.equal(result.current,7);assert.equal(result.history,3);
 assert.equal(result.casByteWitness,'not-recorded-in-r2');
 assert.equal(f.exerciseRecords.length,68);assert.equal(f.resumeRecords.length,10);
 assert.equal(f.exerciseRecords[53].method,'generate');assert.equal(f.exerciseRecords[55].responseKind,'rejected');
 assert.equal(f.exerciseRecords[64].method,'bootstrap');assert.equal(f.resumeRecords[8].scenarioId,CASES[2]);
 assert.notEqual(f.C.reviewToken,f.F.reviewToken);assert.notEqual(f.D.reviewToken,f.F.reviewToken);
 assert.ok(f.E.reviewRevision>f.F.reviewRevision);assert.equal(f.F.reviewRevision,f.D.reviewRevision);
 assert.ok(result.jsonFilesRead.some(file=>path.basename(file)==='manifest.json'));
 assert.ok(result.jsonFilesRead.some(file=>path.basename(file)==='sessions-session-0-original.json'));
 assert.ok(f.compared.length>result.jsonFilesRead.length);
});

test('namespace3 consumes the selected exercise phase without requiring resume records',async()=>{
 const f=fixture({selectedPhase:'exercise'}),result=await f.validate();
 assert.equal(result.status,'passed');assert.equal(result.capturedCas.selectedPhase,'exercise');
 assert.equal(f.proof.rawStatus,'awaiting-resume');assert.equal(f.proof.phaseBindings.responseFilesChecked,136);
});

for(const [fault,title] of [
 ['missing-ref','CAS source cannot omit the stale request ref'],
 ['ref-mismatch','CAS source cannot substitute another authenticated request ref'],
 ['missing-originalProjectResponse','CAS project generation ref cannot be absent'],
 ['wrong-originalProjectResponse','CAS project generation ref cannot point to a water response'],
 ['missing-staleRequest','CAS stale request ref cannot be absent'],
 ['wrong-staleRequest','CAS stale request ref cannot point to the accepted water request'],
 ['missing-rejectedResponse','CAS rejection ref cannot be absent'],
 ['wrong-rejectedResponse','CAS rejection ref cannot point to the accepted note response'],
 ['missing-subsequentAcceptedResponse','CAS subsequent accepted ref cannot be absent'],
 ['wrong-subsequentAcceptedResponse','CAS subsequent accepted ref cannot point to the rejection'],
 ['requestId','CAS request body must retain its global request ID'],
 ['scenario','CAS request body must retain its project scenario'],
 ['index','CAS IPC records must retain global source order'],
 ['method','CAS rejected request must remain saveSession'],
 ['responseKind','CAS stale save must retain its rejected response kind'],
 ['token-not-stale','CAS rejected request must use the original stale token'],
 ['c-wrong-prior-token','CAS C note request must use the accepted B token'],
 ['c-same-token','CAS C response must rotate B token'],
 ['c-no-increment','CAS C response must advance B revision'],
 ['c-mutated-source','CAS C response cannot alter a non-note source field'],
 ['d-wrong-token','CAS D history restore must use C token'],
 ['d-wrong-target','CAS D history restore must select B history ID'],
 ['history-retains-D','CAS sealed history cannot retain restored D as an extra revision'],
 ['history-retains-E','CAS sealed history cannot retain temporary E after backup restore'],
 ['finalbootstrap','CAS final bootstrap must match sealed SQL current including tokens'],
 ['resume-pid','CAS resume must use a distinct process PID'],
 ['origin-mismatch','CAS resume must bind the exact exercise result and post-exit origin'],
 ['exercise-root','CAS exercise and resume must use the same owned userData root'],
 ['resume-seal','CAS resume must consume the same sealed input before and after'],
 ['resume-bootstrap','CAS resume bootstrap must retain complete final SQL sessions'],
 ['resume-write','CAS resume IPC must remain read-only']
])test(title,async()=>{
 const f=fixture({casFault:fault});
 await assert.rejects(f.validate(),error=>typeof error.code==='string'&&error.code.startsWith('desktop176-consumer-cas-'));
});

test('namespace3 rejects old SQL schema, wrong version and wrong workflow',()=>{
 const f=fixture();
 for(const change of [{schema:LEGACY_SQL_SCHEMA},{expectedVersion:'1.0.37'},{workflowId:'desktop175/1'}]){
  assert.throws(()=>assertSqlSchemaForNamespace({...f.proof,...change},NS3,'1.0.38'),{code:'desktop176-consumer-schema'});
 }
 assert.throws(()=>assertSqlSchemaForNamespace(f.proof,NS3,'1.0.37'),{code:'desktop176-consumer-schema'});
});

test('verified fact-only derivation retains reader not-verified and requires complete adjudication',async()=>{
 const f=fixture({deriveFactOnly:true}),result=await f.validate();assert.equal(result.status,'passed');
 const noAdjudication=fixture({deriveFactOnly:true});noAdjudication.proof.semanticReplay.adjudication.changedRows=[];
 await assert.rejects(noAdjudication.validate(),{code:'desktop176-consumer-adjudication-coverage'});
});

test('namespace2 and unphased typed records retain installed-sql only',()=>{
 const f=fixture();
 for(const namespace of [undefined,'naming-studio-release-verification/1','naming-studio-release-verification/2']){
  assert.throws(()=>assertSqlSchemaForNamespace(f.proof,namespace,'1.0.38'),{code:'desktop176-consumer-schema'});
  assert.equal(assertSqlSchemaForNamespace({...f.proof,schema:LEGACY_SQL_SCHEMA},namespace,'1.0.37'),LEGACY_SQL_SCHEMA);
 }
});

test('missing or weak full row bindings fail',async()=>{
 const missing=fixture();missing.proof.bindings.pop();
 await assert.rejects(missing.validate(),{code:'desktop176-consumer-counts'});
 const weak=fixture();delete weak.proof.bindings[0].snapshotFile;
 await assert.rejects(weak.validate(),{code:'desktop176-consumer-binding-sidecar'});
});

test('authenticated replay sidecar must match the complete raw rows',async()=>{
 const f=fixture();f.replaceReplay(value=>{value.rawAfter.tables[0].rows.pop();});
 await assert.rejects(f.validate(),{code:'desktop176-consumer-replay-readonly'});
});

test('incomplete checker sources and upgraded CAS byte claims fail',async()=>{
 const source=fixture();delete source.proof.fullSource.checkerSources.semanticGate;
 await assert.rejects(source.validate(),{code:'desktop176-consumer-checker-sources'});
 const cas=fixture();cas.proof.phaseBindings.casByteWitness='proved-unchanged';
 await assert.rejects(cas.validate(),{code:'desktop176-consumer-phase-cas'});
});

test('unverified legacy fact status cannot pass the full replay',async()=>{
 const f=fixture({factStatus:'unverified-legacy'});
 await assert.rejects(f.validate(),{code:'desktop176-consumer-verified-facts'});
});

test('normalized rows cannot substitute a different complete raw SQL table',async()=>{
 const f=fixture();f.replaceReplay(value=>{value.rows.sessions[0].json='{"id":"another"}';});
 await assert.rejects(f.validate(),{code:'desktop176-consumer-raw-normalized'});
});

test('reader Store source mismatch and unexplained uncertainty cannot be upgraded',async()=>{
 const source=fixture();source.proof.fullSource.storeSource={...source.proof.fullSource.storeSource,sha256:'f'.repeat(64)};
 await assert.rejects(source.validate(),{code:'desktop176-consumer-source-manifest'});
 const uncertain=fixture();uncertain.replaceReplay(value=>{value.notVerified=[{table:'sessions',id:'session-0',reason:'unknown gap'}];});
 await assert.rejects(uncertain.validate(),{code:'desktop176-consumer-reader-uncertainty'});
});
