import {beforeAll,describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {build} from 'esbuild';
import {compareQimenCultural} from '../src/domain/qimen-cultural-comparison';
import {culturalCanonicalDigest,culturalChartDigest} from '../src/domain/qimen-cultural-comparison-canonical';
import {LEGACY_CHART_DIGEST_ALGORITHM,QIMEN_CULTURAL_VERSION,type CulturalComparisonSnapshot,type CulturalEvidenceRef,type CulturalPalaceView,type OuterPalace,type PreparedCulturalComparisonInput} from '../src/shared/qimen-cultural-comparison';
import type {BirthProfile,Element as NamingElement,QimenChart,SourceRecord} from '../src/shared/types';
import fixedChart from './fixtures/name-imagery-known-chart.json';
import dataset from '../data/dataset.json';
import markerLock from '../data/qimen-markers-source-lock.json';
import patternLock from '../data/qimen-patterns-source-lock.json';
import tombLock from '../data/qimen-stem-tombs-source-lock.json';

/** Real ReactDOM/Chromium component tests with an explicitly stubbed transport.
 * This suite asserts no real service/Store/API-contract admission or App wiring.
 * Its display DTOs are produced by the real comparator from the existing M917
 * fixed chart and existing dictionary/editorial metadata. No customer DB opens.
 */
const root=process.cwd();
const caseDir=fs.mkdtempSync(path.resolve(process.env.M920_DOM_EVIDENCE_DIR??path.join(root,'..','dom-tests'))+'-');
const clone=<T,>(value:T):T=>JSON.parse(JSON.stringify(value));
const scope='Actual ReactDOM createRoot + StrictMode in isolated Electron Chromium; stub transport only; no real service, Store, public-API contract security or App wiring acceptance.';
const chartSources=[...markerLock.sources,...patternLock.sources,...tombLock.sources] as SourceRecord[];
const editorial=dataset.sources.find(source=>source.id==='editorial-rules')!;
const dictionary=dataset.sources.find(source=>source.id==='moe-revised')!;
const reference=(source:Pick<SourceRecord,'id'|'commit'|'sha256'|'license'>,authority:CulturalEvidenceRef['authority'],locator:string):CulturalEvidenceRef=>({id:source.id,version:source.commit,sha256:source.sha256,locator,authority,license:source.license,note:'M920 DOM presentation fixture; stub transport does not authenticate a source or create Store admission.'});
const dictionaryRef=reference(dictionary,'dictionary-fact','data/dataset.json:characters[].readings');
const labelRef=reference(editorial,'project-editorial-label','data/dataset.json:characters[].elementBasis');
const elementLabels=(values:readonly string[]):NamingElement[]=>values.map(value=>{if(!['木','火','土','金','水'].includes(value))throw Error('Existing fixture contains an unknown element label');return value as NamingElement;});

function snapshot(names:readonly string[],sourceSessionId:string|null=null):CulturalComparisonSnapshot {
 const chart=clone(fixedChart.chart) as QimenChart;
 const birth:BirthProfile={id:'m920-dom-baby-1',customerName:'M920虚构DOM测试',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2026-10-17',birthTime:'09:30',timeUnknown:false,leapMonth:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'Stub transport and component DOM only.'};
 const labelPolicy={id:'m920-existing-editorial-display-fixture',version:dataset.version,manifestDigest:culturalCanonicalDigest(editorial),dependencies:[{sourceId:editorial.id,version:editorial.commit,sha256:editorial.sha256}]};
 const anchor={anchorId:'m920-dom-anchor',ownerProfileId:birth.id,sourceSessionId,sourceRevision:'m920-dom-fixed-chart',identity:{qimenVersion:chart.version,digest:culturalChartDigest(chart,LEGACY_CHART_DIGEST_ALGORITHM).digest,digestAlgorithm:LEGACY_CHART_DIGEST_ALGORITHM,sourceDigest:culturalCanonicalDigest(chartSources),birthInputDigest:culturalCanonicalDigest(birth),timeBasisDigest:culturalCanonicalDigest({timezone:birth.timezone,birthTime:birth.birthTime,timeUnknown:birth.timeUnknown})},available:chart.available,unavailableReasons:[],birthLabel:'M917 既有固定出生盘 · M920 虚构DOM宝宝',timeBasisLabel:'出生地民用时间 Asia/Shanghai；固定原记录',sourceReferences:chartSources.map(source=>reference(source,'saved-chart-rule','existing-fixed-source-lock'))};
 const binding={anchorId:anchor.anchorId,ownerProfileId:anchor.ownerProfileId,sourceSessionId:anchor.sourceSessionId,sourceRevision:anchor.sourceRevision,identity:anchor.identity};
 const palaceViews:CulturalPalaceView[]=([1,2,3,4,6,7,8,9] as OuterPalace[]).map(number=>{const raw=chart.palaces.find(palace=>palace.number===number)!;return{palace:number,trigram:raw.trigram,direction:raw.direction,star:raw.star,door:raw.door,god:raw.god,principalAndHostedStems:[raw.heaven],observations:[]};});
 const candidates=names.map((givenName,index)=>({candidateRef:(sourceSessionId===null?'m920-draft-':'m920-saved-')+index,kind:sourceSessionId===null?'draft' as const:'saved' as const,fullName:'林'+givenName,givenName,anchorBinding:clone(binding),labelPolicy:clone(labelPolicy),rows:[...givenName].map((char,position)=>{const entry=dataset.characters.find(row=>row.char===char);if(!entry)throw Error('Existing dictionary fixture missing '+char);const mapped=entry.elements.length>0;return{position,char,pinyin:entry.pinyin,readingState:'selected' as const,sourceState:mapped?'ready' as const:'unknown' as const,labelPolicyId:labelPolicy.id,reviewedEvidenceId:mapped?'editorial:'+char:null,dictionarySense:entry.meaning,projectIntent:entry.elementBasis,elements:elementLabels(entry.elements),reasonCodes:mapped?[]:['existing-label-unknown'],sourceReferences:mapped?[clone(dictionaryRef),clone(labelRef)]:[clone(dictionaryRef)],adoptionReceiptDigest:null};})}));
 const input:PreparedCulturalComparisonInput={schema:QIMEN_CULTURAL_VERSION,enabled:true,requestId:'m920-dom-'+names.join('-'),surname:'林',anchor,qimen:chart,labelPolicy,candidates,palaceViews,chartWideObservations:[],observationCoverage:(['auxiliary','patterns','stem-tombs'] as const).map(module=>{const recorded=module==='auxiliary'?chart.auxiliary:module==='patterns'?chart.patterns:chart.stemTombs;return{module,status:recorded?'recorded' as const:'not-recorded' as const,version:recorded?recorded.version:null,reason:recorded?null:'原盘未登记'};}),ruleBasisDifferences:[],sourceReferences:[dictionaryRef,labelRef,...anchor.sourceReferences],evidenceCapsuleDigest:culturalCanonicalDigest({scope:'M920 DOM stub; no real persisted capsule or main admission'})};
 const result=compareQimenCultural(input);if(result.kind!=='result')throw Error('Real comparator fixture failed: '+JSON.stringify(result));return clone(result.snapshot);
}

type BrowserCase={id:string;status:'passed'|'failed';assertions:number;error?:string;html:string;calls:unknown[]};
type BrowserResult={scope:string;runtime:{userAgent:string;strictMode:boolean;reactRoot:string};cases:BrowserCase[];fatal?:string};
let result:BrowserResult;
const ids=['strict-default-remount','missing-api-and-errors','selection-2-3-4','partial-known-only','cancel-stale-unmount','context-boundaries','migration-consent','write-retry-original-refs','write-cas-conflict','history-restore-consent','restore-conflict-refresh-new-intent','restore-rejected-direct-retry','restore-cancel-inflight-retains-intent'];

beforeAll(async()=>{
 const seeds={ready2:snapshot(['梓涵','沐清']),ready3:snapshot(['梓涵','涵梓','沐清']),ready4:snapshot(['梓涵','涵梓','沐清','清沐']),partial2:snapshot(['梓涵','厚升']),saved2:snapshot(['梓涵','沐清'],'m920-stub-original-session')};
 expect(seeds.partial2.status).toBe('partial-known-only');
 fs.writeFileSync(path.join(caseDir,'fixture-provenance.json'),JSON.stringify({scope,chart:'tests/fixtures/name-imagery-known-chart.json',comparator:'src/domain/qimen-cultural-comparison.ts',seeds:Object.fromEntries(Object.entries(seeds).map(([id,value])=>[id,{status:value.status,candidateOrder:value.candidateOrder,snapshotDigest:value.snapshotDigest}])),realServiceExecuted:false,storeExecuted:false,appWiringExecuted:false},null,2)+'\n');
 await build({absWorkingDir:root,entryPoints:['tests/fixtures/m920-cultural-workflow-dom.tsx'],outfile:path.join(caseDir,'renderer.js'),bundle:true,platform:'browser',format:'iife',target:'chrome144',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},logLevel:'silent'});
 const escaped=JSON.stringify(seeds).replaceAll('<','\\u003c');
 fs.writeFileSync(path.join(caseDir,'index.html'),'<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\'; img-src data:;"><link rel="stylesheet" href="renderer.css"><title>M920 isolated DOM tests</title></head><body><p>'+scope+'</p><main id="root"></main><script>window.__M920_SEEDS__='+escaped+';</script><script src="renderer.js"></script></body></html>');
 const main=String.raw`const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const directory=__dirname,logs=[];
app.setPath('userData',path.join(directory,'isolated-user-data'));
app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 session.defaultSession.webRequest.onBeforeRequest((details,done)=>{const local=details.url.startsWith('file:')||details.url.startsWith('data:');if(!local)logs.push('blocked-network '+details.url);done({cancel:!local});});
 const window=new BrowserWindow({show:false,width:1100,height:800,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 window.webContents.on('console-message',(_event,level,message)=>logs.push(String(level)+' '+message));
 window.webContents.on('render-process-gone',(_event,details)=>{fs.writeFileSync(path.join(directory,'fatal.txt'),'Renderer gone '+JSON.stringify(details));app.exit(2);});
 await window.loadFile(path.join(directory,'index.html'));
 const started=Date.now();const poll=setInterval(async()=>{try{
  const result=await window.webContents.executeJavaScript('window.__M920_RESULT__ || null');
  if(result){clearInterval(poll);for(const row of result.cases||[]){fs.writeFileSync(path.join(directory,row.id+'.html'),'<!doctype html><meta charset="utf-8"><p>Stub transport; component DOM evidence only.</p>'+row.html);delete row.html;}
   fs.writeFileSync(path.join(directory,'result.json'),JSON.stringify(result,null,2)+'\n');fs.writeFileSync(path.join(directory,'browser.log'),logs.join('\n')+'\n');window.destroy();app.exit(result.fatal?2:0);}
  else if(Date.now()-started>90000){clearInterval(poll);fs.writeFileSync(path.join(directory,'fatal.txt'),'Browser harness timed out');fs.writeFileSync(path.join(directory,'browser.log'),logs.join('\n'));app.exit(3);}
 }catch(error){clearInterval(poll);fs.writeFileSync(path.join(directory,'fatal.txt'),String(error.stack||error));app.exit(4);}},25);
}).catch(error=>{fs.writeFileSync(path.join(directory,'fatal.txt'),String(error.stack||error));app.exit(5);});`;
 fs.writeFileSync(path.join(caseDir,'electron-main.cjs'),main);
 const electron=createRequire(import.meta.url)('electron') as string;
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const processResult=await new Promise<{code:number|null;stdout:string;stderr:string}>((resolve,reject)=>{
  const child=spawn(electron,[path.join(caseDir,'electron-main.cjs'),'--no-sandbox'],{cwd:caseDir,windowsHide:true,env,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';
  child.stdout.on('data',chunk=>{stdout+=String(chunk);});child.stderr.on('data',chunk=>{stderr+=String(chunk);});child.once('error',reject);child.once('close',code=>resolve({code,stdout,stderr}));
 });
 fs.writeFileSync(path.join(caseDir,'process.log'),JSON.stringify(processResult,null,2)+'\n');
 expect(processResult.code,'Electron evidence: '+caseDir+'; '+(fs.existsSync(path.join(caseDir,'fatal.txt'))?fs.readFileSync(path.join(caseDir,'fatal.txt'),'utf8'):processResult.stderr.slice(-2000))).toBe(0);
 result=JSON.parse(fs.readFileSync(path.join(caseDir,'result.json'),'utf8')) as BrowserResult;
 expect(result.fatal).toBeUndefined();expect(result.cases.map(row=>row.id)).toEqual(ids);
 console.info('M920_DOM_EVIDENCE '+JSON.stringify({caseDir,scope,cases:result.cases.map(row=>({id:row.id,status:row.status,assertions:row.assertions,error:row.error})),runtime:result.runtime}));
},120000);

describe('M920 actual Chromium ReactDOM StrictMode; stub transport, no real service/Store/App acceptance',()=>{
 for(const id of ids)it(id,()=>{const row=result.cases.find(item=>item.id===id);expect(row,'Missing DOM case '+id).toBeDefined();expect(row?.error,'Evidence: '+caseDir).toBeUndefined();expect(row?.status).toBe('passed');expect(row!.assertions).toBeGreaterThan(0);});
});
