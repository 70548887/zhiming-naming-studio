import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';

const root=process.cwd(),base=path.resolve('.local/m920-candidate2-lifecycle');fs.mkdirSync(base,{recursive:true});
const directory=fs.mkdtempSync(path.join(base,'dom-')),resultFile=path.join(directory,'result.json');
await build({entryPoints:[path.join(root,'tests/helpers/m920-candidate2-dom-entry.tsx')],outfile:path.join(directory,'entry.js'),bundle:true,platform:'browser',format:'iife',define:{'process.env.NODE_ENV':'"development"'},loader:{'.css':'empty'},logLevel:'silent'});
fs.writeFileSync(path.join(directory,'index.html'),'<!doctype html><meta charset="utf-8"><title>M920 real ReactDOM lifecycle</title><script defer src="entry.js"></script>');
fs.writeFileSync(path.join(directory,'main.cjs'),String.raw`
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path');
app.disableHardwareAcceleration();app.commandLine.appendSwitch('disable-gpu');
let finished=false;const finish=(result,code)=>{if(finished)return;finished=true;fs.writeFileSync(path.join(__dirname,'result.json'),JSON.stringify(result,null,2));app.exit(code);};
app.whenReady().then(async()=>{const window=new BrowserWindow({show:false,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});await window.loadFile(path.join(__dirname,'index.html'));const result=await window.webContents.executeJavaScript('window.__m920Result');finish(result,result?.passed?0:1);}).catch(error=>finish({passed:false,error:String(error.stack||error)},1));
setTimeout(()=>finish({passed:false,error:'ReactDOM lifecycle harness timed out'},1),25000);
`);
const require=createRequire(import.meta.url),env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
try{execFileSync(require('electron'),[path.join(directory,'main.cjs')],{cwd:root,env,encoding:'utf8',timeout:35000,windowsHide:true,stdio:'pipe'});}catch(error){if(fs.existsSync(resultFile))process.stderr.write(fs.readFileSync(resultFile,'utf8'));throw error;}
const result=JSON.parse(fs.readFileSync(resultFile,'utf8'));assert(result.passed,result.error);assert.equal(result.cases.length,9);assert(result.cases.every(value=>value.passed));assert.deepEqual(result.errors,[]);assert.deepEqual(result.unhandled,[]);
process.stdout.write(JSON.stringify({...result,resultFile}));
