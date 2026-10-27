import {beforeAll,describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {build} from 'esbuild';
import {makeM925AppFixtures} from './helpers/m925-catalog-integration-fixtures';

const root=process.cwd(),evidenceBase=path.resolve('.local/m925-cultural-catalog-wiring');
fs.mkdirSync(evidenceBase,{recursive:true});
const caseDir=fs.mkdtempSync(path.join(evidenceBase,'actual-app-dom-'));
const ids=['default-and-remount-have-zero-catalog-calls','metadata-never-grants-source-authority','record-waits-for-real-read-and-history-before-showing-snapshot','cross-session-record-opens-actual-source-session-only-on-explicit-action','open-original-session-preserves-existing-dirty-confirmation','pending-source-session-read-preserves-new-same-owner-date','owner-change-discards-late-directory-and-details','cursor-navigation-retires-pending-old-record','expired-cursor-clears-old-data-and-restarts-only-explicitly','unsupported-storage-does-not-migrate-or-fabricate-empty-success','foreign-metadata-and-injected-authority-are-rejected','foreign-detail-id-or-owner-never-shows-saved-snapshot','historical-selection-reads-exact-original-revision','read-only-storage-can-browse-original-record-with-zero-writes','missing-catalog-api-stays-explicit-and-produces-no-fake-record'];
type BrowserResult={scope:string;runtime:{userAgent:string;strictMode:boolean};cases:{id:string;status:'passed'|'failed';assertions:number;error?:string}[];errors:string[];unhandled:string[];fatal?:string};
let result:BrowserResult;

beforeAll(async()=>{
 const seeds=makeM925AppFixtures();
 fs.writeFileSync(path.join(caseDir,'fixture-provenance.json'),JSON.stringify({scope:'Actual App + native DOM; fixture bootstrap, metadata catalog and original record read bridge only.',chart:'tests/fixtures/name-imagery-known-chart.json',comparator:'src/domain/qimen-cultural-comparison.ts',sessions:seeds.sessions.map(session=>({id:session.id,profileId:session.profileId,reviewToken:session.reviewToken,candidateIds:session.candidates.map(value=>value.id)})),snapshots:Object.fromEntries(Object.entries(seeds.snapshots).map(([id,snapshot])=>[id,{snapshotDigest:snapshot.snapshotDigest,candidateOrder:snapshot.candidateOrder}])),realServiceExecuted:false,realStoreExecuted:false},null,2));
 let appEntryStripped=false;
 const compiled=await build({absWorkingDir:root,entryPoints:['tests/fixtures/m925-catalog-integration-dom.tsx'],outfile:path.join(caseDir,'renderer.js'),bundle:true,platform:'browser',format:'iife',target:'chrome144',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},metafile:true,logLevel:'silent',plugins:[{name:'actual-app-test-entry-only',setup(builder){builder.onResolve({filter:/^m925-catalog-integration-app$/},()=>({path:path.join(root,'src/renderer/main.tsx'),namespace:'m925-catalog-integration-app'}));builder.onLoad({filter:/.*/,namespace:'m925-catalog-integration-app'},async args=>{
  const source=fs.readFileSync(args.path,'utf8'),trimmed=source.replace(/createRoot\(document\.getElementById\('root'\)!\)\.render\([\s\S]*$/,'');
  if(trimmed===source)throw Error('Actual App auto-start line was not found; test must not fake App or React hooks');appEntryStripped=true;return{contents:trimmed+'\nexport {App};',loader:'tsx',resolveDir:path.dirname(args.path)};
 });}}]});
 expect(appEntryStripped).toBe(true);expect(Object.keys(compiled.metafile!.inputs).some(file=>file.replaceAll('\\','/').endsWith('src/renderer/main.tsx'))).toBe(true);
 fs.writeFileSync(path.join(caseDir,'compile-report.json'),JSON.stringify({appEntryStripped,scope:'Only production createRoot auto-start omitted. Full App and dependencies compiled unchanged; React/ReactDOM/hooks are not mocked.',inputs:Object.keys(compiled.metafile!.inputs)},null,2));
 const escaped=JSON.stringify(seeds).replaceAll('<','\\u003c');
 fs.writeFileSync(path.join(caseDir,'index.html'),'<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\'; img-src data:;"><link rel="stylesheet" href="renderer.css"><title>M925 actual App native DOM</title></head><body><div id="root"></div><script>window.__M925_CATALOG_APP_SEEDS__='+escaped+';</script><script src="renderer.js"></script></body></html>');
 fs.writeFileSync(path.join(caseDir,'electron-main.cjs'),String.raw`
const {app,BrowserWindow,session}=require('electron'),fs=require('node:fs'),path=require('node:path');
const directory=__dirname,logs=[];app.setPath('userData',path.join(directory,'isolated-user-data'));app.disableHardwareAcceleration();
let finished=false;const fail=(error,code)=>{if(finished)return;finished=true;fs.writeFileSync(path.join(directory,'fatal.txt'),String(error.stack||error));fs.writeFileSync(path.join(directory,'browser.log'),logs.join('\n'));app.exit(code);};
const watchdog=setTimeout(()=>fail('Actual App DOM timed out, including initial load/React effect flush',3),60000);
app.whenReady().then(async()=>{
 session.defaultSession.webRequest.onBeforeRequest((details,done)=>{const local=details.url.startsWith('file:')||details.url.startsWith('data:');if(!local)logs.push('blocked-network '+details.url);done({cancel:!local});});
 const window=new BrowserWindow({show:false,width:1280,height:900,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 window.webContents.on('console-message',(_event,level,message)=>{if(logs.length<100){const line=String(level)+' '+String(message).slice(0,2000);logs.push(line);fs.appendFileSync(path.join(directory,'browser-live.log'),line+'\n');}});window.webContents.on('render-process-gone',(_event,details)=>fail('Renderer gone '+JSON.stringify(details),2));
 await window.loadFile(path.join(directory,'index.html'));const started=Date.now();const poll=setInterval(async()=>{try{const result=await window.webContents.executeJavaScript('window.__M925_CATALOG_APP_RESULT__ || null');if(result){clearInterval(poll);finished=true;for(const row of result.cases||[]){fs.writeFileSync(path.join(directory,row.id+'.html'),'<!doctype html><meta charset="utf-8">'+row.html);delete row.html;}fs.writeFileSync(path.join(directory,'result.json'),JSON.stringify(result,null,2));fs.writeFileSync(path.join(directory,'browser.log'),logs.join('\n'));window.destroy();app.exit(result.fatal?2:0);}else if(Date.now()-started>90000){clearInterval(poll);fail('Actual App DOM timed out',3);}}catch(error){clearInterval(poll);fail(error,4);}},25);
}).catch(error=>fail(error,5));
`);
 const electron=createRequire(import.meta.url)('electron') as string,env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const processResult=await new Promise<{code:number|null;stdout:string;stderr:string}>((resolve,reject)=>{const child=spawn(electron,[path.join(caseDir,'electron-main.cjs'),'--no-sandbox'],{cwd:caseDir,windowsHide:true,env,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';const watchdog=setTimeout(()=>{stderr+='\nM925 harness process deadline exceeded';child.kill();},75000);child.stdout.on('data',chunk=>{stdout+=String(chunk);});child.stderr.on('data',chunk=>{stderr+=String(chunk);});child.once('error',error=>{clearTimeout(watchdog);reject(error);});child.once('close',code=>{clearTimeout(watchdog);resolve({code,stdout,stderr});});});
 fs.writeFileSync(path.join(caseDir,'process.log'),JSON.stringify(processResult,null,2));
 expect(processResult.code,'Evidence '+caseDir+'; '+(fs.existsSync(path.join(caseDir,'fatal.txt'))?fs.readFileSync(path.join(caseDir,'fatal.txt'),'utf8'):processResult.stderr.slice(-2000))).toBe(0);
 result=JSON.parse(fs.readFileSync(path.join(caseDir,'result.json'),'utf8')) as BrowserResult;
 expect(result.fatal).toBeUndefined();expect(result.cases.map(row=>row.id)).toEqual(ids);expect(result.errors).toEqual([]);expect(result.unhandled).toEqual([]);
 console.info('M925_ACTUAL_APP_DOM_EVIDENCE '+JSON.stringify({caseDir,scope:result.scope,runtime:result.runtime,cases:result.cases.map(row=>({id:row.id,status:row.status,assertions:row.assertions,error:row.error}))}));
},120000);

describe('M925 cultural saved catalog actual App and native DOM with fixture transport',()=>{
 for(const id of ids)it(id,()=>{const row=result.cases.find(value=>value.id===id);expect(row,'Missing DOM case '+id).toBeDefined();expect(row?.error,'Evidence '+caseDir).toBeUndefined();expect(row?.status).toBe('passed');expect(row!.assertions).toBeGreaterThan(0);});
});
