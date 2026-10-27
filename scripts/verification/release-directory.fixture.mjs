import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {execFileSync,spawnSync} from 'node:child_process';
import {freezeInputs,captureCommand,reference,CAPTURE_SCHEMA} from './release-capture.mjs';
import {assembleRelease,regressionCounts} from './release-assemble.mjs';
import {sha256} from './common.mjs';
import {publishRelease,prepareDocumentationReview} from './release-publication.mjs';
import {PHASE_SCHEMA,TEST_FREEZE_SCHEMA,phasedDocumentationDelta} from './release-phases.mjs';
import {verifyRelease} from './release.mjs';
import {verifyEvidence,CURRENT_RELEASE_PROFILE} from './release-evidence.mjs';
const require=createRequire(import.meta.url),asar=require('@electron/asar'),initSQL=require('sql.js');
const owned=fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(),'release-prepare-fixtures-')));
after(()=>fs.rmSync(owned,{recursive:true,force:true}));
const VERSION='9.9.9'; // Synthetic unit fixtures. Never emits a 1.0.35 record.
let seq=0;
const vitest=()=>({success:true,numFailedTests:0,numFailedTestSuites:0,numPendingTests:0,numTodoTests:0,numTotalTests:1,numPassedTests:1,testResults:[{name:'synthetic.test.ts',status:'passed',assertionResults:[{status:'passed'}]}]});
async function fixture({phased=false,missingDocument=false,releaseDirectory}={}){
 const artifactDirectory=releaseDirectory??'release';
 const root=path.join(owned,'case-'+(++seq));fs.mkdirSync(root);
 const abs=p=>path.join(root,p),write=(p,v)=>{const f=abs(p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,typeof v==='string'||v instanceof Uint8Array?v:JSON.stringify(v,null,2)+'\n');return f;};
 const pkg={name:'synthetic-naming-fixture',version:VERSION,type:'module',main:'dist-electron/main.cjs',dependencies:{},build:{files:['dist-electron/**/*','data/**/*','package.json',...phased?['README.md','docs/**/*']:[]]}};
 write('package.json',pkg);write('package-lock.json',{});write('index.html','fixture');write('README.md','fixture');write('main.js','fixture main');write('data/input.json',{fictional:true});write('scripts/helper.mjs','// frozen fictional helper');write('node_modules/vitest/vitest.mjs','// not executed by assembly fixture');
 const source='// synthetic main source';write('src/main.ts',source);write('dist-electron/main.cjs','// synthetic bundle');write('dist-electron/main.cjs.map',{version:3,sources:['../src/main.ts'],sourcesContent:[source]});
 if(phased){write('docs/CURRENT-STATUS.md','Prior state; new release acceptance is pending.');write('docs/GUIDE.md','Immutable fixture guide.');}
 write('npm-cli.js','// fictional npm entry, never executed');
 const freeze=await freezeInputs({root,version:VERSION,output:'.local/freeze.json',extraInputs:['node_modules/vitest/vitest.mjs','npm-cli.js'],phase:phased?'test':undefined});
 const packRoot=abs('.local/asar-input');fs.mkdirSync(packRoot,{recursive:true});fs.writeFileSync(path.join(packRoot,'package.json'),JSON.stringify(pkg));
 const payloadFiles=['data/input.json','dist-electron/main.cjs','dist-electron/main.cjs.map',...phased?['README.md','docs/CURRENT-STATUS.md','docs/GUIDE.md']:[]].filter(file=>!missingDocument||file!=='docs/CURRENT-STATUS.md');for(const file of payloadFiles){fs.mkdirSync(path.dirname(path.join(packRoot,file)),{recursive:true});fs.copyFileSync(abs(file),path.join(packRoot,file));}
 const built=abs(artifactDirectory+'/win-unpacked/resources/app.asar');fs.mkdirSync(path.dirname(built),{recursive:true});await asar.createPackage(packRoot,built);
 const installed=write('.local/install/resources/app.asar',fs.readFileSync(built)),installer=write(artifactDirectory+'/NamingStudio-9.9.9-Setup.exe','synthetic EXE bytes'),app=write('.local/install/fixture.exe','synthetic app bytes');
 write(artifactDirectory+'/win-unpacked/fixture.exe','synthetic app bytes');
 const installerRef=await reference(root,installer),builtRef=await reference(root,built),installedRef=await reference(root,installed);
 const snapshot={id:'s1',profileId:'p1',profile:{id:'p1',surname:'林'},candidates:[{givenName:'安宁'}]},sqlText=JSON.stringify(snapshot);
 const snapshotFile=write('.local/runtime/session.json',snapshot),resultFile=write('.local/runtime/result.json',{appVersion:VERSION});
 const pdf=write('.local/runtime/report.pdf','%PDF-1.7\nsynthetic inventory fixture');
 const SQL=await initSQL({locateFile:n=>require.resolve('sql.js/dist/'+n)}),db=new SQL.Database();
 db.run('CREATE TABLE profiles(id TEXT,json TEXT); CREATE TABLE sessions(id TEXT,json TEXT); CREATE TABLE revisions(id TEXT,json TEXT); CREATE TABLE knowledge_archives(sha256 TEXT,version TEXT,pack BLOB);');
 db.run('INSERT INTO profiles VALUES (?,?)',['p1',JSON.stringify(snapshot.profile)]);db.run('INSERT INTO sessions VALUES (?,?)',['s1',sqlText]);db.run('INSERT INTO revisions VALUES (?,?)',['r1',sqlText]);
 const archive=Buffer.from('synthetic archive'),archiveSha=sha256(archive),archiveVersion=archiveSha.slice(0,12);db.run('INSERT INTO knowledge_archives VALUES (?,?,?)',[archiveSha,archiveVersion,archive]);
 const database=write('.local/runtime/user/customers.sqlite',db.export());db.close();const dbRef=await reference(root,database);
 const fields=['name','version','type','main','dependencies'],summary={ok:true,failureCount:0,workspaceFilesCompared:payloadFiles.length,embeddedSourcesCompared:1,sourceLocksChecked:1,sourceAggregatesChecked:1,productionFieldsChecked:fields.length,runtimeFilesCompared:2};
 const runtimeFiles=[];for(const p of ['resources/app.asar','fixture.exe'])runtimeFiles.push({path:p,builtSha256:sha256(fs.readFileSync(abs(artifactDirectory+'/win-unpacked/'+p))),installedSha256:sha256(fs.readFileSync(abs('.local/install/'+p))),equal:true});
 const packageFile=write('.local/raw-package.json',{mode:'installed-complete-payload',expectedVersion:VERSION,ok:true,failures:[],summary,installer:{path:installer,sha256:installerRef.sha256},asar:{built,builtSha256:builtRef.sha256,installed,installedSha256:installedRef.sha256},workspaceFiles:payloadFiles.map(p=>({path:p,workspaceSha256:sha256(fs.readFileSync(abs(p))),packagedSha256:sha256(fs.readFileSync(abs(p))),equal:true})),frozenSources:{embeddedSources:[{path:'src/main.ts',sha256:sha256(source)}]},runtimeFiles,packageFields:fields.map(field=>({field,equal:true}))});
 const snapshotRef=await reference(root,snapshotFile),pdfRef=await reference(root,pdf),resultRef=await reference(root,resultFile);
 const sqlFile=write('.local/raw-sql.json',{mode:'actual-installed-SQL-and-sidecar',expectedVersion:VERSION,ok:true,runtimeVerified:true,failures:[],summary:{ok:true,failureCount:0,actualSessionBindings:1,pdfCount:1},database:{path:database,sha256Before:dbRef.sha256,sha256After:dbRef.sha256,unchanged:true,profiles:1,sessions:1,revisions:1,archives:1},bindings:[{sessionId:'s1',snapshotFile,snapshotSha256:snapshotRef.sha256,sqlJsonSha256:sha256(sqlText),completeCurrentSqlJsonEqual:true}],historyBindings:[{revisionId:'r1',sqlJsonSha256:sha256(sqlText),completeHistorySqlJsonEqual:true}],archiveBindings:[{sha256:archiveSha,version:archiveVersion,contentHashExact:true}],pdfs:[{path:pdf,bytes:pdfRef.bytes,sha256:pdfRef.sha256}],resultFile,resultSha256:resultRef.sha256,runtimeResultSha256:resultRef.sha256});
 // Synthetic unit milestones share one causally ordered millisecond; no actual installer or app is launched.
 const now=new Date().toISOString();
 const runtimeFile=write('.local/raw-runtime.json',{version:VERSION,mode:'Installed',status:'passed',exitCode:0,started:now,terminalAt:now,completed:now,normalProcessesTerminated:false,normalCustomerDataUsed:false,installedDir:path.dirname(app),output:path.dirname(resultFile),app:{path:app,pid:12345,startedAt:now,userData:path.dirname(database),electronRunAsNodePresent:false},installer:{path:installer,pid:23456,startedAt:now,terminalAt:now,completedAt:now,exitCode:0,sha256:installerRef.sha256},sqlVerification:sqlFile,result:resultFile,packageVerificationPostRuntime:packageFile});
 const regressionFile=write('.local/vitest.json',vitest());
 const exe={file:process.execPath,...await (await import('./common.mjs')).fileIdentity(process.execPath)},tool=await reference(root,'scripts/helper.mjs');
 const captures={};
 for(const role of ['fullRegression','buildAndPackage','package','installedRuntime','runtimeRecord']){
  const stdout=write('.local/'+role+'.stdout.log',role==='buildAndPackage'?`${pkg.name}@${VERSION} package\ntsc --noEmit\nvite v6.0 building for production\nbuilt in 1s\ntarget=nsis\nNamingStudio-${VERSION}-Setup.exe`:'synthetic fixture log'),stderr=write('.local/'+role+'.stderr.log','');
  const file=role==='fullRegression'?regressionFile:role==='package'?packageFile:role==='installedRuntime'?sqlFile:role==='runtimeRecord'?runtimeFile:null;
  const args=role==='fullRegression'?[abs('node_modules/vitest/vitest.mjs'),'run','--reporter=default','--reporter=json','--outputFile='+regressionFile]:role==='buildAndPackage'?[abs('npm-cli.js'),'run','package',...releaseDirectory===undefined?[]:['--','--config.directories.output='+releaseDirectory]]:['fixture-helper'];
  captures[role]=write('.local/'+role+'-capture.json',{schema:CAPTURE_SCHEMA,status:'completed',role,version:VERSION,sourceFreeze:freeze,freezeAfter:freeze,freezeError:null,command:{executable:exe.file,bytes:exe.bytes,sha256:exe.sha256,args,cwd:root,toolFiles:[tool],entryScript:['fullRegression','buildAndPackage'].includes(role)?await reference(root,args[0]):null},pid:34567,startedAt:now,completedAt:now,exitCode:0,signal:null,launchError:null,stdout:await reference(root,stdout),stderr:await reference(root,stderr),declaredOutputs:file?[file]:[],outputs:file?[await reference(root,file)]:[],artifacts:role==='buildAndPackage'?[installerRef,builtRef]:[]});
 }
 const config={schema:phased?(releaseDirectory===undefined?'naming-studio-release-execution/2':'naming-studio-release-execution/3'):(releaseDirectory===undefined?'naming-studio-release-assembly/1':'naming-studio-release-assembly/2'),version:VERSION,...releaseDirectory===undefined?{}:{releaseDirectory},...phased?{inputFreeze:freeze}:{sourceFreeze:freeze},installer,builtAsar:built,installedAsar:installed,fullRegression:{file:regressionFile,commandCapture:captures.fullRegression},buildAndPackage:{commandCapture:captures.buildAndPackage},package:{file:packageFile,commandCapture:captures.package},installedRuntime:{file:sqlFile,commandCapture:captures.installedRuntime},runtimeRecord:{file:runtimeFile,commandCapture:captures.runtimeRecord},remaining:['Synthetic unit fixture only.']};
 const update=(p,mutate)=>{const value=JSON.parse(fs.readFileSync(p,'utf8'));mutate(value);write(path.relative(root,p),value);};
 const rebind=async(role)=>{const c=config[role];if(c.file)update(c.commandCapture,v=>{v.outputs=[{file:c.file,bytes:fs.statSync(c.file).size,sha256:sha256(fs.readFileSync(c.file))}];});};
 return {root,config,write,abs,update,rebind,captures,database,packageFile,sqlFile,runtimeFile,regressionFile,freeze};
}

export {fixture,VERSION};
