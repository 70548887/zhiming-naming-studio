import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {safeRoot,safeInput,newEvidencePath,reserveEvidenceDirectory,writeNewJson,safeRelativeInput} from './safe-paths.mjs';
import {sha256,fileIdentity} from './common.mjs';
import {expectedPackageFiles,releaseArtifactPaths} from './release.mjs';
import {verifyEvidence} from './release-evidence.mjs';
import {readFreeze,reference} from './release-capture.mjs';
import {checkSql} from './release-assemble.mjs';
import {PHASE_SCHEMA,PUBLICATION_SCHEMA,DIRECTORY_PHASE_SCHEMA,DIRECTORY_PUBLICATION_SCHEMA,immutableInventory,executionFacts,STATUS_DOCUMENTS,statusDocumentPackaging} from './release-phases.mjs';
import {beginArchiveOperation} from './release-archive-utils.mjs';
import {DESKTOP176_SQL_SCHEMA,assertDesktop176SqlProof,desktop176SourceReader} from './desktop176-sql-consumer.mjs';
import {createDesktop176CapturedOutput} from './desktop176-captured-output.mjs';
import {isDeepStrictEqual} from 'node:util';
const need=(ok,message)=>{if(!ok)throw new Error(message);};
const text=value=>JSON.stringify(value,null,2)+'\n';
const read=(root,file)=>JSON.parse(fs.readFileSync(safeInput(root,path.resolve(root,file)),'utf8'));
async function checked(root,ref){need(ref&&typeof ref.file==='string'&&/^[a-f0-9]{64}$/.test(ref.sha256??''),'Exact file/SHA reference required');const id=await reference(root,ref.file);need(id.sha256===ref.sha256,'Evidence identity changed: '+ref.file);return read(root,id.file);}
const strongSqlAtPublication=(root,proof,context)=>assertDesktop176SqlProof({root,proof,...context,
 loadRef:async ref=>{await checked(root,ref);return fs.readFileSync(safeInput(root,path.resolve(root,ref.file)),'utf8');},
 compare:async(file,expected,bytes)=>{const actual=await fileIdentity(safeInput(root,path.resolve(root,file)));need(actual.sha256===expected&&actual.bytes===bytes,'Strong SQL evidence bytes changed: '+file);return actual;},
 ...desktop176SourceReader(root),
});


function selectedContract(root,bundle,{releaseDirectory,guiAcceptance,pdfAcceptance}){
 const explicit=bundle?.schema==='naming-studio-execution-bundle/3';
 need((explicit||bundle?.schema==='naming-studio-execution-bundle/2')&&bundle.status==='awaiting-publication','Expected execution bundle');
 need(bundle.version!=='1.0.38'||explicit,'Application1.0.38 requires the full publication3 desktop138 profile');
 if(!explicit){need(releaseDirectory===undefined&&guiAcceptance===undefined&&pdfAcceptance===undefined,'Explicit directory/acceptance requires execution bundle3');return {explicit:false};}
 need(bundle.version==='1.0.38','Publication namespace3 accepts exact application1.0.38 desktop176/1 only');
 need(typeof releaseDirectory==='string'&&releaseDirectory===bundle.releaseDirectory,'Explicit publication directory must equal the immutable bundle3 directory');
 for(const ref of [guiAcceptance,pdfAcceptance])need(ref&&typeof ref.file==='string'&&/^[a-f0-9]{64}$/.test(ref.sha256??''),'New GUI/PDF acceptance refs required');
 const artifacts=releaseArtifactPaths(root,bundle.version,releaseDirectory);
 need(typeof bundle.installer?.path==='string'&&typeof bundle.asar?.built==='string'&&path.relative(path.resolve(root,bundle.installer.path),artifacts.installer)===''&&path.relative(path.resolve(root,bundle.asar.built),artifacts.builtAsar)==='','Selected publication artifact paths differ');
 return {explicit:true,acceptance:{guiAcceptance,pdfAcceptance}};
}

/** Fixed desktop138 adapter. Original run/response/SQL/PDF files remain
 * untouched. This only creates pending review wrappers, never approval. */
