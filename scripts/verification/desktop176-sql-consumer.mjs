/** Strict consumption of an independently produced M198 SQL proof.
 * Reads proof/source/full-row sidecars through existing authenticated callbacks.
 * Never imports the checker, opens SQLite, invokes Store, or runs an App.
 */
import path from 'node:path';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual as equal} from 'node:util';
import {safeInput} from './safe-paths.mjs';
import {fileIdentity} from './common.mjs';

export const DESKTOP176_SQL_SCHEMA='naming-studio-desktop176-sql/1';
export const LEGACY_SQL_SCHEMA='naming-studio-installed-sql/1';
const NS3='naming-studio-release-verification/3',VERSION='1.0.38',WORKFLOW='desktop176/1';
const MAX_FULL_SIDECAR_BYTES=200*1024*1024;
const CASES=['legacy70-canonical','naming71-character40','project131-family-review'];
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const sha=value=>createHash('sha256').update(value).digest('hex');
const canonical=value=>JSON.stringify(value,(_,child)=>object(child)?Object.fromEntries(Object.entries(child).sort(([a],[b])=>a<b?-1:a>b?1:0)):child);
const positive=value=>Number.isSafeInteger(value)&&value>0;
const keys=value=>Object.keys(value).sort();
const need=(value,code,message)=>{if(!value){const error=new Error('Desktop176 SQL consumer '+code+': '+message);error.code='desktop176-consumer-'+code;throw error;}};
const refShape=ref=>object(ref)&&typeof ref.file==='string'&&ref.file.length>0&&hash(ref.sha256)&&positive(ref.bytes);
const sameRef=(a,b)=>refShape(a)&&refShape(b)&&path.resolve(a.file)===path.resolve(b.file)&&a.sha256===b.sha256&&a.bytes===b.bytes;
const withoutFacts=value=>{const result=structuredClone(value);delete result.factVerification;return result;};
const without=(value,...fields)=>{const result=structuredClone(value);for(const field of fields)delete result[field];return result;};
const ordered=(...values)=>values.every(value=>typeof value==='string'&&Number.isFinite(Date.parse(value)))&&values.every((value,index)=>index===0||Date.parse(values[index-1])<=Date.parse(value));
const unique=(values,label)=>need(new Set(values).size===values.length,'duplicate',label+' identities are duplicated');
const sameIds=(actual,expected,label)=>{unique(actual,label);unique(expected,label);need(equal([...actual].sort(),[...expected].sort()),'row-coverage',label+' has missing or extra rows');};

/** Only the helper's explicit fullSource closure uses these external reads.
 * Ordinary reports, databases and row sidecars retain the project-root reader.
 */
export function desktop176SourceReader(root){return{
 sourceCompare:async(file,expected,bytes,label)=>{const target=safeInput(root,path.resolve(file),{allowExternal:true}),actual=await fileIdentity(target);need(actual.sha256===expected&&actual.bytes===bytes,'source-identity',label+' bytes changed');return actual;},
 sourceLoadRef:async ref=>fs.readFileSync(safeInput(root,path.resolve(ref.file),{allowExternal:true}),'utf8'),
};}

export function assertSqlSchemaForNamespace(proof,namespace,version){
 need(object(proof),'schema','SQL proof must be a typed object');
 if(namespace===NS3){need(version===VERSION&&proof.expectedVersion===VERSION&&proof.workflowId===WORKFLOW&&proof.schema===DESKTOP176_SQL_SCHEMA,'schema','Namespace3 requires exact1.0.38 desktop176/1 SQL proof; old installed-sql is not an alias');return DESKTOP176_SQL_SCHEMA;}
 need(namespace===undefined||['naming-studio-release-verification/1','naming-studio-release-verification/2'].includes(namespace),'namespace','Unknown verification namespace');
 need(proof.schema===LEGACY_SQL_SCHEMA,'schema','Legacy/unphased namespaces accept installed-sql/1 only');return LEGACY_SQL_SCHEMA;
}

/** Context refs are independently supplied by the publication/phase consumer.
 * Final gate uses Installed/resume; every GUI phase supplies its own raw/P/post.
 */
