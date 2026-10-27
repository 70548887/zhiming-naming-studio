import {afterEach,describe,expect,it,vi} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {normalizePreferences} from '../src/shared/workflow';
import {NAMING_RULE_V71_VERSION,NAMING_RULE_V71_SOURCE_ID,ALL_NAMING_RULE_SOURCE_IDS} from '../src/shared/naming-rules';
import type {NamingSession} from '../src/shared/types';
import {cleanup,open,close,directory,disk,digest,selected,rawSession,read,oldHundred,removedProjectFootprint,changedBackup,realArchiveMatches,installPrivateBytes,positiveProfile,projectPreferences,selection,originalFixture,type StoreContext,type ProjectSession} from './helpers/project-naming-store-fixture';

afterEach(async()=>{try{await cleanup();}finally{vi.restoreAllMocks();vi.unstubAllGlobals();}},15000);
const certificate=(session:ProjectSession)=>JSON.stringify(session.analysis.projectNamingUse);
function assertBaseline(context:StoreContext,session:ProjectSession){
 expect(session.candidates.length).toBeGreaterThan(0);expect(session.sourceSnapshot!.sources.length).toBeGreaterThan(2);
 expect(realArchiveMatches(context,session),'actual complete FactArchive package bytes must match the saved verification identity').toBe(true);
 expect(selected(session).evaluation.traditional).toBe(originalFixture.positive.expectedTraditional);
 expect(session.namingRules).toEqual({version:NAMING_RULE_V71_VERSION,dataVersion:session.dataVersion,sourceId:NAMING_RULE_V71_SOURCE_ID});
 const dedicated=session.sourceSnapshot!.sources.filter(source=>(ALL_NAMING_RULE_SOURCE_IDS as readonly string[]).includes(source.id));
 expect(dedicated.map(source=>source.id)).toEqual([NAMING_RULE_V71_SOURCE_ID]);
 expect((session.profile.namingPreferences as any).namingElementMethod).toEqual(selection());
 expect(session.analysis.projectNamingUse!.schema).toBe('project-naming-use/1');
 expect(session.analysis.projectNamingUse!.sourceRecipe).toEqual({schema:'naming-element-source-recipe/1',source:'project',namingRulesVersion:NAMING_RULE_V71_VERSION,applicationPolicyVersion:'naming-element-application/1.0.0'});
 expect(session.analysis.projectNamingUse!.application.effectiveElements).toEqual(originalFixture.positive.expectedElements);
 expect(session.analysis.bazi.favorable).toEqual(originalFixture.positive.legacyElements);
 expect(session.originalFavorable).toEqual(originalFixture.positive.legacyElements);
 for(const id of ['project-bazi-mainchain-145','naming-element-application-v1'])expect(session.sourceSnapshot!.sources.filter(source=>source.id===id)).toHaveLength(1);
}
async function generate(){
 const context=await open();
 const fetch=vi.fn(()=>{throw Error('Store boundary tests must not invoke AI/network');});vi.stubGlobal('fetch',fetch);
 const session=(await context.service.generate(positiveProfile(),projectPreferences())).session as ProjectSession;
 assertBaseline(context,session);expect(fetch).not.toHaveBeenCalled();return{context,session};
}
function state(context:StoreContext,id:string){const current=rawSession(context,id);return{bytes:disk(context),revision:current.reviewRevision,token:current.reviewToken,json:JSON.stringify(current)};}
function assertState(context:StoreContext,id:string,before:ReturnType<typeof state>){const current=rawSession(context,id),after=disk(context);expect(after.equals(before.bytes)).toBe(true);expect(current.reviewRevision).toBe(before.revision);expect(current.reviewToken).toBe(before.token);expect(JSON.stringify(current)).toBe(before.json);console.info('M157_DB_REVIEW_STATE '+JSON.stringify({sessionId:id,beforeSha256:digest(before.bytes),afterSha256:digest(after),beforeRevision:before.revision,afterRevision:current.reviewRevision,beforeToken:before.token,afterToken:current.reviewToken,bytesAndReviewStateUnchanged:true}));}
function withoutToken(session:NamingSession){const result=structuredClone(session);delete result.reviewToken;return result;}

