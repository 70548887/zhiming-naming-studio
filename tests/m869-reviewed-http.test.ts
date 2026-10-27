import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {canonicalPlainJson} from '../src/shared/plain-json';
import {matchesRootFeedbackV132RequestBinding,type RootFeedbackV132BoundPreviewResponse} from '../src/shared/bazi-root-feedback-v132-request-binding';
import {REVIEWED_DATA_METHOD,REVIEWED_DATA_SOURCE_IDS,type ReviewedDataSelection,type ReviewedGenerateResult,type ReviewedNamingSession} from '../src/shared/reviewed-naming-data';
import type {BirthProfile,GenerateResult,NamingPreferences,NamingSession,SessionRevision} from '../src/shared/types';
import {validNumerologySnapshot} from '../src/domain/numerology';
import {cleanupM869Directories,createM869Directory,postM869,restoreM869Backup,snapshotM869Sql,startM869Http,type M869HttpApp} from './helpers/m869-http-fixture';

const base='2bb6f6a91c0bdcdec1b74a63fe5046ff32106701';
const composedBase='3a9935a3cba9fa1edfc0a6c803bd5ce11393e3bb';
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const evidenceDirectory=path.resolve('.local/m869');
const publicationSha256='3f6d403b322964f8ced4b43f1cdce0d30772a4e568f50b872073582aa7d5b4d0';
const selection:ReviewedDataSelection={method:REVIEWED_DATA_METHOD,semanticThemeIds:['civic-homeland'],objectThemes:{川:'river-object'}};
const input:BirthProfile={id:'m869-http-parent-family',customerName:'M869虚构家庭',surname:' 林 ',surnamePinyin:'lín',fatherName:' 林文舟 ',motherName:' 陈若兰 ',gender:'中性',calendar:'solar',birthDate:'2026-10-17',leapMonth:false,birthTime:'09:30',timeUnknown:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'M869仅测试资料',timeBasis:'civil',renMethod:'none',monthAuthorityMethod:'no-fixed-day/1.0.0',seasonalMethod:'no-monthly/1.0.0'};
function preferences(name:string):NamingPreferences {
  const characters=[...name];
  return {length:2,generationChar:characters[0],requiredChars:characters[1],forbiddenChars:'',elderTaboo:'',style:'自然',meanings:'',industry:'',priority:'balanced',preferredElements:[],zodiacRules:false,numerology:true,avoidParentNames:true,yueReading:false,yueHomophones:'none',imageryReading:false,wordPronunciationReference:false,elementAssessment:false};
}
const operations:Array<{operation:string;status:'returned'|'threw';milliseconds:number;error?:string}>=[];
const observations:Array<{case:string;verified:Record<string,unknown>}>=[];
let app:M869HttpApp,ordinary:NamingSession,generated:ReviewedNamingSession,latest:ReviewedNamingSession;
let ordinarySql:string,ordinaryRevisions:unknown,expectedHistory:SessionRevision[];

