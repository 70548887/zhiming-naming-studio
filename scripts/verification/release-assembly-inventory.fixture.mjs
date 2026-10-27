// Portable synthetic command-gate fixtures. No process, App, SQL checker or
// SQLite engine runs here. The database/reader payloads are byte fixtures only;
// this helper intentionally does not construct a passing SQL-domain proof.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';

const VERSION='1.0.38';
const PREFIX='release-assembly-inventory-';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const key=file=>process.platform==='win32'?path.resolve(file).toLowerCase():path.resolve(file);
const isReference=value=>value&&typeof value.file==='string'&&path.isAbsolute(value.file)&&/^[a-f0-9]{64}$/.test(value.sha256)&&Number.isSafeInteger(value.bytes)&&value.bytes>=0;

/**
 * Materialize the complete authenticated input/reference graph expected by
 * validateDesktop176SqlChildCapture, plus the exact two output inventories.
 * All receipts and event flags below are synthetic protocol test data.
 */
export async function createInventoryFixture({zeroByteArtifact=false}={}){
 const parent=fs.realpathSync.native(os.tmpdir());
 const root=fs.realpathSync.native(fs.mkdtempSync(path.join(parent,PREFIX)));
 let cleaned=false;
 const inside=input=>{
  const file=path.resolve(root,typeof input==='string'?input:input?.file??'');
  const relative=path.relative(root,file);
  if(!relative||relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw Error('Fixture path escapes its owned temporary root');
  return file;
 };
 const ref=input=>{const file=inside(input),bytes=fs.readFileSync(file);return{file,sha256:sha(bytes),bytes:bytes.length};};
 const write=(relative,value)=>{
  const file=inside(relative),bytes=typeof value==='string'||value instanceof Uint8Array?Buffer.from(value):Buffer.from(JSON.stringify(value)+'\n');
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const temporary=file+'.fixture-write-'+createHash('sha256').update(file).digest('hex').slice(0,12);
  fs.writeFileSync(temporary,bytes,{flag:'wx'});
  fs.renameSync(temporary,file);
  return ref(file);
 };
 const read=input=>JSON.parse(fs.readFileSync(inside(input),'utf8'));
 const update=(input,mutate)=>{const value=read(input);mutate(value);return write(inside(input),value);};
 const cleanup=()=>{
  if(cleaned)return;
  const stat=fs.lstatSync(root);
  if(path.dirname(root)!==parent||!path.basename(root).startsWith(PREFIX)||!stat.isDirectory()||stat.isSymbolicLink()||fs.realpathSync.native(root)!==root)throw Error('Fixture cleanup refuses an unowned or aliased root');
  fs.rmSync(root,{recursive:true,force:false});cleaned=true;
 };
 try{
  // These are byte-for-byte copies of the repository's real modules, never
  // replacement implementations or executable fixture-generated source.
  const source=(name,relative)=>write('source-tools/'+name,fs.readFileSync(new URL(relative,import.meta.url)));
  const checkerSources={
   bindings:source('bindings.mjs','./desktop176-sql-consumer.mjs'),
   entry:source('entry.mjs','./release-assemble-desktop176.mjs'),
   safePaths:source('safe-paths.mjs','./safe-paths.mjs'),
   semanticGate:source('semantic-gate.mjs','./release-evidence.mjs'),
  };
  const contract=write('source-tools/contract.fixture','Synthetic contract identity; never compiled or executed.');
  const bundle=write('reader/nonexecuted-reader.fixture','Synthetic reader identity; never imported or executed.');
  const wasm=write('reader/nonexecuted-wasm.fixture','Synthetic WASM identity; never instantiated.');
  const readerManifest=write('reader/manifest.json',{schema:'synthetic-inventory-reader/1',synthetic:true,bundle,wasm});
  const reader={manifest:readerManifest,bundle,wasm};
  const sourceManifest=write('source-tools/source-manifest.json',{
   schema:'naming-studio-desktop176-sql-source/1',applicationVersion:VERSION,workflowId:'desktop176/1',
   entryScript:checkerSources.entry,codeFiles:Object.values(checkerSources),reader,contract,
   nodePolicy:'caller-pins-executable',synthetic:true,
  });
  const sourceTools=[sourceManifest,...Object.values(checkerSources),contract];
  const frozenFiles=sourceTools;
  const inputFreeze=write('inputs/input-freeze.json',{
   schema:'naming-studio-test-input-freeze/1',version:VERSION,frozenAt:'2026-10-23T00:00:00.000Z',
   files:Object.fromEntries(frozenFiles.map(item=>[path.relative(root,item.file).replaceAll('\\','/'),item.sha256])),
   synthetic:true,
  });
  const buildCapture=write('inputs/build-capture.json',{
   schema:'naming-studio-command-capture/1',role:'buildAndPackage',version:VERSION,
   status:'completed',exitCode:0,sourceFreeze:inputFreeze,freezeAfter:inputFreeze,synthetic:true,
  });
  const databaseRef=write('user/customers.sqlite','Synthetic authenticated DB byte fixture; no SQLite/domain validation claimed.');
  const raw={schema:'naming-studio-desktop176-result/1',workflowId:'desktop176/1',appVersion:VERSION,mode:'Installed',phaseID:'resume',userData:path.join(root,'user'),synthetic:true};
  const rawRef=write('inputs/raw-result.json',raw);
  const processRef=write('inputs/process.json',{schema:'naming-studio-smoke-process/1',version:VERSION,result:rawRef,database:databaseRef,sourceFreeze:inputFreeze,buildCapture,synthetic:true});
  const postRef=write('inputs/post.json',{schema:'naming-studio-desktop176-process/1',stageProcess:processRef,result:rawRef,inputFreeze,synthetic:true});
  const proof={
   schema:'naming-studio-desktop176-sql/1',expectedVersion:VERSION,workflowId:'desktop176/1',mode:'Installed',phaseID:'resume',
   status:'synthetic-commandgate-only',synthetic:true,
   scope:'Only authenticated command capture and output inventory are under test; no SQL-domain proof.',
   database:{path:databaseRef.file,sha256Before:databaseRef.sha256,bytesBefore:databaseRef.bytes},
   fullSource:{sourceRoot:root,manifest:readerManifest,bundle,wasm,checkerSources},
  };
  const proofRef=write('strong-sql-proof.json',proof);
  const paths={sidecar:proofRef.file.replace(/\.json$/,'')+'.files',scratch:path.join(root,'strong-sql-scratch')};
  for(const directory of Object.values(paths))fs.mkdirSync(directory);
  write('strong-sql-proof.files/nested/rows.fixture','Synthetic sidecar output.');
  write('strong-sql-scratch/nested/scratch.fixture','Synthetic scratch output.');
  if(zeroByteArtifact)write('strong-sql-scratch/actual-empty.log',Buffer.alloc(0));
  const config={schema:'naming-studio-desktop176-sql-inputs/1',version:VERSION,workflowId:'desktop176/1',mode:'Installed',phaseID:'resume',
   projectRoot:root,userData:raw.userData,raw:rawRef,process:processRef,post:postRef,database:databaseRef,inputFreeze,buildCapture,
   reader,sourceRoot:root,dataDirectory:path.join(root,'data'),scratchDirectory:paths.scratch,synthetic:true};
  fs.mkdirSync(config.dataDirectory);
  const configRef=write('inputs/sql-config.json',config);
  const executable=write('runtime/nonexecuted-node.fixture','Synthetic executable identity; never launched.');
  const runtimeTools=[executable,...Object.values(reader)],dataInputs=[configRef,rawRef,processRef,postRef,databaseRef,inputFreeze,buildCapture];
  const graph=new Map(),pending=[inputFreeze,...sourceTools,...runtimeTools,...dataInputs];
  const visit=value=>{if(!value||typeof value!=='object')return;if(!Array.isArray(value)&&isReference(value))pending.push({file:value.file,sha256:value.sha256,bytes:value.bytes});for(const child of Object.values(value))if(child&&typeof child==='object')visit(child);};
  while(pending.length){const item=pending.pop(),id=key(item.file);if(graph.has(id))continue;graph.set(id,item);if(/\.json$/i.test(item.file)&&item.bytes>0)visit(read(item));}
  const command={executable,entryScript:checkerSources.entry,args:[checkerSources.entry.file,'--config',configRef.file,'--output',proofRef.file],cwd:root};
  const common={schema:'desktop176-sql-capture-input-snapshot/1',status:'verified',appVersion:VERSION,mode:'Installed',phaseID:'resume',inputFreeze,sourceManifest,
   files:frozenFiles,sourceTools,runtimeTools,dataInputs,referenceGraph:[...graph.values()],synthetic:true};
  const before={...structuredClone(common),observedAt:'2026-10-23T00:00:01.000Z',command:structuredClone(command),approvedOutputs:[proofRef.file],approvedArtifactDirectories:Object.values(paths)};
  const after={...structuredClone(common),observedAt:'2026-10-23T00:00:05.000Z'};
  const stdout=write('logs/sql.stdout','Synthetic recorded stdout; no process executed.'),stderr=write('logs/sql.stderr',Buffer.alloc(0));
  const tool={schema:'desktop176-frozen-tool-process/1',name:'strong-sql',status:'completed',naturalExit:true,pid:27601,exitCode:0,signal:null,launchError:null,
   ...structuredClone(command),startedAt:'2026-10-23T00:00:02.000Z',terminalAt:'2026-10-23T00:00:03.000Z',completedAt:'2026-10-23T00:00:04.000Z',
   spawnObserved:true,exitObserved:true,closeObserved:true,stdout,stderr,synthetic:true};
  const beforeRef=write('inputs/sql-before.json',before),afterRef=write('inputs/sql-after.json',after),toolRef=write('inputs/sql-tool-process.json',tool);
  const capture={schema:'naming-studio-command-capture/1',profile:'desktop176/1',version:VERSION,mode:'Installed',phaseID:'resume',role:'installedRuntime',status:'completed',
   sourceFreeze:inputFreeze,freezeAfter:inputFreeze,freezeError:null,command:{executable:executable.file,sha256:executable.sha256,bytes:executable.bytes,args:[...command.args],cwd:root,entryScript:checkerSources.entry,toolFiles:sourceTools},
   pid:tool.pid,startedAt:tool.startedAt,terminalAt:tool.terminalAt,completedAt:tool.completedAt,exitCode:0,signal:null,launchError:null,stdout,stderr,
   declaredOutputs:[proofRef.file],outputs:[proofRef],outputErrors:[],approvedArtifactDirectories:Object.values(paths),artifacts:[],artifactErrors:[],inputErrors:[],
   before:beforeRef,after:afterRef,runtimeTools,immutableInputs:dataInputs,toolProcessEvidence:toolRef,spawnObserved:true,exitObserved:true,closeObserved:true,synthetic:true};
  const refreshArtifacts=()=>{
   const artifacts=[],directories=Object.values(paths).slice();
   while(directories.length){const directory=directories.pop();for(const entry of fs.readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(directory,entry.name),stat=fs.lstatSync(file);if(stat.isSymbolicLink())throw Error('Fixture inventory refuses filesystem aliases');if(stat.isDirectory())directories.push(file);else if(stat.isFile())artifacts.push(ref(file));else throw Error('Fixture inventory requires ordinary leaves');}}
   capture.artifacts=artifacts.sort((a,b)=>a.file.localeCompare(b.file));return capture.artifacts;
  };
  refreshArtifacts();
  const manifest={schema:'release-assembly-inventory-fixture/1',syntheticOnly:true,AppLaunched:false,SQLCheckerExecuted:false,SQLiteInitialized:false,childSpawned:false,scope:'Affected child-capture artifact inventory and authenticated file I/O only.'};
  const childInput={root,capture,proof,proofRef,raw,rawRef,processRef,postRef,inputFreeze,buildCapture};
  return{root,childInput,capture,proof,proofRef,config,paths,inputs:[...graph.values()],databaseRef,manifest,write,read,ref,update,refreshArtifacts,cleanup};
 }catch(error){cleanup();throw error;}
}
