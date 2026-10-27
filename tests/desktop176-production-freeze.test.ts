import {afterAll,beforeAll,expect,it} from 'vitest';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {pathToFileURL} from 'node:url';
import {parseDesktop176TestInputFreeze,type Desktop176TestInputFreeze,type Desktop176Inputs} from '../src/main/smoke-desktop-workflow-176-contract';
import {assertDesktop176MaterialBinding,checkFullRegression} from '../src/main/smoke-desktop-workflow-176';
import {desktop176FileRef} from '../src/main/smoke-desktop-workflow-176-context';
import type {Desktop176Context} from '../src/main/smoke-desktop-workflow-176-context';
const root=process.cwd(),parent=fs.realpathSync.native(os.tmpdir());
let directory:string,freeze:Desktop176TestInputFreeze,freezeRef:ReturnType<typeof desktop176FileRef>,plan:Desktop176Inputs,readFreeze:(...args:any[])=>Promise<unknown>,sequence=0;
const keys=['src/main/smoke-desktop-workflow-176.ts','src/shared/naming-element-application.ts','tests/naming-v71-service-core.test.ts'] as const;
function compileSentinel(value:Desktop176TestInputFreeze){
 // @ts-expect-error Production files[path] is a SHA string; object-property access must remain a compile error.
 const invalid=value.files[keys[0]].sha256;
 return invalid;
}
void compileSentinel;
function writeJson(name:string,value:unknown){const file=path.join(directory,'verification-output',name);fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');return desktop176FileRef(file);}
function fullRegressionContext(ref:ReturnType<typeof desktop176FileRef>):Desktop176Context{
 const count=++sequence,report=writeJson('suite-'+count+'.json',{componentContractFixture:true,success:true,testResults:[{name:path.join(directory,keys[2]),assertionResults:Array.from({length:12},(_,index)=>({status:'passed',title:index<8?'actual71 characters batch '+(index+1)+'/8 [component-only]':'component-only lifecycle '+index}))}]}),capture=writeJson('capture-'+count+'.json',{componentContractFixture:true,status:'completed',exitCode:0,signal:null,sourceFreeze:ref,freezeAfter:ref});
 return{kind:'desktop176-context/1',out:'unused-component-context',userData:'unused-component-context',prefix:'unused-component-context',plan:{...plan,inputFreeze:ref,fortyLifecycleEvidence:{suite:keys[2],inputFreeze:ref,testSource:desktop176FileRef(path.join(directory,keys[2])),report,commandCapture:capture}}} as Desktop176Context;
}
beforeAll(async()=>{
 directory=fs.realpathSync.native(fs.mkdtempSync(path.join(parent,'desktop176-real-freeze-')));
 for(const key of keys){const file=path.join(directory,key);fs.mkdirSync(path.dirname(file),{recursive:true});if(key===keys[0])fs.writeFileSync(file,'// Component producer fixture; no native execution.\n');else fs.copyFileSync(path.join(root,key),file);}
 fs.mkdirSync(path.join(directory,'verification-output'));fs.writeFileSync(path.join(directory,'package.json'),JSON.stringify({version:'1.0.38',build:{files:['src/**/*','tests/**/*']}}));fs.writeFileSync(path.join(directory,'package-lock.json'),'{}\n');fs.writeFileSync(path.join(directory,'README.md'),'Component fixture for the real freeze producer.\n');fs.writeFileSync(path.join(directory,'index.html'),'<!doctype html><title>Component only</title>');
 const producer=await import(pathToFileURL(path.join(root,'scripts/verification/release-capture.mjs')).href);readFreeze=producer.readFreeze;
 freezeRef=await producer.freezeInputs({root:directory,version:'1.0.38',output:'verification-output/actual-produced-freeze.json',phase:'test'});
 freeze=parseDesktop176TestInputFreeze(JSON.parse(fs.readFileSync(freezeRef.file,'utf8')));
 const actual=(file:string)=>desktop176FileRef(path.join(root,file));
 plan={schema:'desktop176-input-plan/1',appVersion:'1.0.38',mode:'Development',phaseID:'exercise',inputFreeze:freezeRef,workflowSource:desktop176FileRef(path.join(directory,keys[0])),materialIdentity:{resourceContract:actual('scripts/verification/review-resources-138.json'),rootFeedbackManifest:actual('assets/bazi-root-feedback/1.3.1/resource-manifest.json'),naming71Profile:actual('data/naming-character-meanings-v7.1-profile.json'),naming71Admission:actual('data/naming-character-meanings-v7.1-admission.json'),naming71Lock:actual('data/naming-character-meanings-v7.1-source-lock.json'),parentMethod:actual('data/parent-name-phonetics-method-v1.json'),applicationTupleSource:desktop176FileRef(path.join(directory,keys[1]))}} as Desktop176Inputs;
},15000);
afterAll(()=>{if(directory){if(path.dirname(directory)!==parent||!path.basename(directory).startsWith('desktop176-real-freeze-')||fs.lstatSync(directory).isSymbolicLink())throw Error('Unsafe producer fixture cleanup');fs.rmSync(directory,{recursive:true,force:false});}});
it('accepts the real production freezeInputs string-map and both material bindings without an App or IPC call',async()=>{
 expect(freeze.schema).toBe('naming-studio-test-input-freeze/1');for(const key of keys)expect(typeof freeze.files[key]).toBe('string');
 await expect(readFreeze(directory,freezeRef.file,'1.0.38',freezeRef.sha256)).resolves.toHaveProperty('value.files');
 expect(()=>assertDesktop176MaterialBinding(plan)).not.toThrow();
 expect(Object.isFrozen(freeze.files)).toBe(true);
});
it('accepts the suite-source binding from that same production string-map on the actual full-regression reader',()=>{
 const result=checkFullRegression(fullRegressionContext(freezeRef));expect(result.suite).toBe(keys[2]);expect(result.characterCount).toBe(40);
 // The report/capture here are protocol fixtures, not an execution claim for the real40 suite.
 expect(result.scope).toBe('separate-final-full-regression-not-desktop40-generation');
});
it('rejects the prior object-map mistake at workflow, tuple and suite keys consistently with the production reader',async()=>{
 for(const key of keys){const bad:any=JSON.parse(fs.readFileSync(freezeRef.file,'utf8'));bad.files[key]={sha256:bad.files[key]};const ref=writeJson('object-'+(++sequence)+'.json',bad);
  expect(()=>parseDesktop176TestInputFreeze(bad)).toThrow(/SHA字符串|拒绝对象/);await expect(readFreeze(directory,ref.file,'1.0.38',ref.sha256)).rejects.toThrow('Invalid frozen SHA256');
  expect(()=>assertDesktop176MaterialBinding({...plan,inputFreeze:ref})).toThrow(/SHA字符串|拒绝对象/);
  expect(()=>checkFullRegression(fullRegressionContext(ref))).toThrow(/SHA字符串|拒绝对象/);
 }
});
it('rejects missing relevant entries at their exact workflow, tuple or suite binding instead of silently accepting undefined',()=>{
 for(const key of keys){const bad:any=JSON.parse(fs.readFileSync(freezeRef.file,'utf8'));delete bad.files[key];const ref=writeJson('missing-'+(++sequence)+'.json',bad);
  if(key===keys[2])expect(()=>checkFullRegression(fullRegressionContext(ref))).toThrow('suite源码没有绑定');
  else expect(()=>assertDesktop176MaterialBinding({...plan,inputFreeze:ref})).toThrow(key===keys[0]?'工作流源码没有绑定':'tuple源码不属于');
 }
});
it('rejects non-SHA strings, numeric values, null, alternate schemas and an empty map before any IPC-capable stage',()=>{
 for(const value of ['bad-sha',17,null]){const bad:any=JSON.parse(fs.readFileSync(freezeRef.file,'utf8'));bad.files[keys[0]]=value;expect(()=>parseDesktop176TestInputFreeze(bad)).toThrow();}
 for(const mutate of [(bad:any)=>{bad.files={};},(bad:any)=>{bad.schema='naming-studio-source-freeze/1';},(bad:any)=>{bad.version='1.0.37';}]){const bad:any=JSON.parse(fs.readFileSync(freezeRef.file,'utf8'));mutate(bad);expect(()=>parseDesktop176TestInputFreeze(bad)).toThrow();}
});
