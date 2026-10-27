import {beforeAll,describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {build} from 'esbuild';
import {createM928RealFixtures} from './helpers/m928-semantic-character-fixtures';

const root=process.cwd();
const evidenceDir=fs.mkdtempSync(path.join(process.env.M928_TEST_EVIDENCE_DIR??'D:/Codex-NamingStudio-Evidence/m928-semantic-evidence-view','dom-'));
const scope='Isolated real Electron Chromium + ReactDOM StrictMode. Actual M923 producer fixtures. Display consistency only; no real transport, App, Store or customer database acceptance.';
type BrowserCase={id:string;status:'passed'|'failed';assertions:number;error?:string};
type BrowserResult={scope:string;runtime:{userAgent:string;strictMode:boolean;reactRoot:string};cases:BrowserCase[];apiReads:number;networkCalls:string[];fatal?:string};
let result:BrowserResult;
const ids=['strict-mount-real-local-ai','separate-meanings-and-receipt-scope','native-keyboard-details-accessibility','owner-switch-old-association-no-name-leak','malformed-retired-and-mismatch-no-leak','read-only-no-api-network-or-score-controls'];

beforeAll(async()=>{
 const {seeds,observations}=createM928RealFixtures();
 fs.writeFileSync(path.join(evidenceDir,'fixture-provenance.json'),JSON.stringify({scope,observations,realTransportAuthenticated:false,realAppExecuted:false,storeExecuted:false,customerDatabaseOpened:false},null,2)+'\n');
 const built=await build({absWorkingDir:root,entryPoints:['tests/fixtures/m928-semantic-character-evidence-dom.tsx'],outfile:path.join(evidenceDir,'renderer.js'),bundle:true,platform:'browser',format:'iife',target:'chrome144',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},metafile:true,logLevel:'silent'});
 const bundledInputs=Object.keys(built.metafile!.inputs);
 expect(bundledInputs.filter(input=>/^(?:src\/(?:main|domain)\/|tests\/helpers\/|data\/)/.test(input)),'Renderer must consume serialized public samples without producer or data loaders').toEqual([]);
 fs.writeFileSync(path.join(evidenceDir,'bundle-inputs.json'),JSON.stringify(bundledInputs,null,2)+'\n');
 const escaped=JSON.stringify(seeds).replaceAll('<','\\u003c');
 fs.writeFileSync(path.join(evidenceDir,'index.html'),'<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\'; img-src data:;"><link rel="stylesheet" href="renderer.css"><title>M928 isolated component DOM tests</title></head><body><main id="root"></main><script>window.__M928_SEEDS__='+escaped+';</script><script src="renderer.js"></script></body></html>');
 const main=String.raw`const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const directory=__dirname,logs=[],network=[];
app.setPath('userData',path.join(directory,'isolated-user-data'));
app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 session.defaultSession.webRequest.onBeforeRequest((details,done)=>{const local=details.url.startsWith('file:')||details.url.startsWith('data:');if(!local)network.push(details.url);done({cancel:!local});});
 const window=new BrowserWindow({show:false,width:1180,height:850,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 window.webContents.on('console-message',(_event,level,message)=>logs.push(String(level)+' '+message));
 window.webContents.on('render-process-gone',(_event,details)=>{fs.writeFileSync(path.join(directory,'fatal.txt'),'Renderer gone '+JSON.stringify(details));app.exit(2);});
 await window.loadFile(path.join(directory,'index.html'));
 const started=Date.now();let handled=0,busy=false;
 const poll=setInterval(async()=>{if(busy)return;busy=true;try{
  const state=await window.webContents.executeJavaScript('({result:window.__M928_RESULT__||null,key:window.__M928_KEYBOARD_REQUEST__||null})');
  if(state.key&&state.key.sequence>handled){handled=state.key.sequence;window.webContents.focus();const code=state.key.key==='Space'?'Space':state.key.key;window.webContents.sendInputEvent({type:'keyDown',keyCode:code});if(state.key.key==='Enter'||state.key.key==='Space')window.webContents.sendInputEvent({type:'char',keyCode:state.key.key==='Enter'?'\r':' '});window.webContents.sendInputEvent({type:'keyUp',keyCode:code});await window.webContents.executeJavaScript('window.__M928_KEYBOARD_ACK__='+handled);}
  if(state.result){clearInterval(poll);for(const row of state.result.cases||[]){fs.writeFileSync(path.join(directory,row.id+'.html'),'<!doctype html><meta charset="utf-8"><p>Read-only presentation evidence.</p>'+row.html);delete row.html;}
   fs.writeFileSync(path.join(directory,'result.json'),JSON.stringify(state.result,null,2)+'\n');fs.writeFileSync(path.join(directory,'browser.log'),logs.join('\n')+'\n');fs.writeFileSync(path.join(directory,'network.json'),JSON.stringify(network,null,2)+'\n');window.destroy();app.exit(state.result.fatal?2:0);}
  else if(Date.now()-started>90000){clearInterval(poll);fs.writeFileSync(path.join(directory,'fatal.txt'),'Browser harness timed out');app.exit(3);}
 }catch(error){clearInterval(poll);fs.writeFileSync(path.join(directory,'fatal.txt'),String(error.stack||error));app.exit(4);}finally{busy=false;}},25);
}).catch(error=>{fs.writeFileSync(path.join(directory,'fatal.txt'),String(error.stack||error));app.exit(5);});`;
 fs.writeFileSync(path.join(evidenceDir,'electron-main.cjs'),main);
 const electron=createRequire(import.meta.url)('electron') as string,env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const processResult=await new Promise<{code:number|null;stdout:string;stderr:string}>((resolve,reject)=>{
  const child=spawn(electron,[path.join(evidenceDir,'electron-main.cjs'),'--no-sandbox'],{cwd:evidenceDir,windowsHide:true,env,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';
  child.stdout.on('data',chunk=>{stdout+=String(chunk);});child.stderr.on('data',chunk=>{stderr+=String(chunk);});child.once('error',reject);child.once('close',code=>resolve({code,stdout,stderr}));
 });
 fs.writeFileSync(path.join(evidenceDir,'process.log'),JSON.stringify(processResult,null,2)+'\n');
 expect(processResult.code,'Electron evidence '+evidenceDir+'; '+(fs.existsSync(path.join(evidenceDir,'fatal.txt'))?fs.readFileSync(path.join(evidenceDir,'fatal.txt'),'utf8'):processResult.stderr.slice(-1500))).toBe(0);
 result=JSON.parse(fs.readFileSync(path.join(evidenceDir,'result.json'),'utf8')) as BrowserResult;
 expect(result.fatal).toBeUndefined();expect(result.cases.map(row=>row.id)).toEqual(ids);
 expect(JSON.parse(fs.readFileSync(path.join(evidenceDir,'network.json'),'utf8'))).toEqual([]);
 expect(result.apiReads).toBe(0);expect(result.networkCalls).toEqual([]);
 console.info('M928_DOM_EVIDENCE '+JSON.stringify({evidenceDir,runtime:result.runtime,cases:result.cases.map(row=>({id:row.id,status:row.status,assertions:row.assertions,error:row.error}))}));
},120000);

describe('M928 real Electron Chromium read-only ReactDOM component',()=>{
 for(const id of ids)it(id,()=>{const row=result.cases.find(item=>item.id===id);expect(row,'Missing DOM case '+id).toBeDefined();expect(row?.error,'Evidence '+evidenceDir).toBeUndefined();expect(row?.status).toBe('passed');expect(row!.assertions).toBeGreaterThan(0);});
});
