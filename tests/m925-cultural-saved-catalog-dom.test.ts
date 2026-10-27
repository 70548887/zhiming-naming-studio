import {beforeAll,describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {build} from 'esbuild';
import {makeM921AppFixtures} from './helpers/m921-cultural-app-fixtures';

/** Isolated saved-catalog component + actual ReactDOM/Chromium. The transport
 * and saved read envelopes are fixtures around real comparator-produced display
 * DTOs. This does not execute or accept HTTP, Service, Store or App integration.
 */
const root=process.cwd(),scope='Actual saved-catalog component ReactDOM createRoot + StrictMode in isolated Chromium; fixture catalog/read transport only; no real HTTP, Service, Store or App acceptance.';
const caseDir=fs.mkdtempSync(path.resolve(process.env.M925_DOM_EVIDENCE_DIR??path.join(root,'..','dom-case'))+'-');
const ids=['default-off-strict-remount','opaque-page-navigation','detail-history-both-required','original-snapshot-history-source-reference','readonly-browsing-no-writes','cursor-expired-clears-all-state','unsupported-does-not-migrate','metadata-content-rejected','owner-context-late-replies','owner-current-and-rootbusy-guards','source-object-rebind','method-lease-pending-pages','method-lease-pending-details','method-lease-stale-handlers','close-unmount-late-replies','read-or-history-errors-keep-detail-empty','pending-original-dirty-guard','completed-original-record-dirty-open'];
type BrowserCase={id:string;status:'passed'|'failed';assertions:number;error?:string;calls:unknown[]};
type BrowserResult={scope:string;runtime:{userAgent:string;strictMode:boolean;reactRoot:string};cases:BrowserCase[];errors:string[];unhandled:string[];fatal?:string};
let result:BrowserResult;

beforeAll(async()=>{
 const seeds=makeM921AppFixtures();
 fs.writeFileSync(path.join(caseDir,'fixture-provenance.json'),JSON.stringify({scope,builder:'tests/helpers/m921-cultural-app-fixtures.ts',chart:'tests/fixtures/name-imagery-known-chart.json',comparator:'src/domain/qimen-cultural-comparison.ts',sessions:seeds.sessions.map(session=>({id:session.id,ownerProfileId:session.profileId})),snapshots:Object.fromEntries(Object.entries(seeds.snapshots).map(([id,value])=>[id,{snapshotDigest:value.snapshotDigest,candidateOrder:value.candidateOrder}])),actualHTTPExecuted:false,actualServiceExecuted:false,actualStoreExecuted:false,actualAppExecuted:false},null,2)+'\n');
 const compiled=await build({absWorkingDir:root,entryPoints:['tests/fixtures/m925-cultural-saved-catalog-dom.tsx'],outfile:path.join(caseDir,'renderer.js'),bundle:true,platform:'browser',format:'iife',target:'chrome144',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},metafile:true,logLevel:'silent'});
 const inputs=Object.keys(compiled.metafile!.inputs).map(file=>file.replaceAll('\\','/'));
 const forbidden=inputs.filter(file=>file.endsWith('src/renderer/main.tsx')||file.includes('m921-cultural-workflow-app-dom')||file.includes('session-catalog-app-harness')||file.startsWith('src/main/')||file.startsWith('src/domain/'));
 expect(forbidden,'Component harness must remain independent of App/main/Service/Store and Node fixture builder').toEqual([]);
 fs.writeFileSync(path.join(caseDir,'compile-report.json'),JSON.stringify({scope,inputs,forbiddenRuntimeInputs:forbidden,appEntryCompiled:false},null,2)+'\n');
 const escaped=JSON.stringify(seeds).replaceAll('<','\\u003c');
 fs.writeFileSync(path.join(caseDir,'index.html'),'<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\'; img-src data:;"><link rel="stylesheet" href="renderer.css"><title>M925 saved-catalog component DOM</title></head><body><p>'+scope+'</p><main id="root"></main><script>window.__M925_CATALOG_SEEDS__='+escaped+';</script><script src="renderer.js"></script></body></html>');
 fs.writeFileSync(path.join(caseDir,'electron-main.cjs'),String.raw`
const {app,BrowserWindow,session}=require('electron'),fs=require('node:fs'),path=require('node:path');
const directory=__dirname,logs=[];let finished=false;
app.setPath('userData',path.join(directory,'isolated-user-data'));app.disableHardwareAcceleration();
const fail=(error,code)=>{if(finished)return;finished=true;fs.writeFileSync(path.join(directory,'fatal.txt'),String(error.stack||error));fs.writeFileSync(path.join(directory,'browser.log'),logs.join('\n'));app.exit(code);};
const watchdog=setTimeout(()=>fail('M925 component Chromium harness timed out',3),60000);
app.whenReady().then(async()=>{
 session.defaultSession.webRequest.onBeforeRequest((details,done)=>{const local=details.url.startsWith('file:')||details.url.startsWith('data:');if(!local)logs.push('blocked-network '+details.url);done({cancel:!local});});
 const window=new BrowserWindow({show:false,width:1100,height:800,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 window.webContents.on('console-message',(_event,level,message)=>{if(logs.length<100)logs.push(String(level)+' '+String(message).slice(0,2000));});
 window.webContents.on('render-process-gone',(_event,details)=>fail('Renderer gone '+JSON.stringify(details),2));
 await window.loadFile(path.join(directory,'index.html'));
 const poll=setInterval(async()=>{try{const result=await window.webContents.executeJavaScript('window.__M925_CATALOG_RESULT__ || null');if(result){clearInterval(poll);clearTimeout(watchdog);finished=true;
  for(const row of result.cases||[]){fs.writeFileSync(path.join(directory,row.id+'.html'),'<!doctype html><meta charset="utf-8"><p>Fixture transport; saved-catalog component DOM evidence only.</p>'+row.html);delete row.html;}
  fs.writeFileSync(path.join(directory,'result.json'),JSON.stringify(result,null,2)+'\n');fs.writeFileSync(path.join(directory,'browser.log'),logs.join('\n')+'\n');window.destroy();app.exit(result.fatal?2:0);
 }}catch(error){clearInterval(poll);fail(error,4);}},25);
}).catch(error=>fail(error,5));
`);
 const electron=createRequire(import.meta.url)('electron') as string,env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const processResult=await new Promise<{code:number|null;stdout:string;stderr:string}>((resolve,reject)=>{
  const child=spawn(electron,[path.join(caseDir,'electron-main.cjs'),'--no-sandbox'],{cwd:caseDir,windowsHide:true,env,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';
  const watchdog=setTimeout(()=>{stderr+='\nM925 component process deadline exceeded';child.kill();},75000);
  child.stdout.on('data',chunk=>{stdout+=String(chunk);});child.stderr.on('data',chunk=>{stderr+=String(chunk);});child.once('error',error=>{clearTimeout(watchdog);reject(error);});child.once('close',code=>{clearTimeout(watchdog);resolve({code,stdout,stderr});});
 });
 fs.writeFileSync(path.join(caseDir,'process.log'),JSON.stringify(processResult,null,2)+'\n');
 expect(processResult.code,'Evidence '+caseDir+'; '+(fs.existsSync(path.join(caseDir,'fatal.txt'))?fs.readFileSync(path.join(caseDir,'fatal.txt'),'utf8'):processResult.stderr.slice(-2000))).toBe(0);
 result=JSON.parse(fs.readFileSync(path.join(caseDir,'result.json'),'utf8')) as BrowserResult;
 expect(result.fatal).toBeUndefined();expect(result.errors).toEqual([]);expect(result.unhandled).toEqual([]);expect(result.cases.map(row=>row.id)).toEqual(ids);
 console.info('M925_COMPONENT_DOM_EVIDENCE '+JSON.stringify({caseDir,scope:result.scope,runtime:result.runtime,cases:result.cases.map(row=>({id:row.id,status:row.status,assertions:row.assertions,error:row.error}))}));
},120000);

describe('M925 saved-catalog real component DOM with fixture public catalog/read transport; no App acceptance',()=>{
 for(const id of ids)it(id,()=>{const row=result.cases.find(value=>value.id===id);expect(row,'Missing component DOM case '+id).toBeDefined();expect(row?.error,'Evidence '+caseDir).toBeUndefined();expect(row?.status).toBe('passed');expect(row!.assertions).toBeGreaterThan(0);});
});
