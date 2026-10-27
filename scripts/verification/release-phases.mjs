import fs from 'node:fs';
import path from 'node:path';
import {walk,sha256,packageMatcher,relativeFile} from './common.mjs';
import {archiveFiles,extract,beginArchiveOperation} from './release-archive-utils.mjs';
import {isDeepStrictEqual} from 'node:util';
import {regressionCounts} from './release-regression.mjs';
import {safeInput,safeRelativeInput,assertNoReparse,isInside} from './safe-paths.mjs';
import {fileIdentity} from './common.mjs';
import {inflateSync} from 'node:zlib';
import {DESKTOP176_SQL_SCHEMA,assertDesktop176SqlProof,desktop176SourceReader} from './desktop176-sql-consumer.mjs';
import {createDesktop176CapturedOutput} from './desktop176-captured-output.mjs';

export const PHASE_SCHEMA='naming-studio-release-verification/2';
export const DIRECTORY_PHASE_SCHEMA='naming-studio-release-verification/3';
export const DIRECTORY_PUBLICATION_SCHEMA='naming-studio-publication-freeze/2';
export const isPhasedSchema=value=>value===PHASE_SCHEMA||value===DIRECTORY_PHASE_SCHEMA;
export const TEST_FREEZE_SCHEMA='naming-studio-test-input-freeze/1';
export const PUBLICATION_SCHEMA='naming-studio-publication-freeze/1';
export const STATUS_DOCUMENTS=Object.freeze(['README.md','docs/CURRENT-STATUS.md']);
export const isGenerated=file=>file.startsWith('dist/')||file.startsWith('dist-electron/');
export const isStatusDocument=file=>STATUS_DOCUMENTS.includes(file);
const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const equal=isDeepStrictEqual;
const sameRef=(a,b)=>typeof a?.file==='string'&&typeof b?.file==='string'&&hash(a.sha256)&&a.sha256===b.sha256&&path.resolve(a.file)===path.resolve(b.file);
const instant=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
/** Absence alone is not a packaging policy. Exact exclusions and the actual
 * archive must agree for these two source/publication-only documents. */
export function statusDocumentPackaging(root,pkg,archive,asarSha256){
 if(!hash(asarSha256))throw new Error('Actual ASAR identity required');
 const patterns=pkg.build?.files,includes=packageMatcher(patterns),paths=archiveFiles(archive),proofs={};
 for(const file of STATUS_DOCUMENTS){
  if(!fs.statSync(relativeFile(root,file)).isFile())throw new Error('Current status document must be a regular file: '+file);
  const present=paths.some(name=>name.toLowerCase()===file.toLowerCase());
  if(includes(file)){
   if(!paths.includes(file))throw new Error('Declared status document missing or aliased in ASAR: '+file);
   proofs[file]={mode:'packaged',asarSha256,packagedSha256:sha256(extract(archive,file))};
  }else{
   if(!patterns.includes('!'+file))throw new Error('Status document requires an explicit exact exclusion: '+file);
   if(present)throw new Error('Excluded status document is secretly present in ASAR: '+file);
   proofs[file]={mode:'not-packaged',exclusion:'!'+file,asarSha256,packagedSha256:null};
  }
 }
 return proofs;
}
export function exactStatusDocumentReview(file,row,before,after,proof){
 if(!isStatusDocument(file)||!object(row)||!object(proof)||!hash(before)||!hash(after))return false;
 if(row.beforeSha256!==before||row.afterSha256!==after)return false;
 if(proof.mode==='not-packaged')return row.packaging==='not-packaged'&&row.packagedSha256===null;
 return proof.mode==='packaged'&&(row.packaging===undefined||row.packaging==='packaged')&&hash(proof.packagedSha256)&&row.packagedSha256===proof.packagedSha256&&proof.packagedSha256===before;
}
export function executionFacts(version,full,sql,runtime){return {version,regressionFiles:full.files,regressionTests:full.tests,sessions:sql.database?.sessions,revisions:sql.database?.revisions,archives:sql.database?.archives,pdfs:sql.summary?.pdfCount,applicationExitCode:runtime.exitCode,installerExitCode:runtime.installer?.exitCode};}
export function immutableInventory(root,production){
 const files=new Set(production.filter(f=>!isGenerated(f)&&!isStatusDocument(f)));
 for(const folder of ['src','data','tests','scripts'])if(fs.existsSync(path.join(root,folder)))for(const file of walk(path.join(root,folder),folder))files.add(file);
 return [...files].sort();
}
export function phasedDocumentationDelta(finding,approval){
 const row=approval?.validated===true?approval.files?.[finding.file]:null;
 return Boolean(finding.check==='packaged-file-bytes'&&isStatusDocument(finding.file)&&row&&hash(row.packagedSha256)&&finding.archiveSha256===row.packagedSha256&&finding.currentSha256===row.afterSha256);
}

/** V2 adds lifecycle constraints; the original v1/legacy gate checks are called
 * unchanged against the exact test-input identity. No published freeze is
 * substituted into an already executed regression. */
