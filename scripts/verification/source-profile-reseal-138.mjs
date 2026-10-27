import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {sealManagedOuterAdmission} from './outer-source-admission-138.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const BASE_PROFILE_FILE='review-source-profile-138-m480.json';
const BASE_PROFILE_SHA256='393d423ba8212cfc2deab2f5a7c669b2b9a2953597c75a3db906e187419cd2b2';
const BASE_CONTRACT_SHA256='21950ab68f842ece26980496203250530e1811cdc6cb742f280bf94a4bb22886';
const PROFILE_ID='raw138-m489/1';
const PROFILE_FILE='review-source-profile-138-m489.json';
const REGISTRY_FILE='source-profile-138-approvals.json';
const TARGET_FILE='source-profile-138-targets-m489.json';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const need=(ok,message)=>{if(!ok)throw Object.assign(new Error('Source reseal: '+message),{code:'source-reseal-rejected'});};
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const exactKeys=(value,keys)=>need(plain(value)&&isDeepStrictEqual(Object.keys(value).sort(),[...keys].sort()),'missing or unknown fields');
const encode=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
export function safeRelative(file){
 need(typeof file==='string'&&file.length>0&&!/[\\:]/.test(file)&&!file.startsWith('/')&&file.split('/').every(part=>part&&part!=='.'&&part!=='..'&&!['__proto__','prototype','constructor'].includes(part)),'safe relative path required');
 return file;
}
function ordinaryAbsolute(file,{directory=false}={}){
 need(typeof file==='string'&&path.isAbsolute(file),'absolute path required');
 const target=path.resolve(file);let current=path.parse(target).root;
 for(const part of target.slice(current.length).split(path.sep).filter(Boolean)){current=path.join(current,part);need(!fs.lstatSync(current).isSymbolicLink(),'linked path rejected');}
 const stat=fs.statSync(target);need(directory?stat.isDirectory():stat.isFile(),'ordinary '+(directory?'directory':'file')+' required');return target;
}
function readAbsolute(file){
 file=ordinaryAbsolute(file);const fd=fs.openSync(file,'r');let bytes,before,after;
 try{before=fs.fstatSync(fd,{bigint:true});bytes=fs.readFileSync(fd);after=fs.fstatSync(fd,{bigint:true});}finally{fs.closeSync(fd);}
 const current=fs.statSync(file,{bigint:true});
 need(before.isFile()&&before.dev===after.dev&&before.ino===after.ino&&before.size===after.size&&before.mtimeNs===after.mtimeNs&&before.ctimeNs===after.ctimeNs&&after.dev===current.dev&&after.ino===current.ino&&after.size===current.size&&after.mtimeNs===current.mtimeNs&&after.ctimeNs===current.ctimeNs&&BigInt(bytes.length)===after.size,'file changed while reading');
 return{bytes,sha256:sha(bytes),size:bytes.length};
}
function read(root,file){safeRelative(file);ordinaryAbsolute(root,{directory:true});const target=path.resolve(root,...file.split('/'));need(!path.relative(root,target).startsWith('..')&&!path.isAbsolute(path.relative(root,target)),'path escapes root');return readAbsolute(target);}
function parsed(actual){need(actual.size<=8*1024*1024,'JSON exceeds 8MiB');return JSON.parse(actual.bytes.toString('utf8'));}
const identity=actual=>({sha256:actual.sha256,bytes:actual.size});
const ref=(file,actual)=>({file,...identity(actual)});
function validIdentity(value){exactKeys(value,['sha256','bytes']);need(/^[a-f0-9]{64}$/.test(value.sha256)&&Number.isSafeInteger(value.bytes)&&value.bytes>0,'positive exact identity required');}
function validRef(value){exactKeys(value,['file','sha256','bytes']);safeRelative(value.file);validIdentity({sha256:value.sha256,bytes:value.bytes});}
function fixedBase(){
 const profileRaw=read(here,BASE_PROFILE_FILE);need(profileRaw.sha256===BASE_PROFILE_SHA256,'historical M480 profile bytes differ');const profile=parsed(profileRaw);
 const contractRaw=read(here,'review-resources-138-m489-base.json');need(contractRaw.sha256===BASE_CONTRACT_SHA256,'historical resource contract bytes differ');const contract=parsed(contractRaw);
 need(profile.approvedRoles?.length===19&&profile.pendingRoles?.length===0&&profile.status==='ready','historical 19 role admission required');
 return{profile,contract,profileRaw,contractRaw};
}

