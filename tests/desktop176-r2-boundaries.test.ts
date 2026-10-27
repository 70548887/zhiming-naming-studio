import {expect,it,vi} from 'vitest';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import {assertDesktop176PhasePolicy,assertDesktop176OnboardingObservation,assertDesktop176ExerciseProcessSource,type Desktop176ExerciseExit} from '../src/main/smoke-desktop-workflow-176-contract';
import {assertDesktop176PhaseMethod,assertDesktop176UserDataIsolation} from '../src/main/smoke-desktop-workflow-176-context';
import {dismissGuide,readGuidePreference,GUIDE_STORAGE_KEY} from '../src/renderer/FirstUseGuide';
it('orders the shared resume policy before handlers: export/save/generate/restore/backup all make zero handler calls',()=>{
 for(const method of ['exportReport','saveSession','generate','restore','backup']){const handler=vi.fn();expect(()=>{assertDesktop176PhasePolicy('resume',method);handler();}).toThrow('resume只允许');expect(handler).not.toHaveBeenCalled();}
 for(const method of ['bootstrap','listHistory']){const handler=vi.fn();assertDesktop176PhasePolicy('resume',method);handler();expect(handler).toHaveBeenCalledTimes(1);}
 for(const method of ['exportReport','saveSession','generate','restore','backup'])expect(()=>assertDesktop176PhasePolicy('exercise',method)).not.toThrow();
});
it('keeps private context authentication in front of the method policy; a client-shaped resume ticket never calls a handler',()=>{
 for(const method of ['bootstrap','listHistory','exportReport','saveSession','generate','restore','backup']){const handler=vi.fn();expect(()=>{assertDesktop176PhaseMethod({kind:'desktop176-context/1',plan:{phaseID:'resume'}} as any,method);handler();}).toThrow('票据');expect(handler).not.toHaveBeenCalled();}
 expect(()=>assertDesktop176PhasePolicy('unknown' as any,'bootstrap')).toThrow();expect(()=>assertDesktop176PhasePolicy('resume','bootstrap ')).toThrow();
});
it('rejects an empty normal default root, its descendants and a real junction alias, while an owned sibling remains valid',()=>{
 const parent=fs.realpathSync.native(os.tmpdir()),directory=fs.realpathSync.native(fs.mkdtempSync(path.join(parent,'desktop176-normal-boundary-'))),normal=path.join(directory,'normal-default'),child=path.join(normal,'owned-looking-child'),sibling=path.join(directory,'owned-sibling'),alias=path.join(directory,'normal-alias');
 try{
  fs.mkdirSync(normal);fs.mkdirSync(sibling);expect(fs.readdirSync(normal)).toEqual([]);
  expect(()=>assertDesktop176UserDataIsolation(normal,normal)).toThrow('normal');expect(fs.readdirSync(normal)).toEqual([]);
  fs.mkdirSync(child);expect(()=>assertDesktop176UserDataIsolation(normal,child)).toThrow('normal');expect(()=>assertDesktop176UserDataIsolation(normal,sibling)).not.toThrow();
  fs.symlinkSync(normal,alias,'junction');expect(()=>assertDesktop176UserDataIsolation(normal,alias)).toThrow('normal');
  expect(()=>assertDesktop176UserDataIsolation(path.join(directory,'not-created-normal'),sibling)).not.toThrow();
 }finally{if(path.dirname(directory)!==parent||!path.basename(directory).startsWith('desktop176-normal-boundary-')||fs.lstatSync(directory).isSymbolicLink())throw Error('Unsafe normal boundary fixture cleanup');fs.rmSync(directory,{recursive:true,force:false});}
});
it('observes the real production dismiss helper preference across phases, without prewriting a user-read value in the new176 code',()=>{
 const values=new Map<string,string>(),writes:[string,string][]=[];
 const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{writes.push([key,value]);values.set(key,value);}};
 expect(readGuidePreference(storage).dismissed).toBe(false);expect(dismissGuide(storage)).toBe('');expect(readGuidePreference(storage).dismissed).toBe(true);
 const exercise=assertDesktop176OnboardingObservation({storageKey:GUIDE_STORAGE_KEY,rawValue:storage.getItem(GUIDE_STORAGE_KEY),guideVisible:false},'exercise');
 const resume=assertDesktop176OnboardingObservation({storageKey:GUIDE_STORAGE_KEY,rawValue:storage.getItem(GUIDE_STORAGE_KEY),guideVisible:false},'resume',exercise);
 expect(resume.rawValue).toBe(exercise.rawValue);expect(resume.phaseID).toBe('resume');expect(writes).toEqual([[GUIDE_STORAGE_KEY,'{"version":1,"dismissed":true}']]);
 // This invokes the production local preference helper only; no DOM click/App was executed.
});
it('rejects failed persistence, missing/corrupt preferences, a still-open guide and a changed resume value instead of inventing completion',()=>{
 const failed={getItem:()=>null,setItem(){throw Error('private fixture storage failure');}};expect(dismissGuide(failed)).toContain('未能保存');
 for(const rawValue of [null,'{bad','{"version":1,"dismissed":false}','{"version":1,"dismissed":true,"customer":"not-a-guide-flag"}'])expect(()=>assertDesktop176OnboardingObservation({storageKey:GUIDE_STORAGE_KEY,rawValue,guideVisible:false},'exercise')).toThrow();
 const valid={storageKey:GUIDE_STORAGE_KEY,rawValue:'{"version":1,"dismissed":true}',guideVisible:false},exercise=assertDesktop176OnboardingObservation(valid,'exercise');
 expect(()=>assertDesktop176OnboardingObservation({...valid,guideVisible:true},'resume',exercise)).toThrow();
 expect(()=>assertDesktop176OnboardingObservation({...valid,rawValue:'{"dismissed":true,"version":1}'},'resume',exercise)).toThrow('不同于exercise');
});
it('requires postreceipt to bind the separate original stage process P with exact executable/result/test-freeze refs',()=>{
 const ref=(file:string)=>({file:'C:/component-only/'+file,sha256:'a'.repeat(64),bytes:10});
 const exit:Desktop176ExerciseExit={schema:'naming-studio-desktop176-process/1',appVersion:'1.0.38',phaseID:'exercise',mode:'Development',pid:100,exitCode:0,naturalExit:true,startedAt:'2026-10-23T00:00:00.000Z',terminalAt:'2026-10-23T00:01:00.000Z',completedAt:'2026-10-23T00:01:01.000Z',executable:ref('exe'),userData:'C:/component-only/owned',inputFreeze:ref('test-freeze'),workflowSource:ref('workflow'),result:ref('raw-result'),stageProcess:ref('original-P')};
 const P={schema:'naming-studio-smoke-process/1',version:'1.0.38',mode:'Development',status:'completed',pid:100,exitCode:0,signal:null,launchError:null,executable:exit.executable,result:exit.result,sourceFreeze:exit.inputFreeze};
 expect(()=>assertDesktop176ExerciseProcessSource(exit,P)).not.toThrow();
 for(const mutate of [(value:any)=>{value.pid=101;},(value:any)=>{value.result.file='C:/wrong-naming-v7-result';},(value:any)=>{value.sourceFreeze.file='C:/publication-freeze';},(value:any)=>{value.executable.bytes=11;},(value:any)=>{delete value.result;value.workflowResult=exit.result;},(value:any)=>{value.schema='naming-studio-desktop176-process/1';}]){const changed=structuredClone(P);mutate(changed);expect(()=>assertDesktop176ExerciseProcessSource(exit,changed)).toThrow();}
 const missing=structuredClone(exit);delete (missing as any).stageProcess;expect(()=>assertDesktop176ExerciseProcessSource(missing,P)).toThrow();
 // These are source-binding protocol fixtures, not actual process execution records.
});
