import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {validNumerologySnapshot} from '../src/domain/numerology';
import {decodeCustomerBackup} from '../src/main/customer-backup-envelope';
import {NAMING_RULE_V71_VERSION} from '../src/shared/naming-rules';
import {canonicalPlainJson} from '../src/shared/plain-json';
import {REVIEWED_DATA_METHOD,REVIEWED_DATA_SESSION_PREFIX,REVIEWED_DATA_CANDIDATE_PREFIX,REVIEWED_DATA_SOURCE_IDS,type ReviewedDataSelection,type ReviewedNamingSession} from '../src/shared/reviewed-naming-data';
import type {NameCandidate,NamingSession,NumerologyAnalysis,SessionRevision} from '../src/shared/types';
import {clone,closeFlowStore,disposeFlowFixtures,flowPreferences,flowProfile,openFlowStore,type FlowContext} from './helpers/reviewed-naming-data-flow-fixture';

const selection:ReviewedDataSelection={method:REVIEWED_DATA_METHOD,semanticThemeIds:[],objectThemes:{}};
const evidenceDirectory=path.resolve('.local/m852-flow');
const integrationHead=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const publicationSha256='3f6d403b322964f8ced4b43f1cdce0d30772a4e568f50b872073582aa7d5b4d0';
const observations:Array<{case:string;verified:Record<string,unknown>}>=[];
const operations:Array<{operation:string;status:'returned'|'threw';milliseconds:number;error?:string}>=[];
const sourcePins:ReadonlyArray<readonly [string,string]>=[
  ['reviewed-naming-data-1.0.0',publicationSha256],
  ['m752-semantic-generation-admission-r2','5f4b29d9a5cd13c2d0496fd84172823e551be0221cdc52c83d95d933e1e79969'],
  ['m751-semantic-admission-consumer-candidate','5560b2f2fa6f6ead7d87561e1d699617d5359189eeaf7a2e68ffb6bb00da1881'],
  ['m740-default-meanings-candidate-originals','0290ada57d4e87386e224d6be33901e0f626d3530c74e9d48611f046a6252f23'],
  ['m744-character-meaning-source-audit','8b272e6062254fe3f112a19ee6a1f31a086ca56dc5964e21eb45fae8bc59b157'],
  ['m770-admitted-project-element-imagery-1','79fc7b9c1ffb4098c960cbd65ff0a9b92c69a41d680ed581380457c1180209f9'],
  ['m770-independent-object-element-review','89ad0ade1a15adb0f801649b650888f376d84f51c469de4f1455bf42a4280509'],
  ['m777-object-element-admission-audit','abbdac6c87e14c033de43e40acada9ac2ddcf4ae90761066b6f036cb4e57c64e'],
];
const canonicalFields=['id','givenName','fullName','pinyin','style','characters','meaning','reason','citations','evaluation','warnings','traditionalReason','origin','originalMeaning','namingMeaningReview'] as const;
let context:FlowContext,ordinary:NamingSession,generated:ReviewedNamingSession,latest:ReviewedNamingSession;
let ordinarySql:string,ordinaryHistorySql:unknown,expectedHistory:SessionRevision[];