function atomicWrite(name:string,value:unknown):void {
  fs.mkdirSync(evidenceDirectory,{recursive:true});
  const target=path.join(evidenceDirectory,name),temporary=target+'.tmp';
  fs.writeFileSync(temporary,JSON.stringify(value,null,2)+'\n');fs.renameSync(temporary,target);
}
function writeEvidence():void {
  atomicWrite('runtime-ledger.json',{suite:'tests/m869-reviewed-http.test.ts',base,head,operations});
  atomicWrite('real-results.json',{suite:'tests/m869-reviewed-http.test.ts',base,head,publicationSha256,observations,limits:['All naming/review/detail/history/catalog and preview calls use real loopback dev-plugin HTTP.','NSBK transfer uses actual Store backupBytes/restore because the dev-plugin has no desktop backup/restore route.','HTTP JSON serialization omits undefined; this suite makes no raw producer own-undefined assertion.','No UI, native file dialog, formal build, package, new source admission or formal production-coverage increment is asserted.','Vitest supplies case verdicts; intermediate observations do not imply the remaining case passed.']});
}
async function timed<T>(operation:string,action:()=>T|Promise<T>):Promise<T> {
  const started=performance.now();let status:'returned'|'threw'='threw',error:string|undefined;
  try {const value=await action();status='returned';return value;}
  catch(cause){error=cause instanceof Error?cause.message:String(cause);throw cause;}
  finally {operations.push({operation,status,milliseconds:Math.round(performance.now()-started),...(error?{error}:{})});writeEvidence();}
}
async function rpc<T>(target:M869HttpApp,method:string,args:unknown[]):Promise<T> {
  const response=await timed('HTTP '+method,()=>postM869(target,method,args,200));
  expect(response.status).toBe(200);return response.body as T;
}
function observed(caseName:string,verified:Record<string,unknown>):void {observations.push({case:caseName,verified});writeEvidence();}
const digest=(value:unknown)=>createHash('sha256').update(canonicalPlainJson(value)).digest('hex');
function parents(session:NamingSession):void {
  expect(session.profile).toMatchObject({id:input.id,surname:'林',fatherName:'林文舟',motherName:'陈若兰'});
  expect(session.preferences.avoidParentNames).toBe(true);
  expect(session.preferences.numerology).toBe(true);
  expect(session.profile.namingPreferences?.numerology).toBe(true);
  for(const candidate of session.candidates)expect(validNumerologySnapshot(candidate.numerology,session.profile.surname,candidate.givenName)).toBe(true);
}
function reviewedIdentity(session:ReviewedNamingSession):void {
  parents(session);expect(session.reviewedData.method).toBe(REVIEWED_DATA_METHOD);
  expect(session.reviewedData.selection).toEqual(selection);
  expect(session.reviewedData.publication.manifestSha256).toBe(publicationSha256);
  expect(session.candidates).toHaveLength(1);
  const candidate=session.candidates[0],proof=candidate.reviewedDataUse;
  expect(candidate.givenName).toBe('邦川');expect(candidate.fullName).toBe('林邦川');
  expect(proof.method).toBe(REVIEWED_DATA_METHOD);expect(proof.selectionSha256).toBe(digest(selection));
  expect(proof.semantic.rows[0]).toMatchObject({position:0,char:'邦',adoptionStatus:'adopted',qualification:{status:'eligible',scoreDelta:0}});
  expect(proof.semantic.rows[1]).toMatchObject({position:1,char:'川',adoptionStatus:'not-adopted'});
  expect(proof.semantic.wholeNameMeaning).toBeNull();expect(proof.semantic.scoreDelta).toBe(0);
  expect(proof.imagery.rows[1]).toMatchObject({position:2,char:'川',effectiveElements:['水'],mapping:{authority:'project-convention',status:'eligible'}});
  expect(candidate.characters[1].elements).toEqual(['水']);
  expect(proof.binding).toMatchObject({sessionId:session.id,profileId:session.profileId,candidateId:candidate.id,givenName:'邦川',fullName:'林邦川',profileSha256:digest(session.profile),sourceSnapshotSha256:digest(session.sourceSnapshot)});
  for(const id of REVIEWED_DATA_SOURCE_IDS){const rows=session.sourceSnapshot!.sources.filter(source=>source.id===id);expect(rows).toHaveLength(1);expect(rows[0].sha256).toMatch(/^[0-9a-f]{64}$/);}
  expect(session.sourceSnapshot!.sources.find(source=>source.id===REVIEWED_DATA_SOURCE_IDS[0])!.sha256).toBe(publicationSha256);
  const {proofSha256,...body}=proof;expect(proofSha256).toBe(digest(body));
  const {proofSha256:sessionProof,...sessionBody}=session.reviewedData;expect(sessionProof).toBe(digest(sessionBody));
}
async function unchangedOrdinary(target=app):Promise<void> {
  const snapshot=await snapshotM869Sql(target.directory);
  expect(snapshot.sessions.find(row=>row.id===ordinary.id)?.json).toBe(ordinarySql);
  expect(snapshot.revisions.filter(row=>row.session_id===ordinary.id)).toEqual(ordinaryRevisions);
}
function sameFacts(session:ReviewedNamingSession):void {
  reviewedIdentity(session);
  expect(session.profile).toEqual(generated.profile);expect(session.analysis).toEqual(generated.analysis);
  expect(session.reviewedData).toEqual(generated.reviewedData);expect(session.sourceSnapshot).toEqual(generated.sourceSnapshot);
  const {favorite:_favorite,reviewNote:_note,...facts}=session.candidates[0];
  const {favorite:_generatedFavorite,reviewNote:_generatedNote,...generatedFacts}=generated.candidates[0];
  expect(facts).toEqual(generatedFacts);
}

