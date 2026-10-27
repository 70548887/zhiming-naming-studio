/** Diagnostic-only real Store restore workload. No validation is substituted. */
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join,resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
import {Session} from 'node:inspector';
import {Store} from '../src/main/store';

const [caseRoot,runId,profileFlag]=process.argv.slice(2);
if(!caseRoot||!runId||!/^[a-z0-9-]+$/i.test(runId))throw Error('caseRoot and safe runId required');
const root=resolve(caseRoot),directory=join(root,'runs',runId);
if(existsSync(directory))throw Error('Never overwrite a previous run');
mkdirSync(directory,{recursive:true});
const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const atomic=(name:string,value:unknown)=>{
 const file=join(directory,name),temporary=file+'.tmp';
 writeFileSync(temporary,JSON.stringify(value,null,2)+'\n');renameSync(temporary,file);
};
const startedUtc=new Date().toISOString(),started=performance.now();
const record:{schema:string;runId:string;pid:number;startedUtc:string;profile:boolean;inputSha256?:string;completed:unknown[];failedPhase?:string;error?:string;status?:string;finishedUtc?:string;elapsedMs?:number}={schema:'m925-real-cultural-restore-run/1',runId,pid:process.pid,startedUtc,profile:profileFlag==='profile',completed:[]};
let current='fixture',store:Store|undefined;
function post(session:Session,method:string):Promise<Record<string,unknown>>{
 return new Promise((accept,reject)=>session.post(method as 'Profiler.enable',(error,value)=>error?reject(error):accept(value as Record<string,unknown>)));
}
async function phase<T>(name:string,body:()=>T|Promise<T>):Promise<T>{
 current=name;const inspector=record.profile?new Session():undefined;
 if(inspector){inspector.connect();await post(inspector,'Profiler.enable');await post(inspector,'Profiler.start');}
 const before=performance.now(),cpuBefore=process.cpuUsage();
 try{
  const result=await body();const elapsedMs=performance.now()-before,cpu=process.cpuUsage(cpuBefore);
  record.completed.push({phase:name,elapsedMs,cpuUserUs:cpu.user,cpuSystemUs:cpu.system});
  atomic('progress.json',record);process.stdout.write(JSON.stringify({runId,phase:name,elapsedMs})+'\n');return result;
 }finally{
  if(inspector){try{const value=await post(inspector,'Profiler.stop');atomic(name+'.cpuprofile',value.profile);}finally{inspector.disconnect();}}
 }
}
try{
 const manifest=JSON.parse(readFileSync(join(root,'input-manifest.json'),'utf8'));
 const backup=new Uint8Array(readFileSync(join(root,'fixture','synthetic-three-revisions.nsbk')));
 record.inputSha256=hash(backup);if(record.inputSha256!==manifest.fixtureSha256)throw Error('Frozen fixture bytes changed');
 for(const entry of manifest.resources){const bytes=readFileSync(join(root,'resources',entry.path));if(bytes.length!==entry.bytes||hash(bytes)!==entry.sha256)throw Error('Frozen resource drift: '+entry.path);}
 const wasm=createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm');
 store=await phase('init',()=>new Store(join(directory,'customer'),join(root,'resources','data'),wasm).init());
 const original=readFileSync(join(directory,'customer','customers.sqlite'));
 const plan=await phase('prepare',()=>store!.prepareCustomerRestore(backup));
 if(plan.inputCounts.culturalRevisions!==3)throw Error('Expected exactly three genuine cultural revisions');
 if(!readFileSync(join(directory,'customer','customers.sqlite')).equals(original))throw Error('Prepare changed target bytes');
 const result=await phase('commit',()=>store!.commitCustomerRestore(plan.planId,plan.currentDiskHash));
 if(result.status!=='committed'||result.restored.culturalRevisions!==3||!readFileSync(result.preimagePath).equals(original))throw Error('Real commit/preimage assertion failed');
 atomic('result.json',{plan,result,preimageSha256:hash(original),installedSha256:hash(readFileSync(join(directory,'customer','customers.sqlite')))});
 record.status='passed';
}catch(error){record.status='failed';record.failedPhase=current;record.error=error instanceof Error?(error.stack??error.message):String(error);process.exitCode=1;}
finally{
 try{store?.db.close();}catch(error){record.status='failed';record.failedPhase='close';record.error=String(error);process.exitCode=1;}
 record.finishedUtc=new Date().toISOString();record.elapsedMs=performance.now()-started;atomic('run.json',record);
 process.stdout.write(JSON.stringify(record)+'\n');
}