function atomicWrite(name:string,value:string|Uint8Array):void {
  fs.mkdirSync(evidenceDirectory,{recursive:true});
  const target=path.join(evidenceDirectory,name),temporary=target+'.tmp';
  fs.writeFileSync(temporary,value);fs.renameSync(temporary,target);
}
function writeEvidence():void {
  atomicWrite('real-results.json',JSON.stringify({suite:'tests/m852-reviewed-integration.test.ts',integrationHead,publicationSha256,generatedAt:new Date().toISOString(),observations,limits:['M836 independent review remains pending; these integration cases do not close publication admission.','Vitest JSON supplies the test verdict; observations alone do not mean a case passed.','Real Store/StudioService, numerology:true and NSBK; UI, formal build and publication 未执行.']},null,2)+'\n');
  atomicWrite('runtime-ledger.json',JSON.stringify({suite:'tests/m852-reviewed-integration.test.ts',integrationHead,publicationSha256,operations},null,2)+'\n');
}
function observed(caseName:string,verified:Record<string,unknown>):void {observations.push({case:caseName,verified});writeEvidence();}
async function timed<T>(operation:string,action:()=>T|Promise<T>):Promise<T> {
  const start=performance.now();let status:'returned'|'threw'='threw',error:string|undefined;
  try{const result=await action();status='returned';return result;}
  catch(cause){error=cause instanceof Error?cause.message:String(cause);throw cause;}
  finally{operations.push({operation,status,milliseconds:Math.round(performance.now()-start),...(error?{error}:{})});writeEvidence();}
}
const digest=(value:unknown)=>createHash('sha256').update(canonicalPlainJson(value)).digest('hex');
const candidateFacts=(candidate:NameCandidate)=>Object.fromEntries(canonicalFields.map(field=>[field,candidate[field]]));
function reviewed(session:NamingSession|null):ReviewedNamingSession {
  expect(session).not.toBeNull();expect((session as Partial<ReviewedNamingSession>).reviewedData?.method).toBe(REVIEWED_DATA_METHOD);
  return session as ReviewedNamingSession;
}
function pending(session:NamingSession,rawOwnUndefined=false):NumerologyAnalysis {
  expect(session.preferences.numerology).toBe(true);expect(session.profile.namingPreferences!.numerology).toBe(true);
  expect(session.candidates).toHaveLength(1);
  const value=session.candidates[0].numerology;
  expect(value).toBeDefined();expect(validNumerologySnapshot(value,session.profile.surname,session.candidates[0].givenName)).toBe(true);
  expect(value!.status).toBe('pending');expect(value!.grids).toEqual([]);expect(value).not.toHaveProperty('threeTalents');
  for(const position of [1,2]) {
    const stroke=value!.strokes[position];
    expect(stroke.status).toBe('ambiguous');expect(stroke.options.length).toBeGreaterThan(1);
    expect(Object.hasOwn(stroke,'selectedRecordId')).toBe(rawOwnUndefined);expect(stroke.selectedRecordId).toBeUndefined();
  }
  return value!;
}
function numericSelectedIds(session:NamingSession) {
  return session.candidates[0].numerology!.strokes.map(stroke=>({position:stroke.position,char:stroke.inputChar,status:stroke.status,ownSelectedRecordId:Object.hasOwn(stroke,'selectedRecordId'),selectedRecordIdState:Object.hasOwn(stroke,'selectedRecordId')?(stroke.selectedRecordId===undefined?'own-undefined':'selected'):'absent',selectedRecordId:stroke.selectedRecordId??null}));
}
function sqlSession(target:FlowContext,id:string):string {
  return String(target.store.db.exec('SELECT json FROM sessions WHERE id=?',[id])[0].values[0][0]);
}
function sqlHistory(target:FlowContext,id:string) {
  return target.store.db.exec('SELECT id,session_id,created_at,json FROM revisions WHERE session_id=? ORDER BY id DESC',[id])[0]?.values??[];
}
function assertOrdinaryUnchanged():void {
  expect(sqlSession(context,ordinary.id)).toBe(ordinarySql);
  expect(sqlHistory(context,ordinary.id)).toEqual(ordinaryHistorySql);
  const stored=JSON.parse(ordinarySql) as NamingSession;
  expect(stored.candidates).toEqual(JSON.parse(JSON.stringify(ordinary.candidates)));
  expect(stored.sourceSnapshot).toEqual(ordinary.sourceSnapshot);
}
function assertFixedIdentity(session:ReviewedNamingSession):void {
  const candidate=session.candidates[0],proof=candidate.reviewedDataUse,binding=session.reviewedData.binding;
  expect(session.id.startsWith(REVIEWED_DATA_SESSION_PREFIX)).toBe(true);
  expect(candidate.id.startsWith(REVIEWED_DATA_CANDIDATE_PREFIX)).toBe(true);
  expect(session.namingRules?.version).toBe(NAMING_RULE_V71_VERSION);
  expect(session.reviewedData.selection).toEqual(selection);
  expect(session.reviewedData.publication).toMatchObject({publicationId:REVIEWED_DATA_METHOD,manifestSha256:publicationSha256,sourceEvidence:{m751:{reviewStatus:'candidate-not-independently-reviewed'}}});
  expect(session.sourceSnapshot!.dataVersion).toBe(session.dataVersion);
  expect(sourcePins.map(([id])=>id)).toEqual(REVIEWED_DATA_SOURCE_IDS);
  for(const [id,sha256] of sourcePins) {
    const sources=session.sourceSnapshot!.sources.filter(source=>source.id===id);
    expect(sources).toHaveLength(1);expect(sources[0]).toMatchObject({id,sha256});
    expect(sources[0].commit).not.toBe('');expect(sources[0].files.length).toBeGreaterThan(0);
  }
  expect(binding).toMatchObject({sessionId:session.id,profileId:session.profileId,createdAt:session.createdAt,dataVersion:session.dataVersion,namingRulesSha256:digest(session.namingRules),profileSha256:digest(session.profile),generationPreferencesSha256:digest(session.profile.namingPreferences),analysisSha256:digest(session.analysis),sourceSnapshotSha256:digest(session.sourceSnapshot),originalFavorableSha256:digest(session.originalFavorable)});
  expect(proof.binding).toEqual({...binding,candidateIndex:0,candidateId:candidate.id,givenName:candidate.givenName,fullName:candidate.fullName,pinyin:candidate.pinyin,origin:candidate.origin});
  expect(proof.publication).toEqual(session.reviewedData.publication);
  expect(proof.selectionSha256).toBe(digest(selection));
  expect(proof.canonicalCandidateSha256).toBe(digest(candidateFacts(candidate)));
  expect(proof.semantic).toMatchObject({scoreDelta:0,wholeNameMeaning:null,generatedMeaning:candidate.meaning});
  expect(proof.semantic.rows[0]).toMatchObject({position:0,char:'纪',adoptionStatus:'adopted',qualification:{status:'eligible',scoreDelta:0,automaticSemanticCreditAllowed:false},adoption:{candidateId:candidate.id,givenName:'纪枫',fullName:'林纪枫',position:0,char:'纪',scoreDelta:0,wholeNameMeaning:null}});
  expect(candidate.characters[1].elements).toEqual(['木']);
  expect(proof.imagery).toMatchObject({binding:{candidateId:candidate.id,givenName:'纪枫'},publication:{authority:'project-convention',manifestSha256:sourcePins[5][1]}});
  // M779 provenance positions are one-based; semantic/adoption positions above are zero-based.
  expect(proof.imagery.rows[1]).toMatchObject({position:2,char:'枫',baselineElements:[],effectiveElements:['木'],mapping:{authority:'project-convention',status:'eligible'}});
  expect(session.reviewedData.candidateBindings).toEqual([{candidateIndex:0,candidateId:candidate.id,givenName:candidate.givenName,fullName:candidate.fullName,pinyin:candidate.pinyin,origin:candidate.origin,proofSha256:proof.proofSha256}]);
  const {proofSha256:candidateProof,...candidateProofBody}=proof;
  const {proofSha256:sessionProof,...sessionProofBody}=session.reviewedData;
  expect(candidateProof).toBe(digest(candidateProofBody));expect(sessionProof).toBe(digest(sessionProofBody));
}
function assertGenerationFacts(session:ReviewedNamingSession):void {
  expect(session.reviewedData).toEqual(generated.reviewedData);
  expect(session.candidates[0].reviewedDataUse).toEqual(generated.candidates[0].reviewedDataUse);
  expect(candidateFacts(session.candidates[0])).toEqual(candidateFacts(generated.candidates[0]));
  expect(session.candidates[0].numerology).toEqual(generated.candidates[0].numerology);
  expect(session.profile).toEqual(generated.profile);expect(session.analysis).toEqual(generated.analysis);
  expect(session.sourceSnapshot).toEqual(generated.sourceSnapshot);assertFixedIdentity(session);pending(session);
}

