import {beforeAll,describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {build} from 'esbuild';

const root=process.cwd(),evidenceBase=path.resolve('.local/m950-candidate2-review-app-integration');
fs.mkdirSync(evidenceBase,{recursive:true});
const caseDir=fs.mkdtempSync(path.join(evidenceBase,'actual-app-dom-'));
const ids=["explicit-form-drafts-issue-one-exact-four-and-adopt-canonical","unchanged-review-adopts-original-cas-without-false-stale","favorite-overall-note-and-elements-share-one-complete-draft","missing-or-unavailable-review-route-has-no-generic-fallback","pending-cancel-retains-real-write-lease-and-discards-late-reply","late-draft-ABA-or-page-change-preserves-current-input","live-source-method-and-getter-changes-discard-old-replies","handoff-refresh-failure-retries-only-same-returned-result","handoff-pending-cancel-retains-lease-and-never-adopts","public-error-keeps-draft-until-explicit-read-compare-load","validated-notice-preserves-draft-and-requires-restart","read-failure-and-missing-real-method-do-not-use-legacy-cache","read-pending-cancel-or-source-change-retains-lease-and-draft","replacement-generation-and-additional-editors-keep-existing-guards"];
const selected=(process.env.M950_REVIEW_CASES??'').split(',').filter(Boolean);
if(selected.some(id=>!ids.includes(id)))throw Error('Unknown M950 App case');
const activeIds=selected.length?ids.filter(id=>selected.includes(id)):ids;
type BrowserResult={scope:string;runtime:{userAgent:string;strictMode:boolean};cases:{id:string;status:'passed'|'failed';assertions:number;error?:string}[];errors:string[];unhandled:string[];fatal?:string};
let result:BrowserResult;

beforeAll(async()=>{
 let stripped=false;
 const compiled=await build({absWorkingDir:root,entryPoints:['tests/fixtures/m950-candidate2-review-app-dom.tsx'],outfile:path.join(caseDir,'renderer.js'),bundle:true,platform:'browser',format:'iife',target:'chrome144',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"',__M950_REVIEW_CASES__:JSON.stringify(selected)},metafile:true,logLevel:'silent',plugins:[{name:'actual-app-test-entry-only',setup(builder){builder.onResolve({filter:/^m950-candidate2-review-actual-app$/},()=>({path:path.join(root,'src/renderer/main.tsx'),namespace:'m950-candidate2-review-actual-app'}));builder.onLoad({filter:/.*/,namespace:'m950-candidate2-review-actual-app'},args=>{const source=fs.readFileSync(args.path,'utf8'),trimmed=source.replace(/createRoot\(document\.getElementById\('root'\)!\)\.render\([\s\S]*$/,'');if(trimmed===source)throw Error('Production App auto-start line not found');stripped=true;return{contents:trimmed+'\nexport {App};',loader:'tsx',resolveDir:path.dirname(args.path)};});}}]});
 const inputs=Object.keys(compiled.metafile!.inputs).map(file=>file.replaceAll('\\','/'));expect(stripped).toBe(true);expect(inputs.some(file=>file.endsWith('src/renderer/main.tsx'))).toBe(true);expect(inputs.some(file=>file.endsWith('src/renderer/Candidate2ReviewFeedback.tsx'))).toBe(true);expect(inputs.some(file=>file.endsWith('src/renderer/use-candidate2-review.ts'))).toBe(true);
 fs.writeFileSync(path.join(caseDir,'compile-report.json'),JSON.stringify({scope:'Only actual App auto-start tail omitted to export App. Product Panel/controller/hook and React/ReactDOM compiled unchanged; no API/module/hook mocks.',inputs},null,2));
 fs.writeFileSync(path.join(caseDir,'index.html'),'<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src data:;"><link rel="stylesheet" href="renderer.css"><title>M950 C2 actual App native DOM</title></head><body><div id="root"></div><script src="renderer.js"></script></body></html>');
 fs.writeFileSync(path.join(caseDir,'electron-main.cjs'),String.raw`
const {app,BrowserWindow,session}=require('electron'),fs=require('node:fs'),path=require('node:path');
const directory=__dirname,logs=[];app.setPath('userData',path.join(directory,'isolated-user-data'));app.disableHardwareAcceleration();
let finished=false;const fail=(error,code)=>{if(finished)return;finished=true;fs.writeFileSync(path.join(directory,'fatal.txt'),String(error.stack||error));fs.writeFileSync(path.join(directory,'browser.log'),logs.join('\n'));app.exit(code);};
setTimeout(()=>fail('M950 actual App deadline including initial render',3),60000);
app.whenReady().then(async()=>{
 session.defaultSession.webRequest.onBeforeRequest((details,done)=>{const local=details.url.startsWith('file:')||details.url.startsWith('data:');if(!local)logs.push('blocked-network '+details.url);done({cancel:!local});});
 const window=new BrowserWindow({show:false,width:1280,height:900,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 window.webContents.on('console-message',(_event,level,message)=>{if(logs.length<100){const line=String(level)+' '+String(message).slice(0,2000);logs.push(line);fs.appendFileSync(path.join(directory,'browser-live.log'),line+'\n');}});window.webContents.on('render-process-gone',(_event,details)=>fail('Renderer gone '+JSON.stringify(details),2));
 await window.loadFile(path.join(directory,'index.html'));
 const poll=setInterval(async()=>{try{const result=await window.webContents.executeJavaScript('window.__M950_C2_APP_RESULT__ || null');if(result){clearInterval(poll);finished=true;for(const row of result.cases||[]){fs.writeFileSync(path.join(directory,row.id+'.html'),'<!doctype html><meta charset="utf-8">'+row.html);delete row.html;}fs.writeFileSync(path.join(directory,'result.json'),JSON.stringify(result,null,2));fs.writeFileSync(path.join(directory,'browser.log'),logs.join('\n'));window.destroy();app.exit(result.fatal?2:0);}}catch(error){clearInterval(poll);fail(error,4);}},25);
}).catch(error=>fail(error,5));
`);
 const electron=createRequire(import.meta.url)('electron') as string,env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const processResult=await new Promise<{code:number|null;stdout:string;stderr:string}>((resolve,reject)=>{const child=spawn(electron,[path.join(caseDir,'electron-main.cjs'),'--no-sandbox'],{cwd:caseDir,windowsHide:true,env,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';const deadline=setTimeout(()=>{stderr+='\nM950 actual App process deadline exceeded';child.kill();},75000);child.stdout.on('data',chunk=>{stdout+=String(chunk);});child.stderr.on('data',chunk=>{stderr+=String(chunk);});child.once('error',error=>{clearTimeout(deadline);reject(error);});child.once('close',code=>{clearTimeout(deadline);resolve({code,stdout,stderr});});});
 fs.writeFileSync(path.join(caseDir,'process.log'),JSON.stringify(processResult,null,2));expect(processResult.code,'Evidence '+caseDir+'; '+(fs.existsSync(path.join(caseDir,'fatal.txt'))?fs.readFileSync(path.join(caseDir,'fatal.txt'),'utf8'):processResult.stderr.slice(-2000))).toBe(0);
 result=JSON.parse(fs.readFileSync(path.join(caseDir,'result.json'),'utf8')) as BrowserResult;expect(result.fatal).toBeUndefined();expect(result.cases.map(row=>row.id)).toEqual(activeIds);expect(result.errors).toEqual([]);expect(result.unhandled).toEqual([]);
 console.info('M950_ACTUAL_C2_APP_DOM_EVIDENCE '+JSON.stringify({caseDir,scope:result.scope,runtime:result.runtime,cases:result.cases.map(row=>({id:row.id,status:row.status,assertions:row.assertions,error:row.error}))}));
},120000);
describe('M950 actual App candidate2 review integration, synthetic transport only',()=>{
 for(const id of activeIds)it(id,()=>{const row=result.cases.find(value=>value.id===id);expect(row,'Missing actual App DOM case '+id).toBeDefined();expect(row?.error,'Evidence '+caseDir).toBeUndefined();expect(row?.status).toBe('passed');expect(row!.assertions).toBeGreaterThan(0);});
});
