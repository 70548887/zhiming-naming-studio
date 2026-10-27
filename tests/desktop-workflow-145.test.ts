import {projectCurrentMainTo145Publication} from './helpers/smoke-main-preservation';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import{createHash}from'node:crypto';import{runInNewContext}from'node:vm';import ts from'typescript';
import{DESKTOP145_MARKER,DESKTOP145_CASES,desktop145Inputs,desktop145YueChoice,desktop145ElementChoices,verifyDesktop145Resources,assertDesktop145RecordedHistoryRestored}from'../src/main/smoke-desktop-workflow-145';
import{canonicalPlainJson}from'../src/shared/plain-json';
import{DESKTOP139_CASES,desktop139Inputs,desktop139YueChoice,desktop139ElementChoices}from'../src/main/smoke-desktop-workflow-139';
import type{NamingSession,SessionRevision}from'../src/shared/types';
import contract from'../scripts/verification/review-resources-137.json';
import preservation from'./fixtures/desktop-workflow-145-preservation.json';
const root=process.cwd(),hash=(v:string|Uint8Array)=>createHash('sha256').update(v).digest('hex');
const original=()=>fs.readFileSync(path.join(root,'src/main/smoke-desktop-workflow-139.ts'),'utf8');
const helper=()=>fs.readFileSync(path.join(root,'src/main/smoke-desktop-workflow-145.ts'),'utf8');
let directory:string;const parent=fs.realpathSync.native(os.tmpdir());
afterAll(()=>{if(directory){if(!directory.startsWith(parent+path.sep))throw Error('Unsafe resource fixture cleanup');fs.rmSync(directory,{recursive:true,force:true});}});
function guard(env:Record<string,string|undefined>){
 const events:string[]=[],exports={},process={env,platform:'win32',stderr:{write:()=>events.push('stderr')},exitCode:undefined as number|undefined,exit:(code:number)=>events.push('exit:'+code)};
 const app=new Proxy({},{get:(_target,key)=>{if(key==='getAppPath')return()=>{events.push('app.getAppPath');if(['139','145'].includes(env.NAMING_STUDIO_DESKTOP_WORKFLOW??'')&&env.NAMING_STUDIO_SMOKE_SCOPE==='naming-v7')return root;throw Error('STOP_BEFORE_STARTUP');};if(key==='exit')return(code:number)=>events.push('app.exit:'+code);return()=>events.push('app.'+String(key));}});
 const require=(id:string):unknown=>{if(id==='electron')return{app};if(id==='./smoke-naming-v7-preflight')return{isNamingV7SmokeRequested:()=>env.NAMING_STUDIO_SMOKE_SCOPE==='naming-v7',preflightNamingV7Smoke:()=>{events.push('preflight');return{kind:'test-ticket'};},assertNamingV7SmokeContext:()=>events.push('assert-context'),writeNamingV7SmokeArtifact:()=>events.push('write-artifact')};return new Proxy({},{get:()=>()=>{throw Error('Unrequested dependency executed:'+id);}});};
 let error='';try{runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'src/main/main.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,module:{exports},require,process,console,setTimeout,clearTimeout,__dirname:path.join(root,'test-module')});}catch(caught){error=String(caught);}return{events,error,exitCode:process.exitCode};
}

describe('exact145 helper preparation; no native runtime acceptance',()=>{
 beforeAll(()=>{directory=fs.realpathSync.native(fs.mkdtempSync(path.join(parent,'desktop145-resources-')));for(const file of Object.keys(contract.files)){const target=path.join(directory,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,file),target);fs.chmodSync(target,0o600);}});
 it('is an independent exact37 marker and retains three original scenario coverage inputs',()=>{
  expect(DESKTOP145_MARKER).toBe('145');expect(DESKTOP145_CASES).toEqual(DESKTOP139_CASES);
  for(const item of DESKTOP145_CASES){const chars=[...'斐然安枫清其他文舟若兰'].map(char=>({char})),old=desktop139Inputs(item.key,chars),next=desktop145Inputs(item.key,chars);expect(JSON.parse(JSON.stringify(next).replaceAll('145','139'))).toEqual(old);}
 });
 it('reconstructs the entire original139 source from the reviewed transformations with no other body changes',()=>{
  let text=helper();for(const edit of [...preservation.helperTransformations].reverse()){if(edit.kind==='global'){expect(text.split(edit.after).length-1).toBe(edit.count);text=text.split(edit.after).join(edit.before);}else{expect(text.split(edit.after)).toHaveLength(2);text=text.replace(edit.after,edit.before);}}
  expect(text).toBe(original());expect(hash(text)).toBe(preservation.original139Sha256);expect(hash(helper())).toBe(preservation.new145Sha256);
 });
 it('keeps every actual requireFact body, IPC sequence and renderer script except exact current-resource/source facts',()=>{
  const source=helper();expect(source).toContain("metadata.appVersion==='1.0.37'");expect(source).not.toContain("metadata.appVersion==='1.0.36'");
  expect(source).toContain("meaningContextReview?.source,{sourceId:'project-meaning-context-next-138-v1-1'");expect(source).toContain("sourceLockSha256:'473b1fb377bfeeb07c3cea800450e2ec88532b1678c9c590dcad650d8e3dd964'");
  expect(source).toContain("confirm-current-readings");expect(source).toContain("choose-context");expect(source).toContain("files.length===74");
  expect(source).not.toContain("v1-only-no-data1.1");expect(source.match(/meaningBatch:'v1-and-current-v1.1',currentMeaningDataVersion:'meaning-context-data\/1.1.0'/g)).toHaveLength(2);
  const facts=(text:string)=>text.match(/\bfact\(/g)?.length??0;expect(facts(source)).toBe(facts(original())+8);
  for(const marker of ["'generate'","'recordModernPracticalEvidence'","'clearModernPracticalEvidence'","'listHistory'","'restoreHistory'","'backup'","'restore'","'exportReport'","capture()","reports.length<DESKTOP145_CASES.length"])expect(source).toContain(marker);
 });
 it('reads all74 actual originals against the exact approved37 contract and current Store mapping',()=>{
  const receipt=verifyDesktop145Resources(directory);expect(receipt.applicationVersion).toBe('1.0.37');expect(receipt.files).toHaveLength(74);expect(receipt.contractSourceSha256).toBe(preservation.contractSourceSha256);expect(receipt.compiledContractObjectSha256).toBe(preservation.contractObjectSha256);expect(receipt.currentMeaningDataVersion).toBe('meaning-context-data/1.1.0');expect(receipt.meaningBatch).toBe('v1-and-current-v1.1');expect(receipt.excludedNextBatch).toEqual([]);
  expect(receipt.sourceReaders.find(r=>r.file==='src/main/store.ts')?.sha256).toBe('9740bff328c7d6af1d06ee10b0bb39329ccf9333385d505416b5cfa37e5bebf6');
 });
 it('rejects a missing or same-size altered real74 resource instead of falling back to source tree',()=>{
  const file=path.join(directory,'data/meaning-context-v1-1-manifest.json'),original=fs.readFileSync(file),changed=Buffer.from(original);changed[changed.length-1]^=1;fs.writeFileSync(file,changed);try{expect(()=>verifyDesktop145Resources(directory)).toThrow('实际应用资源字节不符');}finally{fs.writeFileSync(file,original);}
  const held=file+'.held';fs.renameSync(file,held);try{expect(()=>verifyDesktop145Resources(directory)).toThrow(/ENOENT/);}finally{fs.renameSync(held,file);}expect(verifyDesktop145Resources(directory).files).toHaveLength(74);
 });
 it('preserves saved-only Yue and element choices and never fabricates missing candidates',()=>{
  const unit=(text:string,id:string)=>({text,candidates:[{id,tokens:[id]}]}),s={candidates:[{yueReading:{surname:unit('林','lam4'),given:[unit('安','on1'),unit('然','jin4')]},elementAssessment:{rows:[{position:1,assessment:{matchingSourceCandidates:[{evidenceId:'actual-saved-evidence'}]}},{position:2,assessment:{matchingSourceCandidates:[]}}]}}]} as unknown as NamingSession;
  expect(desktop145YueChoice(s)).toEqual(desktop139YueChoice(s));expect(desktop145ElementChoices(s,true)).toEqual(desktop139ElementChoices(s,true));s.candidates[0].yueReading!.given[1].candidates=[];expect(desktop145YueChoice(s)).toBeNull();expect(desktop145ElementChoices(s,false).every(r=>r.decision==='not-applicable'&&!r.confirmedEvidenceIds.length)).toBe(true);
 });
 it('rejects unknown markers and wrong scopes before application paths or writes, while139 and145 use real preflight',()=>{
  for(const [marker,scope]of [['144','naming-v7'],['145','naming-v6'],['145',undefined],['145x','naming-v7'],['','naming-v7']]){const r=guard({NAMING_STUDIO_DESKTOP_WORKFLOW:marker,NAMING_STUDIO_SMOKE_SCOPE:scope});expect(r.events).toContain('exit:1');expect(r.events).not.toContain('preflight');expect(r.events).not.toContain('app.getAppPath');expect(r.events).not.toContain('write-artifact');}
  for(const marker of ['139','145']){const r=guard({NAMING_STUDIO_DESKTOP_WORKFLOW:marker,NAMING_STUDIO_SMOKE_SCOPE:'naming-v7'});expect(r.events.indexOf('preflight')).toBeLessThan(r.events.indexOf('app.getAppPath'));expect(r.events).toContain('assert-context');}expect(guard({}).events).toEqual(['app.getAppPath']);
 });
 it('reverses the exact main145 additions to the prior full main, preserving legacy139 and normal callbacks',()=>{
  let source=projectCurrentMainTo145Publication(fs.readFileSync(path.join(root,'src/main/main.ts'),'utf8'));for(const edit of [...preservation.mainReplacements].reverse()){expect(source.split(edit.after)).toHaveLength(2);source=source.replace(edit.after,edit.before);}expect(hash(source)).toBe(preservation.mainBaseSha256);expect(hash(original())).toBe(preservation.original139Sha256);
 });
});

// Explicit assertion-boundary fixtures. These are not SQL/native evidence.
function restoredFixture(){
 const source={sourceId:'project-meaning-context-next-138-v1-1',sourceSha256:'448a4a3132e0689ba5c0ffc114f439fbf0c6550e7c72a8d563080100be9aa6d2',dataSha256:'424e8b6ca9a920c8b707ac267db9609bee900a5389b3659256b4c71ad71b378d',sourceLockSha256:'473b1fb377bfeeb07c3cea800450e2ec88532b1678c9c590dcad650d8e3dd964',dataManifestSha256:'c5ac43e96b59beafaf54bce6a504ef9d97c0b59afd0687eaa7daa64ad9378ac9'};
 const target={id:'fixture-session',profileId:'fixture-profile',profile:{id:'fixture-profile'},analysis:{fixed:'current'},originalFavorable:['木'],dataVersion:'2026.10.20.2',createdAt:'fixed-create',sourceSnapshot:{fixed:'generation-source'},preferences:{fixed:'generation'},reviewRevision:2,reviewToken:'historical-token',candidates:[{id:'candidate',givenName:'斐然',modernPracticalEvidence:{raw:{a:1,b:[2,3]}},meaningContextReview:{version:'meaning-context-review/1.0.0',source,sourceSnapshot:{raw:'current-meaning-source-manifest'},selections:[{senseId:'saved-sense'}]},elementAssessment:{rows:[{decision:'confirmed',evidenceIds:['exact']}]},evaluation:{sound:80,meaning:80,simplicity:80,traditional:80,distinctiveness:80}}]} as unknown as NamingSession;
 const revision={id:'actual-selected-revision',sessionId:target.id,createdAt:'fixed-history-time',session:structuredClone(target)} as SessionRevision;
 const before=structuredClone(target);before.reviewRevision=8;before.reviewToken='current-after-clear-token';delete before.candidates[0].modernPracticalEvidence;
 const restored=structuredClone(target);restored.reviewRevision=9;restored.reviewToken='new-current-token';return{before,restored,revision};
}
describe('same actual145 post-restore assertion rejects missing or grafted history payloads',()=>{
 it('accepts complete selected historical candidates with explicit current CAS changes and returns target witness',()=>{
  const f=restoredFixture(),w=assertDesktop145RecordedHistoryRestored(f.restored,f.before,f.revision);expect(w.verified).toBe(true);expect(w.revisionId).toBe(f.revision.id);expect(w.targetSnapshotSha256).toBe(hash(canonicalPlainJson(f.revision.session)));expect(w.targetCandidatesSha256).toBe(hash(canonicalPlainJson(f.revision.session.candidates)));expect(w.restoredCandidatesSha256).toBe(w.targetCandidatesSha256);expect(w.targetModernSha256).toBe(hash(canonicalPlainJson(f.revision.session.candidates[0].modernPracticalEvidence)));expect(w.targetMeaningSha256).toBe(hash(canonicalPlainJson(f.revision.session.candidates[0].meaningContextReview)));expect(w.beforeReviewRevision).toBe(8);expect(w.restoredReviewRevision).toBe(9);
 });
 it('rejects the unchanged cleared return that passed the old protected-domain guard',()=>{
  const f=restoredFixture(),cleared=structuredClone(f.before);cleared.reviewRevision=9;cleared.reviewToken='new-token';expect(()=>assertDesktop145RecordedHistoryRestored(cleared,f.before,f.revision)).toThrow('完整候选');
 });
 it('rejects deleted meaning or a changed nested meaning source while generation facts stay the same',()=>{
  for(const mutation of [(s:NamingSession)=>{delete s.candidates[0].meaningContextReview;},(s:NamingSession)=>{s.candidates[0].meaningContextReview!.source.sourceId='project-meaning-context-next-137';}]){const f=restoredFixture();mutation(f.restored);expect(()=>assertDesktop145RecordedHistoryRestored(f.restored,f.before,f.revision)).toThrow('完整候选');}
 });
 it('rejects a consistently grafted historical1.0 meaning in target and return rather than relabeling it current',()=>{
  const f=restoredFixture();for(const s of [f.before,f.restored,f.revision.session])s.candidates[0].meaningContextReview!.source.sourceId='project-meaning-context-next-137';expect(()=>assertDesktop145RecordedHistoryRestored(f.restored,f.before,f.revision)).toThrow('当前词义来源');
 });
 it('checks all raw modern/meaning/source/candidate fields rather than only record presence',()=>{
  for(const mutation of [(s:NamingSession)=>{(s.candidates[0].modernPracticalEvidence as unknown as {raw:{a:number}}).raw.a++;},(s:NamingSession)=>{(s.candidates[0].meaningContextReview!.sourceSnapshot as unknown as {raw:string}).raw='grafted';},(s:NamingSession)=>{s.candidates[0].evaluation.sound++;}]){const f=restoredFixture();mutation(f.restored);expect(()=>assertDesktop145RecordedHistoryRestored(f.restored,f.before,f.revision)).toThrow('完整候选');}
 });
 it('requires one current revision increment and a new token while preserving nonrollback current fields',()=>{
  for(const mutate of [(s:NamingSession,b:NamingSession)=>{s.reviewToken=b.reviewToken;},(s:NamingSession)=>{s.reviewRevision=10;},(s:NamingSession)=>{s.dataVersion='grafted';}]){const f=restoredFixture();mutate(f.restored,f.before);expect(()=>assertDesktop145RecordedHistoryRestored(f.restored,f.before,f.revision)).toThrow();}
 });
 it('rejects a foreign selected revision or target profile and never reports a witness',()=>{
  const f=restoredFixture();f.revision.sessionId='other';expect(()=>assertDesktop145RecordedHistoryRestored(f.restored,f.before,f.revision)).toThrow('不属于');const g=restoredFixture();g.revision.session.profileId='other-profile';expect(()=>assertDesktop145RecordedHistoryRestored(g.restored,g.before,g.revision)).toThrow('不属于');
 });
 it('rejects a selected target with no modern evidence even when both cleared candidates match',()=>{
  const f=restoredFixture();delete f.revision.session.candidates[0].modernPracticalEvidence;delete f.restored.candidates[0].modernPracticalEvidence;expect(()=>assertDesktop145RecordedHistoryRestored(f.restored,f.before,f.revision)).toThrow('缺少待恢复');
 });
});