beforeAll(async()=>{context=await timed('open-real-store',()=>openFlowStore('m852-integration'));},60000);
afterAll(async()=>{try{await timed('dispose-owned-flow-fixtures',()=>disposeFlowFixtures());}finally{writeEvidence();}},60000);

describe('M852 bounded reviewed integration on the combined real Store',()=>{
  it('generates ordinary raw pending and reviewed sanitized pending numerology for the same profile and forced name',async()=>{
    const profile={...flowProfile('m852-integration'),customerName:'M852虚构家庭'};
    const preferences=flowPreferences('纪枫',{numerology:true,preferredElements:['木']});
    ordinary=(await timed('ordinary-numerology-true-generate',()=>context.service.generate(profile,preferences))).session;
    expect(ordinary.candidates.map(candidate=>candidate.givenName)).toEqual(['纪枫']);
    expect(ordinary.namingRules?.version).toBe(NAMING_RULE_V71_VERSION);
    expect(ordinary).not.toHaveProperty('reviewedData');expect(ordinary.candidates[0]).not.toHaveProperty('reviewedDataUse');pending(ordinary,true);
    expect(ordinary.sourceSnapshot!.sources.some(source=>(REVIEWED_DATA_SOURCE_IDS as readonly string[]).includes(source.id))).toBe(false);
    ordinarySql=sqlSession(context,ordinary.id);ordinaryHistorySql=sqlHistory(context,ordinary.id);
    expect(ordinaryHistorySql).toEqual([]);

    generated=reviewed((await timed('reviewed-numerology-true-generate',()=>context.service.generateReviewed(profile,preferences,selection))).session);
    expect(generated.candidates.map(candidate=>candidate.givenName)).toEqual(['纪枫']);
    expect(generated.profile).toEqual(ordinary.profile);expect(generated.profileId).toBe(ordinary.profileId);
    expect(generated.preferences).toEqual(ordinary.preferences);expect(generated.analysis).toEqual(ordinary.analysis);
    pending(generated);assertFixedIdentity(generated);assertOrdinaryUnchanged();
    observed('same-profile-generated',{profileId:generated.profileId,ordinarySessionId:ordinary.id,reviewedSessionId:generated.id,name:generated.candidates[0].fullName,numerologyEnabled:true,ordinaryNumericSelectedIds:numericSelectedIds(ordinary),reviewedNumericSelectedIds:numericSelectedIds(generated),dedicatedSourceIdentities:sourcePins.map(([id])=>generated.sourceSnapshot!.sources.find(source=>source.id===id)),ordinarySqlAndSourcesAndCandidatesUnchanged:true,semanticScoreDelta:generated.candidates[0].reviewedDataUse.semantic.scoreDelta,imageryElements:generated.candidates[0].characters[1].elements,profileAnalysisAndSourceSnapshotBindingsVerified:true});
  },60000);

  it('saves one favorite/note review, reads its prior history and restores it with unchanged facts and advancing CAS',async()=>{
    expect(generated).toBeDefined();
    const draft=clone(generated);draft.reviewNote='M852真实审阅意见';draft.candidates[0].favorite=true;draft.candidates[0].reviewNote='M852数理来源待确认';
    const saved=reviewed(await timed('save-favorite-and-notes',()=>context.service.saveSession(draft)));
    expect(saved.reviewRevision).toBe(generated.reviewRevision!+1);expect(saved.reviewToken).not.toBe(generated.reviewToken);
    expect(saved.reviewNote).toBe(draft.reviewNote);expect(saved.candidates[0]).toMatchObject({favorite:true,reviewNote:draft.candidates[0].reviewNote});assertGenerationFacts(saved);
    const history=await timed('list-single-prior-history',()=>context.service.listHistory(saved.id));
    expect(history).toHaveLength(1);expect(history[0].sessionId).toBe(generated.id);
    expect(history[0].session).toEqual(generated);assertGenerationFacts(reviewed(history[0].session));
    latest=reviewed(await timed('restore-actual-prior-history',()=>context.service.restoreHistory(saved.id,history[0].id,saved.reviewRevision,saved.reviewToken)));
    expect(latest.reviewRevision).toBe(saved.reviewRevision!+1);expect(latest.reviewToken).not.toBe(saved.reviewToken);
    expect(latest.candidates).toEqual(generated.candidates);expect(latest.reviewNote).toBe(generated.reviewNote);assertGenerationFacts(latest);
    expectedHistory=sqlHistory(context,latest.id).map(row=>({id:String(row[0]),sessionId:String(row[1]),createdAt:String(row[2]),session:JSON.parse(String(row[3])) as NamingSession}));
    expect(expectedHistory).toHaveLength(2);assertOrdinaryUnchanged();
    observed('review-and-history-restored',{singleSaveCreatedHistoryCount:history.length,historyCountAfterRestore:expectedHistory.length,casRevisions:[generated.reviewRevision,saved.reviewRevision,latest.reviewRevision],casTokensAdvanced:true,numerologyEnabled:true,numericSelectedIds:numericSelectedIds(latest),proofCanonicalFactsAndSourcesUnchanged:true,ordinarySqlUnchanged:true});
  },120000);

  it('round trips a true NSBK into an independent Store and fresh reopen with both sessions and their histories',async()=>{
    expect(latest).toBeDefined();
    const backup=await timed('create-real-nsbk',()=>context.store.backupBytes());
    expect(Buffer.from(backup).subarray(0,8).toString('ascii')).toBe('NSBK0001');
    expect(decodeCustomerBackup(backup).format).toBe('compact-sqlite');atomicWrite('real-lifecycle.nsbk',backup);
    const target=await timed('open-independent-restore-store',()=>openFlowStore('m852-restore-target'));
    await timed('restore-nsbk-into-independent-store',()=>target.store.restore(backup));
    await timed('close-restored-store-before-reopen',()=>closeFlowStore(target));
    const fresh=await timed('fresh-reopen-restored-store',()=>openFlowStore('m852-fresh-restored',target.directory));
    try {
      const restoredOld=(await timed('fresh-read-ordinary-detail',()=>fresh.service.readSessionDetail(ordinary.id)))!;
      const restoredNew=reviewed(await timed('fresh-read-reviewed-detail',()=>fresh.service.readSessionDetail(latest.id)));
      const storedOld=JSON.parse(ordinarySql) as NamingSession;
      expect(restoredOld.reviewToken).not.toBe(storedOld.reviewToken);expect({...restoredOld,reviewToken:storedOld.reviewToken}).toEqual(storedOld);
      expect(restoredOld.candidates).toEqual(storedOld.candidates);expect(restoredOld.sourceSnapshot).toEqual(storedOld.sourceSnapshot);
      expect(restoredOld.profileId).toBe(ordinary.profileId);expect(restoredOld.candidates[0].id).toBe(ordinary.candidates[0].id);
      expect(restoredOld).not.toHaveProperty('reviewedData');expect(restoredOld.candidates[0]).not.toHaveProperty('reviewedDataUse');pending(restoredOld);
      expect(restoredNew.reviewToken).not.toBe(latest.reviewToken);expect({...restoredNew,reviewToken:latest.reviewToken}).toEqual(latest);assertGenerationFacts(restoredNew);
      const restoredHistory=await timed('fresh-read-reviewed-history',()=>fresh.service.listHistory(latest.id));
      expect(restoredHistory).toEqual(expectedHistory);
      for(const revision of restoredHistory){expect(revision.sessionId).toBe(latest.id);expect(revision.session.profileId).toBe(generated.profileId);assertGenerationFacts(reviewed(revision.session));}
      expect(await timed('fresh-read-ordinary-empty-history',()=>fresh.service.listHistory(ordinary.id))).toEqual([]);
      const catalog=await timed('fresh-read-catalog',()=>fresh.service.listSessionCatalog({limit:25}));
      expect(catalog.items.map(item=>item.id).sort()).toEqual([ordinary.id,latest.id].sort());
      for(const item of catalog.items){expect(item).toMatchObject({profileId:ordinary.profileId,candidateCount:1,candidateFactsVerified:false});expect(item).not.toHaveProperty('candidates');expect(item).not.toHaveProperty('analysis');expect(item).not.toHaveProperty('reviewedData');}
      const restoredOldSql=JSON.parse(sqlSession(fresh,ordinary.id)) as NamingSession;
      expect(restoredOldSql.candidates).toEqual(storedOld.candidates);expect(restoredOldSql.sourceSnapshot).toEqual(storedOld.sourceSnapshot);assertOrdinaryUnchanged();
      observed('nsbk-fresh-reopen',{magic:'NSBK0001',backupBytes:backup.length,backupSha256:createHash('sha256').update(backup).digest('hex'),oldAndReviewedDetailsVerified:true,historyCount:restoredHistory.length,profileAndCandidateBindingsPreserved:true,reviewedNumericSelectedIds:numericSelectedIds(restoredNew),ordinaryNumericSelectedIds:numericSelectedIds(restoredOld),ordinaryCandidatesAndSourcesUnchanged:true,catalogCandidateFactsVerified:catalog.items.map(item=>({id:item.id,candidateFactsVerified:item.candidateFactsVerified})),restoreChangedOnlyAllowedCurrentCasTokens:true});
    } finally {await timed('close-fresh-restored-store',()=>closeFlowStore(fresh));}
  },120000);
});