beforeAll(async()=>{
  // The suite is intended for the fixed integration tree, or an unchanged descendant after cherry-pick.
  const ancestry=[base,composedBase].some(candidate=>{try{return execFileSync('git',['merge-base','--is-ancestor',candidate,'HEAD'],{encoding:'utf8'})==='';}catch{return false;}});
  expect(ancestry).toBe(true);
  app=await timed('start-real-dev-plugin-and-bootstrap',()=>startM869Http(undefined,'source'));
  expect(app.port).toBeGreaterThan(0);expect(app.port).not.toBe(5173);
},60000);
afterAll(async()=>{try{await timed('close-and-remove-owned-http-fixtures',()=>cleanupM869Directories());}finally{writeEvidence();}},60000);

describe('M869 real HTTP transport on fixed reviewed integration',()=>{
  it('routes ordinary and explicitly selected naming with parent names into actual independent SQL rows',async()=>{
    ordinary=(await rpc<GenerateResult>(app,'generate',[input,preferences('安宁')])).session;
    parents(ordinary);expect(ordinary.candidates.map(candidate=>candidate.givenName)).toEqual(['安宁']);
    expect(ordinary).not.toHaveProperty('reviewedData');expect(ordinary.candidates[0]).not.toHaveProperty('reviewedDataUse');
    const before=await snapshotM869Sql(app.directory);
    ordinarySql=before.sessions.find(row=>row.id===ordinary.id)!.json;
    ordinaryRevisions=before.revisions.filter(row=>row.session_id===ordinary.id);
    expect(JSON.parse(ordinarySql)).toEqual(ordinary);expect(ordinaryRevisions).toEqual([]);
    generated=(await rpc<ReviewedGenerateResult>(app,'generateReviewed',[input,preferences('邦川'),selection])).session;
    latest=generated;reviewedIdentity(generated);expect(generated.id).not.toBe(ordinary.id);
    const after=await snapshotM869Sql(app.directory);
    expect(after.sessions).toHaveLength(2);expect(JSON.parse(after.sessions.find(row=>row.id===generated.id)!.json)).toEqual(generated);
    expect(JSON.parse(after.profiles.find(row=>row.id===input.id)!.json)).toMatchObject({fatherName:'林文舟',motherName:'陈若兰'});
    await unchangedOrdinary();
    observed('real-http-generation',{port:app.port,ordinaryId:ordinary.id,reviewedId:generated.id,parentsPreserved:true,explicitSelection:generated.reviewedData.selection,publicationSha256,sourceIds:REVIEWED_DATA_SOURCE_IDS,semanticPosition:0,imageryPosition:2,actualSqlSessions:after.sessions.length,oldSqlBytePreserved:true});
  },120000);

  it('serializes real catalog/detail, notes, history and history restoration through the same HTTP instance',async()=>{
    expect(generated).toBeDefined();
    const catalog=await rpc<{items:Array<{id:string;profileId:string;candidateCount:number;candidateFactsVerified:boolean}>}>(app,'listSessionCatalog',[{limit:25}]);
    expect(catalog.items.map(item=>item.id).sort()).toEqual([ordinary.id,generated.id].sort());
    for(const item of catalog.items){expect(item).toMatchObject({profileId:input.id,candidateCount:1,candidateFactsVerified:false});expect(item).not.toHaveProperty('candidates');}
    expect(await rpc<NamingSession>(app,'readSessionDetail',[ordinary.id])).toEqual(ordinary);
    expect(await rpc<ReviewedNamingSession>(app,'readSessionDetail',[generated.id])).toEqual(generated);
    const draft=structuredClone(generated);draft.reviewNote='M869 HTTP审阅';draft.candidates[0].favorite=true;draft.candidates[0].reviewNote='M869 HTTP候选备注';
    const saved=await rpc<ReviewedNamingSession>(app,'saveSession',[draft]);sameFacts(saved);
    expect(saved.reviewRevision).toBe(generated.reviewRevision!+1);expect(saved.reviewToken).not.toBe(generated.reviewToken);
    expect(saved).toMatchObject({reviewNote:draft.reviewNote,candidates:[{favorite:true,reviewNote:draft.candidates[0].reviewNote}]});
    expect(await rpc<ReviewedNamingSession>(app,'readSessionDetail',[saved.id])).toEqual(saved);
    const history=await rpc<SessionRevision[]>(app,'listHistory',[saved.id]);
    expect(history).toHaveLength(1);expect(history[0].session).toEqual(generated);
    latest=await rpc<ReviewedNamingSession>(app,'restoreHistory',[saved.id,history[0].id,saved.reviewRevision,saved.reviewToken]);sameFacts(latest);
    expect(latest.reviewRevision).toBe(saved.reviewRevision!+1);expect(latest.reviewToken).not.toBe(saved.reviewToken);
    expect(latest.candidates).toEqual(generated.candidates);
    expectedHistory=await rpc<SessionRevision[]>(app,'listHistory',[latest.id]);expect(expectedHistory).toHaveLength(2);
    const stored=await snapshotM869Sql(app.directory);expect(JSON.parse(stored.sessions.find(row=>row.id===latest.id)!.json)).toEqual(latest);
    await unchangedOrdinary();
    observed('http-review-and-readback',{catalogCount:catalog.items.length,catalogFactsVerified:false,historyCount:expectedHistory.length,casRevisions:[generated.reviewRevision,saved.reviewRevision,latest.reviewRevision],casAdvanced:true,parentsAndSourceProofRetained:true,oldSqlBytePreserved:true});
  },180000);

  it('rejects unknown selections and malformed HTTP arguments without fallback writes and preserves readonly raw preview binding',async()=>{
    expect(latest).toBeDefined();
    const before=await snapshotM869Sql(app.directory),pref=preferences('邦川');
    const invalid:Array<{label:string;args:unknown[]}>= [
      {label:'missing-selection-argument',args:[input,pref]},
      {label:'extra-fourth-argument',args:[input,pref,selection,{callerSourceHash:'not-authority'}]},
      {label:'unknown-semantic-theme',args:[input,pref,{...selection,semanticThemeIds:['unknown-theme']}]},
      {label:'wrong-object-theme-pair',args:[input,pref,{...selection,objectThemes:{川:'cotton-plant-object'}}]},
      {label:'caller-added-approval',args:[input,pref,{...selection,approved:true}]},
      {label:'wrong-method',args:[input,pref,{...selection,method:'reviewed-naming-data/0.0.0'}]},
      {label:'null-selection',args:[input,pref,null]},
    ];
    const rejected:Array<{label:string;status:number;error:string}>=[];
    for(const request of invalid){
      const response=await timed('HTTP rejected '+request.label,()=>postM869(app,'generateReviewed',request.args,400));
      expect(response.status).toBe(400);expect(response.body).toEqual({error:expect.any(String)});
      const error=(response.body as {error:string}).error;expect(error.length).toBeGreaterThan(0);
      rejected.push({label:request.label,status:response.status,error});
      expect(await snapshotM869Sql(app.directory)).toEqual(before);
    }
    const malformed=await timed('HTTP non-array-arguments',()=>fetch(app.baseUrl+'/__studio_api/generateReviewed',{method:'POST',headers:{'Content-Type':'application/json','X-Studio-Local-Request':'1'},body:JSON.stringify({profile:input,preferences:pref,selection}),redirect:'error',signal:AbortSignal.timeout(30000)}));
    expect(malformed.status).toBe(400);expect(await malformed.json()).toEqual({error:'无效请求参数'});
    expect(await snapshotM869Sql(app.directory)).toEqual(before);
    const raw={...input,id:'',surname:' 林 ',fatherName:' 林文舟 ',motherName:' 陈若兰 '};
    const wire=JSON.parse(JSON.stringify(raw)) as BirthProfile,key=canonicalPlainJson(wire);
    const preview=await rpc<RootFeedbackV132BoundPreviewResponse>(app,'previewBaziRootFeedbackV132',[raw,{fromOutputMonthStem:true}]);
    expect(preview.schema).toBe('bazi-root-feedback-facade/1.3.2-r2');
    expect(preview.profileId).not.toBe('');expect(preview.profileId).not.toBe(raw.id);
    expect(preview.requestBinding.profileKey).toBe(key);
    expect(matchesRootFeedbackV132RequestBinding(preview.requestBinding,key,true)).toBe(true);
    for(const changed of [{...wire,birthTime:'13:30'},{...wire,fatherName:' 另一个父名 '},{...wire,motherName:' 另一个母名 '},{...wire,id:preview.profileId,surname:'林',fatherName:'林文舟',motherName:'陈若兰'}])expect(matchesRootFeedbackV132RequestBinding(preview.requestBinding,canonicalPlainJson(changed),true)).toBe(false);
    expect(matchesRootFeedbackV132RequestBinding(preview.requestBinding,key,false)).toBe(false);
    expect(await snapshotM869Sql(app.directory)).toEqual(before);await unchangedOrdinary();
    observed('http-rejection-and-readonly-preview',{rejected,nonArrayStatus:malformed.status,previewSchema:preview.schema,rawRequestBindingPreserved:true,parentsIncludedInRawBinding:true,normalizedProfileIdAllocated:true,databaseBytesRowsProfilesHistoryUnchanged:true,legacyFallbackWrites:0});
  },120000);

  it('restores one real NSBK and rereads parents, sources, proof and histories over a newly bound HTTP instance',async()=>{
    expect(latest).toBeDefined();
    const sourceDirectory=app.directory,sourceBefore=await snapshotM869Sql(sourceDirectory);
    await timed('close-source-http-before-backup',()=>app.close());
    const targetDirectory=createM869Directory('restored');
    const backup=await timed('actual-Store-NSBK-backup-and-restore',()=>restoreM869Backup(sourceDirectory,targetDirectory));
    expect(backup.magic).toBe('NSBK0001');expect(backup.bytes).toBeGreaterThan(0);expect(backup.sha256).toMatch(/^[0-9a-f]{64}$/);
    const restored=await timed('start-independent-restored-http-and-bootstrap',()=>startM869Http(targetDirectory,'restored'));
    expect(restored.port).not.toBe(5173);expect(restored.directory).not.toBe(sourceDirectory);
    try {
      const restoredOld=await rpc<NamingSession>(restored,'readSessionDetail',[ordinary.id]);parents(restoredOld);
      expect(restoredOld.reviewToken).not.toBe(ordinary.reviewToken);
      expect({...restoredOld,reviewToken:ordinary.reviewToken}).toEqual(ordinary);
      expect(restoredOld).not.toHaveProperty('reviewedData');
      const restoredNew=await rpc<ReviewedNamingSession>(restored,'readSessionDetail',[latest.id]);sameFacts(restoredNew);
      expect(restoredNew.reviewToken).not.toBe(latest.reviewToken);
      expect({...restoredNew,reviewToken:latest.reviewToken}).toEqual(latest);
      const restoredHistory=await rpc<SessionRevision[]>(restored,'listHistory',[latest.id]);
      expect(restoredHistory).toEqual(expectedHistory);
      for(const revision of restoredHistory)parents(revision.session);
      expect(await rpc<SessionRevision[]>(restored,'listHistory',[ordinary.id])).toEqual([]);
      const catalog=await rpc<{items:Array<{id:string;candidateFactsVerified:boolean}>}>(restored,'listSessionCatalog',[{limit:25}]);
      expect(catalog.items.map(item=>item.id).sort()).toEqual([ordinary.id,latest.id].sort());
      for(const item of catalog.items){expect(item.candidateFactsVerified).toBe(false);expect(item).not.toHaveProperty('candidates');}
      const restoredSql=await snapshotM869Sql(restored.directory);
      expect(JSON.parse(restoredSql.sessions.find(row=>row.id===latest.id)!.json)).toEqual(restoredNew);
      expect(JSON.parse(restoredSql.profiles.find(row=>row.id===input.id)!.json)).toMatchObject({fatherName:'林文舟',motherName:'陈若兰'});
      expect(await snapshotM869Sql(sourceDirectory)).toEqual(sourceBefore);
      observed('real-nsbk-new-http-readback',{backup,independentPort:restored.port,sessionCount:restoredSql.sessions.length,historyCount:restoredHistory.length,parentsSourcesProofRetained:true,currentReviewTokensRotated:true,catalogFactsVerified:false,sourceDatabaseUntouchedByBackupAndRestore:true});
    } finally {await timed('close-restored-http',()=>restored.close());}
  },180000);
});
