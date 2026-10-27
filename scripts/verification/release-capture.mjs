import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {safeRoot,safeInput,safeRelativeInput,newEvidencePath,reserveEvidenceDirectory,writeNewJson,isInside,assertNoReparse} from './safe-paths.mjs';
import {fileIdentity,walk} from './common.mjs';
import {expectedPackageFiles} from './release.mjs';
import {TEST_FREEZE_SCHEMA,isGenerated,isStatusDocument} from './release-phases.mjs';
import {prepareDesktop176ArtifactCollection,collectDesktop176Artifacts,collectDesktop176StaticArtifacts,collectDesktop176Outputs,mergeDesktop176Artifacts} from './desktop176-artifact-collection.mjs';

const requireThat=(ok,message)=>{if(!ok)throw new Error(message);};
export const CAPTURE_SCHEMA='naming-studio-command-capture/1';
export const ROLES=['fullRegression','buildAndPackage','package','installedRuntime','runtimeRecord'];
const stamp=()=>new Date().toISOString();
const local=(root,file)=>safeInput(root,path.resolve(root,file));
const outputKey=file=>process.platform==='win32'?path.resolve(file).split(path.sep).map(p=>p.replace(/[. ]+$/g,'').toLowerCase()).join(path.sep):path.resolve(file);
async function distinctOutputs(root,declared){
 const refs=[],errors=[],paths=new Set(),physical=new Set();
 for(const file of declared){
  try{
   const actual=local(root,file),stat=fs.statSync(actual,{bigint:true}),key=outputKey(actual),id=stat.dev+':'+stat.ino;
   requireThat(stat.isFile()&&stat.ino!==0n,'Output physical file identity unavailable');
   requireThat(!paths.has(key)&&!physical.has(id),'Duplicate actual output identity');
   paths.add(key);physical.add(id);refs.push(await reference(root,actual));
  }catch(error){errors.push({file,message:error.message});}
 }
 return {refs,errors};
}
export async function reference(root,file){const absolute=local(root,file);return {file:absolute,...await fileIdentity(absolute)};}
export async function readFreeze(root,file,version,expectedSha256,{checkDocumentation=true}={}){
 const ref=await reference(root,file),value=JSON.parse(fs.readFileSync(ref.file,'utf8'));
 requireThat(['naming-studio-source-freeze/1',TEST_FREEZE_SCHEMA].includes(value.schema)&&value.version===version&&Number.isFinite(Date.parse(value.frozenAt)),'Expected current typed input freeze');
 if(expectedSha256)requireThat(ref.sha256===expectedSha256,'Source freeze identity changed');
 requireThat(value.files&&typeof value.files==='object'&&!Array.isArray(value.files)&&Object.keys(value.files).length>0,'Source freeze must not be empty');
 for(const [name,hash] of Object.entries(value.files)){
  requireThat(/^[a-f0-9]{64}$/.test(hash),'Invalid frozen SHA256');
  const actual=await fileIdentity(safeRelativeInput(root,name));requireThat(actual.sha256===hash,'Frozen input changed: '+name);
 }
 if(value.schema===TEST_FREEZE_SCHEMA&&checkDocumentation)for(const [name,hash]of Object.entries(value.documentation??{})){requireThat(isStatusDocument(name)&&(await fileIdentity(safeRelativeInput(root,name))).sha256===hash,'Status document changed before execution snapshot: '+name);}
 return {ref,value};
}
export async function freezeInputs({root,version,output,extraInputs=[],phase}){
 root=safeRoot(root);newEvidencePath(root,path.resolve(root,output));
 const pkg=JSON.parse(fs.readFileSync(local(root,'package.json'),'utf8'));requireThat(pkg.version===version,'Workspace version differs');
 requireThat(!phase||phase==='test','Unknown freeze phase');
 const phased=phase==='test';
 const patterns=phased?pkg.build.files.filter(p=>!isGenerated(p)&&!['dist','dist-electron'].includes(p)):pkg.build.files;
 const names=new Set(expectedPackageFiles(root,patterns));
 for(const dir of ['src','data','tests','scripts','docs','assets'])if(fs.existsSync(path.join(root,dir)))for(const file of walk(local(root,dir),dir))names.add(file);
 for(const file of ['package.json','package-lock.json','index.html','README.md',...fs.readdirSync(root).filter(n=>/^(?:tsconfig.*\.json|vite\.config\.[cm]?[jt]s|vitest\.config\.[cm]?[jt]s)$/.test(n)),...extraInputs]){
  safeRelativeInput(root,file);names.add(file.replaceAll('\\','/'));
 }
 const files={},documentation={};for(const name of [...names].sort()){const hash=(await fileIdentity(safeRelativeInput(root,name))).sha256;if(phased&&isStatusDocument(name))documentation[name]=hash;else{requireThat(!phased||!isGenerated(name),'Generated files are not test inputs');files[name]=hash;}}
 const value={schema:phased?TEST_FREEZE_SCHEMA:'naming-studio-source-freeze/1',version,frozenAt:stamp(),files,...phased?{documentation}:{}};
 const file=writeNewJson(root,path.resolve(root,output),value);return reference(root,file);
}
/** Runs only the explicit root-supplied command. No service, installer or app is
 * inferred. A command exit is recorded even on failure; it is never a gate pass. */
