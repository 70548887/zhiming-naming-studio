import fs from 'node:fs';
import path from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {safeRoot,safeInput,safeRelativeInput,newEvidencePath,reserveEvidenceDirectory,writeNewJson,isInside} from './safe-paths.mjs';
import {fileIdentity,sha256,walk} from './common.mjs';
import {reference,readFreeze} from './release-capture.mjs';
import {expectedPackageFiles,releaseArtifactPaths,assertReleasePackageCommand} from './release.mjs';
import {regressionCounts} from './release-regression.mjs';
import {TEST_FREEZE_SCHEMA,isGenerated,immutableInventory,executionFacts} from './release-phases.mjs';
import {DESKTOP176_SQL_SCHEMA,assertDesktop176SqlProof,desktop176SourceReader} from './desktop176-sql-consumer.mjs';
import {verifyDesktop176AssemblyEvidence} from './release-evidence.mjs';

export const DESKTOP176_ASSEMBLY_SCHEMA='naming-studio-release-assembly/3';
const VERSION='1.0.38',ROLES=['fullRegression','buildAndPackage','package','installedRuntime','runtimeRecord'];
const need=(value,message)=>{if(!value)throw new Error('Assembly3: '+message);};
const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&path.resolve(a)===path.resolve(b);
const fullRef=ref=>ref&&typeof ref.file==='string'&&hash(ref.sha256)&&Number.isSafeInteger(ref.bytes)&&ref.bytes>0;
const sameRef=(a,b)=>fullRef(a)&&fullRef(b)&&same(a.file,b.file)&&a.sha256===b.sha256&&a.bytes===b.bytes;
const ordered=(...values)=>values.every(value=>typeof value==='string'&&Number.isFinite(Date.parse(value)))&&values.every((value,index)=>!index||Date.parse(values[index-1])<=Date.parse(value));
const jsonBytes=value=>JSON.stringify(value,null,2)+'\n';
function data(value,seen=new Set()){
 if(value===null||['string','boolean'].includes(typeof value))return;
 if(typeof value==='number'){need(Number.isFinite(value),'Nonfinite configuration number');return;}
 need(value&&typeof value==='object'&&!seen.has(value),'Plain acyclic configuration required');
 need(Array.isArray(value)?Object.getPrototypeOf(value)===Array.prototype:[Object.prototype,null].includes(Object.getPrototypeOf(value)),'Nonplain configuration');seen.add(value);
 for(const key of Reflect.ownKeys(value)){if(Array.isArray(value)&&key==='length')continue;const d=Object.getOwnPropertyDescriptor(value,key);need(typeof key==='string'&&d&&Object.hasOwn(d,'value')&&d.enumerable,'Configuration accessor/hidden/symbol field');data(d.value,seen);}seen.delete(value);
}
function exactKeys(value,required,optional=[]){need(value&&typeof value==='object'&&!Array.isArray(value),'Object configuration required');const keys=Object.keys(value);need(required.every(key=>Object.hasOwn(value,key))&&keys.every(key=>required.includes(key)||optional.includes(key)),'Unknown or missing assembly3 configuration field');}
export function validateDesktop176AssemblyConfig(config,releaseDirectory){
 data(config);exactKeys(config,['schema','version','releaseDirectory','inputFreeze','installer','builtAsar','installedAsar',...ROLES],['remaining']);
 need(config.schema===DESKTOP176_ASSEMBLY_SCHEMA&&config.version===VERSION,'Only exact assembly3 application1.0.38 is supported');
 need(typeof config.releaseDirectory==='string'&&(releaseDirectory===undefined||releaseDirectory===config.releaseDirectory),'Selected release directory differs');
 need(fullRef(config.inputFreeze),'Original test-input-freeze full reference required');
 for(const key of ['installer','builtAsar','installedAsar'])need(typeof config[key]==='string'&&config[key].length>0,'Binary path missing: '+key);
 for(const role of ROLES){exactKeys(config[role],role==='buildAndPackage'?['commandCapture']:['commandCapture','file']);for(const value of Object.values(config[role]))need(typeof value==='string'&&value.length>0,'Gate paths must be explicit strings');}
 if(config.remaining!==undefined)need(Array.isArray(config.remaining)&&config.remaining.every(value=>typeof value==='string'),'Remaining must be a string array');
 return config;
}