/** Produces observations only. No observed identity becomes an approval. */
export function inventorySourceTargets({root}){
 root=ordinaryAbsolute(root,{directory:true});const base=fixedBase();
 const pkg=parsed(read(root,'package.json'));need(pkg.version==='1.0.38','unknown target application version');
 const contractRaw=read(root,'scripts/verification/review-resources-138.json'),contract=parsed(contractRaw);
 need(contract.applicationVersion==='1.0.38'&&contract.profile==='naming-review-resources/1.0.38','unknown target contract');
 need(isDeepStrictEqual(contract.groups,base.contract.groups)&&isDeepStrictEqual(contract.files,base.contract.files),'payload membership/identity changes require a separate resource review');
 const withoutReaders=value=>Object.fromEntries(Object.entries(value).filter(([key])=>key!=='sourceReaders'));
 need(isDeepStrictEqual(withoutReaders(contract),withoutReaders(base.contract)),'non-source contract fields require independent resource approval');
 need(Array.isArray(contract.sourceReaders)&&contract.sourceReaders.every(row=>plain(row)&&typeof row.file==='string')&&isDeepStrictEqual(contract.sourceReaders.map(row=>row.file).sort(),base.contract.sourceReaders.map(row=>row.file).sort()),'unknown source-reader target');
 for(const row of contract.sourceReaders){const old=base.contract.sourceReaders.find(item=>item.file===row.file),metadata=value=>Object.fromEntries(Object.entries(value).filter(([key])=>!['sha256','bytes'].includes(key)));need(isDeepStrictEqual(metadata(row),metadata(old))&&/^[a-f0-9]{64}$/.test(row.sha256)&&(row.bytes===undefined||(Number.isSafeInteger(row.bytes)&&row.bytes>0)),'unknown source-reader metadata');}
 const roles=base.profile.approvedRoles.map(row=>({role:row.role,file:safeRelative(row.file),readerRequired:row.readerRequired,sourceGate:row.sourceGate,before:{sha256:row.sha256,bytes:row.bytes},after:identity(read(root,row.file))}));
 const knownReaders=new Map(base.contract.sourceReaders.map(row=>[safeRelative(row.file),row]));
 for(const row of base.profile.approvedRoles)knownReaders.set(row.file,row);
 const sourceReaders=[...knownReaders].sort(([a],[b])=>a.localeCompare(b,'en')).map(([file,row])=>({file,before:{sha256:row.sha256,...(row.bytes===undefined?{}:{bytes:row.bytes})},after:identity(read(root,file))}));
 const target={schema:'naming-source-reseal-targets/1',profileId:PROFILE_ID,applicationVersion:'1.0.38',baseProfile:ref('scripts/verification/'+BASE_PROFILE_FILE,base.profileRaw),baseContract:{file:'scripts/verification/review-resources-138.json',before:identity(base.contractRaw),after:identity(contractRaw)},sourceLockBaseline:ref('scripts/verification/source-lock-baseline.json',read(root,'scripts/verification/source-lock-baseline.json')),sourceLockVerifier:ref('scripts/verification/source-locks.mjs',read(root,'scripts/verification/source-locks.mjs')),roles,sourceReaders};
 validateTarget(target,base);return target;
}
function validateTarget(target,base=fixedBase()){
 exactKeys(target,['schema','profileId','applicationVersion','baseProfile','baseContract','sourceLockBaseline','sourceLockVerifier','roles','sourceReaders']);
 need(target.schema==='naming-source-reseal-targets/1'&&target.profileId===PROFILE_ID&&target.applicationVersion==='1.0.38','unknown target manifest');
 need(isDeepStrictEqual(target.baseProfile,ref('scripts/verification/'+BASE_PROFILE_FILE,base.profileRaw)),'wrong historical profile identity');
 exactKeys(target.baseContract,['file','before','after']);need(target.baseContract.file==='scripts/verification/review-resources-138.json'&&isDeepStrictEqual(target.baseContract.before,identity(base.contractRaw)),'unknown contract target');validIdentity(target.baseContract.after);
 validRef(target.sourceLockBaseline);need(target.sourceLockBaseline.file==='scripts/verification/source-lock-baseline.json','unknown baseline target');
 validRef(target.sourceLockVerifier);need(target.sourceLockVerifier.file==='scripts/verification/source-locks.mjs','unknown source-lock verifier target');
 need(Array.isArray(target.roles)&&target.roles.length===19,'exact 19 roles required');
 for(let i=0;i<19;i++){const row=target.roles[i],old=base.profile.approvedRoles[i];exactKeys(row,['role','file','readerRequired','sourceGate','before','after']);safeRelative(row.file);need(row.role===old.role&&row.file===old.file&&row.readerRequired===old.readerRequired&&isDeepStrictEqual(row.sourceGate,old.sourceGate)&&isDeepStrictEqual(row.before,{sha256:old.sha256,bytes:old.bytes}),'unknown or reordered role target');validIdentity(row.after);}
 const expected=new Map(base.contract.sourceReaders.map(row=>[row.file,row]));for(const row of base.profile.approvedRoles)expected.set(row.file,row);
 need(Array.isArray(target.sourceReaders)&&target.sourceReaders.length===expected.size&&new Set(target.sourceReaders.map(row=>row.file)).size===expected.size,'exact source-reader closure required');
 for(const row of target.sourceReaders){exactKeys(row,['file','before','after']);safeRelative(row.file);const old=expected.get(row.file);need(old&&isDeepStrictEqual(row.before,{sha256:old.sha256,...(old.bytes===undefined?{}:{bytes:old.bytes})}),'unknown source-reader target');validIdentity(row.after);}
 return target;
}
export function changedSourceTargets(target){
 validateTarget(target);const rows=new Map();
 for(const row of [...target.roles,...target.sourceReaders])if(row.before.sha256!==row.after.sha256||(row.before.bytes!==undefined&&row.before.bytes!==row.after.bytes))rows.set(row.file,{file:row.file,before:row.before,after:row.after});
 const c=target.baseContract;if(!isDeepStrictEqual(c.before,c.after))rows.set(c.file,{file:c.file,before:c.before,after:c.after});
 return[...rows.values()].sort((a,b)=>a.file.localeCompare(b.file,'en'));
}
function registry(){const raw=read(here,REGISTRY_FILE),value=parsed(raw);exactKeys(value,['schema','profileId','trustedReceipts']);need(value.schema==='naming-source-reseal-approval-registry/1'&&value.profileId===PROFILE_ID&&Array.isArray(value.trustedReceipts),'unknown approval registry');return{raw,value};}
export function validateResealApproval({target,targetRaw,receipt,receiptRaw,trustedRegistry}){
 validateTarget(target);need(targetRaw.sha256===sha(encode(target))&&targetRaw.size===encode(target).length,'target manifest must use the exact canonical inventory bytes');
 need(trustedRegistry.schema==='naming-source-reseal-approval-registry/1'&&trustedRegistry.profileId===PROFILE_ID&&Array.isArray(trustedRegistry.trustedReceipts),'untrusted approval registry');
 const trusted=trustedRegistry.trustedReceipts.find(row=>row.sha256===receiptRaw.sha256&&row.bytes===receiptRaw.size);
 need(trusted,'approval receipt is not independently registered');exactKeys(trusted,['file','sha256','bytes','taskId','reviewer','targetManifestSha256']);validRef({file:trusted.file,sha256:trusted.sha256,bytes:trusted.bytes});need(trusted.file.startsWith('scripts/verification/review-receipts/')&&trusted.targetManifestSha256===targetRaw.sha256,'approval is registered for another target');
 exactKeys(receipt,['schema','taskId','reviewer','independent','synthetic','decision','targetManifest','approvedChanges','sourceLockBaseline','limitations']);
 need(receipt.schema==='naming-source-reseal-approval/1'&&receipt.decision==='APPROVED-EXACT-SOURCE-RESEAL'&&receipt.independent===true&&receipt.synthetic===false&&receipt.taskId===trusted.taskId&&receipt.reviewer===trusted.reviewer,'independent production approval required; fixture/synthetic receipts are rejected');
 need(isDeepStrictEqual(receipt.targetManifest,{sha256:targetRaw.sha256,bytes:targetRaw.size})&&isDeepStrictEqual(receipt.approvedChanges,changedSourceTargets(target))&&isDeepStrictEqual(receipt.sourceLockBaseline,target.sourceLockBaseline),'approval does not bind the exact target and complete changes');need(Array.isArray(receipt.limitations),'explicit review limitations required');
 return{...trusted,scope:'historical-inner-only',productionApproved:false};
}

