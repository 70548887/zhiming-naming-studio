import {beforeAll,describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {build} from 'esbuild';
import {makeM925GlueFixtures} from './helpers/m925-cultural-glue-fixtures';

const root=process.cwd(),evidenceBase=path.resolve('.local/m925-cultural-catalog-glue');
fs.mkdirSync(evidenceBase,{recursive:true});
const caseDir=fs.mkdtempSync(path.join(evidenceBase,'contract-dom-'));
const ids=['saved-profile-props-mount-default-no-source-read','explicit-known-reference-performs-actual-source-read-and-apply','dirty-portal-confirmation-cancel-and-explicit-confirm','pending-source-read-preserves-new-same-owner-date','foreign-source-response-id-or-owner-is-refused','same-studio-read-method-rebind-rejects-pending-response','root-busy-refuses-captured-source-action','owner-switch-retires-late-source-session-response','readonly-prop-still-permits-explicit-original-source-read'];
type BrowserResult={scope:string;runtime:{userAgent:string;strictMode:boolean};cases:{id:string;status:'passed'|'failed';assertions:number;error?:string}[];errors:string[];unhandled:string[];fatal?:string};
let result:BrowserResult;

beforeAll(async()=>{
 const seeds=makeM925GlueFixtures();
 fs.writeFileSync(path.join(caseDir,'fixture-provenance.json'),JSON.stringify({scope:'Contract-only App glue with explicit viewer props stub, fixture bootstrap and original-session API; not frozen design viewer/catalog acceptance.',sessions:seeds.sessions.map(value=>({id:value.id,profileId:value.profileId,reviewToken:value.reviewToken})),references:seeds.references,actualAppSource:true,realReact:true,realDOM:true,designViewerStubbed:true,realServiceExecuted:false,realStoreExecuted:false},null,2));
 let appEntryStripped=false,viewerStubSubstitutions=0;
 const compiled=await build({absWorkingDir:root,entryPoints:['tests/fixtures/m925-cultural-catalog-glue-dom.tsx'],outfile:path.join(caseDir,'renderer.js'),bundle:true,platform:'browser',format:'iife',target:'chrome144',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},metafile:true,logLevel:'silent',plugins:[{name:'contract-only-app-glue-entry',setup(builder){
  builder.onResolve({filter:/^m925-actual-app$/},()=>({path:path.join(root,'src/renderer/main.tsx'),namespace:'m925-actual-app'}));
  builder.onResolve({filter:/^\.\/CulturalSavedCatalogViewer$/},()=>{viewerStubSubstitutions++;return {path:path.join(root,'tests/helpers/m925-catalog-viewer-props-stub.tsx')};});
  builder.onLoad({filter:/.*/,namespace:'m925-actual-app'},async args=>{
   const source=fs.readFileSync(args.path,'utf8'),trimmed=source.replace(/createRoot\(document\.getElementById\('root'\)!\)\.render\([\s\S]*$/,'');
   if(trimmed===source)throw Error('Actual App auto-start was not found; React/hooks must remain real');appEntryStripped=true;return {contents:trimmed+'\nexport {App};',loader:'tsx',resolveDir:path.dirname(args.path)};
  });
 }}]});
 expect(appEntryStripped).toBe(true);expect(viewerStubSubstitutions).toBe(1);
 const inputs=Object.keys(compiled.metafile!.inputs).map(value=>value.replaceAll('\\','/'));
 expect(inputs.some(value=>value.endsWith('src/renderer/main.tsx'))).toBe(true);expect(inputs.some(value=>value.endsWith('tests/helpers/m925-catalog-viewer-props-stub.tsx'))).toBe(true);expect(inputs.some(value=>value.endsWith('src/renderer/CulturalSavedCatalogViewer.tsx'))).toBe(false);
 fs.writeFileSync(path.join(caseDir,'compile-report.json'),JSON.stringify({scope:'Only viewer import substituted by explicit contract stub and App auto-start omitted; actual App/React/ReactDOM/hooks stay unchanged.',appEntryStripped,viewerStubSubstitutions,inputs},null,2));
 const escaped=JSON.stringify(seeds).replaceAll('<','\\u003c');
 fs.writeFileSync(path.join(caseDir,'index.html'),'<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\'; img-src data:;"><link rel="stylesheet" href="renderer.css"><title>M925 contract-only actual App glue</title></head><body><div id="root"></div><script>window.__M925_GLUE_SEEDS__='+escaped+';</script><script src="renderer.js"></script></body></html>');
 fs.writeFileSync(path.join(caseDir,'electron-main.cjs'),String.raw`
const {app,BrowserWindow,session}=require('electron'),fs=require('node:fs'),path=require('node:path');
const directory=__dirname,logs=[];app.setPath('userData',path.join(directory,'isolated-user-data'));app.disableHardwareAcceleration();
let finished=false;const fail=(error,code)=>{if(finished)return;finished=true;fs.writeFileSync(path.join(directory,'fatal.txt'),String(error.stack||error));fs.writeFileSync(path.join(directory,'browser.log'),logs.join('\n'));app.exit(code);};
setTimeout(()=>fail('M925 App glue contract DOM timed out including initial load',3),60000);
app.whenReady().then(async()=>{
 session.defaultSession.webRequest.onBeforeRequest((details,done)=>{const local=details.url.startsWith('file:')||details.url.startsWith('data:');if(!local)logs.push('blocked-network '+details.url);done({cancel:!local});});
 const window=new BrowserWindow({show:false,width:1280,height:900,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 window.webContents.on('console-message',(_event,level,message)=>{if(logs.length<100){const line=String(level)+' '+String(message).slice(0,2000);logs.push(line);fs.appendFileSync(path.join(directory,'browser-live.log'),line+'\n');}});window.webContents.on('render-process-gone',(_event,details)=>fail('Renderer gone '+JSON.stringify(details),2));
 await window.loadFile(path.join(directory,'index.html'));const poll=setInterval(async()=>{try{const value=await window.webContents.executeJavaScript('window.__M925_GLUE_RESULT__ || null');if(value){clearInterval(poll);finished=true;for(const row of value.cases||[]){fs.writeFileSync(path.join(directory,row.id+'.html'),'<!doctype html><meta charset="utf-8">'+row.html);delete row.html;}fs.writeFileSync(path.join(directory,'result.json'),JSON.stringify(value,null,2));fs.writeFileSync(path.join(directory,'browser.log'),logs.join('\n'));window.destroy();app.exit(value.fatal?2:0);}}catch(error){clearInterval(poll);fail(error,4);}},25);
}).catch(error=>fail(error,5));
`);
 const electron=createRequire(import.meta.url)('electron') as string,env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const processResult=await new Promise<{code:number|null;stdout:string;stderr:string}>((resolve,reject)=>{const child=spawn(electron,[path.join(caseDir,'electron-main.cjs'),'--no-sandbox'],{cwd:caseDir,windowsHide:true,env,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';const watchdog=setTimeout(()=>{stderr+='\nM925 contract harness process deadline exceeded';child.kill();},75000);child.stdout.on('data',chunk=>{stdout+=String(chunk);});child.stderr.on('data',chunk=>{stderr+=String(chunk);});child.once('error',error=>{clearTimeout(watchdog);reject(error);});child.once('close',code=>{clearTimeout(watchdog);resolve({code,stdout,stderr});});});
 fs.writeFileSync(path.join(caseDir,'process.log'),JSON.stringify(processResult,null,2));
 expect(processResult.code,'Evidence '+caseDir+'; '+(fs.existsSync(path.join(caseDir,'fatal.txt'))?fs.readFileSync(path.join(caseDir,'fatal.txt'),'utf8'):processResult.stderr.slice(-2000))).toBe(0);
 result=JSON.parse(fs.readFileSync(path.join(caseDir,'result.json'),'utf8')) as BrowserResult;
 expect(result.fatal).toBeUndefined();expect(result.cases.map(value=>value.id)).toEqual(ids);expect(result.errors).toEqual([]);expect(result.unhandled).toEqual([]);
 expect(result.scope).toContain('Contract-only');
 console.info('M925_APP_GLUE_CONTRACT_DOM_EVIDENCE '+JSON.stringify({caseDir,scope:result.scope,runtime:result.runtime,cases:result.cases.map(value=>({id:value.id,status:value.status,assertions:value.assertions,error:value.error}))}));
},120000);

describe('M925 contract-only actual App glue with a viewer props stub',()=>{
 for(const id of ids)it(id,()=>{const value=result.cases.find(row=>row.id===id);expect(value,'Missing contract DOM case '+id).toBeDefined();expect(value?.error,'Evidence '+caseDir).toBeUndefined();expect(value?.status).toBe('passed');expect(value!.assertions).toBeGreaterThan(0);});
});
