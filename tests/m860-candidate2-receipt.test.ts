import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {ensureCandidate2NamingDependency} from '../scripts/build-candidate2-naming-dependency-v1.mjs';
import type {Candidate2NamingDependencyResult} from '../scripts/build-candidate2-naming-dependency-v1.mjs';

type Receipt=Record<string,any>;
type MutationCase={name:string;mutate:(receipt:Receipt)=>void};
const root=path.resolve('.'),parent=fs.realpathSync(os.tmpdir());
const owned=fs.mkdtempSync(path.join(parent,'m860-candidate2-receipt-'));
const fixed=path.join(owned,'fixed-root');
const OUTPUT_SHA256='906b191c88ce2e6f0335c674727c39bcae14edf2968d2c1c5cdffcb04079b47a';
const OUTPUT_BYTES=2002922;
const evidenceFields=['compiledExecutionSources','virtualInputs','externalRuntimeModules','resolutionMetadata','buildSources','runtimeEnvironment','metafile'] as const;
const environmentKeys=['node','icu','tz','unicode','platform','arch'] as const;
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
const summary:{coldWarm?:unknown;invalidCases:unknown[];alternativeEnvironment?:unknown;finalWarm?:unknown}={invalidCases:[]};
let deployment:Candidate2NamingDependencyResult;
let originalReceipt:Buffer,originalBundle:Buffer,receipt:Receipt;
let receiptTime:{atime:Date;mtime:Date},bundleMtime:number;
let protectedFiles:string[]=[];
let originalInventory:{file:string;bytes:number;sha256:string}[]=[];

function writeOwned(relative:string,bytes:Uint8Array){
 const filename=path.resolve(fixed,...relative.split('/'));
 if(!filename.startsWith(path.resolve(fixed)+path.sep))throw Error('M860 fixture path escaped the owned root');
 fs.mkdirSync(path.dirname(filename),{recursive:true});fs.writeFileSync(filename,bytes);
}
function sourceInventory(){
 return protectedFiles.map(file=>{const bytes=fs.readFileSync(path.join(fixed,...file.split('/')));return{file,bytes:bytes.length,sha256:sha(bytes)};});
}
function pairTimes(){return{bundle:fs.statSync(deployment.bundlePath).mtimeMs,receipt:fs.statSync(deployment.receiptPath).mtimeMs};}
function restoreReceipt(){
 fs.writeFileSync(deployment.receiptPath,originalReceipt);
 fs.utimesSync(deployment.receiptPath,receiptTime.atime,receiptTime.mtime);
}
function assertOriginalReceiptRestored(){
 expect(fs.readFileSync(deployment.receiptPath)).toEqual(originalReceipt);
 expect(fs.statSync(deployment.receiptPath).mtimeMs).toBe(receiptTime.mtime.getTime());
}
function alteredReceipt(value:Receipt,offset:number){
 const bytes=Buffer.from(JSON.stringify(value,null,2)+'\n');
 fs.writeFileSync(deployment.receiptPath,bytes);
 const timestamp=new Date(Date.UTC(2005,0,1)+offset*2000);
 fs.utimesSync(deployment.receiptPath,timestamp,timestamp);
 return bytes;
}
function firstMetaInput(value:Receipt):any{return Object.values(value.metafile.inputs)[0];}
function firstMetaInputWithImports(value:Receipt):any{
 const input=Object.values(value.metafile.inputs).find((item:any)=>Array.isArray(item.imports)&&item.imports.length) as any;
 if(!input)throw Error('M860 official input import metadata missing');return input;
}
function firstMetaOutput(value:Receipt):any{return Object.values(value.metafile.outputs)[0];}
function firstOutputContribution(value:Receipt):any{return Object.values(firstMetaOutput(value).inputs)[0];}