/** Validate the selected SQL child, independently of the proof's domain assertions. */
export async function validateDesktop176SqlChildCapture({root,capture,proof,proofRef,raw,rawRef,processRef,postRef,inputFreeze,buildCapture}){
 const sourceIO=desktop176SourceReader(root),verified=new Map(),loaded=new Map();
 const key=ref=>{const file=path.resolve(ref.file);return process.platform==='win32'?file.toLowerCase():file;};
 const shape=ref=>ref&&typeof ref.file==='string'&&path.isAbsolute(ref.file)&&hash(ref.sha256)&&Number.isSafeInteger(ref.bytes)&&ref.bytes>=0;
 const equalRefs=(a,b)=>shape(a)&&shape(b)&&key(a)===key(b)&&a.sha256===b.sha256&&a.bytes===b.bytes;
 const exact=async(ref,label)=>{need(shape(ref),'SQL child full input reference missing: '+label);const id=key(ref),prior=verified.get(id);if(prior){need(equalRefs(prior,ref),'SQL child conflicting input reference: '+label);return prior;}await sourceIO.sourceCompare(ref.file,ref.sha256,ref.bytes,label);verified.set(id,ref);return ref;};
 const record=async(ref,label)=>{need(fullRef(ref),'SQL child JSON reference missing: '+label);await exact(ref,label);const id=key(ref);if(!loaded.has(id)){const value=JSON.parse(await sourceIO.sourceLoadRef(ref));data(value);loaded.set(id,value);}return loaded.get(id);};
 const table=(refs,label)=>{need(Array.isArray(refs),'SQL child reference list missing: '+label);const map=new Map();for(const ref of refs){need(shape(ref)&&!map.has(key(ref)),'SQL child duplicate/malformed reference: '+label);map.set(key(ref),ref);}return map;};
 const sameSet=(left,right,label)=>{const a=table(left,label+' before'),b=table(right,label+' after');need(a.size===b.size&&[...a].every(([id,ref])=>equalRefs(ref,b.get(id))),'SQL child before/after reference set changed: '+label);return a;};
 const includes=(refs,ref,label)=>need(refs.some(row=>equalRefs(row,ref)),'SQL child authenticated input omitted: '+label);
 need(fullRef(proofRef),'SQL selected proof must be a positive-byte JSON original');await exact(proofRef,'SQL selected proof output');
 need(capture.schema==='naming-studio-command-capture/1'&&capture.profile==='desktop176/1'&&capture.version===VERSION&&capture.role==='installedRuntime'&&capture.mode==='Installed'&&capture.phaseID==='resume'&&capture.status==='completed'&&capture.exitCode===0&&capture.signal===null&&capture.launchError===null,'SQL child exact successful capture profile required');
 for(const field of ['outputErrors','artifactErrors','inputErrors'])need(Array.isArray(capture[field])&&capture[field].length===0,'SQL child capture reports '+field);
 need(capture.freezeError===null&&sameRef(capture.sourceFreeze,inputFreeze)&&sameRef(capture.freezeAfter,inputFreeze),'SQL child capture freeze changed');
 const command=capture.command,args=command?.args;
 need(command&&Array.isArray(args)&&args.length===5&&args.every(arg=>typeof arg==='string')&&[args[0],args[2],args[4]].every(arg=>path.isAbsolute(arg))&&args[1]==='--config'&&args[3]==='--output'&&same(args[4],proofRef.file)&&same(command.cwd,root),'SQL child fixed config/output argv required');
 const entry=proof.fullSource?.checkerSources?.entry,executable={file:command.executable,sha256:command.sha256,bytes:command.bytes};
 need(fullRef(entry)&&sameRef(command.entryScript,entry)&&same(args[0],entry.file)&&fullRef(executable),'SQL child entry/executable differs from original checker');
 const immutable=table(capture.immutableInputs,'immutableInputs'),configRef=immutable.get(key({file:args[2]}));
 need(configRef&&fullRef(configRef),'SQL child actual config is not an immutable input');
 const config=await record(configRef,'actual checker config');
 need(config.schema==='naming-studio-desktop176-sql-inputs/1'&&config.version===VERSION&&config.workflowId==='desktop176/1'&&config.mode==='Installed'&&config.phaseID==='resume'&&same(config.projectRoot,root),'SQL child config profile differs');
 const database={file:proof.database?.path,sha256:proof.database?.sha256Before,bytes:proof.database?.bytesBefore};
 need(fullRef(database)&&same(database.file,path.join(raw.userData,'customers.sqlite'))&&sameRef(config.raw,rawRef)&&sameRef(config.process,processRef)&&sameRef(config.post,postRef)&&sameRef(config.database,database)&&sameRef(config.inputFreeze,inputFreeze)&&sameRef(config.buildCapture,buildCapture)&&same(config.userData,raw.userData),'SQL child config original raw/P/post/DB/freeze/build differs');
 need(config.reader&&sameRef(config.reader.manifest,proof.fullSource?.manifest)&&sameRef(config.reader.bundle,proof.fullSource?.bundle)&&sameRef(config.reader.wasm,proof.fullSource?.wasm)&&same(config.sourceRoot,proof.fullSource?.sourceRoot)&&same(config.dataDirectory,path.join(config.sourceRoot,'data')),'SQL child config reader/source directory differs');
 for(const [name,ref]of Object.entries({config:configRef,raw:rawRef,process:processRef,post:postRef,database,inputFreeze,buildCapture}))includes(capture.immutableInputs,ref,name);
 for(const ref of capture.immutableInputs)await exact(ref,'immutable SQL input');
 need(Array.isArray(capture.outputs)&&capture.outputs.length===1&&sameRef(capture.outputs[0],proofRef)&&Array.isArray(capture.declaredOutputs)&&capture.declaredOutputs.length===1&&same(capture.declaredOutputs[0],proofRef.file),'SQL child must declare only its selected proof output');
 need(Array.isArray(capture.artifacts)&&![rawRef,processRef,postRef].some(ref=>capture.artifacts.some(row=>equalRefs(row,ref))),'SQL child cannot claim original App inputs as artifacts');
 const before=await record(capture.before,'SQL before snapshot'),after=await record(capture.after,'SQL after snapshot'),tool=await record(capture.toolProcessEvidence,'SQL original tool process');
 for(const snapshot of [before,after])need(snapshot.schema==='desktop176-sql-capture-input-snapshot/1'&&snapshot.status==='verified'&&snapshot.appVersion===VERSION&&snapshot.mode==='Installed'&&snapshot.phaseID==='resume'&&sameRef(snapshot.inputFreeze,inputFreeze)&&sameRef(snapshot.sourceManifest,before.sourceManifest),'SQL child snapshot profile/source differs');
 const source=await record(before.sourceManifest,'SQL checker source manifest');
 need(source.schema==='naming-studio-desktop176-sql-source/1'&&source.applicationVersion===VERSION&&source.workflowId==='desktop176/1'&&source.nodePolicy==='caller-pins-executable'&&sameRef(source.entryScript,entry),'SQL child source manifest/entry differs');
 need(source.reader&&sameRef(source.reader.manifest,config.reader.manifest)&&sameRef(source.reader.bundle,config.reader.bundle)&&sameRef(source.reader.wasm,config.reader.wasm),'SQL child source manifest reader differs');
 sameSet(source.codeFiles,Object.values(proof.fullSource?.checkerSources),'checker code closure');
 const sourceTools=[before.sourceManifest,...source.codeFiles,source.contract],runtimeTools=[executable,...Object.values(config.reader)];
 sameSet(before.sourceTools,sourceTools,'source tools');sameSet(command.toolFiles,before.sourceTools,'command tools');sameSet(before.runtimeTools,runtimeTools,'runtime tools');sameSet(capture.runtimeTools,before.runtimeTools,'capture runtime tools');sameSet(capture.immutableInputs,before.dataInputs,'capture data inputs');
 const freeze=await record(inputFreeze,'SQL input freeze');
 need(freeze.schema===TEST_FREEZE_SCHEMA&&freeze.version===VERSION&&freeze.files&&typeof freeze.files==='object','SQL input freeze schema differs');
 const frozen=table(before.files,'frozen files');need(frozen.size===Object.keys(freeze.files).length,'SQL child frozen file inventory incomplete');
 for(const [relative,expected]of Object.entries(freeze.files)){const ref=frozen.get(key({file:path.resolve(root,relative)}));need(ref&&ref.sha256===expected,'SQL child frozen file snapshot differs: '+relative);}
 for(const ref of before.sourceTools){const relative=path.relative(root,ref.file).replaceAll('\\','/');need(freeze.files[relative]===ref.sha256,'SQL child tool outside original freeze');}
 for(const field of ['files','sourceTools','runtimeTools','dataInputs','referenceGraph']){sameSet(before[field],after[field],field);for(const ref of before[field])await exact(ref,'SQL '+field);}
 const graph=table(before.referenceGraph,'reference graph'),pending=[inputFreeze,...before.sourceTools,...before.runtimeTools,...before.dataInputs],visited=new Set();let jsonBytes=0,nodes=0;
 const visit=(value,depth=0)=>{need(depth<=100&&++nodes<=500000,'SQL input JSON reference graph exceeds bound');if(!value||typeof value!=='object')return;if(!Array.isArray(value)&&shape(value))pending.push({file:value.file,sha256:value.sha256,bytes:value.bytes});for(const child of Object.values(value))if(child&&typeof child==='object')visit(child,depth+1);};
 while(pending.length){const ref=pending.pop(),id=key(ref);need(equalRefs(graph.get(id),ref),'SQL child input reference graph incomplete');if(visited.has(id))continue;need(visited.size<20000,'SQL input reference graph exceeds count bound');visited.add(id);if(/\.json$/i.test(ref.file)&&ref.bytes>0){jsonBytes+=ref.bytes;need(ref.bytes<=67108864&&jsonBytes<=268435456,'SQL input JSON byte bound exceeded');visit(await record(ref,'SQL reference graph JSON'));}}
 need(visited.size===graph.size,'SQL child reference graph has unexplained inputs');
 need(before.command&&sameRef(before.command.executable,executable)&&sameRef(before.command.entryScript,entry)&&isDeepStrictEqual(before.command.args,args)&&same(before.command.cwd,root),'SQL child prelaunch command differs');
 need(Array.isArray(before.approvedOutputs)&&before.approvedOutputs.length===1&&same(before.approvedOutputs[0],proofRef.file)&&isDeepStrictEqual(before.approvedArtifactDirectories,capture.approvedArtifactDirectories),'SQL child approved outputs/artifacts differ');
 const roots=[proofRef.file.replace(/\.json$/,'')+'.files',config.scratchDirectory];
 need(typeof roots[1]==='string'&&path.isAbsolute(roots[1])&&same(roots[1],path.join(path.dirname(proofRef.file),'strong-sql-scratch'))&&Array.isArray(capture.approvedArtifactDirectories)&&capture.approvedArtifactDirectories.length===2&&roots.every(root=>capture.approvedArtifactDirectories.some(directory=>same(directory,root)))&&new Set(capture.approvedArtifactDirectories.map(directory=>key({file:directory}))).size===2,'SQL child artifact roots must be derived from exact proof/config paths');
 for(const directory of roots)need(!same(directory,raw.userData)&&!isInside(raw.userData,directory)&&!isInside(directory,raw.userData),'SQL child artifact root overlaps original App userData');
 const inputPaths=new Set(),inputPhysical=new Set(),physicalCache=new Map();
 const physical=ref=>{const id=key(ref);if(!physicalCache.has(id)){const stat=fs.statSync(ref.file,{bigint:true});physicalCache.set(id,stat.ino===0n?'path:'+id:String(stat.dev)+':'+String(stat.ino));}return physicalCache.get(id);};
 for(const ref of [...capture.immutableInputs,...before.referenceGraph,...before.files]){inputPaths.add(key(ref));inputPhysical.add(physical(ref));}
 need(!inputPaths.has(key(proofRef))&&!inputPhysical.has(physical(proofRef)),'SQL proof output aliases an immutable input');
 for(const artifact of capture.artifacts){need(shape(artifact)&&roots.some(directory=>isInside(directory,artifact.file))&&!inputPaths.has(key(artifact))&&!inputPhysical.has(physical(artifact)),'SQL artifact must be a new file inside exact SQL roots, never an App/source input');await exact(artifact,'SQL output artifact');}
 // Capture must describe every ordinary leaf in exactly the two authenticated SQL roots.
 const declaredArtifacts=table(capture.artifacts,'SQL output artifact inventory'),actualArtifacts=new Map(),directorySnapshots=[],pendingDirectories=roots.map(directory=>safeInput(root,directory));
 const stable=(before,after)=>['dev','ino','size','mtimeNs','ctimeNs'].every(field=>before[field]===after[field]);
 while(pendingDirectories.length){
  const directory=safeInput(root,pendingDirectories.pop()),directoryStat=fs.lstatSync(directory,{bigint:true});
  need(directoryStat.isDirectory()&&!directoryStat.isSymbolicLink(),'SQL artifact root/child must be an ordinary directory');
  const entries=fs.readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name));
  directorySnapshots.push({file:directory,stat:directoryStat,names:entries.map(entry=>entry.name).sort()});
  for(const entry of entries){
   const file=safeInput(root,path.join(directory,entry.name)),stat=fs.lstatSync(file,{bigint:true});
   need(!stat.isSymbolicLink(),'SQL artifact filesystem alias is not allowed');
   if(stat.isDirectory()){pendingDirectories.push(file);continue;}
   need(stat.isFile(),'SQL artifact leaf must be an ordinary file');
   const id=key({file}),physicalId=stat.ino===0n?'path:'+id:String(stat.dev)+':'+String(stat.ino);
   need(!actualArtifacts.has(id)&&!inputPaths.has(id)&&!inputPhysical.has(physicalId),'SQL artifact inventory duplicates a path or aliases an authenticated input');
   const ref={file,...await fileIdentity(file)},afterStat=fs.lstatSync(file,{bigint:true});
   need(shape(ref)&&afterStat.isFile()&&stable(stat,afterStat)&&key({file:safeInput(root,file)})===id,'SQL artifact changed during inventory');
   actualArtifacts.set(id,ref);
  }
 }
 for(const snapshot of directorySnapshots){const file=safeInput(root,snapshot.file),stat=fs.lstatSync(file,{bigint:true}),names=fs.readdirSync(file).sort();need(stat.isDirectory()&&stable(snapshot.stat,stat)&&isDeepStrictEqual(names,snapshot.names),'SQL artifact directory changed during inventory');}
 need(actualArtifacts.size===declaredArtifacts.size&&[...actualArtifacts].every(([id,ref])=>equalRefs(ref,declaredArtifacts.get(id))),'SQL child artifact inventory is incomplete or differs from its exact directories');
 need(tool.schema==='desktop176-frozen-tool-process/1'&&tool.name==='strong-sql'&&tool.status==='completed'&&tool.naturalExit===true&&tool.exitCode===0&&tool.signal===null&&tool.launchError===null&&Number.isSafeInteger(tool.pid)&&tool.pid>0&&capture.pid===tool.pid&&sameRef(tool.executable,executable)&&sameRef(tool.entryScript,entry)&&isDeepStrictEqual(tool.args,args)&&same(tool.cwd,root),'SQL child capture does not bind original observed tool process');
 for(const field of ['spawnObserved','exitObserved','closeObserved'])need(tool[field]===true&&capture[field]===true,'SQL child actual event missing: '+field);
 need(tool.startedAt===capture.startedAt&&tool.terminalAt===capture.terminalAt&&tool.completedAt===capture.completedAt&&ordered(before.observedAt,tool.startedAt,tool.terminalAt,tool.completedAt,after.observedAt),'SQL child before/tool/after times differ');
 need(equalRefs(tool.stdout,capture.stdout)&&equalRefs(tool.stderr,capture.stderr),'SQL child original log references differ');await exact(capture.stdout,'SQL stdout');await exact(capture.stderr,'SQL stderr');
 return{actualConfig:configRef,before:capture.before,tool:capture.toolProcessEvidence,after:capture.after,immutableInputs:immutable.size,referenceGraph:visited.size,AppInputsAreNotSqlOutputs:true};
}

