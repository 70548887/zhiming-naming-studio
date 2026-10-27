import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {fileURLToPath} from 'node:url';
import {RAW138_SOURCE_PROFILE_ID,RAW138_SOURCE_PROFILE_FILE} from '../verification/source-profile-138.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const looksProjectFile=value=>typeof value==='string'&&/^(?:data|assets|src|scripts|docs)\//.test(value);
const licenseName=file=>/(?:^|\/)(?:[^/]*(?:LICENSE|NOTICE)[^/]*|CC[^/]*\.(?:txt|html))$/i.test(file);

/** Inventory only. The existing source/resource/offline gates remain authoritative. */
export function inspectCheckout({root,trackedFiles}){
  root=fs.realpathSync(root);
  const tracked=new Set(trackedFiles),errors=[],required=new Map(),checked=[],sourceGates=[];
  const fail=(code,details)=>errors.push({code,...details});
  const add=(file,reason)=>{
    if(typeof file!=='string'||!file)return;
    if(!required.has(file))required.set(file,new Set());
    required.get(file).add(reason);
  };
  const resolveInput=file=>{
    if(typeof file!=='string'||file.includes('\\')||file.startsWith('/')||/^[A-Za-z]:/.test(file)||file.split('/').some(part=>!part||part==='.'||part==='..'))throw Error('Expected a safe checkout-relative path');
    let current=root;
    for(const part of file.split('/')){current=path.join(current,part);if(fs.lstatSync(current).isSymbolicLink())throw Error('Reparse or symbolic-link input is not allowed');}
    if(!fs.statSync(current).isFile())throw Error('Input is not a regular file');
    return current;
  };
  const json=file=>{
    add(file,'required metadata');
    try{return JSON.parse(fs.readFileSync(resolveInput(file),'utf8'));}
    catch(error){fail('metadata-unavailable',{file,message:error.message});return null;}
  };
  const collect=(value,reason)=>{
    if(!value||typeof value!=='object')return;
    if(Array.isArray(value)){for(const item of value){if(looksProjectFile(item))add(item,reason);else collect(item,reason);}return;}
    for(const [key,item]of Object.entries(value)){
      if(looksProjectFile(key))add(key,reason);
      if((key==='file'||key==='path')&&looksProjectFile(item))add(item,reason);
      if(item&&typeof item==='object')collect(item,reason);
    }
  };
  const pkg=json('package.json'),lock=json('package-lock.json');
  if(pkg&&lock){
    if(lock.lockfileVersion!==3||lock.version!==pkg.version||lock.packages?.['']?.version!==pkg.version)fail('package-lock-version',{message:'Require lockfile v3 and matching package versions.'});
    for(const field of ['dependencies','devDependencies','engines'])if(!isDeepStrictEqual(pkg[field]??{},lock.packages?.['']?.[field]??{}))fail('package-lock-root-differs',{field});
  }
  for(const file of ['scripts/verify.mjs','scripts/build-electron.mjs','scripts/verification/source-locks.mjs','scripts/verification/source-profile-138.mjs','scripts/verification/source-profile-reseal-138.mjs','scripts/verification/outer-source-admission-138.mjs','scripts/verification/source-profile-138-approvals.json','scripts/verification/review-source-profile-138-m480.json','scripts/verification/review-resources-138-m489-base.json','docs/THIRD-PARTY-NOTICES.md'])add(file,'existing verification/build or attribution entry');
  const contractFile='scripts/verification/review-resources-138.json';
  const profileFile='scripts/verification/'+RAW138_SOURCE_PROFILE_FILE;
  const baseline=json('scripts/verification/source-lock-baseline.json'),contract=json(contractFile),profile=json(profileFile);
  if(pkg?.version!=='1.0.38')fail('reviewed-version-changed',{expected:'1.0.38',actual:pkg?.version??null,message:'Review this CI input selection when the source/resource profile changes.'});
  collect(baseline,'existing source-lock baseline');
  collect(contract,'existing reviewed resource contract');
  collect(profile,'existing source-role profile');
  if(profile?.reseal)for(const [name,reference]of Object.entries(profile.reseal)){
    if(!reference||typeof reference.file!=='string')fail('source-reseal-ref-invalid',{name});
    else{add(reference.file,'independently sealed reseal reference');sourceGates.push(reference);}
  }
  const locks=trackedFiles.filter(file=>file.startsWith('data/')&&/(?:^|\/)source-lock\.json$|-source-lock\.json$/.test(file));
  for(const file of locks){
    const value=json(file);if(!value)continue;
    collect(value,file);
    const parent=path.posix.dirname(file);
    for(const field of ['fileHashes','files','projectFiles']){
      const map=value[field];if(!map||Array.isArray(map)||typeof map!=='object')continue;
      for(const name of Object.keys(map))if(!looksProjectFile(name))add(parent+'/'+name,file+'#'+field);
    }
    const raw=value.artifacts??(file==='data/source-lock.json'?value:null);
    if(raw&&typeof raw==='object')for(const [name,item]of Object.entries(raw))if(item&&typeof item==='object'&&/^[a-f0-9]{64}$/.test(item.sha256??''))add('data/raw/'+name,file+'#raw original');
  }
  // No machine-local gate is read or silently borrowed, even on a developer PC.
  const approved=Array.isArray(profile?.approvedRoles)?profile.approvedRoles:[];
  if(profile?.schema!=='naming-review-source-profile/1'||profile?.profileId!==RAW138_SOURCE_PROFILE_ID||profile?.status!=='ready'||!approved.length||!Array.isArray(profile?.pendingRoles)||profile.pendingRoles.length)fail('source-profile-not-ready',{profileFile,message:'Require the fixed ready reviewed profile; the source loader checks its sealed identity.'});
  const gateMap=new Map();
  for(const row of approved){
    if(!row||typeof row!=='object'||Array.isArray(row)){fail('source-profile-invalid-role',{profileFile});continue;}
    const gate=row.sourceGate,key=gate?.file;
    if(gateMap.has(key)&&!isDeepStrictEqual(gateMap.get(key),gate))fail('source-review-ref-conflict',{profileFile,file:key,message:'One receipt path has conflicting fixed identities.'});
    else if(!gateMap.has(key))gateMap.set(key,gate);
  }
  const gates=[...gateMap.values()];
  for(const gate of gates){
    if(!gate||typeof gate.file!=='string'){fail('source-review-ref-invalid',{profileFile});continue;}
    const file=gate.file;
    if(!file.startsWith('scripts/verification/review-receipts/')||file.includes('\\')||file.includes(':')||file.startsWith('/')||file.split('/').some(part=>!part||part==='.'||part==='..'||['__proto__','prototype','constructor'].includes(part))){
      fail('source-review-ref-outside-checkout',{profileFile,declaredFile:file,sha256:gate.sha256,bytes:gate.bytes,message:'A review reference must use a safe checkout-relative path under review-receipts.'});continue;
    }
    add(file,'approved source-role review evidence');sourceGates.push({...gate,file});
  }
  // Keep license/attribution originals in the fixed-resource closure visible.
  for(const file of trackedFiles.filter(licenseName))if(file.startsWith('data/')||file.startsWith('assets/')||file.startsWith('docs/'))add(file,'tracked license or attribution original');
  for(const [file,reasons]of required){
    const row={file,reasons:[...reasons],tracked:tracked.has(file),available:false,licenseOrNotice:licenseName(file)};
    if(!row.tracked)fail('required-input-not-tracked',{file,reasons:row.reasons});
    try{const actual=resolveInput(file);row.bytes=fs.statSync(actual).size;row.available=true;if(row.bytes===0)fail('required-input-empty',{file});}
    catch(error){fail('required-input-unavailable',{file,message:error.message,reasons:row.reasons});}
    checked.push(row);
  }
  for(const gate of sourceGates){
    try{const bytes=fs.readFileSync(resolveInput(gate.file));if(bytes.length!==gate.bytes||hash(bytes)!==gate.sha256)fail('source-review-ref-identity',{file:gate.file,expectedSha256:gate.sha256,expectedBytes:gate.bytes});}
    catch(error){fail('source-review-ref-unavailable',{file:gate.file,message:error.message});}
  }
  return{schema:'naming-studio-ci-checkout-inputs/1',status:errors.length?'failed':'passed',sourceVersion:pkg?.version??null,lockfileVersion:lock?.lockfileVersion??null,requiredInputs:checked.length,licenseOrNoticeFiles:checked.filter(row=>row.licenseOrNotice).length,sourceLockFiles:locks.length,sourceGateReferences:new Set(sourceGates.map(row=>row.file)).size,errors,inputs:checked,scope:'Checkout containment, tracking, availability, lock-root agreement and admitted review-ref identities only. Full fixed data/license hashes, loader checks, rebuilds, types, tests and builds must pass the existing scripts/verify.mjs --profile ci.',networkRequests:0};
}

function main(args){
  if(args.length!==2||args[0]!=='--output')throw Error('Use node scripts/ci/check-inputs.mjs --output <new-report.json>');
  const root=process.cwd(),git=spawnSync('git',['-C',root,'ls-files','--cached','-z'],{encoding:'utf8',windowsHide:true});
  if(git.error||git.status!==0)throw Error('A readable Git checkout index is required: '+(git.error?.message??git.stderr));
  const trackedFiles=git.stdout.split('\0').filter(Boolean),report=inspectCheckout({root,trackedFiles}),output=path.resolve(args[1]);
  if(fs.existsSync(output)||fs.existsSync(output+'.new'))throw Error('Preserve the existing input report; choose a fresh path.');
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output+'.new',JSON.stringify(report,null,2)+'\n',{flag:'wx'});fs.renameSync(output+'.new',output);
  console.log(JSON.stringify({status:report.status,requiredInputs:report.requiredInputs,licenseOrNoticeFiles:report.licenseOrNoticeFiles,errors:report.errors,report:output},null,2));
  if(report.status!=='passed')process.exitCode=1;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))try{main(process.argv.slice(2));}catch(error){console.error(error.message);process.exitCode=1;}
