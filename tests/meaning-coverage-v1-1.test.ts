import {afterAll,describe,expect,it} from 'vitest';
import {gunzipSync} from 'node:zlib';
import initSqlJs from 'sql.js';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';import {createHash} from 'node:crypto';
import {loadMeaningContextData,MEANING_CONTEXT_PINS,MEANING_CONTEXT_SOURCE,MEANING_CONTEXT_SOURCE_IDS,meaningContextDefinitionForSaved} from '../src/main/meaning-context-data';
import {applyMeaningContextIntent,verifySavedMeaningContextReview,verifySessionMeaningContextReviews,meaningContextOptions} from '../src/main/meaning-context-review';
import {validSavedMeaningContextReview} from '../src/shared/meaning-context-review';
import {Store,defaults} from '../src/main/store';import {StudioService} from '../src/main/service';
import {normalizePreferences} from '../src/shared/workflow';
import {meaningContextReviewReport} from '../src/main/meaning-context-report';import {reportHTML} from '../src/main/report';
import type {BirthProfile,NamingSession,NameCandidate} from '../src/shared/types';
import type {MeaningContextUpdateRequest} from '../src/shared/meaning-context-review';
const task=fileURLToPath(new URL('../',import.meta.url)),dataDir=process.env.MEANING_PACKAGE_DATA_DIR??path.join(task,'data'),evidence=process.env.MEANING_PACKAGE_CASE_DIR??path.join(task,'.local/verification/meaning-package-v1-1');
fs.mkdirSync(evidence,{recursive:true});
const wasm=createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm'),sha=(b:string|Uint8Array)=>createHash('sha256').update(b).digest('hex'),resources=loadMeaningContextData(dataDir),legacy=loadMeaningContextData(dataDir,MEANING_CONTEXT_SOURCE_IDS[0]);
const stores:Array<{db:{close():void}}>=[];afterAll(()=>stores.forEach(s=>s.db.close()));
const profile:BirthProfile={id:'meaning138',customerName:'词义数据1.1隔离消费者',surname:'林',surnamePinyin:'lín',fatherName:'林知远',motherName:'陈安宁',gender:'中性',calendar:'solar',birthDate:'2026-10-17',birthTime:'09:30',leapMonth:false,timeUnknown:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:''};
const disk=(s:Store)=>sha(fs.readFileSync(path.join(s.userDir,'customers.sqlite')));
const candidate=(s:NamingSession,id:string)=>s.candidates.find(c=>c.id===id)!;
const update=(service:StudioService,s:NamingSession,id:string,intent:MeaningContextUpdateRequest)=>service.updateMeaningContext(s.id,id,intent,s.reviewRevision!,s.reviewToken!);
async function generate(name:string){const directory=fs.mkdtempSync(path.join(evidence,'current-store-')),store=await new Store(directory,dataDir,wasm).init();stores.push(store);const service=new StudioService(store,{read:()=>'',write:()=>{}},false),forbiddenChars=store.dataset.characters.filter(c=>!name.includes(c.char)).map(c=>c.char).join('');const session=(await service.generate({...profile,id:profile.id+name},normalizePreferences({length:2,generationChar:[...name][0],requiredChars:[...name][1],forbiddenChars,zodiacRules:false}))).session;const c=session.candidates.find(c=>c.givenName===name);expect(c).toBeTruthy();return{store,service,session,id:c!.id,directory};}

function adopt(service:StudioService,s:NamingSession,id:string){const option=service.getMeaningContextOptions(s.id,id).options[0];expect(option).toBeTruthy();const confirmed=update(service,s,id,{action:'confirm-current-readings',positions:[0,1]});return update(service,confirmed,id,{action:'choose-context',position:option.position,caseId:option.caseId,senseId:option.senseId,contextKey:option.contextKey});}