export async function captureCommand({root,plan,output}){
 root=safeRoot(root);requireThat(plan?.schema==='naming-studio-command-plan/1'&&ROLES.includes(plan.role),'Unknown command plan');
 const pkg=JSON.parse(fs.readFileSync(local(root,'package.json'),'utf8'));requireThat(plan.version===pkg.version,'Command version differs');
 const input=plan.inputFreeze??plan.sourceFreeze;
 requireThat(/^[a-f0-9]{64}$/.test(input?.sha256??''),'Explicit source freeze SHA required');
 const before=await readFreeze(root,input?.file,plan.version,input?.sha256);
 const executable=safeInput(root,plan.executable,{allowExternal:true});requireThat(fs.statSync(executable).isFile(),'Executable must be a file');
 requireThat(Array.isArray(plan.args)&&plan.args.every(x=>typeof x==='string'&&!x.includes('\0')),'Explicit command args required');
 requireThat(Array.isArray(plan.toolFiles)&&plan.toolFiles.length>0,'Explicit frozen toolFiles required');
 const tools=[];for(const file of plan.toolFiles){const ref=await reference(root,file),name=path.relative(root,ref.file).replaceAll('\\','/');requireThat(before.value.files[name]===ref.sha256,'Command tool must be in the exact freeze: '+name);tools.push(ref);}
 let entryScript=null;
 if(/\.(?:[cm]?js|ps1)$/i.test(plan.args[0]??'')){
  const entry=safeInput(root,path.resolve(root,plan.args[0]),{allowExternal:true});entryScript={file:entry,...await fileIdentity(entry)};
  if(isInside(root,entry))requireThat(before.value.files[path.relative(root,entry).replaceAll('\\','/')]===entryScript.sha256,'Command entry script must be frozen');
 }
 requireThat(Array.isArray(plan.outputs),'Explicit output list required');
 const declared=plan.outputs.map(file=>{const absolute=path.resolve(root,file),approved=newEvidencePath(root,absolute);return Object.hasOwn(plan,'desktop176ArtifactCollection')?absolute:approved;});requireThat(new Set(declared.map(outputKey)).size===declared.length,'Duplicate command output under platform path identity');
 requireThat(Array.isArray(plan.artifacts??[])&&(plan.artifacts??[]).every(x=>typeof x==='string'),'Invalid artifact list');
 const declaredArtifacts=(plan.artifacts??[]).map(file=>{const absolute=path.resolve(root,file);requireThat(isInside(root,absolute),'Artifact leaves root');assertNoReparse(absolute,{allowMissing:true});return absolute;});
 requireThat(new Set(declaredArtifacts.map(outputKey)).size===declaredArtifacts.length,'Duplicate artifact declaration');
 const desktop176=await prepareDesktop176ArtifactCollection({root,plan,output,declaredOutputs:declared,declaredArtifacts,inputFreeze:before.ref,protectedInputs:[before.ref.file,executable,...Object.keys(before.value.files).map(file=>path.resolve(root,file))]});
 const launchExecutableIdentity=desktop176?await fileIdentity(executable):null;
 const directory=reserveEvidenceDirectory(root,path.resolve(root,output));
 const stdout=path.join(directory,'stdout.log'),stderr=path.join(directory,'stderr.log');
 const out=fs.openSync(stdout,'wx'),err=fs.openSync(stderr,'wx');
 const startedAt=stamp();let pid=null,exitCode=null,signal=null,launchError=null;
 try{
  await new Promise(resolve=>{const child=spawn(executable,plan.args,{cwd:root,windowsHide:true,stdio:['ignore',out,err]});pid=child.pid??null;child.once('error',e=>{launchError=e.message;resolve();});child.once('close',(code,s)=>{exitCode=code;signal=s;resolve();});});
 }finally{fs.closeSync(out);fs.closeSync(err);}
 const completedAt=stamp();
 const dynamicArtifacts=desktop176?await collectDesktop176Artifacts(desktop176).catch(error=>({refs:[],errors:[{file:desktop176.declaration.completionFile,message:error.message}],completionRef:null})):null;
 let freezeAfter=null,freezeError=null;
 try{freezeAfter=(await readFreeze(root,before.ref.file,plan.version,before.ref.sha256)).ref;}catch(error){freezeError=error.message;}
 if(desktop176){try{if(entryScript&&(await fileIdentity(entryScript.file)).sha256!==entryScript.sha256)freezeError='Command entry script changed';}catch(error){freezeError='Command entry script unavailable: '+error.message;}}else if(entryScript&&(await fileIdentity(entryScript.file)).sha256!==entryScript.sha256)freezeError='Command entry script changed';
 const collected=desktop176?await collectDesktop176Outputs(desktop176).catch(error=>({refs:[],errors:[{file:desktop176.declaration.completionFile,message:error.message}]})):await distinctOutputs(root,declared),staticArtifacts=desktop176?await collectDesktop176StaticArtifacts(desktop176,dynamicArtifacts.refs.reduce((total,ref)=>total+ref.bytes,0)).catch(error=>({refs:[],errors:[{file:desktop176.declaration.completionFile,message:error.message}]})):await distinctOutputs(root,declaredArtifacts),outputs=collected.refs;
 let collectedArtifacts=staticArtifacts;
 if(desktop176)try{collectedArtifacts=mergeDesktop176Artifacts(desktop176,staticArtifacts,dynamicArtifacts,outputs);}catch(error){collectedArtifacts={refs:[...staticArtifacts.refs,...dynamicArtifacts.refs],errors:[...staticArtifacts.errors,...dynamicArtifacts.errors,{file:desktop176.declaration.completionFile,message:error.message}]};}
 const artifacts=collectedArtifacts.refs;
 let executableIdentity=launchExecutableIdentity;
 if(desktop176)try{executableIdentity=await fileIdentity(executable);if(executableIdentity.sha256!==launchExecutableIdentity.sha256)freezeError='Command executable changed';}catch(error){freezeError='Command executable unavailable: '+error.message;}else executableIdentity=await fileIdentity(executable);
 const complete=pid>0&&exitCode===0&&signal===null&&launchError===null&&freezeError===null&&collected.errors.length===0&&collectedArtifacts.errors.length===0&&outputs.length===declared.length&&artifacts.length===declaredArtifacts.length+(dynamicArtifacts?.refs.length??0);
 const result={schema:CAPTURE_SCHEMA,status:complete?'completed':'failed',role:plan.role,version:plan.version,sourceFreeze:before.ref,freezeAfter,freezeError,command:{executable,...executableIdentity,args:plan.args,cwd:root,toolFiles:tools,entryScript},pid,startedAt,completedAt,exitCode,signal,launchError,stdout:await reference(root,stdout),stderr:await reference(root,stderr),declaredOutputs:declared,outputs,outputErrors:collected.errors,artifacts,artifactErrors:collectedArtifacts.errors,...desktop176?{profile:'desktop176/1',mode:desktop176.mode,phaseID:desktop176.phaseID,desktop176ArtifactCollection:desktop176.declaration}:{},scope:'Actual child process and input/output byte capture only; exit0/completed does not certify domain correctness.'};
 const file=writeNewJson(root,path.join(directory,'command.json'),result);return {file,result};
}
async function main(args){
 const verb=args.shift(),options={};for(let i=0;i<args.length;i+=2){requireThat(args[i]?.startsWith('--')&&args[i+1],'Use --key value pairs');requireThat(!Object.hasOwn(options,args[i]),'Duplicate argument');options[args[i]]=args[i+1];}
 const root=safeRoot(options['--root']??process.cwd());
 if(verb==='freeze'){
  const extra=options['--extra-inputs']?JSON.parse(fs.readFileSync(local(root,options['--extra-inputs']),'utf8')):[];
  requireThat(Array.isArray(extra)&&extra.every(x=>typeof x==='string'),'extra-inputs must be an array of relative files');
  console.log(JSON.stringify(await freezeInputs({root,version:options['--version'],output:options['--output'],extraInputs:extra,phase:options['--phase']})));return;
 }
 requireThat(verb==='run','Use freeze or run');
 const plan=JSON.parse(fs.readFileSync(local(root,options['--plan']),'utf8'));
 const result=await captureCommand({root,plan,output:options['--output']});console.log(JSON.stringify({file:result.file,status:result.result.status,exitCode:result.result.exitCode}));if(result.result.status!=='completed')process.exitCode=1;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=1;});
