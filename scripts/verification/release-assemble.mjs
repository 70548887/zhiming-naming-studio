import {regressionCounts} from './release-regression.mjs';
export {regressionCounts} from './release-regression.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {isInside,safeRoot,safeInput,safeRelativeInput,newEvidencePath,reserveEvidenceDirectory,writeNewJson} from './safe-paths.mjs';
import {fileIdentity,sha256,walk} from './common.mjs';
import {expectedPackageFiles,releaseArtifactPaths,assertReleasePackageCommand} from './release.mjs';
import {verifyEvidence,REQUIRED_GATES} from './release-evidence.mjs';
import {CAPTURE_SCHEMA,readFreeze,reference} from './release-capture.mjs';
import {archiveFiles,extract,sourceMapEntries,beginArchiveOperation} from './release-archive-utils.mjs';
import {TEST_FREEZE_SCHEMA,isGenerated,immutableInventory,executionFacts} from './release-phases.mjs';

const need=(ok,message)=>{if(!ok)throw new Error(message);};
const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const goodTime=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
const bytes=value=>JSON.stringify(value,null,2)+'\n';
const samePath=(a,b)=>path.relative(path.resolve(a),path.resolve(b))==='';
const local=(root,p)=>safeInput(root,path.resolve(root,p));
const load=(root,p)=>JSON.parse(fs.readFileSync(local(root,p),'utf8'));
const runtimeRequire=createRequire(import.meta.url);
async function checkPayload(root,pkg,pack,built,installed){
 beginArchiveOperation(built.file,installed.file);
 const archive=archiveFiles(built.file),proof=new Map((pack.workspaceFiles??[]).map(row=>[row.path,row]));
 need(proof.size===pack.workspaceFiles?.length&&proof.size===archive.length-1&&pack.summary.workspaceFilesCompared===proof.size,'Complete workspace payload inventory differs');
 const normalized=new Set(['lucide-react','lunar-typescript','react','react-dom','scheduler','sql.js'].map(n=>'node_modules/'+n+'/package.json'));
 for(const file of archive.filter(f=>f!=='package.json')){
  const row=proof.get(file);need(row,'Packaged file proof missing: '+file);
  const original=fs.readFileSync(safeRelativeInput(root,file)),packed=extract(built.file,file);
  need(row.workspaceSha256===sha256(original)&&row.packagedSha256===sha256(packed),'Payload byte references differ: '+file);
  if(!original.equals(packed)){
   need(normalized.has(file)&&row.normalized===true,'Unapproved payload difference: '+file);
   const value=JSON.parse(original),actual=JSON.parse(packed);for(const key of ['scripts','keywords','bugs'])delete value[key];need(isDeepStrictEqual(value,actual),'Dependency normalization differs: '+file);
  }else need(row.equal===true,'Equal payload not marked exact: '+file);
 }
 const fields=['name','version','private','description','author','license','type','main','dependencies','engines','overrides'].filter(f=>Object.hasOwn(pkg,f));
 const packedPkg=JSON.parse(extract(built.file,'package.json'));
 need(pack.packageFields?.length===fields.length&&pack.summary.productionFieldsChecked===fields.length,'Production field inventory differs');
 for(const field of fields)need(pack.packageFields.some(f=>f.field===field&&f.equal===true)&&isDeepStrictEqual(packedPkg[field],pkg[field]),'Actual production field differs: '+field);
 const map=JSON.parse(extract(built.file,pkg.main+'.map')),embedded=sourceMapEntries(root,map),rows=pack.frozenSources?.embeddedSources;
 need(Array.isArray(rows)&&rows.length===embedded.size&&pack.summary.embeddedSourcesCompared===rows.length,'Embedded source inventory differs');
 for(const [file,content] of embedded){need(content===fs.readFileSync(safeRelativeInput(root,file),'utf8')&&rows.some(r=>r.path===file&&r.sha256===sha256(content)),'Embedded source differs: '+file);}
 const builtDir=path.dirname(path.dirname(built.file)),installedDir=path.dirname(path.dirname(installed.file)),files=walk(builtDir),runtimeRows=pack.runtimeFiles;
 need(Array.isArray(runtimeRows)&&runtimeRows.length===files.length&&pack.summary.runtimeFilesCompared===files.length,'Runtime payload inventory differs');
 for(const file of files){const a=await reference(root,path.join(builtDir,file)),b=await reference(root,path.join(installedDir,file)),row=runtimeRows.find(r=>r.path===file);need(row?.equal===true&&a.sha256===b.sha256&&row.builtSha256===a.sha256&&row.installedSha256===b.sha256,'Actual runtime bytes differ: '+file);}
 for(const file of walk(installedDir).filter(f=>!files.includes(f)))need(/^(?:uninstall|unins)[^/]*\.(?:exe|dat|msg)$/i.test(file),'Unexpected installed runtime extra: '+file);
}
async function checkRef(root,ref,{external=false}={}){
 need(ref&&typeof ref.file==='string'&&hash(ref.sha256),'Explicit file and SHA256 reference required');
 const file=safeInput(root,path.resolve(root,ref.file),{allowExternal:external}),actual=await fileIdentity(file);
 need(actual.sha256===ref.sha256&&(ref.bytes===undefined||actual.bytes===ref.bytes),'Captured bytes changed: '+ref.file);return file;
}
async function commandProof(root,file,role,freeze,version){
 const ref=await reference(root,file),c=load(root,file);
 need(c.schema===CAPTURE_SCHEMA&&(c.role===role||(['package','installedRuntime'].includes(role)&&c.role==='runtimeRecord'))&&c.version===version,'Wrong command capture schema/role/version');
 need(c.status==='completed'&&c.pid>0&&c.exitCode===0&&c.signal===null&&c.launchError===null&&c.freezeError===null,'Command did not complete successfully');
 need(goodTime(c.startedAt)&&goodTime(c.completedAt)&&Date.parse(c.startedAt)>=Date.parse(freeze.value.frozenAt)&&Date.parse(c.completedAt)>=Date.parse(c.startedAt),'Command timestamps do not follow the freeze');
 for(const f of [c.sourceFreeze,c.freezeAfter])need(f?.sha256===freeze.ref.sha256&&samePath(f.file,freeze.ref.file),'Command used a different freeze');
 need(samePath(c.command?.cwd,root)&&Array.isArray(c.command?.args),'Command workspace/args missing');
 await checkRef(root,{file:c.command.executable,sha256:c.command.sha256,bytes:c.command.bytes},{external:true});
 need(Array.isArray(c.command.toolFiles)&&c.command.toolFiles.length>0,'Frozen command tools missing');
 for(const tool of c.command.toolFiles){const p=await checkRef(root,tool),name=path.relative(root,p).replaceAll('\\','/');need(freeze.value.files[name]===tool.sha256,'Command tool is outside freeze');}
 if(/\.(?:[cm]?js|ps1)$/i.test(c.command.args[0]??'')){
  need(c.command.entryScript&&samePath(c.command.entryScript.file,path.resolve(root,c.command.args[0])),'Command entry script binding missing');
  const file=await checkRef(root,c.command.entryScript,{external:true}),relative=path.relative(root,file);
  if(relative&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative))need(freeze.value.files[relative.replaceAll('\\','/')]===c.command.entryScript.sha256,'Command entry script is outside freeze');
 }
 for(const item of [c.stdout,c.stderr,...c.outputs??[],...c.artifacts??[]])await checkRef(root,item);
 return {ref,c,text:(fs.readFileSync(c.stdout.file,'utf8')+'\n'+fs.readFileSync(c.stderr.file,'utf8')).replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'')};
}
async function capturedJson(root,file,proof){
 const ref=await reference(root,file);need(proof.c.outputs?.some(x=>samePath(x.file,ref.file)&&x.sha256===ref.sha256),'JSON was not produced by the captured command: '+file);
 return {ref,value:load(root,file)};
}
/** Rechecks SQL/snapshot/archive/PDF byte bindings without mutating the DB.
 * The domain-specific/historical assertions remain the captured helper's job. */
