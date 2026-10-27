/** One actual public owner replay on the same frozen fixture; no generation. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {performance} from 'node:perf_hooks';
import initSqlJs from 'sql.js';
import {bindCompactCustomerDatabase} from '../src/main/compact-customer-store';
import {readCandidate2NativeEnvelopeV1} from '../src/main/candidate2-native-storage-v1';
import {createCandidate2GenerationAdoptionV2} from '../src/main/candidate2-generation-adoption-v2';
const [rootArg,id]=process.argv.slice(2);if(!rootArg||!id||!/^[ab][12]$/.test(id))throw Error('case root and a1/b1/b2/a2 required');
const root=path.resolve(rootArg),directory=path.join(root,'runs',id);if(fs.existsSync(directory))throw Error('Never overwrite run');fs.mkdirSync(directory,{recursive:true});
const hash=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex'),atomic=(name:string,value:unknown)=>{const file=path.join(directory,name);fs.writeFileSync(file+'.tmp',JSON.stringify(value,null,2)+'\n');fs.renameSync(file+'.tmp',file);};
const fixture=JSON.parse(fs.readFileSync(path.join(root,'official-fixture.json'),'utf8')),startedUtc=new Date().toISOString();
let phase='inputs',database:Awaited<ReturnType<typeof initSqlJs>>['Database']['prototype']|undefined,status='failed',error:unknown,verifyCallCount=0;
const phases:unknown[]=[];
function mark(name:string,extra:Record<string,unknown>={}){phase=name;const value={phase,runId:id,pid:process.pid,utc:new Date().toISOString(),...extra};atomic('progress.json',value);process.send?.(value);process.stdout.write(JSON.stringify(value)+'\n');}
async function timed<T>(name:string,body:()=>T|Promise<T>){mark(name);const before=performance.now(),cpu=process.cpuUsage();const value=await body();phases.push({phase:name,elapsedMs:performance.now()-before,cpu:process.cpuUsage(cpu)});return value;}
try{
 for(const entry of fixture.resources){const bytes=fs.readFileSync(path.join(fixture.root,entry.path));if(bytes.length!==entry.bytes||hash(bytes)!==entry.sha256)throw Error('Fixture resource drift '+entry.path);}
 const dbBytes=fs.readFileSync(fixture.database.copy);if(hash(dbBytes)!==fixture.database.sha256)throw Error('Frozen actual DB changed');
 const SQL=await initSqlJs({locateFile:()=>createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm')});database=new SQL.Database(new Uint8Array(dbBytes));bindCompactCustomerDatabase(database);
 const row=database.exec('SELECT json FROM sessions ORDER BY rowid')[0]?.values;if(row?.length!==1||typeof row[0][0]!=='string')throw Error('One actual saved C2 session required');
 const envelope=await timed('public-native-envelope',()=>readCandidate2NativeEnvelopeV1(database!,JSON.parse(row[0][0] as string)));
 if(envelope.sourceBlobs.length!==276||envelope.session.candidates.length!==12)throw Error('Saved scope changed');
 const owner=await timed('create-owner',()=>createCandidate2GenerationAdoptionV2({applicationBundlePath:fixture.applicationBundlePath,assetDir:fixture.assetDir,dataDir:fixture.dataDir,consumerPublicationDir:fixture.consumerPublicationDir,mechanics:envelope.mechanics}));
 mark('verify-start');const before=performance.now(),cpu=process.cpuUsage();verifyCallCount++;
 const verified=owner.verifySaved(envelope),elapsedMs=performance.now()-before,cpuUsed=process.cpuUsage(cpu);phases.push({phase:'owner.verifySaved',elapsedMs,cpu:cpuUsed});mark('verify-complete',{elapsedMs});
 if(verified.status!=='verified-envelope-replay'||verified.schema!=='candidate2-adoption-replay/2'||verified.canSave!==false||verified.storage!=='not-connected'||verified.runtimeFromArchiveExecutable!==false||JSON.stringify(verified.session)!==JSON.stringify(envelope.session))throw Error('Authority/session semantics changed');
  atomic('full-return.json',verified);
 atomic('verification.json',{schema:verified.schema,status:verified.status,verification:verified.verification,sessionSha256:hash(JSON.stringify(verified.session)),inputEnvelopeSha256:hash(JSON.stringify(envelope)),generationAuthority:verified.generationAuthority,canSave:verified.canSave,storage:verified.storage,runtimeFromArchiveExecutable:verified.runtimeFromArchiveExecutable});
 for(const entry of fixture.resources){const bytes=fs.readFileSync(path.join(fixture.root,entry.path));if(bytes.length!==entry.bytes||hash(bytes)!==entry.sha256)throw Error('Resource changed after replay '+entry.path);}
 if(hash(fs.readFileSync(fixture.database.copy))!==fixture.database.sha256||hash(fs.readFileSync(fixture.database.original))!==fixture.database.sha256)throw Error('Read-only database changed');status='passed';
}catch(caught){error=caught instanceof Error?caught.stack:String(caught);process.exitCode=1;}
finally{database?.close();atomic('run.json',{schema:'m938-actual-saved-replay-once/1',id,pid:process.pid,startedUtc,finishedUtc:new Date().toISOString(),status,failedPhase:status==='failed'?phase:null,error,verifyCallCount,phases,databaseSha256:fixture.database.sha256,resourcesRehashed:fixture.resources.length});}