/** Called by the sealed loader; historical M480 keeps its historical receipt checks. */
export function verifyResealedSourceProfile({root,profile}){
 if(profile.reseal===undefined)return{scope:'historical-inner-only',productionApproved:false,sourceReaders:[]};
 exactKeys(profile.reseal,['targetManifest','approvalReceipt','registry']);for(const v of Object.values(profile.reseal))validRef(v);
 need(profile.profileId===PROFILE_ID&&profile.reseal.targetManifest.file==='scripts/verification/'+TARGET_FILE&&profile.reseal.registry.file==='scripts/verification/'+REGISTRY_FILE,'unknown resealed profile selection');
 const targetRaw=read(root,profile.reseal.targetManifest.file),receiptRaw=read(root,profile.reseal.approvalReceipt.file),registryRaw=read(root,profile.reseal.registry.file);
 for(const [raw,expected]of [[targetRaw,profile.reseal.targetManifest],[receiptRaw,profile.reseal.approvalReceipt],[registryRaw,profile.reseal.registry]])need(raw.sha256===expected.sha256&&raw.size===expected.bytes,'sealed reseal reference differs');
 const target=parsed(targetRaw),receipt=parsed(receiptRaw),trusted=validateResealApproval({target,targetRaw,receipt,receiptRaw,trustedRegistry:parsed(registryRaw)});
 need(trusted.file===profile.reseal.approvalReceipt.file&&isDeepStrictEqual(profile.baseContract,{file:target.baseContract.file,...target.baseContract.after}),'resealed contract/receipt differs');
 need(profile.approvedRoles.length===target.roles.length,'resealed role count differs');
 for(let i=0;i<target.roles.length;i++){const t=target.roles[i];need(isDeepStrictEqual(profile.approvedRoles[i],{role:t.role,file:t.file,...t.after,sourceGate:t.sourceGate,readerRequired:t.readerRequired}),'resealed role or historical provenance differs');}
 for(const expected of [target.sourceLockBaseline,target.sourceLockVerifier]){const actual=read(root,expected.file);need(actual.sha256===expected.sha256&&actual.size===expected.bytes,'owner06 prerequisite identity differs');}
 return{scope:'historical-inner-only',productionApproved:false,sourceReaders:target.sourceReaders.map(row=>({file:row.file,...row.after,scope:'historical-inner-source-identity;not-current-production-admission'}))};
}
function atomicNew(file,bytes){need(!fs.existsSync(file)&&!fs.existsSync(file+'.new'),'preserve existing output');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.new',bytes,{flag:'wx'});fs.renameSync(file+'.new',file);}
export function resealSourceProfile(options){
 keysForManagedSeal(options);
 return sealManagedOuterAdmission(options);
}
function keysForManagedSeal(options){need(recordForManagedSeal(options)&&isDeepStrictEqual(Object.keys(options).sort(),['output','root']),'production seal accepts only managed root/output options; arbitrary receipt/registry inputs are rejected');}
function recordForManagedSeal(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}

function main(argv){
 const command=argv.shift(),args={};for(let i=0;i<argv.length;i+=2){need(argv[i]?.startsWith('--')&&argv[i+1]&&!Object.hasOwn(args,argv[i]),'explicit unique option values required');args[argv[i]]=argv[i+1];}
 if(command==='inventory'){need(isDeepStrictEqual(Object.keys(args).sort(),['--output','--root']),'inventory uses --root and --output');const result=inventorySourceTargets({root:args['--root']});atomicNew(path.resolve(args['--output']),encode(result));console.log(JSON.stringify({status:'observed-not-approved',roles:result.roles.length,sourceReaders:result.sourceReaders.length,changed:changedSourceTargets(result).map(row=>row.file),output:path.resolve(args['--output'])}));return;}
 need(command==='seal'&&isDeepStrictEqual(Object.keys(args).sort(),['--output','--root']),'production seal uses only --root and --output; receipt/registry paths are fixed managed inputs');
 console.log(JSON.stringify(resealSourceProfile({root:args['--root'],output:args['--output']})));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))try{main(process.argv.slice(2));}catch(error){console.error(error.message);process.exitCode=1;}
