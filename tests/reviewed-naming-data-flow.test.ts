import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {createServer,type Server} from 'node:http';
import type {AddressInfo} from 'node:net';
import {createServer as createViteServer,type ViteDevServer} from 'vite';
import {studioDevPlugin} from '../scripts/dev-plugin';
import {decodeCustomerBackup} from '../src/main/customer-backup-envelope';
import {evaluateNameForRuleVersionWithContext} from '../src/domain/naming';
import {NAMING_RULE_V71_VERSION} from '../src/shared/naming-rules';
import {REVIEWED_DATA_METHOD,REVIEWED_DATA_SESSION_PREFIX,REVIEWED_DATA_CANDIDATE_PREFIX,REVIEWED_DATA_SOURCE_IDS,type ReviewedDataSelection,type ReviewedNamingSession} from '../src/shared/reviewed-naming-data';
import type {NamingSession,GenerateResult} from '../src/shared/types';
import {alteredFlowBackup,alterJsonRow,bytesSha256,captureWriteBoundary,clone,closeFlowStore,diskBytes,disposeFlowFixtures,flowEvidence,flowPreferences,flowProfile,flowRoot,flowTimed,openFlowStore,ownedFlowDirectory,rawSession,syntheticKey,writeFlowEvidence,type FlowContext,type Mutable} from './helpers/reviewed-naming-data-flow-fixture';

const generalSelection:ReviewedDataSelection={method:REVIEWED_DATA_METHOD,semanticThemeIds:[],objectThemes:{}};
const themeSelection:ReviewedDataSelection={method:REVIEWED_DATA_METHOD,semanticThemeIds:['civic-homeland'],objectThemes:{川:'river-object'}};
let context:FlowContext,tamperContext:FlowContext,old:NamingSession,general:ReviewedNamingSession,themed:ReviewedNamingSession,unselected:ReviewedNamingSession,wrongSemanticTheme:ReviewedNamingSession,multiple:ReviewedNamingSession,tamperSubject:ReviewedNamingSession;
let oldStoredJson:string,oldStoredHistory:unknown;
const errors:Record<string,string>={};

