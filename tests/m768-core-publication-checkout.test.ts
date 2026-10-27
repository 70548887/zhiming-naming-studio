import {expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {buildRootFeedbackV132R2} from '../scripts/build-root-feedback-v132-r2.mjs';
import pins from '../src/main/bazi-root-feedback-v132-r2-pins.json';
import manifest from '../assets/bazi-root-feedback/1.3.2-r2/resource-manifest.json';

const root=process.cwd(),publication='assets/bazi-root-feedback/1.3.2-r2/';
const tracked=new Set(execFileSync('git',['ls-files','-z','--',publication],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean));
const digest=(value:Uint8Array)=>createHash('sha256').update(value).digest('hex');

it('owns every fixed publication file in Git, including the nested vendor payload',()=>{
 const missing=manifest.files.map(row=>publication+row.path).filter(file=>!tracked.has(file));
 expect(missing,'A fresh checkout must contain every resource required by the fixed publication.').toEqual([]);
});

it('builds the fixed facade from Git publication bytes without unpublished working-directory files',async()=>{
 const checkout=fs.mkdtempSync(path.join(os.tmpdir(),'naming-m768-checkout-'));
 const relative=path.relative(root,checkout);
 expect(path.isAbsolute(relative)||relative==='..'||relative.startsWith('..'+path.sep),'Build evidence must remain outside the frozen checkout.').toBe(true);
 for(const row of pins.closure.files){
  const target=path.join(checkout,row.sourcePath);fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.copyFileSync(path.join(root,row.sourcePath),target);
 }
 const pinPath='src/main/bazi-root-feedback-v132-r2-pins.json';
 fs.copyFileSync(path.join(root,pinPath),path.join(checkout,pinPath));
 for(const file of tracked){
  const target=path.join(checkout,file);fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,execFileSync('git',['show',':'+file],{cwd:root,maxBuffer:4*1024*1024}));
 }
 const receipt=await buildRootFeedbackV132R2({root:checkout,outfile:path.join(checkout,'out/root-feedback.cjs')});
 expect(receipt.identity.fullClosureSha256).toBe(pins.fullClosureSha256);
 expect(receipt.identity.manifestSha256).toBe(pins.manifestSha256);
 expect(receipt.compiledExecutionSources).toHaveLength(pins.closure.executionInputs.length);
 expect(digest(fs.readFileSync(path.join(checkout,'out/root-feedback.cjs')))).toBe(receipt.output.sha256);
},30000);
