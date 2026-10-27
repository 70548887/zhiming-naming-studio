import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {catalogSession} from './fixtures/catalog-session';
import {normalizePreferences} from '../src/shared/workflow';
import {createSessionSourceSnapshot} from '../src/shared/session-sources';
import {NAMING_RULE_V71_VERSION,NAMING_RULE_V71_SOURCE_ID} from '../src/shared/naming-rules';
import {REVIEWED_DATA_METHOD,REVIEWED_DATA_SESSION_PREFIX,REVIEWED_DATA_CANDIDATE_PREFIX,REVIEWED_DATA_SOURCE_IDS} from '../src/shared/reviewed-naming-data';
import {loadReviewedNamingDataResources} from '../src/main/reviewed-naming-data-resources';
import {createReviewedNamingGeneration,normalizeReviewedDataSelection,REVIEWED_DATA_MANUAL_WARNING} from '../src/main/reviewed-naming-data-generation';
import {attachReviewedNamingData,verifyReviewedNamingDataSession,hasReviewedDataFootprint,assertUnchangedReviewedData} from '../src/main/reviewed-naming-data-verification';
import {loadNamingEditorialV71Data} from '../src/main/naming-editorial-v7-data';
import {assessNamingSemanticAdmission,createNamingSemanticAdmissionHandle} from '../src/domain/naming-semantic-admission-v72';
import {evaluateNameForRuleVersionWithContext} from '../src/domain/naming';
import {finalizeNamingCandidateForRuleVersion} from '../src/main/naming-meaning-review';
import type {ReviewedNamingDataResources} from '../src/main/reviewed-naming-data-resources';
import type {FactArchive,FactDataset} from '../src/main/candidate-facts';
import type {ReviewedDataSelection,ReviewedNamingSession,ReviewedNamingGenerationRequest} from '../src/shared/reviewed-naming-data';
import type {SemanticThemeId,SemanticAdmissionStage} from '../src/shared/naming-semantic-admission-v72';
import type {NamingSession,SourceRecord} from '../src/shared/types';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),evidence=path.join(root,'.local/m781-composition');
let resources:ReviewedNamingDataResources,archive:FactArchive,source71:ReturnType<typeof loadNamingEditorialV71Data>;
const observations:Array<Record<string,unknown>>=[];
const selected=(semanticThemeIds:readonly SemanticThemeId[]=[],objectThemes:ReviewedDataSelection['objectThemes']={}):ReviewedDataSelection=>({method:REVIEWED_DATA_METHOD,semanticThemeIds,objectThemes});
beforeAll(()=>{
 resources=loadReviewedNamingDataResources(root);source71=loadNamingEditorialV71Data(resources.dataDir);
 observations.push({test:'actual-fixed-publication-identity',publicationId:resources.identity.publicationId,manifestSha256:resources.identity.manifestSha256,semantic:resources.identity.semantic,imagery:resources.identity.imagery});
 const pack=new Uint8Array(fs.readFileSync(path.join(resources.dataDir,'knowledge-v6.sqlite'))),sha256=createHash('sha256').update(pack).digest('hex');
 const raw=JSON.parse(fs.readFileSync(path.join(resources.dataDir,'dataset-v6.json'),'utf8')) as FactDataset;
 archive={sha256,version:sha256.slice(0,12),pack,dataset:{...raw,version:sha256.slice(0,12)}};
},120000);
afterAll(()=>{fs.mkdirSync(evidence,{recursive:true});const temporary=path.join(evidence,'actual-results.json.tmp');fs.writeFileSync(temporary,JSON.stringify(observations,null,2)+'\n');fs.renameSync(temporary,path.join(evidence,'actual-results.json'));});
function request(givenName:string,selection=selected()):ReviewedNamingGenerationRequest {
 const sample=catalogSession(),preferences=normalizePreferences({...sample.preferences,length:[...givenName].length as 1|2,requiredChars:givenName,generationChar:'',forbiddenChars:'',elderTaboo:'',meanings:'',industry:'',style:'自然',preferredElements:[],numerology:false,zodiacRules:false,elementAssessment:false,imageryReading:false});
 const profile={...sample.profile,surname:'林',surnamePinyin:'lín',fatherName:'',motherName:'',namingPreferences:structuredClone(preferences)};
 return {profile,preferences,analysis:sample.analysis,selection};
}
function original71(input:ReviewedNamingGenerationRequest,givenName:string,origin:'local'|'ai',id:string){
 const context={packSha256:archive.sha256,activeVersion:archive.version},raw=evaluateNameForRuleVersionWithContext(NAMING_RULE_V71_VERSION,context,givenName,input.profile,input.preferences,input.analysis,archive.dataset.characters,archive.dataset.citations,origin)!;
 expect(raw).not.toBeNull();raw.id=id;return finalizeNamingCandidateForRuleVersion(NAMING_RULE_V71_VERSION,raw,input.profile,input.preferences,input.analysis,context,source71);
}
function sessionFor(givenName='纪枫',selection=selected(),origin:'local'|'ai'='local',elements:ReviewedNamingGenerationRequest['preferences']['preferredElements']=[]):ReviewedNamingSession {
 const input=request(givenName,selection);input.preferences.preferredElements=elements;input.profile.namingPreferences=structuredClone(input.preferences);
 const candidate=createReviewedNamingGeneration(resources,input).evaluate(givenName,origin,REVIEWED_DATA_CANDIDATE_PREFIX+randomUUID());expect(candidate).not.toBeNull();
 const sources=new Map<string,SourceRecord>();for(const source of [...archive.dataset.sources,...source71.sources,...resources.sourceRecords]){const previous=sources.get(source.id);if(previous)expect(previous).toEqual(source);else sources.set(source.id,source);}
 const session:NamingSession={id:REVIEWED_DATA_SESSION_PREFIX+randomUUID(),profileId:input.profile.id,createdAt:'2026-10-25T10:00:00.000Z',profile:input.profile,preferences:input.preferences,analysis:input.analysis,candidates:[candidate!],reviewNote:'',originalFavorable:[...input.analysis.bazi.favorable],dataVersion:archive.version,namingRules:{version:NAMING_RULE_V71_VERSION,sourceId:NAMING_RULE_V71_SOURCE_ID,dataVersion:archive.version},sourceSnapshot:createSessionSourceSnapshot(archive.version,[...sources.values()])};
 return attachReviewedNamingData(session,selection,resources);
}

