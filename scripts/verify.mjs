import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {isDeepStrictEqual} from 'node:util';
import {safeRoot,safeRelativeInput,newEvidencePath,reserveEvidenceDirectory,writeNewJson,assertNoReparse} from './verification/safe-paths.mjs';

const SCRIPT_DIRECTORY=path.dirname(fileURLToPath(import.meta.url));
const PROFILES=new Set(['source','maintenance-unit','ci','release','capacity']);
export function parseVerificationArguments(args){
  const value={profile:'source',root:process.cwd(),output:undefined,dryRun:false,allowPostReleaseDocs:false,strictLocalEvidence:false};
  for(let i=0;i<args.length;i++){
    const key=args[i];
    if(key==='--dry-run'){value.dryRun=true;continue;}
    if(key==='--allow-post-release-docs'){value.allowPostReleaseDocs=true;continue;}
    if(key==='--strict-local-evidence'){value.strictLocalEvidence=true;continue;}
    if(!['--profile','--root','--output'].includes(key)||args[i+1]===undefined||args[i+1].startsWith('--'))throw new Error('Unsupported or incomplete verification option: '+key);
    value[key.slice(2)]=args[++i];
  }
  if(!PROFILES.has(value.profile))throw new Error('Unknown verification profile');
  value.root=safeRoot(value.root);value.output=newEvidencePath(value.root,path.resolve(value.output??path.join(value.root,'verification-output',value.profile)));
  return value;
}

export function assertLockfile(root){
  root=safeRoot(root);
  const packageFile=JSON.parse(fs.readFileSync(safeRelativeInput(root,'package.json'),'utf8'));
  const lock=JSON.parse(fs.readFileSync(safeRelativeInput(root,'package-lock.json'),'utf8'));
  if(lock.lockfileVersion!==3||lock.version!==packageFile.version||lock.packages?.['']?.version!==packageFile.version)throw new Error('package-lock v3 and current package versions must agree');
  for(const field of ['dependencies','devDependencies','engines'])if(!isDeepStrictEqual(lock.packages[''][field]??{},packageFile[field]??{}))throw new Error('Lock root differs from package '+field+'; regenerate and review the lock deliberately');
  return {version:packageFile.version,lockfileVersion:lock.lockfileVersion};
}

