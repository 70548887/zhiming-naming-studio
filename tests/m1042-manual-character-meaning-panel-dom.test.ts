import {beforeAll,describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {build} from 'esbuild';

const root=process.cwd(),evidenceDir=fs.mkdtempSync(path.join(path.resolve('.local/m1042-manual-meaning-panel'),'dom-'));
const scope='Real isolated Electron Chromium + ReactDOM StrictMode. Explicit UI state projections and event callbacks only; no real Service, save, App, transport or database acceptance.';
type BrowserCase={id:string;status:'passed'|'failed';assertions:number;error?:string;calls:string[]};
type BrowserResult={scope:string;runtime:{userAgent:string;strictMode:boolean;reactRoot:string};cases:BrowserCase[];apiReads:number;networkCalls:string[];viewports:unknown[];fatal?:string};
const ids=["mount-and-explicit-query-select-have-only-controlled-events","invalid-input-and-not-covered-do-not-offer-selection","pending-cancel-stays-reachable-through-disabled-owner","cross-character-and-owner-ABA-hide-late-directory-and-explanation","error-unavailable-and-escaped-source-remain-controlled","actual-keyboard-query-and-select-are-reachable","actual-320-390-layouts-do-not-scroll-horizontally","no-api-network-or-production-owner-imports"];
const selected=(process.env.M1042_PANEL_CASES??'').split(',').filter(Boolean);
if(selected.some(id=>!ids.includes(id)))throw Error('Unknown M1042 panel case');
const activeIds=selected.length?ids.filter(id=>selected.includes(id)):ids;
let result:BrowserResult;

beforeAll(async()=>{
 fs.writeFileSync(path.join(evidenceDir,'scope.json'),JSON.stringify({scope,uniqueType:'src/renderer/manual-character-meaning-panel-ui.ts',realServiceExecuted:false,realSaveExecuted:false,realAppExecuted:false,customerDatabaseOpened:false},null,2)+'\n');
 const built=await build({absWorkingDir:root,entryPoints:['tests/fixtures/m1042-manual-character-meaning-panel-dom.tsx'],outfile:path.join(evidenceDir,'renderer.js'),bundle:true,platform:'browser',format:'iife',target:'chrome144',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"',__M1042_PANEL_CASES__:JSON.stringify(selected)},metafile:true,logLevel:'silent'});
 const inputs=Object.keys(built.metafile!.inputs);
 expect(inputs.filter(input=>/^(?:src\/(?:main|domain)\/|tests\/helpers\/|data\/)/.test(input)),'Browser panel test must not import Service/domain/data/producer helpers').toEqual([]);
 expect(inputs.filter(input=>/src\/renderer\/(?:App|useCandidate2|.*hook)/i.test(input))).toEqual([]);
 fs.writeFileSync(path.join(evidenceDir,'bundle-inputs.json'),JSON.stringify(inputs,null,2)+'\n');
 fs.writeFileSync(path.join(evidenceDir,'index.html'),'<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src data:;"><style>html,body{margin:0;padding:0}#root{min-width:0}</style><link rel="stylesheet" href="renderer.css"><title>M1042 isolated manual meaning panel tests</title></head><body><main id="root"></main><script src="renderer.js"></script></body></html>');
 const main=String.raw`const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const directory=__dirname,logs=[],network=[];
app.setPath('userData',path.join(directory,'isolated-user-data'));
app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 session.defaultSession.webRequest.onBeforeRequest((details,done)=>{const local=details.url.startsWith('file:')||details.url.startsWith('data:');if(!local)network.push(details.url);done({cancel:!local});});
 const window=new BrowserWindow({show:false,useContentSize:true,width:1100,height:880,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 window.webContents.on('console-message',(_event,level,message)=>logs.push(String(level)+' '+message));
 window.webContents.on('render-process-gone',(_event,details)=>{fs.writeFileSync(path.join(directory,'fatal.txt'),'Renderer gone '+JSON.stringify(details));app.exit(2);});
 await window.loadFile(path.join(directory,'index.html'));
 window.webContents.debugger.attach('1.3');
 const started=Date.now();let handled=0,busy=false;
 const poll=setInterval(async()=>{if(busy)return;busy=true;try{
  const state=await window.webContents.executeJavaScript('({result:window.__M1042_RESULT__||null,request:window.__M1042_CONTROL_REQUEST__||null})');
  if(state.request&&state.request.sequence>handled){handled=state.request.sequence;if(state.request.kind==='viewport'){window.setContentSize(state.request.width,880);await window.webContents.debugger.sendCommand('Emulation.setDeviceMetricsOverride',{width:state.request.width,height:880,deviceScaleFactor:1,mobile:false,screenWidth:state.request.width,screenHeight:880});}else{window.webContents.focus();const code=state.request.key==='Space'?'Space':state.request.key;window.webContents.sendInputEvent({type:'keyDown',keyCode:code});if(state.request.key==='Enter'||state.request.key==='Space')window.webContents.sendInputEvent({type:'char',keyCode:state.request.key==='Enter'?'\r':' '});window.webContents.sendInputEvent({type:'keyUp',keyCode:code});}await window.webContents.executeJavaScript('window.__M1042_CONTROL_ACK__='+handled);}
  if(state.result){clearInterval(poll);for(const row of state.result.cases||[]){fs.writeFileSync(path.join(directory,row.id+'.html'),'<!doctype html><meta charset="utf-8"><p>Explicit UI projection component evidence.</p>'+row.html);delete row.html;}fs.writeFileSync(path.join(directory,'result.json'),JSON.stringify(state.result,null,2)+'\n');fs.writeFileSync(path.join(directory,'browser.log'),logs.join('\n')+'\n');fs.writeFileSync(path.join(directory,'network.json'),JSON.stringify(network,null,2)+'\n');window.destroy();app.exit(state.result.fatal?2:0);}
  else if(Date.now()-started>90000){clearInterval(poll);fs.writeFileSync(path.join(directory,'fatal.txt'),'Browser harness timed out');app.exit(3);}
 }catch(error){clearInterval(poll);fs.writeFileSync(path.join(directory,'fatal.txt'),String(error.stack||error));app.exit(4);}finally{busy=false;}},25);
}).catch(error=>{fs.writeFileSync(path.join(directory,'fatal.txt'),String(error.stack||error));app.exit(5);});`;
 fs.writeFileSync(path.join(evidenceDir,'electron-main.cjs'),main);
 const electron=createRequire(import.meta.url)('electron') as string,env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const processResult=await new Promise<{code:number|null;stdout:string;stderr:string}>((resolve,reject)=>{
  const child=spawn(electron,[path.join(evidenceDir,'electron-main.cjs'),'--no-sandbox'],{cwd:evidenceDir,windowsHide:true,env,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',chunk=>{stdout+=String(chunk);});child.stderr.on('data',chunk=>{stderr+=String(chunk);});child.once('error',reject);child.once('close',code=>resolve({code,stdout,stderr}));
 });
 fs.writeFileSync(path.join(evidenceDir,'process.log'),JSON.stringify(processResult,null,2)+'\n');
 expect(processResult.code,'Electron evidence '+evidenceDir+'; '+(fs.existsSync(path.join(evidenceDir,'fatal.txt'))?fs.readFileSync(path.join(evidenceDir,'fatal.txt'),'utf8'):processResult.stderr.slice(-1500))).toBe(0);
 result=JSON.parse(fs.readFileSync(path.join(evidenceDir,'result.json'),'utf8')) as BrowserResult;
 expect(result.fatal).toBeUndefined();expect(result.cases.map(row=>row.id)).toEqual(activeIds);expect(result.apiReads).toBe(0);expect(result.networkCalls).toEqual([]);expect(JSON.parse(fs.readFileSync(path.join(evidenceDir,'network.json'),'utf8'))).toEqual([]);
 console.info('M1042_DOM_EVIDENCE '+JSON.stringify({evidenceDir,runtime:result.runtime,cases:result.cases,viewports:result.viewports}));
},120000);

describe('M1042 isolated real Chromium manual meaning panel DOM',()=>{
 for(const id of activeIds)it(id,()=>{const row=result.cases.find(item=>item.id===id);expect(row,'Missing DOM case '+id).toBeDefined();expect(row?.error,'Evidence '+evidenceDir).toBeUndefined();expect(row?.status).toBe('passed');expect(row!.assertions).toBeGreaterThan(0);});
});