describe('M157 real Store project adoption and saved evaluation boundaries',{timeout:60000},()=>{
 it('retains a valid40 full session through real save, reopen, history and complete backup restore',async()=>{
  let {context,session}=await generate();const initialCertificate=certificate(session),saved=context.service.saveSession(structuredClone(session)) as ProjectSession;
  const persisted=read(context,saved.id),beforeReopen=disk(context);await close(context);context=await open(context.directory);const reopened=read(context,saved.id);
  expect(reopened).toEqual(persisted);expect(disk(context).equals(beforeReopen)).toBe(true);assertBaseline(context,reopened);expect(certificate(reopened)).toBe(initialCertificate);
  const edited=structuredClone(reopened);edited.reviewNote='M157 valid review';selected(edited).reviewNote='M157 candidate note';
  const current=context.service.saveSession(edited) as ProjectSession;const history=context.service.listHistory(current.id);expect(history.length).toBeGreaterThan(0);
  for(const revision of history){assertBaseline(context,revision.session as ProjectSession);expect(certificate(revision.session as ProjectSession)).toBe(initialCertificate);}
  const restored=context.service.restoreHistory(current.id,history[0].id,current.reviewRevision,current.reviewToken) as ProjectSession;assertBaseline(context,restored);expect(certificate(restored)).toBe(initialCertificate);
  const bytes=context.store.backupBytes(),destination=await open();destination.store.restore(bytes);const imported=read(destination,restored.id);
  assertBaseline(destination,imported);expect(certificate(imported)).toBe(initialCertificate);expect(withoutToken(imported)).toEqual(withoutToken(restored));expect(imported.reviewToken).not.toBe(restored.reviewToken);
  for(const revision of destination.service.listHistory(imported.id)){assertBaseline(destination,revision.session as ProjectSession);expect(certificate(revision.session as ProjectSession)).toBe(initialCertificate);}
  console.info('M157_VALID40_STORE '+JSON.stringify({sessionId:restored.id,score:selected(imported).evaluation.traditional,certificateSha256:digest(Buffer.from(initialCertificate)),backupSha256:digest(bytes),sourceDbSha256:digest(disk(context)),restoredDbSha256:digest(disk(destination)),restoredReviewTokenRotated:imported.reviewToken!==restored.reviewToken}));
 });
 it('allows a project40 manual review draft through Service save, reopen, history, backup and history restore without rewriting generation facts',async()=>{
  let {context,session}=await generate();
  const originalCertificate=certificate(session),originalEvaluations=session.candidates.map(candidate=>({id:candidate.id,evaluation:structuredClone(candidate.evaluation)})),originalSources=structuredClone(session.sourceSnapshot);
  const assertGeneration=(owner:StoreContext,value:ProjectSession)=>{
   assertBaseline(owner,value);
   expect(value.profile.namingPreferences!.preferredElements).toEqual([]);
   expect((value.profile.namingPreferences as any).namingElementMethod).toEqual(selection());
   expect((value.preferences as any).namingElementMethod).toEqual(selection());
   expect(certificate(value)).toBe(originalCertificate);
   expect(value.candidates.map(candidate=>({id:candidate.id,evaluation:candidate.evaluation}))).toEqual(originalEvaluations);
   expect(value.sourceSnapshot).toEqual(originalSources);
  };
  const assertDraft=(owner:StoreContext,value:ProjectSession)=>{assertGeneration(owner,value);expect(value.preferences.preferredElements).toEqual(['水']);};
  const incoming=structuredClone(session);incoming.preferences={...incoming.preferences,preferredElements:['水']};incoming.reviewNote='M157 project manual draft saved without regeneration';
  expect(incoming.profile.namingPreferences!.preferredElements).toEqual([]);expect(incoming.preferences.preferredElements).toEqual(['水']);
  const saved=context.service.saveSession(incoming) as ProjectSession;assertDraft(context,saved);
  const normalized=normalizePreferences(saved.preferences);
  expect(normalized.preferredElements).toEqual(['水']);expect((normalized as any).namingElementMethod).toEqual(selection());
  expect(saved.profile.namingPreferences!.preferredElements).toEqual([]);expect(selected(saved).evaluation.traditional).toBe(40);expect(certificate(saved)).toBe(originalCertificate);
  const persisted=read(context,saved.id),beforeReopen=disk(context);assertDraft(context,persisted);
  await close(context);context=await open(context.directory);
  const reopened=read(context,saved.id);expect(reopened).toEqual(persisted);expect(disk(context).equals(beforeReopen)).toBe(true);assertDraft(context,reopened);
  const noteOnly=structuredClone(reopened);noteOnly.reviewNote='M157 archive the water review draft';
  const current=context.service.saveSession(noteOnly) as ProjectSession;assertDraft(context,current);
  const history=context.service.listHistory(current.id);expect(history.length).toBeGreaterThan(0);
  for(const revision of history)assertGeneration(context,revision.session as ProjectSession);
  const draftRevision=history.find(revision=>revision.session.preferences.preferredElements.length===1&&revision.session.preferences.preferredElements[0]==='水');
  expect(draftRevision,'the real saved water draft must exist as a history row').toBeDefined();assertDraft(context,draftRevision!.session as ProjectSession);
  const backup=context.store.backupBytes(),destination=await open();destination.store.restore(backup);
  const imported=read(destination,current.id);assertDraft(destination,imported);expect(withoutToken(imported)).toEqual(withoutToken(current));expect(imported.reviewToken).not.toBe(current.reviewToken);
  const importedHistory=destination.service.listHistory(imported.id);
  for(const revision of importedHistory)assertGeneration(destination,revision.session as ProjectSession);
  const importedDraft=importedHistory.find(revision=>revision.id===draftRevision!.id);expect(importedDraft).toBeDefined();assertDraft(destination,importedDraft!.session as ProjectSession);
  const restored=destination.service.restoreHistory(imported.id,importedDraft!.id,imported.reviewRevision,imported.reviewToken) as ProjectSession;
  assertDraft(destination,restored);assertDraft(destination,read(destination,restored.id));
  for(const revision of destination.service.listHistory(restored.id))assertGeneration(destination,revision.session as ProjectSession);
  const output=process.env.PROJECT_STORE_REVIEW_OUTPUT;
  if(output){
   const actualSaved=read(destination,restored.id);assertDraft(destination,actualSaved);
   const bytes=Buffer.from(JSON.stringify(actualSaved,null,2)+'\n'),temporary=output+'.tmp';fs.writeFileSync(temporary,bytes);fs.renameSync(temporary,output);
   const receipt={schema:'m157-actual-saved-project-review/1',source:'actual-Service-save-Store-reopen-history-backup-historyRestore',sessionFile:output,sessionSha256:digest(bytes),sessionId:actualSaved.id,reviewPreferredElements:actualSaved.preferences.preferredElements,generationPreferredElements:actualSaved.profile.namingPreferences!.preferredElements,method:(actualSaved.profile.namingPreferences as any).namingElementMethod,traditionalScore:selected(actualSaved).evaluation.traditional,certificateSha256:digest(Buffer.from(certificate(actualSaved))),readOnlyDesignInput:true,fixtureIsNotCustomerDatabase:true};
   fs.writeFileSync(output+'.receipt.json.tmp',JSON.stringify(receipt,null,2)+'\n');fs.renameSync(output+'.receipt.json.tmp',output+'.receipt.json');
  }
  console.info('M157_PROJECT40_MANUAL_REVIEW_DRAFT '+JSON.stringify({sessionId:restored.id,reviewPreferredElements:restored.preferences.preferredElements,generationPreferredElements:restored.profile.namingPreferences!.preferredElements,traditionalScore:selected(restored).evaluation.traditional,allCandidateEvaluationsPreserved:true,certificateSha256:digest(Buffer.from(originalCertificate)),backupSha256:digest(backup),sourceDbSha256:digest(disk(context)),restoredDbSha256:digest(disk(destination)),historyDraftRevisionId:importedDraft!.id}));
 });
 it('rejects a correct-certificate old100 score on direct Store save without changing DB bytes or the existing review token',async()=>{
  const {context,session}=await generate(),before=state(context,session.id),forged=oldHundred(session);forged.reviewNote='Must reject direct Store old100';
  expect(certificate(forged)).toBe(certificate(session));expect(selected(forged).evaluation.traditional).toBe(100);
  expect(()=>context.store.saveSession(forged)).toThrow();assertState(context,session.id,before);assertBaseline(context,read(context,session.id));
 });
 it('rejects a correct-certificate old100 current SQL row at verified read/rows/backup and on a private cold reopen',async()=>{
  const {context,session}=await generate(),before=state(context,session.id),forged=oldHundred(session);
  context.store.db.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(forged),session.id]);
  try{
   expect(()=>context.store.readVerifiedSession(session.id)).toThrow();expect(()=>context.store.rows('sessions')).toThrow();expect(()=>context.store.backupBytes()).toThrow();
   expect(disk(context).equals(before.bytes)).toBe(true);expect(rawSession(context,session.id).reviewToken).toBe(before.token);
  }finally{context.store.db.run('UPDATE sessions SET json=? WHERE id=?',[before.json,session.id]);}
  assertState(context,session.id,before);
  const corrupted=await changedBackup(context.store.backupBytes(),'current'),privateDirectory=directory();installPrivateBytes(privateDirectory,corrupted);
  await expect(open(privateDirectory)).rejects.toThrow();expect(fs.readFileSync(path.join(privateDirectory,'customers.sqlite')).equals(Buffer.from(corrupted))).toBe(true);
  assertBaseline(context,read(context,session.id));
 });
 it('rejects an old100 real history row on direct history read, Service history and restore before overlay can hide it',async()=>{
  const {context,session}=await generate();const edit=structuredClone(session);edit.reviewNote='Create actual revision';const current=context.service.saveSession(edit);
  const revision=context.service.listHistory(current.id)[0];expect(revision).toBeDefined();const before=state(context,current.id),prior=context.store.db.exec('SELECT json FROM revisions WHERE id=?',[revision.id])[0].values[0][0];
  const forged=oldHundred(revision.session);expect(certificate(forged)).toBe(certificate(revision.session as ProjectSession));context.store.db.run('UPDATE revisions SET json=? WHERE id=?',[JSON.stringify(forged),revision.id]);
  try{
   expect(()=>context.store.listRevisions(current.id)).toThrow();expect(()=>context.service.listHistory(current.id)).toThrow();
   expect(()=>context.service.restoreHistory(current.id,revision.id,current.reviewRevision,current.reviewToken)).toThrow();
   expect(disk(context).equals(before.bytes)).toBe(true);expect(rawSession(context,current.id).reviewToken).toBe(before.token);expect(rawSession(context,current.id).reviewRevision).toBe(before.revision);
  }finally{context.store.db.run('UPDATE revisions SET json=? WHERE id=?',[prior,revision.id]);}
  assertState(context,current.id,before);assertBaseline(context,read(context,current.id));
 });
 it('atomically rejects full real backups with old100 in either the current or a historical row',async()=>{
  const {context,session}=await generate();const edit=structuredClone(session);edit.reviewNote='Archive for restore fault';const current=context.service.saveSession(edit);expect(context.service.listHistory(current.id).length).toBeGreaterThan(0);
  const backup=context.store.backupBytes(),before=state(context,current.id);
  for(const target of ['current','history'] as const){const corrupted=await changedBackup(backup,target);expect(digest(corrupted)).not.toBe(digest(backup));expect(()=>context.store.restore(corrupted)).toThrow();assertState(context,current.id,before);assertBaseline(context,read(context,current.id));}
 });
 it('rejects incoming Service old100 before replacing the caller analysis/profile/sources and leaves bytes/token unchanged',async()=>{
  const {context,session}=await generate(),before=state(context,session.id),incoming=oldHundred(session);incoming.reviewNote='Must reject before original field overlay';
  const analysis=incoming.analysis,profile=incoming.profile,sources=incoming.sourceSnapshot;expect(certificate(incoming)).toBe(certificate(session));
  expect(()=>context.service.saveSession(incoming)).toThrow();expect(incoming.analysis).toBe(analysis);expect(incoming.profile).toBe(profile);expect(incoming.sourceSnapshot).toBe(sources);expect(selected(incoming).evaluation.traditional).toBe(100);
  assertState(context,session.id,before);assertBaseline(context,read(context,session.id));
 });
 it('rejects incoming deletion of the entire project footprint even when old100 is legacy-consistent, using the existing project row as the anchor',async()=>{
  const {context,session}=await generate(),before=state(context,session.id),incoming=removedProjectFootprint(session);incoming.reviewNote='Must reject anchored identity downgrade';
  expect(incoming.candidates.length).toBe(session.candidates.length);expect(incoming.sourceSnapshot!.sources.length).toBeGreaterThan(0);expect(selected(incoming).evaluation.traditional).toBe(100);
  expect(incoming.analysis).not.toHaveProperty('projectNamingUse');expect(incoming.profile.namingPreferences).not.toHaveProperty('namingElementMethod');expect(incoming.preferences).not.toHaveProperty('namingElementMethod');
  const analysis=incoming.analysis,profile=incoming.profile,sources=incoming.sourceSnapshot;
  expect(()=>context.service.saveSession(incoming)).toThrow();expect(incoming.analysis).toBe(analysis);expect(incoming.profile).toBe(profile);expect(incoming.sourceSnapshot).toBe(sources);expect(incoming.analysis).not.toHaveProperty('projectNamingUse');
  assertState(context,session.id,before);assertBaseline(context,read(context,session.id));
 });
 it('rejects an incoming project snapshot getter before any getter read, JSON traversal or immutable-field overlay',async()=>{
  const {context,session}=await generate(),before=state(context,session.id),incoming=structuredClone(session),savedUse=incoming.analysis.projectNamingUse;
  let reads=0;Object.defineProperty(incoming.analysis,'projectNamingUse',{enumerable:true,configurable:true,get(){reads++;return savedUse;}});
  const analysis=incoming.analysis,profile=incoming.profile,sources=incoming.sourceSnapshot;
  expect(()=>context.service.saveSession(incoming)).toThrow();expect(reads).toBe(0);
  expect(incoming.analysis).toBe(analysis);expect(incoming.profile).toBe(profile);expect(incoming.sourceSnapshot).toBe(sources);
  assertState(context,session.id,before);assertBaseline(context,read(context,session.id));
  console.info('M157_PROJECT_SNAPSHOT_GETTER '+JSON.stringify({sessionId:session.id,getterReads:reads,requestRejected:true,dbSha256:digest(disk(context)),reviewToken:rawSession(context,session.id).reviewToken}));
 });
 it('rejects an incoming reserved source-ID getter before any getter read, JSON traversal or immutable-field overlay',async()=>{
  const {context,session}=await generate(),before=state(context,session.id),incoming=structuredClone(session),source=incoming.sourceSnapshot!.sources.find(value=>value.id==='project-bazi-mainchain-145');
  expect(source).toBeDefined();const originalId=source!.id;let reads=0;Object.defineProperty(source!,'id',{enumerable:true,configurable:true,get(){reads++;return originalId;}});
  const analysis=incoming.analysis,profile=incoming.profile,sources=incoming.sourceSnapshot;
  expect(()=>context.service.saveSession(incoming)).toThrow();expect(reads).toBe(0);
  expect(incoming.analysis).toBe(analysis);expect(incoming.profile).toBe(profile);expect(incoming.sourceSnapshot).toBe(sources);
  assertState(context,session.id,before);assertBaseline(context,read(context,session.id));
  console.info('M157_PROJECT_SOURCE_ID_GETTER '+JSON.stringify({sessionId:session.id,getterReads:reads,requestRejected:true,dbSha256:digest(disk(context)),reviewToken:rawSession(context,session.id).reviewToken}));
 });
});
