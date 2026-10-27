import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {analyzeNumerology,validNumerologySnapshot} from '../src/domain/numerology';
import {decodeCustomerBackup} from '../src/main/customer-backup-envelope';
import {loadNumerologyData,type NumerologyResources} from '../src/main/numerology-data';
import {ownReviewedDataJson} from '../src/main/reviewed-naming-data-generation';
import {normalizeReviewedNumerologySnapshotForAttach} from '../src/main/reviewed-naming-data-snapshot';
import {REVIEWED_DATA_METHOD,REVIEWED_DATA_SOURCE_IDS,type ReviewedDataSelection,type ReviewedNamingSession} from '../src/shared/reviewed-naming-data';
import type {NamingSession,NumerologyAnalysis,SessionRevision} from '../src/shared/types';
import {captureWriteBoundary,clone,closeFlowStore,disposeFlowFixtures,flowData,flowPreferences,flowProfile,openFlowStore,type FlowContext,type Mutable} from './helpers/reviewed-naming-data-flow-fixture';

const selection:ReviewedDataSelection={method:REVIEWED_DATA_METHOD,semanticThemeIds:[],objectThemes:{}};
const evidenceDirectory=path.resolve('.local/m836-tests');
const observations:Array<{case:string;verified:Record<string,unknown>}>=[];
const operations:Array<{operation:string;status:'returned'|'threw';milliseconds:number;error?:string}>=[];
let context:FlowContext,numerology:NumerologyResources,rawGenerated:NamingSession,latest:ReviewedNamingSession;
let generated:ReviewedNamingSession,saved:ReviewedNamingSession,complete:ReviewedNamingSession,ids:Record<string,string>,oldRow:string,oldHistory:unknown,expectedHistory:ReturnType<typeof historyFacts>;