export async function prepareAcceptanceReview({root,config,output}){
 root=safeRoot(root);need(config?.schema==='naming-studio-desktop138-acceptance-inputs/1','Desktop138 acceptance config schema required');
 need(Object.keys(config).every(key=>['schema','releaseDirectory','executionBundle','development','installed','pdf'].includes(key)),'Unknown desktop138 acceptance field');
 const bundle=await checked(root,config.executionBundle);need(bundle.schema==='naming-studio-execution-bundle/3'&&bundle.status==='awaiting-publication'&&bundle.releaseDirectory===config.releaseDirectory,'Adapter requires the original selected bundle3');
 need(bundle.version==='1.0.38','Desktop176 adapter is fixed to application1.0.38');
 need(read(root,'package.json').version===bundle.version,'Workspace version differs');releaseArtifactPaths(root,bundle.version,config.releaseDirectory);
 const input=await readFreeze(root,bundle.inputFreeze.file,bundle.version,bundle.inputFreeze.sha256,{checkDocumentation:false});
 const typedBuild=await checked(root,bundle.verification.buildAndPackage);
 const same=(a,b)=>a&&b&&a.sha256===b.sha256&&a.bytes===b.bytes&&typeof a.file==='string'&&typeof b.file==='string'&&path.resolve(root,a.file)===path.resolve(root,b.file);
 const exact=async(ref,{json=true}={})=>{need(ref&&typeof ref.file==='string'&&/^[a-f0-9]{64}$/.test(ref.sha256??'')&&Number.isSafeInteger(ref.bytes)&&ref.bytes>0,'Adapter input requires exact file/SHA/bytes');const id=await reference(root,ref.file);need(id.sha256===ref.sha256&&id.bytes===ref.bytes,'Adapter input bytes changed');return json?read(root,id.file):id;};
 const phaseOutputs=new WeakMap();
 const captured=async(capture,ref)=>capture.outputs?.some(row=>same(row,ref))||Boolean(await phaseOutputs.get(capture)?.contains(ref,'desktop176 publication captured output'));
 const expected=['legacy70-canonical','naming71-character40','project131-family-review'],runs=[],missing=[];
 for(const [key,mode]of [['development','Development'],['installed','Installed']]){
  const entry=config[key];if(!entry){missing.push(mode+':exercise',mode+':resume');continue;}
  need(Object.keys(entry).every(k=>['exercise','resume'].includes(k)),'Unknown per-mode adapter field');const pair={mode};
  for(const phaseID of ['exercise','resume']){
   const phase=entry[phaseID];if(!phase){missing.push(mode+':'+phaseID);continue;}
   need(Object.keys(phase).every(k=>['source','commandCapture','run','processReceipt','installedRuntime'].includes(k)),'Exact per-phase adapter input required');
   for(const name of ['source','commandCapture','run','processReceipt','installedRuntime']){need(phase[name],mode+'/'+phaseID+' missing '+name);await exact(phase[name],{json:name!=='source'});}
   const raw=await exact(phase.run),capture=await exact(phase.commandCapture),process=await exact(phase.processReceipt),sql=await exact(phase.installedRuntime);
    if(capture.profile==='desktop176/1'){
     const dynamic=await createDesktop176CapturedOutput({root,captureRef:phase.commandCapture,mode,phaseID,inputFreeze:bundle.inputFreeze,source:phase.source,
     readBytes:async ref=>fs.readFileSync(safeInput(root,path.resolve(root,ref.file))),
     authenticate:async ref=>{need(ref&&typeof ref.file==='string'&&/^[a-f0-9]{64}$/.test(ref.sha256??'')&&Number.isSafeInteger(ref.bytes)&&(ref.bytes>0||(ref.bytes===0&&path.extname(ref.file).toLowerCase()==='.log')),'Desktop176 input requires an exact ordinary file reference');const target=safeInput(root,path.resolve(root,ref.file),{allowExternal:true}),stat=fs.statSync(target);need(stat.isFile()&&stat.nlink===1,'Desktop176 input must be an ordinary unlinked file');const actual=await fileIdentity(target);need(actual.sha256===ref.sha256&&actual.bytes===ref.bytes,'Desktop176 captured input bytes changed');return{file:ref.file,...actual};},
     });need(isDeepStrictEqual(dynamic.capture,capture),'Desktop176 captured JSON differs from authenticated original bytes');phaseOutputs.set(capture,dynamic);
    }
   need(raw.appVersion===bundle.version&&raw.mode===mode&&raw.phaseID===phaseID&&raw.schema==='naming-studio-desktop176-result/1'&&raw.workflowId==='desktop176/1','Unknown or old desktop138 original run');
   need(raw.status===(phaseID==='exercise'?'awaiting-resume':'completed')&&raw.captureCompleteness==='full-original-responses'&&raw.generationCoverage==='representative-only','Partial/missing original responses cannot be upgraded');
   need(same(raw.inputFreeze,bundle.inputFreeze)&&raw.workflowSource,'Original input/source binding missing');await exact(raw.workflowSource,{json:false});
   need(input.value.files[path.relative(root,path.resolve(root,raw.workflowSource.file)).replaceAll('\\','/')]===raw.workflowSource.sha256,'Workflow source absent from original input freeze');
   need(process.schema==='naming-studio-desktop176-process/1'&&process.appVersion===bundle.version&&process.mode===mode&&process.phaseID===phaseID&&process.pid===raw.pid&&process.exitCode===0&&process.naturalExit===true&&same(process.result,phase.run),'A genuine post-exit process receipt is required');
   const original=await exact(process.stageProcess);need(original.schema==='naming-studio-smoke-process/1'&&original.version===bundle.version&&original.mode===mode&&original.status==='completed'&&original.pid===raw.pid&&original.exitCode===0&&original.signal===null&&original.launchError===null&&same(original.result,phase.run),'The new desktop receipt must retain its original smoke-process evidence');
   need(sql.schema===DESKTOP176_SQL_SCHEMA&&sql.workflowId==='desktop176/1'&&sql.expectedVersion===bundle.version&&sql.mode===mode&&sql.phaseID===phaseID&&sql.resultSha256===phase.run.sha256&&path.resolve(root,sql.resultFile)===path.resolve(root,phase.run.file),'New desktop176 SQL proof must bind the original phase result');
   await strongSqlAtPublication(root,sql,{inputFreeze:bundle.inputFreeze,buildCapture:typedBuild.evidenceOrigin?.capture,mode,phaseID,rawRef:phase.run,processRef:process.stageProcess,postRef:phase.processReceipt});
    need(capture.version===bundle.version&&capture.status==='completed'&&capture.exitCode===0&&await captured(capture,phase.run)&&await captured(capture,phase.processReceipt)&&await captured(capture,phase.installedRuntime),'Phase result/process/SQL must be actual captured outputs');
    need(await captured(capture,process.stageProcess)&&same(sql.processEvidence,process.stageProcess),'Original smoke-process evidence must remain an exact capture/SQL input');
   need(Array.isArray(raw.scenarios)&&raw.scenarios.length===3&&raw.scenarios.every((row,i)=>row.scenarioId===expected[i]&&row.status==='passed'),'The exact three source-owned scenarios are mandatory');
   need(Array.isArray(raw.originalResponses)&&raw.originalResponses.length>0,'Original IPC response list missing');const ids=new Set();
   for(const row of raw.originalResponses){
    const prefix='desktop176-'+mode+'-'+phaseID+'-';need(typeof row.requestId==='string'&&row.requestId.startsWith(prefix)&&/^\d{4}$/.test(row.requestId.slice(prefix.length))&&!ids.has(row.requestId)&&expected.includes(row.scenarioId)&&typeof row.method==='string'&&['resolved','rejected'].includes(row.responseKind),'Original response identity incomplete');ids.add(row.requestId);
    need(row.transport==='renderer-preload-ipc'&&row.serialization==='complete-JSON-of-structured-value-as-received','Call summaries or fabricated native-wire claims are not original response evidence');
     await exact(row.request);await exact(row.response);need(await captured(capture,row.request)&&await captured(capture,row.response),'Original request/response absent from source capture');
    if(phaseID==='resume')need(['bootstrap','listHistory'].includes(row.method)&&row.responseKind==='resolved','Resume must be read-only');
   }
   for(const row of raw.scenarios)need(Array.isArray(row.responseRequestIds)&&row.responseRequestIds.length>0&&row.responseRequestIds.every(id=>raw.originalResponses.some(response=>response.requestId===id&&response.scenarioId===row.scenarioId)),'Scenario response coverage incomplete');
   pair[phaseID]=structuredClone(phase);
  }
  if(pair.exercise&&pair.resume)pair.processEvidence=[pair.exercise.processReceipt,pair.resume.processReceipt];runs.push(pair);
 }
 const destination=newEvidencePath(root,path.resolve(root,output));
 if(missing.length){reserveEvidenceDirectory(root,destination);const file=writeNewJson(root,path.join(destination,'partial-acceptance.json'),{schema:'naming-studio-desktop138-acceptance-review/1',status:'partial',approved:false,missingPhases:missing,executionBundle:config.executionBundle,observedRuns:runs,scope:'Missing modes/phases are retained as partial; no successful GUI/PDF wrappers were constructed.'});return{file,status:'partial',approved:false};}
 need(config.pdf&&Object.keys(config.pdf).every(k=>['source','commandCapture','result','visualReview'].includes(k)),'Exact PDF acceptance input required');
 for(const key of ['source','commandCapture','result']){need(config.pdf[key],'PDF adapter missing '+key);await exact(config.pdf[key],{json:key!=='source'});}
 need(Array.isArray(config.pdf.visualReview)&&config.pdf.visualReview.length===6,'Explicit visual scope for both modes and all six PDFs required');
 const common={version:bundle.version,status:'pending-review',releaseDirectory:config.releaseDirectory,inputFreeze:bundle.inputFreeze,executionBundle:config.executionBundle,runtimeRecord:bundle.verification.runtimeRecord,installer:bundle.installer,asar:bundle.asar,reviewer:'',reviewedAt:null};
 const gui={schema:'naming-studio-gui-acceptance/1',...common,profile:'desktop138/1',runs},pdf={schema:'naming-studio-pdf-acceptance/1',...common,...structuredClone(config.pdf)};
 reserveEvidenceDirectory(root,destination);const guiFile=writeNewJson(root,path.join(destination,'gui-review-template.json'),gui),pdfFile=writeNewJson(root,path.join(destination,'pdf-review-template.json'),pdf);
 const file=writeNewJson(root,path.join(destination,'acceptance-review-inputs.json'),{schema:'naming-studio-desktop138-acceptance-review/1',status:'pending-review',approved:false,guiAcceptance:await reference(root,guiFile),pdfAcceptance:await reference(root,pdfFile)});
 return {file,guiFile,pdfFile,status:'pending-review',approved:false};
}