export async function verifyPhasedEvidence(args,verifyOriginal){
 const {root,pkg,record,loadRef,compare,sourceInventory}=args,refs=record.verification??{},errors=[],pending=[],checks=[];
 const explicit=refs.evidenceSchema===DIRECTORY_PHASE_SCHEMA,phaseSchema=explicit?DIRECTORY_PHASE_SCHEMA:PHASE_SCHEMA;
 const need=(ok,check,message)=>{if(!ok)pending.push({check,status:'not-verified',message});return ok;};
 const fail=(ok,check,message)=>{if(!ok)errors.push({check,category:'evidence',message});return ok;};
 const read=async(ref,label)=>{
  if(!need(object(ref)&&typeof ref.file==='string'&&hash(ref.sha256),label,'Required exact file/SHA reference missing.'))return null;
  try{const raw=await loadRef(ref,label);if(raw===null)return null;return JSON.parse(raw);}catch(error){need(false,label,error.message);return null;}
 };
 if(explicit&&!need(pkg.version==='1.0.38'&&record.version==='1.0.38','desktop176-namespace','Namespace3 is fixed to application1.0.38 and desktop176/1.'))return {errors,pending,checks,profile:phaseSchema};
 if(!need(pkg.version!=='1.0.34','phase-profile','Reviewed legacy1.0.34 must retain its original profile.'))return {errors,pending,checks,profile:phaseSchema};
 const input=await read(refs.inputFreeze,'verification.inputFreeze'),publication=await read(refs.sourceFreeze,'verification.sourceFreeze');
 if(!input||!publication)return {errors,pending,checks,profile:phaseSchema};
 const core=immutableInventory(root,sourceInventory);
 need(input.schema===TEST_FREEZE_SCHEMA&&input.version===pkg.version&&instant(input.frozenAt)&&object(input.files)&&Object.keys(input.files).length>0&&object(input.documentation),'input-freeze-schema','Unknown/incomplete test input freeze.');
 need(publication.schema===(explicit?DIRECTORY_PUBLICATION_SCHEMA:PUBLICATION_SCHEMA)&&publication.version===pkg.version&&instant(publication.frozenAt)&&object(publication.files)&&Object.keys(publication.files).length>0,'publication-freeze-schema','Unknown/incomplete publication freeze.');
 if(!object(input.files)||!object(publication.files)||!object(input.documentation))return {errors,pending,checks,profile:phaseSchema};
 try{if(record.asar?.built)beginArchiveOperation(relativeFile(root,path.relative(root,path.resolve(root,record.asar.built))));}catch(error){fail(false,'archive-operation-snapshot',error.message);}
 const lifecycle=[...STATUS_DOCUMENTS].sort();
 fail(lifecycle.every(file=>fs.existsSync(path.join(root,file)))&&equal(Object.keys(input.documentation).sort(),lifecycle)&&lifecycle.every(file=>hash(input.documentation[file])),'documentation-base-coverage','Both current lifecycle documents and their real pre-test hashes are mandatory; omissions are not exemptions.');
 fail(sameRef(publication.inputFreeze,refs.inputFreeze)&&sameRef(refs.fullRegression?.inputFreeze,refs.inputFreeze),'input-freeze-binding','Regression/publication must bind the original test input freeze.');
 fail(core.every(f=>Object.hasOwn(input.files,f)),'immutable-input-coverage','All current code/data/tests/scripts/production inputs must be frozen; additions also invalidate the run.');
 fail(Object.keys(input.files).every(f=>!isGenerated(f)&&!isStatusDocument(f)),'input-freeze-scope','Generated outputs and the two lifecycle documents are separate from immutable inputs.');
 const requiredPublication=new Set([...sourceInventory,...core,...Object.keys(input.files),...STATUS_DOCUMENTS.filter(f=>Object.hasOwn(input.documentation,f))]);
 need([...requiredPublication].every(f=>Object.hasOwn(publication.files,f)),'publication-coverage','Final publication must cover immutable inputs and explicit production outputs.');
 for(const [file,expected]of Object.entries(input.files))fail(hash(expected)&&publication.files[file]===expected,'immutable-phase-equality','Input differs between test and publication: '+file);
 for(const [file,expected]of Object.entries(publication.files)){
  if(!hash(expected)){fail(false,'publication-sha256','Invalid published SHA: '+file);continue;}
  try{await compare(file,expected,undefined,'publication-file',true);}catch(error){fail(false,'publication-file',error.message);}
 }
 // Retain every old gate/status/count/artifact/process check. Only the freeze
 // view is adapted to the v1 validator; its exact file hash was loaded above.
 const adapted=structuredClone(record);adapted.verification.evidenceSchema='naming-studio-release-verification/1';adapted.verification.sourceFreeze=refs.inputFreeze;
 const base=await verifyOriginal({...args,record:adapted,sourceInventory:core,loadRef:async(ref,label)=>!explicit&&sameRef(ref,refs.inputFreeze)?JSON.stringify({...input,schema:'naming-studio-source-freeze/1'}):loadRef(ref,label)});
 errors.push(...base.errors);pending.push(...base.pending);checks.push(...base.checks);
 const full=await read(refs.fullRegression,'phase.fullRegression'),build=await read(refs.buildAndPackage,'phase.buildAndPackage'),sql=await read(refs.installedRuntime,'phase.installedRuntime'),runtime=await read(refs.runtimeRecord,'phase.runtimeRecord'),pack=await read(refs.package,'phase.package');
 const acceptance=explicit?publication.acceptance:undefined;
 const commonBinding={version:pkg.version,...explicit?{releaseDirectory:record.releaseDirectory,acceptance}:{},inputFreeze:refs.inputFreeze,publicationFreeze:{file:refs.sourceFreeze.file,sha256:refs.sourceFreeze.sha256},installer:record.installer,asar:record.asar};
 for(const gate of ['fullRegression','buildAndPackage','sourceFreeze','package','installedRuntime','runtimeRecord'])fail(equal(refs[gate]?.releaseBinding,commonBinding),'common-release-binding','Six gate refs must share the exact input/publication/binary identity: '+gate);
 const bundle=await read(refs.executionBundle,'verification.executionBundle');
 fail(sameRef(publication.executionBundle,refs.executionBundle)&&sameRef(bundle?.inputFreeze,refs.inputFreeze),'execution-bundle-binding','Publication must refer to this immutable execution bundle.');
 need(bundle?.schema===(explicit?'naming-studio-execution-bundle/3':'naming-studio-execution-bundle/2')&&bundle.version===pkg.version&&bundle.status==='awaiting-publication'&&instant(bundle.createdAt)&&Date.parse(bundle.createdAt)>=Date.parse(runtime?.completed),'execution-bundle-schema','Execution bundle is missing or not a completed execution-stage record.');
 for(const gate of ['fullRegression','buildAndPackage','package','installedRuntime','runtimeRecord']){const original=structuredClone(bundle?.verification?.[gate]),final=structuredClone(refs[gate]);if(original)delete original.releaseBinding;if(final)delete final.releaseBinding;fail(equal(original,final),'bundle-gate-binding','Execution bundle gate identity/count/command metadata differs: '+gate);}
 if(need(Array.isArray(args.packagedInventory)&&args.packagedInventory.length>0,'declared-package-inventory','Exact build.files production inventory is required.')){
  try{const present=new Set(archiveFiles(path.resolve(root,record.asar.built)));for(const file of args.packagedInventory)fail(present.has(file),'declared-package-file','Declared packaged file is missing: '+file);}catch(error){fail(false,'declared-package-file',error.message);}
 }
 const generated=build?.generatedOutputs;
 const generatedFiles=['dist','dist-electron'].flatMap(folder=>fs.existsSync(path.join(root,folder))?walk(path.join(root,folder),folder):[]).sort();
 need(object(generated)&&Object.keys(generated).length>0,'build-generated-output-manifest','Build must bind its actual generated outputs.');
 if(object(generated)){
  fail(equal(Object.keys(generated).sort(),generatedFiles),'generated-output-coverage','Generated-output manifest must cover exactly the actual dist/dist-electron files.');
  for(const [file,expected]of Object.entries(generated)){
   fail(isGenerated(file)&&hash(expected)&&publication.files[file]===expected,'build-publication-output','Generated output was changed after build: '+file);
   try{fail(sha256(extract(path.resolve(root,record.asar.built),file))===expected,'built-generated-output','Generated bytes differ from actual built ASAR: '+file);}catch(error){fail(false,'built-generated-output',error.message);}
  }
 }
 const captures={};let actualRegression;
 for(const [gate,value]of [['fullRegression',full],['buildAndPackage',build],['package',pack],['installedRuntime',sql],['runtimeRecord',runtime]]){
  const capture=await read(value?.evidenceOrigin?.capture,'phase.'+gate+'.capture');
  captures[gate]=capture;
  const roleOK=capture?.role===gate||(['package','installedRuntime'].includes(gate)&&capture?.role==='runtimeRecord');
  need(capture?.schema==='naming-studio-command-capture/1'&&roleOK&&capture.version===pkg.version&&capture.status==='completed'&&capture.exitCode===0&&capture.signal===null&&capture.launchError===null&&capture.freezeError===null&&sameRef(capture.sourceFreeze,refs.inputFreeze)&&sameRef(capture.freezeAfter,refs.inputFreeze)&&instant(capture.startedAt)&&instant(capture.completedAt)&&Date.parse(capture.startedAt)>=Date.parse(input.frozenAt)&&Date.parse(capture.completedAt)>=Date.parse(capture.startedAt),'phase.'+gate+'.execution','Actual command must retain original before/after input identity and ordered timestamps.');
  if(capture)for(const ref of [capture.stdout,capture.stderr,...capture.outputs??[],...capture.artifacts??[]]){try{need(ref&&typeof ref.file==='string'&&hash(ref.sha256),'phase.command-byte-ref','Captured command requires exact byte references.');if(ref?.file&&hash(ref.sha256))await compare(ref.file,ref.sha256,ref.bytes,'phase-command-bytes',false);}catch(error){fail(false,'phase-command-bytes',error.message);}}
  if(capture){try{
   const normalized=file=>{const actual=relativeFile(root,path.relative(root,path.resolve(root,file)));return process.platform==='win32'?actual.toLowerCase():actual;};
   const declared=capture.declaredOutputs,outputs=capture.outputs;let unique=Array.isArray(declared)&&Array.isArray(outputs)&&declared.length===outputs.length;
   if(unique){const declaredPaths=declared.map(normalized),actualPaths=outputs.map(ref=>normalized(ref.file)),ids=actualPaths.map(file=>{const s=fs.statSync(file,{bigint:true});if(s.ino===0n)throw new Error('Output physical identity unavailable');return s.dev+':'+s.ino;});unique=new Set(declaredPaths).size===declared.length&&new Set(actualPaths).size===outputs.length&&new Set(ids).size===outputs.length&&equal([...declaredPaths].sort(),[...actualPaths].sort());}
   fail(unique&&(capture.outputErrors===undefined||Array.isArray(capture.outputErrors)&&capture.outputErrors.length===0),'phase-command-output-identity','Captured outputs must remain distinct canonical/physical files, not aliases counted twice.');
  }catch(error){fail(false,'phase-command-output-identity',error.message);}}
  if(['fullRegression','buildAndPackage'].includes(gate))need(value?.inputFreezeSha256===refs.inputFreeze?.sha256&&refs[gate]?.session===capture?.pid,'phase.'+gate+'.input','Typed execution gate must identify its original test input and command PID.');
 }
 const report=await read(full?.evidenceOrigin?.vitest,'phase.fullRegression.vitest');
 if(report){
  try{
   actualRegression=regressionCounts(report);
   fail(captures.fullRegression?.outputs?.some(ref=>sameRef(ref,full.evidenceOrigin.vitest)),'raw-regression-capture-binding','Original Vitest report must be an output of this actual command capture.');
   fail(actualRegression.files===full.files&&actualRegression.tests===full.tests&&actualRegression.files===refs.fullRegression?.files&&actualRegression.tests===refs.fullRegression?.tests,'raw-regression-counts','Gate/ref totals differ from the original successful file/assertion results.');
  }catch(error){fail(false,'raw-regression-result',error.message);}
 }
 if(actualRegression&&sql&&runtime)fail(equal(bundle?.facts,executionFacts(pkg.version,actualRegression,sql,runtime)),'execution-bundle-facts','Bundle facts must be recomputed from original regression and bound actual runtime/SQL results.');
 const time=v=>Date.parse(v),ordered=(...values)=>values.every(instant)&&values.every((v,i)=>i===0||time(values[i-1])<=time(v));
 const installerStart=runtime?.installer?.startedAt??runtime?.installer?.started,installerTerminal=runtime?.installer?.terminalAt,installerComplete=runtime?.installer?.completedAt??installerTerminal,appStart=runtime?.app?.startedAt??runtime?.app?.started;
 need(runtime&&instant(installerStart)&&instant(installerTerminal)&&instant(installerComplete)&&instant(appStart),'runtime-time-fields','Actual installer startedAt/terminalAt/completedAt and app started timestamp are required; recorded installer terminal is the completion boundary when no separate completedAt exists.');
 if(runtime){
  fail(ordered(input.frozenAt,runtime.started,installerStart,installerTerminal,installerComplete,appStart,runtime.terminalAt,runtime.completed),'runtime-time-order','Freeze/workflow/installer/app/terminal/completed timestamps are not causally ordered.');
  fail(ordered(captures.buildAndPackage?.completedAt,installerStart),'build-before-install','Actual build outputs must exist before the installer starts.');
 }
 for(const [gate,capture]of Object.entries(captures))fail(ordered(capture?.completedAt,bundle?.createdAt),'bundle-after-execution','Bundle predates completion of '+gate);
 fail(ordered(bundle?.createdAt,publication.frozenAt),'publication-after-bundle','Publication must follow the immutable execution snapshot.');
 need(runtime&&instant(runtime.completed)&&instant(publication.frozenAt)&&Date.parse(publication.frozenAt)>=Date.parse(runtime.completed),'publication-timing','Publication freeze must follow actual runtime completion.');
 const changed=Object.keys(input.documentation).filter(file=>publication.files[file]!==input.documentation[file]).sort();
 fail(Object.keys(input.documentation).every(file=>isStatusDocument(file)&&hash(input.documentation[file])),'documentation-base-scope','Only exact lifecycle document hashes may be deferred.');
 let packaging;
 try{
  packaging=statusDocumentPackaging(root,pkg,path.resolve(root,record.asar.built),record.asar.builtSha256);
  if(Object.values(packaging).some(row=>row.mode==='not-packaged')||publication.documentationPackaging!==undefined)fail(equal(publication.documentationPackaging,packaging),'documentation-packaging-proof','Publication must carry the exact independently checked packaging proof for both status documents.');
  checks.push({check:'status-document-packaging',documents:packaging});
 }catch(error){fail(false,'documentation-packaging-proof',error.message);}
 let approved=null;
 if(changed.length){
  const review=await read(refs.documentationReview,'verification.documentationReview');
  const facts=actualRegression&&sql&&runtime?executionFacts(pkg.version,actualRegression,sql,runtime):null;
  const reviewGood=need(review?.schema===(explicit?'naming-studio-publication-doc-review/2':'naming-studio-publication-doc-review/1')&&review.version===pkg.version&&review.status==='reviewed'&&typeof review.reviewer==='string'&&review.reviewer.trim().length>=2&&instant(review.reviewedAt)&&Date.parse(review.reviewedAt)>=Date.parse(runtime?.completed)&&Date.parse(review.reviewedAt)>=Date.parse(bundle?.createdAt)&&Date.parse(review.reviewedAt)<=Date.parse(publication.frozenAt)&&sameRef(review.executionBundle,refs.executionBundle)&&sameRef(review.inputFreeze,refs.inputFreeze)&&sameRef(publication.documentationReview,refs.documentationReview)&&object(review.files)&&equal(review.facts,facts),'documentation-review-schema-and-facts','Reviewed documentation requires this version, exact evidence identities, real counts and post-runtime review.');
  if(reviewGood){
   if(explicit)fail(review.releaseDirectory===record.releaseDirectory&&equal(review.acceptance,acceptance),'documentation-directory-acceptance-binding','Approval must bind the selected directory and exact GUI/PDF evidence.');
   fail(equal(Object.keys(review.files).sort(),changed),'documentation-review-exact-set','Approval may cover only the exact changed lifecycle documents.');
   for(const file of changed){const row=review.files[file];
    fail(exactStatusDocumentReview(file,row,input.documentation[file],publication.files[file],packaging?.[file]),'documentation-exact-hashes','Document old/new/archive hashes or explicit not-packaged mode do not match: '+file);
   }
   approved={validated:true,files:review.files,reviewer:review.reviewer,reviewedAt:review.reviewedAt};
  }
 }else if(refs.documentationReview||publication.documentationReview)need(false,'unused-documentation-review','No documentation delta exists; do not attach an unrelated approval.');
 if(explicit)await verifyDirectoryPublication({args,refs,input,publication,bundle,full,build,sql,runtime,pack,captures,commonBinding,read,fail,need,checks});
 checks.push({check:'phased-freezes',immutableInputs:Object.keys(input.files).length,generatedOutputs:generatedFiles.length,publicationFiles:Object.keys(publication.files).length,changedStatusDocuments:changed});
 return {errors,pending,checks,profile:phaseSchema,publicationDocumentation:errors.length||pending.length?null:approved};
}