const mutations:MutationCase[]=[
 {name:'M855 removes all seven evidence fields',mutate:value=>{for(const field of evidenceFields)delete value[field];}},
 ...evidenceFields.map(field=>({name:'missing evidence field '+field,mutate:(value:Receipt)=>{delete value[field];}})),
 {name:'compiled execution row source path differs',mutate:value=>{value.compiledExecutionSources[0].sourcePath='src/main/m860-forged.ts';}},
 {name:'compiled execution row byte count differs',mutate:value=>{value.compiledExecutionSources[0].bytes++;}},
 {name:'compiled execution row hash differs',mutate:value=>{value.compiledExecutionSources[0].sha256='0'.repeat(64);}},
 {name:'compiled execution row role differs',mutate:value=>{value.compiledExecutionSources[0].role='resolution';}},
 {name:'compiled execution source membership differs',mutate:value=>{value.compiledExecutionSources=value.compiledExecutionSources.slice(1);}},
 {name:'virtual input define name differs',mutate:value=>{value.virtualInputs[0].file='<define:__M860_FORGED_IDENTITY__>'; }},
 {name:'virtual input byte count differs',mutate:value=>{value.virtualInputs[0].bytes++;}},
 {name:'virtual input hash differs',mutate:value=>{value.virtualInputs[0].sha256='1'.repeat(64);}},
 {name:'external runtime module set differs',mutate:value=>{value.externalRuntimeModules.push('node:http');}},
 {name:'resolution metadata hash differs',mutate:value=>{value.resolutionMetadata[0].sha256='2'.repeat(64);}},
 {name:'resolution metadata role differs',mutate:value=>{value.resolutionMetadata[0].role='execution';}},
 {name:'resolution metadata membership differs',mutate:value=>{value.resolutionMetadata=value.resolutionMetadata.slice(1);}},
 {name:'build source hash differs',mutate:value=>{value.buildSources[0].sha256='3'.repeat(64);}},
 {name:'build source role differs',mutate:value=>{value.buildSources[0].role='execution';}},
 {name:'build source membership differs',mutate:value=>{value.buildSources=value.buildSources.slice(1);}},
 ...environmentKeys.map(key=>({name:'runtime environment misses '+key,mutate:(value:Receipt)=>{delete value.runtimeEnvironment[key];}})),
 {name:'runtime environment contains an extra field',mutate:value=>{value.runtimeEnvironment.m860Extra='unadmitted';}},
 ...([
  ['node',24],['icu',true],['tz',2025],['unicode',[]],['platform',null],['arch',{}],
 ] as const).map(([key,bad])=>({name:'runtime environment wrong type for '+key,mutate:(value:Receipt)=>{value.runtimeEnvironment[key]=bad;}})),
 {name:'metafile input byte count differs',mutate:value=>{firstMetaInput(value).bytes++;}},
 {name:'metafile input import kind differs',mutate:value=>{firstMetaInputWithImports(value).imports[0].kind='dynamic-import';}},
 {name:'metafile output entry point differs',mutate:value=>{firstMetaOutput(value).entryPoint='src/main/m860-forged.ts';}},
 {name:'metafile output byte count differs',mutate:value=>{firstMetaOutput(value).bytes++;}},
 {name:'metafile output contribution bytes differ',mutate:value=>{firstOutputContribution(value).bytesInOutput++;}},
 {name:'metafile output import kind differs',mutate:value=>{firstMetaOutput(value).imports[0].kind='import-statement';}},
 {name:'metafile input membership differs',mutate:value=>{delete value.metafile.inputs[Object.keys(value.metafile.inputs)[0]];}},
];