function reviewed(session:NamingSession):ReviewedNamingSession {
  expect((session as Partial<ReviewedNamingSession>).reviewedData?.method).toBe(REVIEWED_DATA_METHOD);
  return session as ReviewedNamingSession;
}
function assertFixedProof(session:ReviewedNamingSession):void {
  expect(session.id.startsWith(REVIEWED_DATA_SESSION_PREFIX)).toBe(true);
  expect(session.reviewedData.binding.sessionId).toBe(session.id);
  expect(session.reviewedData.binding.profileId).toBe(session.profileId);
  expect(session.reviewedData.publication.manifestSha256).toBe('3f6d403b322964f8ced4b43f1cdce0d30772a4e568f50b872073582aa7d5b4d0');
  expect(session.reviewedData.proofSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(session.reviewedData.candidateBindings).toHaveLength(session.candidates.length);
  for(let index=0;index<session.candidates.length;index++) {
    const candidate=session.candidates[index];
    const proof=candidate.reviewedDataUse;
    expect(proof.publication).toEqual(session.reviewedData.publication);
    expect(candidate.id.startsWith(REVIEWED_DATA_CANDIDATE_PREFIX)).toBe(true);
    expect(proof.binding).toMatchObject({sessionId:session.id,candidateIndex:index,candidateId:candidate.id,givenName:candidate.givenName,fullName:candidate.fullName,pinyin:candidate.pinyin,origin:candidate.origin});
    expect(proof.semantic.wholeNameMeaning).toBeNull();expect(proof.semantic.scoreDelta).toBe(0);
    expect(proof.semantic.generatedMeaning).toBe(candidate.meaning);
    expect(proof.semantic.rows).toHaveLength([...candidate.givenName].length);
    expect(proof.imagery.rows).toHaveLength([...candidate.givenName].length);
    for(const [position,row] of proof.semantic.rows.entries()) {
      expect(row).toMatchObject({position,char:candidate.characters[position].char,pinyin:candidate.characters[position].pinyin,tone:candidate.characters[position].tone});
      expect(row.baselineCharacterSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(row.projectedCharacterSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(row.qualification.automaticSemanticCreditAllowed).toBe(false);
      expect(row.qualification.scoreDelta).toBe(0);expect(row.qualification.wholeNameMeaning).toBeNull();
      if(row.adoptionStatus==='adopted') {
        expect(row.adoption).toMatchObject({schema:'single-character-generation-adoption/1',candidateId:candidate.id,fullName:candidate.fullName,givenName:candidate.givenName,position,char:row.char,pinyin:row.pinyin,tone:row.tone,explanationScope:'characterwise-only',wholeNameMeaning:null,scoreDelta:0});
        expect(row.adoption!.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
        expect(row.adoption!.admissionSha256).toMatch(/^[a-f0-9]{64}$/);
        expect(row.adoption!.reviewId).not.toBe('');expect(row.project).not.toBeNull();
        expect(candidate.meaning).toContain(row.char+'：'+row.project!.meaning);
      } else {expect(row.adoption).toBeNull();expect(row.project).toBeNull();}
    }
    expect(proof.canonicalCandidateSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(proof.proofSha256).toBe(session.reviewedData.candidateBindings[index].proofSha256);
  }
  for(const sourceId of REVIEWED_DATA_SOURCE_IDS)expect(session.sourceSnapshot!.sources.filter(source=>source.id===sourceId)).toHaveLength(1);
}
function assertOldUnchanged():void {
  expect(JSON.stringify(rawSession(context,old.id))).toBe(oldStoredJson);
  expect(context.store.db.exec('SELECT id,session_id,created_at,json FROM revisions WHERE session_id=? ORDER BY id',[old.id])[0]?.values??[]).toEqual(oldStoredHistory);
}
function baselineScore(session:ReviewedNamingSession) {
  const candidate=session.candidates[0];
  const result=evaluateNameForRuleVersionWithContext(NAMING_RULE_V71_VERSION,{packSha256:bytesSha256(context.store.currentPackBytes()),activeVersion:session.dataVersion},candidate.givenName,session.profile,session.profile.namingPreferences!,session.analysis,context.store.dataset.characters,context.store.dataset.citations,candidate.origin);
  expect(result).not.toBeNull();return result!.evaluation;
}
function rejectsWithoutWrite(label:string,action:()=>unknown,target=context):void {
  const before=captureWriteBoundary(target);let rejection:unknown;
  try{action();}catch(error){rejection=error;}
  expect(rejection,label).toBeInstanceOf(Error);
  errors[label]=(rejection as Error).message;
  expect(captureWriteBoundary(target),label+' must preserve disk bytes and CAS').toEqual(before);
}
async function rejectsGenerateWithoutWrite(label:string,action:()=>Promise<unknown>):Promise<void> {
  const before=captureWriteBoundary(context);await expect(action(),label).rejects.toThrow();expect(captureWriteBoundary(context)).toEqual(before);
}
function withLiveRowFault(table:'sessions'|'revisions',id:string,mutate:(value:Mutable<NamingSession>)=>void,assertions:()=>void):void {
  const original=String(context.store.db.exec('SELECT json FROM '+table+' WHERE id=?',[id])[0].values[0][0]);
  const before=diskBytes(context);
  try{alterJsonRow(context.store.db,table,id,mutate);assertions();expect(diskBytes(context)).toEqual(before);}
  finally{context.store.db.run('UPDATE '+table+' SET json=? WHERE id=?',[original,id]);}
}

beforeAll(async()=>{context=await openFlowStore('lifecycle');},60000);
afterAll(async()=>{try{writeFlowEvidence();}finally{await disposeFlowFixtures();}},60000);

describe('M781 real reviewed data flow; original7.1 stays the default',{timeout:360000},()=>{
  it('persists ordinary7.1 and explicit general纪枫 together without rewriting old sources or history',async()=>{
    const p=flowProfile('lifecycle');
    old=(await context.service.generate(p,flowPreferences('南安'))).session;
    expect(old.namingRules?.version).toBe(NAMING_RULE_V71_VERSION);expect(old).not.toHaveProperty('reviewedData');
    expect(old.id.startsWith(REVIEWED_DATA_SESSION_PREFIX)).toBe(false);expect(old.candidates).toHaveLength(1);
    expect(old.candidates[0]).not.toHaveProperty('reviewedDataUse');
    expect(old.sourceSnapshot!.sources.some(source=>(REVIEWED_DATA_SOURCE_IDS as readonly string[]).includes(source.id))).toBe(false);
    old=context.service.saveSession({...clone(old),reviewNote:'ordinary7.1 history before explicit new method'});
    oldStoredJson=JSON.stringify(rawSession(context,old.id));
    oldStoredHistory=context.store.db.exec('SELECT id,session_id,created_at,json FROM revisions WHERE session_id=? ORDER BY id',[old.id])[0]?.values??[];
    general=(await context.service.generateReviewed(p,flowPreferences('纪枫',{preferredElements:['木']}),generalSelection)).session;
    expect(general.candidates.map(candidate=>candidate.givenName)).toEqual(['纪枫']);assertFixedProof(general);
    expect(general.namingRules?.version).toBe(NAMING_RULE_V71_VERSION);
    expect(general.candidates[0].reviewedDataUse.semantic.rows[0].adoptionStatus).toBe('adopted');
    expect(general.candidates[0].reviewedDataUse.imagery.rows[1]).toMatchObject({char:'枫',baselineElements:[],effectiveElements:['木'],mapping:{authority:'project-convention',status:'eligible'}});
    expect(general.candidates[0].characters[1].elements).toEqual(['木']);
    expect(context.store.readVerifiedSession(general.id)).toEqual(general);assertOldUnchanged();
    flowEvidence('ordinary-and-general',{oldVersion:old.namingRules?.version,explicitMethod:general.reviewedData.method,oldSourcesAndHistoryUnchanged:true,generalGivenName:general.candidates[0].givenName});
  });

  it('projects the actual character elements into existing traditional scoring with zero semantic credit',()=>{
    const original=baselineScore(general),actual=general.candidates[0].evaluation;
    for(const field of ['sound','meaning','simplicity','distinctiveness'] as const)expect(actual[field]).toBe(original[field]);
    expect(actual.traditional-original.traditional).toBe(30);
    expect(general.candidates[0].reviewedDataUse.semantic.scoreDelta).toBe(0);
    expect(context.store.dataset.characters.find(character=>character.char==='枫')!.elements).toEqual([]);
    flowEvidence('actual-projected-score',{baselineTraditional:original.traditional,actualTraditional:actual.traditional,semanticDelta:0,baselineDatasetUnchanged:true});
  });

  it('uses the exact semantic and object themes while absent or irrelevant themes retain the legacy path',async()=>{
    const pref=flowPreferences('邦川',{preferredElements:['水']});
    themed=(await context.service.generateReviewed(flowProfile('themes-selected'),pref,themeSelection)).session;
    unselected=(await context.service.generateReviewed(flowProfile('themes-absent'),pref,generalSelection)).session;
    wrongSemanticTheme=(await context.service.generateReviewed(flowProfile('themes-irrelevant'),pref,{...generalSelection,semanticThemeIds:['water-bubbles']})).session;
    for(const session of [themed,unselected,wrongSemanticTheme]){expect(session.candidates.map(candidate=>candidate.givenName)).toEqual(['邦川']);assertFixedProof(session);}
    const yes=themed.candidates[0],none=unselected.candidates[0],wrong=wrongSemanticTheme.candidates[0];
    expect(yes.reviewedDataUse.semantic.rows[0]).toMatchObject({char:'邦',adoptionStatus:'adopted',qualification:{status:'eligible'}});
    expect(yes.characters[1].elements).toEqual(['水']);expect(yes.reviewedDataUse.imagery.rows[1]).toMatchObject({char:'川',baselineElements:[],effectiveElements:['水'],mapping:{requestedTheme:'river-object',requiredTheme:'river-object',status:'eligible'}});
    for(const candidate of [none,wrong]) {
      expect(candidate.reviewedDataUse.semantic.rows[0]).toMatchObject({char:'邦',adoptionStatus:'not-adopted',qualification:{status:'needs-theme'},adoption:null,project:null});
      expect(candidate.characters[1].elements).toEqual([]);
      expect(candidate.reviewedDataUse.imagery.rows[1]).toMatchObject({char:'川',baselineElements:[],effectiveElements:[],mapping:{status:'theme-required'}});
      expect(candidate.meaning).not.toContain('7.2项目说明');
      expect(candidate.warnings.some(warning=>warning.includes('邦'))).toBe(true);
    }
    expect(yes.meaning).not.toBe(none.meaning);expect(wrong.meaning).toBe(none.meaning);
    expect(yes.evaluation.meaning).toBe(none.evaluation.meaning);expect(yes.evaluation.traditional-none.evaluation.traditional).toBe(30);
    flowEvidence('themes-selected-absent-irrelevant',{selectedSemantic:yes.reviewedDataUse.semantic.rows[0].adoptionStatus,absentSemantic:none.reviewedDataUse.semantic.rows[0].adoptionStatus,selectedElements:yes.characters[1].elements,absentElements:none.characters[1].elements,traditionalDelta:yes.evaluation.traditional-none.evaluation.traditional});
  });

  it('rejects unknown or wrong char/theme enums, duplicate themes and caller approval fields without creating rows',async()=>{
    const invalidSelections:unknown[]=[
      {...generalSelection,method:'reviewed-naming-data/unknown'},
      {...generalSelection,semanticThemeIds:['unknown-theme']},
      {...generalSelection,semanticThemeIds:['civic-homeland','civic-homeland']},
      {...generalSelection,objectThemes:{川:'mineral-stone-object'}},
      {...generalSelection,objectThemes:{枫:'river-object'}},
      {...generalSelection,review:{approved:true,scoreDelta:100}},
    ];
    for(const [index,selection] of invalidSelections.entries())await rejectsGenerateWithoutWrite('invalid-selection-'+index,()=>context.service.generateReviewed(flowProfile('invalid-'+index),flowPreferences('邦川'),selection as ReviewedDataSelection));
    for(const flag of ['imageryReading','elementAssessment'] as const)await rejectsGenerateWithoutWrite('mixed-'+flag,()=>context.service.generateReviewed(flowProfile('mixed-'+flag),flowPreferences('纪枫',{[flag]:true}),generalSelection));
    flowEvidence('selection-and-unsupported-mix-rejections',{selectionCases:invalidSelections.length,mixedCases:2,diskAndCasUnchanged:true});
  });

  it('allows favorite and review notes, retains exact proof identity in history, and restores the saved version',()=>{
    const before=clone(general),draft=clone(general);draft.reviewNote='M781 reviewed session note';draft.candidates[0].favorite=true;draft.candidates[0].reviewNote='M781 reviewed candidate note';
    const saved=reviewed(context.service.saveSession(draft));
    expect(saved.reviewRevision).toBe(before.reviewRevision!+1);expect(saved.reviewToken).not.toBe(before.reviewToken);
    expect(saved.reviewedData).toEqual(before.reviewedData);expect(saved.candidates[0].reviewedDataUse).toEqual(before.candidates[0].reviewedDataUse);
    const history=context.service.listHistory(saved.id),target=history.find(row=>row.session.reviewRevision===before.reviewRevision)!;
    expect(target).toBeTruthy();expect(reviewed(target.session).reviewedData).toEqual(before.reviewedData);
    const restored=reviewed(context.service.restoreHistory(saved.id,target.id,saved.reviewRevision,saved.reviewToken));
    expect(restored.candidates).toEqual(before.candidates);expect(restored.reviewNote).toBe(before.reviewNote);
    expect(restored.reviewedData).toEqual(before.reviewedData);expect(restored.reviewRevision).toBe(saved.reviewRevision!+1);expect(restored.reviewToken).not.toBe(saved.reviewToken);
    general=restored;assertOldUnchanged();
    flowEvidence('favorite-note-history-restore',{historyCount:context.service.listHistory(general.id).length,reviewRevision:general.reviewRevision,proofIdentityUnchanged:true});
  });

  it('keeps directory candidateFactsVerified false and loads complete facts only through the verified detail reader',()=>{
    const catalog=context.service.listSessionCatalog({limit:25});
    expect(catalog.items.find(item=>item.id===general.id)).toMatchObject({candidateCount:1,candidateFactsVerified:false});
    expect(catalog.items.find(item=>item.id===old.id)).toMatchObject({candidateFactsVerified:false});
    for(const item of catalog.items){expect(item).not.toHaveProperty('candidates');expect(item).not.toHaveProperty('analysis');expect(item).not.toHaveProperty('reviewedData');}
    expect(context.service.readSessionDetail(general.id)).toEqual(general);
    flowEvidence('catalog-and-detail',{catalogCandidateFactsVerified:false,verifiedDetailRoundTrip:true});
  });

  it('reopens the real Store and restores an untouched NSBK envelope into a fresh Store with old and new records',async()=>{
    const backup=await flowTimed('untouched-nsbk/backup',()=>context.store.backupBytes());expect(Buffer.from(backup).subarray(0,8).toString('ascii')).toBe('NSBK0001');expect(decodeCustomerBackup(backup).format).toBe('compact-sqlite');
    const reader=await flowTimed('untouched-nsbk/reopen-original-store',()=>openFlowStore('reopen',context.directory));
    try {
      expect(await flowTimed('untouched-nsbk/reopen-read-old',()=>reader.store.readVerifiedSession(old.id))).toEqual(old);
      expect(await flowTimed('untouched-nsbk/reopen-read-reviewed',()=>reader.store.readVerifiedSession(general.id))).toEqual(general);
    }finally{await closeFlowStore(reader);}
    const target=await flowTimed('untouched-nsbk/open-restore-target',()=>openFlowStore('restore-target'));
    await flowTimed('untouched-nsbk/restore',()=>target.store.restore(backup));
    const cold=await flowTimed('untouched-nsbk/reopen-restored-store',()=>openFlowStore('restored-cold',target.directory));
    try {
      for(const saved of [old,general,themed,unselected]) {
        const actual=(await flowTimed('untouched-nsbk/read-restored-'+(saved.candidates[0].givenName)+'-'+(saved===unselected?'unselected':'selected'),()=>cold.store.readVerifiedSession(saved.id)))!;
        expect({...actual,reviewToken:saved.reviewToken}).toEqual(saved);expect(actual.reviewToken).not.toBe(saved.reviewToken);
      }
      expect(cold.store.readVerifiedSession(old.id)).not.toHaveProperty('reviewedData');
      expect(reviewed(cold.store.readVerifiedSession(general.id)!).reviewedData).toEqual(general.reviewedData);
      expect((await flowTimed('untouched-nsbk/read-restored-history',()=>cold.service.listHistory(general.id))).map(row=>reviewed(row.session).reviewedData)).toEqual((await flowTimed('untouched-nsbk/read-original-history',()=>context.service.listHistory(general.id))).map(row=>reviewed(row.session).reviewedData));
    }finally{await closeFlowStore(cold);await closeFlowStore(target);}
    assertOldUnchanged();flowEvidence('reopen-and-nsbk',{envelope:'NSBK0001',backupBytes:backup.length,oldAndNewReread:true,proofIdentityUnchanged:true,restoreChangedCasToken:true});
  });

  it('accepts an actual localhost AI proposal but computes all text, elements and proof from fixed local data',async()=>{
    const requests:Array<{url:string|undefined;authorization:string|undefined;body:unknown}>=[];
    let server:Server|undefined;
    const settings=context.store.settings(),marker='M781_AI_UNTRUSTED_APPROVAL';
    try {
      server=createServer(async(req,res)=>{
        try {let body='';for await(const chunk of req)body+=chunk;requests.push({url:req.url,authorization:req.headers.authorization,body:JSON.parse(body)});res.setHeader('Content-Type','application/json');
          res.end(JSON.stringify({choices:[{message:{content:JSON.stringify({candidates:[{givenName:'邦川',meaning:marker+' 温和从容的家庭祝愿。',reason:marker+' 清朗自然的日常表达。',themeIds:[],citationIds:[],reviewedDataUse:{approved:true,wholeNameApproved:true,scoreDelta:999},characters:[{char:'川',pinyin:'forged',elements:['火']}],evaluation:{traditional:999}}]})}}]}));
        }catch(error){res.statusCode=500;res.end(JSON.stringify({error:String(error)}));}
      });
      await new Promise<void>(resolve=>server!.listen(0,'127.0.0.1',resolve));
      const address=server.address() as AddressInfo;
      context.service.saveAiSettings({useAi:true,apiBaseUrl:`http://127.0.0.1:${address.port}/v1`,model:'m781-local-fixture',timeoutMs:5000});
      const ai=(await context.service.generateReviewed(flowProfile('actual-ai'),flowPreferences('邦川',{preferredElements:['水']}),themeSelection)).session;
      expect(requests).toHaveLength(1);expect(requests[0].url).toBe('/v1/chat/completions');expect(requests[0].authorization).toBe('Bearer '+syntheticKey);
      const payload=requests[0].body as {messages:Array<{role:string;content:string}>};
      const modelInput=JSON.parse(payload.messages.find(message=>message.role==='user')!.content) as {favorableElements:string[];characters:Array<{char:string;pinyin:string;meaning:string;elements:string[]}>};
      expect(modelInput.favorableElements).toEqual(['水']);
      expect(modelInput.characters.find(character=>character.char==='川')!.elements).toEqual(['水']);
      expect(ai.candidates).toHaveLength(1);expect(ai.candidates[0].origin).toBe('ai');assertFixedProof(ai);
      expect(ai.candidates[0].meaning).toBe(themed.candidates[0].meaning);expect(ai.candidates[0].characters).toEqual(themed.candidates[0].characters);expect(ai.candidates[0].evaluation).toEqual(themed.candidates[0].evaluation);
      expect(JSON.stringify(ai)).not.toContain(marker);expect(JSON.stringify(ai)).not.toContain('forged');
      expect(ai.candidates[0].characters[1].elements).toEqual(['水']);expect(ai.candidates[0].reviewedDataUse.semantic.scoreDelta).toBe(0);
      expect(context.service.readSessionDetail(ai.id)).toEqual(ai);
      flowEvidence('actual-localhost-ai',{requests:requests.length,origin:ai.candidates[0].origin,endpointPath:requests[0].url,usedSyntheticKey:true,actualAiInputUsesProjectedElements:true,aiSelfApprovalDiscarded:true,fixedLocalTextElementsAndProof:true});
    }finally {
      context.service.saveAiSettings({useAi:settings.useAi,apiBaseUrl:settings.apiBaseUrl,model:settings.model,timeoutMs:settings.timeoutMs});
      if(server){server.closeAllConnections();await new Promise<void>(resolve=>server!.close(()=>resolve()));}
    }
  });

  it('creates a real multiple-candidate donor for occurrence and candidate-index graft checks',async()=>{
    tamperContext=await openFlowStore('tamper-pristine');
    tamperSubject=(await tamperContext.service.generateReviewed(flowProfile('tamper-pristine'),flowPreferences('纪枫',{preferredElements:['木']}),generalSelection)).session;
    const allowed=new Set(['纪','枫','宁']);
    const forbiddenChars=tamperContext.store.dataset.characters.filter(character=>!allowed.has(character.char)).map(character=>character.char).join('');
    multiple=(await tamperContext.service.generateReviewed(flowProfile('multiple'),flowPreferences('纪枫',{requiredChars:'',forbiddenChars}),generalSelection)).session;
    expect(multiple.candidates.length).toBeGreaterThan(1);expect(multiple.candidates.length).toBeLessThanOrEqual(3);assertFixedProof(multiple);
    expect(multiple.candidates.every(candidate=>[...candidate.givenName].every(char=>allowed.has(char)))).toBe(true);
    expect(tamperContext.service.readSessionDetail(multiple.id)).toEqual(multiple);
    flowEvidence('multiple-real-candidates',{candidateCount:multiple.candidates.length,distinctIds:new Set(multiple.candidates.map(candidate=>candidate.id)).size,realForbiddenCharConstraint:true,pristineTamperSessionNoHistory:tamperContext.service.listHistory(tamperSubject.id).length===0});
  });
});

type Draft=Mutable<ReviewedNamingSession>;
const tamperCases:Array<{name:string;mutate:(value:Draft)=>void}>= [
  {name:'removed session addon',mutate:value=>{delete (value as Partial<Draft>).reviewedData;}},
  {name:'removed child addon',mutate:value=>{delete (value.candidates[0] as Partial<Draft['candidates'][number]>).reviewedDataUse;}},
  {name:'removed fixed source',mutate:value=>{value.sourceSnapshot!.sources=value.sourceSnapshot!.sources.filter(source=>source.id!==REVIEWED_DATA_SOURCE_IDS[0]);}},
  {name:'changed method',mutate:value=>{(value.reviewedData as unknown as {method:string}).method='reviewed-naming-data/9.9.9';}},
  {name:'changed session id prefix',mutate:value=>{value.id='legacy-pretend-'+value.id;}},
  {name:'changed candidate id prefix',mutate:value=>{value.candidates[0].id='legacy-pretend-'+value.candidates[0].id;}},
  {name:'moved semantic receipt',mutate:value=>{value.candidates[0].reviewedDataUse.semantic.rows[0].adoption!.position=1;}},
  {name:'changed reading',mutate:value=>{const character=value.candidates[0].characters[0];character.pinyin=character.pinyin==='jǐ'?'jì':'jǐ';}},
  {name:'changed projected element',mutate:value=>{value.candidates[0].characters[1].elements=['火'];}},
  {name:'changed score',mutate:value=>{value.candidates[0].evaluation.traditional+=1;}},
  {name:'changed canonical text',mutate:value=>{value.candidates[0].meaning+=' caller written';}},
  {name:'changed style',mutate:value=>{value.candidates[0].style='caller style';}},
  {name:'changed origin',mutate:value=>{value.candidates[0].origin='ai';}},
  {name:'cross candidate proof',mutate:value=>{value.candidates[0].reviewedDataUse=clone(multiple.candidates[1].reviewedDataUse);}},
  {name:'cross session proof',mutate:value=>{value.candidates[0].reviewedDataUse=clone(themed.candidates[0].reviewedDataUse);}},
  {name:'changed semantic theme context',mutate:value=>{value.reviewedData.selection.semanticThemeIds=['water-bubbles'];}},
  {name:'changed object theme context',mutate:value=>{value.reviewedData.selection.objectThemes.川='river-object';}},
  {name:'changed child proof digest',mutate:value=>{value.candidates[0].reviewedDataUse.proofSha256='0'.repeat(64);}},
  {name:'changed root proof digest',mutate:value=>{value.reviewedData.proofSha256='0'.repeat(64);}},
];

describe('M781 real save, history and archive corruption rejection',{timeout:360000},()=>{
  it.each(tamperCases)('rejects $name through direct Service and Store.saveSession while disk and CAS remain exact',({name,mutate})=>{
    for(const writer of ['service','store'] as const) {
      const draft=clone(tamperSubject);mutate(draft);
      rejectsWithoutWrite(writer+':'+name,()=>writer==='service'?tamperContext.service.saveSession(draft):tamperContext.store.saveSession(draft),tamperContext);
    }
    assertOldUnchanged();flowEvidence('tamper:'+name,{serviceRejected:true,storeRejected:true,diskBytesAndCasUnchanged:true,errors:{service:errors['service:'+name],store:errors['store:'+name]}});
  });

  it('rejects a proof from a different candidate in the same real multi-candidate session',()=>{
    for(const writer of ['service','store'] as const) {
      const draft=clone(multiple);draft.candidates[0].reviewedDataUse=clone(draft.candidates[1].reviewedDataUse);
      rejectsWithoutWrite(writer+':same-session-candidate-graft',()=>writer==='service'?tamperContext.service.saveSession(draft):tamperContext.store.saveSession(draft),tamperContext);
    }
    flowEvidence('same-session-candidate-graft',{serviceRejected:true,storeRejected:true,diskAndCasUnchanged:true});
  });

  it.each(['root-addon-getter','candidate-proof-getter','nested-getter','nested-own-toJSON'] as const)('rejects %s without invoking user code through Service or Store',kind=>{
    for(const writer of ['service','store'] as const) {
      const draft=clone(tamperSubject);let invocations=0;
      const getter=(owner:object,key:string,value:unknown)=>Object.defineProperty(owner,key,{enumerable:true,configurable:true,get(){invocations++;return value;}});
      if(kind==='root-addon-getter')getter(draft,'reviewedData',draft.reviewedData);
      else if(kind==='candidate-proof-getter')getter(draft.candidates[0],'reviewedDataUse',draft.candidates[0].reviewedDataUse);
      else if(kind==='nested-getter')getter(draft.candidates[0].reviewedDataUse.semantic.rows[0].adoption!,'senseId',draft.candidates[0].reviewedDataUse.semantic.rows[0].adoption!.senseId);
      else {
        const row=draft.candidates[0].reviewedDataUse.semantic.rows[0];
        Object.defineProperty(row,'toJSON',{enumerable:true,configurable:true,value(){invocations++;return {char:row.char};}});
      }
      rejectsWithoutWrite(writer+':'+kind,()=>writer==='service'?tamperContext.service.saveSession(draft):tamperContext.store.saveSession(draft),tamperContext);
      expect(invocations,writer+' '+kind+' must be rejected before invoking a getter or toJSON').toBe(0);
    }
    flowEvidence('input-guard:'+kind,{serviceRejected:true,storeRejected:true,userCodeInvocations:0,diskAndCasUnchanged:true});
  });

  it.each(['missing-addon','grafted-proof'] as const)('rejects %s in a real linked history read and restore independently of direct save',kind=>{
    const revision=context.service.listHistory(general.id)[0];expect(revision).toBeTruthy();
    withLiveRowFault('revisions',revision.id,value=>{
      const draft=value as Draft;if(kind==='missing-addon')delete (draft as Partial<Draft>).reviewedData;
      else draft.candidates[0].reviewedDataUse=clone(themed.candidates[0].reviewedDataUse);
    },()=>{
      rejectsWithoutWrite('history-list:'+kind,()=>context.service.listHistory(general.id));
      rejectsWithoutWrite('history-restore:'+kind,()=>context.service.restoreHistory(general.id,revision.id,general.reviewRevision,general.reviewToken));
      rejectsWithoutWrite('history-detail:'+kind,()=>context.service.readSessionDetail(general.id));
      rejectsWithoutWrite('history-backup:'+kind,()=>context.store.backupBytes());
    });
    expect(context.service.readSessionDetail(general.id)).toEqual(general);
    flowEvidence('history-corruption:'+kind,{listRejected:true,historyRestoreRejected:true,detailRejected:true,backupRejected:true,diskAndCasUnchanged:true});
  });

  it('accepts a strict raw-database NSBK conversion before testing independently rebuilt malicious archives',async()=>{
    const archive=await alteredFlowBackup(context,()=>{},[old.id,general.id]),target=await openFlowStore('raw-archive-positive');
    try {
      await flowTimed('raw-nsbk-positive/restore',()=>target.store.restore(archive));
      const saved=reviewed((await flowTimed('raw-nsbk-positive/read-reviewed',()=>target.service.readSessionDetail(general.id)))!);
      expect({...saved,reviewToken:general.reviewToken}).toEqual(general);
      expect(saved.reviewedData).toEqual(general.reviewedData);
      expect({...target.service.readSessionDetail(old.id)!,reviewToken:old.reviewToken}).toEqual(old);
      expect(target.service.listHistory(general.id)).toEqual(context.service.listHistory(general.id));
      flowEvidence('raw-nsbk-positive-control',{strictRawSchemaAccepted:true,preservedRealSourcesArchivesHistoryAndProof:true});
    }finally{await closeFlowStore(target);}
  });

  it.each(['current-missing-addon','current-grafted-proof','history-missing-addon','history-grafted-proof'] as const)('rejects rebuilt NSBK with %s and preserves the existing database, recovery file and CAS',async kind=>{
    const target=await openFlowStore('bad-archive-target');
    try {
      // A real old record makes a failed restore preserve existing customer data.
      const retained=(await target.service.generate(flowProfile('restore-retained-'+kind),flowPreferences('安宁'))).session;
      const prior=path.join(target.directory,'customers.before-restore.sqlite'),sentinel=Buffer.from('M781 recovery sentinel '+kind);
      fs.writeFileSync(prior,sentinel);
      const history=kind.startsWith('history'),revision=history?context.service.listHistory(general.id)[0]:undefined;
      const archive=await alteredFlowBackup(context,db=>alterJsonRow(db,history?'revisions':'sessions',history?revision!.id:general.id,value=>{
        const draft=value as Draft;
        if(kind.endsWith('missing-addon'))delete (draft as Partial<Draft>).reviewedData;
        else draft.candidates[0].reviewedDataUse=clone(themed.candidates[0].reviewedDataUse);
      }),[old.id,general.id]);
      expect(Buffer.from(archive).subarray(0,8).toString('ascii')).toBe('NSBK0001');
      // The envelope's compression and hashes are valid. The rejected content is the proof.
      expect(decodeCustomerBackup(archive).sqlite.length).toBeGreaterThan(16);
      const before=captureWriteBoundary(target),database=target.store.db;
      expect(()=>target.store.restore(archive)).toThrow();
      expect(target.store.db).toBe(database);expect(captureWriteBoundary(target)).toEqual(before);expect(fs.readFileSync(prior)).toEqual(sentinel);
      expect(target.service.readSessionDetail(retained.id)).toEqual(retained);
      flowEvidence('nsbk-corruption:'+kind,{validEnvelope:true,restoreRejected:true,existingCustomerPreserved:true,recoveryFilePreserved:true,diskAndCasUnchanged:true});
    }finally{await closeFlowStore(target);}
  });

  it('rejects a missing catalog marker cheaply while a structurally complete graft stays unverified until detail validation',()=>{
    withLiveRowFault('sessions',general.id,value=>{delete (value as Partial<Draft>).reviewedData;},()=>{
      expect(()=>context.service.listSessionCatalog({limit:25})).toThrow(/标记|版本/);
      expect(()=>context.service.readSessionDetail(general.id)).toThrow();
    });
    withLiveRowFault('sessions',general.id,value=>{(value as Draft).candidates[0].reviewedDataUse=clone(themed.candidates[0].reviewedDataUse);},()=>{
      const summary=context.service.listSessionCatalog({limit:25}).items.find(row=>row.id===general.id)!;
      expect(summary.candidateFactsVerified).toBe(false);expect(summary).not.toHaveProperty('candidates');
      expect(()=>context.service.readSessionDetail(general.id)).toThrow();
    });
    assertOldUnchanged();flowEvidence('catalog-marker-and-proof-boundary',{missingMarkerRejected:true,graftSummaryStillUnverified:true,graftDetailRejected:true});
  });
});

describe('M781 actual Vite local API routing',{timeout:360000},()=>{
  it('POSTs generateReviewed through studioDevPlugin and rereads the persisted ID over readSessionDetail',async()=>{
    const directory=ownedFlowDirectory('vite-api'),previous=process.env.NAMING_STUDIO_PREVIEW_DATA;
    let vite:ViteDevServer|undefined;
    try {
      process.env.NAMING_STUDIO_PREVIEW_DATA=directory;
      vite=await createViteServer({configFile:false,root:flowRoot,plugins:[studioDevPlugin()],server:{host:'127.0.0.1',port:0,strictPort:true,hmr:false},logLevel:'error'});
      await vite.listen();const address=vite.httpServer!.address() as AddressInfo;expect(address.address).toBe('127.0.0.1');
      const base=`http://127.0.0.1:${address.port}`;
      const post=async(method:string,args:unknown[])=>{const response=await fetch(base+'/__studio_api/'+method,{method:'POST',headers:{'Content-Type':'application/json','X-Studio-Local-Request':'1'},body:JSON.stringify(args),redirect:'error'});const body:unknown=await response.json();expect(response.status,JSON.stringify(body)).toBe(200);return body;};
      const generated=await post('generateReviewed',[flowProfile('vite-route'),flowPreferences('纪枫',{preferredElements:['木']}),generalSelection]) as GenerateResult;
      const session=reviewed(generated.session);expect(session.candidates.map(candidate=>candidate.givenName)).toEqual(['纪枫']);assertFixedProof(session);
      const detail=await post('readSessionDetail',[session.id]);expect(detail).toEqual(session);expect(fs.existsSync(path.join(directory,'customers.sqlite'))).toBe(true);
      const reader=await openFlowStore('vite-cold-reader',directory);
      try{expect(reader.store.readVerifiedSession(session.id)).toEqual(session);}finally{await closeFlowStore(reader);}
      const rejected=await fetch(base+'/__studio_api/generateReviewed',{method:'POST',headers:{'Content-Type':'application/json','X-Studio-Local-Request':'1'},body:JSON.stringify([flowProfile('vite-bad-selection'),flowPreferences('纪枫'),{...generalSelection,review:{approved:true}}])});
      expect(rejected.status).toBe(400);
      flowEvidence('actual-vite-api',{generateStatus:200,readDetailStatus:200,badSelectionStatus:400,boundToLoopback:true,explicitMethod:session.reviewedData.method,coldStoreReread:true});
    }finally {try{await vite?.close();}finally{if(previous===undefined)delete process.env.NAMING_STUDIO_PREVIEW_DATA;else process.env.NAMING_STUDIO_PREVIEW_DATA=previous;}}
  });
});
