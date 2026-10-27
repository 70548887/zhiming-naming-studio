import {jointDataDirectory,jointSqlWasmPath,createJointRunDirectory,removeJointRunDirectory,publishedNaming134Fixture,JOINT_COMPLETION_BUDGET_MS as budget} from './helpers/joint-naming-runtime';
import {afterAll,afterEach,beforeAll,describe,expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import initSqlJs from 'sql.js';
import {Store} from '../src/main/store';
import {StudioService} from '../src/main/service';
import {normalizePreferences} from '../src/shared/workflow';
import {CURRENT_NAMING_RULE_VERSION,NAMING_RULE_SOURCE_ID} from '../src/shared/naming-rules';
import {validSessionSources} from '../src/shared/session-sources';
import {WORD_PRONUNCIATION_SOURCE_IDS} from '../src/shared/word-pronunciation-reference';
import type {BirthProfile,NameCandidate,NamingSession,YueReadingSelections} from '../src/shared/types';
import type {MeaningContextOptions,MeaningContextUpdateRequest} from '../src/shared/meaning-context-review';
import type {ElementAssessmentChoiceInput} from '../src/shared/element-assessment';
import {modernRecordView} from '../src/shared/modern-practical-evidence';
import type {ModernPracticalEvidenceRecord} from '../src/shared/modern-practical-evidence';
import {authorizeModernMutation,createModernRecord} from '../src/main/modern-practical-evidence';

const dataDir=jointDataDirectory,wasm=jointSqlWasmPath;
let runs='';const stores:Store[]=[];
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const bytes=(value:unknown)=>value===undefined?'[absent]':JSON.stringify(value);
const phoneticCmn={version:'cmn-homophone-review/1.0.0' as const,mode:'strict' as const};
const phoneticYue={version:'yue-homophone-review/1.2.0' as const,mode:'ignore-tone' as const};
const primaryName='斐然',secondaryName='安然';
let SQL:Awaited<ReturnType<typeof initSqlJs>>;
interface Context {store:Store;service:StudioService;userDir:string;session:NamingSession;candidateId:string;label:string;}
const baseProfile:BirthProfile={id:'joint-four',customerName:'四功能两字隔离消费者',surname:'林',surnamePinyin:'lín',fatherName:'',motherName:'',gender:'中性',calendar:'solar',birthDate:'2026-10-17',birthTime:'09:30',leapMonth:false,timeUnknown:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'虚构测试；不能据此宣称真实家庭采用读法或词义'};

beforeAll(async()=>{runs=createJointRunDirectory();SQL=await initSqlJs({locateFile:()=>wasm});},30000);
afterAll(()=>removeJointRunDirectory(runs));
afterEach(()=>{for(const store of stores.splice(0))store.db.close();});

async function open(label:string):Promise<Pick<Context,'store'|'service'|'userDir'>>{
 const userDir=fs.mkdtempSync(path.join(runs,label+'-'));const store=await new Store(userDir,dataDir,wasm).init();stores.push(store);
 return {store,userDir,service:new StudioService(store,{read:()=>'',write:()=>{}},false)};
}
async function generated(label:string,givenName=primaryName):Promise<Context>{
 const context=await open(label),glyphs=[...givenName];expect(glyphs).toHaveLength(2);
 const forbiddenChars=context.store.dataset.characters.filter(c=>!glyphs.includes(c.char)).map(c=>c.char).join('');
 const preferences=normalizePreferences({length:2,generationChar:glyphs[0],requiredChars:glyphs[1],forbiddenChars,numerology:false,zodiacRules:false,avoidParentNames:false,elementAssessment:true,yueReading:true,wordPronunciationReference:true,namePhonetics:{cmn:phoneticCmn,yue:phoneticYue}});
 const session=(await context.service.generate({...baseProfile,id:'joint-'+label},preferences)).session;
 expect(session.namingRules?.version).toBe(CURRENT_NAMING_RULE_VERSION);expect(session.namingRules?.sourceId).toBe(NAMING_RULE_SOURCE_ID);expect(session.factVerification?.datasetSha256).toBe('1875aa49dcfaeca0f266a3be7578e4d4b2a9b2c9c1f59fd79699a3e26d5d6b8b');
 const found=session.candidates.find(c=>c.givenName===givenName);expect(found,'actual Service.generate must produce exact two-character consumer').toBeDefined();
 expect(found!.characters).toHaveLength(2);expect(found!.namePhoneticReviews).toBeDefined();expect(found!.wordPronunciationReference).toBeDefined();expect(found!.elementAssessment).toBeDefined();
 return {...context,label,session,candidateId:found!.id};
}
function current(context:Context):NamingSession {const session=context.store.readVerifiedSession(context.session.id);expect(session).toBeDefined();return session!;}
function candidate(context:Context,session:NamingSession):NameCandidate {const value=session.candidates.find(c=>c.id===context.candidateId);expect(value).toBeDefined();return value!;}
function disk(context:Pick<Context,'userDir'>){return fs.readFileSync(path.join(context.userDir,'customers.sqlite'));}
function historyCount(context:Context){return context.service.listHistory(context.session.id).length;}
const independentFields=['meaningContextReview','namePhoneticReviews','wordPronunciationReference','elementAssessment','yueReading','yueHomophones','modernPracticalEvidence'] as const;
function unchanged(context:Context,before:NamingSession,after:NamingSession,allowed:readonly string[]=[]){
 const prior=candidate(context,before),next=candidate(context,after),allow=new Set(allowed);
 expect(bytes(after.sourceSnapshot)).toBe(bytes(before.sourceSnapshot));expect(after.namingRules).toEqual(before.namingRules);expect(after.dataVersion).toBe(before.dataVersion);expect(after.profile).toEqual(before.profile);
 for(const field of ['givenName','fullName','pinyin','characters','citations','evaluation','originalMeaning','namingMeaningReview','imageReading','numerology'] as const)expect(bytes(next[field]),field).toBe(bytes(prior[field]));
 for(const field of independentFields)if(!allow.has(field))expect(bytes(next[field]),field).toBe(bytes(prior[field]));
 if(!allow.has('meaning'))expect(next.meaning).toBe(prior.meaning);
 if(!allow.has('elementAssessment'))expect(bytes(after.elementAssessmentPreferences)).toBe(bytes(before.elementAssessmentPreferences));
 for(const other of before.candidates.filter(c=>c.id!==context.candidateId))expect(bytes(after.candidates.find(c=>c.id===other.id))).toBe(bytes(other));
 expect(validSessionSources(after)).toBe(true);
}
function denied(context:Context,operation:()=>unknown,pattern?:RegExp){
 const before=disk(context),session=current(context),count=historyCount(context);
 if(pattern)expect(operation).toThrow(pattern);else expect(operation).toThrow();
 expect(disk(context)).toEqual(before);expect(bytes(current(context))).toBe(bytes(session));expect(historyCount(context)).toBe(count);
}
function commit(context:Context,before:NamingSession,operation:()=>NamingSession,allowed:readonly string[],stale:(revision:number,token:string)=>unknown):NamingSession {
 const count=historyCount(context),beforeBytes=disk(context),returned=operation(),after=current(context);
 expect(after.reviewRevision).toBe((before.reviewRevision??0)+1);expect(after.reviewToken).not.toBe(before.reviewToken);expect(typeof after.reviewToken).toBe('string');expect(historyCount(context)).toBe(count+1);expect(disk(context)).not.toEqual(beforeBytes);
 expect(bytes(returned)).toBe(bytes(after));const old=context.service.listHistory(after.id).find(r=>r.session.reviewRevision===before.reviewRevision&&r.session.reviewToken===before.reviewToken);expect(old).toBeDefined();expect(bytes(old!.session.candidates)).toBe(bytes(before.candidates));
 unchanged(context,before,after,allowed);denied(context,()=>stale(before.reviewRevision??0,before.reviewToken!),/其他窗口更新/);return after;
}
function meaningRequest(context:Context,session:NamingSession,request:MeaningContextUpdateRequest){return context.service.updateMeaningContext(session.id,context.candidateId,request,session.reviewRevision!,session.reviewToken!);}
function meaningfulOption(context:Context,session:NamingSession){
 const result:MeaningContextOptions=context.service.getMeaningContextOptions(session.id,context.candidateId);expect(result.status).toBe('available');expect(result.options.length).toBeGreaterThan(0);expect(result.options.every(o=>o.givenName===candidate(context,session).givenName)).toBe(true);return result.options[0];
}
function adoptMeaning(context:Context,before=current(context)){
 const first:MeaningContextUpdateRequest={action:'confirm-current-readings',positions:[0,1]};
 let session=commit(context,before,()=>meaningRequest(context,before,first),['meaningContextReview'],(r,t)=>context.service.updateMeaningContext(before.id,context.candidateId,first,r,t));
 const option=meaningfulOption(context,session),choice:MeaningContextUpdateRequest={action:'choose-context',position:option.position,caseId:option.caseId,senseId:option.senseId,contextKey:option.contextKey};
 session=commit(context,session,()=>meaningRequest(context,session,choice),['meaningContextReview'],(r,t)=>context.service.updateMeaningContext(session.id,context.candidateId,choice,r,t));
 expect(candidate(context,session).meaningContextReview!.rows.some(r=>r.result.status==='explanation-ready')).toBe(true);return session;
}
function yueIntent(context:Context,session:NamingSession):YueReadingSelections{
 const reading=candidate(context,session).yueReading!;
 const selected=(unit:typeof reading.surname)=>{const found=unit.candidates[0];expect(found,'selection must come from actual saved fixed dictionary options').toBeDefined();return {tokens:[...found.tokens],origin:'dictionary' as const,confirmed:true as const,dictionaryId:found.id};};
 return {surname:selected(reading.surname),given:reading.given.map(selected)};
}
function confirmYue(context:Context,before=current(context)){
 const input=yueIntent(context,before),unchangedInput=bytes(input);
 const result=commit(context,before,()=>context.service.updateYueReading(before.id,context.candidateId,input,before.reviewRevision,before.reviewToken),['yueReading','namePhoneticReviews','wordPronunciationReference','yueHomophones'],(r,t)=>context.service.updateYueReading(before.id,context.candidateId,input,r,t));
 expect(bytes(input)).toBe(unchangedInput);expect(candidate(context,result).wordPronunciationReference!.reviews.cmn).toEqual(candidate(context,before).wordPronunciationReference!.reviews.cmn);expect(candidate(context,result).namePhoneticReviews!.reviews.cmn).toEqual(candidate(context,before).namePhoneticReviews!.reviews.cmn);return result;
}
function elementIntent(context:Context,session:NamingSession,confirmed=true):ElementAssessmentChoiceInput[]{
 const rows=candidate(context,session).elementAssessment!.rows,target=rows.find(row=>row.char==='然');expect(target,'primary fixture must contain the actual conditional然evidence').toBeDefined();expect(target!.position).toBe(2);
 return rows.map(row=>({position:row.position,decision:row.position===target!.position&&confirmed?'confirmed':'unconfirmed',confirmedEvidenceIds:row.position===target!.position&&confirmed?[target!.assessment!.matchingSourceCandidates[0].evidenceId]:[]}));
}
function confirmElement(context:Context,before=current(context),confirmed=true){const input=elementIntent(context,before,confirmed);return commit(context,before,()=>context.service.updateElementAssessment(before.id,context.candidateId,input,before.reviewRevision,before.reviewToken),['elementAssessment'],(r,t)=>context.service.updateElementAssessment(before.id,context.candidateId,input,r,t));}
function ordinaryReview(context:Context,before=current(context),changeMeaning=false){const input=structuredClone(before),c=candidate(context,input);c.reviewNote+='四功能交错审阅';c.favorite=!c.favorite;if(changeMeaning)c.meaning+='（本轮人工补充家庭祝愿）';return commit(context,before,()=>context.service.saveSession(input),changeMeaning?['meaning']:[],(r,t)=>context.service.saveSession({...input,reviewRevision:r,reviewToken:t}));}
function restore(context:Context,before:NamingSession,revisionId:string,expected:NamingSession){
 const count=historyCount(context),after=context.service.restoreHistory(before.id,revisionId,before.reviewRevision,before.reviewToken),read=current(context);
 expect(bytes(after)).toBe(bytes(read));expect(read.reviewRevision).toBe((before.reviewRevision??0)+1);expect(read.reviewToken).not.toBe(before.reviewToken);expect(historyCount(context)).toBe(count+1);expect(bytes(read.candidates)).toBe(bytes(expected.candidates));expect(bytes(read.elementAssessmentPreferences)).toBe(bytes(expected.elementAssessmentPreferences));expect(bytes(read.sourceSnapshot)).toBe(bytes(before.sourceSnapshot));
 denied(context,()=>context.service.restoreHistory(before.id,revisionId,before.reviewRevision,before.reviewToken),/其他窗口更新/);return read;
}
/** Independent fixed publication identities;the review schema version stays1.0
 * for both data publications. A new review may use1.1 without rewriting1.0. */
const meaningSourceIdentities=[
 {sourceId:'project-meaning-context-next-137',sourceSha256:'0bd01932fe21ee44fda65cdd766ae838e24b73b1bff2e86768be7a5dfcf8aa2b',dataSha256:'3dc77f55dca1516ae3cb4231a022a58aca1874189da6ea99c101c6931b7a1877',sourceLockSha256:'cdc25bbb48fe24d84413e71ead37a07fe633ba8758c991c6b481924c7838eb72',dataManifestSha256:'f5c7664b661229f39919f8b10afe482b3aab65836e1fcc6a674d86296e870371'},
 {sourceId:'project-meaning-context-next-138-v1-1',sourceSha256:'448a4a3132e0689ba5c0ffc114f439fbf0c6550e7c72a8d563080100be9aa6d2',dataSha256:'424e8b6ca9a920c8b707ac267db9609bee900a5389b3659256b4c71ad71b378d',sourceLockSha256:'473b1fb377bfeeb07c3cea800450e2ec88532b1678c9c590dcad650d8e3dd964',dataManifestSha256:'c5ac43e96b59beafaf54bce6a504ef9d97c0b59afd0687eaa7daa64ad9378ac9'},
] as const;
const meaningSourceIds:readonly string[]=meaningSourceIdentities.map(source=>source.sourceId);
function registryIsolation(context:Context,session:NamingSession){
 const c=candidate(context,session),saved=c.meaningContextReview!,generation=session.sourceSnapshot!.sources,review=saved.sourceSnapshot.sources;
 const expected=meaningSourceIdentities.find(source=>source.sourceId===saved.source.sourceId);
 expect(expected,'review must bind an exact known publication identity').toBeDefined();expect(saved.source).toEqual(expected);
 expect(generation.some(s=>WORD_PRONUNCIATION_SOURCE_IDS.includes(s.id as typeof WORD_PRONUNCIATION_SOURCE_IDS[number]))).toBe(true);
 expect(generation.filter(s=>meaningSourceIds.includes(s.id))).toEqual([]);
 expect(review.filter(s=>meaningSourceIds.includes(s.id)).map(s=>({id:s.id,sha256:s.sha256}))).toEqual([{id:expected!.sourceId,sha256:expected!.sourceSha256}]);
 expect(review.some(s=>(WORD_PRONUNCIATION_SOURCE_IDS as readonly string[]).includes(s.id))).toBe(false);
 expect(review.find(s=>s.id==='moe-revised')).toEqual(generation.find(s=>s.id==='moe-revised'));
}
function modern(context:Context,session:NamingSession):ModernPracticalEvidenceRecord {
 const view=modernRecordView(candidate(context,session));expect(view.record).not.toBeNull();expect(view.record!.version).toBe('modern-practical-evidence/1.0.0');return view.record!;
}
function recordModern(context:Context,before=current(context)){
 const after=commit(context,before,()=>context.service.recordModernPracticalEvidence(before.id,context.candidateId,before.reviewRevision!,before.reviewToken),['modernPracticalEvidence'],(r,t)=>context.service.recordModernPracticalEvidence(before.id,context.candidateId,r,t));
 const recorded=modern(context,after);expect(recorded.capture.reviewRevision).toBe(before.reviewRevision);expect(recorded.capture.reviewToken).toBe(before.reviewToken);expect(recorded.basis.meaning).toBe(candidate(context,before).meaning);expect(recorded.capture.sessionId).toBe(before.id);expect(recorded.capture.candidateId).toBe(context.candidateId);expect(modernRecordView(candidate(context,after)).state).toBe('current');return after;
}
function clearModern(context:Context,before=current(context)){
 expect(candidate(context,before).modernPracticalEvidence).toBeDefined();const after=commit(context,before,()=>context.service.clearModernPracticalEvidence(before.id,context.candidateId,before.reviewRevision!,before.reviewToken),['modernPracticalEvidence'],(r,t)=>context.service.clearModernPracticalEvidence(before.id,context.candidateId,r,t));expect(candidate(context,after).modernPracticalEvidence).toBeUndefined();return after;
}

describe('joint naming review: two-character phonetic WORD element meaning consumers',()=>{
 it('J01 meaning→Yue→element→ordinary→restore commits each changed result exactly once and preserves independent bytes',async()=>{
  const context=await generated('ordered'),initial=current(context);expect(candidate(context,initial).wordPronunciationReference!.reviews.cmn!.status).toBe('no-covered-word');
  let session=adoptMeaning(context,initial);registryIsolation(context,session);session=confirmYue(context,session);session=confirmElement(context,session);session=ordinaryReview(context,session);
  const old=context.service.listHistory(session.id).find(r=>r.session.reviewRevision===initial.reviewRevision&&r.session.reviewToken===initial.reviewToken)!;expect(old).toBeDefined();const restored=restore(context,session,old.id,old.session);
  expect(candidate(context,restored).meaningContextReview).toBeUndefined();expect(candidate(context,restored).wordPronunciationReference!.reviews.yue!.status).toBe('not-assessed');expect(candidate(context,restored).elementAssessment!.rows.every(r=>r.assessment?.effectiveElements.length===0||r.assessment===null)).toBe(true);
 },budget.J01);
 it('J02 reversing Yue/element before meaning and dedicated meaning clear does not erase or regenerate other snapshots',async()=>{
  const context=await generated('reverse');let session=confirmYue(context);session=confirmElement(context,session);session=adoptMeaning(context,session);const before=structuredClone(session),clear:MeaningContextUpdateRequest={action:'clear'};
  session=commit(context,before,()=>meaningRequest(context,before,clear),['meaningContextReview'],(r,t)=>context.service.updateMeaningContext(before.id,context.candidateId,clear,r,t));expect(candidate(context,session).meaningContextReview).toBeUndefined();expect(candidate(context,session).elementAssessment!.rows[1].assessment!.effectiveElements.length).toBeGreaterThan(0);
 },budget.J02);
 it('J03 cross-feature stale revisions and tokens cannot overwrite a later meaning or Yue commit',async()=>{
  const context=await generated('cross-cas'),zero=current(context),yue=yueIntent(context,zero),meaning=adoptMeaning(context,zero);
  denied(context,()=>context.service.updateYueReading(zero.id,context.candidateId,yue,zero.reviewRevision,zero.reviewToken),/其他窗口更新/);
  denied(context,()=>context.service.updateYueReading(zero.id,context.candidateId,yue,meaning.reviewRevision,zero.reviewToken),/其他窗口更新/);
  const later=confirmYue(context,meaning),element=elementIntent(context,later);
  denied(context,()=>context.service.updateElementAssessment(zero.id,context.candidateId,element,meaning.reviewRevision,later.reviewToken),/其他窗口更新/);
  denied(context,()=>context.service.updateMeaningContext(zero.id,context.candidateId,{action:'clear'},later.reviewRevision!,meaning.reviewToken!),/其他窗口更新/);
 },budget.J03);
 it('J04 meaning zero-based and element one-based occurrence requests stay isolated in the same two-character plan',async()=>{
  const context=await generated('indices'),initial=current(context);
  denied(context,()=>meaningRequest(context,initial,{action:'confirm-current-readings',positions:[2]}));let session=adoptMeaning(context,initial);
  const invalid=elementIntent(context,session).map((r,i)=>({...r,position:i}));denied(context,()=>context.service.updateElementAssessment(session.id,context.candidateId,invalid,session.reviewRevision,session.reviewToken));
  const priorMeaning=bytes(candidate(context,session).meaningContextReview);session=confirmElement(context,session);expect(bytes(candidate(context,session).meaningContextReview)).toBe(priorMeaning);expect(candidate(context,session).elementAssessment!.rows[1].char).toBe('然');
 },budget.J04);
 it('J05 ordinary meaning prose review preserves all four records while forged readonly results cannot use meaning-special save as bypass',async()=>{
  const context=await generated('ordinary');let session=adoptMeaning(context);session=confirmYue(context,session);session=confirmElement(context,session);session=ordinaryReview(context,session,true);
  const c=candidate(context,session);expect(c.meaning).toContain('人工补充');expect(c.meaningContextReview!.rows.some(r=>r.result.status==='explanation-ready')).toBe(true);
  for(const field of ['wordPronunciationReference','meaningContextReview','elementAssessment','namePhoneticReviews'] as const){const bad=structuredClone(session);delete candidate(context,bad)[field];denied(context,()=>context.service.saveSession(bad));}
  const forged=structuredClone(session);(candidate(context,forged).wordPronunciationReference as unknown as {sourceLockSha256:string}).sourceLockSha256='0'.repeat(64);denied(context,()=>context.store.saveMeaningContextSession(forged));
 },budget.J05);
 it('J06 history restore order retains actual old combinations without applying later word/Yue/meaning/element confirmations',async()=>{
  const context=await generated('history');let session=adoptMeaning(context);const meaningOnly=structuredClone(session);session=confirmYue(context,session);session=confirmElement(context,session);const allConfirmed=structuredClone(session);session=ordinaryReview(context,session);
  let revision=context.service.listHistory(session.id).find(r=>r.session.reviewRevision===meaningOnly.reviewRevision&&r.session.reviewToken===meaningOnly.reviewToken)!;expect(revision).toBeDefined();session=restore(context,session,revision.id,revision.session);
  expect(candidate(context,session).yueReading!.status).toBe('unconfirmed');expect(candidate(context,session).meaningContextReview).toEqual(candidate(context,meaningOnly).meaningContextReview);
  revision=context.service.listHistory(session.id).find(r=>r.session.reviewRevision===allConfirmed.reviewRevision&&r.session.reviewToken===allConfirmed.reviewToken)!;expect(revision).toBeDefined();session=restore(context,session,revision.id,revision.session);expect(candidate(context,session).elementAssessment).toEqual(candidate(context,allConfirmed).elementAssessment);expect(candidate(context,session).wordPronunciationReference).toEqual(candidate(context,allConfirmed).wordPronunciationReference);
 },budget.J06);
 it('J07 combined current and historical records survive a separate Store backup and corrupt-feature restores remain atomic',async()=>{
  const context=await generated('backup');let session=adoptMeaning(context);session=confirmYue(context,session);session=confirmElement(context,session);session=ordinaryReview(context,session);
  const good=context.store.backupBytes(),destination=await open('backup-destination');destination.store.restore(good);const result=destination.store.readVerifiedSession(session.id)!;expect(result.candidates).toEqual(session.candidates);expect(result.sourceSnapshot).toEqual(session.sourceSnapshot);
  expect(destination.store.listRevisions(session.id).map(r=>r.session.candidates)).toEqual(context.store.listRevisions(session.id).map(r=>r.session.candidates));const before=fs.readFileSync(path.join(destination.userDir,'customers.sqlite'));
  for(const table of ['sessions','revisions'] as const){const db=new SQL.Database(good);try{const row=db.exec(`SELECT id,json FROM ${table} WHERE ${table==='sessions'?'id':'session_id'}=? ORDER BY id DESC`,[session.id])[0].values[0],bad=JSON.parse(String(row[1])) as NamingSession;const c=bad.candidates.find(x=>x.id===context.candidateId)!;if(table==='sessions')delete c.wordPronunciationReference;else c.meaningContextReview!.source.dataSha256='0'.repeat(64);db.run(`UPDATE ${table} SET json=? WHERE id=?`,[JSON.stringify(bad),row[0]]);expect(()=>destination.store.restore(db.export())).toThrow();expect(fs.readFileSync(path.join(destination.userDir,'customers.sqlite'))).toEqual(before);}finally{db.close();}}
 
  const old=await open('published134'),released=publishedNaming134Fixture();old.store.restore(released.bytes);const legacy=old.store.rows<NamingSession>('sessions');expect(legacy).toHaveLength(27);
  for(const value of legacy){expect(value.candidates.every(c=>!Object.hasOwn(c,'wordPronunciationReference')&&!Object.hasOwn(c,'meaningContextReview')&&!Object.hasOwn(c,'modernPracticalEvidence'))).toBe(true);}
  const reviewed=old.service.saveSession({...legacy[0],reviewNote:'CI legacy fixture review: no new feature backfill'});expect(reviewed.candidates).toEqual(legacy[0].candidates);expect(reviewed.sourceSnapshot).toEqual(legacy[0].sourceSnapshot);expect(old.store.backupBytes().length).toBeGreaterThan(0);expect(sha(fs.readFileSync(released.path))).toBe(released.sha256);
},budget.J07);
 it('J08 a review registry cannot repair a missing generation word source or vice versa even with other valid canonical snapshots',async()=>{
  const context=await generated('source-isolation');const session=adoptMeaning(context);registryIsolation(context,session);
  const generationMissing=structuredClone(session),wordSource=generationMissing.sourceSnapshot!.sources.find(r=>r.id===WORD_PRONUNCIATION_SOURCE_IDS[0])!;generationMissing.sourceSnapshot!.sources=generationMissing.sourceSnapshot!.sources.filter(r=>r.id!==wordSource.id);candidate(context,generationMissing).meaningContextReview!.sourceSnapshot.sources.push(wordSource);denied(context,()=>context.store.saveSession(generationMissing));
  const reviewMissing=structuredClone(session),review=candidate(context,reviewMissing).meaningContextReview!,meaningSource=review.sourceSnapshot.sources.find(r=>r.id===review.source.sourceId)!;
  expect(meaningSource,'remove the actual exact versioned review source').toBeDefined();review.sourceSnapshot.sources=review.sourceSnapshot.sources.filter(r=>r.id!==meaningSource.id);reviewMissing.sourceSnapshot!.sources.push(meaningSource);denied(context,()=>context.store.saveMeaningContextSession(reviewMissing));
  const savedIdentity=candidate(context,session).meaningContextReview!.source,otherIdentity=meaningSourceIdentities.find(source=>source.sourceId!==savedIdentity.sourceId)!;
  for(const forgedSource of[{...savedIdentity,sourceId:'project-meaning-context-unregistered-version'},{...savedIdentity,sourceId:otherIdentity.sourceId},{...savedIdentity,sourceLockSha256:otherIdentity.sourceLockSha256}]){
   const mixed=structuredClone(session);candidate(context,mixed).meaningContextReview!.source=forgedSource as typeof savedIdentity;denied(context,()=>context.store.saveMeaningContextSession(mixed));
  }
 },budget.J08);
 it('J09 all newly composed dedicated consumers reject damaged original archive bytes without repairing or partially saving other features',async()=>{
  const context=await generated('damaged-archive'),session=adoptMeaning(context),yue=yueIntent(context,session),element=elementIntent(context,session),before=disk(context),revision=session.reviewRevision!,token=session.reviewToken!;
  const row=context.store.db.exec('SELECT sha256,pack FROM knowledge_archives WHERE version=?',[session.dataVersion])[0].values[0],changed=new Uint8Array(row[1] as Uint8Array);changed[changed.length-1]^=1;context.store.db.run('UPDATE knowledge_archives SET pack=? WHERE sha256=?',[changed,row[0]]);
  try{for(const operation of [()=>context.service.updateMeaningContext(session.id,context.candidateId,{action:'clear'},revision,token),()=>context.service.updateYueReading(session.id,context.candidateId,yue,revision,token),()=>context.service.updateElementAssessment(session.id,context.candidateId,element,revision,token)]){expect(operation).toThrow(/归档|哈希/);expect(disk(context)).toEqual(before);}}
  finally{context.store.db.run('UPDATE knowledge_archives SET pack=? WHERE sha256=?',[row[1],row[0]]);}expect(bytes(current(context).candidates)).toBe(bytes(session.candidates));
 },budget.J09);
 it('J10 covered WORD and adopted meaning remain honest separate-name references and cannot be grafted between real plans',async()=>{
  const primary=await generated('coverage-primary'),adopted=adoptMeaning(primary),secondary=await generated('coverage-secondary',secondaryName),other=current(secondary);
  expect(candidate(primary,adopted).wordPronunciationReference!.reviews.cmn!.status).toBe('no-covered-word');const reference=candidate(secondary,other).wordPronunciationReference!.reviews.cmn!;expect(reference.references.some(r=>r.word==='安然')).toBe(true);
  const options=secondary.service.getMeaningContextOptions(other.id,secondary.candidateId);expect(options.status).toBe('not-covered');expect(options.options).toEqual([]);const originalMeaning=candidate(primary,adopted).meaningContextReview!;
  const forgedPrimary=structuredClone(adopted);candidate(primary,forgedPrimary).wordPronunciationReference=candidate(secondary,other).wordPronunciationReference;denied(primary,()=>primary.service.saveSession(forgedPrimary));
  const forgedSecondary=structuredClone(other);candidate(secondary,forgedSecondary).meaningContextReview=originalMeaning;denied(secondary,()=>secondary.service.saveSession(forgedSecondary));
  denied(primary,()=>primary.service.updateMeaningContext(adopted.id,secondary.candidateId,{action:'clear'},adopted.reviewRevision!,adopted.reviewToken!));
 },budget.J10);
});

describe('joint naming review: modern record authorization and capture witnesses',()=>{
 it('M01 actual modern record/clear coexist with meaning→Yue→element writes and use one CAS/history per commit',async()=>{
  const context=await generated('modern-ordered');let session=recordModern(context);const recordBytes=bytes(candidate(context,session).modernPracticalEvidence);
  session=adoptMeaning(context,session);expect(bytes(candidate(context,session).modernPracticalEvidence)).toBe(recordBytes);session=confirmYue(context,session);expect(bytes(candidate(context,session).modernPracticalEvidence)).toBe(recordBytes);session=confirmElement(context,session);expect(bytes(candidate(context,session).modernPracticalEvidence)).toBe(recordBytes);session=ordinaryReview(context,session);expect(bytes(candidate(context,session).modernPracticalEvidence)).toBe(recordBytes);
  const all=structuredClone(session);session=clearModern(context,session);expect(candidate(context,session).meaningContextReview).toEqual(candidate(context,all).meaningContextReview);expect(candidate(context,session).wordPronunciationReference).toEqual(candidate(context,all).wordPronunciationReference);expect(candidate(context,session).elementAssessment).toEqual(candidate(context,all).elementAssessment);registryIsolation(context,session);
 },budget.M01);
 it('M02 meaning-special save grants no modern authority and cannot use a different clone or altered authorized record',async()=>{
  const context=await generated('modern-exact-object'),before=current(context);
  const unauthorized=structuredClone(before);candidate(context,unauthorized).modernPracticalEvidence=createModernRecord(unauthorized,context.candidateId);denied(context,()=>context.store.saveMeaningContextSession(unauthorized),/现代说明/);
  const exact=structuredClone(before);candidate(context,exact).modernPracticalEvidence=createModernRecord(exact,context.candidateId);authorizeModernMutation(exact,context.candidateId,'record');const detached=structuredClone(exact);denied(context,()=>context.store.saveMeaningContextSession(detached),/现代说明/);
  const changed=structuredClone(before);candidate(context,changed).modernPracticalEvidence=createModernRecord(changed,context.candidateId);authorizeModernMutation(changed,context.candidateId,'record');(candidate(context,changed).modernPracticalEvidence as ModernPracticalEvidenceRecord).recordedAt='2000-01-01T00:00:00.000Z';denied(context,()=>context.store.saveMeaningContextSession(changed),/授权后的记录被替换/);
  expect(candidate(context,current(context)).modernPracticalEvidence).toBeUndefined();
 },budget.M02);
 it('M03 trusted history restoration transfers modern authorization through the final meaning-save clone exactly once',async()=>{
  const context=await generated('modern-history');let session=recordModern(context);const modernOnly=structuredClone(session);session=adoptMeaning(context,session);session=confirmYue(context,session);session=confirmElement(context,session);const all=structuredClone(session);session=clearModern(context,session);
  let revision=context.service.listHistory(session.id).find(r=>r.session.reviewRevision===modernOnly.reviewRevision&&r.session.reviewToken===modernOnly.reviewToken)!;expect(revision).toBeDefined();session=restore(context,session,revision.id,revision.session);expect(candidate(context,session).meaningContextReview).toBeUndefined();expect(bytes(candidate(context,session).modernPracticalEvidence)).toBe(bytes(candidate(context,modernOnly).modernPracticalEvidence));
  revision=context.service.listHistory(session.id).find(r=>r.session.reviewRevision===all.reviewRevision&&r.session.reviewToken===all.reviewToken)!;expect(revision).toBeDefined();session=restore(context,session,revision.id,revision.session);expect(bytes(candidate(context,session).modernPracticalEvidence)).toBe(bytes(candidate(context,all).modernPracticalEvidence));expect(candidate(context,session).meaningContextReview).toEqual(candidate(context,all).meaningContextReview);registryIsolation(context,session);
 },budget.M03);
 it('M04 backup modern capture witnesses must come from that backup,not destination live history',async()=>{
  const context=await generated('modern-backup-witness');let session=adoptMeaning(context);session=confirmYue(context,session);session=recordModern(context,session);session=confirmElement(context,session);const record=modern(context,session),backup=context.store.backupBytes(),destination=await open('modern-backup-destination');destination.store.restore(backup);
  const roundtrip=destination.store.readVerifiedSession(session.id)!;expect(roundtrip.candidates).toEqual(session.candidates);expect(roundtrip.sourceSnapshot).toEqual(session.sourceSnapshot);const before=fs.readFileSync(path.join(destination.userDir,'customers.sqlite')),db=new SQL.Database(backup);
  try{const witnesses=db.exec('SELECT id,json FROM revisions WHERE session_id=?',[session.id])[0].values.filter(row=>{const s=JSON.parse(String(row[1])) as NamingSession;return s.reviewRevision===record.capture.reviewRevision&&s.reviewToken===record.capture.reviewToken;});expect(witnesses).toHaveLength(1);db.run('DELETE FROM revisions WHERE id=?',[witnesses[0][0]]);expect(()=>destination.store.restore(db.export())).toThrow();expect(fs.readFileSync(path.join(destination.userDir,'customers.sqlite'))).toEqual(before);expect(destination.store.readVerifiedSession(session.id)!.candidates).toEqual(roundtrip.candidates);}finally{db.close();}
 },budget.M04);
 it('M05 editing meaning retains the old modern envelope as stale,then explicit recapture refreshes only modern record',async()=>{
  const context=await generated('modern-stale');let session=adoptMeaning(context);session=confirmYue(context,session);session=recordModern(context,session);const old=bytes(candidate(context,session).modernPracticalEvidence);session=ordinaryReview(context,session,true);
  expect(bytes(candidate(context,session).modernPracticalEvidence)).toBe(old);expect(modernRecordView(candidate(context,session)).state).toBe('stale');const staleBefore=structuredClone(session);session=ordinaryReview(context,session);expect(bytes(candidate(context,session).modernPracticalEvidence)).toBe(old);expect(modernRecordView(candidate(context,session)).state).toBe('stale');
  const refreshed=recordModern(context,session);expect(modernRecordView(candidate(context,refreshed)).state).toBe('current');expect(modern(context,refreshed).basis.meaning).toBe(candidate(context,refreshed).meaning);expect(bytes(candidate(context,refreshed).meaningContextReview)).toBe(bytes(candidate(context,staleBefore).meaningContextReview));expect(bytes(candidate(context,refreshed).wordPronunciationReference)).toBe(bytes(candidate(context,staleBefore).wordPronunciationReference));
 },budget.M05);
});