export async function assertDesktop176SqlProof({root,proof,inputFreeze,buildCapture,mode='Installed',phaseID='resume',rawRef,processRef,postRef,loadRef,compare,sourceLoadRef=loadRef,sourceCompare=compare}){
 assertSqlSchemaForNamespace(proof,NS3,VERSION);
 need(typeof loadRef==='function'&&typeof compare==='function','callbacks','Authenticated loadRef and compare are required');
 need(['Development','Installed'].includes(mode)&&['exercise','resume'].includes(phaseID)&&proof.mode===mode&&proof.phaseID===phaseID,'phase','SQL proof is from another mode/phase');
 need(proof.status==='passed'&&proof.ok===true&&proof.runtimeVerified===true&&Array.isArray(proof.failures)&&proof.failures.length===0&&proof.summary?.ok===true&&proof.summary.failureCount===0,'status','Failed/partial SQL proof cannot be consumed');
 const seen=new Map(),readJsonFiles=[];
 const exact=async(ref,label,source=false)=>{need(refShape(ref),'reference',label+' requires full file/SHA/bytes');const id=await (source?sourceCompare:compare)(ref.file,ref.sha256,ref.bytes,label,false);need(id&&id.sha256===ref.sha256&&id.bytes===ref.bytes,'identity',label+' original file bytes differ');seen.set(path.resolve(ref.file),{file:ref.file,sha256:ref.sha256,bytes:ref.bytes});return ref;};
 const read=async(ref,label,source=false)=>{await exact(ref,label,source);const text=await (source?sourceLoadRef:loadRef)(ref,label);need(typeof text==='string','missing',label+' exact JSON source is unavailable');let value;try{value=JSON.parse(text);}catch{need(false,'json',label+' is not complete JSON');}readJsonFiles.push(ref.file);return value;};
 const record=async(ref,label,source=false)=>{const value=await read(ref,label,source);need(object(value),'json',label+' must contain a full object');return value;};
 need(object(proof.inputs)&&equal(keys(proof.inputs),['buildCapture','inputFreeze','post','process','raw']),'inputs','SQL proof input reference set differs');
 need(sameRef(proof.inputs.inputFreeze,inputFreeze)&&sameRef(proof.sourceFreeze,inputFreeze)&&sameRef(proof.inputs.buildCapture,buildCapture),'input-source','SQL proof does not bind the original freeze/build capture');
 need(sameRef(proof.processEvidence,proof.inputs.process)&&sameRef(proof.postEvidence,proof.inputs.post),'input-process','P/post proof aliases differ');
 if(rawRef)need(sameRef(rawRef,proof.inputs.raw),'input-raw','SQL proof does not bind the selected original raw result');
 if(processRef)need(sameRef(processRef,proof.inputs.process),'input-process','SQL proof uses another original P');
 if(postRef)need(sameRef(postRef,proof.inputs.post),'input-post','SQL proof uses another natural post-exit receipt');
 const input=await record(inputFreeze,'strong SQL input freeze'),build=await record(buildCapture,'strong SQL original build');
 need(input.schema==='naming-studio-test-input-freeze/1'&&input.version===VERSION&&object(input.files),'freeze','Original test-input freeze required');
 need(build.schema==='naming-studio-command-capture/1'&&build.role==='buildAndPackage'&&build.version===VERSION&&build.status==='completed'&&build.exitCode===0&&sameRef(build.sourceFreeze,inputFreeze)&&sameRef(build.freezeAfter,inputFreeze),'build','Original successful same-freeze build capture required');
 const raw=await record(proof.inputs.raw,'strong SQL original raw'),P=await record(proof.inputs.process,'strong SQL original P'),post=await record(proof.inputs.post,'strong SQL post-exit');
 need(raw.schema==='naming-studio-desktop176-result/1'&&raw.workflowId===WORKFLOW&&raw.appVersion===VERSION&&raw.mode===mode&&raw.phaseID===phaseID&&raw.status===(phaseID==='exercise'?'awaiting-resume':'completed')&&proof.rawStatus===raw.status,'raw','Original raw phase/version/status differs');
 need(sameRef(raw.inputFreeze,inputFreeze)&&P.schema==='naming-studio-smoke-process/1'&&P.version===VERSION&&P.mode===mode&&P.pid===raw.pid&&P.status==='completed'&&P.exitCode===0&&P.signal===null&&P.launchError===null&&sameRef(P.result,proof.inputs.raw)&&sameRef(P.sourceFreeze,inputFreeze)&&sameRef(P.buildCapture,buildCapture)&&sameRef(P.executable,raw.executable),'original-process','Original process result/executable/freeze/build binding differs');
 need(post.schema==='naming-studio-desktop176-process/1'&&post.appVersion===VERSION&&post.mode===mode&&post.phaseID===phaseID&&post.pid===raw.pid&&post.exitCode===0&&post.naturalExit===true&&sameRef(post.stageProcess,proof.inputs.process)&&sameRef(post.result,proof.inputs.raw)&&sameRef(post.inputFreeze,inputFreeze)&&sameRef(post.workflowSource,raw.workflowSource),'post-process','Natural post receipt does not retain original P/raw/source');
 need(typeof proof.resultFile==='string'&&path.resolve(proof.resultFile)===path.resolve(proof.inputs.raw.file)&&proof.resultSha256===proof.inputs.raw.sha256&&proof.runtimeResultSha256===proof.inputs.raw.sha256,'result','Proof result identities differ');
 const seal=await record(raw.resumeSeal,'strong SQL original seal'),state=await record(seal.state,'strong SQL original sealed state');
 need(sameRef(proof.phaseBindings?.seal,raw.resumeSeal)&&sameRef(state.database,seal.database)&&sameRef(P.database,seal.database)&&sameRef(seal.inputFreeze,inputFreeze)&&sameRef(seal.workflowSource,raw.workflowSource),'sealed-database','Original P/seal/state/database binding differs');
 need(proof.database?.unchanged===true&&proof.database.path===seal.database.file&&proof.database.sha256Before===seal.database.sha256&&proof.database.sha256After===seal.database.sha256&&proof.database.bytesBefore===seal.database.bytes&&proof.database.bytesAfter===seal.database.bytes,'database','Final database bytes differ from the original App seal');await exact(seal.database,'strong SQL current original database');
 need(object(proof.fullSource)&&proof.fullSource.sourceRoot===root&&sameRef(proof.fullSource.storeSource,{...proof.fullSource.storeSource}),'full-source','Actual selected source root/Store reference required');
 const closure=await record(proof.fullSource.manifest,'strong SQL full source manifest',true);
 need(closure.schema==='naming-studio-store-replay-build/1'&&closure.applicationVersion===VERSION&&closure.manifestSourceRoot===root&&sameRef(closure.outputs?.reader,proof.fullSource.bundle)&&sameRef(closure.sqlRuntime?.wasm,proof.fullSource.wasm)&&sameRef(closure.storeSource,proof.fullSource.storeSource),'source-manifest','Reader bundle/Store/WASM manifest mismatch');
 need(object(proof.fullSource.checkerSources)&&equal(keys(proof.fullSource.checkerSources),['bindings','entry','safePaths','semanticGate']),'checker-sources','Exact four checker source references required');
 for(const [name,ref]of Object.entries(proof.fullSource.checkerSources))await exact(ref,'strong SQL checker '+name,true);
 for(const ref of [proof.fullSource.bundle,proof.fullSource.wasm,closure.storeSource,closure.entrySource,closure.buildScript,closure.rootPackage,closure.rootPackageLock,closure.sqlRuntime?.javascript,closure.sqlRuntime?.package])await exact(ref,'strong SQL source closure',true);
 need(Array.isArray(closure.sourceInputs)&&closure.sourceInputs.length>0,'source-manifest','Complete source/dependency input closure required');
 for(const ref of closure.sourceInputs){await exact(ref,'strong SQL exact dependency',true);if(ref.kind==='source'){const rel=path.relative(root,ref.file).replaceAll('\\','/');if(rel&&!rel.startsWith('../')&&!path.isAbsolute(rel))need(input.files[rel]===ref.sha256,'source-freeze','Actual reader source differs from original input freeze: '+rel);}}
 const storeRel=path.relative(root,closure.storeSource.file).replaceAll('\\','/');need(storeRel==='src/main/store.ts'&&input.files[storeRel]===closure.storeSource.sha256&&proof.semanticReplay?.storeSourceSha256===closure.storeSource.sha256,'store-source','Store replay did not use this exact frozen Store source');
 need(object(proof.sidecars)&&equal(keys(proof.sidecars),['manifest']),'sidecars','No implicit sidecar paths or weak proof rows are accepted');
 const sidecars=await record(proof.sidecars.manifest,'strong SQL full sidecar manifest');
 need(sidecars.schema==='naming-studio-desktop176-sql-sidecars/1'&&equal(keys(sidecars),['current','history','rawRows','replayResult','schema'])&&Array.isArray(sidecars.current)&&Array.isArray(sidecars.history),'sidecars','Exact full sidecar manifest required');
 need(refShape(sidecars.rawRows)&&refShape(sidecars.replayResult)&&sidecars.rawRows.bytes<=MAX_FULL_SIDECAR_BYTES&&sidecars.replayResult.bytes<=MAX_FULL_SIDECAR_BYTES,'sidecar-size','Full raw/replay sidecars must stay within200MiB; no capture-size truncation is accepted');
 const rawRows=await record(sidecars.rawRows,'strong SQL complete raw-row sidecar'),replay=await record(sidecars.replayResult,'strong SQL complete semantic replay sidecar');
 need(replay.schema==='naming-studio-store-replay/1'&&equal(rawRows,replay.raw)&&equal(replay.raw,replay.rawAfter)&&replay.rawBeforeAfterEqual===true&&replay.repairInvoked===false&&replay.initInvoked===false&&replay.customerWrites===0&&replay.storeInitCalled===false&&replay.storeValidationCompleted===true,'replay-readonly','Full original raw rows or no-init/no-repair/no-write evidence differs');
 need(replay.rawSnapshots?.unchanged===true&&replay.rawSnapshots.beforeSha256===sha(JSON.stringify(rawRows))&&replay.rawSnapshots.afterSha256===replay.rawSnapshots.beforeSha256,'raw-snapshot','Complete raw schema/rows digest differs from actual reader snapshots');
 need(sameRef(replay.storeSource,closure.storeSource)&&sameRef(replay.wasm,proof.fullSource.wasm)&&replay.originalDatabase?.sha256===seal.database.sha256&&replay.originalDatabase.bytes===seal.database.bytes,'replay-source','Full replay sidecar uses another Store/runtime/database');
 need(Array.isArray(rawRows.tables)&&rawRows.tables.length>0&&Array.isArray(rawRows.schema)&&object(replay.rows)&&Array.isArray(replay.rows.profiles)&&Array.isArray(replay.rows.sessions)&&Array.isArray(replay.rows.revisions)&&Array.isArray(replay.rows.archives)&&equal(replay.rows.tables,rawRows.tables)&&equal(replay.rows.schema,rawRows.schema),'raw-rows','All-table raw schema/rows are missing');
 need(equal(rawRows.schemaColumns,['type','name','tbl_name','rootpage','sql'])&&rawRows.schema.every(row=>Array.isArray(row)&&row.length===5),'raw-schema','Complete original sqlite_master columns/rows required');
 unique(rawRows.tables.map(table=>table.name),'raw table');
 const rowCount=rawRows.tables.reduce((count,table)=>{need(Array.isArray(table.rows)&&Array.isArray(table.columns)&&table.rows.every(row=>Array.isArray(row)&&row.length===table.columns.length)&&object(table.columnInfo)&&Array.isArray(table.columnInfo.columns)&&Array.isArray(table.columnInfo.rows),'raw-table','A complete original table/column-info row set is required');return count+table.rows.length;},0);
 need(equal(replay.counts?.allTables,rawRows.tables.map(table=>({table:table.name,rows:table.rows.length})))&&replay.counts.sessions===replay.rows.sessions.length&&replay.counts.profiles===replay.rows.profiles.length&&replay.counts.revisions===replay.rows.revisions.length&&replay.counts.archives===replay.rows.archives.length,'raw-counts','Actual full reader table counts differ');
 const sqlTable=(name,columns)=>{const table=rawRows.tables.find(table=>table.name===name);need(table&&equal(table.columns,columns),'raw-table','Original SQL columns differ for '+name);return table.rows;};
 for(const name of ['profiles','sessions']){
  const actual=sqlTable(name,['id','json']).map(([id,json])=>({id,json})).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  need(equal(actual,[...replay.rows[name]].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)),'raw-normalized','Normalized '+name+' is not the complete original raw SQL table');
 }
 const actualHistory=sqlTable('revisions',['id','session_id','created_at','json']).map(([id,sessionId,createdAt,json])=>({id,sessionId,createdAt,json})).sort((a,b)=>a.id-b.id);
 need(equal(actualHistory,[...replay.rows.revisions].sort((a,b)=>a.id-b.id)),'raw-normalized','Normalized revisions differ from complete original raw SQL columns');
 const rawArchives=sqlTable('knowledge_archives',['sha256','version','pack']);need(rawArchives.length===replay.rows.archives.length,'raw-archive','Raw archive coverage differs');
 for(const [archiveSha,version,blob]of rawArchives){const archive=replay.rows.archives.find(row=>row.sha256===archiveSha&&row.version===version);need(archive&&blob?.sqliteType==='blob'&&typeof blob.base64==='string','raw-archive','Lossless original archive BLOB missing');const bytes=Buffer.from(blob.base64,'base64');need(bytes.toString('base64')===blob.base64&&bytes.length===blob.bytes&&sha(bytes)===blob.sha256&&blob.sha256===archiveSha&&archive.bytes===blob.bytes&&archive.contentSha256===archiveSha,'raw-archive','Original archive BLOB/hash/length differs');}
 need(Array.isArray(state.current)&&Array.isArray(state.history)&&Array.isArray(state.profiles),'sealed-state','Full sealed current/history/profiles missing');
 sameIds(state.current.map(row=>row.id),replay.rows.sessions.map(row=>row.id),'sealed current');sameIds(state.history.map(row=>row.id),replay.rows.revisions.map(row=>row.id),'sealed history');sameIds(state.profiles.map(row=>row.id),replay.rows.profiles.map(row=>row.id),'sealed profiles');
 for(const row of replay.rows.sessions){const expected=state.current.find(item=>item.id===row.id);need(expected.rawSha256===sha(row.json)&&expected.canonical===canonical(JSON.parse(row.json)),'sealed-current','Full original current canonical/raw SHA differs from App seal');}
 for(const row of replay.rows.revisions){const expected=state.history.find(item=>item.id===row.id);need(expected.sessionId===row.sessionId&&expected.raw===row.json&&expected.rawSha256===sha(row.json),'sealed-history','Full original history text/parent/SHA differs from App seal');}
 for(const row of replay.rows.profiles){const expected=state.profiles.find(item=>item.id===row.id);need(expected.canonical===canonical(JSON.parse(row.json)),'sealed-profile','Complete original profile differs from App seal');}
 const semantic=proof.semanticReplay,adjudication=semantic?.adjudication;
 need(semantic?.status==='passed'&&semantic.repairInvoked===false&&semantic.initInvoked===false&&semantic.rawBeforeAfterEqual===true&&semantic.completeRawRowsChecked===rowCount&&object(adjudication)&&adjudication.status==='passed'&&['identical-original','verified-fact-only-derivations'].includes(adjudication.kind)&&adjudication.originalReaderStatus===replay.status&&adjudication.originalProofEligible===replay.proofEligible,'semantic-gate','Exact no-init/no-repair semantic adjudication required; status-only proof is insufficient');
 need(Array.isArray(proof.bindings)&&Array.isArray(proof.historyBindings)&&Array.isArray(replay.current)&&Array.isArray(replay.history)&&Array.isArray(semantic.factVerificationDerivations)&&equal(semantic.factVerificationDerivations,replay.factVerificationDerivations)&&Array.isArray(adjudication.adjudications)&&Array.isArray(adjudication.changedRows),'full-bindings','Full original/replayed current/history derivations required');
 need(proof.database.sessions===proof.bindings.length&&proof.database.profiles===replay.rows.profiles.length&&proof.database.revisions===proof.historyBindings.length&&proof.database.archives===replay.rows.archives.length&&proof.summary.actualSessionBindings===proof.bindings.length&&proof.summary.actualHistoryBindings===proof.historyBindings.length&&semantic.completeSessionReplays===proof.bindings.length&&semantic.completeHistoryReplays===proof.historyBindings.length,'counts','Full SQL/replay row counts disagree');
 const usedFiles=new Set(),verifiedRows=[],changedRows=[];
 const checkGroup=async(table,manifestRows,bindings,replayed,sqlRows)=>{
  const idKey=table==='sessions'?'sessionId':'revisionId';sameIds(manifestRows.map(row=>row[idKey]),bindings.map(row=>row[idKey]),table+' manifest');sameIds(bindings.map(row=>row[idKey]),replayed.map(row=>row.id),table+' replay');sameIds(replayed.map(row=>row.id),sqlRows.map(row=>row.id),table+' SQL');
  for(const b of bindings){const id=b[idKey],m=manifestRows.find(row=>row[idKey]===id),r=replayed.find(row=>row.id===id),sql=sqlRows.find(row=>row.id===id);
   need(sameRef(m.original,{file:b.snapshotFile,sha256:b.snapshotSha256,bytes:m.original?.bytes})&&sameRef(m.replayed,{file:b.replayFile,sha256:b.replaySha256,bytes:m.replayed?.bytes}),'binding-sidecar','Original/replay sidecar references differ');
   for(const ref of [m.original,m.replayed]){const file=path.resolve(ref.file);need(!usedFiles.has(file),'sidecar-alias','Full row sidecar was reused');usedFiles.add(file);}
   const original=await record(m.original,'strong SQL '+table+' original '+id),derived=await record(m.replayed,'strong SQL '+table+' replayed '+id);
   need(typeof sql.json==='string'&&sha(sql.json)===b.sqlJsonSha256&&m.original.sha256===b.sqlJsonSha256&&r.raw===sql.json&&equal(original,JSON.parse(sql.json))&&equal(original,r.original)&&equal(derived,r.replayed)&&equal(derived,r.publicRead)&&equal(withoutFacts(original),withoutFacts(derived))&&r.allOtherOriginalFieldsEqual===true&&r.factsVerified===true,'original-row','Complete SQL/original/public/replayed JSON differs beyond explicitly recorded fact derivation');
   const facts=derived.factVerification,archive=replay.rows.archives.find(row=>row.version===original.dataVersion);
   need(facts?.version==='candidate-facts/1.0.0'&&['verified-builtin','verified-archive'].includes(facts.status)&&facts.dataVersion===original.dataVersion&&hash(facts.datasetSha256)&&archive?.sha256===facts.datasetSha256&&archive.contentSha256===archive.sha256,'verified-facts','Unverified legacy or another knowledge pack cannot satisfy strong replay');
   const derivation=semantic.factVerificationDerivations.find(row=>row.table===table&&row.id===id),changed=!equal(original,derived);
   need(derivation&&derivation.originalPresent===Object.hasOwn(original,'factVerification')&&equal(derivation.original,derivation.originalPresent?original.factVerification:null)&&equal(derivation.replayed,facts)&&derivation.changed===changed&&derivation.factsVerified===true&&r.fullOriginalEqual===!changed,'fact-derivation','Exact original/derived fact change is missing or inconsistent');
   if(table==='sessions')need(b.completeCurrentSqlJsonEqual===true&&original.id===id,'current-row','Current row ID/full equality missing');
   else need(b.completeHistorySqlJsonEqual===true&&Number.isSafeInteger(id)&&b.sessionId===sql.sessionId&&m.sessionId===sql.sessionId&&r.sessionId===sql.sessionId&&b.createdAt===sql.createdAt&&r.createdAt===sql.createdAt&&original.id===sql.sessionId,'history-row','Full historical SQL columns/snapshot association differs');
   const a=adjudication.adjudications.find(row=>row.table===table&&row.id===id);need(a&&a.changed===changed&&a.originalPresent===derivation.originalPresent&&equal(a.original,derivation.original)&&equal(a.replayed,facts),'adjudication-row','Adjudication does not retain complete original/replayed facts');
   if(changed)changedRows.push({table,id});verifiedRows.push({table,id});
  }
 };
 await checkGroup('sessions',sidecars.current,proof.bindings,replay.current,replay.rows.sessions);await checkGroup('revisions',sidecars.history,proof.historyBindings,replay.history,replay.rows.revisions);
 need(semantic.factVerificationDerivations.length===verifiedRows.length&&adjudication.adjudications.length===verifiedRows.length&&equal(adjudication.changedRows,changedRows)&&adjudication.kind===(changedRows.length?'verified-fact-only-derivations':'identical-original'),'adjudication-coverage','Full semantic adjudication rows are omitted/duplicated/overstated');
 need(replay.status===(changedRows.length?'not-verified':'passed')&&replay.proofEligible===(changedRows.length===0)&&replay.semanticReplayPassed===(changedRows.length===0),'reader-status','Unexplained reader failure or eligibility flag cannot be masked as passed');
 need(Array.isArray(replay.notVerified)&&replay.notVerified.length===changedRows.length,'reader-uncertainty','Reader uncertainty list is incomplete or contains unexplained failures');
 const uncertaintyKeys=[];for(const item of replay.notVerified){const row=adjudication.adjudications.find(row=>row.table===item.table&&row.id===item.id&&row.changed);need(row&&equal(item,{table:row.table,id:row.id,factStatus:row.replayed.status,fullOriginalEqual:false,reason:'existing Store derived a different factVerification; complete original equality did not pass'}),'reader-uncertainty','Reader has an unexplained non-fact verification failure');uncertaintyKeys.push(item.table+':'+item.id);}unique(uncertaintyKeys,'reader uncertainty');
 need(proof.phaseBindings?.status==='passed'&&proof.phaseBindings.originalCurrentProfileHistoryEqual===true&&positive(proof.phaseBindings.responseFilesChecked)&&proof.phaseBindings.casTransitionVerified===true&&proof.phaseBindings.casByteWitness==='not-recorded-in-r2','phase-cas','Actual captured CAS transition is required; byte nonmutation must remain explicitly unrecorded');
 need(Array.isArray(proof.phaseBindings.scenarios)&&equal(proof.phaseBindings.scenarios.map(row=>row.scenarioId),CASES),'phase-scenarios','Exact checked source scenario list required');
 sameIds(raw.scenarios.flatMap(row=>row.sessionIds),proof.bindings.map(row=>row.sessionId),'raw/current proof');
 const capturedCas=await assertCapturedCasChain({raw,P,post,proof,inputFreeze,buildCapture,seal,state,replay,exact,record,read});
 need(Array.isArray(proof.pdfs)&&proof.pdfs.length===raw.scenarios.length&&proof.summary.pdfCount===proof.pdfs.length,'pdf-count','Original phase PDF count differs');
 for(const scenario of raw.scenarios){const pdf=proof.pdfs.find(row=>path.resolve(row.path)===path.resolve(scenario.pdf.file));need(pdf&&pdf.sha256===scenario.pdf.sha256&&pdf.bytes===scenario.pdf.bytes,'pdf-binding','PDF identity differs from original exercise output');await exact({file:pdf.path,sha256:pdf.sha256,bytes:pdf.bytes},'strong SQL original PDF');}
 return{schema:DESKTOP176_SQL_SCHEMA,version:VERSION,workflowId:WORKFLOW,mode,phaseID,status:'passed',current:proof.bindings.length,history:proof.historyBindings.length,rawRows:rowCount,casTransitionVerified:true,casByteWitness:'not-recorded-in-r2',capturedCas,reads:[...seen.values()],jsonFilesRead:readJsonFiles};
}