beforeAll(async()=>{
 const copied=new Set<string>();
 // Only the two actual fixed publications and candidate.2 application pins
 // are host fixture inputs. The helper owns restoration of compilation inputs.
 for(const relative of ['assets/bazi-root-feedback/1.3.2-r2','assets/project-naming-application/1.3.2-candidate.2']){
  const manifestBytes=fs.readFileSync(path.join(root,relative,'resource-manifest.json'));
  const manifest=JSON.parse(manifestBytes.toString('utf8')) as {files:{path:string;bytes:number;sha256:string}[]};
  writeOwned(relative+'/resource-manifest.json',manifestBytes);copied.add(relative+'/resource-manifest.json');
  for(const row of manifest.files){
   const relativeFile=relative+'/'+row.path,bytes=fs.readFileSync(path.join(root,...relativeFile.split('/')));
   expect(bytes.length).toBe(row.bytes);expect(sha(bytes)).toBe(row.sha256);
   writeOwned(relativeFile,bytes);copied.add(relativeFile);
  }
 }
 const applicationPin='src/main/project-application-v132-r2-pins.json';
 writeOwned(applicationPin,fs.readFileSync(path.join(root,applicationPin)));copied.add(applicationPin);
 protectedFiles=[...copied].sort();originalInventory=sourceInventory();
 expect(fs.existsSync(path.join(fixed,'package.json'))).toBe(false);
 expect(fs.existsSync(path.join(fixed,'src/domain'))).toBe(false);
 expect(fs.existsSync(path.join(fixed,'node_modules'))).toBe(false);
 deployment=await ensureCandidate2NamingDependency({root:fixed});
 expect(deployment.status).toBe('built');
 expect(deployment.output).toEqual({file:'application.cjs',bytes:OUTPUT_BYTES,sha256:OUTPUT_SHA256});
 originalBundle=fs.readFileSync(deployment.bundlePath);originalReceipt=fs.readFileSync(deployment.receiptPath);
 expect(originalBundle.length).toBe(OUTPUT_BYTES);expect(sha(originalBundle)).toBe(OUTPUT_SHA256);
 receipt=JSON.parse(originalReceipt.toString('utf8')) as Receipt;
 expect(Object.keys(receipt).sort()).toEqual(['schema','identity',...evidenceFields,'output'].sort());
 // Normalize only owned fixture timestamps to exact millisecond values so a
 // warm rewrite is observable on Windows without sub-millisecond rounding.
 const bundleTime=new Date(Date.UTC(2003,0,1)),receiptStamp=new Date(Date.UTC(2003,0,1,0,0,2));
 fs.utimesSync(deployment.bundlePath,bundleTime,bundleTime);fs.utimesSync(deployment.receiptPath,receiptStamp,receiptStamp);
 receiptTime={atime:receiptStamp,mtime:receiptStamp};bundleMtime=fs.statSync(deployment.bundlePath).mtimeMs;
 const times=pairTimes(),warm=await ensureCandidate2NamingDependency({root:fixed});
 expect(warm.status).toBe('verified-existing');expect(pairTimes()).toEqual(times);
 expect(fs.readFileSync(deployment.bundlePath)).toEqual(originalBundle);assertOriginalReceiptRestored();
 expect(sourceInventory()).toEqual(originalInventory);
 summary.coldWarm={cold:deployment.status,warm:warm.status,output:deployment.output,fixtureInputs:'two fixed publications plus candidate.2 application pins only',protectedFiles:protectedFiles.length,pairMtimesPreserved:true,privateScratchNotHostWriteBack:true};
},60000);

afterAll(()=>{
 try{
  const directory=process.env.M860_EVIDENCE_DIR;
  if(directory){
   const target=path.join(path.resolve(directory),'m860-candidate2-receipt-summary.json');fs.mkdirSync(path.dirname(target),{recursive:true});
   fs.writeFileSync(target+'.tmp',JSON.stringify(summary,null,2)+'\n');fs.renameSync(target+'.tmp',target);
  }
 }finally{
  const target=path.resolve(owned);
  if(path.dirname(target)!==parent||!path.basename(target).startsWith('m860-candidate2-receipt-'))throw Error('M860 unsafe owned fixture cleanup');
  fs.rmSync(target,{recursive:true,force:true});
 }
});