describe('M781 explicit selection and true fixed resource boundary',{timeout:120000},()=>{
 it('owns enum-only selection without invoking getters, Proxy traps, array methods or inherited intent',()=>{
  expect(normalizeReviewedDataSelection(selected(['water-bubbles','agriculture'],{'川':'river-object'}))).toEqual(selected(['agriculture','water-bubbles'],{'川':'river-object'}));
  for(const value of [{...selected(),semanticThemeIds:['自然']},{...selected(),semanticThemeIds:['agriculture','agriculture']},{...selected(),objectThemes:{'川':'tree-branch-object'}},{...selected(),objectThemes:{'枫':'river-object'}},{...selected(),approved:true},Object.create(selected())])expect(()=>normalizeReviewedDataSelection(value)).toThrow();
  let getters=0,traps=0;const getter=Object.defineProperty(selected(),'objectThemes',{enumerable:true,get(){getters++;return {'川':'river-object'};}}),proxy=new Proxy(selected(),{ownKeys(){traps++;throw Error('trap');}});
  expect(()=>normalizeReviewedDataSelection(getter)).toThrow();expect(()=>normalizeReviewedDataSelection(proxy)).toThrow();expect(getters).toBe(0);expect(traps).toBe(0);
  const array=['agriculture'];Object.defineProperty(array,'map',{value(){throw Error('caller map');},enumerable:true});expect(()=>normalizeReviewedDataSelection({...selected(),semanticThemeIds:array})).toThrow();
 });
 it('uses real9 semantic grants and all10 imagery rows while preserving the entire old779 input pool',()=>{
  const generation=createReviewedNamingGeneration(resources,request('纪枫'));
  expect(resources.semantic.publication.records.filter(row=>row.decision==='allow-single-character-generation')).toHaveLength(9);
  expect(resources.imagery.coverage.admitted).toMatchObject({general:5,explicitTheme:5});
  expect(generation.characters).toHaveLength(archive.dataset.characters.length);expect(generation.characters).toHaveLength(779);
  for(const original of archive.dataset.characters)expect(generation.characters.some(entry=>entry.char===original.char)).toBe(true);
  expect(generation.characters.filter(entry=>entry.elements.length)).toHaveLength(262);
  observations.push({test:'real-publications-and-pool',legacyGeneratorInput:779,newInput:generation.characters.length,semanticGrants:9,imageryGeneral:5,imageryThemed:5});
 });
 it('rejects structurally fabricated source capabilities and preserves full reading/source identity in every semantic stage',()=>{
  expect(()=>createReviewedNamingGeneration({...resources} as ReviewedNamingDataResources,request('纪安'))).toThrow();
  const pure=createNamingSemanticAdmissionHandle(resources.semantic.publication);expect(()=>createReviewedNamingGeneration({...resources,semantic:pure} as ReviewedNamingDataResources,request('纪安'))).toThrow();
  const actual=archive.dataset.characters.find(entry=>entry.char==='纪')!;
  for(const stage of ['pool','required','local','ai','save','restore'] as SemanticAdmissionStage[]){
   const context={themeIds:[],requestedGivenNameLength:2 as const,namePart:'given-name' as const,stage,givenName:'纪安',fullName:'林纪安',position:0,candidateId:REVIEWED_DATA_CANDIDATE_PREFIX+'reading'};
   expect(assessNamingSemanticAdmission(resources.semantic,actual,context).status).toBe('eligible');
   expect(assessNamingSemanticAdmission(resources.semantic,{...actual,pinyin:'jǐ',tone:3},context).status).toBe('reading-mismatch');
   expect(assessNamingSemanticAdmission(resources.semantic,{...actual,sourceId:'self-issued'},context).status).toBe('rejected-integrity');
  }
 });
 it('rejects the explicitly unsupported cross-authority options',()=>{
  for(const key of ['elementAssessment','imageryReading'] as const){const input=request('纪安');input.preferences[key]=true;input.profile.namingPreferences=structuredClone(input.preferences);expect(()=>createReviewedNamingGeneration(resources,input)).toThrow(/does not yet combine/);}
  const input=request('纪安');(input.analysis as any).projectNamingUse={method:'other'};expect(()=>createReviewedNamingGeneration(resources,input)).toThrow(/does not yet combine/);
 });
});