function writeEvidence():void {
  fs.mkdirSync(evidenceDirectory,{recursive:true});
  for(const [name,value] of [
    ['real-results.json',{suite:'tests/m836-reviewed-numerology.test.ts',generatedAt:new Date().toISOString(),observations,notes:['Vitest JSON is the test verdict; a recorded observation does not by itself mean the case passed.','Real numerology:true generation, actual locked stroke records, real Store/StudioService and NSBK; no UI or package claim.']}],
    ['runtime-ledger.json',{suite:'tests/m836-reviewed-numerology.test.ts',operations}],
  ] as const){
    const target=path.join(evidenceDirectory,name),temporary=target+'.tmp';
    fs.writeFileSync(temporary,JSON.stringify(value,null,2)+'\n','utf8');fs.renameSync(temporary,target);
  }
}
function observed(caseName:string,verified:Record<string,unknown>):void {observations.push({case:caseName,verified});writeEvidence();}
async function timed<T>(operation:string,action:()=>T|Promise<T>):Promise<T> {
  const start=performance.now();let status:'returned'|'threw'='threw',error:string|undefined;
  try{const result=await action();status='returned';return result;}
  catch(cause){error=cause instanceof Error?cause.message:String(cause);throw cause;}
  finally{operations.push({operation,status,milliseconds:Math.round(performance.now()-start),...(error?{error}:{})});writeEvidence();}
}
function reviewed(session:NamingSession):ReviewedNamingSession {
  expect((session as Partial<ReviewedNamingSession>).reviewedData?.method).toBe(REVIEWED_DATA_METHOD);
  return session as ReviewedNamingSession;
}
function analysis(session:NamingSession):NumerologyAnalysis {
  expect(session.preferences.numerology).toBe(true);expect(session.candidates).toHaveLength(1);
  const value=session.candidates[0].numerology;
  expect(value).toBeDefined();expect(validNumerologySnapshot(value,session.profile.surname,session.candidates[0].givenName)).toBe(true);
  return value!;
}
function assertSourceRecords(session:NamingSession):void {
  const value=analysis(session);
  expect(value.dataVersion).toBe(numerology.strokes.version);expect(value.rule).toEqual(numerology.rules.profile);
  for(const choice of value.strokes)expect(choice.options).toEqual(numerology.strokes.records.filter(record=>record.character===choice.inputChar));
  for(const source of [...numerology.strokes.sources,...numerology.rules.sources])expect(session.sourceSnapshot!.sources.find(row=>row.id===source.id)).toEqual(source);
}
function selectedRecords(value:NumerologyAnalysis,glyphs=['林','紀','楓']):Record<string,string> {
  return Object.fromEntries(value.strokes.map((choice,index)=>{
    const record=choice.options.find(option=>option.glyph===glyphs[index]);
    expect(record,choice.inputChar+' must have its actual requested source glyph').toBeDefined();
    expect(numerology.strokes.records.find(row=>row.id===record!.id)).toEqual(record);
    return [String(choice.position),record!.id];
  }));
}
function assertUnselected(value:NumerologyAnalysis,positions:readonly number[]):void {
  for(const position of positions){expect(value.strokes[position].status).toBe('ambiguous');expect(Object.hasOwn(value.strokes[position],'selectedRecordId')).toBe(false);}
  expect(value.status).toBe('pending');expect(value.grids).toEqual([]);expect(value).not.toHaveProperty('threeTalents');
}
function assertProof(session:ReviewedNamingSession,original:ReviewedNamingSession):void {
  expect(session.reviewedData).toEqual(original.reviewedData);expect(session.candidates[0].reviewedDataUse).toEqual(original.candidates[0].reviewedDataUse);
  expect(session.candidates[0].evaluation).toEqual(original.candidates[0].evaluation);expect(session.sourceSnapshot).toEqual(original.sourceSnapshot);
}
function historyFacts(history:SessionRevision[]) {
  return history.map(row=>({id:row.id,sessionId:row.sessionId,createdAt:row.createdAt,session:row.session}));
}
function rejectWithoutWrite(label:string,action:()=>unknown):string {
  const before=captureWriteBoundary(context);let error:unknown;
  try{action();}catch(cause){error=cause;}
  expect(error,label).toBeInstanceOf(Error);expect(captureWriteBoundary(context),label+' preserves actual file, revisions, profile CAS and review CAS').toEqual(before);
  return (error as Error).message;
}
async function rejectGenerateWithoutWrite(label:string,action:()=>Promise<unknown>):Promise<void> {
  const before=captureWriteBoundary(context);await expect(action(),label).rejects.toThrow();expect(captureWriteBoundary(context),label+' preserves actual file, revisions, profile CAS and review CAS').toEqual(before);
}
function rawSnapshot():Mutable<NamingSession> {
  const sample=clone(rawGenerated);
  sample.candidates[0].numerology=analyzeNumerology(sample.profile.surname,sample.candidates[0].givenName,numerology.strokes,numerology.rules);
  return sample;
}

// Each persisted lifecycle phase has its own verdict. The first combined case
// exceeded240s; all original assertions remain below, with real operation times.
// No product timeout, fixture or existing suite budget is changed.
beforeAll(async()=>{numerology=loadNumerologyData(flowData);context=await timed('open-real-store',()=>openFlowStore('m836-numerology'));},120000);
afterAll(async()=>{try{await timed('dispose-owned-flow-fixtures',()=>disposeFlowFixtures());}finally{writeEvidence();}},120000);