/** Calculates facts/hashes only. Human/audit review is intentionally left
 * incomplete; this template can never satisfy the publication contract. */
export async function prepareDocumentationReview({root,bundle:bundleRef,output,releaseDirectory,guiAcceptance,pdfAcceptance}){
 root=safeRoot(root);const destination=newEvidencePath(root,path.resolve(root,output)),bundle=await checked(root,bundleRef);
 const {explicit,acceptance}=selectedContract(root,bundle,{releaseDirectory,guiAcceptance,pdfAcceptance});
 need(read(root,'package.json').version===bundle.version,'Workspace version differs');
 const input=await readFreeze(root,bundle.inputFreeze.file,bundle.version,bundle.inputFreeze.sha256,{checkDocumentation:false});
 beginArchiveOperation(safeInput(root,bundle.asar.built));
 const full=await checked(root,bundle.verification.fullRegression),sql=await checked(root,bundle.verification.installedRuntime),runtime=await checked(root,bundle.verification.runtimeRecord);
 const packaging=statusDocumentPackaging(root,read(root,'package.json'),bundle.asar.built,bundle.asar.builtSha256),files={};
 for(const file of STATUS_DOCUMENTS){
  if(!Object.hasOwn(input.value.documentation,file))continue;
  const after=(await reference(root,file)).sha256;if(after===input.value.documentation[file])continue;
  const packed=packaging[file].packagedSha256;
  need(packed===null||packed===input.value.documentation[file],'Document build-time base differs');
  files[file]={beforeSha256:input.value.documentation[file],afterSha256:after,packagedSha256:packed,...packaging[file].mode==='not-packaged'?{packaging:'not-packaged'}:{}};
 }
 need(Object.keys(files).length>0,'No lifecycle document changes require a review');
 const value={schema:explicit?'naming-studio-publication-doc-review/2':'naming-studio-publication-doc-review/1',...explicit?{releaseDirectory,acceptance}:{},version:bundle.version,status:'pending-review',reviewer:'',reviewedAt:null,inputFreeze:bundle.inputFreeze,executionBundle:bundleRef,facts:executionFacts(bundle.version,full,sql,runtime),files};
 const file=writeNewJson(root,destination,value);return {file,value};
}