export async function checkSql(root,sql){
 const database=local(root,sql.database?.path),before=await fileIdentity(database);
 need(sql.database.unchanged===true&&before.sha256===sql.database.sha256Before&&before.sha256===sql.database.sha256After,'Installed SQL bytes differ');
 const SQL=await runtimeRequire('sql.js')({locateFile:n=>runtimeRequire.resolve('sql.js/dist/'+n)});
 const db=new SQL.Database(new Uint8Array(fs.readFileSync(database)));
 try{
  need(db.exec('PRAGMA integrity_check')[0]?.values[0]?.[0]==='ok','Installed SQL integrity failed');
  const rows=table=>db.exec('SELECT id,json FROM '+table)[0]?.values??[];
  const sessions=rows('sessions'),histories=rows('revisions'),profiles=rows('profiles');
  need(sessions.length===sql.database.sessions&&profiles.length===sql.database.profiles&&histories.length===sql.database.revisions,'Installed SQL counts differ');
  need(Array.isArray(sql.bindings)&&sql.bindings.length===sessions.length&&new Set(sql.bindings.map(b=>b.sessionId)).size===sessions.length,'Current SQL binding coverage differs');
  for(const [id,text] of sessions){const b=sql.bindings.find(b=>b.sessionId===String(id));need(b&&b.completeCurrentSqlJsonEqual===true&&sha256(String(text))===b.sqlJsonSha256,'Current SQL binding differs');const snapshot=await reference(root,b.snapshotFile);need(snapshot.sha256===b.snapshotSha256&&isDeepStrictEqual(load(root,snapshot.file),JSON.parse(String(text))),'Current snapshot differs');}
  need(sql.historyBindings?.length===histories.length&&new Set(sql.historyBindings.map(b=>String(b.revisionId))).size===histories.length,'History binding coverage differs');
  for(const [id,text] of histories){const b=sql.historyBindings.find(b=>String(b.revisionId)===String(id));need(b?.completeHistorySqlJsonEqual===true&&sha256(String(text))===b.sqlJsonSha256,'History SQL binding differs');}
  const archives=db.exec('SELECT sha256,version,pack FROM knowledge_archives')[0]?.values??[];
  need(archives.length===sql.database.archives&&sql.archiveBindings?.length===archives.length&&new Set(sql.archiveBindings.map(b=>b.sha256)).size===archives.length,'Archive binding coverage differs');
  for(const [hashValue,version,pack]of archives){const b=sql.archiveBindings.find(b=>b.sha256===String(hashValue));need(b?.contentHashExact===true&&b.version===String(version)&&sha256(Buffer.from(pack))===String(hashValue),'Archive bytes differ');}
 }finally{db.close();}
 need(Array.isArray(sql.pdfs)&&sql.pdfs.length>0,'PDF inventory missing');
 for(const pdf of sql.pdfs){await checkRef(root,{file:pdf.path,sha256:pdf.sha256,bytes:pdf.bytes});const prefix=fs.readFileSync(local(root,pdf.path)).subarray(0,5).toString();need(prefix==='%PDF-','PDF bytes are not a PDF');}
 need((await fileIdentity(database)).sha256===before.sha256,'SQL changed during read-only verification');
}
export async function assembleRelease({root,config,output,releaseDirectory}){
 if(config?.schema==='naming-studio-release-assembly/3'){
  const {assembleDesktop176Execution}=await import('./release-assemble-desktop176.mjs');
  return assembleDesktop176Execution({root,config,output,releaseDirectory},{commandProof,capturedJson,checkPayload,extract});
 }
 root=safeRoot(root);const destination=newEvidencePath(root,path.resolve(root,output));
 const phased=['naming-studio-release-execution/2','naming-studio-release-execution/3'].includes(config?.schema);
 const explicit=['naming-studio-release-assembly/2','naming-studio-release-execution/3'].includes(config?.schema);
 need((phased||['naming-studio-release-assembly/1','naming-studio-release-assembly/2'].includes(config?.schema))&&/^\d+\.\d+\.\d+$/.test(config.version),'Versioned assembly config required');
 if(explicit){
  const allowed=new Set(['schema','version','releaseDirectory',phased?'inputFreeze':'sourceFreeze','installer','builtAsar','installedAsar','fullRegression','buildAndPackage','package','installedRuntime','runtimeRecord','remaining']);
  need(Object.keys(config).every(key=>allowed.has(key)),'Unknown explicit assembly config field');
  need(Object.hasOwn(config,'releaseDirectory')&&typeof config.releaseDirectory==='string','Explicit release directory required by this config version');
  need(releaseDirectory===undefined||releaseDirectory===config.releaseDirectory,'CLI release directory differs from versioned config');
 }else need(!Object.hasOwn(config,'releaseDirectory')&&releaseDirectory===undefined,'Release directory requires an explicit-directory config version');
 const version=config.version,pkg=load(root,'package.json');need(pkg.version===version,'Workspace version differs');
 const artifacts=explicit?releaseArtifactPaths(root,version,config.releaseDirectory):null;
 const requestedFreeze=phased?config.inputFreeze:config.sourceFreeze;
 const freeze=await readFreeze(root,requestedFreeze.file,version,requestedFreeze.sha256);
 if(explicit)need(!samePath(artifacts.directory,freeze.ref.file)&&!isInside(artifacts.directory,freeze.ref.file),'Release directory contains the frozen input record');
 need(!phased||freeze.value.schema===TEST_FREEZE_SCHEMA,'Phased execution requires the original test input freeze');
 const inventory=new Set(expectedPackageFiles(root,pkg.build.files));
 for(const dir of ['src','data'])if(fs.existsSync(path.join(root,dir)))for(const file of walk(local(root,dir),dir))inventory.add(file);
 for(const name of ['package.json','package-lock.json','index.html','tsconfig.json','vite.config.ts','vitest.config.ts'])if(fs.existsSync(path.join(root,name)))inventory.add(name);
 const requiredInputs=phased?immutableInventory(root,[...inventory]):[...inventory];
 if(explicit)for(const file of new Set([...inventory,...Object.keys(freeze.value.files),...Object.keys(freeze.value.documentation??{})])){const input=path.resolve(root,file);need(!samePath(artifacts.directory,input)&&!isInside(artifacts.directory,input),'Release directory overlaps a frozen or production input: '+file);}
 for(const file of requiredInputs)need(Object.hasOwn(freeze.value.files,file),'Frozen production input missing: '+file);
 const installer=await reference(root,config.installer),built=await reference(root,config.builtAsar),installed=await reference(root,config.installedAsar);
 need(path.basename(installer.file)===`NamingStudio-${version}-Setup.exe`&&built.sha256===installed.sha256,'Release binary identity differs');
 if(explicit)need(samePath(installer.file,artifacts.installer)&&samePath(built.file,artifacts.builtAsar),'Release binary paths differ from the selected release directory');
 const asar=runtimeRequire('@electron/asar');
 for(const archive of [built,installed]){const packed=JSON.parse(asar.extractFile(archive.file,'package.json').toString());need(packed.version===version&&packed.name===pkg.name,'ASAR contains another version/name');}
 const proofs={};for(const role of ['fullRegression','buildAndPackage','package','installedRuntime','runtimeRecord'])proofs[role]=await commandProof(root,config[role].commandCapture,role,freeze,version);
 need(proofs.fullRegression.c.command.args.some(a=>path.basename(a)==='vitest.mjs')&&proofs.fullRegression.c.command.args.includes('run'),'Regression command is not Vitest run');
 const regression=await capturedJson(root,config.fullRegression.file,proofs.fullRegression),counts=regressionCounts(regression.value);
 const testArgs=proofs.fullRegression.c.command.args;
 need(testArgs.length===5&&samePath(testArgs[0],path.join(root,'node_modules/vitest/vitest.mjs'))&&testArgs[1]==='run'&&testArgs[2]==='--reporter=default'&&testArgs[3]==='--reporter=json'&&testArgs[4]==='--outputFile='+regression.ref.file,'Regression command contains a filter or lacks the complete machine report');
 const build=proofs.buildAndPackage;
 assertReleasePackageCommand(build.c.command.args,explicit?artifacts.releaseDirectory:'release',{explicit});
 need(build.text.includes(`${pkg.name}@${version} package`)&&/tsc --noEmit/.test(build.text)&&/vite .*building for production/.test(build.text)&&/built in/.test(build.text)&&/target=nsis/.test(build.text)&&build.text.includes(path.basename(installer.file)),'Build log lacks actual version/typecheck/production/NSIS output');
 for(const artifact of [installer,built])need(build.c.artifacts?.some(a=>samePath(a.file,artifact.file)&&a.sha256===artifact.sha256),'Build capture does not bind current outputs');
 const rawPackage=await capturedJson(root,config.package.file,proofs.package),rawSql=await capturedJson(root,config.installedRuntime.file,proofs.installedRuntime),rawRuntime=await capturedJson(root,config.runtimeRecord.file,proofs.runtimeRecord);
 const pack=rawPackage.value,sql=rawSql.value,runtime=rawRuntime.value;
 need(pack.mode==='installed-complete-payload'||pack.schema==='naming-studio-package-payload/1','Package is not a complete installed payload proof');
 need(sql.mode==='actual-installed-SQL-and-sidecar'||sql.schema==='naming-studio-installed-sql/1','SQL proof is not from the installed application');
 need(runtime.mode==='Installed'||runtime.schema==='naming-studio-runtime-process/1','Process proof is not installed mode');
 for(const value of [pack,sql])need(value.ok===true&&value.summary?.ok===true&&Array.isArray(value.failures)&&value.failures.length===0&&value.summary.failureCount===0&&value.expectedVersion===version,'Raw helper did not verify this version');
 need(runtime.version===version&&runtime.status==='passed'&&runtime.exitCode===0,'Actual installed process did not pass');
 need(samePath(runtime.sqlVerification,rawSql.ref.file)&&samePath(runtime.result,sql.resultFile)&&samePath(runtime.packageVerificationPostRuntime,rawPackage.ref.file),'Actual process record points to different helper results');
 need(runtime.installer?.sha256===installer.sha256&&samePath(runtime.installer.path,installer.file),'Actual installer identity differs');
 need(samePath(pack.asar?.built,built.file)&&samePath(pack.asar?.installed,installed.file),'Package ASAR paths differ');
 await checkPayload(root,pkg,pack,built,installed);
 const result=await reference(root,sql.resultFile);need(result.sha256===sql.resultSha256&&load(root,result.file).appVersion===version,'Actual installed result differs');
 need(typeof runtime.app?.userData==='string'&&samePath(sql.database?.path,path.join(runtime.app.userData,'customers.sqlite'))&&samePath(path.dirname(result.file),runtime.output),'SQL/result are not from the actual process userData/output');
 const app=await reference(root,runtime.app.path);
 need(samePath(path.dirname(app.file),path.dirname(path.dirname(installed.file))),'Actual app is outside installed ASAR directory');
 await checkSql(root,sql);
 const asPath=ref=>({path:ref.file,bytes:ref.bytes,sha256:ref.sha256});
 const binding={version,sourceFreeze:{file:freeze.ref.file,sha256:freeze.ref.sha256},installer:asPath(installer),asar:{built:asPath(built),installed:asPath(installed)},installedExecutable:asPath(app)};
 const values={},refs={evidenceSchema:'naming-studio-release-verification/1',sourceFreeze:{...freeze.ref,releaseBinding:binding}};
 const planFile=(role)=>path.join(destination,role+'.json');
 values.fullRegression={schema:'naming-studio-regression/1',status:'passed',version,exitCode:0,...counts,sourceFreezeSha256:freeze.ref.sha256,releaseBinding:binding,evidenceOrigin:{capture:proofs.fullRegression.ref,vitest:regression.ref}};
 values.buildAndPackage={schema:'naming-studio-build-package/1',status:'passed',version,exitCode:0,typecheck:'passed',productionBuild:'passed',installerSha256:installer.sha256,builtAsarSha256:built.sha256,sourceFreezeSha256:freeze.ref.sha256,releaseBinding:binding,evidenceOrigin:{capture:build.ref,stdout:build.c.stdout,stderr:build.c.stderr}};
 values.package={...pack,schema:'naming-studio-package-payload/1',sourceFreezeSha256:freeze.ref.sha256,releaseBinding:binding,evidenceOrigin:{capture:proofs.package.ref,raw:rawPackage.ref}};
 values.installedRuntime={...sql,schema:'naming-studio-installed-sql/1',sourceFreezeSha256:freeze.ref.sha256,releaseBinding:binding,evidenceOrigin:{capture:proofs.installedRuntime.ref,raw:rawSql.ref}};
 values.runtimeRecord={...runtime,schema:'naming-studio-runtime-process/1',sourceFreezeSha256:freeze.ref.sha256,releaseBinding:binding,sqlVerification:planFile('installedRuntime'),packageVerificationPostRuntime:planFile('package'),evidenceOrigin:{capture:proofs.runtimeRecord.ref,raw:rawRuntime.ref,originalSqlVerification:runtime.sqlVerification,originalPackageVerificationPostRuntime:runtime.packageVerificationPostRuntime}};
 if(phased){
  values.fullRegression.inputFreezeSha256=freeze.ref.sha256;values.buildAndPackage.inputFreezeSha256=freeze.ref.sha256;
  values.buildAndPackage.generatedOutputs={};
  for(const file of [...inventory].filter(isGenerated).sort())values.buildAndPackage.generatedOutputs[file]=(await reference(root,file)).sha256;
 }
 for(const [role,value] of Object.entries(values)){refs[role]={file:planFile(role),sha256:sha256(bytes(value)),releaseBinding:binding};if(['fullRegression','buildAndPackage'].includes(role))Object.assign(refs[role],{command:[proofs[role].c.command.executable,...proofs[role].c.command.args].join(' '),session:proofs[role].c.pid,exitCode:proofs[role].c.exitCode});}
 Object.assign(refs.fullRegression,{...counts,inputFreeze:freeze.ref});
 const record={version,...explicit?{releaseDirectory:artifacts.releaseDirectory}:{},status:'local-verified-release',verifiedAt:new Date().toISOString(),installer:{path:installer.file,bytes:installer.bytes,sha256:installer.sha256},asar:{built:built.file,builtSha256:built.sha256,installed:installed.file,installedSha256:installed.sha256},verification:refs,remaining:config.remaining??[],scope:'Typed transfer of captured real command/helper results with current binary, input, SQL and file bindings. No application/installer/test/build execution occurs in this assembler; no claim of independent domain, UI, PDF visual, AI, signing or second-machine acceptance.'};
 const virtual=new Map(Object.entries(values).map(([k,v])=>[planFile(k),bytes(v)]));
 const validation=await verifyEvidence({root,pkg,record,strictLocal:true,sourceInventory:requiredInputs,loadRef:async ref=>{if(virtual.has(ref.file)){const text=virtual.get(ref.file);need(sha256(text)===ref.sha256,'Typed virtual hash differs');return text;}await checkRef(root,ref);if(phased&&samePath(ref.file,freeze.ref.file))return JSON.stringify({...freeze.value,schema:'naming-studio-source-freeze/1'});return fs.readFileSync(local(root,ref.file),'utf8');},compare:async(file,expected,_,label,relative)=>{const p=relative?safeRelativeInput(root,file):local(root,file),actual=await fileIdentity(p);need(actual.sha256===expected,'Binding changed: '+label);return actual;}});
 need(validation.errors.length===0&&validation.pending.length===0,'Typed evidence contract is incomplete: '+JSON.stringify({errors:validation.errors,pending:validation.pending}));
 // Validate completely before reserving outputs. Missing 1.0.35 inputs never
 // create a release record, and formal release/ is outside allowed outputs.
 await readFreeze(root,freeze.ref.file,version,freeze.ref.sha256);
 reserveEvidenceDirectory(root,destination);
 for(const [role,value] of Object.entries(values))writeNewJson(root,planFile(role),value);
 writeNewJson(root,path.join(destination,'typed-contract-validation.json'),validation);
 if(phased){
  const verification=Object.fromEntries(Object.keys(values).map(key=>[key,refs[key]]));
  const bundle={schema:explicit?'naming-studio-execution-bundle/3':'naming-studio-execution-bundle/2',version,...explicit?{releaseDirectory:artifacts.releaseDirectory}:{},status:'awaiting-publication',createdAt:new Date().toISOString(),inputFreeze:freeze.ref,installer:record.installer,asar:record.asar,verification,facts:executionFacts(version,values.fullRegression,values.installedRuntime,values.runtimeRecord),remaining:record.remaining,scope:'Actual execution evidence snapshot only. Publication freeze and any exact reviewed documentation delta are still required. No final release record is written here.'};
  const file=writeNewJson(root,path.join(destination,'execution-bundle.json'),bundle);return {file,bundle,validation};
 }
 const file=writeNewJson(root,path.join(destination,`NamingStudio-${version}-verification.json`),record);
 return {file,record,validation};
}
async function main(args){const options={},allowed=new Set(['--root','--config','--output','--release-directory']);for(let i=0;i<args.length;i+=2){need(allowed.has(args[i]),'Unknown assembly argument: '+args[i]);need(args[i+1]&&!args[i+1].startsWith('--'),'Use --key value pairs');need(!Object.hasOwn(options,args[i]),'Duplicate argument');options[args[i]]=args[i+1];}need(options['--config']&&options['--output'],'Explicit --config and --output required');const root=safeRoot(options['--root']??process.cwd()),config=load(root,options['--config']);const result=await assembleRelease({root,config,output:options['--output'],releaseDirectory:options['--release-directory']});console.log(JSON.stringify({file:result.file,version:result.record?.version??result.bundle.version,typedContract:config.schema==='naming-studio-release-assembly/3'?'assembly3-inputs-verified-awaiting-full-acceptance':'passed',status:result.bundle?.status??result.record.status,runtimeExecutedHere:false}));}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=1;});