export function verificationPlan(options,scriptDirectory=SCRIPT_DIRECTORY){
  const node=process.execPath,script=(...parts)=>path.join(scriptDirectory,...parts),atRoot=(...parts)=>path.join(options.root,...parts);
  const step=(id,args)=>({id,command:node,args,kind:'machine-check'});
  const candidate38Source=['source','ci'].includes(options.profile)&&fs.existsSync(atRoot('package.json'))&&JSON.parse(fs.readFileSync(safeRelativeInput(options.root,'package.json'),'utf8')).version==='1.0.38';
  const source=[
    step('current-status',[script('verification','check-status.mjs'),'--root',options.root,'--output',path.join(options.output,'current-status.json')]),
    step('fixed-source-files',['--no-warnings',script('verification','source-locks.mjs'),'--root',options.root,'--output',path.join(options.output,'source-locks.json')]),
    step('review-runtime-resources',[script('verification','review-resources.mjs'),'--root',options.root,'--report',path.join(options.output,'review-runtime-resources.json'),...(candidate38Source?['--stage','source-prebuild']:[])]),
    step('naming-v6-offline-rebuild',[atRoot('scripts','build-naming-editorial-v6.mjs'),'--verify']),
    step('naming-v7-offline-rebuild',[atRoot('scripts','build-naming-editorial-v7.mjs'),'--verify']),
    ...(candidate38Source?[step('naming-v71-offline-rebuild',[atRoot('scripts','build-naming-editorial-v7.mjs'),'--profile','naming-character-meanings-v7.1/1','--verify'])]:[]),
    step('classics-offline-rebuild',[atRoot('scripts','build-classics-data.mjs'),'--verify']),
    step('numerology-offline-rebuild',[atRoot('scripts','build-numerology-data.mjs'),'--verify','--offline']),
  ];
  const unitFiles=[];
  for(const folder of ['verification','acceptance','benchmarks']){
    const directory=script(folder);if(!fs.existsSync(directory))continue;
    for(const file of fs.readdirSync(directory).sort())if(file.endsWith('.test.mjs'))unitFiles.push(path.join(directory,file));
  }
  const units=()=>{if(!unitFiles.length)throw new Error('Controlled maintenance tests are missing');return step('maintenance-unit-tests',['--test',atRoot('scripts','check-naming-editorial-v7-rebuild.mjs'),...unitFiles]);};
  if(options.profile==='source')return source;
  if(options.profile==='maintenance-unit')return [units()];
  if(options.profile==='release')return [step('release-consistency',[script('verification','release.mjs'),'--root',options.root,'--output',path.join(options.output,'release.json'),...(options.allowPostReleaseDocs?['--allow-post-release-docs']:[]),...(options.strictLocalEvidence?['--strict-local-evidence']:[])])];
  if(options.profile==='capacity')return [step('isolated-capacity-benchmark',[script('benchmarks','customer-capacity.mjs'),'--project='+options.root,'--owned-root='+options.output,'--run-id=calibration-n100-a1','--profiles=100','--sessions=100','--archives=1','--timeout-ms=180000'])];
  return [...source,units(),step('typecheck',[atRoot('node_modules','typescript','bin','tsc'),'--noEmit']),step('full-regression',[atRoot('node_modules','vitest','vitest.mjs'),'run']),step('renderer-production-build',[atRoot('node_modules','vite','bin','vite.js'),'build']),step('electron-production-build',[atRoot('scripts','build-electron.mjs')])];
}

export function runVerification(options){
  const lock=assertLockfile(options.root),plan=verificationPlan(options);
  if(options.dryRun)return {schema:'controlled-verification-plan/1',status:'not-executed',...lock,profile:options.profile,root:options.root,output:options.output,plan};
  reserveEvidenceDirectory(options.root,options.output);const result={schema:'controlled-verification/2',status:'running',version:lock.version,profile:options.profile,root:options.root,startedAt:new Date().toISOString(),steps:[],scope:'Controlled checks only; CI is not native dialogs, provider AI, publisher signing, cross-machine or traditional-rule completion.'};
  for(const item of plan){
    const log=newEvidencePath(options.root,path.join(options.output,item.id+'.log'));assertNoReparse(path.dirname(log));const fd=fs.openSync(log,'wx'),started=performance.now();let run;
    try{run=spawnSync(item.command,item.args,{cwd:options.root,stdio:['ignore',fd,fd],timeout:45*60*1000,windowsHide:true,env:{...process.env,CI:'true'}});}finally{fs.closeSync(fd);}
    result.steps.push({id:item.id,exitCode:run.status,signal:run.signal,error:run.error?String(run.error.message):null,elapsedMs:performance.now()-started,log});
    if(run.status!==0){const releaseFile=path.join(options.output,'release.json');const releaseStatus=item.id==='release-consistency'&&fs.existsSync(releaseFile)?JSON.parse(fs.readFileSync(releaseFile,'utf8')):null;result.status=releaseStatus?.status==='pending'||releaseStatus?.summary?.overallVerification==='not-verified'?'not-verified':run.error?.code==='ETIMEDOUT'?'timed-out':'failed';break;}
  }
  if(result.status==='running')result.status='passed';result.finishedAt=new Date().toISOString();
  writeNewJson(options.root,path.join(options.output,'summary.json'),result);return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const result=runVerification(parseVerificationArguments(process.argv.slice(2)));console.log(JSON.stringify(result,null,2));if(!['passed','not-executed'].includes(result.status))process.exitCode=1;}catch(error){console.error(error.message);process.exitCode=1;}
}