describe('M860 full candidate.2 deployment receipt authentication',()=>{
 it.each(mutations)('rejects $name without repairing the pair or fixed inputs',async({name,mutate})=>{
  assertOriginalReceiptRestored();
  const bad=clone(receipt);mutate(bad);
  const bytes=alteredReceipt(bad,mutations.findIndex(item=>item.name===name)+1),times=pairTimes();
  const beforeInventory=sourceInventory();let failure:unknown;
  try{
   try{await ensureCandidate2NamingDependency({root:fixed});}catch(error){failure=error;}
   expect(failure,name).toBeInstanceOf(Error);
   expect((failure as Error).message,name).toContain('CANDIDATE2_NAMING_DEPENDENCY_RECEIPT_INVALID');
   expect(fs.readFileSync(deployment.receiptPath),name+' must preserve supplied bad receipt').toEqual(bytes);
   expect(fs.readFileSync(deployment.bundlePath),name+' must preserve bundle').toEqual(originalBundle);
   expect(pairTimes(),name+' must preserve pair mtimes').toEqual(times);
   expect(sourceInventory(),name+' must preserve publication and pin byte inventory').toEqual(beforeInventory);
   expect(beforeInventory).toEqual(originalInventory);
   summary.invalidCases.push({name,rejected:true,error:(failure as Error).message,suppliedReceiptPreserved:true,bundlePreserved:true,pairMtimesPreserved:true,protectedInventoryPreserved:true});
  }catch(error){
   summary.invalidCases.push({name,rejected:failure instanceof Error,error:failure instanceof Error?failure.message:null,assertionFailure:error instanceof Error?error.message:String(error)});throw error;
  }finally{restoreReceipt();}
  assertOriginalReceiptRestored();expect(fs.statSync(deployment.bundlePath).mtimeMs).toBe(bundleMtime);
 },30000);

 it('accepts a valid alternative runtime environment without pinning the entire receipt hash',async()=>{
  const alternative=clone(receipt);
  alternative.runtimeEnvironment={node:'24.0.0',icu:'77.1',tz:'2025b',unicode:'16.0',platform:'linux',arch:'arm64'};
  const bytes=alteredReceipt(alternative,100),times=pairTimes(),beforeInventory=sourceInventory();
  try{
   const warm=await ensureCandidate2NamingDependency({root:fixed});
   expect(warm.status).toBe('verified-existing');
   expect(warm.output).toEqual({file:'application.cjs',bytes:OUTPUT_BYTES,sha256:OUTPUT_SHA256});
   // Authenticate the receipt that is actually present; no constant whole-
   // receipt SHA is admitted as a substitute for validating its evidence.
   expect(warm.receiptSha256).toBe(sha(bytes));
   expect(fs.readFileSync(deployment.receiptPath)).toEqual(bytes);
   expect(fs.readFileSync(deployment.bundlePath)).toEqual(originalBundle);expect(pairTimes()).toEqual(times);
   expect(sourceInventory()).toEqual(beforeInventory);expect(beforeInventory).toEqual(originalInventory);
   summary.alternativeEnvironment={status:warm.status,runtimeEnvironment:alternative.runtimeEnvironment,output:warm.output,suppliedReceiptPreserved:true,pairMtimesPreserved:true,wholeReceiptHashPinned:false};
  }finally{restoreReceipt();}
  assertOriginalReceiptRestored();
 },30000);

 it('finally accepts the exact restored legal warm pair without rewriting it',async()=>{
  assertOriginalReceiptRestored();const times=pairTimes(),beforeInventory=sourceInventory();
  const warm=await ensureCandidate2NamingDependency({root:fixed});
  expect(warm.status).toBe('verified-existing');
  expect(warm.output).toEqual({file:'application.cjs',bytes:OUTPUT_BYTES,sha256:OUTPUT_SHA256});
  expect(fs.readFileSync(deployment.bundlePath)).toEqual(originalBundle);assertOriginalReceiptRestored();
  expect(pairTimes()).toEqual(times);expect(times.bundle).toBe(bundleMtime);
  expect(sourceInventory()).toEqual(beforeInventory);expect(beforeInventory).toEqual(originalInventory);
  summary.finalWarm={status:warm.status,output:warm.output,pairMtimesPreserved:true,exactOriginalReceiptRestored:true,protectedInventoryPreserved:true,invalidMutationCaseCount:mutations.length};
 },30000);
});