/** Publication is a new record. It never edits the test freeze, executed gates,
 * captures, installer, ASAR, or the previously reviewed source profile. */
export async function publishRelease({root,bundle:bundleRef,documentationReview,output,releaseDirectory,guiAcceptance,pdfAcceptance}){
 root=safeRoot(root);const destination=newEvidencePath(root,path.resolve(root,output)),bundle=await checked(root,bundleRef);
 const {explicit,acceptance}=selectedContract(root,bundle,{releaseDirectory,guiAcceptance,pdfAcceptance});
 const version=bundle.version,pkg=read(root,'package.json');need(pkg.version===version,'Workspace version differs');
 const input=await readFreeze(root,bundle.inputFreeze.file,version,bundle.inputFreeze.sha256,{checkDocumentation:false});
 const values={};for(const gate of ['fullRegression','buildAndPackage','package','installedRuntime','runtimeRecord'])values[gate]=await checked(root,bundle.verification[gate]);
 for(const [file,expected]of [[bundle.installer.path,bundle.installer.sha256],[bundle.asar.built,bundle.asar.builtSha256],[bundle.asar.installed,bundle.asar.installedSha256]])need((await reference(root,file)).sha256===expected,'Accepted binary changed: '+file);
 beginArchiveOperation(bundle.asar.built,bundle.asar.installed);
 const installed=values.runtimeRecord.installedDir,built=path.dirname(path.dirname(bundle.asar.built));
 for(const row of values.package.runtimeFiles??[]){need((await reference(root,path.join(built,row.path))).sha256===row.builtSha256&&(await reference(root,path.join(installed,row.path))).sha256===row.installedSha256,'Accepted runtime payload changed: '+row.path);}
 if(explicit)await strongSqlAtPublication(root,values.installedRuntime,{inputFreeze:bundle.inputFreeze,buildCapture:values.buildAndPackage.evidenceOrigin?.capture,mode:'Installed',phaseID:'resume'});
 else await checkSql(root,values.installedRuntime);
 const production=expectedPackageFiles(root,pkg.build.files),inventory=new Set([...production,...immutableInventory(root,production),...Object.keys(input.value.files),...Object.keys(input.value.documentation)]);
 const files={};for(const file of [...inventory].sort())files[file]=(await fileIdentity(safeRelativeInput(root,file))).sha256;
 if(documentationReview)await checked(root,documentationReview);
 if(explicit){await checked(root,guiAcceptance);await checked(root,pdfAcceptance);}
 const documentationPackaging=statusDocumentPackaging(root,pkg,bundle.asar.built,bundle.asar.builtSha256);
 const publication={schema:explicit?DIRECTORY_PUBLICATION_SCHEMA:PUBLICATION_SCHEMA,version,...explicit?{releaseDirectory,acceptance}:{},frozenAt:new Date().toISOString(),inputFreeze:bundle.inputFreeze,executionBundle:bundleRef,files,documentationPackaging,...documentationReview?{documentationReview}:{}};
 const publicationFile=path.join(destination,'publication-freeze.json'),publicationRef={file:publicationFile,sha256:sha256(text(publication))};
 const verification={...structuredClone(bundle.verification),evidenceSchema:explicit?DIRECTORY_PHASE_SCHEMA:PHASE_SCHEMA,...explicit?structuredClone(acceptance):{},inputFreeze:bundle.inputFreeze,executionBundle:bundleRef,sourceFreeze:publicationRef,...documentationReview?{documentationReview}:{}};
 const releaseBinding={version,...explicit?{releaseDirectory,acceptance}:{},inputFreeze:bundle.inputFreeze,publicationFreeze:{...publicationRef},installer:bundle.installer,asar:bundle.asar};
 for(const gate of ['fullRegression','buildAndPackage','sourceFreeze','package','installedRuntime','runtimeRecord',...explicit?['guiAcceptance','pdfAcceptance']:[]])verification[gate].releaseBinding=releaseBinding;
 const record={version,...explicit?{releaseDirectory}:{},status:'local-verified-release',verifiedAt:new Date().toISOString(),installer:bundle.installer,asar:bundle.asar,verification,remaining:bundle.remaining,goalRemainsActive:true,scope:'Executed gate evidence and original test input are immutable. Only README/CURRENT-STATUS may be explicitly excluded from the actual ASAR or retain exact reviewed build-time bytes; final source/publication hashes and real facts remain checked. No new application execution is claimed.'};
 const validation=await verifyEvidence({root,pkg,record,strictLocal:true,sourceInventory:[...inventory],packagedInventory:production,loadRef:async ref=>{if(ref.file===publicationFile){need(ref.sha256===publicationRef.sha256,'Publication virtual identity differs');return text(publication);}await checked(root,ref);return fs.readFileSync(safeInput(root,path.resolve(root,ref.file)),'utf8');},compare:async(file,expected,bytes,label,relative)=>{const id=await fileIdentity(relative?safeRelativeInput(root,file):safeInput(root,path.resolve(root,file)));need(id.sha256===expected&&(bytes===undefined||id.bytes===bytes),'Binding changed: '+label+':'+file);return id;}});
 need(validation.errors.length===0&&validation.pending.length===0,'Publication is not verified: '+JSON.stringify({errors:validation.errors,pending:validation.pending}));
 reserveEvidenceDirectory(root,destination);writeNewJson(root,publicationFile,publication);writeNewJson(root,path.join(destination,'publication-validation.json'),validation);
 const file=writeNewJson(root,path.join(destination,`NamingStudio-${version}-verification.json`),record);return {file,record,publication,validation};
}
async function main(args){
 const o={};for(let i=0;i<args.length;i+=2){need(args[i]?.startsWith('--')&&args[i+1]&&!args[i+1].startsWith('--')&&!Object.hasOwn(o,args[i]),'Use unique --key value pairs');o[args[i]]=args[i+1];}
 const root=safeRoot(o['--root']??process.cwd()),config=read(root,o['--config']);
 if(o['--prepare-acceptance']){need(Object.keys(o).every(key=>['--root','--config','--prepare-acceptance'].includes(key)),'Unknown acceptance-adapter CLI argument');const result=await prepareAcceptanceReview({root,config,output:o['--prepare-acceptance']});console.log(JSON.stringify(result));return;}
 const explicit=config.schema==='naming-studio-publication-inputs/3';
 need(explicit||config.schema==='naming-studio-publication-inputs/2','Publication config schema required');
 if(explicit){
  need(Object.keys(config).every(k=>['schema','releaseDirectory','executionBundle','documentationReview','guiAcceptance','pdfAcceptance'].includes(k)),'Unknown publication3 config field');
  need(Object.keys(o).every(k=>['--root','--config','--output','--prepare-review','--release-directory'].includes(k)),'Unknown publication3 CLI argument');
  need(typeof config.releaseDirectory==='string'&&(o['--release-directory']===undefined||o['--release-directory']===config.releaseDirectory),'Publication CLI directory differs from config');
 }else need(!['releaseDirectory','guiAcceptance','pdfAcceptance'].some(k=>Object.hasOwn(config,k))&&o['--release-directory']===undefined,'Directory/acceptance requires publication-inputs3');
 const selected=explicit?{releaseDirectory:config.releaseDirectory,guiAcceptance:config.guiAcceptance,pdfAcceptance:config.pdfAcceptance}:{};
 if(o['--prepare-review']){need(!o['--output'],'Choose --prepare-review or --output');const prepared=await prepareDocumentationReview({root,bundle:config.executionBundle,output:o['--prepare-review'],...selected});console.log(JSON.stringify({file:prepared.file,status:prepared.value.status,approved:false}));return;}
 need(o['--output'],'Explicit --output required');const value=await publishRelease({root,bundle:config.executionBundle,documentationReview:config.documentationReview,output:o['--output'],...selected});console.log(JSON.stringify({file:value.file,version:value.record.version,publication:'verified',runtimeExecutedHere:false}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2)).catch(error=>{console.error(error.message);process.exitCode=1;});
