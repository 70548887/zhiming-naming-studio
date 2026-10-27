import {beforeAll,describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {build} from 'esbuild';

const root=process.cwd(),evidenceBase=path.resolve('.local/m936-candidate2-generation-ui');
fs.mkdirSync(evidenceBase,{recursive:true});
const caseDir=fs.mkdtempSync(path.join(evidenceBase,'hook-dom-'));
const allIds=['strict-default-enable-zero-calls-exact-three-and-frozen-delivery','api-error-explicit-generation-retry-has-no-ordinary-fallback','missing-and-getter-bridge-stay-unavailable-without-calls','unsaved-dirty-readonly-or-noncanonical-input-cannot-dispatch','physical-request-cancel-keeps-root-lease-until-settlement','unmount-pending-rejection-keeps-lease-and-remount-starts-off',...(['owner','draft','database','A-B-A'] as const).map(mode=>`pending-${mode}-change-retires-old-success`),...(['method','getter','source'] as const).map(mode=>`pending-${mode}-replacement-rejects-old-reply`),'handoff-error-retries-same-frozen-result-without-second-generation','handoff-promise-pending-cancel-holds-lease-until-actual-delivery-settles','saved-status-with-foreign-owner-does-not-become-ready','another-root-writer-blocks-dispatch-then-explicit-generation-recovers','real-route-unavailable-error-does-not-fall-back-or-display-ready'];
const requested=(process.env.M936_HOOK_CASES??'').split(',').filter(Boolean),ids=requested.length?allIds.filter(id=>requested.includes(id)):allIds;
if(!ids.length||requested.some(id=>!allIds.includes(id)))throw Error('Unknown M936 hook case filter');
type BrowserResult={scope:string;runtime:{userAgent:string;strictMode:boolean};cases:{id:string;status:'passed'|'failed';assertions:number;error?:string}[];errors:string[];unhandled:string[];fatal?:string};
let result:BrowserResult;

beforeAll(async()=>{
 const compiled=await build({absWorkingDir:root,entryPoints:['tests/fixtures/m936-candidate2-generation-hook-dom.tsx'],outfile:path.join(caseDir,'renderer.js'),bundle:true,platform:'browser',format:'iife',target:'chrome144',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"','__M936_HOOK_CASES__':JSON.stringify(ids)},metafile:true,logLevel:'silent'});
 const inputs=Object.keys(compiled.metafile!.inputs).map(file=>file.replaceAll('\\','/'));
 expect(inputs.some(file=>file.endsWith('src/renderer/use-candidate2-generation.ts'))).toBe(true);
 expect(inputs.some(file=>file.endsWith('src/renderer/main.tsx')||file.endsWith('src/renderer/Candidate2GenerationPanel.tsx'))).toBe(false);
 fs.writeFileSync(path.join(caseDir,'compile-report.json'),JSON.stringify({scope:'Actual hook/controller imports and real React/ReactDOM. Only a test-only Probe supplies native controls; product Panel/App deliberately not exercised.',inputs},null,2));
 fs.writeFileSync(path.join(caseDir,'index.html'),'<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src data:;"><title>M936 candidate2 hook native DOM</title></head><body><main id="root"></main><script src="renderer.js"></script></body></html>');
 fs.writeFileSync(path.join(caseDir,'electron-main.cjs'),String.raw`
const {app,BrowserWindow,session}=require('electron'),fs=require('node:fs'),path=require('node:path');
const directory=__dirname,logs=[];app.setPath('userData',path.join(directory,'isolated-user-data'));app.disableHardwareAcceleration();
let finished=false;const fail=(error,code)=>{if(finished)return;finished=true;fs.writeFileSync(path.join(directory,'fatal.txt'),String(error.stack||error));fs.writeFileSync(path.join(directory,'browser.log'),logs.join('\n'));app.exit(code);};
setTimeout(()=>fail('M936 hook DOM deadline, including initial render',3),45000);
app.whenReady().then(async()=>{
 session.defaultSession.webRequest.onBeforeRequest((details,done)=>{const local=details.url.startsWith('file:')||details.url.startsWith('data:');if(!local)logs.push('blocked-network '+details.url);done({cancel:!local});});
 const window=new BrowserWindow({show:false,width:1280,height:900,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 window.webContents.on('console-message',(_event,level,message)=>{if(logs.length<100){const line=String(level)+' '+String(message).slice(0,2000);logs.push(line);fs.appendFileSync(path.join(directory,'browser-live.log'),line+'\n');}});window.webContents.on('render-process-gone',(_event,details)=>fail('Renderer gone '+JSON.stringify(details),2));
 await window.loadFile(path.join(directory,'index.html'));
 const poll=setInterval(async()=>{try{const result=await window.webContents.executeJavaScript('window.__M936_HOOK_RESULT__ || null');if(result){clearInterval(poll);finished=true;for(const row of result.cases||[]){fs.writeFileSync(path.join(directory,row.id+'.html'),'<!doctype html><meta charset="utf-8">'+row.html);delete row.html;}fs.writeFileSync(path.join(directory,'result.json'),JSON.stringify(result,null,2));fs.writeFileSync(path.join(directory,'browser.log'),logs.join('\n'));window.destroy();app.exit(result.fatal?2:0);}}catch(error){clearInterval(poll);fail(error,4);}},25);
}).catch(error=>fail(error,5));
`);
 const electron=createRequire(import.meta.url)('electron') as string,env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const processResult=await new Promise<{code:number|null;stdout:string;stderr:string}>((resolve,reject)=>{const child=spawn(electron,[path.join(caseDir,'electron-main.cjs'),'--no-sandbox'],{cwd:caseDir,windowsHide:true,env,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';const deadline=setTimeout(()=>{stderr+='\nM936 hook process deadline exceeded';child.kill();},55000);child.stdout.on('data',chunk=>{stdout+=String(chunk);});child.stderr.on('data',chunk=>{stderr+=String(chunk);});child.once('error',error=>{clearTimeout(deadline);reject(error);});child.once('close',code=>{clearTimeout(deadline);resolve({code,stdout,stderr});});});
 fs.writeFileSync(path.join(caseDir,'process.log'),JSON.stringify(processResult,null,2));
 expect(processResult.code,'Evidence '+caseDir+'; '+(fs.existsSync(path.join(caseDir,'fatal.txt'))?fs.readFileSync(path.join(caseDir,'fatal.txt'),'utf8'):processResult.stderr.slice(-2000))).toBe(0);
 result=JSON.parse(fs.readFileSync(path.join(caseDir,'result.json'),'utf8')) as BrowserResult;
 expect(result.fatal).toBeUndefined();expect(result.cases.map(row=>row.id)).toEqual(ids);expect(result.errors).toEqual([]);expect(result.unhandled).toEqual([]);
 console.info('M936_HOOK_DOM_EVIDENCE '+JSON.stringify({caseDir,scope:result.scope,runtime:result.runtime,cases:result.cases.map(row=>({id:row.id,status:row.status,assertions:row.assertions,error:row.error}))}));
},90000);

describe('M936 candidate2 generation hook native DOM, synthetic transport only',()=>{
 for(const id of ids)it(id,()=>{const row=result.cases.find(value=>value.id===id);expect(row,'Missing hook DOM case '+id).toBeDefined();expect(row?.error,'Evidence '+caseDir).toBeUndefined();expect(row?.status).toBe('passed');expect(row!.assertions).toBeGreaterThan(0);});
});