describe('M781 canonical composed generation and private original mirror',{timeout:120000},()=>{
 it('adopts each real eligible semantic text with zero extra semantic score and identical local/AI qualification',()=>{
  for(const record of resources.semantic.publication.records.filter(row=>row.decision==='allow-single-character-generation')){
   const name=record.identity.char+'安',selection=selected(record.usage.mode==='explicit-themes'?record.usage.anyOf:[]),input=request(name,selection),generation=createReviewedNamingGeneration(resources,input);
   const local=generation.evaluate(name,'local',REVIEWED_DATA_CANDIDATE_PREFIX+'local-'+record.identity.char)!,ai=generation.evaluate(name,'ai',REVIEWED_DATA_CANDIDATE_PREFIX+'ai-'+record.identity.char)!;
   expect(local).not.toBeNull();expect(ai).not.toBeNull();expect(local.meaning).toContain(record.project.meaning);expect(ai.meaning).toBe(local.meaning);expect(ai.evaluation).toEqual(local.evaluation);expect(local.evaluation).toEqual(original71(input,name,'local',local.id).evaluation);
  }
  observations.push({test:'all-nine-real-semantic-local-ai',adopted:9,semanticScoreDelta:0,wholeNameMeaning:null});
 });
 it('keeps needs-theme and pending glyphs on their original permitted path without new explanation or receipt',()=>{
  for(const name of ['邦安','叶安']){
   const session=sessionFor(name),row=session.candidates[0].reviewedDataUse.semantic.rows[0];expect(row.adoptionStatus).toBe('not-adopted');expect(row.adoption).toBeNull();expect(row.project).toBeNull();
   expect(row.qualification.status).toBe(name==='邦安'?'needs-theme':'pending-source-identity');
   const input=request(name),old=original71(input,name,'local',session.candidates[0].id);expect(session.candidates[0].meaning).toBe(old.meaning);expect(session.candidates[0].warnings).toEqual(old.warnings);
  }
 });
 it('adopts exact themes independently and leaves untitled imagery rows with their original empty elements',()=>{
  const missing=sessionFor('邦川'),adopted=sessionFor('邦川',selected(['civic-homeland'],{'川':'river-object'}),'local',['水']);
  expect(missing.candidates[0].characters[1].elements).toEqual([]);expect(missing.candidates[0].reviewedDataUse.imagery.rows[1].mapping).toMatchObject({status:'theme-required',requestedTheme:null});
  expect(adopted.candidates[0].characters[1].elements).toEqual(['水']);expect(adopted.candidates[0].reviewedDataUse.semantic.rows[0].adoptionStatus).toBe('adopted');
  expect(adopted.candidates[0].reviewedDataUse.semantic).toMatchObject({scoreDelta:0,wholeNameMeaning:null});
  for(const char of ['川','石','枝','棉','蕤'])expect(createReviewedNamingGeneration(resources,request(char)).characters.find(entry=>entry.char===char)!.elements).toEqual([]);
 });
 it('routes actual local proposals through the same canonical evaluation and independently reproduces original mirror facts',()=>{
  const selection=selected(['civic-homeland'],{'川':'river-object'}),input=request('邦川',selection),generation=createReviewedNamingGeneration(resources,input),local=generation.generateLocal(8);
  expect(local.candidates.some(candidate=>candidate.givenName==='邦川')).toBe(true);
  for(const proposal of local.candidates)expect(proposal).toEqual(generation.evaluate(proposal.givenName,'local',proposal.id));
  const session=sessionFor('纪枫',selected(),'local',['木']),candidate=session.candidates[0],mirror=verifyReviewedNamingDataSession(session,resources,archive),old=original71({...request('纪枫'),profile:session.profile,preferences:session.profile.namingPreferences!},'纪枫','local',candidate.id);
  expect(candidate.characters[1].elements).toEqual(['木']);expect(mirror.candidates[0].characters[1].elements).toEqual([]);expect(candidate.evaluation.traditional).toBeGreaterThan(mirror.candidates[0].evaluation.traditional);
  expect(mirror.candidates[0]).toEqual(old);expect(Object.hasOwn(mirror,'reviewedData')).toBe(false);expect(Object.hasOwn(mirror.candidates[0],'reviewedDataUse')).toBe(false);expect(mirror.sourceSnapshot).toEqual(session.sourceSnapshot);
  observations.push({test:'actual-local-and-baseline-mirror',localCount:local.candidates.length,name:candidate.fullName,projectedTraditional:candidate.evaluation.traditional,baselineTraditional:mirror.candidates[0].evaluation.traditional});
 });
 it('retains original old-scope warning text in exact revisions and cannot use it as the new admission condition',()=>{
  const session=sessionFor('纶安',selected(['textile-ribbon'])),semantic=session.candidates[0].reviewedDataUse.semantic,record=resources.semantic.publication.rows.find(row=>row.char==='纶')!;
  expect(semantic.rows[0].adoptionStatus).toBe('adopted');
  for(const revision of semantic.warningRevisions){expect(revision.reason).toBe('versioned-admission-replaces-old-scope');expect(revision.from).toContain(String(record.priorV7Review.scope));expect(session.candidates[0].warnings).toContain(revision.to);expect(session.candidates[0].warnings).not.toContain(revision.from);}
 });
});