/** Reads original proof and sidecars through the owner M198 consumer. No SQLite or checker execution. */
export async function validateDesktop176AssemblySqlEvidence({root,proof,proofRef,runtime,inputFreeze,buildCapture,sqlCapture,installer,built,installed,app}){
 need(proof?.schema===DESKTOP176_SQL_SCHEMA&&proof.expectedVersion===VERSION&&proof.workflowId==='desktop176/1'&&proof.mode==='Installed'&&proof.phaseID==='resume','Final SQL gate requires new176 Installed/resume proof');
 const compare=async(file,expected,bytes,label)=>{const actual=await fileIdentity(safeInput(root,path.resolve(root,file)));need(actual.sha256===expected&&actual.bytes===bytes,'Original bytes changed: '+label);return{file:path.resolve(root,file),...actual};};
 const loadRef=async ref=>fs.readFileSync(safeInput(root,path.resolve(root,ref.file)),'utf8');
 const read=async(ref,label)=>{need(fullRef(ref),'Missing full reference: '+label);await compare(ref.file,ref.sha256,ref.bytes,label);return JSON.parse(await loadRef(ref));};
 need(runtime.schema==='naming-studio-runtime-process/1'&&runtime.version===VERSION&&runtime.mode==='Installed'&&runtime.status==='passed'&&runtime.exitCode===0,'Actual completed Installed runtime required');
 need(sameRef(runtime.sourceFreeze,inputFreeze)&&sameRef(runtime.buildCapture,buildCapture),'Runtime original input/build references differ');
 const rawRef=await reference(root,runtime.result),processRef=runtime.processEvidence,postRef=proof.postEvidence;
 need(sameRef(proof.inputs?.raw,rawRef)&&sameRef(proof.inputs?.process,processRef)&&sameRef(proof.inputs?.post,postRef),'SQL final raw/P/post differ from selected runtime');
 need(sqlCapture.schema==='naming-studio-command-capture/1'&&sqlCapture.role==='installedRuntime'&&sqlCapture.mode==='Installed'&&sqlCapture.phaseID==='resume'&&sqlCapture.mode===proof.mode&&sqlCapture.phaseID===proof.phaseID,'SQL child capture must be exact Installed/resume installedRuntime evidence');
 need(sqlCapture.outputs?.some(ref=>sameRef(ref,proofRef)),'SQL proof was not an output of this exact SQL child capture');
 const raw=await read(rawRef,'App raw'),P=await read(processRef,'original P'),post=await read(postRef,'post-exit');
 need(raw.mode==='Installed'&&raw.phaseID==='resume'&&raw.userData&&raw.pid===runtime.app?.pid&&same(raw.executable?.file,app.file)&&sameRef(raw.executable,app),'Runtime App identity differs from resumed raw');
 need(P.scope==='naming-v7'&&P.normalProcessesTerminated===false&&P.normalCustomerDataUsed===false&&P.electronRunAsNodePresent===false&&P.developerToolsPathRemoved===true,'Original P isolation fields differ');
 need(P.environment?.NAMING_STUDIO_SMOKE_SCOPE==='naming-v7'&&P.environment?.NAMING_STUDIO_SMOKE_EXIT==='1'&&same(P.environment?.NAMING_STUDIO_USER_DATA,raw.userData)&&same(P.environment?.NAMING_STUDIO_SMOKE,path.dirname(rawRef.file)),'Original P owned environment differs');
 need(sameRef(P.builtAsar,built)&&sameRef(P.installedAsar,installed)&&sameRef(P.installer,installer),'Original P binary/installer full references differ');
 const I=P.installer;need(Number.isSafeInteger(I.pid)&&I.pid>0&&I.exitCode===0&&I.signal===null&&I.launchError===null&&ordered(I.startedAt,I.terminalAt,I.completedAt,P.startedAt),'Original installer process is not complete before App start');
 const times=runtime.observedProcessTimes;need(times&&P.startedAt===times.startedAt&&P.terminalAt===times.terminalAt&&P.completedAt===times.completedAt&&P.startedAt===(runtime.app?.startedAt??runtime.app?.started)&&P.terminalAt===runtime.terminalAt&&P.completedAt===runtime.completed,'Runtime must preserve original observed App times');
 need(P.startedAt===post.startedAt&&P.terminalAt===post.terminalAt&&P.completedAt===post.completedAt&&ordered(P.startedAt,raw.startedAt,raw.completedAt,P.terminalAt,P.completedAt,sqlCapture.startedAt,sqlCapture.completedAt),'Captured App/raw/post times differ');
 need(same(raw.userData,runtime.app.userData)&&same(proof.database?.path,path.join(raw.userData,'customers.sqlite'))&&same(path.dirname(rawRef.file),runtime.output),'Runtime/userData/output paths differ');
 need(same(runtime.sqlVerification,proofRef.file),'Runtime points to another SQL proof');
 const sqlChild=await validateDesktop176SqlChildCapture({root,capture:sqlCapture,proof,proofRef,raw,rawRef,processRef,postRef,inputFreeze,buildCapture});
 const summary=await assertDesktop176SqlProof({root,proof,inputFreeze,buildCapture,mode:'Installed',phaseID:'resume',rawRef,processRef,postRef,loadRef,compare,...desktop176SourceReader(root)});
 return{summary,rawRef,processRef,postRef,sqlChild};
}