/** Independently consumes the original M176-r2 CAS and final-state witnesses.
 * A/B/C/D/E/F denote captured snapshots, never values invented from current SQL.
 */
async function assertCapturedCasChain({raw,P,post,proof,inputFreeze,buildCapture,seal,state,replay,exact,record,read}){
 const projectCase=CASES[2],warning='人工喜用选择已修改，此批候选保留生成时的用字依据；重新生成可应用新选择。';
 const stateBody=value=>({database:value.database,current:value.current,history:value.history,profiles:value.profiles});
 need(seal.schema==='desktop176-resume-seal/1'&&seal.workflowId===WORKFLOW&&seal.appVersion===VERSION&&seal.mode===raw.mode&&seal.userData===raw.userData&&object(seal.scenarioSessionIds)&&equal(keys(seal.scenarioSessionIds),[...CASES].sort()),'cas-seal','Original seal version/mode/userData/scenario identities are missing or differ');
 for(const scenario of raw.scenarios){const checked=proof.phaseBindings.scenarios.find(row=>row.scenarioId===scenario.scenarioId);need(checked&&equal(checked.sessionIds,scenario.sessionIds)&&equal(seal.scenarioSessionIds[scenario.scenarioId],scenario.sessionIds),'cas-seal-scenarios','Proof/raw/seal scenario session identities do not match');}
 const rawHeader=(value,phase)=>need(value?.schema==='naming-studio-desktop176-result/1'&&value.workflowId===WORKFLOW&&value.appVersion===VERSION&&value.mode===raw.mode&&value.phaseID===phase&&value.status===(phase==='exercise'?'awaiting-resume':'completed')&&sameRef(value.inputFreeze,inputFreeze)&&sameRef(value.workflowSource,raw.workflowSource)&&sameRef(value.executable,raw.executable)&&sameRef(value.resumeSeal,raw.resumeSeal)&&value.userData===raw.userData,'cas-phase','CAS source is not the exact same-mode/source/executable/userData/seal phase');
 const processBinding=(value,p,exit,pRef,resultRef)=>{
  need(p?.schema==='naming-studio-smoke-process/1'&&p.version===VERSION&&p.mode===value.mode&&p.pid===value.pid&&p.status==='completed'&&p.exitCode===0&&p.signal===null&&p.launchError===null&&sameRef(p.result,resultRef)&&sameRef(p.sourceFreeze,inputFreeze)&&sameRef(p.buildCapture,buildCapture)&&sameRef(p.database,seal.database)&&sameRef(p.executable,value.executable),'cas-process','CAS original stage P does not bind its actual raw/source/build/executable/database');
  need(typeof value.userData==='string'&&path.isAbsolute(value.userData)&&p.environment?.NAMING_STUDIO_USER_DATA===value.userData&&path.resolve(p.environment?.NAMING_STUDIO_SMOKE??'')===path.dirname(path.resolve(resultRef.file)),'cas-process-root','CAS P/raw phase output and owned userData roots differ');
  need(exit?.schema==='naming-studio-desktop176-process/1'&&exit.appVersion===VERSION&&exit.mode===value.mode&&exit.phaseID===value.phaseID&&exit.pid===value.pid&&exit.exitCode===0&&exit.naturalExit===true&&sameRef(exit.stageProcess,pRef)&&sameRef(exit.result,resultRef)&&sameRef(exit.inputFreeze,inputFreeze)&&sameRef(exit.workflowSource,value.workflowSource)&&sameRef(exit.executable,value.executable)&&exit.userData===value.userData,'cas-post','CAS post-exit receipt does not retain its separate original P/raw phase');
  need(ordered(p.startedAt,value.startedAt,value.completedAt,p.terminalAt,p.completedAt,exit.completedAt)&&exit.startedAt===p.startedAt&&exit.terminalAt===p.terminalAt&&exit.completedAt===p.completedAt,'cas-process-time','CAS raw/P/post observed process intervals differ');
 };
 processBinding(raw,P,post,proof.inputs.process,proof.inputs.raw);
 let exercise=raw,exerciseRef=proof.inputs.raw,exercisePost=post;
 if(raw.phaseID==='resume'){
  const evidence=raw.resumeEvidence;
  need(object(evidence)&&sameRef(evidence.runtimeInputBefore,raw.resumeSeal)&&sameRef(evidence.runtimeInputAfter,raw.resumeSeal)&&evidence.resumePid===raw.pid&&evidence.exercisePid===seal.exercisePid&&raw.pid!==seal.exercisePid,'cas-resume-input','Resume must consume one unchanged original exercise seal with a different PID');
  exerciseRef=evidence.exerciseResult;exercise=await record(exerciseRef,'CAS original exercise raw');exercisePost=await record(evidence.exerciseProcessReceipt,'CAS original exercise post');
  const exerciseP=await record(exercisePost.stageProcess,'CAS original exercise P');
  rawHeader(exercise,'exercise');need(exercise.pid===seal.exercisePid&&exercise.pid!==raw.pid&&exercise.reopenScope==='renderer-reload-and-store-reopen','cas-resume-pid','Prior exercise PID/scope differs from the original seal');
  processBinding(exercise,exerciseP,exercisePost,exercisePost.stageProcess,exerciseRef);
  need(ordered(exercisePost.terminalAt,exercisePost.completedAt,P.startedAt)&&raw.reopenScope==='separate-process-resume','cas-resume-order','Resume did not start after original exercise natural exit');
  need(equal(exercise.materialIdentity,raw.materialIdentity),'cas-resume-source','Resume changed original exercise material identities');
 }else{
  rawHeader(exercise,'exercise');need(raw.pid===seal.exercisePid&&raw.resumeEvidence===undefined&&raw.reopenScope==='renderer-reload-and-store-reopen','cas-exercise-pid','Exercise must own its seal and cannot substitute a resume phase');
 }
 need(sameRef(proof.phaseBindings.exerciseResult,exerciseRef),'cas-exercise-ref','Checked CAS metadata does not bind the original exercise result');
 const exerciseSql=await record(exercise.sqlProof,'CAS original exercise SQL snapshot');
 need(exerciseSql.schema==='desktop176-exercise-sql/1'&&equal(stateBody(exerciseSql),stateBody(state)),'cas-exercise-sql','Original exercise SQL snapshot does not bind the complete sealed final state');
 if(raw.phaseID==='resume'){
  const resumeSql=await record(raw.sqlProof,'CAS original resume SQL snapshot');
  need(resumeSql.schema==='desktop176-resume-sql/1'&&resumeSql.unchanged===true&&sameRef(resumeSql.seal,raw.resumeSeal)&&equal(stateBody(resumeSql.before),stateBody(state))&&equal(resumeSql.before,resumeSql.after),'cas-resume-sql','Resume original before/after SQL state is not identical to the exercise seal');
 }
 const methods=['bootstrap','generate','saveProfile','saveSession','listHistory','restoreHistory','getCmnReadingOptions','confirmParentNameReading','searchCharacters','backup','restore','exportReport'];
 const traces=async value=>{
  need(Array.isArray(value.originalResponses)&&value.originalResponses.length>0&&Array.isArray(value.scenarios)&&equal(value.scenarios.map(row=>row.scenarioId),CASES),'cas-records','Original phase IPC index and ordered scenarios are required');
  const files=new Set(),out=[],prefix='desktop176-'+value.mode+'-'+value.phaseID;
  for(const [index,row]of value.originalResponses.entries()){
   const id=prefix+'-'+String(index+1).padStart(4,'0');
   need(object(row)&&row.requestId===id&&CASES.includes(row.scenarioId)&&methods.includes(row.method)&&['resolved','rejected'].includes(row.responseKind)&&row.transport==='renderer-preload-ipc'&&row.serialization==='complete-JSON-of-structured-value-as-received','cas-index','Original request ordinal/scenario/method/kind or transport is invalid');
   for(const [kind,ref]of [['request',row.request],['response',row.response]]){await exact(ref,'CAS '+id+' '+kind);const file=path.resolve(ref.file);need(path.basename(file)===id+'-'+kind+'.json'&&!files.has(file),'cas-record-file','Original phase request/response files are duplicated or misindexed');files.add(file);}
   const request=await record(row.request,'CAS '+id+' request'),response=await read(row.response,'CAS '+id+' response');
   need(equal(keys(request),['args','method','requestId','scenarioId'])&&request.requestId===id&&request.scenarioId===row.scenarioId&&request.method===row.method&&Array.isArray(request.args),'cas-request','Complete original request body differs from its indexed metadata');
   if(value.phaseID==='resume')need(['bootstrap','listHistory'].includes(row.method)&&row.responseKind==='resolved','cas-resume-write','Resume original IPC performed a write or rejected operation');
   out.push({row,request,response,index});
  }
  for(const scenario of value.scenarios){const ids=out.filter(item=>item.row.scenarioId===scenario.scenarioId).map(item=>item.row.requestId);need(ids.length>0&&equal(scenario.responseRequestIds,ids),'cas-scenario-index','Scenario response index omits/adds/reorders original requests');}
  return out;
 };
 const trace=await traces(exercise),project=proof.phaseBindings.scenarios.find(row=>row.scenarioId===projectCase),sourceScenario=exercise.scenarios[2];
 need(object(project)&&equal(project.sessionIds,sourceScenario.sessionIds)&&project.sessionIds.length===1&&project.casByteWitness==='not-recorded-in-r2','cas-project','Project CAS metadata must bind one original source session and preserve byte scope');
 for(const key of ['originalProjectResponse','staleRequest','rejectedResponse','subsequentAcceptedResponse'])need(refShape(project[key]),'cas-witness','Missing exact project '+key+' original file reference');
 const AResult=await record(project.originalProjectResponse,'CAS original project generation response'),staleRequest=await record(project.staleRequest,'CAS original stale request'),rejection=await record(project.rejectedResponse,'CAS original rejection response'),C=await record(project.subsequentAcceptedResponse,'CAS original subsequent accepted response');
 const staleMatches=trace.filter(item=>sameRef(item.row.request,project.staleRequest));need(staleMatches.length===1,'cas-witness','Stale request ref is not one original indexed request');
 const stale=staleMatches[0],at=stale.index;
 const expect=(offset,method,kind='resolved')=>{const item=trace[at+offset];need(item&&item.row.scenarioId===projectCase&&item.row.method===method&&item.row.responseKind===kind,'cas-sequence','Original CAS/history/backup source sequence differs at '+(at+offset+1));return item;};
 const generated=expect(-2,'generate'),waterSave=expect(-1,'saveSession'),rejected=expect(0,'saveSession','rejected'),noteSave=expect(1,'saveSession');
 need(sameRef(generated.row.response,project.originalProjectResponse)&&sameRef(rejected.row.response,project.rejectedResponse)&&sameRef(noteSave.row.response,project.subsequentAcceptedResponse)&&equal(staleRequest,stale.request)&&equal(rejection,stale.response)&&equal(C,noteSave.response),'cas-witness','Project refs substitute a wrong indexed request/response kind or source stage');
 const A=AResult.session,B=waterSave.response,id=project.sessionIds[0];
 const session=value=>object(value)&&value.id===id&&Number.isSafeInteger(value.reviewRevision)&&value.reviewRevision>=0&&typeof value.reviewToken==='string'&&value.reviewToken.length>0;
 need(session(A)&&session(B)&&session(C)&&equal(A,state.projectOriginal)&&equal(AResult,generated.response),'cas-original','Original generated project or independently accepted previous full snapshot is missing');
 const waterDraft=structuredClone(A);need(object(waterDraft.preferences)&&Array.isArray(waterDraft.candidates)&&waterDraft.candidates.length>0,'cas-original','Complete generation preferences/candidates missing');waterDraft.preferences={...waterDraft.preferences,preferredElements:['水']};waterDraft.reviewNote='desktop176保存人工水草稿，仍保留原项目采用';
 need(equal(waterSave.request.args,[waterDraft]),'cas-previous-request','Previous accepted request was not made from the original generated CAS snapshot');
 const expectedB=structuredClone(waterDraft);for(const candidate of expectedB.candidates){need(Array.isArray(candidate.warnings),'cas-original','Complete original warnings missing');if(!candidate.warnings.includes(warning))candidate.warnings.push(warning);}
 need(equal(without(B,'reviewRevision','reviewToken'),without(expectedB,'reviewRevision','reviewToken'))&&B.reviewRevision===A.reviewRevision+1&&B.reviewToken!==A.reviewToken,'cas-previous-response','Independent accepted previous response does not match the source-authorized complete water draft transition');
 need(equal(stale.request.args,[{...A,reviewNote:'应拒绝的过期窗口'}])&&stale.request.args[0].reviewRevision!==B.reviewRevision&&stale.request.args[0].reviewToken!==B.reviewToken&&typeof rejection.name==='string'&&rejection.name.length>0&&typeof rejection.message==='string'&&rejection.message.length>0,'cas-stale','Rejected request is not the independently stale original revision/token or has no actual error response');
 need(equal(noteSave.request.args,[{...B,reviewNote:'desktop176归档真实水草稿'}])&&equal(without(C,'reviewRevision','reviewToken'),without(noteSave.request.args[0],'reviewRevision','reviewToken'))&&C.reviewRevision===B.reviewRevision+1&&C.reviewToken!==B.reviewToken,'cas-next-response','Subsequent accepted full response does not use the independently captured prior CAS after rejection');
 const listed=expect(2,'listHistory');need(equal(listed.request.args,[id])&&Array.isArray(listed.response),'cas-history','Actual history request/result missing');
 need(equal(listed.response.map(row=>canonical(row.session)).sort(),[A,B].map(value=>canonical(value)).sort()),'cas-history-list','Original pre-restore history is not the exact independently captured A/B snapshot set');
 for(const value of listed.response){const row=replay.rows.revisions.find(row=>row.id===Number(value.id));need(row&&row.sessionId===id&&value.sessionId===id&&value.createdAt===row.createdAt&&equal(value.session,JSON.parse(row.json)),'cas-history-list','Original history target ID/parent/time/full snapshot differs from final preserved SQL history');}
 const target=listed.response.find(row=>equal(row.session?.preferences?.preferredElements,['水']));
 need(target&&positive(Number(target.id))&&Number.isSafeInteger(Number(target.id))&&equal(target.session,B),'cas-history-target','Selected real water history does not contain the independently accepted previous full snapshot');
 const restored=expect(3,'restoreHistory'),D=restored.response;
 need(session(D)&&equal(restored.request.args,[id,target.id,C.reviewRevision,C.reviewToken])&&equal(without(D,'reviewRevision','reviewToken'),without(B,'reviewRevision','reviewToken'))&&D.reviewRevision===C.reviewRevision+1&&D.reviewToken!==C.reviewToken,'cas-history-restore','Actual history restore is not bound to its captured target and current CAS');
 const currentMap=new Map(replay.rows.sessions.map(row=>[row.id,JSON.parse(row.json)])),profileMap=new Map(replay.rows.profiles.map(row=>[row.id,JSON.parse(row.json)]));
 const bootstrap=item=>{need(item.request.args.length===0&&object(item.response)&&Array.isArray(item.response.sessions)&&Array.isArray(item.response.profiles),'cas-bootstrap','Complete original bootstrap payload missing');sameIds(item.response.sessions.map(row=>row.id),[...currentMap.keys()],'CAS bootstrap sessions');sameIds(item.response.profiles.map(row=>row.id),[...profileMap.keys()],'CAS bootstrap profiles');for(const value of item.response.profiles)need(equal(value,profileMap.get(value.id)),'cas-bootstrap-profile','Original bootstrap profile differs from sealed/final SQL');return item.response.sessions;};
 const beforeItem=expect(4,'bootstrap'),before=bootstrap(beforeItem);need(equal(before.find(row=>row.id===id),D),'cas-before-backup','Actual pre-backup full bootstrap is not the captured restored project D');
 const backed=expect(5,'backup');need(backed.request.args.length===0&&typeof backed.response==='string'&&refShape(exerciseSql.files?.backup)&&path.resolve(backed.response)===path.resolve(exerciseSql.files.backup.file)&&exerciseSql.files.restores===2,'cas-backup','Actual backup request/response differs from original file-route receipt');await exact(exerciseSql.files.backup,'CAS original backup file');
 const temporary=expect(6,'saveSession'),E=temporary.response;
 need(session(E)&&equal(temporary.request.args,[{...D,reviewNote:'只存在于备份后的改动'}])&&equal(without(E,'reviewRevision','reviewToken'),without(temporary.request.args[0],'reviewRevision','reviewToken'))&&E.reviewRevision===D.reviewRevision+1&&E.reviewToken!==D.reviewToken,'cas-temporary','Post-backup temporary save is not its independent prior full CAS transition');
 const restoreBackup=expect(7,'restore');need(restoreBackup.request.args.length===0&&restoreBackup.response===true,'cas-backup-restore','Actual backup restore did not resolve true');
 const afterItem=expect(8,'bootstrap'),after=bootstrap(afterItem),reloadItem=expect(9,'bootstrap'),final=bootstrap(reloadItem);
 for(const previous of before){const value=after.find(row=>row.id===previous.id);need(value&&equal(without(value,'reviewToken'),without(previous,'reviewToken'))&&value.reviewToken!==previous.reviewToken,'cas-backup-final','Backup restore changed complete original fields beyond its captured review-token rotation');}
 need(equal(final,after),'cas-final-bootstrap','Final renderer-reload bootstrap differs from original post-backup bootstrap');
 for(const value of final)need(equal(value,currentMap.get(value.id))&&state.current.find(row=>row.id===value.id)?.canonical===canonical(value),'cas-final-state','Independent final complete bootstrap differs from sealed/current raw SQL JSON');
 for(const value of [A,B,C])need(state.history.some(row=>row.sessionId===id&&equal(JSON.parse(row.raw),value)),'cas-final-history','Actual sealed history lacks an independently captured original accepted project snapshot');
 need(equal(state.history.filter(row=>row.sessionId===id).map(row=>canonical(JSON.parse(row.raw))).sort(),[A,B,C].map(value=>canonical(value)).sort()),'cas-final-history','Final preserved project history must be exactly A/B/C; temporary D/E history cannot survive backup restoration');
 let tail=at+10;
 for(const scenario of exercise.scenarios){const item=trace[tail++];need(item&&item.row.method==='exportReport'&&item.row.responseKind==='resolved'&&item.row.scenarioId===scenario.scenarioId&&item.request.args.length===1&&typeof item.response==='string'&&path.resolve(item.response)===path.resolve(scenario.pdf.file),'cas-final-export','Only the three original exercise exports may follow final bootstrap');const snapshot=await record(scenario.pdf.snapshot,'CAS original export snapshot');need(equal(snapshot,item.request.args[0])&&snapshot.id===scenario.pdf.sessionId&&equal(snapshot,currentMap.get(snapshot.id)),'cas-export-snapshot','Actual export request/snapshot is not the captured final full session');}
 need(tail===trace.length,'cas-final-write','Unverified IPC calls occurred after the sealed final bootstrap/exports');
 let authenticatedResponses=trace.length;
 if(raw.phaseID==='resume'){
  const resumeTrace=await traces(raw);let index=0;
  authenticatedResponses+=resumeTrace.length;
  for(const scenario of raw.scenarios){const previous=exercise.scenarios.find(row=>row.scenarioId===scenario.scenarioId);need(previous&&equal(previous.sessionIds,scenario.sessionIds)&&equal(previous.customerIds,scenario.customerIds)&&equal(previous.pdf,scenario.pdf)&&equal(previous.screenshot,scenario.screenshot),'cas-resume-artifacts','Resume changed original exercise session/customer/export identities');
   const boot=resumeTrace[index++];need(boot?.row.scenarioId===scenario.scenarioId&&boot.row.method==='bootstrap'&&boot.row.responseKind==='resolved','cas-resume-bootstrap','Every resumed scenario requires its own original bootstrap');const values=bootstrap(boot);for(const value of values)need(equal(value,currentMap.get(value.id)),'cas-resume-current','Resumed complete bootstrap differs from the original sealed/current state');
   for(const sessionId of scenario.sessionIds){const item=resumeTrace[index++];need(item?.row.scenarioId===scenario.scenarioId&&item.row.method==='listHistory'&&item.row.responseKind==='resolved'&&equal(item.request.args,[sessionId])&&Array.isArray(item.response),'cas-resume-history','Original read-only history response missing for a sealed session');const wanted=replay.rows.revisions.filter(row=>row.sessionId===sessionId).sort((a,b)=>a.id-b.id),actual=[...item.response].sort((a,b)=>Number(a.id)-Number(b.id));need(wanted.length===actual.length,'cas-resume-history','Resumed history omits/adds original revisions');for(let i=0;i<wanted.length;i++)need(equal({...actual[i],id:Number(actual[i].id)},{id:wanted[i].id,sessionId:wanted[i].sessionId,createdAt:wanted[i].createdAt,session:JSON.parse(wanted[i].json)}),'cas-resume-history','Complete resumed history columns/session differ from sealed original SQL');}
  }
  need(index===resumeTrace.length,'cas-resume-extra','Resume contains extra original requests');
 }
 need(proof.phaseBindings.responseFilesChecked===authenticatedResponses*2,'cas-response-coverage','Reported original IPC file count differs from the actual authenticated phase traces');
 return{status:'passed',exerciseResult:exerciseRef,originalProjectResponse:project.originalProjectResponse,previousAcceptedResponse:waterSave.row.response,staleRequest:project.staleRequest,rejectedResponse:project.rejectedResponse,subsequentAcceptedResponse:project.subsequentAcceptedResponse,historyRestoredResponse:restored.row.response,finalBootstrap:reloadItem.row.response,selectedPhase:raw.phaseID,responseFilesChecked:authenticatedResponses*2,casByteWitness:'not-recorded-in-r2'};
}