describe('M781 source, occurrence and immutable text replay',{timeout:120000},()=>{
 it('permits favorites, notes and only the existing manual preference reminder while freezing generation preferences',()=>{
  const original=sessionFor(),next=structuredClone(original);next.reviewNote='已与家属讨论';next.candidates[0].favorite=true;next.candidates[0].reviewNote='复核记录';next.preferences.preferredElements=['金'];next.candidates[0].warnings.push(REVIEWED_DATA_MANUAL_WARNING);
  expect(()=>assertUnchangedReviewedData(original,next)).not.toThrow();const mirror=verifyReviewedNamingDataSession(next,resources,archive);expect(mirror.candidates[0].favorite).toBe(true);expect(mirror.profile.namingPreferences!.preferredElements).toEqual([]);
 });
 it('checks each core field and complete subproof instead of trusting caller-authored hashes',()=>{
  const original=sessionFor();
  const changes:Array<[string,(session:any)=>void]>=[
   ['meaning',s=>{s.candidates[0].meaning+='人格断语';}],['reason',s=>{s.candidates[0].reason='other';}],['style',s=>{s.candidates[0].style='other';}],['origin',s=>{s.candidates[0].origin='ai';}],['score',s=>{s.candidates[0].evaluation.meaning++;}],
   ['default reading',s=>{s.candidates[0].characters[0].pinyin='jǐ';}],['project source',s=>{s.candidates[0].reviewedDataUse.semantic.rows[0].adoption.sourceSha256='0'.repeat(64);}],['project text',s=>{s.candidates[0].reviewedDataUse.semantic.rows[0].project.meaning='other';}],['adoption missing',s=>{s.candidates[0].reviewedDataUse.semantic.rows[0].adoption=null;}],['position',s=>{s.candidates[0].reviewedDataUse.semantic.rows[0].position=1;}],['imagery source',s=>{s.candidates[0].reviewedDataUse.imagery.rows[1].mapping.sourceEntrySha256='0'.repeat(64);}],
   ['source record',s=>{s.sourceSnapshot.sources.find((row:any)=>row.id===REVIEWED_DATA_SOURCE_IDS[0]).sha256='0'.repeat(64);}],['publication',s=>{s.reviewedData.publication.manifestSha256='0'.repeat(64);}],['cross session',s=>{s.id=REVIEWED_DATA_SESSION_PREFIX+randomUUID();}],['cross candidate',s=>{s.candidates[0].id=REVIEWED_DATA_CANDIDATE_PREFIX+randomUUID();}],['createdAt',s=>{s.createdAt='2026-10-26T10:00:00.000Z';}],['frozen preferences',s=>{s.profile.namingPreferences.preferredElements=['火'];}],['analysis',s=>{s.analysis.bazi.favorable=['火'];}],['addon absent',s=>{delete s.reviewedData;}],['candidate proof absent',s=>{delete s.candidates[0].reviewedDataUse;}],['theme changed',s=>{s.reviewedData.selection.semanticThemeIds=['agriculture'];}],
  ];
  for(const [label,change] of changes){const altered=structuredClone(original);change(altered);expect(()=>verifyReviewedNamingDataSession(altered,resources,archive),label).toThrow();expect(()=>assertUnchangedReviewedData(original,altered),label).toThrow();}
  observations.push({test:'tampered-fact-source-proof-occurrence',rejected:changes.map(([label])=>label)});
 });
 it('detects any remaining namespace/source footprint, but leaves untouched old history recognizable',()=>{
  const original=sessionFor(),without=structuredClone(original);delete (without as any).reviewedData;delete (without.candidates[0] as any).reviewedDataUse;without.id='legacy-session';without.candidates[0].id='legacy-candidate';expect(hasReviewedDataFootprint(without)).toBe(true);
  expect(hasReviewedDataFootprint(catalogSession())).toBe(false);
  const addonOnly={reviewedData:{method:REVIEWED_DATA_METHOD}};expect(hasReviewedDataFootprint(addonOnly)).toBe(true);expect(hasReviewedDataFootprint({id:REVIEWED_DATA_SESSION_PREFIX+'only'})).toBe(true);expect(hasReviewedDataFootprint({candidates:[{id:REVIEWED_DATA_CANDIDATE_PREFIX+'only'}]})).toBe(true);
  let unrelatedGets=0;const untouched={...catalogSession(),optionalUndefined:undefined};Object.defineProperty(untouched,'unrelated',{enumerable:true,get(){unrelatedGets++;throw Error('unrelated');}});
  expect(hasReviewedDataFootprint(untouched)).toBe(false);expect(()=>assertUnchangedReviewedData(untouched,untouched)).not.toThrow();expect(unrelatedGets).toBe(0);
  let arrayCalls=0;Object.defineProperty(untouched.candidates,'some',{value(){arrayCalls++;throw Error('caller some');},enumerable:true});Object.defineProperty(untouched.candidates,'map',{value(){arrayCalls++;throw Error('caller map');},enumerable:true});expect(hasReviewedDataFootprint(untouched)).toBe(false);expect(arrayCalls).toBe(0);
 });
 it('binds actual archive bytes, version and parsed baseline independently',()=>{
  const original=sessionFor();expect(()=>verifyReviewedNamingDataSession(original,resources,{...archive,sha256:'0'.repeat(64)})).toThrow(/archive/);
  expect(()=>verifyReviewedNamingDataSession(original,resources,{...archive,version:'other'})).toThrow(/archive/);
  const dataset=structuredClone(archive.dataset);dataset.characters[0].pinyin='wrong';expect(()=>verifyReviewedNamingDataSession(original,resources,{...archive,dataset})).toThrow(/baseline/);
  const pack=new Uint8Array(archive.pack);pack[0]^=1;expect(()=>verifyReviewedNamingDataSession(original,resources,{...archive,pack})).toThrow(/archive/);
 });
 it('refuses DTO getter/Proxy hooks before any caller callback fires',()=>{
  const original=sessionFor();let gets=0,traps=0;
  const getter=Object.defineProperty(structuredClone(original),'analysis',{enumerable:true,get(){gets++;return original.analysis;}}),proxy=new Proxy(original,{ownKeys(){traps++;throw Error('trap');}});
  expect(()=>verifyReviewedNamingDataSession(getter,resources)).toThrow();expect(()=>hasReviewedDataFootprint(proxy)).toThrow();expect(()=>assertUnchangedReviewedData(original,proxy)).toThrow();expect(gets).toBe(0);expect(traps).toBe(0);
 });
});
