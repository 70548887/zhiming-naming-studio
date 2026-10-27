import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {safeRoot,safeInput,newEvidencePath,writeNewJson} from './safe-paths.mjs';
import {reference,readFreeze} from './release-capture.mjs';
import {checkSql} from './release-assemble.mjs';
const need=(ok,message)=>{if(!ok)throw new Error(message);};
const same=(a,b)=>a?.sha256===b?.sha256&&typeof a?.file==='string'&&typeof b?.file==='string'&&path.relative(path.resolve(a.file),path.resolve(b.file))==='';
const time=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
const ordered=(...values)=>values.every(time)&&values.every((v,i)=>i===0||Date.parse(values[i-1])<=Date.parse(v));

/** Bind already observed P/S/K files into a new runtimeRecord. Original
 * process status/times are retained verbatim, never edited or overwritten. */
export async function constructRuntimeRecord({root,config,output}){
 root=safeRoot(root);const destination=newEvidencePath(root,path.resolve(root,output));
 need(config?.schema==='naming-studio-runtime-record-inputs/1'&&/^\d+\.\d+\.\d+$/.test(config.version),'Explicit runtime record config/version required');
 const load=async(ref,json=true)=>{need(ref&&typeof ref.file==='string'&&/^[a-f0-9]{64}$/.test(ref.sha256??''),'Exact observed file/SHA reference required');const actual=await reference(root,ref.file);need(same(actual,ref)&&(ref.bytes===undefined||ref.bytes===actual.bytes),'Observed input identity changed: '+ref.file);return {ref:actual,value:json?JSON.parse(fs.readFileSync(actual.file,'utf8')):null};};
 const freeze=await readFreeze(root,config.inputFreeze.file,config.version,config.inputFreeze.sha256);
 const p=await load(config.processEvidence),s=await load(config.installedRuntime),k=await load(config.packageEvidence),b=await load(config.buildCapture);
 const P=p.value,S=s.value,K=k.value,B=b.value,I=P.installer;
 need(P.schema==='naming-studio-smoke-process/1'&&P.mode==='Installed'&&P.scope==='naming-v7'&&P.version===config.version&&P.status==='completed'&&P.exitCode===0&&P.signal===null&&P.launchError===null&&Number.isInteger(P.pid)&&P.pid>0,'Actual completed Installed process receipt required');
 need(P.normalProcessesTerminated===false&&P.normalCustomerDataUsed===false&&P.developerToolsPathRemoved===true,'Actual isolation/process preservation facts required');
 need(P.electronRunAsNodePresent===false,'Launcher must explicitly record electronRunAsNodePresent:false from the actual child environment');
 need(B.schema==='naming-studio-command-capture/1'&&B.role==='buildAndPackage'&&B.version===config.version&&B.status==='completed'&&B.exitCode===0&&B.freezeError===null&&B.signal===null&&B.launchError===null&&same(B.sourceFreeze,freeze.ref)&&same(B.freezeAfter,freeze.ref)&&same(P.buildCapture,b.ref),'Actual build/input identity differs');
 need(I&&Number.isInteger(I.pid)&&I.pid>0&&I.exitCode===0&&ordered(freeze.value.frozenAt,B.startedAt,B.completedAt,I.startedAt,I.terminalAt,I.completedAt,P.startedAt,P.terminalAt,P.completedAt),'Actual build/installer/app timestamps are incomplete or out of order');
 for(const value of [S,K])need(value.expectedVersion===config.version&&value.ok===true&&value.summary?.ok===true&&value.summary.failureCount===0&&(value.summary.status===undefined||value.summary.status==='passed')&&Array.isArray(value.failures)&&value.failures.length===0&&(value.status===undefined||value.status==='passed'),'Successful actual SQL/payload verifier output required');
 need(S.schema==='naming-studio-installed-sql/1'&&S.runtimeVerified===true&&same(S.processEvidence,p.ref)&&same(S.sourceFreeze,freeze.ref),'Installed SQL does not bind this exact original process/input');
 for(const key of ['executable','builtAsar','installedAsar'])need(same(S.identity?.[key],P[key]),'Installed SQL binary identity differs: '+key);
 need(K.schema==='naming-studio-package-payload/1'&&K.mode==='installed-complete-payload'&&same(K.inputFreeze,freeze.ref),'Post-runtime complete payload/input proof required');
 need(['workspaceFilesCompared','embeddedSourcesCompared','sourceLocksChecked','sourceAggregatesChecked','productionFieldsChecked','runtimeFilesCompared'].every(key=>Number.isInteger(K.summary[key])&&K.summary[key]>0),'Actual package verifier must provide all positive typed summary counts');
 for(const ref of [P.executable,P.builtAsar,P.installedAsar,P.result,P.database,I])await load(ref,false);
 need(P.builtAsar.sha256===P.installedAsar.sha256&&K.asar?.builtSha256===P.builtAsar.sha256&&K.asar?.installedSha256===P.installedAsar.sha256&&K.installer?.sha256===I.sha256,'Process/payload binary identities differ');
 need(path.resolve(K.asar.built)===path.resolve(P.builtAsar.file)&&path.resolve(K.asar.installed)===path.resolve(P.installedAsar.file)&&path.resolve(K.installer.path??K.installer.file)===path.resolve(I.file),'Payload binary paths differ from the actual process');
 for(const ref of [P.builtAsar,I])need(B.artifacts?.some(item=>same(item,ref)&&item.bytes===ref.bytes),'Build capture does not bind observed installer/ASAR');
 need(P.environment?.NAMING_STUDIO_SMOKE_SCOPE==='naming-v7'&&P.environment?.NAMING_STUDIO_SMOKE_EXIT==='1','Actual naming7 environment required');
 const user=safeInput(root,P.environment.NAMING_STUDIO_USER_DATA),out=safeInput(root,P.environment.NAMING_STUDIO_SMOKE),installed=path.dirname(path.dirname(P.installedAsar.file));
 need(path.dirname(P.executable.file)===installed&&path.resolve(S.database?.path)===path.join(user,'customers.sqlite')&&path.dirname(P.result.file)===out,'Actual installed/userData/result paths differ');
 need(path.resolve(S.resultFile)===path.resolve(P.result.file)&&S.resultSha256===P.result.sha256&&S.runtimeResultSha256===P.result.sha256&&P.database.sha256===S.database.sha256Before&&S.database.sha256Before===S.database.sha256After,'SQL/result/database bytes are not this completed process');
 need(JSON.parse(fs.readFileSync(P.result.file,'utf8')).appVersion===config.version,'Actual app result version differs');
 await checkSql(root,S);
 const record={schema:'naming-studio-runtime-process/1',mode:'Installed',version:config.version,status:'passed',exitCode:P.exitCode,started:I.startedAt,terminalAt:P.terminalAt,completed:P.completedAt,assembledAt:new Date().toISOString(),observedProcessStatus:P.status,observedProcessTimes:{startedAt:P.startedAt,terminalAt:P.terminalAt,completedAt:P.completedAt},normalProcessesTerminated:P.normalProcessesTerminated,normalCustomerDataUsed:P.normalCustomerDataUsed,developerToolsPathRemoved:P.developerToolsPathRemoved,installedDir:installed,output:out,installer:{...I,path:I.file},app:{path:P.executable.file,sha256:P.executable.sha256,bytes:P.executable.bytes,pid:P.pid,startedAt:P.startedAt,userData:user,electronRunAsNodePresent:P.electronRunAsNodePresent},result:P.result.file,sqlVerification:s.ref.file,packageVerificationPostRuntime:k.ref.file,processEvidence:p.ref,sqlEvidence:s.ref,packageEvidence:k.ref,sourceFreeze:freeze.ref,buildCapture:b.ref,scope:'New binding record of already completed Installed process plus successful actual SQL/payload verification. Observed status/timestamps remain in the original receipt and verbatim observed fields. No process was launched or re-run here; assembledAt is separate from observed completion.'};
 for(const ref of [p.ref,s.ref,k.ref,b.ref])await load(ref,false);
 await readFreeze(root,freeze.ref.file,config.version,freeze.ref.sha256);
 const file=writeNewJson(root,destination,record);return {file,record};
}
async function main(args){const options={};for(let i=0;i<args.length;i+=2){need(args[i]?.startsWith('--')&&args[i+1]&&!Object.hasOwn(options,args[i]),'Use unique --key value pairs');options[args[i]]=args[i+1];}const root=safeRoot(options['--root']??process.cwd()),config=JSON.parse(fs.readFileSync(safeInput(root,path.resolve(root,options['--config'])),'utf8'));const result=await constructRuntimeRecord({root,config,output:options['--output']});console.log(JSON.stringify({file:result.file,status:result.record.status,observedProcessStatus:result.record.observedProcessStatus,applicationLaunchedHere:false}));}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2)).catch(error=>{console.error(error.message);process.exitCode=1;});
