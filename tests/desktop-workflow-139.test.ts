import {projectCurrentMainTo145Publication,invokeCurrentRestore} from './helpers/smoke-main-preservation';
import {describe,it,expect} from 'vitest';import fs from 'node:fs';import path from 'node:path';import {tmpdir} from 'node:os';import {runInNewContext} from 'node:vm';import {createHash} from 'node:crypto';import ts from 'typescript';
import {DESKTOP139_CASES,desktop139Inputs,desktop139YueChoice,desktop139ElementChoices,verifyDesktop139Resources} from '../src/main/smoke-desktop-workflow-139';import type {NamingSession} from '../src/shared/types';
const root=process.cwd(),expected=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/desktop-workflow-139-main-contract.json'),'utf8')).hashes as Record<string,string>;
const digest=(value:string)=>createHash('sha256').update(value.replaceAll('\r\n','\n')).digest('hex');
function guard(env:Record<string,string|undefined>){const events:string[]=[],exports={},process={env,platform:'win32',stderr:{write:()=>{events.push('stderr');}},exitCode:undefined as number|undefined,exit:(code:number)=>events.push('exit:'+code)};
 const app=new Proxy({},{get:(_target,key)=>{if(key==='getAppPath')return()=>{events.push('app.getAppPath');if(env.NAMING_STUDIO_DESKTOP_WORKFLOW==='139'&&env.NAMING_STUDIO_SMOKE_SCOPE==='naming-v7')return root;throw Error('TEST_STOP_BEFORE_STARTUP');};if(key==='exit')return(code:number)=>events.push('app.exit:'+code);return()=>events.push('app.'+String(key));}});
 const require=(id:string):unknown=>{if(id==='electron')return{app};if(id==='./smoke-naming-v7-preflight')return{isNamingV7SmokeRequested:()=>env.NAMING_STUDIO_SMOKE_SCOPE==='naming-v7'||env.NAMING_STUDIO_V7_LEGACY_SQL!==undefined||env.NAMING_STUDIO_V7_LEGACY_PROVENANCE!==undefined,preflightNamingV7Smoke:()=>{events.push('preflight');return{kind:'test-ticket'};},assertNamingV7SmokeContext:()=>events.push('assert-context'),writeNamingV7SmokeArtifact:()=>events.push('write-artifact')};return new Proxy({},{get:()=>()=>{throw Error('Unrequested dependency executed:'+id);}});};
 let error='';try{runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'src/main/main.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,module:{exports},require,process,console,setTimeout,clearTimeout,__dirname:path.join(root,'test-module')});}catch(caught){error=String(caught);}return{events,error,exitCode:process.exitCode};
}
function methods(source:string){const ast=ts.createSourceFile('main.ts',source,ts.ScriptTarget.Latest,true),map=new Map<string,string>();function visit(node:ts.Node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='exportPDF')map.set('printer',node.getText(ast));if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='register'&&ts.isStringLiteral(node.arguments[0]))map.set(node.arguments[0].text,node.getText(ast));if(ts.isIfStatement(node)){const condition=node.expression.getText(ast),match=/^process\.env\.NAMING_STUDIO_SMOKE_SCOPE==='([^']+)'$/.exec(condition);if(match&&match[1]!=='naming-v7')map.set('scope:'+match[1],node.getText(ast));}ts.forEachChild(node,visit);}visit(ast);return map;}