/** New profile only. Legacy verification/assembly branches never enter this helper. */
export async function assembleDesktop176Execution({root,config,output,releaseDirectory},{commandProof,capturedJson,checkPayload,extract}){
 validateDesktop176AssemblyConfig(config,releaseDirectory);root=safeRoot(root);
 const destination=newEvidencePath(root,path.resolve(root,output)),pkg=JSON.parse(fs.readFileSync(safeRelativeInput(root,'package.json'),'utf8'));
 need(pkg.version===VERSION,'Workspace is not application1.0.38');const artifacts=releaseArtifactPaths(root,VERSION,config.releaseDirectory);
 const freeze=await readFreeze(root,config.inputFreeze.file,VERSION,config.inputFreeze.sha256);need(sameRef(freeze.ref,config.inputFreeze)&&freeze.value.schema===TEST_FREEZE_SCHEMA,'Exact original test-input freeze required');
 const inventory=new Set(expectedPackageFiles(root,pkg.build.files));
 for(const dir of ['src','data'])if(fs.existsSync(path.join(root,dir)))for(const file of walk(safeRelativeInput(root,dir),dir))inventory.add(file);
 for(const name of ['package.json','package-lock.json','index.html','tsconfig.json','vite.config.ts','vitest.config.ts'])if(fs.existsSync(path.join(root,name)))inventory.add(name);
 const requiredInputs=immutableInventory(root,[...inventory]);
 for(const file of new Set([...inventory,...Object.keys(freeze.value.files),...Object.keys(freeze.value.documentation??{})])){const input=path.resolve(root,file);need(!same(artifacts.directory,input)&&!isInside(artifacts.directory,input),'Release directory overlaps frozen/production input');need(!same(destination,input)&&!isInside(destination,input),'Assembly output overlaps an input');}
 need(!same(destination,artifacts.directory)&&!isInside(destination,artifacts.directory)&&!isInside(artifacts.directory,destination),'Assembly output and release directory must be separate');
 need(!same(artifacts.directory,freeze.ref.file)&&!isInside(artifacts.directory,freeze.ref.file)&&!same(destination,freeze.ref.file)&&!isInside(destination,freeze.ref.file),'Freeze record overlaps outputs');
 for(const file of requiredInputs)need(Object.hasOwn(freeze.value.files,file),'Frozen production input missing: '+file);
 const installer=await reference(root,config.installer),built=await reference(root,config.builtAsar),installed=await reference(root,config.installedAsar);
 need(same(installer.file,artifacts.installer)&&same(built.file,artifacts.builtAsar)&&built.sha256===installed.sha256&&built.bytes===installed.bytes,'Selected installer/ASAR identity differs');
 for(const archive of [built,installed]){const packed=JSON.parse(extract(archive.file,'package.json').toString());need(packed.version===VERSION&&packed.name===pkg.name,'ASAR package identity differs');}
 const proofs={};for(const role of ROLES)proofs[role]=await commandProof(root,config[role].commandCapture,role,freeze,VERSION);
 const regression=await capturedJson(root,config.fullRegression.file,proofs.fullRegression),counts=regressionCounts(regression.value),args=proofs.fullRegression.c.command.args;
 need(args.length===5&&same(args[0],path.join(root,'node_modules/vitest/vitest.mjs'))&&args[1]==='run'&&args[2]==='--reporter=default'&&args[3]==='--reporter=json'&&args[4]==='--outputFile='+regression.ref.file,'Original full regression command must be exact and unfiltered');
 const build=proofs.buildAndPackage;assertReleasePackageCommand(build.c.command.args,artifacts.releaseDirectory,{explicit:true});
 need(build.text.includes(`${pkg.name}@${VERSION} package`)&&/tsc --noEmit/.test(build.text)&&/vite .*building for production/.test(build.text)&&/built in/.test(build.text)&&/target=nsis/.test(build.text)&&build.text.includes(path.basename(installer.file)),'Original build log incomplete');
 for(const ref of [installer,built])need(build.c.artifacts?.some(item=>sameRef(item,ref)),'Build did not capture selected installer/ASAR');
 const rawPackage=await capturedJson(root,config.package.file,proofs.package),rawSql=await capturedJson(root,config.installedRuntime.file,proofs.installedRuntime),rawRuntime=await capturedJson(root,config.runtimeRecord.file,proofs.runtimeRecord);
 const pack=rawPackage.value,sql=rawSql.value,runtime=rawRuntime.value;
 need(pack.schema==='naming-studio-package-payload/1'&&pack.mode==='installed-complete-payload'&&pack.expectedVersion===VERSION&&pack.ok===true&&pack.summary?.ok===true&&pack.summary.failureCount===0&&Array.isArray(pack.failures)&&pack.failures.length===0,'Complete successful payload proof required');
 need(same(runtime.packageVerificationPostRuntime,rawPackage.ref.file)&&runtime.installer?.sha256===installer.sha256&&same(runtime.installer.path??runtime.installer.file,installer.file),'Runtime package/installer links differ');
 need(same(pack.asar?.built,built.file)&&same(pack.asar?.installed,installed.file),'Payload ASAR paths differ');await checkPayload(root,pkg,pack,built,installed);
 const app=await reference(root,runtime.app?.path);need(same(path.dirname(app.file),path.dirname(path.dirname(installed.file))),'App is outside installed ASAR directory');
 const sqlChecked=await validateDesktop176AssemblySqlEvidence({root,proof:sql,proofRef:rawSql.ref,runtime,inputFreeze:freeze.ref,buildCapture:build.ref,sqlCapture:proofs.installedRuntime.c,installer,built,installed,app});
 const asPath=ref=>({path:ref.file,bytes:ref.bytes,sha256:ref.sha256});
 const binding={version:VERSION,sourceFreeze:{file:freeze.ref.file,sha256:freeze.ref.sha256},installer:asPath(installer),asar:{built:asPath(built),installed:asPath(installed)},installedExecutable:asPath(app)};
 const planFile=role=>path.join(destination,role+'.json'),values={};
 values.fullRegression={schema:'naming-studio-regression/1',status:'passed',version:VERSION,exitCode:0,...counts,sourceFreezeSha256:freeze.ref.sha256,inputFreezeSha256:freeze.ref.sha256,releaseBinding:binding,evidenceOrigin:{capture:proofs.fullRegression.ref,vitest:regression.ref}};
 values.buildAndPackage={schema:'naming-studio-build-package/1',status:'passed',version:VERSION,exitCode:0,typecheck:'passed',productionBuild:'passed',installerSha256:installer.sha256,builtAsarSha256:built.sha256,sourceFreezeSha256:freeze.ref.sha256,inputFreezeSha256:freeze.ref.sha256,releaseBinding:binding,evidenceOrigin:{capture:build.ref,stdout:build.c.stdout,stderr:build.c.stderr},generatedOutputs:{}};
 for(const file of [...inventory].filter(isGenerated).sort())values.buildAndPackage.generatedOutputs[file]=(await reference(root,file)).sha256;
 values.package={...pack,sourceFreezeSha256:freeze.ref.sha256,releaseBinding:binding,evidenceOrigin:{capture:proofs.package.ref,raw:rawPackage.ref}};
 // The complete original M198 proof, including its own schema/adjudications, is preserved.
 values.installedRuntime={...sql,sourceFreezeSha256:freeze.ref.sha256,releaseBinding:binding,evidenceOrigin:{capture:proofs.installedRuntime.ref,raw:rawSql.ref}};
 for(const key of Object.keys(sql))need(isDeepStrictEqual(values.installedRuntime[key],sql[key]),'Original SQL field was changed: '+key);
 values.runtimeRecord={...runtime,sourceFreezeSha256:freeze.ref.sha256,releaseBinding:binding,sqlVerification:planFile('installedRuntime'),packageVerificationPostRuntime:planFile('package'),evidenceOrigin:{capture:proofs.runtimeRecord.ref,raw:rawRuntime.ref,originalSqlVerification:runtime.sqlVerification,originalPackageVerificationPostRuntime:runtime.packageVerificationPostRuntime}};
 const verification={};for(const [role,value]of Object.entries(values)){verification[role]={file:planFile(role),sha256:sha256(jsonBytes(value)),releaseBinding:binding};if(['fullRegression','buildAndPackage'].includes(role))Object.assign(verification[role],{command:[proofs[role].c.command.executable,...proofs[role].c.command.args].join(' '),session:proofs[role].c.pid,exitCode:proofs[role].c.exitCode});}
 Object.assign(verification.fullRegression,{...counts,inputFreeze:freeze.ref});
 const typedRefs={evidenceSchema:'naming-studio-release-verification/1',sourceFreeze:{...freeze.ref,releaseBinding:binding},...verification};
 const typedRecord={version:VERSION,releaseDirectory:artifacts.releaseDirectory,status:'local-verified-release',installer:asPath(installer),asar:{built:built.file,builtSha256:built.sha256,installed:installed.file,installedSha256:installed.sha256},verification:typedRefs};
 const virtual=new Map(Object.entries(values).map(([role,value])=>[planFile(role),jsonBytes(value)]));
 const checked=await verifyDesktop176AssemblyEvidence({root,pkg,record:typedRecord,strictLocal:true,sourceInventory:requiredInputs,
  loadRef:async ref=>{if(virtual.has(ref.file)){const text=virtual.get(ref.file);need(sha256(text)===ref.sha256,'Typed virtual reference changed');return text;}const current=await reference(root,ref.file);need(current.sha256===ref.sha256&&(ref.bytes===undefined||current.bytes===ref.bytes),'Typed source reference changed');return fs.readFileSync(safeInput(root,path.resolve(root,ref.file)),'utf8');},
  compare:async(file,expected,size,label,relative)=>{const target=relative?safeRelativeInput(root,file):safeInput(root,path.resolve(root,file));const actual=await fileIdentity(target);need(actual.sha256===expected&&(size===undefined||actual.bytes===size),'Typed input changed: '+label);return{file:target,...actual};}});
 need(checked.errors.length===0&&checked.pending.length===0,'Explicit desktop176 typed assembly evidence is incomplete: '+JSON.stringify({errors:checked.errors,pending:checked.pending}));
 const validation={schema:'naming-studio-assembly-input-validation/3',status:'assembly3-inputs-verified-awaiting-full-acceptance',version:VERSION,sql:sqlChecked.summary,typedEvidence:checked,explicitDesktop176TypedEntryInvoked:true,legacyTypedVerificationInvoked:false,fullGuiPdfFourPhaseAcceptance:false,publicationApproved:false};
 for(const ref of [freeze.ref,rawSql.ref,rawPackage.ref,rawRuntime.ref,sqlChecked.rawRef,sqlChecked.processRef,sqlChecked.postRef,installer,built,installed,app]){const current=await reference(root,ref.file);need(sameRef(current,ref),'Assembly input changed before output reservation');}
 await readFreeze(root,freeze.ref.file,VERSION,freeze.ref.sha256);reserveEvidenceDirectory(root,destination);
 for(const [role,value]of Object.entries(values))writeNewJson(root,planFile(role),value);
 writeNewJson(root,path.join(destination,'assembly3-input-validation.json'),validation);
 const bundle={schema:'naming-studio-execution-bundle/3',version:VERSION,releaseDirectory:artifacts.releaseDirectory,status:'awaiting-publication',createdAt:new Date().toISOString(),inputFreeze:freeze.ref,installer:asPath(installer),asar:{built:built.file,builtSha256:built.sha256,installed:installed.file,installedSha256:installed.sha256},verification,facts:executionFacts(VERSION,values.fullRegression,values.installedRuntime,values.runtimeRecord),remaining:config.remaining??[],scope:'Assembly3 original execution inputs verified only. Four-phase GUI/PDF, reviewed documentation and publication3 acceptance remain required; no App/checker/SQLite execution occurs here.'};
 const file=writeNewJson(root,path.join(destination,'execution-bundle.json'),bundle);return{file,bundle,validation};
}