describe('M836 real reviewed generation with numerology enabled',()=>{
  it('generates ordinary and reviewed pending numerology for the same profile and name',async()=>{
    const profile={...flowProfile('m836-lifecycle'),customerName:'M836虚构家庭'},preferences=flowPreferences('纪枫',{numerology:true,preferredElements:['木']});
    rawGenerated=(await timed('ordinary-numerology-true-generate',()=>context.service.generate(profile,preferences))).session;
    expect(rawGenerated.candidates.map(candidate=>candidate.givenName)).toEqual(['纪枫']);expect(rawGenerated).not.toHaveProperty('reviewedData');
    const raw=analysis(rawGenerated);expect(raw.status).toBe('pending');expect(raw.grids).toEqual([]);
    for(const position of [1,2]){expect(raw.strokes[position].status).toBe('ambiguous');expect(Object.hasOwn(raw.strokes[position],'selectedRecordId')).toBe(true);expect(raw.strokes[position].selectedRecordId).toBeUndefined();}
    assertSourceRecords(rawGenerated);
    oldRow=String(context.store.db.exec('SELECT json FROM sessions WHERE id=?',[rawGenerated.id])[0].values[0][0]);
    oldHistory=context.store.db.exec('SELECT id,session_id,created_at,json FROM revisions WHERE session_id=? ORDER BY id',[rawGenerated.id])[0]?.values??[];

    generated=reviewed((await timed('reviewed-same-profile-same-name-numerology-true-generate',()=>context.service.generateReviewed(profile,preferences,selection))).session);
    expect(generated.candidates.map(candidate=>candidate.givenName)).toEqual(['纪枫']);assertUnselected(analysis(generated),[1,2]);assertSourceRecords(generated);
    for(const sourceId of REVIEWED_DATA_SOURCE_IDS)expect(generated.sourceSnapshot!.sources.filter(source=>source.id===sourceId)).toHaveLength(1);
    ids=selectedRecords(analysis(generated));
    observed('generated-pending-numerology',{ordinaryAndReviewedEnabled:true,name:'林纪枫',rawOwnUndefinedPositions:[1,2],generatedOptionalFieldsAbsent:true,sourceRecordsExact:true});
  },60000);

  it('persists partial and cleared choices, reviews pending strokes and selects actual complete records',async()=>{
    expect(generated).toBeDefined();
    const partial=reviewed(await timed('partial-source-selection',()=>context.service.updateNumerology(generated.id,generated.candidates[0].id,{'1':ids['1']},generated.reviewRevision,generated.reviewToken)));
    expect(analysis(partial).strokes[1]).toMatchObject({selectedRecordId:ids['1'],status:'selected'});assertUnselected(analysis(partial),[2]);assertProof(partial,generated);
    const cleared=reviewed(await timed('clear-source-selection',()=>context.service.updateNumerology(partial.id,partial.candidates[0].id,{},partial.reviewRevision,partial.reviewToken)));
    assertUnselected(analysis(cleared),[1,2]);expect(analysis(cleared).strokes[0].selectedRecordId).toBe(ids['0']);assertProof(cleared,generated);

    const draft=clone(cleared);draft.reviewNote='M836真实数理流程审阅';draft.candidates[0].favorite=true;draft.candidates[0].reviewNote='M836保留未选来源，等待确认';
    saved=reviewed(await timed('save-review-with-pending-numerology',()=>context.service.saveSession(draft)));
    expect(saved.reviewRevision).toBe(cleared.reviewRevision!+1);expect(saved.reviewToken).not.toBe(cleared.reviewToken);assertUnselected(analysis(saved),[1,2]);assertProof(saved,generated);
    complete=reviewed(await timed('complete-source-selection',()=>context.service.updateNumerology(saved.id,saved.candidates[0].id,ids,saved.reviewRevision,saved.reviewToken)));
    const completed=analysis(complete);expect(completed.status).toBe('complete');
    expect(completed).toEqual(analyzeNumerology('林','纪枫',numerology.strokes,numerology.rules,ids));
    expect(Object.fromEntries(completed.grids.map(grid=>[grid.name,grid.value]))).toEqual({'天格':9,'人格':17,'地格':22,'外格':14,'总格':30});
    for(const choice of completed.strokes){expect(Object.hasOwn(choice,'selectedRecordId')).toBe(true);expect(choice.selectedRecordId).toBe(ids[String(choice.position)]);expect(choice.options.find(record=>record.id===choice.selectedRecordId)).toEqual(numerology.strokes.records.find(record=>record.id===choice.selectedRecordId));}
    assertSourceRecords(complete);assertProof(complete,generated);
    observed('selected-and-reviewed-numerology',{partialAndClearPersisted:true,selectedRecordIds:ids,completeGrids:Object.fromEntries(completed.grids.map(grid=>[grid.name,grid.value])),proofSourcesAndScoresUnchanged:true});
  },120000);

  it('reads and restores the pending numerology revision with immutable source and naming proof',async()=>{
    expect(complete).toBeDefined();
    const beforeRestore=await timed('read-real-history-before-restore',()=>context.service.listHistory(complete.id));
    const pendingRevision=beforeRestore.find(row=>row.session.reviewRevision===saved.reviewRevision);
    expect(pendingRevision).toBeDefined();expect(pendingRevision!.session.candidates[0].numerology).toEqual(analysis(saved));
    latest=reviewed(await timed('restore-reviewed-pending-history',()=>context.service.restoreHistory(complete.id,pendingRevision!.id,complete.reviewRevision,complete.reviewToken)));
    expect(latest.reviewRevision).toBe(complete.reviewRevision!+1);expect(latest.reviewToken).not.toBe(complete.reviewToken);
    expect(latest.candidates).toEqual(saved.candidates);expect(latest.reviewNote).toBe(saved.reviewNote);assertUnselected(analysis(latest),[1,2]);assertProof(latest,generated);
    expectedHistory=historyFacts(await timed('read-real-history-after-restore',()=>context.service.listHistory(latest.id)));
    expect(expectedHistory.some(row=>row.session.candidates[0].numerology?.status==='complete')).toBe(true);
    observed('restored-pending-numerology',{historyRestoredPending:true,casAdvanced:true,completeRevisionRetained:true,proofAndSourcesExact:true});
  },120000);

  it('restores the true NSBK into a fresh Store with all numerology histories and untouched ordinary rows',async()=>{
    expect(latest).toBeDefined();
    const backup=await timed('create-nsbk-envelope',()=>context.store.backupBytes());
    expect(Buffer.from(backup).subarray(0,8).toString('ascii')).toBe('NSBK0001');expect(decodeCustomerBackup(backup).format).toBe('compact-sqlite');
    const target=await timed('open-restore-target',()=>openFlowStore('m836-restore-target'));
    await timed('restore-nsbk-real-store',()=>target.store.restore(backup));await closeFlowStore(target);
    const fresh=await timed('open-fresh-restored-store',()=>openFlowStore('m836-restored-fresh',target.directory));
    try{
      const persisted=reviewed((await timed('fresh-verified-session-detail',()=>fresh.service.readSessionDetail(latest.id)))!);
      expect(persisted.reviewToken).not.toBe(latest.reviewToken);expect({...persisted,reviewToken:latest.reviewToken}).toEqual(latest);assertUnselected(analysis(persisted),[1,2]);assertSourceRecords(persisted);assertProof(persisted,generated);
      expect(historyFacts(await timed('fresh-verified-history',()=>fresh.service.listHistory(latest.id)))).toEqual(expectedHistory);
      const old=(await timed('fresh-ordinary-session-detail',()=>fresh.service.readSessionDetail(rawGenerated.id)))!;
      expect(old).not.toHaveProperty('reviewedData');expect(old.candidates[0]).not.toHaveProperty('reviewedDataUse');expect(analysis(old).status).toBe('pending');
    }finally{await closeFlowStore(fresh);}
    expect(String(context.store.db.exec('SELECT json FROM sessions WHERE id=?',[rawGenerated.id])[0].values[0][0])).toBe(oldRow);
    expect(context.store.db.exec('SELECT id,session_id,created_at,json FROM revisions WHERE session_id=? ORDER BY id',[rawGenerated.id])[0]?.values??[]).toEqual(oldHistory);
    observed('real-numerology-lifecycle',{name:'林纪枫',ordinarySameProfileSameName:true,rawOwnUndefinedPositions:[1,2],partialAndClearPersisted:true,selectedRecordIds:ids,completeGrids:Object.fromEntries(analysis(complete).grids.map(grid=>[grid.name,grid.value])),historyRestoredPending:true,nsbkMagic:'NSBK0001',freshDetailAndAllHistoryVerified:true,proofSourcesAndScoresUnchanged:true,ordinaryRowAndHistoryUnchanged:true});
  },120000);

  it('keeps a real source-free surname pending without inventing counts or a completed conclusion',async()=>{
    expect(numerology.strokes.records.filter(record=>record.character==='龘')).toEqual([]);
    const profile={...flowProfile('m836-missing-stroke'),surname:'龘',surnamePinyin:'dá'};
    const session=reviewed((await timed('reviewed-missing-surname-source-generate',()=>context.service.generateReviewed(profile,flowPreferences('纪枫',{numerology:true}),selection))).session);
    const value=analysis(session);expect(value.fullName).toBe('龘纪枫');expect(value.strokes[0]).toMatchObject({inputChar:'龘',role:'surname',status:'missing',options:[]});
    expect(Object.hasOwn(value.strokes[0],'selectedRecordId')).toBe(false);expect(value.status).toBe('pending');expect(value.grids).toEqual([]);expect(value).not.toHaveProperty('threeTalents');expect(value.warnings.join('')).toContain('龘');assertSourceRecords(session);
    expect((await timed('missing-stroke-verified-detail',()=>context.service.readSessionDetail(session.id)))!.candidates[0].numerology).toEqual(value);
    observed('real-missing-stroke',{surname:'龘',lockedRecords:0,status:value.status,gridCount:value.grids.length,missingChoicePreserved:true,verifiedDetail:true});
  },120000);

  it('owns only lawful unresolved selectedRecordId omissions and preserves the raw analyzer and selected source IDs',()=>{
    const input=rawSnapshot(),before=clone(input),raw=analysis(input);
    expect(()=>ownReviewedDataJson(input)).toThrow();expect(Object.hasOwn(raw.strokes[1],'selectedRecordId')).toBe(true);
    const normalized=normalizeReviewedNumerologySnapshotForAttach(input),pending=analysis(normalized);
    expect(normalized).not.toBe(input);expect(input).toEqual(before);expect(Object.hasOwn(analysis(input).strokes[1],'selectedRecordId')).toBe(true);
    assertUnselected(pending,[1,2]);expect(pending.strokes[0].selectedRecordId).toBe(raw.strokes[0].selectedRecordId);
    expect(normalized).toEqual(JSON.parse(JSON.stringify(input)));expect(ownReviewedDataJson(normalized)).toEqual(normalized);
    normalized.candidates[0].numerology!.strokes[1].options[0].note='M836 owned-copy mutation';expect(input).toEqual(before);
    const selected=rawSnapshot(),ids=selectedRecords(analysis(selected));
    selected.candidates[0].numerology=analyzeNumerology('林','纪枫',numerology.strokes,numerology.rules,ids);
    const selectedBefore=clone(selected),fixed=normalizeReviewedNumerologySnapshotForAttach(selected);
    expect(fixed).toEqual(selectedBefore);expect(selected).toEqual(selectedBefore);
    for(const choice of analysis(fixed).strokes){expect(Object.hasOwn(choice,'selectedRecordId')).toBe(true);expect(choice.selectedRecordId).toBe(ids[String(choice.position)]);}
    observed('owned-numerology-normalization',{rawAnalyzerUnchanged:true,onlyUnresolvedSelectedRecordIdsOmitted:true,selectedIdsPreserved:true,nestedOwnedCopy:true});
  });

  it('rejects unknown IDs, required undefined, misplaced optional undefined and preference mismatches without writes',()=>{
    const mutations:Array<[string,(session:Mutable<NamingSession>)=>void]>=[
      ['selected-stroke-id-undefined',session=>{session.candidates[0].numerology!.strokes[0].selectedRecordId=undefined;}],
      ['unknown-selected-id',session=>{const choice=session.candidates[0].numerology!.strokes[1];choice.selectedRecordId='m836-unknown-source-record';choice.status='selected';}],
      ['required-stroke-status-undefined',session=>{Object.defineProperty(session.candidates[0].numerology!.strokes[1],'status',{value:undefined,enumerable:true,writable:true,configurable:true});}],
      ['wrong-location-optional-three-talents-undefined',session=>{session.candidates[0].numerology!.threeTalents=undefined;}],
      ['user-optional-preference-undefined',session=>{session.preferences.avoidParentNames=undefined;}],
      ['frozen-user-optional-preference-undefined',session=>{session.profile.namingPreferences!.avoidParentNames=undefined;}],
      ['numerology-disabled-with-snapshot',session=>{session.preferences.numerology=false;session.profile.namingPreferences!.numerology=false;}],
      ['numerology-enabled-without-snapshot',session=>{delete session.candidates[0].numerology;}],
    ];
    const before=captureWriteBoundary(context);
    for(const [label,mutate] of mutations){const input=rawSnapshot();mutate(input);expect(()=>normalizeReviewedNumerologySnapshotForAttach(input),label).toThrow();}
    expect(captureWriteBoundary(context)).toEqual(before);
    observed('narrow-normalization-rejections',{cases:mutations.map(([name])=>name),diskRevisionsAndCasUnchanged:true});
  });

  it('rejects nested numerology getters and Proxy objects before executing caller code',()=>{
    let getterCalls=0,proxyTraps=0;
    const selectedIdGetter=rawSnapshot();Object.defineProperty(selectedIdGetter.candidates[0].numerology!.strokes[1],'selectedRecordId',{enumerable:true,get(){getterCalls++;return undefined;}});
    const recordCountGetter=rawSnapshot();Object.defineProperty(recordCountGetter.candidates[0].numerology!.strokes[1].options[0],'count',{enumerable:true,get(){getterCalls++;return 9;}});
    const proxied=rawSnapshot();proxied.candidates[0].numerology!.strokes[1]=new Proxy(proxied.candidates[0].numerology!.strokes[1],{get(){proxyTraps++;throw Error('M836 unexpected Proxy get');},ownKeys(){proxyTraps++;throw Error('M836 unexpected Proxy ownKeys');},getOwnPropertyDescriptor(){proxyTraps++;throw Error('M836 unexpected Proxy descriptor');},getPrototypeOf(){proxyTraps++;throw Error('M836 unexpected Proxy prototype');}});
    const before=captureWriteBoundary(context);
    for(const input of [selectedIdGetter,recordCountGetter,proxied])expect(()=>normalizeReviewedNumerologySnapshotForAttach(input)).toThrow();
    expect(getterCalls).toBe(0);expect(proxyTraps).toBe(0);expect(captureWriteBoundary(context)).toEqual(before);
    observed('nested-numerology-callers-not-executed',{getterNodes:2,getterCalls,proxyNodes:1,proxyTraps,diskRevisionsAndCasUnchanged:true});
  });

  it('keeps consumers strict and rejects unrecognized source IDs and undefined caller preferences or selection without writes',async()=>{
    const errors:Record<string,string>={};
    errors.unknownSource=rejectWithoutWrite('updateNumerology unknown record',()=>context.service.updateNumerology(latest.id,latest.candidates[0].id,{'1':'m836-unknown-source-record'},latest.reviewRevision,latest.reviewToken));
    for(const [label,mutate] of [
      ['consumer-own-unselected-id-undefined',(draft:Mutable<ReviewedNamingSession>)=>{draft.candidates[0].numerology!.strokes[1].selectedRecordId=undefined;}],
      ['required-session-proof-undefined',(draft:Mutable<ReviewedNamingSession>)=>{Object.defineProperty(draft.reviewedData,'proofSha256',{value:undefined,enumerable:true,writable:true,configurable:true});}],
      ['required-candidate-proof-undefined',(draft:Mutable<ReviewedNamingSession>)=>{Object.defineProperty(draft.candidates[0].reviewedDataUse,'proofSha256',{value:undefined,enumerable:true,writable:true,configurable:true});}],
    ] as const){const draft=clone(latest);mutate(draft);errors[label]=rejectWithoutWrite(label,()=>context.service.saveSession(draft));}
    await rejectGenerateWithoutWrite('caller required preference undefined',()=>context.service.generateReviewed(flowProfile('m836-invalid-preference'),{...flowPreferences('纪枫',{numerology:true}),numerology:undefined} as unknown as typeof latest.preferences,selection));
    await rejectGenerateWithoutWrite('caller selection undefined',()=>context.service.generateReviewed(flowProfile('m836-invalid-selection'),flowPreferences('纪枫',{numerology:true}),{...selection,objectThemes:{川:undefined}} as unknown as ReviewedDataSelection));
    observed('strict-real-service-rejections',{errors,callerPreferenceUndefinedRejected:true,callerSelectionUndefinedRejected:true,diskRevisionsAndCasUnchanged:true});
  },120000);
});