/** V3 keeps the original bundle and capture namespace intact. It adds exact
 * directory, live SQLite, GUI and PDF acceptance bindings at publication. */
async function verifyDirectoryPublication({args,refs,input,publication,bundle,full,build,sql,runtime,captures,commonBinding,read,fail,need,checks}){
 const {root,pkg,record,compare}=args,directory=record.releaseDirectory;
 const samePath=(a,b)=>typeof a==='string'&&a.length>0&&typeof b==='string'&&b.length>0&&path.relative(path.resolve(root,a),path.resolve(root,b))==='';
 const relative=typeof directory==='string'?directory.split('/'):[];
 const canonical=relative.length>0&&relative.every(p=>p&&p!=='.'&&p!=='..'&&!/[\\<>:"|?*\u0000-\u001f]/u.test(p)&&!/[ .]$/u.test(p)&&!/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p))&&!path.isAbsolute(directory)&&!path.win32.isAbsolute(directory);
 if(!fail(canonical,'directory-schema','A canonical explicit project-relative release directory is required.'))return;
 let selected;
 try{selected=assertNoReparse(path.resolve(root,directory));fail(isInside(root,selected)&&fs.statSync(selected).isDirectory(),'directory-containment','Release directory must be an existing project-owned directory.');}catch(error){fail(false,'directory-containment',error.message);return;}
 const installer=path.join(selected,`NamingStudio-${pkg.version}-Setup.exe`),built=path.join(selected,'win-unpacked/resources/app.asar');
 fail(bundle?.releaseDirectory===directory&&publication.releaseDirectory===directory,'directory-phase-binding','Execution bundle, publication and record must select the same directory.');
 fail(samePath(record.installer?.path,installer)&&samePath(record.asar?.built,built)&&equal(bundle?.installer,record.installer)&&equal(bundle?.asar,record.asar),'directory-artifact-binding','Selected installer and built ASAR must be the exact immutable execution artifacts.');
 for(const ref of [refs.inputFreeze,refs.sourceFreeze])fail(typeof ref?.file==='string'&&!isInside(selected,path.resolve(root,ref.file))&&!samePath(selected,ref.file),'directory-freeze-overlap','Artifact directory cannot contain a freeze.');
 for(const file of [...Object.keys(input.files),...Object.keys(input.documentation)])fail(!isInside(selected,path.resolve(root,file))&&!samePath(selected,file),'directory-input-overlap','Artifact directory cannot contain a frozen input.');
 const identities=new Map();
 const identity=async(file,external=false)=>{const target=safeInput(root,path.resolve(root,file),{allowExternal:external});if(!identities.has(target))identities.set(target,fileIdentity(target));return identities.get(target);};
 const exact=async(ref,label,external=false)=>{
  if(!object(ref)||typeof ref.file!=='string'||!hash(ref.sha256)||!Number.isSafeInteger(ref.bytes)||ref.bytes<0)throw new Error(label+': exact file/hash/size required');
  const actual=await identity(ref.file,external);if(actual.sha256!==ref.sha256||actual.bytes!==ref.bytes)throw new Error(label+': bytes changed');return actual;
 };
 const validateCapture=async(capture,label,{requiredEntry=false}={})=>{
  if(!(capture?.schema==='naming-studio-command-capture/1'&&capture.version===pkg.version&&capture.status==='completed'&&capture.exitCode===0&&capture.signal===null&&capture.launchError===null&&capture.freezeError===null&&sameRef(capture.sourceFreeze,refs.inputFreeze)&&sameRef(capture.freezeAfter,refs.inputFreeze)&&samePath(capture.command?.cwd,root)&&Number.isSafeInteger(capture.pid)&&capture.pid>0&&instant(capture.startedAt)&&instant(capture.completedAt)&&Date.parse(capture.startedAt)>=Date.parse(input.frozenAt)&&Date.parse(capture.completedAt)>=Date.parse(capture.startedAt)))throw new Error(label+': command does not bind current input/workspace/completion');
  const c=capture.command;if(!Array.isArray(c.args)||!c.args.every(a=>typeof a==='string')||!Array.isArray(c.toolFiles)||!c.toolFiles.length)throw new Error(label+': command/tool inventory missing');
  await exact({file:c.executable,sha256:c.sha256,bytes:c.bytes},label+' executable',true);
  for(const tool of c.toolFiles){await exact(tool,label+' tool');const rel=path.relative(root,path.resolve(root,tool.file)).replaceAll('\\','/');if(input.files[rel]!==tool.sha256)throw new Error(label+': tool was not frozen');}
  if(requiredEntry||/\.(?:[cm]?js|ps1)$/i.test(c.args[0]??'')){
   if(!c.entryScript||!samePath(c.entryScript.file,c.args[0]))throw new Error(label+': entry script binding missing');
   await exact(c.entryScript,label+' entry',true);
   const entry=path.relative(root,path.resolve(root,c.entryScript.file)).replaceAll('\\','/');if(isInside(root,path.resolve(root,c.entryScript.file))&&input.files[entry]!==c.entryScript.sha256)throw new Error(label+': entry script was not frozen');
  }
  for(const ref of [capture.stdout,capture.stderr,...capture.outputs??[],...capture.artifacts??[]])await exact(ref,label+' output');
  const declared=capture.declaredOutputs,outputs=capture.outputs;
  const pathKey=p=>process.platform==='win32'?path.resolve(root,p).toLowerCase():path.resolve(root,p);
  const physical=Array.isArray(outputs)?outputs.map(ref=>{const s=fs.statSync(safeInput(root,path.resolve(root,ref.file)),{bigint:true});if(s.ino===0n)throw new Error('Output physical identity unavailable');return s.dev+':'+s.ino;}):[];
  if(!Array.isArray(declared)||!Array.isArray(outputs)||declared.length!==outputs.length||new Set(declared.map(pathKey)).size!==declared.length||new Set(outputs.map(ref=>pathKey(ref.file))).size!==outputs.length||new Set(physical).size!==outputs.length||outputs.some(ref=>!declared.some(file=>samePath(file,ref.file)))||(capture.outputErrors?.length??0)||(capture.artifactErrors?.length??0))throw new Error(label+': declared output inventory differs');
 };
 try{
  for(const [role,capture]of Object.entries(captures))await validateCapture(capture,role);
  const regression=full?.evidenceOrigin?.vitest,args=captures.fullRegression.command.args;
  fail(args.length===5&&samePath(args[0],path.join(root,'node_modules/vitest/vitest.mjs'))&&args[1]==='run'&&args[2]==='--reporter=default'&&args[3]==='--reporter=json'&&args[4]==='--outputFile='+regression?.file,'directory-regression-command','The original regression command must be exact and unfiltered.');
  const buildArgs=captures.buildAndPackage.command.args;
  fail(buildArgs.length===5&&path.basename(buildArgs[0])==='npm-cli.js'&&buildArgs[1]==='run'&&buildArgs[2]==='package'&&buildArgs[3]==='--'&&buildArgs[4]==='--config.directories.output='+directory,'directory-build-command','The original package command must bind the exact selected output directory.');
  for(const [file,expected]of [[installer,record.installer.sha256],[built,record.asar.builtSha256]]){
   const ref=captures.buildAndPackage.artifacts?.find(row=>samePath(row.file,file)&&row.sha256===expected);await exact(ref,'selected build artifact');
  }
   checks.push({check:'directory-current-sql',...await assertDesktop176SqlProof({root,proof:sql,inputFreeze:refs.inputFreeze,buildCapture:captures.buildAndPackage?build?.evidenceOrigin?.capture:undefined,mode:'Installed',phaseID:'resume',loadRef:args.loadRef,compare,...desktop176SourceReader(root)})});
 }catch(error){fail(false,'directory-original-execution',error.message);}
 try{checks.push(desktop138LifecycleWitness({root,input,report:await read(full?.evidenceOrigin?.vitest,'directory.lifecycle40.fullReport')}));}catch(error){fail(false,'directory-lifecycle40-full-regression',error.message);}
 const acceptance=publication.acceptance;
 fail(object(acceptance)&&sameRef(acceptance.guiAcceptance,refs.guiAcceptance)&&sameRef(acceptance.pdfAcceptance,refs.pdfAcceptance),'directory-acceptance-binding','Publication must bind the exact new GUI and PDF acceptance refs.');
 for(const gate of ['guiAcceptance','pdfAcceptance'])fail(equal(refs[gate]?.releaseBinding,commonBinding),'directory-acceptance-release-binding','Acceptance refs must share the publication/input/binary binding: '+gate);
 const gui=await read(refs.guiAcceptance,'verification.guiAcceptance'),pdf=await read(refs.pdfAcceptance,'verification.pdfAcceptance');
 const common=value=>object(value)&&value.version===pkg.version&&value.status==='passed'&&value.releaseDirectory===directory&&sameRef(value.inputFreeze,refs.inputFreeze)&&sameRef(value.executionBundle,refs.executionBundle)&&sameRef(value.runtimeRecord,refs.runtimeRecord)&&equal(value.installer,record.installer)&&equal(value.asar,record.asar)&&typeof value.reviewer==='string'&&value.reviewer.trim().length>=2&&instant(value.reviewedAt)&&Date.parse(value.reviewedAt)>=Date.parse(bundle?.createdAt)&&Date.parse(value.reviewedAt)<=Date.parse(publication.frozenAt);
 const frozenSource=async(ref)=>{await exact(ref,'acceptance source');const relative=path.relative(root,path.resolve(root,ref.file)).replaceAll('\\','/');if(input.files[relative]!==ref.sha256)throw new Error('Acceptance source was not in the original input freeze');};
 const outputContains=(capture,ref)=>capture.outputs?.some(row=>sameRef(row,ref)&&row.bytes===ref.bytes);
 const physicalKey=file=>{const s=fs.statSync(safeInput(root,path.resolve(root,file)),{bigint:true});if(!s.isFile()||s.ino===0n)throw new Error('Acceptance file physical identity unavailable');return s.dev+':'+s.ino;};
 const png=async ref=>{await exact(ref,'acceptance image');validateAcceptancePng(fs.readFileSync(safeInput(root,path.resolve(root,ref.file))));return physicalKey(ref.file);};
 let guiModes;
 try{
  if(!common(gui)||gui.schema!=='naming-studio-gui-acceptance/1'||gui.profile!=='desktop138/1')throw new Error('Full desktop138 acceptance requires both modes and both original App phases');
  guiModes=await verifyDesktop176Modes({args,refs,input,build,full,runtime,gui,exact,read,frozenSource,validateCapture,png,physicalKey,outputContains});
  checks.push({check:'directory-gui-acceptance',profile:'desktop138/1',modes:[...guiModes.keys()],phases:4,scenarios:6,reopenScope:'separate-process-resume',desktopGenerationScope:'representative-only',reviewer:gui.reviewer});
 }catch(error){fail(false,'directory-gui-acceptance',error.message);}
 try{
  if(!common(pdf)||pdf.schema!=='naming-studio-pdf-acceptance/1')throw new Error('PDF acceptance must bind this reviewed release/input/runtime');
  await frozenSource(pdf.source);const capture=await read(pdf.commandCapture,'pdf.commandCapture'),qa=await read(pdf.result,'pdf.result');await validateCapture(capture,'PDF',{requiredEntry:true});
  if(capture.role!=='runtimeRecord'||!samePath(capture.command.entryScript?.file,pdf.source.file)||!outputContains(capture,pdf.result)||Date.parse(capture.startedAt)<Math.max(...[...guiModes?.values()??[]].map(context=>Date.parse(context.resume.processReceipt.completedAt)),Date.parse(runtime?.completed))||Date.parse(pdf.reviewedAt)<Date.parse(capture.completedAt)||qa?.schema!=='naming-studio-pdf-qa/1'||qa.version!==pkg.version)throw new Error('PDF QA is not an output of the frozen source');
  if(!guiModes||guiModes.size!==2)throw new Error('PDF review requires the complete two-mode source context');
  const expectedPdfs=[...guiModes.values()].flatMap(context=>context.scenarios.map(scenario=>({mode:context.mode,scenario,sql:context.sql,raw:context.run,original:context.sql.pdfs.find(item=>path.resolve(root,item.path)===path.resolve(root,scenario.pdf.file)&&item.sha256===scenario.pdf.sha256&&item.bytes===scenario.pdf.bytes)})));
  if(expectedPdfs.length!==6||expectedPdfs.some(row=>!row.original)||!Array.isArray(qa.pdfs)||qa.pdfs.length!==6||new Set(qa.pdfs.map(row=>row.pdf?.file)).size!==qa.pdfs.length||!Array.isArray(pdf.visualReview)||pdf.visualReview.length!==6)throw new Error('PDF QA must cover all three exercise exports in both modes');
  const actualIds=expectedPdfs.map(row=>physicalKey(row.original.path)),qaIds=qa.pdfs.map(row=>physicalKey(row.pdf.file)),reviewIds=pdf.visualReview.map(row=>physicalKey(row.pdf.file));
  if([actualIds,qaIds,reviewIds].some(ids=>new Set(ids).size!==ids.length)||!equal([...actualIds].sort(),[...qaIds].sort())||!equal([...actualIds].sort(),[...reviewIds].sort()))throw new Error('PDF SQL, QA and visual-review inventories must be a physical-file bijection');
  const images=new Set();let pages=0;
  for(const row of qa.pdfs){
   const expected=expectedPdfs.find(item=>item.mode===row.mode&&item.scenario.scenarioId===row.scenarioId&&samePath(item.original.path,row.pdf?.file)&&item.original.sha256===row.pdf?.sha256&&item.original.bytes===row.pdf?.bytes);
   if(!expected||row.phaseID!=='exercise')throw new Error('PDF is not an original exercise export for this exact mode/scenario');await exact(row.pdf,'actual PDF');
   if(!sameRef(row.session,expected.scenario.pdf.snapshot)||!sameRef(row.html,expected.scenario.pdf.html)||row.sessionId!==expected.scenario.pdf.sessionId)throw new Error('PDF source snapshot/HTML differs from the original export');
   if(!Number.isSafeInteger(row.pageCount)||row.pageCount<=0||row.pages?.length!==row.pageCount||row.pages.some((page,i)=>page.page!==i+1)||row.content?.status!=='passed'||row.content.missingNodes!==0||row.content.extraNodes!==0||row.content.overflowCharacters!==0)throw new Error('PDF page/content coverage incomplete');
   const binding=expected.sql.bindings.find(item=>item.sessionId===row.sessionId&&samePath(item.snapshotFile,row.session?.file)&&item.snapshotSha256===row.session?.sha256);if(!binding)throw new Error('PDF source session differs from installed SQL');await exact(row.session,'PDF SQL session');await exact(row.html,'PDF HTML input');
   const review=pdf.visualReview.find(item=>sameRef(item.pdf,row.pdf));
   if(!review||!['all-pages','representative-pages'].includes(review.scope)||!Array.isArray(review.pages)||!review.pages.length||new Set(review.pages).size!==review.pages.length||review.pages.some(page=>!Number.isSafeInteger(page)||page<1||page>row.pageCount)||review.scope==='all-pages'&&review.pages.length!==row.pageCount)throw new Error('PDF visual review scope/pages are incomplete');
   for(const page of row.pages){if(!outputContains(capture,page.image))throw new Error('PDF page image missing');const key=await png(page.image);if(images.has(key))throw new Error('PDF pages reuse the same physical image');images.add(key);}pages+=row.pageCount;
  }
  checks.push({check:'directory-pdf-acceptance',modes:['Development','Installed'],phaseID:'exercise',pdfs:qa.pdfs.length,pages,visualReviewScopes:pdf.visualReview.map(row=>row.scope),reviewer:pdf.reviewer});
 }catch(error){fail(false,'directory-pdf-acceptance',error.message);}
 if(refs.documentationReview){const review=await read(refs.documentationReview,'directory.documentationReview');need(review&&Date.parse(review.reviewedAt)>=Math.max(Date.parse(gui?.reviewedAt),Date.parse(pdf?.reviewedAt)),'directory-documentation-review-time','Changed documentation must be reviewed after the GUI/PDF evidence.');}
}

/** Acceptance producers emit ordinary non-interlaced PNGs. Validate complete
 * chunks/CRC and decoded scanlines; a signature or IHDR stub is not evidence. */
export function validateAcceptancePng(bytes){
 const bad=message=>{throw new Error('Invalid acceptance PNG: '+message);};
 if(bytes.length<57||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))bad('signature or complete image missing');
 const crc=data=>{let value=0xffffffff;for(const byte of data){value^=byte;for(let i=0;i<8;i++)value=(value>>>1)^((value&1)?0xedb88320:0);}return (value^0xffffffff)>>>0;};
 let offset=8,header,palette=0,ended=false,dataEnded=false;const chunks=[];
 while(offset<bytes.length){
  if(bytes.length-offset<12)bad('truncated chunk');const length=bytes.readUInt32BE(offset),end=offset+12+length;if(end>bytes.length)bad('chunk length exceeds file');
  const type=bytes.toString('latin1',offset+4,offset+8),body=bytes.subarray(offset+8,offset+8+length);if(!/^[A-Za-z]{4}$/.test(type)||type[2]!==type[2].toUpperCase()||crc(bytes.subarray(offset+4,end-4))!==bytes.readUInt32BE(end-4))bad('chunk type or CRC');
  if(!header&&type!=='IHDR')bad('IHDR must be first');
  if(type==='IHDR'){
   if(header||offset!==8||length!==13)bad('IHDR structure');const width=body.readUInt32BE(0),height=body.readUInt32BE(4),depth=body[8],color=body[9],depths={0:[1,2,4,8,16],2:[8,16],3:[1,2,4,8],4:[8,16],6:[8,16]};
   if(!width||!height||width>0x7fffffff||height>0x7fffffff||!depths[color]?.includes(depth)||body[10]!==0||body[11]!==0||body[12]!==0)bad('unsupported dimensions/format/interlace');header={width,height,depth,color};
  }else if(type==='PLTE'){
   if(palette||chunks.length||length===0||length%3||length>768||[0,4].includes(header.color))bad('palette structure');palette=length/3;
  }else if(type==='IDAT'){
   if(dataEnded)bad('nonconsecutive IDAT');chunks.push(body);
  }else if(type==='IEND'){
   if(length||!chunks.length||end!==bytes.length)bad('IEND structure');ended=true;
  }else if(type[0]===type[0].toUpperCase())bad('unknown critical chunk');
  if(chunks.length&&type!=='IDAT')dataEnded=true;offset=end;
 }
 if(!ended||!header||header.color===3&&(!palette||palette>2**header.depth))bad('missing end/header/palette');
 const channels={0:1,2:3,3:1,4:2,6:4}[header.color],bits=channels*header.depth,rowBytes=Math.ceil(header.width*bits/8),total=(rowBytes+1)*header.height;
 if(!Number.isSafeInteger(total)||total<=0)bad('decoded image size');
 let decoded;try{decoded=inflateSync(Buffer.concat(chunks),{maxOutputLength:total+1});}catch{bad('invalid compressed scanlines');}if(decoded.length!==total)bad('scanline length');
 let previous=Buffer.alloc(rowBytes);const bpp=Math.max(1,Math.ceil(bits/8)),paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
 for(let y=0;y<header.height;y++){
  const start=y*(rowBytes+1),filter=decoded[start];if(filter>4)bad('scanline filter');const row=Buffer.alloc(rowBytes);
  for(let x=0;x<rowBytes;x++){const left=x>=bpp?row[x-bpp]:0,up=previous[x],corner=x>=bpp?previous[x-bpp]:0;row[x]=(decoded[start+1+x]+(filter===0?0:filter===1?left:filter===2?up:filter===3?Math.floor((left+up)/2):paeth(left,up,corner)))&255;}
  if(header.color===3)for(let x=0;x<header.width;x++){const bit=x*header.depth,index=(row[Math.floor(bit/8)]>>(8-header.depth-bit%8))&((1<<header.depth)-1);if(index>=palette)bad('palette sample');}previous=row;
 }
}

/** The desktop runs representative names. All40 lifecycle generation/save
 * checks must instead be present in the original, unfiltered final suite. */
export function desktop138LifecycleWitness({root,input,report}){
 const testFile='tests/naming-v71-service-core.test.ts',profileFile='data/naming-character-meanings-v7.1-profile.json';
 const fixedTestSha256='6d50181287cfe94acdbff66644e3f5bbec42e72cbb40317787a29c61c83222f9';
 if(input?.files?.[testFile]!==fixedTestSha256)throw new Error('Lifecycle40 requires the exact reviewed owner test source');
 for(const file of [testFile,profileFile])if(!hash(input?.files?.[file])||sha256(fs.readFileSync(safeRelativeInput(root,file)))!==input.files[file])throw new Error('Lifecycle40 source/profile absent or changed in original input freeze: '+file);
 const profile=JSON.parse(fs.readFileSync(safeRelativeInput(root,profileFile),'utf8'));
 if(profile.schema!=='naming-character-meanings-profile/1'||profile.profileVersion!=='naming-character-meanings-v7.1/1'||profile.ruleVersion!=='naming-editorial-7.1.0'||profile.sourceId!=='naming-character-meanings-v7.1-fixed'||profile.cases?.length!==40)throw new Error('Lifecycle40 requires the fixed actual7.1/40 profile');
 const suites=report?.testResults?.filter(result=>typeof result.name==='string'&&path.relative(path.resolve(root,result.name),path.resolve(root,testFile))==='');
 const baseGroup='real71 Service Store reopen history backup and modern core; no UI/PDF claim',batchGroup='real71 independent character batches; functional coverage is not a cumulative performance benchmark';
 const expected=[
  [baseGroup,'saves old70 then regenerates the same constrained mixed name under71 without rewriting the old record'],
  [baseGroup,'ordinary manual prose edit keeps71 snapshot immutable and history restores its exact saved version'],
  [baseGroup,'modern71 records its real71 identity while reusing explicit old70 scoring basis with no note score credit'],
  [baseGroup,'backup restore and a fresh Store reread preserve old70 and new71 raw snapshots together'],
  ...Array.from({length:8},(_,i)=>[batchGroup,`actual71 characters batch ${i+1}/8 [${profile.cases.slice(i*5,i*5+5).map(row=>row.char).join('')}]`]),
 ].map(([group,title])=>group+' '+title).sort();
 const actual=suites?.[0]?.assertionResults?.map(result=>(Array.isArray(result.ancestorTitles)?result.ancestorTitles.join(' ')+' ':'')+result.title).sort();
 if(suites?.length!==1||suites[0].status!=='passed'||suites[0].assertionResults?.length!==12||suites[0].assertionResults.some(result=>result.status!=='passed')||!equal(actual,expected))throw new Error('The final full regression must contain the exact12 reviewed40-case lifecycle assertions');
 return {check:'directory-lifecycle40-full-regression',testFile,testSourceSha256:input.files[testFile],profileFile,profileSha256:input.files[profileFile],inventoryCases:40,lifecycleTests:12,desktopGenerationScope:'representative-only'};
}

/** Inline into release-phases.mjs. Uses that module's fs/path/safeInput/sha256,
 * object/hash/instant/equal/sameRef imports/helpers. The caller keeps the
 * existing common(gui) release/publication gate and passes its actual build,
 * full, runtime and exact/read/frozenSource/validateCapture/png/physicalKey/
 * outputContains helpers. Returns the two exercise SQL/PDF contexts together
 * with both original phase contexts; it never substitutes the in-App sqlProof
 * for the independently checked installedRuntime proof.
 *
 * D02's current contract defines the external exercise receipt below. D03 uses
 * the same exact schema for resume, with phaseID:'resume'; no legacy-schema
 * fallback and no rawResult/result field coercion are accepted.
 */
export async function verifyDesktop176Modes(context){
 const {args,refs,input,build,full,runtime,gui,exact,read,frozenSource,validateCapture,png,physicalKey,outputContains}=context;
 const {root,pkg}=args,version='1.0.38',workflow='desktop176/1',processSchema='naming-studio-desktop176-process/1';
 const scenarioIds=['legacy70-canonical','naming71-character40','project131-family-review'],modes=['Development','Installed'];
 const materialKeys=['resourceContract','rootFeedbackManifest','naming71Profile','naming71Admission','naming71Lock','parentMethod','workerReceipt','applicationTupleSource'];
 const workflowFile='src/main/smoke-desktop-workflow-176.ts',workerFile='dist-electron/cmn-reading-worker-build-receipt.json',profileFile='data/naming-character-meanings-v7.1-profile.json';
 const bad=message=>{throw new Error('Desktop176: '+message);};
 const requireFact=(condition,message)=>{if(!condition)bad(message);};
 const samePath=(a,b)=>typeof a==='string'&&a.length>0&&typeof b==='string'&&b.length>0&&path.relative(path.resolve(root,a),path.resolve(root,b))==='';
 const relative=file=>path.relative(root,path.resolve(root,file)).replaceAll('\\','/');
 const refEqual=(a,b)=>sameRef(a,b)&&Number.isSafeInteger(a?.bytes)&&a.bytes>0&&a.bytes===b?.bytes;
 const ordered=(...times)=>times.every(instant)&&times.every((value,index)=>index===0||Date.parse(times[index-1])<=Date.parse(value));
 const refShape=(ref,label)=>requireFact(object(ref)&&typeof ref.file==='string'&&ref.file.length>0&&hash(ref.sha256)&&Number.isSafeInteger(ref.bytes)&&ref.bytes>0,label+' needs an original file/SHA/positive-byte reference');
 const file=async(ref,label,external=false)=>{refShape(ref,label);await exact(ref,label,external);return ref;};
 const json=async(ref,label)=>{await file(ref,label);const value=await read(ref,label);if(value===null){const bytes=fs.readFileSync(safeInput(root,path.resolve(root,ref.file)),'utf8');requireFact(bytes.trim()==='null',label+' is missing or invalid JSON');}return value;};
 const record=async(ref,label)=>{const value=await json(ref,label);requireFact(object(value),label+' must contain an object');return value;};
 const phaseOutputs=new WeakMap();
 const phaseOutputContains=async(capture,ref,label)=>outputContains(capture,ref)||Boolean(await phaseOutputs.get(capture)?.contains(ref,label));
 const captured=async(capture,ref,label)=>{await file(ref,label);requireFact(await phaseOutputContains(capture,ref,label),label+' was not an exact output or approved desktop176 dynamic output of this captured command');};
 const stringIds=value=>Array.isArray(value)&&value.length>0&&value.every(id=>typeof id==='string'&&id.length>0)&&new Set(value).size===value.length;
 const stateBody=value=>({database:value?.database,current:value?.current,history:value?.history,profiles:value?.profiles});
 const requestIds=new Set(),originalFiles=new Set(),pdfFiles=new Set(),screenshotFiles=new Set(),contexts=new Map();
 let frozenMaterials,frozenWorkflow,frozenLifecycle;
 requireFact(pkg.version===version&&gui?.schema==='naming-studio-gui-acceptance/1'&&gui.version===version&&gui.status==='passed'&&refEqual(gui.inputFreeze,refs.inputFreeze),'unknown GUI/version/input contract');
 requireFact(Array.isArray(gui.runs)&&gui.runs.length===2&&equal([...gui.runs.map(row=>row?.mode)].sort(),[...modes].sort()),'exactly one Development and one Installed run are required');
 requireFact(object(build?.generatedOutputs)&&hash(build.generatedOutputs[workerFile]),'actual build generated-output manifest lacks the worker receipt');
 const distinctOriginal=async(ref,label)=>{const key=physicalKey(ref.file);requireFact(!originalFiles.has(key),label+' aliases another original phase output');originalFiles.add(key);};

 for(const mode of modes){
  const modeRefs=gui.runs.find(row=>row.mode===mode),phases={};
  requireFact(object(modeRefs.exercise)&&object(modeRefs.resume),'both phase reference sets are mandatory for '+mode);
  for(const phaseID of ['exercise','resume']){
   const phaseRefs=modeRefs[phaseID],label=mode+'/'+phaseID,prefix='desktop176-'+mode+'-'+phaseID;
   for(const key of ['source','commandCapture','run','processReceipt','installedRuntime'])refShape(phaseRefs[key],label+'.'+key);
   await frozenSource(phaseRefs.source);
   const capture=await record(phaseRefs.commandCapture,label+'.commandCapture');
   await validateCapture(capture,label,{requiredEntry:true});
   requireFact(capture.role==='runtimeRecord'&&refEqual(capture.command?.entryScript,phaseRefs.source)&&samePath(capture.command.args[0],phaseRefs.source.file),label+' command entry is not the exact frozen GUI driver');
    if(capture.profile==='desktop176/1'){
     const dynamic=await createDesktop176CapturedOutput({root,captureRef:phaseRefs.commandCapture,mode,phaseID,inputFreeze:refs.inputFreeze,source:phaseRefs.source,
     readBytes:async ref=>fs.readFileSync(safeInput(root,path.resolve(root,ref.file))),
     authenticate:async(ref,name)=>{if(!object(ref)||typeof ref.file!=='string'||!hash(ref.sha256)||!Number.isSafeInteger(ref.bytes)||ref.bytes<0)throw new Error(name+': exact file/hash/size required');const target=safeInput(root,path.resolve(root,ref.file),{allowExternal:true}),stat=fs.statSync(target);if(!stat.isFile()||stat.nlink!==1)throw new Error(name+': ordinary unlinked file required');const actual=await fileIdentity(target);if(actual.sha256!==ref.sha256||actual.bytes!==ref.bytes)throw new Error(name+': bytes changed');return{file:ref.file,...actual};},
     });requireFact(equal(dynamic.capture,capture),label+' captured JSON differs from authenticated original bytes');phaseOutputs.set(capture,dynamic);
    }
   for(const key of ['run','processReceipt','installedRuntime']){await captured(capture,phaseRefs[key],label+'.'+key);await distinctOriginal(phaseRefs[key],label+'.'+key);}
   const raw=await record(phaseRefs.run,label+'.run'),processReceipt=await record(phaseRefs.processReceipt,label+'.processReceipt'),sql=await record(phaseRefs.installedRuntime,label+'.installedRuntime');
   requireFact(raw.schema==='naming-studio-desktop176-result/1'&&raw.workflowId===workflow&&raw.appVersion===version&&raw.mode===mode&&raw.phaseID===phaseID&&raw.status===(phaseID==='exercise'?'awaiting-resume':'completed')&&raw.captureCompleteness==='full-original-responses'&&raw.generationCoverage==='representative-only',label+' raw result has an unknown/incomplete fixed phase contract');
   requireFact(Number.isSafeInteger(raw.pid)&&raw.pid>0&&typeof raw.userData==='string'&&raw.userData.length>0&&ordered(input.frozenAt,raw.startedAt,raw.completedAt),label+' raw process identity/times are incomplete');
   requireFact(refEqual(raw.inputFreeze,refs.inputFreeze),label+' changed the original input-freeze reference');
   await file(raw.inputFreeze,label+'.inputFreeze');refShape(raw.workflowSource,label+'.workflowSource');await frozenSource(raw.workflowSource);
   requireFact(relative(raw.workflowSource.file)===workflowFile,label+' is not the frozen owner176 workflow source');
   requireFact(!frozenWorkflow||refEqual(frozenWorkflow,raw.workflowSource),label+' workflow source differs across modes/phases');frozenWorkflow??=raw.workflowSource;
   await file(raw.executable,label+'.executable',true);
   requireFact(object(raw.materialIdentity)&&equal(Object.keys(raw.materialIdentity).sort(),[...materialKeys].sort()),label+' material identity must retain the exact eight original references');
   for(const key of materialKeys){
    const ref=raw.materialIdentity[key];refShape(ref,label+'.materialIdentity.'+key);
    if(key==='workerReceipt'){
     await file(ref,label+'.materialIdentity.workerReceipt');
     requireFact(relative(ref.file)===workerFile&&build.generatedOutputs[workerFile]===ref.sha256,label+' worker receipt is not this build manifest output');
     const receipt=await record(ref,label+'.workerReceipt');requireFact(receipt.schema==='cmn-worker-build-receipt/1',label+' worker receipt schema differs');
    }else await frozenSource(ref);
   }
   requireFact(relative(raw.materialIdentity.naming71Profile.file)===profileFile,label+' naming71 profile path differs');
   requireFact(!frozenMaterials||materialKeys.every(key=>refEqual(frozenMaterials[key],raw.materialIdentity[key])),label+' material reference changed across modes/phases');frozenMaterials??=raw.materialIdentity;
   const lifecycle=raw.fortyLifecycleEvidence;
   requireFact(object(lifecycle)&&lifecycle.suite==='tests/naming-v71-service-core.test.ts'&&refEqual(lifecycle.inputFreeze,refs.inputFreeze)&&refEqual(lifecycle.report,full?.evidenceOrigin?.vitest)&&refEqual(lifecycle.commandCapture,full?.evidenceOrigin?.capture),label+' inventory40 lifecycle refs must remain the original full regression');
   refShape(lifecycle.testSource,label+'.fortyLifecycleEvidence.testSource');await frozenSource(lifecycle.testSource);requireFact(relative(lifecycle.testSource.file)===lifecycle.suite,label+' lifecycle test source differs');
   for(const key of ['report','commandCapture','inputFreeze'])await file(lifecycle[key],label+'.fortyLifecycleEvidence.'+key);
   requireFact(!frozenLifecycle||equal(frozenLifecycle,lifecycle),label+' lifecycle evidence changed across modes/phases');frozenLifecycle??=lifecycle;
   requireFact(raw.AIEnabled===false&&Array.isArray(raw.networkAttempts)&&raw.networkAttempts.length===0&&Array.isArray(raw.rendererNetworkAttempts)&&raw.rendererNetworkAttempts.length===0&&raw.nativeExecutionRequiredForAcceptance===true,label+' must retain actual offline native execution evidence');
   requireFact(Array.isArray(raw.scenarios)&&raw.scenarios.length===3&&equal(raw.scenarios.map(row=>row?.scenarioId),scenarioIds),label+' must preserve the ordered three owner176 scenarios');
   requireFact(Array.isArray(raw.originalResponses)&&raw.originalResponses.length>0,label+' lacks complete original IPC request/response records');
   const responses=[];
   for(let index=0;index<raw.originalResponses.length;index++){
    const row=raw.originalResponses[index],id=prefix+'-'+String(index+1).padStart(4,'0');
    requireFact(object(row)&&row.requestId===id&&!requestIds.has(id)&&scenarioIds.includes(row.scenarioId)&&typeof row.method==='string'&&['resolved','rejected'].includes(row.responseKind)&&row.transport==='renderer-preload-ipc'&&row.serialization==='complete-JSON-of-structured-value-as-received',label+' IPC records are partial, repeated, cross-phase, or native-wire substitutes');requestIds.add(id);
    requireFact(path.basename(row.request?.file??'')===id+'-request.json'&&path.basename(row.response?.file??'')===id+'-response.json',label+' IPC files are not keyed by the actual phase/request ID');
    await captured(capture,row.request,label+'.'+id+'.request');await captured(capture,row.response,label+'.'+id+'.response');
    await distinctOriginal(row.request,label+'.'+id+'.request');await distinctOriginal(row.response,label+'.'+id+'.response');
    const request=await record(row.request,label+'.'+id+'.request'),response=await json(row.response,label+'.'+id+'.response');
    requireFact(request.requestId===id&&request.scenarioId===row.scenarioId&&request.method===row.method&&Array.isArray(request.args),label+' request payload disagrees with its original-response index');
    if(phaseID==='resume')requireFact(['bootstrap','listHistory'].includes(row.method)&&row.responseKind==='resolved',label+' resume performed a non-read-only IPC call');
    else requireFact(['bootstrap','generate','saveProfile','saveSession','listHistory','restoreHistory','getCmnReadingOptions','confirmParentNameReading','searchCharacters','backup','restore','exportReport'].includes(row.method),label+' contains an unregistered owner176 method');
    responses.push({row,request,response});
   }
   for(const scenario of raw.scenarios){
    requireFact(scenario.status==='passed'&&stringIds(scenario.sessionIds)&&Array.isArray(scenario.customerIds)&&scenario.customerIds.length===scenario.sessionIds.length&&scenario.customerIds.every(id=>typeof id==='string'&&id.length>0)&&object(scenario.evidence)&&scenario.artifactPhase==='exercise',label+' scenario is partial');
    const ids=responses.filter(item=>item.row.scenarioId===scenario.scenarioId).map(item=>item.row.requestId);
    requireFact(ids.length>0&&equal(scenario.responseRequestIds,ids),label+' scenario response list is not the complete original per-scenario IPC index');
    for(const [name,ref]of [['pdf',scenario.pdf],['snapshot',scenario.pdf?.snapshot],['html',scenario.pdf?.html],['screenshot',scenario.screenshot]])await file(ref,label+'.'+scenario.scenarioId+'.'+name);
    requireFact(scenario.pdf.phaseID==='exercise'&&scenario.screenshot.phaseID==='exercise'&&scenario.sessionIds.includes(scenario.pdf.sessionId)&&scenario.screenshot.mime==='image/png',label+' artifact origin/session differs');
    if(phaseID==='exercise'){
     for(const ref of [scenario.pdf,scenario.pdf.snapshot,scenario.pdf.html,scenario.screenshot])requireFact(await phaseOutputContains(capture,ref,label+' exercise artifact'),label+' exercise artifact lacks captured original bytes');
     requireFact(fs.readFileSync(safeInput(root,path.resolve(root,scenario.pdf.file))).subarray(0,5).toString()==='%PDF-',label+' PDF has no actual PDF bytes');
     const pdfKey=physicalKey(scenario.pdf.file),imageKey=await png(scenario.screenshot);
     requireFact(!pdfFiles.has(pdfKey)&&!screenshotFiles.has(imageKey),label+' exercise PDFs/screenshots reuse another scenario/mode file');pdfFiles.add(pdfKey);screenshotFiles.add(imageKey);
     const bytes=fs.readFileSync(safeInput(root,path.resolve(root,scenario.screenshot.file)));
     requireFact(Number.isSafeInteger(scenario.screenshot.width)&&Number.isSafeInteger(scenario.screenshot.height)&&scenario.screenshot.width===bytes.readUInt32BE(16)&&scenario.screenshot.height===bytes.readUInt32BE(20)&&scenario.screenshot.width<=1280&&scenario.screenshot.height<=1280&&bytes.length<=500000,label+' screenshot size/metadata differs from native PNG bytes');
    }
   }
   for(const [name,ref]of [['runtimeProcess',raw.runtimeProcess],['sqlProof',raw.sqlProof]]){await captured(capture,ref,label+'.'+name);await distinctOriginal(ref,label+'.'+name);}
   const live=await record(raw.runtimeProcess,label+'.runtimeProcess');
   requireFact(live.schema==='desktop176-live-process/1'&&live.mode===mode&&live.phaseID===phaseID&&live.pid===raw.pid&&refEqual(live.executable,raw.executable)&&samePath(live.userData,raw.userData)&&live.postExitReceipt==='outer-driver-only'&&typeof live.runtimeVersions?.electron==='string'&&live.runtimeVersions.electron.length>0,label+' live process is not the original in-App process receipt');
   requireFact(!refEqual(raw.runtimeProcess,phaseRefs.processReceipt)&&!refEqual(raw.runtimeProcess,phaseRefs.run),label+' live process must not be an own post-exit/result SHA cycle');
   requireFact(processReceipt.schema===processSchema&&processReceipt.appVersion===version&&processReceipt.mode===mode&&processReceipt.phaseID===phaseID&&processReceipt.pid===raw.pid&&processReceipt.exitCode===0&&processReceipt.naturalExit===true&&refEqual(processReceipt.executable,raw.executable)&&samePath(processReceipt.userData,raw.userData)&&refEqual(processReceipt.result,phaseRefs.run)&&refEqual(processReceipt.inputFreeze,refs.inputFreeze)&&refEqual(processReceipt.workflowSource,raw.workflowSource),label+' lacks the exact independent natural post-exit process receipt');
   await captured(capture,processReceipt.stageProcess,label+'.stageProcess');await distinctOriginal(processReceipt.stageProcess,label+'.stageProcess');
   const originalProcess=await record(processReceipt.stageProcess,label+'.originalProcess');
   requireFact(originalProcess.schema==='naming-studio-smoke-process/1'&&originalProcess.version===version&&originalProcess.scope==='naming-v7'&&originalProcess.mode===mode&&originalProcess.status==='completed'&&originalProcess.exitCode===0&&originalProcess.signal===null&&originalProcess.launchError===null&&originalProcess.pid===raw.pid&&Number.isSafeInteger(originalProcess.pid)&&originalProcess.pid>0,label+' stageProcess is not the actual original successful smoke receipt');
   requireFact(originalProcess.normalProcessesTerminated===false&&originalProcess.normalCustomerDataUsed===false&&originalProcess.electronRunAsNodePresent===false&&(mode!=='Installed'||originalProcess.developerToolsPathRemoved===true),label+' original process isolation facts differ');
   for(const [name,ref]of [['executable',originalProcess.executable],['result',originalProcess.result],['database',originalProcess.database]])await file(ref,label+'.originalProcess.'+name,name==='executable');
   requireFact(refEqual(originalProcess.executable,raw.executable)&&refEqual(originalProcess.result,phaseRefs.run)&&samePath(originalProcess.environment?.NAMING_STUDIO_USER_DATA,raw.userData)&&samePath(originalProcess.environment?.NAMING_STUDIO_SMOKE,path.dirname(phaseRefs.run.file))&&originalProcess.environment?.NAMING_STUDIO_SMOKE_SCOPE==='naming-v7'&&originalProcess.environment?.NAMING_STUDIO_SMOKE_EXIT==='1',label+' original process binary/result/owned paths differ');
   requireFact(refEqual(originalProcess.sourceFreeze,refs.inputFreeze)&&refEqual(originalProcess.buildCapture,build?.evidenceOrigin?.capture)&&originalProcess.startedAt===processReceipt.startedAt&&originalProcess.terminalAt===processReceipt.terminalAt&&originalProcess.completedAt===processReceipt.completedAt,label+' desktop receipt must preserve original input/build and App interval verbatim');
   requireFact(ordered(capture.startedAt,processReceipt.startedAt,raw.startedAt,raw.completedAt,processReceipt.terminalAt,processReceipt.completedAt,capture.completedAt)&&instant(gui.reviewedAt)&&Date.parse(gui.reviewedAt)>=Date.parse(capture.completedAt),label+' captured/real-App/raw/post-exit/review timestamps are not causally ordered');
   requireFact(sql.schema===DESKTOP176_SQL_SCHEMA&&sql.expectedVersion===version&&sql.workflowId==='desktop176/1'&&sql.mode===mode&&sql.phaseID===phaseID&&sql.ok===true&&sql.runtimeVerified===true&&sql.summary?.ok===true&&sql.summary.failureCount===0&&Array.isArray(sql.failures)&&sql.failures.length===0&&samePath(sql.resultFile,phaseRefs.run.file)&&sql.resultSha256===phaseRefs.run.sha256&&sql.runtimeResultSha256===phaseRefs.run.sha256&&samePath(sql.database?.path,path.join(raw.userData,'customers.sqlite')),label+' new desktop176 SQL proof must bind the actual original raw result and owned database');
   requireFact(refEqual(sql.processEvidence,processReceipt.stageProcess)&&refEqual(sql.sourceFreeze,refs.inputFreeze)&&samePath(originalProcess.database.file,sql.database.path)&&originalProcess.database.sha256===sql.database.sha256Before&&sql.database.sha256Before===sql.database.sha256After,label+' external SQL must retain the original process/input/unchanged DB identity');
   await assertDesktop176SqlProof({root,proof:sql,inputFreeze:refs.inputFreeze,buildCapture:build?.evidenceOrigin?.capture,mode,phaseID,rawRef:phaseRefs.run,processRef:processReceipt.stageProcess,postRef:phaseRefs.processReceipt,loadRef:async(ref,label)=>{const value=await read(ref,label);return value===null?null:JSON.stringify(value);},compare:args.compare,...desktop176SourceReader(root)});
   requireFact(Array.isArray(sql.pdfs)&&sql.pdfs.length===3&&raw.scenarios.every(scenario=>sql.pdfs.some(row=>samePath(row.path,scenario.pdf.file)&&row.sha256===scenario.pdf.sha256&&row.bytes===scenario.pdf.bytes)),label+' actual SQL PDF inventory differs from the three exercise exports');
   const mainSql=await record(raw.sqlProof,label+'.sqlProof');
   phases[phaseID]={mode,phaseID,refs:phaseRefs,raw,run:raw,capture,processReceipt,originalProcess,liveProcess:live,sql,mainSql,responses};
  }
  const exercise=phases.exercise,resume=phases.resume,exerciseRaw=exercise.raw,resumeRaw=resume.raw;
  requireFact(exerciseRaw.pid!==resumeRaw.pid&&refEqual(exerciseRaw.executable,resumeRaw.executable)&&samePath(exerciseRaw.userData,resumeRaw.userData)&&ordered(exercise.processReceipt.terminalAt,exercise.processReceipt.completedAt,resume.processReceipt.startedAt)&&exerciseRaw.reopenScope==='renderer-reload-and-store-reopen'&&resumeRaw.reopenScope==='separate-process-resume',mode+' requires a genuinely separate resumed process on the same executable/owned userData');
  requireFact(exerciseRaw.resumeEvidence===undefined&&object(resumeRaw.resumeEvidence)&&resumeRaw.resumeEvidence.exercisePid===exerciseRaw.pid&&resumeRaw.resumeEvidence.resumePid===resumeRaw.pid&&refEqual(resumeRaw.resumeEvidence.exerciseResult,exercise.refs.run)&&refEqual(resumeRaw.resumeEvidence.exerciseProcessReceipt,exercise.refs.processReceipt)&&refEqual(resumeRaw.resumeEvidence.runtimeInputBefore,exerciseRaw.resumeSeal)&&refEqual(resumeRaw.resumeEvidence.runtimeInputAfter,exerciseRaw.resumeSeal)&&refEqual(resumeRaw.resumeSeal,exerciseRaw.resumeSeal),mode+' resume must consume the exact original result, post-exit receipt and seal before/after');
  await captured(exercise.capture,exerciseRaw.resumeSeal,mode+'.exercise.resumeSeal');
  const seal=await record(exerciseRaw.resumeSeal,mode+'.exercise.resumeSeal');
  requireFact(seal.schema==='desktop176-resume-seal/1'&&seal.workflowId===workflow&&seal.appVersion===version&&seal.mode===mode&&seal.exercisePid===exerciseRaw.pid&&samePath(seal.userData,exerciseRaw.userData)&&refEqual(seal.inputFreeze,refs.inputFreeze)&&refEqual(seal.workflowSource,exerciseRaw.workflowSource)&&object(seal.scenarioSessionIds)&&equal(Object.keys(seal.scenarioSessionIds).sort(),[...scenarioIds].sort())&&exerciseRaw.scenarios.every(row=>equal(seal.scenarioSessionIds[row.scenarioId],row.sessionIds)),mode+' exercise seal does not retain the original complete scenario/process/input identity');
  await file(seal.database,mode+'.seal.database');await captured(exercise.capture,seal.state,mode+'.seal.state');
  requireFact(samePath(seal.database.file,path.join(exerciseRaw.userData,'customers.sqlite'))&&[exercise.sql,resume.sql].every(sql=>sql.database.unchanged===true&&sql.database.sha256Before===seal.database.sha256&&sql.database.sha256After===seal.database.sha256),mode+' exercise/resume readonly database bytes differ from the original seal');
  const state=await record(seal.state,mode+'.seal.state');
  verifyDesktop176OnboardingBinding(seal,resumeRaw.scenarios,exerciseRaw.scenarios);
  requireFact(refEqual(state.database,seal.database)&&Array.isArray(state.current)&&Array.isArray(state.history)&&Array.isArray(state.profiles)&&object(state.projectOriginal),mode+' seal state lacks complete original current/history/profile/domain data');
  requireFact(exercise.mainSql.schema==='desktop176-exercise-sql/1'&&equal(stateBody(exercise.mainSql),stateBody(state))&&resume.mainSql.schema==='desktop176-resume-sql/1'&&resume.mainSql.unchanged===true&&refEqual(resume.mainSql.seal,exerciseRaw.resumeSeal)&&equal(stateBody(resume.mainSql.before),stateBody(state))&&equal(resume.mainSql.before,resume.mainSql.after),mode+' captured in-App SQL state is partial or differs across read-only resume');
  const sessionIds=exerciseRaw.scenarios.flatMap(row=>row.sessionIds);
  requireFact(exerciseRaw.scenarios[0].sessionIds.length===3&&exerciseRaw.scenarios[1].sessionIds.length===3&&exerciseRaw.scenarios[2].sessionIds.length===1&&new Set(sessionIds).size===sessionIds.length&&equal([...state.current.map(row=>row.id)].sort(),[...sessionIds].sort()),mode+' scenario/current coverage must preserve all original legacy70, three71 representatives and project session');
  for(const phase of [exercise,resume]){
   requireFact(phase.sql.bindings.length===state.current.length&&state.current.every(row=>typeof row.id==='string'&&hash(row.rawSha256)&&typeof row.canonical==='string'&&phase.sql.bindings.some(binding=>binding.sessionId===row.id&&binding.sqlJsonSha256===row.rawSha256))&&phase.sql.historyBindings.length===state.history.length&&state.history.every(row=>Number.isSafeInteger(row.id)&&typeof row.sessionId==='string'&&typeof row.raw==='string'&&hash(row.rawSha256)&&sha256(row.raw)===row.rawSha256&&phase.sql.historyBindings.some(binding=>String(binding.revisionId)===String(row.id)&&binding.sqlJsonSha256===row.rawSha256)),mode+' actual SQL current/history bindings do not preserve the complete sealed original JSON');
   for(const row of state.current){const binding=phase.sql.bindings.find(item=>item.sessionId===row.id),bytes=fs.readFileSync(safeInput(root,path.resolve(root,binding.snapshotFile)));requireFact(sha256(bytes)===binding.snapshotSha256&&equal(JSON.parse(bytes.toString('utf8')),JSON.parse(row.canonical)),mode+' sealed current canonical differs from its actual SQL-bound original snapshot');}
  }
  for(let index=0;index<scenarioIds.length;index++){
   const before=exerciseRaw.scenarios[index],after=resumeRaw.scenarios[index];
   requireFact(equal(before.sessionIds,after.sessionIds)&&equal(before.customerIds,after.customerIds)&&equal(before.pdf,after.pdf)&&equal(before.screenshot,after.screenshot)&&after.artifactPhase==='exercise'&&after.evidence?.resume?.newPid===resumeRaw.pid&&after.evidence.resume.exercisePid===exerciseRaw.pid&&after.evidence.resume.bootstrapAndHistoryPreserved===true&&after.evidence.resume.readOnly===true,mode+' resume must inherit the exact exercise PDF/screenshot refs and readonly session evidence');
   const readbacks=resume.responses.filter(item=>item.row.scenarioId===before.scenarioId),boots=readbacks.filter(item=>item.row.method==='bootstrap'),history=readbacks.filter(item=>item.row.method==='listHistory');
   requireFact(boots.length===1&&boots[0].request.args.length===0&&history.length===before.sessionIds.length&&history.every(item=>item.request.args.length===1&&before.sessionIds.includes(item.request.args[0]))&&new Set(history.map(item=>item.request.args[0])).size===before.sessionIds.length,mode+' resume requires original bootstrap and every scenario session history response');
   const sessions=boots[0].response?.sessions;
   requireFact(Array.isArray(sessions)&&before.sessionIds.every(id=>{const actual=sessions.find(row=>row.id===id),expected=state.current.find(row=>row.id===id);return actual&&expected&&equal(actual,JSON.parse(expected.canonical));}),mode+' resumed original bootstrap response differs from sealed complete current sessions');
   for(const item of history){const expected=state.history.filter(row=>row.sessionId===item.request.args[0]).map(row=>({id:Number(row.id),session:JSON.parse(row.raw)})).sort((a,b)=>a.id-b.id),actual=Array.isArray(item.response)?item.response.map(row=>({id:Number(row.id),session:row.session})).sort((a,b)=>a.id-b.id):null;requireFact(equal(actual,expected),mode+' resumed original history response differs from sealed complete history');}
  }
  const representativeCalls=exercise.responses.filter(item=>item.row.method==='generate'&&item.row.scenarioId==='naming71-character40');
  requireFact(representativeCalls.length===3&&equal(representativeCalls.map(item=>item.request.args[1]?.generationChar),['静','南','黎'])&&representativeCalls.every((item,index)=>item.row.responseKind==='resolved'&&item.response?.session?.namingRules?.version==='naming-editorial-7.1.0'&&item.response.session.candidates?.length===1&&item.response.session.candidates[0].givenName===['静','南','黎'][index])&&equal(representativeCalls.map(item=>item.response.session.id),exerciseRaw.scenarios[1].sessionIds)&&exercise.responses.filter(item=>item.row.method==='generate').length===4&&exercise.responses.filter(item=>item.row.method==='generate'&&item.row.scenarioId==='project131-family-review').length===1,mode+' desktop generation must stay at the three71 representatives and one project case');
  await captured(exercise.capture,exerciseRaw.coverageInventory40,mode+'.exercise.coverageInventory40');
  requireFact(refEqual(resumeRaw.coverageInventory40,exerciseRaw.coverageInventory40),mode+' resume changed the original inventory40 ref');
  const inventory=await record(exerciseRaw.coverageInventory40,mode+'.coverageInventory40'),profile=await record(exerciseRaw.materialIdentity.naming71Profile,mode+'.naming71Profile');
  requireFact(inventory.schema==='desktop176-inventory40/1'&&inventory.generationCoverage==='representative-only'&&equal(inventory.representatives,['静','南','黎'])&&refEqual(inventory.source,exerciseRaw.materialIdentity.naming71Profile)&&Array.isArray(inventory.rows)&&inventory.rows.length===40&&Array.isArray(profile.cases)&&profile.cases.length===40&&equal(inventory.rows.map(row=>[row.caseId,row.char]),profile.cases.map(row=>[row.caseId,row.char]))&&inventory.explanationReadScope==='actual-fixed-main-loader-not-a-new-IPC-endpoint',mode+' inventory40 must bind the original fixed profile without claiming40 GUI generations');
  const inventoryCalls=exercise.responses.filter(item=>item.row.scenarioId==='naming71-character40'&&item.row.method==='searchCharacters');
  requireFact(inventoryCalls.length===40&&equal(inventoryCalls.map(item=>item.request.args),profile.cases.map(row=>[row.char]))&&inventoryCalls.every((item,index)=>item.row.responseKind==='resolved'&&Array.isArray(item.response)&&item.response.some(row=>row.char===profile.cases[index].char)),mode+' inventory40 lacks the complete original actual dictionary IPC request/response set');
  if(modeRefs.processEvidence!==undefined)requireFact(Array.isArray(modeRefs.processEvidence)&&modeRefs.processEvidence.length===2&&refEqual(modeRefs.processEvidence[0],exercise.refs.processReceipt)&&refEqual(modeRefs.processEvidence[1],resume.refs.processReceipt),mode+' optional processEvidence must reference the two actual phase post-exit receipts');
  if(mode==='Installed'){
   requireFact(resumeRaw.pid===runtime?.app?.pid&&samePath(resumeRaw.executable.file,runtime?.app?.path)&&samePath(resumeRaw.userData,runtime?.app?.userData),mode+' resumed PID/executable/userData must be the overall installed runtime App');
   requireFact(refEqual(resume.processReceipt.stageProcess,runtime?.processEvidence)&&refEqual(resume.sql.processEvidence,runtime?.processEvidence)&&refEqual(runtime?.sourceFreeze,refs.inputFreeze)&&refEqual(resume.originalProcess.buildCapture,runtime?.buildCapture),mode+' overall runtime must retain the exact original smoke process/input/build references');
   const observed=runtime?.observedProcessTimes;
   requireFact(object(observed)&&resume.originalProcess.startedAt===observed.startedAt&&resume.originalProcess.terminalAt===observed.terminalAt&&resume.originalProcess.completedAt===observed.completedAt&&observed.startedAt===(runtime?.app?.startedAt??runtime?.app?.started)&&observed.terminalAt===runtime?.terminalAt&&observed.completedAt===runtime?.completed,mode+' post-exit process interval differs from the original observed overall App times');
   requireFact(refEqual(resume.sql.identity?.executable,resume.originalProcess.executable)&&refEqual(resume.sql.identity?.builtAsar,resume.originalProcess.builtAsar)&&refEqual(resume.sql.identity?.installedAsar,resume.originalProcess.installedAsar),mode+' original SQL binary refs differ from original process');
   for(const [key,target,expected]of [['builtAsar',args.record.asar.built,args.record.asar.builtSha256],['installedAsar',args.record.asar.installed,args.record.asar.installedSha256]]){const ref=resume.originalProcess[key];await file(ref,'Installed original '+key);requireFact(samePath(ref.file,target)&&ref.sha256===expected,'Installed original '+key+' differs from actual release');}
  }
  exercise.seal=seal;exercise.state=state;resume.seal=seal;resume.state=state;
  contexts.set(mode,{mode,exercise,resume,run:exerciseRaw,scenarios:exerciseRaw.scenarios,sql:exercise.sql});
 }
 requireFact(!samePath(contexts.get('Development').exercise.raw.userData,contexts.get('Installed').exercise.raw.userData)&&physicalKey(contexts.get('Development').exercise.seal.database.file)!==physicalKey(contexts.get('Installed').exercise.seal.database.file),'each mode must own a distinct userData/database');
 requireFact(pdfFiles.size===6&&screenshotFiles.size===6,'both modes must retain six distinct exercise PDF/screenshot artifacts');
 return contexts;
}

/** The producer observes production onboarding; no adapter invents or writes it. */
export function verifyDesktop176OnboardingBinding(seal,resumeScenarios,exerciseScenarios){
 const saved=seal?.rendererOnboarding;
 if(!object(saved)||saved.schema!=='desktop176-renderer-onboarding/1'||saved.phaseID!=='exercise'||saved.storageKey!=='studio.onboarding.v1'||saved.guideVisible!==false||saved.observation!=='read-only-production-preference'||typeof saved.rawValue!=='string')throw new Error('Desktop176: original exercise onboarding observation missing');
 let value;try{value=JSON.parse(saved.rawValue);}catch{throw new Error('Desktop176: production onboarding preference is invalid JSON');}
 if(!object(value)||!equal(Object.keys(value).sort(),['dismissed','version'])||value.version!==1||value.dismissed!==true)throw new Error('Desktop176: production onboarding was not actually dismissed');
 const expected={...saved,phaseID:'resume'};
 if(!Array.isArray(exerciseScenarios)||exerciseScenarios.length!==3||exerciseScenarios.some(row=>!equal(row.evidence?.rendererOnboarding,saved)))throw new Error('Desktop176: exercise onboarding observation differs from its original seal');
 if(!Array.isArray(resumeScenarios)||resumeScenarios.length!==3||resumeScenarios.some(row=>!equal(row.evidence?.rendererOnboarding,expected)))throw new Error('Desktop176: resume onboarding observation differs from the original sealed preference');
 return true;
}