describe('D01-139 prepared desktop smoke contract; no native acceptance',()=>{
 it('rejects a defined wrong marker or foreign scope before application paths, Store or any writes',()=>{
  for(const [marker,scope]of [['0','naming-v7'],['','naming-v7'],['139','naming-v6'],['139',undefined],['typo',undefined]]){const result=guard({NAMING_STUDIO_DESKTOP_WORKFLOW:marker,NAMING_STUDIO_SMOKE_SCOPE:scope});expect(result.events).toContain('stderr');expect(result.events).toContain('exit:1');expect(result.events).not.toContain('app.getAppPath');expect(result.events).not.toContain('preflight');expect(result.events).not.toContain('write-artifact');expect(result.exitCode).toBe(1);}
 });
 it('does not activate the new route on normal startup and still uses the real preflight gate for the matching marker',()=>{
  const normal=guard({});expect(normal.events).toEqual(['app.getAppPath']);expect(normal.error).toContain('TEST_STOP_BEFORE_STARTUP');const enabled=guard({NAMING_STUDIO_DESKTOP_WORKFLOW:'139',NAMING_STUDIO_SMOKE_SCOPE:'naming-v7'});expect(enabled.events.indexOf('preflight')).toBeLessThan(enabled.events.indexOf('app.getAppPath'));expect(enabled.events).toContain('assert-context');
 });
 it('keeps the actual PDF printer and original normal dialog callback bodies and seven old scope bodies exact',()=>{
  const next=methods(projectCurrentMainTo145Publication(fs.readFileSync(path.join(root,'src/main/main.ts'),'utf8')));expect(digest(next.get('printer')!)).toBe(expected.printer);
  for(const name of ['exportReport','backup','restore']){const onlyNew=next.get(name)!.replace(/if\(desktop139Files\)return desktop139Files\.(?:report\(canonical\)|backup\(\)|restore\(\));/,'');expect(digest(onlyNew)).toBe(expected[name]);}
  const old=Object.keys(expected).filter(key=>key.startsWith('scope:'));expect(old).toHaveLength(7);for(const name of old)expect(digest(next.get(name)!)).toBe(expected[name]);
 });
 it('builds only virtual family requests with independent coverage and an actual unknown-time input, never mock results',()=>{
  const characters=[...'斐然安枫清其他文舟若兰'].map(char=>({char}));for(const item of DESKTOP139_CASES){const {profile,preferences}=desktop139Inputs(item.key,characters);expect(profile.fatherName).toBe('林文舟');expect(profile.motherName).toBe('陈若兰');expect(preferences.avoidParentNames).toBe(true);expect(preferences.generationChar+preferences.requiredChars).toBe(item.name);expect([...item.name].some(char=>preferences.forbiddenChars.includes(char))).toBe(false);expect(preferences.namePhonetics?.yue?.version).toBe('yue-homophone-review/1.2.0');expect(profile.timeUnknown).toBe(item.timeUnknown);expect(profile.birthTime).toBe(item.timeUnknown?'':'09:30');expect(profile).not.toHaveProperty('analysis');}
  expect(DESKTOP139_CASES.find(item=>item.name==='斐然')).toMatchObject({meaning:'available',word:'no-covered-word'});expect(DESKTOP139_CASES.find(item=>item.name==='安然')).toMatchObject({meaning:'not-covered',word:'source-word-reference',timeUnknown:true});
 });
 it('uses only supplied saved reading candidates and returns uncovered instead of inventing an absent reading',()=>{
  const unit=(text:string,id:string)=>({text,candidates:[{id,tokens:[id]}]}),session={candidates:[{yueReading:{surname:unit('林','lam4'),given:[unit('安','on1'),unit('然','jin4')]}}]} as unknown as NamingSession;
  expect(desktop139YueChoice(session)).toEqual({surname:{tokens:['lam4'],origin:'dictionary',confirmed:true,dictionaryId:'lam4'},given:[{tokens:['on1'],origin:'dictionary',confirmed:true,dictionaryId:'on1'},{tokens:['jin4'],origin:'dictionary',confirmed:true,dictionaryId:'jin4'}]});session.candidates[0].yueReading!.given[1].candidates=[];expect(desktop139YueChoice(session)).toBeNull();
 });
 it('uses existing exact evidence IDs for element confirmation and keeps missing evidence explicitly not-applicable',()=>{
  const session={candidates:[{elementAssessment:{rows:[{position:1,assessment:{matchingSourceCandidates:[{evidenceId:'actual-saved-option'}]}},{position:2,assessment:{matchingSourceCandidates:[]}}]}}]} as unknown as NamingSession;
  expect(desktop139ElementChoices(session,true)).toEqual([{position:1,decision:'confirmed',confirmedEvidenceIds:['actual-saved-option']},{position:2,decision:'not-applicable',confirmedEvidenceIds:[]}]);expect(desktop139ElementChoices(session,false).every(row=>row.decision==='not-applicable'&&row.confirmedEvidenceIds.length===0)).toBe(true);
 });
 it('requires the declared actual app resources, with no source-tree fallback, before native scenarios can proceed',()=>{
  const parent=fs.realpathSync.native(tmpdir()),directory=fs.mkdtempSync(path.join(parent,'desktop139-resource-negative-'));try{expect(()=>verifyDesktop139Resources(directory)).toThrow(/ENOENT/);expect(fs.readdirSync(directory)).toEqual([]);}finally{if(!path.resolve(directory).startsWith(parent+path.sep))throw Error('Unsafe cleanup');fs.rmSync(directory,{recursive:true,force:true});}
 });
});