describe('D02-138 exact source-backed second meaning batch and version coexistence',()=>{
 it('exposes current1.1 while preserving old imports and the exact20 historical cases',()=>{
  expect(resources.dataVersion).toBe('meaning-context-data/1.1.0');expect(resources.publication.cases).toHaveLength(40);expect(legacy.publication.cases).toHaveLength(20);expect(MEANING_CONTEXT_PINS.dataSha256).toBe('3dc77f55dca1516ae3cb4231a022a58aca1874189da6ea99c101c6931b7a1877');expect(MEANING_CONTEXT_SOURCE.id).toBe(MEANING_CONTEXT_SOURCE_IDS[0]);expect(Object.isFrozen(MEANING_CONTEXT_SOURCE_IDS)).toBe(true);
  expect(resources.publication.cases.slice(0,20)).toEqual(legacy.publication.cases);const added=resources.publication.cases.slice(20);expect(new Set(added.map(c=>c.char)).size).toBe(20);expect(new Set(added.map(c=>c.givenName)).size).toBe(20);expect(new Set(added.map(c=>c.selection.senseId)).size).toBe(20);expect(added.some(c=>legacy.publication.cases.some(x=>x.char===c.char))).toBe(false);
  expect(resources.publication.coverage).toMatchObject({remainingWithoutNewContext:203,secondBatchManualCharacters:13,secondBatchPendingCharacters:7,automaticPromotions:0,totalConditionalDistinctCharacters:40});
 });
 it('checks all20 real words and senses with explicit readings and rejects split/reverse/incorrect reading and source bindings',()=>{
  const pack={packSha256:resources.pins.packSha256,activeVersion:resources.pins.activeVersion};
  for(const row of resources.publication.cases.slice(20)){
   const request={char:row.char,givenName:row.givenName,characters:row.characterBindings.map(b=>b.character),confirmedReadings:row.confirmedReadings,choice:{usage:'entire-given-name' as const,caseId:row.caseId,senseId:row.selection.senseId,contextKey:row.selection.contextKey}};
   const ready=resources.lookup.lookup(request,pack);expect(ready.status,row.givenName).toBe('explanation-ready');expect(ready).toMatchObject({dictionaryOriginal:row.source.definition.def,independentCharacterMeaningApproved:false,wholeNameApproved:false,scoreDelta:0});
   expect(resources.lookup.lookup({...request,givenName:row.char},pack).status).not.toBe('explanation-ready');
   if([...row.givenName].reverse().join('')!==row.givenName)expect(resources.lookup.lookup({...request,givenName:[...row.givenName].reverse().join(''),characters:[...request.characters].reverse()},pack).status).not.toBe('explanation-ready');
   const wrong=structuredClone(request);wrong.confirmedReadings[0].pinyin='wrong';expect(resources.lookup.lookup(wrong,pack).status).not.toBe('explanation-ready');
   const source=structuredClone(request);source.characters[0].sourceId='invented';expect(resources.lookup.lookup(source,pack).status).not.toBe('explanation-ready');
   expect(resources.lookup.lookup(request,{...pack,packSha256:'0'.repeat(64)}).status).toBe('not-applicable');
  }
 });
 it('refuses missing/tampered complete raw files, both identity packages, unknown selectors and fake loader objects',()=>{
  for(const file of ['raw/moe-revised.json.gz','raw/meaning-context-batch2-review.json','meaning-context-v1-1-source-lock.json','meaning-context-next-manifest.json']){
   const dir=fs.mkdtempSync(path.join(evidence,'raw-guard-'));fs.cpSync(dataDir,dir,{recursive:true});const p=path.join(dir,file),before=fs.readFileSync(p);fs.unlinkSync(p);expect(()=>loadMeaningContextData(dir),file+' missing').toThrow();fs.writeFileSync(p,Buffer.concat([before,Buffer.from(' ')]));expect(()=>loadMeaningContextData(dir),file+' changed').toThrow();
  }
  expect(()=>loadMeaningContextData(dataDir,'unknown' as any)).toThrow('未知');expect(meaningContextDefinitionForSaved({sourceId:'unknown'})).toBeUndefined();
  expect(()=>verifySessionMeaningContextReviews({candidates:[]} as unknown as NamingSession,undefined,{...resources})).toThrow('认证');
 });
 it('uses real current Store/Service confirm→choice→save→read→report and clear without altering scores or other domains',async()=>{
  const {store,service,session,id}=await generate('千寻'),original=candidate(session,id),source=JSON.stringify(session.sourceSnapshot),initialDisk=disk(store),options=service.getMeaningContextOptions(session.id,id);expect(options.status).toBe('available');expect(options.notice).toContain('1.1');expect(disk(store)).toBe(initialDisk);
  const saved=adopt(service,session,id),c=candidate(saved,id),snapshot=c.meaningContextReview!;expect(snapshot.source.sourceId).toBe(MEANING_CONTEXT_SOURCE_IDS[1]);expect(snapshot.rows.some(r=>r.result.status==='explanation-ready')).toBe(true);expect(c.evaluation).toEqual(original.evaluation);expect(c.meaning).toBe(original.meaning);expect(c.namingMeaningReview).toEqual(original.namingMeaningReview);expect(JSON.stringify(saved.sourceSnapshot)).toBe(source);
  const read=(store as Store).readVerifiedSession(saved.id)!;expect(candidate(read,id).meaningContextReview).toEqual(snapshot);const beforeReport=disk(store),html=reportHTML(read,defaults);expect(html).toContain('古代八尺為一尋');expect(html).toContain(snapshot.source.dataSha256);expect(html).toContain('不把长度单位义改写为寻找义');expect(disk(store)).toBe(beforeReport);
  const forgery=structuredClone(read),ready=candidate(forgery,id).meaningContextReview!.rows.find(r=>r.result.status==='explanation-ready')!;if(ready.result.status==='explanation-ready')ready.result.dictionaryOriginal='<script>forged</script>';expect(meaningContextReviewReport(candidate(forgery,id),forgery)).toContain('校验未通过');expect(meaningContextReviewReport(candidate(forgery,id),forgery)).not.toContain('<script>');
  const cleared=update(service,read,id,{action:'clear'});expect(candidate(cleared,id).meaningContextReview).toBeUndefined();expect(candidate(cleared,id).evaluation).toEqual(original.evaluation);expect(service.listHistory(saved.id).some(h=>candidate(h.session,id).meaningContextReview?.source.sourceId===MEANING_CONTEXT_SOURCE_IDS[1])).toBe(true);
  fs.writeFileSync(path.join(evidence,'current-saved-session.json'),JSON.stringify(read,null,2)+'\n');fs.writeFileSync(path.join(evidence,'current-report.html'),html);
 });
 it('preserves a checked real pre-release-v1 fixture without importing any old consumer module',async()=>{
  const fixture=process.env.MEANING_PACKAGE_FIXTURE_DIR??path.join(task,'tests/fixtures/pre-release-meaning-v1'),receipt=JSON.parse(fs.readFileSync(path.join(fixture,'pre-release-v1-fixture-receipt.json'),'utf8'));
  expect(receipt.officialHistoricalRelease).toBe(false);expect(receipt.status).toBe('generated-by-actual-pre-release-v1-consumer');
  const compressed=fs.readFileSync(path.join(fixture,'pre-release-v1-meaning.sqlite.gz'));expect(sha(compressed)).toBe(receipt.compressedSha256);const bytes=gunzipSync(compressed);expect(sha(bytes)).toBe(receipt.databaseSha256);
  const oldSessionBytes=fs.readFileSync(path.join(fixture,'pre-release-v1-session.json')),old=JSON.parse(oldSessionBytes.toString()) as NamingSession;expect(sha(oldSessionBytes)).toBe(receipt.sessionSha256);
  const snapshot=fs.readFileSync(path.join(fixture,'pre-release-v1-review.json'),'utf8'),oldHtml=fs.readFileSync(path.join(fixture,'pre-release-v1-report.html'),'utf8');expect(sha(snapshot)).toBe(receipt.reviewSha256);expect(sha(oldHtml)).toBe(receipt.reportSha256);
  const id=receipt.candidateId,directory=fs.mkdtempSync(path.join(evidence,'fixture-store-'));fs.writeFileSync(path.join(directory,'customers.sqlite'),bytes);const store=await new Store(directory,dataDir,wasm).init();stores.push(store);const service=new StudioService(store,{read:()=>'',write:()=>{}},false),read=store.readVerifiedSession(old.id)!;
  expect(disk(store)).toBe(receipt.databaseSha256);expect(JSON.stringify(candidate(read,id).meaningContextReview)).toBe(snapshot);expect(meaningContextReviewReport(candidate(read,id),read)).toBe(oldHtml);const before=disk(store),options=service.getMeaningContextOptions(read.id,id);expect(options.savedReview).toEqual(JSON.parse(snapshot));expect(options.notice).toContain('1.1');expect(disk(store)).toBe(before);
  const upgraded=update(service,read,id,{action:'confirm-current-readings',positions:[0,1]});expect(candidate(upgraded,id).meaningContextReview!.source.sourceId).toBe(MEANING_CONTEXT_SOURCE_IDS[1]);const history=service.listHistory(read.id),record=history.find(h=>JSON.stringify(candidate(h.session,id).meaningContextReview)===snapshot);expect(record).toBeTruthy();const restored=service.restoreHistory(read.id,record!.id,upgraded.reviewRevision!,upgraded.reviewToken);expect(JSON.stringify(candidate(restored,id).meaningContextReview)).toBe(snapshot);expect(meaningContextReviewReport(candidate(restored,id),restored)).toBe(oldHtml);
  expect(sha(fs.readFileSync(path.join(fixture,'pre-release-v1-meaning.sqlite.gz')))).toBe(receipt.compressedSha256);fs.writeFileSync(path.join(evidence,'independent-fixture-history.json'),JSON.stringify(service.listHistory(read.id),null,2)+'\n');
 });
 it('reserves both old/new source IDs against a custom data pack and rejects tampered real current/history sources',async()=>{
  const {store,service,session,id}=await generate('明道'),saved=adopt(service,session,id),SQL=await initSqlJs({locateFile:()=>wasm});
  for(const definition of resources.versions){const db=new SQL.Database(store.currentPackBytes());let bytes:Uint8Array;try{db.run('INSERT INTO sources(id,json) VALUES (?,?)',[definition.source.id,JSON.stringify(definition.source)]);bytes=db.export();}finally{db.close();}const before=disk(store);expect(()=>store.installPack(bytes!)).toThrow();expect(disk(store)).toBe(before);}
  const pack=store.meaningContextPackContext(saved)!,bad=structuredClone(saved);candidate(bad,id).meaningContextReview!.source.sourceId=MEANING_CONTEXT_SOURCE_IDS[0];expect(()=>verifySessionMeaningContextReviews(bad,pack,resources)).toThrow();
  const rows=store.db.exec('SELECT json FROM sessions WHERE id=?',[saved.id])[0].values,original=String(rows[0][0]),before=disk(store);try{store.db.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(bad),saved.id]);expect(()=>store.readVerifiedSession(saved.id)).toThrow();expect(disk(store)).toBe(before);}finally{store.db.run('UPDATE sessions SET json=? WHERE id=?',[original,saved.id]);}
  const history=service.listHistory(saved.id).find(h=>candidate(h.session,id).meaningContextReview);expect(history).toBeTruthy();const h=store.db.exec('SELECT json FROM revisions WHERE id=?',[history!.id])[0].values[0][0],changed=JSON.parse(String(h)) as NamingSession;candidate(changed,id).meaningContextReview!.source.dataManifestSha256='0'.repeat(64);try{store.db.run('UPDATE revisions SET json=? WHERE id=?',[JSON.stringify(changed),history!.id]);expect(()=>service.getMeaningContextOptions(saved.id,id)).toThrow();expect(disk(store)).toBe(before);}finally{store.db.run('UPDATE revisions SET json=? WHERE id=?',[String(h),history!.id]);}
 });
 it('requires both precise source identities and retains exact position on repeated-character contexts',async()=>{
  const {store,service,session,id}=await generate('楚楚'),options=service.getMeaningContextOptions(session.id,id);expect(options.options.map(o=>o.position)).toEqual([0,1]);let s=adopt(service,session,id);expect(candidate(s,id).meaningContextReview!.selections).toHaveLength(1);expect(candidate(s,id).meaningContextReview!.rows.filter(r=>r.result.status==='explanation-ready')).toHaveLength(1);
  const pack=(store as Store).meaningContextPackContext(s)!;verifySavedMeaningContextReview(s,candidate(s,id),pack);
  for(const sourceId of ['unknown',MEANING_CONTEXT_SOURCE_IDS[0]]){const bad=structuredClone(s);candidate(bad,id).meaningContextReview!.source.sourceId=sourceId as any;if(sourceId==='unknown')expect(validSavedMeaningContextReview(candidate(bad,id).meaningContextReview)).toBe(false);expect(()=>verifySavedMeaningContextReview(bad,candidate(bad,id),pack)).toThrow();}
  const bad=structuredClone(s);candidate(bad,id).meaningContextReview!.source.dataSha256='0'.repeat(64);expect(()=>verifySavedMeaningContextReview(bad,candidate(bad,id),pack)).toThrow();
  const prior=disk(store),copy=structuredClone(s);candidate(copy,id).meaningContextReview!.rows.reverse();expect(()=>service.saveSession(copy)).toThrow();expect(disk(store)).toBe(prior);
  const opt=meaningContextOptions(s,candidate(s,id),{...pack,packSha256:'0'.repeat(64)},resources);expect(opt.status).toBe('unsupported-pack');expect(opt.options).toEqual([]);expect(opt.savedReview).toEqual(candidate(s,id).meaningContextReview);
 });
});
