import {beforeAll,describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {build} from 'esbuild';
import {makeM921AppFixtures} from './helpers/m921-cultural-app-fixtures';

const root=process.cwd(),evidenceBase=path.resolve('.local/m924-cultural-app-locks');
fs.mkdirSync(evidenceBase,{recursive:true});
const caseDir=fs.mkdtempSync(path.join(evidenceBase,'actual-app-dom-'));
const ids=['reviewed-pending-native-commit-is-disabled-until-rejection-settles','reviewed-pending-native-migration-is-disabled-until-request-settles','reviewed-pending-native-restore-is-disabled-until-request-settles','reviewed-mode-cancel-and-child-unmount-hold-root-lease-until-physical-rejection','reviewed-display-valid-success-delivers-without-self-busy-invalidating-owner','same-object-method-replacement-rejects-pending-preview','same-object-getter-replacement-rejects-pending-preview','same-object-method-replacement-rejects-pending-saved-read','same-object-getter-replacement-rejects-pending-saved-read','whole-source-object-replacement-still-rejects-pending-preview'];
type BrowserResult={scope:string;runtime:{userAgent:string;strictMode:boolean};cases:{id:string;status:'passed'|'failed';assertions:number;error?:string}[];errors:string[];unhandled:string[];fatal?:string};
let result:BrowserResult;

beforeAll(async()=>{
 const seeds=makeM921AppFixtures();
 fs.writeFileSync(path.join(caseDir,'fixture-provenance.json'),JSON.stringify({scope:'Actual App + native DOM; fixture bootstrap, generateReviewed and CulturalWorkflowAPI bridge only.',chart:'tests/fixtures/name-imagery-known-chart.json',comparator:'src/domain/qimen-cultural-comparison.ts',reviewedSuccess:'tests/helpers/m924-reviewed-display-fixture.ts: explicit display-correlation fixture checked by unchanged matchesReviewedGenerateResult; no Store/source authenticity asserted',independentReference:'Read-only E:/八卦周易/.local/team-923/app-write-lease-audit/snapshot/tests/fixtures/m923-independent-app-dom.tsx scaffold; original evidence unmodified',sessions:seeds.sessions.map(session=>({id:session.id,profileId:session.profileId,reviewToken:session.reviewToken,candidateIds:session.candidates.map(value=>value.id)})),snapshots:Object.fromEntries(Object.entries(seeds.snapshots).map(([id,snapshot])=>[id,{snapshotDigest:snapshot.snapshotDigest,candidateOrder:snapshot.candidateOrder}])),realServiceExecuted:false,realStoreExecuted:false},null,2));
 let appEntryStripped=false;
 const compiled=await build({absWorkingDir:root,entryPoints:['tests/fixtures/m924-cultural-app-locks-dom.tsx'],outfile:path.join(caseDir,'renderer.js'),bundle:true,platform:'browser',format:'iife',target:'chrome144',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},metafile:true,logLevel:'silent',plugins:[{name:'actual-app-test-entry-only',setup(builder){builder.onResolve({filter:/^m924-actual-app$/},()=>({path:path.join(root,'src/renderer/main.tsx'),namespace:'m924-actual-app'}));builder.onLoad({filter:/.*/,namespace:'m924-actual-app'},async args=>{
  const source=fs.readFileSync(args.path,'utf8'),trimmed=source.replace(/createRoot\(document\.getElementById\('root'\)!\)\.render\([\s\S]*$/,'');
  if(trimmed===source)throw Error('Actual App auto-start line was not found; test must not fake App or React hooks');appEntryStripped=true;return{contents:trimmed+'\nexport {App};',loader:'tsx',resolveDir:path.dirname(args.path)};
 });}}]});
 expect(appEntryStripped).toBe(true);expect(Object.keys(compiled.metafile!.inputs).some(file=>file.replaceAll('\\','/').endsWith('src/renderer/main.tsx'))).toBe(true);
 fs.writeFileSync(path.join(caseDir,'compile-report.json'),JSON.stringify({appEntryStripped,scope:'Only production createRoot auto-start omitted. Full App and dependencies compiled unchanged; React/ReactDOM/hooks are not mocked.',inputs:Object.keys(compiled.metafile!.inputs)},null,2));
 const escaped=JSON.stringify(seeds).replaceAll('<','\\u003c');
 fs.writeFileSync(path.join(caseDir,'index.html'),'<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\'; img-src data:;"><link rel="stylesheet" href="renderer.css"><title>M924 actual App lock regressions</title></head><body><div id="root"></div><script>window.__M924_APP_SEEDS__='+escaped+';</script><script src="renderer.js"></script></body></html>');
 fs.writeFileSync(path.join(caseDir,'electron-main.cjs'),String.raw`
const {app,BrowserWindow,session}=require('electron'),fs=require('node:fs'),path=require('node:path');
const directory=__dirname,logs=[];app.setPath('userData',path.join(directory,'isolated-user-data'));app.disableHardwareAcceleration();
let finished=false;const fail=(error,code)=>{if(finished)return;finished=true;fs.writeFileSync(path.join(directory,'fatal.txt'),String(error.stack||error));fs.writeFileSync(path.join(directory,'browser.log'),logs.join('\n'));app.exit(code);};
const watchdog=setTimeout(()=>fail('Actual App DOM timed out, including initial load/React effect flush',3),60000);
app.whenReady().then(async()=>{
 session.defaultSession.webRequest.onBeforeRequest((details,done)=>{const local=details.url.startsWith('file:')||details.url.startsWith('data:');if(!local)logs.push('blocked-network '+details.url);done({cancel:!local});});
 const window=new BrowserWindow({show:false,width:1280,height:900,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 window.webContents.on('console-message',(_event,level,message)=>{if(logs.length<100){const line=String(level)+' '+String(message).slice(0,2000);logs.push(line);fs.appendFileSync(path.join(directory,'browser-live.log'),line+'\n');}});window.webContents.on('render-process-gone',(_event,details)=>fail('Renderer gone '+JSON.stringify(details),2));
 await window.loadFile(path.join(directory,'index.html'));const started=Date.now();const poll=setInterval(async()=>{try{const result=await window.webContents.executeJavaScript('window.__M924_APP_RESULT__ || null');if(result){clearInterval(poll);finished=true;for(const row of result.cases||[]){fs.writeFileSync(path.join(directory,row.id+'.html'),'<!doctype html><meta charset="utf-8">'+row.html);delete row.html;}fs.writeFileSync(path.join(directory,'result.json'),JSON.stringify(result,null,2));fs.writeFileSync(path.join(directory,'browser.log'),logs.join('\n'));window.destroy();app.exit(result.fatal?2:0);}else if(Date.now()-started>90000){clearInterval(poll);fail('Actual App DOM timed out',3);}}catch(error){clearInterval(poll);fail(error,4);}},25);
}).catch(error=>fail(error,5));
`);
 const electron=createRequire(import.meta.url)('electron') as string,env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const processResult=await new Promise<{code:number|null;stdout:string;stderr:string}>((resolve,reject)=>{const child=spawn(electron,[path.join(caseDir,'electron-main.cjs'),'--no-sandbox'],{cwd:caseDir,windowsHide:true,env,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';const watchdog=setTimeout(()=>{stderr+='\nM924 harness process deadline exceeded';child.kill();},75000);child.stdout.on('data',chunk=>{stdout+=String(chunk);});child.stderr.on('data',chunk=>{stderr+=String(chunk);});child.once('error',error=>{clearTimeout(watchdog);reject(error);});child.once('close',code=>{clearTimeout(watchdog);resolve({code,stdout,stderr});});});
 fs.writeFileSync(path.join(caseDir,'process.log'),JSON.stringify(processResult,null,2));
 expect(processResult.code,'Evidence '+caseDir+'; '+(fs.existsSync(path.join(caseDir,'fatal.txt'))?fs.readFileSync(path.join(caseDir,'fatal.txt'),'utf8'):processResult.stderr.slice(-2000))).toBe(0);
 result=JSON.parse(fs.readFileSync(path.join(caseDir,'result.json'),'utf8')) as BrowserResult;
 expect(result.fatal).toBeUndefined();expect(result.cases.map(row=>row.id)).toEqual(ids);expect(result.errors).toEqual([]);expect(result.unhandled).toEqual([]);
 console.info('M924_ACTUAL_APP_DOM_EVIDENCE '+JSON.stringify({caseDir,scope:result.scope,runtime:result.runtime,cases:result.cases.map(row=>({id:row.id,status:row.status,assertions:row.assertions,error:row.error}))}));
},120000);

describe('M924 actual App request lease and bridge identity with fixture transport',()=>{
 for(const id of ids)it(id,()=>{const row=result.cases.find(value=>value.id===id);expect(row,'Missing DOM case '+id).toBeDefined();expect(row?.error,'Evidence '+caseDir).toBeUndefined();expect(row?.status).toBe('passed');expect(row!.assertions).toBeGreaterThan(0);});
});