// Current behavior is exercised from the actual AST callback and real bounded
// reader module under a tiny VM filesystem; no App, database or SQL is opened.
describe('current native restore delta remains explicit beside historical139 golden',()=>{
 const currentMain=()=>fs.readFileSync(path.join(root,'src/main/main.ts'),'utf8');
 it('rejects any unreviewed current-main change instead of repinning the historical endpoint',()=>{
  expect(()=>projectCurrentMainTo145Publication(currentMain()+'\n// unreviewed extra body\n')).toThrow(/Unexpected actual current main bytes/);
 });
 it('cancellation and empty chooser return before confirmation or backup file access',async()=>{
  for(const options of [{canceled:true},{paths:[]}]){const result=await invokeCurrentRestore(currentMain(),options);expect(result.value).toBe(false);expect(result.error).toBeUndefined();expect(result.events).toEqual(['chooser']);}
  const declined=await invokeCurrentRestore(currentMain(),{confirmation:0});expect(declined.value).toBe(false);expect(declined.events).toEqual(['chooser','confirmation']);
 });
 it('passes the actual bounded-reader bytes to restore and closes the descriptor',async()=>{
  const result=await invokeCurrentRestore(currentMain());expect(result.error).toBeUndefined();expect(result.value).toBe(true);expect(result.events).toContain('reader.open:owned-backup.sqlite:r');expect(result.events).toContain('reader.read');expect(result.events).toContain('reader.close:7');expect(result.events.at(-1)).toBe('store.restore');
 });
 it('rejects an oversized backup before allocation/read/restore while closing its descriptor',async()=>{
  const result=await invokeCurrentRestore(currentMain(),{readerSize:200*1024*1024+1});expect(String(result.error)).toMatch(/200MiB/);expect(result.events).toContain('reader.close:7');expect(result.events).not.toContain('reader.read');expect(result.events).not.toContain('store.restore');
 });
 it('returns a warning only for the exact committed restore error and rethrows every other result',async()=>{
  const committed=Object.assign(new Error('owned committed cleanup error'),{code:'CUSTOMER_STORAGE_RESTORE_COMMITTED',operation:'restore',committed:true,installed:true});
  const accepted=await invokeCurrentRestore(currentMain(),{restoreError:committed});expect(accepted.error).toBeUndefined();expect(accepted.value).toEqual({status:'committed-with-warning',warning:'客户备份已恢复，新客户库已启用；后续收尾发生错误。请关闭并重新打开应用，核对当前档案。'});
  const ordinary=new Error('uncommitted source error'),wrongOperation={...committed,operation:'backup'},notInstalled={...committed,installed:false};
  for(const error of [ordinary,wrongOperation,notInstalled])expect((await invokeCurrentRestore(currentMain(),{restoreError:error})).error).toBe(error);
  let getterCalls=0;const accessor={operation:'restore',committed:true,installed:true};Object.defineProperty(accessor,'code',{get(){getterCalls++;return'CUSTOMER_STORAGE_RESTORE_COMMITTED';},enumerable:true});
  expect((await invokeCurrentRestore(currentMain(),{restoreError:accessor})).error).toBe(accessor);expect(getterCalls).toBe(0);
 });
 it('uses the actual notice scope and register transport without upgrading result or lookalike errors',async()=>{
  const scoped=await invokeCurrentRestore(currentMain(),{noticeKind:'committed-cleanup'});expect(scoped.error).toBeUndefined();expect(scoped.value).toBe(true);expect(scoped.notices).toHaveLength(1);expect(scoped.notices[0]).toMatchObject({schema:'customer-write-notice/1',kind:'committed-cleanup',requiresRestart:true});
  const lookalike=Object.assign(new Error('typed restore warning remains business-owned'),{code:'CUSTOMER_STORAGE_RESTORE_COMMITTED',operation:'restore',committed:true,installed:true});
  const notScopeProof=await invokeCurrentRestore(currentMain(),{restoreError:lookalike});expect(notScopeProof.error).toBeUndefined();expect(notScopeProof.value).toMatchObject({status:'committed-with-warning'});expect(notScopeProof.notices).toEqual([]);
  const primary=new Error('primary restore failure');const failed=await invokeCurrentRestore(currentMain(),{restoreError:primary,noticeKind:'failed-cleanup',publishThrows:true});expect(failed.error).toBe(primary);expect(failed.notices).toEqual([]);
 });
});
